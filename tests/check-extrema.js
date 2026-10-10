const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(수학2.jsx)의 "Extrema" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeExtremaEngine(");
  assert.ok(start >= 0, "missing engine: makeExtremaEngine");
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

const names = ["safeValue", "derivativeAt", "secondDerivativeAt", "zerosOf", "criticalPoints", "inflectionPoints", "buildExtrema", "buildTable", "niceNumber",
  "straight", "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, TREND_ARROW = { length: 1.8, halfWidth: 0.7, notch: 0.4 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const f = (text) => g.compileFunction(text);
const base = { label: "", mode: 0, xMin: -3, xMax: 3, yMin: -3, yMax: 3, unit: 10, tick: 2, cell: 30, row: 20, fontSize: 8,
  extrema: true, values: true, flat: false, inflection: false, formula: false, grid: false, numbers: false };
const build = (o) => g.buildExtrema(Object.assign({}, base, o));

assert.deepStrictEqual([1, -1, 0.5, 2 / 3, Math.sqrt(2), -2 * Math.sqrt(3), 1.2345, 0].map(g.niceNumber), ["1", "-1", "1/2", "2/3", "√2", "-2√3", "1.23", "0"]);

// x³-3x: 극대 f(-1)=2, 극소 f(1)=-2
{
  const pts = g.criticalPoints(f("y=x^3-3x"), -3, 3);
  assert.deepStrictEqual(pts.map((p) => [g.niceNumber(p.x), g.niceNumber(p.y), p.type]), [["-1", "2", "max"], ["1", "-2", "min"]]);
  const d = build({ f: f("y=x^3-3x"), label: "y=x^3-3x" });
  assert.strictEqual(d.notes[0], "극대 f(-1) = 2, 극소 f(1) = -2");
  assert.strictEqual(d.dots.length, 2);
  // 증감표: 5칸, x 줄 … -1 … 1 …, f′ 줄 + 0 - 0 +, 극대·극소 글자, 화살표 3개(↗ ↘ ↗)
  const table = d.texts.filter((t) => t.dir[0] === 0 && t.dir[1] === 0).map((t) => t.text);
  for (const n of ["x", "f′(x)", "f(x)", "-1", "1", "극대", "극소", "+", "-", "0"]) assert.ok(table.includes(n), n);
  const trends = d.arrows.filter((a) => a.trend).map((a) => Math.sign(a.dir[1]));
  assert.deepStrictEqual(trends, [1, -1, 1]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "table").length, 4 + 1 + 3, "4 rules, header divider, 3 arrow stems");
  // 표는 그래프 아래
  const rules = d.lines.filter((l) => l.kind === "table" && l.points[0].anchor[1] === l.points[1].anchor[1]);
  assert.ok(Math.max(...rules.map((l) => l.points[0].anchor[1])) < -35);
}
// x³: f′(0)=0이지만 극값 아님 (표에 0, 극대·극소 글자 없음), 변곡점 (0, 0)
{
  const d = build({ f: f("y=x^3"), inflection: true });
  assert.strictEqual(d.notes[0], "극값 없음");
  assert.strictEqual(d.notes[1], "변곡점 (0, 0)");
  const table = d.texts.filter((t) => t.dir[0] === 0 && t.dir[1] === 0).map((t) => t.text);
  assert.ok(!table.includes("극대") && !table.includes("극소"));
  assert.deepStrictEqual(d.arrows.filter((a) => a.trend).map((a) => Math.sign(a.dir[1])), [1, 1]);
}
// x⁴-2x²: 극소 ±1, 극대 0 / x³-6x: 극값 x = ±√2
{
  const d = build({ f: f("y=x^4-2x^2") });
  assert.strictEqual(d.notes[0], "극소 f(-1) = -1, 극대 f(0) = 0, 극소 f(1) = -1");
  const e = build({ f: f("y=x^3-6x"), yMin: -6, yMax: 6, mode: 2 });
  assert.strictEqual(e.notes[0], "극대 f(-√2) = 4√2, 극소 f(√2) = -4√2");
  assert.ok(!e.texts.some((t) => t.text === "O"), "table only: no axes");
}
// x+1/x: 불연속(0)은 극점이 아니다
assert.strictEqual(build({ f: f("y=x+1/x") }).notes[0], "극대 f(-1) = -2, 극소 f(1) = 2");

assert.ok(source.includes('var PREF_KEY = "HighMathExtrema/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("extrema checks passed");
