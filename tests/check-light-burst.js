const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_LightBurst.jsx");
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

const names = ["rayLengths", "nextRandom", "rayOutline", "lerp"];
const helpers = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 난수: 같은 seed → 같은 열, 범위 1 ~ 2147483646
let state = 12345;
const first = helpers.nextRandom(state);
assert.ok(first > 0 && first < 2147483647, "random stays in Park-Miller range");
assert.strictEqual(helpers.nextRandom(12345), first, "deterministic");
assert.notStrictEqual(helpers.nextRandom(first), first, "advances");

// 길이 변화 0: 모두 같은 길이, 방식·seed와 무관
for (const mode of [0, 1]) {
  const same = helpers.rayLengths(8, 40, 0, mode, 999);
  assert.strictEqual(same.length, 8);
  for (const length of same) near(length, 40, 1e-9, `variation 0 keeps base (mode ${mode})`);
}

// 번갈아: 짝수 번째는 최대, 홀수 번째는 (1 - 변화)배
const alternate = helpers.rayLengths(6, 40, 50, 1, 1);
assert.deepStrictEqual(alternate.map((v) => Math.round(v * 1000) / 1000), [40, 20, 40, 20, 40, 20]);

// 무작위: 최대 길이 이하, 15% 밑으로는 안 내려가고 seed가 같으면 같은 결과
const randomA = helpers.rayLengths(32, 40, 100, 0, 777);
const randomB = helpers.rayLengths(32, 40, 100, 0, 777);
assert.deepStrictEqual(randomA, randomB, "same seed → same lengths");
for (const length of randomA) assert.ok(length <= 40 + 1e-9 && length >= 6 - 1e-9, `random length in [15%, 100%]: ${length}`);
assert.ok(Math.max(...randomA) - Math.min(...randomA) > 10, "variation 100 spreads lengths");
assert.notDeepStrictEqual(helpers.rayLengths(32, 40, 100, 0, 778), randomA, "different seed → different lengths");

// 폭은 같은 seed로 뽑아 길이와 같은 비율로 줄어든다 (긴 줄기 = 굵은 줄기)
const widths = helpers.rayLengths(32, 4, 100, 0, 777);
for (let i = 0; i < 32; i++) near(widths[i] / 4, randomA[i] / 40, 1e-9, `width ratio follows length ratio (${i})`);

// 줄기 윤곽: 중심 (10, 20)에서 12시 방향(90°), 길이 30, 반폭 2
const up = helpers.rayOutline(10, 20, 90, 30, 2);
assert.strictEqual(up.length, 3, "base left, tip, base right");
near(up[0].anchor[0], 8, 1e-9, "base left x (left of the axis)");
near(up[0].anchor[1], 20, 1e-9, "base left y");
near(up[1].anchor[0], 10, 1e-9, "tip on the axis");
near(up[1].anchor[1], 50, 1e-9, "tip at centre + length");
near(up[2].anchor[0], 12, 1e-9, "base right x");
near(up[2].anchor[1], 20, 1e-9, "base right y");
// 밑변 바깥쪽 핸들은 앵커에 붙고, 옆선 핸들은 축 쪽으로 오목하게 들어간다
assert.deepStrictEqual(up[0].left, up[0].anchor);
assert.deepStrictEqual(up[2].right, up[2].anchor);
assert.ok(up[0].right[0] > up[0].anchor[0] && up[0].right[0] < 10, "left side handle bends toward the axis");
assert.ok(up[0].right[1] > 20, "left side handle goes outward");
assert.ok(up[1].left[0] < 10 && up[1].right[0] > 10, "tip handles come from both sides");
assert.ok(up[1].left[1] < 50 && up[1].right[1] < 50, "tip handles sit below the tip");

// 회전: 0°는 오른쪽, 밑변은 축의 좌우
const right = helpers.rayOutline(0, 0, 0, 10, 1);
near(right[1].anchor[0], 10, 1e-9, "0° tip points right");
near(right[1].anchor[1], 0, 1e-9);
near(right[0].anchor[1], 1, 1e-9, "base left is above the axis for 0°");
near(right[2].anchor[1], -1, 1e-9, "base right is below the axis for 0°");

// 순수 문법 검사 (#지시문 제외)
new Function(source.replace(/^#.*$/mg, ""));

console.log("check-light-burst: ok");
