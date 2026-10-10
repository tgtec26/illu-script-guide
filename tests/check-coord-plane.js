const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "CoordPlane" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCoordPlaneEngine(");
  assert.ok(start >= 0, "missing engine: makeCoordPlaneEngine");
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

const names = ["compileFunction", "evaluateNumber", "parsePointList", "plotFunction", "toBezier", "formulaDisplay", "buildPlane", "straight",
  "piLabel", "findIntersections", "parseAsymptotes", "graphSymbol", "parseRegion", "regionPolygons", "dropCollinear",
  "functionValueTable", "substituteFunctionValues", "parseSolidLines", "parseSegments", "hasHangul", "notesWithNames"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 식 읽기
const f = (text, x) => g.compileFunction(text)(x);
near(f("y=2x+1", 3), 7, "linear");
near(f("y=-x^2+4", 3), -5, "minus binds after power");
near(f("y=1/2x", 4), 2, "1/2x is half x");
near(f("y=6/x", 2), 3, "inverse");
near(f("f(x)=(x-1)^2", 3), 4, "f(x)= prefix and parens");
near(f("y=√x", 9), 3, "root");
near(f("y=2(x+1)", 1), 4, "implicit product with parens");
near(f("y = x² − 1", 3), 8, "unicode square and minus");
near(f("y=-2x", 3), -6, "negative coefficient");
for (const bad of ["y=", "y=2x+", "y=(x", "y=z", "y=1..2x", "y"]) assert.strictEqual(g.compileFunction(bad), null, bad);

// 점
{
  const r = g.parsePointList("A(2,3) B(-1, -2), (1/2,√2) C(1) D(2,");
  assert.deepStrictEqual(r.list.map((p) => [p.name, p.x, p.y]), [["A", 2, 3], ["B", -1, -2], ["", 0.5, Math.SQRT2]]);
  assert.deepStrictEqual(r.bad, ["C(1)", "D(2,"]);
  assert.strictEqual(g.evaluateNumber("x"), null);
}

// 그래프: 직선은 3차 에르미트로 정확하니 쪼개지 않는다
{
  const segs = g.plotFunction(g.compileFunction("y=2x+1"), -5, 5, -5, 5);
  assert.strictEqual(segs.length, 1);
  const s = segs[0];
  near(s[0].x, -3, "enters at y=-5", 1e-6);
  near(s[s.length - 1].x, 2, "leaves at y=5", 1e-6);
  assert.ok(s.length <= 12, `few anchors for a line: ${s.length}`);
}

// 반비례는 원점을 사이에 두고 두 조각, 범위 밖은 잘림
{
  const segs = g.plotFunction(g.compileFunction("y=6/x"), -5, 5, -5, 5);
  assert.strictEqual(segs.length, 2);
  for (const s of segs) for (const p of s) assert.ok(p.y >= -5 - 1e-9 && p.y <= 5 + 1e-9);
  near(segs[0][segs[0].length - 1].x, -1.2, "left branch stops at y=-5", 1e-6);
  near(segs[1][0].x, 1.2, "right branch starts at y=5", 1e-6);
}

// 베지어가 곡선에서 벗어나지 않는다 (포물선, 반비례: 각 구간 가운데 점 비교)
for (const text of ["y=-x^2+4", "y=6/x", "y=√x", "y=x^3/4-x"]) {
  const fn = g.compileFunction(text);
  for (const seg of g.plotFunction(fn, -5, 5, -5, 5)) {
    const bz = g.toBezier(seg, 1);
    for (let i = 0; i + 1 < bz.length; i++) {
      const p0 = bz[i].anchor, p1 = bz[i].right, p2 = bz[i + 1].left, p3 = bz[i + 1].anchor;
      const mid = [0, 1].map((k) => (p0[k] + 3 * p1[k] + 3 * p2[k] + p3[k]) / 8);
      const y = fn(mid[0]);
      if (!isFinite(y)) continue;
      assert.ok(Math.abs(y - mid[1]) < 0.02, `${text} off curve at x=${mid[0]}: ${mid[1]} vs ${y}`);
    }
  }
}

// 식 표시: ^ 다음은 위첨자
assert.deepStrictEqual(g.formulaDisplay("y=-x^2+4"), { text: "y=-x2+4", sup: [4], sub: [], roman: [] });
assert.deepStrictEqual(g.formulaDisplay("y=x^12*2"), { text: "y=x122", sup: [3, 4], sub: [], roman: [] });
// 함수 이름은 똑바로, 뒤에 한 칸. log의 밑은 아래첨자, pi는 π
assert.deepStrictEqual(g.formulaDisplay("y=sin 2x"), { text: "y=sin 2x", sup: [], sub: [], roman: [2, 3, 4] });
assert.deepStrictEqual(g.formulaDisplay("y=log_2 x"), { text: "y=log2x", sup: [], sub: [5], roman: [2, 3, 4] });
assert.deepStrictEqual(g.formulaDisplay("y=cos(x-pi)"), { text: "y=cos(x-π)", sup: [], sub: [], roman: [2, 3, 4] });

// 고등학교 함수
near(f("y=2^x", 3), 8, "exponential");
near(f("y=e^x", 1), Math.E, "e");
near(f("y=log_2 x", 8), 3, "log base 2");
near(f("y=log_2 3x", 8 / 3), 3, "log_2 3x = log2(3x), not log_23");
near(f("y=log_2(x+1)", 7), 3, "log base with parens");
near(f("y=log x", 1000), 3, "common log");
near(f("y=ln x", Math.E), 1, "natural log");
near(f("y=sin 2x", Math.PI / 4), 1, "sin 2x = sin(2x)");
near(f("y=2sin x", Math.PI / 2), 2, "2 sin x");
near(f("y=sin x cos x", Math.PI / 4), 0.5, "sin x cos x = sin(x)·cos(x)");
near(f("y=cos(x-π)", 0), -1, "π symbol");
near(f("y=tan x + 1", Math.PI / 4), 2, "tan");
near(f("y=|x-1|", -2), 3, "absolute value");
near(f("y=2|x|+1", -3), 7, "implicit product with abs");
near(f("y=||x|-2|", 0), 2, "nested abs");
for (const bad of ["y=sin", "y=log_", "y=|x", "y=cot x"]) assert.strictEqual(g.compileFunction(bad), null, bad);
assert.strictEqual(g.evaluateNumber("pi/2"), Math.PI / 2);

// π 눈금 글자
assert.deepStrictEqual([-4, -3, -1, 1, 2, 3, 4].map(g.piLabel), ["-2π", "-3π/2", "-π/2", "π/2", "π", "3π/2", "2π"]);

// 교점: 직선과 포물선, y=2^x와 y=log_2 x는 만나지 않음, tan의 불연속은 교점이 아님
{
  const fn = (t) => ({ fn: g.compileFunction(t) });
  const c = g.findIntersections([fn("y=x^2"), fn("y=x+2")], -5, 5, -5, 5);
  assert.strictEqual(c.length, 2);
  near(c[0].x, -1, "first crossing", 1e-9); near(c[1].x, 2, "second crossing", 1e-9);
  assert.strictEqual(g.findIntersections([fn("y=2^x"), fn("y=log_2 x")], -5, 5, -5, 5).length, 0);
  assert.strictEqual(g.findIntersections([fn("y=tan x"), fn("y=0")], -1.5, 1.5, -5, 5).length, 1, "only x=0, not the poles");
  assert.strictEqual(g.findIntersections([fn("y=x^2"), fn("y=x+20")], -5, 5, -5, 5).length, 0, "outside the y range");
}

// 점근선 입력
assert.deepStrictEqual(g.parseAsymptotes("x=1, y = -2"), [{ axis: "x", value: 1 }, { axis: "y", value: -2 }]);
assert.deepStrictEqual(g.parseAsymptotes(""), []);
for (const bad of ["x", "z=1", "x=", "x=a"]) assert.strictEqual(g.parseAsymptotes(bad), null, bad);

// 평면 전체
{
  const d = g.buildPlane({ xMin: -2, xMax: 3, yMin: -1, yMax: 2, unit: 10, tick: 2, grid: true, numbers: true,
    functions: [{ fn: g.compileFunction("y=x"), label: "y=x" }], nameStyle: 1, hideAxes: false, region: [],
    points: g.parsePointList("A(1,2)").list, coords: true, guides: true,
    piAxis: false, intersections: false, identity: false, asymptotes: [] });
  assert.deepStrictEqual(d.arrows.map((a) => a.tip), [[38, 0], [0, 28]], "arrow tips past the max");
  const axes = d.lines.filter((l) => l.kind === "axis" && l.points[0].anchor[1] === 0 && l.points[1].anchor[1] === 0);
  assert.deepStrictEqual(axes[0].points.map((p) => p.anchor), [[-25, 0], [35, 0]], "x axis stops at the arrow notch");
  assert.strictEqual(d.lines.filter((l) => l.kind === "grid").length, 5 + 3);
  assert.ok(d.texts.some((t) => t.text === "A(1, 2)"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
  assert.ok(!d.texts.some((t) => t.text === "0"), "origin is O, not 0");
}

assert.ok(source.includes('var PREF_KEY = "CoordPlane/settings";'));
assert.ok(!/[(,=]\s*\/=/.test(source), "regex literal must not start with = (ExtendScript syntax error)");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
// π 단위 가로축: 최댓값 4 → 2π, 눈금 글자, 점근선·y=x 점선, 교점 이름
{
  const d = g.buildPlane({ xMin: -4, xMax: 4, yMin: -2, yMax: 2, unit: 10, tick: 2, grid: false, numbers: true,
    functions: [{ fn: g.compileFunction("y=sin x"), label: "y=sin x" }, { fn: g.compileFunction("y=1/2"), label: "y=1/2" }],
    nameStyle: 0, hideAxes: false, region: [], points: [], coords: false, guides: false,
    piAxis: true, intersections: true, identity: true, asymptotes: [{ axis: "x", value: Math.PI / 2 }] });
  const xLabels = d.texts.filter((t) => t.dir[0] === 0 && t.dir[1] === -1 && t.clear > 0).map((t) => t.text);
  assert.deepStrictEqual(xLabels, ["-2π", "-3π/2", "-π", "-π/2", "π/2", "π", "3π/2", "2π"]);
  near(d.arrows[0].tip[0], (2 * Math.PI + 0.8) * 10, "x arrow past 2π");
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2, "asymptote + y=x");
  assert.deepStrictEqual(d.texts.filter((t) => /^[A-Z]$/.test(t.text) && t.text !== "O").map((t) => t.text), ["A", "B", "C", "D"], "sin x = 1/2 four times in [-2π, 2π]");
}

// 같은 곳에서 끝나는 두 그래프의 식 글자는 한 줄 이상 벌어진다
{
  const d = g.buildPlane({ xMin: -5, xMax: 6, yMin: -5, yMax: 6, unit: 10, tick: 2, grid: false, numbers: false,
    functions: [{ fn: g.compileFunction("y=√(x+2)"), label: "y=√(x+2)" }, { fn: g.compileFunction("y=|x|-3"), label: "y=|x|-3" }],
    nameStyle: 1, hideAxes: false, region: [], points: [], coords: false, guides: false, piAxis: false, intersections: false, identity: false, asymptotes: [], fontSize: 8 });
  const labels = d.texts.filter((t) => t.text.startsWith("y="));
  assert.strictEqual(labels.length, 2);
  assert.ok(Math.abs(labels[0].at[1] - labels[1].at[1]) >= 8 * 1.3 - 1e-9, "formula labels do not overlap");
}

// 그래프 이름 ㉠·(가), 5개까지
assert.deepStrictEqual([0, 1, 4].map((i) => g.graphSymbol(2, i)), ["㉠", "㉡", "㉤"]);
assert.deepStrictEqual([0, 1, 4].map((i) => g.graphSymbol(3, i)), ["(가)", "(나)", "(마)"]);
assert.ok(source.includes("var FUNCTION_COUNT = 5;"));
{
  const fns = ["y=x^2", "y=2x^2", "y=1/2x^2", "y=-x^2"].map((t) => ({ fn: g.compileFunction(t), label: t }));
  const d = g.buildPlane({ xMin: -3, xMax: 3, yMin: -4, yMax: 4, unit: 10, tick: 2, grid: false, numbers: false, functions: fns,
    nameStyle: 2, hideAxes: false, region: [], points: [], coords: false, guides: false, piAxis: false, intersections: false, identity: false,
    asymptotes: [], fontSize: 8 });
  assert.deepStrictEqual(d.texts.filter((t) => t.symbol).map((t) => t.text).sort(), ["㉠", "㉡", "㉢", "㉣"]);
}

// 축 없이 모눈: 축·화살촉·x/y/O 글자 없이 0 줄까지 격자
{
  const d = g.buildPlane({ xMin: -2, xMax: 3, yMin: -1, yMax: 2, unit: 10, tick: 2, grid: false, numbers: true, functions: [],
    nameStyle: 0, hideAxes: true, region: [], points: [], coords: false, guides: false, piAxis: false, intersections: false, identity: false, asymptotes: [] });
  assert.strictEqual(d.arrows.length, 0);
  assert.strictEqual(d.lines.filter((l) => l.kind === "axis").length, 0);
  assert.strictEqual(d.lines.filter((l) => l.kind === "grid").length, 6 + 4);
  assert.strictEqual(d.texts.length, 0);
}

// 칠하기: 두 직선 y=-x+4, y=2x+1과 두 축으로 둘러싸인 사각형
{
  const region = g.parseRegion("y<=-x+4, y ≤ 2x+1, x>=0, y>=0");
  assert.strictEqual(region.length, 4);
  assert.deepStrictEqual(g.parseRegion(""), []);
  for (const bad of ["z<1", "y=2", "y<", "x<a", "y<2x+"]) assert.strictEqual(g.parseRegion(bad), null, bad);
  const polys = g.regionPolygons(region, -5, 5, -5, 5);
  assert.strictEqual(polys.length, 1);
  const poly = polys[0];
  // 꼭짓점: (0,0) (4,0) (1,3) (0,1)
  const has = (x, y) => poly.some((p) => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1] - y) < 1e-6);
  assert.ok(has(0, 0) && has(4, 0) && has(0, 1), JSON.stringify(poly));
  assert.ok(poly.some((p) => Math.abs(p[0] - 1) < 0.02 && Math.abs(p[1] - 3) < 0.04), "corner near (1,3)");
  assert.ok(poly.length <= 6, "straight edges keep only a few points: " + poly.length);
  // 넓이 (신발끈) = 사각형 (0,0)(4,0)(1,3)(0,1) = 13/2
  let area = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  near(Math.abs(area) / 2, 6.5, "area", 0.02);
  // 포물선 아래: 곡선 경계는 여러 점
  const cap = g.regionPolygons(g.parseRegion("y<=-x^2+4, y>=0"), -5, 5, -5, 5);
  assert.strictEqual(cap.length, 1);
  assert.ok(cap[0].length > 10);
  // 떨어진 두 조각
  assert.strictEqual(g.regionPolygons(g.parseRegion("y>=x^2-1, y<=0"), -5, 5, -5, 5).length, 1);
  assert.strictEqual(g.regionPolygons(g.parseRegion("y>=-x^2+1, y<=0"), -3, 3, -5, 5).length, 2);
  // buildPlane이 좌표를 unit으로 바꿔 fills에 넣는다
  const d = g.buildPlane({ xMin: -5, xMax: 5, yMin: -5, yMax: 5, unit: 10, tick: 2, grid: false, numbers: false, functions: [],
    nameStyle: 0, hideAxes: false, region: region, points: [], coords: false, guides: false, piAxis: false, intersections: false, identity: false, asymptotes: [] });
  assert.strictEqual(d.fills.length, 1);
  assert.ok(d.fills[0].some((p) => Math.abs(p[0] - 40) < 1e-4 && Math.abs(p[1]) < 1e-4));
}


// ── 그래프 이름 직접 쓰기 · 실선 · 자유 글자 · 둘째 칠하기 · 함수값 점 · 선분 · 숨은 점 (웹 생성기와 같은 규칙) ──
{
  const base = { xMin: -5, xMax: 5, yMin: -5, yMax: 5, unit: 10, tick: 2, grid: false, numbers: false, functions: [], nameStyle: 0, hideAxes: false,
    region: [], points: [], coords: false, guides: false, piAxis: false, intersections: false, identity: false, asymptotes: [], fontSize: 8 };
  // 함수값
  const table = g.functionValueTable(["y=x^3-7x+6", "y=2x", "", "", ""]);
  assert.strictEqual(g.substituteFunctionValues("P(3,f(3)) Q(1,g(1/2))", table), "P(3,12) Q(1,1)");
  assert.strictEqual(g.substituteFunctionValues("R(2,h(2))", table), "R(2,h(2))");
  assert.strictEqual(g.substituteFunctionValues("T(0,f1(0))", table), "T(0,6)");
  // 실선
  assert.deepStrictEqual(g.parseSolidLines("x=2, y=-1"), [{ axis: "x", value: 2, text: "x=2" }, { axis: "y", value: -1, text: "y=-1" }]);
  assert.strictEqual(g.parseSolidLines("z=1"), null);
  const solid = g.buildPlane(Object.assign({}, base, { solidLines: g.parseSolidLines("x=2, y=-1"), lineNames: true }));
  assert.strictEqual(solid.lines.filter((l) => l.kind === "graph").length, 2);
  assert.deepStrictEqual(solid.texts.filter((t) => t.text === "x=2" || t.text === "y=-1").map((t) => t.dir), [[1, 0], [0, 1]]);
  assert.ok(!g.buildPlane(Object.assign({}, base, { solidLines: g.parseSolidLines("x=2"), lineNames: false })).texts.some((t) => t.text === "x=2"));
  // 직접 쓴 이름과 자리
  const fn = g.compileFunction("y=2x+1");
  const named = (at, name) => g.buildPlane(Object.assign({}, base, { functions: [{ fn: fn, label: "y=2x+1", name: name, at: at }] })).texts.filter((t) => t.text === "l" || t.text === "접선");
  assert.strictEqual(named(0, "").length, 0, "이름 설정이 없음이고 직접 쓴 이름도 없으면 안 붙는다");
  const end = named(0, "l")[0], startOut = named(1, "l")[0], startIn = named(2, "l")[0];
  assert.ok(end.at[0] > startOut.at[0]);
  assert.deepStrictEqual([end.dir, startOut.dir, startIn.dir], [[1, 0], [-1, 0], [1, 0]]);
  assert.strictEqual(named(0, "접선")[0].roman.length, 2, "한글 이름은 곧게");
  // 자유 글자·선분·숨은 점
  const pts = g.parsePointList("_p(3,2) _q(5,0) P(1,1)").list;
  const segs = g.parseSegments("O-_p, _p-_q", pts);
  assert.deepStrictEqual(segs, [[[0, 0], [3, 2]], [[3, 2], [5, 0]]]);
  assert.strictEqual(g.parseSegments("O-Z", pts), null);
  const plane = g.buildPlane(Object.assign({}, base, { points: pts, segments: segs, guides: true, notes: g.notesWithNames(g.parsePointList("A(0.4,1.5) (2,2)").list) }));
  assert.ok(!plane.texts.some((t) => t.text.charAt(0) === "_"), "숨은 점은 이름이 없다");
  assert.strictEqual(plane.dots.length, 1, "점은 P 하나만");
  const noteLabel = plane.texts.find((t) => t.text === "A");
  assert.deepStrictEqual(noteLabel.dir, [0, 0]);
  assert.strictEqual(plane.texts.filter((t) => t.dir && t.dir[0] === 0 && t.dir[1] === 0).length, 1, "이름 없는 글자는 쓰지 않는다");
  // 둘째 칠하기
  const two = g.buildPlane(Object.assign({}, base, { region: g.parseRegion("x>=0, x<=2, y>=0, y<=x"), region2: g.parseRegion("x>=2, x<=4, y>=0, y<=2") }));
  assert.strictEqual(two.fills.length, 1);
  assert.strictEqual(two.fills2.length, 1);
  // 눈금선
  const withTicks = g.buildPlane(Object.assign({}, base, { ticks: true })), noTicks = g.buildPlane(Object.assign({}, base, { ticks: false }));
  assert.strictEqual(withTicks.lines.length - noTicks.lines.length, 20);
  assert.strictEqual(g.buildPlane(base).lines.length, withTicks.lines.length, "옛 호출은 눈금선이 있다");
  // 설정 저장 형식: v4와 옛 v3를 모두 읽는다
  assert.ok(source.includes('"v4", xMin, xMax,') && source.includes('p[0] === "v3" && p.length === 24'));
}

console.log("coord plane checks passed");
