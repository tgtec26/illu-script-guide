const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 태양 스펙트럼 탭은 Object_GraphTools.jsx 안의 makeSolarSpectrumEngine에 들어 있다 (마지막 엔진)
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_GraphTools.jsx");
const wholeSource = fs.readFileSync(scriptPath, "utf8");
const engineStart = wholeSource.indexOf("function makeSolarSpectrumEngine(");
assert.ok(engineStart > 0, "solar spectrum engine not found");
const source = wholeSource.slice(engineStart);

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

function extractVar(name) {
  const match = source.match(new RegExp(`var ${name} = ([^;]*);`));
  assert.ok(match, `missing constant: ${name}`);
  return `var ${name} = ${match[1]};`;
}

function extractArray(name) {
  const start = source.indexOf(`var ${name} = [`);
  assert.ok(start >= 0, `missing data: ${name}`);
  return source.slice(start, source.indexOf("];", start) + 2);
}

const constants = ["LAMBDA_MIN", "LAMBDA_STEP", "NOMINAL_BANDS", "SHOULDER_SEARCH_NM", "MIN_BAND_DEPTH", "UV_END_NM"];
const data = ["ET_DATA", "GROUND_DATA"];
const names = ["indexOfNm", "gaussianSmooth", "transmission", "findBands", "uvBand", "simplifyIndices",
  "smoothAnchors", "distance", "copyAnchor", "subPath", "reversePath", "joinParts"];
const lib = new Function(`${constants.map(extractVar).join("\n")}\n${data.map(extractArray).join("\n")}\n` +
  `${names.map(extractFunction).join("\n")}\nreturn {${[...constants, ...data, ...names].join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 데이터: 200~4000 nm 5 nm 간격, 대기 밖 봉우리는 가시광선(475 nm)에, 지표면은 어디서도 대기 밖을 넘지 않는다
assert.strictEqual(lib.ET_DATA.length, 761);
assert.strictEqual(lib.GROUND_DATA.length, 761);
const peakIndex = lib.ET_DATA.indexOf(Math.max(...lib.ET_DATA));
assert.strictEqual(lib.LAMBDA_MIN + peakIndex * lib.LAMBDA_STEP, 475, "extraterrestrial peak sits at 475 nm");
for (let i = 0; i < 761; i++) assert.ok(lib.GROUND_DATA[i] <= lib.ET_DATA[i] + 1, `ground never exceeds extraterrestrial (${i})`);
assert.strictEqual(lib.GROUND_DATA[lib.indexOfNm(280, 761)], 0, "ozone cuts everything below 280 nm");

// 평활: σ 0은 원본 그대로, 상수열은 상수열 그대로, 큰 σ는 뾰족한 값을 낮춘다
assert.deepStrictEqual(lib.gaussianSmooth([1, 5, 1], 0), [1, 5, 1]);
for (const value of lib.gaussianSmooth([3, 3, 3, 3, 3], 20)) near(value, 3, 1e-9, "constant stays constant");
const spike = lib.gaussianSmooth([0, 0, 0, 10, 0, 0, 0], 5);
assert.ok(spike[3] < 10 && spike[2] > 0 && spike[3] > spike[2], "spike spreads to neighbours");

// 흡수띠: 후보 구간 근처에서만 찾고, 위 변(env)은 지표면 값 이상이며 양끝에서는 지표면과 만난다
const count = lib.indexOfNm(3000, 761) + 1;
const et = lib.gaussianSmooth(lib.ET_DATA, 15);
const ground = lib.gaussianSmooth(lib.GROUND_DATA, 15);
const bands = lib.findBands(ground, et, count);
assert.ok(bands.length >= 6, `σ=15 keeps the main water/CO₂ bands (got ${bands.length})`);
for (const band of bands) {
  const fromNm = lib.LAMBDA_MIN + band.ia * lib.LAMBDA_STEP;
  const toNm = lib.LAMBDA_MIN + band.ib * lib.LAMBDA_STEP;
  assert.ok(lib.NOMINAL_BANDS.some(([a, b]) => Math.abs(fromNm - a) <= lib.SHOULDER_SEARCH_NM && (Math.abs(toNm - b) <= lib.SHOULDER_SEARCH_NM || band.ib === count - 1)),
    `band ${fromNm}-${toNm} stays near a nominal window`);
  assert.strictEqual(band.env.length, band.ib - band.ia + 1);
  near(band.env[0], ground[band.ia], 1e-6, "envelope meets the ground curve at the left shoulder");
  near(band.env[band.env.length - 1], ground[band.ib], 1e-6, "envelope meets the ground curve at the right shoulder");
  for (let k = 0; k < band.env.length; k++) assert.ok(band.env[k] >= ground[band.ia + k] - 1e-9, "envelope never dips under the ground curve");
}
const strongBand = bands.find((band) => lib.LAMBDA_MIN + band.ia * lib.LAMBDA_STEP >= 1200 && lib.LAMBDA_MIN + band.ib * lib.LAMBDA_STEP <= 1600);
assert.ok(strongBand, "1.38 µm water band is found");
assert.ok(lib.findBands(lib.gaussianSmooth(lib.GROUND_DATA, 60), lib.gaussianSmooth(lib.ET_DATA, 60), count).length < bands.length,
  "heavy smoothing drops the shallow bands");
assert.strictEqual(lib.findBands(ground, et, lib.indexOfNm(600, 761) + 1).length, 0, "no bands when the plot ends before 0.68 µm");

// 자외선 영역: 끝 인덱스를 주면 거기서 끝나고, 주지 않으면 투과율 극대(380~460 nm)에서 끝난다
const uvFixed = lib.uvBand(ground, et, count, lib.indexOfNm(400, count));
assert.strictEqual(uvFixed.ia, 0);
assert.strictEqual(uvFixed.ib, lib.indexOfNm(400, count));
assert.strictEqual(uvFixed.env.length, uvFixed.ib + 1);
const uvAuto = lib.uvBand(ground, et, count, -1);
const autoNm = lib.LAMBDA_MIN + uvAuto.ib * lib.LAMBDA_STEP;
assert.ok(autoNm >= 380 && autoNm <= 460, `auto UV end at ${autoNm} nm`);
near(uvAuto.env[uvAuto.ib], ground[uvAuto.ib], 1e-6, "UV envelope meets the ground curve at its end");
assert.ok(uvAuto.env[lib.indexOfNm(320, count)] > ground[lib.indexOfNm(320, count)] + 10, "UV envelope stands above the ozone-cut ground curve");

// 고정점 간소화: 양끝과 forced 인덱스는 항상 남고, 직선은 양끝만 남으며, 허용 오차 밖의 꺾임은 남는다
const straight = [];
for (let i = 0; i <= 20; i++) straight.push([i, 2 * i]);
assert.deepStrictEqual(lib.simplifyIndices(straight, 0.01, []), [0, 20]);
assert.deepStrictEqual(lib.simplifyIndices(straight, 0.01, [7, 3, 7]), [0, 3, 7, 20], "forced indices survive (duplicates and order do not matter)");
const bent = straight.map(([x]) => [x, x === 10 ? 5 : 0]);
assert.deepStrictEqual(lib.simplifyIndices(bent, 4.5, []), [0, 10, 20]);
assert.deepStrictEqual(lib.simplifyIndices(bent, 6, []), [0, 20], "a bend under the tolerance is dropped");

// 핸들: 양끝은 고정점에 붙고, 가운데 점은 이웃을 잇는 방향으로 양쪽 핸들이 반대편에 놓인다
const anchors = lib.smoothAnchors([[0, 0], [10, 10], [20, 0]], [0, 1, 2]);
assert.deepStrictEqual(anchors[0].l, [0, 0]);
assert.deepStrictEqual(anchors[0].r, [0, 0]);
assert.deepStrictEqual(anchors[2].l, [20, 0]);
near(anchors[1].l[0], 10 - 20 / 3 / 2, 1e-9, "left handle x");
near(anchors[1].l[1], 10, 1e-9, "left handle stays level (tangent is horizontal at the top)");
near(anchors[1].r[0], 10 + 20 / 3 / 2, 1e-9, "right handle x");
assert.strictEqual(anchors[1].idx, 1);

// 조각 잇기: 맞닿은 점은 하나로 합쳐지고, 떨어진 점 사이는 모서리(핸들이 고정점에 붙음)로 닫힌다
const bottom = lib.smoothAnchors([[0, 0], [10, -5], [20, 0]], [0, 1, 2]);
const topTouching = lib.reversePath(lib.smoothAnchors([[0, 0], [10, 5], [20, 0]], [0, 1, 2]));
const merged = lib.joinParts([bottom, topTouching]);
assert.strictEqual(merged.length, 4, "shared end points collapse: 3 + 3 - 2");
assert.deepStrictEqual(merged.map((a) => a.a), [[0, 0], [10, -5], [20, 0], [10, 5]]);
const topApart = lib.reversePath(lib.smoothAnchors([[0, 2], [10, 7], [20, 2]], [0, 1, 2]));
const boxed = lib.joinParts([bottom, topApart]);
assert.strictEqual(boxed.length, 6, "separate end points keep all anchors");
assert.deepStrictEqual(boxed[2].r, boxed[2].a, "corner going up the right edge");
assert.deepStrictEqual(boxed[3].l, boxed[3].a);
assert.deepStrictEqual(boxed[5].r, boxed[5].a, "corner closing down the left edge");
assert.deepStrictEqual(boxed[0].l, boxed[0].a);
// 뒤집기: 순서가 뒤집히고 왼쪽·오른쪽 핸들이 바뀐다
const reversed = lib.reversePath(bottom);
assert.deepStrictEqual(reversed[0].a, [20, 0]);
assert.deepStrictEqual(reversed[1].l, bottom[1].r);
assert.deepStrictEqual(reversed[1].r, bottom[1].l);
// 부분 경로: 데이터 인덱스 범위로 자른다
assert.deepStrictEqual(lib.subPath(bottom, 1, 2).map((a) => a.idx), [1, 2]);

// 저장 형식: v1 태그와 15개 필드, 확인(commit) 때만 저장. 사각형이 크기를 정했을 때는 기본 크기를 그대로 저장한다
assert.ok(source.includes('var PREF_KEY = "ObjectSolarSpectrum/settings";'));
assert.ok(source.includes('if (p[0] !== "v1" || p.length !== 15) return;'));
assert.strictEqual((source.match(/saveSettings\(\);/g) || []).length, 1, "saveSettings is called from one place");
assert.ok(/api\.commit = function\(\) \{[\s\S]*?saveSettings\(\);[\s\S]*?return true;/.test(source), "settings saved in commit only");
assert.ok(source.includes('rect !== null ? defaultWidthMm : widthMm'));
// 탭 호스트: 사각형이 있어야 열리는 탭이다 (화면 중앙 모드는 없앴다). 호스트는 저장 탭이 맞지 않으면 앞에서부터 맞는 탭을 연다
assert.ok(source.includes('label: "복사", error: null, addRows: addRows'));
assert.ok(source.includes('if (rect === null) return "가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요'), "rectangle required");
assert.ok(wholeSource.includes("makeModelCurvesEngine(), makePieChartEngine(), makeSolarSpectrumEngine()]"), "engine registered last");
assert.ok(!wholeSource.includes("standalone"), "no standalone tabs remain");
assert.ok(wholeSource.includes("if (!engines[engineIndex].error) tabIndex = engineIndex;"), "host opens the first fitting tab");
assert.ok(wholeSource.includes('alert("먼저 도형을 그려 선택한 뒤 실행해주세요.'), "no-selection guidance");
// 사각형: 있으면 그래프 영역이 되고 확인 때 지워진다. 크기 칸은 잠긴다
assert.ok(source.includes("if (rect !== null) rect.remove();"));
assert.ok(source.includes("widthField.row.enabled = false;"));
assert.ok(source.includes("if (rect === null && (!inRange(width, WIDTH_RANGE)"), "rectangle size is not range-checked");
// 미리보기: 위치는 그룹만 옮기고, 화살촉은 확인 때만 액션으로
assert.ok(source.includes("previewGroup.translate(isX ? delta : 0, isX ? 0 : delta)"));
assert.ok(source.includes("if (isFinal) applyArrowheads([axis].concat(rangeLines), strokePt);"));

// 순수 문법 검사 (#지시문 제외)
new Function(wholeSource.replace(/^#.*$/mg, ""));

console.log("check-solar-spectrum: ok");
