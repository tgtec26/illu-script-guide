const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(기하.jsx)의 "Space" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "기하.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeSpaceEngine(");
  assert.ok(start >= 0, "missing engine: makeSpaceEngine");
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

const sceneNames = ["drawScene", "parseScene", "addProblem", "trimText", "splitItems", "splitLabel", "nameList", "planeInfo", "viewDirection", "splitHidden", "clipConvex", "cross3"];
const names = ["project", "buildSpace", "clipToPlane", "add3", "sub3", "scale3", "dot3", "unit3", "unit2", "fmt"].concat(sceneNames);
const g = new Function(`var DEPTH = { scale: 0.5, angle: 30 }, HIDE_EPS = 0.01;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { mode: 0, plane: 60, theta: 35, length: 40, height: 10, distance: 15, direction: 15, marks: true, names: true, projection: true, mark: 2 };
const build = (o) => g.buildSpace(Object.assign({}, base, o));

// 사투상: 깊이 1은 (0.5 cos 30°, 0.5 sin 30°)
near(g.project([0, 1, 0])[0], 0.5 * Math.cos(Math.PI / 6), "depth x");
near(g.project([0, 1, 0])[1], 0.25, "depth y");
assert.deepStrictEqual(g.project([3, 0, 4]), [3, 4]);

// 정사영: A′B′ = 40 cos 35°, 평면 1 + AB·A′B′·보조선 + 수선 2, 호, 직각 2
{
  const d = build({});
  assert.strictEqual(d.notes[0], "A′B′ = AB cos θ = 40 × cos 35° = " + g.fmt(40 * Math.cos(35 * Math.PI / 180)) + " (mm)");
  const texts = d.texts.map((t) => t.text);
  for (const n of ["α", "A", "B", "A′", "B′", "θ"]) assert.ok(texts.includes(n), n);
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 3, "AA′, BB′, AC");
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3, "θ arc + 2 right angles");
  assert.strictEqual(d.dots.length, 4);
  // 높이 0이면 AA′ 점선이 없다
  assert.strictEqual(build({ height: 0 }).lines.filter((l) => l.kind === "guide").length, 2);
}
// 삼수선: PM = √(10² + 15²), 직각 표시 3개, l은 평면 안
{
  const d = build({ mode: 1 });
  assert.ok(d.notes.includes("PM = √(PH² + HM²) = " + g.fmt(Math.sqrt(325)) + " (mm)"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3);
  for (const n of ["P", "H", "M", "l"]) assert.ok(d.texts.some((t) => t.text === n), n);
  const ends = g.clipToPlane([10, 10, 0], [1, 0, 0], 60, 45);
  assert.deepStrictEqual(ends, [[0, 10, 0], [60, 10, 0]]);
  assert.strictEqual(g.clipToPlane([10, 50, 0], [1, 0, 0], 60, 45), null);
}
// 두 평면: 평면 2개, 각 θ, 정사영 선택
{
  const d = build({ mode: 2, theta: 60 });
  assert.strictEqual(d.lines.filter((l) => l.kind === "plane").length, 2);
  assert.ok(d.notes[0].includes("S′ = S cos θ") && d.notes[0].includes("cos 60° = 0.5"));
  for (const n of ["α", "β", "l", "O", "θ", "Q", "Q′"]) assert.ok(d.texts.some((t) => t.text === n), n);
  const without = build({ mode: 2, projection: false, names: false, marks: false });
  assert.strictEqual(without.lines.filter((l) => l.kind === "mark").length, 1, "only the θ arc");
  assert.ok(!without.texts.some((t) => t.text === "O"));
}

// 자유 배치(모드 3): 웹 math-space.test.js와 같은 경우
{
  const scene = (o) => Object.assign({ points: "", planes: "", lines: "", guides: "", rights: "", angles: "", unit: 10 }, o);
  const s = g.parseScene(scene({ points: "A(0,0,0) B(6,0,0), C(6,4.5,0); _D(0,-4,0) A′(1,2,3)" }));
  assert.deepStrictEqual(s.problems, []);
  assert.deepStrictEqual(s.points.map((q) => q.name), ["A", "B", "C", "D", "A′"]);
  assert.deepStrictEqual(s.points[2].p, [60, 45, 0]);
  assert.deepStrictEqual(s.points.map((q) => q.hidden), [false, false, false, true, false]);
  assert.deepStrictEqual(g.parseScene(scene({ points: "A(0,0)" })).problems, ["점"]);
  const t = g.parseScene(scene({ points: "A(0,0,0) B(6,0,0) C(6,4,0) D(0,4,0) A′(1,1,3) B′(5,1,3)", planes: "α: A B C D", lines: "AB, l: C D, A′B′", guides: "AA′, B B′", rights: "A A′ B′", angles: "θ: BAA′" }));
  assert.deepStrictEqual(t.problems, []);
  assert.deepStrictEqual(t.lines, [{ a: 0, b: 1, name: "" }, { a: 2, b: 3, name: "l" }, { a: 4, b: 5, name: "" }]);
  assert.deepStrictEqual(t.angles, [{ a: 1, b: 0, c: 4, label: "θ" }]);
  assert.deepStrictEqual(g.parseScene(scene({ points: "A(0,0,0)", lines: "AX" })).problems, ["선"]);
  const alpha = g.planeInfo([[0, 0, 0], [60, 0, 0], [60, 45, 0], [0, 45, 0]]);
  assert.strictEqual(g.planeInfo([[0, 0, 0], [1, 0, 0], [2, 0, 0]]), null);
  const hiddenLength = g.splitHidden([30, 20, -10], [30, 20, 30], [alpha], -1).filter((q) => q.hidden).reduce((sum, q) => sum + Math.abs(q.p[1][2] - q.p[0][2]), 0);
  assert.ok(Math.abs(hiddenLength - 5) < 0.01, "평면 뒤 구간 5mm");
  assert.ok(g.splitHidden([10, 10, 0], [50, 30, 0], [alpha], -1).every((q) => !q.hidden), "평면 위 선은 보인다");
  const d = build({ mode: 3, points: "A(0,0,0) B(6,0,0) C(6,4,0) D(0,4,0) P(3,2,3) H(3,2,0)", planes: "α: A B C D", lines: "PH", rights: "P H B", unit: 10, guides: "", angles: "" });
  assert.strictEqual(d.lines.filter((l) => l.kind === "plane").length, 1);
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 1);
  assert.strictEqual(d.dots.length, 6);
  for (const n of ["α", "P", "H"]) assert.ok(d.texts.some((q) => q.text === n), n);
  const behind = build({ mode: 3, points: "A(0,0,0) B(6,0,0) C(6,4.5,0) D(0,4.5,0) _P(3,2,-1) _Q(3,2,3)", planes: "α: A B C D", lines: "PQ", unit: 10, guides: "", rights: "", angles: "" });
  assert.ok(behind.lines.some((l) => l.kind === "guide"), "가려진 구간 점선");
  assert.deepStrictEqual(build({ mode: 3, points: "A(0,0,0) B(1,0,0)", lines: "AB, AX", unit: 10, planes: "", guides: "", rights: "", angles: "" }).problems, ["선"]);
  assert.deepStrictEqual(build({}).problems, [], "다른 모드는 읽을 글이 없다");
}
// 웹과 글자 그대로 같다 (buildSpace와 자유 배치 함수들, 들여쓰기만 다르다)
{
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-space.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8").replace(/^export function /gm, "function ");
    const cutWeb = (name) => {
      const start = web.indexOf(`function ${name}(`);
      assert.ok(start >= 0, "web missing " + name);
      let depth = 0;
      for (let i = web.indexOf("{", start); i < web.length; i++) {
        if (web[i] === "{") depth++;
        if (web[i] === "}" && --depth === 0) return web.slice(start, i + 1);
      }
      throw new Error("unbalanced " + name);
    };
    for (const name of ["buildSpace"].concat(sceneNames)) {
      const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
      assert.strictEqual(scriptText, cutWeb(name), name + " differs from the web");
    }
    assert.ok(web.includes("var HIDE_EPS = 0.01;") && source.includes("var HIDE_EPS = 0.01;"), "HIDE_EPS same");
  }
}
// 설정 v2 저장·복원 (자유 배치 글 여섯 칸과 한 칸 mm)
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const prelude = `var PREF_KEY = "T", POSITION_LIMIT_MM = 100, MODES = ["a", "b", "c", "d"], FLAG_KEYS = ["marks", "names", "projection"], opt = { marks: true, names: true, projection: true };
    var mode = 0, planeMm = 60, thetaDeg = 35, lengthMm = 40, heightMm = 10, distanceMm = 15, directionDeg = 15, fontPt = 9, unitMm = 10,
    pointsText = "p", planesText = "q", linesText = "r", guidesText = "", rightsText = "", anglesText = "", offsetXmm = 0, offsetYmm = 0, previewEnabled = true; function saveLineWidths() {}`;
  const body = prelude + ["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction).join("\n") +
    `return { saveSettings, applySettings, set: function() { mode = 3; unitMm = 12; pointsText = "A(0,0,0) B(1,1,1)"; planesText = "α: A B C"; linesText = "l: A B"; guidesText = "AB"; rightsText = "A B C"; anglesText = "θ: A B C"; opt.names = false; },
      get: function() { return [mode, unitMm, pointsText, planesText, linesText, guidesText, rightsText, anglesText, opt.names]; } };`;
  const make = () => new Function("app", body)(app);
  const first = make(); first.set(); first.saveSettings();
  assert.strictEqual(store.T.split("|").length, 20);
  assert.strictEqual(store.T.split("|")[0], "v2");
  const again = make(); again.applySettings();
  assert.deepStrictEqual(again.get(), [3, 12, "A(0,0,0) B(1,1,1)", "α: A B C", "l: A B", "AB", "A B C", "θ: A B C", false]);
  store.T = "v1|0|60|35|40|10|15|15|9|111|0|0|1";
  const old = make(); old.applySettings();
  assert.strictEqual(old.get()[0], 0, "옛 v1 설정은 무시한다");
}

assert.ok(source.includes('var PREF_KEY = "HighGeometrySpace/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");// 선 두께 역할: 엔진의 상수·LINE_DEFAULTS·LINE_KEYS와 저장 함수를 잘라 가짜 app.preferences로 돌린다
function lineWidthStore(constNames, raw) {
  const decl = (name) => { const at = source.indexOf(`var ${name} = `); assert.ok(at >= 0, name); return source.slice(at, source.indexOf("\n", at)); };
  const writes = [];
  const app = { preferences: { getStringPreference: () => raw, setStringPreference: (key, value) => writes.push(value) } };
  const current = new Function("app", ['var PREF_KEY = "T";'].concat(constNames.map(decl), [decl("LINE_DEFAULTS"), decl("LINE_KEYS")],
    ["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction), ["loadLineWidths(); saveLineWidths(); return currentLineWidth;"]).join("\n"))(app);
  return { current, saved: writes[0] };
}
function paintWidths(constText, kinds, flat) {
  const made = [];
  const previewGroup = { pathItems: { add() { const p = { setEntirePath(a) { this.pathPoints = a.map(() => ({})); }, zOrder() {} }; made.push(p); return p; } } };
  const paint = new Function("previewGroup", constText + "var GRID_K=30,GUIDE_DASH=[2,1.5],MM_TO_PT=1;var StrokeCap={BUTTENDCAP:1},StrokeJoin={ROUNDENDJOIN:1,MITERENDJOIN:2,BEVELENDJOIN:3},ZOrderMethod={SENDTOBACK:1};function makeGray(k){return k;}" + extractFunction("addPath") + ";return addPath;")(previewGroup);
  const pts = flat ? [[0, 0], [1, 0]] : [{ anchor: [0, 0], left: [0, 0], right: [0, 0] }, { anchor: [1, 0], left: [1, 0], right: [1, 0] }];
  for (const kind of kinds) paint({ kind, points: pts });
  return made.map((p) => p.strokeWidth);
}
const lineWidthLabels = () => source.split('addValueRow(lineWidthPanel, "').slice(1).map((s) => s.slice(0, s.indexOf('"')));
{
  const consts = ["PLANE_PT", "MAIN_PT", "GUIDE_PT", "MARK_PT"];
  assert.strictEqual(lineWidthStore(consts, "").saved, "v2|0.4|0.8|0.3|||0.3|||");
  assert.strictEqual(lineWidthStore(consts, "v1|1|1.2|0.5").current("mark"), 0.3, "표시는 보조선과 따로");
  assert.deepStrictEqual(lineWidthLabels(), ["축", "그래프", "보조선", "표시"]);
  assert.deepStrictEqual(paintWidths("var MAIN_PT=0.8,PLANE_PT=0.41,GUIDE_PT=0.31,MARK_PT=0.33;", ["main", "plane", "guide", "mark"], true), [0.8, 0.41, 0.31, 0.33]);
}
// 겹침 풀기는 pt 좌표로 계산하니 mm 도면을 pt로 바꿔 넘겨야 한다 (안 바꾸면 점 이름이 엉뚱한 곳으로 밀린다)
{
  assert.ok(source.includes("untangleLabels(previewGroup, drawingInPoints(drawing))"), "untangle 호출은 pt로 바꾼 도면을 쓴다");
  const inPoints = new Function(`var MM_TO_PT = 2;\n${extractFunction("drawingInPoints")}\nreturn drawingInPoints;`)();
  const out = inPoints({ texts: [{ text: "H", at: [3, 4], dir: [-1, 0], upright: true }], lines: [{ points: [[1, 2], [3, 4]], closed: false, kind: "guide" }] });
  assert.deepStrictEqual(out.texts[0].at, [6, 8]);
  assert.strictEqual(out.texts[0].text, "H");
  assert.deepStrictEqual(out.texts[0].dir, [-1, 0]);
  assert.deepStrictEqual(out.lines[0].points, [[2, 4], [6, 8]]);
  assert.strictEqual(out.lines[0].kind, "guide");
}
console.log("space checks passed");

const tri=build({mode:1}).lines.filter(l=>l.closed&&l.kind==='main');
assert.strictEqual(tri.length,1);assert.strictEqual(tri[0].points.length,3);
assert.ok(source.includes('line.closed ? StrokeJoin.BEVELENDJOIN'));
