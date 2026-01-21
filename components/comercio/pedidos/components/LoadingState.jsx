import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';

const LoadingState = () => {
  return (
    <Surface style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF6F00" />
      <Text variant="bodyMedium" style={styles.loadingText}>
        Cargando pedidos...
      </Text>
    </Surface>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    color: '#616161',
  },
});

export default LoadingState;
