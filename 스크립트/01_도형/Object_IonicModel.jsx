(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;               // 1mm = 2.834645669pt
    var shellRatio = [11.5, 17.5, 23.5]; // 껍질 지름 비율(원자 모형과 동일)
    var fontName = "GSMediumB1";         // 지정 서체명

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

    // 그라데이션은 문서당 1회만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
    var _gradCache = null, _gradCacheDoc = null;
    function getGradients(doc) {
        if (_gradCache && _gradCacheDoc === doc) return _gradCache;
        function cmyk(c, m, y, k) { var col = new CMYKColor(); col.cyan = c; col.magenta = m; col.yellow = y; col.black = k; return col; }
        var white = cmyk(0, 0, 0, 0), gray40 = cmyk(0, 0, 0, 40), gray80 = cmyk(0, 0, 0, 80);
        function uniq(baseName, stops) {
            var grad = doc.gradients.add();
            grad.name = baseName + "_" + (new Date().getTime());
            grad.type = GradientType.RADIAL;
            while (grad.gradientStops.length < stops.length) grad.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                grad.gradientStops[i].rampPoint = stops[i].pos;
                grad.gradientStops[i].color = stops[i].color;
                if (stops[i].mid) grad.gradientStops[i].midPoint = stops[i].mid;
            }
            return grad;
        }
        _gradCache = {
            shell: uniq("Shell", [{pos:0, color:white}, {pos:83, color:white, mid:87}, {pos:100, color:gray40}]),
            sphere: uniq("Sphere", [{pos:0, color:white, mid:13.3}, {pos:100, color:gray80}])
        };
        _gradCacheDoc = doc;
        return _gradCache;
    }

    // 선택 오브젝트가 "가이드 정원"인지 판별. 맞으면 중심/지름(pt)을 돌려준다.
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

    // 2. ScriptUI 창 구성
    var win = new Window("dialog", "이온 결합 모형 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;

    // --- 화합물 선택 패널 ---
    var pnlComp = win.add("panel", undefined, "화합물 (다중 선택)");
    pnlComp.alignChildren = "left";
    var gridGroup = pnlComp.add("group");
    gridGroup.orientation = "column";
    gridGroup.spacing = 5;

    var row;
    var checkBoxes = [];
    for (var i = 0; i < COMPS.length; i++) {
        if (i % 5 === 0) row = gridGroup.add("group");
        checkBoxes[i] = row.add("checkbox", undefined, COMPS[i].label);
        checkBoxes[i].preferredSize.width = 65;
        if (COMPS[i].key === "NaCl") checkBoxes[i].value = true;
    }

    var btnDeselect = pnlComp.add("button", undefined, "전체 해제");
    btnDeselect.alignment = "right";
    btnDeselect.onClick = function() { for (var i = 0; i < checkBoxes.length; i++) checkBoxes[i].value = false; updatePreview(); };

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
    pnlSize.spacing = 6;
    var sliderSyncers = [];
    function addSlider(labelText, minV, maxV, initV, fmt) {
        var g = pnlSize.add("group");
        var lab = g.add("statictext", undefined, labelText);
        lab.preferredSize.width = 70;
        var s = g.add("slider", undefined, initV, minV, maxV);
        s.preferredSize.width = 150;
        var t = g.add("statictext", undefined, fmt(initV));
        t.preferredSize.width = 55;
        s.syncLabel = function() { t.text = fmt(s.value); };
        s.onChanging = function() { s.syncLabel(); };
        s.onChange = function() { s.syncLabel(); updatePreview(); };
        sliderSyncers.push(s.syncLabel);
        return s;
    }
    function syncSliderLabels() { for (var i = 0; i < sliderSyncers.length; i++) sliderSyncers[i](); }
    // 모든 크기는 실제 적용값(화면 실측치). 전체 크기 = 가장 큰 이온의 최외곽 껍질 지름(mm).
    var sldOverall = addSlider("전체 크기", 5, 300, 40, function(v){ return v.toFixed(1) + "mm"; });
    var sldNucleus = addSlider("핵 지름", 0.5, 40, 6, function(v){ return v.toFixed(1) + "mm"; });
    var sldElectron = addSlider("전자 지름", 0.2, 15, 2, function(v){ return v.toFixed(1) + "mm"; });
    var sldChargeFont = addSlider("핵 전하량 글자", 1, 100, 8, function(v){ return v.toFixed(1) + "pt"; });
    var sldGap = addSlider("이온 간격", 0, 50, 8, function(v){ return v.toFixed(1) + "mm"; });

    // 연동 규칙(원자 모형과 동일):
    //  전체 크기 변경 → 핵·전자·글자·이온 간격이 같은 비율로 함께 조정.
    //  핵 지름 변경   → 글자만 같은 비율로 조정.
    var prevOverall = sldOverall.value;
    var prevNucleus = sldNucleus.value;
    function scaleSlider(sld, ratio) {
        if (!isFinite(ratio) || ratio <= 0) return;
        sld.value = sld.value * ratio;
        sld.syncLabel();
    }
    sldOverall.onChanging = function() {
        var r = sldOverall.value / prevOverall;
        scaleSlider(sldNucleus, r);
        scaleSlider(sldElectron, r);
        scaleSlider(sldChargeFont, r);
        scaleSlider(sldGap, r);
        prevOverall = sldOverall.value;
        prevNucleus = sldNucleus.value;
        sldOverall.syncLabel();
    };
    sldOverall.onChange = function() { sldOverall.syncLabel(); updatePreview(); };
    sldNucleus.onChanging = function() {
        scaleSlider(sldChargeFont, sldNucleus.value / prevNucleus);
        prevNucleus = sldNucleus.value;
        sldNucleus.syncLabel();
    };
    sldNucleus.onChange = function() { sldNucleus.syncLabel(); updatePreview(); };

    var btnGenerate = win.add("button", undefined, "이온 결합 모형 생성하기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

    // --- 현재 UI 값 읽기 / 그리기 호출 ---
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
            gapMM: sldGap.value
        }, targetLayer, consumeGuide);
    }

    // --- 아트보드 실시간 미리보기 ---
    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) { try { previewItems[i].remove(); } catch (e) {} }
        previewItems = [];
    }
    function removeLeftoverPreviews() {
        try {
            var d = app.activeDocument;
            for (var i = d.groupItems.length - 1; i >= 0; i--) {
                if (d.groupItems[i].name === "IonicModel_Preview") { try { d.groupItems[i].remove(); } catch (e) {} }
            }
        } catch (e) {}
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        clearPreview();
        if (chkPreview.value && getSelectedComps().length > 0) {
            try {
                var holder = app.activeDocument.activeLayer.groupItems.add();
                holder.name = "IonicModel_Preview";
                previewItems = [holder];
                drawWith(holder, false);
            } catch (e) {}
        }
        try { app.redraw(); } catch (e) {}
    }

    for (var ci = 0; ci < checkBoxes.length; ci++) checkBoxes[ci].onClick = updatePreview;
    chkNucleus.onClick = updatePreview;
    chkShowMinus.onClick = updatePreview;
    chkShellLine.onClick = updatePreview;
    chkLit3DNucleus.onClick = updatePreview;
    chkLit3DElectron.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

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
        var colorGray80 = getCMYK(0, 0, 0, 80);

        var grads = getGradients(doc);
        var shellGrad = grads.shell;
        var sphereGrad = grads.sphere;

        // 구(핵/전자) 방사형 그라데이션: 하이라이트 중심의 큰 원을 원래 크기 원으로 클리핑
        function applySphereFill(item, ox, oy, dia, lit3D) {
            if (!lit3D) {
                item.fillColor = colorGray80;
                return item;
            }
            var gc = new GradientColor();
            gc.gradient = sphereGrad;
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
        var angles1 = [90, 270];
        var anglesO = [90, -90, 0, 180, -135, 45, 135, -45];

        var masterGroup = guide ? layer.groupItems.add() : null;
        var container = masterGroup ? masterGroup : layer;
        var created = [];
        var currentCx = startCx;
        var previousRightBounds = 0;
        var isFirst = true;

        for (var m = 0; m < comps.length; m++) {
            var comp = comps[m];

            // 이 화합물에서 껍질이 가장 많은 이온의 최외곽 지름 = 전체 크기(mm)가 되도록 배율 산출
            var maxShells = 1;
            for (var pi = 0; pi < comp.ions.length; pi++) {
                var sn = shellsNeededOf(shellCounts(ELEM[comp.ions[pi].el].z - comp.ions[pi].q));
                if (sn > maxShells) maxShells = sn;
            }
            var scale = o.outerMM / shellRatio[maxShells - 1];
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
                var leftBounds = baseRadius + (4 * MM * scale);  // 대괄호 여백
                var rightBounds = baseRadius + (7 * MM * scale); // 대괄호+전하 라벨 여백

                if (isFirst) { currentCx = startCx; isFirst = false; }
                else {
                    var gap = (ii === 0) ? COMP_GAP : GAP;
                    currentCx = currentCx + previousRightBounds + gap + leftBounds;
                }
                previousRightBounds = rightBounds;
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
                    applySphereFill(nucleus, cx, cy, nDia, o.lit3DNucleus);
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
                        applySphereFill(electron, ex, ey, eDia, o.lit3DElectron);
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
                var brGap = 2 * MM * scale;
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
                lbl.textRange.characterAttributes.size = 8; // 이온 전하량 글자: 8pt 고정
                try { lbl.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                lbl.left = cx + brR + brGap + 0.5*MM*scale;
                lbl.top = cy + brR + lbl.height * 0.7;
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

    // --- 옵션 기억 (마지막 실행 설정을 다음 실행 때 복원) ---
    var PREF_KEY = "IonicModelMaker/settings";
    function collectSettings() {
        var parts = ["v1"];
        var sel = "";
        for (var i = 0; i < checkBoxes.length; i++) sel += checkBoxes[i].value ? "1" : "0";
        parts.push(sel);
        parts.push(chkNucleus.value ? "1" : "0");
        parts.push(chkShowMinus.value ? "1" : "0");
        parts.push(chkLit3DNucleus.value ? "1" : "0");
        parts.push(chkLit3DElectron.value ? "1" : "0");
        parts.push(chkPreview.value ? "1" : "0");
        parts.push(sldOverall.value);
        parts.push(sldNucleus.value);
        parts.push(sldElectron.value);
        parts.push(sldChargeFont.value);
        parts.push(chkShellLine.value ? "1" : "0");
        parts.push(sldGap.value);
        return parts.join("|");
    }
    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, collectSettings()); } catch (e) {}
    }
    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 11) return;
        try {
            var sel = p[1];
            for (var i = 0; i < checkBoxes.length && i < sel.length; i++) checkBoxes[i].value = (sel.charAt(i) === "1");
            chkNucleus.value = (p[2] === "1");
            chkShowMinus.value = (p[3] === "1");
            chkLit3DNucleus.value = (p[4] === "1");
            chkLit3DElectron.value = (p[5] === "1");
            chkPreview.value = (p[6] === "1");
            sldOverall.value = parseFloat(p[7]);
            sldNucleus.value = parseFloat(p[8]);
            sldElectron.value = parseFloat(p[9]);
            sldChargeFont.value = parseFloat(p[10]);
            if (p.length > 11) chkShellLine.value = (p[11] === "1"); // v1 후반 추가 필드(없으면 기본값 유지)
            if (p.length > 12) sldGap.value = parseFloat(p[12]);
            syncSliderLabels();
            prevOverall = sldOverall.value;
            prevNucleus = sldNucleus.value;
        } catch (e) {}
    }

    btnGenerate.onClick = function() {
        if (getSelectedComps().length === 0) { alert("화합물을 선택하세요."); return; }
        saveSettings();
        win.close(1);
    };

    // 이전 세션 잔여 미리보기 정리 + 마지막 실행 설정 복원
    removeLeftoverPreviews();
    applySettings();

    // 가이드 원이 선택돼 있으면 '전체 크기'를 그 원 지름(mm)으로 세팅하고 비례 연동
    (function seedFromGuideCircle() {
        var g = detectGuideCircle();
        if (!g) return;
        var before = sldOverall.value;
        sldOverall.value = g.d / MM;
        var r = sldOverall.value / before;
        scaleSlider(sldNucleus, r);
        scaleSlider(sldElectron, r);
        scaleSlider(sldChargeFont, r);
        sldOverall.syncLabel();
        prevOverall = sldOverall.value;
        prevNucleus = sldNucleus.value;
    })();

    // 초기 미리보기: 표시 전 1회 + 표시 시점(onShow)에 다시 그려야 화면에 보인다.
    win.onShow = function() { updatePreview(); };
    updatePreview();

    var result = win.show();

    clearPreview();
    try { app.redraw(); } catch (e) {}
    if (result === 1 && app.documents.length > 0) {
        try { drawWith(app.activeDocument.activeLayer, true); } catch (e) { alert("생성 오류: " + e); }
        try { app.redraw(); } catch (e) {}
    }
})();
