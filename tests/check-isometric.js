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
    faces: [],
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
        const face = { pathPoints: [], move() {}, remove() {},
          setEntirePath(points) { face.pathPoints = points.map((anchor) => ({ anchor, leftDirection: anchor, rightDirection: anchor })); } };
        doc.faces.push(face);
        return face;
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
  [extractFunction("createIsometricBox"), extractFunction("makeFace"), extractFunction("makeColor"),
    extractFunction("arcPoints"), extractFunction("anchorsOf"), extractFunction("applyHandles")].join("\n") +
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

// 원(타원 기둥): 층마다 옆면 띠 하나 + 윗면 타원. 곡선 면은 핸들이 앵커와 다르다
const roundDoc = makeDoc(Infinity);
createIsometricBox(roundDoc, 10, 6, 4, 120, 120, 0, 0, 0, 0, 100, 0, 3, 0, 100, false, true);
assert.strictEqual(roundDoc.faces.length, 4, "3 layers + top");
const topFace = roundDoc.faces[3];
assert.strictEqual(topFace.pathPoints.length, 4, "top ellipse is four bezier arcs");
assert.ok(topFace.pathPoints.every((p) => p.leftDirection !== p.anchor && p.rightDirection !== p.anchor), "top ellipse points all curved");
const band = roundDoc.faces[0];
assert.strictEqual(band.pathPoints.length, 6, "side band = half arc (3 pts) down + half arc (3 pts) up");
assert.strictEqual(band.pathPoints[0].leftDirection, band.pathPoints[0].anchor, "arc ends join with straight edges");
assert.strictEqual(band.pathPoints[2].rightDirection, band.pathPoints[2].anchor);
// 위 호는 아래 호를 층 높이만큼 올린 것
const layerH = 4 * 2.834645 / 3;
for (let i = 0; i < 3; i++) {
  const lo = band.pathPoints[i].anchor, hi = band.pathPoints[5 - i].anchor;
  assert.ok(Math.abs(hi[0] - lo[0]) < 1e-9 && Math.abs(hi[1] - lo[1] - layerH) < 1e-9, "upper arc is the lower arc lifted by the layer height");
}
const yMid = band.pathPoints[1].anchor[1], yEnds = (band.pathPoints[0].anchor[1] + band.pathPoints[2].anchor[1]) / 2;
assert.ok(yMid < yEnds, "visible side band is the front (lower) arc");

// clearPreview는 참조가 죽었어도 이름으로 남은 미리보기 그룹을 지운다
const clearSource = extractFunction("clearPreview");
assert.ok(/name === PREVIEW_GROUP_NAME/.test(clearSource), "clearPreview sweeps leftover preview groups by name");

console.log("check-isometric: ok");
