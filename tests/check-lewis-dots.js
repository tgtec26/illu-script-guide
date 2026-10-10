const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 루이스 전자점식.jsx에서 점 자리·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "루이스 전자점식.jsx"), "utf8");
new Function(source);
es3Lint(source, "루이스 전자점식");
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
const names = ["splitNames", "dotSlots", "drawLewis"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { symbols: "X, Y, Z", counts: "1, 5, 7", charges: "", dotMm: 0.7, reachMm: 3.2, pairMm: 1.2, spaceMm: 16, font: 10 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["dot", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawLewis(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

// 점 자리: 개수 그대로, 4개까지는 방향마다 하나(위·오른쪽·아래·왼쪽), 5개부터 위쪽부터 짝
for (let n = 0; n <= 8; n++) assert.strictEqual(f.dotSlots(n).length, n);
assert.deepStrictEqual(f.dotSlots(4).map((s) => [s.side, s.slot]), [[0, 0], [1, 0], [2, 0], [3, 0]]);
assert.deepStrictEqual(f.dotSlots(5).map((s) => [s.side, s.slot]), [[0, -1], [1, 0], [2, 0], [3, 0], [0, 1]]);
assert.strictEqual(f.dotSlots(9).length, 8, "8개로 막음");
assert.strictEqual(f.dotSlots(-2).length, 0);
// 8개면 네 방향 모두 짝(-1, +1)
const eight = f.dotSlots(8);
for (let side = 0; side < 4; side++) assert.deepStrictEqual(eight.filter((s) => s.side === side).map((s) => s.slot).sort(), [-1, 1]);

// 그리기: X(1)·Y(5)·Z(7) → 점 13개, 글자 X Y Z, 간격 16mm
let calls = run({});
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 13);
assert.deepStrictEqual(calls.filter((c) => c.k === "text").map((c) => c.a[0]), ["X", "Y", "Z"]);
const xs = calls.filter((c) => c.k === "text").map((c) => c.a[1]);
near(xs[1] - xs[0], 16 * MM, "원소 간격");
// X의 점 하나는 위쪽 가운데
const first = calls.find((c) => c.k === "dot");
near(first.a[0], 0, "위쪽 점 x"); near(first.a[1], 3.2 * MM, "위쪽 점 y");
// 짝은 같은 쪽에서 pair 간격만큼 떨어진다: Y의 위쪽 두 점
const yDots = calls.filter((c) => c.k === "dot" && Math.abs(c.a[0] - 16 * MM) < 1.5 * MM && c.a[1] > 0);
assert.strictEqual(yDots.length, 2);
near(Math.abs(yDots[0].a[0] - yDots[1].a[0]), 1.2 * MM, "짝 간격");
// 전하 글자, 빈 기호, 숫자 아닌 가전자 수
calls = run({ symbols: "Na, , Cl", counts: "0, 3, 8", charges: "+, , -" });
assert.deepStrictEqual(calls.filter((c) => c.k === "text").map((c) => c.a[0]), ["Na", "Cl"]);
assert.deepStrictEqual(calls.filter((c) => c.k === "textAt").map((c) => c.a[0]), ["+", "-"]);
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 8, "빈 기호는 점도 없음");
assert.strictEqual(run({ counts: "a, b, c" }).filter((c) => c.k === "dot").length, 0);
console.log("ok lewis-dots");
