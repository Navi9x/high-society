@echo off
echo.
echo  ============================================
echo   EventPass - Event Day Startup
echo  ============================================
echo.

REM Start the server in a new window
start "EventPass Server" cmd /k "cd /d "%~dp0" && npm start"

REM Wait 3 seconds for the server to boot
timeout /t 3 /nobreak >nul

REM Start the localtunnel in a new window, grab the URL
start "EventPass Tunnel" cmd /k "cd /d "%~dp0" && npm run tunnel"

echo.
echo  Two windows have opened:
echo   [1] Server window (keep open)
echo   [2] Tunnel window (your public URL will appear there)
echo.
echo  Password for the tunnel: visit https://loca.lt/mytunnelpassword
echo.
pause
