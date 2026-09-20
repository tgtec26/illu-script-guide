const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_PeriodicTable.jsx");
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

const diagonalPoints = new Function(
  `${extractFunction("diagonalPoints")}\n${extractFunction("corner")}\nreturn diagonalPoints;`
)();

const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-6, `${label}: expected ${b}, got ${a}`);
const rect = { left: 10, top: 100, width: 60, height: 30 };

// 사선: 라운딩 없으면 모서리에서 모서리로 곧장
const straight = diagonalPoints(rect, 0, false);
assert.strictEqual(straight.length, 2, "straight: two points");
near(straight[0].anchor[0], 10, "straight start x");
near(straight[0].anchor[1], 100, "straight start y");
near(straight[1].anchor[0], 70, "straight end x");
near(straight[1].anchor[1], 70, "straight end y");

// 꺾은 선: 사선 → 가운데 1/3 수평(가운데 높이) → 사선
const bent = diagonalPoints(rect, 0, true);
assert.strictEqual(bent.length, 4, "bent: four points");
near(bent[0].anchor[0], 10, "bent start x");
near(bent[0].anchor[1], 100, "bent start y");
near(bent[1].anchor[0], 30, "bent knee 1 x");
near(bent[1].anchor[1], 85, "bent knee 1 y");
near(bent[2].anchor[0], 50, "bent knee 2 x");
near(bent[2].anchor[1], 85, "bent knee 2 y");
near(bent[3].anchor[0], 70, "bent end x");
near(bent[3].anchor[1], 70, "bent end y");

// 라운딩이 있으면 끝점이 모서리 안쪽으로 들어오되 첫 사선의 연장선 위에 있어야 한다
const rounded = diagonalPoints(rect, 5, true);
const dx = rounded[0].anchor[0] - rect.left;
const dy = rect.top - rounded[0].anchor[1];
assert.ok(dx > 0 && dy > 0 && dx < 5 && dy < 5, "rounded: start inside the corner arc");
near(dy / dx, (rect.height / 2) / (rect.width / 3), "rounded: start on the first slope");
// 끝점은 시작점과 점대칭
near(rounded[3].anchor[0], rect.left + rect.width - dx, "rounded end x");
near(rounded[3].anchor[1], rect.top - rect.height + dy, "rounded end y");

console.log("periodic diagonal: ok");
