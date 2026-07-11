const fs = require("fs");
const path = require("path");
const assert = require("assert");

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
const weatherFront = "스크립트/01_도형/Object_front.jsx";
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

function extractFunction(source, name) {
  const declaration = `function ${name}(`;
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`missing production helper: ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index++) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "{") depth++;
    if (character === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced production helper: ${name}`);
}

function extractWeatherFrontHelpers(source, names) {
  const declarations = names.map((name) => extractFunction(source, name)).join("\n");
  return new Function(`${declarations}\nreturn {${names.join(",")}};`)();
}

function assertClose(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${label}: expected ${expected}, got ${actual}`);
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
  const standardOptionArrays = optionArrays.slice(0, 9);
  if (optionArrays.length !== 11 ||
      standardOptionArrays.length !== 9 ||
      standardOptionArrays.some((arraySource) => {
        const items = arraySource.match(/"[^"]*"/g) || [];
        return items.length !== 6;
      })) {
    console.error(textInput + ": nine standard text rows must provide exactly 6 items");
    failures++;
  }
  if (!source.includes('var label = opt.labels ? opt.labels[charIndex] : opt.contents[charIndex]') ||
      !source.includes('row.add("button", undefined, label)') ||
      !source.includes('btn.onClick = makeSelectHandler(optionIndex, charIndex + 1)') ||
      !source.includes('contentsArray = option.contents.slice(0, selectedCount)') ||
      !source.includes('if (option.independent)') ||
      !source.includes('contentsArray = [option.contents[selectedCount - 1]]') ||
      !source.includes('function makeSelectHandler(optionIndex, count)')) {
    console.error(textInput + ": standard rows must insert through the clicked character and special rows must insert one glyph");
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
    'gridPanel.add("slider", undefined, latitudeCount, 0, 11)',
    'var LINE_WIDTH_PT = 0.3',
    'to.strokeWidth = LINE_WIDTH_PT',
    'gridPanel.add("slider", undefined, gridRotation, -180, 180)',
    'addAngleControls(viewPanel, "X축", viewX)',
    'addAngleControls(viewPanel, "Y축", viewY)',
    'addAngleControls(viewPanel, "Z축", viewZ)',
    'var resetViewButton = viewPanel.add("button", undefined, "시점 리셋")',
    'resetViewButton.onClick = resetViewControls',
    'function resetViewControls()',
    'viewX = 0',
    'viewY = 0',
    'viewZ = 0',
    'xControls.input.text = formatSignedAngle(0)',
    'yControls.input.text = formatSignedAngle(0)',
    'zControls.input.text = formatSignedAngle(0)',
    'xControls.slider.value = 0',
    'yControls.slider.value = 0',
    'zControls.slider.value = 0',
    'var latitudeSequence = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75]',
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
  if (source.includes('latitudeCount, 0, 5') || source.includes('validLatitude > 5')) {
    console.error(`${sphere}: latitude count must support 0 through 11`);
    failures++;
  }
  const resetViewMatch = source.match(/function resetViewControls\(\)\s*\{([\s\S]*?)\n\s*\}/);
  const resetViewBody = resetViewMatch ? resetViewMatch[1] : "";
  const resetViewTokens = [
    "viewX = 0",
    "viewY = 0",
    "viewZ = 0",
    "xControls.input.text = formatSignedAngle(0)",
    "yControls.input.text = formatSignedAngle(0)",
    "zControls.input.text = formatSignedAngle(0)",
    "xControls.slider.value = 0",
    "yControls.slider.value = 0",
    "zControls.slider.value = 0",
  ];
  if (!resetViewMatch ||
      resetViewTokens.some((token) => !resetViewBody.includes(token)) ||
      (resetViewBody.match(/updatePreview\(\)/g) || []).length !== 1 ||
      /gridRotation\s*=/.test(resetViewBody)) {
    console.error(`${sphere}: view reset must update X/Y/Z controls once without resetting grid rotation`);
    failures++;
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
    'function drawCoilSpringPath(group, radiusX, radiusY, topY, startY, endY, bottomY)',
    'anchors.push([centerX, topY])',
    'anchors.push([centerX, bottomY])',
    'path.pathPoints[1].pointType = PointType.CORNER',
    'path.pathPoints[path.pathPoints.length - 2].pointType = PointType.CORNER',
    'var endT = startT + Math.PI * 2 * (turnCount - 0.5)',
    'var baselineStartY = startY - radiusY * Math.sin(startT)',
    'var baselineEndY = endY - radiusY * Math.sin(endT)',
    'var segmentCount = Math.max(16, turnCount * 8)',
    'var handleFactor = 4 / 3 * Math.tan(delta / 4)',
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
  if (source.includes('var endT = startT + Math.PI * 2 * turnCount')) {
    console.error(`${coilSpring}: helix must end on the opposite center-axis phase`);
    failures++;
  }
  const pathCreationCount = (source.match(/group\.pathItems\.add\(\)/g) || []).length;
  if (pathCreationCount !== 1 || source.includes('function drawStem(')) {
    console.error(`${coilSpring}: stems and helix must form one connected PathItem`);
    failures++;
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

{
  if (!exists(weatherFront)) {
    console.error(`${weatherFront}: weather-front script is missing`);
    failures++;
  } else {
    const source = read(weatherFront);
    const required = [
      'new Window("dialog", "오브젝트 전선")',
      'frontPanel.add("radiobutton", undefined, "온난전선")',
      'frontPanel.add("radiobutton", undefined, "한랭전선")',
      'frontPanel.add("radiobutton", undefined, "정체전선")',
      'frontPanel.add("radiobutton", undefined, "폐색전선")',
      'var shapeSizeMm = 2',
      'var gapMm = 2',
      'var strokeWidthPt = 0.5',
      'addNumericControl(layoutPanel, "도형 크기", shapeSizeMm, 0.5, 20, 0.1, "mm")',
      'addNumericControl(layoutPanel, "빈 간격", gapMm, 0, 20, 0.1, "mm")',
      'addNumericControl(linePanel, "라인 두께", strokeWidthPt, 0.1, 10, 0.1, "pt")',
      'layoutPanel.add("checkbox", undefined, "방향 반전")',
      'function updatePreview()',
      'function clearPreview()',
      'source.hidden = sourceWasHidden',
      'source.remove()',
      'item.editable === false',
      'var pathMetrics = buildPathMetrics(source, 80)',
      'function cubicPoint(p0, p1, p2, p3, t)',
      'function cubicDerivative(p0, p1, p2, p3, t)',
      'function buildPathMetrics(path, samplesPerSegment)',
      'function getFrameAtLength(metrics, distance)',
      'var normalSign = reversed ? -1 : 1',
      'var unitLength = shapeSize + gap',
      'var centerDistance = shapeSize / 2 + index * unitLength',
      'function drawSemicircle(group, frame, size, side, color)',
      'function drawTriangle(group, frame, size, side, color)',
      'frontType === "stationary"',
      'frontType === "occluded"',
      'colorPanel.add("radiobutton", undefined, "표준색")',
      'colorPanel.add("radiobutton", undefined, "K 음영")',
      'colorPanel.add("radiobutton", undefined, "HEX")',
      'var colorMode = "standard"',
      'var kValue = 0',
      'var hexValue = "FF0000"',
      'var K_STEP = 10',
      'kValue = clamp(kValue + delta, 0, 100)',
      '/^#?[0-9a-fA-F]{6}$/.test(value)',
      'var STANDARD_RED = "FF0000"',
      'var STANDARD_BLUE = "0000FF"',
      'var STANDARD_PURPLE = "7030A0"',
      'function makeHexColor(hex)',
      'function makeKColor(k)',
      'function getFrontColors(index)',
      'function splitCubic(cubic, t)',
      'function extractCubicRange(cubic, startT, endT)',
      'function drawStationaryBaseline(group, boundaries, colors)',
      'stepK(-10)',
      'stepK(10)',
      '"0K"',
      '"100K"',
      'var previousCoordinateSystem = app.coordinateSystem',
      'app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM',
      'app.coordinateSystem = previousCoordinateSystem',
      'function restoreSourceAfterPreviewFailure()',
    ];

    for (const token of required) {
      if (!source.includes(token)) {
        console.error(`${weatherFront}: missing weather-front control/geometry token: ${token}`);
        failures++;
      }
    }

    const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
    const activeDocLine = lineOf(source, /app\.activeDocument/);
    if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
      console.error(`${weatherFront}: app.documents.length guard must run before app.activeDocument`);
      failures++;
    }

    const finalCreationLine = lineOf(source, /var\s+finalGroup\s*=\s*createWeatherFront\(false\)/);
    const sourceRemovalLine = lineOf(source, /source\.remove\(\)/);
    if (finalCreationLine < 1 || sourceRemovalLine < 1 || sourceRemovalLine < finalCreationLine) {
      console.error(`${weatherFront}: source removal must follow final weather-front creation`);
      failures++;
    }

    const coordinateCaptureLine = lineOf(source, /var\s+previousCoordinateSystem\s*=\s*app\.coordinateSystem/);
    const coordinateNormalizeLine = lineOf(source, /app\.coordinateSystem\s*=\s*CoordinateSystem\.DOCUMENTCOORDINATESYSTEM/);
    const metricsLine = lineOf(source, /var\s+pathMetrics\s*=\s*buildPathMetrics\(source,\s*80\)/);
    if (coordinateCaptureLine < 1 || coordinateNormalizeLine < coordinateCaptureLine || metricsLine < coordinateNormalizeLine) {
      console.error(`${weatherFront}: source geometry must be read after document-coordinate normalization`);
      failures++;
    }

    if (!/try\s*\{[\s\S]*?app\.coordinateSystem\s*=\s*CoordinateSystem\.DOCUMENTCOORDINATESYSTEM;[\s\S]*?var\s+result\s*=\s*dlg\.show\(\);[\s\S]*?\}\s*finally\s*\{\s*app\.coordinateSystem\s*=\s*previousCoordinateSystem;\s*\}/.test(source)) {
      console.error(`${weatherFront}: document coordinate system must be restored after preview, cancel, and final creation paths`);
      failures++;
    }

    const updatePreviewBody = extractFunction(source, "updatePreview");
    if (!/try\s*\{[\s\S]*?source\.hidden\s*=\s*true;\s*source\.selected\s*=\s*false;[\s\S]*?previewGroup\s*=\s*createWeatherFront\(true\);[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?clearPreview\(\);[\s\S]*?restoreSourceAfterPreviewFailure\(\);[\s\S]*?alert\(\s*"미리보기를 만드는 중 오류가 발생했습니다\."\s*\);[\s\S]*?app\.redraw\(\);[\s\S]*?\}/.test(updatePreviewBody)) {
      console.error(`${weatherFront}: preview callbacks must recover DOM failures and re-hide the source before successful rebuilds`);
      failures++;
    }

    if (/pathPoints\s*\[\s*index\s*\]/.test(source) ||
        /index\s*\/\s*\(?\s*(?:count|symbolCount|pathPoints\.length)/.test(source)) {
      console.error(`${weatherFront}: symbol placement must use cached path length, not parameter-index spacing`);
      failures++;
    }

    if (/\^#\?\[0-9a-fA-F\]\{3\}/.test(source) || /\{3\}(?:\$|\|)/.test(source)) {
      console.error(`${weatherFront}: Hex mode must not accept three-digit shorthand`);
      failures++;
    }

    if (!/baseline\.stroked\s*=\s*true/.test(source) ||
        !/baseline\.filled\s*=\s*false/.test(source) ||
        !/baseline\.strokeWidth\s*=\s*strokeWidthPt/.test(source) ||
        !/triangle\.stroked\s*=\s*false/.test(source) ||
        !/semicircle\.stroked\s*=\s*false/.test(source)) {
      console.error(`${weatherFront}: baseline must carry the stroke while symbols remain fill-only`);
      failures++;
    }

    if (!/frontType\s*===\s*"stationary"\s*&&\s*colorMode\s*===\s*"standard"[\s\S]*?drawStationaryBaseline/.test(source) ||
        !/else\s*\{[\s\S]*?source\.duplicate\(group,\s*ElementPlacement\.PLACEATEND\)/.test(source)) {
      console.error(`${weatherFront}: only standard stationary fronts may replace the duplicated baseline`);
      failures++;
    }

    try {
      const helpers = extractWeatherFrontHelpers(source, [
        "getSymbolPlacements",
        "getSymbolInstruction",
        "pointFromArray",
        "cubicPoint",
        "cubicDerivative",
        "getCubicSegments",
        "distanceBetween",
        "buildPathMetrics",
        "clamp",
        "sampleDirection",
        "getFrameAtLength",
      ]);

      assert.deepStrictEqual(
        helpers.getSymbolPlacements(25, 10, 5),
        [{index: 0, centerDistance: 5}, {index: 1, centerDistance: 20}],
        "complete symbols must use size-plus-gap center spacing"
      );
      assert.deepStrictEqual(
        helpers.getSymbolPlacements(24, 10, 5),
        [{index: 0, centerDistance: 5}],
        "partial trailing symbols must not be placed"
      );
      assert.deepStrictEqual(
        helpers.getSymbolPlacements(9, 10, 5),
        [],
        "paths shorter than one symbol must have no placements"
      );

      assert.deepStrictEqual(helpers.getSymbolInstruction("warm", 0, 1), {shape: "semicircle", side: 1});
      assert.deepStrictEqual(helpers.getSymbolInstruction("cold", 0, -1), {shape: "triangle", side: -1});
      assert.deepStrictEqual(helpers.getSymbolInstruction("stationary", 0, -1), {shape: "semicircle", side: -1});
      assert.deepStrictEqual(helpers.getSymbolInstruction("stationary", 1, -1), {shape: "triangle", side: 1});
      assert.deepStrictEqual(helpers.getSymbolInstruction("occluded", 0, -1), {shape: "semicircle", side: -1});
      assert.deepStrictEqual(helpers.getSymbolInstruction("occluded", 1, -1), {shape: "triangle", side: -1});

      const straightPath = {
        pathPoints: [
          {anchor: [0, 0], rightDirection: [10 / 3, 0]},
          {anchor: [10, 0], leftDirection: [20 / 3, 0]},
        ],
      };
      const metrics = helpers.buildPathMetrics(straightPath, 80);
      const frame = helpers.getFrameAtLength(metrics, 5);
      assertClose(metrics.totalLength, 10, "straight cubic total length");
      assertClose(frame.x, 5, "straight cubic midpoint x");
      assertClose(frame.y, 0, "straight cubic midpoint y");
      assertClose(frame.tx, 1, "straight cubic tangent x");
      assertClose(frame.ty, 0, "straight cubic tangent y");
      assertClose(frame.nx, 0, "straight cubic left normal x");
      assertClose(frame.ny, 1, "straight cubic left normal y");
    } catch (error) {
      console.error(`${weatherFront}: executable geometry regression failed: ${error.message}`);
      failures++;
    }

    try {
      const helpers = extractWeatherFrontHelpers(source, [
        "normalizeHex",
        "hexToRgb",
        "rgbToCmyk",
        "kToRgb",
        "lerpPoint",
        "splitCubic",
        "extractCubicRange",
      ]);

      assert.strictEqual(helpers.normalizeHex("#a1B2c3"), "A1B2C3");
      assert.strictEqual(helpers.normalizeHex("abc"), null, "three-digit Hex must be rejected");
      assert.strictEqual(helpers.normalizeHex("GG0000"), null, "non-Hex characters must be rejected");
      assert.deepStrictEqual(helpers.hexToRgb("7030A0"), {red: 112, green: 48, blue: 160});
      assert.deepStrictEqual(helpers.kToRgb(0), {red: 255, green: 255, blue: 255});
      assert.deepStrictEqual(helpers.kToRgb(100), {red: 0, green: 0, blue: 0});

      const redCmyk = helpers.rgbToCmyk({red: 255, green: 0, blue: 0});
      assertClose(redCmyk.cyan, 0, "red CMYK cyan");
      assertClose(redCmyk.magenta, 100, "red CMYK magenta");
      assertClose(redCmyk.yellow, 100, "red CMYK yellow");
      assertClose(redCmyk.black, 0, "red CMYK black");
      assert.deepStrictEqual(
        helpers.rgbToCmyk({red: 0, green: 0, blue: 0}),
        {cyan: 0, magenta: 0, yellow: 0, black: 100}
      );

      const cubic = {
        p0: {x: 0, y: 0},
        p1: {x: 0, y: 8},
        p2: {x: 8, y: 8},
        p3: {x: 8, y: 0},
      };
      const halves = helpers.splitCubic(cubic, 0.5);
      assert.deepStrictEqual(halves.left, {
        p0: {x: 0, y: 0}, p1: {x: 0, y: 4}, p2: {x: 2, y: 6}, p3: {x: 4, y: 6},
      });
      assert.deepStrictEqual(halves.right, {
        p0: {x: 4, y: 6}, p1: {x: 6, y: 6}, p2: {x: 8, y: 4}, p3: {x: 8, y: 0},
      });

      const middle = helpers.extractCubicRange(cubic, 0.25, 0.75);
      assert.deepStrictEqual(middle, {
        p0: {x: 1.25, y: 4.5}, p1: {x: 2.75, y: 6.5}, p2: {x: 5.25, y: 6.5}, p3: {x: 6.75, y: 4.5},
      });
    } catch (error) {
      console.error(`${weatherFront}: executable color/subdivision regression failed: ${error.message}`);
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
