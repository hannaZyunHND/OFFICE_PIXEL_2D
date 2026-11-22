<#
.SYNOPSIS
    Khoi chay dong thoi Pixel Agent Office 2D (FE) va CrewAI Unified WS+HTTP Server
    trong 1 cua so terminal Windows duy nhat.

.EXAMPLE
    .\run.ps1
    .\run.ps1 -OpenBrowser
    .\run.ps1 -KillExisting -OpenBrowser
#>
[CmdletBinding()]
param(
    [switch]$OpenBrowser,
    [switch]$SkipInstall,
    [switch]$KillExisting
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RootDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $RootDir

function Write-Info([string]$Msg) {
    Write-Host "[RUN] $Msg" -ForegroundColor Cyan
}

function Write-Warn([string]$Msg) {
    Write-Host "[WARN] $Msg" -ForegroundColor Yellow
}

function Resolve-NodeBinDir {
    $npmCmd = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($npmCmd) {
        return (Split-Path -Parent $npmCmd.Source)
    }
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\nodejs'),
        (Join-Path $env:ProgramFiles 'nodejs'),
        'C:\Program Files\nodejs'
    )
    foreach ($dir in $candidates) {
        if ($dir -and (Test-Path (Join-Path $dir 'npm.cmd'))) {
            $env:PATH = "$dir;$env:PATH"
            return $dir
        }
    }
    throw 'Khong tim thay Node.js / npm.cmd. Vui long cai Node.js (>= 22.14).'
}

function Resolve-PythonExe {
    $venvCandidates = @(
        (Join-Path $RootDir 'crewAI\.venv\Scripts\python.exe'),
        (Join-Path $RootDir '.venv\Scripts\python.exe')
    )
    foreach ($v in $venvCandidates) {
        if (Test-Path $v) { return $v }
    }

    $pyCmd = Get-Command 'python' -ErrorAction SilentlyContinue
    if ($pyCmd -and $pyCmd.Source -notlike '*WindowsApps*') {
        return $pyCmd.Source
    }

    $localPyDir = Join-Path $env:LOCALAPPDATA 'Programs\Python'
    if (Test-Path $localPyDir) {
        $found = Get-ChildItem -Path $localPyDir -Directory -Filter 'Python3*' |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'python.exe' } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($found) { return $found }
    }

    throw 'Khong tim thay Python 3.x. Vui long cai Python (>= 3.11) hoac tao venv tai crewAI\.venv.'
}

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

function Test-PortInUse([int]$Port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($conn) { return [int]$conn.OwningProcess }
    } catch {
        # Fallback cho moi truong khong ho tro Get-NetTCPConnection
    }
    return $null
}

function Stop-ProcessTree([int]$ProcessId) {
    if ($ProcessId -le 0) { return }
    try {
        $p = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($p -and -not $p.HasExited) {
            & taskkill.exe /PID $ProcessId /T /F *> $null
        }
    } catch {
        # Bo qua neu process da thoat
    }
}

# 1. Khoi tao .env neu chua co
$EnvFile = Join-Path $RootDir '.env'
$EnvExample = Join-Path $RootDir '.env.example'
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Warn 'Chua co file .env — da tao tu .env.example. Hay dien API keys neu muon chay LIVE.'
    } else {
        Write-Warn 'Chua co .env; su dung port mac dinh 34213 / 34214.'
    }
}

$EnvMap = Read-DotEnv $EnvFile
$FePort = if ($EnvMap['VITE_PORT']) { [int]$EnvMap['VITE_PORT'] } else { 34213 }
$CrewHost = if ($EnvMap['CREWAI_HOST']) { $EnvMap['CREWAI_HOST'] } else { 'localhost' }
$CrewPort = if ($EnvMap['CREWAI_PORT']) { [int]$EnvMap['CREWAI_PORT'] } elseif ($EnvMap['VITE_CREWAI_PORT']) { [int]$EnvMap['VITE_CREWAI_PORT'] } else { 34214 }

# 2. Kiem tra cong dang ban
foreach ($portCheck in @(
    @{ Name = 'Frontend Vite'; Port = $FePort },
    @{ Name = 'CrewAI Server'; Port = $CrewPort }
)) {
    $busyPid = Test-PortInUse $portCheck.Port
    if ($busyPid) {
        if ($KillExisting) {
            Write-Warn "Cong $($portCheck.Port) ($($portCheck.Name)) dang duoc PID $busyPid su dung — dang tat..."
            Stop-ProcessTree $busyPid
            Start-Sleep -Milliseconds 600
        } else {
            throw "Cong $($portCheck.Port) ($($portCheck.Name)) dang bi PID $busyPid chiem. Chay lai voi .\run.ps1 -KillExisting hoac doi port trong .env."
        }
    }
}

# 3. Kiem tra Node.js & Python dependencies
$null = Resolve-NodeBinDir
$PythonExe = Resolve-PythonExe
$env:PYTHONIOENCODING = 'utf-8'

if (-not $SkipInstall -and -not (Test-Path (Join-Path $RootDir 'node_modules'))) {
    Write-Info 'Chua thay node_modules — dang chay npm.cmd install...'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'npm.cmd install that bai.' }
}

& $PythonExe -c "import websockets" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Info 'Dang cai dat goi Python websockets...'
    & $PythonExe -m pip install websockets
    if ($LASTEXITCODE -ne 0) { throw 'Cai dat websockets that bai.' }
}

$AddLiveTagState = if ($EnvMap['ADDLIVETAG_API_KEY']) { 'LIVE (.env)' } else { 'SANDBOX (trong)' }
$ApifyState = if ($EnvMap['APIFY_API_TOKEN']) { 'LIVE (.env)' } else { 'SANDBOX (trong)' }
$SerperState = if ($EnvMap['SERPER_API_KEY']) { 'LIVE (.env)' } else { 'SANDBOX (trong)' }

# 4. Chuan bi file log de gop 2 luong log vao 1 terminal duy nhat
$LogDir = Join-Path $RootDir 'logs'
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$CrewOutLog = Join-Path $LogDir 'crewai-stdout.log'
$CrewErrLog = Join-Path $LogDir 'crewai-stderr.log'
$FeOutLog = Join-Path $LogDir 'fe-stdout.log'
$FeErrLog = Join-Path $LogDir 'fe-stderr.log'
@($CrewOutLog, $CrewErrLog, $FeOutLog, $FeErrLog) | ForEach-Object {
    [System.IO.File]::WriteAllText($_, '', (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host ''
Write-Host '====================================================================' -ForegroundColor DarkCyan
Write-Host '  PIXEL AGENT OFFICE 2D + CREWAI SINGLE-TERMINAL LAUNCHER' -ForegroundColor White
Write-Host '====================================================================' -ForegroundColor DarkCyan
Write-Host "  Frontend UI      : http://localhost:$FePort/" -ForegroundColor Green
Write-Host "  CrewAI WebSocket : ws://${CrewHost}:$CrewPort" -ForegroundColor Cyan
Write-Host "  CrewAI Portal    : http://${CrewHost}:$CrewPort/" -ForegroundColor Cyan
Write-Host "  API Keys (.env)  : AddLiveTag=$AddLiveTagState | Apify=$ApifyState | Serper=$SerperState" -ForegroundColor Gray
Write-Host "  Python           : $PythonExe" -ForegroundColor DarkGray
Write-Host '  Nhan Ctrl+C de dung dong thoi ca CrewAI va Frontend.' -ForegroundColor Yellow
Write-Host '====================================================================' -ForegroundColor DarkCyan
Write-Host ''

$CrewServerPy = Join-Path $RootDir 'crewAI\server.py'
$CrewProc = $null
$FeProc = $null

$StreamOffsets = @{
    $CrewOutLog = [long]0
    $CrewErrLog = [long]0
    $FeOutLog   = [long]0
    $FeErrLog   = [long]0
}

function Flush-PrefixedLogs {
    $sources = @(
        @{ Path = $CrewOutLog; Tag = '[CREWAI]'; Color = 'Cyan' },
        @{ Path = $CrewErrLog; Tag = '[CREWAI:ERR]'; Color = 'Red' },
        @{ Path = $FeOutLog;   Tag = '[FE]'; Color = 'Green' },
        @{ Path = $FeErrLog;   Tag = '[FE:ERR]'; Color = 'Red' }
    )
    $utf8 = [System.Text.Encoding]::UTF8
    foreach ($src in $sources) {
        $p = $src.Path
        if (-not (Test-Path $p)) { continue }
        try {
            $fs = [System.IO.File]::Open($p, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            try {
                $len = $fs.Length
                $seen = $StreamOffsets[$p]
                if ($len -gt $seen) {
                    $null = $fs.Seek($seen, [System.IO.SeekOrigin]::Begin)
                    $buf = New-Object byte[] ($len - $seen)
                    $read = $fs.Read($buf, 0, $buf.Length)
                    if ($read -gt 0) {
                        $StreamOffsets[$p] = $seen + $read
                        $chunk = $utf8.GetString($buf, 0, $read)
                        foreach ($line in ($chunk -split "`r?`n")) {
                            if ($line.Trim().Length -gt 0) {
                                Write-Host "$($src.Tag) $line" -ForegroundColor $src.Color
                            }
                        }
                    }
                }
            } finally {
                $fs.Dispose()
            }
        } catch {
            # Bo qua tam thoi neu luong dang ghi
        }
    }
}

try {
    $CrewProc = Start-Process -FilePath $PythonExe `
        -ArgumentList @('-u', "`"$CrewServerPy`"") `
        -WorkingDirectory $RootDir `
        -NoNewWindow -PassThru `
        -RedirectStandardOutput $CrewOutLog `
        -RedirectStandardError $CrewErrLog

    $FeProc = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList @('/c', 'npm.cmd', 'run', 'dev') `
        -WorkingDirectory $RootDir `
        -NoNewWindow -PassThru `
        -RedirectStandardOutput $FeOutLog `
        -RedirectStandardError $FeErrLog

    $browserOpened = $false
    while ($true) {
        Flush-PrefixedLogs

        if ($OpenBrowser -and -not $browserOpened) {
            $feText = Get-Content -Path $FeOutLog -Raw -ErrorAction SilentlyContinue
            if ($feText -and ($feText -match "localhost:$FePort")) {
                $browserOpened = $true
                Start-Process "http://localhost:$FePort/" | Out-Null
            }
        }

        if ($CrewProc.HasExited) {
            Start-Sleep -Milliseconds 200
            Flush-PrefixedLogs
            throw "CrewAI Server da thoat bat ngo (exit code: $($CrewProc.ExitCode))."
        }
        if ($FeProc.HasExited) {
            Start-Sleep -Milliseconds 200
            Flush-PrefixedLogs
            throw "Vite Frontend da thoat bat ngo (exit code: $($FeProc.ExitCode))."
        }

        Start-Sleep -Milliseconds 200
    }
} finally {
    Write-Host ''
    Write-Info 'Dang dung CrewAI Server va Vite Frontend...'
    if ($FeProc) { Stop-ProcessTree $FeProc.Id }
    if ($CrewProc) { Stop-ProcessTree $CrewProc.Id }
    Flush-PrefixedLogs
    Write-Info 'Da tat sach ca 2 server.'
}
