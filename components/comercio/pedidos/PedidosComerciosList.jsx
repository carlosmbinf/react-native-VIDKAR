import React, { useState } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection } from '../../collections/collections';

// ✅ IMPORTAR componentes refactorizados
import PedidoCard from './components/PedidoCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';

/**
 * Componente principal: Lista de pedidos de comercios del usuario
 */
const PedidosComerciosList = () => {
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

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const toggleExpanded = (ventaId) => {
    setExpandedVentas(prev => ({ ...prev, [ventaId]: !prev[ventaId] }));
  };

  // Helper para obtener paso del stepper
  const getStepFromStatus = (venta) => {
    // ✅ CORREGIDO: Detectar cancelación con isCancelada
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
  };

  // ✅ Estados de carga usando componentes
  if (!ready) return <LoadingState />;
  if (ventas.length === 0) return <EmptyState />;

  // ✅ Render principal simplificado
  return (
    <Surface style={{height:'100%'}}>

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#FF6F00']}
        />
      }
    >
      {/* Header */}
      <Surface style={styles.headerSection}>
        <Text variant="titleLarge" style={styles.headerTitle}>
          📋 Mis Pedidos
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          {ventas.length} pedido(s) realizados
        </Text>
      </Surface>

      {/* ✅ Lista de pedidos usando PedidoCard */}
      {ventas.map((venta) => (
        <PedidoCard
          key={venta._id}
          venta={venta}
          currentStep={getStepFromStatus(venta)}
          isExpanded={expandedVentas[venta._id]}
          onToggleExpand={() => toggleExpanded(venta._id)}
        />
      ))}
    </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F5F5F5',
  },
  scrollContent: {
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
});

export default PedidosComerciosList;
