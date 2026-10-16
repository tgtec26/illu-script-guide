// DNA 모형 '염기 서열' 탭: 아미노산 서열 → 코돈 → DNA·RNA 서열의 순수 계산을 검사한다
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const file = fs.readFileSync(path.join(root, "스크립트", "03_생명과학", "DNA 모형.jsx"), "utf8");
const source = file.slice(file.indexOf("function makeSequenceEngine("));

function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}
const names = ["codonTable", "aminoList", "findAmino", "oneLetter", "parseAminoAcids", "buildStrands", "parseCodonRange",
  "splitNames", "bracePoints", "complement"];
const g = new Function(`${names.map(extract).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

// 유전 부호: 64개 코돈이 하나씩만 나오고, 모두 U·C·A·G 세 글자
{
  const table = g.codonTable();
  const all = [].concat(...Object.keys(table).map((aa) => table[aa]));
  assert.strictEqual(all.length, 64);
  assert.strictEqual(new Set(all).size, 64);
  assert.ok(all.every((codon) => /^[UCAG]{3}$/.test(codon)));
  assert.strictEqual(Object.keys(table).length, 21);
  assert.deepStrictEqual(table.Met, ["AUG"]);
  assert.deepStrictEqual(table.Stop, ["UAA", "UAG", "UGA"]);
  assert.strictEqual(table.Leu.length, 6);
  // 아미노산 목록의 코드와 표가 같다
  assert.deepStrictEqual(g.aminoList().map((a) => a.code).sort(), Object.keys(table).sort());
}

// 아미노산 읽기: 3글자·1글자·한글 이름, 구분자
{
  const codes = (text) => g.parseAminoAcids(text).list;
  assert.deepStrictEqual(codes("Gly Arg Glu"), ["Gly", "Arg", "Glu"]);
  assert.deepStrictEqual(codes("GRE"), ["Gly", "Arg", "Glu"]);
  assert.deepStrictEqual(codes("gly-arg,glu"), ["Gly", "Arg", "Glu"]);
  assert.deepStrictEqual(codes("글리신 아르지닌 글루탐산"), ["Gly", "Arg", "Glu"]);
  assert.deepStrictEqual(codes("메싸이오닌→세린→Gly"), ["Met", "Ser", "Gly"]);
  assert.deepStrictEqual(codes("MSG*"), ["Met", "Ser", "Gly", "Stop"]);
  assert.deepStrictEqual(codes("Met Stop"), ["Met", "Stop"]);
  assert.deepStrictEqual(codes("종결"), ["Stop"]);
  assert.deepStrictEqual(codes("ALA"), ["Ala"], "세 글자 약어는 낱글자로 쪼개지 않는다");
  assert.deepStrictEqual(codes("   "), []);
  assert.deepStrictEqual(codes(""), []);
  assert.strictEqual(g.parseAminoAcids("MXG").error, "알 수 없는 아미노산: MXG");
  assert.strictEqual(g.parseAminoAcids("Gly 프로").error, "알 수 없는 아미노산: 프로");
  assert.strictEqual(g.parseAminoAcids("Gly Arg").error, null);
}

// 가닥 만들기: 첨부 그림(주형이 위 가닥)과 같은 결과
{
  const top = g.buildStrands(["GGA", "CGU", "GAA"], true);
  assert.strictEqual(top.rna, "GGACGUGAA");
  assert.strictEqual(top.coding, "GGACGTGAA");
  assert.strictEqual(top.dna1, "CCTGCACTT", "위 가닥이 주형");
  assert.strictEqual(top.dna2, "GGACGTGAA", "아래 가닥은 RNA와 같은 서열(T)");
  const bottom = g.buildStrands(["GGA", "CGU", "GAA"], false);
  assert.strictEqual(bottom.dna1, "GGACGTGAA");
  assert.strictEqual(bottom.dna2, "CCTGCACTT");
  assert.strictEqual(bottom.rna, top.rna);
  assert.strictEqual(g.complement("GGAGCACTT"), "CCTCGTGAA");
}

// 가릴 코돈 번호
{
  assert.strictEqual(g.parseCodonRange("", 3), null);
  assert.strictEqual(g.parseCodonRange("  ", 3), null);
  assert.deepStrictEqual(g.parseCodonRange("1", 3), {from: 1, to: 1, error: false});
  assert.deepStrictEqual(g.parseCodonRange("2-3", 3), {from: 2, to: 3, error: false});
  assert.deepStrictEqual(g.parseCodonRange("2 ~ 3", 3), {from: 2, to: 3, error: false});
  assert.deepStrictEqual(g.parseCodonRange("2–3", 3), {from: 2, to: 3, error: false});
  for (const bad of ["0", "4", "3-2", "1-4", "a", "1-", "1,2", "-1"]) {
    assert.strictEqual(g.parseCodonRange(bad, 3).error, true, bad);
  }
}

// 줄 이름
assert.deepStrictEqual(g.splitNames("DNA, RNA, (가), 단백질", 4), ["DNA", "RNA", "(가)", "단백질"]);
assert.deepStrictEqual(g.splitNames("DNA,,", 4), ["DNA", "", "", ""]);
assert.deepStrictEqual(g.splitNames("", 4), ["", "", "", ""]);

// 중괄호: 앵커 7개, 좌우 대칭, 뾰족한 끝은 가운데 아래
{
  const pts = g.bracePoints(10, 30, 100, 8);
  assert.strictEqual(pts.length, 7);
  near(pts[3].anchor[0], 20, "tip x");
  near(pts[3].anchor[1], 92, "tip y = top - height");
  near(pts[0].anchor[0], 10, "left end");
  near(pts[6].anchor[0], 30, "right end");
  for (let i = 0; i < 7; i++) {
    near(pts[i].anchor[0] + pts[6 - i].anchor[0], 40, `mirror x ${i}`);
    near(pts[i].anchor[1], pts[6 - i].anchor[1], `mirror y ${i}`);
  }
  // 너비가 좁으면 높이가 줄어 앵커가 가로로 겹치지 않는다
  const narrow = g.bracePoints(0, 4, 0, 8);
  near(narrow[3].anchor[1], -2, "narrow brace depth = width / 2");
  assert.ok(narrow[2].anchor[0] >= narrow[1].anchor[0] - 1e-9, "shoulders stay ordered");
}

// 설정 문자열: v2, 26칸. 저장 칸 수와 읽는 칸 수가 같다
{
  assert.ok(source.includes('p[0] !== "v2" || p.length !== 26'), "settings string must be v2 with 26 fields");
  assert.strictEqual((source.match(/join\("\|"\)/g) || []).length, 1, "one saveSettings join");
  const keys = source.match(/var NUMBER_KEYS = \[([^\]]*)\]/)[1].split(",").length;
  assert.strictEqual(keys, 11);
  // 읽기 전에 써야 하는 상수가 readSettings 호출(var options = readSettings();)보다 위에 있다
  const call = source.indexOf("var options = readSettings();");
  for (const name of ["NUMBER_KEYS", "NUMBER_MINS", "NUMBER_MAXS", "MAX_AMINO", "PROTEIN_CHOICES"]) {
    assert.ok(source.indexOf(`var ${name} =`) < call, `${name} must be declared before readSettings()`);
  }
}

console.log("check-dna-sequence ok");
