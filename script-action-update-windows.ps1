#Requires -Version 5.1
param([switch]$Full)   # -Full: 스크립트 + 단축키(.kys) + 화살표(.ai)까지 (새 PC 최초 세팅). 생략 시 스크립트만.
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/tgtec26/illu-script-guide.git"
$CacheDir = Join-Path $env:USERPROFILE ".illu-script-updater\illu-script-guide"
$SourceSubdir = "스크립트"
$KysName = "cjh250907.kys"
$ArrowName = "화살표.ai"

Write-Host ("illu-script {0} (Windows)" -f $(if ($Full) { "새 PC 세팅 (-Full)" } else { "updater" }))

function Test-IsAdministrator {
    $Identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $Principal = [Security.Principal.WindowsPrincipal]::new($Identity)
    return $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Restart-AsAdministrator {
    Write-Host "Illustrator 설치 폴더에 쓰려면 관리자 권한이 필요합니다."
    Write-Host "권한 확인 창이 뜨면 예를 눌러 주세요."
    $PowerShellExe = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
    $Arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$PSCommandPath`""
    )
    if ($Full) { $Arguments += "-Full" }
    Start-Process -FilePath $PowerShellExe -ArgumentList $Arguments -Verb RunAs | Out-Null
    exit
}

function Get-IllustratorInstallDirs {
    $ProgramRoots = @(
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)},
        ${env:ProgramW6432}
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    foreach ($Root in $ProgramRoots) {
        Get-ChildItem -Path $Root -Directory -Filter "Adobe Illustrator*" -ErrorAction SilentlyContinue

        $AdobeRoot = Join-Path $Root "Adobe"
        if (Test-Path $AdobeRoot) {
            Get-ChildItem -Path $AdobeRoot -Directory -Filter "Adobe Illustrator*" -ErrorAction SilentlyContinue
        }
    }

    $RegistryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    foreach ($RegistryPath in $RegistryPaths) {
        Get-ItemProperty $RegistryPath -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -like "Adobe Illustrator*" -and $_.InstallLocation -and (Test-Path $_.InstallLocation) } |
            ForEach-Object { Get-Item -LiteralPath $_.InstallLocation -ErrorAction SilentlyContinue }
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git이 필요합니다. Git for Windows 설치 후 다시 실행하세요."
    Write-Host "https://git-scm.com/download/win"
    Read-Host "Enter 키를 누르면 닫습니다"
    exit 1
}

if (Test-Path (Join-Path $CacheDir ".git")) {
    Write-Host "GitHub 최신본 확인 중..."
    git -C $CacheDir pull --ff-only
} else {
    Write-Host "GitHub 저장소 내려받는 중..."
    New-Item -ItemType Directory -Force -Path (Split-Path $CacheDir) | Out-Null
    git clone $RepoUrl $CacheDir
}

$SourceDir = Join-Path $CacheDir $SourceSubdir
if (-not (Test-Path $SourceDir)) {
    throw "스크립트 폴더를 찾지 못했습니다: $SourceDir"
}

$AppDir = Get-IllustratorInstallDirs |
    Sort-Object -Property FullName -Unique |
    Sort-Object @{ Expression = {
        if ($_.Name -match "20\d\d") { [int]$Matches[0] } else { 0 }
    } } -Descending |
    Select-Object -First 1

if (-not $AppDir) {
    throw "Illustrator 설치 폴더를 찾지 못했습니다."
}

$Year = if ($AppDir.Name -match "20\d\d") { [int]$Matches[0] } else { 0 }
$Ver = if ($Year -ge 1997) { $Year - 1996 } else { 0 }   # 2026 -> 30

$PresetRoots = @(
    (Join-Path $AppDir.FullName "Presets"),
    (Join-Path $AppDir.FullName "Presets.localized")
) | Where-Object { Test-Path $_ }

$TargetDir = $null
foreach ($PresetRoot in $PresetRoots) {
    $TargetDir = Get-ChildItem -Path $PresetRoot -Directory -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq "스크립트" -or $_.Name -eq "Scripts" } |
        Select-Object -First 1
    if ($TargetDir) { break }
}

if (-not $TargetDir) {
    $LocaleDir = $null
    foreach ($PresetRoot in $PresetRoots) {
        $LocaleDir = Get-ChildItem -Path $PresetRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -eq "ko_KR" -or $_.Name -eq "en_US" } |
            Select-Object -First 1
        if ($LocaleDir) { break }
    }
    if (-not $LocaleDir) {
        throw "Illustrator Presets 폴더를 찾지 못했습니다."
    }
    $TargetPath = Join-Path $LocaleDir.FullName "Scripts"
} else {
    $TargetPath = $TargetDir.FullName
}

Write-Host "Illustrator: $($AppDir.FullName)"
Write-Host "설치 위치: $TargetPath"

if (-not (Test-IsAdministrator)) {
    Restart-AsAdministrator
}

New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null

Get-ChildItem -Path $SourceDir -Force | Where-Object { $_.Name -ne ".DS_Store" } | ForEach-Object {
    $Destination = Join-Path $TargetPath $_.Name
    if ($_.PSIsContainer) {
        if (Test-Path $Destination) {
            Remove-Item -Path $Destination -Recurse -Force
        }
        Copy-Item -Path $_.FullName -Destination $Destination -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $TargetPath -Force
    }
}

Write-Host "  스크립트 복사 완료 -> $TargetPath"

if (-not $Full) {
    Write-Host "완료. Illustrator가 열려 있다면 재시작하세요."
    return
}

# -Full: 단축키(.kys) → 설정 폴더 ko_KR\x64 (없으면 ko_KR)
$KysSrc = Join-Path $CacheDir $KysName
if (Test-Path $KysSrc) {
    $SettingsBase = Join-Path $env:APPDATA "Adobe\Adobe Illustrator $Ver Settings\ko_KR"
    $SettingsDir = Join-Path $SettingsBase "x64"
    if (-not (Test-Path $SettingsDir)) {
        if (Test-Path $SettingsBase) { $SettingsDir = $SettingsBase }
        else { New-Item -ItemType Directory -Force -Path $SettingsDir | Out-Null }
    }
    Copy-Item -Path $KysSrc -Destination $SettingsDir -Force
    Write-Host "  단축키 복사 완료 -> $SettingsDir\$KysName"
} else {
    Write-Host "  단축키 파일 없음(건너뜀): $KysSrc"
}

# -Full: 화살표(.ai) → 설치 폴더 Resources (덮어쓰기)
$ArrowSrc = Join-Path $CacheDir $ArrowName
$ArrowDir = Join-Path $AppDir.FullName "Support Files\Required\Resources\ko_KR"
if ((Test-Path $ArrowSrc) -and (Test-Path $ArrowDir)) {
    Copy-Item -Path $ArrowSrc -Destination (Join-Path $ArrowDir $ArrowName) -Force
    Write-Host "  화살표 복사 완료 -> $ArrowDir\$ArrowName"
} else {
    Write-Host "  화살표 건너뜀 (원본 또는 대상 폴더 없음)"
    Write-Host "    원본: $ArrowSrc"
    Write-Host "    대상: $ArrowDir"
}

Write-Host ""
Write-Host "파일 복사 끝. 남은 단계:"
Write-Host "  1) 일러스트 실행"
Write-Host "  2) 파일 > 스크립트 > setup 실행 (환경설정 + 액션 적용)"
Write-Host "  3) 편집 > 키보드 단축키 에서 'cjh250907' 세트 1회 선택"
Write-Host "  4) 일러스트 재시작"
