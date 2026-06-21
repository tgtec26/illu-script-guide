/*
  Illustrator Script: Toggle Gray (Fill <-> Stroke) - Pure K Fixed
  Description: 낮은 농도에서 CMY가 섞이는 문제를 방지하기 위해 GrayColor 객체를 사용합니다.
*/

(function() {
    // 1. 문서 및 선택 확인
    if (app.documents.length === 0) return;
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length === 0) {
        alert("대상을 선택해주세요.");
        return;
    }

    // 2. UI 생성
    var win = new Window("dialog", "음영(K) 적용");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.spacing = 15;
    win.margins = 20;

    // [패널 1] K값 선택
    var panelK = win.add("panel", undefined, "농도(K) 선택");
    panelK.orientation = "column";
    panelK.alignChildren = "left";
    panelK.margins = 20;

    var radios = [];

    // 라디오 버튼 생성 (10K ~ 50K)
    var row1 = panelK.add("group");
    row1.orientation = "row";
    for (var i = 10; i <= 50; i += 10) {
        radios.push(row1.add("radiobutton", undefined, i + "K"));
    }

    // 라디오 버튼 생성 (60K ~ 100K)
    var row2 = panelK.add("group");
    row2.orientation = "row";
    for (var j = 60; j <= 100; j += 10) {
        radios.push(row2.add("radiobutton", undefined, j + "K"));
    }

    // 라디오 버튼 그룹화 로직 (하나만 선택되도록)
    for (var k = 0; k < radios.length; k++) {
        radios[k].onClick = function() {
            for (var m = 0; m < radios.length; m++) {
                if (radios[m] !== this) radios[m].value = false;
            }
        }
    }

    // 기본값 설정 (50K)
    radios[4].value = true;

    // [패널 2] 적용 대상 선택
    var panelTarget = win.add("panel", undefined, "적용 대상");
    panelTarget.orientation = "row";
    panelTarget.alignChildren = "center";
    panelTarget.margins = 20;
    
    var chkFill = panelTarget.add("checkbox", undefined, "면 (Fill)");
    var chkStroke = panelTarget.add("checkbox", undefined, "선 (Stroke)");
    
    chkFill.value = true; 
    chkStroke.value = false;

    chkFill.onClick = function() { chkStroke.value = !this.value; }
    chkStroke.onClick = function() { chkFill.value = !this.value; }

    // [버튼]
    var btnGroup = win.add("group");
    btnGroup.alignment = "center";
    var btnOK = btnGroup.add("button", undefined, "적용", {name: "ok"});
    var btnCancel = btnGroup.add("button", undefined, "취소", {name: "cancel"});

    // 3. 실행 로직
    if (win.show() == 1) {
        var selectedK = 50; 
        for (var x = 0; x < radios.length; x++) {
            if (radios[x].value === true) {
                selectedK = parseInt(radios[x].text);
                break; 
            }
        }
        applyKColor(selectedK, chkFill.value, chkStroke.value);
    }

    // 4. 색상 적용 함수 (수정됨: 순수 K 보정)
    function applyKColor(kValue, doFill, doStroke) {
        var targetColor;

        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            // [핵심 수정] 낮은 K값에서 CMY가 섞이는 것을 막기 위해 GrayColor 사용
            // CMYK 문서에서 GrayColor를 쓰면 자동으로 K 채널에만 값이 들어갑니다.
            targetColor = new GrayColor();
            targetColor.gray = kValue; 
        } else {
            // RGB 모드
            var grayVal = 255 * (1 - (kValue / 100));
            targetColor = new RGBColor();
            targetColor.red = grayVal;
            targetColor.green = grayVal;
            targetColor.blue = grayVal;
        }

        for (var i = 0; i < sel.length; i++) {
            processItem(sel[i], targetColor, doFill, doStroke);
        }
    }

    // 5. 객체 처리
    function processItem(item, color, doFill, doStroke) {
        if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pageItems.length; j++) {
                processItem(item.pageItems[j], color, doFill, doStroke);
            }
            return;
        }
        if (item.typename === "TextFrame") {
            if (doFill) item.textRange.fillColor = color;
            if (doStroke) item.textRange.strokeColor = color;
            return;
        }
        if (item.typename === "CompoundPathItem") {
            for (var k = 0; k < item.pathItems.length; k++) {
                applyToPath(item.pathItems[k], color, doFill, doStroke);
            }
            return;
        }
        if (item.typename === "PathItem") {
            applyToPath(item, color, doFill, doStroke);
        }
    }

    function applyToPath(pathItem, color, doFill, doStroke) {
        if (doFill) {
            pathItem.filled = true;
            pathItem.fillColor = color;
        }
        if (doStroke) {
            pathItem.stroked = true;
            pathItem.strokeColor = color;
        }
    }

})();