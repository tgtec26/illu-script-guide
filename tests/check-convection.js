const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Convection.jsx"), "utf8");

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

const names = ["convectionLoops", "baseLoops", "loopPieces", "trimEnd", "heatArrows", "corner", "arcPoints",
  "beakerShape", "offsetWall", "v", "roundPolyline", "unit"];
const lib = new Function(`var MM = 2.834645669;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const box = [0, 60, 100, 0];

// 가운데 가열: 두 고리, 왼쪽은 반시계(가운데로 오른다), 오른쪽은 시계
{
  const loops = lib.convectionLoops(box, 0, 4, 0.3);
  assert.strictEqual(loops.length, 2);
  assert.ok(!loops[0].clockwise && loops[1].clockwise);
  assert.ok(loops[0].right < 50 && loops[1].left > 50, "gap between the loops");
  near(loops[0].top, 56, 1e-9, "margin");
}
// 한쪽 가열: 고리 하나, 가열한 쪽으로 오른다
assert.ok(lib.convectionLoops(box, 1, 4, 0.3)[0].clockwise, "left heat: clockwise, rising on the left");
assert.ok(!lib.convectionLoops(box, 2, 4, 0.3)[0].clockwise, "right heat: counter-clockwise");
assert.strictEqual(lib.convectionLoops(box, 0, 60, 0.3).length, 0, "margin too large");

// 네 조각: 첫 조각은 오르는 변(시계면 왼쪽), 조각 끝은 다음 조각 시작에서 gap만큼 모자란다
for (const clockwise of [true, false]) {
  const loop = {left: 10, top: 50, right: 90, bottom: 10, r: 8, clockwise};
  const pieces = lib.loopPieces(loop, 0);
  assert.strictEqual(pieces.length, 4);
  const first = pieces[0];
  const start = first[0].anchor;
  const bend = first[1].anchor;
  near(start[0], clockwise ? 10 : 90, 1e-9, "rising side x");
  assert.ok(bend[1] > start[1], "first piece goes up");
  for (let i = 0; i < 4; i++) {
    const end = pieces[i][pieces[i].length - 1].anchor;
    const next = pieces[(i + 1) % 4][0].anchor;
    near(Math.hypot(end[0] - next[0], end[1] - next[1]), 0, 1e-9, "pieces meet without gap");
  }
  const trimmed = lib.loopPieces(loop, 1.5);
  for (let i = 0; i < 4; i++) {
    const end = trimmed[i][trimmed[i].length - 1].anchor;
    const next = trimmed[(i + 1) % 4][0].anchor;
    near(Math.hypot(end[0] - next[0], end[1] - next[1]), 1.5, 0.05, "gap before the next piece");
  }
}

// 가열 표시: 세 화살표가 위를 향하고 용기 바닥 아래에서 끝난다
{
  const marks = lib.heatArrows(box, 1);
  assert.strictEqual(marks.length, 3);
  for (const m of marks) assert.ok(m[1][1] > m[0][1] && m[1][1] < 0);
  near(marks[1][0][0], 25, 1e-9, "under the left quarter");
}
// 화살표 3개: 고리마다 간격만큼 안쪽으로 들인 고리 두 개가 더, 같은 방향
{
  const loops = lib.convectionLoops(box, 1, 4, 0.3, 3, 5);
  assert.strictEqual(loops.length, 3);
  for (let k = 0; k < 3; k++) {
    near(loops[k].left, 4 + 5 * k, 1e-9, "inset left");
    near(loops[k].top, 56 - 5 * k, 1e-9, "inset top");
    assert.ok(loops[k].clockwise, "same direction");
  }
  assert.strictEqual(lib.convectionLoops(box, 0, 4, 0.3, 3, 5).length, 6, "two loops × three");
  // 간격이 커서 안쪽 고리가 사라지면 뺀다
  assert.strictEqual(lib.convectionLoops(box, 1, 4, 0.3, 3, 30).length, 1, "too small inner loops are dropped");
  // 얕은 물: 안쪽 고리의 짧은 변이 간격보다 짧으면 뺀다 (높이 12 → 4 → 납작)
  const shallow = lib.convectionLoops([0, 20, 100, 0], 1, 4, 0.3, 3, 4);
  assert.strictEqual(shallow.length, 2, "flat inner loop is dropped");
  for (const l of shallow.slice(1)) assert.ok(Math.min(l.right - l.left, l.top - l.bottom) >= 4, "inner loops are not flat");
  assert.deepStrictEqual(lib.convectionLoops(box, 1, 4, 0.3), lib.convectionLoops(box, 1, 4, 0.3, 1, 5), "one loop by default");
}

// 비커: 너비·높이는 받은 값, 물은 바닥부터 물 높이까지, 고리 상자는 물 안
{
  const b = lib.beakerShape([50, 50], 60, 80, 0.5);
  assert.deepStrictEqual(b.box, [20, 90, 80, 10], "no glass: box is the inner wall");
  const top = 90 - 60 * 0.06;
  near(b.water[1], 10 + (top - 10) * 0.5, 1e-9, "water level");
  near(b.water[3], 10, 1e-9, "water bottom");
  // 물은 바닥 모서리만 둥근 사각형: 앵커 6개, 모두 비커 안
  assert.strictEqual(b.waterPoints.length, 6, "six anchors, no flattened polygon");
  for (const p of b.waterPoints) for (const q of [p.anchor, p.left, p.right]) {
    assert.ok(q[1] <= b.water[1] + 1e-9 && q[1] >= 10 - 1e-9 && q[0] >= 20 - 1e-9 && q[0] <= 80 + 1e-9, "water inside the beaker");
  }
  assert.deepStrictEqual(b.surface, [[20, b.water[1]], [80, b.water[1]]], "surface spans the walls");
  // 수면이 바닥 모서리 원호에 걸리면 수면 선을 벽 안쪽으로 들인다
  const low = lib.beakerShape([50, 50], 60, 80, 0.03);
  assert.ok(low.surface[0][0] > 20 && low.surface[1][0] < 80, "surface inset inside the rounded corner");
  const loops = lib.convectionLoops(b.water, 0, 3, 0.5, 3, 2);
  for (const l of loops) assert.ok(l.top <= b.water[1] - 3 + 1e-9 && l.bottom >= 10 + 3 - 1e-9, "loops stay in the water");
  // 가득 채우면 수면 선을 따로 긋지 않는다
  assert.strictEqual(lib.beakerShape([0, 0], 30, 40, 1).surface, null);
}
// 끊김 위치: 조각은 변의 곧은 부분에서 시작·끝나고(곡선 위가 아님), 다음 조각 시작과 gap만큼 떨어진다
for (const clockwise of [true, false]) {
  const loop = {left: 10, top: 50, right: 90, bottom: 10, r: 8, clockwise};
  for (const f of [0.25, 0.5, 1]) {
    const pieces = lib.loopPieces(loop, 1.5, f);
    for (let i = 0; i < 4; i++) {
      const p = pieces[i];
      const start = p[0].anchor, end = p[p.length - 1].anchor, prev = p[p.length - 2].anchor;
      const onStraight = (q) => (Math.abs(q[0] - 10) < 1e-9 || Math.abs(q[0] - 90) < 1e-9) ? (q[1] >= 18 - 1e-9 && q[1] <= 42 + 1e-9)
        : (Math.abs(q[1] - 10) < 1e-9 || Math.abs(q[1] - 50) < 1e-9) && q[0] >= 18 - 1e-9 && q[0] <= 82 + 1e-9;
      assert.ok(onStraight(start), `f ${f}: piece ${i} starts on a straight side`);
      if (f >= 0.25) {
        assert.ok(onStraight(end), `f ${f}: piece ${i} ends on a straight side`);
        assert.ok(Math.abs(end[0] - prev[0]) < 1e-9 || Math.abs(end[1] - prev[1]) < 1e-9, "last segment is straight");
      }
      const next = pieces[(i + 1) % 4][0].anchor;
      near(Math.hypot(end[0] - next[0], end[1] - next[1]), 1.5, 1e-9, "gap before the next piece");
    }
  }
  // 50%면 첫 조각은 오르는 변 가운데에서 시작
  const mid = lib.loopPieces(loop, 0, 0.5)[0][0].anchor;
  near(mid[0], clockwise ? 10 : 90, 1e-9, "rising side");
  near(mid[1], 30, 1e-9, "middle of the side");
  // 0이면 예전과 같다
  assert.deepStrictEqual(lib.loopPieces(loop, 1.5, 0), lib.loopPieces(loop, 1.5));
}
// 유리 두께: 가운데 선은 안쪽 벽에서 두께 절반 바깥, 물과 수면은 그대로, 양 끝은 선의 첫·끝 점
{
  const plain = lib.beakerShape([50, 50], 60, 80, 0.5, 0);
  const b = lib.beakerShape([50, 50], 60, 80, 0.5, 2);
  assert.deepStrictEqual(b.waterPoints, plain.waterPoints, "water unchanged by the glass");
  assert.deepStrictEqual(b.surface, plain.surface, "surface unchanged by the glass");
  const xs = b.outline.map((p) => p.anchor[0]), ys = b.outline.map((p) => p.anchor[1]);
  near(Math.max(...xs), 81, 1e-9, "right wall centre 1 outside");
  near(Math.min(...ys), 9, 1e-9, "bottom centre 1 below");
  assert.ok(b.outline.some((p) => Math.abs(p.anchor[0] - 19) < 1e-9), "left wall centre 1 outside");
  assert.deepStrictEqual(b.ends, [b.outline[0].anchor, b.outline[b.outline.length - 1].anchor]);
  assert.deepStrictEqual(b.box, [18, 90, 82, 8], "box reaches the outer glass");
}
// 유리 두께 0이면 안쪽 벽 그대로 한 줄 선, 벽 옮기기는 Object_LabGlassware.jsx와 같은 함수
{
  const zero = lib.beakerShape([50, 50], 60, 80, 0.5, 0);
  assert.strictEqual(zero.glass, 0);
  near(Math.max(...zero.outline.map((p) => p.anchor[0])), 80, 1e-9, "single line on the inner wall");
  assert.ok(source.includes("var GLASS_RANGE = [0, 5];"), "glass can be zero");
  const lab = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_LabGlassware.jsx"), "utf8");
  const pick = (src) => { const i = src.indexOf("    function offsetWall("); return src.slice(i, src.indexOf("\n    }\n", i)); };
  assert.strictEqual(pick(source), pick(lab), "offsetWall matches Object_LabGlassware.jsx");
}
assert.ok(source.includes('if (p[0] !== "v4" || p.length !== 17) return;'), "settings bumped to v4");
assert.ok(source.includes('var PREF_KEY = "ObjectConvection/settings";'));
console.log("convection checks passed");
