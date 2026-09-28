const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 확률과 통계 묶음(Object_HighStatistics.jsx)의 "ProbTree" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighStatistics.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeProbTreeEngine(");
  assert.ok(start >= 0, "missing engine: makeProbTreeEngine");
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

const names = ["parseProbability", "gcd", "reduce", "times", "plus", "divide", "isOne", "probText", "parseGroup", "parseTree", "buildProbTree", "sumOf", "edge"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 확률 읽기 (분수로)
assert.deepStrictEqual(g.parseProbability("0.3"), { n: 3, d: 10 });
assert.deepStrictEqual(g.parseProbability("2/6"), { n: 1, d: 3 });
assert.deepStrictEqual(g.parseProbability("1"), { n: 1, d: 1 });
for (const bad of ["", "a", "1/0", "0.1.2", "-0.3"]) assert.strictEqual(g.parseProbability(bad), null, bad);
assert.deepStrictEqual(g.parseGroup("A 0.3, B: 0.7").map((b) => b.name), ["A", "B"]);
assert.strictEqual(g.parseGroup("A, B 0.7"), null);

// 기본 예: P(E) = 0.24 + 0.28 = 0.52, P(A|E) = 0.24/0.52
{
  const tree = g.parseTree("A 0.3, B 0.7", "E 0.8, Eᶜ 0.2 | E 0.4, Eᶜ 0.6");
  const d = g.buildProbTree(tree, 60, 20, true, "E");
  assert.deepStrictEqual(d.notes, ["P(E) = 0.24 + 0.28 = 0.52", "P(A|E) = 0.4615, P(B|E) = 0.5385"]);
  assert.strictEqual(d.lines.length, 2 + 4);
  const texts = d.texts.map((t) => t.text);
  for (const n of ["0.3×0.8 = 0.24", "0.7×0.6 = 0.42", "A", "Eᶜ"]) assert.ok(texts.includes(n), n);
  // 확률 글자는 작게, 선의 위쪽
  const small = d.texts.filter((t) => t.small);
  assert.strictEqual(small.length, 6);
  assert.ok(small.every((t) => t.dir[1] >= 0));
}
// 분수: 1/2 × 2/3 = 1/3, 묶음 하나를 모든 가지에
{
  const tree = g.parseTree("주머니1 1/2, 주머니2 1/2", "흰 공 2/3, 검은 공 1/3");
  assert.strictEqual(tree.second.length, 2);
  const d = g.buildProbTree(tree, 60, 20, true, "흰 공");
  assert.deepStrictEqual(d.notes, ["P(흰 공) = 1/3 + 1/3 = 2/3", "P(주머니1|흰 공) = 1/2, P(주머니2|흰 공) = 1/2"]);
  assert.ok(d.texts.some((t) => t.text === "1/2×2/3 = 1/3"));
}
// 합이 1이 아니면 알림, 묶음 수가 다르면 오류, 1단계만
{
  const d = g.buildProbTree(g.parseTree("A 0.3, B 0.6", ""), 60, 20, true, "");
  assert.deepStrictEqual(d.notes, ["1단계 합이 1이 아님"]);
  assert.strictEqual(d.lines.length, 2);
  assert.ok(g.parseTree("A 0.5, B 0.5", "E 1 | E 1 | E 1").error.includes("가지 수와 다름"));
  assert.ok(g.buildProbTree(g.parseTree("A 0.5, B 0.5", "E 0.5, F 0.5"), 60, 20, false, "G").notes[0].includes("없음"));
}

assert.ok(source.includes('var PREF_KEY = "HighStatisticsProbTree/settings";'));
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("prob tree checks passed");
