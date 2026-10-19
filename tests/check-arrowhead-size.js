// 그림 제작 규칙 4.7: 화살촉 크기 100%는 일러스트레이터 100%와 같다 = 카탈로그 길이 × 선 두께.
// 작살형(12.1)은 선 0.4pt에서 4.84pt다. 스크립트가 고정 길이로 정의하는 두 곳(HEAD_EXAM_LENGTH_PT, 수학·운동 축 ARROW)이 4.84인지 검사한다.
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tools", "arrowheads.json"), "utf8"));
const harpoon = catalog.types[3].length;
const EXPECT = Math.round(harpoon * 0.4 * 100) / 100;
assert.strictEqual(EXPECT, 4.84, "작살형 12.1 × 0.4pt");

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.jsx$/.test(name)) out.push(full);
  }
  return out;
}
const files = walk(path.join(__dirname, "..", "스크립트"), []);
let examCount = 0, arrowCount = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const label = path.relative(path.join(__dirname, ".."), file);
  for (const m of source.matchAll(/var HEAD_EXAM_LENGTH_PT = ([0-9.]+);/g)) {
    examCount++;
    assert.strictEqual(Number(m[1]), EXPECT, `${label}: HEAD_EXAM_LENGTH_PT는 일러스트레이터 100%(${EXPECT}pt)여야 한다`);
  }
  for (const m of source.matchAll(/var ARROW = \{ ?length: ([0-9.]+),/g)) {
    arrowCount++;
    assert.strictEqual(Number(m[1]), EXPECT, `${label}: 축 화살촉 ARROW.length는 일러스트레이터 100%(${EXPECT}pt)여야 한다`);
  }
}
assert.ok(examCount >= 15, `HEAD_EXAM_LENGTH_PT 정의 ${examCount}개`);
assert.ok(arrowCount >= 25, `ARROW 정의 ${arrowCount}개`);
console.log(`arrowhead size ok: HEAD_EXAM_LENGTH_PT ${examCount}곳, ARROW ${arrowCount}곳 = ${EXPECT}pt`);
