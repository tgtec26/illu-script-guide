const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Parallax.jsx"), "utf8");

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

const names = ["parallaxGeometry", "dist", "makeRandom", "arcBetween", "brightnessScreens", "viewMatrix", "multiply", "makeProjector", "viewerX"];
const lib = new Function(
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

// 연주 시차: 지구 두 개가 궤도 양 끝, 별은 태양 위, 보이는 위치는 지구–별 직선 위에서 배경 줄 높이
{
  const g = lib.parallaxGeometry(20, 70, 0.35, 20, 7, 1, 5);
  assert.deepStrictEqual(g.earths, [[-20, 0], [20, 0]]);
  assert.deepStrictEqual(g.star, [0, 70]);
  near(g.orbitHeight, 14, 1e-9, "flattened orbit");
  for (let i = 0; i < 2; i++) {
    near(g.apparent[i][1], 90, 1e-9, "apparent on the background row");
    near(cross(g.earths[i], g.star, g.apparent[i]), 0, 1e-9, "apparent on the line of sight");
  }
  // 왼쪽 지구에서 보면 별이 오른쪽 배경에, 오른쪽 지구에서 보면 왼쪽 배경에
  assert.ok(g.apparent[0][0] > 0 && g.apparent[1][0] < 0);
  // 배경 별: 배치 번호로 흩고, 크기는 별 반지름의 35~85%, 서로·보이는 위치와 겹치지 않는다
  assert.ok(g.background.length >= 6 && g.background.length <= 7, `background count ${g.background.length}`);
  for (const b of g.background) {
    assert.ok(b.r >= 5 * 0.35 - 1e-9 && b.r <= 5 * 0.85 + 1e-9, "size range");
    assert.ok(Math.abs(b.p[1] - 90) <= 20 * 0.4 + 1e-9, "around the background row");
    for (const a of g.apparent) assert.ok(lib.dist(b.p, a) > 5 * 1.6 + b.r, "clear of the apparent positions");
  }
  for (let i = 0; i < g.background.length; i++) for (let j = 0; j < i; j++) {
    assert.ok(lib.dist(g.background[i].p, g.background[j].p) > g.background[i].r + g.background[j].r, "background stars do not overlap");
  }
  assert.deepStrictEqual(lib.parallaxGeometry(20, 70, 0.35, 20, 7, 1, 5).background, g.background, "same seed, same stars");
  assert.notDeepStrictEqual(lib.parallaxGeometry(20, 70, 0.35, 20, 7, 2, 5).background, g.background, "new seed, new stars");
  // p 호: 별에서 아래(태양) → 오른쪽 지구, 크기는 atan(궤도 / 거리)
  const arc = lib.arcBetween(g.star, [0, -1], g.earths[1]);
  near(Math.abs(arc.end - arc.start), Math.atan(20 / 70), 1e-9, "parallax angle");
  const both = lib.arcBetween(g.star, [g.earths[0][0] - g.star[0], g.earths[0][1] - g.star[1]], g.earths[1]);
  near(Math.abs(both.end - both.start), 2 * Math.atan(20 / 70), 1e-9, "2p");
}

// 거리와 밝기: n번째 화면은 n배 거리, n배 변, n×n칸, 모든 꼭짓점이 광원–마지막 꼭짓점 직선 위 (3차원)
{
  const screens = lib.brightnessScreens(25, 8, 3);
  assert.deepStrictEqual(screens.map((s) => s.x), [25, 50, 75]);
  near(screens[2].corners[1][1] - screens[2].corners[0][1], 24, 1e-9, "edge is 3× side");
  assert.deepStrictEqual(screens.map((s) => s.grid.length), [0, 2, 4], "n−1 lines each way");
  const last = screens[2].corners;
  for (const screen of screens) for (let c = 0; c < 4; c++) {
    const k = screen.x / 75;
    for (let a = 0; a < 3; a++) near(screen.corners[c][a], last[c][a] * k, 1e-9, "corner on the light line");
  }
  const center = [50, 0, 0];
  // 정면: 돌리지 않으면 x 오른쪽, y 위, z는 사라진다
  const front = lib.makeProjector(lib.viewMatrix(0, 0, 0), center, 0);
  assert.deepStrictEqual(front([75, 12, -12]), [25, 12]);
  // 측면(가로 90°): 광원 쪽에서 본다. 눈은 x 음수 쪽 → 먼 화면부터 그린다
  const side = lib.viewMatrix(90, 0, 0);
  assert.ok(lib.viewerX(side, center, 0) < -1e6);
  const sideP = lib.makeProjector(side, center, 0);
  near(sideP([75, 0, 0])[0], 0, 1e-9, "x axis collapses to a point");
  // 기본 시점(가로 30°)도 광원 쪽에서 비껴 본다: 화면 앞면이 보인다
  assert.ok(lib.viewerX(lib.viewMatrix(30, 15, 0), center, 0) < 0);
  // 윗면(기울기 90°): 위에서 내려다본다. z 앞쪽이 화면 아래로
  const top = lib.makeProjector(lib.viewMatrix(0, 90, 0), center, 0);
  near(top([50, 0, 10])[1], -10, 1e-9, "top view");
  // 원근: 눈에 가까운 쪽이 더 크다
  const persp = lib.makeProjector(lib.viewMatrix(0, 0, 0), center, 100);
  assert.ok(persp([50, 10, 20])[1] > persp([50, 10, -20])[1]);
  // 원근 눈 위치: 가로 90°면 눈이 center에서 x로 −eyeZ
  near(lib.viewerX(side, center, 100), -50, 1e-9, "perspective eye");
}

assert.ok(source.includes('var PREF_KEY = "ObjectParallax/settings";'));
assert.ok(source.includes('p[0] !== "v3" || p.length !== 29'), "settings field count");
console.log("parallax checks passed");
