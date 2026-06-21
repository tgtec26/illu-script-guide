#target illustrator

function drawIsometricBox() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;

    // UI 입력창 생성
    var win = new Window("dialog", "등각 투상도 (Isometric) 상자 생성");
    win.orientation = "column";
    win.alignChildren = ["left", "top"];

    // 입력 패널
    var panel = win.add("panel", undefined, "크기 입력 (mm)");
    panel.orientation = "column";
    panel.alignChildren = ["left", "top"];
    panel.margins = 20;

    var groupW = panel.add("group");
    groupW.add("statictext", undefined, "가로 (Width):");
    var inputW = groupW.add("edittext", undefined, "5");
    inputW.characters = 6;

    var groupD = panel.add("group");
    groupD.add("statictext", undefined, "세로 (Depth):");
    var inputD = groupD.add("edittext", undefined, "5");
    inputD.characters = 6;

    var groupH = panel.add("group");
    groupH.add("statictext", undefined, "높이 (Height):");
    var inputH = groupH.add("edittext", undefined, "5");
    inputH.characters = 6;

    // 버튼 그룹
    var groupBtn = win.add("group");
    groupBtn.alignment = "center";
    var btnOk = groupBtn.add("button", undefined, "그리기", {name: "ok"});
    var btnCancel = groupBtn.add("button", undefined, "취소", {name: "cancel"});

    btnOk.onClick = function() {
        var w = parseFloat(inputW.text);
        var d = parseFloat(inputD.text);
        var h = parseFloat(inputH.text);

        if (isNaN(w) || isNaN(d) || isNaN(h) || w <= 0 || d <= 0 || h <= 0) {
            alert("올바른 양의 숫자를 입력해주세요.");
            return;
        }

        win.close(1);
        createIsometricBox(doc, w, d, h);
    };

    btnCancel.onClick = function() {
        win.close(0);
    };

    win.show();
}

function createIsometricBox(doc, w_mm, d_mm, h_mm) {
    // mm 단위를 pt 단위로 변환
    var mm2pt = 2.834645;
    var W = w_mm * mm2pt;
    var D = d_mm * mm2pt;
    var H = h_mm * mm2pt;

    // 등각 투상도 30도 각도 계산 (라디안)
    var cos30 = Math.cos(30 * Math.PI / 180);
    var sin30 = Math.sin(30 * Math.PI / 180);

    // 현재 활성화된 대지의 중앙 좌표 계산
    var abRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var cx = (abRect[0] + abRect[2]) / 2;
    var cy = (abRect[1] + abRect[3]) / 2;

    // 도형이 화면 중앙에 오도록 시작점(맨 아래 꼭짓점) 조정
    var startX = cx;
    var startY = cy - (H / 2);

    // 7개의 주요 꼭짓점 좌표 계산
    var pBottom = [startX, startY];
    var pRight = [startX + W * cos30, startY + W * sin30];
    var pLeft = [startX - D * cos30, startY + D * sin30];
    var pCenterTop = [startX, startY + H];
    var pTopRight = [startX + W * cos30, startY + H + W * sin30];
    var pTopLeft = [startX - D * cos30, startY + H + D * sin30];
    var pTopBack = [startX + (W - D) * cos30, startY + H + (W + D) * sin30];

    // 그룹 생성
    var group = doc.groupItems.add();
    group.name = "Isometric Box (" + w_mm + "x" + d_mm + "x" + h_mm + "mm)";

    // 오른쪽 면 그리기
    var rightFace = group.pathItems.add();
    rightFace.setEntirePath([pBottom, pRight, pTopRight, pCenterTop]);
    rightFace.closed = true;
    
    // 왼쪽 면 그리기
    var leftFace = group.pathItems.add();
    leftFace.setEntirePath([pBottom, pCenterTop, pTopLeft, pLeft]);
    leftFace.closed = true;

    // 윗면 그리기
    var topFace = group.pathItems.add();
    topFace.setEntirePath([pCenterTop, pTopRight, pTopBack, pTopLeft]);
    topFace.closed = true;

    // 선과 면 스타일 지정
    var colorBlack = new CMYKColor();
    colorBlack.cyan = 0; colorBlack.magenta = 0; colorBlack.yellow = 0; colorBlack.black = 100;

    var colorWhite = new CMYKColor();
    colorWhite.cyan = 0; colorWhite.magenta = 0; colorWhite.yellow = 0; colorWhite.black = 0;

    var faces = [rightFace, leftFace, topFace];
    for (var i = 0; i < faces.length; i++) {
        faces[i].filled = true;
        faces[i].fillColor = colorWhite;
        faces[i].stroked = true;
        faces[i].strokeColor = colorBlack;
        faces[i].strokeWidth = 0.3; 
        faces[i].strokeJoin = StrokeJoin.ROUNDENDJOIN; // 모서리가 깔끔하게 맞물리도록 둥근 조인 사용
    }
}

drawIsometricBox();