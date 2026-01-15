// Core Types for Bowling Score Tracker
// Based on the design document interfaces

export type PinState = 'standing' | 'knocked';
export type GameMode = 'league' | 'open';
export type HapticType = 'success' | 'error' | 'selection';
export type TimePeriod = 'week' | 'month' | 'year' | 'all';

// Core Game Interfaces
export interface Roll {
  pins: PinState[];
  pinsKnocked: number;
}

export interface Frame {
  frameNumber: number;
  rolls: Roll[];
  score?: number;
  isStrike: boolean;
  isSpare: boolean;
}

export interface GameSession {
  id: string;
  mode: GameMode;
  league?: League;
  frames: Frame[];
  venue?: BowlingAlley;
  startTime: Date;
  endTime?: Date;
  finalScore?: number;
}

// User and League Management
export interface User {
  id: string;
  name: string;
  email?: string;
  leagues: League[];
  preferences: UserPreferences;
}

export interface League {
  id: string;
  name: string;
  season: string;
  teamName?: string;
  bowlingNight: string;
  alley: BowlingAlley;
}

export interface UserPreferences {
  defaultGameMode: GameMode;
  hapticFeedback: boolean;
  autoDetectVenue: boolean;
  syncToCloud: boolean;
}

// Location and Venue
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface BowlingAlley {
  id: string;
  name: string;
  address: string;
  location: Location;
  placeId?: string;
}

// Statistics
export interface PinAccuracy {
  pinNumber: number;
  hitPercentage: number;
  missPercentage: number;
}

export interface BowlingStats {
  gamesPlayed: number;
  average: number;
  highGame: number;
  lowGame: number;
  strikePercentage: number;
  sparePercentage: number;
  pinAccuracy: PinAccuracy[];
}

export interface VenueStats extends BowlingStats {
  venue: BowlingAlley;
}

export interface TrendData {
  period: TimePeriod;
  dataPoints: {
    date: Date;
    average: number;
    gamesPlayed: number;
  }[];
}

// Game History
export interface GameHistory {
  games: GameSession[];
  totalGames: number;
  lastPlayed: Date;
}

// Pin Layout
export interface PinPosition {
  id: number;
  x: number;
  y: number;
  isKnocked: boolean;
}

export interface PinLayout {
  positions: PinPosition[];
  validateSelection: (pins: PinState[], previousRoll?: Roll) => boolean;
}

// Watch Communication
export interface WatchMessage {
  type: 'gameState' | 'scoreEntry' | 'haptic';
  payload: unknown;
  timestamp: Date;
}

// Component Props Interfaces
export interface PinSelectorProps {
  pins: PinState[];
  onPinToggle: (pinIndex: number) => void;
  disabled: boolean;
  rollNumber: number;
}

// Service Interfaces
export interface GameEngineInterface {
  startNewGame(mode: GameMode, league?: League): GameSession;
  recordRoll(frameIndex: number, rollIndex: number, pins: PinState[]): void;
  calculateFrameScore(frameIndex: number): number;
  calculateTotalScore(): number;
  isGameComplete(): boolean;
  getCurrentSession(): GameSession | null;
  validateGameState(): { isValid: boolean; errors: string[] };
}

export interface StatisticsEngineInterface {
  calculateStats(games: GameSession[]): BowlingStats;
  getVenueStats(venue: BowlingAlley, games: GameSession[]): VenueStats;
  getTrendData(games: GameSession[], period: TimePeriod): TrendData;
}

export interface WatchConnectorInterface {
  isConnected(): boolean;
  sendGameState(session: GameSession): void;
  onScoreReceived: (
    callback: (frameIndex: number, pins: PinState[]) => void
  ) => void;
  sendHapticFeedback(type: HapticType): void;
}

export interface LocationServiceInterface {
  getCurrentLocation(): Promise<Location>;
  detectBowlingAlley(location: Location): Promise<BowlingAlley | null>;
  getNearbyAlleys(location: Location, radius: number): Promise<BowlingAlley[]>;
}
