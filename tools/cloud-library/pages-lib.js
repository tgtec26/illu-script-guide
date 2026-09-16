// 아트보드마다 구름 하나씩 그린 .ai(PDF 호환)에서 뽑은 패스(ai-extract.js 결과)를 스크립트 라이브러리(.jsxinc)로 만든다.
// 사용: node pages-lib.js <extract.json> <out.jsxinc> [sheet.svg]
// 역할은 색으로 정한다: 채움 K0 = 구름, K20 = 그림자 1, K40 = 그림자 2, 채움 K100(윤곽선을 면으로 만든 링) = 외곽선(바깥 고리를 0.3pt 획으로),
// 획 K100 = 선(도판 규격에 맞춰 0.3pt로 통일). 그 밖의 색은 버린다. 그리는 순서는 원본 그대로.
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const outInc = process.argv[3];
const outSvg = process.argv[4];
const ROUND = 4;
const OUTLINE_PT = 0.3;

function kOf(color) {
  if (!color) return null;
  if (color.raw.length === 4 && color.raw[0] === 0 && color.raw[1] === 0 && color.raw[2] === 0) return Math.round(color.raw[3] * 100);
  if (color.raw.length === 1) return Math.round((1 - color.raw[0]) * 100);
  return null;   // 유채색
}
function roleOf(p) {
  if (p.fill) {
    const k = kOf(p.fill);
    if (k === 0) return "cloud";
    if (k === 20) return "shadow1";
    if (k === 40) return "shadow2";
    if (k === 100) return "outline";
    return null;
  }
  if (p.stroke && kOf(p.stroke) === 100) return "line";
  return null;
}
function sample(a, b, t) {
  const u = t, v = 1 - t;
  return [v * v * v * a[0] + 3 * v * v * u * a[4] + 3 * v * u * u * b[2] + u * u * u * b[0],
    v * v * v * a[1] + 3 * v * v * u * a[5] + 3 * v * u * u * b[3] + u * u * u * b[1]];
}
// PDF 세그먼트 → 앵커 [ax, ay, lx, ly, rx, ry] 목록. closed: 끝점이 시작점으로 돌아오면 참
function toAnchors(subpath) {
  const pts = [];
  let cur = null;
  let closedOp = false;
  for (const seg of subpath) {
    if (seg.op === "M") { cur = seg.pts[0]; pts.push({ p: cur, cin: null, cout: null }); }
    else if (seg.op === "L") { const last = pts[pts.length - 1]; last.cout = last.p; cur = seg.pts[0]; pts.push({ p: cur, cin: cur, cout: null }); }
    else if (seg.op === "C") { const last = pts[pts.length - 1]; last.cout = seg.pts[0]; cur = seg.pts[2]; pts.push({ p: cur, cin: seg.pts[1], cout: null }); }
    else if (seg.op === "Z") closedOp = true;
  }
  if (pts.length < 2) return null;
  const first = pts[0], last = pts[pts.length - 1];
  let closed = closedOp;
  if (Math.hypot(first.p[0] - last.p[0], first.p[1] - last.p[1]) < 1e-3 && pts.length > 2) {
    first.cin = last.cin;
    pts.pop();
    closed = true;
  }
  return { closed, anchors: pts.map((q) => [q.p[0], q.p[1], (q.cin || q.p)[0], (q.cin || q.p)[1], (q.cout || q.p)[0], (q.cout || q.p)[1]]) };
}
function polygonArea(anchors) {
  let area = 0;
  for (let i = 0; i < anchors.length; i++) { const a = anchors[i], b = anchors[(i + 1) % anchors.length]; area += a[0] * b[1] - b[0] * a[1]; }
  return area / 2;
}

const pages = {};
for (const p of data.paths) (pages[p.page] = pages[p.page] || []).push(p);
const library = [];
const dropped = [];
for (const key of Object.keys(pages).map(Number).sort((a, b) => a - b)) {
  const items = [];
  for (const p of pages[key]) {
    const role = roleOf(p);
    if (role === null) { dropped.push(`page ${key + 1}: ${p.fill ? "fill " + JSON.stringify(p.fill.raw) : "stroke " + JSON.stringify(p.stroke.raw)}`); continue; }
    let subpaths = p.subpaths.map(toAnchors).filter((s) => s && s.anchors.length >= 2);
    if (subpaths.length === 0) continue;
    if (role === "outline") {
      // 링(바깥 고리 + 안쪽 고리) 중 넓이가 큰 바깥 고리만 0.3pt 획으로
      subpaths.sort((a, b) => Math.abs(polygonArea(b.anchors)) - Math.abs(polygonArea(a.anchors)));
      subpaths = [subpaths[0]];
      items.push({ role: "outline", kind: "stroke", width: OUTLINE_PT, subpaths });
    } else if (role === "line") {
      items.push({ role: "line", kind: "stroke", width: OUTLINE_PT, subpaths });
    } else {
      items.push({ role, kind: "fill", subpaths });
    }
  }
  // 정규화: 실제 곡선 범위 → 높이 1
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items) for (const sp of it.subpaths) {
    const n = sp.anchors.length;
    for (let i = 0; i < n; i++) {
      if (!sp.closed && i === n - 1) break;
      const a = sp.anchors[i], b = sp.anchors[(i + 1) % n];
      for (let t = 0; t <= 16; t++) { const q = sample(a, b, t / 16); minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }
    }
  }
  const H = maxY - minY;
  const norm = (v, isX) => Number(((isX ? v - minX : v - minY) / H).toFixed(ROUND));
  const entry = {
    name: String(key + 1), aspect: Number(((maxX - minX) / H).toFixed(4)),
    items: items.map((it) => ({ role: it.role, kind: it.kind, width: it.width, subpaths: it.subpaths.map((sp) => ({ closed: sp.closed, anchors: sp.anchors.map((a) => [norm(a[0], true), norm(a[1], false), norm(a[2], true), norm(a[3], false), norm(a[4], true), norm(a[5], false)]) })) })),
  };
  library.push(entry);
}

let inc = `// Object_Cloud_library.jsxinc\r\n// 구름 라이브러리. Object_Cloud.jsx가 #include로 읽는다.\r\n`;
inc += `// 사용자가 일러스트레이터에서 아트보드마다 하나씩 그린 구름을 tools/cloud-library(ai-extract.js → pages-lib.js)로 뽑은 것.\r\n`;
inc += `// 구름마다 {name, aspect, items}. 좌표는 높이 1 기준(x 0~aspect, y 0~1, 위가 +). items는 그리는 순서(뒤→앞).\r\n`;
inc += `// item = {role: cloud|shadow1|shadow2|outline|line, kind: fill|stroke, width(pt, 획만), subpaths: [{closed, anchors: [[x, y, 왼쪽 핸들 x, y, 오른쪽 핸들 x, y], ...]}]}\r\n`;
inc += `var CLOUD_LIBRARY = [\r\n`;
inc += library.map((e) => `    {name: ${JSON.stringify(e.name)}, aspect: ${e.aspect}, items: [\r\n` +
  e.items.map((it) => `        {role: ${JSON.stringify(it.role)}, kind: ${JSON.stringify(it.kind)}, width: ${it.width === undefined ? 0 : it.width}, subpaths: ${JSON.stringify(it.subpaths)}}`).join(",\r\n") +
  `\r\n    ]}`).join(",\r\n");
inc += `\r\n];\r\n`;
fs.writeFileSync(outInc, inc);
console.log(`library: ${library.length} clouds, ${Math.round(inc.length / 1024)} KB → ${outInc}`);
library.forEach((e) => console.log(`  ${e.name}: aspect ${e.aspect}, ${e.items.map((it) => it.role + (it.kind === "stroke" ? "(" + it.width + ")" : "")).join(" ")}`));
if (dropped.length) console.log("dropped:\n  " + dropped.join("\n  "));

if (outSvg) {
  const cellW = 300, cellH = 170, cols = 3;
  let svg = "";
  library.forEach((e, idx) => {
    const ox = 10 + (idx % cols) * (cellW + 10), oy = 10 + Math.floor(idx / cols) * (cellH + 10);
    const s = Math.min((cellW - 10) / e.aspect, cellH - 20);
    const tf = (x, y) => [ox + 5 + x * s, oy + 5 + (1 - y) * s];
    svg += `<rect x="${ox}" y="${oy}" width="${cellW}" height="${cellH}" fill="#fff"/>`;
    for (const it of e.items) {
      let d = "";
      for (const sp of it.subpaths) {
        const n = sp.anchors.length;
        for (let i = 0; i < n; i++) {
          if (!sp.closed && i === n - 1) break;
          const a = sp.anchors[i], b = sp.anchors[(i + 1) % n];
          const A = tf(a[0], a[1]), R = tf(a[4], a[5]), L = tf(b[2], b[3]), B = tf(b[0], b[1]);
          if (i === 0) d += `M${A[0].toFixed(1)},${A[1].toFixed(1)} `;
          d += `C${R[0].toFixed(1)},${R[1].toFixed(1)} ${L[0].toFixed(1)},${L[1].toFixed(1)} ${B[0].toFixed(1)},${B[1].toFixed(1)} `;
        }
        if (sp.closed) d += "Z ";
      }
      const k = { cloud: 0, shadow1: 20, shadow2: 40 }[it.role];
      if (it.kind === "fill") { const g = Math.round(255 * (1 - k / 100)); svg += `<path d="${d}" fill="rgb(${g},${g},${g})"/>`; }
      else svg += `<path d="${d}" fill="none" stroke="#000" stroke-width="${(it.width * s / 60).toFixed(2)}" stroke-linecap="round"/>`;
    }
    svg += `<text x="${ox + 4}" y="${oy + cellH - 4}" font-size="10" font-family="sans-serif">${e.name} · aspect ${e.aspect} · ${e.items.map((it) => it.role).join(" ")}</text>`;
  });
  const rows = Math.ceil(library.length / cols);
  fs.writeFileSync(outSvg, `<svg xmlns="http://www.w3.org/2000/svg" width="${20 + cols * (cellW + 10)}" height="${20 + rows * (cellH + 10)}" style="background:#9cf">${svg}</svg>`);
}
