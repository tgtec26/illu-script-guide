const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 반감기 그래프.jsx에서 감소 곡선 앵커·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "반감기 그래프.jsx"), "utf8");
new Function(source);
es3Lint(source, "반감기 그래프");
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
const names = ["splitNames", "decayAnchors", "drawHalfLife"];
const tables = source.slice(source.indexOf("var HALF_X_ITEMS"), source.indexOf("\n    runFormHost("));
const f = new Function(`${tables}\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { width: 55, height: 40, periods: 4, xMode: 0, curveB: false, ratio: 2, showGuides: true, showDots: true, names: "A, B",
  xTitle: "시간", yTitle: "남은 양(%)", font: 8, wBody: 1, wRope: 0.4 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "arrow", "dot", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  t.curve = (...a) => { calls.push({ k: "curve", a }); return { strokeDashes: null }; };
  f.drawHalfLife(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 감소 곡선 앵커: 반감기마다 절반, 시작은 100 %, 끝은 xMax에서의 값. 핸들은 접선 방향
let an = f.decayAnchors(1, 3, 10, 1);
assert.strictEqual(an.length, 4);
assert.deepStrictEqual(an.map((p) => p.a[0]), [0, 10, 20, 30]);
near(an[0].a[1], 100, "시작"); near(an[1].a[1], 50, "1 반감기"); near(an[2].a[1], 25, "2 반감기"); near(an[3].a[1], 12.5, "3 반감기");
// 첫 점은 들어오는 핸들 없음(핸들 = 앵커), 중간 점은 매끄러움, 접선: 기울기 = -ln2·y/(반감기) (sy/sx = 0.1)
assert.deepStrictEqual(an[0].l, an[0].a);
assert.ok(an[1].smooth && !an[0].smooth && !an[3].smooth);
const s1 = (an[1].r[1] - an[1].a[1]) / (an[1].r[0] - an[1].a[0]);
near(s1, -Math.LN2 * 50 * 0.1 / 1, "중간 기울기", 1e-9);
// 베지어가 실제 지수 곡선과 가깝다(구간 한가운데에서 오차 < 1 %p)
function bez(p0, p1, p2, p3, u) { const v = 1 - u; return [0, 1].map((k) => v * v * v * p0[k] + 3 * v * v * u * p1[k] + 3 * v * u * u * p2[k] + u * u * u * p3[k]); }
const mid = bez(an[0].a, an[0].r, an[1].l, an[1].a, 0.5);
near(mid[1] / 1, 100 * Math.pow(2, -mid[0] / 10), "구간 가운데 오차", 1);
// 반감기가 구간 끝에 안 맞으면 끝 앵커가 xMax에 놓이고 값은 그 시각의 값
an = f.decayAnchors(1.5, 4, 10, 1);
assert.deepStrictEqual(an.map((p) => p.a[0]), [0, 15, 30, 40]);
near(an[3].a[1], 100 * Math.pow(2, -4 / 1.5), "끝 값");
// 반감기 0.25 → 앵커 많음(17개), 끝에 맞음
assert.strictEqual(f.decayAnchors(0.25, 4, 10, 1).length, 17);

// 그리기: 4회 → 눈금 선(가로 4 + 세로 5), 점선 안내선 8, 점 4, 곡선 1
const W = 55 * MM, H = 40 * MM;
let calls = run({});
assert.strictEqual(calls.filter((c) => c.k === "curve").length, 1);
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 4);
assert.strictEqual(calls.filter((c) => c.k === "line" && c.a[3]).length, 8);
assert.strictEqual(calls.filter((c) => c.k === "line" && !c.a[3]).length, 4 + 5);
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const w of ["0", "T", "2T", "4T", "100", "50", "25", "12.5", "시간", "남은 양(%)", "A"]) assert.ok(texts.includes(w), `글자 ${w}`);
// 세로 눈금 글자는 위 글자와 글자 크기×1.2 이상 떨어진다. 가까우면 그 글자만 빼고 눈금·안내선은 남긴다
// (높이 40mm, 8pt: 6.25는 12.5와 7pt 차이라 빠짐 / 높이 90mm면 16pt 차이라 들어감)
function yLabelGaps(callList) {
  const ys = callList.filter((c) => c.k === "textAt" && c.a[4] === "left").map((c) => c.a[2]);
  return ys.slice(1).map((y, i) => ys[i] - y);
}
assert.ok(!texts.includes("6.25"), "40mm에서 6.25는 12.5와 붙어서 뺀다");
assert.ok(yLabelGaps(calls).every((gap) => gap >= 8 * 1.2 - 1e-9), `세로 눈금 글자 간격 ${yLabelGaps(calls)}`);
const tall = run({ height: 90 });
assert.ok(tall.some((c) => c.k === "textAt" && c.a[0] === "6.25"), "90mm에서는 6.25가 들어간다");
assert.ok(yLabelGaps(run({ height: 25, periods: 5, font: 14 })).every((gap) => gap >= 14 * 1.2 - 1e-9));
// 점은 곡선 위(i번째 점 x = i·W/4, y = 100·0.5^i %)
const dots = calls.filter((c) => c.k === "dot").map((c) => c.a);
near(dots[1][0], 2 * W / 4, "둘째 점 x"); near(dots[1][1], 25 * H / 100, "둘째 점 y");
// 가로축 글자 모드 2, 안내선·점 끄기, 둘째 곡선(파선, 이름 B)
calls = run({ xMode: 1, showGuides: false, showDots: false, curveB: true, periods: 3 });
const t2 = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
assert.ok(t2.includes("3") && !t2.includes("T") && t2.includes("B"));
assert.strictEqual(calls.filter((c) => c.k === "line" && c.a[3]).length, 0);
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 0);
assert.strictEqual(calls.filter((c) => c.k === "curve").length, 2);
console.log("ok half-life");
