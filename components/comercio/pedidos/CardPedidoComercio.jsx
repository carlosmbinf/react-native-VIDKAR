import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { Card, Button, IconButton, Text, Chip, Divider } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';

import {
  COLORES_ESTADO,
  LABELS_BOTON_ESTADO,
  obtenerSiguienteEstado,
  formatearPrecio,
  obtenerTextoEstado,
} from '../../../data/comercio/mockData';
import { TiendasComercioCollection } from '../../collections/collections';
import MapaPedidos from '../maps/MapaPedidos';
// ✅ NUEVO: Importar SlideToConfirm
import SlideToConfirm from '../../empresa/screens/pedidos/components/SlideToConfirm';

const CardPedidoComercio = ({ pedido, venta: ventaProp, navigation }) => {
  // ✅ CORRECCIÓN: Todas las validaciones ANTES de hooks
  if (!ventaProp) {
    console.warn('[CardPedidoComercio] venta es undefined/null');
    return null;
  }

  const venta = ventaProp;
  const producto = venta.producto || {};
  const comprasEnCarrito = producto?.carritos || [];
  
  // ✅ Validar datos mínimos ANTES de hooks
  if (comprasEnCarrito.length === 0) {
    console.warn('[CardPedidoComercio] Sin productos en carrito');
    return null;
  }

  const primerItem = comprasEnCarrito[0];
  if (!primerItem?.coordenadas || typeof primerItem.coordenadas.latitude !== 'number') {
    console.warn('[CardPedidoComercio] coordenadas inválidas', primerItem?.coordenadas);
    return null;
  }

  // ✅ AHORA SÍ: Hooks (siempre se ejecutan)
  const [loading, setLoading] = useState(false);

  // Extraer datos de la estructura real de venta
  const {
    estado = 'PREPARANDO',
    isCobrado = false,
    cobrado = 0,
    monedaCobrado = 'CUP',
    precioOficial = 0,
    monedaPrecioOficial = 'CUP',
  } = venta;

  // ✅ useMemo ya tiene datos garantizados
  const coordenadas = useMemo(() => primerItem.coordenadas, [primerItem.coordenadas]);
  
  const idTienda = useMemo(() => primerItem.idTienda || null, [primerItem.idTienda]);
  
  const comentario = useMemo(() => primerItem.comentario || '', [primerItem.comentario]);

  // Suscripción reactiva a la tienda
  const { tienda, tiendaReady } = useTracker(() => {
    if (!idTienda) return { tienda: null, tiendaReady: false };
    
    const handler = Meteor.subscribe('tiendas', { _id: idTienda });
    const tiendaDoc = TiendasComercioCollection.findOne({ _id: idTienda });
    
    return {
      tienda: tiendaDoc || {},
      tiendaReady: handler.ready(),
    };
  }, [idTienda]);

  // Usuario actual (cadete)
  const { user } = useTracker(() => ({
    user: Meteor.user(),
  }));

  // Calcular total de productos
  const subtotalProductos = useMemo(() => {
    return comprasEnCarrito.reduce((acc, item) => {
      const precio = item.producto?.precio || 0;
      const cantidad = item.cantidad || 1;
      return acc + (precio * cantidad);
    }, 0);
  }, [comprasEnCarrito]);

  // Calcular costo de entrega (diferencia entre cobrado y subtotal)
  const cobroEntrega = useMemo(() => {
    // Si hay precioOficial, usar la diferencia con subtotalProductos
    // Si no, asumir que cobrado incluye todo
    if (precioOficial > subtotalProductos) {
      return precioOficial - subtotalProductos;
    }
    return 0;
  }, [precioOficial, subtotalProductos]);

  // Determinar label del botón según estado
  const buttonLabel = useMemo(() => {
    return LABELS_BOTON_ESTADO[estado] || 'AVANZAR';
  }, [estado]);

  // ✅ NUEVO: Configuración del slider según estado
  const sliderConfig = useMemo(() => {
    const configs = {
      PREPARACION_LISTO: {
        backgroundColor: '#00BCD4',
        icon: '▶',
        text: 'Llegue al local',
        textoPedido:'Listo para Retirar'
      },
      PENDIENTE_ENTREGA: {
        backgroundColor: '#9C27B0',
        icon: '▶',
        text: 'Deslizar para ir a local',
        textoPedido:'Pendiente de entrega'
      },
      CADETEENLOCAL: {
        backgroundColor: '#3F51B5',
        icon: '▶',
        text: 'Ya tengo el pedido',
        textoPedido:'Llegue al local'
      },
      ENCAMINO: {
        backgroundColor: '#FF6F00',
        icon: '▶',
        text: 'Llegue al lugar de entrega',
        textoPedido:'En camino al destino'
      },
      CADETEENDESTINO: {
        backgroundColor: '#4CAF50',
        icon: '✓',
        text: 'Entregado',
        textoPedido:'Llegue al destino'
      },
    };
    return configs[estado] || {
      backgroundColor: COLORES_ESTADO[estado] || '#2196F3',
      icon: '▶',
      text: 'Deslizar para avanzar',
    };
  }, [estado]);

  // Handlers
  const handleGoToLocation = useCallback(() => {
    let coord = {
      latitude: estado === 'PREPARACION_LISTO' 
        ? tienda?.coordenadas?.latitude || 0 
        : coordenadas.latitude,
      longitude: estado === 'PREPARACION_LISTO' 
        ? tienda?.coordenadas?.longitude || 0 
        : coordenadas.longitude,
    };
    
    if (coord.latitude && coord.longitude) {
      const isIOS = Platform.OS === 'ios';
      const url = isIOS
        ? `http://maps.apple.com/?ll=${coord.latitude},${coord.longitude}&q=Destino`
        : `https://www.google.com/maps/search/?api=1&query=${coord.latitude},${coord.longitude}`;
      
      Linking.openURL(url).catch(err => {
        console.error('[CardPedidoComercio] Error al abrir mapas:', err);
        Alert.alert('Error', `No se pudo abrir ${isIOS ? 'Apple Maps' : 'Google Maps'}`);
      });
    }
  }, [coordenadas, estado, tienda]);

  const handleAvanzar = useCallback(() => {
    const nuevoEstado = obtenerSiguienteEstado(estado);
    
    if (!nuevoEstado) {
      Alert.alert('Error', 'No se puede avanzar más este pedido');
      return;
    }

    // ✅ Confirmación solo para estados críticos
    const requiereConfirmacion = ['CADETEENDESTINO'].includes(estado);
    
    const ejecutarAvance = () => {
      setLoading(true);
      
      Meteor.call(
        'comercio.pedidos.avanzar',
        { idPedido: venta._id, idCadete: user?._id },
        (error, result) => {
          setLoading(false);
          
          if (error) {
            console.error('[CardPedidoComercio] Error al avanzar pedido:', error);
            Alert.alert(
              'Error',
              error.reason || 'No se pudo actualizar el estado del pedido'
            );
          } else {
            console.log('[CardPedidoComercio] Pedido avanzado:', result);
            // Solo mostrar Alert de éxito en entrega final
            if (nuevoEstado === 'ENTREGADO') {
              Alert.alert(
                '✅ Pedido Entregado',
                'El pedido ha sido marcado como entregado exitosamente',
                [{ text: 'OK' }]
              );
            }
          }
        }
      );
    };

    if (requiereConfirmacion) {
      Alert.alert(
        'Confirmar Entrega',
        `¿Confirmas que el pedido fue entregado al cliente?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, entregar', onPress: ejecutarAvance },
        ]
      );
    } else {
      ejecutarAvance();
    }
  }, [estado, venta._id, user?._id]);

  const handleCancelar = useCallback(() => {
    if (estado !== 'PREPARANDO') {
      Alert.alert('Error', 'Solo se puede cancelar en estado PREPARANDO');
      return;
    }

    Alert.alert(
      'Confirmar Cancelación',
      '¿Estás seguro de cancelar este pedido?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            
            Meteor.call(
              'comercio.pedidos.cancelar',
              { idPedido: venta._id, idCadete: user?._id, motivo: 'Cancelado por cadete' },
              (error, result) => {
                setLoading(false);
                
                if (error) {
                  console.error('[CardPedidoComercio] Error al cancelar pedido:', error);
                  Alert.alert(
                    'Error',
                    error.reason || 'No se pudo cancelar el pedido'
                  );
                } else {
                  console.log('[CardPedidoComercio] Pedido cancelado:', result);
                  Alert.alert('Cancelado', 'El pedido ha sido cancelado');
                }
              }
            );
          },
        },
      ]
    );
  }, [estado, venta._id, user?._id]);

  return (
    <Card style={styles.card} elevation={0}>
      <Card.Title
        title={tienda?.title || (tiendaReady ? 'Tienda no encontrada' : 'Cargando tienda...')}
        subtitle={tienda?.descripcion || ''}
        left={(props) => <IconButton {...props} icon="store-check-outline" />}
        right={(props) => (
          <Chip
            {...props}
            mode="flat"
            textStyle={styles.estadoText}
            style={[
              styles.estadoChip,
              { backgroundColor: sliderConfig.backgroundColor || COLORES_ESTADO[estado] },
            ]}>
            {sliderConfig.textoPedido || obtenerTextoEstado(estado)}
          </Chip>
        )}
      />

      <Card.Content>
        {/* ID de la compra */}
        <View style={styles.idContainer}>
          <Text variant="labelSmall" style={styles.idLabel}>
            ID de la compra:
          </Text>
          <Text variant="bodySmall" style={styles.idValue}>
            {venta._id}
          </Text>
        </View>

        <Divider style={styles.dividerThin} />

        <Text variant="bodyLarge" style={styles.sectionTitle}>
          📦 Productos:
        </Text>
        {comprasEnCarrito.map((item, index) => (
          <Text key={index} variant="bodySmall">
            • {item.producto?.name || 'Producto sin nombre'} x{' '}
            {item.cantidad || 1} = {formatearPrecio(
              (item.producto?.precio || 0) * (item.cantidad || 1),
              item.producto?.monedaPrecio
            )}
          </Text>
        ))}

        <Divider style={styles.divider} />

        {/* Estado de Pago */}
        <View style={styles.pagoContainer}>
          <Text variant="labelSmall" style={styles.idLabel}>
            Estado de pago:
          </Text>
          {isCobrado ? (
            <Chip
              mode="flat"
              textStyle={styles.chipPagadoText}
              style={styles.chipPagado}
              icon="check-circle">
              PAGADO
            </Chip>
          ) : (
            <Chip
              mode="flat"
              textStyle={styles.chipPendienteText}
              style={styles.chipPendiente}
              icon="clock-alert">
              PENDIENTE DE PAGO
            </Chip>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Desglose de costos: SOLO si NO está pagado */}
        {!isCobrado && (
          <>
            <View style={styles.totalRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>Subtotal:</Text>
              <Text variant="titleMedium">{formatearPrecio(subtotalProductos, monedaPrecioOficial)}</Text>
            </View>
            {cobroEntrega > 0 && (
              <View style={styles.totalRow}>
                <Text variant="bodyMedium">Costo de entrega:</Text>
                <Text variant="bodyMedium">{formatearPrecio(cobroEntrega, monedaPrecioOficial)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text variant="titleLarge" style={styles.totalLabel}>TOTAL A PAGAR:</Text>
              <Text variant="titleLarge" style={{ color: '#FF9800', fontWeight: 'bold' }}>
                {formatearPrecio(precioOficial, monedaPrecioOficial)}
              </Text>
            </View>

            <Divider style={styles.divider} />
          </>
        )}

        {/* Si ya está cobrado, mostrar monto pagado */}
        {isCobrado && (
          <>
            <View style={styles.totalRow}>
              <Text variant="titleLarge" style={styles.totalLabel}>Monto pagado:</Text>
              <Text variant="titleLarge" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                {formatearPrecio(cobrado, monedaCobrado)}
              </Text>
            </View>
            <Divider style={styles.divider} />
          </>
        )}

        {comentario && comentario.trim() !== '' && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              💬 Nota del cliente:
            </Text>
            <Text variant="bodyMedium">{comentario}</Text>
            <Divider style={styles.divider} />
          </>
        )}

        <MapaPedidos puntoPartida={tienda} puntoAIr={coordenadas} />

        {/* ✅ NUEVO: Ubicación con botón a la derecha */}
        <View style={styles.ubicacionSection}>
          <View style={styles.coordenadasContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📍 Ubicación de entrega:
            </Text>
            <Text variant="bodySmall" style={styles.coordText}>
              Lat: {coordenadas.latitude?.toFixed(6) || 'N/A'}
            </Text>
            <Text variant="bodySmall" style={styles.coordText}>
              Lng: {coordenadas.longitude?.toFixed(6) || 'N/A'}
            </Text>
          </View>
          
          <IconButton
            icon="map-marker-radius"
            mode="contained"
            onPress={handleGoToLocation}
            containerColor={COLORES_ESTADO[estado]}
            iconColor="#fff"
            size={28}
            style={styles.mapButton}
          />
        </View>
      </Card.Content>

      {/* ✅ NUEVO: Acciones solo con slider o badge */}
      <Card.Actions style={styles.actions}>
        {estado !== 'ENTREGADO' && (
          <View style={styles.sliderContainer}>
            <SlideToConfirm
              onConfirm={handleAvanzar}
              backgroundColor={sliderConfig.backgroundColor}
              icon={sliderConfig.icon}
              text={sliderConfig.text}
              disabled={loading}
            />
          </View>
        )}
        
        {estado === 'ENTREGADO' && (
          <View style={styles.entregadoContainer}>
            <View style={styles.entregadoIconWrapper}>
              <Text style={styles.entregadoIcon}>✔︎</Text>
            </View>
            <Text variant="bodyLarge" style={styles.entregadoText}>
              Pedido Entregado
            </Text>
          </View>
        )}
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  estadoChip: {
    marginRight: 8,
  },
  estadoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  coordText: {
    color: '#666',
    fontFamily: 'monospace',
  },
  actions: {
    paddingHorizontal: 16, // ✅ Aumentado de 8 a 16
    paddingVertical: 8,
    justifyContent: 'center', // ✅ Centrado
    alignItems: 'stretch', // ✅ Stretch para ocupar ancho completo
  },
  sliderContainer: {
    width: '100%', // ✅ Ocupa ancho completo
  },
  entregadoContainer: {
    width: '100%', // ✅ Ocupa ancho completo
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  entregadoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entregadoIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  entregadoText: {
    flex: 1,
    fontWeight: '600',
    color: '#2E7D32',
  },
  idContainer: {
    flexDirection: 'column',
    alignItems: 'left',
    marginBottom: 8,
    paddingVertical: 4,
  },
  idLabel: {
    marginRight: 6,
    fontWeight: '600',
  },
  idValue: {
    fontFamily: 'monospace',
    flex: 1,
    fontSize: 11,
  },
  dividerThin: {
    marginVertical: 8,
  },
  pagoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chipPagado: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 40,
  },
  chipPagadoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  chipPendiente: {
    backgroundColor: '#FF9800',
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 40,
  },
  chipPendienteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  // ✅ NUEVO: Sección de ubicación con botón
  ubicacionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 12,
  },
  coordenadasContainer: {
    flex: 1,
  },
  mapButton: {
    margin: 0,
  },
});

export default React.memo(CardPedidoComercio);
