@echo off
echo ==============================================
echo    SETTING VERCEL ENVIRONMENT VARIABLES
echo ==============================================
echo.

REM Verify Vercel login first
echo [1/4] Checking Vercel connection...
call npx -y vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] You are not logged into Vercel. 
    echo Please run 'npx vercel login' first, then run this script again.
    pause
    exit /b
)

echo [2/4] Removing old SMS keys...
call npx -y vercel env rm AT_API_KEY production -y >nul 2>&1
call npx -y vercel env rm AT_USERNAME production -y >nul 2>&1

echo [3/4] Adding OpenSMS & Email Config...

echo | set /p="225|9IEK2W5gvZNUKThuRQe5FYgntd9sWaXkURMGBUCx8ad61230" | npx -y vercel env add OPEN_SMS_API_TOKEN production
echo | set /p="OpenSMS" | npx -y vercel env add OPEN_SMS_SENDER_ID production
echo | set /p="+254794173314" | npx -y vercel env add ADMIN_PHONE production
echo | set /p="judithoyoo64@gmail.com" | npx -y vercel env add ADMIN_EMAIL production
echo | set /p="judithoyoo64@gmail.com" | npx -y vercel env add EMAIL_USER production
echo | set /p="2013Kenya" | npx -y vercel env add EMAIL_PASS production

echo [4/4] Syncing M-Pesa Config...
echo | set /p="HpWGhCY8oFgHkfAAMFZp8kFZRUt4GRb86BD5hPv1Grzedts5" | npx -y vercel env add MPESA_CONSUMER_KEY production
echo | set /p="kGrycSb8yPSAMBNOiLKOPtJkSj3p0a3GeGuW5U4JZrn1xkyRPceHzfIQa6ocu76A" | npx -y vercel env add MPESA_CONSUMER_SECRET production
echo | set /p="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" | npx -y vercel env add MPESA_PASSKEY production
echo | set /p="99202854" | npx -y vercel env add MPESA_SHORTCODE production
echo | set /p="sandbox" | npx -y vercel env add MPESA_ENV production

echo.
echo ==============================================
echo ✅ Environment variables updated!
echo Your site will use OpenSMS for notifications.
echo ==============================================
echo.
echo IMPORTANT: Run 'npx vercel --prod' to redeploy with new settings.
pause
