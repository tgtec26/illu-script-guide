const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_GraphMarkers.jsx");
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

const fns = new Function(
  [extractFunction("rangeValues"), extractFunction("nearestIndex"), extractFunction("trianglePoints")].join("\n") +
  "; return { rangeValues, nearestIndex, trianglePoints };"
)();

// 슬라이더 값 목록: 크기 0.5~2mm(0.1), 채움 0~100(10), 선 0 또는 0.3~1pt(0.1)
const size = fns.rangeValues(0.5, 2, 0.1);
assert.strictEqual(size.length, 16, "size has 16 steps");
assert.strictEqual(size[0], 0.5);
assert.strictEqual(size[15], 2, "size max is 2mm");
assert.deepStrictEqual(fns.rangeValues(0, 100, 10), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
const stroke = [0].concat(fns.rangeValues(0.3, 1, 0.1));
assert.deepStrictEqual(stroke, [0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);

// 입력창에 쓴 값은 가장 가까운 단계로 붙는다
assert.strictEqual(stroke[fns.nearestIndex(stroke, 0.1)], 0);
assert.strictEqual(stroke[fns.nearestIndex(stroke, 0.24)], 0.3);
assert.strictEqual(stroke[fns.nearestIndex(stroke, 5)], 1);
assert.strictEqual(size[fns.nearestIndex(size, 1.26)], 1.3);

// 정삼각형: 꼭짓점 위, 외접 사각형 중심이 고정점, 한 변이 size
const tri = fns.trianglePoints(10, 20, 4);
const h = 4 * Math.sqrt(3) / 2;
assert.ok(Math.abs(tri[0][1] - (20 + h / 2)) < 1e-9 && tri[0][0] === 10, "apex above anchor");
assert.ok(Math.abs(tri[1][0] - tri[2][0] - 4) < 1e-9, "base is size wide");
assert.ok(Math.abs((tri[0][1] + tri[1][1]) / 2 - 20) < 1e-9, "bbox vertically centred on anchor");

// 꺾은선 두께 0.5~2pt(0.1)
assert.deepStrictEqual(fns.rangeValues(0.5, 2, 0.1).slice(0, 3), [0.5, 0.6, 0.7]);
assert.ok(source.includes('LINE_VALUES = rangeValues(0.5, 2, 0.1)'), "line width slider is 0.5-2pt");

// 설정 문자열은 v2 + 6필드
assert.ok(source.includes('p[0] !== "v2" || p.length !== 7'), "settings string must be v2 with 6 fields");
assert.ok(source.includes("Folder.temp + \"/illu_last_script.txt\""), "RepeatLast memo header present");

console.log("check-graph-markers: ok");
