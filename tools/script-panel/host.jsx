// 스크립트 패널의 일러스트레이터 쪽 함수. main.js가 evalScript로 부른다.
// 결과는 한 줄에 하나씩 "F<탭>전체경로<탭>상대폴더<탭>파일이름"이고, 오류는 "ERR:코드"로 돌려준다(한글은 main.js가 붙인다).

var SP_EXT = /\.(jsx|jsxbin|js)$/i;

function spWalk(folder, rel, out, depth) {
    if (depth > 6) return;
    var items = folder.getFiles();
    var folders = [], files = [], i, name;
    for (i = 0; i < items.length; i++) {
        name = decodeURI(items[i].name);
        if (name.charAt(0) === "." || name.charAt(0) === "_") continue;
        if (items[i] instanceof Folder) folders.push(items[i]);
        else if (SP_EXT.test(name)) files.push(items[i]);
    }
    files.sort(function (a, b) { return decodeURI(a.name) < decodeURI(b.name) ? -1 : 1; });
    folders.sort(function (a, b) { return decodeURI(a.name) < decodeURI(b.name) ? -1 : 1; });
    for (i = 0; i < files.length; i++) {
        out.push("F\t" + files[i].fsName + "\t" + rel + "\t" + decodeURI(files[i].name));
    }
    for (i = 0; i < folders.length; i++) {
        spWalk(folders[i], rel === "" ? decodeURI(folders[i].name) : rel + "/" + decodeURI(folders[i].name), out, depth + 1);
    }
}

function spListScripts(rootPath) {
    try {
        var root = new Folder(rootPath);
        if (!root.exists) return "ERR:nofolder";
        var out = [];
        spWalk(root, "", out, 0);
        return out.join("\n");
    } catch (e) {
        return "ERR:" + e;
    }
}

function spRun(path) {
    try {
        var f = new File(path);
        if (!f.exists) return "ERR:nofile";
        $.evalFile(f);
        return "OK";
    } catch (e) {
        return "ERR:" + e;
    }
}

function spPickFolder(startPath) {
    try {
        var start = startPath ? new Folder(startPath) : Folder.myDocuments;
        if (!start.exists) start = Folder.myDocuments;
        var picked = start.selectDlg("Script folder");
        return picked ? picked.fsName : "";
    } catch (e) {
        return "";
    }
}

// 이 저장소의 스크립트 폴더가 있으면 처음 경로로 쓴다 (Mac 작업 폴더, Windows setup이 내려받은 사본 순서)
function spDefaultRoot() {
    var candidates = ["~/agent/illu-script-guide/스크립트", "~/.illu-script-updater/illu-script-guide/스크립트"];
    for (var i = 0; i < candidates.length; i++) {
        try {
            var f = new Folder(candidates[i]);
            if (f.exists) return f.fsName;
        } catch (e) {}
    }
    return "";
}
