# Disposable loader fixture; never writes to Illustrator or user settings.
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Tokens = $null; $ParseErrors = $null
$Ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $Root 'setup-windows.ps1'), [ref]$Tokens, [ref]$ParseErrors)
if ($ParseErrors.Count) { throw ($ParseErrors | Out-String) }
foreach ($Name in @('Invoke-RepoGit', 'Get-IllustratorSettingsVersion', 'Install-Illustrator')) {
    $Definition = $Ast.Find({param($Node) $Node -is [Management.Automation.Language.FunctionDefinitionAst] -and $Node.Name -eq $Name}, $true)
    if (-not $Definition) { throw "Missing function: $Name" }
    Invoke-Expression $Definition.Extent.Text
}
function Test-IsAdministrator { return $true }
$Fixture = Join-Path ([IO.Path]::GetTempPath()) ('illu-setup-' + [guid]::NewGuid())
try {
    $RepoDir = Join-Path $Fixture 'repo'
    $SourceDir = Join-Path $RepoDir '스크립트'
    $Category = Join-Path $SourceDir '06_도형'
    New-Item -ItemType Directory -Path $Category -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $Category '테스트.jsx'), '// fixture')
    $KysName = 'absent.kys'; $ArrowName = 'absent.ai'; $WidthProfileName = 'absent.txt'
    $IllustratorVer = ''
    foreach ($Name in @('Adobe Illustrator 2026', 'Adobe Illustrator (Beta)')) {
        $AppPath = Join-Path $Fixture $Name
        $Target = Join-Path $AppPath 'Presets\ko_KR\스크립트\06_도형'
        New-Item -ItemType Directory -Path $Target -Force | Out-Null
        [IO.File]::WriteAllText((Join-Path $Target '옛 이름.jsx'), '// obsolete')
        # Explicit version exercises Beta installation without a real executable.
        $IllustratorVer = if ($Name -match 'Beta') { '31.0.0 Beta' } else { '' }
        Install-Illustrator (Get-Item -LiteralPath $AppPath)
        if (Test-Path (Join-Path $Target '옛 이름.jsx')) { throw 'Stale loader survived' }
        $Loader = [IO.File]::ReadAllText((Join-Path $Target '테스트.jsx'))
        if (-not $Loader.Contains('$.evalFile(new File(')) { throw 'Invalid loader' }
        if (-not $Loader.Contains($Category.Replace('\', '/'))) { throw 'Wrong source path' }
    }
    # Git failures must stop installation instead of being swallowed by try/catch.
    $Failed = $false
    try { Invoke-RepoGit -GitArguments @('-C', (Join-Path $Fixture 'missing'), 'pull', '--ff-only') } catch { $Failed = $true }
    if (-not $Failed) { throw 'Git failure was ignored' }
    $IllustratorVer = ''
    $RealBeta = Get-Item 'C:\Program Files\Adobe\Adobe Illustrator (Beta)' -ErrorAction SilentlyContinue
    if ($RealBeta) {
        $Version = Get-IllustratorSettingsVersion $RealBeta
        if ($Version -notmatch '^\d+\.\d+\.\d+ Beta$') { throw "Invalid Beta version: $Version" }
        Write-Host "Read-only Beta version check: $Version"
    }
    Write-Host 'PASS: syntax, regular/Beta loaders, obsolete loaders, Git failure, Beta version'
} finally {
    # Verified absolute temporary fixture path before recursive removal.
    $Resolved = [IO.Path]::GetFullPath($Fixture)
    $TempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (-not $Resolved.StartsWith($TempRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture cleanup path' }
    if (Test-Path -LiteralPath $Resolved) { Remove-Item -LiteralPath $Resolved -Recurse -Force }
}

