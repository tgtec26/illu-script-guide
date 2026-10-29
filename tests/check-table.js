const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 확률과 통계 묶음(확률과 통계.jsx)의 "표" 탭 엔진에서 계산 함수만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "확률과 통계.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeTableEngine(");
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
const names = ["trimText", "splitCells", "splitRows", "display", "textWidth", "hasFractionTextLocal", "splitFractionTextLocal", "buildTable", "straight"];
const make = new Function("s", `
var MM_TO_PT = 2.834645669;
var text = s.text, cellWmm = 16, cellHmm = 7, sideWmm = 24, fontPt = 8;
var CELL_ARROW = { length: 3.63, halfWidth: 1.18, notch: 0.93 };
var CELL_ARROW_DIRS = { "↗": [1, 1], "↘": [1, -1], "↑": [0, 1], "↓": [0, -1], "→": [1, 0], "←": [-1, 0] };
function hasFractionText() { return false; }
${names.map(extractFunction).join("\n")}
return {${names.join(",")}};`);
const TEXT0 = { headText: "찬성 | 반대 | 계", sideText: "10년 미만 | 10년 이상 | 계", cornerText: "찬반 여부 / 재직 연수", cellsText: "a | b | 120 ; c | d | 240 ; 150 | 210 | 360" };
const api = (text = {}) => make({ text: Object.assign({}, TEXT0, text) });

{
  const d = api().buildTable();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.length, 5 + 5 + 1);          // 가로 5, 세로 5, 대각선
  assert.strictEqual(d.texts.length, 3 + 3 + 9 + 2);
  assert.ok(d.lines.every((l) => l.kind === "axis"));
  const corners = d.texts.filter((t) => t.corner);
  assert.strictEqual(corners.length, 2);
  assert.ok(corners[0].text === "찬반 여부" && corners[0].corner[0] === -1 && corners[1].text === "재직 연수" && corners[1].corner[0] === 1);
}
assert.strictEqual(api({ cornerText: "" }).buildTable().lines.length, 10);
{
  const d = api({ headText: "", sideText: "", cornerText: "", cellsText: "1 | 2 ; 3 | 4" }).buildTable();
  assert.strictEqual(d.lines.length, 6);
  assert.strictEqual(d.texts.length, 4);
}
assert.ok(api({ headText: "A | B" }).buildTable().notes.length > 0);
assert.ok(api({ headText: "", sideText: "", cellsText: "" }).buildTable().lines.length === 0);
{
  const sub = api({ headText: "x_1", sideText: "", cornerText: "", cellsText: "3" }).buildTable();
  assert.ok(sub.texts.some((t) => t.sub && t.sub.length === 1), "아래첨자");
}
// 화살표 칸(증감표) — 웹 math-table.test.js와 같은 경우
{
  const d = api({ headText: "-3 | α | β | 3", sideText: "f′(x) | f(x)", cornerText: "", cellsText: "+ | 0 | - | 0 ; ↗ | 극대 | ↘ | ↑" }).buildTable();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.arrows.length, 3, "화살촉 셋");
  assert.ok(!d.texts.some((t) => ["↗", "↘", "↑"].includes(t.text)), "화살표 글자는 글자로 쓰지 않는다");
  assert.ok(d.texts.some((t) => t.text === "극대"));
  assert.ok(d.arrows[0].dir[1] > 0 && d.arrows[1].dir[1] < 0 && d.arrows[2].dir[0] === 0, "↗ ↘ ↑");
  assert.strictEqual(api({ headText: "", sideText: "", cornerText: "", cellsText: "↗ ↘" }).buildTable().texts.length, 1, "공백으로 이은 글은 글자");
  assert.ok(source.includes("for (var ar = 0; ar < drawing.arrows.length; ar++) addArrow(drawing.arrows[ar]);"), "화살촉을 그린다");
}
console.log("table checks passed");
