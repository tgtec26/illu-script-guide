#Requires -Version 5.1
param([Parameter(Mandatory=$true)][string]$RepoDir,
      [Parameter(Mandatory=$true)][string]$JobFile,
      [Parameter(Mandatory=$true)][string]$Branch)
$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'Never'
$Job = Get-Content -LiteralPath $JobFile -Raw -Encoding UTF8 | ConvertFrom-Json
$Job | Add-Member -NotePropertyName pid -NotePropertyValue $PID -Force
function Save-Job($State, $Message) {
    $Job.state = $State; $Job.message = $Message
    $TempJob = "$JobFile.$PID.tmp"
    [IO.File]::WriteAllText($TempJob, ($Job | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
    [IO.File]::Replace($TempJob, $JobFile, "$JobFile.bak")
}
try {
    Save-Job 'waiting' '작업을 저장하고 Illustrator를 종료하면 업데이트합니다.'
    while (Get-Process -Name Illustrator -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 2 }
    Save-Job 'running' 'Git 갱신과 설치를 진행하고 있습니다. 권한 확인 창에서 예를 누르세요.'
    $CurrentBranch = & git -C $RepoDir symbolic-ref --quiet --short HEAD
    if ($LASTEXITCODE -ne 0 -or $CurrentBranch -ne $Branch) { throw '브랜치가 변경되었습니다. 패널에서 다시 확인하세요.' }
    $Changes = & git -C $RepoDir status --porcelain --untracked-files=normal
    if ($LASTEXITCODE -ne 0 -or $Changes) { throw '로컬 변경이 있어 중단했습니다. 변경을 정리한 뒤 다시 시도하세요.' }
    & git -C $RepoDir pull --ff-only *> $Job.log
    if ($LASTEXITCODE -ne 0) { throw "Git 갱신에 실패했습니다. 로그: $($Job.log)" }
    # Load the newly pulled setup, not an old copy already running during pull.
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoDir 'setup-windows.ps1') *>> $Job.log
    if ($LASTEXITCODE -ne 0) { throw "설치에 실패했습니다. 로그: $($Job.log)" }
    Save-Job 'done' '업데이트 완료. Illustrator를 다시 실행하세요. 액션이 변경되었다면 파일 > 스크립트 > setup을 실행하세요.'
} catch {
    Save-Job 'failed' $_.Exception.Message
    exit 1
}
