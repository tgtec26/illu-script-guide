// Object_LabGlassware.jsx
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

// 실험 기구: 비커·삼각 플라스크·시험관·눈금실린더·주사기·온도계를 그린다.
//   - 축에 나란한 사각형을 선택하고 실행하면 그 자리·크기에 그리고 확인할 때 사각형을 지운다.
//     선택이 없으면 화면 가운데에 종류별 기본 크기로 그린다. 크기는 다이얼로그에서 고칠 수 있다.
//   - 기구 윤곽은 꼭짓점마다 모서리 반지름을 준 꺾은선을 베지어 원호로 둥글린 것이다 (시험관 바닥은 반원).
//   - 액체: 기구 안쪽을 바닥부터 높이(%)까지 채운 면(선 없음, 이름 '액체')과 수면 선. 온도계는 액주 높이, 주사기는 피스톤 위치.
//     주사기 속 공간은 선·면 없는 닫힌 패스 '기체'로 남긴다. 둘 다 입자 상태 모형(Object_ParticleState)으로 채울 수 있다.
//   - 눈금: 안쪽 왼쪽 벽을 따라 짧은 선 (5칸마다 길게). 온도계는 관 오른쪽 바깥.
// 선은 0.3pt 검정. 결과는 그룹 하나.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectLabGlassware/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var FLATTEN_STEPS = 12;
    // 종류: 이름, 기본 크기(mm), 액체 행 이름
    var KINDS = [
        {name: "비커", size: [30, 34], level: "액체 높이"},
        {name: "삼각 플라스크", size: [30, 40], level: "액체 높이"},
        {name: "시험관", size: [10, 50], level: "액체 높이"},
        {name: "눈금실린더", size: [14, 60], level: "액체 높이"},
        {name: "주사기", size: [18, 60], level: "피스톤 위치"},
        {name: "온도계", size: [7, 60], level: "액주 높이"}
    ];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 50;
    var SIZE_RANGE = [3, 300];
    var LEVEL_RANGE = [0, 100];
    var K_RANGE = [0, 100];
    var TICK_RANGE = [2, 50];

    var doc = app.activeDocument;
    var rect = getSelectedRectangle(doc.selection);
    var rectWasHidden = rect !== null ? rect.hidden : false;
    var center;
    if (rect !== null) {
        var rb = rect.geometricBounds;
        center = [(rb[0] + rb[2]) / 2, (rb[1] + rb[3]) / 2];
    } else {
        center = doc.activeView.centerPoint;
    }

    // 옵션 (크기는 선택한 사각형이나 종류별 기본값에서 오므로 저장하지 않는다)
    var kind = 0;
    var liquidOn = true;
    var levelPct = 50;
    var liquidK = 20;
    var ticksOn = false;
    var tickCount = 10;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();
    var widthMm, heightMm;
    resetSize();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "실험 기구");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var kindPanel = addPanel(dlg, "기구");
    var kindRow = kindPanel.add("group");
    kindRow.alignChildren = ["left", "center"];
    kindRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var kindList = kindRow.add("dropdownlist", undefined, []);
    for (var k = 0; k < KINDS.length; k++) kindList.add("item", KINDS[k].name);
    kindList.preferredSize.width = 160;
    var widthRow = addValueRow(kindPanel, "너비", "mm", widthMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
    var heightRow = addValueRow(kindPanel, "높이", "mm", heightMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);

    var liquidPanel = addPanel(dlg, "액체");
    var liquidCheck = liquidPanel.add("checkbox", undefined, "액체 넣기");
    var levelRow = addValueRow(liquidPanel, KINDS[kind].level, "%", levelPct, LEVEL_RANGE[0], LEVEL_RANGE[1], 1, 0);
    var kRow = addValueRow(liquidPanel, "액체 색", "K", liquidK, K_RANGE[0], K_RANGE[1], 10, 0);

    var tickPanel = addPanel(dlg, "눈금");
    var tickCheck = tickPanel.add("checkbox", undefined, "눈금 넣기 (5칸마다 길게)");
    var tickRow = addValueRow(tickPanel, "칸 수", "", tickCount, TICK_RANGE[0], TICK_RANGE[1], 1, 0);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    kindList.selection = kind;
    liquidCheck.value = liquidOn;
    tickCheck.value = ticksOn;
    syncEnabled();

    // 종류를 바꾸면 선택한 사각형이 없을 때만 기본 크기로 돌린다
    kindList.onChange = function() {
        if (!kindList.selection) return;
        kind = kindList.selection.index;
        if (rect === null) {
            resetSize();
            setRowValue(widthRow, widthMm);
            setRowValue(heightRow, heightMm);
        }
        levelRow.label.text = KINDS[kind].level + " (%):";
        syncEnabled();
        updatePreview();
    };
    liquidCheck.onClick = function() { liquidOn = liquidCheck.value; syncEnabled(); updatePreview(); };
    tickCheck.onClick = function() { ticksOn = tickCheck.value; syncEnabled(); updatePreview(); };
    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(heightRow, function() { return heightMm; }, function(v) { heightMm = v; });
    bindValueRow(levelRow, function() { return levelPct; }, function(v) { levelPct = v; });
    bindValueRow(kRow, function() { return liquidK; }, function(v) { liquidK = v; });
    bindValueRow(tickRow, function() { return tickCount; }, function(v) { tickCount = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) {
            if (rect !== null) rect.hidden = true;
            buildPreview();
        }
        if (rect !== null) {
            try { rect.remove(); } catch (removeError) {}
        }
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        if (rect !== null) {
            rect.hidden = rectWasHidden;
            rect.selected = true;
        }
    }
    app.redraw();

    function resetSize() {
        if (rect !== null) {
            var b = rect.geometricBounds;
            widthMm = Math.round((b[2] - b[0]) / MM * 10) / 10;
            heightMm = Math.round((b[1] - b[3]) / MM * 10) / 10;
        } else {
            widthMm = KINDS[kind].size[0];
            heightMm = KINDS[kind].size[1];
        }
    }

    // 액체 색은 온도계(액주)에도 쓴다. 액체를 끄면 높이·색을 잠근다. 칸 수는 눈금을 켰을 때만
    function syncEnabled() {
        setRowEnabled(levelRow, liquidOn || kind === 4);
        setRowEnabled(kRow, liquidOn);
        setRowEnabled(tickRow, ticksOn);
        liquidCheck.text = kind === 4 ? "액체 넣기 (주사기는 피스톤만 움직임)" : "액체 넣기";
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            if (rect !== null) rect.hidden = true;
            buildPreview();
        } else if (rect !== null) {
            rect.hidden = rectWasHidden;
        }
        app.redraw();
    }

    function buildPreview() {
        var w = widthMm * MM;
        var h = heightMm * MM;
        var box = {left: center[0] - w / 2, top: center[1] + h / 2, width: w, height: h};
        var g = glassware(kind, box, levelPct / 100);
        var black = makeGray(100);
        var container = rect !== null ? rect.parent : findEditableLayer();
        previewGroup = container.groupItems.add();
        previewGroup.name = KINDS[kind].name;
        if (rect !== null) previewGroup.move(rect, ElementPlacement.PLACEBEFORE);

        // 아래부터: 액체(면) → 윤곽 → 부품(면 있는 것) → 수면·눈금
        if (liquidOn && kind !== 4) {
            var liquid = clipBelow(g.interior, g.levelY);
            if (liquid.length >= 3) {
                var liquidPath = previewGroup.pathItems.add();
                liquidPath.setEntirePath(liquid);
                liquidPath.closed = true;
                liquidPath.name = "액체";
                liquidPath.stroked = false;
                liquidPath.filled = true;
                liquidPath.fillColor = makeGray(liquidK);
                var surface = spanAt(g.interior, g.levelY);
                if (surface !== null && g.levelY < g.interiorTop - 0.01) {
                    strokeLine(previewGroup, [[surface[0], g.levelY], [surface[1], g.levelY]], black);
                }
            }
        }
        for (var i = 0; i < g.outlines.length; i++) {
            var outline = drawBezier(previewGroup, g.outlines[i].points, g.outlines[i].closed);
            outline.stroked = true;
            outline.strokeColor = black;
            outline.strokeWidth = LINE_WIDTH_PT;
            outline.filled = g.outlines[i].fill !== undefined;
            if (outline.filled) outline.fillColor = g.outlines[i].fill === "liquid" ? makeGray(liquidK) : makeGray(g.outlines[i].fill);
        }
        for (var f = 0; f < g.fills.length; f++) {
            // 온도계 액주: 선 없는 면
            var column = drawBezier(previewGroup, g.fills[f], true);
            column.stroked = false;
            column.filled = true;
            column.fillColor = makeGray(liquidOn ? liquidK : 0);
        }
        if (g.gas) {
            var gas = previewGroup.pathItems.add();
            gas.setEntirePath(g.gas);
            gas.closed = true;
            gas.name = "기체";
            gas.stroked = false;
            gas.filled = false;
        }
        if (ticksOn) {
            var ticks = tickLines(g, tickCount);
            for (var t = 0; t < ticks.length; t++) strokeLine(previewGroup, ticks[t], black);
        }
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
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
    // 기구 모양 (순수 계산)
    // -------------------------------------------------------
    // 돌려주는 것: outlines [{points(베지어 점), closed, fill?}], fills [베지어 점 목록], interior(안쪽 다각형),
    // interiorBottom/Top, levelY, tickSide("inside" | "outside"), tickX(y)→눈금 시작 x, gas(다각형 또는 null)
    function glassware(kindIndex, box, level) {
        var L = box.left;
        var T = box.top;
        var W = box.width;
        var H = box.height;
        var R = L + W;
        var B = T - H;
        var cx = L + W / 2;
        var result = {outlines: [], fills: [], gas: null, tickSide: "inside"};
        var wall;

        if (kindIndex === 0) {
            // 비커: 왼쪽 위 부리, 바닥 모서리만 둥글게
            var lip = W * 0.06;
            var r0 = Math.min(W * 0.08, H * 0.2);
            wall = [v(L - lip, T + lip * 0.3, 0), v(L, T - lip, lip * 0.8), v(L, B, r0), v(R, B, r0), v(R, T, 0)];
            result.outlines.push({points: roundPolyline(wall, false), closed: false});
            result.interior = flattenBezier(roundPolyline(wall.slice(1), false));
        } else if (kindIndex === 1) {
            // 삼각 플라스크: 목(너비 32%, 높이 28%) + 사다리꼴 몸통
            var neck = W * 0.32;
            var neckH = H * 0.28;
            var rim = W * 0.03;
            var r1 = W * 0.07;
            wall = [v(cx - neck / 2 - rim, T, 0), v(cx - neck / 2, T - rim, 0), v(cx - neck / 2, T - neckH, W * 0.04),
                v(L, B, r1), v(R, B, r1), v(cx + neck / 2, T - neckH, W * 0.04), v(cx + neck / 2, T - rim, 0),
                v(cx + neck / 2 + rim, T, 0)];
            result.outlines.push({points: roundPolyline(wall, false), closed: false});
            result.interior = flattenBezier(roundPolyline(wall.slice(1, wall.length - 1), false));
        } else if (kindIndex === 2) {
            // 시험관: 바닥 두 모서리 반지름이 반너비라 반원이 된다
            wall = [v(L, T, 0), v(L, B, W / 2), v(R, B, W / 2), v(R, T, 0)];
            result.outlines.push({points: roundPolyline(wall, false), closed: false});
            result.interior = flattenBezier(roundPolyline(wall, false));
        } else if (kindIndex === 3) {
            // 눈금실린더: 받침(너비 전체, 높이 5%) 위에 너비 50% 관, 왼쪽 위 부리
            var footH = H * 0.05;
            var tubeW = W * 0.5;
            var tl = cx - tubeW / 2;
            var tr = cx + tubeW / 2;
            var spout = tubeW * 0.12;
            wall = [v(tl - spout, T + spout * 0.3, 0), v(tl, T - spout, spout * 0.8), v(tl, B + footH, 0),
                v(tr, B + footH, 0), v(tr, T, 0)];
            result.outlines.push({points: roundPolyline(wall, false), closed: false});
            var foot = [v(L + W * 0.05, B + footH, 0), v(L, B, 0), v(R, B, 0), v(R - W * 0.05, B + footH, 0)];
            result.outlines.push({points: roundPolyline(foot, true), closed: true, fill: 0});
            result.interior = flattenBezier(roundPolyline(wall.slice(1), false));
        } else if (kindIndex === 4) {
            // 주사기: 끝이 막힌 노즐 + 통(너비 50%, 높이 70%) + 손잡이 날개 + 피스톤·막대·누름판
            var barrelW = W * 0.5;
            var bl = cx - barrelW / 2;
            var br = cx + barrelW / 2;
            var nozzleW = W * 0.12;
            var nozzleH = H * 0.08;
            var barrelBottom = B + nozzleH;
            var barrelTop = barrelBottom + H * 0.7;
            wall = [v(bl, barrelTop, 0), v(bl, barrelBottom, 0), v(cx - nozzleW / 2, barrelBottom, 0),
                v(cx - nozzleW / 2, B, 0), v(cx + nozzleW / 2, B, 0), v(cx + nozzleW / 2, barrelBottom, 0),
                v(br, barrelBottom, 0), v(br, barrelTop, 0)];
            result.outlines.push({points: roundPolyline(wall, false), closed: false});
            var flangeW = W * 0.22;
            var flangeH = H * 0.015;
            result.outlines.push({points: roundPolyline(rectVertices(bl - flangeW, barrelTop + flangeH, flangeW, flangeH), true), closed: true, fill: 0});
            result.outlines.push({points: roundPolyline(rectVertices(br, barrelTop + flangeH, flangeW, flangeH), true), closed: true, fill: 0});
            // 피스톤 아래면: 통 바닥 위 5% ~ 통 꼭대기 아래 머리 두께만큼
            var headH = H * 0.05;
            var lowest = barrelBottom + H * 0.02;
            var highest = barrelTop - headH;
            var pistonBottom = lowest + (highest - lowest) * level;
            var rodW = W * 0.12;
            var plateY = T;
            var plateH = H * 0.025;
            result.outlines.push({points: roundPolyline(rectVertices(cx - rodW / 2, plateY - plateH, rodW, plateY - plateH - pistonBottom - headH), true), closed: true, fill: 0});
            result.outlines.push({points: roundPolyline(rectVertices(bl, pistonBottom + headH, barrelW, headH), true), closed: true, fill: 30});
            result.outlines.push({points: roundPolyline(rectVertices(cx - W * 0.35, plateY, W * 0.7, plateH), true), closed: true, fill: 0});
            result.gas = [[bl, barrelBottom], [br, barrelBottom], [br, pistonBottom], [bl, pistonBottom]];
            result.interior = [[bl, barrelBottom], [br, barrelBottom], [br, barrelTop], [bl, barrelTop]];
        } else {
            // 온도계: 위가 둥근 관 + 아래 구부(지름 관의 1.9배). 액주는 구부에서 높이(%)까지
            var tubeWidth = W * 0.55;
            var bulbR = Math.min(W / 2, tubeWidth * 0.95);
            var bulbCy = B + bulbR;
            var half = tubeWidth / 2;
            var joinY = bulbCy + Math.sqrt(bulbR * bulbR - half * half);
            var alpha = Math.asin(half / bulbR);     // 연결점이 세로축에서 벌어진 각
            var tube = roundPolyline([v(cx + half, joinY, 0), v(cx + half, T, half), v(cx - half, T, half), v(cx - half, joinY, 0)], false);
            // 왼쪽 연결점에서 구부 둘레를 돌아 오른쪽 연결점으로 (반시계, 아래를 지난다)
            var arc = arcPoints(cx, bulbCy, bulbR, Math.PI / 2 + alpha, Math.PI * 2.5 - alpha);
            result.outlines.push({points: closeLoop(joinBezier(tube, arc)), closed: true, fill: 0});
            var colW = tubeWidth * 0.36;
            var bottomY = joinY;
            var topY = T - half - tubeWidth * 0.1;
            var colTop = bottomY + (topY - bottomY) * level;
            result.fills.push(arcPoints(cx, bulbCy, bulbR * 0.72, 0, Math.PI * 2));
            result.fills.push(roundPolyline(rectVertices(cx - colW / 2, colTop, colW, colTop - (bulbCy)), true));
            result.interior = [[cx - half, joinY], [cx + half, joinY], [cx + half, T - half], [cx - half, T - half]];
            result.tickSide = "outside";
            result.tickX = cx + half;
        }

        var ys = [];
        for (var i = 0; i < result.interior.length; i++) ys.push(result.interior[i][1]);
        result.interiorBottom = Math.min.apply(null, ys);
        result.interiorTop = Math.max.apply(null, ys);
        result.levelY = result.interiorBottom + (result.interiorTop - result.interiorBottom) * level;
        return result;
    }

    function v(x, y, r) {
        return {x: x, y: y, r: r};
    }

    // 왼쪽 위 (x, top)에서 너비 w·높이 h인 사각형 꼭짓점 (모서리 없음)
    function rectVertices(x, top, w, h) {
        return [v(x, top, 0), v(x, top - h, 0), v(x + w, top - h, 0), v(x + w, top, 0)];
    }

    // 꼭짓점마다 반지름 r만큼 원호로 둥글린 꺾은선 → 베지어 점 [{anchor, left, right}].
    // r은 꼭짓점에서 원호가 시작하는 거리(접선 길이)로, 이웃 변 길이의 절반을 넘지 않게 줄인다
    function roundPolyline(vertices, closed) {
        var points = [];
        var n = vertices.length;
        for (var i = 0; i < n; i++) {
            var cur = vertices[i];
            var hasPrev = closed || i > 0;
            var hasNext = closed || i < n - 1;
            if (cur.r <= 0 || !hasPrev || !hasNext) {
                points.push(bezierCorner(cur.x, cur.y));
                continue;
            }
            var prev = vertices[(i - 1 + n) % n];
            var next = vertices[(i + 1) % n];
            var d1 = unit(prev.x - cur.x, prev.y - cur.y);
            var d2 = unit(next.x - cur.x, next.y - cur.y);
            var t = Math.min(cur.r, d1.length / 2, d2.length / 2);
            // 꺾이는 각 φ: 접선 길이 t인 원호의 반지름 t / tan(φ/2), 손잡이 길이 4/3·tan(φ/4)·반지름
            var cosInner = d1.x * d2.x + d1.y * d2.y;
            var turn = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosInner)));
            if (turn < 1e-6) {
                points.push(bezierCorner(cur.x, cur.y));
                continue;
            }
            var radius = t / Math.tan(turn / 2);
            var handle = 4 / 3 * Math.tan(turn / 4) * radius;
            var a = [cur.x + d1.x * t, cur.y + d1.y * t];
            var b = [cur.x + d2.x * t, cur.y + d2.y * t];
            points.push({anchor: a, left: a, right: [a[0] - d1.x * handle, a[1] - d1.y * handle]});
            points.push({anchor: b, left: [b[0] - d2.x * handle, b[1] - d2.y * handle], right: b});
        }
        return points;
    }

    function bezierCorner(x, y) {
        return {anchor: [x, y], left: [x, y], right: [x, y]};
    }

    function unit(x, y) {
        var length = Math.sqrt(x * x + y * y);
        return length > 0 ? {x: x / length, y: y / length, length: length} : {x: 0, y: 0, length: 0};
    }

    // 중심 (cx, cy), 반지름 r인 원호를 from → to(라디안, 반시계)로 90° 이하 조각마다 베지어 하나
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

    // 앞 목록의 끝점과 뒤 목록의 첫 점이 같으면 하나로 합친다 (앞 점의 왼쪽 손잡이, 뒤 점의 오른쪽 손잡이)
    function joinBezier(first, second) {
        var a = first[first.length - 1];
        var b = second[0];
        var result = first.slice(0, first.length - 1);
        if (Math.abs(a.anchor[0] - b.anchor[0]) < 1e-6 && Math.abs(a.anchor[1] - b.anchor[1]) < 1e-6) {
            result.push({anchor: a.anchor, left: a.left, right: b.right});
            return result.concat(second.slice(1));
        }
        return first.concat(second);
    }

    // 마지막 점이 첫 점과 같으면 하나로 합친다 (마지막 점의 왼쪽 손잡이를 첫 점에)
    function closeLoop(points) {
        var first = points[0];
        var last = points[points.length - 1];
        if (Math.abs(first.anchor[0] - last.anchor[0]) > 1e-6 || Math.abs(first.anchor[1] - last.anchor[1]) > 1e-6) return points;
        var result = points.slice(1, points.length - 1);
        result.unshift({anchor: first.anchor, left: last.left, right: first.right});
        return result;
    }

    // 베지어 점 목록을 다각형으로 (조각마다 FLATTEN_STEPS등분). 다각형은 끝에서 처음으로 곧게 닫힌다고 본다
    function flattenBezier(points) {
        var poly = [points[0].anchor];
        for (var i = 1; i < points.length; i++) {
            var p0 = points[i - 1].anchor, p1 = points[i - 1].right, p2 = points[i].left, p3 = points[i].anchor;
            for (var s = 1; s <= FLATTEN_STEPS; s++) {
                var t = s / FLATTEN_STEPS;
                var u = 1 - t;
                poly.push([
                    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
                ]);
            }
        }
        return poly;
    }

    // 다각형에서 y ≤ level인 부분 (서덜랜드-호지먼, 반평면 하나)
    function clipBelow(poly, level) {
        var out = [];
        for (var i = 0; i < poly.length; i++) {
            var a = poly[i];
            var b = poly[(i + 1) % poly.length];
            var aIn = a[1] <= level;
            var bIn = b[1] <= level;
            if (aIn) out.push(a);
            if (aIn !== bIn) {
                var t = (level - a[1]) / (b[1] - a[1]);
                out.push([a[0] + (b[0] - a[0]) * t, level]);
            }
        }
        return out;
    }

    // 높이 y에서 다각형 안쪽의 왼쪽·오른쪽 끝 x [왼, 오]. 없으면 null
    function spanAt(poly, y) {
        var xs = [];
        for (var i = 0; i < poly.length; i++) {
            var a = poly[i];
            var b = poly[(i + 1) % poly.length];
            if ((a[1] <= y && b[1] >= y) || (a[1] >= y && b[1] <= y)) {
                if (Math.abs(b[1] - a[1]) < 1e-9) {
                    xs.push(a[0], b[0]);
                } else {
                    xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
                }
            }
        }
        if (xs.length < 2) return null;
        return [Math.min.apply(null, xs), Math.max.apply(null, xs)];
    }

    // 안쪽 높이의 10%~90%를 칸 수로 나눈 눈금. 5칸마다 긴 눈금.
    // inside: 그 높이의 안쪽 왼쪽 벽에서 오른쪽으로, outside: tickX에서 오른쪽으로
    function tickLines(g, count) {
        var lines = [];
        var bottom = g.interiorBottom + (g.interiorTop - g.interiorBottom) * 0.1;
        var top = g.interiorBottom + (g.interiorTop - g.interiorBottom) * 0.9;
        var span = spanAt(g.interior, (bottom + top) / 2);
        var width = span === null ? 0 : span[1] - span[0];
        var shortLength = Math.max(width * 0.12, 1);
        for (var i = 0; i <= count; i++) {
            var y = bottom + (top - bottom) * i / count;
            var length = i % 5 === 0 ? shortLength * 2 : shortLength;
            var x;
            if (g.tickSide === "outside") {
                x = g.tickX;
            } else {
                var at = spanAt(g.interior, y);
                if (at === null) continue;
                x = at[0];
            }
            lines.push([[x, y], [x + length, y]]);
        }
        return lines;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawBezier(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = PointType.CORNER;
        }
        path.closed = closed;
        return path;
    }

    function strokeLine(container, points, color) {
        var line = container.pathItems.add();
        line.setEntirePath(points);
        line.filled = false;
        line.stroked = true;
        line.strokeColor = color;
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

    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            if (point.leftDirection[0] !== point.anchor[0] || point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] || point.rightDirection[1] !== point.anchor[1]) return null;
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
        var text = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
        text.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {label: text, input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals};
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
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
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", kind, liquidOn ? "1" : "0", levelPct, liquidK, ticksOn ? "1" : "0", tickCount,
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 10) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        liquidOn = p[2] === "1";
        levelPct = restoreNumber(p[3], levelPct, LEVEL_RANGE, 1);
        liquidK = restoreNumber(p[4], liquidK, K_RANGE, 10);
        ticksOn = p[5] === "1";
        tickCount = restoreNumber(p[6], tickCount, TICK_RANGE, 1);
        offsetXmm = restoreNumber(p[7], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[8], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[9] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
