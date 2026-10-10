const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 역학 장치.jsx에서 장면 그리기 함수만 잘라 가짜 도구로 돌려 좌표를 검사한다
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "역학 장치.jsx"), "utf8");
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unbalanced: ${name}`);
}
const names = ["drawHorizontalPulley"];
const scenes = new Function(`var GHOST_DASH = [3, 2];\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 컨트롤 기본값을 소스의 controls 배열에서 읽는다
function defaultsOf(engineName) {
  const start = source.indexOf(`function ${engineName}(`);
  const end = source.indexOf("draw:", start);
  const text = source.slice(start, end);
  const o = { wBody: 0.8, wRope: 0.4, wGuide: 0.3 };
  for (const m of text.matchAll(/\{key: "(\w+)",[^}]*?(?:check: "[^"]*"|text: true|min: [^,]+,[^}]*?)[^}]*?value: ("[^"]*"|true|false|[-\d.]+)\}/g)) o[m[1]] = JSON.parse(m[2]);
  return o;
}
function record(o, fn) {
  const calls = [];
  const t = { mm: 1 };
  for (const k of ["line", "rect", "circle", "arc", "arrow", "text", "path", "pulley"]) t[k] = (...a) => { calls.push({ k, a }); };
  fn(t, o);
  return calls;
}
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

{
  const o = defaultsOf("makeHorizontalPulleyEngine");
  assert.strictEqual(o.blockText, "4 kg"); assert.strictEqual(o.ropeLen, 28); assert.strictEqual(o.dim, true);
  const calls = record(o, scenes.drawHorizontalPulley);
  const bw = 12, bh = 9, R = 4.2, attachY = bh * 0.78, cx = bw + 28, cy = attachY - R;
  const pulley = calls.find((c) => c.k === "pulley");
  near(pulley.a[0], cx, "도르래 x"); near(pulley.a[1], cy, "도르래 y"); near(pulley.a[2], R, "도르래 반지름");
  // 받침대는 도르래 가운데에서 왼쪽 아래 바닥(y=0)으로: 길이 2.1R, 끝은 바닥 위
  const mount = pulley.a[3];
  near(mount[1], 0, "받침대 끝 높이"); assert.ok(mount[0] < cx, "받침대는 왼쪽으로");
  near(Math.hypot(mount[0] - cx, mount[1] - cy), 2.1 * R, "받침대 길이");
  // 실: 물체 오른쪽 위쪽에서 수평으로 도르래 꼭대기까지
  const horizontal = calls.find((c) => c.k === "line" && c.a[0][1] === attachY && c.a[1][1] === cy + R);
  assert.ok(horizontal, "수평 실");
  near(horizontal.a[0][0], bw, "실 시작"); near(horizontal.a[1][0], cx, "실 끝");
  // 원호: 오른쪽 위 사분원 (도르래와 같은 중심·반지름, 0 → 90°)
  const arc = calls.find((c) => c.k === "arc");
  near(arc.a[0], cx, "호 중심 x"); near(arc.a[3], 0, "호 시작"); near(arc.a[4], Math.PI / 2, "호 끝");
  // 수직 실: 도르래 오른쪽 끝에서 추 위까지
  const vertical = calls.find((c) => c.k === "line" && c.a[0][0] === cx + R && c.a[1][0] === cx + R);
  assert.ok(vertical, "수직 실");
  near(vertical.a[0][1], cy, "수직 실 시작"); near(vertical.a[1][1], cy - 24, "추 위");
  // 점선 상자 둘(점선 물체·점선 추), 속도 글자 둘, 거리 글자·P·Q
  const ghosts = calls.filter((c) => c.k === "rect" && c.a[4] === null);
  assert.strictEqual(ghosts.length, 2);
  const texts = calls.filter((c) => c.k === "text").map((c) => c.a[0]);
  for (const s of ["4 kg", "나무도막", "1 kg", "추", "1 m", "P", "Q"]) assert.ok(texts.includes(s), s);
  assert.strictEqual(texts.filter((s) => s === "2 m/s").length, 2);
  // 거리 표시: 점선 물체 오른쪽 끝(-14)과 물체 오른쪽 끝(12) 위치에 눈금
  const ticks = calls.filter((c) => c.k === "line" && c.a[0][1] === 0 && c.a[1][1] < 0);
  assert.deepStrictEqual(ticks.map((c) => c.a[0][0]).sort((a, b) => a - b), [-14, 12]);
  // 바닥은 바닥 왼쪽 길이부터 도르래 중심까지
  const ground = calls.find((c) => c.k === "line" && c.a[0][1] === 0 && c.a[1][1] === 0);
  near(ground.a[0][0], -26, "바닥 왼쪽"); near(ground.a[1][0], cx, "바닥 오른쪽");
  // NaN 없음
  assert.ok(!JSON.stringify(calls).includes("null,null") && !/NaN/.test(JSON.stringify(calls)));
}
{
  // 점선·거리 표시를 끄면 해당 그리기가 사라진다
  const o = Object.assign(defaultsOf("makeHorizontalPulleyEngine"), { ghostBlock: false, ghostWeight: false, dim: false, pulleyArm: false });
  const calls = record(o, scenes.drawHorizontalPulley);
  assert.strictEqual(calls.filter((c) => c.k === "rect" && c.a[4] === null).length, 0);
  assert.strictEqual(calls.find((c) => c.k === "pulley").a[3], null);
  assert.ok(!calls.some((c) => c.k === "text" && (c.a[0] === "P" || c.a[0] === "1 m" || c.a[0] === "2 m/s")));
}
console.log("mechanics device checks passed");
