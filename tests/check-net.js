const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
// 중학교 수학 묶음(Object_MiddleMath.jsx)의 "Net" 탭 엔진만 잘라 읽는다. 탭마다 같은 이름의 함수가 있다
const bundle = fs.readFileSync(path.join(root, "스크립트", "07_수학", "Object_MiddleMath.jsx"), "utf8");
const source = (() => {
  const start = bundle.indexOf("function makeNetEngine(");
  assert.ok(start >= 0, "missing engine: makeNetEngine");
  let depth = 0;
  for (let index = bundle.indexOf("{", start); index < bundle.length; index++) {
    if (bundle[index] === "{") depth++;
    if (bundle[index] === "}" && --depth === 0) return bundle.slice(start, index + 1);
  }
  throw new Error("unbalanced engine");
})();

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

const names = ["cubeNets", "buildNet", "netLines", "chainLoops", "netBounds", "rect", "regularOnEdge", "attachOutside",
  "ccw", "straight", "arcPoints", "pointKey", "edgeKey", "midpoint", "sub", "offset", "unit"];
const g = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const near = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
const sizes = { net: 1, count: 4, side: 10, depth: 6, height: 15, lateral: 12, radius: 5, slant: 12 };

// 정육면체 전개도 11가지: 굴려 접으면 여섯 칸이 서로 다른 면에 닿는다
{
  const nets = g.cubeNets();
  assert.strictEqual(nets.length, 11);
  const roll = (d, dir) => {
    const { bottom, top, north, south, east, west } = d;
    if (dir === "E") return { bottom: east, top: west, east: top, west: bottom, north, south };
    if (dir === "W") return { bottom: west, top: east, west: top, east: bottom, north, south };
    if (dir === "N") return { bottom: north, top: south, north: top, south: bottom, east, west };
    return { bottom: south, top: north, south: top, north: bottom, east, west };
  };
  const shapes = new Set();
  for (const cells of nets) {
    const keyOf = (c) => c.join(",");
    const has = new Set(cells.map(keyOf));
    const seen = new Map([[keyOf(cells[0]), { bottom: 0, top: 1, north: 2, south: 3, east: 4, west: 5 }]]);
    const queue = [cells[0]];
    while (queue.length) {
      const c = queue.shift(), die = seen.get(keyOf(c));
      for (const [dx, dy, dir] of [[1, 0, "E"], [-1, 0, "W"], [0, -1, "N"], [0, 1, "S"]]) {
        const n = [c[0] + dx, c[1] + dy];
        if (has.has(keyOf(n)) && !seen.has(keyOf(n))) { seen.set(keyOf(n), roll(die, dir)); queue.push(n); }
      }
    }
    assert.strictEqual(new Set([...seen.values()].map((d) => d.bottom)).size, 6, `net ${cells} folds to a cube`);
    // 서로 다른 모양 (돌리기·뒤집기로 같은 것은 같은 모양)
    const variants = [];
    for (let t = 0; t < 8; t++) {
      let pts = cells.map(([x, y]) => (t & 4 ? [y, x] : [x, y])).map(([x, y]) => [t & 1 ? -x : x, t & 2 ? -y : y]);
      const mx = Math.min(...pts.map((p) => p[0])), my = Math.min(...pts.map((p) => p[1]));
      variants.push(pts.map(([x, y]) => `${x - mx},${y - my}`).sort().join(" "));
    }
    shapes.add(variants.sort()[0]);
  }
  assert.strictEqual(shapes.size, 11, "all 11 nets are different");
}

// 면 수와 접는 선 수 (모서리 수 = 바깥 모서리/2 + 접는 선 … 면 n개 트리면 접는 선 n-1개)
const countLines = (kind, extra = {}) => {
  const net = g.buildNet(kind, Object.assign({}, sizes, extra));
  const lines = g.netLines(net);
  return { net, folds: lines.filter((l) => l.fold).length, outlines: lines.filter((l) => !l.fold) };
};
for (const [kind, faces, extra] of [[0, 6], [1, 6], [2, 6], [2, 8, { count: 6 }], [3, 5], [3, 7, { count: 6, lateral: 15 }], [6, 4], [7, 8], [8, 20]]) {
  const r = countLines(kind, extra);
  assert.strictEqual(r.net.faces.length, faces, `kind ${kind} faces`);
  assert.strictEqual(r.folds, faces - 1, `kind ${kind}: a net is a tree of faces`);
  assert.strictEqual(r.outlines.length, 1, `kind ${kind}: one closed outline`);
  assert.ok(r.outlines[0].closed);
}

// 정다면체 면은 모두 정다각형, 모서리 길이 같음
for (const kind of [6, 7, 8]) {
  for (const face of g.buildNet(kind, sizes).faces) {
    for (let i = 0; i < face.length; i++) near(Math.hypot(...g.sub(face[(i + 1) % face.length], face[i])), 10, `kind ${kind} edge`);
  }
}

// 각기둥 밑면은 옆면과 모서리를 나눈다 (전개도가 끊어지지 않음)
{
  const net = g.buildNet(2, Object.assign({}, sizes, { count: 5 }));
  for (const base of net.faces.slice(5)) {
    const shared = net.faces.slice(0, 5).some((f) => f.some((p) => base.some((q) => g.pointKey(p) === g.pointKey(q))));
    assert.ok(shared, "prism base touches a side face");
  }
}

// 원기둥: 옆면 가로 = 밑면 둘레, 원은 옆면에 닿는다
{
  const net = g.buildNet(4, sizes);
  near(net.faces[0][1][0], 2 * Math.PI * 5, "lateral width = circumference");
  near(net.circles[0].center[1] - net.circles[0].radius, 15, "top circle touches");
  near(net.circles[1].center[1] + net.circles[1].radius, 0, "bottom circle touches");
}

// 원뿔: 부채꼴 호 길이 = 밑면 둘레, 원은 호 가운데에 닿는다
{
  const net = g.buildNet(5, sizes);
  const sector = net.sectors[0];
  near(sector.radius * sector.sweep, 2 * Math.PI * 5, "arc length = circumference");
  near(net.circles[0].center[1] + net.circles[0].radius, -12, "circle touches arc");
  assert.ok(g.buildNet(5, Object.assign({}, sizes, { radius: 12 })).message, "radius >= slant is refused");
}

// 각뿔 옆모서리가 짧으면 경고
assert.ok(g.buildNet(3, Object.assign({}, sizes, { lateral: 7 })).message, "too short to fold");
assert.strictEqual(g.buildNet(3, sizes).message, "");

assert.ok(source.includes('var PREF_KEY = "Net/settings";'));
console.log("net checks passed");
