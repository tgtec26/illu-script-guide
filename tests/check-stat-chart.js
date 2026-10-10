const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "StatChart" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeStatChartEngine(");
  assert.ok(start >= 0, "missing engine: makeStatChartEngine");
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

const names = ["buildHistogram", "buildBoxPlot", "buildScatter", "emptyDrawing", "addAxes", "addYTicks", "niceAxis",
  "formatValue", "padAxis", "quartiles", "median", "parseNumberList", "parsePairs", "strictNumber", "roundTo"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const size = { width: 70, height: 40, tick: 2, xName: "(cm)", yName: "(명)" };
const texts = (d, dir) => d.texts.filter((t) => t.dir[0] === dir[0] && t.dir[1] === dir[1]).map((t) => t.text);

// 입력 읽기
assert.deepStrictEqual(g.parseNumberList("2, 5,8  4 1"), [2, 5, 8, 4, 1]);
assert.deepStrictEqual(g.parseNumberList("-1.5, 3"), [-1.5, 3]);
for (const bad of ["2, x", "1e3", "1..2", "5-"]) assert.strictEqual(g.parseNumberList(bad), null, bad);
assert.deepStrictEqual(g.parsePairs("(160,50) (165, 55);(1.5,-2)"), [[160, 50], [165, 55], [1.5, -2]]);
for (const bad of ["(1,2", "1,2", "(1)", "(a,2)"]) assert.strictEqual(g.parsePairs(bad), null, bad);

// 눈금
assert.deepStrictEqual(g.niceAxis(0, 8), { min: 0, max: 8, step: 2 });
assert.deepStrictEqual(g.niceAxis(0, 0.4), { min: 0, max: 0.4, step: 0.1 });
assert.deepStrictEqual(g.niceAxis(48, 65), { min: 45, max: 65, step: 5 });
assert.strictEqual(g.formatValue(0.30000000000000004, 0.1), "0.3");
assert.strictEqual(g.formatValue(145, 5), "145");

// 사분위수 (중앙값을 뺀 절반의 중앙값)
assert.deepStrictEqual(g.quartiles([3, 5, 6, 7, 8, 9, 10, 12, 15]), { min: 3, max: 15, median: 8, q1: 5.5, q3: 11 });
assert.deepStrictEqual(g.quartiles([8, 1, 4, 2, 6, 5]), { min: 1, max: 8, median: 4.5, q1: 2, q3: 6 });

// 히스토그램 + 다각형: 도수 5계급 → 가로 7칸, 다각형은 양 끝 빈 계급 가운데에서 축에 닿는다
{
  const d = g.buildHistogram(size, 140, 5, [2, 5, 8, 4, 1], true, true, false);
  assert.strictEqual(d.bars.length, 5);
  assert.deepStrictEqual(d.bars[2], [30, 0, 40, 40], "tallest bar reaches the top (8 of 0~8)");
  assert.deepStrictEqual(texts(d, [0, -1]), ["140", "145", "150", "155", "160", "165"]);
  assert.deepStrictEqual(texts(d, [-1, 0]), ["0", "2", "4", "6", "8"]);
  const poly = d.lines.find((l) => l.main);
  assert.deepStrictEqual(poly.points[0], [5, 0]);
  assert.deepStrictEqual(poly.points[poly.points.length - 1], [65, 0]);
  assert.strictEqual(d.dots.length, 7);
  assert.ok(d.texts.some((t) => t.text === "(cm)") && d.texts.some((t) => t.text === "(명)"));
}

// 상대도수: 합 20 → 0.4가 가장 큼, 0 없는 막대는 안 그린다
{
  const d = g.buildHistogram(size, 0, 10, [4, 8, 0, 8], true, false, true);
  assert.deepStrictEqual(texts(d, [-1, 0]), ["0", "0.1", "0.2", "0.3", "0.4"]);
  assert.strictEqual(d.bars.length, 3);
}

// 상자그림
{
  const d = g.buildBoxPlot(size, [3, 5, 6, 7, 8, 9, 10, 12, 15], 6);
  assert.deepStrictEqual(texts(d, [0, -1]), ["2", "4", "6", "8", "10", "12", "14", "16"]);
  const box = d.lines.find((l) => l.closed);
  assert.strictEqual(box.points[0][0], (5.5 - 2) * 5, "box starts at Q1");
  assert.strictEqual(box.points[1][0], (11 - 2) * 5, "box ends at Q3");
}

// 산점도
{
  const d = g.buildScatter(size, [[160, 50], [165, 55], [170, 58], [155, 48], [175, 65]]);
  assert.strictEqual(d.dots.length, 5);
  // x 155~175 → 150부터(155 자료가 축에 붙지 않게), y 48~65 → 45부터
  assert.deepStrictEqual(d.dots[3], [(155 - 150) * 70 / 25, (48 - 45) * 2]);
  assert.deepStrictEqual(texts(d, [0, -1]), ["150", "155", "160", "165", "170", "175"]);
}

assert.ok(source.includes('var PREF_KEY = "StatChart/settings";'));
assert.ok(!/[(,=]\s*\/=/.test(source), "regex literal must not start with = (ExtendScript syntax error)");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("stat chart checks passed");
