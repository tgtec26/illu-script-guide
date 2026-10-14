const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint.js");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "유전 정보 흐름.jsx"), "utf8");
es3Lint(source, "유전 정보 흐름.jsx");

function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}
const constants = ["LOOP_CENTER_SHIFT", "LOOP_START_DEG", "LOOP_END_DEG", "LOOP_LABEL_DEG"].map((name) => {
  const m = source.match(new RegExp(`var ${name} = ([0-9.]+);`));
  assert.ok(m, `missing ${name}`);
  return `var ${name} = ${m[1]};`;
}).join("\n");
const names = ["splitNames", "dogmaLayout", "arcAnchors"];
const g = new Function(`${constants}\n${names.map(extract).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 쉼표로 나눈 글자
assert.deepStrictEqual(g.splitNames("DNA, ㉠, ㉡", 3), ["DNA", "㉠", "㉡"]);
assert.deepStrictEqual(g.splitNames(" DNA ,mRNA", 3), ["DNA", "mRNA", ""]);
assert.deepStrictEqual(g.splitNames("(가), (나), (다), (라)", 3), ["(가)", "(나)", "(다)"]);

// 배치: 상자 너비 13, 높이 5.5, 화살표 9.5, 간격 1.5 (mm = 1로 둠)
const o = { boxW: 13, boxH: 5.5, arrowLen: 9.5, gap: 1.5, loopR: 9.5 };
const L = g.dogmaLayout(o, 1);
assert.deepStrictEqual(L.boxes.map((b) => b.left), [0, 25.5, 51], "boxes step by width + 2 gaps + arrow");
assert.deepStrictEqual(L.arrows.map((a) => [a.from[0], a.to[0]]), [[14.5, 24], [40, 49.5]], "arrows leave a gap at both boxes");
for (const a of L.arrows) { near(a.from[1], 2.75, "arrow at box mid height"); near(a.to[0] - a.from[0], 9.5, "arrow length"); }
near(L.loop.cx, -0.95, "loop centre left of the box"); near(L.loop.cy, 2.75, "loop centre at box mid height");
// 고리 끝점은 상자와 겹치지 않는다(위·아래로 비켜 남)
for (const deg of [L.loop.start, L.loop.end]) {
  const y = L.loop.cy + L.loop.r * Math.sin(deg * Math.PI / 180);
  assert.ok(y > 5.5 || y < 0, `loop end at ${deg}° clears the box (y=${y})`);
}
assert.ok(L.loop.label[0] < L.loop.cx && L.loop.label[1] > L.loop.cy + L.loop.r * 0.5, "(가) sits above-left of the loop");

// 원호 베지어: 90° 이하 조각, 끝점은 원 위, 끝점은 매끄럽지 않은 점
const arc = g.arcAnchors(0, 0, 10, 84, 283);
assert.strictEqual(arc.length, 4, "199° → 3 pieces");
for (const p of arc) near(Math.hypot(p.a[0], p.a[1]), 10, "anchor on circle");
near(arc[0].a[0], 10 * Math.cos(84 * Math.PI / 180), "starts at 84°");
near(arc[3].a[1], 10 * Math.sin(283 * Math.PI / 180), "ends at 283°");
assert.deepStrictEqual(arc[0].l, arc[0].a); assert.deepStrictEqual(arc[3].r, arc[3].a);
assert.strictEqual(arc[0].smooth, false); assert.strictEqual(arc[3].smooth, false); assert.strictEqual(arc[1].smooth, true);
// 반시계 방향: 첫 핸들은 위에서 왼쪽으로
assert.ok(arc[0].r[0] < arc[0].a[0], "counter-clockwise from the top");
// 66.3° 조각의 핸들 길이 = 4/3·tan(θ/4)·r
const step = 199 / 3 * Math.PI / 180;
near(Math.hypot(arc[1].r[0] - arc[1].a[0], arc[1].r[1] - arc[1].a[1]), 4 / 3 * Math.tan(step / 4) * 10, "handle length");

// 창: 선 두께 행, 접기 키, 저장 키, 기본 글자
assert.ok(source.includes('prefKey: "CentralDogma/settings"'));
assert.ok(/\{key: "wBox", label: "상자 테두리"[^}]*value: 0\.3\}/.test(source));
assert.ok(/\{key: "wArrow", label: "화살표"[^}]*value: 0\.5\}/.test(source));
assert.ok(source.includes('makeCollapsiblePanel(page, ctl.panel, true, spec.name + "/" + ctl.panel)'));
assert.ok(!source.includes("HeatEngineCycle"), "no leftovers from the template");
assert.ok(source.includes('value: "DNA, ㉠, ㉡"') && source.includes('value: "(가), (나), (다)"'));
assert.ok(source.includes("code >= 0x3260 && code <= 0x327F"), "circled jamo use the symbol font");
console.log("central dogma checks passed");
