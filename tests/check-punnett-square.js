const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_PunnettSquare.jsx"), "utf8");

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

const names = ["buildCross", "parseGenotype", "alleleOrder", "makeGametes", "combineGametes", "phenotypeKey", "indexOf", "gridPoint"];
const h = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 한 쌍: Rr × Rr → 1:2:1, 표현형 3:1
{
  const c = h.buildCross("Rr", "Rr", true);
  assert.deepStrictEqual(c.rows, ["R", "r"]);
  assert.deepStrictEqual(c.cells, [["RR", "Rr"], ["Rr", "rr"]], "dominant allele first");
  assert.deepStrictEqual(c.classes, [[0, 0], [0, 1]]);
}

// 두 쌍: RrYy × RrYy → 교과서 순서 RY, Ry, rY, ry, 표현형 9:3:3:1
{
  const c = h.buildCross("RrYy", "RrYy", true);
  assert.deepStrictEqual(c.cols, ["RY", "Ry", "rY", "ry"]);
  assert.strictEqual(c.cells[3][0], "RrYy");
  assert.strictEqual(c.cells[1][2], "RrYy");
  const count = {};
  c.classes.flat().forEach((k) => { count[k] = (count[k] || 0) + 1; });
  assert.deepStrictEqual(Object.values(count).sort((a, b) => b - a), [9, 3, 3, 1]);
}

// 합치기: RR × rr → 1칸, 끄면 2 × 2
assert.deepStrictEqual(h.buildCross("RR", "rr", true).cells, [["Rr"]]);
assert.strictEqual(h.buildCross("RR", "rr", false).cells.length, 2);
// 입력 순서가 rR이어도 우성 먼저
assert.strictEqual(h.buildCross("rR", "rr", true).cells[1][0], "Rr");

// 중간 유전: RW × RW → RR : RW : WW = 1:2:1, 표현형 3종
{
  const c = h.buildCross("RW", "RW", true);
  assert.deepStrictEqual(c.cells, [["RR", "RW"], ["RW", "WW"]]);
  assert.strictEqual(new Set(c.classes.flat()).size, 3);
}

// 오류
assert.ok(h.buildCross("Ry", "Rr", true).error, "different letters in one pair");
assert.ok(h.buildCross("Rr", "RrYy", true).error, "pair count mismatch");
assert.ok(h.buildCross("R", "Rr", true).error, "odd letters");
assert.ok(h.buildCross("Rr", "Yy", true).error, "different genes");

// 격자: 마름모는 왼쪽 위 모서리가 꼭짓점, 대각선은 칸 크기 × √2
{
  assert.deepStrictEqual(h.gridPoint(1, 2, 10, false), [10, -20]);
  const top = h.gridPoint(0, 0, 10, true), bottom = h.gridPoint(1, 1, 10, true);
  assert.deepStrictEqual(top, [0, -0]);
  assert.ok(Math.abs(bottom[1] + 10 * Math.SQRT2) < 1e-9 && Math.abs(bottom[0]) < 1e-9);
  const left = h.gridPoint(0, 1, 10, true);
  assert.ok(left[0] < 0, "rows go down-left");
}

assert.ok(source.includes('var PREF_KEY = "ObjectPunnettSquare/settings";'));
assert.ok(source.includes("bindTabOrder(win)"));
console.log("punnett square checks passed");
