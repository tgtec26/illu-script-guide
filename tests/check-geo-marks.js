const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "GeoMarks" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeGeoMarksEngine(");
  assert.ok(start >= 0, "missing engine: makeGeoMarksEngine");
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

const names = ["dedupePoints", "orderVertices", "signedArea", "vertexNames", "buildMarks", "angleSpan",
  "arcPath", "rightAnglePath", "linePath", "offsetPoint", "sub", "unit", "dimensionCurve"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);
const opt = (extra) => Object.assign({ names: null, vertexMarks: [], vertexTexts: [], sideMarks: [], sideTexts: [],
  arcRadius: 10, gap: 2, tick: 4, labelGap: 3 }, extra);

// 삼각형: 맨 위가 A, 반시계(B 왼쪽 아래, C 오른쪽 아래). 패스가 시계 방향이어도 같다
const tri = [[50, 0], [0, 0], [20, 40]];
const ordered = g.orderVertices(tri.slice().reverse(), true, false);
assert.deepStrictEqual(ordered, [[20, 40], [0, 0], [50, 0]]);
assert.deepStrictEqual(g.orderVertices(tri, true, true), [[20, 40], [50, 0], [0, 0]], "clockwise keeps A on top");
assert.deepStrictEqual(g.vertexNames("A", 3), ["A", "B", "C"]);
assert.deepStrictEqual(g.dedupePoints([[0, 0], [1, 0], [1, 0], [0, 1], [0, 0]], true), [[0, 0], [1, 0], [0, 1]]);

// 평행사변형은 위쪽 두 점 중 왼쪽이 A
assert.deepStrictEqual(g.orderVertices([[0, 0], [40, 0], [50, 30], [10, 30]], true, false)[0], [10, 30]);

// 꼭짓점 이름은 바깥쪽, 각 글자는 안쪽
{
  const m = g.buildMarks(ordered, true, opt({ names: ["A", "B", "C"], vertexMarks: [1, 0, 0], vertexTexts: ["", "60°", ""] }));
  const b = m.texts.find((t) => t.text === "B");
  assert.ok(b.dir[0] < 0 && b.dir[1] < 0, "B label goes down-left");
  const a = m.texts.find((t) => t.text === "A");
  assert.ok(a.dir[1] > 0 && a.upright, "A label goes up and stays upright");
  const angle = m.texts.find((t) => t.text === "60°");
  assert.ok(angle.dir[0] > 0 && angle.dir[1] > 0, "angle text sits inside at B");
  assert.strictEqual(m.paths.length, 1);
  // 호 끝점은 두 변 위, 반지름 10
  const pts = m.paths[0].points;
  for (const p of [pts[0].anchor, pts[pts.length - 1].anchor]) near(Math.hypot(p[0] - 20, p[1] - 40), 10, "arc radius");
  // A에서 B쪽(아래 왼쪽)과 C쪽(아래 오른쪽) 사이. 호 가운데는 아래
  const midArc = pts[Math.floor(pts.length / 2)].anchor;
  assert.ok(midArc[1] < 40, "arc bulges into the triangle");
}

// 사각형 직각: 안쪽 정사각형 꺾은선
{
  const sq = g.orderVertices([[0, 0], [10, 0], [10, 10], [0, 10]], true, false);   // A=(0,10) B=(0,0)
  const m = g.buildMarks(sq, true, opt({ vertexMarks: [0, 4], arcRadius: 10 }));
  assert.deepStrictEqual(m.paths[0].points.map((p) => p.anchor.map((v) => Math.round(v * 1000) / 1000)), [[7, 0], [7, 7], [0, 7]]);
}

// 오목 도형의 오목 꼭짓점은 큰 각(>180°)
{
  const dart = [[0, 0], [10, 5], [20, 0], [10, 20]];
  const turn = g.signedArea(dart) < 0 ? -1 : 1;
  const span = g.angleSpan([10, 5], [0, 0], [20, 0], turn, true);
  assert.ok(span.sweep > Math.PI, "reflex angle at the dent");
}

// 열린 패스는 작은 각
{
  const span = g.angleSpan([0, 0], [10, 0], [0, 10], -1, false);
  near(span.sweep, Math.PI / 2, "open path uses the smaller angle");
}

// 변 눈금·평행·글자: 바깥 법선
{
  const sq = g.orderVertices([[0, 0], [10, 0], [10, 10], [0, 10]], true, false);   // 변 AB = 왼쪽 변
  const m = g.buildMarks(sq, true, opt({ sideMarks: [2, 5, 0, 0], sideTexts: ["6 cm", "", "", ""] }));
  assert.strictEqual(m.paths.length, 4, "two ticks + two chevrons");
  const label = m.texts[0];
  assert.deepStrictEqual(label.dir.map((v) => Math.round(v) + 0), [-1, 0], "left side label goes left");
  const tick = m.paths[0].points.map((p) => p.anchor);
  near(tick[0][1], tick[1][1], "tick is perpendicular to vertical side");
  near(Math.abs(tick[0][0] - tick[1][0]), 4, "tick length");
}

// 평행사변형의 마주 보는 변 평행 표시는 같은 쪽을 가리킨다
{
  const pg = g.orderVertices([[0, 0], [40, 0], [50, 30], [10, 30]], true, false);   // A 왼쪽 위
  const m = g.buildMarks(pg, true, opt({ sideMarks: [4, 0, 4, 0] }));
  const tipDir = (path) => path.points[1].anchor[1] - path.points[0].anchor[1] + (path.points[1].anchor[1] - path.points[2].anchor[1]);
  assert.ok(tipDir(m.paths[0]) > 0 && tipDir(m.paths[1]) > 0, "both chevrons point up");
}

assert.ok(source.includes('var PREF_KEY = "GeoMarks/settings";'));
assert.ok(source.includes("\\u02D8"), "degree sign uses the GSMediumB1 glyph");
// 선 두께 패널: 도형 선 맞춤 체크 + 표기 행, 위치 패널 바로 앞. 범위·저장 위치는 그대로
{
  const panel = source.indexOf('var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");');
  assert.ok(panel > 0, "선 두께 panel");
  assert.ok(panel < source.indexOf('var normalizeCheck = lineWidthPanel.add("checkbox"'), "normalize check inside it");
  assert.ok(source.includes('var strokeControls = addValueRow(lineWidthPanel, "표기", "pt", strokePt, 0.1, 1, 0.05, 2);'), "표기 row");
  assert.ok(source.indexOf('var strokeControls') < source.indexOf('var positionPanel = addPanel(win, "위치");'), "before 위치");
  assert.ok(!source.includes("sizePanel.add(\"checkbox\"") && !source.includes('addValueRow(sizePanel, "선 두께"'), "moved out of 크기");
  assert.ok(source.includes("strokePt = restoreNumber(p[8], strokePt, 0.1, 1);"), "still saved in the main settings");
}
// 점선 치수선(기하.jsx와 같은 모양): 변 글자는 바깥쪽으로 높이만큼 부푼 곡선의 꼭대기 가운데, 곡선은 꼭짓점에서 물러난 베지어 하나
{
  const sq = [[0, 40], [0, 0], [40, 0], [40, 40]];
  assert.strictEqual(g.buildMarks(sq, true, opt({ sideTexts: ["", "6 cm", "", ""] })).texts[0].dimension, undefined, "off by default");
  const m = g.buildMarks(sq, true, opt({ sideMarks: [0, 1, 0, 0], sideTexts: ["", "6 cm", "", ""], dimensionRise: 5 }));
  const t = m.texts[0];
  assert.deepStrictEqual(t.at, [20, -5], "label at the top of the curve, outside");
  assert.deepStrictEqual(t.dir, [0, 0]);
  assert.deepStrictEqual(t.dimension, { a: [0, 0], b: [40, 0], normal: [0, -1], rise: 5, clear: 2 }, "clear: tick reach outside the side");
  assert.strictEqual(m.paths.length, 1, "tick stays on the side");
  const curve = g.dimensionCurve([0, 0], [40, 0], [0, -1], 5, 0.4);
  assert.strictEqual(curve.length, 1);
  const pts = curve[0].points;
  near(Math.hypot(pts[0].anchor[0], pts[0].anchor[1]), 0.4, "starts half a stroke away from the vertex");
  near(Math.hypot(pts[1].anchor[0] - 40, pts[1].anchor[1]), 0.4, "ends half a stroke away from the vertex");
  // 베지어 가운데(t=0.5)가 변 가운데에서 높이 5만큼 바깥
  const [p0, p1, p2, p3] = [pts[0].anchor, pts[0].right, pts[1].left, pts[1].anchor];
  const mid = [0, 1].map((k) => (p0[k] + 3 * p1[k] + 3 * p2[k] + p3[k]) / 8);
  near(mid[0], 20, "apex x");
  assert.ok(Math.abs(mid[1] + 5) < 0.01, "apex y " + mid[1]);
  assert.deepStrictEqual(g.dimensionCurve([0, 0], [0, 0], [0, -1], 5, 0.4), [], "zero-length side");
}

// 웹 생성기(sci-illu-web math-geo-marks.js)의 buildMarks와 글자 그대로 같다 (웹 저장소가 옆 폴더에 있을 때만)
{
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-geo-marks.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8");
    const start = web.indexOf("export function buildMarks(");
    const end = web.indexOf("\n}\n", start) + 2;
    // 스크립트는 4칸, 웹은 2칸 들여쓰기
    const scriptText = extractFunction("buildMarks").split("\n")
      .map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
    assert.strictEqual(scriptText, web.slice(start + "export ".length, end), "buildMarks differs from the web generator");
  }
}

console.log("geo marks checks passed");
