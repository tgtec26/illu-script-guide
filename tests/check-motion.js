const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(Object_HighMath2.jsx)의 "Motion" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighMath2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeMotionEngine(");
  assert.ok(start >= 0, "missing engine: makeMotionEngine");
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

const names = ["timeToX", "safeValue", "signChanges", "simpson", "buildMotion", "fmt", "straight", "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const v = (text) => g.compileFunction(g.timeToX(text));
const base = { label: "v=t^2-4t+3", a: 0, b: 4, start: 0, tMax: 5, vMin: -2, vMax: 5, unit: 10, tick: 2, lightK: 20, darkK: 45,
  shade: true, turns: true, bounds: true, formula: true, grid: false, numbers: true };
const build = (o) => g.buildMotion(Object.assign({}, base, { v: v("v=t^2-4t+3") }, o));

assert.strictEqual(g.timeToX("v=t^2-4t+3"), "v=x^2-4x+3");
assert.strictEqual(g.timeToX("v=tan t"), "v=tan x");
g.signChanges(v("v=t^2-4t+3"), 0, 5).forEach((t, i) => near(t, [1, 3][i], "turn " + i));

// v = t² - 4t + 3, [0, 4]: 변위 ∫ = 4/3, 이동 거리 = 4/3 + 4/3 + 4/3 = 4, 방향 바뀜 t=1, 3
{
  const d = build({});
  assert.strictEqual(d.notes[0], "t=0~4: 변위 1.33, 이동 거리 4");
  assert.strictEqual(d.notes[1], "위치 x(4) = x(0) + ∫v dt = 1.33");
  assert.strictEqual(d.notes[2], "운동 방향이 바뀌는 시각 t=1, t=3");
  // 칠한 면 세 개: 앞(연), 뒤(진), 앞(연)
  assert.deepStrictEqual(d.fills.map((f) => f.k), [20, 45, 20]);
  // 각 면은 t축으로 닫힌다
  for (const f of d.fills) assert.strictEqual(f.points[f.points.length - 1].anchor[1], 0);
  assert.strictEqual(d.dots.length, 2);
  assert.ok(d.texts.some((t) => t.text === "v=t2-4t+3"));
  // t=4에서 v=3 → 점선 (t=0도 v=3)
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
}
// 처음 위치를 더하고, 칠하지 않을 수도 있다
{
  const d = build({ start: 2, shade: false, b: 3 });
  assert.strictEqual(d.fills.length, 0);
  assert.strictEqual(d.notes[1], "위치 x(3) = x(0) + ∫v dt = 2");
}
// 범위를 벗어나면 그 조각은 칠하지 않고 알린다
assert.ok(build({ v: v("v=10-t"), vMax: 5 }).notes.some((n) => n.includes("칠하지 않음")));

assert.ok(source.includes('var PREF_KEY = "HighMath2Motion/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("motion checks passed");
