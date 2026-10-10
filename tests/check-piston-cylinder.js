const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 피스톤 실린더.jsx에서 읽기·배치 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "피스톤 실린더.jsx"), "utf8");
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
const names = ["splitNames", "parsePositions", "seededRandom", "drawPiston"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { scenes: 2, chambers: 2, length: 45, height: 14, sceneGap: 12, pistonMm: 1.2, pos1: "50", pos2: "62", pos3: "38", showDots: true, dots: 6,
  dotMm: 0.8, seed: 1, showNames: true, chamberNames: "A, B, C", sceneNames: "(가), (나), (다)", cylLabel: "단열된 실린더", pistLabel: "단열된 피스톤",
  font: 8, heat1: false, heat2: true, heat3: false, arrowMm: 8, wBody: 1, wObj: 0, wRope: 0.4 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["rect", "dot", "line", "arrow", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawPiston(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 피스톤 위치 읽기: 칸 수 − 1개, 5~95로 막고 서로 8% 이상 떨어뜨린다. 읽지 못하면 같은 간격
assert.deepStrictEqual(f.parsePositions("50", 2), [50]);
assert.deepStrictEqual(f.parsePositions("30, 70", 3), [30, 70]);
assert.deepStrictEqual(f.parsePositions("", 3).map(Math.round), [33, 67]);
assert.deepStrictEqual(f.parsePositions("x, 2", 3), [100 / 3, 100 / 3 + 8]);
assert.deepStrictEqual(f.parsePositions("97", 2), [95]);
assert.deepStrictEqual(f.parsePositions("40, 42", 3), [40, 48]);
// 난수는 번호가 같으면 같다
assert.strictEqual(f.seededRandom(3)(), f.seededRandom(3)());

// 장면 둘, 칸 둘: 실린더 상자 2개(꼭짓점 4개짜리 테두리) + 피스톤 2개, 두 번째 장면은 아래로 한 칸 내려간다
let calls = run({});
const boxes = calls.filter((c) => c.k === "rect" && c.a[4] === null);
assert.strictEqual(boxes.length, 2, "실린더 둘");
near(boxes[0].a[2], 45 * MM, "실린더 길이"); near(boxes[0].a[1] - boxes[0].a[3], 14 * MM, "실린더 높이");
near(boxes[1].a[1], -(14 + 12) * MM, "둘째 장면 위치");
const pistons = calls.filter((c) => c.k === "rect" && c.a[4] === 100);
assert.strictEqual(pistons.length, 2, "장면마다 피스톤 하나");
near((pistons[0].a[0] + pistons[0].a[2]) / 2, 0.5 * 45 * MM, "(가) 피스톤 50%");
near((pistons[1].a[0] + pistons[1].a[2]) / 2, 0.62 * 45 * MM, "(나) 피스톤 62%");
near(pistons[0].a[2] - pistons[0].a[0], 1.2 * MM, "피스톤 두께");
// 칸 이름·장면 이름·열 화살표
assert.deepStrictEqual(calls.filter((c) => c.k === "text" && c.a[4] === "center").map((c) => c.a[0]), ["A", "B", "(가)", "A", "B", "(나)", "단열된 실린더", "단열된 피스톤"]);
const heat = calls.filter((c) => c.k === "arrow");
assert.strictEqual(heat.length, 1, "(나)만 열 화살표");
near(heat[0].a[1][0], 0, "화살표 끝은 왼쪽 벽"); near(heat[0].a[1][1], -(14 / 2 + 14 + 12) * MM, "(나) 가운데 높이");
assert.ok(calls.some((c) => c.k === "textAt" && c.a[0] === "Q" && c.a[5].italic));
// 점: 칸마다 6개, 모두 그 칸 안쪽에 있다
const dots = calls.filter((c) => c.k === "dot");
assert.strictEqual(dots.length, 2 * 2 * 6);
const first = dots.slice(0, 6), second = dots.slice(6, 12);
const pA = pistons[0].a[0], pB = pistons[0].a[2];
assert.ok(first.every((d) => d.a[0] > 0 && d.a[0] < pA), "A칸 점은 왼쪽 벽과 피스톤 사이");
assert.ok(second.every((d) => d.a[0] > pB && d.a[0] < 45 * MM), "B칸 점은 피스톤과 오른쪽 벽 사이");
// 끄기와 칸 3개
assert.strictEqual(run({ showDots: false }).filter((c) => c.k === "dot").length, 0);
calls = run({ chambers: 3, pos1: "34, 67", scenes: 1 });
assert.strictEqual(calls.filter((c) => c.k === "rect" && c.a[4] === 100).length, 2, "칸 3개면 피스톤 2개");
assert.deepStrictEqual(calls.filter((c) => c.k === "text" && c.a[4] === "center").slice(0, 3).map((c) => c.a[0]), ["A", "B", "C"]);
assert.strictEqual(run({ showNames: false }).filter((c) => c.k === "text" && /^[ABC]$/.test(c.a[0])).length, 0);
// 지시선: 글자 둘과 지시선 둘, 서로 겹치지 않는다(피스톤이 왼쪽에 가까우면 실린더 글자가 비킨다)
calls = run({ scenes: 1, pos1: "20" });
const labels = calls.filter((c) => c.k === "text" && /^단열된/.test(c.a[0]));
assert.strictEqual(labels.length, 2);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 2, "지시선 둘");
assert.ok(calls.filter((c) => c.k === "line").every((c) => c.a[1][1] === 0), "지시선은 실린더 윗변까지");
const cyl = labels.find((c) => c.a[0] === "단열된 실린더"), pis = labels.find((c) => c.a[0] === "단열된 피스톤");
assert.ok(Math.abs(cyl.a[1] - pis.a[1]) > 7 * 8 * 0.9 * 0.9 || pis.a[2] > cyl.a[2], "글자가 겹치지 않거나 위로 올림");
// 지시선 글자를 비우면 없다
assert.strictEqual(run({ cylLabel: "", pistLabel: "" }).filter((c) => c.k === "line").length, 0);
console.log("piston cylinder checks passed");
