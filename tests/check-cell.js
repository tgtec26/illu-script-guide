const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Cell.jsx"), "utf8");
const artDir = path.join(root, "스크립트", "01_도형", "Object_Cell_art");

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

const names = ["makeRandom", "scatter", "boxInside", "overlapsAny", "emptiestPoint", "labelHeights", "roundedRectPoints", "blobPoints"];
const lib = new Function(`var SCATTER_TRIES = 400; var KAPPA = 0.5522847498;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 같은 번호면 같은 수열, 다른 번호면 다른 수열
{
  const a = lib.makeRandom(3), b = lib.makeRandom(3), c = lib.makeRandom(4);
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepStrictEqual(sa, sb);
  assert.notDeepStrictEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
}

// 흩기: 모두 안쪽에 있고, 서로·고정 상자와 겹치지 않으며, 같은 번호면 같은 결과
for (const elliptic of [false, true]) {
  const rx = 60, ry = 40;
  const fixed = [{x: -12, y: 2, hx: 13, hy: 13}];
  const specs = [];
  for (let i = 0; i < 5; i++) specs.push({name: "마이토콘드리아", length: 16, thickness: 7});
  for (let i = 0; i < 8; i++) specs.push({name: "엽록체", length: 13, thickness: 7});
  const spots = lib.scatter(specs, fixed, rx, ry, elliptic, 7);
  assert.ok(spots.length >= 8, `too few placed (${spots.length})`);
  const all = fixed.concat(spots);
  for (let i = 0; i < spots.length; i++) {
    assert.ok(lib.boxInside(spots[i], rx, ry, elliptic), "outside cell");
    for (let j = 0; j < all.length; j++) {
      if (all[j] === spots[i]) continue;
      assert.ok(!lib.overlapsAny(spots[i], [all[j]], 0), "overlap");
    }
  }
  assert.deepStrictEqual(lib.scatter(specs, fixed, rx, ry, elliptic, 7), spots);
  // 세포질 자리: 오른쪽 절반, 세포 안, 어느 상자에도 들지 않음
  const empty = lib.emptiestPoint(all, rx, ry, elliptic);
  assert.ok(empty[0] >= 0, "cytoplasm target on the right");
  assert.ok(!lib.overlapsAny({x: empty[0], y: empty[1], hx: 0, hy: 0}, all, 0), "cytoplasm target inside an organelle");
}

// 자리가 모자라면 들어가는 만큼만
{
  const specs = Array.from({length: 50}, () => ({name: "엽록체", length: 30, thickness: 15}));
  const spots = lib.scatter(specs, [], 40, 30, false, 1);
  assert.ok(spots.length < 50 && spots.length > 0);
}

// 이름 높이: 하나면 가운데, 여럿이면 세포 높이 80% 안에 위에서 아래로 고르게
assert.deepStrictEqual(lib.labelHeights(1, 100, 50), [100]);
assert.deepStrictEqual(lib.labelHeights(3, 100, 50), [120, 100, 80]);

// 둥근 사각형: 8점, 모서리 반지름은 반너비·반높이를 넘지 않는다
{
  const pts = lib.roundedRectPoints(0, 0, 20, 10, 50);
  assert.strictEqual(pts.length, 8);
  for (const p of pts) assert.ok(Math.abs(p.anchor[0]) <= 10 + 1e-9 && Math.abs(p.anchor[1]) <= 5 + 1e-9);
}
assert.strictEqual(lib.blobPoints(0, 0, 20, 10).length, 8);

for (const name of ["핵", "마이토콘드리아", "엽록체"]) {
  assert.ok(fs.existsSync(path.join(artDir, name + ".svg")) || fs.existsSync(path.join(artDir, name + ".ai")), `missing art ${name}`);
}
assert.ok(source.includes('var PREF_KEY = "ObjectCell/settings";'));
console.log("cell checks passed");
