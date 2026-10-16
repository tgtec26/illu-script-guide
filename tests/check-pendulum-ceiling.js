const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const source=fs.readFileSync('스크립트/01_물리학/역학.jsx','utf8');
function extract(name){const a=source.indexOf('function '+name+'(');let i=source.indexOf('{',a),depth=1;for(i++;depth&&i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;}return source.slice(a,i);}
let saved='';
const ctx={PREF_KEY:'test',POSITION_LIMIT_MM:100,lengthMm:30,angleDeg:25,ballMm:6,showTheta:true,showLength:true,showTrail:true,showRightAngle:true,ball3D:true,bulgePercent:11,thetaRadiusPercent:30,offsetXmm:0,offsetYmm:0,lengthLabel:'l',showCeiling:false,ceilingWidthPt:2.1,app:{preferences:{setStringPreference:(k,v)=>{saved=v;},getStringPreference:()=>saved}}};
vm.createContext(ctx);vm.runInContext(extract('saveSettings')+'\n'+extract('applySavedSettings'),ctx);
ctx.saveSettings();assert.equal(saved.split('|').length,16);assert.equal(saved.split('|')[0],'v6');ctx.showCeiling=true;ctx.ceilingWidthPt=.6;ctx.applySavedSettings();assert.equal(ctx.showCeiling,false);assert.equal(ctx.ceilingWidthPt,2.1);
saved='v5|30|25|6|1|1|1|1|1|11|30|0|0|l';ctx.showCeiling=true;ctx.ceilingWidthPt=.6;ctx.applySavedSettings();assert.equal(ctx.showCeiling,true);assert.equal(ctx.ceilingWidthPt,.6);
console.log('PASS pendulum ceiling preferences v6 roundtrip and v5 migration');
