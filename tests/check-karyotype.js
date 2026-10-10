const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "사람의 핵형.jsx");
assert.ok(fs.existsSync(scriptPath), "사람의 핵형.jsx must exist");
const source = fs.readFileSync(scriptPath, "utf8");

// 순수 기하 구간만 꺼내 Node에서 돌린다 (일러 DOM 없이)
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝 ====");
assert.ok(start > 0 && end > start, "pure geometry markers not found");
const core = new Function(`${source.slice(start, end)}
return { KARYO_ORDER, KARYO_DATA, SHAPE_STYLES, parseChromList, chromCopies, chromVariant, effectiveSex,
  buildCells, chromGeom, chromOutline, chromBands, chromWidth, chromAxis, chromHalf, centromereCircles, SPLAY_PRESET, layoutKaryotype };`)();

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

// ---- 데이터: RERF Giemsa 표 2(상대 길이·p:q)와 UCSC hg38 밴드 문자열
assert.strictEqual(Object.keys(core.KARYO_DATA).length, 24);
close(core.KARYO_DATA["1"][0], 9.11, 0.001, "chr1 relative length");
close(core.KARYO_DATA["1"][1], 4.43, 0.001, "chr1 p arm");
close(core.KARYO_DATA["Y"][0], 2.21, 0.001, "chrY relative length");
close(core.KARYO_DATA["Y"][1], 0.51, 0.001, "chrY p arm");
// RERF 표의 CI는 개체별 평균이라 p/전체와 0.3%p 안에서 맞는다
close(core.KARYO_DATA["13"][1] / core.KARYO_DATA["13"][0], 0.166, 0.003, "chr13 CI 16.6");
close(core.KARYO_DATA["16"][1] / core.KARYO_DATA["16"][0], 0.425, 0.003, "chr16 CI 42.5");
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
const base = { style: 2, wc: 7, chromatids: 1, splay: 0, centromere: "one" };
const g1 = core.chromGeom("1", "", base);
close(g1.T, 100, 0.0001, "chr1 length = 100 units");
close(g1.pLen / g1.T, 4.43 / 9.11, 0.0001, "chr1 p ratio");
const g13 = core.chromGeom("13", "", base);
close(g13.pLen / g13.T, 0.64 / 3.87, 0.0001, "chr13 p ratio");
close(core.chromGeom("X", "", base).T, 100 * 5.16 / 9.11, 0.0001, "X length from the RERF table");
close(core.chromGeom("21", "", base).T, 100 * 1.70 / 9.11, 0.0001, "chr21 length from the RERF table");
// 중등 교재용: 달린 염색체의 p팔도 위성·자루(더듬이) 없이 짧은 팔로만 그린다
assert.ok(!/stalk|knob/.test(source.slice(start, end).replace(/\/\/.*$/gm, "").replace(/"6"/g, "")), "no stalk/satellite geometry in the core");
ALL.forEach((id) => {
  [0, 1, 2].forEach((style) => {
    const g = core.chromGeom(id, "", { style, wc: 7, chromatids: 1, splay: 0, centromere: "one" });
    let widest = 0;
    core.chromOutline(g, { style, wc: 7, chromatids: 1, splay: 0, centromere: "one" }, 1).forEach((pt) => {
      widest = Math.max(widest, Math.abs(pt[0]));
    });
    assert.ok(widest <= g.a * 1.1 + 1e-6, `arm of ${id} (style ${style}) never gets wider than the shaft: ${widest} vs ${g.a}`);
  });
});

const del = core.chromGeom("5", "del5p", base);
const full5 = core.chromGeom("5", "", base);
assert.ok(del.pLen < full5.pLen * 0.75 && del.pLen > full5.pLen * 0.65, "5p- loses about p15.2-pter (15 of 48.8 Mb = 31% of the p arm)");
close(del.qLen, full5.qLen, 0.0001, "5p- keeps the q arm");

for (let style = 0; style < 3; style++) {
  for (let chromatids = 1; chromatids <= 2; chromatids++) {
    const o = { style, wc: 7, chromatids, splay: 4, centromere: "one" };
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
      assert.ok(w >= g.a * 2 - 0.01 && w < 60, `width of ${id} (${w})`);
      core.chromBands(g).forEach((b) => {
        assert.ok(b.y0 >= -0.0001 && b.y1 <= g.T + 0.0001 && b.y1 > b.y0 && b.lev >= 1 && b.lev <= 5, `band of ${id}`);
      });
    });
  }
}
// 분체 둘은 같은 모양의 거울상이다
{
  const o = { style: 2, wc: 7, chromatids: 2, splay: 0, centromere: "one" };
  const g = core.chromGeom("7", "", o);
  const left = core.chromOutline(g, o, -1);
  const right = core.chromOutline(g, o, 1);
  const lMin = Math.min(...left.map((p) => p[0])), lMax = Math.max(...left.map((p) => p[0]));
  const rMin = Math.min(...right.map((p) => p[0])), rMax = Math.max(...right.map((p) => p[0]));
  close(lMin, -rMax, 0.0001, "mirror min/max");
  close(lMax, -rMin, 0.0001, "mirror max/min");
  assert.ok(lMax > 0 || rMin < 0, "sister chromatids touch or overlap at the centromere");
}
// 모양 3종: 기하학적 = 둥근 사각형 팔 + 동원체 원(Sadava), 중간 = 목 0.69(Brown), 실제 = 분체 사이가 벌어진 X자
{
  assert.deepStrictEqual(core.SHAPE_STYLES.map((s) => s.name), ["기하학적", "중간", "실제"]);
  const one = { style: 0, wc: 7, chromatids: 1, splay: 0, centromere: "one" };
  const geo = core.chromGeom("1", "", one);
  assert.ok(geo.beads, "geometric style is built from two arms with a gap");
  close((geo.beads.qStart - geo.beads.pEnd) / (2 * geo.a), 0.39, 0.0001, "gap between the arms / arm width");
  // 동원체 원은 팔 사이 틈에 따로 그린다 (Sadava: 지름 0.654 × 팔 너비)
  const disc = core.centromereCircles(geo, one, "one");
  assert.strictEqual(disc.length, 1);
  close(disc[0].r / geo.a, 0.654, 0.0001, "circle radius / arm half width");
  close(disc[0].y, geo.yc, 1e-9, "circle at the centromere");
  assert.deepStrictEqual(core.centromereCircles(geo, one, "none"), []);
  assert.strictEqual(core.centromereCircles(geo, one, "each").length, 1, "one chromatid: 'each' is one circle too");
  // 팔 사이 틈에는 외곽선 점이 없다 (원이 메운다)
  assert.ok(core.chromOutline(geo, one, 1).every((pt) => Math.abs(pt[1] - geo.yc) > 0.3 * geo.a || Math.abs(pt[0]) < 1e-6), "no outline inside the gap");
  close(core.chromGeom("1", "", { style: 1, wc: 7, chromatids: 1, splay: 0, centromere: "one" }).style.neck, 0.69, 1e-9, "intermediate neck from Brown");
  // 기하학적 밴드는 한 색 줄(단계 4)만, 다른 모양은 단계가 섞인다
  const geoLevels = {};
  const realLevels = {};
  ALL.forEach((id) => {
    core.chromBands(core.chromGeom(id, "", one)).forEach((b) => { geoLevels[b.lev] = true; });
    core.chromBands(core.chromGeom(id, "", base)).forEach((b) => { realLevels[b.lev] = true; });
  });
  assert.deepStrictEqual(Object.keys(geoLevels), ["4"]);
  assert.ok(Object.keys(realLevels).length >= 4);
  // 실제 모양의 두 분체는 서로 떨어져 서다가 동원체에서 합쳐진다
  const two = { style: 2, wc: 7, chromatids: 2, splay: 0, centromere: "one" };
  const g7 = core.chromGeom("7", "", two);
  const inner = (y) => core.chromAxis(g7, y, two) - core.chromHalf(g7, y);
  assert.ok(inner(g7.yc * 0.1) > 0.2 * g7.a, "apart on the p arm");
  assert.ok(inner(g7.yc) < 0.05 * g7.a, "touching at the centromere");
  assert.deepStrictEqual(core.SPLAY_PRESET, [0, 0, 10]);
  // 동원체 원: 두 분체일 때 "one"은 양쪽 목을 덮는 원 하나, "each"는 서로 맞닿는 원 둘
  const oneDisc = core.centromereCircles(g7, two, "one");
  assert.strictEqual(oneDisc.length, 1);
  assert.ok(oneDisc[0].x === 0 && oneDisc[0].r >= core.chromAxis(g7, g7.yc, two), "one circle spans both necks");
  const each = core.centromereCircles(g7, two, "each");
  assert.strictEqual(each.length, 2);
  close(each[0].x, -each[1].x, 1e-9, "mirrored");
  assert.ok(each[1].r >= each[1].x, "the two circles touch or overlap at the middle");
  // 벌림: 동원체에서 비스듬히 나가다 수직으로 꺾인다 → 먼 곳에서는 축이 더 벌어지지 않는다
  const splayed = { style: 2, wc: 7, chromatids: 2, splay: 15, centromere: "one" };
  const g1 = core.chromGeom("1", "", splayed);
  const L = 4 * g1.a;
  const ax = (u) => core.chromAxis(g1, g1.yc + u, splayed);
  assert.ok(ax(0.5 * L) - ax(0) > 0.3 * Math.tan(15 * Math.PI / 180) * 0.5 * L, "diverges near the centromere");
  close(ax(2 * L), ax(1.5 * L), 1e-6, "vertical beyond the knee");
  // 벌림이 더하는 가로 이동은 무릎 길이 L에서 포화한다: tan(벌림) × L × 2/3
  const straight = { style: 2, wc: 7, chromatids: 2, splay: 0, centromere: "one" };
  const ax0 = (u) => core.chromAxis(g1, g1.yc + u, straight);
  close(ax(2 * L) - ax0(2 * L), Math.tan(15 * Math.PI / 180) * L * 2 / 3, 1e-6, "saturated bend");
  close(ax(0.5 * L) - ax0(0.5 * L), Math.tan(15 * Math.PI / 180) * L * (0.5 - 0.125 / 3), 1e-6, "bend inside the knee");
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
      const o = { style: 2, wc: 7, chromatids, splay: 10, centromere: "each", pairGap: 3, labelGap: 4, fontSize: 8, margin: 10 };
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
  const o = { style: 1, wc: 7, chromatids: 2, splay: 0, centromere: "one", pairGap: 3, labelGap: 4, fontSize: 8, margin: 10 };
  const lay = core.layoutKaryotype(core.buildCells(["21"], "down", "F"), o, 300, 200);
  assert.strictEqual(lay.cells.length, 1);
  close(lay.cells[0].cx, 150, 0.0001, "single cell centred horizontally");
  assert.strictEqual(lay.cells[0].items.length, 3);
}

// 벌림·두께를 바꿔도 세로가 꽉 차는(가로가 남는) 사각형에서는 염색체 크기(배율)가 그대로다.
// 벌림은 무릎 길이에서 포화하므로 가로가 조금만 넓어진다 (예전 직선 X자는 긴 팔 끝에서 크게 벌어져 가로에 걸렸다)
{
  const scaleAt = (splay, wc) => core.layoutKaryotype(core.buildCells(ALL, "normal", "M"),
    { style: 2, wc, chromatids: 2, splay, centromere: "one", pairGap: 3, labelGap: 4, fontSize: 8, margin: 10 }, 600, 300).s;
  close(scaleAt(15, 7), scaleAt(0, 7), 1e-9, "splay keeps the scale");
  close(scaleAt(0, 10), scaleAt(0, 7), 1e-9, "thickness keeps the scale");
}

// 가로가 빡빡한 사각형에서도 이웃 칸 사이는 상동 염색체 간격의 2배 이상이라 짝이 더 가깝게 보인다
{
  const o = { style: 2, wc: 7, chromatids: 2, splay: 10, centromere: "one", pairGap: 6, labelGap: 4, fontSize: 8, margin: 10 };
  const lay = core.layoutKaryotype(core.buildCells(ALL, "normal", "M"), o, 220, 400);
  const byRow = {};
  lay.cells.forEach((cell) => { (byRow[Math.round(cell.bottom)] = byRow[Math.round(cell.bottom)] || []).push(cell); });
  Object.keys(byRow).forEach((key) => {
    const cells = byRow[key].sort((p, q) => p.cx - q.cx);
    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1];
      const prevG = core.chromGeom(prev.id, prev.items[prev.items.length - 1].variant, o);
      const nextG = core.chromGeom(cells[i].id, cells[i].items[0].variant, o);
      const edgeGap = (cells[i].items[0].x - core.chromWidth(nextG, o) * lay.s / 2) - (prev.items[prev.items.length - 1].x + core.chromWidth(prevG, o) * lay.s / 2);
      assert.ok(edgeGap >= 2 * lay.pairGap - 1e-6, `cell gap ${edgeGap} should be at least twice the pair gap`);
      if (prev.items.length === 2) {
        const g0 = core.chromGeom(prev.id, prev.items[0].variant, o);
        const pairEdgeGap = prev.items[1].x - prev.items[0].x - core.chromWidth(g0, o) * lay.s;
        assert.ok(edgeGap > pairEdgeGap, "homologs closer than neighbours");
      }
    }
  });
  assert.ok(lay.pairGap > 0 && lay.pairGap <= 6, `pair gap may only shrink: ${lay.pairGap}`);
  // 아주 좁은 틀 + 큰 상동 간격: 배율은 25%까지만 줄고 상동 간격이 대신 줄어든다. 염색체는 사라지지 않는다
  const tight = core.layoutKaryotype(core.buildCells(ALL, "normal", "M"), { ...o, pairGap: 12 }, 200, 250);
  const loose = core.layoutKaryotype(core.buildCells(ALL, "normal", "M"), { ...o, pairGap: 0 }, 200, 250);
  assert.ok(tight.pairGap < 12 && tight.pairGap >= 0, `pair gap reduced: ${tight.pairGap}`);
  assert.ok(tight.s > 0.3 * loose.s, `chromosomes stay visible: ${tight.s} vs ${loose.s}`);
}

// ---- 스크립트 규약 (AGENTS.md)
assert.ok(source.indexOf('var SETTINGS_TAG = "v4"') < source.indexOf("readSettings();"), "settings constants before readSettings()");
assert.ok(/p\.length !== SETTINGS_LENGTH/.test(source), "settings length check");
assert.strictEqual(source.split("saveSettings();").length - 1, 1, "saveSettings is called only on confirm");
assert.ok(/okButton\.onClick = function\(\) \{[^}]*saveSettings\(\);/.test(source), "settings saved in the OK handler");
assert.ok(source.indexOf("dlg.defaultElement = null") > 0, "enter must not run the script");
assert.ok(source.indexOf("bindTabOrder(dlg)") > 0 && source.indexOf("ui_tab_helper.jsxinc") > 0, "tab order helper");
assert.ok(source.indexOf("illu_last_script.txt") > 0, "last-script memo");
assert.ok(source.indexOf('"scrollbar"') > 0 && source.indexOf("stepdelta") > 0, "scrollbar rows");
assert.ok(source.indexOf("movePreview(offsetXmm * MM, offsetYmm * MM)") > 0, "movable preview");
assert.ok(source.indexOf("path.opacity = shadePct") > 0 && /var SHADE_STOPS = \[\[0, 0, 80\]/.test(source), "shade strength scales the overlay opacity");
assert.ok(/p\[20\] === "1"/.test(source) && source.indexOf("var SETTINGS_LENGTH = 21") > 0, "settings layout v4 has 21 fields");
assert.ok(/cenIdx = restoreNumber\(p\[7\]/.test(source) && source.indexOf('var CEN_CODES = ["one", "each", "none"]') > 0, "centromere option is saved");
assert.ok(source.indexOf("var K_RANGE = [0, 100]") > 0 && /kPct = restoreNumber\(p\[10\], kPct, K_RANGE, 10\)/.test(source), "K density in steps of 10");
assert.ok(source.indexOf("function strokeEdge") > 0 && source.indexOf("var renderIdx = 0") > 0, "outline (white fill + edge) render mode");
assert.ok(source.indexOf("path.rotate(0 - path.fillColor.angle, false, false, true, false, Transformation.CENTER)") > 0, "gradient angle read back");
assert.ok(source.indexOf("ENG_FONT_NAME") > 0 && source.indexOf("GSMediumB1") > 0, "label font rule");
// ExtendScript 함정: 게으른 정규식, /= 로 시작하는 정규식 리터럴
assert.ok(!/\.match\(/.test(source) && !/\(\.\+\?\)/.test(source), "no lazy regex in input parsing");
assert.ok(!/\/=/.test(source.replace(/\/\/.*$/gm, "")), "no regex literal that starts with /=");
// 클리핑 마스크는 경로여야 하고 마스크는 그룹의 맨 위여야 한다
assert.ok(source.indexOf("box.clipped = true") > source.indexOf("base.duplicate(box, ElementPlacement.PLACEATBEGINNING)"), "mask duplicated before clipping");

console.log("karyotype checks passed");
