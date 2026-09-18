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

// 원 입체: 선택한 원을 기준으로 원기둥·원뿔·구를 만드는 세 스크립트를 한 창의 탭으로 묶었다.
// 세 탭 모두 가로·세로가 같은 원 패스 하나를 선택해야 한다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "RoundSolids/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeCylinderEngine(), makeConeEngine(), makeSphereEngine()];

    var win = new Window("dialog", "원 입체 (원기둥·원뿔·구)");
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
    // 어느 탭도 선택에 맞지 않으면 여기서 끝낸다 — 꺼진 탭을 tabs.selection에 넣으면 ScriptUI가 유형 오류를 던진다
    if (engines[tabIndex].error) {
        var problems = [];
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) problems.push("[" + engines[engineIndex].label + "] " + engines[engineIndex].error);
        alert("선택이 어느 탭에도 맞지 않습니다.\n\n" + problems.join("\n"));
        return;
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

    // ==== 원기둥 ====
    function makeCylinderEngine() {
        var api = {label: "원기둥", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            var source = getSelectedCircle(doc.selection);
            if (source === null) return "원 패스 하나만 선택해주세요.";

            var bounds = source.geometricBounds;
            var diameter = bounds[2] - bounds[0];
            var sourceHeight = bounds[1] - bounds[3];
            if (diameter <= 0 ||
                    Math.abs(diameter - sourceHeight) > Math.max(0.1, diameter * 0.01) ||
                    !hasCircularPathPoints(source)) return "가로와 세로 크기가 같은 원을 선택해주세요.";

            var MM_TO_PT = 2.83464567;
            var HEIGHT_STEP_MM = 0.05;
            var DIAMETER_STEP_MM = 0.05;
            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var centerX = (bounds[0] + bounds[2]) / 2;
            var centerY = (bounds[1] + bounds[3]) / 2;
            var diameterMm = diameter / MM_TO_PT;
            var innerDiameterMm = 0;
            var maxInnerDiameterMm = Math.max(0, roundTo(diameterMm - DIAMETER_STEP_MM, DIAMETER_STEP_MM));
            var maxHeightMm = 50;
            var heightMm = Math.min(maxHeightMm, roundTo(diameterMm, HEIGHT_STEP_MM));
            var viewAngle = 70;
            var viewY = 0;
            var viewZ = 0;
            var isVertical = true;
            var divisionsEnabled = false;
            var divisionCount = 2;
            var divisionRotation = 90;
            var divisionRatioText = "";
            var K_STEP = 10;
            var RESET_BUTTON_WIDTH = 34;
            var FACE_TOP = 0;
            var FACE_INNER = 1;
            var FACE_OUTER = 2;
            var faceK = [0, 0, 0];
            var activeFace = FACE_TOP;
            var previewEnabled = true;
            var previewGroup = null;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var sourceWasHidden = source.hidden;

            // 외경은 선택한 원에서 오므로 저장하지 않는다. 내경·높이는 새 원 크기에 맞춰 잘라서 복원한다.
            var PREF_KEY = "ObjectCylinder/settings";
            applySavedSettings();

            // 0 버튼이 붙는 줄도 라벨이 잘리지 않도록 넓힌다.
            var LABEL_WIDTH = 70;
            var SLIDER_WIDTH = 196;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.

            var dlg = page;

            var sizePanel = addPanel(dlg, "크기 (외경 " + formatNumber(diameterMm, 2) + "mm)");
            var innerControls = addValueRow(
                sizePanel,
                "내경",
                "mm",
                formatNumber(innerDiameterMm, 2),
                0,
                Math.max(DIAMETER_STEP_MM, maxInnerDiameterMm),
                DIAMETER_STEP_MM
            );
            var innerDiameterInput = innerControls.input;
            var innerDiameterSlider = innerControls.slider;
            var heightControls = addValueRow(
                sizePanel,
                "높이",
                "mm",
                formatNumber(heightMm, 2),
                0,
                maxHeightMm,
                HEIGHT_STEP_MM
            );
            var heightInput = heightControls.input;
            var heightSlider = heightControls.slider;

            var viewPanel = addPanel(dlg, "시점");
            var xControls = addAngleRow(viewPanel, "X축", viewAngle, true);
            var yControls = addAngleRow(viewPanel, "Y축", viewY, true);
            var zControls = addAngleRow(viewPanel, "Z축", viewZ, true);

            var shapePanel = addPanel(dlg, "방향 · 분할선");

            var directionRow = shapePanel.add("group");
            directionRow.alignChildren = ["left", "center"];
            var directionLabel = directionRow.add("statictext", undefined, "방향");
            directionLabel.preferredSize.width = LABEL_WIDTH;
            var verticalRadio = directionRow.add("radiobutton", undefined, "상하");
            var horizontalRadio = directionRow.add("radiobutton", undefined, "좌우");
            verticalRadio.value = isVertical;
            horizontalRadio.value = !isVertical;
            var divisionCheck = directionRow.add("checkbox", undefined, "분할선");
            divisionCheck.value = divisionsEnabled;
            var countGroup = directionRow.add("group");
            countGroup.alignChildren = ["left", "center"];
            var countInput = countGroup.add("edittext", undefined, String(divisionCount));
            countInput.characters = 4;
            countInput.justify = "center";
            var countSlider = countGroup.add("scrollbar", undefined, divisionCount, 2, 24);
            countSlider.stepdelta = 1;
            countSlider.jumpdelta = 1 * 10;
            countSlider.preferredSize.width = 77;

            var rotationControls = addAngleRow(shapePanel, "분할 회전", divisionRotation);
            var rotationInput = rotationControls.input;
            var rotationSlider = rotationControls.slider;
            var rotationRow = rotationControls.row;

            var ratioRow = shapePanel.add("group");
            ratioRow.alignChildren = ["left", "center"];
            var ratioLabel = ratioRow.add("statictext", undefined, "분할 비율");
            ratioLabel.preferredSize.width = LABEL_WIDTH;
            var ratioInput = ratioRow.add("edittext", undefined, divisionRatioText);
            ratioInput.preferredSize.width = 200;
            ratioRow.add("statictext", undefined, "(예: 43,11,40,6 · 빈칸=균등)");

            setDivisionControlsEnabled(divisionsEnabled);

            var colorPanel = addPanel(dlg, "컬러");
            var colorRow = colorPanel.add("group");
            colorRow.alignChildren = ["left", "center"];
            var topFaceRadio = colorRow.add("radiobutton", undefined, "보이는면");
            var innerFaceRadio = colorRow.add("radiobutton", undefined, "내부");
            var outerFaceRadio = colorRow.add("radiobutton", undefined, "외부");
            topFaceRadio.value = true;
            var kValueText = colorRow.add("statictext", undefined, "000K");
            kValueText.preferredSize.width = 42;
            kValueText.justify = "center";
            var kSlider = colorRow.add("scrollbar", undefined, faceK[activeFace], 0, 100);
            kSlider.preferredSize.width = 120;
            kSlider.stepdelta = K_STEP;
            kSlider.jumpdelta = K_STEP;
            kSlider.onChanging = function() { setK(Math.round(kSlider.value / K_STEP) * K_STEP); };

            setInnerFaceEnabled(innerDiameterMm > 0);
            updateKDisplay();

            var positionPanel = addPanel(dlg, "위치");
            var offsetXControls = addOffsetRow(positionPanel, "가로 이동", offsetXmm);
            var offsetYControls = addOffsetRow(positionPanel, "세로 이동", offsetYmm);
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetControls(offsetXControls, true);
            bindOffsetControls(offsetYControls, false);

            innerDiameterSlider.onChanging = function() {
                innerDiameterMm = clamp(
                    roundTo(innerDiameterSlider.value, DIAMETER_STEP_MM),
                    0,
                    maxInnerDiameterMm
                );
                innerDiameterInput.text = formatNumber(innerDiameterMm, 2);
                setInnerFaceEnabled(innerDiameterMm > 0);
                updatePreview();
            };

            innerDiameterInput.onChanging = function() {
                var value = parseNumber(innerDiameterInput.text);
                if (value !== null && value >= 0 && value < diameterMm) {
                    innerDiameterMm = clamp(roundTo(value, DIAMETER_STEP_MM), 0, maxInnerDiameterMm);
                    innerDiameterSlider.value = innerDiameterMm;
                    setInnerFaceEnabled(innerDiameterMm > 0);
                    updatePreview();
                }
            };


            innerDiameterInput.onChange = function() {
                var value = parseNumber(innerDiameterInput.text);
                if (value === null || value < 0 || value >= diameterMm) value = innerDiameterMm;
                innerDiameterMm = clamp(roundTo(value, DIAMETER_STEP_MM), 0, maxInnerDiameterMm);
                innerDiameterSlider.value = innerDiameterMm;
                innerDiameterInput.text = formatNumber(innerDiameterMm, 2);
                setInnerFaceEnabled(innerDiameterMm > 0);
                updatePreview();
            };

            heightSlider.onChanging = function() {
                heightMm = roundTo(heightSlider.value, HEIGHT_STEP_MM);
                heightInput.text = formatNumber(heightMm, 2);
                updatePreview();
            };


            heightInput.onChanging = function() {
                var value = parseNumber(heightInput.text);
                if (value !== null && value >= 0) {
                    heightMm = roundTo(value, HEIGHT_STEP_MM);
                    heightSlider.value = clamp(heightMm, 0, maxHeightMm);
                    updatePreview();
                }
            };

            heightInput.onChange = function() {
                var value = parseNumber(heightInput.text);
                if (value === null || value < 0) {
                    heightInput.text = formatNumber(heightMm, 2);
                    return;
                }
                heightMm = roundTo(value, HEIGHT_STEP_MM);
                heightSlider.value = clamp(heightMm, 0, maxHeightMm);
                heightInput.text = formatNumber(heightMm, 2);
                updatePreview();
            };

            bindAngleControls(xControls, function(value) { viewAngle = value; }, function() { return viewAngle; });
            bindAngleControls(yControls, function(value) { viewY = value; }, function() { return viewY; });
            bindAngleControls(zControls, function(value) { viewZ = value; }, function() { return viewZ; });

            verticalRadio.onClick = function() {
                isVertical = true;
                updatePreview();
            };

            horizontalRadio.onClick = function() {
                isVertical = false;
                updatePreview();
            };

            divisionCheck.onClick = function() {
                divisionsEnabled = divisionCheck.value;
                setDivisionControlsEnabled(divisionsEnabled);
                updatePreview();
            };

            countInput.onChanging = function() {
                var value = parseNumber(countInput.text);
                if (value !== null && value >= 2) {
                    divisionCount = Math.round(value);
                    updatePreview();
                }
            };

            countInput.onChange = function() {
                var value = parseNumber(countInput.text);
                if (value === null || value < 2) value = divisionCount;
                divisionCount = Math.max(2, Math.round(value));
                countInput.text = String(divisionCount);
                countSlider.value = clamp(divisionCount, 2, 24);
                updatePreview();
            };

            ratioInput.onChanging = updatePreview;
            countSlider.onChanging = function() {
                divisionCount = clamp(Math.round(countSlider.value), 2, 24);
                countInput.text = String(divisionCount);
                updatePreview();
            };

            rotationSlider.onChanging = function() {
                divisionRotation = Math.round(rotationSlider.value);
                rotationInput.text = formatSignedAngle(divisionRotation);
                updatePreview();
            };

            rotationInput.onChanging = function() {
                var value = parseNumber(rotationInput.text);
                if (value !== null && value >= -180 && value <= 180) {
                    divisionRotation = value;
                    rotationSlider.value = value;
                    updatePreview();
                }
            };

            rotationInput.onChange = function() {
                var value = parseNumber(rotationInput.text);
                if (value === null) value = divisionRotation;
                divisionRotation = clamp(value, -180, 180);
                rotationSlider.value = divisionRotation;
                rotationInput.text = formatSignedAngle(divisionRotation);
                updatePreview();
            };

            topFaceRadio.onClick = function() {
                activeFace = FACE_TOP;
                updateKDisplay();
            };

            innerFaceRadio.onClick = function() {
                activeFace = FACE_INNER;
                updateKDisplay();
            };

            outerFaceRadio.onClick = function() {
                activeFace = FACE_OUTER;
                updateKDisplay();
            };



            // 탭 호스트가 부르는 훅. 확인: 값 검증 → 저장 → 만들기
            api.commit = function() {
                var validHeight = parseNumber(heightInput.text);
                var validAngle = parseNumber(xControls.input.text);
                var validAngleY = parseNumber(yControls.input.text);
                var validAngleZ = parseNumber(zControls.input.text);
                var validInnerDiameter = parseNumber(innerDiameterInput.text);
                if (validInnerDiameter === null || validInnerDiameter < 0 || validInnerDiameter >= diameterMm) {
                    alert("내경은 0 이상, 외경보다 작은 값으로 입력해주세요.");
                    return false;
                }
                if (validHeight === null || validHeight < 0) {
                    alert("높이는 0 이상의 숫자로 입력해주세요.");
                    return false;
                }
                if (!isValidAngle(validAngle) || !isValidAngle(validAngleY) || !isValidAngle(validAngleZ)) {
                    alert("시점 각도는 -180부터 +180 사이로 입력해주세요.");
                    return false;
                }
                var validCount = parseNumber(countInput.text);
                var validRotation = parseNumber(rotationInput.text);
                if (divisionsEnabled && (validCount === null || validCount < 2)) {
                    alert("분할 수는 2 이상의 정수로 입력해주세요.");
                    return false;
                }
                if (divisionsEnabled && (validRotation === null || validRotation < -180 || validRotation > 180)) {
                    alert("분할선 회전은 -180부터 +180 사이로 입력해주세요.");
                    return false;
                }
                heightMm = roundTo(validHeight, HEIGHT_STEP_MM);
                innerDiameterMm = clamp(
                    roundTo(validInnerDiameter, DIAMETER_STEP_MM),
                    0,
                    maxInnerDiameterMm
                );
                viewAngle = validAngle;
                viewY = validAngleY;
                viewZ = validAngleZ;
                divisionCount = Math.max(2, Math.round(validCount));
                divisionRotation = validRotation;
                divisionRatioText = ratioInput.text;
                saveSettings();
                clearPreview();
                source.hidden = false;
                var finalGroup = buildCylinder();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "Cylinder";
                try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                source.remove();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // 이 탭이 켜져 있는 동안만 원본 원을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };

            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                previewGroup = buildCylinder();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                previewGroup.name = "Cylinder Preview";
                try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch(e) {}
                previewGroup = null;
            }

            // 원기둥 축을 3D로 회전시킨 뒤, 그 축이 만드는 두 값으로 환산해서 그린다.
            //  - 화면과 이루는 각(캡 타원의 납작한 정도) → createCylinder의 시점 각도
            //  - 화면상 축 방향 → 완성된 도형의 회전
            // 원기둥은 회전 대칭이라 이 두 값이 모양을 모두 결정한다.
            function getCylinderAxis() {
                var rx = (90 - viewAngle) * Math.PI / 180;
                var ry = viewY * Math.PI / 180;
                var rz = viewZ * Math.PI / 180;

                // 세운 원기둥의 축 (0, 1, 0)에 X → Y → Z 순서로 회전을 적용
                var x = 0;
                var y = Math.cos(rx);
                var z = Math.sin(rx);

                var nextX = (x * Math.cos(ry)) + (z * Math.sin(ry));
                z = (-x * Math.sin(ry)) + (z * Math.cos(ry));
                x = nextX;

                nextX = (x * Math.cos(rz)) - (y * Math.sin(rz));
                y = (x * Math.sin(rz)) + (y * Math.cos(rz));
                x = nextX;

                return {x: x, y: y, z: z};
            }

            function getViewGeometry() {
                var axis = getCylinderAxis();
                var planarLength = Math.sqrt((axis.x * axis.x) + (axis.y * axis.y));
                var tilt = Math.asin(clamp(axis.z, -1, 1)) * 180 / Math.PI;

                // createCylinder는 각도의 부호로 앞뒤 캡을 정하므로 축의 깊이 방향을 부호로 옮긴다
                var angle = axis.z >= 0 ? (90 - tilt) : -(90 + tilt);
                var rotation = 0;
                if (planarLength > 0.000001) {
                    rotation = (Math.atan2(axis.y, axis.x) * 180 / Math.PI) - 90;
                }
                if (!isVertical) {
                    rotation += 90;
                }

                return {angle: angle, rotation: rotation};
            }

            function buildCylinder() {
                var view = getViewGeometry();
                var group = createCylinder(heightMm * MM_TO_PT, view.angle, true);
                if (Math.abs(view.rotation) > 0.0001) {
                    // 도형 전체의 중심을 축으로 돌려야 제자리에서 회전한다.
                    // 캡(원본 원) 중심을 축으로 잡으면 몸통이 반대편으로 돌아 도형이 통째로 이동한다.
                    try {
                        group.rotate(view.rotation, true, true, true, true, Transformation.CENTER);
                    } catch (e) {}
                }
                return group;
            }

            function isValidAngle(value) {
                return value !== null && value >= -180 && value <= 180;
            }

            function saveSettings() {
                var parts = [
                    "v4", viewAngle, viewY, viewZ,
                    isVertical ? "1" : "0",
                    divisionsEnabled ? "1" : "0",
                    divisionCount, divisionRotation,
                    faceK[0], faceK[1], faceK[2],
                    encodeURIComponent(divisionRatioText),
                    innerDiameterMm, heightMm,
                    offsetXmm, offsetYmm
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if ((p[0] !== "v3" && p[0] !== "v4") || p.length < 14) return;
                viewAngle = restoreNumber(p[1], viewAngle, -180, 180);
                viewY = restoreNumber(p[2], viewY, -180, 180);
                viewZ = restoreNumber(p[3], viewZ, -180, 180);
                isVertical = (p[4] === "1");
                divisionsEnabled = (p[5] === "1");
                divisionCount = Math.round(restoreNumber(p[6], divisionCount, 2, 24));
                divisionRotation = restoreNumber(p[7], divisionRotation, -180, 180);
                for (var i = 0; i < 3; i++) {
                    faceK[i] = Math.round(restoreNumber(p[8 + i], faceK[i], 0, 100));
                }
                try { divisionRatioText = decodeURIComponent(p[11]); } catch (e2) {}
                innerDiameterMm = roundTo(restoreNumber(p[12], innerDiameterMm, 0, maxInnerDiameterMm), DIAMETER_STEP_MM);
                heightMm = roundTo(restoreNumber(p[13], heightMm, 0, maxHeightMm), HEIGHT_STEP_MM);
                if (p[0] === "v4" && p.length >= 16) {
                    offsetXmm = restoreNumber(p[14], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[15], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                }
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseFloat(text);
                if (isNaN(value) || value < minimum || value > maximum) return fallback;
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

            // 라벨 · (0 버튼) · 입력칸 · 단위 · 슬라이더를 한 줄에 배치
            function addValueRow(parent, label, unit, value, minimum, maximum, step, hasReset) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var labelText = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                // 0 버튼이 붙는 줄은 라벨을 줄여서 다른 줄과 폭을 맞춘다
                labelText.preferredSize.width = hasReset ? (LABEL_WIDTH - RESET_BUTTON_WIDTH - 10) : LABEL_WIDTH;
                var reset = null;
                if (hasReset) {
                    reset = row.add("button", undefined, "0");
                    reset.preferredSize.width = RESET_BUTTON_WIDTH;
                }
                var input = row.add("edittext", undefined, value);
                input.characters = 6;
                input.justify = "right";
                var slider = row.add("scrollbar", undefined, Number(value), minimum, maximum);
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                slider.stepdelta = step;
                return {row: row, input: input, slider: slider, reset: reset};
            }

            // 위치 행은 다른 줄과 같은 모양(0 버튼 포함)을 쓴다
            function addOffsetRow(parent, label, value) {
                return addValueRow(parent, label, "mm", formatNumber(value, 1),
                    -POSITION_LIMIT_MM, POSITION_LIMIT_MM, OFFSET_STEP_MM, true);
            }

            // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            function bindOffsetControls(controls, isX) {
                function current() { return isX ? offsetXmm : offsetYmm; }
                function commit(value) {
                    if (value === null || !isFinite(value)) return;
                    value = clamp(roundTo(value, OFFSET_STEP_MM), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    var delta = (value - current()) * MM_TO_PT;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    controls.input.text = formatNumber(value, 1);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? current() : value);
                };
                if (controls.reset) controls.reset.onClick = function() { commit(0); };
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function addAngleRow(parent, label, value, hasReset) {
                return addValueRow(parent, label, "°", formatSignedAngle(value), -180, 180, 1, hasReset);
            }

            function bindAngleControls(controls, setter, getter) {
                controls.slider.onChanging = function() {
                    var value = Math.round(controls.slider.value);
                    setter(value);
                    controls.input.text = formatSignedAngle(value);
                    updatePreview();
                };
                controls.input.onChanging = function() {
                    var value = parseNumber(controls.input.text);
                    if (value !== null && value >= -180 && value <= 180) {
                        setter(value);
                        controls.slider.value = value;
                        updatePreview();
                    }
                };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    if (value === null) value = getter();
                    value = clamp(value, -180, 180);
                    setter(value);
                    controls.input.text = formatSignedAngle(value);
                    controls.slider.value = value;
                    updatePreview();
                };
                if (controls.reset) {
                    controls.reset.onClick = function() {
                        setter(0);
                        controls.input.text = formatSignedAngle(0);
                        controls.slider.value = 0;
                        updatePreview();
                    };
                }

            }


            function setDivisionControlsEnabled(enabled) {
                countGroup.enabled = enabled;
                rotationRow.enabled = enabled;
                ratioRow.enabled = enabled;
            }

            function setInnerFaceEnabled(enabled) {
                innerFaceRadio.enabled = enabled;
                if (enabled || activeFace !== FACE_INNER) return;
                activeFace = FACE_TOP;
                topFaceRadio.value = true;
                updateKDisplay();
            }

            function updateKDisplay() {
                kValueText.text = faceK[activeFace] + "K";
                kSlider.value = faceK[activeFace];
            }

            function setK(value) {
                value = clamp(value, 0, 100);
                if (value === faceK[activeFace]) return;
                faceK[activeFace] = value;
                updateKDisplay();
                updatePreview();
            }

            function makeKColor(k) {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = k;
                    return cmyk;
                }
                var gray = new GrayColor();
                gray.gray = k;
                return gray;
            }

            function applyFill(item, k) {
                item.filled = true;
                item.fillColor = makeKColor(k);
                try { item.opacity = source.opacity; } catch(e) {}
            }

            function createCylinder(cylinderHeight, angleDegrees, vertical) {
                var radians = angleDegrees * Math.PI / 180;
                var projectedLength = cylinderHeight * Math.abs(Math.sin(radians));
                var capScale = Math.abs(Math.cos(radians));
                var minorSize = Math.max(0.01, diameter * capScale);
                var deltaX = vertical ? 0 : projectedLength;
                var deltaY = vertical ? -projectedLength : 0;
                var secondX = centerX + deltaX;
                var secondY = centerY + deltaY;
                var group = source.layer.groupItems.add();
                var innerRatio = diameterMm > 0 ? innerDiameterMm / diameterMm : 0;

                if (Math.abs(projectedLength) < 0.01 || cylinderHeight < 0.01) {
                    makeFrontFace(group, centerX, centerY, diameter, diameter, innerRatio);
                    if (divisionsEnabled) {
                        var singleCapPoints = getDivisionPoints(
                            centerX,
                            centerY,
                            centerX,
                            centerY,
                            diameter,
                            diameter,
                            innerRatio,
                            getDivisionAngles()
                        );
                        for (var singleIndex = 0; singleIndex < singleCapPoints.length; singleIndex++) {
                            var singleDivision = makeLine(
                                group,
                                singleCapPoints[singleIndex].innerFront[0],
                                singleCapPoints[singleIndex].innerFront[1],
                                singleCapPoints[singleIndex].front[0],
                                singleCapPoints[singleIndex].front[1]
                            );
                            copyStrokeStyle(source, singleDivision);
                        }
                    }
                    return group;
                }

                var rearIsSecond = angleDegrees >= 0;
                var rearX = rearIsSecond ? secondX : centerX;
                var rearY = rearIsSecond ? secondY : centerY;
                var frontX = rearIsSecond ? centerX : secondX;
                var frontY = rearIsSecond ? centerY : secondY;
                var capWidth = vertical ? diameter : minorSize;
                var capHeight = vertical ? minorSize : diameter;
                var innerRadiusX = capWidth / 2 * innerRatio;
                var innerRadiusY = capHeight / 2 * innerRatio;
                var holeGeometry = innerRatio > 0 ?
                    innerHoleGeometry(frontX, frontY, rearX, rearY, innerRadiusX, innerRadiusY) :
                    {mode: "solid"};

                var bodyFill = makeBodyFill(
                    group,
                    frontX,
                    frontY,
                    rearX,
                    rearY,
                    capWidth / 2,
                    capHeight / 2,
                    innerRadiusX,
                    innerRadiusY
                );
                bodyFill.stroked = false;
                applyFill(bodyFill, faceK[FACE_OUTER]);
                try { bodyFill.zOrder(ZOrderMethod.SENDTOBACK); } catch(bodyFillOrderError) {}

                var rearCap = makeRearRim(
                    group,
                    rearX,
                    rearY,
                    capWidth,
                    capHeight,
                    rearX - frontX,
                    rearY - frontY
                );
                copyStrokeStyle(source, rearCap);

                var sideLineA;
                var sideLineB;
                if (vertical) {
                    sideLineA = makeLine(group, centerX - diameter / 2, centerY, secondX - diameter / 2, secondY);
                    sideLineB = makeLine(group, centerX + diameter / 2, centerY, secondX + diameter / 2, secondY);
                } else {
                    sideLineA = makeLine(group, centerX, centerY + diameter / 2, secondX, secondY + diameter / 2);
                    sideLineB = makeLine(group, centerX, centerY - diameter / 2, secondX, secondY - diameter / 2);
                }
                copyStrokeStyle(source, sideLineA);
                copyStrokeStyle(source, sideLineB);

                var divisionPoints = divisionsEnabled ? getDivisionPoints(
                    frontX,
                    frontY,
                    rearX,
                    rearY,
                    capWidth,
                    capHeight,
                    innerRatio,
                    getDivisionAngles()
                ) : [];
                for (var divisionIndex = 0; divisionIndex < divisionPoints.length; divisionIndex++) {
                    var divisionPoint = divisionPoints[divisionIndex];
                    if (divisionPoint.visibleOnSide) {
                        var bodyDivision = makeLine(
                            group,
                            divisionPoint.front[0],
                            divisionPoint.front[1],
                            divisionPoint.rear[0],
                            divisionPoint.rear[1]
                        );
                        copyStrokeStyle(source, bodyDivision);
                    }
                }

                if (innerRatio > 0) {
                    drawInnerHoleFill(group, frontX, frontY, rearX, rearY,
                        innerRadiusX, innerRadiusY, holeGeometry);
                }

                var frontFaceItems = makeFrontFace(group, frontX, frontY, capWidth, capHeight, innerRatio);
                for (var faceIndex = 0; faceIndex < frontFaceItems.length; faceIndex++) {
                    try { frontFaceItems[faceIndex].zOrder(ZOrderMethod.BRINGTOFRONT); } catch(e3) {}
                }

                if (innerRatio > 0) {
                    for (var innerDivisionIndex = 0; innerDivisionIndex < divisionPoints.length; innerDivisionIndex++) {
                        var innerDivisionPoint = divisionPoints[innerDivisionIndex];
                        if (innerDivisionPoint.visibleOnInnerWall) {
                            var innerWallDivision = makeLine(
                                group,
                                innerDivisionPoint.innerFront[0],
                                innerDivisionPoint.innerFront[1],
                                innerDivisionPoint.innerWallEnd[0],
                                innerDivisionPoint.innerWallEnd[1]
                            );
                            copyStrokeStyle(source, innerWallDivision);
                        }
                    }
                }

                for (var capDivisionIndex = 0; capDivisionIndex < divisionPoints.length; capDivisionIndex++) {
                    var capDivisionPoint = divisionPoints[capDivisionIndex];
                    var capDivision = makeLine(
                        group,
                        capDivisionPoint.innerFront[0],
                        capDivisionPoint.innerFront[1],
                        capDivisionPoint.front[0],
                        capDivisionPoint.front[1]
                    );
                    copyStrokeStyle(source, capDivision);
                }
                return group;
            }

            // 쉼표로 구분한 비율 목록. 2개 이상, 전부 0보다 커야 유효. 아니면 null(균등 분할).
            function parseDivisionRatios(text) {
                var pieces = String(text).split(",");
                var ratios = [];
                for (var i = 0; i < pieces.length; i++) {
                    var piece = pieces[i].replace(/^\s+|\s+$/g, "");
                    if (piece === "") continue;
                    var value = parseFloat(piece);
                    if (isNaN(value) || value <= 0) return null;
                    ratios.push(value);
                }
                return ratios.length >= 2 ? ratios : null;
            }

            // 분할선 각도 목록: 비율이 있으면 누적 비율 위치(12시부터 시계 방향), 없으면 균등
            function getDivisionAngles() {
                var rotationRadians = divisionRotation * Math.PI / 180;
                var ratios = parseDivisionRatios(ratioInput.text);
                var angles = [];

                if (ratios !== null) {
                    var total = 0;
                    for (var r = 0; r < ratios.length; r++) total += ratios[r];
                    var cumulative = 0;
                    for (var i = 0; i < ratios.length; i++) {
                        angles.push(rotationRadians - (cumulative / total) * Math.PI * 2);
                        cumulative += ratios[i];
                    }
                } else {
                    for (var j = 0; j < divisionCount; j++) {
                        angles.push(rotationRadians + (Math.PI * 2 * j / divisionCount));
                    }
                }
                return angles;
            }

            function getDivisionPoints(frontX, frontY, rearX, rearY, capWidth, capHeight, innerRatio, angles) {
                var points = [];
                var axisX = rearX - frontX;
                var axisY = rearY - frontY;
                var holeRadiusX = capWidth / 2 * innerRatio;
                var holeRadiusY = capHeight / 2 * innerRatio;

                for (var i = 0; i < angles.length; i++) {
                    var angle = angles[i];
                    var radialX = capWidth / 2 * Math.cos(angle);
                    var radialY = capHeight / 2 * Math.sin(angle);
                    var sideDot = radialX * axisX + radialY * axisY;
                    var innerX = radialX * innerRatio;
                    var innerY = radialY * innerRatio;
                    // 내부 벽 분할선은 벽면을 따라 뒤쪽 구멍 테두리(t=1)까지 가되,
                    // 깊은 원기둥에서는 그 전에 앞 구멍 타원을 벗어나는 지점에서 멈춘다.
                    var wallT = 1;
                    if (holeRadiusX > 0 && holeRadiusY > 0) {
                        var axisU = axisX / holeRadiusX;
                        var axisV = axisY / holeRadiusY;
                        var axisLen2 = axisU * axisU + axisV * axisV;
                        var axisDot = Math.cos(angle) * axisU + Math.sin(angle) * axisV;
                        if (axisLen2 > 0 && axisDot < 0) wallT = Math.min(1, -2 * axisDot / axisLen2);
                    }
                    points.push({
                        front: [frontX + radialX, frontY + radialY],
                        innerFront: [frontX + innerX, frontY + innerY],
                        innerWallEnd: [frontX + innerX + wallT * axisX, frontY + innerY + wallT * axisY],
                        rear: [rearX + radialX, rearY + radialY],
                        visibleOnSide: sideDot > 0.0001,
                        visibleOnInnerWall: sideDot < -0.0001
                    });
                }
                return points;
            }

            function makeCap(group, x, y, width, height) {
                return group.pathItems.ellipse(y + height / 2, x - width / 2, width, height);
            }

            function makeFrontFace(group, x, y, width, height, innerRatio) {
                var items = [];
                var outerCap;

                if (innerRatio <= 0) {
                    outerCap = makeCap(group, x, y, width, height);
                    applyFill(outerCap, faceK[FACE_TOP]);
                    copyStrokeStyle(source, outerCap);
                    items.push(outerCap);
                    return items;
                }

                var fillSegments = makeRingFillSegments(group, x, y, width, height, innerRatio);
                for (var fillIndex = 0; fillIndex < fillSegments.length; fillIndex++) {
                    items.push(fillSegments[fillIndex]);
                }

                outerCap = makeCap(group, x, y, width, height);
                outerCap.filled = false;
                copyStrokeStyle(source, outerCap);
                try { outerCap.opacity = source.opacity; } catch(e) {}
                items.push(outerCap);

                var innerCap = makeCap(group, x, y, width * innerRatio, height * innerRatio);
                innerCap.filled = false;
                copyStrokeStyle(source, innerCap);
                items.push(innerCap);
                return items;
            }

            // Paints what is seen through the hole. "wall": the tube is deep enough that the
            // opening is fully backed by inner wall (opaque inner color). "crescent": part of
            // the opening shows inner wall, the rest sees through the tube (left unpainted so
            // the background shows). "seethrough": nothing to paint.
            function drawInnerHoleFill(group, frontX, frontY, rearX, rearY, radiusX, radiusY, geo) {
                if (geo.mode === "wall") {
                    var wall = createPathFromPoints(group, ellipseFullPoints(frontX, frontY, radiusX, radiusY), true);
                    wall.stroked = false;
                    applyFill(wall, faceK[FACE_INNER]);
                    return;
                }
                if (geo.mode !== "crescent") return;

                var frontSweep = pickArcSweep(frontX, frontY, radiusX, radiusY,
                    geo.frontAngle1, geo.frontAngle2, rearX, rearY, radiusX, radiusY, false);
                var rearSweep = pickArcSweep(rearX, rearY, radiusX, radiusY,
                    geo.rearAngle2, geo.rearAngle1, frontX, frontY, radiusX, radiusY, true);

                var frontPoints = [];
                appendArcPoints(frontPoints, frontX, frontY, radiusX, radiusY, geo.frontAngle1, frontSweep, false);
                var rearPoints = [];
                appendArcPoints(rearPoints, rearX, rearY, radiusX, radiusY, geo.rearAngle2, rearSweep, false);
                // 두 호가 만나는 접점에서는 이어지는 구간을 그리는 호의 접선 핸들을 써야
                // 곡선이 경계 밖(비쳐 보여야 하는 영역)으로 불거지지 않는다.
                frontPoints[frontPoints.length - 1].rightDirection = rearPoints[0].rightDirection;
                frontPoints[frontPoints.length - 1].corner = true;
                frontPoints[0].leftDirection = rearPoints[rearPoints.length - 1].leftDirection;
                frontPoints[0].corner = true;
                var points = frontPoints.concat(rearPoints.slice(1, rearPoints.length - 1));

                var crescent = createPathFromPoints(group, points, true);
                crescent.stroked = false;
                applyFill(crescent, faceK[FACE_INNER]);

                var farRim = makeArcPath(group, rearX, rearY, radiusX, radiusY, geo.rearAngle2, rearSweep);
                copyStrokeStyle(source, farRim);
            }

            function makeRingFillSegments(group, x, y, width, height, innerRatio) {
                var segments = [];
                var outerRadiusX = width / 2;
                var outerRadiusY = height / 2;
                var innerRadiusX = outerRadiusX * innerRatio;
                var innerRadiusY = outerRadiusY * innerRatio;
                for (var i = 0; i < 4; i++) {
                    var startAngle = i * Math.PI / 2;
                    var endAngle = (i + 1) * Math.PI / 2;
                    var segment = makeRingSegment(
                        group,
                        x,
                        y,
                        outerRadiusX,
                        outerRadiusY,
                        innerRadiusX,
                        innerRadiusY,
                        startAngle,
                        endAngle
                    );
                    segment.stroked = false;
                    applyFill(segment, faceK[FACE_TOP]);
                    segments.push(segment);
                }
                return segments;
            }

            function makeRingSegment(group, x, y, outerRadiusX, outerRadiusY,
                    innerRadiusX, innerRadiusY, startAngle, endAngle) {
                var handleScale = 0.5522847498;
                var outerStart = ellipsePoint(x, y, outerRadiusX, outerRadiusY, startAngle);
                var outerEnd = ellipsePoint(x, y, outerRadiusX, outerRadiusY, endAngle);
                var innerEnd = ellipsePoint(x, y, innerRadiusX, innerRadiusY, endAngle);
                var innerStart = ellipsePoint(x, y, innerRadiusX, innerRadiusY, startAngle);
                var path = group.pathItems.add();
                path.setEntirePath([outerStart, outerEnd, innerEnd, innerStart]);
                path.closed = true;

                var outerStartTangent = ellipseTangent(outerRadiusX, outerRadiusY, startAngle, handleScale);
                var outerEndTangent = ellipseTangent(outerRadiusX, outerRadiusY, endAngle, handleScale);
                var innerEndTangent = ellipseTangent(innerRadiusX, innerRadiusY, endAngle, handleScale);
                var innerStartTangent = ellipseTangent(innerRadiusX, innerRadiusY, startAngle, handleScale);

                setPathPoint(path.pathPoints[0], outerStart, outerStart,
                    addPoint(outerStart, outerStartTangent));
                setPathPoint(path.pathPoints[1], outerEnd,
                    subtractPoint(outerEnd, outerEndTangent), outerEnd);
                setPathPoint(path.pathPoints[2], innerEnd, innerEnd,
                    subtractPoint(innerEnd, innerEndTangent));
                setPathPoint(path.pathPoints[3], innerStart,
                    addPoint(innerStart, innerStartTangent), innerStart);
                return path;
            }

            function ellipseTangent(radiusX, radiusY, angle, scale) {
                return [-radiusX * Math.sin(angle) * scale, radiusY * Math.cos(angle) * scale];
            }

            function appendArcPoints(points, x, y, radiusX, radiusY, startAngle, sweep, skipFirst) {
                var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 0.000001));
                var step = sweep / count;
                var handleScale = 4 / 3 * Math.tan(step / 4);
                for (var i = skipFirst ? 1 : 0; i <= count; i++) {
                    var angle = startAngle + step * i;
                    var anchor = ellipsePoint(x, y, radiusX, radiusY, angle);
                    var tangent = ellipseTangent(radiusX, radiusY, angle, handleScale);
                    points.push({
                        anchor: anchor,
                        leftDirection: subtractPoint(anchor, tangent),
                        rightDirection: addPoint(anchor, tangent),
                        corner: false
                    });
                }
            }

            function createPathFromPoints(container, points, closed) {
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                var path = container.pathItems.add();
                path.setEntirePath(anchors);
                path.closed = closed;
                path.filled = false;
                for (var j = 0; j < points.length; j++) {
                    var pathPoint = path.pathPoints[j];
                    pathPoint.anchor = points[j].anchor;
                    pathPoint.leftDirection = points[j].leftDirection;
                    pathPoint.rightDirection = points[j].rightDirection;
                    pathPoint.pointType = points[j].corner ? PointType.CORNER : PointType.SMOOTH;
                }
                return path;
            }

            function makeArcPath(group, x, y, radiusX, radiusY, startAngle, sweep) {
                var points = [];
                appendCornerArc(points, x, y, radiusX, radiusY, startAngle, sweep);
                return createPathFromPoints(group, points, false);
            }

            // 양 끝 핸들을 앵커로 눌러 직선 변과 각지게 이어지는 호를 추가한다.
            function appendCornerArc(points, x, y, radiusX, radiusY, startAngle, sweep) {
                var start = points.length;
                appendArcPoints(points, x, y, radiusX, radiusY, startAngle, sweep, false);
                points[start].leftDirection = points[start].anchor;
                points[start].corner = true;
                var last = points.length - 1;
                points[last].rightDirection = points[last].anchor;
                points[last].corner = true;
            }

            function cornerPoint(anchor) {
                return {anchor: anchor, leftDirection: anchor, rightDirection: anchor, corner: true};
            }

            // 옆면과 뒤 테두리를 하나로 채우는 몸통 경로. 앞 캡 중심선 변에서 앞 구멍(내경)의
            // 뒤쪽 절반을 물어내, 구멍으로 비쳐 보여야 하는 배경을 가리지 않는다.
            // 물린 부분 중 내부 벽이 보이는 곳은 이후 drawInnerHoleFill이 위에 다시 칠한다.
            function makeBodyFill(group, frontX, frontY, rearX, rearY,
                    outerRadiusX, outerRadiusY, innerRadiusX, innerRadiusY) {
                var axisAngle = Math.atan2(rearY - frontY, rearX - frontX);
                var perpAngle = axisAngle + Math.PI / 2;
                var points = [];
                points.push(cornerPoint(ellipsePoint(frontX, frontY, outerRadiusX, outerRadiusY, perpAngle)));
                if (innerRadiusX > 0 && innerRadiusY > 0) {
                    appendCornerArc(points, frontX, frontY, innerRadiusX, innerRadiusY, perpAngle, -Math.PI);
                }
                points.push(cornerPoint(ellipsePoint(frontX, frontY, outerRadiusX, outerRadiusY, perpAngle + Math.PI)));
                appendCornerArc(points, rearX, rearY, outerRadiusX, outerRadiusY, perpAngle + Math.PI, Math.PI);
                return createPathFromPoints(group, points, true);
            }

            function ellipseFullPoints(x, y, radiusX, radiusY) {
                var points = [];
                appendArcPoints(points, x, y, radiusX, radiusY, 0, Math.PI * 2, false);
                points.pop();
                return points;
            }

            function ellipseContains(px, py, cx, cy, radiusX, radiusY) {
                var nx = (px - cx) / radiusX;
                var ny = (py - cy) / radiusY;
                return nx * nx + ny * ny < 1;
            }

            // Intersection of two congruent, axis-aligned ellipses (front hole opening and
            // rear hole opening) that share radii but differ in center. Normalizing by the
            // radii turns them into unit circles, so the classic circle-circle intersection
            // gives the two crossing points; those are mapped back to ellipse space.
            function innerHoleGeometry(frontX, frontY, rearX, rearY, radiusX, radiusY) {
                if (radiusX <= 0 || radiusY <= 0) return {mode: "seethrough"};
                var fx = frontX / radiusX, fy = frontY / radiusY;
                var gx = rearX / radiusX, gy = rearY / radiusY;
                var dx = gx - fx, dy = gy - fy;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 0.000001) return {mode: "seethrough"};
                if (d >= 2) return {mode: "wall"};
                var half = Math.sqrt(1 - (d / 2) * (d / 2));
                var midX = (fx + gx) / 2, midY = (fy + gy) / 2;
                var perpX = -dy / d, perpY = dx / d;
                var n1X = midX + half * perpX, n1Y = midY + half * perpY;
                var n2X = midX - half * perpX, n2Y = midY - half * perpY;
                return {
                    mode: "crescent",
                    frontAngle1: Math.atan2(n1Y - fy, n1X - fx),
                    frontAngle2: Math.atan2(n2Y - fy, n2X - fx),
                    rearAngle1: Math.atan2(n1Y - gy, n1X - gx),
                    rearAngle2: Math.atan2(n2Y - gy, n2X - gx)
                };
            }

            // Choose which way to travel from a1 to a2 along an ellipse so the arc's midpoint
            // is inside (or outside) a reference ellipse; returns the signed sweep.
            function pickArcSweep(cx, cy, radiusX, radiusY, a1, a2,
                    refX, refY, refRadiusX, refRadiusY, wantInside) {
                var sweep = a2 - a1;
                while (sweep <= 0) sweep += Math.PI * 2;
                var midAngle = a1 + sweep / 2;
                var midPoint = ellipsePoint(cx, cy, radiusX, radiusY, midAngle);
                var inside = ellipseContains(midPoint[0], midPoint[1], refX, refY, refRadiusX, refRadiusY);
                if (inside !== wantInside) sweep -= Math.PI * 2;
                return sweep;
            }

            function addPoint(point, delta) {
                return [point[0] + delta[0], point[1] + delta[1]];
            }

            function subtractPoint(point, delta) {
                return [point[0] - delta[0], point[1] - delta[1]];
            }

            function setPathPoint(pathPoint, anchor, leftDirection, rightDirection) {
                pathPoint.anchor = anchor;
                pathPoint.leftDirection = leftDirection;
                pathPoint.rightDirection = rightDirection;
                pathPoint.pointType = PointType.CORNER;
            }

            function makeRearRim(group, x, y, width, height, axisX, axisY) {
                var radiusX = width / 2;
                var radiusY = height / 2;
                var centerAngle = Math.atan2(axisY / radiusY, axisX / radiusX);
                var startAngle = centerAngle - Math.PI / 2;
                var middleAngle = centerAngle;
                var endAngle = centerAngle + Math.PI / 2;
                var handleScale = 0.5522847498;
                var arc = group.pathItems.add();
                var angles = [startAngle, middleAngle, endAngle];

                arc.setEntirePath([
                    ellipsePoint(x, y, radiusX, radiusY, startAngle),
                    ellipsePoint(x, y, radiusX, radiusY, middleAngle),
                    ellipsePoint(x, y, radiusX, radiusY, endAngle)
                ]);
                arc.closed = false;
                arc.filled = false;

                for (var i = 0; i < arc.pathPoints.length; i++) {
                    var point = arc.pathPoints[i];
                    var angle = angles[i];
                    var anchor = ellipsePoint(x, y, radiusX, radiusY, angle);
                    var tangentX = -radiusX * Math.sin(angle) * handleScale;
                    var tangentY = radiusY * Math.cos(angle) * handleScale;
                    point.anchor = anchor;
                    point.leftDirection = i === 0 ? anchor : [anchor[0] - tangentX, anchor[1] - tangentY];
                    point.rightDirection = i === arc.pathPoints.length - 1 ? anchor :
                        [anchor[0] + tangentX, anchor[1] + tangentY];
                    point.pointType = PointType.SMOOTH;
                }
                return arc;
            }

            function ellipsePoint(x, y, radiusX, radiusY, angle) {
                return [x + radiusX * Math.cos(angle), y + radiusY * Math.sin(angle)];
            }

            function makeLine(group, x1, y1, x2, y2) {
                var line = group.pathItems.add();
                line.setEntirePath([[x1, y1], [x2, y2]]);
                line.closed = false;
                line.filled = false;
                return line;
            }

            function copyStrokeStyle(from, to) {
                to.stroked = from.stroked;
                if (!from.stroked) return;
                try { to.strokeColor = from.strokeColor; } catch(e) {}
                try { to.strokeWidth = from.strokeWidth; } catch(e2) {}
                try { to.strokeDashes = from.strokeDashes; } catch(e3) {}
                try { to.strokeDashOffset = from.strokeDashOffset; } catch(e4) {}
                try { to.strokeCap = from.strokeCap; } catch(e5) {}
                try { to.strokeJoin = from.strokeJoin; } catch(e6) {}
                try { to.strokeMiterLimit = from.strokeMiterLimit; } catch(e7) {}
            }

            function getSelectedCircle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                return item.typename === "PathItem" && item.closed ? item : null;
            }

            function hasCircularPathPoints(item) {
                if (item.pathPoints.length !== 4) return false;
                for (var i = 0; i < item.pathPoints.length; i++) {
                    var point = item.pathPoints[i];
                    var leftIsAnchor = point.leftDirection[0] === point.anchor[0] &&
                        point.leftDirection[1] === point.anchor[1];
                    var rightIsAnchor = point.rightDirection[0] === point.anchor[0] &&
                        point.rightDirection[1] === point.anchor[1];
                    if (leftIsAnchor && rightIsAnchor) return false;
                }
                return true;
            }

            function parseNumber(value) {
                var number = parseFloat(String(value).replace(",", "."));
                return isNaN(number) ? null : number;
            }

            function clamp(value, min, max) {
                return Math.max(min, Math.min(max, value));
            }

            function roundTo(value, step) {
                return Math.round(value / step) * step;
            }

            function formatNumber(value, decimals) {
                return Number(value).toFixed(decimals);
            }

            function formatSignedAngle(value) {
                value = Math.round(value);
                return value > 0 ? "+" + value : String(value);
            }
            return null;
        }
        return api;
    }

    // ==== 원뿔 ====
    function makeConeEngine() {
        var api = {label: "원뿔", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            var source = getSelectedCircle(doc.selection);
            if (source === null) return "원 패스 하나만 선택해주세요.";

            var bounds = source.geometricBounds;
            var diameter = bounds[2] - bounds[0];
            var sourceHeight = bounds[1] - bounds[3];
            if (diameter <= 0 ||
                    Math.abs(diameter - sourceHeight) > Math.max(0.1, diameter * 0.01) ||
                    !hasCircularPathPoints(source)) return "가로와 세로 크기가 같은 원을 선택해주세요.";

            var MM_TO_PT = 2.83464567;
            var SIZE_STEP_MM = 0.05;
            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var LINE_WIDTH_PT = 0.3;
            var RING_SAMPLE_COUNT = 24;
            var centerX = (bounds[0] + bounds[2]) / 2;
            var centerY = (bounds[1] + bounds[3]) / 2;
            var diameterMm = diameter / MM_TO_PT;
            var baseDiameterMm = roundTo(diameterMm, SIZE_STEP_MM);
            var maxBaseDiameterMm = Math.max(SIZE_STEP_MM, roundTo(diameterMm * 5, SIZE_STEP_MM));
            var topDiameterMm = 0;
            var heightMm = roundTo(diameterMm, SIZE_STEP_MM);
            var maxHeightMm = Math.max(SIZE_STEP_MM, roundTo(diameterMm * 5, SIZE_STEP_MM));
            var viewX = 20;
            var viewY = 0;
            var viewZ = 0;
            var divisionCount = 0;
            var FACE_TOP = 0;
            var FACE_SIDE = 1;
            var FACE_BOTTOM = 2;
            var faceK = [0, 0, 0];
            var activeFace = FACE_TOP;
            var K_STEP = 10;
            var RESET_BUTTON_WIDTH = 34;
            var previewEnabled = true;
            var previewGroup = null;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var sourceWasHidden = source.hidden;

            // 크기는 선택한 원에서 계산하므로 저장하지 않는다. 시점·분할선·컬러만 기억한다.
            var PREF_KEY = "ObjectCone/settings";
            applySavedSettings();

            // 0 버튼이 붙는 줄도 라벨이 잘리지 않도록 넓힌다.
            var LABEL_WIDTH = 70;
            var SLIDER_WIDTH = 196;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.

            var dlg = page;

            var sizePanel = addPanel(dlg, "크기");
            var baseControls = addSizeRow(sizePanel, "밑면 지름", baseDiameterMm, SIZE_STEP_MM, maxBaseDiameterMm);
            var baseInput = baseControls.input;
            var baseSlider = baseControls.slider;
            var topControls = addSizeRow(sizePanel, "윗면 지름", topDiameterMm, 0, baseDiameterMm);
            var topInput = topControls.input;
            var topSlider = topControls.slider;
            var heightControls = addSizeRow(sizePanel, "높이", heightMm, SIZE_STEP_MM, maxHeightMm);
            var heightInput = heightControls.input;
            var heightSlider = heightControls.slider;

            var viewPanel = addPanel(dlg, "시점");
            var xControls = addAngleControls(viewPanel, "X축", viewX);
            var yControls = addAngleControls(viewPanel, "Y축", viewY);
            var zControls = addAngleControls(viewPanel, "Z축", viewZ);

            var extraPanel = addPanel(dlg, "분할선 · 컬러");

            var divisionRow = extraPanel.add("group");
            divisionRow.alignChildren = ["left", "center"];
            var divisionLabel = divisionRow.add("statictext", undefined, "분할선");
            divisionLabel.preferredSize.width = LABEL_WIDTH;
            var divisionInput = divisionRow.add("edittext", undefined, String(divisionCount));
            divisionInput.characters = 4;
            divisionInput.justify = "center";
            var divisionSlider = divisionRow.add("scrollbar", undefined, divisionCount, 0, 24);
            divisionSlider.stepdelta = 1;
            divisionSlider.jumpdelta = 1 * 10;
            divisionSlider.preferredSize.width = SLIDER_WIDTH;

            var colorRow = extraPanel.add("group");
            colorRow.alignChildren = ["left", "center"];
            var colorLabel = colorRow.add("statictext", undefined, "컬러");
            colorLabel.preferredSize.width = LABEL_WIDTH;
            var topFaceRadio = colorRow.add("radiobutton", undefined, "윗면");
            var sideFaceRadio = colorRow.add("radiobutton", undefined, "옆면");
            var bottomFaceRadio = colorRow.add("radiobutton", undefined, "아랫면");
            topFaceRadio.value = true;
            var kValueText = colorRow.add("statictext", undefined, "0K");
            kValueText.preferredSize.width = 42;
            kValueText.justify = "center";
            var kSlider = colorRow.add("scrollbar", undefined, faceK[activeFace], 0, 100);
            kSlider.preferredSize.width = 120;
            kSlider.stepdelta = K_STEP;
            kSlider.jumpdelta = K_STEP;
            kSlider.onChanging = function() { setK(Math.round(kSlider.value / K_STEP) * K_STEP); };
            updateKDisplay();

            var positionPanel = addPanel(dlg, "위치");
            var offsetXControls = addOffsetRow(positionPanel, "가로 이동", offsetXmm);
            var offsetYControls = addOffsetRow(positionPanel, "세로 이동", offsetYmm);
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetControls(offsetXControls, true);
            bindOffsetControls(offsetYControls, false);

            baseSlider.onChanging = function() {
                baseDiameterMm = roundTo(baseSlider.value, SIZE_STEP_MM);
                baseInput.text = formatNumber(baseDiameterMm, 2);
                updateTopDiameterLimit();
                updatePreview();
            };
            baseInput.onChanging = function() {
                var value = parseNumber(baseInput.text);
                if (value !== null && value >= SIZE_STEP_MM && value <= maxBaseDiameterMm) {
                    baseDiameterMm = roundTo(value, SIZE_STEP_MM);
                    baseSlider.value = baseDiameterMm;
                    updateTopDiameterLimit();
                    updatePreview();
                }
            };
            baseInput.onChange = function() {
                var value = parseNumber(baseInput.text);
                if (value === null) value = baseDiameterMm;
                baseDiameterMm = clamp(roundTo(value, SIZE_STEP_MM), SIZE_STEP_MM, maxBaseDiameterMm);
                baseInput.text = formatNumber(baseDiameterMm, 2);
                baseSlider.value = baseDiameterMm;
                updateTopDiameterLimit();
                updatePreview();
            };

            topSlider.onChanging = function() {
                topDiameterMm = roundTo(topSlider.value, SIZE_STEP_MM);
                topInput.text = formatNumber(topDiameterMm, 2);
                updatePreview();
            };
            topInput.onChanging = function() {
                var value = parseNumber(topInput.text);
                if (value !== null && value >= 0 && value <= baseDiameterMm) {
                    topDiameterMm = roundTo(value, SIZE_STEP_MM);
                    topSlider.value = topDiameterMm;
                    updatePreview();
                }
            };
            topInput.onChange = function() {
                var value = parseNumber(topInput.text);
                if (value === null) value = topDiameterMm;
                topDiameterMm = clamp(roundTo(value, SIZE_STEP_MM), 0, baseDiameterMm);
                topInput.text = formatNumber(topDiameterMm, 2);
                topSlider.value = topDiameterMm;
                updatePreview();
            };

            heightSlider.onChanging = function() {
                heightMm = roundTo(heightSlider.value, SIZE_STEP_MM);
                heightInput.text = formatNumber(heightMm, 2);
                updatePreview();
            };
            heightInput.onChanging = function() {
                var value = parseNumber(heightInput.text);
                if (value !== null && value > 0) {
                    heightMm = roundTo(value, SIZE_STEP_MM);
                    heightSlider.value = clamp(heightMm, SIZE_STEP_MM, maxHeightMm);
                    updatePreview();
                }
            };
            heightInput.onChange = function() {
                var value = parseNumber(heightInput.text);
                if (value === null || value <= 0) value = heightMm;
                heightMm = Math.max(SIZE_STEP_MM, roundTo(value, SIZE_STEP_MM));
                heightInput.text = formatNumber(heightMm, 2);
                heightSlider.value = clamp(heightMm, SIZE_STEP_MM, maxHeightMm);
                updatePreview();
            };

            divisionInput.onChanging = function() {
                var value = parseNumber(divisionInput.text);
                if (value !== null && value >= 0 && value <= 24) {
                    divisionCount = Math.round(value);
                    updatePreview();
                }
            };
            divisionInput.onChange = function() {
                var value = parseNumber(divisionInput.text);
                if (value === null) value = divisionCount;
                divisionCount = clamp(Math.round(value), 0, 24);
                divisionInput.text = String(divisionCount);
                divisionSlider.value = divisionCount;
                updatePreview();
            };
            divisionSlider.onChanging = function() {
                divisionCount = clamp(Math.round(divisionSlider.value), 0, 24);
                divisionInput.text = String(divisionCount);
                updatePreview();
            };

            bindViewControls(xControls, function(value) { viewX = value; }, function() { return viewX; });
            bindViewControls(yControls, function(value) { viewY = value; }, function() { return viewY; });
            bindViewControls(zControls, function(value) { viewZ = value; }, function() { return viewZ; });

            topFaceRadio.onClick = function() {
                activeFace = FACE_TOP;
                updateKDisplay();
            };
            sideFaceRadio.onClick = function() {
                activeFace = FACE_SIDE;
                updateKDisplay();
            };
            bottomFaceRadio.onClick = function() {
                activeFace = FACE_BOTTOM;
                updateKDisplay();
            };

            // 탭 호스트가 부르는 훅. 확인: 값 검증 → 저장 → 만들기
            api.commit = function() {
                var validBase = parseNumber(baseInput.text);
                var validTop = parseNumber(topInput.text);
                var validHeight = parseNumber(heightInput.text);
                var validDivision = parseNumber(divisionInput.text);
                if (validBase === null || validBase < SIZE_STEP_MM || validBase > maxBaseDiameterMm) {
                    alert("밑면 지름은 " + formatNumber(SIZE_STEP_MM, 2) + "mm부터 " +
                        formatNumber(maxBaseDiameterMm, 2) + "mm 사이로 입력해주세요.");
                    return false;
                }
                if (validTop === null || validTop < 0 || validTop > validBase) {
                    alert("윗면 지름은 0 이상, 밑면 지름 이하로 입력해주세요.");
                    return false;
                }
                if (validHeight === null || validHeight <= 0) {
                    alert("높이는 0보다 큰 숫자로 입력해주세요.");
                    return false;
                }
                if (validDivision === null || validDivision < 0 || validDivision > 24) {
                    alert("분할선 수는 0부터 24 사이의 정수로 입력해주세요.");
                    return false;
                }
                if (!commitAngleInput(xControls.input, function(value) { viewX = value; }) ||
                        !commitAngleInput(yControls.input, function(value) { viewY = value; }) ||
                        !commitAngleInput(zControls.input, function(value) { viewZ = value; })) {
                    alert("회전 각도는 -180부터 +180 사이로 입력해주세요.");
                    return false;
                }
                baseDiameterMm = clamp(roundTo(validBase, SIZE_STEP_MM), SIZE_STEP_MM, maxBaseDiameterMm);
                topDiameterMm = clamp(roundTo(validTop, SIZE_STEP_MM), 0, baseDiameterMm);
                heightMm = Math.max(SIZE_STEP_MM, roundTo(validHeight, SIZE_STEP_MM));
                divisionCount = clamp(Math.round(validDivision), 0, 24);
                saveSettings();
                clearPreview();
                source.hidden = false;
                var finalGroup = createCone();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "Cone";
                try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                source.remove();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // 이 탭이 켜져 있는 동안만 원본 원을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };

            function saveSettings() {
                var parts = ["v2", viewX, viewY, viewZ, divisionCount, faceK[0], faceK[1], faceK[2],
                    offsetXmm, offsetYmm];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if ((p[0] !== "v1" && p[0] !== "v2") || p.length < 8) return;
                viewX = restoreNumber(p[1], viewX, -180, 180);
                viewY = restoreNumber(p[2], viewY, -180, 180);
                viewZ = restoreNumber(p[3], viewZ, -180, 180);
                divisionCount = Math.round(restoreNumber(p[4], divisionCount, 0, 24));
                for (var i = 0; i < 3; i++) {
                    faceK[i] = Math.round(restoreNumber(p[5 + i], faceK[i], 0, 100));
                }
                if (p[0] === "v2" && p.length >= 10) {
                    offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                }
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseFloat(text);
                if (isNaN(value) || value < minimum || value > maximum) return fallback;
                return value;
            }

            // 위치 행은 다른 줄과 같은 모양(0 버튼 포함)을 쓴다
            function addOffsetRow(parent, label, value) {
                return addValueRow(parent, label, "mm", formatNumber(value, 1),
                    -POSITION_LIMIT_MM, POSITION_LIMIT_MM, OFFSET_STEP_MM, true);
            }

            // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            function bindOffsetControls(controls, isX) {
                function commit(value) {
                    if (value === null || !isFinite(value)) return;
                    value = clamp(roundTo(value, OFFSET_STEP_MM), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    controls.input.text = formatNumber(value, 1);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? (isX ? offsetXmm : offsetYmm) : value);
                };
                if (controls.reset) controls.reset.onClick = function() { commit(0); };
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function addPanel(parent, title) {
                var panel = parent.add("panel", undefined, title);
                panel.orientation = "column";
                panel.alignChildren = "left";
                panel.spacing = 4;
                panel.margins = [10, 14, 10, 8];
                return panel;
            }

            // 라벨 · 입력칸 · 단위 · 슬라이더를 한 줄에 배치
            function addValueRow(parent, label, unit, value, minimum, maximum, step, hasReset) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var labelText = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                // 0 버튼이 붙는 줄은 라벨을 줄여서 다른 줄과 폭을 맞춘다
                labelText.preferredSize.width = hasReset ? (LABEL_WIDTH - RESET_BUTTON_WIDTH - 10) : LABEL_WIDTH;
                var reset = null;
                if (hasReset) {
                    reset = row.add("button", undefined, "0");
                    reset.preferredSize.width = RESET_BUTTON_WIDTH;
                }
                var input = row.add("edittext", undefined, value);
                input.characters = 6;
                input.justify = "right";
                var slider = row.add("scrollbar", undefined, Number(value), minimum, maximum);
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                slider.stepdelta = step;
                return {input: input, slider: slider, reset: reset};
            }

            function addSizeRow(parent, label, value, minimum, maximum) {
                return addValueRow(parent, label, "mm", formatNumber(value, 2), minimum, maximum, SIZE_STEP_MM);
            }

            function addAngleControls(parent, label, value) {
                return addValueRow(parent, label, "°", formatSignedAngle(value), -180, 180, 1, true);
            }

            function bindViewControls(controls, setter, getter) {
                controls.slider.onChanging = function() {
                    var value = Math.round(controls.slider.value);
                    setter(value);
                    controls.input.text = formatSignedAngle(value);
                    updatePreview();
                };
                controls.input.onChanging = function() {
                    var value = parseNumber(controls.input.text);
                    if (value !== null && value >= -180 && value <= 180) {
                        setter(value);
                        controls.slider.value = value;
                        updatePreview();
                    }
                };
                controls.input.onChange = function() {
                    var value = normalizeAngleInput(controls.input, controls.slider, getter());
                    setter(value);
                    updatePreview();
                };
                if (controls.reset) {
                    controls.reset.onClick = function() {
                        setter(0);
                        controls.input.text = formatSignedAngle(0);
                        controls.slider.value = 0;
                        updatePreview();
                    };
                }
            }

            function updateKDisplay() {
                kValueText.text = faceK[activeFace] + "K";
                kSlider.value = faceK[activeFace];
            }

            function updateTopDiameterLimit() {
                try { topSlider.maxvalue = baseDiameterMm; } catch(e) {}
                if (topDiameterMm <= baseDiameterMm) return;
                topDiameterMm = baseDiameterMm;
                topInput.text = formatNumber(topDiameterMm, 2);
                topSlider.value = topDiameterMm;
            }


            function setK(value) {
                value = clamp(value, 0, 100);
                if (value === faceK[activeFace]) return;
                faceK[activeFace] = value;
                updateKDisplay();
                updatePreview();
            }

            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                previewGroup = createCone();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                previewGroup.name = "Cone Preview";
                try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch(e) {}
                previewGroup = null;
            }

            function createCone() {
                var group = source.layer.groupItems.add();
                var baseRadius = baseDiameterMm * MM_TO_PT / 2;
                var topRadius = topDiameterMm * MM_TO_PT / 2;
                var coneHeight = heightMm * MM_TO_PT;
                var basePoints = makeProjectedRing(0, baseRadius, 0);
                var topPoints = makeProjectedRing(coneHeight, topRadius, 1);
                var hullInput = [];
                var i;
                for (i = 0; i < basePoints.length; i++) hullInput.push(basePoints[i]);
                for (i = 0; i < topPoints.length; i++) hullInput.push(topPoints[i]);
                var hull = convexHull(hullInput);

                var side = makeSmoothHullPath(group, hull);
                side.name = "Cone Side";
                applyFill(side, faceK[FACE_SIDE]);
                copyStrokeStyle(source, side);

                var sideSlope = coneHeight > 0 ? (baseRadius - topRadius) / coneHeight : 0;
                for (i = 1; i <= divisionCount; i++) {
                    var fraction = i / (divisionCount + 1);
                    var divisionHeight = coneHeight * fraction;
                    var divisionRadius = baseRadius + (topRadius - baseRadius) * fraction;
                    drawDivisionRing(group, divisionHeight, divisionRadius, sideSlope);
                }

                var topNormal = rotatePoint(0, 1, 0);
                var baseNormal = rotatePoint(0, -1, 0);
                if (topRadius > 0.001 && topNormal.z > 0.0001) {
                    var topFace = makeRingBezierPath(group, coneHeight, topRadius, 0, 2 * Math.PI, true);
                    topFace.name = "Cone Top";
                    applyFill(topFace, faceK[FACE_TOP]);
                    copyStrokeStyle(source, topFace);
                }
                if (baseNormal.z > 0.0001) {
                    var baseFace = makeRingBezierPath(group, 0, baseRadius, 0, 2 * Math.PI, true);
                    baseFace.name = "Cone Bottom";
                    applyFill(baseFace, faceK[FACE_BOTTOM]);
                    copyStrokeStyle(source, baseFace);
                }
                return group;
            }

            function drawDivisionRing(group, axisHeight, ringRadius, sideSlope) {
                if (ringRadius < 0.001) return;
                var samples = [];
                var steps = 72;
                for (var i = 0; i < steps; i++) {
                    var angle = 2 * Math.PI * i / steps;
                    var normal = rotatePoint(Math.cos(angle), sideSlope, Math.sin(angle));
                    samples.push({
                        angle: angle,
                        visibility: normal.z
                    });
                }
                drawVisibleDivisionSamples(group, samples, axisHeight, ringRadius);
            }

            function drawVisibleDivisionSamples(group, samples, axisHeight, ringRadius) {
                var invisibleIndex = -1;
                var i;
                for (i = 0; i < samples.length; i++) {
                    if (samples[i].visibility < 0) {
                        invisibleIndex = i;
                        break;
                    }
                }
                if (invisibleIndex < 0) {
                    var closedLine = makeRingBezierPath(group, axisHeight, ringRadius, 0, 2 * Math.PI, true);
                    closedLine.filled = false;
                    copyStrokeStyle(source, closedLine);
                    return;
                }

                var startAngle = null;
                var count = samples.length;
                for (i = 0; i < count; i++) {
                    var a = samples[(invisibleIndex + i) % count];
                    var b = samples[(invisibleIndex + i + 1) % count];
                    var aAngle = a.angle;
                    var bAngle = b.angle;
                    while (aAngle < samples[invisibleIndex].angle) aAngle += 2 * Math.PI;
                    while (bAngle <= aAngle) bAngle += 2 * Math.PI;
                    var aVisible = a.visibility >= 0;
                    var bVisible = b.visibility >= 0;
                    if (!aVisible && bVisible) {
                        startAngle = interpolateVisibilityAngle(a, b, aAngle, bAngle);
                    } else if (aVisible && !bVisible) {
                        if (startAngle === null) startAngle = aAngle;
                        var endAngle = interpolateVisibilityAngle(a, b, aAngle, bAngle);
                        var visibleLine = makeRingBezierPath(
                            group,
                            axisHeight,
                            ringRadius,
                            startAngle,
                            endAngle,
                            false
                        );
                        copyStrokeStyle(source, visibleLine);
                        startAngle = null;
                    }
                }
            }

            function interpolateVisibilityAngle(a, b, aAngle, bAngle) {
                var denominator = a.visibility - b.visibility;
                var amount = Math.abs(denominator) < 0.0000001 ? 0 : a.visibility / denominator;
                return aAngle + (bAngle - aAngle) * amount;
            }

            function makeProjectedRing(axisHeight, ringRadius, ringId) {
                var points = [];
                var steps = ringRadius < 0.001 ? 1 : RING_SAMPLE_COUNT;
                for (var i = 0; i < steps; i++) {
                    var angle = steps === 1 ? 0 : 2 * Math.PI * i / steps;
                    var rotated = rotatePoint(
                        ringRadius * Math.cos(angle),
                        axisHeight,
                        ringRadius * Math.sin(angle)
                    );
                    points.push({
                        x: centerX + rotated.x,
                        y: centerY + rotated.y,
                        z: rotated.z,
                        isApex: ringRadius < 0.001,
                        ring: ringId
                    });
                }
                return points;
            }

            function rotatePoint(x, y, z) {
                var rx = viewX * Math.PI / 180;
                var ry = viewY * Math.PI / 180;
                var rz = viewZ * Math.PI / 180;
                var cosine = Math.cos(rx);
                var sine = Math.sin(rx);
                var nextY = y * cosine - z * sine;
                var nextZ = y * sine + z * cosine;
                y = nextY;
                z = nextZ;

                cosine = Math.cos(ry);
                sine = Math.sin(ry);
                var nextX = x * cosine + z * sine;
                nextZ = -x * sine + z * cosine;
                x = nextX;
                z = nextZ;

                cosine = Math.cos(rz);
                sine = Math.sin(rz);
                nextX = x * cosine - y * sine;
                nextY = x * sine + y * cosine;
                return {x: nextX, y: nextY, z: z};
            }

            function convexHull(points) {
                if (points.length <= 2) return points;
                var sorted = points.slice(0);
                sorted.sort(function(a, b) {
                    if (Math.abs(a.x - b.x) > 0.000001) return a.x - b.x;
                    return a.y - b.y;
                });
                var lower = [];
                var upper = [];
                var i;
                for (i = 0; i < sorted.length; i++) {
                    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
                        lower.pop();
                    }
                    lower.push(sorted[i]);
                }
                for (i = sorted.length - 1; i >= 0; i--) {
                    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
                        upper.pop();
                    }
                    upper.push(sorted[i]);
                }
                lower.pop();
                upper.pop();
                return lower.concat(upper);
            }

            function cross(origin, a, b) {
                return (a.x - origin.x) * (b.y - origin.y) -
                    (a.y - origin.y) * (b.x - origin.x);
            }

            function makePath(group, points, closed) {
                var path = group.pathItems.add();
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push([points[i].x, points[i].y]);
                path.setEntirePath(anchors);
                path.closed = closed;
                return path;
            }

            // 실루엣에서 서로 다른 링(또는 꼭짓점)을 잇는 구간은 원뿔의 모선이므로 직선으로 둔다
            function isSilhouetteEdge(a, b) {
                return a.isApex || b.isApex || a.ring !== b.ring;
            }

            function makeSmoothHullPath(group, points) {
                var path = makePath(group, points, true);
                var count = path.pathPoints.length;
                for (var i = 0; i < count; i++) {
                    var previous = points[(i - 1 + count) % count];
                    var next = points[(i + 1) % count];
                    var current = points[i];
                    var anchor = path.pathPoints[i].anchor;
                    var leftIsStraight = isSilhouetteEdge(previous, current);
                    var rightIsStraight = isSilhouetteEdge(current, next);

                    if (current.isApex || (leftIsStraight && rightIsStraight)) {
                        path.pathPoints[i].leftDirection = anchor;
                        path.pathPoints[i].rightDirection = anchor;
                        path.pathPoints[i].pointType = PointType.CORNER;
                        continue;
                    }

                    // 접선 방향은 곡선 쪽 이웃만 사용한다.
                    // 모선 끝점에서 반대쪽 꼭짓점까지의 긴 현을 쓰면 핸들이 과도하게 길어져 밑면이 부풀어 오른다.
                    var tangentX, tangentY;
                    if (leftIsStraight) {
                        tangentX = next.x - current.x;
                        tangentY = next.y - current.y;
                    } else if (rightIsStraight) {
                        tangentX = current.x - previous.x;
                        tangentY = current.y - previous.y;
                    } else {
                        tangentX = (next.x - previous.x) / 2;
                        tangentY = (next.y - previous.y) / 2;
                    }

                    var tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
                    if (tangentLength < 0.000001) {
                        path.pathPoints[i].leftDirection = anchor;
                        path.pathPoints[i].rightDirection = anchor;
                        path.pathPoints[i].pointType = PointType.CORNER;
                        continue;
                    }
                    tangentX /= tangentLength;
                    tangentY /= tangentLength;

                    // 핸들 길이는 각 이웃까지의 실제 거리 기준(현의 1/3)
                    var leftLength = leftIsStraight ? 0 : distanceBetween(current, previous) / 3;
                    var rightLength = rightIsStraight ? 0 : distanceBetween(current, next) / 3;

                    path.pathPoints[i].leftDirection = [
                        anchor[0] - tangentX * leftLength,
                        anchor[1] - tangentY * leftLength
                    ];
                    path.pathPoints[i].rightDirection = [
                        anchor[0] + tangentX * rightLength,
                        anchor[1] + tangentY * rightLength
                    ];
                    path.pathPoints[i].pointType =
                        (leftIsStraight || rightIsStraight) ? PointType.CORNER : PointType.SMOOTH;
                }
                return path;
            }

            function distanceBetween(a, b) {
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                return Math.sqrt(dx * dx + dy * dy);
            }

            function makeRingBezierPath(group, axisHeight, ringRadius, startAngle, endAngle, closed) {
                var span = endAngle - startAngle;
                var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)));
                var delta = span / segmentCount;
                var handleFactor = 4 / 3 * Math.tan(delta / 4);
                var anchorCount = closed ? segmentCount : segmentCount + 1;
                var points = [];
                var derivatives = [];
                var i;
                for (i = 0; i < anchorCount; i++) {
                    var angle = startAngle + delta * i;
                    var point = rotatePoint(
                        ringRadius * Math.cos(angle),
                        axisHeight,
                        ringRadius * Math.sin(angle)
                    );
                    var derivative = rotatePoint(
                        -ringRadius * Math.sin(angle),
                        0,
                        ringRadius * Math.cos(angle)
                    );
                    points.push({x: centerX + point.x, y: centerY + point.y});
                    derivatives.push(derivative);
                }

                var path = makePath(group, points, closed);
                path.filled = false;
                var count = path.pathPoints.length;
                for (i = 0; i < count; i++) {
                    var anchor = path.pathPoints[i].anchor;
                    var left = anchor;
                    var right = anchor;
                    if (closed || i > 0) {
                        left = [anchor[0] - derivatives[i].x * handleFactor,
                            anchor[1] - derivatives[i].y * handleFactor];
                    }
                    if (closed || i < count - 1) {
                        right = [anchor[0] + derivatives[i].x * handleFactor,
                            anchor[1] + derivatives[i].y * handleFactor];
                    }
                    path.pathPoints[i].leftDirection = left;
                    path.pathPoints[i].rightDirection = right;
                    path.pathPoints[i].pointType = PointType.SMOOTH;
                }
                return path;
            }

            function makeKColor(k) {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = k;
                    return cmyk;
                }
                var gray = new GrayColor();
                gray.gray = k;
                return gray;
            }

            function applyFill(item, k) {
                item.filled = true;
                item.fillColor = makeKColor(k);
                try { item.opacity = source.opacity; } catch(e) {}
            }

            function copyStrokeStyle(from, to) {
                to.stroked = true;
                if (from.stroked) {
                    try { to.strokeColor = from.strokeColor; } catch(e) {}
                    try { to.strokeDashes = from.strokeDashes; } catch(e2) {}
                    try { to.strokeDashOffset = from.strokeDashOffset; } catch(e3) {}
                    try { to.strokeCap = from.strokeCap; } catch(e4) {}
                    try { to.strokeJoin = from.strokeJoin; } catch(e5) {}
                    try { to.strokeMiterLimit = from.strokeMiterLimit; } catch(e6) {}
                } else {
                    try { to.strokeColor = doc.defaultStrokeColor; } catch(e7) {}
                }
                to.strokeWidth = LINE_WIDTH_PT;
            }

            function normalizeAngleInput(input, slider, fallback) {
                var value = parseNumber(input.text);
                if (value === null) value = fallback;
                value = clamp(value, -180, 180);
                input.text = formatSignedAngle(value);
                slider.value = value;
                return value;
            }

            function commitAngleInput(input, setter) {
                var value = parseNumber(input.text);
                if (value === null || value < -180 || value > 180) return false;
                setter(value);
                return true;
            }

            function getSelectedCircle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping || !item.closed) return null;
                return item;
            }

            function hasCircularPathPoints(item) {
                if (!item.pathPoints || item.pathPoints.length !== 4) return false;
                for (var i = 0; i < item.pathPoints.length; i++) {
                    var point = item.pathPoints[i];
                    var leftIsAnchor = point.leftDirection[0] === point.anchor[0] &&
                        point.leftDirection[1] === point.anchor[1];
                    var rightIsAnchor = point.rightDirection[0] === point.anchor[0] &&
                        point.rightDirection[1] === point.anchor[1];
                    if (leftIsAnchor && rightIsAnchor) return false;
                }
                return true;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
                if (normalized === "" || normalized === "+" || normalized === "-") return null;
                var value = Number(normalized);
                return isNaN(value) ? null : value;
            }

            function formatNumber(value, decimals) {
                return Number(value).toFixed(decimals);
            }

            function formatSignedAngle(value) {
                var rounded = Math.round(value * 10) / 10;
                return (rounded > 0 ? "+" : "") + String(rounded);
            }

            function roundTo(value, step) {
                return Math.round(value / step) * step;
            }

            function clamp(value, minimum, maximum) {
                return Math.max(minimum, Math.min(maximum, value));
            }
            return null;
        }
        return api;
    }

    // ==== 구 ====
    function makeSphereEngine() {
        var api = {label: "구", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            var source = getSelectedCircle(doc.selection);
            if (source === null) return "원 패스 하나만 선택해주세요.";

            var bounds = source.geometricBounds;
            var width = bounds[2] - bounds[0];
            var height = bounds[1] - bounds[3];
            if (width <= 0 ||
                    Math.abs(width - height) > Math.max(0.1, width * 0.01) ||
                    !hasCircularPathPoints(source)) return "가로와 세로 크기가 같은 원을 선택해주세요.";

            var centerX = (bounds[0] + bounds[2]) / 2;
            var centerY = (bounds[1] + bounds[3]) / 2;
            var radius = width / 2;
            var longitudeCount = 1;
            var latitudeCount = 1;
            var LINE_WIDTH_PT = 0.3;
            var gridRotation = 0;
            var viewX = 0;
            var viewY = 0;
            var viewZ = 0;
            var previewEnabled = true;
            var previewGroup = null;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var sourceWasHidden = source.hidden;

            var PREF_KEY = "ObjectSphere/settings";
            applySavedSettings();

            var dlg = page;

            var gridPanel = dlg.add("panel", undefined, "경도선과 위도선");
            gridPanel.orientation = "column";
            gridPanel.alignChildren = "fill";

            var longitudeRow = gridPanel.add("group");
            longitudeRow.alignChildren = ["left", "center"];
            var longitudeLabel = longitudeRow.add("statictext", undefined, "경도선 수 (개):");
            longitudeLabel.preferredSize.width = 90;
            longitudeLabel.helpTip = "0 = 없음, 1 = 2등분, 2 = 4등분";
            var longitudeInput = longitudeRow.add("edittext", undefined, String(longitudeCount));
            longitudeInput.characters = 6;
            var longitudeSlider = addSliderWithSteps(longitudeRow, longitudeCount, 0, 24, 1);

            var latitudeRow = gridPanel.add("group");
            latitudeRow.alignChildren = ["left", "center"];
            var latitudeLabel = latitudeRow.add("statictext", undefined, "위도선 수 (개):");
            latitudeLabel.preferredSize.width = 90;
            latitudeLabel.helpTip = "0 = 없음, 1 ~ 11";
            var latitudeInput = latitudeRow.add("edittext", undefined, String(latitudeCount));
            latitudeInput.characters = 6;
            var latitudeSlider = addSliderWithSteps(latitudeRow, latitudeCount, 0, 11, 1);
            gridPanel.add("statictext", undefined,
                "순서: 적도 → 북15° → 남15° → 북30° → 남30° → 북45°");
            gridPanel.add("statictext", undefined,
                "      → 남45° → 북60° → 남60° → 북75° → 남75°");

            var rotationRow = gridPanel.add("group");
            rotationRow.alignChildren = ["left", "center"];
            var rotationLabel = rotationRow.add("statictext", undefined, "경도선 회전 (°):");
            rotationLabel.preferredSize.width = 90;
            rotationLabel.helpTip = "-180 ~ +180";
            var rotationInput = rotationRow.add("edittext", undefined, formatSignedAngle(gridRotation));
            rotationInput.characters = 6;
            var rotationSlider = addSliderWithSteps(rotationRow, gridRotation, -180, 180, 1);

            var viewPanel = dlg.add("panel", undefined, "구를 바라보는 시점");
            viewPanel.orientation = "column";
            viewPanel.alignChildren = "fill";
            var xControls = addAngleControls(viewPanel, "X축", viewX);
            var yControls = addAngleControls(viewPanel, "Y축", viewY);
            var zControls = addAngleControls(viewPanel, "Z축", viewZ);
            var resetViewButton = viewPanel.add("button", undefined, "시점 리셋");
            resetViewButton.alignment = "right";

            var positionPanel = dlg.add("panel", undefined, "위치");
            positionPanel.orientation = "column";
            positionPanel.alignChildren = "left";
            var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmm);
            var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmm);

            longitudeSlider.onChanging = function() {
                longitudeCount = Math.round(longitudeSlider.value);
                longitudeInput.text = String(longitudeCount);
                updatePreview();
            };
            longitudeInput.onChanging = function() {
                var value = parseNumber(longitudeInput.text);
                if (value !== null && value >= 0 && value <= 24) {
                    longitudeCount = Math.round(value);
                    longitudeSlider.value = longitudeCount;
                    updatePreview();
                }
            };
            longitudeInput.onChange = function() {
                longitudeCount = normalizeIntegerInput(longitudeInput, longitudeSlider, longitudeCount, 0, 24);
                updatePreview();
            };

            latitudeSlider.onChanging = function() {
                latitudeCount = Math.round(latitudeSlider.value);
                latitudeInput.text = String(latitudeCount);
                updatePreview();
            };
            latitudeInput.onChanging = function() {
                var value = parseNumber(latitudeInput.text);
                if (value !== null && value >= 0 && value <= 11) {
                    latitudeCount = Math.round(value);
                    latitudeSlider.value = latitudeCount;
                    updatePreview();
                }
            };
            latitudeInput.onChange = function() {
                latitudeCount = normalizeIntegerInput(latitudeInput, latitudeSlider, latitudeCount, 0, 11);
                updatePreview();
            };

            rotationSlider.onChanging = function() {
                gridRotation = Math.round(rotationSlider.value);
                rotationInput.text = formatSignedAngle(gridRotation);
                updatePreview();
            };
            rotationInput.onChanging = function() {
                var value = parseNumber(rotationInput.text);
                if (value !== null && value >= -180 && value <= 180) {
                    gridRotation = value;
                    rotationSlider.value = value;
                    updatePreview();
                }
            };
            rotationInput.onChange = function() {
                gridRotation = normalizeAngleInput(rotationInput, rotationSlider, gridRotation);
                updatePreview();
            };

            bindViewControls(xControls, function(value) { viewX = value; }, function() { return viewX; });
            bindViewControls(yControls, function(value) { viewY = value; }, function() { return viewY; });
            bindViewControls(zControls, function(value) { viewZ = value; }, function() { return viewZ; });
            resetViewButton.onClick = resetViewControls;

            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetControls(offsetXControls, true);
            bindOffsetControls(offsetYControls, false);

            // 탭 호스트가 부르는 훅. 확인: 값 검증 → 저장 → 만들기
            api.commit = function() {
                var validLongitude = parseNumber(longitudeInput.text);
                var validLatitude = parseNumber(latitudeInput.text);
                if (validLongitude === null || validLongitude < 0 || validLongitude > 24) {
                    alert("경도선 수는 0부터 24 사이의 정수로 입력해주세요.");
                    return false;
                }
                if (validLatitude === null || validLatitude < 0 || validLatitude > 11) {
                    alert("위도선 수는 0부터 11 사이의 정수로 입력해주세요.");
                    return false;
                }
                longitudeCount = Math.round(validLongitude);
                latitudeCount = Math.round(validLatitude);
                if (!commitAngleInput(rotationInput, function(value) { gridRotation = value; }) ||
                        !commitAngleInput(xControls.input, function(value) { viewX = value; }) ||
                        !commitAngleInput(yControls.input, function(value) { viewY = value; }) ||
                        !commitAngleInput(zControls.input, function(value) { viewZ = value; })) {
                    alert("회전 각도는 -180부터 +180 사이로 입력해주세요.");
                    return false;
                }
                saveSettings();
                clearPreview();
                source.hidden = false;
                var finalGroup = createSphere();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "Sphere";
                try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                source.remove();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // 이 탭이 켜져 있는 동안만 원본 원을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };

            function saveSettings() {
                var parts = ["v2", longitudeCount, latitudeCount, gridRotation, viewX, viewY, viewZ,
                    offsetXmm, offsetYmm];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if ((p[0] !== "v1" && p[0] !== "v2") || p.length < 7) return;
                var lon = parseInt(p[1], 10);
                var lat = parseInt(p[2], 10);
                var rot = parseFloat(p[3]);
                var vx = parseFloat(p[4]);
                var vy = parseFloat(p[5]);
                var vz = parseFloat(p[6]);
                if (lon >= 0 && lon <= 24) longitudeCount = lon;
                if (lat >= 0 && lat <= 11) latitudeCount = lat;
                if (rot >= -180 && rot <= 180) gridRotation = rot;
                if (vx >= -180 && vx <= 180) viewX = vx;
                if (vy >= -180 && vy <= 180) viewY = vy;
                if (vz >= -180 && vz <= 180) viewZ = vz;
                if (p[0] === "v2" && p.length >= 9) {
                    var offX = parseFloat(p[7]);
                    var offY = parseFloat(p[8]);
                    if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
                    if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
                }
            }

            // step 단위로 움직이는 스크롤바(‹ › 내장)
            function addSliderWithSteps(row, value, minimum, maximum, step) {
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = 196;
                return slider;
            }

            // 위치 행: 라벨 · 입력칸 · 단위 · 화살표 버튼 · 슬라이더
            function addOffsetControls(parent, label, value) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (mm):").preferredSize.width = 70;
                var input = row.add("edittext", undefined, formatOffset(value));
                input.characters = 6;
                var slider = row.add("scrollbar", undefined, value,
                    -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                slider.stepdelta = OFFSET_STEP_MM;
                slider.jumpdelta = OFFSET_STEP_MM * 10;
                slider.preferredSize.width = 196;
                return {input: input, slider: slider};
            }

            // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            function bindOffsetControls(controls, isX) {
                function commit(value) {
                    if (value === null || !isFinite(value)) return;
                    value = Math.round(value / OFFSET_STEP_MM) * OFFSET_STEP_MM;
                    if (value < -POSITION_LIMIT_MM) value = -POSITION_LIMIT_MM;
                    if (value > POSITION_LIMIT_MM) value = POSITION_LIMIT_MM;
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    controls.input.text = formatOffset(value);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                }
                function current() { return isX ? offsetXmm : offsetYmm; }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? current() : value);
                };
            }

            function formatOffset(value) {
                return String(Math.round(value * 10) / 10);
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function addAngleControls(parent, label, value) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var caption = row.add("statictext", undefined, label + " (°):");
                caption.preferredSize.width = 90;
                caption.helpTip = "-180 ~ +180";
                var input = row.add("edittext", undefined, formatSignedAngle(value));
                input.characters = 6;
                var slider = addSliderWithSteps(row, value, -180, 180, 1);
                return {input: input, slider: slider};
            }

            function bindViewControls(controls, setter, getter) {
                controls.slider.onChanging = function() {
                    var value = Math.round(controls.slider.value);
                    setter(value);
                    controls.input.text = formatSignedAngle(value);
                    updatePreview();
                };
                controls.input.onChanging = function() {
                    var value = parseNumber(controls.input.text);
                    if (value !== null && value >= -180 && value <= 180) {
                        setter(value);
                        controls.slider.value = value;
                        updatePreview();
                    }
                };
                controls.input.onChange = function() {
                    var value = normalizeAngleInput(controls.input, controls.slider, getter());
                    setter(value);
                    updatePreview();
                };
            }

            function resetViewControls() {
                viewX = 0;
                viewY = 0;
                viewZ = 0;
                xControls.input.text = formatSignedAngle(0);
                yControls.input.text = formatSignedAngle(0);
                zControls.input.text = formatSignedAngle(0);
                xControls.slider.value = 0;
                yControls.slider.value = 0;
                zControls.slider.value = 0;
                updatePreview();
            }

            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                previewGroup = createSphere();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                previewGroup.name = "Sphere Preview";
                try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch(e) {}
                previewGroup = null;
            }

            function createSphere() {
                var group = source.layer.groupItems.add();
                var globe = source.duplicate(group, ElementPlacement.PLACEATBEGINNING);
                globe.hidden = false;
                globe.selected = false;
                globe.name = "Sphere Outline";
                copyStrokeStyle(source, globe);

                var i;
                if (longitudeCount > 0) {
                    var longitudeSpacing = 180 / longitudeCount;
                    var firstLongitude = 90 + gridRotation - (longitudeCount - 1) * longitudeSpacing / 2;
                    for (i = 0; i < longitudeCount; i++) {
                        drawLongitude(group, firstLongitude + i * longitudeSpacing);
                    }
                }

                var latitudeSequence = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75];
                for (i = 0; i < latitudeCount; i++) {
                    drawLatitude(group, latitudeSequence[i]);
                }
                return group;
            }

            function drawLongitude(group, longitudeDegrees) {
                var longitude = longitudeDegrees * Math.PI / 180;
                drawParametricVisibleCurve(
                    group,
                    {x: 0, y: 0, z: 0},
                    {x: Math.cos(longitude), y: 0, z: Math.sin(longitude)},
                    {x: 0, y: 1, z: 0}
                );
            }

            function drawLatitude(group, latitudeDegrees) {
                var latitude = latitudeDegrees * Math.PI / 180;
                drawParametricVisibleCurve(
                    group,
                    {x: 0, y: Math.sin(latitude), z: 0},
                    {x: Math.cos(latitude), y: 0, z: 0},
                    {x: 0, y: 0, z: Math.cos(latitude)}
                );
            }

            function projectRotatedPoint(x, y, z) {
                var rx = viewX * Math.PI / 180;
                var ry = viewY * Math.PI / 180;
                var rz = viewZ * Math.PI / 180;
                var cosValue = Math.cos(rx);
                var sinValue = Math.sin(rx);
                var nextY = y * cosValue - z * sinValue;
                var nextZ = y * sinValue + z * cosValue;
                y = nextY;
                z = nextZ;

                cosValue = Math.cos(ry);
                sinValue = Math.sin(ry);
                var nextX = x * cosValue + z * sinValue;
                nextZ = -x * sinValue + z * cosValue;
                x = nextX;
                z = nextZ;

                cosValue = Math.cos(rz);
                sinValue = Math.sin(rz);
                nextX = x * cosValue - y * sinValue;
                nextY = x * sinValue + y * cosValue;
                return {x: nextX, y: nextY, z: z};
            }

            function drawParametricVisibleCurve(group, curveCenter, cosineBasis, sineBasis) {
                var projectedCenter = projectRotatedPoint(curveCenter.x, curveCenter.y, curveCenter.z);
                var projectedCosine = projectRotatedPoint(cosineBasis.x, cosineBasis.y, cosineBasis.z);
                var projectedSine = projectRotatedPoint(sineBasis.x, sineBasis.y, sineBasis.z);
                var samples = [];
                var steps = 72;
                var i;
                for (i = 0; i < steps; i++) {
                    var angle = 2 * Math.PI * i / steps;
                    samples.push({
                        angle: angle,
                        visibility: projectedCenter.z +
                            projectedCosine.z * Math.cos(angle) +
                            projectedSine.z * Math.sin(angle)
                    });
                }

                var invisibleIndex = -1;
                for (i = 0; i < samples.length; i++) {
                    if (samples[i].visibility < 0) {
                        invisibleIndex = i;
                        break;
                    }
                }

                if (invisibleIndex < 0) {
                    makeParametricBezierPath(
                        group,
                        projectedCenter,
                        projectedCosine,
                        projectedSine,
                        0,
                        2 * Math.PI,
                        true
                    );
                    return;
                }

                var startAngle = null;
                var count = samples.length;
                for (i = 0; i < count; i++) {
                    var a = samples[(invisibleIndex + i) % count];
                    var b = samples[(invisibleIndex + i + 1) % count];
                    var aAngle = a.angle;
                    var bAngle = b.angle;
                    while (aAngle < samples[invisibleIndex].angle) aAngle += 2 * Math.PI;
                    while (bAngle <= aAngle) bAngle += 2 * Math.PI;
                    var aVisible = a.visibility >= 0;
                    var bVisible = b.visibility >= 0;

                    if (!aVisible && bVisible) {
                        startAngle = interpolateVisibilityAngle(a, b, aAngle, bAngle);
                    } else if (aVisible && !bVisible) {
                        if (startAngle === null) startAngle = aAngle;
                        var endAngle = interpolateVisibilityAngle(a, b, aAngle, bAngle);
                        makeParametricBezierPath(
                            group,
                            projectedCenter,
                            projectedCosine,
                            projectedSine,
                            startAngle,
                            endAngle,
                            false
                        );
                        startAngle = null;
                    }
                }
            }

            function interpolateVisibilityAngle(a, b, aAngle, bAngle) {
                var denominator = a.visibility - b.visibility;
                var amount = Math.abs(denominator) < 0.0000001 ? 0 : a.visibility / denominator;
                return aAngle + (bAngle - aAngle) * amount;
            }

            function makeParametricBezierPath(group, curveCenter, cosineBasis, sineBasis,
                    startAngle, endAngle, closed) {
                var span = endAngle - startAngle;
                var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)));
                var delta = span / segmentCount;
                var handleFactor = 4 / 3 * Math.tan(delta / 4);
                var anchorCount = closed ? segmentCount : segmentCount + 1;
                var path = group.pathItems.add();
                var anchors = [];
                var derivatives = [];
                var i;
                for (i = 0; i < anchorCount; i++) {
                    var angle = startAngle + delta * i;
                    var cosine = Math.cos(angle);
                    var sine = Math.sin(angle);
                    anchors.push([
                        centerX + (curveCenter.x + cosineBasis.x * cosine + sineBasis.x * sine) * radius,
                        centerY + (curveCenter.y + cosineBasis.y * cosine + sineBasis.y * sine) * radius
                    ]);
                    derivatives.push({
                        x: (-cosineBasis.x * sine + sineBasis.x * cosine) * radius,
                        y: (-cosineBasis.y * sine + sineBasis.y * cosine) * radius
                    });
                }
                path.setEntirePath(anchors);
                path.closed = closed;
                path.filled = false;
                copyStrokeStyle(source, path);

                for (i = 0; i < anchors.length; i++) {
                    var anchor = anchors[i];
                    var left = anchor;
                    var right = anchor;
                    if (closed || i > 0) {
                        left = [anchor[0] - derivatives[i].x * handleFactor,
                            anchor[1] - derivatives[i].y * handleFactor];
                    }
                    if (closed || i < anchors.length - 1) {
                        right = [anchor[0] + derivatives[i].x * handleFactor,
                            anchor[1] + derivatives[i].y * handleFactor];
                    }
                    path.pathPoints[i].leftDirection = left;
                    path.pathPoints[i].rightDirection = right;
                    path.pathPoints[i].pointType = PointType.SMOOTH;
                }
                return path;
            }

            function copyStrokeStyle(from, to) {
                to.stroked = true;
                if (from.stroked) {
                    try { to.strokeColor = from.strokeColor; } catch(e) {}
                    to.strokeWidth = LINE_WIDTH_PT;
                    try { to.strokeDashes = from.strokeDashes; } catch(e3) {}
                    try { to.strokeDashOffset = from.strokeDashOffset; } catch(e4) {}
                    try { to.strokeCap = from.strokeCap; } catch(e5) {}
                    try { to.strokeJoin = from.strokeJoin; } catch(e6) {}
                    try { to.strokeMiterLimit = from.strokeMiterLimit; } catch(e7) {}
                } else {
                    try { to.strokeColor = doc.defaultStrokeColor; } catch(e8) {}
                    to.strokeWidth = LINE_WIDTH_PT;
                }
                try { to.opacity = from.opacity; } catch(e9) {}
            }

            function normalizeIntegerInput(input, slider, fallback, minimum, maximum) {
                var value = parseNumber(input.text);
                if (value === null) value = fallback;
                value = clamp(Math.round(value), minimum, maximum);
                input.text = String(value);
                slider.value = value;
                return value;
            }

            function normalizeAngleInput(input, slider, fallback) {
                var value = parseNumber(input.text);
                if (value === null) value = fallback;
                value = clamp(value, -180, 180);
                input.text = formatSignedAngle(value);
                slider.value = value;
                return value;
            }

            function commitAngleInput(input, setter) {
                var value = parseNumber(input.text);
                if (value === null || value < -180 || value > 180) return false;
                setter(value);
                return true;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
                if (normalized === "" || normalized === "+" || normalized === "-") return null;
                var value = Number(normalized);
                return isNaN(value) ? null : value;
            }

            function formatSignedAngle(value) {
                var rounded = Math.round(value * 10) / 10;
                return (rounded > 0 ? "+" : "") + String(rounded);
            }

            function clamp(value, minimum, maximum) {
                return Math.max(minimum, Math.min(maximum, value));
            }

            function getSelectedCircle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping || !item.closed) return null;
                return item;
            }

            function hasCircularPathPoints(item) {
                if (!item.pathPoints || item.pathPoints.length !== 4) return false;
                for (var i = 0; i < item.pathPoints.length; i++) {
                    var point = item.pathPoints[i];
                    var leftIsAnchor = point.leftDirection[0] === point.anchor[0] &&
                        point.leftDirection[1] === point.anchor[1];
                    var rightIsAnchor = point.rightDirection[0] === point.anchor[0] &&
                        point.rightDirection[1] === point.anchor[1];
                    if (leftIsAnchor && rightIsAnchor) return false;
                }
                return true;
            }
            return null;
        }
        return api;
    }
})();
