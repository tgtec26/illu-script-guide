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

// 렌즈·거울: 렌즈·거울 작도와 평면거울의 상을 한 창의 탭으로 묶었다.
// 두 탭은 서로 다른 그림이라 옵션을 공유하지 않는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
//
// [렌즈·거울 탭] 기능: 볼록 렌즈·오목 렌즈·볼록 거울·오목 거울을 광축·초점·광선과 함께 그립니다.
//   - 렌즈: 높이, 가운데 두께, 가장자리 두께(평평한 테두리, 0이면 뾰족한 끝). 볼록은 가운데가, 오목은 가장자리가 두껍다. 면은 흰색
//   - 거울: 호 하나 + 뒷면 빗금(길이·간격 같은 값, 0.3pt). 휨은 꼭짓점에서 양 끝까지 벗어나는 깊이
//   - 초점 거리는 모양과 맞물린다: 렌즈 f = 호 반지름 ÷ 2(굴절률−1) (얇은 대칭 렌즈), 거울 f = 호 반지름 ÷ 2.
//     모양(높이·두께·휨·굴절률)을 바꾸면 초점 거리가 따라오고, 초점 거리를 바꾸면 렌즈의 두꺼운 쪽 두께(거울은 휨)가 따라온다
//   - 선: 광축(가로)과 중심선(렌즈 안 세로 파선)은 0.3pt 고정. 좌우 길이는 중심에서 광축·광선 끝까지
//   - 초점: 초점 거리 자리에 1mm 점 + 이탤릭 F(GSMediItaC1). 렌즈는 양쪽, 거울은 한쪽(오목은 앞, 볼록은 뒤)
//   - 광선(아무것도 선택하지 않았을 때): 왼쪽에서 오는 평행 광선. 렌즈는 중심선에서 꺾이고(얇은 렌즈) 거울은 거울면에서 반사해
//     초점으로 모이거나 초점에서 나온 것처럼 퍼집니다. 오목 렌즈·볼록 거울의 가상 경로는 파선으로 초점까지 연장
//   - 물체 작도(도형을 선택하고 실행): 선택한 도형이 물체. 도형 아래에 광축을 놓고 가운데에서 '물체 거리'만큼 오른쪽에 렌즈·거울을 세운다.
//     물체 꼭대기에서 주광선 3개(평행 → 초점, 중심 → 직진/꼭짓점 반사, 초점 → 평행)를 긋고 렌즈 공식 1/f = 1/a + 1/b로 상의 자리·배율을 구해
//     도형 사본을 그 자리에 놓는다(실상은 거꾸로, 허상은 불투명도 50%에 가상 경로 파선). 물체가 초점 위면 광선이 평행이라 상은 없다.
//     '물체·상 이름'을 켜면 도형 가운데, 광축 반대쪽 1mm에 물체·실상·허상 글자(GSMediumB1, 글자 크기 행)를 놓는다
//   - 광선 공통: 실선/파선, 두께, 화살촉 크기와 위치(중심선에서 양쪽으로 같은 거리). 렌즈·거울 높이 밖에 닿는 광선은 그리지 않고,
//     거울의 축 위 평행 광선은 되돌아가 겹치므로 입사 부분만 그린다
// 사용법: 그냥 실행하면 화면 중앙(광학 중심 기준)에 평행 광선 그림을, 도형을 선택하고 실행하면 그 도형을 물체로 상을 작도합니다
//
// [평면거울 탭] 화면 가운데에 평면거울에 비친 상의 작도를 그린다.
//   - 거울은 세로선이고 뒷면(오른쪽)에 빗금. 물체(위 화살표)는 거울 앞 '물체 거리'에, 상(파선 화살표)은 거울 뒤 같은 거리에 같은 크기로.
//   - 광선: 물체 끝점 P에서 나온 빛이 거울 M에서 반사해 눈으로 들어간다. M은 눈과 상 P'을 잇는 직선이 거울과 만나는 점이라
//     입사각 = 반사각이다. 거울 뒤 M → P'은 파선. 꼭대기·아래 끝 광선을 따로 켠다. M이 거울 밖이면 그 광선은 그리지 않는다.
//   - 법선·각: 반사점마다 파선 법선과 입사각(i)·반사각(r) 호.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "LensMirror/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    // 렌즈·거울 탭은 선택한 도형을 물체로 쓴다. 취소하면 선택을 되돌린다
    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page) (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    // 렌즈·거울 탭이 먼저 선택을 읽어야 하므로 순서를 바꾸지 않는다
    var engines = [makeLensEngine(), makePlaneEngine()];

    var win = new Window("dialog", "렌즈·거울");
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
    previewCheck.value = true;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    // 도형을 선택하고 실행하면 렌즈·거울 탭(상 작도)을 연다. 아니면 마지막에 쓴 탭
    var tabIndex = 0;
    if (selectedItems.length === 0) {
        try {
            var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
            if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
        } catch (tabError) {}
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
    if (result !== 1) {
        engine.clearPreview();
        for (var s = 0; s < selectedItems.length; s++) {
            try { selectedItems[s].selected = true; } catch (e) {}
        }
    }
    try { app.redraw(); } catch (redrawError) {}

    // ==== 렌즈·거울 ====
    function makeLensEngine() {
        var api = {label: "렌즈·거울", addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {

            var PREF_KEY = "ObjectLensMirror/settings";
            var mmToPt = 2.83464567;
            var PREVIEW_NAME = "LensMirror_Preview";
            var KIND_LABELS = ["볼록 렌즈", "오목 렌즈", "볼록 거울", "오목 거울"];   // options.kind 0~3
            var KIND_THICKNESS = [[8, 1], [2, 8]];   // 렌즈 종류를 바꿀 때 두께 관계가 안 맞으면 쓰는 [가운데, 가장자리]
            var MIN_SAG = 0.2;            // 가운데·가장자리 두께 차의 최소 (mm)
            var AXIS_STROKE = 0.3;        // 광축·중심선·빗금 두께 (pt)
            var DASH = [2, 1];            // 파선 (pt)
            var DOT_MM = 1;               // 초점 지름
            var LABEL_GAP_MM = 0.5;       // 초점과 F 글자 사이
            var NAME_GAP_MM = 1;          // 물체·상 도형과 이름 글자 사이
            var AXIS_MARGIN_MM = 3;       // 물체 작도에서 광축이 물체·상보다 더 나가는 길이
            var IMAGE_OVERSHOOT_MM = 8;   // 실상이 좌우 길이 밖이면 광선을 상점 너머 이만큼 더 긋는다
            var VIRTUAL_OPACITY = 50;     // 허상 사본 불투명도
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_FONT_NAME = "GSMediumB1";
            var PREVIEW_INTERVAL_MS = 40;

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var black = makeGray(100);
            var white = makeGray(0);
            var labelFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);   // F
            var nameFont = findTextFont([ENG_FONT_NAME]);                      // 물체·실상·허상
            var options = readSettings();
            var rows = {};                  // key → {row, set}: 다른 행 값을 프로그램이 바꿀 때 씀
            var objectItems = collectSelection();   // 선택한 도형 = 물체. 비어 있으면 평행 광선 그림
            var objectBounds = objectItems.length > 0 ? selectionBounds(objectItems) : null;   // [left, top, right, bottom] (pt)
            var objectMode = objectBounds !== null;
            var previewGroup = null;
            var shapeGroup = null;          // 도형은 매번 지우고 다시 그린다
            var labels = {};                // id → {frame, key, size, metrics}. 글자는 한 번 만들고 옮긴다 (텍스트 프레임을 되풀이해 만들면 불안정)
            var nameSpots = [];             // 물체 작도에서 이번에 놓을 이름 글자 {text, x, y, above}
            var previewPending = false;
            var lastPreviewTime = 0;
            var committed = false;

            doc.selection = null;
            removeLeftoverGroups();
            normalizeThickness(null);
            options.focalLength = focalFromShape();

            var LABEL_WIDTH = 130;   // Object_isometric.jsx와 같은 행 구성
            var SLIDER_WIDTH = 196;
            var win = page;
            win.add("statictext", undefined, objectMode ? "선택한 도형을 물체로 상을 작도합니다" : "평행 광선 그림 (도형을 선택하고 실행하면 상 작도)");

            var kindPanel = win.add("panel", undefined, "종류");
            kindPanel.orientation = "row";
            var kindRadios = [];
            for (var k = 0; k < KIND_LABELS.length; k++) {
                var kindRadio = kindPanel.add("radiobutton", undefined, KIND_LABELS[k]);
                kindRadio.value = (options.kind === k);
                kindRadio.onClick = makeKindHandler(k);
                kindRadios.push(kindRadio);
            }

            var shapePanel = win.add("panel", undefined, "모양");
            shapePanel.alignChildren = "fill";
            shapePanel.spacing = 2;
            addRow(shapePanel, "높이", "height", 10, 100, "mm", 0.5, false);
            var centerRow = addRow(shapePanel, "가운데 두께", "centerThickness", 0, 20, "mm", 0.1, false);
            tip(centerRow, "볼록은 가장자리보다 두껍게, 오목은 얇게. 초점 거리를 바꾸면 두꺼운 쪽이 따라옵니다");
            var edgeRow = addRow(shapePanel, "가장자리 두께", "edgeThickness", 0, 20, "mm", 0.1, false);
            tip(edgeRow, "위아래 평평한 테두리의 폭. 0이면 뾰족한 끝");
            var bulgeRow = addRow(shapePanel, "휨", "bulge", 0.5, 30, "mm", 0.1, false);
            tip(bulgeRow, "거울만. 꼭짓점에서 양 끝까지 벗어나는 깊이 (높이의 절반까지). 초점 거리 = 호 반지름 ÷ 2");
            var indexRow = addRow(shapePanel, "굴절률", "index", 1.5, 2, "", 0.05, false);
            tip(indexRow, "렌즈만. 초점 거리 = 호 반지름 ÷ 2(굴절률−1). 유리 1.5, 교과서처럼 초점을 가깝게 두려면 올립니다");
            addRow(shapePanel, "선 두께", "outlineWidth", 0.1, 3, "pt", 0.1, false);

            var linePanel = win.add("panel", undefined, "선 (광축·중심선·빗금 0.3pt)");
            linePanel.alignChildren = "fill";
            linePanel.spacing = 2;
            var lineChecks = linePanel.add("group");
            addCheck(lineChecks, "광축", "axis", "가로 광축");
            var centerCheck = addCheck(lineChecks, "중심선", "centerLine", "렌즈 안 세로 파선. 광선은 여기서 꺾입니다");
            var hatchCheck = addCheck(lineChecks, "뒷면 빗금", "hatch", "거울 뒷면에 짧은 빗금");
            var hatchRow = addRow(linePanel, "빗금 길이", "hatchMm", 0.5, 5, "mm", 0.1, false);
            tip(hatchRow, "빗금 간격도 같은 값");
            var reachRow = addRow(linePanel, "좌우 길이", "reach", 10, 150, "mm", 1, false);
            tip(reachRow, "중심에서 광축·광선 끝까지. 물체 작도에서는 물체·상이 더 멀면 광축을 거기까지 늘립니다");

            var focusPanel = win.add("panel", undefined, "초점 · 글자");
            focusPanel.alignChildren = "fill";
            focusPanel.spacing = 2;
            var focusChecks = focusPanel.add("group");
            addCheck(focusChecks, "초점 표시", "focus", "초점 거리 자리에 1mm 점");
            var labelCheck = addCheck(focusChecks, "F 글자", "focusLabel", "점 아래 이탤릭 F");
            var nameCheck = addCheck(focusChecks, "물체·상 이름", "nameLabels", "물체 작도만. 도형 가운데, 광축 반대쪽 1mm 아래(위)에 물체·실상·허상 (GSMediumB1)");
            var focalRow = addRow(focusPanel, "초점 거리", "focalLength", 1, 1000, "mm", 0.5, false);
            tip(focalRow, "모양에서 계산한 값. 바꾸면 렌즈의 두꺼운 쪽 두께(거울은 휨)가 따라옵니다. 광선도 이 초점으로 모이거나 여기서 퍼집니다");
            var labelSizeRow = addRow(focusPanel, "글자 크기", "labelSize", 4, 20, "pt", 0.5, false);
            tip(labelSizeRow, "F와 물체·상 이름 모두");

            var rayPanel = win.add("panel", undefined, objectMode ? "광선 · 물체" : "광선");
            rayPanel.alignChildren = "fill";
            rayPanel.spacing = 2;
            var rayChecks = rayPanel.add("group");
            addCheck(rayChecks, "광선 표시", "rays", objectMode ? "물체 꼭대기에서 나가는 주광선 3개" : "왼쪽에서 오는 평행 광선");
            var dashCheck = addCheck(rayChecks, "파선", "rayDashed", "광선을 파선으로. 가상 경로는 항상 파선");
            var arrowCheck = addCheck(rayChecks, "화살촉", "rayArrows", "광선 위 진행 방향 화살촉");
            var imageCheck = addCheck(rayChecks, "상 표시", "showImage", "물체 사본을 상의 자리에 배율대로. 실상은 거꾸로, 허상은 불투명도 50%");
            var rayCountRow = addRow(rayPanel, "광선 수", "rayCount", 1, 9, "", 1, false);
            tip(rayCountRow, "평행 광선만. 홀수면 한 줄이 광축 위를 지납니다. 렌즈·거울 높이 밖의 광선은 그리지 않습니다");
            var raySpacingRow = addRow(rayPanel, "광선 간격", "raySpacing", 1, 20, "mm", 0.5, false);
            var objectRow = addRow(rayPanel, "물체 거리", "objectDistance", 1, 150, "mm", 0.5, false);
            tip(objectRow, "물체 작도만. 선택한 도형의 가운데에서 렌즈·거울 중심선까지");
            var rayWidthRow = addRow(rayPanel, "광선 두께", "rayWidth", 0.1, 3, "pt", 0.1, false);
            var arrowSizeRow = addRow(rayPanel, "화살촉 크기", "arrowMm", 0.5, 5, "mm", 0.1, false);
            tip(arrowSizeRow, "길이. 폭은 길이의 0.8배");
            var arrowPosRow = addRow(rayPanel, "화살촉 위치", "arrowPos", 0, 150, "mm", 0.5, false);
            tip(arrowPosRow, "중심선에서 양쪽으로 이 거리에 놓습니다. 광선이 거기까지 안 가면 생략");

            var positionPanel = win.add("panel", undefined, objectMode ? "위치 (물체 작도에서는 도형이 기준)" : "위치");
            positionPanel.alignChildren = "fill";
            positionPanel.spacing = 2;
            var offsetXRow = tip(addRow(positionPanel, "가로 이동", "offsetX", -100, 100, "mm", 0.1, true), "양수: 오른쪽");
            var offsetYRow = tip(addRow(positionPanel, "세로 이동", "offsetY", -100, 100, "mm", 0.1, true), "양수: 위쪽");

            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 400;

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(); };
            api.updatePreview = function() { updatePreview(); };
            api.clearPreview = function() { if (!committed) clearPreview(); };
            api.commit = function() {
                previewPending = true;
                if (!updatePreview()) return false;
                if (previewGroup === null && !buildPreview(false)) return false;
                committed = true;
                previewGroup.name = "LensMirror";
                for (var id in labels) {
                    if (labels.hasOwnProperty(id) && labels[id].frame.hidden) {
                        try { labels[id].frame.remove(); } catch (e) {}
                    }
                }
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };

            updateRowState();

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function makeKindHandler(kind) {
                return function() {
                    options.kind = kind;
                    normalizeThickness(null);
                    options.focalLength = focalFromShape();
                    syncRows(["centerThickness", "edgeThickness", "bulge", "focalLength"]);
                    updateRowState();
                    updatePreview();
                };
            }

            function tip(row, text) {
                row.children[0].helpTip = text;
                return row;
            }

            function addCheck(group, label, key, helpText) {
                var box = group.add("checkbox", undefined, label);
                box.value = options[key];
                box.helpTip = helpText;
                box.onClick = function() {
                    options[key] = box.value;
                    updateRowState();
                    updatePreview();
                };
                return box;
            }

            // 종류·체크 상태·물체 작도 여부에 따라 뜻이 없는 행을 끈다
            function updateRowState() {
                var o = options;
                var lens = o.kind <= 1;
                centerRow.enabled = lens;
                edgeRow.enabled = lens;
                bulgeRow.enabled = !lens;
                indexRow.enabled = lens;
                centerCheck.enabled = lens;
                hatchCheck.enabled = !lens;
                hatchRow.enabled = !lens && o.hatch;
                labelCheck.enabled = o.focus;
                focalRow.enabled = o.focus || o.rays || objectMode;
                nameCheck.enabled = objectMode;
                labelSizeRow.enabled = (o.focus && o.focusLabel) || (objectMode && o.nameLabels);
                dashCheck.enabled = o.rays;
                arrowCheck.enabled = o.rays;
                imageCheck.enabled = objectMode;
                rayCountRow.enabled = o.rays && !objectMode;
                raySpacingRow.enabled = o.rays && !objectMode;
                objectRow.enabled = objectMode;
                rayWidthRow.enabled = o.rays;
                arrowSizeRow.enabled = o.rays && o.rayArrows;
                arrowPosRow.enabled = o.rays && o.rayArrows;
                offsetXRow.enabled = !objectMode;
                offsetYRow.enabled = !objectMode;
            }

            function isCoupledKey(key) {
                return key === "height" || key === "centerThickness" || key === "edgeThickness" || key === "bulge"
                    || key === "index" || key === "focalLength";
            }

            function syncRows(keys) {
                for (var i = 0; i < keys.length; i++) {
                    if (rows[keys[i]]) rows[keys[i]].set(options[keys[i]]);
                }
            }

            // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장). 스크롤바는 step 단위 정수로 움직인다. 행을 돌려준다
            function addRow(panel, label, key, min, max, unit, step, positionOnly) {
                var row = panel.add("group");
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, shown(options[key]));
                input.characters = 6;
                var slider = row.add("scrollbar", undefined, Math.round(options[key] / step), Math.round(min / step), Math.round(max / step));
                slider.preferredSize.width = SLIDER_WIDTH;
                slider.stepdelta = 1;
                slider.jumpdelta = 10;
                rows[key] = { row: row, set: function(value) {
                    input.text = shown(value);
                    slider.value = Math.round(value / step);
                } };
                function apply(value, dragging) {
                    value = Math.round(value / step) * step;   // 스크롤바 드래그는 소수 값을 주므로 단위에 맞춘다 (글자 크기 0.5pt 등)
                    value = Math.round(value * 100) / 100;
                    if (!isFinite(value) || value < min || value > max) {
                        input.text = shown(options[key]);
                        return;
                    }
                    var previous = options[key];
                    options[key] = value;
                    rows[key].set(value);
                    if (value === previous) {
                        if (!dragging && previewPending) updatePreview();
                        return;
                    }
                    if (positionOnly) {
                        // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
                        try {
                            var delta = (value - previous) * mmToPt;
                            if (previewGroup !== null) {
                                previewGroup.translate(key === "offsetX" ? delta : 0, key === "offsetY" ? delta : 0);
                            }
                            app.redraw();
                        } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
                    } else {
                        if (isCoupledKey(key)) coupleFocal(key);
                        updatePreview(dragging);
                    }
                }
                slider.onChanging = function() { apply(slider.value * step, true); };
                slider.onChange = function() { apply(slider.value * step); };
                input.onChange = function() {
                    if (!/\S/.test(input.text)) { input.text = shown(options[key]); return; }
                    apply(Number(input.text));
                };
                return row;
            }

            // 입력창에 보이는 값: 계산으로 나온 값도 소수 둘째 자리까지만
            function shown(value) {
                return String(Math.round(value * 100) / 100);
            }

            // -------------------------------------------------------
            // 모양 ↔ 초점 거리
            // -------------------------------------------------------
            // 초점 거리를 바꾸면 두꺼운 쪽 두께(거울은 휨)를, 모양을 바꾸면 초점 거리를 맞춘다
            function coupleFocal(changedKey) {
                if (changedKey === "focalLength") {
                    applyFocalToShape();
                } else {
                    normalizeThickness(changedKey);
                    options.focalLength = focalFromShape();
                }
                syncRows(["centerThickness", "edgeThickness", "bulge", "focalLength"]);
            }

            // 렌즈: 두꺼운 쪽 ≥ 얇은 쪽 + MIN_SAG. 방금 바꾼 값을 살리고 다른 쪽을 민다. 종류를 바꿔 관계가 뒤집혔으면 그 종류의 기본 두께
            function normalizeThickness(changedKey) {
                var o = options;
                if (o.kind > 1) return;
                var thickKey = o.kind === 0 ? "centerThickness" : "edgeThickness";
                var thinKey = o.kind === 0 ? "edgeThickness" : "centerThickness";
                if (changedKey === null && o[thickKey] < o[thinKey] + MIN_SAG) {
                    o.centerThickness = KIND_THICKNESS[o.kind][0];
                    o.edgeThickness = KIND_THICKNESS[o.kind][1];
                    return;
                }
                if (changedKey === thinKey) {
                    if (o[thickKey] < o[thinKey] + MIN_SAG) o[thickKey] = Math.min(20, o[thinKey] + MIN_SAG);
                    if (o[thickKey] < o[thinKey] + MIN_SAG) o[thinKey] = o[thickKey] - MIN_SAG;
                } else {
                    if (o[thinKey] > o[thickKey] - MIN_SAG) o[thinKey] = Math.max(0, o[thickKey] - MIN_SAG);
                    if (o[thinKey] > o[thickKey] - MIN_SAG) o[thickKey] = o[thinKey] + MIN_SAG;
                }
            }

            function focalFromShape() {
                var o = options;
                var f = o.kind <= 1 ? lensFocalLength(o.height, o.centerThickness, o.edgeThickness, o.index) : mirrorFocalLength(o.height, o.bulge);
                return Math.min(1000, Math.max(1, Math.round(f * 100) / 100));
            }

            // 초점 거리에 맞는 휨(sagitta)을 두꺼운 쪽 두께나 거울 휨에 넣는다. 범위 밖이면 잘라 넣고 초점 거리를 실제 모양에서 다시 읽는다
            function applyFocalToShape() {
                var o = options;
                var clamped = false;
                if (o.kind <= 1) {
                    var minF = Math.round(o.height / (4 * (o.index - 1)) * 100) / 100;
                    if (o.focalLength < minF) { o.focalLength = minF; clamped = true; }
                    var thickKey = o.kind === 0 ? "centerThickness" : "edgeThickness";
                    var thinKey = o.kind === 0 ? "edgeThickness" : "centerThickness";
                    var thick = o[thinKey] + 2 * lensSagitta(o.height, o.focalLength, o.index);
                    if (thick > 20) { thick = 20; clamped = true; }
                    if (thick < o[thinKey] + MIN_SAG) { thick = o[thinKey] + MIN_SAG; clamped = true; }
                    o[thickKey] = thick;
                } else {
                    var minMirror = Math.round(o.height / 4 * 100) / 100;
                    if (o.focalLength < minMirror) { o.focalLength = minMirror; clamped = true; }
                    var bulge = mirrorSagitta(o.height, o.focalLength);
                    var maxBulge = Math.min(30, o.height / 2);
                    if (bulge > maxBulge) { bulge = maxBulge; clamped = true; }
                    if (bulge < 0.5) { bulge = 0.5; clamped = true; }
                    o.bulge = bulge;
                }
                if (clamped) o.focalLength = focalFromShape();
            }

            // -------------------------------------------------------
            // 선택한 물체
            // -------------------------------------------------------
            function collectSelection() {
                var items = [];
                try {
                    var sel = doc.selection;
                    if (sel && sel.length) {
                        for (var i = 0; i < sel.length; i++) {
                            if (sel[i] && sel[i].geometricBounds) items.push(sel[i]);
                        }
                    }
                } catch (e) {}
                return items;
            }

            function selectionBounds(items) {
                var union = null;
                for (var i = 0; i < items.length; i++) union = unionBounds(union, itemBounds(items[i]));
                return union;
            }

            // 도형의 기하 범위 [left, top, right, bottom]: 선 두께·효과는 빼고, 클리핑 그룹은 마스크 범위, 그룹은 자식의 합. 안내선은 뺀다
            function itemBounds(item) {
                if (!item || item.guides) return null;
                if (item.typename === "GroupItem") {
                    if (item.clipped) {
                        var mask = clippingBounds(item);
                        if (mask) return mask;
                    }
                    var union = null;
                    for (var i = 0; i < item.pageItems.length; i++) union = unionBounds(union, itemBounds(item.pageItems[i]));
                    return union || item.geometricBounds;
                }
                return item.geometricBounds;
            }

            function clippingBounds(group) {
                for (var i = 0; i < group.pageItems.length; i++) {
                    var child = group.pageItems[i];
                    if (child.clipping) return child.geometricBounds;
                    if (child.typename === "GroupItem") {
                        var nested = clippingBounds(child);
                        if (nested) return nested;
                    }
                }
                return null;
            }

            function unionBounds(a, b) {
                if (!b) return a;
                if (!a) return [b[0], b[1], b[2], b[3]];
                return [Math.min(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
            }

            // 물체 높이 (mm): 도형 아래(광축)에서 꼭대기까지
            function objectHeightMm() {
                return (objectBounds[1] - objectBounds[3]) / mmToPt;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview(dragging) {
                previewPending = true;
                if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
                status.text = " ";
                try {
                    if (!options.preview) {
                        clearPreview();
                    } else if (!buildPreview(dragging === true)) {
                        return false;
                    }
                    previewPending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
                    return false;
                }
            }

            // 도형 그룹은 통째로 다시 그리고, F 글자는 있는 프레임을 옮긴다
            function buildPreview(dragging) {
                try {
                    if (previewGroup === null) {
                        previewGroup = doc.activeLayer.groupItems.add();
                        previewGroup.name = PREVIEW_NAME;
                    }
                    if (shapeGroup !== null) {
                        try { shapeGroup.remove(); } catch (e) {}
                        shapeGroup = null;
                    }
                    shapeGroup = previewGroup.groupItems.add();
                    shapeGroup.name = "LensMirror_Shapes";
                    drawShapes(shapeGroup);
                    shapeGroup.zOrder(ZOrderMethod.SENDTOBACK);   // 글자가 위에 오게
                    layoutLabels(dragging);
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "그리지 못했습니다: " + e + " (" + e.line + "행)";
                    return false;
                }
            }

            // 광학 중심의 문서 좌표 (pt). 평행 광선: 화면 중앙 + 이동값. 물체 작도: 도형 아래 가운데에서 물체 거리만큼 오른쪽
            function originPt() {
                if (objectMode) {
                    return [(objectBounds[0] + objectBounds[2]) / 2 + options.objectDistance * mmToPt, objectBounds[3]];
                }
                return [viewCenter[0] + options.offsetX * mmToPt, viewCenter[1] + options.offsetY * mmToPt];
            }

            // mm 좌표 → 문서 좌표
            function P(x, y) {
                var origin = originPt();
                return [origin[0] + x * mmToPt, origin[1] + y * mmToPt];
            }

            // 아래(뒤)부터: 몸체 → 상 사본 → 광축 → 중심선 → 가상 광선 → 광선·화살촉 → 빗금 → 초점
            function drawShapes(g) {
                var o = options;
                var L = o.reach;
                var half = o.height / 2;
                var lens = o.kind <= 1;
                if (lens) {
                    var body = addPiecePath(g, lensPieces(o.height, o.centerThickness, o.edgeThickness), true, "LensBody");
                    body.filled = true;
                    body.fillColor = white;
                    strokeIt(body, o.outlineWidth, false);
                } else {
                    var mirror = addPiecePath(g, [mirrorArcPiece(o.kind, o.height, o.bulge)], false, "MirrorSurface");
                    strokeIt(mirror, o.outlineWidth, false);
                }
                var axisLeft = -L, axisRight = L;
                var rays = [];
                if (objectMode) {
                    var u = o.objectDistance;
                    var yP = objectHeightMm();
                    var img = imageOf(o.kind, u, o.focalLength);
                    axisLeft = Math.min(axisLeft, -u - AXIS_MARGIN_MM);
                    if (img.finite) {
                        axisLeft = Math.min(axisLeft, img.x - AXIS_MARGIN_MM);
                        axisRight = Math.max(axisRight, img.x + AXIS_MARGIN_MM);
                        if (o.showImage) drawImageCopy(g, img);
                    }
                    nameSpots = o.nameLabels ? nameLabelSpots(u, o.showImage ? img : { finite: false }, NAME_GAP_MM) : [];
                    if (o.rays) rays = principalRays(o.kind, u, yP, o.focalLength, L, { h: o.height, s: o.bulge }, IMAGE_OVERSHOOT_MM);
                    for (var q = 0; q < rays.length; q++) {
                        var endX = rays[q].real[1].x1;
                        axisLeft = Math.min(axisLeft, endX);
                        axisRight = Math.max(axisRight, endX);
                    }
                    status.text = describeImage(img, yP);
                } else if (o.rays) {
                    var heights = rayHeights(o.rayCount, o.raySpacing, half);
                    for (var i = 0; i < heights.length; i++) rays.push(rayPieces(o.kind, heights[i], o.focalLength, L, { h: o.height, s: o.bulge }));
                }
                if (o.axis) addLine(g, linePiece(axisLeft, 0, axisRight, 0), AXIS_STROKE, false, "OpticalAxis");
                if (lens && o.centerLine) addLine(g, linePiece(0, -half, 0, half), AXIS_STROKE, true, "CenterLine");
                for (var r = 0; r < rays.length; r++) {
                    for (var v = 0; v < rays[r].virtual.length; v++) addLine(g, rays[r].virtual[v], o.rayWidth, true, "VirtualRay");
                    for (var s = 0; s < rays[r].real.length; s++) {
                        addLine(g, rays[r].real[s], o.rayWidth, o.rayDashed, "Ray");
                        if (o.rayArrows) {
                            // 입사 광선은 중심선 왼쪽, 꺾인 광선은 렌즈면 오른쪽·거울이면 왼쪽으로 같은 거리
                            var targetX = (s === 0 || !lens) ? -o.arrowPos : o.arrowPos;
                            var triangle = arrowAt(rays[r].real[s], targetX, o.arrowMm);
                            if (triangle !== null) addPolygon(g, triangle, "RayArrow");
                        }
                    }
                }
                if (!lens && o.hatch) {
                    var marks = hatchMarks(o.kind, o.height, o.bulge, o.hatchMm, o.hatchMm);
                    for (var m = 0; m < marks.length; m++) addLine(g, marks[m], AXIS_STROKE, false, "Hatch");
                }
                if (o.focus) {
                    var spots = focusSpots(o.kind, o.focalLength);
                    for (var f = 0; f < spots.length; f++) addDot(g, spots[f][0], spots[f][1]);
                }
            }

            // 물체 사본을 상의 자리에: |배율|배로 줄이거나 키우고 배율이 음수(실상)면 위아래 뒤집은 뒤,
            // 실제 범위를 다시 재서 밑동(뒤집혔으면 위쪽 변)을 광축 위 상의 자리에 맞춘다. 물체와 같은 기하 범위를 쓰므로 광선과 정확히 만난다
            function drawImageCopy(g, img) {
                var copy = g.groupItems.add();
                copy.name = img.real ? "RealImage" : "VirtualImage";
                for (var i = 0; i < objectItems.length; i++) {
                    objectItems[i].duplicate(copy, ElementPlacement.PLACEATEND);
                }
                var percent = 100 * Math.abs(img.m);
                var flipped = img.m < 0;
                copy.resize(percent, flipped ? -percent : percent, true, true, true, true, 100, Transformation.CENTER);
                var b = itemBounds(copy) || copy.geometricBounds;
                var target = P(img.x, 0);
                copy.translate(target[0] - (b[0] + b[2]) / 2, target[1] - (flipped ? b[1] : b[3]));
                if (!img.real) copy.opacity = VIRTUAL_OPACITY;
                return copy;
            }

            function describeImage(img, yP) {
                var text = "물체 높이 " + shown(yP) + "mm";
                if (!img.finite) return text + " · 상 없음 (광선이 평행)";
                return text + " · " + (img.real ? "실상" : "허상") + ", 배율 " + shown(Math.abs(img.m)) + (img.m < 0 ? " (거꾸로)" : " (바로)")
                    + ", 중심선에서 " + shown(img.x) + "mm";
            }

            function strokeIt(path, width, dashed) {
                path.stroked = true;
                path.strokeColor = black;
                path.strokeWidth = width;
                path.strokeDashes = dashed ? DASH : [];
            }

            function addLine(g, seg, width, dashed, name) {
                var path = g.pathItems.add();
                path.name = name;
                path.setEntirePath([P(seg.x0, seg.y0), P(seg.x1, seg.y1)]);
                path.closed = false;
                path.filled = false;
                strokeIt(path, width, dashed);
                return path;
            }

            function addPolygon(g, points, name) {
                var path = g.pathItems.add();
                path.name = name;
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(P(points[i][0], points[i][1]));
                path.setEntirePath(anchors);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = black;
                return path;
            }

            function addDot(g, x, y) {
                var d = DOT_MM * mmToPt;
                var c = P(x, y);
                var dot = g.pathItems.ellipse(c[1] + d / 2, c[0] - d / 2, d, d);
                dot.name = "FocalPoint";
                dot.stroked = false;
                dot.filled = true;
                dot.fillColor = black;
                return dot;
            }

            // 호·직선 조각 목록을 패스 하나로. 핸들이 이어지는 점은 SMOOTH
            function addPiecePath(g, pieces, closed, name) {
                var pts = piecesToPoints(pieces, closed);
                var path = g.pathItems.add();
                path.name = name;
                var anchors = [];
                for (var i = 0; i < pts.length; i++) anchors.push(P(pts[i].anchor[0], pts[i].anchor[1]));
                path.setEntirePath(anchors);
                path.closed = closed;
                path.filled = false;
                for (var j = 0; j < pts.length; j++) {
                    var pp = path.pathPoints[j];
                    pp.leftDirection = P(pts[j].left[0], pts[j].left[1]);
                    pp.rightDirection = P(pts[j].right[0], pts[j].right[1]);
                    pp.pointType = isSmooth(pts[j]) ? PointType.SMOOTH : PointType.CORNER;
                }
                return path;
            }

            // -------------------------------------------------------
            // 글자 (F, 물체·실상·허상)
            // -------------------------------------------------------
            function layoutLabels(dragging) {
                var wanted = {};
                var size = options.labelSize;
                if (options.focus && options.focusLabel) {
                    var spots = focusSpots(options.kind, options.focalLength);
                    for (var i = 0; i < spots.length; i++) {
                        var dot = P(spots[i][0], spots[i][1]);
                        wanted["F" + i] = true;
                        showLabel("F" + i, "F", labelFont, size, [dot[0], dot[1] - (DOT_MM / 2 + LABEL_GAP_MM) * mmToPt], false, dragging);
                    }
                }
                for (var n = 0; n < nameSpots.length; n++) {
                    wanted["name" + n] = true;
                    showLabel("name" + n, nameSpots[n].text, nameFont, size, P(nameSpots[n].x, nameSpots[n].y), nameSpots[n].above, dragging);
                }
                for (var id in labels) {
                    if (labels.hasOwnProperty(id) && !wanted[id] && !labels[id].frame.hidden) labels[id].frame.hidden = true;
                }
            }

            // 글자 프레임 하나를 놓는다. 가로 중심을 anchor에, above면 글자 아래를, 아니면 글자 위를 anchor 높이에 맞춘다.
            // 실제 글자 자리는 윤곽선을 한 번 떠서 재고(글·크기가 바뀔 때만), 드래그 중에는 지난 실측을 크기 비율로 늘려 쓰고 손을 떼면 다시 잰다
            function showLabel(id, contents, font, size, anchor, above, dragging) {
                var entry = labels[id];
                if (!entry) {
                    var frame = previewGroup.textFrames.add();
                    frame.name = id.indexOf("F") === 0 ? "FocalLabel" : "NameLabel";
                    entry = labels[id] = { frame: frame, key: "", size: size, metrics: null };
                }
                if (entry.frame.hidden) entry.frame.hidden = false;
                var key = contents + "|" + size;
                if (entry.key !== key) {
                    if (entry.frame.contents !== contents) entry.frame.contents = contents;
                    var attrs = entry.frame.textRange.characterAttributes;
                    attrs.size = size;
                    try { attrs.textFont = font; } catch (fontError) {}
                    try { attrs.fillColor = black; } catch (colorError) {}
                    if (!dragging || entry.metrics === null) {
                        entry.metrics = measureGlyph(entry.frame);
                        entry.size = size;
                        entry.key = key;
                    }
                }
                var m = entry.metrics;
                var scale = size / entry.size;
                var fb = entry.frame.geometricBounds;
                var left = fb[0] + m.left * scale, right = fb[0] + m.right * scale;
                var top = fb[1] + m.top * scale, bottom = fb[1] + m.bottom * scale;
                entry.frame.translate(anchor[0] - (left + right) / 2, above ? anchor[1] - bottom : anchor[1] - top);
            }

            // 프레임 범위 기준 실제 글자 자리 (윤곽선 사본으로 잰다)
            function measureGlyph(frame) {
                var fb = frame.geometricBounds;
                var ob = null;
                try {
                    var dup = frame.duplicate();
                    var outline = dup.createOutline();
                    ob = outline.geometricBounds;
                    outline.remove();
                } catch (e) { ob = null; }
                if (ob === null || ob[2] - ob[0] <= 0) ob = fb;
                return { left: ob[0] - fb[0], top: ob[1] - fb[1], right: ob[2] - fb[0], bottom: ob[3] - fb[1] };
            }

            function clearPreview() {
                shapeGroup = null;
                labels = {};
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {
                        try { app.redraw(); previewGroup.remove(); } catch (e2) {}
                    }
                    previewGroup = null;
                }
                removeLeftoverGroups();
            }

            // 참조가 죽어 못 지운 미리보기 그룹을 이름으로 찾아 지운다 (이전 비정상 종료분 포함)
            function removeLeftoverGroups() {
                try {
                    var groups = doc.activeLayer.groupItems;
                    for (var i = groups.length - 1; i >= 0; i--) {
                        if (groups[i].name === PREVIEW_NAME) {
                            try { groups[i].remove(); } catch (e) {}
                        }
                    }
                } catch (e2) {}
            }

            // -------------------------------------------------------
            // 기하 (mm, y 위쪽 양수, 광학 중심이 원점). 일러 개체를 만지지 않아 tests/check-lens-mirror.js가 그대로 검사한다
            // -------------------------------------------------------
            function arcPiece(cx, cy, r, a0, a1) {
                return { type: "arc", cx: cx, cy: cy, r: r, a0: a0, a1: a1 };
            }

            function linePiece(x0, y0, x1, y1) {
                return { type: "line", x0: x0, y0: y0, x1: x1, y1: y1 };
            }

            // 렌즈 면 하나의 호 반지름: 높이 h, 가운데 두께 tc, 가장자리 두께 te. 호는 (te/2, ±h/2)를 지나고 꼭짓점이 (tc/2, 0)
            function lensRadius(h, tc, te) {
                var d = Math.abs(tc - te) / 2;
                return (h * h / 4 + d * d) / (2 * d);
            }

            // 렌즈 윤곽: 두 호 + 위아래 평평한 테두리(te). tc > te면 볼록(시계 반대), tc < te면 오목(시계 방향). te가 0이면 뾰족한 끝
            function lensPieces(h, tc, te) {
                var d = (tc - te) / 2;
                var R = lensRadius(h, tc, te);
                var theta = Math.atan2(h / 2, R - Math.abs(d));
                var pieces = [];
                if (d > 0) {
                    pieces.push(arcPiece(tc / 2 - R, 0, R, -theta, theta));
                    if (te > 1e-6) pieces.push(linePiece(te / 2, h / 2, -te / 2, h / 2));
                    pieces.push(arcPiece(R - tc / 2, 0, R, Math.PI - theta, Math.PI + theta));
                    if (te > 1e-6) pieces.push(linePiece(-te / 2, -h / 2, te / 2, -h / 2));
                } else {
                    pieces.push(linePiece(-te / 2, h / 2, te / 2, h / 2));
                    pieces.push(arcPiece(tc / 2 + R, 0, R, Math.PI - theta, Math.PI + theta));
                    pieces.push(linePiece(te / 2, -h / 2, -te / 2, -h / 2));
                    pieces.push(arcPiece(-(tc / 2 + R), 0, R, -theta, theta));
                }
                return pieces;
            }

            // 얇은 대칭 렌즈의 초점 거리 f = R / (2(n−1)). 면이 평평하면(두께 차 0) 무한대 대신 큰 값
            function lensFocalLength(h, tc, te, n) {
                if (Math.abs(tc - te) < 1e-9) return 1e9;
                return lensRadius(h, tc, te) / (2 * (n - 1));
            }

            // 초점 거리 f인 렌즈 면의 휨(가운데와 가장자리 두께 차의 절반). f가 h/(4(n−1))보다 짧으면 반원 (h/2)
            function lensSagitta(h, f, n) {
                var R = 2 * (n - 1) * f;
                return R - Math.sqrt(Math.max(0, R * R - h * h / 4));
            }

            // 거울 호: 꼭짓점이 원점, 높이 h, 휨 s. 볼록(kind 2)은 빛 쪽(왼쪽)으로 불룩 "(", 오목(kind 3)은 ")"
            function mirrorRadius(h, s) {
                s = Math.min(s, h / 2);
                return { s: s, R: (h * h / 4 + s * s) / (2 * s) };
            }

            // 구면 거울의 초점 거리 f = R / 2
            function mirrorFocalLength(h, s) {
                return mirrorRadius(h, s).R / 2;
            }

            function mirrorSagitta(h, f) {
                var R = 2 * f;
                return R - Math.sqrt(Math.max(0, R * R - h * h / 4));
            }

            function mirrorArcPiece(kind, h, s) {
                var m = mirrorRadius(h, s);
                var theta = Math.atan2(h / 2, m.R - m.s);
                return kind === 3 ? arcPiece(-m.R, 0, m.R, -theta, theta) : arcPiece(m.R, 0, m.R, Math.PI - theta, Math.PI + theta);
            }

            // 높이 y에서 거울면의 x
            function mirrorSurfaceX(kind, h, s, y) {
                var R = mirrorRadius(h, s).R;
                var dx = Math.sqrt(Math.max(0, R * R - y * y));
                return kind === 3 ? -R + dx : R - dx;
            }

            // 뒷면 빗금: 호를 따라 pitch 간격으로, 뒷면 법선을 45° 돌린 방향(오른쪽 아래)으로 len만큼
            function hatchMarks(kind, h, s, pitch, len) {
                var m = mirrorRadius(h, s);
                var theta = Math.atan2(h / 2, m.R - m.s);
                var count = Math.floor(2 * theta * m.R / pitch);
                var cx = kind === 3 ? -m.R : m.R;
                var a0 = kind === 3 ? 0 : Math.PI;
                var marks = [];
                for (var i = 0; i < count; i++) {
                    var a = a0 + (i - (count - 1) / 2) * pitch / m.R;
                    var px = cx + m.R * Math.cos(a);
                    var py = m.R * Math.sin(a);
                    var nx = kind === 3 ? Math.cos(a) : -Math.cos(a);   // 오목은 중심 반대쪽, 볼록은 중심 쪽이 뒷면
                    var ny = kind === 3 ? Math.sin(a) : -Math.sin(a);
                    var c = Math.SQRT1_2;
                    var dx = nx * c + ny * c;
                    var dy = -nx * c + ny * c;
                    marks.push(linePiece(px, py, px + dx * len, py + dy * len));
                }
                return marks;
            }

            // 초점 자리. 렌즈는 양쪽, 오목 거울은 앞(왼쪽), 볼록 거울은 뒤(오른쪽)
            function focusSpots(kind, f) {
                if (kind <= 1) return [[-f, 0], [f, 0]];
                return kind === 2 ? [[f, 0]] : [[-f, 0]];
            }

            // 평행 광선 높이: 간격으로 등분해 가운데 정렬. 렌즈·거울 높이(aperture = h/2) 밖은 뺀다
            function rayHeights(count, spacing, aperture) {
                var list = [];
                for (var i = 0; i < count; i++) {
                    var y = (i - (count - 1) / 2) * spacing;
                    if (Math.abs(y) <= aperture + 1e-9) list.push(y);
                }
                return list;
            }

            // 높이 y의 평행 광선 하나. real: 실제 경로 조각(입사, 꺾인 뒤), virtual: 초점까지의 가상 경로(파선).
            // 렌즈는 중심선(x=0)에서 꺾이고 거울은 거울면에서 반사한다. 꺾인 뒤는 x=±L까지 잇는다
            function rayPieces(kind, y, f, L, geom) {
                var hx = kind <= 1 ? 0 : mirrorSurfaceX(kind, geom.h, geom.s, y);
                var real = [linePiece(-L, y, hx, y)];
                var virtual = [];
                var onAxis = Math.abs(y) < 1e-9;
                if (kind >= 2 && onAxis) return { real: real, virtual: virtual };   // 되돌아가 겹치므로 입사만
                var dx, dy;
                if (kind === 0) { dx = f; dy = -y; }              // (0,y) → F(f,0)
                else if (kind === 1) { dx = f; dy = y; }          // F(-f,0) → (0,y) 방향으로 퍼진다
                else if (kind === 2) { dx = hx - f; dy = y; }     // F(f,0) → 반사점 방향으로 퍼진다
                else { dx = -f - hx; dy = -y; }                   // 반사점 → F(-f,0)
                var end = extendTo([hx, y], [dx, dy], kind <= 1 ? L : -L, L);
                real.push(linePiece(hx, y, end[0], end[1]));
                if (!onAxis && kind === 1) virtual.push(linePiece(hx, y, -f, 0));
                if (!onAxis && kind === 2) virtual.push(linePiece(hx, y, f, 0));
                return { real: real, virtual: virtual };
            }

            // 점 from에서 dir 방향으로 x = targetX까지 간 끝점. 그쪽으로 안 가면 길이 L만큼
            function extendTo(from, dir, targetX, L) {
                var t = (targetX - from[0]) / dir[0];
                if (isFinite(t) && t > 0) return [from[0] + dir[0] * t, from[1] + dir[1] * t];
                var m = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
                return [from[0] + dir[0] / m * L, from[1] + dir[1] / m * L];
            }

            // 부호 있는 초점 거리: 볼록 렌즈·오목 거울 +, 오목 렌즈·볼록 거울 −
            function signedFocal(kind, f) {
                return (kind === 0 || kind === 3) ? f : -f;
            }

            // 물체 거리 u(중심선 왼쪽, 양수)의 물체가 맺는 상. 1/f = 1/u + 1/v.
            // v: 렌즈는 +면 오른쪽(실상), 거울은 +면 앞쪽(실상). x: 상의 x 좌표, m: 배율(음수면 거꾸로). 상이 무한대(물체가 초점 위)면 finite=false
            function imageOf(kind, u, f) {
                var fs = signedFocal(kind, f);
                var denom = u - fs;
                if (Math.abs(denom) < 1e-9) return { finite: false };
                var v = fs * u / denom;
                if (!isFinite(v) || Math.abs(v) > 1000) return { finite: false };
                return { finite: true, v: v, x: kind <= 1 ? v : -v, m: -v / u, real: v > 0 };
            }

            // 점 from에서 dir 방향으로 나간 광선이 렌즈 중심선(x=0)이나 거울면에 닿는 점. 높이 밖이거나 안 닿으면 null
            function surfaceHit(kind, geom, from, dir) {
                var hit;
                if (kind <= 1) {
                    if (dir[0] <= 1e-12) return null;
                    var t = -from[0] / dir[0];
                    hit = [0, from[1] + dir[1] * t];
                } else {
                    var m = mirrorRadius(geom.h, geom.s);
                    var cx = kind === 3 ? -m.R : m.R;
                    var px = from[0] - cx, py = from[1];
                    var a = dir[0] * dir[0] + dir[1] * dir[1];
                    var b = 2 * (px * dir[0] + py * dir[1]);
                    var c = px * px + py * py - m.R * m.R;
                    var disc = b * b - 4 * a * c;
                    if (disc < 0) return null;
                    var root = Math.sqrt(disc);
                    var best = null, bestDist = Infinity;
                    var ts = [(-b - root) / (2 * a), (-b + root) / (2 * a)];
                    for (var i = 0; i < 2; i++) {
                        if (ts[i] <= 1e-9) continue;
                        var p = [from[0] + dir[0] * ts[i], from[1] + dir[1] * ts[i]];
                        var dist = p[0] * p[0] + p[1] * p[1];   // 꼭짓점(원점)에 가까운 교점이 거울면
                        if (dist < bestDist) { bestDist = dist; best = p; }
                    }
                    hit = best;
                }
                if (hit === null || Math.abs(hit[1]) > geom.h / 2 + 1e-9) return null;
                return hit;
            }

            // 물체 꼭대기 P=(-u, yP)에서 나가는 주광선: 평행(→ 초점), 중심(→ 직진, 거울은 꼭짓점 반사), 초점(→ 평행).
            // 꺾인 뒤는 상점을 향하거나(실상) 상점에서 나온 것처럼(허상, 가상 경로 파선) 긋고, 상이 무한대면 중심 광선과 평행하게 긋는다.
            // 꺾인 뒤는 x=±L까지, 실상이 그보다 멀면 상점을 지나 overshoot만큼 더 긋는다.
            // 각 원소 {real: [입사, 꺾인 뒤], virtual: [닿은 점 → 상점]}. 렌즈·거울 높이 밖에 닿는 광선은 뺀다
            function principalRays(kind, u, yP, f, L, geom, overshoot) {
                var lens = kind <= 1;
                var fs = signedFocal(kind, f);
                var img = imageOf(kind, u, f);
                var from = [-u, yP];
                var dirs = [[1, 0], [u, -yP]];
                if (Math.abs(u - fs) > 1e-9) {
                    var toFocus = [u - fs, -yP];            // P와 초점 (-fs, 0)을 잇는 선. 렌즈 쪽(오른쪽)으로 향하게
                    if (toFocus[0] < 0) toFocus = [-toFocus[0], -toFocus[1]];
                    dirs.push(toFocus);
                }
                var parallel = lens ? [u, -yP] : [-u, -yP];  // 상이 무한대일 때 꺾인 뒤 방향 (중심 광선 / 꼭짓점 반사)
                var far = (img.finite && img.real) ? Math.max(L, Math.abs(img.x) + (overshoot || 0)) : L;
                var result = [];
                for (var i = 0; i < dirs.length; i++) {
                    var hit = surfaceHit(kind, geom, from, dirs[i]);
                    if (hit === null) continue;
                    var out;
                    if (!img.finite) out = parallel;
                    else if (img.real) out = [img.x - hit[0], img.m * yP - hit[1]];
                    else out = [hit[0] - img.x, hit[1] - img.m * yP];
                    var end = extendTo(hit, out, lens ? far : -far, L);
                    var ray = { real: [linePiece(from[0], from[1], hit[0], hit[1]), linePiece(hit[0], hit[1], end[0], end[1])], virtual: [] };
                    if (img.finite && !img.real) ray.virtual.push(linePiece(hit[0], hit[1], img.x, img.m * yP));
                    result.push(ray);
                }
                return result;
            }

            // 물체·상 이름 글자 자리 (mm). 도형 가운데, 광축 반대쪽으로 gap만큼 떨어져서: 바로 선 도형은 광축 아래(글자 위가 -gap),
            // 거꾸로 매달린 실상은 광축 위(글자 아래가 +gap). 상이 없으면 물체만
            function nameLabelSpots(u, img, gap) {
                var spots = [{ text: "물체", x: -u, y: -gap, above: false }];
                if (img.finite) {
                    var inverted = img.m < 0;
                    spots.push({ text: img.real ? "실상" : "허상", x: img.x, y: inverted ? gap : -gap, above: inverted });
                }
                return spots;
            }

            // 조각 위 x = targetX인 자리에 진행 방향 화살촉(닫힌 삼각형, 가운데가 그 자리). 조각이 거기까지 안 가면 null
            function arrowAt(seg, targetX, len) {
                var dx = seg.x1 - seg.x0;
                var dy = seg.y1 - seg.y0;
                var m = Math.sqrt(dx * dx + dy * dy);
                if (m < len || Math.abs(dx) < 1e-9) return null;
                var t = (targetX - seg.x0) / dx;
                var margin = len / (2 * m);
                if (t < margin || t > 1 - margin) return null;
                var cx = seg.x0 + dx * t, cy = seg.y0 + dy * t;
                var ux = dx / m, uy = dy / m;
                var w = len * 0.4;
                var bx = cx - ux * len / 2, by = cy - uy * len / 2;
                return [[cx + ux * len / 2, cy + uy * len / 2], [bx - uy * w, by + ux * w], [bx + uy * w, by - ux * w]];
            }

            // 호 → 3차 베지어 점 (90°씩 나눔). {anchor, left, right}, 시작·끝 포함
            function arcPoints(a) {
                var sweep = a.a1 - a.a0;
                var n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
                var d = sweep / n;
                var k = 4 / 3 * Math.tan(d / 4) * a.r;
                var pts = [];
                for (var i = 0; i <= n; i++) {
                    var ang = a.a0 + d * i;
                    var c = Math.cos(ang), s = Math.sin(ang);
                    var p = [a.cx + a.r * c, a.cy + a.r * s];
                    var tx = -s * k, ty = c * k;
                    pts.push({ anchor: p, left: i === 0 ? p : [p[0] - tx, p[1] - ty], right: i === n ? p : [p[0] + tx, p[1] + ty] });
                }
                return pts;
            }

            function linePoints(seg) {
                var p0 = [seg.x0, seg.y0], p1 = [seg.x1, seg.y1];
                return [{ anchor: p0, left: p0, right: p0 }, { anchor: p1, left: p1, right: p1 }];
            }

            // 이어진 조각들을 점 목록 하나로. 맞닿은 끝점은 합치고, 닫힌 패스는 마지막 점을 첫 점에 합친다
            function piecesToPoints(pieces, closed) {
                var pts = [];
                for (var i = 0; i < pieces.length; i++) {
                    var seg = pieces[i].type === "arc" ? arcPoints(pieces[i]) : linePoints(pieces[i]);
                    if (pts.length > 0) {
                        pts[pts.length - 1].right = seg[0].right;
                        seg.shift();
                    }
                    pts = pts.concat(seg);
                }
                if (closed && pts.length > 1) {
                    pts[0].left = pts[pts.length - 1].left;
                    pts.pop();
                }
                return pts;
            }

            // 양쪽 핸들이 한 직선 위에 반대 방향으로 있으면 매끄러운 점
            function isSmooth(pt) {
                var ax = pt.anchor[0] - pt.left[0], ay = pt.anchor[1] - pt.left[1];
                var bx = pt.right[0] - pt.anchor[0], by = pt.right[1] - pt.anchor[1];
                var la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
                if (la < 1e-9 || lb < 1e-9) return false;
                return Math.abs(ax * by - ay * bx) < 1e-6 * la * lb && ax * bx + ay * by > 0;
            }

            // -------------------------------------------------------
            // 글꼴 · 색
            // -------------------------------------------------------
            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
            }

            // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
            function makeGray(k) {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0;
                    color.magenta = 0;
                    color.yellow = 0;
                    color.black = k;
                } else {
                    color = new RGBColor();
                    var level = Math.round(255 * (1 - k / 100));
                    color.red = level;
                    color.green = level;
                    color.blue = level;
                }
                return color;
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function settingKeys() {
                return {
                    keys: ["kind", "height", "centerThickness", "edgeThickness", "bulge", "index", "outlineWidth", "hatchMm", "reach",
                        "focalLength", "labelSize", "rayCount", "raySpacing", "objectDistance", "rayWidth", "arrowMm", "arrowPos",
                        "offsetX", "offsetY"],
                    mins: [0, 10, 0, 0, 0.5, 1.5, 0.1, 0.5, 10, 1, 4, 1, 1, 1, 0.1, 0.5, 0, -100, -100],
                    maxs: [3, 100, 20, 20, 30, 2, 3, 5, 150, 1000, 20, 9, 20, 150, 3, 5, 150, 100, 100],
                    flags: ["hatch", "axis", "centerLine", "focus", "focusLabel", "nameLabels", "rays", "rayDashed", "rayArrows", "showImage", "preview"]
                };
            }

            function readSettings() {
                var result = { kind: 0, height: 24, centerThickness: 8, edgeThickness: 1, bulge: 2.5, index: 1.5, outlineWidth: 0.5,
                    hatchMm: 1.5, reach: 40, focalLength: 20, labelSize: 8, rayCount: 5, raySpacing: 4, objectDistance: 45,
                    rayWidth: 0.3, arrowMm: 1.5, arrowPos: 12, offsetX: 0, offsetY: 0,
                    hatch: true, axis: true, centerLine: true, focus: true, focusLabel: true, nameLabels: true,
                    rays: true, rayDashed: false, rayArrows: true, showImage: true, preview: true };
                try {
                    var spec = settingKeys();
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v5" || p.length !== 1 + spec.keys.length + spec.flags.length) return result;
                    for (var i = 0; i < spec.keys.length; i++) {
                        var raw = p[i + 1];
                        var value = Number(raw);
                        if (!/\S/.test(raw) || !isFinite(value) || value < spec.mins[i] || value > spec.maxs[i]) return result;
                    }
                    for (var j = 0; j < spec.flags.length; j++) {
                        if (!/^[01]$/.test(p[1 + spec.keys.length + j])) return result;
                    }
                    for (var m = 0; m < spec.keys.length; m++) result[spec.keys[m]] = Number(p[m + 1]);
                    result.kind = Math.round(result.kind);
                    result.rayCount = Math.round(result.rayCount);
                    for (var n = 0; n < spec.flags.length; n++) result[spec.flags[n]] = p[1 + spec.keys.length + n] === "1";
                } catch (e) {}
                return result;
            }

            function saveSettings() {
                try {
                    var spec = settingKeys();
                    var parts = ["v5"];
                    for (var i = 0; i < spec.keys.length; i++) parts.push(options[spec.keys[i]]);
                    for (var j = 0; j < spec.flags.length; j++) parts.push(options[spec.flags[j]] ? 1 : 0);
                    app.preferences.setStringPreference(PREF_KEY, parts.join("|"));
                } catch (e) {}
            }
        }
        return api;
    }

    // ==== 평면거울 ====
    function makePlaneEngine() {
        var api = {label: "평면거울", addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {

            var PREF_KEY = "ObjectPlaneMirror/settings";
            var MM = 2.834645669;
            var LINE_WIDTH_PT = 0.3;
            var OBJECT_WIDTH_PT = 1;
            var GUIDE_DASH = [2, 1.5];
            var HEAD_LENGTH = 1.6 * MM;
            var HEAD_WIDTH = 1.1 * MM;
            var HATCH_MM = 1.5;
            var EYE_MM = 3;
            var IMAGE_K = 50;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var LABEL_WIDTH = 100;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;
            var POSITION_LIMIT_MM = 100;
            var MIRROR_RANGE = [10, 200];
            var DISTANCE_RANGE = [5, 150];
            var HEIGHT_RANGE = [2, 150];
            var EYE_HEIGHT_RANGE = [0, 200];
            var FONT_RANGE = [5, 20];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var batangFont = findOptionalFont("Batang");
            var ENG_BASELINE_PT = 0.5;

            // 옵션
            var mirrorMm = 50;
            var objectDistMm = 25;
            var objectHeightMm = 18;
            var eyeDistMm = 40;
            var eyeHeightMm = 30;
            var topRayOn = true;
            var bottomRayOn = true;
            var normalOn = true;
            var labelsOn = true;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            readSettings();

            var layer = findEditableLayer();
            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var dlg = page;

            var shapePanel = addPanel(dlg, "배치");
            var mirrorRow = addValueRow(shapePanel, "거울 높이", "mm", mirrorMm, MIRROR_RANGE[0], MIRROR_RANGE[1], 1, 0);
            var objectDistRow = addValueRow(shapePanel, "물체 거리", "mm", objectDistMm, DISTANCE_RANGE[0], DISTANCE_RANGE[1], 1, 0);
            var objectHeightRow = addValueRow(shapePanel, "물체 높이", "mm", objectHeightMm, HEIGHT_RANGE[0], HEIGHT_RANGE[1], 1, 0);
            var eyeDistRow = addValueRow(shapePanel, "눈 거리", "mm", eyeDistMm, DISTANCE_RANGE[0], DISTANCE_RANGE[1], 1, 0);
            var eyeHeightRow = addValueRow(shapePanel, "눈 높이", "mm", eyeHeightMm, EYE_HEIGHT_RANGE[0], EYE_HEIGHT_RANGE[1], 1, 0);
            eyeHeightRow.input.helpTip = "거울 아래 끝에서 잰 높이";

            var markPanel = addPanel(dlg, "표시");
            var checkRow = markPanel.add("group");
            var topCheck = checkRow.add("checkbox", undefined, "꼭대기 광선");
            var bottomCheck = checkRow.add("checkbox", undefined, "아래 끝 광선");
            var checkRow2 = markPanel.add("group");
            var normalCheck = checkRow2.add("checkbox", undefined, "법선·입사각·반사각");
            var labelsCheck = checkRow2.add("checkbox", undefined, "글자");
            var fontRow = addValueRow(markPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            topCheck.value = topRayOn;
            bottomCheck.value = bottomRayOn;
            normalCheck.value = normalOn;
            labelsCheck.value = labelsOn;
            topCheck.onClick = function() { topRayOn = topCheck.value; updatePreview(); };
            bottomCheck.onClick = function() { bottomRayOn = bottomCheck.value; updatePreview(); };
            normalCheck.onClick = function() { normalOn = normalCheck.value; updatePreview(); };
            labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
            bindValueRow(mirrorRow, function() { return mirrorMm; }, function(v) { mirrorMm = v; });
            bindValueRow(objectDistRow, function() { return objectDistMm; }, function(v) { objectDistMm = v; });
            bindValueRow(objectHeightRow, function() { return objectHeightMm; }, function(v) { objectHeightMm = v; });
            bindValueRow(eyeDistRow, function() { return eyeDistMm; }, function(v) { eyeDistMm = v; });
            bindValueRow(eyeHeightRow, function() { return eyeHeightMm; }, function(v) { eyeHeightMm = v; });
            bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
            bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
            bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { previewEnabled = on; updatePreview(); };
            api.updatePreview = updatePreview;
            api.clearPreview = clearPreview;
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                try { previewGroup.selected = true; } catch (selectError) {}
                return true;
            };

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            function buildPreview() {
                var g = mirrorScene(mirrorMm * MM, objectDistMm * MM, objectHeightMm * MM, eyeDistMm * MM, eyeHeightMm * MM);
                previewGroup = layer.groupItems.add();
                previewGroup.name = "평면거울의 상";
                // 거울과 뒷면 빗금
                var mirror = addLine([[0, g.bottom], [0, g.top]], null, "거울");
                mirror.strokeWidth = OBJECT_WIDTH_PT;
                var hatch = HATCH_MM * MM;
                for (var y = g.bottom + hatch; y <= g.top + 1e-6; y += hatch) addLine([[0, y], [hatch, y - hatch]], null, "빗금");
                // 물체와 상
                var object = addArrow([g.object[0], g.object[1]], "물체");
                object.strokeWidth = OBJECT_WIDTH_PT;
                var image = addLine([g.image[0], g.image[1]], GUIDE_DASH, "상");
                image.strokeWidth = OBJECT_WIDTH_PT;
                image.strokeColor = makeGray(IMAGE_K);
                addHead(g.image[1], 0, 1).fillColor = makeGray(IMAGE_K);
                var rays = [];
                if (bottomRayOn) rays.push(0);
                if (topRayOn) rays.push(1);
                for (var r = 0; r < rays.length; r++) {
                    var ray = reflectionRay(g.object[rays[r]], g.eye, g.bottom, g.top);
                    if (ray === null) continue;
                    addLine([g.object[rays[r]], ray.m], null, "입사 광선");
                    addHead(midpoint(g.object[rays[r]], ray.m), ray.m[0] - g.object[rays[r]][0], ray.m[1] - g.object[rays[r]][1]);
                    addLine([ray.m, g.eye], null, "반사 광선");
                    addHead(midpoint(ray.m, g.eye), g.eye[0] - ray.m[0], g.eye[1] - ray.m[1]);
                    addLine([ray.m, g.image[rays[r]]], GUIDE_DASH, "연장선");
                    if (normalOn) drawNormal(ray.m, g.object[rays[r]], g.eye);
                }
                drawEye(g.eye);
                if (labelsOn) {
                    var gap = fontPt * 0.9;
                    addText("물체", g.object[1][0], g.object[1][1] + gap, 0);
                    addText("상", g.image[1][0], g.image[1][1] + gap, 0);
                    addText("거울", 0, g.top + gap, 0);
                    addText("눈", g.eye[0], g.eye[1] - EYE_MM * MM / 2 - gap, 0);
                }
                previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
            }

            // 반사점에서 앞쪽으로 파선 법선, 법선과 두 광선 사이에 i·r 호
            function drawNormal(m, from, to) {
                var length = Math.max(8 * MM, Math.abs(from[0]) * 0.6);
                addLine([m, [m[0] - length, m[1]]], GUIDE_DASH, "법선");
                var radius = Math.min(6 * MM, length * 0.5);
                var marks = [[from, "i"], [to, "r"]];
                for (var i = 0; i < 2; i++) {
                    var angle = Math.atan2(marks[i][0][1] - m[1], marks[i][0][0] - m[0]);
                    var arc = drawBezier(previewGroup, arcPoints(m[0], m[1], radius, Math.PI, angle < 0 ? angle + 2 * Math.PI : angle), false);
                    styleLine(arc, LINE_WIDTH_PT, null);
                    arc.name = "각 표시";
                    if (!labelsOn) continue;
                    var end = angle < 0 ? angle + 2 * Math.PI : angle;
                    var middle = (Math.PI + end) / 2;
                    // 글자가 법선·광선 사이(쐐기)에 들어갈 만큼 각이 넓으면 이등분선 위, 좁으면 쐐기 밖(호 끝 옆, 광선 바깥쪽)에 둔다
                    var halfHeight = fontPt * 0.45, pad = fontPt * 0.15;
                    var labelR = radius + fontPt * 0.6;
                    var half = Math.abs(end - Math.PI) / 2;
                    if (labelR * Math.sin(half) >= halfHeight + pad) {
                        addText(marks[i][1], m[0] + labelR * Math.cos(middle), m[1] + labelR * Math.sin(middle), 0);
                    } else {
                        var side = Math.sin(end) < 0 ? -1 : 1;
                        addText(marks[i][1], m[0] + radius * Math.cos(end), m[1] + radius * Math.sin(end) + side * (halfHeight + pad), 0);
                    }
                }
            }

            // 흰 원에 거울 쪽(오른쪽)으로 치우친 눈동자
            function drawEye(center) {
                var d = EYE_MM * MM;
                addDisc(center, d, 0, "눈");
                addDisc([center[0] + d * 0.2, center[1]], d * 0.45, 100, "눈동자");
            }

            // -------------------------------------------------------
            // 기하 (순수 계산, 거울 가운데 (0, 0), 앞쪽이 왼쪽)
            // -------------------------------------------------------
            // 물체 [아래, 위], 상 [아래, 위], 눈, 거울 위아래 끝. 물체 아래 끝은 거울 아래 끝 높이
            function mirrorScene(mirrorHeight, objectDist, objectHeight, eyeDist, eyeHeight) {
                var bottom = -mirrorHeight / 2, top = mirrorHeight / 2;
                return {
                    bottom: bottom, top: top,
                    object: [[-objectDist, bottom], [-objectDist, bottom + objectHeight]],
                    image: [[objectDist, bottom], [objectDist, bottom + objectHeight]],
                    eye: [-eyeDist, bottom + eyeHeight]
                };
            }

            // 점 p의 빛이 거울(x = 0)에서 반사해 눈으로 오는 반사점: 눈과 상(p를 거울에 대칭)을 잇는 직선이 거울과 만나는 점.
            // 거울 밖이면 null
            function reflectionRay(p, eye, bottom, top) {
                var image = [-p[0], p[1]];
                var t = -eye[0] / (image[0] - eye[0]);
                var y = eye[1] + (image[1] - eye[1]) * t;
                if (y < bottom - 1e-9 || y > top + 1e-9) return null;
                return {m: [0, y]};
            }

            function midpoint(a, b) {
                return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v1", mirrorMm, objectDistMm, objectHeightMm, eyeDistMm, eyeHeightMm, topRayOn ? "1" : "0",
                    bottomRayOn ? "1" : "0", normalOn ? "1" : "0", labelsOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function readSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14) return;
                mirrorMm = restoreNumber(p[1], mirrorMm, MIRROR_RANGE, 1);
                objectDistMm = restoreNumber(p[2], objectDistMm, DISTANCE_RANGE, 1);
                objectHeightMm = restoreNumber(p[3], objectHeightMm, HEIGHT_RANGE, 1);
                eyeDistMm = restoreNumber(p[4], eyeDistMm, DISTANCE_RANGE, 1);
                eyeHeightMm = restoreNumber(p[5], eyeHeightMm, EYE_HEIGHT_RANGE, 1);
                topRayOn = p[6] === "1";
                bottomRayOn = p[7] === "1";
                normalOn = p[8] === "1";
                labelsOn = p[9] === "1";
                fontPt = restoreNumber(p[10], fontPt, FONT_RANGE, 0.5);
                offsetXmm = restoreNumber(p[11], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
                offsetYmm = restoreNumber(p[12], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
                previewEnabled = p[13] === "1";
            }

            // -------------------------------------------------------
            // 공통 도우미
            // -------------------------------------------------------
                function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

                function movePreview(deltaX, deltaY) {
                if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
                try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
            }

                // 중심 (cx, cy), 반지름 r인 원호를 from → to(라디안)로 90° 이하 조각마다 베지어 하나
            function arcPoints(cx, cy, r, from, to) {
                var sweep = to - from;
                var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * r;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = from + step * i;
                    var p = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
                    var tangent = [-Math.sin(angle) * handle, Math.cos(angle) * handle];
                    points.push({
                        anchor: p,
                        left: i === 0 ? p : [p[0] - tangent[0], p[1] - tangent[1]],
                        right: i === pieces ? p : [p[0] + tangent[0], p[1] + tangent[1]]
                    });
                }
                return points;
            }

                // 끝이 tip, 방향 (dx, dy)인 채운 삼각형의 세 점
            function arrowHeadPoints(tip, dx, dy) {
                var length = Math.sqrt(dx * dx + dy * dy);
                var ux = dx / length, uy = dy / length;
                var bx = tip[0] - ux * HEAD_LENGTH, by = tip[1] - uy * HEAD_LENGTH;
                return [tip, [bx - uy * HEAD_WIDTH / 2, by + ux * HEAD_WIDTH / 2], [bx + uy * HEAD_WIDTH / 2, by - ux * HEAD_WIDTH / 2]];
            }

                function styleLine(path, weight, dashes, k) {
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(k === undefined ? 100 : k);
                path.strokeWidth = weight;
                if (dashes) path.strokeDashes = dashes;
            }

                function styleFace(path, k, stroked) {
                path.filled = true;
                path.fillColor = makeGray(k);
                path.stroked = stroked !== false;
                if (path.stroked) {
                    path.strokeColor = makeGray(100);
                    path.strokeWidth = LINE_WIDTH_PT;
                }
            }

                function addLine(points, dashes, name, container) {
                var line = (container || previewGroup).pathItems.add();
                line.setEntirePath(points);
                styleLine(line, LINE_WIDTH_PT, dashes);
                line.name = name;
                return line;
            }

                function addHead(tip, dx, dy, container) {
                var head = (container || previewGroup).pathItems.add();
                head.setEntirePath(arrowHeadPoints(tip, dx, dy));
                head.closed = true;
                head.stroked = false;
                head.filled = true;
                head.fillColor = makeGray(100);
                head.name = "화살촉";
                return head;
            }

                // 꺾은선 화살표: 마지막 점에 화살촉
            function addArrow(points, name, container) {
                var line = addLine(points, null, name, container);
                var a = points[points.length - 2], b = points[points.length - 1];
                addHead(b, b[0] - a[0], b[1] - a[1], container);
                return line;
            }

                function addDisc(center, diameter, k, name, container) {
                var disc = (container || previewGroup).pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
                styleFace(disc, k);
                disc.name = name;
                return disc;
            }

                function drawBezier(container, points, closed) {
                var path = container.pathItems.add();
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                }
                path.closed = closed;
                return path;
            }

                // 세로 가운데가 y. align이 0이면 가로 가운데, 1이면 왼쪽 끝, -1이면 오른쪽 끝이 x
            function addText(text, x, y, align, container) {
                var frame = (container || previewGroup).textFrames.add();
                frame.contents = text;
                frame.textRange.characterAttributes.size = fontPt;
                frame.textRange.characterAttributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var anchorX = align === 1 ? b[0] : (align === -1 ? b[2] : (b[0] + b[2]) / 2);
                frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
                return frame;
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

                // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는
            // GSMediumB1(기준선 +0.5pt). 항목 기호 (가)(나)는 바탕 1.25배, ㉠·ⓐ는 바탕 1.125배 (8pt 기준 10pt·9pt).
            // 크기를 정한 뒤에 부른다
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var attributes = frame.textRange.characters[i].characterAttributes;
                    var bracket = batangFont !== null && isBracketLabel(text, i);
                    if (bracket || (batangFont !== null && isCircledLabel(code))) {
                        attributes.textFont = batangFont;
                        attributes.size = attributes.size * (bracket ? 1.25 : 1.125);
                        attributes.baselineShift = 0;
                    } else if (isKoreanOrSpace(code)) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
            }

            function isKoreanOrSpace(code) {
                return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
            }

            // i번째 글자가 "(한글 한 글자)" 세 글자 안에 드는가
            function isBracketLabel(text, i) {
                for (var start = i - 2; start <= i; start++) {
                    if (start < 0 || start + 2 >= text.length) continue;
                    var inner = text.charCodeAt(start + 1);
                    if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return true;
                }
                return false;
            }

            // ㉠㉡… ⓐⓑ…
            function isCircledLabel(code) {
                return (code >= 0x3260 && code <= 0x327F) || (code >= 0x24D0 && code <= 0x24E9);
            }

            // 없으면 null (바탕이 없으면 항목 기호도 Spoqa로 둔다)
            function findOptionalFont(name) {
                try { return app.textFonts.getByName(name); } catch (e) { return null; }
            }

            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
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
                input.characters = 6;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return {input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals};
            }

                // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
            function bindValueRow(controls, getter, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    if (value === getter()) return;
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? getter() : value);
                };
            }

                // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            function bindPositionRow(controls, getter, setter, isX) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM;
                    setter(value);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0) return;
                    movePreview(isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
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

                function restoreNumber(text, fallback, range, step) {
                var value = parseNumber(text);
                if (value === null) return fallback;
                return clamp(roundTo(value, step), range[0], range[1]);
            }
        }
        return api;
    }
})();
