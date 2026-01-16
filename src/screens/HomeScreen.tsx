// Home Screen - Main navigation and game mode selection
// This will be implemented in task 8.1

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const HomeScreen: React.FC = () => {
  // Implementation will be added in task 8.1
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bowling Score Tracker</Text>
      <Text>Home Screen - To be implemented</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
