// Property-Based Tests for GameEngine
// Feature: bowling-score-tracker, Property 3: Pin State Consistency
// Validates: Requirements 2.2
// Feature: bowling-score-tracker, Property 1: Bowling Score Calculation Accuracy
// Validates: Requirements 2.3, 2.4, 2.5

import { GameEngine } from './GameEngine';
import { PinState } from '@/types';
import * as fc from 'fast-check';
import { PinPhysics } from './PinPhysics';

/**
 * Generates physically valid pin combinations for first roll
 * Uses bowling physics rules to ensure generated combinations are possible
 */
function generateValidFirstRoll(): fc.Arbitrary<PinState[]> {
  return fc.oneof(
    // All pins standing (0 pins knocked)
    fc.constant(Array(10).fill('standing') as PinState[]),

    // Strike (all pins knocked)
    fc.constant(Array(10).fill('knocked') as PinState[]),

    // Head pin only (1 pin)
    fc.constant([
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Head pin + pin 2 (2 pins)
    fc.constant([
      'knocked',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Head pin + pin 3 (2 pins)
    fc.constant([
      'knocked',
      'standing',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Head pin + pin 2 + pin 3 (3 pins)
    fc.constant([
      'knocked',
      'knocked',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Head pin + pin 2 + pin 4 (3 pins)
    fc.constant([
      'knocked',
      'knocked',
      'standing',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Head pin + pin 5 (2 pins)
    fc.constant([
      'knocked',
      'standing',
      'standing',
      'standing',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Head pin + pin 3 + pin 6 (3 pins)
    fc.constant([
      'knocked',
      'standing',
      'knocked',
      'standing',
      'standing',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Pocket hit (1, 2, 3, 5) - 4 pins
    fc.constant([
      'knocked',
      'knocked',
      'knocked',
      'standing',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Brooklyn (1, 3, 5, 6) - 4 pins
    fc.constant([
      'knocked',
      'standing',
      'knocked',
      'standing',
      'knocked',
      'knocked',
      'standing',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // Left side (1, 2, 4, 7) - 4 pins
    fc.constant([
      'knocked',
      'knocked',
      'standing',
      'knocked',
      'standing',
      'standing',
      'knocked',
      'standing',
      'standing',
      'standing',
    ] as PinState[]),

    // 9 pins (leaving pin 10)
    fc.constant([
      'knocked',
      'knocked',
      'knocked',
      'knocked',
      'knocked',
      'knocked',
      'knocked',
      'knocked',
      'knocked',
      'standing',
    ] as PinState[])
  );
}

// Shared PinPhysics instance to avoid repeated instantiation overhead during test generation
const sharedPinPhysics = new PinPhysics();

/**
 * Generates physically valid second roll given first roll
 * Uses a curated set of common valid combinations to avoid exponential complexity
 */
function generateValidSecondRoll(firstRoll: PinState[]): fc.Arbitrary<PinState[]> {
  // Generate a list of valid second roll combinations
  const validCombinations: PinState[][] = [];
  
  // Get standing pins
  const standingPins: number[] = [];
  firstRoll.forEach((state, index) => {
    if (state === 'standing') {
      standingPins.push(index + 1);
    }
  });
  
  // Only add 'no additional pins knocked' if there are standing pins remaining
  // (if firstRoll was a strike, there are no standing pins to knock)
  if (standingPins.length > 0) {
    validCombinations.push(Array(10).fill('standing') as PinState[]);
  }
  
  // If 6 or fewer standing pins (excluding strikes with 0 standing), check all combinations.
  // 2^6 = 64 possible subsets keeps the O(2^n) enumeration small enough for tests;
  // for larger n we fall back to a curated set of common patterns to avoid explosion.
  if (standingPins.length > 0 && standingPins.length <= 6) {
    // Check all combinations for small sets
    for (let i = 1; i < Math.pow(2, standingPins.length); i++) {
      const secondRoll: PinState[] = Array(10).fill('standing') as PinState[];
      
      // Convert number to binary to represent which pins to knock
      for (let j = 0; j < standingPins.length; j++) {
        if ((i & (1 << j)) !== 0) {
          secondRoll[standingPins[j] - 1] = 'knocked';
        }
      }
      
      // Validate this combination
      const firstRollObj = { pins: firstRoll, pinsKnocked: firstRoll.filter(p => p === 'knocked').length };
      const result = sharedPinPhysics.validatePinCombination(secondRoll, firstRollObj);
      
      if (result.isValid) {
        validCombinations.push(secondRoll);
      }
    }
  } else {
    // For larger sets, try common patterns
    const patternsToTry: number[][] = [
      // Try knocking all remaining pins (spare)
      standingPins,
      // Try knocking individual pins
      ...standingPins.map(pin => [pin]),
      // Try knocking pairs (sample first few)
      ...standingPins.slice(0, 3).flatMap((p1, i) => 
        standingPins.slice(i + 1, i + 4).map(p2 => [p1, p2])
      ),
    ];
    
    for (const pinsToKnock of patternsToTry) {
      const secondRoll: PinState[] = Array(10).fill('standing') as PinState[];
      
      for (const pinNum of pinsToKnock) {
        secondRoll[pinNum - 1] = 'knocked';
      }
      
      // Validate this combination
      const firstRollObj = { pins: firstRoll, pinsKnocked: firstRoll.filter(p => p === 'knocked').length };
      const result = sharedPinPhysics.validatePinCombination(secondRoll, firstRollObj);
      
      if (result.isValid) {
        validCombinations.push(secondRoll);
      }
    }
  }
  
  // Return arbitrary from valid combinations
  if (validCombinations.length > 0) {
    return fc.constantFrom(...validCombinations);
  }
  
  // Fallback to no pins if no valid combinations found
  return fc.constant(Array(10).fill('standing') as PinState[]);
}

/**
 * Generates valid regular frame combinations (non-strike, non-spare)
 */
function generateValidRegularFrame(): fc.Arbitrary<
  readonly [PinState[], PinState[]]
> {
  return fc.oneof(
    // 1 pin first roll, 0 pins second roll
    fc.constant([
      [
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ] as PinState[],
      Array(10).fill('standing') as PinState[],
    ]),

    // 2 pins first roll, 0 pins second roll
    fc.constant([
      [
        'knocked',
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ] as PinState[],
      Array(10).fill('standing') as PinState[],
    ]),

    // 1 pin first roll, 1 pin second roll (different pins)
    fc.constant([
      [
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ] as PinState[],
      [
        'standing',
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ] as PinState[],
    ]),

    // 3 pins first roll, 2 pins second roll
    fc.constant([
      [
        'knocked',
        'knocked',
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ] as PinState[],
      [
        'standing',
        'standing',
        'standing',
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ] as PinState[],
    ])
  );
}

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

            // Spare frame needs next roll for bonus calculation.
            // In an incomplete game state (no next roll yet), spare frame score is just 10.
            const spareFrameScore = engine.calculateFrameScore(1);
            expect(spareFrameScore).toBe(10); // 10 + 0 (no next roll yet)

            // Now add a third frame to provide the next roll for the spare bonus.
            const bonusRollPins = 4;
            const thirdFrameRoll1: PinState[] = Array(10).fill('standing');
            for (let i = 0; i < bonusRollPins; i++) {
              thirdFrameRoll1[i] = 'knocked';
            }
            engine.recordRoll(2, 0, thirdFrameRoll1);

            // With the next roll recorded, the spare frame should now include the bonus.
            const spareFrameScoreWithBonus = engine.calculateFrameScore(1);
            expect(spareFrameScoreWithBonus).toBe(10 + bonusRollPins);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should calculate regular frame scores correctly', () => {
      fc.assert(
        fc.property(generateValidRegularFrame(), ([firstRoll, secondRoll]) => {
          // Arrange: Create a new game
          const engine = new GameEngine();
          engine.startNewGame('open');

          // Act: Record regular frame
          engine.recordRoll(0, 0, firstRoll);
          engine.recordRoll(0, 1, secondRoll);

          // Assert: Regular frame should score sum of both rolls
          const firstRollPins = firstRoll.filter(
            (pin) => pin === 'knocked'
          ).length;
          const secondRollPins = secondRoll.filter(
            (pin) => pin === 'knocked'
          ).length;
          const expectedScore = firstRollPins + secondRollPins;

          expect(engine.calculateFrameScore(0)).toBe(expectedScore);
        }),
        { numRuns: 50 }
      );
    });

    it('should calculate strike bonus correctly across multiple frames', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            generateValidFirstRoll(), // Next frame first roll
            generateValidFirstRoll(), // Third frame roll (used if next frame is strike)
            generateValidFirstRoll()  // Alternative for second roll (we'll validate it)
          ),
          ([nextFirstRoll, thirdFrameRoll, potentialSecondRoll]) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record strike in first frame
            const strike: PinState[] = Array(10).fill('knocked');
            engine.recordRoll(0, 0, strike);

            const nextFirstRollPins = nextFirstRoll.filter(p => p === 'knocked').length;

            // Record next frame based on whether first roll is a strike
            if (nextFirstRollPins === 10) {
              // Next frame is also a strike
              engine.recordRoll(1, 0, strike);

              // Need a third frame for complete bonus calculation
              engine.recordRoll(2, 0, thirdFrameRoll);

              const thirdRollPins = thirdFrameRoll.filter(p => p === 'knocked').length;

              // Assert: Strike + Strike + thirdRollPins
              const frameScore = engine.calculateFrameScore(0);
              expect(frameScore).toBe(10 + 10 + thirdRollPins);
            } else {
              // Next frame is not a strike - need valid second roll
              // Validate that potentialSecondRoll is valid for nextFirstRoll
              const firstRollObj = { pins: nextFirstRoll, pinsKnocked: nextFirstRollPins };
              const validation = sharedPinPhysics.validatePinCombination(potentialSecondRoll, firstRollObj);
              
              fc.pre(validation.isValid); // Skip this iteration if not valid
              
              const nextSecondRollPins = potentialSecondRoll.filter(p => p === 'knocked').length;

              engine.recordRoll(1, 0, nextFirstRoll);
              engine.recordRoll(1, 1, potentialSecondRoll);

              // Assert: Strike + nextFirstRollPins + nextSecondRollPins
              const frameScore = engine.calculateFrameScore(0);
              expect(frameScore).toBe(10 + nextFirstRollPins + nextSecondRollPins);
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
          fc.tuple(
            generateValidFirstRoll(), // First roll
            generateValidFirstRoll(), // Second roll (could be first roll if strike, or second roll if not)
            generateValidFirstRoll()  // Third roll if needed
          ),
          ([firstRoll, secondRollCandidate, thirdRollCandidate]) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record 10th frame based on first roll
            engine.recordRoll(9, 0, firstRoll);

            const roll1Pins = firstRoll.filter(p => p === 'knocked').length;
            let expectedScore = roll1Pins;

            if (roll1Pins === 10) {
              // Strike in 10th frame - need 2 more rolls
              engine.recordRoll(9, 1, secondRollCandidate);
              
              const roll2Pins = secondRollCandidate.filter(p => p === 'knocked').length;
              expectedScore += roll2Pins;

              // Third roll - validate it's appropriate for the second roll
              if (roll2Pins === 10) {
                // Second was also a strike, third can be any valid first roll
                engine.recordRoll(9, 2, thirdRollCandidate);
                const roll3Pins = thirdRollCandidate.filter(p => p === 'knocked').length;
                expectedScore += roll3Pins;
              } else {
                // Second was not a strike, third must be valid second roll
                const secondRollObj = { pins: secondRollCandidate, pinsKnocked: roll2Pins };
                const validation = sharedPinPhysics.validatePinCombination(thirdRollCandidate, secondRollObj);
                fc.pre(validation.isValid); // Skip if not valid
                
                engine.recordRoll(9, 2, thirdRollCandidate);
                const roll3Pins = thirdRollCandidate.filter(p => p === 'knocked').length;
                expectedScore += roll3Pins;
              }
            } else {
              // Not a strike - validate second roll
              const firstRollObj = { pins: firstRoll, pinsKnocked: roll1Pins };
              const validation = sharedPinPhysics.validatePinCombination(secondRollCandidate, firstRollObj);
              fc.pre(validation.isValid); // Skip if not valid
              
              engine.recordRoll(9, 1, secondRollCandidate);
              
              const roll2Pins = secondRollCandidate.filter(p => p === 'knocked').length;
              expectedScore += roll2Pins;

              if (roll1Pins + roll2Pins === 10) {
                // Spare - need third roll
                engine.recordRoll(9, 2, thirdRollCandidate);
                
                const roll3Pins = thirdRollCandidate.filter(p => p === 'knocked').length;
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
          // Generate valid pin states using physics rules
          generateValidFirstRoll(),
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
          // Generate valid first roll and candidate second roll
          fc.tuple(
            generateValidFirstRoll(),
            generateValidFirstRoll(), // Candidate for second roll
            fc.integer({ min: 0, max: 9 })
          ),
          ([firstPins, secondPinsCandidate, frameIndex]) => {
            // Arrange: Create a new game
            const engine = new GameEngine();
            engine.startNewGame('open');

            // Act: Record two rolls with valid physics
            engine.recordRoll(frameIndex, 0, firstPins);
            
            // Validate second roll is valid for first roll
            const firstRollPins = firstPins.filter(p => p === 'knocked').length;
            const firstRollObj = { pins: firstPins, pinsKnocked: firstRollPins };
            const validation = sharedPinPhysics.validatePinCombination(secondPinsCandidate, firstRollObj);
            fc.pre(validation.isValid); // Skip if not valid
            
            engine.recordRoll(frameIndex, 1, secondPinsCandidate);

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
            expect(secondRoll.pins).toEqual(secondPinsCandidate);
            const expectedSecondKnockedCount = secondPinsCandidate.filter(
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
          // Generate two valid pin states to test roll updates
          // This tests that the game engine correctly handles roll corrections/updates
          fc.tuple(
            generateValidFirstRoll(), // Initial pin selection
            generateValidFirstRoll(), // Updated pin selection
            fc.integer({ min: 0, max: 9 })
          ),
          ([initialPins, updatedPins, frameIndex]) => {
            // Arrange: Create a new game and record initial roll
            const engine = new GameEngine();
            engine.startNewGame('open');
            engine.recordRoll(frameIndex, 0, initialPins);

            // Act: Update the roll with new pin states (simulating user correction)
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
