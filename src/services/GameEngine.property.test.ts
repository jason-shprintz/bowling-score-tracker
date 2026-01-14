// Property-Based Tests for GameEngine
// Feature: bowling-score-tracker, Property 3: Pin State Consistency
// Validates: Requirements 2.2

import { GameEngine } from './GameEngine';
import { PinState } from '@/types';
import * as fc from 'fast-check';

describe('GameEngine - Property-Based Tests', () => {
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
