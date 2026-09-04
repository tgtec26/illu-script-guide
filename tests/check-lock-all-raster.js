const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "10_기타", "Image_LockAllRaster.jsx");

assert.ok(fs.existsSync(scriptPath), "Image_LockAllRaster.jsx must exist");

const source = fs.readFileSync(scriptPath, "utf8").replace(/^#target[^\r\n]*(?:\r?\n)?/, "");

function makeLayer(locked) {
  return makeContainer("Layer", {typename: "Document"}, locked);
}

function makeContainer(typename, parent, initiallyLocked) {
  let locked = !!initiallyLocked;
  const container = {
    typename: typename,
    parent: parent,
    visible: true,
    unlockWrites: 0,
    get locked() { return locked; },
    set locked(value) {
      if (parent && parent.locked) throw new Error("parent is locked");
      if (locked && value === false) container.unlockWrites++;
      locked = value;
    },
  };
  return container;
}

function makeItem(typename, parent, fileName, locked) {
  let ownLocked = !!locked;
  const item = {
    typename: typename,
    parent: parent,
    get locked() { return ownLocked; },
    set locked(value) {
      if (parent && parent.locked) throw new Error("parent is locked");
      ownLocked = value;
    },
  };

  if (fileName !== undefined) {
    item.file = {name: fileName};
  }

  return item;
}

function run(items) {
  const alerts = [];
  const documentRef = {
    typename: "Document",
    rasterItems: items.filter((item) => item.typename === "RasterItem"),
    placedItems: items.filter((item) => item.typename === "PlacedItem"),
    get pageItems() { throw new Error("full pageItems scan is too expensive"); },
  };
  const context = {
    alert(message) { alerts.push(String(message)); },
    app: {
      documents: [documentRef],
      activeDocument: documentRef,
      executeMenuCommand() {},
    },
    Folder: {temp: "C:/Temp"},
    File: function () {
      return {open() {}, write() {}, close() {}};
    },
    $: {fileName: scriptPath},
  };

  vm.runInNewContext(source, context, {filename: scriptPath});
  return alerts;
}

const normalLayer = makeLayer(false);
const lockedLayer = makeLayer(true);
const embedded = makeItem("RasterItem", normalLayer);
const linkedPng = makeItem("PlacedItem", normalLayer, "photo.PNG");
const linkedPdf = makeItem("PlacedItem", normalLayer, "drawing.pdf");
const alreadyLocked = makeItem("RasterItem", normalLayer, undefined, true);
const belowLockedLayer = makeItem("RasterItem", lockedLayer);
const nestedLockedLayer = makeLayer(true);
const nestedLockedGroup = makeContainer("GroupItem", nestedLockedLayer, true);
const belowNestedLocks = makeItem("RasterItem", nestedLockedGroup);
const secondBelowNestedLocks = makeItem("RasterItem", nestedLockedGroup);

const alerts = run([
  embedded, linkedPng, linkedPdf, alreadyLocked, belowLockedLayer,
  belowNestedLocks, secondBelowNestedLocks,
]);

assert.strictEqual(embedded.locked, true, "embedded raster image must be locked");
assert.strictEqual(linkedPng.locked, true, "linked raster image must be locked case-insensitively");
assert.strictEqual(linkedPdf.locked, false, "linked vector or PDF artwork must not be locked");
assert.strictEqual(alreadyLocked.locked, true, "an already locked raster image must stay locked");
assert.strictEqual(belowLockedLayer.locked, true, "raster image below a locked layer must receive its own lock");
assert.strictEqual(lockedLayer.locked, true, "temporarily unlocked ancestors must be restored");
assert.strictEqual(belowNestedLocks.locked, true, "nested locked ancestors must be opened outside-in before locking");
assert.strictEqual(secondBelowNestedLocks.locked, true, "all images below shared locked ancestors must be locked");
assert.strictEqual(nestedLockedGroup.locked, true, "nested group lock must be restored");
assert.strictEqual(nestedLockedLayer.locked, true, "nested layer lock must be restored");
assert.strictEqual(nestedLockedGroup.unlockWrites, 1, "a shared group must be unlocked only once");
assert.strictEqual(nestedLockedLayer.unlockWrites, 1, "a shared layer must be unlocked only once");
assert.strictEqual(alerts.length, 1, "the script must show one completion summary");
assert.ok(alerts[0].includes("새로 잠금: 5개"), "summary must report newly locked images");
assert.ok(alerts[0].includes("이미 잠김: 1개"), "summary must report already locked images");

console.log("Image_LockAllRaster behavior: ok");
