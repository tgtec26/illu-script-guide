const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_PlateBoundary.jsx"), "utf8");

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

const names = ["plateScene", "divergent", "subduction", "collision", "transform"];
const lib = new Function("var MM = 2.834645669, OCEAN_K = 25, CONTINENT_K = 45, CONTINENT2_K = 35, MANTLE_K = 8, MAGMA_K = 65;\n" +
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const W = 340, t = 22.7, mantle = 70.9, relief = 22.7;
for (let kind = 0; kind < 4; kind++) {
  const scene = lib.plateScene(kind, W, t, 35, relief, mantle, true);
  assert.ok(scene.shapes.length > 0 && scene.labels.length > 0, `kind ${kind} draws`);
  for (const s of scene.shapes) for (const p of s.points) {
    assert.ok(isFinite(p[0]) && isFinite(p[1]), "finite");
    assert.ok(Math.abs(p[0]) <= W / 2 + 1e-6, `kind ${kind}: inside the width`);
  }
}
// 섭입형: 섭입 판은 맨틀 바닥을 넘지 않는다 (섭입 각 15~70°, 맨틀 0~80 mm)
for (const dip of [15, 35, 70]) for (const m of [0, 30, 80 * 2.83]) {
  const ocean = lib.plateScene(1, W, t, dip, relief, m, false).shapes.find((s) => s.name === "해양판");
  const lowest = Math.min(...ocean.points.map((p) => p[1]));
  assert.ok(lowest >= -(t + Math.max(m, 0)) - t - 1e-6, `dip ${dip}, mantle ${m}: slab ${lowest}`);
  if (m > 0) assert.ok(lowest >= -(t + m) - 1e-6, `slab stays in the mantle: ${lowest}`);
}
// 발산형: 판 이동 화살표가 해령에서 바깥으로
const div = lib.plateScene(0, W, t, 35, relief, mantle, false);
for (const a of div.arrows) assert.ok(Math.abs(a[1][0]) > Math.abs(a[0][0]), "plates move away from the ridge");
// 충돌형: 화살표가 안쪽으로
for (const a of lib.plateScene(2, W, t, 35, relief, mantle, false).arrows) assert.ok(Math.abs(a[1][0]) < Math.abs(a[0][0]), "plates move toward each other");
// 보존형: 단층 위아래 판(해령 사이)이 서로 반대로
const tr = lib.plateScene(3, W, t, 35, relief, mantle, false);
const between = tr.arrows.filter((a) => Math.abs(a[0][0]) < W * 0.2);
assert.strictEqual(between.length, 2);
assert.ok(Math.sign(between[0][1][0] - between[0][0][0]) !== Math.sign(between[1][1][0] - between[1][0][0]), "opposite along the fault");
assert.ok(Math.sign(between[0][0][1]) !== Math.sign(between[1][0][1]), "on opposite sides of the fault");
assert.ok(source.includes('var PREF_KEY = "ObjectPlateBoundary/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 13'), "settings field count");
console.log("plate boundary checks passed");
