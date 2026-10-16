const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('스크립트/01_물리학/전기.jsx', 'utf8');
require('./es3-lint')(source, '전기.jsx');
new vm.Script(source.replace(/^#.*$/mg, ''));
const engine = source.slice(source.indexOf('function makeSolenoidEngine()'), source.indexOf('// ==== 에너지 흐름'));
const functions = engine.slice(engine.indexOf('function saveSettings()'), engine.lastIndexOf('return null;'));
function load(raw) {
  const context = { coilWeight: 2, turnCount: 8, coilGapMm: 1, viewAngleDeg: 20,
    offsetXmm: 0, offsetYmm: 0, solidRod: false, rodK: 20, POSITION_LIMIT_MM: 100,
    PREF_KEY: 'ObjectSolenoid/settings', clampValue: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    app: { preferences: { getStringPreference: () => raw, setStringPreference: (_, value) => { context.saved = value; } } } };
  vm.createContext(context);
  vm.runInContext(functions + '\napplySavedSettings(); saveSettings();', context);
  return context;
}
let result = load('v4|2|8|1|20|3|4|1|70');
assert.equal(result.solidRod, true);
assert.equal(result.rodK, 70);
assert.equal(result.saved, 'v4|2|8|1|20|3|4|1|70');
result = load('v3|2|8|1|20|3|4');
assert.equal(result.solidRod, false);
assert.equal(result.rodK, 20);
assert.equal(result.offsetXmm, 3);
assert.equal(load('v4|2|8|1|20|0|0|1|101').rodK, 20);
console.log('Solenoid fill preferences, migration, ES3 and syntax: PASS');
