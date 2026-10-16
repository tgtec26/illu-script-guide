const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.resolve(__dirname,'..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(base,'스크립트/00_세팅/educational_presets.jsxinc'),'utf8'),context);
require('./es3-lint')(fs.readFileSync(path.join(base,'스크립트/00_세팅/educational_presets.jsxinc'),'utf8'),'educational_presets');
vm.runInContext(fs.readFileSync(path.join(base,'스크립트/00_세팅/option_contract.jsxinc'),'utf8'),context);
const contracts=JSON.parse(fs.readFileSync(path.join(base,'contracts/tool-contracts.json'),'utf8'));
const api=context.EducationalPresets;
const text=fs.readFileSync(path.join(base,'config/educational-presets.json'),'utf8');
const data=api.parse(text);
assert.equal(data.presets.length,4);
for(const p of data.presets) {
  for(const variant of ['problem','explanation']) {
    const result=api.create(data,p.id,variant,p.seedRange?42:undefined);
    assert.equal(result.tool,p.tool);
    const validated=context.normalizeOptions(contracts.tools[p.tool],result.params);
    assert.equal(validated.notes.length,0);
    assert.deepEqual(JSON.parse(JSON.stringify(result.params)),{...p.params,...p[variant],...(p.seedRange?{seed:42}:{})});
  }
  assert.throws(()=>api.create(data,p.id,'solution'));
}
for(const bad of ['{"__proto__":{}}','{"a":1,"a":2}','[1,]','{"x":true} trailing','{"x":1e999}','{"x":"\\q"}','(function(){})()']) assert.throws(()=>api.parse(bad));
let calls=0;
api.create(data,'gas-motion','problem',1,(tool,params)=>{calls++;assert.equal(tool,'particle-state');return params;});
assert.equal(calls,1);
assert.throws(()=>api.create(data,'gas-motion','problem',100));
console.log('PASS educational preset JSON, ES3 parser, pair options and validator hook');
