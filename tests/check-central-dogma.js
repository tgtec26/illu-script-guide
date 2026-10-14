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
const constants = ["LOOP_LABEL_DEG", "LOOP_LABEL_MM"].map((name) => {
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

// 배치: 첨부 그림 비율(상자 11×4.5, 화살표 7, 간격 1.2, 고리 반지름 6) (mm = 1로 둠)
const o = { boxW: 11, boxH: 4.5, arrowLen: 7, gap: 1.2, loopR: 6 };
const L = g.dogmaLayout(o, 1);
assert.deepStrictEqual(L.boxes.map((b) => b.left), [0, 20.4, 40.8], "boxes step by width + 2 gaps + arrow");
L.arrows.forEach((a, i) => { near(a.from[0], i * 20.4 + 12.2, "arrow leaves a gap"); near(a.to[0] - a.from[0], 7, "arrow length"); near(a.from[1], 2.25, "arrow at box mid height"); });
// 고리: 중심은 DNA 상자 왼쪽 변 가운데, 윗변과 만나는 점에서 시작해 아랫변과 만나는 점에서 끝난다
near(L.loop.cx, 0, "loop centre on the box's left edge"); near(L.loop.cy, 2.25, "loop centre at box mid height");
const at = (deg) => [L.loop.cx + L.loop.r * Math.cos(deg * Math.PI / 180), L.loop.cy + L.loop.r * Math.sin(deg * Math.PI / 180)];
near(at(L.loop.start)[1], 4.5, "starts on the top edge"); near(at(L.loop.end)[1], 0, "ends on the bottom edge");
assert.ok(at(L.loop.start)[0] > 0 && at(L.loop.start)[0] < 11, "start lies on the box's top edge");
near(L.loop.start + L.loop.end, 360, "symmetric about the box mid line");
assert.ok(L.loop.end - L.loop.start > 300, "almost a full turn");
// 촉은 반시계 접선이라 오른쪽 위를 향한다
const endRad = L.loop.end * Math.PI / 180, dir = [-Math.sin(endRad), Math.cos(endRad)];
assert.ok(dir[0] > 0 && dir[1] > 0, "head points up-right into the box");
assert.ok(L.loop.label[0] < 0 && L.loop.label[1] > L.loop.cy + L.loop.r * 0.5, "(가) sits above-left of the loop");
// 반지름이 상자 높이의 절반보다 작으면 왼쪽 반원
const small = g.dogmaLayout({ ...o, loopR: 2 }, 1).loop;
assert.strictEqual(small.start, 90); assert.strictEqual(small.end, 270);

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
assert.ok(source.includes('prefKey: "CentralDogma/settings", settingsTag: "v2"'), "geometry changed → v2 settings");
assert.ok(source.includes('var parts = [spec.settingsTag || "v1"];') && source.includes('p[0] !== (spec.settingsTag || "v1")'));
assert.ok(/\{key: "wBox", label: "상자 테두리"[^}]*value: 0\.3\}/.test(source));
assert.ok(/\{key: "wArrow", label: "화살표"[^}]*value: 0\.5\}/.test(source));
assert.ok(source.includes('makeCollapsiblePanel(page, ctl.panel, true, spec.name + "/" + ctl.panel)'));
assert.ok(!source.includes("HeatEngineCycle"), "no leftovers from the template");
assert.ok(source.includes('value: "DNA, ㉠, ㉡"') && source.includes('value: "(가), (나), (다)"'));
// 글자 서체: (가)는 한글이어도 괄호까지 기호로 보고 바탕체 1.25배, ㉠ ⓐ ①은 바탕체 1.125배, Ⅰ은 로마 숫자 서체
{
  const kind = new Function(`${extract("formSymbolKind")}\nreturn formSymbolKind;`)();
  const kinds = (text) => Array.from(text, (_, i) => kind(text, i));
  assert.deepStrictEqual(kinds("(가)"), ["bracket", "bracket", "bracket"]);
  assert.deepStrictEqual(kinds("A(나)B"), [null, "bracket", "bracket", "bracket", null]);
  assert.deepStrictEqual(kinds("(가나)"), [null, null, null, null], "two syllables are words, not an item label");
  assert.deepStrictEqual(kinds("(a)"), [null, null, null], "Latin in brackets stays text");
  assert.deepStrictEqual(kinds("㉠ⓐⒶ①⓪Ⅰ"), ["circle", "circle", "circle", "circle", "circle", "roman"]);
  assert.deepStrictEqual(kinds("가"), [null]);

  const fonts = new Function("FontBaselineOption", `var FORM_KOR_FONT = "kor", FORM_ENG_FONT = "eng", FORM_ITALIC_FONT = "ita", FORM_MATH_FONT = "math", FORM_SYMBOL_FONT = "batang", FORM_ROMAN_FONT = "kopub";
${extract("formSymbolKind")}\n${extract("formFonts")}\nreturn formFonts;`)({});
  const draw = (text) => {
    const chars = Array.from(text, () => ({ characterAttributes: { size: 8 } }));
    fonts({ contents: text, textRange: { characters: chars } });
    return chars.map((c) => [c.characterAttributes.textFont, c.characterAttributes.size, c.characterAttributes.baselineShift]);
  };
  assert.deepStrictEqual(draw("(가)"), [["batang", 10, 0], ["batang", 10, 0], ["batang", 10, 0]], "(가) → 바탕체 10pt");
  assert.deepStrictEqual(draw("㉠"), [["batang", 9, 0]], "㉠ → 바탕체 9pt");
  assert.deepStrictEqual(draw("Ⅱ"), [["kopub", 8, 0]]);
  assert.deepStrictEqual(draw("전사"), [["kor", 8, 0], ["kor", 8, 0]]);
  assert.deepStrictEqual(draw("DNA").map((f) => f[0]), ["eng", "eng", "eng"]);
}
// 글자 크기 재기: 윤곽선 만들기가 실패해도 복제본을 남기지 않는다(남으면 (나)가 겹쳐 보였다)
{
  const ink = new Function(`${extract("formInkBounds")}\nreturn formInkBounds;`)();
  const removed = [];
  const copy = { remove() { removed.push("copy"); }, createOutline() { throw new Error("Target layer cannot be modified"); } };
  const frame = { geometricBounds: [1, 2, 3, 4], duplicate() { return copy; } };
  assert.deepStrictEqual(ink(frame), [1, 2, 3, 4], "falls back to the frame bounds");
  assert.deepStrictEqual(removed, ["copy"], "failed copy is removed");
  const outlined = { geometricBounds: [5, 6, 7, 8], remove() { removed.push("outline"); } };
  const ok = { geometricBounds: [0, 0, 0, 0], duplicate() { return { createOutline() { return outlined; }, remove() { removed.push("stale copy"); } }; } };
  assert.deepStrictEqual(ink(ok), [5, 6, 7, 8]);
  assert.deepStrictEqual(removed, ["copy", "outline"], "outline removed, consumed copy not touched");
}
// 다시 그리기: 그리는 사이에 온 요청은 겹쳐 그리지 않고 끝난 뒤 한 번 더 그린다
{
  const body = extract("redraw");
  const guard = source.slice(source.indexOf("var drawing = false, drawAgain = false;"), source.indexOf("function redraw()"));
  // 그리는 도중(글자 크기를 재는 사이 등)에 키 입력이 한 번 끼어든다고 본다
  let depth = 0, maxDepth = 0, builds = 0, nested = 1;
  const redraw = new Function("app", "removeGroup", "build", `var previewOn = true;\n${guard}\n${body}\nreturn redraw;`)(
    { redraw() {} }, () => {}, () => { depth++; maxDepth = Math.max(maxDepth, depth); builds++; if (nested-- > 0) redraw(); depth--; });
  redraw();
  assert.strictEqual(maxDepth, 1, "never draws inside another draw");
  assert.strictEqual(builds, 2, "the request that came in while drawing is drawn once afterwards");
}
console.log("central dogma checks passed");
