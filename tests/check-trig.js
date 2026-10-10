const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(수학1.jsx)의 "Trig" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeTrigEngine(");
  assert.ok(start >= 0, "missing engine: makeTrigEngine");
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

const names = ["trigFunction", "buildTrig", "addCurve", "addPeriod", "piText", "trigFormula", "formatValue", "straight", "plotFunction", "toBezier",
  "tanAsymptotes", "solveEquation", "snapPi", "exactPi", "solveInequality", "kText", "parseSurd"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, SMALL_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 }, KINDS = ["sin", "cos", "tan"];
var INEQUALITIES = ["없음", "f(x) > g(x)", "f(x) ≥ g(x)", "f(x) < g(x)", "f(x) ≤ g(x)"], ROOT_NAMES = ["α", "β", "γ", "δ", "ε", "ζ", "η"];\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const bez = (p, q, t) => { const s = 1 - t; return [0, 1].map((i) => s * s * s * p.anchor[i] + 3 * s * s * t * p.right[i] + 3 * s * t * t * q.left[i] + t * t * t * q.anchor[i]); };
const base = { kind: 0, a: 2, b: 2, c: 0, d: 0, xMinHalf: -2, xMaxHalf: 6, sx: 10, sy: 10, tick: 2, extremes: true, period: true, asymptotes: true,
  reference: false, formula: true, grid: false, numbers: true, second: null, kLine: false, k: 0.5, meets: true, inequality: 0, target: 0 };
const build = (o) => g.buildTrig(Object.assign({}, base, o));

// π 글자
assert.deepStrictEqual([1, 2, 0.5, -0.5, 2 / 3, 1.5, -0.25, 0].map(g.piText), ["π", "2π", "π/2", "-π/2", "2π/3", "3π/2", "-π/4", "0"]);

// 식 글자
assert.strictEqual(g.trigFormula(base).text, "y=2sin 2x");
assert.deepStrictEqual(g.trigFormula(base).roman, [3, 4, 5]);
assert.strictEqual(g.trigFormula(Object.assign({}, base, { kind: 1, a: -1, b: 1, c: 0.25, d: 1 })).text, "y=-cos(x-π/4)+1");
assert.strictEqual(g.trigFormula(Object.assign({}, base, { kind: 2, a: 1, b: 1, c: 0 })).text, "y=tan x");
assert.strictEqual(g.trigFormula(Object.assign({}, base, { b: 3, c: -0.5 })).text, "y=2sin 3(x+π/2)");

// y=2sin 2x: 진폭 2, 주기 π, 곡선이 함수 위에, 주기 치수선은 이웃한 꼭대기 π/4 → 5π/4
{
  const d = build({});
  assert.strictEqual(d.notes[0], "진폭 2, 주기 π, 최댓값 2, 최솟값 -2");
  const fn = g.trigFunction(0, 2, 2, 0, 0);
  for (const line of d.lines.filter((l) => l.kind === "graph")) {
    for (let i = 0; i + 1 < line.points.length; i++) {
      const q = bez(line.points[i], line.points[i + 1], 0.5);
      near(q[1] / 10, fn(q[0] / 10), "curve on sin", 0.01);
    }
  }
  const arrows = d.arrows.filter((a) => a.small);
  assert.strictEqual(arrows.length, 2);
  near(arrows[0].tip[0], -3 * Math.PI / 4 * 10, "first peak inside the range", 1e-9);
  near(arrows[1].tip[0] - arrows[0].tip[0], Math.PI * 10, "one period apart");
  assert.ok(d.texts.some((t) => t.text === "π" && t.dir[1] === 1), "period label");
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide" && l.points[0].anchor[1] === l.points[1].anchor[1]).length, 2, "max/min lines");
  assert.ok(d.texts.some((t) => t.text === "3π/2"), "π/2 ticks");
  assert.ok(d.texts.some((t) => t.text === "y=2sin 2x"));
}
// a < 0이면 꼭대기가 반 주기 옮겨진다: y=-sin x 꼭대기 -π/2
{
  const d = build({ a: -1, b: 1 });
  const arrows = d.arrows.filter((a) => a.small);
  near(arrows[0].tip[0], -Math.PI / 2 * 10, "peak of -sin x");
}
// 최댓값·최솟값이 정수가 아니면 세로축에 값
{
  const d = build({ a: 1.5, d: 0.5 });
  assert.strictEqual(d.notes[0], "진폭 1.5, 주기 π, 최댓값 2, 최솟값 -1");
  const d2 = build({ a: 1.5, d: 0 });
  assert.ok(d2.texts.some((t) => t.text === "1.5") && d2.texts.some((t) => t.text === "-1.5"));
}
// tan x: 점근선 x=±π/2, 3π/2 …, 주기 π
{
  const d = build({ kind: 2, a: 1, b: 1 });
  assert.strictEqual(d.notes[0], "주기 π, 최댓값·최솟값 없음");
  assert.strictEqual(d.notes[1], "점근선 x=π/2+π×n (n은 정수)");
  const verticals = d.lines.filter((l) => l.kind === "guide" && l.points[0].anchor[0] === l.points[1].anchor[0]);
  assert.deepStrictEqual(verticals.map((l) => Math.round(l.points[0].anchor[0] / Math.PI * 2 / 10)), [-1, 1, 3, 5]);
  assert.ok(d.lines.filter((l) => l.kind === "graph").length >= 4, "tan pieces between asymptotes");
}
// 원래 그래프 점선
assert.ok(build({ reference: true }).lines.some((l) => l.kind === "guide" && l.points.length > 2));
// 주기가 범위보다 길면 알린다
assert.ok(build({ b: 0.5, xMinHalf: 0, xMaxHalf: 4 }).notes.some((n) => n.includes("들어가지 않음")));

// k 글자와 읽기
assert.deepStrictEqual([0.5, Math.sqrt(3) / 2, -Math.sqrt(2) / 2, 1, -2, 0.35, Math.sqrt(3), 2 * Math.sqrt(2)].map(g.kText), ["1/2", "√3/2", "-√2/2", "1", "-2", "0.35", "√3", "2√2"]);
near(g.parseSurd("√3/2"), Math.sqrt(3) / 2, "√3/2");
near(g.parseSurd("-r2/2"), -Math.sqrt(2) / 2, "r2/2");
near(g.parseSurd("2√2"), 2 * Math.sqrt(2), "2√2");
near(g.parseSurd("-1/2"), -0.5, "-1/2");
near(g.parseSurd("0,5"), 0.5, "0,5");
assert.strictEqual(g.parseSurd("abc"), null);
assert.strictEqual(g.parseSurd("1/0"), null);

// 0 ≤ x ≤ 2π에서 sin x와 y=k
const sinBase = { kind: 0, a: 1, b: 1, c: 0, d: 0, xMinHalf: 0, xMaxHalf: 4, period: false, extremes: false };
const sinWith = (o) => build(Object.assign({}, sinBase, o));
{
  const d = sinWith({ kLine: true, k: 0.5 });
  assert.ok(d.notes.includes("교점 (y=1/2): x = π/6, 5π/6"), d.notes.join(" / "));
  assert.ok(d.texts.some((t) => t.text === "π/6" && t.dir[1] === -1), "root label under the axis");
  assert.ok(d.texts.some((t) => t.text === "y=1/2"), "k line label");
  assert.ok(d.texts.some((t) => t.text === "1/2" && t.dir[0] === -1), "k on the y axis");
  assert.strictEqual(d.dots.length, 2);
  near(d.dots[0].at[1], 5, "intersection on y=1/2");
}
{
  const d = sinWith({ kLine: true, k: 0.5, inequality: 2 });
  assert.ok(d.notes.includes("f(x) ≥ 1/2의 해: π/6 ≤ x ≤ 5π/6"), d.notes.join(" / "));
  const sol = d.lines.filter((l) => l.kind === "solution");
  assert.strictEqual(sol.length, 1);
  near(sol[0].points[0].anchor[0], Math.PI / 6 * 10, "solution from π/6");
  assert.ok(d.dots.filter((p) => p.at[1] === 0).every((p) => !p.open), "closed ends for ≥");
}
{
  const d = sinWith({ kLine: true, k: 0.5, inequality: 3 });
  assert.ok(d.notes.includes("f(x) < 1/2의 해: 0 ≤ x < π/6, 5π/6 < x ≤ 2π"), d.notes.join(" / "));
  assert.ok(d.dots.filter((p) => p.at[1] === 0).every((p) => p.open), "open ends for <");
}
// 닿는 근: sin x ≥ 1은 x = π/2 한 점, sin x < 1은 π/2만 빠진다, sin x > 1은 해 없음
assert.ok(sinWith({ kLine: true, k: 1, inequality: 2 }).notes.includes("f(x) ≥ 1의 해: x = π/2"));
assert.ok(sinWith({ kLine: true, k: 1, inequality: 3 }).notes.includes("f(x) < 1의 해: 0 ≤ x < π/2, π/2 < x ≤ 2π"));
assert.ok(sinWith({ kLine: true, k: 1, inequality: 1 }).notes.includes("f(x) > 1의 해: 없음"));
assert.ok(sinWith({ kLine: true, k: 1 }).notes.includes("교점 (y=1): x = π/2"));
// √3/2
assert.ok(sinWith({ kLine: true, k: Math.sqrt(3) / 2 }).notes.includes("교점 (y=√3/2): x = π/3, 2π/3"));
// π의 분수가 아니면 α, β
{
  const d = sinWith({ kLine: true, k: 0.3, inequality: 1 });
  assert.ok(d.notes.includes("교점 (y=0.3): x = α, β"), d.notes.join(" / "));
  assert.ok(d.notes.includes("f(x) > 0.3의 해: α < x < β"));
  assert.ok(d.texts.some((t) => t.text === "α") && d.texts.some((t) => t.text === "β"));
}
// 두 번째 그래프: sin x = cos x, sin x ≥ cos x
{
  const d = sinWith({ second: { kind: 1, a: 1, b: 1, c: 0, d: 0 }, inequality: 2, target: 1 });
  assert.ok(d.notes.includes("교점 (두 번째 그래프): x = π/4, 5π/4"), d.notes.join(" / "));
  assert.ok(d.notes.includes("f(x) ≥ g(x)의 해: π/4 ≤ x ≤ 5π/4"));
  assert.ok(d.texts.some((t) => t.text === "y=cos x"), "second formula");
  assert.ok(d.dots.some((p) => p.at[1] < 0), "second meet below the axis");
  assert.ok(d.texts.some((t) => t.text === "5π/4" && t.dir[1] === 1), "label above the axis for a point below");
}
// 두 번째 그래프를 켜지 않고 고르면 알린다
assert.ok(sinWith({ inequality: 2, target: 1 }).notes.includes("부등식: 두 번째 그래프를 켜야 함"));
// tan x > 1: 점근선에서 열린 점
{
  const d = build({ kind: 2, a: 1, b: 1, c: 0, d: 0, xMinHalf: 0, xMaxHalf: 4, kLine: true, k: 1, inequality: 1 });
  assert.ok(d.notes.includes("f(x) > 1의 해: π/4 < x < π/2, 5π/4 < x < 3π/2"), d.notes.join(" / "));
  assert.strictEqual(d.dots.filter((p) => p.at[1] === 0 && p.open).length, 4);
}
// cos x ≤ 0 (k = 0): 근이 눈금과 겹치면 글자를 따로 넣지 않는다
{
  const d = sinWith({ kind: 1, kLine: true, k: 0, inequality: 4 });
  assert.ok(d.notes.includes("f(x) ≤ 0의 해: π/2 ≤ x ≤ 3π/2"), d.notes.join(" / "));
  assert.strictEqual(d.texts.filter((t) => t.text === "π/2").length, 1);
}
// 같은 그래프면 겹친다고 알린다
assert.ok(sinWith({ second: { kind: 0, a: 1, b: 1, c: 0, d: 0 } }).notes.includes("겹침 (두 번째 그래프)"));
// 세로 범위가 k와 두 번째 그래프를 담는다
{
  const d = sinWith({ kLine: true, k: 3 });
  assert.ok(d.texts.some((t) => t.text === "3" && t.dir[0] === -1), "y range covers k");
}

assert.ok(source.includes('var PREF_KEY = "HighMathTrig/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("trig checks passed");
