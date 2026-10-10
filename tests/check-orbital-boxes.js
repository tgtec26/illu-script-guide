const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 오비탈 전자 배치.jsx에서 읽기·채우기·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "오비탈 전자 배치.jsx"), "utf8");
new Function(source);
es3Lint(source, "오비탈 전자 배치");
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
const names = ["splitNames", "parseShells", "fillBoxes", "drawOrbitals"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { config: "1s2 2s2 2p3", fill: 0, boxMm: 5.5, gapMm: 2, rowGapMm: 8, arrowPct: 70, showLabels: true, names: "", font: 8, wBody: 0.5, wRope: 0.5 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["rect", "arrow", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawOrbitals(t, { ...base, ...o });
  return calls;
}

// 읽기: 부분 껍질 이름·칸 수·전자 수, 칸 수 × 2를 넘으면 줄이고 모르는 조각은 건너뛴다
assert.deepStrictEqual(f.parseShells("1s2 2s2 2p3"), [{ name: "1s", boxes: 1, count: 2 }, { name: "2s", boxes: 1, count: 2 }, { name: "2p", boxes: 3, count: 3 }]);
assert.deepStrictEqual(f.parseShells("2p9, xx 3d4"), [{ name: "2p", boxes: 3, count: 6 }, { name: "3d", boxes: 5, count: 4 }]);
assert.deepStrictEqual(f.parseShells(""), []);

// 채우기: 훈트 규칙은 칸마다 위 하나씩 먼저. 4개면 [↑↓, ↑, ↑], 순서대로는 [↑↓, ↑↓, 비움]
assert.deepStrictEqual(f.fillBoxes(4, 3, 0), [[true, true], [true, false], [true, false]]);
assert.deepStrictEqual(f.fillBoxes(4, 3, 1), [[true, true], [true, true], [false, false]]);
assert.deepStrictEqual(f.fillBoxes(3, 3, 1), [[true, true], [true, false], [false, false]]);
assert.deepStrictEqual(f.fillBoxes(6, 3, 0), [[true, true], [true, true], [true, true]]);
assert.deepStrictEqual(f.fillBoxes(0, 1, 0), [[false, false]]);

// 그리기: 1s2 2s2 2p3 → 칸 5개, 화살표 2+2+3 = 7개(2p는 위 화살표만 3개), 글자 1s 2s 2p
let calls = run({});
const b = 5.5 * MM;
assert.strictEqual(calls.filter((c) => c.k === "rect").length, 5);
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 7, "화살표 개수");
assert.deepStrictEqual(calls.filter((c) => c.k === "text").map((c) => c.a[0]), ["1s", "2s", "2p"]);
// 칸은 붙어 있고(2p 세 칸 사이 간격 0) 껍질 사이는 gap만큼 띄운다
const rects = calls.filter((c) => c.k === "rect").map((c) => c.a);
assert.ok(Math.abs(rects[1][0] - (b + 2 * MM)) < 1e-9, "2s 칸 왼쪽");
assert.ok(Math.abs(rects[3][0] - rects[2][2]) < 1e-9, "2p 칸끼리 붙음");
// 위 화살표는 아래 → 위(끝 y가 더 큼), 칸 안에 들어간다
const up = calls.filter((c) => c.k === "arrow")[0].a;
assert.ok(up[1][1] > up[0][1] && up[0][1] > -b && up[1][1] < 0, "화살표가 칸 안");
// 둘 다 있는 칸의 화살표 둘은 서로 다른 x
const both = calls.filter((c) => c.k === "arrow").slice(0, 2).map((c) => c.a[0][0]);
assert.ok(both[0] !== both[1]);
// 줄 둘 + 줄 이름 + 이름 끄기
calls = run({ config: "1s2 2s2 2p3 / 1s2 2s2 2p2", names: "(가), (나)" });
assert.strictEqual(calls.filter((c) => c.k === "rect").length, 10);
assert.deepStrictEqual(calls.filter((c) => c.k === "textAt").map((c) => c.a[0]), ["(가)", "(나)"]);
const rowY = calls.filter((c) => c.k === "rect").map((c) => c.a[1]);
assert.ok(rowY[5] < rowY[0], "둘째 줄은 아래");
assert.strictEqual(run({ showLabels: false }).filter((c) => c.k === "text").length, 0);
console.log("ok orbital-boxes");
