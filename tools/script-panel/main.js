// 스크립트 패널: 폴더를 지정하면 안의 .jsx를 목록으로 보여 주고, 클릭하면 실행한다.
(function () {
    "use strict";
    var cep = window.__adobe_cep__;
    var $ = function (id) { return document.getElementById(id); };
    var S = { root: "", scripts: [], favs: {}, open: {}, query: "", busy: false };

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

    function makeRow(item, showDir) {
        var row = document.createElement("div");
        row.className = "row";
        row.title = item.path;
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
        star.textContent = S.favs[item.path] ? "★" : "☆";
        star.title = "즐겨찾기";
        star.onclick = function (ev) { ev.stopPropagation(); toggleFav(item); };
        row.appendChild(star);
        row.onclick = function () { run(item); };
        return row;
    }

    function makeGroup(key, label, count, open, onToggle) {
        var g = document.createElement("div");
        g.className = "group";
        g.textContent = (open ? "▾ " : "▸ ") + label;
        var n = document.createElement("span");
        n.className = "n";
        n.textContent = count;
        g.appendChild(n);
        g.onclick = onToggle;
        return g;
    }

    function render() {
        var list = $("list");
        list.textContent = "";
        $("path").textContent = S.root;
        $("path").title = S.root;
        var q = S.query.trim().toLowerCase();

        if (q) {
            var hits = S.scripts.filter(function (it) {
                return (it.title + " " + it.dir).toLowerCase().indexOf(q) >= 0;
            });
            if (!hits.length) { var e = document.createElement("div"); e.className = "empty"; e.textContent = "검색 결과가 없습니다."; list.appendChild(e); return; }
            hits.forEach(function (it) { list.appendChild(makeRow(it, true)); });
            return;
        }

        var favs = S.scripts.filter(function (it) { return S.favs[it.path]; });
        if (favs.length) {
            list.appendChild(makeGroup("fav", "★ 즐겨찾기", favs.length, true, function () {}));
            favs.forEach(function (it) { list.appendChild(makeRow(it, true)); });
        }

        var groups = {}, order = [];
        S.scripts.forEach(function (it) {
            var k = it.dir || "(폴더 바로 아래)";
            if (!groups[k]) { groups[k] = []; order.push(k); }
            groups[k].push(it);
        });
        order.forEach(function (k) {
            var open = !!S.open[k];
            list.appendChild(makeGroup(k, k, groups[k].length, open, function () {
                S.open[k] = !S.open[k];
                save("open", S.open);
                render();
            }));
            if (open) groups[k].forEach(function (it) { list.appendChild(makeRow(it, false)); });
        });
        if (!S.scripts.length) {
            var e2 = document.createElement("div");
            e2.className = "empty";
            e2.textContent = "스크립트가 없습니다.";
            list.appendChild(e2);
        }
    }

    // 일러의 패널 배경색을 따라간다
    function applySkin() {
        try {
            var c = JSON.parse(cep.getHostEnvironment()).appSkinInfo.panelBackgroundColor.color;
            document.documentElement.style.setProperty("--bg", "rgb(" + Math.round(c.red) + "," + Math.round(c.green) + "," + Math.round(c.blue) + ")");
            document.documentElement.classList.toggle("light", 0.299 * c.red + 0.587 * c.green + 0.114 * c.blue > 140);
        } catch (e) {}
    }

    $("pick").onclick = function () {
        host("spPickFolder", S.root).then(function (r) {
            if (r && r !== "EvalScript error.") { S.root = r; save("root", r); refresh(); }
        });
    };
    $("refresh").onclick = refresh;
    $("q").oninput = function () { S.query = this.value; render(); };

    S.root = load("root", "");
    S.favs = load("favs", {});
    S.open = load("open", {});
    applySkin();
    try { cep.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applySkin); } catch (e) {}

    (S.root ? Promise.resolve("") : host("spDefaultRoot")).then(function (r) {
        if (r && r !== "EvalScript error.") { S.root = r; save("root", r); }
        refresh();
    });
})();
