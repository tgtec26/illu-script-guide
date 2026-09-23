const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_expand_arrow.jsx");
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

const constants = ["SAMPLE_STEP_PT", "MITER_LIMIT", "FIT_TOLERANCE_PT"];
const names = ["flattenPath", "pushPoint", "taperedArrowOutline", "offsetNormal", "fitSide", "breakTangent", "fitCubic",
  "chordParameters", "generateBezier", "maxFitError", "reparameterize", "bezierPoint", "cornerNode", "unitNormal",
  "unitVector", "samePoint", "distance"];
const lib = new Function(`${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${names.join(",")}};`)();

const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1e-6, `${label}: expected ${b}, got ${a}`);
const nearPoint = (p, q, label) => { near(p[0], q[0], `${label} x`); near(p[1], q[1], `${label} y`); };
const corner = (x, y) => ({anchor: [x, y], left: [x, y], right: [x, y]});
const anchors = (nodes) => nodes.map((n) => n.anchor);
const options = {startWidth: 2, endWidth: 8, headLength: 10, headWidth: 20};
const k = 0.5522847498;
const quarter = (r) => [
  {anchor: [0, 0], left: [0, 0], right: [0, k * r]},
  {anchor: [r, r], left: [r - k * r, r], right: [r, r]},
];

// 폭 속성·화살촉 프리셋을 더는 쓰지 않는다. 흰색 선은 바깥쪽 정렬
assert.ok(!/applyExpandArrow|outlineExpandArrow|Width Profile|폭 속성1/.test(source), "no width profile");
assert.ok(/StrokeAlignment\.OUTSIDE/.test(source), "white stroke aligned outside");
assert.ok(/1634494318, STROKE_ACTION_NAMES\.alignOutside, 2\)/.test(source), "action fallback sets outside alignment");

// 직선: 끝점만 남고, 몸통은 시작 폭 → 끝 폭, 화살촉 꼭짓점은 패스 끝
{
  const flat = lib.flattenPath([corner(0, 0), corner(100, 0)], false);
  assert.deepStrictEqual(flat, {points: [[0, 0], [100, 0]], breaks: [0, 1]});
  const o = anchors(lib.taperedArrowOutline(flat, options));
  assert.strictEqual(o.length, 7);
  nearPoint(o[0], [0, 1], "start left");
  nearPoint(o[1], [90, 4], "body end left");
  nearPoint(o[2], [90, 10], "head left");
  nearPoint(o[3], [100, 0], "tip");
  nearPoint(o[4], [90, -10], "head right");
  nearPoint(o[5], [90, -4], "body end right");
  nearPoint(o[6], [0, -1], "start right");
}

// 시작 폭 0: 시작점이 뾰족하게 모인다
{
  const flat = lib.flattenPath([corner(0, 0), corner(100, 0)], false);
  const o = anchors(lib.taperedArrowOutline(flat, {startWidth: 0, endWidth: 8, headLength: 10, headWidth: 20}));
  nearPoint(o[0], [0, 0], "pointed start left");
  nearPoint(o[o.length - 1], [0, 0], "pointed start right");
}

// 직각 모서리: 마이터로 폭이 유지된다
{
  const flat = lib.flattenPath([corner(0, 0), corner(50, 0), corner(50, 60)], false);
  const o = anchors(lib.taperedArrowOutline(flat, {startWidth: 5, endWidth: 5, headLength: 10, headWidth: 12}));
  assert.strictEqual(o.length, 9);
  nearPoint(o[1], [47.5, 2.5], "inner corner");
  nearPoint(o[o.length - 2], [52.5, -2.5], "outer corner");
  nearPoint(o[4], [50, 60], "tip at path end");
}

// 화살촉이 패스보다 길면 몸통 없이 화살촉만 남는다
{
  const o = anchors(lib.taperedArrowOutline(lib.flattenPath([corner(0, 0), corner(5, 0)], false), options));
  assert.strictEqual(o.length, 3);
  nearPoint(o[0], [0, 10], "head-only left");
  nearPoint(o[1], [5, 0], "head-only tip");
}

// 곡선: 앵커는 몇 개로 줄고, 맞춘 곡선은 중심선에서 반폭만큼(±허용 오차) 떨어져 있다
{
  const flat = lib.flattenPath(quarter(50), false);
  assert.ok(flat.points.length >= 30, `curve sampled finely (${flat.points.length})`);
  const nodes = lib.taperedArrowOutline(flat, {startWidth: 6, endWidth: 6, headLength: 10, headWidth: 14});
  assert.ok(nodes.length <= 11, `few anchors on a quarter arc (${nodes.length})`);
  const tipIndex = nodes.findIndex((n) => Math.abs(n.anchor[0] - 50) < 1e-6 && Math.abs(n.anchor[1] - 50) < 1e-6);
  assert.ok(tipIndex > 2, "tip found");
  // 몸통 왼쪽: 0 ~ tipIndex - 2 (tipIndex - 1은 화살촉 왼쪽 모서리)
  for (let i = 0; i < tipIndex - 2; i++) {
    const a = nodes[i], b = nodes[i + 1];
    for (let t = 0; t <= 1; t += 0.05) {
      const p = lib.bezierPoint(a.anchor, a.right, b.left, b.anchor, t);
      const r = Math.hypot(p[0] - 50, p[1]);
      // 중심선 반지름 50 + 3, 샘플 간격(2pt 현)의 오차까지 허용
      assert.ok(Math.abs(r - 53) < 0.15, `fitted left side stays 3pt outside the arc (r=${r})`);
    }
  }
}

// 매끄러운 앵커로 이어진 두 곡선: 이음새 앵커에서 핸들이 한 직선 위에 있다
{
  const flat = lib.flattenPath([
    {anchor: [0, 0], left: [0, 0], right: [0, 27.6]},
    {anchor: [50, 50], left: [22.4, 50], right: [77.6, 50]},
    {anchor: [100, 100], left: [100, 72.4], right: [100, 100]},
  ], false);
  assert.deepStrictEqual(flat.breaks.length, 3);
  const nodes = lib.taperedArrowOutline(flat, {startWidth: 4, endWidth: 4, headLength: 10, headWidth: 12});
  const seam = nodes.find((n) => Math.hypot(n.anchor[0] - 50, n.anchor[1] - 52) < 0.1);
  assert.ok(seam, "seam anchor on the left side");
  const inDir = lib.unitVector(seam.left, seam.anchor);
  const outDir = lib.unitVector(seam.anchor, seam.right);
  assert.ok(inDir[0] * outDir[0] + inDir[1] * outDir[1] > 0.9999, "smooth seam keeps collinear handles");
}

// 곡선 끝: 몸통 끝 두 점과 화살촉 밑변 두 모서리가 한 직선 위에 놓인다
{
  const nodes = lib.taperedArrowOutline(lib.flattenPath(quarter(60), false), {startWidth: 2, endWidth: 10, headLength: 20, headWidth: 26});
  const tip = nodes.findIndex((n) => Math.abs(n.anchor[0] - 60) < 1e-6 && Math.abs(n.anchor[1] - 60) < 1e-6);
  const line = [nodes[tip - 2], nodes[tip - 1], nodes[tip + 1], nodes[tip + 2]].map((n) => n.anchor);
  const dir = lib.unitVector(line[1], line[2]);
  for (const p of line) {
    const cross = (p[0] - line[1][0]) * dir[1] - (p[1] - line[1][1]) * dir[0];
    assert.ok(Math.abs(cross) < 1e-9, `body end lies on the head base line (${cross})`);
  }
}

// 닫힌 패스: 마지막 → 처음 구간까지 따라간다
{
  const flat = lib.flattenPath([corner(0, 0), corner(10, 0), corner(10, 10)], true);
  assert.deepStrictEqual(flat.points[flat.points.length - 1], [0, 0]);
}

// 길이 0인 패스는 건너뛴다
assert.strictEqual(lib.taperedArrowOutline(lib.flattenPath([corner(3, 3)], false), options), null);
assert.strictEqual(lib.taperedArrowOutline(lib.flattenPath([corner(3, 3), corner(3, 3)], false), options), null);

console.log("expand arrow checks passed");
