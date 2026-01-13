// Score Card Component - Game progress display
// This will be implemented in task 8.3

import React from "react";
import { View, Text } from "react-native";
import { GameSession } from "@/types";

interface ScoreCardProps {
  gameSession: GameSession;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ gameSession }) => {
  // Implementation will be added in task 8.3
  return (
    <View>
      <Text>Score Card - To be implemented</Text>
    </View>
  );
};
