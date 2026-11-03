// 스크립트 패널: 폴더를 지정하면 안의 .jsx를 목록으로 보여 주고, 클릭하면 실행한다.
(function () {
    "use strict";
    var cep = window.__adobe_cep__;
    var $ = function (id) { return document.getElementById(id); };
    var S = { root: "", scripts: [], favs: {}, favOrder: [], open: {}, query: "", busy: false, theme: "dark" };

    // 아이콘은 고정된 SVG 문자열이다 (사용자 글자는 넣지 않는다)
    var ICON = {
        folder: '<svg class="ico folder" viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
        file: '<svg class="ico file" viewBox="0 0 24 24"><path d="M6 2.5h8.2L19.5 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z"/><path class="g" d="M10 11.5l-2 2 2 2M14 11.5l2 2-2 2"/></svg>',
        grip: '<svg class="grip" viewBox="0 0 10 16"><circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/></svg>',
        chev: '<svg class="chev" viewBox="0 0 10 10"><path d="M3 1.5l4 3.5-4 3.5z"/></svg>',
        star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.9-4.7 4.5 1.2 6.4L12 17.4l-5.7 3.1 1.2-6.4-4.7-4.5 6.4-.9z"/></svg>',
        pick: '<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M12 11v6M9 14h6"/></svg>',
        update: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 16v4h16v-4"/></svg>',
        refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg>',
        sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
        moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>'
    };
    function icon(name) {
        var t = document.createElement("span");
        t.style.display = "contents";
        t.innerHTML = ICON[name];
        return t.firstChild;
    }

    function load(key, fallback) {
        try {
            var v = localStorage.getItem("sp." + key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem("sp." + key, JSON.stringify(value)); } catch (e) {}
    }

    // 일러 쪽 함수(host.jsx)를 부르고 결과 문자열을 돌려준다
    function host(fn, arg) {
        return new Promise(function (resolve) {
            var call = fn + "(" + (arg === undefined ? "" : JSON.stringify(arg)) + ")";
            try { cep.evalScript(call, function (r) { resolve(r); }); } catch (e) { resolve("ERR:" + e); }
        });
    }

    function status(text, isError) {
        var el = $("status");
        el.textContent = text || "";
        el.className = isError ? "err" : "";
    }

    function errorText(code) {
        if (code === "ERR:nofolder") return "폴더를 찾을 수 없습니다. 폴더를 다시 지정해 주세요.";
        if (code === "ERR:nofile") return "파일이 없습니다. 새로고침해 주세요.";
        return code;
    }

    function parse(text) {
        var list = [];
        text.split("\n").forEach(function (line) {
            var p = line.split("\t");
            if (p.length === 4 && p[0] === "F") {
                list.push({ path: p[1], dir: p[2], file: p[3], title: p[3].replace(/\.(jsx|jsxbin|js)$/i, "") });
            }
        });
        return list;
    }

    function refresh() {
        if (!S.root) { S.scripts = []; render(); status("폴더 지정 버튼으로 스크립트 폴더를 골라 주세요."); return Promise.resolve(); }
        status("읽는 중…");
        return host("spListScripts", S.root).then(function (r) {
            if (r.indexOf("ERR:") === 0 || r === "EvalScript error.") {
                S.scripts = [];
                status(errorText(r), true);
            } else {
                S.scripts = parse(r);
                status("");
            }
            render();
        });
    }

    function run(item) {
        if (S.busy) return;
        S.busy = true;
        status("실행 중: " + item.title);
        host("spRun", item.path).then(function (r) {
            S.busy = false;
            if (r === "OK") status(""); else status("실행 실패: " + errorText(r), true);
        });
    }

    function syncFavs() {
        S.favs = {};
        S.favOrder.forEach(function (p) { S.favs[p] = true; });
    }

    function toggleFav(item) {
        var i = S.favOrder.indexOf(item.path);
        if (i >= 0) S.favOrder.splice(i, 1); else S.favOrder.push(item.path);
        syncFavs();
        save("favs", S.favOrder);
        render();
    }

    // 즐겨찾기 줄의 손잡이를 잡아 끌어 순서를 바꾼다
    function startDrag(ev, fromPath) {
        ev.preventDefault();
        ev.stopPropagation();
        var rows = [].slice.call(document.querySelectorAll(".row[data-fav]"));
        var paths = rows.map(function (r) { return r.getAttribute("data-fav"); });
        var from = paths.indexOf(fromPath), target = from;
        if (from < 0 || rows.length < 2) return;
        rows[from].classList.add("dragging");
        function mark() {
            rows.forEach(function (r) { r.classList.remove("drop-before", "drop-after"); });
            if (target !== from) rows[target].classList.add(target > from ? "drop-after" : "drop-before");
        }
        function onMove(e) {
            var i = rows.length - 1;
            for (var k = 0; k < rows.length; k++) {
                if (e.clientY < rows[k].getBoundingClientRect().bottom) { i = k; break; }
            }
            target = i;
            mark();
        }
        function onUp() {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            window.removeEventListener("blur", onUp);
            if (target !== from) {
                var moving = paths.splice(from, 1)[0];
                paths.splice(target, 0, moving);
                // 목록에 안 보이는(파일이 사라진) 즐겨찾기는 뒤에 그대로 둔다
                var hidden = S.favOrder.filter(function (p) { return paths.indexOf(p) < 0; });
                S.favOrder = paths.concat(hidden);
                save("favs", S.favOrder);
            }
            render();
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        window.addEventListener("blur", onUp);
    }

    function makeRow(item, showDir, depth, favRow) {
        var row = document.createElement("div");
        row.className = "row";
        row.title = item.path;
        row.style.paddingLeft = (10 + depth * 14) + "px";
        if (favRow) {
            var grip = icon("grip");
            grip.onmousedown = function (ev) { startDrag(ev, item.path); };
            grip.onclick = function (ev) { ev.stopPropagation(); };
            grip.setAttribute("title", "끌어서 순서 바꾸기");
            row.setAttribute("data-fav", item.path);
            row.appendChild(grip);
        } else {
            var sp = document.createElement("span");
            sp.className = "spacer";
            row.appendChild(sp);
        }
        row.appendChild(icon("file"));
        var name = document.createElement("span");
        name.className = "name";
        name.textContent = item.title;
        row.appendChild(name);
        if (showDir && item.dir) {
            var dir = document.createElement("span");
            dir.className = "dir";
            dir.textContent = item.dir;
            row.appendChild(dir);
        }
        var star = document.createElement("button");
        star.className = "star" + (S.favs[item.path] ? " on" : "");
        star.title = S.favs[item.path] ? "즐겨찾기 해제" : "즐겨찾기";
        star.appendChild(icon("star"));
        star.onclick = function (ev) { ev.stopPropagation(); toggleFav(item); };
        row.appendChild(star);
        row.onclick = function () { run(item); };
        return row;
    }

    function makeFolderRow(node, depth, open) {
        var row = document.createElement("div");
        row.className = "row";
        row.style.paddingLeft = (10 + depth * 14) + "px";
        var chev = icon("chev");
        if (open) chev.setAttribute("class", "chev open");
        row.appendChild(chev);
        row.appendChild(icon("folder"));
        var name = document.createElement("span");
        name.className = "name";
        name.textContent = node.name;
        row.appendChild(name);
        var n = document.createElement("span");
        n.className = "cnt";
        n.textContent = node.count;
        row.appendChild(n);
        row.onclick = function () {
            S.open[node.path] = !S.open[node.path];
            save("open", S.open);
            render();
        };
        return row;
    }

    // 상대 폴더 경로("06_도형/하위")로 폴더 트리를 만든다
    function buildTree(items) {
        var root = { name: "", path: "", dirs: {}, order: [], files: [], count: 0 };
        items.forEach(function (it) {
            var node = root, path = "";
            (it.dir ? it.dir.split("/") : []).forEach(function (part) {
                path = path ? path + "/" + part : part;
                if (!node.dirs[part]) {
                    node.dirs[part] = { name: part, path: path, dirs: {}, order: [], files: [], count: 0 };
                    node.order.push(part);
                }
                node = node.dirs[part];
            });
            node.files.push(it);
        });
        (function count(n) {
            n.count = n.files.length;
            n.order.forEach(function (k) { n.count += count(n.dirs[k]); });
            return n.count;
        })(root);
        return root;
    }

    function renderNode(node, depth, list) {
        node.order.forEach(function (k) {
            var d = node.dirs[k], open = !!S.open[d.path];
            list.appendChild(makeFolderRow(d, depth, open));
            if (open) renderNode(d, depth + 1, list);
        });
        node.files.forEach(function (it) { list.appendChild(makeRow(it, false, depth)); });
    }

    function emptyMessage(list, text) {
        var e = document.createElement("div");
        e.className = "empty";
        e.textContent = text;
        list.appendChild(e);
    }

    function render() {
        var list = $("list"), favBox = $("favs");
        list.textContent = "";
        favBox.textContent = "";
        $("pick").title = "스크립트 폴더 지정" + (S.root ? "\n" + S.root : "");
        var q = S.query.trim().toLowerCase();

        if (q) {
            var hits = S.scripts.filter(function (it) {
                return (it.title + " " + it.dir).toLowerCase().indexOf(q) >= 0;
            });
            if (!hits.length) { emptyMessage(list, "검색 결과가 없습니다."); return; }
            hits.forEach(function (it) { list.appendChild(makeRow(it, true, 0)); });
            return;
        }

        var byPath = {};
        S.scripts.forEach(function (it) { byPath[it.path] = it; });
        var favs = S.favOrder.map(function (p) { return byPath[p]; }).filter(function (it) { return it; });
        if (favs.length) {
            var sect = document.createElement("div");
            sect.className = "sect";
            sect.appendChild(icon("star"));
            sect.appendChild(document.createTextNode("즐겨찾기"));
            favBox.appendChild(sect);
            favs.forEach(function (it) { favBox.appendChild(makeRow(it, false, 0, true)); });
        }
        if (!S.scripts.length) { emptyMessage(list, "스크립트가 없습니다."); return; }
        renderNode(buildTree(S.scripts), 0, list);
    }

    function applyTheme() {
        document.documentElement.className = S.theme;
        var t = $("themeIcon");
        t.textContent = "";
        t.appendChild(icon(S.theme === "light" ? "sun" : "moon"));
    }

    // Node runs Git in a separate process; no shell commands go through evalScript.
    var updater = null, updateBusy = false, updateReady = false;
    function updateMessage(text, detail, error, indicator, notice) {
        var button = $("updateNow");
        var label = [text, detail].filter(function (part) { return part; }).join("\n");
        button.title = label || "업데이트";
        button.setAttribute("aria-label", label || "업데이트");
        button.className = "ib" + (indicator ? " " + indicator : error ? " attention" : "");
        $("updateText").textContent = notice ? label : "";
        $("updates").hidden = !notice;
        $("updates").className = error ? "error" : "";
        $("updateNow").disabled = updateBusy || !updateReady;
    }
    function initUpdater() {
        if (updater) return;
        var node = window.cep_node;
        if (!node || !node.require) throw new Error("업데이트 기능을 사용하려면 Illustrator를 재시작해 패널을 다시 여세요.");
        var path = node.require("path");
        var file = node.require("url").fileURLToPath(window.location.href);
        var panelDir = path.dirname(file);
        updater = node.require(path.join(panelDir, "updater.js")).createUpdater(panelDir);
    }
    function checkUpdate() {
        if (updateBusy || S.busy) return;
        updateBusy = true; updateReady = false;
        updateMessage("원격 상태 확인 중…");
        try {
            initUpdater();
            var job = updater.readJob();
            if (job && (job.state === "waiting" || job.state === "running")) {
                updateBusy = false;
                updateMessage(job.message, "Illustrator를 완전히 종료하세요.", false, "attention", true);
                return;
            }
        } catch (e) {
            updateBusy = false; updateMessage(e.message, "Git 설치와 패널 연결 상태를 확인하세요.", true); return;
        }
        updater.check(S.root).then(function (state) {
            updateBusy = false; updateReady = state.canUpdate;
            var messages = {
                current: "최신 버전입니다.",
                behind: "원격에 새 버전이 있습니다. 업데이트해 주세요.",
                ahead: "최신 버전입니다.",
                diverged: "로컬과 원격의 변경이 갈라져 있습니다. Git에서 먼저 정리하세요.",
                dirty: "로컬 수정 파일이 있습니다. 변경을 정리한 뒤 업데이트하세요."
            };
            var detail = "";
            var last = updater.readJob();
            var retry = last && last.state === "failed" && state.kind === "current" && !state.dirty;
            if (retry) updateReady = true;
            if (last && (last.state === "done" || last.state === "failed")) {
                detail = last.message + (last.log ? "\n업데이트 로그: " + last.log : "");
            }
            updateMessage(retry ? "설치 재시도" : messages[state.kind], detail,
                retry || state.kind === "diverged" || state.kind === "dirty",
                retry || state.behind ? "attention" : "current");
        }).catch(function (e) {
            updateBusy = false; updateReady = false;
            updateMessage("원격 상태를 확인하지 못했습니다.", e.message, true);
        });
    }
    $("updateNow").onclick = function () {
        if (updateBusy || !updateReady || S.busy) return;
        updateBusy = true; updateReady = false;
        updateMessage("업데이트 준비 중…");
        updater.schedule(S.root).then(function (job) {
            updateBusy = false;
            updateMessage(job.message, "저장 후 Illustrator를 종료하세요.", false, "attention", true);
        }).catch(function (e) {
            updateBusy = false;
            updateMessage("업데이트를 시작하지 못했습니다.", e.message, true);
        });
    };

    $("pick").onclick = function () {
        host("spPickFolder", S.root).then(function (r) {
            if (r && r !== "EvalScript error.") { S.root = r; save("root", r); refresh(); updateReady = false; updateMessage("폴더를 변경했습니다. 패널을 다시 열면 상태를 확인합니다."); }
        });
    };
    $("refresh").onclick = refresh;
    $("theme").onclick = function () {
        S.theme = S.theme === "light" ? "dark" : "light";
        save("theme", S.theme);
        applyTheme();
    };
    $("q").oninput = function () { S.query = this.value; render(); };

    S.root = load("root", "");
    var storedFavs = load("favs", []);
    S.favOrder = Array.isArray(storedFavs) ? storedFavs : Object.keys(storedFavs); // 예전 형식(경로: true)도 읽는다
    syncFavs();
    S.open = load("open", {});
    S.theme = load("theme", "dark") === "light" ? "light" : "dark";
    $("pick").appendChild(icon("pick"));
    $("refresh").appendChild(icon("refresh"));
    $("updateNow").appendChild(icon("update"));
    applyTheme();

    (S.root ? Promise.resolve("") : host("spDefaultRoot")).then(function (r) {
        if (r && r !== "EvalScript error.") { S.root = r; save("root", r); }
        refresh();
        checkUpdate();
    });
})();
