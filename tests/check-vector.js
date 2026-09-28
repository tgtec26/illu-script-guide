const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 기하 묶음(Object_HighGeometry.jsx)의 "Vector" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_HighGeometry.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeVectorEngine(");
  assert.ok(start >= 0, "missing engine: makeVectorEngine");
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

const names = ["buildVectors", "combinationParts", "coefText", "arcPoints", "pairText", "add", "sub", "scale", "dot", "len", "unit", "clampValue", "formatValue", "straight"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, VECTOR_ARROW = { length: 3.2, halfWidth: 1.2, notch: 0.8 };\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const base = { a: [3, 1], b: [1, 2], operation: 1, k: 2, l: -1, unit: 10, tick: 2, mark: 4, angle: true, projection: false, components: false,
  points: false, axes: true, grid: false, numbers: false };
const build = (o) => g.buildVectors(Object.assign({}, base, o));
const labelOf = (t) => (t.parts ? t.parts.map((p) => p.text + (p.vector ? "→" : "")).join("") : t.text);

// 크기·내적·사잇각: (3,1)·(1,2) = 5, |a|=√10, |b|=√5 → cos θ = 1/√2 → 45°
{
  const d = build({});
  assert.strictEqual(d.notes[0], "|a| = 3.16, |b| = 2.24, a·b = 5, θ = 45°");
  assert.strictEqual(d.notes[1], "a+b = (4, 3), |a+b| = 5");
  const labels = d.texts.map(labelOf);
  for (const n of ["a→", "b→", "a→+b→", "θ"]) assert.ok(labels.includes(n), n);
  // 벡터 화살촉 3개, 평행사변형 점선 2개
  assert.strictEqual(d.arrows.filter((a) => a.shape === "vector").length, 3);
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
  // 선은 화살촉 뒤에서 끝난다
  const sum = d.lines.filter((l) => l.kind === "main")[2].points;
  near(Math.hypot(sum[1].anchor[0], sum[1].anchor[1]), 50 - 2.4, "line stops behind the head");
  // 사잇각 호는 a 방향에서 b 방향까지
  const arc = d.lines.find((l) => l.kind === "mark").points;
  near(Math.atan2(arc[0].anchor[1], arc[0].anchor[0]), Math.atan2(1, 3), "arc starts on a");
  near(Math.atan2(arc[arc.length - 1].anchor[1], arc[arc.length - 1].anchor[0]), Math.atan2(2, 1), "arc ends on b");
}
// 꼬리에 머리: b는 A에서 시작
{
  const d = build({ operation: 2, points: true });
  const mains = d.lines.filter((l) => l.kind === "main");
  assert.deepStrictEqual(mains[1].points[0].anchor, [30, 10]);
  assert.ok(d.texts.some((t) => t.text === "C"));
}
// a-b: B에서 A로
{
  const d = build({ operation: 3 });
  assert.strictEqual(d.notes[1], "a-b = (2, -1), |a-b| = 2.24");
  const mains = d.lines.filter((l) => l.kind === "main");
  assert.deepStrictEqual(mains[2].points[0].anchor, [10, 20]);
  assert.ok(d.texts.map(labelOf).includes("a→-b→"));
}
// ka+lb: 2a-b = (5, 0), 보조 벡터 2a, -b (0.4pt)
{
  const d = build({ operation: 4 });
  assert.strictEqual(d.notes[1], "2a-b = (5, 0), 크기 5");
  const labels = d.texts.map(labelOf);
  for (const n of ["2a→", "-b→", "2a→-b→"]) assert.ok(labels.includes(n), n);
  assert.strictEqual(d.lines.filter((l) => l.kind === "thin").length, 2);
}
assert.deepStrictEqual(g.combinationParts(-1, 3).map((p) => p.text), ["-", "a", "+3", "b"]);
assert.deepStrictEqual(g.combinationParts(0, -1).map((p) => p.text), ["-", "b"]);
// 정사영: a=(3,1)을 b=(1,2) 위로 → H = (1,2) (a·b/|b|² = 1), 길이 √5
{
  const d = build({ operation: 0, projection: true });
  assert.ok(d.notes.includes("정사영의 길이 |a|cos θ = 2.24"));
  const perpendicular = d.lines.find((l) => l.kind === "guide").points.map((p) => p.anchor);
  assert.deepStrictEqual(perpendicular, [[30, 10], [10, 20]]);
  assert.strictEqual(d.lines.filter((l) => l.kind === "mark").length, 2, "arc + right-angle mark");
}
// 이름은 끝점 무게중심에서 먼 쪽: a=(3,1) 이름은 아래(오른쪽 아래), b=(1,2) 이름은 왼쪽 위
{
  const d = build({ operation: 0, angle: false });
  const a = d.texts.find((t) => labelOf(t) === "a→"), b = d.texts.find((t) => labelOf(t) === "b→");
  assert.ok(a.dir[1] < 0, "a label below a");
  assert.ok(b.dir[0] < 0, "b label left of b");
}
// 좌표축 없이
assert.ok(!build({ axes: false }).texts.some((t) => t.text === "x"));

assert.ok(source.includes('var PREF_KEY = "HighMathVector/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");
console.log("vector checks passed");
