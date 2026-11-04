const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../스크립트/04_지구과학/별 내부 구조.jsx'), 'utf8');
require('./es3-lint')(source, '별 내부 구조');
new vm.Script(source);
const KEY = 'ObjectStarInterior/settings';
const MM = 2.834645669;

function run(saved, show, selected = false) {
    const prefs = {...saved}, writes = [], groups = [], controls = [];
    const original = {typename:'PathItem', guides:false, clipping:false, closed:true, hidden:false,
        geometricBounds:[-25 * MM, 25 * MM, 25 * MM, -25 * MM],
        pathPoints:[0, 1, 2, 3].map(() => ({anchor:[0, 0], leftDirection:[1, 0], rightDirection:[0, 1]})),
        remove(){ this.removed = true; }};
    function control(type, unused, text, min, max) {
        const item = {type, text, value:typeof text === 'number' ? text : false, minvalue:min, maxvalue:max,
            children:[], preferredSize:{}, add(...args){ const child = control(...args); child.parent = this; this.children.push(child); return child; }};
        controls.push(item);
        return item;
    }
    function group() {
        const paths = [];
        const g = {paths, remove(){ this.removed = true; }, move(){}, translate(x, y){ this.dx = (this.dx || 0) + x; this.dy = (this.dy || 0) + y; }};
        g.pathItems = {add(){ const points = []; const p = {points, pathPoints:{add(){ const point = {}; points.push(point); return point; }}}; paths.push(p); return p; },
            ellipse(top, left, width, height){ const p = this.add(); p.points.push({anchor:[left, top]}, {anchor:[left + width, top - height]}); return p; }};
        groups.push(g);
        return g;
    }
    const doc = {selection:selected ? [original] : [], documentColorSpace:'CMYK', activeLayer:{groupItems:{add:group}},
        artboards:{getActiveArtboardIndex(){ return 0; }, 0:{artboardRect:[-200, 200, 200, -200]}}};
    function row(label) {
        const heading = controls.find(c => c.type === 'statictext' && c.text.split(' (')[0].replace(/:$/, '') === label);
        assert(heading, label + ' row exists');
        return heading.parent.children;
    }
    const api = {prefs, writes, groups, doc, original, row, controls, latest(){ return groups[groups.length - 1]; }};
    function Window(type, title) {
        const win = control(type, null, title);
        win.show = () => show(api);
        return win;
    }
    function File(){ return {parent:{parent:{fsName:'/fixture'}}, open(){}, write(){}, close(){}}; }
    vm.runInNewContext(source, {app:{documents:[doc], activeDocument:doc, redraw(){}, preferences:{
        getStringPreference(key){ return prefs[key] || ''; }, setStringPreference(key, value){ prefs[key] = value; writes.push(key); }}},
        Window, File, Folder:{temp:'/tmp'}, $:{fileName:'/fixture/star.jsx', evalFile(){}},
        CMYKColor:function(){}, RGBColor:function(){}, DocumentColorSpace:{CMYK:'CMYK'},
        PointType:{CORNER:1, SMOOTH:2}, ElementPlacement:{PLACEBEFORE:1}, alert(message){ throw Error(message); }});
    return api;
}

function points(group) { return group.paths.flatMap(p => p.points.map(p => p.anchor)); }
const scaled = run({}, ui => {
    const [label, input, slider, reset] = ui.row('별 크기');
    assert.equal(input.text, '100');
    assert.equal(slider.minvalue, 10); assert.equal(slider.maxvalue, 300);
    const baseline = points(ui.latest());
    slider.value = 200; slider.onChanging();
    const doubled = points(ui.latest());
    assert.equal(doubled.length, baseline.length);
    doubled.forEach((p, i) => p.forEach((v, axis) => assert(Math.abs(v - baseline[i][axis] * 2) < 1e-8)));
    const count = ui.groups.length;
    const x = ui.row('가로'); x[1].text = '7.5'; x[1].onChange();
    assert.equal(ui.groups.length, count, 'Position must translate without rebuilding');
    assert.equal(ui.latest().dx, 7.5 * MM);
    reset.onClick(); assert.equal(input.text, '100');
    input.text = '175.5'; input.onChange();
    return 1;
}, true);
assert.equal(scaled.prefs[KEY].split('|')[0], 'v7');
assert.equal(scaled.prefs[KEY].split('|').length, 12);
assert.equal(scaled.prefs[KEY].split('|')[11], '175.5');
assert.equal(scaled.prefs[KEY + '/frame'], 'v1|50.00|50.00', 'Frame stores original circle, not scaled result');
assert.equal(scaled.original.removed, true);
run(scaled.prefs, ui => {
    const row = ui.row('별 크기'); assert.equal(row[1].text, '175.5');
    row[3].onClick(); assert.equal(row[1].text, '100', 'R restores pre-preference default');
    return 2;
});
const canceled = run({}, ui => { const row = ui.row('별 크기'); row[2].value = 150; row[2].onChanging(); return 2; }, true);
assert.equal(canceled.writes.length, 0); assert.equal(canceled.original.hidden, false);
assert(!canceled.original.removed); assert(canceled.groups.every(g => g.removed));
for (const size of ['9', '301', 'NaN', 'Infinity']) {
    run({[KEY]:'v7|6|180|40|0|0|0|1|15|0|0|' + size}, ui => { assert.equal(ui.row('별 크기')[1].text, '100'); return 2; });
}
run({[KEY]:'v6|4|90|30|10|20|30|0|25|7|8'}, ui => {
    assert.equal(ui.row('별 크기')[1].text, '100'); assert.equal(ui.row('껍질 수')[1].text, '4'); return 2;
});
run({[KEY]:'v7|4|90|30|10|20|30|0|25|7|8|150|extra'}, ui => {
    assert.equal(ui.row('별 크기')[1].text, '100'); assert.equal(ui.row('껍질 수')[1].text, '6'); return 2;
});
console.log('PASS: live size geometry, position translation, R, save/restore, cancel, frame, bounds, legacy settings, ES3/syntax');
