const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(수학2.jsx)의 "Motion" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학2.jsx"), "utf8");
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
// 선 두께 역할: 패널 행 순서·행마다 저장 그룹. 저장은 v2(LINE_KEYS 9칸, 탭에 없는 칸은 비움)이고 v1(축·그래프·보조선)도 읽는다
{
  const rows = [...source.matchAll(/addValueRow\(lineWidthPanel, "([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(rows, ["축", "눈금", "그래프", "보조선", "모눈"]);
  const decl = (name) => { const m = source.match(new RegExp(`var ${name} = [^;\\n]*;`)); assert.ok(m, `missing ${name}`); return m[0]; };
  const defaultsDecl = decl("LINE_DEFAULTS");
  const keys = defaultsDecl.match(/\w+: [A-Z_]+_PT/g).map((pair) => pair.split(":")[0]);
  assert.deepStrictEqual(keys, ["axis", "tick", "graph", "guide", "grid"]);
  for (const key of keys) assert.ok(source.includes(`setLineWidth("${key}", value); }, LINE_DEFAULTS.${key});`), `row for ${key}`);
  const prefs = {};
  const app = { preferences: { getStringPreference: (k) => prefs[k] || "", setStringPreference: (k, v) => { prefs[k] = v; } } };
  const widths = () => new Function("app", `var PREF_KEY = "K";\n${defaultsDecl.match(/[A-Z_]+_PT/g).map(decl).join("\n")}\n${defaultsDecl}\n${decl("LINE_KEYS")}
loadLineWidths();\n${["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction).join("\n")}
return { set: setLineWidth, get: currentLineWidth, save: saveLineWidths };`)(app);
  let w = widths();
  assert.deepStrictEqual(keys.map(w.get), [0.4, 0.4, 0.8, 0.3, 0.3], "defaults = widths used before the split");
  w.save();
  const saved = prefs["K/lines"].split("|");
  assert.strictEqual(saved.length, 10);
  assert.strictEqual(saved[0], "v2");
  ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"].forEach((key, i) => assert.strictEqual(saved[i + 1] === "", !keys.includes(key), key));
  prefs["K/lines"] = "v1|0.7|1.2|0.5";
  w = widths();
  assert.deepStrictEqual([w.get("axis"), w.get("graph"), w.get("guide"), w.get("tick")], [0.7, 1.2, 0.5, 0.4], "v1 values; axis no longer moves ticks");
  w.set("tick", 1.1);
  w.save();
  assert.strictEqual(widths().get("tick"), 1.1, "v2 round trip");
  prefs["K/lines"] = "v2|1|1";
  assert.strictEqual(widths().get("tick"), 0.4, "wrong field count is ignored");
}
// 그림: 눈금은 "tick", 격자는 "grid"
{
  const d = build({ grid: true });
  assert.strictEqual(d.lines.filter((l) => l.kind === "tick").length, 5 + 7, "t ticks 1..5, v ticks -2..5 without 0");
  assert.strictEqual(d.lines.filter((l) => l.kind === "axis").length, 2);
  assert.ok(d.lines.some((l) => l.kind === "grid"));
  const addPath = extractFunction("addPath");
  assert.ok(addPath.includes('"tick" ? TICK_PT') && addPath.includes('"grid" ? GRID_PT'));
}
console.log("motion checks passed");
