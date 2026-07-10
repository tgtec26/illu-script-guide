const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const alignFiles = [
  "스크립트/05_정렬/Align_1mmHcenterB.jsx",
  "스크립트/05_정렬/Align_1mmHcenterS.jsx",
  "스크립트/05_정렬/Align_1mmVcenterB.jsx",
  "스크립트/05_정렬/Align_1mmVcenterS.jsx",
];
const centerAlignBig = "스크립트/05_정렬/Align_CenterB.jsx";
const centerAlignSmall = "스크립트/05_정렬/Align_CenterS.jsx";
const visibleAlignHelper = "스크립트/05_정렬/Align_VisibleBounds_Helper.jsxinc";
const visibleAlignFiles = [
  ["스크립트/05_정렬/Align_VisibleHLeft.jsx", "hLeft"],
  ["스크립트/05_정렬/Align_VisibleHCenter.jsx", "hCenter"],
  ["스크립트/05_정렬/Align_VisibleHRight.jsx", "hRight"],
  ["스크립트/05_정렬/Align_VisibleVTop.jsx", "vTop"],
  ["스크립트/05_정렬/Align_VisibleVCenter.jsx", "vCenter"],
  ["스크립트/05_정렬/Align_VisibleVBottom.jsx", "vBottom"],
];

const artboardGenerator = "스크립트/04_삽입/Input_setborard.jsx";
const textInput = "스크립트/02_문자/Text_input.jsx";
const subscriptedVariable = "스크립트/02_문자/Text_SubscriptedVariable.jsx";
const graySelection = "스크립트/03_색상/Color_graysel.jsx";
const fitToMargin = "스크립트/10_기타/fit2mm.jsx";
const findSimilar = "스크립트/10_기타/find-replace.jsx";
const embedLinkedImages = "스크립트/10_기타/embed.jsx";
const extUngroup = "스크립트/10_기타/ExtUngroup.jsx";
const dashAlignHelper = "스크립트/01_도형/Object_setdash_align_helper.jsxinc";
const dashShift = "스크립트/01_도형/Object_dashshift.jsx";
const cylinder = "스크립트/01_도형/Object_cylinder.jsx";
const cone = "스크립트/01_도형/Object_cone.jsx";
const sphere = "스크립트/01_도형/Object_sphere.jsx";
const coilSpring = "스크립트/01_도형/Object_coilspring.jsx";
const updaterFiles = ["script-action-update-mac.command", "script-action-update-windows.ps1", "UPDATE.md"];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readBuffer(file) {
  return fs.readFileSync(path.join(root, file));
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function lineOf(source, pattern) {
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return -1;
}

let failures = 0;

for (const file of alignFiles) {
  const source = read(file);
  const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
  const activeDocLine = lineOf(source, /app\.activeDocument/);

  if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
    console.error(`${file}: app.documents.length guard must run before app.activeDocument`);
    failures++;
  }

  if (!/finally\s*\{[\s\S]*tempObj\.remove\(\)/.test(source)) {
    console.error(`${file}: temporary outlined text duplicate must be removed in finally`);
    failures++;
  }
}

{
  const source = read(artboardGenerator);
  if (!/setIntegerPreference\(\s*["']rulerType["']\s*,\s*unitValue\s*\)/.test(source) ||
      !/setGeneralUnits\(\s*1\s*\)/.test(source)) {
    console.error(`${artboardGenerator}: general units must be set to millimeters with rulerType=1`);
    failures++;
  }
  if (!/new\s+DocumentPreset\s*\(\s*\)/.test(source) ||
      !/preset\.units\s*=\s*isPixel\s*\?\s*RulerUnits\.Pixels\s*:\s*RulerUnits\.Millimeters/.test(source) ||
      !/documents\.addDocument\(/.test(source)) {
    console.error(`${artboardGenerator}: new documents must be created with DocumentPreset.units`);
    failures++;
  }
}

{
  const source = read(textInput);
  const optionArrays = source.match(/contents:\s*\[[^\]]+\]/g) || [];
  if (optionArrays.length !== 9 ||
      optionArrays.some((arraySource) => {
        const items = arraySource.match(/"[^"]*"/g) || [];
        return items.length !== 6;
      })) {
    console.error(textInput + ": every text insert option must provide exactly 6 items");
    failures++;
  }
  if (!source.includes('row.add("button", undefined, textOptions[optionIndex].contents[charIndex])') ||
      !source.includes('btn.onClick = makeSelectHandler(optionIndex, charIndex + 1)') ||
      !source.includes('contentsArray = option.contents.slice(0, selectedCount)') ||
      !source.includes('function makeSelectHandler(optionIndex, count)')) {
    console.error(textInput + ": each row must have 6 buttons and insert only up to the clicked character");
    failures++;
  }
  if (!source.includes('{contents: ["①", "②", "③", "④", "⑤", "⑥"]') ||
      !source.includes('selectedCount = count')) {
    console.error(textInput + ": must offer circled number text inserts");
    failures++;
  }
  if (!source.includes('{contents: ["t0", "t1", "t2", "t3", "t4", "t5"]') ||
      source.includes('{contents: ["t1", "t2", "t3", "t4", "t5", "t6"]')) {
    console.error(textInput + ": t-series text inserts must run from t0 through t5");
    failures++;
  }
  if (!/contents:\s*\["Ⅰ",\s*"Ⅱ",\s*"Ⅲ",\s*"Ⅳ",\s*"Ⅴ",\s*"Ⅵ"\][\s\S]*?fontNames:\s*romanFontCandidates/.test(source) ||
      !/var\s+romanFontCandidates\s*=\s*\[[\s\S]*?"KoPubWorld바탕체_Pro"/.test(source) ||
      !source.includes('"KoPubWorldBatangPM"') ||
      !source.includes('"KoPubWorldBatangPL"') ||
      !source.includes('"KoPubWorldBatangPB"') ||
      !source.includes("var targetFont = findTextFont(fontNames, \"Batang\", selectedOption === 2)") ||
      !source.includes("function findTextFont(fontNames, fallbackName, useKoPubMetadata)") ||
      !source.includes("if (useKoPubMetadata)") ||
      !/for\s*\(\s*var\s+\w+\s*=\s*0;\s*\w+\s*<\s*app\.textFonts\.length;\s*\w+\+\+\s*\)/.test(source) ||
      !source.includes('getFontText(font, "family")') ||
      !source.includes('getFontText(font, "style")') ||
      !source.includes("nameMatchesKoPubWorldBatang") ||
      !source.includes("kopubworldbatangp[mlb]")) {
    console.error(textInput + ": roman numerals must resolve KoPubWorld바탕체_Pro by candidate names and font metadata");
    failures++;
  }
  if (!source.includes("var viewLeft = viewBounds[0]") ||
      !source.includes("var viewRight = viewBounds[2]") ||
      !source.includes("var viewCenterX = (viewLeft + viewRight) / 2") ||
      !source.includes("var baselineY = viewBottom + bottomMargin + maxHeight") ||
      !source.includes("textFrames[i].position = [currentX, baselineY]") ||
      !source.includes("currentX += textFrames[i].width + horizontalGap") ||
      /artboardLeft/.test(source)) {
    console.error(textInput + ": text inserts must be laid out horizontally at the bottom center of the current view");
    failures++;
  }
}

for (const file of [centerAlignBig, centerAlignSmall]) {
  const source = read(file);
  const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
  const activeDocLine = lineOf(source, /app\.activeDocument/);

  if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
    console.error(`${file}: app.documents.length guard must run before app.activeDocument`);
    failures++;
  }

  if (!source.includes('Folder.temp + "/illu_last_script.txt"') ||
      !source.includes("__memo.write($.fileName)")) {
    console.error(`${file}: must record itself for Align_RepeatLast.jsx`);
    failures++;
  }

  if (!/finally\s*\{[\s\S]*tempObj\.remove\(\)/.test(source)) {
    console.error(`${file}: temporary outlined text duplicate must be removed in finally`);
    failures++;
  }

  if (!source.includes("sel[j] === keyObject") ||
      !source.includes("alignToKeyCenter") ||
      !source.includes("getCenterX") ||
      !source.includes("getCenterY")) {
    console.error(`${file}: non-key objects must align both centers to the key object`);
    failures++;
  }
}

{
  const source = read(centerAlignBig);
  if (!source.includes("var maxArea") ||
      !/if\s*\(\s*area\s*>\s*maxArea\s*\)/.test(source)) {
    console.error(`${centerAlignBig}: largest area object must be the key object`);
    failures++;
  }
}

{
  const source = read(centerAlignSmall);
  if (!source.includes("var minArea") ||
      !/if\s*\(\s*area\s*<\s*minArea\s*\)/.test(source)) {
    console.error(`${centerAlignSmall}: smallest area object must be the key object`);
    failures++;
  }
}

{
  const source = read(visibleAlignHelper);
  const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
  const activeDocLine = lineOf(source, /app\.activeDocument/);

  if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
    console.error(`${visibleAlignHelper}: app.documents.length guard must run before app.activeDocument`);
    failures++;
  }

  const requiredTokens = [
    "ALIGN_VISIBLE_SCRIPT_FILE",
    "tempObj.createOutline()",
    "outlined.visibleBounds",
    "function getGroupRealBounds",
    "function getClippingBounds",
    "function unionBounds",
    "selectionBounds = unionBounds(selectionBounds, bounds)",
    "obj.translate(deltaX, deltaY)",
  ];
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      console.error(`${visibleAlignHelper}: missing visible-bounds alignment token: ${token}`);
      failures++;
    }
  }

  if (!/finally\s*\{[\s\S]*tempObj\.remove\(\)/.test(source)) {
    console.error(`${visibleAlignHelper}: temporary outlined text duplicate must be removed in finally`);
    failures++;
  }
}

for (const [file, mode] of visibleAlignFiles) {
  const source = read(file);
  if (!source.includes("Align_VisibleBounds_Helper.jsxinc") ||
      !source.includes("ALIGN_VISIBLE_SCRIPT_FILE = $.fileName") ||
      !source.includes(`ALIGN_VISIBLE_MODE = "${mode}"`)) {
    console.error(`${file}: must invoke visible-bounds helper with mode ${mode}`);
    failures++;
  }
}

{
  const source = read(subscriptedVariable);
  if (!/var\s+radItalic\s*=\s*grpFont\.add\("radiobutton",\s*undefined,\s*"이탤릭체"\);[\s\S]*?var\s+radRoman\s*=\s*grpFont\.add\("radiobutton",\s*undefined,\s*"로만체"\);/.test(source) ||
      !source.includes("radItalic.value = true") ||
      !source.includes('var fontStyle = radItalic.value ? "Italic" : "Roman"') ||
      !source.includes("textItem.textRange.characterAttributes.size = 8")) {
    console.error(`${subscriptedVariable}: italic must be the left/default style and generated text must be 8pt`);
    failures++;
  }
  const requiredIonTokens = [
    'new Window("dialog", "첨자 문자 만들기 by cjh")',
    'var pnlIon = win.add("panel", undefined, "윗첨자 이온 선택")',
    'var chkIonNums = []',
    'var chkIonPlus = rowIonSign.add("checkbox", undefined, "+")',
    'var chkIonMinus = rowIonSign.add("checkbox", undefined, "-")',
    'var btnGenerate = win.add("button", undefined, "첨자 문자 만들기", {name: "ok"})',
    'function drawScriptSymbols(fontStyle, textCase, alphabetsArr, subscriptNumbersArr, ionNumbersArr, ionSignsArr)',
    'FontBaselineOption.SUPERSCRIPT',
    'drawScriptSymbols(fontStyle, textCase, selectedAlphas, selectedNums, selectedIonNums, selectedIonSigns)',
  ];
  for (const token of requiredIonTokens) {
    if (!source.includes(token)) {
      console.error(`${subscriptedVariable}: missing ion superscript support token: ${token}`);
      failures++;
    }
  }
  if (!source.includes('var normalizedIonNumbers = ionNumbersArr.length > 0 ? ionNumbersArr : [""]') ||
      !source.includes('var ionNumberText = ionNumStr === "1" ? "" : ionNumStr') ||
      !/\.contents\s*=\s*charBase\s*\+\s*ionNumberText\s*\+\s*ionSignStr/.test(source)) {
    console.error(`${subscriptedVariable}: ion charge 1 must be omitted, including sign-only ions like H+`);
    failures++;
  }
  if (!/if\s*\(\s*selectedAlphas\.length\s*={2,3}\s*0\s*\|\|\s*\(\s*selectedNums\.length\s*={2,3}\s*0\s*&&\s*selectedIonSigns\.length\s*={2,3}\s*0\s*\)\s*\)/.test(source)) {
    console.error(`${subscriptedVariable}: must allow sign-only ion superscript selections such as H+`);
    failures++;
  }
}

{
  const source = read(fitToMargin);
  if (!source.includes("function makeEditableAndVisible") ||
      !source.includes("function getGroupContentBounds") ||
      !source.includes("restoreStates") ||
      !source.includes("finally") ||
      /isLockedOrHidden/.test(source)) {
    console.error(`${fitToMargin}: must include locked and hidden items while restoring original states`);
    failures++;
  }
}

{
  const source = read(graySelection);
  if (!source.includes("var defaultTarget = getDefaultTarget(sel)") ||
      !source.includes("chkFill.value = defaultTarget === \"fill\"") ||
      !source.includes("chkStroke.value = defaultTarget === \"stroke\"") ||
      !source.includes("function getDefaultTarget(items)") ||
      !source.includes("function collectPaintState(item, state)") ||
      !/state\.hasFill\s*=\s*true/.test(source) ||
      !/state\.hasStroke\s*=\s*true/.test(source) ||
      !/return\s+state\.hasStroke\s*&&\s*!state\.hasFill\s*\?\s*"stroke"\s*:\s*"fill"/.test(source)) {
    console.error(`${graySelection}: stroke-only selections must default to Stroke`);
    failures++;
  }
}

{
  const source = read(embedLinkedImages);
  if (/alert\s*\(\s*resultMessage\s*\)/.test(source) ||
      source.includes('var resultMessage = "처리가 완료되었습니다.\\n"')) {
    console.error(`${embedLinkedImages}: successful embed completion must not show a popup`);
    failures++;
  }
  if (!source.includes('alert("먼저 문서를 열어주세요.")')) {
    console.error(`${embedLinkedImages}: missing-document warning must remain visible`);
    failures++;
  }
  if (!source.includes("var embeddedItems = []") ||
      !source.includes("var beforeItems = getDirectPageItems(parent)") ||
      !source.includes("collectNewPageItems(parent, beforeItems, embeddedItems)") ||
      !source.includes("releaseTransparentClipMasks(embeddedItems)") ||
      !source.includes("function releaseTransparentClipMasks(items)") ||
      !source.includes("function collectGroups(item, groups)") ||
      !source.includes("function releaseGroupTransparentClipMask(group)") ||
      !source.includes("group.clipped = false") ||
      !source.includes("isTransparentClippingMask") ||
      !source.includes("item.clipping && isTransparentPath(item)") ||
      !source.includes("isClippingCompoundPath(item) && isTransparentCompoundPath(item)") ||
      !source.includes("pathItem.opacity <= 0 || (!pathItem.filled && !pathItem.stroked)") ||
      !source.includes("masks[k].remove()")) {
    console.error(`${embedLinkedImages}: embedded library artwork must release transparent clipping masks and delete the mask paths`);
    failures++;
  }
}

{
  if (!exists(extUngroup)) {
    console.error(`${extUngroup}: ExtUngroup script must live in 기타 without the Object_ filename prefix`);
    failures++;
  } else {
    const source = read(extUngroup);
    const requiredKoreanUi = [
      "그룹 해제",
      "대상",
      "선택한 오브젝트",
      "활성 레이어",
      "현재 아트보드",
      "문서 전체",
      "옵션",
      "전체 그룹 해제",
      "클리핑 마스크 해제",
      "마스크 도형 삭제",
      "취소",
      "확인",
      "문서에 그룹이 없습니다.",
      "스크립트를 실행하기 전에 문서를 열어주세요.",
    ];
    for (const token of requiredKoreanUi) {
      if (!source.includes(token)) {
        console.error(`${extUngroup}: missing Korean UI text: ${token}`);
        failures++;
      }
    }
    const englishUi = [
      "Selected objects",
      "Active layer",
      "All in document",
      "Ungroup All",
      "Release Clipping Masks",
      "Remove Masks Shapes",
      "Cancel",
    ];
    for (const token of englishUi) {
      if (source.includes(token)) {
        console.error(`${extUngroup}: modal UI must not contain English text: ${token}`);
        failures++;
      }
    }
  }
  if (exists("스크립트/01_도형/Object_ExtUngroup.jsx")) {
    console.error("스크립트/01_도형/Object_ExtUngroup.jsx: old Object_ prefixed script must be removed from 도형");
    failures++;
  }
}

{
  const source = read(dashAlignHelper);
  if (!source.includes("function restoreDefaultStrokeEnds") ||
      !source.includes("pathItem.strokeCap = StrokeCap.BUTTENDCAP") ||
      !source.includes("pathItem.strokeJoin = StrokeJoin.MITERENDJOIN") ||
      !/app\.doScript\(\s*actionName\s*,\s*actionSetName\s*\)[\s\S]*?restoreDefaultStrokeEnds\(\s*pathItem\s*\)/.test(source)) {
    console.error(`${dashAlignHelper}: dash scripts must leave strokes with butt caps and miter joins after Illustrator action`);
    failures++;
  }
}

{
  const source = read(dashShift);
  const required = [
    'var previewCheck = dlg.add("checkbox", undefined, "미리보기")',
    "previewCheck.value = true",
    "applyPendingOffset();",
    "app.redraw()",
    "restoreOriginalOffsets()",
    "applyPendingOffset()",
    "disableDashCornerAlignment",
    "writeDashCornerAlignmentOffAction",
    "addBooleanParameter(lines, 4, 1684104298, 0)",
    "Codex_DashShift",
    "doc.selection = null",
    "restoreSelection(doc, originalSelection)",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${dashShift}: missing preview or dash corner-alignment reset token: ${token}`);
      failures++;
    }
  }
  if (!source.includes("var strokeStyle = captureStrokeStyle(pathItem)") ||
      !source.includes("restoreStrokeStyle(pathItem, strokeStyle)") ||
      !source.includes("style.strokeCapValue = pathItem.strokeCap === StrokeCap.ROUNDENDCAP") ||
      !source.includes("style.strokeJoinValue = pathItem.strokeJoin === StrokeJoin.ROUNDENDJOIN") ||
      !source.includes("style.strokeMiterLimit = safeNumber(pathItem.strokeMiterLimit, 10)") ||
      !source.includes("addEnumeratedParameter(lines, 1, 1667330094") ||
      !source.includes("addRealParameter(lines, 2, 1836344690") ||
      !source.includes("addEnumeratedParameter(lines, 3, 1785686382")) {
    console.error(`${dashShift}: dash corner-alignment reset must preserve stroke cap, join, and miter limit`);
    failures++;
  }
}

{
  const source = read(cylinder);
  const required = [
    'new Window("dialog", "오브젝트 실린더")',
    'heightPanel.add("slider", undefined, heightMm, 0, maxHeightMm)',
    'var HEIGHT_STEP_MM = 0.05',
    'var DIAMETER_STEP_MM = 0.05',
    'heightSlider.stepdelta = HEIGHT_STEP_MM',
    'var viewAngle = 70',
    'var divisionRotation = 90',
    'viewPanel.add("slider", undefined, viewAngle, -180, 180)',
    'directionPanel.add("radiobutton", undefined, "상하")',
    'directionPanel.add("radiobutton", undefined, "좌우")',
    'divisionPanel.add("checkbox", undefined, "분할선 표시")',
    'divisionPanel.add("slider", undefined, divisionCount, 2, 24)',
    'divisionPanel.add("slider", undefined, divisionRotation, -180, 180)',
    'var K_STEP = 10',
    'faceRow.add("radiobutton", undefined, "보이는면")',
    'faceRow.add("radiobutton", undefined, "내부")',
    'faceRow.add("radiobutton", undefined, "외부")',
    'function makeKColor(k)',
    'cmyk.black = k',
    'gray.gray = k',
    'faceK[activeFace] = clamp(faceK[activeFace] + delta, 0, 100)',
    'var projectedLength = cylinderHeight * Math.abs(Math.sin(radians))',
    'var capScale = Math.abs(Math.cos(radians))',
    'var rearIsSecond = angleDegrees >= 0',
    'function hasCircularPathPoints(item)',
    'function getDivisionPoints(',
    'function makeRearRim(',
    'function makeFrontFace(',
    'function makeRingFillSegments(',
    'applyFill(bodyFill, faceK[FACE_OUTER])',
    'wallT = Math.min(1, -2 * axisDot / axisLen2)',
    'visibleOnInnerWall: sideDot < -0.0001',
    'innerDivisionPoint.innerWallEnd[0]',
    'function innerHoleGeometry(',
    'function drawInnerHoleFill(',
    'function makeBodyFill(',
    'appendCornerArc(points, frontX, frontY, innerRadiusX, innerRadiusY, perpAngle, -Math.PI)',
    'applyFill(crescent, faceK[FACE_INNER])',
    'applyFill(wall, faceK[FACE_INNER])',
    'for (var innerDivisionIndex = 0;',
    'var handleScale = 0.5522847498',
    'visibleOnSide: sideDot > 0.0001',
    'divisionPoint.front[0]',
    'previewGroup = createCylinder(heightMm * MM_TO_PT, viewAngle, isVertical)',
    'source.hidden = sourceWasHidden',
    'source.remove()',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${cylinder}: missing cylinder control or preview token: ${token}`);
      failures++;
    }
  }
}

{
  const source = read(sphere);
  const required = [
    'new Window("dialog", "오브젝트 스피어")',
    'gridPanel.add("slider", undefined, longitudeCount, 0, 24)',
    'gridPanel.add("slider", undefined, latitudeCount, 0, 5)',
    'var LINE_WIDTH_PT = 0.3',
    'to.strokeWidth = LINE_WIDTH_PT',
    'gridPanel.add("slider", undefined, gridRotation, -180, 180)',
    'addAngleControls(viewPanel, "X축", viewX)',
    'addAngleControls(viewPanel, "Y축", viewY)',
    'addAngleControls(viewPanel, "Z축", viewZ)',
    'var latitudeSequence = [0, 30, -30, 60, -60]',
    'var longitudeSpacing = 180 / longitudeCount',
    'if (longitudeCount > 0)',
    'function projectRotatedPoint(x, y, z)',
    'function drawParametricVisibleCurve(group, curveCenter, cosineBasis, sineBasis)',
    'function interpolateVisibilityAngle(a, b, aAngle, bAngle)',
    'function makeParametricBezierPath(group, curveCenter, cosineBasis, sineBasis,',
    'var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)))',
    'previewGroup = createSphere()',
    'source.hidden = sourceWasHidden',
    'source.remove()',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${sphere}: missing sphere control or projection token: ${token}`);
      failures++;
    }
  }
}

{
  const source = read(coilSpring);
  const required = [
    'new Window("dialog", "오브젝트 코일 스프링")',
    'var LINE_WIDTH_PT = 0.3',
    'path.strokeWidth = LINE_WIDTH_PT',
    'var MIN_TURNS = 5',
    'var MAX_TURNS = 10',
    'widthRow.add("statictext", undefined, "좌우 폭")',
    'heightRow.add("statictext", undefined, "위아래 높이")',
    'turnsRow.add("statictext", undefined, "감는 횟수")',
    'sizePanel.add("slider", undefined, coilWidthMm, SIZE_STEP_MM, maxCoilWidthMm)',
    'sizePanel.add("slider", undefined, coilHeightMm, SIZE_STEP_MM, maxCoilHeightMm)',
    'turnsPanel.add("slider", undefined, turnCount, MIN_TURNS, MAX_TURNS)',
    'function createCoilSpring()',
    'function drawHelix(group, radiusX, radiusY, startY, endY)',
    'var segmentCount = Math.max(16, turnCount * 8)',
    'var handleFactor = 4 / 3 * Math.tan(delta / 4)',
    'function drawStem(group, y1, y2)',
    'source.hidden = true',
    'previewGroup = createCoilSpring()',
    'source.hidden = sourceWasHidden',
    'source.remove()',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${coilSpring}: missing coil spring control or drawing token: ${token}`);
      failures++;
    }
  }
}

{
  const source = read(cone);
  const required = [
    'new Window("dialog", "오브젝트 콘")',
    'var topDiameterMm = 0',
    'var baseDiameterMm = roundTo(diameterMm, SIZE_STEP_MM)',
    'sizePanel.add("slider", undefined, baseDiameterMm, SIZE_STEP_MM, maxBaseDiameterMm)',
    'sizePanel.add("slider", undefined, topDiameterMm, 0, baseDiameterMm)',
    'sizePanel.add("slider", undefined, heightMm, SIZE_STEP_MM, maxHeightMm)',
    'divisionPanel.add("slider", undefined, divisionCount, 0, 24)',
    'addAngleControls(viewPanel, "X축", viewX)',
    'addAngleControls(viewPanel, "Y축", viewY)',
    'addAngleControls(viewPanel, "Z축", viewZ)',
    'faceRow.add("radiobutton", undefined, "윗면")',
    'faceRow.add("radiobutton", undefined, "옆면")',
    'faceK[activeFace] = clamp(faceK[activeFace] + delta, 0, 100)',
    'function makeKColor(k)',
    'function createCone()',
    'function updateTopDiameterLimit()',
    'var fraction = i / (divisionCount + 1)',
    'function drawDivisionRing(group, axisHeight, ringRadius, sideSlope)',
    'function drawVisibleDivisionSamples(group, samples, axisHeight, ringRadius)',
    'function makeRingBezierPath(group, axisHeight, ringRadius, startAngle, endAngle, closed)',
    'var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)))',
    'var steps = ringRadius < 0.001 ? 1 : 16',
    'function convexHull(points)',
    'var topNormal = rotatePoint(0, 1, 0)',
    'applyFill(side, faceK[FACE_SIDE])',
    'applyFill(topFace, faceK[FACE_TOP])',
    'previewGroup = createCone()',
    'source.hidden = sourceWasHidden',
    'source.remove()',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${cone}: missing cone control or projection token: ${token}`);
      failures++;
    }
  }
}

for (const file of updaterFiles) {
  const source = read(file);
  if (!source.includes("https://github.com/tgtec26/illu-script-guide.git")) {
    console.error(`${file}: updater must point to GitHub repository`);
    failures++;
  }
}

{
  const source = read("script-action-update-mac.command");
  if (!source.includes("rsync -a --delete") || !source.includes("sudo")) {
    console.error("script-action-update-mac.command: must sync managed folders and handle app-folder permissions");
    failures++;
  }
  if (!source.includes('TARGET_DIR="$APP_DIR/Presets.localized/ko_KR/스크립트"')) {
    console.error("script-action-update-mac.command: must prefer Korean localized Illustrator script folder");
    failures++;
  }
  if (!source.includes("FULL=0") ||
      !source.includes("--full|-Full|-full|-f") ||
      !source.includes('if [ "$FULL" -ne 1 ]') ||
      !source.includes('KYS_NAME="cjh250907.kys"') ||
      !source.includes('ARROW_NAME="화살표.ai"') ||
      !source.includes('SETTINGS_BASE="$HOME/Library/Preferences/Adobe Illustrator $VER Settings"') ||
      !source.includes('"$APP_DIR/Support Files/Resources/ko_KR"') ||
      !source.includes('"$APP_DIR/Support Files/Required/Resources/ko_KR"')) {
    console.error("script-action-update-mac.command: must support script-only mode and --full setup for shortcuts and arrows");
    failures++;
  }
}

{
  const source = read("full-update-mac.command");
  if (!source.includes('script-action-update-mac.command" --full')) {
    console.error("full-update-mac.command: must launch the mac updater with --full");
    failures++;
  }
}

{
  const source = read("script-action-update-windows.ps1");
  const bytes = readBuffer("script-action-update-windows.ps1");
  if (!source.includes("Adobe Illustrator*") || !source.includes("Remove-Item") || !source.includes("Copy-Item")) {
    console.error("script-action-update-windows.ps1: must find Illustrator and replace managed folders");
    failures++;
  }
  if (!source.includes("InstallLocation") || !source.includes("Microsoft\\Windows\\CurrentVersion\\Uninstall")) {
    console.error("script-action-update-windows.ps1: must find Illustrator from Windows installed-app registry entries");
    failures++;
  }
  if (!source.includes("Join-Path $Root \"Adobe\"")) {
    console.error("script-action-update-windows.ps1: must search the common Program Files Adobe subfolder");
    failures++;
  }
  if (!source.includes("#Requires -Version 5.1")) {
    console.error("script-action-update-windows.ps1: must explicitly support Windows PowerShell 5.1 or newer");
    failures++;
  }
  if (/Write-Host\s+"완료\.[\s\S]*?Read-Host\s+"Enter 키를 누르면 닫습니다"/.test(source)) {
    console.error("script-action-update-windows.ps1: successful updates must close without waiting for Enter");
    failures++;
  }
  if (bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) {
    console.error("script-action-update-windows.ps1: must be saved as UTF-8 with BOM for Windows PowerShell 5.1 Korean paths");
    failures++;
  }
}

{
  const source = read("script-action-update-windows.cmd");
  const bytes = readBuffer("script-action-update-windows.cmd");
  if (!source.includes("powershell.exe") ||
      !source.includes("-ExecutionPolicy Bypass") ||
      !source.includes("-File \"%SCRIPT_DIR%script-action-update-windows.ps1\"")) {
    console.error("script-action-update-windows.cmd: must launch the PowerShell updater by double-click");
    failures++;
  }
  if (!bytes.includes(Buffer.from("\r\n")) || bytes.includes(Buffer.from("@echo off\n"))) {
    console.error("script-action-update-windows.cmd: must use CRLF line endings for cmd.exe");
    failures++;
  }
}

{
  const source = read("full-update-windows.cmd");
  const bytes = readBuffer("full-update-windows.cmd");
  if (!source.includes("powershell.exe") ||
      !source.includes("-ExecutionPolicy Bypass") ||
      !source.includes("-File \"%SCRIPT_DIR%script-action-update-windows.ps1\" -Full")) {
    console.error("full-update-windows.cmd: must launch the PowerShell updater with -Full");
    failures++;
  }
  if (!bytes.includes(Buffer.from("\r\n")) || bytes.includes(Buffer.from("@echo off\n"))) {
    console.error("full-update-windows.cmd: must use CRLF line endings for cmd.exe");
    failures++;
  }
}

{
  const source = read(findSimilar);
  const required = [
    'var chkGeometry',
    'geometry: true',
    'var chkObjectType',
    'objectType: true',
    'var chkFill',
    'fill: true',
    'var chkStroke',
    'stroke: true',
    'var chkStrokeWidth',
    'strokeWidth: true',
    'var chkSize',
    'size: true',
    'var chkScaleAllowed',
    'scaleAllowed: false',
    'var chkRotationAllowed',
    'rotationAllowed: false',
    'var chkMirrorAllowed',
    'mirrorAllowed: false',
    'function geometryMatches',
    'function collectPathItems',
    'function colorsMatch',
    'if (o.size && !o.scaleAllowed && !sizeMatchesBounds',
    'FindSimilar_settings.json',
    'function loadSettings',
    'function saveSettings',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${findSimilar}: missing ${token}`);
      failures++;
    }
  }
}

process.exit(failures === 0 ? 0 : 1);
