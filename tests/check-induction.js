const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "전자기 유도.jsx"), "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);
assert.ok(fs.existsSync(path.join(root, "스크립트", "01_도형", "Object_Induction_template.ai")), "template .ai next to the script");

// 순수 기하 구간을 그대로 읽는다
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝");
assert.ok(start > 0 && end > start, "pure geometry markers");
const lib = new Function(`${source.slice(start, end)}
return {MM, TILT, frontHalfTurn, windingPlan, offsetPoints, poleSwapNeeded};`)();
const {MM, TILT} = lib;
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);

// 앞쪽 반바퀴: 왼쪽 끝 y0 → 앞(가장 낮음) → 오른쪽 끝(반 간격 높음)
{
  const r = 30, e = r * TILT, pitch = 6, y0 = 10;
  const [left, front, right] = lib.frontHalfTurn(r, e, pitch, y0);
  near(left.anchor[0], -r, 1e-9, "starts at the left edge");
  near(left.anchor[1], y0, 1e-9, "left end height");
  near(front.anchor[1], y0 + pitch / 4 - e, 1e-9, "front dips by the ellipse radius");
  near(right.anchor[1], y0 + pitch / 2, 1e-9, "helix rises half a pitch across the front");
  assert.deepStrictEqual(left.left, left.anchor, "open start has no incoming handle");
}

// 감기 계획: 굵기는 옵션 그대로, 간격은 영역 높이에 맞춰 자동. 도선은 기둥 밖으로 굵기 반만큼 나오고
// 첫 바퀴는 앞쪽 처짐만큼 위에서 시작하며 마지막 바퀴는 위 테두리를 넘지 않는다
{
  const bounds = [-10 * MM, 50 * MM, 10 * MM, 0];
  for (const turns of [1, 5, 20, 80]) {
    const plan = lib.windingPlan(bounds, turns, 0.75);
    near(plan.wire, 0.75 * MM, 1e-9, `turns=${turns}: wire thickness as given`);
    near(plan.rw, 10 * MM + plan.wire / 2, 1e-9, "wire sits on the cylinder: sticks out by half its width");
    near(plan.y0 - plan.e - plan.wire / 2, 0, 1e-9, "front of the first turn sits on the bottom");
    const lastRightEnd = plan.y0 + (turns - 1) * plan.pitch + plan.pitch / 2;
    assert.ok(lastRightEnd + plan.wire / 2 <= bounds[1] + 1e-9, `turns=${turns}: last turn stays under the top`);
  }
  const sparse = lib.windingPlan(bounds, 5, 0.75), dense = lib.windingPlan(bounds, 80, 0.75);
  assert.ok(dense.pitch < sparse.pitch, "more turns → tighter pitch");
  assert.ok(dense.pitch < dense.wire, "dense turns overlap instead of thinning");
  near(lib.windingPlan(bounds, 5, 0.5).wire, 0.5 * MM, 1e-9, "thinner wire option");
}

// 점 이동과 극 판정
{
  const moved = lib.offsetPoints([{anchor: [1, 2], left: [0, 2], right: [2, 2]}], 10, -1);
  assert.deepStrictEqual(moved[0], {anchor: [11, 1], left: [10, 1], right: [12, 1]});
  assert.strictEqual(lib.poleSwapNeeded(10, 50, false), true, "S below, want N below → swap");
  assert.strictEqual(lib.poleSwapNeeded(10, 50, true), false, "S below, want S below → keep");
  assert.strictEqual(lib.poleSwapNeeded(50, 10, false), false, "N below, want N below → keep");
}

console.log("check-induction: ok");
