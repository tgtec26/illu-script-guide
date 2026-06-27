# Illustrator Scripts Update

이 저장소 최신 스크립트를 현재 기기 Illustrator Scripts 폴더로 복사합니다.

저장소: https://github.com/tgtec26/illu-script.git

## macOS

1. `script-action-update-mac.command` 더블클릭
2. GitHub 로그인/권한 요청이 나오면 승인
3. 관리자 암호 요청이 나오면 입력
4. Illustrator 재시작

## Windows

1. `script-action-update-windows.cmd` 더블클릭
2. 권한 확인 창이 나오면 `예` 선택
3. GitHub 로그인/권한 요청이 나오면 승인
4. Illustrator 재시작

## 동작

- GitHub 저장소 최신본을 `~/.illu-script-updater` 또는 `%USERPROFILE%\.illu-script-updater`에 받습니다.
- 최신 Illustrator 설치 폴더를 자동으로 찾습니다.
- `스크립트` 폴더 안의 카테고리 폴더만 Illustrator Scripts 폴더에 동기화합니다.
- 다른 사용자가 따로 넣은 루트 스크립트는 건드리지 않습니다.

## 필요 조건

- Git 설치 필요
- 저장소가 private이면 GitHub 접근 권한 필요

## 새 PC 최초 세팅 (전체)

스크립트뿐 아니라 단축키·화살표·환경설정·액션까지 한 번에 맞춘다.

### 1. 파일 복사 (단축키 + 화살표 + 스크립트)

- macOS: 일러스트를 **종료**한 상태에서 `full-update-mac.command` 더블클릭 (← 전체 세팅 전용)
- Windows: 일러스트를 **종료**한 상태에서 `full-update-windows.cmd` 더블클릭 (← 전체 세팅 전용)
- 권한 확인 창이 나오면 `예`
- 동작: GitHub 최신본 → 스크립트(`Scripts` 폴더), 단축키(`cjh250907.kys` → 설정 폴더), 화살표(`화살표.ai` → 설치 폴더 Resources) 복사
- (참고) `full-update-mac.command` = `script-action-update-mac.command --full` 호출 런처. 터미널에서 `script-action-update-mac.command --full` 해도 동일. 그냥 `script-action-update-mac.command`(더블클릭)는 **스크립트만** 갱신.
- (참고) `full-update-windows.cmd` = `script-action-update-windows.ps1 -Full` 호출 런처. 터미널에서 `script-action-update-windows.cmd -Full` 해도 동일. 그냥 `script-action-update-windows.cmd`(더블클릭)는 **스크립트만** 갱신.

### 2. 환경설정 + 액션 적용

- 일러스트 실행 → **파일 > 스크립트 > setup** 실행
- 적용: 단위 mm · 키 증감 0.05mm · 문자 크기/행간 증감 1pt · 고정점/핸들 최대 · 기본 액션 제거 후 내 액션 로드
- 실행 후 뜨는 alert에서 적용값 확인

### 3. 단축키 세트 선택 (1회)

- 편집 > 키보드 단축키 → 세트에서 `cjh250907` 선택

### 4. 일러스트 재시작

- 단위·문자 증감 등 일부 항목은 재시작 후 반영됨

> 참고: 단위/액션 값은 기존 PC에서 추출해 그대로 복제한 값이다. 설정을 바꾸면 `스크립트/00_세팅/setup.jsx`의 값과 `cjh250907.kys`·`화살표.ai`를 다시 떠서 갱신한다.
