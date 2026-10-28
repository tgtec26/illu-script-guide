const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "StatChart" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "중학교 수학.jsx"), "utf8");
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
  "formatValue", "padAxis", "quartiles", "median", "parseNumberList", "parsePairs", "strictNumber", "roundTo",
  "buildHistogramGroups", "buildBoxPlotGroups", "parseGroups", "buildStemLeaf", "buildCategoryChart", "wavePath", "parseCategories"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, MM_TO_PT = 2.834645669, WAVE_ROOM_MM = 5, WAVE_HALF_MM = 1.6, WAVE_AMP_MM = 0.5, WAVE_GAP_MM = 1;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
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
  // 축 범례(그림 제작 규칙)는 texts가 아니라 legends: X는 화살촉 끝 오른쪽 정렬, Y는 세로 쌓기·위 끝
  assert.deepStrictEqual(d.legends.map((t) => [t.kind, t.text, t.at[0], t.at[1]]), [["x", "(cm)", 80, 0], ["y", "(명)", 0, 50]]);
  assert.ok(!d.texts.some((t) => t.text === "(cm)" || t.text === "(명)"));
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
  // 화살촉 없이 눈금만 있는 축이라 X 범례는 가운데 정렬(그림 제작 규칙), Y 범례는 없다
  assert.deepStrictEqual(d.legends, [{ kind: "x", align: "center", text: "(cm)", at: [35, 0] }]);
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
// 선 두께: "/lines"는 v2 + LINE_KEYS 9칸(10필드). v1(축·그래프·보조선)도 읽고, 필드 수가 다르면 무시한다
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const lineKeys = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
  assert.ok(source.includes('var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];'), "LINE_KEYS order");
  assert.ok(source.indexOf("var LINE_KEYS") < source.indexOf("loadLineWidths();"), "LINE_KEYS must exist before loadLineWidths runs");
  const body = `var PREF_KEY = "T";\n${source.match(/var [A-Z_]+_PT = [\d.]+;/g).join("\n")}\n` +
    `${source.match(/var LINE_KEYS = [^;]+;/)[0]}\n${source.match(/var LINE_DEFAULTS = [^;]+;/)[0]}\n` +
    `${["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction).join("\n")}\n` +
    "return { LINE_DEFAULTS, setLineWidth, currentLineWidth, loadLineWidths, saveLineWidths };";
  const make = () => new Function("app", body)(app);
  const lw = make();
  const own = Object.keys(lw.LINE_DEFAULTS);
  assert.deepStrictEqual(own.slice().sort(), ["axis", "tick", "graph", "edge"].slice().sort(), "LINE_DEFAULTS groups");
  const values = [0.5, 0.6, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9];
  for (const key of own) assert.strictEqual(lw.currentLineWidth(key), lw.LINE_DEFAULTS[key], `${key} default`);
  for (const key of own) lw.setLineWidth(key, values[lineKeys.indexOf(key)]);
  for (const key of own) assert.strictEqual(lw.currentLineWidth(key), values[lineKeys.indexOf(key)], `${key} has its own width`);
  lw.saveLineWidths();
  const saved = store["T/lines"].split("|");
  assert.strictEqual(saved.length, 10);
  assert.strictEqual(saved[0], "v2");
  lineKeys.forEach((key, i) => assert.strictEqual(saved[i + 1], own.includes(key) ? String(values[i]) : "", `saved ${key}`));
  const again = make();
  again.loadLineWidths();
  for (const key of own) assert.strictEqual(again.currentLineWidth(key), values[lineKeys.indexOf(key)], `reload ${key}`);
  store["T/lines"] = "v1|1.2|1.4|5";
  const old = make();
  old.loadLineWidths();
  for (const key of own) assert.strictEqual(old.currentLineWidth(key), { axis: 1.2, graph: 1.4, guide: 2 }[key] || old.LINE_DEFAULTS[key], `v1 ${key}`);
  store["T/lines"] = "v2|1.2|1.4|1.6|1.8";
  const odd = make();
  odd.loadLineWidths();
  for (const key of own) assert.strictEqual(odd.currentLineWidth(key), odd.LINE_DEFAULTS[key], `5-field v2 is ignored: ${key}`);
}
// 눈금은 tick, 막대 테두리는 EDGE_PT
{
  const axes = (d) => d.lines.filter((l) => !l.main && !l.tick).length;
  const h = g.buildHistogram(size, 140, 5, [2, 5, 8, 4, 1], true, false, false);
  assert.strictEqual(h.lines.filter((l) => l.tick).length, 6 + 4, "x ticks 140~165 and y ticks 2~8");
  assert.strictEqual(axes(h), 2);
  const b = g.buildBoxPlot(size, [3, 5, 6, 7, 8, 9, 10, 12, 15], 6);
  assert.strictEqual(b.lines.filter((l) => l.tick).length, 8);
  assert.strictEqual(axes(b), 1);
  const s = g.buildScatter(size, [[160, 50], [165, 55], [170, 58], [155, 48], [175, 65]]);
  assert.strictEqual(s.lines.filter((l) => l.tick).length, 5 + 4);
  assert.strictEqual(axes(s), 2);
}
assert.ok(source.includes("line.main ? MAIN_PT : (line.grid || line.guide ? GUIDE_PT : (line.tick ? TICK_PT : AXIS_PT))"), "ticks drawn with TICK_PT (grid·guide 0.3pt)");
assert.ok(/function addBar\([^)]*\) \{[^}]*strokeWidth = EDGE_PT;/.test(source), "bar outlines drawn with EDGE_PT");
// 두 집단 비교(웹 math-stat-chart.test.js와 같은 경우): | 로 집단, 앞의 "이름:"은 이름. 집단 하나면 예전과 같다
{
  assert.deepStrictEqual(g.parseGroups("1반: 3, 5, 7 | 2반: 4 6 8"), [{ name: "1반", values: [3, 5, 7] }, { name: "2반", values: [4, 6, 8] }]);
  assert.deepStrictEqual(g.parseGroups("3, 5, 7"), [{ name: "", values: [3, 5, 7] }]);
  assert.strictEqual(g.parseGroups("1반: | 2반: 4"), null);
  const two = g.buildBoxPlotGroups(size, [{ name: "1반", values: [3, 5, 7, 9, 11] }, { name: "2반", values: [6, 8, 10, 12, 20] }], 17);
  const boxes = two.lines.filter((l) => l.closed);
  assert.strictEqual(boxes.length, 2);
  assert.ok(Math.max(...boxes[0].points.map((p) => p[1])) > Math.max(...boxes[1].points.map((p) => p[1])), "first group on top");
  assert.strictEqual(two.texts.filter((t) => t.text === "1반" || t.text === "2반").length, 2);
  const hist = g.buildHistogramGroups(size, 140, 5, [{ name: "1반", values: [2, 5, 8, 4, 1] }, { name: "2반", values: [1, 3, 6, 7, 3] }], true, false, true);
  assert.strictEqual(hist.bars.length, 0);
  const polys = hist.lines.filter((l) => l.main);
  assert.ok(polys.length === 2 && !polys[0].dashed && polys[1].dashed);
  const plain = g.buildScatter(size, [[160, 150], [165, 168], [170, 172], [155, 160]]);
  const extra = g.buildScatter(size, [[160, 150], [165, 168], [170, 172], [155, 160]], { grid: true, identity: true });
  assert.strictEqual(plain.lines.filter((l) => l.grid || l.guide).length, 0);
  assert.ok(extra.lines.filter((l) => l.grid).length >= 6);
  assert.strictEqual(extra.lines.filter((l) => l.guide).length, 1);
  assert.ok(source.includes('p[0] === "v3" && p.length === 21') && source.includes('p[0] === "v2" && p.length === 20') && source.includes('p[0] === "v1" && p.length === 18'), "settings v3 reads v2·v1");
  // 줄기와 잎 그림 (웹과 같은 경우)
  const stem = g.buildStemLeaf([12, 25, 9, 31, 22, 28, 22], 8, "점");
  assert.deepStrictEqual(stem.texts.slice(0, 2).map((x) => x.text), ["줄기", "잎"]);
  assert.ok(stem.texts.some((x) => x.text === "(0|9는 9점)"));
  assert.strictEqual(stem.lines.length, 2);
  assert.ok(g.buildStemLeaf([152, 147, 161, 158], 8, "cm").texts.some((x) => x.text === "(14|7은 147cm)"));
  // 웹 math-stat-chart.js의 buildStemLeaf와 글자 그대로 같다 (들여쓰기만 다름)
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-stat-chart.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8"), start = web.indexOf("export function buildStemLeaf("), end = web.indexOf("\n}\n", start) + 2;
    const scriptText = extractFunction("buildStemLeaf").split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
    assert.strictEqual(scriptText, web.slice(start + "export ".length, end), "buildStemLeaf differs from the web");
  }
}

// 막대·꺾은선 그래프와 물결선 (웹 math-stat-chart.test.js와 같은 경우)
{
  assert.deepStrictEqual(g.parseCategories("월, 화 ,수"), ["월", "화", "수"]);
  assert.deepStrictEqual(g.parseCategories("봄 여름  가을"), ["봄", "여름", "가을"]);
  const bars = g.buildCategoryChart(size, ["월", "화", "수", "목", "금"], [{ name: "", values: [12, 15, 9, 18, 14] }], false, 0, true);
  assert.strictEqual(bars.bars.length, 5);
  assert.deepStrictEqual(texts(bars, [0, -1]), ["월", "화", "수", "목", "금"]);
  assert.strictEqual(bars.lines.filter((l) => l.grid).length, 4);
  const line = g.buildCategoryChart(size, ["9시", "10시", "11시", "12시"], [{ name: "", values: [12, 15, 17, 20] }], true, 10, true);
  assert.deepStrictEqual(texts(line, [-1, 0]), ["0", "10", "12", "14", "16", "18", "20"]);
  assert.strictEqual(line.lines.filter((l) => l.curve).length, 2, "물결선 두 줄");
  assert.strictEqual(line.dots.length, 4);
  const two = g.buildCategoryChart(size, ["1월", "2월", "3월"], [{ name: "서울", values: [2, 5, 9] }, { name: "부산", values: [4, 7, 11] }], true, 0, false);
  const polys = two.lines.filter((l) => l.main);
  assert.ok(polys.length === 2 && !polys[0].dashed && polys[1].dashed);
  assert.strictEqual(g.wavePath(0, 10, 4, 1).length, 3);
  assert.ok(source.includes('p[0] === "v4" && p.length === 26') && source.includes('p[0] === "v3" && p.length === 21'), "settings v4 reads v3");
  assert.ok(source.includes('"막대 · 꺾은선 그래프"'), "종류 목록");
  // 웹 math-stat-chart.js와 글자 그대로 같다 (들여쓰기만 다름)
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-stat-chart.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8");
    for (const name of ["buildCategoryChart", "wavePath", "parseCategories"]) {
      const start = web.indexOf("export function " + name + "("), end = web.indexOf("\n}\n", start) + 2;
      const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
      assert.strictEqual(scriptText, web.slice(start + "export ".length, end), name + " differs from the web");
    }
  }
}

console.log("stat chart checks passed");
