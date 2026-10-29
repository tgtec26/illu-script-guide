const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(공통수학.jsx)의 "Venn" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "공통수학.jsx"), "utf8");
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

const names = ["vennLayout", "membership", "regionLoops", "chainArcs", "circleIntersections", "parseSetExpression", "arcPoints", "plain",
  "vennSetCount", "parseSetNames", "parseRegionTexts", "presentMasks", "regionPoint"];
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
// 집합 1개·서로소·포함, U 끄기, 이름, 영역 글자 (웹 math-venn.test.js와 같은 경우)
{
  assert.strictEqual(g.vennSetCount(2), 1);
  const apart = g.vennLayout(2, 10, 0.45, { arrangement: 1 });
  assert.deepStrictEqual(g.circleIntersections(apart.circles[0], apart.circles[1]), []);
  const inside = g.vennLayout(2, 10, 0.45, { arrangement: 2 });
  assert.strictEqual(g.membership(inside, inside.circles[1].center), 3, "B는 A 안");
  assert.strictEqual(g.regionLoops(inside, g.parseSetExpression("A-B", 2)).length, 2, "구멍 뚫린 고리 둘");
  const off = g.vennLayout(2, 10, 0.45, { universe: false });
  assert.strictEqual(g.regionLoops(off, g.parseSetExpression("(A∪B)ᶜ", 2)).length, 0, "U 틀이 없으면 바깥은 칠하지 않는다");
  assert.ok(!off.labels.some((l) => l.text === "U"));
  assert.deepStrictEqual(g.parseSetExpression("Pᶜ∩Q", 2, ["P", "Q"], "S"), [2]);
  assert.deepStrictEqual(g.parseSetNames("P, Q", 2, "U"), ["P", "Q"]);
  assert.strictEqual(g.parseSetNames("S, Q", 2, "S"), null);
  const layout = g.vennLayout(2, 10, 0.45);
  const list = g.parseRegionTexts("A-B: 1, 3; A∩B: 2; (A∪B)ᶜ: 5", 2, null, null, g.presentMasks(layout));
  assert.deepStrictEqual(list.map((x) => x.mask), [1, 3, 0]);
  for (const item of list) assert.strictEqual(g.membership(layout, g.regionPoint(layout, item.mask)), item.mask);
  assert.strictEqual(g.parseRegionTexts("A: 1", 2), null);
  assert.deepStrictEqual(g.parseRegionTexts("B: b", 2, null, null, g.presentMasks(inside)).map((x) => x.mask), [3], "포함 배치의 B는 한 영역");
  assert.ok(source.includes("if (layout.universe) addOutline("), "U 틀 끄기");
  assert.ok(source.includes('"1개 (A)"'));
  // 웹과 글자 그대로 같다 (들여쓰기만 다르다)
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-venn.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8");
    for (const name of ["vennSetCount", "vennLayout", "regionLoops", "parseSetExpression", "parseSetNames", "parseRegionTexts", "presentMasks", "regionPoint"]) {
      const start = web.indexOf(`export function ${name}(`), end = web.indexOf("\n}\n", start) + 2;
      const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
      assert.strictEqual(scriptText, web.slice(start + "export ".length, end), name + " differs from the web");
    }
  }
}

// 설정 v2: 새 항목 5개를 저장하고 v1(10칸)도 읽는다
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const prelude = `var PREF_KEY = "T", POSITION_LIMIT_MM = 100, COUNTS = [1, 2, 3], ARRANGEMENTS = [1, 2, 3];
    var setCount = 0, shadeText = "A∩B", shadeK = 25, radiusMm = 12, overlapPct = 45, fontPt = 8, offsetXmm = 0, offsetYmm = 0, previewEnabled = true,
    arrangement = 0, showUniverse = true, universeName = "U", setNames = "", regionText = ""; function saveLineWidths() {}`;
  const body = prelude + ["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction).join("\n") +
    `return { saveSettings, applySettings, set: function() { setCount = 2; arrangement = 2; showUniverse = false; universeName = "S"; setNames = "P, Q"; regionText = "A-B: 1"; },
      get: function() { return [setCount, arrangement, showUniverse, universeName, setNames, regionText]; } };`;
  const make = () => new Function("app", body)(app);
  const first = make(); first.set(); first.saveSettings();
  assert.strictEqual(store.T.split("|").length, 15);
  const again = make(); again.applySettings();
  assert.deepStrictEqual(again.get(), [2, 2, false, "S", "P, Q", "A-B: 1"]);
  store.T = store.T.split("|").slice(0, 10).join("|").replace(/^v2/, "v1");
  const old = make(); old.applySettings();
  assert.deepStrictEqual(old.get(), [2, 0, true, "U", "", ""]);
}
console.log("venn checks passed");
