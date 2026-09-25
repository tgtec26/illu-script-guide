const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_UTube.jsx");
const source = fs.readFileSync(scriptPath, "utf8");

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

const constants = ["KAPPA", "MIN_INNER_RADIUS_MM", "BORE_RANGE", "GLASS_RANGE"];
const names = ["clampOptions", "tubeGeometry", "corner", "arc", "clamp"];
const lib = new Function(`${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${[...constants, ...names].join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const nearPoint = (p, q, label) => { near(p[0], q[0], 1e-9, `${label} x`); near(p[1], q[1], 1e-9, `${label} y`); };
const isCorner = (p) => p.left[0] === p.anchor[0] && p.left[1] === p.anchor[1] &&
  p.right[0] === p.anchor[0] && p.right[1] === p.anchor[1];

// 반원: 세 점, 핸들 길이 KAPPA·r, 곡선 가운데(t = 0.5)가 원 위에 놓인다
{
  const a = lib.arc(10, 20, 6, 1);
  assert.strictEqual(a.length, 3);
  nearPoint(a[0].anchor, [4, 20], "arc start");
  nearPoint(a[1].anchor, [10, 14], "arc bottom");
  nearPoint(a[2].anchor, [16, 20], "arc end");
  near(a[0].right[1], 20 - lib.KAPPA * 6, 1e-9, "start handle points down");
  near(a[1].left[0], 10 - lib.KAPPA * 6, 1e-9, "bottom left handle");
  near(a[1].right[0], 10 + lib.KAPPA * 6, 1e-9, "bottom right handle");
  const bezier = (p0, p1, p2, p3, t) => p0 * (1 - t) ** 3 + 3 * p1 * (1 - t) ** 2 * t + 3 * p2 * (1 - t) * t ** 2 + p3 * t ** 3;
  const mx = bezier(a[0].anchor[0], a[0].right[0], a[1].left[0], a[1].anchor[0], 0.5);
  const my = bezier(a[0].anchor[1], a[0].right[1], a[1].left[1], a[1].anchor[1], 0.5);
  near(Math.hypot(mx - 10, my - 20), 6, 0.002, "quarter arc midpoint stays on the circle");
  // 위로 볼록: y가 늘어난다
  const u = lib.arc(10, 20, 6, 1, true);
  nearPoint(u[1].anchor, [10, 26], "upward arc top");
  near(u[0].right[1], 20 + lib.KAPPA * 6, 1e-9, "start handle points up");
  // 반대 방향은 시작·끝이 바뀐다
  const b = lib.arc(10, 20, 6, -1);
  nearPoint(b[0].anchor, [16, 20], "reversed arc start");
  nearPoint(b[2].anchor, [4, 20], "reversed arc end");
}

// 값 줄이기: 높이 ≥ 너비/2, 관 두께 ≤ 너비/2 − 안쪽 최소 반지름, 높이 차 ≤ 높이 − 너비/2 − 뚜껑 반원(관 두께/2),
// 액체는 반원 끝 ~ 관 꼭대기(막힌 관은 뚜껑 반원 시작)
{
  const base = {width: 20, height: 60, bore: 4, diff: 15, closedLeft: true, sameLevel: false, levelLeft: 30, levelRight: 40};
  const ok = lib.clampOptions(base);
  assert.deepStrictEqual(ok, {width: 20, height: 60, bore: 4, glass: 0, diff: 15, closedLeft: true, levelLeft: 30, levelRight: 40},
    "values inside the range pass through");
  // 유리 두께: 범위 안이면 그대로, 안쪽 반지름(너비/2 − 관 두께)의 두 배까지만
  assert.strictEqual(lib.clampOptions({...base, glass: 1.5}).glass, 1.5, "glass inside the range passes through");
  assert.strictEqual(lib.clampOptions({...base, glass: 9}).glass, lib.GLASS_RANGE[1], "glass caps at its range");
  assert.strictEqual(lib.clampOptions({...base, bore: 9, glass: 5}).glass, 2, "glass leaves the inner glass centre line");
  assert.strictEqual(lib.clampOptions({...base, glass: -1}).glass, 0, "glass never negative");

  assert.strictEqual(lib.clampOptions({...base, bore: 12}).bore, 10 - lib.MIN_INNER_RADIUS_MM, "bore leaves the inner radius");
  assert.strictEqual(lib.clampOptions({...base, width: 2, bore: 3}).bore, lib.BORE_RANGE[0], "bore never drops below its minimum");
  assert.strictEqual(lib.clampOptions({...base, height: 5}).height, 10, "height holds the semicircle");
  assert.strictEqual(lib.clampOptions({...base, diff: 55}).diff, 48, "short arm keeps the bend top plus its rounded cap");
  assert.strictEqual(lib.clampOptions({...base, closedLeft: false, diff: 55}).diff, 0, "U-tube has no height difference");

  assert.strictEqual(lib.clampOptions({...base, levelLeft: 2}).levelLeft, 10, "liquid starts at the bend top");
  assert.strictEqual(lib.clampOptions({...base, levelLeft: 50}).levelLeft, 43, "closed arm caps the left level where the rounded cap starts");
  assert.strictEqual(lib.clampOptions({...base, levelRight: 70}).levelRight, 60, "open arm caps the right level at the height");
  assert.strictEqual(lib.clampOptions({...base, closedLeft: false, levelLeft: 50}).levelLeft, 50, "U-tube left arm is full height");

  const same = lib.clampOptions({...base, sameLevel: true, levelLeft: 50, levelRight: 10});
  assert.strictEqual(same.levelLeft, 43, "same level follows the left value, capped by the lower arm");
  assert.strictEqual(same.levelRight, 43, "same level copies to the right");
}

// U자관: 바깥·안쪽 열린 패스 둘, 액체 닫힌 패스, 막은 바닥 가운데를 관 두께만큼 가로지른다
{
  const g = lib.tubeGeometry({left: 0, top: 100, width: 40, height: 100, bore: 6, diff: 0,
    closedLeft: false, levelLeft: 60, levelRight: 40, membrane: true});
  assert.strictEqual(g.outlines.length, 2);
  const [outer, inner] = g.outlines;
  assert.strictEqual(outer.length, 5);
  nearPoint(outer[0].anchor, [0, 100], "outer starts at the left top");
  nearPoint(outer[1].anchor, [0, 20], "outer wall meets the bend at width/2 above the bottom");
  nearPoint(outer[2].anchor, [20, 0], "outer bottom");
  nearPoint(outer[4].anchor, [40, 100], "outer ends at the right top");
  assert.strictEqual(inner.length, 5);
  nearPoint(inner[0].anchor, [34, 100], "inner starts at the right top, one bore in");
  nearPoint(inner[2].anchor, [20, 6], "inner bottom sits one bore above the outer bottom");
  nearPoint(inner[4].anchor, [6, 100], "inner ends at the left top");
  assert.ok(isCorner(outer[0]) && isCorner(outer[4]) && isCorner(inner[0]) && isCorner(inner[4]), "open ends are corners");

  // 액체: 왼쪽 60, 오른쪽 40 높이. 바깥 벽 → 바깥 반원 → 오른쪽 면 → 안쪽 반원 → 안쪽 벽
  const liquid = g.liquid;
  assert.strictEqual(liquid.length, 2 + 3 + 3 + 2, "liquid has two corners per side plus two arcs");
  nearPoint(liquid[0].anchor, [0, 60], "left surface on the outer wall");
  nearPoint(liquid[1].anchor, [0, 20], "outer arc start");
  nearPoint(liquid[3].anchor, [40, 20], "outer arc end");
  nearPoint(liquid[4].anchor, [40, 40], "right surface on the outer wall");
  nearPoint(liquid[5].anchor, [34, 40], "right surface on the inner wall");
  nearPoint(liquid[6].anchor, [34, 20], "inner arc start");
  nearPoint(liquid[8].anchor, [6, 20], "inner arc end");
  nearPoint(liquid[9].anchor, [6, 60], "left surface on the inner wall");

  assert.deepStrictEqual(g.membrane, [[20, 0], [20, 6]], "membrane spans the bore at the bend centre");
  assert.strictEqual(lib.tubeGeometry({left: 0, top: 100, width: 40, height: 100, bore: 6, diff: 0,
    closedLeft: false, levelLeft: 60, levelRight: 40, membrane: false}).membrane, null);
}

// J자관: 윤곽은 열린 패스 하나. 오른쪽 위에서 시작해 바깥 반원, 시험관 바닥처럼 둥근 왼쪽 뚜껑 반원(반지름 = 관 두께/2),
// 안쪽 반원을 지나 오른쪽 안쪽 위에서 끝난다. leftTop(= top − diff)은 뚜껑 반원의 꼭대기다
{
  const g = lib.tubeGeometry({left: 0, top: 100, width: 40, height: 100, bore: 6, diff: 30,
    closedLeft: true, levelLeft: 20, levelRight: 20, membrane: false});
  assert.strictEqual(g.outlines.length, 1);
  const o = g.outlines[0];
  assert.strictEqual(o.length, 11);
  nearPoint(o[0].anchor, [40, 100], "starts at the right outer top");
  nearPoint(o[1].anchor, [40, 20], "outer arc start");
  nearPoint(o[2].anchor, [20, 0], "outer bottom");
  nearPoint(o[3].anchor, [0, 20], "outer arc end");
  nearPoint(o[4].anchor, [0, 67], "cap arc starts half a bore below the closed top");
  nearPoint(o[5].anchor, [3, 70], "cap top is the closed arm top, diff below the open arm");
  nearPoint(o[6].anchor, [6, 67], "cap arc ends on the inner wall");
  near(o[4].right[1], 67 + lib.KAPPA * 3, 1e-9, "cap start handle points up");
  nearPoint(o[7].anchor, [6, 20], "inner arc start");
  nearPoint(o[9].anchor, [34, 20], "inner arc end");
  nearPoint(o[10].anchor, [34, 100], "ends at the right inner top");

  // 액체 면이 반원 끝과 같은 높이면 모서리 점을 더하지 않는다
  assert.strictEqual(g.liquid.length, 6, "liquid at the bend top is just the two arcs");
  nearPoint(g.liquid[0].anchor, [0, 20], "outer arc start");
  nearPoint(g.liquid[5].anchor, [6, 20], "inner arc end closes back to the start");
}

// 유리: 윤곽만 벽에서 두께 절반만큼 바깥(액체 반대쪽)으로 옮긴다. 액체·막은 그대로
{
  const base = {left: 0, top: 100, width: 40, height: 100, bore: 6, diff: 0, closedLeft: false, levelLeft: 60, levelRight: 40, membrane: true};
  const g = lib.tubeGeometry({...base, glass: 2});
  const [outer, inner] = g.outlines;
  nearPoint(outer[0].anchor, [-1, 100], "outer glass centre starts half a thickness outside");
  nearPoint(outer[2].anchor, [20, -1], "outer arc radius grows by half a thickness");
  nearPoint(outer[4].anchor, [41, 100], "outer ends outside the right wall");
  nearPoint(inner[0].anchor, [33, 100], "inner glass centre starts half a thickness beyond the bore wall, toward the U centre");
  nearPoint(inner[2].anchor, [20, 7], "inner arc radius shrinks by half a thickness");
  nearPoint(inner[4].anchor, [7, 100], "inner ends beyond the left bore wall, toward the U centre");
  assert.deepStrictEqual(g.liquid.map((p) => p.anchor), lib.tubeGeometry(base).liquid.map((p) => p.anchor), "liquid ignores the glass");
  assert.deepStrictEqual(g.membrane, [[20, 0], [20, 6]], "membrane ignores the glass");

  const j = lib.tubeGeometry({...base, glass: 2, diff: 30, closedLeft: true, levelLeft: 20, levelRight: 20}).outlines[0];
  nearPoint(j[0].anchor, [41, 100], "J outer starts outside the right wall");
  nearPoint(j[4].anchor, [-1, 67], "J cap arc starts half a thickness outside");
  nearPoint(j[5].anchor, [3, 71], "J cap top moves up by half a thickness");
  nearPoint(j[6].anchor, [7, 67], "J cap arc ends half a thickness toward the U centre");
  nearPoint(j[10].anchor, [33, 100], "J ends beyond the right bore wall, toward the U centre");
}

// 다이얼로그 규칙: 설정 저장 키, 미리보기 이동 행, 탭 헬퍼, 마지막 실행 메모, 파선 막
assert.ok(source.includes('var PREF_KEY = "ObjectUTube/settings";'));
assert.ok(source.includes('addValueRow(positionPanel, "가로 이동", "mm"'));
assert.ok(source.includes('addValueRow(positionPanel, "세로 이동", "mm"'));
assert.ok(source.includes('if (typeof bindTabOrder === "function") bindTabOrder(dlg);'));
assert.ok(source.includes('Folder.temp + "/illu_last_script.txt"'));
assert.ok(source.includes("var MEMBRANE_DASH = [2, 1];"), "membrane is a 2pt/1pt dashed line");
assert.ok(source.includes('liquidPanel.add("checkbox", undefined, "좌우 같은 높이")'));
assert.ok(source.includes('addValueRow(tubePanel, "막 굵기", "pt", membraneWeightPt'), "membrane weight row");
assert.ok(source.includes('addValueRow(liquidPanel, "액체 색", "K", liquidK, K_RANGE[0], K_RANGE[1], 10, 0)'),
  "liquid K row steps by 10");
assert.ok(source.includes("styleStroke(line, black, membraneWeightPt, MEMBRANE_DASH)"), "membrane uses its own weight");
assert.ok(source.includes("liquid.fillColor = makeColor(liquidK)"), "liquid fill follows the K row");
assert.ok(source.includes('if (p[0] !== "v3" || p.length !== 14) return;'), "settings tag bumped for the glass field");
assert.ok(source.includes('addValueRow(tubePanel, "유리 두께", "mm", glassMm, GLASS_RANGE[0], GLASS_RANGE[1], 0.1, 1)'), "glass row");
assert.ok(source.includes("var RIM_SCALE = 1.25;"), "rim beads like the glassware script");
assert.ok(source.includes("drawGlassWall(previewGroup, geometry.outlines[i], o.glass * MM)"), "thick glass drawn per outline");
assert.ok(source.includes("var layers = [[100, glass + LINE_WIDTH_PT * 2], [0, glass]];"), "black then white layers");

console.log("check-u-tube: ok");
