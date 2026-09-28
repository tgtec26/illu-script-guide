const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "FigureProblem" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_MiddleMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeFigureProblemEngine(");
  assert.ok(start >= 0, "missing engine: makeFigureProblemEngine");
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
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced helper: ${name}`);
}

const names = ["buildFigure", "outward", "awayFrom", "lerp", "dist", "extend", "unitVector", "circleLayout", "convexHull", "beltPoints", "circlePoints",
  "arcPoints", "join", "polyline", "splitNames", "productText", "splitTerm", "expansionText", "numText", "rootText", "formatValue"];
const g = new Function(`var RIGHT_MARK_MM = 1.5;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { kind: 0, p: [3, 4, 0, 0], across: "a,b", down: "a,b", unit: 10, names: true, guides: true, lengths: true, extra: false };
const build = (o) => g.buildFigure(Object.assign({}, base, o));
const text = (d, t) => d.texts.find((x) => x.text === t);

// 피타고라스 3·4·5: 빗변 5, 정사각형 네 꼭짓점이 직각, □ADEB = □BFKJ
{
  const d = build({ extra: true });
  assert.strictEqual(d.notes[0], "BC² = AB² + AC² = 9 + 16 = 25, BC = 5");
  assert.strictEqual(d.notes[1], "□ADEB = □BFKJ = 9, □ACHI = □JKGC = 16");
  const P = (n) => text(d, n).at.map((v) => v / 10);
  near(Math.hypot(...[0, 1].map((i) => P("A")[i] - P("B")[i])), 3, "AB");
  near(Math.hypot(...[0, 1].map((i) => P("D")[i] - P("A")[i])), 3, "AD");
  near((P("D")[0] - P("A")[0]) * (P("B")[0] - P("A")[0]) + (P("D")[1] - P("A")[1]) * (P("B")[1] - P("A")[1]), 0, "AD ⊥ AB");
  near(P("F")[1], -5, "square under BC");
  // 바깥쪽: D는 C에서 멀리
  assert.ok(Math.hypot(P("D")[0] - 5, P("D")[1]) > 5, "square ADEB is outside");
  // 칠한 두 도형의 넓이가 같다
  const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i].anchor, q = pts[(i + 1) % pts.length].anchor; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s) / 2 / 100; };
  near(area(d.fills[0]), 9, "□ADEB");
  near(area(d.fills[1]), 9, "□BFKJ");
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 3, "AK, CD, AF");
}
// 평행선: 간격 2:3이면 두 직선 위의 비가 모두 2:3
{
  const d = build({ kind: 1, p: [2, 3, 65, 105] });
  assert.ok(d.notes[0].endsWith("2 : 3"));
  const P = (n) => text(d, n).at;
  const ratio = (a, b, c) => Math.hypot(P(a)[0] - P(b)[0], P(a)[1] - P(b)[1]) / Math.hypot(P(b)[0] - P(c)[0], P(b)[1] - P(c)[1]);
  near(ratio("A", "B", "C"), 2 / 3, "AB:BC");
  near(ratio("A′", "B′", "C′"), 2 / 3, "A′B′:B′C′");
  assert.ok(["l", "m", "n"].every((n) => text(d, n)));
}
// 사다리꼴: AD 4, BC 8, AE:AB = 40% → EF = 5.6, EG = 3.2, GF = 2.4
{
  const d = build({ kind: 2, p: [4, 8, 40, 0], extra: true });
  assert.strictEqual(d.notes[0], "EF = AD + (BC - AD) × AE/AB = 28/5");
  assert.strictEqual(d.notes[1], "EG = BC × AE/AB = 16/5, GF = AD × EB/AB = 12/5");
  const P = (n) => text(d, n).at;
  near(P("E")[1], P("F")[1], "EF is horizontal");
}
// 넓이 모형: a² - b²
{
  const d = build({ kind: 3, p: [5, 2, 0, 0], extra: true });
  assert.strictEqual(d.notes[0], "a² - b² = (a+b)(a-b) = 21 (a = 5, b = 2)");
  assert.strictEqual(d.fills.length, 2);
  assert.ok(text(d, "(가)").symbol && text(d, "(나)").symbol);
  assert.ok(build({ kind: 3, p: [3, 5, 0, 0] }).notes[0].startsWith("b는 a보다"));
}
// 곱셈 공식
assert.deepStrictEqual(g.productText("a", "a"), { text: "a2", sup: [1] });
assert.deepStrictEqual(g.productText("b", "a"), { text: "ab", sup: [] });
assert.deepStrictEqual(g.productText("x", "3"), { text: "3x", sup: [] });
assert.deepStrictEqual(g.productText("2a", "3b"), { text: "6ab", sup: [] });
assert.deepStrictEqual(g.productText("2", "3"), { text: "6", sup: [] });
assert.strictEqual(build({ kind: 4, p: [3, 2, 3, 2] }).notes[0], "(a+b)(a+b) = a²+2ab+b²");
assert.strictEqual(build({ kind: 4, p: [3, 2, 3, 1], across: "x,2", down: "x,3" }).notes[0], "(x+2)(x+3) = x²+5x+6");
assert.strictEqual(build({ kind: 4, p: [3, 2, 3, 2], across: "a,b", down: "c,d" }).notes[0], "(a+b)(c+d) = ac+bc+ad+bd");

// 원 묶음: 한 줄 3개(r=3) → 선분 24 + 호 6π, 삼각형 3개 → 선분 18 + 6π, 2×2 → 선분 24 + 6π
{
  const one = build({ kind: 5, p: [3, 3, 0, 0] });
  assert.strictEqual(one.notes[0], "끈 길이 = 선분 24 + 호 6π = 6π + 24");
  assert.strictEqual(build({ kind: 6, p: [3, 2, 0, 0] }).notes[0], "끈 길이 = 선분 18 + 호 6π = 6π + 18");
  assert.strictEqual(build({ kind: 7, p: [3, 2, 2, 0] }).notes[0], "끈 길이 = 선분 24 + 호 6π = 6π + 24");
  assert.strictEqual(build({ kind: 6, p: [3, 3, 0, 0] }).notes[1], "원 6개, 반지름 3 (호를 모으면 원 한 바퀴)");
}
// 끈은 모든 원에 바깥에서 닿는다: 끈 위의 점은 가장 가까운 중심에서 거리가 반지름 이상, 선분 가운데는 정확히 반지름
{
  const centers = g.circleLayout(6, [1, 3]);
  const hull = g.convexHull(centers);
  assert.strictEqual(hull.length, 3, "triangle hull");
  const belt = g.beltPoints(hull, 1);
  let straightCount = 0;
  for (let i = 0; i < belt.length; i++) {
    const P = belt[i], Q = belt[(i + 1) % belt.length];
    if (P.right !== P.anchor || Q.left !== Q.anchor) continue;   // 호 조각은 건너뛴다
    straightCount++;
    const m = [(P.anchor[0] + Q.anchor[0]) / 2, (P.anchor[1] + Q.anchor[1]) / 2];
    const nearest = Math.min(...centers.map((c) => Math.hypot(c[0] - m[0], c[1] - m[1])));
    near(nearest, 1, "straight part touches at radius");
  }
  assert.strictEqual(straightCount, 3, "one straight part per hull side");
  // 호 조각의 앵커는 모두 어느 원 위에 있다
  for (const pt of belt) near(Math.min(...centers.map((c) => Math.hypot(c[0] - pt.anchor[0], c[1] - pt.anchor[1]))), 1, "anchor on a circle");
  const row = g.beltPoints(g.convexHull(g.circleLayout(5, [1, 3])), 1);
  const ys = row.map((p) => p.anchor[1]);
  near(Math.max(...ys), 1, "top of belt");
  near(Math.min(...ys), -1, "bottom of belt");
  const xs = row.map((p) => p.anchor[0]);
  near(Math.min(...xs), -1, "left of belt");
  near(Math.max(...xs), 5, "right of belt");
}

assert.ok(source.includes('var PREF_KEY = "MiddleFigureProblem/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("figure problem checks passed");
