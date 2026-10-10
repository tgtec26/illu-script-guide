const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "화학 반응 모형.jsx"), "utf8");

// 중괄호·대괄호·따옴표를 따라가며 시작 위치부터 균형 잡힌 끝까지 자른다
function balancedEnd(start, openChar) {
  let depth = 0;
  let quote = null;
  for (let index = source.indexOf(openChar, start); index < source.length; index++) {
    const ch = source[index];
    if (quote !== null) {
      if (ch === "\\") index++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return index + 1;
    }
  }
  throw new Error("unbalanced block");
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  return source.slice(start, balancedEnd(start, "{"));
}

function extractVar(name) {
  const start = source.indexOf(`var ${name} = `);
  assert.ok(start >= 0, `missing table: ${name}`);
  const value = source.indexOf("=", start) + 1;
  const opener = source.slice(value).search(/[{[]/) + value;
  const end = source.indexOf(";", balancedEnd(opener, source[opener]));
  return source.slice(start, end + 1);
}

const tables = ["MINUS", "ANGSTROM", "regionCache", "TEXTBOOK_OVERLAP", "TEXTBOOK_H_RADIUS", "ELEMENTS", "SPHERE_COLORS", "SPHERE_GRAYS", "NITRATE", "BRACKET", "MOLECULES", "REACT_PRESETS", "GAS_PRESETS"];
const functions = ["dia", "atomRadius", "polygonArea", "pointInPolygon", "mergeHoles", "molRegions", "parseEquations", "parseSide", "molLayout", "clusterRows", "arrangeSpecies", "formSubFlags", "sphereTextK"];
const names = tables.concat(functions);
const lib = new Function(`${tables.map(extractVar).join("\n")}\n${functions.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 반응식 한 쪽의 원소별 원자 수 (색 이름 기준: 이온도 원소로 센다)
function countAtoms(side) {
  const counts = {};
  for (const [coef, formula] of side) {
    for (const atom of lib.MOLECULES[formula].atoms) {
      const pal = lib.ELEMENTS[atom[0]].pal;
      counts[pal] = (counts[pal] || 0) + coef;
    }
  }
  return counts;
}

// 모든 분자는 색이 있는 원자로만 이루어진다
for (const [formula, mol] of Object.entries(lib.MOLECULES)) {
  assert.ok(mol.name, `${formula} name`);
  for (const atom of mol.atoms) {
    assert.ok(lib.ELEMENTS[atom[0]], `${formula} unknown atom ${atom[0]}`);
    assert.ok(lib.SPHERE_COLORS[lib.ELEMENTS[atom[0]].pal], `${formula} no color for ${atom[0]}`);
    assert.ok(lib.SPHERE_GRAYS[lib.ELEMENTS[atom[0]].pal], `${formula} no gray for ${atom[0]}`);
  }
}

// 모든 반응 목록의 반응식은 읽히고 원자 수가 맞는다. 마지막(직접 입력)만 eq가 없다
for (const presets of [lib.REACT_PRESETS, lib.GAS_PRESETS]) {
  assert.strictEqual(presets[presets.length - 1].eq, null);
  for (const preset of presets.slice(0, -1)) {
    const parsed = lib.parseEquations(preset.eq);
    assert.ok(Array.isArray(parsed), `${preset.title}: ${parsed}`);
    for (const reaction of parsed) {
      assert.deepStrictEqual(countAtoms(reaction.left), countAtoms(reaction.right), `${preset.title} not balanced`);
    }
  }
}

// 실제 결합 길이·각도(NIST CCCBDB)와 이온 반지름 합: 원자 좌표(Å)에서 직접 잰다
{
  const dist = (formula, i, j) => {
    const a = lib.MOLECULES[formula].atoms[i], b = lib.MOLECULES[formula].atoms[j];
    return Math.hypot(a[1] - b[1], a[2] - b[2], a[3] - b[3]);
  };
  const angle = (formula, i, center, j) => {
    const m = lib.MOLECULES[formula].atoms;
    const u = [1, 2, 3].map((k) => m[i][k] - m[center][k]), v = [1, 2, 3].map((k) => m[j][k] - m[center][k]);
    const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    return Math.acos(dot / (Math.hypot(...u) * Math.hypot(...v))) * 180 / Math.PI;
  };
  const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);
  near(dist("H2", 0, 1), 0.741, 0.01, "H2");
  near(dist("O2", 0, 1), 1.208, 0.01, "O2");
  near(dist("N2", 0, 1), 1.098, 0.01, "N2");
  near(dist("Cl2", 0, 1), 1.988, 0.01, "Cl2");
  near(dist("CO", 0, 1), 1.128, 0.01, "CO");
  near(dist("NO", 0, 1), 1.151, 0.01, "NO");
  near(dist("HCl", 0, 1), 1.275, 0.01, "HCl");
  near(dist("H2O", 0, 2), 0.958, 0.01, "H2O OH");
  near(dist("H2O", 1, 2), 0.958, 0.01, "H2O OH");
  near(angle("H2O", 0, 2, 1), 104.5, 0.5, "H2O angle");
  near(dist("H2O2", 2, 3), 1.475, 0.01, "H2O2 OO");
  near(dist("H2O2", 0, 2), 0.967, 0.01, "H2O2 OH");
  near(dist("H2O2", 1, 3), 0.967, 0.01, "H2O2 OH");
  near(angle("H2O2", 0, 2, 3), 94.8, 0.5, "H2O2 OOH");
  for (const h of [0, 1, 3]) near(dist("NH3", 2, h), 1.012, 0.01, "NH3 NH");
  near(angle("NH3", 0, 2, 1), 106.7, 0.5, "NH3 angle");
  near(angle("NH3", 0, 2, 3), 106.7, 0.5, "NH3 angle");
  for (const h of [0, 1, 3, 4]) near(dist("CH4", 2, h), 1.087, 0.01, "CH4 CH");
  near(angle("CH4", 0, 2, 1), 109.47, 0.5, "CH4 angle");
  near(angle("CH4", 3, 2, 4), 109.47, 0.5, "CH4 angle");
  near(dist("CO2", 0, 2), 1.162, 0.01, "CO2");
  near(angle("CO2", 0, 2, 1), 180, 0.5, "CO2 linear");
  near(dist("NO2", 0, 2), 1.194, 0.01, "NO2");
  near(angle("NO2", 0, 2, 1), 133.9, 0.5, "NO2 angle");
  for (const o of [0, 1, 2]) near(dist("AgNO3", 3, o), 1.24, 0.01, "nitrate NO");
  near(angle("AgNO3", 0, 3, 1), 120, 0.5, "nitrate angle");
  near(dist("NaCl", 0, 1), 1.02 + 1.81, 0.01, "NaCl touching");
  near(dist("AgCl", 0, 1), 1.15 + 1.81, 0.01, "AgCl touching");
  // 구 지름 = 반데르발스 반지름의 두 배 (산소 1.52 Å = 지름 1)
  near(lib.ELEMENTS.O.d, 1, 1e-9, "O diameter");
  near(lib.ELEMENTS.H.d, 1.2 / 1.52, 1e-9, "H diameter");
  near(lib.ELEMENTS.C.d, 1.7 / 1.52, 1e-9, "C diameter");
  near(lib.ELEMENTS["Cl-"].d, 1.81 / 1.52, 1e-9, "Cl- diameter");
  // 결합한 원자는 구가 겹친다 (중심 간격 < 반지름 합)
  for (const [f, i, j] of [["H2O", 0, 2], ["NH3", 0, 2], ["CH4", 3, 2], ["CO2", 0, 2], ["HCl", 0, 1], ["O2", 0, 1]]) {
    const ei = lib.ELEMENTS[lib.MOLECULES[f].atoms[i][0]], ej = lib.ELEMENTS[lib.MOLECULES[f].atoms[j][0]];
    assert.ok(dist(f, i, j) / lib.ANGSTROM < (ei.d + ej.d) / 2, `${f} bonded spheres overlap`);
  }
}

// 교재 비율: H 지름 ≈ O의 0.58배, ref 결합의 중심 간격 = 반지름 합 × 0.76 (참고 그림 실측), 이온 결합은 그대로
{
  const textbookWater = lib.molLayout("H2O", 0, true), realWater = lib.molLayout("H2O", 0, false);
  const byOrder = (lay, order) => lay.atoms.find((a) => a.order === order);
  near2(byOrder(textbookWater, 0).d / byOrder(textbookWater, 2).d, 0.88 / 1.52, 1e-9, "textbook H/O");
  near2(byOrder(realWater, 0).d / byOrder(realWater, 2).d, 1.2 / 1.52, 1e-9, "real H/O");
  for (const [formula, mol] of Object.entries(lib.MOLECULES)) {
    const lay = lib.molLayout(formula, 0, true);
    if (mol.ionic) {
      assert.deepStrictEqual(lay.atoms, lib.molLayout(formula, 0, false).atoms, `${formula} ionic ignores proportion`);
      continue;
    }
    if (!mol.ref) continue;
    const a = byOrder(lay, mol.ref[0]), b = byOrder(lay, mol.ref[1]);
    const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    near2(distance, 0.76 * (a.d + b.d) / 2, 1e-9, `${formula} textbook bond spacing`);
  }
  function near2(actual, expected, tolerance, label) { assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`); }
}

// 보이는 부분: 윤곽선 넓이의 합 = 구들을 겹쳐 놓은 모양의 넓이 (모든 점은 가장 앞선 구 하나의 몫)
{
  for (const [formula, mol] of Object.entries(lib.MOLECULES)) {
    for (const textbook of [true, false]) {
      for (const angle of [0, 25]) {
        const lay = lib.molLayout(formula, angle, textbook);
        const infos = lib.molRegions(lay);
        assert.strictEqual(infos.length, lay.atoms.length);
        let total = 0;
        lay.atoms.forEach((atom, i) => {
          const area = Math.PI * atom.d * atom.d / 4;
          if (infos[i].loops === null) total += area;
          else {
            for (const loop of infos[i].loops) {
              assert.ok(loop.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])), `${formula} finite`);
              assert.ok(lib.polygonArea(loop) > 0, `${formula} piece must be counter-clockwise (no separate holes)`);
              total += lib.polygonArea(loop);
            }
          }
        });
        let covered = 0;
        const N = 360, xs = lay.atoms.map((a) => a.x), ys = lay.atoms.map((a) => a.y);
        const left = Math.min(...lay.atoms.map((a) => a.x - a.d / 2)), right = Math.max(...lay.atoms.map((a) => a.x + a.d / 2));
        const bottom = Math.min(...lay.atoms.map((a) => a.y - a.d / 2)), top = Math.max(...lay.atoms.map((a) => a.y + a.d / 2));
        const cell = Math.max(right - left, top - bottom) / N;
        for (let px = left; px < right; px += cell) {
          for (let py = bottom; py < top; py += cell) {
            if (lay.atoms.some((a) => (px - a.x) ** 2 + (py - a.y) ** 2 <= a.d * a.d / 4)) covered += cell * cell;
          }
        }
        assert.ok(Math.abs(total - covered) / covered < 0.03, `${formula} ${textbook} ${angle}: visible ${total} vs union ${covered}`);
      }
    }
  }
}

// 회색 음영: 원소마다 본색 밝기가 달라 구별되고, 하이라이트 < 본색 < 가장자리(K 증가)
{
  const bases = [];
  for (const [pal, [hi, base, edge]] of Object.entries(lib.SPHERE_GRAYS)) {
    assert.ok(hi < base && base < edge && hi >= 0 && edge <= 100, `${pal} gray order`);
    bases.push(base);
  }
  assert.strictEqual(new Set(bases).size, bases.length, "gray bases must differ");
  // 구 위 글자: 어두운 구(탄소·회색의 산소)는 흰 글자, 밝은 구는 검정 글자
  for (const mode of [0, 1]) {
    assert.strictEqual(lib.sphereTextK("C", mode), 0, `C text white mode ${mode}`);
    assert.strictEqual(lib.sphereTextK("H", mode), 100, `H text black mode ${mode}`);
  }
  assert.strictEqual(lib.sphereTextK("O", 0), 100);
  assert.strictEqual(lib.sphereTextK("O", 1), 0);
}

// 반응식 읽기
{
  const same = JSON.stringify(lib.parseEquations("2H2+O2=2H2O"));
  for (const text of ["2H2 + O2 → 2H2O", "2H2+O2->2H2O", "2H2+O2>2H2O", "2H2+O2⟶2H2O", "2H2+O2=>2H2O"]) {
    assert.strictEqual(JSON.stringify(lib.parseEquations(text)), same, text);
  }
  assert.deepStrictEqual(lib.parseEquations("N2+3H2=2NH3")[0], {left: [[1, "N2"], [3, "H2"]], right: [[2, "NH3"]]});
  assert.strictEqual(lib.parseEquations("2H2+O2=2H2O;N2+3H2=2NH3").length, 2);
  assert.strictEqual(lib.parseEquations("2H2+O2=2H2O;").length, 1, "빈 조각은 건너뜀");
  for (const bad of ["", "2H2+O2", "H2=O2=N2", "2H2+XYZ=H2O", "9H2=H2", "0H2=H2", "H2+=H2O", "H2+O2+N2+Cl2+CO+NO=CO2"]) {
    assert.strictEqual(typeof lib.parseEquations(bad), "string", `should reject: ${bad}`);
  }
}

// 분자 배치: 경계 가운데가 원점, 돌려도 원자 사이 거리 유지, 이온은 돌리지 않음
{
  for (const formula of Object.keys(lib.MOLECULES)) {
    const lay = lib.molLayout(formula, 0);
    let l = 1e9, r = -1e9, t = -1e9, b = 1e9;
    for (const a of lay.atoms) { l = Math.min(l, a.x - a.d / 2); r = Math.max(r, a.x + a.d / 2); t = Math.max(t, a.y + a.d / 2); b = Math.min(b, a.y - a.d / 2); }
    if (!lay.bracket) {
      assert.ok(Math.abs(l + r) < 1e-9 && Math.abs(t + b) < 1e-9, `${formula} not centred`);
      assert.ok(Math.abs(lay.w - (r - l)) < 1e-9 && Math.abs(lay.h - (t - b)) < 1e-9, `${formula} size`);
    } else {
      assert.ok(lay.bracket.x0 >= -lay.w / 2 - 1e-9 && lay.bracket.y1 <= lay.h / 2 + 1e-9, `${formula} bracket inside`);
    }
    const rotated = lib.molLayout(formula, 40);
    if (lib.MOLECULES[formula].ionic) {
      assert.deepStrictEqual(rotated, lay, `${formula} ionic must not rotate`);
    } else if (lay.atoms.length > 1) {
      const dist = (m, i, j) => Math.hypot(m.atoms[i].x - m.atoms[j].x, m.atoms[i].y - m.atoms[j].y);
      assert.ok(Math.abs(dist(lay, 0, 1) - dist(rotated, 0, 1)) < 1e-9, `${formula} rotation keeps distances`);
    }
  }
}

// 모아 놓기 줄 구성
{
  const expected = {1: [1], 2: [2], 3: [1, 2], 4: [2, 2], 5: [2, 3], 6: [3, 3], 8: [2, 3, 3]};
  for (const [count, rows] of Object.entries(expected)) assert.deepStrictEqual(lib.clusterRows(Number(count)), rows, `rows for ${count}`);
}

// 같은 분자 여러 개: 개수가 맞고 겹치지 않으며 묶음 경계 안에 있다 (한 줄·모아서, 기울임 0·25)
{
  const unit = 20, gap = 3;
  for (const formula of ["H2", "H2O", "NH3", "CO2", "NaCl"]) {
    for (const mode of [0, 1]) {
      for (const tilt of [0, 25]) {
        for (let count = 1; count <= 6; count++) {
          const group = lib.arrangeSpecies(formula, count, mode, tilt, unit, gap);
          assert.strictEqual(group.items.length, count);
          for (const item of group.items) {
            assert.ok(Math.abs(item.x) + item.lay.w * unit / 2 <= group.w / 2 + 1e-6, `${formula} x inside`);
            assert.ok(Math.abs(item.y) + item.lay.h * unit / 2 <= group.h / 2 + 1e-6, `${formula} y inside`);
          }
          for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
              const a = group.items[i], b = group.items[j];
              const apartX = Math.abs(a.x - b.x) - (a.lay.w + b.lay.w) * unit / 2;
              const apartY = Math.abs(a.y - b.y) - (a.lay.h + b.lay.h) * unit / 2;
              assert.ok(Math.max(apartX, apartY) >= -1e-6, `${formula} mode ${mode} copies ${i},${j} overlap`);
            }
          }
        }
      }
    }
  }
}

// 아래 첨자: 글자 뒤 숫자만, 계수(앞 숫자)는 그대로
{
  const flags = (text) => lib.formSubFlags(text).map((flag) => (flag ? "1" : "0")).join("");
  assert.strictEqual(flags("2H2O"), "0010");
  assert.strictEqual(flags("H2O2"), "0101");
  assert.strictEqual(flags("물(2H2O)"), "000010" + "0");
  assert.strictEqual(flags("C10"), "011");
}

console.log("check-reaction-model: ok");
