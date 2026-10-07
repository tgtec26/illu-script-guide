const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");

// 화살촉 모양(삼각형·꺾쇠·제비꼬리)을 고를 수 있는 스크립트. 파일마다 같은 arrowHeadShape 모양을 쓴다
const SCRIPTS = [
  "Object_Wave.jsx",
  "Object_Galaxy.jsx",
  "Object_PlateBoundary.jsx",
  "Object_SeparationSetup.jsx",
  "Object_Circulation.jsx",
  "Object_MagneticField.jsx",
  "Object_LensMirror.jsx",
];

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

const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1e-9, `${label}: expected ${b}, got ${a}`);

for (const file of SCRIPTS) {
  const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
  new Function(source); // 문법

  const lib = new Function(
    "var MM = 1, HEAD_LENGTH = 4, HEAD_WIDTH = 3, headSizePct = 100, HEAD_CHEVRON = 1, HEAD_SWALLOW = 2, headShape = 0;\n" +
    `${extractFunction(source, "arrowHeadPoints")}\n${extractFunction(source, "arrowHeadShape")}\n` +
    "return {arrowHeadShape: arrowHeadShape, setShape: function(v) { headShape = v; }};"
  )();

  // 삼각형: 닫힌 세 점, 끝이 tip
  lib.setShape(0);
  let h = lib.arrowHeadShape([10, 0], 1, 0);
  assert.strictEqual(h.closed, true, `${file}: triangle is closed`);
  assert.strictEqual(h.points.length, 3, `${file}: triangle has 3 points`);
  assert.deepStrictEqual(h.points[0], [10, 0], `${file}: triangle tip`);
  // 꺾쇠: 열린 선, 가운데 점이 끝
  lib.setShape(1);
  h = lib.arrowHeadShape([10, 0], 1, 0);
  assert.strictEqual(h.closed, false, `${file}: chevron is open`);
  assert.deepStrictEqual(h.points[1], [10, 0], `${file}: chevron apex is the tip`);
  // 제비꼬리: 닫힌 네 점, 홈은 밑변에서 머리 길이의 0.3
  lib.setShape(2);
  h = lib.arrowHeadShape([10, 0], 1, 0);
  assert.strictEqual(h.closed, true, `${file}: swallowtail is closed`);
  assert.strictEqual(h.points.length, 4, `${file}: swallowtail has 4 points`);
  near(h.points[2][0], 6 + 4 * 0.3, `${file}: notch position`);
  near(h.points[2][1], 0, `${file}: notch on the axis`);

  // 다이얼로그: 모양 목록과 크기·모양 저장
  assert.ok(source.includes('var HEAD_SHAPES = ["삼각형", "꺾쇠 (열린 V)", "제비꼬리"];'), `${file}: HEAD_SHAPES`);
  assert.ok(/headShapeList = \w+\.add\("dropdownlist", undefined, HEAD_SHAPES\)/.test(source), `${file}: shape dropdown`);
  assert.ok(/headShapeList\.onChange = function/.test(source), `${file}: shape dropdown handler`);
  assert.ok(/previewEnabled \? "1" : "0", headShape/.test(source) || /headShape,/.test(source), `${file}: shape is saved`);
}

// 렌즈·거울 탭: 삼각형 세 점에서 모양을 만드는 최상위 함수
{
  const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_LensMirror.jsx"), "utf8");
  const lib = new Function(
    "var HEAD_CHEVRON = 1, HEAD_SWALLOW = 2;\n" + extractFunction(source, "headFromTriangle") + "\nreturn {headFromTriangle: headFromTriangle};"
  )();
  const tri = [[10, 0], [6, 1.5], [6, -1.5]];
  assert.strictEqual(lib.headFromTriangle(tri, 0).closed, true, "lens triangle");
  const chevron = lib.headFromTriangle(tri, 1);
  assert.strictEqual(chevron.closed, false, "lens chevron is open");
  assert.deepStrictEqual(chevron.points[1], [10, 0], "lens chevron apex");
  const swallow = lib.headFromTriangle(tri, 2);
  assert.strictEqual(swallow.points.length, 4, "lens swallowtail");
  near(swallow.points[2][0], 6 + 4 * 0.3, "lens notch position");
  assert.ok(source.includes('headShapeList.onChange = function() {'), "lens shape dropdown");
}

// 그리기 도구(t.arrow)를 쓰는 탭 묶음: 모양에 따라 선·촉 패스가 달라진다
for (const file of ["Object_ChemReaction.jsx", "Object_Neuron.jsx", "Object_Weather.jsx"]) {
  const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
  new Function(source);
  const paths = [];
  const g = {pathItems: {add: () => {
    const item = {setEntirePath(points) { this.points = points; }};
    paths.push(item);
    return item;
  }}};
  const make = new Function("g", "o",
    "var FORM_MM = 1; function formGray() {} function formPaint(p, fillK, strokeK, width) { p.fillK = fillK; p.strokeK = strokeK; p.width = width; }\n" +
    extractFunction(source, "makeFormTools") + "\nreturn makeFormTools(g, o);");
  const arrow = (o) => { paths.length = 0; make(g, o).arrow([0, 0], [20, 0], 1, 100, 4); return paths.map((p) => ({points: p.points, closed: p.closed, fill: p.fillK, stroke: p.strokeK})); };

  // 삼각형(기본): 선은 촉 뿌리까지, 채운 닫힌 세 점. o에 값이 없어도 같다
  for (const o of [{}, {headShape: 0, headSize: 100}]) {
    const [line, head] = arrow(o);
    assert.deepStrictEqual(line.points[1], [16.2, 0], `${file}: line stops at the base`);
    assert.deepStrictEqual(head.points[0], [20, 0], `${file}: triangle tip`);
    assert.strictEqual(head.points.length, 3);
    assert.strictEqual(head.closed, true);
    assert.strictEqual(head.fill, 100, `${file}: triangle is filled`);
  }
  // 크기: 100%의 두 배면 촉 길이가 두 배
  {
    const [, head] = arrow({headShape: 0, headSize: 200});
    assert.ok(Math.abs(head.points[1][0] - 12) < 1e-9, `${file}: scaled base is 8 back from the tip`);
    assert.ok(Math.abs(head.points[1][1] - 2.8) < 1e-9, `${file}: scaled wing half width`);
  }
  // 꺾쇠: 선이 끝점까지, 촉은 열린 선 [날개, 끝, 날개]
  {
    const [line, head] = arrow({headShape: 1, headSize: 100});
    assert.deepStrictEqual(line.points[1], [20, 0], `${file}: chevron line runs to the tip`);
    assert.strictEqual(head.closed, false, `${file}: chevron is open`);
    assert.deepStrictEqual(head.points[1], [20, 0], `${file}: chevron apex`);
    assert.strictEqual(head.stroke, 100, `${file}: chevron is stroked`);
    assert.strictEqual(head.fill, null, `${file}: chevron is not filled`);
  }
  // 제비꼬리: 닫힌 네 점, 홈은 밑변에서 촉 길이의 0.3 앞, 선은 홈 안쪽에서 끝남
  {
    const [line, head] = arrow({headShape: 2, headSize: 100});
    assert.strictEqual(head.points.length, 4, `${file}: swallowtail has 4 points`);
    assert.strictEqual(head.closed, true);
    assert.ok(Math.abs(head.points[2][0] - 17.2) < 1e-9, `${file}: notch position`);
    assert.ok(line.points[1][0] > head.points[1][0] && line.points[1][0] < 20, `${file}: line ends inside the head`);
  }
  // 모양·크기 컨트롤이 스펙에 있고 그리기 도구가 옵션을 받는다
  assert.ok(source.includes('{key: "headShape", label: "화살촉 모양"'), `${file}: shape control`);
  assert.ok(source.includes('{key: "headSize", label: "화살촉 크기"'), `${file}: size control`);
  assert.ok(source.includes("spec.draw(makeFormTools(group, o), o);"), `${file}: tools get the options`);
}

console.log(`arrowhead shapes: ${SCRIPTS.length} scripts ok`);
