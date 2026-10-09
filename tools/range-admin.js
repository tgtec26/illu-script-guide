// 슬라이더 최소·최대·단계 편집용 로컬 서버. 실행: node tools/range-admin.js  →  http://127.0.0.1:5199
// 대상은 Object_Mechanics.jsx의 수평 던지기 탭 fields. 코드의 기본값은 jsx에서 읽고, 바꾼 값만 00_세팅/slider_ranges.json에 저장한다.
// 일러 스크립트는 다이얼로그를 열 때 이 파일을 읽는다 (없거나 이상하면 코드의 값을 쓴다).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "스크립트", "01_도형", "Object_Mechanics.jsx");
const RANGES = path.join(ROOT, "스크립트", "00_세팅", "slider_ranges.json");
const PREFIX = "Mechanics/projectile";
const PORT = 5199;

function readFields() {
  const src = fs.readFileSync(SOURCE, "utf8");
  const start = src.indexOf("function makeProjectileEngine");
  const end = src.indexOf("// ====", start);
  const re = /\{ key: "(\w+)", label: "([^"]+)", unit: "([^"]*)", min: (-?[\d.]+), max: (-?[\d.]+), step: (-?[\d.]+), initial: (-?[\d.]+) \}/g;
  const out = [];
  for (const m of src.slice(start, end).matchAll(re)) {
    out.push({ key: m[1], label: m[2], unit: m[3], min: +m[4], max: +m[5], step: +m[6], initial: +m[7] });
  }
  return out;
}

function readOverrides() {
  try { return JSON.parse(fs.readFileSync(RANGES, "utf8")); } catch { return {}; }
}

// 코드 기본값과 다른 항목만 저장한다. 다른 탭·스크립트의 항목은 그대로 둔다
function save(rows) {
  const fields = readFields();
  const data = readOverrides();
  for (const f of fields) delete data[PREFIX + "/" + f.key];
  for (const r of rows) {
    const f = fields.find((x) => x.key === r.key);
    const min = Number(r.min), max = Number(r.max), step = Number(r.step);
    if (!f || !isFinite(min) || !isFinite(max) || !isFinite(step) || min >= max || step <= 0) throw new Error(`${r.key}: 최소 < 최대, 단계 > 0이어야 합니다`);
    if (min === f.min && max === f.max && step === f.step) continue;
    data[PREFIX + "/" + r.key] = { min, max, step };
  }
  fs.writeFileSync(RANGES, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>슬라이더 범위</title>
<style>body{font:14px system-ui;margin:24px;word-break:keep-all}table{border-collapse:collapse}td,th{border:.4px solid #888;padding:4px 8px;text-align:left}
input{width:70px}.d{color:#888}.c{background:#fff3c4}button{margin:12px 8px 0 0;padding:6px 14px}</style>
<h3>수평 던지기 슬라이더 범위</h3>
<table id="t"><tr><th>슬라이더<th>최소<th>최대<th>단계<th>코드 기본값<th></tr></table>
<button id="save">저장</button><span id="msg"></span>
<script>
let fields = [];
const t = document.getElementById("t");
function mark(tr, f) {
  const v = [...tr.querySelectorAll("input")].map((i) => +i.value);
  tr.classList.toggle("c", v[0] !== f.min || v[1] !== f.max || v[2] !== f.step);
}
fetch("/api").then((r) => r.json()).then(({ fields: fs, overrides }) => {
  fields = fs;
  for (const f of fs) {
    const o = overrides["${PREFIX}/" + f.key] || f;
    const tr = t.insertRow();
    tr.innerHTML = "<td>" + f.label + (f.unit ? " (" + f.unit + ")" : "") + " <span class=d>" + f.key + "</span>" +
      ["min", "max", "step"].map((k) => "<td><input type=number step=any data-k=" + k + " value=" + o[k] + ">").join("") +
      "<td class=d>" + f.min + " ~ " + f.max + " / " + f.step + "<td><button>기본값</button>";
    tr.querySelectorAll("input").forEach((i) => i.oninput = () => mark(tr, f));
    tr.querySelector("button").onclick = () => { for (const i of tr.querySelectorAll("input")) i.value = f[i.dataset.k]; mark(tr, f); };
    mark(tr, f);
  }
});
document.getElementById("save").onclick = async () => {
  const rows = [...t.rows].slice(1).map((tr, i) => {
    const v = {}; tr.querySelectorAll("input").forEach((x) => v[x.dataset.k] = x.value);
    return { key: fields[i].key, ...v };
  });
  const r = await fetch("/api", { method: "POST", body: JSON.stringify(rows) });
  document.getElementById("msg").textContent = r.ok ? "저장했습니다. 일러에서 다이얼로그를 다시 열면 반영됩니다." : await r.text();
};
</script>`;

http.createServer((req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE);
    } else if (req.method === "GET" && req.url === "/api") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ fields: readFields(), overrides: readOverrides() }));
    } else if (req.method === "POST" && req.url === "/api") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { save(JSON.parse(body)); res.writeHead(200); res.end("ok"); }
        catch (e) { res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }); res.end(String(e.message)); }
      });
    } else { res.writeHead(404); res.end(); }
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
}).listen(PORT, "127.0.0.1", () => console.log(`슬라이더 범위 편집: http://127.0.0.1:${PORT}`));
