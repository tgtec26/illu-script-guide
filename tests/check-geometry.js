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
  "readChainPaths", "dimensionCurve", "display", "straight", "circleLine", "unitVector", "offsetPoint", "arcPoints", "rightAnglePoints", "buildGeometry", "clamp", "parseNumber",
  "ConstructFail", "readConstructions", "constructPoint", "touchingCircle", "readAreas", "measureLength", "measureAngle", "measureArea", "readLoci", "withT", "traceLocus", "plotParametric", "toBezierCurve"];
const make = new Function("state", `
var MM_TO_PT = 2.834645669, MARK_GAP_MM = 0.7, SYMBOL_MM = 0.6, TRACE_MM = 3, KAPPA = 0.5522847498;
var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
var text = state.text, showNames = state.showNames, showAxes = state.showAxes, showDimensions = !!state.showDimensions, dimensionRiseMm = 3, sizeMm = state.sizeMm, arcRadiusMm = 3, tickMm = 1.6;
${names.map(extractFunction).join("\n")}
return {${names.join(",")}};`);
const api = (text = {}, extra = {}) => make(Object.assign({
  text: Object.assign({ pointsText: "", constructText: "", segmentText: "", dashedText: "", circleText: "", ellipseText: "", arrowText: "", arcText: "", fillText: "", angleText: "", tickText: "", lengthText: "", dotText: "", labelDirText: "", areaText: "", locusText: "" }, text),
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
// 치수선 clear: 그 변에 같은 길이 눈금이 있으면 눈금이 변 바깥으로 나온 길이(눈금 절반), 없으면 0 (흰 배경이 이만큼 떨어지게 곡선을 높인다, addDimension)
{
  const g = api({ pointsText: "A(0,3) B(0,0) C(4,0)", segmentText: "A-B-C-A", tickText: "AB:1", lengthText: "AB:3 cm, BC:4 cm" }, {showDimensions: true});
  const clears = {};
  for (const label of g.buildGeometry().texts.filter(t => t.dimension)) clears[label.text] = label.dimension.clear;
  assert.deepStrictEqual(clears, { "3 cm": 1.6 * 2.834645669 / 2, "4 cm": 0 });
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
// 작도 명령: 웹 math-geometry.js의 readConstructions와 같은 글을 같은 점으로 읽는다 (웹 테스트와 같은 경우)
{
  const g = api();
  const build = (points, text) => {
    const table = {}, names = [], notes = [];
    for (const key of Object.keys(points)) { table[key] = points[key]; names.push(key); }
    g.readConstructions(text, table, names, notes);
    return { table, names, notes };
  };
  const at = (r, name, x, y) => {
    const p = r.table[name];
    assert.ok(p && r.names.includes(name), name + " 없음");
    near(p[0], x, name + ".x"); near(p[1], y, name + ".y");
  };
  let r = build({ A: [0, 0], B: [6, 0] }, "M=mid(A,B), D=div(A,B,2:1), E=div(A,B,2:-1), F=along(A,B,2), G=along(A,B,-1)");
  assert.deepStrictEqual(r.notes, []);
  at(r, "M", 3, 0); at(r, "D", 4, 0); at(r, "E", 12, 0); at(r, "F", 2, 0); at(r, "G", -1, 0);
  r = build({ A: [1, 3], B: [0, 0], C: [4, 0], O: [0, 0] }, "H=foot(A,B,C), P=rot(C,B,90), Q=ROT(C,B,-π/2), T=rot(C,B,60°), R=ref(A,B,C), S=ref(A,O)");
  assert.deepStrictEqual(r.notes, []);
  at(r, "H", 1, 0); at(r, "P", 0, 4); at(r, "Q", 0, -4); at(r, "T", 2, 2 * Math.sqrt(3)); at(r, "R", 1, -3); at(r, "S", -1, -3);
  r = build({ A: [0, 3], B: [0, 0], C: [4, 0] }, "G=centroid(A,B,C); O=circum(A,B,C); I=incenter(A,B,C); H=ortho(A,B,C)");
  assert.deepStrictEqual(r.notes, []);
  at(r, "G", 4 / 3, 1); at(r, "O", 2, 1.5); at(r, "I", 1, 1); at(r, "H", 0, 0);
  r = build({ A: [0, 0], B: [4, 4], C: [0, 4], D: [4, 0], P: [0, 1] }, "X=cross(AB,CD), Y=cross(P//AD,AB), Z=cross(P⊥AD,CD), W=cross(P_|_AD,AB), V=cross(AD,P//AD)");
  at(r, "X", 2, 2); at(r, "Y", 1, 1); at(r, "Z", 0, 4); at(r, "W", 0, 0);
  assert.deepStrictEqual(r.notes, ["작도 V=cross(AD,P//AD) (평행해 만나지 않음)"]);
  r = build({ O: [0, 0], P: [-3, 4], S: [0, 5], U: [1, 5] }, "Q=cross(PO,O~P), Q1=cross(PO,O~P,1), Q2=cross(OP,O:5,2), T=cross(SU,O:5), N=cross(SU,O:3)");
  at(r, "Q", 3, -4); at(r, "Q1", -3, 4); at(r, "Q2", -3, 4); at(r, "T", 0, 5);
  assert.deepStrictEqual(r.notes, ["작도 N=cross(SU,O:3) (만나지 않음)"]);
  r = build({ A: [-1, 0], B: [1, 0], C: [0, 1], D: [0, -3], E: [0, 3] }, "K=cross(DE,ABC)");
  at(r, "K", 0, -1);
  r = build({ A: [0, 0], B: [6, 0] }, "P=cross(A:5,B:5), Q=cross(A:5,B:5,2), R=cross(B:5,A:5)");
  assert.deepStrictEqual(r.notes, []);
  at(r, "P", 3, 4); at(r, "Q", 3, -4); at(r, "R", 3, -4);
  r = build({ A: [0, 0], B: [1, 0], C: [2, 0] }, "A=mid(A,B), M=foo(A,B), N=mid(A,Z), O=circum(A,B,C), P=mid(O,A), Q=div(A,B,1:-1), R=foot(A,B,B), bad, X=cross(AB,A~B~C)");
  assert.deepStrictEqual(r.notes, ["작도 A=mid(A,B) (이름 겹침)", "작도 M=foo(A,B)", "작도 N=mid(A,Z) (모르는 점)",
    "작도 O=circum(A,B,C) (한 직선 위의 세 점)", "작도 P=mid(O,A) (모르는 점)", "작도 Q=div(A,B,1:-1)", "작도 R=foot(A,B,B) (같은 두 점)", "작도 bad", "작도 X=cross(AB,A~B~C)"]);
  assert.deepStrictEqual(r.names, ["A", "B", "C"]);
  // 각의 이등분선(안·바깥)·방심·접선의 접점 (웹 math-geometry.test.js와 같은 경우)
  r = build({ A: [0, 3], B: [0, 0], C: [4, 0] }, "D=bisect(A,B,C), E=bisect(A,B,C,out), J=excenter(A,B,C)");
  assert.deepStrictEqual(r.notes, []);
  at(r, "D", 12 / 7, 12 / 7); at(r, "E", -12, 12); at(r, "J", 3, -3);
  r = build({ A: [-1, 2], B: [0, 0], C: [1, 2] }, "E=bisect(A,B,C,out)");
  assert.deepStrictEqual(r.notes, ["작도 E=bisect(A,B,C,out) (평행해 만나지 않음)"]);
  r = build({ O: [0, 0], A: [1, 0], P: [2, 0], Q: [0.5, 0] }, "T=tan(P,O~A,1), U=tan(P,O~A,2), V=tan(P,O:1), W=tan(Q,O~A)");
  at(r, "T", 0.5, Math.sqrt(3) / 2); at(r, "U", 0.5, -Math.sqrt(3) / 2); at(r, "V", 0.5, Math.sqrt(3) / 2);
  assert.deepStrictEqual(r.notes, ["작도 W=tan(Q,O~A) (원 안의 점)"]);
  r = build({ O: [0, 0], A: [1, 0], P: [2, 0], T: [0.5, Math.sqrt(3) / 2] }, "U=tan(P,O~A)");
  at(r, "U", 0.5, -Math.sqrt(3) / 2);
  // 만든 점은 선분·이름에 좌표로 준 점처럼 쓰인다
  const d = api({ pointsText: "A(0,3) B(0,0) C(4,0)", constructText: "M=mid(B,C)", segmentText: "A-B-C-A, A-M" }).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  assert.deepStrictEqual(d.texts.map((t) => t.text), ["A", "B", "C", "M"]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "main").length, 2);
}
// 설정 저장: 자취 글까지 v6(28칸)로 쓰고, 자취 글이 없는 v5(27칸)·넓이 글도 없는 v4(26칸)·작도 글도 없는 옛 v3(25칸)도 읽는다. 다른 태그·칸 수는 무시한다
{
  const decl = (name) => { const at = source.indexOf(`var ${name} = `); assert.ok(at >= 0, name); return source.slice(at, source.indexOf("\n", at)); };
  const store = (raw) => {
    const writes = [];
    const app = { preferences: { getStringPreference: () => raw, setStringPreference: (key, value) => writes.push(value) } };
    const text = new Function("app", ['var PREF_KEY = "T", POSITION_LIMIT_MM = 100;', decl("TEXT_KEYS"),
      'var text = {pointsText: "P0", segmentText: "", dashedText: "", circleText: "", ellipseText: "", angleText: "", tickText: "", lengthText: "", dotText: "", labelDirText: "", arrowText: "", arcText: "", fillText: "", constructText: "", areaText: "", locusText: ""};',
      "var showNames = true, showAxes = false, sizeMm = 50, fontPt = 8, labelGapMm = 1.2, arcRadiusMm = 3, tickMm = 1.6, strokePt = 0.8, offsetXmm = 0, offsetYmm = 0, previewEnabled = true;",
      "function saveLineWidths() {}"].concat(["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction),
      ["applySettings(); saveSettings(); return text;"]).join("\n"))(app);
    return { text, saved: writes[0] };
  };
  const v3 = ["v3", encodeURIComponent("A(0,0) B(1,0)")].concat(Array(12).fill(""), ["0", "1", "60", "8", "1.2", "3", "1.6", "0.8", "0", "0", "1"]).join("|");
  const old = store(v3);
  assert.strictEqual(old.text.pointsText, "A(0,0) B(1,0)");
  assert.strictEqual(old.text.constructText, "");
  const saved = old.saved.split("|");
  assert.strictEqual(saved.length, 28);
  assert.deepStrictEqual([saved[0], saved[14], saved[15], saved[16], saved[17], saved[18], saved[19]], ["v6", "", "", "", "0", "1", "60"]);
  saved[14] = encodeURIComponent("M=mid(A,B)");
  saved[15] = encodeURIComponent("ABC");
  saved[16] = encodeURIComponent("P:0~360");
  const v6 = store(saved.join("|"));
  assert.strictEqual(v6.text.constructText, "M=mid(A,B)");
  assert.strictEqual(v6.text.areaText, "ABC");
  assert.strictEqual(v6.text.locusText, "P:0~360");
  assert.strictEqual(v6.saved, saved.join("|"));
  const v5 = store(["v5"].concat(saved.slice(1, 16), saved.slice(17)).join("|"));
  assert.strictEqual(v5.text.areaText, "ABC", "v5도 읽는다");
  assert.strictEqual(v5.text.locusText, "");
  const v4 = store(["v4"].concat(saved.slice(1, 15), saved.slice(17)).join("|"));
  assert.strictEqual(v4.text.constructText, "M=mid(A,B)", "v4도 읽는다");
  assert.strictEqual(v4.text.areaText, "");
  assert.strictEqual(store(saved.slice(0, 27).join("|")).text.pointsText, "P0", "칸 수가 틀리면 무시");
}
require("./es3-lint")(["readChainPaths", "dimensionCurve", "ConstructFail", "readConstructions", "constructPoint", "readAreas", "measureLength", "measureAngle", "measureArea",
  "readLoci", "traceLocus", "withT", "plotParametric", "toBezierCurve"].map(extractFunction).join("\n"), "기하 새 도형 함수");
new Function(bundle);
console.log("geometry checks passed");

// 내접원·방접원, 같은 각 기호, 이름 숨기기, 평행 표시 (웹 math-geometry.test.js와 같은 경우)
{
  const tri = { pointsText: "A(0,3) B(0,0) C(4,0)", segmentText: "A-B-C-A" };
  let d = api(Object.assign({}, tri, { circleText: "in(ABC), ex(ABC,A)" })).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const circles = d.lines.filter(l => l.closed && l.points.length === 4);
  assert.strictEqual(circles.length, 2);
  const radius = (c) => (c.points[0].anchor[0] - c.points[2].anchor[0]) / 2;
  near(radius(circles[1]) / radius(circles[0]), 3, "방접원 반지름 3 : 내접원 반지름 1");
  assert.deepStrictEqual(api(Object.assign({}, tri, { circleText: "ex(ABC,D), in(AB)" })).buildGeometry().notes, ["원 ex(ABC,D)", "원 in(AB)"]);
  const g = api({ pointsText: "A(0,3) B(0,0) C(4,0) D(1.7,1.7)", segmentText: "A-B-C-A, B-D", angleText: "ABD:•, DBC:•:0, BAC:∘:0, ACB:×:0" });
  d = g.buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  assert.ok(!d.texts.some(t => /[•∘×]/.test(t.text)), "기호는 글자가 아니다");
  assert.strictEqual(d.lines.filter(l => l.kind === "fill" && l.fillK === 100).length, 2, "• 두 개");
  assert.strictEqual(d.lines.filter(l => l.kind === "mark" && l.closed && l.points.length === 4).length, 1, "∘ 하나");
  assert.strictEqual(d.lines.filter(l => l.kind === "mark" && !l.closed && l.points.length === 2 && l.points[0].left === l.points[0].anchor).length, 2, "× 선 두 개");
  d = api({ pointsText: "A(0,3) B(0,0) C(4,0)", constructText: "I=incenter(A,B,C)", labelDirText: "I:x, A:ul" }).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  assert.deepStrictEqual(d.texts.filter(t => t.upright).map(t => t.text).sort(), ["A", "B", "C"]);
  d = api({ pointsText: "A(0,3) B(0,0) C(4,0)", constructText: "I=incenter(A,B,C)", labelDirText: "I:숨김" }).buildGeometry();
  assert.deepStrictEqual(d.texts.filter(t => t.upright).map(t => t.text).sort(), ["A", "B", "C"]);
  d = api({ pointsText: "A(0,4) B(0,0) C(4,0) D(4,4)", segmentText: "A-B-C-D-A", tickText: "AD:>, BC:>, AB:>>" }).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const marks = d.lines.filter(l => l.kind === "mark" && l.points.length === 3);
  assert.strictEqual(marks.length, 4);
  for (const m of marks) {
    const [p, tip, q] = m.points.map(x => x.anchor), back = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    assert.ok(tip[0] - back[0] > 1e-6 || tip[1] - back[1] > 1e-6, "오른쪽 또는 위쪽");
  }
}

console.log("geometry new marks ok");

// 호 글자·호 눈금·작도 흔적 호 (웹 math-geometry.test.js와 같은 경우)
{
  const base = { pointsText: "O(0,0) A(2,0) B(0,2) C(-2,0)" };
  let d = api(Object.assign({}, base, { arcText: "O:A>B:4π, AC:d:2π" })).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const top = d.texts.find(t => t.text === "4π"), bottom = d.texts.find(t => t.text === "2π");
  near(top.dir[0], Math.SQRT1_2, "바깥 x"); near(top.dir[1], Math.SQRT1_2, "바깥 y");
  near(bottom.dir[1], -1, "아래쪽");
  const arc = d.lines.find(l => l.kind === "main" && l.points.length > 8);
  const mid = arc.points[Math.floor(arc.points.length / 2)].anchor;
  near(top.at[0], mid[0], "글자 x", 1e-6); near(top.at[1], mid[1], "글자 y", 1e-6);

  d = api(Object.assign({}, base, { arcText: "O:A>B:||:4π" })).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const ticks = d.lines.filter(l => l.kind === "mark" && l.points.length === 2);
  assert.strictEqual(ticks.length, 2);
  for (const m of ticks) {
    const [p, q] = m.points.map(x => x.anchor);
    near(Math.hypot(p[0] - q[0], p[1] - q[1]), 1.6 * 2.834645669, "눈금 길이", 1e-6);
  }
  assert.ok(d.texts.find(t => t.text === "4π").clear > 0, "눈금이 있으면 글자를 뗀다");

  d = api({ pointsText: "O(0,0) A(2,0) B(0,2)", arcText: "O:~A, B:~A" }).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const traces = d.lines.filter(l => l.kind === "mark" && l.points.length > 2);
  assert.strictEqual(traces.length, 2);
  const tp = traces[0].points.map(x => x.anchor), first = tp[0], last = tp[tp.length - 1];
  const chord = Math.hypot(first[0] - last[0], first[1] - last[1]);
  assert.ok(chord > 5.5 * 2.834645669 && chord < 6 * 2.834645669, "지나는 점 양쪽 3 mm: " + chord);
  assert.ok(api({ pointsText: "O(0,0) A(1,0)", arcText: "O:~X" }).buildGeometry().notes.length === 1);
}
console.log("geometry arc marks ok");

// 측정: 길이·각 글자의 ?, 넓이 칸 (웹 math-geometry.test.js와 같은 경우)
{
  const g = api();
  assert.deepStrictEqual([g.measureLength(5), g.measureLength(Math.sqrt(13)), g.measureLength(Math.sqrt(8)), g.measureLength(2.5), g.measureLength(Math.PI)], ["5", "√13", "2√2", "2.5", "3.14"]);
  assert.deepStrictEqual([g.measureAngle(Math.PI / 3), g.measureAngle(Math.atan2(3, 4))], ["60°", "36.9°"]);
  assert.deepStrictEqual([g.measureArea(6), g.measureArea(7.5), g.measureArea(Math.sqrt(3))], ["6", "7.5", "1.73"]);
  const d = api({ pointsText: "A(0,3) B(0,0) C(2,0)", segmentText: "A-B-C-A", angleText: "ACB:?", lengthText: "AC:?, AB:?", areaText: "ABC" }).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const texts = d.texts.map((t) => t.text);
  for (const want of ["√13", "3", "56.3°"]) assert.ok(texts.includes(want), want);
  const area = d.texts.filter((t) => t.text === "3" && t.dir[0] === 0 && t.dir[1] === 0);
  assert.strictEqual(area.length, 1, "넓이 글자는 가운데 맞춤");
  assert.ok(api({ pointsText: "A(0,3) B(0,0) C(2,0)", areaText: "ABC:S" }).buildGeometry().texts.some((t) => t.text === "S"));
  assert.strictEqual(api({ pointsText: "A(0,3) B(0,0) C(2,0)", areaText: "AB" }).buildGeometry().notes.length, 1);
  const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-geometry.js");
  if (fs.existsSync(webPath)) {
    const web = fs.readFileSync(webPath, "utf8");
    for (const name of ["measureLength", "measureAngle", "measureArea"]) {
      const start = web.indexOf(`export function ${name}(`), end = web.indexOf("\n}\n", start) + 2;
      const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
      assert.strictEqual(scriptText, web.slice(start + "export ".length, end), name + " differs from the web");
    }
  }
}
console.log("geometry measure ok");

// 자취 (웹 math-geometry.test.js와 같은 경우)
{
  const d = api({ pointsText: "O(0,0) A(2,0) B(-2,0)", constructText: "P=rot(A,O,t), M=mid(B,P)", locusText: "M:0~360:90" }).buildGeometry();
  assert.deepStrictEqual(d.notes, []);
  const loci = d.lines.filter((l) => l.locus);
  assert.ok(loci.length >= 1 && loci[0].points.length < 40, "자취는 앵커가 적은 베지어");
  const P = d.texts.find((t) => t.text === "P"), O = d.texts.find((t) => t.text === "O");
  assert.ok(Math.abs(P.at[0] - O.at[0]) < 1e-6 && P.at[1] > O.at[1], "그림 속 P는 t=90 (O 바로 위)");
  // 자취 앵커는 중심 (-1,0) 반지름 1인 원 위: O(0,0)과 B(-2,0)의 가운데가 중심
  const B = d.texts.find((t) => t.text === "B"), c = [(O.at[0] + B.at[0]) / 2, (O.at[1] + B.at[1]) / 2], r = Math.abs(O.at[0] - B.at[0]) / 2;
  for (const p of loci[0].points) near(Math.hypot(p.anchor[0] - c[0], p.anchor[1] - c[1]), r, "원 위", 1e-6);
  assert.deepStrictEqual(api({ pointsText: "O(0,0) A(2,0)", constructText: "P=rot(A,O,t)", locusText: "X:0~360" }).buildGeometry().notes, ["자취 X:0~360"]);
  assert.deepStrictEqual(api({ pointsText: "O(0,0) A(2,0)", constructText: "P=rot(A,O,t)", locusText: "P:5~1" }).buildGeometry().notes, ["자취 P:5~1"]);
  const webDir = path.join(root, "..", "sci-illu-web", "src", "generators");
  if (fs.existsSync(webDir)) {
    const pairs = [["math-function.js", "plotParametric"], ["math-function.js", "toBezierCurve"], ["math-geometry.js", "withT"]];
    for (const [file, name] of pairs) {
      const web = fs.readFileSync(path.join(webDir, file), "utf8"), start = web.indexOf(`export function ${name}(`), end = web.indexOf("\n}\n", start) + 2;
      const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
      assert.strictEqual(scriptText, web.slice(start + "export ".length, end), name + " differs from the web");
    }
  }
}
console.log("geometry locus ok");
