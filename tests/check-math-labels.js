const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 수학 묶음 공용 라벨 겹침 풀기(07_수학/math_label_helper.jsxinc)를 가짜 글상자로 확인한다
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "07_수학", "math_label_helper.jsxinc"), "utf8");
const untangleLabels = new Function(source + "\nreturn untangleLabels;")();

// 글자 폭 5pt, 높이 8pt로 dir 쪽 gap만큼 떨어뜨려 놓는 addLabel 흉내
function layout(texts) {
  return texts.map((label) => {
    const w = label.text.length * 5, h = 8, gap = 2 + (label.clear || 0);
    const cx = label.at[0] + label.dir[0] * (gap + w / 2 * Math.abs(label.dir[0]));
    const cy = label.at[1] + label.dir[1] * (gap + h / 2 * Math.abs(label.dir[1]));
    return {
      contents: label.text, removed: false,
      geometricBounds: [cx - w / 2, cy + h / 2, cx + w / 2, cy - h / 2],
      translate(dx, dy) { const b = this.geometricBounds; this.geometricBounds = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]; },
      remove() { this.removed = true; },
    };
  });
}
function run(texts, lines) {
  const frames = layout(texts);
  const group = { textFrames: frames.slice().reverse() };   // 일러처럼 나중 것이 0번
  untangleLabels(group, { texts, lines });
  return frames;
}

// 1) 점 좌표 "2"와 같은 자리의 눈금 "2"는 지운다
{
  const f = run([
    { text: "2", at: [0, 20], dir: [-1, 0], clear: 1, upright: true },
    { text: "2", at: [0, 20], dir: [1, 0] },
  ], []);
  assert.ok(f[0].removed, "duplicate tick removed");
  assert.ok(!f[1].removed);
}

// 2) 선이 지나가는 점 라벨은 비키고, 겹치지 않는 라벨은 그대로 둔다
{
  const texts = [{ text: "P", at: [30, 30], dir: [1, 0] }, { text: "Q", at: [100, 100], dir: [1, 0] }];
  const before = layout(texts).map((f) => f.geometricBounds.slice());
  const f = run(texts, [{ points: [[35, 10], [35, 50]] }]);   // P 오른쪽을 세로로 지나는 선
  assert.notDeepStrictEqual(f[0].geometricBounds, before[0], "P moved");
  const b = f[0].geometricBounds;
  assert.ok(b[2] < 35 || b[0] > 35, "P clear of the line");
  assert.deepStrictEqual(f[1].geometricBounds, before[1], "Q untouched");
}

// 3) 라벨 수와 글상자 수가 다르면 손대지 않는다
{
  const texts = [{ text: "A", at: [0, 0], dir: [1, 0] }];
  const frames = layout(texts);
  const before = frames[0].geometricBounds.slice();
  untangleLabels({ textFrames: [frames[0], frames[0]] }, { texts, lines: [{ points: [[5, -20], [5, 20]] }] });
  assert.deepStrictEqual(frames[0].geometricBounds, before);
}

console.log("check-math-labels: ok");
