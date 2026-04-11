import MeteorBase from "@meteorrn/core";
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

const WizardConStepper = ({ initialLocation = null }) => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const userId = Meteor.userId();

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
  const [metodoPago, setMetodoPago] = useState(null);
  const [paisPago, setPaisPago] = useState(null);
  const [paisesPagoData, setPaisesPagoData] = useState([]);
  const [preparingCheckout, setPreparingCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seEstaPagando, setSeEstaPagando] = useState(false);
  const [subtotalProductosConvertido, setSubtotalProductosConvertido] =
    useState(0);
  const [totalAPagar, setTotalAPagar] = useState(0);
  const [visible, setVisible] = useState(false);

  const { compra } = Meteor.useTracker(() => {
    Meteor.subscribe("ordenes", {
      status: { $nin: ["COMPLETED", "CANCELLED"] },
      userId,
    });
    return {
      compra: OrdenesCollection.findOne({
        status: { $nin: ["COMPLETED", "CANCELLED"] },
        userId,
      }),
    };
  }, [userId]);

  const pedidosRemesa = Meteor.useTracker(() => {
    Meteor.subscribe("carrito", { idUser: userId });
    return CarritoCollection.find({ idUser: userId }).fetch();
  }, [userId]);

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
    if (!tieneProxyVPN) {
      baseOptions.push({ label: "Paypal", value: "paypal" });
      baseOptions.push({ label: "MercadoPago", value: "mercadopago" });
    }
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
        return tieneProxyVPN ? "CUP" : paisPago || "CUP";
    }
  }, [metodoPago, paisPago, tieneProxyVPN]);

  const checkoutUrl = useMemo(() => {
    const candidates = [
      compra?.link,
      compra?.linkPago,
      compra?.approvalUrl,
      compra?.init_point,
      compra?.url,
    ];
    const url = candidates.find(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
    return url ? url.trim() : null;
  }, [
    compra?.approvalUrl,
    compra?.init_point,
    compra?.link,
    compra?.linkPago,
    compra?.url,
  ]);

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
      setPreparingCheckout(false);
      setProcessing(false);
      setSeEstaPagando(false);
    }
  }, [visible]);

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
  ]);

  useEffect(() => {
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
  }, [comercioCoordsSignature, monedaFinalUI, pedidosRemesa, tieneComercio]);

  useEffect(() => {
    if (!metodoPago) {
      setPaisesPagoData([]);
      setPaisPago(null);
      return;
    }

    const requiere =
      metodoPago === "efectivo" || metodoPago === "transferencia";
    if (!requiere || tieneProxyVPN) {
      setPaisesPagoData([]);
      if (tieneProxyVPN) setPaisPago("CUP");
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
  }, [metodoPago, tieneProxyVPN]);

  useEffect(() => {
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
  }, [comisionesComercio, metodoPago, monedaFinalUI, pedidosRemesa]);

  useEffect(() => {
    if (activeStep !== STEP_PAY || !metodoPago) return;

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

      Meteor.call(
        "efectivo.createOrder",
        userId,
        pedidosRemesa,
        comisionesComercio,
        finishPreparing,
      );
    });
  }, [
    activeStep,
    comisionesComercio,
    metodoPago,
    pedidosRemesa,
    totalAPagar,
    userId,
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
      if (tieneComercio && !location) {
        Alert.alert(
          "Ubicación requerida",
          "Selecciona tu ubicación para continuar.",
        );
        return;
      }

      if (tieneComercio) {
        Meteor.call(
          "carrito.actualizarUbicacion",
          userId,
          location,
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
      const supported = await Linking.canOpenURL(checkoutUrl);
      if (!supported) {
        Alert.alert(
          "Pago no disponible",
          "El dispositivo no puede abrir el enlace de pago.",
        );
        return;
      }

      await Linking.openURL(checkoutUrl);
    } finally {
      setTimeout(() => {
        setProcessing(false);
        setSeEstaPagando(false);
      }, 5000);
    }
  };

  const handleGenerarVenta = () => {
    if (processing) return;

    if (!compra) {
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
    bloquearPagoPorComisiones ||
    !cargadoPago ||
    (metodoPago !== "efectivo" && !checkoutUrl) ||
    (metodoPago === "efectivo" && totalAPagar <= 0);

  const renderPaymentWarnings = () => {
    if (!tieneComercio) return null;

    if (cargandoComisiones) {
      return (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Calculando costos de entrega para los productos de comercio...
          </Text>
        </View>
      );
    }

    if (errorComisiones) {
      return (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{errorComisiones}</Text>
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
                (isActive || isCompleted) && styles.stepCircleActive,
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
                    (isActive || isCompleted) && styles.stepNumberActive,
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
                  isCompleted && styles.stepConnectorCompleted,
                ]}
              />
            ) : null}
            <Text
              style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isCompleted && styles.stepLabelCompleted,
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
          <IconButton icon="information-outline" size={48} />
          <Text style={styles.sinMetodoTexto}>
            Seleccione un método de pago en el paso anterior para visualizar los
            términos y condiciones aplicables.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.terminosContainer}>
        <Text style={styles.terminosTitulo}>{terminos.titulo}</Text>
        <Divider style={{ marginVertical: 12 }} />
        {terminos.contenido.map((seccion, index) => (
          <View
            key={`${seccion.subtitulo}-${index}`}
            style={styles.seccionTermino}
          >
            <Text style={styles.terminosSubtitulo}>{seccion.subtitulo}</Text>
            <Text style={styles.terminosTexto}>{seccion.texto}</Text>
          </View>
        ))}
        <View style={styles.advertenciaFinal}>
          <IconButton icon="alert-circle" iconColor="#FF6F00" size={20} />
          <Text style={styles.advertenciaTexto}>
            Al presionar Aceptar, confirma que ha leído y acepta todos los
            términos y condiciones descritos.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderComisionesCard = () => {
    if (!tieneComercio) return null;

    return (
      <View style={styles.comisionesContainer}>
        <Card style={styles.comisionesCard} elevation={2}>
          <Card.Content style={styles.comisionesContent}>
            {cargandoComisiones ? (
              <View style={styles.comisionesLoading}>
                <ActivityIndicator color="#6200ee" size="small" />
                <Text style={styles.comisionesLoadingText}>Calculando...</Text>
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
                    <Text style={styles.comisionesResumenLabel}>
                      Total de comisiones
                    </Text>
                    <Text style={styles.comisionesResumenHint}>
                      Incluye envío y cargos adicionales
                    </Text>
                  </View>
                  <Chip
                    mode="flat"
                    style={styles.totalFinalChip}
                    textStyle={styles.comisionesResumenChipText}
                  >
                    {comisionesComercio.totalFinal} {comisionesComercio.moneda}
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
                                  <Text style={styles.tiendaNombre}>
                                    {tienda.nombreTienda}
                                  </Text>
                                  <Text style={styles.tiendaDetalle}>
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

                      <View style={[styles.comisionItem, styles.subtotalEnvio]}>
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
                              <Text style={styles.comisionDescripcion}>
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
                                    <Text style={styles.comisionLabel}>
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
                <Text style={styles.comisionesSinDatosText}>
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
    <Card style={styles.totalCard} elevation={3}>
      <Card.Title
        title="Resumen de pago"
        subtitle={`Método: ${metodoPago || "N/D"} • Moneda: ${monedaFinalUI}`}
        left={(props) => (
          <IconButton
            {...props}
            icon="cash-multiple"
            size={20}
            style={styles.noMargin}
          />
        )}
      />
      <Divider />
      <Card.Content style={styles.totalCardContent}>
        {cargandoComisiones || cargandoConversionResumen ? (
          <View style={styles.totalRowCenter}>
            <ActivityIndicator color="#6200ee" size="small" />
            <Text style={styles.totalHintText}>Calculando total...</Text>
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
              <Text style={styles.totalLabel}>Subtotal (productos)</Text>
              <Text style={styles.totalValue}>
                {Number(subtotalProductosConvertido || 0).toFixed(2)}{" "}
                {monedaFinalUI}
              </Text>
            </View>

            {tieneComercio ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Comisiones (envío + adicionales)
                </Text>
                <Text style={styles.totalValue}>
                  {Number(comisionesConvertidas || 0).toFixed(2)}{" "}
                  {monedaFinalUI}
                </Text>
              </View>
            ) : null}

            {metodoPago === "paypal" || metodoPago === "mercadopago" ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Comisión {metodoPago === "paypal" ? "PayPal" : "MercadoPago"}
                </Text>
                <Text style={styles.totalValue}>
                  {Math.max(
                    0,
                    Number(totalAPagar || 0) -
                      Number(totalResumenConvertido || 0),
                  ).toFixed(2)}{" "}
                  {monedaFinalUI}
                </Text>
              </View>
            ) : null}

            <Divider style={styles.totalDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalTotalLabel}>TOTAL A PAGAR</Text>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillText}>
                  {Number(totalAPagar || 0).toFixed(2)} {monedaFinalUI}
                </Text>
              </View>
            </View>

            {metodoPago === "efectivo" || metodoPago === "transferencia" ? (
              <Text style={styles.totalFootnote}>
                Importante: asegúrate de enviar el monto exacto. Si tu banco
                aplica comisiones externas, la diferencia deberá cubrirse.
              </Text>
            ) : null}
          </>
        )}
      </Card.Content>
    </Card>
  );

  const renderContent = () => {
    if (activeStep === STEP_SUMMARY) {
      return <ListaPedidosRemesa eliminar items={pedidosRemesa} />;
    }
    if (activeStep === STEP_PAYMENT) {
      return (
        <View>
          <Text style={styles.sectionTitle}>Seleccione el Metodo de Pago</Text>
          {tieneProxyVPN ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ℹ️ Los paquetes Proxy/VPN requieren pago por Efectivo o
                Transferencia. Deberás subir un comprobante de pago para su
                aprobación.
              </Text>
            </View>
          ) : null}
          {renderPaymentWarnings()}
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
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
          {!tieneProxyVPN && metodoPago === "efectivo" ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.countryLabel}>
                País donde realizará el pago
              </Text>
              {cargandoPaises ? (
                <View style={styles.loadingCountries}>
                  <ActivityIndicator color="#6200ee" size="small" />
                  <Text style={styles.loadingCountriesText}>
                    Cargando países disponibles...
                  </Text>
                </View>
              ) : (
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  iconStyle={styles.iconStyle}
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
              <Text style={styles.countryValue}>
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
            <Text style={styles.placeholderText}>
              Este paso no es necesario para tu pedido
            </Text>
          </View>
        );
      }
      return (
        <View style={{ paddingBottom: 80 }}>
          <Text style={styles.locationTitle}>
            Selecciona dónde recibirás tu pedido
          </Text>
          <MapLocationPicker
            currentLocation={location}
            onLocationSelect={setLocation}
          />
        </View>
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
          <Divider style={styles.stepPaySectionDivider} />
          <View style={styles.stepPaySectionPill}>
            <Text style={styles.stepPaySectionPillText}>
              Productos comprados
            </Text>
          </View>
        </View>

        <View style={styles.listWrapper}>
          <ListaPedidosRemesa items={pedidosRemesa} useScroll={false} />
        </View>

        <View style={styles.stepPaySectionDividerWrap}>
          <Divider style={styles.stepPaySectionDivider} />
          <View style={styles.stepPaySectionPill}>
            <Text style={styles.stepPaySectionPillText}>
              Resumen de costos y pago
            </Text>
          </View>
        </View>

        {renderComisionesCard()}
        {renderTotalCard()}
        {preparingCheckout ? (
          <View style={styles.procesandoContainer}>
            <ActivityIndicator color="#6200ee" size="large" />
            <Text style={styles.procesandoTexto}>
              Preparando la pasarela de pago...
            </Text>
            <Text style={styles.procesandoSubtexto}>
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
              intensity={24}
              tint={isDarkMode ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
              renderToHardwareTextureAndroid={true}
            />
            <View style={styles.modalRoot}>
              <View style={styles.dialogTitleContainer}>
                <Text style={styles.dialogTitleText}>Carrito de compras:</Text>
                <IconButton
                  icon="close"
                  onPress={hideModal}
                  iconColor="white"
                />
              </View>
              <Divider style={{ marginBottom: 12 }} />
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
                    disabled={pedidosRemesa.length === 0}
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
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderColor: "#FF6F00",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 16,
    padding: 12,
  },
  advertenciaTexto: {
    color: "#6200ee",
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
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
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 18,
    opacity: 0.85,
  },
  countryValue: {
    fontSize: 12,
    marginLeft: 18,
    marginTop: 4,
    opacity: 0.75,
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
  locationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
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
