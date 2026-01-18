// Cloud Sync Service - Firebase Firestore integration with offline queue
// Task 4.2: Cloud sync service with conflict resolution

import {
  initializeApp,
  FirebaseApp,
  getApps,
  FirebaseOptions,
} from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  enableIndexedDbPersistence,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameSession, User, League, BowlingAlley } from '../types';

// Storage keys for offline queue
const QUEUE_KEYS = {
  PENDING_OPERATIONS: '@bowling_tracker:pending_operations',
  LAST_SYNC: '@bowling_tracker:last_sync',
};

/**
 * Operation types for offline queue
 */
type OperationType = 'create' | 'update' | 'delete';

/**
 * Queued operation structure
 */
interface QueuedOperation {
  id: string;
  type: OperationType;
  collection: string;
  documentId: string;
  data?: any;
  timestamp: number;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  lastSyncTime: Date | null;
  pendingOperations: number;
  isSyncing: boolean;
  lastError: string | null;
}

/**
 * CloudSyncService handles Firebase Firestore integration with offline support
 * Implements conflict resolution based on timestamps and maintains an offline queue
 */
export class CloudSyncService {
  private static instance: CloudSyncService | null = null;
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private userId: string | null = null;
  private isSyncing: boolean = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of CloudSyncService
   */
  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  /**
   * Initialize Firebase with configuration
   */
  async initialize(config: FirebaseOptions, userId: string): Promise<void> {
    try {
      // Check if Firebase is already initialized
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0];
      } else {
        this.app = initializeApp(config);
      }

      this.db = getFirestore(this.app);
      this.userId = userId;

      // Enable offline persistence for web/mobile
      try {
        await enableIndexedDbPersistence(this.db);
      } catch (err: any) {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence enabled in first tab');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser does not support persistence');
        }
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw new Error('Firebase initialization failed');
    }
  }

  /**
   * Check if the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.db || !this.userId) {
      throw new Error('CloudSyncService not initialized');
    }
  }

  /**
   * Add a sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove a sync status listener
   */
  removeSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners = this.syncListeners.filter((l) => l !== listener);
  }

  /**
   * Notify all listeners of sync status changes
   */
  private async notifySyncListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach((listener) => listener(status));
  }

  // ==================== Offline Queue Management ====================

  /**
   * Add an operation to the offline queue
   */
  private async queueOperation(
    type: OperationType,
    collectionName: string,
    documentId: string,
    data?: any
  ): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      const operation: QueuedOperation = {
        id: `${Date.now()}_${Math.random()}`,
        type,
        collection: collectionName,
        documentId,
        data,
        timestamp: Date.now(),
      };

      operations.push(operation);
      await AsyncStorage.setItem(
        QUEUE_KEYS.PENDING_OPERATIONS,
        JSON.stringify(operations)
      );
      await this.notifySyncListeners();
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  }

  /**
   * Get all pending operations from the queue
   */
  private async getPendingOperations(): Promise<QueuedOperation[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEYS.PENDING_OPERATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get pending operations:', error);
      return [];
    }
  }

  /**
   * Clear all pending operations from the queue
   */
  private async clearPendingOperations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_KEYS.PENDING_OPERATIONS);
      await this.notifySyncListeners();
    } catch (error) {
      console.error('Failed to clear pending operations:', error);
    }
  }

  /**
   * Process all pending operations in the queue
   */
  private async processPendingOperations(): Promise<void> {
    this.ensureInitialized();

    const operations = await this.getPendingOperations();
    if (operations.length === 0) return;

    const batch = writeBatch(this.db!);
    const processedOperations: string[] = [];

    for (const operation of operations) {
      try {
        const docRef =
          operation.collection === 'venues'
            ? doc(this.db!, `${operation.collection}/${operation.documentId}`)
            : doc(
                this.db!,
                `users/${this.userId}/${operation.collection}/${operation.documentId}`
              );

        switch (operation.type) {
          case 'create':
          case 'update':
            batch.set(docRef, operation.data, { merge: true });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }

        processedOperations.push(operation.id);
      } catch (error) {
        console.error('Failed to process operation:', operation, error);
      }
    }

    try {
      await batch.commit();
      // Remove processed operations from queue
      const remainingOperations = operations.filter(
        (op) => !processedOperations.includes(op.id)
      );
      await AsyncStorage.setItem(
        QUEUE_KEYS.PENDING_OPERATIONS,
        JSON.stringify(remainingOperations)
      );
      await this.notifySyncListeners();
    } catch (error) {
      console.error('Failed to commit batch operations:', error);
      throw error;
    }
  }

  // ==================== Conflict Resolution ====================

  /**
   * Resolve conflicts between local and remote data
   * Uses timestamp-based resolution: most recent wins
   */
  private resolveConflict<T extends { startTime?: Date; endTime?: Date }>(
    local: T,
    remote: T
  ): T {
    // Use endTime if available, otherwise startTime
    const localTime = (local.endTime || local.startTime)?.getTime();
    const remoteTime = (remote.endTime || remote.startTime)?.getTime();

    // If neither has a timestamp, fall back to a deterministic choice
    if (localTime === undefined && remoteTime === undefined) {
      // Prefer remote version when no timing information is available
      return remote;
    }

    // If only one side has a timestamp, prefer the one with a timestamp
    if (localTime === undefined) {
      return remote;
    }
    if (remoteTime === undefined) {
      return local;
    }
    // Most recent timestamp wins
    return localTime >= remoteTime ? local : remote;
  }

  // ==================== Game Session Sync ====================

  /**
   * Sync a game session to Firestore
   */
  async syncGameSession(session: GameSession): Promise<void> {
    this.ensureInitialized();

    try {
      const docRef = doc(this.db!, `users/${this.userId}/games/${session.id}`);

      // Prepare data for Firestore (convert dates to timestamps)
      const firestoreData = {
        ...session,
        startTime: Timestamp.fromDate(session.startTime),
        endTime: session.endTime ? Timestamp.fromDate(session.endTime) : null,
        syncedAt: Timestamp.now(),
      };

      await setDoc(docRef, firestoreData, { merge: true });
    } catch (error) {
      console.error('Failed to sync game session:', error);
      // Queue for later if offline
      await this.queueOperation('update', 'games', session.id, session);
      throw error;
    }
  }

  /**
   * Fetch game sessions from Firestore
   */
  async fetchGameSessions(): Promise<GameSession[]> {
    this.ensureInitialized();

    try {
      const gamesRef = collection(this.db!, `users/${this.userId}/games`);
      const snapshot = await getDocs(gamesRef);

      const sessions: GameSession[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          ...data,
          startTime: data.startTime.toDate(),
          endTime: data.endTime ? data.endTime.toDate() : undefined,
        } as GameSession);
      });

      return sessions;
    } catch (error) {
      console.error('Failed to fetch game sessions:', error);
      return [];
    }
  }

  /**
   * Sync game sessions with conflict resolution
   */
  async syncGameSessionsWithConflictResolution(
    localSessions: GameSession[]
  ): Promise<GameSession[]> {
    this.ensureInitialized();

    try {
      const remoteSessions = await this.fetchGameSessions();
      const remoteMap = new Map(remoteSessions.map((s) => [s.id, s]));
      const localMap = new Map(localSessions.map((s) => [s.id, s]));

      const resolvedSessions: GameSession[] = [];
      const batch = writeBatch(this.db!);

      // Process all unique session IDs
      const allIds = new Set([...remoteMap.keys(), ...localMap.keys()]);

      for (const id of allIds) {
        const local = localMap.get(id);
        const remote = remoteMap.get(id);

        if (local && remote) {
          // Conflict: resolve using timestamp
          const resolved = this.resolveConflict(local, remote);
          resolvedSessions.push(resolved);

          // Update Firestore if local version won
          if (resolved === local) {
            const docRef = doc(this.db!, `users/${this.userId}/games/${id}`);
            batch.set(
              docRef,
              {
                ...resolved,
                startTime: Timestamp.fromDate(resolved.startTime),
                endTime: resolved.endTime
                  ? Timestamp.fromDate(resolved.endTime)
                  : null,
                syncedAt: Timestamp.now(),
              },
              { merge: true }
            );
          }
        } else if (local) {
          // Only exists locally: upload to Firestore
          resolvedSessions.push(local);
          const docRef = doc(this.db!, `users/${this.userId}/games/${id}`);
          batch.set(
            docRef,
            {
              ...local,
              startTime: Timestamp.fromDate(local.startTime),
              endTime: local.endTime ? Timestamp.fromDate(local.endTime) : null,
              syncedAt: Timestamp.now(),
            },
            { merge: true }
          );
        } else if (remote) {
          // Only exists remotely: add to local
          resolvedSessions.push(remote);
        }
      }

      await batch.commit();
      return resolvedSessions;
    } catch (error) {
      console.error(
        'Failed to sync game sessions with conflict resolution:',
        error
      );
      throw error;
    }
  }

  // ==================== User Profile Sync ====================

  /**
   * Sync user profile to Firestore
   */
  async syncUserProfile(user: User): Promise<void> {
    this.ensureInitialized();

    try {
      const docRef = doc(this.db!, `users/${this.userId}/profile/data`);
      await setDoc(
        docRef,
        { ...user, syncedAt: Timestamp.now() },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      await this.queueOperation('update', 'profile', 'data', user);
      throw error;
    }
  }

  /**
   * Fetch user profile from Firestore
   */
  async fetchUserProfile(): Promise<User | null> {
    this.ensureInitialized();

    try {
      const docRef = doc(this.db!, `users/${this.userId}/profile/data`);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return null;

      const data = snapshot.data();
      return data as User;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }

  // ==================== League Sync ====================

  /**
   * Sync a league to Firestore
   */
  async syncLeague(league: League): Promise<void> {
    this.ensureInitialized();

    try {
      const docRef = doc(this.db!, `users/${this.userId}/leagues/${league.id}`);
      await setDoc(
        docRef,
        { ...league, syncedAt: Timestamp.now() },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to sync league:', error);
      await this.queueOperation('update', 'leagues', league.id, league);
      throw error;
    }
  }

  /**
   * Fetch leagues from Firestore
   */
  async fetchLeagues(): Promise<League[]> {
    this.ensureInitialized();

    try {
      const leaguesRef = collection(this.db!, `users/${this.userId}/leagues`);
      const snapshot = await getDocs(leaguesRef);

      const leagues: League[] = [];
      snapshot.forEach((doc) => {
        leagues.push(doc.data() as League);
      });

      return leagues;
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
      return [];
    }
  }

  // ==================== Venue Sync ====================

  /**
   * Sync a venue to shared venues collection
   */
  async syncVenue(venue: BowlingAlley): Promise<void> {
    this.ensureInitialized();

    try {
      const docRef = doc(this.db!, `venues/${venue.id}`);
      await setDoc(
        docRef,
        { ...venue, syncedAt: Timestamp.now() },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to sync venue:', error);
      await this.queueOperation('update', 'venues', venue.id, venue);
      throw error;
    }
  }

  /**
   * Fetch venues from shared collection
   */
  async fetchVenues(): Promise<BowlingAlley[]> {
    this.ensureInitialized();

    try {
      const venuesRef = collection(this.db!, 'venues');
      const snapshot = await getDocs(venuesRef);

      const venues: BowlingAlley[] = [];
      snapshot.forEach((doc) => {
        venues.push(doc.data() as BowlingAlley);
      });

      return venues;
    } catch (error) {
      console.error('Failed to fetch venues:', error);
      return [];
    }
  }

  // ==================== Full Sync Operations ====================

  /**
   * Perform a full sync: process offline queue and sync all data
   */
  async performFullSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    this.isSyncing = true;
    await this.notifySyncListeners();

    try {
      // Process any pending offline operations first
      await this.processPendingOperations();

      // Update last sync time
      await AsyncStorage.setItem(
        QUEUE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

      await this.notifySyncListeners();
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
      await this.notifySyncListeners();
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const pendingOps = await this.getPendingOperations();
    const lastSyncStr = await AsyncStorage.getItem(QUEUE_KEYS.LAST_SYNC);

    return {
      lastSyncTime: lastSyncStr ? new Date(lastSyncStr) : null,
      pendingOperations: pendingOps.length,
      isSyncing: this.isSyncing,
      lastError: null,
    };
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static async resetInstance(): Promise<void> {
    if (CloudSyncService.instance) {
      CloudSyncService.instance.syncListeners = [];
      CloudSyncService.instance.isSyncing = false;
      CloudSyncService.instance = null;
    }
  }
}
