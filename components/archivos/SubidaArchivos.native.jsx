import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Divider,
    IconButton,
    Snackbar,
    Text,
    TextInput,
} from "react-native-paper";

import {
    EvidenciasVentasEfectivoCollection,
    VentasRechargeCollection,
} from "../collections/collections";
import DrawerBottom from "../drawer/DrawerBottom.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const UPLOAD_VENTA_FIELDS = {
  _id: 1,
  cobrado: 1,
  createdAt: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  "producto.carritos._id": 1,
  "producto.carritos.coordenadas": 1,
  "producto.carritos.idTienda": 1,
  "producto.carritos.type": 1,
  "producto.comisiones": 1,
};

const UPLOAD_EVIDENCIA_FIELDS = {
  _id: 1,
  aprobado: 1,
  base64: 1,
  cancelada: 1,
  cancelado: 1,
  createdAt: 1,
  data: 1,
  dataB64: 1,
  dataBase64: 1,
  denegado: 1,
  descripcion: 1,
  detalles: 1,
  estado: 1,
  fecha: 1,
  fechaSubida: 1,
  isCancelada: 1,
  rechazado: 1,
  size: 1,
  tamano: 1,
  ventaId: 1,
};

const ESTADOS = {
  APROBADA: "APROBADA",
  PENDIENTE: "PENDIENTE",
  RECHAZADA: "RECHAZADA",
};

const mapEvidenciaDoc = (evidencia, index) => {
  const aprobado = !!evidencia.aprobado;
  const cancelFlag = !!(
    evidencia.cancelado ||
    evidencia.cancelada ||
    evidencia.isCancelada ||
    evidencia.estado === "CANCELADA"
  );
  const rechazadoFlag = !!(
    evidencia.rechazado ||
    evidencia.denegado ||
    evidencia.estado === ESTADOS.RECHAZADA ||
    evidencia.estado === "RECHAZADA"
  );
  const rechazado = cancelFlag || rechazadoFlag;

  let estado = ESTADOS.PENDIENTE;
  if (rechazado) {
    estado = ESTADOS.RECHAZADA;
  } else if (aprobado) {
    estado = ESTADOS.APROBADA;
  }

  return {
    _id: evidencia._id,
    _idx: index,
    aprobado,
    base64:
      evidencia.base64 ||
      evidencia.dataBase64 ||
      evidencia.data ||
      evidencia.dataB64,
    createdAt:
      evidencia.createdAt || evidencia.fecha || evidencia.fechaSubida || null,
    descripcion: evidencia.descripcion || evidencia.detalles || "",
    estado,
    raw: evidencia,
    rechazado,
    size: evidencia.size || evidencia.tamano || 0,
  };
};

const formatFileSize = (bytes) => {
  if (!bytes) {
    return "0 B";
  }

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

const extraerCuentas = (texto) => {
  if (!texto) {
    return [];
  }

  const regex = /Cuenta:\s*([0-9\s\-]+)/gi;
  const matches = [...texto.matchAll(regex)];

  return matches
    .map((match, index) => {
      const numeroLimpio = match[1].replace(/[\s\-]/g, "");
      const contexto = texto.substring(
        Math.max(0, match.index - 50),
        match.index,
      );
      const label = contexto.toLowerCase().includes("otros bancos")
        ? "Otros bancos"
        : contexto.toLowerCase().includes("santander")
          ? "Santander"
          : `Cuenta ${index + 1}`;

      return { label, numero: numeroLimpio };
    })
    .filter((cuenta) => cuenta.numero.length >= 8);
};

const getBase64SizeBytes = (base64) => {
  if (!base64) {
    return 0;
  }

  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const IMAGE_PICKER_OPTIONS = {
  allowsEditing: false,
  base64: true,
  exif: true,
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.5,
};

const CAMERA_PICKER_OPTIONS = {
  allowsEditing: true,
  base64: true,
  exif: true,
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.5,
};

const requestCameraPermission = async () => {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) {
    return true;
  }

  if (current.status === "denied" && !current.canAskAgain) {
    Alert.alert(
      "Permiso de camara bloqueado",
      "Para tomar fotos, debes habilitar la camara en Configuracion.",
      [
        { style: "cancel", text: "Cancelar" },
        { onPress: () => Linking.openSettings(), text: "Abrir Configuracion" },
      ],
    );
    return false;
  }

  const requestResult = await ImagePicker.requestCameraPermissionsAsync();
  if (requestResult.granted) {
    return true;
  }

  Alert.alert(
    "Permiso de camara denegado",
    "Para tomar fotos, necesitas habilitar el acceso a la camara.",
    [
      { style: "cancel", text: "Cancelar" },
      { onPress: () => Linking.openSettings(), text: "Abrir Configuracion" },
    ],
  );
  return false;
};

const requestGalleryPermission = async () => {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted || current.accessPrivileges === "limited") {
    return true;
  }

  if (current.status === "denied" && !current.canAskAgain) {
    Alert.alert(
      "Permiso de galeria bloqueado",
      "Para seleccionar fotos, debes habilitar el acceso a Fotos en Configuracion.",
      [
        { style: "cancel", text: "Cancelar" },
        { onPress: () => Linking.openSettings(), text: "Abrir Configuracion" },
      ],
    );
    return false;
  }

  const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requestResult.granted || requestResult.accessPrivileges === "limited") {
    return true;
  }

  Alert.alert(
    "Permiso de galeria denegado",
    "Para seleccionar fotos, necesitas habilitar el acceso a la galeria.",
    [
      { style: "cancel", text: "Cancelar" },
      { onPress: () => Linking.openSettings(), text: "Abrir Configuracion" },
    ],
  );
  return false;
};

const buildSelectedFile = (asset, originalSizeBytes = null) => {
  const fileSize = asset.fileSize || getBase64SizeBytes(asset.base64);
  return {
    base64: asset.base64,
    fileName: asset.fileName || `imagen_${Date.now()}.jpg`,
    fileSize,
    height: asset.height,
    originalSizeBytes: originalSizeBytes || fileSize,
    uri: asset.uri,
    width: asset.width,
  };
};

const SubidaArchivos = ({ venta }) => {
  const ventaId = venta?._id;
  const [openSheet, setOpenSheet] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [preview, setPreview] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [tarjetaCUP, setTarjetaCUP] = useState("0000-0000-0000-0000");
  const [cuentaBancaria, setCuentaBancaria] = useState(null);
  const [loadingCuentaInfo, setLoadingCuentaInfo] = useState(false);
  const [archivoOriginalSize, setArchivoOriginalSize] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [comisionesInfo, setComisionesInfo] = useState({
    data: null,
    error: null,
    loading: false,
  });
  const categoria = "general";
  const blockedUserId = Meteor.user()?.bloqueadoDesbloqueadoPor;

  const ventaReact = Meteor.useTracker(() => {
    if (!ventaId) {
      return null;
    }

    const ready = Meteor.subscribe("ventasRecharge", { _id: ventaId }, {
      fields: UPLOAD_VENTA_FIELDS,
    }).ready();
    const ventaDoc = ready
      ? VentasRechargeCollection.find(
          { _id: ventaId },
          { fields: UPLOAD_VENTA_FIELDS },
        ).fetch()
      : null;
    return ventaDoc?.length > 0 ? ventaDoc[0] : null;
  }, [ventaId]);

  const tiendaIdParaComisiones = useMemo(() => {
    const carritos = ventaReact?.producto?.carritos || [];
    const itemComercio = carritos.find((item) => item?.type === "COMERCIO");
    return itemComercio?.idTienda || itemComercio?.producto?.idTienda || null;
  }, [ventaReact]);

  const monedaFinalParaComisiones = useMemo(
    () => ventaReact?.monedaCobrado || "CUP",
    [ventaReact],
  );
  const subtotalVenta = useMemo(
    () => parseFloat(ventaReact?.cobrado) || 0,
    [ventaReact],
  );
  const montoComisiones = useMemo(
    () => parseFloat(comisionesInfo?.data?.montoTotal) || 0,
    [comisionesInfo],
  );
  const totalConComisiones = useMemo(
    () => subtotalVenta + montoComisiones,
    [montoComisiones, subtotalVenta],
  );

  useEffect(() => {
    let cancelled = false;
    const debeCalcular =
      !!ventaId && !!tiendaIdParaComisiones && !!monedaFinalParaComisiones;

    if (!debeCalcular) {
      setComisionesInfo({ data: null, error: null, loading: false });
      return () => {
        cancelled = true;
      };
    }

    setComisionesInfo((prev) => ({ ...prev, error: null, loading: true }));
    Meteor.call(
      "calculoDeComisionesPorTiendaFinanl",
      ventaId,
      tiendaIdParaComisiones,
      monedaFinalParaComisiones,
      (err, res) => {
        if (cancelled) {
          return;
        }

        if (err) {
          setComisionesInfo({
            data: null,
            error: err?.reason || err?.message || "Error obteniendo comisiones",
            loading: false,
          });
          return;
        }

        if (!res?.success) {
          setComisionesInfo({
            data: null,
            error: res?.message || "No se pudo calcular comisiones",
            loading: false,
          });
          return;
        }

        setComisionesInfo({ data: res, error: null, loading: false });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [monedaFinalParaComisiones, tiendaIdParaComisiones, ventaId]);

  useEffect(() => {
    const fetchCuentaInfo = async () => {
      try {
        const moneda = ventaReact?.monedaCobrado;
        if (!moneda) {
          return;
        }

        if (moneda === "CUP") {
          const userId = Meteor.user()?.bloqueadoDesbloqueadoPor;
          if (userId) {
            const result = await new Promise((resolve, reject) => {
              Meteor.call(
                "property.getValor",
                "CONFIG",
                `TARJETA_CUP_${userId}`,
                (error, value) => {
                  if (error) {
                    reject(error);
                    return;
                  }

                  resolve(value);
                },
              );
            });
            setTarjetaCUP(result || "0000 0000 0000 0000");
          }
          return;
        }

        setLoadingCuentaInfo(true);
        const userId =
          Meteor.user()?.bloqueadoDesbloqueadoPor || Meteor.userId();
        const claveCuenta = `CUENTA_${moneda}_${userId}`;
        const result = await new Promise((resolve, reject) => {
          Meteor.call(
            "property.getValor",
            "CONFIG",
            claveCuenta,
            (error, value) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(value);
            },
          );
        });
        setCuentaBancaria(result || null);
      } catch (_error) {
        if (ventaReact?.monedaCobrado === "CUP") {
          setTarjetaCUP("0000 0000 0000 0000");
        } else {
          setCuentaBancaria(null);
        }
      } finally {
        setLoadingCuentaInfo(false);
      }
    };

    if (Meteor.user() && ventaReact?.monedaCobrado) {
      fetchCuentaInfo();
    }
  }, [blockedUserId, ventaReact]);

  const cuentasExtraidas = useMemo(
    () => extraerCuentas(cuentaBancaria),
    [cuentaBancaria],
  );

  const evidenciasSubsc = Meteor.useTracker(() => {
    if (!ventaId) {
      return [];
    }

    Meteor.subscribe("evidenciasVentasEfectivoRecharge", { ventaId }, {
      fields: UPLOAD_EVIDENCIA_FIELDS,
    });
    return EvidenciasVentasEfectivoCollection.find(
      { ventaId },
      { fields: UPLOAD_EVIDENCIA_FIELDS, sort: { createdAt: -1 } },
    ).fetch();
  }, [ventaId]);

  const evidencias = useMemo(() => {
    const raw = Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [];
    return raw.map(mapEvidenciaDoc).filter((evidencia) => !!evidencia.base64);
  }, [evidenciasSubsc]);

  const tieneEvidencias = evidencias.length > 0;
  const uploadInhabilitado = useMemo(
    () => !!(ventaReact?.isCobrado || ventaReact?.isCancelada),
    [ventaReact?.isCancelada, ventaReact?.isCobrado],
  );
  const miniBase64 = archivoSeleccionado?.base64 || evidencias[0]?.base64;
  const compressionRatio = useMemo(() => {
    if (!archivoSeleccionado?.fileSize || !archivoOriginalSize) {
      return null;
    }

    const reduction =
      (1 - archivoSeleccionado.fileSize / archivoOriginalSize) * 100;
    return reduction > 0 ? reduction.toFixed(1) : null;
  }, [archivoOriginalSize, archivoSeleccionado?.fileSize]);

  const procesarSeleccion = (asset, originalSizeBytes = null) => {
    if (!asset?.base64) {
      Alert.alert("Error", "No se pudo obtener la imagen seleccionada.");
      return;
    }

    const file = buildSelectedFile(asset, originalSizeBytes || asset.fileSize);
    setArchivoOriginalSize(file.originalSizeBytes);
    setArchivoSeleccionado(file);
  };

  const abrirGaleriaConRecorteExpo = async (fallbackAsset) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        ...IMAGE_PICKER_OPTIONS,
        allowsEditing: true,
        aspect: [4, 4],
      });
      if (result.canceled) {
        procesarSeleccion(
          fallbackAsset,
          fallbackAsset.fileSize || getBase64SizeBytes(fallbackAsset.base64),
        );
        return;
      }

      procesarSeleccion(
        result.assets[0],
        fallbackAsset.fileSize || getBase64SizeBytes(fallbackAsset.base64),
      );
    } catch (_error) {
      procesarSeleccion(
        fallbackAsset,
        fallbackAsset.fileSize || getBase64SizeBytes(fallbackAsset.base64),
      );
    }
  };

  const abrirGaleriaConCroppingInteligente = async () => {
    try {
      const allowed = await requestGalleryPermission();
      if (!allowed) {
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const imageSizeBytes = asset.fileSize || getBase64SizeBytes(asset.base64);
      const imageSizeMB = imageSizeBytes / 1024 / 1024;

      if (imageSizeMB < 5) {
        Alert.alert(
          "Recortar imagen",
          "Deseas recortar la imagen antes de subirla?",
          [
            {
              onPress: () => procesarSeleccion(asset, imageSizeBytes),
              text: "No, usar completa",
            },
            {
              onPress: () => abrirGaleriaConRecorteExpo(asset),
              text: "Si, recortar",
            },
          ],
        );
        return;
      }

      procesarSeleccion(asset, imageSizeBytes);
    } catch (_error) {
      Alert.alert(
        "Error",
        "No se pudo abrir la galeria. Por favor, intenta nuevamente.",
      );
    }
  };

  const abrirCamara = async () => {
    try {
      const allowed = await requestCameraPermission();
      if (!allowed) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync(CAMERA_PICKER_OPTIONS);
      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      procesarSeleccion(
        asset,
        asset.fileSize || getBase64SizeBytes(asset.base64),
      );
    } catch (_error) {
      const message =
        Platform.OS === "ios"
          ? "La camara no esta disponible en este entorno. Usa un dispositivo fisico o la galeria."
          : "No se pudo abrir la camara.";
      Alert.alert("Error", message);
    }
  };

  const seleccionarArchivo = () => {
    Alert.alert("Seleccionar imagen", "Elige una opcion:", [
      { style: "cancel", text: "Cancelar" },
      { onPress: abrirCamara, text: "Camara" },
      { onPress: abrirGaleriaConCroppingInteligente, text: "Galeria" },
    ]);
  };

  const subirArchivo = async () => {
    if (!archivoSeleccionado) {
      Alert.alert("Error", "Debe seleccionar un archivo");
      return;
    }

    setCargando(true);
    try {
      const fileData = {
        data: archivoSeleccionado.base64,
        metadata: { descripcion },
        name: archivoSeleccionado.fileName || `imagen_${Date.now()}.jpg`,
        size: archivoSeleccionado.fileSize,
        ventaId,
      };
      const metadata = { categoria, descripcion };
      Meteor.call("archivos.upload", fileData, metadata, (error, result) => {
        if (error) {
          Alert.alert("Error", error.reason || "No se pudo subir el archivo");
          return;
        }

        if (result?.success) {
          Alert.alert("Exito", "Archivo subido exitosamente");
          setArchivoSeleccionado(null);
          setDescripcion("");
          setOpenSheet(false);
        }
      });
    } catch (error) {
      Alert.alert("Error", error.reason || "No se pudo subir el archivo");
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarEvidencias = () => {
    if (uploadInhabilitado) {
      Alert.alert(
        "Accion no permitida",
        "No se pueden eliminar evidencias de una venta cobrada o cancelada.",
      );
      return;
    }

    if (eliminando || !preview) {
      return;
    }

    const evidenciaId = preview._id || preview.raw?._id;
    if (!evidenciaId) {
      Alert.alert("Error", "No se pudo determinar el ID de la evidencia");
      return;
    }

    Alert.alert("Confirmar", "Desea eliminar esta evidencia?", [
      { style: "cancel", text: "Cancelar" },
      {
        onPress: () => {
          setEliminando(true);
          Meteor.call("archivos.delete", evidenciaId, (err) => {
            if (err) {
              Alert.alert(
                "Error",
                err.reason || "No se pudo eliminar la evidencia",
              );
            } else {
              Alert.alert("Exito", "Evidencia eliminada");
              setPreview(null);
            }
            setEliminando(false);
          });
        },
        style: "destructive",
        text: "Eliminar",
      },
    ]);
  };

  const copyDatosPago = async () => {
    const moneda = ventaReact?.monedaCobrado;
    const textToCopy = moneda === "CUP" ? tarjetaCUP : cuentaBancaria;
    if (!textToCopy) {
      Alert.alert("Aviso", "No hay datos de pago para copiar.");
      return;
    }

    try {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert(
        "Copiado",
        "Los datos de pago fueron copiados al portapapeles.",
      );
    } catch {
      Alert.alert("Error", "No se pudo copiar la informacion.");
    }
  };

  const copiarCuenta = async (numero, label) => {
    try {
      await Clipboard.setStringAsync(numero);
      setSnackbarMessage(`${label} copiada: ${numero}`);
      setSnackbarVisible(true);
    } catch {
      Alert.alert("Error", "No se pudo copiar el numero de cuenta.");
    }
  };

  const renderInfoPago = () => {
    const moneda = ventaReact?.monedaCobrado;
    if (moneda === "CUP") {
      return (
        <View style={styles.tarjetaRow}>
          <View style={styles.flexOne}>
            <Text style={styles.tarjetaLabel}>Tarjeta destino (CUP)</Text>
            <Text style={styles.tarjetaNumero}>{tarjetaCUP || "—"}</Text>
          </View>
          <IconButton
            icon="content-copy"
            size={20}
            onPress={copyDatosPago}
            disabled={!tarjetaCUP}
            accessibilityLabel="Copiar tarjeta"
          />
        </View>
      );
    }

    return (
      <View style={styles.cuentaBancariaContainer}>
        <View style={styles.flexOne}>
          <View style={styles.cuentaHeaderRow}>
            <Text style={styles.tarjetaLabel}>Datos de cuenta ({moneda})</Text>
            <IconButton
              icon="content-copy"
              size={18}
              onPress={copyDatosPago}
              disabled={!cuentaBancaria || loadingCuentaInfo}
              accessibilityLabel="Copiar texto completo"
              style={styles.zeroMargin}
            />
          </View>

          {loadingCuentaInfo ? (
            <ActivityIndicator size="small" style={styles.marginTop8} />
          ) : cuentaBancaria ? (
            <>
              <Text style={styles.cuentaBancariaTexto}>{cuentaBancaria}</Text>
              {cuentasExtraidas.length > 0 ? (
                <View style={styles.chipsContainer}>
                  <Text style={styles.chipsLabel}>Cuentas detectadas:</Text>
                  <View style={styles.chipsRow}>
                    {cuentasExtraidas.map((cuenta, index) => (
                      <Chip
                        key={`${cuenta.numero}-${index}`}
                        mode="outlined"
                        onPress={() =>
                          copiarCuenta(cuenta.numero, cuenta.label)
                        }
                        icon="content-copy"
                        style={styles.cuentaChip}
                        textStyle={styles.cuentaChipText}
                      >
                        {cuenta.label}: {cuenta.numero}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.cuentaBancariaSinDatos}>
              No hay datos de cuenta configurados para {moneda}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (!venta) {
    return null;
  }

  return (
    <>
      <Card style={styles.ventaCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.flexOne}>
              <View style={styles.montoBlock}>
                <View>
                  <Text style={[styles.labelMonto, styles.montoLabelSmall]}>
                    Monto a pagar
                  </Text>
                  <Text style={[styles.montoAPagar, styles.montoStrong]}>
                    $
                    {Number(
                      tiendaIdParaComisiones
                        ? totalConComisiones
                        : subtotalVenta,
                    ).toFixed(2)}{" "}
                    {ventaReact?.monedaCobrado}
                  </Text>
                  {tiendaIdParaComisiones ? (
                    <>
                      <Text style={styles.montoDetalle}>
                        • Subtotal: {subtotalVenta.toFixed(2)}{" "}
                        {ventaReact?.monedaCobrado}
                      </Text>
                      <Text style={styles.montoDetalle}>
                        • Comisiones:{" "}
                        {comisionesInfo.loading
                          ? "N/A"
                          : montoComisiones.toFixed(2)}{" "}
                        {ventaReact?.monedaCobrado}
                      </Text>
                    </>
                  ) : null}
                </View>
                <Chip
                  compact
                  mode="contained"
                  style={styles.metodoChip}
                  textStyle={styles.metodoChipText}
                >
                  TRANSFERENCIA
                </Chip>
              </View>
              {renderInfoPago()}
            </View>
          </View>

          {miniBase64 ? (
            <View style={styles.thumbRow}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${miniBase64}` }}
                style={styles.thumbnail}
              />
              <View style={styles.thumbTextBox}>
                <Text style={styles.thumbLabel}>
                  {archivoSeleccionado
                    ? "Evidencia seleccionada"
                    : "Ultima Captura Subida"}
                </Text>
                {archivoSeleccionado ? (
                  <Text style={styles.thumbSize}>
                    {(
                      (archivoSeleccionado.fileSize || 0) /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <Divider style={styles.marginVertical8} />
          <View style={styles.evidenciasHeaderRow}>
            <Text style={styles.evidenciasTitle}>
              Evidencias ({evidencias.length})
            </Text>
            <Button
              mode={tieneEvidencias ? "text" : "contained"}
              icon={tieneEvidencias ? "plus" : "camera-plus"}
              onPress={() => !uploadInhabilitado && setOpenSheet(true)}
              compact
              disabled={cargando || uploadInhabilitado}
            >
              {tieneEvidencias ? "Agregar" : "Subir"}
            </Button>
          </View>

          {tieneEvidencias ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.evidenciasScroll}
            >
              {evidencias.map((evidencia) => {
                const uri = `data:image/jpeg;base64,${evidencia.base64}`;
                const borderStyle = evidencia.rechazado
                  ? styles.rechazadoBorder
                  : evidencia.aprobado
                    ? styles.aprobadoBorder
                    : styles.pendienteBorder;
                const badgeText = evidencia.rechazado
                  ? "CANC"
                  : evidencia.aprobado
                    ? "OK"
                    : "PEND";
                return (
                  <Pressable
                    key={evidencia._id}
                    style={[styles.evidenciaThumbContainer, borderStyle]}
                    onPress={() => setPreview(evidencia)}
                  >
                    <Image source={{ uri }} style={styles.evidenciaThumb} />
                    <View style={styles.badgeEstado}>
                      <Text
                        style={[
                          styles.badgeEstadoText,
                          evidencia.aprobado && styles.badgeEstadoOk,
                          evidencia.rechazado && styles.badgeEstadoDenied,
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
            <Text style={styles.sinEvidenciasText}>
              No hay evidencias todavia.
            </Text>
          )}
        </Card.Content>
      </Card>

      <DrawerBottom
        open={openSheet}
        onClose={() => !cargando && setOpenSheet(false)}
        title="Subir Archivo"
        side="bottom"
        actions={[
          {
            icon: "upload",
            onPress: () => !cargando && !uploadInhabilitado && subirArchivo(),
            disabled: !archivoSeleccionado || cargando || uploadInhabilitado,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={seleccionarArchivo}
          style={styles.boton}
          disabled={cargando || uploadInhabilitado}
          icon={archivoSeleccionado ? "image-edit" : "camera"}
        >
          {archivoSeleccionado ? "Cambiar archivo" : "Seleccionar archivo"}
        </Button>

        {archivoSeleccionado ? (
          <View style={styles.archivoPreview}>
            <Text style={styles.archivoInfo}>
              📸 {archivoSeleccionado.fileName || "imagen.jpg"}
            </Text>
            <View style={styles.archivoMetaRow}>
              <View style={styles.flexOne}>
                <Text style={styles.archivoMetaLabel}>Tamaño optimizado</Text>
                <Text style={styles.archivoTamaño}>
                  {formatFileSize(archivoSeleccionado.fileSize)}
                </Text>
              </View>
              <View style={styles.archivoMetaEnd}>
                <Text style={styles.archivoMetaLabel}>Dimensiones</Text>
                <Text style={styles.archivoTamaño}>
                  {archivoSeleccionado.width}×{archivoSeleccionado.height}
                </Text>
              </View>
            </View>
            {compressionRatio ? (
              <View style={styles.compressionBadge}>
                <IconButton
                  icon="check-circle"
                  size={16}
                  iconColor="#2E7D32"
                  style={styles.zeroMargin}
                />
                <Text style={styles.compressionText}>
                  Imagen optimizada • Reduccion del {compressionRatio}%
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

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
          {cargando ? <ActivityIndicator color="white" /> : "Subir evidencia"}
        </Button>
      </DrawerBottom>

      <DrawerBottom
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `Evidencia ${preview._idx + 1}` : ""}
        side="bottom"
        actions={[
          preview
            ? preview.rechazado
              ? { icon: "close-octagon", disabled: true }
              : preview.aprobado
                ? { icon: "check-decagram", disabled: true }
                : { icon: "clock-outline", disabled: true }
            : {},
        ]}
      >
        {preview ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${preview.base64}` }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.previewMetaBox}>
              {preview.estado === ESTADOS.APROBADA ? (
                <Chip
                  mode="outlined"
                  compact
                  icon="check"
                  style={styles.chipAprobado}
                  textStyle={styles.chipEstadoText}
                >
                  Aprobada
                </Chip>
              ) : null}
              {preview.estado === ESTADOS.RECHAZADA ? (
                <Chip
                  mode="outlined"
                  compact
                  icon="close-octagon"
                  style={styles.chipRechazada}
                  textStyle={styles.chipEstadoText}
                >
                  Rechazada
                </Chip>
              ) : null}
              {preview.estado === ESTADOS.PENDIENTE ? (
                <Chip
                  mode="outlined"
                  compact
                  icon="progress-clock"
                  style={styles.chipPendiente}
                  textStyle={styles.chipEstadoText}
                >
                  Pendiente
                </Chip>
              ) : null}
              <Text style={styles.previewFecha}>
                {preview.createdAt
                  ? moment(preview.createdAt).format("DD/MM/YYYY HH:mm")
                  : "Sin fecha"}
              </Text>
              {preview.size ? (
                <Text style={styles.previewTamano}>
                  Tamaño: {(preview.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              ) : null}
              {preview.descripcion ? (
                <Text style={styles.previewDescripcion}>
                  {preview.descripcion}
                </Text>
              ) : null}
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
        ) : null}
      </DrawerBottom>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  aprobadoBorder: { borderColor: "#2ecc71", borderWidth: 2 },
  archivoInfo: {
    color: "#495057",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  archivoMetaEnd: { alignItems: "flex-end", flex: 1 },
  archivoMetaLabel: {
    color: "#6c757d",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  archivoMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  archivoPreview: {
    backgroundColor: "#f8f9fa",
    borderColor: "#e9ecef",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  archivoTamaño: { color: "#212529", fontSize: 12, fontWeight: "600" },
  badgeEstado: {
    backgroundColor: "#00000088",
    borderRadius: 4,
    bottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: "absolute",
    right: 2,
  },
  badgeEstadoDenied: { color: "#e74c3c" },
  badgeEstadoOk: { color: "#2ecc71" },
  badgeEstadoText: { color: "#fff", fontSize: 9, fontWeight: "600" },
  boton: { height: 44, justifyContent: "center", marginBottom: 14 },
  botonEliminar: { marginTop: 14 },
  botonSubir: { height: 44, justifyContent: "center", marginTop: 6 },
  chipAprobado: { borderColor: "#2ecc71" },
  chipEstadoText: { fontSize: 11 },
  chipPendiente: { borderColor: "#f1c40f" },
  chipRechazada: { borderColor: "#e74c3c" },
  chipsContainer: {
    borderTopColor: "#e9ecef",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 8,
  },
  chipsLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
    opacity: 0.6,
    textTransform: "uppercase",
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  compressionBadge: {
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compressionText: {
    color: "#2E7D32",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: -4,
  },
  cuentaBancariaContainer: {
    alignItems: "flex-start",
    borderColor: "#eeeeee",
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 10,
    paddingVertical: 8,
  },
  cuentaBancariaSinDatos: {
    color: "#999",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  cuentaBancariaTexto: {
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 16,
    marginTop: 4,
    opacity: 0.7,
  },
  cuentaChip: { borderColor: "#0066cc", height: 32 },
  cuentaChipText: { color: "#0066cc", fontSize: 11, fontWeight: "600" },
  cuentaHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  evidenciasHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  evidenciasScroll: { paddingVertical: 6 },
  evidenciasTitle: { fontSize: 13, fontWeight: "600" },
  evidenciaThumb: { height: "100%", width: "100%" },
  evidenciaThumbContainer: {
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 10,
    height: 62,
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    width: 62,
  },
  flexOne: { flex: 1 },
  headerRow: { alignItems: "center", flexDirection: "row" },
  input: { marginBottom: 14 },
  labelMonto: { color: "#666", fontSize: 11, fontWeight: "500" },
  marginTop8: { marginTop: 8 },
  marginVertical8: { marginVertical: 8 },
  metodoChip: {
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderColor: "#90CAF9",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    height: 30,
    justifyContent: "center",
    maxWidth: 150,
  },
  metodoChipText: { fontSize: 12 },
  montoAPagar: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  montoBlock: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  montoDetalle: { fontSize: 11, marginTop: 2, opacity: 0.7 },
  montoLabelSmall: { fontSize: 14 },
  montoStrong: { fontSize: 18, fontWeight: "bold" },
  pendienteBorder: { borderColor: "#f1c40f", borderWidth: 2 },
  previewDescripcion: {
    backgroundColor: "#f1f3f5",
    borderRadius: 6,
    color: "#333",
    fontSize: 12,
    marginTop: 2,
    padding: 8,
  },
  previewFecha: { color: "#555", fontSize: 11, marginTop: 6 },
  previewImage: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 280,
    width: "100%",
  },
  previewMetaBox: { marginTop: 12 },
  previewTamano: { color: "#555", fontSize: 11, marginTop: 2 },
  previewWrapper: { paddingBottom: 10 },
  rechazadoBorder: { borderColor: "#e74c3c", borderWidth: 2 },
  sinEvidenciasText: {
    color: "#777",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  snackbar: { marginBottom: 16 },
  tarjetaLabel: { fontSize: 11, fontWeight: "600" },
  tarjetaNumero: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tarjetaRow: {
    alignItems: "center",
    borderColor: "#eeeeee",
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 10,
    paddingVertical: 6,
  },
  thumbLabel: { color: "#333", fontSize: 12, fontWeight: "600" },
  thumbRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
    marginTop: 10,
  },
  thumbSize: { color: "#666", fontSize: 10, marginTop: 2 },
  thumbTextBox: { flex: 1, marginLeft: 8 },
  thumbnail: {
    backgroundColor: "#eee",
    borderRadius: 8,
    height: 50,
    width: 50,
  },
  ventaCard: { borderRadius: 60, elevation: 2 },
  zeroMargin: { margin: 0 },
});

export default SubidaArchivos;
