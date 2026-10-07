const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Interference.jsx"), "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);

// 순수 기하 구간을 그대로 읽는다
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝");
assert.ok(start > 0 && end > start, "pure geometry markers");
const pure = source.slice(start, end);
const geo = new Function(`${pure}
return {PULSE, TRAIN, SAMPLES_PER_WAVELENGTH, ARROW_LEN_MM, ARROW_GAP_MM, ARROW_STACK_MM, LINE_MARGIN_MM, HEAD_LEN_MM, HEAD_HALF_MM,
  HEAD_TRIANGLE, HEAD_CHEVRON, HEAD_SWALLOW,
  halfSupport, snapPulsePhase, waveAt, sumAt, wavesOverlap, curvePoints, lineExtent, curveTop, arrowHeights, arrowShape,
  stateCaption};`)();
const {PULSE, TRAIN} = geo;

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const pulse = (center, extra = {}) => ({kind: PULSE, center, amp: 10, wl: 20, phase: 0, cycles: 2, ...extra});
const train = (center, extra = {}) => ({kind: TRAIN, center, amp: 10, wl: 15, phase: 0, cycles: 2, ...extra});

// 펄스: 가운데가 진폭, 구간 끝은 0, 구간 밖은 0. 180°면 아래로
{
  const w = pulse(5);
  near(geo.waveAt(w, 5).y, 10, 1e-9, "pulse peak = amplitude");
  near(geo.waveAt(w, 5 + 10).y, 0, 1e-9, "pulse is zero at the right edge");
  near(geo.waveAt(w, 5 - 10).y, 0, 1e-9, "pulse is zero at the left edge");
  assert.strictEqual(geo.waveAt(w, 40).y, 0, "zero outside");
  near(geo.waveAt(w, 5 + 5).y, 5, 1e-9, "half height a quarter width out");
  near(geo.waveAt(pulse(5, {phase: 180}), 5).y, -10, 1e-9, "phase 180 flips the pulse down");
  assert.strictEqual(geo.snapPulsePhase(0), 0);
  assert.strictEqual(geo.snapPulsePhase(89), 0);
  assert.strictEqual(geo.snapPulsePhase(90), 180);
  assert.strictEqual(geo.snapPulsePhase(269), 180);
  assert.strictEqual(geo.snapPulsePhase(270), 0);
}

// 사인 묶음: 위상 0이면 가운데가 마루, 180이면 골, 90이면 가운데가 0. 구간은 파장 × 개수
{
  const w = train(0);
  near(geo.halfSupport(w), 15, 1e-9, "train length is wavelength x cycles");
  near(geo.waveAt(w, 0).y, 10, 1e-9, "phase 0 crest at the center");
  near(geo.waveAt(train(0, {phase: 180}), 0).y, -10, 1e-9, "phase 180 trough at the center");
  near(geo.waveAt(train(0, {phase: 90}), 0).y, 0, 1e-9, "phase 90 is zero at the center");
  near(geo.waveAt(w, 15).y, 0, 1e-9, "train is zero at its end");
}

// 기울기는 값의 수치 미분과 같다 (베지어 손잡이가 이 값을 쓴다)
for (const w of [pulse(0), pulse(3, {phase: 180}), train(0), train(-2, {phase: 70, cycles: 3})]) {
  for (const x of [-9, -4.3, -0.5, 0.7, 3.1, 8.8, 14]) {
    const h = 1e-6;
    const numeric = (geo.waveAt(w, x + h).y - geo.waveAt(w, x - h).y) / (2 * h);
    near(geo.waveAt(w, x).d, numeric, 1e-5, `derivative at x=${x} (kind ${w.kind})`);
  }
}

// 중첩의 원리: 합성파 = 각 파동의 합
{
  const waves = [pulse(-3), train(4, {phase: 30})];
  for (const x of [-12, -3, 0, 4, 9, 20]) {
    const expected = geo.waveAt(waves[0], x).y + geo.waveAt(waves[1], x).y;
    near(geo.sumAt(waves, x).y, expected, 1e-12, `superposition at x=${x}`);
  }
}

// 보강: 같은 위상·같은 모양이 겹치면 진폭이 2배. 상쇄: 반대 위상이면 어디서나 0
{
  const same = [pulse(0), pulse(0)];
  near(geo.sumAt(same, 0).y, 20, 1e-9, "constructive: doubled");
  near(geo.curveTop(same), 20, 1e-6, "constructive top");
  const opposite = [pulse(0), pulse(0, {phase: 180})];
  for (let x = -12; x <= 12; x += 0.37) near(geo.sumAt(opposite, x).y, 0, 1e-12, `destructive is flat at x=${x}`);
  const trainOpposite = [train(0), train(0, {phase: 180})];
  for (let x = -17; x <= 17; x += 0.41) near(geo.sumAt(trainOpposite, x).y, 0, 1e-12, `train destructive flat at x=${x}`);
}

// 모양이 다르면 상쇄여도 완전히 0이 되지 않는다 (진폭이 다름 / 폭이 다름)
{
  const unequalAmp = [pulse(0), pulse(0, {phase: 180, amp: 6})];
  near(geo.sumAt(unequalAmp, 0).y, 4, 1e-9, "unequal amplitude leaves the difference");
  const unequalWidth = [pulse(0), pulse(0, {phase: 180, wl: 12})];
  assert.ok(geo.curveTop(unequalWidth) > 1, "unequal width leaves a remainder");
}

// 겹침 판정: 맞닿기만 하면 겹치지 않음. 파동 1이 왼쪽이면 전, 오른쪽이면 후
{
  assert.strictEqual(geo.wavesOverlap(pulse(-10), pulse(10)), false, "touching is not overlapping");
  assert.strictEqual(geo.wavesOverlap(pulse(-9.9), pulse(10)), true, "just overlapping");
  assert.strictEqual(geo.wavesOverlap(pulse(0), pulse(0)), true, "same center");
  assert.strictEqual(geo.wavesOverlap(pulse(0, {wl: 4}), pulse(5, {wl: 4})), false, "narrow pulses apart");
  assert.strictEqual(geo.stateCaption(pulse(-25), pulse(25)), "중첩 전");
  assert.strictEqual(geo.stateCaption(pulse(25), pulse(-25)), "중첩 후");
  assert.strictEqual(geo.stateCaption(pulse(0), pulse(0)), "같은 위상으로 중첩");
  assert.strictEqual(geo.stateCaption(pulse(0), pulse(0, {phase: 180})), "반대 위상으로 중첩");
  assert.strictEqual(geo.stateCaption(pulse(-4), pulse(4, {phase: 180})), "반대 위상으로 중첩");
  assert.strictEqual(geo.stateCaption(train(0), train(0, {phase: 90})), "중첩", "other phase gap is just overlap");
  assert.strictEqual(geo.stateCaption(train(0, {phase: 360}), train(0, {phase: 0})), "같은 위상으로 중첩", "360° equals 0°");
}

// 곡선 점: 구간 끝은 기준선, 바깥쪽 손잡이는 접힘, 3차 베지어가 실제 합성파를 따라간다
function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
}
function maxCurveError(waves, from, to) {
  const points = geo.curvePoints(waves, from, to);
  let worst = 0;
  for (let i = 0; i < points.length - 1; i++) {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const [x, y] = bezier(points[i].anchor, points[i].right, points[i + 1].left, points[i + 1].anchor, t);
      worst = Math.max(worst, Math.abs(y - geo.sumAt(waves, x).y));
    }
  }
  return worst;
}
{
  const w = pulse(0);
  const pts = geo.curvePoints([w], -10, 10);
  assert.deepStrictEqual(pts[0].anchor, [-10, 0], "starts at the left edge on the baseline");
  assert.deepStrictEqual(pts[pts.length - 1].anchor, [10, 0], "ends at the right edge on the baseline");
  assert.deepStrictEqual(pts[0].left, pts[0].anchor, "no outer handle at the start");
  assert.deepStrictEqual(pts[pts.length - 1].right, pts[pts.length - 1].anchor, "no outer handle at the end");
  assert.strictEqual(pts.length, geo.SAMPLES_PER_WAVELENGTH + 1, "ten segments across one pulse width");
  assert.ok(maxCurveError([w], -10, 10) < 0.01, "pulse bezier follows the function");

  assert.ok(maxCurveError([train(0)], -15, 15) < 0.02, "train bezier follows the function");
  const mix = [pulse(-3), train(4, {phase: 30})];
  assert.ok(maxCurveError(mix, -13, 19) < 0.03, "overlapped sum bezier follows the function");
  const half = [pulse(-4), pulse(4, {phase: 180, wl: 12})];
  assert.ok(maxCurveError(half, -14, 10) < 0.02, "unequal widths bezier follows the function");
  assert.deepStrictEqual(geo.curvePoints([w], 3, 3), [], "empty interval has no points");
}

// 파장이 짧으면 앵커 간격도 촘촘하다 (가장 짧은 파장 기준)
{
  const fast = geo.curvePoints([train(0, {wl: 4})], -4, 4).length;
  const slow = geo.curvePoints([train(0, {wl: 20})], -20, 20).length;
  assert.ok(Math.abs(fast - slow) <= 4, "anchor count depends on the number of wavelengths, not on the length");
}

// 기준선: 너비의 절반, 파동이 밖으로 나가면 조금 더 늘어난다
{
  assert.deepStrictEqual(geo.lineExtent(100, [pulse(-25), pulse(25)]), [-50, 50]);
  assert.deepStrictEqual(geo.lineExtent(100, [pulse(-60), pulse(25)]), [-60 - 10 - geo.LINE_MARGIN_MM, 50]);
  assert.deepStrictEqual(geo.lineExtent(100, [pulse(-25), pulse(70)]), [-50, 70 + 10 + geo.LINE_MARGIN_MM]);
}

// 화살표 높이: 떨어져 있으면 각자 곡선 위, 겹치면 합성파 위, 가까우면 파동 2 것이 위로
{
  const apart = geo.arrowHeights(pulse(-25), pulse(25, {amp: 6}));
  near(apart[0], 10 + geo.ARROW_GAP_MM, 1e-3, "arrow 1 sits above its own pulse");
  near(apart[1], 6 + geo.ARROW_GAP_MM, 1e-3, "arrow 2 sits above its own pulse");
  const merged = geo.arrowHeights(pulse(0), pulse(0));
  assert.ok(merged[0] >= 20 + geo.ARROW_GAP_MM - 1e-3, "arrow clears the doubled peak");
  near(merged[1] - merged[0], geo.ARROW_STACK_MM, 1e-9, "stacked when horizontally close");
  const close = geo.arrowHeights(pulse(-3, {wl: 4}), pulse(3, {wl: 4}));
  assert.strictEqual(geo.wavesOverlap(pulse(-3, {wl: 4}), pulse(3, {wl: 4})), false, "narrow pulses are apart");
  near(close[1] - close[0], geo.ARROW_STACK_MM, 1e-9, "apart but arrows would collide: stacked");
  const far = geo.arrowHeights(pulse(-25), pulse(25));
  near(far[1], far[0], 1e-9, "far arrows share a height");
}

// 화살표 모양: 끝점, 대칭 날개, 몸통은 화살촉 속에서 끝남
{
  const right = geo.arrowShape(-4, 4, 12);
  assert.deepStrictEqual(right.head[0], [4, 12], "head tip at the tip");
  near(right.head[1][1] + right.head[2][1], 24, 1e-9, "wings mirror across the arrow axis");
  near(right.head[1][0], 4 - geo.HEAD_LEN_MM, 1e-9, "wings one head length back");
  assert.ok(right.line[1][0] > right.head[1][0] && right.line[1][0] < 4, "body ends inside the head");
  const left = geo.arrowShape(4, -4, 12);
  assert.deepStrictEqual(left.head[0], [-4, 12], "left-pointing tip");
  assert.ok(left.line[1][0] < left.head[1][0] && left.line[1][0] > -4, "left body ends inside the head");
  assert.strictEqual(right.closed, true, "default head is the filled triangle");

  // 배율: 날개 위치와 폭이 같은 비율로 커진다
  const big = geo.arrowShape(-4, 4, 12, 2, geo.HEAD_TRIANGLE);
  near(big.head[1][0], 4 - 2 * geo.HEAD_LEN_MM, 1e-9, "head length scales");
  near(big.head[1][1] - 12, 2 * geo.HEAD_HALF_MM, 1e-9, "head half width scales");

  // 꺾쇠: 열린 선 [날개, 끝, 날개], 몸통이 끝점까지
  const chevron = geo.arrowShape(-4, 4, 12, 1, geo.HEAD_CHEVRON);
  assert.strictEqual(chevron.closed, false, "chevron is open");
  assert.deepStrictEqual(chevron.head[1], [4, 12], "chevron apex at the tip");
  assert.deepStrictEqual(chevron.line[1], [4, 12], "body runs to the tip");
  near(chevron.head[0][0], 4 - geo.HEAD_LEN_MM, 1e-9, "chevron arms one head length back");

  // 제비꼬리: 닫힌 네 점, 홈은 밑변에서 머리 길이의 0.3 앞, 몸통은 홈 앞에서 끝남
  const swallow = geo.arrowShape(-4, 4, 12, 1, geo.HEAD_SWALLOW);
  assert.strictEqual(swallow.closed, true);
  assert.strictEqual(swallow.head.length, 4);
  near(swallow.head[2][0], 4 - 0.7 * geo.HEAD_LEN_MM, 1e-9, "notch 0.3 head lengths ahead of the base");
  assert.ok(swallow.line[1][0] > swallow.head[1][0] && swallow.line[1][0] < 4 - 0.7 * geo.HEAD_LEN_MM + 1e-9 + geo.HEAD_LEN_MM, "body ends inside the head");
  const swallowLeft = geo.arrowShape(4, -4, 12, 1, geo.HEAD_SWALLOW);
  near(swallowLeft.head[2][0], -4 + 0.7 * geo.HEAD_LEN_MM, 1e-9, "left-pointing notch");
}

// 설정 저장·복원: 저장한 값이 그대로 돌아오고, 형식이 다르면 기본값을 지킨다
function extractVar(name) {
  const at = source.indexOf(`var ${name} = `);
  assert.ok(at >= 0, `missing constant: ${name}`);
  let depth = 0;
  for (let i = source.indexOf("=", at); i < source.length; i++) {
    const c = source[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    if (c === "}" || c === "]" || c === ")") depth--;
    if (c === ";" && depth === 0) return source.slice(at, i + 1);
  }
  throw new Error(`unterminated constant: ${name}`);
}
function extractFunction(name) {
  const at = source.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let i = source.indexOf("{", at); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(at, i + 1);
    }
  }
  throw new Error(`unbalanced helper: ${name}`);
}
{
  const vars = ["PREF_KEY", "POSITION_LIMIT_MM", "NUMBER_KEYS", "WAVE_POS_RANGE", "PHASE_RANGE_TRAIN", "SPECS", "COLORS", "options"];
  const funcs = ["flag", "saveSettings", "applySettings", "parseNumber", "clamp", "roundTo"];
  const store = {};
  const app = {preferences: {
    setStringPreference: (k, v) => { store[k] = v; },
    getStringPreference: (k) => { if (!(k in store)) throw new Error("no pref"); return store[k]; }
  }};
  const env = new Function("app", `${pure}\n${vars.map(extractVar).join("\n")}\n${funcs.map(extractFunction).join("\n")}
return {options, saveSettings, applySettings, NUMBER_KEYS, SPECS, COLORS, PREF_KEY};`)(app);
  const {options, NUMBER_KEYS} = env;
  const defaults = JSON.parse(JSON.stringify(options));

  // 처음에는 저장값이 없어도 안전
  env.applySettings();
  assert.deepStrictEqual(options, defaults, "no stored value keeps the defaults");

  Object.assign(options, {shape: TRAIN, sameAmp: false, sameWl: false, arrowsOn: false, dotOn: false, captionOn: false,
    colorWave1: 3, colorWave2: 4, colorSum: 5, colorArrow1: 6, colorArrow2: 0, previewOn: false,
    width: 150, cycles: 4, lineWidth: 1.25, pos1: -12.5, phase1: 45, amp1: 7.5, wl1: 18, pos2: 8, phase2: 225, amp2: 12, wl2: 9,
    offsetX: 3.5, offsetY: -2, headSize: 150, headShape: 2});
  const saved = JSON.parse(JSON.stringify(options));
  env.saveSettings();
  assert.strictEqual(store[env.PREF_KEY].split("|").length, 14 + NUMBER_KEYS.length, "header + numbers + head shape");
  assert.strictEqual(store[env.PREF_KEY].split("|")[0], "v2");
  Object.assign(options, JSON.parse(JSON.stringify(defaults)));
  env.applySettings();
  assert.deepStrictEqual(options, saved, "stored options round-trip");

  // 범위를 벗어난 값·모르는 색·모르는 파형은 받아들이지 않는다
  const parts = store[env.PREF_KEY].split("|");
  parts[1] = "9";
  parts[7] = "99";
  parts[13] = "9999";
  store[env.PREF_KEY] = parts.join("|");
  Object.assign(options, JSON.parse(JSON.stringify(defaults)));
  env.applySettings();
  assert.strictEqual(options.shape, defaults.shape, "unknown shape ignored");
  assert.strictEqual(options.colorWave1, defaults.colorWave1, "unknown color ignored");
  assert.strictEqual(options.width, env.SPECS.width.range[1], "width clamped to its range");

  // 형식 태그나 칸 수가 다르면 통째로 무시
  store[env.PREF_KEY] = "v0|" + parts.slice(1).join("|");
  Object.assign(options, JSON.parse(JSON.stringify(defaults)));
  env.applySettings();
  assert.deepStrictEqual(options, defaults, "old version falls back to defaults");
  store[env.PREF_KEY] = parts.slice(0, -1).join("|");
  env.applySettings();
  assert.deepStrictEqual(options, defaults, "short string falls back to defaults");
}

console.log("interference checks passed");
