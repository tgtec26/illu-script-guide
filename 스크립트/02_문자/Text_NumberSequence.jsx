(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }
    var doc = app.activeDocument;

    // 현재 보고 있는 화면의 영역 가져오기
    var view = doc.views[0];
    var viewBounds = view.bounds;
    var viewLeft = viewBounds[0];
    var viewRight = viewBounds[2];
    var viewBottom = viewBounds[3];
    var viewCenterX = (viewLeft + viewRight) / 2; // 화면의 가로 중앙

    var fontNames = ["GSMediumB1"];
    var fontSize = 8;
    var horizontalGap = 2 * 2.834645669; // 2mm를 pt로 변환
    var bottomMargin = 20; // 화면 하단에서 띄울 간격

    var PREF_KEY = "TextNumberSequence/settings";
    var saved = readSavedSettings();

    // 다이얼로그 생성
    var dialog = new Window("dialog", "연속 숫자 입력");
    dialog.orientation = "column";
    dialog.alignChildren = "fill";

    var inputGroup = dialog.add("group");
    inputGroup.orientation = "column";
    inputGroup.alignChildren = "right";

    var startRow = inputGroup.add("group");
    startRow.add("statictext", undefined, "시작 숫자:");
    var startInput = startRow.add("edittext", undefined, saved.start);
    startInput.preferredSize.width = 60;
    startInput.active = true;

    var stepRow = inputGroup.add("group");
    stepRow.add("statictext", undefined, "간격:");
    var stepInput = stepRow.add("edittext", undefined, saved.step);
    stepInput.preferredSize.width = 60;

    var countRow = inputGroup.add("group");
    countRow.add("statictext", undefined, "갯수:");
    var countInput = countRow.add("edittext", undefined, saved.count);
    countInput.preferredSize.width = 60;
    var countDownBtn = countRow.add("button", undefined, "▼");
    countDownBtn.preferredSize = [25, 25];
    var countUpBtn = countRow.add("button", undefined, "▲");
    countUpBtn.preferredSize = [25, 25];

    countUpBtn.onClick = function() {
        countInput.text = String(getCount() + 1);
    };
    countDownBtn.onClick = function() {
        var next = getCount() - 1;
        if (next < 1) next = 1;
        countInput.text = String(next);
    };

    function getCount() {
        var n = parseInt(countInput.text, 10);
        if (isNaN(n) || n < 1) n = 1;
        return n;
    }

    var buttonGroup = dialog.add("group");
    buttonGroup.alignment = "center";
    var cancelBtn = buttonGroup.add("button", undefined, "취소", {name: "cancel"});
    var okBtn = buttonGroup.add("button", undefined, "확인", {name: "ok"});

    var confirmed = false;
    okBtn.onClick = function() {
        if (isNaN(parseFloat(startInput.text)) || isNaN(parseFloat(stepInput.text))) {
            alert("시작 숫자와 간격은 숫자로 입력해주세요.");
            return;
        }
        confirmed = true;
        saveSettings();
        dialog.close();
    };
    cancelBtn.onClick = function() {
        dialog.close();
    };

    function saveSettings() {
        var parts = ["v1", startInput.text, stepInput.text, String(getCount())];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSavedSettings() {
        var settings = {start: "1", step: "1", count: "5"};
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return settings; }
        if (!raw) return settings;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 4) return settings;
        if (!isNaN(parseFloat(p[1]))) settings.start = p[1];
        if (!isNaN(parseFloat(p[2]))) settings.step = p[2];
        var count = parseInt(p[3], 10);
        if (!isNaN(count) && count >= 1) settings.count = String(count);
        return settings;
    }

    dialog.show();

    if (!confirmed) {
        return;
    }

    var startNum = parseFloat(startInput.text);
    var stepNum = parseFloat(stepInput.text);
    var count = getCount();

    // 부동소수점 오차 제거 후 문자열로 변환
    var contentsArray = [];
    for (var i = 0; i < count; i++) {
        var value = Math.round((startNum + stepNum * i) * 1e6) / 1e6;
        contentsArray.push(String(value));
    }

    var targetFont = findTextFont(fontNames);

    // 먼저 모든 텍스트 프레임을 생성하여 전체 너비와 최대 높이 계산
    var textFrames = [];
    var totalWidth = 0;
    var maxHeight = 0;

    for (var i = 0; i < contentsArray.length; i++) {
        var tf = doc.textFrames.add();
        tf.contents = contentsArray[i];
        tf.textRange.characterAttributes.size = fontSize;
        try {
            tf.textRange.characterAttributes.textFont = targetFont;
        } catch(err) {}
        textFrames.push(tf);

        totalWidth += tf.width;
        if (i < contentsArray.length - 1) {
            totalWidth += horizontalGap;
        }
        if (tf.height > maxHeight) {
            maxHeight = tf.height;
        }
    }

    // 현재 보이는 화면의 6시 방향에 가로로 배치
    var currentX = viewCenterX - (totalWidth / 2);
    var baselineY = viewBottom + bottomMargin + maxHeight;

    for (var i = 0; i < textFrames.length; i++) {
        textFrames[i].position = [currentX, baselineY];
        currentX += textFrames[i].width + horizontalGap;
    }

    doc.selection = null;

    app.redraw();
    doc.activate();

    view.zoom = view.zoom;

    function findTextFont(fontNames) {
        for (var i = 0; i < fontNames.length; i++) {
            try {
                return app.textFonts.getByName(fontNames[i]);
            } catch (e) {}
        }
        alert("지정된 폰트를 찾을 수 없어 기본 폰트로 실행합니다.");
        return app.textFonts[0];
    }
})();
