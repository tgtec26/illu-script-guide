# 스크립트 패널 (임시 대체 패널)

마켓플레이스의 Loader Script Panel이 일러스트레이터 2027 베타와 호환될 때까지 쓰는 CEP 패널이다.
폴더·스크립트 아이콘의 폴더 트리, 폴더 지정·새로고침 아이콘 버튼, 검색, 즐겨찾기(★, 손잡이를 끌어 순서 변경), 클릭해서 실행, 다크·화이트 테마 전환을 지원한다. 설정(폴더, 즐겨찾기, 열린 폴더, 테마)은 패널의 localStorage에 저장된다.

## 설치 (Mac, 한 번만)
1. 서명 없는 패널을 불러오도록 개발자 모드를 켠다: `defaults write com.adobe.CSXS.12 PlayerDebugMode 1 && defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
2. 이 폴더를 확장 폴더에 연결한다: `ln -sfn "$PWD" ~/Library/Application\ Support/Adobe/CEP/extensions/com.snug.scriptpanel`
3. 일러를 껐다 켜고 `창 > 확장 프로그램 > 스크립트 패널`을 연다.

처음에는 `~/agent/illu-script-guide/스크립트`가 있으면 그 폴더를 쓰고, 없으면 `폴더 지정`으로 고른다.

## 개발
- 일러 쪽 함수는 `host.jsx`(`spListScripts`, `spRun`, `spPickFolder`, `spDefaultRoot`), 화면은 `index.html`·`main.js`다.
- 패널 안을 들여다보려면 `.debug`(`<Host Name="ILST" Port="8099"/>`)를 임시로 만들고 패널을 다시 연 뒤 `localhost:8099/json`의 `webSocketDebuggerUrl`로 DevTools 프로토콜에 붙는다(DOM 읽기·스크린샷). 끝나면 지운다.
