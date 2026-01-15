// Property-Based Tests for GameEngine
// Feature: bowling-score-tracker, Property 3: Pin State Consistency
// Validates: Requirements 2.2
// Feature: bowling-score-tracker, Property 1: Bowling Score Calculation Accuracy
// Validates: Requirements 2.3, 2.4, 2.5

import { GameEngine } from './GameEngine';
import { PinState } from '@/types';
import * as fc from 'fast-check';

describe('GameEngine - Property-Based Tests', () => {
  describe('Property 1: Bowling Score Calculation Accuracy', () => {
    /**
     * Property: For any sequence of valid pin combinations in a bowling game,
     * the calculated total score should match the official bowling scoring rules
     * including strikes, spares, and 10th frame bonus scoring.
     *
     * This property validates that:
     * 1. Regular frames (1-9) are scored correctly
     * 2. Strike bonus scoring works correctly (10 + next two rolls)
     * 3. Spare bonus scoring works correctly (10 + next one roll)
     * 4. 10th frame special rules are applied correctly
     * 5. Total score is the sum of all frame scores
     */

    it('should calculate perfect game score correctly', () => {
      // Arrange: Create a new game
      const engine = new GameEngine();
      engine.startNewGame('open');

      // Act: Record a perfect game (12 strikes)
      const strike: PinState[] = Array(10).fill('knocked');

      // Frames 1-9: one strike each
      for (let frame = 0; frame < 9; frame++) {
        engine.recordRoll(frame, 0, strike);
      }

      // Frame 10: three strikes
      engine.recordRoll(9, 0, strike);
      engine.recordRoll(9, 1, strike);
      engine.recordRoll(9, 2, strike);

      // Assert: Perfect game should score 300
      const totalScore = engine.calculateTotalScore();
      expect(totalScore).toBe(300);

      // Each of the first 9 frames should score 30 (10 + 10 + 10)
      for (let frame = 0; frame < 9; frame++) {
        expect(engine.calculateFrameScore(frame)).toBe(30);
      }

      // Frame 10 should score 30 (10 + 10 + 10)
      expect(engine.calculateFrameScore(9)).toBe(30);
    });

    it('should calculate all-spares game score correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }), // First roll pins for each spare
          (firstRollPins) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record all spares with consistent first roll
            const firstRoll: PinState[] = Array(10).fill('standing');
            const secondRoll: PinState[] = Array(10).fill('standing');

            for (let i = 0; i < firstRollPins; i++) {
              firstRoll[i] = 'knocked';
            }
            for (let i = firstRollPins; i < 10; i++) {
              secondRoll[i] = 'knocked';
            }

            // Frames 1-9: spares
            for (let frame = 0; frame < 9; frame++) {
              engine.recordRoll(frame, 0, firstRoll);
              engine.recordRoll(frame, 1, secondRoll);
            }

            // Frame 10: spare + bonus roll
            engine.recordRoll(9, 0, firstRoll);
            engine.recordRoll(9, 1, secondRoll);
            engine.recordRoll(9, 2, firstRoll); // Bonus roll

            // Assert: All spares should score correctly
            const totalScore = engine.calculateTotalScore();

            // Each of the first 9 frames is a spare: base 10 pins + bonus from next first roll (firstRollPins)
            // Frame 10 has rolls: firstRollPins + (10 - firstRollPins) + bonus firstRollPins = 10 + firstRollPins
            const expectedTotal =
              9 * (10 + firstRollPins) + (10 + firstRollPins);
            expect(totalScore).toBe(expectedTotal);

            // Each of the first 9 frames should score 10 + firstRollPins
            for (let frame = 0; frame < 9; frame++) {
              expect(engine.calculateFrameScore(frame)).toBe(
                10 + firstRollPins
              );
            }

            // Frame 10 should score 10 + firstRollPins
            expect(engine.calculateFrameScore(9)).toBe(10 + firstRollPins);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle strike-spare combinations correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }), // First roll of spare frame
          (spareFirstRoll) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record strike followed by spare
            const strike: PinState[] = Array(10).fill('knocked');
            engine.recordRoll(0, 0, strike);

            const spareRoll1: PinState[] = Array(10).fill('standing');
            const spareRoll2: PinState[] = Array(10).fill('standing');

            for (let i = 0; i < spareFirstRoll; i++) {
              spareRoll1[i] = 'knocked';
            }
            for (let i = spareFirstRoll; i < 10; i++) {
              spareRoll2[i] = 'knocked';
            }

            engine.recordRoll(1, 0, spareRoll1);
            engine.recordRoll(1, 1, spareRoll2);

            // Assert: Strike frame should get bonus from both rolls of spare
            const strikeFrameScore = engine.calculateFrameScore(0);
            expect(strikeFrameScore).toBe(
              10 + spareFirstRoll + (10 - spareFirstRoll)
            );
            expect(strikeFrameScore).toBe(20); // 10 + 10 (spare total)

            // Spare frame needs next roll for bonus calculation
            // Without next frame, spare should still calculate base score
            const spareFrameScore = engine.calculateFrameScore(1);
            expect(spareFrameScore).toBe(10); // 10 + 0 (no next roll yet)
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should calculate regular frame scores correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9 }), // First roll pins
          fc.integer({ min: 0, max: 9 }), // Second roll pins (will be constrained)
          (firstRollPins, secondRollPinsRaw) => {
            // Constrain second roll so total doesn't exceed 10
            const maxSecondRoll = 10 - firstRollPins;
            const secondRollPins = Math.min(secondRollPinsRaw, maxSecondRoll);

            // Skip strikes and spares for this test
            if (firstRollPins === 10 || firstRollPins + secondRollPins === 10) {
              return;
            }

            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record regular frame
            const firstRoll: PinState[] = Array(10).fill('standing');
            const secondRoll: PinState[] = Array(10).fill('standing');

            for (let i = 0; i < firstRollPins; i++) {
              firstRoll[i] = 'knocked';
            }
            for (let i = 0; i < secondRollPins; i++) {
              secondRoll[i] = 'knocked';
            }

            engine.recordRoll(0, 0, firstRoll);
            engine.recordRoll(0, 1, secondRoll);

            // Assert: Regular frame should score sum of both rolls
            const frameScore = engine.calculateFrameScore(0);
            expect(frameScore).toBe(firstRollPins + secondRollPins);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate strike bonus correctly across multiple frames', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // Next frame first roll
          fc.integer({ min: 0, max: 10 }), // Next frame second roll (will be constrained)
          (nextFirstRoll, nextSecondRollRaw) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record strike in first frame
            const strike: PinState[] = Array(10).fill('knocked');
            engine.recordRoll(0, 0, strike);

            // Record next frame based on whether first roll is a strike
            if (nextFirstRoll === 10) {
              // Next frame is also a strike
              engine.recordRoll(1, 0, strike);

              // Need a third frame for complete bonus calculation
              const thirdFrameRoll: PinState[] = Array(10).fill('standing');
              const thirdRollPins = Math.min(nextSecondRollRaw, 10);
              for (let i = 0; i < thirdRollPins; i++) {
                thirdFrameRoll[i] = 'knocked';
              }
              engine.recordRoll(2, 0, thirdFrameRoll);

              // Assert: Strike + Strike + thirdRollPins
              const frameScore = engine.calculateFrameScore(0);
              expect(frameScore).toBe(10 + 10 + thirdRollPins);
            } else {
              // Next frame is not a strike
              const maxSecondRoll = 10 - nextFirstRoll;
              const nextSecondRoll = Math.min(nextSecondRollRaw, maxSecondRoll);

              const nextRoll1: PinState[] = Array(10).fill('standing');
              const nextRoll2: PinState[] = Array(10).fill('standing');

              for (let i = 0; i < nextFirstRoll; i++) {
                nextRoll1[i] = 'knocked';
              }
              for (let i = 0; i < nextSecondRoll; i++) {
                nextRoll2[i] = 'knocked';
              }

              engine.recordRoll(1, 0, nextRoll1);
              engine.recordRoll(1, 1, nextRoll2);

              // Assert: Strike + nextFirstRoll + nextSecondRoll
              const frameScore = engine.calculateFrameScore(0);
              expect(frameScore).toBe(10 + nextFirstRoll + nextSecondRoll);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate spare bonus correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }), // First roll of spare
          fc.integer({ min: 0, max: 10 }), // Next frame first roll
          (spareFirstRoll, nextRoll) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record spare in first frame
            const firstRoll: PinState[] = Array(10).fill('standing');
            const secondRoll: PinState[] = Array(10).fill('standing');

            for (let i = 0; i < spareFirstRoll; i++) {
              firstRoll[i] = 'knocked';
            }
            for (let i = spareFirstRoll; i < 10; i++) {
              secondRoll[i] = 'knocked';
            }

            engine.recordRoll(0, 0, firstRoll);
            engine.recordRoll(0, 1, secondRoll);

            // Record next frame first roll for bonus
            const nextFrameRoll: PinState[] = Array(10).fill('standing');
            const nextRollPins = Math.min(nextRoll, 10);
            for (let i = 0; i < nextRollPins; i++) {
              nextFrameRoll[i] = 'knocked';
            }
            engine.recordRoll(1, 0, nextFrameRoll);

            // Assert: Spare should score 10 + next roll
            const frameScore = engine.calculateFrameScore(0);
            expect(frameScore).toBe(10 + nextRollPins);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle 10th frame scoring correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // First roll
          fc.integer({ min: 0, max: 10 }), // Second roll
          fc.integer({ min: 0, max: 10 }), // Third roll (if needed)
          (roll1, roll2Raw, roll3) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record 10th frame based on first roll
            const firstRoll: PinState[] = Array(10).fill('standing');
            for (let i = 0; i < Math.min(roll1, 10); i++) {
              firstRoll[i] = 'knocked';
            }
            engine.recordRoll(9, 0, firstRoll);

            let expectedScore = Math.min(roll1, 10);

            if (roll1 === 10) {
              // Strike in 10th frame - need 2 more rolls
              const secondRoll: PinState[] = Array(10).fill('standing');
              const roll2Pins = Math.min(roll2Raw, 10);
              for (let i = 0; i < roll2Pins; i++) {
                secondRoll[i] = 'knocked';
              }
              engine.recordRoll(9, 1, secondRoll);
              expectedScore += roll2Pins;

              const thirdRoll: PinState[] = Array(10).fill('standing');
              const roll3Pins = Math.min(roll3, 10);
              for (let i = 0; i < roll3Pins; i++) {
                thirdRoll[i] = 'knocked';
              }
              engine.recordRoll(9, 2, thirdRoll);
              expectedScore += roll3Pins;
            } else {
              // Not a strike - constrain second roll
              const maxRoll2 = 10 - roll1;
              const roll2 = Math.min(roll2Raw, maxRoll2);

              const secondRoll: PinState[] = Array(10).fill('standing');
              for (let i = 0; i < roll2; i++) {
                secondRoll[i] = 'knocked';
              }
              engine.recordRoll(9, 1, secondRoll);
              expectedScore += roll2;

              if (roll1 + roll2 === 10) {
                // Spare - need third roll
                const thirdRoll: PinState[] = Array(10).fill('standing');
                const roll3Pins = Math.min(roll3, 10);
                for (let i = 0; i < roll3Pins; i++) {
                  thirdRoll[i] = 'knocked';
                }
                engine.recordRoll(9, 2, thirdRoll);
                expectedScore += roll3Pins;
              }
            }

            // Assert: 10th frame should score sum of all rolls
            const frameScore = engine.calculateFrameScore(9);
            expect(frameScore).toBe(expectedScore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Pin State Consistency', () => {
    /**
     * Property: For any valid pin selection, the pin state should update correctly
     * and the knocked pin count should equal the number of pins marked as knocked down.
     *
     * This property validates that:
     * 1. Pin states are stored correctly in the roll
     * 2. The pinsKnocked count matches the actual number of 'knocked' pins
     * 3. The pin array maintains its integrity (length and values)
     */
    it('should maintain pin state consistency for any valid pin selection', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary pin states (array of 10 pins, each either 'standing' or 'knocked')
          fc.array(fc.constantFrom<PinState>('standing', 'knocked'), {
            minLength: 10,
            maxLength: 10,
          }),
          // Generate arbitrary frame index (0-9)
          fc.integer({ min: 0, max: 9 }),
          (pins, frameIndex) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record the roll with the generated pin states
            engine.recordRoll(frameIndex, 0, pins);

            // Assert: Verify pin state consistency
            const session = engine.getCurrentSession();
            expect(session).not.toBeNull();

            const frame = session!.frames[frameIndex];
            expect(frame.rolls).toHaveLength(1);

            const roll = frame.rolls[0];

            // Property 1: Pin array should be stored correctly
            expect(roll.pins).toHaveLength(10);
            expect(roll.pins).toEqual(pins);

            // Property 2: Knocked pin count should match actual knocked pins
            const expectedKnockedCount = pins.filter(
              (pin) => pin === 'knocked'
            ).length;
            expect(roll.pinsKnocked).toBe(expectedKnockedCount);

            // Property 3: Each pin state should be either 'standing' or 'knocked'
            roll.pins.forEach((pin) => {
              expect(['standing', 'knocked']).toContain(pin);
            });
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should maintain pin state consistency across multiple rolls in a frame', () => {
      fc.assert(
        fc.property(
          // Generate two pin state arrays for two rolls
          fc.array(fc.constantFrom<PinState>('standing', 'knocked'), {
            minLength: 10,
            maxLength: 10,
          }),
          fc.array(fc.constantFrom<PinState>('standing', 'knocked'), {
            minLength: 10,
            maxLength: 10,
          }),
          fc.integer({ min: 0, max: 9 }),
          (firstPins, secondPins, frameIndex) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record two rolls
            engine.recordRoll(frameIndex, 0, firstPins);
            engine.recordRoll(frameIndex, 1, secondPins);

            // Assert: Verify both rolls maintain pin state consistency
            const session = engine.getCurrentSession();
            expect(session).not.toBeNull();

            const frame = session!.frames[frameIndex];
            expect(frame.rolls).toHaveLength(2);

            // Check first roll
            const firstRoll = frame.rolls[0];
            expect(firstRoll.pins).toEqual(firstPins);
            const expectedFirstKnockedCount = firstPins.filter(
              (pin) => pin === 'knocked'
            ).length;
            expect(firstRoll.pinsKnocked).toBe(expectedFirstKnockedCount);

            // Check second roll
            const secondRoll = frame.rolls[1];
            expect(secondRoll.pins).toEqual(secondPins);
            const expectedSecondKnockedCount = secondPins.filter(
              (pin) => pin === 'knocked'
            ).length;
            expect(secondRoll.pinsKnocked).toBe(expectedSecondKnockedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain pin state consistency when updating existing rolls', () => {
      fc.assert(
        fc.property(
          // Generate initial and updated pin states
          fc.array(fc.constantFrom<PinState>('standing', 'knocked'), {
            minLength: 10,
            maxLength: 10,
          }),
          fc.array(fc.constantFrom<PinState>('standing', 'knocked'), {
            minLength: 10,
            maxLength: 10,
          }),
          fc.integer({ min: 0, max: 9 }),
          (initialPins, updatedPins, frameIndex) => {
            // Arrange: Create a new game and record initial roll
            const engine = new GameEngine();
            engine.startNewGame('open');
            engine.recordRoll(frameIndex, 0, initialPins);

            // Act: Update the roll with new pin states
            engine.recordRoll(frameIndex, 0, updatedPins);

            // Assert: Verify updated pin state consistency
            const session = engine.getCurrentSession();
            expect(session).not.toBeNull();

            const frame = session!.frames[frameIndex];
            expect(frame.rolls).toHaveLength(1);

            const roll = frame.rolls[0];

            // Should reflect the updated pins, not the initial ones
            expect(roll.pins).toEqual(updatedPins);
            const expectedKnockedCount = updatedPins.filter(
              (pin) => pin === 'knocked'
            ).length;
            expect(roll.pinsKnocked).toBe(expectedKnockedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
