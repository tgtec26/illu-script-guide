const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Wave.jsx"), "utf8");

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

const names = ["harmonicWave", "wavePoints", "extremaX", "longitudinalXs", "compressionXs", "soundPanels", "arrowHeadPoints"];
const lib = new Function(
  "var TIMBRES = [[[1, 1]], [[1, 1], [2, 0.5]], [[1, 1], [3, 0.45], [5, 0.25]]]; var HEAD_LENGTH = 4, HEAD_WIDTH = 3;\n" +
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);

function bezierAt(a, b, t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * a.anchor[k] + 3 * u * u * t * a.right[k] + 3 * u * t * t * b.left[k] + t * t * t * b.anchor[k]);
}

// 횡파: 양 끝이 너비 끝, 곡선이 sin과 거의 같다(진폭의 0.5% 안)
{
  const pts = lib.wavePoints(100, 10, 40, [[1, 1]]);
  near(pts[0].anchor[0], -50, 1e-9, "left end");
  near(pts[pts.length - 1].anchor[0], 50, 1e-9, "right end");
  let worst = 0;
  for (let i = 1; i < pts.length; i++) {
    for (let s = 0; s <= 10; s++) {
      const p = bezierAt(pts[i - 1], pts[i], s / 10);
      worst = Math.max(worst, Math.abs(p[1] - 10 * Math.sin(2 * Math.PI * p[0] / 40)));
    }
  }
  assert.ok(worst < 0.05, `sine fit error ${worst}`);
  // 마루는 λ/4 + nλ, 골은 3λ/4 + nλ
  assert.deepStrictEqual(lib.extremaX(100, 40, true), [-30, 10, 50]);
  assert.deepStrictEqual(lib.extremaX(100, 40, false), [-50, -10, 30]);
}

// 음색 파형도 가장 높은 곳이 진폭
{
  for (const harmonics of [[[1, 1], [2, 0.5]], [[1, 1], [3, 0.45], [5, 0.25]]]) {
    const wave = lib.harmonicWave(10, 40, harmonics);
    let peak = 0;
    for (let x = 0; x <= 40; x += 0.01) peak = Math.max(peak, Math.abs(wave.y(x)));
    near(peak, 10, 0.01, "timbre peak");
    near(wave.slope(3), (wave.y(3.0001) - wave.y(2.9999)) / 0.0002, 1e-4, "slope is the derivative");
  }
}

// 종파: 선 순서가 유지되고, 밀(0) 둘레가 소(λ/2) 둘레보다 촘촘하다
{
  const xs = lib.longitudinalXs(120, 40, 0.6, 61);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], "lines stay in order");
  const gapAt = (x) => {
    let best = Infinity;
    for (let i = 1; i < xs.length; i++) {
      const mid = (xs[i] + xs[i - 1]) / 2;
      if (Math.abs(mid - x) < Math.abs(best)) best = mid - x;
    }
    const i = xs.findIndex((v, j) => j > 0 && Math.abs((v + xs[j - 1]) / 2 - x) === Math.abs(best));
    return xs[i] - xs[i - 1];
  };
  assert.ok(gapAt(0) < gapAt(20) * 0.5, "compression is denser than rarefaction");
  near(xs[0], -60, 1e-9, "left end stays");
  near(xs[xs.length - 1], 60, 1e-9, "right end stays");
  const even = lib.longitudinalXs(100, 40, 0, 11);
  for (let i = 0; i < 11; i++) near(even[i], -50 + 10 * i, 1e-9, "zero density keeps even spacing");
  assert.deepStrictEqual(lib.compressionXs(120, 40, true), [-40, 0, 40]);
  assert.deepStrictEqual(lib.compressionXs(120, 40, false), [-60, -20, 20, 60]);
}

// 소리 비교: 크기는 진폭만, 높낮이는 파장만, 음색은 배음만 다르다
{
  const size = lib.soundPanels(0, 3, 9, 30);
  assert.deepStrictEqual(size.map((s) => s.amplitude), [9, 6, 3]);
  assert.ok(size.every((s) => s.wavelength === 30));
  const pitch = lib.soundPanels(1, 3, 9, 30);
  assert.deepStrictEqual(pitch.map((s) => s.wavelength), [30, 15, 10]);
  assert.ok(pitch.every((s) => s.amplitude === 9));
  const timbre = lib.soundPanels(2, 2, 9, 30);
  assert.strictEqual(timbre.length, 2);
  assert.notDeepStrictEqual(timbre[0].harmonics, timbre[1].harmonics);
}

// 화살촉: 끝이 tip, 밑변 가운데가 방향 반대로 HEAD_LENGTH
{
  const [tip, a, b] = lib.arrowHeadPoints([10, 0], 1, 0);
  assert.deepStrictEqual(tip, [10, 0]);
  near((a[0] + b[0]) / 2, 6, 1e-9, "base x");
  near(Math.abs(a[1] - b[1]), 3, 1e-9, "base width");
}

assert.ok(source.includes('var PREF_KEY = "ObjectWave/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 18'), "settings field count");
console.log("wave checks passed");
