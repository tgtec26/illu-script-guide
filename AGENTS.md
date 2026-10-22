# Working Preferences

> 새 세션·다른 기기에서 시작하면 먼저 `HANDOFF.md`(이어갈 작업·확정된 규칙·다음 작업)를 읽는다.

## Lightweight Illustrator Script Workflow

For contained Adobe Illustrator JSX requests, default to direct implementation in the current checkout.

- Do not create design documents, implementation plans, worktrees, or subagents unless the user explicitly asks for them or the change affects a shared contract with material risk.
- Treat requests such as `바로 구현`, `진행해`, and `마무리` as authorization to implement without approval loops.
- Make reasonable UI and geometry assumptions from existing repository patterns; state only material assumptions in the final handoff.
- Verify with focused safety tests, JSX syntax check, and `git diff --check`. Broaden tests only when a failure or shared behavior requires it.
- Commit automatically when a unit of work is done and its tests pass. Push automatically only after the script was actually run in Illustrator and the PNG checked (Node tests alone are not enough); ask first if Illustrator verification was not possible, or if the change touches `setup-*`/`UPDATE.md`/shared `.jsxinc` files or deletes/renames scripts colleagues use (they receive pushes via `git pull`). Report what was pushed in one line.
- `스크립트/` is mirrored into Illustrator's scripts folder, so edits reach Illustrator immediately. Never copy scripts or ask whether to copy them.
- Keep progress updates short. Do not pause for process-only choices.

## Script File Names (2026-10-10)

스크립트 파일 이름은 **한글**이고 `Object_`·`Text_` 같은 접두사가 없다(폴더가 분류를 맡는다). 옛 이름과 새 이름은 `docs/script-rename-table.md`에 있다.

- 새 스크립트는 대화상자 제목과 같거나 가까운 한글 이름으로 짓는다(예: `대류.jsx`). 폴더 안에서 겹치면 안 되고 `/ : * ? " < > |`는 쓰지 않는다. 이름은 NFC로 둔다.
- **저장 키(`PREF_KEY`)는 이름을 따라 바꾸지 않는다.** 옛 스크립트의 키는 옛 영문 이름 그대로다(`Object_MeterScale/settings` 등). 바꾸면 저장된 옵션이 사라진다. 새 스크립트는 영문 키를 따로 짓는다(예: `ObjectSphere/settings`).
- 홈페이지 `docs/assets/app.js`의 `file`은 새 파일명, `id`와 탭 `id`는 영문 그대로다.
- 파일을 더하거나 이름을 바꾸면 일러에 한 줄짜리 로더를 다시 등록해야 한다: `./setup-mac.command`(설치된 정식판·Beta 모두 등록; `ILLUSTRATOR_APP_DIR`를 지정하면 해당 앱만).
- 한글 이름은 일러(`$.evalFile`)와 헬퍼 로드가 된다고 베타 Mac에서 확인했다. Windows에서는 아직 확인하지 않았다.
- JSX 실행은 2026 CEP MCP의 `illustrator_execute_script`를 쓴다. 한글 경로도 먼저 이 경로로 확인한다. 옛 osascript 기반 MCP의 경로 제한 때문에 AppleScript로 우회하지 않는다.

## Dialog Option Persistence (required)

Any script with a dialog must remember the options from the last run and preselect them next time. Apply this to every new script and to any existing script whose dialog gains options.

- Store with `app.preferences.setStringPreference(PREF_KEY, ...)` and read back with `getStringPreference`. No settings files.
- `PREF_KEY` is `"<ScriptName>/settings"` (e.g. `"ObjectSphere/settings"`).
- Serialize as a `|`-joined string starting with a version tag: `["v1", countA, countB, angle].join("|")`. Bump the tag whenever the field layout changes; on load, ignore any value whose tag or field count does not match, so an old string falls back to defaults instead of corrupting the dialog.
- Save on confirm only. Cancel must not overwrite the stored options.
- Validate every restored value against the same range the dialog enforces before applying it.
- Wrap reads and writes in `try/catch`; a preference failure must never block the script.

Reference implementations: `스크립트/06_도형/원 입체.jsx`(구 탭), `스크립트/06_도형/그래프·표.jsx`(축 눈금 탭), `스크립트/02_화학/입자 모형.jsx`(원자 탭).

## Movable Preview (required)

옵션을 조절해서 결과를 최종 결정하는 다이얼로그는 예외 없이 미리보기를 가진다. 체크박스 하나짜리 모달도 마찬가지다.

- 다이얼로그를 여는 즉시 미리보기를 그리고, 옵션이 바뀔 때마다 다시 그린다. 확인을 눌러야 결과를 볼 수 있는 다이얼로그는 만들지 않는다.
- `미리보기` 체크박스를 두어 끌 수 있게 한다. 끄면 미리보기를 지우고 원본을 원래 상태로 되돌린다.
- **미리보기는 반드시 옮길 수 있어야 한다.** 작업 대부분이 트레이싱이라, 밑그림과 겹쳐 놓고 맞춰봐야 위치를 정할 수 있다. `위치` 패널에 `가로`·`세로`(mm) 행을 넣는다.
- 위치 이동은 도형을 다시 만들지 않고 미리보기 그룹만 `translate()`로 옮긴다. 다시 만들면 느리고, 액션을 쓰는 스크립트는 눈에 띄게 끊긴다.
- 취소하거나 창을 닫으면 미리보기를 모두 지우고 원본을 되돌린다. 확인을 누르면 미리보기가 그대로 결과가 된다.
- 이동값도 다이얼로그 옵션이므로 Dialog Option Persistence 규칙대로 저장한다.

Reference implementations: `스크립트/03_생명과학/가계도.jsx`(`bindPositionRow`), `스크립트/06_도형/영역 중괄호.jsx`.

## Dialog Layout (required)

일러스트레이터 패널처럼 **1단**으로 쌓는다. 패널을 좌우로 나란히 두지 않는다.

- 창 높이는 `win.layout.layout(true)` 뒤 `win.size.height` 기준 900 이하. 넘으면 체크박스를 한 행에 2~3개씩 묶거나 설명문을 `helpTip`으로 옮겨 줄인다. 그래도 넘는 경우에만 2단 유지(현재 `가계도.jsx` 하나).
- 체크박스·버튼 격자(원소 기호, 정렬 위치 등)는 1단 규칙과 무관하다.
- 숫자 조절 행은 예외 없이 `라벨 | 입력창 | 스크롤바` 순서다(`등각 투상도 상자.jsx`가 기준). 라벨에는 단위·콜론을 붙이지 않는다(2026-10-09 변경: 단위는 마우스를 올리면 뜨는 툴팁). 별도 단위 텍스트도 두지 않는다. 숫자 입력창은 기본 4자·46px이고 부호·소수·큰 범위가 필요한 칸만 해당 범위의 값을 표시할 만큼 늘린다. 가장 넓은 숫자 칸에 맞춰 다른 칸까지 늘리지 않는다. 스크롤바 폭은 118px. 입력창 왼쪽 라벨은 공백을 0.5자로 계산해 6자 이하로 줄인다(패널 제목·독립 체크박스는 제외). 원래 문구는 툴팁에 남기고 `00_세팅/ui_label_aliases.json`에서 짧은 이름을 관리한다. UI 관리 카탈로그·덮어쓰기를 적용한 뒤 축약해 기존 `orig`·경로는 유지한다. 전체 점검은 `python3 tools/audit-input-labels.py`.
- 대화상자 다이어트는 `ui_tab_helper.jsxinc`의 `compactDialog`가 `bindTabOrder(win)` 안에서 한다: 라벨의 `(단위)`·콜론 제거(툴팁으로), 스크롤바 폭 118 이하, 라벨 칸을 글자 폭에 맞춤, 창·패널 여백과 간격 축소, 확인·취소 폭 64 고정·오른쪽 정렬. 그래서 새 스크립트는 예전 방식(`크기 (mm):`, 196)으로 써도 창은 줄어들지만, 처음부터 위 기준으로 쓰는 게 좋다. 줄이기만 하고 늘리지는 않는다. 끄려면 `$.global.__noCompact = true`(검증용).
- 좌우 여백 맞추기(2026-10-14): 창 폭은 가장 넓은 줄(겹쳐 쌓은 탭 페이지는 가장 넓은 페이지)이 정해서 좁은 줄은 오른쪽이 빈다. 그래서 `bindTabOrder`가 부르는 `stretchRowsOnShow`가 창이 뜬 뒤 숫자 행의 스크롤바, 폭 200 이상으로 지정한 입력칸·안내문, 아래 줄의 가운데 빈칸(`alignment` fill인 빈 그룹)을 패널 안쪽 오른쪽 끝까지 늘린다. 창 폭은 바꾸지 않고, 가로로 나란히 놓인 줄은 건드리지 않는다. 첫 칸이 체크박스인 숫자 행도 숫자 행으로 보아 라벨 칸·`(단위)` 정리·R 정렬을 같이 한다. ScriptUI는 레이아웃이 한 번 잡히면 `preferredSize`로 늘어나지 않으므로 `maximumSize` → `minimumSize` 순서로 건다(최소폭이 최대폭에 잘린다). 패널은 margins보다 오른쪽을 조금 더 남기므로(Mac 4pt) 패널을 채우는 높이 0 그룹으로 잰다.
- 스크롤바 오른쪽에는 예외 없이 `R` 버튼(폭 34, `helpTip` "처음 값으로 되돌리기")을 둬 그 행을 처음 값으로 되돌린다. 처음 값은 **저장값을 복원하기 전의 값**이라, `readSettings`/`applySettings` 호출 직전에 따로 잡아 둔다(`전자기 유도.jsx`의 `DEFAULTS`). 클릭은 입력창에 같은 숫자를 친 것과 같은 `commit` 경로를 탄다. 선택한 개체에서 계산되는 값은 계산식을 복원 전 값으로 재현하고, 재현할 수 없으면 `R`을 만들지 않는다. 입력창·스크롤바를 끄고 켜는 코드는 `R`도 같이 처리한다. `0` 버튼은 쓰지 않는다.
- **제목이 있는 모든 옵션 패널은 접을 수 있다(2026-10-16).** `bindTabOrder(win)`이 `bindPanelFolds(win)`을 불러 제목 줄 오른쪽에 삼각형 아이콘을 그린다(펼침 ▼ / 접힘 ▶). 제목 줄을 클릭하면 전환되고 별도 버튼 행은 없다. 입력칸이 없어 `bindTabOrder`를 쓰지 않는 창도 헬퍼를 읽고 `show()` 직전에 `bindPanelFolds(win)`을 부른다. 접힌 상태는 `app.preferences`의 `Fold/Auto/<창 제목>/<요소 경로>`에 즉시 저장한다. 기존 `makeCollapsiblePanel(parent, 제목, 기본으로 접힘, 저장키)` 호출·`Fold/<키>`·body 구조·UI 덮어쓰기 경로는 유지한다. 접으면 자식의 표시·높이 제약을 보관하고 패널 높이를 22로 줄이며, 펼치면 복원한다. 탭 없는 창의 폭은 유지한다. 탭이 있는 창은 현재 탭의 내용에 맞춰 가로·세로를 함께 다시 계산한다. 겹쳐 쌓은 페이지(`stack`)와 기본 `tabbedpanel` 모두 현재 탭만 높이에 포함한다. 숨긴 페이지는 높이를 0으로, 자손의 너비도 0으로 제한하고 선택하면 원래 제약·실제 컨트롤 크기를 복원한다. 드롭다운의 ListItem은 크기 저장에서 제외한다. 0폭에서 복원된 macOS 스크롤바는 visible을 잠깐 껐다 켜 다시 그린다. 탭 전환 직후에도 창·하단 버튼 위치를 다시 계산한다. 최초 접기 상태는 기존 `onShow`가 비활성 탭을 숨기기 전에 적용해야 자식 표시 상태가 올바르게 복원된다. 패널의 `onDraw`는 바꾸지 않는다. Illustrator에서 내부 그룹의 라벨·체크박스·스크롤바가 사라지므로 기본 렌더링을 유지하고 제목 문자열 오른쪽에 삼각형을 붙인다. 검증용으로 `$.global.__noPanelFolds = true`면 끈다.
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

- 선택이 비면 알림 없이 마지막에 쓴 틀 크기, 없으면 기본 크기로 활성 대지 가운데에 그린다. 선택 없는 실행에서는 저장된 `위치` 이동값을 적용하지 않고 가로·세로 0으로 시작한다. 취소하면 저장값은 유지하고 확인할 때만 0 또는 이번에 조절한 값을 저장한다.
- 선택이 비어 있지 않은데 맞지 않으면(원이 아닌 타원, 사각형 둘 등) 이유를 알리고 끝낸다.
- 틀 크기는 `PREF_KEY + "/frame"` 키에 `v1|너비mm|높이mm`(원은 지름을 둘 다에)로 저장한다. 확인할 때만, 틀이 실제 선택에서 왔을 때만 저장한다. 기존 설정 문자열 형식은 건드리지 않는다.
- 화면 중심 대신 활성 대지 중심을 사용한다. 공통 헬퍼의 `getScriptStartCenter(doc)`는 실행 시작 시 선택이 없으면 대지 중심을 반환하고 선택이 있으면 기존 뷰 기준을 유지한다. `bindTabOrder`가 위치 행을 0으로 초기화하며 미리보기가 선택을 바꾸기 전의 상태로 판단한다.
- 원본을 숨기거나 지우거나 되살리는 코드는 원본이 `null`이어도 안전해야 한다. 기본 크기는 상수 하나(`DEFAULT_FRAME_MM`)로 둔다.
- 참고 구현: `스크립트/03_생명과학/방형구.jsx`, `스크립트/03_생명과학/사람의 핵형.jsx`.

## Last-Script Memo (required)

Every runnable `.jsx` under `스크립트/` records its own path so `스크립트/12_기타/마지막 실행 반복.jsx`(F4)가 그 스크립트를 다시 실행할 수 있다. 새 스크립트를 만들면 파일 맨 위(단, `#target`/`#include` 지시문 뒤)에 아래 조각을 그대로 넣는다. `마지막 실행 반복.jsx` 자신만 예외다.

```jsx
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
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
- Reference implementations: `스크립트/06_도형/그래프·표.jsx` (축 눈금 탭의 `applyAxisArrowheads`), `스크립트/06_도형/Object_setdash_align_helper.jsxinc`. To find more keys, parse `스크립트/00_세팅/cjhaction_261022.aia` — it holds real recorded values.

## Expand and Pathfinder Must Go Through the Installed Action Set

`app.executeMenuCommand` does not work for expand or pathfinder operations here. Verified failing on stroked paths: `outline`, `OffsetPath v22`, `Expand3`, and `Live Pathfinder Add` — each runs without error and changes nothing. Rebuilding the recorded `ai_plugin_expand` event as a temporary `.aia` fails the same way, so this is not the arrowhead pattern above.

What works is calling the actions `setup.jsx` installs from `스크립트/00_세팅/cjhaction_261022.aia`:

```javascript
app.doScript("확장", "최종훈");        // Object > Expand  (ai_plugin_expand + 그룹 풀기)
app.doScript("도형 합치기", "최종훈");  // Pathfinder Unite (ai_plugin_pathfinder, 추가)
```

- `expandStyle` (Object > Expand Appearance) is the one exception: the menu command works, so keep using it.
- `executeMenuCommand("ungroup")` is unreliable on nested groups: with the inner groups selected it worked on a 3-cell test but dissolved the *outer* cell groups on the real periodic table. Ungroup by script instead — move each path out bottom-most first so stacking order is kept, then remove the empty group (`flattenShapes` in `스크립트/02_화학/주기율표.jsx`):

```javascript
while (shape.pathItems.length > 0) {
    shape.pathItems[shape.pathItems.length - 1].move(shape, ElementPlacement.PLACEAFTER);
}
shape.remove();
```
- Wrap each call in `try/catch` and tell the user to re-run setup if the action set is missing.
- Do the whole chain one object at a time. Expanding several objects together leaves the selection as a flat list of all the pieces, and the later merge then has nothing meaningful to work on.
- Other useful actions in the same set: `선 두께 0.3`, `0.3 화살촉 넣기`, `화살표 확장`. Decode `cjhaction_261022.aia` (UTF-8 hex) to see the full list.
- Reference implementation: `스크립트/03_생명과학/세포분열.jsx` (세포 주기 탭의 `outlineArrows`, `applyExpandAction`).

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
- Reference implementation: `스크립트/02_화학/주기율표.jsx` (`applyGradientFill`, `tintBevelGradients`).

## Preview Performance

One DOM call costs 0.1-0.25 ms and `app.redraw()` over a few hundred gradient paths costs ~50 ms, so a preview that rewrites every path on each slider tick lags. Measured on 주기율표: 150-280 ms per tick before, ~60 ms after.

- Draw one prototype per distinct shape and `duplicate(target, ElementPlacement.PLACEATEND).translate(dx, dy)` the rest (3 calls per copy). Keeping the shape in its own subgroup lets text frames stay while the shape is swapped.
- Use `pathItems.roundedRectangle()` / `rectangle()` instead of writing anchors and handles point by point (1 call vs 30+).
- Read a group's parts into a name → item map in one pass instead of scanning by name for each part. Re-read after `add`/`move`/`remove`; references can go stale.
- Skip work when the value did not change (gradient tint, text size, path geometry). Cache the last drawn key per object.
- Benchmark in Illustrator through the 2026 CEP MCP: copy the script, replace `win.show()` with a short option sweep timed by `new Date().getTime()` (not `$.hiresTimer`), run via `illustrator_execute_script`, and compare PNG exports. Split cases into short calls; do not use osascript or AppleScript-based MCP runners.

## Tabbed Script Bundles

관련 스크립트는 한 창의 탭으로 묶는다(`3D.jsx`, `입자 모형.jsx`, `결정 구조.jsx`, `DNA 모형.jsx`, `역학.jsx`, `그래프·표.jsx`). 두 가지 구조가 있다.

- 옵션을 공유하는 묶음(3D 라인·입자 모형·결정 구조): 공용 상태·패널은 IIFE 최상위, 탭별 상태·행·기하는 `makeXEngine()` 클로저 안. 엔진 인터페이스는 파일 머리 주석에 있다.
- 서로 다른 다이얼로그를 그대로 담는 묶음(DNA 모형·역학·그래프·표): 원본 스크립트 본문이 `addRows(page)` 안에 그대로 들어가고, 창·푸터·show 부분만 `api.setPreview/updatePreview/clearPreview/commit` 훅으로 바뀐다. 각 탭의 저장 키(`PREF_KEY`)는 원래 것을 그대로 쓴다. 선택이 맞지 않는 탭은 `addRows`가 안내문을 돌려주고 호스트가 탭을 끈다.
- 탭 줄(`tabbedpanel`)은 탭 수만큼 폭을 차지해 창이 넓어진다(5개면 약 500, 11개면 1000 넘게). 2026-10-09부터 새 묶음은 `tabbedpanel` 대신 선택 줄 + 겹쳐 쌓은 페이지를 쓴다: 탭 선택 줄은 라디오 버튼이 기본이고, 라디오 줄이 너무 넓을 때만 드롭다운(판정은 `ui_tab_helper.jsxinc`의 `tabSelectorNeedsDropdown(labels)`, 글자 수로 600px 넘는지 어림, 2026-10-16), 페이지는 `stack` 그룹에 쌓고 레이아웃을 잡은 뒤 선택되지 않은 페이지를 숨긴다(`역학.jsx`, `공통수학.jsx` 참고). 기존 묶음은 `tools/tabs-to-selector.py`로 호스트 틀이 같은 것만 변환했다.
- ScriptUI `tabbedpanel.selection`(Tab)에는 `index`가 없다. 제목(`text`)을 라벨과 비교해 찾는다.
- Node 테스트는 스코프를 평탄화해 공통 함수가 엔진 상수를 쓰는 오류를 못 잡는다. 통합 뒤에는 일러에서 탭마다 미리보기를 그려 확인한다.
- **창을 줄일 때 `layout()`을 미리 부르지 말 것**: 한 번 레이아웃이 잡히면 ScriptUI가 늘어난 크기를 `preferredSize`로 굳혀서 이후에 줄여도 창이 줄지 않는다(2026-10-09 측정: 탭 호스트가 먼저 레이아웃을 잡아 `compactDialog`가 스크롤바·버튼을 줄이지 못함). 선택되지 않은 페이지는 `win.onShow`에서 숨긴다. 크기를 줄이는 속성은 `preferredSize`와 `maximumSize`를 함께 건다.
- 안내 홈페이지도 같은 구조다. 묶음을 만들거나 탭을 더하면 `docs/assets/app.js`의 그 항목에 `tabs`(필요하면 묶음 공통 옵션 `shared`, 선택 조건 `requires`)를 맞춘다. 목록 → 묶음 안내(`#script/<id>`) → 탭 세부(`#script/<id>/<탭id>`) 세 단계로 그려지고, 탭 이름(`name`)은 스크립트의 탭 라벨과 같게 둔다. 어드민의 세부 설명·이미지는 탭까지 따로 저장하므로(`content.json`의 `details["<id>/<탭id>"]`) 탭 `id`는 바꾸지 않는다.

## Verifying in Illustrator Without Freezing It (required)

2026-10-14 확정: 이 프로젝트는 **Illustrator 2026의 CEP MCP 직접 연결을 우선 사용**한다. CLI-Anything은 같은 CEP 서버를 이용하는 명령줄·반복 작업용 보조 도구이며, 프리징을 해결하는 별도 실행 엔진이 아니다. 이 Mac Studio의 2027 Beta는 재설치·환경설정 초기화·프로필 복사·새 macOS 계정에서도 새 문서 생성이 실패하므로 기본 검증 대상에서 제외한다.

2026-10-18 갱신(사용자 확인): 위 Mac Studio 2027 Beta의 새 문서 생성 실패는 **해결됐다.** 2027 Beta도 검증 대상으로 쓸 수 있고, 위 "제외한다"는 해결 전의 기록이다. 2027 Beta용 공식 `illustrator` MCP(`http://localhost:18412/v1/mcp`)는 사용자 설정(user scope)에 등록돼 있다. MacBook Air에는 2027 Beta만 있고 `illustrator-cep` 구성은 없으며, 공식 MCP로 일러에 연결되는 것을 확인했다(열린 모달 대화상자가 있으면 문서 조회가 막힌다). 공식 MCP에는 임의 JSX를 실행하는 도구가 없어 문서 조회·미리보기·내보내기에만 쓴다.

- **osascript로 검증하지 않는다.** `tools/illu-probe.sh`, `illustrator-run` 등 내부에서 AppleScript/`do javascript`를 사용하는 MCP도 실행·조회·PNG 검증에 사용하지 않는다. CEP 연결 실패 시 이 경로로 자동 대체하지 않고 연결 상태를 확인한 뒤 제한을 보고한다.
- MCP 등록 이름은 `illustrator-cep`, 소스는 https://github.com/jinkeda/Illustrator_MCP 이다. 설치 위치는 `~/agent/illustrator-mcp-cep`, 패널은 `~/Library/Application Support/Adobe/CEP/extensions/com.illustrator.mcp.panel`이다. 2026 번들 ID는 `com.adobe.illustrator`.
- 등록된 `illustrator-cep` MCP를 직접 호출하고 Illustrator의 `창 → 확장 프로그램 → MCP Control` 패널을 열어 둔다. 패널은 **자동 연결**되며 Connect 버튼을 요구하지 않는다. 이 Mac의 현재 경로는 MCP HTTP `http://127.0.0.1:8083/mcp` → `ws://127.0.0.1:8081` → CEP `evalScript`다. 공유 서버는 `~/agent/illustrator-cli/CEP 서버.command`로 시작한다. Codex와 CLI는 이 서버를 공유하며 8081을 사용하는 별도 stdio 서버·임시 클라이언트를 동시에 띄우지 않는다. 다른 기기는 등록된 연결 구성을 먼저 확인한다.
- 먼저 `illustrator_connection_status`에 `probe:true`를 주어 2026 버전·패널 응답·대기 작업을 확인한다. 문서 조회는 `illustrator_document`(list)/`illustrator_get_document`, JSX는 `illustrator_execute_script`, PNG는 `illustrator_export_document`를 쓴다. 실행과 결과 조회를 별도 호출로 나눈다.
- 일반 JSX 검증은 `expected_document_token`으로 테스트 문서를 지정하고 `auto_assign_ids:"off"`, `return_preview:false`를 명시한다. 상태만 읽는 JSX는 `read_only:true`로 선언한다. 자동 ID가 필요한 고수준 개체 편집에는 `off`를 일괄 적용하지 않는다. 코드는 짧은 IIFE로 감싸고 반환값은 문자열이나 작은 JSON으로 제한한다. **짧은 JSX 실행 → 결과 조회 → 별도 PNG 내보내기** 순서로 검증한다.
- 한 번에 한 경우만 짧게 실행한다(목표 5초 이내). 테스트 문서 하나를 재사용하고 사용자 문서는 수정·종료하지 않는다. PNG는 150~200%로 내보내 실제 이미지를 확인한다. 경고창은 막고 알림은 수집한다.
- 타임아웃은 실행 취소가 아니다. 응답이 없으면 후속 요청이나 같은 변경을 다시 보내지 말고 `illustrator_job_status`와 연결 상태로 미완료 작업을 확인한다. CPU가 계속 높으면 `sample`로 원인을 확인한다. 재시작이 필요하고 사용자 문서가 열려 있으면 먼저 묻는다.
- CEP도 Illustrator 내부에서 JSX를 실행하므로 긴 작업·액션·모달의 안정성을 보장하지 않는다. **`app.doScript` 액션 체인은 자동 검증하지 않고 사용자가 직접 확인**한다. ScriptUI 모달을 자동 호출해 대기하지 않는다. 레이아웃 검증은 복사본의 `onShow`에서 컨트롤 위치를 기록한 뒤 `close(2)`로 닫는다.
- 대화상자 결과 검증은 원본 대신 복사본에서 `win.show()`를 미리보기/확인 훅 실행으로 바꿔 CEP로 실행한다. 탭별로 선택을 준비하고 따로 확인한다. `setStringPreference`는 복사본에서 막아 사용자 옵션을 덮지 않는다. 전역 변수는 항상 초기화하거나 IIFE 안에 둔다.
- 과거 osascript 검증은 `AIHangMonitor`가 CPU를 계속 쓰는 프리징을 일으켰다. 2026-10-13 CEP 검증(2026 30.8.2, 서버 3.0.0/패널 1.0.2): 문서 생성 1.42초, 조회 0.09초, 짧은 JSX 0.07초, PNG 1.93초. PNG와 실행 후 재조회 정상, 감시 스레드는 대기 상태였다. 장시간 작업은 아직 미검증.
- 검증 기록: `~/agent/illustrator-mcp-install/cep-test/README.md`, PNG: 같은 폴더의 `result.png`. 설치기는 미서명 CEP 확장 로딩을 위해 CEP 10/11/12의 `PlayerDebugMode`를 1로 설정했다.
- 2026-10-14 비교: 직접 MCP 조회·짧은 읽기 JSX 각 3회 약 0.16~0.21초, PNG 약 0.20초. CLI는 같은 호출에 프로그램 시작 포함 약 0.59~0.61초였다. 위 옵션으로 삼각형 생성·글자 생성·JSON 조회·PNG를 분리 실행해 정상 응답과 마지막 미완료 작업 없음이 확인됐다. 앞선 삼각형+글자 JSX는 타임아웃이 재현됐으며 원인은 미확정이다. 자동 ID/미리보기가 원인이라고 단정하거나 장시간·모든 JSX의 안정성을 보장하지 않는다. 비교 기록: `~/agent/illustrator-cli/agent-harness/evidence/connection-comparison.md`.
- 다른 기기에서도 먼저 CEP 연결 가능 여부를 확인한다. 사용할 수 없으면 사용자에게 직접 실행·PNG 확인을 부탁한다.
- **Windows(2026-10-16 측정, 이 Windows 기기)**: 대화상자 레이아웃 검증은 **COM**(`New-Object -ComObject Illustrator.Application` → `DoJavaScript(코드)`)으로 **2027 Beta**(31.0)에 보낸다. 짧게 끝나고 20회 이상 무사고(창 하나 0.3~8초). 공식 `illustrator` MCP(2027 Beta)는 연결·문서 조회는 빠르나 **임의 JSX 실행 도구가 없어** ScriptUI 검증에는 못 쓰고 조회·내보내기용이다. `illustrator-cep`(2026)는 JSX 0.4초로 되지만 "패널 busy/미해결 요청"으로 막혔다가 몇 분 뒤 스스로 풀린 적이 있어 보조용이다. CLI-Anything은 Windows에 없고 pip에도 없다. 하니스 주의: 2027 Beta Windows에서 `show`는 `Window.prototype`이 아니라 창 인스턴스 속성이라 덮어쓰기가 먹지 않는다(창이 열린 채 멈춤). 사본 파일의 `win.show()`를 `$.global.__hookShow(win)`(onShow에서 기록 후 `close(2)`)으로 치환한다. `windowBounds`는 원점에만 화면 배율이 곱해지므로 `bounds`를 부모 따라 합산한다. 전역 `alert`를 덮어쓴 뒤 `delete`하면 원본이 사라지니 `Window.alert`로 되돌린다. ScriptUI에는 `moveAfter`/`moveBefore`가 없다(2027 Beta Windows 확인).

## Escalation

Ask before expanding scope, changing unrelated files, using multiple agents, or starting a formal design workflow.
