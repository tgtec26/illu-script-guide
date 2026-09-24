const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Circulation.jsx"), "utf8");

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

const names = ["circulationLayout", "wiggle", "nephronLayout"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const c = lib.circulationLayout(200);
const byName = (list, n) => list.find((x) => x.name === n);
const center = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
const inside = (p, b) => p[0] >= b[0] - 1e-6 && p[0] <= b[2] + 1e-6 && p[1] <= b[1] + 1e-6 && p[1] >= b[3] - 1e-6;
// 보는 사람 기준 왼쪽이 우심방·우심실, 위가 심방
assert.ok(center(byName(c.chambers, "우심방").box)[0] < 0 && center(byName(c.chambers, "좌심방").box)[0] > 0);
assert.ok(center(byName(c.chambers, "우심방").box)[1] > center(byName(c.chambers, "우심실").box)[1]);
// 혈관 시작·끝이 맞는 칸·기관에 닿는다
const lung = c.organs[0].box, body = c.organs[1].box;
const routes = {폐동맥: ["우심실", lung], 폐정맥: [lung, "좌심방"], 대동맥: ["좌심실", body], 대정맥: [body, "우심방"]};
for (const v of c.vessels) {
  const [from, to] = routes[v.name];
  const box = (x) => typeof x === "string" ? byName(c.chambers, x).box : x;
  assert.ok(inside(v.points[0], box(from)), `${v.name} starts at ${from}`);
  assert.ok(inside(v.points[v.points.length - 1], box(to)), `${v.name} ends at ${to}`);
  // 폐정맥·대동맥은 동맥혈
  assert.strictEqual(v.arterial, v.name === "폐정맥" || v.name === "대동맥", `${v.name} blood`);
}
// 네프론: 원위 세뇨관 끝이 집합관에 닿는다
const n = lib.nephronLayout(100);
const end = n.tubule[n.tubule.length - 1];
near(end[0], n.duct[0][0], 1e-9, "distal tubule meets the collecting duct");
assert.ok(end[1] < n.duct[0][1] && end[1] > n.duct[n.duct.length - 1][1], "within the duct");
const w = lib.wiggle([0, 0], [10, 0], 2, 4);
assert.deepStrictEqual(w[0], [0, 0]);
near(w[w.length - 1][0], 10, 1e-9, "wiggle ends at b");
assert.ok(source.includes('var PREF_KEY = "ObjectCirculation/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 12'), "settings field count");
console.log("circulation checks passed");
