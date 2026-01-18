// CloudSyncService Unit Tests
// Tests for Firebase Firestore cloud sync with conflict resolution

import { CloudSyncService } from '../CloudSyncService';
import { League, BowlingAlley } from '../../types';

// Mock AsyncStorage
const mockStorage: { [key: string]: string } = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockStorage[key] || null);
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock Firestore
const mockFirestoreData: {
  users: {
    [userId: string]: {
      leagues: { [id: string]: any };
    };
  };
  venues: { [id: string]: any };
} = {
  users: {},
  venues: {},
};

// Helper to create mock Timestamp
const createMockTimestamp = (millis: number) => ({
  toMillis: () => millis,
  toDate: () => new Date(millis),
  seconds: Math.floor(millis / 1000),
  nanoseconds: (millis % 1000) * 1000000,
});

// Helper to reset mock Firestore data
const resetMockFirestore = () => {
  mockFirestoreData.users = {};
  mockFirestoreData.venues = {};
};

// Create mock batch that will be shared
let mockBatch = {
  set: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

// Mock Timestamp
const MockTimestamp = {
  now: jest.fn(() => createMockTimestamp(Date.now())),
  fromDate: jest.fn((date: Date) => createMockTimestamp(date.getTime())),
};

jest.mock('@react-native-firebase/firestore', () => {
  // Define helper inside the mock factory
  const mockTimestampHelper = (millis: number) => ({
    toMillis: () => millis,
    toDate: () => new Date(millis),
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1000000,
  });

  const mockCollection = (collectionPath: string, parentPath: string = '') => {
    const fullPath = parentPath ? `${parentPath}/${collectionPath}` : collectionPath;
    const pathParts = fullPath.split('/');
    
    return {
      doc: (docId: string) => {
        const docPath = `${fullPath}/${docId}`;
        return {
          set: jest.fn((data: any) => Promise.resolve()),
          get: jest.fn(() => {
            let docData: any = null;

            if (pathParts[0] === 'users' && pathParts[2] === 'leagues') {
              const userId = pathParts[1];
              docData = mockFirestoreData.users[userId]?.leagues[docId];
            } else if (pathParts[0] === 'venues') {
              docData = mockFirestoreData.venues[docId];
            }

            return Promise.resolve({
              exists: !!docData,
              data: () => docData,
            });
          }),
          collection: (subCollection: string) => mockCollection(subCollection, docPath),
        };
      },
      get: jest.fn(() => {
        let docs: any[] = [];

        if (pathParts[0] === 'users' && pathParts[2] === 'leagues') {
          const userId = pathParts[1];
          const leagues = mockFirestoreData.users[userId]?.leagues || {};
          docs = Object.values(leagues);
        } else if (pathParts[0] === 'venues') {
          docs = Object.values(mockFirestoreData.venues);
        }

        return Promise.resolve({
          forEach: (callback: (doc: any) => void) => {
            docs.forEach((data) => {
              callback({
                data: () => data,
              });
            });
          },
        });
      }),
    };
  };

  const Timestamp = {
    now: jest.fn(() => mockTimestampHelper(Date.now())),
    fromDate: jest.fn((date: Date) => mockTimestampHelper(date.getTime())),
  };

  const mockFirestoreInstance = () => ({
    collection: (collectionPath: string) => mockCollection(collectionPath),
    batch: jest.fn(() => mockBatch),
  });

  // Attach Timestamp to the mockFirestoreInstance
  (mockFirestoreInstance as any).Timestamp = Timestamp;

  return {
    __esModule: true,
    default: mockFirestoreInstance,
    Timestamp,
  };
});

describe('CloudSyncService', () => {
  let cloudSyncService: CloudSyncService;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Reset singleton and mocks
    await CloudSyncService.resetInstance();
    cloudSyncService = CloudSyncService.getInstance();
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    resetMockFirestore();

    // Reset mock batch
    mockBatch = {
      set: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    // Initialize with test user ID
    await cloudSyncService.initialize({}, testUserId);
  });

  afterEach(async () => {
    await CloudSyncService.resetInstance();
  });

  describe('syncLeaguesWithConflictResolution', () => {
    describe('conflict resolution (both local and remote exist)', () => {
      it('should prefer local when local has newer updatedAt timestamp', async () => {
        const localLeague: League = {
          id: 'league-1',
          name: 'Local League Updated',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (localLeague as any).updatedAt = createMockTimestamp(2000);

        const remoteLeague: League = {
          id: 'league-1',
          name: 'Remote League Older',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (remoteLeague as any).updatedAt = createMockTimestamp(1000);

        // Set up mock Firestore data
        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-1': remoteLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localLeague,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Local League Updated');
      });

      it('should prefer local when local has newer syncedAt timestamp', async () => {
        const localLeague: League = {
          id: 'league-2',
          name: 'Local League',
          season: 'Winter 2024',
          bowlingNight: 'Wednesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (localLeague as any).syncedAt = createMockTimestamp(3000);

        const remoteLeague: League = {
          id: 'league-2',
          name: 'Remote League',
          season: 'Winter 2024',
          bowlingNight: 'Wednesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (remoteLeague as any).syncedAt = createMockTimestamp(2000);

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-2': remoteLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localLeague,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Local League');
      });

      it('should prefer remote when remote has newer timestamp', async () => {
        const localLeague: League = {
          id: 'league-3',
          name: 'Local League Older',
          season: 'Winter 2024',
          bowlingNight: 'Thursday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (localLeague as any).updatedAt = createMockTimestamp(1000);

        const remoteLeague: League = {
          id: 'league-3',
          name: 'Remote League Newer',
          season: 'Winter 2024',
          bowlingNight: 'Thursday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (remoteLeague as any).updatedAt = createMockTimestamp(3000);

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-3': remoteLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localLeague,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Remote League Newer');
      });

      it('should prefer remote when neither has timestamp', async () => {
        const localLeague: League = {
          id: 'league-4',
          name: 'Local League No Timestamp',
          season: 'Winter 2024',
          bowlingNight: 'Friday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        const remoteLeague: League = {
          id: 'league-4',
          name: 'Remote League No Timestamp',
          season: 'Winter 2024',
          bowlingNight: 'Friday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-4': remoteLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localLeague,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Remote League No Timestamp');
      });
    });

    describe('local only scenarios', () => {
      it('should upload league that exists only locally', async () => {
        const localLeague: League = {
          id: 'league-local-only',
          name: 'Local Only League',
          season: 'Winter 2024',
          bowlingNight: 'Monday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {},
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localLeague,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('league-local-only');
        expect(resolved[0].name).toBe('Local Only League');
      });

      it('should upload multiple local-only leagues', async () => {
        const localLeague1: League = {
          id: 'league-local-1',
          name: 'Local League 1',
          season: 'Winter 2024',
          bowlingNight: 'Monday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        const localLeague2: League = {
          id: 'league-local-2',
          name: 'Local League 2',
          season: 'Spring 2024',
          bowlingNight: 'Friday',
          alley: {
            id: 'alley-2',
            name: 'Lucky Lanes',
            address: '456 Pin Ave',
            location: { latitude: 40.7589, longitude: -73.9851 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {},
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localLeague1,
          localLeague2,
        ]);

        expect(resolved).toHaveLength(2);
        expect(resolved.map((l) => l.id)).toContain('league-local-1');
        expect(resolved.map((l) => l.id)).toContain('league-local-2');
      });
    });

    describe('remote only scenarios', () => {
      it('should download league that exists only remotely', async () => {
        const remoteLeague: League = {
          id: 'league-remote-only',
          name: 'Remote Only League',
          season: 'Winter 2024',
          bowlingNight: 'Saturday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-remote-only': remoteLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('league-remote-only');
        expect(resolved[0].name).toBe('Remote Only League');
      });

      it('should download multiple remote-only leagues', async () => {
        const remoteLeague1: League = {
          id: 'league-remote-1',
          name: 'Remote League 1',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        const remoteLeague2: League = {
          id: 'league-remote-2',
          name: 'Remote League 2',
          season: 'Spring 2024',
          bowlingNight: 'Thursday',
          alley: {
            id: 'alley-2',
            name: 'Lucky Lanes',
            address: '456 Pin Ave',
            location: { latitude: 40.7589, longitude: -73.9851 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-remote-1': remoteLeague1,
            'league-remote-2': remoteLeague2,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([]);

        expect(resolved).toHaveLength(2);
        expect(resolved.map((l) => l.id)).toContain('league-remote-1');
        expect(resolved.map((l) => l.id)).toContain('league-remote-2');
      });
    });

    describe('empty input scenarios', () => {
      it('should handle empty local array with no remote data', async () => {
        mockFirestoreData.users[testUserId] = {
          leagues: {},
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([]);

        expect(resolved).toHaveLength(0);
      });

      it('should handle empty local array but return remote leagues', async () => {
        const remoteLeague: League = {
          id: 'league-1',
          name: 'Remote League',
          season: 'Winter 2024',
          bowlingNight: 'Wednesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-1': remoteLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('league-1');
      });
    });

    describe('batch commit failures', () => {
      it('should throw error when batch commit fails', async () => {
        const localLeague: League = {
          id: 'league-fail',
          name: 'Fail League',
          season: 'Winter 2024',
          bowlingNight: 'Sunday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {},
        };

        // Mock batch commit to fail
        mockBatch.commit = jest.fn().mockRejectedValueOnce(
          new Error('Network error')
        );

        await expect(
          cloudSyncService.syncLeaguesWithConflictResolution([localLeague])
        ).rejects.toThrow();
      });
    });

    describe('mixed scenarios', () => {
      it('should handle combination of local-only, remote-only, and conflicting leagues', async () => {
        const localOnlyLeague: League = {
          id: 'league-local',
          name: 'Local Only',
          season: 'Winter 2024',
          bowlingNight: 'Monday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        const conflictLocalLeague: League = {
          id: 'league-conflict',
          name: 'Local Version',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (conflictLocalLeague as any).updatedAt = createMockTimestamp(3000);

        const conflictRemoteLeague: League = {
          id: 'league-conflict',
          name: 'Remote Version',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };
        (conflictRemoteLeague as any).updatedAt = createMockTimestamp(2000);

        const remoteOnlyLeague: League = {
          id: 'league-remote',
          name: 'Remote Only',
          season: 'Winter 2024',
          bowlingNight: 'Wednesday',
          alley: {
            id: 'alley-1',
            name: 'Strike Zone',
            address: '123 Bowling St',
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        };

        mockFirestoreData.users[testUserId] = {
          leagues: {
            'league-conflict': conflictRemoteLeague,
            'league-remote': remoteOnlyLeague,
          },
        };

        const resolved = await cloudSyncService.syncLeaguesWithConflictResolution([
          localOnlyLeague,
          conflictLocalLeague,
        ]);

        expect(resolved).toHaveLength(3);
        expect(resolved.map((l) => l.id)).toContain('league-local');
        expect(resolved.map((l) => l.id)).toContain('league-conflict');
        expect(resolved.map((l) => l.id)).toContain('league-remote');

        const conflictResolved = resolved.find((l) => l.id === 'league-conflict');
        expect(conflictResolved?.name).toBe('Local Version');
      });
    });
  });

  describe('syncVenuesWithConflictResolution', () => {
    describe('conflict resolution (both local and remote exist)', () => {
      it('should prefer local when local has newer syncedAt timestamp', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-1',
          name: 'Local Venue Updated',
          address: '123 Updated St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (localVenue as any).syncedAt = createMockTimestamp(3000);

        const remoteVenue: BowlingAlley = {
          id: 'venue-1',
          name: 'Remote Venue Older',
          address: '123 Old St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (remoteVenue as any).syncedAt = createMockTimestamp(1000);

        mockFirestoreData.venues['venue-1'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Local Venue Updated');
        expect(resolved[0].address).toBe('123 Updated St');
      });

      it('should prefer remote when remote has newer syncedAt timestamp', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-2',
          name: 'Local Venue Older',
          address: '123 Old St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (localVenue as any).syncedAt = createMockTimestamp(1000);

        const remoteVenue: BowlingAlley = {
          id: 'venue-2',
          name: 'Remote Venue Newer',
          address: '123 Updated St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (remoteVenue as any).syncedAt = createMockTimestamp(3000);

        mockFirestoreData.venues['venue-2'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Remote Venue Newer');
        expect(resolved[0].address).toBe('123 Updated St');
      });

      it('should prefer local when local has no syncedAt but remote does', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-3',
          name: 'Local Venue No Timestamp',
          address: '123 New St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const remoteVenue: BowlingAlley = {
          id: 'venue-3',
          name: 'Remote Venue With Timestamp',
          address: '123 Old St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (remoteVenue as any).syncedAt = createMockTimestamp(2000);

        mockFirestoreData.venues['venue-3'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Local Venue No Timestamp');
      });

      it('should prefer remote when remote has no syncedAt but local does', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-4',
          name: 'Local Venue With Timestamp',
          address: '123 Old St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (localVenue as any).syncedAt = createMockTimestamp(2000);

        const remoteVenue: BowlingAlley = {
          id: 'venue-4',
          name: 'Remote Venue No Timestamp',
          address: '123 New St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        mockFirestoreData.venues['venue-4'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Remote Venue No Timestamp');
      });

      it('should prefer remote when neither has syncedAt timestamp', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-5',
          name: 'Local Venue No Timestamp',
          address: '123 Local St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const remoteVenue: BowlingAlley = {
          id: 'venue-5',
          name: 'Remote Venue No Timestamp',
          address: '123 Remote St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        mockFirestoreData.venues['venue-5'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].name).toBe('Remote Venue No Timestamp');
      });
    });

    describe('local only scenarios', () => {
      it('should upload venue that exists only locally', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-local-only',
          name: 'Local Only Venue',
          address: '123 Local St',
          location: { latitude: 40.7128, longitude: -74.006 },
          placeId: 'place-123',
        };

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue,
        ]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('venue-local-only');
        expect(resolved[0].name).toBe('Local Only Venue');
      });

      it('should upload multiple local-only venues', async () => {
        const localVenue1: BowlingAlley = {
          id: 'venue-local-1',
          name: 'Local Venue 1',
          address: '123 First St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const localVenue2: BowlingAlley = {
          id: 'venue-local-2',
          name: 'Local Venue 2',
          address: '456 Second Ave',
          location: { latitude: 40.7589, longitude: -73.9851 },
        };

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localVenue1,
          localVenue2,
        ]);

        expect(resolved).toHaveLength(2);
        expect(resolved.map((v) => v.id)).toContain('venue-local-1');
        expect(resolved.map((v) => v.id)).toContain('venue-local-2');
      });
    });

    describe('remote only scenarios', () => {
      it('should download venue that exists only remotely', async () => {
        const remoteVenue: BowlingAlley = {
          id: 'venue-remote-only',
          name: 'Remote Only Venue',
          address: '789 Remote Rd',
          location: { latitude: 40.7589, longitude: -73.9851 },
          placeId: 'place-456',
        };

        mockFirestoreData.venues['venue-remote-only'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('venue-remote-only');
        expect(resolved[0].name).toBe('Remote Only Venue');
      });

      it('should download multiple remote-only venues', async () => {
        const remoteVenue1: BowlingAlley = {
          id: 'venue-remote-1',
          name: 'Remote Venue 1',
          address: '123 Remote St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const remoteVenue2: BowlingAlley = {
          id: 'venue-remote-2',
          name: 'Remote Venue 2',
          address: '456 Remote Ave',
          location: { latitude: 40.7589, longitude: -73.9851 },
        };

        mockFirestoreData.venues['venue-remote-1'] = remoteVenue1;
        mockFirestoreData.venues['venue-remote-2'] = remoteVenue2;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([]);

        expect(resolved).toHaveLength(2);
        expect(resolved.map((v) => v.id)).toContain('venue-remote-1');
        expect(resolved.map((v) => v.id)).toContain('venue-remote-2');
      });
    });

    describe('empty input scenarios', () => {
      it('should handle empty local array with no remote data', async () => {
        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([]);

        expect(resolved).toHaveLength(0);
      });

      it('should handle empty local array but return remote venues', async () => {
        const remoteVenue: BowlingAlley = {
          id: 'venue-1',
          name: 'Remote Venue',
          address: '123 Remote St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        mockFirestoreData.venues['venue-1'] = remoteVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('venue-1');
      });
    });

    describe('batch commit failures', () => {
      it('should throw error when batch commit fails', async () => {
        const localVenue: BowlingAlley = {
          id: 'venue-fail',
          name: 'Fail Venue',
          address: '123 Fail St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        // Mock batch commit to fail
        mockBatch.commit = jest.fn().mockRejectedValueOnce(
          new Error('Network error')
        );

        await expect(
          cloudSyncService.syncVenuesWithConflictResolution([localVenue])
        ).rejects.toThrow();
      });
    });

    describe('mixed scenarios', () => {
      it('should handle combination of local-only, remote-only, and conflicting venues', async () => {
        const localOnlyVenue: BowlingAlley = {
          id: 'venue-local',
          name: 'Local Only',
          address: '111 Local St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const conflictLocalVenue: BowlingAlley = {
          id: 'venue-conflict',
          name: 'Local Version',
          address: '222 Conflict St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (conflictLocalVenue as any).syncedAt = createMockTimestamp(3000);

        const conflictRemoteVenue: BowlingAlley = {
          id: 'venue-conflict',
          name: 'Remote Version',
          address: '222 Old St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };
        (conflictRemoteVenue as any).syncedAt = createMockTimestamp(2000);

        const remoteOnlyVenue: BowlingAlley = {
          id: 'venue-remote',
          name: 'Remote Only',
          address: '333 Remote St',
          location: { latitude: 40.7589, longitude: -73.9851 },
        };

        mockFirestoreData.venues['venue-conflict'] = conflictRemoteVenue;
        mockFirestoreData.venues['venue-remote'] = remoteOnlyVenue;

        const resolved = await cloudSyncService.syncVenuesWithConflictResolution([
          localOnlyVenue,
          conflictLocalVenue,
        ]);

        expect(resolved).toHaveLength(3);
        expect(resolved.map((v) => v.id)).toContain('venue-local');
        expect(resolved.map((v) => v.id)).toContain('venue-conflict');
        expect(resolved.map((v) => v.id)).toContain('venue-remote');

        const conflictResolved = resolved.find((v) => v.id === 'venue-conflict');
        expect(conflictResolved?.name).toBe('Local Version');
      });
    });
  });
});
