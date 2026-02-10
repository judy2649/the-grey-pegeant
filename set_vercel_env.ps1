# set_vercel_env.ps1
# Automates adding all environment variables to Vercel
# NOTE: FIREBASE_SERVICE_ACCOUNT must be added manually via Vercel Dashboard

$envVars = @{
    "MPESA_CONSUMER_KEY"     = "HpWGhCY8oFgHkfAAMFZp8kFZRUt4GRb86BD5hPv1Grzedts5"
    "MPESA_CONSUMER_SECRET"  = "kGrycSb8yPSAMBNOiLKOPtJkSj3p0a3GeGuW5U4JZrn1xkyRPceHzfIQa6ocu76A"
    "MPESA_PASSKEY"          = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
    "MPESA_SHORTCODE"        = "99202854"
    "MPESA_TILL_NUMBER"      = "9821671"
    "MPESA_TRANSACTION_TYPE" = "CustomerBuyGoodsOnline"
    "MPESA_ENV"              = "sandbox"
    "MPESA_CALLBACK_SECRET"  = "ef88e74c25e2b5e5e6061d8d6485e3ea170e0426ff2266fc090e306e82f14"
    "OPEN_SMS_API_TOKEN"     = "225|9IEK2W5gvZNUKThuRQe5FYgntd9sWaXkURMGBUCx8ad61230"
    "OPEN_SMS_SENDER_ID"     = "OpenSMS"
    "ADMIN_PHONE"            = "254794173314"
    "ADMIN_EMAIL"            = "judithoyoo64@gmail.com"
    "EMAIL_USER"             = "judithoyoo64@gmail.com"
    "EMAIL_PASS"             = "2013Kenya"
    "BASE_URL"               = "https://the-grey-pegeant.vercel.app"
}

Write-Host "🚀 Starting Vercel Environment Configuration..." -ForegroundColor Cyan
Write-Host "⚠️  FIREBASE_SERVICE_ACCOUNT must be added manually via Vercel Dashboard" -ForegroundColor Yellow

foreach ($name in $envVars.Keys) {
    $value = $envVars[$name]
    Write-Host "Adding $name..." -NoNewline
    Write-Output $value | npx -y vercel env add $name production
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    }
    else {
        Write-Host " [FAILED]" -ForegroundColor Red
    }
}

Write-Host "`n✅ All possible variables have been configured!" -ForegroundColor Green
Write-Host "Please run 'npx vercel --prod' to apply changes." -ForegroundColor Cyan
