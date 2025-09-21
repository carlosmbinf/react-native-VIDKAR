import React, { useMemo, useState } from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Chip, Divider, Button, ActivityIndicator } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import moment from 'moment';
import DrawerBottom from '../drawer/DrawerBottom';
import { EvidenciasVentasEfectivoCollection } from '../collections/collections';

/**
 * Props:
 *  - venta: objeto de la venta (se usa venta._id)
 *  - onAprobar?: (evidencia) => void
 *  - onRechazar?: (evidencia) => void
 *  - loadingIds?: string[] lista de evidencias en proceso (para mostrar spinners)
 */
const AprobacionEvidenciasVenta = ({ venta, onAprobar, onRechazar, loadingIds = [] }) => {
  if (!venta) return null;
  const ventaId = venta._id;
  const [preview, setPreview] = useState(null);

  // Suscripción de evidencias (igual que en SubidaArchivos)
  const evidenciasSubsc = useTracker(() => {
    Meteor.subscribe('evidenciasVentasEfectivoRecharge', { ventaId });
    return EvidenciasVentasEfectivoCollection.find({ ventaId }, { sort: { createdAt: -1 } }).fetch();
  }, [ventaId]);

  const evidencias = useMemo(() => {
    const raw = Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [];
    return raw
      .map((e, i) => ({
        _idx: i,
        _id: e._id,
        base64: e.base64 || e.dataBase64 || e.data || e.dataB64,
        aprobado: !!e.aprobado,
        createdAt: e.createdAt || e.fecha || null,
        size: e.size || 0,
        descripcion: e.descripcion || '',
        raw: e
      }))
      .filter(e => !!e.base64);
  }, [evidenciasSubsc]);

  const abrirPreview = (ev) => setPreview(ev);
  const cerrarPreview = () => setPreview(null);

  const handleAprobar = async () => {
    if (!preview) return;
    // console.log(preview)
    Meteor.call('archivos.aprobarEvidencia', preview._id, null, function(error, success) { 
        if (error) { 
            console.log('error', error); 
        } 
        if (success) { 
             console.log("success", success);
        } 
    });
    
    // TODO: Implementar llamada Meteor (ej: Meteor.call('evidencias.aprobar', preview._id, ...))
    // onAprobar && onAprobar(preview);
  };

  const handleRechazar = () => {
    if (!preview) return;
    // TODO: Implementar llamada Meteor (ej: Meteor.call('evidencias.rechazar', preview._id, ...))
    onRechazar && onRechazar(preview);
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
      />
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
              return (
                <Pressable
                  key={ev._id}
                  style={[
                    styles.thumbContainer,
                    ev.aprobado ? styles.borderAprobado : styles.borderPendiente
                  ]}
                  onPress={() => abrirPreview(ev)}
                >
                  <Image source={{ uri }} style={styles.thumb} />
                  {isLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  <View style={styles.badgeEstado}>
                    <Text style={[styles.badgeText, ev.aprobado && styles.badgeTextOk]}>
                      {ev.aprobado ? 'OK' : 'PEND'}
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

      <DrawerBottom
        open={!!preview}
        onClose={cerrarPreview}
        title={preview ? `Evidencia ${preview._idx + 1}` : ''}
        side="bottom"
        actions={[
          preview && preview.aprobado
            ? { icon: 'check-decagram', disabled: true }
            : { icon: 'clock-outline', disabled: true }
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
                <Chip
                  mode="outlined"
                  compact
                  icon={preview.aprobado ? 'check' : 'progress-clock'}
                  style={preview.aprobado ? styles.chipOk : styles.chipPending}
                  textStyle={styles.chipText}
                >
                  {preview.aprobado ? 'Aprobada' : 'Pendiente'}
                </Chip>
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
                {!preview.aprobado && (
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
                    >
                      Rechazar
                    </Button>
                  </>
                )}
                {preview.aprobado && (
                  <Text style={styles.aprobadaInfo}>Ya aprobada</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </DrawerBottom>
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
  aprobadaInfo: { fontSize: 12, color: '#2e7d32', fontWeight: '600' }
});
