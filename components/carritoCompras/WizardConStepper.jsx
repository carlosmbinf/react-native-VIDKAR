import React, { useEffect, useState } from 'react';
import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { ProgressSteps, ProgressStep } from 'react-native-progress-steps';
import { TextInput, Text, Button, Dialog, Portal, Divider, Chip, IconButton, Modal,useTheme  } from 'react-native-paper';
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

    const theme = useTheme();
    const isDarkMode = theme.dark;

    const showModal = () => setVisible(true);
    const hideModal = () => setVisible(false);

  const data = [
    { label: 'Paypal', value: 'paypal' },
    { label: 'MercadoPago', value: 'mercadopago' },
   
  ];

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
  const { pedidosRemesa,subCarrito } = useTracker(() => {
    const subCarrito = Meteor.subscribe('carrito', { idUser: Meteor.userId()});
    const pedidos = CarritoCollection.find({ idUser: userId }).fetch();
    return { pedidosRemesa: pedidos,subCarrito };
  });

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

      useEffect(() => {

        if( (!pedidosRemesa || pedidosRemesa.length === 0) && activeStep !== 0){
            setActiveStep(0);
            return;
        }
        console.log(`Método de pago seleccionado: ${metodoPago}`);
        if (metodoPago == 'paypal') {
          // Aquí podrías hacer algo con el método de pago seleccionado
         Meteor.call("paypal.totalAPagar", pedidosRemesa,(err, res) => {
            if (err) {
              console.error('Error al calcular total a pagar:', err);
            } else {
              setTotalAPagar(res);
            }
          });
        }else if (metodoPago == 'mercadopago') {
          Meteor.call("mercadopago.totalAPagar", pedidosRemesa,(err, res) => {
            if (err) {
              console.error('Error al calcular total a pagar:', err);
            } else {
              setTotalAPagar(res);
            }
          });
        }
      },[metodoPago,pedidosRemesa])

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
        if(activeStep === 3){
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
          }
        }    
      },[activeStep]);


    const precioUSD = product?.prices?.retail?.amount || 0;

    const handlePagar = async () => {
        // alert("Submit")
        console.log(compra?.link)
        const supported = await Linking.canOpenURL(compra?.link);
        // if (supported) {
            await Linking.openURL(compra?.link);
        // } else {
        //     Alert.alert(`No se puede abrir ${metodoPago=='paypal'?'Paypal':'MercadoPago'} para efectuar el pago, por favor intente más tarde.`);
        // }
    };

    return (
        <>
            <IconButton
                icon="cart"
                color="white"
                size={24}
                onPress={() => {
                    setVisible(true);
                }}
            />

            <Portal>
                <Modal theme={{ colors: { primary: 'green' } }} visible={visible} onDismiss={hideModal} contentContainerStyle={styles.containerStyle}>

                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType= {isDarkMode ?"dark":"light"}
                        
                        // blurAmount={1}
                        // reducedTransparencyFallbackColor="white"
                    />
                    <View style={{ flex: 1 }}>
                        <View style={styles.dialogTitleContainer}>
                            <Text style={styles.dialogTitleText}>Recarga Wizard</Text>
                            <IconButton icon="close" onPress={() => setVisible(false)} />
                        </View>
                        <ProgressSteps activeStep={activeStep}
                            
                            activeStepNumColor='#f1f8ff' // Color del número del paso activo
                            activeStepIconColor='#111' // Color del número del paso activo
                            activeStepIconBorderColor='#6200ee' // Color del borde del icono del paso activo
                            activeLabelColor='#f1f8ff'

                            disabledStepNumColor='#000' // Color del número de pasos deshabilitados
                            disabledStepIconColor='#f1f8ff' // Color del icono de pasos deshabilitados
                            
                            
                            // isComplete={activeStep === activeStepNum}
                            

                            completedCheckColor='#bdbdbd' // Color del check cuando el paso está completo
                            completedStepIconColor='#6200ee' // Color del icono del paso completo
                            completedStepNumColor='#6200ee' // Color del número del paso completo
                            completedProgressBarColor='#6200ee' // Color de la barra de progreso del paso completo
                            completedLabelColor='#bdbdbd'

                            activeLabelFontSize={10}
                            labelFontSize={10}  
                            marginBottom={5} // Espacio entre los pasos y el contenido
                            topOffset={0} // Ajuste para el espacio superior
                            borderWidth={2}

                            orientation="vertical" // 👈 Esto es lo que lo pone en vertical

                        >

                            {/* Paso 1: Datos */}
                            <ProgressStep buttonNextDisabled={(!pedidosRemesa || pedidosRemesa.length === 0)} buttonNextText='Siguiente' label="Confirmar Pedidos" onNext={() => setActiveStep(1)}>
                                <Dialog.ScrollArea>
                                    <ListaPedidos />
                                </Dialog.ScrollArea>
                            </ProgressStep>

                            {/* Paso 2: Resumen del pedido */}
                            <ProgressStep buttonNextDisabled={(!metodoPago || metodoPago == '')} buttonPreviousText='Atras' buttonNextText='Siguiente' buttonPreviousTextColor='white' label="Metodo de Pago" onNext={() => setActiveStep(Number(activeStep)+1)} onPrevious={() => setActiveStep(Number(activeStep)-1)} >
                            <Dialog.Title>Seleccione el Metodo de Pago</Dialog.Title>
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
                                // renderLeftIcon={() => (
                                // <AntDesign style={styles.icon} color="black" name="Safety" size={20} />
                                // )}
                            />
                            </ProgressStep>

                            {/* Paso 3: Términos y Condiciones */}
                            <ProgressStep buttonPreviousText='Atras' buttonNextText='Aceptar' buttonPreviousTextColor='white' label="Términos y Condiciones"  onNext={() => setActiveStep(Number(activeStep)+1)} onPrevious={() => setActiveStep(Number(activeStep)-1)}>
                                <View style={{ padding: 16 }}>
                                    <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Términos y Condiciones de Pago – VidKar</Text>
                                    <Text>
                                        Al seleccionar PayPal como método de pago, el usuario acepta que este servicio aplica una comisión adicional,
                                        la cual deberá ser asumida íntegramente por el usuario.
                                    </Text>
                                    <Text style={{ marginTop: 10 }}>
                                        VidKar no ofrece reembolsos. Al confirmar el pago, se entiende que el usuario acepta que toda la información
                                        proporcionada es correcta y veraz.
                                    </Text>
                                    <Text style={{ marginTop: 10, fontWeight: 'bold' }}>
                                        La entrega en Cuba se realizará en un plazo no mayor a un (2) día hábil, garantizando un proceso ágil y seguro.
                                    </Text>
                                </View>
                            </ProgressStep>

                            { /* Paso 4: Confirmación y pago */}
                            <ProgressStep buttonDisabledColor='#aaa' buttonFinishDisabled={(activeStep === 3 && !compra?.link) } buttonFinishText='Pagar' buttonFillColor='#6200ee' buttonPreviousText='Atras' buttonPreviousTextColor='white' buttonPre  onSubmit={handlePagar}  label="Pago" onPrevious={() => setActiveStep(Number(activeStep)-1)}>
                                <View style={{ padding: 16 }}>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                        Resumen de la Recarga
                                    </Text>
                                    <Divider style={{ marginVertical: 10 }} />
                                    <Text>Nombre: {nombre}</Text>
                                    <Text>Producto: {product?.name}</Text>
                                    <Text>Monto: <Chip>{precioUSD} USD</Chip></Text>
                                    <Text>Promo: <Chip color={product?.promotions ? 'success' : 'secondary'}>{product?.promotions ? 'Tiene Promo' : 'Sin Promo'}</Chip></Text>
                                    {product?.description && <Text>Comentario: {product.description}</Text>}
                                </View>
                            </ProgressStep>
                            
                        </ProgressSteps>
                        {/* <Dialog.Actions>
                            <Button mode="contained" onPress={onClose}>Cerrar</Button>
                        </Dialog.Actions> */}
                    </View>
                </Modal>
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
        // backgroundColor: '#bdbdbd', 

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
});







export default WizardConStepper;
