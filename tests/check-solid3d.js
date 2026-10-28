const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(기하.jsx)의 "3D 입체" 탭 엔진에서 계산 함수만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "기하.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeSolid3DEngine(");
  assert.ok(start >= 0, "missing engine");
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
const names = ["dot3", "sub3", "cross3", "makeView", "parsePoints3D", "ringPoint", "polyhedron", "buildPreset", "ringRuns", "buildSolid3D",
  "evalNumber", "splitItems", "tokenizeNames", "display", "straight", "unitVector"];
const make = new Function("s", `
var MM_TO_PT = 2.834645669, CURVE_STEPS = 96, MARK_MM = 1.8, ARC_MM = 3;
var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
var text = s.text, preset = s.preset, sides = s.sides, showNames = s.showNames, showHidden = s.showHidden;
var azimuthDeg = 20, elevationDeg = 25, sizeMm = 50;
${names.map(extractFunction).join("\n")}
return {${names.join(",")}};`);
const TEXT0 = { radiusText: "2", heightText: "3", pointsText: "", segmentText: "", dashedText: "", dotText: "", labelDirText: "", lengthText: "", angleText: "", fillText: "" };
const api = ({ text = {}, ...rest } = {}) => make(Object.assign({ preset: 1, sides: 4, showNames: true, showHidden: true }, rest, { text: Object.assign({}, TEXT0, text) }));
const dashed = (d) => d.lines.filter((l) => l.kind === "dashed").length;

// 사각기둥: 모서리 12개(점선 3개), 이름 8개
{
  const d = api().buildSolid3D();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.length, 12);
  assert.strictEqual(dashed(d), 3);
  assert.strictEqual(d.texts.length, 8);
  const a1 = d.texts.find((t) => t.text === "A1");
  assert.ok(a1 && a1.sub && a1.sub.length === 1, "A₁ 아래첨자");
}
// 가려진 모서리 점선 끄기 → 9개
assert.strictEqual(api({ showHidden: false }).buildSolid3D().lines.length, 9);
// 뿔·팔각기둥
assert.strictEqual(api({ preset: 2 }).buildSolid3D().lines.length, 8);
assert.strictEqual(api({ sides: 8 }).buildSolid3D().lines.length, 24);
// 원기둥·원뿔·구: 점선은 한 줄(뒤쪽 반원), 중심 이름은 없다
{
  const cyl = api({ preset: 3 }).buildSolid3D();
  assert.strictEqual(dashed(cyl), 1);
  assert.strictEqual(cyl.texts.length, 0);
  assert.strictEqual(dashed(api({ preset: 4 }).buildSolid3D()), 1);
  assert.strictEqual(api({ preset: 4 }).buildSolid3D().texts.length, 1);
  assert.strictEqual(dashed(api({ preset: 5 }).buildSolid3D()), 1);
}
// 덧붙이기와 잘못된 입력
{
  const d = api({ text: { pointsText: "P(0,0,1.5)", segmentText: "P-A1", dashedText: "P-B3", dotText: "P" } }).buildSolid3D();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.length, 14);
  assert.strictEqual(d.dots.length, 1);
  assert.ok(api({ text: { segmentText: "P-A1" } }).buildSolid3D().notes.length > 0);
  assert.ok(api({ text: { radiusText: "x" } }).buildSolid3D().notes.length > 0);
}
// 직접 좌표
{
  const d = api({ preset: 0, text: { pointsText: "A(0,0,0) B(2,0,0) C(0,2,0) D(0,0,2)", segmentText: "A-B-C-A, D-A, D-B", dashedText: "D-C" } }).buildSolid3D();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.length, 6);
  assert.strictEqual(d.texts.length, 4);
}
// 선 두께: "선 두께" 패널의 모서리(strokePt, 기본 설정에 저장)·보조선(점선). 예전의 쓰이지 않던 "축" 행은 없다
function lineWidthStore(constNames, raw) {
  const decl = (name) => { const at = source.indexOf(`var ${name} = `); assert.ok(at >= 0, name); return source.slice(at, source.indexOf("\n", at)); };
  const writes = [];
  const app = { preferences: { getStringPreference: () => raw, setStringPreference: (key, value) => writes.push(value) } };
  const current = new Function("app", ['var PREF_KEY = "T";'].concat(constNames.map(decl), [decl("LINE_DEFAULTS"), decl("LINE_KEYS")],
    ["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction), ["loadLineWidths(); saveLineWidths(); return currentLineWidth;"]).join("\n"))(app);
  return { current, saved: writes[0] };
}
{
  const labels = source.split('addValueRow(lineWidthPanel, "').slice(1).map((s) => s.slice(0, s.indexOf('"')));
  assert.deepStrictEqual(labels, ["모서리", "보조선"]);
  assert.ok(source.includes('addValueRow(lineWidthPanel, "모서리", "pt", strokePt, 0.1, 1.5, 0.1, 1)'), "모서리 행은 strokePt 범위 그대로");
  assert.ok(!source.includes('addValueRow(viewPanel, "선 두께"'), "시점 · 크기 패널에서 옮겼다");
  assert.ok(source.includes("strokePt = restoreNumber(p[17 + o], strokePt, 0.1, 1.5);"), "모서리 값은 기본 설정 문자열에 그대로 저장 (v2는 글 3칸만큼 뒤로)");
  // 보조선 기본값 = 모서리 기본값이라 기본 그림은 예전과 같다
  const num = (name) => parseFloat(source.slice(source.indexOf(`var ${name} = `) + name.length + 7));
  assert.strictEqual(num("GUIDE_PT"), num("strokePt"));
  assert.strictEqual(lineWidthStore(["GUIDE_PT"], "").saved, "v2|||0.8||||||");
  assert.strictEqual(lineWidthStore(["GUIDE_PT"], "v1|0.4||0.3").current("guide"), 0.8, "v1의 보조선 칸은 쓰이지 않던 값이라 읽지 않는다");
  assert.strictEqual(lineWidthStore(["GUIDE_PT"], "v2|1|1|0.5|1|1|1|1|1|1").saved, "v2|||0.5||||||");
  // 실선은 모서리 값, 점선은 보조선 값
  const made = [];
  const previewGroup = { pathItems: { add() { const p = { setEntirePath(a) { this.pathPoints = a.map(() => ({})); } }; made.push(p); return p; } } };
  const paint = new Function("previewGroup", "var strokePt=1.2,GUIDE_PT=0.5,GUIDE_DASH=[2,1.5];var StrokeCap={BUTTENDCAP:1},StrokeJoin={ROUNDENDJOIN:1};function makeGray(k){return k;}" + extractFunction("addPath") + ";return addPath;")(previewGroup);
  for (const kind of ["main", "dashed"]) paint({ kind, points: [{ anchor: [0, 0], left: [0, 0], right: [0, 0] }, { anchor: [1, 0], left: [1, 0], right: [1, 0] }] });
  assert.deepStrictEqual(made.map((p) => p.strokeWidth), [1.2, 0.5]);
  assert.deepStrictEqual(made[1].strokeDashes, [2, 1.5]);
  const kinds = new Set(api({ text: { pointsText: "P(0,0,1.5)", segmentText: "P-A1", dashedText: "P-B3" } }).buildSolid3D().lines.map((l) => l.kind));
  assert.deepStrictEqual([...kinds].sort(), ["dashed", "main"]);
}
// 보조선을 저장한 적이 없으면 가려진 모서리 점선이 복원된 모서리 두께로 시작한다 (저장값 복원 뒤, 불러오기 전)
assert.ok(/applySettings\(\);[\s\S]*?GUIDE_PT = strokePt;\s*loadLineWidths\(\);/.test(source), "hidden edges start from restored edge width");
console.log("solid3d checks passed");

// 길이 글자·각 표시·단면 칠하기 (웹 math-solid3d.test.js와 같은 경우)
{
  let d = api({ text: { lengthText: "B1B2:4, A1B1:3" } }).buildSolid3D();
  assert.deepStrictEqual(d.notes, []);
  assert.ok(d.texts.some((t) => t.text === "4") && d.texts.some((t) => t.text === "3"));
  assert.ok(api({ text: { lengthText: "B1X:4" } }).buildSolid3D().notes.length > 0);
  const pyr = { preset: 2, text: { pointsText: "H(0,0,0)", dashedText: "P-H-A1" } };
  const plain = api(pyr).buildSolid3D();
  d = api({ preset: 2, text: { pointsText: "H(0,0,0)", dashedText: "P-H-A1", angleText: "PHA1:R" } }).buildSolid3D();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.length, plain.lines.length + 1);
  assert.ok(d.lines.some((l) => l.kind === "mark" && l.points.length === 3), "직각 표시");
  d = api({ preset: 2, text: { pointsText: "H(0,0,0)", angleText: "PA1H:60°" } }).buildSolid3D();
  assert.ok(d.lines.some((l) => l.kind === "mark" && l.points.length >= 8), "호");
  assert.ok(d.texts.some((t) => t.text === "60°"));
  d = api({ preset: 2, text: { fillText: "PA1A3:30, A1A2A3" } }).buildSolid3D();
  assert.deepStrictEqual(d.notes, []);
  assert.deepStrictEqual([d.lines[0].kind, d.lines[0].fillK, d.lines[1].fillK], ["fill", 30, 20], "칠하기는 맨 아래");
  assert.ok(api({ text: { fillText: "A1B1" } }).buildSolid3D().notes.length > 0);
  assert.ok(source.includes('p[0] === "v2" && p.length === 24') && source.includes('p[0] === "v1" && p.length === 21'), "설정 v2, v1도 읽는다");
}
console.log("solid3d marks ok");
