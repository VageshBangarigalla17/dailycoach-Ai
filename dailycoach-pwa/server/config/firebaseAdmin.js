const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const initFirebaseAdmin = () => {
  try {
    if (admin.apps.length > 0) {
      return admin;
    }

    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    
    // Check if local file exists (development/deployment where file is copied)
    if (fs.existsSync(serviceAccountPath)) {
      console.log('[FirebaseAdmin] Initializing from serviceAccountKey.json');
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      return admin;
    } 
    
    // Fallback to environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('[FirebaseAdmin] Initializing from environment variables');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle multiline private key from env properly
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      return admin;
    }
    
    // Final fallback: Let Firebase auto-discover from GOOGLE_APPLICATION_CREDENTIALS
    console.log('[FirebaseAdmin] Attempting default initialization');
    admin.initializeApp();
    return admin;
    
  } catch (error) {
    console.error('[FirebaseAdmin] Failed to initialize Firebase Admin:', error);
    return null;
  }
};

module.exports = initFirebaseAdmin();
