// Game Engine Service - Core bowling game logic
// Implements game state management, frame tracking, and roll recording

import {
  GameEngineInterface,
  GameSession,
  GameMode,
  League,
  PinState,
  Frame,
  Roll,
} from '@/types';

export class GameEngine implements GameEngineInterface {
  private currentSession: GameSession | null = null;

  /**
   * Starts a new bowling game session
   * Initializes 10 empty frames with proper structure
   */
  startNewGame(mode: GameMode, league?: League): GameSession {
    const frames: Frame[] = [];

    // Initialize 10 frames
    for (let i = 0; i < 10; i++) {
      frames.push({
        frameNumber: i + 1,
        rolls: [],
        isStrike: false,
        isSpare: false,
      });
    }

    this.currentSession = {
      id: this.generateSessionId(),
      mode,
      league,
      frames,
      startTime: new Date(),
    };

    return this.currentSession;
  }

  /**
   * Records a roll in the specified frame
   * Updates pin states and calculates pins knocked down
   */
  recordRoll(frameIndex: number, rollIndex: number, pins: PinState[]): void {
    if (!this.currentSession) {
      throw new Error('No active game session');
    }

    if (frameIndex < 0 || frameIndex >= 10) {
      throw new Error('Invalid frame index');
    }

    const frame = this.currentSession.frames[frameIndex];

    // Count knocked pins
    const pinsKnocked = pins.filter((pin) => pin === 'knocked').length;

    // Create roll object
    const roll: Roll = {
      pins: [...pins],
      pinsKnocked,
    };

    // Add roll to frame
    if (rollIndex === frame.rolls.length) {
      // Sequential roll - push to array
      frame.rolls.push(roll);
    } else if (rollIndex < frame.rolls.length) {
      // Updating existing roll
      frame.rolls[rollIndex] = roll;
    } else {
      // Out of order - rollIndex > frame.rolls.length
      throw new Error(
        `Invalid roll index ${rollIndex} for frame with ${frame.rolls.length} rolls. Rolls must be recorded sequentially.`
      );
    }

    // Update frame flags for strikes and spares (frames 1-9)
    if (frameIndex < 9) {
      if (rollIndex === 0 && pinsKnocked === 10) {
        frame.isStrike = true;
      } else if (rollIndex === 1) {
        const firstRollPins = frame.rolls[0]?.pinsKnocked || 0;
        if (firstRollPins + pinsKnocked === 10) {
          frame.isSpare = true;
        }
      }
    }
    // 10th frame has special rules - strikes and spares handled differently
    else {
      // In 10th frame, check for strike on first roll
      if (rollIndex === 0 && pinsKnocked === 10) {
        frame.isStrike = true;
      }
      // Check for spare on second roll (if first wasn't a strike)
      else if (rollIndex === 1 && !frame.isStrike) {
        const firstRollPins = frame.rolls[0]?.pinsKnocked || 0;
        if (firstRollPins + pinsKnocked === 10) {
          frame.isSpare = true;
        }
      }
    }
  }

  /**
   * Calculates the score for a specific frame
   * Note: Full scoring logic with strikes/spares will be implemented in task 2.3
   */
  calculateFrameScore(frameIndex: number): number {
    // Placeholder - full implementation in task 2.3
    throw new Error('Not implemented yet - will be added in task 2.3');
  }

  /**
   * Calculates the total score for the game
   * Note: Full scoring logic will be implemented in task 2.3
   */
  calculateTotalScore(): number {
    // Placeholder - full implementation in task 2.3
    throw new Error('Not implemented yet - will be added in task 2.3');
  }

  /**
   * Checks if the game is complete
   * A game is complete when all required rolls in frame 10 are done
   */
  isGameComplete(): boolean {
    if (!this.currentSession) {
      return false;
    }

    const frame10 = this.currentSession.frames[9];

    // Frame 10 requires different number of rolls based on strikes/spares
    if (frame10.rolls.length === 0) {
      return false;
    }

    const firstRoll = frame10.rolls[0];

    // If first roll is a strike, need 3 total rolls
    if (firstRoll.pinsKnocked === 10) {
      return frame10.rolls.length === 3;
    }

    // If we have 2 rolls, check if it's a spare
    if (frame10.rolls.length >= 2) {
      const secondRoll = frame10.rolls[1];
      const totalPins = firstRoll.pinsKnocked + secondRoll.pinsKnocked;

      // If spare, need 3 rolls total
      if (totalPins === 10) {
        return frame10.rolls.length === 3;
      }

      // No strike or spare, 2 rolls is complete
      return true;
    }

    return false;
  }

  /**
   * Gets the current game session
   */
  getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
