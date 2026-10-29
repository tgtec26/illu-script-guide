const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint.js");

const root = path.resolve(__dirname, "..");
// 확률과 통계 묶음의 "파스칼 삼각형" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "확률과 통계.jsx"), "utf8");
function cut(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing: ${name}`);
  let depth = 0;
  for (let index = text.indexOf("{", start); index < text.length; index++) {
    if (text[index] === "{") depth++;
    if (text[index] === "}" && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`unbalanced: ${name}`);
}
const source = cut(bundle, "makePascalEngine");
const extractFunction = (name) => cut(source, name);

es3Lint(source, "확률과 통계.jsx 파스칼 삼각형 탭");
assert.ok(bundle.includes("makeTableEngine(), makePascalEngine()]"), "탭 목록 끝에 파스칼 삼각형 (저장된 탭 번호가 그대로)");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");

const names = ["buildPascal", "parseCells"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const base = { rows: 5, content: 0, shade: [], blank: [], cellW: 20, cellH: 16 };

// 웹 math-pascal.test.js와 같은 경우
{
  const d = g.buildPascal(base);
  assert.strictEqual(d.texts.length, 15);
  assert.deepStrictEqual(d.texts.filter((t) => t.at[1] === -4 * 16).map((t) => t.text), ["1", "4", "6", "4", "1"]);
  assert.deepStrictEqual(d.texts[0], { text: "1", at: [0, 0] });
  const c = g.buildPascal(Object.assign({}, base, { content: 1 }));
  assert.deepStrictEqual(c.texts.find((t) => t.text === "4C2").sub, [0, 2]);
  assert.deepStrictEqual(g.parseCells("3:1", 5), [{ n: 3, r: 1 }]);
  assert.strictEqual(g.parseCells("r=1", 4).length, 3);
  assert.strictEqual(g.parseCells("n=2", 4).length, 3);
  assert.strictEqual(g.parseCells("3:1, 4:2; n=1", 6).length, 4);
  for (const bad of ["9:1", "2:3", "x", "r=9", "3:", "n=-1"]) assert.strictEqual(g.parseCells(bad, 5), null, bad);
  const s = g.buildPascal(Object.assign({}, base, { shade: g.parseCells("3:1, r=0", 5), blank: g.parseCells("2:1", 5) }));
  assert.strictEqual(s.fills.length, 6);
  assert.strictEqual(s.texts.length, 14);
  assert.strictEqual(s.boxes.length, 1);
  const f = s.fills[0];
  assert.deepStrictEqual([(f[0][0] + f[2][0]) / 2, (f[0][1] + f[2][1]) / 2], [-10, -48]);
}

// 웹과 글자 그대로 같다 (들여쓰기만 다르다)
const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-pascal.js");
if (fs.existsSync(webPath)) {
  const web = fs.readFileSync(webPath, "utf8").replace(/^export function /gm, "function ");
  for (const name of names) {
    const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
    assert.strictEqual(scriptText, cut(web, name), name + " differs from the web");
  }
}

// 설정 v2 저장·복원 (음영 색을 더해 13칸, v1 12칸도 읽는다)
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const prelude = `var PREF_KEY = "T", POSITION_LIMIT_MM = 100, CONTENT_NAMES = ["a", "b"];
    var shadeTone = 0, rows = 6, content = 0, shadeText = "", blankText = "", shadeK = 15, cellWmm = 10, cellHmm = 8, fontPt = 8, offsetXmm = 0, offsetYmm = 0, previewEnabled = true; function saveLineWidths() {} function shadeTones() { return [0, 1, 2, 3, 4, 5, 6]; }`;
  const body = prelude + ["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction).join("\n") +
    `return { saveSettings, applySettings, set: function() { rows = 9; content = 1; shadeText = "r=2, 3:1"; blankText = "4:2"; shadeK = 30; shadeTone = 5; },
      get: function() { return [rows, content, shadeText, blankText, shadeK, shadeTone]; } };`;
  const make = () => new Function("app", body)(app);
  const first = make(); first.set(); first.saveSettings();
  assert.strictEqual(store.T.split("|").length, 13);
  assert.strictEqual(store.T.split("|")[0], "v2");
  const again = make(); again.applySettings();
  assert.deepStrictEqual(again.get(), [9, 1, "r=2, 3:1", "4:2", 30, 5]);
  store.T = store.T.split("|").slice(0, 12).join("|").replace(/^v2/, "v1");
  const old = make(); old.applySettings();
  assert.deepStrictEqual(old.get(), [9, 1, "r=2, 3:1", "4:2", 30, 0], "v1은 음영 색만 처음 값으로");
}
console.log("pascal checks passed");
