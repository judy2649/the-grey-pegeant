// Client-side Firebase Configuration
// This is for Analytics and frontend-only features.
// Backend operations (M-Pesa, Admin Verification) verify via the Server SDK.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyA2GbCBMleAjeR65-v_Xt9PeWzwYcLAEes",
    authDomain: "the-grey-pegeant.firebaseapp.com",
    projectId: "the-grey-pegeant",
    storageBucket: "the-grey-pegeant.firebasestorage.app",
    messagingSenderId: "369229418984",
    appId: "1:369229418984:web:e83983602e3eb914bad45d",
    measurementId: "G-CW24DM66G9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log('🔥 Client-side Firebase Analytics Initialized');

export { app, analytics };
