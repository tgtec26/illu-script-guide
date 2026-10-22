const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "06_도형", "3D.jsx"), "utf8");

// 공통 기하 구간 + 입체 도형 엔진 본문(마지막 return api; 앞까지)을 상태 변수와 한 스코프에 펼친다
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
    var rotY = 45, rotX = 35.3, rotZ = 0, perspectiveOn = false, perspectiveMm = 300, angleR = 131, angleL = 109, depthPercent = 100;
    var hiddenMode = 1, fillMode = 2, brightness = 70, contrast = 40, lightAzimuth = -35, lightElevation = 50;
    var engine = { usesViewAngles: false }, perspectiveActive = false, originX = 0, originY = 0;
    var viewMatrix = null, eyeZ = 0, strokeColor = null, documentIsCmyk = true, kColorCache = {};
    var doc = {};
  `;
  return new Function("app", "PointType", "CMYKColor", "RGBColor", "DocumentColorSpace",
    prelude + body + `
    ${keys.map((k) => `${k} = ${JSON.stringify(state[k])};`).join("\n")}
    return { buildModel, collectFills, projectModel, toModel, SHAPES };`
  )({}, { SMOOTH: "smooth", CORNER: "corner" }, function () {}, function () {}, { CMYK: "CMYK" });
}

const R = 20 * 2.834645669 / 2;
const AXIS_NAMES = ["x", "y", "z"];

// 시선 직선 위 남은 입체의 가장 앞 점: 구면이면 "sphere", 자른 면이면 그 법선 축, 비면 null.
// 뷰 좌표(화면 x, y, 깊이 z)에서 직선 = (vx, vy, z). 잘라낸 영역 ∩ 직선 = 축마다 반공간의 교집합 (lo, hi)
function firstHit(api, eighth, vx, vy) {
  const h2 = R * R - vx * vx - vy * vy;
  if (h2 <= 0) return null;
  const h = Math.sqrt(h2);
  const p0 = api.toModel([vx, vy, 0]);
  const d = api.toModel([0, 0, 1]);
  let lo = -Infinity;
  let hi = Infinity;
  let loAxis = -1;
  for (const a of eighth ? [0, 1, 2] : [0, 2]) {
    if (Math.abs(d[a]) < 1e-12) {
      if (p0[a] <= 0) return "sphere";
    } else if (d[a] > 0) {
      if (-p0[a] / d[a] > lo) { lo = -p0[a] / d[a]; loAxis = a; }
    } else {
      hi = Math.min(hi, -p0[a] / d[a]);
    }
  }
  if (!(lo < h && h < hi)) return "sphere";
  return lo > -h ? AXIS_NAMES[loAxis] : null;
}

// 채울 면의 윤곽을 화면 다각형으로 (호는 잘게 나눈다)
function outline(api, fill) {
  const poly = [];
  for (const seg of fill.segments) {
    if (seg.kind === "line") {
      poly.push(api.projectModel(seg.a), api.projectModel(seg.b));
    } else {
      for (let i = 0; i <= 64; i++) poly.push(api.projectModel(seg.curve.pointAt(seg.t0 + (seg.t1 - seg.t0) * i / 64)));
    }
  }
  return poly;
}

function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i][1] > y) !== (poly[j][1] > y) && x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
  }
  return c;
}

// 화면 점마다 맨 위에 칠한 면이 시선이 처음 만나는 면과 같다 (사용자 화면: 구 1/8, 가로 −60.9°, 기울기 54.5° 포함)
let checked = 0;
for (const shape of ["sphere4", "sphere8"]) {
  for (const rotY of [-150, -90, -60.9, -45, 0, 30, 45, 90, 135, 180]) {
    for (const rotX of [-60, -20, 0, 15, 35.3, 54.5, 80]) {
      const probe = loadEngine({});
      const shapeIndex = probe.SHAPES.findIndex((s) => s.id === shape);
      const api = loadEngine({ shapeIndex, widthMm: 20, rotY, rotX, rotZ: 0 });
      const model = api.buildModel();
      const fills = api.collectFills(model).map((f) => ({
        name: f.normal ? AXIS_NAMES[f.normal.indexOf(1)] : "sphere",
        k: f.k,
        poly: outline(api, f),
      }));
      assert.ok(fills.some((f) => f.name === "sphere"), `${shape} ${rotY}/${rotX}: sphere surface filled`);
      assert.ok(fills.every((f) => Number.isFinite(f.k) && f.k >= 0 && f.k <= 100), `${shape} ${rotY}/${rotX}: K in range`);
      const eighth = shape === "sphere8";
      const e = 0.02 * R;
      for (let gx = -1; gx <= 1; gx += 0.05) {
        for (let gy = -1; gy <= 1; gy += 0.05) {
          const x = gx * R;
          const y = gy * R;
          const truth = firstHit(api, eighth, x, y);
          // 경계 근처(이웃 점과 정답이 다른 곳)는 보지 않는다
          if ([[e, 0], [-e, 0], [0, e], [0, -e]].some(([dx, dy]) => firstHit(api, eighth, x + dx, y + dy) !== truth)) continue;
          let top = null;
          for (const f of fills) if (inside(f.poly, x, y)) top = f.name;
          assert.strictEqual(top, truth, `${shape} rotY ${rotY} rotX ${rotX} at (${gx.toFixed(2)}, ${gy.toFixed(2)})`);
          checked++;
        }
      }
    }
  }
}
assert.ok(checked > 100000, `checked ${checked}`);

console.log(`cut sphere fill checks passed (${checked} points)`);
