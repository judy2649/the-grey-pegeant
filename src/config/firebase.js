const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Firebase can be initialized via:
// 1. serviceAccountKey.json file (local development)
// 2. FIREBASE_SERVICE_ACCOUNT env var (Vercel/Production - JSON string)

let serviceAccount;

// Try to load from environment variable first (Vercel deployment)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("🔥 Firebase credentials loaded from environment variable.");
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", error.message);
  }
}

// Fallback to local file (development)
if (!serviceAccount) {
  try {
    serviceAccount = require('../../serviceAccountKey.json');
    console.log("🔥 Firebase credentials loaded from serviceAccountKey.json.");
  } catch (error) {
    console.warn("⚠️  serviceAccountKey.json not found. Database operations will fail until valid credentials are provided.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase initialized successfully.");
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
