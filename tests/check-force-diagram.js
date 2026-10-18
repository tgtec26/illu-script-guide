const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_물리학", "힘 화살표.jsx"), "utf8");

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

const names = ["forceArrows", "boxHitsSegment", "polySegments", "labelSpotFree", "angleGap", "placeLabel"];
const { forceArrows, boxHitsSegment, polySegments, placeLabel } = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(", ")}};`)();
const box = [0, 40, 60, 0];   // [left, top, right, bottom]
const all = [true, true, true, true, true, true];
const len = [12, 10, 8, 6, 14, 10];
const byName = (list) => Object.fromEntries(list.map((a) => [a.name, a]));

// 오른쪽으로 밀기
{
  const a = byName(forceArrows(box, all, len, true, true, 2, 8));
  assert.deepStrictEqual(a["중력"].from, [30, 20]);
  assert.deepStrictEqual(a["중력"].to, [30, 8]);
  assert.deepStrictEqual(a["부력"].from, [18, 20], "buoyancy sits 20% of the width left of gravity, not on the same line");
  assert.deepStrictEqual(a["부력"].to, [18, 30]);
  assert.deepStrictEqual(a["수직항력"].from, [42, 0], "normal force starts on the bottom, beside gravity");
  assert.deepStrictEqual(a["수직항력"].to, [42, 8]);
  assert.deepStrictEqual(a["마찰력"].to, [24, 0], "friction opposes motion");
  assert.ok(a["마찰력"].below);
  assert.deepStrictEqual(a["작용한 힘"].from, [-14, 20], "push comes into the back side");
  assert.deepStrictEqual(a["작용한 힘"].to, [0, 20]);
  assert.ok(a["운동 방향"].to[0] > a["운동 방향"].from[0]);
  assert.strictEqual(a["운동 방향"].from[1], 42, "above the object when nothing sticks out");
}

// 왼쪽으로 당기기: 앞쪽(왼쪽) 옆면에서 나간다. 부력이 위로 삐져나오면 운동 방향 화살표는 그 이름 위로
{
  const tall = [12, 30, 8, 6, 14, 10];
  const a = byName(forceArrows(box, all, tall, false, false, 2, 8));
  assert.deepStrictEqual(a["작용한 힘"].from, [0, 20]);
  assert.deepStrictEqual(a["작용한 힘"].to, [-14, 20]);
  assert.deepStrictEqual(a["마찰력"].to, [36, 0]);
  assert.strictEqual(a["운동 방향"].from[1], 50 + 8 + 2, "clears the buoyancy tip and its label");
  assert.ok(a["운동 방향"].to[0] < a["운동 방향"].from[0]);
}

// 마찰력은 경계선에서 lift만큼 물체 안쪽으로 (경계선에 묻히지 않게). 생략하면 0
{
  const a = byName(forceArrows(box, all, len, true, true, 2, 8, 2));
  assert.deepStrictEqual(a["마찰력"].from, [30, 2]);
  assert.deepStrictEqual(a["마찰력"].to, [24, 2]);
  assert.deepStrictEqual(a["수직항력"].from, [42, 0], "only friction is lifted");
}

// 이름 상자와 선분
{
  assert.ok(boxHitsSegment([0, 0], 2, 1, [-5, 0], [5, 0]), "crosses");
  assert.ok(boxHitsSegment([0, 0], 2, 1, [0, -5], [0, 0.5]), "ends inside");
  assert.ok(boxHitsSegment([0, 0], 2, 1, [1, 0.5], [1.5, 0.2]), "lies inside");
  assert.ok(!boxHitsSegment([0, 0], 2, 1, [3, -5], [3, 5]), "beside");
  assert.ok(!boxHitsSegment([0, 0], 2, 1, [-5, 2], [5, 2]), "above");
  assert.strictEqual(polySegments([[0, 0], [1, 0], [1, 1]], true).length, 3);
  assert.strictEqual(polySegments([[0, 0], [1, 0], [1, 1]], false).length, 2);
  assert.deepStrictEqual(polySegments([[0, 0], [1, 0], [1, 1]], true)[0], [[1, 1], [0, 0]], "closing edge first");
}

// 이름 자리: 비어 있으면 그대로, 겹치면 가장 가까운 빈 자리로, 빈 자리가 없으면 그대로
{
  const wall = [[[4, -20], [4, 20]]];   // x = 4의 세로선
  assert.deepStrictEqual(placeLabel([10, 0], 3, 1, wall, [], [1, 0], 0.4, 12, 0.5), [10, 0], "free spot stays");
  const moved = placeLabel([5, 0], 3, 1, wall, [], [1, 0], 0.4, 12, 0.5);
  assert.ok(!boxHitsSegment(moved, 3.4, 1.4, wall[0][0], wall[0][1]) && moved[0] > 5, "pushed off the line, the near (right) way");
  // 양쪽이 같은 거리면 prefer 쪽을 먼저 본다
  const right = placeLabel([4, 0], 3, 1, wall, [], [1, 0], 0.4, 12, 0.5);
  const left = placeLabel([4, 0], 3, 1, wall, [], [-1, 0], 0.4, 12, 0.5);
  assert.ok(right[0] > 4 && left[0] < 4 && !boxHitsSegment(right, 3.4, 1.4, wall[0][0], wall[0][1]) && !boxHitsSegment(left, 3.4, 1.4, wall[0][0], wall[0][1]), "tie goes the preferred way");
  const taken = [{c: [10, 0], hw: 3, hh: 1}];
  const next = placeLabel([10, 0], 3, 1, [], taken, [0, 1], 0.4, 12, 0.5);
  assert.ok(Math.abs(next[0] - 10) >= 6.4 || Math.abs(next[1]) >= 2.4, "clear of the label already placed");
  assert.deepStrictEqual(placeLabel([0, 0], 3, 1, [[[-50, -50], [-50, 50]], [[-50, 0], [50, 0]]], [], [1, 0], 0.4, 1, 0.5), [0, 0], "no room within reach: stay");
}

// 이름 전체: 모든 힘을 켠 한 장면에서 이름이 선·다른 이름과 겹치지 않는다
{
  const lift = 2, arrows = forceArrows(box, all, len, true, true, 2, 8, lift);
  let solids = polySegments([[0, 40], [60, 40], [60, 0], [0, 0]], true);
  arrows.forEach((a) => solids.push([a.from, a.to]));
  const placed = [];
  arrows.forEach((a) => {
    const dx = a.to[0] - a.from[0], dy = a.to[1] - a.from[1];
    const hw = 6, hh = 2;
    const base = Math.abs(dy) >= Math.abs(dx) ? [a.to[0] + 1 + hw, a.to[1] - (dy > 0 ? hh : -hh)] : [(a.from[0] + a.to[0]) / 2, a.to[1] + (a.below ? -hh - 1 : hh + 1)];
    const spot = placeLabel(base, hw, hh, solids, placed, [base[0] - a.to[0], base[1] - a.to[1]], 0.4, 12, 0.5);
    assert.ok(solids.every((s) => !boxHitsSegment(spot, hw, hh, s[0], s[1])), `${a.name} clear of lines`);
    placed.forEach((r) => assert.ok(Math.abs(spot[0] - r.c[0]) >= hw + r.hw || Math.abs(spot[1] - r.c[1]) >= hh + r.hh, `${a.name} clear of earlier labels`));
    placed.push({c: spot, hw, hh});
  });
}

// 켠 것만
assert.strictEqual(forceArrows(box, [true, false, false, false, false, false], len, true, true, 2, 8).length, 1);
assert.ok(source.includes('var PREF_KEY = "ObjectForceDiagram/settings";'));
console.log("force diagram checks passed");
