const admin = require('firebase-admin');
const path = require('path');

console.log("🚀 Testing Firebase Admin SDK Initialization...");

try {
    const serviceAccountPath = path.join(__dirname, '..', '..', 'serviceAccountKey.json');
    console.log(`📂 Checking for key file at: ${serviceAccountPath}`);

    const serviceAccount = require(serviceAccountPath);
    console.log("✅ serviceAccountKey.json found and parsed.");

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized successfully.");
    } else {
        console.log("ℹ️  Firebase Admin already initialized.");
    }

    const db = admin.firestore();
    console.log("✅ Firestore instance created.");

    // Try to list collections (requires read permissions)
    db.listCollections().then(collections => {
        console.log("✅ Connection test successful. Found collections:", collections.map(c => c.id).join(', '));
        process.exit(0);
    }).catch(err => {
        console.error("❌ Connection test failed:", err.message);
        process.exit(1);
    });

} catch (error) {
    console.error("❌ Test Failed:", error.message);
    process.exit(1);
}
