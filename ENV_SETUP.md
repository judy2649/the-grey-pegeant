# Quick Setup Guide - Set Environment Variables BEFORE Deployment

## Option 1: Using Vercel CLI (Recommended)

Run these commands one by one:

```bash
# M-Pesa Configuration
vercel env add MPESA_CONSUMER_KEY
# When prompted, enter: HpWGhCY8oFgHkfAAMFZp8kFZRUt4GRb86BD5hPv1Grzedts5
# Select: Production

vercel env add MPESA_CONSUMER_SECRET
# When prompted, enter: kGrycSb8yPSAMBNOiLKOPtJkSj3p0a3GeGuW5U4JZrn1xkyRPceHzfIQa6ocu76A
# Select: Production

vercel env add MPESA_PASSKEY
# When prompted, enter: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
# Select: Production

vercel env add MPESA_SHORTCODE
# When prompted, enter: 174379
# Select: Production

vercel env add MPESA_TILL_NUMBER
# When prompted, enter: 9821671
# Select: Production

vercel env add MPESA_TRANSACTION_TYPE
# When prompted, enter: CustomerPayBillOnline
# Select: Production

vercel env add MPESA_ENV
# When prompted, enter: sandbox
# Select: Production

vercel env add MPESA_CALLBACK_SECRET
# When prompted, enter: ef88e74c25e2b5e5e6061d8d6485e3ea170e0426ff2266fc090e306e82f14
# Select: Production

vercel env add AT_API_KEY
# When prompted, enter: your_api_key
# Select: Production

vercel env add AT_USERNAME
# When prompted, enter: sandbox
# Select: Production
```

## Option 2: Using Vercel Dashboard (Easier)

1. First deploy: `vercel`
2. Go to https://vercel.com/dashboard
3. Click your project → Settings → Environment Variables
4. Add each variable manually:

| Variable Name | Value |
|---------------|-------|
| MPESA_CONSUMER_KEY | HpWGhCY8oFgHkfAAMFZp8kFZRUt4GRb86BD5hPv1Grzedts5 |
| MPESA_CONSUMER_SECRET | kGrycSb8yPSAMBNOiLKOPtJkSj3p0a3GeGuW5U4JZrn1xkyRPceHzfIQa6ocu76A |
| MPESA_PASSKEY | bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919 |
| MPESA_SHORTCODE | 174379 |
| MPESA_TILL_NUMBER | 9821671 |
| MPESA_TRANSACTION_TYPE | CustomerPayBillOnline |
| MPESA_ENV | sandbox |
| MPESA_CALLBACK_SECRET | ef88e74c25e2b5e5e6061d8d6485e3ea170e0426ff2266fc090e306e82f14 |
| AT_API_KEY | your_api_key |
| AT_USERNAME | sandbox |

5. After adding variables, redeploy: `vercel --prod`

## ⚠️ After Deployment

Set BASE_URL to your deployed URL:
```bash
vercel env add BASE_URL
# Enter: https://your-app-name.vercel.app
# Select: Production
```

Then redeploy:
```bash
vercel --prod
```
