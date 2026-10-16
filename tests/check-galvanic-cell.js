const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 화학 전지.jsx에서 위 첨자 글자·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "02_화학", "화학 전지.jsx"), "utf8");
new Function(source);
es3Lint(source, "화학 전지");
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
const names = ["supText", "drawCell"];
const f = new Function(`var FontBaselineOption = {SUPERSCRIPT: 1};\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { beakerW: 22, beakerH: 24, gap: 16, level: 70, shade: 10, device: 0, flow: 0, showFlow: true, showBridge: true,
  leftName: "A", rightName: "B", leftSol: "1 M A^2+(aq)", rightSol: "1 M B^2+(aq)", bridgeName: "염다리", font: 8, wBody: 0.7, wRope: 0.5 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["path", "rect", "line", "arrow", "circle", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawCell(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

// 위 첨자 글자: ^는 글자에서 빠지고 전하 자리만 표시한다
{
  const seen = [];
  const t = { text: (s, ...rest) => { seen.push(s); return {}; } };
  f.supText(t, "1 M A^2+(aq)", 0, 0, 8, "center");
  f.supText(t, "e^-", 0, 0, 8, "center");
  f.supText(t, "Na^+", 0, 0, 8, "center");
  assert.deepStrictEqual(seen, ["1 M A2+(aq)", "e-", "Na+"]);
  // 위 첨자 지정 지점: 전하 글자의 위치만
  const marks = [];
  const frame = { textRange: { characters: new Proxy({}, { get: (_, i) => ({ characterAttributes: { set baselinePosition(v) { marks.push([+i, v]); } } }) }) } };
  f.supText({ text: () => frame }, "1 M A^2+(aq)", 0, 0, 8, "center");
  assert.deepStrictEqual(marks, [[5, 1], [6, 1]]);
}

// 그리기: 비커 둘(열린 U자), 전극 판 둘(음영 45), 염다리 닫힌 패스 하나, 도선 둘, 전구 원 하나 + 엇갈린 두 선, 전자 화살표 하나
const bw = 22 * MM, bh = 24 * MM, gap = 16 * MM;
let calls = run({});
const beakers = calls.filter((c) => c.k === "path" && c.a[1] === false && c.a[0].length === 4);
assert.strictEqual(beakers.length, 2);
near(beakers[0].a[0][0][0], -gap / 2 - bw, "왼쪽 비커 왼쪽");
near(beakers[1].a[0][3][0], gap / 2 + bw, "오른쪽 비커 오른쪽");
near(beakers[0].a[0][1][1], -bh, "비커 바닥");
const plates = calls.filter((c) => c.k === "rect" && c.a[4] === 45);
assert.strictEqual(plates.length, 2);
assert.ok(plates[0].a[0] < 0 && plates[1].a[0] > 0, "전극이 좌우");
assert.ok(plates[0].a[1] > 0 && plates[0].a[3] < 0, "전극은 비커 위로 나오고 수용액에 잠김");
const bridge = calls.filter((c) => c.k === "path" && c.a[1] === true);
assert.strictEqual(bridge.length, 1);
assert.strictEqual(bridge[0].a[0].length, 8);
const wires = calls.filter((c) => c.k === "path" && c.a[1] === false && c.a[0].length === 3);
assert.strictEqual(wires.length, 2);
assert.strictEqual(calls.filter((c) => c.k === "circle").length, 1);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 2, "전구 필라멘트 ×");
// 전자 이동: 왼쪽 전극 → 오른쪽 전극이면 화살표 끝이 오른쪽, 반대면 왼쪽
let arrow = calls.filter((c) => c.k === "arrow")[0].a;
assert.ok(arrow[1][0] > arrow[0][0]);
arrow = run({ flow: 1 }).filter((c) => c.k === "arrow")[0].a;
assert.ok(arrow[1][0] < arrow[0][0]);
// 수용액 글자 둘, 전극 이름 둘, 염다리 글자
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
for (const w of ["A", "B", "1 M A2+(aq)", "1 M B2+(aq)", "염다리", "e-"]) assert.ok(texts.includes(w), `글자 ${w}`);
// 전압계: 원 하나 + V 글자, 필라멘트 없음. 도선만: 원 없음, 도선은 가운데에서 맞닿는다
calls = run({ device: 1 });
assert.strictEqual(calls.filter((c) => c.k === "circle").length, 1);
assert.strictEqual(calls.filter((c) => c.k === "line").length, 0);
assert.ok(calls.some((c) => c.k === "text" && c.a[0] === "V"));
calls = run({ device: 2, showFlow: false, showBridge: false, shade: 0 });
assert.strictEqual(calls.filter((c) => c.k === "circle").length, 0);
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 0);
assert.ok(!calls.some((c) => c.k === "rect" && c.a[4] === 10), "음영 0이면 수용액 칠 없음");
assert.ok(!calls.some((c) => c.k === "text" && c.a[0] === "염다리"));
console.log("ok galvanic-cell");
