$ErrorActionPreference = 'Stop'

Write-Host '--- STARTING ROYALBET LIVE STACK ---' -ForegroundColor Cyan

$dockerDesktopPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$ngrokPath = 'C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\ngrok.ngrok_Microsoft.WinGet.Source_8wekyb3d8bbwe\ngrok.exe'
$composeFile = 'docker-compose.live.yml'
$envFile = '.env.live'
$adminMobile = '9998887766'
$adminPassword = 'admin123'
$adminHash = '$2b$10$HV9oKQRG.wfj.dgWrX2h7.kRsU6E//GRCgwUjIl7pgjUMiZij4FHm'
$adminUsername = 'AdminHQ'

function Wait-ForDocker {
    Write-Host 'Checking Docker status...'
    try {
        docker info > $null 2>&1
    } catch {
        $global:LASTEXITCODE = 1
    }

    if ($LASTEXITCODE -eq 0) {
        return
    }

    Write-Host 'Docker is not ready. Starting Docker Desktop...' -ForegroundColor Yellow
    Start-Process $dockerDesktopPath

    do {
        Start-Sleep -Seconds 5
        docker info > $null 2>&1
    } while ($LASTEXITCODE -ne 0)
}

function Stop-Ngrok {
    $ngrokProcesses = Get-Process ngrok -ErrorAction SilentlyContinue
    if ($ngrokProcesses) {
        Write-Host 'Stopping existing ngrok processes...'
        $ngrokProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
}

function Start-Ngrok {
    Write-Host 'Starting ngrok tunnels...'
    Start-Process -FilePath $ngrokPath -ArgumentList 'start', '--config', 'ngrok-config.yml', '--all' -WindowStyle Hidden

    for ($attempt = 1; $attempt -le 20; $attempt++) {
        Start-Sleep -Seconds 2
        try {
            $tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels'
            if ($tunnels.tunnels.Count -gt 0) {
                return $tunnels
            }
        } catch {
        }
    }

    throw 'ngrok tunnels did not become available on http://127.0.0.1:4040.'
}

function Write-LiveEnv($frontendUrl, $backendUrl) {
    $wsUrl = $backendUrl -replace '^https://', 'wss://'

    $envContent = @"
NGROK_FRONTEND_URL=$frontendUrl
NGROK_BACKEND_URL=$backendUrl
NGROK_BACKEND_WS_URL=$wsUrl
DB_PASSWORD=royalbet_pass
JWT_SECRET=secret-key-royalbet!
"@

    Set-Content -Path $envFile -Value $envContent
}

function Wait-ForHttp($url, $label, $timeoutSeconds = 180) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -Headers @{ 'ngrok-skip-browser-warning' = 'true' }
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Host "$label is ready at $url" -ForegroundColor Green
                return
            }
        } catch {
        }

        Start-Sleep -Seconds 3
    }

    throw "$label did not become ready within $timeoutSeconds seconds."
}

function Ensure-AdminAccess {
    Write-Host 'Seeding admin account and default settings...'

    $userSql = @"
INSERT INTO "User" (id, mobile, username, "passwordHash", role, balance, "isActive", "updatedAt")
VALUES ('super-admin-id', '$adminMobile', '$adminUsername', '$adminHash', 'ADMIN', 100000, true, NOW())
ON CONFLICT (mobile) DO UPDATE
SET username = EXCLUDED.username,
    "passwordHash" = EXCLUDED."passwordHash",
    role = EXCLUDED.role,
    balance = EXCLUDED.balance,
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = NOW();
"@

    $settingsSql = @"
INSERT INTO "AdminSettings" (id, "roundDuration", "minBetAmount", "maxBetAmount", "maintenanceMode", "updatedAt")
VALUES ('default-settings', 30, 10, 100000, false, NOW())
ON CONFLICT (id) DO UPDATE SET "roundDuration" = EXCLUDED."roundDuration";
"@

    $userSql | docker exec -i royalbet_postgres_live psql -v ON_ERROR_STOP=1 -U royalbet -d royalbet | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to seed admin user.'
    }

    $settingsSql | docker exec -i royalbet_postgres_live psql -v ON_ERROR_STOP=1 -U royalbet -d royalbet | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to seed default admin settings.'
    }
}

Wait-ForDocker

Stop-Ngrok
$tunnels = Start-Ngrok

$frontendUrl = ($tunnels.tunnels | Where-Object { $_.name -eq 'royal-web' }).public_url
$backendUrl = ($tunnels.tunnels | Where-Object { $_.name -eq 'royal-api' }).public_url

if (-not $frontendUrl -or -not $backendUrl) {
    throw 'Could not resolve both ngrok tunnel URLs from the configured tunnel names.'
}

Write-Host 'Writing live environment file...'
Write-LiveEnv -frontendUrl $frontendUrl -backendUrl $backendUrl

Write-Host 'Rebuilding and starting Docker services...'
docker compose --env-file $envFile -f $composeFile down --remove-orphans
docker compose --env-file $envFile -f $composeFile up -d --build

Wait-ForHttp -url 'http://127.0.0.1:4000/health' -label 'Backend health'
Wait-ForHttp -url 'http://127.0.0.1:3000/user' -label 'Frontend'

Ensure-AdminAccess

$backendWsUrl = $backendUrl -replace '^https://', 'wss://'

Write-Host ''
Write-Host '--- ROYALBET IS READY ---' -ForegroundColor Green
Write-Host "Local frontend:  http://127.0.0.1:3000/user"
Write-Host "Local admin:     http://127.0.0.1:3000/admin/login"
Write-Host "Local backend:   http://127.0.0.1:4000/health"
Write-Host "Public frontend: $frontendUrl"
Write-Host "Public backend:  $backendUrl"
Write-Host "Public ws:       $backendWsUrl"
Write-Host ''
Write-Host "Admin mobile:    $adminMobile"
Write-Host "Admin password:  $adminPassword"
Write-Host ''
Write-Host 'If ngrok shows a browser warning page, open the public URL once and continue to the site.' -ForegroundColor Yellow
