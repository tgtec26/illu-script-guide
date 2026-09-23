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

const names = ["convectionLoops", "loopPieces", "trimEnd", "heatArrows", "corner", "arcPoints"];
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
assert.ok(source.includes('var PREF_KEY = "ObjectConvection/settings";'));
console.log("convection checks passed");
