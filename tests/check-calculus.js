const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(Object_HighMath2.jsx)의 "Calculus" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighMath2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCalculusEngine(");
  assert.ok(start >= 0, "missing engine: makeCalculusEngine");
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

const names = ["buildCalculus", "regionPoints", "wholeCurve", "reverseBezier", "simpson", "derivative", "secondDerivative", "clipLine",
  "lineEquation", "clampValue", "formatValue", "unit", "straight", "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = {
  fLabel: "", g: null, gLabel: "", xMin: -1, xMax: 5, yMin: -1, yMax: 5, unit: 10, tick: 2, grid: false, numbers: true, formulas: false,
  fontSize: 8, shade: 1, shadeK: 20, a: 0, b: 4, count: 4, areaName: "S", ends: 0, bounds: false, tangent: false, t: 1, tangentName: "P", tangentGuides: true
};
const build = (o) => g.buildCalculus(Object.assign({}, base, o));
const f = g.compileFunction("y=-x^2+4x");

// 적분·미분
near(g.simpson((x) => x * x, 0, 3), 9, "simpson x^2");
near(g.derivative(f, 1), 2, "f'(1)", 1e-6);
assert.ok(g.secondDerivative(f, 1) < 0, "concave down");
assert.strictEqual(g.lineEquation(2, 1), "y = 2x + 1");
assert.strictEqual(g.lineEquation(-1, -3), "y = -x - 3");
assert.strictEqual(g.lineEquation(0, 4), "y = 4");
assert.strictEqual(g.lineEquation(1, 0), "y = x");
assert.deepStrictEqual(g.clipLine(1, 3, 2, -1, 5, -1, 5), [-1, 2]);
assert.strictEqual(g.clipLine(0, 9, 0, -1, 5, -1, 5), null);

// 넓이 칠하기: -x^2+4x, [0, 4] → 32/3. 닫힌 영역 하나, 위 곡선 a→b 뒤 x축 b→a, S 글자는 대칭축 x=2 위
{
  const d = build({ f });
  assert.ok(d.notes[0].includes("10.67"), d.notes[0]);
  assert.strictEqual(d.fills.length, 1);
  const pts = d.fills[0].points;
  assert.deepStrictEqual(pts[0].anchor, [0, 0]);
  assert.deepStrictEqual(pts[pts.length - 1].anchor, [0, 0]);
  near(pts[pts.length - 3].anchor[0], 40, "upper curve ends at b");
  const s = d.texts.find((t) => t.text === "S");
  near(s.at[0], 20, "S on x=2", 1e-3);
  assert.ok(s.at[1] > 0 && s.at[1] < 40);
  assert.ok(d.texts.some((t) => t.text === "a") === false, "a=0 sits on O");
  assert.ok(d.texts.some((t) => t.text === "b"));
}
// y 범위를 넘으면 칠하지 않고 알린다
{
  const d = build({ f, yMax: 3 });
  assert.strictEqual(d.fills.length, 0);
  assert.ok(d.notes.some((n) => n.includes("벗어남")));
}
// 두 곡선 사이: y=x와 y=x^2, [0, 1] → 1/6. 아래 곡선은 거꾸로 이어 붙인다
{
  const d = build({ f: g.compileFunction("y=x"), g: g.compileFunction("y=x^2"), a: 0, b: 1, xMax: 2, yMax: 2 });
  assert.ok(d.notes[0].startsWith("∫(f-g)dx = 0.17"), d.notes[0]);
  const pts = d.fills[0].points;
  assert.deepStrictEqual(pts[0].anchor, [0, 0]);
  near(pts[pts.length - 1].anchor[0], 0, "closes back at a");
  assert.strictEqual(d.lines.filter((l) => l.kind === "graph").length, 2);
}
// x축 아래 부분이 있으면 정적분과 넓이가 다르다 (x^3-x, [-1, 1]: 0, 1/2)
{
  const d = build({ f: g.compileFunction("y=x^3-x"), a: -1, b: 1, xMin: -2, yMin: -2 });
  assert.ok(d.notes[0].includes("= 0,") && d.notes[0].includes("넓이 = 0.5"), d.notes[0]);
}
// 직사각형: 오른쪽 끝, 4개 → 넓이 합 3+4+3+0 = 10, 높이 0인 칸은 그리지 않는다
{
  const d = build({ f, shade: 3 });
  assert.ok(d.notes.some((n) => n === "직사각형 4개 넓이 합 = 10"), d.notes.join("/"));
  assert.strictEqual(d.fills.length, 3);
  assert.ok(d.fills.every((r) => r.stroked && r.points.length === 4));
  const left = build({ f, shade: 2 });
  assert.ok(left.notes.some((n) => n === "직사각형 4개 넓이 합 = 10"));
}
// 끝 글자: 값이면 눈금 숫자와 겹치는 정수는 빼고, 소수만 붙인다
{
  const d = build({ f, a: 0.5, b: 4, ends: 1 });
  assert.ok(d.texts.some((t) => t.text === "0.5"));
  assert.strictEqual(d.texts.filter((t) => t.text === "4" && t.at[0] === 40).length, 1, "b=4 already has a tick number");
}
// 접선: t=1 → y = 2x + 1, P 글자는 위로 볼록한 곡선의 바깥(위)쪽
{
  const d = build({ f, shade: 0, tangent: true });
  assert.ok(d.notes.includes("접선 y = 2x + 1"), d.notes.join("/"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "graph").length, 2);
  const p = d.texts.find((t) => t.text === "P");
  assert.deepStrictEqual(p.at, [10, 30]);
  assert.ok(p.dir[1] > 0, "label above the tangent");
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
}
// 미분할 수 없는 곳
{
  const d = build({ f: g.compileFunction("y=√x"), shade: 0, tangent: true, t: -1 });
  assert.ok(d.notes.some((n) => n.includes("미분할 수 없음")));
}

assert.ok(source.includes('var PREF_KEY = "HighMathCalculus/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
assert.ok(!/[(,=]\s*\/=/.test(source), "regex literal must not start with = (ExtendScript syntax error)");
console.log("calculus checks passed");
