// Validate the same contour reader used by Illustrator, including its closing Bézier handles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.join(__dirname, '../스크립트/04_지구과학');
const source = fs.readFileSync(path.join(dir, '해안선 지구본.jsx'), 'utf8');
new vm.Script(source);
const paint = () => {};
const makeLand = new Function('paint', source.slice(source.indexOf('    function makeLand('), source.indexOf('    function createGlobe(')) + '\nreturn makeLand;')(paint);
function group() {
  const items = [];
  const pathItems = { add() {
    const item = { setEntirePath(a) { this.pathPoints=a.map(anchor=>({anchor})); } };
    items.push(item); return item;
  } };
  return { items, pathItems, compoundPathItems: {add: () => ({pathItems})} };
}
const check = group();
makeLand(check, 'M1 2 L3 4 C4 5 6 7 1 2 Z M8 9 L10 9 L9 10 Z', 10, 20);
assert.equal(check.items.length, 2);
assert.deepEqual(check.items[0].pathPoints, [{anchor:[11,18],leftDirection:[16,13]}, {anchor:[13,16],rightDirection:[14,15]}]);
for (const size of [100,50,20]) for (const key of ['korea','pacific','western-pacific','americas','atlantic','africa-europe']) {
  const svg = fs.readFileSync(path.join(dir,'coast-globe',size+'-'+key+'.svg'),'utf8');
  let count=0;
  for (const [,d] of svg.matchAll(/<path d="([^"]+)"\/>/g)) {
    const land=group();makeLand(land,d,0,0);
    for(const p of land.items) { assert.ok(p.closed && p.evenodd);assert.ok(p.pathPoints.length >= 2 || (p.pathPoints.length === 1 && p.pathPoints[0].leftDirection && p.pathPoints[0].rightDirection));for(const pt of p.pathPoints) assert.ok(pt.anchor.every(Number.isFinite)); }
    count++;
  }
  assert.ok(count>5);
}
console.log('18 globe variants and compound path handles passed.');
