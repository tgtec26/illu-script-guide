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

        // 삽입 위치 바로 앞 문자에서 크기/기준선 이동 값을 미리 읽어둔다 (커서만 놓은 경우도 지원)
        var refSize = null, refBaseline = null;
        if (insertIndex > 0) {
            var refAttrs = story.characters[insertIndex - 1].characterAttributes;
            refSize = refAttrs.size;
            refBaseline = refAttrs.baselineShift;
        }

        var newChars = story.insertionPoints[insertIndex].characters.add(degreeChar);
        newChars.characterAttributes.textFont = degreeFont;
        if (refSize !== null) {
            newChars.characterAttributes.size = refSize;
            newChars.characterAttributes.baselineShift = refBaseline;
        }
    } catch (e) {
        alert("도 기호 삽입 중 오류가 발생했습니다: " + e.message);
    }
})();
