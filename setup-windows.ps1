#Requires -Version 5.1
param()   # 항상 전체 세팅: 스크립트 + 단축키(.kys) + 화살표(.ai) + 폭 프로파일
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/tgtec26/illu-script-guide.git"
$CacheDir = Join-Path $env:USERPROFILE ".illu-script-updater\illu-script-guide"
$SourceSubdir = "스크립트"
$KysName = "cjh250907.kys"
$ArrowName = "화살표.ai"
$WidthProfileName = "폭속성1.txt"

Write-Host "illu-script 세팅/업데이트 (Windows)"

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

# 저장소 안에서 실행하면 그 저장소를, 아니면 GitHub 사본을 원본으로 쓴다.
# 스크립트는 원본을 그대로 실행하는 방식으로 설치하므로, 원본이 갱신되면 즉시 반영된다.
$SelfDir = Split-Path -Parent $PSCommandPath
if (Test-Path (Join-Path $SelfDir $SourceSubdir)) {
    $RepoDir = $SelfDir
    Write-Host "원본: 이 저장소 ($RepoDir)"
    if (Test-Path (Join-Path $RepoDir ".git")) {
        Write-Host "GitHub 최신본 확인 중..."
        try { git -C $RepoDir pull --ff-only } catch { Write-Host "  (pull 실패, 현재 상태로 진행)" }
    }
} else {
    $RepoDir = $CacheDir
    Write-Host "원본: GitHub 사본 ($RepoDir)"
    if (Test-Path (Join-Path $CacheDir ".git")) {
        Write-Host "GitHub 최신본 확인 중..."
        git -C $CacheDir pull --ff-only
    } else {
        Write-Host "GitHub 저장소 내려받는 중..."
        New-Item -ItemType Directory -Force -Path (Split-Path $CacheDir) | Out-Null
        git clone $RepoUrl $CacheDir
    }
}

$SourceDir = Join-Path $RepoDir $SourceSubdir
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

# Illustrator는 스크립트 폴더 안의 링크를 건너뛴다.
# 그래서 실제 폴더를 만들고, 원본을 그대로 실행하는 한 줄짜리 스텁을 넣는다.
# 원본을 고치거나 git pull 하면 재실행 없이 바로 반영된다.
$StubCount = 0
Get-ChildItem -Path $SourceDir -Directory | ForEach-Object {
    $Dir = Join-Path $TargetPath $_.Name
    if (Test-Path $Dir) {
        $Existing = Get-Item -LiteralPath $Dir
        if ($Existing.LinkType) { Remove-Item -LiteralPath $Dir -Force }
    }
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null

    # 이전에 만든 스텁 제거 (이름이 바뀌거나 삭제된 스크립트 정리)
    Get-ChildItem -Path $Dir -Filter *.jsx -File -ErrorAction SilentlyContinue | Remove-Item -Force

    Get-ChildItem -Path $_.FullName -Filter *.jsx -File | ForEach-Object {
        $Stub = Join-Path $Dir $_.Name
        $Body = @(
            "// 자동 생성 로더 - 직접 수정하지 마세요.",
            "// 원본: $($_.FullName)",
            "`$.evalFile(new File(`"$($_.FullName.Replace('\','/'))`"));"
        ) -join "`n"
        [IO.File]::WriteAllText($Stub, $Body, (New-Object Text.UTF8Encoding $false))
        $script:StubCount++
    }

    # setup.jsx가 자기 폴더에서 액션 파일을 찾으므로 .aia는 실물로 함께 둔다
    Get-ChildItem -Path $_.FullName -Filter *.aia -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $Dir $_.Name) -Force
    }

    Write-Host "  등록: $($_.Name)"
}

Write-Host "  스크립트 $StubCount개 등록 완료 -> $TargetPath"

# -Full: 단축키(.kys) → 설정 폴더 ko_KR\x64 (없으면 ko_KR)
$KysSrc = Join-Path $RepoDir $KysName
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
$ArrowSrc = Join-Path $RepoDir $ArrowName
$ArrowDir = Join-Path $AppDir.FullName "Support Files\Required\Resources\ko_KR"
if ((Test-Path $ArrowSrc) -and (Test-Path $ArrowDir)) {
    Copy-Item -Path $ArrowSrc -Destination (Join-Path $ArrowDir $ArrowName) -Force
    Write-Host "  화살표 복사 완료 -> $ArrowDir\$ArrowName"
} else {
    Write-Host "  화살표 건너뜀 (원본 또는 대상 폴더 없음)"
    Write-Host "    원본: $ArrowSrc"
    Write-Host "    대상: $ArrowDir"
}

# -Full: 가변 폭 프로파일 "폭 속성1" 등록
# Illustrator는 종료할 때 이 파일을 메모리 내용으로 덮어쓰므로, 실행 중이면 건너뛴다.
$WidthProfileSrc = Join-Path $RepoDir $WidthProfileName
if (Test-Path $WidthProfileSrc) {
    if (Get-Process -Name "Illustrator" -ErrorAction SilentlyContinue) {
        Write-Host "  폭 프로파일 건너뜀 (Illustrator 실행 중)"
        Write-Host "    일러스트레이터를 완전히 종료한 뒤 이 스크립트를 다시 실행하세요."
    } else {
        $WpDir = Join-Path $env:APPDATA "Adobe\Adobe Illustrator $Ver Settings\ko_KR"
        $WpFile = Join-Path $WpDir "가변 폭 속성"
        if (-not (Test-Path $WpDir)) {
            Write-Host "  폭 프로파일 건너뜀 (설정 폴더 없음): $WpDir"
        } else {
            $Marker = "ed8fad20ec868dec84b131"
            $Existing = ""
            if (Test-Path $WpFile) { $Existing = [IO.File]::ReadAllText($WpFile) }
            if ($Existing -like "*$Marker*") {
                Write-Host "  폭 프로파일 이미 등록됨: 폭 속성1"
            } elseif (-not (Test-Path $WpFile)) {
                Write-Host "  폭 프로파일 건너뜀 (프리셋 파일이 없음): $WpFile"
                Write-Host "    일러스트레이터를 한 번 실행했다가 종료한 뒤 다시 시도하세요."
            } else {
                # 파일 구조: collection 블록들 -> /Sketch -> /NumberOfCollections N -> /CatalogName
                # 새 프로파일은 collection 블록 뒤(= /Sketch 앞)에 넣고 개수 선언도 함께 올린다.
                # 그냥 파일 끝에 붙이면 개수 선언 뒤로 밀려 Illustrator가 파일을 통째로 무시한다.
                $Next = 1
                $Nums = [regex]::Matches($Existing, "/collection(\d+)") | ForEach-Object { [int]$_.Groups[1].Value }
                if ($Nums.Count -gt 0) { $Next = ($Nums | Measure-Object -Maximum).Maximum + 1 }

                $CountMatch = [regex]::Match($Existing, "/NumberOfCollections (\d+)")
                if (-not $CountMatch.Success) {
                    Write-Host "  폭 프로파일 건너뜀 (파일 형식을 알 수 없음): $WpFile"
                } else {
                    $OldCount = [int]$CountMatch.Groups[1].Value
                    $NewCount = $OldCount + 1

                    # 파일이 CR 개행이므로 줄 단위로 다루려면 LF로 바꿔 처리하고 되돌린다
                    $Snippet = [IO.File]::ReadAllText($WidthProfileSrc).Replace("{N}", "$Next")
                    $Snippet = ($Snippet -replace "`r`n", "`n").TrimEnd("`n")
                    $Lines = ($Existing -replace "`r`n", "`n" -replace "`r", "`n") -split "`n"

                    $Out = New-Object Collections.Generic.List[string]
                    $Inserted = $false
                    foreach ($Line in $Lines) {
                        if (-not $Inserted -and $Line -eq "/Sketch {") {
                            foreach ($SnippetLine in ($Snippet -split "`n")) { $Out.Add($SnippetLine) }
                            $Inserted = $true
                        }
                        if ($Line -eq "/NumberOfCollections $OldCount") {
                            $Out.Add("/NumberOfCollections $NewCount")
                        } else {
                            $Out.Add($Line)
                        }
                    }

                    Copy-Item -Path $WpFile -Destination "$WpFile.bak" -Force
                    [IO.File]::WriteAllText($WpFile, ($Out -join "`r"))
                    Write-Host "  폭 프로파일 추가 완료 -> $WpFile (collection$Next, 개수 $OldCount -> $NewCount, 백업: $WpFile.bak)"
                }
            }
        }
    }
} else {
    Write-Host "  폭 프로파일 파일 없음(건너뜀): $WidthProfileSrc"
}

Write-Host ""
Write-Host "설치 끝. 남은 단계:"
Write-Host "  1) 일러스트 실행"
Write-Host "  2) 파일 > 스크립트 > setup 실행 (환경설정 + 액션 적용)"
Write-Host "  3) 편집 > 키보드 단축키 에서 'cjh250907' 세트 1회 선택"
Write-Host "  4) 일러스트 재시작"
Write-Host "  5) 획 패널의 프로파일 목록에 '폭 속성1'이 보이는지 확인"
Write-Host ""
Write-Host "이후 스크립트 내용 수정은 원본만 고치면 바로 반영됩니다."
Write-Host "스크립트 파일을 추가·삭제·이름변경했을 때만 이 명령을 다시 실행하세요."
