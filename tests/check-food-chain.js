const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_FoodChain.jsx");
const artDir = path.join(root, "스크립트", "01_도형", "Object_FoodChain_art");
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

function extractArray(name) {
  const start = source.indexOf(`var ${name} = [`);
  assert.ok(start >= 0, `missing table: ${name}`);
  const end = source.indexOf("];", start);
  return new Function(`${source.slice(start, end + 2)} return ${name};`)();
}

const WEBS = extractArray("WEBS");
const FEEDS = extractArray("FEEDS");
const names = ["trophicLevels", "arrowPoints", "rayExit"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1e-9, `${label}: expected ${b}, got ${a}`);

// 표: 먹이 관계의 두 생물은 모두 목록에 있고, 같은 관계가 두 번 나오지 않으며, 생물마다 임시 그림이 있다
{
  const known = new Set(WEBS.flatMap((w) => w.organisms));
  assert.strictEqual(known.size, WEBS.reduce((n, w) => n + w.organisms.length, 0), "duplicate organism");
  const seen = new Set();
  for (const [prey, predator] of FEEDS) {
    assert.ok(known.has(prey), `unknown prey ${prey}`);
    assert.ok(known.has(predator), `unknown predator ${predator}`);
    assert.ok(!seen.has(prey + ">" + predator), `duplicate feed ${prey} > ${predator}`);
    seen.add(prey + ">" + predator);
  }
  for (const name of known) {
    assert.ok(fs.existsSync(path.join(artDir, name + ".svg")) || fs.existsSync(path.join(artDir, name + ".ai")),
      `missing art for ${name}`);
  }
}

// 먹이 단계: 생산자 1, 가장 긴 먹이 사슬을 따라 올라간다
{
  const land = lib.trophicLevels(WEBS[0].organisms, FEEDS);
  assert.deepStrictEqual([land["벼"], land["배추"], land["메뚜기"], land["개구리"], land["뱀"], land["매"]], [1, 1, 2, 3, 4, 5]);
  // 고른 생물 안에서만 센다: 먹이(메뚜기·배추흰나비)가 없으면 개구리도 1
  const partial = lib.trophicLevels(["벼", "개구리", "매"], FEEDS);
  assert.deepStrictEqual([partial["벼"], partial["개구리"], partial["매"]], [1, 1, 2]);
  const sea = lib.trophicLevels(WEBS[1].organisms, FEEDS);
  assert.strictEqual(sea["식물성 플랑크톤"], 1);
  assert.strictEqual(sea["범고래"], 7);
}

// 화살표: 직선이면 두 사각형(간격만큼 넓힌) 테두리에서 시작·끝, 핸들은 1/3 지점
{
  const a = [0, 10, 10, 0];     // [left, top, right, bottom]
  const b = [0, 50, 10, 40];
  const p = lib.arrowPoints(a, b, 1, 0);
  near(p[0][0], 5, "start x"); near(p[0][1], 11, "start y");
  near(p[3][0], 5, "end x"); near(p[3][1], 39, "end y");
  near(p[1][1], 11 + 28 / 3, "start handle");
  near(p[2][1], 39 - 28 / 3, "end handle");
}

// 휘기: 시작은 왼쪽으로, 끝은 오른쪽에서 들어와 두 끝이 같은 쪽으로 부푼다
{
  const p = lib.arrowPoints([0, 10, 10, 0], [100, 10, 110, 0], 0, 30);
  assert.ok(p[1][1] > p[0][1], "start handle bends up");
  assert.ok(p[2][1] > p[3][1], "end handle bends up");
  near(p[0][0], 10, "start on right edge");
  near(p[3][0], 100, "end on left edge");
}

// 겹친 사각형은 그리지 않는다
assert.strictEqual(lib.arrowPoints([0, 10, 10, 0], [5, 12, 15, 2], 1, 0), null);
assert.strictEqual(lib.arrowPoints([0, 10, 10, 0], [0, 10, 10, 0], 1, 0), null);

assert.ok(source.includes('var PLACE_PREF_KEY = "ObjectFoodChain/settings";'));
assert.ok(source.includes('var ARROW_PREF_KEY = "ObjectFoodChain/arrows";'));
console.log("food chain checks passed");
