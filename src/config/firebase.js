const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// You need to generate a serviceAccountKey.json from Firebase Console
// Project Settings -> Service Accounts -> Generate New Private Key
// Save the file as 'serviceAccountKey.json' in the root directory
// OR set the GOOGLE_APPLICATION_CREDENTIALS env var

let serviceAccount;
try {
  serviceAccount = require('../../serviceAccountKey.json');
} catch (error) {
  console.warn("⚠️  serviceAccountKey.json not found. Database operations will fail until valid credentials are provided.");
  // For development without keys, we might mock DB or provide a dummy object to prevent crash
  // In production, this should throw
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🔥 Firebase initialized successfully.");
} else {
  console.log("⚠️ Firebase skipping initialization (No credentials). DB will be mocked.");
}

let db = null;
try {
  if (serviceAccount) {
    db = admin.firestore();
  }
} catch (e) {
  console.error("Error initializing Firestore:", e);
}

module.exports = { admin, db };
