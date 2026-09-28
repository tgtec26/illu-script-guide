const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 수학Ⅰ 묶음(Object_HighMath1.jsx)의 "Sequence" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighMath1.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeSequenceEngine(");
  assert.ok(start >= 0, "missing engine: makeSequenceEngine");
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

const names = ["parseSequence", "sequenceToX", "buildSequenceGraph", "buildDifferences", "buildPattern", "patternStage", "patternCount", "patternRule",
  "niceStep", "listText", "formatValue", "straightLine", "plotFunction", "toBezier", "compileFunction"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 수열 읽기
assert.deepStrictEqual(g.parseSequence("a_n=2n-1", 5).values, [1, 3, 5, 7, 9]);
assert.deepStrictEqual(g.parseSequence("3·2^(n-1)".replace("·", "*"), 4).values, [3, 6, 12, 24]);
assert.deepStrictEqual(g.parseSequence("a_n = (1/2)^n", 3).values, [0.5, 0.25, 0.125]);
assert.deepStrictEqual(g.parseSequence("a_n=(-1)^n n", 4).values, [-1, 2, -3, 4]);
assert.deepStrictEqual(g.parseSequence("a_n=sin(nπ/2)", 4).values, [1, 0, -1, 0]);
assert.deepStrictEqual(g.parseSequence("1, 3, 7, 15, …", 99).values, [1, 3, 7, 15]);
assert.strictEqual(g.parseSequence("1, 3, 7", 5).fn, null);
for (const bad of ["", "a_n=", "1, x, 3", "1, n", "a_n=2n+", "5"]) assert.strictEqual(g.parseSequence(bad, 5) === null || bad === "5", true, bad);
assert.strictEqual(g.sequenceToX("a_n=sinn+ln(n)+lnn"), "a_x=sinx+ln(x)+lnx");
assert.deepStrictEqual([0.3, 1, 1.5, 4, 7, 30].map(g.niceStep), [0.5, 1, 2, 5, 10, 50]);

// 수열 그래프: 점 6개, 가장 큰 항이 height 안, n 눈금 6개, 합
{
  const seq = g.parseSequence("a_n=2n-1", 6);
  const d = g.buildSequenceGraph(seq, { cell: 10, height: 60, tick: 2, guides: true, values: true, curve: true, numbers: true });
  assert.strictEqual(d.dots.length, 6);
  assert.deepStrictEqual(d.dots[5].at, [60, 44], "0..15 in steps of 5");
  assert.ok(d.notes.includes("S6 = 36"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide" && l.points.length === 2 && l.points[0].anchor[0] === l.points[1].anchor[0]).length, 6);
  const curve = d.lines.filter((l) => l.kind === "guide" && l.points.length === 2 && l.points[0].anchor[0] !== l.points[1].anchor[0]);
  assert.strictEqual(curve.length, 1, "y=2x-1 curve is one straight Bezier");
  near(curve[0].points[0].anchor[1], 4, "curve starts at (1, 1)");
  assert.ok(d.texts.some((t) => t.text === "an" && t.sub[0] === 1));
  assert.ok(d.texts.some((t) => t.text === "10"), "y ticks every 2");
}
// 음수 항은 축 아래, 값 글자도 아래
{
  const d = g.buildSequenceGraph(g.parseSequence("a_n=(-1)^n n", 4), { cell: 10, height: 40, tick: 2, guides: false, values: true, curve: true, numbers: false });
  assert.ok(d.dots[0].at[1] < 0);
  assert.deepStrictEqual(d.texts.find((t) => t.text === "-1" && t.at[0] === 10).dir, [0, -1]);
}

// 계차 도식: 1, 3, 7, 15 → 2, 4, 8 → 2, 4
{
  const d = g.buildDifferences([1, 3, 7, 15], { gap: 20, lineGap: 10, second: true, plus: true, ellipsis: false });
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["1", "3", "7", "15", "+2", "+4", "+8", "+2", "+4"]);
  assert.deepStrictEqual(d.texts[4].at, [10, -16], "first difference between 1 and 3, one row down");
  assert.strictEqual(d.lines.length, 5);
  assert.deepStrictEqual(d.lines[0].points.map((p) => p.anchor[0]), [2.4, 10, 17.6]);
  assert.deepStrictEqual(d.notes, ["차: 2, 4, 8", "두 번째 계차: 2, 4"]);
}

// 규칙 도형: 개수와 식, 단계 글자, 선 수
{
  const d = g.buildPattern(0, 3, 10, 0);
  assert.strictEqual(d.notes[0], "성냥개비: 4, 7, 10 → 3n+1");
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["[1단계]", "[2단계]", "[3단계]"]);
  assert.strictEqual(d.lines.length, 3 + 0 + 1 + 2, "outline per stage + inner verticals");
  const third = d.lines.filter((l) => l.closed)[2].points.map((p) => p.anchor);
  assert.deepStrictEqual(third[0], [70, 0], "stages two cells apart: 0-10, 30-50, 70-100");
}
{
  const d = g.buildPattern(1, 3, 10, 1);
  assert.strictEqual(d.notes[0], "성냥개비: 3, 5, 7 → 2n+1");
  assert.strictEqual(d.texts[0].text, "〈그림 1〉");
  // 3개짜리: 바닥 2칸, 윗선 1칸, 지그재그 5점
  const stage3 = d.lines.slice(-3);
  assert.deepStrictEqual(stage3[0].points.map((p) => p.anchor[0]), [65, 85], "stages 10 and 15 wide, two cells apart");
  assert.deepStrictEqual(stage3[1].points.map((p) => p.anchor[0]), [70, 80]);
  assert.strictEqual(stage3[2].points.length, 5);
}
{
  const d = g.buildPattern(2, 3, 10, 2);
  assert.strictEqual(d.texts.length, 0);
  assert.strictEqual(d.notes[0], "정사각형: 1, 3, 6 → n(n+1)/2");
  const outline = d.lines.filter((l) => l.closed)[2].points.map((p) => p.anchor);
  assert.deepStrictEqual(outline, [[70, 0], [100, 0], [100, 30], [90, 30], [90, 20], [80, 20], [80, 10], [70, 10]]);
}
assert.strictEqual(g.buildPattern(3, 4, 10, 0).dots.length, 1 + 3 + 6 + 10);
assert.strictEqual(g.buildPattern(4, 3, 10, 0).dots.length, 1 + 4 + 9);

assert.ok(source.includes('var PREF_KEY = "HighMathSequence/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("sequence checks passed");
