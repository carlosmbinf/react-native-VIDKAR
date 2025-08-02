import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ProgressSteps, ProgressStep } from 'react-native-progress-steps';
import { TextInput, Text, Button, Dialog, Portal, Divider, Chip, IconButton } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import ListaPedidosRemesa from './ListaPedidosRemesa';

const WizardConStepper = ({ product, navigation }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [nombre, setNombre] = useState('');
    const [extraFields, setExtraFields] = useState({});
    const [confirmado, setConfirmado] = useState(false);
    const [visible, setVisible] = useState(false);

    const onClose = () => {
        setVisible(false);
    }

    const precioUSD = product?.prices?.retail?.amount || 0;

    const handleExtraFieldChange = (field, text) => {
        setExtraFields(prev => ({ ...prev, [field]: text }));
    };

    const handleSubmit = () => {
        const nuevoCarrito = {
            idUser: Meteor.userId(),
            cobrarUSD: precioUSD,
            nombre,
            movilARecargar: extraFields['mobile_number'],
            comentario: product?.description,
            type: 'RECARGA',
            monedaCuba: 'CUP',
            producto: product,
            extraFields
        };

        Meteor.call('insertarCarrito', nuevoCarrito, (err, res) => {
            if (err) {
                console.error('Error insertarCarrito:', err);
            } else {
                setConfirmado(true);
                setActiveStep(prev => prev + 1);
            }
        });
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
                <Dialog visible={visible} onDismiss={onClose}>
                    <View style={styles.dialogTitleContainer}>
                        <Text style={styles.dialogTitleText}>Recarga Wizard</Text>
                        <IconButton icon="close" onPress={() => setVisible(false)} />
                    </View>
                    <Dialog.ScrollArea>
                        <ScrollView>
                            <ProgressSteps activeStep={activeStep}
                            orientation="vertical" // 👈 Esto es lo que lo pone en vertical
                            >
                                {/* Paso 1: Datos */}
                                <ProgressStep label="Datos" onNext={() => setActiveStep(1)}>
                                    <ListaPedidosRemesa />
                                </ProgressStep>

                                {/* Paso 2: Resumen del pedido */}
                                <ProgressStep label="Resumen" onNext={() => setActiveStep(2)} onPrevious={() => setActiveStep(0)} >
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

                                {/* Paso 3: Términos y Condiciones */}
                                <ProgressStep label="Términos" onNext={handleSubmit} onPrevious={() => setActiveStep(1)}>
                                    <View style={{ padding: 16 }}>
                                        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Términos y Condiciones</Text>
                                        <Text>
                                            Al seleccionar PayPal como método de pago, el usuario acepta que este servicio aplica una comisión adicional,
                                            la cual deberá ser asumida íntegramente por el usuario.
                                        </Text>
                                        <Text style={{ marginTop: 10 }}>
                                            VidKar no ofrece reembolsos. Al confirmar el pago, se entiende que el usuario acepta que toda la información
                                            proporcionada es correcta y veraz.
                                        </Text>
                                        <Text style={{ marginTop: 10 }}>
                                            La entrega del efectivo en Cuba se realizará mediante transferencia en un plazo no mayor a un (1) día hábil.
                                        </Text>
                                    </View>
                                </ProgressStep>

                                {/* Paso 4: Confirmación */}
                                <ProgressStep label="Confirmado" removeBtnRow>
                                    <View style={{ padding: 16, alignItems: 'center' }}>
                                        {confirmado ? (
                                            <>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>✅ Recarga confirmada</Text>
                                                <Button mode="contained" onPress={onClose}>Cerrar</Button>
                                            </>
                                        ) : (
                                            <Text>Procesando...</Text>
                                        )}
                                    </View>
                                </ProgressStep>
                            </ProgressSteps>
                        </ScrollView>
                    </Dialog.ScrollArea>
                </Dialog>
            </Portal>
        </>
    );
};

const styles = StyleSheet.create({
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
