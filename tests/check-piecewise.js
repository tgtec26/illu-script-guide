const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(수학2.jsx)의 "Piecewise" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "수학2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makePiecewiseEngine(");
  assert.ok(start >= 0, "missing engine: makePiecewiseEngine");
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

const names = ["parseRange", "splitOperator", "numberOf", "safeValue", "valueNear", "buildPiecewise", "fmt", "straight", "plotFunction", "toBezier", "formulaDisplay", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const R = g.parseRange, f = g.compileFunction;
const piece = (formula, range) => ({ fn: f(formula), range: R(range), label: formula });
const base = { xMin: -2, xMax: 4, yMin: -1, yMax: 4, unit: 10, tick: 2, guides: true, formulas: false, grid: false, numbers: false };
const build = (pieces, o) => g.buildPiecewise(Object.assign({}, base, { pieces }, o || {}));

// 범위 읽기
const I = Infinity;
assert.deepStrictEqual(R("x<1"), { lo: -I, hi: 1, loIn: false, hiIn: false });
assert.deepStrictEqual(R("x>=2"), { lo: 2, hi: I, loIn: true, hiIn: false });
assert.deepStrictEqual(R("1<=x<3"), { lo: 1, hi: 3, loIn: true, hiIn: false });
assert.deepStrictEqual(R("-1 < x ≤ 1/2"), { lo: -1, hi: 0.5, loIn: false, hiIn: true });
assert.deepStrictEqual(R("x=1"), { lo: 1, hi: 1, loIn: true, hiIn: true });
assert.deepStrictEqual(R("3>x"), { lo: -I, hi: 3, loIn: false, hiIn: false });
for (const bad of ["", "x", "3<x<1", "1<y", "x<a", "x<1<2", "xx<1"]) assert.strictEqual(R(bad), null, bad);

// 기본 예: x<1에서 x+1, x>1에서 -x+3, f(1)=1 → x=1에서 좌극한 2 = 우극한 2 ≠ f(1)=1 → 불연속
{
  const d = build([piece("x+1", "x<1"), piece("-x+3", "x>1"), piece("1", "x=1")]);
  assert.deepStrictEqual(d.notes, ["x=1: 좌극한 2, 우극한 2, f(1)=1 → 불연속"]);
  // (1,2) 빈 점 하나(두 조각이 공유), (1,1) 채운 점
  assert.deepStrictEqual(d.dots.map((x) => [x.at, x.open]), [[[10, 20], true], [[10, 10], false]]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "graph").length, 2);
}
// 연속: x<=1에서 x^2, x>1에서 2x-1 → 채운 점 하나
{
  const d = build([piece("x^2", "x<=1"), piece("2x-1", "x>1")]);
  assert.deepStrictEqual(d.notes, ["x=1: 좌극한 1, 우극한 1, f(1)=1 → 연속"]);
  assert.deepStrictEqual(d.dots.map((x) => x.open), [false]);
}
// 점프: 좌극한 ≠ 우극한, 경계 두 개, 끝점에서 축까지 점선
{
  const d = build([piece("1", "x<0"), piece("x+2", "0<=x<2"), piece("-1", "x>=2")], { yMin: -2 });
  assert.deepStrictEqual(d.notes, ["x=0: 좌극한 1, 우극한 2, f(0)=2 → 불연속", "x=2: 좌극한 4, 우극한 -1, f(2)=-1 → 불연속"]);
  assert.deepStrictEqual(d.dots.map((x) => x.open), [true, false, true, false]);
  assert.ok(d.lines.filter((l) => l.kind === "guide").length >= 4);
}
// 정의되지 않는 곳: 1/x (x≠0)
{
  const d = build([piece("1/x", "x<0"), piece("1/x", "x>0")], { yMin: -4 });
  assert.deepStrictEqual(d.notes, ["x=0: 좌극한 -∞, 우극한 ∞, f(0)=없음 → 불연속"]);
  assert.deepStrictEqual(d.dots, [], "no dot at an asymptote");
}

assert.ok(source.includes('var PREF_KEY = "HighMathPiecewise/settings";'));
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
  w.set("grid", 1.1);
  w.save();
  assert.strictEqual(widths().get("grid"), 1.1, "v2 round trip");
  prefs["K/lines"] = "v2|1|1";
  assert.strictEqual(widths().get("grid"), 0.3, "wrong field count is ignored");
}
// 그림: 눈금은 "tick", 격자는 "grid"로 그려 축·보조선 두께와 따로 간다
{
  const d = build([piece("x+1", "x<1")], { grid: true });
  assert.strictEqual(d.lines.filter((l) => l.kind === "tick").length, 6 + 5, "x ticks -2..4, y ticks -1..4 without 0");
  assert.strictEqual(d.lines.filter((l) => l.kind === "axis").length, 2, "axis kind is only the two axes");
  assert.ok(d.lines.some((l) => l.kind === "grid"));
  const addPath = extractFunction("addPath");
  assert.ok(addPath.includes('line.kind === "tick" ? TICK_PT') && addPath.includes('line.kind === "grid" ? GRID_PT'));
}
// 그래프는 X축 화살촉 뒤끝(테스트 ARROW 길이 4)까지 진행한다 (그림 제작 규칙 7.7)
{
  const rightmost = (lines, kind) => Math.max(...lines.filter((l) => l.kind === kind).flatMap((l) => l.points.map((p) => (p.anchor ? p.anchor[0] : p[0]))));
const open = build([piece("y=1", "x>=1")], { xMin: -2, xMax: 5, yMin: -1, yMax: 6, guides: false });
  assert.ok(Math.abs(rightmost(open.lines, "graph") - ((5 + 0.8) * 10 - 4)) < 1e-3, "open piece reaches the arrowhead rear");
  const closed = build([piece("y=1", "1<=x<3")], { xMin: -2, xMax: 5, yMin: -1, yMax: 6, guides: false });
  assert.ok(Math.abs(rightmost(closed.lines, "graph") - 30) < 1e-3, "closed piece ends at its own end");
}
console.log("piecewise checks passed");
