const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 반응 경로 에너지 도표.jsx에서 곡선 점·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "반응 경로 에너지 도표.jsx"), "utf8");
new Function(source);
es3Lint(source, "반응 경로 에너지 도표");
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
const names = ["pathPoints", "drawReactionPath"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { kind: 0, width: 50, reactant: 16, dH: 8, ea: 14, catalyst: false, catPct: 55, showNames: true, showEa: true, showDH: true,
  reactName: "A(g)", prodName: "B(g)", xName: "반응 진행", yName: "에너지", font: 8, wBody: 1, wRope: 0.4 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "arrow", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  t.curve = (...a) => { calls.push({ k: "curve", a }); return {}; };
  f.drawReactionPath(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

// 곡선 점: 앵커 5개, 시작·끝은 평탄, 봉우리가 가장 높고 반응물 높이에서 시작해 생성물 높이에서 끝난다
const pts = f.pathPoints(100, 40, 20, 90, 50);
assert.strictEqual(pts.length, 5);
assert.deepStrictEqual([pts[0].a[1], pts[4].a[1]], [40, 20]);
assert.strictEqual(pts[2].a[1], 90);
assert.ok(pts.every((p) => p.l[1] === p.a[1] && p.r[1] === p.a[1]), "모든 핸들이 수평");
assert.ok(pts[1].a[0] < pts[2].a[0] && pts[2].a[0] < pts[3].a[0]);

// 발열: 생성물이 반응물보다 ΔH만큼 낮다. 곡선 하나, 점선 안내선 둘, 축 화살표 둘 + Ea + ΔH
let calls = run({});
let curve = calls.filter((c) => c.k === "curve");
assert.strictEqual(curve.length, 1);
near(curve[0].a[0][0].a[1], 16 * MM, "반응물 높이");
near(curve[0].a[0][4].a[1], 8 * MM, "생성물 높이(발열)");
near(curve[0].a[0][2].a[1], (16 + 14) * MM, "봉우리 = 반응물 + Ea");
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 4);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 2);
// ΔH 화살표는 발열이면 아래로, 흡열이면 위로
let dh = calls.filter((c) => c.k === "arrow")[3].a;
assert.ok(dh[1][1] < dh[0][1], "발열: 아래로");
calls = run({ kind: 1 });
curve = calls.filter((c) => c.k === "curve");
near(curve[0].a[0][4].a[1], 24 * MM, "생성물 높이(흡열)");
near(curve[0].a[0][2].a[1], (24 + 14) * MM, "흡열 봉우리는 생성물 기준");
dh = calls.filter((c) => c.k === "arrow")[3].a;
assert.ok(dh[1][1] > dh[0][1], "흡열: 위로");
// 촉매: 곡선 둘, 둘째 봉우리가 낮다
calls = run({ catalyst: true });
curve = calls.filter((c) => c.k === "curve");
assert.strictEqual(curve.length, 2);
assert.ok(curve[1].a[0][2].a[1] < curve[0].a[0][2].a[1]);
near(curve[1].a[0][2].a[1], (16 + 14 * 0.55) * MM, "촉매 봉우리");
// 끄기: Ea·ΔH·이름
calls = run({ showEa: false, showDH: false, showNames: false });
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 2);
assert.ok(!calls.some((c) => c.k === "textAt" && (c.a[0] === "A(g)" || c.a[0] === "Ea" || c.a[0] === "ΔH")));
assert.ok(calls.some((c) => c.k === "text" && c.a[0] === "에너지"));
console.log("ok reaction-path");
