import MeteorBase from "@meteorrn/core";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
    ActivityIndicator,
    Badge,
    Button,
    Card,
    Chip,
    Divider,
    IconButton,
    Modal,
    Portal,
    Text,
    useTheme,
} from "react-native-paper";

import { getCachedDeviceLocationSync } from "../../services/location/deviceLocationCache.native";
import {
    CarritoCollection,
    OrdenesCollection,
} from "../collections/collections";
import ListaPedidosRemesa from "./ListaPedidosRemesa.native";
import MapLocationPicker from "./MapLocationPicker.native";

import { BlurView } from "expo-blur";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const STEP_SUMMARY = 0;
const STEP_PAYMENT = 1;
const STEP_LOCATION = 2;
const STEP_TERMS = 3;
const STEP_PAY = 4;

const stepLabelList = [
  "Confirmar Pedidos",
  "Metodo de Pago",
  "Ubicación",
  "Términos y Condiciones",
  "Pago",
];

const normalizeDeliveryLocation = (location) => {
  if (!location) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const terminosYCondiciones = {
  efectivo: {
    contenido: [
      {
        subtitulo: "1. Métodos de Pago Aceptados",
        texto:
          "Aceptamos efectivo en Cuba y transferencias bancarias internacionales desde Uruguay, Argentina y otros países disponibles en la configuración del sistema.",
      },
      {
        subtitulo: "2. Comprobante de Pago Obligatorio",
        texto:
          "Debe subir una foto o captura del comprobante de pago. Debe ser legible, mostrar fecha, monto y número de referencia. Sin comprobante no se procesará la orden.",
      },
      {
        subtitulo: "3. Política de No Reembolso",
        texto:
          "Los pagos en efectivo y transferencias no son reversibles. Asegúrese de verificar datos, números y cantidades antes de pagar.",
      },
      {
        subtitulo: "4. Tiempos de Entrega",
        texto:
          "Recargas: 24-48 horas tras aprobación del comprobante. Servicios Proxy/VPN: 2-6 horas. Remesas: 1-3 días hábiles según disponibilidad del beneficiario.",
      },
    ],
    titulo: "Términos y Condiciones - Pago en Efectivo o Transferencia",
  },
  mercadopago: {
    contenido: [
      {
        subtitulo: "1. Comisiones y Tarifas",
        texto:
          "MercadoPago aplica una tarifa de procesamiento variable según país y método de pago, asumida por el usuario. Los costos están incluidos en el total mostrado.",
      },
      {
        subtitulo: "2. Seguridad de la Transacción",
        texto:
          "MercadoPago procesa toda la información bancaria. VIDKAR no almacena datos de tarjetas.",
      },
      {
        subtitulo: "3. Política de No Reembolso",
        texto:
          "No se realizan reembolsos una vez confirmado el pago. Debe validar cuidadosamente los datos antes de continuar.",
      },
    ],
    titulo: "Términos y Condiciones - Pago con MercadoPago",
  },
  paypal: {
    contenido: [
      {
        subtitulo: "1. Comisiones y Tarifas",
        texto:
          "PayPal aplica una comisión adicional variable según país y tipo de cuenta. El total mostrado ya la contempla.",
      },
      {
        subtitulo: "2. Proceso de Pago",
        texto:
          "Será redirigido a la pasarela segura de PayPal. VIDKAR no almacena credenciales ni datos bancarios.",
      },
      {
        subtitulo: "3. Política de No Reembolso",
        texto:
          "Los pagos son irreversibles una vez procesados. Revise cuidadosamente números, operadora, dirección y destinatario antes de pagar.",
      },
    ],
    titulo: "Términos y Condiciones - Pago con PayPal",
  },
};

const CART_BADGE_FIELDS = {
  _id: 1,
  idUser: 1,
};

const WizardConStepper = ({ initialLocation = null }) => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const userId = Meteor.userId();

  const wizardPalette = useMemo(
    () => ({
      accent: isDarkMode ? "#8b5cf6" : "#6d28d9",
      accentStrong: isDarkMode ? "#a78bfa" : "#6200ee",
      alertBackground: isDarkMode
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.98)",
      alertBorder: isDarkMode
        ? "rgba(251, 146, 60, 0.34)"
        : "rgba(249, 115, 22, 0.3)",
      alertIcon: isDarkMode ? "#fb923c" : "#ea580c",
      alertIconBackground: isDarkMode
        ? "rgba(251, 146, 60, 0.16)"
        : "rgba(255, 237, 213, 0.95)",
      alertTitle: isDarkMode ? "#f8fafc" : "#111827",
      alertText: isDarkMode ? "#fed7aa" : "#7c2d12",
      cardBackground: isDarkMode
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.96)",
      cardBorder: isDarkMode
        ? "rgba(148, 163, 184, 0.18)"
        : "rgba(15, 23, 42, 0.08)",
      cardMuted: isDarkMode ? "#cbd5e1" : "#64748b",
      cardText: isDarkMode ? "#f8fafc" : "#1e293b",
      contentText: isDarkMode ? "#f8fafc" : "#171827",
      divider: isDarkMode
        ? "rgba(148, 163, 184, 0.28)"
        : "rgba(15, 23, 42, 0.14)",
      dropdownBackground: isDarkMode
        ? "rgba(15, 23, 42, 0.92)"
        : "rgba(248, 250, 252, 0.98)",
      dropdownBorder: isDarkMode
        ? "rgba(148, 163, 184, 0.28)"
        : "rgba(15, 23, 42, 0.28)",
      dropdownPlaceholder: isDarkMode ? "#94a3b8" : "#64748b",
      mutedText: isDarkMode ? "#cbd5e1" : "#475569",
      sectionPillBackground: isDarkMode
        ? "rgba(30, 41, 59, 0.96)"
        : "rgba(250, 245, 255, 0.98)",
      sectionPillBorder: isDarkMode
        ? "rgba(167, 139, 250, 0.34)"
        : "rgba(109, 40, 217, 0.22)",
      modalOverlay: isDarkMode
        ? "rgba(2, 6, 23, 0.22)"
        : "rgba(255, 255, 255, 0.18)",
      stepInactiveBackground: isDarkMode
        ? "rgba(15, 23, 42, 0.92)"
        : "rgba(248, 250, 252, 0.98)",
      stepInactiveText: isDarkMode ? "#e2e8f0" : "#111827",
      stepLabel: isDarkMode ? "#f8fafc" : "#111827",
      stepMuted: isDarkMode ? "#dbe4f0" : "#1f2937",
      surfaceText: isDarkMode ? "#f8fafc" : "#111827",
      termBackground: isDarkMode
        ? "rgba(15, 23, 42, 0.58)"
        : "rgba(255, 255, 255, 0.5)",
      warningBackground: isDarkMode
        ? "rgba(8, 19, 43, 0.96)"
        : "rgba(255, 255, 255, 0.98)",
      warningBorder: isDarkMode
        ? "rgba(96, 165, 250, 0.34)"
        : "rgba(37, 99, 235, 0.18)",
      warningIconBackground: isDarkMode
        ? "rgba(59, 130, 246, 0.2)"
        : "rgba(219, 234, 254, 0.95)",
      warningTitle: isDarkMode ? "#f8fafc" : "#0f172a",
      warningText: isDarkMode ? "#cbd5e1" : "#334155",
    }),
    [isDarkMode],
  );

  const [activeStep, setActiveStep] = useState(STEP_SUMMARY);
  const [cargadoPago, setCargadoPago] = useState(false);
  const [cargandoPaises, setCargandoPaises] = useState(false);
  const [cargandoComisiones, setCargandoComisiones] = useState(false);
  const [cargandoConversionResumen, setCargandoConversionResumen] =
    useState(false);
  const [comisionesComercio, setComisionesComercio] = useState(null);
  const [comisionesConvertidas, setComisionesConvertidas] = useState(0);
  const [comisionesExpanded, setComisionesExpanded] = useState(false);
  const [errorComisiones, setErrorComisiones] = useState(null);
  const [errorConversionResumen, setErrorConversionResumen] = useState(null);
  const [location, setLocation] = useState(
    () => initialLocation || getCachedDeviceLocationSync(),
  );
  const [nombreCalle, setNombreCalle] = useState("");
  const [numeroCasa, setNumeroCasa] = useState("");
  const [metodoPago, setMetodoPago] = useState(null);
  const [paisPago, setPaisPago] = useState(null);
  const [paisesPagoData, setPaisesPagoData] = useState([]);
  const [preparingCheckout, setPreparingCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seEstaPagando, setSeEstaPagando] = useState(false);
  const [esperandoOrdenBase, setEsperandoOrdenBase] = useState(false);
  const [subtotalProductosConvertido, setSubtotalProductosConvertido] =
    useState(0);
  const [totalAPagar, setTotalAPagar] = useState(0);
  const [visible, setVisible] = useState(false);

  const { compra } = Meteor.useTracker(() => {
    if (!visible || !userId) {
      return { compra: null };
    }

    const orderSelector = {
      status: { $nin: ["COMPLETED", "CANCELLED"] },
      userId,
    };

    const ordenesHandle = Meteor.subscribe(
      "ordenes",
      orderSelector,
    );

    const compra = ordenesHandle.ready()
      ? OrdenesCollection.findOne(orderSelector)
      : null;
    return { compra };
  }, [userId, visible]);

  const { cargandoCarrito, pedidosRemesa } = Meteor.useTracker(() => {
    if (!userId) {
      return { cargandoCarrito: false, pedidosRemesa: [] };
    }

    const cartOptions = visible ? {} : { fields: CART_BADGE_FIELDS };
    const carritoHandle = Meteor.subscribe(
      "carrito",
      { idUser: userId },
      cartOptions,
    );

    if (!carritoHandle.ready()) {
      return { cargandoCarrito: true, pedidosRemesa: [] };
    }

    return {
      cargandoCarrito: false,
      pedidosRemesa: CarritoCollection.find(
        { idUser: userId },
        cartOptions,
      ).fetch(),
    };
  }, [userId, visible]);

  const permitirPagoEfectivoCUP = Boolean(
    Meteor.user()?.permitirPagoEfectivoCUP,
  );

  const tieneComercio = useMemo(
    () => pedidosRemesa?.some((item) => item.type === "COMERCIO"),
    [pedidosRemesa],
  );

  const tieneProxyVPN = useMemo(
    () =>
      pedidosRemesa?.some(
        (item) => item.type === "PROXY" || item.type === "VPN",
      ),
    [pedidosRemesa],
  );

  const comercioCoordsSignature = useMemo(
    () =>
      JSON.stringify(
        (pedidosRemesa || [])
          .filter((item) => item.type === "COMERCIO")
          .map((item) => ({ _id: item._id, coordenadas: item.coordenadas })),
      ),
    [pedidosRemesa],
  );

  const data = useMemo(() => {
    const baseOptions = [];
    baseOptions.push({ label: "Paypal", value: "paypal" });
    baseOptions.push({ label: "MercadoPago", value: "mercadopago" });
    if (permitirPagoEfectivoCUP || tieneProxyVPN) {
      baseOptions.push({
        label: "Efectivo O Transferencia",
        value: "efectivo",
      });
    }
    return baseOptions;
  }, [permitirPagoEfectivoCUP, tieneProxyVPN]);

  const monedaFinalUI = useMemo(() => {
    switch (metodoPago) {
      case "paypal":
        return "USD";
      case "mercadopago":
        return "UYU";
      default:
        return paisPago || "CUP";
    }
  }, [metodoPago, paisPago]);

  const checkoutUrl = useMemo(() => {
    const candidates = [compra?.link];
    const url = candidates.find(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
    return url ? url.trim() : null;
  }, [compra?.link]);

  const getTerminos = () => {
    if (!metodoPago) return null;
    return terminosYCondiciones[metodoPago] || null;
  };

  const bloquearPagoPorComisiones = useMemo(() => {
    if (!tieneComercio) return false;
    if (errorComisiones) return true;
    if (cargandoComisiones) return true;
    return !comisionesComercio;
  }, [cargandoComisiones, comisionesComercio, errorComisiones, tieneComercio]);

  const totalComisionesUI = useMemo(() => {
    if (!tieneComercio || !comisionesComercio) return 0;

    const envio = Number(comisionesComercio?.costoTotalEntrega) || 0;
    const adicionales =
      comisionesComercio?.comisiones &&
      typeof comisionesComercio.comisiones === "object"
        ? Object.values(comisionesComercio.comisiones).reduce(
            (accumulator, comision) =>
              accumulator + (Number(comision?.valor) || 0),
            0,
          )
        : 0;

    return envio + adicionales;
  }, [comisionesComercio, tieneComercio]);

  const totalResumenConvertido = useMemo(
    () =>
      (Number(subtotalProductosConvertido) || 0) +
      (Number(comisionesConvertidas) || 0),
    [comisionesConvertidas, subtotalProductosConvertido],
  );

  const totalComisionesVisible = useMemo(
    () => Number(comisionesConvertidas || 0),
    [comisionesConvertidas],
  );

  const totalAPagarVisible = useMemo(() => {
    if (metodoPago === "efectivo") {
      return Number(totalResumenConvertido) || 0;
    }

    return Number(totalAPagar) || 0;
  }, [metodoPago, totalAPagar, totalResumenConvertido]);

  useEffect(() => {
    if (!visible) return;
    if ((pedidosRemesa?.length || 0) === 0) {
      setActiveStep(STEP_SUMMARY);
      setComisionesComercio(null);
      setErrorComisiones(null);
      setLocation(null);
      setMetodoPago(null);
      setPaisPago(null);
    }
  }, [pedidosRemesa, visible]);

  useEffect(() => {
    if (!visible) {
      setComisionesExpanded(false);
      setEsperandoOrdenBase(false);
      setPreparingCheckout(false);
      setProcessing(false);
      setSeEstaPagando(false);
    }
  }, [visible]);

  useEffect(() => {
    if (
      activeStep === STEP_PAY &&
      metodoPago === "efectivo" &&
      esperandoOrdenBase &&
      compra
    ) {
      setEsperandoOrdenBase(false);
      setPreparingCheckout(false);
    }
  }, [activeStep, compra, esperandoOrdenBase, metodoPago]);

  useEffect(() => {
    if (!initialLocation) {
      return;
    }

    if (!visible || !location) {
      setLocation(initialLocation);
    }
  }, [initialLocation, location, visible]);

  useEffect(() => {
    let cancelled = false;

    if (!visible) {
      setCargandoConversionResumen(false);
      setErrorConversionResumen(null);
      return () => {
        cancelled = true;
      };
    }

    const hayCarrito = Array.isArray(pedidosRemesa) && pedidosRemesa.length > 0;
    const hayMetodo = Boolean(metodoPago);
    const monedaFinal = String(monedaFinalUI || "")
      .trim()
      .toUpperCase();

    if (!hayCarrito || !hayMetodo || !monedaFinal) {
      setSubtotalProductosConvertido(0);
      setComisionesConvertidas(0);
      setCargandoConversionResumen(false);
      setErrorConversionResumen(null);
      return () => {
        cancelled = true;
      };
    }

    setCargandoConversionResumen(true);
    setErrorConversionResumen(null);

    const convertir = (monto, monedaOrigen) =>
      new Promise((resolve, reject) => {
        const montoNumerico = Number(monto) || 0;
        const origen = String(monedaOrigen || monedaFinal)
          .trim()
          .toUpperCase();

        if (!montoNumerico || origen === monedaFinal) {
          resolve(montoNumerico);
          return;
        }

        Meteor.call(
          "moneda.convertir",
          montoNumerico,
          origen,
          monedaFinal,
          (error, resultado) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(Number(resultado) || 0);
          },
        );
      });

    (async () => {
      try {
        let subtotal = 0;

        for (const item of pedidosRemesa) {
          const cantidad = Number(item?.cantidad || 1) || 1;
          const montoItem = Number(item?.cobrarUSD || 0) * cantidad;
          const monedaItem = String(item?.monedaACobrar || "CUP")
            .trim()
            .toUpperCase();

          if (montoItem > 0) {
            subtotal += await convertir(montoItem, monedaItem);
          }
        }

        const comisionesRaw = Number(totalComisionesUI) || 0;
        const monedaComisiones = String(
          comisionesComercio?.moneda || monedaFinal,
        )
          .trim()
          .toUpperCase();
        const comisiones = await convertir(comisionesRaw, monedaComisiones);

        if (cancelled) return;

        setSubtotalProductosConvertido(subtotal);
        setComisionesConvertidas(comisiones);
        setCargandoConversionResumen(false);
      } catch (error) {
        if (cancelled) return;

        setCargandoConversionResumen(false);
        setErrorConversionResumen(
          error?.reason ||
            error?.message ||
            "No se pudo convertir el resumen a la moneda seleccionada.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    comisionesComercio?.moneda,
    metodoPago,
    monedaFinalUI,
    pedidosRemesa,
    totalComisionesUI,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      setCargandoComisiones(false);
      return;
    }

    if (!tieneComercio) {
      setComisionesComercio(null);
      setErrorComisiones(null);
      setCargandoComisiones(false);
      return;
    }

    const itemsComercio = (pedidosRemesa || []).filter(
      (item) => item.type === "COMERCIO",
    );
    const todosConCoordenadas = itemsComercio.every(
      (item) => item?.coordenadas?.latitude && item?.coordenadas?.longitude,
    );

    if (!todosConCoordenadas) {
      setComisionesComercio(null);
      return;
    }

    setCargandoComisiones(true);
    setErrorComisiones(null);

    Meteor.call(
      "comercio.calcularCostosEntrega",
      pedidosRemesa,
      monedaFinalUI,
      (error, costos) => {
        setCargandoComisiones(false);
        if (error) {
          setComisionesComercio(null);
          setErrorComisiones(
            error.reason ||
              error.message ||
              "No se pudo calcular los costos de entrega.",
          );
          return;
        }

        setComisionesComercio(costos || null);
      },
    );
  }, [
    comercioCoordsSignature,
    monedaFinalUI,
    pedidosRemesa,
    tieneComercio,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      setCargandoPaises(false);
      return;
    }

    if (!metodoPago) {
      setPaisesPagoData([]);
      setPaisPago(null);
      return;
    }

    const requiere =
      metodoPago === "efectivo" || metodoPago === "transferencia";
    if (!requiere) {
      setPaisesPagoData([]);
      return;
    }

    setCargandoPaises(true);
    Meteor.call(
      "property.getVariasPropertys",
      "METODO_PAGO",
      "REMESA",
      (err, properties) => {
        setCargandoPaises(false);
        if (err || !Array.isArray(properties) || properties.length === 0) {
          setPaisesPagoData([{ label: "Cuba", value: "CUP" }]);
          return;
        }

        const paisesParseados = properties
          .filter((prop) => prop?.active && prop?.valor)
          .map((prop) => {
            const partes = String(prop.valor).split("-");
            if (partes.length !== 2) return null;
            const [paisRaw, moneda] = partes.map((entry) =>
              String(entry).trim(),
            );
            if (!paisRaw || !moneda) return null;
            return {
              label:
                paisRaw.charAt(0).toUpperCase() +
                paisRaw.slice(1).toLowerCase(),
              value: moneda.toUpperCase(),
            };
          })
          .filter(Boolean);

        setPaisesPagoData(
          paisesParseados.length > 0
            ? paisesParseados
            : [{ label: "Cuba", value: "CUP" }],
        );
      },
    );
  }, [metodoPago, visible]);

  useEffect(() => {
    if (!visible) {
      setCargadoPago(false);
      return;
    }

    if (!metodoPago) {
      setCargadoPago(false);
      setTotalAPagar(0);
      return;
    }

    setCargadoPago(false);

    const callback = (err, res) => {
      if (err) {
        console.error("Error al calcular total a pagar:", err);
        setCargadoPago(false);
        return;
      }
      setTotalAPagar(Number(res) || 0);
      setCargadoPago(true);
    };

    if (metodoPago === "paypal") {
      Meteor.call(
        "paypal.totalAPagar",
        pedidosRemesa,
        comisionesComercio,
        monedaFinalUI,
        callback,
      );
      return;
    }

    if (metodoPago === "mercadopago") {
      Meteor.call(
        "mercadopago.totalAPagar",
        pedidosRemesa,
        comisionesComercio,
        monedaFinalUI,
        callback,
      );
      return;
    }

    Meteor.call(
      "efectivo.totalAPagar",
      pedidosRemesa,
      monedaFinalUI,
      comisionesComercio,
      callback,
    );
  }, [comisionesComercio, metodoPago, monedaFinalUI, pedidosRemesa, visible]);

  useEffect(() => {
    if (!visible || activeStep !== STEP_PAY || !metodoPago) return;

    setPreparingCheckout(true);
    Meteor.call("cancelarOrdenesPaypalIncompletas", userId, (cancelError) => {
      if (cancelError) {
        console.error("Error cancelando órdenes PayPal:", cancelError);
      }

      const finishPreparing = (error) => {
        if (error) {
          console.error("Error creando orden de pago:", error);
        }
        setPreparingCheckout(false);
      };

      if (metodoPago === "paypal") {
        Meteor.call(
          "creandoOrden",
          userId,
          totalAPagar,
          "Compras Online a travez de VidKar",
          pedidosRemesa,
          comisionesComercio,
          finishPreparing,
        );
        return;
      }

      if (metodoPago === "mercadopago") {
        Meteor.call(
          "mercadopago.createOrder",
          userId,
          pedidosRemesa,
          comisionesComercio,
          totalAPagar,
          "Servicios Online a travez de VidKar",
          finishPreparing,
        );
        return;
      }

      setEsperandoOrdenBase(true);

      Meteor.call(
        "efectivo.createOrder",
        userId,
        pedidosRemesa,
        comisionesComercio,
        (error) => {
          if (error) {
            setEsperandoOrdenBase(false);
            finishPreparing(error);
            return;
          }

          // Espera a que la orden base llegue reactivamente a Minimongo antes
          // de habilitar la generación final de la venta en efectivo.
        },
      );
    });
  }, [
    activeStep,
    comisionesComercio,
    metodoPago,
    pedidosRemesa,
    totalAPagar,
    userId,
    visible,
  ]);

  const hideModal = () => setVisible(false);

  const nextStep = async () => {
    if (activeStep === STEP_SUMMARY) {
      setActiveStep(STEP_PAYMENT);
      return;
    }

    if (activeStep === STEP_PAYMENT) {
      const requierePaisPago =
        metodoPago === "efectivo" || metodoPago === "transferencia";
      const paisPagoValido = !requierePaisPago || tieneProxyVPN || !!paisPago;

      if (!metodoPago || !paisPagoValido) {
        Alert.alert(
          "Método de pago",
          "Debe seleccionar un método de pago válido antes de continuar.",
        );
        return;
      }

      setActiveStep(tieneComercio ? STEP_LOCATION : STEP_TERMS);
      return;
    }

    if (activeStep === STEP_LOCATION) {
      const deliveryLocation = normalizeDeliveryLocation(location);

      if (tieneComercio && !deliveryLocation) {
        Alert.alert(
          "Ubicación requerida",
          "Selecciona una ubicación válida con coordenadas para continuar.",
        );
        return;
      }

      const normalizedNombreCalle = nombreCalle.trim();
      const normalizedNumeroCasa = numeroCasa.trim();

      if (tieneComercio && (!normalizedNombreCalle || !normalizedNumeroCasa)) {
        Alert.alert(
          "Dirección requerida",
          "Ingresa el nombre de la calle y el número de la casa para completar la entrega.",
        );
        return;
      }

      if (tieneComercio) {
        Meteor.call(
          "carrito.actualizarUbicacion",
          userId,
          {
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
            nombreCalle: normalizedNombreCalle,
            numeroCasa: normalizedNumeroCasa,
          },
          (error) => {
            if (error) {
              Alert.alert(
                "Error",
                error.reason || "No se pudo actualizar la ubicación.",
              );
              return;
            }
            setActiveStep(STEP_TERMS);
          },
        );
        return;
      }

      setActiveStep(STEP_TERMS);
      return;
    }

    if (activeStep === STEP_TERMS) {
      setActiveStep(STEP_PAY);
    }
  };

  const previousStep = () => {
    if (activeStep === STEP_PAYMENT) setActiveStep(STEP_SUMMARY);
    if (activeStep === STEP_LOCATION) setActiveStep(STEP_PAYMENT);
    if (activeStep === STEP_TERMS) {
      setActiveStep(tieneComercio ? STEP_LOCATION : STEP_PAYMENT);
    }
    if (activeStep === STEP_PAY) setActiveStep(STEP_TERMS);
  };

  const handlePagar = async () => {
    if (processing) return;

    if (!checkoutUrl) {
      Alert.alert(
        "Pago no disponible",
        "Aún no se generó el enlace de pago. Espera unos segundos y vuelve a intentar.",
      );
      return;
    }

    setProcessing(true);
    setSeEstaPagando(true);

    try {
      const normalizedCheckoutUrl = String(checkoutUrl).trim();
      const isHttpCheckout = /^https?:\/\//i.test(normalizedCheckoutUrl);

      if (isHttpCheckout) {
        hideModal();
        await WebBrowser.openBrowserAsync(normalizedCheckoutUrl);
        return;
      }

      const supported = await Linking.canOpenURL(normalizedCheckoutUrl);
      if (!supported) {
        Alert.alert(
          "Pago no disponible",
          "El dispositivo no puede abrir el enlace de pago.",
        );
        return;
      }

      await Linking.openURL(normalizedCheckoutUrl);
    } catch (error) {
      console.error("[WizardConStepper] Error abriendo checkout:", error);
      Alert.alert(
        "No se pudo abrir el pago",
        "El enlace de pago no pudo abrirse en este momento. Intenta nuevamente.",
      );
    } finally {
      setTimeout(() => {
        setProcessing(false);
        setSeEstaPagando(false);
      }, 5000);
    }
  };

  const handleGenerarVenta = () => {
    if (processing) return;

    if (esperandoOrdenBase || !compra) {
      Alert.alert(
        "Venta no disponible",
        "Aún no se ha creado la orden base. Espera unos segundos e intenta nuevamente.",
      );
      return;
    }

    setProcessing(true);
    Meteor.call(
      "moneda.convertir",
      Number(totalAPagar),
      monedaFinalUI,
      "USD",
      null,
      (error, totalAPagarConvertido) => {
        if (error) {
          console.error("Error al convertir totalAPagar a USD:", error);
          setProcessing(false);
          Alert.alert(
            "Error",
            error.reason ||
              "No se pudo convertir el total para generar la venta.",
          );
          return;
        }

        const ventaData = {
          producto: compra,
          precioOficial: totalAPagarConvertido,
          comisionesComercio,
        };

        Meteor.call(
          "generarVentaEfectivo",
          ventaData,
          monedaFinalUI || "CUP",
          (saleError, success) => {
            setProcessing(false);
            if (saleError) {
              Alert.alert(
                "Error",
                saleError.reason || "No se pudo generar la venta.",
              );
              return;
            }

            if (success) {
              Alert.alert(
                "Venta generada",
                "La orden fue creada correctamente. Ahora puede subir su evidencia de pago.",
              );
            }
          },
        );
      },
    );
  };

  const finishDisabled =
    processing ||
    preparingCheckout ||
    seEstaPagando ||
    esperandoOrdenBase ||
    bloquearPagoPorComisiones ||
    !cargadoPago ||
    (metodoPago !== "efectivo" && !checkoutUrl) ||
    (metodoPago === "efectivo" && (totalAPagar <= 0 || !compra));

  const renderPaymentWarnings = () => {
    if (!tieneComercio) return null;

    if (cargandoComisiones) {
      return (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: wizardPalette.warningBackground,
              borderColor: wizardPalette.warningBorder,
            },
          ]}
        >
          <Text style={[styles.warningText, { color: wizardPalette.warningText }]}>
            Calculando costos de entrega para los productos de comercio...
          </Text>
        </View>
      );
    }

    if (errorComisiones) {
      return (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: wizardPalette.warningBackground,
              borderColor: wizardPalette.warningBorder,
            },
          ]}
        >
          <Text style={[styles.warningText, { color: wizardPalette.warningText }]}>{errorComisiones}</Text>
        </View>
      );
    }

    return null;
  };

  const renderStepper = () => (
    <View style={styles.stepperRow}>
      {stepLabelList.map((label, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;
        const isLast = index === stepLabelList.length - 1;

        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor:
                    isActive || isCompleted
                      ? wizardPalette.accentStrong
                      : wizardPalette.stepInactiveBackground,
                  borderColor: wizardPalette.accentStrong,
                },
              ]}
            >
              {isCompleted ? (
                <IconButton
                  icon="check"
                  iconColor="#f1f8ff"
                  size={14}
                  style={styles.stepCheck}
                />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    {
                      color:
                        isActive || isCompleted
                          ? "#ffffff"
                          : wizardPalette.stepInactiveText,
                    },
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            {!isLast ? (
              <View
                style={[
                  styles.stepConnector,
                  {
                    backgroundColor: isCompleted
                      ? wizardPalette.accentStrong
                      : wizardPalette.divider,
                  },
                ]}
              />
            ) : null}
            <Text
              style={[
                styles.stepLabel,
                { color: wizardPalette.stepMuted },
                isActive && {
                  color: wizardPalette.accentStrong,
                  fontWeight: "800",
                },
                isCompleted && {
                  color: wizardPalette.stepLabel,
                  fontWeight: "700",
                },
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderTerms = () => {
    const terminos = getTerminos();
    if (!terminos) {
      return (
        <View style={styles.sinMetodoContainer}>
          <IconButton
            icon="information-outline"
            iconColor={wizardPalette.mutedText}
            size={48}
          />
          <Text style={[styles.sinMetodoTexto, { color: wizardPalette.mutedText }]}>
            Seleccione un método de pago en el paso anterior para visualizar los
            términos y condiciones aplicables.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.terminosContainer}>
        <Text style={[styles.terminosTitulo, { color: wizardPalette.contentText }]}>{terminos.titulo}</Text>
        <Divider style={[styles.termsDivider, { backgroundColor: wizardPalette.divider }]} />
        {terminos.contenido.map((seccion, index) => (
          <View
            key={`${seccion.subtitulo}-${index}`}
            style={[
              styles.seccionTermino,
              {
                backgroundColor: wizardPalette.termBackground,
                borderLeftColor: wizardPalette.accentStrong,
              },
            ]}
          >
            <Text style={[styles.terminosSubtitulo, { color: wizardPalette.contentText }]}>{seccion.subtitulo}</Text>
            <Text style={[styles.terminosTexto, { color: wizardPalette.mutedText }]}>{seccion.texto}</Text>
          </View>
        ))}
        <View
          style={[
            styles.advertenciaFinal,
            {
              backgroundColor: wizardPalette.alertBackground,
              borderColor: wizardPalette.alertBorder,
            },
          ]}
        >
          <View
            style={[
              styles.advertenciaIconWrap,
              { backgroundColor: wizardPalette.alertIconBackground },
            ]}
          >
            <IconButton
              icon="alert-circle"
              iconColor={wizardPalette.alertIcon}
              size={20}
              style={styles.noMargin}
            />
          </View>
          <View style={styles.advertenciaCopy}>
            <Text style={[styles.advertenciaTitle, { color: wizardPalette.alertTitle }]}>Confirmación requerida</Text>
            <Text style={[styles.advertenciaTexto, { color: wizardPalette.alertText }]}> 
              Al aceptar, confirmas que leíste las condiciones de pago y que los
              datos de la orden son correctos.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderComisionesCard = () => {
    if (!tieneComercio) return null;

    return (
      <View style={styles.comisionesContainer}>
        <Card
          style={[
            styles.comisionesCard,
            {
              backgroundColor: wizardPalette.cardBackground,
              borderColor: wizardPalette.cardBorder,
            },
          ]}
          elevation={2}
        >
          <Card.Content style={styles.comisionesContent}>
            {cargandoComisiones ? (
              <View style={styles.comisionesLoading}>
                <ActivityIndicator color="#6200ee" size="small" />
                <Text style={[styles.comisionesLoadingText, { color: wizardPalette.cardMuted }]}>Calculando...</Text>
              </View>
            ) : errorComisiones ? (
              <View style={styles.comisionesError}>
                <IconButton
                  icon="alert-circle-outline"
                  iconColor="#D32F2F"
                  size={28}
                  style={styles.noMargin}
                />
                <Text style={styles.comisionesErrorText}>
                  {errorComisiones}
                </Text>
              </View>
            ) : comisionesComercio ? (
              <>
                <View style={styles.comisionesResumenHeader}>
                  <View style={styles.comisionesResumenInfo}>
                    <Text style={[styles.comisionesResumenLabel, { color: wizardPalette.cardText }]}>
                      Total de comisiones
                    </Text>
                    <Text style={[styles.comisionesResumenHint, { color: wizardPalette.cardMuted }]}>
                      Incluye envío y cargos adicionales
                    </Text>
                  </View>
                  <Chip
                    mode="flat"
                    style={styles.totalFinalChip}
                    textStyle={styles.comisionesResumenChipText}
                  >
                    {totalComisionesVisible.toFixed(2)} {monedaFinalUI}
                  </Chip>
                </View>

                <Button
                  compact
                  icon={comisionesExpanded ? "chevron-up" : "chevron-down"}
                  mode="text"
                  onPress={() => setComisionesExpanded((value) => !value)}
                  style={styles.comisionesToggleButton}
                  contentStyle={styles.comisionesToggleContent}
                  labelStyle={styles.comisionesToggleLabel}
                >
                  {comisionesExpanded ? "Ocultar detalles" : "Ver detalles"}
                </Button>

                {comisionesExpanded ? (
                  <>
                    <Divider style={styles.totalDivider} />

                    <View style={styles.seccionEnvio}>
                      <View style={styles.seccionHeader}>
                        <IconButton
                          icon="truck-fast"
                          iconColor="#2196F3"
                          size={18}
                          style={styles.noMargin}
                        />
                        <Text style={styles.seccionTitulo}>
                          Costos de Envío
                        </Text>
                      </View>

                      {comisionesComercio.desglosePorTienda?.length > 0
                        ? comisionesComercio.desglosePorTienda.map((tienda) => (
                            <View
                              key={tienda.idTienda}
                              style={styles.tiendaItem}
                            >
                              <View style={styles.tiendaHeader}>
                                <IconButton
                                  icon="storefront"
                                  iconColor="#2196F3"
                                  size={16}
                                  style={styles.noMargin}
                                />
                                <View style={styles.tiendaInfo}>
                                  <Text style={[styles.tiendaNombre, { color: wizardPalette.cardText }]}>
                                    {tienda.nombreTienda}
                                  </Text>
                                  <Text style={[styles.tiendaDetalle, { color: wizardPalette.cardMuted }]}>
                                    {tienda.productosCount}{" "}
                                    {tienda.productosCount > 1
                                      ? "items"
                                      : "item"}
                                    {" • "}
                                    {tienda.distanciaKm} km
                                  </Text>
                                </View>
                                <Chip
                                  mode="flat"
                                  style={[
                                    styles.comisionChip,
                                    { backgroundColor: "#2196F320" },
                                  ]}
                                  textStyle={{
                                    color: "#2196F3",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                  }}
                                >
                                  {tienda.costoEntrega} {tienda.moneda}
                                </Chip>
                              </View>
                            </View>
                          ))
                        : null}

                      <View
                        style={[
                          styles.comisionItem,
                          styles.subtotalEnvio,
                          {
                            backgroundColor: isDarkMode
                              ? "rgba(30, 64, 124, 0.34)"
                              : "#E3F2FD",
                          },
                        ]}
                      >
                        <View style={styles.comisionRowHorizontal}>
                          <View style={styles.comisionLeft}>
                            <IconButton
                              icon="map-marker-distance"
                              iconColor="#2196F3"
                              size={18}
                              style={styles.noMargin}
                            />
                            <View>
                              <Text style={styles.subtotalLabel}>
                                Subtotal Envío
                              </Text>
                              <Text style={[styles.comisionDescripcion, { color: wizardPalette.cardMuted }]}>
                                {comisionesComercio.tiendasProcesadas}{" "}
                                {comisionesComercio.tiendasProcesadas > 1
                                  ? "tiendas"
                                  : "tienda"}
                              </Text>
                            </View>
                          </View>
                          <Chip
                            mode="flat"
                            style={[
                              styles.comisionChip,
                              { backgroundColor: "#2196F3" },
                            ]}
                            textStyle={{
                              color: "#FFF",
                              fontSize: 13,
                              fontWeight: "bold",
                            }}
                          >
                            {comisionesComercio.costoTotalEntrega}{" "}
                            {comisionesComercio.moneda}
                          </Chip>
                        </View>
                      </View>
                    </View>

                    {comisionesComercio.comisiones &&
                    Object.keys(comisionesComercio.comisiones).length > 0 ? (
                      <>
                        <Divider style={styles.seccionDivider} />

                        <View style={styles.seccionComisiones}>
                          <View style={styles.seccionHeader}>
                            <IconButton
                              icon="receipt"
                              iconColor="#FF6F00"
                              size={18}
                              style={styles.noMargin}
                            />
                            <Text style={styles.seccionTitulo}>
                              Comisiones Adicionales
                            </Text>
                          </View>

                          {Object.entries(comisionesComercio.comisiones).map(
                            ([clave, comision]) => (
                              <View key={clave} style={styles.comisionItem}>
                                <View style={styles.comisionRowHorizontal}>
                                  <View style={styles.comisionLeft}>
                                    <IconButton
                                      icon="cash-multiple"
                                      iconColor="#FF6F00"
                                      size={16}
                                      style={styles.noMargin}
                                    />
                                    <Text style={[styles.comisionLabel, { color: wizardPalette.cardText }]}>
                                      {comision.comentario || "Comisión"}
                                    </Text>
                                  </View>
                                  <Chip
                                    mode="flat"
                                    style={[
                                      styles.comisionChip,
                                      { backgroundColor: "#FF6F0020" },
                                    ]}
                                    textStyle={{
                                      color: "#FF6F00",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {comision.valor} {comision.moneda}
                                  </Chip>
                                </View>
                              </View>
                            ),
                          )}
                        </View>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <View style={styles.comisionesSinDatos}>
                <IconButton
                  icon="map-marker-question"
                  iconColor="#999"
                  size={28}
                  style={styles.noMargin}
                />
                <Text style={[styles.comisionesSinDatosText, { color: wizardPalette.cardMuted }]}>
                  Selecciona tu ubicación para calcular costos
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderTotalCard = () => (
    <Card
      style={[
        styles.totalCard,
        {
          backgroundColor: wizardPalette.cardBackground,
          borderColor: wizardPalette.cardBorder,
        },
      ]}
      elevation={3}
    >
      <Card.Title
        title="Resumen de pago"
        subtitle={`Método: ${metodoPago || "N/D"} • Moneda: ${monedaFinalUI}`}
        titleStyle={[styles.totalCardTitle, { color: wizardPalette.cardText }]}
        subtitleStyle={[styles.totalCardSubtitle, { color: wizardPalette.cardMuted }]}
        left={(props) => (
          <IconButton
            {...props}
            icon="cash-multiple"
            iconColor={wizardPalette.cardMuted}
            size={20}
            style={styles.noMargin}
          />
        )}
      />
      <Divider style={{ backgroundColor: wizardPalette.divider }} />
      <Card.Content style={styles.totalCardContent}>
        {cargandoComisiones || cargandoConversionResumen ? (
          <View style={styles.totalRowCenter}>
            <ActivityIndicator color="#6200ee" size="small" />
            <Text style={[styles.totalHintText, { color: wizardPalette.cardMuted }]}>Calculando total...</Text>
          </View>
        ) : errorComisiones || errorConversionResumen ? (
          <View style={styles.totalRowCenter}>
            <IconButton
              icon="alert-circle-outline"
              iconColor="#D32F2F"
              size={18}
              style={styles.noMargin}
            />
            <Text style={[styles.totalHintText, { color: "#D32F2F" }]}>
              {errorComisiones || errorConversionResumen}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: wizardPalette.cardMuted }]}>Subtotal (productos)</Text>
              <Text style={[styles.totalValue, { color: wizardPalette.cardText }]}>
                {Number(subtotalProductosConvertido || 0).toFixed(2)}{" "}
                {monedaFinalUI}
              </Text>
            </View>

            {tieneComercio ? (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: wizardPalette.cardMuted }]}>
                  Comisiones (envío + adicionales)
                </Text>
                <Text style={[styles.totalValue, { color: wizardPalette.cardText }]}>
                  {Number(comisionesConvertidas || 0).toFixed(2)}{" "}
                  {monedaFinalUI}
                </Text>
              </View>
            ) : null}

            {metodoPago === "paypal" || metodoPago === "mercadopago" ? (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: wizardPalette.cardMuted }]}>
                  Comisión {metodoPago === "paypal" ? "PayPal" : "MercadoPago"}
                </Text>
                <Text style={[styles.totalValue, { color: wizardPalette.cardText }]}>
                  {Math.max(
                    0,
                    Number(totalAPagar || 0) -
                      Number(totalResumenConvertido || 0),
                  ).toFixed(2)}{" "}
                  {monedaFinalUI}
                </Text>
              </View>
            ) : null}

            <Divider style={[styles.totalDivider, { backgroundColor: wizardPalette.divider }]} />

            <View style={styles.totalRow}>
              <Text style={[styles.totalTotalLabel, { color: wizardPalette.cardText }]}>TOTAL A PAGAR</Text>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillText}>
                  {totalAPagarVisible.toFixed(2)} {monedaFinalUI}
                </Text>
              </View>
            </View>

            {metodoPago === "efectivo" || metodoPago === "transferencia" ? (
              <Text style={[styles.totalFootnote, { color: wizardPalette.cardMuted }]}> 
                Importante: asegúrate de enviar el monto exacto. Si tu banco
                aplica comisiones externas, la diferencia deberá cubrirse.
              </Text>
            ) : null}
          </>
        )}
      </Card.Content>
    </Card>
  );

  const renderManualPaymentInfoCard = () => {
    if (metodoPago !== "efectivo" && metodoPago !== "transferencia") {
      return null;
    }

    const cardPalette = {
      accent: isDarkMode ? "#93c5fd" : "#1d4ed8",
      border: isDarkMode ? "rgba(96, 165, 250, 0.28)" : "rgba(29, 78, 216, 0.18)",
      copy: isDarkMode ? "#cbd5e1" : "#475569",
      iconBackground: isDarkMode ? "rgba(59, 130, 246, 0.18)" : "rgba(219, 234, 254, 0.9)",
      muted: isDarkMode ? "#94a3b8" : "#64748b",
      surface: isDarkMode ? "rgba(11, 31, 67, 0.86)" : "rgba(255, 255, 255, 0.96)",
      title: isDarkMode ? "#f8fafc" : "#0f172a",
    };

    const steps = [
      {
        icon: "file-document-check-outline",
        text: "Al tocar Generar venta, la orden queda creada pero pendiente de pago.",
        title: "Genera la venta",
      },
      {
        icon: "bank-transfer",
        text: `Realiza el pago exacto por ${totalAPagarVisible.toFixed(2)} ${monedaFinalUI} usando los datos que aparecerán en la venta pendiente.`,
        title: "Paga por efectivo o transferencia",
      },
      {
        icon: "camera-plus-outline",
        text: "Sube una foto clara del comprobante. Debe verse monto, fecha, referencia y cuenta destino.",
        title: "Adjunta la evidencia",
      },
      {
        icon: "account-check-outline",
        text: "Un administrador revisará el comprobante y aprobará la venta antes de entregar o activar el servicio.",
        title: "Espera la aprobación",
      },
    ];

    return (
      <Card
        elevation={2}
        style={[
          styles.manualPaymentInfoCard,
          {
            backgroundColor: cardPalette.surface,
            borderColor: cardPalette.border,
          },
        ]}
      >
        <Card.Content style={styles.manualPaymentInfoContent}>
          <View style={styles.manualPaymentHeaderRow}>
            <View
              style={[
                styles.manualPaymentHeaderIcon,
                { backgroundColor: cardPalette.iconBackground },
              ]}
            >
              <IconButton
                icon="cash-clock"
                iconColor={cardPalette.accent}
                size={22}
                style={styles.noMargin}
              />
            </View>
            <View style={styles.manualPaymentHeaderCopy}>
              <Text style={[styles.manualPaymentEyebrow, { color: cardPalette.muted }]}>Pago pendiente con comprobante</Text>
              <Text style={[styles.manualPaymentTitle, { color: cardPalette.title }]}>Qué debes hacer después de generar la venta</Text>
            </View>
          </View>

          <Text style={[styles.manualPaymentIntro, { color: cardPalette.copy }]}>Este método no confirma el pago automáticamente. La venta queda pendiente hasta que subas la evidencia y sea revisada.</Text>

          <View style={styles.manualPaymentSteps}>
            {steps.map((step, index) => (
              <View key={step.title} style={styles.manualPaymentStepRow}>
                <View style={styles.manualPaymentStepRail}>
                  <View
                    style={[
                      styles.manualPaymentStepIcon,
                      { backgroundColor: cardPalette.iconBackground },
                    ]}
                  >
                    <IconButton
                      icon={step.icon}
                      iconColor={cardPalette.accent}
                      size={17}
                      style={styles.noMargin}
                    />
                  </View>
                  {index < steps.length - 1 ? (
                    <View
                      style={[
                        styles.manualPaymentStepLine,
                        { backgroundColor: cardPalette.border },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.manualPaymentStepCopy}>
                  <Text style={[styles.manualPaymentStepTitle, { color: cardPalette.title }]}>{step.title}</Text>
                  <Text style={[styles.manualPaymentStepText, { color: cardPalette.copy }]}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderProxyVpnPaymentNotice = () => {
    if (!tieneProxyVPN) return null;

    return (
      <View
        style={[
          styles.paymentNoticeCard,
          {
            backgroundColor: wizardPalette.warningBackground,
            borderColor: wizardPalette.warningBorder,
          },
        ]}
      >
        <View
          style={[
            styles.paymentNoticeIcon,
            { backgroundColor: wizardPalette.warningIconBackground },
          ]}
        >
          <IconButton
            icon="shield-check-outline"
            iconColor={isDarkMode ? "#93c5fd" : "#b45309"}
            size={22}
            style={styles.noMargin}
          />
        </View>
        <View style={styles.paymentNoticeCopy}>
          <Text
            style={[
              styles.paymentNoticeTitle,
              { color: wizardPalette.warningTitle },
            ]}
          >
            Opciones disponibles para Proxy/VPN
          </Text>
          <Text
            style={[
              styles.paymentNoticeText,
              { color: wizardPalette.warningText },
            ]}
          >
            Puedes pagar con PayPal, MercadoPago o mediante efectivo/transferencia.
            En pago manual, elige la moneda, genera la venta y adjunta el
            comprobante para revisión.
          </Text>
        </View>
      </View>
    );
  };

  const renderCartLoadingState = () => (
    <View style={styles.cartLoadingState}>
      <ActivityIndicator animating size="small" />
      <Text style={[styles.cartLoadingTitle, { color: wizardPalette.contentText }]}> 
        Cargando productos del carrito...
      </Text>
      <Text style={[styles.cartLoadingText, { color: wizardPalette.mutedText }]}> 
        Estamos preparando tus productos para confirmar el pedido.
      </Text>
    </View>
  );

  const renderContent = () => {
    if (activeStep === STEP_SUMMARY) {
      if (cargandoCarrito) {
        return renderCartLoadingState();
      }

      return <ListaPedidosRemesa eliminar items={pedidosRemesa} />;
    }
    if (activeStep === STEP_PAYMENT) {
      return (
        <View>
          <Text style={[styles.sectionTitle, { color: wizardPalette.contentText }]}>Seleccione el Metodo de Pago</Text>
          {renderProxyVpnPaymentNotice()}
          {renderPaymentWarnings()}
          <Dropdown
            style={[
              styles.dropdown,
              {
                backgroundColor: wizardPalette.dropdownBackground,
                borderColor: wizardPalette.dropdownBorder,
              },
            ]}
            placeholderStyle={[styles.placeholderStyle, { color: wizardPalette.dropdownPlaceholder }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: wizardPalette.contentText }]}
            inputSearchStyle={[styles.inputSearchStyle, { color: wizardPalette.contentText }]}
            iconStyle={styles.iconStyle}
            containerStyle={[
              styles.dropdownMenuContainer,
              { backgroundColor: wizardPalette.dropdownBackground },
            ]}
            itemTextStyle={{ color: wizardPalette.contentText }}
            activeColor={isDarkMode ? "rgba(124, 58, 237, 0.22)" : "#ede9fe"}
            itemContainerStyle={styles.dropdownItemContainer}
            selectedTextProps={{ numberOfLines: 1 }}
            data={data}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Seleccione un método de pago"
            searchPlaceholder="Buscar..."
            value={metodoPago}
            onChange={(item) => setMetodoPago(item.value)}
          />
          {metodoPago === "efectivo" ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.countryLabel, { color: wizardPalette.contentText }]}> 
                País donde realizará el pago
              </Text>
              {cargandoPaises ? (
                <View style={styles.loadingCountries}>
                  <ActivityIndicator color="#6200ee" size="small" />
                  <Text style={[styles.loadingCountriesText, { color: wizardPalette.mutedText }]}> 
                    Cargando países disponibles...
                  </Text>
                </View>
              ) : (
                <Dropdown
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: wizardPalette.dropdownBackground,
                      borderColor: wizardPalette.dropdownBorder,
                    },
                  ]}
                  placeholderStyle={[styles.placeholderStyle, { color: wizardPalette.dropdownPlaceholder }]}
                  selectedTextStyle={[styles.selectedTextStyle, { color: wizardPalette.contentText }]}
                  inputSearchStyle={[styles.inputSearchStyle, { color: wizardPalette.contentText }]}
                  iconStyle={styles.iconStyle}
                  containerStyle={[
                    styles.dropdownMenuContainer,
                    { backgroundColor: wizardPalette.dropdownBackground },
                  ]}
                  itemTextStyle={{ color: wizardPalette.contentText }}
                  activeColor={isDarkMode ? "rgba(124, 58, 237, 0.22)" : "#ede9fe"}
                  itemContainerStyle={styles.dropdownItemContainer}
                  data={paisesPagoData}
                  search={paisesPagoData.length > 3}
                  maxHeight={240}
                  labelField="label"
                  valueField="value"
                  placeholder="Seleccione un país"
                  searchPlaceholder="Buscar país..."
                  value={paisPago}
                  onChange={(item) => setPaisPago(item.value)}
                  disable={paisesPagoData.length === 0}
                />
              )}
              <Text style={[styles.countryValue, { color: wizardPalette.contentText }]}> 
                Moneda seleccionada: {monedaFinalUI}
              </Text>
            </View>
          ) : null}
        </View>
      );
    }
    if (activeStep === STEP_LOCATION) {
      if (!tieneComercio) {
        return (
          <View style={styles.placeholderCenter}>
            <Text style={[styles.placeholderText, { color: wizardPalette.mutedText }]}>
              Este paso no es necesario para tu pedido
            </Text>
          </View>
        );
      }
      return (
        <ScrollView
          style={styles.locationStepScrollView}
          contentContainerStyle={styles.locationStepContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.locationTitle, { color: wizardPalette.contentText }]}> 
            Selecciona dónde recibirás tu pedido
          </Text>
          <MapLocationPicker
            currentLocation={location}
            nombreCalle={nombreCalle}
            numeroCasa={numeroCasa}
            onLocationSelect={setLocation}
            onNombreCalleChange={setNombreCalle}
            onNumeroCasaChange={setNumeroCasa}
          />
        </ScrollView>
      );
    }
    if (activeStep === STEP_TERMS) {
      return renderTerms();
    }
    return (
      <ScrollView
        style={styles.stepPayScrollView}
        contentContainerStyle={styles.stepPayFlowContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepPaySectionDividerWrap}>
          <Divider style={[styles.stepPaySectionDivider, { backgroundColor: wizardPalette.sectionPillBorder }]} />
          <View
            style={[
              styles.stepPaySectionPill,
              {
                backgroundColor: wizardPalette.sectionPillBackground,
                borderColor: wizardPalette.sectionPillBorder,
              },
            ]}
          >
            <Text style={[styles.stepPaySectionPillText, { color: wizardPalette.accentStrong }]}>
              Productos comprados
            </Text>
          </View>
        </View>

        <View style={styles.listWrapper}>
          <ListaPedidosRemesa items={pedidosRemesa} useScroll={false} />
        </View>

        <View style={styles.stepPaySectionDividerWrap}>
          <Divider style={[styles.stepPaySectionDivider, { backgroundColor: wizardPalette.sectionPillBorder }]} />
          <View
            style={[
              styles.stepPaySectionPill,
              {
                backgroundColor: wizardPalette.sectionPillBackground,
                borderColor: wizardPalette.sectionPillBorder,
              },
            ]}
          >
            <Text style={[styles.stepPaySectionPillText, { color: wizardPalette.accentStrong }]}>
              Resumen de costos y pago
            </Text>
          </View>
        </View>

        {renderComisionesCard()}
        {renderTotalCard()}
        {renderManualPaymentInfoCard()}
        {preparingCheckout ? (
          <View style={styles.procesandoContainer}>
            <ActivityIndicator color="#6200ee" size="large" />
              <Text style={[styles.procesandoTexto, { color: wizardPalette.accentStrong }]}> 
              Preparando la pasarela de pago...
            </Text>
            <Text style={[styles.procesandoSubtexto, { color: wizardPalette.mutedText }]}> 
              Por favor, no cierre esta ventana
            </Text>
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <>
      <View style={{ position: "relative" }}>
        <IconButton
          icon="cart"
          iconColor="white"
          onPress={() => setVisible(true)}
          size={24}
        />
        {pedidosRemesa != null ? (
          <Badge style={styles.badge}>{pedidosRemesa.length}</Badge>
        ) : null}
      </View>
      <Portal>
        {visible && pedidosRemesa ? (
          <Modal
            visible={visible}
            onDismiss={hideModal}
            style={styles.modalWrapper}
            contentContainerStyle={styles.containerStyle}
            theme={{ colors: { primary: "green" } }}
          >
            <BlurView
              intensity={56}
              tint={isDarkMode ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
              renderToHardwareTextureAndroid={true}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: wizardPalette.modalOverlay,
                },
              ]}
            />
            <View style={styles.modalRoot}>
              <View style={styles.dialogTitleContainer}>
                <Text style={[styles.dialogTitleText, { color: wizardPalette.surfaceText }]}>Carrito de compras:</Text>
                <IconButton
                  icon="close"
                  onPress={hideModal}
                  iconColor={wizardPalette.surfaceText}
                />
              </View>
              <Divider style={{ marginBottom: 12, backgroundColor: wizardPalette.divider }} />
              {renderStepper()}
              <View style={styles.contentPane}>{renderContent()}</View>
              <View style={styles.footerBar}>
                <Button
                  buttonColor="#4a4a4a"
                  mode="contained"
                  onPress={previousStep}
                  disabled={activeStep === STEP_SUMMARY}
                >
                  Atras
                </Button>
                {activeStep < STEP_PAY ? (
                  <Button
                    mode="contained"
                    onPress={nextStep}
                    disabled={cargandoCarrito || pedidosRemesa.length === 0}
                  >
                    {activeStep === STEP_TERMS ? "Aceptar" : "Siguiente"}
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={
                      metodoPago === "efectivo"
                        ? handleGenerarVenta
                        : handlePagar
                    }
                    disabled={finishDisabled}
                  >
                    {processing
                      ? "Procesando..."
                      : metodoPago === "efectivo"
                        ? "Generar Venta"
                        : "Pagar"}
                  </Button>
                )}
              </View>
            </View>
          </Modal>
        ) : null}
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  advertenciaFinal: {
    alignItems: "flex-start",
    backgroundColor: "#FFF3CD",
    borderColor: "#FF6F00",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: "#0f172a",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  advertenciaCopy: {
    flex: 1,
    gap: 3,
  },
  advertenciaIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  advertenciaTitle: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  advertenciaTexto: {
    color: "#6200ee",
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
  },
  badge: {
    position: "absolute",
    right: 4,
    top: 4,
  },
  containerStyle: {
    flex: 1,
    height: "100%",
    margin: 0,
    padding: 0,
  },
  contentPane: {
    flex: 1,
    paddingBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  countryLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 6,
    marginLeft: 18,
  },
  countryValue: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginLeft: 18,
    marginTop: 4,
  },
  dialogTitleContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingLeft: 10,
  },
  dialogTitleText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dropdown: {
    backgroundColor: "#ccc",
    borderRadius: 20,
    borderWidth: 1,
    height: 50,
    margin: 16,
    padding: 10,
  },
  footerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  iconStyle: {
    height: 20,
    width: 20,
  },
  inputSearchStyle: {
    fontSize: 16,
    height: 40,
  },
  cartLoadingState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  cartLoadingText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  cartLoadingTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 14,
    textAlign: "center",
  },
  listWrapper: {
    marginTop: 12,
    overflow: "visible",
    position: "relative",
  },
  loadingCountries: {
    alignItems: "center",
    padding: 20,
  },
  loadingCountriesText: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  manualPaymentEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  manualPaymentHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  manualPaymentHeaderIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  manualPaymentHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  manualPaymentInfoCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  manualPaymentInfoContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  manualPaymentIntro: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  manualPaymentStepCopy: {
    flex: 1,
    paddingBottom: 12,
  },
  manualPaymentStepIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  manualPaymentStepLine: {
    flex: 1,
    marginVertical: 4,
    width: 2,
  },
  manualPaymentStepRail: {
    alignItems: "center",
    marginRight: 10,
  },
  manualPaymentStepRow: {
    flexDirection: "row",
    minHeight: 58,
  },
  manualPaymentStepText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  manualPaymentStepTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  manualPaymentSteps: {
    marginTop: 14,
  },
  manualPaymentTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  locationStepContentContainer: {
    paddingBottom: 32,
  },
  locationStepScrollView: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    zIndex: 999,
    marginTop: 56,
    marginBottom: 30,
  },
  modalWrapper: {
    justifyContent: "flex-start",
    marginBottom: 0,
    marginTop: 0,
  },
  noMargin: {
    margin: 0,
  },
  paymentNoticeCard: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#0f172a",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  paymentNoticeCopy: {
    flex: 1,
    gap: 4,
  },
  paymentNoticeIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  paymentNoticeText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  paymentNoticeTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
  },
  placeholderCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    paddingTop: 40,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  placeholderText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  comisionChip: {
    height: 32,
    paddingHorizontal: 8,
  },
  comisionDescripcion: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
  comisionItem: {
    paddingVertical: 6,
  },
  comisionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  comisionLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginRight: 8,
  },
  comisionRowHorizontal: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comisionesCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  comisionesContainer: {
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  comisionesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comisionesError: {
    alignItems: "center",
    paddingVertical: 16,
  },
  comisionesErrorText: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  comisionesLoading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
  },
  comisionesLoadingText: {
    color: "#666",
    fontSize: 13,
    marginLeft: 8,
  },
  comisionesResumenChipText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  comisionesResumenHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  comisionesResumenHint: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
  comisionesResumenInfo: {
    flex: 1,
    paddingRight: 8,
  },
  comisionesResumenLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  comisionesSinDatos: {
    alignItems: "center",
    paddingVertical: 20,
  },
  comisionesSinDatosText: {
    color: "#999",
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  comisionesToggleButton: {
    alignSelf: "flex-start",
    marginLeft: -4,
    marginTop: 6,
  },
  comisionesToggleContent: {
    justifyContent: "flex-start",
  },
  comisionesToggleLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  procesandoContainer: {
    alignItems: "center",
    backgroundColor: "rgba(98, 0, 238, 0.1)",
    borderColor: "#6200ee",
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
  },
  procesandoSubtexto: {
    color: "#666",
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "bold",
    marginTop: 4,
  },
  procesandoTexto: {
    color: "#6200ee",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  seccionTermino: {
    borderLeftColor: "#6200ee",
    borderLeftWidth: 3,
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  seccionComisiones: {
    marginTop: 4,
  },
  seccionDivider: {
    backgroundColor: "#BDBDBD",
    height: 2,
    marginVertical: 12,
  },
  seccionEnvio: {
    marginBottom: 4,
  },
  seccionHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 4,
  },
  seccionTitulo: {
    flex: 1,
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  sinMetodoContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  sinMetodoTexto: {
    color: "#666",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  stepPayFlowContainer: {
    flexGrow: 1,
    paddingBottom: 24,
    position: "relative",
  },
  stepPaySectionDivider: {
    backgroundColor: "rgba(98, 0, 238, 0.18)",
    height: 1,
  },
  stepPaySectionDividerWrap: {
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 28,
    position: "relative",
  },
  stepPaySectionPill: {
    alignSelf: "center",
    backgroundColor: "#f4ecff",
    borderColor: "rgba(98, 0, 238, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    position: "absolute",
  },
  stepPaySectionPillText: {
    color: "#6200ee",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  stepPayScrollView: {
    flex: 1,
  },
  stepCheck: {
    margin: 0,
  },
  stepCircle: {
    alignItems: "center",
    backgroundColor: "#f1f8ff",
    borderColor: "#6200ee",
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepCircleActive: {
    backgroundColor: "#6200ee",
  },
  stepConnector: {
    backgroundColor: "#e0e0e0",
    height: 2,
    left: "50%",
    marginLeft: 20,
    position: "absolute",
    right: "-50%",
    top: 13,
  },
  stepConnectorCompleted: {
    backgroundColor: "#6200ee",
  },
  stepLabel: {
    // color: "#666",
    fontSize: 10,
    marginTop: 6,
    paddingHorizontal: 2,
    textAlign: "center",
    width: "100%",
  },
  stepLabelActive: {
    color: "#6200ee",
    fontWeight: "bold",
  },
  stepLabelCompleted: {
    // color: "#333",
  },
  stepNumber: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepNumberActive: {
    color: "#f1f8ff",
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  stepperRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  terminosContainer: {
    maxHeight: "100%",
    padding: 20,
  },
  terminosSubtitulo: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  terminosTexto: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "justify",
  },
  terminosTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtotalEnvio: {
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    marginTop: 6,
    padding: 8,
  },
  subtotalLabel: {
    color: "#1976D2",
    fontSize: 13,
    fontWeight: "700",
  },
  tiendaDetalle: {
    color: "#666",
    fontSize: 11,
    marginTop: 1,
  },
  tiendaHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  tiendaInfo: {
    flex: 1,
    marginLeft: 2,
  },
  tiendaItem: {
    marginBottom: 4,
    paddingVertical: 4,
  },
  tiendaNombre: {
    fontSize: 13,
    fontWeight: "600",
  },
  totalCard: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  totalCardContent: {
    paddingVertical: 12,
  },
  totalDivider: {
    backgroundColor: "#9E9E9E",
    height: 2,
    marginVertical: 10,
  },
  totalFinalChip: {
    alignSelf: "flex-end",
    backgroundColor: "#6200ee",
    height: 38,
  },
  totalFinalContainer: {
    backgroundColor: "#6200ee15",
    borderRadius: 8,
    marginVertical: 4,
    padding: 10,
  },
  totalFinalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
  },
  totalFootnote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 10,
    opacity: 0.7,
  },
  totalLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
    paddingRight: 10,
  },
  totalPill: {
    backgroundColor: "#6200ee",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  totalPillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalRowCenter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
  },
  totalTotalLabel: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  totalHintText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    opacity: 0.75,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  warningBox: {
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    margin: 16,
    padding: 16,
  },
  warningText: {
    color: "#856404",
    fontSize: 14,
  },
});

export default WizardConStepper;
