const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_SolarSystem.jsx"), "utf8");

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
function extractArray(name) {
  const start = source.indexOf(`var ${name} = [`);
  const end = source.indexOf("];", start);
  return source.slice(start, end + 2);
}

const names = ["planetRadii", "sunRadius", "rowLayout", "orbitLayout", "projectOrbit", "projectedOrbitArc", "depthOrder", "arcPoints", "ringPoints"];
const ringRatio = Number(source.match(/var SATURN_RING_RATIO = ([\d.]+);/)[1]);
assert.strictEqual(ringRatio, 1.7, "smaller Saturn ring");
const lib = new Function(`${extractArray("PLANETS")}\nvar SUN_RADIUS = 109; var SATURN = 5; var SATURN_RING_RATIO = ${ringRatio};\n${names.map(extractFunction).join("\n")}\nreturn {PLANETS, ${names.join(",")}};`)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);

// 반지름: 지구 기준 실제 비율, 완화는 제곱근
{
  const real = lib.planetRadii(2, false);
  assert.strictEqual(real.length, 8);
  near(real[2], 2, 1e-9, "earth");
  near(real[4], 2 * 11.21, 1e-9, "jupiter");
  const soft = lib.planetRadii(2, true);
  near(soft[4], 2 * Math.sqrt(11.21), 1e-9, "softened jupiter");
  assert.ok(soft[4] / soft[0] < real[4] / real[0], "softening shrinks the spread");
  near(lib.sunRadius(2, false), 218, 1e-9, "sun");
}

// 반원: 태양 오른쪽 궤도만 그리고, 0° 아래 → 90° 오른쪽 → 180° 위에 행성을 둔다
{
  const radii = lib.planetRadii(2, true);
  const angles = [0, 90, 180, 45, 135, 20, 160, 75];
  const orbit = lib.orbitLayout(radii, 5, 6, angles, 0, 0, true);
  near(orbit.planets[0].x, 0, 1e-9, "half lower x");
  near(orbit.planets[0].y, -orbit.orbits[0], 1e-9, "half lower end");
  near(orbit.planets[1].x, orbit.orbits[1], 1e-9, "half right centre");
  near(orbit.planets[2].y, orbit.orbits[2], 1e-9, "half upper end");
  for (const planet of orbit.planets) assert.ok(planet.x >= -1e-9, "planet stays on right half");
  const arc = lib.projectedOrbitArc(orbit.orbits[7], 60, 30);
  const lower = lib.projectOrbit(0, -orbit.orbits[7], 60, 30);
  const upper = lib.projectOrbit(0, orbit.orbits[7], 60, 30);
  near(arc[0].anchor[0], lower.x, 1e-9, "projected lower end x");
  near(arc[0].anchor[1], lower.y, 1e-9, "projected lower end y");
  near(arc[arc.length - 1].anchor[0], upper.x, 1e-9, "projected upper end x");
  near(arc[arc.length - 1].anchor[1], upper.y, 1e-9, "projected upper end y");
}

// 모두 동일: 수성 각도로 배치하며 다른 행성의 저장 각도는 건드리지 않는다
{
  const radii = lib.planetRadii(2, true);
  const angles = [45, 180, 270, 90, 10, 120, 300, 360];
  for (const half of [false, true]) {
    const orbit = lib.orbitLayout(radii, 5, 6, angles, 0, 0, half, true);
    const expected = (half ? angles[0] - 90 : angles[0]) * Math.PI / 180;
    for (let i = 0; i < angles.length; i++) {
      near(orbit.planets[i].x / orbit.orbits[i], Math.cos(expected), 1e-9, "shared angle x");
      near(orbit.planets[i].y / orbit.orbits[i], Math.sin(expected), 1e-9, "shared angle y");
    }
  }
  assert.deepStrictEqual(angles, [45, 180, 270, 90, 10, 120, 300, 360], "individual angles preserved");
}

// 일렬: 가장자리 사이가 간격만큼, 토성은 고리까지 자리를 잡는다, 태양 조각이 맨 왼쪽
{
  const radii = lib.planetRadii(2, true);
  const row = lib.rowLayout(radii, 3, 0);
  const half = (i) => (i === 5 ? radii[i] * ringRatio : radii[i]);
  for (let i = 1; i < 8; i++) {
    near(row.planets[i].x - half(i) - (row.planets[i - 1].x + half(i - 1)), 3, 1e-9, `gap ${i}`);
  }
  assert.strictEqual(row.sun, null);
  const withSun = lib.rowLayout(radii, 3, lib.sunRadius(2, true));
  assert.ok(withSun.sun.arc && withSun.sun.x + withSun.sun.r > 0, "visible sliver");
  near(withSun.planets[0].x - radii[0], withSun.sun.x + withSun.sun.r + 3, 1e-9, "first planet after the sun");
}

// 궤도: 바깥으로 갈수록 커지고, 행성은 제 궤도 위 제 각도(0° 오른쪽, 시계 반대)에 있다
{
  const radii = lib.planetRadii(2, true);
  const angles = [0, 90, 180, 270, 45, 135, 225, 315];
  const orbit = lib.orbitLayout(radii, 5, 6, angles, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (i > 0) assert.ok(orbit.orbits[i] > orbit.orbits[i - 1]);
    near(Math.hypot(orbit.planets[i].x, orbit.planets[i].y), orbit.orbits[i], 1e-9, "on orbit");
    const turn = Math.atan2(orbit.planets[i].y, orbit.planets[i].x) * 180 / Math.PI - angles[i];
    near(((turn % 360) + 540) % 360 - 180, 0, 1e-9, "at its angle");
    near(orbit.planets[i].depth, 0, 1e-9, "top view has no depth");
  }
  near(orbit.planets[0].x, orbit.orbits[0], 1e-9, "0° is to the right");
  near(orbit.planets[1].y, orbit.orbits[1], 1e-9, "90° is up");
}

// 시점: 기울기는 화면 y를 cos만큼 줄이고 위쪽(y > 0)을 멀리(깊이 −) 보낸다. 화면 회전은 그 뒤에 시계 반대로 돌린다
{
  const top = lib.projectOrbit(3, 4, 0, 0);
  assert.deepStrictEqual([top.x, top.y, top.depth], [3, 4, -0], "top view is identity");
  const tilted = lib.projectOrbit(3, 4, 60, 0);
  near(tilted.x, 3, 1e-9, "tilt keeps x");
  near(tilted.y, 4 * Math.cos(Math.PI / 3), 1e-9, "tilt squashes y");
  near(tilted.depth, -4 * Math.sin(Math.PI / 3), 1e-9, "upper half goes away from the viewer");
  assert.ok(lib.projectOrbit(0, -4, 60, 0).depth > 0, "lower half comes toward the viewer");
  const spun = lib.projectOrbit(3, 4, 60, 90);
  near(spun.x, -4 * Math.cos(Math.PI / 3), 1e-9, "spin 90° turns squashed y into −x");
  near(spun.y, 3, 1e-9, "spin 90° turns x into y");
  near(spun.depth, tilted.depth, 1e-9, "spin keeps depth");
  // 먼 것부터: 위쪽 행성(멀리) → 아래쪽 행성(가까이)
  const radii = lib.planetRadii(2, true);
  const angles = [90, 270, 0, 45, 315, 180, 135, 225];
  const placed = lib.orbitLayout(radii, 5, 6, angles, 60, 0);
  const order = lib.depthOrder(placed.planets);
  for (let i = 1; i < order.length; i++) assert.ok(placed.planets[order[i - 1]].depth <= placed.planets[order[i]].depth, "far to near");
  // 궤도면 y(= 반지름 × sin각)가 가장 큰 행성이 가장 멀고, 가장 작은 행성이 가장 가깝다
  const planeY = angles.map((a, i) => placed.orbits[i] * Math.sin(a * Math.PI / 180));
  assert.strictEqual(order[0], planeY.indexOf(Math.max(...planeY)), "largest plane y is farthest");
  assert.strictEqual(order[order.length - 1], planeY.indexOf(Math.min(...planeY)), "smallest plane y is nearest");
}

// 고리: 닫힌 타원은 끝 점이 겹치지 않고, 앞 절반은 행성 가운데보다 아래로 내려간다
{
  const full = lib.ringPoints(0, 0, 10, 0, 2 * Math.PI);
  assert.strictEqual(full.length, 4);
  near(full[0].anchor[0], 10 * ringRatio * Math.cos(15 * Math.PI / 180), 1e-9, "Saturn ring width");
  const front = lib.ringPoints(0, 0, 10, Math.PI, 2 * Math.PI);
  assert.ok(front.some((p) => p.anchor[1] < -4), "front half dips below the centre");
}
assert.ok(source.includes('var PREF_KEY = "ObjectSolarSystem/settings";'));
// 다이얼로그: 시점 두 행과 프리셋, 행성마다 각도 행과 무작위 버튼, 설정은 v4
assert.ok(source.includes('addValueRow(viewPanel, "위아래 기울기", "°", tiltDeg, TILT_RANGE[0], TILT_RANGE[1], 1, 0)'), "tilt row");
assert.ok(source.includes('addValueRow(viewPanel, "화면 회전", "°", spinDeg, SPIN_RANGE[0], SPIN_RANGE[1], 1, 0)'), "spin row");
assert.ok(source.includes('addValueRow(anglePanel, PLANETS[ar].name, "°", planetAngles[ar], ANGLE_RANGE[0], ANGLE_RANGE[1], 1, 0)'), "angle rows");
assert.ok(source.includes('add("button", undefined, "무작위")'), "shuffle button");
assert.ok(!source.includes("makeRandom") && !source.includes("seedRow"), "seed row removed");
assert.ok(source.includes('if (p[0] !== "v4" || p.length !== 18 + PLANETS.length) return;'), "settings v4");
console.log("solar system checks passed");
