const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(Object_HighCommon.jsx)의 "Move" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighCommon.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeMoveEngine(");
  assert.ok(start >= 0, "missing engine: makeMoveEngine");
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

const names = ["parseShape", "fraction", "transformPoint", "buildMove", "labelDir", "centroid", "formatValue", "scale", "sub", "dist", "unit"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, SMALL_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const opt = { unit: 10, tick: 2, grid: false, numbers: true, links: true, coords: false, dashedOriginal: false };

// 입력
assert.deepStrictEqual(g.parseShape("A(1,2) B(-1/2, 3)"), [{ name: "A", x: 1, y: 2 }, { name: "B", x: -0.5, y: 3 }]);
for (const bad of ["A(1)", "A(1,", "A(x,2)", "1,2"]) assert.strictEqual(g.parseShape(bad), null, bad);
assert.deepStrictEqual(g.parseShape(""), []);

// 이동 규칙 (점 (3, 1), a=2, b=-1)
const P = [3, 1];
assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => g.transformPoint(P, k, 2, -1)),
  [[5, 0], [3, -1], [-3, 1], [-3, -1], [1, 3], [-1, -3], [1, -3], [1, 1], [3, -3]]);

// 대칭이동은 두 번 하면 제자리
for (let k = 1; k <= 8; k++) assert.deepStrictEqual(g.transformPoint(g.transformPoint(P, k, 2, -1), k, 2, -1), P, `involution ${k}`);

// 그림: y=x 대칭 삼각형 → 옮긴 이름 A′ B′ C′, 대칭축 y=x, 대응점 점선 3개, 좌표 범위가 도형을 담는다
{
  const shape = g.parseShape("A(1,2) B(4,1) C(2,4)");
  const d = g.buildMove(shape, 4, 0, 0, opt);
  const names = d.texts.map((t) => t.text);
  for (const n of ["A", "B", "C", "A\u2032", "B\u2032", "C\u2032", "y=x"]) assert.ok(names.includes(n), n);
  const mains = d.lines.filter((l) => l.kind === "main");
  assert.strictEqual(mains.length, 2);
  assert.deepStrictEqual(mains[1].points, [[20, 10], [10, 40], [40, 20]], "reflected over y=x");
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide" && l.dashed).length, 1 + 3, "axis + 3 links");
  const axis = d.lines.find((l) => l.kind === "guide").points;
  assert.ok(axis[0][0] === axis[0][1] && axis[1][0] === axis[1][1], "axis on y=x");
}
// 평행이동은 대응점 끝에 화살촉
{
  const d = g.buildMove(g.parseShape("P(1,1)"), 0, 3, 2, opt);
  assert.strictEqual(d.arrows.filter((a) => a.small).length, 1);
  assert.deepStrictEqual(d.dots[1], [40, 30]);
}
// 점 대칭은 대칭점과 좌표 글자
{
  const d = g.buildMove(g.parseShape("A(1,2)"), 6, 2, -1, opt);
  assert.ok(d.texts.some((t) => t.text === "(2, -1)"));
}

assert.ok(source.includes('var PREF_KEY = "HighMathMove/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("move checks passed");
