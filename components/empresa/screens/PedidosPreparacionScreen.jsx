import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  Alert,
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
import MenuHeader from '../../Header/MenuHeader';

// ✅ Helper: Formatear tiempo transcurrido
const formatearTiempo = (fecha) => {
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas}h`;
};

// ✅ Helper: extraer tiendas únicas desde carritos COMERCIO (snapshot de tienda en el item)
const extraerTiendasUnicas = (productosComercio = []) => {
  const map = new Map();

  productosComercio.forEach((item) => {
    const id = item?.idTienda || item?.tienda?._id || null;
    const nombre = item?.tienda?.title || null;

    if (!id || !nombre) return;
    if (!map.has(id)) map.set(id, { id, nombre });
  });

  return Array.from(map.values());
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

      // ✅ NUEVO: tiendas únicas del pedido (a partir del snapshot guardado en carrito/venta)
      const tiendasInfo = extraerTiendasUnicas(productosComercio);
      const tiendaPrincipalNombre =
        tiendasInfo.length === 1 ? tiendasInfo[0].nombre : null;

      return {
        _id: venta._id,
        idOrder: venta._id || venta.producto?.idOrder || 'N/A',
        estado: venta.estado || 'PENDIENTE',
        metodoPago: venta.metodoPago || 'EFECTIVO',
        totalACobrar: venta.cobrado || 0,
        moneda: venta.monedaCobrado || 'CUP',
        createdAt: venta.createdAt || new Date(),
        tiendasInfo, // ✅ NUEVO
        tiendaPrincipalNombre, // ✅ NUEVO (si no es multi-tienda)
        productos: productosComercio.map((item) => ({
          nombre: item.producto?.name || 'Sin nombre',
          cantidad: item.cantidad || 1,
          comentario: item.comentario || '',
          tiendaNombre: item?.tienda?.title || null, // útil si el pedido es multi-tienda
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
  const handleCambiarEstado = async (pedidoId) => {
    console.log("pedidoId a avanzar:", {idPedido:pedidoId});
    Meteor.call("comercio.pedidos.avanzar", {idPedido:pedidoId}, (error, result) => {
      if (error) {
        Alert.alert("Error", error.reason)
      }
    });
  };

  // ✅ Renderizar card de pedido - REDISEÑO PROFESIONAL
const renderPedidoCard = ({ item: pedido }) => {
  const estadoConfig = getEstadoConfig(pedido.estado);
  const totalItems = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);

  const tiendas = pedido.tiendasInfo || [];
  const esMultiTienda = tiendas.length > 1;

  const tiendaLabel = esMultiTienda
    ? `${tiendas.length} tiendas`
    : pedido.tiendaPrincipalNombre || tiendas[0]?.nombre || 'Tienda sin nombre';

  return (
    <Surface style={styles.pedidoCard} elevation={4}>
      {/* ✅ Banda superior con tienda */}
      <View style={[styles.tiendaBanner, { backgroundColor: estadoConfig.color }]}>
        <View style={styles.tiendaBannerContent}>
          <View style={styles.tiendaInfo}>
            <Text style={styles.tiendaIcon}>🏪</Text>
            <View style={styles.tiendaTexts}>
              <Text variant="titleMedium" style={styles.tiendaNombre}>
                {tiendaLabel}
              </Text>
              {esMultiTienda && (
                <Text variant="labelSmall" style={styles.tiendaSubtitle}>
                  Pedido multi-tienda
                </Text>
              )}
            </View>
          </View>
          <Badge size={28} style={styles.itemsBadge}>
            {totalItems}
          </Badge>
        </View>
      </View>

      <Card.Content style={styles.cardContent}>
        {/* ✅ Fila superior: Orden + Estado + Tiempo */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text variant="titleLarge" style={styles.orderNumber}>
              #{pedido.idOrder}
            </Text>
            <Chip
              mode="flat"
              icon={estadoConfig.icon}
              style={[ { backgroundColor: estadoConfig.color }]}
              textStyle={styles.estadoChipText}
              compact
            >
              {estadoConfig.label}
            </Chip>
          </View>
          
          <View style={styles.metaRight}>
            <Text variant="labelSmall" style={styles.tiempoLabel}>
              Recibido
            </Text>
            <Text variant="bodyMedium" style={styles.tiempoValor}>
              {formatearTiempo(pedido.createdAt)}
            </Text>
          </View>
        </View>

        <Divider style={styles.sectionDivider} />

        {/* ✅ Sección de productos con mejor estructura */}
        <View style={styles.productosSection}>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            📦 Productos ({totalItems})
          </Text>
          
          <View style={styles.productosList}>
            {pedido.productos.map((producto, index) => {
              const mostrarTiendaEnProducto = esMultiTienda && producto.tiendaNombre;

              return (
                <View key={`${pedido._id}_prod_${index}`}>
                  <View style={styles.productoRow}>
                    <Badge
                      size={36}
                      style={[styles.cantidadBadge, { backgroundColor: estadoConfig.color }]}
                    >
                      {producto.cantidad}
                    </Badge>
                    
                    <View style={styles.productoInfo}>
                      <Text variant="bodyLarge" style={styles.productoNombre}>
                        {producto.nombre}
                      </Text>
                      
                      {mostrarTiendaEnProducto && (
                        <View style={styles.tiendaTag}>
                          <Text style={styles.tiendaTagIcon}>📍</Text>
                          <Text variant="labelSmall" style={styles.tiendaTagText}>
                            {producto.tiendaNombre}
                          </Text>
                        </View>
                      )}
                      
                      {producto.comentario && (
                        <View style={styles.comentarioContainer}>
                          <Text style={styles.comentarioIcon}>💬</Text>
                          <Text variant="bodySmall" style={styles.productoComentario}>
                            {producto.comentario}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {index < pedido.productos.length - 1 && (
                    <Divider style={styles.productoDivider} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <Divider style={styles.sectionDivider} />

        {/* ✅ Footer de pago rediseñado */}
        <View style={styles.pagoSection}>
          <View style={styles.pagoRow}>
            <View style={styles.pagoMetodo}>
              <Text variant="labelSmall" style={styles.pagoLabel}>
                Método de pago
              </Text>
              <Chip
                mode="flat"
                icon={pedido.metodoPago === 'EFECTIVO' ? 'cash' : 'credit-card'}
                style={[
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
            </View>
            
            <View style={styles.pagoTotal}>
              <Text variant="labelSmall" style={styles.totalLabel}>
                Total a cobrar
              </Text>
              <Text variant="headlineMedium" style={styles.totalValor}>
                ${pedido.totalACobrar?.toFixed(2)}
              </Text>
              <Text variant="labelSmall" style={styles.totalMoneda}>
                {pedido.moneda}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>

      {/* ✅ Acciones con diseño más limpio */}
      <Card.Actions style={styles.cardActions}>
        {pedido.estado === 'PENDIENTE' && (
          <>
            <Button
              mode="outlined"
              onPress={() => console.log('Ver detalle:', pedido._id)}
              icon="information-outline"
              style={styles.buttonSecondary}
            >
              Detalle
            </Button>
            <Button
              mode="contained"
              onPress={() => handleCambiarEstado(pedido._id)}
              style={[styles.buttonPrimary, { backgroundColor: '#2196F3' }]}
              icon="play"
            >
              Iniciar Preparación
            </Button>
          </>
        )}

        {pedido.estado === 'PREPARANDO' && (
          <>
            <Button
              mode="outlined"
              onPress={() => console.log('Ver detalle:', pedido._id)}
              icon="information-outline"
              style={styles.buttonSecondary}
            >
              Detalle
            </Button>
            <Button
              mode="contained"
              onPress={() => handleCambiarEstado(pedido._id)}
              style={[styles.buttonPrimary, { backgroundColor: '#4CAF50' }]}
              icon="check-bold"
            >
              Marcar como Listo
            </Button>
          </>
        )}

        {pedido.estado === 'PREPARACION_LISTO' && (
          <View style={styles.listoContainer}>
            <View style={styles.listoIconWrapper}>
              <Text style={styles.listoIcon}>✅</Text>
            </View>
            <Text variant="bodyLarge" style={styles.listoText}>
              Pedido empaquetado y listo para recoger
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
          >
          <MenuHeader navigation={navigation} />
          </Appbar.Content>
        </Appbar>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#673AB7" />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      </Surface>
    );
  }

  // ✅ NUEVO: Empty state cuando no hay pedidos en preparación
  // ✅ REFACTOR: Extraer Appbar común para evitar duplicación
  const renderAppbar = () => (
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
        title="Pedidos"
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
      <MenuHeader navigation={navigation} />
    </Appbar>
  );

  // ✅ Empty state cuando no hay pedidos
 
    return (
      <Surface style={styles.container}>
        {renderAppbar()}
{        pedidos.length === 0 ?
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No hay pedidos pendientes
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            Los nuevos pedidos aparecerán aquí automáticamente
          </Text>
        </View>
    :<FlatList
        data={pedidos}
        renderItem={renderPedidoCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.listContentTablet,
        ]}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet-2col' : 'mobile-1col'}
        columnWrapperStyle={isTablet ? styles.columnWrapper : null}
      />
  }
      </Surface>
    )
  }
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
    // paddingTop: 16,
    overflow: 'hidden',
    flex: 1, // ✅ Mantiene flex para ocupar espacio disponible
    minWidth: 0, // ✅ Permite que flex shrink funcione correctamente
    maxWidth: '100%', // ✅ Previene overflow
    elevation: 20,
  },

  // Header del card
  cardHeader: {
    paddingTop: 12,
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
    height: 28,
  },
  tiempoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  estadoChip: {
    // alignSelf: 'flex-start',
    // marginTop: 4,
    // height: 40,
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

  // ✅ NUEVO: Estilos para banda de tienda
  tiendaBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop:0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tiendaNombre: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tiendaSubtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // ✅ NUEVO: label de tienda en productos multi-tienda
  productoTienda: {
    color: '#607D8B',
    marginTop: 2,
    fontWeight: '600',
  },

  productoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  productoInfo: {
    flex: 1,
    gap: 4,
  },
  productoNombre: {
    fontWeight: '700',
    lineHeight: 20,
  },
  comentarioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  comentarioIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  productoComentario: {
    flex: 1,
    fontStyle: 'italic',
    color: '#607D8B',
    lineHeight: 18,
  },

  // ✅ Card principal mejorado
  pedidoCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    elevation: 4,
  },

  // ✅ Banda de tienda rediseñada
  tiendaBanner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  tiendaBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tiendaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tiendaIcon: {
    fontSize: 28,
  },
  tiendaTexts: {
    flex: 1,
  },
  tiendaNombre: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tiendaSubtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // ✅ Contenido del card
  cardContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },

  // ✅ Fila de metadatos (orden + estado + tiempo)
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  metaLeft: {
    flex: 1,
    gap: 8,
  },
  orderNumber: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  estadoChip: {
    alignSelf: 'flex-start',
  },
  estadoChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tiempoLabel: {
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tiempoValor: {
    fontWeight: '600',
  },

  // ✅ Sección de productos
  productosSection: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  productosList: {
    gap: 4,
  },
  productoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  cantidadBadge: {
    marginTop: 2,
  },
  productoInfo: {
    flex: 1,
    gap: 6,
  },
  productoNombre: {
    fontWeight: '700',
    lineHeight: 22,
  },
  tiendaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tiendaTagIcon: {
    fontSize: 12,
  },
  tiendaTagText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  comentarioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  comentarioIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  productoComentario: {
    flex: 1,
    fontStyle: 'italic',
    color: '#616161',
    lineHeight: 18,
  },

  // ✅ Sección de pago rediseñada
  pagoSection: {
    marginVertical: 12,
  },
  pagoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  pagoMetodo: {
    gap: 6,
  },
  pagoLabel: {
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pagoChip: {
    alignSelf: 'flex-start',
  },
  pagoChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  pagoTotal: {
    alignItems: 'flex-end',
    gap: 2,
  },
  totalLabel: {
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValor: {
    fontWeight: 'bold',
  },
  totalMoneda: {
    color: '#757575',
  },

  // ✅ Dividers
  sectionDivider: {
    marginVertical: 12,
  },
  productoDivider: {
    marginVertical: 4,
    backgroundColor: '#EEEEEE',
  },

  // ✅ Acciones rediseñadas
  cardActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'flex-end',
    gap: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  buttonSecondary: {
    borderColor: '#BDBDBD',
  },
  buttonPrimary: {
    minWidth: 160,
  },
  
  // ✅ Estado "Listo" mejorado
  listoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    // backgroundColor: '#E8F5E9',
    // padding: 12,
    borderRadius: 8,
  },
  listoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listoIcon: {
    fontSize: 24,
  },
  listoText: {
    flex: 1,
    color: '#2E7D32',
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default PedidosPreparacionScreen;
