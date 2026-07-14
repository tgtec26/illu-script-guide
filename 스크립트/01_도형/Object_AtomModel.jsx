(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    // 1. 데이터 정의
    var elements = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];

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

    // 2. ScriptUI 창 구성
    var win = new Window("dialog", "원자 모형 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;

    // --- 원소 선택 패널 ---
    var pnlElement = win.add("panel", undefined, "원소 기호 (다중 선택)");
    pnlElement.alignChildren = "left";
    var gridGroup = pnlElement.add("group");
    gridGroup.orientation = "column";
    gridGroup.spacing = 5;

    var row;
    var checkBoxes = [];
    for (var i = 0; i < elements.length; i++) {
        if (i % 6 === 0) row = gridGroup.add("group");
        checkBoxes[i] = row.add("checkbox", undefined, elements[i]);
        checkBoxes[i].preferredSize.width = 50;
        if (elements[i] === "Na") checkBoxes[i].value = true;
    }

    var btnDeselect = pnlElement.add("button", undefined, "전체 해제");
    btnDeselect.alignment = "right";
    btnDeselect.onClick = function() { for (var i = 0; i < checkBoxes.length; i++) checkBoxes[i].value = false; updatePreview(); };

    // --- 이온 전하 패널 ---
    var pnlCharge = win.add("panel", undefined, "이온 전하");
    pnlCharge.orientation = "row";
    var chargeLabels = ["-3", "-2", "-1", "0", "+1", "+2", "+3"];
    var chargeRadios = [];
    for (var j = 0; j < chargeLabels.length; j++) {
        chargeRadios[j] = pnlCharge.add("radiobutton", undefined, chargeLabels[j]);
        if (chargeLabels[j] === "0") chargeRadios[j].value = true;
    }

    // --- 옵션 ---
    var chkNucleus = win.add("checkbox", undefined, "핵 전하량 표시");
    chkNucleus.value = true;
    
    // 추가된 배열 옵션 체크박스
    var chkHorizontalFirst = win.add("checkbox", undefined, "1번 전자 껍질 수평 배열");
    var chkRotateElectrons = win.add("checkbox", undefined, "2, 3번 전자 껍질 22.5도 이동");

    // 전자 - 기호 표시 여부
    var chkShowMinus = win.add("checkbox", undefined, "전자 - 기호 표시");
    chkShowMinus.value = true;
    // 핵/전자를 좌측 상단 조명(3D 구) 느낌으로 (각각 독립 선택)
    var chkLit3DNucleus = win.add("checkbox", undefined, "핵 3D 조명 효과");
    chkLit3DNucleus.value = true;
    var chkLit3DElectron = win.add("checkbox", undefined, "전자 3D 조명 효과");
    chkLit3DElectron.value = true;

    // --- 크기 조절 슬라이더 ---
    var pnlSize = win.add("panel", undefined, "크기 조절");
    pnlSize.alignChildren = "left";
    pnlSize.spacing = 6;
    function addSlider(labelText, minV, maxV, initV, fmt) {
        var g = pnlSize.add("group");
        var lab = g.add("statictext", undefined, labelText);
        lab.preferredSize.width = 70;
        var s = g.add("slider", undefined, initV, minV, maxV);
        s.preferredSize.width = 150;
        var t = g.add("statictext", undefined, fmt(initV));
        t.preferredSize.width = 55;
        s.onChanging = function() { t.text = fmt(s.value); updatePreview(); };
        return s;
    }
    var sldOverall = addSlider("전체 크기", 0.3, 2.5, 1.0, function(v){ return Math.round(v*100) + "%"; });
    var sldNucleus = addSlider("핵 지름", 1, 15, 5.5, function(v){ return v.toFixed(1) + "mm"; });
    var sldElectron = addSlider("전자 지름", 0.5, 5, 1.5, function(v){ return v.toFixed(1) + "mm"; });
    var sldChargeFont = addSlider("핵 전하량 글자", 3, 20, 7, function(v){ return v.toFixed(1) + "pt"; });

    // --- 미리보기 (아트보드 실시간) ---
    var chkPreview = win.add("checkbox", undefined, "미리보기 (아트보드에 실시간 표시)");
    chkPreview.value = true;

    var btnGenerate = win.add("button", undefined, "원자 모형 생성하기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

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
            chkHorizontalFirst.value, chkRotateElectrons.value, chkShowMinus.value,
            chkLit3DNucleus.value, chkLit3DElectron.value,
            sldOverall.value, sldNucleus.value, sldElectron.value, sldChargeFont.value, targetLayer, consumeGuide);
    }

    // --- 아트보드 실시간 미리보기 (Object_sphere 방식) ---
    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) { try { previewItems[i].remove(); } catch (e) {} }
        previewItems = [];
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        clearPreview();
        if (chkPreview.value && getSelectedElements().length > 0) {
            // 미리보기는 가이드 원을 삭제하지 않는다(consumeGuide=false).
            try { previewItems = drawWith(app.activeDocument.activeLayer, false); } catch (e) { previewItems = []; }
        }
        try { app.redraw(); } catch (e) {}
    }

    // 컨트롤 변경 시 미리보기 갱신
    for (var ci = 0; ci < checkBoxes.length; ci++) checkBoxes[ci].onClick = updatePreview;
    for (var ri = 0; ri < chargeRadios.length; ri++) chargeRadios[ri].onClick = updatePreview;
    chkNucleus.onClick = updatePreview;
    chkHorizontalFirst.onClick = updatePreview;
    chkRotateElectrons.onClick = updatePreview;
    chkShowMinus.onClick = updatePreview;
    chkLit3DNucleus.onClick = updatePreview;
    chkLit3DElectron.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

    // 3. 핵심 그리기 로직 (추가된 파라미터 적용)
    function drawAtomModel(atomicNumbersStr, ionChargeStr, showNucleusTextStr, optHorizontalFirst, optRotateElectrons, optShowMinus, optLit3DNucleus, optLit3DElectron, overallScale, nucleusDiaMM, electronDiaMM, chargeFontPt, targetLayer, consumeGuide) {
        if (app.documents.length === 0) return [];

        var atomStrings = atomicNumbersStr.split(",");
        var atomicNumbers = [];
        for (var k = 0; k < atomStrings.length; k++) {
            atomicNumbers.push(parseInt(atomStrings[k], 10));
        }

        var ionCharge = parseInt(ionChargeStr, 10);
        var showNucleusText = (showNucleusTextStr === true);
        var elementSymbols = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
        var MM = 2.834645669;
        var fontName = "GSMediumB1"; // 지정 서체명

        var doc = app.activeDocument;
        var layer = targetLayer ? targetLayer : doc.activeLayer;
        var centerPoint = doc.activeView.centerPoint;
        var startCx = centerPoint[0];
        var cy = centerPoint[1];

        // 선택된 정원(원)을 최외각 껍질의 크기·위치 기준으로 사용.
        // 그린 뒤 이 원의 크기에 맞춰 모형 전체를 확대/축소·이동하고, 원은 삭제한다.
        var guide = null, guideCx = 0, guideCy = 0, guideD = 0;
        if (doc.selection && doc.selection.length === 1 && doc.selection[0].typename === "PathItem" && doc.selection[0].closed) {
            var gsel = doc.selection[0];
            var gb = gsel.geometricBounds; // [left, top, right, bottom]
            var gw = gb[2] - gb[0];
            var gh = gb[1] - gb[3];
            if (gw > 0 && gh > 0 && Math.abs(gw - gh) <= gw * 0.05) {
                guide = gsel;
                guideCx = (gb[0] + gb[2]) / 2;
                guideCy = (gb[1] + gb[3]) / 2;
                guideD = gw;
            }
        }

        function getCMYK(c, m, y, k) {
            var color = new CMYKColor();
            color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
            return color;
        }
        var colorWhite = getCMYK(0, 0, 0, 0);
        var colorGray80 = getCMYK(0, 0, 0, 80);

        // 그라데이션은 문서당 1회만 생성해 재사용 (미리보기 반복 대비)
        var grads = getGradients(doc);
        var shellGrad = grads.shell;
        var sphereGrad = grads.sphere;

        // 구(핵/전자)에 방사형 그라데이션을 적용하는 헬퍼
        // 주의: 최신 Illustrator에서는 GradientColor의 origin/matrix/hilite 속성이
        // 스크립트로는 무시되므로, 3D 조명은 "하이라이트를 중심으로 한 큰 원을
        // 원래 크기 원으로 클리핑"하는 방식으로 구현한다.
        function applySphereFill(item, ox, oy, dia, lit3D) {
            if (!lit3D) {
                // 3D 효과 꺼짐 → 그라데이션 없이 플랫 단색 (핵 전하량 표시와 동일한 톤)
                item.fillColor = colorGray80;
                return item;
            }
            var gc = new GradientColor();
            gc.gradient = sphereGrad;
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
        var GAP = 5 * MM * overallScale;
        var previousRightBounds = 0;

        // 가이드 원이 있으면 모든 원자를 하나의 그룹에 담아 마지막에 함께 변환한다.
        var masterGroup = guide ? layer.groupItems.add() : null;
        var container = masterGroup ? masterGroup : layer;
        var firstOuterD = 0;
        var created = []; // 최상위로 추가된 항목(미리보기 제거용)

        for (var i = 0; i < atomicNumbers.length; i++) {
            var atomicNumber = atomicNumbers[i];
            var electronCount = Math.max(0, atomicNumber - ionCharge);
            var shellD = [11.5*MM*overallScale, 17.5*MM*overallScale, 23.5*MM*overallScale];
            var nDia = nucleusDiaMM * MM * overallScale;
            var eCount1 = Math.min(electronCount, 2);
            var eCount2 = Math.min(Math.max(0, electronCount - 2), 8);
            var eCount3 = Math.min(Math.max(0, electronCount - 10), 8);
            var shellsNeeded = (eCount3 > 0) ? 3 : (eCount2 > 0 ? 2 : (eCount1 > 0 ? 1 : 0));

            var baseRadius = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
            var leftBounds = baseRadius + (1 * MM * overallScale);
            var rightBounds = baseRadius + (1 * MM * overallScale);

            if (ionCharge !== 0) {
                leftBounds = baseRadius + (4 * MM * overallScale);
                rightBounds = baseRadius + (7 * MM * overallScale);
            }

            if (i === 0) { currentCx = startCx; } 
            else { currentCx = currentCx + previousRightBounds + GAP + leftBounds; }
            
            previousRightBounds = rightBounds;
            var cx = currentCx;

            if (i === 0) firstOuterD = (shellsNeeded > 0) ? shellD[shellsNeeded-1] : nDia;

            var atomGroup = container.groupItems.add();
            atomGroup.name = "Atom_" + elementSymbols[atomicNumber-1];
            if (!masterGroup) created.push(atomGroup);

            // 1. 전자 껍질
            for (var s = shellsNeeded; s >= 1; s--) {
                var dia = shellD[s-1];
                var shell = atomGroup.pathItems.ellipse(cy + dia/2, cx - dia/2, dia, dia);
                shell.filled = true; shell.stroked = false;
                var gc = new GradientColor(); gc.gradient = shellGrad;
                gc.matrix = app.getIdentityMatrix();
                gc.origin = [cx, cy]; gc.length = dia / 2;
                shell.fillColor = gc;
            }

            // 2. 원자핵
            var nucleus = atomGroup.pathItems.ellipse(cy + nDia/2, cx - nDia/2, nDia, nDia);
            nucleus.stroked = false;

            if (showNucleusText) {
                nucleus.fillColor = colorGray80;
                var t = atomGroup.textFrames.add();
                t.contents = atomicNumber + "+";
                t.textRange.characterAttributes.size = chargeFontPt * overallScale;
                t.textRange.characterAttributes.fillColor = colorWhite;
                try { t.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                
                var outlinedGroup = t.createOutline();
                var gb = outlinedGroup.geometricBounds;
                outlinedGroup.translate(cx - (gb[0] + gb[2]) / 2, cy - (gb[1] + gb[3]) / 2);
            } else {
                nucleus.filled = true;
                applySphereFill(nucleus, cx, cy, nDia, optLit3DNucleus);
            }

            // 3. 전자
            var counts = [eCount1, eCount2, eCount3];
            
            // 1번 껍질 전자 배열 옵션 (수평 옵션 체크 시 0/180도, 기본은 수직 90/270도)
            var angles1 = optHorizontalFirst ? [0, 180] : [90, 270];

            // 2, 3번 껍질 전자 회전 옵션
            var baseAnglesO = [90, -90, 0, 180, -135, 45, 135, -45];
            var anglesO = [];
            for (var a = 0; a < baseAnglesO.length; a++) {
                anglesO.push(optRotateElectrons ? baseAnglesO[a] + 22.5 : baseAnglesO[a]);
            }
            
            var eDia = electronDiaMM * MM * overallScale;

            for (var s = 1; s <= shellsNeeded; s++) {
                var shellR = shellD[s-1]/2;
                var curAngles = (s === 1) ? angles1 : anglesO;
                for (var e = 0; e < counts[s-1]; e++) {
                    var rad = curAngles[e] * Math.PI / 180;
                    var ex = cx + shellR * Math.cos(rad);
                    var ey = cy + shellR * Math.sin(rad);
                    var electron = atomGroup.pathItems.ellipse(ey + eDia/2, ex - eDia/2, eDia, eDia);
                    electron.filled = true; electron.stroked = false;
                    applySphereFill(electron, ex, ey, eDia, optLit3DElectron);
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
                var gap = 2 * MM * overallScale;
                var brW = 2 * MM * overallScale;
                var drawBracket = function(isL, center_x, center_y, brRadius) {
                    var path = atomGroup.pathItems.add();
                    var m = isL ? -1 : 1;
                    var bx = center_x + (brRadius + gap) * m;
                    path.setEntirePath([[bx - brW*m, center_y + brRadius], [bx, center_y + brRadius], [bx, center_y - brRadius], [bx - brW*m, center_y - brRadius]]);
                    path.filled = false; path.stroked = true; path.strokeWidth = 0.3 * overallScale; path.strokeColor = getCMYK(0,0,0,100);
                };
                drawBracket(true, cx, cy, brR); drawBracket(false, cx, cy, brR);

                var lbl = atomGroup.textFrames.add();
                var absC = Math.abs(ionCharge);
                lbl.contents = (absC > 1 ? absC : "") + (ionCharge > 0 ? "+" : "-");
                lbl.textRange.characterAttributes.size = 8 * overallScale;
                // 이온 전하량 서체 적용
                try { lbl.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}

                lbl.left = cx + brR + gap + 0.5*MM*overallScale;
                lbl.top = cy + brR + lbl.height * 0.7;
            }
        }

        // 가이드 원 기준으로 모형 전체를 확대/축소·이동한 뒤 원을 삭제.
        // 첫 원자의 중심(startCx, cy)을 기준점으로 스케일하고 가이드 중심으로 옮긴다.
        if (guide && firstOuterD > 0) {
            var sc = guideD / firstOuterD;
            var mtx = app.getScaleMatrix(sc * 100, sc * 100);
            mtx.mValueTX = guideCx - startCx * sc;
            mtx.mValueTY = guideCy - cy * sc;
            masterGroup.transform(mtx, true, true, true, true, 1, Transformation.DOCUMENTORIGIN);
            if (consumeGuide !== false) guide.remove(); // 미리보기에서는 원을 지우지 않는다
        }
        if (masterGroup) created = [masterGroup];
        return created;
    }

    // 생성 버튼: 검증 후 닫고, 실제 생성은 show() 반환 후 처리
    btnGenerate.onClick = function() {
        if (getSelectedElements().length === 0) { alert("원소를 선택하세요."); return; }
        win.close(1);
    };

    // 초기 미리보기: 표시 전 1회 + 표시 시점(onShow)에 다시 그려야 화면에 보인다.
    // (show() 전 redraw는 모달 창이 뜨며 이전 화면으로 덮이므로 초기 미리보기가 안 보임)
    win.onShow = function() { updatePreview(); };
    updatePreview();

    var result = win.show();

    // 미리보기 정리 후, 확인(1)일 때만 최종 오브젝트 생성(가이드 원 삭제 포함)
    clearPreview();
    if (result === 1 && app.documents.length > 0) {
        try { drawWith(app.activeDocument.activeLayer, true); } catch (e) { alert("생성 오류: " + e); }
        try { app.redraw(); } catch (e) {}
    }
})();