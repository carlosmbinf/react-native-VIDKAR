import React, { useState } from 'react';
import { View, StyleSheet, ImageBackground, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Card, Title, Chip, IconButton, Portal, Dialog, Button, TextInput, Modal, Surface } from 'react-native-paper';
import { useTheme, Text } from 'react-native-paper';
import { useWindowDimensions, Button as BotonReact } from 'react-native';
import Meteor from '@meteorrn/core';
import { BlurView } from '@react-native-community/blur';
import moment from 'moment';

const CubaCelCard = ({ product }) => {
    const {
        name,
        description,
        operator,
        prices,
        benefits,
        promotions,
        requiredCreditPartyIdentifierFields = []
    } = product;

    const [open, setOpen] = useState(false);
    const [nombre, setNombre] = useState('');
    const [extraFields, setExtraFields] = useState({});
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const theme = useTheme();
    const { width, height } = useWindowDimensions();
    const isDarkMode = theme.dark;

    const precioUSD = prices?.retail?.amount || '---';
    const operadorNombre = operator?.name || 'ETECSA';
    const hasPromo = Array.isArray(promotions) && promotions.length > 0;

    // Listeners del teclado
    React.useEffect(() => {
        let keyboardDidShowListener;
        let keyboardDidHideListener;
        let keyboardWillShowListener;
        let keyboardWillHideListener;

        if (Platform.OS === 'ios') {
            keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (event) => {
                setKeyboardHeight(event.endCoordinates.height);
            });
            keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
                setKeyboardHeight(0);
            });
        } else {
            keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
                setKeyboardHeight(event.endCoordinates.height);
            });
            keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
                setKeyboardHeight(0);
            });
        }

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
            keyboardWillShowListener?.remove();
            keyboardWillHideListener?.remove();
        };
    }, []);

    const beneficios = () => {
        return description || benefits?.reduce((acc, benefit) => {
            if (benefit.amount?.totalIncludingTax === -1) return acc;
            const unidad = benefit.type !== 'SMS' ? benefit.unit : benefit.type;
            return acc + benefit.amount?.totalIncludingTax + ' ' + unidad + '\n';
        }, '') || '';
    };

    const handleSubmit = async () => {
        const nuevoCarrito = {
            idUser: Meteor.userId(),
            cobrarUSD: precioUSD,
            nombre,
            movilARecargar: "+53" + extraFields['mobile_number'],
            comentario: await beneficios(),
            type: 'RECARGA',
            monedaCuba: 'CUP',
            producto: product,
            extraFields
        };

        await Meteor.call("insertarCarrito", nuevoCarrito, (error, result) => {
            if (error) {
                console.error('Error al insertar en el carrito:', error);
                Alert.alert("Error", error.reason);
            } else {
                console.log('Producto agregado al carrito:', result);
                alert('✅ Remesa añadida al carrito');
                setOpen(false);
            }
        });
    };

    const handleExtraFieldChange = (field, value) => {
        const numericValue = field.replace(/_/g, ' ').toUpperCase().includes("MOBILE NUMBER") ? value.replace(/[^0-9]/g, '') : value;
        setExtraFields(prev => ({ ...prev, [field]: numericValue }));
    };

    if (precioUSD != "---") {
        return (
            <Surface>
                <Card style={styles.card} onPress={() => setOpen(true)}>
                    <ImageBackground
                        source={require('./Gemini_Generated_Image_rtg44brtg44brtg4.png')}
                        resizeMode="cover"
                        imageStyle={{ borderRadius: 20 }}
                        style={styles.imageBackground}
                    >
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType={isDarkMode ? "dark" : "light"}
                            autoUpdate={false}
                            reducedTransparencyFallbackColor="dark"
                        />
                        <View style={styles.cardContent}>
                            <View style={styles.row}>
                                <IconButton icon="cellphone" iconColor="white" size={16} />
                                <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{operadorNombre}</Text>
                            </View>

                            {beneficios() !== '' && (
                                <Text style={styles.beneficios}>{beneficios()}</Text>
                            )}
                            <View style={styles.chips}>
                                {hasPromo && <View style={styles.chipsComponentRed}><Text style={{ fontSize: 10 }}>Con promoción</Text></View>}
                                <View style={styles.chipsComponentGreen}><Text style={{ fontSize: 10 }}>{`${precioUSD} USD`}</Text></View>
                            </View>
                        </View>
                    </ImageBackground>
                </Card>

                <Portal>
                    <Dialog 
                        visible={open} 
                        onDismiss={() => setOpen(false)} 
                        style={[
                            styles.dialog,
                            Platform.OS === 'android' && keyboardHeight > 0 && { 
                                marginBottom: keyboardHeight 
                            }
                        ]} 
                    >
                        <View style={styles.dialogTitleContainer}>
                            <Text style={styles.dialogTitleText}>Recarga</Text>
                            <IconButton icon="close" onPress={() => setOpen(false)} />
                        </View>

                        {/* Sección scrolleable: solo información de la recarga */}
                        <Dialog.ScrollArea style={{ maxHeight: 200 }}>
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={true}
                            >
                                <View style={{ paddingHorizontal: 24, paddingVertical: 8 }}>
                                    <Text style={{ marginTop: 6, fontWeight: 'bold', fontSize: 16 }}>{name}</Text>
                                    {description ? (
                                        <Text style={{ paddingLeft: 10, marginTop: 6, fontWeight: 'bold' }}>{description}</Text>
                                    ) : null}

                                    {hasPromo && promotions?.length > 0 && (
                                        <View>
                                            {promotions.map((promo, index) => (
                                                <View key={index} style={{ marginTop: 10 }}>
                                                    <Text style={{ fontWeight: 'bold', color: '#f50057' }}>{`Promoción #${index + 1}`}</Text>
                                                    <Text style={{ fontWeight: 'bold', color: '#ccc' }}>{promo.title}</Text>
                                                    <Text style={{ fontWeight: 'bold', color: '#ccc' }}>
                                                        Desde el {moment(promo?.startDate).format("DD MMM")} hasta el {moment(promo?.endDate).format("DD MMM")}
                                                    </Text>
                                                    <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                                                        {promo.terms}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        </Dialog.ScrollArea>

                        {/* Sección estática: formulario de inputs */}
                        <View style={styles.formContainer}>
                            <TextInput
                                label="Nombre de la persona"
                                value={nombre}
                                onChangeText={setNombre}
                                mode="outlined"
                                autoComplete='name'
                                style={styles.input}
                                dense
                                returnKeyType="next"
                                blurOnSubmit={false}
                            />

                            {[
                                'requiredCreditPartyIdentifierFields',
                                'requiredBeneficiaryFields',
                                'requiredAdditionalIdentifierFields',
                                'requiredDebitPartyIdentifierFields',
                                'requiredSenderFields',
                                'requiredStatementIdentifierFields'
                            ].map((group) => {
                                const fields = product[group];
                                if (!fields) return null;
                                return fields.flat().map((field, index) => (
                                    <TextInput
                                        key={`${group}-${field}-${index}`}
                                        label={field.replace(/_/g, ' ').toUpperCase()}
                                        value={extraFields[field] || ''}
                                        onChangeText={(value) => handleExtraFieldChange(field, value)}
                                        mode="outlined"
                                        keyboardType={field.replace(/_/g, ' ').toUpperCase().includes("MOBILE NUMBER") ? 'number-pad' : 'default'}
                                        style={styles.input}
                                        dense
                                        maxLength={8}
                                        left={field.replace(/_/g, ' ').toUpperCase().includes("MOBILE NUMBER") ? <TextInput.Affix text="+53" /> : null}
                                        inputMode={field.replace(/_/g, ' ').toUpperCase().includes("MOBILE NUMBER") ? 'tel' : 'default'}
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                    />
                                ));
                            })}
                        </View>

                        {/* Sección estática: botones de acción */}
                        <Dialog.Actions style={styles.actionsContainer}>
                            <Button onPress={() => setOpen(false)} mode="outlined" style={styles.botonesAccion}>
                                Cancelar
                            </Button>
                            <Button onPress={handleSubmit} mode="contained" style={[styles.botonesAccion, { marginLeft: 8 }]}>
                                Confirmar
                            </Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </Surface>
        )
    } else return <></>
};

const styles = StyleSheet.create({
    dialog: {
        borderRadius: 20,
        // maxHeight: '85%',
        // paddingBottom: "10%"
    },
    botonesAccion: {
        borderRadius: 15,
        flex: 1,
    },
    card: {
        margin: 6,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#0b3d2e',
        height: 150,
        width: 280,
    },
    imageBackground: {
        padding: 12,
        borderRadius: 20
    },
    cardContent: {
        justifyContent: 'space-between',
        height: '100%',
        minHeight: 120,
        overflow: 'hidden'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        flexShrink: 1,
        flexWrap: 'wrap',
        maxWidth: 200
    },
    beneficios: {
        marginTop: 1,
        fontSize: 14
    },
    chips: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
        justifyContent: "flex-end",
    },
    chipsComponentRed: {
        backgroundColor: 'red',
        alignContent: "center",
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 4,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 25,
    },
    chipsComponentGreen: {
        backgroundColor: '#4caf50',
        alignContent: "center",
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 4,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 25,
    },
    formContainer: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        maxHeight: 200,
    },
    input: {
        marginBottom: 12
    },
    actionsContainer: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    dialogTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        // paddingTop: 16,
        // paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    dialogTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default CubaCelCard;
