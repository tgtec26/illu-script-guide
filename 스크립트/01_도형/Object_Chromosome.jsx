// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_Chromosome.jsx
  기능: 핵형 분석 설명용 염색체 모형을 최대 4개까지 한 번에 그린다.
    - 암(arm)은 중심절 쪽이 좁고 끝으로 갈수록 두꺼워지는 둥근 끝의 닫힌 경로 하나.
    - 염색 분체 2개면 암 4개가 좌우 대칭(X자), 1개면 p암·q암 2개가 한 축 위에 놓인다.
    - 염색체마다 길이·두께·중심절 위치와 지름·벌림 각도·p/q암 휨·내부 음영을 따로 정한다(탭).
    - 중심절은 흰 원, 외곽선은 모두 0.3pt.
  사용법: 실행하면 선택 개체의 중심(없으면 아트보드 중심)에 가로로 나란히 놓인다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    var doc = app.activeDocument;
    if (doc.activeLayer.locked || !doc.activeLayer.visible) {
        alert("현재 레이어가 잠겨 있거나 숨겨져 있습니다.\n편집할 수 있는 레이어를 선택한 뒤 실행해주세요.");
        return;
    }

    var MM_TO_PT = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var CHROMOSOME_COUNT = 4;
    var POSITION_LIMIT_MM = 100;
    var ARM_SAMPLES = 6;           // 암 한쪽 가장자리의 앵커 수(끝 반원 제외)
    var PREF_KEY = "ObjectChromosome/settings";
    var PREVIEW_NAME = "Chromosome Preview";
    // 저장 문자열의 숫자 필드 순서 (RANGES와 같은 키)
    var FIELD_ORDER = ["lengthMm", "widthMm", "basePct", "taper", "centromerePct", "centromereDiaMm", "spreadDeg", "gapMm", "pBend", "qBend", "gray"];

    // 기준점: 선택 개체 중심, 없으면 아트보드 중심
    var origin = findOrigin();

    var defaults = [
        {on: true,  chromatids: 2, lengthMm: 10, widthMm: 2,   basePct: 15, taper: 1.5, centromerePct: 40, centromereDiaMm: 0.9, spreadDeg: 15, gapMm: 0, pBend: 20,  qBend: 20,  gray: 0},
        {on: true,  chromatids: 2, lengthMm: 8,  widthMm: 1.8, basePct: 15, taper: 1.5, centromerePct: 35, centromereDiaMm: 0.8, spreadDeg: 15, gapMm: 0, pBend: 20,  qBend: 20,  gray: 30},
        {on: false, chromatids: 1, lengthMm: 10, widthMm: 2,   basePct: 15, taper: 1.5, centromerePct: 40, centromereDiaMm: 0.9, spreadDeg: 15, gapMm: 0, pBend: 15,  qBend: 15,  gray: 80},
        {on: false, chromatids: 1, lengthMm: 8,  widthMm: 1.8, basePct: 15, taper: 1.5, centromerePct: 35, centromereDiaMm: 0.8, spreadDeg: 15, gapMm: 0, pBend: 15,  qBend: 15,  gray: 30}
    ];
    var RANGES = {
        lengthMm: [2, 60, 0.5, 1],
        widthMm: [0.5, 15, 0.1, 1],
        basePct: [5, 80, 5, 0],
        taper: [0.5, 4, 0.1, 1],
        centromerePct: [5, 95, 1, 0],
        centromereDiaMm: [0.3, 10, 0.1, 1],
        spreadDeg: [0, 45, 1, 0],
        gapMm: [-3, 3, 0.05, 2],
        pBend: [-90, 90, 1, 0],
        qBend: [-90, 90, 1, 0],
        gray: [0, 100, 5, 0]
    };
    var chromosomes = [];
    for (var d = 0; d < CHROMOSOME_COUNT; d++) chromosomes.push(copyOf(defaults[d]));
    var spacingMm = 6;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var previewSignature = "";

    applySavedSettings();

    var LABEL_WIDTH = 104;
    var SLIDER_WIDTH = 196;

    var dlg = new Window("dialog", "염색체 모형");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var tabs = dlg.add("tabbedpanel");
    tabs.alignChildren = "fill";
    var tabControls = [];
    for (var t = 0; t < CHROMOSOME_COUNT; t++) tabControls.push(buildTab(tabs, t));
    tabs.selection = 0;

    var layoutPanel = addPanel(dlg, "배치");
    var spacingControls = addValueRow(layoutPanel, "간격", "mm", spacingMm, 0, 120, 0.5, 1);
    var offsetXControls = addValueRow(layoutPanel, "가로 이동", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(layoutPanel, "세로 이동", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(spacingControls,
        function() { return spacingMm; },
        function(value) { spacingMm = value; });
    bindPositionRow(offsetXControls,
        function() { return offsetXmm; },
        function(value) { offsetXmm = value; });
    bindPositionRow(offsetYControls,
        function() { return offsetYmm; },
        function(value) { offsetYmm = value; });

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        if (!anyChromosomeOn()) {
            alert("그릴 염색체를 하나 이상 켜주세요.");
            return;
        }
        saveSettings();
        dlg.close(1);
    };

    cancelButton.onClick = function() {
        dlg.close(0);
    };

    removeLeftoverPreviews();
    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = tryBuildDiagram(2);
        finalGroup.name = "Chromosome";
        doc.selection = null;
        try { finalGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // -------------------------------------------------------
    // 탭 하나 = 염색체 하나의 옵션
    // -------------------------------------------------------
    function buildTab(parent, index) {
        var c = chromosomes[index];
        var tab = parent.add("tab", undefined, "염색체 " + (index + 1));
        tab.orientation = "column";
        tab.alignChildren = "left";
        tab.spacing = 4;
        tab.margins = [10, 10, 10, 8];

        var head = tab.add("group");
        head.alignChildren = ["left", "center"];
        var onCheck = head.add("checkbox", undefined, "그리기");
        onCheck.value = c.on;
        var chromatidLabel = head.add("statictext", undefined, "염색 분체:");
        var chromatidList = head.add("dropdownlist", undefined, ["1개", "2개"]);
        chromatidList.selection = c.chromatids - 1;
        chromatidList.preferredSize.width = 60;
        var gray0 = head.add("button", undefined, "흰색");
        var gray30 = head.add("button", undefined, "30%");
        var gray80 = head.add("button", undefined, "80%");
        gray0.preferredSize.width = 44;
        gray30.preferredSize.width = 44;
        gray80.preferredSize.width = 44;

        var rows = {};
        rows.lengthMm = addValueRow(tab, "전체 길이", "mm", c.lengthMm, 2, 60, 0.5, 1);
        rows.widthMm = addValueRow(tab, "두께", "mm", c.widthMm, 0.5, 15, 0.1, 1);
        rows.basePct = addValueRow(tab, "밑동 두께", "%", c.basePct, 5, 80, 5, 0);
        rows.taper = addValueRow(tab, "부풀기", "", c.taper, 0.5, 4, 0.1, 1);
        rows.taper.input.helpTip = rows.taper.slider.helpTip = "클수록 끝 가까이에서 늦게 부풀어 곤봉형이 됩니다. 1이면 고르게 두꺼워집니다.";
        rows.centromerePct = addValueRow(tab, "중심절 위치", "%", c.centromerePct, 5, 95, 1, 0);
        rows.centromereDiaMm = addValueRow(tab, "중심절 지름", "mm", c.centromereDiaMm, 0.3, 10, 0.1, 1);
        rows.spreadDeg = addValueRow(tab, "벌림 각도", "°", c.spreadDeg, 0, 45, 1, 0);
        rows.gapMm = addValueRow(tab, "분체 거리", "mm", c.gapMm, -3, 3, 0.05, 2);
        rows.gapMm.input.helpTip = rows.gapMm.slider.helpTip = "두 분체 밑동 사이 거리. 0이면 축에서 맞닿고, 음수면 겹치고, 양수면 벌어집니다.";
        rows.pBend = addValueRow(tab, "p암 휨", "°", c.pBend, -90, 90, 1, 0);
        rows.qBend = addValueRow(tab, "q암 휨", "°", c.qBend, -90, 90, 1, 0);
        rows.gray = addValueRow(tab, "음영", "K%", c.gray, 0, 100, 5, 0);
        var note = tab.add("statictext", undefined, "중심절 위치는 위 끝 0%, 아래 끝 100%. 휨 양수는 바깥쪽(분체 1개면 오른쪽)으로 굽습니다.");
        note.preferredSize.width = 420;

        for (var key in rows) {
            if (!rows.hasOwnProperty(key)) continue;
            bindValueRow(rows[key], makeGetter(index, key), makeSetter(index, key));
        }
        onCheck.onClick = function() {
            c.on = onCheck.value;
            updatePreview();
        };
        chromatidList.onChange = function() {
            c.chromatids = chromatidList.selection.index + 1;
            setSpreadEnabled();
            updatePreview();
        };
        function setSpreadEnabled() {
            rows.spreadDeg.input.enabled = (c.chromatids === 2);
            rows.spreadDeg.slider.enabled = (c.chromatids === 2);
            rows.gapMm.input.enabled = (c.chromatids === 2);
            rows.gapMm.slider.enabled = (c.chromatids === 2);
        }
        setSpreadEnabled();
        gray0.onClick = makeGrayPreset(rows.gray, 0);
        gray30.onClick = makeGrayPreset(rows.gray, 30);
        gray80.onClick = makeGrayPreset(rows.gray, 80);
        return {tab: tab, onCheck: onCheck, chromatidList: chromatidList, rows: rows};
    }

    function makeGrayPreset(controls, value) {
        return function() {
            controls.input.text = String(value);
            controls.input.onChange();
        };
    }

    function makeGetter(index, key) {
        return function() { return chromosomes[index][key]; };
    }

    function makeSetter(index, key) {
        return function(value) { chromosomes[index][key] = value; };
    }

    function anyChromosomeOn() {
        for (var i = 0; i < CHROMOSOME_COUNT; i++) if (chromosomes[i].on) return true;
        return false;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        if (!previewEnabled) {
            clearPreview();
            app.redraw();
            return;
        }
        var signature = previewSettingsKey();
        if (previewGroup !== null && signature === previewSignature) return;
        // 새 미리보기를 먼저 만들고 성공했을 때만 이전 것을 지운다.
        // 간헐적인 DOM 오류로 생성이 실패해도 직전 모형이 그대로 남고, 다음 조작에서 다시 시도한다.
        var next = null;
        try {
            next = buildDiagram();
            next.name = PREVIEW_NAME;
        } catch (e) {
            next = null;
        }
        if (next !== null) {
            clearPreview();
            previewGroup = next;
            previewSignature = signature;
        }
        app.redraw();
    }

    function previewSettingsKey() {
        var parts = [spacingMm, offsetXmm, offsetYmm];
        for (var i = 0; i < CHROMOSOME_COUNT; i++) parts.push(serializeChromosome(chromosomes[i]));
        return parts.join("|");
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // 이전 실행이 오류로 중단되며 남긴 미리보기를 정리한다 (이름이 고유해 안전)
    function removeLeftoverPreviews() {
        for (var i = doc.groupItems.length - 1; i >= 0; i--) {
            try {
                if (doc.groupItems[i].name === PREVIEW_NAME) doc.groupItems[i].remove();
            } catch (e) {}
        }
    }

    // 최종 생성도 간헐적인 DOM 오류를 만날 수 있어 redraw로 상태를 정리한 뒤 한 번 더 시도한다
    function tryBuildDiagram(attempts) {
        var lastError = null;
        for (var attempt = 0; attempt < attempts; attempt++) {
            try {
                return buildDiagram();
            } catch (e) {
                lastError = e;
                try { $.sleep(100); app.redraw(); } catch (redrawError) {}
            }
        }
        throw lastError;
    }

    // -------------------------------------------------------
    // 도형 생성
    // -------------------------------------------------------
    function buildDiagram() {
        var group = doc.groupItems.add();
        try {
            drawDiagram(group);
        } catch (e) {
            try { group.remove(); } catch (removeError) {}
            throw e;
        }
        return group;
    }

    // 켜진 염색체를 가로로 나란히 놓는다. 전체 폭의 가운데가 기준점에 온다.
    function drawDiagram(group) {
        var black = makeColor(100);
        var white = makeColor(0);
        var active = [];
        for (var i = 0; i < CHROMOSOME_COUNT; i++) if (chromosomes[i].on) active.push(chromosomes[i]);
        var slots = layoutSlots(active, spacingMm * MM_TO_PT);
        var cx = origin.x + offsetXmm * MM_TO_PT - slots.totalWidth / 2;
        var cy = origin.y + offsetYmm * MM_TO_PT;
        for (var k = 0; k < active.length; k++) {
            var sub = group.groupItems.add();
            drawChromosome(sub, active[k], cx + slots.centers[k], cy, black, white);
        }
    }

    // 염색체마다 자기 폭(암 벌림 포함)만큼 자리를 차지한다
    function layoutSlots(list, spacing) {
        var centers = [];
        var x = 0;
        for (var i = 0; i < list.length; i++) {
            var w = chromosomeWidth(list[i]);
            if (i > 0) x += spacing;
            centers.push(x + w / 2);
            x += w;
        }
        return {centers: centers, totalWidth: x};
    }

    // 암 끝이 벌어지는 가로 폭의 어림값(배치 간격 계산용)
    function chromosomeWidth(c) {
        var w = c.widthMm * MM_TO_PT;
        if (c.chromatids === 1) return w * 1.2;
        var len = c.lengthMm * MM_TO_PT;
        var longest = Math.max(c.centromerePct, 100 - c.centromerePct) / 100 * len;
        return 2 * (longest * Math.sin(c.spreadDeg * Math.PI / 180) + w / 2) + w * 0.2;
    }

    // 중심절 (cx, cy)를 기준으로 p암은 위, q암은 아래로 뻗는다
    function drawChromosome(group, c, cx, cy, black, white) {
        var len = c.lengthMm * MM_TO_PT;
        var w = c.widthMm * MM_TO_PT;
        var dia = c.centromereDiaMm * MM_TO_PT;
        var pLen = len * c.centromerePct / 100;
        var qLen = len - pLen;
        var fill = makeColor(c.gray);
        var spread = c.chromatids === 2 ? c.spreadDeg * Math.PI / 180 : 0;
        var sides = c.chromatids === 2 ? [-1, 1] : [0];
        // 분체 2개면 두 암의 밑동을 축에서 ±(밑동 반폭 + 분체 거리/2)만큼 띄운다.
        // 거리 0이면 안쪽 가장자리가 축 위에서 맞닿고, 음수면 겹치고, 양수면 벌어진다.
        // 밑동은 중심절 원 안에 숨어야 하므로 두 밑동을 합친 폭(1개면 밑동 폭)을 원 지름의 90% 이하로 제한
        var baseRatio = Math.min(c.basePct / 100, 0.9 * dia / w / sides.length);
        var baseOffset = sides.length === 2 ? baseRatio * w / 2 + c.gapMm * MM_TO_PT / 2 : 0;
        // 중심절 원 안에서 암이 시작하도록 원 중심에서 조금 안쪽부터 그린다
        var top = cy + pLen - dia / 2;
        var bottom = cy - qLen + dia / 2;
        for (var s = 0; s < sides.length; s++) {
            var side = sides[s];
            // 휨 양수 = 바깥쪽(분체 1개면 오른쪽). 두 분체는 거울 대칭으로 굽는다.
            // p암: 위로 갈 때 왼쪽 법선은 화면 왼쪽이라 부호를 뒤집는다
            drawArm(group, cx + side * baseOffset, cy, Math.PI / 2 - side * spread, top - cy, w, -c.pBend * (side || 1), baseRatio, c.taper, fill, black);
            // q암: 아래로 갈 때 왼쪽 법선은 화면 오른쪽. 같은 분체는 같은 쪽으로 벌어진다
            drawArm(group, cx + side * baseOffset, cy, -Math.PI / 2 + side * spread, cy - bottom, w, c.qBend * (side || 1), baseRatio, c.taper, fill, black);
        }
        var circle = group.pathItems.ellipse(cy + dia / 2, cx - dia / 2, dia, dia);
        applyOutline(circle, black);
        circle.filled = true;
        circle.fillColor = white;
    }

    // 암 하나: (bx, by)에서 angle 방향으로 armLen만큼 뻗는 굽은 몸통.
    // bendDeg = 암이 밑동에서 끝까지 도는 각도(°). 양수면 진행 방향의 왼쪽으로 굽는다.
    // 밑동 접선이 angle 방향이라 안쪽으로 휘어도 이웃 암과 시작부터 겹치지 않는다.
    function drawArm(group, bx, by, angle, armLen, w, bendDeg, baseRatio, taper, fill, black) {
        if (armLen <= 0.01 || w <= 0.01) return;
        var pts = armOutline(bx, by, angle, armLen, w, bendDeg, baseRatio, taper);
        var path = group.pathItems.add();
        path.setEntirePath(pts.anchors);
        for (var i = 0; i < pts.anchors.length; i++) {
            var pp = path.pathPoints[i];
            pp.leftDirection = pts.lefts[i];
            pp.rightDirection = pts.rights[i];
            pp.pointType = (i === 0 || i === pts.anchors.length - 1) ? PointType.CORNER : PointType.SMOOTH;
        }
        path.closed = true;
        applyOutline(path, black);
        path.filled = true;
        path.fillColor = fill;
    }

    // 굽은 중심선을 따라 폭을 주어 외곽 앵커와 핸들을 만든다.
    // 오른쪽 가장자리를 밑동→끝, 끝 반원, 왼쪽 가장자리를 끝→밑동 순으로 돈다.
    // baseRatio = 밑동 폭 / 최대 두께, taper = 클수록 끝 가까이에서 늦게 부푼다(곤봉형)
    function armOutline(bx, by, angle, armLen, w, bendDeg, baseRatio, taper) {
        var ux = Math.cos(angle), uy = Math.sin(angle);   // 진행 방향
        var tipR = w / 2;
        var bodyLen = armLen - tipR;                        // 끝 반원을 뺀 몸통 길이
        if (bodyLen < w * 0.3) bodyLen = w * 0.3;
        // 중심선: 밑동 접선이 진행 방향이고 끝 접선이 bendDeg만큼 돌아간 대칭 2차 베지어.
        // 다리 길이 d는 곡선 길이가 몸통 길이와 같도록 맞춘다
        var theta = bendDeg * Math.PI / 180;
        var ex = ux * Math.cos(theta) - uy * Math.sin(theta);   // 끝 접선
        var ey = ux * Math.sin(theta) + uy * Math.cos(theta);
        var d = bodyLen / bezierLength(ux, uy, ex, ey);
        var p1x = bx + ux * d, p1y = by + uy * d;
        var p2x = p1x + ex * d, p2y = p1y + ey * d;
        function center(t) {
            var a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
            return [a * bx + b * p1x + c * p2x, a * by + b * p1y + c * p2y];
        }
        function tangent(t) {
            var tx = (1 - t) * ux + t * ex, ty = (1 - t) * uy + t * ey;
            var m = Math.sqrt(tx * tx + ty * ty) || 1;
            return [tx / m, ty / m];
        }
        function halfWidth(t) {
            // 밑동에서 천천히, 끝 가까이에서 빠르게 부풀고 t=1에서 최대 폭·기울기 0이라 반원과 매끈하게 이어진다
            var eased = 0.5 - 0.5 * Math.cos(Math.pow(t, taper) * Math.PI);
            return w / 2 * (baseRatio + (1 - baseRatio) * eased);
        }

        // 가장자리 점: 중심선에서 왼쪽 법선 방향으로 side(±1)·반폭만큼
        function edge(t, side) {
            var c = center(t), tg = tangent(t), h = halfWidth(t);
            return [c[0] - tg[1] * h * side, c[1] + tg[0] * h * side];
        }
        // 가장자리 접선은 폭이 변하는 곳에서 중심선 접선과 다르므로 수치 미분으로 잡는다
        function edgeDir(t, side) {
            var e = 0.001;
            var a = edge(Math.max(0, t - e), side), b = edge(Math.min(1, t + e), side);
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var m = Math.sqrt(dx * dx + dy * dy) || 1;
            return [dx / m, dy / m];
        }

        var right = [], left = [];
        for (var i = 0; i <= ARM_SAMPLES; i++) {
            var t = i / ARM_SAMPLES;
            var dr = edgeDir(t, -1), dl = edgeDir(t, 1);
            right.push({p: edge(t, -1), d: dr});
            left.push({p: edge(t, 1), d: [-dl[0], -dl[1]]});
        }
        // 끝 반원: 끝 중심에서 접선 방향으로 tipR 나간 꼭짓점 하나
        var endC = center(1), endT = tangent(1);
        var tip = {p: [endC[0] + endT[0] * tipR, endC[1] + endT[1] * tipR], d: [-endT[1], endT[0]]};

        var seq = right.concat([tip]);
        for (var j = left.length - 1; j >= 0; j--) seq.push(left[j]);

        var anchors = [], lefts = [], rights = [];
        var K = 0.5522847498;
        for (var k = 0; k < seq.length; k++) {
            var prev = seq[(k - 1 + seq.length) % seq.length].p;
            var next = seq[(k + 1) % seq.length].p;
            var cur = seq[k].p, dir = seq[k].d;
            // 핸들 길이: 이웃 앵커까지 거리의 1/3. 끝 반원(두 사분원)만 원의 K 비율
            var capIn = (k === right.length || k === right.length + 1);     // 앞 구간이 반원
            var capOut = (k === right.length - 1 || k === right.length);    // 뒤 구간이 반원
            var hl = capIn ? K * tipR : dist(prev, cur) / 3;
            var hr = capOut ? K * tipR : dist(cur, next) / 3;
            anchors.push(cur);
            lefts.push([cur[0] - dir[0] * hl, cur[1] - dir[1] * hl]);
            rights.push([cur[0] + dir[0] * hr, cur[1] + dir[1] * hr]);
        }
        // 밑동(첫·마지막 앵커)은 각지게: 중심절 원 안에 들어가므로 핸들을 없앤다
        lefts[0] = anchors[0];
        rights[seq.length - 1] = anchors[seq.length - 1];
        return {anchors: anchors, lefts: lefts, rights: rights};
    }

    function dist(a, b) {
        var dx = a[0] - b[0], dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    // P0 = 0, P1 = u, P2 = u + e 인 2차 베지어(다리 길이 1)의 곡선 길이. 수치 적분.
    function bezierLength(ux, uy, ex, ey) {
        var n = 24, len = 0, px = 0, py = 0;
        for (var i = 1; i <= n; i++) {
            var t = i / n, b = 2 * t * (1 - t), c = t * t;
            var x = (b + c) * ux + c * ex, y = (b + c) * uy + c * ey;
            len += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
            px = x; py = y;
        }
        return len;
    }

    function applyOutline(pathItem, color) {
        pathItem.filled = false;
        pathItem.stroked = true;
        pathItem.strokeColor = color;
        pathItem.strokeWidth = LINE_WIDTH_PT;
        pathItem.strokeCap = StrokeCap.BUTTENDCAP;
        pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        pathItem.strokeDashes = [];
    }

    // GrayColor를 쓰면 개체 색 공간이 그레이스케일이 되어 나중에 색을 바꾸기 어렵다.
    function makeColor(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v;
        rgb.green = v;
        rgb.blue = v;
        return rgb;
    }

    function findOrigin() {
        var sel = doc.selection;
        if (sel && sel.typename !== "TextRange" && sel.length > 0) {
            var b = sel[0].geometricBounds;
            for (var i = 1; i < sel.length; i++) {
                var g = sel[i].geometricBounds;
                b = [Math.min(b[0], g[0]), Math.max(b[1], g[1]), Math.max(b[2], g[2]), Math.min(b[3], g[3])];
            }
            return {x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2};
        }
        var r = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        return {x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2};
    }

    // -------------------------------------------------------
    // 다이얼로그 도우미
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨(단위 병기) · 입력칸 · 스크롤바 를 한 줄에 배치
    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "right";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {
            row: row, input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    // 위치 변경은 도형을 다시 만들지 않고 현재 미리보기 그룹만 이동한다.
    function bindPositionRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var previousX = offsetXmm;
            var previousY = offsetYmm;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (!movePreviewGroup(previewGroup, previousX, previousY, offsetXmm, offsetYmm)) {
                updatePreview();
                return;
            }
            previewSignature = previewSettingsKey();
            if (previewGroup !== null) app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function movePreviewGroup(group, previousXmm, previousYmm, nextXmm, nextYmm) {
        if (group === null) return true;
        var deltaX = (nextXmm - previousXmm) * MM_TO_PT;
        var deltaY = (nextYmm - previousYmm) * MM_TO_PT;
        if (deltaX === 0 && deltaY === 0) return true;
        try {
            group.translate(deltaX, deltaY);
            return true;
        } catch (e) {
            return false;
        }
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(/[^0-9.\-]/g, ""));
        return isNaN(value) ? null : value;
    }

    function clamp(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function roundTo(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        var factor = Math.pow(10, decimals);
        var rounded = Math.round(value * factor) / factor;
        var text = String(rounded);
        if (decimals <= 0) return text;
        var dot = text.indexOf(".");
        if (dot === -1) {
            text += ".";
            dot = text.length - 1;
        }
        while (text.length - dot - 1 < decimals) text += "0";
        return text;
    }

    function copyOf(obj) {
        var out = {};
        for (var key in obj) if (obj.hasOwnProperty(key)) out[key] = obj[key];
        return out;
    }

    // -------------------------------------------------------
    // 옵션 저장
    // -------------------------------------------------------
    function serializeChromosome(c) {
        var parts = [c.on ? 1 : 0, c.chromatids];
        for (var i = 0; i < FIELD_ORDER.length; i++) parts.push(c[FIELD_ORDER[i]]);
        return parts.join(",");
    }

    function saveSettings() {
        var parts = ["v3", spacingMm, offsetXmm, offsetYmm];
        for (var i = 0; i < CHROMOSOME_COUNT; i++) parts.push(serializeChromosome(chromosomes[i]));
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length !== 4 + CHROMOSOME_COUNT) return;
        spacingMm = restoreNumber(p[1], spacingMm, 0, 120);
        offsetXmm = restoreNumber(p[2], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[3], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        for (var i = 0; i < CHROMOSOME_COUNT; i++) {
            var f = p[4 + i].split(",");
            if (f.length !== 2 + FIELD_ORDER.length) continue;
            var c = chromosomes[i];
            c.on = f[0] === "1";
            c.chromatids = f[1] === "1" ? 1 : 2;
            for (var k = 0; k < FIELD_ORDER.length; k++) {
                var key = FIELD_ORDER[k];
                c[key] = restoreNumber(f[2 + k], c[key], RANGES[key][0], RANGES[key][1]);
            }
        }
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
