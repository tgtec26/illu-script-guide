#target illustrator

function drawIsometricBox() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var sizeStepMm = 0.05;
    var minSliderMm = sizeStepMm;
    var maxSliderMm = 20;
    var offsetStepMm = 0.2;
    var labelWidth = 90;   // 옵션 이름 열 폭 (세로 정렬용)
    var sliderWidth = 280; // 슬라이더 폭 (프리셋 버튼 행 오른쪽 끝에 맞춤)
    var previewGroup = null;
    var settingFile = new File(Folder.myDocuments + "/Object_isometric__settings.txt");

    // 실행 시 오브젝트가 선택되어 있으면 그 중심을 생성 기준점으로 사용하고,
    // 그리기 확정 시 해당 가이드 오브젝트는 삭제한다. (취소하면 유지)
    var guideItem = null;
    var originX = null;
    var originY = null;
    try {
        var sel = doc.selection;
        if (sel && sel.length > 0 && sel[0].visibleBounds) {
            guideItem = sel[0];
            var gb = guideItem.visibleBounds;
            originX = (gb[0] + gb[2]) / 2;
            originY = (gb[1] + gb[3]) / 2;
        }
    } catch (eSel) {}

    // UI 입력창 생성
    var win = new Window("dialog", "등각 투상도 (Isometric) 상자 생성");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];

    // 입력 패널
    var panel = win.add("panel", undefined, "크기 입력 (mm)");
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.margins = 20;

    var widthControl = addSizeControl(panel, "가로 (Width):", "5");
    var depthControl = addSizeControl(panel, "세로 (Depth):", "5");
    var heightControl = addSizeControl(panel, "높이 (Height):", "5");
    var inputW = widthControl.input;
    var inputD = depthControl.input;
    var inputH = heightControl.input;

    // 높이 분할: 높이를 n등분해 겹겹이 쌓인 지층처럼 표현 (1 = 단일 상자)
    var layerControl = addCompressControl(panel, "높이 분할:", 1, 1, 8);
    var inputLayers = layerControl.input;

    // 각도 패널: 오른쪽/왼쪽 코너각을 조절하면 상단 코너각은 (360 - 오른쪽 - 왼쪽)으로 자동 계산됩니다.
    // 셋 다 120도면 isometric, 좌우가 같고 120이 아니면 dimetric, 셋 다 다르면 trimetric이 됩니다.
    var anglePanel = win.add("panel", undefined, "코너 각도 (오른쪽 + 왼쪽 + 상단 = 360°)");
    anglePanel.orientation = "column";
    anglePanel.alignChildren = ["fill", "top"];
    anglePanel.margins = 20;

    var rightAngleControl = addAngleControl(anglePanel, "오른쪽 각도:", 120);
    var leftAngleControl = addAngleControl(anglePanel, "왼쪽 각도:", 120);
    var inputAngleR = rightAngleControl.input;
    var inputAngleL = leftAngleControl.input;

    var topAngleRow = anglePanel.add("group");
    topAngleRow.orientation = "row";
    topAngleRow.alignChildren = ["left", "center"];
    topAngleRow.add("statictext", undefined, "상단 각도(자동):");
    var topAngleText = topAngleRow.add("statictext", undefined, "120°");
    topAngleText.characters = 8;

    var presetRow = anglePanel.add("group");
    presetRow.orientation = "row";
    var btnPresetIso = presetRow.add("button", undefined, "Isometric (120/120)");
    var btnPresetDi = presetRow.add("button", undefined, "Dimetric (110/110)");
    var btnPresetTri = presetRow.add("button", undefined, "Trimetric (120/105)");

    btnPresetIso.onClick = function() { setAngles(120, 120); };
    btnPresetDi.onClick = function() { setAngles(110, 110); };
    btnPresetTri.onClick = function() { setAngles(120, 105); };

    // 압축(휨) 패널: 좌우에서 눌러 압축했을 때의 휨을 원호로 표현.
    // 재료 길이(가로 W)는 보존되고 수평 폭이 (비율)로 줄어든다. 100% = 평평한 상자.
    var compressPanel = win.add("panel", undefined, "압축 비율 (%) — 100 = 평평, 낮을수록 위로 휨");
    compressPanel.orientation = "column";
    compressPanel.alignChildren = ["fill", "top"];
    compressPanel.margins = 20;

    var compressControl = addCompressControl(compressPanel, "비율:", 100, 30, 100);
    var inputCompress = compressControl.input;

    // 끝단 들림: 가우시안 폭(시그마)을 조절. 0 = 끝이 평평, 클수록 좌우 끝도 함께 올라감.
    var liftControl = addCompressControl(compressPanel, "끝단 들림:", 30, 0, 100);
    var inputLift = liftControl.input;

    // 단면: 100 = 절단 없음, 낮출수록 습곡 최상단부터 수평으로 깎여 내려감, 0 = 전부 사라짐
    var cutControl = addCompressControl(compressPanel, "단면:", 100, 0, 100);
    var inputCut = cutControl.input;

    // 곡선 형태: 종형(봉우리 하나) 또는 S형(봉우리+골 반대칭)
    var shapeRow = compressPanel.add("group");
    shapeRow.orientation = "row";
    shapeRow.alignChildren = ["left", "center"];
    shapeRow.add("statictext", undefined, "곡선 형태:");
    var shapeList = shapeRow.add("dropdownlist", undefined, ["종형 (봉우리)", "S형 (봉우리+골)"]);
    shapeList.selection = 0;
    shapeList.onChange = function() { updatePreview(); };

    // 위치 패널: 화면 중앙 기준 오프셋 (mm). X는 +오른쪽, Y는 +위쪽.
    var posPanel = win.add("panel", undefined, "위치 (화면 중앙 기준, mm)");
    posPanel.orientation = "column";
    posPanel.alignChildren = ["fill", "top"];
    posPanel.margins = 20;

    var offsetXControl = addOffsetControl(posPanel, "X (+오른쪽):", 0);
    var offsetYControl = addOffsetControl(posPanel, "Y (+위쪽):", 0);
    var inputOffX = offsetXControl.input;
    var inputOffY = offsetYControl.input;

    var previewCheck = win.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    // 버튼 그룹
    var groupBtn = win.add("group");
    groupBtn.alignment = "center";
    var btnOk = groupBtn.add("button", undefined, "그리기", {name: "ok"});
    var btnCancel = groupBtn.add("button", undefined, "취소", {name: "cancel"});

    var result = null;

    btnOk.onClick = function() {
        var size = readSizeInputs(true);
        var angles = readAngleInputs(true);
        if (size === null || angles === null) {
            return;
        }

        result = size;
        result.angleR = angles.angleR;
        result.angleL = angles.angleL;
        var offsets = readOffsetInputs();
        result.offX = offsets.offX;
        result.offY = offsets.offY;
        result.compress = readCompressInput();
        result.lift = readLiftInput();
        result.layers = readLayersInput();
        result.shape = readShapeInput();
        result.cut = readCutInput();
        saveSettings(result);
        win.close(1);
    };

    btnCancel.onClick = function() {
        win.close(0);
    };

    previewCheck.onClick = updatePreview;
    loadSettings();
    updateTopAngle();
    updatePreview();

    var dialogResult = win.show();
    clearPreview();
    if (dialogResult === 1 && result !== null) {
        if (guideItem !== null) {
            try { guideItem.remove(); } catch (eGuide) {}
        }
        createIsometricBox(doc, result.w, result.d, result.h, result.angleR, result.angleL, result.offX, result.offY, originX, originY, result.compress, result.lift, result.layers, result.shape, result.cut, true);
    }

    function addCompressControl(parent, label, defaultPct, minPct, maxPct) {
        var control = {};
        control.min = minPct;
        control.max = maxPct;
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        var st = row.add("statictext", undefined, label);
        st.preferredSize.width = labelWidth;
        control.input = row.add("edittext", undefined, String(defaultPct));
        control.input.characters = 6;

        control.scrollbar = row.add("scrollbar", undefined, defaultPct, minPct, maxPct);
        control.scrollbar.preferredSize.width = sliderWidth;
        control.scrollbar.stepdelta = 1;
        control.scrollbar.jumpdelta = 10;
        control.isSyncing = false;

        control.input.onChange = function() {
            syncCompressScrollbar(control, parseSize(control.input.text));
            updatePreview();
        };
        control.input.onChanging = function() {
            updatePreview();
        };

        control.scrollbar.onChanging = function() {
            if (control.isSyncing) {
                return;
            }

            control.input.text = String(Math.round(control.scrollbar.value));
            updatePreview();
        };

        return control;
    }

    function syncCompressScrollbar(control, value) {
        if (control.isSyncing || isNaN(value)) {
            return;
        }

        value = Math.max(control.min, Math.min(control.max, value));
        control.isSyncing = true;
        control.scrollbar.value = value;
        control.isSyncing = false;
    }

    function readCompressInput() {
        var pct = parseSize(inputCompress.text);
        if (isNaN(pct)) {
            return 100;
        }
        return Math.max(30, Math.min(100, pct));
    }

    function readLiftInput() {
        var pct = parseSize(inputLift.text);
        if (isNaN(pct)) {
            return 0;
        }
        return Math.max(0, Math.min(100, pct));
    }

    function readLayersInput() {
        var n = parseSize(inputLayers.text);
        if (isNaN(n)) {
            return 1;
        }
        return Math.max(1, Math.min(8, Math.round(n)));
    }

    function readShapeInput() {
        return (shapeList.selection && shapeList.selection.index === 1) ? 1 : 0;
    }

    function readCutInput() {
        var pct = parseSize(inputCut.text);
        if (isNaN(pct)) {
            return 100;
        }
        return Math.max(0, Math.min(100, pct));
    }

    function addOffsetControl(parent, label, defaultMm) {
        var control = {};
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        var st = row.add("statictext", undefined, label);
        st.preferredSize.width = labelWidth;
        control.input = row.add("edittext", undefined, String(defaultMm));
        control.input.characters = 6;

        // 스크롤바 1스텝 = 0.2mm (내부 값은 스텝 수로 저장)
        control.scrollbar = row.add("scrollbar", undefined, defaultMm / offsetStepMm, -100 / offsetStepMm, 100 / offsetStepMm);
        control.scrollbar.preferredSize.width = sliderWidth;
        control.scrollbar.stepdelta = 1;
        control.scrollbar.jumpdelta = 10;
        control.isSyncing = false;

        control.input.onChange = function() {
            syncOffsetScrollbar(control, parseSize(control.input.text));
            updatePreview();
        };
        control.input.onChanging = function() {
            updatePreview();
        };

        control.scrollbar.onChanging = function() {
            if (control.isSyncing) {
                return;
            }

            var mmValue = Math.round(control.scrollbar.value) * offsetStepMm;
            control.input.text = mmValue.toFixed(1);
            updatePreview();
        };

        return control;
    }

    function syncOffsetScrollbar(control, value) {
        if (control.isSyncing || isNaN(value)) {
            return;
        }

        var step = Math.round(value / offsetStepMm);
        step = Math.max(-100 / offsetStepMm, Math.min(100 / offsetStepMm, step));
        control.isSyncing = true;
        control.scrollbar.value = step;
        control.isSyncing = false;
    }

    function readOffsetInputs() {
        var offX = parseSize(inputOffX.text);
        var offY = parseSize(inputOffY.text);
        return {
            offX: isNaN(offX) ? 0 : offX,
            offY: isNaN(offY) ? 0 : offY
        };
    }

    function saveSettings(values) {
        try {
            settingFile.open("w");
            settingFile.write([values.w, values.d, values.h, values.angleR, values.angleL, values.offX, values.offY, values.compress, values.lift, values.layers, values.shape, values.cut].join("@"));
            settingFile.close();
        } catch (e) {}
    }

    function loadSettings() {
        if (!settingFile.exists) {
            return;
        }

        try {
            settingFile.open("r");
            var parts = settingFile.read().split("@");
            settingFile.close();
            if (parts.length < 5) {
                return;
            }

            var w = parseSize(parts[0]);
            var d = parseSize(parts[1]);
            var h = parseSize(parts[2]);
            var angleR = parseSize(parts[3]);
            var angleL = parseSize(parts[4]);

            if (!isNaN(w) && w > 0) { inputW.text = String(w); syncScrollbar(widthControl, w); }
            if (!isNaN(d) && d > 0) { inputD.text = String(d); syncScrollbar(depthControl, d); }
            if (!isNaN(h) && h > 0) { inputH.text = String(h); syncScrollbar(heightControl, h); }
            if (!isNaN(angleR) && angleR > 90 && angleR < 180 && !isNaN(angleL) && angleL > 90 && angleL < 180) {
                setAngles(angleR, angleL);
            }

            if (parts.length >= 7) {
                var offX = parseSize(parts[5]);
                var offY = parseSize(parts[6]);
                if (!isNaN(offX)) { inputOffX.text = String(offX); syncOffsetScrollbar(offsetXControl, offX); }
                if (!isNaN(offY)) { inputOffY.text = String(offY); syncOffsetScrollbar(offsetYControl, offY); }
            }

            if (parts.length >= 8) {
                var compress = parseSize(parts[7]);
                if (!isNaN(compress)) {
                    compress = Math.max(30, Math.min(100, compress));
                    inputCompress.text = String(compress);
                    syncCompressScrollbar(compressControl, compress);
                }
            }

            if (parts.length >= 9) {
                var lift = parseSize(parts[8]);
                if (!isNaN(lift)) {
                    lift = Math.max(0, Math.min(100, lift));
                    inputLift.text = String(lift);
                    syncCompressScrollbar(liftControl, lift);
                }
            }

            if (parts.length >= 10) {
                var layersVal = parseSize(parts[9]);
                if (!isNaN(layersVal)) {
                    layersVal = Math.max(1, Math.min(8, Math.round(layersVal)));
                    inputLayers.text = String(layersVal);
                    syncCompressScrollbar(layerControl, layersVal);
                }
            }

            if (parts.length >= 11) {
                var shapeVal = parseSize(parts[10]);
                if (!isNaN(shapeVal)) {
                    shapeList.selection = (shapeVal === 1 ? 1 : 0);
                }
            }

            if (parts.length >= 12) {
                var cutVal = parseSize(parts[11]);
                if (!isNaN(cutVal)) {
                    cutVal = Math.max(0, Math.min(100, cutVal));
                    inputCut.text = String(cutVal);
                    syncCompressScrollbar(cutControl, cutVal);
                }
            }
        } catch (e) {
            try { settingFile.close(); } catch (e2) {}
        }
    }

    function addAngleControl(parent, label, defaultDeg) {
        var control = {};
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        var st = row.add("statictext", undefined, label);
        st.preferredSize.width = labelWidth;
        control.input = row.add("edittext", undefined, String(defaultDeg));
        control.input.characters = 6;

        control.scrollbar = row.add("scrollbar", undefined, defaultDeg, 91, 179);
        control.scrollbar.preferredSize.width = sliderWidth;
        control.scrollbar.stepdelta = 1;
        control.scrollbar.jumpdelta = 10;
        control.isSyncing = false;

        control.input.onChange = function() {
            syncAngleScrollbar(control, parseSize(control.input.text));
            updateTopAngle();
            updatePreview();
        };
        control.input.onChanging = function() {
            updateTopAngle();
            updatePreview();
        };

        control.scrollbar.onChanging = function() {
            if (control.isSyncing) {
                return;
            }

            control.input.text = String(Math.round(control.scrollbar.value));
            updateTopAngle();
            updatePreview();
        };

        return control;
    }

    function syncAngleScrollbar(control, value) {
        if (control.isSyncing || isNaN(value)) {
            return;
        }

        value = Math.max(91, Math.min(179, value));
        control.isSyncing = true;
        control.scrollbar.value = value;
        control.isSyncing = false;
    }

    function setAngles(angleR, angleL) {
        inputAngleR.text = String(angleR);
        inputAngleL.text = String(angleL);
        syncAngleScrollbar(rightAngleControl, angleR);
        syncAngleScrollbar(leftAngleControl, angleL);
        updateTopAngle();
        updatePreview();
    }

    function updateTopAngle() {
        var angles = readAngleInputs(false);
        topAngleText.text = (angles === null ? "-" : angles.angleT.toFixed(1)) + "°";
    }

    function readAngleInputs(showAlert) {
        var angleR = parseSize(inputAngleR.text);
        var angleL = parseSize(inputAngleL.text);

        if (isNaN(angleR) || isNaN(angleL) || angleR <= 90 || angleR >= 180 || angleL <= 90 || angleL >= 180) {
            if (showAlert) {
                alert("오른쪽/왼쪽 각도는 90°보다 크고 180°보다 작아야 합니다.");
            }
            return null;
        }

        var angleT = 360 - angleR - angleL;
        if (angleT <= 0 || angleT >= 180) {
            if (showAlert) {
                alert("상단 각도(360 - 오른쪽 - 왼쪽)가 0°~180° 범위를 벗어납니다. 각도를 조정해주세요.");
            }
            return null;
        }

        return {angleR: angleR, angleL: angleL, angleT: angleT};
    }

    function addSizeControl(parent, label, defaultValue) {
        var control = {};
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        var st = row.add("statictext", undefined, label);
        st.preferredSize.width = labelWidth;
        control.input = row.add("edittext", undefined, defaultValue);
        control.input.characters = 6;

        control.scrollbar = row.add(
            "scrollbar",
            undefined,
            valueToStep(parseSize(defaultValue)),
            valueToStep(minSliderMm),
            valueToStep(maxSliderMm)
        );
        control.scrollbar.preferredSize.width = sliderWidth;
        control.scrollbar.stepdelta = 1;
        control.scrollbar.jumpdelta = 10;
        control.isSyncing = false;

        control.input.onChange = function() {
            syncScrollbar(control, parseSize(control.input.text));
            updatePreview();
        };
        control.input.onChanging = function() {
            updatePreview();
        };

        control.scrollbar.onChanging = function() {
            if (control.isSyncing) {
                return;
            }

            control.input.text = formatSize(stepToValue(control.scrollbar.value));
            updatePreview();
        };

        return control;
    }

    function parseSize(text) {
        return parseFloat(String(text).replace(",", "."));
    }

    function formatSize(value) {
        value = Math.round(value / sizeStepMm) * sizeStepMm;
        value = Math.max(sizeStepMm, value);
        return value.toFixed(2);
    }

    function valueToStep(value) {
        return Math.round(value / sizeStepMm);
    }

    function stepToValue(step) {
        return step * sizeStepMm;
    }

    function syncScrollbar(control, value) {
        if (control.isSyncing || isNaN(value) || value <= 0) {
            return;
        }

        var step = valueToStep(value);
        step = Math.max(valueToStep(minSliderMm), Math.min(valueToStep(maxSliderMm), step));
        control.isSyncing = true;
        control.scrollbar.value = step;
        control.isSyncing = false;
    }

    function readSizeInputs(showAlert) {
        var w = parseSize(inputW.text);
        var d = parseSize(inputD.text);
        var h = parseSize(inputH.text);

        if (isNaN(w) || isNaN(d) || isNaN(h) || w <= 0 || d <= 0 || h <= 0) {
            if (showAlert) {
                alert("올바른 양의 숫자를 입력해주세요.");
            }
            return null;
        }

        return {w: w, d: d, h: h};
    }

    function updatePreview() {
        clearPreview();
        if (!previewCheck.value) {
            return;
        }

        var size = readSizeInputs(false);
        var angles = readAngleInputs(false);
        if (size === null || angles === null) {
            return;
        }

        var offsets = readOffsetInputs();
        previewGroup = createIsometricBox(doc, size.w, size.d, size.h, angles.angleR, angles.angleL, offsets.offX, offsets.offY, originX, originY, readCompressInput(), readLiftInput(), readLayersInput(), readShapeInput(), readCutInput(), false);
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) {
            return;
        }

        try {
            previewGroup.remove();
        } catch (e) {}
        previewGroup = null;
    }
}

function createIsometricBox(doc, w_mm, d_mm, h_mm, angleR, angleL, offX_mm, offY_mm, originX, originY, compressPct, liftPct, layerCount, shapeType, cutPct, selectResult) {
    // mm 단위를 pt 단위로 변환
    var mm2pt = 2.834645;
    var W = w_mm * mm2pt;
    var D = d_mm * mm2pt;
    var H = h_mm * mm2pt;
    var offX = (offX_mm === undefined ? 0 : offX_mm) * mm2pt;
    var offY = (offY_mm === undefined ? 0 : offY_mm) * mm2pt;

    // 코너 각도(오른쪽/왼쪽, 90~180도)를 축이 수평선과 이루는 각도로 변환.
    // 오른쪽/왼쪽 각도가 둘 다 120이면 isometric, 둘이 같고 120이 아니면 dimetric,
    // 서로 다르면 trimetric이 된다. (상단 각도는 360 - 오른쪽 - 왼쪽로 자동 결정됨)
    angleR = (angleR === undefined ? 120 : angleR);
    angleL = (angleL === undefined ? 120 : angleL);
    var alphaR = (angleR - 90) * Math.PI / 180;
    var alphaL = (angleL - 90) * Math.PI / 180;
    var cos30 = Math.cos(alphaR);
    var sin30 = Math.sin(alphaR);
    var cosL = Math.cos(alphaL);
    var sinL = Math.sin(alphaL);

    // 기준점: 가이드 오브젝트 중심(originX/Y)이 있으면 그 위치, 없으면 현재 화면 중앙
    var useOrigin = (originX !== null && originX !== undefined && originY !== null && originY !== undefined);
    var cx, cy;
    if (useOrigin) {
        cx = originX;
        cy = originY;
    } else {
        var centerPoint = doc.views[0].centerPoint;
        cx = centerPoint[0];
        cy = centerPoint[1];
    }

    // 도형이 기준점에 오도록 시작점(맨 아래 꼭짓점) 조정 + 사용자 오프셋 적용
    var startX = cx + offX;
    var startY = cy - (H / 2) + offY;

    var compress = (compressPct === undefined || compressPct === null || isNaN(compressPct)) ? 100 : compressPct;
    var layers = (layerCount === undefined || layerCount === null || isNaN(layerCount)) ? 1 : Math.max(1, Math.min(8, Math.round(layerCount)));

    // 층별 명도: 맨 위층은 흰색(100), 아래로 갈수록 15%씩 어두워짐 (지층 느낌)
    function layerWhite(idx) {
        if (layers === 1) return 100;
        return Math.max(10, 100 - (layers - 1 - idx) * 15);
    }

    // faceDefs: {pts: 좌표 배열, white: 면 명도(%)} 목록
    var faceDefs = [];
    var li, hLo, hHi, lw;

    if (compress >= 99.5) {
        // 평평한 상자. (u: 폭 0~W, z: 깊이 0~D, h: 두께 0~H) → 2D 투영 좌표
        var projectFlat = function (u, z, h) {
            return [startX + u * cos30 - z * cosL, startY + u * sin30 + z * sinL + h];
        };

        for (li = 0; li < layers; li++) {
            hLo = H * li / layers;
            hHi = H * (li + 1) / layers;
            lw = layerWhite(li);

            // 오른쪽(폭) 면 띠
            faceDefs.push({white: lw, pts: [
                projectFlat(0, 0, hLo), projectFlat(W, 0, hLo),
                projectFlat(W, 0, hHi), projectFlat(0, 0, hHi)
            ]});
            // 왼쪽(깊이) 끝면 띠
            faceDefs.push({white: lw, pts: [
                projectFlat(0, 0, hLo), projectFlat(0, D, hLo),
                projectFlat(0, D, hHi), projectFlat(0, 0, hHi)
            ]});
        }

        // 윗면 (맨 위층에만)
        faceDefs.push({white: 100, pts: [
            projectFlat(0, 0, H), projectFlat(W, 0, H),
            projectFlat(W, D, H), projectFlat(0, D, H)
        ]});
    } else {
        // 좌우 압축 좌굴: 끝단은 평평하게 남고 가운데가 가우시안(정규분포) 곡선으로 솟는다.
        // 수평 폭은 k*W로 줄고, 중립축 곡선 길이가 원래 폭 W가 되도록 진폭 A를 이분법으로 결정.
        var k = compress / 100;
        var span = W * k;      // 압축 후 수평 폭
        var mu = span / 2;
        // 끝단 들림(0~100)이 클수록 가우시안 폭(시그마)이 넓어져 좌우 끝도 함께 올라간다.
        // 0 → span/6 (끝이 3시그마 지점: 거의 평평), 100 → span/2 (끝이 1시그마: 크게 들림)
        var lift = (liftPct === undefined || liftPct === null || isNaN(liftPct)) ? 0 : Math.max(0, Math.min(100, liftPct));
        var sigmaDiv = 6 - (lift / 100) * 4;
        var sigma = span / sigmaDiv;
        var N = 48;            // 곡선 분할 수
        var foldS = (shapeType === 1);

        // 곡선 형태 함수 (진폭 1 기준):
        // 종형 = 가우시안 (봉우리 하나)
        // S형 = 사인 한 주기: 중심 → 마루(1/4) → 중심 → 골(3/4) → 중심
        var shapeAt = function (x) {
            if (foldS) return Math.sin(2 * Math.PI * x / span);
            var t = (x - mu) / sigma;
            return Math.exp(-t * t / 2);
        };

        var arcLen = function (A) {
            var len = 0, px = 0, py = 0;
            for (var si = 0; si <= N; si++) {
                var x = span * si / N;
                var y = A * shapeAt(x);
                if (si > 0) {
                    var ddx = x - px, ddy = y - py;
                    len += Math.sqrt(ddx * ddx + ddy * ddy);
                }
                px = x; py = y;
            }
            return len;
        };

        var lo = 0, hi = W;
        while (arcLen(hi) < W) hi *= 2;
        for (var bi = 0; bi < 60; bi++) {
            var midA = (lo + hi) / 2;
            if (arcLen(midA) < W) lo = midA;
            else hi = midA;
        }
        var A = (lo + hi) / 2;

        // 바닥 곡선 샘플 계산. 두께는 수직 방향으로 쌓는다(지질 습곡 단면 방식) —
        // 곡선 기울기와 무관하게 절단면(끝면)이 항상 수직으로 유지된다.
        var xs = [], ysBottom = [];
        for (var si2 = 0; si2 <= N; si2++) {
            var x2 = span * si2 / N;
            xs.push(x2);
            ysBottom.push(A * shapeAt(x2));
        }

        // (x: 폭 방향 좌표, z: 깊이 0~D, y: 수직 좌표) → 2D 투영
        var projXY = function (x, z, y) {
            return [startX + x * cos30 - z * cosL, startY + x * sin30 + z * sinL + y];
        };

        // 임의 x에서의 바닥 곡선 높이 (샘플 사이 선형 보간)
        var yBAt = function (x) {
            var f = x / span * N;
            var i0 = Math.floor(f);
            if (i0 < 0) i0 = 0;
            if (i0 >= N) i0 = N - 1;
            var t = f - i0;
            return ysBottom[i0] + (ysBottom[i0 + 1] - ysBottom[i0]) * t;
        };

        // 단면(수평 절단) 높이: 100 = 절단 없음, 0 = 바닥 최저점 (전부 사라짐)
        var cut = (cutPct === undefined || cutPct === null || isNaN(cutPct)) ? 100 : Math.max(0, Math.min(100, cutPct));
        var noCut = (cut >= 99.5);
        var yMinB = ysBottom[0], yMaxT = ysBottom[0];
        for (var mi = 0; mi <= N; mi++) {
            if (ysBottom[mi] < yMinB) yMinB = ysBottom[mi];
            if (ysBottom[mi] > yMaxT) yMaxT = ysBottom[mi];
        }
        yMaxT += H;
        var yCut = noCut ? 1e9 : yMinB + (cut / 100) * (yMaxT - yMinB);
        var layerH = H / layers;

        // g[i] < 0 인 구간 목록을 만든다. 경계는 선형 보간한 x 좌표.
        var findIntervals = function (g) {
            var ivs = [], cur = null, t;
            for (var i = 0; i <= N; i++) {
                var inside = g[i] < 0;
                if (inside && cur === null) {
                    cur = {i0: i, x0: xs[i]};
                    if (i > 0) {
                        t = g[i - 1] / (g[i - 1] - g[i]);
                        cur.x0 = xs[i - 1] + (xs[i] - xs[i - 1]) * t;
                    }
                } else if (!inside && cur !== null) {
                    t = g[i - 1] / (g[i - 1] - g[i]);
                    cur.i1 = i - 1;
                    cur.x1 = xs[i - 1] + (xs[i] - xs[i - 1]) * t;
                    ivs.push(cur);
                    cur = null;
                }
            }
            if (cur !== null) {
                cur.i1 = N;
                cur.x1 = xs[N];
                ivs.push(cur);
            }
            return ivs;
        };

        var i, gi, ivs, iv, vi;

        for (li = 0; li < layers; li++) {
            hLo = H * li / layers;
            hHi = H * (li + 1) / layers;
            lw = layerWhite(li);

            // 층 바닥이 절단면 아래에 있는 구간만 재료가 남는다
            gi = [];
            for (i = 0; i <= N; i++) gi.push(ysBottom[i] + hLo - yCut);
            ivs = findIntervals(gi);

            for (vi = 0; vi < ivs.length; vi++) {
                iv = ivs[vi];

                // 오른쪽(폭) 면 띠: 아래 곡선 + (절단면으로 잘린) 위 곡선 역방향
                var frontPts = [];
                if (iv.x0 < xs[iv.i0]) frontPts.push(projXY(iv.x0, 0, yBAt(iv.x0) + hLo));
                for (i = iv.i0; i <= iv.i1; i++) frontPts.push(projXY(xs[i], 0, ysBottom[i] + hLo));
                if (iv.x1 > xs[iv.i1]) frontPts.push(projXY(iv.x1, 0, yBAt(iv.x1) + hLo));
                for (i = iv.i1; i >= iv.i0; i--) frontPts.push(projXY(xs[i], 0, Math.min(ysBottom[i] + hHi, yCut)));
                faceDefs.push({white: lw, pts: frontPts});
            }

            // 왼쪽(깊이) 끝면 띠 (x=0): 절단면 아래 부분만
            if (ysBottom[0] + hLo < yCut) {
                var endTop = Math.min(ysBottom[0] + hHi, yCut);
                faceDefs.push({white: lw, pts: [
                    projXY(0, 0, ysBottom[0] + hLo),
                    projXY(0, 0, endTop),
                    projXY(0, D, endTop),
                    projXY(0, D, ysBottom[0] + hLo)
                ]});
            }
        }

        // 곡면 윗면 (h=H): 절단면보다 낮은 구간만 남는다
        gi = [];
        for (i = 0; i <= N; i++) gi.push(ysBottom[i] + H - yCut);
        ivs = findIntervals(gi);
        for (vi = 0; vi < ivs.length; vi++) {
            iv = ivs[vi];
            var topPts = [];
            if (iv.x0 < xs[iv.i0]) topPts.push(projXY(iv.x0, 0, Math.min(yBAt(iv.x0) + H, yCut)));
            for (i = iv.i0; i <= iv.i1; i++) topPts.push(projXY(xs[i], 0, ysBottom[i] + H));
            if (iv.x1 > xs[iv.i1]) topPts.push(projXY(iv.x1, 0, Math.min(yBAt(iv.x1) + H, yCut)));
            if (iv.x1 > xs[iv.i1]) topPts.push(projXY(iv.x1, D, Math.min(yBAt(iv.x1) + H, yCut)));
            for (i = iv.i1; i >= iv.i0; i--) topPts.push(projXY(xs[i], D, ysBottom[i] + H));
            if (iv.x0 < xs[iv.i0]) topPts.push(projXY(iv.x0, D, Math.min(yBAt(iv.x0) + H, yCut)));
            faceDefs.push({white: 100, pts: topPts});
        }

        // 절단 평면: 노출된 층별로 수평 띠를 그린다 (층 색 = 해당 층 명도)
        if (!noCut) {
            var exposureAt = function (x) {
                var yb = yBAt(x);
                if (!(yb < yCut && yCut < yb + H)) return -1;
                var e = Math.floor((yCut - yb) / layerH);
                if (e >= layers) e = layers - 1;
                if (e < 0) e = 0;
                return e;
            };

            var prevE = exposureAt(xs[0]);
            var runStart = xs[0];
            var pushRun = function (x0, x1, expo) {
                if (expo < 0 || x1 - x0 < 0.001) return;
                faceDefs.push({white: layerWhite(expo), pts: [
                    projXY(x0, 0, yCut),
                    projXY(x1, 0, yCut),
                    projXY(x1, D, yCut),
                    projXY(x0, D, yCut)
                ]});
            };

            for (i = 1; i <= N; i++) {
                var e2 = exposureAt(xs[i]);
                if (e2 !== prevE) {
                    // 경계를 이분법으로 정밀화
                    var blo = xs[i - 1], bhi = xs[i];
                    for (var bj = 0; bj < 20; bj++) {
                        var bmid = (blo + bhi) / 2;
                        if (exposureAt(bmid) === prevE) blo = bmid;
                        else bhi = bmid;
                    }
                    var bx2 = (blo + bhi) / 2;
                    pushRun(runStart, bx2, prevE);
                    runStart = bx2;
                    prevE = e2;
                }
            }
            pushRun(runStart, xs[N], prevE);
        }
    }

    // 가이드 기준 생성 시에는 상자의 시각적 중심(바운딩 박스 중심)이 기준점에 정확히 오도록 보정
    if (useOrigin) {
        var minX = null, maxX = null, minY = null, maxY = null;
        for (var fi = 0; fi < faceDefs.length; fi++) {
            var set = faceDefs[fi].pts;
            for (var pi = 0; pi < set.length; pi++) {
                if (minX === null || set[pi][0] < minX) minX = set[pi][0];
                if (maxX === null || set[pi][0] > maxX) maxX = set[pi][0];
                if (minY === null || set[pi][1] < minY) minY = set[pi][1];
                if (maxY === null || set[pi][1] > maxY) maxY = set[pi][1];
            }
        }
        var dx = (cx + offX) - (minX + maxX) / 2;
        var dy = (cy + offY) - (minY + maxY) / 2;
        for (var fj = 0; fj < faceDefs.length; fj++) {
            var set2 = faceDefs[fj].pts;
            for (var pj = 0; pj < set2.length; pj++) {
                set2[pj][0] += dx;
                set2[pj][1] += dy;
            }
        }
    }

    // 그룹 생성
    var group = doc.groupItems.add();
    group.name = "Isometric Box (" + w_mm + "x" + d_mm + "x" + h_mm + "mm"
        + (compress >= 99.5 ? "" : ", compress " + compress + "%")
        + (layers > 1 ? ", " + layers + " layers" : "") + ")";

    // 선과 면 스타일 지정
    var colorBlack = makeColor(doc, 0);

    for (var di = 0; di < faceDefs.length; di++) {
        var face = makeFace(doc, group, faceDefs[di].pts);
        face.filled = true;
        face.fillColor = makeColor(doc, faceDefs[di].white);
        face.stroked = true;
        face.strokeColor = colorBlack;
        face.strokeWidth = 0.3;
        face.strokeJoin = StrokeJoin.ROUNDENDJOIN; // 모서리가 깔끔하게 맞물리도록 둥근 조인 사용
    }

    if (selectResult) {
        doc.selection = null;
        group.selected = true;
    }

    return group;
}

function makeFace(doc, group, points) {
    var face = doc.pathItems.add();
    face.setEntirePath(points);
    face.closed = true;
    face.move(group, ElementPlacement.PLACEATEND);
    return face;
}

function makeColor(doc, whitePercent) {
    var color;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        color = new CMYKColor();
        color.cyan = 0;
        color.magenta = 0;
        color.yellow = 0;
        color.black = 100 - whitePercent;
    } else {
        color = new RGBColor();
        color.red = Math.round(255 * whitePercent / 100);
        color.green = Math.round(255 * whitePercent / 100);
        color.blue = Math.round(255 * whitePercent / 100);
    }

    return color;
}

drawIsometricBox();
