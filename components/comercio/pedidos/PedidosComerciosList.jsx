import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Surface, Appbar } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection } from '../../collections/collections';

// ✅ IMPORTAR componentes refactorizados
import PedidoCard from './components/PedidoCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import MenuHeader from '../../Header/MenuHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Componente principal: Lista de pedidos de comercios del usuario
 */
const PedidosComerciosList = ({navigation}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVentas, setExpandedVentas] = useState({});

  // Suscripción a ventas
  const { ventas, ready } = useTracker(() => {
    const userId = Meteor.userId();
    const sub = Meteor.subscribe('ventasRecharge', { userId: userId,"producto.carritos.type": 'COMERCIO' });
    
    const ventas = VentasRechargeCollection.find(
      { 
        userId: userId,
        "producto.carritos.type": 'COMERCIO'
      },
      { sort: { createdAt: -1 } }
    ).fetch();
    return { ventas, ready: sub.ready() };
  });

  // ✅ Handler de refresh optimizado con useCallback
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Esperar a que Meteor sincronice datos
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // ✅ Toggle expand optimizado con useCallback
  const toggleExpanded = useCallback((ventaId) => {
    setExpandedVentas(prev => ({ ...prev, [ventaId]: !prev[ventaId] }));
  }, []);

  // Helper para obtener paso del stepper
  const getStepFromStatus = useCallback((venta) => {
    // ✅ Detectar cancelación con isCancelada
    if (venta.isCancelada === true) {
      return -1; // Paso especial para cancelado
    }

    const steps = {
      'PREPARANDO': 1,
      'CADETEENLOCAL': 2,
      'ENCAMINO': 3,
      'CADETEENDESTINO': 4,
      'ENTREGADO': 5,
    };
    return steps[venta.estado] || 1;
  }, []);

  // ✅ Render de cada item optimizado con useCallback
  const renderItem = useCallback(({ item: venta }) => (
    <PedidoCard
      venta={venta}
      currentStep={getStepFromStatus(venta)}
      isExpanded={expandedVentas[venta._id]}
      onToggleExpand={() => toggleExpanded(venta._id)}
    />
  ), [expandedVentas, getStepFromStatus, toggleExpanded]);

  // ✅ KeyExtractor optimizado
  const keyExtractor = useCallback((item) => item._id, []);

  // ✅ Header de la lista (estadísticas)
  const ListHeaderComponent = useCallback(() => (
    <Surface style={styles.headerSection}>
      <Text variant="titleLarge" style={styles.headerTitle}>
        📋 Mis Pedidos
      </Text>
      <Text variant="bodyMedium" style={styles.headerSubtitle}>
        {ventas.length} pedido(s) realizados
      </Text>
    </Surface>
  ), [ventas.length]);

  // ✅ Separador entre items (espaciado vertical)
  const ItemSeparatorComponent = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  // ✅ Estados de carga usando componentes
  if (!ready) return <LoadingState />;
  if (ventas.length === 0) return <EmptyState />;

  // ✅ Render principal con FlatList
  return (
    <Surface style={styles.surface}>
      <Appbar style={{
        backgroundColor: '#3f51b5',
        height: useSafeAreaInsets().top + 50,
        paddingTop: useSafeAreaInsets().top,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <Appbar.BackAction
            color="red"
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          />
          <MenuHeader navigation={navigation} />
        </View>
      </Appbar>

      <FlatList
        data={ventas}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={styles.flatListContent}
        // ✅ Pull-to-refresh integrado
        refreshing={refreshing}
        onRefresh={handleRefresh}
        // ✅ Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={5}
        windowSize={10}
        // ✅ Empty state (por si acaso, aunque ya lo manejamos arriba)
        ListEmptyComponent={<EmptyState />}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: {
    height: '100%',
  },
  flatListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#616161',
  },
  separator: {
    height: 12, // Espaciado entre cards
  },
});

export default PedidosComerciosList;
