import React, { useState, useMemo, useEffect } from 'react';
import { View, Alert, StyleSheet, Image, Pressable, ScrollView, Platform, Linking } from 'react-native';
import { Button, TextInput, ActivityIndicator, Text, Card, Chip, Divider, useTheme, IconButton } from 'react-native-paper';
import ImagePicker from 'react-native-image-crop-picker';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
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

// Configuración de compresión profesional
const IMAGE_COMPRESSION_CONFIG = {
  // CRÍTICO: width y height son las dimensiones MÁXIMAS
  width: 1920,
  height: 1920,
  // Calidad de compresión JPEG (0 - 100, NO 0.0 - 1.0)
  compressImageQuality: 0.8,
  // Habilitar EXIF para mantener orientación correcta
  includeExif: true,
  // IMPORTANTE: cropperCircleOverlay debe ser false para permitir redimensionamiento
  cropping: true,
  // Formato de salida
  mediaType: 'photo',
};

// Configuración optimizada para dispositivos de gama baja
const IMAGE_COMPRESSION_CONFIG_LOW_END = {
  width: 1280,  // Reducir dimensiones para dispositivos lentos
  height: 1280,
  compressImageQuality: 0.75, // Compresión más agresiva
  includeExif: true,
  cropping: false,
  forceJpg: true,
  // Android específico
  enableRotationGesture: false, // Deshabilitar gestos de rotación (ahorra memoria)
  avoidEmptySpaceAroundImage: true, // Optimiza layout del cropper
};

// Detectar si es dispositivo de gama baja
const isLowEndDevice = () => {
  // Heurística simple: Android con API <26 o <2GB RAM
  if (Platform.OS === 'android') {
    return Platform.Version < 26;
  }
  return false;
};

// Utility para formatear tamaños de archivo
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// Permisos según plataforma
const CAMERA_PERMISSION = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  android: PERMISSIONS.ANDROID.CAMERA,
});

const PHOTO_LIBRARY_PERMISSION = Platform.select({
  ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
  android: Platform.Version >= 33 
    ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES 
    : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
});

// Debug function para iOS
const debugPermissions = async () => {
  if (Platform.OS === 'ios') {
    console.log('🐛 [iOS Debug] Permisos disponibles:');
    console.log('🐛 CAMERA_PERMISSION:', CAMERA_PERMISSION);
    console.log('🐛 PHOTO_LIBRARY_PERMISSION:', PHOTO_LIBRARY_PERMISSION);
    console.log('🐛 PERMISSIONS.IOS.CAMERA:', PERMISSIONS.IOS?.CAMERA);
    console.log('🐛 PERMISSIONS.IOS.PHOTO_LIBRARY:', PERMISSIONS.IOS?.PHOTO_LIBRARY);
    
    // Verificar si las funciones están disponibles
    console.log('🐛 check function:', typeof check);
    console.log('🐛 request function:', typeof request);
    console.log('🐛 openSettings function:', typeof openSettings);
    
    // Verificar estado actual
    try {
      const cameraStatus = await check(CAMERA_PERMISSION);
      const photoStatus = await check(PHOTO_LIBRARY_PERMISSION);
      console.log('🐛 Estado actual - Cámara:', cameraStatus);
      console.log('🐛 Estado actual - Galería:', photoStatus);
      
      Alert.alert('Estado Debug', `Cámara: ${cameraStatus}\nGalería: ${photoStatus}`);
    } catch (error) {
      console.log('🐛 Error checking status:', error);
      Alert.alert('Error Debug', error.message);
    }
  }
};

// TEMPORAL: Función para probar requests activos
const testPermissionRequests = async () => {
  if (Platform.OS === 'ios') {
    console.log('🧪 [Test] Solicitando permisos activamente...');
    try {
      console.log('🧪 Solicitando cámara...');
      const cameraResult = await request(CAMERA_PERMISSION);
      console.log('🧪 Resultado cámara:', cameraResult);
      
      console.log('🧪 Solicitando galería...');
      const photoResult = await request(PHOTO_LIBRARY_PERMISSION);
      console.log('🧪 Resultado galería:', photoResult);
      
      Alert.alert(
        'Resultado Test', 
        `Cámara: ${cameraResult}\nGalería: ${photoResult}`,
        [{ text: 'Verificar Estado', onPress: debugPermissions }]
      );
    } catch (error) {
      console.log('🧪 Error en test:', error);
      Alert.alert('Error Test', error.message);
    }
  }
};

// Funciones de solicitud de permisos
const requestCameraPermission = async () => {
  try {
    const result = await check(CAMERA_PERMISSION);
    
    switch (result) {
      case RESULTS.UNAVAILABLE:
        Alert.alert(
          'Cámara no disponible',
          'La cámara no está disponible en este dispositivo.'
        );
        return false;
      
      case RESULTS.DENIED:
        const requestResult = await request(CAMERA_PERMISSION);
        if (requestResult === RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert(
            'Permiso de cámara denegado',
            'Para tomar fotos, necesitas habilitar el acceso a la cámara en Configuración.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => openSettings() }
            ]
          );
          return false;
        }
      
      case RESULTS.GRANTED:
        return true;
      
      case RESULTS.BLOCKED:
        Alert.alert(
          'Permiso de cámara bloqueado',
          'El acceso a la cámara está bloqueado. Ve a Configuración > VIDKAR > Cámara para habilitarlo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Configuración', onPress: () => openSettings() }
          ]
        );
        return false;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error solicitando permiso de cámara:', error);
    Alert.alert('Error', 'Ocurrió un error al solicitar permisos de cámara.');
    return false;
  }
};

const requestGalleryPermission = async () => {
  try {
    const result = await check(PHOTO_LIBRARY_PERMISSION);
    
    switch (result) {
      case RESULTS.UNAVAILABLE:
        Alert.alert(
          'Galería no disponible',
          'El acceso a fotos no está disponible en este dispositivo.'
        );
        return false;
      
      case RESULTS.DENIED:
        const requestResult = await request(PHOTO_LIBRARY_PERMISSION);
        if (requestResult === RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert(
            'Permiso de galería denegado',
            'Para seleccionar fotos, necesitas habilitar el acceso a la galería en Configuración.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => openSettings() }
            ]
          );
          return false;
        }
      
      case RESULTS.GRANTED:
        return true;
      
      case RESULTS.LIMITED:
        // iOS 14+ "Seleccionar fotos" - es suficiente para nuestro caso
        return true;
      
      case RESULTS.BLOCKED:
        Alert.alert(
          'Permiso de galería bloqueado',
          'El acceso a la galería está bloqueado. Ve a Configuración > VIDKAR > Fotos para habilitarlo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Configuración', onPress: () => openSettings() }
          ]
        );
        return false;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error solicitando permiso de galería:', error);
    Alert.alert('Error', 'Ocurrió un error al solicitar permisos de galería.');
    return false;
  }
};

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
  const [archivoOriginalSize, setArchivoOriginalSize] = useState(null);

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

  // Las funciones de permisos checkCameraPermission y checkGalleryPermission
  // han sido reemplazadas por requestCameraPermission y requestGalleryPermission
  // que están definidas fuera del componente para mayor reutilización

  const seleccionarArchivo = () => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cámara', onPress: abrirCamaraConPermisos },
        { text: 'Galería', onPress: abrirGaleriaConPermisos },
      ]
    );
  };

  const abrirCamaraConPermisos = async () => {
    // La función abrirCamara ya maneja permisos internamente
    abrirCamara();
  };

  const abrirGaleriaConPermisos = async () => {
    // La función abrirGaleriaConCroppingInteligente ya maneja permisos internamente
    abrirGaleriaConCroppingInteligente();
  };

  /**
   * Abre galería con cropping condicional según tamaño de imagen
   * - Imágenes <5MB: Ofrece opción de cropping al usuario
   * - Imágenes ≥5MB: Procesa automáticamente sin cropping (evita "Cannot find image data")
   */
  const abrirGaleriaConCroppingInteligente = async () => {
    try {
      console.log('📱 [iOS Debug] Iniciando flujo de galería...');
      
      if (Platform.OS === 'ios') {
        // Verificar permiso de galería
        const currentStatus = await check(PHOTO_LIBRARY_PERMISSION);
        console.log('📱 [iOS Debug] Estado actual permiso galería:', currentStatus);
        
        if (currentStatus === RESULTS.DENIED) {
          console.log('📱 [iOS Debug] Solicitando permiso de galería...');
          const result = await request(PHOTO_LIBRARY_PERMISSION);
          console.log('📱 [iOS Debug] Resultado solicitud galería:', result);
          
          if (result !== RESULTS.GRANTED && result !== RESULTS.LIMITED) {
            Alert.alert(
              'Permiso de galería requerido',
              'Para seleccionar fotos necesitas habilitar el acceso a la galería.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Configuración', onPress: () => openSettings() }
              ]
            );
            return;
          }
        } else if (currentStatus === RESULTS.BLOCKED) {
          Alert.alert(
            'Galería bloqueada',
            'Ve a Configuración > VIDKAR > Fotos para habilitar el acceso.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => openSettings() }
            ]
          );
          return;
        } else if (currentStatus === RESULTS.UNAVAILABLE) {
          Alert.alert('Error', 'El acceso a fotos no está disponible.');
          return;
        }
        
        console.log('📱 [iOS Debug] Permiso galería OK, abriendo picker...');
      }

      // Paso 1: Abrir picker SIN cropping para obtener metadata
      const image  = await ImagePicker.openPicker({
        // path: image.path,
        mediaType: 'photo',
        width: 1920,
        height: 1920,
        compressImageQuality: 0.5,
        includeBase64: true,
        includeExif: true,
        cropping: false, // Clave: solo redimensionar, no crop
        forceJpg: true,
      });
      
      console.log('📱 [iOS Debug] Imagen seleccionada exitosamente');

      const imageSizeMB = (image.size || 0) / 1024 / 1024;

      // Paso 2: Si imagen <5MB, permitir cropping opcional
      if (imageSizeMB < 5) {
        Alert.alert(
          'Recortar imagen',
          '¿Deseas recortar la imagen antes de subirla?',
          [
            {
              text: 'No, usar completa',
              onPress: () => procesarImagenSinCropping(image)
            },
            {
              text: 'Sí, recortar',
              onPress: () => abrirCroppingParaImagenPequena(image)
            }
          ]
        );
      } else {
        // Imagen grande: procesar directamente sin cropping
        console.log(`📦 Imagen grande (${imageSizeMB.toFixed(2)}MB), procesando sin cropping para evitar errores`);
        procesarImagenSinCropping(image);
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'No se pudo abrir la galería. Por favor, intenta nuevamente.');
        console.error('Error galería:', error);
      }
    }
  };

  /**
   * Abre cropper para imágenes pequeñas (<5MB)
   * @param {Object} image - Imagen seleccionada previamente
   */
  const abrirCroppingParaImagenPequena = async (image) => {
    try {
      const croppedImage = await ImagePicker.openCropper({
        path: image.path, // Ruta de la imagen ya seleccionada
        width: 1920,
        height: 1920,
        compressImageQuality: 0.5,
        includeBase64: true,
        includeExif: true,
        freeStyleCropEnabled: true, // Permite recorte libre (no solo cuadrado)
        cropperCircleOverlay: false, // Recorte rectangular
        forceJpg: true, // Convierte
        mediaType: 'photo',
        //  a JPEG para optimizar
      });

      setWidth(croppedImage.width);
      setHeight(croppedImage.height);
      setArchivoOriginalSize(image.size); // Tamaño ANTES del crop
      setArchivoSeleccionado({
        fileName: croppedImage.filename || `cropped_${Date.now()}.jpg`,
        base64: croppedImage.data,
        fileSize: croppedImage.size,
        width: croppedImage.width,
        height: croppedImage.height,
      });
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'No se pudo recortar la imagen. Procesando sin recorte...');
        procesarImagenSinCropping(image);
      }
    }
  };

  /**
   * Procesa imagen con compresión pero SIN cropping
   * Usado para imágenes grandes o cuando usuario rechaza cropping
   * @param {Object} image - Imagen a procesar
   */
  const procesarImagenSinCropping = async (image) => {
    try {
      // IMPORTANTE: NO usar openCropper con cropping:false, usar openPicker directamente
      const processedImage = image ? image : await ImagePicker.openPicker({
        path: image.path,
        mediaType: 'photo',
        width: 1920,
        height: 1920,
        compressImageQuality: 0.5,
        includeBase64: true,
        includeExif: true,
        cropping: false, // Clave: solo redimensionar, no crop
        forceJpg: true,
      });

      setWidth(processedImage.width);
      setHeight(processedImage.height);
      setArchivoOriginalSize(image.size); // Tamaño original pre-compresión
      setArchivoSeleccionado({
        fileName: processedImage.filename || `image_${Date.now()}.jpg`,
        base64: processedImage.data,
        fileSize: processedImage.size,
        width: processedImage.width,
        height: processedImage.height,
      });
    } catch (error) {
      console.error('Error procesando imagen:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen. Por favor, intenta con una imagen más pequeña.');
    }
  };

  const abrirCamara = async () => {
    try {
      // Debug de permisos
      debugPermissions();
      
      console.log('🎥 [iOS Debug] Iniciando flujo de cámara...');
      
      if (Platform.OS === 'ios') {
        // Verificar primero sin solicitar
        const currentStatus = await check(CAMERA_PERMISSION);
        console.log('🎥 [iOS Debug] Estado actual permiso cámara:', currentStatus);
        
        if (currentStatus === RESULTS.DENIED) {
          console.log('🎥 [iOS Debug] Solicitando permiso por primera vez...');
          const result = await request(CAMERA_PERMISSION);
          console.log('🎥 [iOS Debug] Resultado solicitud:', result);
          
          if (result !== RESULTS.GRANTED) {
            Alert.alert(
              'Permiso de cámara requerido',
              'Para tomar fotos necesitas habilitar el acceso a la cámara.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Configuración', onPress: () => openSettings() }
              ]
            );
            return;
          }
        } else if (currentStatus === RESULTS.BLOCKED) {
          Alert.alert(
            'Cámara bloqueada',
            'Ve a Configuración > VIDKAR > Cámara para habilitar el acceso.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => openSettings() }
            ]
          );
          return;
        } else if (currentStatus === RESULTS.UNAVAILABLE) {
          Alert.alert('Error', 'La cámara no está disponible en este dispositivo.');
          return;
        }
        
        console.log('🎥 [iOS Debug] Permiso OK, abriendo cámara...');
      }

      // Cámara NO usa cropping inteligente (fotos recién tomadas son optimizadas)
      const image = await ImagePicker.openCamera({
        includeBase64: true,
        ...IMAGE_COMPRESSION_CONFIG,
      });
      
      console.log('🎥 [iOS Debug] Imagen capturada exitosamente');

      setWidth(image.width);
      setHeight(image.height);
      setArchivoOriginalSize(image.sourceSize || image.size);
      setArchivoSeleccionado({
        fileName: image.filename || `camera_${Date.now()}.jpg`,
        base64: image.data,
        fileSize: image.size,
        width: image.width,
        height: image.height,
      });
    } catch (error) {
      console.error('🎥 [iOS Debug] Error completo:', error);
      console.error('🎥 [iOS Debug] Error code:', error.code);
      console.error('🎥 [iOS Debug] Error message:', error.message);
      
      if (error.code !== 'E_PICKER_CANCELLED') {
        // Error específico del simulador
        if (error.message && error.message.includes('simulator')) {
          Alert.alert(
            'Cámara no disponible en simulador',
            'La cámara no funciona en el simulador de iOS. Usa un dispositivo físico o selecciona una imagen de la galería.',
            [
              { text: 'Abrir Galería', onPress: abrirGaleriaConCroppingInteligente },
              { text: 'Cancelar', style: 'cancel' }
            ]
          );
        } else {
          Alert.alert('Error', `No se pudo abrir la cámara: ${error.message}`);
        }
      }
    }
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

  // Calcula porcentaje de reducción de tamaño
  const compressionRatio = useMemo(() => {
    if (!archivoSeleccionado?.fileSize || !archivoOriginalSize) return null;
    const reduction = ((1 - (archivoSeleccionado.fileSize / archivoOriginalSize)) * 100);
    return reduction > 0 ? reduction.toFixed(1) : null;
  }, [archivoSeleccionado?.fileSize, archivoOriginalSize]);

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
            <View style={styles.archivoMetaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.archivoMetaLabel}>Tamaño optimizado</Text>
                <Text style={styles.archivoTamaño}>
                  {formatFileSize(archivoSeleccionado.fileSize)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.archivoMetaLabel}>Dimensiones</Text>
                <Text style={styles.archivoTamaño}>
                  {archivoSeleccionado.width}×{archivoSeleccionado.height}
                </Text>
              </View>
            </View>
            {compressionRatio && (
              <View style={styles.compressionBadge}>
                <IconButton icon="check-circle" size={16} iconColor="#2E7D32" style={{ margin: 0 }} />
                <Text style={styles.compressionText}>
                  Imagen optimizada • Reducción del {compressionRatio}%
                </Text>
              </View>
            )}
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  archivoInfo: { 
    fontSize: 13, 
    color: '#495057', 
    fontWeight: '600',
    marginBottom: 8
  },
  archivoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  archivoMetaLabel: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  archivoTamaño: { 
    fontSize: 12, 
    color: '#212529', 
    fontWeight: '600'
  },
  compressionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7'
  },
  compressionText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: -4
  },
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
    marginTop: 2,
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
