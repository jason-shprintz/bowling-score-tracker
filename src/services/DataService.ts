// Data Service - Local and cloud data persistence
// Task 4.1: Local storage implementation with AsyncStorage and SQLite

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import {
  GameSession,
  User,
  League,
  BowlingAlley,
  UserPreferences,
} from '../types';

// Storage keys for AsyncStorage
const STORAGE_KEYS = {
  USER: '@bowling_tracker:user',
  PREFERENCES: '@bowling_tracker:preferences',
  CURRENT_SESSION: '@bowling_tracker:current_session',
};

/**
 * DataService handles local data persistence using AsyncStorage for simple data
 * and SQLite for complex queries and relational data.
 * Implements singleton pattern to ensure only one database connection exists.
 */
export class DataService {
  private static instance: DataService | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of DataService
   */
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * Initialize the SQLite database and create tables if they don't exist
   * Guards against concurrent initialization attempts
   */
  async initializeDatabase(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // If already initialized, return immediately
    if (this.db) {
      return Promise.resolve();
    }

    // Create and store initialization promise to prevent concurrent initialization
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform the actual database initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('bowling_tracker.db');

      // Create games table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          league_id TEXT,
          venue_id TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          final_score INTEGER,
          frames_data TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Create venues table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS venues (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          accuracy REAL,
          place_id TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Create leagues table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS leagues (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          season TEXT NOT NULL,
          team_name TEXT,
          bowling_night TEXT NOT NULL,
          alley_id TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (alley_id) REFERENCES venues(id)
        );
      `);

      // Create indexes for common queries
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time);
        CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode);
        CREATE INDEX IF NOT EXISTS idx_games_league_id ON games(league_id);
        CREATE INDEX IF NOT EXISTS idx_games_venue_id ON games(venue_id);
      `);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Close the database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
    this.initializationPromise = null;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * Properly closes the database before resetting
   * @internal
   */
  public static async resetInstance(): Promise<void> {
    if (DataService.instance) {
      try {
        await DataService.instance.closeDatabase();
      } catch (error) {
        console.error('Error closing database during reset:', error);
      }
      DataService.instance = null;
    }
  }

  // ==================== Serialization/Deserialization ====================

  /**
   * Serialize a GameSession for storage
   */
  private serializeGameSession(session: GameSession): string {
    return JSON.stringify({
      ...session,
      startTime: session.startTime.getTime(),
      endTime: session.endTime?.getTime(),
    });
  }

  /**
   * Deserialize a GameSession from storage
   */
  private deserializeGameSession(data: string): GameSession {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      startTime: new Date(parsed.startTime),
      endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
    };
  }

  /**
   * Serialize User data for storage
   */
  private serializeUser(user: User): string {
    return JSON.stringify(user);
  }

  /**
   * Deserialize User data from storage
   */
  private deserializeUser(data: string): User {
    return JSON.parse(data);
  }

  // ==================== AsyncStorage Methods ====================

  /**
   * Save user profile to AsyncStorage
   */
  async saveUser(user: User): Promise<void> {
    try {
      const serialized = this.serializeUser(user);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, serialized);
    } catch (error) {
      console.error('Failed to save user:', error);
      throw new Error('Failed to save user data');
    }
  }

  /**
   * Get user profile from AsyncStorage
   */
  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (!data) return null;
      return this.deserializeUser(data);
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Save user preferences to AsyncStorage
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw new Error('Failed to save preferences');
    }
  }

  /**
   * Get user preferences from AsyncStorage
   */
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return null;
    }
  }

  /**
   * Save current game session to AsyncStorage (for quick resume)
   */
  async saveCurrentSession(session: GameSession): Promise<void> {
    try {
      const serialized = this.serializeGameSession(session);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, serialized);
    } catch (error) {
      console.error('Failed to save current session:', error);
      throw new Error('Failed to save current session');
    }
  }

  /**
   * Get current game session from AsyncStorage
   */
  async getCurrentSession(): Promise<GameSession | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (!data) return null;
      return this.deserializeGameSession(data);
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Clear current session from AsyncStorage
   */
  async clearCurrentSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    } catch (error) {
      console.error('Failed to clear current session:', error);
    }
  }

  // ==================== SQLite Methods - Game Sessions ====================

  /**
   * Save a completed game session to SQLite
   */
  async saveGameSession(session: GameSession): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      // Save venue if it exists and isn't already saved
      if (session.venue) {
        await this.saveVenue(session.venue);
      }

      // Save league if it exists and isn't already saved
      if (session.league) {
        await this.saveLeague(session.league);
      }

      // Insert or replace game session
      await this.db!.runAsync(
        `INSERT OR REPLACE INTO games 
         (id, mode, league_id, venue_id, start_time, end_time, final_score, frames_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.mode,
          session.league?.id || null,
          session.venue?.id || null,
          session.startTime.getTime(),
          session.endTime?.getTime() || null,
          session.finalScore || null,
          JSON.stringify(session.frames),
        ]
      );
    } catch (error) {
      console.error('Failed to save game session:', error);
      throw new Error('Failed to save game session');
    }
  }

  /**
   * Get all game sessions from SQLite
   */
  async getGameSessions(): Promise<GameSession[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const rows = await this.db!.getAllAsync<{
        id: string;
        mode: string;
        league_id: string | null;
        venue_id: string | null;
        start_time: number;
        end_time: number | null;
        final_score: number | null;
        frames_data: string;
      }>('SELECT * FROM games ORDER BY start_time DESC');

      const sessions: GameSession[] = await Promise.all(
        rows.map(async (row) => {
          // Fetch related league and venue in parallel if they exist
          const leaguePromise: Promise<League | undefined> = row.league_id
            ? this.getLeagueById(row.league_id)
            : Promise.resolve<League | undefined>(undefined);

          const venuePromise: Promise<BowlingAlley | undefined> = row.venue_id
            ? this.getVenueById(row.venue_id)
            : Promise.resolve<BowlingAlley | undefined>(undefined);

          const [league, venue] = await Promise.all([
            leaguePromise,
            venuePromise,
          ]);

          return {
            id: row.id,
            mode: row.mode as 'league' | 'open',
            league,
            venue,
            startTime: new Date(row.start_time),
            endTime: row.end_time ? new Date(row.end_time) : undefined,
            finalScore: row.final_score || undefined,
            frames: JSON.parse(row.frames_data),
          };
        })
      );

      return sessions;
    } catch (error) {
      console.error('Failed to get game sessions:', error);
      return [];
    }
  }

  /**
   * Get game sessions filtered by league
   */
  async getGameSessionsByLeague(leagueId: string): Promise<GameSession[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const rows = await this.db!.getAllAsync<{
        id: string;
        mode: string;
        league_id: string | null;
        venue_id: string | null;
        start_time: number;
        end_time: number | null;
        final_score: number | null;
        frames_data: string;
      }>('SELECT * FROM games WHERE league_id = ? ORDER BY start_time DESC', [
        leagueId,
      ]);

      const sessions: GameSession[] = await Promise.all(
        rows.map(async (row) => {
          const league = await this.getLeagueById(row.league_id!);
          let venue: BowlingAlley | undefined;
          if (row.venue_id) {
            venue = await this.getVenueById(row.venue_id);
          }

          return {
            id: row.id,
            mode: row.mode as 'league' | 'open',
            league,
            venue,
            startTime: new Date(row.start_time),
            endTime: row.end_time ? new Date(row.end_time) : undefined,
            finalScore: row.final_score || undefined,
            frames: JSON.parse(row.frames_data),
          };
        })
      );
      return sessions;
    } catch (error) {
      console.error('Failed to get game sessions by league:', error);
      return [];
    }
  }

  /**
   * Get game sessions filtered by venue
   */
  async getGameSessionsByVenue(venueId: string): Promise<GameSession[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const rows = await this.db!.getAllAsync<{
        id: string;
        mode: string;
        league_id: string | null;
        venue_id: string | null;
        start_time: number;
        end_time: number | null;
        final_score: number | null;
        frames_data: string;
      }>('SELECT * FROM games WHERE venue_id = ? ORDER BY start_time DESC', [
        venueId,
      ]);

      const sessions: GameSession[] = await Promise.all(
        rows.map(async (row) => {
          let league: League | undefined;
          if (row.league_id) {
            league = await this.getLeagueById(row.league_id);
          }
          const venue = await this.getVenueById(row.venue_id!);

          return {
            id: row.id,
            mode: row.mode as 'league' | 'open',
            league,
            venue,
            startTime: new Date(row.start_time),
            endTime: row.end_time ? new Date(row.end_time) : undefined,
            finalScore: row.final_score || undefined,
            frames: JSON.parse(row.frames_data),
          };
        })
      );
      return sessions;
    } catch (error) {
      console.error('Failed to get game sessions by venue:', error);
      return [];
    }
  }

  // ==================== SQLite Methods - Venues ====================

  /**
   * Save a bowling alley venue to SQLite
   */
  async saveVenue(venue: BowlingAlley): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      await this.db!.runAsync(
        `INSERT OR REPLACE INTO venues 
         (id, name, address, latitude, longitude, accuracy, place_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          venue.id,
          venue.name,
          venue.address,
          venue.location.latitude,
          venue.location.longitude,
          venue.location.accuracy || null,
          venue.placeId || null,
        ]
      );
    } catch (error) {
      console.error('Failed to save venue:', error);
      throw new Error('Failed to save venue');
    }
  }

  /**
   * Get a venue by ID from SQLite
   */
  async getVenueById(venueId: string): Promise<BowlingAlley | undefined> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const row = await this.db!.getFirstAsync<{
        id: string;
        name: string;
        address: string;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        place_id: string | null;
      }>('SELECT * FROM venues WHERE id = ?', [venueId]);

      if (!row) return undefined;

      return {
        id: row.id,
        name: row.name,
        address: row.address,
        location: {
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy || undefined,
        },
        placeId: row.place_id || undefined,
      };
    } catch (error) {
      console.error('Failed to get venue:', error);
      return undefined;
    }
  }

  /**
   * Get all venues from SQLite
   */
  async getAllVenues(): Promise<BowlingAlley[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const rows = await this.db!.getAllAsync<{
        id: string;
        name: string;
        address: string;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        place_id: string | null;
      }>('SELECT * FROM venues ORDER BY name');

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        location: {
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy || undefined,
        },
        placeId: row.place_id || undefined,
      }));
    } catch (error) {
      console.error('Failed to get venues:', error);
      return [];
    }
  }

  // ==================== SQLite Methods - Leagues ====================

  /**
   * Save a league to SQLite
   */
  async saveLeague(league: League): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      // Save the league's alley first
      await this.saveVenue(league.alley);

      await this.db!.runAsync(
        `INSERT OR REPLACE INTO leagues 
         (id, name, season, team_name, bowling_night, alley_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          league.id,
          league.name,
          league.season,
          league.teamName || null,
          league.bowlingNight,
          league.alley.id,
        ]
      );
    } catch (error) {
      console.error('Failed to save league:', error);
      throw new Error('Failed to save league');
    }
  }

  /**
   * Get a league by ID from SQLite
   */
  async getLeagueById(leagueId: string): Promise<League | undefined> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const row = await this.db!.getFirstAsync<{
        id: string;
        name: string;
        season: string;
        team_name: string | null;
        bowling_night: string;
        alley_id: string;
      }>('SELECT * FROM leagues WHERE id = ?', [leagueId]);

      if (!row) return undefined;

      const alley = await this.getVenueById(row.alley_id);
      if (!alley) return undefined;

      return {
        id: row.id,
        name: row.name,
        season: row.season,
        teamName: row.team_name || undefined,
        bowlingNight: row.bowling_night,
        alley,
      };
    } catch (error) {
      console.error('Failed to get league:', error);
      return undefined;
    }
  }

  /**
   * Get all leagues from SQLite
   */
  async getAllLeagues(): Promise<League[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const rows = await this.db!.getAllAsync<{
        id: string;
        name: string;
        season: string;
        team_name: string | null;
        bowling_night: string;
        alley_id: string;
        alley_name: string;
      }>(
        `SELECT
           l.id,
           l.name,
           l.season,
           l.team_name,
           l.bowling_night,
           l.alley_id,
           a.name AS alley_name
         FROM leagues l
         JOIN bowling_alleys a ON a.id = l.alley_id
         ORDER BY l.name`
      );

      const leagues: League[] = [];

      for (const row of rows) {
        const alley: BowlingAlley = {
          id: row.alley_id,
          name: row.alley_name,
        } as BowlingAlley;

        leagues.push({
          id: row.id,
          name: row.name,
          season: row.season,
          teamName: row.team_name || undefined,
          bowlingNight: row.bowling_night,
          alley,
        });
      }

      return leagues;
    } catch (error) {
      console.error('Failed to get leagues:', error);
      return [];
    }
  }

  // ==================== Cloud Sync Methods (Task 4.2) ====================

  /**
   * Sync data to cloud storage
   * Implementation will be added in task 4.2
   */
  async syncToCloud(): Promise<void> {
    throw new Error('Cloud sync not implemented yet - Task 4.2');
  }

  /**
   * Sync data from cloud storage
   * Implementation will be added in task 4.2
   */
  async syncFromCloud(): Promise<void> {
    throw new Error('Cloud sync not implemented yet - Task 4.2');
  }
}
