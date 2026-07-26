#!/bin/bash
set -euo pipefail


REPO_URL="https://github.com/tgtec26/illu-script-guide.git"
CACHE_DIR="$HOME/.illu-script-updater/illu-script-guide"
SOURCE_SUBDIR="스크립트"
KYS_NAME="cjh250907.kys"
ARROW_NAME="화살표.ai"
WIDTH_PROFILE_NAME="폭속성1.txt"
WIDTH_PROFILE_LABEL="폭 속성1"

echo "illu-script 세팅/업데이트 (macOS)"

if ! command -v git >/dev/null 2>&1; then
  echo "Git이 필요합니다. Xcode Command Line Tools 또는 Git을 설치한 뒤 다시 실행하세요."
  exit 1
fi

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"

# 저장소 안에서 실행하면 그 저장소를, 아니면 GitHub 사본을 원본으로 쓴다.
# 스크립트는 원본을 그대로 실행하는 방식으로 설치하므로, 원본이 갱신되면 즉시 반영된다.
if [ -d "$SELF_DIR/$SOURCE_SUBDIR" ]; then
  REPO_DIR="$SELF_DIR"
  echo "원본: 이 저장소 ($REPO_DIR)"
  if [ -d "$REPO_DIR/.git" ]; then
    echo "GitHub 최신본 확인 중..."
    git -C "$REPO_DIR" pull --ff-only || echo "  (pull 실패, 현재 상태로 진행)"
  fi
else
  REPO_DIR="$CACHE_DIR"
  echo "원본: GitHub 사본 ($REPO_DIR)"
  if [ -d "$CACHE_DIR/.git" ]; then
    echo "GitHub 최신본 확인 중..."
    git -C "$CACHE_DIR" pull --ff-only
  else
    echo "GitHub 저장소 내려받는 중..."
    mkdir -p "$(dirname "$CACHE_DIR")"
    git clone "$REPO_URL" "$CACHE_DIR"
  fi
fi

SOURCE_DIR="$REPO_DIR/$SOURCE_SUBDIR"
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

# Illustrator는 스크립트 폴더 안의 심볼릭 링크를 건너뛴다.
# 그래서 실제 폴더를 만들고, 원본을 그대로 실행하는 한 줄짜리 스텁을 넣는다.
# 원본을 고치거나 git pull 하면 재실행 없이 바로 반영된다.

# 스크립트 폴더는 기본이 root 소유라 쓰기가 막혀 있다.
# 최초 1회만 관리자 권한으로 소유권을 넘기고, 다음부터는 암호 없이 진행한다.
if [ ! -w "$TARGET_DIR" ]; then
  echo "관리자 권한으로 스크립트 폴더 소유권을 사용자 계정으로 변경합니다. macOS 암호를 물을 수 있습니다."
  sudo mkdir -p "$TARGET_DIR"
  sudo chown -R "$(id -un):$(id -gn)" "$TARGET_DIR"
fi

# Illustrator 액션이 메뉴 이름을 NFC로 기록하므로 폴더/파일 이름을 NFC로 강제
to_nfc() {
  printf '%s' "$1" | iconv -f UTF-8-MAC -t UTF-8 2>/dev/null || printf '%s' "$1"
}

stub_count=0
for item in "$SOURCE_DIR"/*/; do
  [ -d "$item" ] || continue
  base="$(basename "$item")"
  dir="$TARGET_DIR/$(to_nfc "$base")"

  # 예전 방식으로 만든 심볼릭 링크가 있으면 실제 폴더로 교체
  [ -L "$dir" ] && rm -f "$dir"
  mkdir -p "$dir"

  # 이전에 만든 스텁 제거 (이름이 바뀌거나 삭제된 스크립트 정리)
  find "$dir" -maxdepth 1 -type f -name '*.jsx' -delete

  for file in "$item"*.jsx; do
    [ -f "$file" ] || continue
    stub="$dir/$(to_nfc "$(basename "$file")")"
    {
      printf '%s\n' "// 자동 생성 로더 - 직접 수정하지 마세요."
      printf '%s\n' "// 원본: $file"
      printf '%s\n' "\$.evalFile(new File(\"$file\"));"
    } > "$stub"
    stub_count=$((stub_count + 1))
  done

  # setup.jsx가 자기 폴더에서 액션 파일을 찾으므로 .aia는 실물로 함께 둔다
  for asset in "$item"*.aia; do
    [ -f "$asset" ] || continue
    cp -f "$asset" "$dir/$(to_nfc "$(basename "$asset")")"
  done

  echo "  등록: $(to_nfc "$base")"
done

echo "  스크립트 ${stub_count}개 등록 완료 -> $TARGET_DIR"

KYS_SRC="$REPO_DIR/$KYS_NAME"
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

ARROW_SRC="$REPO_DIR/$ARROW_NAME"
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
  if cmp -s "$ARROW_SRC" "$ARROW_DIR/$ARROW_NAME" 2>/dev/null; then
    echo "  화살표 이미 최신 (건너뜀)"
  elif [ -w "$ARROW_DIR" ]; then
    cp "$ARROW_SRC" "$ARROW_DIR/$ARROW_NAME"
    echo "  화살표 복사 완료 -> $ARROW_DIR/$ARROW_NAME"
  else
    echo "관리자 권한으로 화살표 파일을 설치합니다. macOS 암호를 물을 수 있습니다."
    # 암호 입력이 불가능한 환경에서도 나머지 단계는 계속 진행한다
    if sudo cp "$ARROW_SRC" "$ARROW_DIR/$ARROW_NAME"; then
      echo "  화살표 복사 완료 -> $ARROW_DIR/$ARROW_NAME"
    else
      echo "  화살표 건너뜀 (관리자 권한을 얻지 못함)"
    fi
  fi
else
  echo "  화살표 건너뜀 (원본 또는 대상 폴더 없음)"
  echo "    원본: $ARROW_SRC"
  echo "    대상: ${ARROW_DIR:-(ko_KR Resources 폴더를 찾지 못함)}"
fi

# 가변 폭 프로파일 "폭 속성1" 등록
# Illustrator는 종료할 때 이 파일을 메모리 내용으로 덮어쓰므로, 실행 중이면 건너뛴다.
WIDTH_PROFILE_SRC="$REPO_DIR/$WIDTH_PROFILE_NAME"
if [ -f "$WIDTH_PROFILE_SRC" ] && [ -n "$VER" ]; then
  WP_BASE="$HOME/Library/Preferences/Adobe Illustrator $VER Settings"
  WP_DIR=""
  for CAND in "$WP_BASE/ko_KR" "$WP_BASE/en_US"; do
    if [ -d "$CAND" ]; then WP_DIR="$CAND"; break; fi
  done

  if [ -z "$WP_DIR" ]; then
    echo "  폭 프로파일 건너뜀 (설정 폴더를 찾지 못함): $WP_BASE"
  elif pgrep -x "Adobe Illustrator" >/dev/null 2>&1; then
    echo "  폭 프로파일 건너뜀 (Illustrator 실행 중)"
    echo "    일러스트레이터를 완전히 종료한 뒤 이 스크립트를 다시 실행하세요."
  else
    WP_FILE="$WP_DIR/가변 폭 속성"
    if [ -f "$WP_FILE" ] && grep -q "ed8fad20ec868dec84b131" "$WP_FILE"; then
      echo "  폭 프로파일 이미 등록됨: $WIDTH_PROFILE_LABEL"
    else
      if [ -f "$WP_FILE" ]; then
        cp "$WP_FILE" "$WP_FILE.bak"
        # 기존에 쓰지 않은 collection 번호를 골라 프로파일을 덧붙인다
        NEXT_NUM="$(
          grep -o '/collection[0-9]\{1,\}' "$WP_FILE" \
            | grep -o '[0-9]\{1,\}' \
            | sort -n | tail -n 1
        )"
        NEXT_NUM=$(( ${NEXT_NUM:-0} + 1 ))
        # 파일이 CR 개행이므로 덧붙이는 줄도 CR로 맞춘다
        sed "s/{N}/$NEXT_NUM/" "$WIDTH_PROFILE_SRC" | tr '\n' '\r' >> "$WP_FILE"
        echo "  폭 프로파일 추가 완료 -> $WP_FILE (collection$NEXT_NUM, 백업: $WP_FILE.bak)"
      else
        sed "s/{N}/1/" "$WIDTH_PROFILE_SRC" | tr '\n' '\r' > "$WP_FILE"
        echo "  폭 프로파일 새로 생성 -> $WP_FILE"
      fi
    fi
  fi
elif [ -z "$VER" ]; then
  echo "  Illustrator 버전을 알 수 없어 폭 프로파일 등록을 건너뜀"
else
  echo "  폭 프로파일 파일 없음(건너뜀): $WIDTH_PROFILE_SRC"
fi

echo ""
echo "설치 끝. 남은 단계:"
echo "  1) 일러스트 실행"
echo "  2) 파일 > 스크립트 > setup 실행 (환경설정 + 액션 적용)"
echo "  3) 편집 > 키보드 단축키 에서 'cjh250907' 세트 1회 선택"
echo "  4) 일러스트 재시작"
echo "  5) 획 패널의 프로파일 목록에 '폭 속성1'이 보이는지 확인"
echo ""
echo "이후 스크립트 내용 수정은 원본만 고치면 바로 반영됩니다."
echo "스크립트 파일을 추가·삭제·이름변경했을 때만 이 명령을 다시 실행하세요."
