// Object_Humidity.jsx
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

// 습도 그래프: 포화 수증기량 곡선과 하루 동안의 기온·상대 습도·이슬점 변화를 한 창의 탭으로 묶었다.
// 두 탭은 서로 다른 그림이라 옵션을 공유하지 않는다. 크기·위치·보조선과 눈금 옵션은 탭마다 따로 저장한다.
// 사각형을 선택하고 실행하면 그 사각형의 왼쪽 위 모서리와 크기를 그래프 영역으로 쓰고(사각형은 확인 때 지운다),
// 선택이 없으면 대지 가운데에 기본 크기로 그린다.
//
// [포화 수증기량] X축은 기온 0~35 ℃(눈금 5 간격), Y축은 수증기량 0~40 g/kg(눈금 10 간격, 또는 5 ℃ 간격의 포화 수증기량).
//   곡선 값: 물의 포화 증기압 es(T)는 Wagner & Pruss (2002, J. Phys. Chem. Ref. Data 31, 387) 식으로 구한다.
//   이 식은 CRC Handbook (85판) 포화 증기압 표와 0.05 % 안에서 맞는다 (0 ℃ 0.6113 kPa, 25 ℃ 3.1690 kPa, 35 ℃ 5.6267 kPa).
//   포화 수증기량 w = 0.622·es/(P - es) (마른 공기 1 kg에 섞인 수증기의 g 수), P = 1기압 101.325 kPa.
//   5 ℃ 5.40, 10 ℃ 7.63, 15 ℃ 10.65, 20 ℃ 14.70, 25 ℃ 20.09, 35 ℃ 36.59 g/kg (교과서 그림은 5.4, 7.6, 10.6, 14.7, 20.0).
//   곡선은 0.5 ℃ 간격으로 계산한 점을 오차 CURVE_TOLERANCE_MM 안에서 마디 몇 개짜리 베지어 곡선으로 근사한 것이다.
//   점 A~E: 체크한 점을 (기온, 수증기량) 자리에 점과 글자로 찍는다. "포화"를 켜면 그 기온의 포화 수증기량을 입력창에 넣고
//   곡선 위에 찍으며(글자는 왼쪽 위), 끄면 입력한 수증기량 자리에 찍는다(글자는 오른쪽). "곡선 감추기"는 곡선만 지운다(축·눈금은 남는다).
//
// [하루 변화] 하루(0~24시) 동안의 기온(왼쪽 축 5~30 ℃), 상대 습도(오른쪽 축 0~100 %), 이슬점(왼쪽 축)을 그린다.
//   샘플 3가지(맑은 날·흐린 날·비 오는 날)는 기온과 이슬점을 정하고 상대 습도는 두 값에서 계산한다:
//   상대 습도 = 100·es(이슬점)/es(기온). 그래서 어느 시각에도 이슬점 ≤ 기온, 상대 습도 ≤ 100 %이고
//   기온이 오르면 상대 습도가 내려간다. 기온은 새벽(최저)에서 오후(최고)까지 올라갔다가 다시 내려오는 하루 주기 곡선이고
//   (올라가는 시간이 내려오는 시간보다 짧다), 이슬점은 하루 동안 조금만 오르내린다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var TAB_PREF_KEY = "Humidity/tab";   // "v1|탭 번호|미리보기". 각 탭의 옵션은 탭마다 따로 저장한다
    var MM_TO_PT = 2.834645669;
    var SIZE_MIN_MM = 30;
    var SIZE_MAX_MM = 250;
    var POSITION_LIMIT_MM = 300;
    var LABEL_WIDTH = 70;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;

    var AXIS_PT = 0.4;
    var TICK_PT = 0.4;
    var TICK_MM = 1;
    var GRID_PT = 0.3;
    var GRID_DASH = [2, 1];
    var CURVE_PT = 0.8;
    var FONT_PT = 8;
    var ENG_BASELINE_PT = 0.5;
    var TEXT_GAP_MM = 1;
    var AXIS_TITLE_GAP_MM = 1;
    var CURVE_TOLERANCE_MM = 0.3;
    var PRESSURE_KPA = 101.325;
    var EPSILON = 0.622;
    var WP_TC = 647.096;
    var WP_PC = 22064;
    var WP_A = [-7.85951783, 1.84408259, -11.7866497, 22.6807411, -15.9618719, 1.80122502];
    // ° 는 GSMediumB1의 U+02D8 글리프로 넣는다
    var DEGREE_C = "(˘C)";

    var doc = app.activeDocument;
    var grayK100 = makeGray(100);
    var grayK80 = makeGray(80);
    var korFont = findTextFont(["SpoqaHanSansNeo-Regular"]);
    var engFont = findTextFont(["GSMediumB1"]);

    // 선택된 사각형이 있으면 그래프 영역으로 쓴다. 두 탭이 같이 쓰므로 숨김·삭제는 아래 공용 함수로 한다
    var rect = null;
    for (var q = 0; q < doc.selection.length; q++) {
        if (doc.selection[q].typename === "PathItem" && doc.selection[q].closed) {
            rect = doc.selection[q];
            break;
        }
    }
    var rectHidden = rect ? rect.hidden : false;

    // 엔진 인터페이스: label / addRows(page) (탭의 컨트롤을 만들고 아래 훅을 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeSaturationEngine(), makeDailyEngine()];

    var win = new Window("dialog", "습도 그래프");
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
        engines[engineIndex].addRows(page);
    }

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", { name: "cancel" });

    var tabIndex = 0;
    previewCheck.value = true;
    try {
        var savedTab = app.preferences.getStringPreference(TAB_PREF_KEY).split("|");
        if (savedTab.length === 3 && savedTab[0] === "v1") {
            var savedIndex = parseInt(savedTab[1], 10);
            if (savedIndex >= 0 && savedIndex < engines.length) tabIndex = savedIndex;
            previewCheck.value = (savedTab[2] === "1");
        }
    } catch (tabError) {}
    var engine = engines[tabIndex];
    tabs.selection = tabIndex;

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        engine.clearPreview();
        tabIndex = next;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    };
    previewCheck.onClick = function() { engine.setPreview(previewCheck.value); };
    okButton.onClick = function() {
        if (!engine.commit()) return;
        try {
            app.preferences.setStringPreference(TAB_PREF_KEY, ["v1", tabIndex, previewCheck.value ? "1" : "0"].join("|"));
        } catch (saveError) {}
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    // 처음 미리보기는 창이 뜬 뒤(onShow)에 그려야 화면에 보인다
    win.onShow = function() { engine.setPreview(previewCheck.value); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    if (result !== 1) engine.clearPreview();
    try { app.redraw(); } catch (redrawError) {}

    // =======================================================
    // 탭 1: 포화 수증기량 곡선
    // =======================================================
    function makeSaturationEngine() {
        var api = {
            label: "포화 수증기량", addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }
        };

        function addRows(page) {
            var PREF_KEY = "SaturatedVapor/settings";
            var POINT_CHECK_WIDTH = 44;
            var POINT_TEMP_WIDTH = 60;
            var POINT_SAT_WIDTH = 56;
            var POINT_VALUE_WIDTH = 60;
            var POINT_NAMES = ["A", "B", "C", "D", "E"];
            var POINT_COUNT = POINT_NAMES.length;
            var POINT_SIZE_MIN_MM = 0.5;
            var POINT_SIZE_MAX_MM = 5;
            var POINT_LABEL_GAP_MM = 0.3;   // 점 가장자리와 글자 윤곽 사이
            var X_MAX = 35;
            var Y_MAX = 40;
            var X_STEP = 5;
            var Y_STEP = 10;
            var SAMPLE_STEP = 0.5;
            var X_TITLE = "기온" + DEGREE_C;
            var Y_TITLE = "수증기량(g/kg)";

            var curvePoints = [];
            for (var s = 0; s <= X_MAX; s += SAMPLE_STEP) {
                curvePoints.push([s, saturationMixingRatio(s)]);
            }

            // 다이얼로그가 다루는 옵션 값
            var widthMm = 100;
            var heightMm = 70;
            var gridOn = false;
            var tickOutside = false;
            var satTicks = false;
            var curveHidden = false;
            var pointSizeMm = 1.5;
            var glyphOffsetCache = {};
            var pointOn = [false, false, false, false, false];
            var pointSat = [true, true, false, true, true];
            var pointT = [15, 25, 25, 5, 30];
            var pointV = [0, 0, 10.6, 0, 0];
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = false;

            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {widthMm: widthMm, heightMm: heightMm, pointSizeMm: pointSizeMm, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            for (var z = 0; z < POINT_COUNT; z++) {
                if (pointSat[z]) pointV[z] = round1(saturationMixingRatio(pointT[z]));
            }

            var selectedSize = selectionSizeMm();
            if (selectedSize !== null) {
                widthMm = selectedSize[0];
                heightMm = selectedSize[1];
                // 사각형을 선택했으면 크기의 처음 값은 그 사각형 크기다
                DEFAULTS.widthMm = selectedSize[0];
                DEFAULTS.heightMm = selectedSize[1];
            }
            var origin = graphOrigin(widthMm, heightMm);
            var previewGroup = null;

            var sizePanel = addPanel(page, "크기");
            var widthControls = addValueRow(sizePanel, "너비", "mm", widthMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);
            var heightControls = addValueRow(sizePanel, "높이", "mm", heightMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);

            var gridPanel = addPanel(page, "보조선·눈금");
            var gridCheck = gridPanel.add("checkbox", undefined, "파선 보조선 (끄면 축에 눈금)");
            var tickGroup = gridPanel.add("group");
            tickGroup.add("statictext", undefined, "눈금 위치:");
            var tickInRadio = tickGroup.add("radiobutton", undefined, "안쪽");
            var tickOutRadio = tickGroup.add("radiobutton", undefined, "바깥쪽");
            var satTickCheck = gridPanel.add("checkbox", undefined, "Y축에 5 °C 간격 포화 수증기량 표시");
            satTickCheck.helpTip = "Y축 눈금·보조선을 0, 10, 20 … 대신 5, 10, 15 … °C의 포화 수증기량(5.4, 7.6, 10.6 …)에 둔다";

            var curvePanel = addPanel(page, "곡선");
            var curveHideCheck = curvePanel.add("checkbox", undefined, "곡선 감추기 (점만 그림)");

            var pointPanel = addPanel(page, "점");
            var pointHeader = pointPanel.add("group");
            pointHeader.alignChildren = ["left", "center"];
            pointHeader.add("group").preferredSize.width = POINT_CHECK_WIDTH;
            pointHeader.add("statictext", undefined, "온도 (°C)").preferredSize.width = POINT_TEMP_WIDTH;
            pointHeader.add("group").preferredSize.width = POINT_SAT_WIDTH;
            pointHeader.add("statictext", undefined, "수증기량 (g/kg)").preferredSize.width = 100;
            var pointChecks = [];
            var pointTempInputs = [];
            var pointSatChecks = [];
            var pointValueInputs = [];
            for (var pointIndex = 0; pointIndex < POINT_COUNT; pointIndex++) {
                addPointRow(pointIndex);
            }
            var pointSizeControls = addValueRow(pointPanel, "점 크기", "mm", pointSizeMm,
                POINT_SIZE_MIN_MM, POINT_SIZE_MAX_MM, 0.1, 1);

            var positionPanel = addPanel(page, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            // 저장된 값을 화면에 반영
            gridCheck.value = gridOn;
            tickInRadio.value = !tickOutside;
            tickOutRadio.value = tickOutside;
            tickGroup.enabled = !gridOn;
            satTickCheck.value = satTicks;
            curveHideCheck.value = curveHidden;
            setRowValue(widthControls, widthMm);
            setRowValue(heightControls, heightMm);
            setRowValue(pointSizeControls, pointSizeMm);
            setRowValue(offsetXControls, offsetXmm);
            setRowValue(offsetYControls, offsetYmm);

            gridCheck.onClick = function() {
                gridOn = gridCheck.value;
                tickGroup.enabled = !gridOn;
                updatePreview();
            };
            tickInRadio.onClick = tickOutRadio.onClick = function() {
                tickOutside = tickOutRadio.value;
                updatePreview();
            };
            satTickCheck.onClick = function() {
                satTicks = satTickCheck.value;
                updatePreview();
            };
            curveHideCheck.onClick = function() {
                curveHidden = curveHideCheck.value;
                updatePreview();
            };

            // 크기는 다시 그리고, 위치는 미리보기 그룹만 옮긴다
            bindSizeRow(widthControls, function(v) { widthMm = v; }, updatePreview, DEFAULTS.widthMm);
            bindSizeRow(heightControls, function(v) { heightMm = v; }, updatePreview, DEFAULTS.heightMm);
            bindSizeRow(pointSizeControls, function(v) { pointSizeMm = v; }, updatePreview, DEFAULTS.pointSizeMm);
            bindPositionRow(offsetXControls, function() { return offsetXmm; },
                function(v) { offsetXmm = v; }, function(delta) { movePreview(delta, 0); }, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; },
                function(v) { offsetYmm = v; }, function(delta) { movePreview(0, delta); }, DEFAULTS.offsetYmm);

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { previewEnabled = on; updatePreview(); };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                restoreOriginal();
            };
            api.commit = function() {
                // 입력창에서 바로 확인을 눌러 onChange가 오지 않은 값도 반영한다
                if (syncAllPoints() && previewGroup !== null) updatePreview();
                if (previewGroup === null) {
                    setOriginalHidden(true);
                    buildPreview();
                }
                removeOriginal();
                saveSettings();
                doc.selection = null;
                try { previewGroup.selected = true; } catch (selectError) {}
                return true;
            };

            // -------------------------------------------------------
            // 점 A~E 행: [체크 글자] [온도] [포화] [수증기량]
            // -------------------------------------------------------
            function addPointRow(index) {
                var row = pointPanel.add("group");
                row.alignChildren = ["left", "center"];
                var check = row.add("checkbox", undefined, POINT_NAMES[index]);
                check.preferredSize.width = POINT_CHECK_WIDTH;
                var tempInput = row.add("edittext", undefined, String(pointT[index]));
                tempInput.preferredSize.width = POINT_TEMP_WIDTH;
                var satCheck = row.add("checkbox", undefined, "포화");
                satCheck.preferredSize.width = POINT_SAT_WIDTH;
                var valueInput = row.add("edittext", undefined, formatNumber(pointV[index], 1));
                valueInput.preferredSize.width = POINT_VALUE_WIDTH;
                check.value = pointOn[index];
                satCheck.value = pointSat[index];
                valueInput.enabled = !pointSat[index];
                pointChecks.push(check);
                pointTempInputs.push(tempInput);
                pointSatChecks.push(satCheck);
                pointValueInputs.push(valueInput);

                check.onClick = function() {
                    pointOn[index] = check.value;
                    updatePreview();
                };
                satCheck.onClick = function() {
                    pointSat[index] = satCheck.value;
                    valueInput.enabled = !pointSat[index];
                    syncPoint(index);
                    updatePreview();
                };
                tempInput.onChange = valueInput.onChange = function() {
                    syncPoint(index);
                    updatePreview();
                };
            }

            // 입력창 글자를 읽어 값을 정리하고(범위·소수 첫째 자리), 포화면 수증기량을 그 기온의 포화값으로 채운다
            function syncPoint(index) {
                var temperature = parseNumber(pointTempInputs[index].text);
                pointT[index] = clamp(round1(temperature === null ? pointT[index] : temperature), 0, X_MAX);
                pointTempInputs[index].text = String(pointT[index]);
                if (pointSat[index]) {
                    pointV[index] = round1(saturationMixingRatio(pointT[index]));
                } else {
                    var amount = parseNumber(pointValueInputs[index].text);
                    pointV[index] = clamp(round1(amount === null ? pointV[index] : amount), 0, Y_MAX);
                }
                pointValueInputs[index].text = formatNumber(pointV[index], 1);
            }

            // 값이 하나라도 바뀌었으면 true
            function syncAllPoints() {
                var changed = false;
                for (var i = 0; i < POINT_COUNT; i++) {
                    var oldT = pointT[i], oldV = pointV[i];
                    syncPoint(i);
                    if (pointT[i] !== oldT || pointV[i] !== oldV) changed = true;
                }
                return changed;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) {
                    setOriginalHidden(true);
                    buildPreview();
                } else {
                    restoreOriginal();
                }
                app.redraw();
            }

            function buildPreview() {
                previewGroup = buildGraph();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function movePreview(deltaX, deltaY) {
                if (previewGroup !== null) moveItem(previewGroup, deltaX, deltaY);
            }

            // -------------------------------------------------------
            // 그래프 그리기
            // -------------------------------------------------------
            function buildGraph() {
                var group = findEditableLayer().groupItems.add();
                group.name = "포화 수증기량 곡선";

                var width = widthMm * MM_TO_PT;
                var height = heightMm * MM_TO_PT;
                var left = origin[0];
                var bottom = origin[1] - height;
                var right = left + width;
                var top = origin[1];
                function px(t) { return left + t / X_MAX * width; }
                function py(v) { return bottom + v / Y_MAX * height; }

                var spec = {
                    left: left, bottom: bottom, right: right, top: top,
                    gridOn: gridOn, tickOutside: tickOutside,
                    xTicks: [], yTicks: [], y2Ticks: null,
                    xTitle: X_TITLE, yTitle: Y_TITLE, y2Title: null
                };
                for (var vx = 0; vx <= X_MAX; vx += X_STEP) {
                    spec.xTicks.push({ pos: px(vx), text: String(vx), onAxis: vx === 0 });
                }
                if (satTicks) {
                    // 5, 10, 15 … ℃의 포화 수증기량 자리 (0 ℃는 곡선의 시작점이라 넣지 않는다)
                    for (var c = X_STEP; c <= X_MAX; c += X_STEP) {
                        var saturated = saturationMixingRatio(c);
                        spec.yTicks.push({ pos: py(saturated), text: formatNumber(saturated, 1), onAxis: false });
                    }
                } else {
                    for (var vy = 0; vy <= Y_MAX; vy += Y_STEP) {
                        spec.yTicks.push({ pos: py(vy), text: String(vy), onAxis: vy === 0 });
                    }
                }

                // 보조선은 맨 아래에 깔린다
                if (gridOn) drawGrid(group, spec);

                // 곡선. 곡선은 식에서 구한 점을 오차 안에서 근사한 베지어라, 포화 점은 그려진 곡선 위에 얹는다
                var points = [];
                for (var n = 0; n < curvePoints.length; n++) {
                    points.push([px(curvePoints[n][0]), py(curvePoints[n][1])]);
                }
                var segments = fitBezier(points, CURVE_TOLERANCE_MM * MM_TO_PT);
                if (!curveHidden) {
                    var curve = group.pathItems.add();
                    setBezierPath(curve, segments);
                    styleStroke(curve, CURVE_PT, grayK100, null);
                }

                drawAxes(group, spec);

                // 점 A~E
                for (var p = 0; p < POINT_COUNT; p++) {
                    if (!pointOn[p]) continue;
                    var x = px(pointT[p]);
                    var y = py(pointV[p]);
                    if (pointSat[p]) {
                        var onCurveY = curveYAt(segments, x);
                        y = onCurveY !== null ? onCurveY : py(saturationMixingRatio(pointT[p]));
                    }
                    drawPoint(group, x, y, POINT_NAMES[p], pointSat[p]);
                }
                return group;
            }

            // 점과 글자. 곡선 위의 점은 곡선이 올라가는 반대쪽인 왼쪽 위에, 곡선 아래의 점은 오른쪽에 글자를 붙인다.
            // 간격은 점 가장자리에서 글자 윤곽까지 잰다 (왼쪽 위는 윤곽 상자의 오른쪽 아래 모서리를 점 중심에서 대각선으로 둔다)
            function drawPoint(group, x, y, name, onCurve) {
                var radius = pointSizeMm * MM_TO_PT / 2;
                var dot = group.pathItems.ellipse(y + radius, x - radius, radius * 2, radius * 2);
                dot.filled = true;
                dot.fillColor = grayK100;
                dot.stroked = false;
                var distance = radius + POINT_LABEL_GAP_MM * MM_TO_PT;
                var label = addText(group, name);
                var b = label.geometricBounds;
                var o = glyphOffsets(label, name);
                var glyphLeft = b[0] + o[0], glyphTop = b[1] + o[1], glyphRight = b[2] + o[2], glyphBottom = b[3] + o[3];
                if (onCurve) {
                    var corner = distance / Math.SQRT2;
                    label.translate(x - corner - glyphRight, y + corner - glyphBottom);
                } else {
                    label.translate(x + distance - glyphLeft, y - (glyphTop + glyphBottom) / 2);
                }
            }

            // 글자 틀 경계(geometricBounds)는 글자 윤곽보다 커서(윗줄·아랫줄 여백) 그대로 쓰면 점과 글자가 떨어져 보인다.
            // 윤곽선을 만들어 윤곽 경계와 틀 경계의 차이 [왼쪽, 위, 오른쪽, 아래]를 글자마다 한 번만 재 둔다
            function glyphOffsets(label, name) {
                if (glyphOffsetCache[name]) return glyphOffsetCache[name];
                var offsets = [0, 0, 0, 0];
                try {
                    var frameBounds = label.geometricBounds;
                    var outline = label.duplicate().createOutline();
                    var glyph = outline.geometricBounds;
                    outline.remove();
                    for (var i = 0; i < 4; i++) offsets[i] = glyph[i] - frameBounds[i];
                } catch (e) {}
                glyphOffsetCache[name] = offsets;
                return offsets;
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원 (사각형을 선택했으면 크기는 사각형을 따른다)
            // -------------------------------------------------------
            function saveSettings() {
                var on = [];
                var sat = [];
                for (var i = 0; i < POINT_COUNT; i++) {
                    on.push(pointOn[i] ? "1" : "0");
                    sat.push(pointSat[i] ? "1" : "0");
                }
                var parts = [
                    "v4",
                    widthMm,
                    heightMm,
                    gridOn ? "1" : "0",
                    tickOutside ? "1" : "0",
                    satTicks ? "1" : "0",
                    curveHidden ? "1" : "0",
                    pointSizeMm,
                    offsetXmm,
                    offsetYmm,
                    on.join(""),
                    sat.join(""),
                    pointT.join(","),
                    pointV.join(",")
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v4" || p.length !== 14) return;
                var temperatures = p[12].split(",");
                var amounts = p[13].split(",");
                if (p[10].length !== POINT_COUNT || p[11].length !== POINT_COUNT
                    || temperatures.length !== POINT_COUNT || amounts.length !== POINT_COUNT) return;
                widthMm = restoreNumber(p[1], widthMm, SIZE_MIN_MM, SIZE_MAX_MM);
                heightMm = restoreNumber(p[2], heightMm, SIZE_MIN_MM, SIZE_MAX_MM);
                gridOn = (p[3] === "1");
                tickOutside = (p[4] === "1");
                satTicks = (p[5] === "1");
                curveHidden = (p[6] === "1");
                pointSizeMm = round1(restoreNumber(p[7], pointSizeMm, POINT_SIZE_MIN_MM, POINT_SIZE_MAX_MM));
                offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                for (var i = 0; i < POINT_COUNT; i++) {
                    pointOn[i] = (p[10].charAt(i) === "1");
                    pointSat[i] = (p[11].charAt(i) === "1");
                    pointT[i] = round1(restoreNumber(temperatures[i], pointT[i], 0, X_MAX));
                    pointV[i] = round1(restoreNumber(amounts[i], pointV[i], 0, Y_MAX));
                }
            }
        }
        return api;
    }

    // =======================================================
    // 탭 2: 하루 변화 (기온·상대 습도·이슬점)
    // =======================================================
    function makeDailyEngine() {
        var api = {
            label: "하루 변화", addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }
        };

        function addRows(page) {
            var PREF_KEY = "DailyHumidity/settings";
            var HOUR_STEP = 0.25;
            var HOURS = 24;
            var T_AXIS_MIN = 5;
            var T_AXIS_MAX = 30;
            var NAME_GAP_MM = 1;
            var OMEGA = 2 * Math.PI / 24;
            // 곡선 순서: 상대 습도, 기온, 이슬점 (그림에서 A, B, C)
            var CURVE_NAMES = ["상대 습도", "기온", "이슬점"];
            var CURVE_SYMBOLS = ["A", "B", "C"];
            var CURVE_DASHES = [[], [], [3, 1.5]];
            var LABEL_SYMBOL = 0, LABEL_NAME = 1;
            // 샘플: 기온은 tMinHour에 tMin, tMaxHour에 tMax. 이슬점 = mean + a1·cos(하루 주기, peak1시 최고) + a3·cos(8시간 주기, peak3시 최고).
            // labels: 곡선마다 [이름을 붙일 시각, 위(1)/아래(-1)]
            var SAMPLES = [
                { name: "맑은 날", tMin: 10, tMax: 25, tMinHour: 5.5, tMaxHour: 14.5,
                  dew: { mean: 9, a1: 0.8, peak1: 10, a3: 0.5, peak3: 2 },
                  labels: [[14.5, -1], [14.5, 1], [11, -1]] },
                { name: "흐린 날", tMin: 15, tMax: 19, tMinHour: 6, tMaxHour: 14.5,
                  dew: { mean: 13.2, a1: 0.6, peak1: 11, a3: 0.4, peak3: 4 },
                  labels: [[14.5, 1], [14.5, 1], [12, -1]] },
                { name: "비 오는 날", tMin: 14, tMax: 16, tMinHour: 5.5, tMaxHour: 14,
                  dew: { mean: 14.2, a1: 0.7, peak1: 15, a3: 0.12, peak3: 6 },
                  labels: [[14.5, -1], [10, 1], [10, -1]] }
            ];

            // 다이얼로그가 다루는 옵션 값
            var widthMm = 100;
            var heightMm = 70;
            var gridOn = false;
            var tickOutside = false;
            var sampleIndex = 0;
            var curveOn = [true, true, true];
            var labelMode = LABEL_SYMBOL;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = false;

            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {widthMm: widthMm, heightMm: heightMm, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var selectedSize = selectionSizeMm();
            if (selectedSize !== null) {
                widthMm = selectedSize[0];
                heightMm = selectedSize[1];
                // 사각형을 선택했으면 크기의 처음 값은 그 사각형 크기다
                DEFAULTS.widthMm = selectedSize[0];
                DEFAULTS.heightMm = selectedSize[1];
            }
            var origin = graphOrigin(widthMm, heightMm);
            var previewGroup = null;

            var sizePanel = addPanel(page, "크기");
            var widthControls = addValueRow(sizePanel, "너비", "mm", widthMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);
            var heightControls = addValueRow(sizePanel, "높이", "mm", heightMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);

            var gridPanel = addPanel(page, "보조선·눈금");
            var gridCheck = gridPanel.add("checkbox", undefined, "파선 보조선 (끄면 축에 눈금)");
            var tickGroup = gridPanel.add("group");
            tickGroup.add("statictext", undefined, "눈금 위치:");
            var tickInRadio = tickGroup.add("radiobutton", undefined, "안쪽");
            var tickOutRadio = tickGroup.add("radiobutton", undefined, "바깥쪽");

            var samplePanel = addPanel(page, "샘플");
            var sampleGroup = samplePanel.add("group");
            var sampleRadios = [];
            for (var s = 0; s < SAMPLES.length; s++) {
                sampleRadios.push(sampleGroup.add("radiobutton", undefined, SAMPLES[s].name));
            }

            var showPanel = addPanel(page, "그릴 곡선");
            var showGroup = showPanel.add("group");
            var showChecks = [];
            for (var k = 0; k < CURVE_NAMES.length; k++) {
                showChecks.push(showGroup.add("checkbox", undefined, CURVE_NAMES[k]));
            }

            var labelPanel = addPanel(page, "곡선 이름");
            var labelGroup = labelPanel.add("group");
            var labelSymbolRadio = labelGroup.add("radiobutton", undefined, "기호 (A·B·C)");
            var labelNameRadio = labelGroup.add("radiobutton", undefined, "이름 (상대 습도·기온·이슬점)");

            var positionPanel = addPanel(page, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            // 저장된 값을 화면에 반영
            gridCheck.value = gridOn;
            tickInRadio.value = !tickOutside;
            tickOutRadio.value = tickOutside;
            tickGroup.enabled = !gridOn;
            sampleRadios[sampleIndex].value = true;
            for (var c = 0; c < showChecks.length; c++) showChecks[c].value = curveOn[c];
            labelSymbolRadio.value = (labelMode === LABEL_SYMBOL);
            labelNameRadio.value = (labelMode === LABEL_NAME);
            setRowValue(widthControls, widthMm);
            setRowValue(heightControls, heightMm);
            setRowValue(offsetXControls, offsetXmm);
            setRowValue(offsetYControls, offsetYmm);

            gridCheck.onClick = function() {
                gridOn = gridCheck.value;
                tickGroup.enabled = !gridOn;
                updatePreview();
            };
            tickInRadio.onClick = tickOutRadio.onClick = function() {
                tickOutside = tickOutRadio.value;
                updatePreview();
            };
            for (var r = 0; r < sampleRadios.length; r++) bindSampleRadio(r);
            for (var b = 0; b < showChecks.length; b++) bindShowCheck(b);
            labelSymbolRadio.onClick = labelNameRadio.onClick = function() {
                labelMode = labelNameRadio.value ? LABEL_NAME : LABEL_SYMBOL;
                updatePreview();
            };

            bindSizeRow(widthControls, function(v) { widthMm = v; }, updatePreview, DEFAULTS.widthMm);
            bindSizeRow(heightControls, function(v) { heightMm = v; }, updatePreview, DEFAULTS.heightMm);
            bindPositionRow(offsetXControls, function() { return offsetXmm; },
                function(v) { offsetXmm = v; }, function(delta) { movePreview(delta, 0); }, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; },
                function(v) { offsetYmm = v; }, function(delta) { movePreview(0, delta); }, DEFAULTS.offsetYmm);

            api.setPreview = function(on) { previewEnabled = on; updatePreview(); };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                restoreOriginal();
            };
            api.commit = function() {
                if (previewGroup === null) {
                    setOriginalHidden(true);
                    buildPreview();
                }
                removeOriginal();
                saveSettings();
                doc.selection = null;
                try { previewGroup.selected = true; } catch (selectError) {}
                return true;
            };

            function bindSampleRadio(index) {
                sampleRadios[index].onClick = function() {
                    sampleIndex = index;
                    updatePreview();
                };
            }

            function bindShowCheck(index) {
                showChecks[index].onClick = function() {
                    curveOn[index] = showChecks[index].value;
                    updatePreview();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) {
                    setOriginalHidden(true);
                    buildPreview();
                } else {
                    restoreOriginal();
                }
                app.redraw();
            }

            function buildPreview() {
                previewGroup = buildGraph();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function movePreview(deltaX, deltaY) {
                if (previewGroup !== null) moveItem(previewGroup, deltaX, deltaY);
            }

            // -------------------------------------------------------
            // 하루 변화 값
            // -------------------------------------------------------
            // 새벽(tMinHour)에 최저, 오후(tMaxHour)에 최고. 올라갈 때와 내려올 때 각각 반 주기 코사인이라 최저·최고에서 기울기가 0이고
            // 24시간 뒤 같은 값으로 돌아온다
            function temperatureAt(sample, hour) {
                var elapsed = (((hour - sample.tMinHour) % 24) + 24) % 24;
                var rise = sample.tMaxHour - sample.tMinHour;
                var phase = elapsed <= rise ? Math.PI * elapsed / rise : Math.PI * (1 + (elapsed - rise) / (24 - rise));
                return sample.tMin + (sample.tMax - sample.tMin) * (1 - Math.cos(phase)) / 2;
            }

            function dewPointAt(sample, hour) {
                var d = sample.dew;
                return d.mean + d.a1 * Math.cos(OMEGA * (hour - d.peak1)) + d.a3 * Math.cos(3 * OMEGA * (hour - d.peak3));
            }

            // [상대 습도(%), 기온(℃), 이슬점(℃)] 각각 HOUR_STEP 간격 값 목록
            function buildSeries(sample) {
                var series = [[], [], []];
                for (var h = 0; h <= HOURS + 0.001; h += HOUR_STEP) {
                    var temperature = temperatureAt(sample, h);
                    var dewPoint = dewPointAt(sample, h);
                    series[0].push(100 * saturationPressure(dewPoint) / saturationPressure(temperature));
                    series[1].push(temperature);
                    series[2].push(dewPoint);
                }
                return series;
            }

            // -------------------------------------------------------
            // 그래프 그리기
            // -------------------------------------------------------
            function buildGraph() {
                var group = findEditableLayer().groupItems.add();
                group.name = "하루 변화";

                var width = widthMm * MM_TO_PT;
                var height = heightMm * MM_TO_PT;
                var left = origin[0];
                var bottom = origin[1] - height;
                var right = left + width;
                var top = origin[1];
                function px(hour) { return left + hour / HOURS * width; }
                function ty(celsius) { return bottom + (celsius - T_AXIS_MIN) / (T_AXIS_MAX - T_AXIS_MIN) * height; }
                function ry(percent) { return bottom + percent / 100 * height; }

                var spec = {
                    left: left, bottom: bottom, right: right, top: top,
                    gridOn: gridOn, tickOutside: tickOutside,
                    xTicks: [], yTicks: [], y2Ticks: [],
                    xTitle: "시간(시)", yTitle: "기온" + DEGREE_C, y2Title: "상대 습도(%)"
                };
                for (var hour = 0; hour <= HOURS; hour += 6) {
                    spec.xTicks.push({ pos: px(hour), text: String(hour), onAxis: hour === 0 });
                }
                for (var celsius = T_AXIS_MIN; celsius <= T_AXIS_MAX; celsius += 5) {
                    spec.yTicks.push({ pos: ty(celsius), text: String(celsius), onAxis: celsius === T_AXIS_MIN });
                }
                for (var percent = 0; percent <= 100; percent += 20) {
                    spec.y2Ticks.push({ pos: ry(percent), text: String(percent), onAxis: percent === 0 });
                }

                if (gridOn) drawGrid(group, spec);

                var sample = SAMPLES[sampleIndex];
                var series = buildSeries(sample);
                for (var i = 0; i < CURVE_NAMES.length; i++) {
                    if (!curveOn[i]) continue;
                    var toY = (i === 0) ? ry : ty;
                    var points = [];
                    for (var n = 0; n < series[i].length; n++) {
                        points.push([px(n * HOUR_STEP), toY(series[i][n])]);
                    }
                    var curve = group.pathItems.add();
                    setBezierPath(curve, fitBezier(points, CURVE_TOLERANCE_MM * MM_TO_PT));
                    styleStroke(curve, CURVE_PT, grayK100, CURVE_DASHES[i]);

                    var anchor = sample.labels[i];
                    var anchorIndex = Math.round(anchor[0] / HOUR_STEP);
                    addCurveLabel(group, labelMode === LABEL_NAME ? CURVE_NAMES[i] : CURVE_SYMBOLS[i],
                        points[anchorIndex][0], points[anchorIndex][1], anchor[1]);
                }

                drawAxes(group, spec);
                return group;
            }

            // 곡선 위 한 점에서 위(1) 또는 아래(-1)로 띄워 가운데 맞춰 붙인다
            function addCurveLabel(group, text, x, y, side) {
                var label = addText(group, text);
                var lb = label.geometricBounds;
                var gap = NAME_GAP_MM * MM_TO_PT;
                var targetY = side > 0 ? y + gap - lb[3] : y - gap - lb[1];
                label.translate(x - (lb[0] + lb[2]) / 2, targetY);
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원 (사각형을 선택했으면 크기는 사각형을 따른다)
            // -------------------------------------------------------
            function saveSettings() {
                var on = [];
                for (var i = 0; i < curveOn.length; i++) on.push(curveOn[i] ? "1" : "0");
                var parts = [
                    "v1",
                    widthMm,
                    heightMm,
                    gridOn ? "1" : "0",
                    tickOutside ? "1" : "0",
                    sampleIndex,
                    on.join(""),
                    labelMode,
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
                if (p[0] !== "v1" || p.length !== 10 || p[6].length !== curveOn.length) return;
                widthMm = restoreNumber(p[1], widthMm, SIZE_MIN_MM, SIZE_MAX_MM);
                heightMm = restoreNumber(p[2], heightMm, SIZE_MIN_MM, SIZE_MAX_MM);
                gridOn = (p[3] === "1");
                tickOutside = (p[4] === "1");
                var savedSample = parseInt(p[5], 10);
                if (savedSample >= 0 && savedSample < SAMPLES.length) sampleIndex = savedSample;
                for (var i = 0; i < curveOn.length; i++) curveOn[i] = (p[6].charAt(i) === "1");
                labelMode = (p[7] === "1") ? LABEL_NAME : LABEL_SYMBOL;
                offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            }
        }
        return api;
    }

    // =======================================================
    // 공용: 물리 값
    // =======================================================
    // 물의 포화 증기압(kPa). Wagner & Pruss (2002)
    function saturationPressure(celsius) {
        var kelvin = celsius + 273.15;
        var theta = 1 - kelvin / WP_TC;
        var series = WP_A[0] * theta + WP_A[1] * Math.pow(theta, 1.5) + WP_A[2] * Math.pow(theta, 3)
            + WP_A[3] * Math.pow(theta, 3.5) + WP_A[4] * Math.pow(theta, 4) + WP_A[5] * Math.pow(theta, 7.5);
        return WP_PC * Math.exp(WP_TC / kelvin * series);
    }

    // 기온 celsius(℃)의 포화 수증기량(g/kg)
    function saturationMixingRatio(celsius) {
        var vapor = saturationPressure(celsius);
        return 1000 * EPSILON * vapor / (PRESSURE_KPA - vapor);
    }

    // =======================================================
    // 공용: 선택한 사각형 (그래프 영역)
    // =======================================================
    // 사각형이 있으면 그 크기(mm)를 [너비, 높이]로, 없으면 null
    function selectionSizeMm() {
        if (rect === null) return null;
        var rb = rect.geometricBounds;
        return [
            clamp(Math.round((rb[2] - rb[0]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM),
            clamp(Math.round((rb[1] - rb[3]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM)
        ];
    }

    // 그래프 왼쪽 위 기준점 [x, y](pt). 사각형이 있으면 사각형 모서리, 없으면 대지 가운데에서 주어진 크기로
    function graphOrigin(widthMm, heightMm) {
        if (rect !== null) {
            var rb = rect.geometricBounds;
            return [rb[0], rb[1]];
        }
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        return [(ab[0] + ab[2]) / 2 - widthMm * MM_TO_PT / 2, (ab[1] + ab[3]) / 2 + heightMm * MM_TO_PT / 2];
    }

    function setOriginalHidden(hidden) {
        if (rect !== null) try { rect.hidden = hidden; } catch (e) {}
    }

    function restoreOriginal() {
        if (rect !== null) try { rect.hidden = rectHidden; } catch (e) {}
    }

    function removeOriginal() {
        if (rect !== null) try { rect.remove(); } catch (e) {}
    }

    function moveItem(item, deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    // =======================================================
    // 공용: 축·눈금·보조선
    // spec: left·bottom·right·top(pt), gridOn, tickOutside,
    //   xTicks·yTicks·y2Ticks(없으면 null): [{pos(pt), text, onAxis(축 위의 값이면 보조선을 넣지 않는다)}],
    //   xTitle·yTitle·y2Title
    // =======================================================
    function drawGrid(group, spec) {
        for (var i = 0; i < spec.xTicks.length; i++) {
            if (spec.xTicks[i].onAxis) continue;
            addLine(group, spec.xTicks[i].pos, spec.bottom, spec.xTicks[i].pos, spec.top, GRID_PT, grayK80, GRID_DASH);
        }
        for (var j = 0; j < spec.yTicks.length; j++) {
            if (spec.yTicks[j].onAxis) continue;
            addLine(group, spec.left, spec.yTicks[j].pos, spec.right, spec.yTicks[j].pos, GRID_PT, grayK80, GRID_DASH);
        }
    }

    function drawAxes(group, spec) {
        var tick = TICK_MM * MM_TO_PT;
        var textGap = TEXT_GAP_MM * MM_TO_PT;
        var titleGap = AXIS_TITLE_GAP_MM * MM_TO_PT;
        var direction = spec.tickOutside ? -1 : 1;
        var labelGap = textGap + (!spec.gridOn && spec.tickOutside ? tick : 0);

        addLine(group, spec.left, spec.bottom, spec.right, spec.bottom, AXIS_PT, grayK100, null);
        addLine(group, spec.left, spec.bottom, spec.left, spec.top, AXIS_PT, grayK100, null);
        if (spec.y2Ticks) addLine(group, spec.right, spec.bottom, spec.right, spec.top, AXIS_PT, grayK100, null);

        // 눈금과 눈금 숫자: X는 축 아래, Y는 축 왼쪽, Y2는 오른쪽 축 오른쪽
        var labelsBottom = spec.bottom - labelGap;
        var labelsLeft = spec.left - labelGap;
        var labelsRight = spec.right + labelGap;
        for (var i = 0; i < spec.xTicks.length; i++) {
            var xTick = spec.xTicks[i];
            if (!spec.gridOn) addLine(group, xTick.pos, spec.bottom, xTick.pos, spec.bottom + tick * direction, TICK_PT, grayK100, null);
            var xLabel = addText(group, xTick.text);
            var xb = xLabel.geometricBounds;
            xLabel.translate(xTick.pos - (xb[0] + xb[2]) / 2, spec.bottom - labelGap - xb[1]);
            labelsBottom = Math.min(labelsBottom, xLabel.geometricBounds[3]);
        }
        for (var j = 0; j < spec.yTicks.length; j++) {
            var yTick = spec.yTicks[j];
            if (!spec.gridOn) addLine(group, spec.left, yTick.pos, spec.left + tick * direction, yTick.pos, TICK_PT, grayK100, null);
            var yLabel = addText(group, yTick.text);
            var yb = yLabel.geometricBounds;
            yLabel.translate(spec.left - labelGap - yb[2], yTick.pos - (yb[1] + yb[3]) / 2);
            labelsLeft = Math.min(labelsLeft, yLabel.geometricBounds[0]);
        }
        if (spec.y2Ticks) {
            for (var k = 0; k < spec.y2Ticks.length; k++) {
                var y2Tick = spec.y2Ticks[k];
                if (!spec.gridOn) addLine(group, spec.right, y2Tick.pos, spec.right - tick * direction, y2Tick.pos, TICK_PT, grayK100, null);
                var y2Label = addText(group, y2Tick.text);
                var y2b = y2Label.geometricBounds;
                y2Label.translate(spec.right + labelGap - y2b[0], y2Tick.pos - (y2b[1] + y2b[3]) / 2);
                labelsRight = Math.max(labelsRight, y2Label.geometricBounds[2]);
            }
        }

        // 축 제목: X는 숫자 아래 가운데, Y는 숫자 왼쪽에 세로로(아래에서 위로), Y2는 숫자 오른쪽에 세로로(위에서 아래로)
        var xTitle = addText(group, spec.xTitle);
        var xtb = xTitle.geometricBounds;
        xTitle.translate((spec.left + spec.right) / 2 - (xtb[0] + xtb[2]) / 2, labelsBottom - titleGap - xtb[1]);
        var yTitle = addText(group, spec.yTitle);
        yTitle.rotate(90);
        var ytb = yTitle.geometricBounds;
        yTitle.translate(labelsLeft - titleGap - ytb[2], (spec.bottom + spec.top) / 2 - (ytb[1] + ytb[3]) / 2);
        if (spec.y2Title) {
            var y2Title = addText(group, spec.y2Title);
            y2Title.rotate(-90);
            var y2tb = y2Title.geometricBounds;
            y2Title.translate(labelsRight + titleGap - y2tb[0], (spec.bottom + spec.top) / 2 - (y2tb[1] + y2tb[3]) / 2);
        }
    }

    function addLine(group, x1, y1, x2, y2, width, color, dashes) {
        var path = group.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        styleStroke(path, width, color, dashes);
        return path;
    }

    // 점 목록에 가장 가까운 베지어 곡선 마디들로 바꾼다 (Schneider 알고리즘, Graphics Gems "FitCurves").
    // 허용 오차(pt) 안에서 마디(앵커)가 가장 적게 나오도록 오차가 큰 곳에서 나눈다
    function setBezierPath(path, segments) {
        var anchors = [segments[0][0]];
        for (var i = 0; i < segments.length; i++) anchors.push(segments[i][3]);
        path.setEntirePath(anchors);
        for (var j = 0; j < segments.length; j++) {
            path.pathPoints[j].rightDirection = segments[j][1];
            path.pathPoints[j + 1].leftDirection = segments[j][2];
        }
    }

    function fitBezier(points, tolerance) {
        var n = points.length;
        var segments = [];
        fitCubic(points, 0, n - 1, vUnit(vSub(points[1], points[0])), vUnit(vSub(points[n - 2], points[n - 1])),
            tolerance * tolerance, segments);
        return segments;
    }

    function fitCubic(pts, first, last, tan1, tan2, errorSq, out) {
        if (last - first === 1) {
            var gap = vLen(vSub(pts[last], pts[first])) / 3;
            out.push([pts[first], vAdd(pts[first], vMul(tan1, gap)), vAdd(pts[last], vMul(tan2, gap)), pts[last]]);
            return;
        }
        var u = chordParameters(pts, first, last);
        var bezier = generateBezier(pts, first, last, u, tan1, tan2);
        var result = maxFitError(pts, first, last, bezier, u);
        if (result.error < errorSq) {
            out.push(bezier);
            return;
        }
        if (result.error < errorSq * 4) {
            for (var pass = 0; pass < 4; pass++) {
                u = reparameterize(pts, first, last, u, bezier);
                bezier = generateBezier(pts, first, last, u, tan1, tan2);
                result = maxFitError(pts, first, last, bezier, u);
                if (result.error < errorSq) {
                    out.push(bezier);
                    return;
                }
            }
        }
        var center = vUnit(vSub(pts[result.split - 1], pts[result.split + 1]));
        fitCubic(pts, first, result.split, tan1, center, errorSq, out);
        fitCubic(pts, result.split, last, vMul(center, -1), tan2, errorSq, out);
    }

    function generateBezier(pts, first, last, u, tan1, tan2) {
        var p0 = pts[first], p3 = pts[last];
        var c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
        for (var i = 0; i <= last - first; i++) {
            var t = u[i], m = 1 - t;
            var b1 = m * m * m, b2 = 3 * t * m * m, b3 = 3 * t * t * m, b4 = t * t * t;
            var a1 = vMul(tan1, b2), a2 = vMul(tan2, b3);
            c00 += vDot(a1, a1);
            c01 += vDot(a1, a2);
            c11 += vDot(a2, a2);
            var rest = vSub(pts[first + i], vAdd(vMul(p0, b1 + b2), vMul(p3, b3 + b4)));
            x0 += vDot(a1, rest);
            x1 += vDot(a2, rest);
        }
        var det = c00 * c11 - c01 * c01;
        var alpha1 = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det;
        var alpha2 = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
        var segment = vLen(vSub(p3, p0));
        if (alpha1 < 1e-6 * segment || alpha2 < 1e-6 * segment) alpha1 = alpha2 = segment / 3;
        return [p0, vAdd(p0, vMul(tan1, alpha1)), vAdd(p3, vMul(tan2, alpha2)), p3];
    }

    // 베지어 마디들(x가 왼쪽에서 오른쪽으로 커진다)로 그린 곡선의 x 위치 높이. 곡선 범위 밖이면 null
    function curveYAt(segments, x) {
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (x < segment[0][0] - 1e-6 || x > segment[3][0] + 1e-6) continue;
            var low = 0, high = 1;
            for (var n = 0; n < 40; n++) {
                var middle = (low + high) / 2;
                if (bezierAt(segment, middle)[0] < x) low = middle;
                else high = middle;
            }
            return bezierAt(segment, (low + high) / 2)[1];
        }
        return null;
    }

    function bezierAt(b, t) {
        var m = 1 - t;
        return vAdd(vAdd(vMul(b[0], m * m * m), vMul(b[1], 3 * t * m * m)),
            vAdd(vMul(b[2], 3 * t * t * m), vMul(b[3], t * t * t)));
    }

    function maxFitError(pts, first, last, bezier, u) {
        var worst = 0;
        var split = Math.floor((last - first + 1) / 2) + first;
        for (var i = first + 1; i < last; i++) {
            var d = vSub(bezierAt(bezier, u[i - first]), pts[i]);
            var distSq = vDot(d, d);
            if (distSq >= worst) {
                worst = distSq;
                split = i;
            }
        }
        return { error: worst, split: split };
    }

    function chordParameters(pts, first, last) {
        var u = [0];
        for (var i = first + 1; i <= last; i++) u.push(u[i - first - 1] + vLen(vSub(pts[i], pts[i - 1])));
        for (var j = 1; j <= last - first; j++) u[j] = u[j] / u[last - first];
        return u;
    }

    // 뉴턴-랩슨으로 점마다 곡선 위 가장 가까운 매개변수를 다시 찾는다
    function reparameterize(pts, first, last, u, bezier) {
        var next = [];
        var d1 = [], d2 = [];
        for (var k = 0; k < 3; k++) d1.push(vMul(vSub(bezier[k + 1], bezier[k]), 3));
        for (var l = 0; l < 2; l++) d2.push(vMul(vSub(d1[l + 1], d1[l]), 2));
        for (var i = 0; i <= last - first; i++) {
            var t = u[i], m = 1 - t;
            var diff = vSub(bezierAt(bezier, t), pts[first + i]);
            var slope = vAdd(vAdd(vMul(d1[0], m * m), vMul(d1[1], 2 * m * t)), vMul(d1[2], t * t));
            var curve = vAdd(vMul(d2[0], m), vMul(d2[1], t));
            var denominator = vDot(slope, slope) + vDot(diff, curve);
            next.push(denominator === 0 ? t : t - vDot(diff, slope) / denominator);
        }
        return next;
    }

    function vAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function vSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function vMul(a, k) { return [a[0] * k, a[1] * k]; }
    function vDot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    function vLen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
    function vUnit(a) { var l = vLen(a); return [a[0] / l, a[1] / l]; }

    function styleStroke(path, width, color, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = width;
        path.strokeColor = color;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        path.strokeDashes = dashes ? dashes : [];
    }

    // =======================================================
    // 공용: 글자 (서체 규칙: 한글·공백 Spoqa, 영문·숫자·기호 GSMediumB1 +0.5pt)
    // =======================================================
    function addText(group, text) {
        var frame = group.textFrames.add();
        frame.contents = text;
        var base = frame.textRange.characterAttributes;
        base.size = FONT_PT;
        base.fillColor = grayK100;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
        return frame;
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // 잠기거나 숨긴 레이어에 넣으면 MRAP 오류가 난다. 편집할 수 있는 레이어를 고른다
    function findEditableLayer() {
        var active = doc.activeLayer;
        if (!active.locked && active.visible) return active;
        for (var i = 0; i < doc.layers.length; i++) {
            if (!doc.layers[i].locked && doc.layers[i].visible) return doc.layers[i];
        }
        return doc.layers.add();
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    // =======================================================
    // 공용: 다이얼로그 부품
    // =======================================================
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.alignChildren = ["left", "top"];
        panel.margins = [12, 16, 12, 12];
        panel.spacing = 6;
        return panel;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        return {
            input: input, slider: slider, reset: reset,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    // 값이 바뀌면 setter로 저장하고 redraw()로 미리보기를 다시 그린다
    function bindSizeRow(controls, setter, redraw, initial) {
        var current = parseNumber(controls.input.text);
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === current) return;
            current = value;
            setter(value);
            redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(initial); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? current : value);
        };
    }

    // 값이 바뀌면 setter로 저장하고 move(바뀐 만큼, pt)로 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, getter, setter, move, initial) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0) return;
            move(delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(initial); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(",", ".").replace(/[^0-9.\-]/g, ""));
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

    function round1(value) {
        return Math.round(value * 10) / 10;
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

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, minimum, maximum);
    }
})();
