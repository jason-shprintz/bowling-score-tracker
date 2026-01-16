// DataService Unit Tests
// Tests for local storage functionality (Task 4.1)

import { DataService } from './DataService';
import {
  GameSession,
  User,
  UserPreferences,
} from '@/types';

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

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => Promise.resolve()),
      getAllAsync: jest.fn(() => Promise.resolve([])),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      closeAsync: jest.fn(() => Promise.resolve()),
    })
  ),
}));

describe('DataService', () => {
  let dataService: DataService;

  beforeEach(() => {
    dataService = new DataService();
    jest.clearAllMocks();
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
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
    it('should throw error for unimplemented cloud sync methods', async () => {
      await expect(dataService.syncToCloud()).rejects.toThrow(
        'Cloud sync not implemented yet - Task 4.2'
      );
      await expect(dataService.syncFromCloud()).rejects.toThrow(
        'Cloud sync not implemented yet - Task 4.2'
      );
    });
  });
});
