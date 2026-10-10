const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅱ 묶음(수학2.jsx)의 "단면이 도형인 입체" 탭 엔진에서 계산 함수만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "수학2.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeSolidSectionEngine(");
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
const names = ["norm3", "dot3", "sub3", "cross3", "meanOf", "evaluateNumber", "sectionPolygon", "straight", "buildSolid", "unit", "compileFunction", "formulaDisplay"];
const make = new Function("state", `
var MM_TO_PT = 2.834645669, STEPS = 64, ARC_STEPS = 12, ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
var LIGHT = norm3([-0.35, -0.55, 0.75]);
var text = state.text, section = state.section, opt = state.opt, obliqueDeg = 50, depth = 0.55, sizeMm = 60, shadeDark = 32;
${names.map(extractFunction).join("\n")}
return {${names.join(",")}};`);
const api = (text = {}, section = 0, opt = {}) => make({
  text: Object.assign({ fText: "y=x^2+1", aText: "0", bText: "1", sectionAtText: "", aLabel: "x=0", bLabel: "x=1", curveLabel: "" }, text),
  section, opt: Object.assign({ showSection: true, extendCurve: true, showBoundLines: true }, opt),
});

// 정사각형 단면: 입체가 그려지고 글자 x=0, x=1, 곡선 식, x, y, O가 나온다
{
  const d = api().buildSolid();
  assert.deepStrictEqual(d.notes, []);
  assert.ok(d.fills.length >= 3, "면");
  assert.strictEqual(d.arrows.length, 2);
  const labels = d.texts.map((t) => t.text);
  for (const n of ["x", "y", "O"]) assert.ok(labels.includes(n), n);
  assert.ok(labels.some((t) => t.startsWith("y=")), "곡선 식");
  // 가장 긴 쪽이 sizeMm
  const pts = [...d.fills.flatMap((f) => f.points.map((p) => p.anchor)), ...d.lines.flatMap((l) => l.points.map((p) => p.anchor))];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  assert.ok(Math.abs(extent - 60 * 2.834645669) < 3, "크기 " + extent);
}
// 단면 도형 꼭짓점 수: 정사각형 4, 정삼각형 3, 반원 2+11, 직각이등변 3
{
  const g = api();
  assert.deepStrictEqual([0, 1, 2, 3].map((t) => g.sectionPolygon(t, 2).length), [4, 3, 13, 3]);
  const tri = g.sectionPolygon(1, 2);
  assert.ok(Math.abs(tri[2][1] - Math.sqrt(3)) < 1e-9, "정삼각형 높이");
}
// 네 단면 모두 그려진다
for (const type of [0, 1, 2, 3]) assert.ok(api({}, type).buildSolid().fills.length > 0, "단면 " + type);
// 잘못된 입력은 notes에 남기고 그리지 않는다
{
  assert.ok(api({ aText: "2", bText: "1" }).buildSolid().notes.length > 0);
  assert.ok(api({ fText: "y=x-2" }).buildSolid().notes.length > 0);   // 구간에서 음수
  assert.ok(api({ fText: "y=@@" }).buildSolid().notes.length > 0);
}
console.log("solid section checks passed");
