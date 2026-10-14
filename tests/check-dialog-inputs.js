const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../스크립트/00_세팅/ui_tab_helper.jsxinc'), 'utf8');
const ctx = { $: { global: { __noCompact: true } } };
vm.createContext(ctx);
vm.runInContext(source, ctx);
function control(type, text, parent, props = {}) {
  const c = { type, text, parent, properties: props, enabled: true, visible: true,
    children: [], preferredSize: {}, maximumSize: {}, listeners: {},
    add(kind, bounds, value, properties) { const child = control(kind, value, this, properties); child.value = value; return child; },
    addEventListener(name, cb) { this.listeners[name] = cb; } };
  if (parent) parent.children.push(c);
  return c;
}
function fixture() {
  const win = control('dialog', '테스트');
  const input = control('edittext', '처음', win);
  const number = control('edittext', '3', win);
  const multi = control('edittext', '첫 줄', win, { multiline: true, wantReturn: true });
  const ok = control('button', '확인', win);
  const cancel = control('button', '취소', win, { name: 'cancel' });
  const slider = control('scrollbar', '', win);
  const reset = control('button', 'R', win);
  const model = { text: input.text, number: 3, multi: multi.text, renders: 0, confirms: 0 };
  function render() { model.renders++; model.preview = [input.text, number.text, multi.text]; }
  input.onChanging = input.onChange = function() { model.text = this.text; render(); };
  number.onChange = function() {
    const value = Number(this.text);
    if (this.text === '' || !Number.isFinite(value)) this.text = String(model.number);
    else model.number = Math.max(1, Math.min(10, value));
    this.text = String(model.number); render();
  };
  multi.onChanging = function() { model.multi = this.text; render(); };
  ok.onClick = function() { model.confirms++; model.saved = [model.text, model.number, model.multi]; };
  cancel.onClick = function() { model.cancelled = true; };
  slider.onChanging = function() { number.text = '7'; number.onChange(); render(); };
  reset.onClick = function() { number.text = '3'; number.onChange(); };
  ctx.bindTabOrder(win);
  return { win, input, number, multi, ok, cancel, slider, reset, model };
}
function key(c, name, extra = {}) {
  const event = { keyName: name, preventDefault() { this.prevented = true; }, ...extra };
  c.listeners.keydown(event);
  return event;
}
let f = fixture();
// 글자마다(onChanging) 다시 그리지 않고, 포커스 이동·Enter(onChange)에 반영한다(2026-10-14)
for (const text of ['ㅎ', '하', '한', '한글 완료']) {
  f.input.text = text; f.input.onChanging();
  assert.equal(f.model.renders, 0, '입력/한글 조합 중 렌더링 금지');
}
f.input.onChange();
assert.equal(f.model.renders, 1, '포커스 이동 때 반영');
assert.equal(f.model.text, '한글 완료');
assert.equal(key(f.input, 'Enter').prevented, undefined, 'IME 확정 Enter를 가로채지 않음');
assert.equal(f.win.defaultElement, null, 'Enter로 완료 버튼 실행 금지');
key(f.input, 'Enter');
assert.equal(f.model.confirms, 0);
assert.equal(f.input.text, '한글 완료', 'Enter만 눌러도 입력 원문은 보존');
assert.equal(f.model.saved, undefined, 'Enter만으로 완료하지 않음');
assert.equal(key(f.multi, 'Enter').prevented, undefined, '여러 줄 Enter 유지');
assert.equal(key(f.input, 'Enter', { isComposing: true }).prevented, undefined);
f.number.text = '8'; f.multi.text = '첫 줄\n둘째 줄'; f.input.active = true;
f.ok.onClick();
assert.deepEqual(f.model.saved, ['한글 완료', 8, '첫 줄\n둘째 줄'], '포커스 이동 없이 최신 값 저장');
const renders = f.model.renders;
f.ok.onClick();
assert.equal(f.model.renders, renders, '중복 확인 때 입력 콜백 재실행 금지');
// 네이티브 Enter가 onChange를 전달하는 경우와 전달하지 않는 경우를 모두 검사한다.
for (const emitsChange of [false, true]) {
  const entered = fixture();
  entered.input.text = 'Enter 후 최신 글'; entered.number.text = '8';
  entered.input.active = true;
  key(entered.input, 'Enter');
  key(entered.number, 'Enter');
  if (emitsChange) { entered.input.onChange(); entered.number.onChange(); }
  assert.equal(entered.input.text, 'Enter 후 최신 글');
  assert.equal(entered.number.text, '8');
  assert.equal(entered.input.active, true, 'Enter가 포커스를 옮기지 않음');
  // 네이티브 onChange가 오면 바로 반영(미리보기), 오지 않으면 확인 때 반영
  assert.equal(entered.model.text, emitsChange ? 'Enter 후 최신 글' : '처음');
  assert.equal(entered.model.number, emitsChange ? 8 : 3);
  assert.equal(entered.model.saved, undefined, 'Enter만 누르면 저장/완료하지 않음');
  entered.ok.onClick();
  assert.deepEqual(entered.model.saved, ['Enter 후 최신 글', 8, '첫 줄'],
    '네이티브 onChange 유무와 무관하게 Enter 직후 완료가 원문을 읽음');
}
f = fixture(); f.input.text = ''; f.number.text = 'wrong'; f.ok.onClick();
assert.deepEqual(f.model.saved, ['', 3, '첫 줄']);
f = fixture(); f.number.text = ''; f.ok.onClick(); assert.equal(f.model.number, 3);
f = fixture(); f.number.text = '100'; f.ok.onClick(); assert.equal(f.model.number, 10);
f = fixture(); f.input.text = '취소할 글'; f.cancel.onClick();
assert.equal(f.model.renders, 0); assert.equal(f.model.saved, undefined);
f = fixture(); f.input.text = '미완성'; f.slider.onChanging();
assert.equal(f.input.text, '미완성');
assert.equal(f.model.preview[0], '처음', '다른 옵션의 미리보기에 미완성 텍스트 제외');
assert.equal(f.model.number, 7, '슬라이더 즉시 반영 유지');
f.reset.onClick(); assert.equal(f.model.number, 3, 'R의 기존 검증 경로 유지');
f.ok.onClick(); assert.equal(f.model.saved[0], '미완성');
f = fixture(); key(f.input, 'Tab'); assert.equal(f.number.active, true);
f = fixture(); f.input.text = '키 229';
assert.equal(key(f.input, 'Enter', { keyCode: 229 }).prevented, undefined);
assert.equal(key(f.input, 'Escape').prevented, undefined);
assert.equal(key(f.input, 'Up').prevented, undefined);
key(f.number, 'Tab', { shiftKey: true }); assert.equal(f.input.active, true);
f = fixture(); f.number.visible = false; f.number.text = '9'; f.ok.onClick();
assert.equal(f.model.number, 3, '숨겨진 탭의 모델에 입력 확정을 강제하지 않음');
f = fixture(); f.number.enabled = false; f.number.text = '9'; f.ok.onClick();
assert.equal(f.model.number, 3, '꺼진 입력창의 모델 유지');
f = fixture(); ctx.bindTabOrder(f.win); f.input.text = '한 번 바인딩'; f.ok.onClick();
assert.equal(f.model.saved[0], '한 번 바인딩');
// 원래 확인 콜백이 직접 onChange를 부르는 스크립트도 검증 경로를 유지한다.
const w = control('dialog', '직접 확정');
const n = control('edittext', '3', w);
const button = control('button', '확인', w);
let committedNumber;
n.onChange = function() { this.text = String(Math.min(10, Number(this.text))); };
button.onClick = function() { n.onChange(); committedNumber = Number(n.text); };
ctx.bindTabOrder(w); n.text = '100'; button.onClick(); assert.equal(committedNumber, 10);

// 실제 열기관 순환의 폼 엔진을 가져와 옵션 객체·저장값·미리보기까지 검사한다.
const engineSource = fs.readFileSync(path.join(__dirname, '../스크립트/01_도형/열기관 순환.jsx'), 'utf8');
const engineCode = engineSource.slice(engineSource.indexOf('function makeFormEngine(spec)'), engineSource.indexOf('// 그리기 도구.'));
const preferences = {};
const draws = [];
ctx.app = { redraw() {}, preferences: {
  getStringPreference(key) { return preferences[key]; },
  setStringPreference(key, value) { preferences[key] = value; }
} };
ctx.doc = { activeView: { centerPoint: [0, 0] }, activeLayer: {
  locked: false, visible: true, groupItems: { add() { return {
    geometricBounds: [0, 10, 10, 0], translate() {}, remove() {}
  }; } }
} };
ctx.FORM_MM = 2.834645669;
ctx.makeCollapsiblePanel = undefined;
ctx.formFormat = (value, decimals) => Number(value).toFixed(decimals);
ctx.makeFormTools = () => ({});
ctx.alert = message => { throw new Error(message); };
vm.runInContext(engineCode, ctx);
const engine = ctx.makeFormEngine({ label: '폼 테스트', name: 'Test', prefKey: 'Test/settings',
  controls: [{ key: 'label', label: '글', text: true, value: '처음' },
    { key: 'size', label: '크기', min: 1, max: 10, step: 1, value: 3 }],
  draw(tools, options) { draws.push([options.label, options.size]); }
});
const dialog = control('dialog', '폼 테스트');
engine.addRows(dialog);
const done = control('button', '확인', dialog);
done.onClick = () => engine.commit();
ctx.bindTabOrder(dialog);
engine.setPreview(true);
const realInputs = [];
ctx.collectEditTexts(dialog, realInputs);
realInputs[0].text = '한글 최신'; realInputs[0].onChange();
realInputs[1].text = '8'; realInputs[1].onChanging();
assert.equal(draws.length, 2, '실제 엔진: 글 입력은 바로 미리보기, onChange만 있는 숫자 칸은 확인 때');
assert.deepEqual(draws.at(-1), ['한글 최신', 3]);
done.onClick();
assert.deepEqual(draws.at(-1), ['한글 최신', 8]);
assert.equal(preferences['Test/settings'].split('|').slice(0, 3).join('|'), 'v1|한글 최신|8');
// 입력칸 옆 [완료](applyTo): 그 칸만 친 글 그대로 확정해 그리고, 창 확인으로 보지 않는다
{
  const win = control('dialog', '완료 단추');
  const text = control('edittext', '처음', win);
  const other = control('edittext', '3', win);
  const apply = control('button', '완료', win);
  const ok = control('button', '확인', win);
  const m = { text: '처음', other: '3', renders: 0 };
  // 폼 엔진처럼 처리기가 this가 아니라 입력창을 직접 읽는다(단추 onClick으로도 불리므로)
  text.onChange = function() { m.text = text.text; m.renders++; };
  other.onChange = function() { m.other = other.text; m.renders++; };
  apply.applyTo = text;
  apply.onClick = text.onChange;
  ok.onClick = function() { m.saved = [m.text, m.other]; };
  ctx.bindTabOrder(win);
  text.text = '새 글'; text.onChanging && text.onChanging();
  other.text = '9';
  assert.equal(m.renders, 0, '타이핑만으로는 그리지 않음');
  apply.onClick();
  assert.equal(m.text, '새 글', '[완료]는 친 글로 그 칸을 확정');
  assert.equal(m.renders, 1);
  assert.equal(m.other, '3', '다른 칸의 반영 전 글은 그대로 둔다');
  assert.equal(other.text, '9', '다른 칸의 친 글은 지우지 않는다');
  assert.equal(m.saved, undefined, '[완료]는 창 확인이 아님');
  ok.onClick();
  assert.deepEqual(m.saved, ['새 글', '9'], '확인 때 나머지도 반영');
}
console.log('PASS: no render while typing, apply button, focus-free confirm, Enter, multiline, IME guard, validation, cancel, slider/reset, Tab');
