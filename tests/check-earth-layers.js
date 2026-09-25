const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_EarthLayers.jsx"), "utf8");

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

const names = ["layerRadii", "sectorRange", "labelAngle", "sectorPoints", "labelAnchors", "depthMarks", "arcPoints", "isKoreanOrSpace",
  "projectView", "dot", "normalizeAngle", "paramArc", "closedEllipsePts", "segPts", "joinLoop", "scalePts", "wedgePiece", "convexHull",
  "faceAnchors", "hemiLayers", "hemiAnchors", "spreadLabels", "stackLabels", "indexOf", "leaderCrossings", "segmentsCross", "spreadToX", "spreadFromX", "nearestHandle"];
const lib = new Function(
  "var EARTH_RADIUS_KM = 6400, TRACK_PAD = 10, SPREAD_MAX_MM = 80;\n" +
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);

// 경계 반지름: 지각은 과장, 맨틀–외핵 2900 km, 외핵–내핵 5100 km
{
  const radii = lib.layerRadii(64, 0.04);
  near(radii[0], 64, 1e-9, "surface");
  near(radii[1], 61.44, 1e-9, "crust bottom");
  near(radii[2], 35, 1e-9, "core–mantle boundary at 2900 km");
  near(radii[3], 13, 1e-9, "inner core at 5100 km");
  // 지각을 가장 두껍게 해도 층 순서가 유지된다
  const thick = lib.layerRadii(64, 0.15);
  for (let i = 1; i < 4; i++) assert.ok(thick[i] < thick[i - 1], "layers shrink inward");
}

// 부채꼴: 중심에서 시작해 원호를 지난다. 1/4 절개는 조각 하나, 원 둘레 위 점
{
  const quarter = lib.sectorPoints(10, 0, Math.PI / 2);
  assert.deepStrictEqual(quarter[0].anchor, [0, 0]);
  assert.strictEqual(quarter.length, 3);
  near(quarter[1].anchor[0], 10, 1e-9, "arc starts on the right");
  near(quarter[2].anchor[1], 10, 1e-9, "arc ends on top");
  // 겉면 3/4: 90° → 360°, 조각 세 개
  assert.strictEqual(lib.sectorPoints(10, Math.PI / 2, 2 * Math.PI).length, 5);
  // 단면 각도: 오른쪽 가로 반지름(0)에서 시계 반대 방향으로. 1~360으로 자른다
  assert.deepStrictEqual(lib.sectorRange(180), [0, Math.PI]);
  assert.deepStrictEqual(lib.sectorRange(90), [0, Math.PI / 2]);
  near(lib.sectorRange(135)[1], Math.PI * 0.75, 1e-12, "any angle");
  near(lib.sectorRange(500)[1], 2 * Math.PI, 1e-12, "at most 360");
  // 임의 각 부채꼴도 90° 이하 조각마다 베지어 하나, 끝이 그 각 위
  const wedge = lib.sectorPoints(10, 0, lib.sectorRange(135)[1]);
  assert.strictEqual(wedge.length, 4, "centre + 2 pieces");
  near(Math.atan2(wedge[3].anchor[1], wedge[3].anchor[0]), Math.PI * 0.75, 1e-9, "ends at 135°");
  // 이름 방향: 90° 이상이면 45°, 좁으면 부채꼴 가운데
  near(lib.labelAngle(lib.sectorRange(360)), Math.PI / 4, 1e-12, "full circle labels at 45°");
  near(lib.labelAngle(lib.sectorRange(60)), Math.PI / 6, 1e-12, "narrow wedge labels in the middle");
}

// 이름 자리: 각 층의 가운데 반지름, 모두 해당 층 안
{
  const radii = lib.layerRadii(64, 0.04);
  const anchors = lib.labelAnchors(radii, Math.PI / 4);
  for (let i = 0; i < 4; i++) {
    const r = Math.hypot(anchors[i][0], anchors[i][1]);
    const inner = i < 3 ? radii[i + 1] : 0;
    assert.ok(r < radii[i] && r > inner, `${i}: anchor inside its layer`);
    near(anchors[i][0], anchors[i][1], 1e-9, "on the 45° ray");
  }
  assert.ok(anchors[0][1] > anchors[1][1] && anchors[1][1] > anchors[2][1], "outer labels sit higher");
}

// 깊이 눈금: 겉면 0, 경계 2900·5100, 중심 6400 km
{
  const marks = lib.depthMarks(lib.layerRadii(64, 0.04));
  assert.deepStrictEqual(marks.map((m) => m.text), ["0", "2900", "5100", "6400 km"]);
  assert.deepStrictEqual(marks.map((m) => m.x), [64, 35, 13, 0]);
}

assert.ok(source.includes('var PREF_KEY = "ObjectEarthLayers/settings";'));
// 글자 서체: 한글·공백만 Spoqa, 숫자·영문·괄호는 GSMediumB1
assert.ok([..."지각 "].every((ch) => lib.isKoreanOrSpace(ch.charCodeAt(0))));
assert.ok(![..."6400km()"].some((ch) => lib.isKoreanOrSpace(ch.charCodeAt(0))));
assert.ok(source.includes("attributes.baselineShift = ENG_BASELINE_PT;"), "Latin and digits get the +0.5pt baseline");
// 기호: ㉠·ⓐ는 바탕 1.125배, 지각부터 차례로
assert.ok(source.includes('var batangFont = findOptionalFont("Batang");') && source.includes("attributes.size * (bracket ? 1.25 : 1.125)"), "circled labels in Batang");
assert.ok(source.includes('{label: "ⓐ ⓑ ⓒ", chars: ["ⓐ", "ⓑ", "ⓒ", "ⓓ"]}') && source.includes('{label: "㉠ ㉡ ㉢", chars: ["㉠", "㉡", "㉢", "㉣"]}'), "label styles");
assert.ok(source.includes("var label = chars ? chars[i] :"), "symbol replaces the layer name");
// 잘라낸 조각: 윤곽은 볼록하고 모든 절단면(보이는 것)은 윤곽 안에 있다
{
  const bez = (a, b, t) => [0, 1].map((k) => (1 - t) ** 3 * a.anchor[k] + 3 * (1 - t) ** 2 * t * a.right[k] + 3 * (1 - t) * t * t * b.left[k] + t ** 3 * b.anchor[k]);
  const polyOf = (pts) => { const out = []; for (let i = 0; i < pts.length; i++) for (let s = 0; s < 8; s++) out.push(bez(pts[i], pts[(i + 1) % pts.length], s / 8)); return out; };
  const insidePoly = (poly, p) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
  const cases = [[90, 210, -20, 0, true], [60, 200, -35, 15, true], [90, 210, -20, 0, false], [120, 180, 20, 0, true], [90, 90, 0, 0, false], [45, 30, -50, 40, true]];
  for (const [deg, center, tilt, turn, upper] of cases) {
    const g = lib.wedgePiece(100, deg, center, tilt, turn, upper);
    const poly = polyOf(g.outline);
    for (const q of poly) assert.ok(isFinite(q[0]) && isFinite(q[1]), "finite outline");
    for (const f of g.faces) {
      if (!f.visible) continue;
      // 면 모양의 점은 윤곽 안이거나 윤곽 선 위(0.5 이내)
      const nearEdge = (p) => poly.some((a, i) => { const b = poly[(i + 1) % poly.length]; const dx = b[0] - a[0], dy = b[1] - a[1];
        const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(a[0] + dx * k - p[0], a[1] + dy * k - p[1]) < 0.5; });
      for (const p of polyOf(f.points)) assert.ok(insidePoly(poly, p) || nearEdge(p), `${deg}/${center}/${tilt}: visible face inside the outline`);
    }
    assert.strictEqual(g.faces.length, upper ? 3 : 2, "faces: two cut planes (+ equator)");
  }
  // 절개 방향 뒤쪽에서 보면(조각을 뒤로 돌려 놓으면) 두 절단면이 보인다
  const front = lib.wedgePiece(100, 90, 180, -20, 0, true);
  assert.ok(front.faces[0].visible && front.faces[1].visible, "both cut faces face the viewer");
  // 이름 자리: 절단면 위, 층마다 가운데 반지름
  const radii = lib.layerRadii(100, 0.04);
  const anchors = lib.faceAnchors(front.axis, front.faces[1].e, radii, Math.PI / 4);
  // 모두 같은 방향, 거리는 층 가운데 반지름에 비례 (투영이라 길이는 줄어든다)
  const rm = (i) => (radii[i] + (radii[i + 1] || 0)) / 2;
  near(Math.hypot(...anchors[3]) / Math.hypot(...anchors[0]), rm(3) / rm(0), 1e-9, "anchors scale with the layer radius");
  near(anchors[3][0] * anchors[0][1] - anchors[3][1] * anchors[0][0], 0, 1e-9, "same direction");
}
// 반구 분리: 층마다 위치(pt)를 따로, 전체 가운데 정렬. 지각·맨틀·외핵은 파인 껍질, 내핵은 구
{
  const radii = lib.layerRadii(100, 0.04);
  const shells = lib.hemiLayers(radii, [0, 10, 20, 30], 0.3);
  assert.deepStrictEqual(shells.map((h) => h.cx), [-15, -5, 5, 15]);
  assert.deepStrictEqual(shells.map((h) => h.sphere), [false, false, false, true], "inner core is a sphere");
  near(shells[3].rightX, 15 + radii[3], 1e-9, "sphere reaches its full radius");
  near(shells[1].rightX, -5 + radii[1] * 0.3, 1e-9, "face ellipse width");
  // 파인 면은 바로 안쪽 층 반지름의 단면 타원
  const holeYs = shells[1].hole.map((p) => p.anchor[1]);
  near(Math.max(...holeYs), radii[2], 1e-9, "hole height = next layer radius");
  const holeXs = shells[1].hole.map((p) => p.anchor[0]);
  near(Math.max(...holeXs) - (-5), radii[2] * 0.3, 1e-9, "hole width = next layer ratio");
  const xs = shells[0].dome.map((p) => p.anchor[0]);
  near(Math.min(...xs), -15 - 100, 1e-9, "dome reaches the left semicircle");
  // 창: 구멍 왼쪽 반과 입구 가운데 선 오른쪽. 구멍 왼쪽 끝은 안쪽 층 단면 폭만큼, 창은 오른쪽으로 멀리
  const win = shells[0].window.map((p) => p.anchor);
  near(Math.min(...win.map((p) => p[0])), -15 - radii[1] * 0.3, 1e-9, "window reaches the hole's left edge");
  // 창은 그림(가장 오른쪽 끝)보다 오른쪽·위아래로 넉넉하지만 대지 좌표 안
  const wx = Math.max(...win.map((p) => p[0])), wy = Math.max(...win.map((p) => p[1]));
  assert.ok(wx > Math.max(...shells.map((h) => h.rightX)) + 50 && wx < 1000, `window extends to the right: ${wx}`);
  assert.ok(wy > 100 && wy < 1000, "window covers the height");
  assert.ok(win.every((p) => p[0] >= -15 - radii[1] * 0.3 - 1e-9), "nothing left of the hole");
  assert.strictEqual(shells[3].window, undefined, "the core has no window");
  // 따로 움직인 위치도 가운데 정렬
  assert.deepStrictEqual(lib.hemiLayers(radii, [0, 0, 40, 60], 0.3).map((h) => h.cx), [-30, -30, 10, 30]);
  const top = lib.hemiAnchors(shells, radii);
  near(top[0][1], (radii[0] + radii[1]) / 2, 1e-9, "crust label on its ring");
  near(top[3][1], radii[3] / 2, 1e-9, "core label inside the sphere");
  for (let i = 0; i + 1 < radii.length; i++) assert.ok(top[i][1] >= radii[i + 1] - 1e-9);
}
// 층 위치 슬라이더: 값 ↔ x, 0.5 mm 단위, 범위 안, 가장 가까운 손잡이
{
  near(lib.spreadToX(0, 260), 10, 1e-9, "left pad");
  near(lib.spreadToX(80, 260), 250, 1e-9, "right pad");
  assert.strictEqual(lib.spreadFromX(lib.spreadToX(23.5, 260), 260), 23.5);
  assert.strictEqual(lib.spreadFromX(-50, 260), 0);
  assert.strictEqual(lib.spreadFromX(999, 260), 80);
  assert.strictEqual(lib.spreadFromX(10 + 240 * 0.3 + 1, 260), 24.5, "rounds to 0.5 mm");
  assert.strictEqual(lib.nearestHandle([0, 8, 16, 24], lib.spreadToX(15, 260), 260), 2);
  assert.strictEqual(lib.nearestHandle([10, 10, 30, 40], lib.spreadToX(10, 260), 260), 1, "stacked handles: the inner layer");
}
// 이름 높이: 떨어져 있으면 그대로, 가까우면 위에서부터 gap씩 아래로
assert.deepStrictEqual(lib.spreadLabels([[0, 30], [0, 10], [0, -20]], 5), [30, 10, -20]);
assert.deepStrictEqual(lib.spreadLabels([[0, 10], [0, 11], [0, 9]], 5), [6, 11, 1]);
// 점이 한 줄로 같은 높이면 꺾임점에 가까운(오른쪽) 점이 위 이름을 가져 지시선이 교차하지 않는다
{
  const row = [[40, 0], [30, 0], [20, 0], [5, 0]];   // 지각 → 내핵 (오른쪽 → 왼쪽)
  const ys = lib.spreadLabels(row, 5, 50);
  assert.strictEqual(lib.leaderCrossings(row, ys, 50), 0, "no crossing leaders");
  assert.deepStrictEqual(ys, [0, -5, -10, -15], "rightmost point takes the top name");
  // 원래 교차하던 순서(내핵이 위)는 교차가 생긴다
  assert.ok(lib.leaderCrossings(row, [-15, -10, -5, 0], 50) > 0);
  // 45° 줄(평면)은 높이 순서 그대로
  const diag = [[30, 30], [20, 20], [10, 10], [3, 3]];
  assert.deepStrictEqual(lib.spreadLabels(diag, 5, 50), [30, 20, 10, 3]);
}
assert.ok(source.includes('p[0] !== "v5" || p.length !== 26'), "settings field count");
console.log("earth layer checks passed");
