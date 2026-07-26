/**
 * Chemical Formula Formatter for Adobe Illustrator
 * 
 * 선택한 텍스트에서 화학식 서식을 자동 적용합니다.
 * Illustrator 내장 위첨자/아래첨자 기능(Character 패널) 사용
 * 
 * 규칙:
 *   +, -, − → 윗첨자
 *   +/- 바로 앞 연속 숫자 → 윗첨자 (이온 전하: Ca2+, SO42-)
 *   나머지 숫자 → 아래첨자 (원소 개수: H2O, CO2)
 * 
 * 사용법: 텍스트 프레임을 선택한 후 스크립트 실행
 */

(function () {

    var FONT_NAME = "GSMediumB1";
    var FONT_SIZE_PT = 8;

    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.\n\n서식을 적용할 문서를 먼저 열어 주세요.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert(buildHelpMessage("선택한 개체가 없습니다."));
        return;
    }

    var textFrames = [];
    var outlinedCount = 0;
    collectTextFrames(sel, textFrames);

    if (textFrames.length === 0) {
        alert(buildHelpMessage("선택한 항목에서 편집 가능한 텍스트를 찾지 못했습니다."));
        return;
    }

    var font = getFont(FONT_NAME);
    var processed = 0;

    for (var t = 0; t < textFrames.length; t++) {
        try {
            processTextFrame(textFrames[t], font);
            processed++;
        } catch (e) {
            alert("화학식 서식을 적용하는 중 오류가 발생했습니다.\n\n" +
                "오류 내용: " + e + (e && e.line ? " (줄 " + e.line + ")" : "") + "\n\n" +
                "해당 텍스트가 잠겨 있거나 숨겨져 있지 않은지 확인한 뒤 다시 실행해 주세요.");
            return;
        }
    }

    if (font === null) {
        alert("서식은 적용했지만 " + FONT_NAME + " 서체를 찾지 못해 크기(" + FONT_SIZE_PT + "pt)만 적용했습니다.\n\n" +
            "해당 서체를 설치한 뒤 다시 실행하면 서체까지 적용됩니다.");
    }

    // 문자 도구로 글자를 선택한 상태에서는 doc.selection이 개체 배열이 아니라
    // TextRange라서 selection[i]가 undefined가 된다. 그런 항목은 건너뛴다.
    function collectTextFrames(selection, frames) {
        if (!selection) return;

        var count = 0;
        try { count = selection.length; } catch (e) { return; }

        for (var i = 0; i < count; i++) {
            var item = null;
            try { item = selection[i]; } catch (e2) { item = null; }
            if (!item) continue;

            var typeName = "";
            try { typeName = String(item.typename); } catch (e3) { continue; }

            if (typeName === "TextFrame") {
                frames.push(item);
            } else if (typeName === "GroupItem") {
                collectTextFrames(item.pageItems, frames);
            } else if (typeName === "CompoundPathItem" || typeName === "PathItem") {
                outlinedCount++;
            }
        }
    }

    function buildHelpMessage(reason) {
        var message = "화학식 서식을 적용하지 못했습니다.\n" +
            "원인: " + reason + "\n\n" +
            "이렇게 해 보세요.\n" +
            "1. 문자 도구(T)로 글자를 편집 중이라면 Esc를 눌러 편집을 끝냅니다.\n" +
            "2. 선택 도구(V)로 텍스트 개체 전체를 클릭해 선택합니다.\n" +
            "3. 스크립트를 다시 실행합니다.\n\n" +
            "참고\n" +
            "- 문자 도구로 글자만 드래그한 상태에서는 스크립트가 텍스트를 인식하지 못합니다.\n" +
            "- 잠긴 레이어나 숨긴 개체는 선택되지 않습니다.";

        if (outlinedCount > 0) {
            message += "\n- 선택한 항목 중 " + outlinedCount + "개는 윤곽선(아웃라인)으로 변환된 도형입니다. " +
                "이미 글자가 아니라 도형이므로 서식을 적용할 수 없습니다.";
        }

        return message;
    }

    function getFont(fontName) {
        try {
            return app.textFonts.getByName(fontName);
        } catch (e) {
            return null;
        }
    }

    function processTextFrame(tf, font) {
        var text = tf.contents;
        var len = text.length;

        if (len === 0) return;

        // 첨자를 지정하기 전에 서체와 크기를 텍스트 전체에 먼저 적용한다
        var attributes = tf.textRange.characterAttributes;
        if (font !== null) {
            try { attributes.textFont = font; } catch (e) {}
        }
        try { attributes.size = FONT_SIZE_PT; } catch (e2) {}

        var roles = [];
        for (var i = 0; i < len; i++) {
            roles.push("normal");
        }

        // 1단계: +, -, − 기호 및 그 앞의 숫자 처리
        for (var i = 0; i < len; i++) {
            var ch = text.charAt(i);

            // 기호를 만나면
            if (ch === "+" || ch === "-" || ch === "\u2212") {
                roles[i] = "super"; // 기호 자체는 항상 윗첨자

                var j = i - 1;
                var digitCount = 0;
                
                // 기호 바로 앞의 연속된 숫자 개수를 파악
                while (j >= 0 && isDigit(text.charAt(j))) {
                    digitCount++;
                    j--;
                }

                if (digitCount === 1) {
                    // [케이스 A] 기호 앞에 숫자가 1개인 경우 (예: NH4+, Ca2+)
                    var targetIndex = i - 1;
                    var prefix = text.substring(0, targetIndex); // 숫자 앞까지의 알파벳 문자열

                    // 아래첨자가 되어야 하는 다원자 이온의 앞글자 패턴 (정규식)
                    // 필요에 따라 화학식(예: CH, OH 등)을 파이프(|) 기호로 추가할 수 있습니다.
                    var polyatomicRegex = /(NH|NO|MnO|ClO|IO|BrO|SO|PO|CO|BO)$/;
                    
                    if (polyatomicRegex.test(prefix)) {
                        roles[targetIndex] = "sub";   // 예: NH4+의 4
                    } else {
                        roles[targetIndex] = "super"; // 예: Ca2+의 2, Fe3+의 3
                    }
                } else if (digitCount >= 2) {
                    // [케이스 B] 기호 앞에 숫자가 2개 이상인 경우 (예: SO42-, PO43-)
                    // 맨 마지막 숫자는 전하량이므로 윗첨자, 앞의 숫자들은 원자수이므로 아래첨자
                    roles[i - 1] = "super";
                    for (var k = 2; k <= digitCount; k++) {
                        roles[i - k] = "sub";
                    }
                }
            }
        }

        // 2단계: 기호와 연결되지 않은 나머지 독립적인 숫자는 모두 아래첨자 (예: H2O, CO2)
        for (var i = 0; i < len; i++) {
            if (isDigit(text.charAt(i)) && roles[i] === "normal") {
                roles[i] = "sub";
            }
        }

        // 3단계: 일러스트레이터 텍스트에 서식 최종 적용
        for (var i = 0; i < len; i++) {
            if (roles[i] === "normal") continue;

            try {
                if (roles[i] === "super") {
                    tf.textRange.characters[i].baselinePosition = FontBaselineOption.SUPERSCRIPT;
                } else if (roles[i] === "sub") {
                    tf.textRange.characters[i].baselinePosition = FontBaselineOption.SUBSCRIPT;
                }
            } catch (e) {}
        }
    }

    function isDigit(ch) {
        return ch >= "0" && ch <= "9";
    }

})();
