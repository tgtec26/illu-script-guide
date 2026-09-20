const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_PatternFill.jsx");
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

const helpers = new Function(
  `${["hatchLines", "gridLines", "dotCenters"].map(extractFunction).join("\n")}
   return { hatchLines, gridLines, dotCenters };`
)();
const { hatchLines, gridLines, dotCenters } = helpers;

function near(a, b, label) {
  assert.ok(Math.abs(a - b) < 1e-6, `${label}: expected ${b}, got ${a}`);
}
// 선의 법선 방향 오프셋 (중심 기준, 선에 수직인 거리)
function offset(line, angleDeg, cx, cy) {
  const rad = (angleDeg * Math.PI) / 180;
  const nx = -Math.sin(rad), ny = Math.cos(rad);
  return (line[0][0] - cx) * nx + (line[0][1] - cy) * ny;
}

// bounds = [left, top, right, bottom]
const square = [0, 10, 10, 0];
const rect = [0, 6, 20, 0];

// 사선 45°, 정사각형: 대각선 S√2 를 4등분 → 선 3개, 간격 S√2/4, 중심 대칭
{
  const lines = hatchLines(square, 45, 4);
  assert.strictEqual(lines.length, 3, "hatch 45: divisions−1 lines");
  const offsets = lines.map((l) => offset(l, 45, 5, 5)).sort((a, b) => a - b);
  const step = (10 * Math.SQRT2) / 4;
  near(offsets[0], -step, "hatch 45: first offset");
  near(offsets[1], 0, "hatch 45: middle line through center");
  near(offsets[2], step, "hatch 45: last offset");
  // 선은 45° 방향이고 상자를 덮는 길이다
  for (const [a, b] of lines) {
    near(b[1] - a[1], b[0] - a[0], "hatch 45: direction /");
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) >= 10 * Math.SQRT2 - 1e-6, "hatch 45: covers diagonal");
  }
}

// 사선 0°: 수평선, 높이를 등분
{
  const lines = hatchLines(rect, 0, 3);
  assert.strictEqual(lines.length, 2, "hatch 0: two lines");
  const ys = lines.map((l) => l[0][1]).sort((a, b) => a - b);
  near(ys[0], 2, "hatch 0: y = H/3");
  near(ys[1], 4, "hatch 0: y = 2H/3");
  for (const [a, b] of lines) near(a[1], b[1], "hatch 0: horizontal");
}

// 사선 90°: 수직선, 너비를 등분
{
  const lines = hatchLines(rect, 90, 4);
  const xs = lines.map((l) => l[0][0]).sort((a, b) => a - b);
  assert.deepStrictEqual(xs.map((x) => Math.round(x * 1e6) / 1e6), [5, 10, 15], "hatch 90: x = W/4 multiples");
  for (const [a, b] of lines) near(a[0], b[0], "hatch 90: vertical");
}

// 사선: 짝수·홀수 분할 모두 중심 대칭, 간격 = E/분할
{
  for (const divisions of [2, 5, 8]) {
    const lines = hatchLines(rect, 30, divisions);
    assert.strictEqual(lines.length, divisions - 1, `hatch 30/${divisions}: count`);
    const offsets = lines.map((l) => offset(l, 30, 10, 3)).sort((a, b) => a - b);
    const extent = 20 * Math.sin(Math.PI / 6) + 6 * Math.cos(Math.PI / 6);
    for (let k = 0; k < offsets.length; k++) {
      near(offsets[k], (k + 1 - divisions / 2) * extent / divisions, `hatch 30/${divisions}: offset ${k}`);
    }
  }
}

// 모눈 4×2: 세로선 3개 (x = 5, 10, 15), 가로선 1개 (y = 3)
{
  const lines = gridLines(rect, 4, 2);
  assert.strictEqual(lines.length, 4, "grid: 3 + 1 lines");
  const vertical = lines.filter(([a, b]) => a[0] === b[0]).map(([a]) => a[0]).sort((a, b) => a - b);
  const horizontal = lines.filter(([a, b]) => a[1] === b[1]).map(([a]) => a[1]);
  assert.deepStrictEqual(vertical, [5, 10, 15], "grid: vertical positions");
  assert.deepStrictEqual(horizontal, [3], "grid: horizontal position");
  for (const [a, b] of lines) {
    if (a[0] === b[0]) { near(a[1], 6, "grid: vertical spans top"); near(b[1], 0, "grid: vertical spans bottom"); }
    else { near(a[0], 0, "grid: horizontal spans left"); near(b[0], 20, "grid: horizontal spans right"); }
  }
  // 1분할은 그 방향 선 없음
  assert.strictEqual(gridLines(rect, 1, 3).length, 2, "grid 1×3: horizontal only");
}

// 점 격자: 중심이 상자 안, 중심점 포함, 간격 유지
{
  const centers = dotCenters(square, 2, false, 10000);
  assert.ok(centers.some(([x, y]) => x === 5 && y === 5), "dots: lattice through center");
  for (const [x, y] of centers) {
    assert.ok(x >= 0 && x <= 10 && y >= 0 && y <= 10, "dots: center inside bounds");
    near(((x - 5) / 2) % 1, 0, "dots: x on lattice");
    near(((y - 5) / 2) % 1, 0, "dots: y on lattice");
  }
  // 반지름 5 / 간격 2 → 양쪽 2칸씩 = 5열 × 5행 (가장자리 x=1,3,5,7,9)
  assert.strictEqual(centers.length, 25, "dots: 5×5");
}

// 점 엇갈림: 홀수 행은 반 칸 이동, 행 간격 S·√3/2
{
  const s = 2;
  const centers = dotCenters(square, s, true, 10000);
  const rowStep = (s * Math.sqrt(3)) / 2;
  const rows = {};
  for (const [x, y] of centers) {
    const r = Math.round((y - 5) / rowStep);
    near(y - 5, r * rowStep, "stagger: row on lattice");
    (rows[r] = rows[r] || []).push(x);
  }
  for (const r of Object.keys(rows)) {
    const shift = Number(r) % 2 === 0 ? 0 : s / 2;
    for (const x of rows[r]) near(((x - 5 - shift) / s) % 1, 0, `stagger: row ${r} shifted by ${shift}`);
  }
  assert.ok(Object.keys(rows).length >= 5, "stagger: several rows");
}

// 점 개수 한도: 넘으면 null (루프 전에 어림잡아 판단하므로 한도보다 조금 보수적이다)
{
  assert.strictEqual(dotCenters([0, 1000, 1000, 0], 1, false, 4000), null, "dots: limit exceeded → null");
  assert.ok(dotCenters(square, 2, false, 100) !== null, "dots: under limit passes");
}

console.log("pattern fill: ok");
