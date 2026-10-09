# Working Preferences

## Lightweight Illustrator Script Workflow

For contained Adobe Illustrator JSX requests, default to direct implementation in the current checkout.

- Do not create design documents, implementation plans, worktrees, or subagents unless the user explicitly asks for them or the change affects a shared contract with material risk.
- Treat requests such as `바로 구현`, `진행해`, and `마무리` as authorization to implement without approval loops.
- Make reasonable UI and geometry assumptions from existing repository patterns; state only material assumptions in the final handoff.
- Verify with focused safety tests, JSX syntax check, and `git diff --check`. Broaden tests only when a failure or shared behavior requires it.
- Commit automatically when a unit of work is done and its tests pass. Push automatically only after the script was actually run in Illustrator and the PNG checked (Node tests alone are not enough); ask first if Illustrator verification was not possible, or if the change touches `setup-*`/`UPDATE.md`/shared `.jsxinc` files or deletes/renames scripts colleagues use (they receive pushes via `git pull`). Report what was pushed in one line.
- `스크립트/` is mirrored into Illustrator's scripts folder, so edits reach Illustrator immediately. Never copy scripts or ask whether to copy them.
- Keep progress updates short. Do not pause for process-only choices.

## Dialog Option Persistence (required)

Any script with a dialog must remember the options from the last run and preselect them next time. Apply this to every new script and to any existing script whose dialog gains options.

- Store with `app.preferences.setStringPreference(PREF_KEY, ...)` and read back with `getStringPreference`. No settings files.
- `PREF_KEY` is `"<ScriptName>/settings"` (e.g. `"ObjectSphere/settings"`).
- Serialize as a `|`-joined string starting with a version tag: `["v1", countA, countB, angle].join("|")`. Bump the tag whenever the field layout changes; on load, ignore any value whose tag or field count does not match, so an old string falls back to defaults instead of corrupting the dialog.
- Save on confirm only. Cancel must not overwrite the stored options.
- Validate every restored value against the same range the dialog enforces before applying it.
- Wrap reads and writes in `try/catch`; a preference failure must never block the script.

Reference implementations: `스크립트/01_도형/Object_RoundSolids.jsx`(구 탭), `스크립트/01_도형/Object_GraphTools.jsx`(축 눈금 탭), `스크립트/01_도형/Object_ParticleModel.jsx`(원자 탭).

## Movable Preview (required)

옵션을 조절해서 결과를 최종 결정하는 다이얼로그는 예외 없이 미리보기를 가진다. 체크박스 하나짜리 모달도 마찬가지다.

- 다이얼로그를 여는 즉시 미리보기를 그리고, 옵션이 바뀔 때마다 다시 그린다. 확인을 눌러야 결과를 볼 수 있는 다이얼로그는 만들지 않는다.
- `미리보기` 체크박스를 두어 끌 수 있게 한다. 끄면 미리보기를 지우고 원본을 원래 상태로 되돌린다.
- **미리보기는 반드시 옮길 수 있어야 한다.** 작업 대부분이 트레이싱이라, 밑그림과 겹쳐 놓고 맞춰봐야 위치를 정할 수 있다. `위치` 패널에 `가로`·`세로`(mm) 행을 넣는다.
- 위치 이동은 도형을 다시 만들지 않고 미리보기 그룹만 `translate()`로 옮긴다. 다시 만들면 느리고, 액션을 쓰는 스크립트는 눈에 띄게 끊긴다.
- 취소하거나 창을 닫으면 미리보기를 모두 지우고 원본을 되돌린다. 확인을 누르면 미리보기가 그대로 결과가 된다.
- 이동값도 다이얼로그 옵션이므로 Dialog Option Persistence 규칙대로 저장한다.

Reference implementations: `스크립트/01_도형/Object_Pedigree.jsx`(`bindPositionRow`), `스크립트/01_도형/Object_RegionBrace.jsx`.

## Dialog Layout (required)

일러스트레이터 패널처럼 **1단**으로 쌓는다. 패널을 좌우로 나란히 두지 않는다.

- 창 높이는 `win.layout.layout(true)` 뒤 `win.size.height` 기준 900 이하. 넘으면 체크박스를 한 행에 2~3개씩 묶거나 설명문을 `helpTip`으로 옮겨 줄인다. 그래도 넘는 경우에만 2단 유지(현재 `Object_Pedigree.jsx` 하나).
- 체크박스·버튼 격자(원소 기호, 정렬 위치 등)는 1단 규칙과 무관하다.
- 숫자 조절 행은 예외 없이 `라벨 | 입력창 | 스크롤바` 순서다(`Object_isometric.jsx`가 기준). 라벨에는 단위·콜론을 붙이지 않는다(2026-10-09 변경: 단위는 마우스를 올리면 뜨는 툴팁). 별도 단위 텍스트도 두지 않는다. 입력창은 6자, 스크롤바 폭은 118px.
- 대화상자 다이어트는 `ui_tab_helper.jsxinc`의 `compactDialog`가 `bindTabOrder(win)` 안에서 한다: 라벨의 `(단위)`·콜론 제거(툴팁으로), 스크롤바 폭 118 이하, 라벨 칸을 글자 폭에 맞춤, 창·패널 여백과 간격 축소, 확인·취소 폭 64 고정·오른쪽 정렬. 그래서 새 스크립트는 예전 방식(`크기 (mm):`, 196)으로 써도 창은 줄어들지만, 처음부터 위 기준으로 쓰는 게 좋다. 줄이기만 하고 늘리지는 않는다. 끄려면 `$.global.__noCompact = true`(검증용).
- 스크롤바 오른쪽에는 예외 없이 `R` 버튼(폭 34, `helpTip` "처음 값으로 되돌리기")을 둬 그 행을 처음 값으로 되돌린다. 처음 값은 **저장값을 복원하기 전의 값**이라, `readSettings`/`applySettings` 호출 직전에 따로 잡아 둔다(`Object_Induction.jsx`의 `DEFAULTS`). 클릭은 입력창에 같은 숫자를 친 것과 같은 `commit` 경로를 탄다. 선택한 개체에서 계산되는 값은 계산식을 복원 전 값으로 재현하고, 재현할 수 없으면 `R`을 만들지 않는다. 입력창·스크롤바를 끄고 켜는 코드는 `R`도 같이 처리한다. `0` 버튼은 쓰지 않는다.
- 행이 많아 창이 높아지는 패널은 접을 수 있게 한다(2026-10-09): `ui_tab_helper.jsxinc`의 `makeCollapsiblePanel(parent, 제목, 기본으로 접힘, 저장키)`가 `접기/펼치기` 단추가 달린 패널을 만들고 행을 넣을 body 그룹을 돌려준다(`Object_LensMirror.jsx`의 `foldPanel`, `Object_ReactionModel.jsx`의 폼 엔진 `fold: true` 참고). 접힌 상태는 `app.preferences`의 `Fold/<키>`에 기억한다. 접기는 `visible=false`가 아니라 `maximumSize.height = 0`이고(`visible=false`는 공간을 비우지 않는다), 펼치거나 접을 때 `win.size=[10,10]; win.layout.layout(true)`로 다시 잡는다. 이 단추 누르기는 옵션 값이 아니므로 확인·취소와 무관하다.
- **대화상자 요소 편집(2026-10-09)**: `ui_tab_helper.jsxinc`의 `uiCatalogAndOverrides`가 `bindTabOrder(win)` 안에서 창 안의 요소(패널 제목, 라벨, 체크·라디오·단추 글자, 드롭다운 항목, 스크롤바 범위·단계)를 훑어 `00_세팅/ui_catalog/<창 제목>.json`에 목록을 남기고(gitignore), `00_세팅/ui_overrides.json`의 덮어쓰기를 적용한다. `node tools/ui-admin.js`(http://127.0.0.1:5200)에서 제목·슬라이더 최솟값·최댓값·단계·R 단추 기본값·드롭다운 항목 문구를 고치고, 저장하면 `ui_overrides.json`만 커밋해 GitHub에 올린다(작성자 tgtec26, `--no-push`면 커밋까지만; 동료는 `git pull`로 받는다). 예전 `range-admin`(slider_ranges.json)은 이 서버로 합쳤다. 요소는 창에서 시작하는 children 순번 경로로 가리키므로, 대화상자를 만들 때 요소의 생성 순서를 바꾸면 기존 덮어쓰기는 `orig`가 어긋나 적용되지 않는다. 그래서 `bindTabOrder(win)`을 부르는 스크립트(97개 중 87개)는 모두 편집 대상이다. 창 제목(`new Window(…, 제목)`)이 목록의 이름이므로 바꾸면 새 목록이 생긴다.
- 슬라이더 대신 `scrollbar`를 쓴다. 양끝 ‹ › 화살표가 내장되어 있어 ◀▶ 버튼을 따로 만들지 않는다. `stepdelta`에 한 단계 값(0.1, 0.5, 10 등 소수도 됨), `jumpdelta`에 트랙 클릭 이동량(보통 step × 10)을 준다. 화살표·트랙 클릭·드래그 모두 `onChanging`을 부르므로 값 반영은 `onChanging`에 건다(`onChange`도 같이 걸면 마지막 값 확정용).
- 입력창에서 엔터를 쳐도 실행되지 않도록 `win.defaultElement = null`로 기본 버튼을 없앤다.
- 탭 순서는 생성 순서라 입력창 다음이 스크롤바로 간다. 입력창이 있는 다이얼로그는 파일 맨 위(메모 조각 앞)에 아래 로더를 넣고, `win.show()` 직전에 `if (typeof bindTabOrder === "function") bindTabOrder(win);`를 부른다. 헬퍼(`스크립트/00_세팅/ui_tab_helper.jsxinc`)가 창 안의 모든 edittext를 모아 탭·Shift+탭이 켜진 입력창끼리만 오가게 한다. 스크립트마다 탭 핸들러를 따로 만들지 않는다.

```jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
```
- 글자 크기는 줄일 수 없다. `graphics.font`를 바꿔도 이 일러 버전은 화면에 반영하지 않는다(확인됨).

## Optional Frame Selection (required)

원·사각형을 틀(크기·가운데)로만 쓰는 스크립트는 선택이 비어 있어도 실행된다. 사용자의 그림을 가공하는 스크립트(열린 패스, 직선, 임의 모양, 글자)는 해당하지 않는다.

- 선택이 비면 알림 없이 마지막에 쓴 틀 크기, 없으면 기본 크기로 활성 대지 가운데에 그린다. 기존 `위치` 옵션은 그 위에 더한다.
- 선택이 비어 있지 않은데 맞지 않으면(원이 아닌 타원, 사각형 둘 등) 이유를 알리고 끝낸다.
- 틀 크기는 `PREF_KEY + "/frame"` 키에 `v1|너비mm|높이mm`(원은 지름을 둘 다에)로 저장한다. 확인할 때만, 틀이 실제 선택에서 왔을 때만 저장한다. 기존 설정 문자열 형식은 건드리지 않는다.
- 원본을 숨기거나 지우거나 되살리는 코드는 원본이 `null`이어도 안전해야 한다. 기본 크기는 상수 하나(`DEFAULT_FRAME_MM`)로 둔다.
- 참고 구현: `스크립트/01_도형/Object_Quadrat.jsx`, `스크립트/01_도형/Object_Karyotype.jsx`.

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
- Reference implementations: `스크립트/01_도형/Object_GraphTools.jsx` (축 눈금 탭의 `applyAxisArrowheads`), `스크립트/01_도형/Object_setdash_align_helper.jsxinc`. To find more keys, parse `스크립트/00_세팅/cjhaction_260624.aia` — it holds real recorded values.

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
- Reference implementation: `스크립트/01_도형/Object_CellDivision.jsx` (세포 주기 탭의 `outlineArrows`, `applyExpandAction`).

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

## Tabbed Script Bundles

관련 스크립트는 한 창의 탭으로 묶는다(`Object_3DLine.jsx`, `Object_ParticleModel.jsx`, `Object_CrystalStructure.jsx`, `Object_DnaModel.jsx`, `Object_Mechanics.jsx`, `Object_GraphTools.jsx`). 두 가지 구조가 있다.

- 옵션을 공유하는 묶음(3D 라인·입자 모형·결정 구조): 공용 상태·패널은 IIFE 최상위, 탭별 상태·행·기하는 `makeXEngine()` 클로저 안. 엔진 인터페이스는 파일 머리 주석에 있다.
- 서로 다른 다이얼로그를 그대로 담는 묶음(DNA 모형·역학·그래프·표): 원본 스크립트 본문이 `addRows(page)` 안에 그대로 들어가고, 창·푸터·show 부분만 `api.setPreview/updatePreview/clearPreview/commit` 훅으로 바뀐다. 각 탭의 저장 키(`PREF_KEY`)는 원래 것을 그대로 쓴다. 선택이 맞지 않는 탭은 `addRows`가 안내문을 돌려주고 호스트가 탭을 끈다.
- 탭 줄(`tabbedpanel`)은 탭 수만큼 폭을 차지해 창이 넓어진다(5개면 약 500, 11개면 1000 넘게). 2026-10-09부터 새 묶음은 `tabbedpanel` 대신 선택 줄 + 겹쳐 쌓은 페이지를 쓴다: 탭이 적으면 라디오 버튼 줄, 많으면 드롭다운, 페이지는 `stack` 그룹에 쌓고 레이아웃을 잡은 뒤 선택되지 않은 페이지를 숨긴다(`Object_Mechanics.jsx`, `Object_HighCommon.jsx` 참고). 기존 묶음은 `tools/tabs-to-selector.py`로 호스트 틀이 같은 것만 변환했다.
- ScriptUI `tabbedpanel.selection`(Tab)에는 `index`가 없다. 제목(`text`)을 라벨과 비교해 찾는다.
- Node 테스트는 스코프를 평탄화해 공통 함수가 엔진 상수를 쓰는 오류를 못 잡는다. 통합 뒤에는 일러에서 탭마다 미리보기를 그려 확인한다.
- **창을 줄일 때 `layout()`을 미리 부르지 말 것**: 한 번 레이아웃이 잡히면 ScriptUI가 늘어난 크기를 `preferredSize`로 굳혀서 이후에 줄여도 창이 줄지 않는다(2026-10-09 측정: 탭 호스트가 먼저 레이아웃을 잡아 `compactDialog`가 스크롤바·버튼을 줄이지 못함). 선택되지 않은 페이지는 `win.onShow`에서 숨긴다. 크기를 줄이는 속성은 `preferredSize`와 `maximumSize`를 함께 건다.
- 안내 홈페이지도 같은 구조다. 묶음을 만들거나 탭을 더하면 `docs/assets/app.js`의 그 항목에 `tabs`(필요하면 묶음 공통 옵션 `shared`, 선택 조건 `requires`)를 맞춘다. 목록 → 묶음 안내(`#script/<id>`) → 탭 세부(`#script/<id>/<탭id>`) 세 단계로 그려지고, 탭 이름(`name`)은 스크립트의 탭 라벨과 같게 둔다. 어드민의 세부 설명·이미지는 탭까지 따로 저장하므로(`content.json`의 `details["<id>/<탭id>"]`) 탭 `id`는 바꾸지 않는다.

## Verifying in Illustrator Without Freezing It (required)

2026-09-27: 검증 프로브를 osascript로 길게(20초 이상, 연달아) 돌리자 일러가 느려지고 Dock 아이콘이 계속 튀었다. 닫을 창은 없었다. `sample`로 보니 일러의 `AIHangMonitor`(응답 없음 감시) 스레드가 CPU 80%로 계속 돌고 있었다. `do javascript`가 주 스레드를 오래 막으면 감시가 걸리고, 끝난 뒤에도 풀리지 않는다. 실제 사용(모달 다이얼로그)에서는 생기지 않는 테스트 방식의 문제다.

- 프로브는 반드시 `tools/illu-probe.sh probe.jsx`로 돌린다. 일러가 한가할 때만 보내고, 경고창을 끄고, 만든 문서를 닫고, 중간에 끊지 않는다.
- 한 번에 한 경우만, 10초 안쪽으로 짠다. PNG는 150~200%로 내보낸다. 문서 만들기만 3~4초 걸린다. 여러 경우는 호출을 나눈다.
- `timeout` 명령으로 osascript를 끊지 않는다. 끊어도 일러는 그 스크립트를 계속 실행하고 다음 요청이 뒤에 쌓인다.
- 실행기는 일러가 1분 안에 한가해지지 않으면 `sample`로 원인을 본다. AIHangMonitor가 헛돌면 보내지 않고 멈추고(종료 코드 2), 확장 패널의 계속 다시 그리기 같은 배경 부하(2026-09-28 관찰: 주 스레드 MTKView + PlugPlugOwl, 30~55%)면 보낸다. 13~17초짜리 프로브로도 감시가 다시 걸린 적이 있다(2026-09-28). 실행 뒤 일러 CPU가 오래(1분 이상) 높으면 다음 프로브를 보내지 않는다. 열린 문서가 0개인지 확인한 뒤 일러를 정상 종료하고 다시 켜면 풀린다(`osascript -e 'tell application id "com.adobe.illustrator" to quit'`, `open -g -b com.adobe.illustrator`). 문서가 열려 있으면 사용자에게 묻는다.
- 문서를 닫아 0개가 되면 일러가 홈 화면(HTML)을 새로 그리느라 1~2분 CPU를 30~80% 쓰고 스크립트 요청에 늦게 응답한다(2026-09-28 측정: 재시작 직후 1%, 빈 문서를 열었다 닫은 뒤 30~77%, 몇 분 뒤 다시 낮아짐). 프로브가 문서를 만들고 닫기를 반복하면 이 상태가 풀리지 않는다. 그래서 실행기는 테스트 문서 하나를 계속 열어 둔다. 프로브에서 문서를 새로 만들거나 닫지 않는다.
- 일러의 ExtendScript 엔진은 `do javascript` 실행 사이에 전역 변수를 기억한다. 프로브나 감싸는 스크립트에서 `var x;`처럼 값 없이 선언하면 앞 실행의 값이 남는다(2026-09-28: 실행기가 앞 결과를 보고 프로브를 건너뛰어 0초에 "done"만 돌려줌). 전역은 항상 값을 넣어 선언하거나 IIFE 안에 둔다.
- 프로브는 원본을 고치지 않는다. 설정 저장(`setStringPreference`)은 프로브 안에서 막아 사용자 설정을 덮지 않는다.
- Windows 기기에는 osascript가 없다. 같은 원칙(짧게, 경고창 끄기, 한가할 때만)으로 사용자 테스트를 부탁한다.

## Escalation

Ask before expanding scope, changing unrelated files, using multiple agents, or starting a formal design workflow.
