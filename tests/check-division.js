const fs = require("fs");
const path = require("path");
const assert = require("assert");
const es3Lint = require("./es3-lint.js");

const root = path.resolve(__dirname, "..");
// 공통수학 묶음(공통수학.jsx)의 "세로셈" 탭 엔진만 잘라 읽는다
const bundle = fs.readFileSync(path.join(root, "스크립트", "05_수학", "공통수학.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeDivisionEngine(");
  assert.ok(start >= 0, "missing engine: makeDivisionEngine");
  let depth = 0;
  for (let index = bundle.indexOf("{", start); index < bundle.length; index++) {
    if (bundle[index] === "{") depth++;
    if (bundle[index] === "}" && --depth === 0) return bundle.slice(start, index + 1);
  }
  throw new Error("unbalanced engine");
})();

function cut(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let index = text.indexOf("{", start); index < text.length; index++) {
    if (text[index] === "{") depth++;
    if (text[index] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced helper: ${name}`);
}
const extractFunction = (name) => cut(source, name);

es3Lint(source, "공통수학.jsx 세로셈 탭");
assert.ok(bundle.includes("makeMappingEngine(), makeDivisionEngine()]"), "탭 목록 끝에 세로셈 (저장된 탭 번호가 그대로)");
assert.ok(!/\.match\(/.test(source), "no whole-pattern regex match (ExtendScript can hang)");

const names = ["buildDivision", "display", "textWidth", "planSynthetic", "syntheticDivision", "parseRoot", "parseCoefficients", "planLadder", "parseIntegers", "gcd",
  "planLong", "addPolyRow", "polyDivide", "trimPoly", "parsePoly", "termText", "polyText", "rat", "ratZero", "ratAdd", "ratSub", "ratMul", "ratDiv", "ratNeg", "ratAbs",
  "parseRational", "parseDecimal", "ratText", "ratFlat", "ratList"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const R = (n, d = 1) => ({ n, d });
const base = { fontPt: 8, cellW: 24, cellH: 20, pad: 8.5, arrowCut: 2.7 };

// 읽기·계산 (웹 math-division.test.js와 같은 경우)
assert.deepStrictEqual(g.parseRational("0.25"), R(1, 4));
assert.strictEqual(g.parseRational("1/0"), null);
assert.strictEqual(g.ratText(R(-1, 2)), "-frac(1,2)");
assert.deepStrictEqual(g.parsePoly("x^3-3x^2+4x-2"), [R(1), R(-3), R(4), R(-2)]);
assert.deepStrictEqual(g.parsePoly("-x+1/2"), [R(-1), R(1, 2)]);
assert.strictEqual(g.parsePoly("x^"), null);
assert.strictEqual(g.parsePoly("y+1"), null);
{
  const s = g.syntheticDivision([R(1), R(-3), R(4), R(-2)], R(2));
  assert.deepStrictEqual(s.bottom, [R(1), R(-1), R(2), R(2)]);
  const r = g.polyDivide(g.parsePoly("x^2+x-3"), g.parsePoly("x-1"));
  assert.deepStrictEqual(r.quotient, [R(1), R(2)]);
  assert.deepStrictEqual(r.remainder, [R(-1)]);
}

// 세 방법의 그림
{
  const a = g.buildDivision({ ...base, kind: 0, dividend: "x^3-3x^2+4x-2", divisor: "x-2", answer: true, arrows: true });
  assert.deepStrictEqual(a.notes, ["몫 x^2-x+2, 나머지 2"]);
  assert.strictEqual(a.arrows.length, 3);
  const blank = g.buildDivision({ ...base, kind: 0, dividend: "x^3-3x^2+4x-2", divisor: "x-2", answer: false, arrows: true });
  assert.strictEqual(blank.texts.length, 5);
  assert.ok(blank.lines.filter((l) => l.points.length === 5).length >= 7);
  assert.ok(g.buildDivision({ ...base, kind: 0, dividend: "x^2", divisor: "2x-1", answer: true }).notes[0].includes("x−a"));

  const l = g.buildDivision({ ...base, kind: 1, dividend: "12, 18", divisor: "2, 3", answer: true });
  assert.deepStrictEqual(l.notes, ["최대공약수 2×3 = 6, 최소공배수 6×2×3 = 36"]);
  assert.ok(g.buildDivision({ ...base, kind: 1, dividend: "12, 18", divisor: "5", answer: true }).notes[0].includes("나누어떨어지지"));

  const p = g.buildDivision({ ...base, kind: 2, dividend: "x^2+x-3", divisor: "x-1", answer: true });
  assert.deepStrictEqual(p.notes, ["몫 x+2, 나머지 -1"]);
  const t = p.texts.map((x) => x.text);
  for (const s of ["x-1", "x^2", "+ x", "- 3", "x", "+ 2", "- x", "2x", "- 1"]) assert.ok(t.includes(s), s);
  assert.strictEqual(p.lines.filter((q) => q.points.length === 2 && q.points[0][1] === q.points[1][1]).length, 3);
  assert.deepStrictEqual(g.buildDivision({ ...base, kind: 2, dividend: "x^", divisor: "x-1", answer: true }).problems, ["나뉠 식"]);
}

// 분수 계수: x 항은 (1/2)x, 상수항은 쌓은 분수
{
  const d = g.buildDivision({ ...base, kind: 2, dividend: "x^2+1", divisor: "2x-1", answer: true });
  assert.deepStrictEqual(d.notes, ["몫 (1/2)x+1/4, 나머지 5/4"]);
  const t = d.texts.map((x) => x.text);
  for (const s of ["(1/2)x", "+ frac(1,4)", "frac(5,4)", "- frac(1,4)", "- (1/2)x"]) assert.ok(t.includes(s), s);
}

// 위첨자: 부호 뒤 띄움을 지키고 첨자 위치는 그만큼 민다
assert.deepStrictEqual(g.display("- 3x^2"), { text: "- 3x2", sup: [4] });
assert.deepStrictEqual(g.display("x^10"), { text: "x10", sup: [1, 2] });

// 웹과 글자 그대로 같다 (들여쓰기만 다르다)
const webPath = path.join(root, "..", "sci-illu-web", "src", "generators", "math-division.js");
if (fs.existsSync(webPath)) {
  const web = fs.readFileSync(webPath, "utf8").replace(/^export function /gm, "function ");
  for (const name of names) {
    const scriptText = extractFunction(name).split("\n").map((line) => line.replace(/^ {12}/, "").replace(/^ +/, (lead) => " ".repeat(lead.length / 2))).join("\n");
    assert.strictEqual(scriptText, cut(web, name), name + " differs from the web");
  }
}

// 설정 v1 저장·복원
{
  const store = {};
  const app = { preferences: { getStringPreference: (k) => store[k] || "", setStringPreference: (k, v) => { store[k] = v; } } };
  const prelude = `var PREF_KEY = "T", POSITION_LIMIT_MM = 100;
    var kind = 0, dividendText = "x^3-3x^2+4x-2", divisorText = "x-2", showAnswer = true, showArrows = true,
    cellWmm = 10, cellHmm = 8, fontPt = 8, offsetXmm = 0, offsetYmm = 0, previewEnabled = true; function saveLineWidths() {}`;
  const body = prelude + ["saveSettings", "applySettings", "restoreNumber", "parseNumber", "clamp"].map(extractFunction).join("\n") +
    `return { saveSettings, applySettings, set: function() { kind = 2; dividendText = "2x^3-x^2+3x+1"; divisorText = "x^2+1"; showAnswer = false; showArrows = false; cellWmm = 14; },
      get: function() { return [kind, dividendText, divisorText, showAnswer, showArrows, cellWmm]; } };`;
  const make = () => new Function("app", body)(app);
  const first = make(); first.set(); first.saveSettings();
  assert.strictEqual(store.T.split("|").length, 12);
  const again = make(); again.applySettings();
  assert.deepStrictEqual(again.get(), [2, "2x^3-x^2+3x+1", "x^2+1", false, false, 14]);
}
console.log("division checks passed");
