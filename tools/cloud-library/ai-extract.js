// Illustrator .ai(PDF 호환) 파일에서 채워진 패스를 뽑아 JSON으로 저장한다.
// 사용: node ai-extract.js <file.ai> <out.json>
const fs = require("fs");
const zlib = require("zlib");

const file = process.argv[2];
const out = process.argv[3];
const buf = fs.readFileSync(file);
const text = buf.toString("latin1");

// ---- 객체 수집 ----
const objects = {};
const objRe = /(\d+) 0 obj\b/g;
let m;
while ((m = objRe.exec(text)) !== null) {
  const num = Number(m[1]);
  const start = m.index + m[0].length;
  const end = text.indexOf("endobj", start);
  const body = text.slice(start, end);
  const streamAt = body.indexOf("stream");
  let dict = body;
  let stream = null;
  if (streamAt >= 0 && /stream\r?\n/.test(body.slice(streamAt, streamAt + 8))) {
    dict = body.slice(0, streamAt);
    let dataStart = start + streamAt + "stream".length;
    if (text[dataStart] === "\r") dataStart++;
    if (text[dataStart] === "\n") dataStart++;
    let dataEnd = text.indexOf("endstream", dataStart);
    // 길이 힌트가 있으면 그것을 쓴다 (스트림 안에 endstream 문자열이 있을 수 있다)
    const lenMatch = dict.match(/\/Length\s+(\d+)(?:\s+0\s+R)?/);
    if (lenMatch && !/\/Length\s+\d+\s+0\s+R/.test(dict)) {
      const len = Number(lenMatch[1]);
      if (len > 0 && dataStart + len <= text.length) dataEnd = dataStart + len;
    }
    let raw = buf.subarray(dataStart, dataEnd);
    if (/\/FlateDecode/.test(dict)) {
      try { raw = zlib.inflateSync(raw); } catch (e) {
        try { raw = zlib.inflateSync(raw, { finishFlush: zlib.constants.Z_SYNC_FLUSH }); } catch (e2) { raw = null; }
      }
    }
    stream = raw;
  }
  objects[num] = { dict, stream };
}

// ---- 객체 스트림(ObjStm) 전개: PDF 1.5+는 페이지 사전 등을 압축 스트림 안에 넣는다 ----
for (const num of Object.keys(objects)) {
  const o = objects[num];
  if (!o.stream || !/\/Type\s*\/ObjStm/.test(o.dict)) continue;
  const n = Number((o.dict.match(/\/N\s+(\d+)/) || [0, 0])[1]);
  const first = Number((o.dict.match(/\/First\s+(\d+)/) || [0, 0])[1]);
  const data = o.stream.toString("latin1");
  const header = data.slice(0, first).trim().split(/\s+/).map(Number);
  for (let i = 0; i < n; i++) {
    const objNum = header[2 * i], offset = header[2 * i + 1];
    const end = i + 1 < n ? header[2 * i + 3] : data.length - first;
    if (objects[objNum] === undefined) objects[objNum] = { dict: data.slice(first + offset, first + end), stream: null };
  }
}

// ---- 페이지 → 콘텐츠 ----
function refs(dictText, key) {
  const single = dictText.match(new RegExp("/" + key + "\\s+(\\d+)\\s+0\\s+R"));
  if (single) return [Number(single[1])];
  const arr = dictText.match(new RegExp("/" + key + "\\s*\\[([^\\]]*)\\]"));
  if (arr) return [...arr[1].matchAll(/(\d+)\s+0\s+R/g)].map((x) => Number(x[1]));
  return [];
}
// 페이지(아트보드)가 여럿이면 모두 읽는다. 패스마다 page 번호와 그 페이지의 MediaBox를 남긴다
const pageNums = Object.keys(objects).filter((n) => /\/Type\s*\/Page\b/.test(objects[n].dict)).map(Number).sort((a, b) => a - b);
if (pageNums.length === 0) throw new Error("no page");
const page = objects[pageNums[0]];
const mediaBox = (page.dict.match(/\/MediaBox\s*\[([^\]]*)\]/) || [null, "0 0 0 0"])[1].trim().split(/\s+/).map(Number);
let content = "";

// XObject 이름 → 객체 번호 (페이지 리소스). Form XObject는 Do로 재귀 해석한다
function xobjectMap(dictText) {
  const map = {};
  let resText = dictText;
  const resRef = dictText.match(/\/Resources\s+(\d+)\s+0\s+R/);
  if (resRef) resText = objects[Number(resRef[1])].dict;
  const xo = resText.match(/\/XObject\s*<<([^]*?)>>/);
  if (xo) for (const mm of xo[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) map[mm[1]] = Number(mm[2]);
  return map;
}

// ---- 콘텐츠 해석 ----
const paths = [];
function interpret(src, ctm0, xobjs, depth) {
  const tokens = src.match(/\/?[^\s\[\]<>(){}\/%]+|\[|\]|<<|>>|\([^)]*\)/g) || [];
  const stack = [];
  const gs = [];
  let ctm = ctm0.slice();
  let fill = { kind: "none", gray: 1, raw: [] };
  let stroke = { kind: "none", gray: 0, raw: [] };
  let lineWidth = 1;
  let subpaths = [];
  let current = null;
  let point = [0, 0];
  let inText = false;
  const apply = (p) => [ctm[0] * p[0] + ctm[2] * p[1] + ctm[4], ctm[1] * p[0] + ctm[3] * p[1] + ctm[5]];
  const nums = (n) => { const v = stack.slice(-n).map(Number); stack.length = Math.max(0, stack.length - n); return v; };
  const flush = (mode) => {
    if (subpaths.length === 0) { current = null; return; }
    const doFill = mode.includes("f");
    const doStroke = mode.includes("s");
    if (doFill || doStroke) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const sp of subpaths) for (const seg of sp) for (const pt of seg.pts) {
        minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]); minY = Math.min(minY, pt[1]); maxY = Math.max(maxY, pt[1]);
      }
      paths.push({ fill: doFill ? { ...fill } : null, stroke: doStroke ? { ...stroke, width: lineWidth } : null, subpaths, bbox: [minX, minY, maxX, maxY] });
    }
    subpaths = [];
    current = null;
  };
  const setColor = (which, kind, comps) => {
    let gray = 1;
    if (kind === "g") gray = comps[0];
    else if (kind === "rgb") gray = 0.3 * comps[0] + 0.59 * comps[1] + 0.11 * comps[2];
    else if (kind === "cmyk") gray = 1 - Math.min(1, 0.3 * comps[0] + 0.59 * comps[1] + 0.11 * comps[2] + comps[3]);
    else if (kind === "n") gray = comps.length === 1 ? comps[0] : comps.length === 3 ? 0.3 * comps[0] + 0.59 * comps[1] + 0.11 * comps[2] : comps.length === 4 ? 1 - Math.min(1, 0.3 * comps[0] + 0.59 * comps[1] + 0.11 * comps[2] + comps[3]) : 0.5;
    const c = { kind, gray, raw: comps };
    if (which === "fill") fill = c; else stroke = c;
  };
  for (const t of tokens) {
    if (inText) { if (t === "ET") inText = false; continue; }
    switch (t) {
      case "BT": inText = true; break;
      case "q": gs.push({ ctm: ctm.slice(), fill, stroke, lineWidth }); break;
      case "Q": { const s = gs.pop(); if (s) { ctm = s.ctm; fill = s.fill; stroke = s.stroke; lineWidth = s.lineWidth; } break; }
      case "cm": { const [a, b, c, d, e, f] = nums(6); ctm = [a * ctm[0] + b * ctm[2], a * ctm[1] + b * ctm[3], c * ctm[0] + d * ctm[2], c * ctm[1] + d * ctm[3], e * ctm[0] + f * ctm[2] + ctm[4], e * ctm[1] + f * ctm[3] + ctm[5]]; break; }
      case "m": { const [x, y] = nums(2); point = [x, y]; current = [{ op: "M", pts: [apply(point)] }]; subpaths.push(current); break; }
      case "l": { const [x, y] = nums(2); point = [x, y]; if (current) current.push({ op: "L", pts: [apply(point)] }); break; }
      case "c": { const [x1, y1, x2, y2, x3, y3] = nums(6); if (current) current.push({ op: "C", pts: [apply([x1, y1]), apply([x2, y2]), apply([x3, y3])] }); point = [x3, y3]; break; }
      case "v": { const [x2, y2, x3, y3] = nums(4); if (current) current.push({ op: "C", pts: [apply(point), apply([x2, y2]), apply([x3, y3])] }); point = [x3, y3]; break; }
      case "y": { const [x1, y1, x3, y3] = nums(4); if (current) current.push({ op: "C", pts: [apply([x1, y1]), apply([x3, y3]), apply([x3, y3])] }); point = [x3, y3]; break; }
      case "h": if (current) current.push({ op: "Z", pts: [] }); break;
      case "re": { const [x, y, w, h] = nums(4); current = [{ op: "M", pts: [apply([x, y])] }, { op: "L", pts: [apply([x + w, y])] }, { op: "L", pts: [apply([x + w, y + h])] }, { op: "L", pts: [apply([x, y + h])] }, { op: "Z", pts: [] }]; subpaths.push(current); point = [x, y]; break; }
      case "f": case "F": case "f*": flush("f"); break;
      case "B": case "B*": case "b": case "b*": flush("fs"); break;
      case "S": case "s": flush("s"); break;
      case "n": flush(""); break;
      case "W": case "W*": break;
      case "g": setColor("fill", "g", nums(1)); break;
      case "G": setColor("stroke", "g", nums(1)); break;
      case "rg": setColor("fill", "rgb", nums(3)); break;
      case "RG": setColor("stroke", "rgb", nums(3)); break;
      case "k": setColor("fill", "cmyk", nums(4)); break;
      case "K": setColor("stroke", "cmyk", nums(4)); break;
      case "sc": case "scn": { const v = stack.filter((x) => !isNaN(Number(x))).map(Number); stack.length = 0; setColor("fill", "n", v); break; }
      case "SC": case "SCN": { const v = stack.filter((x) => !isNaN(Number(x))).map(Number); stack.length = 0; setColor("stroke", "n", v); break; }
      case "w": { const [lw] = nums(1); lineWidth = lw * Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])); break; }
      case "cs": case "CS": case "gs": case "J": case "j": case "M": case "d": case "ri": case "i": stack.length = 0; break;
      case "Do": {
        const name = String(stack.pop() || "").replace(/^\//, "");
        const num = xobjs[name];
        if (num !== undefined && objects[num] && objects[num].stream && depth < 6) {
          const o = objects[num];
          const mat = (o.dict.match(/\/Matrix\s*\[([^\]]*)\]/) || [null, "1 0 0 1 0 0"])[1].trim().split(/\s+/).map(Number);
          const inner = [mat[0] * ctm[0] + mat[1] * ctm[2], mat[0] * ctm[1] + mat[1] * ctm[3], mat[2] * ctm[0] + mat[3] * ctm[2], mat[2] * ctm[1] + mat[3] * ctm[3], mat[4] * ctm[0] + mat[5] * ctm[2] + ctm[4], mat[4] * ctm[1] + mat[5] * ctm[3] + ctm[5]];
          interpret(o.stream.toString("latin1"), inner, { ...xobjs, ...xobjectMap(o.dict) }, depth + 1);
        }
        break;
      }
      default:
        stack.push(t);
    }
  }
}
pageNums.forEach((pn, pageIndex) => {
  const pg = objects[pn];
  const text2 = Buffer.concat(refs(pg.dict, "Contents").map((n) => objects[n].stream || Buffer.alloc(0))).toString("latin1");
  content += text2;
  const before = paths.length;
  interpret(text2, [1, 0, 0, 1, 0, 0], xobjectMap(pg.dict), 0);
  const mb = (pg.dict.match(/\/MediaBox\s*\[([^\]]*)\]/) || [null, "0 0 0 0"])[1].trim().split(/\s+/).map(Number);
  for (let i = before; i < paths.length; i++) { paths[i].page = pageIndex; paths[i].mediaBox = mb; }
});

fs.writeFileSync(out, JSON.stringify({ file, mediaBox, paths }));
const fills = paths.filter((p) => p.fill).length;
const strokes = paths.filter((p) => p.stroke).length;
console.log(`${file}: objects ${Object.keys(objects).length}, content ${content.length} chars, paths ${paths.length} (fill ${fills}, stroke ${strokes}), mediaBox ${mediaBox.join(" ")}`);
