const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(기하.jsx)의 "ConicTangent" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "기하.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeConicTangentEngine(");
  assert.ok(start >= 0, "missing engine: makeConicTangentEngine");
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

const names = ["conicQuadratic", "conicValue", "polarLine", "normalLine", "meetLine", "slopeTangents", "buildTangent", "lineText", "signedText",
  "numText", "conicShape", "conicCurves", "pointOnConic", "conicEquation", "equationNote", "pointText", "shiftText", "radicalText",
  "cosh", "sinh", "asinh", "acosh", "clipLine", "formatValue", "unit", "straight"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, KAPPA = 0.5522847498, TOUCH_NAMES = ["P", "Q"];\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { kind: 1, vertical: false, p: 1, a: 3, b: 2, mode: 0, angle: 60, slope: 1, x0: 4, y0: 3, unit: 10, tick: 3,
  equation: true, lineText: true, names: true, coords: false, chord: false, grid: false, numbers: true };
const build = (extra) => g.buildTangent(Object.assign({}, base, extra));
const texts = (d) => d.tangents.map((t) => t.text);

// 접선은 접점에서 곡선에 닿고(한 점에서만 만나고), 접점을 지난다
function assertTangent(o, t) {
  const Q = g.conicQuadratic(Object.assign({}, base, o));
  near(g.conicValue(Q, t.touch[0], t.touch[1]), 0, "touch on the curve");
  near(t.line.a * t.touch[0] + t.line.b * t.touch[1] + t.line.c, 0, "line through touch");
  const meet = g.meetLine(Q, t.line);
  assert.ok(meet.length <= 1 || Math.hypot(meet[0][0] - meet[1][0], meet[0][1] - meet[1][1]) < 1e-4, "line only touches");
}

// 수 글자
assert.deepStrictEqual([13 ** 0.5, 40 ** 0.5, 13 ** 0.5 / 2, 0.5, 3, 1 / 3, 0.123].map(g.numText), ["√13", "2√10", "√13/2", "1/2", "3", "1/3", "0.12"]);
assert.strictEqual(g.lineText(g.normalLine(0.5, -1, 3)), "y=(1/2)x+3");
assert.strictEqual(g.lineText(g.normalLine(1, 0, -3)), "x=3");
assert.strictEqual(g.lineText(g.normalLine(0, 1, 2)), "y=-2");

// 타원 x²/9+y²/4=1
{
  const d = build({ mode: 1, slope: 1 });
  assert.deepStrictEqual(texts(d), ["y=x+√13", "y=x-√13"]);
  d.tangents.forEach((t) => assertTangent({}, t));
  assert.ok(d.notes.includes("기울기 1인 접선: y=x+√13, y=x-√13"), d.notes.join(" / "));
  assert.ok(d.texts.some((t) => t.text === "P") && d.texts.some((t) => t.text === "Q"));
}
{
  const d = build({ mode: 0, angle: 0 });
  assert.deepStrictEqual(texts(d), ["x=3"]);
  assert.ok(d.notes.includes("P(3, 0)에서의 접선: x=3"));
}
{
  const d = build({ mode: 0, angle: 60 });
  d.tangents.forEach((t) => assertTangent({}, t));
}
// 밖의 점 A(4, 3): 두 접선이 A를 지나고, 접점을 잇는 선은 A의 극선
{
  const d = build({ mode: 2, chord: true });
  assert.strictEqual(d.tangents.length, 2);
  for (const t of d.tangents) {
    assertTangent({}, t);
    near(t.line.a * 4 + t.line.b * 3 + t.line.c, 0, "through A");
  }
  const [P, Q] = d.tangents.map((t) => t.touch);
  near(4 * P[0] / 9 + 3 * P[1] / 4, 1, "P on polar");
  near(4 * Q[0] / 9 + 3 * Q[1] / 4, 1, "Q on polar");
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 1, "chord of contact");
  assert.ok(d.texts.some((t) => t.text === "A"));
}
assert.ok(build({ mode: 2, x0: 0, y0: 0 }).notes.includes("A에서 그은 접선은 없음 (A가 곡선 안쪽)"));
{
  const d = build({ mode: 2, x0: 3, y0: 0 });
  assert.deepStrictEqual(texts(d), ["x=3"]);
  assert.ok(d.notes.includes("A가 곡선 위에 있어 A에서의 접선 하나"));
}

// 포물선 y²=4x: 기울기 1 → y=x+1, 접점 (1, 2). 기울기 0은 접선 없음. A(-1, 0) → y=±(x+1)
{
  const d = build({ kind: 0, p: 1, mode: 1, slope: 1 });
  assert.deepStrictEqual(texts(d), ["y=x+1"]);
  near(d.tangents[0].touch[0], 1, "touch x");
  near(d.tangents[0].touch[1], 2, "touch y");
  assert.ok(build({ kind: 0, p: 1, mode: 1, slope: 0 }).notes.includes("기울기가 0인 접선은 없음"));
  const e = build({ kind: 0, p: 1, mode: 2, x0: -1, y0: 0 });
  assert.deepStrictEqual(texts(e).sort(), ["y=-x-1", "y=x+1"]);
  e.tangents.forEach((t) => assertTangent({ kind: 0, p: 1 }, t));
}
// 세로 포물선 x²=4y: 기울기 2 → y=2x-4
assert.deepStrictEqual(texts(build({ kind: 0, vertical: true, p: 1, mode: 1, slope: 2 })), ["y=2x-4"]);
{
  const d = build({ kind: 0, vertical: true, p: 1, mode: 0, angle: 45 });
  d.tangents.forEach((t) => assertTangent({ kind: 0, vertical: true, p: 1 }, t));
}

// 쌍곡선 x²/9-y²/4=1: 기울기 1 → y=x±√5, 기울기 1/2(< b/a)는 없음. 세로(=-1)는 y=x±√(4-9m²)
{
  const d = build({ kind: 2, mode: 1, slope: 1 });
  assert.deepStrictEqual(texts(d), ["y=x+√5", "y=x-√5"]);
  d.tangents.forEach((t) => assertTangent({ kind: 2 }, t));
  assert.strictEqual(build({ kind: 2, mode: 1, slope: 0.5 }).tangents.length, 0);
  assert.deepStrictEqual(texts(build({ kind: 2, vertical: true, mode: 1, slope: 0.5 })), ["y=(1/2)x+√7/2", "y=(1/2)x-√7/2"]);
  const e = build({ kind: 2, mode: 2, x0: 1, y0: 0 });
  assert.strictEqual(e.tangents.length, 2);
  e.tangents.forEach((t) => assertTangent({ kind: 2 }, t));
}

assert.ok(source.includes('var PREF_KEY = "HighMathConicTangent/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("conic tangent checks passed");
