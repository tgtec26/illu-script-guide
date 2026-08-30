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
const visibleAlign = "스크립트/05_정렬/Align_VisibleBounds.jsx";

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
const phospholipid = "스크립트/01_도형/Object_PhospholipidBilayer.jsx";
const anchorAngle = "스크립트/01_도형/Object_AnchorAngle.jsx";
const lewisDots = "스크립트/02_문자/Text_LewisDots.jsx";
const cubicLattice = "스크립트/01_도형/Object_CubicLattice.jsx";
const graphiteCrystal = "스크립트/01_도형/Object_GraphiteCrystal.jsx";
const diamondCrystal = "스크립트/01_도형/Object_DiamondCrystal.jsx";
const updaterFiles = ["setup-mac.command", "setup-windows.ps1", "UPDATE.md"];

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

function assertNear(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: expected ${expected}, got ${actual}`);
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
  const standardOptionArrays = optionArrays.slice(0, 7);
  if (optionArrays.length !== 10 ||
      standardOptionArrays.length !== 7 ||
      standardOptionArrays.some((arraySource) => {
        const items = arraySource.match(/"[^"]*"/g) || [];
        return items.length !== 6;
      })) {
    console.error(textInput + ": seven literal text rows must provide exactly 6 items");
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
  if (!source.includes('{prefix: "t", fontSize: 8, fontNames: ["GSMediItaC1"], applySubscript: true}') ||
      !source.includes('{prefix: "d", fontSize: 8, fontNames: ["GSMediItaC1"], applySubscript: true}') ||
      !source.includes("var SUBSCRIPT_BUTTON_COUNT = 6") ||
      !source.includes("opt.contents = makeSubscriptContents(opt.prefix, 1)") ||
      !source.includes("opt.contents = makeSubscriptContents(opt.prefix, checkbox.value ? 0 : 1)") ||
      !source.includes('var zeroCheck = row.add("checkbox", undefined, "0")')) {
    console.error(textInput + ": subscript rows must start at 1 and switch to 0 through the row checkbox");
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
    console.error(`${file}: must record itself for RepeatLast.jsx`);
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
  const source = read(visibleAlign);
  const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
  const activeDocLine = lineOf(source, /app\.activeDocument/);

  if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
    console.error(`${visibleAlign}: app.documents.length guard must run before app.activeDocument`);
    failures++;
  }

  const requiredTokens = [
    "tempObj.createOutline()",
    "outlined.visibleBounds",
    "function getGroupRealBounds",
    "function getClippingBounds",
    "function unionBounds",
    "obj.translate(deltaX, deltaY)",
  ];
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      console.error(`${visibleAlign}: missing visible-bounds alignment token: ${token}`);
      failures++;
    }
  }

  if (!/finally\s*\{[\s\S]*tempObj\.remove\(\)/.test(source)) {
    console.error(`${visibleAlign}: temporary outlined text duplicate must be removed in finally`);
    failures++;
  }

  const requiredModes = ["hLeft", "hCenter", "hRight", "vTop", "vCenter", "vBottom"];
  for (const mode of requiredModes) {
    if (!source.includes(`mode === "${mode}"`)) {
      console.error(`${visibleAlign}: missing align mode branch: ${mode}`);
      failures++;
    }
  }
  if (!source.includes('mode = "center"')) {
    console.error(`${visibleAlign}: center button must set the combined horizontal+vertical mode`);
    failures++;
  }

  const buttonRows = [
    ['makeAlignButton(topRow, "좌", "hLeft"', "top row"],
    ['makeAlignButton(topRow, "중", "hCenter"', "top row"],
    ['makeAlignButton(topRow, "우", "hRight"', "top row"],
    ['makeAlignButton(rightCol, "상", "vTop"', "right column"],
    ['makeAlignButton(rightCol, "중", "vCenter"', "right column"],
    ['makeAlignButton(rightCol, "하", "vBottom"', "right column"],
  ];
  for (const [token, where] of buttonRows) {
    if (!source.includes(token)) {
      console.error(`${visibleAlign}: missing ${where} button: ${token}`);
      failures++;
    }
  }
  if (!source.includes("var centerBtn = box.add(\"button\", undefined, \"중앙\")")) {
    console.error(`${visibleAlign}: the combined center button must sit inside the box panel`);
    failures++;
  }

  if (!source.includes('var PREF_KEY = "AlignVisibleBounds/settings"') ||
      !source.includes('app.preferences.setStringPreference(PREF_KEY, ["v1", refMode].join("|"))')) {
    console.error(`${visibleAlign}: reference-object choice must persist through app.preferences`);
    failures++;
  }

  const showLine = lineOf(source, /dlg\.show\(\)\s*!==\s*1/);
  const savePrefCallLine = lineOf(source, /^\s*savePref\(refMode\);/m);
  if (showLine < 1 || savePrefCallLine < 1 || savePrefCallLine < showLine) {
    console.error(`${visibleAlign}: preferences must be saved on confirm only`);
    failures++;
  }

  if (!/refMode\s*===\s*"big"\s*\?\s*\(area\s*>\s*keyArea\)\s*:\s*\(area\s*<\s*keyArea\)/.test(source)) {
    console.error(`${visibleAlign}: key object must follow the big/small reference radio`);
    failures++;
  }
}

{
  const source = read(subscriptedVariable);
  if (!/var\s+radItalic\s*=\s*grpFont\.add\("radiobutton",\s*undefined,\s*"이탤릭체"\);[\s\S]*?var\s+radRoman\s*=\s*grpFont\.add\("radiobutton",\s*undefined,\s*"로만체"\);/.test(source) ||
      !source.includes('radItalic.value = (saved.fontStyle !== "Roman")') ||
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
      "빈 투명 개체 삭제",
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
    'var heightControls = addValueRow(',
    'var HEIGHT_STEP_MM = 0.05',
    'var DIAMETER_STEP_MM = 0.05',
    'slider.stepdelta = step',
    'var viewAngle = 70',
    'var divisionRotation = 90',
    'addAngleRow(viewPanel, "X축", viewAngle, true)',
    'directionRow.add("radiobutton", undefined, "상하")',
    'directionRow.add("radiobutton", undefined, "좌우")',
    'directionRow.add("checkbox", undefined, "분할선")',
    'countGroup.add("slider", undefined, divisionCount, 2, 24)',
    'addAngleRow(shapePanel, "분할 회전", divisionRotation)',
    'var K_STEP = 10',
    'colorRow.add("radiobutton", undefined, "보이는면")',
    'colorRow.add("radiobutton", undefined, "내부")',
    'colorRow.add("radiobutton", undefined, "외부")',
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
    'var group = createCylinder(heightMm * MM_TO_PT, view.angle, true)',
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
    'addSizeRow(sizePanel, "밑면 지름", baseDiameterMm, SIZE_STEP_MM, maxBaseDiameterMm)',
    'addSizeRow(sizePanel, "윗면 지름", topDiameterMm, 0, baseDiameterMm)',
    'addSizeRow(sizePanel, "높이", heightMm, SIZE_STEP_MM, maxHeightMm)',
    'divisionRow.add("slider", undefined, divisionCount, 0, 24)',
    'addAngleControls(viewPanel, "X축", viewX)',
    'addAngleControls(viewPanel, "Y축", viewY)',
    'addAngleControls(viewPanel, "Z축", viewZ)',
    'colorRow.add("radiobutton", undefined, "윗면")',
    'colorRow.add("radiobutton", undefined, "옆면")',
    'faceK[activeFace] = clamp(faceK[activeFace] + delta, 0, 100)',
    'function makeKColor(k)',
    'function createCone()',
    'function updateTopDiameterLimit()',
    'var fraction = i / (divisionCount + 1)',
    'function drawDivisionRing(group, axisHeight, ringRadius, sideSlope)',
    'function drawVisibleDivisionSamples(group, samples, axisHeight, ringRadius)',
    'function makeRingBezierPath(group, axisHeight, ringRadius, startAngle, endAngle, closed)',
    'var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)))',
    'var steps = ringRadius < 0.001 ? 1 : RING_SAMPLE_COUNT',
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
      'var pathMetrics = buildPathMetrics(source, 200)',
      'function cubicPoint(p0, p1, p2, p3, t)',
      'function cubicDerivative(p0, p1, p2, p3, t)',
      'function buildPathMetrics(path, samplesPerSegment)',
      'function getFrameAtLength(metrics, distance)',
      'var normalSign = reversed ? -1 : 1',
      'var unitLength = shapeSize + gap',
      'var centerDistance = shapeSize / 2 + index * unitLength',
      'function buildFilledPath(group, anchors, handles, color)',
      'function drawTriangle(group, frame, size, side, color)',
      'frontType === "stationary"',
      'frontType === "occluded"',
      'colorPanel.add("radiobutton", undefined, "표준색")',
      'colorPanel.add("radiobutton", undefined, "K 음영")',
      'colorPanel.add("radiobutton", undefined, "HEX")',
      'var colorMode = "standard"',
      'var kValue = 100',
      'var hexValue = "FF0000"',
      'var K_STEP = 10',
      'kValue = clamp(kValue + delta, 50, 100)',
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
      '"50K"',
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

    const finalCreationLine = lineOf(source, /var\s+finalGroup\s*=\s*tryCreateWeatherFront\(false,\s*3\)/);
    const sourceRemovalLine = lineOf(source, /source\.remove\(\)/);
    if (finalCreationLine < 1 || sourceRemovalLine < 1 || sourceRemovalLine < finalCreationLine) {
      console.error(`${weatherFront}: source removal must follow final weather-front creation`);
      failures++;
    }

    const coordinateCaptureLine = lineOf(source, /var\s+previousCoordinateSystem\s*=\s*app\.coordinateSystem/);
    const coordinateNormalizeLine = lineOf(source, /app\.coordinateSystem\s*=\s*CoordinateSystem\.DOCUMENTCOORDINATESYSTEM/);
    const metricsLine = lineOf(source, /var\s+pathMetrics\s*=\s*buildPathMetrics\(source,\s*200\)/);
    if (coordinateCaptureLine < 1 || coordinateNormalizeLine < coordinateCaptureLine || metricsLine < coordinateNormalizeLine) {
      console.error(`${weatherFront}: source geometry must be read after document-coordinate normalization`);
      failures++;
    }

    if (!/try\s*\{[\s\S]*?app\.coordinateSystem\s*=\s*CoordinateSystem\.DOCUMENTCOORDINATESYSTEM;[\s\S]*?var\s+result\s*=\s*dlg\.show\(\);[\s\S]*?\}\s*finally\s*\{\s*app\.coordinateSystem\s*=\s*previousCoordinateSystem;\s*\}/.test(source)) {
      console.error(`${weatherFront}: document coordinate system must be restored after preview, cancel, and final creation paths`);
      failures++;
    }

    const updatePreviewBody = extractFunction(source, "updatePreview");
    if (!/try\s*\{[\s\S]*?source\.hidden\s*=\s*true;\s*source\.selected\s*=\s*false;[\s\S]*?previewGroup\s*=\s*tryCreateWeatherFront\(true,\s*2\);[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?clearPreview\(\);[\s\S]*?restoreSourceAfterPreviewFailure\(\);[\s\S]*?app\.redraw\(\);[\s\S]*?\}/.test(updatePreviewBody)) {
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
        !/shape\.stroked\s*=\s*false/.test(source) ||
        !/shape\.filled\s*=\s*true/.test(source)) {
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

{
  if (!exists(anchorAngle)) {
    console.error(`${anchorAngle}: anchor-angle rotation script is missing`);
    failures++;
  } else {
    const source = read(anchorAngle);
    const required = [
      'new Window("dialog", "앵커 기준 각도 맞추기")',
      '"수평선 기준 현재 각도: " + formatAngle(getSignedHorizontalAngle(angle)) + "°"',
      'var presetAngles = [0, 30, 45, 60, 90]',
      'PathPointSelection.ANCHORPOINT',
      'selectedPoints.length !== 2',
      'Transformation.CENTER',
      'function getLineAngle(first, second)',
      'function getShortestRotation(currentAngle, targetAngle)',
      'function rotatePoint(point, origin, angleDegrees)',
      'function rotateOwners(owners, selectedPoints, pivot, angleDegrees)',
    ];
    for (const token of required) {
      if (!source.includes(token)) {
        console.error(`${anchorAngle}: missing anchor-angle token: ${token}`);
        failures++;
      }
    }

    try {
      const helpers = extractWeatherFrontHelpers(source, [
        "normalizeLineAngle",
        "getSignedHorizontalAngle",
        "getLineAngle",
        "getShortestRotation",
        "rotatePoint",
      ]);
      assertClose(helpers.getLineAngle([0, 0], [10, 0]), 0, "horizontal line angle");
      assertClose(helpers.getLineAngle([10, 0], [0, 0]), 0, "reversed horizontal line angle");
      assertClose(helpers.getLineAngle([0, 0], [10, 10]), 45, "diagonal line angle");
      assertClose(helpers.getSignedHorizontalAngle(150), -30, "descending line signed horizontal angle");
      assertClose(helpers.getSignedHorizontalAngle(30), 30, "ascending line signed horizontal angle");
      assertClose(helpers.getSignedHorizontalAngle(90), 90, "vertical signed horizontal angle");
      assertClose(helpers.getShortestRotation(30, 0), -30, "thirty degrees to horizontal");
      assertClose(helpers.getShortestRotation(150, 30), 60, "shortest undirected rotation");
      assertClose(helpers.getShortestRotation(0, 90), 90, "horizontal to vertical");
      const rotated = helpers.rotatePoint([10, 0], [0, 0], 90);
      assertClose(rotated[0], 0, "rotated point x");
      assertClose(rotated[1], 10, "rotated point y");
    } catch (error) {
      console.error(`${anchorAngle}: executable angle regression failed: ${error.message}`);
      failures++;
    }
  }
}

{
  if (!exists(lewisDots)) {
    console.error(`${lewisDots}: Lewis-dot script is missing`);
    failures++;
  } else {
    const source = read(lewisDots);
    const required = [
      'new Window("dialog", "루이스 전자점식")',
      'addDotCountControls(dlg, "12시", dotCounts, "top")',
      'addDotCountControls(dlg, "3시", dotCounts, "right")',
      'addDotCountControls(dlg, "6시", dotCounts, "bottom")',
      'addDotCountControls(dlg, "9시", dotCounts, "left")',
      'var DOT_DIAMETER_MM = 0.6',
      'var GAP_MM = 1',
      'tempText.createOutline()',
      'outlined.visibleBounds',
      'function getDotCenters(bounds, direction, count, gap, diameter)',
      'function drawDot(group, center)',
      'dot.fillColor = makeBlackColor()',
      'try { finalGroup.move(source, ElementPlacement.PLACEAFTER); } catch(e) {}',
    ];
    for (const token of required) {
      if (!source.includes(token)) {
        console.error(`${lewisDots}: missing Lewis-dot token: ${token}`);
        failures++;
      }
    }
    if (!/finally\s*\{[\s\S]*outlined\.remove\(\)[\s\S]*tempText\.remove\(\)/.test(source)) {
      console.error(`${lewisDots}: outlined temporary text must be cleaned up`);
      failures++;
    }
    try {
      const getDotCenters = new Function(`${extractFunction(source, "getDotCenters")}\nreturn getDotCenters;`)();
      const bounds = [0, 10, 8, 0];
      const gap = 2.83464567;
      const diameter = 0.6 * gap;
      const radius = diameter / 2;
      const separation = gap + diameter;
      assert.deepStrictEqual(getDotCenters(bounds, "top", 1, gap, diameter), [[4, 10 + gap + radius]]);
      assert.deepStrictEqual(getDotCenters(bounds, "right", 2, gap, diameter), [
        [8 + gap + radius, 5 + separation / 2],
        [8 + gap + radius, 5 - separation / 2],
      ]);
    } catch (error) {
      console.error(`${lewisDots}: dot-placement regression failed: ${error.message}`);
      failures++;
    }
  }
}

{
  if (!exists(cubicLattice)) {
    console.error(`${cubicLattice}: cubic-lattice script is missing`);
    failures++;
  } else {
    const source = read(cubicLattice);
    const required = [
      'new Window("dialog", "입방정계 단위세포 생성기")',
      'var LINE_WIDTH_PT = 0.3',
      'function setProjectionAngles(angleR, angleL, depthPercent)',
      'setProjectionAngles(131, 109, 100)',
      '{ key: "sc",  label: "단순 입방" }',
      '{ key: "bcc", label: "체심 입방" }',
      '{ key: "fcc", label: "면심 입방" }',
      '{ key: "nacl", label: "NaCl" }',
      '{ key: "cscl", label: "CsCl" }',
      '{ key: "i2", label: "I2 (아이오딘)" }',
      '{ key: "co2", label: "CO2 (드라이아이스)" }',
      '{ key: "wire", label: "라인 + 작은 구" }',
      '{ key: "pack", label: "밀집 구(전체 원자)" }',
      '{ key: "cut",  label: "단위세포 절단" }',
      'addSlider("셀 한 변", 5, 80, 20',
      'addSlider("꼭짓점 구 지름(라인)", 0.5, 20, 3',
      'addSlider("나머지 구 지름(라인)", 0.5, 20, 3',
      'addSlider("꼭짓점 밝기", 40, 160, 100',
      'addSlider("나머지 밝기", 40, 160, 100',
      'addSlider("셀 간격", 0, 40, 8',
      'sldCornerSphere.enabled = chkMode[0].value',
      'sldOtherSphere.enabled = chkMode[0].value',
      'cornerSphereMM: sldCornerSphere.value',
      'otherSphereMM: sldOtherSphere.value',
      'cornerBrightness: sldCornerBrightness.value',
      'otherBrightness: sldOtherBrightness.value',
      'var sldAngleR = addAngleSlider("오른쪽 각도", 131)',
      'var sldAngleL = addAngleSlider("왼쪽 각도", 109)',
      'var sldDepth = addDepthSlider()',
      'var btnAngleIso = anglePresetRow.add("button", undefined, "Isometric (120/120)")',
      'var btnAngleDi = anglePresetRow.add("button", undefined, "Dimetric (110/110)")',
      'var btnAngleTri = anglePresetRow.add("button", undefined, "Trimetric (120/105)")',
      'angleR: sldAngleR.value',
      'angleL: sldAngleL.value',
      'depthPercent: sldDepth.value',
      'function configureGradients(grads, o)',
      'var radOneCell = pnlCells.add("radiobutton", undefined, "1셀")',
      'var radEightCells = pnlCells.add("radiobutton", undefined, "8셀 (2×2×2)")',
      'cellSpan: radEightCells.value ? 2 : 1',
      'var chkHiddenDashed = pnlLine.add("checkbox", undefined, "숨김선 점선 표시 (해제: 실선)")',
      'hiddenDashed: chkHiddenDashed.value && radOneCell.value',
      'chkHiddenDashed.enabled = chkMode[0].value && radOneCell.value',
      '&& o.hiddenDashed) line.strokeDashes = [3, 2]',
      'var radColor = pnlColor.add("radiobutton", undefined, "컬러")',
      'var radGray = pnlColor.add("radiobutton", undefined, "회색 음영")',
      'colorMode: radColor.value ? "color" : "gray"',
      'cutCenterGray: makeRadialGradient(doc, "CutGray", kColor(0), kColor(55), 13.3)',
      'isCorner ? [128, 128, 128] : [180, 180, 180]',
      'function latticePoints(key)',
      'function latticeSites(key, span)',
      'function atomSites(key, span, atomDiameterRatio, otherDiameterRatio)',
      'function siteRoleAtPoint(key, p)',
      'function cellEdgeSegments(span)',
      'function touchRatio(key)',
      'function otherTouchRatio(key)',
      'function screenPoint(p, edge, ox, oy)',
      'function drawNucleusLitSphere(parent, cx, cy, dia, o, grads, isCorner, brightOtherGray)',
      'isCorner ? grads.corner : grads.center',
      'brightOtherGray ? grads.cutCenterGray : grads.otherWireSphere',
      'var hx = cx - r * 0.35',
      'var hy = cy + r * 0.35',
      'var gradientRadius = r * 1.7',
      'drawSphere(parent, center[0], center[1], dia, o, grads, true, isCorner, false)',
      'function viewDepth(p)',
      'function convexHull(points)',
      'function cellSilhouette(edge, ox, oy, span)',
      'function cellBounds(edge, ox, oy, span)',
      'var d = viewDepth(p.p) - viewDepth(q.p)',
      'function clipPolygonToCell(poly, span)',
      'function addSphereSurface(faces, center, radius, baseColor, span)',
      'function addCutDisks(faces, center, radius, baseColor, span)',
      'function projectedHullFromFaces(faces, edge, ox, oy)',
      'function drawBezierHull(parent, hull, fillColor, o, useGradient)',
      'function drawCutCell(parent, key, o, ox, oy, edge, grads)',
      'function drawWireCell(parent, key, o, ox, oy, edge, grads)',
      'return a.site.moleculeOrder - b.site.moleculeOrder',
      'return p.moleculeOrder - q.moleculeOrder',
      'linkIodineSliders(sldCornerSphere, sldOtherSphere)',
      'linkIodineSliders(sldCornerBrightness, sldOtherBrightness)',
      'var startRole = siteRoleAtPoint(key, segments[e].a)',
      'Math.min(0.49, startRadius / screenLength)',
      'Math.min(0.49, endRadius / screenLength)',
      'depth: (viewDepth(a) + viewDepth(b)) / 2',
      'if (a.type !== b.type) return a.type === "line" ? -1 : 1',
      'atomRecords.sort(function(a, b)',
      'atomGroup.name = "CubicAtom_" + atomRecords[atomIndex].index',
      'isCorner ? [184, 52, 55] : [132, 168, 47]',
      'previewItems = [holder]',
      'CubicLattice_Preview',
    ];
    for (const token of required) {
      if (!source.includes(token)) {
        console.error(`${cubicLattice}: missing cubic-lattice token: ${token}`);
        failures++;
      }
    }
    if (source.includes("이온 결정 프리셋") || source.includes("selectOnlyLattice")) {
      console.error(`${cubicLattice}: duplicate ionic-crystal preset controls must not be present`);
      failures++;
    }

    const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
    const activeDocLine = lineOf(source, /app\.activeDocument/);
    if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
      console.error(`${cubicLattice}: app.documents.length guard must run before app.activeDocument`);
      failures++;
    }

    try {
      const arrayDeclaration = (name) => {
        const match = source.match(new RegExp(`var ${name} = \\[[\\s\\S]*?\\];`));
        if (!match) throw new Error(`missing array declaration: ${name}`);
        return match[0];
      };
      const declarations = [
        arrayDeclaration("CELL_CORNERS"),
        arrayDeclaration("CELL_EDGES"),
        arrayDeclaration("FACE_CENTERS"),
        extractFunction(source, "latticePoints"),
        extractFunction(source, "latticeSites"),
        extractFunction(source, "atomSites"),
        extractFunction(source, "siteRoleAtPoint"),
        extractFunction(source, "cellEdgeSegments"),
        extractFunction(source, "touchRatio"),
        extractFunction(source, "otherTouchRatio"),
        extractFunction(source, "setProjectionAngles"),
        extractFunction(source, "screenPoint"),
        extractFunction(source, "viewDepth"),
        extractFunction(source, "convexHull"),
        extractFunction(source, "dot3"),
        extractFunction(source, "normalize3"),
        extractFunction(source, "cross3"),
        extractFunction(source, "adjustedRgb"),
        extractFunction(source, "adjustedK"),
        extractFunction(source, "boundaryCount"),
        extractFunction(source, "clipPolygonAtPlane"),
        extractFunction(source, "clipPolygonToCell"),
      ].join("\n");
      const helpers = new Function(
        `var SCREEN_X = [0, 0, 0], SCREEN_Y = [0, 0, 0];\n` +
        `var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;\n` +
        `${declarations}\n` +
        `setProjectionAngles(131, 109, 100);\n` +
        `return {latticePoints, latticeSites, atomSites, siteRoleAtPoint, cellEdgeSegments, touchRatio, otherTouchRatio, setProjectionAngles, screenPoint, viewDepth, convexHull, adjustedRgb, adjustedK, boundaryCount, clipPolygonToCell, CELL_CORNERS, CELL_EDGES, projectionState: function () { return {SCREEN_X: SCREEN_X, SCREEN_Y: SCREEN_Y, VIEW: [VIEW_X, VIEW_Y, VIEW_Z]}; }};`
      )();

      assert.strictEqual(helpers.CELL_EDGES.length, 12, "unit cell must have 12 edges");
      assert.strictEqual(helpers.latticePoints("sc").length, 8, "simple cubic must have 8 lattice points");
      assert.strictEqual(helpers.latticePoints("bcc").length, 9, "body-centered cubic must add the cell center");
      assert.strictEqual(helpers.latticePoints("fcc").length, 14, "face-centered cubic must add 6 face centers");
      assert.strictEqual(helpers.latticePoints("cscl").length, 9, "CsCl cell must have corners and one body center");
      assert.strictEqual(helpers.latticePoints("nacl").length, 8, "one NaCl cell must use eight alternating corners");
      assert.strictEqual(helpers.latticePoints("i2").length, 14, "I2 molecular centers must use an FCC cell");
      assert.strictEqual(helpers.latticePoints("co2").length, 14, "CO2 molecular centers must use an FCC cell");
      assertClose(helpers.touchRatio("sc"), 1, "simple cubic contact diameter ratio");
      assertClose(helpers.touchRatio("bcc"), Math.sqrt(3) / 2, "body-centered contact diameter ratio");
      assertClose(helpers.touchRatio("fcc"), Math.sqrt(2) / 2, "face-centered contact diameter ratio");
      assertClose(helpers.touchRatio("cscl"), Math.sqrt(3) / 2, "CsCl nearest-neighbor contact ratio");
      assertClose(helpers.touchRatio("nacl"), 1, "NaCl corner-neighbor contact ratio");
      assertClose(helpers.touchRatio("i2"), 0.22, "I2 atom diameter ratio");
      assertClose(helpers.touchRatio("co2"), 0.22, "CO2 carbon diameter ratio");
      assertClose(helpers.otherTouchRatio("co2"), 0.16, "CO2 oxygen diameter ratio");

      assert.strictEqual(helpers.latticeSites("sc", 2).length, 27, "eight SC cells must share boundary sites");
      assert.strictEqual(helpers.latticeSites("bcc", 2).length, 35, "eight BCC cells must share 27 corners");
      assert.strictEqual(helpers.latticeSites("fcc", 2).length, 63, "eight FCC cells must deduplicate shared face sites");
      assert.strictEqual(helpers.latticeSites("cscl", 2).length, 35, "eight CsCl cells must share corner ions");
      assert.strictEqual(helpers.latticeSites("nacl", 2).length, 27, "eight NaCl cells must share a 3x3x3 corner grid");
      assert.strictEqual(helpers.latticeSites("i2", 1).length, 14, "one I2 cell must have 14 FCC molecular centers");
      assert.strictEqual(helpers.atomSites("i2", 1, 0.15).length, 28, "each I2 molecular center must expand to two atoms");
      assert.ok(
        helpers.atomSites("i2", 1, 0.15, 0.15).every((site) => site.role === 0),
        "I2 corner and face-center atoms must use one visual role"
      );
      const carbonDioxideAtoms = helpers.atomSites("co2", 1, 0.22, 0.16);
      assert.strictEqual(carbonDioxideAtoms.length, 42, "each CO2 molecular center must expand to three atoms");
      assert.strictEqual(
        carbonDioxideAtoms.filter((site) => site.role === 0).length,
        14,
        "each CO2 molecule must have one central carbon"
      );
      assert.strictEqual(
        carbonDioxideAtoms.filter((site) => site.role === 1).length,
        28,
        "each CO2 molecule must have two terminal oxygens"
      );
      const firstCarbonDioxide = carbonDioxideAtoms.slice(0, 3);
      assert.deepStrictEqual(
        firstCarbonDioxide.map((site) => site.moleculeOrder),
        [0, 1, 2],
        "CO2 z-order must be oxygen, carbon, oxygen"
      );
      const carbonOxygenDistance = Math.sqrt(
        firstCarbonDioxide[0].p.reduce(
          (sum, value, axis) => sum + Math.pow(value - firstCarbonDioxide[1].p[axis], 2),
          0
        )
      );
      assertClose(carbonOxygenDistance, 0.0988, "CO2 oxygens must overlap tightly with carbon");
      for (let axis = 0; axis < 3; axis++) {
        assertClose(
          (firstCarbonDioxide[0].p[axis] + firstCarbonDioxide[2].p[axis]) / 2,
          firstCarbonDioxide[1].p[axis],
          "CO2 carbon must lie midway between both oxygens"
        );
      }
      const projectedCarbonDioxide = firstCarbonDioxide.map((site) => helpers.screenPoint(site.p, 1, 0, 0));
      const projectedBondLengths = [0, 2].map((oxygenIndex) =>
        Math.hypot(
          projectedCarbonDioxide[oxygenIndex][0] - projectedCarbonDioxide[1][0],
          projectedCarbonDioxide[oxygenIndex][1] - projectedCarbonDioxide[1][1]
        )
      );
      assert.ok(
        projectedBondLengths.every((length) => length > 0.05),
        "both CO2 oxygens must remain visibly separated from carbon"
      );
      assertClose(
        helpers.viewDepth(firstCarbonDioxide[0].p),
        helpers.viewDepth(firstCarbonDioxide[1].p),
        "CO2 molecular axis must stay in the visible screen plane"
      );
      assertClose(
        helpers.viewDepth(firstCarbonDioxide[2].p),
        helpers.viewDepth(firstCarbonDioxide[1].p),
        "both CO2 oxygens must remain in the visible screen plane"
      );
      assert.strictEqual(
        helpers.latticeSites("nacl", 1).filter((site) => site.role === 0).length,
        4,
        "one NaCl cell must place four ions on alternating corners"
      );
      assert.strictEqual(
        helpers.latticeSites("nacl", 1).filter((site) => site.role === 1).length,
        4,
        "one NaCl cell must place the other four ions on alternating corners"
      );
      assert.strictEqual(helpers.cellEdgeSegments(1).length, 12, "one cell must draw 12 edge segments");
      assert.strictEqual(helpers.cellEdgeSegments(2).length, 54, "eight cells must draw the complete 2x2x2 grid");
      assert.deepStrictEqual(helpers.adjustedRgb([100, 150, 200], 100), [100, 150, 200], "100% must preserve RGB");
      assert.deepStrictEqual(helpers.adjustedRgb([100, 150, 200], 40), [40, 60, 80], "lower brightness must darken RGB");
      assert.deepStrictEqual(helpers.adjustedRgb([100, 150, 200], 160), [255, 255, 255], "maximum brightness must approach white");
      assertClose(helpers.adjustedK(80, 100), 80, "100% must preserve grayscale K");
      assertClose(helpers.adjustedK(80, 160), 0, "maximum grayscale brightness must reach K0");
      assertClose(helpers.adjustedK(0, 40), 90, "minimum grayscale brightness must reach K90");
      assertClose(helpers.adjustedK(15, 40), 90, "minimum flat-sphere brightness must reach K90");

      const projectedCorners = helpers.CELL_CORNERS.map((p) => helpers.screenPoint(p, 1, 0, 0));
      assert.strictEqual(
        helpers.convexHull(projectedCorners).length,
        6,
        "orthographic cube silhouette must be a hexagon"
      );
      const origin = helpers.screenPoint([0, 0, 0], 1, 0, 0);
      const opposite = helpers.screenPoint([1, 1, 1], 1, 0, 0);
      assert.ok(
        Math.hypot(opposite[0] - origin[0], opposite[1] - origin[1]) > 0.1,
        "three-quarter view must not collapse opposite corners"
      );
      assert.ok(helpers.viewDepth([1, 1, 1]) > helpers.viewDepth([0, 0, 0]), "camera depth must use all three axes");
      assert.ok(
        helpers.projectionState().VIEW.every((value) => value > 0),
        "valid corner angles must produce a positive three-axis camera depth"
      );
      helpers.setProjectionAngles(120, 120, 100);
      const isoOrigin = helpers.screenPoint([0, 0, 0], 1, 0, 0);
      const isoAxisLengths = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((axis) => {
        const projected = helpers.screenPoint(axis, 1, 0, 0);
        return Math.hypot(projected[0] - isoOrigin[0], projected[1] - isoOrigin[1]);
      });
      isoAxisLengths.forEach((length) => assertClose(length, 1, "isometric axes must have equal length"));
      helpers.setProjectionAngles(120, 120, 50);
      const compressedOrigin = helpers.screenPoint([0, 0, 0], 1, 0, 0);
      const compressedAxisLengths = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((axis) => {
        const projected = helpers.screenPoint(axis, 1, 0, 0);
        return Math.hypot(projected[0] - compressedOrigin[0], projected[1] - compressedOrigin[1]);
      });
      assertClose(compressedAxisLengths[0], 1, "depth ratio must preserve the near-face width axis");
      assertClose(compressedAxisLengths[1], 1, "depth ratio must preserve the vertical axis");
      assertClose(compressedAxisLengths[2], 0.5, "depth ratio must change only the near-to-far axis");
      helpers.setProjectionAngles(131, 109, 100);
      assert.strictEqual(helpers.boundaryCount([0, 0, 0]), 3, "corner atoms must touch three cell planes");
      assert.strictEqual(helpers.boundaryCount([0.5, 0.5, 0]), 1, "face atoms must touch one cell plane");
      assert.strictEqual(helpers.boundaryCount([0.5, 0.5, 0.5]), 0, "body atoms must not touch a cell plane");
      const clippedTriangle = helpers.clipPolygonToCell([
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 1.5, 0.5],
      ]);
      assert.ok(clippedTriangle.length >= 3, "cell clipping must retain the triangle portion inside the unit cell");
      assert.ok(
        clippedTriangle.every((point) => point.every((value) => value >= -1e-9 && value <= 1 + 1e-9)),
        "cell-clipped mesh vertices must stay inside the unit cell"
      );
      assert.deepStrictEqual(
        helpers.convexHull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]),
        [[0, 0], [2, 0], [2, 2], [0, 2]],
        "interior points must be dropped from the silhouette"
      );
    } catch (error) {
      console.error(`${cubicLattice}: executable lattice geometry regression failed: ${error.message}`);
      failures++;
    }
  }
}

{
  if (!exists(graphiteCrystal)) {
    console.error(`${graphiteCrystal}: graphite-crystal script is missing`);
    failures++;
  } else {
    const source = read(graphiteCrystal);
    const required = [
      'new Window("dialog", "흑연 결정 구조 생성기")',
      'function generateHoneycombSheet(columns, rows, shiftX, shiftZ)',
      'function buildGraphiteGeometry(columns, rows, layerCount, layerGapRatio, stacking, interlayer)',
      'radAB = pnlStack.add("radiobutton", undefined, "AB 적층 (흑연)")',
      'radAA = pnlStack.add("radiobutton", undefined, "AA 적층")',
      'var chkInterlayer = pnlOptions.add("checkbox", undefined, "층간 점선")',
      'var chkLit3D = pnlOptions.add("checkbox", undefined, "구 3D 조명 효과")',
      'var chkOutline = pnlOptions.add("checkbox", undefined, "구 외곽선")',
      'var sldColumns = addSlider(pnlGeometry, "가로 육각형", 1, 10, 4',
      'var sldRows = addSlider(pnlGeometry, "세로 육각형", 1, 8, 3',
      'var sldLayers = addSlider(pnlGeometry, "적층 수", 1, 8, 3',
      'var sldBond = addSlider(pnlGeometry, "C-C 결합 길이", 2, 15, 6',
      'var sldLayerGap = addSlider(pnlGeometry, "층간 거리", 3, 35, 14',
      'var sldAtom = addSlider(pnlGeometry, "탄소 구 지름", 1, 12, 4',
      'var sldBrightness = addSlider(pnlGeometry, "탄소 밝기", 40, 160, 100',
      'var sldAngleR = addSlider(pnlView, "오른쪽 각도", 91, 179, 132',
      'var sldAngleL = addSlider(pnlView, "왼쪽 각도", 91, 179, 108',
      'var sldDepth = addSlider(pnlView, "앞·뒤 면 거리", 40, 160, 100',
      'record.interlayer ? kColor(65) : kColor(100)',
      'if (record.interlayer) line.strokeDashes = [3, 2]',
      'holder.name = "GraphiteCrystal_Preview"',
      'var PREF_KEY = "GraphiteCrystalMaker/settings"',
      'drawGraphite(collectOptions(), app.activeDocument.activeLayer)',
    ];
    for (const token of required) {
      if (!source.includes(token)) {
        console.error(`${graphiteCrystal}: missing graphite-crystal token: ${token}`);
        failures++;
      }
    }

    const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
    const activeDocLine = lineOf(source, /app\.activeDocument/);
    if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
      console.error(`${graphiteCrystal}: app.documents.length guard must run before app.activeDocument`);
      failures++;
    }

    try {
      const declarations = [
        extractFunction(source, "pointKey"),
        extractFunction(source, "generateHoneycombSheet"),
        extractFunction(source, "buildGraphiteGeometry"),
      ].join("\n");
      const helpers = new Function(
        `var SQRT3 = Math.sqrt(3);\n${declarations}\n` +
        `return {generateHoneycombSheet, buildGraphiteGeometry};`
      )();

      const singleHexagon = helpers.generateHoneycombSheet(1, 1, 0, 0);
      assert.strictEqual(singleHexagon.atoms.length, 6, "one graphite hexagon must have six carbon atoms");
      assert.strictEqual(singleHexagon.bonds.length, 6, "one graphite hexagon must have six C-C bonds");

      const fusedHexagons = helpers.generateHoneycombSheet(2, 1, 0, 0);
      assert.strictEqual(fusedHexagons.atoms.length, 10, "two fused hexagons must share two carbon atoms");
      assert.strictEqual(fusedHexagons.bonds.length, 11, "two fused hexagons must share one C-C bond");
      const fusedKeys = new Set(fusedHexagons.atoms.map((atom) => atom.key));
      assert.strictEqual(fusedKeys.size, fusedHexagons.atoms.length, "graphite sheet atoms must be deduplicated");
      for (const bond of fusedHexagons.bonds) {
        const a = fusedHexagons.atoms[bond.a];
        const b = fusedHexagons.atoms[bond.b];
        assertClose(Math.hypot(a.x - b.x, a.z - b.z), 1, "all in-layer C-C bonds must have unit length");
      }

      const baseSheet = helpers.generateHoneycombSheet(2, 2, 0, 0);
      const aaGeometry = helpers.buildGraphiteGeometry(2, 2, 3, 2.4, "AA", true);
      assert.strictEqual(
        aaGeometry.atoms.length,
        baseSheet.atoms.length * 3,
        "three graphite layers must repeat the complete sheet"
      );
      assert.strictEqual(
        aaGeometry.bonds.filter((bond) => bond.interlayer).length,
        baseSheet.atoms.length * 2,
        "AA stacking must align every atom between adjacent layers"
      );
      const abGeometry = helpers.buildGraphiteGeometry(2, 2, 3, 2.4, "AB", true);
      const abInterlayerCount = abGeometry.bonds.filter((bond) => bond.interlayer).length;
      assert.ok(abInterlayerCount > 0, "AB stacking must retain aligned interlayer sites");
      assert.ok(
        abInterlayerCount < baseSheet.atoms.length * 2,
        "AB stacking must align fewer atoms than AA stacking"
      );
      const noInterlayer = helpers.buildGraphiteGeometry(2, 2, 3, 2.4, "AB", false);
      assert.strictEqual(
        noInterlayer.bonds.filter((bond) => bond.interlayer).length,
        0,
        "disabling interlayer lines must remove all vertical dashed bonds"
      );
    } catch (error) {
      console.error(`${graphiteCrystal}: executable graphite geometry regression failed: ${error.message}`);
      failures++;
    }
  }
}

{
  if (!exists(diamondCrystal)) {
    console.error(`${diamondCrystal}: diamond-crystal script is missing`);
    failures++;
  } else {
    const source = read(diamondCrystal);
    const required = [
      'new Window("dialog", "다이아몬드 결정 구조 생성기")',
      'var DIAMOND_NEIGHBOR_DISTANCE = Math.sqrt(3) / 4',
      'function diamondSites(span)',
      'function diamondBonds(sites)',
      'function cellEdgeSegments(span)',
      'var radOneCell = pnlCell.add("radiobutton", undefined, "1셀")',
      'var radEightCells = pnlCell.add("radiobutton", undefined, "8셀 (2×2×2)")',
      'var radPyramid = pnlCell.add("radiobutton", undefined, "피라미드 클러스터")',
      'var chkCell = pnlDisplay.add("checkbox", undefined, "단위세포 라인")',
      'var chkBonds = pnlDisplay.add("checkbox", undefined, "C-C 결합선")',
      'var chkCompleteBoundary = pnlDisplay.add("checkbox", undefined, "경계 결합 완성")',
      'var chkHiddenDashed = pnlDisplay.add("checkbox", undefined, "숨김선 점선 (해제: 실선)")',
      'var sldCell = addSlider(pnlSize, "셀 한 변", 8, 80, 28',
      'pyramidInfoRow.add("statictext", undefined, "3층 (고정)")',
      'var sldAtom = addSlider(pnlSize, "탄소 구 지름", 1, 12, 4',
      'var sldBondWidth = addSlider(pnlSize, "결합선 굵기", 0.1, 2, 0.5',
      'var sldBrightness = addSlider(pnlSize, "탄소 밝기", 40, 160, 100',
      'var sldAngleR = addSlider(pnlView, "오른쪽 각도", 91, 179, 131',
      'var sldAngleL = addSlider(pnlView, "왼쪽 각도", 91, 179, 109',
      'var sldDepth = addSlider(pnlView, "앞·뒤 면 거리", 40, 160, 100',
      'hiddenDashed: chkHiddenDashed.value && (radOneCell.value || radPyramid.value)',
      'function completeDiamondNetwork(span)',
      'function diamondPyramidGeometry(levels)',
      'holder.name = "DiamondCrystal_Preview"',
      'var PREF_KEY = "DiamondCrystalMaker/settings"',
      'drawDiamond(collectOptions(), app.activeDocument.activeLayer)',
    ];
    for (const token of required) {
      if (!source.includes(token)) {
        console.error(`${diamondCrystal}: missing diamond-crystal token: ${token}`);
        failures++;
      }
    }

    const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
    const activeDocLine = lineOf(source, /app\.activeDocument/);
    if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
      console.error(`${diamondCrystal}: app.documents.length guard must run before app.activeDocument`);
      failures++;
    }

    try {
      const basisMatch = source.match(/var DIAMOND_BASIS = \[[\s\S]*?\n    \];/);
      if (!basisMatch) throw new Error("missing diamond basis declaration");
      const declarations = [
        basisMatch[0],
        extractFunction(source, "coordinateKey"),
        extractFunction(source, "diamondSitesInBounds"),
        extractFunction(source, "diamondSites"),
        extractFunction(source, "diamondBonds"),
        extractFunction(source, "completeDiamondNetwork"),
        extractFunction(source, "diamondPyramidGeometry"),
        extractFunction(source, "cellEdgeSegments"),
      ].join("\n");
      const helpers = new Function(
        `var DIAMOND_NEIGHBOR_DISTANCE = Math.sqrt(3) / 4;\n${declarations}\n` +
        `return {diamondSites, diamondBonds, completeDiamondNetwork, diamondPyramidGeometry, cellEdgeSegments};`
      )();

      const oneCellSites = helpers.diamondSites(1);
      const oneCellBonds = helpers.diamondBonds(oneCellSites);
      assert.strictEqual(oneCellSites.length, 18, "one diamond cell must include 14 FCC boundary atoms and 4 internal atoms");
      assert.strictEqual(oneCellBonds.length, 16, "one diamond cell must contain sixteen internal nearest-neighbor bonds");
      assert.strictEqual(
        new Set(oneCellSites.map((site) => site.key)).size,
        oneCellSites.length,
        "diamond atoms shared by periodic cells must be deduplicated"
      );
      for (const bond of oneCellBonds) {
        const a = oneCellSites[bond.a].p;
        const b = oneCellSites[bond.b].p;
        assertClose(
          Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
          Math.sqrt(3) / 4,
          "diamond bonds must use the tetrahedral nearest-neighbor distance"
        );
      }
      const internalAtoms = oneCellSites
        .map((site, index) => ({ site, index }))
        .filter(({ site }) => site.p.every((value) => value > 0 && value < 1));
      assert.strictEqual(internalAtoms.length, 4, "one diamond cell must contain four internal tetrahedral atoms");
      for (const { index } of internalAtoms) {
        assert.strictEqual(
          oneCellBonds.filter((bond) => bond.a === index || bond.b === index).length,
          4,
          "each internal diamond carbon must have four tetrahedral bonds"
        );
      }
      const completedCell = helpers.completeDiamondNetwork(1);
      const completedIndexByKey = new Map(
        completedCell.sites.map((site, index) => [site.key, index])
      );
      for (const coreSite of oneCellSites) {
        const completedIndex = completedIndexByKey.get(coreSite.key);
        assert.notStrictEqual(completedIndex, undefined, "completed diamond network must retain every cell atom");
        assert.strictEqual(
          completedCell.bonds.filter(
            (bond) => bond.a === completedIndex || bond.b === completedIndex
          ).length,
          4,
          "boundary completion must give every unit-cell carbon four nearest neighbors"
        );
      }

      const pyramid = helpers.diamondPyramidGeometry(3);
      assert.strictEqual(pyramid.sites.length, 14, "three-layer diamond pyramid must contain 1 + 1 + 3 + 3 + 6 atoms");
      assert.strictEqual(pyramid.bonds.length, 16, "three-layer diamond pyramid must connect all adjacent carbon rows");
      assert.deepStrictEqual(
        [...new Set(pyramid.sites.map((site) => site.tier))].sort(),
        [0, 1, 2],
        "diamond pyramid must contain exactly three atomic layers"
      );
      assert.deepStrictEqual(
        [0, 1, 2, 3, 4].map(
          (row) => pyramid.sites.filter((site) => site.row === row).length
        ),
        [1, 1, 3, 3, 6],
        "diamond pyramid rows must follow the requested 1-1-3-3-6 arrangement"
      );
      const pyramidDegrees = pyramid.sites.map((site, index) =>
        pyramid.bonds.filter((bond) => bond.a === index || bond.b === index).length
      );
      assert.strictEqual(pyramidDegrees[0], 1, "diamond pyramid apex must connect to the upper center");
      assert.strictEqual(pyramidDegrees[1], 4, "upper-center carbon must connect to apex and three lower carbons");
      assert.ok(
        pyramid.sites
          .map((site, index) => ({ site, degree: pyramidDegrees[index] }))
          .filter(({ site }) => site.row === 2)
          .every(({ degree }) => degree === 2),
        "three upper lower-row carbons must bridge the two tetrahedral levels"
      );
      assert.ok(
        pyramid.sites
          .map((site, index) => ({ site, degree: pyramidDegrees[index] }))
          .filter(({ site }) => site.row === 3)
          .every(({ degree }) => degree === 4),
        "three lower-center carbons must each have four bonds"
      );
      assert.ok(
        pyramid.sites
          .map((site, index) => ({ site, degree: pyramidDegrees[index] }))
          .filter(({ site }) => site.row === 4)
          .every(({ degree }) => degree === 1 || degree === 2),
        "finite pyramid boundary carbons may terminate with one or two bonds"
      );
      for (const bond of pyramid.bonds) {
        const a = pyramid.sites[bond.a].p;
        const b = pyramid.sites[bond.b].p;
        assertClose(
          Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
          Math.sqrt(3) / 4,
          "diamond pyramid must preserve tetrahedral nearest-neighbor bonds"
        );
      }

      const eightCellSites = helpers.diamondSites(2);
      const eightCellBonds = helpers.diamondBonds(eightCellSites);
      assert.strictEqual(eightCellSites.length, 95, "eight diamond cells must deduplicate shared boundary atoms");
      assert.strictEqual(eightCellBonds.length, 128, "eight diamond cells must contain all internal nearest-neighbor bonds");
      assert.strictEqual(helpers.cellEdgeSegments(1).length, 12, "one diamond cell must draw twelve frame edges");
      assert.strictEqual(helpers.cellEdgeSegments(2).length, 54, "eight diamond cells must draw the complete 2x2x2 frame");
    } catch (error) {
      console.error(`${diamondCrystal}: executable diamond geometry regression failed: ${error.message}`);
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
  const source = read("setup-mac.command");
  if (!source.includes("$.evalFile(new File(") ||
      !source.includes(`find "$dir" -maxdepth 1 -type f -name '*.jsx' -delete`) ||
      !source.includes("sudo chown -R")) {
    console.error("setup-mac.command: must register scripts as stubs and handle app-folder permissions");
    failures++;
  }
  if (!source.includes('TARGET_DIR="$APP_DIR/Presets.localized/ko_KR/스크립트"')) {
    console.error("setup-mac.command: must prefer Korean localized Illustrator script folder");
    failures++;
  }
  if (!source.includes('KYS_NAME="cjh250907.kys"') ||
      !source.includes('ARROW_NAME="화살표.ai"') ||
      !source.includes('WIDTH_PROFILE_NAME="폭속성1.txt"') ||
      !source.includes('SETTINGS_BASE="$HOME/Library/Preferences/Adobe Illustrator $VER Settings"') ||
      !source.includes('"$APP_DIR/Support Files/Resources/ko_KR"') ||
      !source.includes('"$APP_DIR/Support Files/Required/Resources/ko_KR"')) {
    console.error("setup-mac.command: must install shortcuts, arrows and the width profile");
    failures++;
  }
}

{
  const source = read("setup-windows.ps1");
  const bytes = readBuffer("setup-windows.ps1");
  if (!source.includes("Adobe Illustrator*") || !source.includes("Remove-Item") || !source.includes("Copy-Item")) {
    console.error("setup-windows.ps1: must find Illustrator and replace managed folders");
    failures++;
  }
  if (!source.includes("InstallLocation") || !source.includes("Microsoft\\Windows\\CurrentVersion\\Uninstall")) {
    console.error("setup-windows.ps1: must find Illustrator from Windows installed-app registry entries");
    failures++;
  }
  if (!source.includes("Join-Path $Root \"Adobe\"")) {
    console.error("setup-windows.ps1: must search the common Program Files Adobe subfolder");
    failures++;
  }
  if (!source.includes("#Requires -Version 5.1")) {
    console.error("setup-windows.ps1: must explicitly support Windows PowerShell 5.1 or newer");
    failures++;
  }
  if (/Write-Host\s+"완료\.[\s\S]*?Read-Host\s+"Enter 키를 누르면 닫습니다"/.test(source)) {
    console.error("setup-windows.ps1: successful updates must close without waiting for Enter");
    failures++;
  }
  if (bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) {
    console.error("setup-windows.ps1: must be saved as UTF-8 with BOM for Windows PowerShell 5.1 Korean paths");
    failures++;
  }
}

{
  const source = read("setup-windows.cmd");
  const bytes = readBuffer("setup-windows.cmd");
  if (!source.includes("powershell.exe") ||
      !source.includes("-ExecutionPolicy Bypass") ||
      !source.includes("-File \"%SCRIPT_DIR%setup-windows.ps1\"")) {
    console.error("setup-windows.cmd: must launch the PowerShell setup by double-click");
    failures++;
  }
  if (!bytes.includes(Buffer.from("\r\n")) || bytes.includes(Buffer.from("@echo off\n"))) {
    console.error("setup-windows.cmd: must use CRLF line endings for cmd.exe");
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

{
  const source = read(phospholipid);
  const required = [
    'var PREF_KEY = "ObjectPhospholipidBilayer/settings"',
    'new Window("dialog", "인지질 2중층")',
    'footer.add("checkbox", undefined, "미리보기")',
    'addNumberField(spacingPanel, "선과의 거리", "mm", gapMm, 0.1, 0, 20)',
    'addNumberField(spacingPanel, "인지질 간격", "mm", spacingMm, 0.1, 0.2, 30)',
    'function pickLineAndUnit(selection)',
    'function getPlacementDistances(totalLength, spacing, closed, maxCount)',
    'function unitAngleDegrees(dirX, dirY)',
    'function offsetPolylineLengths(metrics, offset, bendDeadzone)',
    'function getBendDeadzone(signedOffset)',
    'label.preferredSize.width = LABEL_WIDTH',
    'unitLabel.preferredSize.width = UNIT_WIDTH',
    'input.preferredSize.width = INPUT_WIDTH',
    'down.preferredSize.width = STEP_BUTTON_WIDTH',
    'up.preferredSize.width = STEP_BUTTON_WIDTH',
    'addNumberField(spacingPanel, "보정 시작 반지름", "mm", startRadiusMm, 1, 1, 200)',
    'function unitTangentAt(samples, index)',
    'function centerDistanceAt(metrics, lengths, offsetLength)',
    'addNumberField(spacingPanel, "곡선 보정", "%", curvatureFixPercent, 5, 0, 100)',
    'placeLayer(group, getLayerDistances(measureOffset), 1, centerOffset)',
    'placeLayer(group, getLayerDistances(-measureOffset), -1, centerOffset)',
    'copy.rotate(angle, true, true, true, true, Transformation.CENTER)',
    'linePath.remove()',
    'unitItem.remove()',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${phospholipid}: missing bilayer control or placement token: ${token}`);
      failures++;
    }
  }

  const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
  const activeDocLine = lineOf(source, /app\.activeDocument/);
  if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
    console.error(`${phospholipid}: app.documents.length guard must run before app.activeDocument`);
    failures++;
  }

  const showLine = lineOf(source, /var\s+result\s*=\s*dlg\.show\(\)/);
  const savePrefCallLine = lineOf(source, /^\s*saveSettings\(\);/m);
  if (showLine < 1 || savePrefCallLine < 1 || savePrefCallLine < showLine) {
    console.error(`${phospholipid}: preferences must be saved on confirm only`);
    failures++;
  }

  if (!/if\s*\(path\.closed\s*&&\s*points\.length\s*>\s*2\)/.test(source)) {
    console.error(`${phospholipid}: closed paths must include the segment back to the first anchor`);
    failures++;
  }

  try {
    const helpers = extractWeatherFrontHelpers(source, [
      "getCubicSegments",
      "pointFromArray",
      "cubicPoint",
      "cubicDerivative",
      "sampleDirection",
      "distanceBetween",
      "clampValue",
      "buildPathMetrics",
      "getFrameAtLength",
      "getPlacementDistances",
      "unitAngleDegrees",
      "offsetPolylineLengths",
      "centerDistanceAt",
      "unitTangentAt",
    ]);

    const straightPath = {
      closed: false,
      pathPoints: [
        {anchor: [0, 0], rightDirection: [10 / 3, 0]},
        {anchor: [10, 0], leftDirection: [20 / 3, 0]},
      ],
    };
    const metrics = helpers.buildPathMetrics(straightPath, 60);
    const frame = helpers.getFrameAtLength(metrics, 5);
    assertClose(metrics.totalLength, 10, "bilayer straight path length");
    assertClose(frame.nx, 0, "bilayer left normal x");
    assertClose(frame.ny, 1, "bilayer left normal y");

    // 원본의 위쪽이 바깥을 향해야 하므로, 위층은 그대로 두고 아래층만 뒤집힌다.
    assertClose(helpers.unitAngleDegrees(frame.nx, frame.ny), 0, "upper layer keeps the original heading");
    assertClose(helpers.unitAngleDegrees(-frame.nx, -frame.ny), 180, "lower layer flips the original heading");
    assertClose(helpers.unitAngleDegrees(1, 0), -90, "rightward normal turns the unit clockwise");
    assertClose(helpers.unitAngleDegrees(-1, 0), 90, "leftward normal turns the unit counterclockwise");

    const exact = helpers.getPlacementDistances(10, 2, false, 300);
    assert.deepStrictEqual(exact, [0, 2, 4, 6, 8, 10], "an exact fit must reach both ends of an open path");

    const leftover = helpers.getPlacementDistances(10, 3, false, 300);
    assert.strictEqual(leftover.length, 4, "an open path must hold every whole spacing step");
    assertClose(leftover[0], 0.5, "leftover length must be split evenly between both ends");
    assertClose(leftover[3], 9.5, "leftover length must be split evenly between both ends");

    const ring = helpers.getPlacementDistances(10, 3, true, 300);
    assert.strictEqual(ring.length, 3, "a closed path must divide its perimeter into whole steps");
    assertClose(ring[1], 10 / 3, "closed spacing must stretch to close the seam");
    assertClose(ring[2], 20 / 3, "closed spacing must stretch to close the seam");

    assert.strictEqual(
      helpers.getPlacementDistances(1000, 0.1, false, 300).length,
      300,
      "a too-small spacing must stop at the per-layer cap"
    );

    // 직선에서는 어느 쪽으로 밀어내도 평행 곡선 길이가 같으므로 두 층의 개수도 같아야 한다.
    const straightOuter = helpers.offsetPolylineLengths(metrics, 3, 0);
    const straightInner = helpers.offsetPolylineLengths(metrics, -3, 0);
    assertClose(straightOuter[straightOuter.length - 1], 10, "a straight offset curve keeps the centerline length");
    assertClose(straightInner[straightInner.length - 1], 10, "a straight offset curve keeps the centerline length");

    // 반지름 10의 사분원(왼쪽 법선이 원 중심을 향한다).
    // 안쪽 층은 반지름 7, 바깥쪽 층은 반지름 13의 호 길이를 따라야 한다.
    const KAPPA = 0.5522847498;
    const arcPath = {
      closed: false,
      pathPoints: [
        {anchor: [10, 0], rightDirection: [10, 10 * KAPPA]},
        {anchor: [0, 10], leftDirection: [10 * KAPPA, 10]},
      ],
    };
    const arcMetrics = helpers.buildPathMetrics(arcPath, 200);
    const towardCenter = helpers.offsetPolylineLengths(arcMetrics, 3, 0);
    const awayFromCenter = helpers.offsetPolylineLengths(arcMetrics, -3, 0);
    const innerLength = towardCenter[towardCenter.length - 1];
    const outerLength = awayFromCenter[awayFromCenter.length - 1];
    assertNear(arcMetrics.totalLength, Math.PI * 10 / 2, 0.01, "quarter arc centerline length");
    assertNear(innerLength, Math.PI * 7 / 2, 0.05, "inner leaflet must follow the radius 7 arc");
    assertNear(outerLength, Math.PI * 13 / 2, 0.05, "outer leaflet must follow the radius 13 arc");
    assert.ok(
      helpers.getPlacementDistances(outerLength, 2, false, 300).length >
        helpers.getPlacementDistances(innerLength, 2, false, 300).length,
      "the outer leaflet must take more units than the inner one around a bend"
    );

    // 곡률 반지름보다 깊게 밀어내도 층이 통째로 사라지지 않아야 한다(되접힘 구간은 최소 비율로 눌린다).
    const folded = helpers.offsetPolylineLengths(arcMetrics, 12, 0)[arcMetrics.samples.length - 1];
    assert.ok(
      folded > arcMetrics.totalLength * 0.14 && folded < arcMetrics.totalLength * 0.2,
      `an offset deeper than the radius must fall back to the minimum step factor, got ${folded}`
    );

    // 데드존: 굽이 정도(offset / 곡률반지름)가 데드존 이하면 직선과 똑같이 잰다.
    // 반지름 10 호에 offset 3이면 bend는 0.3이므로, 데드존 0.3에서 두 층 모두 중심선 길이가 된다.
    const damped = helpers.offsetPolylineLengths(arcMetrics, 3, 0.3);
    const dampedOuter = helpers.offsetPolylineLengths(arcMetrics, -3, 0.3);
    assertNear(
      damped[damped.length - 1],
      arcMetrics.totalLength,
      0.05,
      "a bend inside the deadzone must measure like a straight run"
    );
    assertNear(
      dampedOuter[dampedOuter.length - 1],
      arcMetrics.totalLength,
      0.05,
      "a bend inside the deadzone must measure like a straight run"
    );
    assert.strictEqual(
      helpers.getPlacementDistances(damped[damped.length - 1], 2, false, 300).length,
      helpers.getPlacementDistances(dampedOuter[dampedOuter.length - 1], 2, false, 300).length,
      "both leaflets must take the same count inside the deadzone"
    );

    // 데드존을 넘어서면 넘은 만큼만 보정된다(전부 아니면 전무가 아니다).
    const partial = helpers.offsetPolylineLengths(arcMetrics, 3, 0.1);
    assert.ok(
      partial[partial.length - 1] > innerLength &&
        partial[partial.length - 1] < arcMetrics.totalLength,
      `past the deadzone only the excess bend may be corrected, got ${partial[partial.length - 1]}`
    );

    // 평행 곡선 위의 길이는 같은 샘플의 중심선 길이로 되돌아와야 한다.
    assertClose(helpers.centerDistanceAt(arcMetrics, awayFromCenter, 0), 0, "offset start maps back to the path start");
    assertClose(
      helpers.centerDistanceAt(arcMetrics, awayFromCenter, outerLength),
      arcMetrics.totalLength,
      "offset end maps back to the path end"
    );
    assertNear(
      helpers.centerDistanceAt(arcMetrics, awayFromCenter, outerLength / 2),
      arcMetrics.totalLength / 2,
      0.02,
      "a constant-radius arc must map the halfway point back to the halfway point"
    );
  } catch (error) {
    console.error(`${phospholipid}: executable bilayer placement regression failed: ${error.message}`);
    failures++;
  }
}

// 다이얼로그 스텝 버튼(◀ ▶ 0)은 좁히면 macOS 둥근 모서리가 맞붙어 타원처럼 보인다.
{
  const scriptFiles = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
      const next = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.name.endsWith(".jsx")) scriptFiles.push(next);
    }
  };
  walk("스크립트");

  for (const file of scriptFiles) {
    const source = read(file);
    if (source.includes('add("button", undefined, "◀")') && !/var\s+STEP_BUTTON_WIDTH\s*=\s*34;/.test(source)) {
      console.error(`${file}: step buttons must size themselves from STEP_BUTTON_WIDTH = 34`);
      failures++;
    }

    const buttonNames = new Set();
    const declaration = /(?:var\s+)?(\w+)\s*=\s*[\w.]+\.add\("button"/g;
    let match;
    while ((match = declaration.exec(source)) !== null) buttonNames.add(match[1]);

    const sizing = /(\w+)\.preferredSize\.width\s*=\s*(\d+)\s*;/g;
    while ((match = sizing.exec(source)) !== null) {
      if (!buttonNames.has(match[1])) continue;
      if (Number(match[2]) >= 30) continue;
      console.error(`${file}: button ${match[1]} is ${match[2]}px wide; under 30px the rounded ends meet and it renders as an ellipse`);
      failures++;
    }
  }
}

process.exit(failures === 0 ? 0 : 1);
