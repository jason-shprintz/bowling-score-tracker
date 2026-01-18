# Cloud Sync Setup Guide

This guide explains how to set up and use the Firebase Firestore cloud sync functionality in the Bowling Score Tracker app.

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firebase configuration credentials

## Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

### 2. Enable Firestore Database

1. In your Firebase project, navigate to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (update security rules for production)
4. Select a location for your database

### 3. Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app and copy the configuration object

### 4. Configure the App

Update `src/config/firebase.config.ts` with your Firebase credentials:

```typescript
export const firebaseConfig: FirebaseOptions = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

Alternatively, use environment variables:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

## Usage

### Initialize Cloud Sync

Initialize the CloudSyncService when your app starts:

```typescript
import { initializeFirebase } from './config/firebase.config';

// Initialize with user ID
await initializeFirebase('user-123');
```

### Sync Data to Cloud

```typescript
import { DataService } from './services';

const dataService = DataService.getInstance();

// Sync all local data to cloud
await dataService.syncToCloud();
```

### Sync Data from Cloud

```typescript
// Sync all cloud data to local storage
await dataService.syncFromCloud();
```

### Bidirectional Sync

```typescript
// Sync both ways: local to cloud and cloud to local
await dataService.performBidirectionalSync();
```

### Monitor Sync Status

```typescript
import { CloudSyncService } from './services';

const cloudSync = CloudSyncService.getInstance();

// Add a listener for sync status changes
cloudSync.addSyncListener((status) => {
  console.log('Last sync:', status.lastSyncTime);
  console.log('Pending operations:', status.pendingOperations);
  console.log('Is syncing:', status.isSyncing);
});

// Get current sync status
const status = await cloudSync.getSyncStatus();
```

## Features

### Offline Queue

The cloud sync service maintains an offline queue for operations performed when the device is offline:

- Operations are automatically queued when offline
- Queue is processed when connectivity is restored
- No data loss during offline periods

### Conflict Resolution

When conflicts occur between local and cloud data:

- Timestamp-based resolution: most recent data wins
- Conflicts are resolved automatically during sync
- Both local and cloud data are preserved appropriately

### Data Collections

The following data is synced:

1. **Game Sessions** (`users/{userId}/games/{gameId}`)
   - Complete game data including frames and scores
   - Associated venue and league information

2. **User Profile** (`users/{userId}/profile/data`)
   - User preferences and settings
   - League memberships

3. **Leagues** (`users/{userId}/leagues/{leagueId}`)
   - League information and schedules
   - Team data

4. **Venues** (`venues/{venueId}`)
   - Shared bowling alley database
   - Location and contact information

## Security Rules

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only accessible by the user
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Venues - readable by all authenticated users, writable by any
    match /venues/{venueId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Best Practices

1. **Initialize Early**: Initialize CloudSyncService when the app starts
2. **Sync Regularly**: Perform periodic syncs to keep data up-to-date
3. **Handle Errors**: Wrap sync operations in try-catch blocks
4. **Monitor Status**: Use sync listeners to provide user feedback
5. **Test Offline**: Test the offline queue functionality thoroughly

## Troubleshooting

### "CloudSyncService not initialized" Error

Make sure to call `initializeFirebase()` before using sync methods:

```typescript
await initializeFirebase('user-id');
```

### Sync Fails Silently

Check the console for error messages. Common issues:

- Invalid Firebase configuration
- Network connectivity problems
- Firestore security rules blocking access

### Data Not Syncing

1. Verify Firebase configuration is correct
2. Check Firestore security rules
3. Ensure user is authenticated (if using Firebase Auth)
4. Check network connectivity

## Example Integration

```typescript
import { DataService } from './services';
import { initializeFirebase } from './config/firebase.config';

async function setupApp() {
  // Initialize Firebase
  await initializeFirebase('user-123');
  
  // Get DataService instance
  const dataService = DataService.getInstance();
  await dataService.initializeDatabase();
  
  // Perform initial sync
  try {
    await dataService.performBidirectionalSync();
    console.log('Initial sync complete');
  } catch (error) {
    console.error('Sync failed:', error);
  }
  
  // Set up periodic sync (every 5 minutes)
  setInterval(async () => {
    try {
      await dataService.performBidirectionalSync();
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }, 5 * 60 * 1000);
}
```

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [React Native Firebase](https://rnfirebase.io/)
