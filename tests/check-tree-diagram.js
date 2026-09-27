const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "TreeDiagram" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_MiddleMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeTreeDiagramEngine(");
  assert.ok(start >= 0, "missing engine: makeTreeDiagramEngine");
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

const names = ["parseStages", "layoutTree", "contains"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const leaves = (t) => t.nodes.filter((n) => n.leaf).map((n) => n.path.join(""));

assert.deepStrictEqual(g.parseStages("앞, 뒤 / 앞,뒤"), [["앞", "뒤"], ["앞", "뒤"]]);
assert.deepStrictEqual(g.parseStages("1, 2 /"), [["1", "2"]], "trailing slash while typing");
assert.strictEqual(g.parseStages("1, 2 / / 3"), null);
assert.strictEqual(g.parseStages(""), null);

// 동전 세 번: 8가지, 14마디, 끝 가지는 한 줄씩, 부모는 자식 가운데
{
  const t = g.layoutTree(g.parseStages("앞, 뒤 / 앞, 뒤 / 앞, 뒤"), false, 10, 5, 200);
  assert.strictEqual(t.leaves, 8);
  assert.strictEqual(t.nodes.length, 14);
  assert.deepStrictEqual(leaves(t).slice(0, 3), ["앞앞앞", "앞앞뒤", "앞뒤앞"]);
  const first = t.nodes[0];
  assert.strictEqual(first.x, 0);
  assert.strictEqual(first.y, (0 + -3 * 5) / 2, "first root centered on its 4 leaves");
  for (const n of t.nodes) if (n.parent >= 0) assert.strictEqual(n.x, t.nodes[n.parent].x + 10);
}

// 중복 없이: A, B, C에서 두 개 세우기 = 6가지
{
  const t = g.layoutTree(g.parseStages("A, B, C / A, B, C"), true, 10, 5, 200);
  assert.deepStrictEqual(leaves(t), ["AB", "AC", "BA", "BC", "CA", "CB"]);
}
// 중복 없이 두 개에서 세 개는 불가능: 가지 없음 (중간 마디가 끝으로 남지 않는다)
assert.strictEqual(g.layoutTree(g.parseStages("A, B / A, B / A, B"), true, 10, 5, 200).nodes.length, 0);

// 끝 가지 제한
assert.strictEqual(g.layoutTree(g.parseStages("1,2,3,4,5,6 / 1,2,3,4,5,6 / 1,2,3,4,5,6"), false, 10, 5, 200), null);

assert.ok(source.includes('var PREF_KEY = "TreeDiagram/settings";'));
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("tree diagram checks passed");
