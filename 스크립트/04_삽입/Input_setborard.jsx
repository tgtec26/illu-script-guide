/*
  Illustrator Custom Artboard Generator
  뷰 최적화 수정 버전
*/

#target illustrator

var PREF_KEY = "InputSetBoard/settings";

function main() {
    var saved = readSavedSettings();
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
    dropdown.selection = saved.presetIndex;

    var groupCount = dialog.add("group");
    groupCount.alignChildren = "left";
    groupCount.add("statictext", undefined, "대지 개수:");
    var inputCount = groupCount.add("edittext", undefined, saved.count);
    inputCount.characters = 5;

    var groupGap = dialog.add("group");
    groupGap.alignChildren = "left";
    groupGap.add("statictext", undefined, "대지 간격 (mm):");
    var inputGap = groupGap.add("edittext", undefined, saved.gap);
    inputGap.characters = 5;

    var groupBtns = dialog.add("group");
    groupBtns.alignment = "center";
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var btnOk = groupBtns.add("button", undefined, "생성");
    btnOk.onClick = function() { dialog.close(1); };
    try { dialog.defaultElement = null; } catch (defaultError) {}
    var btnCancel = groupBtns.add("button", undefined, "취소", {name: "cancel"});

    if (dialog.show() == 1) {
        var selectedIndex = dropdown.selection.index;
        var count = parseInt(inputCount.text);
        var gap = parseFloat(inputGap.text);

        if (isNaN(count) || count < 1) {
            alert("개수는 1 이상의 숫자여야 합니다.");
            return;
        }

        saveSettings(selectedIndex, inputCount.text, inputGap.text);

        var width, height, isPixel;
        switch (selectedIndex) {
            case 0: width = 110; height = 60; isPixel = false; break;
            case 1: width = 84; height = 60; isPixel = false; break;
            case 2: width = 1280; height = 720; isPixel = true; break;
        }

        generateArtboards(width, height, isPixel, count, gap);
    }
}

function setGeneralUnits(unitValue) {
    try {
        app.preferences.setIntegerPreference("rulerType", unitValue);
    } catch (e) {}
}

function generateArtboards(w, h, isPixel, count, gapMM) {
    var mmToPt = 2.834645;
    var widthPt = isPixel ? w : w * mmToPt;
    var heightPt = isPixel ? h : h * mmToPt;
    var gapPt = gapMM * mmToPt;

    var colorSpace = isPixel ? DocumentColorSpace.RGB : DocumentColorSpace.CMYK;
    var preset = new DocumentPreset();
    preset.colorMode = colorSpace;
    preset.units = isPixel ? RulerUnits.Pixels : RulerUnits.Millimeters;
    preset.width = widthPt;
    preset.height = heightPt;
    preset.numArtboards = 1;
    preset.title = "대지 생성기";

    var startupPreset = (app.startupPresetsList && app.startupPresetsList.length > 0) ? app.startupPresetsList[0] : "Print";
    var doc = app.documents.addDocument(startupPreset, preset, false);

    if (isPixel) {
        setGeneralUnits(6); // pixels
    } else {
        setGeneralUnits(1); // millimeters
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

function saveSettings(presetIndex, count, gap) {
    try {
        app.preferences.setStringPreference(PREF_KEY, ["v1", presetIndex, count, gap].join("|"));
    } catch (e) {}
}

function readSavedSettings() {
    var settings = {presetIndex: 0, count: "1", gap: "20"};
    var raw = "";
    try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return settings; }
    if (!raw) return settings;
    var p = raw.split("|");
    if (p[0] !== "v1" || p.length < 4) return settings;
    var index = parseInt(p[1], 10);
    if (index >= 0 && index <= 2) settings.presetIndex = index;
    var count = parseInt(p[2], 10);
    if (!isNaN(count) && count >= 1) settings.count = String(count);
    var gap = parseFloat(p[3]);
    if (!isNaN(gap)) settings.gap = String(gap);
    return settings;
}
