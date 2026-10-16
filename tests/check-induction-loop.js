const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 자기장 영역과 고리.jsx에서 영역 계산·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_물리학", "자기장 영역과 고리.jsx"), "utf8");
new Function(source);
require("./es3-lint")(source, "자기장 영역과 고리");
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
const names = ["splitNames", "regionList", "drawLoop"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { unit: 6, regionStart: 2, height: 4, tickStep: 1, showTicks: true, regions: 3, w1: 2, w2: 2, w3: 2,
  dir1: 1, dir2: 0, dir3: 1, shade1: 10, shade2: 25, shade3: 10, gridMm: 6, symMm: 1.8,
  showNames: true, showStrength: true, names: "I, II, III", strengths: "B0, 2B0, B0", font: 8,
  loopX: -2, loopY: 1, loopW: 2, loopH: 2, pPos: 1, showV: true, showMove: false, vLen: 1, moveD: 3,
  wBody: 1, wRope: 0.4 };
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "path", "arrow", "dot", "rect", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawLoop(t, { ...base, ...o });
  return calls;
}

// 영역 목록: 시작 x부터 너비만큼 이어 붙고, 영역 수만큼만 나온다
let list = f.regionList(base);
assert.deepStrictEqual(list.map((r) => [r.left, r.right, r.dir, r.shade]), [[2, 4, 1, 10], [4, 6, 0, 25], [6, 8, 1, 10]]);
assert.strictEqual(f.regionList({ ...base, regions: 1 }).length, 1);
assert.deepStrictEqual(f.regionList({ ...base, regionStart: 1, w1: 1.5 })[1], { left: 2.5, right: 4.5, dir: 0, shade: 25 });

// 그리기: 영역 3개의 점선 테두리(칠한 닫힌 패스), 영역 경계가 d 단위 좌표
const d = 6 * MM, H = 4 * d;
let calls = run({});
const boxes = calls.filter((c) => c.k === "path" && c.a[1] === true && c.a[5]);
assert.strictEqual(boxes.length, 3, "영역 점선 테두리 3개");
assert.deepStrictEqual(boxes[1].a[0], [[4 * d, H], [6 * d, H], [6 * d, 0], [4 * d, 0]]);
assert.deepStrictEqual(boxes.map((c) => c.a[2]), [10, 25, 10]);
// 고리: 실선 사각형 하나(왼쪽 변 x=-2d, 아래 y=1d, 가로·세로 2d)
const loop = calls.filter((c) => c.k === "rect");
assert.strictEqual(loop.length, 1);
assert.deepStrictEqual(loop[0].a.slice(0, 5), [-2 * d, 3 * d, 0, 1 * d, null]);
assert.strictEqual(loop[0].a[6], 1);
// 축 화살표 둘: 원점에서 오른쪽·위. 속도 화살표 v 하나는 고리 오른쪽 변 가운데에서 시작
const arrows = calls.filter((c) => c.k === "arrow");
assert.strictEqual(arrows.length, 3);
assert.deepStrictEqual(arrows[0].a[0], [0, 0]);
assert.deepStrictEqual(arrows[1].a[0], [0, 0]);
near(arrows[1].a[1][1], H + d, "y축 끝");
assert.deepStrictEqual(arrows[2].a[0], [0, 2 * d]);
near(arrows[2].a[1][0], 1 * d, "v 끝");
// 점 p: 왼쪽 변 가운데
const pDot = calls.find((c) => c.k === "dot" && c.a[0] === -2 * d);
assert.ok(pDot && pDot.a[1] === 2 * d, "p 점이 왼쪽 변 가운데");
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "p"));
// 기호: 영역 Ⅰ·Ⅲ은 ●, Ⅱ는 ×(선 두 개씩). 기호 간격 6mm, 영역 2d=12mm×4d=24mm → 2열 4행(세기 글자 자리 제외)
const dotsI = calls.filter((c) => c.k === "dot" && c.a[0] > 2 * d && c.a[0] < 4 * d);
assert.ok(dotsI.length >= 6 && dotsI.length <= 8, `영역 Ⅰ 점 ${dotsI.length}`);
// 너비가 같은 영역은 기호 열 수도 같다(6d~8d에서 (8d-6d)/간격이 1.9999…로 떨어져 1열이 되던 것)
const columnsIn = (lo, hi) => new Set(calls.filter((c) => c.k === "dot" && c.a[0] > lo * d && c.a[0] < hi * d).map((c) => c.a[0].toFixed(3))).size;
assert.strictEqual(columnsIn(6, 8), columnsIn(2, 4), "영역 Ⅲ 기호 열 수");
const crosses = calls.filter((c) => c.k === "line" && c.a[0][0] > 4 * d && c.a[0][0] < 6 * d && Math.abs(c.a[0][0] - c.a[1][0]) > 1e-6);
assert.ok(crosses.length >= 12 && crosses.length % 2 === 0, `영역 Ⅱ × 선 ${crosses.length}`);
// 글자: 영역 이름 3, 세기 3, O·x·y
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const w of ["I", "II", "III", "B0", "2B0", "O", "x", "y", "d", "2d", "4d"]) assert.ok(texts.includes(w), `글자 ${w}`);
// 눈금 끄면 d 글자 없음, 이름·세기 끄면 영역 글자 없음
let off = run({ showTicks: false, showNames: false, showStrength: false }).filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
assert.ok(!off.includes("2d") && !off.includes("II") && !off.includes("B0"));
// 방향 '없음'이면 기호 없음, v·이동 끄기
calls = run({ dir1: 2, dir2: 2, dir3: 2, showV: false, pPos: 0 });
assert.ok(!calls.some((c) => c.k === "dot"), "점 없음");
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 2);
// 이동한 고리: 파선 닫힌 패스 하나가 moveD만큼 오른쪽
calls = run({ showMove: true });
const moved = calls.filter((c) => c.k === "path" && c.a[1] === true && c.a[5] && c.a[2] === null);
assert.strictEqual(moved.length, 1);
near(moved[0].a[0][0][0], (-2 + 3) * d, "이동 고리 왼쪽");
// p 오른쪽 변
calls = run({ pPos: 2 });
assert.ok(calls.some((c) => c.k === "dot" && c.a[0] === 0 && c.a[1] === 2 * d));

// 기본값(대화상자의 value)으로 그리면 고리·p 글자·v 화살표가 y축 왼쪽의 눈금 글자와 겹치지 않고,
// 고리 변이 축 위에 겹쳐 놓이지 않는다. 글자 상자는 폭 = 글자 수 × 크기 × 0.6, 높이 = 크기
function readDefaults() {
  const out = {};
  const re = /\{key: "(\w+)"[^{}]*?value: ("(?:[^"\\]|\\.)*"|true|false|-?[\d.]+)/g;
  let hit;
  while ((hit = re.exec(source))) out[hit[1]] = JSON.parse(hit[2]);
  return out;
}
const defaults = readDefaults();
calls = run(defaults);
const size = defaults.font, dd = defaults.unit * MM;
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;
const yTickLabels = calls.filter((c) => c.k === "textAt" && c.a[4] === "left" && /d$/.test(c.a[0]))
  .map((c) => ({ name: c.a[0], left: c.a[1] - c.a[0].length * size * 0.6, right: c.a[1], bottom: c.a[2] - size / 2, top: c.a[2] + size / 2 }));
assert.ok(yTickLabels.length >= 3, "기본값에 y 눈금 글자가 있다");
const [rl, rt, rr, rb] = calls.find((c) => c.k === "rect").a;
const loopBox = { left: rl, right: rr, bottom: rb, top: rt };
assert.ok(rl !== 0 && rr !== 0 && rb !== 0, "고리 변이 축 위에 놓인다");
const pText = calls.find((c) => c.k === "textAt" && c.a[0] === "p");
const pBox = { left: pText.a[1] - size * 0.6, right: pText.a[1], bottom: pText.a[2] - size / 2, top: pText.a[2] + size / 2 };
assert.ok(pBox.right <= 0 || pBox.left >= 0, "p 글자가 y축에 걸친다");
const vArrow = calls.filter((c) => c.k === "arrow")[2];
const vBox = { left: vArrow.a[0][0], right: vArrow.a[1][0], bottom: vArrow.a[0][1] - 1, top: vArrow.a[0][1] + 1 };
for (const label of yTickLabels) {
  for (const [what, box] of [["고리", loopBox], ["p 글자", pBox], ["v 화살표", vBox]]) assert.ok(!overlaps(label, box), `기본값에서 ${what}가 y 눈금 '${label.name}'와 겹친다`);
}
// 기본 고리는 영역 Ⅰ보다 왼쪽에 있다
assert.ok(rr < defaults.regionStart * dd, "기본 고리가 영역과 겹친다");
console.log("ok induction-loop");
