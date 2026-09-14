const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_Chromosome.jsx");
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

const names = ["armOutline", "dist", "bezierLength", "layoutSlots", "chromosomeWidth"];
const helpers = new Function(
  "MM_TO_PT", "ARM_SAMPLES",
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)(2.834645669, 6);

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 곧은 암: 밑동 (0,0), 위로 100, 두께 20
const straight = helpers.armOutline(0, 0, Math.PI / 2, 100, 20, 0, 0.4, 1.5);
const n = straight.anchors.length;
assert.strictEqual(n, 2 * 7 + 1, "anchors: right edge, tip, left edge");
assert.strictEqual(straight.lefts.length, n);
assert.strictEqual(straight.rights.length, n);

const tip = straight.anchors[7];
near(tip[0], 0, 1e-9, "tip on axis");
near(tip[1], 100, 1e-9, "tip reaches the arm length");

// 밑동 폭은 최대 두께의 40%, 끝 반원 직전은 최대 두께
near(straight.anchors[0][0], 4, 1e-9, "base right edge (+x)");
near(straight.anchors[n - 1][0], -4, 1e-9, "base left edge (-x)");
near(straight.anchors[6][0], 10, 1e-9, "full width before the cap");
near(straight.anchors[8][0], -10, 1e-9, "full width on the left edge");
// 좌우 대칭
for (let i = 0; i <= 6; i++) {
  near(straight.anchors[i][0], -straight.anchors[n - 1 - i][0], 1e-9, `mirror x ${i}`);
  near(straight.anchors[i][1], straight.anchors[n - 1 - i][1], 1e-9, `mirror y ${i}`);
}
// 핸들은 앵커와 같은 방향(부드러운 곡선) — 오른쪽 가장자리는 위로 향한다
for (let i = 1; i < 6; i++) {
  assert.ok(straight.rights[i][1] > straight.anchors[i][1], `right handle ${i} points forward`);
  assert.ok(straight.lefts[i][1] < straight.anchors[i][1], `left handle ${i} points back`);
}
// 밑동은 핸들 없이 각지게 닫힌다
assert.deepStrictEqual(straight.lefts[0], straight.anchors[0]);
assert.deepStrictEqual(straight.rights[n - 1], straight.anchors[n - 1]);

// 휨 40°: 밑동 접선은 그대로 위, 끝 접선이 왼쪽(-x)으로 40° 돈다
const bent = helpers.armOutline(0, 0, Math.PI / 2, 100, 20, 40, 0.4, 1.5);
const midX = (bent.anchors[3][0] + bent.anchors[n - 1 - 3][0]) / 2;
assert.ok(midX < 0 && midX > -30, `midline bends left gently (${midX})`);
const bentTip = bent.anchors[7];
const endC = [(bent.anchors[6][0] + bent.anchors[8][0]) / 2, (bent.anchors[6][1] + bent.anchors[8][1]) / 2];
near(helpers.dist(bentTip, endC), 10, 1e-6, "tip sits one radius past the centreline end");
near(Math.atan2(endC[0] - bentTip[0], bentTip[1] - endC[1]), 40 * Math.PI / 180, 1e-6, "tip direction turned by the full bend");
// 밑동 가장자리 접선은 여전히 위쪽(현이 아닌 접선 기준이라 안쪽 암과 시작부터 겹치지 않는다)
assert.ok(Math.abs(bent.rights[1][0] - bent.anchors[1][0]) < 0.25 * (bent.rights[1][1] - bent.anchors[1][1]), "base edge still heads up");
// 곡선 길이 = 몸통 길이 (다리 길이 1의 길이 × d = 90)
near(helpers.bezierLength(0, 1, 0, 1) * 1, 2, 1e-9, "straight bezier length is the two legs");
const bentNeg = helpers.armOutline(0, 0, Math.PI / 2, 100, 20, -40, 0.4, 1.5);
near((bentNeg.anchors[3][0] + bentNeg.anchors[n - 4][0]) / 2, -midX, 1e-9, "negative bend mirrors");

// 밑동 비율을 줄이면 밑동만 좁아지고 끝 폭은 그대로
const narrow = helpers.armOutline(0, 0, Math.PI / 2, 100, 20, 0, 0.2, 1.5);
near(narrow.anchors[0][0], 2, 1e-9, "narrow base");
near(narrow.anchors[6][0], 10, 1e-9, "full width unchanged");

// 부풀기: 클수록 중간 폭이 좁다(끝 가까이에서 늦게 부푼다)
const soft = helpers.armOutline(0, 0, Math.PI / 2, 100, 20, 0, 0.2, 1);
const club = helpers.armOutline(0, 0, Math.PI / 2, 100, 20, 0, 0.2, 3);
assert.ok(club.anchors[3][0] < soft.anchors[3][0], "higher taper keeps the middle narrower");
near(club.anchors[6][0], 10, 1e-9, "taper leaves the tip width alone");

// 각도: -90°면 아래로
const down = helpers.armOutline(0, 0, -Math.PI / 2, 50, 10, 0, 0.4, 1.5);
near(down.anchors[7][1], -50, 1e-9, "downward arm tip");

// 배치: 켜진 염색체가 각자 폭만큼 자리 잡고 간격으로 띄운다
const a = {chromatids: 1, widthMm: 2, lengthMm: 10, centromerePct: 40, spreadDeg: 15};
const b = {chromatids: 2, widthMm: 2, lengthMm: 10, centromerePct: 40, spreadDeg: 15};
const wa = helpers.chromosomeWidth(a), wb = helpers.chromosomeWidth(b);
assert.ok(wb > wa, "two chromatids need more room than one");
const slots = helpers.layoutSlots([a, b], 10);
near(slots.centers[0], wa / 2, 1e-9, "first slot centre");
near(slots.centers[1], wa + 10 + wb / 2, 1e-9, "second slot centre after spacing");
near(slots.totalWidth, wa + 10 + wb, 1e-9, "total width");
assert.strictEqual(helpers.layoutSlots([], 10).totalWidth, 0);

console.log("check-chromosome: ok");
