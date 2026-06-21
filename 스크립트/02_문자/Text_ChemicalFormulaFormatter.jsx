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

    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("텍스트 프레임을 선택해 주세요.");
        return;
    }

    for (var s = 0; s < sel.length; s++) {
        var item = sel[s];
        if (item.typename === "TextFrame") {
            processTextFrame(item);
        } else if (item.typename === "GroupItem") {
            processGroup(item);
        }
    }

    function processGroup(group) {
        for (var i = 0; i < group.pageItems.length; i++) {
            var item = group.pageItems[i];
            if (item.typename === "TextFrame") {
                processTextFrame(item);
            } else if (item.typename === "GroupItem") {
                processGroup(item);
            }
        }
    }

    function processTextFrame(tf) {
        var text = tf.contents;
        var len = text.length;

        if (len === 0) return;

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
