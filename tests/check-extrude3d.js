const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const file = "스크립트/01_도형/Object_Extrude3D.jsx";
const source = fs.readFileSync(path.join(root, file), "utf8");

// 테두리 펴기부터 끝까지(기하·그리기 함수)를 잘라내 상태 변수와 함께 평가한다
function loadEngine(state) {
  const start = source.indexOf("// ---- 테두리 펴기");
  const end = source.lastIndexOf("})();");
  assert.ok(start > 0 && end > start, "engine section not found");
  const body = source.slice(start, end);
  const defaults = {
    depthMm: 20, rotY: 0, rotX: 0, rotZ: 0, perspectiveOn: false, perspectiveMm: 300, hiddenMode: 1,
    fillMode: 0, brightness: 70, contrast: 40, lightAzimuth: -35, lightElevation: 50,
    originX: 0, originY: 0, contours: [], solidClosed: true,
  };
  const s = Object.assign({}, defaults, state);
  const prelude = `
    var MM_TO_PT = 2.834645669, LINE_WIDTH_PT = 0.3, HIDDEN_DASH = [2, 1];
    var CURVE_PIECES = 12, CORNER_COS = Math.cos(2 * Math.PI / 180), CURVE_SAMPLES_PER_SEG = 12, CURVE_SAMPLES_MIN = 96, CURVE_SAMPLES_MAX = 480, RULING_SAMPLES = 96, CROSSING_STEPS = 12;
    var CAP_DEPTH_BIAS = 1e9, RAY_LIFT = 1e-4, PROBE_STEP = 1e-4, MIN_SPAN_PT = 1.5;
    var FACING_EPSILON = 1e-9, FILL_OVERLAP_PT = 0.15;
    var FILL_NONE = 0, FILL_FLAT = 1, FILL_LIT = 2;
    var HIDDEN_NONE = 0, HIDDEN_DASHED = 1, HIDDEN_SOLID = 2;
    ${Object.keys(s).map((k) => `var ${k} = ${JSON.stringify(s[k])};`).join("\n")}
    var viewMatrix = null, eyeZ = 0, strokeColor = null;
    var setPointType = false, documentIsCmyk = true, kColorCache = {};
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
    return { prepareContours, flattenContour, polygonArea, buildModel, beginView, collectParts, collectRulings,
      collectFills, createSolid, projectModel, occluded, insideProfile, probeInside, contourCurve, rulingCurve,
      splitCurve, mergeShortSpans, normalAtU, pointAtU, facingModel, solveCubic, paths,
      setState(next) { ${Object.keys(s).map((k) => `if ("${k}" in next) ${k} = next.${k};`).join(" ")} } };`
  )({ redraw() {} }, { SMOOTH: "smooth", CORNER: "corner" }, { BUTTENDCAP: 1 }, { MITERENDJOIN: 1 }, { CMYK: "CMYK" }, function () {}, function () {});
  return api;
}

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 핸들 없는 앵커. 일러스트레이터 PathItem 흉내
const corner = (x, y) => ({ anchor: [x, y], leftDirection: [x, y], rightDirection: [x, y] });
function pathItem(points, closed = true) {
  return { typename: "PathItem", closed, pathPoints: points };
}
function rectPath(cx, cy, w, h, reverse = false) {
  const pts = [
    corner(cx - w / 2, cy - h / 2), corner(cx + w / 2, cy - h / 2),
    corner(cx + w / 2, cy + h / 2), corner(cx - w / 2, cy + h / 2),
  ];
  return pathItem(reverse ? pts.slice().reverse() : pts);
}
// 원: 앵커 4개, 핸들 길이 k·R (일러스트레이터 원과 같은 구성)
function circlePath(cx, cy, R) {
  const k = 0.5522847498 * R;
  return pathItem([
    { anchor: [cx + R, cy], leftDirection: [cx + R, cy - k], rightDirection: [cx + R, cy + k] },
    { anchor: [cx, cy + R], leftDirection: [cx + k, cy + R], rightDirection: [cx - k, cy + R] },
    { anchor: [cx - R, cy], leftDirection: [cx - R, cy + k], rightDirection: [cx - R, cy - k] },
    { anchor: [cx, cy - R], leftDirection: [cx - k, cy - R], rightDirection: [cx + k, cy - R] },
  ]);
}

function prepare(engine, items) {
  const prepared = engine.prepareContours(items);
  assert.ok(!prepared.error, prepared.error);
  engine.setState({ contours: prepared.contours, solidClosed: prepared.closed,
    originX: 0, originY: 0 });
  return prepared;
}

// 1. 테두리 읽기: 직사각형은 모서리 4개, 원은 매끄러운 점 48개, 중심은 원점으로 옮긴다
{
  const engine = loadEngine({});
  const rect = prepare(engine, [rectPath(100, 50, 40, 30)]);
  assert.strictEqual(rect.contours.length, 1);
  assert.strictEqual(rect.contours[0].points.length, 4, "직선 구간은 더 쪼개지 않는다");
  assert.ok(rect.contours[0].points.every((p) => p.corner), "직사각형: 모든 앵커가 모서리");
  assert.ok(near(rect.centerX, 100) && near(rect.centerY, 50));
  assert.ok(engine.polygonArea(rect.contours[0].points) > 0, "바깥 테두리는 반시계 방향");
  assert.strictEqual(rect.closed, true);

  // 시계 방향으로 그린 사각형도 반시계로 돌려놓는다
  const reversed = prepare(loadEngine({}), [rectPath(0, 0, 40, 30, true)]);
  assert.ok(engine.polygonArea(reversed.contours[0].points) > 0);

  const circle = prepare(loadEngine({}), [circlePath(0, 0, 10)]);
  assert.strictEqual(circle.contours[0].points.length, 48);
  assert.ok(circle.contours[0].points.every((p) => !p.corner), "원: 모서리 없음");
  assert.ok(circle.contours[0].points.every((p) => near(Math.hypot(p.x, p.y), 10, 0.05)));

  const open = prepare(loadEngine({}), [pathItem([corner(0, 0), corner(20, 0), corner(20, 20)], false)]);
  assert.strictEqual(open.closed, false, "열린 패스가 있으면 뚜껑 없는 띠");
  assert.strictEqual(open.contours[0].segCount, 2);
  assert.strictEqual(open.contours[0].points.length, 3);
}

// 2. 구멍: 큰 사각형 안의 작은 사각형은 구멍이 되고 방향이 반대가 된다
{
  const engine = loadEngine({});
  const prepared = prepare(engine, [rectPath(0, 0, 40, 40), rectPath(0, 0, 20, 20)]);
  assert.strictEqual(prepared.contours[0].hole, false);
  assert.strictEqual(prepared.contours[1].hole, true);
  assert.ok(engine.polygonArea(prepared.contours[0].points) > 0);
  assert.ok(engine.polygonArea(prepared.contours[1].points) < 0, "구멍은 시계 방향");

  // 단면 안쪽 판정: 구멍 속은 바깥이다
  const model = engine.buildModel();
  engine.beginView(model);
  assert.strictEqual(engine.insideProfile(model, 15, 0), true, "테두리와 구멍 사이는 안");
  assert.strictEqual(engine.insideProfile(model, 0, 0), false, "구멍 속은 바깥");
  assert.strictEqual(engine.insideProfile(model, 100, 0), false, "도형 밖은 바깥");
}

// 3. 원 단면의 안쪽 판정은 3차 교차로 정확히 푼다 (펴낸 다각형이 아니라 원본 곡선 기준)
{
  const engine = loadEngine({});
  prepare(engine, [circlePath(0, 0, 10)]);
  const model = engine.buildModel();
  engine.beginView(model);
  assert.strictEqual(engine.insideProfile(model, 0, 0), true);
  assert.strictEqual(engine.insideProfile(model, 9.9, 0), true, "테두리 바로 안");
  assert.strictEqual(engine.insideProfile(model, 10.1, 0), false, "테두리 바로 밖");
  assert.strictEqual(engine.insideProfile(model, 0, 9.9), true);
}

// 4. 3차방정식 풀이
{
  const engine = loadEngine({});
  const sorted = (roots) => roots.slice().sort((a, b) => a - b);
  // (t-1)(t-2)(t-3)
  let roots = sorted(engine.solveCubic(1, -6, 11, -6));
  assert.strictEqual(roots.length, 3);
  [1, 2, 3].forEach((want, i) => assert.ok(near(roots[i], want, 1e-6), `근 ${want} ≈ ${roots[i]}`));
  // 실근 하나짜리
  roots = engine.solveCubic(1, 0, 0, -8);
  assert.ok(roots.some((r) => near(r, 2, 1e-6)));
  // 2차로 내려가는 경우
  roots = sorted(engine.solveCubic(0, 1, -3, 2));
  assert.ok(near(roots[0], 1) && near(roots[1], 2));
}

// 5. 상자의 숨은선: 등각 시점에서 뒤쪽 세로 능선 하나만 숨고 뚜껑 테두리는 앞뒤가 갈린다
{
  const engine = loadEngine({ rotY: 45, rotX: 35.3, depthMm: 20 });
  prepare(engine, [rectPath(0, 0, 60, 60)]);
  const model = engine.buildModel();
  engine.beginView(model);

  const rulings = engine.collectRulings(model);
  assert.strictEqual(rulings.length, 4, "직사각형 기둥의 세로 능선은 4개");
  assert.ok(rulings.every((r) => r.corner), "모두 실제 모서리 능선");
  const hiddenRulings = rulings.filter((r) => engine.rulingCurve(model, r).visibilityAt(0.5) < 0);
  assert.strictEqual(hiddenRulings.length, 1, "등각에서 숨는 세로 능선은 뒤쪽 하나");

  const front = engine.contourCurve(model, model.contours[0], 1);
  const back = engine.contourCurve(model, model.contours[0], -1);
  assert.ok([0.5, 1.5, 2.5, 3.5].every((u) => front.visibilityAt(u) > 0), "위에서 보면 앞 뚜껑은 다 보인다");
  const backVisible = [0.5, 1.5, 2.5, 3.5].filter((u) => back.visibilityAt(u) > 0).length;
  assert.strictEqual(backVisible, 2, "뒤 뚜껑은 네 변 중 두 변만 보인다");
}

// 6. 정면에서 본 상자: 앞 뚜껑은 전부 보이고 세로 능선은 점으로 뭉개져 길이 0이다
{
  const engine = loadEngine({ rotY: 0, rotX: 0, rotZ: 0, depthMm: 20 });
  prepare(engine, [rectPath(0, 0, 40, 40)]);
  const model = engine.buildModel();
  engine.beginView(model);
  const front = engine.contourCurve(model, model.contours[0], 1);
  assert.ok([0.5, 1.5, 2.5, 3.5].every((u) => front.visibilityAt(u) > 0));
  const ruling = engine.rulingCurve(model, engine.collectRulings(model)[0]);
  const a = engine.projectModel(ruling.pointAt(0));
  const b = engine.projectModel(ruling.pointAt(1));
  assert.ok(near(a[0], b[0]) && near(a[1], b[1]), "정면에서 모선은 한 점");
}

// 7. 원기둥: 매끄러운 테두리에는 실루엣 모선 2개가 생기고, 볼록해서 둘 다 보인다
{
  const engine = loadEngine({ rotY: 20, rotX: 15, depthMm: 20 });
  prepare(engine, [circlePath(0, 0, 30)]);
  const model = engine.buildModel();
  engine.beginView(model);
  const rulings = engine.collectRulings(model);
  assert.strictEqual(rulings.length, 2, "원기둥의 실루엣 모선은 2개");
  assert.ok(rulings.every((r) => !r.corner && r.convex));
  rulings.forEach((r) => {
    // 실루엣은 법선이 시선과 직각이다
    assert.ok(Math.abs(engine.facingModel(engine.pointAtU(r.contour, r.u).concat(0), engine.normalAtU(r.contour, r.u))) < 1e-6);
    assert.ok(engine.rulingCurve(model, r).visibilityAt(0.5) > 0, "볼록한 실루엣 모선은 보인다");
  });
}

// 8. 파이프(구멍 뚫린 기둥): 구멍 벽의 실루엣은 오목해서 숨고, 뚜껑 테두리는 두 겹이다
{
  const engine = loadEngine({ rotY: 20, rotX: 25, depthMm: 20 });
  prepare(engine, [circlePath(0, 0, 30), circlePath(0, 0, 15)]);
  const model = engine.buildModel();
  engine.beginView(model);
  const rulings = engine.collectRulings(model);
  assert.strictEqual(rulings.length, 4, "바깥벽 2개 + 구멍벽 2개");
  const holeRulings = rulings.filter((r) => r.contour.hole);
  assert.strictEqual(holeRulings.length, 2);
  assert.ok(holeRulings.every((r) => !r.convex), "구멍벽 실루엣은 오목하다");
  assert.ok(holeRulings.every((r) => engine.rulingCurve(model, r).visibilityAt(0.5) < 0), "오목한 실루엣은 숨는다");
}

// 9. 구간 자르기: 등각 상자의 뒤 뚜껑 테두리는 보임/숨음으로 갈린다
{
  const engine = loadEngine({ rotY: 45, rotX: 35.3, depthMm: 20 });
  prepare(engine, [rectPath(0, 0, 60, 60)]);
  const model = engine.buildModel();
  engine.beginView(model);
  const back = engine.contourCurve(model, model.contours[0], -1);
  const spans = engine.mergeShortSpans(back, engine.splitCurve(back));
  assert.ok(spans.length >= 2, "뒤 뚜껑은 한 덩어리가 아니다");
  assert.ok(spans.some((s) => s.visible) && spans.some((s) => !s.visible));
  const total = spans.reduce((sum, s) => sum + (s.t1 - s.t0), 0);
  assert.ok(near(total, 4, 1e-3), "구간을 모두 더하면 테두리 한 바퀴");
}

// 10. 면 채우기: 먼 면부터 그리고, 뚜껑은 앞쪽 하나만 채운다
{
  const engine = loadEngine({ rotY: 30, rotX: 20, depthMm: 20, fillMode: 2 });
  prepare(engine, [rectPath(0, 0, 40, 40)]);
  const model = engine.buildModel();
  engine.beginView(model);
  const fills = engine.collectFills(model);
  const caps = fills.filter((f) => f.kind === "cap");
  const bands = fills.filter((f) => f.kind === "band");
  assert.strictEqual(caps.length, 1, "보이는 뚜껑은 하나");
  assert.strictEqual(bands.length, 2, "정육면체를 이 시점에서 보면 옆면 두 장이 보인다");
  for (let i = 1; i < fills.length; i++) assert.ok(fills[i].depth >= fills[i - 1].depth, "먼 면부터");
  assert.ok(fills.every((f) => f.k >= 0 && f.k <= 100));
  assert.ok(new Set(fills.map((f) => f.k)).size > 1, "광원 자동이면 면마다 K가 다르다");

  // 단일 음영은 모든 면이 같은 K
  engine.setState({ fillMode: 1 });
  const flat = engine.collectFills(model);
  assert.strictEqual(new Set(flat.map((f) => f.k)).size, 1);
  assert.strictEqual(flat.filter((f) => f.kind === "band").length, 1, "같은 K인 이웃 옆면은 한 장으로 합친다");
}

// 10b. 곡면 채우기: 광원 자동은 조각마다 K가 갈려 여러 장, 단일 음영은 보이는 옆면이 통째로 한 장
{
  for (const rotY of [20, 200]) {   // 200°는 보이는 반쪽이 u=0(첫 앵커)을 걸쳐 한 바퀴를 넘겨 이어야 한다
    const engine = loadEngine({ rotY, rotX: 15, depthMm: 20, fillMode: 2 });
    prepare(engine, [circlePath(0, 0, 30)]);
    const model = engine.buildModel();
    engine.beginView(model);
    const lit = engine.collectFills(model).filter((f) => f.kind === "band");
    assert.ok(lit.length > 4, "광원 자동: 원기둥 옆면은 여러 장 (" + lit.length + ")");
    assert.ok(new Set(lit.map((f) => f.k)).size > 1);
    for (let i = 1; i < lit.length; i++) assert.notStrictEqual(lit[i].k, lit[i - 1].k, "이웃 띠와 K가 같으면 이미 합쳐졌어야 한다");

    engine.setState({ fillMode: 1 });
    const flat = engine.collectFills(model).filter((f) => f.kind === "band");
    assert.strictEqual(flat.length, 1, "단일 음영: 원기둥 옆면은 한 장 (rotY " + rotY + ")");
    const span = flat[0].u1 - flat[0].u0;
    assert.ok(span > 1.5 && span < 2.5, "보이는 옆면은 반 바퀴 남짓 (" + span + ")");
    const group = engine.createSolid(false, false);
    assert.ok(group !== null);
    const fillPaths = engine.paths.filter((p) => p.filled && !p.stroked);
    assert.strictEqual(fillPaths.length, 2, "면 패스는 옆면 1 + 뚜껑 1");
    assert.ok(fillPaths.every((p) => p.closed && p.pathPoints.length >= 4));
  }
}

// 11. 통째로 그리기: 그룹이 만들어지고 패스가 남는다. 숨은선은 파선
{
  const engine = loadEngine({ rotY: 45, rotX: 35.3, depthMm: 20, fillMode: 2, hiddenMode: 1 });
  prepare(engine, [rectPath(0, 0, 40, 40)]);
  const group = engine.createSolid();
  assert.ok(group !== null && !group.removed);
  assert.ok(engine.paths.length > 0);
  const dashed = engine.paths.filter((p) => p.strokeDashes && p.strokeDashes.length === 2);
  assert.ok(dashed.length > 0, "숨은선이 파선으로 그려진다");
  assert.ok(engine.paths.some((p) => p.filled && !p.stroked), "면도 채워진다");
  assert.ok(engine.paths.every((p) => p.pathPoints.length >= 2));
}

// 12. 열린 패스(띠): 뚜껑이 없고 양끝 모선만 생긴다
{
  const engine = loadEngine({ rotY: 30, rotX: 20, depthMm: 20, fillMode: 2 });
  prepare(engine, [pathItem([corner(-20, 0), corner(0, 15), corner(20, 0)], false)]);
  const model = engine.buildModel();
  engine.beginView(model);
  assert.strictEqual(model.closed, false);
  const fills = engine.collectFills(model);
  assert.ok(fills.every((f) => f.kind === "band"), "열린 띠에는 뚜껑이 없다");
  assert.strictEqual(fills.length, 2, "꺾인 띠는 면 두 장");
  const rulings = engine.collectRulings(model);
  assert.strictEqual(rulings.length, 3, "양끝 2개 + 꺾인 곳 1개");
  assert.ok(rulings.every((r) => r.corner));
}

// 13. 경량 모드(슬라이더를 끄는 동안): 숨은선 판정 없이 모든 선이 보이는 실선, 면 없음
{
  const engine = loadEngine({ rotY: 45, rotX: 35.3, depthMm: 20, fillMode: 2, hiddenMode: 1 });
  prepare(engine, [rectPath(0, 0, 40, 40)]);
  const model = engine.buildModel();
  engine.beginView(model);
  const light = engine.collectParts(model, true);
  assert.strictEqual(light.hidden.length, 0, "경량 모드는 숨은선을 가르지 않는다");
  assert.strictEqual(light.visible.length, 2 + 4, "뚜껑 테두리 2 + 모서리 능선 4가 통째로");
  assert.ok(light.visible.every((p) => p.kind === "line" || (p.t0 === 0 && p.t1 === 4 && p.closed)), "뚜껑 테두리는 한 바퀴 통째");
  const group = engine.createSolid(true, false);
  assert.ok(group !== null && !group.removed);
  assert.ok(engine.paths.every((p) => p.stroked && !p.filled), "경량 모드에는 면이 없다");
  assert.ok(engine.paths.every((p) => !p.strokeDashes || p.strokeDashes.length === 0), "경량 모드에는 파선이 없다");
}

// 14. DOM 호출 절감: 직선 구간은 핸들을 두지 않고, 미리보기는 앵커 종류를 넣지 않는다. 확정 출력은 넣는다
{
  const engine = loadEngine({ rotY: 45, rotX: 35.3, depthMm: 20, fillMode: 2, hiddenMode: 1 });
  prepare(engine, [rectPath(0, 0, 40, 40)]);
  engine.createSolid(false, false);
  const previewPoints = engine.paths.flatMap((p) => p.pathPoints);
  assert.ok(previewPoints.length > 0);
  assert.ok(previewPoints.every((pt) => pt.leftDirection === pt.anchor && pt.rightDirection === pt.anchor), "상자는 곡선이 없어 핸들을 하나도 넣지 않는다");
  assert.ok(previewPoints.every((pt) => pt.pointType === null), "미리보기는 앵커 종류를 넣지 않는다");
  engine.paths.length = 0;
  engine.createSolid(false, true);
  // 모선(2점 직선)은 setEntirePath가 만든 모서리점 그대로 둔다. 앵커 종류는 테두리·면 패스에만 넣는다
  const finalCurvePoints = engine.paths.filter((p) => p.pathPoints.length > 2).flatMap((p) => p.pathPoints);
  assert.ok(finalCurvePoints.length > 0 && finalCurvePoints.every((pt) => pt.pointType === "corner"), "확정 출력은 앵커 종류를 넣는다");

  // 원기둥: 곡선 구간은 핸들이 들어간다
  const round = loadEngine({ rotY: 20, rotX: 15, depthMm: 20, fillMode: 0 });
  prepare(round, [circlePath(0, 0, 30)]);
  round.createSolid(false, false);
  assert.ok(round.paths.some((p) => p.pathPoints.some((pt) => pt.leftDirection !== pt.anchor)), "곡선 테두리는 핸들이 있다");
}

console.log("check-extrude3d: 통과");
