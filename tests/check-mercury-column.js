const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_MercuryColumn.jsx");
const source = fs.readFileSync(scriptPath, "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);

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

function extractVar(name) {
  const match = source.match(new RegExp(`var ${name} = ([^;]*);`));
  assert.ok(match, `missing constant: ${name}`);
  return `var ${name} = ${match[1]};`;
}

const constants = ["MM", "KAPPA", "MOUTH_MARGIN_MM", "MIN_VACUUM_MM", "CORNER_R_MM", "FRAME_W_RANGE", "FRAME_H_RANGE",
  "TROUGH_W_RANGE", "TROUGH_H_RANGE", "DEPTH_RANGE", "TUBE_W_RANGE", "TUBE_LEN_RANGE", "TILT_RANGE", "COL_RANGE", "LINE_RANGE",
  "DIM_HEAD_LEN_MM", "HEAD_TRIANGLE", "HEAD_CATALOG"];
const names = ["clampOptions", "mouthHeights", "mercuryGeometry", "uPath", "corner", "cornerAt", "clamp", "catalogPoints", "dimHeadPoints", "dimLineInset"];
const lib = new Function(`${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${[...constants, ...names].join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const MM = lib.MM;

const base = {
  frameW: 70, frameH: 60, troughW: 60, troughH: 20, depth: 15, troughPt: 0.8,
  tubeW: 5.5, tubeLen: 50, tilt: 0, tubePt: 0.4, colH: 30, offsetX: 0, offsetY: 0
};

// 기본값은 그대로 통과한다
assert.deepStrictEqual(lib.clampOptions(base), base, "default options pass through");

// 수조는 틀보다 넓거나 높을 수 없고, 수은 깊이는 수조 높이 이하, 유리관은 수조 너비의 절반 이하
assert.strictEqual(lib.clampOptions({...base, troughW: 90}).troughW, 70, "trough stays inside frame width");
assert.strictEqual(lib.clampOptions({...base, troughH: 80}).troughH, 60, "trough stays inside frame height");
assert.strictEqual(lib.clampOptions({...base, depth: 40}).depth, 20, "depth stops at trough height");
assert.strictEqual(lib.clampOptions({...base, tubeW: 40}).tubeW, 30, "tube is half the trough width at most");
assert.strictEqual(lib.clampOptions({...base, troughW: 20, tubeW: 40}).tubeW, 10, "tube follows a narrow trough");

// 기울기: 입구의 가장 높은 모서리가 수은 면 아래에 남아야 한다
assert.strictEqual(lib.clampOptions({...base, tilt: 60}).tilt, 60, "tilt inside the range passes through");
assert.strictEqual(lib.clampOptions({...base, tilt: 99}).tilt, 60, "tilt caps at its range");
assert.strictEqual(lib.clampOptions({...base, depth: 3, tilt: 60}).tilt, 27, "tilt keeps the mouth under the surface");

// 유리관 길이: 틀 위를 넘지 않고, 수은 기둥과 진공 자리를 담는 길이부터
assert.strictEqual(lib.clampOptions({...base, tubeLen: 200}).tubeLen, 52.5, "tube stops at the frame top");
assert.strictEqual(lib.clampOptions({...base, frameH: 200, tubeLen: 200}).tubeLen, 192.5, "taller frame allows a longer tube");
near(lib.clampOptions({...base, tubeLen: 6}).tubeLen, 11.75, 1e-9, "tube keeps room for the surface and the vacuum");
const tilted = lib.clampOptions({...base, tilt: 30, tubeLen: 200, frameH: 200});
assert.ok((tilted.tubeLen - 2.75) * Math.sin(30 * Math.PI / 180) + 2.75 <= 35 + 1e-9, "tilted tube stays inside the frame width");

// 수은 기둥 높이: 위 둥근 끝 앞에 진공 자리를 남긴다
assert.strictEqual(lib.clampOptions({...base, colH: 99}).colH, 38.25, "column leaves the vacuum");
assert.strictEqual(lib.clampOptions({...base, colH: -4}).colH, 0, "column never negative");

// 기하: 어느 기울기에서도 기둥 윗면은 수은 면 + 기둥 높이(연직), 수평이고, 관은 입구에서 진공 자리 앞까지만 간다
for (const tilt of [-45, -20, 0, 10, 30, 60]) {
  const o = lib.clampOptions({...base, tilt, frameH: 100, frameW: 120, tubeLen: 70, colH: 28});
  const g = lib.mercuryGeometry({
    cx: 300, floorY: 100, troughW: o.troughW * MM, troughH: o.troughH * MM, depth: o.depth * MM,
    tubeW: o.tubeW * MM, tubeLen: o.tubeLen * MM, tilt: o.tilt, colH: o.colH * MM,
    cornerR: lib.CORNER_R_MM * MM, mouthMargin: lib.MOUTH_MARGIN_MM * MM
  });
  const label = `tilt ${tilt}`;
  const surf = 100 + o.depth * MM;
  near(g.surfY, surf, 1e-9, `${label} surface`);
  near(g.colTopY, surf + o.colH * MM, 1e-9, `${label} column top`);
  // 기둥 윗면: 두 점이 같은 높이, 가로 간격 = 관 너비 / cos
  const top = g.column.slice(2);
  near(top[0].anchor[1], g.colTopY, 1e-9, `${label} column top right y`);
  near(top[1].anchor[1], g.colTopY, 1e-9, `${label} column top left y`);
  near(top[0].anchor[0] - top[1].anchor[0], o.tubeW * MM / Math.cos(o.tilt * Math.PI / 180), 1e-9, `${label} column top width`);
  near((top[0].anchor[0] + top[1].anchor[0]) / 2, g.axisX(g.colTopY), 1e-9, `${label} column top centred on the axis`);
  // 입구는 수조 가운데, 관 길이는 입구 가운데에서 막힌 끝까지
  near(g.axisX(g.mouthY), 300, 1e-9, `${label} mouth centred`);
  const cap = g.tube[2].anchor;
  near(Math.hypot(cap[0] - 300, cap[1] - g.mouthY), o.tubeLen * MM, 1e-9, `${label} tube length`);
  // 입구의 가장 높은 모서리가 수은 면 아래, 기둥 윗면은 진공 자리 앞, 틀 안
  const half = o.tubeW * MM / 2;
  assert.ok(g.mouthY + half * Math.abs(g.sinT) <= surf - lib.MOUTH_MARGIN_MM * MM + 1e-9, `${label} mouth under the surface`);
  assert.ok(g.colTopY <= g.capLowY - lib.MIN_VACUUM_MM * MM + 1e-9, `${label} vacuum left above the column`);
  assert.ok(g.capTopY <= 100 + o.frameH * MM + 1e-9, `${label} tube inside the frame top`);
  const capCenterX = (g.tube[1].anchor[0] + g.tube[3].anchor[0]) / 2;
  assert.ok(Math.abs(capCenterX - 300) + half <= o.frameW * MM / 2 + 1e-9, `${label} tube inside the frame width`);
  assert.ok(g.mouthY - half * Math.abs(g.sinT) >= 100 - 1e-9, `${label} mouth above the trough floor`);
}

// 수조: 왼쪽 위에서 둥근 바닥 모서리를 지나 오른쪽 위까지, 수은 채움은 수은 면까지
{
  const g = lib.mercuryGeometry({
    cx: 0, floorY: 0, troughW: 100, troughH: 60, depth: 40, tubeW: 10, tubeLen: 100, tilt: 0, colH: 50,
    cornerR: 8, mouthMargin: 1
  });
  assert.strictEqual(g.troughOutline.length, 6, "trough outline is one open U path");
  assert.deepStrictEqual(g.troughOutline[0].anchor, [-50, 60], "outline starts at the left wall top");
  assert.deepStrictEqual(g.troughOutline[5].anchor, [50, 60], "outline ends at the right wall top");
  assert.deepStrictEqual(g.troughFill[0].anchor, [-50, 40], "mercury fill stops at the surface");
  near(g.troughOutline[2].left[0], -42 - lib.KAPPA * 8, 1e-9, "corner handle uses KAPPA");
}
// 치수선 화살촉: 일러스트레이터 화살촉 4종류(tools/arrowheads.json). 삼각형 머리 길이가 DIM_HEAD_LEN_MM × scale이고 다른 모양도 같은 배율, 위·아래 방향
{
  const {catalog, nearPoints} = require("./arrowhead-catalog.js");
  assert.deepStrictEqual(lib.HEAD_CATALOG, catalog.types.map((t) => ({length: t.length, lineEnd: t.lineEnd, poly: t.poly})), "same data as tools/arrowheads.json");
  const len = lib.DIM_HEAD_LEN_MM * MM;
  const k = len / 8.6;
  for (let shape = 0; shape < 4; shape++) {
    for (const dir of [1, -1]) {
      const h = lib.dimHeadPoints(10, 50, dir, shape, 1);
      assert.strictEqual(h.closed, true);
      nearPoints(h.points, catalog.types[shape].poly.map((p) => [10 + p[0] * k, 50 - dir * p[1] * k]), `shape ${shape} dir ${dir}`);
    }
    nearPoints(lib.dimHeadPoints(10, 50, 1, shape, 2).points, catalog.types[shape].poly.map((p) => [10 + p[0] * 2 * k, 50 - p[1] * 2 * k]), `shape ${shape} at 200%`);
    near(lib.dimLineInset(len, shape), catalog.types[shape].lineEnd * k, 1e-9, `shape ${shape}: line stops at lineEnd`);
    assert.ok(lib.dimLineInset(len, shape) < catalog.types[shape].length * k, `shape ${shape}: line ends inside the head`);
  }
}

// 설정 저장·복원: 저장한 값이 그대로 돌아오고, 형식이 다르거나 범위를 벗어난 값은 무시·보정한다
{
  const ioBase = {...base, headSize: 100, headShape: 0};
  const arrays = ["POSITION_LIMIT_MM", "FRAME_W_RANGE", "FRAME_H_RANGE", "TROUGH_W_RANGE", "TROUGH_H_RANGE", "DEPTH_RANGE",
    "TUBE_W_RANGE", "TUBE_LEN_RANGE", "TILT_RANGE", "COL_RANGE", "LINE_RANGE", "NUMBER_KEYS", "CHOICE_KEYS", "BOOL_KEYS", "TEXT_KEYS", "SPECS", "PREF_KEY", "TEXT_MAX", "HEAD_SHAPES"];
  const ioNames = ["saveSettings", "applySettings", "parseNumber", "roundTo", "clamp"];
  const prefs = {};
  const make = (options) => new Function("app", "options", `${arrays.map(extractVar).join("\n")}\n` +
    `${ioNames.map(extractFunction).join("\n")}\n` +
    "return {save: saveSettings, load: applySettings};")(
    {preferences: {setStringPreference: (k, v) => { prefs[k] = v; }, getStringPreference: (k) => prefs[k] || ""}}, options);
  const saved = {...ioBase, arrowsOn: false, vacuumOn: true, columnOn: false, surfaceOn: true, mercuryOn: false,
    glassOn: true, glassText: "유리관|A", heightOn: false, heightText: "760 mm", previewOn: false, tilt: -15, offsetX: 3.5, headSize: 150, headShape: 2};
  make(saved).save();
  assert.ok(prefs["ObjectMercuryColumn/settings"].startsWith("v2|"), "settings start with the version tag");
  const restored = {...ioBase, arrowsOn: true, heightText: "x", glassText: "y", previewOn: true};
  make(restored).load();
  assert.strictEqual(restored.tilt, -15, "numbers come back");
  assert.strictEqual(restored.offsetX, 3.5, "offset comes back");
  assert.strictEqual(restored.headSize, 150, "head size comes back");
  assert.strictEqual(restored.headShape, 2, "head shape comes back");
  assert.strictEqual(restored.arrowsOn, false, "flags come back");
  assert.strictEqual(restored.previewOn, false, "preview flag comes back");
  assert.strictEqual(restored.glassText, "유리관A", "the separator is stripped from text");
  assert.strictEqual(restored.heightText, "760 mm", "text comes back");
  // 칸 수가 다르면 기본값 그대로
  prefs["ObjectMercuryColumn/settings"] = "v2|1|2|3";
  const untouched = {...ioBase, arrowsOn: true};
  make(untouched).load();
  assert.deepStrictEqual(untouched, {...ioBase, arrowsOn: true}, "a different field count is ignored");
  // 범위를 벗어난 값은 범위 안으로
  prefs["ObjectMercuryColumn/settings"] = "v2|999|60|60|20|15|0.8|5.5|50|0|0.4|30|0|0|999|9|1|1|1|1|1|1|1|1|a|b";
  const clamped = {...ioBase};
  make(clamped).load();
  assert.strictEqual(clamped.frameW, 300, "out-of-range value is clamped");
}
console.log("check-mercury-column: ok");
