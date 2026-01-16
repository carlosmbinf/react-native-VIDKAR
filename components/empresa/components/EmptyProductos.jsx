import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar } from 'react-native-paper';

const EmptyProductos = () => {
  return (
    <View style={styles.container}>
      <Avatar.Icon size={80} icon="cart-off" style={styles.icon} />
      <Text variant="titleLarge" style={styles.title}>
        No hay productos
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Agrega productos a tu tienda
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    backgroundColor: '#E1BEE7',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    color: '#757575',
    textAlign: 'center',
  },
});

export default EmptyProductos;
