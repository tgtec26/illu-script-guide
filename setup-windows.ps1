#Requires -Version 5.1
# 항상 전체 세팅: 스크립트 + 단축키(.kys) + 화살표(.ai) + 폭 프로파일
# 기본 실행은 설치된 정식판과 Beta 모두 갱신한다. 하나만 지정하려면:
#   setup-windows.cmd -IllustratorAppDir "C:\Program Files\Adobe\Adobe Illustrator (Beta)" -IllustratorVer "31.0.0 Beta"
param(
    [string]$IllustratorAppDir = $env:ILLUSTRATOR_APP_DIR,
    [string]$IllustratorVer = $env:ILLUSTRATOR_VER,
    [switch]$PauseOnExit
)
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/tgtec26/illu-script-guide.git"
$CacheDir = Join-Path $env:USERPROFILE ".illu-script-updater\illu-script-guide"
$SourceSubdir = "스크립트"
$KysName = "cjhwin261022.kys"
$ArrowName = "화살표.ai"
$WidthProfileName = "폭속성1.txt"

try {
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
    # 관리자 창은 환경 변수를 이어받지 못하므로 인자로 넘긴다
    if ($IllustratorAppDir) { $Arguments += @("-IllustratorAppDir", "`"$IllustratorAppDir`"") }
    if ($IllustratorVer) { $Arguments += @("-IllustratorVer", "`"$IllustratorVer`"") }
    if ($PauseOnExit) { $Arguments += "-PauseOnExit" }
    $Child = Start-Process -FilePath $PowerShellExe -ArgumentList $Arguments -Verb RunAs -Wait -PassThru
    $script:PauseOnExit = $false
    exit $Child.ExitCode
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
    throw "Git을 설치한 뒤 다시 실행하세요."
}

# 설치와 Git 갱신을 한 관리자 창에서 한 번만 수행한다.
if (-not (Test-IsAdministrator)) { Restart-AsAdministrator }
if (Get-Process -Name "Illustrator" -ErrorAction SilentlyContinue) {
    throw "Illustrator를 완전히 종료한 뒤 다시 실행하세요. 전체 업데이트에 종료가 필요합니다."
}
if ($IllustratorVer -and -not $IllustratorAppDir) {
    throw "IllustratorVer를 지정할 때는 IllustratorAppDir도 함께 지정하세요."
}

function Invoke-RepoGit {
    param([string[]]$GitArguments)
    & git @GitArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git 갱신 실패 (종료 코드 $LASTEXITCODE). 위 오류를 확인하세요. 로컬 변경은 자동으로 지우지 않습니다."
    }
}

# 저장소 안에서 실행하면 그 저장소를, 아니면 GitHub 사본을 원본으로 쓴다.
# 스크립트는 원본을 그대로 실행하는 방식으로 설치하므로, 원본이 갱신되면 즉시 반영된다.
$SelfDir = Split-Path -Parent $PSCommandPath
if (Test-Path (Join-Path $SelfDir $SourceSubdir)) {
    $RepoDir = $SelfDir
    Write-Host "원본: 이 저장소 ($RepoDir)"
    if (Test-Path (Join-Path $RepoDir ".git")) {
        Write-Host "GitHub 최신본 확인 중..."
        Invoke-RepoGit -GitArguments @("-C", $RepoDir, "pull", "--ff-only")
    }
} else {
    $RepoDir = $CacheDir
    Write-Host "원본: GitHub 사본 ($RepoDir)"
    if (Test-Path (Join-Path $CacheDir ".git")) {
        Write-Host "GitHub 최신본 확인 중..."
        Invoke-RepoGit -GitArguments @("-C", $CacheDir, "pull", "--ff-only")
    } else {
        Write-Host "GitHub 저장소 내려받는 중..."
        New-Item -ItemType Directory -Force -Path (Split-Path $CacheDir) | Out-Null
        Invoke-RepoGit -GitArguments @("clone", $RepoUrl, $CacheDir)
    }
}

$SourceDir = Join-Path $RepoDir $SourceSubdir
if (-not (Test-Path $SourceDir)) {
    throw "스크립트 폴더를 찾지 못했습니다: $SourceDir"
}

function Get-IllustratorSettingsVersion {
    param($AppDir)
    if ($IllustratorVer) { return $IllustratorVer }
    if ($AppDir.Name -match "20\d\d") { return [string]([int]$Matches[0] - 1996) }
    $Exe = Join-Path $AppDir.FullName "Support Files\Contents\Windows\Illustrator.exe"
    if (-not (Test-Path -LiteralPath $Exe)) { throw "Illustrator 실행 파일 없음: $Exe" }
    $VersionInfo = (Get-Item -LiteralPath $Exe).VersionInfo
    $Version = "{0}.{1}.{2}" -f $VersionInfo.FileMajorPart, $VersionInfo.FileMinorPart, $VersionInfo.FileBuildPart
    if ($VersionInfo.FileMajorPart -lt 1) { throw "Illustrator 버전을 확인하지 못했습니다: $Exe" }
    if ($AppDir.Name -match "Beta") { return "$Version Beta" }
    return [string]$VersionInfo.FileMajorPart
}

$AllDirs = @(Get-IllustratorInstallDirs | Sort-Object -Property FullName -Unique)
if ($IllustratorAppDir) {
    $AllDirs = @(Get-Item -LiteralPath $IllustratorAppDir)
}
if ($AllDirs.Count -eq 0) { throw "Illustrator 설치 폴더를 찾지 못했습니다." }

function Install-Illustrator {
param($AppDir)
$Ver = Get-IllustratorSettingsVersion $AppDir

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
    # 한국어 일러는 현지화된 이름(스크립트)의 폴더를 읽는다(setup-mac.command와 같음)
    $ScriptsName = if ($LocaleDir.Name -eq "ko_KR") { "스크립트" } else { "Scripts" }
    $TargetPath = Join-Path $LocaleDir.FullName $ScriptsName
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
$script:StubCount = 0
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
    # 저장소에서 지운 옛 액션 파일이 남아 있으면 setup이 그것을 읽으므로 먼저 지운다
    Get-ChildItem -Path $Dir -Filter *.aia -File -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path $_.FullName -Filter *.aia -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $Dir $_.Name) -Force
    }

    Write-Host "  등록: $($_.Name)"
}

Write-Host "  스크립트 ${script:StubCount}개 등록 완료 -> $TargetPath"

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

}
foreach ($AppDir in $AllDirs) { Install-Illustrator $AppDir }

# 스크립트 패널(CEP): 개발자 모드를 켜고 확장 폴더에 원본의 tools\script-panel을 연결한다. 원본이 갱신되면 패널도 같이 갱신된다
$PanelSrc = Join-Path $RepoDir "tools\script-panel"
if (Test-Path (Join-Path $PanelSrc "CSXS\manifest.xml")) {
    try {
        foreach ($CsxsVer in 9..12) {
            $Key = "HKCU:\Software\Adobe\CSXS.$CsxsVer"
            if (-not (Test-Path $Key)) { New-Item -Path $Key -Force | Out-Null }
            Set-ItemProperty -Path $Key -Name PlayerDebugMode -Value "1" -Type String
        }
        $ExtRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
        $PanelDst = Join-Path $ExtRoot "com.snug.scriptpanel"
        New-Item -ItemType Directory -Force -Path $ExtRoot | Out-Null
        $Linked = $true
        if (Test-Path $PanelDst) {
            if ((Get-Item -LiteralPath $PanelDst).LinkType) { Remove-Item -LiteralPath $PanelDst -Force }
            else { $Linked = $false; Write-Host "  스크립트 패널 건너뜀 (같은 이름의 일반 폴더가 이미 있음): $PanelDst" }
        }
        if ($Linked) {
            New-Item -ItemType Junction -Path $PanelDst -Target $PanelSrc | Out-Null
            Write-Host "  스크립트 패널 설치 완료 -> $PanelDst (일러 재시작 후 창 > 확장 프로그램 > 스크립트 패널)"
        }
    } catch {
        Write-Host "  스크립트 패널 설치 실패(건너뜀): $($_.Exception.Message)"
    }
} else {
    Write-Host "  스크립트 패널 폴더 없음(건너뜀): $PanelSrc"
}

Write-Host ""
Write-Host "설치 끝. 남은 단계:"
Write-Host "  1) 일러스트 실행"
Write-Host "  2) 파일 > 스크립트 > setup 실행 (환경설정 + 액션 적용)"
Write-Host "  3) 편집 > 키보드 단축키 에서 'cjhwin261022' 세트 1회 선택"
Write-Host "  4) 일러스트 재시작"
Write-Host "  5) 획 패널의 프로파일 목록에 '폭 속성1'이 보이는지 확인"
Write-Host "  6) 창 > 확장 프로그램 > 스크립트 패널 (처음이면 폴더 지정으로 스크립트 폴더 선택)"
Write-Host ""
Write-Host "이후 스크립트 내용 수정은 원본만 고치면 바로 반영됩니다."
Write-Host "스크립트 파일을 추가·삭제·이름변경했을 때만 이 명령을 다시 실행하세요."

} catch {
    Write-Host "업데이트 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($PauseOnExit) { Read-Host "Enter 키를 누르면 닫습니다" | Out-Null }
}
