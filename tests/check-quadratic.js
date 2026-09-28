const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(Object_HighCommon.jsx)의 "Quadratic" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighCommon.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeQuadraticEngine(");
  assert.ok(start >= 0, "missing engine: makeQuadraticEngine");
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

const names = ["quadraticRoots", "parabolaPiece", "visibleIntervals", "solveInequality", "buildQuadratic", "clipSegment", "quadraticText", "joinValues", "fmt", "straight"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, INEQUALITIES = ["없음", "f(x) > 0", "f(x) ≥ 0", "f(x) < 0", "f(x) ≤ 0"];\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const bez = (p, q, t) => { const s = 1 - t; return [0, 1].map((i) => s * s * s * p.anchor[i] + 3 * s * s * t * p.right[i] + 3 * s * t * t * q.left[i] + t * t * t * q.anchor[i]); };
const base = { a: 1, b: -4, c: 3, m: 1, n: -1, inequality: 3, letters: false, xMin: -2, xMax: 6, yMin: -2, yMax: 6, unit: 10, tick: 2,
  vertex: true, axisLine: true, roots: true, intercept: true, line: false, formula: true, grid: false, numbers: false };
const build = (o) => g.buildQuadratic(Object.assign({}, base, o));

assert.deepStrictEqual(g.quadraticRoots(1, -4, 3), [1, 3]);
assert.deepStrictEqual(g.quadraticRoots(1, -2, 1), [1]);
assert.deepStrictEqual(g.quadraticRoots(1, 0, 1), []);
assert.deepStrictEqual(g.quadraticText(1, -4, 3), { text: "y=x2-4x+3", sup: [3] });
assert.strictEqual(g.quadraticText(-0.5, 1, 0).text, "y=-0.5x2+x");
assert.deepStrictEqual([2, -1.5, Math.sqrt(2), 2 / 3, 1 + Math.sqrt(2)].map(g.fmt), ["2", "-3/2", "√2", "2/3", "2.41"]);

// 포물선 조각은 정확: 베지어 위의 점이 식을 만족
{
  const piece = g.parabolaPiece(1, -4, 3, -1, 5, 1);
  for (const t of [0.2, 0.5, 0.9]) { const [x, y] = bez(piece[0], piece[1], t); near(y, x * x - 4 * x + 3, "on parabola"); }
  // y ≤ 6 안: x² - 4x + 3 ≤ 6 → 2 - √7 … 2 + √7, x 범위 [-2, 6]으로 자름
  const vis = g.visibleIntervals(1, -4, 3, -2, 6, -2, 6);
  assert.strictEqual(vis.length, 1);
  near(vis[0][0], 2 - Math.sqrt(7), "left cut");
  near(vis[0][1], 2 + Math.sqrt(7), "right cut");
  // 꼭짓점이 y 범위 아래면 두 조각
  assert.strictEqual(g.visibleIntervals(1, 0, -5, -4, 4, -2, 6).length, 2);
}
// 부등식
assert.strictEqual(g.solveInequality(1, -4, 3, 3).text, "1 < x < 3");
assert.strictEqual(g.solveInequality(1, -4, 3, 2).text, "x ≤ 1 또는 x ≥ 3");
assert.strictEqual(g.solveInequality(-1, 4, -3, 1).text, "1 < x < 3", "a < 0 flips");
assert.strictEqual(g.solveInequality(1, -2, 1, 1).text, "x ≠ 1인 모든 실수");
assert.strictEqual(g.solveInequality(1, -2, 1, 4).text, "x = 1");
assert.strictEqual(g.solveInequality(1, -2, 1, 3).text, "해가 없음");
assert.strictEqual(g.solveInequality(1, 0, 1, 1).text, "모든 실수");

// 그림: 꼭짓점 (2, -1), 근 1·3, 해 1<x<3 굵은 선분과 빈 점 2개
{
  const d = build({});
  assert.strictEqual(d.notes[0], "꼭짓점 (2, -1), 판별식 D = 4, 근 x = 1, 3");
  assert.strictEqual(d.notes[1], "f(x) < 0의 해: 1 < x < 3");
  const solution = d.lines.filter((l) => l.kind === "solution");
  assert.deepStrictEqual(solution.map((l) => l.points.map((p) => p.anchor[0])), [[10, 30]]);
  assert.strictEqual(d.dots.filter((x) => x.open).length, 2);
  assert.ok(d.texts.some((t) => t.text === "(2, -1)") && d.texts.some((t) => t.text === "y=x2-4x+3"));
  const letters = build({ letters: true, inequality: 0 });
  assert.ok(letters.texts.some((t) => t.text === "α") && letters.texts.some((t) => t.text === "β"));
}
// 직선 y = x - 1: x² - 5x + 4 = 0 → x = 1, 4 두 점
{
  const d = build({ line: true, inequality: 0 });
  assert.ok(d.notes.includes("직선과: D = 9 → 두 점에서 만남 (x = 1, 4)"), d.notes.join("/"));
  const tangent = build({ line: true, inequality: 0, m: -2, n: 2 });   // x² - 2x + 1 = 0 → 접함
  assert.ok(tangent.notes.some((n) => n.includes("접함")));
}

assert.ok(source.includes('var PREF_KEY = "HighCommonQuadratic/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("quadratic checks passed");
