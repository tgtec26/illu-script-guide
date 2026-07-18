(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;               // 1mm = 2.834645669pt
    var shellRatio = [8, 16, 24]; // 껍질 지름 비율(원자 모형과 동일, 중심부터 등간격)
    var fontName = "GSMediumB1";         // 지정 서체명

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
            sphere: uniq("Sphere", [{pos:0, color:white, mid:13.3}, {pos:100, color:gray80}]),
            sphereNuc: uniq("SphereNuc", [{pos:0, color:white, mid:13.3}, {pos:100, color:gray60}]) // 핵: 전자보다 밝게
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
    var win = new Window("dialog", "분자 모형 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;

    // --- 분자 선택 패널 ---
    var pnlMol = win.add("panel", undefined, "분자 (다중 선택)");
    pnlMol.alignChildren = "left";
    var gridGroup = pnlMol.add("group");
    gridGroup.orientation = "column";
    gridGroup.spacing = 5;

    var row;
    var checkBoxes = [];
    for (var i = 0; i < MOLS.length; i++) {
        if (i % 5 === 0) row = gridGroup.add("group");
        checkBoxes[i] = row.add("checkbox", undefined, MOLS[i].label);
        checkBoxes[i].preferredSize.width = 60;
        if (MOLS[i].key === "O2") checkBoxes[i].value = true;
    }

    var btnDeselect = pnlMol.add("button", undefined, "전체 해제");
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
    // 모든 크기는 실제 적용값(화면 실측치). 기준 = 1번 껍질 지름(mm).
    // 껍질 수가 달라도 껍질 지름이 같아 여러 모형 간 통일감 유지(1:2:3 등간격).
    var sldOverall = addSlider("1껍질 지름", 2, 16, 13, function(v){ return v.toFixed(1) + "mm"; });
    var sldNucleus = addSlider("핵 지름", 0.5, 8, 6, function(v){ return v.toFixed(1) + "mm"; });
    var sldElectron = addSlider("전자 지름", 0.2, 4, 2, function(v){ return v.toFixed(1) + "mm"; });
    var sldChargeFont = addSlider("핵 전하량 글자", 1, 20, 8, function(v){ return v.toFixed(1) + "pt"; });
    var sldOverlap = addSlider("껍질 겹침", 5, 50, 15, function(v){ return Math.round(v) + "%"; });

    // 연동 규칙(원자 모형과 동일):
    //  전체 크기 변경 → 핵·전자·글자가 같은 비율로 함께 조정. 겹침(%)은 무관.
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

    var btnGenerate = win.add("button", undefined, "분자 모형 생성하기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

    // --- 현재 UI 값 읽기 / 그리기 호출 ---
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
                if (d.groupItems[i].name === "MoleculeModel_Preview") { try { d.groupItems[i].remove(); } catch (e) {} }
            }
        } catch (e) {}
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        clearPreview();
        if (chkPreview.value && getSelectedMols().length > 0) {
            try {
                var holder = app.activeDocument.activeLayer.groupItems.add();
                holder.name = "MoleculeModel_Preview";
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
    sldOverlap.onChange = function() { sldOverlap.syncLabel(); updatePreview(); };

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

    // --- 옵션 기억 (마지막 실행 설정을 다음 실행 때 복원) ---
    var PREF_KEY = "MoleculeModelMaker/settings";
    function collectSettings() {
        var parts = ["v2"]; // v2: 크기 기준이 전체 크기 → 1번 껍질 지름으로 변경
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
        parts.push(sldOverlap.value);
        parts.push(chkShellLine.value ? "1" : "0");
        return parts.join("|");
    }
    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, collectSettings()); } catch (e) {}
        saveSharedSettings();
    }

    // 3개 모형 스크립트(원자/분자/이온)가 공유하는 공통 옵션.
    // 어느 스크립트든 생성 시 저장하고, 실행 시 자기 설정 위에 덮어써서
    // 마지막에 실행한 스크립트의 값이 항상 우선한다.
    var SHARED_PREF_KEY = "ModelMakerShared/settings";
    function saveSharedSettings() {
        var parts = ["v2", // v2: 크기 기준이 1번 껍질 지름

            chkNucleus.value ? "1" : "0",
            chkShowMinus.value ? "1" : "0",
            chkShellLine.value ? "1" : "0",
            chkLit3DNucleus.value ? "1" : "0",
            chkLit3DElectron.value ? "1" : "0",
            sldOverall.value,
            sldNucleus.value,
            sldElectron.value,
            sldChargeFont.value];
        try { app.preferences.setStringPreference(SHARED_PREF_KEY, parts.join("|")); } catch (e) {}
    }
    function applySharedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(SHARED_PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length < 10) return;
        try {
            chkNucleus.value = (p[1] === "1");
            chkShowMinus.value = (p[2] === "1");
            chkShellLine.value = (p[3] === "1");
            chkLit3DNucleus.value = (p[4] === "1");
            chkLit3DElectron.value = (p[5] === "1");
            sldOverall.value = parseFloat(p[6]);
            sldNucleus.value = parseFloat(p[7]);
            sldElectron.value = parseFloat(p[8]);
            sldChargeFont.value = parseFloat(p[9]);
            syncSliderLabels();
            prevOverall = sldOverall.value;
            prevNucleus = sldNucleus.value;
        } catch (e) {}
    }
    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length < 12) return;
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
            sldOverlap.value = parseFloat(p[11]);
            if (p.length > 12) chkShellLine.value = (p[12] === "1"); // 후반 추가 필드(없으면 기본값 유지)
            syncSliderLabels();
            prevOverall = sldOverall.value;
            prevNucleus = sldNucleus.value;
        } catch (e) {}
    }

    btnGenerate.onClick = function() {
        if (getSelectedMols().length === 0) { alert("분자를 선택하세요."); return; }
        saveSettings();
        win.close(1);
    };

    // 이전 세션 잔여 미리보기 정리 + 마지막 실행 설정 복원
    removeLeftoverPreviews();
    applySettings();
    applySharedSettings(); // 공통 옵션은 마지막 실행 스크립트 값으로 덮어씀

    // 가이드 원(=최외곽 껍질 지름)이 선택돼 있으면 선택된 분자의 최대 껍질 수로
    // 환산해 '1껍질 지름'을 세팅하고 비례 연동
    (function seedFromGuideCircle() {
        var g = detectGuideCircle();
        if (!g) return;
        var sel = getSelectedMols();
        var maxShells = 3;
        if (sel.length > 0) {
            maxShells = 1;
            for (var si = 0; si < sel.length; si++) {
                var mol = sel[si];
                if (ELEM[mol.center.el].shells > maxShells) maxShells = ELEM[mol.center.el].shells;
                for (var ti = 0; ti < mol.terminals.length; ti++) {
                    if (ELEM[mol.terminals[ti].el].shells > maxShells) maxShells = ELEM[mol.terminals[ti].el].shells;
                }
            }
        }
        var before = sldOverall.value;
        sldOverall.value = (g.d / MM) * shellRatio[0] / shellRatio[maxShells - 1];
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
