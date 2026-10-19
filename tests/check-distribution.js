const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 확률과 통계 묶음(확률과 통계.jsx)의 "Distribution" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "확률과 통계.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeDistributionEngine(");
  assert.ok(start >= 0, "missing engine: makeDistributionEngine");
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

const names = ["buildNormal", "buildBinomial", "shadeRange", "addRangeMarks", "placeMarks", "addAxis", "probabilityText", "normalPoints",
  "normalDensity", "normalCdf", "binomialProbability", "straight", "formatValue"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, TAIL_SIGMAS = 3.5, BAR_RATIO = 0.6, AXIS_MARGIN_RATIO = 0.04;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { width: 200, height: 50, tick: 2, shadeK: 20, axisName: "x", shade: 1, a: 40, b: 70, letters: false, meanLine: true, sigmaTicks: false };
const normal = (o) => g.buildNormal(Object.assign({}, base, { curves: [{ m: 50, s: 10 }] }, o));
const binomial = (o) => g.buildBinomial(Object.assign({}, base, { n: 10, p: 0.5, approx: false, a: 3, b: 6 }, o));
const bez = (p, q, t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * p.anchor[i] + 3 * u * u * t * p.right[i] + 3 * u * t * t * q.left[i] + t * t * t * q.anchor[i]); };

// 누적확률
near(g.normalCdf(0), 0.5, "Φ(0)", 1e-7);
near(g.normalCdf(1) - g.normalCdf(-1), 0.6827, "±1σ", 1e-4);
near(g.normalCdf(1.96), 0.975, "Φ(1.96)", 1e-4);
near(g.binomialProbability(10, 5, 0.5), 252 / 1024, "C(10,5)/2^10", 1e-12);

// 곡선: 베지어가 밀도 곡선에서 높이의 0.3% 안쪽, 꼭대기가 height, 왼쪽 끝은 그림 가장자리, 오른쪽 꼬리는 X축 화살촉 뒤끝까지(테스트 ARROW 길이 4)
{
  const d = normal({ shade: 0 });
  const curve = d.lines.find((l) => l.kind === "curve").points;
  near(curve[0].anchor[0], 0, "left end");
  near(curve[curve.length - 1].anchor[0], 200 + 200 * 0.04, "right end: 화살촉 뒤끝 = 그림 오른쪽 + 축 여백");
  const sx = 200 / 70, sy = 50 / g.normalDensity(50, 50, 10);
  for (let i = 0; i + 1 < curve.length; i++) {
    for (const t of [0.25, 0.5, 0.75]) {
      const [x, y] = bez(curve[i], curve[i + 1], t);
      near(y, g.normalDensity(x / sx + 15, 50, 10) * sy, "hermite fit", 50 * 0.003);
    }
  }
  assert.ok(curve.some((p) => Math.abs(p.anchor[1] - 50) < 1e-9), "peak anchor");
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["x", "50"]);
  assert.strictEqual(d.fills.length, 0);
}
// 칠하기: 40~70, 표준화한 범위와 확률
{
  const d = normal({});
  assert.strictEqual(d.notes[0], "P(40≤X≤70) = P(-1≤Z≤2) = 0.8186");
  const pts = d.fills[0].points;
  near(pts[0].anchor[0], 25 * 200 / 70, "fill starts at a");
  assert.deepStrictEqual(pts[pts.length - 1].anchor, [pts[0].anchor[0], 0]);
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["x", "50", "40", "70"]);
}
// 한쪽: X≥a, 문자 글자, σ 눈금
{
  const d = normal({ shade: 2, a: 60, letters: true, sigmaTicks: true });
  assert.strictEqual(d.notes[0], "P(X≥60) = P(Z≥1) = 0.1587");
  const texts = d.texts.map((t) => t.text);
  for (const n of ["m", "m-2σ", "m-σ", "m+σ", "m+2σ"]) assert.ok(texts.includes(n), n);
  assert.ok(!texts.includes("a"), "a sits on m+σ");
  assert.ok(d.texts.find((t) => t.text === "m").upright === false, "m is italic");
}
// 두 분포: 높은 쪽 꼭대기가 height, 평균 글자 m₁ m₂
{
  const d = normal({ shade: 0, letters: true, curves: [{ m: 50, s: 10 }, { m: 60, s: 5 }] });
  const peaks = d.lines.filter((l) => l.kind === "curve").map((l) => Math.max(...l.points.map((p) => p.anchor[1])));
  near(peaks[1], 50, "narrow one is tallest");
  near(peaks[0], 25, "half as tall");
  const m1 = d.texts.find((t) => t.text === "m1");
  assert.deepStrictEqual(m1.sub, [1]);
}
// 이항분포 B(10, 1/2): 막대 11개(모두 보임), 3~6 칠하기, 평균·분산
{
  const d = binomial({});
  assert.strictEqual(d.fills.length, 11);
  assert.strictEqual(d.fills.filter((f) => f.k > 0).length, 4);
  assert.strictEqual(d.notes[0], "E(X) = 5, V(X) = 2.5, σ(X) = 1.58");
  assert.strictEqual(d.notes[1], "P(3≤X≤6) = " + g.formatValue((120 + 210 + 252 + 210) / 1024, 4));
  const tallest = Math.max(...d.fills.map((f) => f.points[2].anchor[1]));
  near(tallest, 50, "tallest bar = height");
  assert.strictEqual(d.texts.filter((t) => /^\d+$/.test(t.text)).length, 11);
}
// 근사 곡선과 n이 크면 5칸마다 글자
{
  const d = binomial({ n: 30, p: 0.3, approx: true, shade: 3, b: 5 });
  assert.strictEqual(d.lines.filter((l) => l.kind === "curve").length, 1);
  assert.deepStrictEqual(d.texts.filter((t) => /^\d+$/.test(t.text)).map((t) => t.text), ["0", "5", "10", "15", "20", "25", "30"]);
  assert.ok(d.notes[1].startsWith("P(X≤5) = "));
}

assert.ok(source.includes('var PREF_KEY = "HighMathDistribution/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
// 선 두께 역할: 패널 행 순서·행마다 저장 그룹. 저장은 v2(LINE_KEYS 9칸, 탭에 없는 칸은 비움)이고 v1(축·그래프·보조선)도 읽는다
{
  const rows = [...source.matchAll(/addValueRow\(lineWidthPanel, "([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(rows, ["축", "눈금", "그래프", "보조선", "막대 테두리"]);
  const decl = (name) => { const m = source.match(new RegExp(`var ${name} = [^;\\n]*;`)); assert.ok(m, `missing ${name}`); return m[0]; };
  const defaultsDecl = decl("LINE_DEFAULTS");
  const keys = defaultsDecl.match(/\w+: [A-Z_]+_PT/g).map((pair) => pair.split(":")[0]);
  assert.deepStrictEqual(keys, ["axis", "tick", "graph", "guide", "edge"]);
  for (const key of keys) assert.ok(source.includes(`setLineWidth("${key}", value); }, LINE_DEFAULTS.${key});`), `row for ${key}`);
  const prefs = {};
  const app = { preferences: { getStringPreference: (k) => prefs[k] || "", setStringPreference: (k, v) => { prefs[k] = v; } } };
  const widths = () => new Function("app", `var PREF_KEY = "K";\n${defaultsDecl.match(/[A-Z_]+_PT/g).map(decl).join("\n")}\n${defaultsDecl}\n${decl("LINE_KEYS")}
loadLineWidths();\n${["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction).join("\n")}
return { set: setLineWidth, get: currentLineWidth, save: saveLineWidths };`)(app);
  let w = widths();
  assert.deepStrictEqual(keys.map(w.get), [0.4, 0.4, 0.8, 0.3, 0.4], "defaults = widths used before the split");
  w.save();
  const saved = prefs["K/lines"].split("|");
  assert.strictEqual(saved.length, 10);
  assert.strictEqual(saved[0], "v2");
  ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"].forEach((key, i) => assert.strictEqual(saved[i + 1] === "", !keys.includes(key), key));
  prefs["K/lines"] = "v1|0.7|1.2|0.5";
  w = widths();
  assert.deepStrictEqual([w.get("axis"), w.get("graph"), w.get("guide"), w.get("tick")], [0.7, 1.2, 0.5, 0.4], "v1 values; axis no longer moves ticks");
  w.set("edge", 1.1);
  w.save();
  assert.strictEqual(widths().get("edge"), 1.1, "v2 round trip");
  prefs["K/lines"] = "v2|1|1";
  assert.strictEqual(widths().get("edge"), 0.4, "wrong field count is ignored");
}
// 그림: m, a, b 눈금은 "tick"(축은 "axis" 하나), 이항분포 막대 테두리는 EDGE_PT
{
  const d = normal({});
  assert.strictEqual(d.lines.filter((l) => l.kind === "tick").length, 3, "m, a, b");
  assert.strictEqual(d.lines.filter((l) => l.kind === "axis").length, 1);
  assert.ok(extractFunction("addPath").includes('"tick" ? TICK_PT'));
  assert.ok(extractFunction("addFill").includes("path.strokeWidth = EDGE_PT;"));
}
console.log("distribution checks passed");
