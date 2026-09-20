const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_SilicateStructure.jsx");
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

const orderFaces = new Function(`${extractFunction("orderFaces")}\nreturn orderFaces;`)();

const s = 10;
const h = s * Math.sqrt(3) / 2;
const T = [0, h], BL = [-s / 2, 0], BR = [s / 2, 0];
const TL = [-s / 2, h], TR = [s / 2, h], B = [0, 0];

// 면 = 바깥 변의 두 꼭짓점. 순서와 무관하게 같은 변이면 같은 면이다.
function sameFace(face, p, q) {
  const has = (pt) => (face.a === pt || face.b === pt);
  return has(p) && has(q);
}
function expectOrder(faces, expected, label) {
  assert.strictEqual(faces.length, 3, `${label}: three faces`);
  expected.forEach(([p, q, name], rank) => {
    assert.ok(sameFace(faces[rank], p, q), `${label}: rank ${rank} should be ${name}`);
  });
}

// 위로 뾰족: 왼쪽 → 오른쪽 → 아래
expectOrder(orderFaces([T, BL, BR]), [[T, BL, "left"], [T, BR, "right"], [BL, BR, "bottom"]], "up");
// 꼭짓점 순서를 바꿔도 같은 결과
expectOrder(orderFaces([BR, T, BL]), [[T, BL, "left"], [T, BR, "right"], [BL, BR, "bottom"]], "up (rotated input)");
// 아래로 뾰족: 위 → 왼쪽 → 오른쪽
expectOrder(orderFaces([TL, TR, B]), [[TL, TR, "top"], [TL, B, "left"], [TR, B, "right"]], "down");

// 세로 방향(90° 회전): 세 면의 밝기가 모두 달라야 한다
const quarter = (p) => [-p[1], p[0]];
for (const corners of [[T, BL, BR], [TL, TR, B]]) {
  const faces = orderFaces(corners.map(quarter));
  assert.ok(faces[0].light > faces[1].light && faces[1].light > faces[2].light, "rotated: distinct tones");
}

console.log("silicate tetra: ok");
