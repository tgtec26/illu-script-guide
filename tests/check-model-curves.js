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
const helpers = ["param", "flag", "curve", "dashedLine", "polyline", "stateChange", "hump", "specSegments", "fitCurve", "refineExtremum", "tangentAt", "fitSegment"];
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

// 16종. 기본값으로 만든 곡선은 모두 y가 [0, 1] 안에 있다
assert.strictEqual(lib.TYPES.length, 16, "16 curve types");
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

// 설정 문자열: v2(중학교 곡선 4종 추가) + 6필드 + 종류별 값, 탭 등록, 저장 키
assert.ok(source.includes('parts[0] !== "v2" || parts.length !== 6 + TYPES.length'), "settings string must be v2 with per-type values");
assert.ok(source.includes('var PREF_KEY = "ObjectModelCurves/settings"'), "own preference key");
assert.ok(wholeSource.includes("makeDashedGridEngine(), makeModelCurvesEngine()"), "engine registered after the dashed grid tab");
assert.ok(wholeSource.includes("Folder.temp + \"/illu_last_script.txt\""), "RepeatLast memo header present");

console.log("check-model-curves: ok");

// 가열 곡선: 수평 구간 두 개가 녹는점·끓는점에 있고, 오르는 구간은 기울기가 같으며, 모서리 점이다
{
  const [line, meltGuide, boilGuide] = build("가열·냉각 곡선", [30, 70, 20, 30], [false, true]);
  assert.ok(line.corners && !line.dashed && meltGuide.dashed && boilGuide.dashed);
  const pts = [line.segments[0][0]].concat(line.segments.map((s) => s[3]));
  assert.strictEqual(pts.length, 6);
  assert.ok(near(pts[1][1], 0.3) && near(pts[2][1], 0.3) && near(pts[2][0] - pts[1][0], 0.2), "melting plateau");
  assert.ok(near(pts[3][1], 0.7) && near(pts[4][1], 0.7) && near(pts[4][0] - pts[3][0], 0.3), "boiling plateau");
  const slope = (a, b) => (b[1] - a[1]) / (b[0] - a[0]);
  assert.ok(near(slope(pts[0], pts[1]), slope(pts[2], pts[3]), 1e-9) && near(slope(pts[2], pts[3]), slope(pts[4], pts[5]), 1e-9), "equal heating rate");
  assert.ok(near(pts[5][0], 1) && near(meltGuide.segments[0][3][0], pts[1][0]), "guide reaches plateau start");
  // 냉각은 좌우를 뒤집어 높은 온도에서 시작한다
  const cooling = build("가열·냉각 곡선", [30, 70, 20, 30], [true, true]);
  const c0 = cooling[0].segments[0][0];
  assert.ok(near(c0[0], 0) && c0[1] > 0.7, "cooling starts hot");
  assert.ok(near(cooling[1].segments[0][3][0], 1 - pts[2][0]), "cooling guide reaches plateau start");
  // 녹는점이 끓는점보다 높게 들어와도 순서를 지킨다
  const swapped = build("가열·냉각 곡선", [80, 40, 10, 10], [false, false])[0];
  assert.ok(swapped.segments[2][3][1] > swapped.segments[0][3][1], "boiling above melting");
}

// 열평형: 두 곡선이 높은·낮은 온도에서 시작해 같은 온도로 모인다
{
  const [hot, cold] = build("열평형", [80, 20, 40, 8], [false]);
  assert.ok(near(hot.fn(0), 0.8) && near(cold.fn(0), 0.2));
  assert.ok(near(hot.fn(1), 0.4, 0.01) && near(cold.fn(1), 0.4, 0.01));
  // 열평형 온도가 두 온도 밖이면 가까운 쪽으로 붙이고, 점선을 켜면 그 높이에 하나 더
  const clamped = build("열평형", [60, 30, 95, 8], [true]);
  assert.strictEqual(clamped.length, 3);
  assert.ok(near(clamped[2].segments[0][0][1], 0.6), "equilibrium clamped to the hot temperature");
}

// 비열: 켠 물질만, 위 끝에 닿으면 그 자리에서 멈춘다
{
  const lines = build("비열 비교", [10, 80, 50, 30], [true, false, true]);
  assert.strictEqual(lines.length, 2);
  assert.ok(near(lines[0].segments[0][3][1], 0.9) && near(lines[0].segments[0][3][0], 1));
  const steep = build("비열 비교", [50, 100, 50, 30], [true, false, false])[0];
  assert.ok(near(steep.segments[0][3][1], 1) && near(steep.segments[0][3][0], 0.5), "stops at the top");
}

// 샤를: 연장선이 왼쪽 아래(-273 ℃, 부피 0)에서 0 ℃ 점까지, 실선은 같은 기울기로 이어진다
{
  const [solid, dashed] = build("샤를 법칙", [40, 30], [true]);
  assert.ok(dashed.dashed && near(dashed.segments[0][0][0], 0) && near(dashed.segments[0][0][1], 0));
  assert.ok(near(solid.segments[0][0][0], 0.4) && near(solid.segments[0][0][1], 0.3));
  const end = solid.segments[0][3];
  assert.ok(near(end[1] / end[0], 0.3 / 0.4), "same line through the origin");
}
console.log("model curve middle-school checks passed");
