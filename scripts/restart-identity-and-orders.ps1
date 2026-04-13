# Restarts user-identity-service (8081) and order-management-service (8084) after
# Docker infra (Redis, Kafka) is available. Run from repo root when those services
# were unhealthy due to Redis being down.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\restart-identity-and-orders.ps1
#
# Requires: Docker Desktop (or com.docker.service) running, docker compose up -d already applied.

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "system-backend"
$DockerDir = Join-Path $Backend "infrastructure\docker"
$LogDir = Join-Path $Root ".dev-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not $env:JAVA_HOME -or ($env:JAVA_HOME -notmatch 'jdk-21')) {
    $j21 = Get-ChildItem 'C:\Program Files\Java' -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^jdk-21' } | Select-Object -First 1
    if ($j21) {
        $env:JAVA_HOME = $j21.FullName
        $env:Path = "$($j21.FullName)\bin;$env:Path"
    }
}

Write-Host ">>> docker compose up -d ($DockerDir)"
Push-Location $DockerDir
try { docker compose up -d } finally { Pop-Location }
Write-Host ">>> Waiting for Redis..."
Start-Sleep -Seconds 8

function Stop-PortListener([int]$Port) {
    netstat -ano | findstr ":$Port " | ForEach-Object {
        if ($_ -match 'LISTENING\s+(\d+)\s*$') {
            $procId = [int]$Matches[1]
            if ($procId -gt 0) {
                Write-Host ">>> Stopping PID $procId on port $Port"
                taskkill /F /PID $procId 2>$null | Out-Null
            }
        }
    }
}

Stop-PortListener 8081
Stop-PortListener 8084
Start-Sleep -Seconds 2

function Start-SpringService {
    param([string] $ModulePath, [string] $LogName)
    $logFile = Join-Path $LogDir "$LogName.log"
    Write-Host ">>> Starting $ModulePath -> $logFile"
    if ($env:JAVA_HOME) {
        $jh = $env:JAVA_HOME -replace '"', '""'
        $inner = "set `"JAVA_HOME=$jh`"&& set `"PATH=%JAVA_HOME%\bin;%PATH%`"&& mvn -q -pl `"$ModulePath`" spring-boot:run >> `"$logFile`" 2>&1"
    } else {
        $inner = "mvn -q -pl `"$ModulePath`" spring-boot:run >> `"$logFile`" 2>&1"
    }
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $inner) -WorkingDirectory $Backend -WindowStyle Hidden -PassThru
    $pidFile = Join-Path $LogDir "$LogName.pid"
    $p.Id | Out-File -FilePath $pidFile -Encoding utf8
}

Start-SpringService "services/user-identity-service" "user-identity-service"
Start-Sleep -Seconds 5
Start-SpringService "services/order-management-service" "order-management-service"

Write-Host ""
Write-Host ">>> Started. Wait ~60s then check: http://127.0.0.1:8081/actuator/health and :8084/actuator/health"
Write-Host ">>> Logs: $LogDir"
