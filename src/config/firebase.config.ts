// Firebase configuration
// Replace these values with your actual Firebase project configuration

import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase configuration object
 * Get these values from your Firebase Console:
 * 1. Go to Project Settings
 * 2. Scroll down to "Your apps"
 * 3. Select your web app or create one
 * 4. Copy the configuration values
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.FIREBASE_API_KEY || 'your-api-key',
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.FIREBASE_APP_ID || 'your-app-id',
};

/**
 * Initialize Firebase with the configuration
 * This should be called once when the app starts
 */
export const initializeFirebase = async (userId: string) => {
  const { CloudSyncService } = await import('../services/CloudSyncService');
  const cloudSync = CloudSyncService.getInstance();
  await cloudSync.initialize(firebaseConfig, userId);
};
