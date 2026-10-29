const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "FigureProblem" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "중학교 수학.jsx"), "utf8");
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
  "arcPoints", "join", "polyline", "splitNames", "productText", "splitTerm", "expansionText", "numText", "rootText", "formatValue",
  "bagPoints", "roundRectPoints", "pipSpots", "fractionText", "spinnerPoint"];
const g = new Function(`var RIGHT_MARK_MM = 1.5;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { kind: 0, p: [3, 4, 0, 0], across: "a,b", down: "a,b", cards: "1,2,3,4,5,6,7", unit: 10, names: true, guides: true, lengths: true, extra: false };
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

// 확률: 공 주머니 12개(한 줄 4개) → 번호 1~12, 주머니 켜면 선 하나 더
{
  const d = build({ kind: 8, p: [12, 4, 0, 0], extra: false });
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  assert.strictEqual(d.lines.length, 12);
  assert.strictEqual(build({ kind: 8, p: [12, 4, 0, 0], extra: true }).lines.length, 13);
  // 마지막 줄이 모자라면 가운데로: 5개를 4개씩 → 다섯째 공은 x = 0
  const five = build({ kind: 8, p: [5, 4, 0, 0] });
  near(five.texts[4].at[0], 0, "last row centered");
}
// 숫자 카드: 글자 목록대로 카드, 두 자리 수 경우의 수
{
  const d = build({ kind: 9, cards: "0, 1,2,3" });
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["0", "1", "2", "3"]);
  assert.strictEqual(d.lines.length, 4);
  assert.ok(d.notes[0].startsWith("카드 4장: 두 장으로 만드는 두 자리 수 최대 12가지"));
}
// 주사위: 눈 개수와 합
{
  const d = build({ kind: 10, p: [2, 3, 5, 6] });
  assert.strictEqual(d.pips.length, 3 + 5);
  assert.strictEqual(d.notes[0], "눈 3, 5 (합 8), 모든 경우의 수 36");
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6].map((v) => g.pipSpots(v).length), [1, 2, 3, 4, 5, 6]);
}
// 갈림길 2번: A 1/4, B 1/2, C 1/4 (기출 2학년 2학기 20번)
{
  const d = build({ kind: 11, p: [2, 0, 0, 0], extra: true });
  assert.strictEqual(d.notes[0], "끝 지점에 갈 확률: A 1/4, B 1/2, C 1/4 (갈림 2번, 갈림길마다 1/2)");
  assert.strictEqual(d.texts.filter((t) => t.text === "1/2").length, 6);
  assert.strictEqual(d.lines.length, 1 + 2 + 4);
  assert.strictEqual(build({ kind: 11, p: [3, 0, 0, 0] }).notes[0], "끝 지점에 갈 확률: A 1/8, B 3/8, C 3/8, D 1/8 (갈림 3번, 갈림길마다 1/2)");
  assert.strictEqual(g.fractionText(6, 16), "3/8");
  assert.strictEqual(g.fractionText(4, 4), "1");
}
// 둥근 직사각형은 닫힌 고리로 네 모서리 호 (앵커 8개)
assert.strictEqual(g.roundRectPoints([0, 0], 20, 28, 3).length, 8);

assert.ok(source.includes('var PREF_KEY = "MiddleFigureProblem/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
// 선 두께: "/lines"는 v2 + LINE_KEYS 9칸(10필드). v1(축·그래프·보조선)도 읽고, 필드 수가 다르면 무시한다
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const lineKeys = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
  assert.ok(source.includes('var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];'), "LINE_KEYS order");
  assert.ok(source.indexOf("var LINE_KEYS") < source.indexOf("loadLineWidths();"), "LINE_KEYS must exist before loadLineWidths runs");
  const body = `var PREF_KEY = "T";\n${source.match(/var [A-Z_]+_PT = [\d.]+;/g).join("\n")}\n` +
    `${source.match(/var LINE_KEYS = [^;]+;/)[0]}\n${source.match(/var LINE_DEFAULTS = [^;]+;/)[0]}\n` +
    `${["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction).join("\n")}\n` +
    "return { LINE_DEFAULTS, setLineWidth, currentLineWidth, loadLineWidths, saveLineWidths };";
  const make = () => new Function("app", body)(app);
  const lw = make();
  const own = Object.keys(lw.LINE_DEFAULTS);
  assert.deepStrictEqual(own.slice().sort(), ["graph", "guide", "mark"].slice().sort(), "LINE_DEFAULTS groups");
  const values = [0.5, 0.6, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9];
  for (const key of own) assert.strictEqual(lw.currentLineWidth(key), lw.LINE_DEFAULTS[key], `${key} default`);
  for (const key of own) lw.setLineWidth(key, values[lineKeys.indexOf(key)]);
  for (const key of own) assert.strictEqual(lw.currentLineWidth(key), values[lineKeys.indexOf(key)], `${key} has its own width`);
  lw.saveLineWidths();
  const saved = store["T/lines"].split("|");
  assert.strictEqual(saved.length, 10);
  assert.strictEqual(saved[0], "v2");
  lineKeys.forEach((key, i) => assert.strictEqual(saved[i + 1], own.includes(key) ? String(values[i]) : "", `saved ${key}`));
  const again = make();
  again.loadLineWidths();
  for (const key of own) assert.strictEqual(again.currentLineWidth(key), values[lineKeys.indexOf(key)], `reload ${key}`);
  store["T/lines"] = "v1|1.2|1.4|5";
  const old = make();
  old.loadLineWidths();
  for (const key of own) assert.strictEqual(old.currentLineWidth(key), { axis: 1.2, graph: 1.4, guide: 2 }[key] || old.LINE_DEFAULTS[key], `v1 ${key}`);
  store["T/lines"] = "v2|1.2|1.4|1.6|1.8";
  const odd = make();
  odd.loadLineWidths();
  for (const key of own) assert.strictEqual(odd.currentLineWidth(key), odd.LINE_DEFAULTS[key], `5-field v2 is ignored: ${key}`);
}
// 직각 표시·반지름 선(kind "thin")은 표시 두께
assert.strictEqual(build({}).lines.filter((l) => l.kind === "thin").length, 1, "right-angle mark at A");
assert.strictEqual(build({ kind: 5, p: [3, 3, 0, 0] }).lines.filter((l) => l.kind === "thin").length, 1, "radius mark");
assert.ok(source.includes('line.kind === "main" ? MAIN_PT : (line.kind === "thin" ? MARK_PT : GUIDE_PT)'), "thin marks drawn with MARK_PT");
// 회전판 (웹 math-figure-problem.test.js와 같은 경우): 12시에서 시계 방향으로 나눈 칸, 칸 글자, *로 칠한 칸, 글자별 확률
{
  const d = build({ kind: 12, p: [4, 30, 0, 0], spinner: "1,1,2*,3", extra: false });
  assert.strictEqual(d.lines.length, 5);
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["1", "1", "2", "3"]);
  assert.strictEqual(d.fills.length, 1);
  assert.strictEqual(d.notes[0], "칸 4개: 1 → 1/2, 2 → 1/4, 3 → 1/4");
  const at = (i) => d.texts[i].at;
  assert.ok(at(0)[0] > 0 && at(0)[1] > 0 && at(3)[0] < 0 && at(3)[1] > 0);
  const fx = d.fills[0].reduce((s, p) => s + p.anchor[0], 0), fy = d.fills[0].reduce((s, p) => s + p.anchor[1], 0);
  assert.ok(fx < 0 && fy < 0, "셋째 칸이 왼쪽 아래");
  assert.deepStrictEqual(build({ kind: 12, p: [3, 30, 0, 0], spinner: "A" }).texts.map((t) => t.text), ["A"]);
  assert.deepStrictEqual(build({ kind: 12, p: [2, 30, 0, 0], spinner: "A,B,C" }).texts.map((t) => t.text), ["A", "B"]);
  const n = build({ kind: 12, p: [6, 90, 0, 0], spinner: "1,2,3,4,5,6", extra: true });
  assert.deepStrictEqual([n.lines.length, n.dots.length, n.pips.length], [8, 1, 1]);
  const tip = n.pips[0].reduce((best, p) => (p.anchor[0] > best[0] ? p.anchor : best), [-Infinity, 0]);
  assert.ok(tip[0] > 0 && Math.abs(tip[1]) < 1e-6 && tip[0] < Math.hypot(...n.texts[0].at) - 2, "바늘은 3시 방향, 칸 글자보다 안쪽");
}
// 저장: v4(15칸, 음영 색)로 쓰고, 회전판 칸 글자까지의 v3(14칸)·회전판이 생기기 전 v2(13칸, 종류 12개)도 수치까지 읽는다
{
  const kindsDecl = source.slice(source.indexOf("var KINDS = ["), source.indexOf("];", source.indexOf("var KINDS = [")) + 2);
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const make = () => new Function("app", [
    'var PREF_KEY = "T", PARAM_COUNT = 4, POSITION_LIMIT_MM = 100;', kindsDecl,
    'var FLAG_KEYS = ["names", "guides", "lengths", "extra"], opt = {names: true, guides: true, lengths: true, extra: false};',
    "var params = []; for (var k = 0; k < KINDS.length; k++) { params.push([]); for (var i = 0; i < PARAM_COUNT; i++) params[k].push(KINDS[k].params[i] ? KINDS[k].params[i][4] : 0); }",
    'var kind = 0, piecesAcross = "a,b", piecesDown = "a,b", cardText = "1,2,3,4,5,6,7", spinnerText = "1,2,3,4,5,6", unitMm = 6, shadeK = 20, fontPt = 8, offsetXmm = 0, offsetYmm = 0, previewEnabled = true, shadeTone = 0;',
    "function saveLineWidths() {} function shadeTones() { return [0, 1, 2, 3, 4, 5, 6]; }",
    ...["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].filter((n) => source.includes(`function ${n}(`)).map(extractFunction),
    "return { load: applySettings, save: saveSettings, state: function() { return { kind: kind, params: params, spinnerText: spinnerText, cardText: cardText, shadeTone: shadeTone }; } };",
  ].join("\n"))(app);
  const v2groups = Array.from({ length: 12 }, (_, k) => (k === 11 ? "3,0,0,0" : "")).map((v, k) => v || "0,0,0,0");
  store.T = ["v2", 11, v2groups.join(";"), "a,b", "a,b", 6, 20, 8, "1100", 0, 0, "1", encodeURIComponent("1,2,3")].join("|");
  const old = make();
  old.load();
  assert.strictEqual(old.state().kind, 11);
  assert.strictEqual(old.state().params[11][0], 3, "v2 갈림 횟수");
  assert.strictEqual(old.state().cardText, "1,2,3");
  assert.strictEqual(old.state().spinnerText, "1,2,3,4,5,6", "v2에는 회전판 글자가 없어 기본값");
  old.save();
  const saved = store.T.split("|");
  assert.deepStrictEqual([saved[0], saved.length, saved[2].split(";").length], ["v4", 15, 13]);
  store.T = saved.slice(0, 13).concat([encodeURIComponent("A,B*"), "4"]).join("|");
  const again = make();
  again.load();
  assert.strictEqual(again.state().spinnerText, "A,B*");
  assert.strictEqual(again.state().shadeTone, 4, "음영 색 복원");
  store.T = saved.slice(0, 13).concat([encodeURIComponent("A,B*")]).join("|").replace(/^v4/, "v3");
  const fromV3 = make();
  fromV3.load();
  assert.strictEqual(fromV3.state().spinnerText, "A,B*");
  assert.strictEqual(fromV3.state().shadeTone, 0, "v3는 음영 색만 처음 값으로");
}
require("./es3-lint")(extractFunction("buildFigure") + extractFunction("spinnerPoint"), "도형 문제 회전판");
console.log("figure problem checks passed");
