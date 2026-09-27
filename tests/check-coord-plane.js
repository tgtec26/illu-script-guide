const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "CoordPlane" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_MiddleMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCoordPlaneEngine(");
  assert.ok(start >= 0, "missing engine: makeCoordPlaneEngine");
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

const names = ["compileFunction", "evaluateNumber", "parsePointList", "plotFunction", "toBezier", "formulaDisplay", "buildPlane", "straight"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 식 읽기
const f = (text, x) => g.compileFunction(text)(x);
near(f("y=2x+1", 3), 7, "linear");
near(f("y=-x^2+4", 3), -5, "minus binds after power");
near(f("y=1/2x", 4), 2, "1/2x is half x");
near(f("y=6/x", 2), 3, "inverse");
near(f("f(x)=(x-1)^2", 3), 4, "f(x)= prefix and parens");
near(f("y=√x", 9), 3, "root");
near(f("y=2(x+1)", 1), 4, "implicit product with parens");
near(f("y = x² − 1", 3), 8, "unicode square and minus");
near(f("y=-2x", 3), -6, "negative coefficient");
for (const bad of ["y=", "y=2x+", "y=(x", "y=z", "y=1..2x", "y"]) assert.strictEqual(g.compileFunction(bad), null, bad);

// 점
{
  const r = g.parsePointList("A(2,3) B(-1, -2), (1/2,√2) C(1) D(2,");
  assert.deepStrictEqual(r.list.map((p) => [p.name, p.x, p.y]), [["A", 2, 3], ["B", -1, -2], ["", 0.5, Math.SQRT2]]);
  assert.deepStrictEqual(r.bad, ["C(1)", "D(2,"]);
  assert.strictEqual(g.evaluateNumber("x"), null);
}

// 그래프: 직선은 3차 에르미트로 정확하니 쪼개지 않는다
{
  const segs = g.plotFunction(g.compileFunction("y=2x+1"), -5, 5, -5, 5);
  assert.strictEqual(segs.length, 1);
  const s = segs[0];
  near(s[0].x, -3, "enters at y=-5", 1e-6);
  near(s[s.length - 1].x, 2, "leaves at y=5", 1e-6);
  assert.ok(s.length <= 12, `few anchors for a line: ${s.length}`);
}

// 반비례는 원점을 사이에 두고 두 조각, 범위 밖은 잘림
{
  const segs = g.plotFunction(g.compileFunction("y=6/x"), -5, 5, -5, 5);
  assert.strictEqual(segs.length, 2);
  for (const s of segs) for (const p of s) assert.ok(p.y >= -5 - 1e-9 && p.y <= 5 + 1e-9);
  near(segs[0][segs[0].length - 1].x, -1.2, "left branch stops at y=-5", 1e-6);
  near(segs[1][0].x, 1.2, "right branch starts at y=5", 1e-6);
}

// 베지어가 곡선에서 벗어나지 않는다 (포물선, 반비례: 각 구간 가운데 점 비교)
for (const text of ["y=-x^2+4", "y=6/x", "y=√x", "y=x^3/4-x"]) {
  const fn = g.compileFunction(text);
  for (const seg of g.plotFunction(fn, -5, 5, -5, 5)) {
    const bz = g.toBezier(seg, 1);
    for (let i = 0; i + 1 < bz.length; i++) {
      const p0 = bz[i].anchor, p1 = bz[i].right, p2 = bz[i + 1].left, p3 = bz[i + 1].anchor;
      const mid = [0, 1].map((k) => (p0[k] + 3 * p1[k] + 3 * p2[k] + p3[k]) / 8);
      const y = fn(mid[0]);
      if (!isFinite(y)) continue;
      assert.ok(Math.abs(y - mid[1]) < 0.02, `${text} off curve at x=${mid[0]}: ${mid[1]} vs ${y}`);
    }
  }
}

// 식 표시: ^ 다음은 위첨자
assert.deepStrictEqual(g.formulaDisplay("y=-x^2+4"), { text: "y=-x2+4", sup: [4] });
assert.deepStrictEqual(g.formulaDisplay("y=x^12*2"), { text: "y=x122", sup: [3, 4] });

// 평면 전체
{
  const d = g.buildPlane({ xMin: -2, xMax: 3, yMin: -1, yMax: 2, unit: 10, tick: 2, grid: true, numbers: true,
    functions: [{ fn: g.compileFunction("y=x"), label: "y=x" }], formulas: true,
    points: g.parsePointList("A(1,2)").list, coords: true, guides: true });
  assert.deepStrictEqual(d.arrows.map((a) => a.tip), [[38, 0], [0, 28]], "arrow tips past the max");
  const axes = d.lines.filter((l) => l.kind === "axis" && l.points[0].anchor[1] === 0 && l.points[1].anchor[1] === 0);
  assert.deepStrictEqual(axes[0].points.map((p) => p.anchor), [[-25, 0], [35, 0]], "x axis stops at the arrow notch");
  assert.strictEqual(d.lines.filter((l) => l.kind === "grid").length, 5 + 3);
  assert.ok(d.texts.some((t) => t.text === "A(1, 2)"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
  assert.ok(!d.texts.some((t) => t.text === "0"), "origin is O, not 0");
}

assert.ok(source.includes('var PREF_KEY = "CoordPlane/settings";'));
assert.ok(!/[(,=]\s*\/=/.test(source), "regex literal must not start with = (ExtendScript syntax error)");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("coord plane checks passed");
