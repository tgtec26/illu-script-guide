#target Illustrator

/*
  Text_degree.jsx
  기능: 선택한 숫자(문자) 바로 뒤에 도(°) 기호를 삽입합니다.
  GSMediumB1 서체의 U+02D8 글리프를 사용합니다.
  사용법: 텍스트 편집 모드에서 도(°)를 붙일 숫자를 드래그로 선택한 뒤 실행하세요.
*/

(function () {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    // 텍스트 편집 모드에서는 app.selection이 배열이 아니라 TextRange 객체로 들어온다
    var sel = app.selection;
    if (!sel || sel.typename !== "TextRange") {
        alert("텍스트 편집 모드에서 도(°)를 붙일 숫자를 선택(더블클릭)한 뒤 실행해주세요.");
        return;
    }

    var degreeChar = "˘";
    var fontName = "GSMediumB1";
    var FONT_SIZE_PT = 8;

    var degreeFont;
    try {
        degreeFont = app.textFonts.getByName(fontName);
    } catch (e) {
        alert("폰트를 찾을 수 없습니다: " + fontName);
        return;
    }

    try {
        var story = sel.story;
        var insertIndex = sel.end;

        // 삽입 위치 바로 앞 문자에서 기준선 이동 값을 미리 읽어둔다 (첨자 상태를 그대로 따르기 위함)
        var refBaseline = null;
        if (insertIndex > 0) {
            refBaseline = story.characters[insertIndex - 1].characterAttributes.baselineShift;
        }

        // 선택한 숫자에도 같은 서체와 크기를 적용해 도 기호와 어긋나지 않게 한다
        try {
            sel.characterAttributes.textFont = degreeFont;
            sel.characterAttributes.size = FONT_SIZE_PT;
        } catch (e2) {}

        var newChars = story.insertionPoints[insertIndex].characters.add(degreeChar);
        newChars.characterAttributes.textFont = degreeFont;
        newChars.characterAttributes.size = FONT_SIZE_PT;
        if (refBaseline !== null) {
            newChars.characterAttributes.baselineShift = refBaseline;
        }
    } catch (e) {
        alert("도 기호 삽입 중 오류가 발생했습니다: " + e.message);
    }
})();
