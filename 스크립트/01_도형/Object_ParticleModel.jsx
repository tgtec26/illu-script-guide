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

// 입자 모형: 원자·분자·이온 결합 모형 생성기를 한 창의 탭으로 묶었다.
// 옵션(핵 전하량·전자 기호·껍질 선·3D 조명)과 크기(1껍질 지름·핵·전자·글자)는 세 탭이 같이 쓴다.
// 정원 하나를 선택하고 실행하면 그 원을 최외곽 껍질로 삼아 크기를 맞추고, 생성 시 원은 지운다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;               // 1mm = 2.834645669pt
    var shellRatio = [8, 16, 24]; // 껍질 지름 비율(mm 기준, 중심부터 등간격). 최외곽 = 전체 크기.
    var fontName = "GSMediumB1";         // 지정 서체명
    var PREVIEW_NAME = "ParticleModel_Preview";
    // 탭으로 묶기 전 스크립트들이 남겼을 수 있는 미리보기 홀더 이름
    var LEGACY_PREVIEW_NAMES = ["AtomModel_Preview", "MoleculeModel_Preview", "IonicModel_Preview"];

    // 그라데이션은 문서당 1회만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
    var _gradCache = null, _gradCacheDoc = null;
    function getGradients(doc) {
        if (_gradCache && _gradCacheDoc === doc) return _gradCache;
        function cmyk(c, m, y, k) { var col = new CMYKColor(); col.cyan = c; col.magenta = m; col.yellow = y; col.black = k; return col; }
        var white = cmyk(0, 0, 0, 0), gray40 = cmyk(0, 0, 0, 40), gray60 = cmyk(0, 0, 0, 60), gray80 = cmyk(0, 0, 0, 80);
        function uniq(baseName, stops) {
            var grad = doc.gradients.add();
            grad.name = baseName + "_" + (new Date().getTime());
            grad.type = GradientType.RADIAL;
            for (var stopIndex = grad.gradientStops.length; stopIndex < stops.length; stopIndex++) grad.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                grad.gradientStops[i].rampPoint = stops[i].pos;
                grad.gradientStops[i].color = stops[i].color;
                if (stops[i].mid) grad.gradientStops[i].midPoint = stops[i].mid;
            }
            return grad;
        }
        _gradCache = {
            shell: uniq("Shell", [{pos:0, color:white}, {pos:83, color:white, mid:87}, {pos:100, color:gray40}]),
            sphere: uniq("Sphere", [{pos:0, color:white, mid:13.3}, {pos:100, color:gray80}]),
            sphereNuc: uniq("SphereNuc", [{pos:0, color:white, mid:13.3}, {pos:100, color:gray60}]) // 핵: 전자보다 밝게
        };
        _gradCacheDoc = doc;
        return _gradCache;
    }

    // 선택 오브젝트가 "가이드 정원"인지 판별. 맞으면 중심/지름(pt)을 돌려준다.
    // 하나의 닫힌 패스이고 가로·세로 차이가 5% 이내여야 원으로 간주.
    function detectGuideCircle() {
        if (app.documents.length === 0) return null;
        var d = app.activeDocument;
        if (!(d.selection && d.selection.length === 1)) return null;
        var s = d.selection[0];
        if (s.typename !== "PathItem" || !s.closed) return null;
        var gb = s.geometricBounds; // [left, top, right, bottom]
        var gw = gb[2] - gb[0], gh = gb[1] - gb[3];
        if (gw <= 0 || gh <= 0 || Math.abs(gw - gh) > gw * 0.05) return null;
        return { item: s, cx: (gb[0] + gb[2]) / 2, cy: (gb[1] + gb[3]) / 2, d: gw };
    }

    var sliderSyncers = []; // 값 변경(복원 등) 후 라벨 텍스트를 다시 맞추는 함수 목록
    var engines = [makeAtomEngine(), makeMoleculeEngine(), makeIonicEngine()];
    var tabIndex = 0;
    var engine = engines[0];

    // 2. ScriptUI 창 구성
    var win = new Window("dialog", "입자 모형 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 16;

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = ["fill", "top"];
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = tabs.add("tab", undefined, engines[engineIndex].label);
        page.orientation = "column";
        page.alignChildren = ["fill", "top"];
        page.spacing = 8;
        engines[engineIndex].addRows(page);
    }

    // --- 옵션 (2열 배치) ---
    var pnlOptions = win.add("panel", undefined, "옵션");
    pnlOptions.orientation = "row";
    pnlOptions.alignChildren = ["fill", "top"];
    pnlOptions.spacing = 20;
    var optCol1 = pnlOptions.add("group");
    optCol1.orientation = "column"; optCol1.alignChildren = "left"; optCol1.spacing = 6;
    var optCol2 = pnlOptions.add("group");
    optCol2.orientation = "column"; optCol2.alignChildren = "left"; optCol2.spacing = 6;

    var chkNucleus = optCol1.add("checkbox", undefined, "핵 전하량 표시");
    chkNucleus.value = true;
    var chkShowMinus = optCol1.add("checkbox", undefined, "전자 - 기호 표시");
    chkShowMinus.value = true;
    var chkShellLine = optCol1.add("checkbox", undefined, "전자 껍질 선");
    var chkLit3DNucleus = optCol2.add("checkbox", undefined, "핵 3D 조명 효과");
    chkLit3DNucleus.value = true;
    var chkLit3DElectron = optCol2.add("checkbox", undefined, "전자 3D 조명 효과");
    chkLit3DElectron.value = true;
    var chkPreview = optCol2.add("checkbox", undefined, "미리보기 실시간 표시");
    chkPreview.value = true;

    // --- 크기 조절 슬라이더 ---
    var pnlSize = win.add("panel", undefined, "크기 조절");
    pnlSize.alignChildren = "left";
    pnlSize.spacing = 2;
    // 모든 크기는 실제 적용값(화면 실측치). 기준 = 1번 껍질 지름(mm).
    // 껍질 수가 달라도 껍질 지름이 같아 여러 모형 간 통일감 유지(1:2:3 등간격).
    var sldOverall = addSlider(pnlSize, "1껍질 지름", 2, 16, 13, "mm", 0.1);
    var sldNucleus = addSlider(pnlSize, "핵 지름", 0.5, 8, 6, "mm", 0.1);
    var sldElectron = addSlider(pnlSize, "전자 지름", 0.2, 4, 2, "mm", 0.1);
    var sldChargeFont = addSlider(pnlSize, "핵 전하량 글자", 1, 20, 8, "pt", 0.1);

    // 연동 규칙:
    //  전체 크기 변경 → 핵 지름·전자 지름·핵 전하량 글자(+탭별 크기)가 같은 비율로 함께 조정(전체 비례).
    //  핵 지름 변경   → 핵 전하량 글자만 같은 비율로 조정.
    //  전자 지름/글자  → 개별 조정(다른 값에 영향 없음).
    var prevOverall = sldOverall.value;
    var prevNucleus = sldNucleus.value;
    // 드래그 중엔 연동+라벨만 갱신, 놓을 때(onChange) 미리보기 재드로우
    sldOverall.onChanging = function() {
        var r = sldOverall.value / prevOverall;
        scaleSlider(sldNucleus, r);
        scaleSlider(sldElectron, r);
        scaleSlider(sldChargeFont, r);
        for (var i = 0; i < engines.length; i++) engines[i].scaleWith(r);
        prevOverall = sldOverall.value;
        prevNucleus = sldNucleus.value; // 핵 지름이 함께 바뀌었으므로 기준 갱신
        sldOverall.syncLabel();
    };
    sldOverall.onChange = function() { sldOverall.syncLabel(); updatePreview(); };
    sldNucleus.onChanging = function() {
        scaleSlider(sldChargeFont, sldNucleus.value / prevNucleus);
        prevNucleus = sldNucleus.value;
        sldNucleus.syncLabel();
    };
    sldNucleus.onChange = function() { sldNucleus.syncLabel(); updatePreview(); };

    // --- 위치 (미리보기를 다시 그리지 않고 옮긴다) ---
    var pnlPosition = win.add("panel", undefined, "위치");
    pnlPosition.alignChildren = "left";
    pnlPosition.spacing = 2;
    var sldOffsetX = addSlider(pnlPosition, "가로 이동", -100, 100, 0, "mm", 0.1);
    var sldOffsetY = addSlider(pnlPosition, "세로 이동", -100, 100, 0, "mm", 0.1);
    var offsetXmm = 0;
    var offsetYmm = 0;
    sldOffsetX.onChanging = function() { sldOffsetX.syncLabel(); moveOffset(sldOffsetX.value, true); };
    sldOffsetX.onChange = sldOffsetX.onChanging;
    sldOffsetY.onChanging = function() { sldOffsetY.syncLabel(); moveOffset(sldOffsetY.value, false); };
    sldOffsetY.onChange = sldOffsetY.onChanging;
    function moveOffset(value, isX) {
        var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM;
        if (isX) offsetXmm = value;
        else offsetYmm = value;
        if (delta === 0) return;
        translateItems(previewItems, isX ? delta : 0, isX ? 0 : delta);
        try { app.redraw(); } catch (e) {}
    }
    function translateItems(items, deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;
        for (var i = 0; i < items.length; i++) { try { items[i].translate(deltaX, deltaY); } catch (e) {} }
    }

    var btnGenerate = win.add("button", undefined, "모형 생성하기", {name: "ok"});
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}
    btnGenerate.preferredSize.height = 40;

    // --- 아트보드 실시간 미리보기 (Object_sphere 방식) ---
    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) { try { previewItems[i].remove(); } catch (e) {} }
        previewItems = [];
    }
    // 이전 세션이 비정상 종료되며 남겼을 수 있는 미리보기 홀더를 정리 (이름이 고유해 안전)
    function removeLeftoverPreviews() {
        try {
            var d = app.activeDocument;
            for (var i = d.groupItems.length - 1; i >= 0; i--) {
                var name = d.groupItems[i].name;
                var stale = name === PREVIEW_NAME;
                for (var j = 0; j < LEGACY_PREVIEW_NAMES.length; j++) if (name === LEGACY_PREVIEW_NAMES[j]) stale = true;
                if (stale) { try { d.groupItems[i].remove(); } catch (e) {} }
            }
        } catch (e) {}
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        clearPreview();
        if (chkPreview.value && engine.selectedCount() > 0) {
            // 그리기 도중 오류(MRAP 등)가 나도 남은 조각을 제거할 수 있도록,
            // 먼저 홀더 그룹을 만들어 캡처한 뒤 그 안에 그린다. (유령 누적 방지)
            // 미리보기는 가이드 원을 삭제하지 않는다(consumeGuide=false).
            try {
                var holder = app.activeDocument.activeLayer.groupItems.add();
                holder.name = PREVIEW_NAME;
                previewItems = [holder];
                engine.draw(holder, false);
                translateItems(previewItems, offsetXmm * MM, offsetYmm * MM);
            } catch (e) {}
        }
        try { app.redraw(); } catch (e) {}
    }

    // 컨트롤 변경 시 미리보기 갱신
    chkNucleus.onClick = updatePreview;
    chkShowMinus.onClick = updatePreview;
    chkShellLine.onClick = updatePreview;
    chkLit3DNucleus.onClick = updatePreview;
    chkLit3DElectron.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        tabIndex = next;
        engine = engines[tabIndex];
        seedFromGuideCircle();
        updatePreview();
    };

    // --- 옵션 기억 (마지막 실행 설정을 다음 실행 때 복원) ---
    // 공통 항목(탭·옵션·크기·이동) 뒤에 탭별 항목을 순서대로 잇는다. 항목 수가 바뀌면 v를 올린다
    var PREF_KEY = "ParticleModel/settings";
    var LEGACY_SHARED_KEY = "ModelMakerShared/settings"; // 탭으로 묶기 전 세 스크립트가 공유하던 공통 옵션. 새 키가 비었을 때만 읽는다
    function collectSettings() {
        var parts = ["v1", tabIndex,
            chkNucleus.value ? "1" : "0",
            chkShowMinus.value ? "1" : "0",
            chkShellLine.value ? "1" : "0",
            chkLit3DNucleus.value ? "1" : "0",
            chkLit3DElectron.value ? "1" : "0",
            chkPreview.value ? "1" : "0",
            sldOverall.value,
            sldNucleus.value,
            sldElectron.value,
            sldChargeFont.value,
            offsetXmm,
            offsetYmm];
        for (var i = 0; i < engines.length; i++) parts = parts.concat(engines[i].saveFields());
        return parts.join("|");
    }
    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, collectSettings()); } catch (e) {}
    }
    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) { applyLegacySharedSettings(); return; }
        var p = String(raw).split("|");
        var expected = 14;
        for (var i = 0; i < engines.length; i++) expected += engines[i].fieldCount;
        if (p[0] !== "v1" || p.length !== expected) return;
        try {
            tabIndex = restoreInteger(p[1], 0, 0, engines.length - 1);
            chkNucleus.value = (p[2] === "1");
            chkShowMinus.value = (p[3] === "1");
            chkShellLine.value = (p[4] === "1");
            chkLit3DNucleus.value = (p[5] === "1");
            chkLit3DElectron.value = (p[6] === "1");
            chkPreview.value = (p[7] === "1");
            restoreSlider(sldOverall, p[8]);
            restoreSlider(sldNucleus, p[9]);
            restoreSlider(sldElectron, p[10]);
            restoreSlider(sldChargeFont, p[11]);
            restoreSlider(sldOffsetX, p[12]);
            restoreSlider(sldOffsetY, p[13]);
            offsetXmm = sldOffsetX.value;
            offsetYmm = sldOffsetY.value;
            var at = 14;
            for (i = 0; i < engines.length; i++) {
                engines[i].restoreFields(p.slice(at, at + engines[i].fieldCount));
                at += engines[i].fieldCount;
            }
            syncSliderLabels();
            // 복원값을 기준선으로 삼아 이후 비율 계산이 맞도록 갱신
            prevOverall = sldOverall.value;
            prevNucleus = sldNucleus.value;
        } catch (e) {}
    }
    function applyLegacySharedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(LEGACY_SHARED_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v2" || p.length < 10) return;
        try {
            chkNucleus.value = (p[1] === "1");
            chkShowMinus.value = (p[2] === "1");
            chkShellLine.value = (p[3] === "1");
            chkLit3DNucleus.value = (p[4] === "1");
            chkLit3DElectron.value = (p[5] === "1");
            restoreSlider(sldOverall, p[6]);
            restoreSlider(sldNucleus, p[7]);
            restoreSlider(sldElectron, p[8]);
            restoreSlider(sldChargeFont, p[9]);
            syncSliderLabels();
            prevOverall = sldOverall.value;
            prevNucleus = sldNucleus.value;
        } catch (e) {}
    }
    // 슬라이더는 [min,max]로 스스로 클램프하므로 숫자인지만 본다
    function restoreSlider(sld, text) {
        var value = parseFloat(text);
        if (isFinite(value)) sld.value = value;
    }
    function restoreInteger(text, fallback, minimum, maximum) {
        var value = parseInt(text, 10);
        if (!isFinite(value) || value < minimum || value > maximum) return fallback;
        return value;
    }

    // 생성 버튼: 검증 후 설정 저장하고 닫는다. 실제 생성은 show() 반환 후 처리
    btnGenerate.onClick = function() {
        if (engine.selectedCount() === 0) { alert(engine.emptyMessage); return; }
        saveSettings();
        win.close(1);
    };

    // 이전 세션 잔여 미리보기 정리 + 마지막 실행 설정 복원
    removeLeftoverPreviews();
    applySettings();
    engine = engines[tabIndex];
    tabs.selection = tabIndex;

    // 가이드 원(=최외곽 껍질 지름)이 선택돼 있으면 현재 탭에서 고른 항목의 최대 껍질 수로
    // 환산해 '1껍질 지름'을 세팅하고, 핵/전자/글자를 같은 비율로 함께 조정한다.
    function seedFromGuideCircle() {
        var g = detectGuideCircle();
        if (!g) return;
        var maxShells = engine.maxShells();
        var before = sldOverall.value;
        sldOverall.value = (g.d / MM) * shellRatio[0] / shellRatio[maxShells - 1]; // pt → mm 환산 후 1껍질 기준
        var r = sldOverall.value / before;
        scaleSlider(sldNucleus, r);
        scaleSlider(sldElectron, r);
        scaleSlider(sldChargeFont, r);
        for (var i = 0; i < engines.length; i++) engines[i].scaleWith(r);
        sldOverall.syncLabel();
        prevOverall = sldOverall.value;
        prevNucleus = sldNucleus.value;
    }
    seedFromGuideCircle();

    // 초기 미리보기: 표시 전 1회 + 표시 시점(onShow)에 다시 그려야 화면에 보인다.
    // (show() 전 redraw는 모달 창이 뜨며 이전 화면으로 덮이므로 초기 미리보기가 안 보임)
    win.onShow = function() { updatePreview(); };
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();

    // 미리보기 정리 후, 확인(1)일 때만 최종 오브젝트 생성(가이드 원 삭제 포함)
    clearPreview();
    try { app.redraw(); } catch (e) {} // 미리보기 잔여 제거를 먼저 반영해 깨끗한 상태에서 생성
    if (result === 1 && app.documents.length > 0) {
        try { translateItems(engine.draw(app.activeDocument.activeLayer, true), offsetXmm * MM, offsetYmm * MM); } catch (e) { alert("생성 오류: " + e); }
        try { app.redraw(); } catch (e) {}
    }

    // ---- 다이얼로그 도우미 ------------------------------------------------

    function addSlider(parent, labelText, minV, maxV, initV, unit, step) {
        // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장)
        var g = parent.add("group");
        g.spacing = 3;
        var lab = g.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
        lab.preferredSize.width = 90;
        var input = g.add("edittext", undefined, "");
        input.characters = 5;
        var s = g.add("scrollbar", undefined, initV, minV, maxV);
        s.stepdelta = step;
        s.jumpdelta = step * 10;
        s.preferredSize.width = 196;
        var decimals = step < 1 ? 1 : 0;
        s.syncLabel = function() { input.text = s.value.toFixed(decimals); };
        s.syncLabel();
        // 드래그 중엔 라벨만(가벼움), 놓을 때(onChange) 무거운 미리보기 재드로우 → MRAP 부하 감소
        s.onChanging = function() { s.syncLabel(); };
        s.onChange = function() { s.syncLabel(); updatePreview(); };
        // 입력창은 드래그와 같은 순서로 onChanging → onChange를 부른다
        function setValue(value) {
            value = Math.min(maxV, Math.max(minV, Math.round(value / step) * step));
            if (value === s.value) { s.syncLabel(); return; }
            s.value = value;
            s.onChanging();
            s.onChange();
        }
        input.onChange = function() {
            var typed = Number(input.text);
            if (!isFinite(typed) || !/\S/.test(input.text)) { s.syncLabel(); return; }
            setValue(typed);
        };
        sliderSyncers.push(s.syncLabel);
        return s;
    }
    function syncSliderLabels() { for (var i = 0; i < sliderSyncers.length; i++) sliderSyncers[i](); }
    function scaleSlider(sld, ratio) {
        if (!isFinite(ratio) || ratio <= 0) return;
        sld.value = sld.value * ratio; // 슬라이더가 [min,max]로 클램프
        sld.syncLabel();
    }

    // 체크박스 격자 + 전체 해제 버튼. 항목을 고르면 미리보기를 다시 그린다
    function addCheckGrid(page, title, labels, perRow, width, defaultLabel) {
        var pnl = page.add("panel", undefined, title);
        pnl.alignChildren = "left";
        var gridGroup = pnl.add("group");
        gridGroup.orientation = "column";
        gridGroup.spacing = 5;
        var row;
        var boxes = [];
        for (var i = 0; i < labels.length; i++) {
            if (i % perRow === 0) row = gridGroup.add("group");
            boxes[i] = row.add("checkbox", undefined, labels[i]);
            boxes[i].preferredSize.width = width;
            boxes[i].onClick = updatePreview;
            if (labels[i] === defaultLabel) boxes[i].value = true;
        }
        var btnDeselect = pnl.add("button", undefined, "전체 해제");
        btnDeselect.alignment = "right";
        btnDeselect.onClick = function() { for (var i = 0; i < boxes.length; i++) boxes[i].value = false; updatePreview(); };
        return boxes;
    }
    function checkedString(boxes) {
        var text = "";
        for (var i = 0; i < boxes.length; i++) text += boxes[i].value ? "1" : "0";
        return text;
    }
    function restoreChecked(boxes, text) {
        text = String(text || "");
        for (var i = 0; i < boxes.length && i < text.length; i++) boxes[i].value = (text.charAt(i) === "1");
    }
    function countChecked(boxes) {
        var n = 0;
        for (var i = 0; i < boxes.length; i++) if (boxes[i].value) n++;
        return n;
    }

    // ==== 원자 엔진 ==========================================================
    // 엔진 인터페이스: label·emptyMessage / addRows(page) / selectedCount() / maxShells() / draw(layer, consumeGuide) /
    // scaleWith(ratio) / fieldCount·saveFields()·restoreFields(fields)

    function makeAtomEngine() {
        // 1. 데이터 정의
        var elements = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
        var chargeLabels = ["-3", "-2", "-1", "0", "+1", "+2", "+3"];
        var checkBoxes, chargeRadios, chkHorizontalFirst, chkRotateShell2, chkRotateShell3;

        var api = {
            label: "원자",
            emptyMessage: "원소를 선택하세요.",
            fieldCount: 5,
            addRows: addRows,
            selectedCount: function() { return countChecked(checkBoxes); },
            maxShells: maxShells,
            draw: drawWith,
            scaleWith: function() {},
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function addRows(page) {
            checkBoxes = addCheckGrid(page, "원소 기호 (다중 선택)", elements, 6, 50, "Na");

            // --- 이온 전하 패널 ---
            var pnlCharge = page.add("panel", undefined, "이온 전하");
            pnlCharge.orientation = "row";
            chargeRadios = [];
            for (var j = 0; j < chargeLabels.length; j++) {
                chargeRadios[j] = pnlCharge.add("radiobutton", undefined, chargeLabels[j]);
                chargeRadios[j].onClick = updatePreview;
                if (chargeLabels[j] === "0") chargeRadios[j].value = true;
            }

            // --- 배치 옵션 ---
            var pnlLayout = page.add("panel", undefined, "배치");
            pnlLayout.orientation = "row";
            pnlLayout.alignChildren = ["left", "center"];
            chkHorizontalFirst = pnlLayout.add("checkbox", undefined, "1번 껍질 수평 배열");
            chkRotateShell2 = pnlLayout.add("checkbox", undefined, "2번 껍질 22.5° 이동");
            chkRotateShell3 = pnlLayout.add("checkbox", undefined, "3번 껍질 22.5° 이동");
            chkHorizontalFirst.onClick = updatePreview;
            chkRotateShell2.onClick = updatePreview;
            chkRotateShell3.onClick = updatePreview;
        }

        // --- 현재 UI 값 읽기 / 그리기 호출 ---
        function getSelectedElements() {
            var sel = [];
            for (var k = 0; k < checkBoxes.length; k++) if (checkBoxes[k].value) sel.push(k + 1);
            return sel;
        }
        function currentCharge() {
            for (var r = 0; r < chargeRadios.length; r++) if (chargeRadios[r].value) return parseInt(chargeLabels[r], 10);
            return 0;
        }
        function drawWith(targetLayer, consumeGuide) {
            var sel = getSelectedElements();
            if (sel.length === 0) return [];
            return drawAtomModel(sel.join(","), String(currentCharge()), chkNucleus.value,
                chkHorizontalFirst.value, chkRotateShell2.value, chkRotateShell3.value, chkShowMinus.value,
                chkLit3DNucleus.value, chkLit3DElectron.value, chkShellLine.value,
                sldOverall.value, sldNucleus.value, sldElectron.value, sldChargeFont.value, targetLayer, consumeGuide);
        }
        // 선택된 원소의 최대 껍질 수 (가이드 원 환산용). 선택이 없으면 3
        function maxShells() {
            var zs = getSelectedElements();
            var q = currentCharge();
            if (zs.length === 0) return 3;
            var max = 1;
            for (var zi = 0; zi < zs.length; zi++) {
                var ec = Math.max(0, zs[zi] - q);
                var sn = (ec > 10) ? 3 : (ec > 2 ? 2 : (ec > 0 ? 1 : 0));
                if (sn > max) max = sn;
            }
            return max;
        }

        function saveFields() {
            var ci = 3;
            for (var r = 0; r < chargeRadios.length; r++) if (chargeRadios[r].value) { ci = r; break; }
            return [checkedString(checkBoxes), ci, chkHorizontalFirst.value ? "1" : "0",
                chkRotateShell2.value ? "1" : "0", chkRotateShell3.value ? "1" : "0"];
        }
        function restoreFields(f) {
            restoreChecked(checkBoxes, f[0]);
            var ci = restoreInteger(f[1], 3, 0, chargeRadios.length - 1);
            for (var r = 0; r < chargeRadios.length; r++) chargeRadios[r].value = (r === ci);
            chkHorizontalFirst.value = (f[2] === "1");
            chkRotateShell2.value = (f[3] === "1");
            chkRotateShell3.value = (f[4] === "1");
        }

        // 3. 핵심 그리기 로직
        // 3. 핵심 그리기 로직 (추가된 파라미터 적용)
        function drawAtomModel(atomicNumbersStr, ionChargeStr, showNucleusTextStr, optHorizontalFirst, optRotateShell2, optRotateShell3, optShowMinus, optLit3DNucleus, optLit3DElectron, optShellLine, outerMM, nucMM, elecMM, fontPt, targetLayer, consumeGuide) {
            if (app.documents.length === 0) return [];

            var atomStrings = atomicNumbersStr.split(",");
            var atomicNumbers = [];
            for (var k = 0; k < atomStrings.length; k++) {
                atomicNumbers.push(parseInt(atomStrings[k], 10));
            }

            var ionCharge = parseInt(ionChargeStr, 10);
            var showNucleusText = (showNucleusTextStr === true);
            var elementSymbols = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
            var fontName = "GSMediumB1"; // 지정 서체명

            var doc = app.activeDocument;
            var layer = targetLayer ? targetLayer : doc.activeLayer;
            var centerPoint = doc.activeView.centerPoint;
            var startCx = centerPoint[0];
            var cy = centerPoint[1];

            // 선택된 정원(원)이 있으면 그 "중심"으로 모형을 옮기고 원은 삭제한다.
            // 크기는 이미 전체 크기(mm) 슬라이더에 원 지름이 반영돼 있으므로 별도 확대/축소는 하지 않는다.
            var g = detectGuideCircle();
            var guide = g ? g.item : null, guideCx = g ? g.cx : 0, guideCy = g ? g.cy : 0;

            // scale: 도형 전반(껍질·간격·괄호)에 곱하는 무차원 배율. 핵/전자/글자는 절대값을 그대로 사용.
            // 1번 껍질 지름 = outerMM(mm)이 되도록 산출 (껍질 수와 무관하게 동일).
            var scale = outerMM / shellRatio[0];
            var shellD = [shellRatio[0]*MM*scale, shellRatio[1]*MM*scale, shellRatio[2]*MM*scale];

            function getCMYK(c, m, y, k) {
                var color = new CMYKColor();
                color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
                return color;
            }
            var colorWhite = getCMYK(0, 0, 0, 0);
            var colorGray50 = getCMYK(0, 0, 0, 50);
            var colorGray80 = getCMYK(0, 0, 0, 80);
            var colorBlack = getCMYK(0, 0, 0, 100);

            // 그라데이션은 문서당 1회만 생성해 재사용 (미리보기 반복 대비)
            var grads = getGradients(doc);
            var shellGrad = grads.shell;
            var sphereGrad = grads.sphere;
            var sphereNucGrad = grads.sphereNuc;

            // 구(핵/전자)에 방사형 그라데이션을 적용하는 헬퍼
            // 주의: 최신 Illustrator에서는 GradientColor의 origin/matrix/hilite 속성이
            // 스크립트로는 무시되므로, 3D 조명은 "하이라이트를 중심으로 한 큰 원을
            // 원래 크기 원으로 클리핑"하는 방식으로 구현한다.
            function applySphereFill(item, ox, oy, dia, lit3D, flatColor, grad) {
                if (!lit3D) {
                    // 3D 효과 꺼짐 → 그라데이션 없이 플랫 단색 (기본: 핵 전하량 표시와 동일한 톤)
                    item.fillColor = flatColor ? flatColor : colorGray80;
                    return item;
                }
                var gc = new GradientColor();
                gc.gradient = grad ? grad : sphereGrad;
                var r = dia / 2;
                var hx = ox - r * 0.35;  // 하이라이트 중심 (좌측 상단, 중심에서 살짝 치우침)
                var hy = oy + r * 0.35;
                var R = r * 1.7;         // 큰 원 반지름: 우하단 가장자리가 어두워지도록 확대
                var grp = item.parent.groupItems.add();
                var big = grp.pathItems.ellipse(hy + R, hx - R, R * 2, R * 2);
                big.filled = true; big.stroked = false;
                big.fillColor = gc;
                var mask = grp.pathItems.ellipse(oy + r, ox - r, dia, dia);
                mask.filled = false; mask.stroked = false;
                mask.clipping = true;
                grp.clipped = true;
                item.remove();
                return grp;
            }

            var currentCx = startCx;
            var GAP = 5 * MM * scale;
            var previousRightBounds = 0;
            var nDia = nucMM * MM; // 핵 지름: 절대 실측치(pt)

            // 가이드 원이 있으면 모든 원자를 하나의 그룹에 담아 마지막에 함께 이동한다.
            var masterGroup = guide ? layer.groupItems.add() : null;
            var container = masterGroup ? masterGroup : layer;
            var created = []; // 최상위로 추가된 항목(미리보기 제거용)

            for (var i = 0; i < atomicNumbers.length; i++) {
                var atomicNumber = atomicNumbers[i];
                var electronCount = Math.max(0, atomicNumber - ionCharge);
                var eCount1 = Math.min(electronCount, 2);
                var eCount2 = Math.min(Math.max(0, electronCount - 2), 8);
                var eCount3 = Math.min(Math.max(0, electronCount - 10), 8);
                var shellsNeeded = (eCount3 > 0) ? 3 : (eCount2 > 0 ? 2 : (eCount1 > 0 ? 1 : 0));

                var baseRadius = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
                var leftBounds = baseRadius + (1 * MM * scale);
                var rightBounds = baseRadius + (1 * MM * scale);

                if (ionCharge !== 0) {
                    leftBounds = baseRadius + (4 * MM * scale);
                    rightBounds = baseRadius + (7 * MM * scale);
                }

                if (i === 0) { currentCx = startCx; }
                else { currentCx = currentCx + previousRightBounds + GAP + leftBounds; }

                previousRightBounds = rightBounds;
                var cx = currentCx;

                var atomGroup = container.groupItems.add();
                atomGroup.name = "Atom_" + elementSymbols[atomicNumber-1];
                if (!masterGroup) created.push(atomGroup);

                // 1. 전자 껍질 (선 옵션: 내부 투명 + 0.3pt 선 / 기본: 그라데이션 면)
                for (var s = shellsNeeded; s >= 1; s--) {
                    var dia = shellD[s-1];
                    var shell = atomGroup.pathItems.ellipse(cy + dia/2, cx - dia/2, dia, dia);
                    if (optShellLine) {
                        shell.filled = false; shell.stroked = true;
                        shell.strokeWidth = 0.3; shell.strokeColor = getCMYK(0, 0, 0, 100);
                    } else {
                        shell.filled = true; shell.stroked = false;
                        var gc = new GradientColor(); gc.gradient = shellGrad;
                        gc.matrix = app.getIdentityMatrix();
                        gc.origin = [cx, cy]; gc.length = dia / 2;
                        shell.fillColor = gc;
                    }
                }

                // 2. 원자핵
                var nucleus = atomGroup.pathItems.ellipse(cy + nDia/2, cx - nDia/2, nDia, nDia);
                nucleus.stroked = false;

                if (showNucleusText) {
                    nucleus.fillColor = colorGray80;
                    var t = atomGroup.textFrames.add();
                    t.contents = atomicNumber + "+";
                    t.textRange.characterAttributes.size = fontPt;
                    t.textRange.characterAttributes.fillColor = colorWhite;
                    try { t.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}

                    var outlinedGroup = t.createOutline();
                    var gb = outlinedGroup.geometricBounds;
                    outlinedGroup.translate(cx - (gb[0] + gb[2]) / 2, cy - (gb[1] + gb[3]) / 2);
                } else {
                    nucleus.filled = true;
                    applySphereFill(nucleus, cx, cy, nDia, optLit3DNucleus, colorGray50, sphereNucGrad); // 핵: 플랫 K50, 3D는 밝은 그라데이션
                }

                // 3. 전자
                var counts = [eCount1, eCount2, eCount3];

                // 1번 껍질 전자 배열 옵션 (수평 옵션 체크 시 0/180도, 기본은 수직 90/270도)
                var angles1 = optHorizontalFirst ? [0, 180] : [90, 270];

                // 2, 3번 껍질 전자 회전 옵션 (각 껍질 독립)
                var baseAnglesO = [90, -90, 0, 180, -135, 45, 135, -45];
                function shellAngles(rotate) {
                    var arr = [];
                    for (var a = 0; a < baseAnglesO.length; a++) arr.push(rotate ? baseAnglesO[a] + 22.5 : baseAnglesO[a]);
                    return arr;
                }
                var angles2 = shellAngles(optRotateShell2);
                var angles3 = shellAngles(optRotateShell3);

                var eDia = elecMM * MM; // 전자 지름: 절대 실측치(pt)

                for (var s = 1; s <= shellsNeeded; s++) {
                    var shellR = shellD[s-1]/2;
                    var curAngles = (s === 1) ? angles1 : (s === 2 ? angles2 : angles3);
                    for (var e = 0; e < counts[s-1]; e++) {
                        var rad = curAngles[e] * Math.PI / 180;
                        var ex = cx + shellR * Math.cos(rad);
                        var ey = cy + shellR * Math.sin(rad);
                        var electron = atomGroup.pathItems.ellipse(ey + eDia/2, ex - eDia/2, eDia, eDia);
                        electron.filled = true; electron.stroked = false;
                        applySphereFill(electron, ex, ey, eDia, optLit3DElectron, colorBlack); // 전자 플랫은 K100
                        if (optShowMinus) {
                            // - 기호는 전자 지름에 비례 (기존 1.5mm 전자 기준 폭 1.2mm, 높이 0.2mm)
                            var mW = eDia * 0.8, mH = eDia * (0.2/1.5);
                            var minus = atomGroup.pathItems.rectangle(ey + mH/2, ex - mW/2, mW, mH);
                            minus.filled = true; minus.stroked = false;
                            minus.fillColor = colorWhite;
                        }
                    }
                }

                // 4. 이온 대괄호 및 전하량 (서체 적용 부분)
                if (ionCharge !== 0) {
                    var brR = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
                    var gap = 2 * MM * scale;
                    var brW = 2 * MM * scale;
                    var drawBracket = function(isL, center_x, center_y, brRadius) {
                        var path = atomGroup.pathItems.add();
                        var m = isL ? -1 : 1;
                        var bx = center_x + (brRadius + gap) * m;
                        path.setEntirePath([[bx - brW*m, center_y + brRadius], [bx, center_y + brRadius], [bx, center_y - brRadius], [bx - brW*m, center_y - brRadius]]);
                        path.filled = false; path.stroked = true; path.strokeWidth = 0.3 * scale; path.strokeColor = getCMYK(0,0,0,100);
                    };
                    drawBracket(true, cx, cy, brR); drawBracket(false, cx, cy, brR);

                    var lbl = atomGroup.textFrames.add();
                    var absC = Math.abs(ionCharge);
                    lbl.contents = (absC > 1 ? absC : "") + (ionCharge > 0 ? "+" : "-");
                    lbl.textRange.characterAttributes.size = 6; // 이온 전하량 글자: 6pt 고정
                    // 이온 전하량 서체 적용
                    try { lbl.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}

                    lbl.left = cx + brR + gap + 0.5*MM*scale;
                    lbl.top = cy + brR + lbl.height * 0.7;
                }
            }

            // 가이드 원이 있으면 첫 원자의 중심(startCx, cy)을 원 중심으로 옮긴 뒤 원을 삭제.
            // 크기는 전체 크기(mm) 슬라이더에 이미 반영돼 있으므로 이동만 한다.
            if (guide && masterGroup) {
                masterGroup.translate(guideCx - startCx, guideCy - cy);
                if (consumeGuide !== false) guide.remove(); // 미리보기에서는 원을 지우지 않는다
            }
            if (masterGroup) created = [masterGroup];
            return created;
        }

        return api;
    }

    // ==== 분자 엔진 ==========================================================

    function makeMoleculeEngine() {
        // 원소 데이터: 원자번호, 껍질 수
        var ELEM = {
            H:  { z: 1,  shells: 1 },
            C:  { z: 6,  shells: 2 },
            N:  { z: 7,  shells: 2 },
            O:  { z: 8,  shells: 2 },
            F:  { z: 9,  shells: 2 },
            Cl: { z: 17, shells: 3 }
        };

        // 분자 프리셋: center를 원점에 두고 terminals를 angle 방향(도)으로 배치.
        // order = 공유 전자쌍 수(단일1/이중2/삼중3), lonePairs = 비공유 전자쌍 수.
        // 비공유 전자는 22.5° 회전 그리드(±22.5, ±67.5, ±112.5, ±157.5) 자리 중
        // 결합 방향에서 먼 자리부터 채운다.
        var MOLS = [
            { key: "H2",  label: "H₂",  center: { el: "H",  lonePairs: 0 },
              terminals: [ { el: "H", angle: 0, order: 1, lonePairs: 0 } ] },
            { key: "N2",  label: "N₂",  center: { el: "N",  lonePairs: 1 },
              terminals: [ { el: "N", angle: 0, order: 3, lonePairs: 1 } ] },
            { key: "O2",  label: "O₂",  center: { el: "O",  lonePairs: 2 },
              terminals: [ { el: "O", angle: 0, order: 2, lonePairs: 2 } ] },
            { key: "F2",  label: "F₂",  center: { el: "F",  lonePairs: 3 },
              terminals: [ { el: "F", angle: 0, order: 1, lonePairs: 3 } ] },
            { key: "Cl2", label: "Cl₂", center: { el: "Cl", lonePairs: 3 },
              terminals: [ { el: "Cl", angle: 0, order: 1, lonePairs: 3 } ] },
            { key: "HCl", label: "HCl", center: { el: "Cl", lonePairs: 3 },
              terminals: [ { el: "H", angle: 180, order: 1, lonePairs: 0 } ] },
            { key: "H2O", label: "H₂O", center: { el: "O",  lonePairs: 2 },
              terminals: [ { el: "H", angle: 217.5, order: 1, lonePairs: 0 },
                           { el: "H", angle: 322.5, order: 1, lonePairs: 0 } ] },
            { key: "CO2", label: "CO₂", center: { el: "C",  lonePairs: 0 },
              terminals: [ { el: "O", angle: 0,   order: 2, lonePairs: 2 },
                           { el: "O", angle: 180, order: 2, lonePairs: 2 } ] },
            { key: "Cl2O", label: "Cl₂O", center: { el: "O", lonePairs: 2 },
              terminals: [ { el: "Cl", angle: 0,   order: 1, lonePairs: 3 },
                           { el: "Cl", angle: 180, order: 1, lonePairs: 3 } ] },
            { key: "NH3", label: "NH₃", center: { el: "N",  lonePairs: 1 },
              terminals: [ { el: "H", angle: 180, order: 1, lonePairs: 0 },
                           { el: "H", angle: 0,   order: 1, lonePairs: 0 },
                           { el: "H", angle: 270, order: 1, lonePairs: 0 } ] },
            { key: "CH4", label: "CH₄", center: { el: "C",  lonePairs: 0 },
              terminals: [ { el: "H", angle: 90,  order: 1, lonePairs: 0 },
                           { el: "H", angle: 0,   order: 1, lonePairs: 0 },
                           { el: "H", angle: 270, order: 1, lonePairs: 0 },
                           { el: "H", angle: 180, order: 1, lonePairs: 0 } ] }
        ];

        // 두 각도(도) 사이의 최소 각거리
        function angDist(a, b) {
            var d = Math.abs(((a - b) % 360 + 360) % 360);
            return d > 180 ? 360 - d : d;
        }

        var checkBoxes, sldOverlap;

        var api = {
            label: "분자",
            emptyMessage: "분자를 선택하세요.",
            fieldCount: 2,
            addRows: addRows,
            selectedCount: function() { return countChecked(checkBoxes); },
            maxShells: maxShells,
            draw: drawWith,
            scaleWith: function() {},
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function addRows(page) {
            var labels = [];
            for (var i = 0; i < MOLS.length; i++) labels.push(MOLS[i].label);
            checkBoxes = addCheckGrid(page, "분자 (다중 선택)", labels, 5, 60, "O₂");
            var pnl = page.add("panel", undefined, "겹침");
            pnl.alignChildren = "left";
            pnl.spacing = 2;
            sldOverlap = addSlider(pnl, "껍질 겹침", 5, 50, 15, "%", 1);
        }

        function getSelectedMols() {
            var sel = [];
            for (var k = 0; k < checkBoxes.length; k++) if (checkBoxes[k].value) sel.push(MOLS[k]);
            return sel;
        }
        function drawWith(targetLayer, consumeGuide) {
            var sel = getSelectedMols();
            if (sel.length === 0) return [];
            return drawMolecules(sel, {
                showNucleusText: chkNucleus.value,
                showMinus: chkShowMinus.value,
                shellLine: chkShellLine.value,
                lit3DNucleus: chkLit3DNucleus.value,
                lit3DElectron: chkLit3DElectron.value,
                outerMM: sldOverall.value,
                nucMM: sldNucleus.value,
                elecMM: sldElectron.value,
                fontPt: sldChargeFont.value,
                overlapPct: sldOverlap.value
            }, targetLayer, consumeGuide);
        }
        // 선택된 분자 원자들의 최대 껍질 수 (가이드 원 환산용). 선택이 없으면 3
        function maxShells() {
            var sel = getSelectedMols();
            if (sel.length === 0) return 3;
            var max = 1;
            for (var si = 0; si < sel.length; si++) {
                var mol = sel[si];
                if (ELEM[mol.center.el].shells > max) max = ELEM[mol.center.el].shells;
                for (var ti = 0; ti < mol.terminals.length; ti++) {
                    if (ELEM[mol.terminals[ti].el].shells > max) max = ELEM[mol.terminals[ti].el].shells;
                }
            }
            return max;
        }

        function saveFields() {
            return [checkedString(checkBoxes), sldOverlap.value];
        }
        function restoreFields(f) {
            restoreChecked(checkBoxes, f[0]);
            restoreSlider(sldOverlap, f[1]);
        }

        // 3. 핵심 그리기 로직
        // 3. 핵심 그리기 로직
        function drawMolecules(mols, o, targetLayer, consumeGuide) {
            if (app.documents.length === 0) return [];
            var doc = app.activeDocument;
            var layer = targetLayer ? targetLayer : doc.activeLayer;
            var vc = doc.activeView.centerPoint;
            var startCx = vc[0], baseCy = vc[1];

            // 선택된 정원(원)이 있으면 첫 분자의 중심 원자를 그 중심으로 옮기고 원은 삭제.
            // 크기는 전체 크기(mm) 슬라이더에 원 지름이 이미 반영돼 있으므로 이동만 한다.
            var g = detectGuideCircle();
            var guide = g ? g.item : null, guideCx = g ? g.cx : 0, guideCy = g ? g.cy : 0;

            function getCMYK(c, m, y, k) {
                var color = new CMYKColor();
                color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
                return color;
            }
            var colorWhite = getCMYK(0, 0, 0, 0);
            var colorGray50 = getCMYK(0, 0, 0, 50);
            var colorGray80 = getCMYK(0, 0, 0, 80);
            var colorBlack = getCMYK(0, 0, 0, 100);

            var grads = getGradients(doc);
            var shellGrad = grads.shell;
            var sphereGrad = grads.sphere;
            var sphereNucGrad = grads.sphereNuc;

            // 구(핵/전자) 방사형 그라데이션: 하이라이트 중심의 큰 원을 원래 크기 원으로 클리핑
            function applySphereFill(item, ox, oy, dia, lit3D, flatColor, grad) {
                if (!lit3D) {
                    item.fillColor = flatColor ? flatColor : colorGray80;
                    return item;
                }
                var gc = new GradientColor();
                gc.gradient = grad ? grad : sphereGrad;
                var r = dia / 2;
                var hx = ox - r * 0.35;
                var hy = oy + r * 0.35;
                var R = r * 1.7;
                var grp = item.parent.groupItems.add();
                var big = grp.pathItems.ellipse(hy + R, hx - R, R * 2, R * 2);
                big.filled = true; big.stroked = false;
                big.fillColor = gc;
                var mask = grp.pathItems.ellipse(oy + r, ox - r, dia, dia);
                mask.filled = false; mask.stroked = false;
                mask.clipping = true;
                grp.clipped = true;
                item.remove();
                return grp;
            }

            var masterGroup = guide ? layer.groupItems.add() : null;
            var container = masterGroup ? masterGroup : layer;
            var created = [];
            var cursorX = null; // 이전 분자의 오른쪽 가장자리(pt)

            var innerAngles1 = [90, 270];
            var innerAngles2 = [90, -90, 0, 180, -135, 45, 135, -45];
            var eDia = o.elecMM * MM; // 전자 지름: 절대 실측치(pt)
            var nDia = o.nucMM * MM;  // 핵 지름: 절대 실측치(pt)

            for (var m = 0; m < mols.length; m++) {
                var mol = mols[m];

                // 1번 껍질 지름 = 슬라이더 값(mm)이 되도록 배율 산출 (껍질 수와 무관하게 동일)
                var scale = o.outerMM / shellRatio[0];
                function outerR(el) { return shellRatio[ELEM[el].shells - 1] / 2 * MM * scale; }

                // 원자 배치(로컬 좌표, pt): 중심 원자 원점, 말단 원자는 angle 방향으로 껍질이 겹치는 거리에
                var atoms = [ { el: mol.center.el, x: 0, y: 0, r: outerR(mol.center.el), lonePairs: mol.center.lonePairs, bondDirs: [] } ];
                var bonds = [];
                for (var t2 = 0; t2 < mol.terminals.length; t2++) {
                    var tm = mol.terminals[t2];
                    var rT = outerR(tm.el), rC = atoms[0].r;
                    var d = (rC + rT) * (1 - o.overlapPct / 100); // 겹침 %만큼 중심 거리 축소
                    var rad = tm.angle * Math.PI / 180;
                    atoms.push({ el: tm.el, x: d * Math.cos(rad), y: d * Math.sin(rad), r: rT, lonePairs: tm.lonePairs, bondDirs: [tm.angle + 180] });
                    atoms[0].bondDirs.push(tm.angle);
                    bonds.push({ a: 0, b: atoms.length - 1, order: tm.order, angle: tm.angle, d: d });
                }

                // 가로 배치: 분자별 로컬 x 범위로 좌우 나란히
                var minX = 1e9, maxX = -1e9;
                for (var ai0 = 0; ai0 < atoms.length; ai0++) {
                    if (atoms[ai0].x - atoms[ai0].r < minX) minX = atoms[ai0].x - atoms[ai0].r;
                    if (atoms[ai0].x + atoms[ai0].r > maxX) maxX = atoms[ai0].x + atoms[ai0].r;
                }
                var GAP = 8 * MM * scale;
                var offX;
                if (cursorX === null) { offX = startCx; } // 첫 분자: 중심 원자를 화면 중심에
                else { offX = cursorX + GAP - minX; }
                cursorX = offX + maxX;

                var grp = container.groupItems.add();
                grp.name = "Mol_" + mol.key;
                if (!masterGroup) created.push(grp);

                // 전자 1개 그리기
                function drawElectron(exx, eyy) {
                    var el = grp.pathItems.ellipse(eyy + eDia/2, exx - eDia/2, eDia, eDia);
                    el.filled = true; el.stroked = false;
                    applySphereFill(el, exx, eyy, eDia, o.lit3DElectron, colorBlack); // 전자 플랫은 K100
                    if (o.showMinus) {
                        var mW = eDia * 0.8, mH = eDia * (0.2/1.5);
                        var minus = grp.pathItems.rectangle(eyy + mH/2, exx - mW/2, mW, mH);
                        minus.filled = true; minus.stroked = false;
                        minus.fillColor = colorWhite;
                    }
                }
                // 1) 껍질: 모든 원자 먼저.
                //    선 옵션: 내부 투명 + 0.3pt 선 / 기본: 그라데이션 면 + 곱하기 블렌드(겹침 영역 표현)
                for (var ai = 0; ai < atoms.length; ai++) {
                    var A = atoms[ai];
                    var ax = A.x + offX, ay = A.y + baseCy;
                    var S = ELEM[A.el].shells;
                    for (var s = S; s >= 1; s--) {
                        var dia = shellRatio[s-1] * MM * scale;
                        var shell = grp.pathItems.ellipse(ay + dia/2, ax - dia/2, dia, dia);
                        if (o.shellLine) {
                            shell.filled = false; shell.stroked = true;
                            shell.strokeWidth = 0.3; shell.strokeColor = getCMYK(0, 0, 0, 100);
                        } else {
                            shell.filled = true; shell.stroked = false;
                            var gc = new GradientColor(); gc.gradient = shellGrad;
                            gc.matrix = app.getIdentityMatrix();
                            gc.origin = [ax, ay]; gc.length = dia / 2;
                            shell.fillColor = gc;
                            try { shell.blendingMode = BlendModes.MULTIPLY; } catch (e) {}
                        }
                    }
                }

                // 2) 핵 + 안쪽 껍질 전자 + 비공유 전자쌍
                for (var ai2 = 0; ai2 < atoms.length; ai2++) {
                    var A2 = atoms[ai2];
                    var ax2 = A2.x + offX, ay2 = A2.y + baseCy;

                    var nucleus = grp.pathItems.ellipse(ay2 + nDia/2, ax2 - nDia/2, nDia, nDia);
                    nucleus.stroked = false;
                    if (o.showNucleusText) {
                        nucleus.fillColor = colorGray80;
                        var tfr = grp.textFrames.add();
                        tfr.contents = ELEM[A2.el].z + "+";
                        tfr.textRange.characterAttributes.size = o.fontPt;
                        tfr.textRange.characterAttributes.fillColor = colorWhite;
                        try { tfr.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                        var og = tfr.createOutline();
                        var gb2 = og.geometricBounds;
                        og.translate(ax2 - (gb2[0] + gb2[2]) / 2, ay2 - (gb2[1] + gb2[3]) / 2);
                    } else {
                        nucleus.filled = true;
                        applySphereFill(nucleus, ax2, ay2, nDia, o.lit3DNucleus, colorGray50, sphereNucGrad); // 핵: 플랫 K50, 3D는 밝은 그라데이션
                    }

                    // 안쪽 껍질 전자(최외각 제외): 1번 껍질 2개, 2번 껍질 8개
                    var S2 = ELEM[A2.el].shells;
                    for (var s2 = 1; s2 < S2; s2++) {
                        var rr = shellRatio[s2-1] / 2 * MM * scale;
                        var angs = (s2 === 1) ? innerAngles1 : innerAngles2;
                        for (var e2 = 0; e2 < angs.length; e2++) {
                            var rd = angs[e2] * Math.PI / 180;
                            drawElectron(ax2 + rr * Math.cos(rd), ay2 + rr * Math.sin(rd));
                        }
                    }

                    // 비공유 전자: 공유(최외각) 껍질은 22.5° 회전 그리드 자리를 쓴다.
                    // 각 자리의 "모든 결합 방향과의 최소 각거리"가 큰 자리부터 비공유 전자 수만큼 채움.
                    var loneN = A2.lonePairs * 2;
                    if (loneN > 0) {
                        var grid = (S2 === 1) ? innerAngles1
                            : [22.5, 67.5, 112.5, 157.5, -157.5, -112.5, -67.5, -22.5];
                        var scored = [];
                        for (var gi = 0; gi < grid.length; gi++) {
                            var minD = 360;
                            for (var bi = 0; bi < A2.bondDirs.length; bi++) {
                                var dd = angDist(grid[gi], A2.bondDirs[bi]);
                                if (dd < minD) minD = dd;
                            }
                            scored.push({ ang: grid[gi], d: minD });
                        }
                        scored.sort(function(a, b) { return b.d - a.d; });
                        for (var L = 0; L < loneN && L < scored.length; L++) {
                            var la = scored[L].ang * Math.PI / 180;
                            drawElectron(ax2 + A2.r * Math.cos(la), ay2 + A2.r * Math.sin(la));
                        }
                    }
                }

                // 3) 공유 전자: 항상 껍질 선 위에 배치.
                //    단일: 두 껍질 선의 교차점(위/아래)에 1개씩.
                //    2중/3중: 겹침 렌즈의 좌/우 경계 호 위에 각각 2개/3개씩,
                //             결합 축을 기준으로 대칭 배치.
                for (var b = 0; b < bonds.length; b++) {
                    var B = bonds[b];
                    var A0 = atoms[B.a], A1 = atoms[B.b];
                    function clampCos(c) { return c > 1 ? 1 : (c < -1 ? -1 : c); }
                    var phiA = Math.acos(clampCos((B.d*B.d + A0.r*A0.r - A1.r*A1.r) / (2 * B.d * A0.r))); // 중심 원자에서 본 교차점 각(라디안)
                    var phiB = Math.acos(clampCos((B.d*B.d + A1.r*A1.r - A0.r*A0.r) / (2 * B.d * A1.r))); // 말단 원자에서 본 교차점 각
                    var bondRad = B.angle * Math.PI / 180;
                    var cxA = A0.x + offX, cyA = A0.y + baseCy;
                    var cxB = A1.x + offX, cyB = A1.y + baseCy;
                    // 렌즈 경계: 원 A의 호(결합 축 ±phiA), 원 B의 호(반대쪽 축 ±phiB)
                    var ptOnA = function(t) { var a = bondRad + t; return [cxA + A0.r * Math.cos(a), cyA + A0.r * Math.sin(a)]; };
                    var ptOnB = function(t) { var a = bondRad + Math.PI + t; return [cxB + A1.r * Math.cos(a), cyB + A1.r * Math.sin(a)]; };
                    if (B.order === 1) {
                        drawElectron(ptOnA(phiA)[0], ptOnA(phiA)[1]);
                        drawElectron(ptOnA(-phiA)[0], ptOnA(-phiA)[1]);
                    } else {
                        // 같은 호 위 전자 중심 간 목표 간격(호 길이) = 전자 지름의 1.2배.
                        // 렌즈 밖으로 벗어나지 않게 교차점 각의 80%로 제한.
                        var arcGap = eDia * 1.2;
                        var stepA = (B.order === 2) ? arcGap / 2 / A0.r : arcGap / A0.r;
                        var stepB = (B.order === 2) ? arcGap / 2 / A1.r : arcGap / A1.r;
                        stepA = Math.min(stepA, 0.8 * phiA);
                        stepB = Math.min(stepB, 0.8 * phiB);
                        var pts = (B.order === 2)
                            ? [ptOnA(stepA), ptOnA(-stepA), ptOnB(stepB), ptOnB(-stepB)]
                            : [ptOnA(stepA), ptOnA(0), ptOnA(-stepA), ptOnB(stepB), ptOnB(0), ptOnB(-stepB)];
                        for (var pi2 = 0; pi2 < pts.length; pi2++) drawElectron(pts[pi2][0], pts[pi2][1]);
                    }
                }
            }

            // 가이드 원이 있으면 첫 분자의 중심 원자(startCx, baseCy)를 원 중심으로 이동 후 원 삭제
            if (guide && masterGroup) {
                masterGroup.translate(guideCx - startCx, guideCy - baseCy);
                if (consumeGuide !== false) guide.remove(); // 미리보기에서는 원을 지우지 않는다
            }
            if (masterGroup) created = [masterGroup];
            return created;
        }

        return api;
    }

    // ==== 이온 결합 엔진 =====================================================

    function makeIonicEngine() {
        // 원소: 원자번호
        var ELEM = {
            Li: { z: 3 },  O: { z: 8 },   F: { z: 9 },  Na: { z: 11 },
            Mg: { z: 12 }, Cl: { z: 17 }, K: { z: 19 }, Ca: { z: 20 }
        };

        // 이온 결합 화합물 프리셋: ions 배열 순서대로 왼쪽→오른쪽 배치.
        // 1:2 조성은 홑 이온이 가운데 오도록 교대 배치(음-양-음, 양-음-양).
        // q = 이온 전하. 각 이온의 전자 수 = 원자번호 - q (2/8/8 순서로 채움).
        var COMPS = [
            { key: "LiF",   label: "LiF",   ions: [ {el:"Li", q:1}, {el:"F", q:-1} ] },
            { key: "NaF",   label: "NaF",   ions: [ {el:"Na", q:1}, {el:"F", q:-1} ] },
            { key: "NaCl",  label: "NaCl",  ions: [ {el:"Na", q:1}, {el:"Cl", q:-1} ] },
            { key: "KCl",   label: "KCl",   ions: [ {el:"K",  q:1}, {el:"Cl", q:-1} ] },
            { key: "Na2O",  label: "Na₂O",  ions: [ {el:"Na", q:1}, {el:"O", q:-2}, {el:"Na", q:1} ] },
            { key: "K2O",   label: "K₂O",   ions: [ {el:"K",  q:1}, {el:"O", q:-2}, {el:"K",  q:1} ] },
            { key: "MgO",   label: "MgO",   ions: [ {el:"Mg", q:2}, {el:"O", q:-2} ] },
            { key: "CaO",   label: "CaO",   ions: [ {el:"Ca", q:2}, {el:"O", q:-2} ] },
            { key: "MgCl2", label: "MgCl₂", ions: [ {el:"Cl", q:-1}, {el:"Mg", q:2}, {el:"Cl", q:-1} ] },
            { key: "CaCl2", label: "CaCl₂", ions: [ {el:"Cl", q:-1}, {el:"Ca", q:2}, {el:"Cl", q:-1} ] }
        ];

        var checkBoxes, chkShell1Horizontal, sldIonFont, sldGap;

        var api = {
            label: "이온 결합",
            emptyMessage: "화합물을 선택하세요.",
            fieldCount: 4,
            addRows: addRows,
            selectedCount: function() { return countChecked(checkBoxes); },
            maxShells: maxShells,
            draw: drawWith,
            // 전체 크기 연동: 이온 전하 글자와 이온 간격도 같은 비율로
            scaleWith: function(r) { scaleSlider(sldIonFont, r); scaleSlider(sldGap, r); },
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function addRows(page) {
            var labels = [];
            for (var i = 0; i < COMPS.length; i++) labels.push(COMPS[i].label);
            checkBoxes = addCheckGrid(page, "화합물 (다중 선택)", labels, 5, 65, "NaCl");
            var pnl = page.add("panel", undefined, "이온");
            pnl.alignChildren = "left";
            pnl.spacing = 2;
            chkShell1Horizontal = pnl.add("checkbox", undefined, "1껍질 전자 3시·9시");
            chkShell1Horizontal.onClick = updatePreview;
            sldIonFont = addSlider(pnl, "이온 전하 글자", 1, 20, 6, "pt", 0.1);
            sldGap = addSlider(pnl, "이온 간격", 0, 20, 8, "mm", 0.1);
        }

        function getSelectedComps() {
            var sel = [];
            for (var k = 0; k < checkBoxes.length; k++) if (checkBoxes[k].value) sel.push(COMPS[k]);
            return sel;
        }
        function drawWith(targetLayer, consumeGuide) {
            var sel = getSelectedComps();
            if (sel.length === 0) return [];
            return drawCompounds(sel, {
                showNucleusText: chkNucleus.value,
                showMinus: chkShowMinus.value,
                shellLine: chkShellLine.value,
                lit3DNucleus: chkLit3DNucleus.value,
                lit3DElectron: chkLit3DElectron.value,
                outerMM: sldOverall.value,
                nucMM: sldNucleus.value,
                elecMM: sldElectron.value,
                fontPt: sldChargeFont.value,
                ionFontPt: sldIonFont.value,
                shell1Horizontal: chkShell1Horizontal.value,
                gapMM: sldGap.value
            }, targetLayer, consumeGuide);
        }
        // 선택된 화합물 이온들의 최대 껍질 수 (가이드 원 환산용). 선택이 없으면 3
        function maxShells() {
            var sel = getSelectedComps();
            if (sel.length === 0) return 3;
            var max = 1;
            for (var si = 0; si < sel.length; si++) {
                for (var ii = 0; ii < sel[si].ions.length; ii++) {
                    var ec = ELEM[sel[si].ions[ii].el].z - sel[si].ions[ii].q;
                    var sn = (ec > 10) ? 3 : (ec > 2 ? 2 : (ec > 0 ? 1 : 0));
                    if (sn > max) max = sn;
                }
            }
            return max;
        }

        function saveFields() {
            return [checkedString(checkBoxes), chkShell1Horizontal.value ? "1" : "0", sldIonFont.value, sldGap.value];
        }
        function restoreFields(f) {
            restoreChecked(checkBoxes, f[0]);
            chkShell1Horizontal.value = (f[1] === "1");
            restoreSlider(sldIonFont, f[2]);
            restoreSlider(sldGap, f[3]);
        }

        // 3. 핵심 그리기 로직
        // 3. 핵심 그리기 로직
        function drawCompounds(comps, o, targetLayer, consumeGuide) {
            if (app.documents.length === 0) return [];
            var doc = app.activeDocument;
            var layer = targetLayer ? targetLayer : doc.activeLayer;
            var vc = doc.activeView.centerPoint;
            var startCx = vc[0], cy = vc[1];

            // 선택된 정원(원)이 있으면 첫 이온의 중심을 그 중심으로 옮기고 원은 삭제.
            var g = detectGuideCircle();
            var guide = g ? g.item : null, guideCx = g ? g.cx : 0, guideCy = g ? g.cy : 0;

            function getCMYK(c, m, y, k) {
                var color = new CMYKColor();
                color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
                return color;
            }
            var colorWhite = getCMYK(0, 0, 0, 0);
            var colorGray50 = getCMYK(0, 0, 0, 50);
            var colorGray80 = getCMYK(0, 0, 0, 80);
            var colorBlack = getCMYK(0, 0, 0, 100);

            var grads = getGradients(doc);
            var shellGrad = grads.shell;
            var sphereGrad = grads.sphere;
            var sphereNucGrad = grads.sphereNuc;

            // 구(핵/전자) 방사형 그라데이션: 하이라이트 중심의 큰 원을 원래 크기 원으로 클리핑
            function applySphereFill(item, ox, oy, dia, lit3D, flatColor, grad) {
                if (!lit3D) {
                    item.fillColor = flatColor ? flatColor : colorGray80;
                    return item;
                }
                var gc = new GradientColor();
                gc.gradient = grad ? grad : sphereGrad;
                var r = dia / 2;
                var hx = ox - r * 0.35;
                var hy = oy + r * 0.35;
                var R = r * 1.7;
                var grp = item.parent.groupItems.add();
                var big = grp.pathItems.ellipse(hy + R, hx - R, R * 2, R * 2);
                big.filled = true; big.stroked = false;
                big.fillColor = gc;
                var mask = grp.pathItems.ellipse(oy + r, ox - r, dia, dia);
                mask.filled = false; mask.stroked = false;
                mask.clipping = true;
                grp.clipped = true;
                item.remove();
                return grp;
            }

            // 이온의 전자 껍질 배치: 전자 수를 2/8/8 순서로 채움
            function shellCounts(eCount) {
                var c1 = Math.min(eCount, 2);
                var c2 = Math.min(Math.max(0, eCount - 2), 8);
                var c3 = Math.min(Math.max(0, eCount - 10), 8);
                return [c1, c2, c3];
            }
            function shellsNeededOf(counts) {
                return (counts[2] > 0) ? 3 : (counts[1] > 0 ? 2 : (counts[0] > 0 ? 1 : 0));
            }

            var eDia = o.elecMM * MM; // 전자 지름: 절대 실측치(pt)
            var nDia = o.nucMM * MM;  // 핵 지름: 절대 실측치(pt)
            var angles1 = o.shell1Horizontal ? [0, 180] : [90, 270]; // 3시·9시 / 12시·6시
            var anglesO = [90, -90, 0, 180, -135, 45, 135, -45];

            var masterGroup = guide ? layer.groupItems.add() : null;
            var container = masterGroup ? masterGroup : layer;
            var created = [];
            var currentCx = startCx;
            var previousRightBounds = 0;
            var isFirst = true;

            for (var m = 0; m < comps.length; m++) {
                var comp = comps[m];

                // 1번 껍질 지름 = 슬라이더 값(mm)이 되도록 배율 산출 (껍질 수와 무관하게 동일)
                var scale = o.outerMM / shellRatio[0];
                var GAP = o.gapMM * MM;              // 이온 사이 간격(슬라이더 실측치)
                var COMP_GAP = GAP + 10 * MM * scale; // 화합물 사이 간격: 이온 간격보다 항상 크게

                var compGroup = container.groupItems.add();
                compGroup.name = "Ionic_" + comp.key;
                if (!masterGroup) created.push(compGroup);

                for (var ii = 0; ii < comp.ions.length; ii++) {
                    var ion = comp.ions[ii];
                    var z = ELEM[ion.el].z;
                    var counts = shellCounts(z - ion.q);
                    var shellsNeeded = shellsNeededOf(counts);
                    var shellD = [shellRatio[0]*MM*scale, shellRatio[1]*MM*scale, shellRatio[2]*MM*scale];

                    var baseRadius = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
                    var brGap = 2 * MM * scale;                     // 껍질과 대괄호 사이 여백
                    var leftBounds = baseRadius + brGap;            // 왼쪽 대괄호 바깥면까지

                    if (isFirst) { currentCx = startCx; isFirst = false; }
                    else {
                        var gap = (ii === 0) ? COMP_GAP : GAP;
                        currentCx = currentCx + previousRightBounds + gap + leftBounds;
                    }
                    var cx = currentCx;

                    // 1. 전자 껍질 (선 옵션: 내부 투명 + 0.3pt 선 / 기본: 그라데이션 면)
                    for (var s = shellsNeeded; s >= 1; s--) {
                        var dia = shellD[s-1];
                        var shell = compGroup.pathItems.ellipse(cy + dia/2, cx - dia/2, dia, dia);
                        if (o.shellLine) {
                            shell.filled = false; shell.stroked = true;
                            shell.strokeWidth = 0.3; shell.strokeColor = getCMYK(0, 0, 0, 100);
                        } else {
                            shell.filled = true; shell.stroked = false;
                            var gc = new GradientColor(); gc.gradient = shellGrad;
                            gc.matrix = app.getIdentityMatrix();
                            gc.origin = [cx, cy]; gc.length = dia / 2;
                            shell.fillColor = gc;
                        }
                    }

                    // 2. 원자핵
                    var nucleus = compGroup.pathItems.ellipse(cy + nDia/2, cx - nDia/2, nDia, nDia);
                    nucleus.stroked = false;
                    if (o.showNucleusText) {
                        nucleus.fillColor = colorGray80;
                        var t = compGroup.textFrames.add();
                        t.contents = z + "+";
                        t.textRange.characterAttributes.size = o.fontPt;
                        t.textRange.characterAttributes.fillColor = colorWhite;
                        try { t.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                        var outlinedGroup = t.createOutline();
                        var gb = outlinedGroup.geometricBounds;
                        outlinedGroup.translate(cx - (gb[0] + gb[2]) / 2, cy - (gb[1] + gb[3]) / 2);
                    } else {
                        nucleus.filled = true;
                        applySphereFill(nucleus, cx, cy, nDia, o.lit3DNucleus, colorGray50, sphereNucGrad); // 핵: 플랫 K50, 3D는 밝은 그라데이션
                    }

                    // 3. 전자
                    for (var s2 = 1; s2 <= shellsNeeded; s2++) {
                        var shellR = shellD[s2-1]/2;
                        var curAngles = (s2 === 1) ? angles1 : anglesO;
                        for (var e = 0; e < counts[s2-1]; e++) {
                            var rad = curAngles[e] * Math.PI / 180;
                            var ex = cx + shellR * Math.cos(rad);
                            var ey = cy + shellR * Math.sin(rad);
                            var electron = compGroup.pathItems.ellipse(ey + eDia/2, ex - eDia/2, eDia, eDia);
                            electron.filled = true; electron.stroked = false;
                            applySphereFill(electron, ex, ey, eDia, o.lit3DElectron, colorBlack); // 전자 플랫은 K100
                            if (o.showMinus) {
                                var mW = eDia * 0.8, mH = eDia * (0.2/1.5);
                                var minus = compGroup.pathItems.rectangle(ey + mH/2, ex - mW/2, mW, mH);
                                minus.filled = true; minus.stroked = false;
                                minus.fillColor = colorWhite;
                            }
                        }
                    }

                    // 4. 이온 대괄호 및 전하량
                    var brR = baseRadius;
                    var brW = 2 * MM * scale;
                    var drawBracket = function(isL, center_x, center_y, brRadius) {
                        var path = compGroup.pathItems.add();
                        var mSign = isL ? -1 : 1;
                        var bx = center_x + (brRadius + brGap) * mSign;
                        path.setEntirePath([[bx - brW*mSign, center_y + brRadius], [bx, center_y + brRadius], [bx, center_y - brRadius], [bx - brW*mSign, center_y - brRadius]]);
                        path.filled = false; path.stroked = true; path.strokeWidth = 0.3 * scale; path.strokeColor = getCMYK(0,0,0,100);
                    };
                    drawBracket(true, cx, cy, brR); drawBracket(false, cx, cy, brR);

                    var lbl = compGroup.textFrames.add();
                    var absC = Math.abs(ion.q);
                    lbl.contents = (absC > 1 ? absC : "") + (ion.q > 0 ? "+" : "-");
                    lbl.textRange.characterAttributes.size = o.ionFontPt;
                    try { lbl.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                    lbl.left = cx + brR + brGap + 0.5*MM*scale;
                    lbl.top = cy + brR + lbl.height * 0.7;

                    // 다음 이온까지의 거리는 고정 여백이 아니라 실제로 그려진 오른쪽 끝에서 잰다.
                    // 그래야 간격 0에서 전하량 글자와 다음 이온의 왼쪽 대괄호가 맞닿는다.
                    var labelRight = lbl.left + lbl.width;
                    previousRightBounds = Math.max(brR + brGap, labelRight - cx);
                }
            }

            // 가이드 원이 있으면 첫 이온의 중심(startCx, cy)을 원 중심으로 이동 후 원 삭제
            if (guide && masterGroup) {
                masterGroup.translate(guideCx - startCx, guideCy - cy);
                if (consumeGuide !== false) guide.remove(); // 미리보기에서는 원을 지우지 않는다
            }
            if (masterGroup) created = [masterGroup];
            return created;
        }

        return api;
    }
})();
