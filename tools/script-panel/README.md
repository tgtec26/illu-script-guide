# 스크립트 패널 (임시 대체 패널)

마켓플레이스의 Loader Script Panel이 일러스트레이터 2027 베타와 호환될 때까지 쓰는 CEP 패널이다.
폴더·스크립트 아이콘의 폴더 트리, 폴더 지정·새로고침 아이콘 버튼, 검색, 즐겨찾기(★, 손잡이를 끌어 순서 변경), 클릭해서 실행, 다크·화이트 테마 전환을 지원한다. 설정(폴더, 즐겨찾기, 열린 폴더, 테마)은 패널의 localStorage에 저장된다.

## 설치 (Mac, 한 번만)
1. 서명 없는 패널을 불러오도록 개발자 모드를 켠다: `defaults write com.adobe.CSXS.12 PlayerDebugMode 1 && defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
2. 이 폴더를 확장 폴더에 연결한다: `ln -sfn "$PWD" ~/Library/Application\ Support/Adobe/CEP/extensions/com.snug.scriptpanel`
3. 일러를 껐다 켜고 `창 > 확장 프로그램 > 스크립트 패널`을 연다.

## 설치 (Windows)
`setup-windows.cmd`를 실행하면 스크립트 등록과 함께 패널도 설치된다(개발자 모드 레지스트리 + `%APPDATA%\Adobe\CEP\extensions\com.snug.scriptpanel` 폴더 연결). 일러를 다시 켜고 `창 > 확장 프로그램 > 스크립트 패널`을 연다. 처음 경로는 setup이 내려받은 사본(`~/.illu-script-updater/illu-script-guide/스크립트`)을 먼저 찾고, 없으면 `폴더 지정`으로 고른다.

처음에는 `~/agent/illu-script-guide/스크립트`가 있으면 그 폴더를 쓰고, 없으면 `폴더 지정`으로 고른다.

## 개발
- 일러 쪽 함수는 `host.jsx`(`spListScripts`, `spRun`, `spPickFolder`, `spDefaultRoot`), 화면은 `index.html`·`main.js`다.
- 패널 안을 들여다보려면 `.debug`(`<Host Name="ILST" Port="8099"/>`)를 임시로 만들고 패널을 다시 연 뒤 `localhost:8099/json`의 `webSocketDebuggerUrl`로 DevTools 프로토콜에 붙는다(DOM 읽기·스크린샷). 끝나면 지운다.

## 패널에서 업데이트

패널을 열면 현재 브랜치가 추적하는 원격을 fetch하여 로컬·원격 커밋과 새 커밋 수를 표시한다. 이후 5분마다 자동 점검하며, 패널로 돌아올 때도 마지막 점검에서 1분 이상 지났으면 다시 확인한다. 네트워크·인증 실패를 최신 상태로 표시하지 않는다. Git과 기존 GitHub 접근 권한이 필요하다.

원격에만 새 커밋이 있으면 검색창 바로 오른쪽의 내려받기 모양 `업데이트` 아이콘이 켜진다. 버튼을 누르면 예약하고, **열린 작업을 저장한 뒤 Illustrator를 완전히 종료하면** 별도 프로세스가 `git pull --ff-only`와 OS별 setup을 차례로 실행한다. Windows는 설치 시 관리자 권한 확인 창에서 예를 누른다. Mac은 Terminal에서 실행하며 필요하면 관리자 암호를 입력한다. Illustrator를 자동 종료하거나 문서를 수정하지 않는다.

로컬 수정(추적되지 않은 파일 포함)·로컬 단독 커밋·갈라진 커밋은 자동으로 정리하지 않는다. 예약 후 브랜치나 파일이 바뀌어도 설치 전에 중단한다. 다른 저장소의 스크립트를 선택하면 이 프로젝트의 업데이트 버튼을 사용할 수 없다.

예약·결과·로그는 `~/.illu-script-updater/panel-jobs/<저장소별 키>/`에 남고, 다음 패널 실행 시 결과를 표시한다. 로그 경로는 버전 표시줄 툴팁에 나온다. 실패하면 원인을 해결한 뒤 다음 자동 점검을 기다리거나 패널을 다시 연다. 설치 단계에서 실패해 로컬 커밋만 최신이 된 경우에는 `설치 재시도` 버튼이 켜진다. 또는 `setup-windows.cmd` / `setup-mac.command`를 직접 다시 실행한다.

이 기능을 처음 받은 뒤에는 Illustrator를 한 번 재시작해야 한다(Node 실행 설정 적용). 설치 후 액션을 갱신해야 하는 경우의 `파일 > 스크립트 > setup` 실행 및 단축키 세트 최초 선택은 기존과 같다.
