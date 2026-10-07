const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
const TYPES = '["화살표 1", "화살표 2", "화살표 3", "화살표 4", "화살표 5", "화살표 6", "화살표 7", "화살표 8"]';

// 일러스트레이터 기본 화살촉(액션으로 붙이는 것)을 쓰는 스크립트: 화살표 1~8 중에서 고르고, 고른 번호로 액션을 쓴다
const SIMPLE = {   // 기본 번호 headType, 저장 형식(태그·필드 수)
  "Object_Convection.jsx": {tag: "v5", count: 18},
  "Object_FoodChain.jsx": {tag: "v2", count: 8},
  "Object_ForceDiagram.jsx": {tag: "v2", count: 13},
  "Object_ParticleState.jsx": {tag: "v3", count: 16},
  "Object_StarTrails.jsx": {tag: "v3", count: 22},
};
for (const [file, spec] of Object.entries(SIMPLE)) {
  const source = read(file);
  assert.ok(source.includes(`var ARROW_TYPES = ${TYPES};`), `${file}: eight native arrows`);
  assert.ok(source.includes("var headType = 1;"), `${file}: default is Arrow 1 as before`);
  assert.ok(source.includes("toActionHex(ARROW_TYPES[headType - 1])"), `${file}: action uses the chosen arrow`);
  assert.ok(!/ARROW_NAME\b/.test(source), `${file}: no fixed arrow name left`);
  assert.ok(/headTypeList = headTypeRow\.add\("dropdownlist", undefined, ARROW_TYPES\)/.test(source), `${file}: type dropdown`);
  assert.ok(source.includes("headType = headTypeList.selection.index + 1;"), `${file}: dropdown writes the option`);
  assert.ok(source.includes(`p[0] !== "${spec.tag}" || p.length !== ${spec.count}`), `${file}: settings ${spec.tag}/${spec.count}`);
  assert.ok(source.includes('headType = restoreNumber(p[' + (spec.count - 1) + '], headType, [1, ARROW_TYPES.length], 1);'), `${file}: type restored and validated`);
  assert.ok(/, headType\];/.test(source), `${file}: type saved`);
}

// MoonPhase: 종류와 크기를 새로 넣었다
{
  const source = read("Object_MoonPhase.jsx");
  assert.ok(source.includes(`var ARROW_TYPES = ${TYPES};`));
  assert.ok(source.includes("applyArrowheads(paths, rayWeight, headScale);"), "MoonPhase: size is the option, not 100");
  assert.ok(source.includes("toActionHex(ARROW_TYPES[headType - 1])"));
  assert.ok(source.includes('p[0] !== "v3" || p.length !== 23'));
  assert.ok(source.includes("headScale, headType];"));
}

// StepFlow: 기본은 화살표 3, 저장 키 목록에 들어 있다
{
  const source = read("Object_StepFlow.jsx");
  assert.ok(source.includes(`var ARROW_TYPES = ${TYPES};`));
  assert.ok(source.includes("ARROW_PREFIX + options.headType"), "StepFlow: action uses the chosen arrow");
  assert.ok(source.includes("symbolSet: 1, headType: 3,"), "StepFlow: default is Arrow 3 as before");
  assert.ok(source.includes('"symbolSet", "headType"]') && source.includes("SYMBOL_SETS.length - 1, 8]"), "StepFlow: headType is a saved key with range 1..8");
  assert.ok(source.includes('var parts = ["v3"];') && source.includes('p[0] !== "v3"'), "StepFlow: settings v3");
}

// RegionBrace: 바깥 끝(기본 7)·가운데 끝(기본 6) 종류와 크기
{
  const source = read("Object_RegionBrace.jsx");
  assert.ok(source.includes(`var ARROW_TYPES = ${TYPES};`));
  assert.ok(source.includes("var outerType = 7;") && source.includes("var innerType = 6;"), "RegionBrace: defaults 7 and 6 as before");
  assert.ok(source.includes("ARROW_PREFIX + (swap ? innerType : outerType)") && source.includes("ARROW_PREFIX + (swap ? outerType : innerType)"), "RegionBrace: names from the chosen types, flipped together");
  assert.strictEqual((source.match(/\/value " \+ headScale/g) || []).length, 2, "RegionBrace: both head sizes use the option");
  assert.ok(!/ARROW_SCALE\);/.test(source.replace("var headScale = ARROW_SCALE;", "")), "RegionBrace: no fixed head size in the action");
  assert.ok(source.includes('p[0] !== "v3" || p.length < 9'));
}

// CellDivision: 감수 분열(기본 1)과 세포 주기(기본 3) 탭이 따로 고른다
{
  const source = read("Object_CellDivision.jsx");
  assert.ok(source.includes(`var ARROW_TYPES = ${TYPES};`) && source.includes(`var ARROW_TYPES2 = ${TYPES};`));
  assert.ok(source.includes("var headType = 1;") && source.includes("var headType2 = 3;"), "CellDivision: defaults 1 and 3 as before");
  assert.ok(source.includes('(isKorean ? "화살표 " : "Arrow ") + headType;') && source.includes('(isKorean ? "화살표 " : "Arrow ") + headType2;'), "CellDivision: both tabs name the chosen arrow");
  assert.ok(!/ARROW_NAME_(KO|EN)/.test(source), "CellDivision: no fixed arrow name left");
  assert.ok(source.includes('p[0] !== "v5" || p.length !== 22') && source.includes('p[0] !== "v4" || p.length !== 18'), "CellDivision: settings v5/22 and v4/18");
  assert.ok(/arrowScale, headType2, gapDeg/.test(source), "CellDivision: cell-cycle preview key includes the type");
}

// GraphTools: 축 탭(기본 1)과 복사 탭(기본 1): 종류와 크기
{
  const source = read("Object_GraphTools.jsx");
  assert.strictEqual((source.match(/var ARROW_TYPES = \[/g) || []).length, 2, "GraphTools: both tabs have the list");
  assert.ok(!/ARROW_NAME\b/.test(source), "GraphTools: no fixed arrow name left");
  assert.strictEqual((source.match(/toActionHex\(ARROW_TYPES\[headType - 1\]\)/g) || []).length, 2, "GraphTools: both actions use the chosen arrow");
  assert.strictEqual((source.match(/\/value " \+ headScale\.toFixed\(1\)/g) || []).length, 2, "GraphTools: axis head sizes use the option");
  assert.strictEqual((source.match(/\/value " \+ scale\.toFixed\(1\)/g) || []).length, 2, "GraphTools: solar head sizes use the option");
  assert.ok(source.includes('"v8",') && source.includes('p[0] === "v8" && p.length >= 23'), "GraphTools: axis settings v8");
  assert.ok(source.includes('p[0] !== "v2" || p.length !== 17'), "GraphTools: solar settings v2/17");
}

// Weather: 기권 탭(축·중괄호 끝)과 기압과 바람 탭
{
  const source = read("Object_Weather.jsx");
  assert.ok(source.includes(`var ARROW_TYPES = ${TYPES};`));
  assert.ok(source.includes("function arrowNameOf(index) { return ARROW_PREFIX + (index + 1); }"));
  assert.ok(!/ARROW_AXIS|ARROW_BRACE_/.test(source), "Weather: no fixed arrow names left");
  assert.ok(source.includes('{key: "headType", label: "축 화살촉", items: ARROW_TYPES, value: 0}'), "Weather: atmosphere axis default Arrow 1");
  assert.ok(source.includes('{key: "braceOuter", label: "묶음 바깥 끝", items: ARROW_TYPES, value: 6}') && source.includes('{key: "braceInner", label: "묶음 가운데 끝", items: ARROW_TYPES, value: 5}'), "Weather: brace defaults Arrow 7 and 6 as before");
  assert.ok(source.includes('{key: "headType", label: "촉 종류", items: ARROW_TYPES, value: 0}'), "Weather: pressure default Arrow 1");
}

// 설정 형식: 저장 문자열의 필드 수와 검사하는 필드 수가 맞는지 (저장 배열 항목 수 = 검사 개수) — 단순형 다섯 개
for (const [file, spec] of Object.entries(SIMPLE)) {
  const source = read(file);
  const saves = [...source.matchAll(/var parts = \[[^;]*?\];/gs)].map((m) => m[0]).filter((t) => t.includes("headType"));
  assert.strictEqual(saves.length, 1, `${file}: one save array with the type`);
}

console.log("native heads: ok");
