const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_MoonPhase.jsx"), "utf8");

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

const names = ["halfDisk", "litShape", "eclipseGeometry"];
const lib = new Function(`var KAPPA = 0.5522847498;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const bezierAt = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
};
// 닫힌 베지어 다각형의 넓이 (조각마다 32등분)
const areaOf = (pts) => {
  const poly = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    for (let s = 0; s < 32; s++) poly.push(bezierAt(a.anchor, a.right, b.left, b.anchor, s / 32));
  }
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
};
const disk = Math.PI * 100;   // r = 10

// 밝은 부분 넓이 = 원 넓이 × (1 - cos θ) / 2
assert.strictEqual(lib.litShape(0, 0, 10, 0), null, "new moon has no lit part");
for (const phase of [45, 90, 135, 180, 225, 270, 315]) {
  const expected = disk * (1 - Math.cos(phase * Math.PI / 180)) / 2;
  near(areaOf(lib.litShape(0, 0, 10, phase)), expected, disk * 0.01, `lit area at ${phase}°`);
}
// 차는 달은 오른쪽, 기우는 달은 왼쪽이 밝다
assert.ok(lib.litShape(0, 0, 10, 90)[1].anchor[0] > 0, "first quarter lit on the right");
assert.ok(lib.litShape(0, 0, 10, 270)[1].anchor[0] < 0, "last quarter lit on the left");

// 반원: 방향 쪽 절반, 넓이는 원의 절반
{
  const half = lib.halfDisk(0, 0, 10, Math.PI);
  assert.ok(half[1].anchor[0] < 0, "points toward the angle");
  near(areaOf(half), disk / 2, disk * 0.01, "half disk area");
}

// 일식: 태양–달–지구, 본그림자 꼭짓점이 지구 표면 안쪽. 월식: 태양–지구–달, 달이 본그림자 안에 든다
{
  const solar = lib.eclipseGeometry(100, true);
  assert.ok(solar.sun.x < solar.moon.x && solar.moon.x < solar.earth.x && solar.moon.r < solar.earth.r);
  const apex = solar.umbra[1][0];
  assert.ok(apex > solar.earth.x - solar.earth.r && apex < solar.earth.x, "umbra reaches the earth");
  const lunar = lib.eclipseGeometry(100, false);
  assert.ok(lunar.sun.x < lunar.earth.x && lunar.earth.x < lunar.moon.x);
  const [top, tip] = [lunar.umbra[0], lunar.umbra[1]];
  const halfHeight = top[1] * (tip[0] - lunar.moon.x) / (tip[0] - top[0]);
  assert.ok(halfHeight >= lunar.moon.r, "moon inside the umbra");
  // 반그림자는 멀어질수록 넓어지고, 광선은 태양 가장자리에서 시작한다
  assert.ok(lunar.penumbra[1][1] > lunar.penumbra[0][1] && lunar.penumbra[2][1] < lunar.penumbra[3][1]);
  assert.strictEqual(lunar.rays.length, 4);
  for (const ray of lunar.rays) near(Math.abs(ray[0][1]), lunar.sun.r, 1e-9, "ray starts on the sun edge");
}
assert.ok(source.includes('var PREF_KEY = "ObjectMoonPhase/settings";'));
assert.ok(source.includes('p[0] !== "v2" || p.length !== 21'), "settings field count");
console.log("moon phase checks passed");
