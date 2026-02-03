import React, { useEffect, useState } from 'react';
import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { ProgressSteps, ProgressStep } from 'react-native-progress-steps';
import { TextInput, Text, Button, Dialog, Portal, Divider, Chip, IconButton, Modal,useTheme, Badge, ActivityIndicator, Card } from 'react-native-paper';
import ListaPedidos from './ListaPedidosRemesa';
import { BlurView } from '@react-native-community/blur';
import { Dropdown } from 'react-native-element-dropdown';
import { CarritoCollection, OrdenesCollection } from '../collections/collections';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapLocationPicker from './MapLocationPicker';

const WizardConStepper = ({ product, navigation }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [nombre, setNombre] = useState('');
    const [extraFields, setExtraFields] = useState({});
    const [confirmado, setConfirmado] = useState(false);
    const [visible, setVisible] = useState(false);
    const [metodoPago, setMetodoPago] = useState(null);
    const [totalAPagar, setTotalAPagar] = useState(0);
    const userId = Meteor.userId();
    const [cargadoPago, setCargadoPago] = useState(false);
    const [seEstaPagando, setSeEstaPagando] = useState(false); // para que se dehabilita mientras esta pagandose con efectivo
    const [procesandoPago, setProcesandoPago] = useState(false); // ✅ NUEVO: Flag específico para prevenir doble clic
    
    // ✅ NUEVO: País/moneda para pagos en efectivo/transferencia (UX: explícito y extensible)
    const [paisPago, setPaisPago] = useState(null);
    const monedaPago = paisPago || null;

    // ✅ NUEVO: Estado para países dinámicos desde properties
    const [paisesPagoData, setPaisesPagoData] = useState([]);
    const [cargandoPaises, setCargandoPaises] = useState(false);

    // ✅ NUEVO: Estado para ubicación de entrega
    const [ubicacionEntrega, setUbicacionEntrega] = useState(null);

    // ✅ NUEVO: Estado para comisiones de comercio
    const [comisionesComercio, setComisionesComercio] = useState(null);
    const [cargandoComisiones, setCargandoComisiones] = useState(false);
    const [errorComisiones, setErrorComisiones] = useState(null); // ✅ NUEVO: Estado para errores

    // ✅ NUEVO: valores convertidos a la moneda final del pago (para el Card Resumen)
    const [subtotalProductosConvertido, setSubtotalProductosConvertido] = useState(0);
    const [comisionesConvertidas, setComisionesConvertidas] = useState(0);
    const [cargandoConversionResumen, setCargandoConversionResumen] = useState(false);
    const [errorConversionResumen, setErrorConversionResumen] = useState(null);

    const [loadCargaPagar, setLoadCargaPagar] = useState(false);
    //CARRITO
    const { pedidosRemesa,subCarrito } = useTracker(() => {
        const subCarrito = Meteor.subscribe('carrito', { idUser: Meteor.userId()});
        const pedidos = CarritoCollection.find({ idUser: userId }).fetch();
        return { pedidosRemesa: pedidos,subCarrito };
    });

    const calcularComisiones = () =>
      new Promise((resolve, reject) => {
          Meteor.call('comercio.calcularCostosEntrega', pedidosRemesa, monedaFinalUI, (error, costos) => {
              if (error) return reject(error);
              resolve(costos);
          });
      });


  useEffect(() => {
    // ✅ Solo recalcular si hay items COMERCIO en el carrito
    if (!tieneComercio) {
      console.log("[WizardConStepper] No hay items COMERCIO, limpiando comisiones");
      setComisionesComercio(null);
      setErrorComisiones(null);
      return;
    }

    // ✅ Validar que todos los items COMERCIO tengan coordenadas
    const todosConCoordenadas = pedidosRemesa
      .filter(item => item.type === 'COMERCIO')
      .every(item => item?.coordenadas?.latitude && item?.coordenadas?.longitude);

    if (!todosConCoordenadas) {
      console.log("[WizardConStepper] Algunos items COMERCIO aún no tienen coordenadas, esperando...");
      return;
    }

    console.log("[WizardConStepper] Recalculando comisiones tras actualización de coordenadas en carrito...");
    
    setCargandoComisiones(true);
    setErrorComisiones(null);

    calcularComisiones()
      .then((costos) => {
        console.log("[WizardConStepper] Comisiones calculadas exitosamente:", costos);
        setComisionesComercio(costos);
        setCargandoComisiones(false);
      })
      .catch((error) => {
        console.error("[WizardConStepper] Error al calcular comisiones:", error);
        const msg = error?.reason || error?.message || 'No se pudo calcular los costos de entrega';
        setErrorComisiones(msg);
        setCargandoComisiones(false);
      });
  }, [
    // ✅ CRÍTICO: Reaccionar a cambios en coordenadas de los items del carrito
    JSON.stringify(
      pedidosRemesa
        ?.filter(item => item.type === 'COMERCIO')
        ?.map(item => ({
          _id: item._id,
          coordenadas: item.coordenadas
        }))
    ),
    tieneComercio,
    monedaPago
  ]);

    // ✅ NUEVO: helper para aplicar ubicación a todos los items COMERCIO (idempotente)
    const aplicarUbicacionAlCarritoSiNecesario = React.useCallback(async () => {
        if (!tieneComercio) return true;
        if (!ubicacionEntrega) return false;
       
        // Guardar ubicación en backend (actualiza todos los items COMERCIO)
        const guardarUbicacion = () =>
            new Promise((resolve, reject) => {
                Meteor.call('carrito.actualizarUbicacion', userId, ubicacionEntrega,async (error, res) => {
                    if (error) return reject(error);
                    resolve(res);
                });
            });


        try {
            setCargandoComisiones(true);
            setErrorComisiones(null);

            await guardarUbicacion();
            
            return true;
        } catch (e) {
            const msg = e?.reason || e?.message || 'No se pudo actualizar la ubicación del carrito';
            setErrorComisiones(msg);
            Alert.alert('Error', msg, [{ text: 'OK' }]);
            return false;
        } finally {
            setCargandoComisiones(false);
        }
    }, [
        tieneComercio,
        ubicacionEntrega,
        userId,
        pedidosRemesa,
    ]);

    // ✅ NUEVO: onNext del step Ubicación (garantiza sync si se avanza)
    const handleNextUbicacion = async () => {
        if (!tieneComercio) {
          console.log("[WizardConStepper] No hay items COMERCIO, no se requiere ubicación.");
            setActiveStep(Number(activeStep) + 1);
            return;
        }

        if (!ubicacionEntrega) {
          console.log("[WizardConStepper] Hay items COMERCIO pero no hay ubicaciónEntrega.");
            Alert.alert('Ubicación requerida', 'Selecciona tu ubicación para continuar.', [{ text: 'OK' }]);
            return;
        }

        console.log("[WizardConStepper] Aplicando ubicación al carrito antes de avanzar...");
        const ok = await aplicarUbicacionAlCarritoSiNecesario();
        if (ok) setActiveStep(Number(activeStep) + 1);
    };

    // ✅ NUEVO: Detectar si hay items Proxy/VPN en el carrito
    const tieneProxyVPN = pedidosRemesa?.some(item => 
        item.type === 'PROXY' || item.type === 'VPN'
    );

    // ✅ NUEVO: Detectar si hay items COMERCIO en el carrito
    const tieneComercio = pedidosRemesa?.some(item => item.type === 'COMERCIO');

    // ✅ FIX: mover aquí los cálculos del Card para que "tieneComercio" exista y los números sean consistentes
    const monedaFinalUI = React.useMemo(() => {
        if (metodoPago === 'paypal' || metodoPago === 'mercadopago') return 'USD';
        return monedaPago || paisPago || 'CUP';
    }, [metodoPago, monedaPago, paisPago]);

    // ✅ FIX: calcular comisiones para el card usando el mismo contrato que renderComisionesCard
    const totalComisionesUI = React.useMemo(() => {
        if (!tieneComercio || !comisionesComercio) return 0;

        const envio = Number(comisionesComercio?.costoTotalEntrega) || 0;

        const adicionales = comisionesComercio?.comisiones && typeof comisionesComercio.comisiones === 'object'
        ? Object.values(comisionesComercio.comisiones).reduce((acc, c) => acc + (Number(c?.valor) || 0), 0)
        : 0;

        return envio + adicionales;
    }, [tieneComercio, comisionesComercio]);

    const totalAPagarUI = React.useMemo(() => {
        const amount = Number(totalAPagar) || 0;
        return { amount, currency: monedaFinalUI };
    }, [totalAPagar, monedaFinalUI]);

    // ✅ FIX: subtotal del card solo tiene sentido si hay comisiones calculadas
    const subtotalUI = React.useMemo(() => {
        const total = Number(totalAPagar) || 0;
        const comisiones = Number(totalComisionesUI) || 0;

        if (!tieneComercio || !comisionesComercio) return total;

        return Math.max(0, total - comisiones);
    }, [totalAPagar, totalComisionesUI, tieneComercio, comisionesComercio]);

    // ✅ NUEVO: Calcular subtotal de productos (sin comisiones) y convertirlo a monedaFinalUI
    // ✅ NUEVO: Convertir comisiones a monedaFinalUI si aplica
    useEffect(() => {
        let cancelled = false;

        const hayCarrito = Array.isArray(pedidosRemesa) && pedidosRemesa.length > 0;
        const hayMetodo = !!metodoPago;
        const monedaFinal = monedaFinalUI;

        if (!hayCarrito || !hayMetodo || !monedaFinal) {
            setSubtotalProductosConvertido(0);
            setComisionesConvertidas(0);
            setErrorConversionResumen(null);
            return () => { cancelled = true; };
        }

        setCargandoConversionResumen(true);
        setErrorConversionResumen(null);

        const convertir = (monto, monedaOrigen) =>
            new Promise((resolve, reject) => {
                if (!monto || Number(monto) === 0 || monedaOrigen === monedaFinal) return resolve(Number(monto) || 0);
                Meteor.call('moneda.convertir', Number(monto), monedaOrigen, monedaFinal, (err, res) => {
                    if (err) reject(err);
                    else resolve(Number(res) || 0);
                });
            });

        (async () => {
            try {
                // 1) Subtotal productos: sumar cada item convertido a moneda final
                let subtotal = 0;

                for (const item of pedidosRemesa) {
                    // Para COMERCIO: cobrarUSD representa el precio del item en monedaACobrar
                    const montoItem = Number((item?.cantidad || 1) * Number(item?.cobrarUSD || 0)) || 0;
                    const monedaItem = item?.monedaACobrar || 'CUP';

                    if (montoItem > 0) {
                        subtotal += await convertir(montoItem, monedaItem);
                    }
                }

                // 2) Comisiones: total ya viene como número, con moneda en comisionesComercio.moneda
                //    (si no hay comisiones aún, se mantiene 0)
                const comisionesRaw = Number(totalComisionesUI) || 0;
                const monedaComisiones = comisionesComercio?.moneda || monedaFinal; // defensivo

                const comisiones = await convertir(comisionesRaw, monedaComisiones);

                if (cancelled) return;

                setSubtotalProductosConvertido(subtotal);
                setComisionesConvertidas(comisiones);
                setCargandoConversionResumen(false);
            } catch (e) {
                if (cancelled) return;
                setCargandoConversionResumen(false);
                setErrorConversionResumen(e?.reason || e?.message || 'No se pudo convertir montos a la moneda seleccionada');
            }
        })();

        return () => { cancelled = true; };
    }, [
        metodoPago,
        monedaFinalUI,
        pedidosRemesa,
        totalComisionesUI,
        comisionesComercio?.moneda,
    ]);

    // ✅ NUEVO: total final del card (subtotal productos + comisiones) ya convertido
    const totalResumenConvertido = React.useMemo(() => {
        return (Number(subtotalProductosConvertido) || 0) + (Number(comisionesConvertidas) || 0);
    }, [subtotalProductosConvertido, comisionesConvertidas]);

    // ✅ NUEVO: Cargar países dinámicamente desde properties al montar o cambiar metodoPago
    useEffect(() => {
      console.log('[WizardConStepper][PaisesPago] useEffect start', {
        metodoPago,
        tieneProxyVPN,
      });

      // Solo cargar si requiere selector de país
      const requiere = metodoPago === 'efectivo' || metodoPago === 'transferencia';
      console.log('[WizardConStepper][PaisesPago] requiere selector?', { requiere });

      if (!requiere) {
        console.log('[WizardConStepper][PaisesPago] No requiere selector. Limpio lista y salgo.');
        setPaisesPagoData([]);
        return;
      }

      if (tieneProxyVPN) {
        console.log('[WizardConStepper][PaisesPago] Carrito contiene Proxy/VPN. No se carga selector. Limpio y salgo.');
        setPaisesPagoData([]);
        return;
      }

      console.log('[WizardConStepper][PaisesPago] Iniciando carga de países desde properties...');
      setCargandoPaises(true);

      const startedAt = Date.now();
      const type = 'METODO_PAGO';
      const clave = 'REMESA';

      console.log('[WizardConStepper][PaisesPago] Meteor.call property.getValor', { type, clave });

      Meteor.call('property.getVariasPropertys', type, clave, (err, properties) => {
        const ms = Date.now() - startedAt;
        console.log('[WizardConStepper][PaisesPago] property.getValor callback', {
          tookMs: ms,
          hasError: !!err,
          count: Array.isArray(properties) ? properties.length : null,
        });

        setCargandoPaises(false);

        if (err) {
          console.warn('[WizardConStepper][PaisesPago] Error cargando países desde properties:', err);
          // Fallback a lista hardcoded
          const fallback = [{ label: 'Cuba', value: 'CUP' }];
          console.log('[WizardConStepper][PaisesPago] Usando fallback:', fallback);
          setPaisesPagoData(fallback);
          return;
        }

        if (!Array.isArray(properties) || properties.length === 0) {
          console.warn('[WizardConStepper][PaisesPago] No se encontraron properties para países', { properties });
          const fallback = [{ label: 'Cuba', value: 'CUP' }];
          console.log('[WizardConStepper][PaisesPago] Usando fallback:', fallback);
          setPaisesPagoData(fallback);
          return;
        }

        console.log(
          '[WizardConStepper][PaisesPago] Properties recibidas (raw):',
          properties.map((p) => ({
            _id: p?._id,
            active: p?.active,
            valor: p?.valor,
            clave: p?.clave,
            type: p?.type,
          }))
        );

        // Parsear formato "PAIS-MONEDA" de cada property
        const paisesParseados = properties
          .filter((prop) => {
            const ok = !!(prop?.active && prop?.valor);
            if (!ok) {
              console.log('[WizardConStepper][PaisesPago] Property omitida (inactiva o sin valor):', {
                _id: prop?._id,
                active: prop?.active,
                valor: prop?.valor,
              });
            }
            return ok;
          })
          .map((prop) => {
            const partes = String(prop.valor).split('-'); // Ej: "URUGUAY-UYU" → ["URUGUAY", "UYU"]
            console.log('[WizardConStepper][PaisesPago] Parseando property:', { valor: prop.valor, partes });

            if (partes.length !== 2) {
              console.warn(`[WizardConStepper][PaisesPago] Formato inválido en property: ${prop.valor}`);
              return null;
            }

            const [paisRaw, moneda] = partes.map((s) => String(s).trim());

            if (!paisRaw || !moneda) {
              console.warn('[WizardConStepper][PaisesPago] Formato inválido (pais/moneda vacío):', { valor: prop.valor });
              return null;
            }

            const paisCapitalizado =
              paisRaw.length > 0 ? paisRaw.charAt(0).toUpperCase() + paisRaw.slice(1).toLowerCase() : paisRaw;

            const parsed = {
              label: paisCapitalizado,
              value: moneda.toUpperCase(), // Asegurar mayúsculas (UYU, CUP)
              raw: prop.valor, // Mantener valor original por si se necesita
            };

            console.log('[WizardConStepper][PaisesPago] Parsed:', parsed);
            return parsed;
          })
          .filter(Boolean); // Eliminar nulls de formatos inválidos

        console.log('[WizardConStepper][PaisesPago] paisesParseados result:', paisesParseados);

        if (paisesParseados.length === 0) {
          console.warn('[WizardConStepper][PaisesPago] No se pudieron parsear países');
          const fallback = [{ label: 'Cuba', value: 'CUP' }];
          console.log('[WizardConStepper][PaisesPago] Usando fallback:', fallback);
          setPaisesPagoData(fallback);
          return;
        }

        console.log('[WizardConStepper][PaisesPago] ✅ Países cargados OK:', paisesParseados);
        setPaisesPagoData(paisesParseados);
      });
    }, [metodoPago, tieneProxyVPN]);

    // ✅ NUEVO: Validación sencilla para habilitar el "Siguiente" del paso de pago
    const requierePaisPago = metodoPago === 'efectivo' || metodoPago === 'transferencia';
    const metodoPagoValido = !!metodoPago;

    // ✅ Ajuste: si tieneProxyVPN, el país/moneda es fijo (CUP) y no se solicita
    const paisPagoValido = !requierePaisPago || tieneProxyVPN || !!paisPago;

    const puedeAvanzarMetodoPago = metodoPagoValido && paisPagoValido;

    const theme = useTheme();
    const isDarkMode = theme.dark;

    const showModal = () => setVisible(true);
    const hideModal = () => setVisible(false);

  //ORDENES
  const { readyCompra, compra } = useTracker(() => {
    const readyCompra = Meteor.subscribe('ordenes', {
      userId,
      status: { $nin: ['COMPLETED', 'CANCELLED'] }
    });

    const compra = OrdenesCollection.findOne({
        userId,
      // type: 'PAYPAL',
      status: { $nin: ['COMPLETED', 'CANCELLED'] }
    });

    return { readyCompra, compra };
  });

  // ✅ NUEVO: Validación de ubicación para items COMERCIO
  const ubicacionValida = !tieneComercio || !!ubicacionEntrega;

  // ✅ ADAPTACIÓN: Filtrar métodos de pago según contenido del carrito
  const data = React.useMemo(() => {
    const baseOptions = [];

    // Si NO tiene Proxy/VPN, mostrar PayPal y MercadoPago
    if (!tieneProxyVPN) {
      baseOptions.push(
        { label: 'Paypal', value: 'paypal' },
        { label: 'MercadoPago', value: 'mercadopago' }
      );
    }

    // Siempre mostrar Efectivo si el usuario tiene permiso
    if (Meteor.user()?.permitirPagoEfectivoCUP || tieneProxyVPN) {
      baseOptions.push({ label: 'Efectivo O Transferencia', value: 'efectivo' });
    }

    return baseOptions;
  }, [tieneProxyVPN, Meteor.user()?.permitirPagoEfectivoCUP]);

    // ✅ NUEVO: Términos y Condiciones específicos por método de pago
    const terminosYCondiciones = {
      paypal: {
        titulo: "Términos y Condiciones - Pago con PayPal",
        contenido: [
          {
            subtitulo: "1. Comisiones y Tarifas",
            texto: "Al seleccionar PayPal como método de pago, el usuario acepta que este servicio aplica una comisión adicional del 5-7% (variable según país y tipo de cuenta PayPal), la cual deberá ser asumida íntegramente por el usuario. El total a pagar mostrado en pantalla ya incluye esta comisión."
          },
          {
            subtitulo: "2. Proceso de Pago",
            texto: "Al confirmar la compra, será redirigido a la pasarela de pago segura de PayPal. VidKar NO almacena datos de tarjetas ni credenciales bancarias. El procesamiento es gestionado 100% por PayPal, cumpliendo estándares internacionales de seguridad PCI-DSS."
          },
          {
            subtitulo: "3. Confirmación de Pago",
            texto: "Tras completar el pago, recibirá un comprobante por email de PayPal. Las recargas se procesan en un máximo de 2 horas hábiles. Los servicios digitales (Proxy/VPN) se activan automáticamente en 24 horas."
          },
          {
            subtitulo: "4. Política de No Reembolso",
            texto: "VidKar NO ofrece reembolsos una vez procesado el pago. Si requiere correcciones (número incorrecto, operadora equivocada), debe contactarnos ANTES de confirmar la compra. Los pagos son irreversibles según políticas de PayPal. IMPORTANTE: Usted es responsable de verificar que el número de teléfono a recargar esté escrito correctamente (incluyendo el código de país si aplica), pertenezca a la operadora seleccionada y esté activo. Cualquier error de digitación, número inexistente, desactivado, formateado incorrectamente o perteneciente a otra operadora implicará pérdida total del monto sin posibilidad de devolución ni reclamo."
          },
          {
            subtitulo: "5. Tiempos de Entrega",
            texto: "Recargas Cuba: máximo 48 horas hábiles. Servicios digitales: activación inmediata tras confirmación. Remesas: sujeto a disponibilidad del beneficiario (1-3 días hábiles)."
          }
        ]
      },
      mercadopago: {
        titulo: "Términos y Condiciones - Pago con MercadoPago",
        contenido: [
          {
            subtitulo: "1. Comisiones y Tarifas",
            texto: "MercadoPago aplica una tarifa de procesamiento del 4-10% (variable según país y método de pago), asumida por el usuario. Los costos de procesamiento bancario internacional están incluidos en el total mostrado."
          },
          {
            subtitulo: "2. Medios de Pago Aceptados",
            texto: "Se aceptan tarjetas de crédito/débito Visa, Mastercard, American Express, y saldo en cuenta MercadoPago. Disponibilidad sujeta a su país de residencia (Uruguay, Argentina, Brasil, México, Chile, Colombia, Perú)."
          },
          {
            subtitulo: "3. Seguridad de la Transacción",
            texto: "MercadoPago cumple con el protocolo PCI-DSS Level 1 (máximo nivel de seguridad). VidKar NO tiene acceso a datos de tarjetas. Toda la información bancaria es procesada directamente por MercadoPago."
          },
          {
            subtitulo: "4. Confirmación y Procesamiento",
            texto: "El pago se confirma en 1-5 minutos. Si la transacción es rechazada, puede reintentar con otro método de pago sin penalizaciones. Recibirá notificación por email y SMS (si configuró su cuenta MercadoPago)."
          },
          {
            subtitulo: "5. Política de No Reembolso",
            texto: "No se realizan reembolsos una vez confirmado el pago. En caso de errores en los datos, contacte soporte ANTES de confirmar. VidKar ofrece soporte 24/7 para resolver inconvenientes técnicos. IMPORTANTE: Debe verificar cuidadosamente el número de teléfono a recargar (formato correcto, operadora válida, línea activa). Si ingresa un número erróneo, inexistente, desactivado, de otra operadora o con dígitos mal escritos, la recarga aplicada a un tercero o fallida será considerada consumida y no habrá devolución ni crédito."
          },
          {
            subtitulo: "6. Entrega del Servicio",
            texto: "Servicios digitales: activación inmediata. Recargas: procesadas en 48 horas hábiles máximo. Remesas: entrega sujeta a disponibilidad del beneficiario (horario bancario en Cuba/Uruguay)."
          }
        ]
      },
      efectivo: {
        titulo: "Términos y Condiciones - Pago en Efectivo o Transferencia",
        contenido: [
          {
            subtitulo: "1. Métodos de Pago Aceptados",
            texto: "Aceptamos efectivo en Cuba (mediante agentes autorizados) y transferencias bancarias internacionales desde Uruguay, Argentina y próximamente otros países de América Latina."
          },
          {
            subtitulo: "2. Proceso de Pago en Efectivo (Cuba)",
            texto: "Deberá coordinar la entrega del efectivo con nuestro agentes. El agente entregará comprobante físico firmado. La activación del servicio se realiza en 24 horas tras confirmar recepción del pago."
          },
          {
            subtitulo: "3. Proceso de Transferencia Bancaria",
            texto: "Recibirá los datos bancarios por email o WhatsApp. Debe realizar la transferencia desde su banco y enviarnos el comprobante. La verificación toma 1-3 días hábiles según país de origen."
          },
          {
            subtitulo: "4. Comprobante de Pago Obligatorio",
            texto: "Es OBLIGATORIO subir una foto o captura del comprobante de pago. Debe ser legible, mostrar fecha, monto y número de referencia. Sin comprobante NO se procesará la orden."
          },
          {
            subtitulo: "5. Verificación y Aprobación",
            texto: "Nuestro equipo validará el comprobante en 2-24 horas (horario laboral). Si detectamos discrepancias, nos comunicaremos por email/WhatsApp. NO active servicios hasta recibir confirmación nuestra."
          },
          {
            subtitulo: "6. Política de No Reembolso",
            texto: "Los pagos en efectivo y transferencias NO son reversibles. Asegúrese de verificar datos (números, cantidades) ANTES de pagar. VidKar no se responsabiliza por errores del usuario en datos bancarios."
          },
          {
            subtitulo: "7. Tiempos de Entrega",
            texto: "Recargas: 24-48 horas tras aprobación del comprobante. Servicios Proxy/VPN: 2-6 horas. Remesas: 1-3 días hábiles según disponibilidad del beneficiario."
          },
          {
            subtitulo: "8. Cobertura Internacional",
            texto: "Actualmente operamos en Cuba (efectivo) y Uruguay (transferencia). Próximamente expandiremos a Argentina, México, Chile y otros países de América Latina."
          },
          {
            subtitulo: "9. Comisiones Bancarias",
            texto: "Las comisiones de transferencia internacional son responsabilidad del usuario. Asegúrese de enviar el monto COMPLETO mostrado en pantalla. Si su banco deduce comisiones, la diferencia deberá ser enviada aparte."
          },
          {
            subtitulo: "10. Soporte y Reclamaciones",
            texto: "Para reclamos, tiene 48 horas desde la activación del servicio. Debe presentar comprobante de pago original. Contacto: soporte@vidkar.com o WhatsApp +5355267327 (horario 9am-9pm GMT-5)."
          }
        ]
      }
    };

    // ✅ Helper para obtener términos según método de pago
    const getTerminos = () => {
      if (!metodoPago) return null;
      return terminosYCondiciones[metodoPago] || null;
    };

    useEffect(() => {
        console.log("Active Step:", activeStep);
        //si finaliza el paso 3, se procede a generar el pago para pagar
        if (activeStep === 3) {
        
        }
    },[activeStep]);

    useEffect(() => {
        return () => {
          subCarrito && subCarrito.ready() && subCarrito.stop()
          readyCompra && readyCompra.ready() && readyCompra.stop()
        };
      }, []);

      // ✅ NUEVO: Reset del stepper si el carrito queda vacío
      useEffect(() => {
        if ((!pedidosRemesa || pedidosRemesa.length === 0) && activeStep !== 0) {
          console.log('⚠️ [WizardConStepper] Carrito vacío detectado. Retrocediendo al paso 0.');
          setActiveStep(0);
          // Mantener reset defensivo de estados de pago para evitar UI inconsistente
          // Mantener reset defensivo de estados de pago para evitar UI inconsistente
          setMetodoPago(null);
          setPaisPago(null);
          setUbicacionEntrega(null);
        }
      }, [pedidosRemesa, activeStep]);

      useEffect(() => {
          console.log(`Método de pago seleccionado: ${metodoPago}`);
        if (!metodoPago) return;

        if (tieneProxyVPN && (metodoPago === 'efectivo' || metodoPago === 'transferencia')) {
          Meteor.call("efectivo.totalAPagar", pedidosRemesa,monedaPago,comisionesComercio, (err, res) => {
            if (err) {
              console.error('Error al calcular total a pagar:', err);
            } else {
              console.log("[WizardConStepper] Total a pagar calculado para Proxy/VPN con Efectivo:", res);
              setTotalAPagar(res);
              setCargadoPago(true);
            }
          });
          return;
        }

        if (metodoPago == 'paypal') {
          
         Meteor.call("paypal.totalAPagar", pedidosRemesa,comisionesComercio,(err, res) => {
            if (err) {
              console.error('Error al calcular total a pagar:', err);
            } else {
              console.log("[WizardConStepper] Total a pagar calculado para PayPal:", res);
              setTotalAPagar(res);
              setCargadoPago(true);
            }
          });
        }else if (metodoPago == 'mercadopago') {
          Meteor.call("mercadopago.totalAPagar", pedidosRemesa,comisionesComercio,(err, res) => {
            if (err) {
              console.error('Error al calcular total a pagar:', err);
            } else {
              console.log("[WizardConStepper] Total a pagar calculado para MercadoPago:", res);
              setTotalAPagar(res);
              setCargadoPago(true);
            }
          });
        }else if (metodoPago == 'efectivo') {
          console.log("Calculando total a pagar para Efectivo...", monedaFinalUI);
          Meteor.call("efectivo.totalAPagar", pedidosRemesa,monedaFinalUI,comisionesComercio,(err, res) => {
            if (err) {
              console.error('Error al calcular total a pagar:', err);
            } else {
              console.log("[WizardConStepper] Total a pagar calculado para Efectivo:", res);
              // console.log("Tipo de dato de totalAPagar:", typeof res, "Valor:", res);
              setTotalAPagar(res);
              setCargadoPago(true);
            }
          });
        }
        
        
      },[comisionesComercio,metodoPago,pedidosRemesa, tieneProxyVPN, monedaFinalUI])

      useEffect(() => {
        // ✅ Regla negocio: Proxy/VPN solo se paga en Cuba => no pedir selector y fijar moneda
        if (tieneProxyVPN) {
          if (paisPago !== 'CUP') setPaisPago('CUP');
          return;
        }

        if (!metodoPago) {
          setPaisPago(null);
          return;
        }

        const requiere = metodoPago === 'efectivo' || metodoPago === 'transferencia';
        if (!requiere) setPaisPago(null);
      }, [metodoPago, tieneProxyVPN]); // intencional: reacciona al cambio de carrito o método

      const crearOrdenPaypal = () => {
        Meteor.call(
          "creandoOrden",
          userId,
          totalAPagar,
          "Compras Online a travez de VidKar",
          pedidosRemesa,
          comisionesComercio,
          function (error, success) {
            if (error) {
              console.log("error", error);
            }
            if (success) {
              console.log("success", success);
            }
          }
        );
      };

      const crearOrdenEfectivo = () => {
        // totalAPagar > 0 && 
        Meteor.call(
          "efectivo.createOrder",
          userId,
          pedidosRemesa,
          comisionesComercio,
          function (error, success) {
            if (error) {
              console.log("error", error);
            }
            if (success) {
              console.log("success", success);
            }
          }
        );
      };

      const crearOrdenMercadoPago = () => {
        Meteor.call(
          "mercadopago.createOrder",
          userId,
          pedidosRemesa,
          comisionesComercio,
          totalAPagar,
          "Servicios Online a travez de VidKar",
          function (error, success) {
            if (error) {
              console.log("error", error);
            }
            if (success) {
              console.log("success", success);
            }
          }
        );
      };

      useEffect(() => {
        if(activeStep === 4){
          setLoadCargaPagar(false);
          Meteor.call("cancelarOrdenesPaypalIncompletas", userId, (error) => {
            if (error) {
              console.error("Error cancelando órdenes PayPal:", error);
            } else {
              console.log("✅ Órdenes PayPal incompletas canceladas");
              switch (metodoPago) {
                case "paypal":
                  console.log("creando orden paypal");
                  crearOrdenPaypal();
                  break;
                case "mercadopago":
                  console.log("creando orden mercadopago");
                  crearOrdenMercadoPago();
                  break;
                case "efectivo":
                  // console.log(message);
                  crearOrdenEfectivo();
                  break;
              }
            }
          setLoadCargaPagar(false);

          });
    
          
        }    
      },[activeStep]);

    // ✅ NUEVO: helper centralizado para validar si la pasarela tiene URL lista
    const requiereCheckoutUrl = React.useMemo(
      () => metodoPago === 'paypal' || metodoPago === 'mercadopago',
      [metodoPago]
    );

    // ✅ FIX: algunos flujos (p.ej. RECARGA) pueden guardar la URL con otra key distinta a `link`
    const checkoutUrl = React.useMemo(() => {
      const candidates = [
        compra?.link,          // actual
        compra?.linkPago,      // posibles legacy
        compra?.approvalUrl,   // paypal-like
        compra?.init_point,    // mercadopago-like
        compra?.url,           // genérico
      ];

      const url = candidates.find((u) => typeof u === 'string' && u.trim().length > 0);
      return url ? url.trim() : null;
    }, [compra?.link, compra?.linkPago, compra?.approvalUrl, compra?.init_point, compra?.url]);

    const urlPagoDisponible = React.useMemo(() => {
      return typeof checkoutUrl === 'string' && checkoutUrl.length > 0;
    }, [checkoutUrl]);

    const handlePagar = async () => {
      // ✅ DEFENSIVO: si es pasarela y no hay link, nunca abrir
      if (requiereCheckoutUrl && !urlPagoDisponible) {
        Alert.alert(
          'Pago no disponible',
          'Aún no se generó el enlace de pago. Espera unos segundos y vuelve a intentar.',
          [{ text: 'OK' }]
        );
        return;
      }

      // ✅ NUEVO: Prevenir ejecución múltiple
      if (procesandoPago) {
        console.log("⚠️ Pago ya en proceso, ignorando clic adicional");
        return;
      }

      setProcesandoPago(true);
      setSeEstaPagando(true);

      try {
        // ✅ FIX: usar el mismo link “real” que habilita el botón
        const targetUrl = checkoutUrl;

        if (!targetUrl) {
          Alert.alert('Pago no disponible', 'No se encontró el enlace de pago generado.', [{ text: 'OK' }]);
          return;
        }

        const supported = await Linking.canOpenURL(targetUrl);
        if (!supported) {
          Alert.alert('Pago no disponible', 'El dispositivo no puede abrir el enlace de pago.', [{ text: 'OK' }]);
          return;
        }

        await Linking.openURL(targetUrl);
      } finally {
        // ✅ Timeout de seguridad: resetear después de 5 segundos
        setTimeout(() => {
          setProcesandoPago(false);
          setSeEstaPagando(false);
        }, 5000);
      }
    };

    const handleGenerarVenta = async () => {
      // ✅ NUEVO: Prevenir ejecución múltiple
      if (procesandoPago) {
        console.log("⚠️ Venta ya en proceso, ignorando clic adicional");
        return;
      }

      setProcesandoPago(true);
      // console.log("compra:",compra)
      // console.log("moneda.convertir",Number(totalAPagar), monedaFinalUI, "USD");
        Meteor.call('moneda.convertir', Number(totalAPagar), monedaFinalUI, "USD", null, (error, totalAPagar2) => {
          if (error) console.error('Error al convertir totalAPagar a USD:', error);
          else {


            const ventaData = {
              producto: compra,
              precioOficial: totalAPagar2 ,
              comisionesComercio: comisionesComercio
            };
            
            Meteor.call('generarVentaEfectivo', ventaData, monedaFinalUI || "CUP", (error, success) => {
              if (error) {
                console.log("error", error);
              }
              if (success) {
                console.log("success", success);
              }
            });


          }

          setProcesandoPago(false);
      });


       
      
    };

    // ✅ CORRECCIÓN: al seleccionar ubicación NO recalcular comisiones aquí.
    // El recálculo debe ocurrir al confirmar el step (Siguiente) porque ahí se aplica la ubicación al carrito.
    const handleLocationSelect = (coordenadas) => {
      console.log('[WizardConStepper] Coordenadas recibidas:', coordenadas);

      setUbicacionEntrega(coordenadas);

      // ❌ ELIMINAR: no llamar aquí a carrito.actualizarUbicacion ni a calcularCostosEntrega
      // Meteor.call('carrito.actualizarUbicacion', ...)
      // calcularCostosEntrega()
    };

    // ✅ ADAPTACIÓN: Validar ubicación antes de avanzar desde Método de Pago
    const handleNextMetodoPago = () => {
      if (tieneComercio && !ubicacionValida) {
        // Si tiene items COMERCIO, el siguiente paso es Ubicación
        setActiveStep(Number(activeStep) + 1);
      } else {
        // Si NO tiene items COMERCIO, saltar directo a Términos
        setActiveStep(Number(activeStep) + (tieneComercio ? 1 : 2));
      }
    };

    // ✅ NUEVO: Cleanup para resetear flags si se cierra el modal
    useEffect(() => {
      if (!visible) {
        setProcesandoPago(false);
        setSeEstaPagando(false);
      }
    }, [visible]);

    // ✅ Key dinámica para forzar re-mount cuando cambia estructura de pasos
    const progressStepsKey = React.useMemo(() => {
      return `wizard-${tieneComercio ? 'con-comercio' : 'sin-comercio'}-${pedidosRemesa?.length || 0}`;
    }, [tieneComercio, pedidosRemesa?.length]);

    // ✅ Reset activeStep si cambia tieneComercio y estamos en paso inválido
    useEffect(() => {
      const maxStepSinComercio = 3; // Confirmar, Pago, Términos, Pago (índices 0-3)
      const maxStepConComercio = 4; // + Ubicación (índices 0-4)

      if (!tieneComercio && activeStep > maxStepSinComercio) {
        console.warn('[WizardConStepper] Retrocediendo activeStep por cambio en tieneComercio');
        setActiveStep(1); // Volver a Método de Pago
      } else if (tieneComercio && activeStep === 2 && !ubicacionValida) {
        // Si agregó items comercio y está en paso 2, asegurar que es el paso correcto
        console.log('[WizardConStepper] Items comercio agregados, paso Ubicación disponible');
      }
    }, [tieneComercio]);

    // ✅ NUEVO: gate para evitar generar ventas con comisiones en error (COMERCIO)
    const bloquearPagoPorComisiones = React.useMemo(() => {
      if (!tieneComercio) return false;
      // Si el cálculo falló o aún no hay comisiones calculadas, bloquear submit en Pago
      if (errorComisiones) return true;
      if (!comisionesComercio) return true;
      return false;
    }, [tieneComercio, errorComisiones, comisionesComercio]);

    // ✅ NUEVO: Componente mejorado para renderizar el Card de Comisiones con datos reales
    const renderComisionesCard = () => {
      if (!tieneComercio) return null;

      return (
        <View style={styles.comisionesContainer}>
          <Card style={styles.comisionesCard} elevation={2}>
            <Card.Content style={styles.comisionesContent}>
              {cargandoComisiones ? (
                <View style={styles.comisionesLoading}>
                  <ActivityIndicator size="small" color="#6200ee" />
                  <Text style={styles.comisionesLoadingText}>Calculando...</Text>
                </View>
              ) : errorComisiones ? (
                <View style={styles.comisionesError}>
                  <IconButton icon="alert-circle-outline" size={28} color="#D32F2F" style={{ margin: 0 }} />
                  <Text style={styles.comisionesErrorText}>{errorComisiones}</Text>
                </View>
              ) : comisionesComercio ? (
                <>
                  {/* ✅ SECCIÓN 1: COSTOS DE ENVÍO */}
                  <View style={styles.seccionEnvio}>
                    <View style={styles.seccionHeader}>
                      <IconButton icon="truck-fast" size={18} color="#2196F3" style={{ margin: 0, marginRight: 4 }} />
                      <Text style={styles.seccionTitulo}>Costos de Envío</Text>
                    </View>

                    {/* Desglose por Tienda */}
                    {comisionesComercio.desglosePorTienda?.length > 0 && (
                      <>
                        {comisionesComercio.desglosePorTienda.map((tienda, index) => (
                          <View key={tienda.idTienda} style={styles.tiendaItem}>
                            <View style={styles.tiendaHeader}>
                              <IconButton icon="storefront" size={16} color="#2196F3" style={{ margin: 0, marginRight: 4 }} />
                              <View style={styles.tiendaInfo}>
                                <Text style={styles.tiendaNombre}>{tienda.nombreTienda}</Text>
                                <Text style={styles.tiendaDetalle}>
                                  {tienda.productosCount} {tienda.productosCount > 1 ? 'items' : 'item'} • {tienda.distanciaKm} km
                                </Text>
                              </View>
                              <Chip 
                                mode="flat" 
                                style={[styles.comisionChip, { backgroundColor: '#2196F320' }]}
                                textStyle={{ color: '#2196F3', fontWeight: 'bold', fontSize: 12 }}
                              >
                                {tienda.costoEntrega} {tienda.moneda}
                              </Chip>
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                    {/* Subtotal de Envío */}
                    <View style={[styles.comisionItem, styles.subtotalEnvio]}>
                      <View style={styles.comisionRowHorizontal}>
                        <View style={styles.comisionLeft}>
                          <IconButton icon="map-marker-distance" size={18} color="#2196F3" style={{ margin: 0, marginRight: 4 }} />
                          <View>
                            <Text style={styles.subtotalLabel}>Subtotal Envío</Text>
                            <Text style={styles.comisionDescripcion}>
                              {comisionesComercio.tiendasProcesadas} {comisionesComercio.tiendasProcesadas > 1 ? 'tiendas' : 'tienda'}
                            </Text>
                          </View>
                        </View>
                        <Chip 
                          mode="flat" 
                          style={[styles.comisionChip, { backgroundColor: '#2196F3' }]}
                          textStyle={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}
                        >
                          {comisionesComercio.costoTotalEntrega} {comisionesComercio.moneda}
                        </Chip>
                      </View>
                    </View>
                  </View>

                  {/* ✅ SECCIÓN 2: COMISIONES ADICIONALES */}
                  {comisionesComercio.comisiones && Object.keys(comisionesComercio.comisiones).length > 0 && (
                    <>
                      <Divider style={styles.seccionDivider} />
                      
                      <View style={styles.seccionComisiones}>
                        <View style={styles.seccionHeader}>
                          <IconButton icon="receipt" size={18} color="#FF6F00" style={{ margin: 0, marginRight: 4 }} />
                          <Text style={styles.seccionTitulo}>Comisiones Adicionales</Text>
                        </View>

                        {Object.entries(comisionesComercio.comisiones).map(([clave, comision]) => (
                          <View key={clave} style={styles.comisionItem}>
                            <View style={styles.comisionRowHorizontal}>
                              <View style={styles.comisionLeft}>
                                <IconButton icon="cash-multiple" size={16} color="#FF6F00" style={{ margin: 0, marginRight: 4 }} />
                                <Text style={styles.comisionLabel}>
                                  {comision.comentario || 'Comisión'}
                                </Text>
                              </View>
                              <Chip 
                                mode="flat" 
                                style={[styles.comisionChip, { backgroundColor: '#FF6F0020' }]}
                                textStyle={{ color: '#FF6F00', fontWeight: 'bold', fontSize: 12 }}
                              >
                                {comision.valor} {comision.moneda}
                              </Chip>
                            </View>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* ✅ TOTAL FINAL */}
                  <Divider style={styles.totalDivider} />
                  <View style={[styles.comisionItem, styles.totalFinalContainer]}>
                    <View style={styles.comisionRowHorizontal}>
                      <View style={styles.comisionLeft}>
                        <IconButton icon="cash-check" size={20}  style={{ margin: 0, marginRight: 4 }} />
                        <Text style={styles.totalFinalLabel}>TOTAL A PAGAR</Text>
                      </View>
                      <Chip 
                        mode="flat" 
                        style={styles.totalFinalChip}
                        textStyle={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}
                      >
                        {comisionesComercio.totalFinal} {comisionesComercio.moneda}
                      </Chip>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.comisionesSinDatos}>
                  <IconButton icon="map-marker-question" size={28} color="#999" style={{ margin: 0 }} />
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

    return (
        <>
        <View style={{ position: 'relative' }}>
          <IconButton
            icon="cart"
            color="white"
            size={24}
            onPress={() => setVisible(true)}
          />
          {subCarrito && pedidosRemesa!= null &&
          <Badge
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
            }}
          >
           {pedidosRemesa.length}
          </Badge>}
          
        </View>
            
            <Portal>
                {/* ✅ CRÍTICO: Solo renderizar Modal si hay datos válidos */}
                {visible && pedidosRemesa && (
                <Modal theme={{ colors: { primary: 'green' } }} visible={visible} onDismiss={hideModal} contentContainerStyle={styles.containerStyle}>

                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType= {isDarkMode ?"dark":"light"}
                    />
                    <View style={{ flex: 1 , paddingTop: 30,zIndex:999}}>
                        <View style={styles.dialogTitleContainer}>
                            <Text style={styles.dialogTitleText}>Carrito de compras:</Text>
                            <IconButton icon="close" onPress={() => setVisible(false)} />
                        </View>
                        <ProgressSteps 
                            key={progressStepsKey} // ✅ CRÍTICO: fuerza re-mount
                            activeStep={activeStep}
                            activeStepNumColor='#f1f8ff'
                            activeStepIconColor='#111'
                            activeStepIconBorderColor='#6200ee'
                            activeLabelColor='#f1f8ff'
                            disabledStepNumColor='#000'
                            disabledStepIconColor='#f1f8ff'
                            completedCheckColor='#bdbdbd'
                            completedStepIconColor='#6200ee'
                            completedStepNumColor='#6200ee'
                            completedProgressBarColor='#6200ee'
                            completedLabelColor='#bdbdbd'
                            activeLabelFontSize={10}
                            labelFontSize={10}  
                            marginBottom={5}
                            topOffset={0}
                            borderWidth={2}
                            orientation="vertical"
                        >

                            {/* Paso 1: Confirmar Pedidos */}
                            <ProgressStep buttonNextDisabled={(!pedidosRemesa || pedidosRemesa.length === 0)} buttonNextText='Siguiente' label="Confirmar Pedidos" onNext={() => setActiveStep(1)}>
                                <Dialog.ScrollArea style={{paddingHorizontal:0}}>
                                    <ListaPedidos eliminar={true} />
                                </Dialog.ScrollArea>
                            </ProgressStep>

                            {/* Paso 2: Metodo de Pago */}
                            <ProgressStep buttonNextDisabled={!puedeAvanzarMetodoPago} buttonPreviousText='Atras' buttonNextText='Siguiente' buttonPreviousTextColor='white' label="Metodo de Pago" onNext={handleNextMetodoPago} onPrevious={() => setActiveStep(Number(activeStep)-1)} >
                            <Dialog.Title>Seleccione el Metodo de Pago</Dialog.Title>

                            {tieneProxyVPN && (
                              <View style={{ padding: 16, backgroundColor: '#FFF3CD', borderRadius: 8, margin: 16 }}>
                                <Text style={{ color: '#856404', fontSize: 14 }}>
                                  ℹ️ Los paquetes Proxy/VPN requieren pago por Efectivo o Transferencia. 
                                  Deberás subir un comprobante de pago para su aprobación.
                                </Text>
                              </View>
                            )}

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
                                onChange={item => {
                                  setMetodoPago(item.value);
                                }}
                            />

                            {!tieneProxyVPN && (metodoPago === 'efectivo' || metodoPago === 'transferencia') && (
                              <View style={{ marginTop: 8 }}>
                                <Text style={{ marginLeft: 18, marginBottom: 6, fontSize: 13, opacity: 0.85 }}>
                                  País donde realizará el pago
                                </Text>

                                {cargandoPaises ? (
                                  <View style={{ padding: 20, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#6200ee" />
                                    <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
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
                                    onChange={item => setPaisPago(item.value)}
                                    disable={paisesPagoData.length === 0}
                                  />
                                )}

                                {!!monedaFinalUI && (
                                  <Text style={{ marginLeft: 18, marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                                    Moneda seleccionada: {monedaFinalUI}
                                  </Text>
                                )}

                                {!cargandoPaises && paisesPagoData.length === 0 && (
                                  <View style={{ padding: 16, backgroundColor: '#FFEBEE', borderRadius: 8, margin: 16 }}>
                                    <Text style={{ color: '#C62828', fontSize: 13 }}>
                                      ⚠️ No hay países configurados para este método de pago. 
                                      Contacte al administrador.
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                            </ProgressStep>

                            {/* ✅ Paso 3: Ubicación de Entrega (solo si tieneComercio) */}
                            {tieneComercio ? (
                              <ProgressStep
                                buttonPreviousText='Atras'
                                buttonNextText='Siguiente'
                                buttonNextDisabled={!ubicacionValida}
                                buttonPreviousTextColor='white'
                                label="Ubicación"
                                onNext={handleNextUbicacion} // ✅ CAMBIO: sincroniza ubicación antes de avanzar
                                onPrevious={() => setActiveStep(Number(activeStep) - 1)}
                              >
                                <View style={{ height: '100%', paddingBottom: 80 }}>
                                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
                                    Selecciona dónde recibirás tu pedido
                                  </Text>
                                  
                                  <MapLocationPicker
                                    onLocationSelect={handleLocationSelect}
                                    currentLocation={ubicacionEntrega}
                                  />
                                </View>
                              </ProgressStep>
                            ) : (
                              <ProgressStep
                                buttonPreviousText='Atras'
                                buttonNextText='Siguiente'
                                buttonPreviousTextColor='white'
                                label="Ubicación"
                                onNext={() => setActiveStep(Number(activeStep) + 1)}
                                onPrevious={() => setActiveStep(Number(activeStep) - 1)}
                              >
                                <View style={{ height: '100%', paddingBottom: 80, justifyContent: 'center', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                                    Este paso no es necesario para tu pedido
                                  </Text>
                                </View>
                              </ProgressStep>
                            )}

                            {/* ✅ ADAPTADO: Paso 3/4: Términos y Condiciones */}
                            <ProgressStep buttonPreviousText='Atras' buttonNextText='Aceptar' buttonPreviousTextColor='white' label="Términos y Condiciones"  onNext={() => setActiveStep(Number(activeStep)+1)} onPrevious={() => {tieneComercio ? setActiveStep(Number(activeStep)-1) : setActiveStep(Number(activeStep)-2)}}>
                                <ScrollView style={styles.terminosContainer}>
                                  {getTerminos() ? (
                                    <>
                                      <Text style={styles.terminosTitulo}>{getTerminos().titulo}</Text>
                                      <Divider style={{ marginVertical: 12 }} />
                                      
                                      {getTerminos().contenido.map((seccion, index) => (
                                        <View key={index} style={styles.seccionTermino}>
                                          <Text style={styles.terminosSubtitulo}>{seccion.subtitulo}</Text>
                                          <Text style={styles.terminosTexto}>{seccion.texto}</Text>
                                        </View>
                                      ))}

                                      <View style={styles.advertenciaFinal}>
                                        <IconButton icon="alert-circle" color="#FF6F00" size={20} />
                                        <Text style={styles.advertenciaTexto}>
                                          Al presionar "Aceptar", confirma que ha leído y acepta todos los términos y condiciones descritos. 
                                          Esta acción constituye un acuerdo legalmente vinculante.
                                        </Text>
                                      </View>
                                    </>
                                  ) : (
                                    <View style={styles.sinMetodoContainer}>
                                      <IconButton icon="information-outline" size={48} />
                                      <Text style={styles.sinMetodoTexto}>
                                        Seleccione un método de pago en el paso anterior para visualizar los términos y condiciones aplicables.
                                      </Text>
                                    </View>
                                  )}
                                </ScrollView>
                            </ProgressStep>

                            {/* Paso 4: Pago */}
                            <ProgressStep 
                                buttonDisabledColor='#aaa' 
                                buttonFinishDisabled={
                                  loadCargaPagar ||
                                  procesandoPago || 
                                  seEstaPagando || 
                                  bloquearPagoPorComisiones || // ✅ NUEVO: no permitir generar venta con error de comisiones
                                  (requiereCheckoutUrl && !urlPagoDisponible) || 
                                  (metodoPago == 'efectivo' && !cargadoPago)
                                } 
                                buttonFinishText={
                                  procesandoPago 
                                    ? '' // ✅ Vacío para mostrar solo el ActivityIndicator
                                    : (metodoPago === 'efectivo' ? 'Generar Venta' : 'Pagar')
                                } 
                                buttonFillColor={procesandoPago ? '#9E9E9E' : '#6200ee'} 
                                buttonPreviousText='Atras' 
                                buttonPreviousTextColor='white' 
                                onSubmit={metodoPago === 'efectivo' ? handleGenerarVenta : handlePagar}  
                                label="Pago" 
                                onPrevious={() => {
                                  if (!procesandoPago) {
                                    setActiveStep(Number(activeStep)-1);
                                  }
                                }}
                            >
                            <>
                            <Dialog.ScrollArea>
                                <ListaPedidos eliminar={false} />
                            </Dialog.ScrollArea>
                              

                              {/* ✅ NUEVO: Card de Comisiones */}
                              {renderComisionesCard()}
                              
                              {/* ✅ NUEVO: Card de Total a Pagar (corregido) */}
                              <Card style={styles.totalCard} elevation={3}>
                                <Card.Title
                                  title="Resumen de pago"
                                  subtitle={`Método: ${metodoPago || 'N/D'} • Moneda: ${monedaFinalUI}`}
                                  left={(props) => (
                                    <IconButton
                                      {...props}
                                      icon="cash-multiple"
                                      size={20}
                                      style={{ margin: 0 }}
                                    />
                                  )}
                                />
                                <Divider />
                                <Card.Content style={styles.totalCardContent}>
                                  {(cargandoComisiones || cargandoConversionResumen) ? (
                                    <View style={styles.totalRowCenter}>
                                      <ActivityIndicator size="small" color="#6200ee" />
                                      <Text style={styles.totalHintText}>Calculando total…</Text>
                                    </View>
                                  ) : (errorComisiones || errorConversionResumen) ? (
                                    <View style={styles.totalRowCenter}>
                                      <IconButton icon="alert-circle-outline" size={18} color="#D32F2F" style={{ margin: 0 }} />
                                      <Text style={[styles.totalHintText, { color: '#D32F2F' }]}>
                                        {errorComisiones || errorConversionResumen}
                                      </Text>
                                    </View>
                                  ) : (
                                    <>
                                      <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Subtotal (productos)</Text>
                                        <Text style={styles.totalValue}>
                                          {Number(subtotalProductosConvertido || 0).toFixed(2)} {monedaFinalUI}
                                        </Text>
                                      </View>

                                      {tieneComercio && (
                                        <View style={styles.totalRow}>
                                          <Text style={styles.totalLabel}>Comisiones (envío + adicionales)</Text>
                                          <Text style={styles.totalValue}>
                                            {Number(comisionesConvertidas || 0).toFixed(2)} {monedaFinalUI}
                                          </Text>
                                        </View>
                                      )}

                                      {/* ✅ NUEVO: comisión de pasarela (PayPal/MercadoPago) calculada por diferencia */}
                                      {(metodoPago === 'paypal' || metodoPago === 'mercadopago') && (
                                        <View style={styles.totalRow}>
                                          <Text style={styles.totalLabel}>
                                            Comisión {metodoPago === 'paypal' ? 'PayPal' : 'MercadoPago'}
                                          </Text>
                                          <Text style={styles.totalValue}>
                                            {Math.max(
                                              0,
                                              (Number(totalAPagar || 0) - Number(totalResumenConvertido || 0))
                                            ).toFixed(2)}{' '}
                                            {monedaFinalUI}
                                          </Text>
                                        </View>
                                      )}

                                      <Divider style={{ marginVertical: 10 }} />

                                      <View style={styles.totalRow}>
                                        <Text style={styles.totalTotalLabel}>TOTAL A PAGAR</Text>
                                        <View style={styles.totalPill}>
                                          <Text style={styles.totalPillText}>
                                            {Number(totalAPagar || 0).toFixed(2)} {monedaFinalUI}
                                          </Text>
                                        </View>
                                      </View>

                                      {(metodoPago === 'efectivo' || metodoPago === 'transferencia') && (
                                        <Text style={styles.totalFootnote}>
                                          Importante: asegúrate de enviar el monto exacto. Si tu banco aplica comisiones externas, la diferencia deberá cubrirse.
                                        </Text>
                                      )}
                                    </>
                                  )}
                                </Card.Content>
                              </Card>

                              {/* ✅ NUEVO: Indicador de procesamiento visual */}
                              {procesandoPago && (
                                <View style={styles.procesandoContainer}>
                                  <ActivityIndicator size="large" color="#6200ee" />
                                  <Text style={styles.procesandoTexto}>
                                    {metodoPago === 'efectivo'
                                      ? 'Generando venta...'
                                      : 'Abriendo pasarela de pago...'}
                                  </Text>
                                  <Text style={styles.procesandoSubtexto}>
                                    Por favor, no cierre esta ventana
                                  </Text>
                                </View>
                              )}

                              {/* ✅ NUEVO: Mensaje UX si está bloqueado por comisiones */}
                              {tieneComercio && bloquearPagoPorComisiones && (
                                <View style={{ marginTop: 12, marginHorizontal: 16, padding: 12, borderRadius: 10, backgroundColor: '#FFEBEE' }}>
                                  <Text style={{ color: '#C62828', fontSize: 12, fontWeight: '700' }}>
                                    No se puede generar la venta
                                  </Text>
                                  <Text style={{ color: '#C62828', fontSize: 12, marginTop: 4 }}>
                                    {errorComisiones
                                      ? `Error en comisiones: \n${errorComisiones}`
                                      : 'Las comisiones de envío aún no están calculadas. Verifica la ubicación y vuelve a intentar.'}
                                  </Text>
                                </View>
                              )}
                            </>
                            </ProgressStep>
                        </ProgressSteps>
                    </View>
                </Modal>
                )}
            </Portal>
        </>
    );
};

const styles = StyleSheet.create({
    dropdown: {
        margin: 16,
        height: 50,
        borderWidth: 1,
        borderRadius: 20,
        padding:10,
        backgroundColor: '#ccc',
      },
      icon: {
        marginRight: 5,
      },
      placeholderStyle: {
        fontSize: 16,
      },
      selectedTextStyle: {
        fontSize: 16,
      },
      iconStyle: {
        width: 20,
        height: 20,
      },
      inputSearchStyle: {
        height: 40,
        fontSize: 16,
      },
    containerStyle: {
        padding: 0,
        margin: 0,
        height: "100%"
    },
    dialogTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingLeft: 10,
    },
    dialogTitleText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    
    // ✅ NUEVOS ESTILOS para Términos y Condiciones
    terminosContainer: {
      padding: 20,
      maxHeight: "100%",
    },
    terminosTitulo: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    seccionTermino: {
      marginBottom: 16,
      // backgroundColor: 'rgba(0,0,0,0.20)',
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#6200ee',
    },
    terminosSubtitulo: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 6,
    },
    terminosTexto: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'justify',
    },
    advertenciaFinal: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF3CD',
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#FF6F00',
    },
    advertenciaTexto: {
      flex: 1,
      fontSize: 12,
      color: '#6200ee',
      fontWeight: '600',
      marginLeft: 8,
    },
    sinMetodoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    sinMetodoTexto: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginTop: 12,
    },
    // ✅ NUEVOS ESTILOS para indicador de procesamiento
    procesandoContainer: {
      marginTop: 24,
      padding: 20,
      backgroundColor: 'rgba(98, 0, 238, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#6200ee',
      alignItems: 'center',
    },
    procesandoTexto: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6200ee',
      marginTop: 12,
    },
    procesandoSubtexto: {
      fontSize: 12,
      color: '#666',
      fontWeight: 'bold',
      marginTop: 4,
      fontStyle: 'italic',
    },
    // ✅ NUEVOS ESTILOS para Card de Comisiones
    comisionesContainer: {
      marginTop: 12,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    comisionesCard: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    comisionesTitulo: {
      fontSize: 15,
      fontWeight: 'bold',
    },
    comisionesContent: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    comisionesLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    comisionesLoadingText: {
      marginLeft: 8,
      fontSize: 13,
      color: '#666',
    },
    comisionesError: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    comisionesErrorText: {
      fontSize: 12,
      color: '#D32F2F',
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 12,
    },
    comisionesSeccionTitulo: {
      fontSize: 13,
      fontWeight: 'bold',
      marginBottom: 6,
      marginTop: 2,
      color: '#333',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    comisionItem: {
      paddingVertical: 6,
    },
    comisionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // ✅ NUEVO: Row horizontal para label + chip en la misma línea
    comisionRowHorizontal: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    // ✅ NUEVO: Container para ícono + texto a la izquierda
    comisionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    comisionLabel: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    comisionDescripcion: {
      fontSize: 11,
      color: '#666',
      marginTop: 2,
    },
    comisionChip: {
      height: 32,
      paddingHorizontal: 8,
    },
    comisionDivider: {
      marginVertical: 8,
      backgroundColor: '#E0E0E0',
    },
    tiendaItem: {
      paddingVertical: 4,
      marginBottom: 4,
    },
    tiendaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tiendaInfo: {
      flex: 1,
      marginLeft: 2,
    },
    tiendaNombre: {
      fontSize: 13,
      fontWeight: '600',
    },
    tiendaDetalle: {
      fontSize: 11,
      color: '#666',
      marginTop: 1,
    },
    totalFinalContainer: {
      backgroundColor: '#6200ee15',
      padding: 10,
      borderRadius: 8,
      marginVertical: 4,
    },
    totalFinalLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      flex: 1,
      // color: '#6200ee',
    },
    totalFinalChip: {
      backgroundColor: '#6200ee',
      height: 38,
      alignSelf: 'flex-end',
    },
    // ✅ NUEVOS ESTILOS para secciones diferenciadas
    seccionEnvio: {
      marginBottom: 4,
    },
    seccionComisiones: {
      marginTop: 4,
    },
    seccionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingBottom: 4,
    },
    seccionTitulo: {
      fontSize: 13,
      fontWeight: 'bold',
      // color: '#333',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      flex: 1,
    },
    seccionDivider: {
      marginVertical: 12,
      backgroundColor: '#BDBDBD',
      height: 2,
    },
    totalDivider: {
      marginVertical: 10,
      backgroundColor: '#9E9E9E',
      height: 2,
    },
    subtotalEnvio: {
      backgroundColor: '#E3F2FD',
      padding: 8,
      borderRadius: 6,
      marginTop: 6,
    },
    subtotalLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1976D2',
    },
    comisionFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
    },
    comisionFooterText: {
      flex: 1,
      fontSize: 10,
      color: '#666',
      fontStyle: 'italic',
      lineHeight: 14,
    },
    comisionesSinDatos: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    comisionesSinDatosText: {
      fontSize: 12,
      color: '#999',
      marginTop: 6,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    // ✅ NUEVO: estilos para Card de total mejorado
    totalCard: {
      marginTop: 12,
      marginHorizontal: 16,
      borderRadius: 14,
      overflow: 'hidden',
    },
    totalCardContent: {
      paddingVertical: 12,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    totalRowCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    totalLabel: {
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.8,
      flex: 1,
      paddingRight: 10,
    },
    totalValue: {
      fontSize: 13,
      fontWeight: '700',
    },
    totalTotalLabel: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    totalPill: {
      backgroundColor: '#6200ee',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    totalPillText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
    },
    totalHintText: {
      marginLeft: 8,
      fontSize: 12,
      opacity: 0.75,
      fontWeight: '600',
    },
    totalFootnote: {
      marginTop: 10,
      fontSize: 11,
      opacity: 0.7,
      lineHeight: 15,
    },
});

export default WizardConStepper;