const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 타원 궤도.jsx에서 궤도 점·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "타원 궤도.jsx"), "utf8");
new Function(source);
es3Lint(source, "타원 궤도");
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
const names = ["splitNames", "orbitPoint", "drawOrbit"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { semi: 30, ecc: 0.5, sunMm: 3, planetMm: 1.6, angles: "90", planetNames: "A", showAxis: true, showSemi: false, showFocus: false,
  showNames: true, showDirection: false, sunName: "", font: 8, wBody: 1, wRope: 0.4 };
function run(o) {
  const calls = [];
  const t = { mm: MM, headLength: () => 4 };
  for (const k of ["line", "dot", "text", "textAt", "head", "curve"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawOrbit(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 케플러 궤도: ν=0은 근일점 (a, 0), ν=180은 원일점 (−a, 0), 어느 점이든 두 초점 거리의 합이 2a
const a = 100, e = 0.5, c = a * e;
let p = f.orbitPoint(a, e, 0); near(p[0], a, "근일점 x"); near(p[1], 0, "근일점 y");
p = f.orbitPoint(a, e, 180); near(p[0], -a, "원일점 x");
for (const nu of [30, 90, 145, 250, 330]) {
  const q = f.orbitPoint(a, e, nu);
  const sum = Math.hypot(q[0] - c, q[1]) + Math.hypot(q[0] + c, q[1]);
  near(sum, 2 * a, `ν=${nu} 초점 거리 합`, 1e-9);
}
// 원 궤도(e=0)면 거리가 a
near(Math.hypot(...f.orbitPoint(50, 0, 77)), 50, "원 궤도");

// 그리기: 닫힌 베지어 4점 타원, 가로 반지름 a, 세로 반지름 b = a√(1−e²), 중심 천체는 오른쪽 초점
const A = 30 * MM, B = A * Math.sqrt(1 - 0.25), C = A * 0.5;
let calls = run({});
const curve = calls.filter((c) => c.k === "curve");
assert.strictEqual(curve.length, 1);
assert.strictEqual(curve[0].a[1], true, "닫힌 패스");
near(curve[0].a[0][0].a[0], A, "오른쪽 끝"); near(curve[0].a[0][1].a[1], B, "위 끝");
near(curve[0].a[0][2].a[0], -A, "왼쪽 끝"); near(curve[0].a[0][3].a[1], -B, "아래 끝");
const dots = calls.filter((c) => c.k === "dot");
assert.strictEqual(dots.length, 2, "중심 천체 + 행성");
near(dots[0].a[0], C, "중심 천체는 오른쪽 초점");
// ν=90° 행성은 초점 바로 위 반통경 높이: y = a(1−e²) = 0.75a
near(dots[1].a[0], C, "ν=90 x"); near(dots[1].a[1], 0.75 * A, "ν=90 y");
// 글자: 근일점·원일점, 행성 이름 A
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const w of ["근일점", "원일점", "A"]) assert.ok(texts.includes(w), `글자 ${w}`);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 1, "장축 파선");
// 여러 행성, 알 수 없는 각도는 건너뜀
calls = run({ angles: "0, 90, x, 200", planetNames: "1, 2, 3, 4" });
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 1 + 3);
// 켜기: 장반경, 빈 초점, 방향 화살촉, 중심 천체 글자
calls = run({ showSemi: true, showFocus: true, showDirection: true, sunName: "태양", showAxis: false, showNames: false });
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 3);
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "a"));
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "태양"));
const head = calls.filter((c) => c.k === "head");
assert.strictEqual(head.length, 1);
// 화살촉은 궤도 위 바깥이 아닌 점에서 접선 방향(반시계: 위쪽에서 왼쪽으로)
assert.ok(head[0].a[1][0] < 0, "위쪽에서 왼쪽으로");
console.log("ok ellipse-orbit");
