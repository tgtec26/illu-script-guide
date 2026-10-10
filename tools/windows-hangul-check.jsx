// Windows(및 Mac)에서 한글 스크립트 파일명이 일러스트레이터에서 잘 쓰이는지 점검한다.
// 실행: 저장소를 git pull 한 뒤, 일러스트레이터에서 파일 > 스크립트 > 기타 스크립트…(Ctrl+F12)로 이 파일을 연다.
// 아무것도 고치지 않는다. 임시 폴더에 파일 몇 개를 만들었다 지우고, 결과를 창으로 보여 주며 바탕화면에
// "한글파일명_점검결과.txt"로도 저장한다. 이 파일은 UTF-8(BOM)이다: 아래 "한글 표시" 줄이 깨져 보이면 그 자체가 결과다.
(function () {
    var lines = [];
    var fails = 0, warns = 0;
    function ok(msg) { lines.push("[통과] " + msg); }
    function bad(msg) { fails++; lines.push("[실패] " + msg); }
    function warn(msg) { warns++; lines.push("[주의] " + msg); }
    function info(msg) { lines.push("       " + msg); }
    function path(f) { try { return decodeURI(f.fsName); } catch (e) { return String(f.fsName); } }

    lines.push("=== 한글 파일명 점검 ===");
    lines.push("한글 표시: 가나다라 마바사 ABC 123  (이 줄이 깨져 보이면 창 글자 인코딩 문제)");
    lines.push("일러스트레이터 " + app.version + " / " + $.os + " / 언어 " + app.locale);

    // ---- 저장소 위치
    var root = new File($.fileName).parent.parent;
    var KOR = "스크립트"; // 스크립트
    var scriptRoot = new Folder(root.fsName + "/" + KOR);
    if (!scriptRoot.exists) {
        var picked = Folder.selectDialog("illu-script-guide 저장소 폴더를 고르세요 (그 안에 '스크립트' 폴더가 있는 곳)");
        if (picked) { root = picked; scriptRoot = new Folder(root.fsName + "/" + KOR); }
    }
    if (!scriptRoot.exists) {
        bad("스크립트 폴더를 찾지 못했습니다: " + path(root));
        finish();
        return;
    }
    ok("스크립트 폴더: " + path(scriptRoot));

    // ---- 1) 한글 이름 .jsx 목록 읽기
    var folders = scriptRoot.getFiles(function (f) { return f instanceof Folder; });
    var all = [], i, j;
    for (i = 0; i < folders.length; i++) {
        var fs = folders[i].getFiles("*.jsx");
        for (j = 0; j < fs.length; j++) all.push(fs[j]);
    }
    if (all.length > 100) ok(".jsx 파일 " + all.length + "개를 찾았습니다.");
    else bad(".jsx 파일이 " + all.length + "개뿐입니다 (130개 넘게 있어야 함). 한글 이름을 못 읽는 것일 수 있습니다.");

    // ---- 2) 파일명 형태: 분해된 자모(NFD)가 섞이면 안 된다
    var decomposed = [];
    for (i = 0; i < all.length; i++) {
        var nm = decodeURI(all[i].name);
        if (/[ᄀ-ᇿ㄰-㆏]/.test(nm)) decomposed.push(nm);
    }
    if (decomposed.length === 0) ok("파일 이름에 분해된 자모(NFD)가 없습니다.");
    else { bad("분해된 자모가 든 파일 이름 " + decomposed.length + "개"); info(decomposed.slice(0, 5).join(", ")); }

    // ---- 3) 파일 내용을 UTF-8로 읽기
    var unreadable = [], garbled = [];
    for (i = 0; i < all.length; i++) {
        try {
            all[i].encoding = "UTF-8";
            if (!all[i].open("r")) { unreadable.push(decodeURI(all[i].name)); continue; }
            var head = all[i].read(600);
            all[i].close();
            if (!head || head.length === 0) unreadable.push(decodeURI(all[i].name));
            else if (head.indexOf("�") >= 0) garbled.push(decodeURI(all[i].name));
        } catch (e) { unreadable.push(decodeURI(all[i].name) + " (" + e + ")"); }
    }
    if (unreadable.length === 0) ok("모든 .jsx 파일을 열어 읽을 수 있습니다.");
    else { bad("열지 못한 파일 " + unreadable.length + "개"); info(unreadable.slice(0, 5).join(", ")); }
    if (garbled.length === 0) ok("파일 내용 한글이 깨지지 않고 읽힙니다.");
    else { bad("한글이 깨져 읽히는 파일 " + garbled.length + "개"); info(garbled.slice(0, 5).join(", ")); }

    // ---- 4) 헬퍼(.jsxinc) 로드: 스크립트들이 맨 위에서 하는 일
    try {
        var helperName = "ui_tab_helper.jsxinc";
        var helper = new File(scriptRoot.fsName + "/00_" + "세팅" + "/" + helperName);
        if (!helper.exists) { bad("헬퍼 파일이 없습니다: " + path(helper)); }
        else {
            $.global.bindTabOrder = undefined;
            $.evalFile(helper);
            if (typeof bindTabOrder === "function") ok("헬퍼(ui_tab_helper.jsxinc)를 불러왔습니다.");
            else bad("헬퍼를 불러왔지만 함수가 정의되지 않았습니다.");
        }
    } catch (e) { bad("헬퍼 로드 오류: " + e); }

    // ---- 5) 한글 이름 파일을 "로더(스텁)"로 실행: setup이 만드는 방식 그대로 흉내
    var tmp = new Folder(Folder.temp.fsName + "/illu_hangul_check");
    var target = new File(tmp.fsName + "/" + "한글 대상 스크립트.jsx"); // 한글 대상 스크립트.jsx
    var stub = new File(tmp.fsName + "/" + "한글 로더.jsx");                              // 한글 로더.jsx
    try {
        tmp.create();
        target.encoding = "UTF-8"; target.open("w");
        target.write("$.global.__hangulCheckRan = $.fileName;");
        target.close();
        var targetPath = target.fsName.replace(/\\/g, "/");
        stub.encoding = "UTF-8"; stub.open("w");
        stub.write("// 자동 생성 로더\n$.evalFile(new File(\"" + targetPath + "\"));");
        stub.close();
        $.global.__hangulCheckRan = undefined;
        $.evalFile(stub);
        if ($.global.__hangulCheckRan) ok("한글 이름 로더가 한글 이름 스크립트를 실행했습니다.");
        else bad("로더를 실행했지만 대상 스크립트가 실행되지 않았습니다.");
        info("실행된 경로: " + decodeURI(String($.global.__hangulCheckRan)));
    } catch (e) { bad("한글 이름 로더 실행 오류: " + e); }
    try { target.remove(); stub.remove(); tmp.remove(); } catch (e2) {}
    $.global.__hangulCheckRan = undefined;

    // ---- 6) 일러스트레이터에 실제로 등록된 로더가 가리키는 원본이 있는지
    try {
        var presets = findPresets();
        if (presets === null) {
            warn("Presets 폴더를 찾지 못해 등록된 로더는 점검하지 못했습니다.");
        } else {
            var scriptsDir = findScriptsDir(presets);
            if (scriptsDir === null) warn("스크립트 폴더(" + KOR + " / Scripts)를 Presets 안에서 찾지 못했습니다: " + path(presets));
            else {
                var stubs = 0, missing = [], rx = /evalFile\(new File\("([^"]+)"\)\)/;
                var sub = scriptsDir.getFiles(function (f) { return f instanceof Folder; });
                for (i = 0; i < sub.length; i++) {
                    var st = sub[i].getFiles("*.jsx");
                    for (j = 0; j < st.length; j++) {
                        st[j].encoding = "UTF-8";
                        if (!st[j].open("r")) continue;
                        var body = st[j].read();
                        st[j].close();
                        var m = rx.exec(body);
                        if (!m) continue;
                        stubs++;
                        if (!new File(m[1]).exists) missing.push(decodeURI(st[j].name) + " → " + m[1]);
                    }
                }
                info("등록 위치: " + path(scriptsDir));
                if (stubs === 0) warn("등록된 로더가 없습니다. setup을 먼저 실행했는지 확인하세요.");
                else if (missing.length === 0) ok("등록된 로더 " + stubs + "개가 모두 존재하는 원본을 가리킵니다.");
                else { bad("원본을 못 찾는 로더 " + missing.length + "개 / 전체 " + stubs + "개 (이름을 바꾼 뒤 setup을 다시 실행해야 할 수 있습니다)"); info(missing.slice(0, 4).join("\n       ")); }
            }
        }
    } catch (e3) { warn("등록된 로더 점검 중 오류: " + e3); }

    finish();

    function findPresets() {
        var base = new Folder(app.path.fsName), k;
        for (k = 0; k < 5 && base; k++) {
            var p = new Folder(base.fsName + "/Presets.localized");
            if (p.exists) return p;
            p = new Folder(base.fsName + "/Presets");
            if (p.exists) return p;
            base = base.parent;
        }
        return null;
    }
    function findScriptsDir(presets) {
        var locales = presets.getFiles(function (f) { return f instanceof Folder; }), a;
        for (a = 0; a < locales.length; a++) {
            var names = [KOR, "Scripts"], b;
            for (b = 0; b < names.length; b++) {
                var d = new Folder(locales[a].fsName + "/" + names[b]);
                if (d.exists) return d;
            }
        }
        return null;
    }

    function finish() {
        lines.push("");
        lines.push(fails === 0 ? "=== 결과: 통과 (실패 0, 주의 " + warns + ") ===" : "=== 결과: 실패 " + fails + "개, 주의 " + warns + "개 ===");
        var text = lines.join("\n");
        var saved = "";
        try {
            var out = new File(Folder.desktop.fsName + "/" + "한글파일명_점검결과.txt");
            out.encoding = "UTF-8"; out.open("w"); out.write("﻿" + text); out.close();
            saved = "\n\n결과 파일: " + path(out);
        } catch (e) {}
        // 개발 중 자동 검증용: 창 없이 임시 폴더에 결과만 남긴다
        if ($.global.__hangulCheckNoDialog) {
            var tf = new File(Folder.temp.fsName + "/hangul_check_report.txt");
            tf.encoding = "UTF-8"; tf.open("w"); tf.write(text); tf.close();
            return;
        }
        var win = new Window("dialog", "한글 파일명 점검");
        win.orientation = "column"; win.alignChildren = "fill"; win.margins = 12;
        var box = win.add("edittext", undefined, text + saved, { multiline: true, readonly: true, scrolling: true });
        box.preferredSize = [640, 380];
        var row = win.add("group"); row.alignment = "right";
        row.add("button", undefined, "닫기", { name: "ok" });
        win.show();
    }
})();
