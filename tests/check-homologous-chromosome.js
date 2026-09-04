const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_HomologousChromosome.jsx");

assert.ok(fs.existsSync(scriptPath), "Object_HomologousChromosome.jsx must exist");

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

const names = ["armHalfWidth", "locusHalfWidth"];
const helpers = new Function(
  `${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`
)();

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${label}: expected ${expected}, got ${actual}`);
}

// 스타디움 형태: 폭 20, 길이 100, 위 끝 y = 200
const armTop = 200;
const armLen = 100;
const w = 20;

close(helpers.armHalfWidth(armTop, armLen, w, 150), 10, "straight middle is the full half width");
close(helpers.armHalfWidth(armTop, armLen, w, 190), 10, "half width at the cap centre");
close(helpers.armHalfWidth(armTop, armLen, w, 110), 10, "half width at the lower cap centre");
close(helpers.armHalfWidth(armTop, armLen, w, 200), 0, "top tip has no width");
close(helpers.armHalfWidth(armTop, armLen, w, 100), 0, "bottom tip has no width");
close(helpers.armHalfWidth(armTop, armLen, w, 200 - 10 + 10 / Math.sqrt(2)),
  10 / Math.sqrt(2), "cap follows the circle");
close(helpers.armHalfWidth(armTop, armLen, w, 250), 0, "above the arm is outside");
close(helpers.armHalfWidth(armTop, armLen, w, 50), 0, "below the arm is outside");

// 길이가 폭보다 짧으면 반지름이 길이의 절반으로 제한되고 가운데는 여전히 w/2
close(helpers.armHalfWidth(armTop, 10, 40, 195), 20, "short arm keeps its full width at the centre");

// 유전자 좌: p암 → 틈 → q암
const layout = {top: 200, w: 20, gap: 10, pLen: 30, qLen: 60};
close(helpers.locusHalfWidth(layout, 180), 10, "inside the p arm");
close(helpers.locusHalfWidth(layout, 150), 10, "inside the q arm");
close(helpers.locusHalfWidth(layout, 165), 0, "inside the centromere gap");
close(helpers.locusHalfWidth(layout, 95), 0, "past the q arm end");

// p암 - 중심절 - q암은 항상 접한다: 틈이 곧 중심절 지름이고, 암 끝이 원의 위·아래에 닿는다.
const computeLayout = new Function(
  "MM_TO_PT", "bounds", "widthMm", "centromereDiaMm", "spacingMm",
  "offsetXmm", "offsetYmm", "centromerePct",
  `${extractFunction("computeLayout")}\nreturn computeLayout();`
);

const laid = computeLayout(1, [0, 300, 100, 0], 20, 30, 40, 0, 0, 33);
close(laid.gap, 30, "the arm gap follows the centromere diameter");
close(laid.pLen + laid.gap + laid.qLen, 300, "the arms and the centromere fill the rectangle height");
const circleTop = laid.top - laid.pLen - laid.gap / 2 + laid.centromereDia / 2;
const circleBottom = circleTop - laid.centromereDia;
close(circleTop, laid.top - laid.pLen, "the p arm tip touches the top of the centromere");
close(circleBottom, laid.top - laid.pLen - laid.gap, "the q arm tip touches the bottom of the centromere");

// 지름을 키워도 여전히 접한다 (간격을 따로 맞출 필요가 없다)
const wider = computeLayout(1, [0, 300, 100, 0], 20, 60, 40, 0, 0, 33);
close(wider.gap, 60, "a wider centromere widens the gap by itself");
close(wider.pLen + wider.gap + wider.qLen, 300, "the taller centromere still fits the height");

console.log("check-homologous-chromosome: ok");
