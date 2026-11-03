#!/bin/bash
# This runner is copied outside the checkout before git pull.
set -eu
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=Never
repo="$1"; job="$2"; branch="$3"
log="$(dirname "$0")/update.log"
save_job() {
  local tmp
  tmp="$(mktemp "${job}.XXXXXX")"
  /usr/bin/plutil -create xml1 "$tmp"
  /usr/bin/plutil -insert state -string "$1" "$tmp"
  /usr/bin/plutil -insert message -string "$2" "$tmp"
  /usr/bin/plutil -insert pid -integer "$$" "$tmp"
  /usr/bin/plutil -insert log -string "$log" "$tmp"
  /usr/bin/plutil -convert json "$tmp"
  /bin/mv -f "$tmp" "$job"
}
fail() { save_job failed "$1"; exit 1; }
save_job waiting '작업을 저장하고 Illustrator를 종료하면 업데이트합니다.'
while /bin/ps -axo comm= | /usr/bin/grep -qE '/Adobe Illustrator[^/]*/Contents/MacOS/'; do /bin/sleep 2; done
save_job running 'Git 갱신과 설치를 진행하고 있습니다. 터미널의 안내를 확인하세요.'
current="$(git -C "$repo" symbolic-ref --quiet --short HEAD)" || fail '브랜치를 확인하지 못했습니다.'
[ "$current" = "$branch" ] || fail '브랜치가 변경되었습니다. 다시 확인하세요.'
changes="$(git -C "$repo" status --porcelain --untracked-files=normal)" || fail '로컬 상태를 확인하지 못했습니다.'
[ -z "$changes" ] || fail '로컬 변경이 있어 중단했습니다. 변경을 정리한 뒤 다시 시도하세요.'
# Pull errors must stop the update even on older setup versions which swallowed them.
git -C "$repo" pull --ff-only > "$log" 2>&1 || fail 'Git 갱신에 실패했습니다. 로그를 확인하세요.'
# Keep Terminal attached so sudo can prompt if installation requires it.
/bin/bash "$repo/setup-mac.command" > >(tee -a "$log") 2>&1 || fail '설치에 실패했습니다. 로그를 확인하세요.'
save_job done '업데이트 완료. Illustrator를 다시 실행하세요. 액션이 바뀌었다면 setup을 실행하세요.'
