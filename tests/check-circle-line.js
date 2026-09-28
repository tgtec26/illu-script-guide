const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 고등학교 수학 묶음(Object_HighMath.jsx)의 "CircleLine" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCircleLineEngine(");
  assert.ok(start >= 0, "missing engine: makeCircleLineEngine");
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

const names = ["buildCircleLine", "addRightMark", "parseLine", "parsePoint", "distanceTo", "footOn", "crossings", "tangentPoints", "lineThrough",
  "clipLine", "lineEquation", "circleEquation", "pointList", "circlePoints", "awayFrom", "perpendicular", "formatValue", "sub", "unit", "straight", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, KAPPA = 0.5522847498;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const nearP = (p, q, msg) => { near(p[0], q[0], msg + " x"); near(p[1], q[1], msg + " y"); };

// 직선 읽기: 모두 같은 직선 y = 2x + 1
for (const text of ["y=2x+1", "2x-y+1=0", "y - 1 = 2x", "2y=4x+2"]) {
  const L = g.parseLine(text);
  assert.ok(L, text);
  near(L.a * 1 + L.b * 3 + L.c, 0, text + " through (1,3)");
  assert.strictEqual(g.lineEquation(L), "y=2x+1", text);
}
assert.strictEqual(g.lineEquation(g.parseLine("x=3")), "x=3");
assert.strictEqual(g.lineEquation(g.parseLine("y=-1/2x+3")), "y=-0.5x+3");
assert.strictEqual(g.lineEquation(g.parseLine("y=-2")), "y=-2");
for (const bad of ["y=x^2", "y=", "2x+1", "x=y=1", "0=0", "y=1/x"]) assert.strictEqual(g.parseLine(bad), null, bad);
assert.deepStrictEqual(g.parsePoint("P(4, 3)"), { name: "P", x: 4, y: 3 });
assert.deepStrictEqual(g.parsePoint("(1/2,-1)"), { name: "", x: 0.5, y: -1 });
assert.strictEqual(g.parsePoint("P(4)"), null);

// 교점·거리·접선
{
  const L = g.parseLine("y=0");
  assert.deepStrictEqual(g.crossings(L, [0, 1], 2).map((p) => p.map((v) => Math.round(v * 1e9) / 1e9)), [[-Math.round(Math.sqrt(3) * 1e9) / 1e9, 0], [Math.round(Math.sqrt(3) * 1e9) / 1e9, 0]]);
  assert.strictEqual(g.crossings(L, [0, 2], 2).length, 1, "tangent");
  assert.strictEqual(g.crossings(L, [0, 3], 2).length, 0);
  near(g.distanceTo(g.parseLine("3x+4y-10=0"), [0, 0]), 2, "distance 10/5");
  const T = g.tangentPoints([2, 0], [0, 0], 1);
  for (const t of T) near((t[0] - 2) * t[0] + t[1] * t[1], 0, "radius ⟂ tangent");
  assert.strictEqual(g.tangentPoints([0.5, 0], [0, 0], 1), null);
  assert.strictEqual(g.tangentPoints([1, 0], [0, 0], 1).length, 1);
}
// 자르기: y=x+10은 [-3,3]² 밖, x=1은 세로 선분
assert.strictEqual(g.clipLine(g.parseLine("y=x+10"), [-3, 3, -3, 3]), null);
{
  const seg = g.clipLine(g.parseLine("x=1"), [-3, 3, -3, 3]);
  nearP(seg[0], [1, -3], "bottom");
  nearP(seg[1], [1, 3], "top");
}
// 원의 방정식 글자
{
  const e = g.circleEquation([1, -2], 2);
  assert.strictEqual(e.text, "(x-1)2+(y+2)2=4");
  assert.deepStrictEqual(e.sup, [5, 12]);
  assert.strictEqual(g.circleEquation([0, 0], 1.5).text, "x2+y2=2.25");
}

// 그림: 원 (1,1) r=2, 직선 y=x+2 → 거리 √2 < 2, 교점 A·B, 수선의 발 H
const base = { center: [1, 1], r: 2, line: g.parseLine("y=x+2"), point: g.parsePoint("P(4,3)"), unit: 10, tick: 2, mark: 4, circle: true, radius: true,
  crossings: true, centerDistance: true, tangents: false, pointDistance: false, equations: true, grid: false, numbers: false };
{
  const d = g.buildCircleLine(base);
  assert.ok(d.notes[0].startsWith("중심과 직선 거리 d = 1.41, r = 2 → 두 점에서 만남"), d.notes[0]);
  const texts = d.texts.map((t) => t.text);
  for (const n of ["C", "r", "H", "d", "A", "B", "P", "y=x+2", "(x-1)2+(y-1)2=4"]) assert.ok(texts.includes(n), n);
  const circle = d.lines.find((l) => l.closed);
  assert.deepStrictEqual(circle.points[0].anchor, [30, 10]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 1);
  // 교점은 원과 직선 위
  const A = d.dots[1].map((v) => v / 10);
  near((A[0] - 1) ** 2 + (A[1] - 1) ** 2, 4, "A on circle", 1e-9);
  near(A[1], A[0] + 2, "A on line", 1e-9);
}
// P(4,3)에서 그은 접선 두 개, 접점 T₁ T₂, 접선은 반지름과 수직
{
  const d = g.buildCircleLine(Object.assign({}, base, { line: null, tangents: true }));
  const tangentNote = d.notes.find((n) => n.startsWith("접선 "));
  assert.ok(tangentNote && tangentNote.split(",").length === 2, tangentNote);
  const ts = d.texts.filter((t) => t.text === "T1" || t.text === "T2");
  assert.strictEqual(ts.length, 2);
  assert.deepStrictEqual(ts[0].sub, [1]);
  for (const t of ts) {
    const T = t.at.map((v) => v / 10);
    near((T[0] - 1) * (4 - T[0]) + (T[1] - 1) * (3 - T[1]), 0, "CT ⟂ TP", 1e-9);
  }
}
// P와 직선 거리: (4,3)과 y=x+2 → |4-3+2|/√2
{
  const d = g.buildCircleLine(Object.assign({}, base, { pointDistance: true }));
  assert.ok(d.notes.includes("P와 직선 거리 = 2.12"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 2);
}
// 접하는 경우와 P가 원 안
{
  const d = g.buildCircleLine(Object.assign({}, base, { line: g.parseLine("y=3"), point: g.parsePoint("P(1,1.5)"), tangents: true }));
  assert.ok(d.notes[0].endsWith("접함"));
  assert.ok(d.texts.some((t) => t.text === "T"));
  assert.ok(d.notes.includes("P가 원 안에 있어 접선을 그을 수 없음"));
}

assert.ok(source.includes('var PREF_KEY = "HighMathCircleLine/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("circle-line checks passed");
