#!/bin/bash
set -euo pipefail

REPO_URL="https://github.com/tgtec26/illu-script.git"
CACHE_DIR="$HOME/.illu-script-updater/illu-script"
SOURCE_SUBDIR="스크립트"

echo "illu-script updater (macOS)"

if ! command -v git >/dev/null 2>&1; then
  echo "Git이 필요합니다. Xcode Command Line Tools 또는 Git을 설치한 뒤 다시 실행하세요."
  exit 1
fi

if [ -d "$CACHE_DIR/.git" ]; then
  echo "GitHub 최신본 확인 중..."
  git -C "$CACHE_DIR" pull --ff-only
else
  echo "GitHub 저장소 내려받는 중..."
  mkdir -p "$(dirname "$CACHE_DIR")"
  git clone "$REPO_URL" "$CACHE_DIR"
fi

SOURCE_DIR="$CACHE_DIR/$SOURCE_SUBDIR"
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

TARGET_DIR="$(
  find "$APP_DIR/Presets.localized" "$APP_DIR/Presets" -type d \( -name '스크립트' -o -name 'Scripts' \) 2>/dev/null \
    | head -n 1
)"

if [ -z "$TARGET_DIR" ]; then
  if [ -d "$APP_DIR/Presets.localized/ko_KR" ]; then
    TARGET_DIR="$APP_DIR/Presets.localized/ko_KR/스크립트"
  else
    LOCALE_DIR="$(find "$APP_DIR/Presets.localized" "$APP_DIR/Presets" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -n 1)"
    if [ -z "$LOCALE_DIR" ]; then
      echo "Illustrator Presets 폴더를 찾지 못했습니다."
      exit 1
    fi
    TARGET_DIR="$LOCALE_DIR/Scripts"
  fi
fi

echo "Illustrator: $APP_DIR"
echo "설치 위치: $TARGET_DIR"

sync_scripts() {
  mkdir -p "$TARGET_DIR"
  for item in "$SOURCE_DIR"/*; do
    [ -e "$item" ] || continue
    name="$(basename "$item")"
    if [ -d "$item" ]; then
      mkdir -p "$TARGET_DIR/$name"
      rsync -a --delete --exclude '.DS_Store' "$item/" "$TARGET_DIR/$name/"
    else
      rsync -a --exclude '.DS_Store' "$item" "$TARGET_DIR/"
    fi
  done
}

if [ -w "$TARGET_DIR" ] || [ -w "$(dirname "$TARGET_DIR")" ]; then
  sync_scripts
else
  echo "관리자 권한으로 설치합니다. macOS 암호를 물을 수 있습니다."
  sudo bash -c "$(declare -f sync_scripts); SOURCE_DIR='$SOURCE_DIR'; TARGET_DIR='$TARGET_DIR'; sync_scripts"
fi

echo "완료. Illustrator가 열려 있다면 재시작하세요."
read -r -p "Enter 키를 누르면 닫습니다." _
