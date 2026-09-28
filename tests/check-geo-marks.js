const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "GeoMarks" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_MiddleMath.jsx"), "utf8");
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
  "arcPath", "rightAnglePath", "linePath", "offsetPoint", "sub", "unit"];
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
console.log("geo marks checks passed");
