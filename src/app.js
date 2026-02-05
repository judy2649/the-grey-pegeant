const express = require('express');
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
app.use(express.static('public')); // Serve frontend

// Routes
app.use('/api', apiRoutes);

// Start Server (Only if running directly, e.g., locally)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`💳 Callback URL should point to: ${process.env.BASE_URL}/api/callback`);
    });
}

// Export for Vercel
module.exports = app;
