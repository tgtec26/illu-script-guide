const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 고등학교 수학 묶음(Object_HighMath.jsx)의 "Count" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCountEngine(");
  assert.ok(start >= 0, "missing engine: makeCountEngine");
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

const names = ["parseRoads", "indexOf", "buildRoads", "bentRoad", "buildMap", "plain"];
const g = new Function(`var DOT_RADIUS_MM = 0.8;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 도로 입력
assert.deepStrictEqual(g.parseRoads("A-B:3, B-C:2, A-C:1"), { towns: ["A", "B", "C"], edges: [{ from: 0, to: 1, count: 3 }, { from: 1, to: 2, count: 2 }, { from: 0, to: 2, count: 1 }] });
for (const bad of ["A-B", "A-B:", "A:3", "A-A:2", "A-B:x", "A-B:0", "-B:2"]) assert.strictEqual(g.parseRoads(bad), null, bad);

// 도로 수만큼 곡선, 이웃 도로는 위아래 대칭, 건너뛰는 도로는 위로 가운데 마을을 넘는다
{
  const d = g.buildRoads(g.parseRoads("A-B:3, B-C:2, A-C:1"), 100, 5);
  assert.strictEqual(d.lines.length, 3 + 2 + 1);
  assert.strictEqual(d.dots.length, 3);
  const peak = (line) => { const [p, q] = line.points; const t = 0.5, u = 0.5; return u * u * u * p.anchor[1] + 3 * u * u * t * p.right[1] + 3 * u * t * t * q.left[1] + t * t * t * q.anchor[1]; };
  near(peak(d.lines[0]) + peak(d.lines[2]), 0, "A-B roads symmetric");
  near(peak(d.lines[1]), 0, "middle road straight");
  assert.ok(peak(d.lines[5]) > 30, "A-C road arches over B");
  assert.deepStrictEqual(d.lines[5].points[1].anchor, [200, 0]);
}

// 색칠 지도: 영역 이름 수
assert.deepStrictEqual([0, 1, 2].map((i) => g.buildMap(i, 100).texts.map((t) => t.text).join("")), ["ABCD", "ABCDE", "ABCD"]);
assert.strictEqual(g.buildMap(1, 100).circles.length, 1);

assert.ok(source.includes('var PREF_KEY = "HighMathCount/settings";'));
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("count checks passed");
