const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "NumberLine" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_MiddleMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeNumberLineEngine(");
  assert.ok(start >= 0, "missing engine: makeNumberLineEngine");
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

const names = ["evaluate", "parsePoints", "parseInequality", "buildNumberLine"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

// 값 계산
near(g.evaluate("-2.5"), -2.5, "decimal");
near(g.evaluate("3/4"), 0.75, "fraction");
near(g.evaluate("√2"), Math.SQRT2, "root");
near(g.evaluate("1-√3"), 1 - Math.sqrt(3), "root expression");
near(g.evaluate("2√3"), 2 * Math.sqrt(3), "implicit product");
near(g.evaluate("−(1+√2)/2"), -(1 + Math.SQRT2) / 2, "unicode minus and parens");
assert.strictEqual(g.evaluate("abc"), null);
assert.strictEqual(g.evaluate("1/0"), null);
assert.strictEqual(g.evaluate("(1"), null);
assert.strictEqual(g.evaluate("1..2"), null);
near(g.evaluate(".5"), 0.5, "leading dot");

// 점 목록
{
  const r = g.parsePoints("A=-2.5, B = 3/4, √2, C=?");
  assert.deepStrictEqual(r.list.map((p) => p.name), ["A", "B", ""]);
  assert.deepStrictEqual(r.bad, ["C=?"]);
}

// 부등식
assert.deepStrictEqual(g.parseInequality("x>2"), { lower: { value: 2, closed: false }, upper: null });
assert.deepStrictEqual(g.parseInequality("x ≤ -1"), { lower: null, upper: { value: -1, closed: true } });
assert.deepStrictEqual(g.parseInequality("-1<x<=3"), { lower: { value: -1, closed: false }, upper: { value: 3, closed: true } });
assert.deepStrictEqual(g.parseInequality("2>=x"), { lower: null, upper: { value: 2, closed: true } });
assert.deepStrictEqual(g.parseInequality("3>x>-2"), { lower: { value: -2, closed: false }, upper: { value: 3, closed: false } });
assert.deepStrictEqual(g.parseInequality(""), { lower: null, upper: null });
assert.strictEqual(g.parseInequality("3<x<1"), null, "empty range");
assert.strictEqual(g.parseInequality("x<1<2"), null);
assert.strictEqual(g.parseInequality("x"), null);
for (const text of ["y", "y<", "<y", "ab", "x<y", "<", "1<2", "x<=", "x<>2"]) assert.strictEqual(g.parseInequality(text), null, text);
assert.deepStrictEqual(g.parseInequality("y>=1"), { lower: { value: 1, closed: true }, upper: null }, "any letter");
assert.ok(!/match\(/.test(extractFunction("parseInequality")), "no whole-pattern regex (ExtendScript hangs)");

// 그림: -2~2, 칸 2개, 해 -1<x<=1
{
  const d = g.buildNumberLine({ min: -2, max: 2, unit: 10, subdivisions: 2, tick: 4, showNumbers: true,
    points: [{ name: "A", value: 0.5 }], solution: g.parseInequality("-1<x<=1"), solutionHeight: 8, dotRadius: 1 });
  const ticks = d.lines.filter((l) => l.points.length === 2 && l.points[0][0] === l.points[1][0]);
  assert.strictEqual(ticks.length, 9, "8 half steps + 1");
  assert.deepStrictEqual(d.texts.filter((t) => t.dir === -1).map((t) => t.text), ["-2", "-1", "0", "1", "2"]);
  const solution = d.lines.find((l) => l.main);
  assert.deepStrictEqual(solution.points, [[-10, 1], [-10, 8], [10, 8], [10, 1]], "rises from both dots");
  assert.deepStrictEqual(d.dots.map((x) => x.open), [true, false, false], "open at -1, closed at 1, point A");
  assert.deepStrictEqual(d.texts.find((t) => t.text === "A").at, [5, 0]);
}

// 한쪽만 막힌 해는 수직선 끝까지
{
  const d = g.buildNumberLine({ min: -2, max: 2, unit: 10, subdivisions: 1, tick: 4, showNumbers: false,
    points: [], solution: g.parseInequality("x>=1"), solutionHeight: 8, dotRadius: 1 });
  const solution = d.lines.find((l) => l.main);
  assert.deepStrictEqual(solution.points, [[10, 1], [10, 8], [26, 8]]);
  assert.strictEqual(d.texts.length, 0);
}

assert.ok(source.includes('var PREF_KEY = "NumberLine/settings";'));
assert.ok(!/\beval\(/.test(source), "no eval");
// ExtendScript는 /=로 시작하는 정규식을 나누기-대입으로 읽어 스크립트 전체가 문법 오류가 난다
assert.ok(!/[(,=]\s*\/=/.test(source), "regex literal must not start with =");
console.log("number line checks passed");
