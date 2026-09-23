// Object_ClassificationTree.jsx
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

// 분류 계통도(이분법 검색표): 들여쓰기한 글을 나무 그림으로 그린다.
//   - 한 줄이 한 마디. 들여쓰기(공백 2칸 또는 탭 하나가 한 단계)가 한 단계 깊으면 윗줄의 자식이다.
//   - '예: 날개가 있는가?'처럼 콜론 앞은 가지 이름(연결선 옆 글자), 뒤는 마디 글자. 콜론이 없으면 가지 이름 없음.
//   - 자식이 있는 마디는 질문(상자), 없는 마디는 끝(생물·무리 이름). 끝도 상자로 둘 수 있다.
//   - 배치: 끝 마디를 차례로 놓고 부모는 자식들 가운데. 위→아래 또는 왼쪽→오른쪽.
//     연결선은 꺾은선(부모에서 반만 내려와 가로로 간 뒤 자식으로) 또는 직선.
// 글은 설정과 함께 저장되어 다음에 그대로 뜬다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectClassificationTree/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var BOX_PAD_MM = 1.5;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var DEFAULT_TEXT = [
        "척추가 있는가?",
        "  예: 날개가 있는가?",
        "    예: 참새",
        "    아니요: 고양이",
        "  아니요: 다리가 6개인가?",
        "    예: 메뚜기",
        "    아니요: 거미"
    ].join("\n");
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var GAP_RANGE = [1, 60];
    var FONT_RANGE = [5, 20];
    var K_RANGE = [0, 60];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var treeText = DEFAULT_TEXT;
    var horizontal = false;
    var elbow = true;
    var leafBoxes = false;
    var siblingGapMm = 6;
    var levelGapMm = 10;
    var fontPt = 8;
    var boxK = 0;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "분류 계통도");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var textPanel = addPanel(dlg, "내용 (들여쓰기 = 한 단계, '가지 이름: 마디 글자')");
    var textInput = textPanel.add("edittext", undefined, treeText, {multiline: true, scrolling: true, wantReturn: true});
    textInput.preferredSize = [420, 170];
    var statusText = textPanel.add("statictext", undefined, "");
    statusText.preferredSize.width = 420;

    var layoutPanel = addPanel(dlg, "배치");
    var directionRow = layoutPanel.add("group");
    directionRow.add("statictext", undefined, "방향:").preferredSize.width = LABEL_WIDTH;
    var downRadio = directionRow.add("radiobutton", undefined, "위 → 아래");
    var rightRadio = directionRow.add("radiobutton", undefined, "왼쪽 → 오른쪽");
    var lineRow = layoutPanel.add("group");
    lineRow.add("statictext", undefined, "연결선:").preferredSize.width = LABEL_WIDTH;
    var elbowRadio = lineRow.add("radiobutton", undefined, "꺾은선");
    var straightRadio = lineRow.add("radiobutton", undefined, "직선");
    var siblingRow = addValueRow(layoutPanel, "옆 간격", "mm", siblingGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.5, 1);
    var levelRow = addValueRow(layoutPanel, "단계 간격", "mm", levelGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.5, 1);

    var stylePanel = addPanel(dlg, "모양");
    var leafCheck = stylePanel.add("checkbox", undefined, "끝 마디(생물)도 상자로");
    var kRow = addValueRow(stylePanel, "상자 색", "K", boxK, K_RANGE[0], K_RANGE[1], 5, 0);
    var fontRow = addValueRow(stylePanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다 (내용 칸의 엔터는 줄바꿈)
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    downRadio.value = !horizontal;
    rightRadio.value = horizontal;
    elbowRadio.value = elbow;
    straightRadio.value = !elbow;
    leafCheck.value = leafBoxes;

    // 글은 칸을 떠날 때 다시 그린다 (한 글자마다 그리면 느리다)
    textInput.onChange = function() {
        treeText = textInput.text;
        updatePreview();
    };
    downRadio.onClick = function() { horizontal = false; updatePreview(); };
    rightRadio.onClick = function() { horizontal = true; updatePreview(); };
    elbowRadio.onClick = function() { elbow = true; updatePreview(); };
    straightRadio.onClick = function() { elbow = false; updatePreview(); };
    leafCheck.onClick = function() { leafBoxes = leafCheck.value; updatePreview(); };
    bindValueRow(siblingRow, function() { return siblingGapMm; }, function(v) { siblingGapMm = v; });
    bindValueRow(levelRow, function() { return levelGapMm; }, function(v) { levelGapMm = v; });
    bindValueRow(kRow, function() { return boxK; }, function(v) { boxK = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        treeText = textInput.text;
        var parsed = parseTree(treeText);
        if (parsed.error) {
            alert(parsed.error);
            return;
        }
        clearPreview();
        buildPreview();
        saveSettings();
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var confirmed = dlg.show() === 1;
    if (!confirmed) clearPreview();
    if (confirmed && previewGroup !== null) {
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        var parsed = parseTree(treeText);
        statusText.text = parsed.error ? parsed.error : "마디 " + parsed.count + "개";
        if (parsed.error) return;
        previewGroup = layer.groupItems.add();
        previewGroup.name = "분류 계통도";

        // 글자를 먼저 만들어 크기를 잰다
        var nodes = flatten(parsed.root);
        var pad = BOX_PAD_MM * MM;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            node.frame = makeText(node.text);
            var b = node.frame.geometricBounds;
            node.boxed = node.children.length > 0 || leafBoxes;
            node.w = (b[2] - b[0]) + (node.boxed ? 2 * pad : 0);
            node.h = (b[1] - b[3]) + (node.boxed ? 2 * pad : 0);
        }
        layoutTree(parsed.root, siblingGapMm * MM, levelGapMm * MM, horizontal);
        var shift = centerOffset(nodes, viewCenter);

        var lines = previewGroup.groupItems.add();
        lines.name = "연결선";
        for (var n = 0; n < nodes.length; n++) {
            var nd = nodes[n];
            nd.x += shift[0];
            nd.y += shift[1];
        }
        for (var e = 0; e < nodes.length; e++) {
            var parent = nodes[e];
            for (var c = 0; c < parent.children.length; c++) {
                var child = parent.children[c];
                var edge = edgePoints(parent, child, horizontal, elbow);
                strokeLine(lines, edge);
                if (child.label !== "") placeEdgeLabel(child.label, edge, horizontal);
            }
        }
        for (var k = 0; k < nodes.length; k++) {
            var item = nodes[k];
            if (item.boxed) {
                var box = previewGroup.pathItems.roundedRectangle(item.y + item.h / 2, item.x - item.w / 2, item.w, item.h, 1 * MM, 1 * MM);
                box.stroked = true;
                box.strokeColor = makeGray(100);
                box.strokeWidth = LINE_WIDTH_PT;
                box.filled = true;
                box.fillColor = makeGray(boxK);
            }
            var fb = item.frame.geometricBounds;
            item.frame.translate(item.x - (fb[0] + fb[2]) / 2, item.y - (fb[1] + fb[3]) / 2);
            item.frame.move(previewGroup, ElementPlacement.PLACEATBEGINNING);
        }
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    // 가지 이름: 위→아래면 자식 쪽 세로선 가운데의 오른쪽.
    // 왼→오른쪽이면 자식 상자 바로 앞, 부모 반대쪽(자식이 아래면 선 아래, 위면 선 위)에 둬서 세로선과 겹치지 않게 한다
    function placeEdgeLabel(text, edge, sideways) {
        var frame = makeText(text);
        var b = frame.geometricBounds;
        var w = b[2] - b[0];
        var h = b[1] - b[3];
        var first = edge[0];
        var a = edge[edge.length - 2];
        var z = edge[edge.length - 1];
        var x, y;
        if (sideways) {
            var below = z[1] < first[1];
            x = z[0] - w / 2 - 0.8 * MM;
            y = below ? z[1] - h / 2 - 0.6 * MM : z[1] + h / 2 + 0.6 * MM;
        } else {
            x = (a[0] + z[0]) / 2 + w / 2 + 0.8 * MM;
            y = (a[1] + z[1]) / 2;
        }
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

    // -------------------------------------------------------
    // 글 해석 · 배치 (순수 계산)
    // -------------------------------------------------------
    // 들여쓰기 글 → {root, count} 또는 {error}. 마디: {text, label, children, depth}
    function parseTree(text) {
        var lines = String(text).replace(/\r\n?/g, "\n").split("\n");
        var stack = [];
        var root = null;
        var count = 0;
        for (var i = 0; i < lines.length; i++) {
            var raw = lines[i].replace(/\t/g, "  ");
            if (/^\s*$/.test(raw)) continue;
            var indent = raw.match(/^ */)[0].length;
            var level = Math.floor(indent / 2);
            var body = raw.replace(/^\s+|\s+$/g, "");
            var label = "";
            var colon = body.search(/[:：]/);
            if (colon >= 0) {
                label = body.substring(0, colon).replace(/\s+$/, "");
                body = body.substring(colon + 1).replace(/^\s+/, "");
            }
            var node = {text: body, label: label, children: [], depth: level};
            count++;
            if (root === null) {
                if (level !== 0) return {error: (i + 1) + "번째 줄: 첫 마디는 들여쓰지 않습니다."};
                root = node;
                stack = [node];
                continue;
            }
            if (level === 0) return {error: (i + 1) + "번째 줄: 맨 위 마디는 하나여야 합니다."};
            if (level > stack.length) return {error: (i + 1) + "번째 줄: 들여쓰기가 한 번에 두 단계 이상 깊어졌습니다."};
            stack = stack.slice(0, level);
            stack[level - 1].children.push(node);
            stack.push(node);
        }
        if (root === null) return {error: "내용을 입력해주세요."};
        return {root: root, count: count};
    }

    // 앞에서부터 차례로 (부모가 자식보다 먼저)
    function flatten(root) {
        var list = [];
        (function walk(node) {
            list.push(node);
            for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
        })(root);
        return list;
    }

    // 마디 가운데 (x, y)를 정한다 (위→아래 기준으로 계산하고 옆으로면 축을 바꾼다).
    // 끝 마디는 옆 방향으로 크기 + 간격만큼 차례로, 부모는 첫·끝 자식 가운데. 단계마다 그 단계에서 가장 큰 마디만큼 내려간다
    function layoutTree(root, siblingGap, levelGap, sideways) {
        var nodes = flatten(root);
        var across = function(node) { return sideways ? node.h : node.w; };
        var along = function(node) { return sideways ? node.w : node.h; };
        var levelSize = [];
        for (var i = 0; i < nodes.length; i++) {
            var d = nodes[i].depth;
            levelSize[d] = Math.max(levelSize[d] || 0, along(nodes[i]));
        }
        var levelPos = [0];
        for (var l = 1; l < levelSize.length; l++) {
            levelPos[l] = levelPos[l - 1] + levelSize[l - 1] / 2 + levelGap + levelSize[l] / 2;
        }
        var cursor = 0;
        (function place(node) {
            if (node.children.length === 0) {
                node.a = cursor + across(node) / 2;
                cursor += across(node) + siblingGap;
            } else {
                for (var c = 0; c < node.children.length; c++) place(node.children[c]);
                node.a = (node.children[0].a + node.children[node.children.length - 1].a) / 2;
            }
            node.b = levelPos[node.depth];
        })(root);
        for (var n = 0; n < nodes.length; n++) {
            if (sideways) {
                nodes[n].x = nodes[n].b;
                nodes[n].y = -nodes[n].a;
            } else {
                nodes[n].x = nodes[n].a;
                nodes[n].y = -nodes[n].b;
            }
        }
    }

    // 전체 경계 상자 가운데를 center로 옮기는 양
    function centerOffset(nodes, center) {
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (var i = 0; i < nodes.length; i++) {
            minX = Math.min(minX, nodes[i].x - nodes[i].w / 2);
            maxX = Math.max(maxX, nodes[i].x + nodes[i].w / 2);
            minY = Math.min(minY, nodes[i].y - nodes[i].h / 2);
            maxY = Math.max(maxY, nodes[i].y + nodes[i].h / 2);
        }
        return [center[0] - (minX + maxX) / 2, center[1] - (minY + maxY) / 2];
    }

    // 부모 → 자식 연결선의 점들. 위→아래: 부모 아래 끝에서 자식 위 끝으로 (꺾은선이면 가운데 높이에서 가로로)
    function edgePoints(parent, child, sideways, bent) {
        var start, end;
        if (sideways) {
            start = [parent.x + parent.w / 2, parent.y];
            end = [child.x - child.w / 2, child.y];
            if (!bent) return [start, end];
            var mx = (start[0] + end[0]) / 2;
            return [start, [mx, start[1]], [mx, end[1]], end];
        }
        start = [parent.x, parent.y - parent.h / 2];
        end = [child.x, child.y + child.h / 2];
        if (!bent) return [start, end];
        var my = (start[1] + end[1]) / 2;
        return [start, [start[0], my], [end[0], my], end];
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function makeText(text) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        return frame;
    }

    function strokeLine(container, points) {
        var line = container.pathItems.add();
        line.setEntirePath(points);
        line.filled = false;
        line.stroked = true;
        line.strokeColor = makeGray(100);
        line.strokeWidth = LINE_WIDTH_PT;
        return line;
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

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
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

    // -------------------------------------------------------
    // 설정 저장 · 복원 (글은 encodeURIComponent로 줄바꿈·'|'을 감싼다)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", encodeURIComponent(treeText), horizontal ? "1" : "0", elbow ? "1" : "0", leafBoxes ? "1" : "0",
            siblingGapMm, levelGapMm, fontPt, boxK, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 12) return;
        try { treeText = decodeURIComponent(p[1]) || DEFAULT_TEXT; } catch (decodeError) { treeText = DEFAULT_TEXT; }
        horizontal = p[2] === "1";
        elbow = p[3] === "1";
        leafBoxes = p[4] === "1";
        siblingGapMm = restoreNumber(p[5], siblingGapMm, GAP_RANGE, 0.5);
        levelGapMm = restoreNumber(p[6], levelGapMm, GAP_RANGE, 0.5);
        fontPt = restoreNumber(p[7], fontPt, FONT_RANGE, 0.5);
        boxK = restoreNumber(p[8], boxK, K_RANGE, 5);
        offsetXmm = restoreNumber(p[9], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[10], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[11] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
