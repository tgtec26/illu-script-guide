const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 피스톤 실린더.jsx에서 읽기·배치 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "피스톤 실린더.jsx"), "utf8");
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced: ${name}`);
}
const names = ["splitNames", "clampPositions", "seededRandom", "spreadDots", "drawPiston"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { chambers: 2, length: 45, height: 14, pistonMm: 1.2, pos1: 50, pos2: 75, showDots: true, dots: 6, dotMm: 0.8, seed: 1,
  showNames: true, chamberNames: "A, B, C", cylLabel: "단열된 실린더", pistLabel: "단열된 피스톤", font: 8, heat: false, arrowMm: 8,
  wBody: 1, wObj: 0, wRope: 0.4 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["rect", "dot", "line", "arrow", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawPiston(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const minDistance = (pts) => {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) best = Math.min(best, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  return best;
};

// 피스톤 위치: 칸 수 − 1개, 5~95로 막고 앞 피스톤보다 8% 이상 오른쪽
assert.deepStrictEqual(f.clampPositions([50, 75], 2), [50]);
assert.deepStrictEqual(f.clampPositions([30, 70], 3), [30, 70]);
assert.deepStrictEqual(f.clampPositions([97, 99], 3), [95, 95]);
assert.deepStrictEqual(f.clampPositions([40, 42], 3), [40, 48]);
assert.deepStrictEqual(f.clampPositions([1, 2], 2), [5]);
assert.strictEqual(f.seededRandom(3)(), f.seededRandom(3)());

// 점 배치: 칸 안에 고르게 퍼진다 (가장 가까운 두 점 사이가 같은 면적 격자 간격의 절반 이상). 번호가 다르면 모양이 다르다
const W = 40, H = 12, N = 6, even = Math.sqrt(W * H / N);
for (const seed of [1, 2, 3, 7, 50]) {
  const pts = f.spreadDots(f.seededRandom(seed), 0, W, 0, H, N, null);
  assert.strictEqual(pts.length, N, `seed ${seed}: count`);
  assert.ok(pts.every((p) => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H), `seed ${seed}: inside`);
  assert.ok(minDistance(pts) > even * 0.5, `seed ${seed}: spread ${minDistance(pts).toFixed(2)} vs ${(even * 0.5).toFixed(2)}`);
  // 한쪽으로 쏠리지 않는다: 왼쪽 절반·오른쪽 절반에 모두 있다
  assert.ok(pts.filter((p) => p[0] < W / 2).length >= 2 && pts.filter((p) => p[0] >= W / 2).length >= 2, `seed ${seed}: both halves`);
}
assert.notDeepStrictEqual(f.spreadDots(f.seededRandom(1), 0, W, 0, H, N, null), f.spreadDots(f.seededRandom(2), 0, W, 0, H, N, null));
// 비울 영역(칸 이름 자리)에는 점이 없다
const avoid = { x: 20, y: 6, rx: 5, ry: 4 };
f.spreadDots(f.seededRandom(1), 0, W, 0, H, 12, avoid).forEach((p) => assert.ok(Math.abs(p[0] - 20) >= 5 || Math.abs(p[1] - 6) >= 4, "avoid the label"));
// 점이 많아도 후보가 모자라지 않는 한 요청한 수만큼
assert.strictEqual(f.spreadDots(f.seededRandom(1), 0, W, 0, H, 30, null).length, 30);

// 한 장면, 칸 둘: 실린더 상자 1개, 피스톤 1개(50%), 칸 이름 A·B, 점 6개씩
let calls = run({});
const boxes = calls.filter((c) => c.k === "rect" && c.a[4] === null);
assert.strictEqual(boxes.length, 1, "실린더 하나");
near(boxes[0].a[2], 45 * MM, "실린더 길이"); near(boxes[0].a[1] - boxes[0].a[3], 14 * MM, "실린더 높이");
const pistons = calls.filter((c) => c.k === "rect" && c.a[4] === 100);
assert.strictEqual(pistons.length, 1);
near((pistons[0].a[0] + pistons[0].a[2]) / 2, 0.5 * 45 * MM, "피스톤 50%");
near(pistons[0].a[2] - pistons[0].a[0], 1.2 * MM, "피스톤 두께");
assert.deepStrictEqual(calls.filter((c) => c.k === "text" && c.a[4] === "center").map((c) => c.a[0]), ["A", "B", "단열된 실린더", "단열된 피스톤"]);
const dots = calls.filter((c) => c.k === "dot");
assert.strictEqual(dots.length, 12);
assert.ok(dots.slice(0, 6).every((d) => d.a[0] > 0 && d.a[0] < pistons[0].a[0]), "A칸 점은 왼쪽 벽과 피스톤 사이");
assert.ok(dots.slice(6).every((d) => d.a[0] > pistons[0].a[2] && d.a[0] < 45 * MM), "B칸 점은 피스톤과 오른쪽 벽 사이");
// 열 Q 화살표는 켰을 때만
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 0);
calls = run({ heat: true });
const heat = calls.filter((c) => c.k === "arrow");
assert.strictEqual(heat.length, 1);
near(heat[0].a[1][0], 0, "화살표 끝은 왼쪽 벽"); near(heat[0].a[1][1], -7 * MM, "가운데 높이");
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "Q" && c.a[5].italic));
// 점 끄기, 칸 3개, 이름 끄기
assert.strictEqual(run({ showDots: false }).filter((c) => c.k === "dot").length, 0);
calls = run({ chambers: 3, pos1: 34, pos2: 67 });
assert.strictEqual(calls.filter((c) => c.k === "rect" && c.a[4] === 100).length, 2, "칸 3개면 피스톤 2개");
assert.deepStrictEqual(calls.filter((c) => c.k === "text" && c.a[4] === "center").slice(0, 3).map((c) => c.a[0]), ["A", "B", "C"]);
assert.strictEqual(run({ showNames: false }).filter((c) => c.k === "text" && /^[ABC]$/.test(c.a[0])).length, 0);
// 지시선: 글자 둘과 지시선 둘(실린더 윗변까지), 피스톤이 왼쪽에 붙으면 글자가 겹치지 않는다
calls = run({ pos1: 20 });
const labels = calls.filter((c) => c.k === "text" && /^단열된/.test(c.a[0]));
assert.strictEqual(labels.length, 2);
assert.ok(calls.filter((c) => c.k === "line").every((c) => c.a[1][1] === 0), "지시선은 실린더 윗변까지");
const cyl = labels.find((c) => c.a[0] === "단열된 실린더"), pis = labels.find((c) => c.a[0] === "단열된 피스톤");
assert.ok(Math.abs(cyl.a[1] - pis.a[1]) > 7 * 8 * 0.9 * 0.9 || pis.a[2] > cyl.a[2], "글자가 겹치지 않거나 위로 올림");
assert.strictEqual(run({ cylLabel: "", pistLabel: "" }).filter((c) => c.k === "line").length, 0);
console.log("piston cylinder checks passed");
