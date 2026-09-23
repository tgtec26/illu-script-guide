/*
  Illustrator Script: Tapered Arrow
  Description: 선택한 패스를 따라 시작 폭에서 끝 폭으로 굵어지는 화살표를 면 하나로 그립니다.
               폭 속성·화살촉 프리셋·액션을 쓰지 않고 직접 계산하므로 문서마다 결과가 같습니다.
*/

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


(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectExpandArrow/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    // 곡선을 몇 pt 간격으로 잘라 외곽선을 계산할지
    var SAMPLE_STEP_PT = 2;
    // 급하게 꺾이는 모서리에서 폭이 튀지 않도록 막는 마이터 한계
    var MITER_LIMIT = 4;
    // 곡선 외곽선을 베지어로 맞출 때 허용하는 최대 오차
    var FIT_TOLERANCE_PT = 0.1;
    // 선 설정 액션의 이름들은 일러스트레이터 UI 언어를 따른다 (한국어판)
    var STROKE_ACTION_NAMES = {event: "선 설정", buttCap: "접한 단면", roundJoin: "둥근 연결", alignOutside: "외부"};

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("확장 화살표를 적용할 선을 선택해주세요.");
        return;
    }

    var sourcePaths = [];
    for (var i = 0; i < sel.length; i++) {
        collectPathItems(sel[i], sourcePaths);
    }

    if (sourcePaths.length === 0) {
        alert("선택 항목 안에 적용 가능한 패스가 없습니다.");
        return;
    }

    var ROWS = {
        startWidth: {label: "시작 폭", unit: "pt", min: 0, max: 100, step: 0.5},
        endWidth: {label: "끝 폭", unit: "pt", min: 0.5, max: 100, step: 0.5},
        headLength: {label: "길이", unit: "pt", min: 0.5, max: 200, step: 0.5},
        headWidth: {label: "너비", unit: "pt", min: 0.5, max: 200, step: 0.5},
        whiteWidth: {label: "", unit: "pt", min: 0.1, max: 20, step: 0.1},
        offsetX: {label: "가로 이동", unit: "mm", min: -POSITION_LIMIT_MM, max: POSITION_LIMIT_MM, step: 0.1},
        offsetY: {label: "세로 이동", unit: "mm", min: -POSITION_LIMIT_MM, max: POSITION_LIMIT_MM, step: 0.1}
    };

    var values = {
        startWidth: 0,
        endWidth: 8,
        headLength: 12,
        headWidth: 18,
        whiteWidth: 0.3,
        offsetX: 0,
        offsetY: 0
    };
    var addWhiteLine = true;
    var previewEnabled = true;
    var previewItems = [];

    applySavedSettings();

    var LABEL_WIDTH = 92;
    var SLIDER_WIDTH = 196;

    var dlg = new Window("dialog", "확장 화살표");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var bodyPanel = addPanel(dlg, "몸통");
    bindValueRow(addValueRow(bodyPanel, "startWidth"));
    bindValueRow(addValueRow(bodyPanel, "endWidth"));

    var headPanel = addPanel(dlg, "화살촉");
    bindValueRow(addValueRow(headPanel, "headLength"));
    bindValueRow(addValueRow(headPanel, "headWidth"));

    var outlinePanel = addPanel(dlg, "테두리");
    var whiteRow = outlinePanel.add("group");
    whiteRow.alignChildren = ["left", "center"];
    var whiteCheck = whiteRow.add("checkbox", undefined, "흰색 선 (pt):");
    whiteCheck.preferredSize.width = LABEL_WIDTH;
    whiteCheck.value = addWhiteLine;
    var whiteControls = addValueRow(whiteRow, "whiteWidth", true);
    bindValueRow(whiteControls);

    var positionPanel = addPanel(dlg, "위치");
    bindPositionRow(addValueRow(positionPanel, "offsetX"), true);
    bindPositionRow(addValueRow(positionPanel, "offsetY"), false);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    whiteCheck.onClick = function() {
        addWhiteLine = whiteCheck.value;
        whiteControls.input.enabled = addWhiteLine;
        whiteControls.slider.enabled = addWhiteLine;
        updatePreview();
    };
    whiteControls.input.enabled = addWhiteLine;
    whiteControls.slider.enabled = addWhiteLine;
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        dlg.close(1);
    };

    // 원본은 숨겨두고 새로 그린 면으로 미리보기를 만든다.
    // 확인하면 그 면을 그대로 결과로 쓰고 원본을 지운다.
    var sourceHidden = [];
    for (var h = 0; h < sourcePaths.length; h++) {
        sourceHidden.push(sourcePaths[h].hidden);
    }
    hideSources(true);
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();

    if (result === 1) {
        if (previewItems.length === 0) {
            buildResult();
        }
        for (var r = 0; r < sourcePaths.length; r++) {
            try { sourcePaths[r].remove(); } catch (e) {}
        }
        doc.selection = null;
        for (var s = 0; s < previewItems.length; s++) {
            try { previewItems[s].selected = true; } catch (e2) {}
        }
        saveSettings();
    } else {
        clearPreview();
        hideSources(false);
        doc.selection = null;
        for (var t = 0; t < sourcePaths.length; t++) {
            try { sourcePaths[t].selected = true; } catch (e3) {}
        }
    }
    app.redraw();

    function hideSources(hidden) {
        for (var i = 0; i < sourcePaths.length; i++) {
            try {
                sourcePaths[i].hidden = hidden ? true : sourceHidden[i];
            } catch (e) {}
        }
    }

    // 원본마다 화살표 면을 하나씩 만든다. 미리보기와 최종 결과가 같은 경로를 쓴다.
    function buildResult() {
        var options = {
            startWidth: values.startWidth,
            endWidth: values.endWidth,
            headLength: values.headLength,
            headWidth: values.headWidth
        };
        var dx = values.offsetX * MM_TO_PT;
        var dy = values.offsetY * MM_TO_PT;
        var white = addWhiteLine ? makeWhiteColor(doc) : null;

        for (var i = 0; i < sourcePaths.length; i++) {
            var source = sourcePaths[i];
            var outline = null;
            try {
                outline = taperedArrowOutline(flattenPath(readPathPoints(source), source.closed), options);
            } catch (e) {}
            if (outline === null) continue;

            try {
                var color = arrowColor(source);
                var arrow = source.duplicate();
                arrow.hidden = false;
                setPathNodes(arrow, outline);
                arrow.closed = true;
                arrow.filled = true;
                arrow.fillColor = color;
                if (white !== null) {
                    arrow.stroked = true;
                    arrow.strokeColor = white;
                    arrow.strokeWidth = values.whiteWidth;
                    arrow.strokeCap = StrokeCap.BUTTENDCAP;
                    arrow.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                    arrow.strokeDashes = [];
                } else {
                    arrow.stroked = false;
                }
                if (dx !== 0 || dy !== 0) arrow.translate(dx, dy);
                previewItems.push(arrow);
            } catch (e2) {}
        }
        if (white !== null) alignStrokesOutside(previewItems);
    }

    // 앵커를 한 번에 놓고 핸들만 따로 지정한다
    function setPathNodes(pathItem, nodes) {
        var anchors = [];
        for (var i = 0; i < nodes.length; i++) anchors.push(nodes[i].anchor);
        pathItem.setEntirePath(anchors);
        for (var j = 0; j < nodes.length; j++) {
            if (samePoint(nodes[j].left, nodes[j].anchor) && samePoint(nodes[j].right, nodes[j].anchor)) continue;
            var point = pathItem.pathPoints[j];
            point.leftDirection = nodes[j].left;
            point.rightDirection = nodes[j].right;
        }
    }

    // 흰색 선이 검은 면을 덮지 않도록 바깥쪽으로 선 정렬한다.
    // DOM으로 지정되지 않으면 녹화된 '선 설정' 액션(선 정렬: 외부)으로 지정한다.
    function alignStrokesOutside(items) {
        var pending = [];
        for (var i = 0; i < items.length; i++) {
            try { items[i].strokeAlignment = StrokeAlignment.OUTSIDE; } catch (e) {}
            var aligned = false;
            try { aligned = items[i].strokeAlignment === StrokeAlignment.OUTSIDE; } catch (e2) {}
            if (!aligned) pending.push(items[i]);
        }
        if (pending.length === 0) return;

        var setName = "Codex_ArrowOutsideStroke";
        var actionFile = new File(Folder.temp + "/Codex_ArrowOutsideStroke.aia");
        try {
            doc.selection = null;
            for (var j = 0; j < pending.length; j++) pending[j].selected = true;
            removeActionSetIfLoaded(setName);
            writeOutsideStrokeAction(actionFile, setName, values.whiteWidth);
            app.loadAction(actionFile);
            app.doScript("Stroke", setName);
        } catch (e3) {
        } finally {
            removeActionSetIfLoaded(setName);
            try { actionFile.remove(); } catch (e4) {}
            doc.selection = null;
        }
    }

    // cjhaction_260624.aia에 녹화된 선 설정 이벤트와 같은 파라미터 구성
    function writeOutsideStrokeAction(actionFile, setName, width) {
        var lines = [
            "/version 3",
            "/name [ " + setName.length, "    " + asciiHex(setName), "]",
            "/isOpen 1",
            "/actionCount 1",
            "/action-1 {",
            "    /name [ 6", "        " + asciiHex("Stroke"), "    ]",
            "    /keyIndex 0",
            "    /colorIndex 0",
            "    /isOpen 1",
            "    /eventCount 1",
            "    /event-1 {",
            "        /useRulersIn1stQuadrant 0",
            "        /internalName (ai_plugin_setStroke)",
            "        /localizedName [ " + utf8HexLength(STROKE_ACTION_NAMES.event),
            "            " + utf8Hex(STROKE_ACTION_NAMES.event),
            "        ]",
            "        /isOpen 0",
            "        /isOn 1",
            "        /hasDialog 0",
            "        /parameterCount 6"
        ];
        addUnitRealParameter(lines, 1, 2003072104, width);
        addEnumeratedParameter(lines, 2, 1667330094, STROKE_ACTION_NAMES.buttCap, 0);
        addEnumeratedParameter(lines, 3, 1785686382, STROKE_ACTION_NAMES.roundJoin, 1);
        addIntegerParameter(lines, 4, 1684825454, 0);
        addBooleanParameter(lines, 5, 1684104298, 0);
        addEnumeratedParameter(lines, 6, 1634494318, STROKE_ACTION_NAMES.alignOutside, 2);
        lines.push("    }");
        lines.push("}");
        writeActionFile(actionFile, lines);
    }

    // 원래 선 색을 화살표 면 색으로 쓴다. 선이 없으면 면 색, 둘 다 없으면 검정.
    function arrowColor(source) {
        try {
            if (source.stroked && source.strokeColor.typename !== "NoColor") return source.strokeColor;
            if (source.filled && source.fillColor.typename !== "NoColor") return source.fillColor;
        } catch (e) {}
        var black = new GrayColor();
        black.gray = 100;
        return black;
    }

    function readPathPoints(pathItem) {
        var points = [];
        for (var i = 0; i < pathItem.pathPoints.length; i++) {
            var p = pathItem.pathPoints[i];
            points.push({anchor: p.anchor, left: p.leftDirection, right: p.rightDirection});
        }
        return points;
    }

    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildResult();
        app.redraw();
    }

    function clearPreview() {
        for (var i = previewItems.length - 1; i >= 0; i--) {
            try { previewItems[i].remove(); } catch (e) {}
        }
        previewItems = [];
    }

    // 라벨 (단위): | 입력창 | 스크롤바
    function addValueRow(parent, key, compact) {
        var spec = ROWS[key];
        var row = compact ? parent : parent.add("group");
        if (!compact) row.alignChildren = ["left", "center"];
        if (spec.label !== "") {
            var label = row.add("statictext", undefined, spec.label + " (" + spec.unit + "):");
            label.preferredSize.width = LABEL_WIDTH;
        }
        var input = row.add("edittext", undefined, formatValue(values[key]));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, values[key], spec.min, spec.max);
        slider.stepdelta = spec.step;
        slider.jumpdelta = spec.step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {key: key, spec: spec, input: input, slider: slider};
    }

    // 화살표 계산은 가벼워서 드래그 중에도 바로 다시 그린다
    function bindValueRow(controls) {
        function commit(value) {
            values[controls.key] = setRowValue(controls, value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var parsed = parseNumber(controls.input.text);
            commit(parsed === null ? values[controls.key] : parsed);
        };
    }

    // 위치 변경은 화살표를 다시 만들지 않고 미리보기 면만 옮긴다
    function bindPositionRow(controls, isX) {
        function commit(value) {
            var before = values[controls.key];
            var after = setRowValue(controls, value);
            values[controls.key] = after;
            var delta = (after - before) * MM_TO_PT;
            if (delta === 0) return;
            for (var i = 0; i < previewItems.length; i++) {
                try { previewItems[i].translate(isX ? delta : 0, isX ? 0 : delta); } catch (e) {}
            }
            if (previewItems.length > 0) app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var parsed = parseNumber(controls.input.text);
            commit(parsed === null ? values[controls.key] : parsed);
        };
    }

    function setRowValue(controls, value) {
        var spec = controls.spec;
        value = Math.round(value / spec.step) * spec.step;
        value = clamp(Math.round(value * 1000) / 1000, spec.min, spec.max);
        controls.input.text = formatValue(value);
        try { controls.slider.value = value; } catch (e) {}
        return value;
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
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

    function clamp(value, minimum, maximum) {
        return value < minimum ? minimum : (value > maximum ? maximum : value);
    }

    function saveSettings() {
        var parts = [
            "v2",
            values.startWidth,
            values.endWidth,
            values.headLength,
            values.headWidth,
            addWhiteLine ? "1" : "0",
            values.whiteWidth,
            values.offsetX,
            values.offsetY
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 9) return;

        var keys = ["startWidth", "endWidth", "headLength", "headWidth"];
        for (var i = 0; i < keys.length; i++) {
            restoreValue(keys[i], p[i + 1]);
        }
        addWhiteLine = (p[5] === "1");
        restoreValue("whiteWidth", p[6]);
        restoreValue("offsetX", p[7]);
        restoreValue("offsetY", p[8]);
    }

    function restoreValue(key, text) {
        var value = parseFloat(text);
        var spec = ROWS[key];
        if (isFinite(value) && value >= spec.min && value <= spec.max) values[key] = value;
    }

    // 베지어 패스를 점 목록으로 편다. 직선 구간은 끝점만 넣는다
    // (폭이 길이에 비례해 변하므로 직선 구간의 외곽선도 직선이다).
    // breaks: 원래 앵커가 놓인 점 번호. 외곽선을 곡선으로 맞출 때 이 점에서 구간을 나눈다.
    function flattenPath(points, closed) {
        var result = {points: [], breaks: []};
        if (points.length === 0) return result;
        pushPoint(result.points, points[0].anchor);
        result.breaks.push(0);
        var count = closed ? points.length : points.length - 1;
        for (var i = 0; i < count; i++) {
            var a = points[i];
            var b = points[(i + 1) % points.length];
            var p0 = a.anchor, p1 = a.right, p2 = b.left, p3 = b.anchor;
            if (samePoint(p0, p1) && samePoint(p2, p3)) {
                pushPoint(result.points, p3);
            } else {
                var hull = distance(p0, p1) + distance(p1, p2) + distance(p2, p3);
                var steps = Math.max(8, Math.min(200, Math.ceil(hull / SAMPLE_STEP_PT)));
                for (var s = 1; s <= steps; s++) {
                    pushPoint(result.points, bezierPoint(p0, p1, p2, p3, s / steps));
                }
            }
            var last = result.points.length - 1;
            if (result.breaks[result.breaks.length - 1] !== last) result.breaks.push(last);
        }
        return result;
    }

    function pushPoint(list, p) {
        if (list.length > 0 && distance(list[list.length - 1], p) < 1e-6) return;
        list.push([p[0], p[1]]);
    }

    // 점 목록을 따라 폭이 시작 폭 → 끝 폭으로 변하는 몸통과 끝의 삼각 화살촉을 하나의 닫힌 외곽선으로 만든다.
    // 화살촉 꼭짓점은 패스 끝점, 밑변은 패스를 따라 화살촉 길이만큼 되돌아간 곳이다.
    // 돌려주는 값은 {anchor, left, right} 목록이다.
    function taperedArrowOutline(flat, o) {
        var pts = flat.points;
        if (pts.length < 2) return null;
        var lengths = [0];
        for (var i = 1; i < pts.length; i++) {
            lengths.push(lengths[i - 1] + distance(pts[i - 1], pts[i]));
        }
        var total = lengths[lengths.length - 1];
        if (total < 1e-6) return null;

        var bodyLength = Math.max(0, total - o.headLength);
        var body = [pts[0]];
        var bodyS = [0];
        var base = pts[0];
        for (var j = 1; j < pts.length && bodyLength > 0; j++) {
            if (lengths[j] < bodyLength) {
                body.push(pts[j]);
                bodyS.push(lengths[j]);
                continue;
            }
            var f = (bodyLength - lengths[j - 1]) / (lengths[j] - lengths[j - 1]);
            base = [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f];
            if (distance(base, body[body.length - 1]) > 1e-6) {
                body.push(base);
                bodyS.push(bodyLength);
            }
            break;
        }

        var tip = pts[pts.length - 1];
        var headNormal = unitNormal(base, tip);
        if (headNormal === null) return null;
        var headHalf = o.headWidth / 2;
        var headLeft = cornerNode([base[0] + headNormal[0] * headHalf, base[1] + headNormal[1] * headHalf]);
        var headRight = cornerNode([base[0] - headNormal[0] * headHalf, base[1] - headNormal[1] * headHalf]);

        if (body.length < 2) return [headLeft, cornerNode(tip), headRight];

        var left = [];
        var right = [];
        for (var k = 0; k < body.length; k++) {
            var halfWidth = (o.startWidth + (o.endWidth - o.startWidth) * bodyS[k] / bodyLength) / 2;
            // 몸통 끝은 화살촉 밑변과 같은 방향으로 잘라 두 선이 한 줄에 놓이게 한다
            var n = k === body.length - 1 ? headNormal : offsetNormal(body, k);
            left.push([body[k][0] + n[0] * halfWidth, body[k][1] + n[1] * halfWidth]);
            right.push([body[k][0] - n[0] * halfWidth, body[k][1] - n[1] * halfWidth]);
        }
        var breaks = [];
        for (var b = 0; b < flat.breaks.length && flat.breaks[b] < body.length - 1; b++) {
            breaks.push(flat.breaks[b]);
        }
        breaks.push(body.length - 1);

        var outline = fitSide(left, breaks);
        var rightNodes = fitSide(right, breaks);
        outline.push(headLeft, cornerNode(tip), headRight);
        for (var r = rightNodes.length - 1; r >= 0; r--) {
            var node = rightNodes[r];
            outline.push({anchor: node.anchor, left: node.right, right: node.left});
        }
        return outline;
    }

    // k번째 점에서 외곽선을 띄울 방향. 모서리에서는 앞뒤 법선의 이등분선을 마이터 길이만큼 늘린다.
    function offsetNormal(pts, k) {
        if (k === 0) return unitNormal(pts[0], pts[1]);
        var last = pts.length - 1;
        if (k === last) return unitNormal(pts[last - 1], pts[last]);
        var n1 = unitNormal(pts[k - 1], pts[k]);
        var n2 = unitNormal(pts[k], pts[k + 1]);
        var mx = n1[0] + n2[0];
        var my = n1[1] + n2[1];
        var len = Math.sqrt(mx * mx + my * my);
        if (len < 1e-6) return n1;
        mx /= len;
        my /= len;
        var scale = 1 / Math.max(mx * n1[0] + my * n1[1], 1 / MITER_LIMIT);
        return [mx * scale, my * scale];
    }

    // 외곽선 한쪽의 점 목록을 원래 앵커 위치(breaks)마다 나눠 베지어로 맞춘다.
    // 원래 앵커가 매끄러운 점이면 양쪽 구간이 같은 접선을 써서 꺾이지 않는다.
    function fitSide(side, breaks) {
        var nodes = [cornerNode(side[0])];
        for (var b = 0; b < breaks.length - 1; b++) {
            var first = breaks[b];
            var last = breaks[b + 1];
            if (last - first < 2) {
                nodes.push(cornerNode(side[last]));
                continue;
            }
            var curves = [];
            fitCubic(side, first, last, breakTangent(side, first, breaks, 1), breakTangent(side, last, breaks, -1), curves);
            for (var c = 0; c < curves.length; c++) {
                nodes[nodes.length - 1].right = curves[c][1];
                nodes.push({anchor: curves[c][3], left: curves[c][2], right: curves[c][3]});
            }
        }
        return nodes;
    }

    // 구간 끝 점의 접선. dir = 1이면 구간 앞쪽으로, -1이면 뒤쪽으로 향한다.
    // 앞뒤 구간 방향이 10° 안쪽으로 이어지면 매끄러운 점으로 보고 두 방향을 평균한다.
    function breakTangent(side, index, breaks, dir) {
        var inward = unitVector(side[index], side[index + dir]);
        var isInner = index !== breaks[0] && index !== breaks[breaks.length - 1];
        if (!isInner) return inward;
        var outward = unitVector(side[index - dir], side[index]);
        if (inward[0] * outward[0] + inward[1] * outward[1] < 0.985) return inward;
        var sx = inward[0] + outward[0];
        var sy = inward[1] + outward[1];
        var len = Math.sqrt(sx * sx + sy * sy);
        return [sx / len, sy / len];
    }

    // Schneider 곡선 맞춤. t1은 시작점에서 앞으로, t2는 끝점에서 뒤로 향하는 단위 접선.
    function fitCubic(d, first, last, t1, t2, out) {
        var p0 = d[first];
        var p3 = d[last];
        if (last - first === 1) {
            var third = distance(p0, p3) / 3;
            out.push([p0, [p0[0] + t1[0] * third, p0[1] + t1[1] * third], [p3[0] + t2[0] * third, p3[1] + t2[1] * third], p3]);
            return;
        }
        var u = chordParameters(d, first, last);
        var bez = generateBezier(d, first, u, t1, t2, p3);
        var err = maxFitError(d, first, bez, u);
        for (var it = 0; it < 4 && err.error > FIT_TOLERANCE_PT && err.error < FIT_TOLERANCE_PT * 4; it++) {
            u = reparameterize(d, first, u, bez);
            bez = generateBezier(d, first, u, t1, t2, p3);
            err = maxFitError(d, first, bez, u);
        }
        if (err.error <= FIT_TOLERANCE_PT) {
            out.push(bez);
            return;
        }
        var split = err.index;
        var center = unitVector(d[split + 1], d[split - 1]);
        fitCubic(d, first, split, t1, center, out);
        fitCubic(d, split, last, [-center[0], -center[1]], t2, out);
    }

    function chordParameters(d, first, last) {
        var u = [0];
        for (var i = first + 1; i <= last; i++) {
            u.push(u[u.length - 1] + distance(d[i - 1], d[i]));
        }
        var total = u[u.length - 1];
        for (var j = 1; j < u.length; j++) u[j] /= total;
        return u;
    }

    // 양 끝 접선 방향은 고정하고 핸들 길이만 최소제곱으로 구한다
    function generateBezier(d, first, u, t1, t2, p3) {
        var p0 = d[first];
        var c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
        for (var i = 0; i < u.length; i++) {
            var t = u[i];
            var mt = 1 - t;
            var b1 = 3 * mt * mt * t, b2 = 3 * mt * t * t;
            var head = mt * mt * mt + b1, tail = b2 + t * t * t;
            var ax = t1[0] * b1, ay = t1[1] * b1;
            var bx = t2[0] * b2, by = t2[1] * b2;
            var tx = d[first + i][0] - (p0[0] * head + p3[0] * tail);
            var ty = d[first + i][1] - (p0[1] * head + p3[1] * tail);
            c00 += ax * ax + ay * ay;
            c01 += ax * bx + ay * by;
            c11 += bx * bx + by * by;
            x0 += ax * tx + ay * ty;
            x1 += bx * tx + by * ty;
        }
        var segLength = distance(p0, p3);
        var alpha1 = segLength / 3;
        var alpha2 = segLength / 3;
        var det = c00 * c11 - c01 * c01;
        if (Math.abs(det) > 1e-12) {
            var l = (x0 * c11 - x1 * c01) / det;
            var r = (c00 * x1 - c01 * x0) / det;
            if (l > segLength * 1e-6 && r > segLength * 1e-6) {
                alpha1 = l;
                alpha2 = r;
            }
        }
        return [p0, [p0[0] + t1[0] * alpha1, p0[1] + t1[1] * alpha1], [p3[0] + t2[0] * alpha2, p3[1] + t2[1] * alpha2], p3];
    }

    function maxFitError(d, first, bez, u) {
        var result = {error: 0, index: first + Math.floor(u.length / 2)};
        for (var i = 1; i < u.length - 1; i++) {
            var e = distance(bezierPoint(bez[0], bez[1], bez[2], bez[3], u[i]), d[first + i]);
            if (e > result.error) {
                result.error = e;
                result.index = first + i;
            }
        }
        return result;
    }

    // 뉴턴법으로 각 점에 가장 가까운 곡선 위 매개변수를 다시 구한다
    function reparameterize(d, first, u, bez) {
        var next = [];
        for (var i = 0; i < u.length; i++) {
            var t = u[i];
            var mt = 1 - t;
            var q = bezierPoint(bez[0], bez[1], bez[2], bez[3], t);
            var num = 0, den = 0;
            for (var axis = 0; axis < 2; axis++) {
                var q1 = 3 * (mt * mt * (bez[1][axis] - bez[0][axis]) + 2 * mt * t * (bez[2][axis] - bez[1][axis]) +
                    t * t * (bez[3][axis] - bez[2][axis]));
                var q2 = 6 * (mt * (bez[2][axis] - 2 * bez[1][axis] + bez[0][axis]) + t * (bez[3][axis] - 2 * bez[2][axis] + bez[1][axis]));
                var diff = q[axis] - d[first + i][axis];
                num += diff * q1;
                den += q1 * q1 + diff * q2;
            }
            next.push(den === 0 ? t : Math.max(0, Math.min(1, t - num / den)));
        }
        return next;
    }

    function bezierPoint(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return [
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        ];
    }

    function cornerNode(p) {
        return {anchor: [p[0], p[1]], left: [p[0], p[1]], right: [p[0], p[1]]};
    }

    // a → b 진행 방향의 왼쪽 단위 법선
    function unitNormal(a, b) {
        var v = unitVector(a, b);
        return v === null ? null : [-v[1], v[0]];
    }

    function unitVector(a, b) {
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-9) return null;
        return [dx / len, dy / len];
    }

    function samePoint(a, b) {
        return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    }

    function distance(a, b) {
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
})();
