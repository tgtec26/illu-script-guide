const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 원 입체(원 입체.jsx)의 원기둥 탭: 물 높이
const bundle = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "원 입체.jsx"), "utf8");
const source = bundle.slice(bundle.indexOf("function makeCylinderEngine()"), bundle.indexOf("function makeConeEngine()"));

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced helper: ${name}`);
}

const waterGeometry = new Function(`${extractFunction("waterGeometry")}\nreturn waterGeometry;`)();
// 윗면 중심 (0, 0), 밑면 중심 (0, -40): 물 25%는 밑면에서 10 위
assert.deepStrictEqual(waterGeometry(0, 0, 0, -40, 0.25), { surfaceX: 0, surfaceY: -30 });
assert.deepStrictEqual(waterGeometry(10, 0, 50, 0, 1), { surfaceX: 10, surfaceY: 0 });
assert.deepStrictEqual(waterGeometry(10, 0, 50, 0, 0), { surfaceX: 50, surfaceY: 0 });

// 설정: v5는 물 K와 물 높이를 끝에 더하고, v3·v4 문자열도 그대로 읽는다
const save = source.slice(source.indexOf("function saveSettings()"), source.indexOf("function applySavedSettings()"));
const parts = save.slice(save.indexOf("var parts = ["), save.indexOf("];"));
assert.ok(parts.includes('"v5"') && parts.includes("faceK[FACE_WATER], waterPercent"));
const restore = extractFunction("applySavedSettings");
assert.ok(restore.includes('p[0] !== "v3" && p[0] !== "v4" && p[0] !== "v5"'));
assert.ok(restore.includes("waterPercent = Math.round(restoreNumber(p[17], waterPercent, 0, 100));"));

// 물은 몸통 칠 위, 뒤 테두리·옆 선·앞면 아래에 그린다 (앞면이 수면을 덮을 수 있게)
const create = extractFunction("createCylinder");
const at = (text) => { const i = create.indexOf(text); assert.ok(i >= 0, text); return i; };
assert.ok(at("applyFill(bodyFill, faceK[FACE_OUTER]);") < at("var waterBody = makeBodyFill(") && at("var waterBody = makeBodyFill(") < at("var rearCap = makeRearRim("));
assert.ok(create.includes("if (waterPercent > 0 && innerRatio <= 0)"), "no water inside a pipe");
console.log("cylinder water checks passed");
