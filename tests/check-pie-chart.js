const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 원그래프 탭은 Object_GraphTools.jsx 안의 makePieChartEngine에 들어 있다 (태양 스펙트럼 엔진 앞)
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_GraphTools.jsx");
const wholeSource = fs.readFileSync(scriptPath, "utf8");
const engineStart = wholeSource.indexOf("function makePieChartEngine(");
const engineEnd = wholeSource.indexOf("function makeSolarSpectrumEngine(");
assert.ok(engineStart > 0 && engineEnd > engineStart, "pie chart engine not found before the solar engine");
const source = wholeSource.slice(engineStart, engineEnd);

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

const helpers = ["sectorBounds", "rankBySize", "assignNames", "normalizeShares", "visibleWallSpans", "viewMatrixFor",
  "multiplyMatrix", "applyMatrix", "unitVector", "arc3D", "cornerPoint", "convexHull", "cross", "rayExitDistance",
  "hullExtremeXAt", "spreadRows"];
const lib = new Function(helpers.map(extractFunction).join("\n") + `\nreturn { ${helpers.join(", ")} };`)();

const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol);
const TWO_PI = Math.PI * 2;

// 호스트: 엔진 목록과 탭 라벨. 선택이 필요 없는 태양 스펙트럼 탭은 맨 뒤에 남긴다
assert.ok(wholeSource.indexOf("makeModelCurvesEngine(), makePieChartEngine(), makeSolarSpectrumEngine()]") > 0, "pie engine registered before the standalone solar tab");
assert.ok(source.indexOf('label: "원"') > 0, "tab label");
assert.ok(source.indexOf('var PREF_KEY = "ObjectPieChart/settings"') > 0, "own preference key");
// 외경 행: 선택한 원의 지름에서 시작하고 내경보다 1mm 이상 크게 유지한다. 선택에서 오는 값이라 저장하지 않는다
assert.ok(source.indexOf('addValueRow(shapePanel, "외경", "mm", outerMm, OUTER_RANGE_MM[0], OUTER_RANGE_MM[1], 0.5, 1)') > 0, "outer diameter row");
assert.ok(source.indexOf("var maxInner = Math.max(0.5, outerMm - 1);") > 0, "inner diameter capped by outer");
assert.ok(source.indexOf('var parts = ["v2", count, symbolSet, leaderMaxPercent, innerMm, spinDeg,') > 0, "outer diameter not persisted");

// 항목 경계: 12시(π/2)에서 시계 방향으로 비율만큼 줄어들고 한 바퀴에서 끝난다
const bounds = lib.sectorBounds([65, 18.5, 9.5, 3.3, 3.7, 99, 99], 5);
assert.strictEqual(bounds.length, 6);
assert.ok(near(bounds[0], Math.PI / 2));
assert.ok(near(bounds[5], Math.PI / 2 - TWO_PI));
assert.ok(near(bounds[0] - bounds[1], TWO_PI * 0.65));
for (let i = 1; i < bounds.length; i++) assert.ok(bounds[i] < bounds[i - 1], "clockwise = decreasing angle");

// 순위: 큰 비율이 0. 같으면 앞 항목이 먼저
assert.deepStrictEqual(lib.rankBySize([18.5, 65, 3.3, 9.5, 3.7], 5), [1, 0, 4, 2, 3]);
assert.deepStrictEqual(lib.rankBySize([20, 20, 60], 3), [1, 2, 0]);

// 빈 이름(공백만도)은 큰 비율부터 기호. 이미지의 예: ㉠ 65.0, 탄소 18.5, ㉡ 9.5, 질소 3.3, 기타 3.7
assert.deepStrictEqual(lib.assignNames(["", "탄소", "  ", "질소", "기타"], [65, 18.5, 9.5, 3.3, 3.7], 5, 0x3260),
  ["㉠", "탄소", "㉡", "질소", "기타"]);
assert.deepStrictEqual(lib.assignNames(["", "", ""], [10, 40, 50], 3, 0x41), ["C", "B", "A"]);
assert.deepStrictEqual(lib.assignNames(["", ""], [50, 50], 2, 0x24D0), ["ⓐ", "ⓑ"]);
// 항목 수 밖의 이름은 무시한다
assert.deepStrictEqual(lib.assignNames(["x", "", "ignored"], [50, 50, 0], 2, 0x41), ["x", "A"]);

// 비율 정규화: 앞 n개가 100%, 최소 1%는 가장 큰 항목에서 가져온다, 항목 수 밖은 그대로
const defaults = [40, 25, 15, 10, 5, 3, 2];
const three = lib.normalizeShares(defaults, 3, 1);
assert.ok(near(three[0] + three[1] + three[2], 100));
assert.ok(near(three[0], 50) && near(three[1], 31.25) && near(three[2], 18.75));
assert.deepStrictEqual(three.slice(3), [10, 5, 3, 2]);
const lifted = lib.normalizeShares([99.8, 0.1, 0.1], 3, 1);
assert.ok(near(lifted[0] + lifted[1] + lifted[2], 100) && near(lifted[1], 1) && near(lifted[2], 1) && near(lifted[0], 98));
const empty = lib.normalizeShares([0, 0, 0, 0], 4, 1);
assert.ok(empty.every((v) => near(v, 25)));

// 시점 행렬: 기울기 0이면 단위 행렬. 위아래 기울기 +면 윗면 법선이 위로 기울고 앞(6시) 옆면이 보인다
const flat = lib.viewMatrixFor(0, 0, 0);
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) assert.ok(near(flat[r][c], r === c ? 1 : 0));
const tilted = lib.viewMatrixFor(0, 55, 0);
const topNormal = lib.applyMatrix(tilted, [0, 0, 1]);
assert.ok(topNormal[2] > 0 && topNormal[1] > 0, "top face visible and tilted upward on screen");
const farEdge = lib.applyMatrix(tilted, [0, 1, 0]);
const nearEdge = lib.applyMatrix(tilted, [0, -1, 0]);
assert.ok(farEdge[2] < 0 && nearEdge[2] > 0, "12 o'clock edge recedes, 6 o'clock edge approaches");
assert.ok(near(farEdge[1], Math.cos(55 * Math.PI / 180)), "foreshortened vertically");
const phi = Math.atan2(tilted[2][1], tilted[2][0]);
assert.ok(near(phi, -Math.PI / 2), "visible outer wall centred at 6 o'clock");
// 회전 +30은 12시 항목을 시계 방향으로 돌린다
const spun = lib.applyMatrix(lib.viewMatrixFor(30, 0, 0), [0, 1, 0]);
assert.ok(spun[0] > 0 && near(spun[0], 0.5) && near(spun[1], Math.cos(Math.PI / 6)));
// 좌우 기울기 +면 오른쪽 가장자리가 멀어진다. 극단(±85°)에서도 윗면은 보인다
assert.ok(lib.applyMatrix(lib.viewMatrixFor(0, 0, 40), [1, 0, 0])[2] < 0);
for (const tx of [-85, 0, 85]) for (const ty of [-85, 0, 85]) {
  assert.ok(lib.applyMatrix(lib.viewMatrixFor(123, tx, ty), [0, 0, 1])[2] > 0, `top visible at ${tx}/${ty}`);
}

// 옆면 구간: 항목이 어디에 있든 바깥벽 보이는 길이의 합은 반원(π), 안벽도 π. 반원보다 큰 항목은 두 구간으로 갈라진다
function spanTotal(percents, outward) {
  const b = lib.sectorBounds(percents, percents.length);
  let total = 0;
  let pieces = 0;
  for (let i = 0; i < percents.length; i++) {
    for (const span of lib.visibleWallSpans(b[i], b[i + 1], -Math.PI / 2, outward)) {
      assert.ok(span[1] > span[0]);
      total += span[1] - span[0];
      pieces++;
    }
  }
  return { total, pieces };
}
for (const layout of [[65, 18.5, 9.5, 3.3, 3.7], [50, 50], [98, 1, 1], [1, 98, 1], [25, 25, 25, 25]]) {
  for (const outward of [true, false]) assert.ok(near(spanTotal(layout, outward).total, Math.PI, 1e-9), `half circle visible: ${layout} ${outward}`);
}
// 6시를 가운데 둔 항목(12시 기준 25%~75%)은 바깥벽이 통째로 보이고 안벽은 안 보인다
const half = lib.sectorBounds([25, 50, 25], 3);
const frontOut = lib.visibleWallSpans(half[1], half[2], -Math.PI / 2, true);
assert.strictEqual(frontOut.length, 1);
assert.ok(near(frontOut[0][1] - frontOut[0][0], Math.PI));
assert.strictEqual(lib.visibleWallSpans(half[1], half[2], -Math.PI / 2, false).length, 0);
// 보이는 반원(12시 중심으로 두면 0°~180°) 안에 다른 항목(12시~54°)이 끼어 있으면 큰 항목은 두 구간으로 갈라진다
const big = lib.sectorBounds([10, 90], 2);
const smallPiece = lib.visibleWallSpans(big[0], big[1], Math.PI / 2, true);
assert.strictEqual(smallPiece.length, 1);
assert.ok(near(smallPiece[0][1] - smallPiece[0][0], Math.PI / 5));
const twoPieces = lib.visibleWallSpans(big[1], big[2], Math.PI / 2, true);
assert.strictEqual(twoPieces.length, 2);
assert.ok(near(twoPieces[0][1] - twoPieces[0][0] + twoPieces[1][1] - twoPieces[1][0], Math.PI - Math.PI / 5));

// 베지어 호: 양 끝은 한쪽 핸들만 있는 모서리, 90°마다 나뉘고 중간점이 원 위에 있다
const quarter = lib.arc3D(10, 2, Math.PI / 2, -Math.PI / 2);
assert.strictEqual(quarter.length, 2);
assert.ok(quarter[0].corner && quarter[1].corner);
assert.deepStrictEqual(quarter[0].left, quarter[0].anchor);
assert.deepStrictEqual(quarter[1].right, quarter[1].anchor);
assert.ok(near(quarter[0].anchor[2], 2) && near(quarter[0].right[2], 2), "handles stay on the disc plane");
function bezierAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
}
const midPoint = bezierAt(quarter[0].anchor, quarter[0].right, quarter[1].left, quarter[1].anchor, 0.5);
assert.ok(near(Math.sqrt(midPoint[0] ** 2 + midPoint[1] ** 2), 10, 0.01), "quarter arc midpoint on the circle");
assert.ok(midPoint[0] > 0 && midPoint[1] > 0, "clockwise from 12 passes through the first quadrant");
const long = lib.arc3D(10, 0, 0, TWO_PI * 0.98);
assert.strictEqual(long.length, 5, "four segments for ~353°");
for (let i = 1; i < long.length - 1; i++) assert.ok(!long[i].corner, "inner points are smooth");
assert.ok(near(lib.cornerPoint([1, 2, 3]).left[0], 1) && lib.cornerPoint([1, 2, 3]).corner);

// 윤곽: 타원 표본의 볼록 껍질, 나가는 거리, 높이별 가장자리
const ellipse = [];
for (let i = 0; i < 60; i++) ellipse.push([100 + 50 * Math.cos(TWO_PI * i / 60), 200 + 30 * Math.sin(TWO_PI * i / 60)]);
const hull = lib.convexHull(ellipse.concat([[100, 200], [110, 205]]));
assert.strictEqual(hull.length, 60, "interior points dropped");
assert.ok(near(lib.rayExitDistance(hull, [100, 200], [1, 0]), 50, 0.2));
assert.ok(near(lib.rayExitDistance(hull, [100, 200], [0, 1]), 30, 0.2));
assert.ok(near(lib.rayExitDistance(hull, [130, 200], [1, 0]), 20, 0.2), "from an off-centre anchor");
assert.strictEqual(lib.rayExitDistance(hull, [300, 300], [1, 0]), 0, "outside origin gives 0");
assert.ok(near(lib.hullExtremeXAt(hull, 200, 1), 150, 0.2) && near(lib.hullExtremeXAt(hull, 200, -1), 50, 0.2));
assert.strictEqual(lib.hullExtremeXAt(hull, 240, 1), null, "above the ellipse");
assert.ok(lib.hullExtremeXAt(hull, 215, 1) < 150 && lib.hullExtremeXAt(hull, 215, 1) > 100);
assert.ok(lib.unitVector([0, 0, 1]) === null && near(lib.unitVector([3, 4, 9])[0], 0.6));

// 줄 벌리기: 간격 이상 벌어지되 순서와 평균은 그대로, 겹치지 않으면 손대지 않는다
const rows = lib.spreadRows([100, 95, 94], 10);
assert.ok(rows[0] - rows[1] >= 10 - 1e-6 && rows[1] - rows[2] >= 10 - 1e-6);
assert.ok(near((rows[0] + rows[1] + rows[2]) / 3, (100 + 95 + 94) / 3, 1e-6));
assert.deepStrictEqual(lib.spreadRows([100, 80, 60], 10), [100, 80, 60]);
assert.deepStrictEqual(lib.spreadRows([50], 10), [50]);

// 그리기: 가짜 DOM으로 drawChart를 돌려 지시선·연결 모양을 확인한다
const drawNames = ["drawChart", "projectPoints", "buildPath", "fillAndStroke", "silhouetteHull", "clamp", "addLabel", "applyLabelFonts", "applyFontToRange", "formatNumber"];
const drawFactory = new Function("cfg", `
var MM_TO_PT = 2.83464567, LINE_WIDTH = 0.3, LABEL_FONT_SIZE = 8, CIRCLED_FONT_SIZE = 9, FILL_STEP_K = 10, WALL_EXTRA_K = 20,
    INSIDE_LABEL_RADIUS = 0.6, LEADER_ANCHOR_RADIUS = 0.75, LEADER_GAP_MM = 2.5, LEADER_TAIL_MM = 3, LEADER_REACH = 0.5, LABEL_TEXT_GAP_MM = 1,
    LABEL_ROW_GAP = LABEL_FONT_SIZE * 1.7, SILHOUETTE_SAMPLES = 60;
var SYMBOL_SETS = [{display: "A", first: 0x41}, {display: "\u3260", first: 0x3260}, {display: "\u24D0", first: 0x24D0}];
var StrokeCap = {BUTTENDCAP: "butt"}, StrokeJoin = {BEVELENDJOIN: "bevel", MITERENDJOIN: "miter"}, PointType = {CORNER: "corner", SMOOTH: "smooth"};
var korFont = null, engFont = null, circledFont = null;
function makeGray(k) { return k; }
var count = cfg.count, percents = cfg.percents, labels = cfg.labels, symbolSet = 1, leaderMaxPercent = 10,
    innerMm = cfg.innerMm || 0, spinDeg = cfg.spin || 0, solidOn = !!cfg.solid, depthMm = cfg.depth || 4, tiltXDeg = cfg.tiltX || 55, tiltYDeg = cfg.tiltY || 0,
    offsetXmm = 0, offsetYmm = 0, baseCenter = [0, 0], outerR = 20 * MM_TO_PT;
${helpers.concat(drawNames).map(extractFunction).join("\n")}
return drawChart;`);
function fakeGroup() {
  const items = [];
  return { items, group: {
    pathItems: { add() { const p = { kind: "path", pathPoints: [], setEntirePath(a) { this.pathPoints = a.map((x) => ({ anchor: x, leftDirection: x, rightDirection: x })); } }; items.push(p); return p; } },
    textFrames: { add() { const t = { kind: "text", characters: [], textRange: { characterAttributes: {} }, position: [0, 0],
      set contents(v) { this._c = v; this.characters = v.split("").map((ch) => ({ contents: ch, characterAttributes: {} })); this.width = v.length * 4.6; this.height = 9; }, get contents() { return this._c; } }; items.push(t); return t; } }
  } };
}
const R = 20 * 2.83464567;
const drawCases = [
  { count: 5, percents: [65, 18.5, 9.5, 3.3, 3.7], labels: ["", "탄소", "", "질소", "기타"] },
  { count: 5, percents: [65, 18.5, 9.5, 3.3, 3.7], labels: ["", "탄소", "", "질소", "기타"], spin: 126 },
  { count: 5, percents: [65, 18.5, 9.5, 3.3, 3.7], labels: ["", "탄소", "", "질소", "기타"], spin: 200, solid: true, tiltX: 60, depth: 8 },
  { count: 7, percents: [70, 6, 5, 5, 5, 5, 4], labels: ["", "", "", "", "", "", ""] },
  { count: 7, percents: [70, 6, 5, 5, 5, 5, 4], labels: ["", "", "", "", "", "", ""], solid: true, tiltX: 70, depth: 12, innerMm: 18 },
];
for (const cfg of drawCases) {
  const { group, items } = fakeGroup();
  drawFactory(cfg)(group);
  const texts = items.filter((it) => it.kind === "text");
  assert.strictEqual(texts.length, cfg.count, "one label per item");
  const leaders = items.filter((it) => it.kind === "path" && !it.closed);
  const expectedLeaders = cfg.percents.slice(0, cfg.count).filter((p) => p < 10).length;
  assert.strictEqual(leaders.length, expectedLeaders, "items under 10% get a leader");
  for (const line of leaders) {
    const [anchor, elbow, tail] = line.pathPoints.map((p) => p.anchor);
    assert.strictEqual(line.pathPoints.length, 3, "leader is anchor → elbow → tail");
    assert.ok(near(elbow[1], tail[1]), "second segment is horizontal");
    assert.ok(Math.abs(tail[0] - elbow[0]) >= 3 * 2.83464567 - 1e-6, "horizontal tail at least 3 mm");
    assert.strictEqual(line.strokeJoin, "bevel");
    if (!cfg.solid) assert.ok(Math.hypot(elbow[0], elbow[1]) > R + 1, "flat chart: elbow outside the circle");
    assert.ok(Math.hypot(anchor[0], anchor[1]) < R, "anchor inside the chart");
  }
  for (const shape of items.filter((it) => it.kind === "path" && it.closed)) assert.strictEqual(shape.strokeJoin, "bevel", "sectors use bevel joins");
  // 같은 쪽 라벨은 한 세로선에 맞고 줄 간격이 지켜진다
  for (const side of [1, -1]) {
    const rows = leaders.filter((l) => (l.pathPoints[2].anchor[0] - l.pathPoints[1].anchor[0]) * side > 0).map((l) => l.pathPoints[2].anchor);
    for (let i = 1; i < rows.length; i++) assert.ok(near(rows[i][0], rows[0][0]), "labels share one column");
    const ys = rows.map((r) => r[1]).sort((a, b) => b - a);
    for (let i = 1; i < ys.length; i++) assert.ok(ys[i - 1] - ys[i] >= 8 * 1.7 - 1e-6, "rows keep their gap");
  }
}

// 안내 홈페이지: 묶음 항목에 탭이 들어 있다
const app = fs.readFileSync(path.join(root, "docs", "assets", "app.js"), "utf8");
assert.ok(app.indexOf('{ id: "pie-chart", name: "원"') > 0, "guide site tab entry");
assert.ok(app.indexOf("모델 곡선·원그래프·태양 스펙트럼을 한 창의 탭으로") > 0, "guide site summary");
assert.ok(app.indexOf("id: \"pie-chart\"") < app.indexOf("id: \"solar-spectrum\""), "guide site tab order matches the script");

console.log("check-pie-chart: ok");
