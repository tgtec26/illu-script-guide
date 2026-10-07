const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const {catalog, expectedPoints, nearPoints} = require("./arrowhead-catalog.js");
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
return {headStyle, registerHead, applyHeadStyle, headShapeFor, saveHeadStyle, loadHeadStyle, HEAD_PREF_KEY, HEAD_SHAPES, HEAD_CATALOG};`)(app);
  const lib = make();
  assert.strictEqual(lib.HEAD_SHAPES.length, 4, `${file}: four shapes`);
  assert.deepStrictEqual(lib.HEAD_SHAPES, ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"], `${file}: labels`);
  assert.deepStrictEqual(lib.HEAD_CATALOG, catalog.types.map((t) => ({length: t.length, lineEnd: t.lineEnd, poly: t.poly})), `${file}: same data as tools/arrowheads.json`);

  const spec = lib.registerHead({length: 4, halfWidth: 1.3, notch: 1});
  const loose = {length: 4, halfWidth: 1.3, notch: 1};   // 등록하지 않은 규격(글자 위 화살표 등)
  const tip = [10, 0], d = [1, 0];
  const k1 = 4 / 12.1;   // 규격 길이 4가 평가원식(작살형) 길이 12.1에 해당한다

  // 기본은 평가원식(작살형): 규격 길이 4에서 예전 축 화살촉과 거의 같은 크기, 선은 예전처럼 끝에서 3 앞(2.98)에서 끝난다
  assert.strictEqual(lib.headStyle.shape, 3, `${file}: harpoon (exam-style) is the default`);
  let h = lib.headShapeFor(tip, d, spec);
  assert.strictEqual(h.closed, true);
  nearPoints(h.points, expectedPoints(3, tip, d, k1), `${file}: default head`);
  near(spec.length - spec.notch, 9 * k1, `${file}: line meets the head at lineEnd`);
  assert.ok(Math.abs((spec.length - spec.notch) - 3) < 0.05, `${file}: close to the old exam-style line end (3)`);

  // 네 모양: 모양마다 카탈로그 모양과 선 끝 거리
  for (let shape = 0; shape < 4; shape++) {
    lib.headStyle.shape = shape; lib.applyHeadStyle();
    h = lib.headShapeFor(tip, d, spec);
    assert.strictEqual(h.closed, true, `${file}: shape ${shape} is closed`);
    nearPoints(h.points, expectedPoints(shape, tip, d, k1), `${file}: shape ${shape}`);
    near(spec.length - spec.notch, catalog.types[shape].lineEnd * k1, `${file}: shape ${shape} line end`);
    assert.ok(spec.length - spec.notch < catalog.types[shape].length * k1, `${file}: shape ${shape} line ends inside the head`);
  }

  // 크기: 규격이 같은 비율로 커지고, 등록 안 한 규격은 모양·크기와 상관없이 작살형(평가원식) 그대로
  lib.headStyle.shape = 2; lib.headStyle.size = 200; lib.applyHeadStyle();
  near(spec.length, 8, `${file}: length scales`);
  near(spec.length - spec.notch, catalog.types[2].lineEnd * 2 * k1, `${file}: line end scales`);
  nearPoints(lib.headShapeFor(tip, d, spec).points, expectedPoints(2, tip, d, 2 * k1), `${file}: swallowtail at 200%`);
  nearPoints(lib.headShapeFor(tip, d, loose).points, expectedPoints(3, tip, d, k1), `${file}: unregistered spec stays exam-style`);
  // 배율 인자(벡터 화살표)와 위쪽을 가리키는 화살촉
  lib.headStyle.shape = 3; lib.headStyle.size = 100; lib.applyHeadStyle();
  nearPoints(lib.headShapeFor(tip, d, spec, 0.5).points, expectedPoints(3, tip, d, 0.5 * k1), `${file}: scale argument`);
  nearPoints(lib.headShapeFor([0, 10], [0, 1], spec).points, expectedPoints(3, [0, 10], [0, 1], k1), `${file}: upward head`);

  // 설정: 저장한 값이 돌아오고 형식이 다르거나 범위를 벗어난 값은 기본값
  lib.headStyle.shape = 3; lib.headStyle.size = 150; lib.saveHeadStyle();
  assert.ok(store[lib.HEAD_PREF_KEY].startsWith("v1|3|150"), `${file}: stored string`);
  const again = make();
  assert.deepStrictEqual(again.headStyle, {shape: 3, size: 150}, `${file}: restored`);
  store[lib.HEAD_PREF_KEY] = "v1|9|150";
  assert.deepStrictEqual(make().headStyle, {shape: 3, size: 150}, `${file}: unknown shape is ignored, the valid size is kept`);
  store[lib.HEAD_PREF_KEY] = "v0|1|150";
  assert.deepStrictEqual(make().headStyle, {shape: 3, size: 100}, `${file}: old tag ignored`);
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
