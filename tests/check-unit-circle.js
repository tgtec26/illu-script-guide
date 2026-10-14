const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(수학1.jsx)의 "UnitCircle" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeUnitCircleEngine(");
  assert.ok(start >= 0, "missing engine: makeUnitCircleEngine");
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

const names = ["buildUnitCircle", "spiralPoints", "angleLabel", "gcd", "straight", "dist", "unit"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { theta: 120, radius: 50, arcRadius: 10, angleStyle: 0, pointStyle: 0, circle: true, showRadius: true, arc: true,
  perpendiculars: true, units: true, tangent: false };
const build = (extra) => g.buildUnitCircle(Object.assign({}, base, extra));

// 각 글자
assert.deepStrictEqual([120, -90, 180, 45, 50, 0, 390].map((d) => g.angleLabel(d, 2)), ["2π/3", "-π/2", "π", "π/4", "5π/18", "0", "13π/6"]);
assert.strictEqual(g.angleLabel(120, 1), "120°");
assert.strictEqual(g.angleLabel(120, 0), "θ");

// P는 원 위, 수선은 두 축까지
{
  const d = build({});
  const P = d.dots[d.dots.length - 1];
  near(P[0], 50 * Math.cos(2 * Math.PI / 3), "P x"); near(P[1], 50 * Math.sin(2 * Math.PI / 3), "P y");
  const guides = d.lines.filter((l) => l.kind === "guide").map((l) => l.points[1].anchor);
  assert.strictEqual(guides.length, 2);
  near(guides[0][1], 0, "foot on x axis"); near(guides[1][0], 0, "foot on y axis");
}

// 회전 호: 끝이 동경 방향, 양의 각은 반시계, 음의 각은 시계 방향으로 끝난다
for (const theta of [120, -45, 300]) {
  const d = build({ theta });
  const arc = d.lines.find((l) => l.kind === "mark").points;
  const end = arc[arc.length - 1].anchor;
  near(Math.atan2(end[1], end[0]), Math.atan2(Math.sin(theta * Math.PI / 180), Math.cos(theta * Math.PI / 180)), `arc ends on the ray (${theta})`);
  const arrow = d.arrows[d.arrows.length - 1];
  const crossZ = end[0] * arrow.dir[1] - end[1] * arrow.dir[0];
  assert.ok(theta > 0 ? crossZ > 0 : crossZ < 0, `arrow turns the right way (${theta})`);
}

// 일반각 390°: 한 바퀴를 넘으면 나선이라 끝 반지름이 처음보다 크다
{
  const arc = build({ theta: 390 }).lines.find((l) => l.kind === "mark").points;
  const r0 = Math.hypot(...arc[0].anchor), r1 = Math.hypot(...arc[arc.length - 1].anchor);
  near(r0, 10, "starts at arc radius");
  assert.ok(r1 > r0 + 2, "spiral grows after a full turn");
  // 베지어 가운데가 나선 위
  const p0 = arc[5].anchor, p1 = arc[5].right, p2 = arc[6].left, p3 = arc[6].anchor;
  const mid = [0, 1].map((k) => (p0[k] + 3 * p1[k] + 3 * p2[k] + p3[k]) / 8);
  const t = Math.atan2(mid[1], mid[0]);
  assert.ok(Math.abs(Math.hypot(...mid) - (Math.hypot(...p0) + Math.hypot(...p3)) / 2) < 0.05, "smooth spiral piece");
}

// tan 선: T = (1, tan θ). 제2사분면(120°)은 원점 반대쪽으로 연장한 점선
{
  const d = build({ tangent: true, theta: 120 });
  const T = d.dots[0];
  near(T[0], 50, "T on x=1"); near(T[1], 50 * Math.tan(2 * Math.PI / 3), "T = tan θ");
  assert.ok(d.texts.some((t) => t.text === "T"));
  assert.strictEqual(build({ tangent: true, theta: 90 }).dots.length, 1, "no T when cos θ = 0");
  // x=1 직선은 보조 실선(thin), 회전 호는 표시(mark), 연장선은 점선(guide)
  const thin = d.lines.filter((l) => l.kind === "thin");
  assert.strictEqual(thin.length, 1, "only the x=1 line is thin");
  assert.ok(thin[0].points.every((p) => Math.abs(p.anchor[0] - 50) < 1e-9), "thin line is x=1");
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 1, "rotation arc is a mark");
}

// 점 글자: cos·sin은 똑바로
{
  const label = build({ pointStyle: 1 }).texts.find((t) => t.text.startsWith("P("));
  assert.strictEqual(label.text, "P(cos θ, sin θ)");
  assert.deepStrictEqual(label.roman.map((i) => label.text[i]).join(""), "cossin");
}

assert.ok(source.includes('var PREF_KEY = "HighMathUnitCircle/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(bundle.includes('var TAB_PREF_KEY = "HighMath1/tab";'));
// 선 두께: 표시(회전 호)와 보조 실선(x=1)이 따로 행을 갖는다
assert.ok(source.includes('addValueRow(lineWidthPanel, "표시", "pt", currentLineWidth("mark")') && source.includes('addValueRow(lineWidthPanel, "보조 실선", "pt", currentLineWidth("thin")'));
assert.ok(source.includes('line.kind === "mark" ? MARK_PT : (line.kind === "thin" ? THIN_PT : GUIDE_PT)'), "mark and thin have their own widths");
// 선 두께 저장: v2 + LINE_KEYS 9칸(이 탭에 없는 선은 빈칸), v1(축·그래프·보조선)도 읽고, 0.1–2로 자른다
function checkLineWidths(expectedKeys) {
  const defaults = source.slice(source.indexOf("var LINE_DEFAULTS = {") + 21, source.indexOf("};", source.indexOf("var LINE_DEFAULTS = {")))
    .split(",").map((s) => s.trim().split(/:\s*/));
  assert.deepStrictEqual(defaults.map(([k]) => k), expectedKeys, "LINE_DEFAULTS keys in panel order");
  const keysStart = source.indexOf("var LINE_KEYS = [");
  const keysLine = source.slice(keysStart, source.indexOf(";", keysStart) + 1);
  assert.strictEqual(keysLine, 'var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];');
  let stored = "";
  const app = { preferences: { getStringPreference: () => stored, setStringPreference: (key, value) => { stored = value; } } };
  const lw = new Function("app", `var PREF_KEY = "K"; var ${defaults.map(([, v]) => v + " = 1").join(", ")};\n${keysLine}\n` +
    `var LINE_DEFAULTS = {${defaults.map(([k, v]) => k + ": " + v).join(", ")}};\n` +
    ["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction).join("\n") +
    "\nreturn { set: setLineWidth, get: currentLineWidth, load: loadLineWidths, save: saveLineWidths };")(app);
  const allKeys = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
  expectedKeys.forEach((k, i) => lw.set(k, 0.1 * (i + 2)));
  lw.save();
  const parts = stored.split("|");
  assert.strictEqual(parts.length, 10, "v2 has 10 fields");
  assert.strictEqual(parts[0], "v2");
  allKeys.forEach((k, i) => assert.strictEqual(parts[i + 1] === "", !expectedKeys.includes(k), `field ${k}`));
  expectedKeys.forEach((k) => { assert.ok(Math.abs(lw.get(k) - parseFloat(parts[allKeys.indexOf(k) + 1])) < 1e-9, `saved ${k}`); lw.set(k, 1); });
  lw.load();
  expectedKeys.forEach((k, i) => assert.ok(Math.abs(lw.get(k) - 0.1 * (i + 2)) < 1e-9, `v2 restores ${k}`));
  expectedKeys.forEach((k) => lw.set(k, 1));
  stored = "v1|0.5|1.5|0.7";
  lw.load();
  const v1 = { axis: 0.5, graph: 1.5, guide: 0.7 };
  expectedKeys.forEach((k) => assert.strictEqual(lw.get(k), k in v1 ? v1[k] : 1, `v1 ${k}`));
  stored = "v2|9|9|9|9|9|9|9|9";
  lw.load();
  expectedKeys.forEach((k) => assert.strictEqual(lw.get(k), k in v1 ? v1[k] : 1, `short v2 ignored (${k})`));
  stored = "v2|" + allKeys.map(() => "5").join("|");
  lw.load();
  expectedKeys.forEach((k) => assert.strictEqual(lw.get(k), 2, `clamped ${k}`));
}
checkLineWidths(["axis", "graph", "guide", "mark", "thin"]);
console.log("unit circle checks passed");
