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
- Wrap each call in `try/catch` and tell the user to re-run setup if the action set is missing.
- Do the whole chain one object at a time. Expanding several objects together leaves the selection as a flat list of all the pieces, and the later merge then has nothing meaningful to work on.
- Other useful actions in the same set: `선 두께 0.3`, `0.3 화살촉 넣기`, `글자깨고흰라인`, `화살표 확장`, `검은 선 흰색으로`. Decode `cjhaction_260624.aia` (UTF-8 hex) to see the full list.
- Reference implementation: `스크립트/01_도형/Object_CellCycle.jsx` (`outlineArrows`, `applyExpandAction`).

When a step-by-step diagnosis is needed, put the stage limit constant at the **top** of the IIFE, not next to the function it guards — a `var` declared after the dialog code runs too late to take effect, and the resulting tests silently exercise the full pipeline.

## Escalation

Ask before expanding scope, changing unrelated files, using multiple agents, or starting a formal design workflow.
