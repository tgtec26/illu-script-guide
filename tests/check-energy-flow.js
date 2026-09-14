const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_EnergyFlow.jsx");
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

const names = ["arrowOutline", "cornerPoint", "appendArc", "arcPoints", "arrowLabelCenter", "arrowSpans"];
const helpers = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 곧은 화살표: 밑변 [0, 20], top 0, 꺾임 10 + 길이 30, 화살촉 길이 0.4배(=8), 폭 1.5배
const straight = helpers.arrowOutline(0, 20, 0, 0, 10, 30, 5, 0.4, 1.5);
assert.strictEqual(straight.length, 9, "straight arrow: 4 body corners + 5 head points");
assert.deepStrictEqual(straight[0].anchor, [0, 0], "starts bottom-left");
assert.deepStrictEqual(straight[1].anchor, [0, 10], "outer edge reaches the bend height");
assert.deepStrictEqual(straight[2].anchor, [0, 40], "outer edge reaches the head base");
near(straight[3].anchor[0], -5, 1e-9, "outer barb sticks out by half the extra width");
near(straight[4].anchor[0], 10, 1e-9, "tip on the centre line");
near(straight[4].anchor[1], 48, 1e-9, "tip = bend + length + head length");
near(straight[5].anchor[0], 25, 1e-9, "inner barb");
assert.deepStrictEqual(straight[6].anchor, [20, 40], "inner edge head base");
assert.deepStrictEqual(straight[7].anchor, [20, 10], "inner edge bend height");
assert.deepStrictEqual(straight[8].anchor, [20, 0], "ends bottom-right");
// 곧은 화살표는 핸들이 모두 앵커에 붙는다
for (const point of straight) {
  assert.deepStrictEqual(point.left, point.anchor);
  assert.deepStrictEqual(point.right, point.anchor);
}

// 90° 화살표: 안쪽 반지름 5, 몸통 폭 20 → 바깥 반지름 25. 원호 중심 (xb + r, top + bend) = (25, 10)
const bent = helpers.arrowOutline(0, 20, 0, Math.PI / 2, 10, 30, 5, 0.4, 1.5);
const anchors = bent.map((p) => p.anchor);
assert.deepStrictEqual(anchors[0], [0, 0]);
near(anchors[1][0], 0, 1e-9, "outer arc starts on the left edge");
near(anchors[1][1], 10, 1e-9, "outer arc starts at the bend height");
near(anchors[2][0], 25, 1e-9, "outer arc ends above the centre");
near(anchors[2][1], 35, 1e-9, "outer arc ends at centre y + outer radius");
near(anchors[3][0], 55, 1e-9, "outer edge runs 30 to the right");
near(anchors[3][1], 35, 1e-9, "outer edge stays level");
near(anchors[4][1], 40, 1e-9, "outer barb goes up");
near(anchors[5][0], 63, 1e-9, "tip = head base + head length");
near(anchors[5][1], 25, 1e-9, "tip on the centre line (10 + 5 + 10)");
near(anchors[6][1], 10, 1e-9, "inner barb goes down");
near(anchors[7][0], 55, 1e-9, "inner edge head base");
near(anchors[7][1], 15, 1e-9, "inner edge at centre y + inner radius");
near(anchors[8][0], 25, 1e-9, "inner arc starts above the centre");
near(anchors[8][1], 15, 1e-9);
near(anchors[9][0], 20, 1e-9, "inner arc ends on the right edge");
near(anchors[9][1], 10, 1e-9, "inner arc ends at the bend height");
assert.deepStrictEqual(anchors[10], [20, 0], "ends bottom-right");
assert.strictEqual(bent.length, 11);
// 원호가 직선과 만나는 끝은 핸들이 앵커에 붙고, 반대쪽은 진행 방향으로 뻗는다
assert.deepStrictEqual(bent[1].left, bent[1].anchor, "outer arc start: no incoming handle");
assert.ok(bent[1].right[1] > bent[1].anchor[1], "outer arc start: handle points up");
assert.deepStrictEqual(bent[2].right, bent[2].anchor, "outer arc end: no outgoing handle");
assert.ok(bent[2].left[0] < bent[2].anchor[0], "outer arc end: handle points back left");
assert.deepStrictEqual(bent[8].left, bent[8].anchor, "inner arc start: no incoming handle");
assert.deepStrictEqual(bent[9].right, bent[9].anchor, "inner arc end: no outgoing handle");

// 45° 화살표: 화살촉 끝이 진행 방향(45°)으로 놓인다
const mid = helpers.arrowOutline(0, 20, 0, Math.PI / 4, 10, 30, 5, 0.4, 1.5);
const midAnchors = mid.map((p) => p.anchor);
const tip = midAnchors[5];
const headBase = [(midAnchors[3][0] + midAnchors[7][0]) / 2, (midAnchors[3][1] + midAnchors[7][1]) / 2];
near(Math.atan2(tip[1] - headBase[1], tip[0] - headBase[0]), Math.PI / 4, 1e-9, "tip direction 45°");
near(Math.hypot(tip[0] - headBase[0], tip[1] - headBase[1]), 8, 1e-9, "head length");
// 몸통 폭은 유지된다
near(Math.hypot(midAnchors[3][0] - midAnchors[7][0], midAnchors[3][1] - midAnchors[7][1]), 20, 1e-9, "body width kept");

// 화살촉은 몸통 폭에 비례한다: 폭 10 화살표의 화살촉 길이는 4
const narrow = helpers.arrowOutline(0, 10, 0, 0, 10, 30, 5, 0.4, 1.5);
near(narrow[4].anchor[1], 44, 1e-9, "head length scales with body width");
near(narrow[3].anchor[0], -2.5, 1e-9, "barb scales with body width");

// 이름 자리: 곧은 화살표는 곧은 구간 가운데, 90°는 원호 끝에서 오른쪽으로 길이 절반
const straightLabel = helpers.arrowLabelCenter(0, 20, 0, 0, 10, 30, 5);
near(straightLabel[0], 10, 1e-9);
near(straightLabel[1], 25, 1e-9);
const bentLabel = helpers.arrowLabelCenter(0, 20, 0, Math.PI / 2, 10, 30, 5);
near(bentLabel[0], 40, 1e-9);
near(bentLabel[1], 25, 1e-9);

// 폭 분배: 켜진 항목 비율만 쓴다 (4번째 값은 무시)
const spans = helpers.arrowSpans(0, 100, 3, [43, 38, 19, 50]);
near(spans[0][0], 0, 1e-9);
near(spans[0][1], 43, 1e-9);
near(spans[1][1], 81, 1e-9);
near(spans[2][1], 100, 1e-9);
const empty = helpers.arrowSpans(0, 100, 2, [0, 0]);
near(empty[0][1], 50, 1e-9, "zero ratios split evenly");

// 순수 문법 검사 (#지시문 제외)
new Function(source.replace(/^#.*$/mg, ""));

console.log("check-energy-flow: ok");
