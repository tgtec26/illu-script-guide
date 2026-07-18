# 일회성 설치: repo 스크립트 폴더를 Illustrator 스크립트 폴더에 정션(junction)으로 연결
# 관리자 권한 필요. 이후 repo 수정이 즉시 Illustrator에 반영됨 (새 파일은 Illustrator 재시작 필요)
$ErrorActionPreference = 'Stop'

$repo = Join-Path $PSScriptRoot '스크립트'
$target = 'C:\Program Files\Adobe\Adobe Illustrator 2026\Presets\ko_KR\스크립트'

if (-not (Test-Path $target)) { Write-Error "Illustrator 폴더 없음: $target" }

Get-ChildItem -Directory $repo | ForEach-Object {
    $link = Join-Path $target $_.Name
    $item = Get-Item $link -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType -eq 'Junction') {
        Write-Host "이미 연결됨: $($_.Name)"
        return
    }
    if ($item) {
        # 기존 복사본 제거 후 정션으로 교체
        Remove-Item $link -Recurse -Force -Confirm:$false
    }
    New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null
    Write-Host "연결 완료: $($_.Name) -> $($_.FullName)"
}

Write-Host "`n완료. 새 폴더를 repo에 추가하면 이 스크립트를 다시 실행하세요."

