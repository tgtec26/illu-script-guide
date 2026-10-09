// 대화상자 요소 편집용 로컬 서버. 실행: node tools/ui-admin.js  →  http://127.0.0.1:5200
// 일러에서 대화상자를 열면 ui_tab_helper.jsxinc가 그 창의 요소 목록을 스크립트/00_세팅/ui_catalog/<창 제목>.json에 남긴다(이 서버는 읽기만 함).
// 여기서 고친 값은 스크립트/00_세팅/ui_overrides.json에 저장하고, 일러는 대화상자를 열 때 그것을 적용한다. 원래 값과 같은 항목은 저장하지 않는다.
// 저장하면 ui_overrides.json만 커밋해서 GitHub에 올린다(동료 교사는 git pull로 받는다). `--no-push`를 주면 커밋까지만 한다.
// 고칠 수 있는 것: 제목·단추·체크·라디오 글자, 패널 제목, 드롭다운 항목 문구(개수·순서는 그대로), 스크롤바 최솟값·최댓값·단계, R 단추가 되돌리는 값
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = process.env.UI_ADMIN_ROOT || path.join(__dirname, "..");
const NO_PUSH = process.argv.includes("--no-push");
const DIR = path.join(ROOT, "스크립트", "00_세팅");
const CATALOG_DIR = path.join(DIR, "ui_catalog");
const OVERRIDES = path.join(DIR, "ui_overrides.json");
const PORT = Number(process.env.UI_ADMIN_PORT) || 5200;
// 커밋 작성자는 Vercel 배포 정책상 고정이다 (전역 지침 참고)
const GIT_USER = ["-c", "user.name=tgtec26", "-c", "user.email=tgtec26@snu-g.ms.kr"];

function readCatalogs() {
  let files = [];
  try { files = fs.readdirSync(CATALOG_DIR).filter((f) => f.endsWith(".json")); } catch { return []; }
  const out = [];
  for (const f of files) {
    try { out.push(JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, f), "utf8"))); } catch { /* 깨진 파일은 건너뜀 */ }
  }
  return out.sort((a, b) => a.dialog.localeCompare(b.dialog, "ko"));
}

function readOverrides() {
  try { return JSON.parse(fs.readFileSync(OVERRIDES, "utf8")); } catch { return {}; }
}

// 한 대화상자의 덮어쓰기를 통째로 바꾼다. 원래 값과 같은 항목은 빼고, 목록에 없는 id는 받지 않는다
function save(dialog, rows) {
  const catalog = readCatalogs().find((c) => c.dialog === dialog);
  if (!catalog) throw new Error("목록에 없는 대화상자입니다: " + dialog);
  const byId = new Map(catalog.controls.map((c) => [c.id, c]));
  const block = {};
  for (const r of rows) {
    const c = byId.get(r.id);
    if (!c) throw new Error("목록에 없는 요소: " + r.id);
    const o = { orig: c.orig };
    if (c.type === "scrollbar") {
      for (const k of ["min", "max", "step"]) {
        const v = Number(r[k]);
        if (!isFinite(v)) throw new Error(`${r.id}: ${k}는 숫자여야 합니다`);
        if (v !== c[k]) o[k] = v;
      }
      const lo = o.min !== undefined ? o.min : c.min, hi = o.max !== undefined ? o.max : c.max;
      if (lo >= hi) throw new Error(`${r.id}: 최솟값 < 최댓값이어야 합니다`);
      const st = o.step !== undefined ? o.step : c.step;
      if (st <= 0) throw new Error(`${r.id}: 단계 > 0이어야 합니다`);
      if (r.reset !== undefined && r.reset !== "" && r.reset !== null) {
        const v = Number(r.reset);
        if (!isFinite(v)) throw new Error(`${r.id}: 기본값은 숫자여야 합니다`);
        o.reset = v;
      }
    } else if (c.type === "dropdownlist") {
      const items = (r.items || []).map((t, i) => (typeof t === "string" ? t : c.items[i]));
      if (items.length !== c.items.length) throw new Error(`${r.id}: 항목 개수는 바꿀 수 없습니다`);
      if (items.some((t, i) => t !== c.items[i])) o.items = items;
    } else if (typeof r.text === "string" && r.text !== c.text) {
      o.text = r.text;
    }
    if (Object.keys(o).length > 1) block[r.id] = o;
  }
  const all = readOverrides();
  if (Object.keys(block).length) all[dialog] = block; else delete all[dialog];
  fs.writeFileSync(OVERRIDES, JSON.stringify(all, null, 2) + "\n", "utf8");
}

function git(args) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd: ROOT, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? err.code : 0, out: String(stdout).trim(), err: String(stderr).trim() });
    });
  });
}

// 저장한 덮어쓰기 파일만 커밋해서 올린다. 다른 변경은 건드리지 않는다. 한 번에 하나씩 처리한다
let queue = Promise.resolve();
function publish(dialog) {
  const run = async () => {
    const rel = path.relative(ROOT, OVERRIDES);
    const add = await git(["add", "--", rel]);
    if (!add.ok) return { committed: false, pushed: false, message: "git add 실패: " + add.err };
    const diff = await git(["diff", "--cached", "--quiet", "--", rel]);
    if (diff.ok) return { committed: false, pushed: false, message: "바뀐 내용이 없어 올리지 않았습니다." };
    const commit = await git([...GIT_USER, "commit", "-m", `UI overrides: ${dialog}`, "--", rel]);
    if (!commit.ok) return { committed: false, pushed: false, message: "커밋 실패: " + (commit.err || commit.out) };
    if (NO_PUSH) return { committed: true, pushed: false, message: "커밋했습니다 (--no-push라 올리지는 않았습니다)." };
    let push = await git(["push", "origin", "HEAD"]);
    if (!push.ok) {
      // 원격이 앞서 있으면 받아 합친 뒤 다시 올린다
      const pull = await git([...GIT_USER, "pull", "--rebase", "--autostash", "origin", "HEAD"]);
      if (!pull.ok) {
        await git(["rebase", "--abort"]);
        return { committed: true, pushed: false, message: "커밋은 했지만 원격과 합치지 못했습니다. 터미널에서 git pull 후 git push 하세요: " + (pull.err || pull.out).slice(0, 200) };
      }
      push = await git(["push", "origin", "HEAD"]);
    }
    if (!push.ok) return { committed: true, pushed: false, message: "커밋은 했지만 push에 실패했습니다: " + push.err.slice(0, 200) };
    const head = await git(["rev-parse", "--short", "HEAD"]);
    return { committed: true, pushed: true, message: "GitHub에 올렸습니다 (" + head.out + "). 동료는 git pull로 받습니다." };
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>대화상자 편집</title>
<style>body{font:14px system-ui;margin:20px;word-break:keep-all}select,input{font:inherit}table{border-collapse:collapse;margin:6px 0 14px}
td,th{border:.4px solid #888;padding:3px 8px;text-align:left;vertical-align:middle}th{background:#eee;border-top-width:.8px}
.t{width:230px}.n{width:70px}.c{background:#fff3c4}.d{color:#888}.w{background:#fff8e6;border:1px solid #e6c36a;padding:8px 12px;margin:10px 0;max-width:900px}
button{padding:5px 14px;margin-right:8px}</style>
<h3>대화상자 편집</h3>
<div class="w" style="background:#fdeaea;border-color:#d98a8a"><b>저장하면 바로 GitHub에 올라가 동료 교사에게도 적용됩니다</b> (<code>git pull</code> 뒤). 되돌리려면 이 화면에서 다시 고치거나 <code>git revert</code> 하세요.</div>
<div class="w">제목·단추 글자를 바꿔도 스크립트가 글자로 항목을 구분하는 경우엔 동작이 달라질 수 있습니다. 슬라이더는 범위만 바뀌고, 입력칸이 받는 값의 한계(스크립트 안의 상수)는 그대로입니다.
기본값은 R 단추를 눌렀을 때 되돌아가는 값입니다(비우면 원래대로). 일러에서 대화상자를 처음 열어 보면 그 창이 이 목록에 나타납니다.</div>
<select id="dlg"></select> <button id="save">저장 + 올리기</button><button id="clear">이 대화상자 되돌리기 + 올리기</button><span id="msg"></span>
<div id="body"></div>
<script>
let data = null, cur = null;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
async function load() {
  data = await (await fetch("/api")).json();
  const sel = document.getElementById("dlg");
  const prev = sel.value;
  sel.innerHTML = data.dialogs.map((d) => "<option>" + esc(d.dialog) + "</option>").join("");
  if (prev && data.dialogs.some((d) => d.dialog === prev)) sel.value = prev;
  if (!data.dialogs.length) document.getElementById("body").textContent = "목록이 없습니다. 일러에서 대화상자를 한 번 열었다 닫은 뒤 새로고침하세요.";
  else show(sel.value);
}
function show(name) {
  cur = data.dialogs.find((d) => d.dialog === name);
  const ov = data.overrides[name] || {};
  let html = "", last = null, open = false;
  for (const c of cur.controls) {
    const o = ov[c.id] || {};
    if (c.panel !== last) { if (open) html += "</table>"; last = c.panel; html += "<table><tr><th colspan=5>" + esc(c.panel || "(패널 밖)") + "</table><table>"; open = true; }
    let cell;
    if (c.type === "scrollbar") {
      cell = "<td>" + esc(c.label || "슬라이더") + "<td>최소 <input class=n data-k=min value='" + (o.min ?? c.min) + "'><td>최대 <input class=n data-k=max value='" + (o.max ?? c.max) + "'>" +
        "<td>단계 <input class=n data-k=step value='" + (o.step ?? c.step) + "'><td>기본값(R) <input class=n data-k=reset value='" + (o.reset ?? "") + "' placeholder='그대로'> <span class=d>열 때 " + c.value + "</span>";
    } else if (c.type === "dropdownlist") {
      cell = "<td>드롭다운<td colspan=4>" + c.items.map((t, i) => "<input class=t data-i=" + i + " value='" + esc((o.items || c.items)[i]) + "'>").join(" ");
    } else {
      cell = "<td class=d>" + c.type + "<td colspan=4><input class=t data-k=text value='" + esc(o.text ?? c.text) + "'>";
    }
    html += "<tr data-id='" + c.id + "'>" + cell + "</tr>";
  }
  document.getElementById("body").innerHTML = html + (open ? "</table>" : "");
}
function collect() {
  return [...document.querySelectorAll("tr[data-id]")].map((tr) => {
    const c = cur.controls.find((x) => x.id === tr.dataset.id);
    const r = { id: c.id };
    if (c.type === "scrollbar") tr.querySelectorAll("input").forEach((i) => (r[i.dataset.k] = i.value));
    else if (c.type === "dropdownlist") r.items = [...tr.querySelectorAll("input")].map((i) => i.value);
    else r.text = tr.querySelector("input").value;
    return r;
  });
}
async function post(rows) {
  const r = await fetch("/api", { method: "POST", body: JSON.stringify({ dialog: cur.dialog, rows }) });
  const msg = document.getElementById("msg");
  msg.textContent = "저장하고 올리는 중…";
  if (!r.ok) { msg.textContent = await r.text(); return; }
  const j = await r.json();
  msg.textContent = "저장했습니다. " + j.message + " 일러에서 대화상자를 다시 열면 반영됩니다.";
  await load();
}
document.getElementById("dlg").onchange = (e) => show(e.target.value);
document.getElementById("save").onclick = () => post(collect());
document.getElementById("clear").onclick = () => post([]);
load();
</script>`;

http.createServer((req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE);
    } else if (req.method === "GET" && req.url === "/api") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ dialogs: readCatalogs(), overrides: readOverrides() }));
    } else if (req.method === "POST" && req.url === "/api") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let j;
        try { j = JSON.parse(body); save(j.dialog, j.rows); }
        catch (e) { res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }); res.end(String(e.message)); return; }
        publish(j.dialog).then((result) => { res.writeHead(200, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(result)); });
      });
    } else { res.writeHead(404); res.end(); }
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
}).listen(PORT, "127.0.0.1", () => console.log(`대화상자 편집: http://127.0.0.1:${PORT}`));
