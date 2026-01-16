// Game Mode Selector Component - League vs Open bowling selection
// This will be implemented in task 8.1

import React from 'react';
import { View, Text } from 'react-native';
import { GameMode, League } from '../types';

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode, league?: League) => void;
  availableLeagues: League[];
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  onModeSelect,
  availableLeagues,
}) => {
  // Implementation will be added in task 8.1
  return (
    <View>
      <Text>Game Mode Selector - To be implemented</Text>
    </View>
  );
};
