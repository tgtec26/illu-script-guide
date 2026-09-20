const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_DoubleSlit.jsx");
const source = fs.readFileSync(scriptPath, "utf8");

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

function extractVar(name) {
  const match = source.match(new RegExp(`var ${name} = ([^;]*);`));
  assert.ok(match, `missing constant: ${name}`);
  return `var ${name} = ${match[1]};`;
}

const constants = ["MAX_STOPS_PER_BAND", "STOP_BUDGET"];
const names = ["buildStops", "fringeIntensity"];
const lib = new Function(`${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${[...constants, ...names].join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const stops = (bright, dark, ratio = 0, gain = 100, lightK = 0, darkK = 100) =>
  lib.buildStops(bright, dark, ratio, gain, lightK, darkK);
// 국소 최소(밝은 무늬 봉우리)·최대(어두운 무늬 골)인 정지점 인덱스. 양 끝은 이웃이 하나라 세지 않는다
const extrema = (ks, isMin) => ks.map((k, i) => i).filter((i) => i > 0 && i < ks.length - 1 &&
  (isMin ? ks[i] < ks[i - 1] && ks[i] < ks[i + 1] : ks[i] > ks[i - 1] && ks[i] > ks[i + 1]));

// 밝기: 첫 띠 가운데(s = 0.5)가 밝은 무늬면 1, 어두운 무늬면 0. 띠 경계는 반, 한 주기는 띠 2개
near(lib.fringeIntensity(0.5, 9, false, 0), 1, 1e-12, "bright first: first band centre");
near(lib.fringeIntensity(1.5, 9, false, 0), 0, 1e-12, "bright first: second band centre");
near(lib.fringeIntensity(2.5, 9, false, 0), 1, 1e-12, "bright first: third band centre");
near(lib.fringeIntensity(1, 9, false, 0), 0.5, 1e-12, "band boundary is half intensity");
near(lib.fringeIntensity(0.5, 9, true, 0), 0, 1e-12, "dark first: first band centre");
near(lib.fringeIntensity(1.5, 9, true, 0), 1, 1e-12, "dark first: second band centre");

// 5 밝은 + 4 어두운: 정지점 9띠 × 8 + 1, 좌우 대칭, 가운데 밝은 무늬(K 0), 양 끝은 K 50, 봉우리 5개·골 4개
{
  const ks = stops(5, 4).map((s) => s.k);
  assert.strictEqual(ks.length, 9 * 8 + 1, "stop count");
  for (let i = 0; i < ks.length; i++) assert.strictEqual(ks[i], ks[ks.length - 1 - i], `symmetric at ${i}`);
  assert.strictEqual(ks[(ks.length - 1) / 2], 0, "centre is a bright fringe");
  assert.strictEqual(ks[0], 50, "edge is half intensity");
  assert.strictEqual(extrema(ks, true).length, 5, "five bright fringes");
  assert.strictEqual(extrema(ks, false).length, 4, "four dark fringes");
  for (const i of extrema(ks, true)) assert.strictEqual(ks[i], 0, `bright fringe ${i} reaches K 0 without envelope`);
  for (const i of extrema(ks, false)) assert.strictEqual(ks[i], 100, `dark fringe ${i} reaches K 100`);
  const positions = stops(5, 4).map((s) => s.pos);
  assert.strictEqual(positions[0], 0);
  assert.strictEqual(positions[positions.length - 1], 100);
  for (let i = 1; i < positions.length; i++) assert.ok(positions[i] > positions[i - 1], "ramp points ascend");
}

// 4 밝은 + 5 어두운: 어두운 무늬가 양 끝과 가운데, 골 5개·봉우리 4개
{
  const ks = stops(4, 5).map((s) => s.k);
  assert.strictEqual(ks[(ks.length - 1) / 2], 100, "centre is a dark fringe");
  assert.strictEqual(extrema(ks, false).length, 5, "five dark fringes");
  assert.strictEqual(extrema(ks, true).length, 4, "four bright fringes");
}

// 같은 수(5 + 5): 왼쪽 첫 띠는 밝고 오른쪽 마지막 띠는 어둡다
{
  const ks = stops(5, 5).map((s) => s.k);
  assert.strictEqual(ks[4], 0, "first band is bright");
  assert.strictEqual(ks[ks.length - 5], 100, "last band is dark");
  assert.strictEqual(extrema(ks, true).length, 5);
  assert.strictEqual(extrema(ks, false).length, 5);
}

// 슬릿 간격/폭 3: 가운데는 그대로 밝고, 멀수록 어두워지며 3번째 밝은 무늬는 사라진다(가운데 ±6띠 = 첫·마지막 띠)
{
  const ks = stops(7, 6, 3).map((s) => s.k);
  const centre = (ks.length - 1) / 2;
  const perBand = 8;
  assert.strictEqual(ks[centre], 0, "central maximum stays K 0");
  const order = (m) => ks[centre + m * 2 * perBand];
  assert.ok(order(1) > 0 && order(1) < order(2), `orders dim outward: ${order(1)} < ${order(2)}`);
  assert.ok(order(3) >= 99, `third order is missing: K ${order(3)}`);
  for (let i = 0; i < ks.length; i++) assert.strictEqual(ks[i], ks[ks.length - 1 - i], `envelope keeps symmetry at ${i}`);
}

// 전체 밝기 200%: 띠 경계(밝기 0.5)가 K 50 → K 29로 밝아진다. 무늬 위치(봉우리·골)는 그대로
{
  const base = stops(5, 4).map((s) => s.k);
  const lifted = stops(5, 4, 0, 200).map((s) => s.k);
  assert.strictEqual(base[0], 50);
  assert.strictEqual(lifted[0], Math.round(100 - 100 * Math.pow(0.5, 0.5)));
  assert.deepStrictEqual(extrema(lifted, true), extrema(base, true), "gain keeps bright positions");
  assert.deepStrictEqual(extrema(lifted, false), extrema(base, false), "gain keeps dark positions");
}

// 가장 밝은 곳 K 10 · 가장 어두운 곳 K 90: 그 사이에서만 움직인다
{
  const ks = stops(5, 4, 0, 100, 10, 90).map((s) => s.k);
  assert.strictEqual(Math.min(...ks), 10);
  assert.strictEqual(Math.max(...ks), 90);
}

// 정지점 예산: 띠가 많으면 띠당 개수를 줄여 STOP_BUDGET 안쪽, 최소 띠당 2개
assert.strictEqual(stops(1, 0).length, lib.MAX_STOPS_PER_BAND + 1, "single band uses the full per-band count");
{
  const many = stops(21, 22);
  assert.ok(many.length <= lib.STOP_BUDGET + 1, `43 bands stay within budget: ${many.length}`);
  assert.strictEqual(many.length, 43 * 4 + 1, "per-band count rounds down to an even number so band centres are sampled");
  assert.strictEqual(extrema(many.map((s) => s.k), true).length, 21, "21 bright fringes survive the coarser sampling");
}

// 다이얼로그 규칙: 설정 저장 키, 미리보기 이동 행, 탭 헬퍼, 마지막 실행 메모
assert.ok(source.includes('var PREF_KEY = "DoubleSlit/settings";'));
assert.ok(source.includes('addValueRow(positionPanel, "가로 이동", "mm"'));
assert.ok(source.includes('addValueRow(positionPanel, "세로 이동", "mm"'));
assert.ok(source.includes('if (typeof bindTabOrder === "function") bindTabOrder(dlg);'));
assert.ok(source.includes('Folder.temp + "/illu_last_script.txt"'));
assert.ok(source.includes("path.rotate(angle - stamped, false, false, true, false, Transformation.CENTER)"),
  "gradient angle is corrected by the read-back difference");

console.log("check-double-slit: ok");
