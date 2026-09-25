const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_StarTrails.jsx"), "utf8");

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

const names = ["makeRandom", "northArcs", "northTrails", "southTrails", "slantTrails", "corner", "arcPoints"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const angleOf = (p) => Math.atan2(p[1], p[0]);

// 북쪽: 한 시간 15°, 시계 반대 방향, 반지름은 고르게, 가장 바깥은 크기의 45%
{
  const arcs = lib.northArcs(5, 100, 3, 1);
  assert.strictEqual(arcs.length, 5);
  near(arcs[4].r, 45, 1e-9, "outer radius");
  for (let i = 0; i < 5; i++) {
    near(arcs[i].r, 45 * (i + 1) / 5, 1e-9, "even radii");
    near(arcs[i].end - arcs[i].start, Math.PI / 4, 1e-9, "3 h = 45°");
  }
  const trails = lib.northTrails(5, 100, 3, 1);
  for (let i = 0; i < 5; i++) {
    const first = trails[i][0].anchor, last = trails[i][trails[i].length - 1].anchor;
    near(Math.hypot(first[0], first[1]), arcs[i].r, 1e-9, "starts on circle");
    // 끝이 시작보다 반시계 방향으로 45° 앞선다
    let turn = angleOf(last) - angleOf(first);
    if (turn < 0) turn += 2 * Math.PI;
    near(turn, Math.PI / 4, 1e-9, "counter-clockwise");
  }
  assert.deepStrictEqual(lib.northArcs(5, 100, 3, 1), arcs, "same seed, same start angles");
  // 12시간이면 반 바퀴: 호 조각은 90° 이하
  assert.strictEqual(lib.northTrails(1, 100, 12, 1)[0].length, 3);
}

// 남쪽: 왼쪽에서 오른쪽으로, 3시간 호의 두 끝이 지평선(y = -크기/2) 위
{
  for (const trail of lib.southTrails(6, 100, 3)) {
    const first = trail[0].anchor, last = trail[trail.length - 1].anchor;
    assert.ok(first[0] < last[0], "east to west");
    assert.ok(first[1] > -50 && last[1] > -50, "ends above the horizon");
  }
}

// 동쪽은 오른쪽 위, 서쪽은 오른쪽 아래. 지평선과의 각은 90° − 위도, 길이는 3시간에 크기의 30%
{
  for (const rising of [true, false]) {
    for (const line of lib.slantTrails(4, 100, 3, 37.5, rising, 2)) {
      const a = line[0].anchor, b = line[1].anchor;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      assert.ok(dx > 0 && (rising ? dy > 0 : dy < 0), "direction");
      near(Math.atan2(Math.abs(dy), dx) * 180 / Math.PI, 52.5, 1e-9, "tilt = 90 − latitude");
      near(Math.hypot(dx, dy), 30, 1e-9, "length");
    }
  }
}
assert.ok(source.includes('var PREF_KEY = "ObjectStarTrails/settings";'));
// 각도 글자의 도(°)는 GSMediumB1의 U+02D8 글리프로 바꿔 넣는다
assert.ok(source.includes('var DEGREE_GLYPH = "\\u02D8";'));
assert.ok(source.includes("frame.contents = text.replace(/\\u00B0/g, DEGREE_GLYPH);"));
console.log("star trail checks passed");
