// 스크립트 패널: 폴더를 지정하면 안의 .jsx를 목록으로 보여 주고, 클릭하면 실행한다.
(function () {
    "use strict";
    var cep = window.__adobe_cep__;
    var $ = function (id) { return document.getElementById(id); };
    var S = { root: "", scripts: [], favs: {}, open: {}, query: "", busy: false, theme: "dark" };

    // 아이콘은 고정된 SVG 문자열이다 (사용자 글자는 넣지 않는다)
    var ICON = {
        folder: '<svg class="ico folder" viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
        file: '<svg class="ico file" viewBox="0 0 24 24"><path d="M6 2.5h8.2L19.5 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z"/><path class="g" d="M10 11.5l-2 2 2 2M14 11.5l2 2-2 2"/></svg>',
        chev: '<svg class="chev" viewBox="0 0 10 10"><path d="M3 1.5l4 3.5-4 3.5z"/></svg>',
        star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.9-4.7 4.5 1.2 6.4L12 17.4l-5.7 3.1 1.2-6.4-4.7-4.5 6.4-.9z"/></svg>',
        pick: '<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M12 11v6M9 14h6"/></svg>',
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
                status(S.scripts.length + "개");
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

    function toggleFav(item) {
        if (S.favs[item.path]) delete S.favs[item.path]; else S.favs[item.path] = true;
        save("favs", S.favs);
        render();
    }

    function makeRow(item, showDir, depth) {
        var row = document.createElement("div");
        row.className = "row";
        row.title = item.path;
        row.style.paddingLeft = (10 + depth * 14) + "px";
        var sp = document.createElement("span");
        sp.className = "spacer";
        row.appendChild(sp);
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

    // 상대 폴더 경로("01_도형/하위")로 폴더 트리를 만든다
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

    function shortPath(p) {
        var parts = p.split("/").filter(function (x) { return x; });
        return parts.length > 3 ? "…/" + parts.slice(-3).join("/") : p;
    }

    function emptyMessage(list, text) {
        var e = document.createElement("div");
        e.className = "empty";
        e.textContent = text;
        list.appendChild(e);
    }

    function render() {
        var list = $("list");
        list.textContent = "";
        $("path").textContent = shortPath(S.root);
        $("path").title = S.root;
        var q = S.query.trim().toLowerCase();

        if (q) {
            var hits = S.scripts.filter(function (it) {
                return (it.title + " " + it.dir).toLowerCase().indexOf(q) >= 0;
            });
            if (!hits.length) { emptyMessage(list, "검색 결과가 없습니다."); return; }
            hits.forEach(function (it) { list.appendChild(makeRow(it, true, 0)); });
            return;
        }

        var favs = S.scripts.filter(function (it) { return S.favs[it.path]; });
        if (favs.length) {
            var sect = document.createElement("div");
            sect.className = "sect";
            sect.appendChild(icon("star"));
            sect.appendChild(document.createTextNode("즐겨찾기"));
            list.appendChild(sect);
            favs.forEach(function (it) { list.appendChild(makeRow(it, false, 0)); });
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

    $("pick").onclick = function () {
        host("spPickFolder", S.root).then(function (r) {
            if (r && r !== "EvalScript error.") { S.root = r; save("root", r); refresh(); }
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
    S.favs = load("favs", {});
    S.open = load("open", {});
    S.theme = load("theme", "dark") === "light" ? "light" : "dark";
    $("pick").appendChild(icon("pick"));
    $("refresh").appendChild(icon("refresh"));
    applyTheme();

    (S.root ? Promise.resolve("") : host("spDefaultRoot")).then(function (r) {
        if (r && r !== "EvalScript error.") { S.root = r; save("root", r); }
        refresh();
    });
})();
