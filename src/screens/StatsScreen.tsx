// Stats Screen - Performance statistics and analytics
// This will be implemented in task 8.4

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const StatsScreen: React.FC = () => {
  // Implementation will be added in task 8.4
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Statistics</Text>
      <Text>Stats Screen - To be implemented</Text>
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
