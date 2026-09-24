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

const names = ["circulationLayout", "wiggle", "nephronLayout", "roundCorners"];
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
// 혈관 모서리: 직각 꺾임 하나에 앵커 두 개, 접선 길이 = 반지름, 원호 위, 끝점은 그대로
{
  const pts = lib.roundCorners([[0, 0], [10, 0], [10, 10]], 3);
  assert.strictEqual(pts.length, 4);
  assert.deepStrictEqual(pts[0].anchor, [0, 0]);
  assert.deepStrictEqual(pts[3].anchor, [10, 10]);
  near(pts[1].anchor[0], 7, 1e-9, "arc starts r before the corner");
  near(pts[2].anchor[1], 3, 1e-9, "arc ends r after the corner");
  // 베지어 가운데 점이 중심 (7, 3), 반지름 3 원 위에 있다
  const [p0, p1, p2, p3] = [pts[1].anchor, pts[1].right, pts[2].left, pts[2].anchor];
  const mid = [0, 1].map((k) => (p0[k] + 3 * p1[k] + 3 * p2[k] + p3[k]) / 8);
  near(Math.hypot(mid[0] - 7, mid[1] - 3), 3, 0.01, "quarter circle");
  // 반지름 0이면 꺾은선 그대로, 짧은 조각이면 반지름을 줄인다
  assert.deepStrictEqual(lib.roundCorners([[0, 0], [10, 0], [10, 10]], 0).map((p) => p.anchor), [[0, 0], [10, 0], [10, 10]]);
  const tight = lib.roundCorners([[0, 0], [4, 0], [4, 10]], 5);
  near(tight[1].anchor[0], 2, 1e-9, "tangent length capped at half the shorter piece");
  // 모든 혈관이 둥글려도 NaN 없이 그려진다
  for (const v of c.vessels) for (const p of lib.roundCorners(v.points, 8)) for (const q of [p.anchor, p.left, p.right]) assert.ok(isFinite(q[0]) && isFinite(q[1]));
}
assert.ok(source.includes('p[0] !== "v2" || p.length !== 15'), "settings field count");
assert.ok(source.includes("HEAD_LENGTH = BASE_HEAD_LENGTH * headPct / 100;"), "head size scales every arrowhead");
console.log("circulation checks passed");
