// 슬라이더 최소·최대·단계 편집용 로컬 서버. 실행: node tools/range-admin.js  →  http://127.0.0.1:5199
// 역학 스크립트는 창을 열 때 슬라이더 목록과 코드의 기본 범위를 스크립트/00_세팅/slider_ranges.catalog.json에 적는다(이 서버가 읽기만 함).
// 여기서 바꾼 값은 스크립트/00_세팅/slider_ranges.json에 저장하고, 코드 기본값과 같은 항목은 저장하지 않는다.
// 일러 스크립트는 다이얼로그를 열 때 slider_ranges.json을 읽는다 (없거나 이상하면 코드의 값을 쓴다).
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "스크립트", "00_세팅");
const CATALOG = path.join(DIR, "slider_ranges.catalog.json");
const RANGES = path.join(DIR, "slider_ranges.json");
const PORT = 5199;
const TABS = { pendulum: "진자 운동", projectile: "수평 던지기", sine: "사인 곡선", coil: "코일 스프링", MechanicalEnergy: "역학적 에너지" };

function readCatalog() {
  try { return JSON.parse(fs.readFileSync(CATALOG, "utf8")); } catch { return []; }
}

function readOverrides() {
  try { return JSON.parse(fs.readFileSync(RANGES, "utf8")); } catch { return {}; }
}

// 목록에 있는 항목만 새로 쓰고, 목록에 없는 항목(다른 스크립트)은 그대로 둔다
function save(rows) {
  const catalog = readCatalog();
  const data = readOverrides();
  for (const f of catalog) delete data[f.id];
  for (const r of rows) {
    const f = catalog.find((x) => x.id === r.id);
    const min = Number(r.min), max = Number(r.max), step = Number(r.step);
    if (!f || !isFinite(min) || !isFinite(max) || !isFinite(step) || min >= max || step <= 0) throw new Error(`${r.id}: 최소 < 최대, 단계 > 0이어야 합니다`);
    if (min === f.min && max === f.max && step === f.step) continue;
    data[r.id] = { min, max, step };
  }
  fs.writeFileSync(RANGES, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>슬라이더 범위</title>
<style>body{font:14px system-ui;margin:24px;word-break:keep-all}table{border-collapse:collapse;margin-bottom:12px}td,th{border:.4px solid #888;padding:4px 8px;text-align:left}
th.tab{background:#eee;border-top-width:.8px}input{width:70px}.d{color:#888}.c{background:#fff3c4}button{padding:6px 14px}</style>
<h3>슬라이더 범위</h3><div id="msg"></div>
<table id="t"></table>
<button id="save">저장</button> <span id="done"></span>
<script>
let items = [];
const t = document.getElementById("t");
function mark(tr, f) {
  const v = [...tr.querySelectorAll("input")].map((i) => +i.value);
  tr.classList.toggle("c", v[0] !== f.min || v[1] !== f.max || v[2] !== f.step);
}
fetch("/api").then((r) => r.json()).then(({ catalog, overrides, tabs }) => {
  if (!catalog.length) { document.getElementById("msg").textContent = "목록이 없습니다. 일러에서 역학 스크립트를 한 번 열었다 닫은 뒤 새로고침하세요."; return; }
  items = catalog;
  let last = null;
  for (const f of catalog) {
    if (f.tab !== last) {
      last = f.tab;
      const h = t.insertRow();
      h.innerHTML = "<th class=tab>" + (tabs[f.tab] || f.tab) + "<th class=tab>최소<th class=tab>최대<th class=tab>단계<th class=tab>코드 기본값<th class=tab>";
    }
    const o = overrides[f.id] || f;
    const tr = t.insertRow();
    tr.innerHTML = "<td>" + f.label + (f.unit ? " (" + f.unit + ")" : "") +
      ["min", "max", "step"].map((k) => "<td><input type=number step=any data-k=" + k + " value=" + o[k] + ">").join("") +
      "<td class=d>" + f.min + " ~ " + f.max + " / " + f.step + "<td><button>기본값</button>";
    tr.dataset.id = f.id;
    tr.querySelectorAll("input").forEach((i) => i.oninput = () => mark(tr, f));
    tr.querySelector("button").onclick = () => { for (const i of tr.querySelectorAll("input")) i.value = f[i.dataset.k]; mark(tr, f); };
    mark(tr, f);
  }
});
document.getElementById("save").onclick = async () => {
  const rows = [...t.rows].filter((tr) => tr.dataset.id).map((tr) => {
    const v = {}; tr.querySelectorAll("input").forEach((x) => v[x.dataset.k] = x.value);
    return { id: tr.dataset.id, ...v };
  });
  const r = await fetch("/api", { method: "POST", body: JSON.stringify(rows) });
  document.getElementById("done").textContent = r.ok ? "저장했습니다. 일러에서 다이얼로그를 다시 열면 반영됩니다." : await r.text();
};
</script>`;

http.createServer((req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE);
    } else if (req.method === "GET" && req.url === "/api") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ catalog: readCatalog(), overrides: readOverrides(), tabs: TABS }));
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
