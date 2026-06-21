// 만 5세 연산 워크시트 통합 생성 스크립트 (라디오버튼 UI & 다중 페이지 지원)
// 1: 스파이더 연산 (v2)
// 2: 더하기/빼기 박스 (v3)
// 3: 세 수 더하기 트리 (v6 라이브 텍스트)
// 4: 기본 곱하기 가로셈 (v8 폰트 호환성 수정)

(function () {
    // ================================================
    // 0. 사용자 입력 (통합 UI 창 생성 - 라디오 버튼 적용)
    // ================================================
    var win = new Window("dialog", "학습지 자동 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 20;
    win.spacing = 15;

    // --- 1. 양식 선택 패널 ---
    var panelType = win.add("panel", undefined, "1. 학습지 종류 선택");
    panelType.orientation = "column";
    panelType.alignChildren = ["left", "top"];
    panelType.margins = 15;
    panelType.spacing = 10;

    var typeRadios = [];
    typeRadios.push(panelType.add("radiobutton", undefined, "1. 스파이더 연산"));
    typeRadios.push(panelType.add("radiobutton", undefined, "2. 더하기/빼기 박스"));
    typeRadios.push(panelType.add("radiobutton", undefined, "3. 세 수 더하기 트리"));
    typeRadios.push(panelType.add("radiobutton", undefined, "4. 기본 곱하기 (가로셈)"));
    typeRadios[0].value = true; // 기본값: 첫 번째 항목 선택

    // --- 2. 수량 선택 패널 ---
    var panelQty = win.add("panel", undefined, "2. 생성할 장수 선택");
    panelQty.orientation = "column";
    panelQty.alignChildren = ["left", "top"];
    panelQty.margins = 15;
    panelQty.spacing = 8;

    var row1 = panelQty.add("group"); row1.spacing = 20;
    var row2 = panelQty.add("group"); row2.spacing = 20;
    var row3 = panelQty.add("group"); row3.spacing = 20;

    var qtyRadios = [];
    for (var i = 1; i <= 9; i++) {
        var targetRow = (i <= 3) ? row1 : ((i <= 6) ? row2 : row3);
        var rb = targetRow.add("radiobutton", undefined, i + "장");
        qtyRadios.push(rb);

        rb.onClick = function() {
            for (var j = 0; j < qtyRadios.length; j++) {
                if (qtyRadios[j] !== this) qtyRadios[j].value = false;
            }
        };
    }
    qtyRadios[0].value = true;

    // --- 3. 버튼 그룹 ---
    var grpBtn = win.add("group");
    grpBtn.alignment = ["center", "top"];
    grpBtn.spacing = 20;
    var btnOk = grpBtn.add("button", undefined, "만들기", {name: "ok"});
    var btnCancel = grpBtn.add("button", undefined, "취소", {name: "cancel"});

    if (win.show() !== 1) {
        return; 
    }

    // --- 4. 선택된 값 추출 ---
    var sheetType = 1;
    for (var t = 0; t < typeRadios.length; t++) {
        if (typeRadios[t].value) {
            sheetType = t + 1;
            break;
        }
    }

    var totalPages = 1;
    for (var q = 0; q < qtyRadios.length; q++) {
        if (qtyRadios[q].value) {
            totalPages = q + 1;
            break;
        }
    }


    // ================================================
    // 1. 공통 설정 변수
    // ================================================
    var FONT_NAME = "BMJUA";
    var A4_W = 595.28;
    var A4_H = 841.89;
    var COLS = 2;
    var mm = 2.834645669;
    var ARTBOARD_GAP_MM = 20;

    var HEADER_HEIGHT_MM = 35; 
    var HEADER_LINE_STROKE = 1.5;
    var DATE_BOX_SIZE = 18;
    var DATE_TEXT_GAP = 3;
    var DATE_GROUP_GAP = 10;
    var RIGHT_MARGIN_MM = 10;
    var DATE_FONT_SIZE = 20;
    var DATE_BOX_TOP_MM = 14;

    var headerH = HEADER_HEIGHT_MM * mm;
    var dateBoxS = DATE_BOX_SIZE * mm;
    var dateGapS = DATE_TEXT_GAP * mm;
    var dateGroupGapS = DATE_GROUP_GAP * mm;
    var rightMargin = RIGHT_MARGIN_MM * mm;
    var artboardGap = ARTBOARD_GAP_MM * mm;

    // [양식 1: 스파이더 연산]
    var S1_CENTER_DIA = 20 * mm;
    var S1_OUTER_DIA  = 15 * mm;
    var S1_OFFSET     = 18 * mm;
    var S1_SW         = 2;
    var S1_LW         = 1.5;
    var S1_FS_CENTER  = 30;
    var S1_FS_OUTER   = 24;

    // [양식 2: 더하기/빼기 박스]
    var S2_BOX_SIZE = 16 * mm;
    var S2_LINE_H   = 12 * mm;
    var S2_GAP      = 12 * mm;
    var S2_CR       = 2 * mm;
    var S2_BOX_SW   = 2;
    var S2_LINE_SW  = 0.8;
    var S2_FS       = 30;

    // [양식 3: 세 수 더하기 트리]
    var S3_BOX_W    = 18 * mm;
    var S3_BOX_H    = 14 * mm;
    var S3_CR       = 2 * mm;
    var S3_LINE_GAP = 0.5 * mm;
    var S3_VLEN     = 4 * mm;
    var S3_GAP_FB   = (0.5 + 4 + 4) * mm; 
    var S3_GAP_BB   = (4 + 4) * mm;
    var S3_FS_NUM   = 24;
    var S3_FS_CIR   = 18;
    var S3_LW       = 0.8;
    var S3_BOX_SW   = 2;
    var circleNums  = ["\u2460","\u2461","\u2462","\u2463","\u2464","\u2465","\u2466","\u2467"];

    // [양식 4: 기본 곱하기]
    var S4_FS_NUM   = 32;
    var S4_BOX_W    = 22 * mm;
    var S4_BOX_H    = 16 * mm;
    var S4_CR       = 2 * mm;
    var S4_GAP      = 3 * mm;

    // ================================================
    // 2. 초기화 및 색상 설정
    // ================================================
    var doc = app.documents.add(DocumentColorSpace.CMYK, A4_W, A4_H);
    var layer = doc.activeLayer;

    function makeCMYK(c, m, y, k) {
        var color = new CMYKColor();
        color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
        return color;
    }
    var K100  = makeCMYK(0, 0, 0, 100);
    var K60   = makeCMYK(0, 0, 0, 60);
    var K50   = makeCMYK(0, 0, 0, 50);
    var white = makeCMYK(0, 0, 0, 0);

    // ================================================
    // 3. 공통 유틸리티 함수 (버그 수정: NaN 방지 안전장치)
    // ================================================
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function drawLine(x1, y1, x2, y2, sw, color) {
        var line = layer.pathItems.add();
        line.setEntirePath([[x1, y1], [x2, y2]]);
        line.stroked = true; line.strokeWidth = sw;
        line.strokeColor = color || K100;
        line.filled = false;
        return line;
    }

    function drawBox(x, y, w, h, r, sw, sc) {
        var rect = layer.pathItems.roundedRectangle(y, x, w, h, r, r);
        rect.stroked = true; rect.strokeWidth = sw; rect.strokeColor = sc;
        rect.filled = true; rect.fillColor = white;
        return rect;
    }

    function applyFont(tr, fs, color) {
        tr.characterAttributes.size = fs;
        tr.characterAttributes.fillColor = color || K100;
        try { tr.characterAttributes.textFont = app.textFonts.getByName(FONT_NAME); } catch (e) {}
    }

    function placeNumber_Outline(cx, cy, num, size, color) {
        var tf = layer.textFrames.pointText([0, 0]);
        tf.contents = String(num);
        applyFont(tf.textRange, size, color);
        var outline = tf.createOutline();
        try {
            var gb = outline.geometricBounds;
            var curCX = (gb[0] + gb[2]) / 2;
            var curCY = (gb[1] + gb[3]) / 2;
            outline.translate(cx - curCX, cy - curCY);
        } catch(e) {}
        return outline;
    }

    function textW(str, fs) {
        var w = fs * 0.6; 
        try {
            var tf = layer.textFrames.pointText([0, 0]);
            tf.contents = str; applyFont(tf.textRange, fs, K100);
            var ol = tf.createOutline(); 
            var calcW = ol.geometricBounds[2] - ol.geometricBounds[0]; 
            ol.remove();
            if (!isNaN(calcW) && calcW > 0) w = calcW;
        } catch(e) {}
        return w;
    }

    function textH(str, fs) {
        var h = fs; 
        try {
            var tf = layer.textFrames.pointText([0, 0]);
            tf.contents = str; applyFont(tf.textRange, fs, K100);
            var ol = tf.createOutline(); 
            var calcH = ol.geometricBounds[1] - ol.geometricBounds[3]; 
            ol.remove();
            if (!isNaN(calcH) && calcH > 0) h = calcH;
        } catch(e) {}
        return h;
    }

    function placeLiveText(lx, cy, str, fs, color) {
        var olCY = fs / 3; 
        try {
            var tf0 = layer.textFrames.pointText([0, 0]);
            tf0.contents = str; applyFont(tf0.textRange, fs, color);
            var ol0 = tf0.createOutline();
            var calcCY = (ol0.geometricBounds[1] + ol0.geometricBounds[3]) / 2;
            ol0.remove();
            if (!isNaN(calcCY)) olCY = calcCY;
        } catch(e) {}

        var baseline = cy - olCY;
        var tf = layer.textFrames.pointText([lx, baseline]);
        tf.contents = str; applyFont(tf.textRange, fs, color);
        return tf;
    }

    // ================================================
    // 4. 헤더 생성 함수
    // ================================================
    function createHeader(offsetX) {
        var headerY = A4_H - headerH;
        drawLine(offsetX, headerY, offsetX + A4_W, headerY, HEADER_LINE_STROKE, K60);

        var aiFile = new File("C:/Users/choij/Desktop/지호.ai");
        if (aiFile.exists) {
            var placed = layer.placedItems.add();
            placed.file = aiFile;
            placed.left = offsetX + (10 * mm);
            placed.top  = A4_H - (3.25 * mm);
        }

        var dateTopY = A4_H - (DATE_BOX_TOP_MM * mm);
        var baseY    = dateTopY - dateBoxS / 2;
        var dateCR   = 2 * mm;
        var startX   = offsetX + A4_W - rightMargin;

        var dw = textW("일", DATE_FONT_SIZE);
        var dTx = startX - dw;
        placeLiveText(dTx, baseY, "일", DATE_FONT_SIZE, K100);
        drawBox(dTx - dateGapS - dateBoxS, baseY + dateBoxS / 2, dateBoxS, dateBoxS, dateCR, 2, K50);

        var cx2 = dTx - dateGapS - dateBoxS - dateGroupGapS;
        var mw  = textW("월", DATE_FONT_SIZE);
        var mTx = cx2 - mw + 3 * mm;
        placeLiveText(mTx, baseY, "월", DATE_FONT_SIZE, K100);
        drawBox(mTx - dateGapS - dateBoxS, baseY + dateBoxS / 2, dateBoxS, dateBoxS, dateCR, 2, K50);
    }

    // ================================================
    // 5. 각 학습지 생성 로직
    // ================================================
    function createItem_Spider(cx, cy) {
        var grp = layer.groupItems.add();
        var centerNum = randomInt(15, 20);
        var leftTopNum = randomInt(1, 10);
        var leftBtmNum;
        do { leftBtmNum = randomInt(1, 10); } while (leftBtmNum === leftTopNum);

        var posLT = [cx - S1_OFFSET, cy + S1_OFFSET];
        var posLB = [cx - S1_OFFSET, cy - S1_OFFSET];
        var posRT = [cx + S1_OFFSET, cy + S1_OFFSET];
        var posRB = [cx + S1_OFFSET, cy - S1_OFFSET];

        function drawSpiderCircle(x, y, d) {
            var c = grp.pathItems.ellipse(y + d/2, x - d/2, d, d);
            c.stroked = true; c.strokeWidth = S1_SW; c.strokeColor = K60;
            c.filled = true; c.fillColor = white;
        }
        function drawSpiderLine(x1, y1, x2, y2) {
            var l = grp.pathItems.add();
            l.setEntirePath([[x1, y1], [x2, y2]]);
            l.stroked = true; l.strokeWidth = S1_LW; l.strokeColor = K100;
            l.move(grp, ElementPlacement.PLACEATEND);
        }

        drawSpiderLine(cx, cy, posLT[0], posLT[1]);
        drawSpiderLine(cx, cy, posLB[0], posLB[1]);
        drawSpiderLine(cx, cy, posRT[0], posRT[1]);
        drawSpiderLine(cx, cy, posRB[0], posRB[1]);

        drawSpiderCircle(cx, cy, S1_CENTER_DIA);
        drawSpiderCircle(posLT[0], posLT[1], S1_OUTER_DIA);
        drawSpiderCircle(posLB[0], posLB[1], S1_OUTER_DIA);
        drawSpiderCircle(posRT[0], posRT[1], S1_OUTER_DIA);
        drawSpiderCircle(posRB[0], posRB[1], S1_OUTER_DIA);

        placeNumber_Outline(cx, cy, centerNum, S1_FS_CENTER, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeNumber_Outline(posLT[0], posLT[1], leftTopNum, S1_FS_OUTER, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeNumber_Outline(posLB[0], posLB[1], leftBtmNum, S1_FS_OUTER, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
    }

    function createItem_Box(centerX, centerY) {
        var grp = layer.groupItems.add();
        var topNum = randomInt(6, 9);
        var a, b;
        do { a = randomInt(1, 5); b = randomInt(1, 5); } while (a + b > topNum);

        var totalW = S2_BOX_SIZE * 3 + S2_GAP * 2;
        var totalH = S2_BOX_SIZE + S2_LINE_H + S2_BOX_SIZE;
        var originX = centerX - totalW / 2;
        var originTopY = centerY + totalH / 2;

        var box1X = originX;
        var box2X = originX + S2_BOX_SIZE + S2_GAP;
        var box3X = originX + S2_BOX_SIZE * 2 + S2_GAP * 2;
        var topBoxY = originTopY;
        var bottomBoxY = originTopY - S2_BOX_SIZE - S2_LINE_H;

        var topRectCX = box2X + S2_BOX_SIZE / 2;
        var topRectCY = topBoxY - S2_BOX_SIZE / 2;
        var horizY = topBoxY - S2_BOX_SIZE - S2_LINE_H / 2;

        function gLine(x1, y1, x2, y2) {
            var l = drawLine(x1, y1, x2, y2, S2_LINE_SW, K100);
            l.move(grp, ElementPlacement.PLACEATEND);
        }
        var so = S2_BOX_SW / 2;
        gLine(topRectCX, topBoxY - S2_BOX_SIZE - so, topRectCX, horizY);
        gLine(box1X + S2_BOX_SIZE/2, horizY, box3X + S2_BOX_SIZE/2, horizY);
        gLine(box1X + S2_BOX_SIZE/2, horizY, box1X + S2_BOX_SIZE/2, bottomBoxY + so);
        gLine(box2X + S2_BOX_SIZE/2, horizY, box2X + S2_BOX_SIZE/2, bottomBoxY + so);
        gLine(box3X + S2_BOX_SIZE/2, horizY, box3X + S2_BOX_SIZE/2, bottomBoxY + so);

        drawBox(box2X, topBoxY, S2_BOX_SIZE, S2_BOX_SIZE, S2_CR, S2_BOX_SW, K50).move(grp, ElementPlacement.PLACEATBEGINNING);
        drawBox(box1X, bottomBoxY, S2_BOX_SIZE, S2_BOX_SIZE, S2_CR, S2_BOX_SW, K50).move(grp, ElementPlacement.PLACEATBEGINNING);
        drawBox(box2X, bottomBoxY, S2_BOX_SIZE, S2_BOX_SIZE, S2_CR, S2_BOX_SW, K50).move(grp, ElementPlacement.PLACEATBEGINNING);
        drawBox(box3X, bottomBoxY, S2_BOX_SIZE, S2_BOX_SIZE, S2_CR, S2_BOX_SW, K50).move(grp, ElementPlacement.PLACEATBEGINNING);

        placeNumber_Outline(topRectCX, topRectCY, topNum, S2_FS, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeNumber_Outline(box1X + S2_BOX_SIZE/2, bottomBoxY - S2_BOX_SIZE/2, a, S2_FS, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeNumber_Outline(box2X + S2_BOX_SIZE/2, bottomBoxY - S2_BOX_SIZE/2, b, S2_FS, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
    }

    function createItem_Tree(cellCX, cellCY, idx) {
        var grp = layer.groupItems.add();
        var a = randomInt(1, 9), b = randomInt(1, 9), c = randomInt(1, 9);
        var cg = 2.5 * mm;
        var wA = textW(String(a), S3_FS_NUM), wB = textW(String(b), S3_FS_NUM), wC = textW(String(c), S3_FS_NUM);
        var wPlu = textW("+", S3_FS_NUM), wEq = textW("=", S3_FS_NUM), fH = textH("8", S3_FS_NUM);

        var aCX_r = wA / 2, bCX_r = wA + cg + wPlu + cg + wB / 2, cCX_r = wA + cg + wPlu + cg + wB + cg + wPlu + cg + wC / 2;
        var smallCX_r = (aCX_r + bCX_r) / 2, smallLeft_r = smallCX_r - S3_BOX_W / 2;
        var largeCX_r = (smallCX_r + cCX_r) / 2, largeLeft_r = largeCX_r - S3_BOX_W / 2, largeRt_r = largeCX_r + S3_BOX_W / 2;
        var ansLeft_r = wA + cg + wPlu + cg + wB + cg + wPlu + cg + wC + cg + wEq + cg, ansCX_r = ansLeft_r + S3_BOX_W / 2, ansRt_r = ansLeft_r + S3_BOX_W;

        var originX = cellCX - (Math.max(ansRt_r, largeRt_r) / 2);
        var aCX = originX + aCX_r, bCX = originX + bCX_r, cCX = originX + cCX_r;
        var smallLeft = originX + smallLeft_r, smallCX = originX + smallCX_r;
        var largeLeft = originX + largeLeft_r, largeCX = originX + largeCX_r, largeRtX = originX + largeRt_r;
        var ansLeft = originX + ansLeft_r, ansCX = originX + ansCX_r;

        var totalH = fH + S3_GAP_FB + S3_BOX_H + S3_GAP_BB + S3_BOX_H;
        var formulaCY = cellCY + totalH / 2 - fH / 2, formulaBtm = formulaCY - fH / 2, lineStartY = formulaBtm - S3_LINE_GAP;
        var smallTop = formulaBtm - S3_GAP_FB, smallBtm = smallTop - S3_BOX_H;
        var largeTop = smallBtm - S3_GAP_BB, largeCY = largeTop - S3_BOX_H / 2;
        var ansTop = formulaCY + S3_BOX_H / 2, ansBtm = formulaCY - S3_BOX_H / 2;

        function gLineB(x1, y1, x2, y2) { drawLine(x1, y1, x2, y2, S3_LW, K100).move(grp, ElementPlacement.PLACEATEND); }
        var hY1 = lineStartY - S3_VLEN;
        gLineB(aCX, lineStartY, aCX, hY1); gLineB(bCX, lineStartY, bCX, hY1); gLineB(aCX, hY1, bCX, hY1); gLineB(smallCX, hY1, smallCX, smallTop);

        var hY2 = smallBtm - S3_VLEN, hLeft = Math.min(smallCX, cCX), hRight = Math.max(smallCX, cCX);
        gLineB(smallCX, smallBtm, smallCX, hY2); gLineB(cCX, lineStartY, cCX, hY2); gLineB(hLeft, hY2, hRight, hY2); gLineB(largeCX, hY2, largeCX, largeTop);

        var as = 4, arrowTipY = ansBtm - as * 0.5;
        gLineB(largeRtX, largeCY, ansCX, largeCY); gLineB(ansCX, largeCY, ansCX, arrowTipY - as*2);
        
        var tip = grp.pathItems.add();
        tip.setEntirePath([[ansCX, arrowTipY], [ansCX - as, arrowTipY - as * 2], [ansCX + as, arrowTipY - as * 2]]);
        tip.closed = true; tip.filled = true; tip.fillColor = K100; tip.stroked = false;
        tip.move(grp, ElementPlacement.PLACEATBEGINNING);

        drawBox(ansLeft, ansTop, S3_BOX_W, S3_BOX_H, S3_CR, S3_BOX_SW, K60).move(grp, ElementPlacement.PLACEATBEGINNING);
        drawBox(smallLeft, smallTop, S3_BOX_W, S3_BOX_H, S3_CR, S3_BOX_SW, K60).move(grp, ElementPlacement.PLACEATBEGINNING);
        drawBox(largeLeft, largeTop, S3_BOX_W, S3_BOX_H, S3_CR, S3_BOX_SW, K60).move(grp, ElementPlacement.PLACEATBEGINNING);

        var xP1 = originX + wA + cg, xB = xP1 + wPlu + cg, xP2 = xB + wB + cg, xC = xP2 + wPlu + cg, xEq = xC + wC + cg;
        placeLiveText(originX, formulaCY, String(a), S3_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xP1, formulaCY, "+", S3_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xB, formulaCY, String(b), S3_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xP2, formulaCY, "+", S3_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xC, formulaCY, String(c), S3_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xEq, formulaCY, "=", S3_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        
        var numCY = formulaCY + fH / 2 + textH(circleNums[idx], S3_FS_CIR) / 2 + 1 * mm;
        placeLiveText(originX, numCY, circleNums[idx], S3_FS_CIR, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
    }

    // ================================================
    // 5-4. [양식 4] 기본 곱하기 문제 생성
    // ================================================
    function createItem_Multiply(cellCX, cellCY) {
        var grp = layer.groupItems.add();
        var a = randomInt(1, 9);
        var b = randomInt(1, 9);
        
        var strA = String(a);
        
        // 🚨 폰트(BMJUA)에 특수기호 '×'가 없는 문제 해결을 위해 알파벳 소문자 'x' 사용
        var strMul = "x"; 
        
        var strB = String(b);
        var strEq = "=";

        var wA = textW(strA, S4_FS_NUM);
        var wMul = textW(strMul, S4_FS_NUM);
        var wB = textW(strB, S4_FS_NUM);
        var wEq = textW(strEq, S4_FS_NUM);

        var totalW = wA + S4_GAP + wMul + S4_GAP + wB + S4_GAP + wEq + S4_GAP + S4_BOX_W;
        var startX = cellCX - totalW / 2;

        var xMul = startX + wA + S4_GAP;
        var xB   = xMul + wMul + S4_GAP;
        var xEq  = xB + wB + S4_GAP;
        var xBox = xEq + wEq + S4_GAP;

        placeLiveText(startX, cellCY, strA, S4_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xMul, cellCY, strMul, S4_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xB, cellCY, strB, S4_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);
        placeLiveText(xEq, cellCY, strEq, S4_FS_NUM, K100).move(grp, ElementPlacement.PLACEATBEGINNING);

        var boxTop = cellCY + S4_BOX_H / 2;
        drawBox(xBox, boxTop, S4_BOX_W, S4_BOX_H, S4_CR, 2, K50).move(grp, ElementPlacement.PLACEATBEGINNING);
    }


    // ================================================
    // 6. 메인 실행 루프
    // ================================================
    var contentAreaH = A4_H - headerH;
    var cellW = A4_W / COLS;
    
    var currentRows = (sheetType === 4) ? 10 : 4;
    var cellH = contentAreaH / currentRows;

    for (var p = 0; p < totalPages; p++) {
        var offsetX = p * (A4_W + artboardGap);

        if (p === 0) {
            doc.artboards[0].artboardRect = [offsetX, A4_H, offsetX + A4_W, 0];
        } else {
            doc.artboards.add([offsetX, A4_H, offsetX + A4_W, 0]);
        }

        createHeader(offsetX);

        var idx = 0; 
        for (var row = 0; row < currentRows; row++) {
            for (var col = 0; col < COLS; col++) {
                var cx = offsetX + (col * cellW + cellW / 2);
                var cy = contentAreaH - (row * cellH + cellH / 2);

                if (sheetType === 1) {
                    createItem_Spider(cx, cy);
                } else if (sheetType === 2) {
                    createItem_Box(cx, cy);
                } else if (sheetType === 3) {
                    createItem_Tree(cx, cy, idx);
                } else if (sheetType === 4) {
                    createItem_Multiply(cx, cy);
                }
                idx++;
            }
        }
    }
})();