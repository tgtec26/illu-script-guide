#include "Object_setdash_align_helper.jsxinc"
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

// 그래프·표: 축 눈금·그래프 마커·표·점선 분할선·모델 곡선을 한 창의 탭으로 묶었다.
// 탭마다 필요한 선택이 다르다 (축 눈금: 사각형, 마커: 꺾은선 패스, 표·점선 분할선·모델 곡선: 축에 나란한 사각형).
// 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "GraphTools/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true /
    // standalone: 선택이 없어도 되는 탭. 저장된 탭이 선택에 맞지 않을 때 선택을 쓰는 탭 뒤로 미룬다
    var engines = [makeAxisTicksEngine(), makeGraphMarkersEngine(), makeTableEngine(), makeDashedGridEngine(), makeModelCurvesEngine(), makeSolarSpectrumEngine()];

    var win = new Window("dialog", "그래프·표");
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

    // 저장된 탭이 선택에 맞지 않으면 선택을 쓰는 탭부터(뒤에서부터) 가능한 탭을 열고, 선택이 필요 없는 탭은 그다음이다
    var tabIndex = 0;
    try {
        var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
        if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
    } catch (tabError) {}
    for (var pass = 0; pass < 2 && engines[tabIndex].error; pass++) {
        for (engineIndex = engines.length - 1; engineIndex >= 0; engineIndex--) {
            if (engines[engineIndex].error || (pass === 0 && engines[engineIndex].standalone)) continue;
            tabIndex = engineIndex;
            break;
        }
    }
    // 어느 탭도 선택에 맞지 않으면 여기서 끝낸다 — 꺼진 탭을 tabs.selection에 넣으면 ScriptUI가 유형 오류를 던진다
    if (engines[tabIndex].error) {
        var problems = [];
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) problems.push("[" + engines[engineIndex].label + "] " + engines[engineIndex].error);
        alert("선택이 어느 탭에도 맞지 않습니다.\n\n" + problems.join("\n"));
        return;
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

    // ==== 축 눈금 ====
    function makeAxisTicksEngine() {
        var api = {label: "축 눈금", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "AxisTickMarks/settings";
            // 화살표 이름은 Illustrator UI 언어를 따른다 (한국어판 기준)
            var ARROW_NAME = "화살표 1";

            var doc = app.activeDocument;
            var sel = doc.selection;

            if (sel.length === 0) return "사각형을 선택해주세요.";
            var rect = sel[0];
            if (rect.typename !== "PathItem") return "PathItem(사각형)을 선택해주세요.";

            // 단위·스타일 상수
            var mmToPt = 2.834645669;
            var tickLength = 1.0 * mmToPt;
            var tickWeight = 0.4;
            var gridWeight = 0.3;
            var gridDashPattern = [2, 1];
            var axisWeight = 0.4;
            var arrowMargin = 3.0 * mmToPt;

            // 사각형 좌표 (원본은 미리보기 동안 숨겼다가 확정 시 삭제)
            var bounds = rect.geometricBounds;
            var leftX = bounds[0];
            var topY = bounds[1];
            var rightX = bounds[2];
            var bottomY = bounds[3];
            var originX = leftX;
            var originY = bottomY;
            var rectWasHidden = rect.hidden;

            var blackColor = new CMYKColor();
            blackColor.cyan = 0;
            blackColor.magenta = 0;
            blackColor.yellow = 0;
            blackColor.black = 100;

            var gridColor = new CMYKColor();
            gridColor.cyan = 0;
            gridColor.magenta = 0;
            gridColor.yellow = 0;
            gridColor.black = 80;

            var tickFont = app.textFonts.getByName("GSMediumB1");
            var legendFont = getFont("SpoqaHanSansNeo-Regular");

            // readOptions()가 채우는 옵션 값들
            var xCount = 5, yCount = 5;
            var xStart = 1, xStep = 1, yStart = 1, yStep = 1;
            var xLabelOffset = 0, yLabelOffset = 0;
            var useLegend = true, useZero = true, useArrow = true;
            var useBox = false, useXGrid = false, useYGrid = false;
            var legendAtCenter = false;
            var xLegendText = "", yLegendText = "";
            var legendGap = 1 * mmToPt;

            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var offsetXmm = 0;
            var offsetYmm = 0;

            var previewEnabled = true;
            var previewGroup = null;

            // -------------------------------------------------------
            // ScriptUI 다이얼로그
            // -------------------------------------------------------
            var dlg = page;

            var shapeGroup = dlg.add("group");
            shapeGroup.add("statictext", undefined, "형태:");
            var axisShapeRadio = shapeGroup.add("radiobutton", undefined, "축 2개 (L자 + 화살촉)");
            var boxShapeRadio = shapeGroup.add("radiobutton", undefined, "사각형 유지");
            axisShapeRadio.value = true;

            // 0 = 그 축에 눈금 없음
            var TICK_COUNT_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8];

            dlg.add("statictext", undefined, "Y축(왼쪽) 눈금 갯수:");
            var yGroup = dlg.add("group");
            var yBtns = [];
            for (var m = 0; m < TICK_COUNT_OPTIONS.length; m++) {
                var btn2 = yGroup.add("radiobutton", undefined, String(TICK_COUNT_OPTIONS[m]));
                if (TICK_COUNT_OPTIONS[m] === 5) btn2.value = true;
                yBtns.push(btn2);
            }

            var yValueGroup = dlg.add("group");
            yValueGroup.add("statictext", undefined, "Y축 시작 숫자:");
            var yStartInput = yValueGroup.add("edittext", undefined, "1");
            yStartInput.characters = 6;
            yValueGroup.add("statictext", undefined, "간격:");
            var yStepInput = yValueGroup.add("edittext", undefined, "1");
            yStepInput.characters = 6;

            var yOffsetGroup = dlg.add("group");
            yOffsetGroup.add("statictext", undefined, "Y축과 숫자 간격:");
            var yOffsetHalfBtn = yOffsetGroup.add("radiobutton", undefined, "0.5mm");
            var yOffsetOneBtn = yOffsetGroup.add("radiobutton", undefined, "1mm");
            yOffsetOneBtn.value = true;

            dlg.add("statictext", undefined, "X축(아래쪽) 눈금 갯수:");
            var xGroup = dlg.add("group");
            var xBtns = [];
            for (var n = 0; n < TICK_COUNT_OPTIONS.length; n++) {
                var btn = xGroup.add("radiobutton", undefined, String(TICK_COUNT_OPTIONS[n]));
                if (TICK_COUNT_OPTIONS[n] === 5) btn.value = true;
                xBtns.push(btn);
            }

            var xValueGroup = dlg.add("group");
            xValueGroup.add("statictext", undefined, "X축 시작 숫자:");
            var xStartInput = xValueGroup.add("edittext", undefined, "1");
            xStartInput.characters = 6;
            xValueGroup.add("statictext", undefined, "간격:");
            var xStepInput = xValueGroup.add("edittext", undefined, "1");
            xStepInput.characters = 6;

            var xOffsetGroup = dlg.add("group");
            xOffsetGroup.add("statictext", undefined, "X축과 숫자 간격:");
            var xOffsetHalfBtn = xOffsetGroup.add("radiobutton", undefined, "0.5mm");
            var xOffsetOneBtn = xOffsetGroup.add("radiobutton", undefined, "1mm");
            xOffsetOneBtn.value = true;

            var gridGroupRow = dlg.add("group");
            gridGroupRow.add("statictext", undefined, "보조선:");
            var xGridCheck = gridGroupRow.add("checkbox", undefined, "X축 보조선");
            var yGridCheck = gridGroupRow.add("checkbox", undefined, "Y축 보조선");

            var legendPanel = dlg.add("panel", undefined, "축 범례");
            legendPanel.orientation = "column";
            legendPanel.alignChildren = "left";
            legendPanel.margins = 10;

            var legendCheck = legendPanel.add("checkbox", undefined, "축 범례 넣기");
            legendCheck.value = true;

            var legendTextGroup = legendPanel.add("group");
            legendTextGroup.add("statictext", undefined, "X축:");
            var xLegendInput = legendTextGroup.add("edittext", undefined, "시간");
            xLegendInput.characters = 8;
            legendTextGroup.add("statictext", undefined, "Y축:");
            var yLegendInput = legendTextGroup.add("edittext", undefined, "거리");
            yLegendInput.characters = 8;

            var legendPosGroup = legendPanel.add("group");
            legendPosGroup.add("statictext", undefined, "범례 위치:");
            var legendEndRadio = legendPosGroup.add("radiobutton", undefined, "끝");
            var legendCenterRadio = legendPosGroup.add("radiobutton", undefined, "중앙");
            legendEndRadio.value = true;

            var legendGapGroup = legendPanel.add("group");
            legendGapGroup.alignChildren = ["left", "center"];
            legendGapGroup.add("statictext", undefined, "숫자와 범례 간격 (mm):");
            var legendGapInput = legendGapGroup.add("edittext", undefined, "1");
            legendGapInput.characters = 6;
            legendGapInput.justify = "center";
            var legendGapSlider = legendGapGroup.add("scrollbar", undefined, 1, 0, 10);
            legendGapSlider.preferredSize.width = 196;
            legendGapSlider.stepdelta = 0.1;
            legendGapSlider.jumpdelta = 1;

            var zeroCheck = legendPanel.add("checkbox", undefined, "원점에 0 넣기 (대각선 2mm)");
            zeroCheck.value = true;

            var arrowCheck = legendPanel.add("checkbox", undefined, "축 양 끝에 화살표 1 넣기");
            arrowCheck.value = true;

            var positionPanel = dlg.add("panel", undefined, "위치");
            positionPanel.orientation = "column";
            positionPanel.alignChildren = "left";
            var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmm);
            var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmm);


            function updateArrowEnabled() {
                // 사각형 유지 모드에서는 축 끝이 없어 화살표를 붙일 수 없다
                arrowCheck.enabled = axisShapeRadio.value;
            }

            // 모든 컨트롤 변경 시 미리보기 갱신
            function onOptionChanged() {
                updateArrowEnabled();
                updatePreview();
            }

            axisShapeRadio.onClick = onOptionChanged;
            boxShapeRadio.onClick = onOptionChanged;
            for (var rb = 0; rb < yBtns.length; rb++) {
                yBtns[rb].onClick = updatePreview;
                xBtns[rb].onClick = updatePreview;
            }
            yStartInput.onChanging = updatePreview;
            yStepInput.onChanging = updatePreview;
            xStartInput.onChanging = updatePreview;
            xStepInput.onChanging = updatePreview;
            yOffsetHalfBtn.onClick = updatePreview;
            yOffsetOneBtn.onClick = updatePreview;
            xOffsetHalfBtn.onClick = updatePreview;
            xOffsetOneBtn.onClick = updatePreview;
            xGridCheck.onClick = updatePreview;
            yGridCheck.onClick = updatePreview;
            legendCheck.onClick = updatePreview;
            xLegendInput.onChanging = updatePreview;
            yLegendInput.onChanging = updatePreview;
            legendEndRadio.onClick = updatePreview;
            legendCenterRadio.onClick = updatePreview;
            legendGapInput.onChanging = updatePreview;
            // 스크롤바는 0.1 격자에 맞춰 움직이고, 입력창 값은 스크롤바에 되돌려 준다
            legendGapSlider.onChanging = function() {
                legendGapInput.text = String(Math.round(legendGapSlider.value * 10) / 10);
                updatePreview();
            };
            legendGapInput.onChange = function() {
                var value = parseNumber(legendGapInput.text);
                if (value !== null) legendGapSlider.value = Math.max(0, Math.min(10, value));
            };
            zeroCheck.onClick = updatePreview;
            arrowCheck.onClick = updatePreview;
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetControls(offsetXControls, true);
            bindOffsetControls(offsetYControls, false);
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
                rect.selected = true;
            };
            api.commit = function() {
                if (!readOptions(true)) return false;
                saveSettings();
                clearPreview();
                var finalGroup = drawAxisTicks(true);
                moveItem(finalGroup, offsetXmm * mmToPt, offsetYmm * mmToPt);
                rect.remove();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            applySettings();
            updateArrowEnabled();

            // -------------------------------------------------------
            // 옵션 읽기
            // -------------------------------------------------------
            function readOptions(showAlert) {
                var values = [
                    parseNumber(xStartInput.text),
                    parseNumber(xStepInput.text),
                    parseNumber(yStartInput.text),
                    parseNumber(yStepInput.text)
                ];
                for (var v = 0; v < values.length; v++) {
                    if (values[v] === null) {
                        if (showAlert) alert("시작 숫자와 간격을 숫자로 입력해주세요.");
                        return false;
                    }
                }
                var gapValue = parseNumber(legendGapInput.text);
                if (legendCheck.value && gapValue === null) {
                    if (showAlert) alert("숫자와 범례 간격을 숫자로 입력해주세요.");
                    return false;
                }

                xStart = values[0];
                xStep = values[1];
                yStart = values[2];
                yStep = values[3];
                xCount = getSelectedCount(xBtns);
                yCount = getSelectedCount(yBtns);
                yLabelOffset = (yOffsetHalfBtn.value ? 0.5 : 1.0) * mmToPt;
                xLabelOffset = (xOffsetHalfBtn.value ? 0.5 : 1.0) * mmToPt;
                useLegend = legendCheck.value;
                useZero = zeroCheck.value;
                xLegendText = xLegendInput.text;
                yLegendText = yLegendInput.text;
                legendGap = (gapValue === null ? 1 : gapValue) * mmToPt;
                useBox = boxShapeRadio.value;
                useXGrid = xGridCheck.value;
                useYGrid = yGridCheck.value;
                useArrow = arrowCheck.value && !useBox;
                legendAtCenter = legendCenterRadio.value;
                return true;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                if (!readOptions(false)) {
                    app.redraw();
                    return;
                }
                previewGroup = drawAxisTicks(false);
                moveItem(previewGroup, offsetXmm * mmToPt, offsetYmm * mmToPt);
                previewGroup.name = "AxisTickMarks Preview";
                app.redraw();
            }

            // 위치 행: 라벨 · 입력칸 · 단위 · 화살표 버튼 · 슬라이더
            function addOffsetControls(parent, label, value) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (mm):").preferredSize.width = 70;
                var input = row.add("edittext", undefined, formatOffset(value));
                input.characters = 6;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value,
                    -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                slider.stepdelta = OFFSET_STEP_MM;
                slider.jumpdelta = OFFSET_STEP_MM * 10;
                slider.preferredSize.width = 196;
                return {input: input, slider: slider};
            }

            // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            function bindOffsetControls(controls, isX) {
                function current() { return isX ? offsetXmm : offsetYmm; }
                function commit(value) {
                    if (value === null || !isFinite(value)) return;
                    value = Math.round(value / OFFSET_STEP_MM) * OFFSET_STEP_MM;
                    if (value < -POSITION_LIMIT_MM) value = -POSITION_LIMIT_MM;
                    if (value > POSITION_LIMIT_MM) value = POSITION_LIMIT_MM;
                    var delta = (value - current()) * mmToPt;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    controls.input.text = formatOffset(value);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? current() : value);
                };
            }

            function setOffsetValue(controls, isX, value) {
                if (value === null || !isFinite(value)) return;
                if (Math.abs(value) > POSITION_LIMIT_MM) return;
                if (isX) offsetXmm = value;
                else offsetYmm = value;
                controls.input.text = formatOffset(value);
                try { controls.slider.value = value; } catch (e) {}
            }

            function formatOffset(value) {
                return String(Math.round(value * 10) / 10);
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            // -------------------------------------------------------
            // 그리기. isFinal이 아니면 느린 액션(파선 정렬, 화살표)은 생략한다.
            // -------------------------------------------------------
            function drawAxisTicks(isFinal) {
                var group = doc.groupItems.add();
                group.name = "AxisTickMarks";

                var xLabelLowest = null;
                var yLabelLeftmost = null;

                // 축: L자(위쪽 끝 → 원점 → 오른쪽 끝) 또는 사각형 상자
                var axis = group.pathItems.add();
                if (useBox) {
                    axis.setEntirePath([
                        [originX, topY],
                        [originX, originY],
                        [rightX, originY],
                        [rightX, topY]
                    ]);
                    axis.closed = true;
                } else {
                    axis.setEntirePath([
                        [originX, topY],
                        [originX, originY],
                        [rightX, originY]
                    ]);
                }
                axis.stroked = true;
                axis.strokeColor = blackColor;
                axis.strokeWidth = axisWeight;
                axis.filled = false;

                // 보조선: 80K 파선. 눈금 위치를 따라 반대쪽 끝까지 긋는다
                var gridLineGroup = group.groupItems.add();
                gridLineGroup.name = "Grid Lines";

                function addGridLine(x1, y1, x2, y2) {
                    var line = gridLineGroup.pathItems.add();
                    line.setEntirePath([[x1, y1], [x2, y2]]);
                    line.filled = false;
                    line.stroked = true;
                    line.strokeColor = gridColor;
                    line.strokeWidth = gridWeight;
                    try { line.strokeDashes = gridDashPattern; } catch (e) {}
                }

                // 눈금 간격: 상자 모드는 화살표 여백이 필요 없어 모서리까지 편다
                var endMargin = useBox ? 0 : arrowMargin;
                var xSpacing = xCount > 0 ? (rightX - endMargin - originX) / xCount : 0;
                var ySpacing = yCount > 0 ? (topY - endMargin - originY) / yCount : 0;

                // 텍스트 아웃라인 기준 배치 함수
                function createAlignedLabel(text, anchorX, anchorY, alignMode) {
                    var tf = doc.textFrames.add();
                    tf.contents = text;
                    tf.textRange.characterAttributes.size = 8;
                    tf.textRange.characterAttributes.textFont = tickFont;
                    tf.textRange.characterAttributes.fillColor = blackColor;
                    tf.top = anchorY;
                    tf.left = anchorX;

                    var gb = glyphBounds(tf);
                    var glyphTop = gb[1];
                    var glyphRight = gb[2];
                    var glyphCenterX = (gb[0] + gb[2]) / 2;
                    var glyphCenterY = (gb[1] + gb[3]) / 2;

                    if (alignMode === "bottom") {
                        tf.top = tf.top + (anchorY - xLabelOffset - glyphTop);
                        tf.left = tf.left + (anchorX - glyphCenterX);
                        var placedBottom = anchorY - xLabelOffset - (glyphTop - gb[3]);
                        if (xLabelLowest === null || placedBottom < xLabelLowest) xLabelLowest = placedBottom;
                    } else if (alignMode === "left") {
                        tf.left = tf.left + (anchorX - yLabelOffset - glyphRight);
                        tf.top = tf.top + (anchorY - glyphCenterY);
                        var placedLeft = anchorX - yLabelOffset - (glyphRight - gb[0]);
                        if (yLabelLeftmost === null || placedLeft < yLabelLeftmost) yLabelLeftmost = placedLeft;
                    }

                    tf.move(group, ElementPlacement.PLACEATEND);
                }

                function createLegendText(text, font, vertical) {
                    var tf = doc.textFrames.add();
                    tf.contents = text;
                    if (vertical) tf.orientation = TextOrientation.VERTICAL;
                    var attr = tf.textRange.characterAttributes;
                    if (font !== null) attr.textFont = font;
                    attr.size = 8;
                    attr.fillColor = blackColor;
                    return tf;
                }

                // X축 눈금 (갯수 0이면 눈금 없는 축)
                for (var i = 0; xCount > 0 && i <= xCount; i++) {
                    var xPos = originX + xSpacing * i;

                    var tick = group.pathItems.add();
                    tick.setEntirePath([[xPos, originY], [xPos, originY + tickLength]]);
                    tick.stroked = true;
                    tick.strokeColor = blackColor;
                    tick.strokeWidth = tickWeight;
                    tick.filled = false;

                    if (i > 0) {
                        if (useXGrid && xPos < rightX - 0.01) {
                            addGridLine(xPos, originY, xPos, topY);
                        }
                        createAlignedLabel(formatNumber(xStart + xStep * (i - 1)), xPos, originY, "bottom");
                    }
                }

                // Y축 눈금 (갯수 0이면 눈금 없는 축)
                for (var j = 0; yCount > 0 && j <= yCount; j++) {
                    var yPos = originY + ySpacing * j;

                    var tick2 = group.pathItems.add();
                    tick2.setEntirePath([[originX, yPos], [originX + tickLength, yPos]]);
                    tick2.stroked = true;
                    tick2.strokeColor = blackColor;
                    tick2.strokeWidth = tickWeight;
                    tick2.filled = false;

                    if (j > 0) {
                        if (useYGrid && yPos < topY - 0.01) {
                            addGridLine(originX, yPos, rightX, yPos);
                        }
                        createAlignedLabel(formatNumber(yStart + yStep * (j - 1)), originX, yPos, "left");
                    }
                }

                // 축 범례: 숫자 라벨의 바깥 경계에서 지정한 간격만큼 더 바깥에 배치
                if (useLegend) {
                    var xLegendBase = (xLabelLowest === null) ? (originY - xLabelOffset) : xLabelLowest;
                    var yLegendBase = (yLabelLeftmost === null) ? (originX - yLabelOffset) : yLabelLeftmost;

                    if (xLegendText !== "") {
                        var xLegend = createLegendText(xLegendText, legendFont, false);
                        var xb = glyphBounds(xLegend);
                        // 끝: X축 오른쪽 끝 정렬 / 중앙: 축 가운데 정렬. 숫자줄 아래로 간격만큼
                        var xLegendLeft = legendAtCenter
                            ? (originX + rightX) / 2 - (xb[2] - xb[0]) / 2
                            : rightX - (xb[2] - xb[0]);
                        moveGlyphTo(xLegend, xLegendLeft, xLegendBase - legendGap);
                        xLegend.move(group, ElementPlacement.PLACEATEND);
                    }

                    if (yLegendText !== "") {
                        var yLegend = createLegendText(yLegendText, legendFont, true);
                        var yb = glyphBounds(yLegend);
                        // 끝: Y축 위 끝 정렬 / 중앙: 축 가운데 정렬. 숫자열 왼쪽으로 간격만큼
                        var yLegendTop = legendAtCenter
                            ? (originY + topY) / 2 + (yb[1] - yb[3]) / 2
                            : topY;
                        moveGlyphTo(yLegend, yLegendBase - legendGap - (yb[2] - yb[0]), yLegendTop);
                        yLegend.move(group, ElementPlacement.PLACEATEND);
                    }
                }

                // 원점 0: 원점에서 좌하단 45도 대각선 2mm (글자 중심 기준)
                if (useZero) {
                    var zeroGap = 2 * mmToPt / Math.sqrt(2);
                    var zeroText = createLegendText("0", tickFont, false);
                    var zb = glyphBounds(zeroText);
                    moveGlyphTo(
                        zeroText,
                        originX - zeroGap - (zb[2] - zb[0]) / 2,
                        originY - zeroGap + (zb[1] - zb[3]) / 2
                    );
                    zeroText.move(group, ElementPlacement.PLACEATEND);
                }

                if (gridLineGroup.pathItems.length > 0) {
                    // 파선을 모퉁이와 패스 끝에 맞춰 정렬(스트로크 패널의 두 번째 파선 옵션).
                    // 액션을 거치는 느린 작업이라 미리보기에서는 생략한다.
                    if (isFinal) {
                        applyDashPatternToItems([gridLineGroup], gridDashPattern, false);
                    }
                    gridLineGroup.zOrder(ZOrderMethod.SENDTOBACK);
                } else {
                    gridLineGroup.remove();
                }

                // 축 양 끝 화살표: DOM에 노출되지 않는 속성이라 액션으로 적용. 미리보기에서는 생략
                if (isFinal && useArrow) {
                    applyAxisArrowheads(axis);
                }

                return group;
            }

            // -------------------------------------------------------
            // 공용 헬퍼
            // -------------------------------------------------------
            function getFont(name) {
                try {
                    return app.textFonts.getByName(name);
                } catch (e) {
                    return null;
                }
            }

            // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
            function glyphBounds(tf) {
                var dup = tf.duplicate();
                var outline = dup.createOutline();
                var gb = outline.geometricBounds; // [left, top, right, bottom]
                outline.remove();
                return gb;
            }

            // 글리프 경계의 (left, top)이 목표 지점에 오도록 이동
            function moveGlyphTo(tf, targetLeft, targetTop) {
                var gb = glyphBounds(tf);
                tf.translate(targetLeft - gb[0], targetTop - gb[1]);
            }

            function getSelectedCount(btns) {
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].value) return TICK_COUNT_OPTIONS[i];
                }
                return 5;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (normalized === "") return null;
                var value = Number(normalized);
                return isFinite(value) ? value : null;
            }

            function formatNumber(value) {
                var rounded = Math.round(value * 10000) / 10000;
                return String(rounded);
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var parts = [
                    "v7",
                    getSelectedCount(yBtns),
                    yStartInput.text,
                    yStepInput.text,
                    yOffsetHalfBtn.value ? "0.5" : "1",
                    getSelectedCount(xBtns),
                    xStartInput.text,
                    xStepInput.text,
                    xOffsetHalfBtn.value ? "0.5" : "1",
                    legendCheck.value ? "1" : "0",
                    xLegendInput.text,
                    yLegendInput.text,
                    legendGapInput.text,
                    zeroCheck.value ? "1" : "0",
                    arrowCheck.value ? "1" : "0",
                    boxShapeRadio.value ? "1" : "0",
                    legendCenterRadio.value ? "1" : "0",
                    xGridCheck.value ? "1" : "0",
                    yGridCheck.value ? "1" : "0",
                    offsetXmm,
                    offsetYmm
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if ((p[0] !== "v6" && p[0] !== "v7") || p.length < 19) return;
                try {
                    selectCount(yBtns, parseInt(p[1], 10));
                    yStartInput.text = p[2];
                    yStepInput.text = p[3];
                    yOffsetHalfBtn.value = (p[4] === "0.5");
                    yOffsetOneBtn.value = !yOffsetHalfBtn.value;
                    selectCount(xBtns, parseInt(p[5], 10));
                    xStartInput.text = p[6];
                    xStepInput.text = p[7];
                    xOffsetHalfBtn.value = (p[8] === "0.5");
                    xOffsetOneBtn.value = !xOffsetHalfBtn.value;
                    legendCheck.value = (p[9] === "1");
                    xLegendInput.text = p[10];
                    yLegendInput.text = p[11];
                    if (parseNumber(p[12]) !== null) { legendGapInput.text = p[12]; legendGapInput.onChange(); }
                    zeroCheck.value = (p[13] === "1");
                    arrowCheck.value = (p[14] === "1");
                    boxShapeRadio.value = (p[15] === "1");
                    axisShapeRadio.value = !boxShapeRadio.value;
                    legendCenterRadio.value = (p[16] === "1");
                    legendEndRadio.value = !legendCenterRadio.value;
                    xGridCheck.value = (p[17] === "1");
                    yGridCheck.value = (p[18] === "1");
                    if (p[0] === "v7" && p.length >= 21) {
                        setOffsetValue(offsetXControls, true, parseNumber(p[19]));
                        setOffsetValue(offsetYControls, false, parseNumber(p[20]));
                    }
                } catch (e) {}
            }

            function selectCount(btns, count) {
                for (var i = 0; i < btns.length; i++) {
                    if (TICK_COUNT_OPTIONS[i] === count) {
                        for (var j = 0; j < btns.length; j++) {
                            btns[j].value = (j === i);
                        }
                        return;
                    }
                }
            }

            // -------------------------------------------------------
            // 화살표 액션
            // -------------------------------------------------------
            function applyAxisArrowheads(axisPath) {
                var actionSetName = "Codex_AxisTools";
                var actionName = "AxisArrowheads";
                var actionFile = new File(Folder.temp + "/Codex_AxisArrowheads.aia");

                try {
                    doc.selection = null;
                    axisPath.selected = true;

                    writeArrowheadAction(actionFile, actionSetName, actionName);
                    try { app.unloadAction(actionSetName, ""); } catch (e) {}
                    app.loadAction(actionFile);
                    app.doScript(actionName, actionSetName);
                } catch (actionError) {
                    // 화살표 이름은 UI 언어에 따라 다르다. 실패해도 축 자체는 그대로 남는다.
                }

                try { app.unloadAction(actionSetName, ""); } catch (e2) {}
                try { actionFile.remove(); } catch (e3) {}
                doc.selection = null;
            }

            // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
            function toActionHex(text) {
                var bytes = [];
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    if (code < 0x80) {
                        bytes.push(code);
                    } else if (code < 0x800) {
                        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
                    } else {
                        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
                    }
                }
                var hex = "";
                for (var j = 0; j < bytes.length; j++) {
                    var part = bytes[j].toString(16).toUpperCase();
                    if (part.length < 2) part = "0" + part;
                    hex += part;
                }
                return {hex: hex, length: bytes.length};
            }

            function writeArrowheadAction(actionFile, actionSetName, actionName) {
                var setName = toActionHex(actionSetName);
                var name = toActionHex(actionName);
                var arrow = toActionHex(ARROW_NAME);
                var lines = [];

                lines.push("/version 3");
                lines.push("/name [ " + setName.length);
                lines.push("    " + setName.hex);
                lines.push("]");
                lines.push("/isOpen 1");
                lines.push("/actionCount 1");
                lines.push("/action-1 {");
                lines.push("    /name [ " + name.length);
                lines.push("        " + name.hex);
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
                lines.push("        /parameterCount 6");

                // 선 두께 (pt)
                lines.push("        /parameter-1 {");
                lines.push("            /key 2003072104");
                lines.push("            /showInPalette -1");
                lines.push("            /type (unit real)");
                lines.push("            /value " + axisWeight);
                lines.push("            /unit 592476268");
                lines.push("        }");
                // 시작 화살표
                lines.push("        /parameter-2 {");
                lines.push("            /key 1634231345");
                lines.push("            /showInPalette -1");
                lines.push("            /type (ustring)");
                lines.push("            /value [ " + arrow.length);
                lines.push("                " + arrow.hex);
                lines.push("            ]");
                lines.push("        }");
                // 끝 화살표
                lines.push("        /parameter-3 {");
                lines.push("            /key 1634231346");
                lines.push("            /showInPalette -1");
                lines.push("            /type (ustring)");
                lines.push("            /value [ " + arrow.length);
                lines.push("                " + arrow.hex);
                lines.push("            ]");
                lines.push("        }");
                // 시작/끝 화살표 크기 100%
                lines.push("        /parameter-4 {");
                lines.push("            /key 1634951985");
                lines.push("            /showInPalette -1");
                lines.push("            /type (real)");
                lines.push("            /value 100.0");
                lines.push("        }");
                lines.push("        /parameter-5 {");
                lines.push("            /key 1634951986");
                lines.push("            /showInPalette -1");
                lines.push("            /type (real)");
                lines.push("            /value 100.0");
                lines.push("        }");
                // 화살표 정렬: 패스 끝의 팁
                lines.push("        /parameter-6 {");
                lines.push("            /key 1634230636");
                lines.push("            /showInPalette -1");
                lines.push("            /type (enumerated)");
                lines.push("            /name [ 17");
                lines.push("                ED8CA8EC8AA420EB819DEC9D9820ED8C81");
                lines.push("            ]");
                lines.push("            /value 0");
                lines.push("        }");

                lines.push("    }");
                lines.push("}");

                actionFile.encoding = "UTF-8";
                actionFile.open("w");
                actionFile.write(lines.join("\n"));
                actionFile.close();
            }
            return null;
        }
        return api;
    }

    // ==== 그래프 마커 ====
    function makeGraphMarkersEngine() {
        var api = {label: "그래프 마커", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectGraphMarkers/settings";
            var PREVIEW_NAME = "GraphMarkers_Preview";
            var PREVIEW_INTERVAL_MS = 80;
            var LABEL_WIDTH = 90;    // Object_isometric.jsx와 같은 행 구성
            var SLIDER_WIDTH = 196;
            var mmToPt = 72 / 25.4;
            var SHAPES = ["원", "사각형", "삼각형"];
            var SIZE_VALUES = rangeValues(0.5, 2, 0.1);      // mm
            var FILL_VALUES = rangeValues(0, 100, 10);       // K
            var STROKE_VALUES = [0].concat(rangeValues(0.3, 1, 0.1)); // pt, 0이면 선 없음
            var LINE_VALUES = rangeValues(0.5, 2, 0.1);      // pt, 꺾은선 두께

            var doc = app.activeDocument;
            var paths = [];
            var selected = [];
            for (var i0 = 0; i0 < doc.selection.length; i0++) selected.push(doc.selection[i0]);
            collectPaths(selected, paths);
            if (paths.length === 0) return "꺾은선 그래프(패스)를 선택해주세요.";

            var originalWidths = [];
            for (var w = 0; w < paths.length; w++) originalWidths.push(paths[w].strokeWidth);

            var options = readSettings();
            var previewGroup = null;
            var committed = false;
            var previewPending = false;
            var lastPreviewTime = 0;

            var win = page;

            var shapePanel = win.add("panel", undefined, "모양");
            shapePanel.alignChildren = "left";
            var shapeRow = shapePanel.add("group");
            for (var s = 0; s < SHAPES.length; s++) {
                var radio = shapeRow.add("radiobutton", undefined, SHAPES[s]);
                radio.value = (options.shape === s);
                radio.onClick = makeShapeHandler(s);
            }

            var markerPanel = win.add("panel", undefined, "마커");
            markerPanel.alignChildren = "fill";
            markerPanel.spacing = 2;
            addRow(markerPanel, "크기", "size", SIZE_VALUES, "mm");
            addRow(markerPanel, "채움 (K)", "fillK", FILL_VALUES, "").helpTip = "10 단위";
            addRow(markerPanel, "선 두께", "stroke", STROKE_VALUES, "pt").helpTip = "0이면 선 없음, 선은 100K";

            var linePanel = win.add("panel", undefined, "꺾은선");
            linePanel.alignChildren = "fill";
            linePanel.spacing = 2;
            addRow(linePanel, "선 두께", "lineWidth", LINE_VALUES, "pt");

            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 360;

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(); };
            api.updatePreview = function() { updatePreview(); };
            api.clearPreview = function() {
                if (committed) return;
                clearPreview();
                setLineWidths(null);
            };
            api.commit = function() {
                options.preview = true;
                if (previewGroup === null || previewPending) {
                    if (!buildPreview()) return false;
                }
                setLineWidths(options.lineWidth);
                committed = true;
                previewGroup.name = "GraphMarkers";
                saveSettings();
                var result = groupWithGraph();
                doc.selection = null;
                result.selected = true;
                return true;
            };

            // 선택했던 그래프와 마커 그룹을 한 그룹으로 묶는다. 쌓임 순서는 유지하고 마커가 맨 위
            function groupWithGraph() {
                try {
                    var wrapper = selected[0].parent.groupItems.add();
                    wrapper.name = "Graph";
                    wrapper.move(selected[0], ElementPlacement.PLACEBEFORE);
                    for (var i = selected.length - 1; i >= 0; i--) {
                        selected[i].move(wrapper, ElementPlacement.PLACEATBEGINNING);
                    }
                    previewGroup.move(wrapper, ElementPlacement.PLACEATBEGINNING);
                    return wrapper;
                } catch (e) {
                    status.text = "그룹으로 묶지 못했습니다: " + e;
                    return previewGroup;
                }
            }


            function makeShapeHandler(index) {
                return function() {
                    options.shape = index;
                    updatePreview();
                };
            }

            // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장). 스크롤바는 values의 인덱스를 움직인다
            function addRow(panel, label, key, values, unit) {
                var row = panel.add("group");
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 6;
                var slider = row.add("scrollbar", undefined, nearestIndex(values, options[key]), 0, values.length - 1);
                slider.preferredSize.width = SLIDER_WIDTH;
                slider.stepdelta = 1;
                slider.jumpdelta = 1;
                function apply(index, dragging) {
                    index = Math.max(0, Math.min(values.length - 1, Math.round(index)));
                    var value = values[index];
                    slider.value = index;
                    input.text = String(value);
                    if (value === options[key]) {
                        if (!dragging && previewPending) updatePreview();
                        return;
                    }
                    options[key] = value;
                    if (key === "lineWidth") {
                        // 마커는 그대로 두고 꺾은선 두께만 바꾼다
                        if (options.preview) { setLineWidths(value); app.redraw(); }
                        return;
                    }
                    updatePreview(dragging);
                }
                slider.onChanging = function() { apply(slider.value, true); };
                slider.onChange = function() { apply(slider.value); };
                input.onChange = function() {
                    var number = Number(input.text);
                    if (!/\S/.test(input.text) || !isFinite(number)) { input.text = String(options[key]); return; }
                    apply(nearestIndex(values, number));
                };
                return caption;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview(dragging) {
                previewPending = true;
                if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return;
                try {
                    if (!options.preview) {
                        clearPreview();
                        setLineWidths(null);
                    } else {
                        if (!buildPreview()) return;
                        setLineWidths(options.lineWidth);
                    }
                    previewPending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    status.text = " ";
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
                }
            }

            // 마커 수가 적어 매번 새로 그린다. 그룹은 맨 위 선 바로 위에 둔다
            function buildPreview() {
                try {
                    clearPreview();
                    previewGroup = paths[0].parent.groupItems.add();
                    previewGroup.name = PREVIEW_NAME;
                    previewGroup.move(paths[0], ElementPlacement.PLACEBEFORE);
                    var size = options.size * mmToPt;
                    var fill = makeGray(options.fillK);
                    var black = makeGray(100);
                    for (var i = 0; i < paths.length; i++) {
                        var points = paths[i].pathPoints;
                        for (var j = 0; j < points.length; j++) {
                            var marker = makeMarker(previewGroup, points[j].anchor, size);
                            marker.closed = true;
                            marker.filled = true;
                            marker.fillColor = fill;
                            marker.stroked = options.stroke > 0;
                            if (marker.stroked) {
                                marker.strokeColor = black;
                                marker.strokeWidth = options.stroke;
                            }
                        }
                    }
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기 오류: " + e + " (" + e.line + "행)";
                    return false;
                }
            }

            function makeMarker(container, anchor, size) {
                var x = anchor[0], y = anchor[1];
                if (options.shape === 0) return container.pathItems.ellipse(y + size / 2, x - size / 2, size, size);
                if (options.shape === 1) return container.pathItems.rectangle(y + size / 2, x - size / 2, size, size);
                var path = container.pathItems.add();
                path.setEntirePath(trianglePoints(x, y, size));
                return path;
            }

            // 한 변이 size인 정삼각형. 외접 사각형의 중심이 (x, y)에 오고 꼭짓점은 위를 향한다
            function trianglePoints(x, y, size) {
                var height = size * Math.sqrt(3) / 2;
                return [[x, y + height / 2], [x + size / 2, y - height / 2], [x - size / 2, y - height / 2]];
            }

            // null이면 스크립트 실행 전 두께로 되돌린다
            function setLineWidths(width) {
                for (var i = 0; i < paths.length; i++) {
                    try {
                        paths[i].stroked = true;
                        paths[i].strokeWidth = (width === null) ? originalWidths[i] : width;
                    } catch (e) {}
                }
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {
                        try { app.redraw(); previewGroup.remove(); } catch (e2) {}
                    }
                    previewGroup = null;
                }
                // 참조가 죽어 못 지운 미리보기 그룹을 이름으로 찾아 지운다
                try {
                    var groups = paths[0].parent.groupItems;
                    for (var i = groups.length - 1; i >= 0; i--) {
                        if (groups[i].name === PREVIEW_NAME) {
                            try { groups[i].remove(); } catch (e3) {}
                        }
                    }
                } catch (e4) {}
            }

            // -------------------------------------------------------
            // 도우미
            // -------------------------------------------------------
            function collectPaths(items, out) {
                if (!items) return;
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (item.typename === "PathItem") {
                        if (!item.guides && !item.clipping && item.pathPoints.length > 0) out.push(item);
                    } else if (item.typename === "GroupItem" || item.typename === "CompoundPathItem") {
                        collectPaths(item.pageItems || item.pathItems, out);
                    }
                }
            }

            function rangeValues(min, max, step) {
                var values = [];
                for (var v = min; v <= max + step / 2; v += step) values.push(Math.round(v * 100) / 100);
                return values;
            }

            function nearestIndex(values, value) {
                var best = 0;
                for (var i = 1; i < values.length; i++) {
                    if (Math.abs(values[i] - value) < Math.abs(values[best] - value)) best = i;
                }
                return best;
            }

            function makeGray(k) {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = k;
                } else {
                    color = new RGBColor();
                    var level = Math.round(255 * (1 - k / 100));
                    color.red = level; color.green = level; color.blue = level;
                }
                return color;
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function readSettings() {
                var result = { shape: 0, size: 1, fillK: 100, stroke: 0, lineWidth: 1, preview: true };
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v2" || p.length !== 7) return result;
                    var shape = Number(p[1]), size = Number(p[2]), fillK = Number(p[3]), stroke = Number(p[4]);
                    var lineWidth = Number(p[5]);
                    if (shape >= 0 && shape < SHAPES.length && shape === Math.round(shape)) result.shape = shape;
                    if (hasValue(SIZE_VALUES, size)) result.size = size;
                    if (hasValue(FILL_VALUES, fillK)) result.fillK = fillK;
                    if (hasValue(STROKE_VALUES, stroke)) result.stroke = stroke;
                    if (hasValue(LINE_VALUES, lineWidth)) result.lineWidth = lineWidth;
                    result.preview = (p[6] !== "0");
                } catch (e) {}
                return result;
            }

            function hasValue(values, value) {
                return isFinite(value) && values[nearestIndex(values, value)] === value;
            }

            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY,
                        ["v2", options.shape, options.size, options.fillK, options.stroke, options.lineWidth, options.preview ? 1 : 0].join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }

    // ==== 표 ====
    function makeTableEngine() {
        var api = {label: "표", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectTable/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var MAX_ROWS = 6;
            var MAX_COLS = 6;
            var SIZE_STEP_MM = 0.5;
            var SIZE_MIN_MM = 1;
            var SIZE_MAX_MM = 120;

            var doc = app.activeDocument;
            var source = getSelectedRectangle(doc.selection);
            if (source === null) return "가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.";

            var bounds = source.geometricBounds; // [left, top, right, bottom]
            var tableLeft = bounds[0];
            var tableTop = bounds[1];
            var tableWidthMm = (bounds[2] - bounds[0]) / MM_TO_PT;
            var tableHeightMm = (bounds[1] - bounds[3]) / MM_TO_PT;
            if (tableWidthMm <= 0 || tableHeightMm <= 0) return "가로와 세로 크기가 있는 사각형을 선택해주세요.";

            var rowCount = 3;
            var colCount = 3;
            // 각 줄이 바로 위의 켜진 줄을 따라갈지 여부. 전부 켜면 모든 줄이 첫 줄을 따라간다.
            var rowLinked = filledArray(MAX_ROWS, true);
            var colLinked = filledArray(MAX_COLS, true);
            var strokeWidthPt = 0.3;
            var headerK = 0;            // 1행 내부 음영. 0이면 채우지 않는다.
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;
            var sourceWasHidden = source.hidden;

            applySavedSettings();

            // 행 높이·열 너비는 선택한 사각형에서 나오는 값이라 저장하지 않고 매번 다시 나눈다
            var rowHeightsMm = seedSizes(tableHeightMm, rowCount, MAX_ROWS);
            var colWidthsMm = seedSizes(tableWidthMm, colCount, MAX_COLS);

            var LABEL_WIDTH = 52;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

            var countPanel = addPanel(dlg, "표");
            var rowCountField = addNumberField(countPanel, "행 수", "개", rowCount, 1, 1, MAX_ROWS, false);
            var colCountField = addNumberField(countPanel, "열 수", "개", colCount, 1, 1, MAX_COLS, false);
            var headerKField = addNumberField(countPanel, "1행 음영", "K", headerK, 10, 0, 100, false);

            var rowPanel = addPanel(dlg, "행 높이 (체크한 줄은 위 줄을 따라감)");
            var rowFields = [];
            for (var r = 0; r < MAX_ROWS; r++) {
                rowFields[r] = addNumberField(rowPanel, (r + 1) + "행", "mm", rowHeightsMm[r],
                    SIZE_STEP_MM, SIZE_MIN_MM, SIZE_MAX_MM, true);
                rowFields[r].check.value = rowLinked[r];
                bindSizeField(rowFields[r]);
            }

            var colPanel = addPanel(dlg, "열 너비 (체크한 줄은 왼쪽 줄을 따라감)");
            var colFields = [];
            for (var c = 0; c < MAX_COLS; c++) {
                colFields[c] = addNumberField(colPanel, (c + 1) + "열", "mm", colWidthsMm[c],
                    SIZE_STEP_MM, SIZE_MIN_MM, SIZE_MAX_MM, true);
                colFields[c].check.value = colLinked[c];
                bindSizeField(colFields[c]);
            }

            var linePanel = addPanel(dlg, "선");
            var strokeField = addNumberField(linePanel, "두께", "pt", strokeWidthPt, 0.1, 0.1, 3, false);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, false);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, false);
            // 위치는 표를 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);


            // 행·열 수가 바뀌면 사각형을 다시 균등하게 나눈다
            rowCountField.onCommit = function() {
                var next = readCount(rowCountField, rowCount, MAX_ROWS);
                if (next !== rowCount) {
                    rowCount = next;
                    reseedFields(rowFields, tableHeightMm, rowCount);
                }
                refreshSizeFields();
            };
            colCountField.onCommit = function() {
                var next = readCount(colCountField, colCount, MAX_COLS);
                if (next !== colCount) {
                    colCount = next;
                    reseedFields(colFields, tableWidthMm, colCount);
                }
                refreshSizeFields();
            };

            refreshSizeFields(true);
            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 사각형을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };
            api.commit = function() {
                if (!readFields(true)) return false;
                clearPreview();
                readFields(false);
                var finalGroup = drawTable();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "Table";
                try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
                source.remove();
                saveSettings();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            // 셀 하나가 테두리 사각형 하나. 인접한 셀은 변이 같은 자리에 겹치므로 선 굵기는 그대로다.
            function drawTable() {
                var group = doc.activeLayer.groupItems.add();
                var black = makeBlack();
                var y = tableTop;
                for (var i = 0; i < rowCount; i++) {
                    var height = rowHeightsMm[i] * MM_TO_PT;
                    var x = tableLeft;
                    for (var j = 0; j < colCount; j++) {
                        var width = colWidthsMm[j] * MM_TO_PT;
                        var cell = group.pathItems.rectangle(y, x, width, height);
                        if (i === 0 && headerK > 0) {
                            cell.filled = true;
                            cell.fillColor = makeGray(headerK);
                        } else {
                            cell.filled = false;
                        }
                        cell.stroked = true;
                        cell.strokeWidth = strokeWidthPt;
                        cell.strokeColor = black;
                        x += width;
                    }
                    y -= height;
                }
                return group;
            }

            function makeGray(k) {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = k;
                    return cmyk;
                }
                var value = Math.round(255 * (100 - k) / 100);
                var rgb = new RGBColor();
                rgb.red = value;
                rgb.green = value;
                rgb.blue = value;
                return rgb;
            }

            function makeBlack() {
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

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            // -------------------------------------------------------
            // 미리보기 · 입력
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                if (!readFields(false)) {
                    app.redraw();
                    return;
                }
                previewGroup = drawTable();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                previewGroup.name = "Table Preview";
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            function readFields(showAlert) {
                var rows = parseNumber(rowCountField.input.text);
                var cols = parseNumber(colCountField.input.text);
                var width = parseNumber(strokeField.input.text);
                var header = parseNumber(headerKField.input.text);
                var offX = parseNumber(offsetXField.input.text);
                var offY = parseNumber(offsetYField.input.text);

                if (rows === null || rows < 1 || rows > MAX_ROWS ||
                        cols === null || cols < 1 || cols > MAX_COLS) {
                    if (showAlert) alert("행 수와 열 수는 1부터 " + MAX_ROWS + " 사이의 정수로 입력해주세요.");
                    return false;
                }
                if (width === null || width < 0.1 || width > 3) {
                    if (showAlert) alert("선 두께는 0.1부터 3 사이로 입력해주세요.");
                    return false;
                }
                if (header === null || header < 0 || header > 100) {
                    if (showAlert) alert("1행 음영은 0부터 100 사이로 입력해주세요.");
                    return false;
                }
                if (offX === null || offX < -POSITION_LIMIT_MM || offX > POSITION_LIMIT_MM ||
                        offY === null || offY < -POSITION_LIMIT_MM || offY > POSITION_LIMIT_MM) {
                    if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " +
                        POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
                    return false;
                }

                var sizes = readSizeFields(rowFields, rowCount, showAlert, "행 높이");
                if (sizes === null) return false;
                rowHeightsMm = sizes;
                sizes = readSizeFields(colFields, colCount, showAlert, "열 너비");
                if (sizes === null) return false;
                colWidthsMm = sizes;

                rowCount = Math.round(rows);
                colCount = Math.round(cols);
                strokeWidthPt = width;
                headerK = header;
                offsetXmm = offX;
                offsetYmm = offY;
                readLinkedFlags();
                return true;
            }

            function readSizeFields(fields, count, showAlert, label) {
                var sizes = [];
                for (var i = 0; i < fields.length; i++) {
                    var value = parseNumber(fields[i].input.text);
                    if (i < count && (value === null || value < SIZE_MIN_MM || value > SIZE_MAX_MM)) {
                        if (showAlert) alert(label + "는 " + SIZE_MIN_MM + "부터 " +
                            SIZE_MAX_MM + "mm 사이로 입력해주세요.");
                        return null;
                    }
                    sizes.push(value === null ? SIZE_MIN_MM : value);
                }
                return sizes;
            }

            function readCount(field, fallback, maximum) {
                var value = parseNumber(field.input.text);
                if (value === null || value < 1 || value > maximum) return fallback;
                return Math.round(value);
            }

            function readLinkedFlags() {
                var i;
                for (i = 0; i < rowFields.length; i++) rowLinked[i] = rowFields[i].check.value;
                for (i = 0; i < colFields.length; i++) colLinked[i] = colFields[i].check.value;
            }

            // -------------------------------------------------------
            // 줄 잇기: 연속으로 켜진 구간에서 맨 앞 줄이 나머지를 이끈다
            // -------------------------------------------------------
            // 켜진 줄이면서 바로 앞 줄도 켜져 있으면 따라가는 줄이다
            function isFollower(linked, index) {
                return index > 0 && linked[index] && linked[index - 1];
            }

            function leaderIndexOf(linked, index) {
                var leader = 0;
                for (var i = 1; i <= index; i++) {
                    if (!isFollower(linked, i)) leader = i;
                }
                return leader;
            }

            function syncLinkedFields(fields, linked, count) {
                for (var i = 1; i < count; i++) {
                    if (!isFollower(linked, i)) continue;
                    var value = parseNumber(fields[leaderIndexOf(linked, i)].input.text);
                    if (value === null) continue;
                    setFieldValue(fields[i], clampSize(value));
                }
            }

            // 크기 필드 하나에 값 변경·체크 변경 동작을 붙인다
            function bindSizeField(field) {
                field.onCommit = function() { refreshSizeFields(); };
                field.check.onClick = function() { refreshSizeFields(); };
            }

            // 체크 상태를 읽어 따라가는 줄을 채우고 잠근 뒤 미리보기를 다시 그린다
            function refreshSizeFields(skipPreview) {
                readLinkedFlags();
                syncLinkedFields(rowFields, rowLinked, rowCount);
                syncLinkedFields(colFields, colLinked, colCount);
                updateSizeFieldState();
                if (skipPreview !== true) updatePreview();
            }

            // 쓰지 않는 줄은 통째로, 따라가는 줄은 입력만 잠근다(체크박스는 계속 누를 수 있어야 한다)
            function updateSizeFieldState() {
                var i;
                for (i = 0; i < rowFields.length; i++) {
                    setFieldState(rowFields[i], i < rowCount, isFollower(rowLinked, i));
                }
                for (i = 0; i < colFields.length; i++) {
                    setFieldState(colFields[i], i < colCount, isFollower(colLinked, i));
                }
            }

            function setFieldState(field, inUse, follower) {
                field.row.enabled = inUse;
                var editable = inUse && !follower;
                field.input.enabled = editable;
                field.slider.enabled = editable;
                if (field.check) field.check.enabled = inUse;
            }

            // 선택한 사각형을 균등하게 나눈 값으로 채운다.
            // 0.5mm 격자에 맞추면 합이 사각형과 어긋나므로 나눈 값을 그대로 쓴다.
            function seedSizes(totalMm, count, maximum) {
                var each = clampSize(totalMm / count);
                var sizes = [];
                for (var i = 0; i < maximum; i++) sizes.push(each);
                return sizes;
            }

            function reseedFields(fields, totalMm, count) {
                var each = clampSize(totalMm / count);
                for (var i = 0; i < fields.length; i++) setFieldValue(fields[i], each);
            }

            function clampSize(value) {
                if (value < SIZE_MIN_MM) return SIZE_MIN_MM;
                if (value > SIZE_MAX_MM) return SIZE_MAX_MM;
                return value;
            }

            function filledArray(length, value) {
                var out = [];
                for (var i = 0; i < length; i++) out.push(value);
                return out;
            }

            // 가로·세로 변이 축에 나란한 사각형만 받는다 (기울어진 사각형은 경계 상자와 어긋난다)
            function getSelectedRectangle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
                if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;

                var xs = [];
                var ys = [];
                for (var i = 0; i < 4; i++) {
                    var point = item.pathPoints[i];
                    // 곡선 손잡이가 있으면 사각형이 아니다
                    if (point.leftDirection[0] !== point.anchor[0] ||
                            point.leftDirection[1] !== point.anchor[1] ||
                            point.rightDirection[0] !== point.anchor[0] ||
                            point.rightDirection[1] !== point.anchor[1]) return null;
                    pushDistinct(xs, point.anchor[0]);
                    pushDistinct(ys, point.anchor[1]);
                }
                if (xs.length !== 2 || ys.length !== 2) return null;
                return item;
            }

            function pushDistinct(values, value) {
                for (var i = 0; i < values.length; i++) {
                    if (Math.abs(values[i] - value) < 0.01) return;
                }
                values.push(value);
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function addPanel(parent, title) {
                var panel = parent.add("panel", undefined, title);
                panel.orientation = "column";
                panel.alignChildren = "left";
                panel.spacing = 4;
                panel.margins = [10, 14, 10, 8];
                return panel;
            }

            function addNumberField(parent, labelText, unit, value, step, minimum, maximum, withCheck) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var check = null;
                if (withCheck) check = row.add("checkbox", undefined, "");
                var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.characters = 5;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;

                var field = {row: row, check: check, input: input, slider: slider, step: step,
                    minimum: minimum, maximum: maximum, syncing: false};

                slider.onChanging = function() {
                    if (field.syncing) return;
                    var stepped = Math.round(slider.value / field.step) * field.step;
                    input.text = formatValue(clampField(field, stepped));
                    commitField(field);
                };
                input.onChanging = function() { commitField(field); };
                input.onChange = function() {
                    var parsed = parseNumber(input.text);
                    if (parsed === null) parsed = field.minimum;
                    parsed = clampField(field, parsed);
                    input.text = formatValue(parsed);
                    field.syncing = true;
                    slider.value = parsed;
                    field.syncing = false;
                    commitField(field);
                };
                return field;
            }

            // 값이 바뀌었을 때 할 일은 필드마다 다르다. 지정이 없으면 미리보기만 다시 그린다.
            function commitField(field) {
                if (field.onCommit) field.onCommit();
                else updatePreview();
            }

            // 위치 필드는 표를 다시 만들지 않고 미리보기만 옮긴다
            function bindOffsetField(field, isX) {
                field.onCommit = function() {
                    var value = parseNumber(field.input.text);
                    if (value === null) return;
                    value = clampField(field, value);
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                };
            }

            function setFieldValue(field, value) {
                field.input.text = formatValue(value);
                field.syncing = true;
                field.slider.value = value;
                field.syncing = false;
            }

            function clampField(field, value) {
                if (value < field.minimum) value = field.minimum;
                if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
                return value;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (normalized === "") return null;
                var value = Number(normalized);
                return isFinite(value) ? value : null;
            }

            function formatValue(value) {
                return String(Math.round(value * 100) / 100);
            }

            // -------------------------------------------------------
            // 설정 기억 (행 높이·열 너비는 사각형에서 나오므로 저장하지 않는다)
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v3", rowCount, colCount,
                    flagsToText(rowLinked), flagsToText(colLinked),
                    strokeWidthPt, offsetXmm, offsetYmm, headerK];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v3" || p.length < 9) return;

                var rows = parseInt(p[1], 10);
                var cols = parseInt(p[2], 10);
                var width = parseFloat(p[5]);
                var offX = parseFloat(p[6]);
                var offY = parseFloat(p[7]);
                if (rows >= 1 && rows <= MAX_ROWS) rowCount = rows;
                if (cols >= 1 && cols <= MAX_COLS) colCount = cols;
                textToFlags(p[3], rowLinked);
                textToFlags(p[4], colLinked);
                if (width >= 0.1 && width <= 3) strokeWidthPt = width;
                if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
                if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
                var header = parseFloat(p[8]);
                if (header >= 0 && header <= 100) headerK = header;
            }

            function flagsToText(flags) {
                var text = "";
                for (var i = 0; i < flags.length; i++) text += flags[i] ? "1" : "0";
                return text;
            }

            function textToFlags(text, flags) {
                if (!text || text.length !== flags.length) return;
                for (var i = 0; i < flags.length; i++) flags[i] = (text.charAt(i) === "1");
            }
            return null;
        }
        return api;
    }

    // ==== 점선 분할선 ====
    function makeDashedGridEngine() {
        var api = {label: "점선 분할선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectDashedGrid/settings";
            var STROKE_WIDTH = 0.3;
            var DASH_PATTERN = [2, 1];
            var MIN_COUNT = 1;
            var MAX_COUNT = 50;

            var doc = app.activeDocument;
            var source = getSelectedRectangle(doc.selection);
            if (source === null) return "가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.";
            var bounds = source.geometricBounds; // [left, top, right, bottom]

            var options = readSettings();
            var win = page;

            var panel = win.add("panel", undefined, "행 · 열");
            panel.alignChildren = "fill";
            panel.spacing = 2;
            addRow(panel, "행 수", "rows", MIN_COUNT, MAX_COUNT, 1, "개");
            addRow(panel, "열 수", "cols", MIN_COUNT, MAX_COUNT, 1, "개");
            addRow(panel, "선 색 (K)", "k", 0, 100, 10, "%");

            // 이 탭은 미리보기가 없다. 확인을 누르면 바로 그린다
            api.commit = function() {
                try {
                    drawDividers();
                    saveSettings();
                    return true;
                } catch (e) {
                    alert("점선을 만들지 못했습니다: " + e + " (" + e.line + "행)");
                    return false;
                }
            };

            // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장)
            function addRow(parent, label, key, min, max, step, unit) {
                var row = parent.add("group");
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = 50;
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 4;
                var slider = row.add("scrollbar", undefined, options[key], min, max);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = 196;
                function apply(value) {
                    value = Math.round(value / step) * step;
                    if (!isFinite(value) || value < min || value > max) {
                        input.text = String(options[key]);
                        return;
                    }
                    options[key] = value;
                    slider.value = value;
                    input.text = String(value);
                }
                slider.onChanging = function() { apply(slider.value); };
                slider.onChange = function() { apply(slider.value); };
                input.onChange = function() { apply(Number(input.text)); };
            }

            // 사각형 안에 (행-1)개의 가로 점선, (열-1)개의 세로 점선을 등간격으로 넣고 그룹으로 묶는다
            function drawDividers() {
                var left = bounds[0], top = bounds[1], right = bounds[2], bottom = bounds[3];
                var group = source.parent.groupItems.add();
                group.name = "DashedGrid";
                group.move(source, ElementPlacement.PLACEBEFORE);
                var lines = [];
                for (var r = 1; r < options.rows; r++) {
                    var y = top - (top - bottom) * r / options.rows;
                    lines.push(addLine(group, [[left, y], [right, y]]));
                }
                for (var c = 1; c < options.cols; c++) {
                    var x = left + (right - left) * c / options.cols;
                    lines.push(addLine(group, [[x, top], [x, bottom]]));
                }
                if (lines.length === 0) {
                    group.remove();
                    return;
                }
                applyDashPatternToItems(lines, DASH_PATTERN, false);
                doc.selection = null;
                group.selected = true;
            }

            function addLine(container, points) {
                var line = container.pathItems.add();
                line.setEntirePath(points);
                line.closed = false;
                line.filled = false;
                line.stroked = true;
                line.strokeColor = makeGray(options.k);
                line.strokeWidth = STROKE_WIDTH;
                return line;
            }

            // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
            function makeGray(k) {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = k;
                } else {
                    color = new RGBColor();
                    var level = Math.round(255 * (1 - k / 100));
                    color.red = level; color.green = level; color.blue = level;
                }
                return color;
            }

            // Object_Table.jsx와 같은 판정: 곡선 손잡이 없는 닫힌 4점 축 정렬 사각형
            function getSelectedRectangle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
                if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
                var xs = [];
                var ys = [];
                for (var i = 0; i < 4; i++) {
                    var point = item.pathPoints[i];
                    if (point.leftDirection[0] !== point.anchor[0] ||
                            point.leftDirection[1] !== point.anchor[1] ||
                            point.rightDirection[0] !== point.anchor[0] ||
                            point.rightDirection[1] !== point.anchor[1]) return null;
                    pushDistinct(xs, point.anchor[0]);
                    pushDistinct(ys, point.anchor[1]);
                }
                if (xs.length !== 2 || ys.length !== 2) return null;
                return item;
            }

            function pushDistinct(values, value) {
                for (var i = 0; i < values.length; i++) {
                    if (Math.abs(values[i] - value) < 0.01) return;
                }
                values.push(value);
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function readSettings() {
                var result = { rows: 2, cols: 2, k: 100 };
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v2" || p.length !== 4) return result;
                    var rows = Number(p[1]), cols = Number(p[2]), k = Number(p[3]);
                    if (!isFinite(rows) || !isFinite(cols) || !isFinite(k)) return result;
                    if (rows < MIN_COUNT || rows > MAX_COUNT || cols < MIN_COUNT || cols > MAX_COUNT) return result;
                    if (k < 0 || k > 100) return result;
                    result.rows = Math.round(rows);
                    result.cols = Math.round(cols);
                    result.k = Math.round(k / 10) * 10;
                } catch (e) {}
                return result;
            }

            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY, ["v2", options.rows, options.cols, options.k].join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }
    // ==== 모델 곡선 ====
    // 사각형을 그래프 영역으로 삼아 과학 교과서의 이상적 모델 곡선(정규분포·생장 곡선·하디-바인베르크 등)을 그린다.
    // 사각형 너비가 x 0→1, 높이가 y 0→1이고 종류마다 y를 [0, 1]로 정규화해 봉우리·점근선을 높이 %로 조절한다.
    function makeModelCurvesEngine() {
        var api = {label: "모델 곡선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectModelCurves/settings";
            var MM = 2.834645669;
            var SEGMENTS = 16;      // 곡선 하나를 호길이로 등분하는 조각 수. 극값 고정점은 따로 더한다
            var SAMPLES = 512;      // 호길이 표·극값 탐색 표본 수
            var DASH_PATTERN = [2, 1];
            var WIDTH_STEP = 0.1;
            var WIDTH_SLIDER_MAX = 2;
            var WIDTH_MAX = 100;
            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var MAX_PARAM_ROWS = 4;
            var MAX_FLAGS = 3;

            // 곡선 종류. params는 숫자 행, flags는 체크박스, build(값들, 체크들)→그릴 곡선 목록.
            // 곡선은 curve(f(x)→y, 시작 x, 끝 x) / hump(...)처럼 고정점을 직접 두는 조각 / dashedLine(점근선).
            var TYPES = [
                { label: "정규분포",
                  params: [param("중심 위치", "%", 0, 100, 1, 50), param("폭 σ", "%", 1, 50, 1, 15), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var mean = p[0] / 100, sigma = p[1] / 100, height = p[2] / 100;
                      return [curve(function(x) { var d = (x - mean) / sigma; return height * Math.exp(-d * d / 2); })];
                  } },
                { label: "이론적 생장 곡선 (J형, 지수)",
                  params: [param("가파름", "", 0.5, 10, 0.5, 4), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var rate = p[0], height = p[1] / 100, top = Math.exp(rate) - 1;
                      return [curve(function(x) { return height * (Math.exp(rate * x) - 1) / top; })];
                  } },
                { label: "실제 생장 곡선 (S형, 로지스틱)",
                  params: [param("환경 수용력 K", "%", 1, 100, 1, 80), param("가파름", "", 1, 30, 1, 10), param("변곡점 위치", "%", 0, 100, 1, 50)],
                  flags: [flag("K 점선", true)],
                  build: function(p, f) {
                      var capacity = p[0] / 100, rate = p[1], middle = p[2] / 100;
                      var list = [curve(function(x) { return capacity / (1 + Math.exp(-rate * (x - middle))); })];
                      if (f[0]) list.push(dashedLine(0, capacity, 1, capacity));
                      return list;
                  } },
                { label: "하디-바인베르크 (p², 2pq, q²)",
                  params: [],
                  flags: [flag("AA (p²)", true), flag("Aa (2pq)", true), flag("aa (q²)", true)],
                  build: function(p, f) {
                      var list = [];
                      if (f[0]) list.push(curve(function(x) { return x * x; }));
                      if (f[1]) list.push(curve(function(x) { return 2 * x * (1 - x); }));
                      if (f[2]) list.push(curve(function(x) { return (1 - x) * (1 - x); }));
                      return list;
                  } },
                { label: "효소 반응 속도 (미카엘리스-멘텐)",
                  params: [param("Vmax", "%", 1, 100, 1, 90), param("Km 위치", "%", 1, 100, 1, 20)],
                  flags: [flag("Vmax 점선", true)],
                  build: function(p, f) {
                      var vmax = p[0] / 100, km = p[1] / 100;
                      var list = [curve(function(x) { return vmax * x / (km + x); })];
                      if (f[0]) list.push(dashedLine(0, vmax, 1, vmax));
                      return list;
                  } },
                { label: "산소 해리 곡선 (힐 식)",
                  params: [param("P50 위치", "%", 1, 100, 1, 26), param("힐 계수 n", "", 1, 5, 0.1, 2.7), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var p50 = p[0] / 100, n = p[1], height = p[2] / 100, kn = Math.pow(p50, n);
                      return [curve(function(x) { var xn = Math.pow(x, n); return height * xn / (kn + xn); })];
                  } },
                { label: "생존 곡선 (Ⅰ·Ⅱ·Ⅲ형)",
                  params: [param("곡률", "", 1.5, 8, 0.5, 4)],
                  flags: [flag("Ⅰ형", true), flag("Ⅱ형", true), flag("Ⅲ형", true)],
                  build: function(p, f) {
                      var k = p[0], list = [];
                      if (f[0]) list.push(curve(function(x) { return 1 - Math.pow(x, k); }));
                      if (f[1]) list.push(curve(function(x) { return 1 - x; }));
                      if (f[2]) list.push(curve(function(x) { return Math.pow(1 - x, k); }));
                      return list;
                  } },
                { label: "활성화 에너지 (반응 좌표)",
                  params: [param("반응물 높이", "%", 0, 100, 1, 40), param("생성물 높이", "%", 0, 100, 1, 20),
                      param("활성화 에너지", "%", 1, 100, 1, 50), param("촉매 Ea", "%", 1, 100, 1, 25)],
                  flags: [flag("촉매 곡선", true)],
                  build: function(p, f) {
                      var list = [hump(p[0] / 100, p[1] / 100, p[2] / 100)];
                      if (f[0]) list.push(hump(p[0] / 100, p[1] / 100, p[3] / 100));
                      return list;
                  } },
                { label: "지수 감소 (반감기)",
                  params: [param("반감기 위치", "%", 1, 100, 1, 25), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var rate = Math.LN2 / (p[0] / 100), height = p[1] / 100;
                      return [curve(function(x) { return height * Math.exp(-rate * x); })];
                  } },
                { label: "맥스웰-볼츠만 분포",
                  params: [param("봉우리 위치", "%", 5, 95, 1, 30), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var peak = p[0] / 100, height = p[1] / 100;
                      return [curve(function(x) { var u = x / peak; return height * u * u * Math.exp(1 - u * u); })];
                  } },
                { label: "반비례 (보일 법칙)",
                  params: [param("시작 위치", "%", 1, 90, 1, 20), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var start = p[0] / 100, height = p[1] / 100;
                      return [curve(function(x) { return height * start / x; }, start, 1)];
                  } },
                { label: "거듭제곱 (y = xⁿ)",
                  params: [param("지수 n", "", 0.2, 6, 0.1, 2), param("높이", "%", 1, 100, 1, 100)],
                  flags: [],
                  build: function(p) {
                      var n = p[0], height = p[1] / 100;
                      return [curve(function(x) { return height * Math.pow(x, n); })];
                  } }
            ];

            function param(label, unit, min, max, step, initial) {
                return {label: label, unit: unit, min: min, max: max, step: step, initial: initial};
            }
            function flag(label, initial) { return {label: label, initial: initial}; }
            function curve(fn, from, to) {
                return {fn: fn, from: from === undefined ? 0 : from, to: to === undefined ? 1 : to};
            }
            function dashedLine(x0, y0, x1, y1) {
                return {segments: [[[x0, y0], [x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 3], [x1 - (x1 - x0) / 3, y1 - (y1 - y0) / 3], [x1, y1]]], dashed: true};
            }
            // 반응 좌표 도표: 반응물 평탄 구간 → 봉우리(반응물 + Ea) → 생성물 평탄 구간. 손잡이는 모두 수평이라 매끈하다
            function hump(reactant, product, activation) {
                var flat = 0.12, peakX = 0.5, peakY = reactant + activation;
                function straight(x0, y0, x1, y1) {
                    return [[x0, y0], [x0 + (x1 - x0) / 3, y0], [x1 - (x1 - x0) / 3, y1], [x1, y1]];
                }
                function bend(x0, y0, x1, y1) {
                    return [[x0, y0], [x0 + (x1 - x0) / 2, y0], [x1 - (x1 - x0) / 2, y1], [x1, y1]];
                }
                return {segments: [
                    straight(0, reactant, flat, reactant),
                    bend(flat, reactant, peakX, peakY),
                    bend(peakX, peakY, 1 - flat, product),
                    straight(1 - flat, product, 1, product)
                ]};
            }

            var doc = app.activeDocument;
            var rect = getSelectedRectangle(doc.selection);
            if (rect === null) return "그래프 영역이 될 사각형 하나를 선택해주세요. 가로·세로 변이 축에 나란해야 합니다.";
            var bounds = rect.geometricBounds; // [left, top, right, bottom]
            var boxLeft = bounds[0], boxBottom = bounds[3];
            var boxWidth = bounds[2] - bounds[0], boxHeight = bounds[1] - bounds[3];
            if (boxWidth <= 0 || boxHeight <= 0) return "너비와 높이가 0보다 큰 사각형을 선택해주세요.";
            var rectWasHidden = rect.hidden;

            var typeIndex = 0;
            var values = [], flagValues = [];
            for (var t = 0; t < TYPES.length; t++) {
                values.push([]);
                flagValues.push([]);
                for (var pi = 0; pi < TYPES[t].params.length; pi++) values[t].push(TYPES[t].params[pi].initial);
                for (var fi = 0; fi < TYPES[t].flags.length; fi++) flagValues[t].push(TYPES[t].flags[fi].initial);
            }
            var strokeWidthPt = 0.3;
            var keepRect = true;
            var offsetXmm = 0, offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;

            applySavedSettings();

            var LABEL_WIDTH = 112;
            var SLIDER_WIDTH = 196;
            var dlg = page;

            var typeRow = dlg.add("group");
            typeRow.add("statictext", undefined, "곡선 종류:");
            var typeList = typeRow.add("dropdownlist", undefined, []);
            for (t = 0; t < TYPES.length; t++) typeList.add("item", TYPES[t].label);
            typeList.preferredSize.width = 250;
            typeList.selection = typeIndex;

            // 숫자 행·체크박스는 최대 개수만큼 만들어 두고 종류에 따라 라벨·범위만 바꾼다
            var optionPanel = addPanel(dlg, "옵션");
            var paramFields = [];
            for (pi = 0; pi < MAX_PARAM_ROWS; pi++) paramFields.push(addNumberField(optionPanel, "", "", 0, 1, 0, 1));
            var flagRow = optionPanel.add("group");
            flagRow.spacing = 12;
            var flagChecks = [];
            for (fi = 0; fi < MAX_FLAGS; fi++) {
                var check = flagRow.add("checkbox", undefined, "");
                check.preferredSize.width = 100;   // 나중에 바뀌는 글자가 잘리지 않게 폭을 미리 잡는다
                check.onClick = updatePreview;
                flagChecks.push(check);
            }

            var strokePanel = addPanel(dlg, "선");
            var widthField = addNumberField(strokePanel, "두께", "pt", strokeWidthPt, WIDTH_STEP, 0, WIDTH_SLIDER_MAX);
            widthField.maximum = WIDTH_MAX;
            var keepCheck = strokePanel.add("checkbox", undefined, "사각형 유지 (끄면 확정할 때 지움)");
            keepCheck.value = keepRect;
            keepCheck.onClick = updatePreview;

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, OFFSET_STEP_MM, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, OFFSET_STEP_MM, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            // 위치는 곡선을 다시 만들지 않고 미리보기만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);

            applyTypeToRows();
            typeList.onChange = function() {
                if (!typeList.selection || typeList.selection.index === typeIndex) return;
                readFields(false);
                typeIndex = typeList.selection.index;
                applyTypeToRows();
                updatePreview();
            };

            // 탭 호스트가 부르는 훅
            api.setPreview = function(on) {
                previewEnabled = on;
                rect.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                rect.hidden = rectWasHidden;
                rect.selected = true;
            };
            api.commit = function() {
                if (!readFields(true)) return false;
                if (currentSpecs().length === 0) {
                    alert("그릴 곡선이 없습니다. 곡선을 하나 이상 켜주세요.");
                    return false;
                }
                clearPreview();
                var group = buildGroup();
                moveItem(group, offsetXmm * MM, offsetYmm * MM);
                group.name = "Model Curve";
                rect.hidden = rectWasHidden;
                if (!keepRect) rect.remove();
                saveSettings();
                doc.selection = null;
                group.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 곡선 만들기
            // -------------------------------------------------------
            function currentSpecs() {
                return TYPES[typeIndex].build(values[typeIndex], flagValues[typeIndex]);
            }

            function buildGroup() {
                var specs = currentSpecs();
                var group = rect.parent.groupItems.add();
                try { group.move(rect, ElementPlacement.PLACEBEFORE); } catch (e) {}
                for (var i = 0; i < specs.length; i++) {
                    var path = drawSegments(group, specSegments(specs[i], boxWidth, boxHeight), boxLeft, boxBottom);
                    if (specs[i].dashed) try { path.strokeDashes = DASH_PATTERN; } catch (e2) {}
                }
                return group;
            }

            // 곡선 하나를 베지어 조각 목록 [[P0, P1, P2, P3], ...]으로. 좌표는 사각형 왼쪽 아래 기준 pt
            function specSegments(spec, width, height) {
                if (spec.fn) return fitCurve(spec, width, height);
                var scaled = [];
                for (var i = 0; i < spec.segments.length; i++) {
                    var seg = [];
                    for (var j = 0; j < 4; j++) seg.push([spec.segments[i][j][0] * width, spec.segments[i][j][1] * height]);
                    scaled.push(seg);
                }
                return scaled;
            }

            // y = f(x)를 표본으로 훑어 호길이 표를 만들고, 극값에는 고정점을 꼭 두고 나머지는 호길이로 등분한다.
            // 조각마다 접선 방향은 도함수에서, 손잡이 길이는 조각 중점이 곡선 위에 오도록 푼다.
            function fitCurve(spec, width, height) {
                var fn = spec.fn, from = spec.from, to = spec.to;
                var xs = [], px = [], py = [], cum = [0], i;
                for (i = 0; i <= SAMPLES; i++) {
                    var x = from + (to - from) * i / SAMPLES;
                    xs.push(x);
                    px.push(x * width);
                    py.push(fn(x) * height);
                    if (i > 0) cum.push(cum[i - 1] + Math.sqrt((px[i] - px[i - 1]) * (px[i] - px[i - 1]) + (py[i] - py[i - 1]) * (py[i] - py[i - 1])));
                }
                var total = cum[SAMPLES];

                var critical = [from];
                for (i = 1; i < SAMPLES; i++) {
                    if ((py[i] - py[i - 1]) * (py[i + 1] - py[i]) < 0) critical.push(refineExtremum(fn, xs[i - 1], xs[i + 1]));
                }
                critical.push(to);

                var anchors = [from];
                for (i = 1; i < critical.length; i++) {
                    var s0 = lengthAt(critical[i - 1]), s1 = lengthAt(critical[i]);
                    var pieces = Math.max(1, Math.round(SEGMENTS * (s1 - s0) / total));
                    for (var j = 1; j < pieces; j++) anchors.push(xAtLength(s0 + (s1 - s0) * j / pieces));
                    anchors.push(critical[i]);
                }

                var segments = [];
                for (i = 1; i < anchors.length; i++) {
                    var middle = xAtLength((lengthAt(anchors[i - 1]) + lengthAt(anchors[i])) / 2);
                    segments.push(fitSegment(fn, from, to, anchors[i - 1], anchors[i], middle, width, height));
                }
                return segments;

                function lengthAt(x) {
                    var t = (x - from) / (to - from) * SAMPLES;
                    var k = Math.floor(t);
                    if (k >= SAMPLES) return total;
                    if (k < 0) return 0;
                    return cum[k] + (cum[k + 1] - cum[k]) * (t - k);
                }
                function xAtLength(s) {
                    var lo = 0, hi = SAMPLES;
                    while (hi - lo > 1) {
                        var mid = (lo + hi) >> 1;
                        if (cum[mid] <= s) lo = mid; else hi = mid;
                    }
                    var span = cum[hi] - cum[lo];
                    return xs[lo] + (xs[hi] - xs[lo]) * (span > 0 ? (s - cum[lo]) / span : 0);
                }
            }

            // 기울기 부호가 바뀌는 [a, b] 안에서 극값 위치를 이분법으로 좁힌다
            function refineExtremum(fn, a, b) {
                var h = (b - a) * 0.001;
                var risingAtA = fn(a + h) - fn(a) > 0;
                for (var i = 0; i < 40; i++) {
                    var m = (a + b) / 2;
                    if ((fn(m + h) - fn(m - h) > 0) === risingAtA) a = m; else b = m;
                }
                return (a + b) / 2;
            }

            // 단위 접선. 정의역 끝에서는 한쪽 차분을 쓴다
            function tangentAt(fn, from, to, x, width, height) {
                var h = (to - from) * 0.000001;
                var a = Math.max(from, x - h), b = Math.min(to, x + h);
                var dx = (b - a) * width, dy = (fn(b) - fn(a)) * height;
                var length = Math.sqrt(dx * dx + dy * dy);
                if (length < 0.000000000001) return [1, 0];
                return [dx / length, dy / length];
            }

            // 조각의 베지어 중점 B(0.5)가 곡선의 호길이 중점과 같아지도록 손잡이 길이를 푼다.
            //   B(0.5) = (P0+P3)/2 + (3/8)(a·d0 − b·d1)
            // 접선이 나란하면(직선) 풀리지 않으므로 현 길이의 1/3로 둔다.
            function fitSegment(fn, from, to, x0, x1, xm, width, height) {
                var p0 = [x0 * width, fn(x0) * height], p3 = [x1 * width, fn(x1) * height];
                var d0 = tangentAt(fn, from, to, x0, width, height), d1 = tangentAt(fn, from, to, x1, width, height);
                var chord = Math.sqrt((p3[0] - p0[0]) * (p3[0] - p0[0]) + (p3[1] - p0[1]) * (p3[1] - p0[1]));
                var a = chord / 3, b = chord / 3;
                var wantX = (xm * width - (p0[0] + p3[0]) / 2) * 8 / 3;
                var wantY = (fn(xm) * height - (p0[1] + p3[1]) / 2) * 8 / 3;
                var determinant = d1[0] * d0[1] - d0[0] * d1[1];
                if (Math.abs(determinant) > 0.000001) {
                    var outOf = (d1[0] * wantY - d1[1] * wantX) / determinant;
                    var into = (d0[0] * wantY - d0[1] * wantX) / determinant;
                    if (isFinite(outOf) && isFinite(into) && outOf > 0 && into > 0 && outOf < chord * 2 && into < chord * 2) {
                        a = outOf;
                        b = into;
                    }
                }
                return [p0, [p0[0] + d0[0] * a, p0[1] + d0[1] * a], [p3[0] - d1[0] * b, p3[1] - d1[1] * b], p3];
            }

            function drawSegments(container, segments, originX, originY) {
                var anchors = [], i;
                for (i = 0; i < segments.length; i++) anchors.push([originX + segments[i][0][0], originY + segments[i][0][1]]);
                var lastSegment = segments[segments.length - 1];
                anchors.push([originX + lastSegment[3][0], originY + lastSegment[3][1]]);

                var path = container.pathItems.add();
                path.setEntirePath(anchors);
                path.closed = false;
                for (i = 0; i < anchors.length; i++) {
                    var point = path.pathPoints[i];
                    var left = i > 0 ? segments[i - 1][2] : null;
                    var right = i < segments.length ? segments[i][1] : null;
                    point.leftDirection = left ? [originX + left[0], originY + left[1]] : anchors[i];
                    point.rightDirection = right ? [originX + right[0], originY + right[1]] : anchors[i];
                    point.pointType = (i === 0 || i === segments.length) ? PointType.CORNER : PointType.SMOOTH;
                }
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = strokeWidthPt;
                path.strokeColor = makeBlack();
                return path;
            }

            // K 100 검정. RGB 문서면 검정 RGB
            function makeBlack() {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = 100;
                } else {
                    color = new RGBColor();
                    color.red = 0; color.green = 0; color.blue = 0;
                }
                return color;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (!readFields(false)) {
                    app.redraw();
                    return;
                }
                rect.hidden = (previewEnabled && !keepRect) ? true : rectWasHidden;
                if (!previewEnabled || currentSpecs().length === 0) {
                    app.redraw();
                    return;
                }
                previewGroup = buildGroup();
                moveItem(previewGroup, offsetXmm * MM, offsetYmm * MM);
                previewGroup.name = "Model Curve Preview";
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            // -------------------------------------------------------
            // 입력
            // -------------------------------------------------------
            // 종류에 맞춰 숫자 행·체크박스의 라벨과 범위를 바꾼다. 안 쓰는 행은 숨긴다
            function applyTypeToRows() {
                var type = TYPES[typeIndex];
                for (var i = 0; i < MAX_PARAM_ROWS; i++) {
                    var field = paramFields[i];
                    var used = i < type.params.length;
                    field.row.visible = used;
                    if (!used) continue;
                    var p = type.params[i];
                    field.label.text = p.label + (p.unit ? " (" + p.unit + "):" : ":");
                    field.step = p.step;
                    field.minimum = p.min;
                    field.maximum = p.max;
                    field.slider.minvalue = p.min;
                    field.slider.maxvalue = p.max;
                    field.slider.stepdelta = p.step;
                    field.slider.jumpdelta = p.step * 10;
                    field.input.text = formatValue(values[typeIndex][i]);
                    syncSlider(field, values[typeIndex][i]);
                }
                for (i = 0; i < MAX_FLAGS; i++) {
                    var usedFlag = i < type.flags.length;
                    flagChecks[i].visible = usedFlag;
                    if (usedFlag) {
                        flagChecks[i].text = type.flags[i].label;
                        flagChecks[i].value = flagValues[typeIndex][i];
                    }
                }
            }

            function readFields(showAlert) {
                var type = TYPES[typeIndex];
                for (var i = 0; i < type.params.length; i++) {
                    var p = type.params[i];
                    var value = parseNumber(paramFields[i].input.text);
                    if (value === null || value < p.min || value > p.max) {
                        if (showAlert) alert(p.label + "은(는) " + p.min + "부터 " + p.max + p.unit + " 사이로 입력해주세요.");
                        return false;
                    }
                    values[typeIndex][i] = value;
                }
                for (i = 0; i < type.flags.length; i++) flagValues[typeIndex][i] = flagChecks[i].value;
                var width = parseNumber(widthField.input.text);
                if (width === null || width < 0 || width > WIDTH_MAX) {
                    if (showAlert) alert("선 두께는 0부터 " + WIDTH_MAX + "pt 사이로 입력해주세요.");
                    return false;
                }
                strokeWidthPt = width;
                keepRect = keepCheck.value;
                return true;
            }

            // -------------------------------------------------------
            // 설정 기억: v1 | 종류 | 두께 | 사각형 유지 | 가로 | 세로 | 종류별 "값,값;체크,체크" × 종류 수
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v1", typeIndex, strokeWidthPt, keepRect ? 1 : 0, offsetXmm, offsetYmm];
                for (var t = 0; t < TYPES.length; t++) {
                    var bits = [];
                    for (var i = 0; i < flagValues[t].length; i++) bits.push(flagValues[t][i] ? 1 : 0);
                    parts.push(values[t].join(",") + ";" + bits.join(","));
                }
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var parts = String(raw).split("|");
                if (parts[0] !== "v1" || parts.length !== 6 + TYPES.length) return;
                var type = parseInt(parts[1], 10);
                if (isFinite(type) && type >= 0 && type < TYPES.length) typeIndex = type;
                var width = parseNumber(parts[2]);
                if (width !== null && width >= 0 && width <= WIDTH_MAX) strokeWidthPt = width;
                keepRect = parts[3] !== "0";
                var offX = parseNumber(parts[4]), offY = parseNumber(parts[5]);
                if (offX !== null && Math.abs(offX) <= POSITION_LIMIT_MM) offsetXmm = offX;
                if (offY !== null && Math.abs(offY) <= POSITION_LIMIT_MM) offsetYmm = offY;
                // 종류별 값은 개수와 범위가 맞는 것만 살린다
                for (var t = 0; t < TYPES.length; t++) {
                    var halves = parts[6 + t].split(";");
                    var numbers = halves[0] === "" ? [] : halves[0].split(",");
                    var bits = (halves.length < 2 || halves[1] === "") ? [] : halves[1].split(",");
                    if (numbers.length !== TYPES[t].params.length || bits.length !== TYPES[t].flags.length) continue;
                    var restored = [], ok = true;
                    for (var i = 0; i < numbers.length; i++) {
                        var value = parseNumber(numbers[i]);
                        if (value === null || value < TYPES[t].params[i].min || value > TYPES[t].params[i].max) { ok = false; break; }
                        restored.push(value);
                    }
                    if (!ok) continue;
                    values[t] = restored;
                    for (i = 0; i < bits.length; i++) flagValues[t][i] = bits[i] === "1";
                }
            }

            // -------------------------------------------------------
            // 선택
            // -------------------------------------------------------
            function getSelectedRectangle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
                if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
                var xs = [];
                var ys = [];
                for (var i = 0; i < 4; i++) {
                    var point = item.pathPoints[i];
                    if (point.leftDirection[0] !== point.anchor[0] ||
                            point.leftDirection[1] !== point.anchor[1] ||
                            point.rightDirection[0] !== point.anchor[0] ||
                            point.rightDirection[1] !== point.anchor[1]) return null;
                    pushDistinct(xs, point.anchor[0]);
                    pushDistinct(ys, point.anchor[1]);
                }
                if (xs.length !== 2 || ys.length !== 2) return null;
                return item;
            }

            function pushDistinct(list, value) {
                for (var i = 0; i < list.length; i++) {
                    if (Math.abs(list[i] - value) < 0.01) return;
                }
                list.push(value);
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function addPanel(parent, title) {
                var panel = parent.add("panel", undefined, title);
                panel.orientation = "column";
                panel.alignChildren = "left";
                panel.spacing = 4;
                panel.margins = [10, 14, 10, 8];
                return panel;
            }

            // 숫자 조절 행: 라벨 (단위): | 입력창 | 스크롤바(‹ › 내장)
            function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.spacing = 6;
                var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.characters = 6;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;

                var field = {row: row, label: label, input: input, slider: slider, step: step,
                    minimum: minimum, maximum: maximum, syncing: false};

                slider.onChanging = function() {
                    if (field.syncing) return;
                    input.text = formatValue(clampValue(roundToStep(slider.value, field.step), field.minimum, field.maximum));
                    commitField(field);
                };
                input.onChanging = function() { commitField(field); };
                input.onChange = function() {
                    var parsed = parseNumber(input.text);
                    if (parsed === null) parsed = field.minimum;
                    parsed = clampValue(parsed, field.minimum, field.maximum);
                    input.text = formatValue(parsed);
                    syncSlider(field, parsed);
                    commitField(field);
                };
                return field;
            }

            function commitField(field) {
                if (field.onCommit) field.onCommit();
                else updatePreview();
            }

            function bindOffsetField(field, isX) {
                field.onCommit = function() {
                    var value = parseNumber(field.input.text);
                    if (value === null) return;
                    value = clampValue(value, field.minimum, field.maximum);
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                };
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            // 슬라이더 범위를 넘는 값은 입력칸에만 남기고 슬라이더는 끝에 붙여 둔다
            function syncSlider(field, value) {
                field.syncing = true;
                field.slider.value = clampValue(value, field.slider.minvalue, field.slider.maxvalue);
                field.syncing = false;
            }

            function clampValue(value, minimum, maximum) {
                if (value < minimum) return minimum;
                if (value > maximum) return maximum;
                return value;
            }

            function roundToStep(value, step) {
                return Math.round(value / step) * step;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (normalized === "") return null;
                var value = Number(normalized);
                return isFinite(value) ? value : null;
            }

            function formatValue(value) {
                return String(Math.round(value * 100) / 100);
            }
            return null;
        }
        return api;
    }

    // ==== 태양 스펙트럼 ====
    // 대기 밖과 지표면에서의 태양 복사 에너지 스펙트럼 그래프.
    //   - 데이터: ASTM G173-03 표준 스펙트럼(NREL). 대기 밖 = extraterrestrial, 지표면 = global tilt(AM1.5), 5 nm 간격.
    //     200~275 nm의 대기 밖 값은 ASTM E490 값으로 보강해 곡선이 0 근처에서 시작한다.
    //   - 단순화: 가우시안 평활(σ, nm). 고정점은 Douglas-Peucker로 줄이고 핸들은 Catmull-Rom으로 잇는다.
    //   - 흡수 영역: 지표면 곡선의 어깨(투과율 극대) 사이 골짜기를 닫힌 면으로 만든다.
    //     자외선(오존)과 적외선(수증기·CO₂)은 색이 다르고, 위쪽 경계는 대기 밖 곡선 또는 포락선 중 고른다.
    // 선택이 없어도 동작한다(화면 중앙). 사각형 하나를 선택하면 그 사각형이 그래프 영역이 되고 확인할 때 지워진다.
    function makeSolarSpectrumEngine() {
        var api = {label: "태양 스펙트럼", error: null, standalone: true, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectSolarSpectrum/settings";
            var MM = 2.834645669;
            // 화살표 이름은 Illustrator UI 언어를 따른다 (한국어판 기준)
            var ARROW_NAME = "화살표 1";

            // ASTM G173-03 (NREL) 스펙트럼. 200~4000 nm, 5 nm 간격, 단위 mW/m²/nm
            var LAMBDA_MIN = 200;
            var LAMBDA_STEP = 5;
            var ET_DATA = [
                11, 17, 23, 40, 58, 62, 67, 65, 63, 67, 70, 100, 130, 181, 232, 157, 82, 176, 563, 527, 458, 642,
                533, 685, 775, 829, 1110, 1010, 1054, 916, 1012, 1141, 1089, 1097, 1293, 985, 1152, 1080, 1252,
                1245, 1689, 1715, 1537, 1769, 1599, 1755, 1212, 1709, 1830, 1965, 2069, 2001, 1997, 1984, 1939,
                2080, 2068, 1979, 2032, 2051, 1916, 1947, 1910, 1875, 1860, 1928, 1892, 1895, 1800, 1874, 1863,
                1889, 1786, 1849, 1828, 1834, 1834, 1836, 1722, 1778, 1770, 1773, 1724, 1712, 1711, 1644, 1665,
                1652, 1613, 1627, 1526, 1523, 1558, 1567, 1534, 1499, 1494, 1465, 1479, 1435, 1422, 1433, 1404,
                1350, 1349, 1347, 1336, 1327, 1283, 1292, 1274, 1277, 1259, 1245, 1215, 1208, 1193, 1187, 1170,
                1128, 1125, 1100, 1110, 1109, 1074, 1070, 1056, 1048, 1050, 1036, 910, 927, 1000, 974, 977, 936,
                949, 955, 942, 926, 914, 918, 895, 888, 885, 876, 869, 856, 840, 824, 829, 769, 806, 796, 791, 773,
                775, 771, 757, 754, 743, 684, 731, 711, 701, 699, 692, 684, 674, 668, 661, 658, 648, 645, 622, 618,
                623, 612, 604, 583, 600, 591, 587, 582, 569, 570, 564, 563, 556, 550, 546, 547, 529, 535, 529, 519,
                522, 516, 506, 506, 500, 502, 492, 490, 484, 479, 475, 466, 460, 456, 459, 453, 450, 443, 442, 441,
                435, 429, 419, 419, 415, 410, 407, 392, 399, 394, 385, 386, 374, 380, 371, 368, 365, 366, 359, 357,
                357, 352, 347, 348, 339, 340, 340, 337, 333, 333, 323, 327, 313, 319, 318, 312, 314, 312, 310, 303,
                306, 306, 301, 301, 301, 271, 294, 288, 288, 278, 267, 278, 269, 278, 270, 267, 265, 267, 261, 247,
                264, 262, 242, 258, 253, 247, 233, 244, 234, 237, 237, 237, 226, 225, 228, 224, 224, 221, 222, 216,
                206, 213, 208, 211, 205, 204, 199, 202, 198, 197, 193, 182, 190, 186, 185, 185, 182, 181, 180, 176,
                176, 174, 174, 171, 168, 169, 169, 155, 160, 163, 159, 158, 156, 153, 153, 151, 149, 147, 146, 132,
                147, 146, 140, 138, 140, 139, 137, 136, 135, 134, 131, 132, 130, 120, 126, 128, 126, 123, 124, 122,
                120, 119, 120, 117, 117, 115, 115, 114, 112, 112, 110, 109, 107, 108, 106, 105, 103, 102, 101, 101,
                99, 98, 98, 96, 96, 96, 95, 94, 93, 92, 92, 91, 91, 90, 90, 89, 88, 82, 85, 86, 85, 85, 83, 83, 83,
                81, 81, 80, 80, 79, 78, 78, 77, 76, 75, 74, 74, 73, 73, 73, 71, 71, 71, 69, 70, 69, 69, 68, 68, 66,
                66, 66, 65, 65, 64, 63, 63, 63, 62, 61, 62, 59, 60, 60, 60, 59, 59, 57, 58, 57, 57, 56, 56, 56, 55,
                54, 55, 54, 53, 53, 52, 52, 52, 49, 51, 51, 50, 49, 48, 48, 48, 47, 47, 47, 46, 46, 45, 45, 45, 44,
                44, 43, 43, 43, 43, 43, 43, 42, 42, 41, 41, 41, 40, 40, 40, 40, 39, 39, 39, 39, 38, 38, 38, 37, 37,
                37, 37, 37, 36, 36, 36, 36, 36, 35, 35, 35, 35, 34, 34, 34, 34, 33, 33, 33, 33, 33, 32, 32, 32, 32,
                32, 31, 31, 31, 31, 30, 30, 30, 30, 29, 29, 29, 29, 29, 29, 29, 29, 28, 28, 28, 28, 27, 27, 27, 27,
                27, 26, 26, 26, 26, 26, 26, 26, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 23, 23,
                23, 23, 23, 23, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 20, 20, 20, 20, 20, 20,
                20, 20, 20, 20, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 17, 17,
                17, 17, 17, 17, 17, 17, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15,
                15, 15, 15, 15, 15, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 13, 13, 13, 13, 13,
                13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
                12, 12, 12, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 10, 10,
                10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                9, 9, 9, 9, 9, 9, 9, 9
            ];
            var GROUND_DATA = [
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 16, 51, 136, 205, 279, 471, 464,
                502, 459, 528, 611, 598, 624, 755, 589, 701, 674, 797, 808, 1114, 1151, 1049, 1226, 1123, 1249,
                875, 1245, 1350, 1462, 1560, 1522, 1529, 1535, 1508, 1619, 1618, 1568, 1622, 1649, 1545, 1564,
                1548, 1531, 1524, 1578, 1545, 1554, 1483, 1544, 1540, 1563, 1474, 1520, 1482, 1478, 1502, 1532,
                1371, 1431, 1475, 1490, 1469, 1470, 1474, 1403, 1392, 1446, 1434, 1457, 1359, 1350, 1399, 1421,
                1420, 1396, 1397, 1375, 1182, 1271, 1282, 1321, 1318, 1259, 986, 1038, 1129, 1218, 1220, 1250,
                1234, 1238, 266, 686, 1161, 1177, 1164, 1159, 1091, 1093, 1073, 1055, 1056, 895, 862, 969, 916,
                1003, 1016, 1017, 894, 913, 988, 963, 968, 927, 940, 944, 924, 814, 743, 817, 625, 678, 744, 711,
                432, 251, 472, 368, 147, 341, 421, 504, 635, 590, 605, 688, 732, 752, 735, 682, 719, 708, 699, 698,
                691, 682, 672, 665, 655, 648, 636, 629, 605, 593, 597, 593, 556, 521, 486, 506, 479, 250, 142, 144,
                71, 15, 256, 146, 122, 313, 286, 389, 459, 452, 441, 407, 462, 447, 448, 437, 453, 428, 458, 462,
                460, 465, 461, 457, 457, 451, 431, 396, 387, 412, 422, 424, 413, 405, 353, 384, 301, 286, 259, 322,
                229, 231, 168, 109, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 26, 62, 21, 40, 50, 27, 66, 85,
                93, 50, 185, 61, 125, 175, 183, 251, 184, 271, 266, 265, 259, 255, 267, 265, 277, 270, 268, 266,
                267, 242, 240, 245, 259, 242, 258, 238, 237, 218, 241, 234, 238, 237, 234, 215, 218, 225, 222, 223,
                212, 222, 214, 206, 213, 205, 210, 200, 198, 188, 190, 187, 178, 174, 162, 168, 155, 166, 153, 160,
                133, 142, 115, 101, 77, 89, 47, 32, 15, 10, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 1, 1, 4, 3, 11, 17, 10, 22, 29, 49, 68, 76, 83, 86, 81, 38, 15, 40, 27, 45, 74, 85, 96,
                90, 91, 68, 55, 69, 62, 66, 77, 87, 85, 89, 90, 86, 93, 90, 92, 88, 89, 90, 90, 91, 89, 85, 85, 84,
                76, 82, 80, 82, 75, 79, 79, 71, 74, 79, 76, 78, 75, 76, 74, 73, 71, 72, 68, 67, 68, 65, 64, 66, 63,
                63, 61, 59, 59, 64, 58, 52, 56, 57, 58, 46, 51, 42, 47, 50, 49, 31, 44, 43, 31, 37, 41, 44, 34, 34,
                27, 27, 33, 45, 15, 43, 21, 14, 25, 33, 24, 17, 16, 8, 6, 4, 3, 7, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 3, 1, 0, 3, 1, 3, 1, 6, 6, 2, 1, 5, 2, 5, 7, 0, 1, 1, 7, 10, 4, 8, 3, 7, 6, 1, 8, 6, 2, 2, 4, 1,
                0, 6, 3, 2, 6, 4, 2, 2, 1, 4, 1, 1, 2, 10, 3, 6, 11, 3, 3, 7, 6, 9, 14, 13, 9, 11, 8, 4, 3, 0, 0,
                0, 0, 2, 0, 0, 7, 4, 1, 3, 10, 1, 2, 1, 6, 3, 11, 9, 1, 2, 4, 4, 0, 0, 4, 5, 9, 3, 4, 8, 4, 5, 7,
                4, 8, 5, 7, 10, 10, 13, 4, 7, 7, 13, 10, 9, 12, 8, 11, 11, 8, 13, 10, 12, 11, 11, 12, 10, 12, 12,
                12, 12, 11, 12, 11, 11, 9, 9, 10, 11, 9, 11, 11, 8, 9, 10, 9, 9, 10, 10, 10, 9, 9, 12, 10, 10, 10,
                11, 11, 10, 11, 11, 10, 8, 5, 8, 9, 10, 10, 11, 11, 9, 9, 10, 11, 9, 9, 9, 10, 9, 9, 9, 9, 9, 9,
                10, 9, 8, 9, 10, 9, 8, 8, 10, 10, 10, 8, 9, 9, 9, 9, 8, 8, 7, 7, 7, 7, 7, 7, 8, 8, 7, 7, 7, 7, 7,
                7, 7, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7
            ];

            // 흡수띠 후보 구간(nm). 양끝은 ±40 nm 안에서 투과율(지표면/대기 밖)이 가장 큰 어깨로 옮긴다.
            // 산소·수증기 0.72/0.76, 수증기 0.82, 0.94, 1.13, 1.38, 1.87, 수증기·CO₂ 2.5~2.9 µm
            var NOMINAL_BANDS = [[680, 780], [790, 860], [860, 1010], [1060, 1200], [1280, 1560], [1700, 2100], [2300, 3300]];
            var SHOULDER_SEARCH_NM = 40;
            var MIN_BAND_DEPTH = 0.03;      // 포락선 대비 골 깊이가 이보다 얕으면(평활로 사라지면) 면을 만들지 않는다
            var UV_END_NM = 400;            // 자외선·가시광선 경계
            var VISIBLE_END_NM = 700;       // 가시광선·적외선 경계
            var SIMPLIFY_TOLERANCE_MM = 0.1;
            var PEAK_HEIGHT_RATIO = 0.92;   // 대기 밖 곡선 봉우리가 차지하는 그래프 높이 비율
            var AXIS_MARGIN_MM = 3;         // 축이 그래프 영역보다 더 나가는 길이(화살촉 자리)
            var TICK_LENGTH_MM = 1;
            var TEXT_GAP_MM = 1;
            var RANGE_GAP_MM = 2;           // 파장 영역 화살표와 위쪽 글자 사이

            var doc = app.activeDocument;
            // 사각형이 선택되어 있으면 그래프 영역, 아니면 화면 중앙. 다른 선택은 무시한다
            var rect = getSelectedRectangle(doc.selection);
            var rectWasHidden = rect !== null && rect.hidden;
            var viewCenter = doc.activeView.centerPoint;
            var centerX = viewCenter[0];
            var centerY = viewCenter[1];

            // 옵션 (설정 저장 대상)
            var widthMm = 80;
            var heightMm = 50;
            var maxUm = 3;
            var sigmaNm = 15;
            var strokePt = 0.4;
            var showGround = true;
            var showUV = true;
            var showBands = true;
            var fillToET = true;
            var showTicks = true;
            var showLegend = true;
            var showRanges = true;
            var POSITION_LIMIT_MM = 100;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;

            var WIDTH_RANGE = [30, 200];
            var HEIGHT_RANGE = [20, 150];
            var MAX_UM_RANGE = [1.5, 4];
            var SIGMA_RANGE = [0, 60];
            var STROKE_RANGE = [0.2, 1.5];

            applySavedSettings();
            // 사각형이 크기를 정할 때도 저장되는 기본 크기는 그대로 둔다
            var defaultWidthMm = widthMm;
            var defaultHeightMm = heightMm;
            if (rect !== null) {
                var rectBounds = rect.geometricBounds; // [left, top, right, bottom]
                widthMm = Math.round((rectBounds[2] - rectBounds[0]) / MM * 100) / 100;
                heightMm = Math.round((rectBounds[1] - rectBounds[3]) / MM * 100) / 100;
            }

            var black = makeColor(0, 0, 0, 100);
            var etColor = makeColor(0, 100, 100, 0);
            var uvColor = makeColor(70, 40, 0, 0);
            var bandColor = makeColor(60, 0, 90, 0);
            var tickFont = getFont("GSMediumB1");
            var korFont = getFont("SpoqaHanSansNeo-Regular");

            var LABEL_WIDTH = 84;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

            var sizePanel = addPanel(dlg, "크기");
            // 사각형이 있으면 크기는 사각형이 정한다. 값이 범위 밖이면 확인에서 걸린다
            var widthField = addNumberField(sizePanel, "폭", "mm", widthMm, 1, WIDTH_RANGE[0], WIDTH_RANGE[1]);
            var heightField = addNumberField(sizePanel, "높이", "mm", heightMm, 1, HEIGHT_RANGE[0], HEIGHT_RANGE[1]);
            if (rect !== null) {
                widthField.row.enabled = false;
                heightField.row.enabled = false;
                widthField.input.helpTip = "선택한 사각형의 크기";
                heightField.input.helpTip = "선택한 사각형의 크기";
            }
            var maxUmField = addNumberField(sizePanel, "최대 파장", "µm", maxUm, 0.5, MAX_UM_RANGE[0], MAX_UM_RANGE[1]);

            var curvePanel = addPanel(dlg, "곡선");
            var sigmaField = addNumberField(curvePanel, "단순화", "nm", sigmaNm, 1, SIGMA_RANGE[0], SIGMA_RANGE[1]);
            sigmaField.input.helpTip = "가우시안 평활 폭. 0이면 데이터 그대로, 클수록 잔 요철과 얕은 흡수 골이 사라진다";
            var strokeField = addNumberField(curvePanel, "선 두께", "pt", strokePt, 0.1, STROKE_RANGE[0], STROKE_RANGE[1]);

            var showPanel = addPanel(dlg, "표시");
            var showRow1 = showPanel.add("group");
            var groundCheck = showRow1.add("checkbox", undefined, "지표면 곡선");
            var uvCheck = showRow1.add("checkbox", undefined, "오존 흡수 영역");
            var bandCheck = showRow1.add("checkbox", undefined, "수증기·CO₂ 흡수 영역");
            groundCheck.value = showGround;
            uvCheck.value = showUV;
            bandCheck.value = showBands;
            uvCheck.enabled = showGround;
            bandCheck.enabled = showGround;
            var showRow2 = showPanel.add("group");
            var tickCheck = showRow2.add("checkbox", undefined, "눈금 숫자");
            var legendCheck = showRow2.add("checkbox", undefined, "축 범례");
            var rangeCheck = showRow2.add("checkbox", undefined, "파장 영역 화살표");
            tickCheck.value = showTicks;
            legendCheck.value = showLegend;
            rangeCheck.value = showRanges;
            rangeCheck.helpTip = "자외선·가시광선·적외선 구간을 축 아래에 양쪽 화살표로 표시한다. 화살촉은 확인할 때 붙는다";
            var fillRow = showPanel.add("group");
            fillRow.add("statictext", undefined, "흡수 영역 위쪽:");
            var fillToETRadio = fillRow.add("radiobutton", undefined, "대기 밖 곡선까지");
            var fillToEnvelopeRadio = fillRow.add("radiobutton", undefined, "포락선까지");
            fillToETRadio.value = fillToET;
            fillToEnvelopeRadio.value = !fillToET;
            fillToETRadio.helpTip = "교과서 그림처럼 흡수 영역이 대기 밖 곡선에 닿는다";
            fillToEnvelopeRadio.helpTip = "지표면 곡선의 어깨끼리 이은 포락선까지만 채운다. 두 곡선 사이 흰 틈은 산란 손실";

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);

            groundCheck.onClick = function() {
                showGround = groundCheck.value;
                uvCheck.enabled = showGround;
                bandCheck.enabled = showGround;
                updatePreview();
            };
            uvCheck.onClick = function() { showUV = uvCheck.value; updatePreview(); };
            bandCheck.onClick = function() { showBands = bandCheck.value; updatePreview(); };
            tickCheck.onClick = function() { showTicks = tickCheck.value; updatePreview(); };
            legendCheck.onClick = function() { showLegend = legendCheck.value; updatePreview(); };
            rangeCheck.onClick = function() { showRanges = rangeCheck.value; updatePreview(); };
            fillToETRadio.onClick = function() { fillToET = true; updatePreview(); };
            fillToEnvelopeRadio.onClick = function() { fillToET = false; updatePreview(); };

            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 사각형을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                if (rect !== null) {
                    rect.hidden = true;
                    rect.selected = false;
                }
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                if (rect !== null) {
                    rect.hidden = rectWasHidden;
                    rect.selected = true;
                }
            };
            api.commit = function() {
                if (!readFields(true)) return false;
                clearPreview();
                var finalGroup = drawSpectrum(true);
                moveItem(finalGroup, offsetXmm * MM, offsetYmm * MM);
                finalGroup.name = "Solar Spectrum";
                if (rect !== null) rect.remove();
                saveSettings();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            function drawSpectrum(isFinal) {
                var group = doc.activeLayer.groupItems.add();
                var plotW = widthMm * MM;
                var plotH = heightMm * MM;
                var originX, originY;
                if (rect !== null) {
                    var bounds = rect.geometricBounds;
                    originX = bounds[0];
                    originY = bounds[3];
                    plotW = bounds[2] - bounds[0];
                    plotH = bounds[1] - bounds[3];
                } else {
                    originX = centerX - plotW / 2;
                    originY = centerY - plotH / 2;
                }
                var maxNm = maxUm * 1000;
                var axisMargin = AXIS_MARGIN_MM * MM;
                var tolerance = SIMPLIFY_TOLERANCE_MM * MM;
                var count = Math.min(ET_DATA.length, Math.floor((maxNm - LAMBDA_MIN) / LAMBDA_STEP) + 1);

                var etSmooth = gaussianSmooth(ET_DATA, sigmaNm);
                var groundSmooth = gaussianSmooth(GROUND_DATA, sigmaNm);
                var peak = 0;
                for (var p = 0; p < count; p++) if (etSmooth[p] > peak) peak = etSmooth[p];

                function xAt(index) { return originX + (LAMBDA_MIN + index * LAMBDA_STEP) / maxNm * plotW; }
                function xOfNm(nm) { return originX + nm / maxNm * plotW; }
                function yAt(value) { return originY + value / peak * plotH * PEAK_HEIGHT_RATIO; }
                function toPoints(values) {
                    var pts = [];
                    for (var i = 0; i < count; i++) pts.push([xAt(i), yAt(values[i])]);
                    return pts;
                }

                // 흡수 영역의 양끝은 두 곡선 모두의 고정점이어야 면의 아래·위 변이 곡선과 정확히 겹친다
                var bands = (showGround && showBands) ? findBands(groundSmooth, etSmooth, count) : [];
                var uv = (showGround && showUV) ? uvBand(groundSmooth, etSmooth, count, fillToET ? indexOfNm(UV_END_NM, count) : -1) : null;
                var forced = [];
                if (uv !== null) forced.push(uv.ib);
                for (var b = 0; b < bands.length; b++) forced.push(bands[b].ia, bands[b].ib);

                var etPoints = toPoints(etSmooth);
                var etAnchors = smoothAnchors(etPoints, simplifyIndices(etPoints, tolerance, fillToET ? forced : []));
                var groundAnchors = null;
                if (showGround) {
                    var groundPoints = toPoints(groundSmooth);
                    groundAnchors = smoothAnchors(groundPoints, simplifyIndices(groundPoints, tolerance, forced));
                }

                var fillGroup = group.groupItems.add();
                fillGroup.name = "Absorption";
                var axisGroup = group.groupItems.add();
                axisGroup.name = "Axes";
                var curveGroup = group.groupItems.add();
                curveGroup.name = "Curves";
                var labelGroup = group.groupItems.add();
                labelGroup.name = "Labels";

                // ---- 흡수 영역: 아래 변은 지표면 곡선 그대로, 위 변은 대기 밖 곡선(뒤집음) 또는 포락선 ----
                function addFill(band, color) {
                    var bottom = subPath(groundAnchors, band.ia, band.ib);
                    var top;
                    if (fillToET) {
                        top = reversePath(subPath(etAnchors, band.ia, band.ib));
                    } else {
                        var envPoints = [];
                        for (var k = band.ia; k <= band.ib; k++) envPoints.push([xAt(k), yAt(band.env[k - band.ia])]);
                        top = reversePath(smoothAnchors(envPoints, simplifyIndices(envPoints, tolerance, [])));
                    }
                    var path = addPath(fillGroup, joinParts([bottom, top]), true);
                    path.stroked = false;
                    path.filled = true;
                    path.fillColor = color;
                }
                if (uv !== null) addFill(uv, uvColor);
                for (var f = 0; f < bands.length; f++) addFill(bands[f], bandColor);

                // ---- 축: L자 (위 → 원점 → 오른쪽), 눈금은 0.5 µm마다 ----
                var axis = axisGroup.pathItems.add();
                axis.setEntirePath([
                    [originX, originY + plotH + axisMargin],
                    [originX, originY],
                    [originX + plotW + axisMargin, originY]
                ]);
                strokeOnly(axis, black, strokePt);

                var textBottom = originY - TEXT_GAP_MM * MM;  // 글자를 쌓아 내려갈 기준선
                for (var um = 0; um <= maxUm + 1e-9; um += 0.5) {
                    var tickX = xOfNm(um * 1000);
                    if (um > 0) {
                        var tick = axisGroup.pathItems.add();
                        tick.setEntirePath([[tickX, originY], [tickX, originY + TICK_LENGTH_MM * MM]]);
                        strokeOnly(tick, black, strokePt);
                    }
                    if (showTicks) {
                        var label = addText(labelGroup, um === 0 ? "0" : um.toFixed(1), tickFont, false);
                        var placed = placeGlyph(label, tickX, originY - TEXT_GAP_MM * MM, "center");
                        if (placed[3] < textBottom) textBottom = placed[3];
                    }
                }

                if (showLegend) {
                    var xLegend = addText(labelGroup, "파장(µm)", korFont, false);
                    var xLegendBounds = placeGlyph(xLegend, originX + plotW + axisMargin, textBottom - TEXT_GAP_MM * MM, "right");
                    textBottom = xLegendBounds[3];
                    var yLegend = addText(labelGroup, "복사 에너지의 세기(상대값)", korFont, true);
                    placeGlyph(yLegend, originX - TEXT_GAP_MM * MM, originY + plotH, "right");
                }

                // ---- 파장 영역: 자외선 | 가시광선 | 적외선 양쪽 화살표 ----
                var rangeLines = [];
                if (showRanges) {
                    var rangeY = textBottom - RANGE_GAP_MM * MM;
                    var ranges = [[0, UV_END_NM, "자외선"], [UV_END_NM, VISIBLE_END_NM, "가시광선"], [VISIBLE_END_NM, maxNm, "적외선"]];
                    for (var r = 0; r < ranges.length; r++) {
                        var fromNm = ranges[r][0];
                        var toNm = Math.min(ranges[r][1], maxNm);
                        if (toNm - fromNm < 1) continue;
                        var line = axisGroup.pathItems.add();
                        line.setEntirePath([[xOfNm(fromNm), rangeY], [xOfNm(toNm), rangeY]]);
                        strokeOnly(line, black, strokePt);
                        rangeLines.push(line);
                        addRangeLabel(ranges[r][2], xOfNm(fromNm), xOfNm(toNm), rangeY - TEXT_GAP_MM * MM);
                    }
                }

                // 영역 글자. 칸보다 넓으면 교과서처럼 두 줄로 나눈다 (가시광선 → 가시/광선)
                function addRangeLabel(text, fromX, toX, top) {
                    var label = addText(labelGroup, text, korFont, false);
                    try { label.textRange.paragraphAttributes.justification = Justification.CENTER; } catch (e) {}
                    var bounds = placeGlyph(label, (fromX + toX) / 2, top, "center");
                    if (bounds[2] - bounds[0] > toX - fromX - 0.5 * MM && text.length >= 4) {
                        var half = Math.floor(text.length / 2);
                        label.contents = text.substring(0, half) + "\r" + text.substring(half);
                        placeGlyph(label, (fromX + toX) / 2, top, "center");
                    }
                }

                // ---- 곡선: 지표면(검정) 위에 대기 밖(빨강) ----
                if (groundAnchors !== null) strokeOnly(addPath(curveGroup, groundAnchors, false), black, strokePt);
                strokeOnly(addPath(curveGroup, etAnchors, false), etColor, strokePt);

                // 축·영역 화살촉: DOM에 노출되지 않는 속성이라 액션으로 적용. 미리보기에서는 생략
                if (isFinal) applyArrowheads([axis].concat(rangeLines), strokePt);

                return group;
            }

            // -------------------------------------------------------
            // 데이터 → 고정점 (순수 계산)
            // -------------------------------------------------------
            function indexOfNm(nm, count) {
                var index = Math.round((nm - LAMBDA_MIN) / LAMBDA_STEP);
                if (index < 0) index = 0;
                if (index > count - 1) index = count - 1;
                return index;
            }

            function gaussianSmooth(values, sigmaNm) {
                if (sigmaNm <= 0) return values.slice(0);
                var s = sigmaNm / LAMBDA_STEP;
                var half = Math.ceil(3 * s);
                var kernel = [];
                for (var k = -half; k <= half; k++) kernel.push(Math.exp(-0.5 * (k / s) * (k / s)));
                var out = [];
                for (var i = 0; i < values.length; i++) {
                    var acc = 0;
                    var weightSum = 0;
                    for (var m = -half; m <= half; m++) {
                        var j = i + m;
                        if (j < 0 || j >= values.length) continue;
                        acc += values[j] * kernel[m + half];
                        weightSum += kernel[m + half];
                    }
                    out.push(acc / weightSum);
                }
                return out;
            }

            // 투과율 = 지표면 / 대기 밖. 대기 밖이 0인 곳은 0
            function transmission(ground, et, count) {
                var ratio = [];
                for (var i = 0; i < count; i++) ratio.push(et[i] > 1e-9 ? ground[i] / et[i] : 0);
                return ratio;
            }

            // 후보 구간마다 양끝을 어깨(투과율 극대)로 옮기고, 어깨 사이 투과율을 직선으로 이어 만든 포락선 아래 골을 흡수 영역으로 본다.
            // 돌려주는 값: {ia, ib, env} — env[k]는 인덱스 ia+k에서 위 변의 값(지표면 값 이상)
            function findBands(ground, et, count) {
                var ratio = transmission(ground, et, count);
                function snap(nm) {
                    var best = indexOfNm(nm, count);
                    for (var i = indexOfNm(nm - SHOULDER_SEARCH_NM, count); i <= indexOfNm(nm + SHOULDER_SEARCH_NM, count); i++) {
                        if (ratio[i] > ratio[best]) best = i;
                    }
                    return best;
                }
                var bands = [];
                for (var n = 0; n < NOMINAL_BANDS.length; n++) {
                    if (NOMINAL_BANDS[n][0] >= LAMBDA_MIN + (count - 1) * LAMBDA_STEP) continue;
                    var ia = snap(NOMINAL_BANDS[n][0]);
                    var ib = snap(NOMINAL_BANDS[n][1]);
                    if (ib - ia < 2) continue;
                    var env = [];
                    var depth = 0;
                    for (var i = ia; i <= ib; i++) {
                        var r = ratio[ia] + (ratio[ib] - ratio[ia]) * (i - ia) / (ib - ia);
                        var top = Math.max(ground[i], et[i] * r);
                        env.push(top);
                        if (top > 1e-9) depth = Math.max(depth, (top - ground[i]) / top);
                    }
                    if (depth >= MIN_BAND_DEPTH) bands.push({ia: ia, ib: ib, env: env});
                }
                return bands;
            }

            // 자외선(오존) 영역: 가시광선 쪽 투과율을 자외선으로 연장한 포락선 아래.
            // endIndex가 0 이상이면 그 인덱스에서 끝내고, 아니면 380~460 nm의 투과율 극대에서 끝낸다
            function uvBand(ground, et, count, endIndex) {
                var ratio = transmission(ground, et, count);
                var ib = indexOfNm(UV_END_NM, count);
                for (var i = indexOfNm(380, count); i <= indexOfNm(460, count); i++) if (ratio[i] > ratio[ib]) ib = i;
                var shoulder = ratio[ib];
                if (endIndex >= 0) ib = endIndex;
                var env = [];
                for (var k = 0; k <= ib; k++) env.push(Math.max(ground[k], et[k] * shoulder));
                return {ia: 0, ib: ib, env: env};
            }

            // Douglas-Peucker. forced 인덱스와 양끝은 반드시 남긴다. 남길 인덱스를 오름차순으로 돌려준다
            function simplifyIndices(points, tolerance, forced) {
                var n = points.length;
                var keep = [];
                for (var i = 0; i < n; i++) keep.push(false);
                keep[0] = true;
                keep[n - 1] = true;
                for (var f = 0; f < forced.length; f++) keep[forced[f]] = true;

                var stack = [];
                var previous = 0;
                for (var s = 1; s < n; s++) {
                    if (!keep[s]) continue;
                    stack.push([previous, s]);
                    previous = s;
                }
                while (stack.length > 0) {
                    var segment = stack.pop();
                    var a = segment[0];
                    var b = segment[1];
                    if (b - a < 2) continue;
                    var ax = points[a][0], ay = points[a][1];
                    var dx = points[b][0] - ax, dy = points[b][1] - ay;
                    var length = Math.sqrt(dx * dx + dy * dy) || 1;
                    var farthest = -1;
                    var farthestDistance = -1;
                    for (var m = a + 1; m < b; m++) {
                        var distance = Math.abs(dy * (points[m][0] - ax) - dx * (points[m][1] - ay)) / length;
                        if (distance > farthestDistance) {
                            farthestDistance = distance;
                            farthest = m;
                        }
                    }
                    if (farthestDistance > tolerance) {
                        keep[farthest] = true;
                        stack.push([a, farthest], [farthest, b]);
                    }
                }
                var indices = [];
                for (var k = 0; k < n; k++) if (keep[k]) indices.push(k);
                return indices;
            }

            // 남긴 점들을 Catmull-Rom(현 길이 매개화)으로 이어 고정점·핸들을 만든다. 양끝 핸들은 고정점에 붙인다
            function smoothAnchors(points, indices) {
                var anchors = [];
                for (var i = 0; i < indices.length; i++) {
                    var current = points[indices[i]];
                    var anchor = {a: current.slice(0), l: current.slice(0), r: current.slice(0), idx: indices[i]};
                    if (i > 0 && i < indices.length - 1) {
                        var before = points[indices[i - 1]];
                        var after = points[indices[i + 1]];
                        var dIn = distance(before, current);
                        var dOut = distance(current, after);
                        var tx = (after[0] - before[0]) / (dIn + dOut);
                        var ty = (after[1] - before[1]) / (dIn + dOut);
                        anchor.l = [current[0] - tx * dIn / 3, current[1] - ty * dIn / 3];
                        anchor.r = [current[0] + tx * dOut / 3, current[1] + ty * dOut / 3];
                    }
                    anchors.push(anchor);
                }
                return anchors;
            }

            function distance(p, q) {
                var dx = q[0] - p[0], dy = q[1] - p[1];
                return Math.sqrt(dx * dx + dy * dy) || 1e-9;
            }

            function copyAnchor(anchor) {
                return {a: anchor.a.slice(0), l: anchor.l.slice(0), r: anchor.r.slice(0), idx: anchor.idx};
            }

            // 데이터 인덱스 i0~i1 사이의 고정점만 (양끝은 forced로 남겨둔 인덱스여야 한다)
            function subPath(anchors, i0, i1) {
                var part = [];
                for (var i = 0; i < anchors.length; i++) {
                    if (anchors[i].idx >= i0 && anchors[i].idx <= i1) part.push(copyAnchor(anchors[i]));
                }
                return part;
            }

            function reversePath(anchors) {
                var reversed = [];
                for (var i = anchors.length - 1; i >= 0; i--) {
                    var anchor = copyAnchor(anchors[i]);
                    var left = anchor.l;
                    anchor.l = anchor.r;
                    anchor.r = left;
                    reversed.push(anchor);
                }
                return reversed;
            }

            // 조각들을 이어 닫힌 윤곽으로. 맞닿는 점은 하나로 합치고(들어오는 핸들·나가는 핸들만 유지), 떨어진 점은 모서리로 잇는다
            function joinParts(parts) {
                var result = [];
                for (var p = 0; p < parts.length; p++) {
                    var part = [];
                    for (var i = 0; i < parts[p].length; i++) part.push(copyAnchor(parts[p][i]));
                    if (result.length > 0 && part.length > 0) {
                        var last = result[result.length - 1];
                        if (distance(last.a, part[0].a) < 0.01) {
                            last.r = part[0].r;
                            part.shift();
                        } else {
                            last.r = last.a.slice(0);
                            part[0].l = part[0].a.slice(0);
                        }
                    }
                    result = result.concat(part);
                }
                if (result.length > 1) {
                    var tail = result[result.length - 1];
                    var head = result[0];
                    if (distance(tail.a, head.a) < 0.01) {
                        head.l = tail.l;
                        result.pop();
                    } else {
                        tail.r = tail.a.slice(0);
                        head.l = head.a.slice(0);
                    }
                }
                return result;
            }

            // -------------------------------------------------------
            // 일러스트레이터 개체
            // -------------------------------------------------------
            function addPath(container, anchors, closed) {
                var path = container.pathItems.add();
                var coords = [];
                for (var i = 0; i < anchors.length; i++) coords.push(anchors[i].a);
                path.setEntirePath(coords);
                for (var j = 0; j < anchors.length; j++) {
                    var point = path.pathPoints[j];
                    var anchor = anchors[j];
                    point.leftDirection = anchor.l;
                    point.rightDirection = anchor.r;
                    var leftOnAnchor = anchor.l[0] === anchor.a[0] && anchor.l[1] === anchor.a[1];
                    var rightOnAnchor = anchor.r[0] === anchor.a[0] && anchor.r[1] === anchor.a[1];
                    point.pointType = (leftOnAnchor || rightOnAnchor) ? PointType.CORNER : PointType.SMOOTH;
                }
                path.closed = closed;
                return path;
            }

            function strokeOnly(path, color, weight) {
                path.stroked = true;
                path.strokeColor = color;
                path.strokeWidth = weight;
                path.filled = false;
                return path;
            }

            function addText(container, text, font, vertical) {
                var tf = container.textFrames.add();
                tf.contents = text;
                if (vertical) tf.orientation = TextOrientation.VERTICAL;
                var attr = tf.textRange.characterAttributes;
                if (font !== null) attr.textFont = font;
                attr.size = 8;
                attr.fillColor = black;
                return tf;
            }

            // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
            function glyphBounds(tf) {
                var dup = tf.duplicate();
                var outline = dup.createOutline();
                var gb = outline.geometricBounds; // [left, top, right, bottom]
                outline.remove();
                return gb;
            }

            // 글리프 경계의 위쪽을 top에, 가로는 mode(center: 가운데 = x, right: 오른쪽 = x)에 맞춘다. 놓인 뒤의 경계를 돌려준다
            function placeGlyph(tf, x, top, mode) {
                var gb = glyphBounds(tf);
                var dx = (mode === "right") ? x - gb[2] : x - (gb[0] + gb[2]) / 2;
                var dy = top - gb[1];
                tf.translate(dx, dy);
                return [gb[0] + dx, gb[1] + dy, gb[2] + dx, gb[3] + dy];
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function makeColor(c, m, y, k) {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = c;
                    cmyk.magenta = m;
                    cmyk.yellow = y;
                    cmyk.black = k;
                    return cmyk;
                }
                var rgb = new RGBColor();
                rgb.red = Math.round(255 * (1 - c / 100) * (1 - k / 100));
                rgb.green = Math.round(255 * (1 - m / 100) * (1 - k / 100));
                rgb.blue = Math.round(255 * (1 - y / 100) * (1 - k / 100));
                return rgb;
            }

            function getFont(name) {
                try {
                    return app.textFonts.getByName(name);
                } catch (e) {
                    return null;
                }
            }

            function getSelectedRectangle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
                if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
                var xs = [];
                var ys = [];
                for (var i = 0; i < 4; i++) {
                    var point = item.pathPoints[i];
                    if (point.leftDirection[0] !== point.anchor[0] ||
                            point.leftDirection[1] !== point.anchor[1] ||
                            point.rightDirection[0] !== point.anchor[0] ||
                            point.rightDirection[1] !== point.anchor[1]) return null;
                    pushDistinct(xs, point.anchor[0]);
                    pushDistinct(ys, point.anchor[1]);
                }
                if (xs.length !== 2 || ys.length !== 2) return null;
                return item;
            }

            function pushDistinct(list, value) {
                for (var i = 0; i < list.length; i++) {
                    if (Math.abs(list[i] - value) < 0.01) return;
                }
                list.push(value);
            }

            // 화살촉: 임시 액션 파일(ai_plugin_setStroke)로 양끝에 붙인다. 실패해도 선 자체는 그대로 남는다
            function applyArrowheads(paths, weight) {
                var actionSetName = "Codex_SolarSpectrum";
                var actionName = "Arrowheads";
                var actionFile = new File(Folder.temp + "/Codex_SolarSpectrumArrowheads.aia");

                try {
                    doc.selection = null;
                    for (var i = 0; i < paths.length; i++) paths[i].selected = true;

                    writeArrowheadAction(actionFile, actionSetName, actionName, weight);
                    try { app.unloadAction(actionSetName, ""); } catch (e) {}
                    app.loadAction(actionFile);
                    app.doScript(actionName, actionSetName);
                } catch (actionError) {
                    // 화살표 이름은 UI 언어에 따라 다르다
                }

                try { app.unloadAction(actionSetName, ""); } catch (e2) {}
                try { actionFile.remove(); } catch (e3) {}
                doc.selection = null;
            }

            // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
            function toActionHex(text) {
                var bytes = [];
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    if (code < 0x80) {
                        bytes.push(code);
                    } else if (code < 0x800) {
                        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
                    } else {
                        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
                    }
                }
                var hex = "";
                for (var j = 0; j < bytes.length; j++) {
                    var part = bytes[j].toString(16).toUpperCase();
                    if (part.length < 2) part = "0" + part;
                    hex += part;
                }
                return {hex: hex, length: bytes.length};
            }

            function writeArrowheadAction(actionFile, actionSetName, actionName, weight) {
                var setName = toActionHex(actionSetName);
                var name = toActionHex(actionName);
                var arrow = toActionHex(ARROW_NAME);
                var lines = [];

                lines.push("/version 3");
                lines.push("/name [ " + setName.length);
                lines.push("    " + setName.hex);
                lines.push("]");
                lines.push("/isOpen 1");
                lines.push("/actionCount 1");
                lines.push("/action-1 {");
                lines.push("    /name [ " + name.length);
                lines.push("        " + name.hex);
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
                lines.push("        /parameterCount 6");

                // 선 두께 (pt)
                lines.push("        /parameter-1 {");
                lines.push("            /key 2003072104");
                lines.push("            /showInPalette -1");
                lines.push("            /type (unit real)");
                lines.push("            /value " + weight);
                lines.push("            /unit 592476268");
                lines.push("        }");
                // 시작 화살표
                lines.push("        /parameter-2 {");
                lines.push("            /key 1634231345");
                lines.push("            /showInPalette -1");
                lines.push("            /type (ustring)");
                lines.push("            /value [ " + arrow.length);
                lines.push("                " + arrow.hex);
                lines.push("            ]");
                lines.push("        }");
                // 끝 화살표
                lines.push("        /parameter-3 {");
                lines.push("            /key 1634231346");
                lines.push("            /showInPalette -1");
                lines.push("            /type (ustring)");
                lines.push("            /value [ " + arrow.length);
                lines.push("                " + arrow.hex);
                lines.push("            ]");
                lines.push("        }");
                // 시작/끝 화살표 크기 100%
                lines.push("        /parameter-4 {");
                lines.push("            /key 1634951985");
                lines.push("            /showInPalette -1");
                lines.push("            /type (real)");
                lines.push("            /value 100.0");
                lines.push("        }");
                lines.push("        /parameter-5 {");
                lines.push("            /key 1634951986");
                lines.push("            /showInPalette -1");
                lines.push("            /type (real)");
                lines.push("            /value 100.0");
                lines.push("        }");
                // 화살표 정렬: 패스 끝의 팁
                lines.push("        /parameter-6 {");
                lines.push("            /key 1634230636");
                lines.push("            /showInPalette -1");
                lines.push("            /type (enumerated)");
                lines.push("            /name [ 17");
                lines.push("                ED8CA8EC8AA420EB819DEC9D9820ED8C81");
                lines.push("            ]");
                lines.push("            /value 0");
                lines.push("        }");

                lines.push("    }");
                lines.push("}");

                actionFile.encoding = "UTF-8";
                actionFile.open("w");
                actionFile.write(lines.join("\n"));
                actionFile.close();
            }

            // -------------------------------------------------------
            // 미리보기 · 입력
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                if (!readFields(false)) {
                    app.redraw();
                    return;
                }
                previewGroup = drawSpectrum(false);
                moveItem(previewGroup, offsetXmm * MM, offsetYmm * MM);
                previewGroup.name = "Solar Spectrum Preview";
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            function readFields(showAlert) {
                var width = parseNumber(widthField.input.text);
                var height = parseNumber(heightField.input.text);
                var maximum = parseNumber(maxUmField.input.text);
                var sigma = parseNumber(sigmaField.input.text);
                var stroke = parseNumber(strokeField.input.text);
                var offX = parseNumber(offsetXField.input.text);
                var offY = parseNumber(offsetYField.input.text);

                // 사각형이 있으면 크기는 사각형이 정하므로 검사하지 않는다
                if (rect === null && (!inRange(width, WIDTH_RANGE) || !inRange(height, HEIGHT_RANGE))) {
                    if (showAlert) alert("폭은 " + WIDTH_RANGE[0] + "~" + WIDTH_RANGE[1] + "mm, 높이는 " +
                        HEIGHT_RANGE[0] + "~" + HEIGHT_RANGE[1] + "mm 사이로 입력해주세요.");
                    return false;
                }
                if (!inRange(maximum, MAX_UM_RANGE)) {
                    if (showAlert) alert("최대 파장은 " + MAX_UM_RANGE[0] + "~" + MAX_UM_RANGE[1] + "µm 사이로 입력해주세요.");
                    return false;
                }
                if (!inRange(sigma, SIGMA_RANGE)) {
                    if (showAlert) alert("단순화는 " + SIGMA_RANGE[0] + "~" + SIGMA_RANGE[1] + "nm 사이로 입력해주세요.");
                    return false;
                }
                if (!inRange(stroke, STROKE_RANGE)) {
                    if (showAlert) alert("선 두께는 " + STROKE_RANGE[0] + "~" + STROKE_RANGE[1] + "pt 사이로 입력해주세요.");
                    return false;
                }
                if (!inRange(offX, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM]) || !inRange(offY, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM])) {
                    if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " + POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
                    return false;
                }

                widthMm = width;
                heightMm = height;
                maxUm = maximum;
                sigmaNm = sigma;
                strokePt = stroke;
                offsetXmm = offX;
                offsetYmm = offY;
                return true;
            }

            function inRange(value, range) {
                return value !== null && value >= range[0] && value <= range[1];
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function addPanel(parent, title) {
                var panel = parent.add("panel", undefined, title);
                panel.orientation = "column";
                panel.alignChildren = "left";
                panel.spacing = 4;
                panel.margins = [10, 14, 10, 8];
                return panel;
            }

            function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var label = row.add("statictext", undefined, labelText + " (" + unit + "):");
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.characters = 6;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, clampValue(value, minimum, maximum), minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;

                var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};

                slider.onChanging = function() {
                    if (field.syncing) return;
                    var stepped = Math.round(slider.value / step) * step;
                    input.text = formatValue(clampValue(stepped, field.minimum, field.maximum));
                    commitField(field);
                };
                input.onChanging = function() { commitField(field); };
                input.onChange = function() {
                    var parsed = parseNumber(input.text);
                    if (parsed === null) parsed = field.minimum;
                    parsed = clampValue(parsed, field.minimum, field.maximum);
                    input.text = formatValue(parsed);
                    field.syncing = true;
                    slider.value = parsed;
                    field.syncing = false;
                    commitField(field);
                };
                return field;
            }

            // 위치 필드는 도형을 다시 만들지 않고 미리보기만 옮기도록 갈아끼운다
            function commitField(field) {
                if (field.onCommit) field.onCommit();
                else updatePreview();
            }

            function bindOffsetField(field, isX) {
                field.onCommit = function() {
                    var value = parseNumber(field.input.text);
                    if (value === null) return;
                    value = clampValue(value, field.minimum, field.maximum);
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    if (delta === 0 || previewGroup === null) return;
                    try { previewGroup.translate(isX ? delta : 0, isX ? 0 : delta); } catch (e) {}
                    app.redraw();
                };
            }

            function clampValue(value, minimum, maximum) {
                if (value < minimum) value = minimum;
                if (value > maximum) value = maximum;
                return value;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (normalized === "") return null;
                var value = Number(normalized);
                return isFinite(value) ? value : null;
            }

            function formatValue(value) {
                return String(Math.round(value * 100) / 100);
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v1", rect !== null ? defaultWidthMm : widthMm, rect !== null ? defaultHeightMm : heightMm, maxUm, sigmaNm, strokePt,
                    showGround ? 1 : 0, showUV ? 1 : 0, showBands ? 1 : 0, fillToET ? 1 : 0,
                    showTicks ? 1 : 0, showLegend ? 1 : 0, showRanges ? 1 : 0, offsetXmm, offsetYmm];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 15) return;

                var width = parseFloat(p[1]);
                var height = parseFloat(p[2]);
                var maximum = parseFloat(p[3]);
                var sigma = parseFloat(p[4]);
                var stroke = parseFloat(p[5]);
                var offX = parseFloat(p[13]);
                var offY = parseFloat(p[14]);
                if (inRange(width, WIDTH_RANGE)) widthMm = width;
                if (inRange(height, HEIGHT_RANGE)) heightMm = height;
                if (inRange(maximum, MAX_UM_RANGE)) maxUm = maximum;
                if (inRange(sigma, SIGMA_RANGE)) sigmaNm = sigma;
                if (inRange(stroke, STROKE_RANGE)) strokePt = stroke;
                showGround = p[6] === "1";
                showUV = p[7] === "1";
                showBands = p[8] === "1";
                fillToET = p[9] === "1";
                showTicks = p[10] === "1";
                showLegend = p[11] === "1";
                showRanges = p[12] === "1";
                if (inRange(offX, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM])) offsetXmm = offX;
                if (inRange(offY, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM])) offsetYmm = offY;
            }
            return null;
        }
        return api;
    }
})();
