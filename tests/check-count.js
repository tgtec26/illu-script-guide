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

const names = ["parseRoads", "indexOf", "buildRoads", "bentRoad", "buildMap", "plain", "parseLatticePoint", "wholeNumber", "parseBlocked", "edgeKey", "countPaths", "buildGrid", "buildSeats", "factorial"];
const g = new Function(`var TABLES = ["원탁", "정사각형 탁자", "직사각형 탁자"];\nvar DOT_RADIUS_MM = 0.8;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
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

// 격자 최단 경로: 5×3 → C(8,3) = 56, P(2,1)을 지나면 C(3,1)·C(5,2) = 3·10 = 30
{
  const d = g.buildGrid(5, 3, 10, [2, 1], [], true);
  assert.strictEqual(d.note, "A → B 최단 경로 56가지, P를 지나는 경로 3 × 10 = 30가지");
  assert.strictEqual(d.lines.length, 6 + 4, "6 vertical + 4 horizontal streets");
  assert.ok(d.texts.some((t) => t.text === "56" && t.small), "count at B");
  assert.strictEqual(d.texts.filter((t) => t.small).length, 6 * 4 - 1);
  assert.deepStrictEqual(d.dots[2], [20, 10], "P dot");
}
// 막힌 길: (0,0)-(1,0)이 막히면 첫걸음은 위로만 → C(7,2)=21... 5×3에서 위로 먼저 가면 (0,1)부터 5×2 격자 C(7,2)=21
{
  const blocked = g.parseBlocked("0,0-1,0");
  assert.deepStrictEqual(blocked, ["0,0-1,0"]);
  const d = g.buildGrid(5, 3, 10, null, blocked, false);
  assert.strictEqual(d.note, "A → B 최단 경로 21가지");
  assert.strictEqual(d.lines.length, 10 + 2, "× is two strokes");
  assert.deepStrictEqual(g.parseBlocked("1,0 - 2,0; 3,3-3,2"), ["1,0-2,0", "3,2-3,3"]);
  for (const bad of ["1,0-3,0", "1,0", "a,0-1,0", "1,0-2,1"]) assert.strictEqual(g.parseBlocked(bad), null, bad);
  assert.deepStrictEqual(g.parseLatticePoint("(2, 1)"), [2, 1]);
  assert.strictEqual(g.parseLatticePoint("2"), null);
}
assert.ok(g.buildGrid(2, 2, 10, [3, 1], [], false).note.includes("격자 밖"));
// 원순열: 원탁 5명 (5-1)! = 24, 정사각형 탁자 변마다 2명 8!/4 = 10080, 직사각형 2·1명 6!/2 = 360
{
  const round = g.buildSeats(0, 5, 2, 1, 100, "", false, 8);
  assert.strictEqual(round.note, "원탁 5명: (5-1)! = 24가지");
  assert.strictEqual(round.circles.length, 1 + 5);
  assert.deepStrictEqual(round.texts.map((t) => t.text), ["A", "B", "C", "D", "E"]);
  assert.ok(Math.abs(round.circles[1].center[0]) < 1e-9 && round.circles[1].center[1] > 50, "first seat at the top");
  assert.ok(round.circles[2].center[0] > 0, "clockwise: second seat to the right");
  assert.strictEqual(g.buildSeats(1, 0, 2, 0, 100, "", false, 8).note, "정사각형 탁자 8명: 8!/4 = 10080가지");
  const rect = g.buildSeats(2, 0, 2, 1, 100, "엄마, 아빠, A", true, 8);
  assert.strictEqual(rect.note, "직사각형 탁자 6명: 6!/2 = 360가지");
  assert.deepStrictEqual(rect.texts.map((t) => t.text), ["엄마", "아빠", "A"], "missing names leave seats empty");
  assert.strictEqual(rect.lines.length, 1 + 2, "table outline + arrow arc + head");
  assert.strictEqual(g.buildSeats(2, 0, 3, 3, 100, "", false, 8).note, "직사각형 탁자 12명: 12!/2 = 239500800가지");
}
assert.ok(source.includes('p[0] !== "v3" || p.length !== 24'), "settings layout bumped to v3");

assert.ok(source.includes('var PREF_KEY = "HighMathCount/settings";'));
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("count checks passed");
