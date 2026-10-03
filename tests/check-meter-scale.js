const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, '../스크립트/01_도형/Object_MeterScale.jsx'), 'utf8');
new vm.Script(source);

function run(show, saved, preferenceFailure = false) {
  const log = {groups: [], writes: [], controls: []};
  const points = [[0, 0], [170, 0], [170, 85], [0, 85]].map(anchor => ({anchor, leftDirection: anchor, rightDirection: anchor}));
  const original = {typename: 'PathItem', closed: true, pathPoints: points, geometricBounds: [0, 85, 170, 0],
    hidden: false, removed: false, remove() { this.removed = true; }};
  function group() {
    const g = {removed: false, paths: [], labels: [], moves: [], move() {}, remove() {this.removed = true;},
      translate(x, y) {this.moves.push([x, y]);},
      pathItems: {add() {
        const p = {pathPoints: [], setEntirePath(pts) {
          this.pathPoints = pts.map(anchor => ({anchor, leftDirection: anchor, rightDirection: anchor}));
        }}; g.paths.push(p); return p;
      }},
      textFrames: {add() {
        const t = {textRange: {characterAttributes: {}}, geometricBounds: [0, 8, 8, 0], position: [0, 0], rotate() {},
          translate(x, y) {this.position = [x, y];}};
        Object.defineProperty(t, 'contents', {get() {return this.value;}, set(value) {
          this.value = value;
          this.textRange.characters = [...value].map(contents => ({contents, characterAttributes: {}}));
        }});
        g.labels.push(t); return t;
      }}
    }; log.groups.push(g); return g;
  }
  original.layer = {groupItems: {add: group}};
  const doc = {selection: [original]};
  function control(type, text) {
    const c = {type, text, children: [], preferredSize: {}, enabled: true,
      add(type, ignored, text, fourth, fifth) {
        const child = control(type, text);
        child.value = text; child.minvalue = fourth; child.maxvalue = fifth;
        this.children.push(child); log.controls.push(child); return child;
      }, layout: {layout() {}}, close() {if (this.onClose) this.onClose();}, show() {show(log, this, original);}};
    Object.defineProperty(c, 'selection', {get() {return this.selectedItem;}, set(v) {this.selectedItem = typeof v === 'number' ? {index: v} : v;}});
    return c;
  }
  const ctx = {console, app: {documents: [doc], activeDocument: doc, redraw() {}, textFonts: {getByName(name) {return {name}; }},
    preferences: {getStringPreference() {if (preferenceFailure) throw Error('unavailable'); return saved || '';},
      setStringPreference(key, value) {if (preferenceFailure) throw Error('unavailable'); log.writes.push([key, value]);}}},
    Window: function() {return control('dialog', '');}, File: function() {throw Error('no file IO in mock');}, Folder: {temp: ''},
    $: {evalFile() {}, fileName: ''}, GrayColor: function() {}, NoColor: function() {}, StrokeCap: {BUTTENDCAP: 1},
    ElementPlacement: {PLACEBEFORE: 1}, alert(message) {throw Error(message);}};
  vm.runInNewContext(source, ctx);
  return {log, original};
}
const button = (log, text) => log.controls.find(c => c.type === 'button' && c.text === text);
const check = (log, text) => log.controls.find(c => c.type === 'checkbox' && c.text === text);
const row = (log, label) => {
  const parent = log.controls.find(c => c.type === 'group' && c.children.some(x => x.text === label));
  return {input: parent.children[1], bar: parent.children[2]};
};

// Initial preview, translation without rebuilding, then cancel restores source and saves nothing.
{
  const {log, original} = run(log => {
    assert.strictEqual(log.groups.length, 1);
    const g = log.groups[0];
    assert.strictEqual(g.paths.length, 62); // baseline + 6*10+1 ticks
    assert.deepStrictEqual(g.labels.filter(t => t.contents !== '-').map(t => t.contents), ['30', '20', '10', '0', '10', '20', '30']);
    assert.strictEqual(g.labels.filter(t => t.contents === '-').length, 3);
    assert.ok(g.labels.filter(t => t.contents === '-').every(t => t.textRange.characterAttributes.textFont.name === 'Batang'));
    assert.ok(g.labels.filter(t => t.contents !== '-').every(t => t.textRange.characterAttributes.textFont.name === 'GSMediumB1'));
    const x = row(log, '가로 (mm):'); x.bar.value = 5; x.bar.onChanging();
    assert.strictEqual(log.groups.length, 1);
    assert.ok(Math.abs(g.moves[1][0] - 5 * 2.834645669) < 1e-7);
    const y = row(log, '세로 (mm):'); y.input.text = '2'; y.input.onChange();
    assert.ok(g.moves[2][1] < 0);
    const preview = check(log, '미리보기'); preview.value = false; preview.onClick();
    assert.strictEqual(g.removed, true);
    assert.strictEqual(log.writes.length, 0);
  });
  assert.strictEqual(original.hidden, false); assert.strictEqual(original.removed, false);
  assert.strictEqual(log.writes.length, 0);
}

// Type presets, disabled preview confirm, and persistence round trip.
let saved;
for (const [kind, maximum] of [[1, 3], [2, 15]]) {
  const {log, original} = run(log => {
    const list = log.controls.find(c => c.type === 'dropdownlist'); list.selection = kind; list.onChange();
    assert.strictEqual(row(log, '최대값:').input.text, String(maximum));
    const curve = row(log, '곡률 (%):'); curve.input.text = '0'; curve.input.onChange();
    const g = log.groups[log.groups.length - 1];
    assert.ok(g.paths[0].pathPoints.every(p => p.anchor[1] === 0));
    assert.deepStrictEqual(g.labels.map(t => t.contents), kind === 1 ? ['0', '1', '2', '3'] : ['0', '5', '10', '15']);
    const preview = check(log, '미리보기'); preview.value = false; preview.onClick();
    button(log, '확인').onClick();
  });
  assert.strictEqual(original.removed, true);
  assert.strictEqual(log.groups[log.groups.length - 1].removed, false);
  assert.strictEqual(log.writes[0][0], 'Object_MeterScale/settings');
  saved = log.writes[0][1];
  assert.strictEqual(saved.split('|').length, 17);
  assert.strictEqual(saved.split('|')[0], 'v2');
}
run(log => {
  assert.strictEqual(row(log, '최대값:').input.text, '15');
  assert.strictEqual(check(log, '미리보기').value, false);
  assert.strictEqual(log.groups.length, 0);
}, saved);
run(log => assert.strictEqual(row(log, '최대값:').input.text, '30'), 'v0|invalid');
run(log => button(log, '확인').onClick(), '', true);

// Spacing moves only the labels, applies GSMediumB1, and survives the settings round trip.
let gapSaved;
run(log => {
  const before = log.groups[0];
  const gap = row(log, '숫자 간격 (mm):'); gap.input.text = '1.5'; gap.input.onChange();
  const after = log.groups[log.groups.length - 1];
  assert.deepStrictEqual(after.paths.map(p => p.pathPoints), before.paths.map(p => p.pathPoints));
  const middle = after.labels.findIndex(t => t.contents === '0');
  assert.ok(Math.abs(after.labels[middle].position[1] - before.labels[middle].position[1] - 2.834645669) < 1e-7);
  assert.ok(after.labels.filter(t => t.contents !== '-').every(t => t.textRange.characterAttributes.textFont.name === 'GSMediumB1'));
  button(log, '확인').onClick(); gapSaved = log.writes[0][1];
});
run(log => assert.strictEqual(row(log, '숫자 간격 (mm):').input.text, '1.5'), gapSaved);
run(log => assert.strictEqual(row(log, '최대값:').input.text, '30'), saved.replace(/^v2/, 'v1'));

// Minus signs occupy space to the left; the digits themselves remain centered on each major tick.
run(log => {
  const curve = row(log, '곡률 (%):'); curve.input.text = '0'; curve.input.onChange();
  const g = log.groups[log.groups.length - 1];
  const digits = g.labels.filter(t => t.contents !== '-');
  digits.forEach((text, i) => {
    const tick = g.paths[1 + i * 10].pathPoints[1].anchor;
    assert.ok(Math.abs(text.position[0] + 4 - tick[0]) < 1e-7, `digits ${i} center on the tick`);
  });
  const signs = g.labels.filter(t => t.contents === '-');
  signs.forEach((sign, i) => assert.ok(sign.position[0] < digits[i].position[0]));
});

// Numeric limits are shared by loading and dialog, invalid input never creates nonfinite geometry.
run(log => {
  const width = row(log, '너비 (mm):'); width.input.text = 'NaN'; width.input.onChange();
  assert.ok(Number.isFinite(Number(width.input.text)));
  const divisions = row(log, '큰눈금 구간 (개):'); divisions.input.text = '7'; divisions.input.onChange();
  assert.strictEqual(divisions.input.text, '8');
  const numbers = check(log, '숫자 표시'); numbers.value = false; numbers.onClick();
  assert.strictEqual(log.groups[log.groups.length - 1].labels.length, 0);
  assert.strictEqual(row(log, '숫자 크기 (pt):').input.enabled, false);
  assert.strictEqual(row(log, '숫자 간격 (mm):').input.enabled, false);
  for (const g of log.groups) for (const p of g.paths) for (const pt of p.pathPoints) {
    assert.ok(pt.anchor.every(Number.isFinite));
  }
});
console.log('check-meter-scale: OK');
