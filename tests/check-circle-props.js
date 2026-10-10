const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(중학교 수학.jsx)의 "CircleProps" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "중학교 수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeCirclePropsEngine(");
  assert.ok(start >= 0, "missing engine: makeCirclePropsEngine");
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

const names = ["buildCircleFigure", "smallAngle", "rightAngle", "formatDegrees", "arcPoints", "line", "plain", "unitAt",
  "midpoint", "sub", "dist", "angleOf", "offset", "unit"];
const g = new Function(`var DOT_RADIUS_MM = 0.6;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const none = { center: false, chord: false, radii: false, inscribed: false, inscribedMark: false, centralMark: false, values: false,
  perpendicular: false, sector: false, tangent: false, external: false, names: true, a: 210, b: 330, p: 100, t: 45, q: 0, qDistance: 2 };
const build = (extra) => g.buildCircleFigure([0, 0], 10, Object.assign({}, none, extra), 2);
const texts = (d) => d.texts.map((t) => t.text);

// 원주각은 중심각의 절반 (P가 다른 쪽 호 위)
{
  const d = build({ centralMark: true, inscribed: true, inscribedMark: true, values: true });
  assert.deepStrictEqual(texts(d).filter((t) => t.endsWith("°")), ["120°", "60°"]);
  assert.deepStrictEqual(texts(d).filter((t) => !t.endsWith("°")).sort(), ["A", "B", "P"]);
}
// 지름에 대한 원주각은 90°, 0°를 가로지르는 각도
assert.deepStrictEqual(texts(build({ inscribed: true, values: true, a: 0, b: 180, p: 270 })).filter((t) => t.endsWith("°")), ["90°"]);
assert.deepStrictEqual(texts(build({ centralMark: true, values: true, a: 330, b: 30 })).filter((t) => t.endsWith("°")), ["60°"]);
assert.strictEqual(g.formatDegrees(47.25), "47.3°");

// 현의 수선: M은 현의 중점, 직각 표시의 두 변은 수직
{
  const d = build({ perpendicular: true });
  const om = d.lines[0].points.map((p) => p.anchor);
  near(om[1][0], 0, "M under O"); near(om[1][1], -5, "M = midpoint of chord (cos 30° chord at y=-5)");
  const mark = d.lines[1].points.map((p) => p.anchor);
  const v1 = g.sub(mark[0], mark[1]), v2 = g.sub(mark[2], mark[1]);
  near(v1[0] * v2[0] + v1[1] * v2[1], 0, "right-angle mark is square");
}
// 지름이면 수선이 없다
assert.strictEqual(build({ perpendicular: true, a: 0, b: 180 }).lines.length, 0);

// 접선은 반지름과 수직, 원 밖 한 점에서 그은 두 접선 길이는 같다
{
  const d = build({ tangent: true, t: 45 });
  const [p0, p1] = d.lines[0].points.map((p) => p.anchor);
  const T = [10 * Math.cos(Math.PI / 4), 10 * Math.sin(Math.PI / 4)];
  near((p1[0] - p0[0]) * T[0] + (p1[1] - p0[1]) * T[1], 0, "tangent ⟂ OT");
  const e = build({ external: true, q: 30, qDistance: 2.5 });
  const [C, Q, D] = e.lines[0].points.map((p) => p.anchor);
  near(g.dist(C, [0, 0]), 10, "C on circle"); near(g.dist(D, [0, 0]), 10, "D on circle");
  near(g.dist(Q, C), g.dist(Q, D), "equal tangent lengths");
  near(g.sub(Q, C)[0] * C[0] + g.sub(Q, C)[1] * C[1], 0, "QC ⟂ OC");
}

// O 글자는 중심각 반대쪽 (중심각이 아래면 위로)
{
  const o = build({ center: true, centralMark: true }).texts.find((t) => t.text === "O");
  near(o.dir[0], 0, "O label x"); near(o.dir[1], 1, "O label goes up");
}

// 부채꼴: 중심에서 시작해 A→B 반시계 호, 채우기는 원 선 안쪽까지
{
  const inset = g.buildCircleFigure([0, 0], 10, Object.assign({}, none, { sector: true, a: 0, b: 90 }), 2, 0.4);
  near(inset.fills[0][1].anchor[0], 9.6, "fill stops inside the stroke");
  const d = build({ sector: true, a: 0, b: 90 });
  const pts = d.fills[0].map((p) => p.anchor);
  assert.deepStrictEqual(pts[0], [0, 0]);
  near(pts[1][0], 10, "arc starts at A"); near(pts[pts.length - 1][1], 10, "arc ends at B");
}

// 내접 사각형 ABCD: 마주 보는 두 각 ∠A + ∠C = 180° (A 210°, B 330°, C 20°, D 120° → ∠A 75°, ∠C 105°)
{
  const d = build({ quad: true, values: true, c: 20, d: 120 });
  assert.deepStrictEqual(texts(d).filter((t) => t.endsWith("°")), ["75°", "105°"]);
  assert.deepStrictEqual(texts(d).filter((t) => !t.endsWith("°")).sort(), ["A", "B", "C", "D"]);
  const quad = d.lines[0].points.map((p) => p.anchor);
  assert.strictEqual(quad.length, 5, "closed ABCDA");
  for (const p of quad) near(g.dist(p, [0, 0]), 10, "vertex on circle");
  // 순서가 뒤섞여도 원 위 순서대로 잇는다: C를 A와 B 사이로
  const e = build({ quad: true, c: 270, d: 120 });
  const order = e.lines[0].points.map((p) => Math.round((Math.atan2(p.anchor[1], p.anchor[0]) * 180 / Math.PI + 360) % 360));
  assert.deepStrictEqual(order, [210, 270, 330, 120, 210]);
  // 두 접선을 함께 켜면 접점은 E, F
  assert.ok(["E", "F"].every((n) => texts(build({ quad: true, external: true })).includes(n)));
}
// 접선과 현: 접선과 현 TA가 이루는 각 = 원주각 ∠TPA (T 45°, A 210°, P 100° → 호 TA(P 없는 쪽) 195° → 97.5°)
{
  const d = build({ tangentChord: true, values: true });
  assert.deepStrictEqual(texts(d).filter((t) => t.endsWith("°")), ["97.5°", "97.5°"]);
  assert.ok(["T", "A", "P"].every((n) => texts(d).includes(n)));
  // P를 반대쪽 호로 옮기면 각도 바뀐다 (P 300° → 호 TA 165° → 82.5°)
  assert.deepStrictEqual(texts(build({ tangentChord: true, values: true, p: 300 })).filter((t) => t.endsWith("°")), ["82.5°", "82.5°"]);
}

assert.ok(source.includes('var PREF_KEY = "CircleProps/settings";'));
assert.ok(source.indexOf("var FLAG_KEYS") < source.indexOf("applySettings();"), "FLAG_KEYS must exist before applySettings runs");
console.log("circle props checks passed");
