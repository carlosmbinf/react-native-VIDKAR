import React, { useMemo, useState } from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, Chip, Divider, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import moment from 'moment';
import DrawerBottom from '../drawer/DrawerBottom';
import { EvidenciasVentasEfectivoCollection, VentasRechargeCollection } from '../collections/collections';

/**
 * Props:
 *  - venta
 *  - onAprobar?: (evidencia)
 *  - onRechazar?: (evidencia)
 *  - onVentaAprobada?: (venta)
 *  - loadingIds?: string[]
 */
const ESTADOS = {
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
  PENDIENTE: 'PENDIENTE'
};

const mapEvidenciaDoc = (e, i) => {
  const aprobado = !!e.aprobado;
  // Se amplía la detección de cancelación: algunos documentos pueden venir con 'cancelada' (fem) o 'isCancelada'
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
  // Unificamos (por ahora) cancelada dentro de rechazado para mantener el badge 'CANC'
  const rechazado = cancelFlag || rechazadoFlag;

  let estado = ESTADOS.PENDIENTE;
  if (rechazado) estado = ESTADOS.RECHAZADA; // Nota: si se quiere distinguir CANCELADA, crear ESTADOS.CANCELADA y adaptar badge.
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

const AprobacionEvidenciasVenta = ({ venta, onAprobar, onRechazar, onVentaAprobada, loadingIds = [] }) => {
  if (!venta) return null;
  const ventaId = venta._id;
  const [preview, setPreview] = useState(null);

  // NUEVO: estado para procesar la aprobación de la venta
  const [aprobandoVenta, setAprobandoVenta] = useState(false);
  const [rechazandoVenta, setRechazandoVenta] = useState(false); // NUEVO
  const [expanded, setExpanded] = useState(false); // NUEVO: control de expansión

  // Suscripción de evidencias (igual que en SubidaArchivos)
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

  // NUEVO: recargas (carritos type RECARGA)
  const recargas = useMemo(() => {
    const lista = venta?.producto?.carritos || [];
    return lista.filter(c => c?.type === 'RECARGA');
  }, [venta]);

  // NUEVO: resumen compacto para vista colapsada
  const recargasResumen = useMemo(() => {
    if (!recargas.length) return 'Sin recargas';
    const fmt = r => {
      const telefono = r.movilARecargar || r?.extraFields?.mobile_number || r?.extraFields?.mobileNumber || '¿?';
      const nombre = r.nombre || r.producto?.name || 'Sin Nombre';
      return `${telefono} - ${nombre}`;
    };
    const base = recargas.slice(0, 2).map(fmt).join(', ');
    return recargas.length > 2 ? `${base} +${recargas.length - 2} más` : base;
  }, [recargas]);

  // NUEVO: comprobación para permitir aprobar la venta
  const existeAprobada = evidencias.some(ev => !!ev.aprobado);
  const ventaYaEntregada = venta?.estado === 'ENTREGADO' || venta?.estado === 'ENTREGADO' /* compat */ || venta?.estado === 'PAGADA' || venta?.estado === 'COMPLETADA';
  const ventaRechazada = venta?.estado === 'RECHAZADA'; // NUEVO
  const canApproveSale = existeAprobada && !ventaYaEntregada && !ventaRechazada;

  // NUEVO: handler para aprobar venta con confirmación
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
              // callback opcional para que el componente padre actualice la lista/estado
              onVentaAprobada && onVentaAprobada(res);
            });
          },
          style: 'destructive'
        }
      ]
    );
  };

  // NUEVO: handler rechazar venta
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
              try {
                console.log("Rechazando venta", venta._id);
                // Actualización directa (considerar mover a Meteor.method para seguridad)
                VentasRechargeCollection.update(
                  {_id:ventaId} ,
                  {
                    $set: {
                      estado: 'RECHAZADA',
                      rechazadaAt: new Date(),
                      rechazadaBy: Meteor.userId()
                    }
                  },
                  (err) => {
                    setRechazandoVenta(false);
                    if (err) {
                      console.log(err);
                      Alert.alert('Error', err.reason || 'No se pudo rechazar la venta');
                      return;
                    }
                    Alert.alert('Listo', 'Venta rechazada.');
                    onVentaAprobada && onVentaAprobada({ _id: venta._id, estado: 'RECHAZADA' });
                  }
                );
              } catch (e) {
                setRechazandoVenta(false);
                Alert.alert('Error', e.message || 'Fallo inesperado al rechazar');
              }
            }
        }
      ]
    );
  };

  const abrirPreview = (ev) => setPreview(ev);
  const cerrarPreview = () => setPreview(null);

  const handleAprobar = () => {
    if (!preview) return;
    if (preview.aprobado || preview.rechazado) return; // nada que hacer
    Meteor.call('archivos.aprobarEvidencia', preview._id, null, (error, success) => {
      if (error) {
        Alert.alert('Error', error.reason || 'No se pudo aprobar la evidencia.');
        return;
      }
      if (success) {
        onAprobar && onAprobar(preview);
        // Opcional: setPreview(null);
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
        // Opcional: setPreview(null);
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

  const miniBase64 = evidencias[0]?.base64;
  const cargando = !evidenciasSubsc; // placeholder simple

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Evidencias de Pago"
        subtitle={`Venta: ${ventaId}`}
        titleStyle={styles.title}
        subtitleStyle={styles.subtitle}
        right={(props) => (
          <IconButton
            {...props}
            icon={expanded ? 'chevron-up' : 'chevron-down'}
            onPress={() => setExpanded(v => !v)}
            accessibilityLabel={expanded ? 'Colapsar venta' : 'Expandir venta'}
          />
        )}
      />
      {/* Vista colapsada siempre visible */}
      <View style={styles.collapsedBox}>
        <Text style={styles.colLabel}>Usuario:</Text>
        <Text style={styles.colValue}>{venta.userId || venta?.producto?.userId || 'N/D'}</Text>
      </View>
      <View style={styles.collapsedBox}>
        <Text style={styles.colLabel}>Recargas:</Text>
        <Text style={styles.colValue} numberOfLines={2}>{recargasResumen}</Text>
      </View>
      {(ventaRechazada || ventaYaEntregada) && (
        <View style={styles.estadoVentaBadge}>
          <Text style={[styles.estadoVentaText, ventaRechazada && { color: '#e74c3c' }]}>
            {ventaRechazada ? 'VENTA RECHAZADA' : 'VENTA FINALIZADA'}
          </Text>
        </View>
      )}

      {expanded && (
        <Card.Content>
          <Divider style={styles.divider} />
          {miniBase64 && (
            <View style={styles.lastWrapper}>
              <Image source={{ uri: `data:image/jpeg;base64,${miniBase64}` }} style={styles.lastThumb} />
              <View style={styles.lastInfo}>
                <Text style={styles.lastLabel}>Última evidencia</Text>
                <Text style={styles.lastSub}>
                  Total evidencias: {evidencias.length}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Listado ({evidencias.length})</Text>

            {/* NUEVO: botón para aprobar la venta */}
            <View style={{ flexDirection: 'row' }}>
              <Button
                mode="outlined"
                onPress={handleRechazarVenta}
                disabled={rechazandoVenta || ventaRechazada || ventaYaEntregada || !Meteor?.user()?.permitirAprobacionEfectivoCUP}
                icon="close-octagon"
                compact
                style={{ marginRight: 8 }}
                textColor="#e53935"
              >
                {rechazandoVenta ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button
                mode="contained"
                onPress={handleAprobarVenta}
                disabled={!canApproveSale || aprobandoVenta || !Meteor?.user()?.permitirAprobacionEfectivoCUP}
                icon="check-decagram"
                compact
                contentStyle={{ height: 36 }}
              >
                {aprobandoVenta ? 'Procesando...' : 'Aprobar venta'}
              </Button>
            </View>
          </View>

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
            <Text style={styles.emptyText}>No hay evidencias.</Text>
          )}
        </Card.Content>
      )}

      {/* Drawer sólo si expanded */}
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
              <Image
                source={{ uri: `data:image/jpeg;base64,${preview.base64}` }}
                style={styles.previewImage}
                resizeMode="contain"
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
  card: { marginHorizontal: 8, marginVertical: 6, elevation: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 11 },
  divider: { marginBottom: 10 },
  lastWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  lastThumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#eee' },
  lastInfo: { marginLeft: 10, flex: 1 },
  lastLabel: { fontSize: 12, fontWeight: '600', color: '#222' },
  lastSub: { fontSize: 11, color: '#666', marginTop: 2 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#333' },

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
  previewImage: { width: '100%', height: 300, backgroundColor: '#000', borderRadius: 12 },
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

  collapsedBox: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row'
  },
  colLabel: { fontSize: 11, fontWeight: '600', color: '#555', marginRight: 6 },
  colValue: { flex: 1, fontSize: 11, color: '#333' },
  estadoVentaBadge: { marginHorizontal: 16, marginTop: 4, paddingVertical: 4 },
  estadoVentaText: { fontSize: 11, fontWeight: '700', color: '#2e7d32' },
});

/*
  FUTURAS MEJORAS:
  - Implementar método 'archivos.resetEstadoEvidencia' para revertir rechazo si fue un error.
  - Añadir timestamp y usuario que cambió el estado (auditoría).
  - Unificar color palette vía theme react-native-paper.
  - Soportar tipos de archivo (PDF) mostrando ícono en lugar de intentar renderizar imagen.
  - Card expandible (expanded) para mejorar performance y UX.
  - Resumen colapsado con userId y recargas (teléfono - nombre).
  - Botón Rechazar venta usando VentasRechargeCollection.update (recomendado migrar a Meteor.method).
  - Manejo de estados finales (RECHAZADA / ENTREGADO / PAGADA / COMPLETADA) deshabilitando acciones.
*/
