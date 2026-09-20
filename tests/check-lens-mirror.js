const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptFile = "스크립트/01_도형/Object_LensMirror.jsx";
const source = fs.readFileSync(path.join(root, scriptFile), "utf8");

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

// 기하 함수는 일러 개체를 만지지 않으므로 그대로 실행해 검사한다
const helpers = ["arcPiece", "linePiece", "lensRadius", "lensPieces", "lensFocalLength", "lensSagitta", "mirrorRadius",
  "mirrorFocalLength", "mirrorSagitta", "mirrorArcPiece", "mirrorSurfaceX", "hatchMarks", "focusSpots", "rayHeights",
  "rayPieces", "extendTo", "signedFocal", "imageOf", "surfaceHit", "principalRays", "nameLabelSpots", "arrowAt", "arcPoints",
  "linePoints", "piecesToPoints", "isSmooth"];
const lib = new Function(helpers.map(extractFunction).join("\n") + `\nreturn { ${helpers.join(", ")} };`)();

const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol);
const nearPoint = (p, q, tol) => near(p[0], q[0], tol) && near(p[1], q[1], tol);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// 조각이 점을 지나는가 (직선 위)
const through = (seg, point, tol) => near((seg.x1 - seg.x0) * (point[1] - seg.y0) - (seg.y1 - seg.y0) * (point[0] - seg.x0), 0, tol === undefined ? 1e-7 : tol);

function pieceStart(piece) {
  if (piece.type === "line") return [piece.x0, piece.y0];
  return [piece.cx + piece.r * Math.cos(piece.a0), piece.cy + piece.r * Math.sin(piece.a0)];
}
function pieceEnd(piece) {
  if (piece.type === "line") return [piece.x1, piece.y1];
  return [piece.cx + piece.r * Math.cos(piece.a1), piece.cy + piece.r * Math.sin(piece.a1)];
}
function pieceMid(piece) {
  assert.strictEqual(piece.type, "arc");
  const a = (piece.a0 + piece.a1) / 2;
  return [piece.cx + piece.r * Math.cos(a), piece.cy + piece.r * Math.sin(a)];
}
// 조각이 끊기지 않고 이어지고 닫힌다
function assertClosedChain(pieces, label) {
  for (let i = 0; i < pieces.length; i++) {
    const next = pieces[(i + 1) % pieces.length];
    assert.ok(nearPoint(pieceEnd(pieces[i]), pieceStart(next), 1e-7), `${label}: piece ${i} must join piece ${i + 1}`);
  }
}
// 3차 베지어 위의 점
function bezierAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

// 파일 규약: F4 반복 기록, 설정 키, 탭 헬퍼, 안내 홈페이지 항목
assert.ok(source.includes('Folder.temp + "/illu_last_script.txt"') && source.includes("__memo.write($.fileName)"), "must record itself for RepeatLast.jsx");
assert.ok(source.includes('var PREF_KEY = "ObjectLensMirror/settings"'), "own preference key");
assert.ok(source.includes('p[0] !== "v5"') && source.includes('var parts = ["v5"]'), "versioned settings string");
assert.ok(/if \(typeof bindTabOrder === "function"\) bindTabOrder\(win\);/.test(source), "tab helper bound before show()");
assert.ok(source.indexOf("bindTabOrder(win)") < source.indexOf("win.show()"), "bindTabOrder must run before win.show()");
assert.ok(source.includes('addRow(positionPanel, "가로 이동", "offsetX"') && source.includes('addRow(positionPanel, "세로 이동", "offsetY"'), "movable preview rows");
assert.ok(source.includes("previewGroup.translate(key === \"offsetX\" ? delta : 0, key === \"offsetY\" ? delta : 0)"), "position rows move the preview instead of rebuilding it");
// 모양 ↔ 초점 거리 연동: 모양 행은 초점 거리를, 초점 거리 행은 두꺼운 쪽을 맞춘다
assert.ok(source.includes("if (isCoupledKey(key)) coupleFocal(key);"), "shape and focal rows are coupled");
assert.ok(source.includes('if (changedKey === "focalLength") {') && source.includes("applyFocalToShape();"), "focal row drives the thickness");
// 물체 사본: 배율·뒤집기 뒤 실제 기하 범위를 재서 밑동을 광축에 맞춘다. 선 두께는 그대로(100%)
assert.ok(source.includes("copy.resize(percent, flipped ? -percent : percent, true, true, true, true, 100, Transformation.CENTER);"), "image copy scaled then re-measured");
assert.ok(source.includes("copy.translate(target[0] - (b[0] + b[2]) / 2, target[1] - (flipped ? b[1] : b[3]));"), "image base lands on the axis");
// 물체 범위는 선·효과를 뺀 기하 범위, 클리핑 그룹은 마스크 범위
assert.ok(source.includes("if (child.clipping) return child.geometricBounds;") && !source.includes("visibleBounds"), "object measured by geometric bounds");
// 스크롤바 드래그가 주는 소수 값을 단위에 맞춘다 (글자 크기 0.5pt)
assert.ok(source.includes("value = Math.round(value / step) * step;"), "row values snap to their step");
assert.ok(source.includes('addRow(shapePanel, "굴절률", "index", 1.5, 2, "", 0.05, false)'), "refractive index 1.5~2.0");
const guide = fs.readFileSync(path.join(root, "docs/assets/app.js"), "utf8");
assert.ok(guide.includes('id: "lens-mirror"') && guide.includes('file: "01_도형/Object_LensMirror.jsx"'), "guide entry");

// 볼록 렌즈(뾰족, 가장자리 0): 두 호가 (0, ±h/2)에서 만나고 꼭짓점은 (±tc/2, 0)
{
  const pieces = lib.lensPieces(30, 6, 0);
  assert.strictEqual(pieces.length, 2);
  assertClosedChain(pieces, "convex sharp");
  assert.ok(nearPoint(pieceStart(pieces[0]), [0, -15]) && nearPoint(pieceEnd(pieces[0]), [0, 15]), "tips on the centre line");
  assert.ok(nearPoint(pieceMid(pieces[0]), [3, 0]) && nearPoint(pieceMid(pieces[1]), [-3, 0]), "apex at half thickness");
  assert.ok(pieces[0].a1 > pieces[0].a0 && pieces[1].a1 > pieces[1].a0, "counter-clockwise");
}

// 볼록 렌즈(가장자리 두께): 위아래 평평한 테두리 (±te/2, ±h/2), 호는 그 모서리에서 꼭짓점 (tc/2, 0)까지
{
  const pieces = lib.lensPieces(24, 8, 1);
  assert.strictEqual(pieces.length, 4);
  assertClosedChain(pieces, "convex rimmed");
  assert.ok(nearPoint(pieceStart(pieces[0]), [0.5, -12]) && nearPoint(pieceEnd(pieces[0]), [0.5, 12]), "right arc spans the rim corners");
  assert.ok(nearPoint(pieceMid(pieces[0]), [4, 0]), "apex at half the centre thickness");
  assert.strictEqual(pieces[1].type, "line");
  assert.ok(nearPoint(pieceStart(pieces[1]), [0.5, 12]) && nearPoint(pieceEnd(pieces[1]), [-0.5, 12]), "flat top rim");
  assert.ok(nearPoint(pieceMid(pieces[2]), [-4, 0]));
  assert.ok(near(pieces[0].r, lib.lensRadius(24, 8, 1)) && near(lib.lensRadius(24, 8, 1), (144 + 3.5 * 3.5) / 7), "surface radius from height and sagitta");
}

// 오목 렌즈: 평평한 끝 (±te/2, ±h/2), 허리 (±tc/2, 0), 호 중심은 렌즈 밖
{
  const pieces = lib.lensPieces(30, 2, 6);
  assert.strictEqual(pieces.length, 4);
  assertClosedChain(pieces, "concave");
  assert.ok(nearPoint(pieceStart(pieces[0]), [-3, 15]) && nearPoint(pieceEnd(pieces[0]), [3, 15]), "flat top edge");
  assert.ok(nearPoint(pieceMid(pieces[1]), [1, 0]) && nearPoint(pieceMid(pieces[3]), [-1, 0]), "waist at half the centre thickness");
  assert.ok(nearPoint(pieceStart(pieces[2]), [3, -15]) && nearPoint(pieceEnd(pieces[2]), [-3, -15]), "flat bottom edge");
  assert.ok(pieces[1].cx > 3 && pieces[3].cx < -3, "arc centres lie outside the lens (concave sides)");
  const touching = lib.lensPieces(30, 0, 6);
  assertClosedChain(touching, "concave with zero waist");
  assert.ok(nearPoint(pieceMid(touching[1]), [0, 0]), "zero centre thickness lets the arcs touch");
}

// 초점 거리 ↔ 모양: 렌즈 f = R / 2(n−1), 거울 f = R / 2. 반대로 f에서 휨(sagitta)을 되돌리면 같은 모양
{
  const R = lib.lensRadius(24, 8, 1);
  assert.ok(near(lib.lensFocalLength(24, 8, 1, 1.5), R), "n = 1.5 gives f = R");
  assert.ok(near(lib.lensFocalLength(24, 8, 1, 2), R / 2), "n = 2 halves the focal length");
  assert.ok(near(lib.lensFocalLength(24, 1, 8, 1.5), R), "concave lens with the same sagitta has the same |f|");
  assert.ok(lib.lensFocalLength(24, 5, 5, 1.5) >= 1e9, "flat surfaces: no focus");
  const sag = lib.lensSagitta(24, lib.lensFocalLength(24, 8, 1, 1.5), 1.5);
  assert.ok(near(1 + 2 * sag, 8), "sagitta from f rebuilds the centre thickness");
  assert.ok(near(lib.lensSagitta(24, 24 / (4 * 0.5), 1.5), 12), "shortest f (R = h/2) is a half circle");
  assert.ok(near(lib.mirrorFocalLength(24, 2.5), lib.mirrorRadius(24, 2.5).R / 2), "mirror f = R/2");
  assert.ok(near(lib.mirrorSagitta(24, lib.mirrorFocalLength(24, 2.5)), 2.5), "bulge from f rebuilds the bulge");
  // 예: 높이 24, 가운데 8, 가장자리 1, n=1.5 → f≈22: 좌우 길이 40 안에 초점이 든다
  assert.ok(near(lib.lensFocalLength(24, 8, 1, 1.5), 22.32, 0.01));
}

// 거울: 꼭짓점이 원점, 끝은 (∓s, ±h/2). 볼록은 빛 쪽으로 불룩
{
  const concave = lib.mirrorArcPiece(3, 30, 5);
  assert.ok(nearPoint(pieceMid(concave), [0, 0]) && nearPoint(pieceStart(concave), [-5, -15]) && nearPoint(pieceEnd(concave), [-5, 15]), "concave mirror ends bend toward the light");
  const convex = lib.mirrorArcPiece(2, 30, 5);
  assert.ok(nearPoint(pieceMid(convex), [0, 0]) && nearPoint(pieceStart(convex), [5, 15]) && nearPoint(pieceEnd(convex), [5, -15]), "convex mirror ends bend away from the light");
  assert.ok(near(lib.mirrorSurfaceX(3, 30, 5, 15), -5) && near(lib.mirrorSurfaceX(3, 30, 5, 0), 0), "concave surface");
  assert.ok(near(lib.mirrorSurfaceX(2, 30, 5, 15), 5) && near(lib.mirrorSurfaceX(2, 30, 5, -15), 5), "convex surface");
  // 휨은 높이의 절반까지 (반원)
  assert.ok(near(lib.mirrorRadius(30, 40).R, 15) && near(lib.mirrorRadius(30, 40).s, 15), "bulge capped at a half circle");
}

// 뒷면 빗금: 호 위에서 시작해 뒷면(오른쪽) 아래로 45°, 길이·간격 같은 값
{
  for (const kind of [2, 3]) {
    const marks = lib.hatchMarks(kind, 30, 5, 1.5, 1.5);
    const { R } = lib.mirrorRadius(30, 5);
    const centre = kind === 3 ? [-R, 0] : [R, 0];
    const theta = Math.atan2(15, R - 5);
    assert.strictEqual(marks.length, Math.floor(2 * theta * R / 1.5), `kind ${kind}: one mark per pitch`);
    for (const mark of marks) {
      assert.ok(near(dist([mark.x0, mark.y0], centre), R, 1e-9), `kind ${kind}: mark starts on the arc`);
      assert.ok(near(dist([mark.x0, mark.y0], [mark.x1, mark.y1]), 1.5), `kind ${kind}: mark length`);
      assert.ok(mark.x1 > mark.x0, `kind ${kind}: mark leans behind the mirror`);
    }
    const middle = marks[Math.floor(marks.length / 2)];
    const direction = [middle.x1 - middle.x0, middle.y1 - middle.y0];
    assert.ok(near(Math.atan2(direction[1], direction[0]), -Math.PI / 4, 0.15), `kind ${kind}: vertex mark runs down-right`);
    const ys = marks.map((mark) => mark.y0);
    assert.ok(near(ys[0], -ys[ys.length - 1], 1e-9), `kind ${kind}: marks centred on the axis`);
  }
}

// 초점 자리와 평행 광선 높이
assert.deepStrictEqual(lib.focusSpots(0, 20), [[-20, 0], [20, 0]]);
assert.deepStrictEqual(lib.focusSpots(1, 20), [[-20, 0], [20, 0]]);
assert.deepStrictEqual(lib.focusSpots(2, 20), [[20, 0]]);
assert.deepStrictEqual(lib.focusSpots(3, 20), [[-20, 0]]);
assert.deepStrictEqual(lib.rayHeights(5, 4, 15), [-8, -4, 0, 4, 8]);
assert.deepStrictEqual(lib.rayHeights(4, 4, 15), [-6, -2, 2, 6]);
assert.deepStrictEqual(lib.rayHeights(5, 10, 15), [-10, 0, 10], "rays outside the lens height are dropped");
assert.deepStrictEqual(lib.rayHeights(1, 4, 15), [0]);

// 평행 광선: 렌즈는 x=0에서 꺾여 초점을 지나거나 초점에서 나온 것처럼, 거울은 거울면에서 반사
{
  const geom = { h: 30, s: 5 };
  const convexLens = lib.rayPieces(0, 8, 20, 40, geom);
  assert.strictEqual(convexLens.real.length, 2);
  assert.deepStrictEqual(convexLens.real[0], lib.linePiece(-40, 8, 0, 8), "incoming ray reaches the centre line");
  assert.ok(near(convexLens.real[1].x1, 40) && near(convexLens.real[1].y1, -8), "refracted ray crosses the axis at F and continues");
  assert.ok(through(convexLens.real[1], [20, 0]), "refracted ray passes through F");
  assert.strictEqual(convexLens.virtual.length, 0);
  assert.deepStrictEqual(lib.rayPieces(0, 0, 20, 40, geom).real[1], lib.linePiece(0, 0, 40, 0), "axial ray goes straight");

  const concaveLens = lib.rayPieces(1, 8, 20, 40, geom);
  assert.ok(near(concaveLens.real[1].x1, 40) && near(concaveLens.real[1].y1, 24), "diverging ray as if from the near focus");
  assert.ok(through(concaveLens.real[1], [-20, 0]));
  assert.deepStrictEqual(concaveLens.virtual, [lib.linePiece(0, 8, -20, 0)], "virtual path back to F");
  assert.strictEqual(lib.rayPieces(1, 0, 20, 40, geom).virtual.length, 0, "no virtual path on the axis");

  const convexMirror = lib.rayPieces(2, 8, 20, 40, geom);
  const hitX = lib.mirrorSurfaceX(2, 30, 5, 8);
  assert.ok(hitX > 0 && near(convexMirror.real[0].x1, hitX), "ray stops at the mirror surface");
  assert.ok(near(convexMirror.real[1].x1, -40) && convexMirror.real[1].y1 > 8, "reflected ray goes back left and spreads");
  assert.ok(through(convexMirror.real[1], [20, 0]), "reflected ray lines up with the virtual focus behind the mirror");
  assert.deepStrictEqual(convexMirror.virtual, [lib.linePiece(hitX, 8, 20, 0)]);

  const concaveMirror = lib.rayPieces(3, 8, 20, 40, geom);
  const hitX3 = lib.mirrorSurfaceX(3, 30, 5, 8);
  assert.ok(hitX3 < 0 && near(concaveMirror.real[0].x1, hitX3));
  assert.ok(near(concaveMirror.real[1].x1, -40) && concaveMirror.real[1].y1 < 0, "reflected ray crosses the axis at F");
  assert.ok(through(concaveMirror.real[1], [-20, 0]));
  assert.strictEqual(concaveMirror.virtual.length, 0);
  assert.strictEqual(lib.rayPieces(3, 0, 20, 40, geom).real.length, 1, "axial mirror ray keeps only the incoming half");
  // 초점 거리가 거울 휨보다 짧아 x=-L에 못 닿으면 길이 L만큼만 긋는다
  const shallow = lib.rayPieces(3, 14, 2, 40, geom);
  assert.ok(near(dist([shallow.real[1].x0, shallow.real[1].y0], [shallow.real[1].x1, shallow.real[1].y1]), 40));
  assert.deepStrictEqual(lib.extendTo([0, 3], [2, 1], 10, 40), [10, 8]);
}

// 상의 자리: 1/f = 1/u + 1/v. 렌즈는 +v가 오른쪽 실상, 거울은 +v가 앞쪽 실상. 배율 −v/u
{
  assert.deepStrictEqual([lib.signedFocal(0, 5), lib.signedFocal(1, 5), lib.signedFocal(2, 5), lib.signedFocal(3, 5)], [5, -5, -5, 5]);
  const real = lib.imageOf(0, 30, 20);         // 볼록 렌즈, 초점 밖 → 실상, 거꾸로, 확대
  assert.ok(real.finite && real.real && near(real.x, 60) && near(real.m, -2));
  const virt = lib.imageOf(0, 10, 20);         // 초점 안 → 허상, 바로, 확대, 물체보다 멀리
  assert.ok(virt.finite && !virt.real && near(virt.x, -20) && near(virt.m, 2));
  assert.strictEqual(lib.imageOf(0, 20, 20).finite, false, "object at F: no image");
  const concave = lib.imageOf(1, 30, 20);      // 오목 렌즈 → 허상, 바로, 축소, 렌즈와 물체 사이
  assert.ok(concave.finite && !concave.real && near(concave.x, -12) && near(concave.m, 0.4));
  const concaveMirror = lib.imageOf(3, 30, 20); // 오목 거울, 초점 밖 → 앞쪽 실상, 거꾸로
  assert.ok(concaveMirror.real && near(concaveMirror.x, -60) && near(concaveMirror.m, -2));
  const mirrorVirt = lib.imageOf(3, 10, 20);   // 초점 안 → 뒤쪽 허상, 바로, 확대
  assert.ok(!mirrorVirt.real && near(mirrorVirt.x, 20) && near(mirrorVirt.m, 2));
  const convexMirror = lib.imageOf(2, 30, 20); // 볼록 거울 → 뒤쪽 허상, 바로, 축소
  assert.ok(!convexMirror.real && near(convexMirror.x, 12) && near(convexMirror.m, 0.4));
  assert.strictEqual(lib.imageOf(0, 20.0000001, 20).finite, false, "practically infinite image is treated as none");
}

// 닿는 점: 렌즈는 x=0, 거울은 꼭짓점에 가까운 원과의 교점. 높이 밖은 null
{
  const geom = { h: 24, s: 2.5 };
  assert.deepStrictEqual(lib.surfaceHit(0, geom, [-30, 10], [1, 0]), [0, 10]);
  assert.ok(nearPoint(lib.surfaceHit(0, geom, [-30, 10], [30, -10]), [0, 0]));
  assert.strictEqual(lib.surfaceHit(0, geom, [-30, 20], [1, 0]), null, "above the lens");
  assert.strictEqual(lib.surfaceHit(0, geom, [-30, 10], [-1, 0]), null, "going away from the lens");
  const hit = lib.surfaceHit(3, geom, [-30, 10], [1, 0]);
  assert.ok(nearPoint(hit, [lib.mirrorSurfaceX(3, 24, 2.5, 10), 10]), "parallel ray hits the concave arc at its own height");
  assert.ok(nearPoint(lib.surfaceHit(3, geom, [-30, 10], [30, -10]), [0, 0], 1e-7), "ray aimed at the vertex hits the vertex");
  const convexHit = lib.surfaceHit(2, geom, [-30, 10], [1, 0]);
  assert.ok(nearPoint(convexHit, [lib.mirrorSurfaceX(2, 24, 2.5, 10), 10]));
  assert.strictEqual(lib.surfaceHit(2, geom, [-30, 20], [1, 0]), null, "misses the mirror");
}

// 주광선: 평행 → 초점, 중심 → 직진, 초점 → 평행. 세 광선이 상점에서 만난다(실상) / 가상 경로가 상점에서 만난다(허상)
{
  const geom = { h: 60, s: 2.5 };   // 초점 광선이 y=-20에 닿으므로 높이를 넉넉히
  const real = lib.principalRays(0, 30, 10, 20, 100, geom);   // 상: (60, -20)
  assert.strictEqual(real.length, 3);
  const [parallel, centre, focal] = real;
  assert.deepStrictEqual(parallel.real[0], lib.linePiece(-30, 10, 0, 10));
  assert.ok(through(parallel.real[1], [20, 0]), "parallel ray refracts through the far focus");
  assert.ok(nearPoint([centre.real[0].x1, centre.real[0].y1], [0, 0]) && through(centre.real[1], [-30, 10]), "centre ray goes straight");
  assert.ok(through(focal.real[0], [-20, 0]) && near(focal.real[1].y0, focal.real[1].y1), "focal ray leaves parallel to the axis");
  for (const ray of real) {
    assert.ok(through(ray.real[1], [60, -20]), "every refracted ray passes through the image point");
    assert.ok(near(ray.real[1].x1, 100), "refracted rays run to the right edge");
    assert.strictEqual(ray.virtual.length, 0);
  }
  const virt = lib.principalRays(0, 10, 10, 20, 100, geom);   // 상: (-20, 20) 허상
  assert.strictEqual(virt.length, 3);
  for (const ray of virt) {
    assert.ok(near(ray.real[1].x1, 100) && ray.real[1].x1 > ray.real[1].x0, "refracted rays still travel right");
    assert.deepStrictEqual(ray.virtual, [lib.linePiece(ray.real[0].x1, ray.real[0].y1, -20, 20)], "dashed path back to the virtual image");
  }
  assert.ok(virt[2].real[0].x1 > virt[2].real[0].x0 && virt[2].real[0].y1 > 10, "focal ray of an object inside F heads up toward the lens");
  const atFocus = lib.principalRays(0, 20, 10, 20, 100, geom);
  assert.strictEqual(atFocus.length, 2, "object at F: the focal ray is vertical and dropped");
  const slope = (seg) => (seg.y1 - seg.y0) / (seg.x1 - seg.x0);
  assert.ok(near(slope(atFocus[0].real[1]), slope(atFocus[1].real[1])), "refracted rays are parallel");
  assert.strictEqual(lib.principalRays(0, 30, 20, 20, 100, { h: 24, s: 2.5 }).length, 1, "rays hitting outside the lens height are dropped");
  // 실상이 좌우 길이 밖이면 상점을 지나 overshoot만큼 더 긋고, 허상·범위 안 실상은 좌우 길이까지만
  for (const ray of lib.principalRays(0, 30, 10, 20, 40, geom, 8)) assert.ok(near(ray.real[1].x1, 68), "rays overshoot a far real image");
  for (const ray of lib.principalRays(3, 30, 10, 20, 40, geom, 8)) assert.ok(near(ray.real[1].x1, -68), "mirror rays overshoot to the left");
  for (const ray of lib.principalRays(0, 10, 10, 20, 40, geom, 8)) assert.ok(near(ray.real[1].x1, 40), "virtual image: rays stop at the reach");

  // 오목 거울 실상: 반사 광선이 앞쪽 상점을 지나 왼쪽으로 간다. 꼭짓점 광선은 광축에 대칭
  const mirror = lib.principalRays(3, 30, 10, 20, 100, geom);   // 상: (-60, -20)
  assert.strictEqual(mirror.length, 3);
  for (const ray of mirror) {
    assert.ok(through(ray.real[1], [-60, -20], 1e-6), "reflected rays meet at the real image");
    assert.ok(near(ray.real[1].x1, -100), "reflected rays run to the left edge");
  }
  assert.ok(nearPoint([mirror[1].real[0].x1, mirror[1].real[0].y1], [0, 0], 1e-7) && near(slope(mirror[1].real[1]), 10 / 30), "vertex ray reflects symmetrically");
  // 볼록 거울: 허상이 뒤에, 가상 경로가 거기로
  const convex = lib.principalRays(2, 30, 10, 20, 100, geom);   // 상: (12, 4)
  for (const ray of convex) {
    assert.ok(ray.real[1].x1 < ray.real[1].x0, "reflected rays go left");
    assert.ok(nearPoint([ray.virtual[0].x1, ray.virtual[0].y1], [12, 4]));
  }
}

// 물체·상 이름: 도형 가운데, 바로 선 도형은 광축 아래 1mm(글자 위), 거꾸로 매달린 실상은 광축 위 1mm(글자 아래)
{
  const real = lib.nameLabelSpots(45, lib.imageOf(0, 45, 22.32), 1);
  assert.deepStrictEqual(real[0], { text: "물체", x: -45, y: -1, above: false });
  assert.ok(real[1].text === "실상" && near(real[1].y, 1) && real[1].above === true && near(real[1].x, lib.imageOf(0, 45, 22.32).x));
  const virt = lib.nameLabelSpots(12, lib.imageOf(0, 12, 22.32), 1);
  assert.ok(virt[1].text === "허상" && near(virt[1].y, -1) && virt[1].above === false);
  const mirrorVirt = lib.nameLabelSpots(8, lib.imageOf(3, 8, 15), 1);
  assert.ok(mirrorVirt[1].text === "허상" && mirrorVirt[1].x > 0 && mirrorVirt[1].above === false, "upright virtual image behind a mirror is labelled below");
  assert.strictEqual(lib.nameLabelSpots(20, { finite: false }, 1).length, 1, "no image, no image label");
  assert.ok(source.includes('addCheck(focusChecks, "물체·상 이름", "nameLabels"') && source.includes("var nameFont = findTextFont([ENG_FONT_NAME]);"), "name label option in GSMediumB1");
  assert.ok(source.includes("var NAME_GAP_MM = 1;"), "1mm gap");
}

// 화살촉: 중심선에서 정한 거리(x)에, 진행 방향으로, 조각이 거기까지 안 가면 없음
{
  const tri = lib.arrowAt(lib.linePiece(-40, 3, 0, 3), -12, 1.5);
  assert.ok(nearPoint(tri[0], [-11.25, 3]) && nearPoint(tri[1], [-12.75, 3.6]) && nearPoint(tri[2], [-12.75, 2.4]), "centred on x = -12, pointing right");
  const slanted = lib.arrowAt(lib.linePiece(0, 0, 30, 40), 6, 1.5);
  assert.ok(nearPoint(slanted[0], [6 + 0.45, 8 + 0.6]), "tip along the segment direction");
  assert.strictEqual(lib.arrowAt(lib.linePiece(-40, 3, 0, 3), 5, 1.5), null, "beyond the segment");
  assert.strictEqual(lib.arrowAt(lib.linePiece(-40, 3, 0, 3), -0.2, 1.5), null, "too close to the end for the triangle");
  assert.strictEqual(lib.arrowAt(lib.linePiece(0, 0, 1, 0), 0.5, 1.5), null, "segment shorter than the arrow");
  const back = lib.arrowAt(lib.linePiece(0, 0, -40, -10), -12, 1.5);
  assert.ok(back[0][0] < back[1][0], "leftward segment points left");
}

// 호 → 베지어: 90°씩 나누고 가운데가 원 위에 있다 (오차 0.03% 이내)
{
  const quarter = lib.arcPoints(lib.arcPiece(0, 0, 10, 0, Math.PI / 2));
  assert.strictEqual(quarter.length, 2);
  const mid = bezierAt(quarter[0].anchor, quarter[0].right, quarter[1].left, quarter[1].anchor, 0.5);
  assert.ok(near(dist(mid, [0, 0]), 10, 0.003));
  const back = lib.arcPoints(lib.arcPiece(0, 0, 10, Math.PI / 2, -Math.PI / 4));
  assert.strictEqual(back.length, 3, "135° sweep splits in two");
  assert.ok(nearPoint(back[2].anchor, [10 * Math.SQRT1_2, -10 * Math.SQRT1_2]));
  const backMid = bezierAt(back[0].anchor, back[0].right, back[1].left, back[1].anchor, 0.5);
  assert.ok(near(dist(backMid, [0, 0]), 10, 0.003) && backMid[0] > 0 && backMid[1] > 0, "clockwise sweep bends the right way");
}

// 조각 → 점 목록: 맞닿은 끝점을 합치고 닫힌 패스는 마지막 점을 첫 점에 합친다. 테두리 모서리는 코너
{
  const sharp = lib.piecesToPoints(lib.lensPieces(30, 6, 0), true);
  assert.strictEqual(sharp.length, 2, "two 45° arcs share their tips");
  assert.ok(sharp.every((pt) => !lib.isSmooth(pt)), "sharp tips are corners");
  const rimmed = lib.piecesToPoints(lib.lensPieces(24, 8, 1), true);
  assert.strictEqual(rimmed.length, 4);
  assert.ok(rimmed.every((pt) => !lib.isSmooth(pt)), "rim corners are corners");
  const concave = lib.piecesToPoints(lib.lensPieces(30, 2, 6), true);
  assert.strictEqual(concave.length, 4);
  const open = lib.piecesToPoints([lib.mirrorArcPiece(3, 30, 5)], false);
  assert.ok(nearPoint(open[0].left, open[0].anchor) && nearPoint(open[open.length - 1].right, open[open.length - 1].anchor), "open arc has no dangling handles");
  const smoothArc = lib.piecesToPoints([lib.arcPiece(0, 0, 10, 0, Math.PI)], false);
  assert.ok(lib.isSmooth(smoothArc[1]), "interior arc point is smooth");
}

console.log("check-lens-mirror: ok");
