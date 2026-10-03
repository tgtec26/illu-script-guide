const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Induction.jsx"), "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);

// 순수 기하 구간을 그대로 읽는다
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝");
assert.ok(start > 0 && end > start, "pure geometry markers");
const lib = new Function(`${source.slice(start, end)}
return {MM, TILT, WIRE_MM, DEPTH, HAND, HAND_SCALE, SCALE_SPAN, coilLayout, frontHalfTurn, cylinderFront, project, faceMapper, scaleTicks, smoothPoints, fingertipPoints};`)();
const {MM, TILT} = lib;
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 코일: 간격이 넓으면 도선 0.75mm, 좁으면 간격의 92 %. 원통은 도선 안쪽
{
  const sparse = lib.coilLayout(22 * MM, 30 * MM, 10);
  near(sparse.pitch, 3 * MM, 1e-9, "pitch = height / turns");
  near(sparse.wire, 0.75 * MM, 1e-9, "wire keeps its thickness when turns are sparse");
  near(sparse.rw, 11 * MM - sparse.wire / 2, 1e-9, "wire center radius");
  near(sparse.rc, 11 * MM - sparse.wire, 1e-9, "core radius");
  const dense = lib.coilLayout(22 * MM, 30 * MM, 80);
  near(dense.wire, dense.pitch * 0.92, 1e-9, "dense winding shrinks the wire to the pitch");
  assert.ok(dense.wire < lib.WIRE_MM * MM, "dense wire is thinner");
}

// 앞쪽 반바퀴: 왼쪽 끝 y0 → 앞(가장 낮음) → 오른쪽 끝(반 간격 높음)
{
  const r = 30, e = r * TILT, pitch = 6, y0 = 10;
  const [left, front, right] = lib.frontHalfTurn(r, e, pitch, y0);
  near(left.anchor[0], -r, 1e-9, "starts at the left edge");
  near(left.anchor[1], y0, 1e-9, "left end height");
  near(front.anchor[0], 0, 1e-9, "passes the front at x = 0");
  near(front.anchor[1], y0 + pitch / 4 - e, 1e-9, "front dips by the ellipse radius");
  near(right.anchor[0], r, 1e-9, "ends at the right edge");
  near(right.anchor[1], y0 + pitch / 2, 1e-9, "helix rises half a pitch across the front");
  assert.deepStrictEqual(left.left, left.anchor, "open start has no incoming handle");
  assert.deepStrictEqual(right.right, right.anchor, "open end has no outgoing handle");
  near(front.left[1], front.anchor[1] - pitch / (2 * Math.PI) * 0.5522847498, 1e-9, "front tangent follows the helix rise");
}

// 원통 앞면: 위는 곧고 아래는 앞쪽 반타원
{
  const pts = lib.cylinderFront(20, 0, 50);
  assert.strictEqual(pts.length, 5);
  assert.deepStrictEqual(pts[0].anchor, [-20, 50]);
  assert.deepStrictEqual(pts[1].anchor, [20, 50]);
  near(pts[3].anchor[1], -20 * TILT, 1e-9, "front bottom point");
}

// 상자 투영과 비스듬한 면 위의 좌표
{
  assert.deepStrictEqual(lib.project(10, 20, 0), [10, 20]);
  const p = lib.project(0, 0, 10);
  assert.ok(p[0] > 0 && p[1] > 0, "depth goes up and to the right");
  const map = lib.faceMapper([5, 5], [1, 0], [0.2, 1.1]);
  assert.deepStrictEqual(map(0, 0), [5, 5]);
  near(map(10, 10)[0], 5 + 10 + 2, 1e-9, "u along ex plus v along ey (x)");
  near(map(10, 10)[1], 5 + 11, 1e-9, "u along ex plus v along ey (y)");
}

// 눈금: 5°마다, 0·±25·±50°가 큰 눈금, 안쪽을 향한다
{
  const ticks = lib.scaleTicks(0, 0, 100, 6, 3);
  assert.strictEqual(ticks.length, 2 * lib.SCALE_SPAN / 5 + 1);
  assert.deepStrictEqual(ticks.filter((t) => t[2]).length, 5, "five major ticks");
  const mid = ticks[(ticks.length - 1) / 2];
  near(mid[0][1], 100, 1e-9, "centre tick at the top");
  near(mid[1][1], 94, 1e-9, "major tick points inward by its length");
  near(ticks[0][0][0], -100 * Math.sin(50 * Math.PI / 180), 1e-9, "left end at -50°");
}

// 손: 자석 뒤로 감긴 손끝 넷이 위에서 아래로 맞붙어 쌓이고, 엄지 뿌리에는 선이 없다
{
  const tips = lib.HAND.tips;
  assert.strictEqual(tips.length, 4);
  // 위 손끝의 아래보다 조금(0.3 이하) 높게 시작해 틈 없이 겹친다
  for (let i = 1; i < tips.length; i++) {
    const overlap = tips[i][0] - tips[i - 1][1];
    assert.ok(overlap >= 0 && overlap <= 0.3, `fingertip ${i} overlaps the one above by ${overlap}`);
  }
  const pts = lib.fingertipPoints(10, 0, -4, 3);
  assert.strictEqual(pts.length, 5);
  assert.strictEqual(pts[0][2], "c", "starts hidden behind the magnet as a corner");
  assert.ok(pts[0][0] < 10, "start is behind the magnet edge");
  near(Math.max(...pts.map((p) => p[0])), 13, 1e-9, "tip reaches edge + out");
  const smooth = lib.smoothPoints(pts, true);
  assert.deepStrictEqual(smooth[0].left, smooth[0].anchor, "corner keeps no handles");
  assert.ok(lib.HAND.thumbLine < lib.HAND.thumb.length, "thumb outline leaves its root open");
  assert.ok(lib.HAND_SCALE > 0.5 && lib.HAND_SCALE <= 1, "hand scale");
  // 손은 자석 왼쪽 모서리(x=0)에서 잰다: 손등 채움의 오른쪽 경계가 모서리에 있다
  assert.ok(lib.HAND.body.some((p) => p[0] === 0), "body meets the magnet's left edge");
}

// 설정 저장·복원 (라디오 2, 체크 1, 숫자 6, 미리보기)
{
  const extract = (name) => {
    const at = source.indexOf(`function ${name}(`);
    let depth = 0;
    for (let i = source.indexOf("{", at); i < source.length; i++) {
      if (source[i] === "{") depth++;
      if (source[i] === "}" && --depth === 0) return source.slice(at, i + 1);
    }
    throw new Error(name);
  };
  const constant = (name) => {
    const m = source.match(new RegExp(`var ${name} = (.*?);\\n`, "s"));
    assert.ok(m, name);
    return `var ${name} = ${m[1]};`;
  };
  const prefs = {};
  const make = (options) => new Function("app", "options", `var SCALE_SPAN = 50;
${["PREF_KEY", "MODES", "POLES", "POSITION_LIMIT_MM", "RADIO_KEYS", "CHECK_KEYS", "NUMBER_KEYS", "SPECS"].map(constant).join("\n")}
${["saveSettings", "applySettings", "parseNumber", "clamp", "roundTo"].map(extract).join("\n")}
return {save: saveSettings, load: applySettings};`)(
    {preferences: {setStringPreference: (k, v) => { prefs[k] = v; }, getStringPreference: (k) => prefs[k] || ""}}, options);
  const defaults = {mode: 0, pole: 0, hand: true, coilD: 22, coilH: 30, turns: 40, needle: 0, offsetX: 0, offsetY: 0, previewOn: true};
  const saved = {mode: 1, pole: 1, hand: false, coilD: 30.5, coilH: 45, turns: 12, needle: -20, offsetX: 3.5, offsetY: -1, previewOn: false};
  make({...saved}).save();
  assert.ok(prefs["ObjectInduction/settings"].startsWith("v1|1|1|0|"), "version tag, radios, check");
  const restored = {...defaults};
  make(restored).load();
  assert.deepStrictEqual(restored, saved, "saved options come back");
  prefs["ObjectInduction/settings"] = "v1|1";
  const untouched = {...defaults};
  make(untouched).load();
  assert.deepStrictEqual(untouched, defaults, "a different field count is ignored");
  prefs["ObjectInduction/settings"] = "v1|5|5|1|999|1|500|90|0|0|1";
  const clamped = {...defaults};
  make(clamped).load();
  assert.strictEqual(clamped.mode, 0, "out-of-range radio is ignored");
  assert.strictEqual(clamped.coilD, 40, "diameter is clamped");
  assert.strictEqual(clamped.coilH, 12, "height is clamped");
  assert.strictEqual(clamped.turns, 80, "turns are clamped");
  assert.strictEqual(clamped.needle, 50, "needle is clamped");
}
console.log("check-induction: ok");
