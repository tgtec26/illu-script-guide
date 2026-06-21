/*
  Illustrator Custom Artboard Generator
  뷰 최적화 수정 버전
*/

#target illustrator

function main() {
    var dialog = new Window("dialog", "대지 생성기");
    dialog.orientation = "column";
    dialog.alignChildren = "fill";
    dialog.preferredSize.width = 300;

    var groupList = dialog.add("group");
    groupList.orientation = "column";
    groupList.alignChildren = "left";
    groupList.add("statictext", undefined, "대지 종류를 선택하세요:");

    var presetItems = [
        "수능대지 (110mm x 60mm)",
        "내신대지 (84mm x 60mm)",
        "ppt대지 (1280px x 720px)"
    ];
    var dropdown = groupList.add("dropdownlist", undefined, presetItems);
    dropdown.selection = 0; 

    var groupCount = dialog.add("group");
    groupCount.alignChildren = "left";
    groupCount.add("statictext", undefined, "대지 개수:");
    var inputCount = groupCount.add("edittext", undefined, "1");
    inputCount.characters = 5;

    var groupGap = dialog.add("group");
    groupGap.alignChildren = "left";
    groupGap.add("statictext", undefined, "대지 간격 (mm):");
    var inputGap = groupGap.add("edittext", undefined, "20");
    inputGap.characters = 5;

    var groupBtns = dialog.add("group");
    groupBtns.alignment = "center";
    var btnOk = groupBtns.add("button", undefined, "생성", {name: "ok"});
    var btnCancel = groupBtns.add("button", undefined, "취소", {name: "cancel"});

    if (dialog.show() == 1) {
        var selectedIndex = dropdown.selection.index;
        var count = parseInt(inputCount.text);
        var gap = parseFloat(inputGap.text);

        if (isNaN(count) || count < 1) {
            alert("개수는 1 이상의 숫자여야 합니다.");
            return;
        }

        var width, height, isPixel;
        switch (selectedIndex) {
            case 0: width = 110; height = 60; isPixel = false; break;
            case 1: width = 84; height = 60; isPixel = false; break;
            case 2: width = 1280; height = 720; isPixel = true; break;
        }

        generateArtboards(width, height, isPixel, count, gap);
    }
}

function generateArtboards(w, h, isPixel, count, gapMM) {
    var mmToPt = 2.834645;
    var widthPt = isPixel ? w : w * mmToPt;
    var heightPt = isPixel ? h : h * mmToPt;
    var gapPt = gapMM * mmToPt;

    var colorSpace = isPixel ? DocumentColorSpace.RGB : DocumentColorSpace.CMYK;
    var doc = app.documents.add(colorSpace, widthPt, heightPt);

    if (isPixel) {
        doc.rulerUnits = RulerUnits.Pixels;
    } else {
        doc.rulerUnits = RulerUnits.Millimeters;
    }

    var firstArtboard = doc.artboards[0];
    firstArtboard.artboardRect = [0, 0, widthPt, -heightPt];

    for (var i = 1; i < count; i++) {
        var left = i * (widthPt + gapPt);
        var top = 0;
        var right = left + widthPt;
        var bottom = -heightPt;

        doc.artboards.add([left, top, right, bottom]);
    }

    // --- [추가 및 수정 영역] ---
    
    // 1. 첫 번째 대지를 활성화 (인덱스 0)
    doc.artboards.setActiveArtboardIndex(0);

    // 2. 현재 뷰를 모든 대지가 보이도록 맞춤 (Ctrl+0와 유사한 효과)
    // 이 기능은 생성된 모든 대지를 화면 중앙에 꽉 차게 배치합니다.
    app.executeMenuCommand('fitall'); 

    // 만약 첫 번째 대지만 크게 보고 싶다면 위 라인 대신 아래 주석을 해제하세요.
    // app.executeMenuCommand('fitinwindow'); 

    // 화면 갱신
    app.redraw();
}

main();