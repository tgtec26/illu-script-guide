const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(기하.jsx)의 "도형" 탭 엔진에서 글 읽기·그림 계산 함수만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "기하.jsx"), "utf8");
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
  "readChainPaths", "dimensionCurve", "display", "straight", "circleLine", "unitVector", "offsetPoint", "arcPoints", "rightAnglePoints", "buildGeometry", "clamp", "parseNumber"];
const make = new Function("state", `
var MM_TO_PT = 2.834645669, MARK_GAP_MM = 0.7, KAPPA = 0.5522847498;
var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
var text = state.text, showNames = state.showNames, showAxes = state.showAxes, showDimensions = !!state.showDimensions, dimensionRiseMm = 3, sizeMm = state.sizeMm, arcRadiusMm = 3, tickMm = 1.6;
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
  assert.strictEqual(d.lines.filter((l) => l.kind === "main").length, 1);
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 1);
  const triangle = d.lines.find((l) => l.kind === "main");
  assert.ok(triangle.closed && triangle.points.length === 3, "삼각형은 연결된 닫힌 패스");
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
// 쉼표로 나눈 경로는 각각 유지하고 연속 꼭지점은 하나의 패스로 연결한다.
{
  const d = api({ pointsText: "A(0,3) B(0,0) C(4,0)", segmentText: "A-B-C, C-A" }).buildGeometry();
  const paths = d.lines.filter(l => l.kind === "main");
  assert.deepStrictEqual(paths.map(l => [l.points.length, l.closed]), [[3, false], [2, false]]);
}
// 곡선 점선 치수선: 하나의 베지어 패스를 유지하고 양 끝은 측정할 두 점에 붙는다.
{
  const g = api({ pointsText: "A(0,3) B(0,0) C(4,0)", segmentText: "A-B-C-A", lengthText: "AB:3, BC:4" }, {showDimensions: true});
  const d = g.buildGeometry();
  for (const label of d.texts.filter(t => t.dimension)) {
    const spec = label.dimension;
    assert.deepStrictEqual(label.dir, [0, 0], "치수 글자는 곡선 중앙에 고정");
    const paths = g.dimensionCurve(spec.a, spec.b, spec.normal, spec.rise, 0);
    assert.strictEqual(paths.length, 1);
    assert.deepStrictEqual(paths[0].points[0].anchor, spec.a);
    assert.deepStrictEqual(paths[0].points[1].anchor, spec.b);
    assert.ok(paths.every(l => l.kind === "dimension" && !l.closed));
    assert.strictEqual(paths[0].points.length, 2, "하나의 베지어 세그먼트");
  }
  assert.strictEqual(d.texts.filter(t => t.dimension).length, 2);
  assert.deepStrictEqual(g.dimensionCurve([0,0], [0,0], [1,0], 3, 2), []);
  assert.strictEqual(g.dimensionCurve([0,0], [2,0], [0,1], 3, 0).length, 1, "짧은 치수선도 흰 사각형으로 가린다");
}
// 치수선 양 끝은 변 두께 절반만큼 곡선을 따라 후퇴한다.
{
  const g = api();
  for (const width of [0.1, 0.8, 1.5]) {
    for (const [a,b,n] of [[[0,0],[100,0],[0,-1]],[[0,0],[0,75],[-1,0]],[[0,0],[60,80],[-0.8,0.6]]]) {
      const paths=g.dimensionCurve(a,b,n,8,width/2);
      const first=paths[0].points[0].anchor, last=paths[0].points[1].anchor;
      near(Math.hypot(first[0]-a[0],first[1]-a[1]),width/2,"시작 치수선 후퇴",1e-5);
      near(Math.hypot(last[0]-b[0],last[1]-b[1]),width/2,"끝 치수선 후퇴",1e-5);
    }
  }
}
// 글자 윤곽에 관계없이 배경의 상하좌우 여백은 동일하다.
{
  const rect = new Function(extractFunction("dimensionMaskRect")+";return dimensionMaskRect;")();
  for (const bounds of [[0,8,4,0],[0,8,20,0],[-4,5,10,-5]]) {
    const r=rect(bounds,2);
    assert.deepStrictEqual([bounds[0]-r[0],r[1]-bounds[1],r[2]-bounds[2],bounds[3]-r[3]],[2,2,2,2]);
  }
  assert.ok(source.includes('mask.fillColor = makeGray(0)'), "치수 글자 뒤에 흰 사각형");
  assert.ok(source.includes('label.item.zOrder(ZOrderMethod.BRINGTOFRONT)'), "글자가 가장 위");
}
// 설치 서체에 붙은 PDF 부분집합 접두사를 허용하고 GS 서체를 Spoqa보다 먼저 찾는다.
{
  const start = bundle.indexOf("function findRuleFont(");
  assert.ok(start >= 0);
  let end = bundle.indexOf("{", start), depth = 0;
  for (; end < bundle.length; end++) {
    if (bundle[end] === "{") depth++;
    if (bundle[end] === "}" && --depth === 0) break;
  }
  const fonts = [{name: "BEDFGG+GSMediumB1"}, {name: "BEDGOA+GSMediItaC1"}, {name: "SpoqaHanSansNeo-Regular"}];
  fonts.getByName = name => { const f=fonts.find(f => f.name === name); if (!f) throw Error("missing"); return f; };
  const find = new Function("app", "var textFontCache={};" + bundle.slice(start,end+1) + ";return findRuleFont;")({textFonts: fonts});
  assert.strictEqual(find(["GSMediumB1", "SpoqaHanSansNeo-Regular"]).name, "BEDFGG+GSMediumB1");
  assert.strictEqual(find(["GSMediItaC1", "GSMediumB1"]).name, "BEDGOA+GSMediItaC1");
}
// 선 종류별 두께: 변은 도형 값, 치수선·점선은 보조선 값, 각 호·직각·같은 길이 눈금은 표시 값.
{
  const made = [];
  const previewGroup = {pathItems: {add() { const p={setEntirePath(a) {this.anchors=a;this.pathPoints=a.map(()=>({}));}}; made.push(p); return p; }}};
  const paint = new Function("previewGroup", "var strokePt=1.2,GUIDE_PT=0.3,MARK_PT=0.5,AXIS_PT=0.4,GUIDE_DASH=[2,1.5]; var StrokeCap={BUTTENDCAP:1},StrokeJoin={MITERENDJOIN:1,BEVELENDJOIN:2}; function makeGray(k){return k;}"+extractFunction("addPath")+";return addPath;")(previewGroup);
  for (const kind of ["main", "axis", "mark", "dashed", "dimension"]) paint({kind,closed:kind==="main",points:[{anchor:[0,0],left:[0,0],right:[0,0]},{anchor:[1,0],left:[1,0],right:[1,0]}]});
  assert.deepStrictEqual(made.map(p=>p.strokeWidth),[1.2,0.4,0.5,0.3,0.3]);
  assert.ok(made[0].closed && made[0].strokeJoin===2, "도형 꼭짓점은 경사 연결");
  assert.deepStrictEqual(made[4].strokeDashes,[2,1.5]);
}
// 치수선 옵션은 확인 저장에만 쓰고 잘못된 저장값은 기본값을 유지한다.
{
  const create = new Function("app", "var PREF_KEY=\"test\",showDimensions=true,dimensionRiseMm=3;"+extractFunction("loadDimensionSettings")+extractFunction("saveDimensionSettings")+"loadDimensionSettings();return {show:showDimensions,height:dimensionRiseMm,save:saveDimensionSettings};");
  for (const [raw,show,height] of [["v1|0|4.5",false,4.5],["v1|1|999",true,3],["v0|0|5",true,3],["v1|x|5",true,3]]) {
    const writes=[];
    const result=create({preferences:{getStringPreference(){return raw;},setStringPreference(k,v){writes.push(v);}}});
    assert.strictEqual(result.show,show); assert.strictEqual(result.height,height); assert.strictEqual(writes.length,0);
    result.save(); assert.strictEqual(writes[0],["v1",show?"1":"0",height].join("|"));
  }
}
// 선 두께 역할: 축·도형·변·보조선·표시 행, v2(9칸) 저장, v1(축·그래프·보조선) 읽기
function lineWidthStore(constNames, raw) {
  const decl = (name) => { const at = source.indexOf(`var ${name} = `); assert.ok(at >= 0, name); return source.slice(at, source.indexOf("\n", at)); };
  const writes = [];
  const app = { preferences: { getStringPreference: () => raw, setStringPreference: (key, value) => writes.push(value) } };
  const current = new Function("app", ['var PREF_KEY = "T";'].concat(constNames.map(decl), [decl("LINE_DEFAULTS"), decl("LINE_KEYS")],
    ["setLineWidth", "currentLineWidth", "loadLineWidths", "saveLineWidths"].map(extractFunction), ["loadLineWidths(); saveLineWidths(); return currentLineWidth;"]).join("\n"))(app);
  return { current, saved: writes[0] };
}
{
  const consts = ["AXIS_PT", "GUIDE_PT", "MARK_PT"];
  assert.strictEqual(lineWidthStore(consts, "").saved, "v2|0.4||0.3|||0.3|||");
  const v1 = lineWidthStore(consts, "v1|0.5||0.6");
  assert.strictEqual(v1.current("guide"), 0.6);
  assert.strictEqual(v1.current("mark"), 0.3, "표시는 보조선과 따로");
  assert.strictEqual(lineWidthStore(consts, "v2|1||0.2|||5|||").saved, "v2|1||0.2|||2|||");
  assert.strictEqual(lineWidthStore(consts, "v2|1|1").saved, "v2|0.4||0.3|||0.3|||", "칸 수가 틀리면 무시");
  const labels = source.split('addValueRow(lineWidthPanel, "').slice(1).map((s) => s.slice(0, s.indexOf('"')));
  assert.deepStrictEqual(labels, ["축", "도형·변", "보조선", "표시"]);
  // 직각·각 호·같은 길이 눈금은 "mark", 점선은 "dashed"
  const d = api({ pointsText: "A(0,3) B(0,0) C(4,0) D(2,0)", segmentText: "A-B-C-A", dashedText: "A-D", angleText: "ABC:R, BAC:30°", tickText: "AB:1" }).buildGeometry();
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3);
  assert.strictEqual(d.lines.filter((l) => l.kind === "dashed").length, 1);
}
require("./es3-lint")(["readChainPaths", "dimensionCurve"].map(extractFunction).join("\n"), "기하 새 도형 함수");
new Function(bundle);
console.log("geometry checks passed");
