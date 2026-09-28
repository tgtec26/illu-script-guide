const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(Object_HighMath1.jsx)의 "Triangle" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighMath1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeTriangleEngine(");
  assert.ok(start >= 0, "missing engine: makeTriangleEngine");
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

const names = ["solveTriangle", "describeTriangle", "trim", "buildTriangle", "circumcenter", "smallAngle", "arcPoints", "contains", "plain", "sub", "unit"];
const g = new Function(`var DOT_RADIUS_MM = 0.6, MM_TO_PT = 2.834645669;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 세 변 3-4-5: 직각은 C (a=3, b=4, c=5)
{
  const t = g.solveTriangle(0, { a: 3, b: 4, c: 5 });
  near(t.C, 90, "right angle at C"); near(t.A + t.B + t.C, 180, "angle sum");
  assert.ok(g.solveTriangle(0, { a: 1, b: 2, c: 3 }).error, "degenerate triangle refused");
}
// 두 변과 끼인각: b=5, c=8, A=60° → a=7 (코사인법칙)
{
  const t = g.solveTriangle(1, { b: 5, c: 8, A: 60 });
  near(t.a, 7, "law of cosines");
  assert.deepStrictEqual(t.given, ["A"]);
}
// 한 변과 양 끝 각: a=10, B=45°, C=75° → A=60°, b = 10·sin45/sin60 (사인법칙)
{
  const t = g.solveTriangle(2, { a: 10, B: 45, C: 75 });
  near(t.A, 60, "A"); near(t.b, 10 * Math.sin(Math.PI / 4) / Math.sin(Math.PI / 3), "law of sines");
  assert.ok(g.solveTriangle(2, { a: 10, B: 100, C: 80 }).error);
}
// 설명: R = a / (2 sin A), 넓이 = bc sin A / 2
assert.ok(g.describeTriangle(g.solveTriangle(1, { b: 5, c: 8, A: 60 })).includes("넓이 = 17.32"));

// 그림: B(0,0), C(a,0), A가 위. 변 길이가 입력과 같다. 외접원이 세 꼭짓점을 지난다
{
  const t = g.solveTriangle(0, { a: 7, b: 5, c: 8 });
  const d = g.buildTriangle(t, { unit: 10, mode: 0, sideStyle: 1, angleStyle: 2, circle: true, center: true, markRadius: 5 });
  const [A, B, C] = d.lines[0].points.map((p) => p.anchor);
  assert.deepStrictEqual(B, [0, 0]); near(C[0], 70, "BC"); assert.ok(A[1] > 0, "A on top");
  near(Math.hypot(A[0] - C[0], A[1] - C[1]), 50, "CA = b"); near(Math.hypot(A[0], A[1]), 80, "AB = c");
  const circle = d.circles[0];
  for (const V of [A, B, C]) near(Math.hypot(V[0] - circle.center[0], V[1] - circle.center[1]), circle.radius, "circumcircle");
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3, "three angle marks");
  assert.deepStrictEqual(d.texts.filter((x) => ["a", "b", "c"].includes(x.text)).map((x) => x.text), ["a", "b", "c"]);
  // 변 글자는 바깥쪽: a(밑변)는 아래
  const aLabel = d.texts.find((x) => x.text === "a");
  near(aLabel.dir[1], -1, "a label below BC");
}
// 주어진 각만: SAS면 A 하나
{
  const d = g.buildTriangle(g.solveTriangle(1, { b: 5, c: 8, A: 60 }), { unit: 10, sideStyle: 0, angleStyle: 1, circle: false, center: false, markRadius: 5 });
  assert.deepStrictEqual(d.texts.filter((x) => x.text.endsWith("°")).map((x) => x.text), ["60°"]);
}

assert.ok(source.includes('var PREF_KEY = "HighMathTriangle/settings";'));
console.log("triangle checks passed");
