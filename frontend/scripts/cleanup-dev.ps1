param(
    [switch]$Force
)

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$LockFile = "$ProjectRoot\.next\dev\lock"
$DevPort = 3000

Write-Host "=== Next.js Dev Server Cleanup ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

function Get-ProcessCommandLine($ProcessId) {
    try {
        return (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop).CommandLine
    } catch {
        return $null
    }
}

function Get-ProcessByPort($Port) {
    $conn = netstat -ano | Select-String ":$Port\s"
    if ($conn) {
        return ($conn -split '\s+')[-1] -as [int]
    }
    return $null
}

function Test-IsProjectNextDev($ProcessId) {
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) { return $false }
    if ($proc.ProcessName -notmatch '^node$') { return $false }

    $cmd = Get-ProcessCommandLine $ProcessId
    if (-not $cmd) { return $false }

    $hasProjectDir = $cmd -match [Regex]::Escape($ProjectRoot)
    $hasNextDev = $cmd -match 'next dev'

    return ($hasProjectDir -and $hasNextDev)
}

function Stop-DevServer($ProcessId) {
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) { return $false }

    Write-Host "Process:   $($proc.ProcessName) (PID $ProcessId)" -ForegroundColor Gray
    Write-Host "Started:   $($proc.StartTime)" -ForegroundColor Gray
    Write-Host ""

    if (-not $Force) {
        $confirmed = (Read-Host "Terminate this process? (y/N)") -match '^[yY]'
        if (-not $confirmed) { return $false }
    }

    Write-Host "Terminating PID $ProcessId..." -ForegroundColor Yellow
    taskkill /PID $ProcessId 2>$null
    Start-Sleep -Seconds 2

    if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
        Write-Host "Process did not exit gracefully. Force-killing..." -ForegroundColor Yellow
        taskkill /F /PID $ProcessId 2>$null
        Start-Sleep -Seconds 1
    }

    Write-Host "Process terminated." -ForegroundColor Green
    return $true
}

# ---- Phase 1: Try lock file (optimization - may not exist or may be locked) ----
$foundPids = @{}
$killedAny = $false
$lockHintPid = $null

if (Test-Path $LockFile) {
    try {
        $lock = Get-Content $LockFile -Raw -ErrorAction Stop | ConvertFrom-Json
        Write-Host "[1/2] Lock file found: PID $($lock.pid) on port $($lock.port)" -ForegroundColor Gray
        $lockHintPid = $lock.pid -as [int]
    } catch {
        Write-Host "[1/2] Lock file exists but is locked by the running server" -ForegroundColor Gray
    }
} else {
    Write-Host "[1/2] No lock file found (first start or after clean)" -ForegroundColor Gray
}

# ---- Phase 2: Scan all node processes for this project's next dev ----
Write-Host "[2/2] Scanning for Next.js dev server processes..." -ForegroundColor Gray
$candidates = @()

$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcs) {
    if (Test-IsProjectNextDev $proc.Id) {
        $candidates += $proc.Id
        $foundPids[$proc.Id] = $true
    }
}

if ($candidates.Count -gt 0) {
    Write-Host "Found $($candidates.Count) Next.js dev server(s) from this project." -ForegroundColor Yellow
    Write-Host ""

    foreach ($pid in $candidates) {
        if (Stop-DevServer $pid) {
            $killedAny = $true
        } else {
            Write-Host "Skipped PID $pid." -ForegroundColor Gray
            if (-not $Force) { exit 1 }
        }
        Write-Host ""
    }
} else {
    Write-Host "No Next.js dev server found for this project." -ForegroundColor Green
    Write-Host ""

    # Fallback: check port 3000 for any process (informational only)
    $portPid = Get-ProcessByPort $DevPort
    if ($portPid) {
        $cmd = Get-ProcessCommandLine $portPid
        Write-Host "Port $DevPort is in use by PID $portPid (not from this project):" -ForegroundColor Yellow
        Write-Host "  Command: $cmd" -ForegroundColor Gray
        Write-Host ""
        Write-Host "This will prevent Next.js from using port $DevPort." -ForegroundColor Yellow
        if (-not $Force) {
            $confirmed = (Read-Host "Terminate this process? (y/N)") -match '^[yY]'
            if ($confirmed) {
                taskkill /F /PID $portPid 2>$null
                Write-Host "Process terminated." -ForegroundColor Green
                $killedAny = $true
            }
        }
    } else {
        Write-Host "Port $DevPort is free." -ForegroundColor Green
    }
}

# ---- Clean up stale lock file ----
if ($killedAny -or ($lockHintPid -and -not (Get-Process -Id $lockHintPid -ErrorAction SilentlyContinue))) {
    if (Test-Path $LockFile) {
        Write-Host ""
        Write-Host "Cleaning up lock file..." -ForegroundColor Yellow
        try {
            Remove-Item $LockFile -Force -ErrorAction Stop
            Write-Host "Lock file removed." -ForegroundColor Green
        } catch {
            Write-Host "Could not remove lock file (may be held by another process)." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
if ($killedAny) {
    Write-Host "Ready. You can now run 'npm run dev'." -ForegroundColor Cyan
} else {
    Write-Host "No cleanup needed." -ForegroundColor Cyan
}
