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

    if (!app.selection.length || app.selection[0].typename !== "TextRange") {
        alert("텍스트 편집 모드에서 도(°)를 붙일 숫자를 선택한 뒤 실행해주세요.");
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
        var range = app.selection[0];
        var refAttrs = range.characterAttributes;
        var insertionPoint = range.story.insertionPoints[range.end];

        var newChars = insertionPoint.characters.add(degreeChar);
        newChars.characterAttributes.textFont = degreeFont;
        newChars.characterAttributes.size = refAttrs.size;
        newChars.characterAttributes.baselineShift = refAttrs.baselineShift;
    } catch (e) {
        alert("도 기호 삽입 중 오류가 발생했습니다: " + e.message);
    }
})();
