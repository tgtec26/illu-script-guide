const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 쌓기나무.jsx에서 층수 읽기·모눈·그리기 함수를 잘라 가짜 도구로 돌려 검사한다 (웹 stacked-cubes.test.js와 같은 경우)
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "05_수학", "쌓기나무.jsx"), "utf8");
new Function(source);
es3Lint(source, "쌓기나무");
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced: ${name}`);
}
const core = source.slice(source.indexOf("    var CUBE_FIGURES"), source.indexOf("\n    // 목록·표가 다 정해진 뒤에 창을 띄운다"));
const catalog = source.slice(source.indexOf("    var HEAD_CATALOG"), source.indexOf("    var HEAD_EXAM ="));
const names = ["parseCubeRows", "cubeGrid", "cubeTopCells", "cubeFrontCells", "cubeSideCells", "drawStackedCubes"];
const f = new Function(`${catalog}\n${core}\n${extractFunction("catalogPoints")}\nreturn {${names.join(",")}};`)();

// 웹 생성기와 그리기 코드가 글자 그대로 같다 (웹 저장소가 옆 폴더에 있을 때만)
const webPath = path.join(__dirname, "..", "..", "sci-illu-web", "src", "generators", "stacked-cubes.js");
if (fs.existsSync(webPath)) {
  const web = fs.readFileSync(webPath, "utf8");
  const webCore = web.slice(web.indexOf("var CUBE_FIGURES"), web.indexOf("export const CUBE_CONTROLS")).trim();
  const scriptCore = core.split("\n").map((line) => line.replace(/^ {4}/, "")).join("\n").trim();
  assert.strictEqual(scriptCore, webCore, "쌓기나무.jsx의 그리기 코드가 웹 stacked-cubes.js와 다르다");
}

const MM = 2.834645669;
const base = { heights: "1 2 1 / 2 3 1 / 1 1 0", figure: 0, cell: 6, showDirections: true, projection: 0, side: 0, shade: 1,
  viewFill: true, viewFrame: true, showTitles: true, gap: 6, font: 8, wBody: 0.5, wRope: 0.3, wArrow: 0.4 };
const PLAIN = { showDirections: false, viewFrame: false };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  t.path = (...a) => { calls.push({ k: "path", a }); return {}; };
  t.line = (...a) => { calls.push({ k: "line", a }); return {}; };
  t.text = (...a) => { calls.push({ k: "text", a }); return {}; };
  t.textAt = (...a) => { calls.push({ k: "text", a }); return {}; };
  f.drawStackedCubes(t, Object.assign({}, base, o));
  return calls;
}
const rise = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;   // 일러 좌표(y 위 +)

// 층수 글: 줄은 / 쉼표 줄바꿈, 칸은 공백, 숫자만 쓴 줄은 한 글자가 한 칸, 9층·10칸까지
assert.deepStrictEqual(f.parseCubeRows(base.heights), [[1, 2, 1], [2, 3, 1], [1, 1, 0]]);
assert.deepStrictEqual(f.parseCubeRows("121, 231\n110"), [[1, 2, 1], [2, 3, 1], [1, 1, 0]]);
assert.deepStrictEqual(f.parseCubeRows("a 2 -1 / / 12 3"), [[0, 2, 0], [9, 3]]);
assert.strictEqual(f.parseCubeRows("1 ".repeat(12))[0].length, 10);

// 칸 높이와 위·앞·옆·층별 모눈 (옆은 오른쪽 옆이면 앞줄이 왼쪽)
const g = f.cubeGrid(base.heights);
assert.deepStrictEqual([g.W, g.D, g.maxH, g.count], [3, 3, 3, 12]);
assert.deepStrictEqual(f.cubeTopCells(g, 2), [[0, 1, 0], [1, 1, 0], [0, 0, 0]]);
assert.deepStrictEqual(f.cubeFrontCells(g), [[0, 1, 0], [1, 1, 0], [1, 1, 1]]);
assert.deepStrictEqual(f.cubeSideCells(g, 0), [[0, 1, 0], [0, 1, 1], [1, 1, 1]]);
assert.deepStrictEqual(f.cubeSideCells(g, 1), [[0, 1, 0], [1, 1, 0], [1, 1, 1]]);

// 맞닿아 늘 가려지는 면은 그리지 않는다
for (const projection of [0, 1, 2]) for (const side of [0, 1]) {
  const faces = (heights) => run(Object.assign({ heights, projection, side }, PLAIN)).filter((c) => c.k === "path").length;
  assert.deepStrictEqual([faces("1"), faces("1 1"), faces("2"), faces("1 / 1")], [3, 5, 5, 5], `${projection}/${side}`);
}
// 면 음영(교과서): 윗면·앞면·옆면 K10·25·40, 없음이면 모두 흰색
assert.deepStrictEqual(run(Object.assign({ heights: "1" }, PLAIN)).map((c) => c.a[2]), [10, 25, 40]);
assert.deepStrictEqual(run(Object.assign({ heights: "1", shade: 0 }, PLAIN)).map((c) => c.a[2]), [0, 0, 0]);
// 교과서 투영: 앞면 바닥 모서리 −16°, 옆면 바닥 모서리 23° (왼쪽 앞에서 보면 16°·157°)
for (const [side, front, right] of [[0, -16, 23], [1, 16, 157]]) {
  const faces = run(Object.assign({ heights: "1", side }, PLAIN)).map((c) => c.a[0]);
  assert.ok(Math.abs(rise(faces[1][0], faces[1][1]) - front) < 1e-9, `front ${side}`);
  assert.ok(Math.abs(rise(faces[2][0], faces[2][1]) - right) < 1e-9, `side ${side}`);
}
// 방향 표시: 앞·옆·위 화살표(선 + 삼각형 촉), 앞은 왼쪽·옆은 오른쪽(왼쪽 앞에서 보면 반대)·위는 맨 위
for (const side of [0, 1]) {
  const calls = run({ side });
  assert.strictEqual(calls.filter((c) => c.k === "line").length, 3);
  assert.strictEqual(calls.filter((c) => c.k === "path").length, run(Object.assign({ side }, PLAIN)).length + 3);
  const at = {};
  for (const c of calls.filter((c) => c.k === "text")) at[c.a[0]] = [c.a[1], c.a[2]];
  assert.ok(side === 0 ? at["앞"][0] < at["옆"][0] : at["앞"][0] > at["옆"][0], `side ${side}`);
  assert.ok(at["위"][1] > at["앞"][1] && at["위"][1] > at["옆"][1], "위가 맨 위");
}

// 그림 종류마다 이름 글자
const texts = (figure, extra) => run(Object.assign({ figure, showDirections: false }, extra)).filter((c) => c.k === "text").map((c) => c.a[0]);
assert.deepStrictEqual(texts(1), []);
assert.deepStrictEqual(texts(3), ["위", "앞", "옆"]);
assert.deepStrictEqual(texts(4), ["1", "2", "1", "2", "3", "1", "1", "1"]);
assert.deepStrictEqual(texts(5), ["1층", "2층", "3층"]);
assert.deepStrictEqual(texts(3, { showTitles: false }), []);
assert.deepStrictEqual(run({ figure: 5 }).filter((c) => c.k === "text").map((c) => c.a[0]), ["1층", "앞", "2층", "앞", "3층", "앞"]);
// 본 모양: 칸 20개, 점선 틀 24줄(점선), 칠한 칸 K20
assert.strictEqual(run(Object.assign({ figure: 3 }, PLAIN)).filter((c) => c.k === "path").length, 20);
const framed = run({ figure: 3, showDirections: false });
assert.strictEqual(framed.filter((c) => c.k === "line" && c.a[3]).length, 24);
assert.ok(framed.filter((c) => c.k === "path").every((c) => c.a[2] === 20));
// 입체 + 위에서 본 모양: 위 모양이 45° 돌아간다(오른쪽 앞이면 시계 방향)
const turned = run(Object.assign({ heights: "1", figure: 1 }, PLAIN)).filter((c) => c.k === "path")[3].a[0];
assert.ok(Math.abs(rise(turned[0], turned[1]) - -45) < 1e-9);
assert.strictEqual(run({ heights: "0 0 / 0" }).length, 0);
// 쌓기나무 면과 본 모양 칸은 경사 연결(좁은 면의 뾰족한 모서리에서 선이 튀어나오지 않게)
for (const figure of [0, 1, 3, 5]) {
  const closed = run({ figure }).filter((c) => c.k === "path" && c.a[3] !== null);
  assert.ok(closed.length > 0 && closed.every((c) => c.a[6] === "bevel"), `figure ${figure}`);
}

console.log("stacked cubes ok");
