const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 모델 곡선 탭은 Object_GraphTools.jsx 안의 makeModelCurvesEngine에 들어 있다
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_GraphTools.jsx");
const wholeSource = fs.readFileSync(scriptPath, "utf8");
const engineStart = wholeSource.indexOf("function makeModelCurvesEngine(");
assert.ok(engineStart > 0, "model curves engine not found");
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

function extractTypes() {
  const start = source.indexOf("var TYPES = [");
  assert.ok(start >= 0, "TYPES table not found");
  const end = source.indexOf("\n            ];", start);
  assert.ok(end > start, "TYPES table end not found");
  return source.slice(start, end) + "\n];";
}

const SEGMENTS = 16;
const SAMPLES = 512;
const helpers = ["param", "flag", "curve", "dashedLine", "hump", "specSegments", "fitCurve", "refineExtremum", "tangentAt", "fitSegment"];
const lib = new Function(
  `var SEGMENTS = ${SEGMENTS}, SAMPLES = ${SAMPLES};\n` +
  helpers.map(extractFunction).join("\n") + "\n" + extractTypes() +
  "\nreturn { TYPES, specSegments, fitCurve, hump };"
)();

const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol);
const defaults = (type) => [type.params.map((p) => p.initial), type.flags.map((f) => f.initial)];
const byLabel = (prefix) => {
  const type = lib.TYPES.find((t) => t.label.indexOf(prefix) === 0);
  assert.ok(type, `type not found: ${prefix}`);
  return type;
};
const build = (prefix, params, flags) => {
  const type = byLabel(prefix);
  const [p, f] = defaults(type);
  return type.build(params || p, flags || f);
};

// 12종. 기본값으로 만든 곡선은 모두 y가 [0, 1] 안에 있다
assert.strictEqual(lib.TYPES.length, 12, "12 curve types");
for (const type of lib.TYPES) {
  assert.ok(type.params.length <= 4 && type.flags.length <= 3, `${type.label}: rows fit the dialog`);
  for (const p of type.params) assert.ok(p.min <= p.initial && p.initial <= p.max, `${type.label}: ${p.label} default in range`);
  const [p, f] = defaults(type);
  const specs = type.build(p, f);
  assert.ok(specs.length > 0, `${type.label}: builds at least one curve`);
  for (const spec of specs) {
    if (spec.fn) {
      for (let i = 0; i <= 200; i++) {
        const x = spec.from + (spec.to - spec.from) * i / 200;
        const y = spec.fn(x);
        assert.ok(isFinite(y) && y >= -1e-9 && y <= 1 + 1e-9, `${type.label}: y(${x}) = ${y} inside the box`);
      }
    } else {
      for (const seg of spec.segments) for (const pt of seg) assert.ok(pt[1] >= -1e-9 && pt[1] <= 1 + 1e-9, `${type.label}: control point inside the box`);
    }
  }
}

// 정규화: 봉우리·점근선이 높이 %와 맞는다
const normal = build("정규분포", [40, 10, 70])[0];
assert.ok(near(normal.fn(0.4), 0.7), "normal peak at centre equals height");
assert.ok(near(normal.fn(0.5), 0.7 * Math.exp(-0.5)), "normal one sigma away");
const jCurve = build("이론적 생장", [4, 100])[0];
assert.ok(near(jCurve.fn(0), 0) && near(jCurve.fn(1), 1), "J curve spans 0 to height");
const logistic = build("실제 생장", [80, 10, 50], [true]);
assert.strictEqual(logistic.length, 2, "logistic draws the K line when the flag is on");
assert.ok(near(logistic[0].fn(0.5), 0.4), "logistic is K/2 at the inflection");
assert.ok(logistic[1].dashed && near(logistic[1].segments[0][0][1], 0.8), "K line is dashed at K");
assert.strictEqual(build("실제 생장", [80, 10, 50], [false]).length, 1, "logistic without the K line");
const hw = build("하디-바인베르크");
assert.strictEqual(hw.length, 3, "Hardy-Weinberg draws AA, Aa, aa");
for (const x of [0, 0.3, 0.5, 0.9, 1]) assert.ok(near(hw[0].fn(x) + hw[1].fn(x) + hw[2].fn(x), 1), "p² + 2pq + q² = 1");
assert.ok(near(hw[1].fn(0.5), 0.5), "2pq peaks at 0.5");
assert.strictEqual(build("하디-바인베르크", [], [false, true, false]).length, 1, "Hardy-Weinberg flags pick curves");
assert.strictEqual(build("하디-바인베르크", [], [false, false, false]).length, 0, "no curve when every flag is off");
const mm = build("효소 반응 속도", [90, 20], [true]);
assert.ok(near(mm[0].fn(0.2), 0.45), "Michaelis-Menten is Vmax/2 at Km");
assert.ok(mm[1].dashed && near(mm[1].segments[0][3][1], 0.9), "Vmax line at Vmax");
const hill = build("산소 해리", [26, 2.7, 100])[0];
assert.ok(near(hill.fn(0.26), 0.5), "Hill curve is half saturated at P50");
assert.ok(hill.fn(0.9) > 0.9, "Hill curve nearly saturated at the right edge");
const survival = build("생존 곡선");
assert.strictEqual(survival.length, 3, "three survivorship types");
assert.ok(survival[0].fn(0.5) > 0.9 && near(survival[1].fn(0.5), 0.5) && survival[2].fn(0.5) < 0.1, "type I stays high, II linear, III drops fast");
const decay = build("지수 감소", [25, 100])[0];
assert.ok(near(decay.fn(0), 1) && near(decay.fn(0.25), 0.5) && near(decay.fn(0.5), 0.25), "half-life halves the height each time");
const maxwell = build("맥스웰-볼츠만", [30, 100])[0];
assert.ok(near(maxwell.fn(0.3), 1) && near(maxwell.fn(0), 0), "Maxwell-Boltzmann peaks at the peak position");
const inverse = build("반비례", [20, 100])[0];
assert.ok(near(inverse.from, 0.2) && near(inverse.fn(0.2), 1) && near(inverse.fn(1), 0.2), "inverse starts at full height and ends at start/1");
const power = build("거듭제곱", [2, 100])[0];
assert.ok(near(power.fn(0.5), 0.25) && near(power.fn(1), 1), "power curve y = x^n");

// 활성화 에너지: 평탄–봉우리–평탄, 촉매 곡선은 봉우리만 낮다
const reaction = build("활성화 에너지", [40, 20, 50, 25], [true]);
assert.strictEqual(reaction.length, 2, "reaction diagram draws the catalysed curve too");
const main = reaction[0].segments;
assert.strictEqual(main.length, 4, "plateau, rise, fall, plateau");
assert.deepStrictEqual(main[0][0], [0, 0.4], "starts at the reactant level");
assert.ok(near(main[1][3][0], 0.5) && near(main[1][3][1], 0.9), "peak is reactant + Ea at the middle");
assert.deepStrictEqual(main[3][3], [1, 0.2], "ends at the product level");
for (const seg of main) {
  assert.ok(near(seg[1][1], seg[0][1]) && near(seg[2][1], seg[3][1]), "handles are horizontal");
}
assert.ok(near(reaction[1].segments[1][3][1], 0.65), "catalysed peak is reactant + catalysed Ea");
assert.strictEqual(build("활성화 에너지", [40, 20, 50, 25], [false]).length, 1, "catalysed curve can be turned off");

// 베지어 맞춤: 극값에 고정점(수평 접선), 조각 수는 SEGMENTS 근처, 곡선 위 오차는 높이의 0.2% 아래
const width = 100, height = 75;
function bezierAt(seg, t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * seg[0][k] + 3 * u * u * t * seg[1][k] + 3 * u * t * t * seg[2][k] + t * t * t * seg[3][k]);
}
function maxError(spec, segments) {
  let worst = 0;
  for (const seg of segments) {
    for (let i = 0; i <= 20; i++) {
      const point = bezierAt(seg, i / 20);
      const expected = spec.fn(point[0] / width) * height;
      worst = Math.max(worst, Math.abs(point[1] - expected));
    }
  }
  return worst;
}
const normalSpec = build("정규분포", [50, 15, 100])[0];
const normalSegments = lib.specSegments(normalSpec, width, height);
assert.ok(normalSegments.length >= SEGMENTS - 2 && normalSegments.length <= SEGMENTS + 3, `segment count near ${SEGMENTS}: ${normalSegments.length}`);
const peakSegment = normalSegments.find((seg) => near(seg[0][0], 50, 1e-6));
assert.ok(peakSegment, "an anchor sits exactly on the peak");
assert.ok(near(peakSegment[1][1], peakSegment[0][1], 1e-6), "peak anchor has a horizontal handle");
assert.ok(maxError(normalSpec, normalSegments) < height * 0.002, "normal curve fit within 0.2% of the height");
for (let i = 1; i < normalSegments.length; i++) {
  assert.deepStrictEqual(normalSegments[i][0], normalSegments[i - 1][3], "segments are chained");
}

const narrowSpec = build("정규분포", [30, 5, 100])[0];
assert.ok(maxError(narrowSpec, lib.specSegments(narrowSpec, width, height)) < height * 0.005, "narrow peak fit within 0.5%");
const hwSpecs = build("하디-바인베르크");
assert.ok(maxError(hwSpecs[1], lib.specSegments(hwSpecs[1], width, height)) < 1e-6, "2pq is a parabola and fits exactly");
const lineSpec = build("생존 곡선")[1];
for (const seg of lib.specSegments(lineSpec, width, height)) {
  const slope = (seg[3][1] - seg[0][1]) / (seg[3][0] - seg[0][0]);
  for (const k of [1, 2]) assert.ok(near(seg[k][1] - seg[0][1], slope * (seg[k][0] - seg[0][0]), 1e-6), "straight line keeps collinear handles");
}
const inverseSpec = build("반비례", [20, 100])[0];
const inverseSegments = lib.specSegments(inverseSpec, width, height);
assert.ok(near(inverseSegments[0][0][0], 20) && near(inverseSegments[0][0][1], 75), "inverse curve starts at (start, height)");
assert.ok(maxError(inverseSpec, inverseSegments) < height * 0.002, "inverse fit within 0.2%");
const steepSpec = build("거듭제곱", [0.2, 100])[0];
const steepSegments = lib.specSegments(steepSpec, width, height);
assert.ok(near(steepSegments[0][0][0], 0) && near(steepSegments[0][0][1], 0), "power curve starts at the origin");
for (const seg of steepSegments) for (const pt of seg) assert.ok(isFinite(pt[0]) && isFinite(pt[1]), "vertical tangent at 0 stays finite");
const humpSegments = lib.specSegments(lib.hump(0.4, 0.2, 0.5), width, height);
assert.deepStrictEqual(humpSegments[1][3], [50, 67.5], "explicit segments are scaled to the box");

// 설정 문자열: v1 + 6필드 + 종류별 값, 탭 등록, 저장 키
assert.ok(source.includes('parts[0] !== "v1" || parts.length !== 6 + TYPES.length'), "settings string must be v1 with per-type values");
assert.ok(source.includes('var PREF_KEY = "ObjectModelCurves/settings"'), "own preference key");
assert.ok(wholeSource.includes("makeDashedGridEngine(), makeModelCurvesEngine()"), "engine registered after the dashed grid tab");
assert.ok(wholeSource.includes("Folder.temp + \"/illu_last_script.txt\""), "RepeatLast memo header present");

console.log("check-model-curves: ok");
