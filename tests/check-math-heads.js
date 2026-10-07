const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const FILES = ["Object_HighCommon.jsx", "Object_HighGeometry.jsx", "Object_HighMath1.jsx", "Object_HighMath2.jsx",
  "Object_HighStatistics.jsx", "Object_MiddleMath.jsx"];

function extractFunction(source, name) {
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
const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1e-9, `${label}: expected ${b}, got ${a}`);

for (const file of FILES) {
  const source = fs.readFileSync(path.join(root, "스크립트", "07_수학", file), "utf8");
  new Function(source);

  // 화살촉 코드는 한 덩어리로 있어서 그대로 꺼내 쓴다
  const start = source.indexOf("// ==== 화살촉 (모든 탭 공통");
  const end = source.indexOf("function saveHeadStyle()");
  assert.ok(start > 0 && end > start, `${file}: head block`);
  const block = source.slice(start, end) + extractFunction(source, "saveHeadStyle");
  const store = {};
  const app = {preferences: {
    getStringPreference: (k) => { if (!(k in store)) throw new Error("no pref"); return store[k]; },
    setStringPreference: (k, v) => { store[k] = v; }
  }};
  const make = () => new Function("app", `${block}
return {headStyle, registerHead, applyHeadStyle, headShapeFor, saveHeadStyle, loadHeadStyle, HEAD_PREF_KEY, HEAD_SHAPES};`)(app);
  const lib = make();
  assert.strictEqual(lib.HEAD_SHAPES.length, 4, `${file}: four shapes`);

  const spec = lib.registerHead({length: 4, halfWidth: 1.3, notch: 1});
  const loose = {length: 4, halfWidth: 1.3, notch: 1};   // 등록하지 않은 규격(글자 위 화살표 등)
  const tip = [10, 0], d = [1, 0];

  // 기본은 평가원식(제비꼬리): 예전 네 점 그대로
  let h = lib.headShapeFor(tip, d, spec);
  assert.strictEqual(lib.headStyle.shape, 2, `${file}: swallowtail is the default`);
  assert.strictEqual(h.closed, true);
  assert.deepStrictEqual(h.points, [[10, 0], [6, 1.3], [7, 0], [6, -1.3]], `${file}: exam-style head unchanged`);
  near(spec.length - spec.notch, 3, `${file}: line meets the head at length - notch`);

  // 삼각형: 세 점, 선은 밑변 조금 앞(0.9 L)
  lib.headStyle.shape = 0; lib.applyHeadStyle();
  h = lib.headShapeFor(tip, d, spec);
  assert.strictEqual(h.points.length, 3, `${file}: triangle`);
  assert.deepStrictEqual(h.points[0], [10, 0]);
  near(spec.length - spec.notch, 3.6, `${file}: triangle line ends at 0.9 L`);

  // 꺾쇠: 열린 선, 선은 끝점까지
  lib.headStyle.shape = 1; lib.applyHeadStyle();
  h = lib.headShapeFor(tip, d, spec);
  assert.strictEqual(h.closed, false, `${file}: chevron is open`);
  assert.deepStrictEqual(h.points[1], [10, 0], `${file}: chevron apex`);
  near(spec.length - spec.notch, 0, `${file}: chevron line runs to the tip`);

  // 작살형(일러 화살표 3): 닫힌 여섯 점, 날개 끝 L 뒤 반폭 0.306 L, 홈 0.818 L, 선은 0.75 L에서 끝남
  lib.headStyle.shape = 3; lib.applyHeadStyle();
  h = lib.headShapeFor(tip, d, spec);
  assert.strictEqual(h.closed, true);
  assert.strictEqual(h.points.length, 6, `${file}: harpoon`);
  near(h.points[2][0], 6, `${file}: barb tips`);
  near(Math.abs(h.points[2][1]), 0.306 * 4, `${file}: barb half width`);
  near(h.points[3][0], 10 - 0.818 * 4, `${file}: notch`);
  near(h.points[1][0], 10 - 0.504 * 4, `${file}: mid point`);
  near(spec.length - spec.notch, 3, `${file}: harpoon line ends at 0.75 L`);

  // 크기: 규격이 같은 비율로 커지고 줄고, 등록 안 한 규격은 모양·크기와 상관없이 평가원식 그대로
  lib.headStyle.shape = 2; lib.headStyle.size = 200; lib.applyHeadStyle();
  near(spec.length, 8, `${file}: length scales`);
  near(spec.halfWidth, 2.6, `${file}: half width scales`);
  near(spec.length - spec.notch, 6, `${file}: notch distance scales`);
  lib.headStyle.shape = 3;
  assert.deepStrictEqual(lib.headShapeFor(tip, d, loose).points, [[10, 0], [6, 1.3], [7, 0], [6, -1.3]], `${file}: unregistered spec stays exam-style`);
  // 배율 인자(벡터 화살표)
  lib.headStyle.shape = 2; lib.headStyle.size = 100; lib.applyHeadStyle();
  near(lib.headShapeFor(tip, d, spec, 0.5).points[1][0], 8, `${file}: scale argument`);
  // 위쪽을 가리키는 화살촉
  h = lib.headShapeFor([0, 10], [0, 1], spec);
  near(h.points[1][1], 6, `${file}: upward wing is back along y`);

  // 설정: 저장한 값이 돌아오고 형식이 다르거나 범위를 벗어난 값은 기본값
  lib.headStyle.shape = 3; lib.headStyle.size = 150; lib.saveHeadStyle();
  assert.ok(store[lib.HEAD_PREF_KEY].startsWith("v1|3|150"), `${file}: stored string`);
  const again = make();
  assert.deepStrictEqual(again.headStyle, {shape: 3, size: 150}, `${file}: restored`);
  store[lib.HEAD_PREF_KEY] = "v1|9|150";
  assert.deepStrictEqual(make().headStyle, {shape: 2, size: 150}, `${file}: unknown shape is ignored, the valid size is kept`);
  store[lib.HEAD_PREF_KEY] = "v0|1|150";
  assert.deepStrictEqual(make().headStyle, {shape: 2, size: 100}, `${file}: old tag ignored`);
  store[lib.HEAD_PREF_KEY] = "v1|1|999";
  assert.deepStrictEqual(make().headStyle, {shape: 1, size: 100}, `${file}: out-of-range size ignored`);

  // 구조: 옛 머리 그리기 코드가 남지 않고, 규격 정의마다 등록하고, 호스트에 모양·크기 컨트롤이 있다
  assert.ok(!/path\.setEntirePath\(\[\s*tip,/.test(source), `${file}: no hand-built head left`);
  assert.ok(!/shape\.notch\b/.test(source) || /function headShapeFor/.test(source), `${file}: heads go through headShapeFor`);
  const defs = (source.match(/^ *var (ARROW|SMALL_ARROW|TURN_ARROW|VECTOR_ARROW) = \{/gm) || []).length;
  const regs = (source.match(/^ *registerHead\((ARROW|SMALL_ARROW|TURN_ARROW|VECTOR_ARROW)\);/gm) || []).length;
  assert.ok(defs > 0 && defs === regs, `${file}: every axis spec is registered (${defs} vs ${regs})`);
  assert.ok(/headShapeList = footer\.add\("dropdownlist", undefined, HEAD_SHAPES\)/.test(source), `${file}: shape dropdown`);
  assert.ok(source.includes("var headSizeBar = headSizeGroup.add(\"scrollbar\""), `${file}: size row`);
  assert.ok(source.includes("saveHeadStyle();"), `${file}: saved on confirm`);
  assert.ok(source.includes("headSizeReset.helpTip"), `${file}: R button`);
  const okAt = source.indexOf("okButton.onClick = function() {");
  assert.ok(source.slice(okAt, okAt + 200).includes("if (!engine.commit()) return;\n        saveHeadStyle();"), `${file}: head style saved only after a successful confirm`);
}

console.log(`math heads: ${FILES.length} scripts ok`);
