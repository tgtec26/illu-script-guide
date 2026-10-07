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

console.log(`arrowhead shapes: ${SCRIPTS.length} scripts ok`);
