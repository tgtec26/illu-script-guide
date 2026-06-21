if (app.selection.length > 0 && app.selection[0].typename === "TextFrame") {
    
    // 1. 폰트의 실제 스크립트용 이름 가져오기
    var fontName = app.selection[0].textRange.characterAttributes.textFont.name;
    
    // 2. 프롬프트 창을 띄워 사용자가 바로 복사(Ctrl+C)할 수 있게 함
    // prompt(메시지, 기본값) 형태이며, 두 번째 인자인 fontName이 자동으로 블록 지정됩니다.
    prompt("아래의 폰트 이름을 복사(Ctrl+C)한 뒤 엔터를 누르세요.", fontName);

} else {
    alert("텍스트 프레임을 선택하고 실행해주세요.");
}