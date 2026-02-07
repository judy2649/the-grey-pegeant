# 🎟️ Event Ticketing Website (Kenya)

A professional event booking system with a **Direct Hosted Payment** flow. Designed to be secure, easy to maintain, and **keyless** for the developer.

## Features
- 📅 **Professional UI**: Clean, modern event cards and a guided booking modal.
- 💳 **Direct Payments**: Supports M-Pesa and Cards via professional hosted checkout (IntaSend/Pesapal).
- 🔑 **Keyless Integration**: No API keys are required in the source code, making it extremely easy to set up and highly secure.
- 📱 **Mobile Optimized**: Seamless experience on all devices.

## 🛠️ Setup Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Payment Link Setup**
    - Open `public/script.js`.
    - Find the `PAYMENT_LINK` constant and replace it with your public payment link URL from your IntaSend or Pesapal dashboard.
    - *Example:* `const PAYMENT_LINK = "https://intasend.com/pay/your-business";`

3.  **Run the Server**
    ```bash
    npm start
    ```
    - Visit `http://localhost:3000`

## 📂 Folder Structure
- `public/`: Frontend files (HTML, CSS, JS) - *Redesigned for modern aesthetics.*
- `src/controllers/`: Core application logic.
- `src/routes/`: API endpoints.

## 🚀 Deployment
This website is ready to be deployed to **Vercel**, **Netlify**, or any Node.js hosting platform. 
Since it uses a hosted checkout link, you don't need to configure complex environment variables for payments in your hosting dashboard!
