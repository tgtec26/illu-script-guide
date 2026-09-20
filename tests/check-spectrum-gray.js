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

function extractArray(name) {
  const start = source.indexOf(`var ${name} = [`);
  assert.ok(start >= 0, `missing table: ${name}`);
  return source.slice(start, source.indexOf("\n    ];", start) + 7);
}

const helpers = new Function(`
  var WAVE_STEP = 10;
  var waveMin = 380, waveMax = 780, flipDirection = false;
  ${extractArray("GRAY_KEYS")}
  ${extractArray("ELEMENTS")}
  ${extractArray("KOPUB_BATANG_NAMES")}
  ${extractArray("LABEL_SETS")}
  ${extractFunction("wavelengthToGray")}
  ${extractFunction("buildStops")}
  ${extractFunction("xOfWavelength")}
  ${extractFunction("lineWavelengths")}
  return { wavelengthToGray, buildStops, ELEMENTS, LABEL_SETS, lineWavelengths,
    xOf: function(nm, min, max, flip, left, right) { waveMin = min; waveMax = max; flipDirection = flip; return xOfWavelength(nm, left, right); } };
`)();

// 380/780 끝은 거의 검정, 570nm이 가장 밝다, 범위 밖은 양끝 값
assert.ok(helpers.wavelengthToGray(380) < 0.15, "380nm must be near black");
assert.ok(helpers.wavelengthToGray(780) < 0.15, "780nm must be near black");
assert.ok(Math.abs(helpers.wavelengthToGray(570) - 1) < 0.001, "570nm must be the brightest");
assert.ok(helpers.wavelengthToGray(530) < 0.9 && helpers.wavelengthToGray(600) < 0.9, "peak must be narrow");
assert.ok(helpers.wavelengthToGray(520) > helpers.wavelengthToGray(450), "green brighter than blue");
assert.ok(helpers.wavelengthToGray(570) > helpers.wavelengthToGray(650), "yellow brighter than red");
assert.strictEqual(helpers.wavelengthToGray(300), helpers.wavelengthToGray(380), "below the table clamps to the first key");
assert.strictEqual(helpers.wavelengthToGray(1000), helpers.wavelengthToGray(780), "above the table clamps to the last key");

// 정지점: 380~780은 41개, rampPoint 오름차순, 기본은 왼쪽이 380. 다른 범위도 최대 41개
const normal = helpers.buildStops(100, false, 380, 780);
assert.strictEqual(normal.length, 41);
for (let i = 1; i < normal.length; i++) assert.ok(normal[i].pos > normal[i - 1].pos, "stops ascending");
assert.strictEqual(normal[0].pos, 0);
assert.strictEqual(normal[normal.length - 1].pos, 100);
assert.strictEqual(normal[19].k, 0, "570nm stop is K=0 at 100%");
assert.strictEqual(helpers.buildStops(100, false, 400, 700).length, 31, "400~700 takes 31 stops");
assert.strictEqual(helpers.buildStops(100, false, 300, 1000).length, 41, "wide ranges are capped at 41 stops");
assert.strictEqual(helpers.buildStops(100, false, 500, 550).length, 6, "narrow ranges keep 10nm steps");

// 반전은 순서만 뒤집힌다
const flipped = helpers.buildStops(100, true, 380, 780);
for (let i = 0; i < normal.length; i++) {
  assert.ok(Math.abs(flipped[i].pos - normal[i].pos) < 1e-9, "flipped positions match");
  assert.strictEqual(flipped[i].k, normal[normal.length - 1 - i].k);
}

// 밝기는 감마: 흰색(570)은 그대로 두고 어두운 쪽만 오르내린다. 잘림 없이 대비가 따라 줄어야 한다.
const dim = helpers.buildStops(50, false, 380, 780);
assert.ok(dim[10].k > normal[10].k, "50% must be darker at 480nm");
assert.strictEqual(dim[19].k, 0, "570nm stays white when dimmed");
const bright = helpers.buildStops(200, false, 380, 780);
assert.ok(bright[0].k < normal[0].k, "200% must lift the dark end");
assert.ok(bright[10].k < normal[10].k, "200% must be brighter at 480nm");
assert.strictEqual(bright[19].k, 0, "570nm stays white when brightened");
for (const stop of helpers.buildStops(300, false, 380, 780)) assert.ok(stop.k >= 0 && stop.k <= 100, "K stays within 0..100");

// 파장 → x: 왼쪽 끝이 최소 파장, 반전이면 최대 파장
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-9, `${label}: expected ${b}, got ${a}`);
near(helpers.xOf(380, 380, 780, false, 100, 500), 100, "min at the left edge");
near(helpers.xOf(780, 380, 780, false, 100, 500), 500, "max at the right edge");
near(helpers.xOf(580, 380, 780, false, 100, 500), 300, "midpoint");
near(helpers.xOf(380, 380, 780, true, 100, 500), 500, "flipped: min at the right edge");
near(helpers.xOf(400, 400, 700, false, 0, 300), 0, "custom range start");
near(helpers.xOf(589, 400, 700, false, 0, 300), 189, "Na D at 189/300 of a 400~700 band");

// 원소 표: 14종, 파장은 370~800nm 0.1nm 정수로 오름차순, 등급은 1(주요)·2(약한), 교과서 대표선은 주요 선
const { ELEMENTS } = helpers;
assert.deepStrictEqual(ELEMENTS.map((e) => e.name), ["H", "He", "Li", "C", "N", "O", "Ne", "Na", "Mg", "Ar", "K", "Ca", "Fe", "Hg"]);
for (const element of ELEMENTS) {
  assert.ok(element.lines.length >= 5, `${element.name} has lines`);
  for (let i = 0; i < element.lines.length; i++) {
    const [wave, tier] = element.lines[i];
    assert.ok(Number.isInteger(wave) && wave >= 3700 && wave <= 8000, `${element.name} wavelength ${wave} in 370~800nm`);
    assert.ok(tier === 1 || tier === 2, `${element.name} tier ${tier}`);
    if (i > 0) assert.ok(wave > element.lines[i - 1][0], `${element.name} sorted ascending at ${wave}`);
  }
  assert.ok(element.lines.some(([, tier]) => tier === 1), `${element.name} has major lines`);
}
const major = (name) => ELEMENTS.find((e) => e.name === name).lines.filter(([, t]) => t === 1).map(([w]) => w);
for (const wave of [6563, 4861, 4340, 4102]) assert.ok(major("H").includes(wave), `Balmer ${wave} is a major H line`);
for (const wave of [5890, 5896]) assert.ok(major("Na").includes(wave), `Na D ${wave}`);
for (const wave of [4047, 4358, 5461, 5770, 5791]) assert.ok(major("Hg").includes(wave), `Hg ${wave}`);
for (const wave of [3934, 3968, 4227]) assert.ok(major("Ca").includes(wave), `Ca ${wave} (H·K, 422.7)`);
for (const wave of [5167, 5173, 5184]) assert.ok(major("Mg").includes(wave), `Mg b ${wave}`);
assert.ok(major("He").includes(5876), "He D3 587.6");
assert.ok(major("Li").includes(6708), "Li 670.8");

// 선 합치기: 범위 안 오름차순, mergeNm보다 가까운 이웃은 평균 하나로. 나트륨 D선은 1nm에서 한 선, 0이면 둘
const byName = (name) => ELEMENTS.find((e) => e.name === name);
const naMajor = helpers.lineWavelengths([byName("Na")], false, 400, 700, 0);
assert.deepStrictEqual(naMajor, [466.5, 466.9, 497.9, 498.3, 568.3, 568.8, 589, 589.6, 615.4, 616.1], "Na major lines, unmerged, sorted, within range");
const naMerged = helpers.lineWavelengths([byName("Na")], false, 400, 700, 1);
assert.strictEqual(naMerged.length, 5, "1nm merge turns the five Na doublets into five lines");
near(naMerged[3], 589.3, "Na D merges to the mean 589.3");
assert.deepStrictEqual(helpers.lineWavelengths([byName("H")], false, 400, 700, 1), [410.2, 434, 486.1, 656.3], "Balmer lines are far apart and stay");
assert.deepStrictEqual(helpers.lineWavelengths([byName("H")], true, 380, 780, 0), [383.5, 388.9, 397, 410.2, 434, 486.1, 656.3], "weak lines included and range widened");
const twoElements = helpers.lineWavelengths([byName("H"), byName("Ca")], false, 380, 780, 0);
for (let i = 1; i < twoElements.length; i++) assert.ok(twoElements[i] >= twoElements[i - 1], "merged element lists stay sorted");
assert.deepStrictEqual(helpers.lineWavelengths([byName("O")], false, 770, 780, 1), [(777.2 + 777.4 + 777.5) / 3], "the O triplet collapses to one line");
assert.deepStrictEqual(helpers.lineWavelengths([byName("Na")], false, 600, 610, 1), [], "nothing in range gives no lines");

// 띠 기호: 없음 + 원문자·영문·로마 숫자, 세트마다 3개. 서체·크기는 Text_input.jsx와 같다
assert.deepStrictEqual(helpers.LABEL_SETS.map((set) => set.name), ["없음", "㉠ ㉡ ㉢", "A B C", "Ⅰ Ⅱ Ⅲ"]);
assert.strictEqual(helpers.LABEL_SETS[0].items, null);
for (const set of helpers.LABEL_SETS.slice(1)) assert.strictEqual(set.items.length, 3, `${set.name} has 3 labels`);
assert.deepStrictEqual([helpers.LABEL_SETS[1].fontNames, helpers.LABEL_SETS[1].size], [["Batang"], 9]);
assert.deepStrictEqual([helpers.LABEL_SETS[2].fontNames, helpers.LABEL_SETS[2].size], [["GSMediumB1"], 8]);
assert.ok(helpers.LABEL_SETS[3].koPub && helpers.LABEL_SETS[3].size === 8 && helpers.LABEL_SETS[3].fontNames[0] === "KoPubWorld바탕체_Pro");

// 저장 형식·동작 요건
assert.ok(source.includes('"SpectrumGray/settings"'), "PREF_KEY must be set");
assert.ok(source.includes('if (p[0] !== "v5" || p.length !== 21) return;'), "settings are v5 with 21 fields (label gap, merge added)");
assert.ok(source.includes('addNumberField(linePanel, "선 합치기", "nm", mergeNm, 0.5, MERGE_RANGE[0], MERGE_RANGE[1])'), "merge distance is a dialog option");
assert.ok(source.includes('addNumberField(kindPanel, "기호 간격", "mm", labelGapMm, 0.5, LABEL_GAP_RANGE[0], LABEL_GAP_RANGE[1])'), "label gap is a dialog option");
assert.ok(source.includes('placeGlyph(label, left - labelGapMm * MM, (bandTop + bandBottom) / 2, "right", "center")'), "labels sit label-gap left of the band, vertically centred");
// 눈금: 세로선은 위(숫자 쪽)로, 양끝 숫자는 세로선 중심에, 파장(nm)은 한글/영문 서체 규칙
assert.ok(source.includes("bracket.setEntirePath([[xl, y + tick], [xl, y], [xr, y], [xr, y + tick]]);"), "scale ticks point up");
assert.ok(source.includes("var xl = left + GUIDE_WIDTH / 2, xr = right - GUIDE_WIDTH / 2;"), "scale ticks sit half a stroke inside the band edges");
assert.ok(source.includes("band.stroked = false;"), "bands drop the source rectangle's stroke");
assert.ok(source.includes("var textBottom = y + tick + 0.5 * MM;"), "numbers sit above the ticks");
assert.ok(source.includes('placeGlyph(addText(scaleGroup, leftValue, numberFont, TEXT_SIZE), xl, textBottom, "center", "bottom");'), "left value centred on the tick");
assert.ok(source.includes('placeGlyph(addText(scaleGroup, rightValue, numberFont, TEXT_SIZE), xr, textBottom, "center", "bottom");'), "right value centred on the tick");
assert.ok(source.includes('addKoEnText(scaleGroup, "파장(nm)")'), "axis title uses the ko/en font rule");
assert.ok(source.includes("chars[i].characterAttributes.baselineShift = 0.5;"), "Latin characters get the +0.5pt baseline shift like Text_koen.jsx");
// 파선 보조선: 0.3pt, 2pt 선·1pt 간격, 그룹 맨 뒤, 확인 때만 끝 정렬 액션
assert.ok(source.includes("var GUIDE_WIDTH = 0.3;") && source.includes("var GUIDE_DASH = [2, 1];"), "guide dash spec");
assert.ok(source.includes("guideGroup.zOrder(ZOrderMethod.SENDTOBACK);"), "guides go to the back so bands cover them");
assert.ok(source.includes("var xs = [left + GUIDE_WIDTH / 2, right - GUIDE_WIDTH / 2];"), "guides sit half a stroke inside the band edges, in line with the ticks");
assert.ok(/function addScale[\s\S]*?return y;\n    \}/.test(source), "guides start at the scale line");
assert.ok(source.includes('if (isFinal && typeof applyDashPatternToItems === "function")'), "dash alignment only at confirm and only when the helper loaded");
assert.ok(source.includes('/01_도형/Object_setdash_align_helper.jsxinc'), "dash helper is loaded like the tab helper");
assert.ok(source.includes("previewGroup = buildSpectrum(false);") && source.includes("var finalGroup = buildSpectrum(true);"), "preview skips the slow action");
assert.ok(/if \(result === 1\) \{[\s\S]*?rect\.remove\(\);[\s\S]*?saveSettings\(\);/.test(source), "confirm removes the source rectangle and saves");
assert.ok(source.includes("illu_last_script.txt"), "RepeatLast memo header must exist");
// 정지점 수가 바뀌면 그라데이션을 새로 만든다. 있는 정지점을 옮기면 "Ramp points cannot overlap" 오류
assert.ok(source.includes("if (gradient !== null && gradient.gradientStops.length !== stopCount) removeGradient();"), "gradient is rebuilt when the stop count changes");
assert.ok(source.includes("path.rotate(-stamped, false, false, true, false, Transformation.CENTER)"), "gradient angle is read back and reset");

// GRAY_KEYS·ELEMENTS는 updatePreview() 첫 호출보다 위에 있어야 한다 (var 호이스팅 → undefined)
assert.ok(source.indexOf("var GRAY_KEYS") < source.indexOf("updatePreview();"), "GRAY_KEYS must be declared before the first updatePreview() call");
assert.ok(source.indexOf("var ELEMENTS") < source.indexOf("applySavedSettings();"), "ELEMENTS must be declared before settings are restored");

// 순수 문법 검사 (#지시문 제외)
new Function(source.replace(/^#.*$/mg, ""));

console.log("check-spectrum-gray: ok");
