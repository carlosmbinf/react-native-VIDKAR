import React, { useState } from 'react';
import { View, StyleSheet, ImageBackground, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Card, Title, Chip, IconButton, Portal, Dialog, Button, TextInput, Modal, Surface } from 'react-native-paper';
import { useTheme, Text } from 'react-native-paper';
import { useWindowDimensions, Button as BotonReact } from 'react-native';
import Meteor from '@meteorrn/core';
import { BlurView } from '@react-native-community/blur';
import moment from 'moment';
import 'moment/locale/es';

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
    
    // Nuevo: Estados para precios convertidos
    const [precioCUP, setPrecioCUP] = useState(null);
    const [precioUYU, setPrecioUYU] = useState(null);
    const [loadingPrecios, setLoadingPrecios] = useState(true);
    
    const theme = useTheme();
    const { width, height } = useWindowDimensions();
    const isDarkMode = theme.dark;

    const precioUSD = prices?.retail?.amount || '---';
    const operadorNombre = operator?.name || 'ETECSA';
    const hasPromo = Array.isArray(promotions) && promotions.length > 0;

    // Nueva: extraer URL de imagen desde promociones (Markdown ![](url) o URL plana)
    const extractPromoImageUrl = (promos = []) => {
        for (const p of promos) {
            const text = [p?.terms, p?.description, p?.title].filter(Boolean).join(' ');
            // Markdown: ![alt](https://...)
            const md = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
            if (md?.[1]) return md[1];
            // URL plana como fallback
            const plain = text.match(/https?:\/\/[^\s)]+/i);
            if (plain?.[0]) return plain[0];
        }
        return null;
    };

    // Memorizar URL de imagen promocional
    const promoImageUrl = hasPromo && React.useMemo(() => extractPromoImageUrl(promotions), [promotions]);

    // Estado: si falla la imagen remota, volver a la imagen local
    const [bgLoadError, setBgLoadError] = useState(false);

    // Imagen local por defecto
    const localFallback = require('./Gemini_Generated_Image_rtg44brtg44brtg4.png');

    // Source condicional para el fondo
    const backgroundSource = promoImageUrl && !bgLoadError ? { uri: promoImageUrl } : localFallback;

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

    // Nuevo: Cargar precios convertidos al montar el componente
    React.useEffect(() => {
        const cargarPreciosConvertidos = async () => {
            if (precioUSD === '---' || typeof precioUSD !== 'number') {
                setLoadingPrecios(false);
                return;
            }

            try {
                setLoadingPrecios(true);
                
                // Convertir de USD a CUP
                const precioConvertidoCUP = await new Promise((resolve, reject) => {
                    Meteor.call('moneda.convertir', precioUSD, 'USD', 'CUP', null, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                });

                // Convertir de USD a UYU
                const precioConvertidoUYU = await new Promise((resolve, reject) => {
                    Meteor.call('moneda.convertir', precioUSD, 'USD', 'UYU', null, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                });

                setPrecioCUP(precioConvertidoCUP);
                setPrecioUYU(precioConvertidoUYU);
            } catch (error) {
                console.error('Error al convertir precios:', error);
                // Mantener valores null en caso de error
            } finally {
                setLoadingPrecios(false);
            }
        };

        cargarPreciosConvertidos();
    }, [precioUSD]);

    React.useEffect(() => {
        moment.locale('es');
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

    // Nueva: extraer fechas de la primera promoción
    const promo = hasPromo ? promotions[0] : null;
    const promoStartDate = promo?.startDate ? moment(promo.startDate).format("DD MMM") : null;
    const promoEndDate = promo?.endDate ? moment(promo.endDate).format("DD MMM") : null;

    // Nuevo: determinar si la promoción está activa o es adelantada
    const getPromoStatus = () => {
        if (!promo?.startDate) return null;
        
        const now = moment();
        const startDate = moment(promo.startDate);
        const endDate = promo.endDate ? moment(promo.endDate) : null;
        
        // Si la fecha de inicio es futura, es adelantada
        if (startDate.isAfter(now)) {
            return 'ADELANTADA';
        }
        
        // Si ya comenzó y no ha terminado (o no tiene fecha fin), está activa
        if (startDate.isSameOrBefore(now) && (!endDate || endDate.isAfter(now))) {
            return 'ACTIVA';
        }
        
        // Si ya terminó, no mostrar ribbon
        return null;
    };

    const promoStatus = getPromoStatus();

    if (precioUSD != "---") {
        return (
            <View>
                <Card style={styles.card} onPress={() => setOpen(true)}>
                    <ImageBackground
                        source={backgroundSource}
                        // defaultSource solo iOS: muestra el fallback mientras carga la remota
                        defaultSource={Platform.OS === 'ios' ? localFallback : undefined}
                        onError={() => setBgLoadError(true)}
                        resizeMode="cover"
                        imageStyle={{ borderRadius: 20 }}
                        style={styles.imageBackground}
                    >
                        {/* Cintillo de promoción dinámico según estado */}
                        {hasPromo && promoStatus && (
                            <View style={[
                                styles.ribbonContainer,
                                promoStatus === 'ADELANTADA' && styles.ribbonContainerAdelantada
                            ]}>
                                <Text style={styles.ribbonText}>
                                    {promoStatus === 'ACTIVA' ? '🎁 PROMOCIÓN ACTIVA' : '⏰ ADELANTA PROMO'}
                                </Text>
                            </View>
                        )}

                        { !promoImageUrl && <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType={isDarkMode ? "dark" : "light"}
                            autoUpdate={false}
                            reducedTransparencyFallbackColor="dark"
                        />}
                        <View style={styles.cardContent}>
                            <View style={styles.row}>
                                {!promoImageUrl && <><IconButton icon="cellphone" iconColor="white" size={16} />
                                <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{operadorNombre}</Text></>}
                            </View>

                            {beneficios() !== '' && !promoImageUrl && (
                                <Text style={styles.beneficios}>Beneficios: {"\n" + beneficios()}</Text>
                            )}
                            {/* Modificado: Chips con 3 monedas */}
                            <View style={styles.chips}>
                                {/* USD (principal) */}
                                <View style={styles.chipsComponentGreen}>
                                    <Text style={styles.chipText}>{`${precioUSD} USD`}</Text>
                                </View>

                                {/* CUP */}
                                {!loadingPrecios && precioCUP !== null && (
                                    <View style={styles.chipsComponentBlue}>
                                        <Text style={styles.chipText}>{`${precioCUP} CUP`}</Text>
                                    </View>
                                )}

                                {/* UYU */}
                                {!loadingPrecios && precioUYU !== null && (
                                    <View style={styles.chipsComponentOrange}>
                                        <Text style={styles.chipText}>{`${precioUYU} UYU`}</Text>
                                    </View>
                                )}

                                {/* Loading indicator */}
                                {loadingPrecios && (
                                    <View style={styles.chipsComponentGray}>
                                        <Text style={styles.chipText}>Cargando Precios...</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Nuevo: Footer de promoción */}
                        {hasPromo && promoStartDate && promoEndDate && (
                            <View style={styles.promoFooter}>
                                <View style={styles.promoFooterContent}>
                                    <IconButton 
                                        icon="calendar-clock" 
                                        iconColor="#fff" 
                                        size={14} 
                                        style={styles.promoFooterIcon}
                                    />
                                    <Text style={styles.promoFooterText}>
                                        {promoStartDate} - {promoEndDate}
                                    </Text>
                                </View>
                            </View>
                        )}
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
                                    {/* {description ? (
                                        <Text style={{ paddingLeft: 10, marginTop: 6, fontWeight: 'bold' }}>{description}</Text>
                                    ) : null} */}

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
            </View>
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
        margin: 15,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#0b3d2e',
        height: 150,
        width: 280,
    },
    imageBackground: {
        paddingTop: 12,
        // paddingHorizontal: 12,
        paddingBottom: 0, // Nuevo: eliminar padding bottom para que footer quede pegado al borde
        borderRadius: 20,
        flex: 1,
        justifyContent: 'space-between',
    },
    cardContent: {
        justifyContent: 'space-between',
        minHeight: 120,
        overflow: 'hidden',
        flex: 1,
        paddingBottom: 8, // Nuevo: compensar el padding que quitamos del ImageBackground
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
        marginTop: -35,
        marginLeft:8,
        fontSize: 12
    },
    chips: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
        paddingLeft:8,
        paddingBottom: 0,
        justifyContent: "flex-start",
        flexWrap: 'wrap', // Nuevo: permitir que los chips se envuelvan si no caben
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
    // Nuevo: Chip azul para CUP
    chipsComponentBlue: {
        backgroundColor: '#2196f3',
        alignContent: "center",
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 4,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 25,
    },
    // Nuevo: Chip naranja para UYU
    chipsComponentOrange: {
        backgroundColor: '#ff9800',
        alignContent: "center",
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 4,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 25,
    },
    // Nuevo: Chip gris para loading
    chipsComponentGray: {
        backgroundColor: '#9e9e9e',
        alignContent: "center",
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 4,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 25,
    },
    // Nuevo: Estilo de texto para chips
    chipText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
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
    // Nuevo: Estilos del ribbon profesional
    ribbonContainer: {
        position: 'absolute',
        top: 25,
        right: -55,
        backgroundColor: '#4caf50',
        paddingVertical: 6,
        paddingHorizontal: 45,
        transform: [{ rotate: '45deg' }],
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 4.65,
        // Nuevo: asegurar centrado del contenido
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Nuevo: Ribbon para promoción adelantada (naranja/ámbar)
    ribbonContainerAdelantada: {
        backgroundColor: '#FF6F00', // Naranja oscuro profesional
        // Opcional: animación sutil de pulso para llamar la atención
    },
    ribbonText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '800',
        textAlign: 'center',
        textTransform: 'uppercase',
        // letterSpacing: 0.8,
        // Nuevo: asegurar que el texto ocupe el ancho necesario
        // width: '100%',
    },
    // Nuevo: Estilos del footer de promoción
    promoFooter: {
        backgroundColor: 'rgba(0, 0, 102, 0.80)', // Rosa semi-transparente para coherencia con ribbon
        // borderBottomLeftRadius: 20,
        // borderBottomRightRadius: 20,
        // paddingVertical: 6, // Restaurado: padding vertical para el footer
        // paddingHorizontal: 12,
        // marginTop: 'auto', // Empuja el footer al final
        width: '',
    },
    promoFooterContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    promoFooterIcon: {
        margin: 0,
        padding: 0,
    },
    promoFooterText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
});

export default CubaCelCard;
