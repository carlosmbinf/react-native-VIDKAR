import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const EmptyState = () => {
  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="cart-off" size={64} color="#BDBDBD" />
      <Text variant="titleLarge" style={styles.emptyTitle}>
        No tienes pedidos
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Tus pedidos de comercios aparecerán aquí
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F5F5',
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#757575',
    textAlign: 'center',
  },
});

export default EmptyState;
