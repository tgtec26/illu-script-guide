const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 에너지 준위.jsx에서 전이 읽기와 그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "01_도형", "에너지 준위.jsx"), "utf8");
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
const names = ["parseTransitions", "splitNames", "drawLevels"];
const f = new Function(`var ARROW_HEAD_MM = 1.6, NAME_GAP_MM = 1, RYDBERG_EV = 13.6;\nfunction formFormat(v, d) { return Number(v).toFixed(d); }
function formInkBounds() { return [0, 0, 10, 0]; }\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

function run(o) {
  const calls = [];
  const t = { mm: 2.834645669 };
  for (const k of ["line", "rect", "arrow", "text", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawLevels(t, { wBody: 0.8, wObj: 0.4, wRope: 0.4, wGuide: 0.8, font: 8, count: 4, proportional: true, infinity: true, showN: true, showE: true, width: 50, height: 60,
    showUnit: true, transitions: "3-1, 4-2, 2-1", names: "a, b, c", absorb: false, spectrum: true, stripGap: 14, stripH: 8, ...o });
  return calls;
}
const MM = 2.834645669;
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 전이 읽기: 잘못된 칸은 건너뛰고 높은 준위가 먼저
assert.deepStrictEqual(f.parseTransitions("3-1, 2-4, 5-1, 2-2, x, 1", 4), [{ hi: 3, lo: 1 }, { hi: 4, lo: 2 }]);
assert.deepStrictEqual(f.splitNames("a, b ,c"), ["a", "b", "c"]);

// 에너지에 비례: n=1이 0, n=∞가 높이, n준위는 (1 - 1/n²)·높이
let calls = run({});
const levels = calls.filter((c) => c.k === "line" && c.a[0][0] === 0 && Math.abs(c.a[1][0] - 50 * MM) < 1e-6 && c.a[2] === 0.8);
assert.strictEqual(levels.length, 5, "준위 4개 + n=∞");
for (let n = 1; n <= 4; n++) near(levels[n - 1].a[0][1], (1 - 1 / (n * n)) * 60 * MM, `n=${n} 높이`);
near(levels[4].a[0][1], 60 * MM, "n=∞ 높이");
// 화살표: 서로 다른 x, 위 준위에서 아래 준위로
const arrows = calls.filter((c) => c.k === "arrow");
assert.strictEqual(arrows.length, 3);
near(arrows[0].a[0][1], (1 - 1 / 9) * 60 * MM, "3→1 시작"); near(arrows[0].a[1][1], 0, "3→1 끝");
near(arrows[1].a[0][0] - arrows[0].a[0][0], 50 / 4 * MM, "화살표 간격");
// 흡수는 방향이 반대
calls = run({ absorb: true });
near(calls.filter((c) => c.k === "arrow")[0].a[1][1], (1 - 1 / 9) * 60 * MM, "흡수 3←1 끝은 위 준위");
// 스펙트럼선: 파장이 긴 전이(4-2)가 가장 오른쪽
calls = run({});
const spectrum = calls.filter((c) => c.k === "line" && c.a[2] === 0.8 && Math.abs(c.a[0][1] + 14 * MM) < 1e-6);
assert.strictEqual(spectrum.length, 3);
assert.ok(spectrum[1].a[0][0] > spectrum[0].a[0][0] && spectrum[1].a[0][0] > spectrum[2].a[0][0], "4-2(b)가 오른쪽");
// 에너지 값 글자: -13.6, -3.40, -1.51, -0.85, 0
const energies = calls.filter((c) => c.k === "textAt" && / eV$/.test(c.a[0])).map((c) => c.a[0]);
assert.deepStrictEqual(energies, ["−13.60 eV", "−3.40 eV", "−1.51 eV", "−0.85 eV", "0 eV"]);
// 스펙트럼선을 끄면 띠도 없다
assert.ok(!run({ spectrum: false }).some((c) => c.k === "rect"));
console.log("energy levels checks passed");
