# 🎟️ Event Ticketing Website (Kenya)

A full-stack event booking system integrated with **Safaricom M-Pesa (Daraja API)** for payments and **Africa's Talking** for SMS ticket delivery.

## Features
- 📅 **Browse Events**: View upcoming events.
- 💳 **Lipa Na M-Pesa**: STK Push integration for seamless payments.
- 🎟️ **Instant Tickets**: Ticket number generated and sent via SMS.
- 💾 **Real-time DB**: Bookings stored in Firebase Firestore.

## Prerequisites
- Node.js installed.
- **M-Pesa Developer Account**: [developer.safaricom.co.ke](https://developer.safaricom.co.ke/) (Create a Lipa Na M-Pesa Online App).
- **Africa's Talking Account**: [africastalking.com](https://africastalking.com/).
- **Firebase Project** (Optional but recommended): Download `serviceAccountKey.json`.

## 🛠️ Setup Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Configuration**
    - Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    - Fill in your credentials:
        - `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`.
        - `AT_API_KEY`, `AT_USERNAME`.
    - **Important**: Your `BASE_URL` in `.env` must be publicly accessible (use **Ngrok** if testing locally) so Safaricom can send the callback.

3.  **Database (Firebase)**
    - Place your `serviceAccountKey.json` from Firebase in the project root.
    - If you skip this, the console will log warnings but M-Pesa STK Push will still trigger (bookings won't save).

4.  **Run the Server**
    ```bash
    npm start
    ```
    - Visit `http://localhost:3000`

## 🧪 Testing (Sandbox)

1.  **Expose Localhost** (for callbacks):
    ```bash
    npx ngrok http 3000
    ```
    - Copy the forwarding URL (e.g., `https://abc.ngrok.io`) to `BASE_URL` in your `.env`.

2.  **Simulate Booking**:
    - Open the website.
    - Click "Book Now".
    - Enter your phone number (can be real for Sandbox STK Push test, or use Safaricom simulator).
    - If using a real phone with a Sandbox App, you should see the STK Push prompt on your phone!

3.  **Ticket**:
    - Once you pay, the server receives a callback.
    - An SMS will be sent to the phone number with the Ticket ID.

## 📂 Folder Structure
- `public/`: Frontend files (HTML, CSS, JS)
- `src/controllers/`: Logic for M-Pesa, SMS
- `src/routes/`: API endpoints
- `src/utils/`: Helper functions (Ticket Generation)
- `src/config/`: App configuration
