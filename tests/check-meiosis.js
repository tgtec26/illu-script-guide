const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_Meiosis.jsx");

assert.ok(fs.existsSync(scriptPath), "Object_Meiosis.jsx must exist");

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

// ExtendScript는 선언 없는 변수를 읽으면 참조 오류를 낸다. node --check는 이를 잡지 못한다.
for (const name of ["previewEnabled", "previewGroup", "previewSignature", "offsetXmm", "offsetYmm",
  "gapsMm", "daughterStepMm", "diametersMm", "arrowGapMm", "arrowScale",
  "showSperm", "headWidthMm", "headHeightMm", "tailLengthMm", "tailWidthPt", "waveAmpMm", "spermRotationDeg"]) {
  assert.ok(new RegExp(`\\bvar ${name}\\b`).test(source), `state variable must be declared: ${name}`);
}

const names = ["layoutCells", "defaultGapPt", "defaultDaughterStepPt", "arrowSegment",
  "spermTailPoints", "smoothClosedPoints", "eggPoints", "rotatePoints", "verticalReach"];
const helpers = new Function(
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${label}: expected ${expected}, got ${actual}`);
}

const bounds = [0, 300, 200, 0]; // left, top, right, bottom
const radii = [20, 20, 15, 10];

const gap = helpers.defaultGapPt(bounds, radii[0], radii[3], 3);
close(gap, (300 - 20 - 10 - 0) / 3, "default gap fills the rectangle height");
close(helpers.defaultGapPt(bounds, 20, 5 + 40, 4), (300 - 20 - 45) / 4,
  "with sperm the tail tip lands on the bottom edge across four gaps");

const daughterStep = helpers.defaultDaughterStepPt(bounds, radii);
close(daughterStep, (200 - 20) / 3, "default daughter spacing spans the rectangle width");

const rows = helpers.layoutCells(bounds, radii, [gap, gap, gap], daughterStep, [0, 0]);
assert.deepStrictEqual(rows.map((row) => row.length), [1, 1, 2, 4], "row counts");

const bottom = rows[3];
close(bottom[0].x - bottom[0].r, bounds[0], "leftmost bottom circle touches the left edge");
close(bottom[3].x + bottom[3].r, bounds[2], "rightmost bottom circle touches the right edge");
close(bottom[1].x - bottom[0].x, daughterStep, "bottom circles use the daughter spacing");
close(bottom[2].x - bottom[1].x, daughterStep, "bottom circles use the daughter spacing");
close(bottom[3].x - bottom[2].x, daughterStep, "bottom circles use the daughter spacing");

close(rows[0][0].y + rows[0][0].r, bounds[1], "top circle touches the top edge");
close(bottom[0].y - bottom[0].r, bounds[3], "bottom row touches the bottom edge at the default gap");

// 줄 간격은 따로 움직이고, 딸세포 간격을 바꾸면 중기 2가 중점으로 따라온다
const custom = helpers.layoutCells(bounds, radii, [10, 20, 30], 40, [5, -7]);
close(custom[0][0].y, 300 - 20 - 7, "offset shifts the top row");
close(custom[0][0].x, 100 + 5, "offset shifts the top row");
close(custom[1][0].y, custom[0][0].y - 10, "first gap");
close(custom[2][0].y, custom[1][0].y - 20, "second gap");
close(custom[3][0].y, custom[2][0].y - 30, "third gap");
close(custom[3][1].x - custom[3][0].x, 40, "custom daughter spacing");
close(custom[2][0].x, (custom[3][0].x + custom[3][1].x) / 2, "metaphase II follows the daughter midpoint");
close(custom[2][1].x, (custom[3][2].x + custom[3][3].x) / 2, "metaphase II follows the daughter midpoint");
close((custom[3][0].x + custom[3][3].x) / 2, 100 + 5, "daughter row stays centered on the rectangle");
close(rows[2][0].x, (bottom[0].x + bottom[1].x) / 2, "parent sits above the midpoint of its two daughters");
close(rows[2][1].x, (bottom[2].x + bottom[3].x) / 2, "parent sits above the midpoint of its two daughters");
close(rows[1][0].x, (rows[2][0].x + rows[2][1].x) / 2, "metaphase I sits above the midpoint of metaphase II");
close(rows[0][0].x, rows[1][0].x, "G1 sits directly above metaphase I");

// 화살표는 두 중심을 잇는 선 위에 놓이고 양쪽 원에서 gap만큼 떨어진다
const parent = {x: 0, y: 100, r: 20};
const child = {x: 30, y: 60, r: 10};
const segment = helpers.arrowSegment(parent, child, 5);
const length = Math.sqrt(30 * 30 + 40 * 40);
close(Math.hypot(segment[0][0] - parent.x, segment[0][1] - parent.y), 25, "start clears the parent circle by the gap");
close(Math.hypot(segment[1][0] - child.x, segment[1][1] - child.y), 15, "end stops short of the child circle by the gap");
close(
  (segment[0][0] - parent.x) * -40 - (segment[0][1] - parent.y) * 30,
  0,
  "arrow start lies on the center-to-center line"
);
close(
  (segment[1][0] - parent.x) * -40 - (segment[1][1] - parent.y) * 30,
  0,
  "arrow end lies on the center-to-center line"
);
close(length, 50, "sanity: center distance");

assert.strictEqual(
  helpers.arrowSegment({x: 0, y: 0, r: 20}, {x: 0, y: -32, r: 10}, 5),
  null,
  "overlapping circles produce no arrow"
);

// 정자 꼬리: 머리 아래에서 시작해 tailLen만큼 내려가고, 시작 두께 tailW에서 끝 0으로 가늘어진다
{
  const cx = 50, cy = 100, headH = 10, tailLen = 20, tailW = 2, amp = 3, waves = 1.25, samples = 24;
  const points = helpers.spermTailPoints(cx, cy, headH, tailLen, tailW, amp, waves, samples);
  assert.strictEqual(points.length, samples * 2 + 1, "left side + tip + right side");

  const base = points[0].anchor;
  const baseOther = points[points.length - 1].anchor;
  close(Math.hypot(base[0] - baseOther[0], base[1] - baseOther[1]), tailW, "tail starts at full width");
  const midLeft = points[samples / 2].anchor;
  const midRight = points[points.length - 1 - samples / 2].anchor;
  close(Math.hypot(midLeft[0] - midRight[0], midLeft[1] - midRight[1]), tailW / 2, "tail is half as wide at the middle");

  const tip = points[samples];
  close(tip.anchor[1], cy - headH / 2 - tailLen, "tip sits tailLen below the head bottom");
  assert.ok(tip.corner, "tip is a sharp corner");
  assert.ok(points[0].corner && points[points.length - 1].corner, "base edge is cut square");
  assert.ok(!points[1].corner && points[1].left[0] !== points[1].anchor[0], "side points carry bezier handles");

  for (const point of points) {
    assert.ok(Math.abs(point.anchor[0] - cx) <= amp + tailW / 2 + 1e-9, "tail stays inside the wave envelope");
  }

  const straight = helpers.spermTailPoints(cx, cy, headH, tailLen, tailW, 0, waves, samples);
  close(straight[samples].anchor[0], cx, "zero wave amplitude gives a straight tail");
}

// 달걀꼴 머리: 위(앞)가 좁고 아래(꼬리 쪽)가 넓다. 가장 넓은 곳은 중심보다 아래.
{
  const cx = 50, cy = 100, width = 10, height = 14, taper = 0.35, samples = 24;
  const egg = helpers.eggPoints(cx, cy, width, height, taper, samples);
  assert.strictEqual(egg.length, samples, "one point per sample");
  const xs = egg.map((p) => p.anchor[0]);
  const ys = egg.map((p) => p.anchor[1]);
  close(Math.max(...ys), cy + height / 2, "top of the head");
  close(Math.min(...ys), cy - height / 2, "bottom of the head");
  close(Math.max(...xs) - cx, width / 2, "full width is reached");
  const widest = egg.reduce((best, p) => (p.anchor[0] > best.anchor[0] ? p : best), egg[0]);
  assert.ok(widest.anchor[1] < cy, "widest point sits below the center (tail side)");
  const halfWidthAt = (fraction) => {
    const target = cy + height / 2 * fraction;
    const nearest = egg.reduce((best, p) => (Math.abs(p.anchor[1] - target) < Math.abs(best.anchor[1] - target) ? p : best), egg[0]);
    return Math.abs(nearest.anchor[0] - cx);
  };
  assert.ok(halfWidthAt(0.7) < halfWidthAt(-0.7), "front is narrower than the back");
  for (const p of egg) assert.ok(!p.corner, "head outline is fully smooth");
}

// 회전: 머리 중심을 축으로 돈다. 90°면 꼬리 끝(아래)이 오른쪽으로 온다.
{
  const cx = 50, cy = 100, headH = 10, tailLen = 20;
  const points = helpers.spermTailPoints(cx, cy, headH, tailLen, 2, 0, 1.25, 24);
  const turned = helpers.rotatePoints(points, cx, cy, Math.PI / 2);
  const tip = turned[24].anchor;
  close(tip[0], cx + headH / 2 + tailLen, "rotated tip x");
  close(tip[1], cy, "rotated tip y");
  assert.strictEqual(turned[24].corner, true, "corner flags survive rotation");
  const unturned = helpers.rotatePoints(points, cx, cy, 0);
  close(unturned[24].anchor[0], points[24].anchor[0], "zero rotation is identity");
}

// 화살표가 닿는 거리: 중심에서 바로 위 윤곽까지. 회전해도 실제 윤곽에서 잰다.
{
  const cx = 50, cy = 100, width = 10, height = 14;
  const square = [[cx - 5, cy + 5], [cx + 5, cy + 5], [cx + 5, cy - 5], [cx - 5, cy - 5]]
    .map((anchor) => ({anchor, left: anchor, right: anchor, corner: true}));
  close(helpers.verticalReach(square, cx, cy, 99), 5, "square reaches half its side");
  assert.strictEqual(helpers.verticalReach([], cx, cy, 99), 99, "no outline falls back");

  const egg = helpers.eggPoints(cx, cy, width, height, 0.35, 24);
  close(helpers.verticalReach(egg, cx, cy, 0), height / 2, "upright head reaches its top");

  const tilted = helpers.rotatePoints(egg, cx, cy, Math.PI / 6);
  const reach = helpers.verticalReach(tilted, cx, cy, 0);
  const oldApprox = height / 2 * Math.cos(Math.PI / 6) + width / 2 * Math.sin(Math.PI / 6);
  assert.ok(reach > width / 2 && reach < height / 2, "tilted reach lies between half width and half height");
  assert.ok(reach < oldApprox, "tilted reach is shorter than the old cos/sin blend that left a visible gap");

  const sideways = helpers.rotatePoints(egg, cx, cy, Math.PI / 2);
  assert.ok(Math.abs(helpers.verticalReach(sideways, cx, cy, 0) - width / 2) < 0.2,
    "sideways head reaches roughly half its width");
}

console.log("check-meiosis: ok");
