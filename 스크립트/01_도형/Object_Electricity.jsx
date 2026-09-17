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

// 전기: 회로 기호 삽입·코일 감긴 도선·에너지 흐름 화살표를 한 창의 탭으로 묶었다.
// 탭마다 필요한 선택이 다르다 (회로 기호: 앵커 2개 직선, 코일 도선: 사각형, 에너지 흐름: 앵커 4개 사각형).
// 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "Electricity/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeCircuitSymbolEngine(), makeSolenoidEngine(), makeEnergyFlowEngine()];

    var win = new Window("dialog", "전기");
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

    // ==== 회로 기호 ====
    function makeCircuitSymbolEngine() {
        var api = {label: "회로 기호", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            var sel = doc.selection;
            if (!sel || sel.typename === "TextRange" || sel.length !== 1 ||
                sel[0].typename !== "PathItem" || sel[0].pathPoints.length !== 2) return "직선(앵커 2개짜리 패스) 하나를 선택하고 실행해주세요.";
            var line = sel[0];

            var MM = 2.834645669;   // 1mm = 2.834645669pt

            // ===== 크기 설정 — 필요하면 여기 숫자만 조정 =====
            var CFG = {
                fontName: "GSMediumB1",
                textSize: 8,

                resistorHalf: 2 * MM,       // 저항 전체 폭 4mm의 절반
                resistorAmp: 0.75 * MM,     // 진폭 (전체 높이 1.5mm의 절반)
                resistorStroke: 0.5,

                batteryLongHalf: 1.5 * MM,  // 긴 극판 높이 3mm의 절반
                batteryShortHalf: 0.75 * MM,// 짧은 극판 높이 1.5mm의 절반
                batterySpacing: 0.6 * MM,   // 두 극판 사이 간격 0.6mm
                batteryLongStroke: 0.5,
                batteryShortStroke: 1.0,

                acRadius: 2 * MM,           // 원 지름 4mm의 절반
                acCircleStroke: 0.3,
                acWaveHalf: 1.6 * MM,       // 물결 폭의 절반 (SVG 모양을 이 폭에 맞춰 축소)
                acWaveStroke: 0.5,

                switchHalf: 1.75 * MM,  // 접점 사이 거리 3.5mm의 절반
                switchContactR: 1.1,
                switchContactStroke: 0.3,
                switchLeverStroke: 0.5,
                switchOpenAngle: 25,    // 열린 스위치 레버 각도(도)

                coilBumps: 4,           // 위쪽 반원 개수
                coilRadius: 0.75 * MM,  // 코일 반지름 (전체 높이 1.5mm = 2r)
                coilAdvance: 2.5 * MM / (7 * Math.PI), // 전진량 (전체 폭 4mm = 7aπ + 2r*2)
                coilStroke: 0.3,

                capHalfGap: 0.35 * MM,  // 극판 사이 간격 0.7mm의 절반
                capPlateHalf: 1.5 * MM, // 극판 높이 3mm의 절반
                capStroke: 0.5,

                meterRadius: 2 * MM,    // 원 지름 4mm의 절반
                meterStroke: 0.3,
                meterUnderlineStroke: 0.3,
                meterUnderlineGap: 0.4 * MM  // 글자 하단과 밑줄 사이 간격
            };

            var SYMBOLS = [
                { key: "resistor",     label: "저항" },
                { key: "battery",      label: "직렬 전지" },
                { key: "ac",           label: "교류 전원" },
                { key: "switchOpen",   label: "열린 스위치" },
                { key: "switchClosed", label: "닫힌 스위치" },
                { key: "inductor",     label: "인덕터(코일)" },
                { key: "capacitor",    label: "축전기" },
                { key: "ammeterDC",    label: "전류계(직류) A" },
                { key: "voltmeterDC",  label: "전압계(직류) V" },
                { key: "ammeterAC",    label: "전류계(교류) A" },
                { key: "voltmeterAC",  label: "전압계(교류) V" }
            ];

            // ===== 다이얼로그 =====
            var PREF_KEY = "ObjectCircuitSymbol/settings";
            var queue = restoreQueue();   // 클릭한 기호들 {key, label}
            var dlg = page;

            var pnl = dlg.add("panel", undefined, "기호 (클릭한 순서대로 선 방향에 배치)");
            pnl.orientation = "row";
            pnl.alignChildren = "top";
            pnl.margins = 15;
            pnl.spacing = 8;

            // 버튼 2열 배치
            var col1 = pnl.add("group"); col1.orientation = "column"; col1.alignChildren = "fill";
            var col2 = pnl.add("group"); col2.orientation = "column"; col2.alignChildren = "fill";
            for (var i = 0; i < SYMBOLS.length; i++) {
                var col = (i % 2 === 0) ? col1 : col2;
                var b = col.add("button", undefined, SYMBOLS[i].label);
                b.preferredSize.width = 150;
                b.onClick = makeAddHandler(SYMBOLS[i].key, SYMBOLS[i].label);
            }

            var seqPnl = dlg.add("panel", undefined, "삽입 순서 (항목 선택 후 편집)");
            seqPnl.orientation = "row";
            seqPnl.alignChildren = "fill";
            seqPnl.margins = 12;

            var seqList = seqPnl.add("listbox", undefined, [], { multiselect: false });
            seqList.preferredSize = [250, 96];

            var editCol = seqPnl.add("group");
            editCol.orientation = "column";
            editCol.alignChildren = "fill";
            var btnUp = editCol.add("button", undefined, "▲ 위로");
            var btnDown = editCol.add("button", undefined, "▼ 아래로");
            var btnDel = editCol.add("button", undefined, "삭제");
            var btnClear = editCol.add("button", undefined, "전체 초기화");


            // 기호 키 목록만 저장하고, 라벨은 카탈로그에서 다시 찾는다
            function saveQueue() {
                var keys = [];
                for (var i = 0; i < queue.length; i++) keys.push(queue[i].key);
                try {
                    app.preferences.setStringPreference(PREF_KEY, ["v1", keys.join(",")].join("|"));
                } catch (e) {}
            }

            function restoreQueue() {
                var restored = [];
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return restored; }
                if (!raw) return restored;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length < 2) return restored;
                var keys = p[1].split(",");
                for (var i = 0; i < keys.length; i++) {
                    for (var j = 0; j < SYMBOLS.length; j++) {
                        if (SYMBOLS[j].key === keys[i]) {
                            restored.push({ key: SYMBOLS[j].key, label: SYMBOLS[j].label });
                            break;
                        }
                    }
                }
                return restored;
            }

            function makeAddHandler(key, label) {
                return function () {
                    queue.push({ key: key, label: label });
                    refreshSeq();
                    seqList.selection = queue.length - 1;
                };
            }
            function selIndex() {
                return seqList.selection ? seqList.selection.index : -1;
            }
            function refreshSeq() {
                var s = selIndex();
                seqList.removeAll();
                for (var k = 0; k < queue.length; k++) {
                    seqList.add("item", (k + 1) + ". " + queue[k].label);
                }
                if (s >= 0 && s < queue.length) seqList.selection = s;
            }
            btnDel.onClick = function () {
                var s = selIndex();
                if (s < 0) return;
                queue.splice(s, 1);
                refreshSeq();
                if (queue.length) seqList.selection = Math.min(s, queue.length - 1);
            };
            btnUp.onClick = function () {
                var s = selIndex();
                if (s <= 0) return;
                var t = queue[s - 1]; queue[s - 1] = queue[s]; queue[s] = t;
                refreshSeq();
                seqList.selection = s - 1;
            };
            btnDown.onClick = function () {
                var s = selIndex();
                if (s < 0 || s >= queue.length - 1) return;
                var t = queue[s + 1]; queue[s + 1] = queue[s]; queue[s] = t;
                refreshSeq();
                seqList.selection = s + 1;
            };
            btnClear.onClick = function () { queue = []; refreshSeq(); };

            refreshSeq();

            // 이 탭은 미리보기가 없다. 확인을 누르면 기호를 그린다 (그리기 코드와 도우미가 이 함수 안에 있다)
            api.commit = function() {
            if (queue.length === 0) { alert("기호를 하나 이상 선택해주세요."); return false; }
            saveQueue();

            // ===== 좌표계: 라인 중심 기준 (u=라인 방향, v=수직 방향) =====
            var p1 = [line.pathPoints[0].anchor[0], line.pathPoints[0].anchor[1]];
            var p2 = [line.pathPoints[1].anchor[0], line.pathPoints[1].anchor[1]];
            var cx = (p1[0] + p2[0]) / 2;
            var cy = (p1[1] + p2[1]) / 2;
            var dx = p2[0] - p1[0];
            var dy = p2[1] - p1[1];
            var lineLen = Math.sqrt(dx * dx + dy * dy);
            if (lineLen < 1) {
                alert("라인 길이가 너무 짧습니다.");
                return;
            }
            var ca = dx / lineLen;
            var sa = dy / lineLen;

            // 현재 그리는 기호의 중심(절대 좌표). 기호마다 갱신됨. pt()는 이 중심 기준.
            var mx = cx, my = cy;

            function pt(u, v) {
                return [mx + u * ca - v * sa, my + u * sa + v * ca];
            }

            // ===== 각 기호를 선 방향 따라 균등 분배 (N개 → 1/(N+1), 2/(N+1) ... 지점) =====
            var N = queue.length;
            var spacing = lineLen / (N + 1);        // 분배 지점 간격
            var centers = [];                       // 각 기호 중심의 u좌표(라인 중심 기준)
            for (var i = 0; i < N; i++) {
                centers[i] = -lineLen / 2 + spacing * (i + 1);
                queue[i].hg = halfGapFor(queue[i].key);
            }

            // 공간 검증: 도선 경계가 순증가해야 함(겹치면 공간 부족)
            var bounds = [-lineLen / 2];
            for (var i = 0; i < N; i++) {
                bounds.push(centers[i] - queue[i].hg);
                bounds.push(centers[i] + queue[i].hg);
            }
            bounds.push(lineLen / 2);
            for (var i = 1; i < bounds.length; i++) {
                if (bounds[i] < bounds[i - 1] - 0.01) {
                    alert("라인이 너무 짧아 기호들이 겹칩니다.\n더 긴 라인을 선택하거나 기호 수를 줄여주세요.");
                    return;
                }
            }

            // ===== 도선 스타일 저장 후, 기호 사이를 세그먼트로 재구성 =====
            var wLayer = line.layer;
            var wStroked = line.stroked;
            var wColor = wStroked ? line.strokeColor : null;
            var wWidth = wStroked ? line.strokeWidth : 0;

            addWireSegment(-lineLen / 2, centers[0] - queue[0].hg);
            for (var i = 1; i < N; i++) {
                addWireSegment(centers[i - 1] + queue[i - 1].hg, centers[i] - queue[i].hg);
            }
            addWireSegment(centers[N - 1] + queue[N - 1].hg, lineLen / 2);

            line.remove();

            // ===== 기호 그리기 =====
            var group = wLayer.groupItems.add();
            group.name = "Circuit Symbols";

            for (var i = 0; i < N; i++) {
                mx = cx + centers[i] * ca;
                my = cy + centers[i] * sa;
                drawSymbol(queue[i].key);
            }

            doc.selection = null;
            group.selected = true;
            app.redraw();
            return true;

            // ===== 배치 헬퍼 =====

            function halfGapFor(key) {
                switch (key) {
                    case "resistor":     return CFG.resistorHalf;
                    case "battery":      return CFG.batterySpacing / 2;
                    case "ac":           return CFG.acRadius;
                    case "switchOpen":
                    case "switchClosed": return CFG.switchHalf + CFG.switchContactR;
                    case "inductor":     return coilHalfWidth();
                    case "capacitor":    return CFG.capHalfGap;
                    case "ammeterDC":
                    case "voltmeterDC":
                    case "ammeterAC":
                    case "voltmeterAC":  return CFG.meterRadius;
                }
                return 0;
            }

            function lineAt(u) { return [cx + u * ca, cy + u * sa]; }

            function addWireSegment(uStart, uEnd) {
                if (uEnd - uStart < 0.01) return;   // 기호가 선 끝에 붙는 경우 빈 세그먼트 생략
                var seg = wLayer.pathItems.add();
                seg.setEntirePath([lineAt(uStart), lineAt(uEnd)]);
                seg.closed = false;
                seg.filled = false;
                seg.stroked = wStroked;
                if (wStroked) { seg.strokeColor = wColor; seg.strokeWidth = wWidth; }
            }

            function drawSymbol(key) {
                switch (key) {
                    case "resistor":     drawResistor(); break;
                    case "battery":      drawBattery(); break;
                    case "ac":           drawAC(); break;
                    case "switchOpen":   drawSwitch(true); break;
                    case "switchClosed": drawSwitch(false); break;
                    case "inductor":     drawInductor(); break;
                    case "capacitor":    drawCapacitor(); break;
                    case "ammeterDC":    drawMeter("A", false); break;
                    case "voltmeterDC":  drawMeter("V", false); break;
                    case "ammeterAC":    drawMeter("A", true); break;
                    case "voltmeterAC":  drawMeter("V", true); break;
                }
            }

            // ===== 기호 함수들 =====

            function drawResistor() {
                var w = CFG.resistorHalf;
                var a = CFG.resistorAmp;
                var seg = w * 2 / 12;
                var anchors = [pt(-w, 0)];
                var sign = 1;
                for (var i = 1; i <= 11; i += 2) {
                    anchors.push(pt(-w + seg * i, a * sign));
                    sign = -sign;
                }
                anchors.push(pt(w, 0));

                // 직선 지그재그 + 모퉁이만 둥근 연결(strokeJoin)
                var path = addLine(anchors, CFG.resistorStroke);
                try { path.strokeJoin = StrokeJoin.ROUNDENDJOIN; } catch (e) {}
            }

            function drawBattery() {
                var half = CFG.batterySpacing / 2;
                // 긴 극판(+극) 하나 + 짧은 극판(-극) 하나 = 전지 1개
                addLine([pt(-half, -CFG.batteryLongHalf), pt(-half, CFG.batteryLongHalf)], CFG.batteryLongStroke);
                addLine([pt(half, -CFG.batteryShortHalf), pt(half, CFG.batteryShortHalf)], CFG.batteryShortStroke);
            }

            function drawAC() {
                addCircle(mx, my, CFG.acRadius, CFG.acCircleStroke, false);

                // 물결: 사용자 제공 SVG(자산 2.svg) 좌표를 그대로 재현.
                // SVG 좌표계(y 아래로 증가)를 중심 정렬 후 뒤집고, acWaveHalf 폭에 맞춰 균일 축소.
                var SVG_CX = 5.205, SVG_CY = 2.69, SVG_HALF = 4.965; // SVG 상의 중심/반폭
                var s = CFG.acWaveHalf / SVG_HALF;
                function w(X, Y) { return pt((X - SVG_CX) * s, -(Y - SVG_CY) * s); }

                var anchors = [
                    w(0.24, 2.69),
                    w(2.72, 5.13),
                    w(5.20, 2.69),
                    w(7.69, 0.25),
                    w(10.17, 2.69)
                ];
                var wave = group.pathItems.add();
                wave.setEntirePath(anchors);
                wave.closed = false;

                var pp = wave.pathPoints;
                pp[0].rightDirection = w(0.99, 4.80); pp[0].pointType = PointType.CORNER;
                pp[1].leftDirection  = w(2.13, 5.13); pp[1].rightDirection = w(3.39, 5.13); pp[1].pointType = PointType.SMOOTH;
                pp[2].leftDirection  = w(4.46, 4.80); pp[2].rightDirection = w(5.95, 0.58); pp[2].pointType = PointType.SMOOTH;
                pp[3].leftDirection  = w(7.08, 0.25); pp[3].rightDirection = w(8.41, 0.25); pp[3].pointType = PointType.SMOOTH;
                pp[4].leftDirection  = w(9.43, 0.58); pp[4].pointType = PointType.CORNER;
                styleStroke(wave, CFG.acWaveStroke);
            }

            function drawSwitch(isOpen) {
                var h = CFG.switchHalf;
                var leverEnd;
                if (isOpen) {
                    var rad = CFG.switchOpenAngle * Math.PI / 180;
                    var leverLen = h * 2 + 1;
                    leverEnd = pt(-h + leverLen * Math.cos(rad), leverLen * Math.sin(rad));
                } else {
                    leverEnd = pt(h, 0);
                }
                addLine([pt(-h, 0), leverEnd], CFG.switchLeverStroke);
                // 접점 원 (흰색 채움으로 레버 시작점을 가림)
                var c1 = pt(-h, 0);
                var c2 = pt(h, 0);
                addCircle(c1[0], c1[1], CFG.switchContactR, CFG.switchContactStroke, true);
                addCircle(c2[0], c2[1], CFG.switchContactR, CFG.switchContactStroke, true);
            }

            function coilHalfWidth() {
                var a = CFG.coilAdvance;
                var b = CFG.coilRadius;
                var spanT = Math.PI * (2 * (CFG.coilBumps - 1) + 1); // 시작 -π/2 ~ 끝
                return (a * spanT + 2 * b) / 2;
            }

            function drawInductor() {
                // 프롤레이트 사이클로이드: 위쪽 큰 반원 + 아래쪽 작은 고리
                var a = CFG.coilAdvance;
                var b = CFG.coilRadius;
                var t0 = -Math.PI / 2;
                var t1 = Math.PI * 2 * (CFG.coilBumps - 1) + Math.PI / 2;
                var segments = CFG.coilBumps * 8;
                var delta = (t1 - t0) / segments;
                var uMid = a * (t0 + t1) / 2;
                var handleFactor = 4 / 3 * Math.tan(delta / 4);

                var anchors = [];
                var derivs = [];
                for (var i = 0; i <= segments; i++) {
                    var t = t0 + delta * i;
                    anchors.push(pt(a * t + b * Math.sin(t) - uMid, b * Math.cos(t)));
                    // 도함수를 u-v계에서 계산 후 회전 변환
                    var du = a + b * Math.cos(t);
                    var dv = -b * Math.sin(t);
                    derivs.push([du * ca - dv * sa, du * sa + dv * ca]);
                }

                var path = group.pathItems.add();
                path.setEntirePath(anchors);
                path.closed = false;
                for (var j = 0; j < anchors.length; j++) {
                    var pp = path.pathPoints[j];
                    var an = anchors[j];
                    var d = derivs[j];
                    if (j > 0) {
                        pp.leftDirection = [an[0] - d[0] * handleFactor, an[1] - d[1] * handleFactor];
                    }
                    if (j < anchors.length - 1) {
                        pp.rightDirection = [an[0] + d[0] * handleFactor, an[1] + d[1] * handleFactor];
                    }
                    pp.pointType = (j === 0 || j === anchors.length - 1) ? PointType.CORNER : PointType.SMOOTH;
                }
                styleStroke(path, CFG.coilStroke);
            }

            function drawCapacitor() {
                var g = CFG.capHalfGap;
                var h = CFG.capPlateHalf;
                addLine([pt(-g, -h), pt(-g, h)], CFG.capStroke);
                addLine([pt(g, -h), pt(g, h)], CFG.capStroke);
            }

            function drawMeter(letter, isAC) {
                addCircle(mx, my, CFG.meterRadius, CFG.meterStroke, false);
                var tf = group.textFrames.add();
                tf.contents = letter;
                var attrs = tf.textRange.characterAttributes;
                attrs.size = CFG.textSize;
                try {
                    attrs.textFont = app.textFonts.getByName(CFG.fontName);
                } catch (e) {
                    alert("폰트를 찾지 못해 기본 폰트로 넣습니다: " + CFG.fontName);
                }
                try {
                    if (wStroked) tf.textRange.characterAttributes.fillColor = wColor;
                } catch (e2) {}

                // 실제 보이는 글자(잉크) 경계를 아웃라인 복제본으로 측정
                var ob;
                var dup = tf.duplicate();
                var outline = dup.createOutline();
                ob = outline.geometricBounds;   // [left, top, right, bottom] — 폰트 여백 없는 실제 글자 경계
                outline.remove();

                // 잉크 경계 중심을 원 중심에 맞춤 (밑줄 공간 확보를 위해 0.3mm 위로 보정)
                var dx = mx - (ob[0] + ob[2]) / 2;
                var dy = my - (ob[1] + ob[3]) / 2 + 0.3 * MM;
                tf.translate(dx, dy);

                // 밑줄: 이동 후 잉크 하단에서 0.4mm 아래 (회전 없이 수평)
                var underlineY = (ob[3] + dy) - CFG.meterUnderlineGap;
                if (isAC) {
                    drawMeterWave(mx, underlineY);   // 교류: 물결(~)
                } else {
                    // 직류: 직선, 글자 폭만큼
                    var left = ob[0] + dx;
                    var right = ob[2] + dx;
                    var underline = group.pathItems.add();
                    underline.setEntirePath([[left, underlineY], [right, underlineY]]);
                    underline.closed = false;
                    styleStroke(underline, CFG.meterUnderlineStroke);
                }
            }

            // 교류 계기 밑줄 물결: 자산 3/4.svg 좌표(기준선 y=9.24, 중심 x=5.82) 그대로 사용
            function drawMeterWave(centerX, baseY) {
                function W(X, Y) { return [centerX + (X - 5.82), baseY - (Y - 9.24)]; }
                var wave = group.pathItems.add();
                wave.setEntirePath([W(2.64, 9.24), W(5.82, 9.24), W(9.00, 9.24)]);
                wave.closed = false;
                var pp = wave.pathPoints;
                pp[0].rightDirection = W(3.03, 8.56); pp[0].pointType = PointType.CORNER;
                pp[1].leftDirection  = W(4.66, 8.23); pp[1].rightDirection = W(6.98, 10.25); pp[1].pointType = PointType.SMOOTH;
                pp[2].leftDirection  = W(8.63, 9.88); pp[2].pointType = PointType.CORNER;
                styleStroke(wave, CFG.meterUnderlineStroke);
            }

            // ===== 공통 헬퍼 =====

            function addLine(points, strokeW) {
                var path = group.pathItems.add();
                path.setEntirePath(points);
                path.closed = false;
                styleStroke(path, strokeW);
                return path;
            }

            function addCircle(centerX, centerY, radius, strokeW, whiteFill) {
                var circle = group.pathItems.ellipse(
                    centerY + radius, centerX - radius, radius * 2, radius * 2
                );
                styleStroke(circle, strokeW);
                if (whiteFill) {
                    circle.filled = true;
                    circle.fillColor = makeWhite();
                }
                return circle;
            }

            function styleStroke(path, strokeW) {
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = strokeW;
                if (wStroked) {
                    try { path.strokeColor = wColor; } catch (e) {}
                }
                try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e2) {}
                try { path.strokeDashes = []; } catch (e3) {}
            }

            function makeWhite() {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0; cmyk.magenta = 0; cmyk.yellow = 0; cmyk.black = 0;
                    return cmyk;
                }
                var rgb = new RGBColor();
                rgb.red = 255; rgb.green = 255; rgb.blue = 255;
                return rgb;
            }
            };
            return null;
        }
        return api;
    }

    // ==== 코일 도선 ====
    function makeSolenoidEngine() {
        var api = {label: "코일 도선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectSolenoid/settings";
            var MM = 2.834645669;
            var KAPPA = 0.5522847;

            var doc = app.activeDocument;
            var sel = doc.selection;
            if (!sel || sel.length !== 1 || sel[0].typename !== "PathItem") return "도선이 될 사각형 하나를 선택해주세요. 사각형의 가로가 도선 길이, 세로가 도선 굵기가 됩니다.";

            var rect = sel[0];
            var bounds = rect.geometricBounds; // [left, top, right, bottom]
            var leftX = bounds[0];
            var rightX = bounds[2];
            var centerY = (bounds[1] + bounds[3]) / 2;
            var rodRadius = (bounds[1] - bounds[3]) / 2;
            var rodLength = rightX - leftX;

            if (rodLength <= 0 || rodRadius <= 0) return "가로와 세로 크기가 있는 사각형을 선택해주세요.";

            var coilWeight = 2;
            var turnCount = 8;
            var coilGapMm = 1;      // 도선 표면과 코일 사이 거리
            var viewAngleDeg = 20;  // 시점 각도: +면 왼쪽 끝면, -면 오른쪽 끝면이 보임
            var POSITION_LIMIT_MM = 100;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;
            var rectWasHidden = rect.hidden;

            // 그라데이션은 문서당 한 번만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
            var _rodGradient = null;
            var _rodGradientReady = false;

            applySavedSettings();

            var LABEL_WIDTH = 66;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

            var optionPanel = addPanel(dlg, "코일");
            var weightField = addNumberField(optionPanel, "코일 굵기", "pt", coilWeight, 0.1, 0.1, 5);
            var turnField = addNumberField(optionPanel, "감긴 횟수", "회", turnCount, 1, 1, 20);
            var gapField = addNumberField(optionPanel, "코일 간격", "mm", coilGapMm, 0.1, 0, 3);

            var rodPanel = addPanel(dlg, "금속 막대");
            var viewField = addNumberField(rodPanel, "시점 각도", "°", viewAngleDeg, 1, -60, 60);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);

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
                if (!readFields(true)) return false;
                clearPreview();
                readFields(false);
                var finalGroup = drawSolenoid();
                moveItem(finalGroup, offsetXmm * MM, offsetYmm * MM);
                finalGroup.name = "Solenoid";
                try { finalGroup.move(rect, ElementPlacement.PLACEBEFORE); } catch (e) {}
                rect.remove();
                saveSettings();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            function drawSolenoid() {
                var group = doc.activeLayer.groupItems.add();
                var black = makeGray(100);

                // 코일 세로 반지름 = 도선 반지름 + 간격 옵션
                var b = rodRadius + coilGapMm * MM;
                var capRx = getCapRx();
                var margin = capRx + 2 * MM;
                var usable = rodLength - 2 * margin;

                if (usable <= 0) {
                    // 코일을 감을 자리가 없으면 도선만 그린다
                    drawRod(group, black, capRx);
                    return group;
                }


                // 루프 좌우 폭은 피치(코일 간격)에 비례시켜 연결된 느낌을 만든다.
                // a가 피치에 걸려 있으므로 한 번 추정 후 다시 계산해 수렴시킨다.
                var a = clampValue((usable / turnCount) * 0.35, b * 0.10, b * 0.95);
                var pitch = (usable - 2 * a) / turnCount;
                a = clampValue(pitch * 0.35, b * 0.10, b * 0.95);
                pitch = (usable - 2 * a) / turnCount;

                if (pitch <= 0) {
                    drawRod(group, black, capRx);
                    return group;
                }

                var startX = leftX + margin + a;

                // 나선: x = startX + pitch·θ/2π + a·sinθ, y = centerY + b·cosθ
                function helixPoint(t) {
                    // -cos 으로 시작(θ=0)과 끝이 아래쪽에 오게 한다
                    return [startX + pitch * t / (2 * Math.PI) + a * Math.sin(t), centerY - b * Math.cos(t)];
                }
                function helixTangent(t) {
                    return [a * Math.cos(t) + pitch / (2 * Math.PI), b * Math.sin(t)];
                }

                // 반턴(π) 하나를 π/2 두 구간의 베지어 패스로 그린다
                function drawHalfTurn(container, startT) {
                    var thetas = [startT, startT + Math.PI / 2, startT + Math.PI];
                    var handle = Math.PI / 6; // Δθ/3
                    var path = container.pathItems.add();

                    for (var i = 0; i < thetas.length; i++) {
                        var t = thetas[i];
                        var anchor = helixPoint(t);
                        var tangent = helixTangent(t);
                        var point = path.pathPoints.add();
                        point.anchor = anchor;
                        point.leftDirection = (i === 0) ? anchor :
                            [anchor[0] - tangent[0] * handle, anchor[1] - tangent[1] * handle];
                        point.rightDirection = (i === thetas.length - 1) ? anchor :
                            [anchor[0] + tangent[0] * handle, anchor[1] + tangent[1] * handle];
                        point.pointType = PointType.SMOOTH;
                    }

                    path.closed = false;
                    path.filled = false;
                    path.stroked = true;
                    path.strokeColor = black;
                    path.strokeWidth = coilWeight;
                    try {
                        path.strokeCap = StrokeCap.ROUNDENDCAP;
                        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                    } catch (e) {}
                    return path;
                }

                // 뒤쪽 반턴들(도선 뒤) → 도선 → 앞쪽 반턴들(도선 위) 순서로 쌓는다
                for (var back = 0; back < turnCount; back++) {
                    drawHalfTurn(group, 2 * back * Math.PI + Math.PI);
                }

                drawRod(group, black, capRx);

                for (var front = 0; front < turnCount; front++) {
                    drawHalfTurn(group, 2 * front * Math.PI);
                }

                return group;
            }

            // 도선: 양 끝이 반타원인 실루엣(세로 그라데이션) + 왼쪽 끝면 타원
            function getCapRx() {
                return rodRadius * Math.sin(Math.abs(viewAngleDeg) * Math.PI / 180);
            }

            function drawRod(container, black, capRx) {
                var topY = centerY + rodRadius;
                var bottomY = centerY - rodRadius;

                var body = container.pathItems.add();
                addCorner(body, [leftX, topY], [leftX - capRx * KAPPA, topY], true);
                addCorner(body, [leftX - capRx, centerY],
                    [leftX - capRx, centerY + rodRadius * KAPPA],
                    [leftX - capRx, centerY - rodRadius * KAPPA]);
                addCorner(body, [leftX, bottomY], [leftX - capRx * KAPPA, bottomY], false);
                addCorner(body, [rightX, bottomY], [rightX + capRx * KAPPA, bottomY], true);
                addCorner(body, [rightX + capRx, centerY],
                    [rightX + capRx, centerY - rodRadius * KAPPA],
                    [rightX + capRx, centerY + rodRadius * KAPPA]);
                addCorner(body, [rightX, topY], [rightX + capRx * KAPPA, topY], false);
                body.closed = true;
                body.stroked = true;
                body.strokeColor = black;
                body.strokeWidth = 0.8;
                body.filled = true;
                applyRodFill(body);

                // 끝면: 시점 각도가 +면 왼쪽, -면 오른쪽에서 보인다. 0이면 안 보임
                if (Math.abs(viewAngleDeg) >= 1 && capRx > 0.01) {
                    var faceLeft = viewAngleDeg > 0 ? (leftX - capRx) : (rightX - capRx);
                    var cap = container.pathItems.ellipse(
                        centerY + rodRadius, faceLeft, capRx * 2, rodRadius * 2);
                    cap.filled = true;
                    cap.fillColor = makeGray(22);
                    cap.stroked = true;
                    cap.strokeColor = black;
                    cap.strokeWidth = 0.8;
                }
                return body;
            }

            // 실루엣 꼭짓점 추가. 곡선 쪽 핸들 하나(또는 둘)만 지정한다.
            // outHandle=true 면 진행 방향(right), false 면 반대(left)에 핸들을 둔다.
            function addCorner(path, anchor, handleA, handleBOrOut) {
                var point = path.pathPoints.add();
                point.anchor = anchor;
                if (handleBOrOut === true) {
                    point.leftDirection = anchor;
                    point.rightDirection = handleA;
                } else if (handleBOrOut === false) {
                    point.leftDirection = handleA;
                    point.rightDirection = anchor;
                } else {
                    point.leftDirection = handleA;
                    point.rightDirection = handleBOrOut;
                }
                point.pointType = PointType.CORNER;
                return point;
            }

            // 몸통에 세로 그라데이션. 그라데이션 적용이 거부되면 단색으로 남긴다.
            function applyRodFill(item) {
                item.fillColor = makeGray(18);

                var gradient = getRodGradient();
                if (!gradient) return;

                try {
                    var gradientColor = new GradientColor();
                    gradientColor.gradient = gradient;
                    item.fillColor = gradientColor;
                    // 기본 그라데이션은 가로 방향이므로 도형만 +90도 돌렸다가
                    // 그라데이션까지 포함해 -90도 되돌려 세로 방향으로 만든다.
                    // 이 방향이어야 밝은 띠가 중심 위쪽에 온다.
                    item.rotate(90, true, false, false, false, Transformation.CENTER);
                    item.rotate(-90, true, true, true, true, Transformation.CENTER);
                } catch (e) {
                    item.fillColor = makeGray(18);
                }
            }

            function getRodGradient() {
                if (_rodGradientReady) return _rodGradient;
                _rodGradientReady = true;
                try {
                    var stops = [
                        {pos: 0, color: cmyk(0, 0, 0, 45)},
                        {pos: 40, color: cmyk(0, 0, 0, 6), mid: 50},
                        {pos: 100, color: cmyk(0, 0, 0, 52)}
                    ];
                    var gradient = doc.gradients.add();
                    gradient.name = "SolenoidRod_" + (new Date().getTime());
                    gradient.type = GradientType.LINEAR;
                    while (gradient.gradientStops.length < stops.length) gradient.gradientStops.add();
                    for (var i = 0; i < stops.length; i++) {
                        gradient.gradientStops[i].rampPoint = stops[i].pos;
                        gradient.gradientStops[i].color = stops[i].color;
                        if (stops[i].mid) gradient.gradientStops[i].midPoint = stops[i].mid;
                    }
                    _rodGradient = gradient;
                } catch (e) {
                    _rodGradient = null;
                }
                return _rodGradient;
            }

            function cmyk(c, m, y, k) {
                var color = new CMYKColor();
                color.cyan = c;
                color.magenta = m;
                color.yellow = y;
                color.black = k;
                return color;
            }

            function makeGray(k) {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    return cmyk(0, 0, 0, k);
                }
                var value = Math.round(255 * (100 - k) / 100);
                var rgb = new RGBColor();
                rgb.red = value;
                rgb.green = value;
                rgb.blue = value;
                return rgb;
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
                previewGroup = drawSolenoid();
                moveItem(previewGroup, offsetXmm * MM, offsetYmm * MM);
                previewGroup.name = "Solenoid Preview";
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            function readFields(showAlert) {
                var weight = parseNumber(weightField.input.text);
                var turns = parseNumber(turnField.input.text);
                var gap = parseNumber(gapField.input.text);
                var view = parseNumber(viewField.input.text);
                var offX = parseNumber(offsetXField.input.text);
                var offY = parseNumber(offsetYField.input.text);

                if (weight === null || weight <= 0) {
                    if (showAlert) alert("코일 굵기는 0보다 큰 숫자로 입력해주세요.");
                    return false;
                }
                if (turns === null || turns < 1) {
                    if (showAlert) alert("감긴 횟수는 1 이상의 정수로 입력해주세요.");
                    return false;
                }
                if (gap === null || gap < 0) {
                    if (showAlert) alert("코일 간격은 0 이상의 숫자로 입력해주세요.");
                    return false;
                }
                if (view === null || view < -60 || view > 60) {
                    if (showAlert) alert("시점 각도는 -60부터 60 사이로 입력해주세요.");
                    return false;
                }

                if (offX === null || offX < -POSITION_LIMIT_MM || offX > POSITION_LIMIT_MM ||
                        offY === null || offY < -POSITION_LIMIT_MM || offY > POSITION_LIMIT_MM) {
                    if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " +
                        POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
                    return false;
                }

                coilWeight = weight;
                offsetXmm = offX;
                offsetYmm = offY;
                turnCount = Math.round(turns);
                coilGapMm = gap;
                viewAngleDeg = view;
                return true;
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

            // 라벨 · 입력칸 · 단위 · 슬라이더를 한 줄에 배치.
            // 슬라이더를 끌면 단위에 맞춰 연속으로 값이 바뀐다.
            function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.characters = 5;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;


                var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};

                slider.onChanging = function() {
                    if (field.syncing) return;
                    var stepped = Math.round(slider.value / field.step) * field.step;
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
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                };
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function clampValue(value, minimum, maximum) {
                if (value < minimum) return minimum;
                if (value > maximum) return maximum;
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

            function saveSettings() {
                var parts = ["v3", coilWeight, turnCount, coilGapMm, viewAngleDeg,
                    offsetXmm, offsetYmm];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if ((p[0] !== "v2" && p[0] !== "v3") || p.length < 5) return;

                var weight = parseFloat(p[1]);
                var turns = parseInt(p[2], 10);
                var gap = parseFloat(p[3]);
                var view = parseFloat(p[4]);
                if (weight > 0) coilWeight = clampValue(weight, 0.1, 5);
                if (turns >= 1) turnCount = clampValue(turns, 1, 20);
                if (gap >= 0) coilGapMm = clampValue(gap, 0, 3);
                if (view >= -60 && view <= 60) viewAngleDeg = view;
                if (p[0] === "v3" && p.length >= 7) {
                    var offX = parseFloat(p[5]);
                    var offY = parseFloat(p[6]);
                    if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
                    if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
                }
            }
            return null;
        }
        return api;
    }

    // ==== 에너지 흐름 ====
    function makeEnergyFlowEngine() {
        var api = {label: "에너지 흐름", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            if (doc.activeLayer.locked || !doc.activeLayer.visible) return "현재 레이어가 잠겨 있거나 숨겨져 있습니다. 편집할 수 있는 레이어를 선택한 뒤 실행해주세요.";

            var sel = doc.selection;
            if (!sel || sel.length !== 1 || sel[0].typename !== "PathItem" || sel[0].pathPoints.length !== 4) return "상자가 될 사각형 하나를 선택해주세요. 사각형 폭이 화살표 전체 폭이 됩니다.";
            var sourceRect = sel[0];
            var rectBounds = sourceRect.geometricBounds;   // [left, top, right, bottom]
            // 상자 크기는 선택한 사각형에서 가져오고, 윗변 가운데를 고정한 채 다이얼로그에서 바꾼다 (저장하지 않음)
            var boxTopCenterX = (rectBounds[0] + rectBounds[2]) / 2;
            var boxTopY = rectBounds[1];

            var MM_TO_PT = 2.834645669;
            var LINE_WIDTH_PT = 0.3;
            var MAX_ARROWS = 4;
            var POSITION_LIMIT_MM = 100;
            var PREF_KEY = "ObjectEnergyFlow/settings";
            var PREVIEW_NAME = "Energy Flow Preview";
            var ARROW_KEYS = ["angleDeg", "bendMm", "lengthMm", "radiusMm", "gray"];
            var MIN_SECTOR_PERCENT = 1;
            var SECTOR_DRAG_STEP = 0.5;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";

            var korFont = getFont(KOR_FONT_NAME);
            var engFont = getFont(ENG_FONT_NAME);
            var italicFont = getFont(ITALIC_FONT_NAME);

            // ---- 옵션 ----
            var boxName = "연료 에너지";
            var boxValue = "100";
            var arrowCount = 3;
            var percents = [43, 38, 19, 0];          // 4칸 고정. 켜진 칸의 합 = 100
            var names = ["전기로/이용", "열로/이용", "손실", "기타"];
            var unknown = [false, false, false, false];
            var arrows = [
                {angleDeg: 0,  bendMm: 8, lengthMm: 16, radiusMm: 3, gray: 60},
                {angleDeg: 30, bendMm: 8, lengthMm: 14, radiusMm: 3, gray: 35},
                {angleDeg: 60, bendMm: 8, lengthMm: 12, radiusMm: 3, gray: 20},
                {angleDeg: 90, bendMm: 6, lengthMm: 10, radiusMm: 3, gray: 10}
            ];
            var RANGES = {
                angleDeg: [0, 90, 1, 0],
                bendMm: [0, 100, 0.5, 1],
                lengthMm: [0, 100, 0.5, 1],
                radiusMm: [0, 30, 0.5, 1],
                gray: [0, 100, 5, 0]
            };
            var boxWidthMm = clamp(roundTo((rectBounds[2] - rectBounds[0]) / MM_TO_PT, 0.5), 5, 200);
            var boxHeightMm = clamp(roundTo((rectBounds[1] - rectBounds[3]) / MM_TO_PT, 0.5), 2, 200);
            // 화살촉은 몸통 폭에 대한 비율이라 폭이 달라도 닮은꼴이 된다
            var headLengthPct = 60;
            var headScale = 160;
            var fontSize = 8;
            var valueHeightMm = 4;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;
            var previewSignature = "";
            var textCache = {};                      // 이름 → 마지막으로 쓴 글자 (서체 재적용 최소화)

            applySavedSettings();

            var LABEL_WIDTH = 78;
            var SLIDER_WIDTH = 196;
            var SECTOR_SLIDER_HEIGHT = 34;
            var SECTOR_SLIDER_PAD = 8;
            var THUMB_HALF_WIDTH = 5;
            var THUMB_GRAB_RADIUS = 12;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var dlg = page;

            var tabs = dlg.add("tabbedpanel");
            tabs.alignChildren = "fill";
            var contentTab = tabs.add("tab", undefined, "내용");
            contentTab.orientation = "column";
            contentTab.alignChildren = "fill";
            contentTab.spacing = 6;
            contentTab.margins = [10, 10, 10, 8];
            var shapeTab = tabs.add("tab", undefined, "모양");
            shapeTab.orientation = "column";
            shapeTab.alignChildren = "fill";
            shapeTab.spacing = 6;
            shapeTab.margins = [10, 10, 10, 8];
            tabs.selection = 0;

            // ---- 내용 탭 ----
            var boxPanel = addPanel(contentTab, "상자");
            var boxRow = boxPanel.add("group");
            boxRow.alignChildren = ["left", "center"];
            var boxNameLabel = boxRow.add("statictext", undefined, "이름:");
            boxNameLabel.preferredSize.width = 40;
            var boxNameInput = boxRow.add("edittext", undefined, boxName);
            boxNameInput.characters = 14;
            boxNameInput.helpTip = "/ 를 넣으면 줄이 바뀝니다";
            var boxValueLabel = boxRow.add("statictext", undefined, "값:");
            boxValueLabel.preferredSize.width = 28;
            var boxValueInput = boxRow.add("edittext", undefined, boxValue);
            boxValueInput.characters = 6;
            boxValueInput.justify = "right";
            boxValueInput.helpTip = "숫자를 넣으면 뒤에 이탤릭 E가 붙습니다 (100 → 100E)";
            boxRow.add("statictext", undefined, "E");

            var countPanel = addPanel(contentTab, "분할 수");
            var countRow = countPanel.add("group");
            countRow.alignChildren = ["left", "center"];
            countRow.spacing = 12;
            var countRadios = [];
            for (var cr = 2; cr <= MAX_ARROWS; cr++) {
                var countRadio = countRow.add("radiobutton", undefined, cr + "개");
                countRadio.value = (arrowCount === cr);
                countRadio.onClick = makeCountHandler(cr);
                countRadios.push(countRadio);
            }

            var sectorPanel = addPanel(contentTab, "항목 (왼쪽부터)");
            var sectorSlider = sectorPanel.add("customView");
            sectorSlider.alignment = ["fill", "top"];
            sectorSlider.preferredSize.height = SECTOR_SLIDER_HEIGHT;
            sectorSlider.onDraw = drawSectorSlider;
            var dragBoundary = -1;
            sectorSlider.addEventListener("mousedown", function(event) {
                dragBoundary = nearestBoundary(event.clientX);
                if (dragBoundary < 0) return;
                moveDraggedBoundary(event.clientX);
            });
            sectorSlider.addEventListener("mousemove", function(event) {
                if (dragBoundary < 0) return;
                moveDraggedBoundary(event.clientX);
            });
            sectorSlider.addEventListener("mouseup", function(event) {
                if (dragBoundary < 0) return;
                moveDraggedBoundary(event.clientX);
                dragBoundary = -1;
            });
            var itemRows = [];
            for (var s = 0; s < MAX_ARROWS; s++) itemRows.push(buildItemRow(sectorPanel, s));

            // ---- 모양 탭 ----
            var boxSizePanel = addPanel(shapeTab, "상자 크기");
            var boxWidthControls = addValueRow(boxSizePanel, "폭", "mm", boxWidthMm, 5, 200, 0.5, 1);
            var boxHeightControls = addValueRow(boxSizePanel, "높이", "mm", boxHeightMm, 2, 200, 0.5, 1);
            boxWidthControls.input.helpTip = boxWidthControls.slider.helpTip = "윗변 가운데를 고정하고 좌우로 늘어납니다";
            boxHeightControls.input.helpTip = boxHeightControls.slider.helpTip = "윗변을 고정하고 아래로 늘어납니다";

            var commonPanel = addPanel(shapeTab, "공통");
            var headLengthControls = addValueRow(commonPanel, "화살촉 길이", "%", headLengthPct, 10, 300, 5, 0);
            headLengthControls.input.helpTip = headLengthControls.slider.helpTip = "몸통 폭에 대한 화살촉 길이. 비율이라 화살표마다 화살촉이 닮은꼴이 됩니다";
            var headScaleControls = addValueRow(commonPanel, "화살촉 폭", "%", headScale, 100, 400, 5, 0);
            headScaleControls.input.helpTip = headScaleControls.slider.helpTip = "몸통 폭에 대한 화살촉 폭";
            var fontSizeControls = addValueRow(commonPanel, "글자 크기", "pt", fontSize, 4, 20, 0.5, 1);
            var valueHeightControls = addValueRow(commonPanel, "값 높이", "mm", valueHeightMm, 1, 50, 0.5, 1);
            valueHeightControls.input.helpTip = valueHeightControls.slider.helpTip = "상자 윗변에서 값 글자 가운데까지의 높이";

            var arrowTabs = shapeTab.add("tabbedpanel");
            arrowTabs.alignChildren = "fill";
            var arrowTabControls = [];
            for (var t = 0; t < MAX_ARROWS; t++) arrowTabControls.push(buildArrowTab(arrowTabs, t));
            arrowTabs.selection = 0;

            var positionPanel = addPanel(shapeTab, "위치 이동");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

            // ---- 하단 ----
            boxNameInput.onChange = function() {
                boxName = cleanText(boxNameInput.text);
                updatePreview();
            };
            boxValueInput.onChange = function() {
                boxValue = cleanText(boxValueInput.text);
                syncSectorControls();
                updatePreview();
            };
            bindValueRow(boxWidthControls, function() { return boxWidthMm; }, function(v) { boxWidthMm = v; });
            bindValueRow(boxHeightControls, function() { return boxHeightMm; }, function(v) { boxHeightMm = v; });
            bindValueRow(headLengthControls, function() { return headLengthPct; }, function(v) { headLengthPct = v; });
            bindValueRow(headScaleControls, function() { return headScale; }, function(v) { headScale = v; });
            bindValueRow(fontSizeControls, function() { return fontSize; }, function(v) { fontSize = v; });
            bindValueRow(valueHeightControls, function() { return valueHeightMm; }, function(v) { valueHeightMm = v; });
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);

            removeLeftoverPreviews();
            applyArrowCount(false);
            // 탭 호스트가 부르는 훅. 원본 사각형(굵은 선일 수 있음)은 미리보기 상자가 대신하므로 이 탭이 켜진 동안 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                doc.selection = null;
                try { sourceRect.hidden = true; } catch (hideError) {}
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                try { sourceRect.hidden = false; } catch (unhideError) {}
                try { sourceRect.selected = true; } catch (reselectError) {}
            };
            api.commit = function() {
                saveSettings();
                var finalGroup = finishPreview();
                if (finalGroup === null) {
                    alert("도형을 만들지 못했습니다. 다시 실행해주세요.");
                    return false;
                }
                try { sourceRect.remove(); } catch (removeError) {}
                finalGroup.name = "Energy Flow";
                doc.selection = null;
                try { finalGroup.selected = true; } catch (selectError) {}
                return true;
            };

            // -------------------------------------------------------
            // 다이얼로그 조립
            // -------------------------------------------------------
            function buildItemRow(parent, index) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var label = row.add("statictext", undefined, "항목 " + (index + 1));
                label.preferredSize.width = 40;
                var nameInput = row.add("edittext", undefined, names[index]);
                nameInput.characters = 12;
                nameInput.helpTip = "/ 를 넣으면 줄이 바뀝니다";
                var valueInput = row.add("edittext", undefined, formatValue(index));
                valueInput.characters = 6;
                valueInput.justify = "right";
                row.add("statictext", undefined, "E");
                var unknownCheck = row.add("checkbox", undefined, "?로 표시");
                unknownCheck.value = unknown[index];

                nameInput.onChange = function() {
                    names[index] = cleanText(nameInput.text);
                    updatePreview();
                };
                // 값 입력은 그 항목의 오른쪽 경계를 옮기는 것과 같다. 마지막 항목은 왼쪽 경계를 옮긴다.
                valueInput.onChange = function() {
                    var value = parseNumber(valueInput.text);
                    var total = getBoxTotal();
                    if (value !== null && total > 0) {
                        var percent = value / total * 100;
                        var boundaries = getBoundaries();
                        if (index < arrowCount - 1) {
                            var left = index === 0 ? 0 : boundaries[index - 1];
                            setBoundary(index, left + percent);
                        } else {
                            setBoundary(index - 1, 100 - percent);
                        }
                    }
                    syncSectorControls();
                    updatePreview();
                };
                unknownCheck.onClick = function() {
                    unknown[index] = unknownCheck.value;
                    updatePreview();
                };
                return {row: row, nameInput: nameInput, valueInput: valueInput, unknownCheck: unknownCheck};
            }

            function buildArrowTab(parent, index) {
                var a = arrows[index];
                var tab = parent.add("tab", undefined, "화살표 " + (index + 1));
                tab.orientation = "column";
                tab.alignChildren = "left";
                tab.spacing = 4;
                tab.margins = [10, 10, 10, 8];
                var rows = {};
                rows.angleDeg = addValueRow(tab, "각도", "°", a.angleDeg, 0, 90, 1, 0);
                rows.angleDeg.input.helpTip = rows.angleDeg.slider.helpTip = "0° = 12시 방향, 90° = 3시 방향. 첫 화살표는 0°, 마지막 화살표는 90° 고정";
                rows.bendMm = addValueRow(tab, "꺾임 높이", "mm", a.bendMm, 0, 100, 0.5, 1);
                rows.bendMm.input.helpTip = rows.bendMm.slider.helpTip = "상자 윗변에서 휘기 시작하는 높이. 곧은 화살표는 꺾임 높이 + 길이가 전체 높이";
                rows.lengthMm = addValueRow(tab, "길이", "mm", a.lengthMm, 0, 100, 0.5, 1);
                rows.lengthMm.input.helpTip = rows.lengthMm.slider.helpTip = "꺾인 뒤 화살촉까지 곧게 가는 길이";
                rows.radiusMm = addValueRow(tab, "꺾임 반지름", "mm", a.radiusMm, 0, 30, 0.5, 1);
                rows.radiusMm.input.helpTip = rows.radiusMm.slider.helpTip = "꺾이는 안쪽 모서리의 반지름. 바깥쪽은 여기에 몸통 폭이 더해집니다";
                rows.gray = addValueRow(tab, "음영", "K%", a.gray, 0, 100, 5, 0);
                for (var key in rows) {
                    if (!rows.hasOwnProperty(key)) continue;
                    bindValueRow(rows[key], makeGetter(index, key), makeSetter(index, key));
                }
                return {tab: tab, rows: rows};
            }

            function makeGetter(index, key) {
                return function() { return arrows[index][key]; };
            }

            function makeSetter(index, key) {
                return function(value) { arrows[index][key] = value; };
            }

            function makeCountHandler(count) {
                return function() {
                    arrowCount = count;
                    applyArrowCount(true);
                    updatePreview();
                };
            }

            // 분할 수에 맞춰 각도를 0°~90°로 고르게 펴고, 남는 항목 행과 탭 비활성, 비율 재분배
            // resetAngles: 분할 수를 바꿀 때만 참. 시작할 때는 저장된 각도를 지키고 양 끝만 고정한다
            function applyArrowCount(resetAngles) {
                for (var d = 0; d < arrowCount; d++) {
                    if (resetAngles) arrows[d].angleDeg = Math.round(90 * d / (arrowCount - 1));
                }
                arrows[0].angleDeg = 0;
                arrows[arrowCount - 1].angleDeg = 90;
                // 새로 켜진(0%) 항목에는 균등한 몫을 준 뒤 합을 100%로 맞춘다
                for (var e = 0; e < arrowCount; e++) {
                    if (percents[e] < MIN_SECTOR_PERCENT) percents[e] = 100 / arrowCount;
                }
                var sum = 0;
                for (var i = 0; i < arrowCount; i++) sum += percents[i];
                for (var n = 0; n < arrowCount; n++) percents[n] = percents[n] * 100 / sum;
                for (var z = arrowCount; z < MAX_ARROWS; z++) percents[z] = 0;
                for (var k = 0; k < MAX_ARROWS; k++) {
                    var on = k < arrowCount;
                    itemRows[k].nameInput.enabled = on;
                    itemRows[k].valueInput.enabled = on;
                    itemRows[k].unknownCheck.enabled = on;
                    var rows = arrowTabControls[k].rows;
                    var angleFixed = (k === 0 || k === arrowCount - 1);
                    rows.angleDeg.input.enabled = on && !angleFixed;
                    rows.angleDeg.slider.enabled = on && !angleFixed;
                    rows.angleDeg.input.text = formatNumber(arrows[k].angleDeg, 0);
                    try { rows.angleDeg.slider.value = arrows[k].angleDeg; } catch (sliderError) {}
                    rows.bendMm.input.enabled = rows.bendMm.slider.enabled = on;
                    rows.lengthMm.input.enabled = rows.lengthMm.slider.enabled = on;
                    rows.radiusMm.input.enabled = rows.radiusMm.slider.enabled = on;
                    rows.gray.input.enabled = rows.gray.slider.enabled = on;
                }
                syncSectorControls();
            }

            // -------------------------------------------------------
            // 구간 슬라이더 (CellCycle과 같은 방식)
            // -------------------------------------------------------
            function getBoundaries() {
                var boundaries = [];
                var cumulative = 0;
                for (var i = 0; i < arrowCount - 1; i++) {
                    cumulative += percents[i];
                    boundaries.push(cumulative);
                }
                return boundaries;
            }

            function setBoundary(index, value) {
                var boundaries = getBoundaries();
                if (index < 0 || index >= boundaries.length) return;
                var lower = (index === 0 ? 0 : boundaries[index - 1]) + MIN_SECTOR_PERCENT;
                var upper = (index === boundaries.length - 1 ? 100 : boundaries[index + 1]) - MIN_SECTOR_PERCENT;
                if (lower > upper) return;
                boundaries[index] = clamp(value, lower, upper);
                var previous = 0;
                for (var i = 0; i < arrowCount; i++) {
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

            function moveDraggedBoundary(x) {
                setBoundary(dragBoundary, roundTo(xToPercent(x), SECTOR_DRAG_STEP));
                syncSectorControls();
                updatePreview();
            }

            function syncSectorControls() {
                for (var i = 0; i < MAX_ARROWS; i++) {
                    itemRows[i].valueInput.text = i < arrowCount ? formatValue(i) : "";
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
                var textPen = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
                var font = g.font;
                var boundaries = getBoundaries();

                var previousX = range[0];
                for (var i = 0; i < arrowCount; i++) {
                    var nextX = i < boundaries.length ? percentToX(boundaries[i]) : range[1];
                    var level = 0.7 - 0.5 * (arrows[i].gray / 100);
                    g.newPath();
                    g.rectPath(previousX, trackTop, nextX - previousX, trackHeight);
                    g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [level, level, level, 1]));
                    var label = formatValue(i);
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
                    var x = percentToX(boundaries[k]);
                    g.newPath();
                    g.rectPath(x - THUMB_HALF_WIDTH, 1, THUMB_HALF_WIDTH * 2, height - 2);
                    g.fillPath(thumbBrush);
                    g.strokePath(thumbPen);
                }
            }

            // -------------------------------------------------------
            // 값 · 글자
            // -------------------------------------------------------
            function getBoxTotal() {
                var value = parseNumber(boxValue);
                return value === null ? 0 : value;
            }

            // 항목 값 = 상자 값 × 비율. 소수 둘째 자리까지, 끝의 0은 지운다
            function formatValue(index) {
                var total = getBoxTotal();
                return trimNumber(total * percents[index] / 100);
            }

            function trimNumber(value) {
                var text = formatNumber(value, 2);
                return text.replace(/\.?0+$/, "");
            }

            // 숫자면 뒤에 E를 붙이고(E는 이탤릭), 아니면 그대로 쓴다. italicFrom: 이탤릭으로 바꿀 첫 글자 위치
            function valueLabel(text) {
                var value = parseNumber(text);
                if (value === null || String(text).replace(/\s/g, "") === "") return {contents: text, italicFrom: -1};
                var shown = trimNumber(value);
                return {contents: shown + "E", italicFrom: shown.length};
            }

            function cleanText(text) {
                return String(text).replace(/\|/g, "/");
            }

            // "/"는 줄바꿈
            function toLines(text) {
                return String(text).replace(/\//g, "\r");
            }

            // 글자 단위 서체 규칙: 한글·공백 Spoqa, 그 외 GSMediumB1(+0.5pt). italicFrom 이후 글자는 이탤릭
            function applyFontRule(frame, size, italicFrom) {
                for (var i = 0; i < frame.characters.length; i++) {
                    var character = frame.characters[i];
                    var text = character.contents;
                    var code = text.charCodeAt(0);
                    var isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
                    var isSpace = (text === " " || code === 32 || code === 160);
                    if (isKorean || isSpace) {
                        applyFontToRange(character, korFont, size, 0);
                    } else if (italicFrom >= 0 && i >= italicFrom) {
                        applyFontToRange(character, italicFont, size, 0.5);
                    } else {
                        applyFontToRange(character, engFont, size, 0.5);
                    }
                }
                try { frame.textRange.paragraphAttributes.justification = Justification.CENTER; } catch (e) {}
            }

            function applyFontToRange(range, font, size, baselineShift) {
                try { range.characterAttributes.size = size; } catch (e) {}
                try { range.characterAttributes.textFont = font; } catch (e2) {}
                try { range.characterAttributes.baselineShift = baselineShift; } catch (e3) {}
            }

            // 글자는 한 번 만든 뒤 contents만 갱신한다 (재생성을 되풀이하면 개체 참조가 깨진다)
            function writeText(frame, key, contents, italicFrom, size, x, y) {
                var cacheKey = contents + "|" + italicFrom + "|" + size;
                if (textCache[key] !== cacheKey) {
                    frame.contents = contents;
                    applyFontRule(frame, size, italicFrom);
                    textCache[key] = cacheKey;
                }
                var bounds = frame.geometricBounds;
                var width = bounds[2] - bounds[0];
                var height = bounds[1] - bounds[3];
                frame.translate(x - width / 2 - bounds[0], y + height / 2 - bounds[1]);
            }

            function getFont(name) {
                try {
                    return app.textFonts.getByName(name);
                } catch (e) {
                    return app.textFonts[0];
                }
            }

            // -------------------------------------------------------
            // 기하
            // -------------------------------------------------------
            // 화살표 하나의 윤곽. 밑변 [xa, xb] × top 에서 출발해 bend 만큼 오르고,
            // 안쪽 반지름 r 의 동심 원호로 angle(라디안, 시계 방향)만큼 돈 뒤 length 만큼 곧게 가서 화살촉.
            // 왼쪽 밑에서 시계 방향으로 도는 점 목록 {anchor, left, right}.
            function arrowOutline(xa, xb, top, angle, bend, length, r, headLengthRatio, headWidthRatio) {
                var w = xb - xa;
                var headLength = w * headLengthRatio;
                var d = [Math.sin(angle), Math.cos(angle)];          // 꺾인 뒤 진행 방향
                var n = [-Math.cos(angle), Math.sin(angle)];         // 진행 방향의 왼쪽
                var cx = xb + r;
                var cy = top + bend;
                var points = [];
                var outerEnd, innerEnd;

                points.push(cornerPoint([xa, top]));
                if (angle > 1e-6) {
                    var outerArc = arcPoints(cx, cy, r + w, Math.PI, -angle);
                    appendArc(points, outerArc);
                    outerEnd = outerArc[outerArc.length - 1].anchor;
                } else {
                    points.push(cornerPoint([xa, cy]));
                    outerEnd = [xa, cy];
                }
                var outerTip = [outerEnd[0] + d[0] * length, outerEnd[1] + d[1] * length];
                var innerStart = [cx - r * Math.cos(angle), cy + r * Math.sin(angle)];
                var innerTip = [innerStart[0] + d[0] * length, innerStart[1] + d[1] * length];
                var extra = w * (headWidthRatio - 1) / 2;
                var mid = [(outerTip[0] + innerTip[0]) / 2, (outerTip[1] + innerTip[1]) / 2];

                points.push(cornerPoint(outerTip));
                points.push(cornerPoint([outerTip[0] + n[0] * extra, outerTip[1] + n[1] * extra]));
                points.push(cornerPoint([mid[0] + d[0] * headLength, mid[1] + d[1] * headLength]));
                points.push(cornerPoint([innerTip[0] - n[0] * extra, innerTip[1] - n[1] * extra]));
                points.push(cornerPoint(innerTip));
                if (angle > 1e-6) {
                    appendArc(points, arcPoints(cx, cy, r, Math.PI - angle, angle));
                } else {
                    points.push(cornerPoint([xb, cy]));
                }
                points.push(cornerPoint([xb, top]));
                return points;
            }

            function cornerPoint(anchor) {
                return {anchor: anchor, left: anchor, right: anchor};
            }

            // 원호 양 끝은 직선과 만나므로 바깥쪽 핸들을 앵커에 붙인다
            function appendArc(points, arc) {
                arc[0].left = arc[0].anchor;
                arc[arc.length - 1].right = arc[arc.length - 1].anchor;
                for (var i = 0; i < arc.length; i++) points.push(arc[i]);
            }

            // 90°마다 나눈 베지어 호. 부호가 있는 sweep이 진행 방향(음수 = 시계 방향)
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

            // 항목 이름 자리: 꺾인 뒤 곧은 구간의 가운데
            function arrowLabelCenter(xa, xb, top, angle, bend, length, r) {
                var w = xb - xa;
                var cx = xb + r;
                var cy = top + bend;
                var mid = r + w / 2;
                var start = [cx - mid * Math.cos(angle), cy + mid * Math.sin(angle)];
                return [start[0] + Math.sin(angle) * length / 2, start[1] + Math.cos(angle) * length / 2];
            }

            // 화살표마다 [xa, xb]. 켜진 항목 비율로 상자 폭을 나눈다
            function arrowSpans(left, right, count, ratios) {
                var total = 0;
                for (var i = 0; i < count; i++) total += ratios[i];
                var spans = [];
                var cumulative = 0;
                for (var k = 0; k < count; k++) {
                    var xa = left + (right - left) * (total > 0 ? cumulative / total : k / count);
                    cumulative += ratios[k];
                    var xb = left + (right - left) * (total > 0 ? cumulative / total : (k + 1) / count);
                    spans.push([xa, xb]);
                }
                return spans;
            }

            // -------------------------------------------------------
            // 미리보기 (부품은 한 번 만들고 앵커·글자만 덮어쓴다)
            // -------------------------------------------------------
            function updatePreview() {
                if (!previewEnabled) {
                    clearPreview();
                    app.redraw();
                    return;
                }
                var signature = previewParts().join("|");
                if (previewGroup !== null && signature === previewSignature) return;
                try {
                    if (previewGroup === null) previewGroup = createParts();
                    writeParts(previewGroup);
                    previewSignature = signature;
                } catch (e) {
                    // 간헐적 DOM 오류: 부품을 버리고 다음 조작에서 처음부터 다시 만든다
                    clearPreview();
                    removeLeftoverPreviews();
                }
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
                previewSignature = "";
                textCache = {};
            }

            function removeLeftoverPreviews() {
                for (var i = doc.groupItems.length - 1; i >= 0; i--) {
                    try {
                        if (doc.groupItems[i].name === PREVIEW_NAME) doc.groupItems[i].remove();
                    } catch (e) {}
                }
            }

            // 확인: 미리보기가 그대로 결과. 미리보기가 없으면 새로 만들고, 안 쓰는 부품은 지운다
            function finishPreview() {
                for (var attempt = 0; attempt < 2; attempt++) {
                    try {
                        if (previewGroup === null) {
                            previewGroup = createParts();
                            writeParts(previewGroup);
                        }
                        var group = previewGroup;
                        var parts = readParts(group);
                        for (var i = arrowCount; i < MAX_ARROWS; i++) {
                            try { parts["arrow" + i].remove(); } catch (e1) {}
                            try { parts["name" + i].remove(); } catch (e2) {}
                            try { parts["value" + i].remove(); } catch (e3) {}
                        }
                        previewGroup = null;
                        return group;
                    } catch (e) {
                        clearPreview();
                        removeLeftoverPreviews();
                        try { $.sleep(100); app.redraw(); } catch (redrawError) {}
                    }
                }
                return null;
            }

            // 상자 1 + 상자 글자 2 + 화살표 4 + 이름 4 + 값 4. 화살표는 왼쪽이 위에 오도록 역순으로 만든다
            function createParts() {
                var group = doc.groupItems.add();
                group.name = PREVIEW_NAME;
                var black = makeGray(100);
                var box = group.pathItems.add();
                box.name = "box";
                styleOutline(box, black);
                box.filled = true;
                box.fillColor = makeGray(0);
                for (var i = MAX_ARROWS - 1; i >= 0; i--) {
                    var arrow = group.pathItems.add();
                    arrow.name = "arrow" + i;
                    styleOutline(arrow, black);
                    arrow.filled = true;
                }
                var boxNameFrame = group.textFrames.add();
                boxNameFrame.name = "boxName";
                var boxValueFrame = group.textFrames.add();
                boxValueFrame.name = "boxValue";
                for (var t = 0; t < MAX_ARROWS; t++) {
                    var nameFrame = group.textFrames.add();
                    nameFrame.name = "name" + t;
                    var valueFrame = group.textFrames.add();
                    valueFrame.name = "value" + t;
                }
                return group;
            }

            function readParts(group) {
                var parts = {};
                for (var i = 0; i < group.pageItems.length; i++) {
                    var item = group.pageItems[i];
                    parts[item.name] = item;
                }
                return parts;
            }

            function writeParts(group) {
                var parts = readParts(group);
                var dx = offsetXmm * MM_TO_PT;
                var dy = offsetYmm * MM_TO_PT;
                var left = boxTopCenterX - boxWidthMm * MM_TO_PT / 2 + dx;
                var right = boxTopCenterX + boxWidthMm * MM_TO_PT / 2 + dx;
                var top = boxTopY + dy;
                var bottom = top - boxHeightMm * MM_TO_PT;

                writePath(parts.box, [cornerPoint([left, top]), cornerPoint([right, top]),
                    cornerPoint([right, bottom]), cornerPoint([left, bottom])]);
                // 상자 글자: 이름 줄(들) 위, 값 줄 아래. 전체가 상자 가운데에 오도록 이름 줄 수만큼 나눈다
                var boxLabel = valueLabel(boxValue);
                var lineGap = fontSize * 1.3;
                var nameLines = toLines(boxName).split("\r").length;
                var boxCenterY = (top + bottom) / 2;
                writeText(parts.boxName, "boxName", toLines(boxName), -1, fontSize,
                    (left + right) / 2, boxCenterY + lineGap / 2);
                writeText(parts.boxValue, "boxValue", boxLabel.contents, boxLabel.italicFrom, fontSize,
                    (left + right) / 2, boxCenterY - lineGap * nameLines / 2);

                var spans = arrowSpans(left, right, arrowCount, percents);
                for (var i = 0; i < MAX_ARROWS; i++) {
                    var arrow = parts["arrow" + i];
                    var nameFrame = parts["name" + i];
                    var valueFrame = parts["value" + i];
                    var on = i < arrowCount;
                    arrow.hidden = !on;
                    nameFrame.hidden = !on;
                    valueFrame.hidden = !on;
                    if (!on) continue;
                    var a = arrows[i];
                    var angle = a.angleDeg * Math.PI / 180;
                    var bend = a.bendMm * MM_TO_PT;
                    var length = a.lengthMm * MM_TO_PT;
                    var r = a.radiusMm * MM_TO_PT;
                    var xa = spans[i][0];
                    var xb = spans[i][1];
                    writePath(arrow, arrowOutline(xa, xb, top, angle, bend, length, r, headLengthPct / 100, headScale / 100));
                    setFillGray(arrow, a.gray);
                    var labelCenter = arrowLabelCenter(xa, xb, top, angle, bend, length, r);
                    writeText(nameFrame, "name" + i, toLines(names[i]), -1, fontSize, labelCenter[0], labelCenter[1]);
                    var label = unknown[i] ? {contents: "?", italicFrom: -1} : valueLabel(formatValue(i));
                    writeText(valueFrame, "value" + i, label.contents, label.italicFrom, fontSize,
                        (xa + xb) / 2, top + valueHeightMm * MM_TO_PT);
                }
            }

            function writePath(path, points) {
                for (var i = 0; i < points.length; i++) {
                    var point = i < path.pathPoints.length ? path.pathPoints[i] : path.pathPoints.add();
                    point.anchor = points[i].anchor;
                    point.leftDirection = points[i].left;
                    point.rightDirection = points[i].right;
                    point.pointType = PointType.CORNER;
                }
                for (var k = path.pathPoints.length - 1; k >= points.length; k--) {
                    try { path.pathPoints[k].remove(); } catch (e) {}
                }
                path.closed = true;
            }

            function styleOutline(path, color) {
                path.stroked = true;
                path.strokeColor = color;
                path.strokeWidth = LINE_WIDTH_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                path.strokeDashes = [];
            }

            function setFillGray(path, gray) {
                var key = "fill:" + path.name;
                if (textCache[key] === gray) return;
                path.fillColor = makeGray(gray);
                textCache[key] = gray;
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
                var rgb = new RGBColor();
                var level = Math.round(255 * (100 - k) / 100);
                rgb.red = level;
                rgb.green = level;
                rgb.blue = level;
                return rgb;
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

            // 위치 변경은 부품을 다시 쓰지 않고 미리보기 그룹만 이동한다
            function bindPositionRow(controls, getter, setter, isX) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM_TO_PT;
                    setter(value);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    if (previewGroup === null || delta === 0) {
                        updatePreview();
                        return;
                    }
                    try {
                        previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
                        previewSignature = previewParts().join("|");
                    } catch (moveError) {
                        updatePreview();
                        return;
                    }
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
            function settingsParts() {
                var parts = ["v3", boxName, boxValue, arrowCount];
                for (var i = 0; i < MAX_ARROWS; i++) parts.push(percents[i]);
                for (var n = 0; n < MAX_ARROWS; n++) parts.push(names[n]);
                for (var u = 0; u < MAX_ARROWS; u++) parts.push(unknown[u] ? 1 : 0);
                for (var a = 0; a < MAX_ARROWS; a++) {
                    for (var k = 0; k < ARROW_KEYS.length; k++) parts.push(arrows[a][ARROW_KEYS[k]]);
                }
                parts.push(headLengthPct, headScale, fontSize, valueHeightMm, offsetXmm, offsetYmm);
                return parts;
            }

            // 미리보기 갱신 판단용. 저장하지 않는 상자 크기까지 넣는다
            function previewParts() {
                return settingsParts().concat([boxWidthMm, boxHeightMm]);
            }

            function saveSettings() {
                try { app.preferences.setStringPreference(PREF_KEY, settingsParts().join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                var expected = 4 + MAX_ARROWS * 3 + MAX_ARROWS * ARROW_KEYS.length + 6;
                if (p[0] !== "v3" || p.length !== expected) return;
                boxName = p[1];
                boxValue = p[2];
                arrowCount = Math.round(restoreNumber(p[3], arrowCount, 2, MAX_ARROWS));
                var index = 4;
                for (var i = 0; i < MAX_ARROWS; i++) percents[i] = restoreNumber(p[index++], percents[i], 0, 100);
                for (var n = 0; n < MAX_ARROWS; n++) names[n] = p[index++];
                for (var u = 0; u < MAX_ARROWS; u++) unknown[u] = (p[index++] === "1");
                for (var a = 0; a < MAX_ARROWS; a++) {
                    for (var k = 0; k < ARROW_KEYS.length; k++) {
                        var key = ARROW_KEYS[k];
                        arrows[a][key] = restoreNumber(p[index++], arrows[a][key], RANGES[key][0], RANGES[key][1]);
                    }
                }
                headLengthPct = restoreNumber(p[index++], headLengthPct, 10, 300);
                headScale = restoreNumber(p[index++], headScale, 100, 400);
                fontSize = restoreNumber(p[index++], fontSize, 4, 20);
                valueHeightMm = restoreNumber(p[index++], valueHeightMm, 1, 50);
                offsetXmm = restoreNumber(p[index++], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[index++], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
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
