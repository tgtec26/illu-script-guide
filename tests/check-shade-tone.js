const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 영역 음영 색 팔레트(웹 math-shared.js의 SHADE_TONES·toneColor와 같은 뜻)를 쓰는 수학 탭들의 검사.
// 탭마다 SHADE_TONES·makeTone 사본이 있으므로 모두 같은 글자인지, 웹과 같은 색이 나오는지, 대화상자·설정에 이어졌는지 본다.
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "스크립트", "05_수학");
const ENGINES = [
  ["수학2.jsx", "makeCalculusEngine"],
  ["확률과 통계.jsx", "makeDistributionEngine"],
  ["확률과 통계.jsx", "makePascalEngine"],
  ["공통수학.jsx", "makeInequalityEngine"],
  ["공통수학.jsx", "makeVennEngine"],
  ["중학교 수학.jsx", "makeNetEngine"],
  ["중학교 수학.jsx", "makeShadedAreaEngine"],
  ["중학교 수학.jsx", "makeFigureProblemEngine"],
];

function cut(text, start) {
  assert.ok(start >= 0, "missing start");
  let depth = 0;
  for (let index = text.indexOf("{", start); index < text.length; index++) {
    if (text[index] === "{") depth++;
    if (text[index] === "}" && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error("unbalanced");
}
const engineSource = (file, name) => {
  const bundle = fs.readFileSync(path.join(dir, file), "utf8");
  const start = bundle.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing engine: ${name}`);
  return cut(bundle, start);
};
const fn = (source, name) => {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  return cut(source, start);
};

class FakeColor { constructor() { this.kind = this.constructor.name; } }
class CMYKColor extends FakeColor {}
class RGBColor extends FakeColor {}
const hex = (c) => "#" + [c.red, c.green, c.blue].map((v) => v.toString(16).padStart(2, "0")).join("");
const load = (source, cmyk) => new Function("CMYKColor", "RGBColor", "DocumentColorSpace",
  `var doc = { documentColorSpace: ${cmyk ? "DocumentColorSpace.CMYK" : "DocumentColorSpace.RGB"} };\n${fn(source, "shadeTones")}\n${fn(source, "makeGray")}\n${fn(source, "shadeToneNames")}\n${fn(source, "makeTone")}\nreturn { shadeTones, shadeToneNames, makeTone, makeGray };`)(CMYKColor, RGBColor, { CMYK: 1, RGB: 2 });

// 웹 toneColor(20, 번호)와 같은 값 (src/generators/math-shared.test.js의 표)
const WEB_K20 = ["#cccccc", "#a6cff2", "#f0a8c2", "#c4e6b3", "#fae89e", "#f7c9a1", "#c8b5e3"];

let reference = null;
for (const [file, name] of ENGINES.filter((e) => !process.env.ONLY || e[1] === process.env.ONLY)) {
  const source = engineSource(file, name);
  const label = `${name}(${file})`;
  const g = load(source, false);
  assert.deepStrictEqual(g.shadeToneNames(), ["회색", "파랑", "분홍", "연두", "노랑", "주황", "보라"], `${label}: 팔레트 이름`);
  for (let i = 0; i < WEB_K20.length; i++) assert.strictEqual(hex(g.makeTone(20, i)), WEB_K20[i], `${label}: K20 색 ${i}`);
  for (let i = 0; i < WEB_K20.length; i++) {
    assert.strictEqual(hex(g.makeTone(0, i)), "#ffffff", `${label}: K0은 흰색 ${i}`);
    assert.strictEqual(hex(g.makeTone(100, i)), "#000000", `${label}: K100은 검정 ${i}`);
  }
  assert.strictEqual(hex(g.makeTone(30, 99)), hex(g.makeGray(30)), `${label}: 번호 밖은 회색`);
  // CMYK 문서: 파랑은 시안 기운, 분홍은 마젠타 기운, 값은 0~100
  const c = load(source, true);
  const blue = c.makeTone(20, 1), pink = c.makeTone(20, 2);
  assert.ok(blue.cyan > blue.yellow && blue.cyan > 0, `${label}: CMYK 파랑 ${JSON.stringify(blue)}`);
  assert.ok(pink.magenta > pink.cyan && pink.magenta > 0, `${label}: CMYK 분홍 ${JSON.stringify(pink)}`);
  for (const v of [blue.cyan, blue.magenta, blue.yellow, blue.black, pink.cyan, pink.magenta, pink.yellow, pink.black]) assert.ok(v >= 0 && v <= 100, `${label}: CMYK 범위 ${v}`);
  // 사본이 모두 같은 글자
  const text = fn(source, "shadeTones") + fn(source, "shadeToneNames") + fn(source, "makeTone");
  if (reference === null) reference = text;
  assert.strictEqual(text, reference, `${label}: 팔레트 사본이 다르다`);
  // 대화상자·그리기·설정에 이어졌는지
  assert.ok(/"음영 색:?"/.test(source), `${label}: 대화상자에 '음영 색'`);
  assert.ok(source.includes("shadeToneNames()"), `${label}: 드롭다운이 팔레트 이름을 쓴다`);
  assert.ok(/makeTone\([^)]*shadeTone\)/.test(source.replace(/function makeTone[\s\S]*$/, "")) || /makeTone\([^)]*[Tt]one/.test(source), `${label}: 칠할 때 makeTone`);
  assert.ok(/shadeTone\s*=\s*(Math\.round\()?restoreNumber\(p\[\d+\], shadeTone, 0, shadeTones\(\)\.length - 1\)/.test(source), `${label}: 설정 복원`);
}
console.log("shade tone checks passed");
