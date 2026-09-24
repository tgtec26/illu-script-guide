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

const names = ["parallaxGeometry", "arcBetween", "brightnessScreens", "project"];
const lib = new Function(
  "var OBLIQUE = [0.5 * Math.SQRT1_2, 0.5 * Math.SQRT1_2];\n" +
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

// 연주 시차: 지구 두 개가 궤도 양 끝, 별은 태양 위, 보이는 위치는 지구–별 직선 위에서 배경 줄 높이
{
  const g = lib.parallaxGeometry(20, 70, 0.35, 20);
  assert.deepStrictEqual(g.earths, [[-20, 0], [20, 0]]);
  assert.deepStrictEqual(g.star, [0, 70]);
  near(g.orbitHeight, 14, 1e-9, "flattened orbit");
  for (let i = 0; i < 2; i++) {
    near(g.apparent[i][1], 90, 1e-9, "apparent on the background row");
    near(cross(g.earths[i], g.star, g.apparent[i]), 0, 1e-9, "apparent on the line of sight");
  }
  // 왼쪽 지구에서 보면 별이 오른쪽 배경에, 오른쪽 지구에서 보면 왼쪽 배경에
  assert.ok(g.apparent[0][0] > 0 && g.apparent[1][0] < 0);
  assert.strictEqual(g.background.length, 7);
  // p 호: 별에서 아래(태양) → 오른쪽 지구, 크기는 atan(궤도 / 거리)
  const arc = lib.arcBetween(g.star, [0, -1], g.earths[1]);
  near(Math.abs(arc.end - arc.start), Math.atan(20 / 70), 1e-9, "parallax angle");
  const both = lib.arcBetween(g.star, [g.earths[0][0] - g.star[0], g.earths[0][1] - g.star[1]], g.earths[1]);
  near(Math.abs(both.end - both.start), 2 * Math.atan(20 / 70), 1e-9, "2p");
}

// 거리와 밝기: n번째 화면은 n배 거리, n배 변, n×n칸, 모든 꼭짓점이 광원–마지막 꼭짓점 직선 위
{
  const screens = lib.brightnessScreens(25, 8, 3);
  assert.deepStrictEqual(screens.map((s) => s.x), [25, 50, 75]);
  near(screens[2].corners[1][1] - screens[2].corners[0][1], 24, 1e-9, "front edge is 3× side");
  assert.deepStrictEqual(screens.map((s) => s.grid.length), [0, 2, 4], "n−1 lines each way");
  const last = screens[2].corners;
  for (const screen of screens) {
    for (let c = 0; c < 4; c++) near(cross([0, 0], last[c], screen.corners[c]), 0, 1e-9, "corner on the light line");
  }
  // 화면 넓이(투영 평행사변형)는 거리의 제곱에 비례
  const area = (q) => Math.abs(cross(q[0], q[1], q[2]));
  near(area(screens[1].corners) / area(screens[0].corners), 4, 1e-9, "2r → 4×");
  near(area(screens[2].corners) / area(screens[0].corners), 9, 1e-9, "3r → 9×");
}

assert.ok(source.includes('var PREF_KEY = "ObjectParallax/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 18'), "settings field count");
console.log("parallax checks passed");
