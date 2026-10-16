const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('스크립트/00_세팅/ui_tab_helper.jsxinc', 'utf8');
const prefs = {};
const ctx = { $: { global: {} }, app: { preferences: {
  getStringPreference(k) { if (!(k in prefs)) throw Error('missing'); return prefs[k]; },
  setStringPreference(k, v) { prefs[k] = v; }
} } };
vm.createContext(ctx);
vm.runInContext(source, ctx);
function control(type, text, parent) {
  const c = { type, text, parent, children: [], visible: true, enabled: true,
    minimumSize: { width: 0, height: 0 }, maximumSize: { width: 10000, height: 10000 },
    preferredSize: { width: -1, height: -1 }, size: { width: 320, height: 120 },
    listeners: {}, addEventListener(k, f) { this.listeners[k] = f; },
    add(kind, bounds, text) { return control(kind, text, this); } };
  if (parent) parent.children.push(c);
  return c;
}
const win = control('dialog', '테스트');
win.layout = { layout() {} };
const panel = control('panel', '선 두께', win);
const nativeDraw = function() {};
panel.onDraw = nativeDraw;
const input = control('edittext', '0.3', panel);
input.maximumSize.height = 22;
const hidden = control('group', '', panel);
hidden.visible = false;
const children = panel.children.slice();
ctx.bindPanelFolds(win);
assert.equal(panel.onDraw, nativeDraw, '패널 기본 렌더링을 바꾸면 내부 그룹 컨트롤이 사라지므로 보존');
assert.equal(panel.text, '선 두께   ▼');
win.onShow();
assert.deepEqual(panel.children, children, '제어 요소 순서와 UI 관리 경로 유지');
assert.equal(panel.__foldState.collapsed, false);
ctx.setPanelFold(panel, true);
assert.equal(panel.text, '선 두께   ▶');
assert.equal(panel.maximumSize.height, 22, '제목만 남겨 높이 줄이기');
assert.equal(input.visible, false);
assert.equal(ctx.isTabTarget(win, input), false, '접힌 칸은 탭 이동 제외');
assert.equal(ctx.isDialogConfirmTarget(win, input), true, '접혀도 확인 때 미반영 입력 확정');
assert.equal(ctx.isDialogConfirmTarget(win, hidden), false, '원래 숨긴 탭은 제외');
ctx.setPanelFold(panel, false);
assert.equal(panel.text, '선 두께   ▼');
assert.equal(input.visible, true);
assert.equal(input.maximumSize.height, 22, '행 높이 제한 복원');
assert.equal(hidden.visible, false, '원래 숨긴 요소는 펼쳐도 숨김');
assert.equal(panel.maximumSize.height, 10000);
const count = panel.children.length;
ctx.bindPanelFolds(win);
assert.equal(panel.children.length, count, '중복 적용 없음');
// 자식 버튼에서 올라온 이벤트는 패널을 접지 않는다.
panel.listeners.mousedown({ target: input, clientY: 5 });
assert.equal(panel.__foldState.collapsed, false);
panel.listeners.mousedown({ target: panel, clientY: 8, button: 0 });
assert.equal(panel.__foldState.collapsed, true);
assert.equal(Object.values(prefs)[0], '1', '접기 즉시 상태 저장');
// 설정 실패는 접기·펼치기를 막지 않는다.
ctx.app.preferences.setStringPreference = () => { throw Error('unavailable'); };
assert.doesNotThrow(() => ctx.setPanelFold(panel, false, true));
// 접힌 상태로 확인해도 입력 중이던 값을 누락하지 않는다.
ctx.$.global.__noCompact = true;
let committed;
input.onChange = function() { committed = this.text; };
const ok = control('button', '확인', win);
ok.onClick = function() {};
ctx.bindTabOrder(win);
input.text = '0.8';
ctx.setPanelFold(panel, true);
ok.onClick();
assert.equal(committed, '0.8');
// 제목 있는 패널이 헬퍼에 연결되지 않은 스크립트가 없어야 한다.
const path = require('node:path');
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) walk(file);
    else if (name.endsWith('.jsx')) {
      const s = fs.readFileSync(file, 'utf8');
      if (/new Window\(/.test(s) && /["']panel["']/.test(s))
        assert.match(s, /bind(TabOrder|PanelFolds)\(/, file);
    }
  }
}
walk('스크립트');
console.log('check-panel-folds ok');
