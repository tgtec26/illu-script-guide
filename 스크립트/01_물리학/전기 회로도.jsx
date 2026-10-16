// 전기 회로도: 자유 배치·병렬 두 가지·대상 양 끝의 전압계. 기하는 웹 circuit-layout.js와 동일.
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    if (!app.documents.length) { alert("문서를 열어주세요."); return; }
    var doc = app.activeDocument, MM = 2.834645669, UNIT = MM / 8;
    var PREF_KEY = "CircuitDiagram/settings";
    var o = {loopW:40, loopH:30, scale:100, fontSize:8, parallel:false, branchStart:120, branchEnd:240, branchGap:10,
        meterOn:false, meterTarget:1, meterGap:10, meterInside:false, top:"battery", right:"resistor", bottom:"switchOpen", left:"ammeter"};
    var elements, count = 4, selected = 0, dx = 0, dy = 0, preview = null, previewOn = true, busy = true;
    var posX = 0, posY = 0;
    // BEGIN CIRCUIT CORE (tools/sync-circuit-native.py)
// 전기 회로 기호 생성기 — Illustrator 스크립트 Object_CircuitSymbol.jsx의 기호 기하 이식.
// 각 기호는 도선 방향 u = +x, 수평 기준으로 (0,0) 중심에 그려지는 프리미티브 배열로 반환.
// (원본은 y 위로 증가하는 Illustrator 좌표계이므로, 화면 좌표에서는 y 부호를 뒤집는다.)

var PX_PER_MM = 8;
var PX_PER_PT = PX_PER_MM / 2.834645669; // 원본 굵기·크기(pt) → px

// ===== 크기 설정 — 원본 CFG의 mm/pt 값을 px로 환산 =====
var CFG = {
  textSize: 8 * PX_PER_PT,

  resistorHalf: 2 * PX_PER_MM,       // 저항 전체 폭 4mm의 절반
  resistorAmp: 0.75 * PX_PER_MM,     // 진폭 (전체 높이 1.5mm의 절반)
  resistorStroke: 0.5 * PX_PER_PT,

  batteryLongHalf: 1.5 * PX_PER_MM,  // 긴 극판 높이 3mm의 절반
  batteryShortHalf: 0.75 * PX_PER_MM,// 짧은 극판 높이 1.5mm의 절반
  batterySpacing: 0.6 * PX_PER_MM,   // 두 극판 사이 간격 0.6mm
  batteryLongStroke: 0.5 * PX_PER_PT,
  batteryShortStroke: 1.0 * PX_PER_PT,

  acRadius: 2 * PX_PER_MM,           // 원 지름 4mm의 절반
  acCircleStroke: 0.3 * PX_PER_PT,
  acWaveHalf: 1.6 * PX_PER_MM,       // 물결 폭의 절반
  acWaveStroke: 0.5 * PX_PER_PT,

  switchHalf: 1.75 * PX_PER_MM,      // 접점 사이 거리 3.5mm의 절반
  switchContactR: 1.1 * PX_PER_PT,
  switchContactStroke: 0.3 * PX_PER_PT,
  switchLeverStroke: 0.5 * PX_PER_PT,
  switchOpenAngle: 25,               // 열린 스위치 레버 각도(도)

  coilBumps: 4,                      // 위쪽 반원 개수
  coilRadius: 0.75 * PX_PER_MM,      // 코일 반지름 (전체 높이 1.5mm = 2r)
  coilAdvance: 2.5 * PX_PER_MM / (7 * Math.PI), // 전진량 (전체 폭 4mm = 7aπ + 2r)
  coilStroke: 0.3 * PX_PER_PT,

  capHalfGap: 0.35 * PX_PER_MM,      // 극판 사이 간격 0.7mm의 절반
  capPlateHalf: 1.5 * PX_PER_MM,     // 극판 높이 3mm의 절반
  capStroke: 0.5 * PX_PER_PT,

  meterRadius: 2 * PX_PER_MM,        // 원 지름 4mm의 절반
  meterStroke: 0.3 * PX_PER_PT,
  meterUnderlineStroke: 0.3 * PX_PER_PT,
  meterUnderlineGap: 0.4 * PX_PER_MM // 글자 하단과 밑줄 사이 간격
};

var SYMBOL_OPTIONS = [
  { value: 'none', label: '없음 (도선만)' },
  { value: 'resistor', label: '저항' },
  { value: 'battery', label: '직렬 전지' },
  { value: 'ac', label: '교류 전원' },
  { value: 'switchOpen', label: '열린 스위치' },
  { value: 'switchClosed', label: '닫힌 스위치' },
  { value: 'inductor', label: '인덕터(코일)' },
  { value: 'capacitor', label: '축전기' },
  { value: 'ammeter', label: '전류계 (A)' },
  { value: 'voltmeter', label: '전압계 (V)' }
];

// 코일 전체 폭의 절반 — 원본 coilHalfWidth
function coilHalfWidth() {
  var spanT = Math.PI * (2 * (CFG.coilBumps - 1) + 1); // 시작 -π/2 ~ 끝
  return (CFG.coilAdvance * spanT + 2 * CFG.coilRadius) / 2;
}

// 기호가 차지하는 도선 절단 반폭 (px) — 원본 halfGapFor
function halfGapFor(key) {
  switch (key) {
    case 'resistor': return CFG.resistorHalf;
    case 'battery': return CFG.batterySpacing / 2;
    case 'ac': return CFG.acRadius;
    case 'switchOpen':
    case 'switchClosed': return CFG.switchHalf + CFG.switchContactR;
    case 'inductor': return coilHalfWidth();
    case 'capacitor': return CFG.capHalfGap;
    case 'ammeter':
    case 'voltmeter': return CFG.meterRadius;
    default: return 0;
  }
}

// ===== 기호별 프리미티브 =====

function resistorPrims() {
  // 지그재그: 12등분, 홀수 지점마다 진폭 ± 교대 (원본 drawResistor)
  var w = CFG.resistorHalf;
  var a = CFG.resistorAmp;
  var seg = w * 2 / 12;
  var pts = [-w, 0];
  var sign = 1;
  for (var i = 1; i <= 11; i += 2) {
    pts.push(-w + seg * i, -a * sign); // 화면 y는 아래로 증가하므로 부호 반전
    sign = -sign;
  }
  pts.push(w, 0);
  return [{ type: 'line', points: pts, strokeWidth: CFG.resistorStroke, lineJoin: 'round' }];
}

function batteryPrims() {
  var half = CFG.batterySpacing / 2;
  return [
    // 긴 극판(+극) + 짧고 굵은 극판(-극)
    { type: 'line', points: [-half, -CFG.batteryLongHalf, -half, CFG.batteryLongHalf], strokeWidth: CFG.batteryLongStroke },
    { type: 'line', points: [half, -CFG.batteryShortHalf, half, CFG.batteryShortHalf], strokeWidth: CFG.batteryShortStroke }
  ];
}

function acPrims() {
  // 물결: 원본이 참조한 SVG(자산 2.svg) 앵커·핸들 좌표를 그대로 베지어 경로로 재현
  var s = CFG.acWaveHalf / 4.965; // SVG 반폭 → acWaveHalf 로 균일 축소
  var f = function(X, Y) {return ((X - 5.205) * s).toFixed(2) + ',' + ((Y - 2.69) * s).toFixed(2);};
  var data =
    'M' + f(0.24, 2.69) +
    'C' + f(0.99, 4.80) + ' ' + f(2.13, 5.13) + ' ' + f(2.72, 5.13) +
    'C' + f(3.39, 5.13) + ' ' + f(4.46, 4.80) + ' ' + f(5.20, 2.69) +
    'C' + f(5.95, 0.58) + ' ' + f(7.08, 0.25) + ' ' + f(7.69, 0.25) +
    'C' + f(8.41, 0.25) + ' ' + f(9.43, 0.58) + ' ' + f(10.17, 2.69);
  return [
    { type: 'circle', x: 0, y: 0, r: CFG.acRadius, strokeWidth: CFG.acCircleStroke },
    { type: 'path', data: data, strokeWidth: CFG.acWaveStroke }
  ];
}

function switchPrims(isOpen) {
  var h = CFG.switchHalf;
  var ex, ey;
  if (isOpen) {
    var rad = CFG.switchOpenAngle * Math.PI / 180;
    var leverLen = h * 2 + 1 * PX_PER_PT; // 원본: 접점 거리 + 1pt
    ex = -h + leverLen * Math.cos(rad);
    ey = -leverLen * Math.sin(rad); // 위로 들림
  } else {
    ex = h;
    ey = 0;
  }
  return [
    { type: 'line', points: [-h, 0, ex, ey], strokeWidth: CFG.switchLeverStroke },
    // 접점 원 (흰색 채움으로 레버 시작점을 가림)
    { type: 'circle', x: -h, y: 0, r: CFG.switchContactR, strokeWidth: CFG.switchContactStroke, fill: '#ffffff' },
    { type: 'circle', x: h, y: 0, r: CFG.switchContactR, strokeWidth: CFG.switchContactStroke, fill: '#ffffff' }
  ];
}

function inductorPrims() {
  // 프롤레이트 사이클로이드: 위쪽 큰 반원 + 아래쪽 작은 고리 (원본 drawInductor, 조밀 샘플링)
  var a = CFG.coilAdvance;
  var b = CFG.coilRadius;
  var t0 = -Math.PI / 2;
  var t1 = Math.PI * 2 * (CFG.coilBumps - 1) + Math.PI / 2;
  var n = 160;
  var uMid = a * (t0 + t1) / 2;
  var pts = [];
  for (var i = 0; i <= n; i++) {
    var t = t0 + (t1 - t0) * i / n;
    pts.push(a * t + b * Math.sin(t) - uMid, -b * Math.cos(t));
  }
  return [{ type: 'line', points: pts, strokeWidth: CFG.coilStroke, lineJoin: 'round' }];
}

function capacitorPrims() {
  var g = CFG.capHalfGap;
  var h = CFG.capPlateHalf;
  return [
    { type: 'line', points: [-g, -h, -g, h], strokeWidth: CFG.capStroke },
    { type: 'line', points: [g, -h, g, h], strokeWidth: CFG.capStroke }
  ];
}

function meterPrims(letter) {
  var r = CFG.meterRadius;
  var fs = CFG.textSize;
  var lift = 0.3 * PX_PER_MM;  // 원본: 밑줄 공간 확보를 위해 글자를 0.3mm 위로 보정
  var inkHalf = fs * 0.36;     // 글자 잉크 높이의 절반 근사 (원본은 아웃라인으로 실측)
  var underlineY = -lift + inkHalf + CFG.meterUnderlineGap;
  var uHalf = fs * 0.34;       // 글자 폭 절반 근사
  return [
    { type: 'circle', x: 0, y: 0, r: r, strokeWidth: CFG.meterStroke },
    { type: 'text', text: letter, fontSize: fs, x: -r, y: -r - lift, width: r * 2, height: r * 2 },
    { type: 'line', points: [-uHalf, underlineY, uHalf, underlineY], strokeWidth: CFG.meterUnderlineStroke }
  ];
}

// key에 해당하는 기호 프리미티브 배열 (수평 기준, (0,0) 중심)
function symbolPrimitives(key) {
  switch (key) {
    case 'resistor': return resistorPrims();
    case 'battery': return batteryPrims();
    case 'ac': return acPrims();
    case 'switchOpen': return switchPrims(true);
    case 'switchClosed': return switchPrims(false);
    case 'inductor': return inductorPrims();
    case 'capacitor': return capacitorPrims();
    case 'ammeter': return meterPrims('A');
    case 'voltmeter': return meterPrims('V');
    default: return [];
  }
}

// ES3 문법 유지: Illustrator 전기 회로도.jsx에도 같은 기하를 넣는다.
function circuitElements(o) {
  var defaults = ['battery', 'resistor', 'switchOpen', 'ammeter'];
  var old = [o.top, o.right, o.bottom, o.left], out = [], src = o.elements;
  var n = src && src.length ? Math.min(12, src.length) : 4;
  for (var i = 0; i < n; i++) {
    var e = src && src.length ? src[i] || {} : {key: old[i] || defaults[i], angle: i * 90};
    var valid = false;
    for (var j = 0; j < SYMBOL_OPTIONS.length; j++) if (SYMBOL_OPTIONS[j].value === e.key) valid = true;
    out.push({key: valid ? e.key : 'resistor', angle: circuitNumber(e.angle, 0, 359, i * 30),
      upper: e.upper !== false, reverse: e.reverse === true, name: String(e.name || '').slice(0, 80), value: String(e.value || '').slice(0, 80)});
  }
  return out;
}
function circuitNumber(v, min, max, fallback) {
  v = Number(v); if (!isFinite(v)) v = fallback; return Math.max(min, Math.min(max, v));
}
// 각도는 중앙에서 사각 도선으로 뻗은 방향. 0=12시, 시계방향. 경계는 0~4의 변 좌표.
function circuitPosition(angle, w, h) {
  var a = angle * Math.PI / 180, x = Math.sin(a), y = -Math.cos(a);
  var t = Math.min(Math.abs(x) < 1e-9 ? 1e12 : w / 2 / Math.abs(x), Math.abs(y) < 1e-9 ? 1e12 : h / 2 / Math.abs(y));
  x *= t; y *= t;
  if (Math.abs(y + h / 2) < 1e-6) return (x + w / 2) / w;
  if (Math.abs(x - w / 2) < 1e-6) return 1 + (y + h / 2) / h;
  if (Math.abs(y - h / 2) < 1e-6) return 2 + (w / 2 - x) / w;
  return 3 + (h / 2 - y) / h;
}
function circuitPoint(t, w, h) {
  t = ((t % 4) + 4) % 4;
  if (t <= 1) return [-w / 2 + t * w, -h / 2];
  if (t <= 2) return [w / 2, -h / 2 + (t - 1) * h];
  if (t <= 3) return [w / 2 - (t - 2) * w, h / 2];
  return [-w / 2, h / 2 - (t - 3) * h];
}
function circuitArc(a, b, w, h) {
  var pts = [circuitPoint(a, w, h)];
  for (var i = Math.floor(a) + 1; i < b - 1e-8; i++) pts.push(circuitPoint(i, w, h));
  pts.push(circuitPoint(b, w, h)); return pts;
}
function generateCircuit(o) {
  var m = PX_PER_MM, w = circuitNumber(o.loopW, 20, 160, 40) * m, h = circuitNumber(o.loopH, 15, 120, 30) * m;
  var scale = circuitNumber(o.scale, 50, 200, 100) / 100;
  var gap = circuitNumber(o.branchGap, 6, Math.min(w, h) / m - 4, 10) * m;
  var a = circuitPosition(circuitNumber(o.branchStart, 0, 359, 120), w, h);
  var b = circuitPosition(circuitNumber(o.branchEnd, 0, 359, 240), w, h);
  if (b <= a) b += 4;
  var g = {wires: [], symbols: [], texts: [], dots: [], error: '', placements: [], routes: []};
  if (o.parallel && (b - a < 0.05 || b - a > 3.8)) {g.error = '분기 시작과 끝을 서로 떨어뜨려 주세요.'; return g;}
  var routes = g.routes;
  function route(points) {var r = {points: points, slots: []}; routes.push(r); return r;}
  var common, upper, lower;
  if (o.parallel) {
    common = route(circuitArc(b, a + 4, w, h));
    var start = circuitPoint(a, w, h), end = circuitPoint(b, w, h);
    function branchPath(bw, bh) {
      var pts = circuitArc(a, b, bw, bh), first = pts[0], last = pts[pts.length - 1];
      var sa = Math.floor(a) % 2 === 0 ? [start[0], first[1]] : [first[0], start[1]];
      var sb = Math.floor(b) % 2 === 0 ? [end[0], last[1]] : [last[0], end[1]];
      return [start, sa].concat(pts.slice(1, pts.length - 1), [sb, end]);
    }
    upper = route(branchPath(w - gap, h - gap));
    lower = route(branchPath(w + gap, h + gap));
    g.dots.push(start, end);
  } else common = route(circuitArc(0, 4, w, h));
  // 기호는 한 직선 구간 위에만 놓는다. 모서리에서는 가장 가까운 충분한 길이의 구간으로 보정한다.
  function place(r, desired, half, index, key, reverse, fixed) {
    var best = null, bestDist = 1e30;
    for (var j = 0; j + 1 < r.points.length; j++) {
      if (fixed && j !== 1) continue;
      var p = r.points[j], q = r.points[j + 1], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2 * half + 4) continue;
      var u = ((desired[0] - p[0]) * dx + (desired[1] - p[1]) * dy) / len;
      u = Math.max(half + 2, Math.min(len - half - 2, u));
      var x = p[0] + dx / len * u, y = p[1] + dy / len * u, dist = Math.pow(x - desired[0], 2) + Math.pow(y - desired[1], 2);
      if (dist < bestDist) {bestDist = dist; best = {x: x, y: y, edge: j, u: u, half: half, ux: dx / len, uy: dy / len, index: index, key: key, rot: Math.atan2(dy, dx) * 180 / Math.PI + (reverse ? 180 : 0), scale: scale};}
    }
    if (!best) {g.error = (index < 0 ? '전압계' : '요소 ' + (index + 1)) + ': 기호를 놓을 공간이 부족합니다.'; return null;}
    for (var k = 0; k < r.slots.length; k++) {var other = r.slots[k]; if (other.edge === best.edge && Math.abs(other.u - best.u) < other.half + half + 3) g.error = '요소 ' + (index + 1) + ': 기호가 겹칩니다. 위치나 크기를 조절하세요.';}
    best.a = [best.x - best.ux * half, best.y - best.uy * half]; best.b = [best.x + best.ux * half, best.y + best.uy * half];
    r.slots.push(best); if (!fixed) g.placements.push(best); g.symbols.push(best); return best;
  }
  var elements = circuitElements(o);
  for (var i = 0; i < elements.length; i++) {
    var e = elements[i], pos = circuitPosition(e.angle, w, h), t = pos;
    while (t < a) t += 4;
    var inside = o.parallel && t > a + 1e-6 && t < b - 1e-6;
    var r = inside ? (e.upper ? upper : lower) : common;
    var d = inside ? circuitPoint(pos, e.upper ? w - gap : w + gap, e.upper ? h - gap : h + gap) : circuitPoint(pos, w, h);
    if (e.key === 'none') continue;
    var slot = place(r, d, halfGapFor(e.key) * scale, i, e.key, e.reverse, false);
    if (!slot) continue;
    slot.branch = inside ? (e.upper ? 'upper' : 'lower') : 'common';
    var text = e.name + (e.name && e.value ? ' ' : '') + e.value;
    var labelSide = o.meterOn && Math.round(circuitNumber(o.meterTarget, 0, elements.length - 1, 1)) === i && !o.meterInside ? -1 : 1;
    var nx = slot.uy * labelSide, ny = -slot.ux * labelSide;
    if (text) g.texts.push({text: text, x: slot.x + nx * 4 * m, y: slot.y + ny * 4 * m, align: Math.abs(nx) > 0.5 ? (nx > 0 ? 'left' : 'right') : 'center', fontSize: circuitNumber(o.fontSize, 5, 18, 8) * m / 2.834645669});
  }
  if (o.meterOn) {
    var targetIndex = Math.round(circuitNumber(o.meterTarget, 0, elements.length - 1, 1)), target = null;
    for (i = 0; i < g.placements.length; i++) if (g.placements[i].index === targetIndex) target = g.placements[i];
    if (!target || target.key === 'voltmeter' || target.key === 'ammeter') g.error = '전압계 연결 대상을 저항·전구·전지 등의 요소로 골라주세요.';
    else {
      var lead = target.half + 2 * m, off = circuitNumber(o.meterGap, 6, 35, 10) * m * (o.meterInside ? -1 : 1);
      var nx = target.uy, ny = -target.ux;
      var pa = [target.x - target.ux * lead, target.y - target.uy * lead], pb = [target.x + target.ux * lead, target.y + target.uy * lead];
      // 분기 접점은 대상과 같은 직선 도선 위, 모서리 바깥으로 넘어가지 않게 제한한다.
      var rt = target.branch === 'upper' ? upper : target.branch === 'lower' ? lower : common;
      var ep = rt.points[target.edge], eq = rt.points[target.edge + 1], el = Math.sqrt(Math.pow(eq[0] - ep[0], 2) + Math.pow(eq[1] - ep[1], 2));
      var roomA = target.u, roomB = el - target.u;
      for (var ns = 0; ns < rt.slots.length; ns++) {
        var neighbor = rt.slots[ns]; if (neighbor === target || neighbor.edge !== target.edge) continue;
        if (neighbor.u < target.u) roomA = Math.min(roomA, target.u - neighbor.u - neighbor.half - 2);
        else roomB = Math.min(roomB, neighbor.u - neighbor.half - target.u - 2);
      }
      var leadA = Math.min(lead, roomA), leadB = Math.min(lead, roomB);
      if (leadA < target.half + 2 || leadB < target.half + 2) g.error = '전압계 연결 공간이 부족합니다. 대상을 모서리나 다른 요소에서 옮겨주세요.';
      pa = [target.x - target.ux * leadA, target.y - target.uy * leadA];
      pb = [target.x + target.ux * leadB, target.y + target.uy * leadB];
      var qa = [pa[0] + nx * off, pa[1] + ny * off], qb = [pb[0] + nx * off, pb[1] + ny * off];
      var meterRoute = route([pa, qa, qb, pb]);
      place(meterRoute, [(qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2], halfGapFor('voltmeter') * scale, -1, 'voltmeter', false, true);
      g.dots.push(pa, pb);
    }
  }
  for (i = 0; i < routes.length; i++) {
    var rr = routes[i];
    for (var j = 0; j + 1 < rr.points.length; j++) {
      var p = rr.points[j], q = rr.points[j + 1], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-6) continue;
      var cuts = [];
      for (var k = 0; k < rr.slots.length; k++) if (rr.slots[k].edge === j) cuts.push(rr.slots[k]);
      cuts.sort(function(x, y) {return x.u - y.u;}); var prev = 0;
      for (k = 0; k <= cuts.length; k++) {
        var stop = k < cuts.length ? cuts[k].u - cuts[k].half : len;
        if (stop > prev + 1e-6) g.wires.push([p[0] + dx / len * prev, p[1] + dy / len * prev, p[0] + dx / len * stop, p[1] + dy / len * stop]);
        if (k < cuts.length) prev = Math.max(prev, cuts[k].u + cuts[k].half);
      }
    }
  }
  return g;
}

    // END CIRCUIT CORE
    elements = circuitElements(o);
    var win = new Window("dialog", "전기 회로도"); win.orientation = "column"; win.alignChildren = "fill"; win.spacing = 4; win.margins = 10;
    function panel(title) { var p = win.add("panel", undefined, title); p.orientation = "column"; p.alignChildren = "fill"; p.spacing = 3; p.margins = [8,12,8,6]; return p; }
    function numberRow(parent, label, value, min, max, step, setter) {
        var r = parent.add("group"), l = r.add("statictext", undefined, label); l.preferredSize.width = 65;
        var e = r.add("edittext", undefined, String(value)); e.characters = 4;
        var bar = r.add("scrollbar", undefined, value, min, max); bar.preferredSize.width = 118; bar.stepdelta = step; bar.jumpdelta = step * 10;
        var reset = r.add("button", undefined, "R"); reset.preferredSize.width = 34; reset.helpTip = "처음 값으로 되돌리기";
        function commit(v) { v = parseFloat(v); if (!isFinite(v)) return; v = Math.max(min, Math.min(max, Math.round(v/step)*step)); e.text = String(Math.round(v*100)/100); bar.value = v; setter(v); if (!busy && parent !== position) updatePreview(); }
        e.onChange = function() {commit(e.text);}; bar.onChanging = function() {commit(bar.value);}; reset.onClick = function() {commit(value);};
        return {edit:e, bar:bar, set:function(v) {e.text=String(v);bar.value=v;}};
    }
    function selectRow(parent, title, items, change) {var r=parent.add("group"); var l=r.add("statictext",undefined,title);l.preferredSize.width=65;var d=r.add("dropdownlist",undefined,items);d.selection=0;d.onChange=function(){if(!busy&&d.selection)change(d.selection.index);};return d;}
    function check(parent, title, value, change) {var c=parent.add("checkbox",undefined,title);c.value=value;c.onClick=function(){change(c.value);if(!busy)updatePreview();};return c;}
    var size = panel("크기");
    var width = numberRow(size,"회로 가로",40,20,160,1,function(v){o.loopW=v;});
    var height = numberRow(size,"회로 세로",30,15,120,1,function(v){o.loopH=v;});
    var scale = numberRow(size,"기호 크기",100,50,200,10,function(v){o.scale=v;});
    var font = numberRow(size,"글자 크기",8,5,18,0.5,function(v){o.fontSize=v;});
    var part = panel("요소");
    var num = numberRow(part,"개수",4,1,12,1,function(v) {count=v;while(elements.length<count)elements.push(newElement());refreshLists();loadElement();});
    var choices = selectRow(part,"편집 요소",["1","2","3","4"],function(i){selected=i;loadElement();});
    var names = []; for(var si=0;si<SYMBOL_OPTIONS.length;si++)names.push(SYMBOL_OPTIONS[si].label);
    var symbol = selectRow(part,"기호",names,function(i){elements[selected].key=SYMBOL_OPTIONS[i].value;refreshLists();updatePreview();});
    var angle = numberRow(part,"위치",0,0,359,1,function(v){elements[selected].angle=v;});angle.edit.helpTip="0 위, 90 오른쪽, 180 아래, 270 왼쪽. 모서리는 가까운 직선으로 보정";
    var flags = part.add("group");
    var upper = check(flags,"위 가지",true,function(v){elements[selected].upper=v;}); upper.helpTip="분기 안쪽(기본 아래쪽 분기의 위 가지). 해제하면 바깥쪽. 분기 밖에서는 공통 도선";
    var reverse = check(flags,"방향 반전",false,function(v){elements[selected].reverse=v;});
    function textRow(label, key) {var r=part.add("group");var l=r.add("statictext",undefined,label);l.preferredSize.width=65;var e=r.add("edittext",undefined,"");e.characters=16;e.onChange=function(){elements[selected][key]=String(e.text).slice(0,80);refreshLists();if(!busy)updatePreview();};return e;}
    var nameInput=textRow("이름","name"), valueInput=textRow("값","value");
    var branch=panel("병렬 구간");
    var parallel=check(branch,"병렬 분기",false,function(v){o.parallel=v;upper.enabled=v;});
    var start=numberRow(branch,"시작",120,0,359,1,function(v){o.branchStart=v;});
    var end=numberRow(branch,"재결합",240,0,359,1,function(v){o.branchEnd=v;});
    var spacing=numberRow(branch,"가지 간격",10,6,60,1,function(v){o.branchGap=v;});spacing.edit.helpTip="회로의 짧은 변보다 4mm 이상 작게 제한됩니다";
    var meterPanel=panel("전압계 연결");
    var meter=check(meterPanel,"전압계",false,function(v){o.meterOn=v;});
    var target=selectRow(meterPanel,"측정 대상",["1","2","3","4"],function(i){o.meterTarget=i;updatePreview();});
    var meterGap=numberRow(meterPanel,"간격",10,6,35,1,function(v){o.meterGap=v;});
    var inside=check(meterPanel,"안쪽 연결",false,function(v){o.meterInside=v;});
    var position=panel("위치");
    var xRow=numberRow(position,"가로",0,-300,300,0.5,function(v){dx=v;movePreview();});
    var yRow=numberRow(position,"세로",0,-300,300,0.5,function(v){dy=v;movePreview();});
    var status=win.add("statictext",undefined,"",{multiline:true});status.preferredSize=[300,30];
    var footer=win.add("group");var pv=check(footer,"미리보기",true,function(v){previewOn=v;});
    var spacer=footer.add("group");spacer.alignment=["fill","center"];
    var ok=footer.add("button",undefined,"확인"), cancel=footer.add("button",undefined,"취소",{name:"cancel"});win.defaultElement=null;
    function newElement() {
        var angles=[],best=-1,at=0;
        for(var i=0;i<elements.length;i++)angles.push(elements[i].angle);
        angles.sort(function(a,b){return a-b;});
        for(i=0;i<angles.length;i++){var next=i+1<angles.length?angles[i+1]:angles[0]+360;if(next-angles[i]>best){best=next-angles[i];at=(next+angles[i])/2%360;}}
        return {key:"resistor",angle:Math.round(at),upper:true,reverse:false,name:"",value:""};
    }
    function refreshLists() {
        var was=busy;busy=true;selected=Math.min(selected,count-1);o.meterTarget=Math.min(o.meterTarget,count-1);
        choices.removeAll();target.removeAll();for(var i=0;i<count;i++){var text=(i+1)+" "+(elements[i].name||names[keyIndex(elements[i].key)]);choices.add("item",text);target.add("item",text);}
        choices.selection=selected;target.selection=o.meterTarget;busy=was;
    }
    function keyIndex(key){for(var i=0;i<SYMBOL_OPTIONS.length;i++)if(SYMBOL_OPTIONS[i].value===key)return i;return 0;}
    function loadElement(){var was=busy;busy=true;var e=elements[selected];symbol.selection=keyIndex(e.key);angle.set(e.angle);upper.value=e.upper;upper.enabled=o.parallel;reverse.value=e.reverse;nameInput.text=e.name;valueInput.text=e.value;busy=was;}
    function clearPreview(){if(preview){try{preview.remove();}catch(e){}preview=null;}}
    function movePreview(){if(preview){preview.translate((dx-posX)*MM,(dy-posY)*MM);posX=dx;posY=dy;try{app.redraw();}catch(e){}}}
    function updatePreview(){
        if(busy)return;
        o.branchGap=Math.min(o.branchGap,Math.min(o.loopW,o.loopH)-4);spacing.set(o.branchGap);
        o.elements=elements.slice(0,count);
        var g=generateCircuit(o);status.text=g.error;status.helpTip=g.error;
        if(g.error||!previewOn){clearPreview();try{app.redraw();}catch(e){}return;}
        clearPreview();preview=doc.activeLayer.groupItems.add();preview.name="전기 회로도";
        try{drawCircuit(preview,g);var board=doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;var b=preview.visibleBounds;
            preview.translate((board[0]+board[2]-b[0]-b[2])/2+dx*MM,(board[1]+board[3]-b[1]-b[3])/2+dy*MM);posX=dx;posY=dy;app.redraw();
        }catch(e){clearPreview();status.text="그리기 오류: "+e;}
    }
    function save(){var v=["v1",o.loopW,o.loopH,o.scale,o.fontSize,o.parallel?1:0,o.branchStart,o.branchEnd,o.branchGap,o.meterOn?1:0,o.meterTarget,o.meterGap,o.meterInside?1:0,count,dx,dy];
        for(var i=0;i<12;i++){var e=elements[i]||{key:"resistor",angle:0,upper:true,reverse:false,name:"",value:""};v.push(e.key,e.angle,e.upper?1:0,e.reverse?1:0,encodeURIComponent(e.name),encodeURIComponent(e.value));}
        try{app.preferences.setStringPreference(PREF_KEY,v.join("|"));}catch(e){}
    }
    function restore(){try{var p=app.preferences.getStringPreference(PREF_KEY).split("|");if(p.length!==88||p[0]!=="v1")return;
        function n(i,a,b,d){var x=parseFloat(p[i]);return isFinite(x)&&x>=a&&x<=b?x:d;}
        o.loopW=n(1,20,160,40);o.loopH=n(2,15,120,30);o.scale=n(3,50,200,100);o.fontSize=n(4,5,18,8);o.parallel=p[5]==="1";
        o.branchStart=n(6,0,359,120);o.branchEnd=n(7,0,359,240);o.branchGap=n(8,6,60,10);o.meterOn=p[9]==="1";count=Math.round(n(13,1,12,4));o.meterTarget=Math.round(n(10,0,count-1,1));o.meterGap=n(11,6,35,10);o.meterInside=p[12]==="1";
        dx=n(14,-300,300,0);dy=n(15,-300,300,0);var es=[];
        for(var i=0;i<12;i++){var k=16+i*6;es.push({key:p[k],angle:n(k+1,0,359,0),upper:p[k+2]==="1",reverse:p[k+3]==="1",name:decodeURIComponent(p[k+4]).slice(0,80),value:decodeURIComponent(p[k+5]).slice(0,80)});}
        o.elements=es;elements=circuitElements(o);
    }catch(e){}}
    restore();
    if(typeof scriptStartsWithoutSelection==="function"&&scriptStartsWithoutSelection(doc)){dx=0;dy=0;}
    width.set(o.loopW);height.set(o.loopH);scale.set(o.scale);font.set(o.fontSize);num.set(count);parallel.value=o.parallel;start.set(o.branchStart);end.set(o.branchEnd);spacing.set(o.branchGap);meter.value=o.meterOn;meterGap.set(o.meterGap);inside.value=o.meterInside;xRow.set(dx);yRow.set(dy);refreshLists();loadElement();busy=false;
    ok.onClick=function(){var was=previewOn;previewOn=true;updatePreview();if(!preview){previewOn=was;return;}save();win.close(1);};
    cancel.onClick=function(){win.close(0);};win.onShow=function(){updatePreview();};
    if(typeof bindTabOrder==="function")bindTabOrder(win);
    if(win.show()!==1){clearPreview();try{app.redraw();}catch(e){}}
    function gray(k){var c=new GrayColor();c.gray=k;return c;}
    function drawCircuit(group,g){
        var i,j;
        function path(points,width,fill,closed){var p=group.pathItems.add(),ps=[];for(var z=0;z<points.length;z+=2)ps.push([points[z]*UNIT,-points[z+1]*UNIT]);p.setEntirePath(ps);p.closed=!!closed;p.stroked=width>0;if(p.stroked){p.strokeColor=gray(100);p.strokeWidth=width*UNIT;}p.filled=!!fill;if(p.filled)p.fillColor=gray(fill==="#ffffff"?0:100);return p;}
        function circle(x,y,r,width,fill){var p=group.pathItems.ellipse((-y+r)*UNIT,(x-r)*UNIT,2*r*UNIT,2*r*UNIT);p.stroked=width>0;if(p.stroked){p.strokeColor=gray(100);p.strokeWidth=width*UNIT;}p.filled=!!fill;if(p.filled)p.fillColor=gray(fill==="#ffffff"?0:100);}
        function text(s,x,y,size,align){var t=group.textFrames.add();t.contents=s;t.textRange.characterAttributes.size=size*UNIT;t.textRange.characterAttributes.fillColor=gray(100);var fontNames=/[㉠-㉿]/.test(s)?["Batang","AppleMyungjo","GSMediumB1"]:/[가-힣]/.test(s)?["SpoqaHanSansNeo-Regular","AppleSDGothicNeo-Regular","GSMediumB1"]:["GSMediumB1","TimesNewRomanPSMT"];
            for(var f=0;f<fontNames.length;f++){try{t.textRange.characterAttributes.textFont=app.textFonts.getByName(fontNames[f]);break;}catch(e){}}
            var b=t.visibleBounds;t.translate(x*UNIT-(align==="left"?b[0]:align==="right"?b[2]:(b[0]+b[2])/2),-y*UNIT-(b[1]+b[3])/2);
        }
        for(i=0;i<g.wires.length;i++)path(g.wires[i],1,null,false);
        for(i=0;i<g.dots.length;i++)circle(g.dots[i][0],g.dots[i][1],2,0,"#000000");
        for(i=0;i<g.symbols.length;i++){
            var e=g.symbols[i],rot=e.key==="ammeter"||e.key==="voltmeter"?0:e.rot,rad=rot*Math.PI/180,ca=Math.cos(rad)*e.scale,sa=Math.sin(rad)*e.scale;
            function xy(x,y){return [e.x+x*ca-y*sa,e.y+x*sa+y*ca];}
            var prim=symbolPrimitives(e.key);
            for(j=0;j<prim.length;j++){var p=prim[j],pt;
                if(p.type==="line"){var ps=[];for(var k=0;k<p.points.length;k+=2){pt=xy(p.points[k],p.points[k+1]);ps.push(pt[0],pt[1]);}path(ps,p.strokeWidth*e.scale,null,false);}
                else if(p.type==="circle"){pt=xy(p.x,p.y);circle(pt[0],pt[1],p.r*e.scale,p.strokeWidth*e.scale,p.fill);}
                else if(p.type==="text"){pt=xy(p.x+p.width/2,p.y+p.height/2);text(p.text,pt[0],pt[1],p.fontSize*e.scale);}
                else if(p.type==="path"){
                    var tokens=p.data.match(/[MC]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi),idx=0,pp=group.pathItems.add(),last=null;
                    while(idx<tokens.length){var cmd=tokens[idx++];if(cmd==="M"){pt=xy(Number(tokens[idx++]),Number(tokens[idx++]));last=pp.pathPoints.add();last.anchor=[pt[0]*UNIT,-pt[1]*UNIT];last.leftDirection=last.anchor;last.rightDirection=last.anchor;}
                        else if(cmd==="C"){var c1=xy(Number(tokens[idx++]),Number(tokens[idx++])),c2=xy(Number(tokens[idx++]),Number(tokens[idx++])),endP=xy(Number(tokens[idx++]),Number(tokens[idx++]));last.rightDirection=[c1[0]*UNIT,-c1[1]*UNIT];last=pp.pathPoints.add();last.anchor=[endP[0]*UNIT,-endP[1]*UNIT];last.leftDirection=[c2[0]*UNIT,-c2[1]*UNIT];last.rightDirection=last.anchor;}}
                    pp.filled=false;pp.stroked=true;pp.strokeColor=gray(100);pp.strokeWidth=p.strokeWidth*e.scale*UNIT;
                }
            }
        }
        for(i=0;i<g.texts.length;i++){var t=g.texts[i];text(t.text,t.x,t.y,t.fontSize,t.align);}
    }
})();
