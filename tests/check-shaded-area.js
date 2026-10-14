const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "ShadedArea" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeShadedAreaEngine(");
  assert.ok(start >= 0, "missing engine: makeShadedAreaEngine");
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

const names = ["buildShaded", "orient", "termsText", "coefficientText", "arc", "circle", "polyline", "join", "open", "polar", "normalOf", "unitVector", "formatValue"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 닫힌 베지어 고리의 부호 있는 넓이 (조각마다 촘촘히 나눈 다각형)
function ringArea(points) {
  const samples = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    for (let k = 0; k < 64; k++) {
      const t = k / 64, s = 1 - t;
      samples.push([0, 1].map((j) => s * s * s * p.anchor[j] + 3 * s * s * t * p.right[j] + 3 * s * t * t * q.left[j] + t * t * t * q.anchor[j]));
    }
  }
  let area = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i], b = samples[(i + 1) % samples.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}
// 칠한 넓이: 고리가 여럿이면 가장 큰 것에서 나머지(구멍)를 뺀다
function fillArea(fill) {
  const areas = fill.map((ring) => Math.abs(ringArea(ring))).sort((a, b) => b - a);
  return areas[0] - areas.slice(1).reduce((s, v) => s + v, 0);
}
const base = { size: 10, length: 10, ratio: 0.5, angle: 120, names: true, center: true, lengthText: true, unit: "cm" };
const build = (o) => g.buildShaded(Object.assign({}, base, o));
const PI = Math.PI;

// 모양마다 칠한 넓이 = 창의 넓이 공식 (size = length = 10이라 그림 넓이와 값이 같다)
const expected = [
  [0, 100 * PI / 8, "넓이 = 25π/2", "둘레 = 10π + 10"],
  [1, 100 * (PI / 2 - 1), "넓이 = 50π - 100", "둘레 = 10π"],
  [2, 100 * (1 - PI / 4), "넓이 = 100 - 25π", "둘레 = 5π + 20"],
  [3, 100 * (1 - PI / 4), "넓이 = 100 - 25π", "둘레 = 10π + 40"],
  [4, 100 * (PI / 2 - 1), "넓이 = 50π - 100", "둘레 = 20π"],
  [5, 100 * (PI - 2), "넓이 = 100π - 200", "둘레 = 20π + 40√2"],
  [6, 100 * PI * (120 / 360) * 0.75, "넓이 = 25π", "둘레 = 10π + 10"],
  [7, 100 * PI / 3, "넓이 = 100π/3", "둘레 = 20π/3 + 20"],
  [8, PI * 100 * 0.25 / 4, "넓이 = 25π/4", "둘레 = 10π"]
];
for (const [shape, area, areaNote, perimeterNote] of expected) {
  const d = build({ shape });
  const total = d.fills.reduce((s, f) => s + fillArea(f), 0);
  near(total, area, `shape ${shape} area`, area * 1e-3);   // 사분원 베지어의 반지름 오차(약 0.03%)만큼
  assert.strictEqual(d.notes[0], areaNote, `shape ${shape}`);
  assert.strictEqual(d.notes[1], perimeterNote, `shape ${shape}`);
  // join이 만든 고리는 끝과 처음이 겹치지 않는다
  for (const f of d.fills) for (const ring of f) {
    const a = ring[0].anchor, z = ring[ring.length - 1].anchor;
    assert.ok(Math.hypot(a[0] - z[0], a[1] - z[1]) > 1e-6, `shape ${shape}: closed ring repeats its first point`);
  }
  // 바깥 고리는 반시계, 구멍은 시계 방향 (0이 아닌 감기 규칙)
  for (const f of d.fills) f.forEach((ring, i) => assert.ok((ringArea(ring) > 0) === (i === 0), `shape ${shape} ring ${i} direction`));
}
// 고리 360°: 원 두 개(구멍), 반지름 비율 30%
{
  const d = build({ shape: 6, angle: 360, ratio: 0.3 });
  assert.strictEqual(d.fills[0].length, 2);
  near(fillArea(d.fills[0]), 100 * PI * (1 - 0.09), "annulus", 100 * PI * 1e-3);
  assert.strictEqual(d.notes[0], "넓이 = 91π");
  assert.strictEqual(d.notes[1], "둘레 = 26π");
}
// 꽃잎은 네 조각, 정사각형 - 원은 구멍 하나
assert.strictEqual(build({ shape: 4 }).fills.length, 4);
assert.strictEqual(build({ shape: 3 }).fills[0].length, 2);
// 글자: 꼭짓점 이름·중심·길이
{
  const d = build({ shape: 0 });
  // 길이 글자(10 cm)도 단위라 기울이지 않는다
  assert.deepStrictEqual(d.texts.filter((t) => t.upright).map((t) => t.text), ["A", "B", "C", "D", "10 cm"]);
  assert.ok(d.texts.some((t) => t.text === "10 cm"));
  const e = build({ shape: 7, names: false, center: false, lengthText: false });
  assert.deepStrictEqual(e.texts.map((t) => t.text), ["120°"]);
  assert.strictEqual(e.dots.length, 0);
}
// 계수 글자
assert.strictEqual(g.termsText([-100, 50, 0]), "50π - 100");
assert.strictEqual(g.termsText([100, -25, 0]), "100 - 25π");
assert.strictEqual(g.termsText([0, 0.5, 0]), "π/2");
assert.strictEqual(g.termsText([0, 0, 0]), "0");

assert.ok(source.includes('var PREF_KEY = "MiddleShadedArea/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
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
  assert.deepStrictEqual(own.slice().sort(), ["graph", "guide", "mark"].slice().sort(), "LINE_DEFAULTS groups");
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
// 중심각 호는 표시, 반지름 선은 보조선
{
  const sector = build({ shape: 7 });
  assert.strictEqual(sector.lines.filter((l) => l.kind === "mark").length, 1);
  assert.strictEqual(sector.lines.filter((l) => l.kind === "guide").length, 0);
  const square = build({ shape: 5 });
  assert.strictEqual(square.lines.filter((l) => l.kind === "guide").length, 1);
  assert.strictEqual(square.lines.filter((l) => l.kind === "mark").length, 0);
}
assert.ok(source.includes('line.kind === "main" ? MAIN_PT : (line.kind === "mark" ? MARK_PT : GUIDE_PT)'), "angle arcs drawn with MARK_PT");
console.log("shaded area checks passed");
