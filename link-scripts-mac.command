#!/bin/bash
# 일회성 설치: repo 스크립트 폴더를 Illustrator 스크립트 폴더에 심볼릭 링크로 연결 (macOS)
# 이후 repo 수정이 즉시 Illustrator에 반영됨 (새 파일은 Illustrator 재시작 필요)
# 새 최상위 폴더를 repo에 추가하면 이 스크립트를 다시 실행
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$REPO_DIR/스크립트"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "스크립트 폴더를 찾지 못했습니다: $SOURCE_DIR"
  exit 1
fi

APP_DIR="$(
  find /Applications -maxdepth 1 -type d -name 'Adobe Illustrator*' 2>/dev/null \
    | awk '
      {
        year = 0
        if (match($0, /20[0-9][0-9]/)) year = substr($0, RSTART, RLENGTH)
        print year "\t" $0
      }
    ' \
    | sort -rn \
    | head -n 1 \
    | cut -f2-
)"

if [ -z "$APP_DIR" ]; then
  echo "Illustrator 설치 폴더를 찾지 못했습니다."
  exit 1
fi

if [ -d "$APP_DIR/Presets.localized/ko_KR" ]; then
  TARGET_DIR="$APP_DIR/Presets.localized/ko_KR/스크립트"
elif [ -d "$APP_DIR/Presets/ko_KR" ]; then
  TARGET_DIR="$APP_DIR/Presets/ko_KR/스크립트"
else
  TARGET_DIR="$(
    find "$APP_DIR/Presets.localized" "$APP_DIR/Presets" -type d \( -name '스크립트' -o -name 'Scripts' \) 2>/dev/null \
      | head -n 1
  )"
  if [ -z "$TARGET_DIR" ]; then
    echo "Illustrator 스크립트 폴더를 찾지 못했습니다."
    exit 1
  fi
fi

echo "Illustrator: $APP_DIR"
echo "링크 위치: $TARGET_DIR"

link_scripts() {
  mkdir -p "$TARGET_DIR"
  for item in "$SOURCE_DIR"/*/; do
    [ -d "$item" ] || continue
    base="$(basename "$item")"
    # Illustrator 액션이 메뉴 이름을 NFC로 기록하므로 링크 이름을 NFC로 강제
    nfc="$(printf '%s' "$base" | iconv -f UTF-8-MAC -t UTF-8 2>/dev/null || printf '%s' "$base")"
    link="$TARGET_DIR/$nfc"
    if [ -L "$link" ]; then
      echo "이미 연결됨: $nfc"
      continue
    fi
    if [ -d "$link" ]; then
      # 기존 복사본 제거 후 링크로 교체
      rm -rf "$link"
    fi
    ln -s "${item%/}" "$link"
    echo "연결 완료: $nfc -> ${item%/}"
  done
}

if [ -w "$TARGET_DIR" ] || { [ ! -d "$TARGET_DIR" ] && [ -w "$(dirname "$TARGET_DIR")" ]; }; then
  link_scripts
else
  echo "관리자 권한으로 링크를 설치합니다. macOS 암호를 물을 수 있습니다."
  sudo bash -c "$(declare -f link_scripts); SOURCE_DIR='$SOURCE_DIR'; TARGET_DIR='$TARGET_DIR'; link_scripts"
fi

echo ""
echo "완료. Illustrator가 열려 있다면 재시작하세요."
