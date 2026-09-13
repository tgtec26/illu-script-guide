const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const file = "스크립트/01_도형/Object_Revolve3D.jsx";
const source = fs.readFileSync(path.join(root, file), "utf8");

// 단면 펴기부터 끝까지(기하·그리기 함수)를 잘라내 상태 변수와 함께 평가한다
function loadEngine(state) {
  const start = source.indexOf("// ---- 단면 펴기");
  const end = source.lastIndexOf("})();");
  assert.ok(start > 0 && end > start, "engine section not found");
  const body = source.slice(start, end);
  const defaults = {
    rotX: 35.3, rotZ: 0, perspectiveOn: false, perspectiveMm: 300, hiddenMode: 1,
    originX: 0, originY: 0, axisAngle: Math.PI / 2, profilePoints: [], profileClosed: true,
  };
  const s = Object.assign({}, defaults, state);
  const prelude = `
    var MM_TO_PT = 2.834645669, LINE_WIDTH_PT = 0.3, HIDDEN_DASH = [2, 1];
    var CURVE_PIECES = 12, CORNER_COS = Math.cos(2 * Math.PI / 180), CURVE_SAMPLES = 144;
    var MAX_ARC_SPAN = Math.PI / 4, SMALL_ARC = 0.5, AXIS_EPSILON = 0.01, RAY_LIFT = 1e-4, PROBE_STEP = 1e-4, MIN_SPAN_PT = 1.5, LOCAL_FACETS = 3;
    var HIDDEN_NONE = 0, HIDDEN_DASHED = 1, HIDDEN_SOLID = 2;
    ${Object.keys(s).map((k) => `var ${k} = ${JSON.stringify(s[k])};`).join("\n")}
    var viewMatrix = null, eyeZ = 0, strokeColor = null;
    var paths = [];
    var doc = { groupItems: { add() { return makeGroup(); } }, documentColorSpace: "CMYK" };
    function makeGroup() {
      var group = { removed: false, name: "",
        pathItems: { add() { var p = makePath(); p.group = group; paths.push(p); return p; } },
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
    return { flattenProfile, buildModel, beginView, collectParts, createSolid, projectModel, occluded, silhouetteRoots,
      findSilhouettes, locallyHidden, jointNormal, outwardNormal, viewDirectionAt, probeInside, chainCurve, splitCurve, mergeShortSpans, spanScreenLength, insideProfile, paths, setState(next) { ${Object.keys(s).map((k) => `if ("${k}" in next) ${k} = next.${k};`).join(" ")} } };`
  )({ redraw() {} }, { SMOOTH: "smooth", CORNER: "corner" }, { BUTTENDCAP: 1 }, { MITERENDJOIN: 1 }, { CMYK: "CMYK" }, function () {}, function () {});
  return api;
}

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 축 좌표 [r, y]의 앵커. 핸들이 없으면 앵커와 같다
const corner = (r, y) => ({ anchor: [r, y], left: [r, y], right: [r, y] });
// 원: 앵커 4개, 핸들 길이 k·R (일러스트레이터 원과 같은 구성)
function circleAnchors(cx, cy, R) {
  const k = 0.5522847498 * R;
  return [
    { anchor: [cx + R, cy], left: [cx + R, cy - k], right: [cx + R, cy + k] },
    { anchor: [cx, cy + R], left: [cx + k, cy + R], right: [cx - k, cy + R] },
    { anchor: [cx - R, cy], left: [cx - R, cy + k], right: [cx - R, cy - k] },
    { anchor: [cx, cy - R], left: [cx - k, cy - R], right: [cx + k, cy - R] },
  ];
}

// 1. 단면 펴기: 사각형은 모서리 4개, 원은 매끄러운 점 48개, 축을 가로지르면 오류, 왼쪽에 있으면 r을 뒤집는다
{
  const engine = loadEngine({});
  const rect = engine.flattenProfile([corner(0, -15), corner(20, -15), corner(20, 15), corner(0, 15)], true);
  assert.ok(!rect.error);
  assert.strictEqual(rect.points.length, 4);
  assert.ok(rect.points.every((p) => p.corner), "rect: every anchor is a corner");
  assert.ok(near(rect.yMid, 0));

  const circle = engine.flattenProfile(circleAnchors(25, 0, 10), true);
  assert.strictEqual(circle.points.length, 48);
  assert.ok(circle.points.every((p) => !p.corner), "circle: no corners");
  assert.ok(circle.points.every((p) => near(Math.hypot(p.r - 25, p.y), 10, 0.05)), "circle: points on the circle");

  const crossing = engine.flattenProfile([corner(-5, -10), corner(10, -10), corner(10, 10), corner(-5, 10)], true);
  assert.ok(crossing.error, "profile crossing the axis is rejected");

  const leftSide = engine.flattenProfile([corner(-20, 0), corner(-20, 30), corner(0, 30), corner(0, 0)], true);
  assert.ok(!leftSide.error);
  assert.ok(leftSide.points.every((p) => p.r >= 0), "left-side profile is mirrored to r >= 0");
  assert.ok(near(leftSide.yMid, 15));
  assert.ok(leftSide.points.every((p) => Math.abs(p.y) <= 15 + 1e-9), "y is centered on the profile");

  // 직선과 곡선이 접선을 공유하면(둥근 사각형) 모서리가 아니다
  const k = 0.5522847498 * 5;
  const rounded = engine.flattenProfile([
    corner(0, -10), corner(15, -10),
    { anchor: [20, -5], left: [20, -5 - k], right: [20, -5] },
    { anchor: [20, 5], left: [20, 5], right: [20, 5 + k] },
    corner(15, 10), corner(0, 10),
  ], true);
  assert.strictEqual(rounded.points.filter((p) => p.corner).length, 4, "rounded rect: only the 4 sharp corners");
}

// 2. 원기둥 (사각형 + 접한 축): 축 위 변은 버리고 테두리 원 2개, 정면에서 실루엣 모선 2개가 x = ±R
{
  const engine = loadEngine({ rotX: 0 });
  const rect = engine.flattenProfile([corner(0, -15), corner(20, -15), corner(20, 15), corner(0, 15)], true);
  engine.setState({ profilePoints: rect.points });
  const model = engine.buildModel();
  assert.strictEqual(model.segments.length, 3, "axis-side edge is dropped");
  assert.strictEqual(model.rims.length, 2);
  engine.beginView(model);
  const chains = engine.findSilhouettes(model);
  assert.strictEqual(chains.length, 2, "cylinder: two silhouette generators");
  for (const chain of chains) {
    assert.strictEqual(chain.steps.length, 1);
    assert.strictEqual(chain.steps[0].kind, "line");
    assert.ok(!chain.closed);
  }
  const xs = chains.map((c) => engine.projectModel(c.steps[0].seg.r0 === 20
    ? [20 * Math.cos(c.steps[0].t), 0, 20 * Math.sin(c.steps[0].t)]
    : [20 * Math.cos(c.steps[0].t), 0, 20 * Math.sin(c.steps[0].t)])[0]).sort((a, b) => a - b);
  assert.ok(near(xs[0], -20, 1e-6) && near(xs[1], 20, 1e-6), `generators at x = ±20, got ${xs}`);

  // 정면: 모선은 전부 보이고, 테두리 원은 옆에서 본 원판이라 한 줄로 겹친다 (Solid3D처럼 전부 보이는 선으로)
  const parts = engine.collectParts(model);
  const visibleChains = parts.visible.filter((p) => p.kind === "chain");
  const hiddenChains = parts.hidden.filter((p) => p.kind === "chain");
  assert.strictEqual(visibleChains.length, 2);
  assert.strictEqual(hiddenChains.length, 0);
  const visibleArcs = parts.visible.filter((p) => p.kind === "arc");
  assert.strictEqual(visibleArcs.length, 2);
  assert.ok(visibleArcs.every((a) => a.closed));
  assert.strictEqual(parts.hidden.length, 0);

  // 살짝만 위에서 보면 윗면 원은 전부, 아랫면 원은 앞 반만 보인다
  engine.setState({ rotX: 1 });
  engine.beginView(model);
  const tilted = engine.collectParts(model);
  const tiltedVisible = tilted.visible.filter((p) => p.kind === "arc");
  const tiltedHidden = tilted.hidden.filter((p) => p.kind === "arc");
  assert.strictEqual(tiltedVisible.length, 2);
  assert.strictEqual(tiltedHidden.length, 1);
  assert.ok(near(tiltedHidden[0].t1 - tiltedHidden[0].t0, Math.PI, 0.05), "about half of the bottom rim");
}

// 3. 원기둥을 위에서 30° 내려다보면 윗면 원은 전부 보이고 아랫면 원은 앞 반만 보인다
{
  const engine = loadEngine({ rotX: 30 });
  const rect = engine.flattenProfile([corner(0, -15), corner(20, -15), corner(20, 15), corner(0, 15)], true);
  engine.setState({ profilePoints: rect.points });
  const model = engine.buildModel();
  engine.beginView(model);
  const parts = engine.collectParts(model);
  const topVisible = parts.visible.filter((p) => p.kind === "arc" && p.closed);
  assert.strictEqual(topVisible.length, 1, "top rim fully visible");
  assert.ok(near(topVisible[0].curve.pointAt(0)[1], 15), "the closed visible rim is the top one");
  const bottomHidden = parts.hidden.filter((p) => p.kind === "arc");
  assert.strictEqual(bottomHidden.length, 1);
  assert.ok(near(bottomHidden[0].curve.pointAt(0)[1], -15));
  assert.ok(bottomHidden[0].t1 - bottomHidden[0].t0 < Math.PI, "hidden part of the bottom rim is less than half");

  const group = engine.createSolid();
  assert.ok(group !== null);
  assert.ok(engine.paths.length >= 5);
  assert.ok(engine.paths.every((p) => p.stroked && !p.filled && p.strokeWidth === 0.3));
  const dashed = engine.paths.filter((p) => p.strokeDashes.length === 2);
  assert.strictEqual(dashed.length, 1, "one dashed path (hidden bottom arc)");
}

// 4. 도넛 (원 + 떨어진 축): 낮은 각도로 보면 실루엣 고리 2개(바깥·안쪽), 안쪽 고리는 먼 쪽이 가까운 몸통에 가려 숨은선이 생긴다
{
  const engine = loadEngine({ rotX: 20 });
  const circle = engine.flattenProfile(circleAnchors(25, 0, 10), true);
  engine.setState({ profilePoints: circle.points });
  const model = engine.buildModel();
  assert.strictEqual(model.rims.length, 0, "smooth profile has no rims");
  assert.strictEqual(model.segments.length, 48);
  engine.beginView(model);
  const chains = engine.findSilhouettes(model);
  assert.strictEqual(chains.length, 2, `torus: outer and inner loops, got ${chains.length}`);
  assert.ok(chains.every((c) => c.closed), "both loops are closed");
  const parts = engine.collectParts(model);
  const hiddenChains = parts.hidden.filter((p) => p.kind === "chain");
  const visibleChains = parts.visible.filter((p) => p.kind === "chain" && !p.closed);
  assert.ok(hiddenChains.length >= 1, "the far side of the inner loop is hidden");
  assert.ok(visibleChains.length >= 1, "the near arc of the inner loop is visible");
  assert.ok(parts.visible.some((p) => p.kind === "chain" && p.closed), "outer loop fully visible");
  const group = engine.createSolid();
  assert.ok(group !== null);
  assert.strictEqual(engine.paths.length, 1 + hiddenChains.length + visibleChains.length);

  // 35° 위에서 보면 구멍이 렌즈 모양으로 보인다: 안쪽 고리는 렌즈 양끝(첨점) 너머 접힌 짧은 부분만 숨는다
  engine.setState({ rotX: 35.3 });
  engine.beginView(model);
  const isoParts = engine.collectParts(model);
  const isoHidden = isoParts.hidden.filter((p) => p.kind === "chain");
  assert.strictEqual(isoHidden.length, 2, "one folded-back stretch at each lens tip");
  for (const span of isoHidden) assert.ok(engine.spanScreenLength(span.curve, span) < 6, "folded stretch is short on screen");
  assert.strictEqual(isoParts.visible.filter((p) => p.kind === "chain").length, 3, "outer loop + two visible inner arcs");
}

// 5. 도넛을 정확히 축 방향에서 보면 실루엣은 적도 링(바깥·안쪽) 두 개의 온전한 원
{
  const engine = loadEngine({ rotX: 90 });
  const circle = engine.flattenProfile(circleAnchors(25, 0, 10), true);
  engine.setState({ profilePoints: circle.points });
  const model = engine.buildModel();
  engine.beginView(model);
  const chains = engine.findSilhouettes(model);
  assert.strictEqual(chains.length, 2);
  const radii = chains.map((c) => c.steps[0].r).sort((a, b) => a - b);
  assert.ok(chains.every((c) => c.steps.length === 1 && c.steps[0].kind === "arc" && c.steps[0].full));
  assert.ok(near(radii[0], 15, 1e-6) && near(radii[1], 35, 1e-6), `equator rings 15/35, got ${radii}`);
  const parts = engine.collectParts(model);
  assert.strictEqual(parts.hidden.length, 0, "top view: nothing hidden");
  assert.strictEqual(parts.visible.length, 2);
  const group = engine.createSolid();
  assert.strictEqual(engine.paths.length, 2);
  assert.ok(engine.paths.every((p) => p.closed && p.pathPoints.length >= 8));
}

// 6. 광선 교차(닫힌 단면): 속으로 들어가는 면만 센다. 뒤쪽 점은 벽을 뚫고 들어가 숨고, 속에서 나오기만 하는 광선은 가림이 아니다
{
  const engine = loadEngine({ rotX: 0 });
  const rect = engine.flattenProfile([corner(0, -15), corner(20, -15), corner(20, 15), corner(0, 15)], true);
  engine.setState({ profilePoints: rect.points });
  const model = engine.buildModel();
  engine.beginView(model);
  const zero = [0, 0, 0];
  assert.strictEqual(engine.occluded(model, [0, 0, -25], zero), true, "behind the wall is hidden");
  assert.strictEqual(engine.occluded(model, [0, 0, 25], zero), false, "in front of the wall is visible");
  assert.strictEqual(engine.occluded(model, [0, 30, 0], zero), false, "above the solid is visible");
  assert.strictEqual(engine.occluded(model, [10, 0, 0], zero), false, "leaving the solid is not an occlusion");
  assert.strictEqual(engine.occluded(model, [20, 0, 0], zero), false, "grazing the wall is not an occlusion");
  // 모서리 점: 뒤쪽 테두리는 한 발 내디디면 속, 앞쪽은 밖
  engine.setState({ rotX: 30 });
  engine.beginView(model);
  const up = Math.SQRT1_2;
  assert.strictEqual(engine.probeInside(model, [0, -15, -20], [0, -up, -up]), true, "back bottom rim point steps into the solid");
  assert.strictEqual(engine.probeInside(model, [0, -15, 20], [0, -up, up]), false, "front bottom rim point steps into the air");
  assert.strictEqual(engine.probeInside(model, [0, 15, -20], [0, up, -up]), false, "back top rim point seen from above is in the air");
  engine.setState({ rotX: 90 });
  engine.beginView(model);
  assert.strictEqual(engine.occluded(model, [10, -20, 0], zero), true, "below the solid, seen from the top, is hidden");
  assert.strictEqual(engine.occluded(model, [10, 20, 0], zero), false, "above the solid, seen from the top, is visible");
  // 열린 껍질은 아무 면이나 만나면 가림
  engine.setState({ profileClosed: false, profilePoints: engine.flattenProfile([corner(20, -15), corner(20, 15)], false).points });
  const shell = engine.buildModel();
  engine.setState({ rotX: 0 });
  engine.beginView(shell);
  assert.strictEqual(engine.occluded(shell, [0, 0, -25], [0, 0, -1]), true, "behind the open cylinder shell is hidden");
  assert.strictEqual(engine.occluded(shell, [0, 0, 0], zero), true, "inside the open shell is hidden by the far wall");
}

// 7. 원근에서도 실루엣 t는 두 개이고 모선은 만들어진다
{
  const engine = loadEngine({ rotX: 20, perspectiveOn: true, perspectiveMm: 100 });
  const rect = engine.flattenProfile([corner(0, -15), corner(20, -15), corner(20, 15), corner(0, 15)], true);
  engine.setState({ profilePoints: rect.points });
  const model = engine.buildModel();
  engine.beginView(model);
  const wall = model.segments.filter((s) => s.r0 === 20 && s.r1 === 20)[0];
  const roots = engine.silhouetteRoots(wall);
  assert.strictEqual(roots.length, 2);
  const chains = engine.findSilhouettes(model);
  assert.strictEqual(chains.length, 2);
  const group = engine.createSolid();
  assert.ok(group !== null && engine.paths.length >= 4);
}

// 8. 열린 단면(비스듬한 선)은 원뿔 껍질: 양끝 테두리 원 + 모선 2개
{
  const engine = loadEngine({ rotX: 20 });
  const line = engine.flattenProfile([corner(5, 20), corner(20, -20)], false);
  engine.setState({ profilePoints: line.points, profileClosed: false });
  const model = engine.buildModel();
  assert.strictEqual(model.segments.length, 1);
  assert.strictEqual(model.rims.length, 2);
  engine.beginView(model);
  const chains = engine.findSilhouettes(model);
  assert.strictEqual(chains.length, 2);
  engine.createSolid();
  assert.ok(engine.paths.length >= 4);
}

// 9. 축을 기울여 그려도 시점 0에서는 문서에 그린 방향 그대로 나온다 (축 방향 = 모델 Y가 문서의 축 방향으로 투영)
{
  const angle = Math.PI / 6;
  const engine = loadEngine({ rotX: 0, rotZ: 0, axisAngle: angle });
  const rect = engine.flattenProfile([corner(0, -15), corner(20, -15), corner(20, 15), corner(0, 15)], true);
  engine.setState({ profilePoints: rect.points });
  const model = engine.buildModel();
  engine.beginView(model);
  const top = engine.projectModel([0, 15, 0]);
  assert.ok(near(top[0], 15 * Math.cos(angle)) && near(top[1], 15 * Math.sin(angle)), `axis direction kept: ${top}`);
}

console.log("check-revolve3d: ok");
