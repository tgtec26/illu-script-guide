(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }
    var doc = app.activeDocument;
    
    // 현재 보고 있는 화면의 영역 가져오기
    var view = doc.views[0];
    var viewBounds = view.bounds;
    var viewLeft = viewBounds[0];
    var viewRight = viewBounds[2];
    var viewBottom = viewBounds[3];
    var viewCenterX = (viewLeft + viewRight) / 2; // 화면의 가로 중앙
    
    // 다이얼로그 생성
    var dialog = new Window("dialog", "텍스트 삽입 선택");
    dialog.alignChildren = "center";
    
    // 버튼 그룹
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "column";
    buttonGroup.alignChildren = "fill";
    
    var btn1 = buttonGroup.add("button", undefined, "(가), (나), (다), (라)");
    var btn2 = buttonGroup.add("button", undefined, "A, B, C, D");
    var btn3 = buttonGroup.add("button", undefined, "Ⅰ, Ⅱ, Ⅲ, Ⅳ, Ⅴ");
    var btn4 = buttonGroup.add("button", undefined, "㉠, ㉡, ㉢, ㉣, ㉤");
    var btn5 = buttonGroup.add("button", undefined, "ⓐ, ⓑ, ⓒ, ⓓ, ⓔ");
    var btn6 = buttonGroup.add("button", undefined, "1, 2, 3, 4, 5");
    var btn7 = buttonGroup.add("button", undefined, "①, ②, ③, ④, ⑤");
    
    var selectedOption = null;
    
    // 각 버튼 클릭 이벤트
    btn1.onClick = function() {
        selectedOption = 1;
        dialog.close();
    };
    
    btn2.onClick = function() {
        selectedOption = 2;
        dialog.close();
    };
    
    btn3.onClick = function() {
        selectedOption = 3;
        dialog.close();
    };
    
    btn4.onClick = function() {
        selectedOption = 4;
        dialog.close();
    };
    
    btn5.onClick = function() {
        selectedOption = 5;
        dialog.close();
    };
    
    btn6.onClick = function() {
        selectedOption = 6;
        dialog.close();
    };

    btn7.onClick = function() {
        selectedOption = 7;
        dialog.close();
    };
    
    dialog.show();
    
    // 취소한 경우
    if (selectedOption === null) {
        return;
    }
    
    // 선택에 따른 설정
    var contentsArray, fontSize, fontName;
    
    if (selectedOption === 1) {
        contentsArray = ["(가)", "(나)", "(다)", "(라)"];
        fontSize = 10;
        fontName = "Batang";
    } else if (selectedOption === 2) {
        contentsArray = ["A", "B", "C", "D"];
        fontSize = 8;
        fontName = "BEDFGG+GSMediumB1";
    } else if (selectedOption === 3) {
        contentsArray = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"];
        fontSize = 8;
        fontName = "KoPubWorld바탕체_Pro";
    } else if (selectedOption === 4) {
        contentsArray = ["㉠", "㉡", "㉢", "㉣", "㉤"];
        fontSize = 9;
        fontName = "Batang";
    } else if (selectedOption === 5) {
        contentsArray = ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ"];
        fontSize = 9;
        fontName = "Batang";
    } else if (selectedOption === 6) {
        contentsArray = ["1", "2", "3", "4", "5"];
        fontSize = 8;
        fontName = "BEDFGG+GSMediumB1";
    } else if (selectedOption === 7) {
        contentsArray = ["①", "②", "③", "④", "⑤"];
        fontSize = 8;
        fontName = "BEDFGG+GSMediumB1";
    }
    
    var horizontalGap = 5; // 가로 간격
    var bottomMargin = 20; // 화면 하단에서 띄울 간격
    
    var targetFont;
    try {
        targetFont = app.textFonts.getByName(fontName);
    } catch (e) {
        try {
            targetFont = app.textFonts.getByName("Batang");
        } catch (e2) {
            targetFont = app.textFonts[0];
            alert("지정된 폰트를 찾을 수 없어 기본 폰트로 실행합니다.");
        }
    }
    
    // 먼저 모든 텍스트 프레임을 생성하여 전체 너비와 최대 높이 계산
    var textFrames = [];
    var totalWidth = 0;
    var maxHeight = 0;
    
    for (var i = 0; i < contentsArray.length; i++) {
        var tf = doc.textFrames.add();
        tf.contents = contentsArray[i];
        tf.textRange.characterAttributes.size = fontSize;
        try {
            tf.textRange.characterAttributes.textFont = targetFont;
        } catch(err) {}
        textFrames.push(tf);
        
        totalWidth += tf.width;
        if (i < contentsArray.length - 1) {
            totalWidth += horizontalGap;
        }
        if (tf.height > maxHeight) {
            maxHeight = tf.height;
        }
    }
    
    // 현재 보이는 화면의 6시 방향에 가로로 배치
    var currentX = viewCenterX - (totalWidth / 2);
    var baselineY = viewBottom + bottomMargin + maxHeight;
    
    for (var i = 0; i < textFrames.length; i++) {
        textFrames[i].position = [currentX, baselineY];
        currentX += textFrames[i].width + horizontalGap;
    }
    
    doc.selection = null;
    
    app.redraw();
    doc.activate();
    
    view.zoom = view.zoom;
})();
