# Sphere Latitude and View Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand sphere latitude controls to 11 lines and add one button that resets X/Y/Z view rotation to zero.

**Architecture:** Keep all behavior in existing Illustrator ExtendScript dialog. Expand fixed latitude sequence and control bounds, then add one view-panel button whose handler synchronizes three state variables, three text inputs, and three sliders before one preview refresh.

**Tech Stack:** Adobe Illustrator ExtendScript/ScriptUI, Node.js static safety test

## Global Constraints

- Latitude order: `0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75` degrees.
- Latitude count range: `0..11`; default remains `1`.
- Reset affects `viewX`, `viewY`, and `viewZ` only; longitude-grid rotation remains unchanged.
- Reset refreshes preview once.
- Existing projection, stroke, selection, and preview behavior remains unchanged.

---

### Task 1: Expand latitudes and add view reset

**Files:**
- Modify: `tests/check-script-safety.js:489-518`
- Modify: `스크립트/01_도형/Object_sphere.jsx:55-170`
- Modify: `스크립트/01_도형/Object_sphere.jsx:248-269`

**Interfaces:**
- Consumes: existing `xControls`, `yControls`, `zControls`, `formatSignedAngle()`, and `updatePreview()`.
- Produces: `resetViewButton` ScriptUI button and `resetViewControls()` event handler; 11-entry `latitudeSequence`.

- [ ] **Step 1: Write failing static regression checks**

Replace old sphere latitude tokens and add reset tokens in `tests/check-script-safety.js`:

```javascript
'gridPanel.add("slider", undefined, latitudeCount, 0, 11)',
'var latitudeSequence = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75]',
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
```

Add guards rejecting old latitude bounds:

```javascript
if (source.includes('latitudeCount, 0, 5') || source.includes('validLatitude > 5')) {
  console.error(`${sphere}: latitude count must support 0 through 11`);
  failures++;
}
```

- [ ] **Step 2: Run test and verify RED**

Run: `node tests/check-script-safety.js`

Expected: FAIL listing missing `0, 11` latitude slider, 11-entry sequence, reset button, reset handler, and synchronized controls.

- [ ] **Step 3: Expand latitude range and sequence**

Update `Object_sphere.jsx` labels, slider, input guards, normalization, validation, and draw sequence:

```javascript
latitudeRow.add("statictext", undefined, "개  (0 = 없음, 1 ~ 11)");
var latitudeSlider = gridPanel.add("slider", undefined, latitudeCount, 0, 11);
gridPanel.add("statictext", undefined,
    "순서: 적도 → 북15° → 남15° → 북30° → 남30° → 북45° → 남45° → 북60° → 남60° → 북75° → 남75°");
```

Use `11` in `latitudeInput.onChanging`, `normalizeIntegerInput`, OK validation, and error text. Replace sequence with:

```javascript
var latitudeSequence = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75];
```

- [ ] **Step 4: Add synchronized view reset**

Add button after X/Y/Z controls:

```javascript
var resetViewButton = viewPanel.add("button", undefined, "시점 리셋");
resetViewButton.alignment = "right";
```

Bind handler after existing view bindings and add function near view control helpers:

```javascript
resetViewButton.onClick = resetViewControls;

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
```

- [ ] **Step 5: Run GREEN verification**

Run:

```bash
node tests/check-script-safety.js
node --check < '스크립트/01_도형/Object_sphere.jsx'
git diff --check
```

Expected: all commands exit `0`, no output.

- [ ] **Step 6: Commit and publish**

```bash
git add tests/check-script-safety.js '스크립트/01_도형/Object_sphere.jsx' docs/superpowers/plans/2026-07-10-sphere-latitude-reset.md
git commit -m "feat: expand sphere latitude and reset view"
git push origin main
```

Pull updater cache, copy scripts to Illustrator 2026 Korean scripts directory with administrator privileges, then compare SHA-256 hashes for repository and installed `Object_sphere.jsx`.
