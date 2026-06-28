(function() {
    // 1. ScriptUI 창 구성
    var win = new Window("dialog", "첨자 문자 만들기 by cjh");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;

    // --- 글꼴 및 대소문자 옵션 패널 ---
    var pnlOptions = win.add("panel", undefined, "글꼴 및 대소문자 옵션");
    pnlOptions.alignChildren = "left";
    pnlOptions.margins = 15;
    
    var grpFont = pnlOptions.add("group");
    var radItalic = grpFont.add("radiobutton", undefined, "이탤릭체");
    var radRoman = grpFont.add("radiobutton", undefined, "로만체");
    radItalic.value = true; // 기본값: 이탤릭체

    var grpCase = pnlOptions.add("group");
    var radLower = grpCase.add("radiobutton", undefined, "소문자");
    var radUpper = grpCase.add("radiobutton", undefined, "대문자");
    radLower.value = true; // 기본값: 소문자

    // --- 알파벳 선택 패널 ---
    var pnlAlpha = win.add("panel", undefined, "알파벳 선택(다중 선택 가능)");
    pnlAlpha.alignChildren = "fill";
    pnlAlpha.margins = 15;
    
    // 알파벳 전체 해제 버튼 그룹
    var grpAlphaTop = pnlAlpha.add("group");
    grpAlphaTop.alignment = "right";
    var btnDeselectAlpha = grpAlphaTop.add("button", undefined, "전체 해제");
    
    // 알파벳 체크박스 그리드 (7개씩 줄바꿈)
    var grpAlphaGrid = pnlAlpha.add("group");
    grpAlphaGrid.orientation = "column";
    grpAlphaGrid.alignChildren = "left";
    grpAlphaGrid.spacing = 5;

    var alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    var chkAlphas = [];
    var rowAlpha;
    for (var i = 0; i < alphabets.length; i++) {
        // 7개가 될 때마다 새로운 가로줄(row) 생성
        if (i % 7 === 0) {
            rowAlpha = grpAlphaGrid.add("group");
            rowAlpha.orientation = "row";
        }
        chkAlphas[i] = rowAlpha.add("checkbox", undefined, alphabets[i]);
        chkAlphas[i].preferredSize.width = 40; // 간격 일정하게 맞춤
    }

    // 알파벳 전체 해제 기능
    btnDeselectAlpha.onClick = function() {
        for (var i = 0; i < chkAlphas.length; i++) chkAlphas[i].value = false;
    };

    // --- 하첨자 숫자 선택 패널 ---
    var pnlNum = win.add("panel", undefined, "하첨자 숫자 선택");
    pnlNum.alignChildren = "fill";
    pnlNum.margins = 15;
    
    // 숫자 전체 해제 버튼 그룹
    var grpNumTop = pnlNum.add("group");
    grpNumTop.alignment = "right";
    var btnDeselectNum = grpNumTop.add("button", undefined, "전체 해제");

    // 숫자 체크박스 
    var rowNum = pnlNum.add("group");
    rowNum.orientation = "row";
    rowNum.alignChildren = "left";
    var chkNums = [];
    for (var j = 0; j <= 6; j++) {
        chkNums[j] = rowNum.add("checkbox", undefined, j.toString());
        chkNums[j].preferredSize.width = 40; // 간격 일정하게 맞춤
    }

    // 숫자 전체 해제 기능
    btnDeselectNum.onClick = function() {
        for (var j = 0; j < chkNums.length; j++) chkNums[j].value = false;
    };

    // --- 윗첨자 이온 선택 패널 ---
    var pnlIon = win.add("panel", undefined, "윗첨자 이온 선택");
    pnlIon.alignChildren = "fill";
    pnlIon.margins = 15;

    var grpIonTop = pnlIon.add("group");
    grpIonTop.alignment = "right";
    var btnDeselectIon = grpIonTop.add("button", undefined, "전체 해제");

    var rowIonNum = pnlIon.add("group");
    rowIonNum.orientation = "row";
    rowIonNum.alignChildren = "left";
    var chkIonNums = [];
    for (var n = 1; n <= 7; n++) {
        chkIonNums[n-1] = rowIonNum.add("checkbox", undefined, n.toString());
        chkIonNums[n-1].preferredSize.width = 40;
    }

    var rowIonSign = pnlIon.add("group");
    rowIonSign.orientation = "row";
    rowIonSign.alignChildren = "left";
    var chkIonPlus = rowIonSign.add("checkbox", undefined, "+");
    var chkIonMinus = rowIonSign.add("checkbox", undefined, "-");
    chkIonPlus.preferredSize.width = 40;
    chkIonMinus.preferredSize.width = 40;

    btnDeselectIon.onClick = function() {
        for (var n = 0; n < chkIonNums.length; n++) chkIonNums[n].value = false;
        chkIonPlus.value = false;
        chkIonMinus.value = false;
    };

    // --- 실행 버튼 ---
    var btnGenerate = win.add("button", undefined, "첨자 문자 만들기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

    // 2. 핵심 그리기 로직 (일러스트레이터 제어)
    function drawScriptSymbols(fontStyle, textCase, alphabetsArr, subscriptNumbersArr, ionNumbersArr, ionSignsArr) {
        if (app.documents.length === 0) return "에러: 열려있는 문서가 없습니다.";

        var doc = app.activeDocument;
        var layer = doc.activeLayer;
        var centerPoint = doc.activeView.centerPoint;
        var MM = 2.834645669;
        var gap = 5 * MM;

        // 선택된 폰트 이름 결정
        var fontName = (fontStyle === "Roman") ? "BEDFGG+GSMediumB1" : "BEDGOA+GSMediItaC1";
        var targetFont = null;
        try { targetFont = app.textFonts.getByName(fontName); } catch(e) {}

        var startX = centerPoint[0];
        var startY = centerPoint[1];
        var currentY = startY;

        for (var i = 0; i < alphabetsArr.length; i++) {
            var currentX = startX;
            var maxHeight = 0;
            
            // 대소문자 처리
            var charBase = alphabetsArr[i];
            if (textCase === "Upper") {
                charBase = charBase.toUpperCase();
            } else {
                charBase = charBase.toLowerCase();
            }

            for (var j = 0; j < subscriptNumbersArr.length; j++) {
                var numStr = subscriptNumbersArr[j];
                var textItem = layer.textFrames.add();
                
                textItem.contents = charBase + numStr;
                textItem.textRange.characterAttributes.size = 8;
                if (targetFont) {
                    textItem.textRange.characterAttributes.textFont = targetFont;
                }

                // 숫자 부분에만 하첨자(Subscript) 적용
                var charLength = charBase.length;
                for (var k = charLength; k < textItem.contents.length; k++) {
                    textItem.textRange.characters[k].characterAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                }

                textItem.top = currentY;
                textItem.left = currentX;

                // 다음 텍스트 위치 계산을 위한 크기 측정
                var bounds = textItem.geometricBounds;
                var width = bounds[2] - bounds[0];
                var height = bounds[1] - bounds[3];

                if (height > maxHeight) maxHeight = height;
                currentX += width + gap; // 5mm 간격으로 우측 이동
                textItem.selected = true;
            }

            var normalizedIonNumbers = ionNumbersArr.length > 0 ? ionNumbersArr : [""];
            for (var m = 0; m < normalizedIonNumbers.length; m++) {
                for (var s = 0; s < ionSignsArr.length; s++) {
                    var ionNumStr = normalizedIonNumbers[m];
                    var ionNumberText = ionNumStr === "1" ? "" : ionNumStr;
                    var ionSignStr = ionSignsArr[s];
                    var ionTextItem = layer.textFrames.add();

                    ionTextItem.contents = charBase + ionNumberText + ionSignStr;
                    ionTextItem.textRange.characterAttributes.size = 8;
                    if (targetFont) {
                        ionTextItem.textRange.characterAttributes.textFont = targetFont;
                    }

                    var ionCharLength = charBase.length;
                    for (var p = ionCharLength; p < ionTextItem.contents.length; p++) {
                        ionTextItem.textRange.characters[p].characterAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    }

                    ionTextItem.top = currentY;
                    ionTextItem.left = currentX;

                    var ionBounds = ionTextItem.geometricBounds;
                    var ionWidth = ionBounds[2] - ionBounds[0];
                    var ionHeight = ionBounds[1] - ionBounds[3];

                    if (ionHeight > maxHeight) maxHeight = ionHeight;
                    currentX += ionWidth + gap;
                    ionTextItem.selected = true;
                }
            }
            // 한 줄(알파벳 하나) 완성 후 5mm 간격으로 아래로 이동
            currentY -= (maxHeight > 0 ? maxHeight : 14) + gap;
        }
        return "성공";
    }

    // 3. 실행 버튼 클릭 이벤트
    btnGenerate.onClick = function() {
        var selectedAlphas = [];
        for (var i = 0; i < chkAlphas.length; i++) {
            if (chkAlphas[i].value) selectedAlphas.push(alphabets[i]);
        }

        var selectedNums = [];
        for (var j = 0; j < chkNums.length; j++) {
            if (chkNums[j].value) selectedNums.push(j.toString());
        }

        var selectedIonNums = [];
        for (var n = 0; n < chkIonNums.length; n++) {
            if (chkIonNums[n].value) selectedIonNums.push((n + 1).toString());
        }

        var selectedIonSigns = [];
        if (chkIonPlus.value) selectedIonSigns.push("+");
        if (chkIonMinus.value) selectedIonSigns.push("-");

        if (selectedAlphas.length === 0 || (selectedNums.length === 0 && selectedIonSigns.length === 0)) {
            alert("알파벳과 하첨자 숫자 또는 윗첨자 이온 조합을 선택해 주세요.");
            return;
        }

        if (selectedIonNums.length > 0 && selectedIonSigns.length === 0) {
            alert("윗첨자 이온은 숫자와 + 또는 -를 함께 선택해 주세요.");
            return;
        }

        var fontStyle = radItalic.value ? "Italic" : "Roman";
        var textCase = radLower.value ? "Lower" : "Upper";

        // 배열 데이터를 직접 넘겨서 그리기 함수 실행
        drawScriptSymbols(fontStyle, textCase, selectedAlphas, selectedNums, selectedIonNums, selectedIonSigns);
        win.close(); // 생성 후 창 닫기
    };

    win.show();
})();
