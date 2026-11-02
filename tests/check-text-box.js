const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('스크립트/07_문자/텍스트 박스.jsx', 'utf8');
require('./es3-lint')(source, '텍스트 박스');
new vm.Script(source);
let saved = '', removed = 0;
const ctx = {
  mmToPt: 72 / 25.4, PREF_KEY: 'TextBox/settings',
  app: { preferences: {
    getStringPreference: () => saved,
    setStringPreference: (key, value) => { assert.equal(key, 'TextBox/settings'); saved = value; }
  } },
  PointType: { CORNER: 1 }
};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('    function addRow('), source.lastIndexOf('})();')), ctx);
const defaults = ctx.defaultOptions();
assert.equal(defaults.paddingX, 3);
assert.equal(defaults.paddingY, 1.5);
assert.equal(defaults.radius, 0);
assert.equal(defaults.strokeWidth, 0.3);
const bounds = [10, 40, 100, 20];
function near(a, b) { assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`); }
const points = ctx.getBoxPoints(bounds, defaults);
assert.equal(points.length, 4);
// Distance from visible glyph bounds to the INNER edge of the stroke.
near(bounds[0] - (points[0].anchor[0] + 0.15), 3 * ctx.mmToPt);
near(points[0].anchor[1] - 0.15 - bounds[1], 1.5 * ctx.mmToPt);
near(points[2].anchor[0] - 0.15 - bounds[2], 3 * ctx.mmToPt);
near(bounds[3] - (points[2].anchor[1] + 0.15), 1.5 * ctx.mmToPt);
for (const radius of [0, 1, 50]) {
  const p = ctx.getBoxPoints(bounds, { ...defaults, radius });
  assert.equal(p.length, radius ? 8 : 4);
  for (const point of p) for (const key of ['anchor', 'left', 'right']) {
    assert(point[key].every(Number.isFinite));
  }
}
ctx.options = { ...defaults, radius: 12, strokeWidth: 4.2, offsetX: -6, offsetY: 8, preview: false };
ctx.saveSettings();
assert.deepEqual(JSON.parse(JSON.stringify(ctx.readSettings())), ctx.options);
for (const bad of ['v2|3|1.5|0|0|0|1', 'v1|3|1.5|0|0|0', 'v1||1.5|0|0|0|1',
  'v1|51|1.5|0|0|0|1', 'v1|3|1.5|-1|0|0|1', 'v1|3|1.5|0|101|0|1', 'v1|3|1.5|0|0|0|yes']) {
  saved = bad;
  assert.deepEqual(ctx.readSettings(), defaults);
}
for (const width of [0.1, 0.3, 3, 10]) {
  const p = ctx.getBoxPoints(bounds, { ...defaults, strokeWidth: width });
  near(bounds[0] - (p[0].anchor[0] + width / 2), 3 * ctx.mmToPt);
  near(p[0].anchor[1] - width / 2 - bounds[1], 1.5 * ctx.mmToPt);
  near(p[2].anchor[0] - width / 2 - bounds[2], 3 * ctx.mmToPt);
  near(bounds[3] - (p[2].anchor[1] + width / 2), 1.5 * ctx.mmToPt);
}
for (const width of ['0', '-1', '11', '', 'NaN']) {
  saved = 'v2|3|1.5|0|0|0|1|' + width;
  assert.deepEqual(ctx.readSettings(), defaults);
}
const text = { contents: 'Test', duplicate: () => ({ createOutline: () => ({
  visibleBounds: bounds, remove: () => removed++
}) }) };
assert.deepEqual(ctx.getActualTextBounds(text), bounds);
assert.equal(removed, 1);
assert.equal(ctx.getActualTextBounds({ contents: '  ' }), null);
assert.equal(ctx.getActualTextBounds({ contents: 'Test', visibleBounds: [0, 99, 999, 0],
  duplicate: () => ({ createOutline: () => { throw Error('outline failed'); }, remove: () => removed++ }) }), null);
assert.equal(removed, 2);
// Round -> square must remove surplus anchors; movement must not change geometry.
const pathPoints = [];
pathPoints.add = () => {
  const p = { remove: () => pathPoints.splice(pathPoints.indexOf(p), 1) };
  pathPoints.push(p); return p;
};
const record = { path: { pathPoints }, entry: { bounds } };
ctx.options = { ...defaults, radius: 2 };
ctx.writeBoxPath(record, 0, 0);
assert.equal(pathPoints.length, 8);
ctx.options.radius = 0;
ctx.writeBoxPath(record, 5, -8);
assert.equal(pathPoints.length, 4);
near(pathPoints[0].anchor[0], points[0].anchor[0] + 5);
near(pathPoints[0].anchor[1], points[0].anchor[1] - 8);
ctx.options.strokeWidth = 8;
ctx.writeBoxPath(record, 0, 0);
assert.equal(record.path.strokeWidth, 8);
near(bounds[0] - (pathPoints[0].anchor[0] + 4), 3 * ctx.mmToPt);
// Cancel / preview off restore the original and selection; failed confirm rolls back movement.
let groupRemoved = 0;
const original = { hidden: true, selected: false, translate: (x, y) => {
  near(x, -2 * ctx.mmToPt); near(y, 4 * ctx.mmToPt);
}, move: () => {} };
ctx.ElementPlacement = { PLACEBEFORE: 1 };
ctx.targets = [original];
ctx.doc = { selection: [] };
ctx.options = { ...defaults, offsetX: 2, offsetY: -4 };
ctx.previews = [{ entry: { item: original, hidden: false }, moved: true, shifted: true,
  group: { remove: () => { assert.equal(original.hidden, false); groupRemoved++; } } }];
ctx.clearPreview();
assert.equal(groupRemoved, 1);
assert.equal(original.selected, true);
assert.equal(ctx.previews.length, 0);
assert.equal(ctx.previewPending, false);
ctx.clearPreview();
assert.equal(groupRemoved, 1);
console.log('PASS 텍스트 박스: ES3, syntax, visible spacing, radius, settings, outline cleanup, preview geometry');
