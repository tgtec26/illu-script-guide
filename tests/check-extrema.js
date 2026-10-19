const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(수학2.jsx)의 "Extrema" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "수학2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeExtremaEngine(");
  assert.ok(start >= 0, "missing engine: makeExtremaEngine");
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

const names = ["safeValue", "derivativeAt", "secondDerivativeAt", "zerosOf", "criticalPoints", "inflectionPoints", "buildExtrema", "buildTable", "niceNumber",
  "straight", "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, TREND_ARROW = { length: 1.8, halfWidth: 0.7, notch: 0.4 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const f = (text) => g.compileFunction(text);
const base = { label: "", mode: 0, xMin: -3, xMax: 3, yMin: -3, yMax: 3, unit: 10, tick: 2, cell: 30, row: 20, fontSize: 8,
  extrema: true, values: true, flat: false, inflection: false, formula: false, grid: false, numbers: false };
const build = (o) => g.buildExtrema(Object.assign({}, base, o));

assert.deepStrictEqual([1, -1, 0.5, 2 / 3, Math.sqrt(2), -2 * Math.sqrt(3), 1.2345, 0].map(g.niceNumber), ["1", "-1", "1/2", "2/3", "√2", "-2√3", "1.23", "0"]);

// x³-3x: 극대 f(-1)=2, 극소 f(1)=-2
{
  const pts = g.criticalPoints(f("y=x^3-3x"), -3, 3);
  assert.deepStrictEqual(pts.map((p) => [g.niceNumber(p.x), g.niceNumber(p.y), p.type]), [["-1", "2", "max"], ["1", "-2", "min"]]);
  const d = build({ f: f("y=x^3-3x"), label: "y=x^3-3x" });
  assert.strictEqual(d.notes[0], "극대 f(-1) = 2, 극소 f(1) = -2");
  assert.strictEqual(d.dots.length, 2);
  // 증감표: 5칸, x 줄 … -1 … 1 …, f′ 줄 + 0 - 0 +, 극대·극소 글자, 화살표 3개(↗ ↘ ↗)
  const table = d.texts.filter((t) => t.dir[0] === 0 && t.dir[1] === 0).map((t) => t.text);
  for (const n of ["x", "f′(x)", "f(x)", "-1", "1", "극대", "극소", "+", "-", "0"]) assert.ok(table.includes(n), n);
  const trends = d.arrows.filter((a) => a.trend).map((a) => Math.sign(a.dir[1]));
  assert.deepStrictEqual(trends, [1, -1, 1]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "table").length, 4 + 1 + 3, "4 rules, header divider, 3 arrow stems");
  // 표는 그래프 아래
  const rules = d.lines.filter((l) => l.kind === "table" && l.points[0].anchor[1] === l.points[1].anchor[1]);
  assert.ok(Math.max(...rules.map((l) => l.points[0].anchor[1])) < -35);
}
// x³: f′(0)=0이지만 극값 아님 (표에 0, 극대·극소 글자 없음), 변곡점 (0, 0)
{
  const d = build({ f: f("y=x^3"), inflection: true });
  assert.strictEqual(d.notes[0], "극값 없음");
  assert.strictEqual(d.notes[1], "변곡점 (0, 0)");
  const table = d.texts.filter((t) => t.dir[0] === 0 && t.dir[1] === 0).map((t) => t.text);
  assert.ok(!table.includes("극대") && !table.includes("극소"));
  assert.deepStrictEqual(d.arrows.filter((a) => a.trend).map((a) => Math.sign(a.dir[1])), [1, 1]);
}
// x⁴-2x²: 극소 ±1, 극대 0 / x³-6x: 극값 x = ±√2
{
  const d = build({ f: f("y=x^4-2x^2") });
  assert.strictEqual(d.notes[0], "극소 f(-1) = -1, 극대 f(0) = 0, 극소 f(1) = -1");
  const e = build({ f: f("y=x^3-6x"), yMin: -6, yMax: 6, mode: 2 });
  assert.strictEqual(e.notes[0], "극대 f(-√2) = 4√2, 극소 f(√2) = -4√2");
  assert.ok(!e.texts.some((t) => t.text === "O"), "table only: no axes");
}
// x+1/x: 불연속(0)은 극점이 아니다
assert.strictEqual(build({ f: f("y=x+1/x") }).notes[0], "극대 f(-1) = -2, 극소 f(1) = 2");

assert.ok(source.includes('var PREF_KEY = "HighMathExtrema/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
// 선 두께 역할: 패널 행 순서·행마다 저장 그룹. 저장은 v2(LINE_KEYS 9칸, 탭에 없는 칸은 비움)이고 v1(축·그래프·보조선)도 읽는다
{
  const rows = [...source.matchAll(/addValueRow\(lineWidthPanel, "([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(rows, ["축", "눈금", "그래프", "보조선", "모눈", "수평 접선", "증감표"]);
  const decl = (name) => { const m = source.match(new RegExp(`var ${name} = [^;\\n]*;`)); assert.ok(m, `missing ${name}`); return m[0]; };
  const defaultsDecl = decl("LINE_DEFAULTS");
  const keys = defaultsDecl.match(/\w+: [A-Z_]+_PT/g).map((pair) => pair.split(":")[0]);
  assert.deepStrictEqual(keys, ["axis", "tick", "graph", "guide", "grid", "thin", "table"]);
  for (const key of keys) assert.ok(source.includes(`setLineWidth("${key}", value); }, LINE_DEFAULTS.${key});`), `row for ${key}`);
  const prefs = {};
  const app = { preferences: { getStringPreference: (k) => prefs[k] || "", setStringPreference: (k, v) => { prefs[k] = v; } } };
  const widths = () => new Function("app", `var PREF_KEY = "K";\n${defaultsDecl.match(/[A-Z_]+_PT/g).map(decl).join("\n")}\n${defaultsDecl}\n${decl("LINE_KEYS")}
loadLineWidths();\n${["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction).join("\n")}
return { set: setLineWidth, get: currentLineWidth, save: saveLineWidths };`)(app);
  let w = widths();
  assert.deepStrictEqual(keys.map(w.get), [0.4, 0.4, 0.8, 0.3, 0.3, 0.3, 0.4], "defaults = widths used before the split");
  w.save();
  const saved = prefs["K/lines"].split("|");
  assert.strictEqual(saved.length, 10);
  assert.strictEqual(saved[0], "v2");
  ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"].forEach((key, i) => assert.strictEqual(saved[i + 1] === "", !keys.includes(key), key));
  prefs["K/lines"] = "v1|0.7|1.2|0.5";
  w = widths();
  assert.deepStrictEqual([w.get("axis"), w.get("graph"), w.get("guide"), w.get("tick")], [0.7, 1.2, 0.5, 0.4], "v1 values; axis no longer moves ticks");
  w.set("table", 1.1);
  w.save();
  assert.strictEqual(widths().get("table"), 1.1, "v2 round trip");
  prefs["K/lines"] = "v2|1|1";
  assert.strictEqual(widths().get("table"), 0.4, "wrong field count is ignored");
}
// 그림: 눈금 "tick", 격자 "grid", 수평 접선 "flat"(THIN_PT), 증감표 "table"(TABLE_PT, 축과 따로)
{
  const d = build({ f: f("y=x^3-3x"), grid: true, flat: true });
  assert.strictEqual(d.lines.filter((l) => l.kind === "tick").length, 12, "x·y ticks -3..3 without 0");
  assert.strictEqual(d.lines.filter((l) => l.kind === "axis").length, 2);
  assert.ok(d.lines.some((l) => l.kind === "grid"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "flat").length, 2);
  const addPath = extractFunction("addPath");
  for (const pair of ['"tick" ? TICK_PT', '"table" ? TABLE_PT', '"grid" ? GRID_PT', '"flat" ? THIN_PT']) assert.ok(addPath.includes(pair), pair);
  assert.ok(!/AXIS_PT = value; TABLE_PT/.test(extractFunction("setLineWidth")), "table is no longer linked to axis");
}
// 그래프는 X축 화살촉 뒤끝(테스트 ARROW 길이 4)까지 진행한다 (그림 제작 규칙 7.7)
{
  const rightmost = (lines, kind) => Math.max(...lines.filter((l) => l.kind === kind).flatMap((l) => l.points.map((p) => (p.anchor ? p.anchor[0] : p[0]))));
const d = build({ f: f("y=1"), mode: 1, xMin: -3, xMax: 5, yMin: -3, yMax: 3, extrema: false, values: false });
  assert.ok(Math.abs(rightmost(d.lines, "graph") - ((5 + 0.8) * 10 - 4)) < 1e-3, "graph reaches the arrowhead rear");
}
console.log("extrema checks passed");
