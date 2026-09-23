const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_ParticleState.jsx"), "utf8");

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

const names = ["makeRandom", "latticeFill", "scatterGas", "pickSome", "circleInside", "pointInPolygon", "distanceToSegment", "bezierPoints"];
const lib = new Function(`var MAX_PARTICLES = 3000;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const square = [[0, 0], [100, 0], [100, 80], [0, 80]];
const bounds = [0, 80, 100, 0];   // [left, top, right, bottom]
const r = 4;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// 안쪽 판정
assert.ok(lib.pointInPolygon(square, 50, 40));
assert.ok(!lib.pointInPolygon(square, 150, 40));
assert.ok(lib.circleInside(square, 50, 40, r));
assert.ok(!lib.circleInside(square, 2, 40, r), "circle crossing the edge");
assert.ok(Math.abs(lib.distanceToSegment(5, 5, [0, 0], [10, 0]) - 5) < 1e-9);

// 베지어를 펴면 끝점이 다음 앵커와 같고, 직선 핸들이면 곧은 점들
{
  const pts = lib.bezierPoints([0, 0], [10, 0], [20, 0], [30, 0], 4);
  assert.strictEqual(pts.length, 4);
  assert.deepStrictEqual(pts[3], [30, 0]);
  for (const p of pts) assert.strictEqual(p[1], 0);
}

// 고체: 겹치지 않는 촘촘한 격자, 채우는 높이 아래, 모두 안쪽
{
  const pts = lib.latticeFill(square, bounds, 40, r, 2 * r * 1.02, 0, 0, lib.makeRandom(1));
  assert.ok(pts.length > 20);
  for (const p of pts) {
    assert.ok(lib.circleInside(square, p[0], p[1], r));
    assert.ok(p[1] + r <= 40 + 0.01, "below fill level");
  }
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) assert.ok(dist(pts[i], pts[j]) >= 2 * r - 1e-9, "solid overlap");
  // 밀리지 않은 첫 줄은 가로 가운데
  const row0 = pts.filter((p) => Math.abs(p[1] - pts[0][1]) < 1e-9);
  const xs = row0.map((p) => p[0]);
  assert.ok(Math.abs((Math.min(...xs) - r - 0) - (100 - Math.max(...xs) - r)) < 1e-6, "first row centred");
}

// 액체: 흔들고 빼서 고체보다 적고, 같은 번호면 같은 결과
{
  const solid = lib.latticeFill(square, bounds, 40, r, 2 * r * 1.02, 0, 0, lib.makeRandom(1));
  const liquid = lib.latticeFill(square, bounds, 40, r, 2 * r * 1.16, 0.05, 0.12, lib.makeRandom(2));
  assert.ok(liquid.length < solid.length && liquid.length > solid.length / 3);
  assert.deepStrictEqual(lib.latticeFill(square, bounds, 40, r, 2 * r * 1.16, 0.05, 0.12, lib.makeRandom(2)), liquid);
  for (const p of liquid) assert.ok(lib.circleInside(square, p[0], p[1], r));
  for (let i = 0; i < liquid.length; i++) for (let j = i + 1; j < liquid.length; j++) assert.ok(dist(liquid[i], liquid[j]) >= 2 * r - 1e-9, "liquid overlap");
}

// 기체: 개수만큼, 서로 지름 2.5배 이상 떨어짐. 자리가 모자라면 적게
{
  const gas = lib.scatterGas(square, bounds, 2, 12, lib.makeRandom(5));
  assert.strictEqual(gas.length, 12);
  for (let i = 0; i < gas.length; i++) for (let j = i + 1; j < gas.length; j++) assert.ok(dist(gas[i], gas[j]) >= 10 - 1e-9);
  const crowded = lib.scatterGas(square, bounds, 4, 300, lib.makeRandom(5));
  assert.ok(crowded.length < 300 && crowded.length > 0);
}

// 원 모양(다각형으로 편 것)에도 밖으로 나가지 않는다
{
  const circle = [];
  for (let i = 0; i < 64; i++) circle.push([50 + 40 * Math.cos(i / 64 * 2 * Math.PI), 40 + 40 * Math.sin(i / 64 * 2 * Math.PI)]);
  const pts = lib.latticeFill(circle, [10, 80, 90, 0], 80, 3, 6.12, 0, 0, lib.makeRandom(1));
  for (const p of pts) assert.ok(Math.hypot(p[0] - 50, p[1] - 40) <= 40 - 3 + 1e-6);
}

// 비율만큼 서로 다른 번호
{
  const picks = lib.pickSome(20, 0.25, lib.makeRandom(3));
  assert.strictEqual(picks.length, 5);
  assert.strictEqual(new Set(picks).size, 5);
}
assert.ok(source.includes('var PREF_KEY = "ObjectParticleState/settings";'));
console.log("particle state checks passed");
