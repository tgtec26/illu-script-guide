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

    // 다이얼로그 생성
    var dialog = new Window("dialog", "텍스트 삽입 선택");
    dialog.alignChildren = "center";

    var romanFontCandidates = [
        "KoPubWorld바탕체_Pro",
        "KoPubWorld Batang Pro",
        "KoPubWorldBatangPro",
        "KoPubWorldBatang_Pro",
        "KoPubWorldBatangPM",
        "KoPubWorldBatangPL",
        "KoPubWorldBatangPB",
        "KoPubWorldBatangPro-Regular",
        "KoPubWorldBatangPro-Medium",
        "KoPubWorldBatangMedium"
    ];
    var textOptions = [
        {contents: ["(가)", "(나)", "(다)", "(라)", "(마)", "(바)"], fontSize: 10, fontNames: ["Batang"]},
        {contents: ["A", "B", "C", "D", "E", "F"], fontSize: 8, fontNames: ["BEDFGG+GSMediumB1"]},
        {contents: ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"], fontSize: 8, fontNames: romanFontCandidates},
        {contents: ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥"], fontSize: 9, fontNames: ["Batang"]},
        {contents: ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ", "ⓕ"], fontSize: 9, fontNames: ["Batang"]},
        {contents: ["1", "2", "3", "4", "5", "6"], fontSize: 8, fontNames: ["BEDFGG+GSMediumB1"]},
        {contents: ["①", "②", "③", "④", "⑤", "⑥"], fontSize: 8, fontNames: ["BEDFGG+GSMediumB1"]}
    ];
    var selectedOption = null;
    var selectedCount = 0;

    // 각 행은 6개의 버튼으로 구성되며, 누른 버튼까지의 문자만 생성합니다.
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "column";
    buttonGroup.alignChildren = "center";
    var buttonSize = [40, 25];

    for (var optionIndex = 0; optionIndex < textOptions.length; optionIndex++) {
        var row = buttonGroup.add("group");
        row.orientation = "row";
        row.alignChildren = "center";

        for (var charIndex = 0; charIndex < textOptions[optionIndex].contents.length; charIndex++) {
            var btn = row.add("button", undefined, textOptions[optionIndex].contents[charIndex]);
            btn.preferredSize = buttonSize;
            btn.onClick = makeSelectHandler(optionIndex, charIndex + 1);
        }
    }

    dialog.show();

    // 취소한 경우
    if (selectedOption === null) {
        return;
    }

    var contentsArray, fontSize, fontNames;
    var option = textOptions[selectedOption];
    contentsArray = option.contents.slice(0, selectedCount);
    fontSize = option.fontSize;
    fontNames = option.fontNames;

    var horizontalGap = 5; // 가로 간격
    var bottomMargin = 20; // 화면 하단에서 띄울 간격

    var targetFont = findTextFont(fontNames, "Batang", selectedOption === 2);

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

    function findTextFont(fontNames, fallbackName, useKoPubMetadata) {
        for (var i = 0; i < fontNames.length; i++) {
            try {
                return app.textFonts.getByName(fontNames[i]);
            } catch (e) {}
        }

        if (useKoPubMetadata) {
            for (var j = 0; j < app.textFonts.length; j++) {
                var font = app.textFonts[j];
                if (nameMatchesKoPubWorldBatang(font)) {
                    return font;
                }
            }
        }

        try {
            return app.textFonts.getByName(fallbackName);
        } catch (e2) {
            alert("지정된 폰트를 찾을 수 없어 기본 폰트로 실행합니다.");
            return app.textFonts[0];
        }
    }

    function nameMatchesKoPubWorldBatang(font) {
        var name = getFontText(font, "name");
        var family = getFontText(font, "family");
        var style = getFontText(font, "style");
        var all = (name + " " + family + " " + style).toLowerCase();

        var hasKoPub = all.indexOf("kopubworld") >= 0 || all.indexOf("kopub") >= 0 || all.indexOf("코펍") >= 0;
        var hasBatang = all.indexOf("batang") >= 0 || all.indexOf("바탕") >= 0;
        var hasPro = all.indexOf("pro") >= 0 || /kopubworldbatangp[mlb]/.test(all);

        return hasKoPub && hasBatang && hasPro;
    }

    function getFontText(font, key) {
        try {
            return String(font[key] || "");
        } catch (e) {
            return "";
        }
    }

    function makeSelectHandler(optionIndex, count) {
        return function() {
            selectedOption = optionIndex;
            selectedCount = count;
            dialog.close();
        };
    }
})();
