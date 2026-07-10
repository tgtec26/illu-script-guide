# Sphere Latitude and View Reset Design

## Scope

Update `스크립트/01_도형/Object_sphere.jsx` without changing sphere projection, stroke, selection, or preview behavior.

## Latitude controls

- Increase latitude count range from `0..5` to `0..11`.
- Keep default latitude count at `1`.
- Draw selected latitudes from equator outward in this order:
  `0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75` degrees.
- Update input validation, slider maximum, range labels, and error text to use `11`.

## View reset

- Add one `시점 리셋` button below X/Y/Z view controls.
- Clicking resets `viewX`, `viewY`, and `viewZ` to zero.
- Synchronize all three text inputs and sliders to zero.
- Refresh preview once after all values are reset.
- Do not reset longitude-grid rotation.

## Verification

- Add static regression checks for latitude range, full latitude sequence, reset button, state reset, control synchronization, and preview refresh.
- Run script safety tests, JavaScript syntax check, and whitespace check.
- Push committed changes and copy updated script into Illustrator 2026 Korean scripts directory.
