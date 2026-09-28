const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 고등학교 수학 묶음(Object_HighMath.jsx)의 "Inequality" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeInequalityEngine(");
  assert.ok(start >= 0, "missing engine: makeInequalityEngine");
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

const names = ["parseInequality", "evalSide", "intervalsAt", "intersectIntervals", "regionPolygons", "buildInequality", "boundaryText", "circlePoints", "straight",
  "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, KAPPA = 0.5522847498, COLUMNS = 240;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const P = g.parseInequality;

// 읽기
{
  const a = P("y>2x+1");
  assert.strictEqual(a.kind, "above");
  assert.strictEqual(a.strict, true);
  near(a.fn(1), 3, "f(1)");
  assert.strictEqual(P("y<=-x^2+4").kind, "below");
  assert.strictEqual(P("y≤-x^2+4").strict, false);
  assert.strictEqual(P("x^2+1>y").kind, "below", "f(x) > y");
  const line = P("2x+3y<6");
  assert.strictEqual(line.kind, "below");
  near(line.fn(0), 2, "y-intercept 2");
  near(line.line.slope, -2 / 3, "slope");
  assert.strictEqual(P("-y+x<0").kind, "above", "x < y");
  const v = P("x>=1");
  assert.deepStrictEqual([v.kind, v.c, v.strict], ["right", 1, false]);
  assert.strictEqual(P("3-x>1").kind, "left", "x < 2");
  near(P("3-x>1").c, 2, "x < 2");
  const c = P("x^2+y^2<=4");
  assert.deepStrictEqual([c.kind, c.cx, c.cy, c.r], ["inside", 0, 0, 2]);
  const c2 = P("(x-1)^2+(y+2)^2>9");
  assert.strictEqual(c2.kind, "outside");
  near(c2.cx, 1, "cx"); near(c2.cy, -2, "cy"); near(c2.r, 3, "r");
  assert.strictEqual(P("-x^2-y^2>-1").kind, "inside", "negative k flips");
  for (const bad of ["y=2x", "x^2+2y^2<4", "xy<1", "x^3+y^2<1", "y<", "1<2", "y<x<2", "x^2+y^2<-1"]) assert.strictEqual(P(bad), null, bad);
}

// 구간
assert.deepStrictEqual(g.intersectIntervals([[-3, 5]], [[-1e9, 1], [2, 1e9]]), [[-3, 1], [2, 5]]);
assert.deepStrictEqual(g.intervalsAt(P("x^2+y^2<4"), 0), [[-2, 2]]);
assert.deepStrictEqual(g.intervalsAt(P("x^2+y^2<4"), 3), []);

// 영역: y<=-x^2+4, y>=x → 넓이 (교점 x=(-1±√17)/2 사이 ∫(-x²+4-x)) 와 면 하나
{
  const list = [P("y<=-x^2+4"), P("y>=x")];
  const polys = g.regionPolygons(list, -3, 3, -3, 5, 240);
  assert.strictEqual(polys.length, 1);
  let area = 0;
  const poly = polys[0];
  for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; area += x1 * y2 - x2 * y1; }
  const r1 = (-1 - Math.sqrt(17)) / 2, r2 = (-1 + Math.sqrt(17)) / 2;
  const F = (x) => -(x ** 3) / 3 + 4 * x - x * x / 2;
  near(Math.abs(area) / 2, F(r2) - F(r1), "region area", 0.1);
}
// 원 밖: 원이 가운데를 가르는 동안 면이 둘(위·아래)
{
  const polys = g.regionPolygons([P("x^2+y^2>1")], -2, 2, -2, 2, 240);
  assert.ok(polys.length >= 3, "left strip, upper, lower, right strip");
  const total = polys.reduce((sum, poly) => {
    let a = 0;
    for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; a += x1 * y2 - x2 * y1; }
    return sum + Math.abs(a) / 2;
  }, 0);
  near(total, 16 - Math.PI, "square minus disk", 0.15);
}

// 그림: 등호 없으면 점선, 식 글자는 = 로
{
  const d = g.buildInequality({ list: [P("y<-x^2+4"), P("x^2+y^2<=4"), P("x>1")], xMin: -3, xMax: 3, yMin: -3, yMax: 5, unit: 10, tick: 2,
    shade: true, shadeK: 20, formulas: true, grid: false, numbers: false, fontSize: 8 });
  const bounds = d.lines.filter((l) => l.kind === "boundary");
  assert.deepStrictEqual(bounds.map((l) => l.dashed), [true, false, true]);
  assert.ok(bounds[1].closed, "circle closed");
  const labels = d.texts.map((t) => t.text);
  for (const n of ["y=-x2+4", "x2+y2=4", "x=1"]) assert.ok(labels.includes(n), n);
  assert.strictEqual(d.fills.length, 1);
  assert.ok(d.fills[0].points.every((p) => p[0] >= 10 - 1e-9), "right of x=1");
}
assert.ok(g.buildInequality({ list: [P("y>5"), P("y<0")], xMin: -3, xMax: 3, yMin: -3, yMax: 5, unit: 10, tick: 2, shade: true, shadeK: 20,
  formulas: false, grid: false, numbers: false }).notes[0].includes("없음"));

assert.ok(source.includes('var PREF_KEY = "HighMathInequality/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("inequality checks passed");
