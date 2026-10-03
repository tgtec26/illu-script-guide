// Object_Induction.jsx
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

// 전자기 유도 실험 장치: 같은 폴더의 Object_Induction_template.ai(직접 그린 회색 음영 그림)를 불러와 옵션만 손본다.
//   템플릿 안에서 이름으로 찾는 개체 (그룹·패스·컴파운드 어느 것이든 이름이 같으면 된다):
//     자석          손과 자석 전체. 위아래(mm)만큼 옮긴다
//     바늘          검류계 바늘(축에서 위로 그린 선·도형). 테두리 아래 가운데를 축으로 돌린다 (오른쪽 +)
//     원통          도선을 감을 기둥. 테두리 양옆 사이에 앞쪽 반바퀴를 감은 횟수만큼 그린다. 앞은 타원만큼 아래로 처지므로
//                   첫 바퀴는 아래 테두리보다 그만큼 위에서 시작한다. 보이지 않는 사각형이어도 된다
//     극_S · 극_N   자석 두 반쪽의 앞면(패스 하나씩이 가장 확실). 아래쪽 극을 바꾸면 두 면의 채움을 맞바꾼다
//     글자_S · 글자_N 자석에 새긴 글자. 극을 바꾸면 자리를 맞바꾼다
//   이름이 없는 부분은 그 옵션만 꺼진다. 자석·바늘·원통이 빠지면 알려준다.
//   도선만 스크립트가 그린다(회색 음영): 감은 횟수·굵기·진하기. 간격은 기둥 높이에 맞춰 자동. 확인하면 장치 전체가 든 그룹 하나가 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    // ==== 순수 기하 시작 (tests/check-induction.js 가 이 구간을 그대로 읽는다) ====
    var MM = 2.834645669;
    var KAPPA = 0.5522847498;
    var TILT = 0.3;              // 위에서 비스듬히 본 원: 세로 반지름 / 가로 반지름

    // 앞쪽 반바퀴(왼쪽 끝 → 앞 → 오른쪽 끝)를 베지어 점 3개로. 나선 x = r·cosθ, y = y0 + pitch·(θ−π)/2π + e·sinθ (θ: π → 2π).
    // 점: {anchor, left, right}
    function frontHalfTurn(r, e, pitch, y0) {
        var points = [];
        var thetas = [Math.PI, Math.PI * 1.5, Math.PI * 2];
        for (var i = 0; i < 3; i++) {
            var t = thetas[i];
            var anchor = [r * Math.cos(t), y0 + pitch * (t - Math.PI) / (2 * Math.PI) + e * Math.sin(t)];
            var tangent = [-r * Math.sin(t) * KAPPA, (pitch / (2 * Math.PI) + e * Math.cos(t)) * KAPPA];
            points.push({
                anchor: anchor,
                left: i === 0 ? anchor : [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: i === 2 ? anchor : [anchor[0] + tangent[0], anchor[1] + tangent[1]]
            });
        }
        return points;
    }

    // 감을 영역(테두리 [왼, 위, 오른, 아래]), 횟수, 도선 굵기(mm) → 가운데 x, 도선 중심 반지름, 타원 처짐 e, 간격, 굵기, 첫 바퀴 양 끝 높이.
    // 도선은 기둥 위에 감기므로 중심 반지름은 기둥 반지름 + 굵기 반(양옆으로 굵기 반만큼 나온다). 앞쪽이 e만큼 처지므로
    // 첫 바퀴의 양 끝은 아래 테두리 + e 에서 시작한다. 처짐과 굵기를 빼고 (횟수 − ½)로 나눈 간격이면 마지막 바퀴의
    // 오른쪽 끝(반 간격 높다)도 위 테두리 안에 든다. 횟수가 많으면 간격이 굵기보다 좁아져 겹친다 (위 바퀴가 앞)
    function windingPlan(bounds, turns, wireMm) {
        var d = bounds[2] - bounds[0], wire = wireMm * MM;
        var rw = d / 2 + wire / 2, e = rw * TILT;
        var pitch = Math.max((bounds[1] - bounds[3] - e - wire) / (turns - 0.5), 0.1);
        return {cx: (bounds[0] + bounds[2]) / 2, rw: rw, e: e, pitch: pitch, wire: wire, y0: bounds[3] + e + wire / 2};
    }

    function offsetPoints(points, dx, dy) {
        var out = [];
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            out.push({anchor: [p.anchor[0] + dx, p.anchor[1] + dy], left: [p.left[0] + dx, p.left[1] + dy], right: [p.right[0] + dx, p.right[1] + dy]});
        }
        return out;
    }

    // 템플릿은 글자 S·N의 높이로 어느 극이 아래인지 안다. 원하는 극과 다르면 맞바꾼다
    function poleSwapNeeded(sCenterY, nCenterY, wantSBottom) {
        return (sCenterY < nCenterY) !== wantSBottom;
    }
    // ==== 순수 기하 끝 ====

    var PREF_KEY = "ObjectInduction/settings";
    var TEMPLATE_NAME = "Object_Induction_template.ai";
    var REQUIRED_PARTS = ["자석", "바늘", "원통"];
    var POLE_PARTS = ["극_S", "극_N", "글자_S", "글자_N"];
    var POLES = ["N극이 아래", "S극이 아래"];
    var LABEL_WIDTH = 110;
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var POSITION_LIMIT_MM = 100;
    var NUMBER_KEYS = ["magnetY", "turns", "wire", "shade", "needle", "offsetX", "offsetY"];
    var SPECS = {
        magnetY: {range: [-60, 60], step: 0.5, decimals: 1},
        turns: {range: [1, 80], step: 1, decimals: 0},
        wire: {range: [0.2, 3], step: 0.05, decimals: 2},
        shade: {range: [0, 100], step: 1, decimals: 0},
        needle: {range: [-50, 50], step: 1, decimals: 0},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1}
    };

    var doc = app.activeDocument;
    var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var centerX = (artboardRect[0] + artboardRect[2]) / 2;
    var centerY = (artboardRect[1] + artboardRect[3]) / 2;

    var options = {pole: 0, magnetY: 0, turns: 20, wire: 0.75, shade: 62, needle: 0, offsetX: 0, offsetY: 0, previewOn: true};
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var d = 0; d < NUMBER_KEYS.length; d++) DEFAULTS[NUMBER_KEYS[d]] = options[NUMBER_KEYS[d]];
    applySettings();

    var previewGroup = loadTemplate();
    if (previewGroup === null) return;
    var parts = findParts(previewGroup);
    var missing = [];
    for (var m = 0; m < REQUIRED_PARTS.length; m++) {
        if (!parts[REQUIRED_PARTS[m]]) missing.push(REQUIRED_PARTS[m]);
    }
    var poleMissing = [];
    for (var q = 0; q < POLE_PARTS.length; q++) {
        if (!parts[POLE_PARTS[q]]) poleMissing.push(POLE_PARTS[q]);
    }
    var hasPole = poleMissing.length === 0;
    if (missing.length > 0 || !hasPole) {
        alert("템플릿에서 이름을 찾지 못했습니다: " + missing.concat(poleMissing).join(", ") + "\n그 옵션은 꺼집니다.\n" + TEMPLATE_NAME + "에서 그룹·패스에 이름을 붙여주세요.");
    }

    // 그려 놓은 상태 (템플릿 그대로가 자석 0, 바늘 0). 옵션과의 차이만큼만 손본다
    var state = {magnetY: 0, needle: 0, coilKey: "", sBottom: hasPole ? centerOf(parts["글자_S"])[1] < centerOf(parts["글자_N"])[1] : false};
    var needlePivot = parts["바늘"] ? bottomCenterOf(parts["바늘"]) : null;
    var turnsGroup = null;
    var rows = {};
    var radioSets = {};

    applyAll();
    previewGroup.hidden = !options.previewOn;
    app.redraw();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "전자기 유도 실험 장치");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var magnetPanel = addPanel(dlg, "자석");
    addRadioRow(magnetPanel, "아래쪽 극:", "pole", POLES, hasPole);
    addRow(magnetPanel, "magnetY", "위아래 (mm):", !!parts["자석"]);
    rows.magnetY.input.helpTip = "0이면 그림 그대로. +면 위로";

    var coilPanel = addPanel(dlg, "코일");
    addRow(coilPanel, "turns", "감은 횟수 (회):", !!parts["원통"]);
    addRow(coilPanel, "wire", "굵기 (mm):", !!parts["원통"]);
    addRow(coilPanel, "shade", "진하기 (%):", !!parts["원통"]);
    rows.shade.input.helpTip = "도선 회색의 K값. 클수록 진하다. 밝은 줄은 그 65 %";

    var meterPanel = addPanel(dlg, "검류계");
    addRow(meterPanel, "needle", "바늘 각도 (°):", !!parts["바늘"]);
    rows.needle.input.helpTip = "오른쪽으로 돌면 +";

    var positionPanel = addPanel(dlg, "위치");
    addRow(positionPanel, "offsetX", "가로 (mm):", true);
    addRow(positionPanel, "offsetY", "세로 (mm):", true);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(rows.magnetY, "magnetY");
    bindValueRow(rows.turns, "turns");
    bindValueRow(rows.wire, "wire");
    bindValueRow(rows.shade, "shade");
    bindValueRow(rows.needle, "needle");
    bindPositionRow(rows.offsetX, "offsetX", true);
    bindPositionRow(rows.offsetY, "offsetY", false);
    previewCheck.value = options.previewOn;
    syncRadios();

    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        previewGroup.hidden = !options.previewOn;
        app.redraw();
    };
    okButton.onClick = function() {
        previewGroup.hidden = false;
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        try { previewGroup.remove(); } catch (removeError) {}
    }
    app.redraw();

    function syncRadios() {
        for (var key in radioSets) {
            for (var i = 0; i < radioSets[key].length; i++) radioSets[key][i].value = (options[key] === i);
        }
    }

    // -------------------------------------------------------
    // 템플릿 불러오기
    // -------------------------------------------------------
    // 템플릿 문서를 열어 보이는 레이어의 개체를 쌓임 순서대로 그룹에 복제하고 닫는다. 그룹은 대지 가운데(+ 위치 옵션)에 둔다
    function loadTemplate() {
        var file = new File(new File($.fileName).parent.fsName + "/" + TEMPLATE_NAME);
        if (!file.exists) {
            alert("템플릿 파일이 없습니다:\n" + file.fsName);
            return null;
        }
        var group = findEditableLayer().groupItems.add();
        group.name = "Induction";
        var level = app.userInteractionLevel;
        var template = null;
        try {
            app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
            template = app.open(file);
            try {
                copyArtwork(template, group);
            } catch (duplicateError) {
                pasteArtwork(template, group);
            }
        } catch (loadError) {
            alert("템플릿을 불러오지 못했습니다.\n" + loadError);
            try { group.remove(); } catch (removeError) {}
            group = null;
        } finally {
            if (template !== null) {
                try { template.close(SaveOptions.DONOTSAVECHANGES); } catch (closeError) {}
            }
            app.userInteractionLevel = level;
            try { app.activeDocument = doc; } catch (activateError) {}
        }
        if (group === null) return null;
        var b = group.geometricBounds; // [left, top, right, bottom]
        group.translate(centerX - (b[0] + b[2]) / 2 + options.offsetX * MM, centerY - (b[1] + b[3]) / 2 + options.offsetY * MM);
        return group;
    }

    // 맨 위 레이어의 맨 위 개체부터 차례로 뒤에 붙이면 쌓임 순서가 그대로다
    function copyArtwork(template, group) {
        for (var L = 0; L < template.layers.length; L++) {
            var layer = template.layers[L];
            if (!layer.visible) continue;
            for (var i = 0; i < layer.pageItems.length; i++) layer.pageItems[i].duplicate(group, ElementPlacement.PLACEATEND);
        }
    }

    // 문서 사이 복제가 막히면 복사·붙여넣기로 가져온다 (클립보드를 덮어쓴다)
    function pasteArtwork(template, group) {
        app.activeDocument = template;
        template.selection = null;
        for (var L = 0; L < template.layers.length; L++) {
            var layer = template.layers[L];
            if (!layer.visible) continue;
            for (var i = 0; i < layer.pageItems.length; i++) layer.pageItems[i].selected = true;
        }
        app.copy();
        app.activeDocument = doc;
        doc.selection = null;
        app.paste();
        var pasted = doc.selection;
        for (var k = pasted.length - 1; k >= 0; k--) pasted[k].move(group, ElementPlacement.PLACEATBEGINNING);
        doc.selection = null;
    }

    // 이름 → 개체. 그룹 안까지 내려가며 처음 만나는 것을 쓴다 (자석 그룹 안의 극·글자도 찾는다)
    function findParts(group) {
        var found = {};
        var wanted = REQUIRED_PARTS.concat(POLE_PARTS);
        function walk(container) {
            for (var i = 0; i < container.pageItems.length; i++) {
                var item = container.pageItems[i];
                var name = item.name;
                for (var w = 0; w < wanted.length; w++) {
                    if (name === wanted[w] && !found[name]) found[name] = item;
                }
                if (item.typename === "GroupItem") walk(item);
            }
        }
        walk(group);
        return found;
    }

    // -------------------------------------------------------
    // 옵션 반영 (그려 놓은 상태와의 차이만 손본다)
    // -------------------------------------------------------
    function applyAll() {
        applyPole();
        applyMagnet();
        applyNeedle();
        applyTurns();
    }

    function applyMagnet() {
        if (!parts["자석"]) return;
        var delta = (options.magnetY - state.magnetY) * MM;
        if (delta === 0) return;
        parts["자석"].translate(0, delta);
        state.magnetY = options.magnetY;
    }

    // 축(템플릿 바늘 테두리의 아래 가운데)을 원점으로 옮겨 돌리고 되돌린다. 시계 방향(오른쪽)이 +
    function applyNeedle() {
        if (!parts["바늘"]) return;
        var delta = options.needle - state.needle;
        if (delta === 0) return;
        var needle = parts["바늘"];
        needle.translate(-needlePivot[0], -needlePivot[1]);
        needle.rotate(-delta, true, true, true, true, Transformation.DOCUMENTORIGIN);
        needle.translate(needlePivot[0], needlePivot[1]);
        state.needle = options.needle;
    }

    function applyPole() {
        if (!hasPole) return;
        var wantSBottom = options.pole === 1;
        if (wantSBottom === state.sBottom) return;
        swapFills(parts["극_S"], parts["극_N"]);
        swapPlaces(parts["글자_S"], parts["글자_N"]);
        state.sBottom = wantSBottom;
    }

    // 도선: 원통 바로 위에 그룹을 두고 앞쪽 반바퀴를 감은 횟수만큼. 첫 바퀴만 그리고 간격만큼 올려 복제한다 (위 바퀴가 앞)
    function applyTurns() {
        if (!parts["원통"]) return;
        var coilKey = options.turns + "|" + options.wire + "|" + options.shade;
        if (turnsGroup !== null && state.coilKey === coilKey) return;
        if (turnsGroup !== null) {
            try { turnsGroup.remove(); } catch (removeError) {}
        }
        turnsGroup = previewGroup.groupItems.add();
        turnsGroup.name = "코일 도선";
        turnsGroup.move(parts["원통"], ElementPlacement.PLACEBEFORE);
        var plan = windingPlan(parts["원통"].geometricBounds, options.turns, options.wire);
        var base = bez(turnsGroup, offsetPoints(frontHalfTurn(plan.rw, plan.e, plan.pitch, plan.y0), plan.cx, 0), false);
        strokeRound(base, options.shade, plan.wire);
        var shine = bez(turnsGroup, offsetPoints(frontHalfTurn(plan.rw, plan.e, plan.pitch, plan.y0 + plan.wire * 0.2), plan.cx, 0), false);
        strokeRound(shine, Math.round(options.shade * 0.65), plan.wire * 0.35);
        for (var i = 1; i < options.turns; i++) {
            base.duplicate(turnsGroup, ElementPlacement.PLACEATBEGINNING).translate(0, i * plan.pitch);
            shine.duplicate(turnsGroup, ElementPlacement.PLACEATBEGINNING).translate(0, i * plan.pitch);
        }
        state.coilKey = coilKey;
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다. 바늘 축도 같이 옮긴다
    function movePreview(deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
        if (needlePivot !== null) {
            needlePivot[0] += deltaX;
            needlePivot[1] += deltaY;
        }
    }

    // -------------------------------------------------------
    // 개체 다루기
    // -------------------------------------------------------
    function centerOf(item) {
        var b = item.geometricBounds;
        return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    }

    function bottomCenterOf(item) {
        var b = item.geometricBounds;
        return [(b[0] + b[2]) / 2, b[3]];
    }

    // 자리와 쌓임 순서를 함께 맞바꾼다. 손이 자석 위쪽을 가리므로 위에 오는 글자는 원래 위 글자의 앞뒤 위치를 물려받아야 한다
    function swapPlaces(a, b) {
        var ca = centerOf(a), cb = centerOf(b);
        a.translate(cb[0] - ca[0], cb[1] - ca[1]);
        b.translate(ca[0] - cb[0], ca[1] - cb[1]);
        var marker = previewGroup.pathItems.add();
        marker.move(a, ElementPlacement.PLACEBEFORE);
        a.move(b, ElementPlacement.PLACEBEFORE);
        b.move(marker, ElementPlacement.PLACEBEFORE);
        marker.remove();
    }

    // 두 개체의 패스를 차례로 짝지어 채움을 맞바꾼다 (패스 하나씩이면 그 둘)
    function swapFills(a, b) {
        var pa = pathsOf(a), pb = pathsOf(b);
        for (var i = 0; i < pa.length && i < pb.length; i++) {
            var fa = pa[i].fillColor, fb = pb[i].fillColor;
            setFill(pa[i], fb);
            setFill(pb[i], fa);
        }
    }

    // 그라데이션은 넣을 때 마지막 각도가 붙으므로 읽어서 차이만큼 채움만 돌린다
    function setFill(path, color) {
        path.filled = true;
        path.fillColor = color;
        if (color.typename === "GradientColor") {
            path.rotate(color.angle - path.fillColor.angle, false, false, true, false, Transformation.CENTER);
        }
    }

    function pathsOf(item) {
        if (item.typename === "PathItem") return [item];
        var out = [];
        if (item.typename === "GroupItem" || item.typename === "CompoundPathItem") {
            var list = item.typename === "GroupItem" ? item.pageItems : item.pathItems;
            for (var i = 0; i < list.length; i++) out = out.concat(pathsOf(list[i]));
        }
        return out;
    }

    function bez(container, points, closed) {
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
        path.filled = false;
        path.stroked = false;
        return path;
    }

    function strokeRound(path, k, width) {
        path.stroked = true;
        path.strokeColor = makeGray(k);
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.ROUNDENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
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
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v;
        rgb.green = v;
        rgb.blue = v;
        return rgb;
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

    function addRadioRow(parent, label, key, names, enabled) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        radioSets[key] = [];
        for (var i = 0; i < names.length; i++) {
            var radio = row.add("radiobutton", undefined, names[i]);
            radio.enabled = enabled;
            bindRadio(radio, key, i);
            radioSets[key].push(radio);
        }
    }

    function bindRadio(radio, key, index) {
        radio.onClick = function() {
            options[key] = index;
            syncRadios();
            applyAll();
            app.redraw();
        };
    }

    // 라벨 (단위): | 입력창 | 스크롤바
    function addRow(parent, key, label, enabled) {
        var spec = SPECS[key];
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(options[key], spec.decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, options[key], spec.range[0], spec.range[1]);
        slider.stepdelta = spec.step;
        slider.jumpdelta = spec.step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        input.enabled = enabled;
        slider.enabled = enabled;
        reset.enabled = enabled;
        rows[key] = {input: input, slider: slider, reset: reset, min: spec.range[0], max: spec.range[1], step: spec.step, decimals: spec.decimals};
        return rows[key];
    }

    function showRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = clamp(value, controls.min, controls.max); } catch (e) {}
    }

    function bindValueRow(controls, key) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            showRowValue(controls, value);
            if (value === options[key]) return;
            options[key] = value;
            applyAll();
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
        };
    }

    function bindPositionRow(controls, key, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - options[key]) * MM;
            options[key] = value;
            showRowValue(controls, value);
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
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
        return Math.round(Math.round(value / step) * step * 1e6) / 1e6;
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
    // 설정 저장 · 복원 ("v4" + 극 + 숫자 7 + 미리보기. 확인할 때만 저장)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v4", options.pole];
        for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        parts.push(options.previewOn ? "1" : "0");
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v4" || p.length !== 3 + NUMBER_KEYS.length) return;
        var pole = parseInt(p[1], 10);
        if (pole >= 0 && pole < POLES.length) options.pole = pole;
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[2 + i]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
        options.previewOn = (p[2 + NUMBER_KEYS.length] === "1");
    }
})();
