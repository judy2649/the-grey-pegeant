## Deployment Guide

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

### 4. Set Environment Variables on Vercel

After deployment, add these environment variables in Vercel Dashboard:

**Go to**: Your Project → Settings → Environment Variables

Add each of these:

```
MPESA_CONSUMER_KEY=HpWGhCY8oFgHkfAAMFZp8kFZRUt4GRb86BD5hPv1Grzedts5
MPESA_CONSUMER_SECRET=kGrycSb8yPSAMBNOiLKOPtJkSj3p0a3GeGuW5U4JZrn1xkyRPceHzfIQa6ocu76A
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_SHORTCODE=174379
MPESA_TILL_NUMBER=9821671
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_ENV=sandbox
MPESA_CALLBACK_SECRET=<GENERATE_A_STRONG_RANDOM_SECRET>
BASE_URL=<YOUR_VERCEL_URL>
AT_API_KEY=your_api_key
AT_USERNAME=sandbox
FIREBASE_SERVICE_ACCOUNT=<PASTE_ENTIRE_FIREBASE_JSON_HERE>
```

### 5. Generate Callback Secret

Run this to generate a secure random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `MPESA_CALLBACK_SECRET`.

### 6. Get Firebase Service Account JSON

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file
6. Copy the **entire contents** and paste as `FIREBASE_SERVICE_ACCOUNT` (as one line)

### 7. Update BASE_URL

After deployment, Vercel will give you a URL like:
`https://the-grey-peagant.vercel.app`

Update `BASE_URL` environment variable with this URL.

### 8. Update M-Pesa Callback URL

Go to Daraja Portal and update your callback URL to:
`https://your-vercel-url.vercel.app/api/callback`

### 9. Redeploy

After setting all environment variables:
```bash
vercel --prod
```

## Security Features Added

✅ **Callback Secret Validation** - Prevents fake payment confirmations
✅ **Environment Variables** - Sensitive data not in code
✅ **Firebase Cloud Database** - Accessible from anywhere
✅ **HTTPS by Default** - Secure connections on Vercel

## Testing

Test your deployment:
```bash
curl -X POST https://your-vercel-url.vercel.app/api/pay \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0794173314","amount":1,"eventId":"evt_grey_pageant"}'
```
