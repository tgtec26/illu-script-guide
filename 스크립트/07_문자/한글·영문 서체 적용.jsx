// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    // 적용할 서체 이름 설정
    var korFontName = "SpoqaHanSansNeo-Regular";
    var engFontName = "GSMediumB1";
    var fontSize = 8; // 설정하고자 하는 글자 크기
    // "(가)", "(나)"처럼 괄호 안에 한글 한 글자인 항목 기호는 바탕체 10pt (텍스트 삽입.jsx와 같은 규칙)
    var labelFontName = "Batang";
    var labelFontSize = 10;
    // 원문자·로마 숫자도 텍스트 삽입.jsx와 같은 서체·크기로: ㉠ ⓐ ①은 바탕체 9pt (①은 GSMediumB1에 글자가 없다),
    // Ⅰ Ⅱ는 KoPubWorld바탕체 Pro 8pt (이름이 설치마다 달라 후보 이름으로 찾고, 없으면 서체 정보로 찾고, 그래도 없으면 바탕체)
    var circleFontSize = 9;
    var romanFontSize = 8;
    var romanFontCandidates = [
        "KoPubWorld바탕체_Pro", "KoPubWorld Batang Pro", "KoPubWorldBatangPro", "KoPubWorldBatang_Pro",
        "KoPubWorldBatangPM", "KoPubWorldBatangPL", "KoPubWorldBatangPB",
        "KoPubWorldBatangPro-Regular", "KoPubWorldBatangPro-Medium", "KoPubWorldBatangMedium"
    ];

    // 글자 종류: "circle" 원문자(㉠ ⓐ Ⓐ ① ⓪), "roman" 로마 숫자(Ⅰ ⅰ), 그 밖은 null
    function symbolKind(code) {
        if ((code >= 0x3260 && code <= 0x327F) || (code >= 0x24B6 && code <= 0x24E9) ||
            (code >= 0x2460 && code <= 0x2473) || code === 0x24EA) return "circle";
        if (code >= 0x2160 && code <= 0x217F) return "roman";
        return null;
    }

    function findRomanFont() {
        for (var i = 0; i < romanFontCandidates.length; i++) {
            try { return textFonts.getByName(romanFontCandidates[i]); } catch (e) {}
        }
        for (var j = 0; j < textFonts.length; j++) {
            var all = "";
            try { all = (String(textFonts[j].name) + " " + String(textFonts[j].family) + " " + String(textFonts[j].style)).toLowerCase(); } catch (e2) {}
            var koPub = all.indexOf("kopubworld") >= 0 || all.indexOf("kopub") >= 0 || all.indexOf("코펍") >= 0;
            var batang = all.indexOf("batang") >= 0 || all.indexOf("바탕") >= 0;
            if (koPub && batang && (all.indexOf("pro") >= 0 || /kopubworldbatangp[mlb]/.test(all))) return textFonts[j];
        }
        return textFonts.getByName(labelFontName);
    }

    // 괄호 안 한글 한 글자 기호에 속하는 글자 위치를 표시한다. 괄호까지 포함해 세 글자
    function findLabelChars(chars) {
        var text = "";
        for (var i = 0; i < chars.length; i++) text += chars[i].contents;
        var marked = {};
        for (var at = 0; at + 2 < text.length; at++) {
            var inner = text.charCodeAt(at + 1);
            if (text.charAt(at) === "(" && text.charAt(at + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) {
                marked[at] = marked[at + 1] = marked[at + 2] = true;
            }
        }
        return marked;
    }

    function applyToChars(chars) {
        var korFont = textFonts.getByName(korFontName);
        var engFont = textFonts.getByName(engFontName);
        var labelChars = findLabelChars(chars);
        var labelFont = null;
        var romanFont = null;

        for (var i = 0; i < chars.length; i++) {
            var currentChar = chars[i];
            var charStr = currentChar.contents;
            var charCode = charStr.charCodeAt(0);

            if (labelChars[i]) {
                // 바탕체는 항목 기호가 있을 때만 찾는다. 없으면 서체가 없어도 스크립트가 멈추지 않는다
                if (labelFont === null) labelFont = textFonts.getByName(labelFontName);
                currentChar.characterAttributes.size = labelFontSize;
                currentChar.characterAttributes.textFont = labelFont;
                currentChar.characterAttributes.baselineShift = 0;
                continue;
            }

            var kind = symbolKind(charCode);
            if (kind === "circle") {
                if (labelFont === null) labelFont = textFonts.getByName(labelFontName);
                currentChar.characterAttributes.size = circleFontSize;
                currentChar.characterAttributes.textFont = labelFont;
                currentChar.characterAttributes.baselineShift = 0;
                continue;
            }
            if (kind === "roman") {
                if (romanFont === null) romanFont = findRomanFont();
                currentChar.characterAttributes.size = romanFontSize;
                currentChar.characterAttributes.textFont = romanFont;
                currentChar.characterAttributes.baselineShift = 0;
                continue;
            }

            // 판별 조건: 한글 유니코드 범위 OR 공백 문자(" ")
            var isKorean = (charCode >= 0xAC00 && charCode <= 0xD7A3) ||
                           (charCode >= 0x3131 && charCode <= 0x318E);
            var isSpace = (charStr === " " || charCode === 32 || charCode === 160);

            // 공통 적용: 글자 크기를 8pt로 설정
            currentChar.characterAttributes.size = fontSize;

            if (isKorean || isSpace) {
                // 한글이거나 공백이면 Spoqa 서체 적용
                currentChar.characterAttributes.textFont = korFont;
                // 기준선 이동 0pt
                currentChar.characterAttributes.baselineShift = 0;
            } else {
                // 영문, 숫자, 기호는 GSMedium 서체 적용
                currentChar.characterAttributes.textFont = engFont;
                // 기준선 이동 0.5pt 적용
                currentChar.characterAttributes.baselineShift = 0.5;
            }
        }
    }

    var sel = app.selection;
    try {
        if (sel && sel.typename === "TextRange") {
            // 문자 도구로 일부를 드래그한 경우: 선택된 범위의 문자에만 적용
            if (sel.characters.length === 0) { alert("드래그로 문자를 선택하고 실행해주세요."); return; }
            applyToChars(sel.characters);
        } else if (sel && sel.length > 0) {
            // 선택 도구로 텍스트 프레임을 선택한 경우: 선택된 모든 프레임에 적용
            var found = false;
            for (var f = 0; f < sel.length; f++) {
                if (sel[f].typename === "TextFrame") { applyToChars(sel[f].characters); found = true; }
            }
            if (!found) { alert("텍스트 프레임을 선택하고 실행해주세요."); }
        } else {
            alert("텍스트 프레임을 선택하고 실행해주세요.");
        }
    } catch (e) {
        alert("폰트 이름을 찾을 수 없습니다. 정확한 이름을 확인해주세요.\n오류: " + e);
    }
})();
