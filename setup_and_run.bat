@echo off
echo ==========================================
echo      SETTING UP THE GREY PAGEANT
echo ==========================================
echo.

if not exist node_modules (
    echo [INFO] node_modules folder is missing. Installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed! Please check your internet connection.
        pause
        exit /b %errorlevel%
    )
    echo.
    echo [SUCCESS] Dependencies installed!
) else (
    echo [INFO] Dependencies already found.
)

echo.
echo ==========================================
echo      STARTING SERVER (PORT 3002)
echo ==========================================
echo.
echo Please keep this window OPEN.
echo Go to http://localhost:3002 in your browser.
echo.

node start_alternate.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server crashed or failed to start.
    echo 1. Check if Node.js is installed.
    echo 2. Check if another program is using port 3002.
    pause
)
