#include "Object_expand_arrow_helper.jsxinc"
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

// 염색체·세포 분열: 염색체 모형·상동 염색체·감수 분열·세포 주기를 한 창의 탭으로 묶었다.
// 상동 염색체와 감수 분열은 그림이 들어갈 사각형 하나를 선택해야 한다. 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "CellDivision/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeChromosomeEngine(), makeHomologousEngine(), makeMeiosisEngine(), makeCellCycleEngine()];

    var win = new Window("dialog", "염색체·세포 분열");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.spacing = 4;
    win.margins = 12;

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = "fill";
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = tabs.add("tab", undefined, engines[engineIndex].label);
        page.orientation = "column";
        page.alignChildren = "fill";
        page.spacing = 4;
        engines[engineIndex].error = engines[engineIndex].addRows(page);
        if (engines[engineIndex].error) {
            page.enabled = false;
            page.helpTip = engines[engineIndex].error;
        }
    }

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    // 저장된 탭이 선택에 맞지 않으면 선택을 쓰는 탭부터(뒤에서부터) 가능한 탭을 연다
    var tabIndex = 0;
    try {
        var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
        if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
    } catch (tabError) {}
    if (engines[tabIndex].error) {
        for (engineIndex = engines.length - 1; engineIndex >= 0; engineIndex--) {
            if (!engines[engineIndex].error) { tabIndex = engineIndex; break; }
        }
    }
    var engine = engines[tabIndex];
    tabs.selection = tabIndex;

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        if (engines[next].error) {
            tabs.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        engine.clearPreview();
        tabIndex = next;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    };
    previewCheck.onClick = function() { engine.setPreview(previewCheck.value); };
    okButton.onClick = function() {
        if (!engine.commit()) return;
        try { app.preferences.setStringPreference(TAB_PREF_KEY, String(tabIndex)); } catch (saveError) {}
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
    win.onShow = function() { engine.setPreview(previewCheck.value); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    if (result !== 1) engine.clearPreview();
    try { app.redraw(); } catch (redrawError) {}

    // ==== 염색체 모형 ====
    function makeChromosomeEngine() {
        var api = {label: "염색체 모형", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            if (doc.activeLayer.locked || !doc.activeLayer.visible) return "현재 레이어가 잠겨 있거나 숨겨져 있습니다. 편집할 수 있는 레이어를 선택한 뒤 실행해주세요.";

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

            var dlg = page;

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

            bindValueRow(spacingControls,
                function() { return spacingMm; },
                function(value) { spacingMm = value; });
            bindPositionRow(offsetXControls,
                function() { return offsetXmm; },
                function(value) { offsetXmm = value; });
            bindPositionRow(offsetYControls,
                function() { return offsetYmm; },
                function(value) { offsetYmm = value; });

            removeLeftoverPreviews();
            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) {
                previewEnabled = on;
                doc.selection = null;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = clearPreview;
            api.commit = function() {
                if (!anyChromosomeOn()) {
                    alert("그릴 염색체를 하나 이상 켜주세요.");
                    return false;
                }
                saveSettings();
                clearPreview();
                var finalGroup = tryBuildDiagram(2);
                finalGroup.name = "Chromosome";
                doc.selection = null;
                try { finalGroup.selected = true; } catch (selectError) {}
                return true;
            };

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
            return null;
        }
        return api;
    }

    // ==== 상동 염색체 ====
    function makeHomologousEngine() {
        var api = {label: "상동 염색체", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            if (doc.activeLayer.locked || !doc.activeLayer.visible) return "현재 레이어가 잠겨 있거나 숨겨져 있습니다. 편집할 수 있는 레이어를 선택한 뒤 실행해주세요.";

            var sel = doc.selection;
            if (sel.length !== 1 || sel[0].typename !== "PathItem") return "그림이 들어갈 사각형 하나를 선택해주세요. 사각형의 높이가 염색체 전체 길이를, 좌우 폭이 두께와 간격의 초기값을 정합니다.";

            var MM_TO_PT = 2.834645669;
            var LINE_WIDTH_PT = 0.3;
            var CENTROMERE_GRAY = 30;      // 중심절 내부 음영(%)
            var LOCUS_COUNT = 3;
            var POSITION_LIMIT_MM = 100;
            var PREF_KEY = "ObjectHomologousChromosome/settings";
            var PREVIEW_NAME = "Homologous Chromosome Preview";

            var rect = sel[0];
            var bounds = rect.geometricBounds;   // [left, top, right, bottom]
            var rectWasHidden = rect.hidden;
            var rectWidthMm = (bounds[2] - bounds[0]) / MM_TO_PT;

            // 사각형 폭에 대한 기본 비율. 0.33 + 0.28 + 0.33 = 0.94 로 좌우에 약간 여유를 둔다.
            var widthMm = clamp(rectWidthMm * 0.33, 1, 60);
            var spacingMm = clamp(rectWidthMm * 0.28, 0, 120);
            var centromereDiaMm = clamp(widthMm * 0.45, 0.5, 30);
            var centromerePct = 33;
            var locusWidthPt = LINE_WIDTH_PT;
            var lociOn = [true, true, true];
            var lociPct = [17, 60, 85];
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;
            var previewSignature = "";

            applySavedSettings();

            var LABEL_WIDTH = 76;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

            var shapePanel = addPanel(dlg, "염색체");
            var widthControls = addValueRow(shapePanel, "좌우 두께", "mm", widthMm, 1, 60, 0.5, 1);
            var centromerePctControls = addValueRow(shapePanel, "중심절 위치", "%", centromerePct, 5, 95, 1, 0);
            var centromereDiaControls = addValueRow(shapePanel, "중심절 지름", "mm", centromereDiaMm, 0.5, 30, 0.1, 1);
            var shapeNote = shapePanel.add("statictext", undefined, "p암·중심절·q암은 항상 접합니다. 지름을 바꾸면 암이 따라 붙습니다.");
            shapeNote.preferredSize.width = 420;

            var layoutPanel = addPanel(dlg, "배치");
            var spacingControls = addValueRow(layoutPanel, "염색체 간격", "mm", spacingMm, 0, 120, 0.5, 1);
            var offsetXControls = addValueRow(layoutPanel, "가로 이동", "mm", offsetXmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(layoutPanel, "세로 이동", "mm", offsetYmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            var locusPanel = addPanel(dlg, "유전자 좌");
            var locusWidthControls = addValueRow(locusPanel, "선 두께", "pt", locusWidthPt, 0.1, 5, 0.1, 1);
            var locusControls = [];
            for (var i = 0; i < LOCUS_COUNT; i++) {
                locusControls.push(addValueRow(locusPanel, "좌 " + (i + 1), "%", lociPct[i], 0, 100, 0.5, 1, true));
            }
            var locusNote = locusPanel.add("statictext", undefined, "위치는 염색체 위 끝이 0%, 아래 끝이 100%입니다.");
            locusNote.preferredSize.width = 420;

            bindValueRow(widthControls,
                function() { return widthMm; },
                function(value) { widthMm = value; });
            bindValueRow(centromerePctControls,
                function() { return centromerePct; },
                function(value) { centromerePct = value; });
            bindValueRow(centromereDiaControls,
                function() { return centromereDiaMm; },
                function(value) { centromereDiaMm = value; });
            bindValueRow(locusWidthControls,
                function() { return locusWidthPt; },
                function(value) { locusWidthPt = value; });
            bindValueRow(spacingControls,
                function() { return spacingMm; },
                function(value) { spacingMm = value; });
            bindPositionRow(offsetXControls,
                function() { return offsetXmm; },
                function(value) { offsetXmm = value; });
            bindPositionRow(offsetYControls,
                function() { return offsetYmm; },
                function(value) { offsetYmm = value; });
            for (var c = 0; c < locusControls.length; c++) {
                bindValueRow(locusControls[c], makeLocusGetter(c), makeLocusSetter(c));
                bindLocusCheck(locusControls[c], c);
            }

            removeLeftoverPreviews();
            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 사각형을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                rect.hidden = true;
                rect.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                rect.hidden = rectWasHidden;
            };
            api.commit = function() {
                saveSettings();
                clearPreview();
                var finalGroup = tryBuildDiagram(2);
                finalGroup.name = "Homologous Chromosome";
                try { rect.remove(); } catch (removeError) {}
                doc.selection = null;
                try { finalGroup.selected = true; } catch (selectError) {}
                return true;
            };

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
                clearPreview();
                try {
                    previewGroup = buildDiagram();
                    previewGroup.name = PREVIEW_NAME;
                    previewSignature = signature;
                } catch (e) {
                    // 일시적 DOM 오류: 다음 조작에서 다시 그려지므로 경고 없이 넘어간다
                    previewGroup = null;
                }
                app.redraw();
            }

            function previewSettingsKey() {
                return [widthMm, centromerePct, centromereDiaMm, spacingMm, locusWidthPt,
                    offsetXmm, offsetYmm, lociOn.join(","), lociPct.join(",")].join("|");
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

            function drawDiagram(group) {
                var layout = computeLayout();
                var black = makeColor(100);
                var shade = makeColor(CENTROMERE_GRAY);

                for (var i = 0; i < layout.centers.length; i++) {
                    var cx = layout.centers[i];
                    drawArm(group, cx, layout.top, layout.pLen, layout.w, black);
                    drawArm(group, cx, layout.top - layout.pLen - layout.gap, layout.qLen, layout.w, black);
                    drawLoci(group, cx, layout, black);
                    drawCentromere(group, cx, layout, black, shade);
                }
            }

            // 완전히 둥근 사각형(반지름 = 짧은 변의 절반)
            function drawArm(group, centerX, armTop, armLen, w, black) {
                if (armLen <= 0.01 || w <= 0.01) return;
                var radius = Math.min(w, armLen) / 2;
                var arm = group.pathItems.roundedRectangle(armTop, centerX - w / 2, w, armLen, radius, radius, false);
                applyOutline(arm, black);
            }

            function drawCentromere(group, centerX, layout, black, shade) {
                if (layout.centromereDia <= 0.01) return;
                var r = layout.centromereDia / 2;
                var cy = layout.top - layout.pLen - layout.gap / 2;
                var circle = group.pathItems.ellipse(cy + r, centerX - r, r * 2, r * 2);
                applyOutline(circle, black);
                circle.filled = true;
                circle.fillColor = shade;
            }

            // 유전자 좌: 그 높이에서의 염색체 폭만큼 가로선을 긋는다. 중심절 틈에 걸리면 그리지 않는다.
            function drawLoci(group, centerX, layout, black) {
                for (var i = 0; i < LOCUS_COUNT; i++) {
                    if (!lociOn[i]) continue;
                    var y = layout.top - layout.height * lociPct[i] / 100;
                    var half = locusHalfWidth(layout, y);
                    if (half <= 0.05) continue;
                    var line = group.pathItems.add();
                    line.setEntirePath([[centerX - half, y], [centerX + half, y]]);
                    applyOutline(line, black, locusWidthPt);
                }
            }

            // 위 끝을 기준으로 한 배치. 가로·세로 이동값이 이미 반영된 좌표를 돌려준다.
            // 두 암 사이 틈은 중심절 지름과 같게 잡는다. 그래야 암 끝의 반원이 중심절 원에 접한다.
            function computeLayout() {
                var w = widthMm * MM_TO_PT;
                var dia = centromereDiaMm * MM_TO_PT;
                var spacing = spacingMm * MM_TO_PT;
                var height = bounds[1] - bounds[3];
                var centerX = (bounds[0] + bounds[2]) / 2 + offsetXmm * MM_TO_PT;
                var top = bounds[1] + offsetYmm * MM_TO_PT;
                var gap = Math.min(dia, height);
                var armSpan = height - gap;
                var pLen = armSpan * centromerePct / 100;
                return {
                    centers: [centerX - (spacing + w) / 2, centerX + (spacing + w) / 2],
                    top: top,
                    height: height,
                    w: w,
                    gap: gap,
                    pLen: pLen,
                    qLen: armSpan - pLen,
                    centromereDia: dia
                };
            }

            // 두 암 중 y가 속한 쪽의 반폭. 어느 쪽에도 속하지 않으면 0.
            function locusHalfWidth(layout, y) {
                var pHalf = armHalfWidth(layout.top, layout.pLen, layout.w, y);
                if (pHalf > 0) return pHalf;
                return armHalfWidth(layout.top - layout.pLen - layout.gap, layout.qLen, layout.w, y);
            }

            // 완전히 둥근 사각형의 y 높이에서의 반폭
            function armHalfWidth(armTop, armLen, w, y) {
                if (armLen <= 0 || w <= 0) return 0;
                var depth = armTop - y;
                if (depth < 0 || depth > armLen) return 0;
                var radius = Math.min(w, armLen) / 2;
                var straightHalf = w / 2 - radius;
                var offset = 0;                          // 둥근 끝의 중심에서 y까지의 세로 거리
                if (depth < radius) offset = radius - depth;
                else if (depth > armLen - radius) offset = radius - (armLen - depth);
                else return w / 2;
                var inner = radius * radius - offset * offset;
                if (inner <= 0) return 0;
                return straightHalf + Math.sqrt(inner);
            }

            function applyOutline(pathItem, color, width) {
                pathItem.filled = false;
                pathItem.stroked = true;
                pathItem.strokeColor = color;
                pathItem.strokeWidth = (width === undefined) ? LINE_WIDTH_PT : width;
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

            // -------------------------------------------------------
            // 다이얼로그 도우미
            // -------------------------------------------------------
            function makeLocusGetter(index) {
                return function() { return lociPct[index]; };
            }

            function makeLocusSetter(index) {
                return function(value) { lociPct[index] = value; };
            }

            function bindLocusCheck(controls, index) {
                controls.check.value = lociOn[index];
                setLocusEnabled(controls, lociOn[index]);
                controls.check.onClick = function() {
                    lociOn[index] = controls.check.value;
                    setLocusEnabled(controls, lociOn[index]);
                    updatePreview();
                };
            }

            function setLocusEnabled(controls, enabled) {
                controls.input.enabled = enabled;
                controls.slider.enabled = enabled;
            }

            function addPanel(parent, title) {
                var panel = parent.add("panel", undefined, title);
                panel.orientation = "column";
                panel.alignChildren = "left";
                panel.spacing = 4;
                panel.margins = [10, 14, 10, 8];
                return panel;
            }

            // 라벨(또는 체크박스, 단위 병기) · 입력칸 · 스크롤바 를 한 줄에 배치
            function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals, useCheck) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var check = null;
                if (useCheck) {
                    check = row.add("checkbox", undefined, label + (unit ? " (" + unit + "):" : ":"));
                    check.preferredSize.width = LABEL_WIDTH;
                } else {
                    var labelText = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                    labelText.preferredSize.width = LABEL_WIDTH;
                }
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.characters = 6;
                input.justify = "right";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return {
                    row: row, check: check, input: input, slider: slider,
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

            // -------------------------------------------------------
            // 옵션 저장
            // -------------------------------------------------------
            // 크기는 사각형 폭에 대한 비율로 저장한다. 다음번에 다른 크기의 사각형을 써도 영역 안에 들어온다.
            function saveSettings() {
                var parts = ["v2",
                    widthMm / rectWidthMm,
                    spacingMm / rectWidthMm,
                    centromereDiaMm / rectWidthMm,
                    centromerePct,
                    locusWidthPt];
                for (var i = 0; i < LOCUS_COUNT; i++) {
                    parts.push(lociOn[i] ? 1 : 0);
                    parts.push(lociPct[i]);
                }
                parts.push(offsetXmm, offsetYmm);
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v2" || p.length !== 14) return;
                widthMm = restoreRatio(p[1], widthMm, 1, 60);
                spacingMm = restoreRatio(p[2], spacingMm, 0, 120);
                centromereDiaMm = restoreRatio(p[3], centromereDiaMm, 0.5, 30);
                centromerePct = restoreNumber(p[4], centromerePct, 5, 95);
                locusWidthPt = restoreNumber(p[5], locusWidthPt, 0.1, 5);
                for (var i = 0; i < LOCUS_COUNT; i++) {
                    lociOn[i] = p[6 + i * 2] === "1";
                    lociPct[i] = restoreNumber(p[7 + i * 2], lociPct[i], 0, 100);
                }
                offsetXmm = restoreNumber(p[12], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[13], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            }

            function restoreRatio(text, fallback, minimum, maximum) {
                var ratio = parseFloat(text);
                if (isNaN(ratio) || ratio < 0 || ratio > 10) return fallback;
                return clamp(ratio * rectWidthMm, minimum, maximum);
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseFloat(text);
                if (isNaN(value) || value < minimum || value > maximum) return fallback;
                return value;
            }
            return null;
        }
        return api;
    }

    // ==== 감수 분열 ====
    function makeMeiosisEngine() {
        var api = {label: "감수 분열", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            if (doc.activeLayer.locked || !doc.activeLayer.visible) return "현재 레이어가 잠겨 있거나 숨겨져 있습니다. 편집할 수 있는 레이어를 선택한 뒤 실행해주세요.";

            var sel = doc.selection;
            if (sel.length !== 1 || sel[0].typename !== "PathItem") return "그림이 들어갈 사각형 하나를 선택해주세요. 사각형의 좌우 폭이 맨 아래 네 세포의 배치를, 높이가 세로 간격의 초기값을 정합니다.";

            var MM_TO_PT = 2.834645669;
            var CIRCLE_WIDTH_PT = 0.4;
            var ARROW_WIDTH_PT = 0.3;
            var LEVEL_NAMES = ["G1기", "중기 1", "중기 2", "딸세포"];
            var GAP_NAMES = ["G1 → 중기 1", "중기 1 → 중기 2", "중기 2 → 딸세포", "딸세포 → 정자"];
            var POSITION_LIMIT_MM = 200;
            // 정자 꼬리: 아래로 내려가며 좌우로 물결치는 S자. 1.25번 흔들려 끝이 시작과 같은 쪽을 향한다.
            var TAIL_WAVES = 1.25;
            var TAIL_SAMPLES = 24;             // 한쪽 윤곽의 표본 수. 베지어 핸들을 붙이므로 이 정도로 매끈하다
            // 머리는 달걀꼴: 앞(위)이 좁고 뒤(꼬리 쪽)가 넓다. 앞 끝 폭 = (1 - HEAD_TAPER) × 뒤 끝 폭.
            var HEAD_TAPER = 0.35;
            var HEAD_SAMPLES = 24;
            // 화살표 이름은 Illustrator UI 언어를 따른다 (한국어판 기준)
            var ARROW_NAME_KO = "화살표 1";
            var ARROW_NAME_EN = "Arrow 1";
            var PREF_KEY = "ObjectMeiosis/settings";
            var PREVIEW_NAME = "Meiosis Preview";

            var rect = sel[0];
            var bounds = rect.geometricBounds;   // [left, top, right, bottom]
            var rectWasHidden = rect.hidden;
            // 비율 저장·복원의 기준. 0이면 나눗셈이 터지므로 1pt로 받친다.
            var rectWidthPt = Math.max(1, bounds[2] - bounds[0]);
            var rectHeightPt = Math.max(1, bounds[1] - bounds[3]);

            var diametersMm = [10, 10, 7, 5];
            var arrowGapMm = 0.5;
            var arrowScale = 100;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var showSperm = true;
            var headWidthMm = 1.4;
            var headHeightMm = 2;
            var tailLengthMm = 5;
            var tailWidthPt = 0.7;             // 꼬리 시작 두께. 끝은 0으로 가늘어진다
            var waveAmpMm = 0.8;               // 꼬리가 좌우로 흔들리는 폭(중심선 기준 편차)
            var spermRotationDeg = 0;          // 머리 중심 기준 회전. +는 시계 반대 방향
            var previewEnabled = true;
            var previewGroup = null;            // 세포 · 화살표 · 정자로 가는 선
            var previewSignature = "";
            var previewSperm = [];              // 정자 몸통(꼬리 + 머리) 그룹, 딸세포마다 하나
            var previewSpermHeads = [];         // 몸통을 그릴 때 쓴 머리 위치·모양. 옮길 때 기준이 된다
            var previewSpermSignature = "";
            // 간격·위치는 사각형에 대한 비율로 저장한다. 사각형은 이번 그림의 비계이므로
            // mm 값을 그대로 되살리면 엉뚱한 크기로 시작하지만, 비율은 새 사각형에 비례해 따라온다.
            // null이면 저장값이 없어 사각형에서 초기값을 잡는다.
            var gapRatios = null;          // 줄 간격 ÷ 사각형 높이 (4개)
            var daughterStepRatio = null;  // 딸세포 중심 거리 ÷ 사각형 폭
            var offsetXRatio = 0;          // 가로 이동 ÷ 사각형 폭
            var offsetYRatio = 0;          // 세로 이동 ÷ 사각형 높이

            applySavedSettings();

            // 처음에는 맨 위 원의 위 끝과 맨 아래(정자 꼬리 끝 또는 딸세포 아래 끝)가 사각형에 닿게 줄을 나눈다
            var startGapMm = clamp(defaultGapPt(bounds, getRadii()[0], bottomExtentPt(), showSperm ? 4 : 3) / MM_TO_PT, 1, 10);
            var gapsMm = [startGapMm, startGapMm, startGapMm, startGapMm];
            if (gapRatios !== null) {
                for (var gi = 0; gi < gapsMm.length; gi++) {
                    gapsMm[gi] = clamp(roundTo(gapRatios[gi] * rectHeightPt / MM_TO_PT, 0.5), 1, 10);
                }
            }
            var daughterStepMm = clamp(defaultDaughterStepPt(bounds, getRadii()) / MM_TO_PT, 0.5, 10);
            if (daughterStepRatio !== null) {
                daughterStepMm = clamp(roundTo(daughterStepRatio * rectWidthPt / MM_TO_PT, 0.5), 0.5, 10);
            }
            offsetXmm = clamp(roundTo(offsetXRatio * rectWidthPt / MM_TO_PT, 0.1), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            offsetYmm = clamp(roundTo(offsetYRatio * rectHeightPt / MM_TO_PT, 0.1), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);

            // 작업 영역을 덜 가리도록 좁게 잡는다. 단위는 줄마다 쓰지 않고 패널 제목·라벨에 넣는다.
            var LABEL_WIDTH = 92;
            var INPUT_CHARACTERS = 5;          // "-200.0"까지는 스크롤되지만 보통 값은 다 보인다
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

            var gapPanel = addPanel(dlg, "간격 · 위치 (중심 사이, mm)");
            var gapControls = [];
            for (var g = 0; g < GAP_NAMES.length; g++) {
                gapControls.push(addValueRow(gapPanel, GAP_NAMES[g], gapsMm[g], 1, 10, 0.5, 1));
            }
            var daughterStepControls = addValueRow(gapPanel, "딸세포 사이", daughterStepMm, 0.5, 10, 0.5, 1);
            var offsetXControls = addValueRow(gapPanel, "전체 가로 이동", offsetXmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(gapPanel, "전체 세로 이동", offsetYmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            var sizePanel = addPanel(dlg, "세포 지름 (mm)");
            var diameterControls = [];
            for (var i = 0; i < LEVEL_NAMES.length; i++) {
                diameterControls.push(addValueRow(sizePanel, LEVEL_NAMES[i], diametersMm[i], 1, 10, 0.5, 1));
            }

            var arrowPanel = addPanel(dlg, "화살표");
            var arrowGapControls = addValueRow(arrowPanel, "원과의 간격 mm", arrowGapMm, 0, 2, 0.1, 1);
            var arrowScaleControls = addValueRow(arrowPanel, "화살촉 크기 %", arrowScale, 10, 800, 5, 0);

            var spermPanel = addPanel(dlg, "정자 (mm)");
            var spermCheck = spermPanel.add("checkbox", undefined, "정자 그리기");
            spermCheck.value = showSperm;
            var headWidthControls = addValueRow(spermPanel, "머리 폭", headWidthMm, 0.5, 2, 0.1, 1);
            var headHeightControls = addValueRow(spermPanel, "머리 높이", headHeightMm, 0.5, 2, 0.1, 1);
            var tailLengthControls = addValueRow(spermPanel, "꼬리 길이", tailLengthMm, 0.5, 5, 0.1, 1);
            var tailWidthControls = addValueRow(spermPanel, "꼬리 두께 pt", tailWidthPt, 0.1, 2, 0.1, 1);
            var waveAmpControls = addValueRow(spermPanel, "물결 폭", waveAmpMm, 0, 2, 0.1, 1);
            var rotationControls = addValueRow(spermPanel, "회전 °", spermRotationDeg, -180, 180, 1, 0);

            for (var v = 0; v < gapControls.length; v++) {
                bindValueRow(gapControls[v], makeArrayGetter(gapsMm, v), makeArraySetter(gapsMm, v));
            }
            bindValueRow(daughterStepControls,
                function() { return daughterStepMm; },
                function(value) { daughterStepMm = value; });
            bindPositionRow(offsetXControls,
                function() { return offsetXmm; },
                function(value) { offsetXmm = value; });
            bindPositionRow(offsetYControls,
                function() { return offsetYmm; },
                function(value) { offsetYmm = value; });
            for (var b = 0; b < diameterControls.length; b++) {
                bindValueRow(diameterControls[b], makeArrayGetter(diametersMm, b), makeArraySetter(diametersMm, b));
            }
            bindValueRow(arrowGapControls,
                function() { return arrowGapMm; },
                function(value) { arrowGapMm = value; });
            bindValueRow(arrowScaleControls,
                function() { return arrowScale; },
                function(value) { arrowScale = value; });
            bindValueRow(headWidthControls,
                function() { return headWidthMm; },
                function(value) { headWidthMm = value; });
            bindValueRow(headHeightControls,
                function() { return headHeightMm; },
                function(value) { headHeightMm = value; });
            bindValueRow(tailLengthControls,
                function() { return tailLengthMm; },
                function(value) { tailLengthMm = value; });
            bindValueRow(tailWidthControls,
                function() { return tailWidthPt; },
                function(value) { tailWidthPt = value; });
            bindValueRow(waveAmpControls,
                function() { return waveAmpMm; },
                function(value) { waveAmpMm = value; });
            bindValueRow(rotationControls,
                function() { return spermRotationDeg; },
                function(value) { spermRotationDeg = value; });

            spermCheck.onClick = function() {
                showSperm = spermCheck.value;
                updatePreview();
            };

            removeLeftoverPreviews();
            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 사각형을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                rect.hidden = true;
                rect.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                rect.hidden = rectWasHidden;
            };
            api.commit = function() {
                saveSettings();
                clearPreview();
                var finalGroup = tryBuildDiagram(2);
                finalGroup.name = "Meiosis";
                try { rect.remove(); } catch (removeError) {}
                doc.selection = null;
                try { finalGroup.selected = true; } catch (selectError) {}
                return true;
            };

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            // 화살촉은 액션으로만 붙일 수 있어 느리다. 미리보기는 몸통만 그리고 확인을 눌렀을 때 화살촉을 붙인다.
            // 정자 몸통(점 73개 × 속성 4개)이 DOM 비용의 대부분이라 세포·화살표와 따로 둔다.
            // 배치만 바뀌면 몸통은 새 머리 위치로 옮기기만 하고, 꼬리처럼 몸통만 바뀌면 세포·화살표는 그대로 둔다.
            function updatePreview() {
                if (!previewEnabled) {
                    clearPreview();
                    app.redraw();
                    return;
                }
                var layoutKey = layoutSettingsKey();
                var spermKey = spermSettingsKey();
                if (previewGroup !== null && layoutKey === previewSignature && spermKey === previewSpermSignature) return;
                try {
                    if (previewGroup === null || layoutKey !== previewSignature) {
                        var heads = [];
                        var group = buildDiagram(false, heads);
                        removeItem(previewGroup);
                        previewGroup = group;
                        previewGroup.name = PREVIEW_NAME;
                        previewSignature = layoutKey;
                        if (spermKey === previewSpermSignature && previewSperm.length === heads.length) {
                            moveSpermBodies(heads);
                        } else {
                            rebuildSpermBodies(heads);
                        }
                    } else {
                        rebuildSpermBodies(previewSpermHeads);
                    }
                    previewSpermSignature = spermKey;
                } catch (e) {
                    // 일시적 DOM 오류: 다음 조작에서 다시 그려지므로 경고 없이 넘어간다
                    clearPreview();
                }
                app.redraw();
            }

            // 세포·화살표 배치에 드는 값. 머리 모양은 정자로 가는 선의 끝점을 정하므로 여기에도 든다.
            function layoutSettingsKey() {
                return [gapsMm.join(","), daughterStepMm, arrowGapMm, offsetXmm, offsetYmm, diametersMm.join(","),
                    showSperm ? 1 : 0, headWidthMm, headHeightMm, spermRotationDeg].join("|");
            }

            // 정자 몸통 모양에 드는 값
            function spermSettingsKey() {
                return [showSperm ? 1 : 0, headWidthMm, headHeightMm, tailLengthMm, tailWidthPt, waveAmpMm,
                    spermRotationDeg].join("|");
            }

            function rebuildSpermBodies(heads) {
                for (var i = 0; i < previewSperm.length; i++) removeItem(previewSperm[i]);
                previewSperm = [];
                previewSpermHeads = heads;
                var black = makeBlackColor();
                for (var s = 0; s < heads.length; s++) {
                    var body = doc.groupItems.add();
                    body.name = PREVIEW_NAME;
                    previewSperm.push(body);
                    drawSperm(body, heads[s].x, heads[s].y, heads[s].headH, heads[s].headPoints, heads[s].rotation, black);
                }
            }

            function moveSpermBodies(heads) {
                for (var s = 0; s < heads.length; s++) {
                    var deltaX = heads[s].x - previewSpermHeads[s].x;
                    var deltaY = heads[s].y - previewSpermHeads[s].y;
                    if (deltaX !== 0 || deltaY !== 0) previewSperm[s].translate(deltaX, deltaY);
                }
                previewSpermHeads = heads;
            }

            // 위치 이동은 도형을 다시 만들지 않고 현재 미리보기만 옮긴다
            function movePreview(previousXmm, previousYmm, nextXmm, nextYmm) {
                if (previewGroup === null) return true;
                var deltaX = (nextXmm - previousXmm) * MM_TO_PT;
                var deltaY = (nextYmm - previousYmm) * MM_TO_PT;
                if (deltaX === 0 && deltaY === 0) return true;
                try {
                    previewGroup.translate(deltaX, deltaY);
                    for (var s = 0; s < previewSperm.length; s++) {
                        previewSperm[s].translate(deltaX, deltaY);
                        previewSpermHeads[s].x += deltaX;
                        previewSpermHeads[s].y += deltaY;
                    }
                    return true;
                } catch (e) {
                    clearPreview();
                    return false;
                }
            }

            function clearPreview() {
                removeItem(previewGroup);
                previewGroup = null;
                for (var i = 0; i < previewSperm.length; i++) removeItem(previewSperm[i]);
                previewSperm = [];
                previewSpermHeads = [];
            }

            function removeItem(item) {
                if (item === null) return;
                try { item.remove(); } catch (e) {}
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
                        return buildDiagram(true);
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
            // heads를 주면 정자 몸통은 그리지 않고 머리 위치·모양만 heads에 담는다 (미리보기가 따로 그린다)
            function buildDiagram(withArrowheads, heads) {
                var group = doc.groupItems.add();
                try {
                    drawDiagram(group, withArrowheads, heads);
                } catch (e) {
                    try { group.remove(); } catch (removeError) {}
                    throw e;
                }
                return group;
            }

            function drawDiagram(group, withArrowheads, heads) {
                var rows = layoutCells(bounds, getRadii(), toPoints(gapsMm), daughterStepMm * MM_TO_PT,
                    [offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT]);
                var black = makeBlackColor();
                var gapPt = arrowGapMm * MM_TO_PT;
                var arrows = [];

                for (var level = 0; level < rows.length; level++) {
                    for (var i = 0; i < rows[level].length; i++) {
                        var cell = rows[level][i];
                        var circle = group.pathItems.ellipse(cell.y + cell.r, cell.x - cell.r, cell.r * 2, cell.r * 2);
                        applyOutline(circle, black, CIRCLE_WIDTH_PT);
                    }
                }

                for (var parentLevel = 0; parentLevel < rows.length - 1; parentLevel++) {
                    var parents = rows[parentLevel];
                    var children = rows[parentLevel + 1];
                    var perParent = children.length / parents.length;
                    for (var p = 0; p < parents.length; p++) {
                        for (var c = 0; c < perParent; c++) {
                            var segment = arrowSegment(parents[p], children[p * perParent + c], gapPt);
                            if (segment === null) continue;
                            var arrow = group.pathItems.add();
                            arrow.setEntirePath(segment);
                            applyOutline(arrow, black, ARROW_WIDTH_PT);
                            arrows.push(arrow);
                        }
                    }
                }

                if (showSperm) {
                    var daughters = rows[rows.length - 1];
                    var headW = headWidthMm * MM_TO_PT;
                    var headH = headHeightMm * MM_TO_PT;
                    for (var s = 0; s < daughters.length; s++) {
                        var headX = daughters[s].x;
                        var headY = daughters[s].y - gapsMm[3] * MM_TO_PT;
                        // 화살표는 세로로 내려와 머리 윤곽에 닿는다. 회전한 달걀꼴은 원이 아니므로
                        // 중심에서 윤곽까지의 거리를 실제 윤곽에서 재어 화살표 간격이 원과 같게 유지되도록 한다.
                        var rotation = spermRotationDeg * Math.PI / 180;
                        var headPoints = rotatePoints(eggPoints(headX, headY, headW, headH, HEAD_TAPER, HEAD_SAMPLES),
                            headX, headY, rotation);
                        var headReach = verticalReach(headPoints, headX, headY, headH / 2);
                        var spermArrow = arrowSegment(daughters[s], {x: headX, y: headY, r: headReach}, gapPt);
                        if (spermArrow !== null) {
                            var spermLine = group.pathItems.add();
                            spermLine.setEntirePath(spermArrow);
                            applyOutline(spermLine, black, ARROW_WIDTH_PT);
                            arrows.push(spermLine);
                        }
                        if (heads) {
                            heads.push({x: headX, y: headY, headH: headH, headPoints: headPoints, rotation: rotation});
                        } else {
                            drawSperm(group, headX, headY, headH, headPoints, rotation, black);
                        }
                    }
                }

                if (withArrowheads && arrows.length > 0) {
                    applyArrowheads(arrows);
                }
            }

            // 꼬리(면)를 먼저 깔고 머리(흰 면 + 검은 테두리)를 위에 얹어 이음새가 머리 안에 숨는다.
            // 둘 다 머리 중심을 축으로 같은 각도만큼 돌린다.
            // headPoints는 이미 회전된 머리 윤곽(화살표 간격 계산에 먼저 쓰였다)
            function drawSperm(group, cx, cy, headH, headPoints, rotation, black) {
                var tailPoints = spermTailPoints(cx, cy, headH,
                    tailLengthMm * MM_TO_PT, tailWidthPt, waveAmpMm * MM_TO_PT, TAIL_WAVES, TAIL_SAMPLES);
                var tail = buildPathFromPoints(group, rotatePoints(tailPoints, cx, cy, rotation), true);
                tail.stroked = false;
                tail.filled = true;
                tail.fillColor = black;

                var head = buildPathFromPoints(group, headPoints, true);
                applyOutline(head, black, CIRCLE_WIDTH_PT);
                head.filled = true;
                head.fillColor = makeWhiteColor(doc);
            }

            // 중심 (cx, cy)에서 바로 위로 올라가 닫힌 윤곽과 만나는 가장 높은 점까지의 거리.
            // 윤곽의 앵커를 잇는 선분과 x = cx의 교점을 찾는다 (표본이 촘촘해 곡선과의 차이는 무시할 만하다).
            // 교점이 없으면 fallback을 돌려준다.
            function verticalReach(points, cx, cy, fallback) {
                var highest = null;
                var count = points.length;
                for (var i = 0; i < count; i++) {
                    var a = points[i].anchor;
                    var b = points[(i + 1) % count].anchor;
                    if ((a[0] - cx) * (b[0] - cx) > 0) continue;   // 선분이 세로선을 가로지르지 않는다
                    var y;
                    if (a[0] === b[0]) {
                        y = Math.max(a[1], b[1]);
                    } else {
                        y = a[1] + (b[1] - a[1]) * (cx - a[0]) / (b[0] - a[0]);
                    }
                    if (y > cy && (highest === null || y > highest)) highest = y;
                }
                return highest === null ? fallback : highest - cy;
            }

            // 달걀꼴 머리. 타원의 가로 폭을 위로 갈수록 (1 - taper)까지 줄여 앞이 좁고 뒤가 넓다.
            // 가장 넓은 곳은 중심보다 아래(꼬리 쪽)로 내려간다.
            function eggPoints(cx, cy, width, height, taper, samples) {
                var offsets = [];
                var widest = 0;
                for (var i = 0; i < samples; i++) {
                    var angle = Math.PI * 2 * i / samples;
                    var upward = (1 + Math.sin(angle)) / 2;          // 아래 끝 0 → 위 끝 1
                    var squeeze = 1 - taper * upward;
                    var dx = Math.cos(angle) * squeeze;
                    offsets.push([dx, Math.sin(angle)]);
                    if (Math.abs(dx) > widest) widest = Math.abs(dx);
                }
                // 좁힌 만큼 가로를 다시 늘려 가장 넓은 곳이 정확히 '머리 폭'이 되게 한다
                var anchors = [];
                for (var j = 0; j < offsets.length; j++) {
                    anchors.push([cx + offsets[j][0] / widest * width / 2, cy + offsets[j][1] * height / 2]);
                }
                return smoothClosedPoints(anchors, {});
            }

            // 점 목록(anchor · left · right)을 (cx, cy) 기준으로 radians만큼 회전한 새 목록
            function rotatePoints(points, cx, cy, radians) {
                var cosine = Math.cos(radians);
                var sine = Math.sin(radians);
                function turn(point) {
                    var dx = point[0] - cx;
                    var dy = point[1] - cy;
                    return [cx + dx * cosine - dy * sine, cy + dx * sine + dy * cosine];
                }
                var rotated = [];
                for (var i = 0; i < points.length; i++) {
                    rotated.push({
                        anchor: turn(points[i].anchor),
                        left: turn(points[i].left),
                        right: turn(points[i].right),
                        corner: points[i].corner
                    });
                }
                return rotated;
            }

            // 꼬리 윤곽. 중심선은 머리 아래에서 시작해 tailLen만큼 내려가며 좌우로 waves번 물결친다.
            // 두께는 시작 tailW에서 끝 0까지 선형으로 줄어들어 획으로는 낼 수 없는 가늘어지는 꼬리가 된다.
            // 왼쪽 윤곽 → 끝점 → 오른쪽 윤곽(역순)으로 닫힌 면을 만든다. 시작 두 점과 끝점은 모서리.
            function spermTailPoints(cx, cy, headH, tailLen, tailW, waveAmp, waves, samples) {
                var startY = cy - headH / 2;
                var lefts = [];
                var rights = [];
                for (var i = 0; i < samples; i++) {
                    var t = i / samples;
                    var phase = Math.PI * 2 * waves * t;
                    var x = cx + waveAmp * Math.sin(phase);
                    var y = startY - tailLen * t;
                    var dx = waveAmp * Math.PI * 2 * waves * Math.cos(phase);
                    var dy = -tailLen;
                    var length = Math.sqrt(dx * dx + dy * dy);
                    var nx = -dy / length;
                    var ny = dx / length;
                    var half = tailW / 2 * (1 - t);
                    lefts.push([x + nx * half, y + ny * half]);
                    rights.push([x - nx * half, y - ny * half]);
                }
                var tipPhase = Math.PI * 2 * waves;
                var anchors = lefts.concat([[cx + waveAmp * Math.sin(tipPhase), startY - tailLen]]);
                for (var j = rights.length - 1; j >= 0; j--) anchors.push(rights[j]);

                var corners = {};
                corners[0] = true;
                corners[lefts.length] = true;
                corners[anchors.length - 1] = true;
                return smoothClosedPoints(anchors, corners);
            }

            // 표본점을 지나는 매끈한 닫힌 곡선(Catmull-Rom → 베지어 핸들). corners에 든 점은 각지게 둔다.
            function smoothClosedPoints(anchors, corners) {
                var count = anchors.length;
                var points = [];
                for (var i = 0; i < count; i++) {
                    var anchor = anchors[i];
                    if (corners[i]) {
                        points.push({anchor: anchor, left: anchor, right: anchor, corner: true});
                        continue;
                    }
                    var previous = anchors[(i + count - 1) % count];
                    var next = anchors[(i + 1) % count];
                    var tangent = [(next[0] - previous[0]) / 6, (next[1] - previous[1]) / 6];
                    points.push({
                        anchor: anchor,
                        left: [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                        right: [anchor[0] + tangent[0], anchor[1] + tangent[1]],
                        corner: false
                    });
                }
                return points;
            }

            function buildPathFromPoints(group, points, closed) {
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                var path = group.pathItems.add();
                path.setEntirePath(anchors);
                path.closed = closed;
                // anchor는 setEntirePath가 이미 넣었다. 점마다 DOM 쓰기가 비싸 핸들과 종류만 더한다.
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                    point.pointType = points[j].corner ? PointType.CORNER : PointType.SMOOTH;
                }
                return path;
            }

            // 사각형 아래변에 닿아야 하는 맨 아래 끝: 정자를 그리면 꼬리 끝, 아니면 딸세포 아래 끝(중심 기준 거리)
            function bottomExtentPt() {
                if (!showSperm) return getRadii()[3];
                return headHeightMm * MM_TO_PT / 2 + tailLengthMm * MM_TO_PT;
            }

            // 사각형 가로 중심에 맞춘 맨 아랫줄에서 시작해, 위 단계는 딸세포들의 중점에 놓는다.
            // gapsPt는 줄 사이 중심 거리(G1→중기 1, 중기 1→중기 2, 중기 2→딸세포, …). 앞 3개만 쓴다.
            function layoutCells(rectBounds, radii, gapsPt, daughterStepPt, offsetPt) {
                var counts = [1, 1, 2, 4];
                var centerX = (rectBounds[0] + rectBounds[2]) / 2;
                var top = rectBounds[1];
                var bottomCount = counts[counts.length - 1];

                var centersByLevel = [[]];
                for (var i = 0; i < bottomCount; i++) {
                    centersByLevel[0].push(centerX + (i - (bottomCount - 1) / 2) * daughterStepPt);
                }
                for (var level = counts.length - 2; level >= 0; level--) {
                    var children = centersByLevel[0];
                    var parents = [];
                    var perParent = children.length / counts[level];
                    for (var p = 0; p < counts[level]; p++) {
                        var sum = 0;
                        for (var c = 0; c < perParent; c++) sum += children[p * perParent + c];
                        parents.push(sum / perParent);
                    }
                    centersByLevel.unshift(parents);
                }

                var rows = [];
                var y = top - radii[0] + offsetPt[1];
                for (var r = 0; r < counts.length; r++) {
                    if (r > 0) y -= gapsPt[r - 1];
                    var row = [];
                    for (var k = 0; k < centersByLevel[r].length; k++) {
                        row.push({x: centersByLevel[r][k] + offsetPt[0], y: y, r: radii[r]});
                    }
                    rows.push(row);
                }
                return rows;
            }

            // 맨 위 원의 위 끝과 맨 아래 끝(중심에서 bottomExtent 아래)이 사각형에 닿도록 gapCount등분한 간격
            function defaultGapPt(rectBounds, topRadius, bottomExtent, gapCount) {
                var span = rectBounds[1] - topRadius - bottomExtent - rectBounds[3];
                return span / gapCount;
            }

            // 좌우 끝 딸세포가 사각형 좌우변에 닿는 중심 거리
            function defaultDaughterStepPt(rectBounds, radii) {
                return (rectBounds[2] - rectBounds[0] - radii[radii.length - 1] * 2) / 3;
            }

            function toPoints(valuesMm) {
                var points = [];
                for (var i = 0; i < valuesMm.length; i++) points.push(valuesMm[i] * MM_TO_PT);
                return points;
            }

            // 두 원의 중심을 잇는 선 위에서, 양쪽 원 테두리로부터 gapPt만큼 떨어진 구간
            function arrowSegment(parent, child, gapPt) {
                var dx = child.x - parent.x;
                var dy = child.y - parent.y;
                var length = Math.sqrt(dx * dx + dy * dy);
                if (length <= 0) return null;
                var startDistance = parent.r + gapPt;
                var endDistance = length - child.r - gapPt;
                if (endDistance - startDistance <= 0.01) return null;
                return [
                    [parent.x + dx / length * startDistance, parent.y + dy / length * startDistance],
                    [parent.x + dx / length * endDistance, parent.y + dy / length * endDistance]
                ];
            }

            function getRadii() {
                var radii = [];
                for (var i = 0; i < diametersMm.length; i++) radii.push(diametersMm[i] * MM_TO_PT / 2);
                return radii;
            }

            function applyOutline(pathItem, color, width) {
                pathItem.filled = false;
                pathItem.stroked = true;
                pathItem.strokeColor = color;
                pathItem.strokeWidth = width;
                pathItem.strokeCap = StrokeCap.BUTTENDCAP;
                pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                pathItem.strokeDashes = [];
            }

            function makeBlackColor() {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = 100;
                    return cmyk;
                }
                var rgb = new RGBColor();
                rgb.red = 0;
                rgb.green = 0;
                rgb.blue = 0;
                return rgb;
            }

            // -------------------------------------------------------
            // 화살촉
            // -------------------------------------------------------
            // 화살촉은 DOM에 없어 임시 액션으로 적용한다 (AGENTS.md 참고)
            function applyArrowheads(paths) {
                var actionSetName = "Codex_Meiosis";
                var actionName = "MeiosisArrow";
                var actionFile = new File(Folder.temp + "/Codex_MeiosisArrow.aia");
                var locale = getAppLocale();
                var isKorean = locale === "" || locale.indexOf("ko") === 0;
                var arrowName = isKorean ? ARROW_NAME_KO : ARROW_NAME_EN;

                try {
                    doc.selection = null;
                    for (var i = 0; i < paths.length; i++) {
                        paths[i].selected = true;
                    }
                    removeActionSetIfLoaded(actionSetName);
                    writeArrowheadAction(actionFile, actionSetName, actionName, arrowName);
                    app.loadAction(actionFile);
                    app.doScript(actionName, actionSetName);
                } catch (e) {
                    // 화살표 이름은 UI 언어를 따른다. 실패해도 선 자체는 그대로 남는다.
                }

                removeActionSetIfLoaded(actionSetName);
                try { actionFile.remove(); } catch (removeError) {}
                doc.selection = null;
            }

            function writeArrowheadAction(actionFile, actionSetName, actionName, arrowName) {
                var lines = [];
                lines.push("/version 3");
                lines.push("/name [ " + actionSetName.length);
                lines.push("    " + asciiHex(actionSetName));
                lines.push("]");
                lines.push("/isOpen 1");
                lines.push("/actionCount 1");
                lines.push("/action-1 {");
                lines.push("    /name [ " + actionName.length);
                lines.push("        " + asciiHex(actionName));
                lines.push("    ]");
                lines.push("    /keyIndex 0");
                lines.push("    /colorIndex 0");
                lines.push("    /isOpen 1");
                lines.push("    /eventCount 1");
                lines.push("    /event-1 {");
                lines.push("        /useRulersIn1stQuadrant 0");
                lines.push("        /internalName (ai_plugin_setStroke)");
                lines.push("        /localizedName [ 10");
                lines.push("            536574205374726F6B65");
                lines.push("        ]");
                lines.push("        /isOpen 1");
                lines.push("        /isOn 1");
                lines.push("        /hasDialog 0");
                lines.push("        /parameterCount 5");
                addUnitRealParameter(lines, 1, 2003072104, ARROW_WIDTH_PT);
                addUStringParameter(lines, 2, 1634231345, getNoneArrowName());
                addUStringParameter(lines, 3, 1634231346, arrowName);
                addRealParameter(lines, 4, 1634951986, arrowScale);
                addEnumeratedParameter(lines, 5, 1634230636, "패스 끝의 팁", 0);
                lines.push("    }");
                lines.push("}");

                writeActionFile(actionFile, lines);
            }

            // -------------------------------------------------------
            // 다이얼로그 도우미
            // -------------------------------------------------------
            function makeArrayGetter(values, index) {
                return function() { return values[index]; };
            }

            function makeArraySetter(values, index) {
                return function(value) { values[index] = value; };
            }

            function addPanel(parent, title) {
                var panel = parent.add("panel", undefined, title);
                panel.orientation = "column";
                panel.alignChildren = "left";
                panel.spacing = 4;
                panel.margins = [10, 14, 10, 8];
                return panel;
            }

            // 라벨 · 입력칸 · 스크롤바 를 한 줄에 배치
            function addValueRow(parent, label, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.spacing = 4;
                var labelText = row.add("statictext", undefined, label + ":");
                labelText.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.characters = INPUT_CHARACTERS;
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

            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다 (이동이 즉각 반응한다)
            function bindPositionRow(controls, getter, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var previousX = offsetXmm;
                    var previousY = offsetYmm;
                    setter(value);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    if (!movePreview(previousX, previousY, offsetXmm, offsetYmm)) {
                        updatePreview();
                        return;
                    }
                    if (previewGroup !== null) app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? getter() : value);
                };
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

            // -------------------------------------------------------
            // 옵션 저장
            // -------------------------------------------------------
            // v4: 지름 4 · 화살표 간격 · 화살촉 크기 · 줄 간격 비율 4 · 딸세포 간격 비율 · 위치 비율 2
            //     · 정자(머리 폭 · 머리 높이 · 꼬리 길이 · 꼬리 두께 · 물결 폭 · 그리기 여부 · 회전)
            function saveSettings() {
                var parts = ["v4"];
                for (var i = 0; i < diametersMm.length; i++) parts.push(diametersMm[i]);
                parts.push(arrowGapMm, arrowScale);
                for (var g = 0; g < gapsMm.length; g++) parts.push(gapsMm[g] * MM_TO_PT / rectHeightPt);
                parts.push(daughterStepMm * MM_TO_PT / rectWidthPt);
                parts.push(offsetXmm * MM_TO_PT / rectWidthPt, offsetYmm * MM_TO_PT / rectHeightPt);
                parts.push(headWidthMm, headHeightMm, tailLengthMm, tailWidthPt, waveAmpMm, showSperm ? 1 : 0,
                    spermRotationDeg);
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v4" || p.length !== 21) return;
                for (var i = 0; i < diametersMm.length; i++) {
                    diametersMm[i] = restoreNumber(p[1 + i], diametersMm[i], 1, 10);
                }
                arrowGapMm = restoreNumber(p[5], arrowGapMm, 0, 2);
                arrowScale = restoreNumber(p[6], arrowScale, 10, 800);
                // 비율은 넷 모두 유효할 때만 받는다. 하나라도 깨졌으면 사각형 초기값으로 간다.
                var ratios = [];
                for (var g = 0; g < 4; g++) {
                    var ratio = parseFloat(p[7 + g]);
                    if (isNaN(ratio) || ratio <= 0 || ratio > 10) break;
                    ratios.push(ratio);
                }
                if (ratios.length === 4) gapRatios = ratios;
                var stepRatio = parseFloat(p[11]);
                if (!isNaN(stepRatio) && stepRatio > 0 && stepRatio <= 10) daughterStepRatio = stepRatio;
                offsetXRatio = restoreNumber(p[12], 0, -10, 10);
                offsetYRatio = restoreNumber(p[13], 0, -10, 10);
                headWidthMm = restoreNumber(p[14], headWidthMm, 0.5, 2);
                headHeightMm = restoreNumber(p[15], headHeightMm, 0.5, 2);
                tailLengthMm = restoreNumber(p[16], tailLengthMm, 0.5, 5);
                tailWidthPt = restoreNumber(p[17], tailWidthPt, 0.1, 2);
                waveAmpMm = restoreNumber(p[18], waveAmpMm, 0, 2);
                showSperm = p[19] !== "0";
                spermRotationDeg = restoreNumber(p[20], spermRotationDeg, -180, 180);
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseFloat(text);
                if (isNaN(value) || value < minimum || value > maximum) return fallback;
                return value;
            }
            return null;
        }
        return api;
    }

    // ==== 세포 주기 ====
    function makeCellCycleEngine() {
        var api = {label: "세포 주기", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            if (doc.activeLayer.locked || !doc.activeLayer.visible) return "현재 레이어가 잠겨 있거나 숨겨져 있습니다. 편집할 수 있는 레이어를 선택한 뒤 실행해주세요.";

            var MM_TO_PT = 2.83464567;
            var LINE_WIDTH = 0.3;              // 외경 원·분할선·화살표 테두리 굵기(pt)
            var CENTER_TEXT = "세포\r주기";
            var CENTER_FONT_SIZE = 8;
            var LABEL_FONT_SIZE = 8;           // G1기 · S기 · G2기 · M기
            var CIRCLED_FONT_SIZE = 9;         // ㉠ ㉡ ㉢
            var SECTOR_COUNT = 4;
            var PREF_KEY = "ObjectCellCycle/settings";
            var POSITION_LIMIT_MM = 100;
            var PREVIEW_NAME = "Cell Cycle Preview";

            var SUB1 = String.fromCharCode(0x2081);
            var SUB2 = String.fromCharCode(0x2082);

            // display: 다이얼로그 라디오 표시, contents: 실제로 삽입되는 문자
            // subscriptIndex: 아래 첨자로 내릴 문자 위치(없으면 -1), circled: 원문자(바탕체) 여부
            var LABEL_CHOICES = [
                {display: "G" + SUB1 + "기", contents: "G1기", subscriptIndex: 1, circled: false},
                {display: "S기", contents: "S기", subscriptIndex: -1, circled: false},
                {display: "G" + SUB2 + "기", contents: "G2기", subscriptIndex: 1, circled: false},
                {display: "M기", contents: "M기", subscriptIndex: -1, circled: false},
                {display: String.fromCharCode(0x3260), contents: String.fromCharCode(0x3260), subscriptIndex: -1, circled: true},
                {display: String.fromCharCode(0x3261), contents: String.fromCharCode(0x3261), subscriptIndex: -1, circled: true},
                {display: String.fromCharCode(0x3262), contents: String.fromCharCode(0x3262), subscriptIndex: -1, circled: true}
            ];

            var korFont = getFont("SpoqaHanSansNeo-Regular");
            var engFont = getFont("GSMediumB1");
            var circledFont = getFont("Batang");

            var outerMm = 40;
            var innerMm = 16;
            var percents = [40, 30, 20, 10];
            var labelIndexes = [0, 1, 2, 3];
            var arrowWidthPt = 3;
            var arrowScale = 200;
            var gapDeg = 6;
            var startAngleDeg = 0;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;
            var previewSignature = "";        // 마지막으로 그린 미리보기의 설정. 같으면 다시 그리지 않는다

            applySavedSettings();

            var LABEL_WIDTH = 66;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;
            // 구간 슬라이더: 경계 조절점 3개를 끌어 네 구간의 비율을 정한다 (합계 항상 100%)
            var SECTOR_SLIDER_HEIGHT = 34;
            var SECTOR_SLIDER_PAD = 8;         // 조절점이 양 끝에서 잘리지 않도록 비우는 폭(px)
            var THUMB_HALF_WIDTH = 5;
            var THUMB_GRAB_RADIUS = 12;        // 이 거리(px) 안에서 클릭하면 조절점을 잡는다
            var MIN_SECTOR_PERCENT = 1;
            var SECTOR_DRAG_STEP = 0.5;

            var dlg = page;

            var sizePanel = addPanel(dlg, "크기");
            var outerControls = addValueRow(sizePanel, "외경", "mm", outerMm, 5, 200, 0.5, 2);
            var innerControls = addValueRow(sizePanel, "내경", "mm", innerMm, 1, 199.5, 0.5, 2);

            var positionPanel = addPanel(dlg, "위치 이동");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            var sectorPanel = addPanel(dlg, "구간 (시계 방향)");
            var startAngleControls = addValueRow(sectorPanel, "시작 경계", "°", startAngleDeg, -180, 180, 1, 0);
            var startAngleNote = sectorPanel.add("statictext", undefined, "0° = 12시, +는 시계 방향");
            var sectorSlider = sectorPanel.add("customView");
            sectorSlider.alignment = ["fill", "top"];
            sectorSlider.preferredSize.height = SECTOR_SLIDER_HEIGHT;
            sectorSlider.onDraw = drawSectorSlider;
            var dragBoundary = -1;
            sectorSlider.addEventListener("mousedown", function(event) {
                dragBoundary = nearestBoundary(event.clientX);
                if (dragBoundary < 0) return;
                moveDraggedBoundary(event.clientX, false);
            });
            sectorSlider.addEventListener("mousemove", function(event) {
                if (dragBoundary < 0) return;
                moveDraggedBoundary(event.clientX, false);
            });
            sectorSlider.addEventListener("mouseup", function(event) {
                if (dragBoundary < 0) return;
                moveDraggedBoundary(event.clientX, true);
                dragBoundary = -1;
            });
            var sectorInputs = [];
            for (var s = 0; s < SECTOR_COUNT; s++) {
                var sectorRow = sectorPanel.add("group");
                sectorRow.alignChildren = ["left", "center"];
                var sectorLabel = sectorRow.add("statictext", undefined, "구간 " + (s + 1));
                sectorLabel.preferredSize.width = LABEL_WIDTH;
                var percentInput = sectorRow.add("edittext", undefined, formatNumber(percents[s], 1));
                percentInput.characters = 5;
                percentInput.justify = "right";
                sectorRow.add("statictext", undefined, "%");
                sectorInputs.push(percentInput);

                var radioGroup = sectorRow.add("group");
                radioGroup.alignChildren = ["left", "center"];
                radioGroup.spacing = 4;
                for (var c = 0; c < LABEL_CHOICES.length; c++) {
                    var radio = radioGroup.add("radiobutton", undefined, LABEL_CHOICES[c].display);
                    radio.value = (labelIndexes[s] === c);
                    radio.onClick = makeLabelHandler(s, c);
                }

                sectorInputs[s].onChange = makePercentHandler(s);
            }

            var arrowPanel = addPanel(dlg, "내부 화살표");
            var arrowWidthControls = addValueRow(arrowPanel, "굵기", "pt", arrowWidthPt, 0.5, 30, 0.5, 1);
            var arrowScaleControls = addValueRow(arrowPanel, "화살촉 크기", "%", arrowScale, 10, 800, 1, 0);
            var gapControls = addValueRow(arrowPanel, "간격", "°", gapDeg, 0, 60, 1, 0);
            var arrowNote = arrowPanel.add("statictext", undefined, "미리보기는 슬라이더를 놓는 순간 화살촉까지 그립니다 (흰색 채움은 확인 후 적용).");
            arrowNote.preferredSize.width = 380;

            bindValueRow(outerControls,
                function() { return outerMm; },
                function(value) {
                    outerMm = value;
                    limitInnerDiameter();
                });
            bindValueRow(innerControls,
                function() { return innerMm; },
                function(value) { innerMm = value; });
            bindValueRow(arrowWidthControls,
                function() { return arrowWidthPt; },
                function(value) { arrowWidthPt = value; });
            bindValueRow(arrowScaleControls,
                function() { return arrowScale; },
                function(value) { arrowScale = value; });
            bindValueRow(gapControls,
                function() { return gapDeg; },
                function(value) { gapDeg = value; });
            bindValueRow(startAngleControls,
                function() { return startAngleDeg; },
                function(value) { startAngleDeg = value; });
            bindPositionRow(offsetXControls,
                function() { return offsetXmm; },
                function(value) { offsetXmm = value; });
            bindPositionRow(offsetYControls,
                function() { return offsetYmm; },
                function(value) { offsetYmm = value; });

            removeLeftoverPreviews();
            limitInnerDiameter();
            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { previewEnabled = on; updatePreview(); };
            api.updatePreview = updatePreview;
            api.clearPreview = clearPreview;
            api.commit = function() {
                if (innerMm >= outerMm) {
                    alert("내경은 외경보다 작아야 합니다.");
                    return false;
                }
                saveSettings();
                clearPreview();
                var finalGroup = tryBuildDiagram(2);
                finalGroup.name = "Cell Cycle";
                doc.selection = null;
                try { finalGroup.selected = true; } catch (e) {}
                return true;
            };

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            // 화살촉은 액션으로만 붙일 수 있어 느리다. 슬라이더를 끄는 동안(withArrowheads=false)은
            // 굵기만 보여주고, 손을 뗀 순간 화살촉까지 그린다.
            // Illustrator는 연속 DOM 수정 중 간헐적으로 "Target layer cannot be modified" / PARM을
            // 던진다. 여기서 잡지 않으면 스크립트가 통째로 죽어 미리보기가 캔버스에 남는다.
            function updatePreview(withArrowheads) {
                if (!previewEnabled) {
                    clearPreview();
                    app.redraw();
                    return;
                }
                var lightweight = (withArrowheads === false);
                var signature = previewSettingsKey(lightweight);
                if (previewGroup !== null && signature === previewSignature) return;
                clearPreview();
                try {
                    previewGroup = buildDiagram(!lightweight, false, lightweight);
                    previewGroup.name = PREVIEW_NAME;
                    previewSignature = signature;
                } catch (e) {
                    // 일시적 오류: 다음 조작에서 다시 그려지므로 경고 없이 넘어간다
                    previewGroup = null;
                }
                app.redraw();
            }

            function previewSettingsKey(lightweight) {
                return [lightweight ? 1 : 0, outerMm, innerMm, startAngleDeg, arrowWidthPt, arrowScale, gapDeg,
                    offsetXmm, offsetYmm, percents.join(","), labelIndexes.join(",")].join("|");
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

            // 최종 생성도 같은 간헐 오류를 만날 수 있어 redraw로 상태를 정리한 뒤 한 번 더 시도한다
            function tryBuildDiagram(attempts) {
                var lastError = null;
                for (var attempt = 0; attempt < attempts; attempt++) {
                    try {
                        return buildDiagram(true, true, false);
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
            // withArrowheads: 화살촉 액션을 적용할지, expandArrows: 면으로 확장·병합해 흰색으로 채울지
            // 그리다 실패하면 반쯤 만든 그룹을 지우고 오류를 다시 던진다 (유령 조각 방지)
            function buildDiagram(withArrowheads, expandArrows, lightweight) {
                var group = doc.groupItems.add();
                try {
                    drawDiagram(group, withArrowheads, expandArrows, lightweight);
                } catch (e) {
                    try { group.remove(); } catch (removeError) {}
                    throw e;
                }
                return group;
            }

            function drawDiagram(group, withArrowheads, expandArrows, lightweight) {
                var center = offsetDiagramCenter(getViewCenter(), offsetXmm, offsetYmm);
                var cx = center[0];
                var cy = center[1];
                var outerR = outerMm * MM_TO_PT / 2;
                var innerR = innerMm * MM_TO_PT / 2;
                var black = makeBlackColor();

                var outerCircle = group.pathItems.ellipse(cy + outerR, cx - outerR, outerR * 2, outerR * 2);
                applyOutline(outerCircle, black, LINE_WIDTH);

                var bounds = getSectorBounds();
                for (var i = 0; i < SECTOR_COUNT; i++) {
                    var divisionLine = makeLine(group,
                        cx + innerR * Math.cos(bounds[i]), cy + innerR * Math.sin(bounds[i]),
                        cx + outerR * Math.cos(bounds[i]), cy + outerR * Math.sin(bounds[i]));
                    applyOutline(divisionLine, black, LINE_WIDTH);
                }

                if (!lightweight) {
                    var labelRadius = (innerR + outerR) / 2;
                    for (var j = 0; j < SECTOR_COUNT; j++) {
                        var midAngle = bounds[j] + (bounds[j + 1] - bounds[j]) / 2;
                        addLabelText(group, LABEL_CHOICES[labelIndexes[j]],
                            cx + labelRadius * Math.cos(midAngle),
                            cy + labelRadius * Math.sin(midAngle));
                    }

                    addCenterText(group, cx, cy);
                }

                // 화살표는 마지막에 그려 분할선 위를 덮는다
                var arcs = [];
                for (var k = 0; k < SECTOR_COUNT; k++) {
                    var sweep = bounds[k + 1] - bounds[k];
                    var gap = Math.min(gapDeg * Math.PI / 180, Math.abs(sweep) * 0.8);
                    var start = bounds[k] - gap / 2;
                    var arc = makeArcPath(group, cx, cy, innerR, start, sweep + gap);
                    applyOutline(arc, black, arrowWidthPt);
                    arcs.push(arc);
                }

                if (withArrowheads) {
                    applyArrowheadAction(arcs);
                }
                if (expandArrows) {
                    outlineArrows(group, arcs);
                }
            }

            function offsetDiagramCenter(center, xMm, yMm) {
                return [center[0] + xMm * MM_TO_PT, center[1] + yMm * MM_TO_PT];
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

            // 설정된 시작 경계에서 시계 방향으로 도는 구간 경계 각도(라디안). 길이는 구간 수 + 1.
            function getSectorBounds() {
                var total = getPercentTotal();
                var startBoundary = startBoundaryRadians(startAngleDeg);
                var bounds = [startBoundary];
                var cumulative = 0;
                for (var i = 0; i < SECTOR_COUNT; i++) {
                    cumulative += percents[i];
                    bounds.push(startBoundary - (cumulative / total) * Math.PI * 2);
                }
                return bounds;
            }

            function startBoundaryRadians(angleDeg) {
                return Math.PI / 2 - angleDeg * Math.PI / 180;
            }

            function makeLine(group, x1, y1, x2, y2) {
                var path = group.pathItems.add();
                path.setEntirePath([[x1, y1], [x2, y2]]);
                return path;
            }

            // 90°마다 나눈 베지어 호의 점 목록. 부호가 있는 sweep이 진행 방향(음수=시계 방향)을 정한다.
            function arcPoints(cx, cy, radius, startAngle, sweep) {
                var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 0.000001));
                var step = sweep / count;
                var handleScale = 4 / 3 * Math.tan(step / 4);
                var points = [];
                for (var i = 0; i <= count; i++) {
                    var angle = startAngle + step * i;
                    var anchor = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
                    var tangent = [-radius * Math.sin(angle) * handleScale, radius * Math.cos(angle) * handleScale];
                    points.push({
                        anchor: anchor,
                        left: [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                        right: [anchor[0] + tangent[0], anchor[1] + tangent[1]]
                    });
                }
                return points;
            }

            function buildPathFromPoints(group, points, closed) {
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                var path = group.pathItems.add();
                path.setEntirePath(anchors);
                path.closed = closed;
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.anchor = points[j].anchor;
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                    point.pointType = points[j].corner ? PointType.CORNER : PointType.SMOOTH;
                }
                return path;
            }

            function makeArcPath(group, cx, cy, radius, startAngle, sweep) {
                return buildPathFromPoints(group, arcPoints(cx, cy, radius, startAngle, sweep), false);
            }

            function applyOutline(pathItem, color, width) {
                pathItem.filled = false;
                pathItem.stroked = true;
                pathItem.strokeColor = color;
                pathItem.strokeWidth = width;
                pathItem.strokeCap = StrokeCap.BUTTENDCAP;
                pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                pathItem.strokeDashes = [];
            }

            // -------------------------------------------------------
            // 문자
            // -------------------------------------------------------
            function addLabelText(group, choice, x, y) {
                var frame = group.textFrames.add();
                frame.contents = choice.contents;
                if (choice.circled) {
                    applyFontToRange(frame.textRange, circledFont, CIRCLED_FONT_SIZE, 0);
                } else {
                    applyKoEnFont(frame, LABEL_FONT_SIZE);
                    if (choice.subscriptIndex >= 0) {
                        try {
                            frame.characters[choice.subscriptIndex].characterAttributes.baselinePosition =
                                FontBaselineOption.SUBSCRIPT;
                        } catch (e) {}
                    }
                }
                centerFrame(frame, x, y);
                return frame;
            }

            function addCenterText(group, x, y) {
                var frame = group.textFrames.add();
                frame.contents = CENTER_TEXT;
                applyFontToRange(frame.textRange, korFont, CENTER_FONT_SIZE, 0);
                try { frame.textRange.paragraphAttributes.justification = Justification.CENTER; } catch (e) {}
                centerFrame(frame, x, y);
                return frame;
            }

            // Text_koen과 같은 규칙: 한글·공백은 스포카한산스, 나머지는 GSMedium + 기준선 0.5pt
            function applyKoEnFont(frame, size) {
                for (var i = 0; i < frame.characters.length; i++) {
                    var character = frame.characters[i];
                    var text = character.contents;
                    var code = text.charCodeAt(0);
                    var isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
                    var isSpace = (text === " " || code === 32 || code === 160);
                    if (isKorean || isSpace) {
                        applyFontToRange(character, korFont, size, 0);
                    } else {
                        applyFontToRange(character, engFont, size, 0.5);
                    }
                }
            }

            function applyFontToRange(range, font, size, baselineShift) {
                try { range.characterAttributes.size = size; } catch (e) {}
                try { range.characterAttributes.textFont = font; } catch (e2) {}
                try { range.characterAttributes.baselineShift = baselineShift; } catch (e3) {}
            }

            function centerFrame(frame, x, y) {
                try {
                    frame.position = [x - frame.width / 2, y + frame.height / 2];
                } catch (e) {}
            }

            function getFont(name) {
                try {
                    return app.textFonts.getByName(name);
                } catch (e) {
                    return app.textFonts[0];
                }
            }

            // -------------------------------------------------------
            // 화살촉 · 확장
            // -------------------------------------------------------
            // 화살촉은 DOM에 없어 임시 액션으로 적용한다 (AGENTS.md 참고)
            function applyArrowheadAction(paths) {
                var actionSetName = "Codex_CellCycle";
                var actionName = "CellCycleArrow";
                var actionFile = new File(Folder.temp + "/Codex_CellCycleArrow.aia");
                var locale = getAppLocale();
                var isKorean = locale === "" || locale.indexOf("ko") === 0;
                var arrowName = isKorean ? "화살표 3" : "Arrow 3";

                try {
                    doc.selection = null;
                    for (var i = 0; i < paths.length; i++) {
                        paths[i].selected = true;
                    }
                    removeActionSetIfLoaded(actionSetName);
                    writeArrowheadAction(actionFile, actionSetName, actionName, arrowName);
                    app.loadAction(actionFile);
                    app.doScript(actionName, actionSetName);
                } catch (e) {
                    // 화살표 이름은 UI 언어를 따른다. 실패해도 호 자체는 그대로 남는다.
                }

                removeActionSetIfLoaded(actionSetName);
                try { actionFile.remove(); } catch (e2) {}
                doc.selection = null;
            }

            function writeArrowheadAction(actionFile, actionSetName, actionName, arrowName) {
                var lines = [];
                lines.push("/version 3");
                lines.push("/name [ " + actionSetName.length);
                lines.push("    " + asciiHex(actionSetName));
                lines.push("]");
                lines.push("/isOpen 1");
                lines.push("/actionCount 1");
                lines.push("/action-1 {");
                lines.push("    /name [ " + actionName.length);
                lines.push("        " + asciiHex(actionName));
                lines.push("    ]");
                lines.push("    /keyIndex 0");
                lines.push("    /colorIndex 0");
                lines.push("    /isOpen 1");
                lines.push("    /eventCount 1");
                lines.push("    /event-1 {");
                lines.push("        /useRulersIn1stQuadrant 0");
                lines.push("        /internalName (ai_plugin_setStroke)");
                lines.push("        /localizedName [ 10");
                lines.push("            536574205374726F6B65");
                lines.push("        ]");
                lines.push("        /isOpen 1");
                lines.push("        /isOn 1");
                lines.push("        /hasDialog 0");
                lines.push("        /parameterCount 5");
                addUnitRealParameter(lines, 1, 2003072104, arrowWidthPt);
                addUStringParameter(lines, 2, 1634231345, getNoneArrowName());
                addUStringParameter(lines, 3, 1634231346, arrowName);
                addRealParameter(lines, 4, 1634951986, arrowScale);
                addEnumeratedParameter(lines, 5, 1634230636, "패스 끝의 팁", 0);
                lines.push("    }");
                lines.push("}");

                writeActionFile(actionFile, lines);
            }

            // 손으로 만들 때와 같은 순서: 모양 확장(화살촉을 패스로) → 확장(획을 면으로) → 병합.
            // 화살표를 하나씩 처리해야 병합 대상이 그 화살표의 몸통과 화살촉으로만 좁혀진다.
            // 여러 개를 한꺼번에 확장하면 선택 항목이 전체 조각의 목록이 되어 병합이 헛돈다.
            function outlineArrows(group, paths) {
                for (var i = 0; i < paths.length; i++) {
                    doc.selection = null;
                    try {
                        paths[i].selected = true;
                    } catch (e) {
                        continue;
                    }

                    // 모양 확장: 화살촉이 패스가 되고 몸통은 획인 채로 그룹에 묶인다
                    try {
                        app.executeMenuCommand("expandStyle");
                    } catch (expandError) {
                        continue;
                    }

                    // 확장(획 → 면). 메뉴 명령("outline", "OffsetPath v22", "Expand3")과
                    // 임시 .aia 재현은 먹히지 않았고, 설치된 확장 액션 클릭은 잘 되는 것을 확인함.
                    // setup이 모든 기기에 등록하는 그 액션(최종훈 > 확장)을 직접 호출한다.
                    applyExpandAction();

                    // 병합. 메뉴 명령(Live Pathfinder Add)은 이 환경에서 먹히지 않아
                    // 확장과 같은 방식으로 설치된 액션(최종훈 > 도형 합치기)을 호출한다.
                    try {
                        app.doScript("도형 합치기", "최종훈");
                    } catch (uniteError) {
                        alert("액션 팔레트에서 '최종훈 > 도형 합치기' 액션을 찾을 수 없습니다.\n" +
                            "00_세팅의 setup을 다시 실행한 뒤 스크립트를 사용해주세요.\n" +
                            "화살촉과 몸통은 병합되지 않은 상태로 남습니다.");
                    }

                    var united = snapshotSelection();
                    for (var k = 0; k < united.length; k++) {
                        applyArrowFill(united[k]);
                        try { united[k].move(group, ElementPlacement.PLACEATBEGINNING); } catch (moveError) {}
                    }
                }

                doc.selection = null;
            }

            // Object > 확장. setup(00_세팅)이 액션 팔레트에 등록해 두는 "최종훈 > 확장" 액션을
            // 그대로 호출한다 (확장 + 그룹 풀기). 임시 .aia로 재현한 ai_plugin_expand는
            // 먹히지 않았고, 설치된 액션은 정상 동작하는 것을 확인함.
            function applyExpandAction() {
                try {
                    app.doScript("확장", "최종훈");
                } catch (e) {
                    alert("액션 팔레트에서 '최종훈 > 확장' 액션을 찾을 수 없습니다.\n" +
                        "00_세팅의 setup을 다시 실행한 뒤 스크립트를 사용해주세요.\n" +
                        "화살표는 확장되지 않은 획 상태로 남습니다.");
                }
            }

            function snapshotSelection() {
                var items = [];
                try {
                    for (var i = 0; i < doc.selection.length; i++) {
                        items.push(doc.selection[i]);
                    }
                } catch (e) {}
                return items;
            }

            function applyArrowFill(item) {
                var white = makeWhiteColor(doc);
                var black = makeBlackColor();
                var parts = [];
                collectPathItems(item, parts);
                for (var i = 0; i < parts.length; i++) {
                    // 확장이 실패해 열린 획으로 남은 패스는 건드리지 않는다.
                    // 흰색 면 + 0.3pt로 덮으면 실패가 얇은 선처럼 보여 원인을 찾기 어렵다.
                    try { if (!parts[i].closed) continue; } catch (closedError) {}
                    try {
                        parts[i].filled = true;
                        parts[i].fillColor = white;
                        parts[i].stroked = true;
                        parts[i].strokeColor = black;
                        parts[i].strokeWidth = LINE_WIDTH;
                        parts[i].strokeCap = StrokeCap.BUTTENDCAP;
                        parts[i].strokeJoin = StrokeJoin.ROUNDENDJOIN;
                        parts[i].strokeDashes = [];
                    } catch (styleError) {}
                }
            }

            function makeBlackColor() {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = 100;
                    return cmyk;
                }
                var rgb = new RGBColor();
                rgb.red = 0;
                rgb.green = 0;
                rgb.blue = 0;
                return rgb;
            }

            function getViewCenter() {
                try {
                    var view = doc.activeView ? doc.activeView : doc.views[0];
                    return [view.centerPoint[0], view.centerPoint[1]];
                } catch (e) {
                    return [0, 0];
                }
            }

            // -------------------------------------------------------
            // 다이얼로그 도우미
            // -------------------------------------------------------
            function makeLabelHandler(sectorIndex, choiceIndex) {
                return function() {
                    labelIndexes[sectorIndex] = choiceIndex;
                    updatePreview();
                };
            }

            // 입력칸 수정은 그 구간의 오른쪽 경계를 옮기는 것과 같다 (다음 구간에서 빼거나 더한다).
            // 마지막 구간은 오른쪽 경계가 100%로 고정이라 왼쪽 경계를 옮긴다.
            function makePercentHandler(sectorIndex) {
                return function() {
                    var value = parseNumber(sectorInputs[sectorIndex].text);
                    if (value !== null) {
                        var boundaries = getBoundaries();
                        if (sectorIndex < SECTOR_COUNT - 1) {
                            var left = sectorIndex === 0 ? 0 : boundaries[sectorIndex - 1];
                            setBoundary(sectorIndex, left + value);
                        } else {
                            setBoundary(sectorIndex - 1, 100 - value);
                        }
                    }
                    syncSectorControls();
                    updatePreview(true);
                };
            }

            function getPercentTotal() {
                var total = 0;
                for (var i = 0; i < SECTOR_COUNT; i++) total += percents[i];
                return total;
            }

            // 저장값이 100%가 아니면 비율대로 100%에 맞춘다
            function normalizePercents() {
                var total = getPercentTotal();
                if (total <= 0) return;
                for (var i = 0; i < SECTOR_COUNT; i++) percents[i] = percents[i] * 100 / total;
            }

            // -------------------------------------------------------
            // 구간 슬라이더 (조절점 3개)
            // -------------------------------------------------------
            // 경계 = 누적 비율(%). 조절점 3개의 위치이다.
            function getBoundaries() {
                var boundaries = [];
                var cumulative = 0;
                for (var i = 0; i < SECTOR_COUNT - 1; i++) {
                    cumulative += percents[i];
                    boundaries.push(cumulative);
                }
                return boundaries;
            }

            // 경계 하나를 옮긴다. 양옆 구간은 MIN_SECTOR_PERCENT 이상 남긴다.
            function setBoundary(index, value) {
                var boundaries = getBoundaries();
                var lower = (index === 0 ? 0 : boundaries[index - 1]) + MIN_SECTOR_PERCENT;
                var upper = (index === boundaries.length - 1 ? 100 : boundaries[index + 1]) - MIN_SECTOR_PERCENT;
                if (lower > upper) return;
                boundaries[index] = clamp(value, lower, upper);
                var previous = 0;
                for (var i = 0; i < SECTOR_COUNT; i++) {
                    var next = i < boundaries.length ? boundaries[i] : 100;
                    percents[i] = next - previous;
                    previous = next;
                }
            }

            function sliderTrackRange() {
                return [SECTOR_SLIDER_PAD, sectorSlider.size.width - SECTOR_SLIDER_PAD];
            }

            function percentToX(percent) {
                var range = sliderTrackRange();
                return range[0] + (range[1] - range[0]) * percent / 100;
            }

            function xToPercent(x) {
                var range = sliderTrackRange();
                return (x - range[0]) / (range[1] - range[0]) * 100;
            }

            function nearestBoundary(x) {
                var boundaries = getBoundaries();
                var best = -1;
                var bestDistance = THUMB_GRAB_RADIUS;
                for (var i = 0; i < boundaries.length; i++) {
                    var distance = Math.abs(percentToX(boundaries[i]) - x);
                    if (distance <= bestDistance) {
                        best = i;
                        bestDistance = distance;
                    }
                }
                return best;
            }

            function moveDraggedBoundary(x, withArrowheads) {
                setBoundary(dragBoundary, roundTo(xToPercent(x), SECTOR_DRAG_STEP));
                syncSectorControls();
                updatePreview(withArrowheads);
            }

            function syncSectorControls() {
                for (var i = 0; i < SECTOR_COUNT; i++) {
                    sectorInputs[i].text = formatNumber(percents[i], 1);
                }
                try { sectorSlider.notify("onDraw"); } catch (e) {}
            }

            function drawSectorSlider() {
                var g = this.graphics;
                var width = this.size.width;
                var height = this.size.height;
                var range = [SECTOR_SLIDER_PAD, width - SECTOR_SLIDER_PAD];
                var trackTop = 6;
                var trackHeight = height - 12;
                var sectorColors = [[0.62, 0.62, 0.62, 1], [0.42, 0.42, 0.42, 1]];
                var textPen = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
                var font = g.font;
                var boundaries = getBoundaries();

                var previousX = range[0];
                for (var i = 0; i < SECTOR_COUNT; i++) {
                    var nextX = i < boundaries.length
                        ? range[0] + (range[1] - range[0]) * boundaries[i] / 100
                        : range[1];
                    g.newPath();
                    g.rectPath(previousX, trackTop, nextX - previousX, trackHeight);
                    g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, sectorColors[i % 2]));
                    var label = formatNumber(percents[i], 1);
                    var labelSize = g.measureString(label, font);
                    if (labelSize[0] + 4 < nextX - previousX) {
                        g.drawString(label, textPen,
                            previousX + (nextX - previousX - labelSize[0]) / 2,
                            trackTop + (trackHeight - labelSize[1]) / 2, font);
                    }
                    previousX = nextX;
                }

                var thumbBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
                var thumbPen = g.newPen(g.PenType.SOLID_COLOR, [0.15, 0.15, 0.15, 1], 1);
                for (var k = 0; k < boundaries.length; k++) {
                    var x = range[0] + (range[1] - range[0]) * boundaries[k] / 100;
                    g.newPath();
                    g.rectPath(x - THUMB_HALF_WIDTH, 1, THUMB_HALF_WIDTH * 2, height - 2);
                    g.fillPath(thumbBrush);
                    g.strokePath(thumbPen);
                }
            }

            // 내경은 외경보다 항상 작게 유지한다
            function limitInnerDiameter() {
                var maxInner = Math.max(0.5, outerMm - 0.5);
                innerControls.max = maxInner;
                try { innerControls.slider.maxvalue = maxInner; } catch (e) {}
                if (innerMm > maxInner) {
                    innerMm = maxInner;
                    innerControls.input.text = formatNumber(innerMm, 2);
                    try { innerControls.slider.value = innerMm; } catch (e2) {}
                }
            }

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
                function commit(value, withArrowheads) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setter(value);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    updatePreview(withArrowheads);
                }
                // 끄는 동안은 가벼운 미리보기, 손을 뗀 뒤(onChange)에 화살촉까지 그린다
                controls.slider.onChanging = function() { commit(controls.slider.value, false); };
                controls.slider.onChange = function() { commit(controls.slider.value, true); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? getter() : value, true);
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
                        updatePreview(true);
                        return;
                    }
                    if (previewGroup !== null) app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? getter() : value);
                };
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

            // -------------------------------------------------------
            // 옵션 저장
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v3", outerMm, innerMm];
                for (var i = 0; i < SECTOR_COUNT; i++) parts.push(percents[i]);
                for (var j = 0; j < SECTOR_COUNT; j++) parts.push(labelIndexes[j]);
                parts.push(arrowWidthPt, arrowScale, gapDeg, offsetXmm, offsetYmm, startAngleDeg);
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v3" || p.length !== 17) return;
                outerMm = restoreNumber(p[1], outerMm, 5, 200);
                innerMm = restoreNumber(p[2], innerMm, 1, 199.5);
                if (innerMm >= outerMm) innerMm = Math.max(1, outerMm - 0.5);
                for (var i = 0; i < SECTOR_COUNT; i++) {
                    percents[i] = restoreNumber(p[3 + i], percents[i], 0.1, 100);
                }
                normalizePercents();
                for (var j = 0; j < SECTOR_COUNT; j++) {
                    labelIndexes[j] = Math.round(restoreNumber(p[7 + j], labelIndexes[j], 0, LABEL_CHOICES.length - 1));
                }
                arrowWidthPt = restoreNumber(p[11], arrowWidthPt, 0.5, 30);
                arrowScale = restoreNumber(p[12], arrowScale, 10, 800);
                gapDeg = restoreNumber(p[13], gapDeg, 0, 60);
                offsetXmm = restoreNumber(p[14], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[15], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                startAngleDeg = restoreNumber(p[16], startAngleDeg, -180, 180);
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseFloat(text);
                if (isNaN(value) || value < minimum || value > maximum) return fallback;
                return value;
            }
            return null;
        }
        return api;
    }
})();
