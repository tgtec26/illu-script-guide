const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, '../스크립트/01_도형/3D.jsx'), 'utf8');
const start = source.indexOf('function makePlaneEngine() {');
assert.ok(start >= 0, 'bundle must contain plane rotation engine');
const body = source.slice(start, source.lastIndexOf('})();'));
const point = (x, y) => ({ anchor: [x, y], leftDirection: [x - 2, y], rightDirection: [x + 2, y] });
function makePath() {
  return { typename: 'PathItem', hidden: false, locked: false, removed: false, closed: true,
    controlBounds: [-12, 12, 12, -12], pathPoints: [point(-10, -10), point(10, -10), point(10, 10), point(-10, 10)],
    remove() { this.removed = true; },
    duplicate(group) { const copy = makePath(); copy.pathPoints = JSON.parse(JSON.stringify(this.pathPoints)); group.pageItems.push(copy); return copy; }
  };
}
function makeGroup() {
  return { typename: 'GroupItem', pageItems: [], removed: false,
    remove() { this.removed = true; }, move() {},
    translate(x, y) { for (const p of this.pageItems) for (const pt of p.pathPoints) for (const k of ['anchor', 'leftDirection', 'rightDirection']) { pt[k][0] += x; pt[k][1] += y; } }
  };
}
function load() {
  const c = { doc: { groupItems: { add: makeGroup } }, rotX: 0, rotY: 0, rotZ: 0,
    perspectiveOn: false, perspectiveMm: 300, MM_TO_PT: 2.834645669,
    ElementPlacement: { PLACEATEND: 1, PLACEBEFORE: 2 }, Math };
  vm.createContext(c); vm.runInContext(body + '\nvar engine = makePlaneEngine();', c);
  return c;
}
const snapshot = p => JSON.stringify(p.pathPoints);
{
  const c = load(), p = makePath(), before = snapshot(p);
  assert.strictEqual(c.engine.prepare([p]), null);
  const g = c.engine.create(false, false);
  assert.ok(g && p.hidden, 'preview must hide source');
  assert.strictEqual(snapshot(p), before, 'preview must not alter source geometry');
  assert.strictEqual(snapshot(g.pageItems[0]), before, 'zero rotation preserves anchors and handles');
  c.rotZ = 90;
  assert.strictEqual(c.engine.update(g), true);
  const a = g.pageItems[0].pathPoints[0].anchor;
  assert.ok(Math.abs(a[0] - 10) < 1e-8 && Math.abs(a[1] + 10) < 1e-8, 'screen rotation follows bundle coordinates');
  g.translate(40, 25);
  c.engine.update(g);
  assert.ok(Math.abs(g.pageItems[0].pathPoints[0].anchor[0] - 10) < 1e-8, 'update uses original coordinates, not previous offset');
  c.rotZ = 0; c.engine.update(g);
  assert.strictEqual(snapshot(g.pageItems[0]), before, 'repeated previews must not accumulate distortion');
  c.engine.release(); g.remove();
  assert.strictEqual(p.hidden, false, 'cancel/tab switch restores source visibility');
  assert.strictEqual(p.removed, false);
  assert.strictEqual(snapshot(p), before);
}
{
  const c = load(), p = makePath();
  c.engine.prepare([p]); const g = c.engine.create();
  c.engine.release(); c.engine.finish(g);
  assert.strictEqual(p.removed, true, 'confirm replaces source only');
  assert.strictEqual(g.removed, false);
}
{
  const c = load();
  assert.ok(c.engine.prepare([]), 'empty selection disables plane tab');
  assert.ok(c.engine.prepare([{ typename: 'TextFrame' }]), 'unsupported artwork must not be silently deleted');
  const group = { typename: 'GroupItem', pageItems: [makePath(), { typename: 'TextFrame' }] };
  assert.ok(c.engine.prepare([group]), 'mixed groups must be rejected before preview');
}
{
  const c = load(), p = makePath();
  c.engine.prepare([p]); c.rotX = 60; c.rotY = 20; c.perspectiveOn = true; c.perspectiveMm = 50;
  const g = c.engine.create();
  for (const pt of g.pageItems[0].pathPoints) for (const k of ['anchor', 'leftDirection', 'rightDirection']) {
    assert.ok(pt[k].every(Number.isFinite), 'perspective coordinates must stay finite');
  }
  c.engine.release();
}
console.log('plane3d: source safety, repeat preview, rotation, perspective and commit passed');

// Host performance and source lifecycle: test real preview handlers with counted DOM operations.
const previewCode = source.slice(source.indexOf('    function geometryKey()'), source.indexOf('    // 공통 항목 뒤에'));
const lightingCode = source.slice(source.indexOf('    function updateLighting('), source.indexOf('    function setView('));
function previewHost() {
  let creates = 0, removes = 0, redraws = 0, writes = 0;
  const c = { tabIndex: 0, rotY: 45, rotX: 35.3, rotZ: 0, perspectiveOn: false, perspectiveMm: 300,
    angleR: 131, angleL: 109, depthPercent: 100, hiddenMode: 1, fillMode: 2, brightness: 70,
    contrast: 40, lightAzimuth: -35, lightElevation: 50, offsetXmm: 0, offsetYmm: 0, MM_TO_PT: 2.834645669,
    previewEnabled: true, previewGroup: null, previewEngine: null, previewGeometryKey: '', previewRenderKey: '',
    previewIsLight: false, previewFillTargets: [], activeFillTargets: null, lastLiveRender: 0, LIVE_INTERVAL_MS: 60,
    app: { redraw() { redraws++; } }, translateItem() {}, makeKColor(k) { return k; },
    engine: { saveFields() { return [20]; }, create(light) { creates++; c.previewFillTargets = light ? [] : [[{path: { set fillColor(k) { writes++; } }, k: 30}]]; return { remove() { removes++; } }; },
      previewFills() { return [{k: 100 - c.brightness}]; } },
    counts() { return {creates, removes, redraws, writes}; } };
  vm.createContext(c); vm.runInContext(previewCode + lightingCode, c);
  return c;
}
{
  const c = previewHost(); c.updatePreview(); c.updatePreview(true); c.updatePreview(false);
  assert.strictEqual(c.counts().creates, 1, 'unchanged slider release must not rebuild precise preview');
  c.brightness = 80; c.updateLighting(false);
  assert.strictEqual(c.counts().creates, 1, 'brightness must reuse geometry');
  assert.strictEqual(c.counts().writes, 1);
  c.updateLighting(false);
  assert.strictEqual(c.counts().writes, 1, 'unchanged K must not be reassigned');
  c.rotY = 46; c.updatePreview();
  assert.strictEqual(c.counts().creates, 2, 'changed view rebuilds geometry');
  c.previewEnabled = false; c.updatePreview();
  assert.strictEqual(c.previewGroup, null);
}
{
  const c = previewHost(); c.engine.liveWireframe = true;
  c.updatePreview(true); c.updatePreview(false);
  assert.strictEqual(c.counts().creates, 2, 'extrude release must replace wireframe with precise preview');
}
console.log('3dline preview: duplicate renders skipped, lighting reuses geometry, final precision retained');

// Preference versions: preserve validated legacy values; save new tab and preview flag together.
{
  const prefs = source.slice(source.indexOf('    function saveSettings()'), source.indexOf('    // ==== 공통 기하'));
  const c = previewHost(); c.engines = Array.from({length: 5}, () => ({fieldCount: 0, saveFields() {return [];}, restoreFields() {}}));
  c.HIDDEN_NONE = 0; c.HIDDEN_SOLID = 2; c.FILL_NONE = 0; c.FILL_LIT = 2; c.POSITION_LIMIT_MM = 100;
  c.parseNumber = text => { const n = Number(text); return Number.isFinite(n) ? n : null; };
  c.PREF_KEY = 'Object3DLine/settings';
  let raw = '', saved = '';
  c.app.preferences = { getStringPreference() { return raw; }, setStringPreference(k, value) { saved = value; } };
  vm.runInContext(prefs, c);
  c.tabIndex = 4; c.previewEnabled = false; c.saveSettings();
  assert.ok(saved.startsWith('v4|4|'));
  raw = saved; c.previewEnabled = true; c.tabIndex = 0; c.applySavedSettings();
  assert.strictEqual(c.tabIndex, 4);
  assert.strictEqual(c.previewEnabled, true, 'saved preview flag is not restored: dialog always opens with preview off');
  raw = saved.replace('v4|', 'v3|').split('|').slice(0, 18).join('|');
  c.rotX = 99; c.previewEnabled = true; c.applySavedSettings();
  assert.strictEqual(c.rotX, 35.3, 'legacy fields restored at old offsets');
  assert.strictEqual(c.previewEnabled, true, 'legacy version has no preview flag');
  raw = saved + '|extra'; c.rotX = 99; c.applySavedSettings();
  assert.strictEqual(c.rotX, 99, 'wrong field count ignored');
  c.app.preferences.getStringPreference = () => {throw new Error('preference denied');};
  assert.doesNotThrow(() => c.applySavedSettings());
}
console.log('3dline preferences: v4 round trip, v3 migration, damaged values and read errors passed');
