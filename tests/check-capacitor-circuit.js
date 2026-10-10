const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 축전기 회로.jsx에서 그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "축전기 회로.jsx"), "utf8");
new Function(source);
es3Lint(source, "축전기 회로");
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
const names = ["splitNames", "drawCapacitors"];
const f = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { connect: 0, count: 2, height: 24, spacing: 14, plateMm: 5, gapMm: 1.8, showBattery: true, showSwitch: true, switchClosed: false,
  names: "C, 2C, 3C, 4C", voltage: "V", switchName: "S", font: 8, wBody: 0.6, wRope: 1.2 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "dot", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawCapacitors(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const lines = (calls) => calls.filter((c) => c.k === "line").map((c) => c.a);
const plates = (calls) => lines(calls).filter((l) => l[2] === 1.2 || l[2] === 1.2 * 1.8);

// 병렬 2개: 극판 선은 전지 2 + 축전기 2×2 = 6개, 도선은 위·아래 가로 + 가지 세로
let calls = run({});
assert.strictEqual(plates(calls).length, 2 + 4);
const H = 24 * MM;
// 위 도선은 마지막 가지(첫 가지 + 간격)까지, 아래 도선은 같은 x까지
const firstX = 15 * MM + 8 * MM, lastX = firstX + 14 * MM;
const top = lines(calls).find((l) => l[0][1] === 0 && l[1][1] === 0 && Math.abs(l[1][0] - lastX) < 1e-9);
assert.ok(top, "위 도선이 마지막 가지까지");
const bottom = lines(calls).find((l) => Math.abs(l[0][1] + H) < 1e-9 && Math.abs(l[1][1] + H) < 1e-9 && Math.abs(l[1][0] - lastX) < 1e-9);
assert.ok(bottom, "아래 도선이 마지막 가지까지");
// 두 극판은 같은 x 범위, 위 극판이 아래 극판보다 gap만큼 위
const capPlates = plates(calls).slice(2, 4);
near(capPlates[0][0][1] - capPlates[1][0][1], 1.8 * MM, "극판 간격");
near(capPlates[0][1][0] - capPlates[0][0][0], 5 * MM, "극판 길이");
// 글자: 이름 C, 2C, 전압 V, 스위치 S
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const s of ["C", "2C", "V", "S"]) assert.ok(texts.includes(s), `글자 ${s}`);
assert.ok(!texts.includes("3C"));
// 스위치: 접점 점 둘, 열림이면 날이 위로(끝 y > 0), 닫힘이면 수평
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 2);
let blade = lines(calls).find((l) => l[0][0] === 7 * MM && l[1][1] > 0);
assert.ok(blade, "열린 날");
calls = run({ switchClosed: true });
assert.ok(lines(calls).some((l) => l[0][0] === 7 * MM && l[1][0] === 15 * MM && l[1][1] === 0), "닫힌 날은 수평");
assert.ok(!lines(calls).some((l) => l[1][1] > 0));
// 직렬 3개: 극판 선 2 + 3×2, 오른쪽 끝에서 내려와 아래 도선이 전지 쪽(x=0)까지
calls = run({ connect: 1, count: 3 });
assert.strictEqual(plates(calls).length, 2 + 6);
const back = lines(calls).find((l) => Math.abs(l[0][1] + H) < 1e-9 && l[1][0] === 0 && l[1][1] === -H);
assert.ok(back, "아래 도선이 전지까지 돌아옴");
const down = lines(calls).find((l) => l[0][1] === 0 && l[1][1] === -H && l[0][0] === l[1][0] && l[0][0] > 0);
assert.ok(down, "오른쪽 변");
assert.ok(down[0][0] > firstX + 2 * 14 * MM, "오른쪽 변은 마지막 축전기 오른쪽");
// 전지·스위치 없이: 왼쪽 변은 곧은 도선 하나, 점·전압 글자 없음
calls = run({ showBattery: false, showSwitch: false, count: 1 });
assert.strictEqual(plates(calls).length, 2);
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 0);
assert.ok(!calls.some((c) => c.a[0] === "V" || c.a[0] === "S"));
assert.ok(lines(calls).some((l) => l[0][0] === 0 && l[1][0] === 0 && l[0][1] === 0 && l[1][1] === -H));
console.log("ok capacitor-circuit");
