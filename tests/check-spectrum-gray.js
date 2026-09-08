const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "03_색상", "Color_SpectrumGray.jsx");

assert.ok(fs.existsSync(scriptPath), "Color_SpectrumGray.jsx must exist");
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

const helpers = new Function(`
  var WAVE_MIN = 380, WAVE_MAX = 780, WAVE_STEP = 10;
  ${source.slice(source.indexOf("var GRAY_KEYS"), source.indexOf("];", source.indexOf("var GRAY_KEYS")) + 2)}
  ${extractFunction("wavelengthToGray")}
  ${extractFunction("buildStops")}
  return { wavelengthToGray, buildStops };
`)();

// 380/780 끝은 거의 검정, 580nm 부근이 가장 밝다
assert.ok(helpers.wavelengthToGray(380) < 0.15, "380nm must be near black");
assert.ok(helpers.wavelengthToGray(780) < 0.15, "780nm must be near black");
assert.ok(Math.abs(helpers.wavelengthToGray(570) - 1) < 0.001, "570nm must be the brightest");
assert.ok(helpers.wavelengthToGray(530) < 0.9 && helpers.wavelengthToGray(600) < 0.9, "peak must be narrow");
assert.ok(helpers.wavelengthToGray(520) > helpers.wavelengthToGray(450), "green brighter than blue");
assert.ok(helpers.wavelengthToGray(570) > helpers.wavelengthToGray(650), "yellow brighter than red");

// 정지점은 41개, rampPoint 오름차순, 기본은 왼쪽이 380
const normal = helpers.buildStops(100, false);
assert.strictEqual(normal.length, 41);
for (let i = 1; i < normal.length; i++) assert.ok(normal[i].pos > normal[i - 1].pos, "stops ascending");
assert.strictEqual(normal[0].pos, 0);
assert.strictEqual(normal[normal.length - 1].pos, 100);
assert.strictEqual(normal[19].k, 0, "570nm stop is K=0 at 100%");

// 반전은 순서만 뒤집힌다
const flipped = helpers.buildStops(100, true);
for (let i = 0; i < normal.length; i++) {
  assert.ok(Math.abs(flipped[i].pos - normal[i].pos) < 1e-9, "flipped positions match");
  assert.strictEqual(flipped[i].k, normal[normal.length - 1 - i].k);
}

// 밝기는 감마: 흰색(570)은 그대로 두고 어두운 쪽만 오르내린다. 잘림 없이 대비가 따라 줄어야 한다.
const dim = helpers.buildStops(50, false);
assert.ok(dim[10].k > normal[10].k, "50% must be darker at 480nm");
assert.strictEqual(dim[19].k, 0, "570nm stays white when dimmed");
const bright = helpers.buildStops(200, false);
assert.ok(bright[0].k < normal[0].k, "200% must lift the dark end");
assert.ok(bright[10].k < normal[10].k, "200% must be brighter at 480nm");
assert.strictEqual(bright[19].k, 0, "570nm stays white when brightened");
assert.ok(bright[19].k - bright[0].k < normal[19].k - normal[0].k || bright[0].k < normal[0].k, "contrast must not increase");
for (const stop of helpers.buildStops(300, false)) assert.ok(stop.k >= 0 && stop.k <= 100, "K stays within 0..100");

// 저장 형식: 다이얼로그 기본 요건
assert.ok(source.includes('"SpectrumGray/settings"'), "PREF_KEY must be set");
assert.ok(source.includes("illu_last_script.txt"), "RepeatLast memo header must exist");

// GRAY_KEYS는 updatePreview() 첫 호출보다 위에 있어야 한다 (var 호이스팅 → undefined)
assert.ok(source.indexOf("var GRAY_KEYS") < source.indexOf("updatePreview();"),
  "GRAY_KEYS must be declared before the first updatePreview() call");

console.log("check-spectrum-gray: ok");
