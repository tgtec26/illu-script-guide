const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(Object_HighMath2.jsx)의 "Piecewise" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighMath2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makePiecewiseEngine(");
  assert.ok(start >= 0, "missing engine: makePiecewiseEngine");
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

const names = ["parseRange", "splitOperator", "numberOf", "safeValue", "valueNear", "buildPiecewise", "fmt", "straight", "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const R = g.parseRange, f = g.compileFunction;
const piece = (formula, range) => ({ fn: f(formula), range: R(range), label: formula });
const base = { xMin: -2, xMax: 4, yMin: -1, yMax: 4, unit: 10, tick: 2, guides: true, formulas: false, grid: false, numbers: false };
const build = (pieces, o) => g.buildPiecewise(Object.assign({}, base, { pieces }, o || {}));

// 범위 읽기
const I = Infinity;
assert.deepStrictEqual(R("x<1"), { lo: -I, hi: 1, loIn: false, hiIn: false });
assert.deepStrictEqual(R("x>=2"), { lo: 2, hi: I, loIn: true, hiIn: false });
assert.deepStrictEqual(R("1<=x<3"), { lo: 1, hi: 3, loIn: true, hiIn: false });
assert.deepStrictEqual(R("-1 < x ≤ 1/2"), { lo: -1, hi: 0.5, loIn: false, hiIn: true });
assert.deepStrictEqual(R("x=1"), { lo: 1, hi: 1, loIn: true, hiIn: true });
assert.deepStrictEqual(R("3>x"), { lo: -I, hi: 3, loIn: false, hiIn: false });
for (const bad of ["", "x", "3<x<1", "1<y", "x<a", "x<1<2", "xx<1"]) assert.strictEqual(R(bad), null, bad);

// 기본 예: x<1에서 x+1, x>1에서 -x+3, f(1)=1 → x=1에서 좌극한 2 = 우극한 2 ≠ f(1)=1 → 불연속
{
  const d = build([piece("x+1", "x<1"), piece("-x+3", "x>1"), piece("1", "x=1")]);
  assert.deepStrictEqual(d.notes, ["x=1: 좌극한 2, 우극한 2, f(1)=1 → 불연속"]);
  // (1,2) 빈 점 하나(두 조각이 공유), (1,1) 채운 점
  assert.deepStrictEqual(d.dots.map((x) => [x.at, x.open]), [[[10, 20], true], [[10, 10], false]]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "graph").length, 2);
}
// 연속: x<=1에서 x^2, x>1에서 2x-1 → 채운 점 하나
{
  const d = build([piece("x^2", "x<=1"), piece("2x-1", "x>1")]);
  assert.deepStrictEqual(d.notes, ["x=1: 좌극한 1, 우극한 1, f(1)=1 → 연속"]);
  assert.deepStrictEqual(d.dots.map((x) => x.open), [false]);
}
// 점프: 좌극한 ≠ 우극한, 경계 두 개, 끝점에서 축까지 점선
{
  const d = build([piece("1", "x<0"), piece("x+2", "0<=x<2"), piece("-1", "x>=2")], { yMin: -2 });
  assert.deepStrictEqual(d.notes, ["x=0: 좌극한 1, 우극한 2, f(0)=2 → 불연속", "x=2: 좌극한 4, 우극한 -1, f(2)=-1 → 불연속"]);
  assert.deepStrictEqual(d.dots.map((x) => x.open), [true, false, true, false]);
  assert.ok(d.lines.filter((l) => l.kind === "guide").length >= 4);
}
// 정의되지 않는 곳: 1/x (x≠0)
{
  const d = build([piece("1/x", "x<0"), piece("1/x", "x>0")], { yMin: -4 });
  assert.deepStrictEqual(d.notes, ["x=0: 좌극한 -∞, 우극한 ∞, f(0)=없음 → 불연속"]);
  assert.deepStrictEqual(d.dots, [], "no dot at an asymptote");
}

assert.ok(source.includes('var PREF_KEY = "HighMathPiecewise/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("piecewise checks passed");
