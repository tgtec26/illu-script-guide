const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "NumberLine" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeNumberLineEngine(");
  assert.ok(start >= 0, "missing engine: makeNumberLineEngine");
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

const names = ["evaluate", "parsePoints", "parseInequality", "buildNumberLine", "tickLabelAt", "labelHalfWidth", "parseSolutions", "parseMoves", "parseTickLabels"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

// 값 계산
near(g.evaluate("-2.5"), -2.5, "decimal");
near(g.evaluate("3/4"), 0.75, "fraction");
near(g.evaluate("√2"), Math.SQRT2, "root");
near(g.evaluate("1-√3"), 1 - Math.sqrt(3), "root expression");
near(g.evaluate("2√3"), 2 * Math.sqrt(3), "implicit product");
near(g.evaluate("−(1+√2)/2"), -(1 + Math.SQRT2) / 2, "unicode minus and parens");
assert.strictEqual(g.evaluate("abc"), null);
assert.strictEqual(g.evaluate("1/0"), null);
assert.strictEqual(g.evaluate("(1"), null);
assert.strictEqual(g.evaluate("1..2"), null);
near(g.evaluate(".5"), 0.5, "leading dot");

// 점 목록
{
  const r = g.parsePoints("A=-2.5, B = 3/4, √2, C=?");
  assert.deepStrictEqual(r.list.map((p) => p.name), ["A", "B", ""]);
  assert.deepStrictEqual(r.bad, ["C=?"]);
}

// 부등식
assert.deepStrictEqual(g.parseInequality("x>2"), { lower: { value: 2, closed: false }, upper: null });
assert.deepStrictEqual(g.parseInequality("x ≤ -1"), { lower: null, upper: { value: -1, closed: true } });
assert.deepStrictEqual(g.parseInequality("-1<x<=3"), { lower: { value: -1, closed: false }, upper: { value: 3, closed: true } });
assert.deepStrictEqual(g.parseInequality("2>=x"), { lower: null, upper: { value: 2, closed: true } });
assert.deepStrictEqual(g.parseInequality("3>x>-2"), { lower: { value: -2, closed: false }, upper: { value: 3, closed: false } });
assert.deepStrictEqual(g.parseInequality(""), { lower: null, upper: null });
assert.strictEqual(g.parseInequality("3<x<1"), null, "empty range");
assert.strictEqual(g.parseInequality("x<1<2"), null);
assert.strictEqual(g.parseInequality("x"), null);
for (const text of ["y", "y<", "<y", "ab", "x<y", "<", "1<2", "x<=", "x<>2"]) assert.strictEqual(g.parseInequality(text), null, text);
assert.deepStrictEqual(g.parseInequality("y>=1"), { lower: { value: 1, closed: true }, upper: null }, "any letter");
assert.ok(!/match\(/.test(extractFunction("parseInequality")), "no whole-pattern regex (ExtendScript hangs)");

// 그림: -2~2, 칸 2개, 해 -1<x<=1
{
  const d = g.buildNumberLine({ min: -2, max: 2, unit: 10, subdivisions: 2, tick: 4, showNumbers: true,
    points: [{ name: "A", value: 0.5 }], solution: g.parseInequality("-1<x<=1"), solutionHeight: 8, dotRadius: 1 });
  const ticks = d.lines.filter((l) => l.points.length === 2 && l.points[0][0] === l.points[1][0]);
  assert.strictEqual(ticks.length, 9, "8 half steps + 1");
  assert.ok(ticks.every((l) => l.tick), "ticks get their own line width");
  assert.ok(!d.lines[0].tick && !d.lines[0].main, "axis line is neither tick nor solution");
  assert.deepStrictEqual(d.texts.filter((t) => t.dir === -1).map((t) => t.text), ["-2", "-1", "0", "1", "2"]);
  const solution = d.lines.find((l) => l.main);
  assert.deepStrictEqual(solution.points, [[-10, 1], [-10, 8], [10, 8], [10, 1]], "rises from both dots");
  assert.deepStrictEqual(d.dots.map((x) => x.open), [true, false, false], "open at -1, closed at 1, point A");
  assert.deepStrictEqual(d.texts.find((t) => t.text === "A").at, [5, 0]);
}

// 한쪽만 막힌 해는 수직선 끝까지
{
  const d = g.buildNumberLine({ min: -2, max: 2, unit: 10, subdivisions: 1, tick: 4, showNumbers: false,
    points: [], solution: g.parseInequality("x>=1"), solutionHeight: 8, dotRadius: 1 });
  const solution = d.lines.find((l) => l.main);
  assert.deepStrictEqual(solution.points, [[10, 1], [10, 8], [26, 8]]);
  assert.strictEqual(d.texts.length, 0);
}

assert.ok(source.includes('var PREF_KEY = "NumberLine/settings";'));
assert.ok(/line\.tick \? TICK_PT : AXIS_PT/.test(source), "ticks drawn with TICK_PT");
assert.ok(!/\beval\(/.test(source), "no eval");
// ExtendScript는 /=로 시작하는 정규식을 나누기-대입으로 읽어 스크립트 전체가 문법 오류가 난다
assert.ok(!/[(,=]\s*\/=/.test(source), "regex literal must not start with =");
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
  assert.deepStrictEqual(own.slice().sort(), ["axis", "tick", "graph"].slice().sort(), "LINE_DEFAULTS groups");
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
  // 2026-10-14에 잠시 쓴 5칸 v2(축·그래프·보조선·눈금)도 읽는다
  store["T/lines"] = "v2|1.2|1.4|1.6|1.8";
  const interim = make();
  interim.loadLineWidths();
  for (const key of own) assert.strictEqual(interim.currentLineWidth(key), { axis: 1.2, graph: 1.4, guide: 1.6, tick: 1.8 }[key] || interim.LINE_DEFAULTS[key], `5-field v2: ${key}`);
  store["T/lines"] = "v2|1.2|1.4|1.6|1.8|1.9";
  const odd = make();
  odd.loadLineWidths();
  for (const key of own) assert.strictEqual(odd.currentLineWidth(key), odd.LINE_DEFAULTS[key], `6-field v2 is ignored: ${key}`);
}
// 해 여러 개·칠하기·끝 화살촉·이동·대응·눈금 글자 (웹 math-number-line.test.js와 같은 경우)
{
  const head = { length: 4.84, notch: 1.24 };
  const sols = g.parseSolutions("x>-3:①, x<7:②");
  const d = g.buildNumberLine({ min: -5, max: 9, unit: 10, subdivisions: 1, tick: 4, showNumbers: true, points: [], solutions: sols,
    solutionHeight: 10, dotRadius: 1, fontPt: 8, shade: 1, head, ends: true, axisName: "x" });
  assert.deepStrictEqual(d.fills.map((f) => f.points), [[[-30, 0], [70, 0], [70, 10], [-30, 10]]], "공통부분 칠하기");
  assert.strictEqual(d.texts.find((t) => t.text === "①").dir, 0, "선 안 이름");
  assert.strictEqual(d.heads.length, 4, "수직선 양 끝 + 끝이 없는 해 선 둘");
  assert.deepStrictEqual(g.parseSolutions("x<=0:① 또는 x>=3:②")[0].pieces.map((p) => p.label), ["①", "②"]);
  assert.strictEqual(g.parseSolutions("x>1 또는"), null);
  const m = g.buildNumberLine({ min: -2, max: 6, unit: 10, subdivisions: 1, tick: 4, showNumbers: true, points: [], solutionHeight: 10, dotRadius: 1, fontPt: 8,
    head, moves: g.parseMoves("2>5:+3"), plusSign: true, numberStep: 2, tickLabels: g.parseTickLabels("4:a") });
  assert.strictEqual(m.lines.filter((l) => l.guide).length, 2, "이동 시작·끝 점선");
  assert.deepStrictEqual(m.texts.filter((t) => t.dir === -1).map((t) => t.text), ["-2", "0", "+2", "+6", "a"]);
  const q = g.buildNumberLine({ min: -4, max: 8, unit: 10, subdivisions: 1, tick: 4, showNumbers: false, points: [], solutionHeight: 10, dotRadius: 1, fontPt: 8,
    head, pairs: g.parseMoves("-2>-4:×2"), pairGap: 40 });
  assert.strictEqual(q.dots.length, 2);
  assert.deepStrictEqual(q.heads[0].tip, [-40, -39]);
  assert.strictEqual(g.parseMoves("1-2"), null);
  assert.strictEqual(g.parseTickLabels("1"), null);
  assert.ok(source.includes('if (line.guide) addLine(line.points, GUIDE_PT, GUIDE_DASH);'), "점선");
  assert.ok(source.includes("addFill(drawing.fills[f].points)") && source.includes("addArrow(drawing.heads[h])"));
  // 웹과 글자 그대로 같다 (들여쓰기만 다르다)
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-number-line.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8");
    for (const name of ["buildNumberLine", "tickLabelAt", "labelHalfWidth", "parseSolutions", "parseMoves", "parseTickLabels"]) {
      const key = web.includes(`export function ${name}(`) ? `export function ${name}(` : `function ${name}(`;
      const start = web.indexOf(key), end = web.indexOf("\n}\n", start) + 2;
      const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
      assert.strictEqual(scriptText, web.slice(start, end).replace("export function", "function"), name + " differs from the web");
    }
  }
}

// 설정 v2: 새 항목 8개를 저장하고, v1(14칸)도 읽는다
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const prelude = `var PREF_KEY = "T", POSITION_LIMIT_MM = 100; var minValue = -5, maxValue = 5, unitMm = 8, subdivisions = 1, tickMm = 1.6, solutionMm = 4, fontPt = 8,
    showNumbers = true, pointsText = "", inequalityText = "", offsetXmm = 0, offsetYmm = 0, previewEnabled = true,
    numberStep = 1, plusSign = false, arrowEnds = false, axisName = "", tickLabelText = "", shadeMode = 0, moveText = "", pairText = ""; function saveLineWidths() {}`;
  const body = prelude + ["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction).join("\n") +
    `return { saveSettings, applySettings, set: function() { numberStep = 2; plusSign = true; arrowEnds = true; axisName = "x"; tickLabelText = "2:a"; shadeMode = 1; moveText = "2>5:+3"; pairText = "1>2"; solutionMm = 0; },
      get: function() { return [numberStep, plusSign, arrowEnds, axisName, tickLabelText, shadeMode, moveText, pairText, solutionMm]; } };`;
  const make = () => new Function("app", body)(app);
  const first = make(); first.set(); first.saveSettings();
  assert.strictEqual(store.T.split("|").length, 22);
  const again = make(); again.applySettings();
  assert.deepStrictEqual(again.get(), [2, true, true, "x", "2:a", 1, "2>5:+3", "1>2", 0]);
  store.T = store.T.split("|").slice(0, 14).join("|").replace(/^v2/, "v1");
  const old = make(); old.applySettings();
  assert.deepStrictEqual(old.get(), [1, false, false, "", "", 0, "", "", 1], "v1은 새 항목을 처음 값으로, 해 선 높이는 예전 최소 1");
}
console.log("number line checks passed");
