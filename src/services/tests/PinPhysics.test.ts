// Pin Physics Validation Tests
// Tests for physically possible pin combination checking

import { PinPhysics } from '../PinPhysics';
import { PinState, Roll } from '../../types';

describe('PinPhysics', () => {
  let pinPhysics: PinPhysics;

  beforeEach(() => {
    pinPhysics = new PinPhysics();
  });

  describe('validatePinCombination', () => {
    it('should validate all pins standing as valid', () => {
      const pins: PinState[] = new Array(10).fill('standing') as PinState[];
      const result = pinPhysics.validatePinCombination(pins);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.invalidPins).toHaveLength(0);
    });

    it('should validate strike (all pins knocked) as valid', () => {
      const pins: PinState[] = new Array(10).fill('knocked') as PinState[];
      const result = pinPhysics.validatePinCombination(pins);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.invalidPins).toHaveLength(0);
    });

    it('should validate head pin only as valid', () => {
      const pins: PinState[] = new Array(10).fill('standing') as PinState[];
      pins[0] = 'knocked'; // Pin 1 (head pin)

      const result = pinPhysics.validatePinCombination(pins);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.invalidPins).toHaveLength(0);
    });

    it('should validate pin 7 without pin 4 as invalid', () => {
      const pins: PinState[] = new Array(10).fill('standing') as PinState[];
      pins[6] = 'knocked'; // Pin 7 without pin 4

      const result = pinPhysics.validatePinCombination(pins);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Pin 7 cannot be knocked down without first knocking down pin 4'
      );
      expect(result.invalidPins).toContain(7);
    });

    it('should validate pin 10 without pin 6 as invalid', () => {
      const pins: PinState[] = new Array(10).fill('standing') as PinState[];
      pins[9] = 'knocked'; // Pin 10 without pin 6

      const result = pinPhysics.validatePinCombination(pins);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Pin 10 cannot be knocked down without first knocking down pin 6'
      );
      expect(result.invalidPins).toContain(10);
    });

    it('should validate valid pin combination with dependencies', () => {
      const pins: PinState[] = new Array(10).fill('standing') as PinState[];
      pins[0] = 'knocked'; // Pin 1
      pins[3] = 'knocked'; // Pin 4 (depends on pin 1)
      pins[6] = 'knocked'; // Pin 7 (depends on pin 4)

      const result = pinPhysics.validatePinCombination(pins);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.invalidPins).toHaveLength(0);
    });

    it('should handle second roll validation correctly', () => {
      // First roll: knock down pins 1, 2, 3
      const firstRoll: Roll = {
        pins: [
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
        ],
        pinsKnocked: 3,
      };

      // Second roll: try to knock down pin 4 (valid since pin 1 is already down)
      const secondRollPins: PinState[] = [
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
      ];

      const result = pinPhysics.validatePinCombination(
        secondRollPins,
        firstRoll
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.invalidPins).toHaveLength(0);
    });

    it('should reject knocking already knocked pins', () => {
      // First roll: knock down pin 1
      const firstRoll: Roll = {
        pins: [
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
        ],
        pinsKnocked: 1,
      };

      // Second roll: try to knock down pin 1 again
      const secondRollPins: PinState[] = [
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
      ];

      const result = pinPhysics.validatePinCombination(
        secondRollPins,
        firstRoll
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Pin 1 was already knocked down in previous roll'
      );
      expect(result.invalidPins).toContain(1);
    });
  });

  describe('isPhysicallyPossible', () => {
    it('should return true for physically possible combinations', () => {
      const pins: PinState[] = [
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
      ];
      expect(pinPhysics.isPhysicallyPossible(pins)).toBe(true);
    });

    it('should return false for physically impossible combinations', () => {
      const pins: PinState[] = [
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'knocked',
        'standing',
        'standing',
        'standing',
      ];
      expect(pinPhysics.isPhysicallyPossible(pins)).toBe(false);
    });
  });

  describe('getInvalidPins', () => {
    it('should return empty array for valid combinations', () => {
      const pins: PinState[] = [
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
      ];
      const invalidPins = pinPhysics.getInvalidPins(pins);
      expect(invalidPins).toHaveLength(0);
    });

    it('should return invalid pin numbers', () => {
      const pins: PinState[] = [
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
        'knocked',
        'standing',
        'standing',
        'standing',
      ];
      const invalidPins = pinPhysics.getInvalidPins(pins);
      expect(invalidPins).toContain(7);
    });
  });

  describe('pin layout description', () => {
    it('should provide human-readable pin layout description', () => {
      const description = PinPhysics.getPinLayoutDescription();
      expect(description).toContain('Pin layout');
      expect(description).toContain('Pin 1: Always accessible');
      expect(description).toContain('Pin 7: Requires pin 4');
    });
  });
});
