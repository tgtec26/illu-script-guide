// ui_tab_helper.jsxinc의 uiSlug: 창 제목 → ui_catalog 파일 이름. 제목이 다르면 파일 이름도 달라야 목록에서 겹치지 않는다
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "00_세팅", "ui_tab_helper.jsxinc"), "utf8");
const start = source.indexOf("function uiSlug(");
const body = source.slice(start, source.indexOf("\n}\n", start) + 2);
const uiSlug = new Function(`${body}\nreturn uiSlug;`)();

assert.notStrictEqual(uiSlug("수학Ⅰ"), uiSlug("수학Ⅱ"), "수학Ⅰ and 수학Ⅱ get their own files");
assert.strictEqual(uiSlug("수학Ⅰ"), "수학Ⅰ");
// 기존 파일 이름은 그대로
assert.strictEqual(uiSlug("중학교 수학"), "중학교_수학");
assert.strictEqual(uiSlug("3D → 2D 라인"), "3D_2D_라인");
assert.strictEqual(uiSlug("염색체·세포 분열"), "염색체_세포_분열");
assert.strictEqual(uiSlug("그룹 해제 v.1.2.1"), "그룹_해제_v_1_2_1");
console.log("ui slug checks passed");
