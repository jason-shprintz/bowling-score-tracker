// Game Engine Service - Core bowling game logic
// This will be implemented in task 2.1

import {
  GameEngineInterface,
  GameSession,
  GameMode,
  League,
  PinState,
} from "@/types";

export class GameEngine implements GameEngineInterface {
  private currentSession: GameSession | null = null;

  startNewGame(mode: GameMode, league?: League): GameSession {
    // Implementation will be added in task 2.1
    throw new Error("Not implemented yet");
  }

  recordRoll(frameIndex: number, rollIndex: number, pins: PinState[]): void {
    // Implementation will be added in task 2.1
    throw new Error("Not implemented yet");
  }

  calculateFrameScore(frameIndex: number): number {
    // Implementation will be added in task 2.3
    throw new Error("Not implemented yet");
  }

  calculateTotalScore(): number {
    // Implementation will be added in task 2.3
    throw new Error("Not implemented yet");
  }

  isGameComplete(): boolean {
    // Implementation will be added in task 2.1
    throw new Error("Not implemented yet");
  }
}
