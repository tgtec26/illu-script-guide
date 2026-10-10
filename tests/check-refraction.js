const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "빛의 반사와 굴절.jsx"), "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);

// 순수 기하 구간을 그대로 읽는다
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝");
assert.ok(start > 0 && end > start, "pure geometry markers");
const pure = source.slice(start, end);
const geo = new Function(`${pure}
return {DEG, polar, rayLines, arrowHead, arcPoints, angleArcs, normalSpan, refractionAngle, HEAD_TRIANGLE, HEAD_CATALOG};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// 광선: 입사광은 왼쪽 위에서 원점으로, 반사광은 오른쪽 위(입사광의 거울상), 굴절광은 오른쪽 아래
{
  const r = geo.rayLines(45, 28, 30);
  assert.deepStrictEqual(r.incident[1], [0, 0], "incident ends at the incidence point");
  assert.deepStrictEqual(r.reflected[0], [0, 0], "reflected starts at the incidence point");
  assert.deepStrictEqual(r.refracted[0], [0, 0], "refracted starts at the incidence point");
  assert.ok(r.incident[0][0] < 0 && r.incident[0][1] > 0, "incident tail is upper-left");
  near(r.reflected[1][0], -r.incident[0][0], 1e-9, "reflection mirrors x");
  near(r.reflected[1][1], r.incident[0][1], 1e-9, "reflection keeps y");
  assert.ok(r.refracted[1][0] > 0 && r.refracted[1][1] < 0, "refracted tip is lower-right");
  for (const line of [r.incident, r.reflected, r.refracted]) near(dist(line[0], line[1]), 30, 1e-9, "ray length");
  // 법선과 이루는 각
  near(Math.atan2(-r.incident[0][0], r.incident[0][1]) / geo.DEG, 45, 1e-9, "incident angle from the normal");
  near(Math.atan2(r.refracted[1][0], -r.refracted[1][1]) / geo.DEG, 28, 1e-9, "refraction angle from the normal");
  // 0°면 법선과 겹친다
  const straight = geo.rayLines(0, 0, 20);
  near(straight.incident[0][0], 0, 1e-9, "0 degree incident is vertical");
  near(straight.refracted[1][1], -20, 1e-9, "0 degree refracted goes straight down");
}

// 화살촉: 가운데가 시작점에서 dist(mm) 자리, 끝은 진행 방향, size가 삼각형 머리 길이(mm)이고 일러스트레이터 화살촉 4종류(tools/arrowheads.json)를 같은 배율로 그린다. 광선 밖이면 끝으로 잠근다
{
  const {catalog, expectedPoints, nearPoints} = require("./arrowhead-catalog.js");
  assert.deepStrictEqual(geo.HEAD_CATALOG, catalog.types.map((t) => ({length: t.length, lineEnd: t.lineEnd, poly: t.poly})), "same data as tools/arrowheads.json");
  const line = [[-10, 10], [0, 0]];
  const len = Math.hypot(10, 10);
  const d = [10 / len, -10 / len];
  const k = 3 / 8.6;
  for (let shape = 0; shape < 4; shape++) {
    const h = geo.arrowHead(line, len / 2, 3, shape);
    assert.strictEqual(h.closed, true, `shape ${shape} is closed`);
    // 삼각형 머리 길이 3이 광선의 가운데에 놓인다: 끝은 가운데에서 1.5 앞
    const tip = [-5 + d[0] * 1.5, 5 + d[1] * 1.5];
    nearPoints(h.points, expectedPoints(shape, tip, d, k), `shape ${shape}`);
  }
  // 광선 앞뒤로 벗어나면 끝점에 잠근다
  const h0 = geo.arrowHead(line, -5, 2, 0);
  const tip0 = [-10 + d[0] * 1, 10 + d[1] * 1];
  nearPoints(h0.points, expectedPoints(0, tip0, d, 2 / 8.6), "negative distance clamps to the start");
  const hEnd = geo.arrowHead([[0, 0], [0, -20]], 50, 2, 0);
  nearPoints(hEnd.points, expectedPoints(0, [0, -21], [0, -1], 2 / 8.6), "beyond the end clamps to the end");
  assert.ok(Math.abs(hEnd.points[0][1] - (-20 - 1)) < 1e-9, "tip passes the clamp by half the head length");
}

// 호: 양 끝이 원 위, 손잡이 방향이 접선, 베지어 가운데 점도 원 위(≤90° 한 구간). 90°를 넘으면 나눈다
{
  const pts = geo.arcPoints(8, 90, 135);
  assert.strictEqual(pts.length, 2, "45 degree arc is one segment");
  near(pts[0].anchor[0], 0, 1e-9, "arc starts on the normal");
  near(pts[0].anchor[1], 8, 1e-9, "arc starts at radius");
  near(dist(pts[1].anchor, [0, 0]), 8, 1e-9, "arc ends on the circle");
  // 손잡이는 접선 방향(반지름과 수직)
  const t0 = [pts[0].right[0] - pts[0].anchor[0], pts[0].right[1] - pts[0].anchor[1]];
  near(t0[0] * pts[0].anchor[0] + t0[1] * pts[0].anchor[1], 0, 1e-9, "start handle is tangent");
  const t1 = [pts[1].left[0] - pts[1].anchor[0], pts[1].left[1] - pts[1].anchor[1]];
  near(t1[0] * pts[1].anchor[0] + t1[1] * pts[1].anchor[1], 0, 1e-9, "end handle is tangent");
  const bez = (p0, p1, p2, p3, t) => [0, 1].map(i => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t ** 2 * p2[i] + t ** 3 * p3[i]);
  const m = bez(pts[0].anchor, pts[0].right, pts[1].left, pts[1].anchor, 0.5);
  near(dist(m, [0, 0]), 8, 1e-3, "bezier midpoint stays on the circle");
  assert.strictEqual(geo.arcPoints(5, 0, 170).length, 3, "170 degree arc is split in two");
  assert.strictEqual(geo.arcPoints(5, 0, 90).length, 2, "90 degree arc stays one segment");
}

// 각 호 범위: 입사각·반사각은 위쪽 법선 양옆에 같은 크기, 굴절각은 아래쪽 법선에서 오른쪽으로
{
  const a = geo.angleArcs(40, 25);
  assert.deepStrictEqual(a.incident, [90, 130]);
  assert.deepStrictEqual(a.reflected, [50, 90]);
  assert.deepStrictEqual(a.refracted, [-90, -65]);
  near(a.incident[1] - a.incident[0], a.reflected[1] - a.reflected[0], 1e-9, "reflection angle equals incidence angle");
}

// 법선: 광선보다 4mm 길지만 틀 안쪽 여백에서 끊는다
{
  assert.deepStrictEqual(geo.normalSpan(20, 100, 2), [[0, -24], [0, 24]]);
  assert.deepStrictEqual(geo.normalSpan(40, 60, 2), [[0, -28], [0, 28]]);
}

// 스넬 법칙: n1·sin(입사각) = n2·sin(굴절각). 같은 매질이면 그대로, 수직 입사는 0°, 빽빽한 매질에서 성긴 매질로 크게 들어가면 전반사(null)
{
  near(geo.refractionAngle(45, 1, 1.5), Math.asin(Math.sin(45 * geo.DEG) / 1.5) / geo.DEG, 1e-9, "snell 45 air into glass");
  near(geo.refractionAngle(45, 1, 1.5), 28.1255, 1e-3, "45 into glass is about 28.1 degrees");
  near(geo.refractionAngle(30, 1, 1.33), 22.0824, 1e-3, "30 into water is about 22.1 degrees");
  near(geo.refractionAngle(60, 1.5, 1.5), 60, 1e-9, "same index keeps the angle");
  near(geo.refractionAngle(0, 1, 2.42), 0, 1e-9, "normal incidence does not bend");
  near(geo.refractionAngle(30, 1.5, 1.33), Math.asin(1.5 * Math.sin(30 * geo.DEG) / 1.33) / geo.DEG, 1e-9, "glass into water bends away");
  assert.ok(geo.refractionAngle(30, 1.5, 1.33) > 30, "sparser medium bends away from the normal");
  assert.strictEqual(geo.refractionAngle(70, 1.5, 1.33), null, "glass into water at 70 degrees is total reflection");
  assert.strictEqual(geo.refractionAngle(45, 1.5, 1), null, "glass into air at 45 degrees is total reflection");
  assert.ok(geo.refractionAngle(85, 1, 1.33) < 85, "denser medium bends toward the normal");
}

// 다이얼로그 규칙: 설정 저장 키, 위치 행, R 버튼, 탭 헬퍼, 기본 버튼 제거
assert.ok(source.includes('"ObjectRefraction/settings"'), "pref key");
assert.ok(source.includes("bindPositionRow(rows.offsetX"), "movable preview (x)");
assert.ok(source.includes("bindPositionRow(rows.offsetY"), "movable preview (y)");
assert.ok(source.includes('reset.helpTip = "처음 값으로 되돌리기"'), "R button");
assert.ok(source.includes("ui_tab_helper.jsxinc"), "tab helper");
assert.ok(source.includes("dlg.defaultElement = null"), "no default button");
assert.ok(source.includes("var BOUNDARY_PT = 0.5;"), "boundary line is 0.5pt");
assert.ok(source.includes('{name: "공기", n: 1}') && source.includes('{name: "물", n: 1.33}') && source.includes('{name: "유리", n: 1.5}') && source.includes('{name: "다이아몬드", n: 2.42}'), "medium presets");
assert.ok(source.includes('["v3", options.angleMode, options.medium1, options.medium2, options.headShape]') && source.includes('p[0] !== "v3"'), "settings v3");
assert.ok(/medium1K: \{range: \[0, 100\], step: 10/.test(source) && /medium2K: \{range: \[0, 100\], step: 10/.test(source), "medium gray in K 10 steps");

console.log("check-refraction: ok");
