const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_SmoothPath.jsx");
const source = fs.readFileSync(scriptPath, "utf8");

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

const helperNames = [
  "processPathData", "samplePathPoints", "bezierPoint", "simplifyPoints", "rdpMark",
  "relaxedSample", "pointSegmentDistance", "turnDeviation", "markCorners", "neighborAt", "cornerWindow", "smoothPoints",
  "relax", "buildBezier", "normalize", "distance", "pushUnique",
  "removeAnchors", "mergeSegments", "sampleSegment", "fitHandles", "tangentAt", "isZeroHandle", "suggestTolerance", "buildRemoveNodes", "sweepRemove", "nodesToData",
];
const helperSource = helperNames.map(extractFunction).join("\n");
const api = new Function(`${helperSource}\nreturn {${helperNames.join(", ")}};`)();

const MM = 2.834645669;
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

function corner(x, y) {
  return { anchor: [x, y], left: [x, y], right: [x, y], corner: true };
}

// 연필로 그은 것처럼 잔떨림이 있는 원. 각 앵커는 핸들이 없는 꺾인 점이라 미분이 안 된다.
function noisyCircle(count, radius, jitter) {
  const points = [];
  let seed = 7;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const wobble = radius + jitter * ((seed / 2147483648) - 0.5);
    const angle = (2 * Math.PI * i) / count;
    points.push(corner(Math.cos(angle) * wobble, Math.sin(angle) * wobble));
  }
  return { closed: true, points };
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

const options = (over) => Object.assign({
  tolerance: 0.25 * MM,
  sampleStep: 0.25 * MM,
  smoothStrength: 40,
  cornerAngle: 75,
  minOpenPoints: 2,
  minClosedPoints: 4,
  removeTolerance: 0,
}, over || {});

// 핸들이 있는 점. left/right는 앵커 기준 상대 좌표로 받는다
function smoothPoint(x, y, lx, ly, rx, ry) {
  return { anchor: [x, y], left: [x + lx, y + ly], right: [x + rx, y + ry], corner: false };
}

// 핸들이 제대로 붙은 원(정확한 베지어 근사). segments개 구간으로 나눈다
function bezierCircle(segments, radius) {
  const points = [];
  const k = (4 / 3) * Math.tan(Math.PI / (2 * segments)) * radius;
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments;
    const tx = -Math.sin(a);
    const ty = Math.cos(a);
    points.push(smoothPoint(Math.cos(a) * radius, Math.sin(a) * radius, -tx * k, -ty * k, tx * k, ty * k));
  }
  return { closed: true, points };
}

function radiusError(data, radius) {
  let worst = 0;
  const count = data.closed ? data.points.length : data.points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = data.points[i];
    const b = data.points[(i + 1) % data.points.length];
    for (let k = 0; k <= 20; k++) {
      const p = api.bezierPoint(a.anchor, a.right, b.left, b.anchor, k / 20);
      worst = Math.max(worst, Math.abs(Math.hypot(p[0], p[1]) - radius));
    }
  }
  return worst;
}

// 1. 두 강도가 모두 0이면 원본을 건드리지 않는다
{
  const data = noisyCircle(40, 50, 4);
  const result = api.processPathData(data, options({ tolerance: 0, smoothStrength: 0 }));
  assert.strictEqual(result, data, "강도 0이면 원본 그대로");
}

// 2. 샘플링: 직선 구간은 직선 위의 점으로만 펴진다
{
  const straight = {
    closed: false,
    points: [corner(0, 0), corner(100, 0)],
  };
  const sampled = api.samplePathPoints(straight.points, false, 5);
  assert.ok(sampled.length >= 20, `샘플 점 개수 ${sampled.length}`);
  near(sampled[0][0], 0, 1e-9, "첫 점");
  near(sampled[sampled.length - 1][0], 100, 1e-9, "끝 점");
  for (const point of sampled) near(point[1], 0, 1e-9, "직선 위");
}

// 3. 단순화: 직선 위의 점들은 양 끝만 남고, 허용 오차 안에서 모양을 지킨다
{
  const line = [];
  for (let i = 0; i <= 100; i++) line.push([i, 0]);
  assert.deepStrictEqual(api.simplifyPoints(line, false, 0.5, 2), [[0, 0], [100, 0]], "직선은 두 점");

  const bump = line.slice();
  bump[50] = [50, 3];
  const kept = api.simplifyPoints(bump, false, 0.5, 2);
  assert.ok(kept.length < 10, `돌출 하나만 남고 나머지 직선은 지워진다: ${kept.length}점`);
  assert.ok(kept.some((point) => point[0] === 50 && point[1] === 3), "허용 오차보다 큰 돌출은 남는다");

  for (const point of bump) {
    let best = Infinity;
    for (let i = 0; i < kept.length - 1; i++) {
      best = Math.min(best, api.pointSegmentDistance(point, kept[i], kept[i + 1]));
    }
    assert.ok(best <= 0.5 + 1e-9, `단순화 오차 ${best}`);
  }
}

// 4. 모서리 판정: 직각으로 꺾인 점만 모서리, 둥근 곳은 아니다
{
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  assert.deepStrictEqual(api.markCorners(square, true, 75, 0), [true, true, true, true], "사각형 네 꼭짓점");
  assert.deepStrictEqual(api.markCorners(square, true, 0, 0), [false, false, false, false], "임계 0이면 모두 부드럽게");

  const circle = [];
  for (let i = 0; i < 24; i++) {
    circle.push([Math.cos((i / 24) * 2 * Math.PI) * 50, Math.sin((i / 24) * 2 * Math.PI) * 50]);
  }
  assert.ok(api.markCorners(circle, true, 75, 0).indexOf(true) === -1, "원에는 모서리가 없다");

  const open = [[0, 0], [50, 0], [50, 50]];
  assert.deepStrictEqual(api.markCorners(open, false, 75, 0), [false, true, false], "열린 패스의 끝점은 모서리로 세지 않는다");
  near(api.turnDeviation([0, 0], [50, 0], [50, 50]), 90, 1e-9, "직각 편차");
  near(api.turnDeviation([0, 0], [50, 0], [100, 0]), 0, 1e-9, "직진 편차");
}

// 5. 평활: 곡률이 튀는 곳은 눌리고, 면적(세포막 크기)은 거의 유지된다
{
  const raw = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 2 * Math.PI;
    const radius = 50 + (i % 2 === 0 ? 1.5 : -1.5);   // 톱니처럼 튀는 곡률
    raw.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  const corners = api.markCorners(raw, true, 75, 0);
  const smoothed = api.smoothPoints(raw, true, corners, 60);

  const peak = (points) => {
    let worst = 0;
    for (let i = 0; i < points.length; i++) {
      worst = Math.max(worst, api.turnDeviation(
        points[(i - 1 + points.length) % points.length], points[i], points[(i + 1) % points.length]));
    }
    return worst;
  };
  assert.ok(peak(smoothed) < peak(raw) * 0.5, `곡률 첨두 ${peak(raw)} → ${peak(smoothed)}`);

  const shrink = 1 - polygonArea(smoothed) / polygonArea(raw);
  assert.ok(Math.abs(shrink) < 0.03, `면적 수축 ${(shrink * 100).toFixed(2)}%`);

  // 모서리로 표시된 점은 제자리에 못 박힌다
  const pinned = api.smoothPoints(raw, true, raw.map((_, i) => i === 3), 100);
  assert.deepStrictEqual(pinned[3], raw[3], "모서리 점은 움직이지 않는다");

  // 열린 패스의 양 끝도 제자리
  const openRaw = raw.slice(0, 20);
  const openSmoothed = api.smoothPoints(openRaw, false, openRaw.map(() => false), 100);
  assert.deepStrictEqual(openSmoothed[0], openRaw[0], "열린 패스 시작점 고정");
  assert.deepStrictEqual(openSmoothed[19], openRaw[19], "열린 패스 끝점 고정");
}

// 6. 핸들: 부드러운 점은 좌우 핸들이 앵커와 일직선, 모서리 점은 각자 변을 향한다
{
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const smooth = api.buildBezier(square, true, [false, false, false, false]);
  for (const point of smooth) {
    const cross = (point.right[0] - point.anchor[0]) * (point.anchor[1] - point.left[1])
      - (point.right[1] - point.anchor[1]) * (point.anchor[0] - point.left[0]);
    near(cross, 0, 1e-6, "부드러운 점의 핸들은 일직선");
    assert.strictEqual(point.corner, false, "부드러운 점");
  }

  const sharp = api.buildBezier(square, true, [true, true, true, true]);
  assert.strictEqual(sharp[1].corner, true, "모서리 표시가 전달된다");
  near(sharp[1].right[0], 100, 1e-9, "모서리 오른쪽 핸들은 다음 변 방향");
  near(sharp[1].right[1], 100 / 3, 1e-9, "핸들 길이는 변 길이의 1/3");
  near(sharp[1].left[0], 100 - 100 / 3, 1e-9, "모서리 왼쪽 핸들은 이전 변 방향");
  near(sharp[1].left[1], 0, 1e-9, "모서리 왼쪽 핸들 y");

  // 열린 패스의 끝점 핸들은 자기 앵커 위에 놓여 밖으로 삐져나가지 않는다
  const open = api.buildBezier([[0, 0], [50, 0], [100, 0]], false, [false, false, false]);
  assert.deepStrictEqual(open[0].left, [0, 0], "시작점 왼쪽 핸들");
  assert.deepStrictEqual(open[2].right, [100, 0], "끝점 오른쪽 핸들");
}

// 7. 전체 흐름: 떨리는 연필 원이 앵커는 줄고 모양은 유지된 채 부드러워진다
{
  const data = noisyCircle(240, 50, 3);
  const result = api.processPathData(data, options({ tolerance: 0.8, smoothStrength: 50 }));

  assert.strictEqual(result.closed, true, "닫힌 패스 유지");
  assert.ok(result.points.length < data.points.length / 5,
    `앵커 ${data.points.length} → ${result.points.length}`);
  assert.ok(result.points.length >= 4, "닫힌 패스는 최소 4점");

  let worst = 0;
  for (const point of result.points) {
    worst = Math.max(worst, Math.abs(Math.sqrt(point.anchor[0] ** 2 + point.anchor[1] ** 2) - 50));
  }
  assert.ok(worst < 1.5, `원본 반지름에서 벗어난 정도 ${worst}`);

  const anchors = result.points.map((p) => p.anchor);
  let peak = 0;
  for (let i = 0; i < anchors.length; i++) {
    peak = Math.max(peak, api.turnDeviation(
      anchors[(i - 1 + anchors.length) % anchors.length], anchors[i], anchors[(i + 1) % anchors.length]));
  }
  assert.ok(peak < 45, `정리 뒤 최대 꺾임 ${peak}도`);
  for (const point of result.points) assert.strictEqual(point.corner, false, "떨림은 모서리로 남지 않는다");
}

// 7-1. 모서리 판정 거리: 잔떨림은 모서리로 잡지 않고, 멀리서 봐도 꺾인 곳만 잡는다
{
  const zigzag = [];
  for (let i = 0; i < 40; i++) zigzag.push([i * 2, i % 2 === 0 ? 1 : -1]);   // 진폭 2pt 톱니
  assert.ok(api.markCorners(zigzag, false, 75, 0).indexOf(true) >= 0, "바로 옆만 보면 떨림도 모서리로 잡힌다");
  assert.ok(api.markCorners(zigzag, false, 75, 12).indexOf(true) === -1, "멀리서 보면 떨림은 모서리가 아니다");

  const bend = [];
  for (let i = 0; i <= 20; i++) bend.push([i * 2, 0]);
  for (let i = 1; i <= 20; i++) bend.push([40, i * 2]);
  const marked = api.markCorners(bend, false, 75, 12);
  assert.strictEqual(marked[20], true, "직각으로 꺾인 점은 멀리서 봐도 모서리");

  // 강도를 올릴수록 더 멀리서 본다
  const base = { tolerance: 1, sampleStep: 0.7, smoothStrength: 0 };
  assert.ok(api.cornerWindow(Object.assign({}, base, { smoothStrength: 100 })) >
    api.cornerWindow(base) * 2.5, "부드럽기 100은 기준 거리의 3배");
}

// 8. 앵커 줄이기만 켜면 원래 앵커 위치에서 뽑은 점만 남는다
{
  const data = noisyCircle(60, 50, 2);
  const result = api.processPathData(data, options({ tolerance: 0, smoothStrength: 30, cornerAngle: 180 }));
  assert.strictEqual(result.points.length, data.points.length, "정리 강도 0이면 앵커 수 유지");
}

// 9. 모서리 유지: 직각으로 꺾인 열린 패스는 꼭짓점을 잃지 않는다
{
  const elbow = { closed: false, points: [corner(0, 0), corner(100, 0), corner(100, 100)] };
  const result = api.processPathData(elbow, options({ tolerance: 0.5, smoothStrength: 80, cornerAngle: 75 }));
  let sharpest = null;
  for (const point of result.points) {
    if (point.corner) sharpest = point.anchor;
  }
  assert.ok(sharpest !== null, "모서리가 남는다");
  near(sharpest[0], 100, 1.5, "모서리 x");
  near(sharpest[1], 0, 1.5, "모서리 y");

  const rounded = api.processPathData(elbow, options({ tolerance: 0.5, smoothStrength: 80, cornerAngle: 0 }));
  for (const point of rounded.points) assert.strictEqual(point.corner, false, "임계 0이면 모서리 없이 둥글게");
}

// 10. 앵커 제거(형태 유지): 직선 위 중간점은 사라지고, 직선은 직선으로 남는다
{
  const line = { closed: false, points: [corner(0, 0), corner(30, 0), corner(60, 0.05), corner(100, 0)] };
  const result = api.removeAnchors(line, 0.1, 2);
  assert.strictEqual(result.points.length, 2, "직선 위 중간점 제거");
  assert.deepStrictEqual(result.points[0].right, [0, 0], "직선은 핸들 없이 남는다");
  assert.deepStrictEqual(result.points[1].left, [100, 0], "직선 끝 핸들도 없다");

  const bent = { closed: false, points: [corner(0, 0), corner(50, 5), corner(100, 0)] };
  assert.strictEqual(api.removeAnchors(bent, 0.1, 2).points.length, 3, "허용 오차보다 큰 꺾임은 남는다");
  assert.strictEqual(api.removeAnchors(bent, 6, 2).points.length, 2, "허용 오차 안이면 지운다");
}

// 11. 앵커 제거: 핸들 있는 원은 앵커가 절반 이하로 줄고 곡선은 원 위에 남는다
{
  const circle = bezierCircle(32, 50);
  const result = api.removeAnchors(circle, 0.1, 4);
  assert.strictEqual(result.closed, true, "닫힘 유지");
  assert.ok(result.points.length <= 16, `앵커 32 → ${result.points.length}`);
  assert.ok(result.points.length >= 4, "닫힌 패스 최소 4점");
  assert.ok(radiusError(result, 50) < 0.15, `원에서 벗어난 정도 ${radiusError(result, 50)}`);

  // 남은 점의 접선 방향은 원본 그대로(원의 접선)
  for (const point of result.points) {
    const dot = (point.right[0] - point.anchor[0]) * point.anchor[0] + (point.right[1] - point.anchor[1]) * point.anchor[1];
    near(dot, 0, 1e-6, "핸들은 반지름과 수직");
  }

  // 허용 오차 0이면 아무것도 지우지 않는다
  assert.strictEqual(api.removeAnchors(circle, 0, 4).points.length, 32, "허용 오차 0");
}

// 12. 앵커 제거: 모서리는 작은 허용 오차에서 남는다. 열린 패스 양 끝은 항상 남는다
{
  const square = { closed: true, points: [corner(0, 0), corner(100, 0), corner(100, 100), corner(0, 100)] };
  assert.strictEqual(api.removeAnchors(square, 0.5, 4).points.length, 4, "사각형 꼭짓점 유지");

  const open = { closed: false, points: [corner(0, 0), corner(50, 0), corner(100, 0)] };
  const kept = api.removeAnchors(open, 1, 2);
  assert.deepStrictEqual(kept.points[0].anchor, [0, 0], "시작점 유지");
  assert.deepStrictEqual(kept.points[kept.points.length - 1].anchor, [100, 0], "끝점 유지");
}

// 13. 앵커 제거는 원본 기준으로 오차를 잰다 — 연쇄 제거로 오차가 쌓이지 않는다
{
  const arc = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI;
    arc.push(corner(Math.cos(a) * 50, Math.sin(a) * 50));   // 핸들 없는 촘촘한 반원
  }
  const result = api.removeAnchors({ closed: false, points: arc }, 0.3, 2);
  assert.ok(result.points.length < 20, `반원 앵커 61 → ${result.points.length}`);
  // 원본 앵커 하나하나가 결과 곡선에서 허용 오차 안에 있다
  let worst = 0;
  for (const source of arc) {
    let best = Infinity;
    for (let i = 0; i < result.points.length - 1; i++) {
      const a = result.points[i];
      const b = result.points[i + 1];
      for (let k = 0; k <= 40; k++) {
        const p = api.bezierPoint(a.anchor, a.right, b.left, b.anchor, k / 40);
        best = Math.min(best, api.distance(p, source.anchor));
      }
    }
    worst = Math.max(worst, best);
  }
  assert.ok(worst <= 0.35, `원본 앵커와 결과 곡선의 거리 ${worst}`);
}

// 14. 전체 흐름: 앵커 제거만 켜면 나머지 단계 없이 원본 핸들 구조가 유지된다
{
  const circle = bezierCircle(32, 50);
  const result = api.processPathData(circle, options({ tolerance: 0, smoothStrength: 0, removeTolerance: 0.1 }));
  assert.ok(result.points.length < 32, "앵커가 줄었다");
  assert.ok(radiusError(result, 50) < 0.15, "곡선은 원 위에 남는다");
  const untouched = api.processPathData(circle, options({ tolerance: 0, smoothStrength: 0, removeTolerance: 0 }));
  assert.strictEqual(untouched, circle, "모두 0이면 원본 그대로");
}

// 15. 추천 허용 오차: 앵커 수가 급격히 줄다가 완만해지는 무릎점을 고른다
{
  const tolerances = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5];
  // 0.05까지 급격히 줄고 그 뒤로는 거의 안 줄어드는 곡선
  const counts = [30000, 20000, 6000, 5200, 4900, 4700, 4500, 4300];
  assert.strictEqual(api.suggestTolerance(tolerances, counts), 0.05, "무릎점");
  // 전혀 안 줄면 가장 작은 값
  assert.strictEqual(api.suggestTolerance(tolerances, counts.map(() => 100)), 0.01, "변화 없음");
  // 고르게 줄면(직선) 무릎이 없으므로 가장 보수적인 최소값
  const linear = tolerances.map((t) => 30000 - t * 50000);
  assert.strictEqual(api.suggestTolerance(tolerances, linear), 0.01, "직선이면 최소값");
}

console.log("check-smooth-path: ok");
