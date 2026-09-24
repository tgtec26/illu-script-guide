const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_EarthLayers.jsx"), "utf8");

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

const names = ["layerRadii", "shapeRange", "sectorPoints", "labelAnchors", "depthMarks", "arcPoints"];
const lib = new Function(
  "var EARTH_RADIUS_KM = 6400;\n" +
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);

// 경계 반지름: 지각은 과장, 맨틀–외핵 2900 km, 외핵–내핵 5100 km
{
  const radii = lib.layerRadii(64, 0.04);
  near(radii[0], 64, 1e-9, "surface");
  near(radii[1], 61.44, 1e-9, "crust bottom");
  near(radii[2], 35, 1e-9, "core–mantle boundary at 2900 km");
  near(radii[3], 13, 1e-9, "inner core at 5100 km");
  // 지각을 가장 두껍게 해도 층 순서가 유지된다
  const thick = lib.layerRadii(64, 0.15);
  for (let i = 1; i < 4; i++) assert.ok(thick[i] < thick[i - 1], "layers shrink inward");
}

// 부채꼴: 중심에서 시작해 원호를 지난다. 1/4 절개는 조각 하나, 원 둘레 위 점
{
  const quarter = lib.sectorPoints(10, 0, Math.PI / 2);
  assert.deepStrictEqual(quarter[0].anchor, [0, 0]);
  assert.strictEqual(quarter.length, 3);
  near(quarter[1].anchor[0], 10, 1e-9, "arc starts on the right");
  near(quarter[2].anchor[1], 10, 1e-9, "arc ends on top");
  // 겉면 3/4: 90° → 360°, 조각 세 개
  assert.strictEqual(lib.sectorPoints(10, Math.PI / 2, 2 * Math.PI).length, 5);
  assert.deepStrictEqual(lib.shapeRange(1), [0, Math.PI]);
}

// 이름 자리: 각 층의 가운데 반지름, 모두 해당 층 안
{
  const radii = lib.layerRadii(64, 0.04);
  const anchors = lib.labelAnchors(radii, Math.PI / 4);
  for (let i = 0; i < 4; i++) {
    const r = Math.hypot(anchors[i][0], anchors[i][1]);
    const inner = i < 3 ? radii[i + 1] : 0;
    assert.ok(r < radii[i] && r > inner, `${i}: anchor inside its layer`);
    near(anchors[i][0], anchors[i][1], 1e-9, "on the 45° ray");
  }
  assert.ok(anchors[0][1] > anchors[1][1] && anchors[1][1] > anchors[2][1], "outer labels sit higher");
}

// 깊이 눈금: 겉면 0, 경계 2900·5100, 중심 6400 km
{
  const marks = lib.depthMarks(lib.layerRadii(64, 0.04));
  assert.deepStrictEqual(marks.map((m) => m.text), ["0", "2900", "5100", "6400 km"]);
  assert.deepStrictEqual(marks.map((m) => m.x), [64, 35, 13, 0]);
}

assert.ok(source.includes('var PREF_KEY = "ObjectEarthLayers/settings";'));
assert.ok(source.includes('p[0] !== "v1" || p.length !== 13'), "settings field count");
console.log("earth layer checks passed");
