const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('스크립트/00_세팅/ui_tab_helper.jsxinc', 'utf8');
const aliases = JSON.parse(fs.readFileSync('스크립트/00_세팅/ui_label_aliases.json', 'utf8'));
const ctx = { $: { global: {} } };
vm.createContext(ctx);
vm.runInContext(source, ctx);
ctx.COMPACT_LABEL_ALIASES = aliases;
function control(type, text, parent) {
  const c = { type, text, children: [], parent, margins: [0, 0, 0, 0],
    preferredSize: { width: 200 }, minimumSize: { width: 0 }, maximumSize: { width: 10000 },
    graphics: { measureString(text) { return [String(text).length * 7, 14]; } } };
  if (parent) parent.children.push(c);
  return c;
}
const win = control('dialog', '시험');
const panel = control('panel', '상자와 화살표 간격', win);
const standalone = control('checkbox', '원래 그래프 점선', panel);
function row(label, min, max, step) {
  const g = control('group', '', panel);
  const title = control('statictext', label, g);
  const input = control('edittext', '1.2', g);
  input.characters = 6;
  const bar = control('scrollbar', '', g);
  Object.assign(bar, { minvalue: min, maxvalue: max, stepdelta: step });
  return { g, title, input, bar };
}
const small = row('상자와 화살표 간격', 0, 5, 0.1);
const large = row('위아래 기울기', -10000, 10000, 0.1);
ctx.compactInputLabels(win);
ctx.compactAlignRows(win);
assert.equal(small.title.text, '화살표 간격');
assert.match(small.title.helpTip, /상자와 화살표 간격/);
assert.equal(panel.text, '상자와 화살표 간격', '패널 제목은 수정하지 않음');
assert.equal(standalone.text, '원래 그래프 점선', '독립 체크박스는 수정하지 않음');
let catalogTitle;
small.title.text = '상자와 화살표 간격';
ctx.uiCatalogAndOverrides = function() { catalogTitle = small.title.text; };
ctx.compactDialog(win);
assert.equal(catalogTitle, '상자와 화살표 간격', 'UI 관리 orig·경로는 축약 전 문구로 유지');
assert.equal(small.title.text, '화살표 간격');
assert.equal(small.input.characters, 4);
assert.equal(small.input.preferredSize.width, ctx.COMPACT_EDIT_WIDTH);
assert.ok(large.input.preferredSize.width > small.input.preferredSize.width, '큰 수의 필요한 폭은 해당 칸만 확보');
const single = control('dialog', '한 줄');
const g = control('group', '', single);
control('statictext', '크기', g);
const input = control('edittext', '3', g);
Object.assign(control('scrollbar', '', g), { minvalue: 0, maxvalue: 10, stepdelta: 1 });
ctx.compactAlignRows(single);
assert.equal(input.preferredSize.width, ctx.COMPACT_EDIT_WIDTH, '행 하나뿐인 창도 줄임');
for (const [original, short] of Object.entries(aliases)) {
  assert.ok(ctx.compactLabelLength(short) <= 6, `${original} → ${short}`);
}
console.log('check-compact-inputs ok');
