const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_ClassificationTree.jsx"), "utf8");

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

const names = ["parseTree", "flatten", "layoutTree", "centerOffset", "edgePoints"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const sample = "척추가 있는가?\n  예: 날개가 있는가?\n    예: 참새\n    아니요: 고양이\n  아니요: 메뚜기";

// 해석: 들여쓰기 두 칸이 한 단계, 콜론 앞은 가지 이름(전각 콜론·탭도 받는다)
{
  const t = lib.parseTree(sample);
  assert.strictEqual(t.count, 5);
  assert.strictEqual(t.root.text, "척추가 있는가?");
  assert.strictEqual(t.root.label, "");
  assert.deepStrictEqual(t.root.children.map((c) => [c.label, c.text]), [["예", "날개가 있는가?"], ["아니요", "메뚜기"]]);
  assert.deepStrictEqual(t.root.children[0].children.map((c) => c.text), ["참새", "고양이"]);
  const tabbed = lib.parseTree("뿌리\n\t예：가\n\t\t나");
  assert.strictEqual(tabbed.root.children[0].label, "예");
  assert.strictEqual(tabbed.root.children[0].children[0].text, "나");
}
// 잘못된 들여쓰기는 줄 번호와 함께 알린다
assert.ok(/2번째 줄/.test(lib.parseTree("뿌리\n    너무 깊음").error));
assert.ok(/맨 위 마디/.test(lib.parseTree("하나\n둘").error));
assert.ok(lib.parseTree("   \n").error);

// 배치(위→아래): 끝 마디가 옆으로 차례로, 부모는 자식 가운데, 단계마다 아래로
{
  const t = lib.parseTree(sample);
  const nodes = lib.flatten(t.root);
  for (const n of nodes) { n.w = 20; n.h = 6; }
  lib.layoutTree(t.root, 4, 10, false);
  const [rootNode, q, sparrow, cat, grasshopper] = nodes;
  assert.deepStrictEqual([sparrow.x, cat.x, grasshopper.x], [10, 34, 58]);
  assert.strictEqual(q.x, 22);
  assert.strictEqual(rootNode.x, (22 + 58) / 2);
  assert.ok(rootNode.y === 0);
  assert.strictEqual(q.y, -16);
  assert.strictEqual(sparrow.y, -32);
  // 꺾은선: 부모 아래 끝 → 가운데 높이 → 자식 위 끝
  const edge = lib.edgePoints(rootNode, q, false, true);
  assert.deepStrictEqual(edge[0], [rootNode.x, -3]);
  assert.deepStrictEqual(edge[3], [q.x, -13]);
  assert.strictEqual(edge[1][1], -8);
  // 가운데 맞추기
  const shift = lib.centerOffset(nodes, [100, 100]);
  assert.deepStrictEqual(shift, [100 - 34, 100 - (-32 - 3 + 3) / 2]);
}

// 배치(왼→오른쪽): 단계는 오른쪽으로, 끝 마디는 아래로 차례로
{
  const t = lib.parseTree(sample);
  const nodes = lib.flatten(t.root);
  for (const n of nodes) { n.w = 20; n.h = 6; }
  lib.layoutTree(t.root, 4, 10, true);
  const [rootNode, q, sparrow, cat] = nodes;
  assert.ok(rootNode.x === 0);
  assert.strictEqual(q.x, 30);
  assert.ok(sparrow.y > cat.y, "first leaf on top");
  const edge = lib.edgePoints(rootNode, q, true, false);
  assert.deepStrictEqual(edge, [[10, rootNode.y], [20, q.y]]);
}
assert.ok(source.includes('var PREF_KEY = "ObjectClassificationTree/settings";'));
console.log("classification tree checks passed");
