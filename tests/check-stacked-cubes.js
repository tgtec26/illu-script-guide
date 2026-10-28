const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint");

// 쌓기나무.jsx에서 층수 읽기·모눈·그리기 함수를 잘라 가짜 도구로 돌려 검사한다 (웹 stacked-cubes.test.js와 같은 경우)
const source = fs.readFileSync(path.join(__dirname, "..", "스크립트", "05_수학", "쌓기나무.jsx"), "utf8");
new Function(source);
es3Lint(source, "쌓기나무");
const core = source.slice(source.indexOf("    var CUBE_FIGURES"), source.indexOf("\n    // 목록·표가 다 정해진 뒤에 창을 띄운다"));
const f = new Function(`${core}\nreturn {parseCubeRows: parseCubeRows, cubeGrid: cubeGrid, cubeTopCells: cubeTopCells, cubeFrontCells: cubeFrontCells, cubeSideCells: cubeSideCells, drawStackedCubes: drawStackedCubes};`)();

// 웹 생성기와 그리기 코드가 글자 그대로 같다 (웹 저장소가 옆 폴더에 있을 때만)
const webPath = path.join(__dirname, "..", "..", "sci-illu-web", "src", "generators", "stacked-cubes.js");
if (fs.existsSync(webPath)) {
  const web = fs.readFileSync(webPath, "utf8");
  const webCore = web.slice(web.indexOf("var CUBE_FIGURES"), web.indexOf("export const CUBE_CONTROLS")).trim();
  const scriptCore = core.split("\n").map((line) => line.replace(/^ {4}/, "")).join("\n").trim();
  assert.strictEqual(scriptCore, webCore, "쌓기나무.jsx의 그리기 코드가 웹 stacked-cubes.js와 다르다");
}

const MM = 2.834645669;
const base = { heights: "1 2 1 / 2 3 1 / 1 1 0", figure: 0, cell: 6, projection: 0, side: 0, shade: 1, viewFill: false, showTitles: true, gap: 6, font: 8, wBody: 0.5 };
function run(o) {
  const calls = [];
  const t = { mm: MM };
  t.path = (...a) => { calls.push({ k: "path", a }); return {}; };
  t.rect = (...a) => { calls.push({ k: "rect", a }); return {}; };
  t.textAt = (...a) => { calls.push({ k: "text", a }); return {}; };
  f.drawStackedCubes(t, Object.assign({}, base, o));
  return calls;
}

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
for (const projection of [0, 1]) for (const side of [0, 1]) {
  const faces = (heights) => run({ heights, projection, side }).filter((c) => c.k === "path").length;
  assert.deepStrictEqual([faces("1"), faces("1 1"), faces("2"), faces("1 / 1")], [3, 5, 5, 5], `${projection}/${side}`);
}
// 면 음영: 윗면·앞면·옆면 K
assert.deepStrictEqual(run({ heights: "1" }).map((c) => c.a[2]), [0, 10, 25]);
assert.deepStrictEqual(run({ heights: "1", shade: 0 }).map((c) => c.a[2]), [0, 0, 0]);

// 그림 종류마다 이름 글자
const texts = (figure, extra) => run(Object.assign({ figure }, extra)).filter((c) => c.k === "text").map((c) => c.a[0]);
assert.deepStrictEqual(texts(1), ["위", "앞", "옆"]);
assert.deepStrictEqual(texts(3), ["1", "2", "1", "2", "3", "1", "1", "1"]);
assert.deepStrictEqual(texts(4), ["1층", "2층", "3층"]);
assert.deepStrictEqual(texts(2, { showTitles: false }), []);
assert.strictEqual(run({ figure: 2 }).filter((c) => c.k === "rect").length, 20);
assert.strictEqual(run({ heights: "0 0 / 0" }).length, 0);

console.log("stacked cubes ok");
