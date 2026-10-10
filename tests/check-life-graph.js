const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "LifeGraph" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeLifeGraphEngine(");
  assert.ok(start >= 0, "missing engine: makeLifeGraphEngine");
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
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced helper: ${name}`);
}

const names = ["parseDataPoints", "buildLifeGraph", "ticks", "addUnique", "formatValue"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 점 읽기
{
  const r = g.parseDataPoints("(0,0) (5, 400)(9,0) (12,0) (20,1000) (3) 7,1)");
  assert.deepStrictEqual(r.list.map((p) => [p.x, p.y]), [[0, 0], [5, 400], [9, 0], [12, 0], [20, 1000]]);
  assert.deepStrictEqual(r.bad, ["(3)", "7,1)"]);
}

const points = g.parseDataPoints("(0,0) (5,400) (9,0) (12,0) (20,1000)").list;
const base = { points, xName: "x(분)", yName: "y(m)", xMax: 20, xStep: 5, yMax: 1000, yStep: 200, width: 100, height: 50, tick: 2,
  numberMode: 1, dots: false, guides: true, grid: false };
const build = (o) => g.buildLifeGraph(Object.assign({}, base, o));

// 가로·세로 단위가 다르다: (20, 1000)은 오른쪽 위 끝
{
  const d = build({});
  const graph = d.lines.find((l) => l.kind === "graph");
  assert.strictEqual(graph.points.length, 5);
  near(graph.points[1][0], 25, "x 5 → 25pt");
  near(graph.points[1][1], 20, "y 400 → 20pt");
  near(graph.points[4][0], 100, "x 20 → width");
  near(graph.points[4][1], 50, "y 1000 → height");
  // 점의 좌표만: x 5, 9, 12, 20 / y 400, 1000
  const xs = d.texts.filter((t) => t.dir[1] === -1 && t.upright).map((t) => t.text);
  const ys = d.texts.filter((t) => t.dir[0] === -1 && t.upright && t.text !== "O").map((t) => t.text);
  assert.deepStrictEqual(xs, ["5", "9", "12", "20"]);
  assert.deepStrictEqual(ys, ["400", "1000"]);
  assert.ok(d.texts.some((t) => t.text === "x(분)") && d.texts.some((t) => t.text === "y(m)"));
  // 점선: (5,400)과 (20,1000)만 두 축까지 (축 위의 점은 없다)
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 4);
}
// 모든 눈금: 5, 10, 15, 20 / 200 … 1000
{
  const d = build({ numberMode: 0 });
  assert.deepStrictEqual(d.texts.filter((t) => t.dir[1] === -1 && t.upright).map((t) => t.text), ["5", "10", "15", "20"]);
  assert.deepStrictEqual(d.texts.filter((t) => t.dir[0] === -1 && t.upright && t.text !== "O").map((t) => t.text), ["200", "400", "600", "800", "1000"]);
}
// 숫자 없음, 격자, 점 찍기
{
  const d = build({ numberMode: 2, grid: true, dots: true, guides: false });
  assert.ok(!d.texts.some((t) => /^[0-9]/.test(t.text)));
  assert.strictEqual(d.lines.filter((l) => l.kind === "grid").length, 4 + 5);
  assert.strictEqual(d.dots.length, 5);
  assert.strictEqual(d.arrows.length, 2);
}
assert.deepStrictEqual(g.ticks(1, 0.25), [0.25, 0.5, 0.75, 1]);
assert.deepStrictEqual(g.ticks(5, 0), []);

assert.ok(source.includes('var PREF_KEY = "MiddleLifeGraph/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("life graph checks passed");
