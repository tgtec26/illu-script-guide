const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_LabGlassware.jsx"), "utf8");

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

const names = ["glassware", "v", "rectVertices", "roundPolyline", "bezierCorner", "unit", "arcPoints", "joinBezier", "closeLoop",
  "flattenBezier", "clipBelow", "spanAt", "tickLines"];
const lib = new Function(`var FLATTEN_STEPS = 12;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const area = (poly) => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
};

// 모서리 둥글리기: 직각 모서리는 접선 길이 r, 손잡이 0.5523r (원호 근사)
{
  const pts = lib.roundPolyline([lib.v(0, 10, 0), lib.v(0, 0, 4), lib.v(10, 0, 0)], false);
  assert.strictEqual(pts.length, 4);
  assert.deepStrictEqual(pts[1].anchor, [0, 4]);
  assert.deepStrictEqual(pts[2].anchor, [4, 0]);
  near(pts[1].right[1], 4 - 4 * 0.5522847498, 1e-6, "handle length");
  near(pts[2].left[0], 4 - 4 * 0.5522847498, 1e-6, "handle length");
  // 반지름이 이웃 변 절반보다 크면 줄인다 → 시험관 바닥 두 모서리가 가운데에서 만나 반원
  const tube = lib.roundPolyline([lib.v(0, 20, 0), lib.v(0, 0, 5), lib.v(10, 0, 5), lib.v(10, 20, 0)], false);
  assert.deepStrictEqual(tube[2].anchor, [5, 0]);
  assert.deepStrictEqual(tube[3].anchor, [5, 0]);
}

// 원호: 90° 조각마다 점, 모든 앵커가 원 위
{
  const arc = lib.arcPoints(0, 0, 10, 0, Math.PI * 2);
  assert.strictEqual(arc.length, 5);
  for (const p of arc) near(Math.hypot(p.anchor[0], p.anchor[1]), 10, 1e-9, "on circle");
}

// 자르기·폭
{
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  near(area(lib.clipBelow(square, 4)), 40, 1e-9, "clip area");
  assert.deepStrictEqual(lib.spanAt(square, 5), [0, 10]);
  assert.strictEqual(lib.spanAt(square, 20), null);
}

// 종류마다: 안쪽 다각형이 상자 안, 액체 높이가 안쪽 높이의 비율, 액체 면적이 높이에 따라 늘어난다
const box = {left: 0, top: 100, width: 40, height: 100};
for (let kind = 0; kind < 6; kind++) {
  const g = lib.glassware(kind, box, 0.5);
  assert.ok(g.outlines.length > 0, `kind ${kind} outline`);
  for (const p of g.interior) {
    assert.ok(p[0] >= -1e-6 && p[0] <= 40 + 1e-6 && p[1] >= -1e-6 && p[1] <= 100 + 1e-6, `kind ${kind} interior inside box`);
  }
  near(g.levelY, g.interiorBottom + (g.interiorTop - g.interiorBottom) * 0.5, 1e-9, `kind ${kind} level`);
  const low = area(lib.clipBelow(lib.glassware(kind, box, 0.2).interior, lib.glassware(kind, box, 0.2).levelY));
  const high = area(lib.clipBelow(lib.glassware(kind, box, 0.8).interior, lib.glassware(kind, box, 0.8).levelY));
  assert.ok(high > low && low > 0, `kind ${kind} liquid grows`);
  const ticks = lib.tickLines(g, 10);
  assert.strictEqual(ticks.length, 11, `kind ${kind} ticks`);
  assert.ok(ticks[0][1][0] - ticks[0][0][0] > ticks[1][1][0] - ticks[1][0][0], "every fifth tick is long");
}

// 주사기: 피스톤 위치가 오르면 기체 공간이 커지고, 기체 공간은 닫힌 사각형
{
  const lowGas = lib.glassware(4, box, 0.1).gas;
  const highGas = lib.glassware(4, box, 0.9).gas;
  assert.strictEqual(lowGas.length, 4);
  assert.ok(area(highGas) > area(lowGas));
}

// 온도계: 관과 구부가 한 닫힌 패스이고 첫 점과 끝 점이 겹치지 않는다
{
  const g = lib.glassware(5, box, 0.5);
  const pts = g.outlines[0].points;
  const first = pts[0].anchor, last = pts[pts.length - 1].anchor;
  assert.ok(Math.hypot(first[0] - last[0], first[1] - last[1]) > 1e-6, "loop closed without duplicate point");
  assert.strictEqual(g.tickSide, "outside");
  assert.strictEqual(g.fills.length, 2);
}
assert.ok(source.includes('var PREF_KEY = "ObjectLabGlassware/settings";'));
console.log("lab glassware checks passed");
