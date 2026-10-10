// 화살촉은 액션(임시 .aia)으로 붙이지 않고 측정한 일러스트레이터 화살촉을 직접 그린다 (2026-10-11).
// 선 끝을 촉 속(lineEnd)까지 줄이고 같은 그룹에 채운 촉 도형을 더하며, 모양은 드롭다운(작살형이 1번·기본)에서 고른다.
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {assertSameCatalog, catalog, expectedPoints, nearPoints} = require("./arrowhead-catalog.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
const SHAPES = '["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"]';

const CONVERTED = ["대류.jsx", "먹이 사슬.jsx", "별의 일주 운동.jsx", "달 위상.jsx", "힘 화살표.jsx", "입자 상태 모형.jsx", "그래프·표.jsx",
  "세포분열.jsx", "단계 흐름도.jsx", "영역 중괄호.jsx", "날씨.jsx", "열기관 순환.jsx", "에너지 준위.jsx"];

// 1) 액션으로 화살촉을 붙이는 코드가 없다
for (const file of CONVERTED) {
  const source = read(file);
  assert.ok(!/ARROW_NATIVE|ARROW_NUMBER|writeArrowheadAction|toActionHex|ai_plugin_setStroke|1634231346|applyArrowActionToPaths/.test(source), `${file}: no arrowhead action code`);
  assert.ok(!/화살표 [0-9]+"|Arrow [0-9]+"/.test(source), `${file}: no custom arrow names`);
  // 남은 doScript는 설치된 확장·병합 액션(최종훈 > 확장/도형 합치기)뿐이다
  for (const line of source.split("\n").filter((l) => /app\.doScript\(/.test(l))) assert.ok(/"최종훈"/.test(line), `${file}: only installed expand/unite actions remain: ${line.trim()}`);
  if (file === "영역 중괄호.jsx") continue;   // 중괄호 갈고리(화살표 6·7)만 쓴다: 아래 5)에서 검사
  assert.ok(source.includes("var HEAD_CATALOG = ["), `${file}: has the measured catalog`);
  assertSameCatalog(source, file);
}

// 2) 곡선 끝에도 붙는 공용 블록(경로 끝을 베지어 분할로 자른다)은 스크립트마다 같다
const CURVED = ["대류.jsx", "먹이 사슬.jsx", "별의 일주 운동.jsx", "달 위상.jsx"];
function grabFunction(source, name) {
  const i = source.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `missing ${name}`);
  let depth = 0;
  for (let k = source.indexOf("{", i); k < source.length; k++) {
    if (source[k] === "{") depth++;
    if (source[k] === "}" && --depth === 0) return source.slice(i, k + 1);
  }
  throw new Error(`unbalanced ${name}`);
}
const CURVED_FUNCTIONS = ["catalogPoints", "headUnit", "headBack", "arrowDist", "arrowLerp", "cutPathEnd", "addHeadShape", "applyArrowheads", "addArrowHead"];
const reference = CURVED_FUNCTIONS.map((n) => grabFunction(read(CURVED[0]), n));
for (const file of CURVED.slice(1)) {
  CURVED_FUNCTIONS.forEach((n, i) => assert.strictEqual(grabFunction(read(file), n), reference[i], `${file}: ${n} same as ${CURVED[0]}`));
}

// 3) cutPathEnd: 직선과 호 모두 끝에서 정확히 back만큼 떨어진 점에서 자르고 방향을 낸다
const { cutPathEnd } = new Function(`${reference.join("\n")}\nreturn {cutPathEnd};`)();
const corner = (x, y) => ({a: [x, y], l: [x, y], r: [x, y]});
{
  const r = cutPathEnd([corner(0, 0), corner(100, 0)], 9);
  assert.ok(r.found && r.j === 0);
  assert.ok(Math.abs(r.cut[0] - 91) < 1e-6 && Math.abs(r.cut[1]) < 1e-9, `straight cut ${r.cut}`);
  assert.deepStrictEqual(r.dir.map((v) => +v.toFixed(9)), [1, 0]);
  // 긴 꺾은선(촘촘한 점): 마지막 구간이 back보다 짧으면 그 앞 구간까지 거슬러 올라간다
  const dense = [];
  for (let i = 0; i <= 50; i++) dense.push(corner(i * 2, 0));
  const d = cutPathEnd(dense.slice(-3), 9);
  assert.ok(!d.found, "window too short → asks for more points");
  const wide = cutPathEnd(dense.slice(-8), 9);
  assert.ok(wide.found && Math.abs(wide.cut[0] - 91) < 1e-6, `dense cut ${wide.cut}`);
  // 사분원(반지름 100): 베지어 호의 끝점에서 9만큼 떨어진 점, 방향은 그 점에서 끝으로
  const h = 100 * 4 / 3 * Math.tan(Math.PI / 8);
  const arc = [{a: [100, 0], l: [100, 0], r: [100, h]}, {a: [0, 100], l: [h, 100], r: [0, 100]}];
  const a = cutPathEnd(arc, 9);
  assert.ok(a.found);
  assert.ok(Math.abs(Math.hypot(a.cut[0], a.cut[1] - 100) - 9) < 1e-6, "9 away from the tip");
  assert.ok(Math.abs(Math.hypot(a.cut[0], a.cut[1]) - 100) < 0.2, "cut stays on the arc");
  assert.ok(Math.abs(Math.hypot(...a.dir) - 1) < 1e-9 && a.dir[0] < 0, "direction points to the tip");
}

// 4) addArrowHead: 점이 모자라면 앞으로 거슬러 가고, 남는 점은 지우며, 촉은 같은 그룹에 채워 그린다
{
  const source = read(CURVED[0]);
  const make = new Function("headShape", "HEAD_CATALOG", `${reference.join("\n")}\nreturn addArrowHead;`);
  const heads = [];
  const container = {pathItems: {add() { const head = {setEntirePath(p) { this.points = p; }}; heads.push(head); return head; }}};
  const points = [];
  for (let i = 0; i <= 10; i++) { const p = {anchor: [i, 0], leftDirection: [i, 0], rightDirection: [i, 0], remove() { points.splice(points.indexOf(p), 1); }}; points.push(p); }
  const path = {pathPoints: points, strokeColor: "K", parent: container};
  const add = make(3, catalog.types);
  const head = add(path, 1, 100);   // 작살형 1pt·100% → back 9, 선 길이 10이라 점 1(x=1)까지 남는다
  assert.ok(head === heads[0] && head.name === "화살촉" && head.filled && !head.stroked && head.fillColor === "K");
  assert.deepStrictEqual(head.points[0], [10, 0], "tip at the original end");
  assert.ok(points.length >= 2 && Math.abs(points[points.length - 1].anchor[0] - 1) < 1e-6, `path cut to the head root: ${points.map((q) => q.anchor[0])}`);
  nearPoints(head.points, expectedPoints(3, [10, 0], [1, 0], 1), "harpoon head outline");
}

// 5) 중괄호 갈고리(화살표 6·7)는 영역 중괄호와 날씨가 같은 측정값을 쓴다
{
  const grabBrace = (file) => {
    const s = read(file), i = s.indexOf("var BRACE_HEAD_BACK");
    return s.slice(i, s.indexOf("    };", s.indexOf("var BRACE_HEADS")) + 7);
  };
  assert.strictEqual(grabBrace("영역 중괄호.jsx"), grabBrace("날씨.jsx"), "same brace hook data");
  const data = new Function(`${grabBrace("날씨.jsx")}\nreturn {BRACE_HEAD_BACK, BRACE_HEADS};`)();
  assert.strictEqual(data.BRACE_HEAD_BACK, 2.1707);
  for (const kind of ["inner", "outer"]) assert.strictEqual(data.BRACE_HEADS[kind].length, 6, `${kind}: six Bezier points`);
  // 바깥·안쪽 갈고리는 서로 거울상(옆 방향 반대)이다
  const lateral = (kind) => data.BRACE_HEADS[kind].map((p) => p.a[0]);
  lateral("inner").forEach((v, i) => assert.ok(Math.abs(v + lateral("outer")[i]) < 0.011, `mirror ${i}`));
}

// 6) 모양 목록과 기본값(작살형)
for (const file of ["대류.jsx", "먹이 사슬.jsx", "별의 일주 운동.jsx", "달 위상.jsx", "힘 화살표.jsx", "입자 상태 모형.jsx"]) {
  const source = read(file);
  assert.ok(source.includes(`var HEAD_SHAPES = ${SHAPES};`), `${file}: four shapes`);
  assert.ok(source.includes("var headShape = 3;"), `${file}: harpoon default`);
}
// 세포분열: 감수 분열(작살형)·세포 주기(삼각형) 탭이 따로 고르고 둘 다 같은 직접 그리기 함수를 쓴다
{
  const source = read("세포분열.jsx");
  assert.ok(source.includes("return applyHeadShapes(paths, ARROW_WIDTH_PT, arrowScale, headShape);"));
  assert.ok(source.includes("return applyHeadShapes(paths, arrowWidthPt, arrowScale, headShape2);"));
  assert.ok(source.includes("var headShape = 3;") && source.includes("var headShape2 = 0;"));
  assert.ok(source.includes("outlineArrows(group, arcs, arrowHeads)"), "expanding merges the arc with its head");
  assert.ok(!source.includes('executeMenuCommand("expandStyle")'), "heads are already shapes");
}
// 그래프·표: 두 탭 모두 양 끝에 촉을 그린다 (미리보기에도 보인다)
{
  const source = read("그래프·표.jsx");
  assert.strictEqual((source.match(/function addBothEndHeads\(/g) || []).length, 2, "both tabs");
  assert.ok(source.includes("addBothEndHeads(axis, axisWeight, headScale);") && source.includes("applyArrowheads([axis].concat(rangeLines), strokePt, headScale);"));
}
// 열기관 순환·에너지 준위: 축은 드롭다운 화살촉(기본 작살형)을 직접 그린다
for (const file of ["열기관 순환.jsx", "에너지 준위.jsx"]) {
  const source = read(file);
  assert.ok(source.includes('{key: "headShape", label: "화살촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3}'), `${file}: dropdown`);
  assert.ok(source.includes('{key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100}'), `${file}: size`);
}
console.log("drawn arrowheads: ok");
