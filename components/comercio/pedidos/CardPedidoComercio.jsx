import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
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

const CardPedidoComercio = ({ pedido, venta: ventaProp, navigation }) => {
  const [loading, setLoading] = useState(false);

  // Validaciones defensivas
  if (!ventaProp) {
    console.warn('[CardPedidoComercio] venta es undefined/null');
    return null;
  }

  const venta = ventaProp;

  // Extraer datos de la estructura real de venta
  const {
    estado = 'PREPARANDO', // Cambiado de 'status' a 'estado'
    isCobrado = false, // Cambiado de 'pagado' a 'isCobrado'
    cobrado = 0,
    monedaCobrado = 'CUP',
    precioOficial = 0,
    monedaPrecioOficial = 'CUP',
    producto = {},
  } = venta;

  // Extraer carritos del objeto producto
  const comprasEnCarrito = useMemo(
    () => producto?.carritos || [],
    [producto?.carritos]
  );

  // Extraer coordenadas del primer item del carrito
  const coordenadas = useMemo(() => {
    const primerItem = comprasEnCarrito[0];
    if (!primerItem?.coordenadas) {
      console.warn('[CardPedidoComercio] coordenadas no encontradas');
      return null;
    }
    return primerItem.coordenadas;
  }, [comprasEnCarrito]);

  // Validar coordenadas
  if (!coordenadas || typeof coordenadas.latitude !== 'number') {
    console.warn('[CardPedidoComercio] coordenadas inválidas', coordenadas);
    return null;
  }

  // Extraer idTienda del primer producto
  const idTienda = useMemo(
    () => comprasEnCarrito[0]?.idTienda || null,
    [comprasEnCarrito]
  );

  // Extraer comentario del primer item
  const comentario = useMemo(
    () => comprasEnCarrito[0]?.comentario || '',
    [comprasEnCarrito]
  );

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

  // Handlers
  const handleGoToLocation = useCallback(() => {
    if (coordenadas?.latitude && coordenadas?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${coordenadas.latitude},${coordenadas.longitude}`;
      Linking.openURL(url).catch(err => {
        console.error('[CardPedidoComercio] Error al abrir Google Maps:', err);
        Alert.alert('Error', 'No se pudo abrir Google Maps');
      });
    }
  }, [coordenadas]);

  const handleAvanzar = useCallback(() => {
    const nuevoEstado = obtenerSiguienteEstado(estado);
    
    if (!nuevoEstado) {
      Alert.alert('Error', 'No se puede avanzar más este pedido');
      return;
    }

    Alert.alert(
      'Confirmar Acción',
      `¿Cambiar estado a (${obtenerTextoEstado(nuevoEstado)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
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
                  Alert.alert(
                    'Éxito',
                    `Estado actualizado a: ${result.nuevoEstado}`,
                    [{ text: 'OK' }]
                  );
                }
              }
            );
          },
        },
      ]
    );
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
              { backgroundColor: COLORES_ESTADO[estado] },
            ]}>
            {estado}
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

        {/* Mostrar coordenadas */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          📍 Ubicación de entrega:
        </Text>
        <Text variant="bodySmall" style={styles.coordText}>
          Lat: {coordenadas.latitude?.toFixed(6) || 'N/A'}
        </Text>
        <Text variant="bodySmall" style={styles.coordText}>
          Lng: {coordenadas.longitude?.toFixed(6) || 'N/A'}
        </Text>
        
      </Card.Content>

      <Card.Actions style={styles.actions}>
        <IconButton
          icon="map-marker-radius"
          mode="contained"
          onPress={handleGoToLocation}
          containerColor={COLORES_ESTADO[estado]}
          iconColor="#fff"
        />
        <Button
          mode="outlined"
          disabled={estado !== 'PREPARANDO' || loading}
          onPress={handleCancelar}
          textColor="#F44336">
          Cancelar
        </Button>
        <Button
          mode="contained"
          loading={loading}
          disabled={loading || estado === 'ENTREGADO'}
          onPress={handleAvanzar}
          buttonColor={COLORES_ESTADO[estado]}>
          {buttonLabel}
        </Button>
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
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  idContainer: {
    flexDirection: 'column',
    alignItems: 'left',
    marginBottom: 8,
    paddingVertical: 4,
  },
  idLabel: {
    // color: '#666',
    marginRight: 6,
    fontWeight: '600',
  },
  idValue: {
    fontFamily: 'monospace',
    // color: '#333',
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
});

export default React.memo(CardPedidoComercio);
