const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_Karyotype.jsx");
assert.ok(fs.existsSync(scriptPath), "Object_Karyotype.jsx must exist");
const source = fs.readFileSync(scriptPath, "utf8");

// 순수 기하 구간만 꺼내 Node에서 돌린다 (일러 DOM 없이)
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝 ====");
assert.ok(start > 0 && end > start, "pure geometry markers not found");
const core = new Function(`${source.slice(start, end)}
return { KARYO_ORDER, KARYO_DATA, SHAPE_STYLES, parseChromList, chromCopies, chromVariant, effectiveSex,
  buildCells, chromGeom, chromOutline, chromBands, chromWidth, layoutKaryotype };`)();

function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
}

// ---- 표시 목록 파서
const ALL = core.KARYO_ORDER;
assert.strictEqual(ALL.length, 24);
assert.deepStrictEqual(core.parseChromList("").ids, []);
assert.deepStrictEqual(core.parseChromList("1, 2, 3~8, X, Y").ids, ["1", "2", "3", "4", "5", "6", "7", "8", "X", "Y"]);
assert.deepStrictEqual(core.parseChromList("8~3").ids, ["3", "4", "5", "6", "7", "8"], "reversed range");
assert.deepStrictEqual(core.parseChromList("22~X").ids, ["22", "X"]);
assert.deepStrictEqual(core.parseChromList("x, y，21～22").ids, ["21", "22", "X", "Y"], "full-width comma and tilde");
assert.deepStrictEqual(core.parseChromList("1-3").ids, ["1", "2", "3"]);
assert.deepStrictEqual(core.parseChromList("2, 2, 1").ids, ["1", "2"], "unique and ordered");
const bad = core.parseChromList("1, abc, 23, 0, 3~z");
assert.deepStrictEqual(bad.ids, ["1"]);
assert.deepStrictEqual(bad.bad, ["abc", "23", "0", "3~z"]);

// ---- 개수와 변이
assert.strictEqual(core.chromCopies("1", "normal", "M"), 2);
assert.strictEqual(core.chromCopies("X", "normal", "M"), 1);
assert.strictEqual(core.chromCopies("Y", "normal", "M"), 1);
assert.strictEqual(core.chromCopies("X", "normal", "F"), 2);
assert.strictEqual(core.chromCopies("Y", "normal", "F"), 0);
assert.strictEqual(core.chromCopies("21", "down", "F"), 3);
assert.strictEqual(core.chromCopies("20", "down", "F"), 2);
assert.strictEqual(core.chromCopies("X", "klinefelter", "F"), 2, "klinefelter is XXY regardless of the sex radio");
assert.strictEqual(core.chromCopies("Y", "klinefelter", "F"), 1);
assert.strictEqual(core.chromCopies("X", "turner", "M"), 1, "turner is X0 regardless of the sex radio");
assert.strictEqual(core.chromCopies("Y", "turner", "M"), 0);
assert.strictEqual(core.chromVariant("5", "cridu", 0), "");
assert.strictEqual(core.chromVariant("5", "cridu", 1), "del5p");
assert.strictEqual(core.chromVariant("5", "normal", 1), "");

// ---- 데버 배치
function layoutMap(rows) {
  const map = {};
  rows.forEach((row, r) => row.forEach((cell) => { (map[cell.id] = map[cell.id] || []).push({ row: r, col: cell.col, n: cell.variants.length }); }));
  return map;
}
const male = layoutMap(core.buildCells(ALL, "normal", "M"));
assert.strictEqual(core.buildCells(ALL, "normal", "M").length, 4);
const expectedCols = { "1": [0, 0], "2": [0, 1], "3": [0, 2], "4": [0, 5], "5": [0, 6], "6": [1, 0], "12": [1, 6],
  "13": [2, 0], "15": [2, 2], "16": [2, 4], "18": [2, 6], "19": [3, 0], "20": [3, 1], "X": [3, 5], "Y": [3, 6] };
Object.keys(expectedCols).forEach((id) => {
  assert.strictEqual(male[id][0].row, expectedCols[id][0], `row of ${id}`);
  close(male[id][0].col, expectedCols[id][1], 0.0001, `col of ${id}`);
});
assert.strictEqual(male["1"][0].n, 2, "autosomes share one cell for the homologous pair");
assert.strictEqual(male["X"][0].n, 1);
const female = layoutMap(core.buildCells(ALL, "normal", "F"));
assert.strictEqual(female["X"].length, 2, "female XX uses two cells with their own labels");
assert.ok(!female["Y"]);
const down = layoutMap(core.buildCells(["21"], "down", "M"));
assert.strictEqual(down["21"][0].n, 3);
assert.deepStrictEqual(core.buildCells(["21"], "normal", "M").map((row) => row.length), [1]);
// 부분 선택은 빈 줄 없이 앞에서부터 채운다
const subset = core.buildCells(["1", "2", "6", "X", "Y"], "normal", "M");
assert.strictEqual(subset.length, 3);
assert.strictEqual(subset[0][0].col, 0);
assert.strictEqual(subset[1][0].col, 0);
assert.strictEqual(subset[2][0].col, 0);
assert.strictEqual(subset[2][1].col, 1);
assert.strictEqual(core.buildCells(["Y"], "normal", "F").length, 0, "no Y in a female karyotype");

// ---- 데이터: UCSC hg38 값과 밴드 문자열
assert.strictEqual(Object.keys(core.KARYO_DATA).length, 24);
close(core.KARYO_DATA["1"][0], 248.96, 0.001, "chr1 length");
close(core.KARYO_DATA["1"][1], 123.4, 0.001, "chr1 centromere");
close(core.KARYO_DATA["Y"][0], 57.23, 0.001, "chrY length");
const ACRO = ["13", "14", "15", "21", "22"];
ALL.forEach((id) => {
  const d = core.KARYO_DATA[id];
  assert.ok(/^[0-7]+$/.test(d[2]) && /^[0-7]+$/.test(d[3]), `band string of ${id}`);
  assert.ok(d[1] > 0 && d[1] < d[0], `centromere inside ${id}`);
  assert.strictEqual(d[2].indexOf("6") >= 0, ACRO.indexOf(id) >= 0, `stalk only on acrocentric p arms: ${id}`);
});
// 길이 순서(데버 번호)가 크게 어긋나지 않는다: 큰 묶음 > 작은 묶음
assert.ok(core.KARYO_DATA["1"][0] > core.KARYO_DATA["2"][0] && core.KARYO_DATA["2"][0] > core.KARYO_DATA["3"][0]);
assert.ok(core.KARYO_DATA["X"][0] > core.KARYO_DATA["8"][0] && core.KARYO_DATA["Y"][0] < core.KARYO_DATA["16"][0]);

// ---- 기하: p/q 비율은 데이터 그대로, 외곽선은 닫힌 도형
const base = { style: 2, wc: 7, chromatids: 1, splay: 0, gap: 0.8 };
const g1 = core.chromGeom("1", "", base);
close(g1.T, 100, 0.0001, "chr1 length = 100 units");
close(g1.pLen / g1.T, 123.4 / 248.96, 0.0001, "chr1 p ratio");
const g13 = core.chromGeom("13", "", base);
close(g13.pLen / g13.T, 17.7 / 114.36, 0.0001, "chr13 p ratio");
assert.ok(g13.stalk && g13.stalk[0] > 0 && g13.stalk[1] < g13.pLen, "chr13 has a stalk inside the p arm");
assert.strictEqual(core.chromGeom("1", "", base).stalk, null);

const del = core.chromGeom("5", "del5p", base);
const full5 = core.chromGeom("5", "", base);
assert.ok(del.pLen < full5.pLen * 0.75 && del.pLen > full5.pLen * 0.55, "5p- loses about p15.2-pter (15 of 48.8 Mb)");
close(del.qLen, full5.qLen, 0.0001, "5p- keeps the q arm");

for (let style = 0; style < 3; style++) {
  for (let chromatids = 1; chromatids <= 2; chromatids++) {
    const o = { style, wc: 7, chromatids, splay: 4, gap: 0.8 };
    ALL.forEach((id) => {
      const g = core.chromGeom(id, "", o);
      [-1, 1].forEach((sign) => {
        const pts = core.chromOutline(g, o, sign);
        assert.ok(pts.length > 20, `outline of ${id} has points`);
        let area = 0;
        pts.forEach((p, i) => {
          assert.ok(isFinite(p[0]) && isFinite(p[1]), `finite point in ${id}`);
          assert.ok(p[1] >= -0.0001 && p[1] <= g.T + 0.0001, `y inside the chromosome ${id}`);
          const q = pts[(i + 1) % pts.length];
          area += p[0] * q[1] - q[0] * p[1];
        });
        assert.ok(Math.abs(area) > 1, `outline of ${id} encloses an area`);
      });
      const w = core.chromWidth(g, o);
      assert.ok(w >= 7 - 0.01 && w < 60, `width of ${id} (${w})`);
      core.chromBands(g).forEach((b) => {
        assert.ok(b.y0 >= -0.0001 && b.y1 <= g.T + 0.0001 && b.y1 > b.y0 && b.lev >= 1 && b.lev <= 5, `band of ${id}`);
      });
    });
  }
}
// 분체 둘은 같은 모양의 거울상이다
{
  const o = { style: 2, wc: 7, chromatids: 2, splay: 0, gap: 0.8 };
  const g = core.chromGeom("7", "", o);
  const left = core.chromOutline(g, o, -1);
  const right = core.chromOutline(g, o, 1);
  const lMin = Math.min(...left.map((p) => p[0])), lMax = Math.max(...left.map((p) => p[0]));
  const rMin = Math.min(...right.map((p) => p[0])), rMax = Math.max(...right.map((p) => p[0]));
  close(lMin, -rMax, 0.0001, "mirror min/max");
  close(lMax, -rMin, 0.0001, "mirror max/min");
  assert.ok(lMax > 0 || rMin < 0, "sister chromatids touch or overlap at the centromere");
}
// 밴드 단계가 모두 쓰이는 염색체가 있다 (G 밴드 패턴이 비어 있지 않다)
{
  const levels = {};
  ALL.forEach((id) => core.chromBands(core.chromGeom(id, "", base)).forEach((b) => { levels[b.lev] = true; }));
  assert.deepStrictEqual(Object.keys(levels).sort(), ["1", "2", "3", "4", "5"]);
}

// ---- 사각형 맞춤 배치: 모든 염색체가 여백 안에 있고 겹치지 않는다
[[520, 380], [300, 300], [200, 420], [700, 180]].forEach(([W, H]) => {
  [["normal", "M"], ["down", "F"], ["klinefelter", "M"], ["turner", "F"], ["cridu", "F"]].forEach(([kary, sex]) => {
    [1, 2].forEach((chromatids) => {
      const o = { style: 2, wc: 7, chromatids, splay: 3, gap: 0.8, pairGap: 3, labelGap: 4, fontSize: 8, margin: 10 };
      const rows = core.buildCells(ALL, kary, sex);
      const lay = core.layoutKaryotype(rows, o, W, H);
      assert.ok(lay.s > 0, "positive scale");
      const spans = {};
      lay.cells.forEach((cell) => {
        assert.ok(cell.labelBase > cell.bottom + o.labelGap, "label under the chromosome");
        assert.ok(cell.labelBase <= H - o.margin + 0.01, `label inside the margin (${W}x${H} ${kary} ${chromatids}): ${cell.labelBase}`);
        cell.items.forEach((it) => {
          const g = core.chromGeom(cell.id, it.variant, o);
          const half = core.chromWidth(g, o) * lay.s / 2;
          assert.ok(it.x - half >= o.margin - 0.01 && it.x + half <= W - o.margin + 0.01, `x inside the margin (${W}x${H} ${kary}): ${it.x}`);
          assert.ok(cell.bottom - g.T * lay.s >= o.margin - 0.01, "top inside the margin");
          const key = Math.round(cell.bottom);
          (spans[key] = spans[key] || []).push([it.x - half, it.x + half]);
        });
      });
      Object.keys(spans).forEach((key) => {
        const list = spans[key].sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1] - 0.01, `no overlap in a row (${W}x${H} ${kary} ${chromatids})`);
      });
    });
  });
});
// 한 칸(21번 삼염색체)도 가운데에 놓인다
{
  const o = { style: 1, wc: 7, chromatids: 2, splay: 0, gap: 0.8, pairGap: 3, labelGap: 4, fontSize: 8, margin: 10 };
  const lay = core.layoutKaryotype(core.buildCells(["21"], "down", "F"), o, 300, 200);
  assert.strictEqual(lay.cells.length, 1);
  close(lay.cells[0].cx, 150, 0.0001, "single cell centred horizontally");
  assert.strictEqual(lay.cells[0].items.length, 3);
}

// ---- 스크립트 규약 (AGENTS.md)
assert.ok(source.indexOf('var SETTINGS_TAG = "v1"') < source.indexOf("readSettings();"), "settings constants before readSettings()");
assert.ok(/p\.length !== SETTINGS_LENGTH/.test(source), "settings length check");
assert.strictEqual(source.split("saveSettings();").length - 1, 1, "saveSettings is called only on confirm");
assert.ok(/okButton\.onClick = function\(\) \{[^}]*saveSettings\(\);/.test(source), "settings saved in the OK handler");
assert.ok(source.indexOf("dlg.defaultElement = null") > 0, "enter must not run the script");
assert.ok(source.indexOf("bindTabOrder(dlg)") > 0 && source.indexOf("ui_tab_helper.jsxinc") > 0, "tab order helper");
assert.ok(source.indexOf("illu_last_script.txt") > 0, "last-script memo");
assert.ok(source.indexOf('"scrollbar"') > 0 && source.indexOf("stepdelta") > 0, "scrollbar rows");
assert.ok(source.indexOf("movePreview(offsetXmm * MM, offsetYmm * MM)") > 0, "movable preview");
assert.ok(source.indexOf("path.rotate(0 - path.fillColor.angle, false, false, true, false, Transformation.CENTER)") > 0, "gradient angle read back");
assert.ok(source.indexOf("ENG_FONT_NAME") > 0 && source.indexOf("GSMediumB1") > 0, "label font rule");
// ExtendScript 함정: 게으른 정규식, /= 로 시작하는 정규식 리터럴
assert.ok(!/\.match\(/.test(source) && !/\(\.\+\?\)/.test(source), "no lazy regex in input parsing");
assert.ok(!/\/=/.test(source.replace(/\/\/.*$/gm, "")), "no regex literal that starts with /=");
// 클리핑 마스크는 경로여야 하고 마스크는 그룹의 맨 위여야 한다
assert.ok(source.indexOf("box.clipped = true") > source.indexOf("base.duplicate(box, ElementPlacement.PLACEATBEGINNING)"), "mask duplicated before clipping");

console.log("karyotype checks passed");
