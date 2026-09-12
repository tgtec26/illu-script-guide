const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_isometric.jsx"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced helper: ${name}`);
}

// 미리보기 도중 면 생성이 실패하면 반쯤 만든 그룹이 문서에 남지 않아야 한다
function makeDoc(failAfterFaces) {
  let faces = 0;
  const doc = {
    documentColorSpace: "RGB",
    views: [{ centerPoint: [0, 0] }],
    groups: [],
    groupItems: {
      add() {
        const group = { removed: false, name: "", remove() { this.removed = true; } };
        doc.groups.push(group);
        return group;
      },
    },
    pathItems: {
      add() {
        if (faces >= failAfterFaces) throw new Error("PARM");
        faces++;
        return { setEntirePath() {}, move() {}, remove() {} };
      },
    },
  };
  return doc;
}

const globals = {
  DocumentColorSpace: { CMYK: "CMYK" },
  RGBColor: function () {},
  CMYKColor: function () {},
  StrokeJoin: { ROUNDENDJOIN: 1 },
  ElementPlacement: { PLACEATEND: 1 },
  $: { sleep() {} },
  app: { redraw() {} },
};
const createIsometricBox = new Function(
  ...Object.keys(globals),
  'var PREVIEW_GROUP_NAME = "Isometric_Preview";\n' +
  [extractFunction("createIsometricBox"), extractFunction("makeFace"), extractFunction("makeColor")].join("\n") +
  "; return createIsometricBox;"
)(...Object.values(globals));

const okDoc = makeDoc(Infinity);
const group = createIsometricBox(okDoc, 5, 5, 5, 120, 120, 0, 0, 0, 0, 100, 0, 1, 0, 100, false);
assert.strictEqual(okDoc.groups.length, 1, "one group per box");
assert.strictEqual(group.removed, false, "successful box keeps its group");
assert.strictEqual(group.name, "Isometric_Preview", "preview group carries a fixed name so leftovers can be swept");

const badDoc = makeDoc(1);
assert.throws(() => createIsometricBox(badDoc, 5, 5, 5, 120, 120, 0, 0, 0, 0, 100, 0, 1, 0, 100, false), /PARM/);
assert.strictEqual(badDoc.groups.length, 1);
assert.strictEqual(badDoc.groups[0].removed, true, "failed box must remove its half-built group");

// clearPreview는 참조가 죽었어도 이름으로 남은 미리보기 그룹을 지운다
const clearSource = extractFunction("clearPreview");
assert.ok(/name === PREVIEW_GROUP_NAME/.test(clearSource), "clearPreview sweeps leftover preview groups by name");

console.log("check-isometric: ok");
