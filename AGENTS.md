# Working Preferences

## Lightweight Illustrator Script Workflow

For contained Adobe Illustrator JSX requests, default to direct implementation in the current checkout.

- Do not create design documents, implementation plans, worktrees, or subagents unless the user explicitly asks for them or the change affects a shared contract with material risk.
- Treat requests such as `바로 구현`, `진행해`, and `마무리` as authorization to implement without approval loops.
- Make reasonable UI and geometry assumptions from existing repository patterns; state only material assumptions in the final handoff.
- Verify with focused safety tests, JSX syntax check, and `git diff --check`. Broaden tests only when a failure or shared behavior requires it.
- Commit, push, and copy into Illustrator only when the user asks to publish, update, or finish the work.
- Keep progress updates short. Do not pause for process-only choices.

## Dialog Option Persistence (required)

Any script with a dialog must remember the options from the last run and preselect them next time. Apply this to every new script and to any existing script whose dialog gains options.

- Store with `app.preferences.setStringPreference(PREF_KEY, ...)` and read back with `getStringPreference`. No settings files.
- `PREF_KEY` is `"<ScriptName>/settings"` (e.g. `"ObjectSphere/settings"`).
- Serialize as a `|`-joined string starting with a version tag: `["v1", countA, countB, angle].join("|")`. Bump the tag whenever the field layout changes; on load, ignore any value whose tag or field count does not match, so an old string falls back to defaults instead of corrupting the dialog.
- Save on confirm only. Cancel must not overwrite the stored options.
- Validate every restored value against the same range the dialog enforces before applying it.
- Wrap reads and writes in `try/catch`; a preference failure must never block the script.

Reference implementations: `스크립트/01_도형/Object_sphere.jsx`, `스크립트/01_도형/Object_AxisTickMarks.jsx`, `스크립트/01_도형/Object_AtomModel.jsx`.

## Movable Preview (required)

옵션을 조절해서 결과를 최종 결정하는 다이얼로그는 예외 없이 미리보기를 가진다. 체크박스 하나짜리 모달도 마찬가지다.

- 다이얼로그를 여는 즉시 미리보기를 그리고, 옵션이 바뀔 때마다 다시 그린다. 확인을 눌러야 결과를 볼 수 있는 다이얼로그는 만들지 않는다.
- `미리보기` 체크박스를 두어 끌 수 있게 한다. 끄면 미리보기를 지우고 원본을 원래 상태로 되돌린다.
- **미리보기는 반드시 옮길 수 있어야 한다.** 작업 대부분이 트레이싱이라, 밑그림과 겹쳐 놓고 맞춰봐야 위치를 정할 수 있다. `위치` 패널에 `가로 이동`·`세로 이동`(mm) 행을 넣는다.
- 위치 이동은 도형을 다시 만들지 않고 미리보기 그룹만 `translate()`로 옮긴다. 다시 만들면 느리고, 액션을 쓰는 스크립트는 눈에 띄게 끊긴다.
- 취소하거나 창을 닫으면 미리보기를 모두 지우고 원본을 되돌린다. 확인을 누르면 미리보기가 그대로 결과가 된다.
- 이동값도 다이얼로그 옵션이므로 Dialog Option Persistence 규칙대로 저장한다.

Reference implementations: `스크립트/01_도형/Object_Pedigree.jsx`(`bindPositionRow`), `스크립트/01_도형/Object_RegionBrace.jsx`.

## Dialog Layout (required)

일러스트레이터 패널처럼 **1단**으로 쌓는다. 패널을 좌우로 나란히 두지 않는다.

- 창 높이는 `win.layout.layout(true)` 뒤 `win.size.height` 기준 900 이하. 넘으면 체크박스를 한 행에 2~3개씩 묶거나 설명문을 `helpTip`으로 옮겨 줄인다. 그래도 넘는 경우에만 2단 유지(현재 `Object_Pedigree.jsx` 하나).
- 체크박스·버튼 격자(원소 기호, 정렬 위치 등)는 1단 규칙과 무관하다.
- 숫자 조절 행은 예외 없이 `라벨 | ◀ | 슬라이더 | ▶ | 입력창 | 단위` 순서다. ◀▶는 슬라이더 **양옆**에 두고(오른쪽에 몰아 두지 않는다), 값은 입력창에 직접 타이핑할 수 있어야 한다. 라벨은 `◀ ▶`로 통일하고 `+ −`는 쓰지 않는다. 슬라이더 폭은 77~140px 수준.
- 입력창에서 엔터를 쳐도 실행되지 않도록 `win.defaultElement = null`로 기본 버튼을 없앤다.
- 글자 크기는 줄일 수 없다. `graphics.font`를 바꿔도 이 일러 버전은 화면에 반영하지 않는다(확인됨).

## Last-Script Memo (required)

Every runnable `.jsx` under `스크립트/` records its own path so `스크립트/10_기타/RepeatLast.jsx`(F4)가 그 스크립트를 다시 실행할 수 있다. 새 스크립트를 만들면 파일 맨 위(단, `#target`/`#include` 지시문 뒤)에 아래 조각을 그대로 넣는다. `RepeatLast.jsx` 자신만 예외다.

```jsx
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}
```

## Stroke Properties Missing From the DOM

Arrowheads and dash corner alignment are not exposed on `PathItem`, but they can still be set from a script: write a temporary `.aia` action, then `app.loadAction` → `app.doScript` → `app.unloadAction`. This is verified working, not a workaround to avoid.

Parameter keys for the `ai_plugin_setStroke` event (integer form of the four-character OSType):

| Key | OSType | Meaning |
| --- | --- | --- |
| 2003072104 | `wdth` | stroke width (unit real, unit `592476268` = pt) |
| 1634231345 / 1634231346 | `ahd1` / `ahd2` | start / end arrowhead name |
| 1634951985 / 1634951986 | `asc1` / `asc2` | start / end arrowhead scale % |
| 1634230636 | `ahal` | arrowhead alignment |
| 1684104298 | `dadj` | align dashes to corners and path ends |
| 1667330094 / 1785686382 / 1634494318 | `cap.` / `join` / `algn` | cap, join, stroke alignment |
| 1684825454 / 1836344690 | `dlen` / `mter` | dash length, miter limit |

- Strings in an action file are UTF-8 bytes written as uppercase hex, and the declared length is the **byte** count, not the character count.
- Arrowhead names and the `/name` of enumerated parameters follow the Illustrator UI language. Keep them in one named constant per script so another language only needs that constant changed (Korean build: `화살표 1` = `ED9994EC82B4ED919C2031`, 11 bytes).
- Wrap the whole action call in `try/catch` so the artwork survives a failure, and always unload the action set and delete the temporary file afterwards.
- Reference implementations: `스크립트/01_도형/Object_AxisTickMarks.jsx` (`applyAxisArrowheads`), `스크립트/01_도형/Object_setdash_align_helper.jsxinc`. To find more keys, parse `스크립트/00_세팅/cjhaction_260624.aia` — it holds real recorded values.

## Expand and Pathfinder Must Go Through the Installed Action Set

`app.executeMenuCommand` does not work for expand or pathfinder operations here. Verified failing on stroked paths: `outline`, `OffsetPath v22`, `Expand3`, and `Live Pathfinder Add` — each runs without error and changes nothing. Rebuilding the recorded `ai_plugin_expand` event as a temporary `.aia` fails the same way, so this is not the arrowhead pattern above.

What works is calling the actions `setup.jsx` installs from `스크립트/00_세팅/cjhaction_260624.aia`:

```javascript
app.doScript("확장", "최종훈");        // Object > Expand  (ai_plugin_expand + 그룹 풀기)
app.doScript("도형 합치기", "최종훈");  // Pathfinder Unite (ai_plugin_pathfinder, 추가)
```

- `expandStyle` (Object > Expand Appearance) is the one exception: the menu command works, so keep using it.
- `executeMenuCommand("ungroup")` is unreliable on nested groups: with the inner groups selected it worked on a 3-cell test but dissolved the *outer* cell groups on the real periodic table. Ungroup by script instead — move each path out bottom-most first so stacking order is kept, then remove the empty group (`flattenShapes` in `스크립트/01_도형/Object_PeriodicTable.jsx`):

```javascript
while (shape.pathItems.length > 0) {
    shape.pathItems[shape.pathItems.length - 1].move(shape, ElementPlacement.PLACEAFTER);
}
shape.remove();
```
- Wrap each call in `try/catch` and tell the user to re-run setup if the action set is missing.
- Do the whole chain one object at a time. Expanding several objects together leaves the selection as a flat list of all the pieces, and the later merge then has nothing meaningful to work on.
- Other useful actions in the same set: `선 두께 0.3`, `0.3 화살촉 넣기`, `글자깨고흰라인`, `화살표 확장`, `검은 선 흰색으로`. Decode `cjhaction_260624.aia` (UTF-8 hex) to see the full list.
- Reference implementation: `스크립트/01_도형/Object_CellCycle.jsx` (`outlineArrows`, `applyExpandAction`).

When a step-by-step diagnosis is needed, put the stage limit constant at the **top** of the IIFE, not next to the function it guards — a `var` declared after the dialog code runs too late to take effect, and the resulting tests silently exercise the full pipeline.

## Gradient Angle Must Be Read Back, Not Set

`GradientColor.angle` and `GradientColor.matrix` are ignored when a script assigns a fill (verified on Illustrator 2026: angle 0/30/-45/90 and rotation matrices all render the same). Illustrator stamps its last-used gradient angle (Gradient panel state, a previous `rotate()`, etc.) onto every new fill, so `path.rotate(angle, ...)` alone gives a different result on every run.

Read the stamped angle back and rotate only by the difference:

```javascript
path.fillColor = gradientColor;
path.rotate(angle - path.fillColor.angle, false, false, true, false, Transformation.CENTER);
```

- Rotating the whole shape and rotating it back leaves hairlines between adjoining faces; rotate the fill only.
- Assigning `gradientStops[i].color` re-renders every object using that gradient on the next `app.redraw()`, even with the same value. Write stop colors only when they change.
- Reference implementation: `스크립트/01_도형/Object_PeriodicTable.jsx` (`applyGradientFill`, `tintBevelGradients`).

## Preview Performance

One DOM call costs 0.1-0.25 ms and `app.redraw()` over a few hundred gradient paths costs ~50 ms, so a preview that rewrites every path on each slider tick lags. Measured on Object_PeriodicTable: 150-280 ms per tick before, ~60 ms after.

- Draw one prototype per distinct shape and `duplicate(target, ElementPlacement.PLACEATEND).translate(dx, dy)` the rest (3 calls per copy). Keeping the shape in its own subgroup lets text frames stay while the shape is swapped.
- Use `pathItems.roundedRectangle()` / `rectangle()` instead of writing anchors and handles point by point (1 call vs 30+).
- Read a group's parts into a name → item map in one pass instead of scanning by name for each part. Re-read after `add`/`move`/`remove`; references can go stale.
- Skip work when the value did not change (gradient tint, text size, path geometry). Cache the last drawn key per object.
- Benchmark in Illustrator, not by guessing: copy the script, replace `win.show()` with an option sweep timed by `new Date().getTime()` (not `$.hiresTimer`), run it with `osascript -e 'tell application id "com.adobe.illustrator" to do javascript (POSIX file "...")'`, and compare `doc.exportFile(PNG24)` output between runs. A modal alert in Illustrator blocks every AppleEvent until dismissed.

## Escalation

Ask before expanding scope, changing unrelated files, using multiple agents, or starting a formal design workflow.
