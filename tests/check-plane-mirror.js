const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_PlaneMirror.jsx"), "utf8");

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

const names = ["mirrorScene", "reflectionRay"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 상은 거울 뒤 같은 거리·같은 크기
const g = lib.mirrorScene(50, 25, 18, 40, 30);
assert.deepStrictEqual(g.image[1], [25, -25 + 18]);
assert.deepStrictEqual(g.object[1], [-25, -25 + 18]);
// 반사점에서 입사각 = 반사각 (법선은 가로)
for (const p of g.object) {
  const ray = lib.reflectionRay(p, g.eye, g.bottom, g.top);
  assert.ok(ray, "ray hits the mirror");
  near(ray.m[0], 0, 1e-12, "on the mirror");
  const inc = Math.atan2(p[1] - ray.m[1], -p[0]);
  const ref = Math.atan2(g.eye[1] - ray.m[1], -g.eye[0]);
  near(inc, -ref, 1e-9, "angle of incidence = angle of reflection");
  // 반사점은 눈과 상을 잇는 직선 위
  const img = [-p[0], p[1]];
  near((img[0] - g.eye[0]) * (ray.m[1] - g.eye[1]) - (img[1] - g.eye[1]) * (ray.m[0] - g.eye[0]), 0, 1e-9, "on eye–image line");
}
// 거울 밖에 닿으면 null
assert.strictEqual(lib.reflectionRay([-25, 200], [-40, 200], -25, 25), null);
assert.ok(source.includes('var PREF_KEY = "ObjectPlaneMirror/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 14'), "settings field count");
console.log("plane mirror checks passed");
