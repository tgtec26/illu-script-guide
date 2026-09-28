const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 고등학교 수학은 과목별 다섯 스크립트로 나뉜다. 탭(엔진)은 정확히 한 곳에 있고, 창마다 마지막 탭 저장 키가 다르다
const dir = path.resolve(__dirname, "..", "스크립트", "01_도형");
const bundles = {
  "Object_HighCommon.jsx": ["공통수학", ["Quadratic", "Move", "CircleLine", "Inequality", "Venn"]],
  "Object_HighMath1.jsx": ["수학Ⅰ", ["ExpLog", "Trig", "UnitCircle", "Triangle", "Sequence"]],
  "Object_HighMath2.jsx": ["수학Ⅱ", ["Piecewise", "Extrema", "Calculus", "Motion"]],
  "Object_HighStatistics.jsx": ["확률과 통계", ["Count", "ProbTree", "Distribution"]],
  "Object_HighGeometry.jsx": ["기하", ["Conic", "Vector", "Space"]],
};
assert.ok(!fs.existsSync(path.join(dir, "Object_HighMath.jsx")), "the old single bundle is removed");
const tabKeys = new Set(), seen = new Set();
for (const [file, [title, engines]] of Object.entries(bundles)) {
  const source = fs.readFileSync(path.join(dir, file), "utf8");
  const list = source.match(/var engines = \[([^\]]*)\];/);   // node 쪽 검사라 match를 써도 된다
  assert.ok(list, file + ": engines list");
  assert.deepStrictEqual(list[1].split(",").map((s) => s.trim()), engines.map((e) => `make${e}Engine()`), file + ": engine order");
  const defined = (source.match(/\n    function make(\w+)Engine\(/g) || []).map((s) => s.replace(/\n    function make|Engine\(/g, ""));
  assert.deepStrictEqual(defined.sort(), engines.slice().sort(), file + ": only its own engines are defined");
  for (const e of engines) { assert.ok(!seen.has(e), e + " appears once"); seen.add(e); }
  const key = source.match(/var TAB_PREF_KEY = "([^"]+)";/)[1];
  assert.ok(!tabKeys.has(key), file + ": unique tab key");
  tabKeys.add(key);
  assert.ok(source.includes(`new Window("dialog", "${title}")`), file + ": window title");
  assert.ok(source.indexOf("illu_last_script.txt") < source.indexOf("(function() {"), file + ": last-script memo at the top");
  assert.ok(source.includes("ui_tab_helper.jsxinc") && source.includes("bindTabOrder(win)"), file + ": tab order helper");
  // addRows는 컨트롤을 만든 뒤 return null로 끝난다. 그 뒤에 선언한 var 상수는 값이 들어가지 않아(호이스팅만 된다) 실행 중 undefined가 된다
  for (const engine of source.split(/\n    function make\w+Engine\(/).slice(1)) {
    const after = engine.slice(engine.indexOf("            return null;"));
    const late = after.match(/\n            var [A-Za-z_]\w* =/g);
    assert.ok(engine.includes("            return null;") && !late, file + ": constant declared after return null: " + late);
  }
}
assert.strictEqual(seen.size, 20);
console.log("high-school bundle checks passed");
