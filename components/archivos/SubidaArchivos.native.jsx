import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
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
    Chip,
    Divider,
    IconButton,
    Snackbar,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { requestEvidenceImageUrls } from "../../services/meteor/evidenceImages";
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
  adminId: 1,
  cobrado: 1,
  createdAt: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
  "producto.userId": 1,
  userId: 1,
};

const UPLOAD_EVIDENCIA_FIELDS = {
  _id: 1,
  "analisisIA.summary": 1,
  aprobado: 1,
  cancelada: 1,
  cancelado: 1,
  createdAt: 1,
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

const SALE_USER_PAYMENT_FIELDS = {
  _id: 1,
  bloqueadoDesbloqueadoPor: 1,
};

const PAYMENT_PROPERTY_CACHE_PREFIX = "payment.property.cache.v1.";

const normalizePaymentCard = (value) => {
  const rawValue = String(value || "").trim();
  const digits = rawValue.replace(/\D/g, "");

  if (digits.length === 16) {
    if (/^0+$/.test(digits)) {
      return null;
    }

    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  return rawValue && !/^0[-\s]?0[-\s]?0[-\s]?0/.test(rawValue)
    ? rawValue
    : null;
};

const buildPaymentPropertyCacheKey = (propertyKey) =>
  `${PAYMENT_PROPERTY_CACHE_PREFIX}${String(propertyKey || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120)}`;

const readCachedPaymentProperty = async (propertyKey) => {
  if (!propertyKey) {
    return null;
  }

  try {
    const raw = await SecureStore.getItemAsync(
      buildPaymentPropertyCacheKey(propertyKey),
    );
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return typeof parsed?.value === "string" ? parsed.value : null;
  } catch {
    return null;
  }
};

const writeCachedPaymentProperty = async (propertyKey, value) => {
  if (!propertyKey) {
    return;
  }

  const cacheKey = buildPaymentPropertyCacheKey(propertyKey);
  try {
    if (!value) {
      await SecureStore.deleteItemAsync(cacheKey);
      return;
    }

    await SecureStore.setItemAsync(
      cacheKey,
      JSON.stringify({ updatedAt: Date.now(), value }),
    );
  } catch {
    // Cache is an optimization; payment data still comes from Meteor.
  }
};

const ESTADOS = {
  APROBADA: "APROBADA",
  PENDIENTE: "PENDIENTE",
  RECHAZADA: "RECHAZADA",
};

const getUploadPalette = (isDarkMode) => {
  const android = Platform.OS === "android";

  return {
    border: isDarkMode ? "rgba(96, 165, 250, 0.22)" : "rgba(15, 23, 42, 0.1)",
    card: isDarkMode
      ? android
        ? "rgba(8, 19, 43, 0.72)"
        : "rgba(8, 19, 43, 0.82)"
      : android
        ? "rgba(255, 255, 255, 0.38)"
        : "rgba(255, 255, 255, 0.58)",
    copy: isDarkMode ? "#cbd5e1" : "#475569",
    emptyIcon: isDarkMode ? "#93c5fd" : "#64748b",
    emptyIconSoft: isDarkMode ? "rgba(59, 130, 246, 0.18)" : "rgba(100, 116, 139, 0.12)",
    emptyPanel: isDarkMode ? "rgba(15, 37, 74, 0.72)" : "rgba(248, 250, 252, 0.92)",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    successSoft: isDarkMode ? "rgba(34, 197, 94, 0.12)" : "rgba(220, 252, 231, 0.9)",
    successText: isDarkMode ? "#86efac" : "#2E7D32",
    soft: isDarkMode
      ? android
        ? "rgba(30, 64, 124, 0.34)"
        : "rgba(30, 64, 124, 0.46)"
      : android
        ? "rgba(248, 250, 252, 0.32)"
        : "rgba(248, 250, 252, 0.56)",
    softAlt: isDarkMode ? "rgba(15, 37, 74, 0.7)" : "rgba(255, 255, 255, 0.9)",
    strong: isDarkMode ? "#f8fafc" : "#0f172a",
    surface: isDarkMode ? "rgba(11, 31, 67, 0.82)" : "rgba(255, 255, 255, 0.58)",
    surfaceAlt: isDarkMode ? "rgba(30, 64, 124, 0.82)" : "rgba(248, 250, 252, 0.96)",
  };
};

const getVentaUserId = (ventaDoc, fallbackVenta) => {
  const carritos =
    ventaDoc?.producto?.carritos || fallbackVenta?.producto?.carritos || [];
  const carritoConUsuario = Array.isArray(carritos)
    ? carritos.find((item) => item?.idUser || item?.userId)
    : null;

  return (
    ventaDoc?.userId ||
    fallbackVenta?.userId ||
    ventaDoc?.producto?.userId ||
    fallbackVenta?.producto?.userId ||
    carritoConUsuario?.idUser ||
    carritoConUsuario?.userId ||
    null
  );
};

const mapEvidenciaDoc = (evidencia, index, imageUrl = null) => {
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
    analysis: {
      summary:
        typeof evidencia?.analisisIA?.summary === "string"
          ? evidencia.analisisIA.summary.trim()
          : "",
    },
    aprobado,
    createdAt:
      evidencia.createdAt || evidencia.fecha || evidencia.fechaSubida || null,
    descripcion: evidencia.descripcion || evidencia.detalles || "",
    estado,
    imageUrl,
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
  const theme = useTheme();
  const uploadPalette = useMemo(
    () => getUploadPalette(theme.dark),
    [theme.dark],
  );
  const ventaId = venta?._id;
  const [openSheet, setOpenSheet] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [preview, setPreview] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [tarjetaCUP, setTarjetaCUP] = useState(null);
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
  const [evidenceImageUrls, setEvidenceImageUrls] = useState({});
  const [loadingEvidenceImages, setLoadingEvidenceImages] = useState(false);
  const categoria = "general";

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

  const ventaUserId = useMemo(
    () => getVentaUserId(ventaReact, venta),
    [venta, ventaReact],
  );

  const saleUserPaymentInfo = Meteor.useTracker(() => {
    if (!ventaUserId) {
      return {
        paymentOwnerId: null,
        ready: false,
        saleUserId: null,
      };
    }

    const handle = Meteor.subscribe(
      "user",
      { _id: ventaUserId },
      { fields: SALE_USER_PAYMENT_FIELDS },
    );
    const saleUser =
      Meteor.users.findOne(
        { _id: ventaUserId },
        { fields: SALE_USER_PAYMENT_FIELDS },
      ) || null;

    return {
      paymentOwnerId: saleUser?.bloqueadoDesbloqueadoPor || ventaUserId,
      ready: handle.ready(),
      saleUserId: ventaUserId,
    };
  }, [ventaUserId]);

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
    let cancelled = false;

    const fetchCuentaInfo = async () => {
      let hasCachedPaymentValue = false;

      try {
        const moneda = ventaReact?.monedaCobrado;
        if (!moneda) {
          return;
        }

        if (!saleUserPaymentInfo.ready) {
          setLoadingCuentaInfo(true);
          return;
        }

        const userId = saleUserPaymentInfo.paymentOwnerId;
        if (!userId) {
          setTarjetaCUP(null);
          setCuentaBancaria(null);
          setLoadingCuentaInfo(false);
          return;
        }

        const propertyKey =
          moneda === "CUP"
            ? `TARJETA_CUP_${userId}`
            : `CUENTA_${moneda}_${userId}`;
        const cachedValue = await readCachedPaymentProperty(propertyKey);
        const normalizedCachedValue =
          moneda === "CUP" ? normalizePaymentCard(cachedValue) : cachedValue;
        hasCachedPaymentValue = Boolean(normalizedCachedValue);

        if (cancelled) {
          return;
        }

        if (moneda === "CUP") {
          setTarjetaCUP(normalizedCachedValue);
        } else {
          setCuentaBancaria(normalizedCachedValue || null);
        }

        setLoadingCuentaInfo(!normalizedCachedValue);

        if (moneda === "CUP") {
          const result = await new Promise((resolve, reject) => {
            Meteor.call(
              "property.getValor",
              "CONFIG",
              propertyKey,
              (error, value) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve(value);
              },
            );
          });
          const normalizedResult = normalizePaymentCard(result);
          if (!cancelled) {
            setTarjetaCUP(normalizedResult);
          }
          await writeCachedPaymentProperty(propertyKey, normalizedResult);
          return;
        }

        const result = await new Promise((resolve, reject) => {
          Meteor.call(
            "property.getValor",
            "CONFIG",
            propertyKey,
            (error, value) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(value);
            },
          );
        });
        const normalizedResult = typeof result === "string" ? result.trim() : null;
        if (!cancelled) {
          setCuentaBancaria(normalizedResult || null);
        }
        await writeCachedPaymentProperty(propertyKey, normalizedResult);
      } catch (_error) {
        if (cancelled) {
          return;
        }

        if (hasCachedPaymentValue) {
          return;
        }

        if (ventaReact?.monedaCobrado === "CUP") {
          setTarjetaCUP(null);
        } else {
          setCuentaBancaria(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingCuentaInfo(false);
        }
      }
    };

    if (saleUserPaymentInfo.saleUserId && ventaReact?.monedaCobrado) {
      fetchCuentaInfo();
    }

    return () => {
      cancelled = true;
    };
  }, [
    saleUserPaymentInfo.paymentOwnerId,
    saleUserPaymentInfo.ready,
    saleUserPaymentInfo.saleUserId,
    ventaReact?.monedaCobrado,
  ]);

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

  const evidenceIds = useMemo(
    () =>
      (Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [])
        .map((evidencia) => evidencia?._id)
        .filter(Boolean),
    [evidenciasSubsc],
  );

  useEffect(() => {
    let cancelled = false;

    if (evidenceIds.length === 0) {
      setEvidenceImageUrls({});
      setLoadingEvidenceImages(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingEvidenceImages(true);
    requestEvidenceImageUrls(evidenceIds)
      .then((imageUrls) => {
        if (!cancelled) {
          setEvidenceImageUrls(imageUrls);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) {
          setLoadingEvidenceImages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [evidenceIds]);

  const evidencias = useMemo(() => {
    const raw = Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [];
    return raw
      .map((evidencia, index) =>
        mapEvidenciaDoc(evidencia, index, evidenceImageUrls[evidencia?._id]),
      )
      .filter((evidencia) => !!evidencia.imageUrl);
  }, [evidenceImageUrls, evidenciasSubsc]);

  const tieneEvidencias = evidencias.length > 0;
  const uploadInhabilitado = useMemo(
    () =>
      !!(
        venta?.isCobrado ||
        venta?.isCancelada ||
        ventaReact?.isCobrado ||
        ventaReact?.isCancelada
      ),
    [
      venta?.isCancelada,
      venta?.isCobrado,
      ventaReact?.isCancelada,
      ventaReact?.isCobrado,
    ],
  );

  useEffect(() => {
    if (uploadInhabilitado) {
      setOpenSheet(false);
    }
  }, [uploadInhabilitado]);

  const miniEvidenceUri = archivoSeleccionado?.base64
    ? `data:image/jpeg;base64,${archivoSeleccionado.base64}`
    : evidencias[0]?.imageUrl;
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
      const paymentText = loadingCuentaInfo
        ? "Consultando tarjeta..."
        : tarjetaCUP || "Tarjeta CUP no configurada";
      const paymentHint = tarjetaCUP
        ? "Copia este número y usa la tarjeta como destino del pago."
        : "No se encontró una tarjeta CUP para el administrador responsable.";

      return (
        <Surface
          elevation={0}
          style={[
            styles.tarjetaRow,
            {
              backgroundColor: uploadPalette.surface,
              borderColor: uploadPalette.border,
            },
          ]}
        >
          <View style={styles.flexOne}>
            <Text style={[styles.tarjetaLabel, { color: uploadPalette.copy }]}>
              Tarjeta destino (CUP)
            </Text>
            <View
              style={[
                styles.tarjetaValueBox,
                { backgroundColor: uploadPalette.softAlt },
              ]}
            >
              <Text style={[styles.tarjetaNumero, { color: uploadPalette.strong }]}>
                {paymentText}
              </Text>
              <Text style={[styles.tarjetaHint, { color: uploadPalette.muted }]}>
                {paymentHint}
              </Text>
            </View>
          </View>
          {loadingCuentaInfo ? (
            <ActivityIndicator size="small" />
          ) : (
            <IconButton
              icon="content-copy"
              size={20}
              onPress={copyDatosPago}
              disabled={!tarjetaCUP}
              accessibilityLabel="Copiar tarjeta"
            />
          )}
        </Surface>
      );
    }

    const monedaLabel = moneda || "transferencia";

    return (
      <Surface
        elevation={0}
        style={[
          styles.cuentaBancariaContainer,
          {
            backgroundColor: uploadPalette.surface,
            borderColor: uploadPalette.border,
          },
        ]}
      >
        <View style={styles.flexOne}>
          <View style={styles.cuentaHeaderRow}>
            <View style={styles.cuentaHeaderCopy}>
              <Text style={[styles.tarjetaLabel, { color: uploadPalette.copy }]}>Datos para transferencia</Text>
              <Text style={[styles.cuentaHeaderSubtitle, { color: uploadPalette.muted }] }>
                {moneda ? `Cuenta destino en ${monedaLabel}` : "Método de pago pendiente"}
              </Text>
            </View>
            {cuentaBancaria ? (
              <IconButton
                icon="content-copy"
                size={18}
                onPress={copyDatosPago}
                disabled={loadingCuentaInfo}
                accessibilityLabel="Copiar texto completo"
                style={styles.zeroMargin}
              />
            ) : null}
          </View>

          {loadingCuentaInfo ? (
            <View
              style={[
                styles.cuentaLoadingBox,
                { backgroundColor: uploadPalette.softAlt },
              ]}
            >
              <View style={styles.cuentaLoadingRow}>
                <ActivityIndicator size="small" />
                <Text style={[styles.cuentaLoadingText, { color: uploadPalette.copy }] }>
                  Consultando los datos bancarios para esta moneda...
                </Text>
              </View>
              <View
                style={[
                  styles.cuentaLoadingLine,
                  { backgroundColor: theme.dark ? "rgba(226,232,240,0.16)" : "rgba(148,163,184,0.22)" },
                ]}
              />
              <View
                style={[
                  styles.cuentaLoadingMeta,
                  { backgroundColor: theme.dark ? "rgba(226,232,240,0.1)" : "rgba(148,163,184,0.16)" },
                ]}
              />
            </View>
          ) : cuentaBancaria ? (
            <>
              <View
                style={[
                  styles.cuentaBancariaValueBox,
                  { backgroundColor: uploadPalette.softAlt },
                ]}
              >
                <Text style={[styles.cuentaBancariaTexto, { color: uploadPalette.strong }]}>{cuentaBancaria}</Text>
                <Text style={[styles.cuentaBancariaCopyHint, { color: uploadPalette.muted }] }>
                  Puedes copiar el texto completo o tocar una cuenta detectada.
                </Text>
              </View>
              {cuentasExtraidas.length > 0 ? (
                <View style={styles.chipsContainer}>
                  <Text style={[styles.chipsLabel, { color: uploadPalette.muted }]}>Cuentas detectadas:</Text>
                  <View style={styles.chipsRow}>
                    {cuentasExtraidas.map((cuenta, index) => (
                      <Chip
                        key={`${cuenta.numero}-${index}`}
                        mode="outlined"
                        onPress={() =>
                          copiarCuenta(cuenta.numero, cuenta.label)
                        }
                        icon="content-copy"
                        style={[
                          styles.cuentaChip,
                          {
                            backgroundColor: uploadPalette.soft,
                            borderColor: uploadPalette.border,
                          },
                        ]}
                        textStyle={[styles.cuentaChipText, { color: uploadPalette.strong }]}
                      >
                        {cuenta.label}: {cuenta.numero}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View
              style={[
                styles.cuentaSinDatosBox,
                {
                  backgroundColor: uploadPalette.emptyPanel,
                  borderColor: uploadPalette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.cuentaSinDatosIcon,
                  { backgroundColor: uploadPalette.emptyIconSoft },
                ]}
              >
                <Icon name="credit-card-off-outline" size={20} color={uploadPalette.emptyIcon} />
              </View>
              <View style={styles.cuentaSinDatosCopy}>
                <Text style={[styles.cuentaSinDatosTitle, { color: uploadPalette.strong }] }>
                  Cuenta no configurada
                </Text>
                <Text style={[styles.cuentaBancariaSinDatos, { color: uploadPalette.muted }] }>
                  Todavía no hay datos bancarios disponibles para este método de pago.
                </Text>
              </View>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  if (!venta) {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.ventaCard,
          {
            backgroundColor: uploadPalette.card,
            borderColor: uploadPalette.border,
          },
        ]}
      >
        <View style={styles.ventaCardContent}>
          <View style={styles.headerRow}>
            <View style={styles.flexOne}>
              <Surface
                elevation={0}
                style={[
                  styles.montoBlock,
                  {
                    backgroundColor: uploadPalette.surface,
                    borderColor: uploadPalette.border,
                  },
                ]}
              >
                <View style={styles.montoInfo}>
                  <Text
                    style={[
                      styles.labelMonto,
                      styles.montoLabelSmall,
                      { color: uploadPalette.muted },
                    ]}
                  >
                    Monto a pagar
                  </Text>
                  <Text
                    style={[
                      styles.montoAPagar,
                      styles.montoStrong,
                      { color: uploadPalette.successText },
                    ]}
                  >
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
                      <Text
                        style={[
                          styles.montoDetalle,
                          { color: uploadPalette.copy },
                        ]}
                      >
                        • Subtotal: {subtotalVenta.toFixed(2)}{" "}
                        {ventaReact?.monedaCobrado}
                      </Text>
                      <Text
                        style={[
                          styles.montoDetalle,
                          { color: uploadPalette.copy },
                        ]}
                      >
                        • Comisiones:{" "}
                        {comisionesInfo.loading
                          ? "N/A"
                          : montoComisiones.toFixed(2)}{" "}
                        {ventaReact?.monedaCobrado}
                      </Text>
                    </>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.metodoChip,
                    {
                      backgroundColor: uploadPalette.soft,
                      borderColor: theme.dark
                        ? "rgba(165, 180, 252, 0.22)"
                        : "#90CAF9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.metodoChipText,
                      theme.dark ? styles.metodoChipTextDark : null,
                    ]}
                  >
                    {ventaReact?.monedaCobrado === "CUP"
                      ? "TARJETA CUP"
                      : "TRANSFERENCIA"}
                  </Text>
                </View>
              </Surface>
              {renderInfoPago()}
            </View>
          </View>

          {miniEvidenceUri ? (
            <View style={styles.thumbRow}>
              <Image
                source={{ uri: miniEvidenceUri }}
                style={styles.thumbnail}
              />
              <View style={styles.thumbTextBox}>
                <Text
                  style={[styles.thumbLabel, { color: uploadPalette.strong }]}
                >
                  {archivoSeleccionado
                    ? "Evidencia seleccionada"
                    : "Última evidencia subida"}
                </Text>
                {archivoSeleccionado ? (
                  <Text
                    style={[styles.thumbSize, { color: uploadPalette.muted }]}
                  >
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
          <Surface
            elevation={0}
            style={[
              styles.evidenciasSection,
              {
                backgroundColor: uploadPalette.surface,
                borderColor: uploadPalette.border,
              },
            ]}
          >
            <View style={styles.evidenciasHeaderRow}>
              <View style={styles.evidenciasHeaderCopy}>
                <Text style={[styles.evidenciasTitle, { color: uploadPalette.strong }]}>
                  Evidencias ({evidencias.length})
                </Text>
                <Text style={[styles.evidenciasSubtitle, { color: uploadPalette.muted }]}>
                  {tieneEvidencias
                    ? "Toca una imagen para revisarla o agregar un nuevo comprobante."
                    : "Sube el comprobante para que la operación pueda revisarse."}
                </Text>
              </View>
              {!uploadInhabilitado ? (
                <Button
                  mode={tieneEvidencias ? "contained-tonal" : "contained"}
                  icon={tieneEvidencias ? "plus" : "camera-plus"}
                  onPress={() => setOpenSheet(true)}
                  compact
                  contentStyle={styles.evidenciaActionContent}
                  style={styles.evidenciaActionButton}
                  disabled={cargando}
                >
                  {tieneEvidencias ? "Agregar" : "Subir"}
                </Button>
              ) : null}
            </View>

            {loadingEvidenceImages && !tieneEvidencias ? (
              <View style={styles.emptyEvidenceState}>
                <ActivityIndicator size="small" />
                <Text style={[styles.evidenciasSubtitle, { color: uploadPalette.muted }]}>
                  Cargando evidencias...
                </Text>
              </View>
            ) : tieneEvidencias ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.evidenciasScroll}
              >
                {evidencias.map((evidencia) => {
                  const uri = evidencia.imageUrl;
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
                      style={[
                        styles.evidenciaThumbContainer,
                        borderStyle,
                        { backgroundColor: uploadPalette.surface },
                      ]}
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
              <Surface
                elevation={0}
                style={[
                  styles.emptyEvidenceState,
                  {
                    backgroundColor: uploadPalette.emptyPanel,
                    borderColor: uploadPalette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyEvidenceIconWrap,
                    { backgroundColor: uploadPalette.emptyIconSoft },
                  ]}
                >
                  <IconButton
                    icon="image-plus"
                    size={18}
                    iconColor={theme.dark ? "#a5b4fc" : "#4f46e5"}
                    style={styles.zeroMargin}
                  />
                </View>
                <View style={styles.emptyEvidenceCopy}>
                  <Text style={[styles.emptyEvidenceTitle, { color: uploadPalette.strong }]}>
                    Todavía no hay comprobantes
                  </Text>
                  <Text style={[styles.sinEvidenciasText, { color: uploadPalette.muted }]}>
                    Sube una imagen clara del pago para continuar con la revisión.
                  </Text>
                </View>
              </Surface>
            )}
          </Surface>
        </View>
      </View>

      {!uploadInhabilitado ? (
        <DrawerBottom
          open={openSheet}
          onClose={() => !cargando && setOpenSheet(false)}
          title="Subir Archivo"
          side="bottom"
          actions={[
            {
              icon: "upload",
              onPress: () => !cargando && subirArchivo(),
              disabled: !archivoSeleccionado || cargando,
            },
          ]}
        >
        <Button
          mode="outlined"
          onPress={seleccionarArchivo}
          style={styles.boton}
          disabled={cargando}
          icon={archivoSeleccionado ? "image-edit" : "camera"}
        >
          {archivoSeleccionado ? "Cambiar archivo" : "Seleccionar archivo"}
        </Button>

        {archivoSeleccionado ? (
          <View
            style={[
              styles.archivoPreview,
              {
                backgroundColor: uploadPalette.soft,
                borderColor: uploadPalette.border,
              },
            ]}
          >
            <Text style={[styles.archivoInfo, { color: uploadPalette.strong }]}>
              📸 {archivoSeleccionado.fileName || "imagen.jpg"}
            </Text>
            <View style={styles.archivoMetaRow}>
              <View style={styles.flexOne}>
                <Text style={[styles.archivoMetaLabel, { color: uploadPalette.muted }]}>Tamaño optimizado</Text>
                <Text style={[styles.archivoTamaño, { color: uploadPalette.strong }]}>
                  {formatFileSize(archivoSeleccionado.fileSize)}
                </Text>
              </View>
              <View style={styles.archivoMetaEnd}>
                <Text style={[styles.archivoMetaLabel, { color: uploadPalette.muted }]}>Dimensiones</Text>
                <Text style={[styles.archivoTamaño, { color: uploadPalette.strong }]}>
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
          disabled={!archivoSeleccionado || cargando}
          style={styles.botonSubir}
          icon="upload"
        >
          {cargando ? <ActivityIndicator color="white" /> : "Subir evidencia"}
        </Button>
        </DrawerBottom>
      ) : null}

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
              source={{ uri: preview.imageUrl }}
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
              {preview.analysis?.summary ? (
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisLabel}>Motivo del análisis IA</Text>
                  <Text style={styles.analysisSummary}>{preview.analysis.summary}</Text>
                </View>
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
  analysisBox: {
    backgroundColor: "#e8f1ff",
    borderColor: "#b6d4fe",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },
  analysisLabel: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  analysisSummary: {
    color: "#1e293b",
    fontSize: 12,
    lineHeight: 18,
  },
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cuentaBancariaCopyHint: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
    opacity: 0.7,
  },
  cuentaBancariaSinDatos: {
    color: "#cbd5e1",
    fontSize: 11,
    fontStyle: "italic",
  },
  cuentaBancariaTexto: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
  },
  cuentaBancariaValueBox: {
    backgroundColor: "rgba(15,23,42,0.22)",
    borderRadius: 12,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cuentaChip: { borderColor: "#0066cc", height: 32 },
  cuentaChipText: { color: "#0066cc", fontSize: 11, fontWeight: "600" },
  cuentaHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cuentaHeaderCopy: { flex: 1, paddingRight: 10 },
  cuentaHeaderSubtitle: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
  cuentaLoadingBox: {
    backgroundColor: "rgba(15,23,42,0.22)",
    borderRadius: 12,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  cuentaLoadingLine: {
    backgroundColor: "rgba(226,232,240,0.18)",
    borderRadius: 999,
    height: 10,
    marginTop: 12,
    width: "86%",
  },
  cuentaLoadingMeta: {
    backgroundColor: "rgba(226,232,240,0.12)",
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    width: "58%",
  },
  cuentaLoadingRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  cuentaLoadingText: {
    color: "#cbd5e1",
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 10,
  },
  cuentaSinDatosBox: {
    alignItems: "center",
    backgroundColor: "rgba(248,250,252,0.68)",
    borderColor: "rgba(148,163,184,0.28)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cuentaSinDatosCopy: { flex: 1, minWidth: 0 },
  cuentaSinDatosIcon: {
    alignItems: "center",
    backgroundColor: "rgba(100,116,139,0.12)",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  cuentaSinDatosTitle: {
    color: "#1e293b",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  evidenciasHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  evidenciasHeaderCopy: { flex: 1, gap: 3, paddingRight: 8 },
  evidenciasScroll: { paddingTop: 10, paddingBottom: 4 },
  evidenciasSection: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
    padding: 12,
  },
  evidenciasSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  evidenciasTitle: { fontSize: 13, fontWeight: "700" },
  evidenciaActionButton: {
    alignSelf: "center",
    borderRadius: 14,
  },
  evidenciaActionContent: {
    height: 34,
    paddingHorizontal: 4,
  },
  evidenciaThumb: { height: "100%", width: "100%" },
  evidenciaThumbContainer: {
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    height: 74,
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    width: 74,
  },
  emptyEvidenceCopy: { flex: 1, minWidth: 0 },
  emptyEvidenceIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.12)",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  emptyEvidenceState: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyEvidenceTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  flexOne: { flex: 1 },
  headerRow: { alignItems: "center", flexDirection: "row" },
  input: { marginBottom: 14 },
  labelMonto: { color: "#666", fontSize: 11, fontWeight: "500" },
  marginTop8: { marginTop: 8 },
  marginVertical8: { marginVertical: 8 },
  metodoChip: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
    height: 30,
    justifyContent: "center",
    minWidth: 118,
    paddingHorizontal: 10,
  },
  metodoChipText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
  },
  metodoChipDark: {
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    borderColor: "rgba(165, 180, 252, 0.22)",
  },
  metodoChipLight: {
    backgroundColor: "#E3F2FD",
    borderColor: "#90CAF9",
  },
  metodoChipTextDark: {
    color: "#e0e7ff",
  },
  montoInfo: { flex: 1, minWidth: 0, paddingRight: 10, borderRadius: 30 },
  montoAPagar: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  montoBlock: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    flexDirection: "row",
    gap: 8,
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
    fontSize: 11,
    lineHeight: 16,
  },
  snackbar: { marginBottom: 16 },
  tarjetaLabel: { fontSize: 11, fontWeight: "600" },
  tarjetaHint: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
    opacity: 0.72,
  },
  tarjetaNumero: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tarjetaRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tarjetaValueBox: {
    backgroundColor: "rgba(15,23,42,0.22)",
    borderRadius: 12,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
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
  ventaCard: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  ventaCardContent: { padding: 14 },
  zeroMargin: { margin: 0 },
});

export default SubidaArchivos;
