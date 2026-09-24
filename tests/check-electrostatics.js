const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Electrostatics.jsx"), "utf8");

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

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);

const names = ["electroscopeParts", "jarOutline", "lowerHalfEllipse", "foilPoints", "rodShape", "capsulePoints", "electroscopeCharges", "inductionCharges"];
const lib = new Function(`var TILT = 0.17;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 대전 안 됨: 짝, 닫힘. 가까이: 금속판 반대·금속박 같은 전하. 접촉 후: 모두 같은 전하
assert.deepStrictEqual(lib.electroscopeCharges(0, 1), {plate: 0, foil: {sign: 0, open: false}});
assert.deepStrictEqual(lib.electroscopeCharges(1, 1), {plate: -1, foil: {sign: 1, open: true}});
assert.deepStrictEqual(lib.electroscopeCharges(1, -1), {plate: 1, foil: {sign: -1, open: true}});
assert.deepStrictEqual(lib.electroscopeCharges(2, -1), {plate: -1, foil: {sign: -1, open: true}});
assert.deepStrictEqual(lib.inductionCharges(1), {near: -1, far: 1});
// 금속박: 막대 끝에 매달려 세로에서 각만큼 벌어진다
const p = lib.electroscopeParts(100);
const foil = lib.foilPoints(p.foilTop, p.foilLength, p.foilWidth, 20);
const dx = foil.tip[0] - p.foilTop[0], dy = foil.tip[1] - p.foilTop[1];
near(Math.hypot(dx, dy), p.foilLength, 1e-9, "foil length");
near(Math.atan2(dx, -dy) * 180 / Math.PI, 20, 1e-9, "opens 20° to the right");
// 부품 순서: 금속판 > 마개 > 금속박 위 > 병 바닥
assert.ok(p.plate[0] >= p.cap[1] && p.cap[0] > p.foilTop[1] && p.foilTop[1] - p.foilLength > p.bottom, "parts stack inside the jar");
assert.ok(p.rimRx > p.neckRx && p.plateRx < p.bodyRx, "cap covers the neck, plate narrower than the jar");
// 병 윤곽: 좌우 대칭, 가장 낮은 점이 병 바닥 앞 끝
const jar = lib.jarOutline(p);
for (let i = 0; i < jar.length; i++) {
  const m = jar[jar.length - 1 - i];
  near(jar[i].anchor[0], -m.anchor[0], 1e-9, "symmetric x");
  near(jar[i].anchor[1], m.anchor[1], 1e-9, "symmetric y");
}
near(Math.min(...jar.map((q) => q.anchor[1])), -50, 1e-9, "bottom");
const rod = lib.rodShape([0, 0], 50, 8, 20);
near(Math.hypot(rod.outline[1][0] - rod.outline[0][0], rod.outline[1][1] - rod.outline[0][1]), 50, 1e-9, "rod length");
// 둥근 끝: 양 끝 꼭짓점 사이가 전체 길이, 옆 두 점 사이가 굵기
near(Math.hypot(rod.capsule[2].anchor[0] - rod.capsule[5].anchor[0], rod.capsule[2].anchor[1] - rod.capsule[5].anchor[1]), 50, 1e-9, "capsule length");
near(Math.hypot(rod.capsule[1].anchor[0] - rod.capsule[3].anchor[0], rod.capsule[1].anchor[1] - rod.capsule[3].anchor[1]), 8, 1e-9, "capsule thickness");
assert.ok(source.includes('var PREF_KEY = "ObjectElectrostatics/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 13'), "settings field count");
console.log("electrostatics checks passed");
