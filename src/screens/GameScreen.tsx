// Game Screen - Active bowling game interface
// This will be implemented in task 8.2 and 8.3

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const GameScreen: React.FC = () => {
  // Implementation will be added in task 8.2 and 8.3
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Game</Text>
      <Text>Game Screen - To be implemented</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
