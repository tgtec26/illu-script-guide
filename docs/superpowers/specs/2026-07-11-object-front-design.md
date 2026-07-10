# Object Front Design

## Goal

Add `스크립트/01_도형/Object_front.jsx`, an Adobe Illustrator ScriptUI tool that converts one selected open path into an editable weather-front line.

## Input and output

- Require exactly one unlocked, editable, open `PathItem`.
- Support straight and cubic Bezier paths.
- Reject closed paths, clipping paths, guides, and selections other than one path with a Korean alert.
- Create one group named `Weather Front` containing the styled baseline and all symbols.
- Preserve source geometry. Warm, cold, occluded, and single-color stationary fronts reuse a duplicate of the original path as the baseline. A standard-color stationary front recreates the baseline as alternating red and blue Bezier subpaths.
- Remove the source path only after final output succeeds.

## Front types

Expose four radio buttons:

- `온난전선`: semicircles on the default side.
- `한랭전선`: triangles on the default side.
- `정체전선`: semicircles on the default side and triangles on the opposite side, alternating along the path. Standard-color baseline segments alternate red and blue.
- `폐색전선`: semicircles and triangles alternate on the same default side.

The default side is the left normal of path direction. A `방향 반전` checkbox negates the normal. For stationary fronts, reversal swaps both symbol sides.

Semicircle and triangle bases follow the local path tangent. Their height extends along the local normal. The configured shape size is the base width and semicircle diameter. Only complete symbols that fit between path endpoints are generated. If the path is shorter than one symbol, stop with a Korean warning.

## Size and spacing

Provide synchronized sliders and editable numeric inputs:

- Shape size: default `2mm`, range `0.5..20mm`, step `0.1mm`.
- Empty gap between symbol footprints: default `2mm`, range `0..20mm`, step `0.1mm`.
- Baseline stroke width: default `0.5pt`, range `0.1..10pt`, step `0.1pt`.

Manual input is normalized to the configured step and clamped to the allowed range. Invalid final input restores the most recent valid value.

## Color controls

Expose three color-mode radio buttons:

- `표준색` is default.
- `K 음영` applies one grayscale color to baseline and all symbols.
- `HEX` applies one custom RGB color to baseline and all symbols.

Standard colors:

- Warm: `#FF0000`.
- Cold: `#0000FF`.
- Stationary: alternating `#FF0000` and `#0000FF` symbols and baseline sections.
- Occluded: `#7030A0`.

K controls use left and right buttons, display the current value, step by `10K`, and clamp to `0K..100K`. The initial K value is `0K`. Hex input accepts optional `#` followed by exactly six hexadecimal digits. Invalid Hex input displays a Korean alert and restores the previous valid value.

Color objects match document color space. RGB values are converted for CMYK documents; K values use CMYK black in CMYK documents and equivalent RGB grayscale in RGB documents.

## Path sampling and geometry

- Build one cached cumulative-length table from dense samples of every cubic Bezier segment.
- Resolve target distances by binary search and interpolation in the cached table.
- Evaluate cubic position and derivative at the resolved segment parameter.
- Place symbol centers at `shapeSize / 2 + index * (shapeSize + gap)`.
- Use the derivative as tangent and its normalized perpendicular as normal.
- Generate semicircles as cubic Bezier paths and triangles as closed three-point paths.
- For standard stationary fronts, switch baseline color halfway between adjacent symbol centers.
- Split original cubic segments at stationary color boundaries with de Casteljau subdivision so recreated baseline sections retain original curvature.

## Preview and lifecycle

- Preview is enabled by default.
- Hide and deselect the source before first preview.
- Rebuild only the preview group when a control changes.
- Keep the source path unchanged during preview.
- On confirmation, remove preview, build final output, place it beside the source in stacking order, then remove source and select final group.
- On cancellation or failure, remove preview and restore source hidden state, selection, and style.

## UI layout

Dialog title: `오브젝트 전선`.

Panels in order:

1. `전선 종류`: four radio buttons.
2. `도형 배치`: shape-size and gap controls plus direction reversal.
3. `컬러`: color-mode radios, K arrow controls, and Hex input.
4. `라인`: stroke-width controls.
5. Preview checkbox and `확인` / `취소` buttons.

## Verification

- Extend `tests/check-script-safety.js` with static checks for file presence, dialog controls, exact defaults/ranges, all four type tokens, direction reversal, color modes, standard colors, K stepping, strict Hex validation, cached path metrics, tangent/normal placement, de Casteljau splitting, preview cleanup, and source restoration/removal.
- Verify RED before implementation and GREEN after implementation.
- Run `node tests/check-script-safety.js`.
- Run `node --check < '스크립트/01_도형/Object_front.jsx'`.
- Run `git diff --check`.
- Commit, merge to `main`, push, and copy scripts to Adobe Illustrator 2026 Korean scripts directory. Confirm installed and repository `Object_front.jsx` SHA-256 hashes match.
