import React, { useEffect, useState } from 'react';
import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { ProgressSteps, ProgressStep } from 'react-native-progress-steps';
import { TextInput, Text, Button, Dialog, Portal, Divider, Chip, IconButton, Modal, useTheme, Badge, ActivityIndicator } from 'react-native-paper';
import ListaPedidos from './ListaPedidosRemesa';
import { BlurView } from '@react-native-community/blur';
import { Dropdown } from 'react-native-element-dropdown';
import { CarritoCollection, OrdenesCollection } from '../collections/collections';

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

  //CARRITO
  const { pedidosRemesa, subCarrito } = useTracker(() => {
    const subCarrito = Meteor.subscribe('carrito', { idUser: Meteor.userId() });
    const pedidos = CarritoCollection.find({ idUser: userId }).fetch();
    return { pedidosRemesa: pedidos, subCarrito };
  });

  // ✅ NUEVO: Detectar si hay items Proxy/VPN en el carrito
  const tieneProxyVPN = pedidosRemesa?.some(item =>
    item.type === 'PROXY' || item.type === 'VPN'
  );

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
          texto: "MercadoPago aplica una tarifa de procesamiento del 4-6% (variable según país y método de pago), asumida por el usuario. Los costos de procesamiento bancario internacional están incluidos en el total mostrado."
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
  }, [activeStep]);

  useEffect(() => {
    return () => {
      subCarrito && subCarrito.ready() && subCarrito.stop()
      readyCompra && readyCompra.ready() && readyCompra.stop()
    };
  }, []);

  useEffect(() => {
    if ((!pedidosRemesa || pedidosRemesa.length === 0) && activeStep !== 0) {
      setActiveStep(0);
      setCargadoPago(false);
      return;
    }
    console.log(`Método de pago seleccionado: ${metodoPago}`);
    if (!metodoPago) return;

    if (tieneProxyVPN && (metodoPago === 'efectivo' || metodoPago === 'transferencia')) {
      Meteor.call("efectivo.totalAPagar", pedidosRemesa, (err, res) => {
        if (err) {
          console.error('Error al calcular total a pagar:', err);
        } else {
          setTotalAPagar(res);
          setCargadoPago(true);
        }
      });
      return;
    }

    if (metodoPago == 'paypal') {
      Meteor.call("paypal.totalAPagar", pedidosRemesa, (err, res) => {
        if (err) {
          console.error('Error al calcular total a pagar:', err);
        } else {
          setTotalAPagar(res);
          setCargadoPago(true);
        }
      });
    } else if (metodoPago == 'mercadopago') {
      Meteor.call("mercadopago.totalAPagar", pedidosRemesa, (err, res) => {
        if (err) {
          console.error('Error al calcular total a pagar:', err);
        } else {
          setTotalAPagar(res);
          setCargadoPago(true);
        }
      });
    } else if (metodoPago == 'efectivo') {
      Meteor.call("efectivo.totalAPagar", pedidosRemesa, (err, res) => {
        if (err) {
          console.error('Error al calcular total a pagar:', err);
        } else {
          console.log("efectivo.totalAPagar", totalAPagar);
          setTotalAPagar(res);
          setCargadoPago(true);
        }
      });
    }
  }, [metodoPago, pedidosRemesa, tieneProxyVPN])

  const crearOrdenPaypal = () => {
    Meteor.call(
      "creandoOrden",
      userId,
      totalAPagar,
      "Compras Online a travez de VidKar",
      pedidosRemesa,
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
    totalAPagar > 0 &&
      Meteor.call(
        "efectivo.createOrder",
        userId,
        pedidosRemesa,
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
    if (activeStep === 3) {
      Meteor.call("cancelarOrdenesPaypalIncompletas", userId, (error) => {
        if (error) {
          console.error("Error cancelando órdenes PayPal:", error);
        } else {
          console.log("✅ Órdenes PayPal incompletas canceladas");
        }
      });

      switch (metodoPago) {
        case "paypal":
          crearOrdenPaypal();
          break;
        case "mercadopago":
          crearOrdenMercadoPago();
          break;
        case "efectivo":
          crearOrdenEfectivo();
          break;
      }
    }
  }, [activeStep]);

  const handlePagar = async () => {
    // ✅ NUEVO: Prevenir ejecución múltiple
    if (procesandoPago) {
      console.log("⚠️ Pago ya en proceso, ignorando clic adicional");
      return;
    }

    setProcesandoPago(true);
    setSeEstaPagando(true);

    try {
      console.log(compra?.link);
      const supported = await Linking.canOpenURL(compra?.link);
      await Linking.openURL(compra?.link);

      // ✅ Timeout de seguridad: resetear después de 5 segundos
      setTimeout(() => {
        setProcesandoPago(false);
        setSeEstaPagando(false);
      }, 5000);
    } catch (error) {
      console.error("❌ Error al abrir link de pago:", error);
      Alert.alert(
        'Error de pago',
        'No se pudo abrir la pasarela de pago. Intente nuevamente.',
        [{
          text: 'OK', onPress: () => {
            setProcesandoPago(false);
            setSeEstaPagando(false);
          }
        }]
      );
    }
  };

  const handleGenerarVenta = async () => {
    // ✅ NUEVO: Prevenir ejecución múltiple
    if (procesandoPago) {
      console.log("⚠️ Venta ya en proceso, ignorando clic adicional");
      return;
    }

    setProcesandoPago(true);
    setSeEstaPagando(true);

    if (false) {
      console.log("Es PROXY o VPN - Generando venta con nuevo método");

      const ventaData = {
        carritos: compra?.carritos || pedidosRemesa,
        userId: userId,
        type: metodoPago === 'efectivo' ? 'EFECTIVO' : 'TRANSFERENCIA',
        idOrder: compra?.idOrder || null,
        precioOficial: totalAPagar
      };

      console.log("ventaData a enviar:", ventaData);

      Meteor.call('generarVentaEfectivoPROXYVPN', ventaData, (error, success) => {
        if (error) {
          console.error("❌ Error generando venta Proxy/VPN:", error);
          Alert.alert(
            'Error al generar venta',
            error.reason || 'No se pudo procesar la venta. Intente nuevamente.',
            [{
              text: 'OK', onPress: () => {
                setProcesandoPago(false);
                setSeEstaPagando(false);
              }
            }]
          );
        }
        if (success) {
          console.log("✅ Venta Proxy/VPN generada exitosamente:", success);
          Alert.alert(
            'Venta generada',
            success.message || `${success.ventasGeneradas} venta(s) generada(s) exitosamente`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setProcesandoPago(false);
                  setSeEstaPagando(false);
                  setVisible(false);
                }
              }
            ]
          );
        }
      });

    } else {
      console.log("compra:", compra)
      const ventaData = {
        producto: compra,
        precioOficial: totalAPagar
      };

      Meteor.call('generarVentaEfectivo', ventaData, (error, success) => {
        if (error) {
          console.log("error", error);
          // Alert.alert(
          //   'Error',
          //   error.reason || 'Error al generar venta',
          //   [{ text: 'OK', onPress: () => {
          //     setProcesandoPago(false);
          //     setSeEstaPagando(false);
          //   }}]
          // );
        }
        if (success) {
          console.log("success", success);
          // Alert.alert(
          //   'Éxito',
          //   'Venta generada correctamente',
          //   [{ text: 'OK', onPress: () => {
          //     setProcesandoPago(false);
          //     setSeEstaPagando(false);
          //     setVisible(false);
          //   }}]
          // );
        }
      });
    }
  };

  // ✅ NUEVO: Cleanup para resetear flags si se cierra el modal
  useEffect(() => {
    if (!visible) {
      setProcesandoPago(false);
      setSeEstaPagando(false);
    }
  }, [visible]);

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <IconButton
          icon="cart"
          color="white"
          size={24}
          onPress={() => setVisible(true)}
        />
        {subCarrito && pedidosRemesa != null &&
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
        <Modal style={{height: '100%'}} theme={{ colors: { primary: 'green' } }} visible={visible} onDismiss={hideModal} contentContainerStyle={styles.containerStyle}>

          <BlurView
            style={{height: '100%', position: 'absolute', width: '100%'}}
            blurType={isDarkMode ? "dark" : "light"}
          />
          <View style={{ flex: 1, paddingTop: 20, paddingBottom: 10 }}>
            <View style={styles.dialogTitleContainer}>
              <Text style={styles.dialogTitleText}>Carrito de compras:</Text>
              <IconButton icon="close" onPress={() => setVisible(false)} />
            </View>
            <ProgressSteps activeStep={activeStep}
              activeStepNumColor='#f1f8ff'
              activeStepIconColor='#111'
              activeStepIconBorderColor='#6200ee'
              activeLabelColor='#027224ff'
              disabledStepNumColor='#000'
              disabledStepIconColor='#f1f8ff'
              completedCheckColor='#bdbdbd'
              completedStepIconColor='#6200ee'
              completedStepNumColor='#6200ee'
              completedProgressBarColor='#6200ee'
              completedLabelColor='#6200ee'
              activeLabelFontSize={10}
              labelFontSize={10}
              marginBottom={5}
              topOffset={0}
              borderWidth={2}
              orientation="vertical"
            >

              {/* Paso 1: Confirmar Pedidos */}
              <ProgressStep buttonNextDisabled={(!pedidosRemesa || pedidosRemesa.length === 0)} buttonNextText='Siguiente' label="Confirmar Pedidos" onNext={() => setActiveStep(1)}>
                <Dialog.ScrollArea>
                  <ListaPedidos eliminar={true} />
                </Dialog.ScrollArea>
              </ProgressStep>

              {/* Paso 2: Metodo de Pago */}
              <ProgressStep buttonNextDisabled={(!metodoPago || metodoPago == '')} buttonPreviousText='Atras' buttonNextText='Siguiente' buttonPreviousTextColor='white' label="Metodo de Pago" onNext={() => setActiveStep(Number(activeStep) + 1)} onPrevious={() => setActiveStep(Number(activeStep) - 1)} >
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
              </ProgressStep>

              {/* ✅ Paso 3: Términos y Condiciones (ACTUALIZADO) */}
              <ProgressStep buttonPreviousText='Atras' buttonNextText='Aceptar' buttonPreviousTextColor='white' label="Términos y Condiciones" onNext={() => setActiveStep(Number(activeStep) + 1)} onPrevious={() => setActiveStep(Number(activeStep) - 1)}>
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
                        <IconButton icon="alert-circle" iconColor="#FF6F00" size={20} />
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
                  procesandoPago ||
                  seEstaPagando ||
                  (activeStep === 3 && metodoPago !== 'efectivo' && !compra?.link) ||
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
                    setActiveStep(Number(activeStep) - 1);
                  }
                }}
              >
                <>
                  <Dialog.ScrollArea>
                    <ListaPedidos eliminar={false} />
                  </Dialog.ScrollArea>

                  <Chip style={{ padding: 20, borderRadius: 30 }}>Total a Pagar: {totalAPagar} {tieneProxyVPN ? "CUP" : "USD"}</Chip>

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
                </>
              </ProgressStep>
            </ProgressSteps>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    margin: 16,
    height: 50,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
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
    height: "100%",
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
    // color: '#1976D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  seccionTermino: {
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.20)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6200ee',
  },
  terminosSubtitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    // color: '#333',
    marginBottom: 6,
  },
  terminosTexto: {
    fontSize: 13,
    // color: '#555',
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
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default WizardConStepper;