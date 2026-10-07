const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_MagneticField.jsx"), "utf8");

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

const names = ["fieldAt", "traceLine", "fieldLines", "coilInsideLines", "wireRadii", "magnetHalfPoints", "spreadFraction", "pairFieldLines", "smoothPoints", "pointAlongCurve", "fieldArrowFractions", "clipFieldTrace"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 막대자석: 선은 모두 막대 밖, 좌우 대칭 쌍이 있고 NaN 없음
const L = 113, T = 28;
const lines = lib.fieldLines(L, 0.8, 10, 2, [L / 2, T / 2], true);
assert.ok(lines.length >= 6, `enough lines: ${lines.length}`);
for (const line of lines) {
  for (const p of line) {
    assert.ok(isFinite(p[0]) && isFinite(p[1]), "finite");
    assert.ok(Math.abs(p[0]) >= L / 2 - 1e-6 || Math.abs(p[1]) >= T / 2 - 1e-6, "outside the magnet");
  }
}
// N극(왼쪽)에서 나온 선은 오른쪽(S)으로 간다: 위쪽 고리의 첫 점은 왼쪽, 끝 점은 오른쪽
const loop = lines.find((l) => l[0][1] > 0 && Math.abs(l[l.length - 1][0]) < L / 2 + 1);
assert.ok(loop && loop[0][0] < 0 && loop[loop.length - 1][0] > 0, "N → S");
// 자기장은 N극에서 나가는 방향
const f = lib.fieldAt([-L, 0], [{x: -40, y: 0, q: 1}, {x: 40, y: 0, q: -1}]);
assert.ok(f[0] < 0, "points away from N on the far side");
// 코일 안쪽 선은 S → N
const inside = lib.coilInsideLines(100, 30, 3, true);
for (const line of inside) assert.ok(line[0][0] > line[2][0], "inside points toward N (left)");
// 직선 도선 동심원: 바깥으로 갈수록 간격이 넓고 마지막이 바깥 반지름
const radii = lib.wireRadii(50, 5);
near(radii[4], 50, 1e-9, "outer radius");
for (let i = 2; i < radii.length; i++) assert.ok(radii[i] - radii[i - 1] > radii[i - 1] - radii[i - 2], "spacing grows");
// N·S 경계는 직선, 둥근 모서리는 막대 바깥쪽에만 둔다
const north = lib.magnetHalfPoints(100, 20, 5, true);
const south = lib.magnetHalfPoints(100, 20, 5, false);
assert.deepStrictEqual(north.slice(1, 3).map((p) => p.anchor), [[0, 10], [0, -10]]);
assert.deepStrictEqual(south.map((p) => p.anchor).filter((p) => p[0] === 0), [[0, 10], [0, -10]]);
assert.ok(north[0].left[0] < north[0].anchor[0] && north[5].right[1] > north[5].anchor[1]);
assert.ok(south[1].right[0] > south[1].anchor[0] && south[4].left[0] > south[4].anchor[0]);
// 호출 결과에 바로 textRange를 대입하면 일러스트레이터가 종료된다
assert.ok(!/addText\([^;]*\)\.textRange/.test(source), "no chained textRange assignment");
assert.ok(source.includes('var PREF_KEY = "ObjectMagneticField/settings";'));
assert.ok(source.includes('p[0] !== "v6" || p.length !== 21'), "settings field count");
console.log("magnetic field checks passed");

// 모든 극 조합, 좁은 간격, 분포 양끝에서 유한한 좌표와 몸체 외부를 보장한다.
for (const mode of [1, 2, 3]) for (const gap of [5.67, 42.5, 283]) for (const spacing of [0.4, 1, 2]) {
  const result = lib.pairFieldLines(L, T, gap, mode, 10, 2, spacing);
  assert.ok(result.length > 4, `pair ${mode} has lines`);
  for (const line of result) for (const p of line) {
    assert.ok(p.every(Number.isFinite));
    const c = (L + gap) / 2;
    assert.ok(Math.abs(p[1]) >= T / 2 || (Math.abs(p[0] - c) >= L / 2 && Math.abs(p[0] + c) >= L / 2));
  }
  const f = lib.pointAlongCurve(result[0], 0.5);
  assert.ok(f.point.every(Number.isFinite) && Math.hypot(f.dx, f.dy) > 0);
}
const ns = lib.pairFieldLines(L, T, 42.5, 1, 16, 2, 1);
assert.ok(ns.some(line => line[0][0] < 0 && line.at(-1)[0] > 0 && Math.abs(line[0][0]) < 30), 'N to facing S bridge');
for (const mode of [2, 3]) {
  const result = lib.pairFieldLines(L, T, 42.5, mode, 16, 2, 1);
  assert.ok(!result.some(line => line[0][0] < 0 && line.at(-1)[0] > 0 && Math.abs(line[0][0]) < 30 && Math.abs(line.at(-1)[0]) < 30), 'like poles do not bridge');
}
const arrowStart = lib.pointAlongCurve([[0,0],[50,0],[100,0]], 0.1);
const arrowEnd = lib.pointAlongCurve([[0,0],[50,0],[100,0]], 0.9);
assert.ok(arrowStart.point[0] < 20 && arrowEnd.point[0] > 80 && arrowEnd.dx > 0);
assert.notDeepStrictEqual(lib.wireRadii(50, 5, 0.4), lib.wireRadii(50, 5, 2));
new Function(source);
console.log('pair geometry and JSX syntax checks passed');

// 직전 Illustrator 선 설정이 점선이어도 선과 면의 테두리는 실선으로 초기화한다.
const styles = new Function('makeGray', 'LINE_WIDTH_PT', `${extractFunction('styleLine')}\n${extractFunction('styleFace')}\nreturn {styleLine, styleFace};`)(k => k, 0.3);
for (const draw of [p => styles.styleLine(p, 0.3, null), p => styles.styleFace(p, 60)]) {
  const inherited = {strokeDashes: [8, 8], strokeDashOffset: 5};
  draw(inherited);
  assert.deepStrictEqual(inherited.strokeDashes, [], 'clear inherited dashes');
  assert.strictEqual(inherited.strokeDashOffset, 0);
}
const explicitDashes = {};
styles.styleLine(explicitDashes, 0.3, [2, 3]);
assert.deepStrictEqual(explicitDashes.strokeDashes, [2, 3]);
// 극 사이에 이어지는 선은 중앙 고정 + 양 극 거리만 이동한다.
const connecting = [[-40, 15], [0, 50], [40, 15]];
assert.deepStrictEqual(lib.fieldArrowFractions(connecting, 0.1, [0], L, T), [0.5, 0.1, 0.9]);
assert.deepStrictEqual(lib.fieldArrowFractions(connecting, 0.3, [0], L, T), [0.5, 0.3, 0.7]);
const exiting = [[-L / 2, 0], [-80, 40], [-113, 80]];
assert.deepStrictEqual(lib.fieldArrowFractions(exiting, 0.2, [0], L, T), [0.2]);
assert.deepStrictEqual(lib.fieldArrowFractions(exiting.slice().reverse(), 0.2, [0], L, T), [0.8]);
assert.deepStrictEqual(lib.fieldArrowFractions(connecting, 0.3, [0], L, T, true), [0.5]);
assert.ok(lib.fieldArrowFractions(loop, 0.2, [0], L, T).includes(0.5), 'actual traced loop retains center arrow');
console.log('solid stroke inheritance and fixed center arrow checks passed');

// 경계에 닿는 선 끝은 샘플 간격과 무관하게 0.6mm 간격이다.
const fieldGap = 0.6 * 2.834645669;
function bodyDistance(p, center = 0) {
  return Math.hypot(Math.max(0, Math.abs(p[0] - center) - L / 2), Math.max(0, Math.abs(p[1]) - T / 2));
}
const cleanLines = lib.fieldLines(L, 0.8, 24, 2, [L / 2, T / 2], true, 1);
assert.ok(cleanLines.length > 4);
for (const line of cleanLines) {
  for (const end of [line[0], line.at(-1)]) if (bodyDistance(end) < 5) near(bodyDistance(end), fieldGap, 1e-6, 'uniform body gap');
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    if (a[0] === b[0]) continue;
    const f = -a[0] / (b[0] - a[0]);
    if (f >= 0 && f <= 1) assert.ok(Math.abs(a[1] + f * (b[1] - a[1])) >= T / 2 + fieldGap + Math.max(1.5, T / 10), 'no shallow central loops');
  }
}
assert.deepStrictEqual(lib.clipFieldTrace([[-40,14],[-20,15],[0,15.5],[20,15],[40,14]], [0], L/2, T/2, fieldGap), []);
const makeHead = size => new Function('headSizePct','HEAD_LENGTH','HEAD_WIDTH', `${extractFunction('arrowHeadPoints')}\nreturn arrowHeadPoints([0,0],1,0);`)(size, 4, 3);
near(makeHead(200)[1][0], makeHead(100)[1][0] * 2, 1e-9, 'head length scales');
near(makeHead(30)[1][1], makeHead(100)[1][1] * 0.3, 1e-9, 'head width scales');
console.log('uniform clearance, shallow loop removal and head size checks passed');
