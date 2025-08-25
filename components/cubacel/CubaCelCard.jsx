import React, { useState } from 'react';
import { View, StyleSheet, ImageBackground, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, Title, Chip, IconButton, Portal, Dialog, Button, TextInput, Modal } from 'react-native-paper';
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
    const theme = useTheme();
    const { width, height } = useWindowDimensions();
    const isDarkMode = theme.dark;

    const precioUSD = prices?.retail?.amount || '---';
    const operadorNombre = operator?.name || 'ETECSA';
    const hasPromo = Array.isArray(promotions) && promotions.length > 0;

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
                Alert.alert("Error", "No se pudo agregar el producto al carrito.\nPor favor, Revise bien los datos o inténtalo de nuevo más tarde.");
            } else {
                console.log('Producto agregado al carrito:', result);
                setOpen(false);
            }
        });
    };

    const handleExtraFieldChange = (field, value) => {
        // Quitamos cualquier caracter que no sea número
        const numericValue = field.replace(/_/g, ' ').toUpperCase().includes("MOBILE NUMBER") ? value.replace(/[^0-9]/g, '') : value;
        setExtraFields(prev => ({ ...prev, [field]: numericValue }));
    };

    return (
        <>
            <Card style={styles.card} onPress={() => setOpen(true)}>

                <ImageBackground
                    source={require('./Gemini_Generated_Image_rtg44brtg44brtg4.png')} // reemplaza por tu imagen local
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
                            {/* {hasPromo && <Chip maxFontSizeMultiplier={0} style={styles.promoChip}><Text style={{fontSize:10}}>Con promoción</Text></Chip>} */}
                            {hasPromo && <View style={styles.chipsComponentRed}><Text style={{ fontSize: 10 }}>Con promoción</Text></View>}
                            <View style={styles.chipsComponentGreen}><Text style={{ fontSize: 10 }}>{`${precioUSD} USD`}</Text></View>

                            {/* <Chip icon="currency-usd"  style={styles.priceChip}><Text style={{fontSize:10}}>{`${precioUSD} USD`}</Text></Chip> */}
                        </View>
                    </View>
                </ImageBackground>
            </Card>

            <Portal>
                <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog} >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                    >
                        <View style={styles.dialogTitleContainer}>
                            <Text style={styles.dialogTitleText}>Recarga</Text>
                            <IconButton icon="close" onPress={() => setOpen(false)} />
                        </View>
                        
                        <Dialog.ScrollArea style={{ flex: 1 }}>
                            <ScrollView 
                                contentContainerStyle={{ paddingHorizontal: 0, flexGrow: 1 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={true}
                            >
                                <View>
                                    <Text style={{ marginTop: 6, fontWeight: 'bold' }}>{name}</Text>
                                    {description ? (
                                        <Text style={{ paddingLeft: 10, marginTop: 6, fontWeight: 'bold' }}>{description}</Text>
                                    ) : null}

                                    {hasPromo && promotions?.length > 0 && (
                                        <View >
                                            {promotions.map((promo, index) => (
                                                <View key={index} style={{ marginTop: 10 }}>
                                                    <Text style={{ fontWeight: 'bold', color: '#f50057' }}>{`Promoción #${index + 1}`}</Text>
                                                    <Text style={{ fontWeight: 'bold', color: '#ccc' }}>{promo.title}</Text>
                                                    <Text style={{ fontWeight: 'bold', color: '#ccc' }}>Desde el {moment(promo?.startDate).format("dddd DD MMMM")} hasta el {moment(promo?.endDate).format("dddd DD MMMM")}</Text>
                                                    <Text style={{ fontWeight: 'bold', color: '#ccc' }}>Descripción: </Text>
                                                    <Text style={{ paddingLeft: 15 }} >
                                                        {promo.terms}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        </Dialog.ScrollArea>

                        <Dialog.Actions style={{ maxHeight: "100%" }}>
                            <View style={{ flexDirection: 'column', width: '100%' }}>
                                <ScrollView 
                                    contentContainerStyle={{ paddingHorizontal: 0, flexGrow: 1 }}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    <TextInput
                                        label="Nombre de la persona"
                                        value={nombre}
                                        onChangeText={setNombre}
                                        mode="outlined"
                                        autoComplete='name'
                                        style={styles.input}
                                        dense
                                        returnKeyType="next"
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
                                </ScrollView>
                                
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingTop: 16 }}>
                                    <Button onPress={() => setOpen(false)} mode="outlined" style={styles.botonesAccion}>
                                        Cancelar
                                    </Button>
                                    <Button onPress={handleSubmit} mode="outlined" style={styles.botonesAccion}>
                                        Confirmar Recarga
                                    </Button>
                                </View>
                            </View>
                        </Dialog.Actions>
                    </KeyboardAvoidingView>
                </Dialog>
            </Portal>
        </>
    );
};

const styles = StyleSheet.create({
    dialog: {
        maxHeight: '95%',
        borderRadius: 20,
        padding: 2,
        flex: 1
    },
    botonesAccion: {
        borderRadius: 15,
    },
    card: {
        margin: 6,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#0b3d2e',
        height: 150,
        width: 280, // 👈 AÑADIDO para que todos tengan el mismo ancho
    },
    imageBackground: {
        padding: 12,
        borderRadius: 20
    },
    cardContent: {
        justifyContent: 'space-between',
        height: '100%',
        minHeight: 120,
        overflow: 'hidden' // 👈 AÑADIDO para evitar que se desborde el contenido
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    title: {
        // color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        flexShrink: 1,
        flexWrap: 'wrap',
        maxWidth: 200 // Ajustable según el diseño
    },
    beneficios: {
        //   color: '#ccc',
        marginTop: 1,
        fontSize: 14
    },
    operador: {
        //   color: '#ccc',
        marginTop: 4,
        fontSize: 12
    },
    chips: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
        justifyContent: "flex-end",

    },
    promoChip: {
        backgroundColor: '#f50057',
        marginRight: 6,
        fontWeight: 'bold' // 👈 negrita
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
    priceChip: {
        backgroundColor: '#4caf50',
        fontWeight: 'bold' // 👈 negrita
        //   color: '#fff'
    },
    input: {
        marginBottom: 10
    },
    dialogTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingLeft: 20,
    },

    dialogTitleText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 'bold',
    },
});


export default CubaCelCard;
