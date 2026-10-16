// 탭 선택 줄: 라디오 버튼이 기본이고, 너무 넓을 때만 드롭다운을 쓴다
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const helper = fs.readFileSync(path.join(root, "스크립트", "00_세팅", "ui_tab_helper.jsxinc"), "utf8");
const ctx = { $: { global: { __noCompact: true } } };
vm.createContext(ctx);
vm.runInContext(helper, ctx);
const needs = (labels) => ctx.tabSelectorNeedsDropdown(labels);

assert.equal(needs(["중심 원리", "유전자 발현"]), false, "탭 둘은 라디오");
assert.equal(needs(["원기둥", "원뿔", "구"]), false);
assert.equal(needs(["축", "마커", "표", "분할", "모델", "원", "복사"]), false, "짧은 이름 일곱 개는 라디오");
assert.equal(needs(["표기", "수직선", "좌표평면", "통계", "작도", "전개도", "원", "색칠한 부분", "도형 문제", "실생활 그래프", "수형도"]), true, "열한 개는 드롭다운");
assert.equal(needs(["도형의 이동", "원과 직선", "부등식 영역", "벤다이어그램", "이차함수", "유리·무리함수"]), true, "긴 이름 여섯 개는 드롭다운");
assert.equal(needs([]), false);

// 드롭다운을 무조건 만드는 묶음이 없어야 한다: dropdownlist로 탭 선택 줄을 만드는 곳은 모두 이 판정 안에 있다
const dirs = fs.readdirSync(path.join(root, "스크립트")).filter((d) => /^\d\d_/.test(d));
for (const dir of dirs) {
  for (const file of fs.readdirSync(path.join(root, "스크립트", dir)).filter((f) => f.endsWith(".jsx"))) {
    const source = fs.readFileSync(path.join(root, "스크립트", dir, file), "utf8");
    if (!/tabList = win\.add\("dropdownlist"/.test(source)) continue;
    assert.ok(/tabSelectorNeedsDropdown\(tabLabels\)/.test(source), `${dir}/${file}: 탭 선택 드롭다운은 tabSelectorNeedsDropdown 판정 안에서만 만든다`);
  }
}
console.log("check-tab-selector ok");
