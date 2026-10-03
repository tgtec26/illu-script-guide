const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_Induction.jsx"), "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);
assert.ok(fs.existsSync(path.join(root, "스크립트", "01_도형", "Object_Induction_template.ai")), "template .ai next to the script");

// 순수 기하 구간을 그대로 읽는다
const start = source.indexOf("// ==== 순수 기하 시작");
const end = source.indexOf("// ==== 순수 기하 끝");
assert.ok(start > 0 && end > start, "pure geometry markers");
const lib = new Function(`${source.slice(start, end)}
return {MM, TILT, WIRE_MM, frontHalfTurn, windingPlan, offsetPoints, poleSwapNeeded};`)();
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

// 감기 계획: 템플릿 원통의 테두리 안에서, 앞쪽 처짐만큼 위에서 시작해 위 테두리를 넘지 않는다
{
  const bounds = [-10 * MM, 50 * MM, 10 * MM, 0];
  for (const turns of [5, 20, 80]) {
    const plan = lib.windingPlan(bounds, turns);
    near(plan.cx, 0, 1e-9, "centre x");
    near(plan.rw, 10 * MM + plan.wire / 2, 1e-9, "wire sits on the cylinder: sticks out by half its width");
    near(plan.e, plan.rw * TILT, 1e-9, "front dip from the wire radius");
    assert.ok(plan.y0 - plan.e - plan.wire / 2 >= -1e-9, `turns=${turns}: front of the first turn stays above the bottom`);
    const lastRightEnd = plan.y0 + (turns - 1) * plan.pitch + plan.pitch / 2;
    assert.ok(lastRightEnd + plan.wire / 2 <= bounds[1] + 1e-9, `turns=${turns}: last turn stays under the top`);
    assert.ok(plan.wire <= plan.pitch, `turns=${turns}: wire fits the pitch`);
  }
  const sparse = lib.windingPlan(bounds, 5), dense = lib.windingPlan(bounds, 80);
  near(sparse.wire, 0.75 * MM, 1e-9, "sparse wire");
  assert.ok(dense.wire < sparse.wire, "dense wire thinner");
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
