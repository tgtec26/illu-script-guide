#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/tgtec26/illu-script.git"
$CacheDir = Join-Path $env:USERPROFILE ".illu-script-updater\illu-script"
$SourceSubdir = "스크립트"

Write-Host "illu-script updater (Windows)"

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

Write-Host "완료. Illustrator가 열려 있다면 재시작하세요."
Read-Host "Enter 키를 누르면 닫습니다"
