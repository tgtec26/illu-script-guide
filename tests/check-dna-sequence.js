// 유전 정보 흐름 '유전자 발현' 탭(구 DNA 모형의 염기 서열 탭): 아미노산 서열 → 코돈 → DNA·RNA 서열의 순수 계산을 검사한다
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const file = fs.readFileSync(path.join(root, "스크립트", "03_생명과학", "유전 정보 흐름.jsx"), "utf8");
const source = file.slice(file.indexOf("function makeExpressionEngine("));

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
const names = ["codonTable", "aminoList", "aminoName", "findAmino", "oneLetter", "parseAminoAcids", "buildStrands", "parseBaseRanges",
  "splitNames", "bracePoints", "complement"];
const g = new Function(`${names.map(extract).join("\n")}\nreturn {${names.join(",")}};`)();
// options·mmToPt를 바깥에서 받는 함수들(그리기 쪽 순수 계산)은 가짜 값을 주고 꺼낸다
const boxNames = ["reverseText", "primeEnds", "boxMetrics", "pitchPt", "drawBaseBox"];
function makeBox(options) {
  return new Function("options", "mmToPt", "makeGray", `${boxNames.map(extract).join("\n")}\nreturn {${boxNames.join(",")}};`)(options, 2.83464567, (k) => `K${k}`);
}
function fakeGroup() {
  const paths = [];
  return { paths, pathItems: { add() {
    const path = { pathPoints: [], setEntirePath(a) { this.anchors = a; this.pathPoints = a.map(() => ({})); } };
    paths.push(path);
    return path;
  } } };
}
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

// 한글 이름: 2022 개정 교육과정 유전 부호표 표기를 화면에 쓰고, 다른 표기도 입력으로 받는다
{
  const table = {Phe: "페닐알라닌", Leu: "류신", Ile: "아이소류신", Met: "메싸이오닌", Val: "발린", Ser: "세린", Pro: "프롤린",
    Thr: "트레오닌", Ala: "알라닌", Tyr: "타이로신", His: "히스티딘", Gln: "글루타민", Asn: "아스파라진", Lys: "라이신",
    Asp: "아스파트산", Glu: "글루탐산", Cys: "시스테인", Trp: "트립토판", Arg: "아르지닌", Gly: "글라이신", Stop: "종결코돈"};
  for (const code of Object.keys(table)) {
    assert.strictEqual(g.aminoName(code, true), table[code], code);
    assert.strictEqual(g.aminoName(code, false), code);
    assert.deepStrictEqual(g.parseAminoAcids(table[code]).list, [code], `${table[code]} 입력`);
  }
  assert.deepStrictEqual(g.parseAminoAcids("글리신 아스파라긴 아스파르트산").list, ["Gly", "Asn", "Asp"], "다른 표기도 입력 가능");
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

// 가릴 염기 번호: 왼쪽부터 센 번호, 쉼표로 여러 구간
{
  const list = (text, length) => g.parseBaseRanges(text, length).list;
  assert.strictEqual(g.parseBaseRanges("", 9), null);
  assert.strictEqual(g.parseBaseRanges("  ", 9), null);
  assert.deepStrictEqual(list("1", 9), [{from: 1, to: 1}]);
  assert.deepStrictEqual(list("4-9", 9), [{from: 4, to: 9}]);
  assert.deepStrictEqual(list("1~5, 8~10", 12), [{from: 1, to: 5}, {from: 8, to: 10}]);
  assert.deepStrictEqual(list("2 ~ 3,7", 9), [{from: 2, to: 3}, {from: 7, to: 7}]);
  assert.deepStrictEqual(list("2–3", 9), [{from: 2, to: 3}]);
  assert.strictEqual(g.parseBaseRanges("1~5", 9).error, false);
  for (const bad of ["0", "10", "3-2", "1-10", "a", "1-", "1,,2", "-1", "1~5,", "1~5, 8~10"]) {
    assert.strictEqual(g.parseBaseRanges(bad, bad === "1~5, 8~10" ? 9 : 9).error, true, bad);
  }
}

// 줄 이름
assert.deepStrictEqual(g.splitNames("DNA, (나), RNA, (가), 단백질", 5), ["DNA", "(나)", "RNA", "(가)", "단백질"]);
assert.deepStrictEqual(g.splitNames("DNA, , RNA, (가), 단백질", 5), ["DNA", "", "RNA", "(가)", "단백질"]);
assert.deepStrictEqual(g.splitNames("DNA,,", 5), ["DNA", "", "", "", ""]);
assert.deepStrictEqual(g.splitNames("", 5), ["", "", "", "", ""]);

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

// 설정 문자열: v8, 39칸. 저장 칸 수와 읽는 칸 수가 같다
{
  assert.ok(source.includes('p[0] !== "v8" || p.length !== 39'), "settings string must be v7 with 39 fields");
  assert.strictEqual((source.match(/join\("\|"\)/g) || []).length, 1, "one saveSettings join");
  const keys = source.match(/var NUMBER_KEYS = \[([^\]]*)\]/)[1].split(",").length;
  assert.strictEqual(keys, 11);
  // 저장 칸 수: 태그 1 + 숫자 11 + 표시·글자·목록 등 17 + 덧붙인 숫자 3 + 5′·3′·방향 반전·박스 염기 3 + 박스 숫자 4 = 39
  const extra = source.match(/var EXTRA_KEYS = \[([^\]]*)\]/)[1].split(",").length;
  const boxKeys = source.match(/var BOX_KEYS = \[([^\]]*)\]/)[1].split(",").length;
  assert.strictEqual(1 + keys + 17 + extra + 3 + boxKeys, 39);
    // 저장하는 태그와 읽는 태그가 같아야 저장한 옵션이 복원된다
  assert.ok(source.includes('var parts = ["v8"];'), "saveSettings tag must match readSettings tag");
  // 읽기 전에 써야 하는 상수가 readSettings 호출(var options = readSettings();)보다 위에 있다
  const call = source.indexOf("var options = readSettings();");
  for (const name of ["NUMBER_KEYS", "NUMBER_MINS", "NUMBER_MAXS", "EXTRA_KEYS", "EXTRA_MINS", "EXTRA_MAXS", "BOX_KEYS", "BOX_MINS", "BOX_MAXS", "MAX_AMINO", "PROTEIN_CHOICES"]) {
    assert.ok(source.indexOf(`var ${name} =`) < call, `${name} must be declared before readSettings()`);
  }
}

// 5′·3′ 표시: RNA·코딩 가닥은 왼쪽 5′, 주형 가닥은 왼쪽 3′. 방향 반전이면 모두 바뀐다
{
  const box = makeBox({});
  assert.deepStrictEqual(box.primeEnds(true, false), [["3′", "5′"], ["5′", "3′"], ["5′", "3′"]]);
  assert.deepStrictEqual(box.primeEnds(false, false), [["5′", "3′"], ["3′", "5′"], ["5′", "3′"]]);
  assert.deepStrictEqual(box.primeEnds(true, true), [["5′", "3′"], ["3′", "5′"], ["3′", "5′"]]);
  // 주형 가닥은 늘 RNA와 반대 방향
  for (const top of [true, false]) for (const flip of [false, true]) {
    const e = box.primeEnds(top, flip);
    const template = top ? e[0] : e[1];
    assert.notDeepStrictEqual(template, e[2]);
  }
  assert.strictEqual(box.reverseText("AUGC"), "CGUA");
  assert.strictEqual(box.reverseText(""), "");
}

// 박스 염기: 퓨린(A·G)은 길고 피리미딘(T·C·U)은 짧다. 맞은편 박스와는 끝 모양이 맞물려 틈이 어디서나 박스 간격이다
{
  const opts = { boxWidth: 5.4, purineLen: 12.5, pyrimidineLen: 7, boxGap: 0.6, tickWidth: 0.3, boxBases: true, baseGap: 7 };
  const box = makeBox(opts);
  const mm = 2.83464567;
  const bm = box.boxMetrics();
  near(bm.pitch, 6 * mm, "pitch = 너비 + 간격", 1e-9);
  near(box.pitchPt(), bm.pitch, "pitchPt");
  near(bm.d, 2.7 * mm, "끝 깊이는 너비의 절반");
  near(bm.inner, (12.5 + 7 - 2.7 + 0.6) * mm, "두 골격 사이 = 퓨린 + 피리미딘 - 깊이 + 간격");
  // 너무 짧은 박스에서는 깊이를 줄인다
  const short = makeBox({ boxWidth: 12, purineLen: 3, pyrimidineLen: 2, boxGap: 0, boxBases: true, baseGap: 7 }).boxMetrics();
  near(short.d, 0.8 * 2 * mm, "깊이 상한 = 짧은 길이의 0.8");
  assert.ok(box.pitchPt() !== makeBox({ ...opts, boxBases: false }).pitchPt(), "박스 염기가 아니면 염기 간격");
  near(makeBox({ ...opts, boxBases: false }).pitchPt(), 7 * mm, "염기 간격");

  // 박스 한 칸의 점: 긴 정도, 골격에 붙는 쪽, 끝 모양
  const draw = (base, edgeY, dir) => {
    const group = fakeGroup();
    box.drawBaseBox(group, bm, base, 0, edgeY, dir, "c");
    return group.paths[0];
  };
  const extent = (path) => {
    const ys = path.anchors.map((a) => a[1]);
    return Math.max(...ys) - Math.min(...ys);
  };
  near(extent(draw("A", 0, 1)), bm.lp, "A 길이");
  near(extent(draw("G", 0, 1)), bm.lp, "G 길이");
  near(extent(draw("T", 0, 1)), bm.lq, "T 길이");
  near(extent(draw("C", 0, 1)), bm.lq, "C 길이");
  near(extent(draw("U", 0, 1)), bm.lq, "U 길이(T와 같은 피리미딘)");
  assert.deepStrictEqual(draw("A", 0, 1).anchors.length, 5);
  assert.deepStrictEqual(draw("U", 0, 1).anchors.length, 5);
  // 골격에 붙는 두 점은 edgeY, dir=-1이면 아래로 자란다
  const down = draw("A", 100, -1);
  near(down.anchors[0][1], 100, "골격 가장자리");
  assert.ok(down.anchors[3][1] < 100 - bm.lp + 1e-6 + 1e-9 && down.anchors[3][1] > 100 - bm.lp - 1e-6, "dir -1은 아래로");
  assert.ok(draw("A", 0, 1).closed && draw("C", 0, 1).closed);

  // 자유 끝 가장자리를 가로 위치 x의 높이로 읽는다(베지어를 잘게 나눠 잰다)
  const profile = (path) => {
    const n = path.anchors.length;
    const left = (j) => path.pathPoints[j].leftDirection || path.anchors[j];
    const right = (j) => path.pathPoints[j].rightDirection || path.anchors[j];
    const samples = [];
    for (let j = 2; j < n - 1; j++) {
      const p0 = path.anchors[j], p1 = right(j), p2 = left(j + 1), p3 = path.anchors[j + 1];
      for (let k = 0; k <= 200; k++) {
        const t = k / 200, u = 1 - t;
        samples.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]);
      }
    }
    return (x) => {
      let best = null;
      for (let k = 0; k + 1 < samples.length; k++) {
        const a = samples[k], b = samples[k + 1];
        if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { best = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); break; }
      }
      return best;
    };
  };
  const hw = bm.w / 2;
  for (const [top, bottom] of [["A", "T"], ["T", "A"], ["G", "C"], ["C", "G"], ["A", "U"], ["U", "A"]]) {
    const topY = 500;                                // 위 가닥 골격 가장자리
    const upper = profile(draw(top, topY, -1));      // 아래로 자란다
    const lower = profile(draw(bottom, topY - bm.inner, 1));   // 위로 자란다
    for (let k = -8; k <= 8; k++) {
      const x = hw * k / 9;
      near(upper(x) - lower(x), bm.g, `${top}-${bottom} 틈 x=${x.toFixed(2)}`, 0.02);
    }
  }
}

console.log("check-dna-sequence ok");
