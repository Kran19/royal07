@echo off
title RoyalBet - Shutdown
color 0C

echo.
echo  ============================================
echo   ROYALBET PLATFORM - SHUTTING DOWN...
echo  ============================================
echo.

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

echo  Done. All processes stopped.
echo  ============================================
echo.
timeout /t 2 /nobreak >nul
