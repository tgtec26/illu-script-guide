const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {catalog, assertSameCatalog, expectedPoints, nearPoints} = require("./arrowhead-catalog.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
const LABELS = '["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"]';

function extractFunction(source, name) {
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
function extractCatalogVar(source) {
  const start = source.indexOf("var HEAD_CATALOG = [");
  const stop = source.indexOf("];", start) + 2;
  return source.slice(start, stop);
}
const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1e-9, `${label}: expected ${b}, got ${a}`);

// 삼각형 머리에서 카탈로그 모양을 만드는 스크립트(머리 길이 4, 폭 3의 삼각형을 줬을 때)
const TRIANGLE_DERIVED = ["Object_Wave.jsx", "Object_Galaxy.jsx", "Object_PlateBoundary.jsx", "Object_SeparationSetup.jsx",
  "Object_Circulation.jsx", "Object_MagneticField.jsx", "Object_LensMirror.jsx"];
for (const file of TRIANGLE_DERIVED) {
  const source = read(file);
  new Function(source);
  assertSameCatalog(source, file);

  const lib = new Function(
    "var MM = 1, HEAD_LENGTH = 4, HEAD_WIDTH = 3, headSizePct = 100, headShape = 0;\n" +
    `${extractCatalogVar(source)}\n${extractFunction(source, "catalogPoints")}\n${source.includes("function headFromTriangle(") ? extractFunction(source, "headFromTriangle") : ""}\n${extractFunction(source, "arrowHeadPoints")}\n${extractFunction(source, "arrowHeadShape")}\n` +
    "return {arrowHeadShape: arrowHeadShape, setShape: function(v) { headShape = v; }};"
  )();
  const k = 4 / catalog.types[0].length;   // 삼각형 머리 길이 4가 카탈로그 삼각형 8.6에 해당
  for (let shape = 0; shape < 4; shape++) {
    lib.setShape(shape);
    const h = lib.arrowHeadShape([10, 0], 1, 0);
    assert.strictEqual(h.closed, true, `${file}: shape ${shape} is closed`);
    assert.deepStrictEqual(h.points[0], [10, 0], `${file}: shape ${shape} tip first`);
    nearPoints(h.points, expectedPoints(shape, [10, 0], [1, 0], k), `${file}: shape ${shape}`);
  }
  // 위쪽을 가리켜도 같은 모양
  lib.setShape(3);
  nearPoints(lib.arrowHeadShape([0, 10], 0, 1).points, expectedPoints(3, [0, 10], [0, 1], k), `${file}: upward harpoon`);

  assert.ok(source.includes(`var HEAD_SHAPES = ${LABELS};`), `${file}: HEAD_SHAPES`);
  assert.ok(/headShapeList = \w+\.add\("dropdownlist", undefined, HEAD_SHAPES\)/.test(source), `${file}: shape dropdown`);
  assert.ok(/headShapeList\.onChange = function/.test(source), `${file}: shape dropdown handler`);
}

// 렌즈·거울 렌즈 탭: 삼각형 세 점에서 만드는 최상위 함수
{
  const source = read("Object_LensMirror.jsx");
  const lib = new Function(
    `${extractCatalogVar(source)}\n${extractFunction(source, "catalogPoints")}\n${extractFunction(source, "headFromTriangle")}\nreturn {headFromTriangle: headFromTriangle};`
  )();
  const tri = [[10, 0], [6, 1.5], [6, -1.5]];
  for (let shape = 0; shape < 4; shape++) {
    const h = lib.headFromTriangle(tri, shape);
    assert.strictEqual(h.closed, true);
    nearPoints(h.points, expectedPoints(shape, [10, 0], [1, 0], 4 / 8.6), `lens tab: shape ${shape}`);
  }
}

// 그리기 도구(t.arrow)를 쓰는 탭 묶음: 모양에 따라 선과 머리가 달라진다
for (const file of ["Object_ReactionModel.jsx", "Object_Neuron.jsx", "Object_Weather.jsx"]) {
  const source = read(file);
  new Function(source.replace("#include", "//include"));
  assertSameCatalog(source, file);
  const paths = [];
  const g = {pathItems: {add: () => {
    const item = {setEntirePath(points) { this.points = points; }};
    paths.push(item);
    return item;
  }}};
  const make = new Function("g", "o",
    "var FORM_MM = 1; function formGray() {} function formPaint(p, fillK, strokeK, width) { p.fillK = fillK; p.strokeK = strokeK; p.width = width; }\n" +
    `${extractCatalogVar(source)}\n${extractFunction(source, "catalogPoints")}\n${extractFunction(source, "makeFormTools")}\nreturn makeFormTools(g, o);`);
  // 화학 반응 모형은 기존 단순 화살표(arrow)를 그대로 두고 화살촉을 고르는 headArrow를 따로 쓴다
  const arrowTool = file === "Object_ReactionModel.jsx" ? "headArrow" : "arrow";
  const arrow = (o) => { paths.length = 0; make(g, o)[arrowTool]([0, 0], [20, 0], 1, 100, 4); return paths.map((p) => ({points: p.points, closed: p.closed, fill: p.fillK, stroke: p.strokeK})); };

  // o에 값이 없어도 삼각형(기본). 머리 길이 4가 카탈로그 삼각형 8.6에 해당하고 선은 lineEnd에서 끝난다
  for (const o of [{}, {headShape: 0, headSize: 100}]) {
    const [line, head] = arrow(o);
    const k = 4 / 8.6;
    near(line.points[1][0], 20 - 7.7 * k, `${file}: triangle line end`);
    nearPoints(head.points, expectedPoints(0, [20, 0], [1, 0], k), `${file}: triangle`);
    assert.strictEqual(head.closed, true);
    assert.strictEqual(head.fill, 100, `${file}: head is filled`);
  }
  // 크기: 200%면 머리와 lineEnd가 두 배
  {
    const [line, head] = arrow({headShape: 2, headSize: 200});
    const k = 8 / 8.6;
    nearPoints(head.points, expectedPoints(2, [20, 0], [1, 0], k), `${file}: swallowtail at 200%`);
    near(line.points[1][0], 20 - 7 * k, `${file}: swallowtail line end at 200%`);
  }
  // 꺾쇠·작살형
  for (const shape of [1, 3]) {
    const [line, head] = arrow({headShape: shape, headSize: 100});
    const k = 4 / 8.6;
    nearPoints(head.points, expectedPoints(shape, [20, 0], [1, 0], k), `${file}: shape ${shape}`);
    near(line.points[1][0], 20 - catalog.types[shape].lineEnd * k, `${file}: shape ${shape} line end`);
    assert.strictEqual(head.closed, true);
  }
  assert.ok(source.includes(`items: ${LABELS}`.replace("items: ", "items: ")) || source.includes('{key: "headShape", label: "화살촉 모양", items: ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"]'), `${file}: shape control`);
  assert.ok(source.includes('{key: "headSize", label: "화살촉 크기"'), `${file}: size control`);
  assert.ok(source.includes("spec.draw(makeFormTools(group, o), o);"), `${file}: tools get the options`);
}

console.log(`arrowhead shapes: ${TRIANGLE_DERIVED.length} triangle-derived scripts and 3 toolkit scripts ok`);
