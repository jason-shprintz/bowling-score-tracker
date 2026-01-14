// Unit tests for GameEngine core functionality
// Tests basic game state management, frame tracking, and roll recording

import { GameEngine } from './GameEngine';
import { GameMode, PinState } from '@/types';

describe('GameEngine - Core Game State Management', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('startNewGame', () => {
    it('should initialize a new game with 10 empty frames', () => {
      const session = engine.startNewGame('open');

      expect(session).toBeDefined();
      expect(session.mode).toBe('open');
      expect(session.frames).toHaveLength(10);
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.id).toBeTruthy();
    });

    it('should initialize frames with correct structure', () => {
      const session = engine.startNewGame('open');

      session.frames.forEach((frame, index) => {
        expect(frame.frameNumber).toBe(index + 1);
        expect(frame.rolls).toEqual([]);
        expect(frame.isStrike).toBe(false);
        expect(frame.isSpare).toBe(false);
      });
    });

    it('should support league mode with league data', () => {
      const league = {
        id: 'league1',
        name: 'Monday Night League',
        season: 'Fall 2024',
        bowlingNight: 'Monday',
        alley: {
          id: 'alley1',
          name: 'Test Bowling',
          address: '123 Main St',
          location: { latitude: 0, longitude: 0 },
        },
      };

      const session = engine.startNewGame('league', league);

      expect(session.mode).toBe('league');
      expect(session.league).toEqual(league);
    });
  });

  describe('recordRoll', () => {
    beforeEach(() => {
      engine.startNewGame('open');
    });

    it('should record a roll with pin states', () => {
      const pins: PinState[] = Array(10).fill('standing');
      pins[0] = 'knocked';
      pins[1] = 'knocked';
      pins[2] = 'knocked';

      engine.recordRoll(0, 0, pins);

      const session = engine.getCurrentSession();
      expect(session?.frames[0].rolls).toHaveLength(1);
      expect(session?.frames[0].rolls[0].pinsKnocked).toBe(3);
    });

    it('should detect a strike on first roll', () => {
      const pins: PinState[] = Array(10).fill('knocked');

      engine.recordRoll(0, 0, pins);

      const session = engine.getCurrentSession();
      expect(session?.frames[0].isStrike).toBe(true);
      expect(session?.frames[0].rolls[0].pinsKnocked).toBe(10);
    });

    it('should detect a spare on second roll', () => {
      // First roll: 7 pins
      const firstRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 7; i++) {
        firstRoll[i] = 'knocked';
      }
      engine.recordRoll(0, 0, firstRoll);

      // Second roll: 3 pins (total 10)
      const secondRoll: PinState[] = Array(10).fill('standing');
      for (let i = 7; i < 10; i++) {
        secondRoll[i] = 'knocked';
      }
      engine.recordRoll(0, 1, secondRoll);

      const session = engine.getCurrentSession();
      expect(session?.frames[0].isSpare).toBe(true);
      expect(session?.frames[0].rolls).toHaveLength(2);
    });

    it('should handle multiple rolls in a frame', () => {
      const firstRoll: PinState[] = Array(10).fill('standing');
      firstRoll[0] = 'knocked';
      firstRoll[1] = 'knocked';

      const secondRoll: PinState[] = Array(10).fill('standing');
      secondRoll[2] = 'knocked';
      secondRoll[3] = 'knocked';

      engine.recordRoll(0, 0, firstRoll);
      engine.recordRoll(0, 1, secondRoll);

      const session = engine.getCurrentSession();
      expect(session?.frames[0].rolls).toHaveLength(2);
      expect(session?.frames[0].rolls[0].pinsKnocked).toBe(2);
      expect(session?.frames[0].rolls[1].pinsKnocked).toBe(2);
    });

    it('should throw error when no active session', () => {
      const newEngine = new GameEngine();
      const pins: PinState[] = Array(10).fill('standing');

      expect(() => {
        newEngine.recordRoll(0, 0, pins);
      }).toThrow('No active game session');
    });

    it('should throw error for invalid frame index', () => {
      const pins: PinState[] = Array(10).fill('standing');

      expect(() => {
        engine.recordRoll(-1, 0, pins);
      }).toThrow('Invalid frame index');

      expect(() => {
        engine.recordRoll(10, 0, pins);
      }).toThrow('Invalid frame index');
    });
  });

  describe('isGameComplete', () => {
    beforeEach(() => {
      engine.startNewGame('open');
    });

    it('should return false for new game', () => {
      expect(engine.isGameComplete()).toBe(false);
    });

    it('should return false when frame 10 has no rolls', () => {
      expect(engine.isGameComplete()).toBe(false);
    });

    it('should return true when frame 10 complete without strike or spare', () => {
      // First roll: 5 pins
      const firstRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 5; i++) {
        firstRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 0, firstRoll);

      // Second roll: 3 pins (no spare)
      const secondRoll: PinState[] = Array(10).fill('standing');
      for (let i = 5; i < 8; i++) {
        secondRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 1, secondRoll);

      expect(engine.isGameComplete()).toBe(true);
    });

    it('should return false when frame 10 has spare but no third roll', () => {
      // First roll: 7 pins
      const firstRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 7; i++) {
        firstRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 0, firstRoll);

      // Second roll: 3 pins (spare)
      const secondRoll: PinState[] = Array(10).fill('standing');
      for (let i = 7; i < 10; i++) {
        secondRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 1, secondRoll);

      expect(engine.isGameComplete()).toBe(false);
    });

    it('should return true when frame 10 has spare and third roll', () => {
      // First roll: 7 pins
      const firstRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 7; i++) {
        firstRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 0, firstRoll);

      // Second roll: 3 pins (spare)
      const secondRoll: PinState[] = Array(10).fill('standing');
      for (let i = 7; i < 10; i++) {
        secondRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 1, secondRoll);

      // Third roll: bonus
      const thirdRoll: PinState[] = Array(10).fill('standing');
      thirdRoll[0] = 'knocked';
      engine.recordRoll(9, 2, thirdRoll);

      expect(engine.isGameComplete()).toBe(true);
    });

    it('should return false when frame 10 has strike but not 3 rolls', () => {
      // First roll: strike
      const firstRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(9, 0, firstRoll);

      expect(engine.isGameComplete()).toBe(false);

      // Second roll
      const secondRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(9, 1, secondRoll);

      expect(engine.isGameComplete()).toBe(false);
    });

    it('should return true when frame 10 has strike and 3 rolls', () => {
      // First roll: strike
      const firstRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(9, 0, firstRoll);

      // Second roll: strike
      const secondRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(9, 1, secondRoll);

      // Third roll
      const thirdRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(9, 2, thirdRoll);

      expect(engine.isGameComplete()).toBe(true);
    });
  });

  describe('getCurrentSession', () => {
    it('should return null when no game started', () => {
      expect(engine.getCurrentSession()).toBeNull();
    });

    it('should return current session after game started', () => {
      const session = engine.startNewGame('open');
      expect(engine.getCurrentSession()).toBe(session);
    });
  });
});
