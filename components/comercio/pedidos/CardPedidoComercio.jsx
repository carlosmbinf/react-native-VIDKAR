import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import { Card, Button, IconButton, Text, Chip, Divider } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';

// Importar collections (ajustar path según tu estructura)

import {
  COLORES_ESTADO,
  LABELS_BOTON_ESTADO,
  obtenerSiguienteEstado,
  calcularTotalPedido,
  formatearPrecio,
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

  if (!ventaProp.coordenadas || typeof ventaProp.coordenadas.latitude !== 'number') {
    console.warn('[CardPedidoComercio] coordenadas inválidas', ventaProp.coordenadas);
    return null;
  }

  const venta = ventaProp;

  const {
    pagado = false,
    status = 'PREPARANDO',
    comprasEnCarrito = [],
    comentario = '',
    cobroEntrega = 0,
    coordenadas = { latitude: 0, longitude: 0 }
  } = venta;

  // Extraer idTienda del primer producto (asumiendo todos de la misma tienda)
  const idTienda = useMemo(
    () => comprasEnCarrito?.[0]?.idTienda || null,
    [comprasEnCarrito]
  );

  // Suscripción reactiva a la tienda
  const { tienda, tiendaReady } = useTracker(() => {
    console.log("[CardPedidoComercio] Suscribiéndose a tienda con id:", idTienda);
    if (!idTienda) return { tienda: null, tiendaReady: false };
    
    const handler = Meteor.subscribe('tiendas', {_id: idTienda });
    

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

  // Determinar label del botón según estado
  const buttonLabel = useMemo(() => {
    return LABELS_BOTON_ESTADO[status] || 'AVANZAR';
  }, [status]);

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
    const nuevoEstado = obtenerSiguienteEstado(status);
    
    if (!nuevoEstado) {
      Alert.alert('Error', 'No se puede avanzar más este pedido');
      return;
    }

    Alert.alert(
      'Confirmar Acción',
      `¿Cambiar estado a ${nuevoEstado}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setLoading(true);
            
            Meteor.call(
              'comercio.pedidos.avanzar',
              { idPedido: pedido._id, idCadete: user?._id },
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
  }, [status, pedido._id, user?._id]);

  const handleCancelar = useCallback(() => {
    if (status !== 'PREPARANDO') {
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
              { idPedido: pedido._id, idCadete: user?._id, motivo: 'Cancelado por cadete' },
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
  }, [status, pedido._id, user?._id]);

  const total = useMemo(() => calcularTotalPedido(venta), [venta]);

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
              { backgroundColor: COLORES_ESTADO[status] },
            ]}>
            {status}
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
          {pagado ? (
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
        {!pagado && (
          <>
            <View style={styles.totalRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>Subtotal:</Text>
              <Text variant="titleMedium">{formatearPrecio(total - cobroEntrega)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Costo de entrega:</Text>
              <Text variant="bodyMedium">{formatearPrecio(cobroEntrega)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text variant="titleLarge" style={styles.totalLabel}>TOTAL A PAGAR:</Text>
              <Text variant="titleLarge" style={{ color: '#FF9800', fontWeight: 'bold' }}>
                {formatearPrecio(total)}
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
        {/* Mostrar coordenadas (sin mapa por ahora) */}
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
          containerColor={COLORES_ESTADO[status]}
          iconColor="#fff"
        />
        <Button
          mode="outlined"
          disabled={status !== 'PREPARANDO' || loading}
          onPress={handleCancelar}
          textColor="#F44336">
          Cancelar
        </Button>
        <Button
          mode="contained"
          loading={loading}
          disabled={loading || status === 'ENTREGADO'}
          onPress={handleAvanzar}
          buttonColor={COLORES_ESTADO[status]}>
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
