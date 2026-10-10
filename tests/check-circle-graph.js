const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(수학1.jsx)의 "CircleGraph" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCircleGraphEngine(");
  assert.ok(start >= 0, "missing engine: makeCircleGraphEngine");
  let depth = 0;
  for (let index = bundle.indexOf("{", start); index < bundle.length; index++) {
    if (bundle[index] === "{") depth++;
    if (bundle[index] === "}" && --depth === 0) return bundle.slice(start, index + 1);
  }
  throw new Error("unbalanced engine");
})();

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced helper: ${name}`);
}

const names = ["buildCircleGraph", "arcPoints", "piText", "formatValue", "straight", "plotFunction", "toBezier"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, TAN_LIMIT = 2.5, KINDS = ["y=sin x", "y=tan x"];\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { kind: 0, divisions: 12, theta: 60, r: 30, sx: 20, gap: 15, xMaxHalf: 4, tick: 3,
  showDivisions: true, highlight: false, drops: true, numbers: true, formula: true };
const build = (extra) => g.buildCircleGraph(Object.assign({}, base, extra));
const cx = -(1.3 * 30 + 15);

// sin: 12등분 점마다 원 위의 점과 같은 높이의 그래프 점을 가로 점선으로 잇는다
{
  const d = build({});
  assert.strictEqual(d.circles.length, 1);
  near(d.circles[0].center[0], cx, "circle center");
  const guides = d.lines.filter((l) => l.kind === "guide");
  const horizontal = guides.filter((l) => Math.abs(l.points[0].anchor[1] - l.points[1].anchor[1]) < 1e-9);
  const vertical = guides.filter((l) => Math.abs(l.points[0].anchor[0] - l.points[1].anchor[0]) < 1e-9);
  assert.strictEqual(horizontal.length, 10, "sin 0 and sin π need no transfer line");
  assert.strictEqual(vertical.length, 10);
  for (const line of horizontal) {
    const [p, q] = line.points.map((pt) => pt.anchor);
    const t = q[0] / 20;
    near(Math.hypot(p[0] - cx, p[1]), 30, "starts on the circle");
    near(q[1], 30 * Math.sin(t), "ends on the graph");
    near(Math.atan2(p[1], p[0] - cx), Math.atan2(Math.sin(t), Math.cos(t)), "same angle");
  }
  assert.strictEqual(d.dots.filter((p) => p.small).length, 24);
  assert.ok(d.texts.some((t) => t.text === "y=sin x" && t.roman.join() === "2,3,4"));
  assert.ok(d.texts.some((t) => t.text === "2π"), "π/2 ticks up to 2π");
  // 그래프 곡선이 sin 위에 있다
  const curve = d.lines.find((l) => l.kind === "main" && l.points.length > 2);
  for (const p of curve.points) near(p.anchor[1], 30 * Math.sin(p.anchor[0] / 20), "curve anchor", 1e-6);
  near(d.centerX, (cx - 1.3 * 30 + 2 * Math.PI * 20 + 0.4 * 20) / 2, "whole drawing centered");
}
// 가로 범위가 한 바퀴보다 짧으면 그 안의 점만 옮긴다
assert.strictEqual(build({ xMaxHalf: 2 }).dots.filter((p) => p.small).length, 2 * 7);
// 수선 끄기
assert.strictEqual(build({ drops: false }).lines.filter((l) => l.kind === "guide").length, 10);

// 강조 각 60°: 동경 OP 굵게, 각 호, 그래프의 θ와 sin θ 글자
{
  const d = build({ showDivisions: false, highlight: true });
  assert.ok(d.notes[0].startsWith("θ = 60° = π/3, sin θ = 0.87"), d.notes[0]);
  const op = d.lines.filter((l) => l.kind === "main" && l.points.length === 2);
  assert.strictEqual(op.length, 1);
  near(op[0].points[1].anchor[0], cx + 15, "P x");
  near(op[0].points[1].anchor[1], 30 * Math.sqrt(3) / 2, "P y");
  const arc = d.lines.find((l) => l.kind === "thin" && l.points[0].right !== l.points[0].anchor);
  near(arc.points[arc.points.length - 1].anchor[0], cx + 0.22 * 30 * 0.5, "arc end");
  assert.ok(d.texts.some((t) => t.text === "sin θ" && t.roman.join() === "0,1,2"));
  assert.ok(d.texts.some((t) => t.text === "θ" && t.dir[1] === -1), "θ under the graph axis");
  assert.ok(d.texts.some((t) => t.text === "P"));
}
// 강조 각 210°: sin θ < 0이면 θ 글자는 축 위에
{
  const d = build({ showDivisions: false, highlight: true, theta: 210 });
  assert.ok(d.texts.some((t) => t.text === "θ" && t.dir[1] === 1));
}
// 호 베지어는 원 위에 있다
{
  const pts = g.arcPoints([0, 0], 10, 0, 3);
  const bez = (p, q, t) => { const s = 1 - t; return [0, 1].map((i) => s * s * s * p.anchor[i] + 3 * s * s * t * p.right[i] + 3 * s * t * t * q.left[i] + t * t * t * q.anchor[i]); };
  for (let i = 0; i + 1 < pts.length; i++) near(Math.hypot(...bez(pts[i], pts[i + 1], 0.5)), 10, "arc on circle", 0.01);
}

// tan: x=1 위의 T에서 옮긴다. π/2·3π/2는 건너뛰고 tan이 범위를 넘는 점도 건너뛴다
{
  const d = build({ kind: 1, divisions: 8 });
  const horizontal = d.lines.filter((l) => l.kind === "guide" && Math.abs(l.points[0].anchor[1] - l.points[1].anchor[1]) < 1e-9);
  assert.strictEqual(horizontal.length, 4, "π/4, 3π/4, 5π/4, 7π/4");
  for (const line of horizontal) {
    const [p, q] = line.points.map((pt) => pt.anchor);
    near(p[0], cx + 30, "starts on x=1");
    near(q[1], 30 * Math.tan(q[0] / 20), "ends on tan graph");
  }
  const asymptotes = d.lines.filter((l) => l.kind === "guide" && Math.abs(l.points[0].anchor[0] - l.points[1].anchor[0]) < 1e-9 && Math.abs(l.points[0].anchor[1]) > 70);
  assert.deepStrictEqual(asymptotes.map((l) => Math.round(l.points[0].anchor[0] / 20 / Math.PI * 2)), [1, 3]);
  assert.ok(d.texts.some((t) => t.text === "y=tan x"));
  // 3π/4·π·5π/4의 동경은 원점을 지나 반대쪽 T까지
  const through = d.lines.filter((l) => l.kind === "thin" && Math.abs(l.points[1].anchor[0] - (cx + 30)) < 1e-9 && l.points[0].anchor[0] < cx);
  assert.strictEqual(through.length, 3, "2nd and 3rd quadrant rays pass through O");
}
// tan 강조 각 90°: 그림에 옮기지 않고 알린다
assert.ok(build({ kind: 1, showDivisions: false, highlight: true, theta: 90 }).notes[0].endsWith("tan θ 없음"));
assert.ok(build({ kind: 1, showDivisions: false, highlight: true, theta: 45 }).texts.some((t) => t.text === "T"));

assert.ok(source.includes('var PREF_KEY = "HighMathCircleGraph/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("circle-graph checks passed");
