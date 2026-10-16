const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 상평형 그림.jsx에서 베지어 계산·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "02_화학", "상평형 그림.jsx"), "utf8");
new Function(source);
es3Lint(source, "상평형 그림");
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced: ${name}`);
}
const names = ["bezierAt", "curveXAtY", "drawPhase"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { width: 50, height: 40, slope: 0, tpX: 30, tpY: 22, showAtm: true, showMarks: true, showCrit: true, atmPct: 50,
  showNames: true, showTriple: true, solidName: "고체", liquidName: "액체", gasName: "기체", atmName: "1", freezeName: "Tf", boilName: "Tb",
  xName: "온도", yName: "압력", font: 8, wBody: 1, wRope: 0.4 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "arrow", "dot", "text", "textAt", "curve"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawPhase(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 베지어: 양 끝점을 지나고, y가 늘어나는 곡선에서 높이로 x를 되찾는다
const p0 = [0, 0], p1 = [10, 1], p2 = [20, 10], p3 = [30, 30];
assert.deepStrictEqual(f.bezierAt(p0, p1, p2, p3, 0), p0);
assert.deepStrictEqual(f.bezierAt(p0, p1, p2, p3, 1), p3);
const x = f.curveXAtY(p0, p1, p2, p3, 12);
near(f.bezierAt(p0, p1, p2, p3, 0)[1] + 0, 0, "시작");
assert.ok(x > 0 && x < 30);
assert.strictEqual(f.curveXAtY(p0, p1, p2, p3, 40), null);
assert.strictEqual(f.curveXAtY(p0, p1, p2, p3, -1), null);

// 그리기: 곡선 둘(승화·증기 압력), 융해 직선, 점 2(삼중점·임계점), 축 화살표 2
const W = 50 * MM, H = 40 * MM, tp = [0.3 * W, 0.22 * H];
let calls = run({});
const curves = calls.filter((c) => c.k === "curve");
assert.strictEqual(curves.length, 2);
near(curves[0].a[0][1].a[0], tp[0], "승화 곡선은 삼중점에서 끝");
near(curves[1].a[0][0].a[1], tp[1], "증기 압력 곡선은 삼중점에서 시작");
const dots = calls.filter((c) => c.k === "dot");
assert.strictEqual(dots.length, 2);
// 융해 곡선(직선): 삼중점에서 위 끝까지, 오른쪽 기울기
const isMelt = (c) => c.k === "line" && Math.abs(c.a[0][0] - tp[0]) < 1e-6 && Math.abs(c.a[0][1] - tp[1]) < 1e-6;
const solid = calls.filter(isMelt);
assert.strictEqual(solid.length, 1);
assert.ok(solid[0].a[1][0] > tp[0] && Math.abs(solid[0].a[1][1] - H) < 1e-6, "오른쪽으로 기울고 위 끝까지");
// 물: 왼쪽으로 기운다
const water = run({ slope: 1 }).filter(isMelt);
assert.ok(water[0].a[1][0] < tp[0]);
// 1기압 점선: 높이 50%, 끓는점 x는 증기 압력 곡선 위, 어는점 x는 융해 직선 위
const y1 = 0.5 * H;
const dashed = calls.filter((c) => c.k === "line" && c.a[3]);
assert.strictEqual(dashed.length, 3, "1기압 + 어는점 + 끓는점 점선");
const atm = dashed.find((c) => c.a[0][0] === 0 && Math.abs(c.a[0][1] - y1) < 1e-6);
assert.ok(atm, "1기압 점선");
const verticals = dashed.filter((c) => c !== atm).map((c) => c.a);
verticals.forEach((v) => { near(v[0][1], y1, "세로 점선 위 끝"); near(v[1][1], 0, "세로 점선 아래 끝"); });
const freezeX = Math.min(verticals[0][0][0], verticals[1][0][0]), boilX = Math.max(verticals[0][0][0], verticals[1][0][0]);
near(freezeX, tp[0] + 0.1 * W * (y1 - tp[1]) / (H - tp[1]), "어는점 x는 융해선 위");
const boilCheck = calls.filter((c) => c.k === "curve")[1].a[0];
assert.ok(boilX > tp[0] && boilX < 0.86 * W, "끓는점은 삼중점과 임계점 사이");
near(atm.a[1][0], boilX, "1기압 점선은 끓는점까지");
// 글자: 영역 이름 3, 삼중점·임계점, Tf·Tb, 1
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const w of ["고체", "액체", "기체", "삼중점", "임계점", "Tf", "Tb", "1", "온도", "압력"]) assert.ok(texts.includes(w), `글자 ${w}`);
// 1기압이 임계점 위면 끓는점 없음, 삼중점 아래면 어는점도 없음
calls = run({ atmPct: 85 });
assert.strictEqual(calls.filter((c) => c.k === "line" && c.a[3]).length, 2, "1기압 + 어는점만");
calls = run({ atmPct: 15 });
assert.strictEqual(calls.filter((c) => c.k === "line" && c.a[3]).length, 1, "삼중점 아래: 1기압 점선만");
// 끄기
calls = run({ showAtm: false, showCrit: false, showTriple: false, showNames: false });
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 1);
assert.strictEqual(calls.filter((c) => c.k === "line" && c.a[3]).length, 0);
assert.ok(!calls.some((c) => c.k === "text" && c.a[0] === "고체"));
console.log("ok phase-diagram");
