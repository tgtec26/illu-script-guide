// === 마지막으로 실행한 스크립트를 다시 실행 (스프레드시트 F4처럼) ===
// 정렬 스크립트를 실행하면 그 경로가 임시 파일에 기록됩니다.
// 이 스크립트는 그 기록을 읽어 "방금 실행한 스크립트"를 한 번 더 실행합니다.
// 자기 자신은 기록을 남기지 않으므로, 이 스크립트를 반복해도 "마지막 스크립트"가 유지됩니다.
(function() {
    var memo = new File(Folder.temp + "/illu_last_script.txt");
    if (!memo.exists) {
        alert("반복할 스크립트가 없습니다.\n먼저 정렬 스크립트를 한 번 실행하세요.");
        return;
    }

    memo.encoding = "UTF-8";
    memo.open("r");
    var lastPath = memo.read();
    memo.close();

    lastPath = lastPath.replace(/^\s+|\s+$/g, "");
    if (lastPath === "") {
        alert("마지막 스크립트 기록이 비어 있습니다.");
        return;
    }

    var target = new File(lastPath);
    if (!target.exists) {
        alert("스크립트 파일을 찾을 수 없습니다:\n" + lastPath);
        return;
    }

    $.evalFile(target);
})();
