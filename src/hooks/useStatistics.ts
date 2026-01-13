// Statistics Hook - React hook for performance analytics
// This will be implemented in task 5.1

import { useState, useEffect } from 'react';
import { BowlingStats, GameSession } from '@/types';

export const useStatistics = (games: GameSession[]) => {
  const [stats, _setStats] = useState<BowlingStats | null>(null);
  const [isLoading, _setIsLoading] = useState(false);

  // Implementation will be added in task 5.1
  useEffect(() => {
    // Statistics calculation logic will be implemented
  }, [games]);

  return {
    stats,
    isLoading,
  };
};
