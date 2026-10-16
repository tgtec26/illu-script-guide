const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../스크립트/01_물리학/전기 회로도.jsx'),'utf8');
const core=source.split('// BEGIN CIRCUIT CORE (tools/sync-circuit-native.py)')[1].split('// END CIRCUIT CORE')[0];
const ctx={};vm.createContext(ctx);vm.runInContext(core,ctx);
assert.equal(ctx.generateCircuit({loopW:40,loopH:30,scale:100}).error,'');
assert.equal(ctx.circuitElements({}).length,4);
function control(type,text,parent,props={}){
 const c={type,text:text===undefined?'':text,parent,properties:props,children:[],value:0,enabled:true,visible:true,preferredSize:{},selection:{index:0},
 add(kind,bounds,label,pr){return control(kind,label,this,pr);},removeAll(){this.children=[];},show(){return 0;},close(){},addEventListener(){}};
 if(parent)parent.children.push(c);return c;
}
function settingsRun(raw,save){
 const prefs=new Map(raw?[["CircuitDiagram/settings",raw]]:[]);
 const c={app:{documents:[{}],activeDocument:{},preferences:{getStringPreference:k=>prefs.get(k)||'',setStringPreference:(k,v)=>prefs.set(k,v)}},Window:function(type,title){return control(type,title);},File:function(){throw Error('no files');},Folder:{temp:''},$:{evalFile(){throw Error('no helper');}},alert:()=>{throw Error('unexpected alert');}};
 const hook='globalThis.result={o:o,count:count,dx:dx,dy:dy,elements:elements};'+(save?'save();':'');
 const script=source.slice(source.indexOf('(function() {')).replace('if(win.show()!==1){clearPreview();try{app.redraw();}catch(e){}}',hook);
 vm.createContext(c);vm.runInContext(script,c);return {result:c.result,stored:prefs.get('CircuitDiagram/settings')};
}
const saved=settingsRun('',true).stored;
assert.equal(saved.split('|').length,89);
const parts=saved.split('|');parts[1]='70';parts[13]='5';parts[14]='12';parts[15]='-3';parts[17+4]=encodeURIComponent('㉠|이름');parts[17+5]=encodeURIComponent('10Ω');
const loaded=settingsRun(parts.join('|'),false);assert.equal(loaded.result.o.loopW,70);assert.equal(loaded.result.count,5);assert.equal(loaded.result.dx,12);assert.equal(loaded.result.elements[0].name,'㉠|이름');assert.equal(loaded.result.elements[0].value,'10Ω');assert.equal(loaded.stored,parts.join('|'));
parts[1]='99999';parts[17]='unknown';assert.equal(settingsRun(parts.join('|'),false).result.o.loopW,40);assert.equal(settingsRun(parts.join('|'),false).result.elements[0].key,'resistor');
assert.equal(settingsRun('v0|bad',false).result.count,4);
const legacy=saved.split('|');legacy[0]='v1';legacy.splice(16,1);
assert.equal(settingsRun(legacy.join('|'),false).result.o.meterSpan,0);
const custom=saved.split('|');custom[16]='22.5';assert.equal(settingsRun(custom.join('|'),false).result.o.meterSpan,22.5);
console.log('PASS native circuit ES3, prefs roundtrip/ranges, cancel preserves options');
(async()=>{
 const web=await import('../../sci-illu-web/src/generators/circuit-layout.js');
 const cases=[{loopW:60,loopH:40,scale:100},{loopW:60,loopH:40,parallel:true,branchStart:120,branchEnd:240,elements:[{key:'battery',angle:0},{key:'resistor',angle:180,upper:true},{key:'resistor',angle:180,upper:false}]},{loopW:60,loopH:40,meterOn:true,meterTarget:1}];
 for(const c of cases)assert.equal(JSON.stringify(ctx.generateCircuit(c)),JSON.stringify(web.generateCircuit(c)));
 console.log('PASS native/web geometry parity: serial, parallel, voltmeter');
})().catch(e=>{console.error(e);process.exitCode=1;});
