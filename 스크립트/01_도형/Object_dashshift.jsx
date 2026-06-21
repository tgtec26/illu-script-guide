// 파선 오프셋 미세 조정 스크립트 v2
(function() {
    if (app.activeDocument.selection.length === 0) {
        alert("파선 객체를 선택해주세요.");
        return;
    }
    
    var item = app.activeDocument.selection[0];
    
    if (!item.stroked) {
        alert("선이 있는 객체를 선택해주세요.");
        return;
    }
    
    // 다이얼로그 생성
    var dlg = new Window("dialog", "파선 패턴 이동");
    dlg.alignChildren = "fill";
    
    var infoPanel = dlg.add("panel", undefined, "현재 설정");
    infoPanel.alignChildren = "left";
    
    var currentDashText = infoPanel.add("statictext", undefined, "Dash: -");
    var currentGapText = infoPanel.add("statictext", undefined, "Gap: -");
    var currentOffsetText = infoPanel.add("statictext", undefined, "Offset: 0");
    
    // 현재 값 표시
    updateInfo();
    
    var controlPanel = dlg.add("panel", undefined, "조정");
    controlPanel.alignChildren = "left";
    
    var stepGroup = controlPanel.add("group");
    stepGroup.add("statictext", undefined, "이동 간격:");
    var stepInput = stepGroup.add("edittext", undefined, "0.5");
    stepInput.characters = 8;
    stepGroup.add("statictext", undefined, "pt");
    
    var btnGroup = controlPanel.add("group");
    var btnLeft = btnGroup.add("button", undefined, "◄ 왼쪽");
    var btnRight = btnGroup.add("button", undefined, "오른쪽 ►");
    var btnReset = btnGroup.add("button", undefined, "리셋");
    
    var closeBtn = dlg.add("button", undefined, "닫기");
    
    // 이벤트 핸들러
    btnLeft.onClick = function() {
        var step = parseFloat(stepInput.text) || 0.5;
        item.strokeDashOffset -= step;
        updateInfo();
    };
    
    btnRight.onClick = function() {
        var step = parseFloat(stepInput.text) || 0.5;
        item.strokeDashOffset += step;
        updateInfo();
    };
    
    btnReset.onClick = function() {
        item.strokeDashOffset = 0;
        updateInfo();
    };
    
    closeBtn.onClick = function() {
        dlg.close();
    };
    
    function updateInfo() {
        var dashes = item.strokeDashes;
        if (dashes.length >= 2) {
            currentDashText.text = "Dash: " + dashes[0] + " pt";
            currentGapText.text = "Gap: " + dashes[1] + " pt";
        }
        currentOffsetText.text = "Offset: " + item.strokeDashOffset.toFixed(2) + " pt";
    }
    
    dlg.show();
})();