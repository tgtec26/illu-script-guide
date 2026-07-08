#target Illustrator

/*
  Text_NuclideNotation.jsx
  기능: 핵종 표기용 텍스트를 만듭니다.
  예: 23H 입력 -> 왼쪽 위 2, 왼쪽 아래 3, 오른쪽 H
*/

(function () {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var defaults = {
        text: getSelectedText() || "23H",
        fontSize: 8,
        numberScale: 66,
        topBaseline: 4.5,
        bottomBaseline: -1,
        symbolBaseline: 0.5,
        topTracking: -500,
        bottomTracking: 50,
        symbolTracking: 0,
        fontName: "GSMediumB1"
    };

    var options = showDialog(defaults);
    if (!options) {
        return;
    }

    var parsed = parseNuclideText(options.text);
    if (!parsed) {
        alert("입력 형식을 확인해주세요.\n질량수는 원자번호보다 작을 수 없습니다.\n예: 11H, 126C, 12/6C, 23892U");
        return;
    }

    var textFrame = createNuclideText(doc, parsed, options);
    placeInCurrentView(doc, textFrame);

    doc.selection = null;
    textFrame.selected = true;
    app.redraw();

    function showDialog(values) {
        var dialog = new Window("dialog", "핵종 표기 만들기");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.margins = 18;

        var inputGroup = dialog.add("group");
        inputGroup.add("statictext", undefined, "입력");
        var txtInput = inputGroup.add("edittext", undefined, values.text);
        txtInput.characters = 16;

        var hint = dialog.add("statictext", undefined, "예: 126C 또는 12/6C = 위 12, 아래 6, 원소 C");
        hint.graphics.font = ScriptUI.newFont(hint.graphics.font.name, "REGULAR", 11);

        var pnlType = dialog.add("panel", undefined, "문자 설정");
        pnlType.orientation = "column";
        pnlType.alignChildren = ["fill", "top"];
        pnlType.margins = 12;

        var rowFont = pnlType.add("group");
        rowFont.add("statictext", undefined, "폰트");
        var txtFont = rowFont.add("edittext", undefined, values.fontName);
        txtFont.characters = 18;

        var rowSize = pnlType.add("group");
        rowSize.add("statictext", undefined, "기본 크기 pt");
        var txtSize = rowSize.add("edittext", undefined, String(values.fontSize));
        txtSize.characters = 6;
        rowSize.add("statictext", undefined, "숫자 비율 %");
        var txtScale = rowSize.add("edittext", undefined, String(values.numberScale));
        txtScale.characters = 6;

        var pnlBaseline = dialog.add("panel", undefined, "기준선 이동 pt");
        pnlBaseline.orientation = "column";
        pnlBaseline.alignChildren = ["fill", "top"];
        pnlBaseline.margins = 12;

        var rowBaseline = pnlBaseline.add("group");
        rowBaseline.add("statictext", undefined, "위 숫자");
        var txtTopBaseline = rowBaseline.add("edittext", undefined, String(values.topBaseline));
        txtTopBaseline.characters = 5;
        rowBaseline.add("statictext", undefined, "아래 숫자");
        var txtBottomBaseline = rowBaseline.add("edittext", undefined, String(values.bottomBaseline));
        txtBottomBaseline.characters = 5;
        rowBaseline.add("statictext", undefined, "원소");
        var txtSymbolBaseline = rowBaseline.add("edittext", undefined, String(values.symbolBaseline));
        txtSymbolBaseline.characters = 5;

        var pnlTracking = dialog.add("panel", undefined, "자간");
        pnlTracking.orientation = "column";
        pnlTracking.alignChildren = ["fill", "top"];
        pnlTracking.margins = 12;

        var rowTracking = pnlTracking.add("group");
        rowTracking.add("statictext", undefined, "위 숫자");
        var txtTopTracking = rowTracking.add("edittext", undefined, String(values.topTracking));
        txtTopTracking.characters = 6;
        rowTracking.add("statictext", undefined, "아래 숫자");
        var txtBottomTracking = rowTracking.add("edittext", undefined, String(values.bottomTracking));
        txtBottomTracking.characters = 6;
        rowTracking.add("statictext", undefined, "원소");
        var txtSymbolTracking = rowTracking.add("edittext", undefined, String(values.symbolTracking));
        txtSymbolTracking.characters = 6;

        var buttons = dialog.add("group");
        buttons.alignment = "right";
        var btnCancel = buttons.add("button", undefined, "취소", {name: "cancel"});
        var btnOk = buttons.add("button", undefined, "만들기", {name: "ok"});

        btnCancel.onClick = function () {
            dialog.close(0);
        };

        btnOk.onClick = function () {
            dialog.close(1);
        };

        txtInput.active = true;

        if (dialog.show() !== 1) {
            return null;
        }

        return {
            text: txtInput.text,
            fontSize: readNumber(txtSize.text, values.fontSize),
            numberScale: readNumber(txtScale.text, values.numberScale),
            topBaseline: readNumber(txtTopBaseline.text, values.topBaseline),
            bottomBaseline: readNumber(txtBottomBaseline.text, values.bottomBaseline),
            symbolBaseline: readNumber(txtSymbolBaseline.text, values.symbolBaseline),
            topTracking: readNumber(txtTopTracking.text, values.topTracking),
            bottomTracking: readNumber(txtBottomTracking.text, values.bottomTracking),
            symbolTracking: readNumber(txtSymbolTracking.text, values.symbolTracking),
            fontName: txtFont.text || values.fontName
        };
    }

    function parseNuclideText(text) {
        var source = String(text || "").replace(/\s+/g, "");
        var explicitMatch = source.match(/^(\d+)\/(\d+)([A-Za-z][A-Za-z]*)$/);
        if (explicitMatch) {
            return makeParsedNuclide(explicitMatch[1], explicitMatch[2], explicitMatch[3]);
        }

        var match = source.match(/^(\d+)([A-Za-z][A-Za-z]*)$/);
        if (!match) {
            return null;
        }

        var digits = match[1];
        var splitIndex = chooseDigitSplit(digits);
        if (splitIndex < 1) {
            return null;
        }

        return makeParsedNuclide(digits.substring(0, splitIndex), digits.substring(splitIndex), match[2]);
    }

    function chooseDigitSplit(digits) {
        for (var i = 1; i < digits.length; i++) {
            var massNumber = parseInt(digits.substring(0, i), 10);
            var atomicNumber = parseInt(digits.substring(i), 10);

            if (massNumber >= atomicNumber) {
                return i;
            }
        }

        return -1;
    }

    function makeParsedNuclide(massNumber, atomicNumber, symbol) {
        if (parseInt(massNumber, 10) < parseInt(atomicNumber, 10)) {
            return null;
        }

        return {
            massNumber: massNumber,
            atomicNumber: atomicNumber,
            symbol: normalizeSymbol(symbol)
        };
    }

    function normalizeSymbol(symbol) {
        if (symbol.length === 0) {
            return "";
        }

        return symbol.charAt(0).toUpperCase() + symbol.substring(1).toLowerCase();
    }

    function createNuclideText(documentRef, parsed, options) {
        var textFrame = documentRef.textFrames.add();
        textFrame.contents = parsed.massNumber + parsed.atomicNumber + parsed.symbol;

        var attrs = textFrame.textRange.characterAttributes;
        attrs.size = options.fontSize;

        var targetFont = findTextFont(options.fontName);
        if (targetFont) {
            attrs.textFont = targetFont;
        }

        applyTopNumberStyle(textFrame, 0, parsed.massNumber.length, options);
        applyNumberStyle(
            textFrame,
            parsed.massNumber.length,
            parsed.atomicNumber.length,
            options.bottomBaseline,
            options.bottomTracking,
            options
        );
        applySymbolStyle(
            textFrame,
            parsed.massNumber.length + parsed.atomicNumber.length,
            parsed.symbol.length,
            options
        );

        return textFrame;
    }

    function applyTopNumberStyle(textFrame, startIndex, length, options) {
        for (var i = startIndex; i < startIndex + length; i++) {
            var tracking = (i === startIndex + length - 1) ? options.topTracking : 0;
            applyCharacterStyle(textFrame, i, options.topBaseline, tracking, options.numberScale, options);
        }
    }

    function applyNumberStyle(textFrame, startIndex, length, baselineShift, tracking, options) {
        for (var i = startIndex; i < startIndex + length; i++) {
            applyCharacterStyle(textFrame, i, baselineShift, tracking, options.numberScale, options);
        }
    }

    function applySymbolStyle(textFrame, startIndex, length, options) {
        for (var i = startIndex; i < startIndex + length; i++) {
            applyCharacterStyle(textFrame, i, options.symbolBaseline, options.symbolTracking, 100, options);
        }
    }

    function applyCharacterStyle(textFrame, charIndex, baselineShift, tracking, scale, options) {
        var attrs = textFrame.textRange.characters[charIndex].characterAttributes;
        attrs.size = options.fontSize;
        attrs.horizontalScale = scale;
        attrs.verticalScale = scale;
        attrs.baselineShift = baselineShift;
        attrs.tracking = tracking;
    }

    function placeInCurrentView(documentRef, item) {
        var view = getCurrentView(documentRef);
        var center = view.centerPoint;
        item.position = [center[0], center[1]];
    }

    function getSelectedText() {
        try {
            if (doc.selection && doc.selection.length === 1 && doc.selection[0].typename === "TextFrame") {
                return doc.selection[0].contents;
            }
        } catch (e) {}
        return "";
    }

    function getCurrentView(documentRef) {
        try {
            if (documentRef.activeView) {
                return documentRef.activeView;
            }
        } catch (e) {}

        return documentRef.views[0];
    }

    function findTextFont(fontName) {
        try {
            return app.textFonts.getByName(fontName);
        } catch (e1) {}

        try {
            return app.textFonts.getByName("GSMediumB1");
        } catch (e2) {}

        try {
            return app.textFonts[0];
        } catch (e3) {}

        return null;
    }

    function readNumber(value, fallback) {
        var parsed = parseFloat(String(value).replace(",", "."));
        return isNaN(parsed) ? fallback : parsed;
    }
})();
