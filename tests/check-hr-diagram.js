const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// H-R도.jsx에서 타원·별 읽기·그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "04_지구과학", "H-R도.jsx"), "utf8");
new Function(source);
es3Lint(source, "H-R도");
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
const names = ["supText", "ellipseAnchors", "parseStars", "drawHR"];
const tables = source.slice(source.indexOf("var HR_X_ITEMS"), source.indexOf("\n    runFormHost("));
const f = new Function(`var FontBaselineOption = {SUPERSCRIPT: 1};\n${tables}\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const MM = 2.834645669;
const base = { width: 55, height: 50, xMode: 0, yMode: 0, showMain: true, showGiant: true, showSuper: true, showDwarf: true, showGroupNames: true, shade: 0,
  stars: "A 18 80, B 60 40, C 80 70", starMm: 1.4, font: 8, wBody: 0.6, wRope: 0.5 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  for (const k of ["line", "arrow", "dot", "text", "textAt", "curve", "axisLegendX", "axisLegendY"]) t[k] = (...a) => { calls.push({ k, a }); return {}; };
  f.drawHR(t, { ...base, ...o });
  return calls;
}
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 별 읽기: 이름·가로·세로(0~100로 막음), 알아볼 수 없는 조각은 건너뜀
assert.deepStrictEqual(f.parseStars("A 18 80, B 60 40"), [{ name: "A", x: 18, y: 80 }, { name: "B", x: 60, y: 40 }]);
assert.deepStrictEqual(f.parseStars("A 120 -5, bad, C x 3"), [{ name: "A", x: 100, y: 0 }]);
assert.deepStrictEqual(f.parseStars(""), []);

// 타원 앵커: 기울기 0이면 네 끝점이 축 위, 기울기가 있으면 같은 반지름만큼 돌아간다
let an = f.ellipseAnchors(10, 20, 8, 3, 0);
assert.deepStrictEqual(an.map((p) => p.a), [[18, 20], [10, 23], [2, 20], [10, 17]]);
an = f.ellipseAnchors(0, 0, 8, 3, Math.PI / 2);
near(an[0].a[0], 0, "90° 돌림 x", 1e-12); near(an[0].a[1], 8, "90° 돌림 y", 1e-12);
near(Math.hypot(...an[1].a), 3, "짧은 반지름", 1e-12);

// 위 첨자: ^ 뒤 숫자·부호만 표시, ^는 빠짐
{
  const seen = [];
  f.supText({ text: (s) => { seen.push(s); return {}; } }, "10^-2", 0, 0, 8, "right");
  assert.deepStrictEqual(seen, ["10-2"]);
}

// 그리기: 축 화살표 2, 별 무리 4개(닫힌 곡선), 별 점 3, 눈금(분광형 7 + 광도 5)
const W = 55 * MM, H = 50 * MM;
let calls = run({});
assert.strictEqual(calls.filter((c) => c.k === "arrow").length, 2);
const groups = calls.filter((c) => c.k === "curve");
assert.strictEqual(groups.length, 4);
assert.ok(groups.every((c) => c.a[1] === true && c.a[0].length === 4));
assert.strictEqual(calls.filter((c) => c.k === "dot").length, 3);
near(calls.filter((c) => c.k === "dot")[1].a[0], W * 0.6, "별 B x");
near(calls.filter((c) => c.k === "dot")[1].a[1], H * 0.4, "별 B y");
assert.strictEqual(calls.filter((c) => c.k === "line").length, 7 + 5);
const texts = calls.filter((c) => c.k === "text" || c.k === "textAt" || c.k === "axisLegendX" || c.k === "axisLegendY").map((c) => c.a[0]);
for (const w of ["O", "M", "10", "분광형", "광도(태양=1)", "주계열성", "거성", "초거성", "백색 왜성", "A", "B", "C"]) assert.ok(texts.includes(w) || texts.includes(w + "4"), `글자 ${w}`);
assert.ok(texts.includes("104") && texts.includes("10-4") && texts.includes("1"), "광도 눈금(^ 제거)");
// 모든 별 무리 타원이 도표 폭 안쪽에 대체로 들어온다(주계열 끝점이 축 영역 안)
const main = groups[0].a[0];
assert.ok(main.every((p) => p.a[0] > -2 * MM && p.a[0] < W + 4 * MM), "주계열 타원이 도표 폭 안");
// 주계열은 왼쪽 위에서 오른쪽 아래로: 오른쪽 끝점이 왼쪽 끝점보다 낮다
assert.ok(main[0].a[1] < main[2].a[1] && main[0].a[0] > main[2].a[0]);
// 표면 온도·절대 등급 모드, 무리 끄기·음영
calls = run({ xMode: 1, yMode: 1, showMain: false, showGiant: false, showGroupNames: false, shade: 10 });
const t2 = calls.filter((c) => c.k === "text" || c.k === "textAt" || c.k === "axisLegendX" || c.k === "axisLegendY").map((c) => c.a[0]);
assert.ok(t2.includes("30000") && t2.includes("15") && t2.includes("표면 온도(K)") && t2.includes("절대 등급"));
assert.strictEqual(calls.filter((c) => c.k === "curve").length, 2);
assert.ok(calls.filter((c) => c.k === "curve").every((c) => c.a[2] === 10), "무리 음영");
assert.ok(!t2.includes("거성"));
assert.strictEqual(calls.filter((c) => c.k === "line").length, 4 + 5);

// 기본값(대화상자의 value)으로 그리면 별 점·별 이름이 무리 이름 글자와 겹치지 않는다.
// 글자 상자는 가운데 기준 폭 = 글자 수 × 크기(한글 전각), 높이 = 크기로 넉넉히 잡는다
function readDefaults() {
  const out = {};
  const re = /\{key: "(\w+)"[^{}]*?value: ("(?:[^"\\]|\\.)*"|true|false|-?[\d.]+)/g;
  let hit;
  while ((hit = re.exec(source))) out[hit[1]] = JSON.parse(hit[2]);
  return out;
}
const defaults = readDefaults();
calls = run(defaults);
const size = defaults.font;
// 글자 가로 자리는 정렬(c.a[4])을 따른다: "right"면 x가 오른쪽 끝
const groupLabels = calls.filter((c) => c.k === "text" && ["주계열성", "거성", "초거성", "백색 왜성"].includes(c.a[0])).map((c) => {
  const w = c.a[0].length * size, left = c.a[4] === "right" ? c.a[1] - w : c.a[1] - w / 2;
  return { name: c.a[0], left, right: left + w, bottom: c.a[2] - size / 2, top: c.a[2] + size / 2 };
});
assert.strictEqual(groupLabels.length, 4);
// 거성 이름은 작은 타원 왼쪽 바깥(타원 왼쪽 끝 0.66W)에 있다
assert.ok(groupLabels.find((g) => g.name === "거성").right <= 55 * MM * 0.66, "거성 이름이 타원 밖 왼쪽");
const starBoxes = [];
for (const c of calls.filter((c) => c.k === "dot")) {
  const [x, y, r] = c.a;
  starBoxes.push({ name: "점", left: x - r, right: x + r, bottom: y - r, top: y + r });
  starBoxes.push({ name: "이름", left: x + r + 0.8 * MM, right: x + r + 0.8 * MM + size * 0.7, bottom: y - size / 2, top: y + size / 2 });
}
for (const s of starBoxes) for (const g of groupLabels) {
  const overlap = s.left < g.right && s.right > g.left && s.bottom < g.top && s.top > g.bottom;
  assert.ok(!overlap, `기본 별 ${s.name}이 '${g.name}' 글자와 겹친다`);
}
console.log("ok hr-diagram");
