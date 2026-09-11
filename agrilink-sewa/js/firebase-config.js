// =====================================================
// AGRILINK SEWA - FIREBASE MODULAR SDK (v10) CONFIGURATION
// Smart India Hackathon (SIH) Real-Time Architecture
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * FIREBASE PROJECT CREDENTIALS
 * Default: Pre-configured for 'agrilink-sewa' project.
 * To point to your own Firebase project, replace the values below.
 */
export const firebaseConfig = {
    apiKey: "AIzaSyBRZjebiwG_b3g4HY8jSWrQEanI4gTh0GI",
    authDomain: "agrilink-sewa.firebaseapp.com",
    projectId: "agrilink-sewa",
    storageBucket: "agrilink-sewa.firebasestorage.app",
    messagingSenderId: "669146024018",
    appId: "1:669146024018:web:5d5ba99f1cb927143bb78b",
    measurementId: "G-5ZXQ8V5QY9"
};

// Initialize Firebase Core App
export const app = initializeApp(firebaseConfig);

// Initialize Authentication Service
export const auth = getAuth(app);

// Initialize Cloud Firestore Database
export const db = getFirestore(app);

console.log("[AgriLink Sewa] Firebase initialized successfully with project ID:", firebaseConfig.projectId);
