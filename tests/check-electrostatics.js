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

const names = ["electroscopeParts", "foilPoints", "rodShape", "electroscopeCharges", "inductionCharges"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

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
assert.ok(p.plate[1] > p.stopper[1] && p.stopper[1] > p.foilTop[1] && p.foilTop[1] - p.foilLength > p.jar[3], "parts stack inside the jar");
const rod = lib.rodShape([0, 0], 50, 8, 20);
near(Math.hypot(rod.outline[1][0] - rod.outline[0][0], rod.outline[1][1] - rod.outline[0][1]), 50, 1e-9, "rod length");
assert.ok(source.includes('var PREF_KEY = "ObjectElectrostatics/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 13'), "settings field count");
console.log("electrostatics checks passed");
