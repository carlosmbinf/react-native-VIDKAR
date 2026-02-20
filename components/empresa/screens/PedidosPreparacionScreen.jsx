import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  Alert,
  Animated,
  PanResponder,
  Vibration,
  ScrollView, // ✅ NUEVO: Import ScrollView
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  Chip,
  Button,
  Badge,
  Divider,
  Appbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection } from '../../collections/collections';
import MenuHeader from '../../Header/MenuHeader';
// ✅ NUEVO: Importar estilos desde archivo separado
import {
  pedidosStyles,
  cardStyles,
  productosStyles,
  pagoStyles,
  accionesStyles,
} from './pedidos/styles/pedidosStyles';
// ✅ NUEVO: Importar SlideToConfirm desde componentes
import SlideToConfirm from './pedidos/components/SlideToConfirm';

// ✅ Helper: Formatear tiempo transcurrido
const formatearTiempo = (fecha) => {
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas}h`;
};

// ✅ Helper: extraer tiendas únicas desde carritos COMERCIO
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

// ✅ Sistema de prioridad por estado
const getEstadoPrioridad = (estado) => {
  const prioridades = {
    PREPARANDO: 1,           // Máxima urgencia: están en proceso
    PENDIENTE: 2,            // Alta urgencia: esperan ser preparados
    PREPARACION_LISTO: 3,    // Media urgencia: listos para recoger
    PENDIENTE_ENTREGA: 4,    // Baja urgencia: en espera de asignación
    CADETEENLOCAL: 5,        // Proceso de entrega iniciado
    ENCAMINO: 6,             // En camino al destino
    CADETEENDESTINO: 7,      // Casi completado
    ENTREGADO: 8,            // Completado (no debería aparecer por filtro)
    CANCELADO: 9,            // Completado (no debería aparecer por filtro)
  };
  return prioridades[estado] || 10;
};

// ✅ Configuración de estado
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

// ✅ Helper para color del header
const getHeaderColorConfig = (cantidadPedidos) => {
  if (cantidadPedidos <= 3) {
    return {
      backgroundColor: '#4CAF50',
      badgeColor: '#2E7D32',
      mensaje: 'Todo bajo control',
    };
  } else if (cantidadPedidos <= 8) {
    return {
      backgroundColor: '#FF9800',
      badgeColor: '#F57C00',
      mensaje: 'Ritmo normal',
    };
  } else {
    return {
      backgroundColor: '#F44336',
      badgeColor: '#C62828',
      mensaje: '¡Alta demanda!',
    };
  }
};

const PedidosPreparacionScreen = ({ navigation, openDrawer }) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  // ✅ Query de pedidos CON ORDENAMIENTO
  const { pedidos, loading } = useTracker(() => {
    const handle = Meteor.subscribe('ventasRecharge', {
      'producto.carritos.type': 'COMERCIO',
      estado: { $nin: ['ENTREGADO'] },
      isCancelada: { $ne: true },
      isCobrado: { $ne: false }
    });

    const ventas = VentasRechargeCollection.find({
      'producto.carritos.type': 'COMERCIO',
      estado: { $nin: ['ENTREGADO'] },
      isCancelada: { $ne: true },
      isCobrado: { $ne: false }
    }).fetch();

    const pedidosTransformados = ventas.map((venta) => {
      const productosComercio = venta.producto?.carritos?.filter(
        (item) => item.type === 'COMERCIO'
      ) || [];

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
        tiendasInfo,
        tiendaPrincipalNombre,
        productos: productosComercio.map((item) => ({
          nombre: item.producto?.name || 'Sin nombre',
          cantidad: item.cantidad || 1,
          comentario: item.comentario || '',
          tiendaNombre: item?.tienda?.title || null,
        })),
        cadeteid: venta.cadeteid,
        fechaAsignacion: venta.fechaAsignacion,
        isCobrado: venta.isCobrado
      };
    });

    // ✅ NUEVO: Ordenamiento inteligente por prioridad + fecha
    const pedidosOrdenados = pedidosTransformados.sort((a, b) => {
      const prioridadA = getEstadoPrioridad(a.estado);
      const prioridadB = getEstadoPrioridad(b.estado);
      
      // Primero ordenar por prioridad (menor número = más urgente)
      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }
      
      // Si tienen misma prioridad, ordenar por fecha (más antiguos primero)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      pedidos: pedidosOrdenados,
      loading: !handle.ready()
    };
  });

  const headerConfig = getHeaderColorConfig(pedidos.length);

  // ✅ Handler: Cambiar estado del pedido
  const handleCambiarEstado = async (pedidoId) => {
    console.log("pedidoId a avanzar:", { idPedido: pedidoId });
    Meteor.call("comercio.pedidos.avanzar", { idPedido: pedidoId }, (error, result) => {
      if (error) {
        Alert.alert("Error", error.reason);
      }
    });
  };

  // ✅ Renderizar card de pedido
  const renderPedidoCard = ({ item: pedido }) => {
    const estadoConfig = getEstadoConfig(pedido.estado);
    const totalItems = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);

    const tiendas = pedido.tiendasInfo || [];
    const esMultiTienda = tiendas.length > 1;
    const tiendaLabel = esMultiTienda
      ? `${tiendas.length} tiendas`
      : pedido.tiendaPrincipalNombre || tiendas[0]?.nombre || 'Tienda sin nombre';

    return (
      <Surface style={cardStyles.pedidoCard} elevation={4}>
      {/* Banda superior con tienda */}
      <View style={[cardStyles.tiendaBanner, { backgroundColor: estadoConfig.color }]}>
        <View style={cardStyles.tiendaBannerContent}>
        <View style={cardStyles.tiendaInfo}>
          <Text style={cardStyles.tiendaIcon}>🏪</Text>
          <View style={cardStyles.tiendaTexts}>
          <Text variant="titleMedium" style={cardStyles.tiendaNombre}>
            {tiendaLabel}
          </Text>
          {esMultiTienda && (
            <Text variant="labelSmall" style={cardStyles.tiendaSubtitle}>
            Pedido multi-tienda
            </Text>
          )}
          </View>
        </View>
        <Badge size={28} style={cardStyles.itemsBadge}>
          {totalItems}
        </Badge>
        </View>
      </View>

      <Card.Content style={cardStyles.cardContent}>
        {/* Meta información */}
        <View style={cardStyles.metaRow}>
        <View style={cardStyles.metaLeft}>
          <Text variant="titleLarge" style={cardStyles.orderNumber}>
          #{pedido.idOrder}
          </Text>
          <Chip
          mode="flat"
          icon={estadoConfig.icon}
          style={{ backgroundColor: estadoConfig.color, maxWidth: 200 }}
          textStyle={cardStyles.estadoChipText}
          compact
          >
          {estadoConfig.label}
          </Chip>
        </View>
        
        <View style={cardStyles.metaRight}>
          <Text variant="labelSmall" style={cardStyles.tiempoLabel}>
          Recibido
          </Text>
          <Text variant="bodyMedium" style={cardStyles.tiempoValor}>
          {formatearTiempo(pedido.createdAt)}
          </Text>
        </View>
        </View>

        <Divider style={cardStyles.sectionDivider} />

        {/* Productos con ScrollView interno */}
        <View style={productosStyles.productosSection}>
        <Text variant="labelLarge" style={productosStyles.sectionTitle}>
          📦 Productos ({totalItems})
        </Text>
        
        {/* ✅ NUEVO: ScrollView para productos largos */}
        <ScrollView 
          style={productosStyles.productosList}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {pedido.productos.map((producto, index) => {
          const mostrarTiendaEnProducto = esMultiTienda && producto.tiendaNombre;

          return (
            <View key={`${pedido._id}_prod_${index}`}>
            <View style={productosStyles.productoRow}>
              <Badge
              size={36}
              style={[productosStyles.cantidadBadge, { backgroundColor: estadoConfig.color }]}
              >
              {producto.cantidad}
              </Badge>
              
              <View style={productosStyles.productoInfo}>
              <Text variant="bodyLarge" style={productosStyles.productoNombre}>
                {producto.nombre}
              </Text>
              
              {mostrarTiendaEnProducto && (
                <View style={productosStyles.tiendaTag}>
                <Text style={productosStyles.tiendaTagIcon}>📍</Text>
                <Text variant="labelSmall" style={productosStyles.tiendaTagText}>
                  {producto.tiendaNombre}
                </Text>
                </View>
              )}
              
              {producto.comentario && (
                <View style={productosStyles.comentarioContainer}>
                <Text style={productosStyles.comentarioIcon}>💬</Text>
                <Text variant="bodySmall" style={productosStyles.productoComentario}>
                  {producto.comentario}
                </Text>
                </View>
              )}
              </View>
            </View>
            
            {index < pedido.productos.length - 1 && (
              <Divider style={productosStyles.productoDivider} />
            )}
            </View>
          );
          })}
        </ScrollView>
        </View>

        <Divider style={cardStyles.sectionDivider} />

        {/* Pago */}
        <View style={pagoStyles.pagoSection}>
        <View style={pagoStyles.pagoRow}>
          <View style={pagoStyles.pagoMetodo}>
          <Text variant="labelSmall" style={pagoStyles.pagoLabel}>
            Método de pago
          </Text>
          <Chip
            mode="flat"
            icon={pedido.metodoPago === 'EFECTIVO' ? 'cash' : 'credit-card'}
            style={{
            backgroundColor:
              pedido.metodoPago === 'EFECTIVO' ? '#FF6F00' : '#67bfff',
            }}
            // textStyle={pagoStyles.pagoChipText}
            compact
          >
            {pedido.metodoPago}
          </Chip>
          </View>
          
          <View style={pagoStyles.pagoTotal}>
          <Text variant="labelSmall" style={pagoStyles.totalLabel}>
            Costo Productos:
          </Text>
          <Text variant="headlineMedium" style={pagoStyles.totalValor}>
            ${pedido.totalACobrar?.toFixed(2)} {pedido.moneda}
          </Text>
          </View>
        </View>
        </View>
      </Card.Content>

      {/* Acciones */}
      <Card.Actions style={accionesStyles.cardActions}>
        {pedido.estado === 'PENDIENTE' && (
        <View style={accionesStyles.actionsContainer}>
          {/* <Button
          mode="outlined"
          onPress={() => console.log('Ver detalle:', pedido._id)}
          icon="information-outline"
          style={accionesStyles.buttonSecondary}
          disabled
          >
          Detalle
          </Button> */}
          
          <SlideToConfirm
          onConfirm={() => handleCambiarEstado(pedido._id)}
          backgroundColor="#2196F3"
          icon="▶"
          text="Deslizar para preparar"
          />
        </View>
        )}

        {pedido.estado === 'PREPARANDO' && (
        <View style={accionesStyles.actionsContainer}>
          {/* <Button
          mode="outlined"
          onPress={() => console.log('Ver detalle:', pedido._id)}
          icon="information-outline"
          disabled
          >
          Detalle
          </Button> */}
          
          <SlideToConfirm
          onConfirm={() => handleCambiarEstado(pedido._id)}
          backgroundColor="#4CAF50"
          icon="✓"
          text="Deslizar para marcar listo"
          />
        </View>
        )}

        {pedido.estado === 'PREPARACION_LISTO' && (
        <View style={accionesStyles.listoContainer}>
          <View style={accionesStyles.listoIconWrapper}>
          <Text style={accionesStyles.listoIcon}>✔︎</Text>
          </View>
          <Text variant="bodyLarge" style={accionesStyles.listoText}>
          Pedido empaquetado y listo para recoger
          </Text>
        </View>
        )}
      </Card.Actions>
      </Surface>
    );
  };

  // ✅ Renderizar Appbar
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
      <View style={pedidosStyles.badgeContainer}>
        <Badge
          size={24}
          style={[pedidosStyles.headerBadge, { backgroundColor: headerConfig.badgeColor }]}
        >
          {pedidos.length}
        </Badge>
      </View>
      <MenuHeader navigation={navigation} />
    </Appbar>
  );

  // ✅ Loading state
  if (loading) {
    return (
      <Surface style={pedidosStyles.container}>
        {renderAppbar()}
        <View style={pedidosStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#673AB7" />
          <Text style={pedidosStyles.loadingText}>Cargando pedidos...</Text>
        </View>
      </Surface>
    );
  }

  // ✅ Render principal
  return (
    <Surface style={pedidosStyles.container}>
      {renderAppbar()}
      {pedidos.length === 0 ? (
        <View style={pedidosStyles.emptyContainer}>
          <Text style={pedidosStyles.emptyIcon}>🍽️</Text>
          <Text variant="headlineSmall" style={pedidosStyles.emptyTitle}>
            No hay pedidos pendientes
          </Text>
          <Text variant="bodyMedium" style={pedidosStyles.emptySubtitle}>
            Los nuevos pedidos aparecerán aquí automáticamente
          </Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          renderItem={renderPedidoCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            pedidosStyles.listContent,
            isTablet && pedidosStyles.listContentTablet,
          ]}
          numColumns={isTablet ? 2 : 1}
          key={isTablet ? 'tablet-2col' : 'mobile-1col'}
          columnWrapperStyle={isTablet ? pedidosStyles.columnWrapper : null}
        />
      )}
    </Surface>
  );
};

export default PedidosPreparacionScreen;
