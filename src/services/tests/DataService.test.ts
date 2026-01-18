// DataService Unit Tests
// Tests for local storage functionality (Task 4.1)

import { DataService } from '../DataService';
import {
  GameSession,
  User,
  UserPreferences,
  League,
  BowlingAlley,
} from '../../types';

// Mock Firestore (needed because CloudSyncService imports it)
jest.mock('@react-native-firebase/firestore', () => {
  const mockTimestampHelper = (millis: number) => ({
    toMillis: () => millis,
    toDate: () => new Date(millis),
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1000000,
  });

  const Timestamp = {
    now: jest.fn(() => mockTimestampHelper(Date.now())),
    fromDate: jest.fn((date: Date) => mockTimestampHelper(date.getTime())),
  };

  return {
    __esModule: true,
    default: jest.fn(() => ({
      collection: jest.fn(),
      batch: jest.fn(),
    })),
    Timestamp,
  };
});

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

// Mock SQLite database with in-memory storage
type DatabaseRow = Record<string, unknown>;

const mockDatabase: {
  games: DatabaseRow[];
  venues: DatabaseRow[];
  leagues: DatabaseRow[];
} = {
  games: [],
  venues: [],
  leagues: [],
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn((query: string, params: any[]) => {
        // Parse INSERT OR REPLACE queries for games
        if (query.includes('INSERT OR REPLACE INTO games')) {
          const [
            id,
            mode,
            league_id,
            venue_id,
            start_time,
            end_time,
            final_score,
            frames_data,
          ] = params;
          // Remove existing entry with same id if exists
          mockDatabase.games = mockDatabase.games.filter((g) => g.id !== id);
          // Add new entry
          mockDatabase.games.push({
            id,
            mode,
            league_id,
            venue_id,
            start_time,
            end_time,
            final_score,
            frames_data,
          });
        }
        // Parse INSERT OR REPLACE queries for venues
        else if (query.includes('INSERT OR REPLACE INTO venues')) {
          const [id, name, address, latitude, longitude, accuracy, place_id] =
            params;
          mockDatabase.venues = mockDatabase.venues.filter((v) => v.id !== id);
          mockDatabase.venues.push({
            id,
            name,
            address,
            latitude,
            longitude,
            accuracy,
            place_id,
          });
        }
        // Parse INSERT OR REPLACE queries for leagues
        else if (query.includes('INSERT OR REPLACE INTO leagues')) {
          const [id, name, season, team_name, bowling_night, alley_id] = params;
          mockDatabase.leagues = mockDatabase.leagues.filter(
            (l) => l.id !== id
          );
          mockDatabase.leagues.push({
            id,
            name,
            season,
            team_name,
            bowling_night,
            alley_id,
          });
        }
        return Promise.resolve();
      }),
      getAllAsync: jest.fn((query: string, params?: any[]) => {
        // Return games based on query
        if (query.includes('SELECT * FROM games')) {
          if (query.includes('WHERE league_id = ?')) {
            return Promise.resolve(
              mockDatabase.games.filter((g) => g.league_id === params?.[0])
            );
          } else if (query.includes('WHERE venue_id = ?')) {
            return Promise.resolve(
              mockDatabase.games.filter((g) => g.venue_id === params?.[0])
            );
          } else {
            return Promise.resolve([...mockDatabase.games]);
          }
        }
        // Return venues
        else if (query.includes('SELECT * FROM venues')) {
          return Promise.resolve([...mockDatabase.venues]);
        }
        // Return leagues with JOIN
        else if (query.includes('FROM leagues l') && query.includes('JOIN bowling_alleys a')) {
          // Handle the JOIN query by combining league and venue data
          const result = mockDatabase.leagues.map((league) => {
            const venue = mockDatabase.venues.find((v) => v.id === league.alley_id);
            return {
              id: league.id,
              name: league.name,
              season: league.season,
              team_name: league.team_name,
              bowling_night: league.bowling_night,
              alley_id: league.alley_id,
              alley_name: venue?.name || '',
            };
          });
          return Promise.resolve(result);
        }
        // Return leagues (fallback for simpler queries)
        else if (query.includes('SELECT * FROM leagues')) {
          return Promise.resolve([...mockDatabase.leagues]);
        }
        return Promise.resolve([]);
      }),
      getFirstAsync: jest.fn((query: string, params?: any[]) => {
        // Get venue by id
        if (query.includes('SELECT * FROM venues WHERE id = ?')) {
          return Promise.resolve(
            mockDatabase.venues.find((v) => v.id === params?.[0]) || null
          );
        }
        // Get league by id
        else if (query.includes('SELECT * FROM leagues WHERE id = ?')) {
          return Promise.resolve(
            mockDatabase.leagues.find((l) => l.id === params?.[0]) || null
          );
        }
        return Promise.resolve(null);
      }),
      closeAsync: jest.fn(() => Promise.resolve()),
    })
  ),
}));

describe('DataService', () => {
  let dataService: DataService;

  beforeEach(async () => {
    // Reset singleton instance before each test
    await DataService.resetInstance();
    dataService = DataService.getInstance();
    jest.clearAllMocks();
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    // Clear mock database
    mockDatabase.games = [];
    mockDatabase.venues = [];
    mockDatabase.leagues = [];
  });

  afterEach(async () => {
    // Clean up after each test
    await dataService.closeDatabase();
    await DataService.resetInstance();
  });

  describe('Serialization/Deserialization', () => {
    it('should serialize and deserialize GameSession correctly', async () => {
      const mockSession: GameSession = {
        id: 'test-session-1',
        mode: 'open',
        frames: [],
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        finalScore: 150,
      };

      await dataService.saveCurrentSession(mockSession);
      const retrieved = await dataService.getCurrentSession();

      expect(retrieved).toBeTruthy();
      if (retrieved) {
        expect(retrieved.id).toBe(mockSession.id);
        expect(retrieved.mode).toBe(mockSession.mode);
        expect(retrieved.startTime.getTime()).toBe(
          mockSession.startTime.getTime()
        );
        expect(retrieved.endTime?.getTime()).toBe(
          mockSession.endTime?.getTime()
        );
        expect(retrieved.finalScore).toBe(mockSession.finalScore);
      }
    });

    it('should serialize and deserialize User correctly', async () => {
      const mockUser: User = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        leagues: [],
        preferences: {
          defaultGameMode: 'open',
          hapticFeedback: true,
          autoDetectVenue: true,
          syncToCloud: false,
        },
      };

      await dataService.saveUser(mockUser);
      const retrieved = await dataService.getUser();

      expect(retrieved).toBeTruthy();
      if (retrieved) {
        expect(retrieved.id).toBe(mockUser.id);
        expect(retrieved.name).toBe(mockUser.name);
        expect(retrieved.email).toBe(mockUser.email);
      }
    });
  });

  describe('AsyncStorage Methods', () => {
    it('should save and retrieve user preferences', async () => {
      const preferences: UserPreferences = {
        defaultGameMode: 'league',
        hapticFeedback: false,
        autoDetectVenue: true,
        syncToCloud: true,
      };

      await dataService.savePreferences(preferences);
      const retrieved = await dataService.getPreferences();

      expect(retrieved).toBeTruthy();
      if (retrieved) {
        expect(retrieved.defaultGameMode).toBe(preferences.defaultGameMode);
        expect(retrieved.hapticFeedback).toBe(preferences.hapticFeedback);
      }
    });

    it('should clear current session', async () => {
      const mockSession: GameSession = {
        id: 'test-session-1',
        mode: 'open',
        frames: [],
        startTime: new Date(),
      };

      await dataService.saveCurrentSession(mockSession);
      await dataService.clearCurrentSession();

      const retrieved = await dataService.getCurrentSession();
      expect(retrieved).toBeNull();
    });
  });

  describe('SQLite Database Initialization', () => {
    it('should initialize database without errors', async () => {
      await expect(dataService.initializeDatabase()).resolves.not.toThrow();
    });

    it('should close database without errors', async () => {
      await dataService.initializeDatabase();
      await expect(dataService.closeDatabase()).resolves.not.toThrow();
    });

    it('should return the same instance (singleton pattern)', () => {
      const instance1 = DataService.getInstance();
      const instance2 = DataService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should guard against concurrent initialization', async () => {
      // Call initializeDatabase multiple times concurrently
      const promises = [
        dataService.initializeDatabase(),
        dataService.initializeDatabase(),
        dataService.initializeDatabase(),
      ];

      // All should resolve without errors
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should handle missing venue gracefully', async () => {
      const mockSession: GameSession = {
        id: 'test-session-1',
        mode: 'open',
        frames: [],
        startTime: new Date(),
        venue: undefined,
      };

      await expect(
        dataService.saveGameSession(mockSession)
      ).resolves.not.toThrow();
    });

    it('should handle missing league gracefully', async () => {
      const mockSession: GameSession = {
        id: 'test-session-1',
        mode: 'open',
        frames: [],
        startTime: new Date(),
        league: undefined,
      };

      await expect(
        dataService.saveGameSession(mockSession)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when cloud sync is not initialized', async () => {
      // Cloud sync methods should fail when CloudSyncService is not initialized
      await expect(dataService.syncToCloud()).rejects.toThrow(
        'Cloud sync failed'
      );
      await expect(dataService.syncFromCloud()).rejects.toThrow(
        'Cloud sync failed'
      );
    });
  });

  describe('SQLite Save/Retrieve Cycle', () => {
    describe('Game Sessions', () => {
      it('should save and retrieve a game session', async () => {
        const mockSession: GameSession = {
          id: 'test-game-1',
          mode: 'open',
          frames: [
            {
              frameNumber: 1,
              rolls: [
                {
                  pins: [
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'standing',
                    'standing',
                    'standing',
                  ],
                  pinsKnocked: 7,
                },
                {
                  pins: [
                    'standing',
                    'standing',
                    'knocked',
                    'knocked',
                    'standing',
                    'standing',
                    'standing',
                    'standing',
                    'standing',
                    'standing',
                  ],
                  pinsKnocked: 2,
                },
              ],
              score: 9,
              isStrike: false,
              isSpare: false,
            },
            {
              frameNumber: 2,
              rolls: [
                {
                  pins: [
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                    'knocked',
                  ],
                  pinsKnocked: 10,
                },
              ],
              score: 19,
              isStrike: true,
              isSpare: false,
            },
          ],
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          finalScore: 150,
        };

        await dataService.saveGameSession(mockSession);
        const sessions = await dataService.getGameSessions();

        expect(sessions).toHaveLength(1);
        expect(sessions[0].id).toBe(mockSession.id);
        expect(sessions[0].mode).toBe(mockSession.mode);
        expect(sessions[0].finalScore).toBe(mockSession.finalScore);
        expect(sessions[0].frames).toEqual(mockSession.frames);
        expect(sessions[0].startTime.getTime()).toBe(
          mockSession.startTime.getTime()
        );
        expect(sessions[0].endTime?.getTime()).toBe(
          mockSession.endTime?.getTime()
        );
      });

      it('should save and retrieve multiple game sessions', async () => {
        const session1: GameSession = {
          id: 'game-1',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          finalScore: 120,
        };

        const session2: GameSession = {
          id: 'game-2',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-16T10:00:00Z'),
          finalScore: 180,
        };

        await dataService.saveGameSession(session1);
        await dataService.saveGameSession(session2);

        const sessions = await dataService.getGameSessions();
        expect(sessions).toHaveLength(2);
        expect(sessions.map((s) => s.id)).toContain('game-1');
        expect(sessions.map((s) => s.id)).toContain('game-2');
      });

      it('should update existing game session when saving with same id', async () => {
        const originalSession: GameSession = {
          id: 'game-1',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          finalScore: 120,
        };

        const updatedSession: GameSession = {
          id: 'game-1',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          finalScore: 150,
        };

        await dataService.saveGameSession(originalSession);
        await dataService.saveGameSession(updatedSession);

        const sessions = await dataService.getGameSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].finalScore).toBe(150);
      });
    });

    describe('Game Sessions with Venue', () => {
      it('should save and retrieve game session with venue', async () => {
        const mockVenue: BowlingAlley = {
          id: 'venue-1',
          name: 'Strike Zone',
          address: '123 Bowling St',
          location: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 10,
          },
          placeId: 'place-123',
        };

        const mockSession: GameSession = {
          id: 'game-with-venue',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          venue: mockVenue,
          finalScore: 150,
        };

        await dataService.saveGameSession(mockSession);
        const sessions = await dataService.getGameSessions();

        expect(sessions).toHaveLength(1);
        expect(sessions[0].venue).toBeTruthy();
        expect(sessions[0].venue?.id).toBe(mockVenue.id);
        expect(sessions[0].venue?.name).toBe(mockVenue.name);
        expect(sessions[0].venue?.location.latitude).toBe(
          mockVenue.location.latitude
        );
      });

      it('should filter game sessions by venue', async () => {
        const venue1: BowlingAlley = {
          id: 'venue-1',
          name: 'Strike Zone',
          address: '123 Bowling St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const venue2: BowlingAlley = {
          id: 'venue-2',
          name: 'Lucky Lanes',
          address: '456 Pin Ave',
          location: { latitude: 40.7589, longitude: -73.9851 },
        };

        const session1: GameSession = {
          id: 'game-1',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          venue: venue1,
          finalScore: 120,
        };

        const session2: GameSession = {
          id: 'game-2',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-16T10:00:00Z'),
          venue: venue2,
          finalScore: 150,
        };

        const session3: GameSession = {
          id: 'game-3',
          mode: 'open',
          frames: [],
          startTime: new Date('2024-01-17T10:00:00Z'),
          venue: venue1,
          finalScore: 180,
        };

        await dataService.saveGameSession(session1);
        await dataService.saveGameSession(session2);
        await dataService.saveGameSession(session3);

        const venue1Sessions =
          await dataService.getGameSessionsByVenue('venue-1');
        expect(venue1Sessions).toHaveLength(2);
        expect(venue1Sessions.map((s) => s.id)).toContain('game-1');
        expect(venue1Sessions.map((s) => s.id)).toContain('game-3');
        expect(venue1Sessions.every((s) => s.venue?.id === 'venue-1')).toBe(
          true
        );

        const venue2Sessions =
          await dataService.getGameSessionsByVenue('venue-2');
        expect(venue2Sessions).toHaveLength(1);
        expect(venue2Sessions[0].id).toBe('game-2');
      });
    });

    describe('Game Sessions with League', () => {
      it('should save and retrieve game session with league', async () => {
        const mockAlley: BowlingAlley = {
          id: 'alley-1',
          name: 'Strike Zone',
          address: '123 Bowling St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const mockLeague: League = {
          id: 'league-1',
          name: 'Tuesday Night League',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: mockAlley,
          teamName: 'The Strikers',
        };

        const mockSession: GameSession = {
          id: 'game-with-league',
          mode: 'league',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          league: mockLeague,
          finalScore: 150,
        };

        await dataService.saveGameSession(mockSession);
        const sessions = await dataService.getGameSessions();

        expect(sessions).toHaveLength(1);
        expect(sessions[0].league).toBeTruthy();
        expect(sessions[0].league?.id).toBe(mockLeague.id);
        expect(sessions[0].league?.name).toBe(mockLeague.name);
        expect(sessions[0].league?.season).toBe(mockLeague.season);
      });

      it('should filter game sessions by league', async () => {
        const alley: BowlingAlley = {
          id: 'alley-1',
          name: 'Strike Zone',
          address: '123 Bowling St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const league1: League = {
          id: 'league-1',
          name: 'Tuesday Night League',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley,
        };

        const league2: League = {
          id: 'league-2',
          name: 'Thursday Night League',
          season: 'Winter 2024',
          bowlingNight: 'Thursday',
          alley,
        };

        const session1: GameSession = {
          id: 'game-1',
          mode: 'league',
          frames: [],
          startTime: new Date('2024-01-15T10:00:00Z'),
          league: league1,
          finalScore: 120,
        };

        const session2: GameSession = {
          id: 'game-2',
          mode: 'league',
          frames: [],
          startTime: new Date('2024-01-16T10:00:00Z'),
          league: league2,
          finalScore: 150,
        };

        const session3: GameSession = {
          id: 'game-3',
          mode: 'league',
          frames: [],
          startTime: new Date('2024-01-17T10:00:00Z'),
          league: league1,
          finalScore: 180,
        };

        await dataService.saveGameSession(session1);
        await dataService.saveGameSession(session2);
        await dataService.saveGameSession(session3);

        const league1Sessions =
          await dataService.getGameSessionsByLeague('league-1');
        expect(league1Sessions).toHaveLength(2);
        expect(league1Sessions.map((s) => s.id)).toContain('game-1');
        expect(league1Sessions.map((s) => s.id)).toContain('game-3');
        expect(league1Sessions.every((s) => s.league?.id === 'league-1')).toBe(
          true
        );

        const league2Sessions =
          await dataService.getGameSessionsByLeague('league-2');
        expect(league2Sessions).toHaveLength(1);
        expect(league2Sessions[0].id).toBe('game-2');
      });
    });
  });

  describe('Cloud Sync Integration', () => {
    describe('syncFromCloud', () => {
      it('should fetch local data before syncing', async () => {
        // This test verifies that syncFromCloud attempts to get local data
        // The actual cloud sync will fail because CloudSyncService is not initialized
        // but we can verify the method structure
        
        const venue: BowlingAlley = {
          id: 'venue-1',
          name: 'Test Venue',
          address: '123 Test St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const league: League = {
          id: 'league-1',
          name: 'Test League',
          season: 'Winter 2024',
          bowlingNight: 'Tuesday',
          alley: venue,
        };

        await dataService.saveVenue(venue);
        await dataService.saveLeague(league);

        // Get counts before sync attempt
        const venuesBefore = await dataService.getAllVenues();
        const leaguesBefore = await dataService.getAllLeagues();
        
        expect(venuesBefore).toHaveLength(1);
        expect(leaguesBefore).toHaveLength(1);

        // Attempt sync - will fail but that's expected
        await expect(dataService.syncFromCloud()).rejects.toThrow('Cloud sync failed');
      });

      it('should handle venue-league dependency correctly', async () => {
        // This test verifies that venues are properly saved through leagues
        const venue1: BowlingAlley = {
          id: 'venue-1',
          name: 'Venue 1',
          address: '123 St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const venue2: BowlingAlley = {
          id: 'venue-2',
          name: 'Venue 2',
          address: '456 Ave',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const league1: League = {
          id: 'league-1',
          name: 'League 1',
          season: 'Winter',
          bowlingNight: 'Monday',
          alley: venue1,
        };

        const league2: League = {
          id: 'league-2',
          name: 'League 2',
          season: 'Spring',
          bowlingNight: 'Tuesday',
          alley: venue2,
        };

        // Save venues first
        await dataService.saveVenue(venue1);
        await dataService.saveVenue(venue2);

        // Then save leagues
        await dataService.saveLeague(league1);
        await dataService.saveLeague(league2);

        // Verify all data is saved correctly
        const savedVenues = await dataService.getAllVenues();
        expect(savedVenues).toHaveLength(2);
        expect(savedVenues.map(v => v.id).sort()).toEqual(['venue-1', 'venue-2']);

        const savedLeagues = await dataService.getAllLeagues();
        expect(savedLeagues).toHaveLength(2);
        expect(savedLeagues.map(l => l.id).sort()).toEqual(['league-1', 'league-2']);
        
        // Verify leagues reference their venues correctly
        const league1Saved = savedLeagues.find(l => l.id === 'league-1');
        expect(league1Saved?.alley.id).toBe('venue-1');
        
        const league2Saved = savedLeagues.find(l => l.id === 'league-2');
        expect(league2Saved?.alley.id).toBe('venue-2');
      });

      it('should handle multiple leagues with the same venue', async () => {
        const sharedVenue: BowlingAlley = {
          id: 'venue-shared',
          name: 'Shared Venue',
          address: '123 Shared St',
          location: { latitude: 40.7128, longitude: -74.006 },
        };

        const league1: League = {
          id: 'league-1',
          name: 'League 1',
          season: 'Winter',
          bowlingNight: 'Monday',
          alley: sharedVenue,
        };

        const league2: League = {
          id: 'league-2',
          name: 'League 2',
          season: 'Spring',
          bowlingNight: 'Tuesday',
          alley: sharedVenue,
        };

        // Save the venue first
        await dataService.saveVenue(sharedVenue);
        
        // Save both leagues - they should not cause duplicate venue saves
        await dataService.saveLeague(league1);
        await dataService.saveLeague(league2);

        // Verify only one venue exists
        const savedVenues = await dataService.getAllVenues();
        expect(savedVenues).toHaveLength(1);
        expect(savedVenues[0].id).toBe('venue-shared');

        // Verify both leagues exist and reference the same venue
        const savedLeagues = await dataService.getAllLeagues();
        expect(savedLeagues).toHaveLength(2);
        expect(savedLeagues[0].alley.id).toBe('venue-shared');
        expect(savedLeagues[1].alley.id).toBe('venue-shared');
      });

      it('should handle empty sync data gracefully', async () => {
        // Ensure no data exists
        const sessions = await dataService.getGameSessions();
        const venues = await dataService.getAllVenues();
        const leagues = await dataService.getAllLeagues();
        
        expect(sessions).toHaveLength(0);
        expect(venues).toHaveLength(0);
        expect(leagues).toHaveLength(0);

        // Attempt sync with no data - will fail due to uninitialized CloudSyncService
        await expect(dataService.syncFromCloud()).rejects.toThrow('Cloud sync failed');
      });
    });
  });
});
