const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const file = "스크립트/01_도형/Object_Solid3D.jsx";
const source = fs.readFileSync(path.join(root, file), "utf8");

// 다이얼로그 뒤의 기하·그리기 함수 전체를 잘라내 상태 변수와 함께 평가한다
function loadEngine(state) {
  const start = source.indexOf("// ---- 그리기");
  const end = source.lastIndexOf("})();");
  assert.ok(start > 0 && end > start, "engine section not found");
  const body = source.slice(start, end);
  const defaults = {
    shapeIndex: 0, widthMm: 20, depthMm: 20, heightMm: 20, sideCount: 6, baseRotation: 0, topRatio: 50,
    rotY: 45, rotX: 35.3, rotZ: 0, perspectiveOn: false, perspectiveMm: 300, hiddenMode: 1,
    originX: 0, originY: 0,
  };
  const s = Object.assign({}, defaults, state);
  const prelude = `
    var MM_TO_PT = 2.834645669, LINE_WIDTH_PT = 0.3, HIDDEN_DASH = [2, 1];
    var CURVE_SAMPLES = 144, MAX_ARC_SPAN = Math.PI / 4, FACING_EPSILON = 1e-9;
    var HIDDEN_NONE = 0, HIDDEN_DASHED = 1, HIDDEN_SOLID = 2;
    var SHAPES = [
      {id: "box"}, {id: "tetra", regular: true}, {id: "octa", regular: true}, {id: "dodeca", regular: true}, {id: "icosa", regular: true},
      {id: "prism", sides: true}, {id: "pyramid", sides: true}, {id: "frustum", sides: true, taper: true},
      {id: "cylinder"}, {id: "cone"}, {id: "conefrustum", taper: true}];
    ${Object.keys(s).map((k) => `var ${k} = ${JSON.stringify(s[k])};`).join("\n")}
    var viewMatrix = null, eyeZ = 0, strokeColor = null;
    var paths = [];
    var doc = { groupItems: { add() { return makeGroup(); } }, documentColorSpace: "CMYK" };
    function makeGroup() {
      var group = { removed: false, pathItems: { add() { var p = makePath(); paths.push(p); return p; } }, remove() { this.removed = true; } };
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
    return { buildModel, beginView, collectParts, createSolid, projectModel, facingModel, splitCurve, findSilhouettes,
      makeCurvePath, paths, setState(next) { ${Object.keys(s).map((k) => `if ("${k}" in next) ${k} = next.${k};`).join(" ")} } };`
  )({ redraw() {} }, { SMOOTH: "smooth" }, { BUTTENDCAP: 1 }, { MITERENDJOIN: 1 }, { CMYK: "CMYK" }, function () {}, function () {});
  return api;
}

function shapeIndexOf(id) {
  return ["box", "tetra", "octa", "dodeca", "icosa", "prism", "pyramid", "frustum", "cylinder", "cone", "conefrustum"].indexOf(id);
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
  const applySaved = source.slice(source.indexOf("function applySavedSettings("), source.indexOf("// ---- 그리기"));
  const run = (raw) => {
    const prelude = `
      var SIZE_STEP_MM = 0.1, MAX_SIZE_MM = 200, POSITION_LIMIT_MM = 100, HIDDEN_NONE = 0, HIDDEN_SOLID = 2;
      var SHAPES = new Array(11);
      var shapeIndex = 0, widthMm = 20, depthMm = 20, heightMm = 20, linkWidthDepth = true, sideCount = 6, baseRotation = 0, topRatio = 50;
      var rotY = 45, rotX = 35.3, rotZ = 0, perspectiveOn = false, perspectiveMm = 300, hiddenMode = 1, offsetXmm = 0, offsetYmm = 0;
      var PREF_KEY = "k";
      var app = { preferences: { getStringPreference() { return ${JSON.stringify(raw)}; } } };
      function parseNumber(text) { var n = String(text).replace(/,/g, ".").replace(/\\s/g, ""); if (n === "" || n === "+" || n === "-") return null; var v = Number(n); return isNaN(v) ? null : v; }
    `;
    return new Function(prelude + applySaved + "\napplySavedSettings(); return {shapeIndex, widthMm, sideCount, rotX, perspectiveOn, hiddenMode, offsetYmm, linkWidthDepth};")();
  };
  const restored = run(["v1", 8, 30, 30, 12.5, 0, 5, 45, 70, 30, 20, 5, 1, 400, 2, 3, -4].join("|"));
  assert.deepStrictEqual(restored, { shapeIndex: 8, widthMm: 30, sideCount: 5, rotX: 20, perspectiveOn: true, hiddenMode: 2, offsetYmm: -4, linkWidthDepth: false });
  const badVersion = run(["v0", 8, 30, 30, 12.5, 0, 5, 45, 70, 30, 20, 5, 1, 400, 2, 3, -4].join("|"));
  assert.strictEqual(badVersion.shapeIndex, 0, "unknown version falls back to defaults");
  const outOfRange = run(["v1", 99, 999, 30, 12.5, 1, 2, 45, 70, 30, 20, 5, 0, 400, 7, 3, -4].join("|"));
  assert.strictEqual(outOfRange.shapeIndex, 0, "bad shape index ignored");
  assert.strictEqual(outOfRange.widthMm, 20, "bad width ignored");
  assert.strictEqual(outOfRange.sideCount, 6, "bad side count ignored");
  assert.strictEqual(outOfRange.hiddenMode, 1, "bad hidden mode ignored");
  const shortString = run("v1|1|2");
  assert.strictEqual(shortString.shapeIndex, 0, "short string ignored");
  const saveFields = source.match(/var parts = \["v1"[^\]]*\]/)[0].split(",").length;
  assert.strictEqual(saveFields, 17, "save/restore field count matches");
}

// 10. 필수 규칙: 메모 조각, 탭 헬퍼, 기본 버튼 제거, 미리보기 체크박스, 위치 이동 행
assert.ok(source.includes("illu_last_script.txt"), "last-script memo");
assert.ok(source.includes("ui_tab_helper.jsxinc"), "tab helper loader");
assert.ok(source.includes("bindTabOrder(win)"), "tab order bound before show");
assert.ok(source.includes("win.defaultElement = null"), "no default button");
assert.ok(/"미리보기"/.test(source), "preview checkbox");
assert.ok(source.includes("가로 이동 (mm)") && source.includes("세로 이동 (mm)"), "position rows");

console.log("check-solid3d: ok");
