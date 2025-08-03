import React, { useState } from 'react';
import { View, StyleSheet, ImageBackground, ScrollView, Alert } from 'react-native';
import { Card, Title, Chip, IconButton, Portal, Dialog, Button, TextInput, Modal } from 'react-native-paper';
import { useTheme, Text   } from 'react-native-paper';
import { useWindowDimensions, Button as BotonReact} from 'react-native';
import  Meteor  from '@meteorrn/core';
import { BlurView } from '@react-native-community/blur';

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
            movilARecargar: extraFields['mobile_number'],
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
        setExtraFields(prev => ({ ...prev, [field]: value }));
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
                        
                        blurType= {isDarkMode ?"dark":"light"}
                        autoUpdate={false}
                        
                        reducedTransparencyFallbackColor="dark"
                    />
                    <View style={styles.cardContent}>
                        <View style={styles.row}>
                            <IconButton icon="cellphone" iconColor="white" size={16} />
                            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{operadorNombre}</Text>
                        </View>

                        {beneficios() !== '' && (
                            <Text style={styles.beneficios}>Recibirá: {beneficios()}</Text>
                        )}
                        <View style={styles.chips}>
                            {hasPromo && <Chip style={styles.promoChip}>Con promoción</Chip>}
                            <Chip icon="currency-usd" style={styles.priceChip}>{`${precioUSD} USD`}</Chip>
                        </View>
                    </View>
                </ImageBackground>
            </Card>

            <Portal>
                <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog} >
                
                    <View style={styles.dialogTitleContainer}>
                        <Text style={styles.dialogTitleText}>{name}</Text>
                        <IconButton icon="close" onPress={() => setOpen(false)} />
                    </View>
                    <Dialog.ScrollArea>
                        <ScrollView contentContainerStyle={{ paddingHorizontal: 0 }}>
                            <View>
                                
                                {description ? (
                                    <Text style={{ marginTop: 6, fontWeight:'bold' }}>A recibir: {description}</Text>
                                ) : null}

                                {hasPromo && promotions?.length > 0 && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ fontWeight: 'bold', color: '#f50057' }}>Promociones:</Text>
                                        {promotions.map((promo, index) => (
                                            <Text style={{ fontSize: 12 }} key={index} >
                                                {promo.terms}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                            </View>


                        </ScrollView>
                    </Dialog.ScrollArea>
                    

                    <Dialog.Actions style={{maxHeight: "100%"}}>
                    
                    <View style={{ flexDirection: 'column', width: '100%'}}>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 0 }}>
                     
                            <TextInput
                                label="Nombre de la persona"
                                value={nombre}
                                onChangeText={setNombre}
                                mode="outlined"
                                style={styles.input}
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
                                        style={styles.input}
                                    />
                                ));
                            })}
                            </ScrollView>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                <Button onPress={() => setOpen(false)} mode="outlined" style={styles.botonesAccion}>
                                    Cancelar
                                </Button>
                                <Button onPress={handleSubmit} mode="outlined" style={styles.botonesAccion}>
                                    Confirmar
                                </Button>
                            </View>

                        </View>
                        
                        
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
};

const styles = StyleSheet.create({
    dialog: { 
        maxHeight: '100%', 
        borderRadius: 20, 
        padding: 2 
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
      marginTop: 8
    },
    promoChip: {
        backgroundColor: '#f50057',
        marginRight: 6,
        fontWeight: 'bold' // 👈 negrita
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
        paddingTop: 20,
    },

    dialogTitleText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 'bold',
    },
  });
  

export default CubaCelCard;
