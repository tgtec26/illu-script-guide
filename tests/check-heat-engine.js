const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 열기관 순환.jsx에서 순환 계산·표본·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "열기관 순환.jsx"), "utf8");
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
const names = ["splitNames", "solveCycle", "plotPoint", "sampleProcess", "midOnPolyline", "distinctSorted", "insidePolygon", "drawCycle"];
const f = new Function(`var ARROW_HEAD_MM = 1.6, GAMMA = 5 / 3, PROCESS_NAMES = ["등압", "등적", "등온", "단열"];
var PROCESS_AB = [[0, 1], [1, 0], [1, 1], [GAMMA, 1]];\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669, GAMMA = 5 / 3;
const base = { axes: 0, width: 55, height: 45, p1: 2, r1: 2, p2: 3, r2: 1.5, p3: 2, p4: 3, names: "A, B, C, D", showProcess: false, showGuides: false,
  xTicks: "", yTicks: "", font: 8, wBody: 0.8, wObj: 0.4, wRope: 0.3 };
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const invariant = (type, s) => [s.P, s.V, s.P * s.V, s.P * Math.pow(s.V, GAMMA)][type];
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "path", "arrow", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawCycle(t, { ...base, ...o });
  return calls;
}

// 닫힌 순환: 각 과정의 끝점이 그 과정의 불변량을 지킨다 (등온·단열 카르노 순환)
let s = f.solveCycle(base);
assert.strictEqual(s.length, 4);
near(s[0].V, 1, "A 부피"); near(s[0].P, 1, "A 압력");
[2, 3, 2, 3].forEach((type, i) => near(invariant(type, s[i]) / invariant(type, s[(i + 1) % 4]), 1, `과정 ${i + 1} 불변량`, 1e-9));
near(s[1].V, 2, "B 부피"); near(s[1].P, 0.5, "B 압력");
// 직사각형: 등압·등적
s = f.solveCycle({ ...base, p1: 0, r1: 2, p2: 1, r2: 0.5, p3: 0, p4: 1 });
assert.deepStrictEqual(s.map((q) => [q.V, q.P].map((v) => +v.toFixed(9))), [[1, 1], [2, 1], [2, 0.5], [1, 0.5]]);
// 세 과정: 등압 → 등온 → 단열로 A에 돌아온다
s = f.solveCycle({ ...base, p1: 0, r1: 2, p2: 2, p3: 3, p4: 4 });
assert.strictEqual(s.length, 3);
near(invariant(2, s[1]), invariant(2, s[2]), "B→C 등온", 1e-9); near(invariant(3, s[2]), invariant(3, s[0]), "C→A 단열", 1e-9);
// 닫히지 않는 조합(같은 종류 두 과정)
assert.strictEqual(f.solveCycle({ ...base, p3: 0, p4: 0 }), null);
assert.ok(run({ p3: 0, p4: 0 }).some((c) => c.k === "text" && /닫히지/.test(c.a[0])));

// 그래프 좌표 변환과 표본: 압력-부피에서 등온은 곡선, 등압·등적은 두 점. 압력-절대온도에서는 등온도 두 점
assert.deepStrictEqual(f.plotPoint({ V: 2, P: 3 }, 0), [2, 3]);
assert.deepStrictEqual(f.plotPoint({ V: 2, P: 3 }, 1), [6, 3]);
assert.deepStrictEqual(f.plotPoint({ V: 2, P: 3 }, 2), [2, 6]);
const a = { V: 1, P: 1 }, b = { V: 2, P: 0.5 };
assert.strictEqual(f.sampleProcess(a, b, 2, 0).length, 40);
assert.strictEqual(f.sampleProcess(a, b, 2, 1).length, 2);
assert.strictEqual(f.sampleProcess(a, b, 3, 1).length, 40);
f.sampleProcess(a, b, 2, 0).forEach((q) => near(q[0] * q[1], 1, "등온 곡선 PV", 1e-9));

// 그리기: 축 화살표 2개, 순환은 닫힌 패스 하나, 가운데 화살촉 4개(삼각형), 점 이름 A~D
let calls = run({});
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 2);
const cycle = calls.filter((c) => c.k === "path" && c.a[1] === true && c.a[2] === null);
assert.strictEqual(cycle.length, 1);
assert.strictEqual(calls.filter((c) => c.k === "path" && c.a[0].length === 3 && c.a[2] === 100).length, 4, "화살촉 4개");
assert.deepStrictEqual(calls.filter((c) => c.k === "text" && c.a[4] === "center").map((c) => c.a[0]), ["압력", "A", "B", "C", "D"]);
// 순환이 축 길이 안(최대 82%)에 들어간다
const xs = cycle[0].a[0].map((p) => p[0]), ys = cycle[0].a[0].map((p) => p[1]);
near(Math.max(...xs), 0.82 * 55 * MM, "가로 최대", 1e-6); near(Math.max(...ys), 0.82 * 45 * MM, "세로 최대", 1e-6);
// 축 이름
assert.ok(run({ axes: 1 }).some((c) => c.k === "textAt" && c.a[0] === "절대 온도"));
assert.ok(run({ axes: 2 }).some((c) => c.k === "text" && c.a[0] === "절대 온도"));
// 과정 이름, 점선 안내선, 눈금 글
assert.deepStrictEqual(run({ showProcess: true }).filter((c) => c.k === "text" && /^(등|단)/.test(c.a[0])).map((c) => c.a[0]), ["등온", "단열", "등온", "단열"]);
calls = run({ p1: 0, r1: 2, p2: 1, r2: 0.5, p3: 0, p4: 1, showGuides: true, xTicks: "V0, 2V0", yTicks: "P0, 2P0" });
assert.strictEqual(calls.filter((c) => c.k === "line" && c.a[3]).length, 4, "x 두 곳 + y 두 곳의 점선");
assert.deepStrictEqual(calls.filter((c) => c.k === "textAt" && c.a[4] === "below").map((c) => c.a[0]), ["V0", "2V0"]);
assert.deepStrictEqual(calls.filter((c) => c.k === "textAt" && c.a[4] === "left" && c.a[0] !== "0").map((c) => c.a[0]), ["P0", "2P0"]);
console.log("heat engine cycle checks passed");
// 과정 이름은 순환 바깥쪽에 놓인다 (등온 곡선 이름은 곡선 위쪽, 단열 곡선 이름은 아래쪽 오른쪽 바깥)
const outsideCalls = run({ showProcess: true });
const poly = outsideCalls.find((c) => c.k === "path" && c.a[1] === true && c.a[2] === null).a[0];
outsideCalls.filter((c) => c.k === "text" && /^(등|단)/.test(c.a[0])).forEach((c) => assert.ok(!f.insidePolygon(c.a[1], c.a[2], poly), `${c.a[0]} 이름이 순환 안`));
