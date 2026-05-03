$ErrorActionPreference = "Stop"

echo "--------------------------------------------------"
echo "   ROYALBET AUTO-SYNC ENGINE (V3.0)               "
echo "--------------------------------------------------"

# 1. Kill everything
echo "[1/5] Clearing port deadlocks..."
taskkill /F /IM node.exe /FI "STATUS eq RUNNING" 2>$null
taskkill /F /IM ngrok.exe /FI "STATUS eq RUNNING" 2>$null
timeout /t 2 /nobreak

# 2. Start Ngrok in the background
echo "[2/5] Starting Cloud Tunnels..."
$ngrokPath = "$env:TEMP\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokPath)) { $ngrokPath = "ngrok" }

Start-Job -ScriptBlock { & $args[0] start --all --config C:\Users\Admin\Desktop\royalbackend\ngrok.yml } -ArgumentList $ngrokPath
timeout /t 15 /nobreak

# 3. Extract fresh URLs
echo "[3/5] Extracting Cloud Endpoints..."
$tunnels = Invoke-RestMethod http://127.0.0.1:4040/api/tunnels
$frontendUrl = ($tunnels.tunnels | Where-Object name -eq "frontend").public_url
$backendUrl = ($tunnels.tunnels | Where-Object name -eq "backend").public_url

if (-not $frontendUrl -or -not $backendUrl) {
    echo "!! ERROR: Ngrok failed to start. Check your internet or Ngrok account limits."
    exit 1
}

echo ">> Player Game: $frontendUrl"
echo ">> Backend API: $backendUrl"

# 4. Patch Source Code (The Magic Step)
echo "[4/5] Synchronizing Code with Tunnels..."

# Update page.jsx
$pagePath = "C:\Users\Admin\Desktop\royalbackend\src\app\(user)\page.jsx"
$pageContent = Get-Content $pagePath -Raw
$pageContent = $pageContent -replace 'https://[a-z0-9-]+\.ngrok-free\.app/game', "$backendUrl/game"
$pageContent | Out-File -FilePath $pagePath -Encoding utf8

# Update api-service.ts
$apiPath = "C:\Users\Admin\Desktop\royalbackend\src\lib\api\api-service.ts"
$apiContent = Get-Content $apiPath -Raw
$apiContent = $apiContent -replace 'https://[a-z0-9-]+\.ngrok-free\.app', "$backendUrl"
$apiContent | Out-File -FilePath $apiPath -Encoding utf8

# 5. Launch Servers
echo "[5/5] Launching Servers..."
Start-Process cmd -ArgumentList "/k", "cd /d C:\Users\Admin\Desktop\royalbackend\backend && npm run start:dev" 
Start-Process cmd -ArgumentList "/k", "cd /d C:\Users\Admin\Desktop\royalbackend && npm run dev"

echo "--------------------------------------------------"
echo "   SYSTEM IS FULLY SYNCED AND ONLINE!             "
echo "--------------------------------------------------"
echo "Player Link: $frontendUrl"
echo "--------------------------------------------------"
pause
