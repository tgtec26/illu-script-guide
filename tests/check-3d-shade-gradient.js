const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 3D.jsx 입체 도형 탭의 곡면 음영 그라데이션: 곡면 표본 → 선형·원형 그라데이션 맞춤.
// 웹 판(sci-illu-web solid3d.js + shade-gradient.js)이 형제 폴더에 있으면 같은 그라데이션인지 비교한다
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "06_도형", "3D.jsx"), "utf8");

// IIFE 맨 위에 있는 그라데이션 상수는 원본 값을 그대로 읽는다
const constants = [...source.matchAll(/var ((?:GRADIENT|SURFACE_CELLS)_\w+) = ([\d.]+);/g)].map((m) => `var ${m[1]} = ${m[2]};`).join("\n");
assert.ok(constants.includes("GRADIENT_FIT_K") && constants.includes("SURFACE_CELLS_S"), "gradient constants not found");

// 공통 기하 구간 + 입체 도형 엔진 본문(마지막 return api; 앞까지)을 상태 변수와 한 스코프에 펼친다 (check-cut-sphere-fills.js와 같다)
function loadEngine(state) {
  const sharedStart = source.indexOf("// ==== 공통 기하");
  const sharedEnd = source.indexOf("// ==== 입체 도형 엔진");
  const engineStart = source.indexOf("function makeSolidEngine(variant) {");
  const engineEnd = source.indexOf("// ==== 돌출 엔진", engineStart);
  assert.ok(sharedStart > 0 && sharedEnd > sharedStart && engineStart > sharedEnd && engineEnd > engineStart, "engine section not found");
  let body = source.slice(engineStart + "function makeSolidEngine(variant) {".length, engineEnd);
  body = source.slice(sharedStart, sharedEnd) + body.slice(0, body.lastIndexOf("return api;"));
  const keys = Object.keys(state);
  const prelude = `
    var variant = "rotation";
    var MM_TO_PT = 2.834645669, LINE_WIDTH_PT = 0.3, HIDDEN_DASH = [2, 1];
    var MAX_ARC_SPAN = Math.PI / 4, FACING_EPSILON = 1e-9;
    var FILL_NONE = 0, FILL_FLAT = 1, FILL_LIT = 2, HIDDEN_NONE = 0, HIDDEN_DASHED = 1, HIDDEN_SOLID = 2;
    ${constants}
    var rotY = 45, rotX = 35.3, rotZ = 0, perspectiveOn = false, perspectiveMm = 300, angleR = 131, angleL = 109, depthPercent = 100;
    var hiddenMode = 1, fillMode = 2, brightness = 70, contrast = 40, lightAzimuth = -35, lightElevation = 50;
    var fillHue = 210, fillSaturation = 0;
    var engine = { usesViewAngles: false }, perspectiveActive = false, originX = 0, originY = 0;
    var viewMatrix = null, eyeZ = 0, strokeColor = null, documentIsCmyk = true, kColorCache = {};
    var doc = {};
  `;
  return new Function("app", "PointType", "CMYKColor", "RGBColor", "DocumentColorSpace",
    prelude + body + `
    ${keys.map((k) => `${k} = ${JSON.stringify(state[k])};`).join("\n")}
    return { buildModel, beginView, collectFills, fitShadeGradient, reduceShadeStops, SHAPES };`
  )({}, { SMOOTH: "smooth", CORNER: "corner" }, function () {}, function () {}, { CMYK: "CMYK" });
}

const shapeIndexOf = (id) => loadEngine({}).SHAPES.findIndex((s) => s.id === id);
// 곡면 칠마다 맞춘 그라데이션 (표본이 없는 평면 칠은 빼고, 맞지 않은 곡면은 null)
function scriptGradients(shape, rotY, rotX) {
  const api = loadEngine({ shapeIndex: shapeIndexOf(shape), rotY, rotX, rotZ: 0 });
  const model = api.buildModel();
  api.beginView(model);
  return api.collectFills(model).filter((f) => f.samples).map((f) => api.fitShadeGradient(f.samples));
}

// 원기둥 옆면: 선형, 축(화면 세로)에 수직. 일러 좌표는 y가 위
{
  const [grad] = scriptGradients("cylinder", 35, 25);
  assert.strictEqual(grad.type, "linear");
  const dx = grad.end[0] - grad.start[0], dy = grad.end[1] - grad.start[1];
  assert.ok(Math.abs(dy) < 0.02 * Math.abs(dx), `cylinder direction ${dx} ${dy}`);
  assert.ok(grad.stops.length >= 3 && grad.stops[0][0] === 0 && grad.stops[grad.stops.length - 1][0] === 1, "stops 0 → 1");
}
// 잘라낸 구: 원형, 밝은 곳은 광원 쪽(왼쪽 위)
for (const shape of ["sphere4", "sphere8"]) {
  const grads = scriptGradients(shape, 35, 25);
  assert.strictEqual(grads.length, 1, shape);
  assert.strictEqual(grads[0].type, "radial", shape);
  assert.ok(grads[0].start[0] < 0 && grads[0].start[1] > 0 && grads[0].radius > 0, `${shape} centre ${grads[0].start}`);
}
// 빨대: 바깥 옆면 + 들여다보이는 안쪽 벽
assert.strictEqual(scriptGradients("tube", 35, 40).filter(Boolean).length, 2, "tube outer + inner wall");
// 평면 입체는 곡면 표본이 없다
for (const shape of ["box", "prism", "pyramid", "cutcube"]) assert.strictEqual(scriptGradients(shape, 35, 25).length, 0, shape);
// 정지점 줄이기: 직선 위 점은 빠지고 꺾인 점은 남는다
{
  const api = loadEngine({});
  assert.deepStrictEqual(api.reduceShadeStops([[0, 10], [0.5, 20], [1, 30]]), [[0, 10], [1, 30]]);
  assert.deepStrictEqual(api.reduceShadeStops([[0, 10], [0.5, 30], [1, 10]]), [[0, 10], [0.5, 30], [1, 10]]);
}

// 웹 판과 비교: 그라데이션 종류와 정지점 K(위치마다 보간)가 같아야 한다. 웹은 px·원점 가운데, 일러는 pt라
// 좌표는 비교하지 않는다(맞춤 계산은 크기·위치에 무관하다)
const webDir = path.resolve(root, "..", "sci-illu-web", "src", "generators");
const done = (note) => console.log(`3d shade gradient checks passed${note}`);
if (fs.existsSync(path.join(webDir, "shade-gradient.js"))) {
  Promise.all([import(path.join(webDir, "solid3d.js")), import(path.join(webDir, "solid-view.js"))]).then(([web, view]) => {
    const kAt = (stops, o) => {
      let j = 1;
      while (j < stops.length - 1 && stops[j][0] < o) j++;
      const [a, b] = [stops[j - 1], stops[j]];
      return b[0] - a[0] < 1e-12 ? b[1] : a[1] + (b[1] - a[1]) * (o - a[0]) / (b[0] - a[0]);
    };
    // 웹 정지점 [위치, 색, …] → [[위치, K]…] (채도 0이면 색 = K 회색)
    const greyK = new Map(Array.from({ length: 101 }, (_, k) => [view.kToGrey(k), k]));
    let compared = 0;
    for (const shape of ["cylinder", "cone", "conefrustum", "tube", "sphere4", "sphere8"]) {
      for (const [rotY, rotX] of [[35, 25], [120, -15], [-60, 50], [45, 35.3]]) {
        const mine = scriptGradients(shape, rotY, rotX).filter(Boolean);
        const theirs = web.generateSolid3D({ ...web.SOLID3D_DEFAULTS, shape, rotY, rotX, rotZ: 0 }).fills.filter((f) => f.gradient).map((f) => f.gradient);
        assert.strictEqual(mine.length, theirs.length, `${shape} ${rotY}/${rotX}: gradient count`);
        mine.forEach((g, i) => {
          const w = theirs[i];
          assert.strictEqual(g.type, w.type, `${shape} ${rotY}/${rotX}: type`);
          const webStops = [];
          for (let s = 0; s < w.stops.length; s += 2) webStops.push([w.stops[s], greyK.get(w.stops[s + 1])]);
          for (let o = 0; o <= 1.0001; o += 0.05) {
            const gap = Math.abs(kAt(g.stops, o) - kAt(webStops, o));
            assert.ok(gap <= 1.5, `${shape} ${rotY}/${rotX} at ${o.toFixed(2)}: K ${kAt(g.stops, o)} vs web ${kAt(webStops, o)}`);
          }
          compared++;
        });
      }
    }
    assert.ok(compared >= 20, `compared ${compared}`);
    done(` (${compared} gradients match the web)`);
  }).catch((error) => { console.error(error); process.exit(1); });
} else {
  done(" (web sibling not found, parity skipped)");
}
