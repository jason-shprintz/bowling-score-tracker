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
 * 
 * Note: All environment variables must be set. The app will throw an error
 * if any required Firebase configuration is missing.
 */
const getRequiredEnvVar = (key: string, envVar?: string): string => {
  if (!envVar) {
    throw new Error(
      `Missing required Firebase configuration: ${key}. ` +
      `Please set the environment variable or update firebase.config.ts`
    );
  }
  return envVar;
};

export const firebaseConfig: FirebaseOptions = {
  apiKey: getRequiredEnvVar('FIREBASE_API_KEY', process.env.FIREBASE_API_KEY),
  authDomain: getRequiredEnvVar('FIREBASE_AUTH_DOMAIN', process.env.FIREBASE_AUTH_DOMAIN),
  projectId: getRequiredEnvVar('FIREBASE_PROJECT_ID', process.env.FIREBASE_PROJECT_ID),
  storageBucket: getRequiredEnvVar('FIREBASE_STORAGE_BUCKET', process.env.FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getRequiredEnvVar('FIREBASE_MESSAGING_SENDER_ID', process.env.FIREBASE_MESSAGING_SENDER_ID),
  appId: getRequiredEnvVar('FIREBASE_APP_ID', process.env.FIREBASE_APP_ID),
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
