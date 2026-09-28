const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 음수 눈금 숫자는 빼기 기호를 빼고 숫자 가운데를 눈금에 맞춘다 (평가원 그림). 07_수학의 모든 addLabel이 negativeNumberShift를 거친다
const dir = path.resolve(__dirname, "..", "스크립트", "07_수학");
let helper = null;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".jsx"))) {
  const source = fs.readFileSync(path.join(dir, file), "utf8");
  const bodies = source.split(/function addLabel\(/).slice(1);
  assert.ok(bodies.length > 0, file + ": addLabel");
  for (const body of bodies) {
    assert.ok(/negativeNumberShift\(/.test(body.slice(0, 3000)), file + ": addLabel without negativeNumberShift");
  }
  assert.strictEqual(source.split("function negativeNumberShift(").length, 2, file + ": one helper");
  if (!helper) {
    const start = source.indexOf("function negativeNumberShift(");
    let depth = 0;
    for (let i = source.indexOf("{", start); i < source.length; i++) {
      if (source[i] === "{") depth++;
      if (source[i] === "}" && --depth === 0) { helper = source.slice(start, i + 1); break; }
    }
  }
}

// 가짜 글상자: 글자마다 너비 w(빼기 4, 숫자 5)
const widths = { "-": 4, "−": 4 };
function fakeFrame(text) {
  const frame = {
    contents: text,
    get geometricBounds() { let w = 0; for (const c of frame.contents) w += widths[c] || 5; return [10, 20, 10 + w, 12]; },
    duplicate() {
      const copy = fakeFrame(frame.contents);
      copy.textRange = { characters: [{ remove() { copy.contents = copy.contents.slice(1); } }] };
      return copy;
    },
    remove() {}
  };
  return frame;
}
const shift = new Function(`${helper}\nreturn negativeNumberShift;`)();
assert.strictEqual(shift(fakeFrame("-2"), [0, -1]), -2, "below: move left by half the minus");
assert.strictEqual(shift(fakeFrame("-12"), [0, 1]), -2, "above too");
assert.strictEqual(shift(fakeFrame("−π"), [0, -1]), -2, "minus sign and pi");
assert.strictEqual(shift(fakeFrame("2"), [0, -1]), 0, "positive");
assert.strictEqual(shift(fakeFrame("-2"), [-1, 0]), 0, "y-axis numbers stay right-aligned");
assert.strictEqual(shift(fakeFrame("-2"), [0, 0]), 0, "centered labels");
assert.strictEqual(shift(fakeFrame("(-2, 1)"), [0, -1]), 0, "coordinates");
console.log("negative tick checks passed");
