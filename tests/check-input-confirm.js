// 입력창을 가진 모든 스크립트가 공통 헬퍼(ui_tab_helper.jsxinc)를 불러와 bindTabOrder를 부르는지 검사한다.
// 포커스 이동(onChange)·Enter(enterApply)·[완료](applyTo) 확정이 이 헬퍼 한 곳에서 처리된다.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "스크립트");
let checked = 0;
for (const dir of fs.readdirSync(root).filter((d) => /^\d\d_/.test(d) && d !== "00_세팅")) {
  for (const file of fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".jsx"))) {
    const source = fs.readFileSync(path.join(root, dir, file), "utf8");
    if (!/add\("edittext"/.test(source)) continue;
    checked++;
    assert.ok(/ui_tab_helper\.jsxinc/.test(source), `${dir}/${file}: 헬퍼 로더가 없다`);
    assert.ok(/bindTabOrder\(/.test(source), `${dir}/${file}: bindTabOrder를 부르지 않는다`);
  }
}
const helper = fs.readFileSync(path.join(root, "00_세팅", "ui_tab_helper.jsxinc"), "utf8");
assert.ok(/enterApply/.test(helper), "헬퍼에 Enter 반영(enterApply)이 있다");
console.log(`check-input-confirm ok (${checked}개 스크립트)`);
