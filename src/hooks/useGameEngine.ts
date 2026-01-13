// Game Engine Hook - React hook for game state management
// This will be implemented in task 9.1

import { useState } from 'react';
import { GameSession, GameMode, League } from '@/types';

export const useGameEngine = () => {
  const [currentGame, _setCurrentGame] = useState<GameSession | null>(null);
  const [isLoading, _setIsLoading] = useState(false);

  // Implementation will be added in task 9.1
  const startNewGame = (mode: GameMode, league?: League) => {
    throw new Error('Not implemented yet');
  };

  const recordRoll = (
    frameIndex: number,
    rollIndex: number,
    pins: number[]
  ) => {
    throw new Error('Not implemented yet');
  };

  return {
    currentGame,
    isLoading,
    startNewGame,
    recordRoll,
  };
};
