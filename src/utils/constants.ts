// Constants for the Bowling Score Tracker

export const BOWLING_CONSTANTS = {
  TOTAL_PINS: 10,
  TOTAL_FRAMES: 10,
  MAX_ROLLS_PER_FRAME: 2,
  MAX_ROLLS_TENTH_FRAME: 3,
  PERFECT_GAME_SCORE: 300,
} as const;

export const PIN_POSITIONS = [
  { id: 1, x: 0.5, y: 0.1 }, // Head pin
  { id: 2, x: 0.3, y: 0.25 }, // Left of head pin
  { id: 3, x: 0.7, y: 0.25 }, // Right of head pin
  { id: 4, x: 0.1, y: 0.4 }, // Far left
  { id: 5, x: 0.4, y: 0.4 }, // Left center
  { id: 6, x: 0.6, y: 0.4 }, // Right center
  { id: 7, x: 0.9, y: 0.4 }, // Far right
  { id: 8, x: 0.2, y: 0.55 }, // Back left
  { id: 9, x: 0.5, y: 0.55 }, // Back center
  { id: 10, x: 0.8, y: 0.55 }, // Back right
] as const;

export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  GAME_SESSIONS: 'game_sessions',
  LEAGUES: 'leagues',
  VENUES: 'venues',
  CURRENT_GAME: 'current_game',
} as const;

export const COLORS = {
  primary: '#1E40AF',
  secondary: '#64748B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
} as const;
