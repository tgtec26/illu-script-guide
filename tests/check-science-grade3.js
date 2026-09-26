// 3학년 교재 기반 탭·스크립트: 다중 섬광·역학적 에너지(역학), 날씨, 화학 반응 모형, 뉴런
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
function load(file, names) {
  const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
  const pick = (name) => {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `missing helper: ${name} in ${file}`);
    let depth = 0;
    for (let i = source.indexOf("{", start); i < source.length; i++) {
      if (source[i] === "{") depth++;
      if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error(`unbalanced helper: ${name}`);
  };
  return { source, h: new Function(`${names.map(pick).join("\n")}\nreturn {${names.join(",")}};`)() };
}

// 역학: 다중 섬광·역학적 에너지
{
  const { source, h } = load("Object_Mechanics.jsx", ["strobePositions", "energyFractions"]);
  assert.deepStrictEqual(h.strobePositions(4, 5, 0), [0, 5, 10, 15], "uniform motion");
  assert.deepStrictEqual(h.strobePositions(4, 2, 2), [0, 2, 6, 12], "speeding up");
  assert.deepStrictEqual(h.strobePositions(6, 3, -1), [0, 3, 5, 6], "stops before interval hits zero");
  assert.deepStrictEqual(h.energyFractions(3), [1, 0.5, 0]);
  assert.ok(source.includes("makeStrobeEngine(), makeEnergyEngine()]"), "tabs registered");
  assert.ok(!/\bvar long\b/.test(source), "long is reserved in ExtendScript");
}

// 날씨
{
  const { source, h } = load("Object_Weather.jsx", ["atmosphereProfile", "atmosphereSpans", "isobarRadius", "windDirection", "breezeArrows", "actionHex"]);
  assert.deepStrictEqual(h.atmosphereSpans(120), [[0, 11], [11, 50], [50, 80], [80, 120]], "brace spans cover every layer");
  assert.deepStrictEqual(h.actionHex("패스 끝의 팁"), { hex: "ED8CA8EC8AA420EB819DEC9D9820ED8C81", length: 17 }, "same bytes as GraphTools");
  assert.deepStrictEqual(h.actionHex("화살표 1"), { hex: "ED9994EC82B4ED919C2031", length: 11 }, "AGENTS.md arrow name bytes");
  const full = h.atmosphereProfile(150);
  assert.deepStrictEqual(full[full.length - 1], [20, 120], "stops at the right edge of the temperature axis");
  const cut = h.atmosphereProfile(100);
  assert.deepStrictEqual(cut[cut.length - 1], [-60, 100]);
  assert.ok(cut.every((p) => p[1] <= 100));
  // 등압선은 같은 모양을 키운 것이라 만나지 않는다
  for (let th = 0; th < 6.3; th += 0.1) {
    assert.ok(h.isobarRadius(th, 2, 30, 7) < h.isobarRadius(th, 3, 30, 7));
    assert.ok(h.isobarRadius(th, 1, 30, 7) > 0);
  }
  // 위쪽(θ=90°) 바람: 고기압은 오른쪽(시계)·바깥(위), 저기압은 왼쪽(반시계)·안쪽(아래)
  const hi = h.windDirection(Math.PI / 2, true), lo = h.windDirection(Math.PI / 2, false);
  assert.ok(hi[0] > 0.8 && hi[1] > 0.4, "high: clockwise and outward");
  assert.ok(lo[0] < -0.8 && lo[1] < -0.4, "low: counterclockwise and inward");
  // 해풍: 지면 바람이 바다(오른쪽) → 육지(왼쪽), 육지 위에서 올라간다
  const sea = h.breezeArrows(100, 50, 9, true);
  assert.ok(sea[0][1][0] < sea[0][0][0], "surface wind blows toward land");
  assert.ok(sea[1][1][1] > sea[1][0][1], "air rises over land");
  const land = h.breezeArrows(100, 50, 9, false);
  assert.ok(land[0][1][0] > land[0][0][0], "land breeze blows toward sea");
  for (const key of ["ObjectAtmosphere", "ObjectPressureSystem", "ObjectSeaLandBreeze"]) assert.ok(source.includes(`"${key}/settings"`));
  // 화살촉 액션 파일: 시작 화살촉이 없으면 끝 화살촉·끝 크기만 적고, 순서는 기록된 액션(두께→시작→끝→크기→정렬)과 같다
  {
    const src = ["setStrokeArrowheads", "actionHex"].map((name) => {
      const i = source.indexOf(`function ${name}(`);
      let depth = 0;
      for (let k = source.indexOf("{", i); ; k++) {
        if (source[k] === "{") depth++;
        if (source[k] === "}" && --depth === 0) return source.slice(i, k + 1);
      }
    }).join("\n");
    const written = [], ran = [];
    function File() { this.open = () => {}; this.close = () => {}; this.remove = () => {}; this.write = (t) => written.push(t); }
    const app = { loadAction() {}, unloadAction() {}, doScript: (a, b) => ran.push([a, b]) };
    const make = new Function("File", "Folder", "app", "doc", "ARROW_ALIGN_TIP", `${src}\nreturn setStrokeArrowheads;`);
    const set = make(File, { temp: "/tmp" }, app, { selection: null }, "패스 끝의 팁");
    set([{}], null, "화살표 1", 0.75, 80);
    const one = written[0];
    assert.ok(one.includes("/parameterCount 4"));
    assert.ok(!one.includes("/key 1634231345") && !one.includes("/key 1634951985"), "no start arrowhead");
    assert.ok(one.indexOf("/key 1634231346") < one.indexOf("/key 1634951986") && one.includes("/value 80.0"));
    set([{}], "화살표 7", "화살표 6", 0.5, 100);
    const two = written[1];
    assert.ok(two.includes("/parameterCount 6"));
    const order = ["2003072104", "1634231345", "1634231346", "1634951985", "1634951986", "1634230636"].map((k) => two.indexOf(`/key ${k}`));
    assert.deepStrictEqual([...order].sort((x, y) => x - y), order, "recorded parameter order");
    assert.strictEqual(ran.length, 2);
  }
}

// 화학 반응 모형: 반응 전후 원자 수가 같다
{
  const { h } = load("Object_ChemReaction.jsx", ["chemReactions", "chemMolecule", "chemElement", "chemBounds", "chemGrid"]);
  const count = (side) => {
    const n = {};
    side.forEach(([coef, formula]) => h.chemMolecule(formula).forEach((a) => { n[a.symbol] = (n[a.symbol] || 0) + coef; }));
    return n;
  };
  h.chemReactions().forEach((r) => assert.deepStrictEqual(count(r.left), count(r.right), r.title));
  const water = h.chemBounds(h.chemMolecule("H2O"));
  assert.ok(water[2] - water[0] > 1.5 && water[1] > 0, "water bounds");
  assert.deepStrictEqual(h.chemGrid(3), [2, 2]);
  assert.deepStrictEqual(h.chemGrid(4), [2, 2]);
  assert.deepStrictEqual(h.chemGrid(6), [3, 2]);
}

// 뉴런: 말이집 조각은 5mm, 틈 1.2mm, 제외 구간에는 없다
{
  const { h } = load("Object_Neuron.jsx", ["myelinSegments"]);
  const segs = h.myelinSegments(0, 30, null);
  assert.deepStrictEqual(segs.slice(0, 2), [[0, 5], [6.2, 11.2]]);
  assert.ok(segs[segs.length - 1][1] <= 30);
  const cut = h.myelinSegments(0, 30, [10, 14]);
  assert.ok(cut.every(([a, b]) => b <= 10 || a >= 14));
}

// 공통: 새 스크립트는 메모·탭 이동·저장 규칙을 따른다
for (const file of ["Object_Weather.jsx", "Object_ChemReaction.jsx", "Object_Neuron.jsx"]) {
  const s = fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
  assert.ok(s.includes("illu_last_script.txt") && s.includes("ui_tab_helper.jsxinc") && s.includes("bindTabOrder(win)"), file);
  assert.ok(s.includes("win.defaultElement = null"), file);
}
console.log("grade 3 science checks passed");
