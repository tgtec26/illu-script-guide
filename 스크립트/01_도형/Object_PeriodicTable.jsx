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
  Object_PeriodicTable.jsx
  기능: 족·주기를 골라 빈 주기율표 틀을 만듭니다.
    - 족은 "1, 2, 13~17"처럼 입력합니다(쉼표 구분, ~ 또는 -로 범위). 주기는 체크박스(1~5)
    - 실제 주기율표 모양대로 없는 칸은 비웁니다(1주기는 1·18족, 2·3주기는 1·2·13~18족)
    - 셀 너비·높이·간격·라운딩을 조절하고, 1행 높이·1열 너비는 따로 정해 머리글에 우선 적용합니다
    - '튀어나옴'을 켜면 바깥을 4분면으로 나눠 왼·위는 밝고 오른·아래는 어두운 경사면을 두르고,
      그 안에 경사 폭만큼 들인 윗면(왼쪽 위→오른쪽 아래로 밝아짐)을 놓아 얇은 키캡처럼 보입니다.
      윗면 라운딩은 바깥 라운딩에 비례합니다. 끄면 평면입니다
    - '테두리'를 켜면 셀마다 검은 선을 두릅니다
    - 1행 1열에는 대각선과 '족'·'주기' 글자가 들어갑니다
    - 글자는 한글=Spoqa, 숫자·영문=GSMediumB1 규칙을 글자마다 적용합니다
  사용법: 그냥 실행하면 화면 중앙에 만듭니다
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectPeriodicTable/settings";
    var mmToPt = 2.83464567;
    var PREVIEW_NAME = "PeriodicTable_Preview";   // 확인 때 "PeriodicTable"로 바꾼다
    var MAX_PERIOD = 5;
    var MAX_GROUP = 18;
    var CORNER_LABEL_SCALE = 0.9;   // 모서리 '족'·'주기'는 숫자 크기의 90%
    // 키캡 경사면: 바깥 둥근 사각형을 4분면으로 나눠 분면마다 두 경사면(왼·위 등)을 대각 그라데이션으로 잇는다.
    // 색은 셀 음영 K 기준 오프셋 (참고 SVG: 왼 #ebebeb, 위 #dbdbdb, 오른 #b5b5b5, 아래 #9c9c9c, 윗면 #cfcfcf→#e8e8e8)
    var BEVEL_K = { left: -2, top: 4, right: 19, bottom: 29, faceDark: 9, faceLight: 0 };
    // 분면: 어느 모서리를 둥글리는지, 그라데이션 축 방향(각도 부호), 시작·끝 경사면
    var QUADRANTS = [
        { name: "tl", sign: 1, from: "left", to: "top" },      // 왼쪽 아래 → 오른쪽 위
        { name: "tr", sign: -1, from: "top", to: "right" },    // 왼쪽 위 → 오른쪽 아래
        { name: "bl", sign: -1, from: "left", to: "bottom" },
        { name: "br", sign: 1, from: "bottom", to: "right" }
    ];
    var INNER_RADIUS_RATIO = 1.11;  // 윗면 라운딩 = 바깥 라운딩 × 1.11 (참고 SVG 1.29/1.16)
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var lineColor = makeBlackColor(doc);
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var options = readSettings();
    var previewGroup = null;
    var bevelGradients = {};    // 종류×부위별 그라데이션. 문서에 한 번만 만들고 음영이 바뀌면 색만 고친다
    var tintedK = {};           // 종류별로 마지막에 칠한 음영 K
    var cells = [];             // 미리보기의 셀 목록
    var cellIndex = {};         // 셀 key → previewGroup.groupItems 위치 (syncCells가 채운다)
    var cellGeomKeys = {};      // 셀 key → 마지막으로 그린 자리·모양. 같으면 경로를 다시 쓰지 않는다
    var rebuildPending = false; // 족·주기가 바뀌면 셀 구성을 다시 맞춘다
    var previewPending = false;
    var lastPreviewTime = 0;
    var PREVIEW_INTERVAL_MS = 40;
    // 표의 왼쪽 위. 처음 크기 기준으로 화면 중앙에 두고, 이후 크기 변화는 오른쪽·아래로 자란다
    var originX = null;
    var originY = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "주기율표");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 12;

    var rangePanel = addPanel(win, "족·주기");
    var groupRow = rangePanel.add("group");
    var groupCaption = groupRow.add("statictext", undefined, "족");
    groupCaption.preferredSize.width = 85;
    var groupInput = groupRow.add("edittext", undefined, options.groups);
    groupInput.characters = 24;
    groupInput.helpTip = "쉼표로 구분, ~ 또는 -로 범위 (예: 1, 2, 13~18)";
    var periodRow = rangePanel.add("group");
    var periodCaption = periodRow.add("statictext", undefined, "주기");
    periodCaption.preferredSize.width = 85;
    var periodChecks = [];
    for (var p = 0; p < MAX_PERIOD; p++) {
        periodChecks[p] = periodRow.add("checkbox", undefined, String(p + 1));
        periodChecks[p].value = options.periods[p];
    }

    var cellPanel = addPanel(win, "셀");
    addRow(cellPanel, "너비", "cellW", 5, 20, "mm", 0.5);
    addRow(cellPanel, "높이", "cellH", 5, 20, "mm", 0.5);
    addRow(cellPanel, "간격", "gap", 0, 3, "mm", 0.1);
    addRow(cellPanel, "라운딩", "radius", 0, 5, "mm", 0.1);
    addRow(cellPanel, "1행 높이", "headRowH", 5, 30, "mm", 0.5);
    addRow(cellPanel, "1열 너비", "headColW", 5, 30, "mm", 0.5);

    var stylePanel = addPanel(win, "모양");
    var styleRow = stylePanel.add("group");
    var raisedCheck = styleRow.add("checkbox", undefined, "튀어나옴");
    raisedCheck.value = options.raised;
    raisedCheck.helpTip = "왼·위는 밝고 오른·아래는 어두운 경사면을 둘러 얇은 키캡처럼 보이게 합니다";
    var borderCheck = styleRow.add("checkbox", undefined, "테두리");
    borderCheck.value = options.border;
    addRow(stylePanel, "경사 폭", "depth", 0.1, 3, "mm", 0.1);
    addRow(stylePanel, "선 두께", "strokeW", 0.1, 3, "pt", 0.1);
    addRow(stylePanel, "머리글 음영", "headK", 0, 100, "K", 5);
    addRow(stylePanel, "셀 음영", "bodyK", 0, 100, "K", 5);

    var textPanel = addPanel(win, "글자");
    addRow(textPanel, "숫자 크기", "fontSize", 4, 30, "pt", 0.5);

    var positionPanel = addPanel(win, "위치");
    addRow(positionPanel, "가로 이동", "offsetX", -100, 100, "mm", 0.1, true);
    addRow(positionPanel, "세로 이동", "offsetY", -100, 100, "mm", 0.1, true);

    var status = win.add("statictext", undefined, " ");
    status.alignment = ["fill", "top"];

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = options.preview;
    var spacer = footer.add("group");
    spacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    var cancelButton = footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (e) {}

    groupInput.onChange = function() {
        options.groups = groupInput.text;
        rebuildPending = true;
        updatePreview();
    };
    for (var q = 0; q < MAX_PERIOD; q++) {
        periodChecks[q].onClick = makePeriodHandler(q);
    }
    raisedCheck.onClick = function() {
        options.raised = raisedCheck.value;
        updatePreview();
    };
    borderCheck.onClick = function() {
        options.border = borderCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        options.preview = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (parseGroups(options.groups) === null || selectedPeriods().length === 0) {
            alert("족은 1부터 " + MAX_GROUP + " 사이 숫자를 쉼표로, 주기는 하나 이상 골라주세요.");
            return;
        }
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    function makePeriodHandler(index) {
        return function() {
            options.periods[index] = periodChecks[index].value;
            rebuildPending = true;
            updatePreview();
        };
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = ["left", "top"];
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장)
    function addRow(panel, label, key, min, max, unit, step, positionOnly) {
        var row = panel.add("group");
        var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
        caption.preferredSize.width = 85;
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 6;
        var slider = row.add("scrollbar", undefined, options[key], min, max);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = 196;
        function apply(value, dragging) {
            value = Math.round(value * 100) / 100;
            if (!isFinite(value) || value < min || value > max) {
                input.text = String(options[key]);
                return;
            }
            var previous = options[key];
            options[key] = value;
            slider.value = value;
            input.text = String(value);
            if (value === previous) {
                if (!dragging && previewPending) updatePreview();
                return;
            }
            if (positionOnly) {
                // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
                try {
                    var delta = (value - previous) * mmToPt;
                    if (previewGroup !== null) {
                        var dx = key === "offsetX" ? delta : 0;
                        var dy = key === "offsetY" ? delta : 0;
                        previewGroup.translate(dx, dy);
                        // 실제 그룹과 위치 캐시를 함께 이동한다. 캐시가 남으면 다음 옵션 변경 때
                        // 재사용 셀에 같은 이동량이 또 적용되고, 다시 그리는 셀과 어긋난다.
                        for (var i = 0; i < cells.length; i++) {
                            var cached = cellGeomKeys[cells[i].key];
                            if (cached) {
                                cached.left += dx;
                                cached.top += dy;
                            }
                        }
                    }
                    app.redraw();
                } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
            } else {
                updatePreview(dragging);
            }
        }
        slider.onChanging = function() { apply(Math.round(slider.value / step) * step, true); };
        slider.onChange = function() { apply(Math.round(slider.value / step) * step); };
        input.onChange = function() {
            if (!/\S/.test(input.text)) { input.text = String(options[key]); return; }
            apply(Number(String(input.text).replace(/,/g, ".")));
        };
        return caption;
    }

    // -------------------------------------------------------
    // 족·주기 해석
    // -------------------------------------------------------
    // "1, 2, 13~17" → [1, 2, 13, 14, 15, 16, 17]. 잘못된 항목이나 빈 입력이면 null
    function parseGroups(text) {
        var out = [];
        var parts = String(text).split(",");
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i].replace(/^\s+|\s+$/g, "");
            if (part === "") continue;
            var range = part.match(/^(\d+)\s*[~\-–]\s*(\d+)$/);
            var single = part.match(/^(\d+)$/);
            var from, to;
            if (range) {
                from = parseInt(range[1], 10);
                to = parseInt(range[2], 10);
            } else if (single) {
                from = to = parseInt(single[1], 10);
            } else {
                return null;
            }
            if (from > to) { var swap = from; from = to; to = swap; }
            if (from < 1 || to > 18) return null;
            for (var g = from; g <= to; g++) {
                if (!contains(out, g)) out.push(g);
            }
        }
        if (out.length === 0) return null;
        out.sort(function(a, b) { return a - b; });
        return out;
    }

    function contains(list, value) {
        for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
        return false;
    }

    // 실제 주기율표에 있는 칸만 그린다
    function cellExists(period, group) {
        if (period === 1) return group === 1 || group === 18;
        if (period <= 3) return group <= 2 || group >= 13;
        return true;
    }

    function selectedPeriods() {
        var list = [];
        for (var i = 0; i < MAX_PERIOD; i++) if (options.periods[i]) list.push(i + 1);
        return list;
    }

    // 셀 목록: 모서리 → 족 머리글 → 주기 머리글·본문 순. row/col 0이 머리글.
    // key는 셀 그룹 이름이 되어, 족·주기가 바뀌어도 남아 있는 셀은 그대로 다시 쓴다
    function buildCellList(groups, periods) {
        var list = [{ key: "corner", row: 0, col: 0, kind: "corner" }];
        var c, r;
        for (c = 0; c < groups.length; c++) {
            list.push({ key: "g" + groups[c], row: 0, col: c + 1, kind: "head", text: String(groups[c]) });
        }
        for (r = 0; r < periods.length; r++) {
            list.push({ key: "p" + periods[r], row: r + 1, col: 0, kind: "head", text: String(periods[r]) });
            for (c = 0; c < groups.length; c++) {
                if (cellExists(periods[r], groups[c])) {
                    list.push({ key: "p" + periods[r] + "g" + groups[c], row: r + 1, col: c + 1, kind: "body" });
                }
            }
        }
        return list;
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
            } else if (previewGroup === null || rebuildPending) {
                if (!buildPreview()) return false;
            } else {
                layoutCells();
            }
            previewPending = false;
            app.redraw();
            lastPreviewTime = new Date().getTime();
            return true;
        } catch (e) {
            clearPreview();
            // 연속 DOM 수정 중 일시 오류라면 화면 상태를 정리하고 한 번 복구한다.
            if (options.preview) {
                settlePreview();
                if (buildPreview()) {
                    previewPending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    return true;
                }
                return false;
            }
            status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
            return false;
        }
    }

    function buildPreview() {
        var groups = parseGroups(options.groups);
        var periods = selectedPeriods();
        if (groups === null) {
            clearPreview();
            status.text = "족은 1~" + MAX_GROUP + " 숫자를 쉼표로, 범위는 ~로 (예: 1, 2, 13~18)";
            return false;
        }
        if (periods.length === 0) {
            clearPreview();
            status.text = "주기를 하나 이상 골라주세요.";
            return false;
        }
        var lastError = null;
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                syncCells(buildCellList(groups, periods));
                rebuildPending = false;
                layoutCells();
                return true;
            } catch (e) {
                // 텍스트 프레임을 자주 만들면 Illustrator 참조가 흐트러진다(PARM 등). 지우고 처음부터 한 번 더
                lastError = e;
                clearPreview();
                settlePreview();
            }
        }
        status.text = "주기율표를 만들지 못했습니다: " + lastError + " (" + lastError.line + "행)";
        return false;
    }

    function settlePreview() {
        try { $.sleep(30); app.redraw(); } catch (e) {}
    }

    // 원하는 셀 목록에 맞춰 남을 셀은 두고, 없어진 셀만 지우고, 새 셀만 만든다.
    // 글자가 든 프레임을 다시 만들지 않아야 Illustrator가 안정적이다.
    function syncCells(wanted) {
        if (previewGroup === null) {
            previewGroup = doc.activeLayer.groupItems.add();
            previewGroup.name = PREVIEW_NAME;
        }
        var wantedKeys = {};
        var i;
        for (i = 0; i < wanted.length; i++) wantedKeys[wanted[i].key] = true;
        var existing = {};
        var groups = previewGroup.groupItems;
        for (i = groups.length - 1; i >= 0; i--) {
            var name = groups[i].name;
            if (wantedKeys[name] && !existing[name]) {
                existing[name] = true;
            } else {
                groups[i].remove();
                delete cellGeomKeys[name];
            }
        }
        for (i = 0; i < wanted.length; i++) {
            if (!existing[wanted[i].key]) {
                makeCell(previewGroup, wanted[i]);
                delete cellGeomKeys[wanted[i].key];
            }
        }
        // 컬렉션은 z순서라 만든 순서와 다르다. 이름→위치를 한 번만 읽어 둔다
        cellIndex = {};
        for (i = 0; i < groups.length; i++) cellIndex[groups[i].name] = i;
        cells = wanted;
    }

    function clearPreview() {
        cells = [];
        cellIndex = {};
        cellGeomKeys = {};
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {
                // 참조가 흐트러져 못 지우면 화면을 갱신한 뒤 한 번 더
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
    // 그리기
    // -------------------------------------------------------
    // 셀 하나 = 그룹. 모양 그룹(경사면 4분면 → 윗면 → 테두리) → 대각선 → 글자 순으로 만들어 나중 것이 위에 온다.
    // 모양은 하위 그룹에 따로 두어, 같은 모양의 셀끼리 그룹째 복제해 쓴다 (layoutCells).
    // 부품은 이름으로 찾고 좌표는 layoutCells가 쓴다. 경사면·테두리는 syncCellParts가 옵션에 맞춰 넣고 뺀다.
    function makeCell(container, cell) {
        var g = container.groupItems.add();
        g.name = cell.key;
        var shape = g.groupItems.add();
        shape.name = "shape";
        namedPath(shape, "face");
        if (cell.kind === "corner") {
            namedPath(g, "diagonal");
            makeLabel(g, "족", "groupLabel", options.fontSize * CORNER_LABEL_SCALE);
            makeLabel(g, "주기", "periodLabel", options.fontSize * CORNER_LABEL_SCALE);
        } else if (cell.kind === "head") {
            makeLabel(g, cell.text, "label", options.fontSize);
        }
        return g;
    }

    function namedPath(container, name) {
        var path = container.pathItems.add();
        path.name = name;
        return path;
    }

    function makeLabel(container, text, name, size) {
        var frame = container.textFrames.add();
        frame.name = name;
        frame.contents = text;
        frame.textRange.characterAttributes.size = size;
        frame.textRange.characterAttributes.fillColor = lineColor;
        applyFontRule(frame);
        return frame;
    }

    function findNamed(collection, name) {
        for (var i = 0; i < collection.length; i++) {
            if (collection[i].name === name) return collection[i];
        }
        return null;
    }

    // 셀 좌표(pt). col/row 0은 머리글 크기를 쓴다
    function cellRect(cell) {
        var gap = options.gap * mmToPt;
        var w = (cell.col === 0 ? options.headColW : options.cellW) * mmToPt;
        var h = (cell.row === 0 ? options.headRowH : options.cellH) * mmToPt;
        var left = originX + options.offsetX * mmToPt;
        var top = originY + options.offsetY * mmToPt;
        if (cell.col > 0) left += options.headColW * mmToPt + gap + (cell.col - 1) * (options.cellW * mmToPt + gap);
        if (cell.row > 0) top -= options.headRowH * mmToPt + gap + (cell.row - 1) * (options.cellH * mmToPt + gap);
        return { left: left, top: top, width: w, height: h };
    }

    // 경사 폭만큼 안으로 들인 사각형. 셀이 작으면 최소 0.1pt 폭은 남긴다
    function insetRect(rect, bevel) {
        var inset = Math.min(bevel, rect.width / 2 - 0.1, rect.height / 2 - 0.1);
        return { left: rect.left + inset, top: rect.top - inset,
            width: rect.width - inset * 2, height: rect.height - inset * 2 };
    }

    function tableSize(groups, periods) {
        var gap = options.gap;
        return {
            width: (options.headColW + groups.length * (options.cellW + gap)) * mmToPt,
            height: (options.headRowH + periods.length * (options.cellH + gap)) * mmToPt
        };
    }

    function layoutCells() {
        if (originX === null) {
            var size = tableSize(parseGroups(options.groups), selectedPeriods());
            originX = viewCenter[0] - size.width / 2;
            originY = viewCenter[1] + size.height / 2;
        }
        var radius = options.radius * mmToPt;
        var bevel = options.depth * mmToPt;
        var fills = { head: makeGray(doc, options.headK), body: makeGray(doc, options.bodyK) };
        if (options.raised) {
            tintBevelGradients("head", options.headK);
            tintBevelGradients("body", options.bodyK);
        }
        // 같은 모양(종류·크기·옵션)의 셀은 처음 하나만 경로를 그리고 나머지는 모양 그룹을 복제한다.
        // 경로 쓰기가 셀당 DOM 호출 수십 번인데 복제는 세 번이라, 표 전체 갱신이 몇 배 빨라진다
        var prototypes = {};
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var g = previewGroup.groupItems[cellIndex[cell.key]];
            var outer = cellRect(cell);
            var kind = cell.kind === "body" ? "body" : "head";
            // 윗면: 튀어나옴이면 경사 폭만큼 들인다. 글자 자리도 이 안쪽 기준
            var rect = options.raised ? insetRect(outer, bevel) : outer;
            // 모양이 그대로인 셀은 경로를 다시 쓰지 않는다.
            // 크기·모양은 같고 자리만 바뀐 셀은 그룹째 옮긴다 (간격·1행 높이·1열 너비 조절이 이 경우)
            var shapeKey = [kind, outer.width, outer.height, radius, bevel, options.raised,
                options.border, options.strokeW, options.raised ? "" : options.headK + "/" + options.bodyK].join("|");
            var last = cellGeomKeys[cell.key];
            var changed = !last || last.shape !== shapeKey;
            if (!changed && (last.left !== outer.left || last.top !== outer.top)) {
                g.translate(outer.left - last.left, outer.top - last.top);   // 글자도 함께 옮겨진다
            }
            if (changed) {
                var proto = prototypes[shapeKey];
                if (proto) {
                    g.groupItems[0].remove();
                    proto.shape.duplicate(g, ElementPlacement.PLACEATEND)   // 글자·대각선 아래
                        .translate(outer.left - proto.left, outer.top - proto.top);
                } else {
                    drawShape(g.groupItems[0], outer, rect, radius, bevel, kind, fills);
                }
                if (cell.kind === "corner") {
                    var diagonal = findNamed(g.pathItems, "diagonal");
                    writePath(diagonal, diagonalPoints(rect,
                        options.raised ? radius * INNER_RADIUS_RATIO : radius), false);
                    diagonal.filled = false;
                    diagonal.stroked = true;
                    diagonal.strokeWidth = 0.3;
                    diagonal.strokeColor = lineColor;
                    diagonal.strokeCap = StrokeCap.BUTTENDCAP;
                }
            }
            if (!prototypes[shapeKey]) {
                prototypes[shapeKey] = { shape: g.groupItems[0], left: outer.left, top: outer.top };
            }
            // 글자는 모양이나 크기가 바뀐 셀만 다시 맞춘다 (자리만 바뀐 셀은 위에서 함께 옮겨졌다)
            if (changed || last.font !== options.fontSize) {
                if (cell.kind === "corner") {
                    centerText(findNamed(g.textFrames, "groupLabel"), options.fontSize * CORNER_LABEL_SCALE,
                        rect.left + rect.width * 0.7, rect.top - rect.height * 0.27);
                    centerText(findNamed(g.textFrames, "periodLabel"), options.fontSize * CORNER_LABEL_SCALE,
                        rect.left + rect.width * 0.3, rect.top - rect.height * 0.73);
                } else if (cell.kind === "head") {
                    centerText(findNamed(g.textFrames, "label"), options.fontSize,
                        rect.left + rect.width / 2, rect.top - rect.height / 2);
                }
            }
            cellGeomKeys[cell.key] = { shape: shapeKey, left: outer.left, top: outer.top, font: options.fontSize };
        }
    }

    // 모양 그룹에 경사면·윗면·테두리 경로를 쓴다. 둥근 사각형은 점을 하나씩 쓰지 않고 roundedRectangle로 한 번에 만든다
    function drawShape(shape, outer, rect, radius, bevel, kind, fills) {
        var parts = mapParts(shape);
        if (syncCellParts(shape, parts)) parts = mapParts(shape);
        var face;
        if (options.raised) {
            // 경사면: 분면마다 두 경사면을 잇는 대각 그라데이션. 축은 분면의 대각선 방향
            var angle = Math.atan2(outer.height, outer.width) * 180 / Math.PI;
            for (var q = 0; q < QUADRANTS.length; q++) {
                var quadrant = replacePath(shape, findNamed(shape.pathItems, QUADRANTS[q].name), null);
                writePath(quadrant, quadrantPoints(outer, radius, QUADRANTS[q].name));
                quadrant.stroked = false;
                applyGradientFill(quadrant, kind + QUADRANTS[q].name, QUADRANTS[q].sign * angle);
            }
            if (parts.border) {
                var border = replacePath(shape, findNamed(shape.pathItems, "border"), outer, radius);
                border.filled = false;
                border.stroked = true;
                border.strokeWidth = options.strokeW;
                border.strokeColor = lineColor;
            }
            // 윗면 라운딩은 바깥과 비율로 연동. 왼쪽 위가 어둡고 오른쪽 아래가 밝다
            face = replacePath(shape, findNamed(shape.pathItems, "face"), rect, radius * INNER_RADIUS_RATIO);
            face.stroked = false;
            applyGradientFill(face, kind + "face", -Math.atan2(rect.height, rect.width) * 180 / Math.PI);
        } else {
            face = replacePath(shape, parts.face, rect, radius);
            face.filled = true;
            face.fillColor = fills[kind];
            face.stroked = options.border;
            if (face.stroked) {
                face.strokeWidth = options.strokeW;
                face.strokeColor = lineColor;
            }
        }
    }

    // 그룹의 경로를 이름 → 경로로 한 번에 읽는다 (이름마다 훑으면 DOM 호출이 몇 배)
    function mapParts(group) {
        var map = {};
        var items = group.pathItems;
        for (var i = 0; i < items.length; i++) map[items[i].name] = items[i];
        return map;
    }

    // 글자 크기를 맞춘 뒤 프레임 범위의 가운데를 목표점으로 옮긴다
    function centerText(frame, size, x, y) {
        if (frame === null) return;
        if (frame.textRange.characterAttributes.size !== size) frame.textRange.characterAttributes.size = size;
        var b = frame.geometricBounds;
        var dx = x - (b[0] + b[2]) / 2;
        var dy = y - (b[1] + b[3]) / 2;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) frame.translate(dx, dy);
    }

    // 튀어나옴·테두리 옵션에 맞춰 경사면 4분면과 테두리 경로를 넣거나 뺀다 (글자는 건드리지 않는다).
    // 넣거나 뺀 것이 있으면 true (부품 참조를 다시 읽어야 한다)
    function syncCellParts(g, parts) {
        var wantBorder = options.raised && options.border;
        var touched = false;
        for (var q = 0; q < QUADRANTS.length; q++) {
            var quadrant = parts[QUADRANTS[q].name];
            if (options.raised && !quadrant) {
                namedPath(g, QUADRANTS[q].name).move(findNamed(g.pathItems, "face"), ElementPlacement.PLACEAFTER);   // 윗면 아래
                touched = true;
            } else if (!options.raised && quadrant) {
                quadrant.remove();
                touched = true;
            }
        }
        var border = parts.border;
        if (wantBorder && !border) {
            namedPath(g, "border").move(findNamed(g.pathItems, "face"), ElementPlacement.PLACEBEFORE);   // 윗면 위, 글자 아래
            touched = true;
        } else if (!wantBorder && border) {
            border.remove();
            touched = true;
        }
        return touched;
    }

    // 둥근 사각형의 한 분면. 바깥 모서리 하나만 둥글고 나머지는 직각이다.
    // 이웃 분면과 맞닿는 가운데 선은 조금 넘겨 겹친다 (딱 맞대면 화면·출력에 실금이 생긴다).
    // 겹친 자리는 위에 오는 분면이 같은 경사면 색이라 티가 나지 않는다.
    function quadrantPoints(rect, radius, name) {
        var overlap = 0.3;
        var left = rect.left;
        var top = rect.top;
        var right = rect.left + rect.width;
        var bottom = rect.top - rect.height;
        var cx = rect.left + rect.width / 2 + (name === "tl" || name === "bl" ? overlap : -overlap);
        var cy = rect.top - rect.height / 2 + (name === "tl" || name === "tr" ? -overlap : overlap);
        var r = Math.min(radius, rect.width / 2, rect.height / 2);
        var k = r * 0.5523;
        if (name === "tl") {
            return r <= 0 ? [corner(cx, top), corner(left, top), corner(left, cy), corner(cx, cy)] : [
                corner(cx, top),
                { anchor: [left + r, top], left: [left + r, top], right: [left + r - k, top] },
                { anchor: [left, top - r], left: [left, top - r + k], right: [left, top - r] },
                corner(left, cy), corner(cx, cy)];
        }
        if (name === "tr") {
            return r <= 0 ? [corner(cx, top), corner(right, top), corner(right, cy), corner(cx, cy)] : [
                corner(cx, top),
                { anchor: [right - r, top], left: [right - r, top], right: [right - r + k, top] },
                { anchor: [right, top - r], left: [right, top - r + k], right: [right, top - r] },
                corner(right, cy), corner(cx, cy)];
        }
        if (name === "br") {
            return r <= 0 ? [corner(cx, cy), corner(right, cy), corner(right, bottom), corner(cx, bottom)] : [
                corner(cx, cy), corner(right, cy),
                { anchor: [right, bottom + r], left: [right, bottom + r], right: [right, bottom + r - k] },
                { anchor: [right - r, bottom], left: [right - r + k, bottom], right: [right - r, bottom] },
                corner(cx, bottom)];
        }
        return r <= 0 ? [corner(cx, cy), corner(cx, bottom), corner(left, bottom), corner(left, cy)] : [
            corner(cx, cy), corner(cx, bottom),
            { anchor: [left + r, bottom], left: [left + r, bottom], right: [left + r - k, bottom] },
            { anchor: [left, bottom + r], left: [left, bottom + r - k], right: [left, bottom + r] },
            corner(left, cy)];
    }

    // 그라데이션은 문서에 종류(head/body)×부위(분면 4·윗면)로 하나씩만 만들어 셀들이 같이 쓴다.
    // 분면은 0~40% 한 색, 60~100% 다른 색이라 두 경사면이 부드러운 이음새로 만난다.
    // 객체 참조로만 재사용한다. 새 그라데이션의 name 대입에서 PARM이 발생하므로 기본 이름을 둔다.
    function getGradient(key) {
        if (bevelGradients[key]) return bevelGradients[key];
        var ramps = /face$/.test(key) ? [0, 100] : [0, 40, 60, 100];
        var gradient = doc.gradients.add();
        gradient.type = GradientType.LINEAR;
        while (gradient.gradientStops.length < ramps.length) gradient.gradientStops.add();
        for (var i = 0; i < ramps.length; i++) gradient.gradientStops[i].rampPoint = ramps[i];
        bevelGradients[key] = gradient;
        return gradient;
    }

    function tintBevelGradients(kind, k) {
        // 색을 다시 쓰면 같은 값이라도 그라데이션을 쓰는 셀이 전부 다시 그려져 redraw가 느려진다
        if (tintedK[kind] === k) return;
        tintedK[kind] = k;
        var i;
        for (i = 0; i < QUADRANTS.length; i++) {
            var gradient = getGradient(kind + QUADRANTS[i].name);
            var from = makeGray(doc, clampK(k + BEVEL_K[QUADRANTS[i].from]));
            var to = makeGray(doc, clampK(k + BEVEL_K[QUADRANTS[i].to]));
            gradient.gradientStops[0].color = from;
            gradient.gradientStops[1].color = from;
            gradient.gradientStops[2].color = to;
            gradient.gradientStops[3].color = to;
        }
        var face = getGradient(kind + "face");
        face.gradientStops[0].color = makeGray(doc, clampK(k + BEVEL_K.faceDark));
        face.gradientStops[1].color = makeGray(doc, clampK(k + BEVEL_K.faceLight));
    }

    function clampK(k) {
        return Math.max(0, Math.min(100, k));
    }

    // 기존 PathItem은 fillColor/matrix를 다시 지정해도 채우기 회전 상태가 남을 수 있다.
    // 모양 변경 때 경로를 새로 만들어 바꿔 끼운다. 같은 z순서·이름을 유지하고 글자 프레임은 재사용한다.
    // rect를 주면 그 자리에 둥근 사각형(radius)으로 만들고, 없으면 빈 경로를 만든다
    function replacePath(group, previous, rect, radius) {
        var name = previous.name;
        var fresh = rect ? roundedRectPath(group, rect, radius) : group.pathItems.add();
        fresh.name = name;
        fresh.move(previous, ElementPlacement.PLACEBEFORE);
        previous.remove();
        return findNamed(group.pathItems, name);
    }

    // 둥근 사각형을 DOM 호출 한 번으로 만든다 (점 8개를 따로 쓰면 30번이 넘는다). radius 0이면 직사각형
    function roundedRectPath(group, rect, radius) {
        var r = Math.min(radius, rect.width / 2, rect.height / 2);
        if (r <= 0) return group.pathItems.rectangle(rect.top, rect.left, rect.width, rect.height);
        return group.pathItems.roundedRectangle(rect.top, rect.left, rect.width, rect.height, r, r);
    }

    // 스크립트에서는 GradientColor의 각도·matrix가 무시되고(프로젝트 공통) 새 채우기에는 일러스트레이터가
    // 마지막으로 쓴 그라데이션 각도가 붙는다(확인됨: 그라데이션 패널·이전 rotate에 따라 실행마다 달라진다).
    // 그래서 붙은 각도를 읽어 그만큼 뺀 뒤 rotate로 축을 angle 방향(시계 반대, 0 = 왼→오른)으로 만든다.
    // 도형을 돌렸다 되돌리는 방식은 맞닿은 분면 사이에 실금이 생겨(확인됨) 쓰지 않는다.
    function applyGradientFill(path, key, angle) {
        var bounds = path.geometricBounds;
        var gradientColor = new GradientColor();
        gradientColor.gradient = getGradient(key);
        gradientColor.origin = [bounds[0], (bounds[1] + bounds[3]) / 2];
        gradientColor.length = bounds[2] - bounds[0];
        path.filled = true;
        path.fillColor = gradientColor;
        path.rotate(angle - path.fillColor.angle, false, false, true, false, Transformation.CENTER);
    }

    // 고정점은 setEntirePath로 한 번에 쓰고(직선·모서리로 초기화됨), 손잡이가 있는 점만 따로 고친다.
    // 점마다 속성을 하나씩 쓰면 DOM 호출이 4~5배라 미리보기가 눈에 띄게 느려진다.
    function writePath(path, points, closed) {
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                writePathGeometry(path, points, closed);
                return;
            } catch (e) {
                if (attempt === 1) throw e;
                settlePreview();
            }
        }
    }

    function writePathGeometry(path, points, closed) {
        var anchors = [];
        var q;
        for (q = 0; q < points.length; q++) anchors.push(points[q].anchor);
        path.setEntirePath(anchors);
        for (q = 0; q < points.length; q++) {
            var p = points[q];
            var hasLeft = p.left[0] !== p.anchor[0] || p.left[1] !== p.anchor[1];
            var hasRight = p.right[0] !== p.anchor[0] || p.right[1] !== p.anchor[1];
            if (!hasLeft && !hasRight) continue;
            var point = path.pathPoints[q];
            if (hasLeft) point.leftDirection = p.left;
            if (hasRight) point.rightDirection = p.right;
        }
        path.closed = closed !== false;
    }

    // 대각선과 실제 윗면의 왼쪽 위 베지어 곡선이 만나는 점을 찾는다.
    // roundedRectangle과 같은 반지름 제한·손잡이(0.55r, 여기선 0.5523r)를 써서 큰 라운딩에서도 패스에 닿는다.
    function diagonalPoints(rect, radius) {
        var r = Math.max(0, Math.min(radius, rect.width / 2, rect.height / 2));
        var x = 0;
        var y = 0;
        if (r > 0) {
            var k = r * 0.5523;
            var low = 0;
            var high = 1;
            for (var i = 0; i < 40; i++) {
                var t = (low + high) / 2;
                var u = 1 - t;
                x = 3 * u * t * t * (r - k) + t * t * t * r;
                y = u * u * u * r + 3 * u * u * t * (r - k);
                if (y * rect.width > x * rect.height) low = t;
                else high = t;
            }
        }
        return [corner(rect.left + x, rect.top - y),
            corner(rect.left + rect.width - x, rect.top - rect.height + y)];
    }

    function corner(x, y) {
        return { anchor: [x, y], left: [x, y], right: [x, y] };
    }

    function applyFontRule(frame) {
        var chars = frame.characters;
        for (var i = 0; i < chars.length; i++) {
            var code = chars[i].contents.charCodeAt(0);
            var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
            var space = (code === 32 || code === 160 || code === 13 || code === 10);
            var attrs = chars[i].characterAttributes;
            try {
                attrs.textFont = (korean || space) ? korFont : engFont;
                attrs.baselineShift = (korean || space) ? 0 : 0.5;
            } catch (e) {}
        }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    function makeGray(documentRef, k) {
        if (documentRef.documentColorSpace === DocumentColorSpace.CMYK) {
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

    function makeBlackColor(documentRef) {
        return makeGray(documentRef, 100);
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function readSettings() {
        var result = { groups: "1, 2, 13~18", periods: [true, true, true, true, false],
            cellW: 15, cellH: 12, gap: 1, radius: 0.7, headRowH: 12, headColW: 15,
            raised: true, border: false, depth: 1.2, strokeW: 0.3, headK: 20, bodyK: 10,
            fontSize: 10, offsetX: 0, offsetY: 0, preview: true };
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v1" || p.length !== 19) return result;
            var keys = ["cellW", "cellH", "gap", "radius", "headRowH", "headColW", "depth", "strokeW",
                "headK", "bodyK", "fontSize", "offsetX", "offsetY"];
            var mins = [5, 5, 0, 0, 5, 5, 0.1, 0.1, 0, 0, 4, -100, -100];
            var maxs = [20, 20, 3, 5, 30, 30, 3, 3, 100, 100, 30, 100, 100];
            for (var i = 0; i < keys.length; i++) {
                var raw = p[i + 3];
                var value = Number(raw);
                if (!/\S/.test(raw) || !isFinite(value) || value < mins[i] || value > maxs[i]) return result;
            }
            if (parseGroups(p[1]) === null || !/^[01]{5}$/.test(p[2])) return result;
            if (!/^[01]$/.test(p[16]) || !/^[01]$/.test(p[17]) || !/^[01]$/.test(p[18])) return result;
            result.groups = p[1];
            for (var j = 0; j < MAX_PERIOD; j++) result.periods[j] = p[2].charAt(j) === "1";
            for (var k = 0; k < keys.length; k++) result[keys[k]] = Number(p[k + 3]);
            result.raised = p[16] === "1";
            result.border = p[17] === "1";
            result.preview = p[18] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            var flags = "";
            for (var i = 0; i < MAX_PERIOD; i++) flags += options.periods[i] ? "1" : "0";
            app.preferences.setStringPreference(PREF_KEY, ["v1", options.groups, flags,
                options.cellW, options.cellH, options.gap, options.radius, options.headRowH, options.headColW,
                options.depth, options.strokeW, options.headK, options.bodyK, options.fontSize,
                options.offsetX, options.offsetY,
                options.raised ? 1 : 0, options.border ? 1 : 0, options.preview ? 1 : 0].join("|"));
        } catch (e) {}
    }

    // -------------------------------------------------------
    // 실행
    // -------------------------------------------------------
    updatePreview();
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    if (result !== 1) {
        clearPreview();
        app.redraw();
        return;
    }
    if (previewGroup === null || rebuildPending || previewPending) {
        options.preview = true;
        if (!buildPreview()) {
            clearPreview();
            alert("주기율표를 만들지 못했습니다. " + status.text);
            return;
        }
    }
    previewGroup.name = "PeriodicTable";
    saveSettings();
    flattenShapes();
    doc.selection = null;
    previewGroup.selected = true;
    app.redraw();

    // 미리보기 복제용 모양 하위 그룹은 결과물에 필요 없다. 경로를 셀 그룹으로 꺼내고 빈 그룹을 지운다.
    // 맨 아래 경로부터 모양 그룹 바로 아래로 옮기면 z순서가 그대로다.
    // (executeMenuCommand("ungroup")은 셀 그룹 쪽이 풀리는 경우가 있어 쓰지 않는다)
    function flattenShapes() {
        try {
            var cellGroups = previewGroup.groupItems;
            for (var i = 0; i < cellGroups.length; i++) {
                var shape = cellGroups[i].groupItems[0];
                while (shape.pathItems.length > 0) {
                    shape.pathItems[shape.pathItems.length - 1].move(shape, ElementPlacement.PLACEAFTER);
                }
                shape.remove();
            }
        } catch (e) {}
    }
})();
