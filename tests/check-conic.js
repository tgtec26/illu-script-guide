const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(Object_HighGeometry.jsx)의 "Conic" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighGeometry.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeConicEngine(");
  assert.ok(start >= 0, "missing engine: makeConicEngine");
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
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced helper: ${name}`);
}

const names = ["conicShape", "buildConic", "conicCurves", "pointOnConic", "conicEquation", "equationNote", "pointText", "shiftText", "radicalText",
  "cosh", "sinh", "asinh", "acosh", "dist", "clipLine", "lineEquation", "formatValue", "unit", "straight"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, KAPPA = 0.5522847498;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const bez = (p, q, t) => { const s = 1 - t; return [0, 1].map((i) => s * s * s * p.anchor[i] + 3 * s * s * t * p.right[i] + 3 * s * t * t * q.left[i] + t * t * t * q.anchor[i]); };
const base = { kind: 1, vertical: false, p: 1, a: 3, b: 2, m: 0, n: 0, angle: 60, unit: 10, tick: 2, foci: true, vertices: true, equation: true,
  guides: true, coords: false, point: false, focalLines: true, tangent: false, grid: false, numbers: false };
const build = (o) => g.buildConic(Object.assign({}, base, o));

// 근호
assert.deepStrictEqual([5, 8, 9, 12, 2.25, 0].map(g.radicalText), ["√5", "2√2", "3", "2√3", "1.5", "0"]);

// 식 글자
assert.strictEqual(g.conicEquation(base).text, "x2/9+y2/4=1");
assert.deepStrictEqual(g.conicEquation(base).sup, [1, 6]);
assert.strictEqual(g.conicEquation(Object.assign({}, base, { kind: 2, vertical: true, m: 1, n: -2 })).text, "(x-1)2/9-(y+2)2/4=-1");
assert.strictEqual(g.conicEquation(Object.assign({}, base, { kind: 0, p: 2 })).text, "y2=8x");
assert.strictEqual(g.conicEquation(Object.assign({}, base, { kind: 0, p: -0.25, vertical: true, n: 1 })).text, "x2=-(y-1)");

// 타원: 초점 (±√5, 0), 곡선은 4점 베지어, 베지어 중간점이 타원 위(오차 0.03%)
{
  const d = build({});
  assert.strictEqual(d.notes[0], "x²/9+y²/4=1 · 초점 (±√5, 0)");
  const curve = d.lines.find((l) => l.closed).points;
  assert.deepStrictEqual(curve[0].anchor, [30, 0]);
  const mid = bez(curve[0], curve[1], 0.5).map((v) => v / 10);
  near(mid[0] * mid[0] / 9 + mid[1] * mid[1] / 4, 1, "ellipse bezier", 1e-3);
  for (const n of ["F", "F′", "A", "A′", "B", "B′"]) assert.ok(d.texts.some((t) => t.text === n), n);
  near(d.dots[0][0], Math.sqrt(5) * 10, "F x");
}
// b > a면 세로 타원, 초점은 y축 위
{
  const d = build({ a: 2, b: 3 });
  assert.strictEqual(d.notes[0], "x²/4+y²/9=1 · 초점 (0, ±√5)");
  near(d.dots[0][1], Math.sqrt(5) * 10, "F on y axis");
  near(d.dots[0][0], 0, "F on y axis");
}
// 타원 위의 점 P: PF + PF′ = 2a, 접선은 P를 지나고 기울기가 맞다
{
  const d = build({ point: true, tangent: true, angle: 60 });
  assert.ok(d.notes.includes("PF + PF′ = 6 (장축의 길이)"), d.notes.join("/"));
  const P = [3 * Math.cos(Math.PI / 3), 2 * Math.sin(Math.PI / 3)];
  const tangent = d.notes.find((n) => n.includes("접선"));
  const slope = -(4 * P[0]) / (9 * P[1]);
  assert.ok(tangent.includes("y=" + g.formatValue(slope) + "x+" + g.formatValue(P[1] - slope * P[0])), tangent);
}
// 쌍곡선: 두 가지, 점근선 두 개, |PF - PF′| = 2a, 가지 위의 점이 곡선 위
{
  const d = build({ kind: 2, point: true, angle: 30 });
  assert.ok(d.notes[0].startsWith("x²/9-y²/4=1 · 초점 (±√13, 0), 점근선 기울기 ±0.67"), d.notes[0]);
  const branches = d.lines.filter((l) => l.kind === "main");
  assert.strictEqual(branches.length, 2);
  for (const branch of branches) {
    for (let i = 0; i + 1 < branch.points.length; i++) {
      const q = bez(branch.points[i], branch.points[i + 1], 0.5).map((v) => v / 10);
      near(q[0] * q[0] / 9 - q[1] * q[1] / 4, 1, "hyperbola hermite", 2e-3);
    }
  }
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
  assert.ok(d.notes.includes("|PF - PF′| = 6 (주축의 길이)"));
  assert.strictEqual(build({ kind: 2, point: true, angle: 90 }).notes.some((n) => n.startsWith("P가 무한히")), true);
}
// 세로 쌍곡선 (=-1): 꼭짓점은 (0, ±2), 초점 (0, ±√13)
{
  const d = build({ kind: 2, vertical: true });
  assert.ok(d.notes[0].includes("초점 (0, ±√13)"), d.notes[0]);
  const A = d.texts.find((t) => t.text === "A");
  assert.deepStrictEqual(A.at.map((v) => Math.round(v * 1e9) / 1e9), [0, 20]);
}
// 포물선 y²=8x: 정확한 베지어, 준선 x=-2, PF = PH, 이동 (1, -1)
{
  const d = build({ kind: 0, p: 2, point: true, angle: 90, m: 1, n: -1 });
  assert.strictEqual(d.notes[0], "(y+1)²=8(x-1) · 초점 (3, -1), 준선 x=-1");
  const curve = d.lines.find((l) => l.kind === "main").points;
  for (const t of [0.2, 0.5, 0.8]) {
    const q = bez(curve[0], curve[1], t).map((v) => v / 10);
    near((q[1] + 1) ** 2, 8 * (q[0] - 1), "parabola exact", 1e-9);
  }
  // θ=90° → s=1 → P=(p, 2p)=(2,4) 표준형 → (3,3), PF = 4
  assert.ok(d.notes.includes("PF = PH = 4"), d.notes.join("/"));
  const directrix = d.lines.find((l) => l.kind === "guide" && l.points[0].anchor[0] === l.points[1].anchor[0]);
  near(directrix.points[0].anchor[0], -10, "directrix x=-1");
  assert.ok(d.texts.some((t) => t.text === "V"), "vertex (1,-1) is not the origin");
  assert.ok(!build({ kind: 0, p: 2 }).texts.some((t) => t.text === "V"), "vertex at O is not labeled");
}
// 세로 포물선 x² = -4y: 아래로 열린다
{
  const d = build({ kind: 0, p: -1, vertical: true });
  assert.strictEqual(d.notes[0], "x²=-4y · 초점 (0, -1), 준선 y=1");
  const curve = d.lines.find((l) => l.kind === "main").points;
  assert.ok(curve[0].anchor[1] < 0 && curve[1].anchor[1] < 0);
}

assert.ok(source.includes('var PREF_KEY = "HighMathConic/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("conic checks passed");
