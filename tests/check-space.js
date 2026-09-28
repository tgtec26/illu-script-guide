const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(Object_HighGeometry.jsx)의 "Space" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighGeometry.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeSpaceEngine(");
  assert.ok(start >= 0, "missing engine: makeSpaceEngine");
  let depth = 0;
  for (let index = bundle.indexOf("{", start); index < bundle.length; index++) {
    if (bundle[index] === "{") depth++;
    if (bundle[index] === "}" && --depth === 0) return bundle.slice(start, index + 1);
  }
  throw new Error("unbalanced engine");
})();

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

const names = ["project", "buildSpace", "clipToPlane", "add3", "sub3", "scale3", "dot3", "unit3", "unit2", "fmt"];
const g = new Function(`var DEPTH = { scale: 0.5, angle: 30 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { mode: 0, plane: 60, theta: 35, length: 40, height: 10, distance: 15, direction: 15, marks: true, names: true, projection: true, mark: 2 };
const build = (o) => g.buildSpace(Object.assign({}, base, o));

// 사투상: 깊이 1은 (0.5 cos 30°, 0.5 sin 30°)
near(g.project([0, 1, 0])[0], 0.5 * Math.cos(Math.PI / 6), "depth x");
near(g.project([0, 1, 0])[1], 0.25, "depth y");
assert.deepStrictEqual(g.project([3, 0, 4]), [3, 4]);

// 정사영: A′B′ = 40 cos 35°, 평면 1 + AB·A′B′·보조선 + 수선 2, 호, 직각 2
{
  const d = build({});
  assert.strictEqual(d.notes[0], "A′B′ = AB cos θ = 40 × cos 35° = " + g.fmt(40 * Math.cos(35 * Math.PI / 180)) + " (mm)");
  const texts = d.texts.map((t) => t.text);
  for (const n of ["α", "A", "B", "A′", "B′", "θ"]) assert.ok(texts.includes(n), n);
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 3, "AA′, BB′, AC");
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3, "θ arc + 2 right angles");
  assert.strictEqual(d.dots.length, 4);
  // 높이 0이면 AA′ 점선이 없다
  assert.strictEqual(build({ height: 0 }).lines.filter((l) => l.kind === "guide").length, 2);
}
// 삼수선: PM = √(10² + 15²), 직각 표시 3개, l은 평면 안
{
  const d = build({ mode: 1 });
  assert.ok(d.notes.includes("PM = √(PH² + HM²) = " + g.fmt(Math.sqrt(325)) + " (mm)"));
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 3);
  for (const n of ["P", "H", "M", "l"]) assert.ok(d.texts.some((t) => t.text === n), n);
  const ends = g.clipToPlane([10, 10, 0], [1, 0, 0], 60, 45);
  assert.deepStrictEqual(ends, [[0, 10, 0], [60, 10, 0]]);
  assert.strictEqual(g.clipToPlane([10, 50, 0], [1, 0, 0], 60, 45), null);
}
// 두 평면: 평면 2개, 각 θ, 정사영 선택
{
  const d = build({ mode: 2, theta: 60 });
  assert.strictEqual(d.lines.filter((l) => l.kind === "plane").length, 2);
  assert.ok(d.notes[0].includes("S′ = S cos θ") && d.notes[0].includes("cos 60° = 0.5"));
  for (const n of ["α", "β", "l", "O", "θ", "Q", "Q′"]) assert.ok(d.texts.some((t) => t.text === n), n);
  const without = build({ mode: 2, projection: false, names: false, marks: false });
  assert.strictEqual(without.lines.filter((l) => l.kind === "mark").length, 1, "only the θ arc");
  assert.ok(!without.texts.some((t) => t.text === "O"));
}

assert.ok(source.includes('var PREF_KEY = "HighGeometrySpace/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("space checks passed");
