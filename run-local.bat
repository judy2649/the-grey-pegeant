@echo off
echo 🚀 Starting The Grey Pageant Local Server...
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies first...
    call npm install
)

REM Start the server in a new window
start "The Grey Pageant Server" cmd /k "node src/app.js"

echo ✅ Server is starting!
echo 🌐 Open your browser at: http://localhost:3000
echo.
echo 🧪 To run the test sprite:
echo    node testsprite.js
echo.
echo 💡 Reminder: If you want to test M-Pesa callbacks locally, 
echo    you must use Ngrok and update your BASE_URL in .env.
echo.
pause
