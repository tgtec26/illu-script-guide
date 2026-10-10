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
const scenes = new Function(`var GHOST_DASH = [2, 1], HEAD_HARPOON = 1, NAME_GAP_MM = 1, ARROW_GAP_MM = 1, ARROW_HEAD_MM = 1.4, ARROW_HALF_MM = 1.4 * 0.35;\n${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();

// 컨트롤 기본값을 소스의 controls 배열에서 읽는다 (+ 엔진이 붙이는 선 두께 기본값)
function defaultsOf(engineName) {
  const start = source.indexOf(`function ${engineName}(`);
  const end = source.indexOf("draw:", start);
  const text = source.slice(start, end);
  const o = { wBody: 0.8, wObj: 0.4, wRope: 0.4, wGuide: 0.3 };
  for (const m of text.matchAll(/\{key: "(\w+)",[^}]*?(?:check: "[^"]*"|text: true|min: [^,]+,[^}]*?)[^}]*?value: ("[^"]*"|true|false|[-\d.]+)\}/g)) o[m[1]] = JSON.parse(m[2]);
  return o;
}
function record(o, fn) {
  const calls = [];
  const t = { mm: 1 };
  for (const k of ["line", "rect", "circle", "arc", "arrow", "text", "path", "curve", "pulley", "dashLine", "dashRect", "headArrow", "textAt"]) t[k] = (...a) => { calls.push({ k, a }); };
  fn(t, o);
  return calls;
}
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);

{
  const o = defaultsOf("makeHorizontalPulleyEngine");
  assert.strictEqual(o.blockText, "4 kg"); assert.strictEqual(o.ropeLen, 28); assert.strictEqual(o.dim, true); assert.strictEqual(o.shift, 24);
  const calls = record(o, scenes.drawHorizontalPulley);
  const bw = 13, bh = 11, R = 3.6, attachY = bh / 2, cx = bw + 28, cy = attachY - R, shift = 24, drop = 42, wh = 8;
  const wx = cx + R, wTop = cy - drop;
  // 도르래: 가운데·반지름, 받침대 끝은 바닥(y=0) 위 도르래 왼쪽(볼트는 모서리보다 안쪽)
  const pulley = calls.find((c) => c.k === "pulley");
  near(pulley.a[0], cx, "도르래 x"); near(pulley.a[1], cy, "도르래 y"); near(pulley.a[2], R, "도르래 반지름");
  const mount = pulley.a[3];
  near(mount[1], 0, "받침대 끝 높이"); assert.ok(mount[0] < cx, "받침대는 왼쪽으로");
  near(Math.hypot(mount[0] - cx, mount[1] - cy), 9, "받침대 길이");
  const edgeX = cx - 2;
  assert.ok(mount[0] < edgeX - 3, "볼트는 테이블 모서리보다 안쪽(왼쪽)");
  near(pulley.a[4], 0.4, "도르래 겉 두께"); near(pulley.a[5], 0.3, "도르래 안쪽 두께");
  // 실은 물체 옆면 가운데(높이 절반)에서 수평으로 도르래 꼭대기까지
  const rope = calls.find((c) => c.k === "line" && c.a[0][0] === bw && c.a[0][1] === attachY);
  assert.ok(rope, "수평 실"); near(rope.a[1][0], cx, "실 끝 x"); near(rope.a[1][1], cy + R, "실 끝 y");
  near(rope.a[2], 0.4, "실 두께");
  const arc = calls.find((c) => c.k === "arc");
  near(arc.a[0], cx, "호 중심 x"); near(arc.a[3], 0, "호 시작"); near(arc.a[4], Math.PI / 2, "호 끝");
  const vertical = calls.find((c) => c.k === "line" && c.a[0][0] === wx && c.a[1][0] === wx);
  near(vertical.a[0][1], cy, "수직 실 시작"); near(vertical.a[1][1], wTop, "추 위");
  // 테이블: 윗면은 모서리(받침대 끝)까지, 모서리에서 아래로 세로선 (추 아래 4mm까지), 두께 0.8
  const ground = calls.find((c) => c.k === "line" && c.a[0][1] === 0 && c.a[1][1] === 0);
  near(ground.a[0][0], -shift - 8, "바닥 왼쪽"); near(ground.a[1][0], edgeX, "바닥은 모서리에서 끝"); near(ground.a[2], 0.8, "바닥 두께");
  const edge = calls.find((c) => c.k === "line" && Math.abs(c.a[0][0] - edgeX) < 1e-9 && Math.abs(c.a[1][0] - edgeX) < 1e-9);
  assert.ok(edge, "테이블 세로선"); near(edge.a[0][1], 0, "세로선 위"); near(edge.a[1][1], wTop - wh - 4, "세로선 아래"); near(edge.a[2], 0.8, "세로선 두께");
  // 물체·추 테두리 0.4, 물체가 추보다 먼저 흰 칠
  const solid = calls.filter((c) => c.k === "rect" && c.a[4] === 0);
  assert.strictEqual(solid.length, 2);
  for (const r of solid) near(r.a[6], 0.4, "물체·추 두께");
  // 이동 거리: 파선 물체는 shift만큼 왼쪽, 파선 추는 shift만큼 위 → 같다
  const ghosts = calls.filter((c) => c.k === "dashRect");
  assert.strictEqual(ghosts.length, 2);
  const ghostBlock = ghosts[0].a, ghostWeight = ghosts[1].a;
  near(0 - ghostBlock[0], shift, "물체가 간 거리 (왼쪽 끝)"); near(bw - ghostBlock[2], shift, "물체가 간 거리 (오른쪽 끝)");
  near(ghostWeight[1] - wTop, shift, "추가 간 거리"); near(0 - ghostBlock[0], ghostWeight[1] - wTop, "물체와 추가 간 거리가 같다");
  near(ghostBlock[4], 0.3, "파선 상자 두께");
  // 속도 화살표·글자는 이전 위치 물체의 가운데 위에 있다
  const gcx = (ghostBlock[0] + ghostBlock[2]) / 2;
  const half = 1.4 * 0.35;
  const speedArrow = calls.find((c) => c.k === "arrow" && c.a[0][0] < c.a[1][0] && c.a[0][1] === c.a[1][1]);
  near((speedArrow.a[0][0] + speedArrow.a[1][0]) / 2, gcx, "속도 화살표 가운데");
  near(speedArrow.a[0][1], bh + 1 + half, "물체 속도 화살표는 물체 위 1mm (화살촉 가장자리 기준)");
  const speedText = calls.filter((c) => c.k === "textAt" && c.a[0] === "2 m/s");
  near(speedText[0].a[1], gcx, "속도 글자 가운데"); near(speedText[0].a[2], speedArrow.a[0][1] + half + 1, "속도 글자는 화살표 위 1mm");
  // 추 속도 화살표: 점선 추 오른쪽 1mm, 글자는 화살표 오른쪽 1mm
  const downArrow = calls.find((c) => c.k === "arrow" && c.a[0][0] === c.a[1][0]);
  near(downArrow.a[0][0], wx + 9 / 2 + 1 + half, "추 속도 화살표는 추 오른쪽 1mm");
  near(speedText[1].a[1], downArrow.a[0][0] + half + 1, "추 속도 글자는 화살표 오른쪽 1mm");
  // 거리 표시: P(파선 물체 오른쪽 끝)~Q(물체 오른쪽 끝) = 이동 거리, 보조선 파선, 화살촉 평가원 작살형
  const ticks = calls.filter((c) => c.k === "dashLine");
  assert.deepStrictEqual(ticks.map((c) => c.a[0][0]).sort((a, b) => a - b), [bw - shift, bw]);
  const heads = calls.filter((c) => c.k === "headArrow");
  assert.strictEqual(heads.length, 2);
  for (const h of heads) assert.strictEqual(h.a[5], 1, "작살형");
  const ends = heads.map((h) => h.a[1][0]).sort((a, b) => a - b);
  near(ends[1] - ends[0], shift, "표시한 거리 = 이동 거리");
  // 글자
  // 이름 글자는 도형에서 1mm 떨어진 자리에 윤곽 기준으로 놓는다 (나무도막: 물체 위, 추: 오른쪽)
  const nameBlock = calls.find((c) => c.k === "textAt" && c.a[0] === "나무도막"), nameWeight = calls.find((c) => c.k === "textAt" && c.a[0] === "추");
  near(nameBlock.a[1], bw / 2, "물체 이름 가운데"); near(nameBlock.a[2], bh + 1, "물체 이름 아래 간격 1mm"); assert.strictEqual(nameBlock.a[4], "above");
  near(nameWeight.a[1], wx + 9 / 2 + 1, "추 이름 왼쪽 간격 1mm"); near(nameWeight.a[2], wTop - wh / 2, "추 이름 세로 가운데"); assert.strictEqual(nameWeight.a[4], "right");
  const texts = calls.filter((c) => c.k === "text" || c.k === "textAt").map((c) => c.a[0]);
  for (const s of ["4 kg", "나무도막", "1 kg", "추", "1 m", "P", "Q"]) assert.ok(texts.includes(s), s);
  assert.strictEqual(texts.filter((s) => s === "2 m/s").length, 2);
  assert.ok(!/NaN/.test(JSON.stringify(calls)));
}
{
  // 이동 거리를 바꿔도 물체와 추가 간 거리는 같고, 점선·거리·테이블 세로선·받침대를 끄면 사라진다
  const o = Object.assign(defaultsOf("makeHorizontalPulleyEngine"), { shift: 31, ghostBlock: false, ghostWeight: false, dim: false, pulleyArm: false, tableEdge: false });
  const calls = record(o, scenes.drawHorizontalPulley);
  assert.strictEqual(calls.filter((c) => c.k === "dashRect").length, 0);
  assert.strictEqual(calls.filter((c) => c.k === "dashLine").length, 0);
  assert.strictEqual(calls.find((c) => c.k === "pulley").a[3], null);
  assert.ok(!calls.some((c) => c.k === "text" && (c.a[0] === "P" || c.a[0] === "1 m" || c.a[0] === "2 m/s")));
  const on = Object.assign(defaultsOf("makeHorizontalPulleyEngine"), { shift: 31 });
  const c2 = record(on, scenes.drawHorizontalPulley).filter((c) => c.k === "dashRect");
  near(0 - c2[0].a[0], 31, "이동 거리 31 (물체)"); near(c2[1].a[1] - (1.9 - 42), 31, "이동 거리 31 (추)");
}
console.log("mechanics device checks passed");
