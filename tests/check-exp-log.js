const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(Object_HighMath1.jsx)의 "ExpLog" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighMath1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeExpLogEngine(");
  assert.ok(start >= 0, "missing engine: makeExpLogEngine");
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

const names = ["graphList", "graphFunction", "graphFormula", "baseText", "shiftText", "buildExpLog", "noteFor", "parseBases", "formatValue", "straight",
  "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { mode: 0, a: 2, m: 0, n: 0, compare: [], xMin: -3, xMax: 5, yMin: -3, yMax: 5, unit: 10, tick: 2, fontSize: 8,
  asymptotes: true, points: true, coords: true, mirror: false, formulas: true, grid: false, numbers: false };
const build = (o) => g.buildExpLog(Object.assign({}, base, o));

// 식 글자
assert.strictEqual(g.graphFormula({ kind: "exp", a: 2, m: 0, n: 0 }), "y=2^x");
assert.strictEqual(g.graphFormula({ kind: "exp", a: 0.5, m: 1, n: -2 }), "y=(1/2)^(x-1)-2");
assert.strictEqual(g.graphFormula({ kind: "log", a: 3, m: -1, n: 2 }), "y=log_3(x+1)+2");
assert.strictEqual(g.graphFormula({ kind: "log", a: 0.5, m: 0, n: 0 }), "y=log_(1/2)x");
{
  const d = g.formulaDisplay("y=log_(1/2)x");
  assert.strictEqual(d.text, "y=log1/2x");
  assert.deepStrictEqual(d.sub, [5, 6, 7]);
  assert.deepStrictEqual(d.roman, [2, 3, 4]);
  const e = g.formulaDisplay("y=(1/2)^(x-1)-2");
  assert.strictEqual(e.text, "y=(1/2)x-1-2");
  assert.deepStrictEqual(e.sup, [7, 8, 9]);
}
assert.deepStrictEqual(g.parseBases("3, 1/2"), [3, 0.5]);
assert.deepStrictEqual(g.parseBases(""), []);
for (const bad of ["1", "-2", "0", "x", "3,,a"]) assert.strictEqual(g.parseBases(bad), null, bad);

// 지수함수 y=2^x: 그래프 1개, 점 (0,1)(1,2), 점근선 y=0은 x축이라 따로 긋지 않는다
{
  const d = build({});
  assert.strictEqual(d.lines.filter((l) => l.kind === "graph").length, 1);
  assert.deepStrictEqual(d.dots, [[0, 10], [10, 20]]);
  assert.ok(d.texts.some((t) => t.text === "(1, 2)"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 0);
  assert.strictEqual(d.notes[0], "y=2^x: 증가, 점근선 y=0, 치역 y>0");
}
// 평행이동 y=(1/2)^(x-1)-2: 감소, 점근선 y=-2 점선
{
  const d = build({ a: 0.5, m: 1, n: -2 });
  assert.strictEqual(d.notes[0], "y=(1/2)^(x-1)-2: 감소, 점근선 y=-2, 치역 y>-2");
  const guide = d.lines.find((l) => l.kind === "guide");
  assert.deepStrictEqual(guide.points.map((p) => p.anchor), [[-30, -20], [50, -20]]);
  assert.deepStrictEqual(d.dots[0], [10, -10]);
}
// 로그함수: x=m 점근선, 점 (1,0)(a,1), 정의역
{
  const d = build({ mode: 1, a: 3, m: -1 });
  assert.strictEqual(d.notes[0], "y=log_3(x+1): 증가, 점근선 x=-1, 정의역 x>-1");
  assert.deepStrictEqual(d.dots, [[0, 0], [20, 10]]);
  const curve = d.lines.find((l) => l.kind === "graph").points;
  assert.ok(curve[0].anchor[0] > -10, "log starts right of the asymptote");
}
// 역함수: 지수·로그·y=x, 대칭인 점 잇기, 로그는 지수와 y=x 대칭
{
  const d = build({ mode: 2, m: 1, n: 1, mirror: true, compare: [3] });
  assert.strictEqual(d.lines.filter((l) => l.kind === "graph").length, 3, "2^x, 3^x, log");
  assert.ok(d.texts.some((t) => t.text === "y=x"));
  assert.ok(d.notes.includes("y=log_2(x-1)+1: 증가, 점근선 x=1, 정의역 x>1"));
  const fn = g.graphFunction({ kind: "exp", a: 2, m: 1, n: 1 }), inv = g.graphFunction({ kind: "log", a: 2, m: 1, n: 1 });
  near(inv(fn(1.7)), 1.7, "inverse");
  // (1,2)↔(2,1), (2,3)↔(3,2): y=x에 수직인 점선 두 개
  const links = d.lines.filter((l) => l.kind === "guide" && l.points.length === 2 &&
    Math.abs((l.points[1].anchor[1] - l.points[0].anchor[1]) + (l.points[1].anchor[0] - l.points[0].anchor[0])) < 1e-9);
  assert.strictEqual(links.length, 2);
}

assert.ok(source.includes('var PREF_KEY = "HighMathExpLog/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("exp-log checks passed");
