const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_Pedigree.jsx");

assert.ok(fs.existsSync(scriptPath), "Object_Pedigree.jsx must exist");
const source = fs.readFileSync(scriptPath, "utf8");

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

// 설정 상수는 applySavedSettings() 호출보다 위에 있어야 한다. 아래에 두면 호이스팅으로 undefined가 되어 저장 옵션이 복원되지 않는다.
assert.ok(source.indexOf('var SETTINGS_TAG = "v6"') < source.indexOf("applySavedSettings();"),
  "SETTINGS_TAG must be declared before applySavedSettings() runs");
assert.ok(source.indexOf("var SETTINGS_LENGTH = 59") < source.indexOf("applySavedSettings();"),
  "SETTINGS_LENGTH must be declared before applySavedSettings() runs");

const layoutPedigree = new Function(`${extractFunction("layoutPedigree")}\nreturn layoutPedigree;`)();
const layoutBounds = new Function(`${extractFunction("layoutBounds")}\nreturn layoutBounds;`)();
const legendEntries = new Function(`${extractFunction("legendEntries")}\nreturn legendEntries;`)();

// 중앙 맞춤은 DOM 경계가 아니라 배치 좌표로 잰다. 클리핑 밖으로 뻗은 사선이 경계를 넓혀 전체가 밀리던 원인.
assert.ok(!/group\.geometricBounds/.test(source), "centering must not read group.geometricBounds");

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${label}: expected ${expected}, got ${actual}`);
}

function person(gender, mark) {
  return {gender, pheno: 0, mark: mark || 0};
}

// 자녀: kind 0 = ?, 1 = 아들, 2 = 딸. 항상 4칸을 채운다
function kids(...kinds) {
  const list = kinds.map((kind) => ({kind, gender: kind > 0 ? kind - 1 : 0, pheno: 0, mark: 0}));
  while (list.length < 4) list.push({kind: 0, gender: 0, pheno: 0, mark: 0});
  return {childCount: kinds.length, children: list};
}

function side(count, siblings, parentMark) {
  return {
    count,
    grand: [person(0), person(1)],
    parent: person(0, parentMark || 0),
    siblings: siblings || [person(0), person(0)],
  };
}

function spec(overrides) {
  return Object.assign({
    size: 10,
    coupleGap: 6,
    siblingGap: 4,
    upperGap: 30,
    lowerGap: 30,
    branchPct: 50,
    markRatio: 0.8,
    sides: [side(0), side(0)],
    ...kids(0),
  }, overrides);
}

function nodeOf(layout, personRef) {
  return layout.nodes.filter((node) => node.person === personRef)[0];
}

function hasLine(layout, segment, label) {
  const found = layout.lines.some((line) => line.every((value, index) => Math.abs(value - segment[index]) < 0.000001));
  assert.ok(found, `${label}: missing line ${JSON.stringify(segment)}`);
}

// 1. 형제 없음 + 물음표: 조부모가 부모 바로 위에 오고, 외가 쪽이 밀려 부부선이 길어진다. 번호는 1~6
{
  const s = spec();
  const layout = layoutPedigree(s);
  const father = nodeOf(layout, s.sides[0].parent);
  const mother = nodeOf(layout, s.sides[1].parent);
  close(father.x, 0, "father at origin");
  // 조부모 부부 폭 26(=2×8+10)이 두 쌍, 그 사이 6 → 어머니는 32까지 밀린다
  close(mother.x - father.x, 32, "mother pushed right so the grandparent couples keep the couple gap");

  const patGM = nodeOf(layout, s.sides[0].grand[1]);
  const matGF = nodeOf(layout, s.sides[1].grand[0]);
  close(matGF.x - patGM.x, 10 + 6, "adjacent grandparent couples keep the couple gap between them");
  const patGF = nodeOf(layout, s.sides[0].grand[0]);
  close(patGM.x - patGF.x, 10 + 6, "grandparent couple keeps the couple gap");

  assert.deepStrictEqual(layout.nodes.map((node) => node.number).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6], "six numbered members plus the unnumbered question mark");
  assert.strictEqual(patGF.number, 1, "paternal grandfather is 1");
  assert.strictEqual(father.number, 5, "father is 5");
  assert.strictEqual(mother.number, 6, "mother is 6");

  const childX = (father.x + mother.x) / 2;
  const question = nodeOf(layout, s.children[0]);
  assert.strictEqual(question.question, true, "question mark present");
  assert.strictEqual(question.number, 0, "question mark is not numbered");
  close(question.x, childX, "question mark under the couple line midpoint");
  close(question.y, -60, "question mark on the third generation");
  hasLine(layout, [childX, -30, childX, -60 + 5], "line from the couple to where the child shape would start");

  // 형제가 없으면 조부모 부부선 가운데가 부모 바로 위 → 꺾이지 않는 수직선 하나
  close((patGF.x + patGM.x) / 2, father.x, "paternal grandparents directly above the father");
  hasLine(layout, [father.x, 0, father.x, -30 + 5], "father gets one straight drop line");
  const matGM = nodeOf(layout, s.sides[1].grand[1]);
  close((matGF.x + matGM.x) / 2, mother.x, "maternal grandparents directly above the mother");
  hasLine(layout, [mother.x, 0, mother.x, -30 + 5], "mother gets one straight drop line");
  assert.strictEqual(layout.lines.length, 6, "three couple lines, two straight drops, one child line");
  hasLine(layout, [patGF.x + 5, 0, patGM.x - 5, 0], "grandparent couple line spans shape edges");
}

// 2. 친가 형제 2명(삼촌, 고모) + 딸: 분기점, 가로선, 번호 순서
{
  const siblings = [person(0), person(1)];
  const s = spec({sides: [side(2, siblings), side(0)], ...kids(2)});
  const layout = layoutPedigree(s);
  const uncle = nodeOf(layout, siblings[0]);
  const aunt = nodeOf(layout, siblings[1]);
  const father = nodeOf(layout, s.sides[0].parent);
  close(uncle.x, 0, "first sibling leftmost");
  close(aunt.x - uncle.x, 14, "siblings use shape plus sibling gap");
  close(father.x, 28, "father rightmost of the paternal row");

  const patGF = nodeOf(layout, s.sides[0].grand[0]);
  const patGM = nodeOf(layout, s.sides[0].grand[1]);
  const dropX = (patGF.x + patGM.x) / 2;
  close(dropX, 14, "paternal grandparents centred over the sibship");
  // 외가 부부와 4만 떨어져 부부 간격(6)에 2 모자라므로 어머니 쪽이 2 밀린다
  const mother = nodeOf(layout, s.sides[1].parent);
  close(mother.x, 28 + 16 + 2, "mother pushed right by the shortfall");
  const barY = -(30 - 5) * 0.5;
  hasLine(layout, [dropX, 0, dropX, barY], "drop line to the branch point");
  hasLine(layout, [0, barY, 28, barY], "sibling bar spans first to last sibling");
  hasLine(layout, [aunt.x, barY, aunt.x, -30 + 5], "stub from the bar to the aunt");

  const child = nodeOf(layout, s.children[0]);
  assert.strictEqual(child.question, false, "no question mark when a child is drawn");
  assert.strictEqual(child.gen, 3, "child on the third generation");
  assert.strictEqual(child.number, 9, "child numbered last");
  hasLine(layout, [child.x, -30, child.x, -60 + 5], "only child directly under the couple gets one straight line");
  assert.deepStrictEqual([uncle.number, aunt.number, father.number], [5, 6, 7], "second generation numbered left to right");
}

// 3. 원문자로 가린 구성원은 번호를 건너뛰고, 선은 작은 원 가장자리에서 끝난다
{
  const s = spec({sides: [side(0), side(0, null, 2)]});   // 어머니 = ⓑ
  const layout = layoutPedigree(s);
  const mother = nodeOf(layout, s.sides[1].parent);
  const father = nodeOf(layout, s.sides[0].parent);
  assert.strictEqual(mother.number, 0, "hidden member has no number");
  close(mother.half, 4, "hidden member uses the smaller mark circle");
  assert.deepStrictEqual(layout.nodes.map((node) => node.number).sort((a, b) => a - b), [0, 0, 1, 2, 3, 4, 5], "numbering skips the hidden member and the question mark");
  hasLine(layout, [father.x + 5, -30, mother.x - 4, -30], "couple line ends at the mark circle edge");
}

// 4. 양쪽 형제가 많아 조부모 부부가 서로 멀면 벌리지 않는다
{
  const s = spec({sides: [side(2), side(2)]});
  const layout = layoutPedigree(s);
  const patMid = (0 + 28) / 2;
  const patGF = nodeOf(layout, s.sides[0].grand[0]);
  close(patGF.x, patMid - 8, "paternal grandparents stay centred when there is room");
}

// 5. 경계: 발현 무늬와 무관하게 도형·선·번호만으로 잰다
{
  const s = spec();
  const layout = layoutPedigree(s);
  const bounds = layoutBounds(layout, 8);
  const patGF = nodeOf(layout, s.sides[0].grand[0]);
  const matGM = nodeOf(layout, s.sides[1].grand[1]);
  close(bounds[0], patGF.x - 5, "left edge is the paternal grandfather");
  close(bounds[2], matGM.x + 5, "right edge is the maternal grandmother");
  close(bounds[1], 5, "top edge is the first generation shape top");
  close(bounds[3], -65, "bottom edge is the question mark");
  s.sides[0].grand[0].pheno = 1;
  assert.deepStrictEqual(layoutBounds(layoutPedigree(s), 8), bounds, "hatch pattern does not change the bounds");
}

// 6. 형제가 한 명이면 둘이 조부모 바로 아래에 정렬된다 (3-6, 4-7)
{
  const s = spec({sides: [side(1), side(1)]});
  const layout = layoutPedigree(s);
  const uncle = nodeOf(layout, s.sides[0].siblings[0]);
  const father = nodeOf(layout, s.sides[0].parent);
  const mother = nodeOf(layout, s.sides[1].parent);
  const aunt = nodeOf(layout, s.sides[1].siblings[0]);
  close(uncle.x, nodeOf(layout, s.sides[0].grand[0]).x, "uncle under the paternal grandfather");
  close(father.x, nodeOf(layout, s.sides[0].grand[1]).x, "father under the paternal grandmother");
  close(mother.x, nodeOf(layout, s.sides[1].grand[0]).x, "mother under the maternal grandfather");
  close(aunt.x, nodeOf(layout, s.sides[1].grand[1]).x, "aunt under the maternal grandmother");
  close(father.x - uncle.x, 16, "two-member row uses the couple spacing");
  close(mother.x - father.x, 16, "father and mother keep the couple gap");
}

// 7. 세대 거리는 위(F–P1)와 아래(P1–P2)가 따로 간다
{
  const s = spec({upperGap: 20, lowerGap: 40, sides: [side(1), side(0)], ...kids(1)});
  const layout = layoutPedigree(s);
  const father = nodeOf(layout, s.sides[0].parent);
  const child = nodeOf(layout, s.children[0]);
  close(father.y, -20, "second generation sits one upper gap down");
  close(child.y, -60, "third generation sits the lower gap below that");
  const patGF = nodeOf(layout, s.sides[0].grand[0]);
  const patGM = nodeOf(layout, s.sides[0].grand[1]);
  const barY = -(20 - 5) * 0.5;
  hasLine(layout, [(patGF.x + patGM.x) / 2, 0, (patGF.x + patGM.x) / 2, barY], "upper branch point uses the upper gap");
  hasLine(layout, [child.x, -20, child.x, -60 + 5], "child line spans the lower gap");
}

// 8. 자녀 여러 명: 둘이면 아버지·어머니 아래, 셋이면 형제 간격으로 가운데 정렬, 물음표는 번호 없이 선만
{
  const two = spec({...kids(1, 2)});
  let layout = layoutPedigree(two);
  const father = nodeOf(layout, two.sides[0].parent);
  const mother = nodeOf(layout, two.sides[1].parent);
  close(nodeOf(layout, two.children[0]).x, father.x, "first of two children under the father");
  close(nodeOf(layout, two.children[1]).x, mother.x, "second of two children under the mother");
  assert.deepStrictEqual([nodeOf(layout, two.children[0]).number, nodeOf(layout, two.children[1]).number], [7, 8], "children numbered after the parents");
  const barY = -30 - (30 - 5) * 0.5;
  hasLine(layout, [father.x, barY, mother.x, barY], "sibling bar spans both children");

  const three = spec({...kids(1, 0, 2)});
  layout = layoutPedigree(three);
  const mid = (nodeOf(layout, three.sides[0].parent).x + nodeOf(layout, three.sides[1].parent).x) / 2;
  const xs = three.children.slice(0, 3).map((kid) => nodeOf(layout, kid).x);
  close(xs[1], mid, "middle child under the couple midpoint");
  close(xs[1] - xs[0], 14, "three children use the sibling spacing");
  close(xs[2] - xs[1], 14, "three children use the sibling spacing");
  const middle = nodeOf(layout, three.children[1]);
  assert.strictEqual(middle.question, true, "middle child is a question mark");
  assert.deepStrictEqual([nodeOf(layout, three.children[0]).number, middle.number, nodeOf(layout, three.children[2]).number], [7, 0, 8], "question mark skipped in numbering");
  hasLine(layout, [xs[1], barY, xs[1], -60 + 5], "question mark still gets its stub");
  assert.strictEqual(nodeOf(layout, three.children[3]), undefined, "fourth child not drawn when count is 3");
}

// 9. 범례: 정해진 순서로, 가계도에 그려진 표현만. 물음표와 원문자로 가린 사람은 세지 않는다
{
  const s = spec({sides: [side(0), side(0, null, 2)], ...kids(2)});
  s.sides[0].grand[0].pheno = 3;      // 할아버지 (가)(나) 남자
  s.sides[1].grand[1].pheno = 1;      // 외할머니 (가) 여자
  s.sides[1].parent.pheno = 2;        // 어머니 (나) 여자 — 원문자 ⓑ로 가려져 범례에서 빠진다
  s.children[0].pheno = 2;            // 딸 (나) 여자
  const entries = legendEntries(layoutPedigree(s).nodes).map((e) => `${e.pheno}${e.gender}`);
  // 정상 남자(아버지, 외할아버지) · 정상 여자(할머니) · (가) 여자 · (나) 여자 · (가)(나) 남자
  assert.deepStrictEqual(entries, ["00", "01", "11", "21", "30"], "legend lists present combinations in fixed order");
  assert.deepStrictEqual(legendEntries(layoutPedigree(spec()).nodes).map((e) => `${e.pheno}${e.gender}`), ["00", "01"],
    "default chart has only normal male and female");
}

console.log("check-pedigree: ok");
