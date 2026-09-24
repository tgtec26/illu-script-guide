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

const names = ["fieldAt", "traceLine", "fieldLines", "coilInsideLines", "wireRadii"];
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
// 호출 결과에 바로 textRange를 대입하면 일러스트레이터가 종료된다
assert.ok(!/addText\([^;]*\)\.textRange/.test(source), "no chained textRange assignment");
assert.ok(source.includes('var PREF_KEY = "ObjectMagneticField/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 14'), "settings field count");
console.log("magnetic field checks passed");
