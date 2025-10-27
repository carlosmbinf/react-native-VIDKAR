import React, { useState, useMemo, useEffect } from 'react'; // agregado useEffect
import { View, Alert, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { Button, TextInput, ActivityIndicator, Text, Card, Chip, Divider, useTheme, IconButton } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Meteor, {useTracker} from '@meteorrn/core';
import DrawerBottom from '../drawer/DrawerBottom';
import moment from 'moment';
import { EvidenciasVentasEfectivoCollection, VentasRechargeCollection } from '../collections/collections';

// Estados unificados (igual que en AprobacionEvidenciasVenta)
const ESTADOS = {
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
  PENDIENTE: 'PENDIENTE'
};

// Función de mapeo consistente
const mapEvidenciaDoc = (e, i) => {
  const aprobado = !!e.aprobado;
  const cancelFlag = !!(e.cancelado || e.cancelada || e.isCancelada || e.estado === 'CANCELADA');
  const rechazadoFlag = !!(e.rechazado || e.denegado || e.estado === ESTADOS.RECHAZADA || e.estado === 'RECHAZADA');
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
    descripcion: e.descripcion || e.detalles || '',
    createdAt: e.createdAt || e.fecha || e.fechaSubida || null,
    size: e.size || e.tamano || 0,
    raw: e
  };
};

// Opcional: intento cargar Clipboard (soporta distintos entornos)
let ClipboardModule = null;
// try {
//   ClipboardModule = require('@react-native-clipboard/clipboard');
// } catch (e) {
//   try {
    ClipboardModule = require('react-native').Clipboard;
//   } catch (_) {}
// }

const SubidaArchivos = ({ venta}) => {
  if (!venta) return null;
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
  const [tarjetaCUP, setTarjetaCUP] = useState("0000-0000-0000-0000");

  useEffect(() => {
    const fetchTarjetaCUP = async () => {
      try {
        const userId = Meteor.user()?.bloqueadoDesbloqueadoPor;
        if (userId) {
          const result = await new Promise((resolve, reject) => {
            Meteor.call("property.getValor", "CONFIG",`TARJETA_CUP_${userId}`, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          setTarjetaCUP(result || "0000 0000 0000 0000");
        }
      } catch (error) {
        console.error("Error al obtener tarjeta CUP:", error);
        setTarjetaCUP("0000 0000 0000 0000");
      }
    };

    if (Meteor.user()) {
      fetchTarjetaCUP();
    }
  }, [Meteor.user()?.bloqueadoDesbloqueadoPor]);

  const copyTarjeta = async () => {
    if (!tarjetaCUP) {
      Alert.alert('Aviso', 'No hay tarjeta para copiar.');
      return;
    }
    try {
      if (ClipboardModule?.setString) {
        ClipboardModule.setString(tarjetaCUP);
      } else if (ClipboardModule?.setStringAsync) {
        await ClipboardModule.setStringAsync(tarjetaCUP);
      } else {
        throw new Error('Clipboard no disponible');
      }
      Alert.alert('Copiado', 'La tarjeta de destino fue copiada al portapapeles.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo copiar la tarjeta.');
    }
  };


  const ventaReact  = useTracker(() => {

    const susc = Meteor.subscribe('ventasRecharge', {_id:ventaId}).ready();
    
     console.log("ventaId ", ventaId);
    const vent = susc ? VentasRechargeCollection.find({_id:ventaId}).fetch() : null
    console.log("VentasRechargeCollection", vent?.length ?? 0);
    return vent?.length > 0 ? vent[0] : null;
  });


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
    return raw
      .map(mapEvidenciaDoc)
      .filter(e => !!e.base64);
  }, [evidenciasSubsc]);

  const tieneEvidencias = evidencias.length > 0;

  // Inhabilita subida si la venta ya fue cobrada o está cancelada
  const uploadInhabilitado = useMemo(() => {
    return !!(ventaReact?.isCobrado || ventaReact?.isCancelada);
  }, [ventaReact?.isCobrado, ventaReact?.isCancelada]);
  
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
    if (uploadInhabilitado) {
      Alert.alert('Acción no permitida', 'No se pueden eliminar evidencias de una venta cobrada o cancelada.');
      return;
    }
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
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                // backgroundColor: '#fff',
                borderRadius: 8,
                // elevation: 2 // sombra en Android
              }}>
                <View>
                  <Text style={[styles.labelMonto, { fontSize: 14 }]}>
                    Monto a pagar
                  </Text>
                  {<Text style={[styles.montoAPagar, { fontSize: 18, fontWeight: 'bold', marginTop: 2 }]}>
                    ${ventaReact?.cobrado} {ventaReact?.monedaCobrado}
                  </Text>}
                </View>

                <Chip
                  compact
                  mode="contained"
                  // style={[styles.metodoChip]}
                  textStyle={{ fontSize: 12 }}
                >
                  TRANSFERENCIA
                </Chip>
              </View>
              {/* NUEVO: Tarjeta destino */}
              <View style={styles.tarjetaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tarjetaLabel}>Tarjeta destino (CUP)</Text>
                  <Text style={styles.tarjetaNumero}>{tarjetaCUP || '—'}</Text>
                </View>
                <IconButton
                  icon="content-copy"
                  size={20}
                  onPress={copyTarjeta}
                  disabled={!tarjetaCUP}
                  accessibilityLabel="Copiar tarjeta"
                />
              </View>
            </View>
            
          </View>

          {miniBase64 && (
            <View style={styles.thumbRow}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${miniBase64}` }}
                style={styles.thumbnail}
              />
              <View style={styles.thumbTextBox}>
                <Text style={styles.thumbLabel}>
                  {archivoSeleccionado ? 'Evidencia seleccionada' : 'Última Captura Subida'}
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
              onPress={() => !uploadInhabilitado && setOpenSheet(true)}
              compact
              disabled={cargando || uploadInhabilitado}
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
                const borderStyle = ev.rechazado
                  ? styles.rechazadoBorder
                  : ev.aprobado
                    ? styles.aprobadoBorder
                    : styles.pendienteBorder;
                const badgeText = ev.rechazado ? 'CANC' : ev.aprobado ? 'OK' : 'PEND';
                return (
                  <Pressable
                    key={ev._id}
                    style={[styles.evidenciaThumbContainer, borderStyle]}
                    onPress={() => abrirPreview(ev)}
                  >
                    <Image source={{ uri }} style={styles.evidenciaThumb} />
                    <View style={styles.badgeEstado}>
                      <Text
                        style={[
                          styles.badgeEstadoText,
                          ev.aprobado && styles.badgeEstadoOk,
                          ev.rechazado && styles.badgeEstadoDenied
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
            onPress: () => !cargando && !uploadInhabilitado && subirArchivo(),
            disabled: !archivoSeleccionado || cargando || uploadInhabilitado
          }
        ]}
      >
        <Button
          mode="outlined"
          onPress={seleccionarArchivo}
          style={styles.boton}
          disabled={cargando || uploadInhabilitado}
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
          disabled={!archivoSeleccionado || cargando || uploadInhabilitado}
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
            <View style={styles.previewMetaBox}>
              {/* Chip de estado unificado */}
              {preview.estado === ESTADOS.APROBADA && (
                <Chip mode="outlined" compact icon="check" style={styles.chipAprobado} textStyle={styles.chipEstadoText}>
                  Aprobada
                </Chip>
              )}
              {preview.estado === ESTADOS.RECHAZADA && (
                <Chip mode="outlined" compact icon="close-octagon" style={styles.chipRechazada} textStyle={styles.chipEstadoText}>
                  Rechazada
                </Chip>
              )}
              {preview.estado === ESTADOS.PENDIENTE && (
                <Chip mode="outlined" compact icon="progress-clock" style={styles.chipPendiente} textStyle={styles.chipEstadoText}>
                  Pendiente
                </Chip>
              )}
              <Text style={styles.previewFecha}>
                {preview.createdAt ? moment(preview.createdAt).format('DD/MM/YYYY HH:mm') : 'Sin fecha'}
              </Text>
              {!!preview.size && (
                <Text style={styles.previewTamano}>
                  Tamaño: {(preview.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
              {!!preview.descripcion && (
                <Text style={styles.previewDescripcion}>{preview.descripcion}</Text>
              )}

              {/* Eliminación permitida incluso si está rechazada */}
              <Button
                mode="contained-tonal"
                icon="delete"
                onPress={handleEliminarEvidencias}
                disabled={eliminando || uploadInhabilitado}
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
  

  thumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6 },
  thumbnail: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee' },
  thumbTextBox: { marginLeft: 8, flex: 1 },
  thumbLabel: { fontSize: 12, color: '#333', fontWeight: '600' },
  thumbSize: { fontSize: 10, color: '#666', marginTop: 2 },

  evidenciasHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  evidenciasTitle: { fontSize: 13, fontWeight: '600',
    //  color: '#333' 
    },
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
  rechazadoBorder: { borderWidth: 2, borderColor: '#e74c3c' },
  badgeEstado: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#00000088',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeEstadoText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  badgeEstadoOk: { color: '#2ecc71' },
  badgeEstadoDenied: { color: '#e74c3c' },
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
  chipRechazada: { borderColor: '#e74c3c' },
  chipEstadoText: { fontSize: 11 },
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

  tarjetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: '#eeeeee'
  },
  tarjetaLabel: {
    fontSize: 11,
    // color: '#555',
    fontWeight: '600'
  },
  tarjetaNumero: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
    // color: '#1d3557'
  },
});
