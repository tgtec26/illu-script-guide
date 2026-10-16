const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
function extract(s, name) {
 const start=s.indexOf('function '+name+'('); let depth=0;
 for(let i=s.indexOf('{', start);i<s.length;i++){if(s[i]==='{')depth++;if(s[i]==='}'&&--depth===0)return s.slice(start,i+1);}
 throw Error(name);
}
function control(type, text) {
 const node={type,text,children:[],preferredSize:{},maximumSize:{},add(kind,bounds,value){const child=control(kind,value);this.children.push(child);child.value=value;return child;}};
 let selected=null;
 Object.defineProperty(node,'selection',{get(){return selected;},set(v){selected=typeof v==='number'?{index:v}:v;}});
 return node;
}
const contracts=JSON.parse(fs.readFileSync(path.join(root,'contracts/tool-contracts.json')));
const data=JSON.parse(fs.readFileSync(path.join(root,'config/educational-presets.json')));
for(const [name,id,maker] of [['피스톤 실린더','piston-cylinder','makePistonEngine'],['열기관 순환','heat-engine-cycle','makeCycleEngine']]) {
 const s=fs.readFileSync(path.join(root,'스크립트/01_물리학',name+'.jsx'),'utf8'), draws=[], saved={};
 const context={optionSchema:contracts.tools[id],presetData:data,HEAD_SHAPES:['a','b','c','d'],HEAD_EXAM:3,PROCESS_NAMES:['등압','등적','등온','단열'],FORM_MM:1,
  drawPiston(t,o){if(context.failDraw)throw Error("draw failed");draws.push({...o});},drawCycle(t,o){if(context.failDraw)throw Error("draw failed");draws.push({...o});},makeFormTools(){return {};},formFormat:(v,d)=>Number(v).toFixed(d),
  alert(m){context.lastAlert=m;},app:{redraw(){},preferences:{getStringPreference(){return '';},setStringPreference(k,v){saved[k]=v;}}},
  doc:{activeView:{centerPoint:[0,0]},activeLayer:{locked:false,visible:true,groupItems:{add(){return {geometricBounds:[0,10,10,0],translate(){},remove(){}};}}}}};
 vm.createContext(context);
 for(const helper of ['option_contract','educational_presets'])vm.runInContext(fs.readFileSync(path.join(root,'스크립트/00_세팅',helper+'.jsxinc'),'utf8'),context);
 vm.runInContext(extract(s,'makeFormEngine')+'\n'+extract(s,maker),context);
 const engine=context[maker](), page=control('dialog','test');engine.addRows(page);engine.setPreview(true);
 const panel=page.children.find(n=>n.text==='교육용 프리셋');assert.ok(panel,'real host preset panel');
 const list=panel.children[0], variant=panel.children[1], apply=panel.children.find(n=>n.text==='폼에 적용');
 assert.equal(draws.length,1,'choice alone never applies');
 apply.onClick();
 const problem=draws.at(-1); assert.equal(problem[id==='piston-cylinder'?'showDots':'showProcess'],false);
 variant.selection=1; apply.onClick();const explanation=draws.at(-1);
 assert.equal(explanation[id==='piston-cylinder'?'showDots':'showProcess'],true);
 assert.equal(Object.keys(saved).length,0,'preset apply does not save preferences');
 // Controls display the applied state and changing the number afterwards keeps the applied model.
 function flat(n){return [n,...n.children.flatMap(flat)];}
 const checks=flat(page).filter(n=>n.type==='checkbox');
 assert.equal(checks.find(n=>n.text===(id==='piston-cylinder'?'분자 점':'과정 이름(등온 등)')).value,true);
 const all=flat(page), geometryLabel=id==='piston-cylinder'?'실린더 길이 (mm):':'가로 길이 (mm):';
 const row=all.find(n=>n.children.some(c=>c.type==='statictext'&&c.text===geometryLabel));
 const field=row.children.find(n=>n.type==='edittext');
 context.failDraw=true;field.text=String(Number(field.text)+1);field.onChange();
 assert.equal(engine.commit(),false,'cannot commit earlier successful preview with failed current options');
 assert.equal(Object.keys(saved).length,0,'failed confirm does not persist options');
 assert.ok(context.lastAlert);
 context.failDraw=false;
 assert.equal(engine.commit(),true);assert.equal(Object.keys(saved).length,1);
 engine.clearPreview();
}
console.log('real form preset problem/explanation application, UI sync and confirm-only persistence OK');
