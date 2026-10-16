const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");
function extract(source, name) {
  const start = source.indexOf("function " + name + "(");
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(name);
}
for (const name of ["피스톤 실린더", "열기관 순환"]) {
  const source = fs.readFileSync(path.join(__dirname, "../스크립트/01_물리학", name + ".jsx"), "utf8");
  require("./es3-lint")(source, name);
  const previous = { remove() { this.removed = true; } };
  let fail = false, candidate, alerts = 0, builds = 0;
  const context = { group: previous, lastOptions: { value: 1 }, stylePaths: [], o: { value: 2, offsetX: 0, offsetY: 0 }, controls: [{key:"value"},{key:"offsetX"},{key:"offsetY"}], center: [10, 20], FORM_MM: 1,
    spec: { name, draw(t, options) { builds++; assert.equal(options.value, context.o.value); if (fail) throw new Error("draw"); } },
    doc: { activeLayer: { locked: false, visible: true, groupItems: { add() { candidate = { geometricBounds:[0, 2, 2, 0], translate() {}, remove() { this.removed = true; } }; return candidate; } } } },
    makeFormTools(g, o, paths) { return {}; }, alert() { alerts++; } };
  vm.createContext(context);
  vm.runInContext(["copyOptions", "sameOptions", "build"].map(n => extract(source,n)).join("\n"), context);
  fail = true;
  assert.equal(context.build(), false);
  assert.strictEqual(context.group, previous, "failed candidate preserves previous");
  assert.ok(candidate.removed, "failed candidate removed");
  assert.ok(!previous.removed);
  assert.equal(context.lastOptions.value, 1);
  fail = false;
  assert.equal(context.build(), true);
  assert.ok(previous.removed);
  assert.strictEqual(context.group, candidate);
  assert.equal(context.lastOptions.value, 2);
  assert.notStrictEqual(context.lastOptions, context.o);
  context.o.value = 3;
  assert.equal(context.lastOptions.value, 2, "snapshot stays stable");
  // Only registered style roles change; geometry options force a rebuild.
  const key = "wRope", item = {strokeWidth: 0.4};
  context.controls.push({key}, {key:"width"});
  context.o = {value: 3, offsetX: 0, offsetY: 0, wRope: 0.8, width: 20};
  context.lastOptions = {...context.o, wRope: 0.4};
  context.stylePaths = [{key, item}];
  vm.runInContext(extract(source, "updateStyle"), context);
  assert.equal(context.updateStyle(), true);
  assert.equal(item.strokeWidth, 0.8);
  context.o.width = 21;
  assert.equal(context.updateStyle(), false);
  // A rejected style write restores earlier successful writes.
  let stored = 0.8;
  const rejects = {get strokeWidth() {return stored;}, set strokeWidth(v) {if(v === 1.1) throw Error("locked"); stored=v;}};
  context.lastOptions = {...context.o};
  context.o.wRope = 1.1;
  context.stylePaths.push({key, item: rejects});
  assert.equal(context.updateStyle(), false);
  assert.equal(item.strokeWidth, 0.8);
  // A redraw callback that requests another redraw forever must still return.
  context.drawing = false; context.drawAgain = false; context.previewOn = true;
  let redraws = 0;
  context.app = { redraw() { redraws++; context.redraw(); } };
  context.removeGroup = () => { context.group = null; };
  context.updateStyle = () => false;
  vm.runInContext(extract(source, "redraw"), context);
  context.redraw();
  assert.ok(redraws <= 2, "bounded reentrancy");
  // A second event-pump update must not be discarded when the pass cap is hit.
  redraws = 0;
  context.o.value = 10;
  context.app.redraw = function() {
    redraws++;
    context.o.value = 10 + redraws;
    context.redraw();
  };
  context.redraw();
  assert.equal(redraws, 2, "never pump a third batch of UI events");
  assert.equal(context.lastOptions.value, 12, "final preview reflects pass-two input");
  // The last non-pumping pass uses the same explicit style roles.
  vm.runInContext(extract(source, "updateStyle"), context);
  context.o.wRope = 0.8;
  context.lastOptions = {...context.o};
  context.stylePaths = [{key, item}]; item.strokeWidth = 0.8;
  const buildsBeforeStyle = builds;
  redraws = 0;
  context.app.redraw = function() {
    redraws++;
    context.o.wRope = 0.8 + redraws / 10;
    context.redraw();
  };
  context.redraw();
  assert.equal(redraws, 2);
  assert.equal(item.strokeWidth, 1);
  assert.equal(context.lastOptions.wRope, 1);
  assert.equal(builds, buildsBeforeStyle, "final style update does not rebuild geometry");
  for (const fn of ["build", "makeFormTools", name === "피스톤 실린더" ? "drawPiston" : "drawCycle"])
    assert.ok(!/app\.redraw\s*\(/.test(extract(source, fn)), fn + " must not pump redraw events");
  assert.equal(context.drawing, false);
  assert.equal(alerts, 1);
}
console.log("safe preview: candidate swap, cleanup, snapshots, bounded redraw OK");
