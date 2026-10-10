const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
const SHAPES = '["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"]';
// 모양 목록 번호(삼각형 0, 꺾쇠 1, 제비꼬리 2, 작살형 3) → 일러스트레이터 커스텀 화살표(화살표.ai) 번호: 삼각형 3, 꺾쇠 9, 제비꼬리 2, 작살형 1
const NATIVE = '["화살표 3", "화살표 9", "화살표 2", "화살표 1"]';

// 일러스트레이터 화살촉(액션으로 붙이는 것)을 쓰는 스크립트: 직접 그리는 스크립트와 같은 4종류 목록에서 고르고, 고른 모양의 커스텀 화살표 이름으로 액션을 쓴다
const SIMPLE = {   // 저장 형식(태그·필드 수)
  "대류.jsx": {tag: "v5", count: 18},
  "먹이 사슬.jsx": {tag: "v2", count: 8},
  "힘 화살표.jsx": {tag: "v2", count: 13},
  "입자 상태 모형.jsx": {tag: "v3", count: 16},
  "별의 일주 운동.jsx": {tag: "v3", count: 22},
};
for (const [file, spec] of Object.entries(SIMPLE)) {
  const source = read(file);
  assert.ok(source.includes(`var HEAD_SHAPES = ${SHAPES};`), `${file}: same four shapes as the drawn scripts`);
  assert.ok(source.includes(`var ARROW_NATIVE = ${NATIVE};`), `${file}: custom arrow names by shape`);
  assert.ok(source.includes("var headShape = 3;"), `${file}: default is the harpoon (화살표 1) as before`);
  assert.ok(source.includes("toActionHex(ARROW_NATIVE[headShape])"), `${file}: action uses the chosen arrow`);
  assert.ok(!/ARROW_NAME\b|ARROW_TYPES|headType/.test(source), `${file}: no old names left`);
  assert.ok(/headShapeList = headShapeRow\.add\("dropdownlist", undefined, HEAD_SHAPES\)/.test(source), `${file}: shape dropdown`);
  assert.ok(source.includes("headShape = headShapeList.selection.index;"), `${file}: dropdown writes the option`);
  assert.ok(source.includes(`p[0] !== "${spec.tag}" || p.length !== ${spec.count}`), `${file}: settings ${spec.tag}/${spec.count}`);
  assert.ok(source.includes(`headShape = restoreNumber(p[${spec.count - 1}], headShape, [0, HEAD_SHAPES.length - 1], 1);`), `${file}: shape restored and validated`);
  assert.ok(/, headShape\];/.test(source), `${file}: shape saved`);
}

// MoonPhase: 모양과 크기를 새로 넣었다
{
  const source = read("달 위상.jsx");
  assert.ok(source.includes(`var HEAD_SHAPES = ${SHAPES};`) && source.includes(`var ARROW_NATIVE = ${NATIVE};`));
  assert.ok(source.includes("applyArrowheads(paths, rayWeight, headScale);"), "MoonPhase: size is the option, not 100");
  assert.ok(source.includes("toActionHex(ARROW_NATIVE[headShape])") && source.includes("var headShape = 3;"));
  assert.ok(source.includes('p[0] !== "v3" || p.length !== 23'));
  assert.ok(source.includes("headScale, headShape];") && source.includes("headShape = restoreNumber(p[22], headShape, [0, HEAD_SHAPES.length - 1], 1);"));
}

// StepFlow: 기본은 삼각형(화살표 3), 저장 키 목록에 들어 있다
{
  const source = read("단계 흐름도.jsx");
  assert.ok(source.includes(`var HEAD_SHAPES = ${SHAPES};`) && source.includes("var ARROW_NUMBER = [3, 9, 2, 1];"));
  assert.ok(source.includes("ARROW_PREFIX + ARROW_NUMBER[options.headShape]"), "StepFlow: action uses the chosen arrow");
  assert.ok(source.includes("symbolSet: 1, headShape: 0,"), "StepFlow: default is the triangle (화살표 3) as before");
  assert.ok(source.includes('"symbolSet", "headShape"]') && source.includes("SYMBOL_SETS.length - 1, 3]"), "StepFlow: headShape is a saved key with range 0..3");
  assert.ok(source.includes('var parts = ["v3"];') && source.includes('p[0] !== "v3"'), "StepFlow: settings v3");
  assert.ok(!/ARROW_TYPES|headType/.test(source));
}

// RegionBrace: 중괄호용 촉(바깥 7, 가운데 6)은 고정, 크기만 고른다
{
  const source = read("영역 중괄호.jsx");
  assert.ok(source.includes('var ARROW_OUTER = isKorean ? "화살표 7" : "Arrow 7";') && source.includes('var ARROW_INNER = isKorean ? "화살표 6" : "Arrow 6";'), "RegionBrace: brace heads stay 7 and 6");
  assert.strictEqual((source.match(/\/value " \+ headScale/g) || []).length, 2, "RegionBrace: both head sizes use the option");
  assert.ok(source.includes("var headScale = ARROW_SCALE;") && source.includes('p[0] !== "v3" || p.length < 7'));
  assert.ok(!/ARROW_TYPES|outerType|addTypeRow/.test(source));
}

// CellDivision: 감수 분열(기본 작살형 = 화살표 1)과 세포 주기(기본 삼각형 = 화살표 3) 탭이 따로 고른다
{
  const source = read("세포분열.jsx");
  assert.ok(source.includes(`var HEAD_SHAPES = ${SHAPES};`) && source.includes(`var HEAD_SHAPES2 = ${SHAPES};`));
  assert.ok(source.includes("var ARROW_NUMBER = [3, 9, 2, 1];") && source.includes("var ARROW_NUMBER2 = [3, 9, 2, 1];"));
  assert.ok(source.includes("var headShape = 3;") && source.includes("var headShape2 = 0;"), "CellDivision: defaults as before");
  assert.ok(source.includes('(isKorean ? "화살표 " : "Arrow ") + ARROW_NUMBER[headShape];') && source.includes('(isKorean ? "화살표 " : "Arrow ") + ARROW_NUMBER2[headShape2];'), "CellDivision: both tabs name the chosen arrow");
  assert.ok(!/ARROW_NAME_(KO|EN)|ARROW_TYPES|headType/.test(source));
  assert.ok(source.includes('p[0] !== "v5" || p.length !== 22') && source.includes('p[0] !== "v4" || p.length !== 18'), "CellDivision: settings v5/22 and v4/18");
  assert.ok(/arrowScale, headShape2, gapDeg/.test(source), "CellDivision: cell-cycle preview key includes the shape");
}

// GraphTools: 축 탭과 복사 탭(둘 다 기본 작살형 = 화살표 1): 모양과 크기
{
  const source = read("그래프·표.jsx");
  assert.strictEqual((source.match(/var HEAD_SHAPES = \[/g) || []).length, 2, "GraphTools: both tabs have the list");
  assert.strictEqual((source.match(/var ARROW_NATIVE = \["화살표 3", "화살표 9", "화살표 2", "화살표 1"\];/g) || []).length, 2, "GraphTools: both tabs map shapes to custom arrows");
  assert.ok(!/ARROW_NAME\b|ARROW_TYPES|headType/.test(source), "GraphTools: no old names left");
  assert.strictEqual((source.match(/toActionHex\(ARROW_NATIVE\[headShape\]\)/g) || []).length, 2, "GraphTools: both actions use the chosen arrow");
  assert.strictEqual((source.match(/\/value " \+ headScale\.toFixed\(1\)/g) || []).length, 2, "GraphTools: axis head sizes use the option");
  assert.strictEqual((source.match(/\/value " \+ scale\.toFixed\(1\)/g) || []).length, 2, "GraphTools: solar head sizes use the option");
  assert.ok(source.includes('"v8",') && source.includes('p[0] === "v8" && p.length >= 23'), "GraphTools: axis settings v8");
  assert.ok(source.includes('p[0] !== "v2" || p.length !== 17'), "GraphTools: solar settings v2/17");
}

// Weather: 기권 탭 축과 기압과 바람 탭(기본 작살형), 층 묶음 중괄호 촉(7·6)은 고정
{
  const source = read("날씨.jsx");
  assert.ok(source.includes(`var HEAD_SHAPES = ${SHAPES};`) && source.includes("var ARROW_NUMBER = [3, 9, 2, 1];"));
  assert.ok(source.includes("function arrowNameOf(shape) { return ARROW_PREFIX + ARROW_NUMBER[shape]; }"));
  assert.ok(source.includes("var ARROW_BRACE_OUTER = ARROW_PREFIX + 7;") && source.includes("var ARROW_BRACE_INNER = ARROW_PREFIX + 6;"), "Weather: brace heads stay 7 and 6");
  assert.ok(source.includes('{key: "headShape", label: "축 화살촉 모양", items: HEAD_SHAPES, value: 3}'), "Weather: atmosphere axis default is the harpoon");
  assert.ok(source.includes('{key: "headShape", label: "촉 모양", items: HEAD_SHAPES, value: 3}'), "Weather: pressure default is the harpoon");
  assert.ok(!/ARROW_TYPES|headType|braceOuter|braceInner/.test(source));
}

console.log("native heads: ok");
