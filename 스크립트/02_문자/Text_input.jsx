(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }
    var doc = app.activeDocument;

    // 현재 보고 있는 화면의 영역 가져오기
    var view = getCurrentView(doc);
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

    // 특수문자 버튼에 표시할 대응 표준문자(모양이 같은 글자). 삽입되는 실제 문자는 contents.
    var HYHWP_LABELS = [
        String.fromCharCode(0x03B8), "x", "y", "z", String.fromCharCode(0x03C1)
    ];
    var HANCOM_LABELS = [
        String.fromCharCode(0x2103), String.fromCharCode(0x03B1), String.fromCharCode(0x03B3),
        String.fromCharCode(0x03B2), "a", "b", "c"
    ];

    var textOptions = [
        {contents: ["(가)", "(나)", "(다)", "(라)", "(마)", "(바)"], fontSize: 10, fontNames: ["Batang"]},
        {contents: ["A", "B", "C", "D", "E", "F"], fontSize: 8, fontNames: ["GSMediumB1"]},
        {contents: ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"], fontSize: 8, fontNames: romanFontCandidates},
        {contents: ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥"], fontSize: 9, fontNames: ["Batang"]},
        {contents: ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ", "ⓕ"], fontSize: 9, fontNames: ["Batang"]},
        {contents: ["1", "2", "3", "4", "5", "6"], fontSize: 8, fontNames: ["GSMediumB1"]},
        {contents: ["①", "②", "③", "④", "⑤", "⑥"], fontSize: 8, fontNames: ["GSMediumB1"]},
        {contents: ["t0", "t1", "t2", "t3", "t4", "t5"], fontSize: 8, fontNames: ["GSMediItaC1"], applySubscript: true},
        {contents: ["d1", "d2", "d3", "d4", "d5", "d6"], fontSize: 8, fontNames: ["GSMediItaC1"], applySubscript: true},
        {contents: [
            String.fromCharCode(0xE0A4), String.fromCharCode(0xE0FC), String.fromCharCode(0xE0FD),
            String.fromCharCode(0xE0FE), String.fromCharCode(0xE0AD)
        ], fontSize: 8, fontNames: ["HyhwpEQ", "HyhwpEQ-Regular", "HyhwpEQRegular", "HyhwpEQ Regular"],
            independent: true, labels: HYHWP_LABELS},
        {contents: [
            String.fromCharCode(0x2103), String.fromCharCode(0xE09D), String.fromCharCode(0xE09E),
            String.fromCharCode(0xE09F), String.fromCharCode(0xE0E5), String.fromCharCode(0xE0E6),
            String.fromCharCode(0xE0E7)
        ], fontSize: 8, fontNames: ["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular"],
            independent: true, labels: HANCOM_LABELS}
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

        var opt = textOptions[optionIndex];
        for (var charIndex = 0; charIndex < opt.contents.length; charIndex++) {
            // 특수문자 행은 대응 표준문자(labels)를 버튼에 표시, 클릭 시 실제 문자 삽입
            var label = opt.labels ? opt.labels[charIndex] : opt.contents[charIndex];
            var btn = row.add("button", undefined, label);
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
    if (option.independent) {
        // 특수문자 행: 클릭한 한 글자만 삽입 (연속 아님)
        contentsArray = [option.contents[selectedCount - 1]];
    } else {
        contentsArray = option.contents.slice(0, selectedCount);
    }
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
        if (option.applySubscript) {
            for (var charIndex = 1; charIndex < tf.contents.length; charIndex++) {
                tf.textRange.characters[charIndex].characterAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
            }
        }
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

    function getCurrentView(doc) {
        try {
            if (doc.activeView) {
                return doc.activeView;
            }
        } catch (e) {}
        return doc.views[0];
    }

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

