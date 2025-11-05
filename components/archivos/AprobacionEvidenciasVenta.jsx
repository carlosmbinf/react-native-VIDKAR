import React, { useMemo, useState, useRef } from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet, Alert, Animated } from 'react-native';
import { Card, Text, Chip, Divider, Button, ActivityIndicator, IconButton, Surface, Badge } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import moment from 'moment';
import DrawerBottom from '../drawer/DrawerBottom';
import { EvidenciasVentasEfectivoCollection, VentasRechargeCollection } from '../collections/collections';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';

const ESTADOS = {
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
  PENDIENTE: 'PENDIENTE'
};

const mapEvidenciaDoc = (e, i) => {
  const aprobado = !!e.aprobado;
  const cancelFlag = !!(
    e.cancelado ||
    e.cancelada ||
    e.isCancelada ||
    e.estado === 'CANCELADA'
  );
  const rechazadoFlag = !!(
    e.rechazado ||
    e.denegado ||
    e.estado === ESTADOS.RECHAZADA ||
    e.estado === 'RECHAZADA'
  );
  const rechazado = cancelFlag || rechazadoFlag;

  let estado = ESTADOS.PENDIENTE;
  if (rechazado) estado = ESTADOS.RECHAZADA;
  else if (aprobado) estado = ESTADOS.APROBADA;

  return {
    _idx: i,
    _id: e._id,
    base64: e.base64 || e.dataBase64 || e.data || e.dataB64,
    aprobado,
    rechazado,
    estado,
    createdAt: e.createdAt || e.fecha || null,
    size: e.size || 0,
    descripcion: e.descripcion || '',
    raw: e
  };
};

// NUEVO: Utility para formatear moneda
const formatCurrency = (amount, currency = 'CUP') => {
  const num = parseFloat(amount) || 0;
  return `${num.toLocaleString('es-CU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
};

// NUEVO: Utility para convertir MB a GB
const megasToGB = (megas) => {
  if (!megas || megas === 0) return '0 GB';
  const gb = megas / 1024;
  return gb >= 1 ? `${gb.toFixed(0)} GB` : `${megas} MB`;
};

// NUEVO: Configuración de colores por tipo de producto
const PRODUCT_COLORS = {
  PROXY: { primary: '#2196F3', bg: '#E3F2FD', icon: 'wifi' },
  VPN: { primary: '#4CAF50', bg: '#E8F5E9', icon: 'shield-check' },
  RECARGA: { primary: '#FF6F00', bg: 'rgba(255, 111, 0, 0.12)', icon: 'cellphone' },
  REMESA: { primary: '#9C27B0', bg: 'rgba(156, 39, 176, 0.12)', icon: 'cash' }
};

// ✅ CORREGIDO: Zoom gradual + Pan simultáneo con gestión correcta de offsets
const ZoomableImage = ({ uri, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const lastTapTime = useRef(0);

  const pinchRef = useRef(null);
  const panRef = useRef(null);

  const MAX_SCALE = 5;
  const MIN_SCALE = 1;

  // Tamaño aproximado de la imagen (puedes ajustarlo según tus dimensiones reales)
  const IMAGE_WIDTH = 400;
  const IMAGE_HEIGHT = 400;

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // ✅ Calcular nueva escala acumulada
      const newScale = lastScale.current * event.nativeEvent.scale;
      
      if (newScale < 1) {
        // Reset completo si zoom < 1x
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
        
        // ✅ Limpiar offsets antes de animar
        translateX.flattenOffset();
        translateY.flattenOffset();
        
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
          Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false }),
        ]).start();
      } else if (newScale > 5) {
        // Limitar a 5x
        lastScale.current = 5;
        // ✅ Ajustar offset de scale para próximo gesto
        scale.setOffset(lastScale.current);
        scale.setValue(1);
      } else {
        // ✅ Guardar escala acumulada
        lastScale.current = newScale;
        // ✅ Setear offset y resetear valor para próximo gesto
        scale.setOffset(lastScale.current);
        scale.setValue(1);
      }
    }
  };

  const clampedTranslateX = Animated.diffClamp(translateX, -IMAGE_WIDTH, IMAGE_WIDTH);
  const clampedTranslateY = Animated.diffClamp(translateY, -IMAGE_HEIGHT, IMAGE_HEIGHT);
  
  const onPanEvent = Animated.event(
    [{
      nativeEvent: {
        translationX: clampedTranslateX,
        translationY: clampedTranslateY,
      },
    }],
    { useNativeDriver: true }
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (lastScale.current > 1) {
        // ✅ Calcular límites según escala
        const maxOffsetX = (IMAGE_WIDTH * (lastScale.current - 1)) / 2;
        const maxOffsetY = (IMAGE_HEIGHT * (lastScale.current - 1)) / 2;
      
        lastTranslateX.current = Math.min(
          Math.max(lastTranslateX.current + event.nativeEvent.translationX, -maxOffsetX),
          maxOffsetX
        );
      
        lastTranslateY.current = Math.min(
          Math.max(lastTranslateY.current + event.nativeEvent.translationY, -maxOffsetY),
          maxOffsetY
        );
      
        translateX.setOffset(lastTranslateX.current);
        translateY.setOffset(lastTranslateY.current);
        translateX.setValue(0);
        translateY.setValue(0);
      } else {
        // Si no hay zoom, resetear posición
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
        
        translateX.flattenOffset();
        translateY.flattenOffset();
        
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
      }
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      if (lastScale.current > 1) {
        // Reset completo
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
        
        // ✅ Limpiar todos los offsets
        scale.flattenOffset();
        translateX.flattenOffset();
        translateY.flattenOffset();
        
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
      } else {
        // Zoom in a 2.5x
        lastScale.current = 2.5;
        scale.flattenOffset();
        Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
      }
    }
    lastTapTime.current = now;
  };

  return (
    <Pressable onPress={handleDoubleTap} style={styles.imageContainer}>
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
        minPointers={1}
        maxPointers={2}
        simultaneousHandlers={pinchRef}
      >
        <Animated.View style={{ flex: 1, width: '100%', height: '100%' }}>
          <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
            simultaneousHandlers={panRef}
          >
            <Animated.View style={{ flex: 1, width: '100%', height: '100%' }}>
              <Animated.Image
                source={{ uri }}
                style={[
                  style,
                  {
                    transform: [
                      { translateX: translateX },
                      { translateY: translateY },
                      { scale: scale }
                    ]
                  }
                ]}
                resizeMode="contain"
              />
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </Pressable>
  );
};


const AprobacionEvidenciasVenta = ({ venta, onAprobar, onRechazar, onVentaAprobada, loadingIds = [] }) => {
  if (!venta) return null;
  const ventaId = venta._id;
  const [preview, setPreview] = useState(null);
  const [aprobandoVenta, setAprobandoVenta] = useState(false);
  const [rechazandoVenta, setRechazandoVenta] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const evidenciasSubsc = useTracker(() => {
    Meteor.subscribe('evidenciasVentasEfectivoRecharge', { ventaId });
    return EvidenciasVentasEfectivoCollection.find({ ventaId }, { sort: { createdAt: -1 } }).fetch();
  }, [ventaId]);

  const evidencias = useMemo(() => {
    const raw = Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [];
    return raw
      .map(mapEvidenciaDoc)
      .filter(e => !!e.base64);
  }, [evidenciasSubsc]);

  const carritosAgrupados = useMemo(() => {
    const lista = venta?.producto?.carritos || [];
    return {
      proxy: lista.filter(c => c?.type === 'PROXY'),
      vpn: lista.filter(c => c?.type === 'VPN'),
      recarga: lista.filter(c => c?.type === 'RECARGA'),
      remesa: lista.filter(c => c?.type === 'REMESA')
    };
  }, [venta]);

  const totalItems = useMemo(() => {
    return Object.values(carritosAgrupados).reduce((sum, arr) => sum + arr.length, 0);
  }, [carritosAgrupados]);

  const resumenVenta = useMemo(() => {
    const items = [];
    if (carritosAgrupados.proxy.length) items.push(`${carritosAgrupados.proxy.length} Proxy`);
    if (carritosAgrupados.vpn.length) items.push(`${carritosAgrupados.vpn.length} VPN`);
    if (carritosAgrupados.recarga.length) items.push(`${carritosAgrupados.recarga.length} Recarga${carritosAgrupados.recarga.length > 1 ? 's' : ''}`);
    if (carritosAgrupados.remesa.length) items.push(`${carritosAgrupados.remesa.length} Remesa${carritosAgrupados.remesa.length > 1 ? 's' : ''}`);
    return items.join(' • ') || 'Sin productos';
  }, [carritosAgrupados]);

  const existeAprobada = evidencias.some(ev => !!ev.aprobado);
  const ventaYaEntregada = venta?.estado === 'ENTREGADO' || venta?.estado === 'PAGADA' || venta?.estado === 'COMPLETADA';
  const ventaRechazada = venta?.estado === 'RECHAZADA' || venta?.isCancelada;
  const canApproveSale = existeAprobada && !ventaYaEntregada && !ventaRechazada;

  // RESTAURADO: Handler para aprobar venta
  const handleAprobarVenta = () => {
    if (!canApproveSale || aprobandoVenta) return;
    Alert.alert(
      'Aprobar venta',
      'Se aprobará la venta y se procesarán sus carritos. ¿Desea continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: () => {
            setAprobandoVenta(true);
            Meteor.call('ventas.aprobarVenta', venta._id, {}, (err, res) => {
              setAprobandoVenta(false);
              if (err) {
                Alert.alert('Error', err.reason || 'No se pudo aprobar la venta');
                return;
              }
              Alert.alert('Éxito', res?.message || 'Venta aprobada correctamente');
              onVentaAprobada && onVentaAprobada(res);
            });
          },
          style: 'destructive'
        }
      ]
    );
  };

  // RESTAURADO: Handler para rechazar venta
  const handleRechazarVenta = () => {
    if (rechazandoVenta || ventaYaEntregada || ventaRechazada) return;
    Alert.alert(
      'Rechazar venta',
      'Esta acción marcará la venta como RECHAZADA. ¿Confirmar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => {
            setRechazandoVenta(true);
            VentasRechargeCollection.update(
              ventaId,
              {
                $set: {
                  isCancelada: true,
                }
              },
              (err) => {
                setRechazandoVenta(false);
                if (err) {
                  Alert.alert('Error', err.reason || 'No se pudo rechazar la venta');
                  return;
                }
                Alert.alert('Listo', 'Venta rechazada.');
                onVentaAprobada && onVentaAprobada({ _id: venta._id, estado: 'RECHAZADA' });
              }
            );
          }
        }
      ]
    );
  };

  const abrirPreview = (ev) => setPreview(ev);
  const cerrarPreview = () => setPreview(null);

  const handleAprobar = () => {
    if (!preview) return;
    if (preview.aprobado || preview.rechazado) return;
    Meteor.call('archivos.aprobarEvidencia', preview._id, null, (error, success) => {
      if (error) {
        Alert.alert('Error', error.reason || 'No se pudo aprobar la evidencia.');
        return;
      }
      if (success) {
        onAprobar && onAprobar(preview);
      }
    });
  };

  const confirmarRechazo = () => {
    Meteor.call('archivos.denegarEvidencia', preview._id, null, (error, success) => {
      if (error) {
        Alert.alert('Error', error.reason || 'No se pudo rechazar la evidencia.');
        return;
      }
      if (success) {
        onRechazar && onRechazar(preview);
        Alert.alert('Listo', 'Evidencia rechazada.');
      }
    });
  };

  const handleRechazar = () => {
    if (!preview) return;
    if (preview.aprobado || preview.rechazado) return;
    Alert.alert(
      'Confirmar rechazo',
      '¿Desea marcar esta evidencia como rechazada? Esta acción puede requerir nueva subida del usuario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rechazar', style: 'destructive', onPress: confirmarRechazo }
      ]
    );
  };

  const renderProductCard = (carrito, idx, type) => {
    const config = PRODUCT_COLORS[type];
    const borderColor = config.primary;
    
    if (type === 'PROXY' || type === 'VPN') {
      const esPorTiempo = carrito.esPorTiempo || carrito.megas === null;
      return (
        <Surface key={carrito._id} style={[styles.miniCard, { borderLeftColor: borderColor }]} elevation={1}>
          <View style={styles.miniCardHeader}>
            <IconButton icon={config.icon} iconColor={config.primary} size={18} style={styles.miniIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>{type}</Text>
              <Text style={styles.miniCardUser}>{carrito.nombre || 'Usuario'}</Text>
            </View>
            {esPorTiempo ? (
              <View style={styles.unlimitedBadge}>
                <IconButton icon="infinity" iconColor="#FFD700" size={16} style={{ margin: 0 }} />
                <Text style={styles.unlimitedText}>ILIMITADO</Text>
              </View>
            ) : (
              <Chip icon="database" compact textStyle={{ fontSize: 11, fontWeight: '700' }} >
                {megasToGB(carrito.megas)}
              </Chip>
            )}
          </View>
          <View style={styles.miniCardRow}>
            <IconButton icon="currency-usd" size={14} iconColor="#666" style={styles.miniRowIcon} />
            <Text style={styles.miniCardLabel}>Precio:</Text>
            <Text style={styles.miniCardValue}>{formatCurrency(carrito.cobrarUSD)}</Text>
          </View>
        </Surface>
      );
    }

    if (type === 'RECARGA') {
      const telefono = carrito.movilARecargar || carrito?.extraFields?.mobile_number || '¿?';
      const monto = carrito.producto?.destination?.amount || carrito.comentario?.match(/\d+/)?.[0] || 'N/D';
      const operadora = carrito.producto?.operator?.name || 'CubaCel';
      return (
        <Surface key={carrito._id} style={[styles.miniCard, { borderLeftColor: borderColor }]} elevation={1}>
          <View style={styles.miniCardHeader}>
            <IconButton icon={config.icon} iconColor={config.primary} size={18} style={styles.miniIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>RECARGA</Text>
              <Text style={styles.miniCardUser}>{carrito.nombre || 'Usuario'}</Text>
            </View>
            <Chip icon="phone" compact textStyle={{ fontSize: 11, fontWeight: '700' }} style={{ backgroundColor: config.bg }}>
              {monto} CUP
            </Chip>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton icon="cellphone" size={14} iconColor="#666" style={styles.miniRowIcon} />
            <Text style={styles.miniCardLabel}>Teléfono:</Text>
            <Text style={styles.miniCardValue}>{telefono}</Text>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton icon="sim" size={14} iconColor="#666" style={styles.miniRowIcon} />
            <Text style={styles.miniCardLabel}>Operadora:</Text>
            <Text style={styles.miniCardValue}>{operadora}</Text>
          </View>
        </Surface>
      );
    }

    if (type === 'REMESA') {
      return (
        <Surface key={carrito._id} style={[styles.miniCard, { borderLeftColor: borderColor }]} elevation={1}>
          <View style={styles.miniCardHeader}>
            <IconButton icon={config.icon} iconColor={config.primary} size={18} style={styles.miniIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>REMESA</Text>
              <Text style={styles.miniCardUser}>{carrito.nombre || 'Usuario'}</Text>
            </View>
            <Chip icon="cash" compact textStyle={{ fontSize: 11, fontWeight: '700' }} style={{ backgroundColor: config.bg }}>
              {formatCurrency(carrito.recibirEnCuba || 0, carrito.monedaRecibirEnCuba)}
            </Chip>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton icon="map-marker" size={14} iconColor="#666" style={styles.miniRowIcon} />
            <Text style={styles.miniCardLabel}>Dirección:</Text>
            <Text style={styles.miniCardValue} numberOfLines={1} ellipsizeMode="tail">
              {carrito.direccionCuba || 'No especificada'}
            </Text>
          </View>
          {carrito.tarjetaCUP && (
            <View style={styles.miniCardRow}>
              <IconButton icon="credit-card-outline" size={14} iconColor="#666" style={styles.miniRowIcon} />
              <Text style={styles.miniCardLabel}>Tarjeta:</Text>
              <Text style={styles.miniCardValue}>{carrito.tarjetaCUP}</Text>
            </View>
          )}
        </Surface>
      );
    }

    return null;
  };

  const miniBase64 = evidencias[0]?.base64;
  const cargando = !evidenciasSubsc;

  return (
    <Card style={styles.card}>
      <Card.Title
        title={
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Venta #{ventaId.slice(-6).toUpperCase()}</Text>
            {ventaRechazada && <Badge style={styles.badgeRechazada}>RECHAZADA</Badge>}
            {ventaYaEntregada && <Badge style={styles.badgeEntregada}>FINALIZADA</Badge>}
          </View>
        }
        subtitle={
          <View style={styles.subtitleRow}>
            <IconButton icon="account" size={14} iconColor="#666" style={{ margin: 0, padding: 0 }} />
            <Text style={styles.subtitle}>{venta.userId || 'Usuario N/D'}</Text>
            <Text style={[styles.subtitle, { marginLeft: 8 }]}>• {totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
          </View>
        }
        right={(props) => (
          <IconButton
            {...props}
            icon={expanded ? 'chevron-up' : 'chevron-down'}
            onPress={() => setExpanded(v => !v)}
            accessibilityLabel={expanded ? 'Colapsar venta' : 'Expandir venta'}
          />
        )}
      />

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <IconButton icon="package-variant" size={16} iconColor="#666" style={styles.summaryIcon} />
          <Text style={styles.summaryText}>{resumenVenta}</Text>
        </View>
        <View style={styles.summaryItem}>
          <IconButton icon="currency-usd" size={16} iconColor="#1976D2" style={styles.summaryIcon} />
          <Text style={[styles.summaryText, { fontWeight: '700', color: '#1976D2' }]}>
            {formatCurrency(venta.cobrado, venta.monedaCobrado)}
          </Text>
        </View>
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <IconButton icon="calendar" size={16} iconColor="#666" style={styles.summaryIcon} />
          <Text style={styles.summaryText}>
            {venta.createdAt ? moment(venta.createdAt).format('DD/MM/YYYY HH:mm') : 'Fecha N/D'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <IconButton icon="credit-card" size={16} iconColor="#666" style={styles.summaryIcon} />
          <Text style={styles.summaryText}>{venta.metodoPago || 'Método N/D'}</Text>
        </View>
      </View>

      {expanded && (
        <Card.Content>
          <Divider style={styles.divider} />

          {miniBase64 && (
            <Surface style={styles.evidencePreview} elevation={2}>
              <Image source={{ uri: `data:image/jpeg;base64,${miniBase64}` }} style={styles.evidenceThumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.evidenceLabel}>Última evidencia subida</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Chip icon="file-image" compact textStyle={{ fontSize: 10 }}>
                    {evidencias.length} evidencia{evidencias.length !== 1 ? 's' : ''}
                  </Chip>
                  <Text style={[styles.evidenceSub, { marginLeft: 8 }]}>
                    {evidencias[0].createdAt ? moment(evidencias[0].createdAt).fromNow() : ''}
                  </Text>
                </View>
              </View>
            </Surface>
          )}

          <Text style={styles.sectionTitle}>Productos de la venta</Text>
          <ScrollView style={styles.productsScroll} nestedScrollEnabled>
            {carritosAgrupados.proxy.map((c, i) => renderProductCard(c, i, 'PROXY'))}
            {carritosAgrupados.vpn.map((c, i) => renderProductCard(c, i, 'VPN'))}
            {carritosAgrupados.recarga.map((c, i) => renderProductCard(c, i, 'RECARGA'))}
            {carritosAgrupados.remesa.map((c, i) => renderProductCard(c, i, 'REMESA'))}
          </ScrollView>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Evidencias de Pago</Text>

          {cargando && evidencias.length === 0 ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator />
              <Text style={styles.emptyText}>Cargando evidencias...</Text>
            </View>
          ) : evidencias.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollRow}
            >
              {evidencias.map(ev => {
                const uri = `data:image/jpeg;base64,${ev.base64}`;
                const isLoading = loadingIds.includes(ev._id);
                const borderStyle = ev.rechazado
                  ? styles.borderRechazado
                  : ev.aprobado
                    ? styles.borderAprobado
                    : styles.borderPendiente;
                const badgeText =
                  ev.rechazado ? 'CANC' : ev.aprobado ? 'OK' : 'PEND';
                return (
                  <Pressable
                    key={ev._id}
                    style={[styles.thumbContainer, borderStyle]}
                    onPress={() => abrirPreview(ev)}
                  >
                    <Image source={{ uri }} style={styles.thumb} />
                    {isLoading && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                    <View style={styles.badgeEstado}>
                      <Text
                        testID={`badge-estado-${ev.estado}`}
                        accessibilityLabel={`Estado evidencia ${ev.estado}`}
                        style={[
                          styles.badgeText,
                          ev.aprobado && styles.badgeTextOk,
                          ev.rechazado && styles.badgeTextDenied
                        ]}
                      >
                        {badgeText}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No hay evidencias subidas.</Text>
          )}

          <Divider style={styles.divider} />
          
          <View style={styles.actionsContainer}>
            <Button
              mode="outlined"
              onPress={handleRechazarVenta}
              disabled={rechazandoVenta || ventaRechazada || ventaYaEntregada || !Meteor?.user()?.permitirAprobacionEfectivoCUP}
              icon="close-octagon"
              style={styles.rejectButton}
              color="#e53935"
            >
              {rechazandoVenta ? 'Rechazando...' : 'Rechazar Venta'}
            </Button>
            <Button
              mode="contained"
              onPress={handleAprobarVenta}
              disabled={!canApproveSale || aprobandoVenta || !Meteor?.user()?.permitirAprobacionEfectivoCUP}
              icon="check-decagram"
              style={styles.approveButton}
              contentStyle={{ height: 44 }}
            >
              {aprobandoVenta ? 'Procesando...' : 'Aprobar Venta'}
            </Button>
          </View>
        </Card.Content>
      )}

      {expanded && (
        <DrawerBottom
          open={!!preview}
          onClose={cerrarPreview}
          title={preview ? `Evidencia ${preview._idx + 1}` : ''}
          side="bottom"
          actions={[
            preview
              ? preview.rechazado
                ? { icon: 'close-octagon', disabled: true }
                : preview.aprobado
                  ? { icon: 'check-decagram', disabled: true }
                  : { icon: 'clock-outline', disabled: true }
              : {}
          ]}
        >
          {preview && (
            <View style={styles.previewWrapper}>
              <ZoomableImage
                uri={`data:image/jpeg;base64,${preview.base64}`}
                style={styles.previewImage}
              />
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  {preview.estado === ESTADOS.APROBADA && (
                    <Chip
                      mode="outlined"
                      compact
                      icon="check"
                      style={[styles.chipOk]}
                      textStyle={styles.chipText}
                    >
                      Aprobada
                    </Chip>
                  )}
                  {preview.estado === ESTADOS.RECHAZADA && (
                    <Chip
                      mode="outlined"
                      compact
                      icon="close-octagon"
                      style={styles.chipDenied}
                      textStyle={styles.chipText}
                    >
                      Rechazada
                    </Chip>
                  )}
                  {preview.estado === ESTADOS.PENDIENTE && (
                    <Chip
                      mode="outlined"
                      compact
                      icon="progress-clock"
                      style={styles.chipPending}
                      textStyle={styles.chipText}
                    >
                      Pendiente
                    </Chip>
                  )}
                  <Text style={styles.fechaText}>
                    {preview.createdAt
                      ? moment(preview.createdAt).format('DD/MM/YYYY HH:mm')
                      : 'Sin fecha'}
                  </Text>
                </View>
                {!!preview.size && (
                  <Text style={styles.sizeText}>
                    Tamaño: {(preview.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
                {!!preview.descripcion && (
                  <Text style={styles.descText}>{preview.descripcion}</Text>
                )}

                <View style={styles.actionsRow}>
                  {preview.estado === ESTADOS.PENDIENTE && (
                    <>
                      <Button
                        mode="contained"
                        icon="check"
                        onPress={handleAprobar}
                        style={styles.actionBtn}
                      >
                        Aprobar
                      </Button>
                      <Button
                        mode="outlined"
                        icon="close"
                        onPress={handleRechazar}
                        style={styles.actionBtn}
                        textColor="#c62828"
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {preview.estado === ESTADOS.APROBADA && (
                    <Text style={styles.aprobadaInfo}>Ya aprobada</Text>
                  )}
                  {preview.estado === ESTADOS.RECHAZADA && (
                    <Text style={styles.rechazadaInfo}>Rechazada</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </DrawerBottom>
      )}
    </Card>
  );
};

export default AprobacionEvidenciasVenta;

const styles = StyleSheet.create({
  card: { marginHorizontal: 10, marginVertical: 15, elevation: 10, borderRadius: 12, padding:10 },
  
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  badgeRechazada: { marginLeft: 8, backgroundColor: '#e74c3c', fontSize: 9 },
  badgeEntregada: { marginLeft: 8, backgroundColor: '#2e7d32', fontSize: 9 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subtitle: { fontSize: 11 },

  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { margin: 0, padding: 0 },
  summaryText: { fontSize: 11, marginLeft: 4 },

  divider: { marginVertical: 12 },

  evidencePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    // backgroundColor: '#fafafa'
  },
  evidenceThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' },
  evidenceLabel: { fontSize: 12, fontWeight: '600'},
  evidenceSub: { fontSize: 10, color: '#888' },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  productsScroll: { maxHeight: 300, marginBottom: 12 },
  miniCard: {
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    // backgroundColor: '#fff'
  },
  miniCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  miniIcon: { margin: 0, padding: 0 },
  miniCardTitle: { fontSize: 12, fontWeight: '700' },
  miniCardUser: { fontSize: 10, marginTop: 2 },
  miniCardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, minHeight: 20 },
  miniRowIcon: { margin: 0, padding: 0, marginRight: 4 },
  miniCardLabel: { fontSize: 10, marginRight: 6 },
  miniCardValue: { fontSize: 10, fontWeight: '600', flex: 1 },
  unlimitedBadge: { flexDirection: 'row', alignItems: 'center' },
  unlimitedText: { fontSize: 9, fontWeight: '900', color: '#FFD700', marginLeft: -4 },

  scrollRow: { paddingVertical: 4 },
  thumbContainer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  thumb: { width: '100%', height: '100%' },
  borderAprobado: { borderWidth: 2, borderColor: '#2ecc71' },
  borderPendiente: { borderWidth: 2, borderColor: '#f1c40f' },
  borderRechazado: { borderWidth: 2, borderColor: '#e74c3c' },
  badgeEstado: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#00000088',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  badgeTextOk: { color: '#2ecc71' },
  badgeTextDenied: { color: '#e74c3c' },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center'
  },

  emptyBox: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#777', marginTop: 6 },

  previewWrapper: { paddingBottom: 10 },
  imageContainer: { 
    width: '100%', 
    height: 500, 
    backgroundColor: '#000', 
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewImage: { 
    width: '100%', 
    height: '100%'
  },
  metaBox: { marginTop: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipOk: { borderColor: '#2ecc71' },
  chipPending: { borderColor: '#f1c40f' },
  chipDenied: { borderColor: '#e74c3c' },
  chipText: { fontSize: 11 },
  fechaText: { fontSize: 11, color: '#555' },
  sizeText: { fontSize: 11, color: '#555', marginTop: 6 },
  descText: {
    fontSize: 12,
    color: '#333',
    marginTop: 10,
    backgroundColor: '#f1f3f5',
    padding: 8,
    borderRadius: 6
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  actionBtn: { marginRight: 10 },
  aprobadaInfo: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  rechazadaInfo: { fontSize: 12, color: '#e74c3c', fontWeight: '600' },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingTop: 8
  },
  rejectButton: {
    flex: 1,
    borderColor: '#e53935',
    borderWidth: 1.5,
    borderRadius:22
  },
  approveButton: {
    flex: 1,
    borderRadius:22
  },
});
