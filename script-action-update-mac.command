#!/bin/bash
set -euo pipefail

FULL=0
for arg in "$@"; do
  case "$arg" in
    --full|-Full|-full|-f)
      FULL=1
      ;;
    *)
      echo "알 수 없는 옵션: $arg"
      echo "사용법: $(basename "$0") [--full]"
      exit 1
      ;;
  esac
done

REPO_URL="https://github.com/tgtec26/illu-script-guide.git"
CACHE_DIR="$HOME/.illu-script-updater/illu-script-guide"
SOURCE_SUBDIR="스크립트"
KYS_NAME="cjh250907.kys"
ARROW_NAME="화살표.ai"

if [ "$FULL" -eq 1 ]; then
  echo "illu-script 새 PC 세팅 (--full, macOS)"
else
  echo "illu-script updater (macOS)"
fi

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

if [[ "$(basename "$APP_DIR")" =~ (20[0-9][0-9]) ]]; then
  YEAR="${BASH_REMATCH[1]}"
  VER=$((YEAR - 1996))
else
  VER=""
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
  normalize_names
}

# APFS는 정규화를 무시하고 경로를 찾기 때문에 기존에 NFD(자모 분해형)로 설치된
# 한글 폴더명이 그대로 유지된다. Illustrator 액션은 메뉴 이름을 NFC(완성형)로
# 기록하므로 이름이 어긋나면 "현재 사용할 수 없습니다" 오류가 난다. NFC로 강제 개명.
normalize_names() {
  find "$TARGET_DIR" -depth -mindepth 1 | while IFS= read -r p; do
    base="$(basename "$p")"
    nfc="$(printf '%s' "$base" | iconv -f UTF-8-MAC -t UTF-8 2>/dev/null || true)"
    if [ -n "$nfc" ] && [ "$base" != "$nfc" ]; then
      mv "$p" "$(dirname "$p")/$nfc"
    fi
  done
}

if [ -w "$TARGET_DIR" ] || [ -w "$(dirname "$TARGET_DIR")" ]; then
  sync_scripts
else
  echo "관리자 권한으로 스크립트를 설치합니다. macOS 암호를 물을 수 있습니다."
  sudo bash -c "$(declare -f sync_scripts); $(declare -f normalize_names); SOURCE_DIR='$SOURCE_DIR'; TARGET_DIR='$TARGET_DIR'; sync_scripts"
fi

echo "  스크립트 복사 완료 -> $TARGET_DIR"

if [ "$FULL" -ne 1 ]; then
  echo "완료. Illustrator가 열려 있다면 재시작하세요."
  exit 0
fi

KYS_SRC="$CACHE_DIR/$KYS_NAME"
if [ -n "$VER" ] && [ -f "$KYS_SRC" ]; then
  SETTINGS_BASE="$HOME/Library/Preferences/Adobe Illustrator $VER Settings"
  if [ -d "$SETTINGS_BASE/ko_KR" ]; then
    SETTINGS_DIR="$SETTINGS_BASE/ko_KR"
  elif [ -d "$SETTINGS_BASE/en_US" ]; then
    SETTINGS_DIR="$SETTINGS_BASE/en_US"
  else
    SETTINGS_DIR="$SETTINGS_BASE/ko_KR"
  fi
  mkdir -p "$SETTINGS_DIR"
  cp "$KYS_SRC" "$SETTINGS_DIR/$KYS_NAME"
  echo "  단축키 복사 완료 -> $SETTINGS_DIR/$KYS_NAME"
elif [ -z "$VER" ]; then
  echo "  Illustrator 버전을 알 수 없어 단축키 복사를 건너뜀"
else
  echo "  단축키 파일 없음(건너뜀): $KYS_SRC"
fi

ARROW_SRC="$CACHE_DIR/$ARROW_NAME"
# 화살표 폴더 경로는 Illustrator 버전/플랫폼마다 다르다.
# - 'Support Files/Resources/ko_KR' (2026 등 최신 macOS)
# - 'Support Files/Required/Resources/ko_KR' (Windows 및 일부 버전)
ARROW_DIR=""
for CAND in \
  "$APP_DIR/Support Files/Resources/ko_KR" \
  "$APP_DIR/Support Files/Required/Resources/ko_KR"; do
  if [ -d "$CAND" ]; then
    ARROW_DIR="$CAND"
    break
  fi
done
if [ -f "$ARROW_SRC" ] && [ -n "$ARROW_DIR" ] && [ -d "$ARROW_DIR" ]; then
  if [ -w "$ARROW_DIR" ]; then
    cp "$ARROW_SRC" "$ARROW_DIR/$ARROW_NAME"
  else
    echo "관리자 권한으로 화살표 파일을 설치합니다. macOS 암호를 물을 수 있습니다."
    sudo cp "$ARROW_SRC" "$ARROW_DIR/$ARROW_NAME"
  fi
  echo "  화살표 복사 완료 -> $ARROW_DIR/$ARROW_NAME"
else
  echo "  화살표 건너뜀 (원본 또는 대상 폴더 없음)"
  echo "    원본: $ARROW_SRC"
  echo "    대상: ${ARROW_DIR:-(ko_KR Resources 폴더를 찾지 못함)}"
fi

echo ""
echo "파일 복사 끝. 남은 단계:"
echo "  1) 일러스트 실행"
echo "  2) 파일 > 스크립트 > setup 실행 (환경설정 + 액션 적용)"
echo "  3) 편집 > 키보드 단축키 에서 'cjh250907' 세트 1회 선택"
echo "  4) 일러스트 재시작"
