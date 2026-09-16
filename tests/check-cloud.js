const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_Cloud.jsx");
const libraryPath = path.join(root, "스크립트", "01_도형", "Object_Cloud_library.jsxinc");
const source = fs.readFileSync(scriptPath, "utf8");
const librarySource = fs.readFileSync(libraryPath, "utf8");

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

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 1. 라이브러리: 사용자 구름 9개. 역할은 cloud/shadow1/shadow2/outline/line, 좌표는 높이 1 기준 상자 안
{
  const library = new Function(`${librarySource}\nreturn CLOUD_LIBRARY;`)();
  assert.strictEqual(library.length, 9, "구름 9개");
  assert.strictEqual(new Set(library.map((c) => c.name)).size, 9, "이름 유일");
  const roles = new Set(["cloud", "shadow1", "shadow2", "outline", "line"]);
  for (const cloud of library) {
    assert.ok(cloud.aspect > 0.5 && cloud.aspect < 5, `${cloud.name}: aspect ${cloud.aspect}`);
    assert.ok(cloud.items.length >= 3, `${cloud.name}: 항목 3개 이상`);
    const present = new Set(cloud.items.map((it) => it.role));
    assert.ok(present.has("shadow2"), `${cloud.name}: 그림자 2가 있다`);   // 3·7번은 그림자 1이 없다
    assert.ok(present.has("outline") || present.has("line"), `${cloud.name}: 선이 있다`);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of cloud.items) {
      assert.ok(roles.has(item.role), `${cloud.name}: 역할 ${item.role}`);
      assert.ok(item.kind === "fill" || item.kind === "stroke");
      if (item.kind === "stroke") near(item.width, 0.3, 1e-9, `${cloud.name}: 모든 선은 0.3pt`);
      if (item.role === "outline") near(item.width, 0.3, 1e-9, `${cloud.name}: 외곽선은 0.3pt`);
      for (const sp of item.subpaths) {
        assert.ok(sp.anchors.length >= 2, `${cloud.name}: 앵커 2개 이상`);
        const n = sp.anchors.length;
        for (let i = 0; i < n; i++) {
          if (!sp.closed && i === n - 1) break;
          const a = sp.anchors[i], b = sp.anchors[(i + 1) % n];
          assert.strictEqual(a.length, 6, "앵커 = [x, y, lx, ly, rx, ry]");
          for (let t = 0; t <= 16; t++) {
            const u = t / 16, v = 1 - u;
            const x = v * v * v * a[0] + 3 * v * v * u * a[4] + 3 * v * u * u * b[2] + u * u * u * b[0];
            const y = v * v * v * a[1] + 3 * v * v * u * a[5] + 3 * v * u * u * b[3] + u * u * u * b[1];
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
    }
    assert.ok(minX >= -0.01 && minY >= -0.01 && maxY <= 1.01 && maxX <= cloud.aspect + 0.01, `${cloud.name}: 좌표가 상자 안`);
    near(maxY - minY, 1, 0.01, `${cloud.name}: 높이 1`);
    near(maxX - minX, cloud.aspect, 0.01, `${cloud.name}: 폭 = aspect`);
  }
  // 채움 구름이 있는 것은 8개 (9번 적란운은 선으로만 그렸다)
  assert.strictEqual(library.filter((c) => c.items.some((it) => it.role === "cloud")).length, 8);
}

// 2. 스크립트: 라이브러리를 읽고 항목을 원본 순서대로 역할별 K로 칠한다. 메뉴 명령(패스파인더)은 쓰지 않는다
{
  for (const token of [
    '#include "Object_Cloud_library.jsxinc"',
    'typeof CLOUD_LIBRARY === "undefined"',
    'if (item.kind === "stroke" && !linesOn) continue;',
    'if (item.kind === "stroke") applyStroke(paths[p], item.width);',
    'else applyFill(paths[p], kForRole(item.role));',
    'if (item.role === "outline" && outlineWidth > 0) continue;',
    'if (item.role === "cloud" && outlineWidth > 0 && linesOn) applyStrokeStyle(paths[p], outlineWidth);',
    'for (var t = 0; t < topPaths.length; t++) applyStroke(topPaths[t], outlineWidth);',
    'if (role === "cloud") return cloudK;',
    'if (role === "shadow1") return shadow1K;',
    'if (role === "shadow2") return shadow2K;',
    "var K_STEP = 10;",
  ]) {
    assert.ok(source.includes(token), `missing: ${token}`);
  }
  assert.ok(!source.includes("executeMenuCommand"), "모달 다이얼로그 안에서 메뉴 명령은 듣지 않는다");
}

// 3. 사각형 맞춤: 비율 유지면 안쪽 가운데 최대, 꽉 채우기면 네 변에 닿는다 (y는 위가 +)
{
  const fitTransform = new Function(`${extractFunction("fitTransform")}\nreturn fitTransform;`)();
  const box = {left: 100, top: 300, right: 400, bottom: 200};   // 300 × 100
  const keep = fitTransform(box, 2, false);                       // 비율 2:1 → 200 × 100, 가로 가운데
  near(keep.height, 100, 1e-9, "높이는 사각형 높이");
  near(keep.point(0, 0)[0], 150, 1e-9, "왼쪽 여백 50");
  near(keep.point(2, 1)[0], 350, 1e-9, "오른쪽 여백 50");
  near(keep.point(0, 0)[1], 200, 1e-9, "아래는 사각형 아래");
  near(keep.point(2, 1)[1], 300, 1e-9, "위는 사각형 위");
  const tall = fitTransform(box, 4, false);                       // 비율 4:1 → 300 × 75, 세로 가운데
  near(tall.height, 75, 1e-9, "폭에 맞춰 줄어든 높이");
  near(tall.point(0, 0)[1], 212.5, 1e-9, "아래 여백 12.5");
  const exact = fitTransform(box, 4, true);
  near(exact.point(4, 1)[0], 400, 1e-9, "꽉 채우기: 오른쪽 변");
  near(exact.point(4, 1)[1], 300, 1e-9, "꽉 채우기: 윗변");
  near(exact.height, 100, 1e-9);
}

// 4. 매끄러운 점 판정: 핸들이 앵커를 사이에 두고 일직선이면 SMOOTH
{
  const isSmoothAnchor = new Function(`${extractFunction("isSmoothAnchor")}\nreturn isSmoothAnchor;`)();
  assert.strictEqual(isSmoothAnchor([0, 0], [-1, 0], [1, 0]), true);
  assert.strictEqual(isSmoothAnchor([0, 0], [-1, 0], [1, 0.5]), false, "꺾이면 모서리");
  assert.strictEqual(isSmoothAnchor([0, 0], [0, 0], [1, 0]), false, "핸들 하나가 없으면 모서리");
}

console.log("check-cloud: 통과");
