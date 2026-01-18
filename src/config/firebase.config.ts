// Firebase configuration for React Native Firebase
// Note: React Native Firebase is configured through native files:
// - Android: android/app/google-services.json
// - iOS: ios/GoogleService-Info.plist
//
// This file is kept for backwards compatibility and can be used
// to pass configuration to the CloudSyncService if needed.

/**
 * React Native Firebase Configuration
 *
 * For React Native Firebase, configuration is done in native code:
 * 1. Android: Place google-services.json in android/app/
 * 2. iOS: Add GoogleService-Info.plist to ios/ folder
 *
 * See: https://rnfirebase.io/
 */

// Simple config object (optional - not used by React Native Firebase directly)
export const firebaseConfig = {
  // Configuration is handled by native files
  // These values are provided for reference only
  initialized: true,
};

/**
 * Initialize Firebase with the configuration
 * For React Native Firebase, initialization happens automatically via native code
 * This method just initializes the CloudSyncService with a user ID
 */
export const initializeFirebase = async (userId: string) => {
  const { CloudSyncService } = await import('../services/CloudSyncService');
  const cloudSync = CloudSyncService.getInstance();
  // Pass null for config as React Native Firebase doesn't need it
  await cloudSync.initialize(null, userId);
};
