const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(수학1.jsx)의 "Triangle" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeTriangleEngine(");
  assert.ok(start >= 0, "missing engine: makeTriangleEngine");
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

const names = ["solveTriangle", "describeTriangle", "trim", "buildTriangle", "circumcenter", "smallAngle", "arcPoints", "contains", "plain", "sub", "unit"];
const g = new Function(`var DOT_RADIUS_MM = 0.6, MM_TO_PT = 2.834645669;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 세 변 3-4-5: 직각은 C (a=3, b=4, c=5)
{
  const t = g.solveTriangle(0, { a: 3, b: 4, c: 5 });
  near(t.C, 90, "right angle at C"); near(t.A + t.B + t.C, 180, "angle sum");
  assert.ok(g.solveTriangle(0, { a: 1, b: 2, c: 3 }).error, "degenerate triangle refused");
}
// 두 변과 끼인각: b=5, c=8, A=60° → a=7 (코사인법칙)
{
  const t = g.solveTriangle(1, { b: 5, c: 8, A: 60 });
  near(t.a, 7, "law of cosines");
  assert.deepStrictEqual(t.given, ["A"]);
}
// 한 변과 양 끝 각: a=10, B=45°, C=75° → A=60°, b = 10·sin45/sin60 (사인법칙)
{
  const t = g.solveTriangle(2, { a: 10, B: 45, C: 75 });
  near(t.A, 60, "A"); near(t.b, 10 * Math.sin(Math.PI / 4) / Math.sin(Math.PI / 3), "law of sines");
  assert.ok(g.solveTriangle(2, { a: 10, B: 100, C: 80 }).error);
}
// 설명: R = a / (2 sin A), 넓이 = bc sin A / 2
assert.ok(g.describeTriangle(g.solveTriangle(1, { b: 5, c: 8, A: 60 })).includes("넓이 = 17.32"));

// 그림: B(0,0), C(a,0), A가 위. 변 길이가 입력과 같다. 외접원이 세 꼭짓점을 지난다
{
  const t = g.solveTriangle(0, { a: 7, b: 5, c: 8 });
  const d = g.buildTriangle(t, { unit: 10, mode: 0, sideStyle: 1, angleStyle: 2, circle: true, center: true, markRadius: 5 });
  const [A, B, C] = d.lines[0].points.map((p) => p.anchor);
  assert.deepStrictEqual(B, [0, 0]); near(C[0], 70, "BC"); assert.ok(A[1] > 0, "A on top");
  near(Math.hypot(A[0] - C[0], A[1] - C[1]), 50, "CA = b"); near(Math.hypot(A[0], A[1]), 80, "AB = c");
  const circle = d.circles[0];
  for (const V of [A, B, C]) near(Math.hypot(V[0] - circle.center[0], V[1] - circle.center[1]), circle.radius, "circumcircle");
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3, "three angle marks");
  assert.deepStrictEqual(d.texts.filter((x) => ["a", "b", "c"].includes(x.text)).map((x) => x.text), ["a", "b", "c"]);
  // 변 글자는 바깥쪽: a(밑변)는 아래
  const aLabel = d.texts.find((x) => x.text === "a");
  near(aLabel.dir[1], -1, "a label below BC");
}
// 주어진 각만: SAS면 A 하나
{
  const d = g.buildTriangle(g.solveTriangle(1, { b: 5, c: 8, A: 60 }), { unit: 10, sideStyle: 0, angleStyle: 1, circle: false, center: false, markRadius: 5 });
  assert.deepStrictEqual(d.texts.filter((x) => x.text.endsWith("°")).map((x) => x.text), ["60°"]);
}

assert.ok(source.includes('var PREF_KEY = "HighMathTriangle/settings";'));
// 글자 간격(labelGapMm): 라벨 배치는 상수가 아니라 옵션 값을 쓰고, 저장은 v2(19칸)이며 간격이 생기기 전 v1(18칸)도 읽는다
assert.ok(!source.includes("LABEL_GAP_MM * MM_TO_PT"), "label placement must use the labelGapMm option, not the constant");
assert.strictEqual(source.split("labelGapMm * MM_TO_PT").length - 1, 2, "stacked and plain labels both use labelGapMm");
assert.ok(source.includes('"글자 간격"') && source.includes("bindValueRow(gapControls"));
assert.ok(source.includes('var parts = ["v2"') && source.includes('p[0] === "v1" && p.length === 18') && source.includes('p[0] === "v2" && p.length === 19'));
// 선 두께: 각 표시 호(mark, 실선)는 보조선과 따로 표시 행
assert.ok(source.includes('addValueRow(lineWidthPanel, "표시", "pt", currentLineWidth("mark")'));
assert.ok(source.includes('path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "mark" ? MARK_PT : GUIDE_PT);'), "angle marks use MARK_PT");
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
checkLineWidths(["graph", "guide", "mark"]);
console.log("triangle checks passed");
