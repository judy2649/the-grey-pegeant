const app = require('./src/app');
const dotenv = require('dotenv');

dotenv.config();

const PORT = 3002; // Alternate port

app.listen(PORT, () => {
    console.log(`\n🚀 ALTERNATE SERVER RUNNING ON: http://localhost:${PORT}`);
    console.log(`Open this URL in your browser if 3000 is not working.\n`);
});
