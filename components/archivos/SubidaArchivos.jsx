import React, { useState, useMemo } from 'react';
import { View, Alert, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { Button, TextInput, ActivityIndicator, Text, Card, Chip, Divider, useTheme, IconButton } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Meteor, {useTracker} from '@meteorrn/core';
import DrawerBottom from '../drawer/DrawerBottom';
import moment from 'moment';
import { EvidenciasVentasEfectivoCollection } from '../collections/collections';

const SubidaArchivos = ({ venta }) => {
  if (!venta) return null;
  const theme = useTheme();
  const ventaId = venta._id;

  const [openSheet, setOpenSheet] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [preview, setPreview] = useState(null);
  const [height, setHeight] = useState();
  const [width, setWidth] = useState()
  const [eliminando, setEliminando] = useState(false);
  const categoria = 'general';

  const evidenciasSubsc  = useTracker(() => {

    let readyEvidencias = Meteor.subscribe('evidenciasVentasEfectivoRecharge', {ventaId:ventaId}).ready();
        
     console.log("ventaId ", ventaId);
    const evidenciasCollection = EvidenciasVentasEfectivoCollection.find({ventaId:ventaId}, {
      sort: { createdAt: -1 }
    }).fetch()
    console.log("evidenciasCollection", evidenciasCollection?.length ?? 0);
    return evidenciasCollection;
  });

  const evidencias = useMemo(() => {
    const raw = Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [];
    console.log("raw",raw?.length ?? 0);
    console.log("evidenciasSubsc",evidenciasSubsc?.length ?? 0)
    return raw.map((e, i) => ({
      _idx: i,
      _id: e._id, // NUEVO: conservar id para eliminación puntual
      base64: e.base64 || e.dataBase64 || e.data || e.dataB64,
      aprobado: !!e.aprobado,
      descripcion: e.descripcion || e.detalles || '',
      createdAt: e.createdAt || e.fecha || e.fechaSubida || null,
      size: e.size || e.tamano || 0,
      raw: e
    })).filter(e => !!e.base64);
  }, [evidenciasSubsc]);

  const tieneEvidencias = evidencias.length > 0;

  const miniBase64 = archivoSeleccionado?.base64 || evidencias[0]?.base64;

  const seleccionarArchivo = () => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cámara', onPress: abrirCamara },
        { text: 'Galería', onPress: abrirGaleria },
      ]
    );
  };

  const abrirCamara = () => {
    const options = { mediaType: 'photo', quality: 0.8, includeBase64: true };
    launchCamera(options, (response) => {
      if (response.assets && response.assets[0]) setArchivoSeleccionado(response.assets[0]);
    });
  };

  const abrirGaleria = () => {
    const options = { mediaType: 'photo', quality: 0.8, includeBase64: true };
    launchImageLibrary(options, (response) => {
      setWidth(response.width, 0);
      setHeight(response.height, 0);
      if (response.assets && response.assets[0]) setArchivoSeleccionado(response.assets[0]);
    });
  };

  const subirArchivo = async () => {
    if (!archivoSeleccionado) return Alert.alert('Error', 'Debe seleccionar un archivo');
    setCargando(true);
    try {
      const fileData = {
        name: archivoSeleccionado.fileName || `imagen_${Date.now()}.jpg`,
        data: archivoSeleccionado.base64,
        size: archivoSeleccionado.fileSize,
        metadata: { descripcion: descripcion },
        ventaId
      };
      const metadata = { categoria, descripcion };
      await Meteor.call('archivos.upload', fileData, metadata, (error, result) => {
        if (error) return Alert.alert('Error', error.reason || 'No se pudo subir el archivo');
        if (result?.success) {
          Alert.alert('Éxito', 'Archivo subido exitosamente');
          setArchivoSeleccionado(null);
          setDescripcion('');
          setOpenSheet(false);
        }
      });
    } catch (e) {
      Alert.alert('Error', e.reason || 'No se pudo subir el archivo');
    } finally {
      setCargando(false);
    }
  };

  const abrirPreview = (ev) => setPreview(ev);
  const cerrarPreview = () => setPreview(null);

  const handleEliminarEvidencias = () => {
    if (eliminando || !preview) return;
    const evidenciaId = preview._id || preview.raw?._id;
    if (!evidenciaId) {
      Alert.alert('Error', 'No se pudo determinar el ID de la evidencia');
      return;
    }
    Alert.alert(
      'Confirmar',
      '¿Desea eliminar esta evidencia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setEliminando(true);
            Meteor.call('archivos.delete', evidenciaId, (err) => {
              if (err) {
                Alert.alert('Error', err.reason || 'No se pudo eliminar la evidencia');
              } else {
                Alert.alert('Éxito', 'Evidencia eliminada');
                setPreview(null);
              }
              setEliminando(false);
            });
          }
        }
      ]
    );
  };

  return (
    <>
      <Card style={styles.ventaCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelMonto}>Monto a pagar</Text>
              <Text style={styles.montoAPagar}>${venta.cobrado} {venta.monedaCobrado}</Text>
            </View>
            <Chip compact mode="contained" style={styles.metodoChip}>
              TRANSFERENCIA
            </Chip>
          </View>

          {miniBase64 && (
            <View style={styles.thumbRow}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${miniBase64}` }}
                style={styles.thumbnail}
              />
              <View style={styles.thumbTextBox}>
                <Text style={styles.thumbLabel}>
                  {archivoSeleccionado ? 'Evidencia seleccionada' : 'Última evidencia'}
                </Text>
                {archivoSeleccionado && (
                  <Text style={styles.thumbSize}>
                    {((archivoSeleccionado.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
              </View>
            </View>
          )}

          <Divider style={{ marginVertical: 8 }} />

          <View style={styles.evidenciasHeaderRow}>
            <Text style={styles.evidenciasTitle}>Evidencias ({evidencias.length})</Text>
            <Button
              mode={tieneEvidencias ? 'text' : 'contained'}
              icon={tieneEvidencias ? 'plus' : 'camera-plus'}
              onPress={() => setOpenSheet(true)}
              compact
              disabled={cargando}
            >
              {tieneEvidencias ? 'Agregar' : 'Subir'}
            </Button>
          </View>

          {tieneEvidencias ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.evidenciasScroll}
            >
              {evidencias.map((ev) => {
                const uri = `data:image/jpeg;base64,${ev.base64}`;
                return (
                  <Pressable
                    key={ev._idx}
                    style={[styles.evidenciaThumbContainer, ev.aprobado ? styles.aprobadoBorder : styles.pendienteBorder]}
                    onPress={() => abrirPreview(ev)}
                  >
                    <Image source={{ uri }} style={styles.evidenciaThumb} />
                    {ev.aprobado && (
                      <View style={styles.badgeCheck}>
                        <Text style={styles.badgeCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.sinEvidenciasText}>No hay evidencias todavía.</Text>
          )}

        </Card.Content>
      </Card>

      <DrawerBottom
        open={openSheet}
        onClose={() => !cargando && setOpenSheet(false)}
        title={"Subir Archivo"}
        side="bottom"
        actions={[
          {
            icon: 'upload',
            onPress: () => !cargando && subirArchivo(),
            disabled: !archivoSeleccionado || cargando
          }
        ]}
      >
        <Button
          mode="outlined"
          onPress={seleccionarArchivo}
          style={styles.boton}
          disabled={cargando}
          icon={archivoSeleccionado ? 'image-edit' : 'camera'}
        >
          {archivoSeleccionado ? 'Cambiar archivo' : 'Seleccionar archivo'}
        </Button>

        {archivoSeleccionado && (
          <View style={styles.archivoPreview}>
            <Text style={styles.archivoInfo}>📸 {archivoSeleccionado.fileName || 'imagen.jpg'}</Text>
            <Text style={styles.archivoTamaño}>
              Tamaño: {((archivoSeleccionado.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
            </Text>
            <Text style={styles.archivoTamaño}>
              Dimensiones: {(archivoSeleccionado.height + "x" + archivoSeleccionado.width)}
            </Text>
          </View>
        )}

        <TextInput
          label="Descripción de la evidencia (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={3}
          style={styles.input}
          disabled={cargando}
          mode="outlined"
        />

        <Button
          mode="contained"
          onPress={subirArchivo}
          disabled={!archivoSeleccionado || cargando}
          style={styles.botonSubir}
          icon="upload"
        >
          {cargando ? <ActivityIndicator color="white" /> : 'Subir evidencia'}
        </Button>
      </DrawerBottom>

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
            <View style={styles.previewMetaBox}>
              <Chip
                mode="outlined"
                compact
                icon={preview.aprobado ? 'check' : 'timer-sand'}
                style={preview.aprobado ? styles.chipAprobado : styles.chipPendiente}
                textStyle={{ fontSize: 11 }}
              >
                {preview.aprobado ? 'Aprobada' : 'Pendiente'}
              </Chip>
              <Text style={styles.previewFecha}>
                {preview.createdAt ? moment(preview.createdAt).format('DD/MM/YYYY HH:mm') : 'Sin fecha'}
              </Text>
              {!!preview.size && (
                <Text style={styles.previewTamano}>
                  Tamaño: {(preview.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
              {!!preview.descripcion && (
                <Text style={styles.previewDescripcion}>
                  {preview.descripcion}
                </Text>
              )}
              <Button
                mode="contained-tonal"
                icon="delete"
                onPress={handleEliminarEvidencias}
                disabled={eliminando}
                loading={eliminando}
                style={styles.botonEliminar}
              >
                Eliminar evidencia
              </Button>
            </View>
          </View>
        )}
      </DrawerBottom>
    </>
  );
};

export default SubidaArchivos;

const styles = StyleSheet.create({
  ventaCard: { elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  labelMonto: { fontSize: 11, color: '#666', fontWeight: '500' },
  montoAPagar: { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginTop: 2 },
  metodoChip: { backgroundColor: '#1976d2', alignSelf: 'flex-start' },

  thumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6 },
  thumbnail: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee' },
  thumbTextBox: { marginLeft: 8, flex: 1 },
  thumbLabel: { fontSize: 12, color: '#333', fontWeight: '600' },
  thumbSize: { fontSize: 10, color: '#666', marginTop: 2 },

  evidenciasHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  evidenciasTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  evidenciasScroll: { paddingVertical: 6 },
  evidenciaThumbContainer: {
    width: 62,
    height: 62,
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa'
  },
  evidenciaThumb: { width: '100%', height: '100%' },
  aprobadoBorder: { borderWidth: 2, borderColor: '#2ecc71' },
  pendienteBorder: { borderWidth: 2, borderColor: '#f1c40f' },
  badgeCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#2ecc71',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeCheckText: { color: 'white', fontSize: 11, fontWeight: '700' },
  sinEvidenciasText: { fontSize: 11, color: '#777', marginTop: 4, fontStyle: 'italic' },

  botonSubirEvidencia: { marginTop: 8 },

  boton: { marginBottom: 14, height: 44, justifyContent: 'center' },
  archivoPreview: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  archivoInfo: { fontSize: 12, color: '#495057', fontWeight: '500' },
  archivoTamaño: { fontSize: 10, color: '#6c757d', marginTop: 4 },
  input: { marginBottom: 14 },
  botonSubir: { marginTop: 6, height: 44, justifyContent: 'center' },

  previewWrapper: { paddingBottom: 10 },
  previewImage: { width: '100%', height: 280, backgroundColor: '#000', borderRadius: 12 },
  previewMetaBox: { marginTop: 12 },
  chipAprobado: { borderColor: '#2ecc71' },
  chipPendiente: { borderColor: '#f1c40f' },
  previewFecha: { fontSize: 11, color: '#555', marginTop: 6 },
  previewTamano: { fontSize: 11, color: '#555', marginTop: 2 },
  previewDescripcion: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    backgroundColor: '#f1f3f5',
    padding: 8,
    borderRadius: 6
  },
  botonEliminar: { marginTop: 14 },
});
