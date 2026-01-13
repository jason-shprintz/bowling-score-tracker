// Utility functions for the Bowling Score Tracker

import { PinState, Roll } from "@/types";
import { BOWLING_CONSTANTS } from "./constants";

/**
 * Generates a unique ID using timestamp and random number
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates if a pin selection is physically possible
 */
export const isValidPinSelection = (
  pins: PinState[],
  previousRoll?: Roll,
): boolean => {
  const knockedPins = pins
    .map((pin, index) => (pin === "knocked" ? index + 1 : null))
    .filter(Boolean) as number[];

  // If this is the second roll, check that we're not knocking down already knocked pins
  if (previousRoll) {
    const previouslyKnocked = previousRoll.pins
      .map((pin, index) => (pin === "knocked" ? index + 1 : null))
      .filter(Boolean) as number[];
    const overlap = knockedPins.some((pin) => previouslyKnocked.includes(pin));
    if (overlap) return false;
  }

  // Basic physics validation - simplified for now
  // In a real implementation, this would check for impossible pin combinations
  return knockedPins.length <= BOWLING_CONSTANTS.TOTAL_PINS;
};

/**
 * Counts the number of knocked pins
 */
export const countKnockedPins = (pins: PinState[]): number => {
  return pins.filter((pin) => pin === "knocked").length;
};

/**
 * Creates an array of standing pins
 */
export const createStandingPins = (): PinState[] => {
  return new Array(BOWLING_CONSTANTS.TOTAL_PINS).fill("standing") as PinState[];
};

/**
 * Formats a date to a readable string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a date and time to a readable string
 */
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Calculates the percentage with proper rounding
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
};
