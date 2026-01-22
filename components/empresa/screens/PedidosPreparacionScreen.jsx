import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  Chip,
  Button,
  Badge,
  Divider,
  List,
  Appbar,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Meteor, { useTracker } from '@meteorrn/core'; // ✅ Importar useTracker
import { VentasRechargeCollection } from '../../collections/collections'; // ✅ Importar collection

// ✅ Helper: Formatear tiempo transcurrido
const formatearTiempo = (fecha) => {
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas}h`;
};

// ✅ ACTUALIZADO: Configuración de estado para los 3 estados de empresa
const getEstadoConfig = (estado) => {
const configs = {
    PENDIENTE_DE_PAGO: { color: '#F44336', icon: 'cash-clock', label: 'Pendiente de Pago' },
    PENDIENTE: { color: '#FF9800', icon: 'clock-outline', label: 'Pendiente' },
    PREPARANDO: { color: '#2196F3', icon: 'chef-hat', label: 'Preparando' },
    PREPARACION_LISTO: { color: '#4CAF50', icon: 'check', label: 'Listo para ser recogido' },
    PENDIENTE_ENTREGA: { color: '#9C27B0', icon: 'truck-outline', label: 'Pendiente Entrega' },
    CADETEENLOCAL: { color: '#3F51B5', icon: 'store-marker', label: 'Cadete en Local' },
    ENCAMINO: { color: '#FF6F00', icon: 'truck-fast', label: 'En Camino' },
    CADETEENDESTINO: { color: '#00BCD4', icon: 'map-marker-check', label: 'Cadete en Destino' },
    ENTREGADO: { color: '#4CAF50', icon: 'check-circle', label: 'Entregado' },
    CANCELADO: { color: '#757575', icon: 'close-circle', label: 'Cancelado' },
};
  return configs[estado] || configs.PENDIENTE;
};

// ✅ Helper para determinar color del header según cantidad de pedidos
const getHeaderColorConfig = (cantidadPedidos) => {
  if (cantidadPedidos <= 3) {
    return {
      backgroundColor: '#4CAF50', // Verde - Tranquilo
      badgeColor: '#2E7D32',
      mensaje: 'Todo bajo control',
    };
  } else if (cantidadPedidos <= 8) {
    return {
      backgroundColor: '#FF9800', // Naranja - Moderado
      badgeColor: '#F57C00',
      mensaje: 'Ritmo normal',
    };
  } else {
    return {
      backgroundColor: '#F44336', // Rojo - Alta demanda
      badgeColor: '#C62828',
      mensaje: '¡Alta demanda!',
    };
  }
};

const PedidosPreparacionScreen = ({ navigation, openDrawer }) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  // ✅ MODIFICADO: Query solo para estados de responsabilidad de empresa + excluir canceladas
  const { pedidos, loading } = useTracker(() => {
    // ✅ CRÍTICO: Filtrar pedidos con:
    // - carritos COMERCIO
    // - estados PENDIENTE/PREPARANDO/LISTO
    // - NO canceladas (isCancelada !== true)
    const handle = Meteor.subscribe('ventasRecharge', {
        'producto.carritos.type': 'COMERCIO',
        estado: { $nin: ['ENTREGADO'] },
        isCancelada: { $ne: true }, // ✅ NUEVO: Excluir canceladas
        isCobrado: { $ne: false } // ✅ NUEVO: Excluir canceladas
    });

    const ventas = VentasRechargeCollection.find({
        'producto.carritos.type': 'COMERCIO',
        estado: { $nin: ['ENTREGADO'] },
        isCancelada: { $ne: true }, // ✅ NUEVO: Excluir canceladas
        isCobrado: { $ne: false } // ✅ NUEVO: Excluir canceladas
    }).fetch();

    // ✅ Transformar estructura de VentasRechargeCollection a formato esperado por el UI
    const pedidosTransformados = ventas.map((venta) => {
      // Filtrar solo productos de comercio
      const productosComercio = venta.producto?.carritos?.filter(
        (item) => item.type === 'COMERCIO'
      ) || [];

      return {
        _id: venta._id,
        idOrder: venta._id || venta.producto?.idOrder || 'N/A',
        estado: venta.estado || 'PENDIENTE',
        metodoPago: venta.metodoPago || 'EFECTIVO',
        totalACobrar: venta.cobrado || 0,
        moneda: venta.monedaCobrado || 'CUP',
        createdAt: venta.createdAt || new Date(),
        productos: productosComercio.map((item) => ({
          nombre: item.producto?.name || 'Sin nombre',
          cantidad: item.cantidad || 1,
          comentario: item.comentario || ''
        })),
        // ✅ Datos adicionales útiles
        cadeteid: venta.cadeteid,
        fechaAsignacion: venta.fechaAsignacion,
        isCobrado: venta.isCobrado
      };
    });

    return {
      pedidos: pedidosTransformados,
      loading: !handle.ready()
    };
  });

  const headerConfig = getHeaderColorConfig(pedidos.length);

  // ✅ Handler: Cambiar estado del pedido (simulado, luego se conectará con Meteor.call)
  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    console.log('[PedidosPreparacion] Cambiar estado:', pedidoId, nuevoEstado);
      let count = await VentasRechargeCollection.update(pedidoId , {
          $set: {
              estado: nuevoEstado
          }
      });
    console.log("count", count);
    // TODO: Implementar Meteor.call para actualizar estado en backend
  };

  // ✅ Renderizar card de pedido
  const renderPedidoCard = ({ item: pedido }) => {
    const estadoConfig = getEstadoConfig(pedido.estado);
    const totalItems = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);

    return (
      <Surface style={styles.pedidoCard} elevation={20}>
        {/* Header */}
        <Card.Content style={styles.cardHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text variant="titleMedium" style={styles.orderNumber}>
                🏷️ #{pedido.idOrder}
              </Text>
              <Badge size={24} style={styles.badgeItems}>
                {totalItems}
              </Badge>
            </View>
            <Chip
              mode="flat"
              icon="clock-outline"
              style={[styles.tiempoChip, { backgroundColor: estadoConfig.color + '20' }]}
              textStyle={[styles.tiempoText, { color: estadoConfig.color }]}
              compact
            >
              {formatearTiempo(pedido.createdAt)}
            </Chip>
          </View>

          <Chip
            mode="flat"
            icon={estadoConfig.icon}
            style={[styles.estadoChip, { backgroundColor: estadoConfig.color }]}
            textStyle={styles.estadoChipText}
            // compact
          >
            {estadoConfig.label}
          </Chip>
        </Card.Content>

        <Divider style={styles.divider} />

        {/* Body - Lista de productos */}
        <Card.Content style={styles.cardBody}>
          {pedido.productos.map((producto, index) => (
            <View key={index}>
              <List.Item
                title={producto.nombre}
                titleStyle={styles.productoNombre}
                description={
                  producto.comentario
                    ? `💬 ${producto.comentario}`
                    : undefined
                }
                descriptionStyle={styles.productoComentario}
                left={(props) => (
                  <Badge
                    size={28}
                    style={[styles.cantidadBadge, { backgroundColor: estadoConfig.color }]}
                  >
                    x{producto.cantidad}
                  </Badge>
                )}
                style={styles.productoItem}
              />
              {index < pedido.productos.length - 1 && (
                <Divider style={styles.dividerLight} />
              )}
            </View>
          ))}
        </Card.Content>

        <Divider style={styles.divider} />

        {/* Footer - Pago y acciones */}
        <Card.Content style={styles.cardFooter}>
          <View style={styles.pagoInfo}>
            <Chip
              mode="flat"
              icon={pedido.metodoPago === 'EFECTIVO' ? 'cash' : 'credit-card'}
              style={[
                styles.pagoChip,
                {
                  backgroundColor:
                    pedido.metodoPago === 'EFECTIVO' ? '#FF6F00' : '#673AB7',
                },
              ]}
              textStyle={styles.pagoChipText}
              compact
            >
              {pedido.metodoPago}
            </Chip>
            <Text variant="titleMedium" style={styles.totalText}>
              ${pedido.totalACobrar?.toFixed(2)} {pedido.moneda}
            </Text>
          </View>
        </Card.Content>

        {/* ✅ ACTUALIZADO: Acciones según estado (solo 3 estados) */}
        <Card.Actions style={styles.cardActions}>
          {pedido.estado === 'PENDIENTE' && (
            <>
              <Button
                mode="outlined"
                onPress={() => console.log('Ver detalle:', pedido._id)}
                style={styles.buttonSecondary}
              >
                Ver Detalle
              </Button>
              <Button
                mode="contained"
                onPress={() => handleCambiarEstado(pedido._id, 'PREPARANDO')}
                style={[styles.buttonPrimary, { backgroundColor: '#2196F3' }]}
                icon="play"
              >
                Iniciar
              </Button>
            </>
          )}

          {pedido.estado === 'PREPARANDO' && (
            <>
              <Button
                mode="outlined"
                onPress={() => console.log('Ver detalle:', pedido._id)}
                style={styles.buttonSecondary}
              >
                Ver Detalle
              </Button>
              <Button
                mode="contained"
                onPress={() => handleCambiarEstado(pedido._id, 'PREPARACION_LISTO')}
                style={[styles.buttonPrimary, { backgroundColor: '#4CAF50' }]}
                icon="check-bold"
              >
                Marcar Listo
              </Button>
            </>
          )}

          {pedido.estado === 'PREPARACION_LISTO' && (
            <View style={styles.listoInfo}>
              <Text variant="bodyMedium" style={styles.listoText}>
                ✅ Empaquetado y listo para recoger
              </Text>
            </View>
          )}
        </Card.Actions>
      </Surface>
    );
  };

  // ✅ Loading state mientras se cargan los datos
  if (loading) {
    return (
      <Surface style={styles.container}>
        <Appbar
          style={{
            backgroundColor: '#757575',
            height: insets.top + 56,
            paddingTop: insets.top,
            elevation: 4,
          }}
        >
          <Appbar.Action icon="menu" color="#FFFFFF" onPress={openDrawer} />
          <Appbar.Content
            title="Pedidos Pendientes"
            titleStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
          />
        </Appbar>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#673AB7" />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      </Surface>
    );
  }

  // ✅ NUEVO: Empty state cuando no hay pedidos en preparación
  if (pedidos.length === 0) {
    return (
      <Surface style={styles.container}>
        <Appbar
          style={{
            backgroundColor: headerConfig.backgroundColor,
            height: insets.top + 56,
            paddingTop: insets.top,
            elevation: 4,
          }}
        >
          <Appbar.Action icon="menu" color="#FFFFFF" onPress={openDrawer} />
          <Appbar.Content
            title="Pedidos en Preparación"
            titleStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
          />
          <View style={styles.badgeContainer}>
            <Badge
              size={24}
              style={[styles.headerBadge, { backgroundColor: headerConfig.badgeColor }]}
            >
              0
            </Badge>
          </View>
        </Appbar>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No hay pedidos pendientes
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            Los nuevos pedidos aparecerán aquí automáticamente
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      {/* Header con color dinámico */}
      <Appbar
        style={{
          backgroundColor: headerConfig.backgroundColor, // 🎨 Dinámico
          height: insets.top + 56,
          paddingTop: insets.top,
          elevation: 4,
        }}
      >
         <Appbar.Action
                      icon="menu"
                      color="#FFFFFF"
                      onPress={openDrawer}
                    />
        <Appbar.Content
          title="Pedidos Pendientes"
          titleStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
        />
        <View style={styles.badgeContainer}>
          <Badge
            size={24}
            style={[styles.headerBadge, { backgroundColor: headerConfig.badgeColor }]}
          >
            {pedidos.length}
          </Badge>
        </View>
      </Appbar>

      {/* ✅ CORREGIDO: Lista de pedidos con columKey para forzar re-render */}
      <FlatList
        data={pedidos}
        renderItem={renderPedidoCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.listContentTablet,
        ]}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet-2col' : 'mobile-1col'} // ✅ Más descriptivo
        columnWrapperStyle={isTablet ? styles.columnWrapper : null} // ✅ NUEVO
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    // color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#757575',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32, // ✅ Más espacio al final
  },
  listContentTablet: {
    paddingHorizontal: 24,
  },
  // ✅ NUEVO: Estilos para columnas en tablet
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 16, // Espacio entre columnas
  },
  headerBadge: {
    marginRight: 16,
  },
  badgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  // ✅ MODIFICADO: Card principal con flex para adaptarse al ancho
  pedidoCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flex: 1, // ✅ Mantiene flex para ocupar espacio disponible
    minWidth: 0, // ✅ Permite que flex shrink funcione correctamente
    maxWidth: '100%', // ✅ Previene overflow
    elevation: 20,
  },

  // Header del card
  cardHeader: {
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  badgeItems: {
    backgroundColor: '#E0E0E0',
  },
  tiempoChip: {
    // height: 28,
  },
  tiempoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  estadoChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 35,
  },
  estadoChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Body del card (productos)
  cardBody: {
    paddingVertical: 8,
  },
  productoItem: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 6,
  },
  productoNombre: {
    fontWeight: '600',
    fontSize: 14,
  },
  productoComentario: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#757575',
    marginTop: 4,
  },
  cantidadBadge: {
    marginRight: 8,
    alignSelf: 'center',
  },

  // Footer del card (pago)
  cardFooter: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  pagoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pagoChip: {
    // height: 28,
  },
  pagoChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  totalText: {
    fontWeight: 'bold',
    // color: '#212121',
  },

  // Actions del card
  cardActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'flex-end',
    gap: 8,
  },
  buttonSecondary: {
    borderColor: '#BDBDBD',
  },
  buttonPrimary: {
    minWidth: 140,
  },
  listoInfo: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  listoText: {
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Dividers
  divider: {
    marginVertical: 0,
  },
  dividerLight: {
    marginVertical: 4,
    backgroundColor: '#F5F5F5',
  },
});

export default PedidosPreparacionScreen;
