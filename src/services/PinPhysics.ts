// Pin Physics Validation Service
// Implements physically possible pin combination checking for bowling

import { PinState, Roll, ValidationResult } from '@/types';

/**
 * Pin layout in standard 10-pin bowling:
 *     7  8  9  10
 *      4  5  6
 *       2  3
 *        1
 *
 * Pin dependencies based on physics:
 * - Pin 7 requires pin 4 to be knocked down
 * - Pin 8 requires pin 5 to be knocked down
 * - Pin 9 requires pin 6 to be knocked down
 * - Pin 10 requires pin 6 to be knocked down
 * - Pin 4 requires pin 2 or pin 1 to be knocked down
 * - Pin 6 requires pin 3 or pin 1 to be knocked down
 * - Pin 5 can be knocked down independently if pin 1 is down
 */

export interface PinPhysicsInterface {
  validatePinCombination(
    pins: PinState[],
    previousRoll?: Roll
  ): ValidationResult;
  isPhysicallyPossible(pins: PinState[]): boolean;
  getInvalidPins(pins: PinState[], previousRoll?: Roll): number[];
}

export class PinPhysics implements PinPhysicsInterface {
  // Pin dependency map - each pin maps to pins that must be knocked for it to be physically possible
  private readonly PIN_DEPENDENCIES: Map<number, number[][]> = new Map([
    [1, []], // Head pin - always accessible
    [2, [[1]]], // Can be knocked if pin 1 is down
    [3, [[1]]], // Can be knocked if pin 1 is down
    [4, [[1], [2]]], // Can be knocked if pin 1 OR pin 2 is down
    [5, [[1]]], // Can be knocked if pin 1 is down
    [6, [[1], [3]]], // Can be knocked if pin 1 OR pin 3 is down
    [7, [[4]]], // Can only be knocked if pin 4 is down
    [8, [[5]]], // Can only be knocked if pin 5 is down
    [9, [[6]]], // Can only be knocked if pin 6 is down
    [10, [[6]]], // Can only be knocked if pin 6 is down
  ]);

  /**
   * Validates a pin combination considering previous roll state
   */
  validatePinCombination(
    pins: PinState[],
    previousRoll?: Roll
  ): ValidationResult {
    const errors: string[] = [];
    const invalidPins: number[] = [];

    // Basic validation
    if (pins.length !== 10) {
      return {
        isValid: false,
        errors: ['Pin array must contain exactly 10 elements'],
        invalidPins: [],
      };
    }

    // Get the effective starting state (considering previous roll)
    const startingPins = this.getStartingPinState(previousRoll);

    // Validate that we're only knocking down standing pins
    for (let i = 0; i < 10; i++) {
      if (pins[i] === 'knocked' && startingPins[i] === 'knocked') {
        errors.push(`Pin ${i + 1} was already knocked down in previous roll`);
        invalidPins.push(i + 1);
      }
    }

    // Create combined state (previous + current)
    const combinedState = this.combinePinStates(startingPins, pins);

    // Validate physics of the combined state
    const physicsResult = this.validatePhysics(combinedState);
    errors.push(...physicsResult.errors);
    invalidPins.push(...physicsResult.invalidPins);

    return {
      isValid: errors.length === 0,
      errors,
      invalidPins: [...new Set(invalidPins)], // Remove duplicates
    };
  }

  /**
   * Checks if a pin combination is physically possible (ignoring previous rolls)
   */
  isPhysicallyPossible(pins: PinState[]): boolean {
    if (pins.length !== 10) {
      return false;
    }

    const result = this.validatePhysics(pins);
    return result.isValid;
  }

  /**
   * Returns array of pin numbers that are invalid in the given combination
   */
  getInvalidPins(pins: PinState[], previousRoll?: Roll): number[] {
    const result = this.validatePinCombination(pins, previousRoll);
    return result.invalidPins;
  }

  /**
   * Validates the physics of a pin state
   */
  private validatePhysics(pins: PinState[]): ValidationResult {
    const errors: string[] = [];
    const invalidPins: number[] = [];

    // Check each knocked pin for physics violations
    for (let i = 0; i < 10; i++) {
      if (pins[i] === 'knocked') {
        const pinNumber = i + 1;
        const dependencies = this.PIN_DEPENDENCIES.get(pinNumber) || [];

        // Check if any dependency group is satisfied
        let hasValidPath = false;

        for (const dependencyGroup of dependencies) {
          // Check if all pins in this dependency group are knocked
          const groupSatisfied = dependencyGroup.every(
            (depPin) => pins[depPin - 1] === 'knocked'
          );

          if (groupSatisfied) {
            hasValidPath = true;
            break;
          }
        }

        // If no dependency groups are satisfied and pin has dependencies, it's invalid
        if (!hasValidPath && dependencies.length > 0) {
          const dependencyText = dependencies
            .map((group) =>
              group.length === 1 ? `${group[0]}` : `(${group.join(' and ')})`
            )
            .join(' or ');

          errors.push(
            `Pin ${pinNumber} cannot be knocked down without first knocking down pin ${dependencyText}`
          );
          invalidPins.push(pinNumber);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      invalidPins,
    };
  }

  /**
   * Gets the starting pin state based on previous roll
   */
  private getStartingPinState(previousRoll?: Roll): PinState[] {
    if (!previousRoll) {
      // No previous roll - all pins standing
      return new Array(10).fill('standing') as PinState[];
    }

    return [...previousRoll.pins];
  }

  /**
   * Combines previous pin state with current roll
   */
  private combinePinStates(
    startingPins: PinState[],
    currentRoll: PinState[]
  ): PinState[] {
    const combined: PinState[] = [];

    for (let i = 0; i < 10; i++) {
      // If pin was already knocked or is knocked in current roll, it's knocked
      combined[i] =
        startingPins[i] === 'knocked' || currentRoll[i] === 'knocked'
          ? 'knocked'
          : 'standing';
    }

    return combined;
  }

  /**
   * Gets a human-readable description of pin layout
   */
  static getPinLayoutDescription(): string {
    return `
Pin layout (standard 10-pin bowling):
    7  8  9  10
     4  5  6
      2  3
       1

Pin dependencies:
- Pin 1: Always accessible (head pin)
- Pin 2, 3: Require pin 1
- Pin 4: Requires pin 1 or pin 2
- Pin 5: Requires pin 1
- Pin 6: Requires pin 1 or pin 3
- Pin 7: Requires pin 4
- Pin 8: Requires pin 5
- Pin 9: Requires pin 6
- Pin 10: Requires pin 6
    `.trim();
  }
}
