const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('스크립트/01_도형/결정 구조.jsx', 'utf8');
assert.ok(source.includes('function packedDiameterRatio('), 'packed spheres need independent size controls');
const geometry = source.slice(source.indexOf('        function latticePoints('), source.indexOf('        function cellEdgeSegments('));
const draw = source.slice(source.indexOf('        function drawCell('), source.indexOf('        function drawCells('));
const helpers = new Function(`
  var CELL_CORNERS = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  var FACE_CENTERS = [[.5,.5,0],[.5,.5,1],[.5,0,.5],[.5,1,.5],[0,.5,.5],[1,.5,.5]];
  ${geometry}
  var drawn = [];
  function viewDepth(p) { return p[0] + p[1] + p[2]; }
  function screenPoint(p, edge, x, y) { return [x + edge * p[0], y + edge * p[1]]; }
  function drawSphere(parent, x, y, dia, o, grads, packed, corner) { drawn.push({x,y,dia,corner}); }
  function drawWireCell() {}
  function drawCutCell() {}
  ${draw}
  return {packedDiameterRatio, touchRatio, otherTouchRatio,
    render(key, o) { drawn=[]; drawCell({groupItems:{add(){return {};}}}, key, 'pack', o, 0, 0, 20, {}); return drawn; }};
`)();
for (const key of ['sc','bcc','fcc','nacl','cscl','i2','co2']) {
  assert.strictEqual(helpers.packedDiameterRatio(key, {}, true), helpers.touchRatio(key));
  assert.strictEqual(helpers.packedDiameterRatio(key, {}, false), helpers.otherTouchRatio(key));
}
for (const cellSpan of [1,2]) {
  const base = helpers.render('nacl', {cellSpan});
  const sized = helpers.render('nacl', {cellSpan, cornerPackPercent:60, otherPackPercent:140});
  assert.deepStrictEqual(sized.map(p=>[p.x,p.y,p.corner]), base.map(p=>[p.x,p.y,p.corner]), 'sizes must not move ion sites');
  assert.strictEqual(sized.length, cellSpan === 1 ? 8 : 27);
  for (const p of sized) assert.ok(Math.abs(p.dia - (p.corner ? 12 : 28)) < 1e-8);
}
for (const bad of [NaN, Infinity, -1, 0, 151, 'oops']) {
  assert.strictEqual(helpers.packedDiameterRatio('nacl', {cornerPackPercent:bad}, true), 1, 'invalid options fall back to contact diameter');
}
console.log('crystal sizes: default geometry, independent ion diameters, unchanged sites and invalid values passed');

// Actual engine closures and numeric row handlers; no flattened private state.
const rows = source.slice(source.indexOf('    function addSliderRow('), source.indexOf('    // ==== 입방정계 엔진'));
const restore = source.slice(source.indexOf('    function restoreSlider('), source.indexOf('    function restoreInteger('));
const engineCode = source.slice(source.indexOf('    function makeCubicEngine('), source.indexOf('    // ==== 다이아몬드 엔진'));
function controls() {
  let previews=0;
  function node(type, text='', value) {
    return {type,text,value,enabled:true,preferredSize:{},children:[],add(t,b,c,min,max) {
      const child=node(t,typeof c==='string'?c:'',t==='scrollbar'?c:undefined);
      child.minvalue=min; child.maxvalue=max; this.children.push(child); return child;
    }};
  }
  const root=node('tab');
  const e = new Function('page','updatePreview', `var sliderSyncers=[]; ${rows} ${restore} ${engineCode}
    var e=makeCubicEngine('rotation'); e.addRows(page); return e;`)(root,()=>previews++);
  function find(label) {
    const search=n=> n.type==='scrollbar' && n.caption.text.startsWith(label) ? n : n.children.map(search).find(Boolean);
    return search(root);
  }
  return {e,find,previews:()=>previews};
}
const fields=['0001000','010','2','1',20,3,3,100,100,8,60,140];
{
  const c=controls(); c.e.restoreFields(fields); c.e.syncEnabled();
  assert.deepStrictEqual(c.e.saveFields().slice(10),[60,140]);
  const na=c.find('Na⁺'), cl=c.find('Cl⁻');
  assert.ok(na.enabled && cl.enabled, 'packed diameter controls must be active');
  na.value=70; na.onChanging();
  assert.strictEqual(c.previews(),1,'drag must redraw immediately');
  assert.strictEqual(cl.value,140,'changing Na must not change Cl');
  c.e.restoreFields(fields.slice(0,10).concat([0,999]));
  assert.deepStrictEqual(c.e.saveFields().slice(10),[70,140],'invalid restored sizes ignored');
}
{
  const c=controls(); c.e.restoreFields(fields.slice(0,10));
  assert.deepStrictEqual(c.e.saveFields().slice(10),[100,100],'legacy values retain default contact sizes');
  const iodine=fields.slice(); iodine[0]='0000010'; c.e.restoreFields(iodine);
  assert.deepStrictEqual(c.e.saveFields().slice(10),[60,60],'I2 atoms must keep equal diameter');
}
console.log('crystal size UI: saved values, legacy defaults, input ranges, ion labels, live preview and iodine symmetry passed');
