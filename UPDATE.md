# Illustrator Scripts Update

이 저장소 최신 스크립트를 현재 기기 Illustrator Scripts 폴더로 복사합니다.

저장소: https://github.com/tgtec26/illu-script.git

## macOS

1. `update-mac.command` 더블클릭
2. GitHub 로그인/권한 요청이 나오면 승인
3. 관리자 암호 요청이 나오면 입력
4. Illustrator 재시작

## Windows

1. `update-windows.cmd` 더블클릭
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
