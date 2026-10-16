const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint.js");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "07_문자", "한글·영문 서체 적용.jsx"), "utf8");
es3Lint(source, "한글·영문 서체 적용.jsx");

const start = source.indexOf("function symbolKind(");
let depth = 0, end = -1;
for (let i = source.indexOf("{", start); i < source.length; i++) {
  if (source[i] === "{") depth++;
  if (source[i] === "}" && --depth === 0) { end = i + 1; break; }
}
const symbolKind = new Function(`${source.slice(start, end)}\nreturn symbolKind;`)();
const kind = (ch) => symbolKind(ch.charCodeAt(0));

for (const ch of "㉠㉡㉥㉮ⓐⓑⓩⒶⒷ①②⑩⑳⓪") assert.strictEqual(kind(ch), "circle", ch);
for (const ch of "ⅠⅡⅢⅩⅰⅱ") assert.strictEqual(kind(ch), "roman", ch);
for (const ch of "가ㄱA1( )·°") assert.strictEqual(kind(ch), null, ch);

// 텍스트 삽입.jsx와 같은 크기·서체 규칙
assert.ok(/var circleFontSize = 9;/.test(source) && /var romanFontSize = 8;/.test(source));
assert.ok(source.includes('"KoPubWorld바탕체_Pro"'), "roman numerals use KoPubWorld Batang Pro like 텍스트 삽입");
const insert = fs.readFileSync(path.join(root, "스크립트", "07_문자", "텍스트 삽입.jsx"), "utf8");
assert.ok(/\{contents: \["㉠"[^\]]*\], fontSize: 9, fontNames: \["Batang"\]\}/.test(insert), "텍스트 삽입 still uses Batang 9pt for ㉠");
assert.ok(/\{contents: \["Ⅰ"[^\]]*\], fontSize: 8, fontNames: romanFontCandidates\}/.test(insert), "텍스트 삽입 still uses KoPub 8pt for Ⅰ");
assert.ok(/\{contents: \["①"[^\]]*\], fontSize: 9, fontNames: \["Batang"\]\}/.test(insert), "텍스트 삽입 uses Batang 9pt for ① like the other circled letters");
// 원문자·로마 숫자 판별은 한글 판별보다 먼저(㉠은 한글 범위가 아니라 영문 서체로 가던 것을 막는다)
assert.ok(source.indexOf('if (kind === "circle")') < source.indexOf("var isKorean"), "symbol rules come before the Korean/English split");
console.log("font apply checks passed");
