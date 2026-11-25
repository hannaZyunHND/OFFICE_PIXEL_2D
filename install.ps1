<#
.SYNOPSIS
    Cai Pixel Agent Office tren may Windows moi (may sep).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RootDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $RootDir

function Write-Info([string]$Msg) { Write-Host "[CAI] $Msg" -ForegroundColor Cyan }
function Write-Warn([string]$Msg) { Write-Host "[WARN] $Msg" -ForegroundColor Yellow }

function Read-DotEnv([string]$EnvPath) {
    $map = @{}
    if (-not (Test-Path $EnvPath)) { return $map }
    foreach ($raw in Get-Content -Path $EnvPath -Encoding UTF8) {
        $line = $raw.Trim()
        if (-not $line -or $line.StartsWith('#') -or ($line -notmatch '=')) { continue }
        $parts = $line.Split('=', 2)
        $k = $parts[0].Trim()
        $v = $parts[1].Trim().Trim('"').Trim("'")
        if ($k) { $map[$k] = $v }
    }
    return $map
}

Write-Host ''
Write-Host '=== CAI PIXEL AGENT OFFICE TREN MAY NAY ===' -ForegroundColor White

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    throw 'Chua co Node.js. Cai ban 22.14 tro len (x64): https://nodejs.org/dist/v22.21.1/node-v22.21.1-x64.msi'
}
$nodeVer = (& node -p "process.versions.node").Trim()
$nodeParts = $nodeVer.Split('.')
$nodeOk = ([int]$nodeParts[0] -gt 22) -or (([int]$nodeParts[0] -eq 22) -and ([int]$nodeParts[1] -ge 14))
if (-not $nodeOk) {
    throw "Node $nodeVer qua cu. Can >= 22.14 vi app dung node:sqlite. Tai: https://nodejs.org/dist/v22.21.1/node-v22.21.1-x64.msi"
}
Write-Info "Node $nodeVer"

$pyCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pyCmd -or $pyCmd.Source -like '*WindowsApps*') {
    throw 'Chua co Python. Cai Python 3.11+ va tick "Add python.exe to PATH": https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe'
}
& python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)"
if ($LASTEXITCODE -ne 0) {
    throw 'Python phai >= 3.11. Tai: https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe'
}
Write-Info "Python $(python -c "import sys; print(sys.version.split()[0])")"

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Warn 'Chua co Git. Van phong van chay, nhung KHONG day bao cao len GitHub Pages duoc.'
    Write-Warn 'Cai Git for Windows: https://git-scm.com/download/win'
} else {
    Write-Info "Git $($gitCmd.Source)"
    Write-Warn 'Lan dau day bao cao, Git se hoi dang nhap GitHub. Dung dung tai khoan dang so huu pixel-office-reports.'
}

$venvPy = Join-Path $RootDir 'crewAI\.venv\Scripts\python.exe'
if (-not (Test-Path $venvPy)) {
    Write-Info 'Tao moi truong Python crewAI\.venv ...'
    & python -m venv (Join-Path $RootDir 'crewAI\.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Tao venv that bai.' }
}
Write-Info 'Cai goi Python (websockets) ...'
& $venvPy -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'pip upgrade that bai.' }
& $venvPy -m pip install -r (Join-Path $RootDir 'crewAI\requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'pip install that bai.' }

if (-not (Test-Path (Join-Path $RootDir 'node_modules'))) {
    Write-Info 'npm install ...'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'npm install that bai.' }
} else {
    Write-Info 'node_modules da co, bo qua npm install.'
}

$envFile = Join-Path $RootDir '.env'
$envExample = Join-Path $RootDir '.env.example'
if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Warn 'Chua co .env nen da copy tu .env.example. Dien key roi chay lai.'
    }
}
$envMap = Read-DotEnv $envFile
foreach ($key in @('ADDLIVETAG_API_KEY', 'APIFY_API_TOKEN', 'SERPER_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID')) {
    if ($envMap[$key]) {
        Write-Info "$key : co"
    } else {
        Write-Warn "$key : trong"
    }
}

Write-Host ''
Write-Host 'Cai xong. Buoc tiep:' -ForegroundColor Green
Write-Host '  1. Tat ban dang chay o may cu (bot Telegram chi duoc nghe o 1 may).'
Write-Host '  2. .\run.ps1 -OpenBrowser'
Write-Host '  3. Giu tab http://localhost:34213 mo de anh van phong gui duoc.'
Write-Host '  4. Nhan tin trong group Telegram de thu.'
Write-Host ''
