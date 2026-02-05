const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Use __dirname for more reliable path resolution on different environments
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api', apiRoutes);

// Start Server (Only if running directly, e.g., locally)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);

        if (!process.env.BASE_URL || process.env.BASE_URL.includes('your-domain.com')) {
            console.warn('⚠️ WARNING: BASE_URL is not set correctly in .env. M-Pesa callbacks will fail!');
            console.log(`💡 Local testing Tip: Use Ngrok and set BASE_URL to your ngrok URL.`);
        } else {
            console.log(`💳 Callback URL: ${process.env.BASE_URL}/api/callback`);
        }
    });
}

// Export for Vercel
module.exports = app;
