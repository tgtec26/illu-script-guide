const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Galaxy.jsx"), "utf8");

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

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);

const names = ["makeRandom", "gaussian", "starSize", "galaxyTop", "galaxySide", "clusters", "clampDots"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

for (const build of [(s) => lib.galaxyTop(500, 100, 2, 0.8, s), (s) => lib.galaxySide(500, 100, s), (s) => lib.clusters(500, 100, s)]) {
  const a = build(3), b = build(3), c = build(4);
  assert.deepStrictEqual(a.dots, b.dots, "same seed, same stars");
  assert.notDeepStrictEqual(a.dots, c.dots, "different seed, different stars");
  assert.ok(a.dots.length >= 490 && a.dots.length <= 510, `star count ${a.dots.length}`);
  for (const d of a.dots) assert.ok(isFinite(d.x) && isFinite(d.y) && d.s > 0, "finite");
}
// 위·옆 모습: 모든 별이 지름 안, 태양계는 중심에서 반지름 60%
for (const g of [lib.galaxyTop(500, 100, 3, 1.2, 1), lib.galaxySide(500, 100, 1)]) {
  for (const d of g.dots) assert.ok(Math.hypot(d.x, d.y) <= 100 + 1e-9, "inside the disk");
  near(Math.hypot(g.sun[0], g.sun[1]), 60, 1e-9, "sun at 60%");
}
// 옆 모습 원반은 얇다: 원반 별(처음 60%)의 |y|는 대부분 반지름의 10% 아래
const side = lib.galaxySide(500, 100, 1);
const disk = side.dots.slice(0, 300);
assert.ok(disk.filter((d) => Math.abs(d.y) < 10).length > 290, "thin disk");
// 성단: 산개 성단은 왼쪽 10%, 구상 성단은 오른쪽 나머지이고 가운데가 빽빽하다
const cl = lib.clusters(500, 100, 1);
assert.strictEqual(cl.dots.filter((d) => d.x < 0).length, 50);
const globular = cl.dots.filter((d) => d.x > 0);
const coreShare = globular.filter((d) => Math.hypot(d.x - 60, d.y) < 15).length / globular.length;
// 반지름 15(성단 반지름의 30%) 안: 고르게 흩으면 9%, 가운데로 모이면 그보다 훨씬 많다
assert.ok(coreShare > 0.3, `globular cluster is concentrated: ${coreShare}`);
assert.ok(source.includes('var PREF_KEY = "ObjectGalaxy/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 16'), "settings field count");
console.log("galaxy checks passed");
