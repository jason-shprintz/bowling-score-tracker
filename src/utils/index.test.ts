// Basic tests for utility functions

import {
  generateId,
  countKnockedPins,
  createStandingPins,
  calculatePercentage,
} from './index';
import { PinState } from '../types';

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });

  describe('countKnockedPins', () => {
    it('should count knocked pins correctly', () => {
      const pins: PinState[] = [
        'knocked',
        'standing',
        'knocked',
        'standing',
        'knocked',
        'standing',
        'standing',
        'standing',
        'standing',
        'standing',
      ];
      expect(countKnockedPins(pins)).toBe(3);
    });

    it('should return 0 for all standing pins', () => {
      const pins: PinState[] = createStandingPins();
      expect(countKnockedPins(pins)).toBe(0);
    });
  });

  describe('createStandingPins', () => {
    it('should create 10 standing pins', () => {
      const pins = createStandingPins();
      expect(pins.length).toBe(10);
      expect(pins.every((pin) => pin === 'standing')).toBe(true);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(1, 3)).toBe(33.33);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });
});
