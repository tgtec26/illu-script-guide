const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(기하.jsx)의 "3D 입체" 탭 엔진에서 계산 함수만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "기하.jsx"), "utf8");
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
var MM_TO_PT = 2.834645669, CURVE_STEPS = 96;
var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
var text = s.text, preset = s.preset, sides = s.sides, showNames = s.showNames, showHidden = s.showHidden;
var azimuthDeg = 20, elevationDeg = 25, sizeMm = 50;
${names.map(extractFunction).join("\n")}
return {${names.join(",")}};`);
const TEXT0 = { radiusText: "2", heightText: "3", pointsText: "", segmentText: "", dashedText: "", dotText: "", labelDirText: "" };
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
console.log("solid3d checks passed");
