// Unit tests for GameEngine core functionality
// Tests basic game state management, frame tracking, and roll recording

import { GameEngine } from './GameEngine';
import { PinState } from '@/types';

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

    it('should throw error for negative roll index', () => {
      const pins: PinState[] = Array(10).fill('standing');

      expect(() => {
        engine.recordRoll(0, -1, pins);
      }).toThrow('Invalid roll index: must be non-negative');
    });

    it('should throw error when pins array has less than 10 elements', () => {
      const pins: PinState[] = Array(5).fill('standing');

      expect(() => {
        engine.recordRoll(0, 0, pins);
      }).toThrow('Invalid pins array: must contain exactly 10 elements');
    });

    it('should throw error when pins array has more than 10 elements', () => {
      const pins: PinState[] = Array(15).fill('standing');

      expect(() => {
        engine.recordRoll(0, 0, pins);
      }).toThrow('Invalid pins array: must contain exactly 10 elements');
    });

    it('should throw error when pins array is empty', () => {
      const pins: PinState[] = [];

      expect(() => {
        engine.recordRoll(0, 0, pins);
      }).toThrow('Invalid pins array: must contain exactly 10 elements');
    });

    it('should throw error when recording rolls out of order', () => {
      const pins: PinState[] = Array(10).fill('standing');
      pins[0] = 'knocked';

      // Try to record roll index 2 when no rolls exist yet
      expect(() => {
        engine.recordRoll(0, 2, pins);
      }).toThrow(
        'Invalid roll index 2 for frame with 0 rolls. Rolls must be recorded sequentially.'
      );
    });

    it('should throw error when skipping a roll index', () => {
      const pins: PinState[] = Array(10).fill('standing');
      pins[0] = 'knocked';

      // Record first roll
      engine.recordRoll(0, 0, pins);

      // Try to record roll index 2, skipping index 1
      expect(() => {
        engine.recordRoll(0, 2, pins);
      }).toThrow(
        'Invalid roll index 2 for frame with 1 roll. Rolls must be recorded sequentially.'
      );
    });

    it('should allow updating an existing roll', () => {
      const firstRoll: PinState[] = Array(10).fill('standing');
      firstRoll[0] = 'knocked';
      firstRoll[1] = 'knocked';

      // Record first roll
      engine.recordRoll(0, 0, firstRoll);

      const session = engine.getCurrentSession();
      expect(session?.frames[0].rolls[0].pinsKnocked).toBe(2);

      // Update first roll with different pin count
      const updatedRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 5; i++) {
        updatedRoll[i] = 'knocked';
      }
      engine.recordRoll(0, 0, updatedRoll);

      const updatedSession = engine.getCurrentSession();
      expect(updatedSession?.frames[0].rolls[0].pinsKnocked).toBe(5);
    });

    it('should clear isStrike flag when updating strike to non-strike', () => {
      // Record a strike
      const strikeRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(0, 0, strikeRoll);

      let session = engine.getCurrentSession();
      expect(session?.frames[0].isStrike).toBe(true);

      // Update to non-strike
      const nonStrikeRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 7; i++) {
        nonStrikeRoll[i] = 'knocked';
      }
      engine.recordRoll(0, 0, nonStrikeRoll);

      session = engine.getCurrentSession();
      expect(session?.frames[0].isStrike).toBe(false);
      expect(session?.frames[0].rolls[0].pinsKnocked).toBe(7);
    });

    it('should update isSpare flag when modifying rolls', () => {
      // Record first roll: 7 pins
      const firstRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 7; i++) {
        firstRoll[i] = 'knocked';
      }
      engine.recordRoll(0, 0, firstRoll);

      // Record second roll: 3 pins (spare)
      const secondRoll: PinState[] = Array(10).fill('standing');
      for (let i = 7; i < 10; i++) {
        secondRoll[i] = 'knocked';
      }
      engine.recordRoll(0, 1, secondRoll);

      let session = engine.getCurrentSession();
      expect(session?.frames[0].isSpare).toBe(true);

      // Update second roll to only 2 pins (no spare)
      const updatedSecondRoll: PinState[] = Array(10).fill('standing');
      updatedSecondRoll[7] = 'knocked';
      updatedSecondRoll[8] = 'knocked';
      engine.recordRoll(0, 1, updatedSecondRoll);

      session = engine.getCurrentSession();
      expect(session?.frames[0].isSpare).toBe(false);
      expect(session?.frames[0].rolls[1].pinsKnocked).toBe(2);
    });

    it('should recalculate isStrike when updating first roll in 10th frame', () => {
      // Record strike in frame 10
      const strikeRoll: PinState[] = Array(10).fill('knocked');
      engine.recordRoll(9, 0, strikeRoll);

      let session = engine.getCurrentSession();
      expect(session?.frames[9].isStrike).toBe(true);

      // Update to non-strike
      const nonStrikeRoll: PinState[] = Array(10).fill('standing');
      for (let i = 0; i < 8; i++) {
        nonStrikeRoll[i] = 'knocked';
      }
      engine.recordRoll(9, 0, nonStrikeRoll);

      session = engine.getCurrentSession();
      expect(session?.frames[9].isStrike).toBe(false);
      expect(session?.frames[9].rolls[0].pinsKnocked).toBe(8);
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
