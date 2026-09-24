const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_LightMixing.jsx"), "utf8");

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

const names = ["primaryCenters", "circlesBounds", "regionPoint", "prismVertices", "refract", "rotate", "prismRays"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// 삼원색: 정삼각형, 중심 간격 = 지름 × 비율, 무게중심이 원점
{
  const c = lib.primaryCenters(20, 0.55);
  for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) near(dist(c[a], c[b]), 22, 1e-9, "side");
  near((c[0][1] + c[1][1] + c[2][1]) / 3, 0, 1e-9, "centroid y");
  assert.ok(c[0][1] > 0 && c[1][0] < 0 && c[2][0] > 0, "red top, green left, blue right");
  // 일곱 영역의 글자 자리는 그 영역 안
  const combos = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]];
  for (const ratio of [0.3, 0.55, 0.85]) {
    const centers = lib.primaryCenters(20, ratio);
    for (const combo of combos) {
      const inside = combo.map(Boolean);
      const p = lib.regionPoint(centers, 20, inside);
      for (let i = 0; i < 3; i++) assert.strictEqual(dist(p, centers[i]) < 20, inside[i], `ratio ${ratio}, region ${combo}`);
    }
  }
}

// 프리즘: 정삼각형, 왼쪽 면 가운데로 들어가 스넬 법칙대로 꺾이고 오른쪽 면으로 나온다
{
  const v = lib.prismVertices(40);
  near(dist(v[0], v[1]), 40, 1e-9, "side");
  near(dist(v[1], v[2]), 40, 1e-9, "base");
  const rays = lib.prismRays(40, 50, 1.5, 12, 7, 30);
  assert.ok(rays, "rays exist");
  const entry = rays.inside[0], exit = rays.inside[1];
  near(entry[0], (v[0][0] + v[1][0]) / 2, 1e-9, "entry at the left face middle");
  // 나가는 점은 오른쪽 면 위
  const cross = (v[2][0] - v[0][0]) * (exit[1] - v[0][1]) - (v[2][1] - v[0][1]) * (exit[0] - v[0][0]);
  near(cross, 0, 1e-6, "exit on the right face");
  // 입사각 50°, 굴절각 asin(sin 50° / 1.5)
  const unit = (a, b) => { const d = dist(a, b); return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
  const inNormal = [Math.sqrt(3) / 2, -0.5];
  const dIn = unit(rays.incoming[0], entry), dInside = unit(entry, exit);
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * 180 / Math.PI;
  near(angle(dIn, inNormal), 50, 1e-6, "incidence");
  near(Math.sin(angle(dInside, inNormal) * Math.PI / 180), Math.sin(50 * Math.PI / 180) / 1.5, 1e-9, "Snell at entry");
  // 빨간색(첫 광선)은 물리 굴절 그대로: 최소 편향 근처에서 나가는 각 ≈ 47.2°
  const outNormal = [Math.sqrt(3) / 2, 0.5];
  const red = unit(rays.out[0][0], rays.out[0][1]);
  near(angle(red, outNormal), 47.2, 0.1, "exit angle for red");
  // 보라색으로 갈수록 아래(프리즘 밑변 쪽)로 더 꺾이고, 빨강–보라 차이가 퍼짐 각
  const heading = (seg) => Math.atan2(seg[1][1] - seg[0][1], seg[1][0] - seg[0][0]) * 180 / Math.PI;
  for (let i = 1; i < 7; i++) assert.ok(heading(rays.out[i]) < heading(rays.out[i - 1]), "violet bends more");
  near(heading(rays.out[0]) - heading(rays.out[6]), 12, 1e-9, "spread");
  near(dist(rays.out[3][0], rays.out[3][1]), 30, 1e-9, "ray length");
  // 입사각 범위(30~80°) 안에서는 전반사 없이 나온다
  for (let i = 30; i <= 80; i += 5) assert.ok(lib.prismRays(40, i, 1.5, 12, 7, 30), `incidence ${i}`);
}

assert.ok(source.includes('var PREF_KEY = "ObjectLightMixing/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 15'), "settings field count");
console.log("light mixing checks passed");
