const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_SeparationSetup.jsx"), "utf8");

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

const names = ["arcPoints", "circleSegment", "distillationParts", "flamePoints", "separatoryFunnel", "smoothClosed", "beakerOutline", "filtrationParts", "parseSpots", "chromatographyParts"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 활꼴: 양 끝이 수면 높이, 원 위
for (const fill of [0.2, 0.5, 0.8]) {
  const seg = lib.circleSegment([0, 0], 10, fill);
  const a = seg[0].anchor, b = seg[seg.length - 1].anchor;
  near(a[1], -10 + 20 * fill, 1e-9, "surface left");
  near(b[1], a[1], 1e-9, "surface level");
  assert.ok(a[0] < 0 && b[0] > 0, "left to right");
  for (const s of seg) near(Math.hypot(s.anchor[0], s.anchor[1]), 10, 1e-9, "on the circle");
}
// 증류: 온도계 구부는 가지 높이, 냉각기는 오른쪽으로 내려가고 받는 플라스크는 냉각기 끝 아래
const d = lib.distillationParts(100);
near(d.thermometer.bulb[1], d.armStart[1], 1e-9, "bulb at the side arm");
assert.ok(d.condenser.innerEnd[0] > d.armStart[0] && d.condenser.innerEnd[1] < d.armStart[1], "condenser slopes down");
assert.ok(d.receiver[0][1] < d.condenser.innerEnd[1], "receiver below the outlet");
// 냉각수: 아래쪽으로 들어가 위쪽으로 나간다
assert.ok(d.condenser.water[0].pipe[0][1] < d.condenser.water[1].pipe[0][1], "inlet lower than outlet");
// 분별 깔때기: 고리는 몸통 밖 (그 높이 몸통 너비 < 고리 너비)
const f = lib.separatoryFunnel(100);
assert.strictEqual(f.ringY, 0);
assert.ok(f.width * 0.5 * 2 < f.width * 1.4, "ring wider than the body at its height");
// 점 목록
assert.deepStrictEqual(lib.parseSpots("A: 30 60 / B: 45 / 혼합물: 30, 45, 60"),
  [{name: "A", heights: [0.3, 0.6]}, {name: "B", heights: [0.45]}, {name: "혼합물", heights: [0.3, 0.45, 0.6]}]);
assert.deepStrictEqual(lib.parseSpots("20 / 140").map((c) => c.name), ["A", "B"]);
assert.deepStrictEqual(lib.parseSpots("A: 140")[0].heights, [1], "clamped to the solvent front");
const c = lib.chromatographyParts(100, lib.parseSpots("A: 0 100 / B: 50"));
near(c.spots[0].y, c.baseY, 1e-9, "0% on the start line");
near(c.spots[1].y, c.frontY, 1e-9, "100% on the solvent front");
assert.ok(c.baseY > c.solventTop, "start line above the solvent");
assert.ok(source.includes('var PREF_KEY = "ObjectSeparationSetup/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 13'), "settings field count");
console.log("separation setup checks passed");
