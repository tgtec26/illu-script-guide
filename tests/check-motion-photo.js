const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_MotionPhoto.jsx");
const source = fs.readFileSync(scriptPath, "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced helper: ${name}`);
}

function extractVar(name) {
  const match = source.match(new RegExp(`var ${name} = (.*?);\\r?\\n`, "s"));
  assert.ok(match, `missing constant: ${name}`);
  return `var ${name} = ${match[1]};`;
}

const constants = ["ARROW", "HEAD_TRIANGLE", "HEAD_CHEVRON", "HEAD_SWALLOW", "HEAD_HARPOON", "HEAD_SHAPES", "SPAN_MAX_MM", "RULER_MAX_TICKS", "PREF_KEY", "DIRECTIONS", "MOTIONS", "BALLS", "POSITION_LIMIT_MM", "RADIO_KEYS",
  "CHECK_KEYS", "NUMBER_KEYS", "SPECS"];
const names = ["framePositions", "clampOptions", "gapRatio", "rulerMarks", "formatSeconds", "distanceLabel", "trimText", "arrowHeadPoints", "arrowHeadShape", "shaftInset",
  "cleanDistText", "saveSettings", "applySettings", "parseNumber", "roundTo", "clamp"];
const make = (options, prefs) => new Function("app", "options", `${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${[...names, "SPAN_MAX_MM", "ARROW"].join(",")}};`)(
  {preferences: {setStringPreference: (k, v) => { prefs[k] = v; }, getStringPreference: (k) => prefs[k] || ""}}, options);

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const base = {direction: 0, motion: 0, ball: 0, headShape: 2, bgOn: true, startOn: true, surfaceOn: false, distOn: true, ghostOn: false,
  rulerOn: false, timeOn: false, arrowOn: false, bottomOn: false, touchOn: false, guideWhite: false,
  speed: 100, startSpeed: 0, accel: 500, interval: 0.1, count: 7, size: 8, ballK: 30, bgK: 90, tick: 5, distText: "d", offsetX: 0, offsetY: 0, headSize: 100, previewOn: true};
const lib = make({...base}, {});

// 위치: 등속은 같은 간격, 가속은 구간 거리가 1:3:5…
{
  const uniform = lib.framePositions({...base, motion: 0});
  assert.strictEqual(uniform.length, 7, "one position per photo");
  near(uniform[0], 0, 1e-12, "first photo at the start");
  for (let i = 1; i < uniform.length; i++) near(uniform[i] - uniform[i - 1], 10, 1e-9, "uniform gap = v × interval");
  const accel = lib.framePositions({...base, motion: 1});
  const gaps = accel.slice(1).map((p, i) => p - accel[i]);
  gaps.forEach((gap, i) => near(gap / gaps[0], 2 * i + 1, 1e-9, "accelerating gaps go 1:3:5…"));
  near(gaps[0], 0.5 * 500 * 0.1 * 0.1, 1e-9, "first gap = ½ a Δt²");
  near(lib.framePositions({...base, motion: 1, interval: 0.2})[1], 0.5 * 500 * 0.04, 1e-9, "interval scales the positions");
  // 처음 속도가 있는 가속: 구간 거리가 v0·Δt + a·Δt²·(k + ½)
  const boosted = lib.framePositions({...base, motion: 1, startSpeed: 50, accel: 200, interval: 1, count: 4});
  assert.deepStrictEqual(boosted, [0, 150, 500, 1050], "start speed adds v0·t to the accelerating positions");
  // 감속: 속도가 0이 되는 순간까지만 찍고 뒤로 돌아가지 않는다
  assert.deepStrictEqual(lib.framePositions({...base, motion: 1, startSpeed: 3.5, accel: -1, interval: 1, count: 6}), [0, 3, 5, 6],
    "stops once the speed reaches zero");
  assert.deepStrictEqual(lib.framePositions({...base, motion: 1, startSpeed: 100, accel: -1000, interval: 0.06, count: 6}), [0, 4.2],
    "a frame past the turning point is dropped even if it lands further along");
  assert.deepStrictEqual(lib.framePositions({...base, motion: 1, startSpeed: 0, accel: -500}), [0], "no start speed and slowing: nothing moves");
  assert.deepStrictEqual(lib.framePositions({...base, motion: 1, startSpeed: 0, accel: 0}), [0], "no motion at all: one photo");
}

// 길이 제한: 첫 사진에서 마지막 사진까지 1000 mm 안
{
  assert.deepStrictEqual(lib.clampOptions(base).speed, 100, "default speed passes through");
  const far = lib.clampOptions({...base, speed: 1000, accel: 5000, interval: 2, count: 30});
  near(lib.framePositions({...far, motion: 0}).pop(), lib.SPAN_MAX_MM, 1e-6, "uniform span is capped");
  near(lib.framePositions({...far, motion: 1}).pop(), lib.SPAN_MAX_MM, 1e-6, "accelerating span is capped");
  // 처음 속도가 있으면 가속도가 그만큼 덜 허락된다
  const fast = lib.clampOptions({...base, startSpeed: 1000, accel: 5000, interval: 0.5, count: 5});
  near(lib.framePositions({...fast, motion: 1}).pop(), lib.SPAN_MAX_MM, 1e-6, "start speed counts toward the span");
  near(fast.startSpeed, 500, 1e-9, "start speed alone is capped");
  assert.strictEqual(fast.accel, 0, "no room left for acceleration");
  assert.strictEqual(lib.clampOptions({...base, accel: -3000, startSpeed: 100}).accel, -3000, "deceleration is not capped");
}

// 구간 비(가장 짧은 구간 기준): 정지에서 출발한 가속 1:3:5…, 정지까지 감속 …:5:3:1, 처음 속도가 있으면 소수도 된다
{
  const rest = lib.framePositions({...base, motion: 1});
  assert.deepStrictEqual([0, 1, 2, 3].map((k) => lib.gapRatio(rest, k)), [1, 3, 5, 7], "from rest: odd numbers");
  assert.deepStrictEqual([0, 1, 2].map((k) => lib.gapRatio(lib.framePositions({...base, motion: 0}), k)), [1, 1, 1], "uniform: all ones");
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((k) => lib.gapRatio([0, 27, 48, 63, 72, 75], k)), [9, 7, 5, 3, 1], "slowing to rest: odd numbers backwards");
  assert.deepStrictEqual([0, 1].map((k) => lib.gapRatio([0, 4, 7, 9], k)), [2, 1.5], "relative to the shortest gap, fractions allowed");
  assert.strictEqual(lib.distanceLabel("d", 1.333333).text, "1.33d", "variable coefficient keeps two decimals");
  assert.strictEqual(lib.distanceLabel("10 cm", 1.5).text, "15 cm", "number scaling keeps full precision");
}

// 눈금자: 첫 사진이 0, 5칸마다 major, 너무 촘촘하면 간격을 넓힌다
{
  const ruler = lib.rulerMarks(60, 5);
  assert.strictEqual(ruler.from, -5, "starts one step before the first photo");
  assert.strictEqual(ruler.to, 65, "ends one step after the last photo");
  assert.deepStrictEqual(ruler.marks.filter((m) => m.major).map((m) => m.s), [0, 25, 50], "major every 5 steps, zero included");
  assert.deepStrictEqual(ruler.marks.slice(0, 3), [{s: -5, major: false, k: -1}, {s: 0, major: true, k: 0}, {s: 5, major: false, k: 1}]);
  assert.deepStrictEqual(ruler.marks.filter((m) => m.major).map((m) => m.k), [0, 5, 10], "numbers count the ticks: 0, 5, 10…");
  const dense = lib.rulerMarks(1000, 1);
  assert.ok(dense.marks.length <= lib.rulerMarks(60, 5).marks.length * 6 && dense.marks.length < 70, "tick count is capped");
  near(dense.marks[2].s - dense.marks[1].s, 1000 / 60, 1e-9, "capped step is span / limit");
  assert.strictEqual(lib.rulerMarks(0, 5).marks.length, 3, "a single photo still gets a short ruler");
}

assert.strictEqual(lib.formatSeconds(0), "0");
assert.strictEqual(lib.formatSeconds(0.07 * 3), "0.21", "no float noise");
assert.strictEqual(lib.formatSeconds(1.5), "1.5");

// 거리 글자: 숫자로 시작하면 곱하고, 글자면 계수를 앞에 붙인다
{
  assert.deepStrictEqual(lib.distanceLabel("d", 1), {text: "d", italicFrom: 0}, "variable stays, italic from the start");
  assert.deepStrictEqual(lib.distanceLabel("d", 3), {text: "3d", italicFrom: 1}, "coefficient is upright, variable italic");
  assert.deepStrictEqual(lib.distanceLabel("10 cm", 5), {text: "50 cm", italicFrom: 5}, "number scales, unit stays");
  assert.strictEqual(lib.distanceLabel("1.1 m", 3).text, "3.3 m", "no float noise");
  assert.strictEqual(lib.distanceLabel("  0.5m ", 1).text, "0.5m", "whitespace around the value is trimmed");
}

// 화살촉: 끝점이 맨 앞, 날개는 축에 대칭, scale로 줄어든다
{
  const head = lib.arrowHeadPoints([100, 50], [1, 0], 1);
  assert.deepStrictEqual(head[0], [100, 50], "tip first");
  near(head[1][0], 100 - lib.ARROW.length, 1e-9, "wing is one arrow length back");
  near(head[1][1] + head[3][1], 100, 1e-9, "wings mirror across the axis");
  const small = lib.arrowHeadPoints([100, 50], [1, 0], 0.5);
  near(small[1][0], 98, 1e-9, "half scale halves the length");

  // 모양: 제비꼬리(평가원식)는 위 네 점 그대로, 삼각형은 끝·날개 둘, 꺾쇠는 열린 선
  const swallow = lib.arrowHeadShape([100, 50], [1, 0], 1, 2);
  assert.strictEqual(swallow.closed, true);
  assert.deepStrictEqual(swallow.points, head, "default swallowtail is the exam-style head");
  const triangle = lib.arrowHeadShape([100, 50], [1, 0], 1, 0);
  assert.strictEqual(triangle.closed, true);
  assert.strictEqual(triangle.points.length, 3);
  assert.deepStrictEqual(triangle.points, [head[0], head[1], head[3]], "triangle keeps tip and both wings");
  const chevron = lib.arrowHeadShape([100, 50], [1, 0], 1, 1);
  assert.strictEqual(chevron.closed, false);
  assert.deepStrictEqual(chevron.points, [head[1], head[0], head[3]], "chevron is wing, tip, wing");
  // 작살형(일러 화살표 3): 닫힌 여섯 점, 날개 끝은 머리 길이만큼 뒤, 홈은 끝에서 0.818 L
  const harpoon = lib.arrowHeadShape([100, 50], [1, 0], 1, 3);
  assert.strictEqual(harpoon.closed, true);
  assert.strictEqual(harpoon.points.length, 6);
  assert.deepStrictEqual(harpoon.points[0], [100, 50], "harpoon tip");
  near(harpoon.points[2][0], 100 - lib.ARROW.length, 1e-9, "barb tips one head length back");
  near(Math.abs(harpoon.points[2][1] - 50), 0.306 * lib.ARROW.length, 1e-9, "barb half width");
  near(harpoon.points[3][0], 100 - 0.818 * lib.ARROW.length, 1e-9, "notch 0.818 L from the tip");
  near(lib.arrowHeadShape([100, 50], [1, 0], 0.5, 3).points[3][0], 100 - 0.818 * 0.5 * lib.ARROW.length, 1e-9, "half scale halves the notch distance");
  near(lib.shaftInset(1, 3), 0.75 * lib.ARROW.length, 1e-9, "line stops inside the harpoon head");
  // 선이 끝나는 거리: 제비꼬리는 오목한 점, 꺾쇠는 끝점, 삼각형은 머리 안쪽
  near(lib.shaftInset(1, 2), lib.ARROW.length - lib.ARROW.notch, 1e-9, "line stops at the notch");
  near(lib.shaftInset(0.5, 2), 0.5 * (lib.ARROW.length - lib.ARROW.notch), 1e-9, "notch distance scales");
  near(lib.shaftInset(1, 1), 0, 1e-9, "chevron line runs to the tip");
  assert.ok(lib.shaftInset(1, 0) > 0 && lib.shaftInset(1, 0) < lib.ARROW.length, "triangle line ends inside the head");
}

// 설정 저장·복원
{
  const prefs = {};
  const saved = {...base, direction: 1, motion: 1, ball: 2, headShape: 1, bgOn: false, surfaceOn: true, ghostOn: true, rulerOn: true, timeOn: true, arrowOn: true, bottomOn: true, touchOn: true, guideWhite: true,
    speed: 250, startSpeed: 40, accel: -1200, interval: 0.05, count: 9, size: 6.5, ballK: 50, bgK: 70, tick: 2.5, distText: "12 cm", offsetX: -2, offsetY: 4.5, headSize: 150,
    previewOn: false};
  make({...saved}, prefs).saveSettings();
  assert.ok(prefs["ObjectMotionPhoto/settings"].startsWith("v6|1|1|2|1|0|"), "settings start with the version tag and radios");
  const restored = {...base};
  make(restored, prefs).applySettings();
  assert.deepStrictEqual(restored, saved, "saved options come back");
  // 거리 글자의 | 는 저장 때 빠진다
  const piped = {...base, distText: "a|b"};
  make(piped, prefs).saveSettings();
  const back = {...base};
  make(back, prefs).applySettings();
  assert.strictEqual(back.distText, "ab", "separator is stripped from the text");
  // 필드 수가 다르면 무시
  prefs["ObjectMotionPhoto/settings"] = "v6|1|1";
  const untouched = {...base};
  make(untouched, prefs).applySettings();
  assert.deepStrictEqual(untouched, base, "a different field count is ignored");
  // 범위를 벗어난 값은 줄인다
  // 지난 v2·v3·v4·v5 저장값은 필드 구성이 달라 버린다
  for (const stale of ["v2|1|1|1|0|0|1|0|0|250|1200|0.05|9|6.5|50|70|-2|4.5|12 cm|0",
    "v3|1|1|2|0|1|1|1|1|1|1|1|250|40|-1200|0.05|9|6.5|50|70|2.5|-2|4.5|12 cm|0",
    "v4|1|1|2|0|1|1|1|1|1|1|1|1|1|250|40|-1200|0.05|9|6.5|50|70|2.5|-2|4.5|12 cm|0",
    "v5|1|1|2|0|1|1|1|1|1|1|1|1|1|1|250|40|-1200|0.05|9|6.5|50|70|2.5|-2|4.5|12 cm|0"]) {
    prefs["ObjectMotionPhoto/settings"] = stale;
    const oldFormat = {...base};
    make(oldFormat, prefs).applySettings();
    assert.deepStrictEqual(oldFormat, base, `an old ${stale.slice(0, 2)} string falls back to the defaults`);
  }
  prefs["ObjectMotionPhoto/settings"] = "v6|9|9|9|9|1|1|1|1|1|1|1|1|1|1|1|99999|99999|-99999|99|99|99|999|999|999|999|999|999|x|1";
  const clamped = {...base};
  make(clamped, prefs).applySettings();
  assert.strictEqual(clamped.direction, 0, "out-of-range radio is ignored");
  assert.strictEqual(clamped.speed, 1000, "out-of-range number is clamped");
  assert.strictEqual(clamped.accel, -5000, "a very negative acceleration is clamped to the lower bound");
  assert.strictEqual(clamped.tick, 20, "tick is clamped");
  assert.strictEqual(clamped.count, 30, "count is clamped");
}
console.log("check-motion-photo: ok");
