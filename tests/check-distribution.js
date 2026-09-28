const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 확률과 통계 묶음(Object_HighStatistics.jsx)의 "Distribution" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighStatistics.jsx"), "utf8");
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
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, TAIL_SIGMAS = 3.5, BAR_RATIO = 0.6;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
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

// 곡선: 베지어가 밀도 곡선에서 높이의 0.3% 안쪽, 꼭대기가 height, 양 끝이 그림 가장자리
{
  const d = normal({ shade: 0 });
  const curve = d.lines.find((l) => l.kind === "curve").points;
  near(curve[0].anchor[0], 0, "left end");
  near(curve[curve.length - 1].anchor[0], 200, "right end");
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
console.log("distribution checks passed");
