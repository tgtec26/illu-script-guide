const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "Construction" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_MiddleMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeConstructionEngine(");
  assert.ok(start >= 0, "missing engine: makeConstructionEngine");
  let depth = 0;
  for (let index = bundle.indexOf("{", start); index < bundle.length; index++) {
    if (bundle[index] === "{") depth++;
    if (bundle[index] === "}" && --depth === 0) return bundle.slice(start, index + 1);
  }
  throw new Error("unbalanced engine");
})();

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

const names = ["dedupePoints", "detectMode", "buildConstruction", "addCenter", "perpendicularBisector", "angleBisector",
  "circumcenter", "incenter", "footOfPerpendicular", "lineIntersection", "arcPoints", "guide", "trace",
  "midpoint", "sub", "dot", "cross", "dist", "angleOf", "offset", "unit"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const all = { circumcenter: true, perpBisectors: true, circumcircle: true, incenter: true, angleBisectors: true,
  incircle: true, tangentFeet: true, centroid: true, medians: true, traces: true };
const none = Object.fromEntries(Object.keys(all).map((k) => [k, false]));

// 선택 판별
assert.strictEqual(g.detectMode([[0, 0], [10, 0]], false), "segment");
assert.strictEqual(g.detectMode([[0, 0], [10, 0], [0, 10]], false), "angle");
assert.strictEqual(g.detectMode([[0, 0], [10, 0], [0, 10]], true), "triangle");
assert.strictEqual(g.detectMode([[0, 0], [5, 0], [10, 0]], true), null, "collinear");
assert.strictEqual(g.detectMode([[0, 0], [10, 0], [10, 10], [0, 10]], true), null);

// 3-4-5 직각삼각형: 외심은 빗변 중점, 내접원 반지름 1, 무게중심
{
  const A = [0, 3], B = [0, 0], C = [4, 0];
  const O = g.circumcenter(A, B, C);
  near(O[0], 2, "circumcenter x"); near(O[1], 1.5, "circumcenter y");
  const inc = g.incenter(A, B, C);
  near(inc.center[0], 1, "incenter x"); near(inc.center[1], 1, "incenter y"); near(inc.radius, 1, "inradius");
  const d = g.buildConstruction([A, B, C], "triangle", Object.assign({}, all, { traces: false }), 0);
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["O", "I", "G"]);
  near(d.circles[0].radius, 2.5, "circumradius");
  near(d.circles[1].radius, 1, "incircle");
  const G = d.dots[2];
  near(G[0], 4 / 3, "centroid x"); near(G[1], 1, "centroid y");
  // 각의 이등분선은 꼭짓점에서 마주 보는 변까지, 내심을 지난다
  const bisectors = d.lines.slice(3, 6);
  for (const line of bisectors) {
    const [p, q] = line.points.map((pt) => pt.anchor);
    near(g.cross(g.sub(q, p), g.sub(inc.center, p)), 0, "bisector passes through I", 1e-9);
  }
  // 접점 수선의 끝은 내접원 위
  for (const line of d.lines.slice(6, 9)) near(g.dist(line.points[1].anchor, inc.center), 1, "tangent foot on incircle");
}

// 수직이등분선: 선분 가운데에서 수직, 작도 흔적 호 4개는 모두 끝점에서 같은 반지름
{
  const d = g.buildConstruction([[0, 0], [10, 0]], "segment", Object.assign({}, none, { traces: true }), 2);
  const main = d.lines[0].points.map((p) => p.anchor);
  near(main[0][0], 5, "vertical through midpoint"); near(main[1][0], 5, "vertical through midpoint");
  const arcs = d.lines.filter((l) => l.kind === "trace");
  assert.strictEqual(arcs.length, 4);
  for (const arc of arcs) {
    for (const p of arc.points.map((pt) => pt.anchor)) {
      const r = [g.dist(p, [0, 0]), g.dist(p, [10, 0])].find((x) => Math.abs(x - 7) < 1e-6);
      assert.ok(r !== undefined, "compass radius 0.7 × length from one endpoint");
    }
  }
}

// 각의 이등분선: 45° 방향, 작도 흔적 3개(꼭짓점 호 1 + 두 점의 호 2), 꼭짓점 호는 두 변 사이(작은 쪽)
{
  for (const [P, N] of [[[10, 0], [0, 10]], [[-10, 0.0001], [-10, -10]]]) {
    const d = g.buildConstruction([P, [0, 0], N], "angle", Object.assign({}, none, { traces: true }), 0);
    const [v, end] = d.lines[0].points.map((p) => p.anchor);
    const mid = g.unit([g.unit(P)[0] + g.unit(N)[0], g.unit(P)[1] + g.unit(N)[1]]);
    near(g.cross(g.unit(end), mid), 0, "bisector direction");
    const arcs = d.lines.filter((l) => l.kind === "trace");
    assert.strictEqual(arcs.length, 3);
    const vertexArc = arcs[0].points.map((p) => p.anchor);
    const sweep = Math.abs(Math.atan2(g.cross(vertexArc[0], vertexArc[vertexArc.length - 1]), g.dot(vertexArc[0], vertexArc[vertexArc.length - 1])));
    assert.ok(sweep < Math.PI, "vertex arc covers the small angle");
  }
}

assert.ok(source.includes('var PREF_KEY = "Construction/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
console.log("construction checks passed");
