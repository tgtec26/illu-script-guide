// ExtendScript는 이어진 삼항식 a ? b : c ? d : e 를 (a ? b : c) ? d : e 로 읽는다 (2026-10-29 일러 2026에서 확인: "r" → u=[0,1]).
// 괄호 없이 else 쪽에 다시 ?가 오는 곳을 모든 스크립트에서 찾는다. KNOWN은 이 검사를 만들 때 이미 있던 곳이다(고쳐서 줄여 간다)
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..", "스크립트");
const KNOWN = {
  "06_도형/3D.jsx": 1, "00_세팅/option_contract.jsxinc": 4, "02_화학/용해도 곡선.jsx": 1, "01_물리학/열기관 순환.jsx": 6,
  "01_물리학/피스톤 실린더.jsx": 6, "01_물리학/전기 회로도.jsx": 3, "08_색상/스펙트럼.jsx": 2,
};

// 주석·글자·정규식을 빈칸으로 바꾼다 (줄 번호는 지킨다)
function strip(src) {
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && n === "*") { const e = src.indexOf("*/", i + 2); out += src.slice(i, e + 2).replace(/[^\n]/g, " "); i = e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") { if (src[j] === "\\") j++; j++; }
      out += c + " ".repeat(Math.max(0, j - i - 1)) + c; i = j + 1; continue;
    }
    if (c === "/") {
      const before = out.replace(/\s+$/, "");
      if (before === "" || /[(,=:\[!&|?{};+\-*%<>~^]$/.test(before) || /return$/.test(before)) {
        let j = i + 1, cls = false;
        while (j < src.length && src[j] !== "\n") { if (src[j] === "\\") { j += 2; continue; } if (src[j] === "[") cls = true; else if (src[j] === "]") cls = false; else if (src[j] === "/" && !cls) break; j++; }
        out += "/" + " ".repeat(Math.max(0, j - i - 1)) + "/"; i = j + 1; continue;
      }
    }
    out += c; i++;
  }
  return out;
}

function chained(code) {
  const stack = [{ q: 0, inElse: false }], lines = [];
  let line = 1;
  for (const c of code) {
    const top = stack[stack.length - 1];
    if (c === "\n") line++;
    else if (c === "(" || c === "[" || c === "{") stack.push({ q: 0, inElse: false });
    else if (c === ")" || c === "]" || c === "}") { if (stack.length > 1) stack.pop(); }
    else if (c === ";" || c === ",") { top.q = 0; top.inElse = false; }
    else if (c === "?") { if (top.inElse) lines.push(line); top.q++; }
    else if (c === ":" && top.q > 0) { top.q--; top.inElse = true; }
  }
  return lines;
}

assert.deepStrictEqual(chained(strip('var u = d === "r" ? 1 : d === "l" ? 2 : 3;')), [1], "잡는다");
assert.deepStrictEqual(chained(strip('var u = d === "r" ? 1 : (d === "l" ? 2 : 3); var s = "a ? b : c ? d";')), [], "괄호·글자는 괜찮다");
const found = {};
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    if (!/\.jsx(inc)?$/.test(name)) continue;
    const hits = chained(strip(fs.readFileSync(full, "utf8")));
    if (hits.length) found[path.relative(root, full)] = hits;
  }
})(root);
for (const [file, lines] of Object.entries(found)) {
  assert.ok(KNOWN[file] !== undefined && lines.length <= KNOWN[file], `${file}:${lines.join(",")} 이어진 삼항식 — else 쪽을 괄호로 묶는다`);
}
console.log("chained ternary checks passed (알려진 곳 " + Object.keys(found).length + "개 파일)");
