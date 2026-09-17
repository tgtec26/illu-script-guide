const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const file = "스크립트/01_도형/Object_3DLine.jsx";
const source = fs.readFileSync(path.join(root, file), "utf8");

// 다이얼로그 뒤의 기하·그리기 함수 전체를 잘라내 상태 변수와 함께 평가한다
function loadEngine(state) {
  // 공통 기하 구간 + 엔진 함수 본문(마지막 return api; 앞까지)을 한 스코프에 펼친다
  const sharedStart = source.indexOf("// ==== 공통 기하");
  const sharedEnd = source.indexOf("// ==== 입체 도형 엔진");
  const engineStart = source.indexOf("function makeSolidEngine(variant) {");
  const engineEnd = source.indexOf("// ==== 돌출 엔진", engineStart);
  assert.ok(sharedStart > 0 && sharedEnd > sharedStart && engineStart > sharedEnd && engineEnd > engineStart, "engine section not found");
  let body = source.slice(engineStart + "function makeSolidEngine(variant) {".length, engineEnd);
  body = body.slice(0, body.lastIndexOf("return api;"));
  body = source.slice(sharedStart, sharedEnd) + body;
  const defaults = {
    shapeIndex: 0, widthMm: 20, depthMm: 20, heightMm: 20, sideCount: 6, baseRotation: 0, topRatio: 50,
    rotY: 45, rotX: 35.3, rotZ: 0, perspectiveOn: false, perspectiveMm: 300, hiddenMode: 1,
    fillMode: 0, brightness: 70, contrast: 40, lightAzimuth: -35, lightElevation: 50,
    originX: 0, originY: 0,
  };
  const s = Object.assign({}, defaults, state);
  const prelude = `
    var MM_TO_PT = 2.834645669, LINE_WIDTH_PT = 0.3, HIDDEN_DASH = [2, 1];
    var CURVE_SAMPLES = 144, MAX_ARC_SPAN = Math.PI / 4, FACING_EPSILON = 1e-9;
    var HIDDEN_NONE = 0, HIDDEN_DASHED = 1, HIDDEN_SOLID = 2;
    var FILL_NONE = 0, FILL_FLAT = 1, FILL_LIT = 2;
    var SHAPES = [
      {id: "box"}, {id: "tetra", regular: true}, {id: "octa", regular: true}, {id: "dodeca", regular: true}, {id: "icosa", regular: true},
      {id: "prism", sides: true}, {id: "pyramid", sides: true}, {id: "frustum", sides: true, taper: true},
      {id: "cylinder"}, {id: "cone"}, {id: "conefrustum", taper: true}, {id: "tube", taper: true, tube: true}];
    ${Object.keys(s).map((k) => `var ${k};`).join("\n")}
    var engine = { usesViewAngles: false }, perspectiveActive = false, variant = "rotation";
    var viewMatrix = null, eyeZ = 0, strokeColor = null, documentIsCmyk = true, kColorCache = {};
    var paths = [];
    var doc = { groupItems: { add() { return makeGroup(); } }, documentColorSpace: "CMYK" };
    function makeGroup() {
      var group = { removed: false, name: "", groups: [],
        pathItems: { add() { var p = makePath(); p.group = group; paths.push(p); return p; } },
        groupItems: { add() { var g = makeGroup(); group.groups.push(g); return g; } },
        compoundPathItems: { add() { var c = makeGroup(); c.compound = true; group.groups.push(c); return c; } },
        remove() { this.removed = true; } };
      return group;
    }
    function makePath() {
      var p = { pathPoints: [], closed: false, filled: true, stroked: false, strokeWidth: 0, strokeDashes: null,
        setEntirePath(pts) { p.pathPoints = pts.map((a) => ({ anchor: a, leftDirection: a, rightDirection: a, pointType: null })); } };
      return p;
    }
  `;
  const api = new Function("app", "PointType", "StrokeCap", "StrokeJoin", "DocumentColorSpace", "CMYKColor", "RGBColor",
    prelude + body + `
    ${Object.keys(s).map((k) => `${k} = ${JSON.stringify(s[k])};`).join("\n")}
    return { buildModel, beginView, collectParts, collectFills, createSolid, projectModel, facingModel, splitCurve, findSilhouettes,
      makeCurvePath, paths, setState(next) { ${Object.keys(s).map((k) => `if ("${k}" in next) ${k} = next.${k};`).join(" ")} } };`
  )({ redraw() {} }, { SMOOTH: "smooth", CORNER: "corner" }, { BUTTENDCAP: 1 }, { MITERENDJOIN: 1 }, { CMYK: "CMYK" }, function () {}, function () {});
  return api;
}

function shapeIndexOf(id) {
  return ["box", "tetra", "octa", "dodeca", "icosa", "prism", "pyramid", "frustum", "cylinder", "cone", "conefrustum", "tube"].indexOf(id);
}

// 1. 다면체 위상: 꼭짓점·면·모서리 수와 모든 모서리가 면 2개를 가지는지
const topology = {
  box: { faces: 6, edges: 12, faceSize: 4 },
  tetra: { faces: 4, edges: 6, faceSize: 3 },
  octa: { faces: 8, edges: 12, faceSize: 3 },
  dodeca: { faces: 12, edges: 30, faceSize: 5 },
  icosa: { faces: 20, edges: 30, faceSize: 3 },
};
for (const id of Object.keys(topology)) {
  const engine = loadEngine({ shapeIndex: shapeIndexOf(id) });
  const model = engine.buildModel();
  const expected = topology[id];
  assert.strictEqual(model.faces.length, expected.faces, `${id}: face count`);
  assert.strictEqual(model.edges.length, expected.edges, `${id}: edge count`);
  for (const face of model.faces) {
    assert.strictEqual(face.points.length, expected.faceSize, `${id}: face vertex count`);
    // 법선은 바깥쪽 단위 벡터
    const len = Math.hypot(...face.normal);
    assert.ok(Math.abs(len - 1) < 1e-9, `${id}: unit normal`);
    const outward = face.normal[0] * face.center[0] + face.normal[1] * face.center[1] + face.normal[2] * face.center[2];
    assert.ok(outward > 0, `${id}: outward normal`);
    // 면의 모든 점이 같은 평면 위
    for (const p of face.points) {
      const d = (p[0] - face.center[0]) * face.normal[0] + (p[1] - face.center[1]) * face.normal[1] + (p[2] - face.center[2]) * face.normal[2];
      assert.ok(Math.abs(d) < 1e-6, `${id}: planar face`);
    }
  }
  for (const edge of model.edges) {
    assert.strictEqual(edge.faces.length, 2, `${id}: every edge joins two faces`);
  }
  // 정다면체는 모든 모서리 길이가 같다 (가로=세로=높이일 때)
  const lengths = model.edges.map((e) => Math.hypot(e.a[0] - e.b[0], e.a[1] - e.b[1], e.a[2] - e.b[2]));
  const spread = Math.max(...lengths) - Math.min(...lengths);
  assert.ok(spread < 1e-6, `${id}: equal edge lengths (spread ${spread})`);
}

// 2. 각기둥·각뿔·각뿔대 위상
{
  const prism = loadEngine({ shapeIndex: shapeIndexOf("prism"), sideCount: 3 }).buildModel();
  assert.strictEqual(prism.faces.length, 5, "삼각기둥 faces");
  assert.strictEqual(prism.edges.length, 9, "삼각기둥 edges");
  const pyramid = loadEngine({ shapeIndex: shapeIndexOf("pyramid"), sideCount: 4 }).buildModel();
  assert.strictEqual(pyramid.faces.length, 5, "사각뿔 faces");
  assert.strictEqual(pyramid.edges.length, 8, "사각뿔 edges");
  const frustum = loadEngine({ shapeIndex: shapeIndexOf("frustum"), sideCount: 5, topRatio: 50 }).buildModel();
  assert.strictEqual(frustum.faces.length, 7, "오각뿔대 faces");
  assert.strictEqual(frustum.edges.length, 15, "오각뿔대 edges");
  for (const edge of frustum.edges) assert.strictEqual(edge.faces.length, 2, "각뿔대 edge adjacency");
}

// 3. 정육면체 숨은선: 등각 시점에서 보이는 선 9, 숨은 선 3. 정면에서는 4 보이고 나머지 8은 면과 나란해 보이는 선으로 친다
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("box"), rotY: 45, rotX: 35.3 });
  const model = engine.buildModel();
  engine.beginView(model);
  const parts = engine.collectParts(model);
  assert.strictEqual(parts.visible.length, 9, "isometric cube visible edges");
  assert.strictEqual(parts.hidden.length, 3, "isometric cube hidden edges");

  engine.setState({ rotY: 0, rotX: 0 });
  engine.beginView(model);
  const front = engine.collectParts(model);
  assert.strictEqual(front.hidden.length, 0, "front view cube has no hidden (edge-on faces count as visible)");
  // 정면 투영에서 앞면 네 모서리가 정확히 ±10mm 사각형
  const pts = front.visible.flatMap((p) => [engine.projectModel(p.a), engine.projectModel(p.b)]);
  const half = 10 * 2.834645669;
  for (const [x, y] of pts) {
    assert.ok(Math.abs(Math.abs(x) - half) < 1e-6 && Math.abs(Math.abs(y) - half) < 1e-6, "front projection corners");
  }
}

// 4. 원기둥: 위에서 내려다보면 윗면 원은 전부 보이고 아랫면 원은 앞쪽 절반만 보인다, 실루엣 모선 2개
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("cylinder"), rotY: 0, rotX: 30 });
  const model = engine.buildModel();
  assert.strictEqual(model.curves.length, 2, "cylinder rims");
  engine.beginView(model);
  const bottomSpans = engine.splitCurve(model.curves[0]);
  const topSpans = engine.splitCurve(model.curves[1]);
  assert.strictEqual(topSpans.length, 1, "top rim one span");
  assert.strictEqual(topSpans[0].visible, true, "top rim visible");
  assert.strictEqual(topSpans[0].closed, true, "top rim closed");
  assert.strictEqual(bottomSpans.length, 2, "bottom rim split in two");
  const visibleSpan = bottomSpans.filter((s) => s.visible)[0];
  const hiddenSpan = bottomSpans.filter((s) => !s.visible)[0];
  assert.ok(visibleSpan && hiddenSpan, "bottom rim has visible + hidden halves");
  assert.ok(Math.abs((visibleSpan.t1 - visibleSpan.t0) - Math.PI) < 1e-6, "bottom rim halves are exact half circles");
  const silhouettes = engine.findSilhouettes(model.round);
  assert.strictEqual(silhouettes.length, 2, "cylinder silhouette lines");
  // 실루엣은 X = ±반지름 위치의 세로선
  for (const line of silhouettes) {
    assert.ok(Math.abs(Math.abs(line.a[0]) - 10 * 2.834645669) < 1e-6, "silhouette at ±radius");
    assert.ok(Math.abs(line.a[0] - line.b[0]) < 1e-9 && Math.abs(line.a[2] - line.b[2]) < 1e-9, "silhouette vertical");
  }
  // 아래에서 올려다보면 반대로 윗면 원이 갈라진다
  engine.setState({ rotX: -30 });
  engine.beginView(model);
  assert.strictEqual(engine.splitCurve(model.curves[0]).length, 1, "bottom rim whole from below");
  assert.strictEqual(engine.splitCurve(model.curves[1]).length, 2, "top rim split from below");
}

// 5. 원뿔: 테두리 1개, 실루엣 2개가 꼭짓점에서 만난다. 축 방향으로 보면 실루엣 없음
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("cone"), rotY: 20, rotX: 25 });
  const model = engine.buildModel();
  assert.strictEqual(model.curves.length, 1, "cone rim");
  engine.beginView(model);
  const lines = engine.findSilhouettes(model.round);
  assert.strictEqual(lines.length, 2, "cone silhouettes");
  const apexY = 10 * 2.834645669;
  for (const line of lines) {
    assert.ok(Math.abs(line.b[0]) < 1e-9 && Math.abs(line.b[1] - apexY) < 1e-9 && Math.abs(line.b[2]) < 1e-9, "silhouette ends at apex");
  }
  engine.setState({ rotY: 0, rotX: 90 });
  engine.beginView(model);
  assert.strictEqual(engine.findSilhouettes(model.round).length, 0, "no silhouette along axis");
  assert.strictEqual(engine.splitCurve(model.curves[0]).length, 1, "rim whole when seen from top");
}

// 6. 베지어 원: 정면 원기둥 윗면은 지름 20mm 원 → 앵커가 반지름 위, 핸들 길이는 원호 공식
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("cylinder"), rotY: 0, rotX: 90, heightMm: 5 });
  const model = engine.buildModel();
  engine.beginView(model);
  const path = engine.makeCurvePath(doc(), model.curves[1], 0, 2 * Math.PI, true);
  const r = 10 * 2.834645669;
  // rotX=90이면 세로축이 깊이 방향이 되므로 윗면 원의 중심은 화면 원점에 온다
  assert.strictEqual(path.pathPoints.length, 8, "full circle uses 8 segments of 45°");
  const expectedHandle = r * 4 / 3 * Math.tan(Math.PI / 16);
  for (const pt of path.pathPoints) {
    const dist = Math.hypot(pt.anchor[0], pt.anchor[1]);
    assert.ok(Math.abs(dist - r) < 1e-6, `anchor on circle (${dist} vs ${r})`);
    const handle = Math.hypot(pt.rightDirection[0] - pt.anchor[0], pt.rightDirection[1] - pt.anchor[1]);
    assert.ok(Math.abs(handle - expectedHandle) < 1e-3, `handle length ${handle} vs ${expectedHandle}`);
    assert.strictEqual(pt.pointType, "smooth");
  }
  function doc() {
    return { pathItems: { add() { const p = { pathPoints: [], setEntirePath(pts) { p.pathPoints = pts.map((a) => ({ anchor: a, leftDirection: a, rightDirection: a })); } }; return p; } } };
  }
}

// 7. createSolid: 숨은선 파선 모드에서 파선 패스가 아래(먼저 생성)에 깔린다. 그리기 실패 시 그룹을 지운다
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("box"), hiddenMode: 1 });
  const group = engine.createSolid();
  assert.ok(group && !group.removed, "group created");
  assert.strictEqual(engine.paths.length, 12, "12 cube edges drawn");
  const dashed = engine.paths.filter((p) => p.strokeDashes && p.strokeDashes.length === 2);
  assert.strictEqual(dashed.length, 3, "3 dashed hidden edges");
  assert.ok(engine.paths.slice(0, 3).every((p) => p.strokeDashes.length === 2), "hidden edges drawn first (below)");
  for (const p of engine.paths) {
    assert.strictEqual(p.filled, false);
    assert.strictEqual(p.strokeWidth, 0.3);
  }

  const none = loadEngine({ shapeIndex: shapeIndexOf("box"), hiddenMode: 0 });
  none.createSolid();
  assert.strictEqual(none.paths.length, 9, "hidden mode 0 omits hidden edges");
}

// 8. 원근: 앞쪽 점이 뒤쪽 점보다 크게 투영되고, 시점 거리가 도형 안으로 들어가지 않는다
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("box"), rotY: 0, rotX: 0, perspectiveOn: true, perspectiveMm: 50, widthMm: 200, depthMm: 200, heightMm: 200 });
  const model = engine.buildModel();
  engine.beginView(model);
  const half = 100 * 2.834645669;
  const near = engine.projectModel([half, half, half]);
  const far = engine.projectModel([half, half, -half]);
  assert.ok(near[0] > far[0] && near[1] > far[1], "perspective: near corner projects larger");
  assert.ok(isFinite(near[0]) && isFinite(far[0]), "eye distance clamped outside the solid");
}

// 9. 설정 저장/복원: 필드 수와 범위 검증
{
  // 공통 항목(탭·시점·선과 면·위치) 뒤에 엔진 항목이 순서대로 붙는다. 입체 도형 엔진의 restoreFields도 같이 평가한다
  const applySaved = source.slice(source.indexOf("function applySavedSettings("), source.indexOf("// ==== 공통 기하"));
  const engineStart = source.indexOf("function makeSolidEngine(variant) {");
  const solidRestore = source.slice(source.indexOf("function saveFields(", engineStart), source.indexOf("// ---- 그리기", engineStart));
  const run = (raw) => {
    const prelude = `
      var SIZE_STEP_MM = 0.1, MAX_SIZE_MM = 200, SIDES_MIN = 3, SIDES_MAX = 24, POSITION_LIMIT_MM = 100, HIDDEN_NONE = 0, HIDDEN_SOLID = 2, FILL_NONE = 0, FILL_LIT = 2;
      var SHAPES = new Array(12);
      var shapeIndex = 0, widthMm = 20, depthMm = 20, heightMm = 20, linkWidthDepth = true, sideCount = 6, baseRotation = 0, topRatio = 50;
      var tabIndex = 0, rotY = 45, rotX = 35.3, rotZ = 0, perspectiveOn = false, perspectiveMm = 300, hiddenMode = 1, offsetXmm = 0, offsetYmm = 0;
      var fillMode = 2, brightness = 70, contrast = 40, lightAzimuth = -35, lightElevation = 50;
      var PREF_KEY = "k";
      var extrudeFields = null;
      var angleR = 131, angleL = 109, depthPercent = 100;
      var engines = [
        { fieldCount: 8, restoreFields: function(f) { restoreFields(f); } },
        { fieldCount: 8, restoreFields: function() {} },
        { fieldCount: 2, restoreFields: function(f) { extrudeFields = f; } },
        { fieldCount: 0, restoreFields: function() {} }];
      var app = { preferences: { getStringPreference() { return ${JSON.stringify(raw)}; } } };
      function parseNumber(text) { var n = String(text).replace(/,/g, ".").replace(/\\s/g, ""); if (n === "" || n === "+" || n === "-") return null; var v = Number(n); return isNaN(v) ? null : v; }
    `;
    return new Function(prelude + applySaved + solidRestore +
      "\napplySavedSettings(); return {tabIndex, shapeIndex, widthMm, sideCount, rotX, perspectiveOn, hiddenMode, offsetYmm, linkWidthDepth, fillMode, brightness, lightAzimuth, angleL, depthPercent, extrudeFields};")();
  };
  // 공통 항목: 탭, 회전 3, 원근 2, 숨은선, 이동 2, 면 5, 관찰 각도 3
  const shared = (tab) => [tab, 45, 20, 5, 1, 400, 2, 3, -4, 1, 55, 20, 30, 60, 120, 105, 88];
  const solid2 = [0, 20, 20, 20, 1, 6, 0, 50];
  const restored = run(["v2"].concat(shared(2), [8, 30, 30, 12.5, 0, 5, 45, 70], solid2, [25, 1]).join("|"));
  assert.deepStrictEqual(restored, { tabIndex: 2, shapeIndex: 8, widthMm: 30, sideCount: 5, rotX: 20, perspectiveOn: true, hiddenMode: 2, offsetYmm: -4,
    linkWidthDepth: false, fillMode: 1, brightness: 55, lightAzimuth: 30, angleL: 105, depthPercent: 88, extrudeFields: ["25", "1"] });
  const badVersion = run(["v1"].concat([2, 45, 20, 5, 1, 400, 2, 3, -4, 1, 55, 20, 30, 60], [8, 30, 30, 12.5, 0, 5, 45, 70], [25, 1]).join("|"));
  assert.strictEqual(badVersion.shapeIndex, 0, "v1 string (before 입체 도형2) falls back to defaults");
  const outOfRange = run(["v2"].concat([7, 45, 20, 5, 0, 400, 7, 3, -4, 9, 150, 20, 200, 60, 50, 105, 300], [99, 999, 30, 12.5, 1, 2, 45, 70], solid2, [25, 0]).join("|"));
  assert.strictEqual(outOfRange.tabIndex, 0, "bad tab index ignored");
  assert.strictEqual(outOfRange.shapeIndex, 0, "bad shape index ignored");
  assert.strictEqual(outOfRange.widthMm, 20, "bad width ignored");
  assert.strictEqual(outOfRange.sideCount, 6, "bad side count ignored");
  assert.strictEqual(outOfRange.hiddenMode, 1, "bad hidden mode ignored");
  assert.strictEqual(outOfRange.fillMode, 2, "bad fill mode ignored");
  assert.strictEqual(outOfRange.brightness, 70, "bad brightness ignored");
  assert.strictEqual(outOfRange.lightAzimuth, -35, "bad light azimuth ignored");
  assert.strictEqual(outOfRange.angleL, 105, "angle in range restored");
  assert.strictEqual(outOfRange.depthPercent, 100, "bad depth ignored");
  const shortString = run("v1|1|2");
  assert.strictEqual(shortString.shapeIndex, 0, "short string ignored");
  const saveFields = source.match(/var parts = \["v2", tabIndex[^\]]*\]/)[0].split(",").length;
  assert.strictEqual(saveFields, 18, "shared save/restore field count matches");
}

// 11. 면 음영: 등각 정육면체는 윗면 < 왼쪽 앞면 < 오른쪽 옆면 순으로 K가 커진다 (왼쪽 위 광원)
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("box"), rotY: 45, rotX: 35.3, fillMode: 2 });
  const model = engine.buildModel();
  engine.beginView(model);
  const fills = engine.collectFills(model);
  assert.strictEqual(fills.length, 3, "three lit faces on an isometric cube");
  const byNormal = (nx, ny, nz) => fills.find((f) => {
    const face = model.faces.find((mf) => mf.points === f.points);
    return Math.abs(face.normal[0] - nx) < 1e-9 && Math.abs(face.normal[1] - ny) < 1e-9 && Math.abs(face.normal[2] - nz) < 1e-9;
  });
  const top = byNormal(0, 1, 0), front = byNormal(0, 0, 1), left = byNormal(-1, 0, 0);
  assert.ok(top && front && left, "top, front and left faces are filled");
  // rotY=45로 돌리면 -X면이 화면 왼쪽 앞, +Z면이 오른쪽 앞에 온다
  assert.ok(top.k < left.k && left.k < front.k, `K order top(${top.k}) < left-front(${left.k}) < right-side(${front.k})`);
  assert.ok(top.k >= 0 && front.k <= 100, "K within range");

  // 밝기를 올리면 K가 내려가고, 대비 0이면 모두 같은 K
  engine.setState({ brightness: 90 });
  const brighter = engine.collectFills(model);
  assert.ok(brighter.every((f, i) => f.k < fills[i].k), "brightness lowers K");
  engine.setState({ brightness: 70, contrast: 0 });
  const flatByContrast = engine.collectFills(model);
  assert.ok(flatByContrast.every((f) => f.k === 30), "zero contrast gives mid K everywhere");
  // 단일 음영도 같은 값
  engine.setState({ contrast: 40, fillMode: 1 });
  assert.ok(engine.collectFills(model).every((f) => f.k === 30), "flat mode uses mid K");
  // 광원을 오른쪽으로 옮기면 좌우가 뒤집힌다
  engine.setState({ fillMode: 2, lightAzimuth: 35 });
  const rightLit = engine.collectFills(model);
  const rTop = rightLit.find((f) => f.points === top.points), rLeft = rightLit.find((f) => f.points === left.points), rFront = rightLit.find((f) => f.points === front.points);
  assert.ok(rTop.k < rFront.k && rFront.k < rLeft.k, "right light flips the side order");
}

// 12. 면 그룹 구조: 면 → 선 순서로 하위 그룹이 만들어지고, 면 패스는 선 없이 채워진다
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("box"), fillMode: 2, hiddenMode: 1 });
  const group = engine.createSolid();
  assert.strictEqual(group.groups.length, 2, "면·선 subgroups");
  assert.strictEqual(group.groups[0].name, "면");
  assert.strictEqual(group.groups[1].name, "선");
  const fillPaths = engine.paths.filter((p) => p.group === group.groups[0]);
  const linePaths = engine.paths.filter((p) => p.group === group.groups[1]);
  assert.strictEqual(fillPaths.length, 3, "3 filled faces");
  assert.strictEqual(linePaths.length, 12, "12 edges");
  for (const p of fillPaths) {
    assert.strictEqual(p.filled, true);
    assert.strictEqual(p.stroked, false);
    assert.strictEqual(p.closed, true);
    assert.strictEqual(p.pathPoints.length, 4);
  }
  const noFill = loadEngine({ shapeIndex: shapeIndexOf("box"), fillMode: 0 });
  const plain = noFill.createSolid();
  assert.strictEqual(plain.groups.length, 1, "no fill → only 선 subgroup");
}

// 13. 곡면 채우기: 위에서 본 원기둥은 옆면 윤곽 + 윗면 뚜껑, 원뿔은 밑면 호 + 꼭짓점 윤곽
{
  const engine = loadEngine({ shapeIndex: shapeIndexOf("cylinder"), rotY: 0, rotX: 30, fillMode: 2, heightMm: 30 });
  const model = engine.buildModel();
  engine.beginView(model);
  const fills = engine.collectFills(model);
  assert.deepStrictEqual(fills.map((f) => f.kind), ["outline", "cap"], "cylinder from above: lateral + top cap");
  assert.ok(fills[1].k < fills[0].k, "top cap brighter than lateral");
  engine.createSolid();
  const outline = engine.paths.find((p) => p.filled && p.pathPoints.length > 8);
  assert.ok(outline, "lateral outline path");
  // 윤곽은 아래 반원 호(5 앵커) + 위 반원 호(5 앵커), 이음점은 합쳐져 총 10개
  assert.strictEqual(outline.pathPoints.length, 10, "outline anchor count");
  const corners = outline.pathPoints.filter((pt) => pt.pointType === "corner");
  assert.strictEqual(corners.length, 4, "four corner points where arcs meet silhouettes");
  // 위아래 호의 끝점 X는 ±반지름 (실루엣 위치)
  const r = 10 * 2.834645669;
  for (const pt of corners) assert.ok(Math.abs(Math.abs(pt.anchor[0]) - r) < 1e-6, "corner at silhouette x");

  const cone = loadEngine({ shapeIndex: shapeIndexOf("cone"), rotY: 0, rotX: 25, fillMode: 2, heightMm: 30 });
  const coneModel = cone.buildModel();
  cone.beginView(coneModel);
  const coneFills = cone.collectFills(coneModel);
  assert.deepStrictEqual(coneFills.map((f) => f.kind), ["outline"], "cone from above: lateral only (base hidden)");
  cone.createSolid();
  const coneOutline = cone.paths.find((p) => p.filled);
  // 위에서 본 원뿔은 옆면이 반원보다 넓게 보이므로 호가 5구간(6 앵커) + 꼭짓점
  assert.strictEqual(coneOutline.pathPoints.length, 7, "cone outline: 6 arc anchors + apex");
  const apexes = coneOutline.pathPoints.filter((pt) => Math.abs(pt.anchor[0]) < 1e-6 && pt.anchor[1] > 0);
  assert.strictEqual(apexes.length, 1, "apex appears once");
  assert.strictEqual(apexes[0].pointType, "corner", "apex is a corner point");
  assert.strictEqual(coneOutline.pathPoints.filter((pt) => pt.pointType === "corner").length, 3, "apex + two arc ends are corners");

  const below = loadEngine({ shapeIndex: shapeIndexOf("cone"), rotY: 0, rotX: -90, fillMode: 2 });
  const belowModel = below.buildModel();
  below.beginView(belowModel);
  assert.deepStrictEqual(below.collectFills(belowModel).map((f) => f.kind), ["cap"], "cone from straight below: base cap only");

  const above = loadEngine({ shapeIndex: shapeIndexOf("cone"), rotY: 0, rotX: 90, fillMode: 2 });
  const aboveModel = above.buildModel();
  above.beginView(aboveModel);
  const aboveFills = above.collectFills(aboveModel);
  assert.deepStrictEqual(aboveFills.map((f) => f.kind), ["outline"], "cone from straight above: whole lateral");
  assert.strictEqual(aboveFills[0].span.whole, true);
}

// 14. 커스텀 프리셋 문자열 파싱: 빈 칸·손상·범위 밖은 null, 정상은 복원
{
  const parsePart = source.slice(source.indexOf("function parseCustomPreset("), source.indexOf("// 위치는 도형을 다시 만들지 않고"));
  const restorePart = source.slice(source.indexOf("function restoreNumber("), source.indexOf("// ==== 공통 기하"));
  const parse = new Function(`
    function parseNumber(text) { var n = String(text).replace(/,/g, ".").replace(/\\s/g, ""); if (n === "" || n === "+" || n === "-") return null; var v = Number(n); return isNaN(v) ? null : v; }
    ${restorePart} ${parsePart} return parseCustomPreset;`)();
  assert.deepStrictEqual(parse("45,35.3,0,1,300"), { y: 45, x: 35.3, z: 0, perspective: true, distance: 300 });
  assert.strictEqual(parse(""), null, "empty slot");
  assert.strictEqual(parse("1,2"), null, "short slot");
  assert.strictEqual(parse("400,0,0,0,300"), null, "angle out of range");
  assert.strictEqual(parse("0,0,0,0,10"), null, "distance out of range");
  assert.ok(source.includes('PRESET_KEY = "Object3DLine/presets"'), "presets use their own preference key");
}

// 15. 빨대: 안쪽 테두리 가시성, 안쪽 모선 숨은선, 고리·안쪽 벽 채우기
{
  // 짧고 넓은 빨대를 위에서 보면 먼(아래) 안쪽 테두리 일부가 구멍으로 보인다
  const short = loadEngine({ shapeIndex: shapeIndexOf("tube"), rotY: 0, rotX: 60, heightMm: 10, topRatio: 80, fillMode: 2 });
  const m1 = short.buildModel();
  assert.strictEqual(m1.curves.length, 4, "outer 2 + inner 2 rims");
  short.beginView(m1);
  const innerTop = short.splitCurve(m1.curves[3]);
  assert.strictEqual(innerTop.length, 1, "inner top rim whole");
  assert.strictEqual(innerTop[0].visible, true, "inner top rim visible from above");
  const innerBottom = short.splitCurve(m1.curves[2]);
  assert.strictEqual(innerBottom.length, 2, "inner bottom rim split: crescent + hidden");
  const crescent = innerBottom.find((sp) => sp.visible);
  assert.ok(crescent && crescent.t1 - crescent.t0 < Math.PI, "visible crescent is less than half the rim");
  // 보이는 초승달의 중간점은 뒤쪽(-Z)에 있다
  const mid = m1.curves[2].pointAt((crescent.t0 + crescent.t1) / 2);
  assert.ok(mid[2] < 0, "crescent lies on the far side");
  const parts = short.collectParts(m1);
  const hiddenLines = parts.hidden.filter((p) => p.kind === "line");
  assert.strictEqual(hiddenLines.length, 2, "two hidden inner silhouette lines");
  for (const line of hiddenLines) assert.ok(Math.abs(Math.abs(line.a[0]) - 8 * 2.834645669) < 1e-6, "inner silhouette at ±inner radius");
  const fills = short.collectFills(m1);
  assert.deepStrictEqual(fills.map((f) => f.kind), ["outline", "annulus", "segments"], "lateral + ring + inner-wall region");
  short.createSolid();
  const fillGroup = short.paths[0].group;
  const compound = fillGroup.groups.find((g) => g.compound);
  assert.ok(compound, "annulus drawn as a compound path");
  const ringPaths = short.paths.filter((p) => p.group === compound);
  assert.strictEqual(ringPaths.length, 2, "ring = outer + inner ellipse");
  assert.ok(ringPaths.every((p) => p.evenodd === true && p.filled && !p.stroked), "ring uses even-odd fill");
  const cornerCount = (p) => p.pathPoints.filter((pt) => pt.pointType === "corner").length;
  const wall = short.paths.find((p) => p.filled && p.group === fillGroup && cornerCount(p) === 2);
  assert.ok(wall, "inner wall region path with exactly two corner joins (near arc ↔ far crescent)");
  const lateral = short.paths.find((p) => p.filled && p.group === fillGroup && cornerCount(p) === 4);
  assert.ok(lateral, "lateral outline still has four corners");

  // 길고 좁은 빨대: 아래 안쪽 테두리는 전부 숨고, 안쪽 원 전체가 벽
  const tall = loadEngine({ shapeIndex: shapeIndexOf("tube"), rotY: 0, rotX: 20, heightMm: 60, topRatio: 60, fillMode: 2 });
  const m2 = tall.buildModel();
  tall.beginView(m2);
  const tallBottom = tall.splitCurve(m2.curves[2]);
  assert.strictEqual(tallBottom.length, 1);
  assert.strictEqual(tallBottom[0].visible, false, "far inner rim fully hidden in a tall tube");
  assert.deepStrictEqual(tall.collectFills(m2).map((f) => f.kind), ["outline", "annulus", "cap"], "whole inner ellipse filled as wall");

  // 축 방향으로 내려다보면 구멍이 그대로 뚫려 보인다: 벽 채우기 없음
  const axis = loadEngine({ shapeIndex: shapeIndexOf("tube"), rotY: 0, rotX: 90, heightMm: 30, topRatio: 60, fillMode: 2 });
  const m3 = axis.buildModel();
  axis.beginView(m3);
  assert.deepStrictEqual(axis.collectFills(m3).map((f) => f.kind), ["annulus"], "straight down: ring only");

  // 옆에서 보면 안쪽 테두리는 모두 숨은선
  const side = loadEngine({ shapeIndex: shapeIndexOf("tube"), rotY: 0, rotX: 0, heightMm: 30, topRatio: 60 });
  const m4 = side.buildModel();
  side.beginView(m4);
  assert.strictEqual(side.splitCurve(m4.curves[2])[0].visible, false, "side view: inner bottom rim hidden");
  assert.strictEqual(side.splitCurve(m4.curves[3])[0].visible, false, "side view: inner top rim hidden");

  // 아래에서 올려다보면 대칭: 아래 안쪽 테두리 전부 보이고 위 안쪽 테두리에 초승달
  const below = loadEngine({ shapeIndex: shapeIndexOf("tube"), rotY: 0, rotX: -60, heightMm: 10, topRatio: 80, fillMode: 2 });
  const m5 = below.buildModel();
  below.beginView(m5);
  assert.strictEqual(below.splitCurve(m5.curves[2])[0].visible, true, "from below: inner bottom rim whole");
  assert.strictEqual(below.splitCurve(m5.curves[3]).length, 2, "from below: inner top rim split");
  assert.deepStrictEqual(below.collectFills(m5).map((f) => f.kind), ["outline", "annulus", "segments"]);
}

// 10. 필수 규칙: 메모 조각, 탭 헬퍼, 기본 버튼 제거, 미리보기 체크박스, 위치 이동 행
assert.ok(source.includes("illu_last_script.txt"), "last-script memo");
assert.ok(source.includes("ui_tab_helper.jsxinc"), "tab helper loader");
assert.ok(source.includes("bindTabOrder(win)"), "tab order bound before show");
assert.ok(source.includes("win.defaultElement = null"), "no default button");
assert.ok(/"미리보기"/.test(source), "preview checkbox");
assert.ok(source.includes("가로 이동 (mm)") && source.includes("세로 이동 (mm)"), "position rows");

console.log("check-solid3d: ok");
