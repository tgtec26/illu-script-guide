#!/bin/bash
# 일회성 설치: repo 스크립트를 Illustrator 스크립트 메뉴에 등록 (macOS)
# Illustrator는 스크립트 폴더 안의 심볼릭 링크를 건너뛰므로, 실제 폴더 + 로더 스텁(.jsx)을 만든다.
# 스텁은 repo 원본을 $.evalFile로 실행하므로 원본 수정이 즉시 반영됨
# repo에 스크립트나 폴더를 추가하면 이 스크립트를 다시 실행 (이후 Illustrator 재시작)
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
echo "설치 위치: $TARGET_DIR"

# 스크립트 폴더는 기본이 root 소유라 쓰기가 막혀 있다.
# 최초 1회만 관리자 권한으로 소유권을 사용자에게 넘기고, 다음 실행부터는 암호 없이 진행한다.
if [ ! -w "$TARGET_DIR" ]; then
  echo "관리자 권한으로 폴더 소유권을 사용자 계정으로 변경합니다. macOS 암호를 물을 수 있습니다."
  sudo mkdir -p "$TARGET_DIR"
  sudo chown -R "$(id -un):$(id -gn)" "$TARGET_DIR"
fi

# Illustrator 액션이 메뉴 이름을 NFC로 기록하므로 폴더/파일 이름을 NFC로 강제
to_nfc() {
  printf '%s' "$1" | iconv -f UTF-8-MAC -t UTF-8 2>/dev/null || printf '%s' "$1"
}

count=0
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
    count=$((count + 1))
  done

  # setup.jsx가 자기 폴더에서 액션 파일을 찾으므로 .aia는 실물로 함께 둔다
  for asset in "$item"*.aia; do
    [ -f "$asset" ] || continue
    cp -f "$asset" "$dir/$(to_nfc "$(basename "$asset")")"
  done

  echo "등록 완료: $(to_nfc "$base")"
done

echo ""
echo "완료. 스크립트 ${count}개 등록. Illustrator가 열려 있다면 재시작하세요."
