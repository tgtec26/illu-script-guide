const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint.js");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(공통수학.jsx)의 "대응 그림" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "공통수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeMappingEngine(");
  assert.ok(start >= 0, "missing engine: makeMappingEngine");
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

es3Lint(source, "공통수학.jsx 대응 탭");
assert.ok(bundle.includes("makeRationalEngine(), makeMappingEngine()"), "탭 목록 끝에 대응 그림 (저장된 탭 번호가 그대로)");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");

const names = ["buildMapping", "textWidth", "parseElements", "parsePairs"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const base = { spacing: 17, gap: 68, fontPt: 8, dotRadius: 1.7, head: { length: 3.6, notch: 0.9 } };

// 읽기 (웹 math-mapping.test.js와 같은 경우)
assert.deepStrictEqual(g.parseElements("1, 2, 3"), ["1", "2", "3"]);
assert.strictEqual(g.parseElements("1, 1"), null);
assert.deepStrictEqual(g.parsePairs("1>b, 3<c", ["1", "2", "3"], ["a", "b", "c"]), [{ from: 0, to: 1, back: false }, { from: 2, to: 2, back: true }]);
assert.strictEqual(g.parsePairs("1>d", ["1"], ["a"]), null);

// 두 집합: 글자 방향, 치역 타원
{
  const sets = [{ name: "X", elements: ["1", "2", "3"] }, { name: "Y", elements: ["a", "b", "c"] }];
  const d = g.buildMapping({ ...base, sets, maps: [[{ from: 0, to: 1, back: false }, { from: 1, to: 2, back: false }]], names: [], under: ["정의역", "공역"], range: true });
  assert.deepStrictEqual(d.texts.find((t) => t.text === "1").dir, [-1, 0]);
  assert.deepStrictEqual(d.texts.find((t) => t.text === "a").dir, [1, 0]);
  assert.strictEqual(d.heads.length, 2);
  assert.strictEqual(d.fills.length, 1);
  assert.ok(d.fills[0].center[1] < 0);
}
// 세 집합: 가운데 집합에서 나가는 화살표는 글자 뒤에서, 위 화살표·합성 곡선
{
  const sets = [{ name: "X", elements: ["x"] }, { name: "Y", elements: ["f(x)"] }, { name: "Z", elements: ["g(f(x))"] }];
  const d = g.buildMapping({ ...base, sets, maps: [[{ from: 0, to: 0, back: false }], [{ from: 0, to: 0, back: false }]], names: ["f", "g"], composite: "g∘f", under: [] });
  assert.strictEqual(d.heads.length, 5);
  assert.ok(d.lines.some((l) => l.curve));
  assert.ok(d.lines[1].points[0][0] > d.texts.find((t) => t.text === "f(x)").at[0] + 8 * 0.55 * 4);
}

// 웹과 글자 그대로 같다 (들여쓰기만 다르다)
const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-mapping.js");
if (fs.existsSync(webPath)) {
  const web = fs.readFileSync(webPath, "utf8");
  for (const name of names) {
    const key = web.includes(`export function ${name}(`) ? `export function ${name}(` : `function ${name}(`;
    const start = web.indexOf(key), end = web.indexOf("\n}\n", start) + 2;
    const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
    assert.strictEqual(scriptText, web.slice(start, end).replace("export function", "function"), name + " differs from the web");
  }
}

// 설정 v1 저장·복원
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const prelude = `var PREF_KEY = "T", POSITION_LIMIT_MM = 100;
    var setNames = "X, Y", elementTexts = ["1, 2, 3", "a, b, c", ""], pairTexts = ["1>a", ""], functionNames = "", composite = "", underText = "", showRange = false,
    spacingMm = 6, gapMm = 22, fontPt = 8, offsetXmm = 0, offsetYmm = 0, previewEnabled = true; function saveLineWidths() {}`;
  const body = prelude + ["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction).join("\n") +
    `return { saveSettings, applySettings, set: function() { setNames = "X, Y, Z"; elementTexts = ["x", "f(x)", "g(f(x))"]; pairTexts = ["x>f(x)", "f(x)>g(f(x))"]; functionNames = "f, g"; composite = "g∘f"; underText = "정의역|공역"; showRange = true; gapMm = 30; },
      get: function() { return [setNames, elementTexts.join("/"), pairTexts.join("/"), functionNames, composite, underText, showRange, gapMm]; } };`;
  const make = () => new Function("app", body)(app);
  const first = make(); first.set(); first.saveSettings();
  assert.strictEqual(store.T.split("|").length, 17);
  const again = make(); again.applySettings();
  assert.deepStrictEqual(again.get(), ["X, Y, Z", "x/f(x)/g(f(x))", "x>f(x)/f(x)>g(f(x))", "f, g", "g∘f", "정의역|공역", true, 30]);
}
console.log("mapping checks passed");
