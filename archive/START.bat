@echo off
title RoyalBet Platform Launcher (Multi-Service)
color 0B

echo.
echo  ============================================
echo   ROYALBET PLATFORM - FULL SYSTEM REBOOT
echo  ============================================
echo.

:: Step 1: Force Kill Tunnels and Services
echo [1/4] Cleaning up rogue processes on 3000/4000...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Step 2: Start NestJS Backend
echo [2/4] Starting Game Engine (NestJS) on port 4000...
start "RoyalBet - Game Engine (4000)" cmd /k "cd /d %~dp0backend && npm run start:dev"
timeout /t 5 /nobreak >nul

:: Step 3: Start Next.js Frontend
echo [3/4] Starting Game Client (Next.js) on port 3000...
start "RoyalBet - Game Client (3000)" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 5 /nobreak >nul

:: Step 4: Start Ngrok Multi-Tunnel
echo [4/4] Starting Public Cloud Tunnels (Ngrok)...
start "RoyalBet - Cloud Tunnels" cmd /k "cd /d %~dp0 && %TEMP%\ngrok\ngrok.exe start --all --config ngrok.yml"

echo.
echo  ============================================
echo   SUCCESS! 3 Terminal windows have opened:
echo   1. Game Engine (Backend API)
echo   2. Game Client (Frontend Interface)
echo   3. Cloud Tunnels (Ngrok URLs)
echo.
echo   Check the "Cloud Tunnels" window for your 
echo   Global Player and Admin links!
echo  ============================================
echo.
pause
