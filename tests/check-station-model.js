const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 일기 기호.jsx에서 읽기·부채꼴·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "일기 기호.jsx"), "utf8");
new Function(source);
es3Lint(source, "일기 기호");
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
const names = ["splitNames", "listNumber", "cloudSweep", "wedgePoints", "drawStations"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { dirs: "45, 225, 315", longs: "2, 1, 0", shorts: "1, 0, 1", flags: "0, 0, 0", clouds: "0, 2, 4", temps: "21, 15, 9", dews: "15, 12, 8", press: "132, 020, 245",
  names: "(가), (나), (다)", circleMm: 4.5, staffMm: 12, barbSide: 0, spaceMm: 40, font: 8, wBody: 0.6 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "path", "dot", "circle", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawStations(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 읽기 보조: 없는 칸·숫자 아닌 칸은 0, 구름양은 0~4로 막아 90°씩
assert.strictEqual(f.listNumber(["3", "x"], 0), 3);
assert.strictEqual(f.listNumber(["3", "x"], 1), 0);
assert.strictEqual(f.listNumber(["3"], 5), 0);
assert.deepStrictEqual([0, 1, 2, 3, 4, 9, -1].map(f.cloudSweep), [0, 90, 180, 270, 360, 360, 0]);
// 부채꼴: 12시에서 시작해 시계 방향. 90°면 (0, 0) → (0, r) → (r, 0). 360°면 둘레만
let w = f.wedgePoints(10, 90);
assert.deepStrictEqual(w[0], [0, 0]);
near(w[1][0], 0, "시작 x"); near(w[1][1], 10, "시작 y");
near(w[w.length - 1][0], 10, "끝 x"); near(w[w.length - 1][1], 0, "끝 y", 1e-9);
w = f.wedgePoints(10, 360);
assert.notDeepStrictEqual(w[0], [0, 0]);
assert.strictEqual(w.length, 25);

// 그리기: 기호 3개 → 원 3개 + 무풍 아님이므로 이중 원 없음, 글자 9 + 이름 3
const r = 4.5 * MM / 2, staff = 12 * MM;
let calls = run({});
assert.strictEqual(calls.filter((c) => c.k === "circle").length, 3, "원 3개");
const staffs = calls.filter((c) => c.k === "line" && Math.abs(Math.hypot(c.a[1][0] - c.a[0][0], c.a[1][1] - c.a[0][1]) - staff) < 1e-6);
assert.strictEqual(staffs.length, 3, "깃대 3개(길이 12mm)");
// 풍향 45°: 북동쪽으로(오른쪽 위), 225°: 남서쪽(왼쪽 아래)
assert.ok(staffs[0].a[1][0] > staffs[0].a[0][0] && staffs[0].a[1][1] > staffs[0].a[0][1], "45° = 북동");
assert.ok(staffs[1].a[1][0] < staffs[1].a[0][0] && staffs[1].a[1][1] < staffs[1].a[0][1], "225° = 남서");
// 깃대는 원 둘레에서 시작
near(Math.hypot(staffs[0].a[0][0], staffs[0].a[0][1]), r, "깃대 시작은 원 둘레");
// 깃: 첫 기호는 긴 2 + 짧은 1, 둘째는 긴 1, 셋째는 짧은 1 → 깃 선 5개
const barbs = calls.filter((c) => c.k === "line").length - 3;
assert.strictEqual(barbs, 2 + 1 + 1 + 0 + 0 + 1);
// 구름양: 0은 칠 없음, 2는 부채꼴 경로, 4는 원 전체 점(칠)
assert.strictEqual(calls.filter((c) => c.k === "path").length, 1, "부채꼴 1개(구름양 2)");
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 1, "전부 채움 1개(구름양 4)");
// 글자
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const s of ["21", "15", "9", "12", "8", "132", "020", "245", "(가)", "(나)", "(다)"]) assert.ok(texts.includes(s), `글자 ${s}`);
// 기호 사이 간격 40mm
const circles = calls.filter((c) => c.k === "circle").map((c) => c.a[0]);
near(circles[1] - circles[0], 40 * MM, "기호 간격");
// 삼각 깃은 닫힌 칠 삼각형(꼭짓점 3)
calls = run({ longs: "0", shorts: "0", flags: "1", clouds: "0", names: "" });
const tri = calls.filter((c) => c.k === "path");
assert.strictEqual(tri.length, 1);
assert.strictEqual(tri[0].a[0].length, 3);
assert.strictEqual(tri[0].a[1], true);
// 깃 붙는 쪽 반대로: 긴 깃의 방향이 뒤집힌다(풍향 0°: 깃대는 위, 깃은 오른쪽/왼쪽)
const one = { dirs: "0", longs: "1", shorts: "0", flags: "0", clouds: "0", temps: "", dews: "", press: "", names: "" };
let line = run({ ...one, barbSide: 0 }).filter((c) => c.k === "line")[1].a;
assert.ok(line[1][0] > line[0][0], "시계 방향쪽(풍향 0°): 오른쪽");
line = run({ ...one, barbSide: 1 }).filter((c) => c.k === "line")[1].a;
assert.ok(line[1][0] < line[0][0], "반시계 방향쪽: 왼쪽");
// 무풍: 깃 수가 모두 0이면 깃대 없이 이중 원
calls = run({ ...one, longs: "0" });
assert.strictEqual(calls.filter((c) => c.k === "circle").length, 2);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 0);
console.log("ok station-model");
