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

const names = ["planetRadii", "sunRadius", "rowLayout", "orbitLayout", "makeRandom", "arcPoints", "ringPoints"];
const lib = new Function(`${extractArray("PLANETS")}\nvar SUN_RADIUS = 109; var SATURN = 5;\n${names.map(extractFunction).join("\n")}\nreturn {PLANETS, ${names.join(",")}};`)();
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

// 일렬: 가장자리 사이가 간격만큼, 토성은 고리까지 자리를 잡는다, 태양 조각이 맨 왼쪽
{
  const radii = lib.planetRadii(2, true);
  const row = lib.rowLayout(radii, 3, 0);
  const half = (i) => (i === 5 ? radii[i] * 2.2 : radii[i]);
  for (let i = 1; i < 8; i++) {
    near(row.planets[i].x - half(i) - (row.planets[i - 1].x + half(i - 1)), 3, 1e-9, `gap ${i}`);
  }
  assert.strictEqual(row.sun, null);
  const withSun = lib.rowLayout(radii, 3, lib.sunRadius(2, true));
  assert.ok(withSun.sun.arc && withSun.sun.x + withSun.sun.r > 0, "visible sliver");
  near(withSun.planets[0].x - radii[0], withSun.sun.x + withSun.sun.r + 3, 1e-9, "first planet after the sun");
}

// 궤도: 바깥으로 갈수록 커지고, 행성은 제 궤도 위에 있으며 같은 번호면 같은 각
{
  const radii = lib.planetRadii(2, true);
  const orbit = lib.orbitLayout(radii, 5, 6, 3);
  for (let i = 0; i < 8; i++) {
    if (i > 0) assert.ok(orbit.orbits[i] > orbit.orbits[i - 1]);
    near(Math.hypot(orbit.planets[i].x, orbit.planets[i].y), orbit.orbits[i], 1e-9, "on orbit");
  }
  assert.deepStrictEqual(lib.orbitLayout(radii, 5, 6, 3).planets, orbit.planets);
}

// 고리: 닫힌 타원은 끝 점이 겹치지 않고, 앞 절반은 행성 가운데보다 아래로 내려간다
{
  const full = lib.ringPoints(0, 0, 10, 0, 2 * Math.PI);
  assert.strictEqual(full.length, 4);
  const front = lib.ringPoints(0, 0, 10, Math.PI, 2 * Math.PI);
  assert.ok(front.some((p) => p.anchor[1] < -4), "front half dips below the centre");
}
assert.ok(source.includes('var PREF_KEY = "ObjectSolarSystem/settings";'));
console.log("solar system checks passed");
