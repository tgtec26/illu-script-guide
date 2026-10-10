// 3학년 교재 기반 탭·스크립트: 역학적 에너지(역학), 날씨, 화학 반응 모형, 뉴런
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

// 역학: 역학적 에너지·수평 던지기 물체
{
  const { source, h } = load("역학.jsx", ["energyFractions"]);
  assert.deepStrictEqual(h.energyFractions(3), [1, 0.5, 0]);
  assert.ok(source.includes("makeEnergyEngine()]"), "tabs registered");
  assert.ok(!source.includes("makeStrobeEngine"), "multi-flash lives in Object_MotionPhoto now");
  // 수평 던지기 물체: 같은 시간 간격 → 가로 균등, 세로는 제곱
  const ballPositions = load("역학.jsx", ["ballPositions"]).h.ballPositions;
  const motion = { time: 2, width: 40, height: 20 };
  assert.deepStrictEqual(ballPositions(motion, 3), [[0, -0], [20, -5], [40, -20]]);
  assert.deepStrictEqual(ballPositions(motion, 1), [[0, -0]]);
  assert.deepStrictEqual(ballPositions(motion, 0), []);
  assert.ok(!/\bvar long\b/.test(source), "long is reserved in ExtendScript");
}

// 날씨
{
  const { source, h } = load("날씨.jsx", ["atmosphereProfile", "atmosphereSpans", "isobarRadius", "windDirection", "breezeArrows"]);
  assert.deepStrictEqual(h.atmosphereSpans(120), [[0, 11], [11, 50], [50, 80], [80, 120]], "brace spans cover every layer");
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
  // 화살촉은 액션 없이 직접 그린다: 선 끝을 촉 뿌리까지 줄이고 같은 그룹에 촉 도형을 더한다
  {
    const grab = (name) => {
      const i = source.indexOf(`function ${name}(`);
      let depth = 0;
      for (let k = source.indexOf("{", i); ; k++) {
        if (source[k] === "{") depth++;
        if (source[k] === "}" && --depth === 0) return source.slice(i, k + 1);
      }
    };
    const catalog = source.slice(source.indexOf("var HEAD_CATALOG = ["), source.indexOf("];", source.indexOf("var HEAD_CATALOG = [")) + 2);
    const brace = source.slice(source.indexOf("var BRACE_HEAD_BACK"), source.indexOf("    };", source.indexOf("var BRACE_HEADS")) + 7);
    const make = new Function(`${catalog}\n${brace}\n${["catalogPoints", "braceHeadPoints", "setStrokeArrowheads"].map(grab).join("\n")}\nreturn setStrokeArrowheads;`);
    const set = make();
    const makePath = (points) => {
      const heads = [];
      const container = { pathItems: { add() { const head = { setEntirePath(p) { this.points = p; this.pathPoints = p.map(() => ({})); } }; heads.push(head); return head; } } };
      return { path: { pathPoints: points.map((a) => ({ anchor: a, leftDirection: a, rightDirection: a })), strokeColor: "K", parent: container }, heads };
    };
    const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
    // 끝에만 작살형(3), 선 두께 0.75pt·크기 80% → 배율 0.6, 선은 끝에서 lineEnd(9)×0.6 = 5.4pt 물러난다
    const one = makePath([[0, 0], [100, 0]]);
    set([one.path], null, 3, 0.75, 80);
    assert.deepStrictEqual(one.path.pathPoints[0].anchor, [0, 0], "no start arrowhead");
    near(one.path.pathPoints[1].anchor[0], 94.6, "shaft ends inside the head");
    assert.strictEqual(one.heads.length, 1);
    assert.deepStrictEqual(one.heads[0].points[0], [100, 0], "tip at the path end");
    assert.strictEqual(one.heads[0].points.length, 6, "harpoon outline");
    assert.strictEqual(one.heads[0].fillColor, "K"); assert.strictEqual(one.heads[0].stroked, false);
    // 중괄호 갈고리: 양 끝, 선 두께 0.5pt·100% → 뿌리까지 2.1707×0.5
    const brace2 = makePath([[0, 0], [0, -50]]);
    set([brace2.path], "outer", "inner", 0.5, 100);
    near(brace2.path.pathPoints[0].anchor[1], -2.1707 * 0.5, "start trimmed");
    near(brace2.path.pathPoints[1].anchor[1], -50 + 2.1707 * 0.5, "end trimmed");
    assert.strictEqual(brace2.heads.length, 2);
    assert.ok(brace2.heads.every((hd) => hd.points.length === 6 && hd.pathPoints.every((q) => q.leftDirection && q.rightDirection)), "Bezier hooks with handles");
    near(brace2.heads[0].points[3][1], 0, "hook end sits at the path end");
    // 갈고리가 옆으로 가장 벌어진 폭은 2.88pt(1pt·100%) × 0.5
    const spread = Math.max(...brace2.heads[1].points.map((q) => Math.abs(q[0])));
    near(spread, 2.8881 * 0.5, "hook width");
    // 날씨는 액션을 쓰지 않는다
    assert.ok(!source.includes("doScript") && !source.includes("loadAction"), "weather: no actions");
  }
}

// 뉴런: 말이집 조각은 5mm, 틈 1.2mm, 제외 구간에는 없다
{
  const { h } = load("뉴런.jsx", ["myelinSegments"]);
  const segs = h.myelinSegments(0, 30, null);
  assert.deepStrictEqual(segs.slice(0, 2), [[0, 5], [6.2, 11.2]]);
  assert.ok(segs[segs.length - 1][1] <= 30);
  const cut = h.myelinSegments(0, 30, [10, 14]);
  assert.ok(cut.every(([a, b]) => b <= 10 || a >= 14));
}

// 공통: 새 스크립트는 메모·탭 이동·저장 규칙을 따른다
for (const file of ["날씨.jsx", "화학 반응 모형.jsx", "뉴런.jsx"]) {
  const s = fs.readFileSync(path.join(root, "스크립트", "01_도형", file), "utf8");
  assert.ok(s.includes("illu_last_script.txt") && s.includes("ui_tab_helper.jsxinc") && s.includes("bindTabOrder(win)"), file);
  assert.ok(s.includes("win.defaultElement = null"), file);
}
console.log("grade 3 science checks passed");
