const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 반응 경로 에너지 도표.jsx에서 곡선 점·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "02_화학", "반응 경로 에너지 도표.jsx"), "utf8");
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
const names = ["pathPoints", "curveYAt", "drawReactionPath"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { kind: 0, width: 50, reactant: 16, dH: 8, ea: 14, catalyst: false, catPct: 55, showNames: true, showEa: true, showDH: true,
  reactName: "A(g)", prodName: "B(g)", xName: "반응 진행", yName: "에너지", eaText: "", catText: "", font: 8, wBody: 1, wRope: 0.4,
  headShape: 3, headSize: 100, rangeHeadShape: 3, rangeHeadSize: 100 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "arrow", "arrow2", "path", "text", "textAt", "axisLegendX", "axisLegendY"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
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
// 축 화살표 둘(단방향) + Ea·ΔH 구간 화살표 둘(양방향)
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 2);
assert.strictEqual(calls.filter((c) => c.k === "arrow2").length, 2);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 2);
// 반응물·생성물 글자는 평탄 구간 위: 글자 윤곽의 아래 가운데("above")를 곡선 높이보다 위에 둔다 (예전엔 "below"라 글자가 곡선에 걸쳤다)
for (const [name, y] of [["A(g)", 16 * MM], ["B(g)", 8 * MM]]) {
  const label = calls.find((c) => c.k === "textAt" && c.a[0] === name).a;
  assert.strictEqual(label[4], "above", `${name} 기준`);
  assert.ok(label[2] > y, `${name}는 곡선 위`);
}
// ΔH 화살표는 양방향이라 발열·흡열 모두 같은 두 끝(생성물 높이 ↔ 반응물 높이)을 잇는다
const dhEnds = (cs) => cs.filter((c) => c.k === "arrow2")[1].a.slice(0, 2).map((p) => p[1]).sort((a, b) => a - b);
assert.deepStrictEqual(dhEnds(calls), [8 * MM, 16 * MM]);
calls = run({ kind: 1 });
curve = calls.filter((c) => c.k === "curve");
near(curve[0].a[0][4].a[1], 24 * MM, "생성물 높이(흡열)");
near(curve[0].a[0][2].a[1], (24 + 14) * MM, "흡열 봉우리는 생성물 기준");
assert.deepStrictEqual(dhEnds(calls), [16 * MM, 24 * MM]);
// 촉매: 곡선 둘, 둘째 봉우리가 낮다
calls = run({ catalyst: true });
curve = calls.filter((c) => c.k === "curve");
assert.strictEqual(curve.length, 2);
assert.ok(curve[1].a[0][2].a[1] < curve[0].a[0][2].a[1]);
near(curve[1].a[0][2].a[1], (16 + 14 * 0.55) * MM, "촉매 봉우리");
// 촉매 곡선에도 Ea 구간 화살표: 반응물 높이에서 촉매 곡선까지, 봉우리 양옆에 하나씩(양방향)
const eaArrows = calls.filter((c) => c.k === "arrow2").slice(0, 2).map((c) => c.a);
assert.strictEqual(calls.filter((c) => c.k === "arrow2").length, 3, "Ea 둘 + ΔH");
assert.ok(eaArrows[0][0][0] < 25 * MM && eaArrows[1][0][0] > 25 * MM, "봉우리 양옆");
near(eaArrows[0][0][1], 16 * MM, "Ea 화살표 아래 끝은 반응물 높이");
near(eaArrows[1][0][1], 16 * MM, "촉매 Ea 화살표 아래 끝도 반응물 높이");
assert.ok(eaArrows[0][1][1] > eaArrows[1][1][1], "촉매 쪽이 낮다");
// 화살표 끝은 곡선 위에 닿는다: 곡선 높이를 직접 풀어 비교
near(eaArrows[0][1][1], f.curveYAt(curve[0].a[0], eaArrows[0][1][0]), "Ea 끝이 곡선 위");
near(eaArrows[1][1][1], f.curveYAt(curve[1].a[0], eaArrows[1][1][0]), "촉매 Ea 끝이 촉매 곡선 위");
// 촉매 곡선이 있으면 짧은 글자(Ea, Ea')도 지시선으로 오른쪽 바깥 여백에
let lead = calls.filter((c) => c.k === "path");
assert.strictEqual(lead.length, 2, "지시선 둘");
const labelOf = (s) => calls.find((c) => c.k === "textAt" && c.a[0] === s).a;
assert.ok(labelOf("Ea")[1] > (50 + 6) * MM && labelOf("Ea'")[1] > (50 + 6) * MM, "여백(가로축 끝 오른쪽)");
// 문구: 긴 문구가 짧은 글자를 대신하고, 지시선은 구간 화살표에서 시작해 문구 앞에서 끝난다
calls = run({ catalyst: true, eaText: "효소가 없을 때 활성화 에너지", catText: "효소가 있을 때 활성화 에너지" });
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "효소가 없을 때 활성화 에너지") && calls.some((c) => c.k === "textAt" && c.a[0] === "효소가 있을 때 활성화 에너지"));
assert.ok(!calls.some((c) => c.k === "textAt" && (c.a[0] === "Ea" || c.a[0] === "Ea'")), "문구가 짧은 글자를 대신한다");
lead = calls.filter((c) => c.k === "path");
assert.strictEqual(lead.length, 2);
assert.ok(lead[0].a[0][0][1] > lead[1].a[0][0][1], "없을 때 쪽 지시선이 위");
for (const l of lead) near(l.a[0][2][1], calls.find((c) => c.k === "textAt" && c.a[0] === (l === lead[0] ? "효소가 없을 때 활성화 에너지" : "효소가 있을 때 활성화 에너지")).a[2], "지시선 끝 높이 = 문구 높이");
// 촉매가 없으면 Ea는 화살표 옆 짧은 글자, 문구를 쓰면 지시선 하나
calls = run({});
assert.strictEqual(calls.filter((c) => c.k === "path").length, 0);
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "Ea" && c.a[4] === "left"), "촉매 없이는 화살표 왼쪽 짧은 글자");
calls = run({ eaText: "활성화 에너지" });
assert.strictEqual(calls.filter((c) => c.k === "path").length, 1);
// 구간 화살촉은 축 화살촉과 따로: 구간 화살표만 style을 받는다
calls = run({ headShape: 0, rangeHeadShape: 3, rangeHeadSize: 160 });
assert.ok(calls.filter((c) => c.k === "arrow").every((c) => c.a[3] === undefined), "축 화살표는 style 없음");
assert.ok(calls.filter((c) => c.k === "arrow2").every((c) => c.a[3].shape === 3 && c.a[3].size === 160), "구간 화살표는 구간 화살촉");
calls = run({ catalyst: true });
// 끄기: Ea·ΔH·이름
calls = run({ showEa: false, showDH: false, showNames: false });
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 2);
assert.ok(!calls.some((c) => c.k === "textAt" && (c.a[0] === "A(g)" || c.a[0] === "Ea" || c.a[0] === "ΔH")));
assert.ok(calls.some((c) => c.k === "axisLegendY" && c.a[0] === "에너지" && c.a[4] === "top"), "Y 범례는 위 끝 세로쓰기");
assert.ok(calls.some((c) => c.k === "axisLegendX" && c.a[0] === "반응 진행" && c.a[4] === "right" && c.a[2] === 0), "X 범례는 오른쪽 끝·축선 y=0");
// 엔진: 양방향 화살표와 화살촉 style(구간 화살표만 따로)이 그리기 도구에 있고, 문구·구간 화살촉 컨트롤이 있다
assert.ok(source.includes("t.arrow2 = function(a, b, width, style) {"), "양방향 화살표 도구");
assert.ok(source.includes("function headUnit(o, style) {") && source.includes("function headShapeOf(o, style) {"), "화살촉 모양·크기 style");
assert.ok(source.includes("t.head(a, [-d[0], -d[1]], style);"), "시작 끝에도 화살촉");
for (const key of ["eaText", "catText", "rangeHeadShape", "rangeHeadSize"]) assert.ok(source.includes(`{key: "${key}"`), `컨트롤 ${key}`);
assert.ok(source.includes('label: "축 화살촉 모양"') && source.includes('label: "구간 화살촉 모양"'), "축/구간 화살촉 이름");
console.log("ok reaction-path");
