const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(기하.jsx)의 "도형" 탭 엔진에서 글 읽기·그림 계산 함수만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "기하.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeGeometryEngine(");
  assert.ok(start >= 0, "missing engine: makeGeometryEngine");
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

const names = ["evalNumber", "splitItems", "tokenizeNames", "readPoints", "readChains", "readPairTexts", "circumcircle", "readCircles", "readEllipses", "readAngles", "trimText", "curvePoints", "ccwSweep", "readArcs", "readFills",
  "display", "straight", "circleLine", "unitVector", "offsetPoint", "arcPoints", "rightAnglePoints", "buildGeometry", "clamp", "parseNumber"];
const make = new Function("state", `
var MM_TO_PT = 2.834645669, MARK_GAP_MM = 0.7, KAPPA = 0.5522847498;
var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
var text = state.text, showNames = state.showNames, showAxes = state.showAxes, sizeMm = state.sizeMm, arcRadiusMm = 3, tickMm = 1.6;
${names.map(extractFunction).join("\n")}
return {${names.join(",")}};`);
const api = (text = {}, extra = {}) => make(Object.assign({
  text: Object.assign({ pointsText: "", segmentText: "", dashedText: "", circleText: "", ellipseText: "", arrowText: "", arcText: "", fillText: "", angleText: "", tickText: "", lengthText: "", dotText: "", labelDirText: "" }, text),
  showNames: true, showAxes: false, sizeMm: 50,
}, extra));
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 숫자 식
{
  const g = api();
  near(g.evalNumber("2√3/3"), 2 * Math.sqrt(3) / 3, "2√3/3");
  near(g.evalNumber("√13"), Math.sqrt(13), "√13");
  near(g.evalNumber("1/2"), 0.5, "1/2");
  near(g.evalNumber("π/3"), Math.PI / 3, "π/3");
  near(g.evalNumber("-(1+2)"), -3, "-(1+2)");
  assert.strictEqual(g.evalNumber("abc"), null);
  assert.strictEqual(g.evalNumber("1/0"), null);
}

// 직각삼각형: 선분 3개, 직각 표시 1개, 점 이름 3개, 변 길이 2개
{
  const g = api({ pointsText: "A(0,3) B(0,0) C(4,0)", segmentText: "A-B-C-A", angleText: "ABC:R", lengthText: "AB:3, BC:4" });
  const d = g.buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.filter((l) => l.kind === "main").length, 3);
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 1);
  const labels = d.texts.map((t) => t.text);
  for (const n of ["A", "B", "C", "3", "4"]) assert.ok(labels.includes(n), n);
  // 가장 긴 쪽(4)이 sizeMm(50)
  const xs = d.lines.filter((l) => l.kind === "main").flatMap((l) => l.points.map((p) => p.anchor[0]));
  near(Math.max(...xs) - Math.min(...xs), 50 * 2.834645669, "크기");
}

// 원: 세 점·지름·중심+반지름·중심+지나는 점, 각 호 2겹, 아래첨자
{
  const g = api({ pointsText: "A(0,0) B(4,0) C(2,2) O_1(2,0)", circleText: "ABC, AB, O_1:2, O_1~C", angleText: "BAC:45°:2", dotText: "O_1" });
  const d = g.buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.lines.filter((l) => l.closed).length, 4);
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 2);
  assert.strictEqual(d.dots.length, 1);
  const sub = d.texts.find((t) => t.text === "O1");
  assert.ok(sub && sub.sub.length === 1 && sub.sub[0] === 1, "O₁ 아래첨자");
  const angle = d.texts.find((t) => t.text === "45°");
  assert.ok(angle && angle.clear > 0 && angle.halfAngle > 0, "각 글자");
}

// 못 읽는 항목은 notes에 남기고 나머지는 그린다
{
  const g = api({ pointsText: "A(0,0) B(1,0) X", segmentText: "A-B-Q", circleText: "AB~", lengthText: "AB" });
  const d = g.buildGeometry();
  assert.ok(d.notes.length >= 3, d.notes.join("|"));
}
// 타원과 좌표축: 타원 1개(가로로 긴 베지어), 축 2개, 화살촉 2개, x·y·O
{
  const g = api({ pointsText: "F(4,0) G(-4,0) A(6,0)", ellipseText: "6x√20" }, { showAxes: true });
  const d = g.buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const ellipse = d.lines.find((l) => l.closed && l.points.length === 4);
  assert.ok(ellipse, "타원");
  const w = Math.abs(ellipse.points[0].anchor[0] - ellipse.points[2].anchor[0]), h = Math.abs(ellipse.points[1].anchor[1] - ellipse.points[3].anchor[1]);
  near(w / h, 12 / (2 * Math.sqrt(20)), "타원 비율");
  assert.strictEqual(d.lines.filter((l) => l.kind === "axis").length, 2);
  assert.strictEqual(d.arrows.length, 2);
  const labels = d.texts.map((t) => t.text);
  for (const n of ["x", "y", "O", "F", "G", "A"]) assert.ok(labels.includes(n), n);
  assert.ok(api({ pointsText: "A(0,0)", ellipseText: "6" }).buildGeometry().notes.length > 0, "못 읽는 타원");
}
// 화살표 선분·호·색칠
{
  const g = api({ pointsText: "O(0,0) A(-2,0) B(2,0)", arrowText: "O-B", arcText: "O:A<B, AB:d", fillText: "A>arc+(O,B):30, circle(O,A)" });
  const d = g.buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  assert.strictEqual(d.arrows.length, 1);
  const fills = d.lines.filter((l) => l.kind === "fill");
  assert.deepStrictEqual(fills.map((l) => l.fillK), [30, 20]);
  assert.strictEqual(d.lines[0].kind, "fill");                         // 색칠이 맨 아래
  // O:A<B: A(왼)에서 B(오른)로 시계 → 위쪽을 지난다. AB:d: 아래쪽 반원
  const arcs = d.lines.filter((l) => l.kind === "main" && !l.closed && l.points.length > 8);
  assert.strictEqual(arcs.length, 2);
  const midY = (l) => l.points[Math.floor(l.points.length / 2)].anchor[1];
  assert.ok(midY(arcs[0]) > 0 && midY(arcs[1]) < 0, "위쪽 호·아래쪽 반원");
  assert.ok(api({ pointsText: "O(0,0) A(1,0)", arcText: "O:A>X", fillText: "A>O" }).buildGeometry().notes.length === 2);
}
console.log("geometry checks passed");
