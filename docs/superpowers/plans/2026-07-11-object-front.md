# Object Front Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Illustrator script that turns one selected open path into an editable warm, cold, stationary, or occluded weather front.

**Architecture:** Keep ScriptUI, preview lifecycle, cubic metrics, symbol drawing, color conversion, and stationary-front subdivision in one standalone ExtendScript file, matching neighboring object scripts. Cache source metrics once; preview updates rebuild generated artwork only.

**Tech Stack:** Adobe Illustrator ExtendScript, ScriptUI, Node.js static safety checks

## Global Constraints

- File: `스크립트/01_도형/Object_front.jsx`; dialog: `오브젝트 전선`.
- Input: exactly one unlocked, editable, open `PathItem`.
- Shape: default `2mm`, range `0.5..20mm`, step `0.1mm`.
- Gap: default `2mm`, range `0..20mm`, step `0.1mm`.
- Stroke: default `0.5pt`, range `0.1..10pt`, step `0.1pt`.
- Standard colors: warm `#FF0000`, cold `#0000FF`, stationary red/blue, occluded `#7030A0`.
- K mode: `10K` steps, `0K..100K`; Hex: optional `#` plus six digits.
- Default symbols use path left normal; reversal negates normal.
- Cancellation restores source; confirmation removes source only after final creation succeeds.
- Output remains editable vector artwork grouped as `Weather Front`.

---

### Task 1: Script shell, controls, and preview lifecycle

**Files:**
- Create: `스크립트/01_도형/Object_front.jsx`
- Modify: `tests/check-script-safety.js`

**Interfaces:**
- Consumes: Illustrator active document and selected path.
- Produces: dialog state, synchronized controls, `updatePreview()`, `clearPreview()`, `createWeatherFront()`.

- [ ] **Step 1: Add failing shell/UI regression checks**

Add `const weatherFront = "스크립트/01_도형/Object_front.jsx";` and require:

```javascript
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
];
```

Fail when file is missing, a token is absent, document guard follows `app.activeDocument`, or source removal precedes final creation.

- [ ] **Step 2: Run RED**

Run: `node tests/check-script-safety.js`

Expected: FAIL because `Object_front.jsx` is absent.

- [ ] **Step 3: Create validated ScriptUI shell**

Start with:

```javascript
(function() {
    if (app.documents.length === 0) { alert("문서를 열고 열린 패스를 선택해주세요."); return; }
    var doc = app.activeDocument;
    var source = getSelectedOpenPath(doc.selection);
    if (source === null) { alert("잠기지 않은 열린 패스 하나만 선택해주세요."); return; }
    var MM_TO_PT = 2.83464567;
    var shapeSizeMm = 2;
    var gapMm = 2;
    var strokeWidthPt = 0.5;
    var frontType = "warm";
    var reversed = false;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;
```

Build panels in spec order. Implement `addNumericControl(parent,label,value,min,max,step,unit)` returning `{input,slider,step,minimum,maximum}`. Implement `bindNumericControl()` so sliders round to step, valid typing previews, and invalid final input restores/clamps.

Use lifecycle:

```javascript
source.hidden = true;
source.selected = false;
updatePreview();
var result = dlg.show();
clearPreview();
if (result === 1) {
    source.hidden = false;
    var finalGroup = createWeatherFront(false);
    finalGroup.name = "Weather Front";
    try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
    source.remove();
    doc.selection = null;
    finalGroup.selected = true;
} else {
    source.hidden = sourceWasHidden;
    source.selected = true;
}
```

Initially `createWeatherFront()` creates a group and duplicates source into it. `updatePreview()` removes previous preview, skips when disabled, creates/names preview, and redraws.

- [ ] **Step 4: Verify GREEN and commit**

```bash
node tests/check-script-safety.js
node --check < '스크립트/01_도형/Object_front.jsx'
git diff --check
git add tests/check-script-safety.js '스크립트/01_도형/Object_front.jsx'
git commit -m "feat: add weather front dialog shell"
```

Expected: checks exit `0`; commit succeeds.

---

### Task 2: Cached path metrics and symbol geometry

**Files:**
- Modify: `스크립트/01_도형/Object_front.jsx`
- Modify: `tests/check-script-safety.js`

**Interfaces:**
- Consumes: source and layout state from Task 1.
- Produces: `pathMetrics`, `buildPathMetrics()`, `getFrameAtLength()`, `drawSemicircle()`, `drawTriangle()`.

- [ ] **Step 1: Add failing geometry checks**

Require:

```javascript
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
```

Reject parameter-index spacing as sole placement logic.

- [ ] **Step 2: Run RED**

Run: `node tests/check-script-safety.js`

Expected: FAIL listing missing metric and symbol functions.

- [ ] **Step 3: Implement cubic metrics**

Each sample is `{distance,segmentIndex,t,x,y}`. Sample every source cubic at 80 subdivisions, omit duplicate starts, accumulate Euclidean distance. `getFrameAtLength()` binary-searches samples, interpolates local `t`, evaluates exact cubic position/derivative, and returns:

```javascript
{
    x: point.x, y: point.y,
    tx: dx / magnitude, ty: dy / magnitude,
    nx: -dy / magnitude, ny: dx / magnitude,
    segmentIndex: segmentIndex, t: t
}
```

Near-zero derivatives use neighboring sample direction.

- [ ] **Step 4: Implement symbol paths and type rules**

`drawTriangle()`: two tangent base points plus normal apex at `sqrt(3)*size/2`. `drawSemicircle()`: same base endpoints and two cubic quarter arcs using `0.5522847498`.

Placement:

```javascript
var shapeSize = shapeSizeMm * MM_TO_PT;
var gap = gapMm * MM_TO_PT;
var unitLength = shapeSize + gap;
var normalSign = reversed ? -1 : 1;
var centerDistance = shapeSize / 2 + index * unitLength;
```

Loop while complete symbol fits. Warm uses semicircle/default side; cold triangle/default side; stationary alternates semicircle/default and triangle/opposite; occluded alternates both on default side. Alert `선택한 패스가 도형 크기보다 짧습니다.` when none fits.

- [ ] **Step 5: Verify GREEN and commit**

```bash
node tests/check-script-safety.js
node --check < '스크립트/01_도형/Object_front.jsx'
git diff --check
git add tests/check-script-safety.js '스크립트/01_도형/Object_front.jsx'
git commit -m "feat: place weather symbols along paths"
```

Expected: checks exit `0`; commit succeeds.

---

### Task 3: Color modes and stationary Bezier baseline

**Files:**
- Modify: `스크립트/01_도형/Object_front.jsx`
- Modify: `tests/check-script-safety.js`

**Interfaces:**
- Consumes: centers and source cubic geometry from Task 2.
- Produces: color controls/conversion, `splitCubic()`, `extractCubicRange()`, `drawStationaryBaseline()`.

- [ ] **Step 1: Add failing color/subdivision checks**

Require:

```javascript
'colorPanel.add("radiobutton", undefined, "표준색")',
'colorPanel.add("radiobutton", undefined, "K 음영")',
'colorPanel.add("radiobutton", undefined, "HEX")',
'var K_STEP = 10',
'kValue = clamp(kValue + delta, 0, 100)',
'/^#?[0-9a-fA-F]{6}$/.test(value)',
'var STANDARD_RED = "FF0000"',
'var STANDARD_BLUE = "0000FF"',
'var STANDARD_PURPLE = "7030A0"',
'function makeHexColor(hex)',
'function makeKColor(k)',
'function splitCubic(cubic, t)',
'function extractCubicRange(cubic, startT, endT)',
'function drawStationaryBaseline(group, boundaries, colors)',
```

Reject three-digit Hex fallback and require `0K`, `100K`, source restoration, preview cleanup.

- [ ] **Step 2: Run RED**

Run: `node tests/check-script-safety.js`

Expected: FAIL for missing color and subdivision behavior.

- [ ] **Step 3: Implement color state/conversion**

Default `colorMode="standard"`, `kValue=0`, `hexValue="FF0000"`. Mode selection previews. K arrows call `stepK(-10)` / `stepK(10)`. Hex `onChange` validates `/^#?[0-9a-fA-F]{6}$/`, alerts, and restores `lastValidHex` on failure.

`makeHexColor()` returns RGB in RGB documents and explicit RGB-to-CMYK conversion in CMYK documents. `makeKColor()` returns CMYK black or RGB channels `255*(1-k/100)`. `getFrontColors(index)` returns one override for K/Hex or standard type colors.

- [ ] **Step 4: Implement exact stationary subdivision**

Represent cubic as `{p0,p1,p2,p3}`. `splitCubic(cubic,t)` uses de Casteljau and returns `{left,right}`. `extractCubicRange()` splits at end then at normalized start.

Build boundaries at path start, midpoint between symbol centers, and path end. Resolve each distance to segment/t. Walk cubic ranges and create open paths with exact endpoint anchors/handles; alternate red/blue per interval. K/Hex stationary mode duplicates one baseline instead.

Apply configured stroke width and no fill. Symbols use fill only so baseline stays clean.

- [ ] **Step 5: Verify GREEN and commit**

```bash
node tests/check-script-safety.js
node --check < '스크립트/01_도형/Object_front.jsx'
git diff --check
git add tests/check-script-safety.js '스크립트/01_도형/Object_front.jsx'
git commit -m "feat: color weather fronts and segment stationary lines"
```

Expected: checks exit `0`; commit succeeds.

---

### Task 4: Integrated verification, merge, push, and install

**Files:**
- Verify: `스크립트/01_도형/Object_front.jsx`
- Verify: `tests/check-script-safety.js`

**Interfaces:**
- Consumes: completed feature branch.
- Produces: merged/pushed `main` and matching Illustrator installation.

- [ ] **Step 1: Run final verification**

```bash
node tests/check-script-safety.js
node --check < '스크립트/01_도형/Object_front.jsx'
git diff --check
git status --short --branch
```

Expected: checks exit `0`; worktree clean.

- [ ] **Step 2: Complete branch workflow**

Use `superpowers:finishing-a-development-branch`. Merge locally to `main` after user selects that option, rerun checks on merged `main`, remove owned worktree, and delete merged branch.

- [ ] **Step 3: Push and update Illustrator**

Push `main`. Pull `/Users/choijonghun/.illu-script-updater/illu-script-guide`, then copy its `스크립트` tree into `/Applications/Adobe Illustrator 2026/Presets.localized/ko_KR/스크립트` with administrator privileges.

- [ ] **Step 4: Verify installed artifact**

```bash
shasum -a 256 '스크립트/01_도형/Object_front.jsx' '/Applications/Adobe Illustrator 2026/Presets.localized/ko_KR/스크립트/01_도형/Object_front.jsx'
git rev-parse --short HEAD
git rev-parse --short origin/main
```

Expected: file hashes match; Git hashes match.
