# 작업 이어가기 (HANDOFF) — 2026-10-14

다른 기기·새 세션에서 이 파일을 먼저 읽고 이어간다. 규칙의 원문은 `AGENTS.md`이고, 이 파일은 이번 세션에서 정해진 것과 다음 작업만 적는다.


## 2026-10-16 전기 회로도 확장
- 웹 `sci-illu-web/src/tools/circuit-tool.jsx` + `generators/circuit-layout.js`: 1~12개 요소(기호·각도·방향·이름·값), 병렬 구간 하나/두 가지, 대상 양 끝 전압계. 옛 top/right/bottom/left 설정은 계속 읽는다.
- 일러 `스크립트/01_물리학/전기 회로도.jsx`를 새로 추가(기존 `전기.jsx`의 직선 기호 삽입 유지). `CircuitDiagram/settings` v1 88필드, 확인만 저장·취소 복구·미리보기 이동. `tools/sync-circuit-native.py`로 웹 기하를 ES3로 동기화. Node `tests/check-circuit-layout.js`가 양쪽 기하·저장 복원을 검사.
- 웹 전체 1,001개 테스트/빌드, JSX ES3·구문·저장 roundtrip·cancel 검사 통과. 웹의 가지 전환·겹침 안내 확인. Illustrator 2026에서 5개 요소+병렬+전압계 실제 그리기·PNG 캡처 확인, 창 321×646 확인.
- **2026-10-16 마지막 확인 완료**: 사용자가 Illustrator를 저장 후 재시작. 서버에 이전 unknown 요청이 남아 공유 CEP 서버만 재시작해 정리(옛 요청 재전송 안 함). 새 호스트·새 테스트 문서에서 최신 코어+렌더러만 실행한 `/tmp/circuit-final-static.jsx` 성공(37 paths/6 texts). PNG 캡처 1200×840에서 5개 요소·병렬 두 가지·전압계·이름·값 확인. 그룹 translate(10mm,-5mm)도 도형 재생성 없이 확인.
- 테스트 문서는 저장 없이 닫고 사용자 `무제-1`을 다시 활성화했다. 최종 connection probe ready=true, 대기·미해결 작업 없음. 이전 테스트 지연 원인은 확정하지 않았으며 없던 일로 처리하지 않는다. 현재 사용자 문서 토큰은 재시작으로 달라졌으므로 이후에는 list로 새로 조회한다.
- setup-mac.command로 2026/Beta 로더 155개 등록됨. Beta 화살표 파일은 권한 부족으로 건너뜀(이번 기능은 액션·화살표 파일을 안 쓴다). 웹 검증 이미지 `/tmp/circuit-web-final.png`. 현재 변경은 푸시 전(앞선 공유 헬퍼 초성 변환 커밋도 대기).

## 0. 시작할 때
1. `git pull` 후 `./setup-mac.command`(Windows는 `setup-windows.cmd`)를 한 번 돌리고 일러를 **재시작**한다(스크립트 메뉴·액션 세트 갱신. setup이 옛 `최종훈` 액션 세트를 알아서 지운다).
2. 웹 도구 저장소: `~/agent/sci-illu-web` ← https://github.com/tgtec26/sci-illu-web (비공개). 없으면 clone 후 `npm install`.
- **일러 UI 관리:** 이 폴더의 `일러 UI 관리 페이지.command`를 더블클릭하면 서버를 실행하고 `http://127.0.0.1:5200/`을 연다. 이미 켜져 있으면 페이지를 바로 연다. 새로 실행한 서버는 터미널을 열어 두면 유지되며 Ctrl+C로 종료한다.
- **웹 UI 관리:** `../sci-illu-web/UI 관리 페이지.command`를 더블클릭하면 파일이 있는 웹 프로젝트의 개발 서버를 켜고 `http://127.0.0.1:5173/?admin`을 연다. 항목 이름·범위·기본값은 웹 화면의 라벨을 눌러 편집하고 `sci-illu-web/src/config/slider-ranges.json`에 저장한다. 페이지의 `푸시` 버튼으로 웹에 배포한다. 일러 UI 관리 서버(5200)와 구분한다.
3. 커밋 작성자는 항상 `tgtec26 <tgtec26@snu-g.ms.kr>`, 한국어로 대화·보고한다. Vercel 배포는 푸시로 자동이다.

## 1. 일하는 방식
- **새 스크립트는 먼저 기출에서 가장 흔한 형태를 조사한다.** PDF: Google Drive `03_문제 자료/02_기출문제/07_기출_타과목/물리학1 기출 합본(2008~202609).pdf`(345쪽). 키워드로 쪽을 고르고 PyMuPDF로 문제 영역을 잘라 대조표로 보고(형태별 비율)한 뒤, 가장 흔한 형태를 만든다. 기본값·세부는 사용자가 나중에 조정한다.
- **한 작업 = 일러 스크립트 + 웹 도구.**
  1. `스크립트/<과목 폴더>/<한글 이름>.jsx`(01_물리학·02_화학·03_생명과학·04_지구과학·05_수학, 과목 없는 도구는 06_도형) (폼 틀은 `열기관 순환.jsx`·`피스톤 실린더.jsx`를 복사해 시작)
  2. `tests/check-<이름>.js` (node, 함수만 잘라 가짜 도구로 좌표 검사)
  3. **일러에서 실제 실행해 PNG 확인**(아래 3절)
  4. `docs/assets/app.js`에 홈페이지 항목 추가(`id` 영문, `file` 한글 파일명)
  5. 커밋·푸시 → 웹: `src/generators/<id>.js` + `.test.js` + `src/tools/<id>-tool.jsx` + `registry.js` + `catalog.js` → `npm test`, `npm run build`, `npm run guide`(AI 안내서 재생성) → 푸시
- **푸시 조건:** 테스트 통과 + `git diff --check` + 일러 실행 PNG 확인. `setup*`·공유 `.jsxinc`·스크립트 삭제/이름 변경은 푸시 전에 묻는다(사용자가 지시했으면 그대로).
- **사용자 질문엔 먼저 솔직히 답한다**("일부러 그런 건가?"에 변명하지 않고 원인과 실수를 말한 뒤 고친다). 지시한 것은 바로 반영하고, 기본값 조정은 사용자가 한다. 확인 못 한 것은 숨기지 말고 보고한다.

## 2. 이번에 확정된 코딩 규칙
- **화살촉은 액션(.aia) 금지.** 측정한 일러 화살촉 4종(`HEAD_CATALOG`, `tools/arrowheads.json`)을 드롭다운(작살형 1·기본, 제비꼬리 2, 삼각형 3, 꺾쇠 4) + 크기 %로 직접 그린다. 선은 `lineEnd`만큼 줄이고 촉은 채운 도형. 곡선 끝은 `cutPathEnd`(베지어 분할). 그래프 **축 화살촉은 작살형**. 기존 11개 스크립트도 모두 전환 완료(`tests/check-drawn-heads.js`).
- **`var HEAD_CATALOG`는 대화상자를 띄우는 `show()`보다 위에 선언**한다(아래에 두면 미리보기 때 undefined가 되고 오류가 try/catch에 삼켜져 아무것도 안 그려짐).
- **곡선은 점을 찍은 꺾은선이 아니라 에르미트 베지어 + 오차 분할로 앵커를 적게** 만든다(열기관 순환: 156개 → 6개). 수동 편집 때문.
- **숫자 입력은 슬라이더(+입력창+R 버튼)** 규칙을 지킨다. 텍스트 입력은 글자일 때만.
- 점 배치는 쏠리지 않게 **후보 격자 + 가장 먼 점 차례로 고르기**(`spreadDots`).
- 글자 서체·대화상자 레이아웃·미리보기 이동·옵션 저장(v1 태그)은 `AGENTS.md`.

## 3. 일러 실행 검증 — 2026 CEP MCP 직접 연결 우선
- **Illustrator 2026 + `illustrator-cep` MCP를 직접 호출한다. osascript·`tools/illu-probe.sh`·AppleScript 기반 MCP로 검증하지 않는다.** 연결이 안 되면 상태를 점검하고 보고하며 osascript로 자동 우회하지 않는다.
- 2026에서 `창 → 확장 프로그램 → MCP Control`을 열어 둔다. 패널은 자동 연결이며 Connect 버튼은 없다. 이 Mac의 경로: MCP HTTP `http://127.0.0.1:8083/mcp` → `ws://127.0.0.1:8081` → CEP `evalScript`. `~/agent/illustrator-cli/CEP 서버.command`로 공유 서버 한 개만 실행한다. Codex·CLI가 같은 서버를 공유하며 별도 stdio 서버를 동시에 띄우지 않는다. 다른 기기는 등록 구성을 먼저 확인한다.
- CLI-Anything은 명령줄·반복 작업용 보조 도구다. CEP MCP와 실행 경로가 같아 CLI 자체가 프리징을 해결하지 않는다. 공식 MCP는 이 Mac에서 Beta 연결이며 2026 대체용으로 미검증이다.
- 연결 점검: `illustrator_connection_status`(`probe:true`). 문서 조회: `illustrator_document` list / `illustrator_get_document`. JSX 실행: `illustrator_execute_script`. PNG: `illustrator_export_document`(150~200%) 후 실제 이미지 확인.
- 일반 JSX는 `expected_document_token` 지정, `auto_assign_ids:"off"`, `return_preview:false`로 짧은 IIFE를 실행하고 문자열/작은 JSON만 반환한다. 조회 JSX는 `read_only:true`. 자동 ID가 필요한 고수준 개체 편집에는 off를 일괄 적용하지 않는다. **실행 → 결과 조회 → 별도 PNG 내보내기**로 나눈다.
- 테스트 문서 하나를 재사용하고, 호출은 한 경우씩 목표 5초 이내로 나눈다. 사용자 문서와 저장 옵션은 건드리지 않는다. 타임아웃 시 재전송하지 말고 `illustrator_job_status`로 미완료 작업을 확인한다. 액션(`app.doScript`)과 모달은 자동 검증하지 않고 사용자 확인을 받는다.
- 대화상자 스크립트는 복사본에서 `win.show()`를 미리보기/확인 훅 호출로 바꿔 CEP로 실행한다. 필요한 선택을 만들고 탭마다 별도 확인한다. 알림과 설정 저장은 복사본에서 막는다. 레이아웃은 `onShow`에서 기록 후 `close(2)`로 닫는다.
- 설치: `~/agent/illustrator-mcp-cep` (jinkeda/Illustrator_MCP, 서버 3.0.0 / 패널 1.0.2). 기록: `~/agent/illustrator-mcp-install/cep-test/README.md`.
- 2026-10-13 실측: 문서 생성 1.42초, 조회 0.09초, 짧은 JSX 0.07초, PNG 1.93초. PNG·후속 조회 정상, 프리징 없음, AIHangMonitor 대기. 긴 스크립트의 안정성은 미검증.
- **Windows(2026-10-16 측정, 이 Windows 기기)**: 대화상자 레이아웃 검증은 **COM**(`New-Object -ComObject Illustrator.Application` → `DoJavaScript(코드)`)으로 **2027 Beta**(31.0)에 보낸다. 짧게 끝나고 20회 이상 무사고(창 하나 0.3~8초). 공식 `illustrator` MCP(2027 Beta)는 연결·문서 조회는 빠르나 **임의 JSX 실행 도구가 없어** ScriptUI 검증에는 못 쓰고 조회·내보내기용이다. `illustrator-cep`(2026)는 JSX 0.4초로 되지만 "패널 busy/미해결 요청"으로 막혔다가 몇 분 뒤 스스로 풀린 적이 있어 보조용이다. CLI-Anything은 Windows에 없고 pip에도 없다. 하니스 주의: 2027 Beta Windows에서 `show`는 `Window.prototype`이 아니라 창 인스턴스 속성이라 덮어쓰기가 먹지 않는다(창이 열린 채 멈춤). 사본 파일의 `win.show()`를 `$.global.__hookShow(win)`(onShow에서 기록 후 `close(2)`)으로 치환한다. `windowBounds`는 원점에만 화면 배율이 곱해지므로 `bounds`를 부모 따라 합산한다. 전역 `alert`를 덮어쓴 뒤 `delete`하면 원본이 사라지니 `Window.alert`로 되돌린다. ScriptUI에는 `moveAfter`/`moveBefore`가 없다(2027 Beta Windows 확인).

- 2026-10-14 비교: 직접 MCP 조회·짧은 읽기 JSX 약 0.16~0.21초(각 3회), PNG 약 0.20초. CLI는 프로그램 시작 포함 약 0.59~0.61초. 위 옵션으로 삼각형·글자 생성·JSON 조회·PNG를 나눠 실행해 성공했고 마지막 연결 정상·미완료 작업 없음. 앞선 삼각형+글자 JSX 타임아웃 원인은 미확정이며 모든 JSX/장시간 안정성을 보장하지 않는다. 기록: `~/agent/illustrator-cli/agent-harness/evidence/connection-comparison.md`.

## 4. 지금까지 한 것 (물리학Ⅰ 기출 조사 목록)
| 순위 | 항목 | 상태 |
|---|---|---|
| ① | 도르래·빗면·수레 | 완료 `역학 장치.jsx`(수평면·빗면·두 빗면·물체 탭) |
| ② | 에너지 준위 | 완료 `에너지 준위.jsx`(축·E₀/eV/Eₙ·전이·양자수) |
| ③ | P–V 순환 | 완료 `열기관 순환.jsx`(등압·등적·등온·단열 조합, 세 가지 축) |
| ③ | 피스톤 실린더 | 완료 `피스톤 실린더.jsx`(가로 실린더·칸 A/B/C·분자 점·단열 지시선·열 Q). **세로 실린더+모래(약 20%)는 미구현** |
- 모두 웹 도구가 있다. 이 세션의 큰 변경: 화살촉 액션 제거(76498c7), 확장 화살표 헬퍼 죽은 코드 삭제(eeaec38), `setup.jsx`가 `최종훈` 세트 중복을 정리(3fef9c5).

## 5. 다음 작업 (이 순서)
1. **④ 자기장 영역(×·●)+도선 고리(전자기 유도, 기출 73쪽)** — 먼저 PDF에서 흔한 형태를 조사해 보고한 뒤 만든다.
2. ⑤ 광전관 장치 + 광전류–전압 그래프(54쪽) ⑥ 전하 배열·전기장(100쪽) ⑦ 막대 평형(돌림힘) ⑧ p–n 접합·LED 회로 ⑨ 핵반응 모식도
3. 선택: 피스톤 실린더 세로형(모래), 세포분열 세포 주기 `expandArrows` 옵션 실사용 확인(사용자가 "잘 된다"고 확인함).

## 6. 알려진 상태
- `tests/*.js` 중 **변경 전부터 실패하던 4개**: `check-arrowhead-shapes`, `check-crystal-sizes`, `check-math-heads`, `check-script-safety`. 새로 깨뜨린 것은 없다. 나머지는 `for f in tests/*.js; do node $f || echo FAIL $f; done`로 확인.
- 이 Mac의 기본 검증 앱은 Illustrator **2026 30.8.2**(`com.adobe.illustrator`), 연결은 `illustrator-cep`. 2027 Beta는 새 문서 생성 실패로 기본 대상에서 제외한다(재설치·설정 초기화·프로필 복사·새 macOS 계정으로도 미해결).
- 일러에 스크립트 로더를 다시 등록해야 할 때: `./setup-mac.command`(설치된 정식판·Beta 모두 등록; `ILLUSTRATOR_APP_DIR`를 지정하면 해당 앱만).
- Windows도 베타는 연도가 없어 자동으로 못 고르고 2026 폴더에 등록된다(액션의 "메뉴 항목" 단계가 `파일 > 스크립트` 메뉴를 찾지 못해 "현재 사용할 수 없습니다"가 뜸): `setup-windows.cmd -IllustratorAppDir "C:\Program Files\Adobe\Adobe Illustrator (Beta)" -IllustratorVer "31.0.0 Beta"`. 베타 `Presets\ko_KR\스크립트` 폴더를 일러가 읽는다(2026-10-12 Windows 베타에서 메뉴·액션 F12 확인).

## 7. 2026-10-11 밤 작업 (사용자 취침 중, 일러 실행 검증 전 · 푸시 안 함)
일러가 문서를 못 만들어(`app.documents.add` → `WENE`, MCP `CreateDocument`도 같은 오류) 실행 검증을 못 했다. **커밋만 했고 푸시하지 않았다.** 현재는 2026 CEP MCP로 아래를 하나씩 실행·PNG로 확인하고 푸시한다. 아래 목록은 당시 기록이며 검증 완료를 뜻하지 않는다.
- 기출 조사: 물리Ⅱ·화학Ⅰ·Ⅱ·지구과학Ⅰ·Ⅱ 각 PDF에서 단순하고 결정이 쉬운 그림부터 골랐다(지구과학은 사진·지도·천기도가 많아 스크립트로 만들 수 있는 그림이 적다). 복잡한 그림(지층 단면, 일기도, 포물선 운동, 회로 전체 등)은 미뤘다.
- 새 스크립트 11개(전부 도형 폴더에서 과목 폴더로 분배됨, 테스트 `tests/check-*.js`, 홈페이지 `docs/assets/app.js` 항목 포함, 웹 도구는 2026-10-16에 추가 — sci-illu-web `generators/form-tools.js`가 폼 틀의 `t` 도구를 같은 이름으로 주고 각 도구는 원본 controls·draw를 그대로 옮김. 루이스 전자점식은 기존 `lewis-dots`):
  | 과목 | 스크립트 | 비고 |
  |---|---|---|
  | 물리Ⅰ ④ | `자기장 영역과 고리.jsx` | 기출 전자기 유도: 영역 Ⅰ~Ⅲ(×/●)·사각 고리·점 p·속도 v·이동 고리 |
  | 물리Ⅱ | `축전기 회로.jsx` | 전지+스위치+축전기 병렬/직렬 |
  | 화학Ⅰ | `오비탈 전자 배치.jsx` | 칸+↑↓, 훈트 규칙 / 칸 순서대로 |
  | 화학Ⅰ | `루이스 전자점식.jsx` | 원소 기호+가전자 점 |
  | 화학Ⅱ | `반응 경로 에너지 도표.jsx` | 발열·흡열, 촉매 파선, Ea·ΔH |
  | 화학Ⅱ | `상평형 그림.jsx` | P–T, 삼중점·임계점, 1기압 점선 |
  | 화학Ⅱ | `화학 전지.jsx` | 두 비커+염다리+전구/전압계, 전자 방향 |
  | 지구과학Ⅰ | `H-R도.jsx` | 분광형/온도×광도/등급, 별 무리 타원, 별 점 |
  | 지구과학Ⅰ | `일기 기호.jsx` | 구름양 원+풍향·풍속 깃+기온·이슬점·기압 |
  | 지구과학Ⅰ | `반감기 그래프.jsx` | 지수 감소 베지어, 둘째 곡선 |
  | 지구과학Ⅱ | `타원 궤도.jsx` | 초점 중심 천체, 근일점·원일점, 케플러 식 행성 위치 |
- 새 스크립트는 `피스톤 실린더.jsx` 폼 틀을 복사해 만들었고 값은 모두 기본값(사용자가 조정). `tests/es3-lint.js`가 일러(ES3)가 못 읽는 문법(let/const/화살표/배열 고차 함수 등)을 막는다.
- 확인할 것(추측으로 정한 기본값): 일기 기호의 깃 붙는 쪽·구름양 부채꼴 방향, 화학 전지 염다리·전극 위치, 상평형 영역 글자 위치, H-R도 별 무리 위치, 타원 궤도 중심 천체(오른쪽 초점) 배치.
- 다음에 만들 후보: 물리Ⅱ 평행판 축전기+유전체·포물선 운동, 화학Ⅰ 비커 입자 모형(기존 `입자 모형`과 겹치는지 확인), 화학Ⅱ 기체 용기 연결(콕·피스톤), 지구과학 지층 단면·지구 복사 에너지 수지(복잡해 뒤로 미룸).
