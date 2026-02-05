@echo off
echo Setting environment variables for Vercel...
echo.

REM M-Pesa Variables
vercel env add MPESA_CONSUMER_KEY production
echo HpWGhCY8oFgHkfAAMFZp8kFZRUt4GRb86BD5hPv1Grzedts5

vercel env add MPESA_CONSUMER_SECRET production
echo kGrycSb8yPSAMBNOiLKOPtJkSj3p0a3GeGuW5U4JZrn1xkyRPceHzfIQa6ocu76A

vercel env add MPESA_PASSKEY production
echo bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

vercel env add MPESA_SHORTCODE production
echo 174379

vercel env add MPESA_TILL_NUMBER production
echo 9821671

vercel env add MPESA_TRANSACTION_TYPE production
echo CustomerPayBillOnline

vercel env add MPESA_ENV production
echo sandbox

vercel env add MPESA_CALLBACK_SECRET production
echo ef88e74c25e2b5e5e6061d8d6485e3ea170e0426ff2266fc090e306e82f14

REM Africa's Talking
vercel env add AT_API_KEY production
echo your_api_key

vercel env add AT_USERNAME production
echo sandbox

echo.
echo Environment variables set successfully!
echo NOTE: You still need to set BASE_URL after deployment
pause
