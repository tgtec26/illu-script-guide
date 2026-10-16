// 공통 헬퍼가 미리보기 있는 창의 글 입력칸 오른쪽에 [완료]를 자동으로 다는지 검사한다
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../스크립트/00_세팅/ui_tab_helper.jsxinc'), 'utf8');
const ctx = { $: { global: { __noCompact: true } } };
vm.createContext(ctx);
vm.runInContext(source, ctx);

function control(type, text, parent, props = {}) {
  const c = { type, text, parent, properties: props, enabled: true, visible: true, children: [], preferredSize: {}, maximumSize: {}, listeners: {},
    add(kind, bounds, value, properties) { return control(kind, value, this, properties); },
    addEventListener(name, cb) { this.listeners[name] = cb; } }; // ScriptUI에는 moveAfter가 없다
  if (parent) parent.children.push(c);
  return c;
}
const kinds = (container) => container.children.map((c) => c.type + ':' + (c.text || ''));

function fixture({ preview = true } = {}) {
  const win = control('dialog', '테스트');
  const applied = [];
  // 글 입력 줄: 라벨 + 입력칸
  const textRow = control('group', '', win);
  control('statictext', '이름', textRow);
  const text = control('edittext', '처음', textRow);
  text.onChange = function() { applied.push(['text', this.text]); };
  // 숫자 줄: 라벨 + 입력칸 + 슬라이더 + R
  const numRow = control('group', '', win);
  control('statictext', '크기', numRow);
  const num = control('edittext', '3', numRow);
  control('scrollbar', '', numRow);
  control('button', 'R', numRow);
  num.onChange = function() { applied.push(['num', this.text]); };
  // 입력칸 뒤에 다른 칸이 더 있는 줄
  const mixedRow = control('group', '', win);
  const mixed = control('edittext', '혼합', mixedRow);
  control('dropdownlist', '', mixedRow);
  mixed.onChange = function() { applied.push(['mixed', this.text]); };
  // 입력칸이 둘인 줄
  const pairRow = control('group', '', win);
  const pairA = control('edittext', 'A', pairRow);
  const pairB = control('edittext', 'B', pairRow);
  pairA.onChange = function() { applied.push(['pairA', this.text]); };
  pairB.onChange = function() { applied.push(['pairB', this.text]); };
  // 이미 [완료]가 있는 줄
  const doneRow = control('group', '', win);
  const done = control('edittext', '기존', doneRow);
  const doneButton = control('button', '완료', doneRow);
  doneButton.applyTo = done;
  doneButton.onClick = function() { done.onChange(); };
  done.onChange = function() { applied.push(['done', this.text]); };
  // 여러 줄 입력칸(패널 안)
  const panel = control('panel', '목록', win);
  const multi = control('edittext', '첫 줄', panel, { multiline: true });
  multi.onChange = function() { applied.push(['multi', this.text]); };
  if (preview) control('checkbox', '미리보기', win);
  const ok = control('button', '확인', win);
  ok.onClick = function() { applied.push(['ok']); };
  ctx.bindTabOrder(win);
  return { win, textRow, numRow, mixedRow, pairRow, pairA, pairB, doneRow, panel, text, num, mixed, done, multi, applied };
}

let f = fixture();
// 글 입력칸 오른쪽에 [완료]
assert.deepEqual(kinds(f.textRow), ['statictext:이름', 'edittext:처음', 'button:완료']);
const button = f.textRow.children[2];
assert.equal(button.applyTo, f.text);
// 슬라이더 옆 숫자 줄에는 달지 않는다
assert.deepEqual(kinds(f.numRow), ['statictext:크기', 'edittext:3', 'scrollbar:', 'button:R']);
// ScriptUI에는 moveAfter가 없어 단추는 줄 끝에 붙는다(입력칸 뒤에 다른 칸이 있어도)
assert.deepEqual(kinds(f.mixedRow), ['edittext:혼합', 'dropdownlist:', 'button:완료']);
// 입력칸이 둘인 줄은 단추 하나가 둘 다 반영한다
assert.deepEqual(kinds(f.pairRow), ['edittext:A', 'edittext:B', 'button:완료']);
// 이미 있으면 더 달지 않는다
assert.deepEqual(kinds(f.doneRow), ['edittext:기존', 'button:완료']);
// 여러 줄 입력칸도 [완료]
assert.deepEqual(kinds(f.panel), ['edittext:첫 줄', 'button:완료']);

// 눌러서 반영: 친 글 그대로 그 칸의 처리기를 한 번 부른다
f.text.text = '새 글';
button.onClick();
assert.deepEqual(f.applied, [['text', '새 글']]);
assert.equal(f.text.text, '새 글', '[완료]는 친 글을 되돌리지 않는다');
f.applied.length = 0;
f.mixed.text = '다른 칸 옆';
f.mixedRow.children[2].onClick();
assert.deepEqual(f.applied, [['mixed', '다른 칸 옆']]);
f.applied.length = 0;
f.multi.text = '첫 줄\n둘째 줄';
f.panel.children[1].onClick();
assert.deepEqual(f.applied, [['multi', '첫 줄\n둘째 줄']]);

// 포커스 이동과 Enter는 그대로 반영
f = fixture();
f.text.text = '포커스 이동';
f.text.onChange();
assert.deepEqual(f.applied.pop(), ['text', '포커스 이동']);
f.text.text = 'Enter 입력';
f.text.listeners.keydown({ keyName: 'Enter' });
assert.deepEqual(f.applied.pop(), ['text', 'Enter 입력']);

// 미리보기가 없는 창에는 달지 않는다
f = fixture({ preview: false });
assert.deepEqual(kinds(f.textRow), ['statictext:이름', 'edittext:처음']);
assert.deepEqual(kinds(f.panel), ['edittext:첫 줄']);

// 끄는 스위치
ctx.$.global.__noAutoApply = true;
f = fixture();
assert.deepEqual(kinds(f.textRow), ['statictext:이름', 'edittext:처음']);
delete ctx.$.global.__noAutoApply;

console.log('check-apply-buttons ok');
