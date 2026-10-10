const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(공통수학.jsx)의 "Rational" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "공통수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeRationalEngine(");
  assert.ok(start >= 0, "missing engine: makeRationalEngine");
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

const names = ["branchRange", "hyperbolaBranch", "rootRange", "rootPiece", "buildRational", "coefText", "shiftText", "tailText", "rationalText", "rootText", "fmt", "straight"];
const g = new Function(`var ARROW = { length: 4, halfWidth: 1.3, notch: 1 }, HYPERBOLA_STEP = 0.25;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const bez = (p, q, t) => { const s = 1 - t; return [0, 1].map((i) => s * s * s * p.anchor[i] + 3 * s * s * t * p.right[i] + 3 * s * t * t * q.left[i] + t * t * t * q.anchor[i]); };
const base = { kind: 0, k: 2, a: 1, p: 1, q: 1, xMin: -3, xMax: 6, yMin: -3, yMax: 6, unit: 1, tick: 2,
  asymptote: true, start: true, intercepts: true, formula: true, grid: false, numbers: false };
const build = (o) => g.buildRational(Object.assign({}, base, o));
const graphs = (d) => d.lines.filter((l) => l.kind === "graph");
const texts = (d) => d.texts.map((t) => t.text);

// 식 글자
assert.strictEqual(g.rationalText(2, 1, 1), "y=2/(x-1)+1");
assert.strictEqual(g.rationalText(-3, 0, 0), "y=-3/x");
assert.strictEqual(g.rationalText(1, -2.5, -1), "y=1/(x+2.5)-1");
assert.strictEqual(g.rootText(1, 1, 0, 0), "y=√x");
assert.strictEqual(g.rootText(-1, 2, 1, 1), "y=-√(2x-2)+1");
assert.strictEqual(g.rootText(1, -1, 3, 0), "y=√(-x+3)");

// 쌍곡선 가지 범위: y=2/(x-1)+1, 오른쪽 가지 y ≤ 6 → x-1 ≥ 2/5, 왼쪽 가지 y ≥ -3 → 1-x ≥ 1/2
{
  const r = g.branchRange(2, -4, 5, 0, 5);
  near(r[0], 0.4, "right near");
  near(r[1], 5, "right far");
  const l = g.branchRange(-2, -4, 5, 0, 4);
  near(l[0], 0.5, "left near");
  near(l[1], 4, "left far");
  // 가지가 범위 밖: k>0인데 y 범위가 q 아래뿐
  assert.strictEqual(g.branchRange(2, -4, -1, 0, 5), null);
}

// 쌍곡선 도막: 베지어 위의 점이 식에 충분히 가깝다 (단위 길이의 1/10000)
{
  const pts = g.hyperbolaBranch(2, 1, 1, 1, 0.4, 5, 1);
  assert.ok(pts.length >= 3, "several pieces");
  let worst = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    for (const t of [0.25, 0.5, 0.75]) {
      const [x, y] = bez(pts[i], pts[i + 1], t);
      worst = Math.max(worst, Math.abs(y - (2 / (x - 1) + 1)) / Math.hypot(1, 2 / ((x - 1) * (x - 1))));
    }
  }
  assert.ok(worst < 1e-4, `hyperbola error ${worst}`);
  near(pts[0].anchor[0], 1.4, "branch start x");
  near(pts[pts.length - 1].anchor[1], 1 + 2 / 5, "branch end y");
}

// 무리함수 조각은 정확: y=-√(2(x-1))+1
{
  const rr = g.rootRange(-1, 2, 1, 1, -3, 6, -3, 6);
  near(rr[0], 0, "starts at start point");
  near(rr[1], Math.sqrt(10), "x ≤ 6 → r ≤ √10");
  const piece = g.rootPiece(-1, 2, 1, 1, rr[0], rr[1], 1);
  for (const t of [0.2, 0.5, 0.9]) { const [x, y] = bez(piece[0], piece[1], t); near(y, -Math.sqrt(2 * (x - 1)) + 1, "on root curve"); }
  // y ≥ -3이 먼저 막으면 r ≤ 4보다 작은 쪽
  near(g.rootRange(-1, 1, 0, 1, -3, 20, -3, 6)[1], 4, "cut by y range");
  // a<0: 정의역 x ≤ p
  const neg = g.rootRange(1, -1, 3, 0, -3, 6, -3, 6);
  near(neg[1], Math.sqrt(6), "x ≥ -3 → r ≤ √6");
  // 시작점이 범위 밖이면 가까운 쪽부터
  near(g.rootRange(1, 1, -5, 0, -3, 6, -3, 6)[0], Math.sqrt(2), "x ≥ -3 → r ≥ √2");
  assert.strictEqual(g.rootRange(1, 1, 8, 0, -3, 6, -3, 6), null);
}

// 유리함수 그림: 두 가지, 점근선 두 개와 이름, 절편, 식 글자, 정의역·치역
{
  const d = build({});
  assert.strictEqual(graphs(d).length, 2);
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 2);
  const t = texts(d);
  for (const want of ["x=1", "y=1", "y=2/(x-1)+1", "-1", "-1"]) assert.ok(t.includes(want), want);
  // x절편 x = p - k/q = -1, y절편 y = q - k/p = -1
  assert.ok(d.dots.some((p) => Math.abs(p.at[0] + 1) < 1e-9 && p.at[1] === 0), "x intercept");
  assert.ok(d.dots.some((p) => p.at[0] === 0 && Math.abs(p.at[1] + 1) < 1e-9), "y intercept");
  assert.ok(d.notes.join("\n").includes("정의역 {x | x ≠ 1}, 치역 {y | y ≠ 1}"));
  // 눈금 숫자가 있으면 정수 절편은 점만, 식 글자는 점근선 쪽 끝(x = 1.4)
  const numbered = build({ numbers: true });
  assert.strictEqual(numbered.dots.length, 2);
  assert.strictEqual(numbered.texts.filter((x) => x.text === "-1" && x.clear === undefined).length, 0, "no duplicate intercept label");
  near(d.texts.find((x) => x.text === "y=2/(x-1)+1").at[0], 1.4, "formula at steep end");
  // 점근선 끔, q = 0이면 x절편 없음
  const e = build({ asymptote: false, q: 0 });
  assert.strictEqual(e.lines.filter((l) => l.kind === "guide").length, 0);
  assert.strictEqual(e.dots.length, 1);
}

// 무리함수 그림: 시작점, 절편, 정의역·치역
{
  const d = build({ kind: 1, a: 1, p: -2, q: -1 });
  assert.strictEqual(graphs(d).length, 1);
  assert.strictEqual(d.lines.filter((l) => l.kind === "guide").length, 0, "no asymptote");
  const t = texts(d);
  assert.ok(t.includes("(-2, -1)"), "start label");
  assert.ok(t.includes("y=√(x+2)-1"), "formula");
  // y절편 -1 + √2, x절편 -2 + 1 = -1
  assert.ok(d.dots.some((p) => p.at[0] === 0 && Math.abs(p.at[1] - (Math.sqrt(2) - 1)) < 1e-9), "y intercept");
  assert.ok(d.dots.some((p) => Math.abs(p.at[0] + 1) < 1e-9 && p.at[1] === 0), "x intercept");
  assert.ok(d.notes.join("\n").includes("정의역 {x | x ≥ -2}, 치역 {y | y ≥ -1}"));
  // 음의 부호, a<0
  const n = build({ kind: 2, a: -1, p: 2, q: 1 });
  assert.ok(n.notes.join("\n").includes("정의역 {x | x ≤ 2}, 치역 {y | y ≤ 1}"));
  // 시작점이 원점이면 절편 점을 겹쳐 찍지 않는다
  assert.strictEqual(build({ kind: 1, p: 0, q: 0 }).dots.length, 1);
}

// 창: 탭 이름, 저장 키, 저장 필드 수
assert.ok(source.includes('label: "유리·무리함수"'));
assert.ok(source.includes('var PREF_KEY = "HighCommonRational/settings";'));
assert.ok(source.includes('p.length !== 16'));
console.log("rational ok");
