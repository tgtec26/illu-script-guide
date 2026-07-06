if (app.selection.length > 0 && app.selection[0].typename === "TextFrame") {
    var textFrame = app.selection[0];
    var chars = textFrame.characters;
    
    // 적용할 서체 이름 설정
    var korFontName = "SpoqaHanSansNeo-Regular";
    var engFontName = "GSMediumB1";
    var fontSize = 8; // 설정하고자 하는 글자 크기

    try {
        var korFont = textFonts.getByName(korFontName);
        var engFont = textFonts.getByName(engFontName);

        for (var i = 0; i < chars.length; i++) {
            var currentChar = chars[i];
            var charStr = currentChar.contents;
            var charCode = charStr.charCodeAt(0);

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
    } catch (e) {
        alert("폰트 이름을 찾을 수 없습니다. 정확한 이름을 확인해주세요.\n오류: " + e);
    }
} else {
    alert("텍스트 프레임을 선택하고 실행해주세요.");
}
