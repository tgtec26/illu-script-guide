const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_ForceDiagram.jsx"), "utf8");

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

const { forceArrows } = new Function(`${extractFunction("forceArrows")}\nreturn {forceArrows};`)();
const box = [0, 40, 60, 0];   // [left, top, right, bottom]
const all = [true, true, true, true, true, true];
const len = [12, 10, 8, 6, 14, 10];
const byName = (list) => Object.fromEntries(list.map((a) => [a.name, a]));

// 오른쪽으로 밀기
{
  const a = byName(forceArrows(box, all, len, true, true, 2, 8));
  assert.deepStrictEqual(a["중력"].from, [30, 20]);
  assert.deepStrictEqual(a["중력"].to, [30, 8]);
  assert.deepStrictEqual(a["부력"].to, [30, 30]);
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

// 켠 것만
assert.strictEqual(forceArrows(box, [true, false, false, false, false, false], len, true, true, 2, 8).length, 1);
assert.ok(source.includes('var PREF_KEY = "ObjectForceDiagram/settings";'));
console.log("force diagram checks passed");
