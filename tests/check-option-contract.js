const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.join(__dirname, '..');
const contracts = JSON.parse(fs.readFileSync(path.join(root, 'contracts/tool-contracts.json'), 'utf8'));
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, '스크립트/00_세팅/option_contract.jsxinc'), 'utf8'), context);
for (const id of Object.keys(contracts.tools)) {
  const schema = contracts.tools[id];
  const defaults = Object.fromEntries(Object.entries(schema.properties).map(([key, field]) => [key, field.default]));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(context.normalizeOptions(schema, defaults))), { params: defaults, notes: [] });
}
const schema = contracts.tools['heat-engine-cycle'];
const result = context.normalizeHeatCycleOptions(schema, { width: -1, height: 40, font: 9, axes: 7, p1: 2, r1: 2, p2: 3, r2: 1.5, p3: 2, p4: 3 });
assert.strictEqual(result.params.width, 55);
assert.strictEqual(result.params.height, 40);
assert.strictEqual(result.params.font, 9);
assert.strictEqual(result.params.axes, 0);
assert.strictEqual(result.notes.length, 2);
const piston = context.normalizeOptions(contracts.tools['piston-cylinder'], { chambers: 3, pos1: 95, pos2: 5, dots: -10 });
assert.strictEqual(piston.params.dots, 6);
assert.ok(piston.params.pos2 - piston.params.pos1 >= 8);
assert.ok(piston.notes.length >= 2);
console.log('option contract: defaults, bounds, enums, scientific constraints and heat aliases pass');
