const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(Object_HighCommon.jsx)의 "Venn" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_HighCommon.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeVennEngine(");
  assert.ok(start >= 0, "missing engine: makeVennEngine");
  let depth = 0;
  for (let index = bundle.indexOf("{", start); index < bundle.length; index++) {
    if (bundle[index] === "{") depth++;
    if (bundle[index] === "}" && --depth === 0) return bundle.slice(start, index + 1);
  }
  throw new Error("unbalanced engine");
})();

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

const names = ["vennLayout", "membership", "regionLoops", "chainArcs", "circleIntersections", "parseSetExpression", "arcPoints", "plain"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 집합 식 → 영역 마스크 (A=1, B=2, C=4)
assert.deepStrictEqual(g.parseSetExpression("A∩B", 2), [3]);
assert.deepStrictEqual(g.parseSetExpression("A n B", 2), [3], "n for ∩");
assert.deepStrictEqual(g.parseSetExpression("A∪B", 2), [1, 2, 3]);
assert.deepStrictEqual(g.parseSetExpression("A-B", 2), [1]);
assert.deepStrictEqual(g.parseSetExpression("(A∪B)'", 2), [0], "complement with '");
assert.deepStrictEqual(g.parseSetExpression("A∩B^c∩C", 3), [5]);
assert.deepStrictEqual(g.parseSetExpression("Aᶜ", 2), [0, 2]);
assert.deepStrictEqual(g.parseSetExpression("U", 2), [0, 1, 2, 3]);
assert.deepStrictEqual(g.parseSetExpression("", 3), []);
assert.deepStrictEqual(g.parseSetExpression("A∪B∩C", 3), [1, 3, 5, 6, 7], "∩ before ∪");
for (const bad of ["C", "A∩", "(A", "A B", "D"]) assert.strictEqual(g.parseSetExpression(bad, 2), null, bad);

// 칠한 영역의 넓이 = 격자 표본으로 센 넓이 (베지어 고리를 촘촘히 펴서 다각형 넓이로)
function loopArea(loop) {
  const pts = [];
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i], q = loop[(i + 1) % loop.length];
    for (let k = 0; k < 24; k++) {
      const t = k / 24, u = 1 - t;
      pts.push([0, 1].map((d) => u * u * u * p.anchor[d] + 3 * u * u * t * p.right[d] + 3 * u * t * t * q.left[d] + t * t * t * q.anchor[d]));
    }
  }
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;   // 반시계면 +, 구멍(시계)이면 -
}
function sampledArea(layout, masks) {
  const r = layout.rect, N = 400; let hit = 0;
  const w = (r[2] - r[0]) / N, h = (r[1] - r[3]) / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const p = [r[0] + (i + 0.5) * w, r[3] + (j + 0.5) * h];
    if (masks.includes(g.membership(layout, p))) hit++;
  }
  return hit * w * h;
}
for (const [n, expr] of [[2, "A∩B"], [2, "A-B"], [2, "(A∪B)'"], [2, "A∪B"], [3, "A∩B∩C"], [3, "A∩Bᶜ"], [3, "(A∩B)∪(B∩C)∪(A∩C)"], [3, "Aᶜ∩Bᶜ∩Cᶜ"], [3, "A∩B∪C'"]]) {
  const layout = g.vennLayout(n, 30, 0.45);
  const masks = g.parseSetExpression(expr, n);
  const loops = g.regionLoops(layout, masks);
  const area = loops.reduce((sum, l) => sum + loopArea(l), 0);
  const expected = sampledArea(layout, masks);
  assert.ok(Math.abs(area - expected) / expected < 0.01, `${n} sets ${expr}: ${area.toFixed(1)} vs ${expected.toFixed(1)}`);
  for (const l of loops) for (let i = 0; i < l.length; i++) {
    const p = l[i].anchor, q = l[(i + 1) % l.length].anchor;
    assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6, "no zero-length segment");
  }
}

// 배치: 두 원이 겹치고 사각형 안에 있다, 이름 A·B·U
{
  const layout = g.vennLayout(2, 30, 0.45);
  assert.strictEqual(g.circleIntersections(layout.circles[0], layout.circles[1]).length, 2);
  assert.deepStrictEqual(layout.labels.map((l) => l.text), ["A", "B", "U"]);
  for (const c of layout.circles) assert.ok(c.center[0] - c.radius > layout.rect[0] && c.center[0] + c.radius < layout.rect[2]);
}

assert.ok(source.includes('var PREF_KEY = "HighMathVenn/settings";'));
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("venn checks passed");
