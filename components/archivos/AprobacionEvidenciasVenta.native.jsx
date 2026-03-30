import MeteorBase from "@meteorrn/core";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Surface,
  Text,
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
    createdAt: evidencia.createdAt || evidencia.fecha || null,
    descripcion: evidencia.descripcion || "",
    estado,
    raw: evidencia,
    rechazado,
    size: evidencia.size || 0,
  };
};

const formatCurrency = (amount, currency = "CUP") => {
  const number = parseFloat(amount) || 0;
  return `${number.toLocaleString("es-CU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
};

const megasToGB = (megas) => {
  if (!megas || megas === 0) {
    return "0 GB";
  }

  const gb = megas / 1024;
  return gb >= 1 ? `${gb.toFixed(0)} GB` : `${megas} MB`;
};

const PRODUCT_COLORS = {
  COMERCIO: {
    bg: "rgba(156, 39, 176, 0.12)",
    icon: "cash",
    primary: "#9C27B0",
  },
  PROXY: { bg: "#E3F2FD", icon: "wifi", primary: "#2196F3" },
  RECARGA: {
    bg: "rgba(255, 111, 0, 0.12)",
    icon: "cellphone",
    primary: "#FF6F00",
  },
  REMESA: { bg: "rgba(156, 39, 176, 0.12)", icon: "cash", primary: "#9C27B0" },
  VPN: { bg: "#E8F5E9", icon: "shield-check", primary: "#4CAF50" },
};

const ZoomableImage = ({ uri, style }) => {
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(0)).current;
  const currentScale = useRef(1);
  const currentOffsetX = useRef(0);
  const currentOffsetY = useRef(0);
  const lastTapTime = useRef(0);
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const imageWidth = 400;
  const imageHeight = 400;

  const scale = Animated.multiply(baseScale, pinchScale);
  const translateX = Animated.add(offsetX, panX);
  const translateY = Animated.add(offsetY, panY);

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const resetTransform = () => {
    currentScale.current = 1;
    currentOffsetX.current = 0;
    currentOffsetY.current = 0;

    pinchScale.setValue(1);
    panX.setValue(0);
    panY.setValue(0);

    Animated.parallel([
      Animated.spring(baseScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(offsetX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(offsetY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    {
      useNativeDriver: true,
    },
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) {
      return;
    }

    const nextScale = clamp(
      currentScale.current * event.nativeEvent.scale,
      1,
      5,
    );

    currentScale.current = nextScale;
    pinchScale.setValue(1);

    if (nextScale <= 1) {
      resetTransform();
      return;
    }

    baseScale.setValue(nextScale);
  };

  const onPanEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: panX,
          translationY: panY,
        },
      },
    ],
    { useNativeDriver: true },
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) {
      return;
    }

    if (currentScale.current > 1) {
      const maxOffsetX = (imageWidth * (currentScale.current - 1)) / 2;
      const maxOffsetY = (imageHeight * (currentScale.current - 1)) / 2;

      currentOffsetX.current = clamp(
        currentOffsetX.current + event.nativeEvent.translationX,
        -maxOffsetX,
        maxOffsetX,
      );
      currentOffsetY.current = clamp(
        currentOffsetY.current + event.nativeEvent.translationY,
        -maxOffsetY,
        maxOffsetY,
      );

      offsetX.setValue(currentOffsetX.current);
      offsetY.setValue(currentOffsetY.current);
      panX.setValue(0);
      panY.setValue(0);
      return;
    }

    panX.setValue(0);
    panY.setValue(0);
    offsetX.setValue(0);
    offsetY.setValue(0);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (currentScale.current > 1) {
        resetTransform();
      } else {
        currentScale.current = 1.5;
        currentOffsetX.current = 0;
        currentOffsetY.current = 0;
        pinchScale.setValue(1);
        panX.setValue(0);
        panY.setValue(0);
        offsetX.setValue(0);
        offsetY.setValue(0);
        Animated.spring(baseScale, {
          toValue: 1.5,
          useNativeDriver: true,
        }).start();
      }
    }

    lastTapTime.current = now;
  };

  return (
    <Pressable onPress={handleDoubleTap} style={styles.imageContainer}>
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
        minPointers={1}
        maxPointers={2}
      >
        <Animated.View style={styles.zoomWrapper}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            <Animated.View style={styles.zoomWrapper}>
              <Animated.Image
                source={{ uri }}
                style={[
                  style,
                  {
                    transform: [{ translateX }, { translateY }, { scale }],
                  },
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

const AprobacionEvidenciasVenta = ({
  loadingIds = [],
  onAprobar,
  onRechazar,
  onVentaAprobada,
  venta,
}) => {
  const ventaId = venta?._id;
  const [previewId, setPreviewId] = useState(null);
  const [aprobandoVenta, setAprobandoVenta] = useState(false);
  const [rechazandoVenta, setRechazandoVenta] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const [comisionesInfo, setComisionesInfo] = useState({
    data: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    Animated.timing(expandAnimation, {
      duration: 250,
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [expandAnimation, expanded]);

  const contentHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1000],
  });
  const contentOpacity = expandAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const ventaReact = Meteor.useTracker(() => {
    if (!ventaId) {
      return null;
    }

    Meteor.subscribe("ventasRecharge", { _id: ventaId });
    return VentasRechargeCollection.findOne({ _id: ventaId }) || null;
  }, [ventaId]);

  const ventaActual = ventaReact || venta;

  const evidenciasSubsc = Meteor.useTracker(() => {
    if (!ventaId) {
      return [];
    }

    Meteor.subscribe("evidenciasVentasEfectivoRecharge", { ventaId });
    return EvidenciasVentasEfectivoCollection.find(
      { ventaId },
      { sort: { createdAt: -1 } },
    ).fetch();
  }, [ventaId]);

  const evidencias = useMemo(() => {
    const raw = Array.isArray(evidenciasSubsc) ? evidenciasSubsc : [];
    return raw.map(mapEvidenciaDoc).filter((evidencia) => !!evidencia.base64);
  }, [evidenciasSubsc]);

  const preview = useMemo(() => {
    if (!previewId) {
      return null;
    }

    return evidencias.find((evidencia) => evidencia._id === previewId) || null;
  }, [evidencias, previewId]);

  useEffect(() => {
    if (!previewId) {
      return;
    }

    const previewExiste = evidencias.some(
      (evidencia) => evidencia._id === previewId,
    );
    if (!previewExiste) {
      setPreviewId(null);
    }
  }, [evidencias, previewId]);

  const carritosAgrupados = useMemo(() => {
    const lista = ventaActual?.producto?.carritos || [];
    return {
      comercio: lista.filter((item) => item?.type === "COMERCIO"),
      proxy: lista.filter((item) => item?.type === "PROXY"),
      recarga: lista.filter((item) => item?.type === "RECARGA"),
      remesa: lista.filter((item) => item?.type === "REMESA"),
      vpn: lista.filter((item) => item?.type === "VPN"),
    };
  }, [ventaActual]);

  const totalItems = useMemo(
    () =>
      Object.values(carritosAgrupados).reduce(
        (sum, items) => sum + items.length,
        0,
      ),
    [carritosAgrupados],
  );

  const resumenVenta = useMemo(() => {
    const items = [];
    if (carritosAgrupados.proxy.length)
      items.push(`${carritosAgrupados.proxy.length} Proxy`);
    if (carritosAgrupados.vpn.length)
      items.push(`${carritosAgrupados.vpn.length} VPN`);
    if (carritosAgrupados.recarga.length)
      items.push(
        `${carritosAgrupados.recarga.length} Recarga${carritosAgrupados.recarga.length > 1 ? "s" : ""}`,
      );
    if (carritosAgrupados.remesa.length)
      items.push(
        `${carritosAgrupados.remesa.length} Remesa${carritosAgrupados.remesa.length > 1 ? "s" : ""}`,
      );
    if (carritosAgrupados.comercio.length)
      items.push(
        `${carritosAgrupados.comercio.length} Producto${carritosAgrupados.comercio.length > 1 ? "s" : ""}`,
      );
    return items.join(" • ") || "Sin productos";
  }, [carritosAgrupados]);

  const tiendaIdParaComisiones = useMemo(() => {
    const item = carritosAgrupados?.comercio?.[0];
    return item?.idTienda || item?.producto?.idTienda || null;
  }, [carritosAgrupados]);

  const monedaFinalParaComisiones = useMemo(
    () => ventaActual?.monedaCobrado || "CUP",
    [ventaActual],
  );
  const subtotalVenta = useMemo(
    () => parseFloat(ventaActual?.cobrado) || 0,
    [ventaActual],
  );

  useEffect(() => {
    let cancelled = false;
    const debeCalcular = !!ventaId && !!tiendaIdParaComisiones;

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

  const montoComisiones = useMemo(
    () => parseFloat(comisionesInfo?.data?.montoTotal) || 0,
    [comisionesInfo],
  );
  const totalConComisiones = useMemo(
    () => subtotalVenta + montoComisiones,
    [montoComisiones, subtotalVenta],
  );
  const existeAprobada = evidencias.some((evidencia) => !!evidencia.aprobado);
  const ventaAprobada = ventaActual?.isCobrado === true;
  const ventaYaEntregada =
    ventaActual?.estado === "ENTREGADO" ||
    ventaActual?.estado === "PAGADA" ||
    ventaActual?.estado === "COMPLETADA";
  const ventaRechazada =
    ventaActual?.estado === "RECHAZADA" || ventaActual?.isCancelada;
  const ventaFinalizada = ventaAprobada || ventaYaEntregada;
  const canApproveSale = existeAprobada && !ventaFinalizada && !ventaRechazada;

  if (!ventaActual || ventaRechazada || ventaFinalizada) {
    return null;
  }

  const handleAprobarVenta = () => {
    if (!canApproveSale || aprobandoVenta) {
      return;
    }

    Alert.alert(
      "Aprobar venta",
      "Se aprobara la venta y se procesaran sus carritos. Desea continuar?",
      [
        { style: "cancel", text: "Cancelar" },
        {
          onPress: () => {
            setAprobandoVenta(true);
            Meteor.call(
              "ventas.aprobarVenta",
              ventaActual._id,
              {},
              (err, res) => {
                setAprobandoVenta(false);
                if (err) {
                  Alert.alert(
                    "Error",
                    err.reason || "No se pudo aprobar la venta",
                  );
                  return;
                }

                Alert.alert(
                  "Exito",
                  res?.message || "Venta aprobada correctamente",
                );
                onVentaAprobada?.(res);
              },
            );
          },
          style: "destructive",
          text: "Aprobar",
        },
      ],
    );
  };

  const handleRechazarVenta = () => {
    if (rechazandoVenta || ventaYaEntregada || ventaRechazada) {
      return;
    }

    Alert.alert(
      "Rechazar venta",
      "Esta accion marcara la venta como RECHAZADA. Confirmar?",
      [
        { style: "cancel", text: "Cancelar" },
        {
          onPress: () => {
            setRechazandoVenta(true);
            VentasRechargeCollection.update(
              ventaId,
              {
                $set: {
                  isCancelada: true,
                },
              },
              (err) => {
                setRechazandoVenta(false);
                if (err) {
                  Alert.alert(
                    "Error",
                    err.reason || "No se pudo rechazar la venta",
                  );
                  return;
                }

                Alert.alert("Listo", "Venta rechazada.");
                onVentaAprobada?.({
                  _id: ventaActual._id,
                  estado: "RECHAZADA",
                });
              },
            );
          },
          style: "destructive",
          text: "Rechazar",
        },
      ],
    );
  };

  const handleAprobar = () => {
    if (!preview || preview.aprobado || preview.rechazado) {
      return;
    }

    Meteor.call(
      "archivos.aprobarEvidencia",
      preview._id,
      null,
      (error, success) => {
        if (error) {
          Alert.alert(
            "Error",
            error.reason || "No se pudo aprobar la evidencia.",
          );
          return;
        }

        if (success) {
          onAprobar?.(preview || { _id: previewId });
        }
      },
    );
  };

  const confirmarRechazo = () => {
    if (!preview) {
      return;
    }

    Meteor.call(
      "archivos.denegarEvidencia",
      preview._id,
      null,
      (error, success) => {
        if (error) {
          Alert.alert(
            "Error",
            error.reason || "No se pudo rechazar la evidencia.",
          );
          return;
        }

        if (success) {
          onRechazar?.(preview || { _id: previewId });
          Alert.alert("Listo", "Evidencia rechazada.");
        }
      },
    );
  };

  const handleRechazar = () => {
    if (!preview || preview.aprobado || preview.rechazado) {
      return;
    }

    Alert.alert(
      "Confirmar rechazo",
      "Desea marcar esta evidencia como rechazada? Esta accion puede requerir nueva subida del usuario.",
      [
        { style: "cancel", text: "Cancelar" },
        { onPress: confirmarRechazo, style: "destructive", text: "Rechazar" },
      ],
    );
  };

  const renderProductCard = (carrito, type) => {
    const config = PRODUCT_COLORS[type];
    if (!config) {
      return null;
    }

    if (type === "PROXY" || type === "VPN") {
      const esPorTiempo = carrito.esPorTiempo || carrito.megas === null;
      return (
        <Surface
          key={carrito._id}
          style={[styles.miniCard, { borderLeftColor: config.primary }]}
          elevation={1}
        >
          <View style={styles.miniCardHeader}>
            <IconButton
              icon={config.icon}
              iconColor={config.primary}
              size={18}
              style={styles.miniIcon}
            />
            <View style={styles.flexOne}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>
                {type}
              </Text>
              <Text style={styles.miniCardUser}>
                {carrito.nombre || "Usuario"}
              </Text>
            </View>
            {esPorTiempo ? (
              <View style={styles.unlimitedBadge}>
                <IconButton
                  icon="infinity"
                  iconColor="#FFD700"
                  size={16}
                  style={styles.zeroMargin}
                />
                <Text style={styles.unlimitedText}>ILIMITADO</Text>
              </View>
            ) : (
              <Chip icon="database" compact textStyle={styles.smallStrongText}>
                {megasToGB(carrito.megas)}
              </Chip>
            )}
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="currency-usd"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Precio:</Text>
            <Text style={styles.miniCardValue}>
              {formatCurrency(carrito.cobrarUSD)}
            </Text>
          </View>
        </Surface>
      );
    }

    if (type === "RECARGA") {
      const telefono =
        carrito.movilARecargar || carrito?.extraFields?.mobile_number || "¿?";
      const monto =
        carrito.producto?.destination?.amount ||
        carrito.comentario?.match(/\d+/)?.[0] ||
        "N/D";
      const operadora = carrito.producto?.operator?.name || "CubaCel";
      return (
        <Surface
          key={carrito._id}
          style={[styles.miniCard, { borderLeftColor: config.primary }]}
          elevation={1}
        >
          <View style={styles.miniCardHeader}>
            <IconButton
              icon={config.icon}
              iconColor={config.primary}
              size={18}
              style={styles.miniIcon}
            />
            <View style={styles.flexOne}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>
                RECARGA
              </Text>
              <Text style={styles.miniCardUser}>
                {carrito.nombre || "Usuario"}
              </Text>
            </View>
            <Chip
              icon="phone"
              compact
              textStyle={styles.smallStrongText}
              style={{ backgroundColor: config.bg }}
            >
              {monto} CUP
            </Chip>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="cellphone"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Telefono:</Text>
            <Text style={styles.miniCardValue}>{telefono}</Text>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="sim"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Operadora:</Text>
            <Text style={styles.miniCardValue}>{operadora}</Text>
          </View>
        </Surface>
      );
    }

    if (type === "REMESA") {
      return (
        <Surface
          key={carrito._id}
          style={[styles.miniCard, { borderLeftColor: config.primary }]}
          elevation={1}
        >
          <View style={styles.miniCardHeader}>
            <IconButton
              icon={config.icon}
              iconColor={config.primary}
              size={18}
              style={styles.miniIcon}
            />
            <View style={styles.flexOne}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>
                REMESA
              </Text>
              <Text style={styles.miniCardUser}>
                {carrito.nombre || "Usuario"}
              </Text>
            </View>
            <Chip
              icon="cash"
              compact
              textStyle={styles.smallStrongText}
              style={{ backgroundColor: config.bg }}
            >
              {formatCurrency(
                carrito.recibirEnCuba || 0,
                carrito.monedaRecibirEnCuba,
              )}
            </Chip>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="map-marker"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Direccion:</Text>
            <Text
              style={styles.miniCardValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {carrito.direccionCuba || "No especificada"}
            </Text>
          </View>
          {carrito.tarjetaCUP ? (
            <View style={styles.miniCardRow}>
              <IconButton
                icon="credit-card-outline"
                size={14}
                iconColor="#666"
                style={styles.miniRowIcon}
              />
              <Text style={styles.miniCardLabel}>Tarjeta:</Text>
              <Text style={styles.miniCardValue}>{carrito.tarjetaCUP}</Text>
            </View>
          ) : null}
        </Surface>
      );
    }

    if (type === "COMERCIO") {
      const productoInfo = carrito.producto || {};
      const nombreProducto =
        productoInfo.name || carrito.nombre || "Producto N/D";
      const cantidad = carrito.cantidad || carrito.count || 1;
      const precioUnitario = productoInfo.precio || carrito.precio || 0;
      const moneda =
        carrito.monedaACobrar || productoInfo.monedaPrecio || "CUP";
      const precioTotal = carrito.cobrarUSD
        ? parseFloat(carrito.cobrarUSD)
        : precioUnitario * cantidad;

      return (
        <Surface
          key={carrito._id}
          style={[styles.miniCard, { borderLeftColor: config.primary }]}
          elevation={1}
        >
          <View style={styles.miniCardHeader}>
            <IconButton
              icon={config.icon}
              iconColor={config.primary}
              size={18}
              style={styles.miniIcon}
            />
            <View style={styles.flexOne}>
              <Text style={[styles.miniCardTitle, { color: config.primary }]}>
                COMERCIO
              </Text>
              <Text style={styles.miniCardUser}>
                {carrito.nombre || "Usuario"}
              </Text>
            </View>
            <Chip
              icon="package-variant"
              compact
              textStyle={styles.smallStrongText}
              style={{ backgroundColor: config.bg }}
            >
              x{cantidad}
            </Chip>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="tag"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Producto:</Text>
            <Text
              style={styles.miniCardValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {nombreProducto}
            </Text>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="currency-usd"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Precio Unit.:</Text>
            <Text style={styles.miniCardValue}>
              {formatCurrency(precioUnitario, moneda)}
            </Text>
          </View>
          <View style={styles.miniCardRow}>
            <IconButton
              icon="calculator"
              size={14}
              iconColor="#666"
              style={styles.miniRowIcon}
            />
            <Text style={styles.miniCardLabel}>Total:</Text>
            <Text
              style={[
                styles.miniCardValue,
                { color: config.primary, fontWeight: "700" },
              ]}
            >
              {formatCurrency(precioTotal, moneda)}
            </Text>
          </View>
          {carrito.comentario ? (
            <View style={styles.miniCardRow}>
              <IconButton
                icon="comment-text-outline"
                size={14}
                iconColor="#666"
                style={styles.miniRowIcon}
              />
              <Text style={styles.miniCardLabel}>Nota:</Text>
              <Text
                style={styles.miniCardValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {carrito.comentario}
              </Text>
            </View>
          ) : null}
        </Surface>
      );
    }

    return null;
  };

  const miniBase64 = evidencias[0]?.base64;
  const cargando = !evidenciasSubsc;

  if (!ventaActual) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <Card.Title
        title={
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>
              Venta #{ventaId.slice(-6).toUpperCase()}
            </Text>
            {ventaRechazada ? (
              <Badge style={styles.badgeRechazada}>RECHAZADA</Badge>
            ) : null}
            {ventaYaEntregada ? (
              <Badge style={styles.badgeEntregada}>FINALIZADA</Badge>
            ) : null}
          </View>
        }
        subtitle={
          <View style={styles.subtitleRow}>
            <IconButton
              icon="account"
              size={14}
              iconColor="#666"
              style={styles.zeroMargin}
            />
            <Text style={styles.subtitle}>
              {ventaActual.userId || "Usuario N/D"}
            </Text>
            <Text style={[styles.subtitle, styles.subtitleSpacer]}>
              • {totalItems} item{totalItems !== 1 ? "s" : ""}
            </Text>
          </View>
        }
        right={(props) => (
          <IconButton
            {...props}
            icon={expanded ? "chevron-up" : "chevron-down"}
            onPress={() => setExpanded((value) => !value)}
            accessibilityLabel={expanded ? "Colapsar venta" : "Expandir venta"}
          />
        )}
      />

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <IconButton
            icon="package-variant"
            size={16}
            iconColor="#666"
            style={styles.summaryIcon}
          />
          <Text style={styles.summaryText}>{resumenVenta}</Text>
        </View>
        <View style={styles.summaryItem}>
          <IconButton
            icon="currency-usd"
            size={16}
            iconColor="#1976D2"
            style={styles.summaryIcon}
          />
          <Text style={[styles.summaryText, styles.summaryStrongText]}>
            {formatCurrency(
              tiendaIdParaComisiones ? totalConComisiones : subtotalVenta,
              ventaActual.monedaCobrado,
            )}
          </Text>
        </View>
      </View>

      {tiendaIdParaComisiones ? (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <IconButton
              icon="receipt"
              size={16}
              iconColor="#666"
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryText}>Subtotal:</Text>
            <Text style={[styles.summaryText, styles.summaryInlineStrong]}>
              {formatCurrency(subtotalVenta, ventaActual.monedaCobrado)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <IconButton
              icon="truck-delivery-outline"
              size={16}
              iconColor="#666"
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryText}>Comisiones:</Text>
            <Text style={[styles.summaryText, styles.summaryInlineStrong]}>
              {comisionesInfo.loading
                ? "..."
                : formatCurrency(montoComisiones, monedaFinalParaComisiones)}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <IconButton
            icon="calendar"
            size={16}
            iconColor="#666"
            style={styles.summaryIcon}
          />
          <Text style={styles.summaryText}>
            {ventaActual.createdAt
              ? moment(ventaActual.createdAt).format("DD/MM/YYYY HH:mm")
              : "Fecha N/D"}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <IconButton
            icon="credit-card"
            size={16}
            iconColor="#666"
            style={styles.summaryIcon}
          />
          <Text style={styles.summaryText}>
            {ventaActual.metodoPago || "Metodo N/D"}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.expandableContent,
          {
            maxHeight: contentHeight,
            opacity: contentOpacity,
            overflow: "hidden",
          },
        ]}
      >
        <Card.Content>
          <Divider style={styles.divider} />

          {miniBase64 ? (
            <Surface style={styles.evidencePreview} elevation={2}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${miniBase64}` }}
                style={styles.evidenceThumb}
              />
              <View style={styles.evidenceInfoBox}>
                <Text style={styles.evidenceLabel}>
                  Ultima evidencia subida
                </Text>
                <View style={styles.evidenceMetaRow}>
                  <Chip icon="file-image" compact textStyle={styles.tinyText}>
                    {evidencias.length} evidencia
                    {evidencias.length !== 1 ? "s" : ""}
                  </Chip>
                  <Text style={styles.evidenceSub}>
                    {evidencias[0].createdAt
                      ? moment(evidencias[0].createdAt).fromNow()
                      : ""}
                  </Text>
                </View>
              </View>
            </Surface>
          ) : null}

          <Text style={styles.sectionTitle}>Productos de la venta</Text>
          <ScrollView style={styles.productsScroll} nestedScrollEnabled>
            {carritosAgrupados.proxy.map((item) =>
              renderProductCard(item, "PROXY"),
            )}
            {carritosAgrupados.vpn.map((item) =>
              renderProductCard(item, "VPN"),
            )}
            {carritosAgrupados.recarga.map((item) =>
              renderProductCard(item, "RECARGA"),
            )}
            {carritosAgrupados.remesa.map((item) =>
              renderProductCard(item, "REMESA"),
            )}
            {carritosAgrupados.comercio.map((item) =>
              renderProductCard(item, "COMERCIO"),
            )}
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
              {evidencias.map((evidencia) => {
                const uri = `data:image/jpeg;base64,${evidencia.base64}`;
                const isLoading = loadingIds.includes(evidencia._id);
                const borderStyle = evidencia.rechazado
                  ? styles.borderRechazado
                  : evidencia.aprobado
                    ? styles.borderAprobado
                    : styles.borderPendiente;
                const badgeText = evidencia.rechazado
                  ? "CANC"
                  : evidencia.aprobado
                    ? "OK"
                    : "PEND";
                return (
                  <Pressable
                    key={evidencia._id}
                    style={[styles.thumbContainer, borderStyle]}
                    onPress={() => setPreviewId(evidencia._id)}
                  >
                    <Image source={{ uri }} style={styles.thumb} />
                    {isLoading ? (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    ) : null}
                    <View style={styles.badgeEstado}>
                      <Text
                        testID={`badge-estado-${evidencia.estado}`}
                        accessibilityLabel={`Estado evidencia ${evidencia.estado}`}
                        style={[
                          styles.badgeText,
                          evidencia.aprobado && styles.badgeTextOk,
                          evidencia.rechazado && styles.badgeTextDenied,
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
              disabled={
                rechazandoVenta ||
                ventaRechazada ||
                ventaYaEntregada ||
                !Meteor?.user()?.permitirAprobacionEfectivoCUP
              }
              icon="close-octagon"
              style={styles.rejectButton}
              textColor="#e53935"
            >
              {rechazandoVenta ? "Rechazando..." : "Rechazar Venta"}
            </Button>
            <Button
              mode="contained"
              onPress={handleAprobarVenta}
              disabled={
                !canApproveSale ||
                aprobandoVenta ||
                !Meteor?.user()?.permitirAprobacionEfectivoCUP
              }
              icon="check-decagram"
              style={styles.approveButton}
              contentStyle={styles.approveButtonContent}
            >
              {aprobandoVenta ? "Procesando..." : "Aprobar Venta"}
            </Button>
          </View>
        </Card.Content>
      </Animated.View>

      {expanded ? (
        <DrawerBottom
          open={!!preview}
          onClose={() => setPreviewId(null)}
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
              <ZoomableImage
                uri={`data:image/jpeg;base64,${preview.base64}`}
                style={styles.previewImage}
              />
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  {preview.estado === ESTADOS.APROBADA ? (
                    <Chip
                      mode="outlined"
                      compact
                      icon="check"
                      style={styles.chipOk}
                      textStyle={styles.chipText}
                    >
                      Aprobada
                    </Chip>
                  ) : null}
                  {preview.estado === ESTADOS.RECHAZADA ? (
                    <Chip
                      mode="outlined"
                      compact
                      icon="close-octagon"
                      style={styles.chipDenied}
                      textStyle={styles.chipText}
                    >
                      Rechazada
                    </Chip>
                  ) : null}
                  {preview.estado === ESTADOS.PENDIENTE ? (
                    <Chip
                      mode="outlined"
                      compact
                      icon="progress-clock"
                      style={styles.chipPending}
                      textStyle={styles.chipText}
                    >
                      Pendiente
                    </Chip>
                  ) : null}
                  <Text style={styles.fechaText}>
                    {preview.createdAt
                      ? moment(preview.createdAt).format("DD/MM/YYYY HH:mm")
                      : "Sin fecha"}
                  </Text>
                </View>
                {preview.size ? (
                  <Text style={styles.sizeText}>
                    Tamaño: {(preview.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                ) : null}
                {preview.descripcion ? (
                  <Text style={styles.descText}>{preview.descripcion}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  {preview.estado === ESTADOS.PENDIENTE ? (
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
                  ) : null}
                  {preview.estado === ESTADOS.APROBADA ? (
                    <Text style={styles.aprobadaInfo}>Ya aprobada</Text>
                  ) : null}
                  {preview.estado === ESTADOS.RECHAZADA ? (
                    <Text style={styles.rechazadaInfo}>Rechazada</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
        </DrawerBottom>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  actionBtn: { marginRight: 10 },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 8,
  },
  actionsRow: { alignItems: "center", flexDirection: "row", marginTop: 16 },
  approveButton: { borderRadius: 22, flex: 1 },
  approveButtonContent: { height: 44 },
  aprobadaInfo: { color: "#2e7d32", fontSize: 12, fontWeight: "600" },
  badgeEntregada: { backgroundColor: "#2e7d32", fontSize: 9, marginLeft: 8 },
  badgeEstado: {
    backgroundColor: "#00000088",
    borderRadius: 4,
    bottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: "absolute",
    right: 2,
  },
  badgeRechazada: { backgroundColor: "#e74c3c", fontSize: 9, marginLeft: 8 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "600" },
  badgeTextDenied: { color: "#e74c3c" },
  badgeTextOk: { color: "#2ecc71" },
  borderAprobado: { borderColor: "#2ecc71", borderWidth: 2 },
  borderPendiente: { borderColor: "#f1c40f", borderWidth: 2 },
  borderRechazado: { borderColor: "#e74c3c", borderWidth: 2 },
  card: {
    borderRadius: 12,
    elevation: 10,
    marginHorizontal: 10,
    marginVertical: 15,
    padding: 10,
  },
  chipDenied: { borderColor: "#e74c3c" },
  chipOk: { borderColor: "#2ecc71" },
  chipPending: { borderColor: "#f1c40f" },
  chipText: { fontSize: 11 },
  descText: {
    backgroundColor: "#f1f3f5",
    borderRadius: 6,
    color: "#333",
    fontSize: 12,
    marginTop: 10,
    padding: 8,
  },
  divider: { marginVertical: 12 },
  emptyBox: { alignItems: "center", paddingVertical: 20 },
  emptyText: { color: "#777", fontSize: 12, marginTop: 6 },
  evidenceInfoBox: { flex: 1, marginLeft: 12 },
  evidenceLabel: { fontSize: 12, fontWeight: "600" },
  evidenceMetaRow: { alignItems: "center", flexDirection: "row", marginTop: 4 },
  evidencePreview: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    marginBottom: 16,
    padding: 12,
  },
  evidenceSub: { color: "#888", fontSize: 10, marginLeft: 8 },
  evidenceThumb: {
    backgroundColor: "#eee",
    borderRadius: 8,
    height: 56,
    width: 56,
  },
  expandableContent: {},
  fechaText: { color: "#555", fontSize: 11 },
  flexOne: { flex: 1 },
  headerTitleRow: { alignItems: "center", flexDirection: "row" },
  imageContainer: {
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    height: 500,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "#0006",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  metaBox: { marginTop: 12 },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  miniCard: {
    borderLeftWidth: 4,
    borderRadius: 10,
    marginBottom: 8,
    padding: 10,
  },
  miniCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
  },
  miniCardLabel: { fontSize: 10, marginRight: 6 },
  miniCardRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 4,
    minHeight: 20,
  },
  miniCardTitle: { fontSize: 12, fontWeight: "700" },
  miniCardUser: { fontSize: 10, marginTop: 2 },
  miniCardValue: { flex: 1, fontSize: 10, fontWeight: "600" },
  miniIcon: { margin: 0, padding: 0 },
  miniRowIcon: { margin: 0, marginRight: 4, padding: 0 },
  previewImage: { height: "100%", width: "100%" },
  previewWrapper: { paddingBottom: 10 },
  productsScroll: { marginBottom: 12, maxHeight: 300 },
  rejectButton: {
    borderColor: "#e53935",
    borderRadius: 22,
    borderWidth: 1.5,
    flex: 1,
  },
  rechazadaInfo: { color: "#e74c3c", fontSize: 12, fontWeight: "600" },
  scrollRow: { paddingVertical: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  sizeText: { color: "#555", fontSize: 11, marginTop: 6 },
  smallStrongText: { fontSize: 11, fontWeight: "700" },
  subtitle: { fontSize: 11 },
  subtitleRow: { alignItems: "center", flexDirection: "row", marginTop: 2 },
  subtitleSpacer: { marginLeft: 8 },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summaryIcon: { margin: 0, padding: 0 },
  summaryInlineStrong: { fontWeight: "700" },
  summaryItem: { alignItems: "center", flexDirection: "row" },
  summaryStrongText: { color: "#1976D2", fontWeight: "700" },
  summaryText: { fontSize: 11, marginLeft: 4 },
  thumb: { height: "100%", width: "100%" },
  thumbContainer: {
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 10,
    height: 64,
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    width: 64,
  },
  tinyText: { fontSize: 10 },
  title: { fontSize: 16, fontWeight: "700" },
  unlimitedBadge: { alignItems: "center", flexDirection: "row" },
  unlimitedText: {
    color: "#FFD700",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: -4,
  },
  zeroMargin: { margin: 0, padding: 0 },
  zoomWrapper: { flex: 1, height: "100%", width: "100%" },
});

export default AprobacionEvidenciasVenta;
