import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import CardPedidoComercio from './CardPedidoComercio';
import {
  PedidosAsignadosComercioCollection,
  VentasComercioCollection,
} from '../../collections/collections';

const HomePedidosComercio = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);

  // Suscripciones y queries reactivas
  const { pedidosConVentas, ready } = useTracker(() => {
    const user = Meteor.user();
    if (!user) return { pedidosConVentas: [], ready: false };

    // Suscribirse a pedidos asignados al usuario actual
    const pedidosHandle = Meteor.subscribe('pedidosAsignados', {
      userId: user._id,
      entregado: false,
    });

    // Suscribirse a ventas de comercio
    const ventasHandle = Meteor.subscribe('ventasComercio');

    const isReady = pedidosHandle.ready() && ventasHandle.ready();

    if (!isReady) {
      return { pedidosConVentas: [], ready: false };
    }

    // Obtener pedidos no entregados del cadete actual
    const pedidos = PedidosAsignadosComercioCollection.find({
      userId: user._id,
      entregado: false,
    }).fetch();

    // Enriquecer cada pedido con su venta correspondiente
    const pedidosConVentas = pedidos
      .map((pedido) => {
        const venta = VentasComercioCollection.findOne(pedido.idVentas);
        return venta ? { ...pedido, venta } : null;
      })
      .filter(Boolean); // Filtrar pedidos sin venta (datos inconsistentes)

    return { pedidosConVentas, ready: true };
  });

  const onRefresh = () => {
    setRefreshing(true);
    
    // Refrescar suscripciones
    Meteor.call('comercio.pedidos.getPedidosCadete', 
      { cadeteId: Meteor.userId() }, 
      (error, result) => {
        setRefreshing(false);
        if (error) {
          console.error('[HomePedidosComercio] Error al refrescar:', error);
          Alert.alert('Error', 'No se pudo refrescar los pedidos');
        } else {
          console.log('[HomePedidosComercio] Pedidos refrescados:', result?.length || 0);
        }
      }
    );
  };

  // Loading state mientras carga datos
  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Cargando pedidos...
        </Text>
      </View>
    );
  }

  // Empty state cuando no hay pedidos
  if (pedidosConVentas.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Surface style={styles.emptyCard} elevation={2}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            📦 No tienes pedidos asignados
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            Cuando te asignen un pedido, aparecerá aquí.
          </Text>
        </Surface>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <Text variant="titleLarge" style={styles.header}>
        Mis Pedidos Activos ({pedidosConVentas.length})
      </Text>
      {pedidosConVentas.map((item) => (
        <CardPedidoComercio
          key={item._id}
          pedido={item}
          venta={item.venta}
          navigation={navigation}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#666',
  },
  header: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
});

export default HomePedidosComercio;
