const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 3D.jsx 입체 도형 탭의 치수 글자·보조선과 구·반구 (웹 sci-illu-web solid3d.js의 dimensionItems·구·반구와 같은 의미)
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "06_도형", "3D.jsx"), "utf8");

// 설정 복원에 쓰는 바깥 도우미(restoreNumber·restoreInteger·parseNumber)를 같이 펼친다
function helper(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(name);
}
const HELPERS = ["restoreNumber", "restoreInteger", "parseNumber"].map(helper).join("\n");

function loadEngine(state) {
  const sharedStart = source.indexOf("// ==== 공통 기하");
  const sharedEnd = source.indexOf("// ==== 입체 도형 엔진");
  const engineStart = source.indexOf("function makeSolidEngine(variant) {");
  const engineEnd = source.indexOf("// ==== 돌출 엔진", engineStart);
  assert.ok(sharedStart > 0 && sharedEnd > sharedStart && engineStart > sharedEnd && engineEnd > engineStart, "engine section not found");
  let body = source.slice(engineStart + "function makeSolidEngine(variant) {".length, engineEnd);
  body = source.slice(sharedStart, sharedEnd) + body.slice(0, body.lastIndexOf("return api;"));
  const keys = Object.keys(state);
  const prelude = `
    var variant = "rotation";
    var MM_TO_PT = 2.834645669, LINE_WIDTH_PT = 0.3, HIDDEN_DASH = [2, 1];
    var MAX_ARC_SPAN = Math.PI / 4, FACING_EPSILON = 1e-9;
    var FILL_NONE = 0, FILL_FLAT = 1, FILL_LIT = 2, HIDDEN_NONE = 0, HIDDEN_DASHED = 1, HIDDEN_SOLID = 2;
    var rotY = 45, rotX = 35.3, rotZ = 0, perspectiveOn = false, perspectiveMm = 300, angleR = 131, angleL = 109, depthPercent = 100;
    var hiddenMode = 1, fillMode = 2, brightness = 70, contrast = 40, lightAzimuth = -35, lightElevation = 50;
    var engine = { usesViewAngles: false }, perspectiveActive = false, originX = 0, originY = 0;
    var viewMatrix = null, eyeZ = 0, strokeColor = null, documentIsCmyk = true, kColorCache = {};
    var doc = {};
    ${HELPERS}
  `;
  return new Function("app", "PointType", "CMYKColor", "RGBColor", "DocumentColorSpace",
    prelude + body + `
    ${keys.map((k) => `${k} = ${JSON.stringify(state[k])};`).join("\n")}
    return { buildModel, beginView, collectParts, collectFills, dimensionItems, revolutionItems, projectModel, saveFields, restoreFields, SHAPES,
      get: function() { return [dimWidth, dimDepth, dimHeight, dimRadius, dimSlant]; },
      getTurn: function() { return [showAxis, axisName, sectionMode, sectionHeight, sectionK]; } };`
  )({}, { SMOOTH: "smooth", CORNER: "corner" }, function () {}, function () {}, { CMYK: "CMYK" });
}

const SHAPE_IDS = loadEngine({}).SHAPES.map((s) => s.id);
const indexOf = (id) => { const i = SHAPE_IDS.indexOf(id); assert.ok(i >= 0, id); return i; };
assert.strictEqual(SHAPE_IDS.indexOf("sphere4"), 13, "예전 저장값의 종류 번호를 지킨다(구·반구는 끝에)");

function dims(state) {
  const api = loadEngine(Object.assign({ widthMm: 20, depthMm: 20, heightMm: 20, linkWidthDepth: true, sideCount: 6, baseRotation: 0, topRatio: 50 }, state));
  const model = api.buildModel();
  api.beginView(model);
  const parts = api.collectParts(model);
  return { api, model, parts, d: api.dimensionItems(model) };
}
const labelOf = (d, text) => d.labels.find((l) => l.text === text);

// 직육면체: 가로·세로는 아래, 높이는 오른쪽 바깥
{
  const { api, model, d } = dims({ shapeIndex: indexOf("box"), widthMm: 30, depthMm: 20, heightMm: 15, linkWidthDepth: false, dimWidth: "4 cm", dimDepth: "3 cm", dimHeight: "5 cm" });
  assert.deepStrictEqual(d.labels.map((l) => l.text).sort(), ["3 cm", "4 cm", "5 cm"]);
  const xs = model.verts.map((v) => api.projectModel(v)[0]), ys = model.verts.map((v) => api.projectModel(v)[1]);
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  assert.ok(labelOf(d, "4 cm").at[1] < cy && labelOf(d, "3 cm").at[1] < cy, "가로·세로는 아래쪽");
  assert.ok(labelOf(d, "5 cm").at[0] > Math.max(...xs) - 1, "높이는 오른쪽 바깥");
  assert.strictEqual(d.visible.length + d.hidden.length, 0);
}
// 원기둥: 윗면 반지름 실선과 가운데 점, 높이 글자
{
  const { d } = dims({ shapeIndex: indexOf("cylinder"), dimRadius: "3 cm", dimHeight: "8 cm" });
  assert.strictEqual(d.visible.length, 1);
  assert.strictEqual(d.dots.length, 1);
  assert.strictEqual(d.labels.length, 2);
}
// 원뿔: 반지름·높이 점선, 직각 표시 하나(세 점 꺾은선), 모선 오른쪽
{
  const { d } = dims({ shapeIndex: indexOf("cone"), dimRadius: "3 cm", dimHeight: "4 cm", dimSlant: "5 cm" });
  assert.strictEqual(d.hidden.length, 2);
  assert.strictEqual(d.visible.length, 1);
  assert.strictEqual(d.visible[0].kind, "poly");
  assert.strictEqual(d.labels.length, 3);
  assert.ok(labelOf(d, "4 cm").at[0] < labelOf(d, "3 cm").at[0]);
}
// 각뿔: 높이 점선 + 밑면 가운데에서 앞 모서리 가운데로 점선, 직각 표시
{
  const { d } = dims({ shapeIndex: indexOf("pyramid"), sideCount: 4, dimHeight: "8 cm", dimWidth: "6 cm" });
  assert.strictEqual(d.hidden.length, 2);
  assert.strictEqual(d.visible.length, 1);
}
// 구·반구: 선과 면이 생기고 반지름 글자
{
  for (const id of ["sphere", "hemisphere"]) {
    const { api, model, parts, d } = dims({ shapeIndex: indexOf(id), widthMm: 30, dimRadius: "5 cm" });
    assert.ok(parts.visible.length >= 1 && parts.hidden.length >= 1, id + " 선");
    assert.ok(api.collectFills(model).length >= 1, id + " 면");
    assert.strictEqual(d.labels.length, 1);
    assert.strictEqual(d.dots.length, 1);
    if (id === "hemisphere") assert.strictEqual(d.hidden.length, 1, "반구 반지름은 밑면 안이라 점선");
  }
}
// 설정: 치수 글자 다섯 칸을 저장하고, 예전(9칸) 저장값은 치수 없이 읽는다
{
  const api = loadEngine({ dimWidth: "a|b", dimRadius: "3 cm" });
  const saved = api.saveFields().map(String);
  assert.strictEqual(saved.length, 19);
  const fresh = loadEngine({});
  fresh.restoreFields(saved);
  assert.deepStrictEqual(fresh.get(), ["a|b", "", "", "3 cm", ""]);
  const old = loadEngine({ dimWidth: "x" });
  old.restoreFields(saved.slice(0, 9));
  assert.deepStrictEqual(old.get(), ["x", "", "", "", ""], "9칸이면 치수 글자는 그대로");
  assert.ok(source.includes('"v7"') && /p\[0\] === "v6"/.test(source), "설정 v7, v6·v5도 읽는다");
  const v6 = loadEngine({ showAxis: true });
  v6.restoreFields(saved.slice(0, 14));
  assert.deepStrictEqual(v6.get(), ["a|b", "", "", "3 cm", ""], "v6(14칸)도 치수는 읽는다");
  assert.strictEqual(v6.getTurn()[0], true, "v6에는 회전축 칸이 없어 그대로");
}

// 회전축·회전 화살표·단면 (웹 solid3d.test.js와 같은 경우)
{
  const turn = (state) => {
    const api = loadEngine(Object.assign({ widthMm: 20, depthMm: 20, heightMm: 20, linkWidthDepth: true, sideCount: 4, baseRotation: 0, topRatio: 50, rotY: 0, rotX: 20 }, state));
    const model = api.buildModel();
    api.beginView(model);
    return api.revolutionItems(model);
  };
  let t = turn({ shapeIndex: indexOf("cone"), showAxis: true, axisName: "l" });
  assert.strictEqual(t.marks.length, 2, "축 + 화살표");
  assert.strictEqual(t.marks[0].dash.length, 4, "일점쇄선");
  assert.ok(t.labels.some((l) => l.text === "l"));
  t = turn({ shapeIndex: indexOf("cone"), sectionMode: 1, sectionK: 30 });
  assert.strictEqual(t.fills.length, 1);
  assert.strictEqual(t.fills[0].points.length, 3, "원뿔 축 단면은 삼각형");
  assert.strictEqual(t.lines.length, 1);
  t = turn({ shapeIndex: indexOf("pyramid"), sectionMode: 2, sectionHeight: 50 });
  assert.strictEqual(t.fills[0].points.length, 4, "사각뿔 수평 단면은 사각형");
  t = turn({ shapeIndex: indexOf("cylinder"), sectionMode: 2, sectionHeight: 50 });
  assert.strictEqual(t.fills[0].kind, "cap");
  t = turn({ shapeIndex: indexOf("hemisphere"), sectionMode: 1 });
  assert.strictEqual(t.fills[0].kind, "segments");
}

console.log("3d dims checks passed");
