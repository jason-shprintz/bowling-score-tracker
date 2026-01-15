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

    if (rollIndex < 0) {
      throw new Error('Invalid roll index: must be non-negative');
    }

    if (pins.length !== 10) {
      throw new Error('Invalid pins array: must contain exactly 10 elements');
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
      const rollCount = frame.rolls.length;
      const rollWord = rollCount === 1 ? 'roll' : 'rolls';
      throw new Error(
        `Invalid roll index ${rollIndex} for frame with ${rollCount} ${rollWord}. Rolls must be recorded sequentially.`
      );
    }

    // Reset and recalculate frame flags for strikes and spares
    frame.isStrike = false;
    frame.isSpare = false;

    // Update frame flags for strikes and spares (frames 1-9)
    if (frameIndex < 9) {
      if (frame.rolls.length > 0 && frame.rolls[0].pinsKnocked === 10) {
        frame.isStrike = true;
      } else if (frame.rolls.length >= 2) {
        const firstRollPins = frame.rolls[0]?.pinsKnocked || 0;
        const secondRollPins = frame.rolls[1]?.pinsKnocked || 0;
        if (firstRollPins + secondRollPins === 10) {
          frame.isSpare = true;
        }
      }
    }
    // 10th frame has special rules - strikes and spares handled differently
    else {
      // In 10th frame, check for strike on first roll
      if (frame.rolls.length > 0 && frame.rolls[0].pinsKnocked === 10) {
        frame.isStrike = true;
      }
      // Check for spare on second roll (if first wasn't a strike)
      else if (frame.rolls.length >= 2 && !frame.isStrike) {
        const firstRollPins = frame.rolls[0]?.pinsKnocked || 0;
        const secondRollPins = frame.rolls[1]?.pinsKnocked || 0;
        if (firstRollPins + secondRollPins === 10) {
          frame.isSpare = true;
        }
      }
    }
  }

  /**
   * Calculates the score for a specific frame
   * Implements bowling scoring rules including strikes, spares, and 10th frame special rules
   */
  calculateFrameScore(frameIndex: number): number {
    if (!this.currentSession) {
      throw new Error('No active game session');
    }

    if (frameIndex < 0 || frameIndex >= 10) {
      throw new Error('Invalid frame index');
    }

    const frame = this.currentSession.frames[frameIndex];

    // Frame 10 has special scoring rules
    if (frameIndex === 9) {
      return this.calculateFrame10Score(frame);
    }

    // Frames 1-9 follow standard bowling rules
    return this.calculateStandardFrameScore(frameIndex, frame);
  }

  /**
   * Calculates the total score for the game
   * Sums all frame scores according to bowling rules
   */
  calculateTotalScore(): number {
    if (!this.currentSession) {
      throw new Error('No active game session');
    }

    let totalScore = 0;

    for (let i = 0; i < 10; i++) {
      totalScore += this.calculateFrameScore(i);
    }

    return totalScore;
  }

  /**
   * Calculates score for frames 1-9 (standard frames)
   * Handles strikes, spares, and regular scoring with bonus calculations
   */
  private calculateStandardFrameScore(
    frameIndex: number,
    frame: Frame
  ): number {
    if (frame.rolls.length === 0) {
      return 0;
    }

    const firstRoll = frame.rolls[0];

    // Strike: 10 + next two rolls
    if (firstRoll.pinsKnocked === 10) {
      return 10 + this.getNextTwoRollsBonus(frameIndex);
    }

    // Need at least 2 rolls for spare or regular scoring
    if (frame.rolls.length < 2) {
      return firstRoll.pinsKnocked;
    }

    const secondRoll = frame.rolls[1];
    const frameTotal = firstRoll.pinsKnocked + secondRoll.pinsKnocked;

    // Spare: 10 + next one roll
    if (frameTotal === 10) {
      return 10 + this.getNextOneRollBonus(frameIndex);
    }

    // Regular frame: just the pins knocked down
    return frameTotal;
  }

  /**
   * Calculates score for frame 10 (special rules)
   * Frame 10 allows up to 3 rolls if strikes or spares occur
   */
  private calculateFrame10Score(frame: Frame): number {
    if (frame.rolls.length === 0) {
      return 0;
    }

    let score = 0;

    // Add all rolls in frame 10 (no bonus calculations needed)
    for (const roll of frame.rolls) {
      score += roll.pinsKnocked;
    }

    return score;
  }

  /**
   * Gets bonus from next two rolls for strike scoring
   * Handles cross-frame bonus calculations
   */
  private getNextTwoRollsBonus(frameIndex: number): number {
    if (frameIndex >= 9) {
      return 0; // No bonus for frame 10
    }

    const nextFrame = this.currentSession!.frames[frameIndex + 1];

    if (nextFrame.rolls.length === 0) {
      return 0; // No rolls recorded yet
    }

    const firstNextRoll = nextFrame.rolls[0];

    // If next frame is a strike, need to look at frame after that
    if (firstNextRoll.pinsKnocked === 10) {
      let bonus = 10;

      // If we're at frame 8 (index 7), next frame is 9 (index 8)
      // Need to get second roll from frame 9 or frame 10
      if (frameIndex === 8) {
        // Next frame is frame 9, look at frame 10 for second bonus roll
        const frame10 = this.currentSession!.frames[9];
        if (frame10.rolls.length > 0) {
          bonus += frame10.rolls[0].pinsKnocked;
        }
      } else {
        // Look at frame after next for second roll
        const frameAfterNext = this.currentSession!.frames[frameIndex + 2];
        if (frameAfterNext.rolls.length > 0) {
          bonus += frameAfterNext.rolls[0].pinsKnocked;
        }
      }

      return bonus;
    }

    // Next frame is not a strike, get both rolls from next frame
    let bonus = firstNextRoll.pinsKnocked;

    if (nextFrame.rolls.length > 1) {
      bonus += nextFrame.rolls[1].pinsKnocked;
    }

    return bonus;
  }

  /**
   * Gets bonus from next one roll for spare scoring
   * Used for spare bonus calculations
   */
  private getNextOneRollBonus(frameIndex: number): number {
    if (frameIndex >= 9) {
      return 0; // No bonus for frame 10
    }

    const nextFrame = this.currentSession!.frames[frameIndex + 1];

    if (nextFrame.rolls.length === 0) {
      return 0; // No rolls recorded yet
    }

    return nextFrame.rolls[0].pinsKnocked;
  }

  /**
   * Validates that the current game state is consistent with bowling rules
   * Checks for impossible pin combinations and scoring violations
   */
  validateGameState(): { isValid: boolean; errors: string[] } {
    if (!this.currentSession) {
      return { isValid: false, errors: ['No active game session'] };
    }

    const errors: string[] = [];

    for (let frameIndex = 0; frameIndex < 10; frameIndex++) {
      const frame = this.currentSession.frames[frameIndex];
      const frameErrors = this.validateFrame(frameIndex, frame);
      errors.push(...frameErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a single frame for bowling rule compliance
   */
  private validateFrame(frameIndex: number, frame: Frame): string[] {
    const errors: string[] = [];

    if (frame.rolls.length === 0) {
      return errors; // Empty frame is valid (game in progress)
    }

    // Frame 10 has special validation rules
    if (frameIndex === 9) {
      return this.validateFrame10(frame);
    }

    // Frames 1-9 validation
    if (frame.rolls.length > 2) {
      errors.push(
        `Frame ${frameIndex + 1} has too many rolls: ${frame.rolls.length}`
      );
    }

    const firstRoll = frame.rolls[0];

    // Validate first roll
    if (firstRoll.pinsKnocked < 0 || firstRoll.pinsKnocked > 10) {
      errors.push(
        `Frame ${frameIndex + 1}, roll 1: Invalid pin count ${firstRoll.pinsKnocked}`
      );
    }

    // If strike, should only have one roll
    if (firstRoll.pinsKnocked === 10 && frame.rolls.length > 1) {
      errors.push(`Frame ${frameIndex + 1}: Strike should only have one roll`);
    }

    // If not strike, validate second roll
    if (firstRoll.pinsKnocked < 10 && frame.rolls.length > 1) {
      const secondRoll = frame.rolls[1];

      if (secondRoll.pinsKnocked < 0 || secondRoll.pinsKnocked > 10) {
        errors.push(
          `Frame ${frameIndex + 1}, roll 2: Invalid pin count ${secondRoll.pinsKnocked}`
        );
      }

      const totalPins = firstRoll.pinsKnocked + secondRoll.pinsKnocked;
      if (totalPins > 10) {
        errors.push(
          `Frame ${frameIndex + 1}: Total pins ${totalPins} exceeds 10`
        );
      }
    }

    return errors;
  }

  /**
   * Validates frame 10 with special rules for strikes and spares
   */
  private validateFrame10(frame: Frame): string[] {
    const errors: string[] = [];

    if (frame.rolls.length > 3) {
      errors.push(`Frame 10 has too many rolls: ${frame.rolls.length}`);
      return errors;
    }

    for (let i = 0; i < frame.rolls.length; i++) {
      const roll = frame.rolls[i];
      if (roll.pinsKnocked < 0 || roll.pinsKnocked > 10) {
        errors.push(
          `Frame 10, roll ${i + 1}: Invalid pin count ${roll.pinsKnocked}`
        );
      }
    }

    if (frame.rolls.length >= 2) {
      const firstRoll = frame.rolls[0];
      const secondRoll = frame.rolls[1];

      // If first roll is not a strike, first two rolls can't exceed 10
      if (firstRoll.pinsKnocked < 10) {
        const totalFirstTwo = firstRoll.pinsKnocked + secondRoll.pinsKnocked;
        if (totalFirstTwo > 10) {
          errors.push(
            `Frame 10: First two rolls total ${totalFirstTwo} exceeds 10`
          );
        }
      }
    }

    return errors;
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
