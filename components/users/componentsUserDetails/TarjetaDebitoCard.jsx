import React, { useEffect, useMemo, useState } from 'react';
import Meteor from '@meteorrn/core';
import { Card, Text, Button, TextInput } from 'react-native-paper';
import { View, StyleSheet, Alert } from 'react-native';
import CreditCard from 'react-native-credit-card';
// Opcional: intento cargar Clipboard (soporta distintos entornos)
let ClipboardModule = null;
// try {
//   ClipboardModule = require('@react-native-clipboard/clipboard');
// } catch (e) {
//   try {
    ClipboardModule = require('react-native').Clipboard;
//   } catch (_) {}
// }

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
const formatCardNumber = (n) => onlyDigits(n).replace(/(.{4})/g, '$1 ').trim();
// Normaliza un valor (con o sin espacios) a 'dddd dddd dddd dddd' o null si no cumple
const normalizeCardWithSpaces = (v) => {
    const digits = onlyDigits(v);
    if (digits.length !== 16) return null;
    return digits.replace(/(.{4})/g, '$1 ').trim();
};

const TarjetaDebitoCard = ({ item, styles }) => {
    const [loading, setLoading] = useState(true);
    const [tarjeta, setTarjeta] = useState(null); // string con espacios o null
    const [input, setInput] = useState(''); // solo dígitos
    const [saving, setSaving] = useState(false);

    const userId = useMemo(
        () => item?._id,
        [item?._id]
    );
    const isAdmin = useMemo(() => Meteor.user()?.profile?.role === 'admin', [Meteor.user()?.profile?.role]);

    useEffect(() => {
        let mounted = true;
        if (!userId) return;

        Meteor.call('property.getValor', 'CONFIG', `TARJETA_CUP_${userId}`, (error, result) => {
            if (!mounted) return;
            setLoading(false);
            if (error) {
                console.warn('property.getValor TARJETA_CUP error:', error);
                setTarjeta(null);
            } else {
                if (result === null || result === undefined || result === "") {
                    setTarjeta(null);
                } else {
                    const val = typeof result === 'string' ? result.trim() : result;
                    const normalized = normalizeCardWithSpaces(val);
                    setTarjeta(normalized || null); // GUARDAR COMO STRING (CON ESPACIOS)
                }
            }
        });

        return () => { mounted = false; };
    }, [userId]);

    const fullName = useMemo(() => {
        const fn = item?.profile?.firstName || '';
        const ln = item?.profile?.lastName || '';
        const composed = `${fn} ${ln}`.trim();
        return composed || item?.username || 'Usuario';
    }, [item?.profile?.firstName, item?.profile?.lastName, item?.username]);

    const handleSave = () => {
        const raw = onlyDigits(input);
        if (raw.length !== 16) {
            Alert.alert('Validación', 'Ingrese un número de tarjeta válido con 16 dígitos.');
            return;
        }
        const formatted = formatCardNumber(raw); // 'dddd dddd dddd dddd'
        setSaving(true);
        const data = {
            type: 'CONFIG',
            clave: `TARJETA_CUP_${userId}`,
            valor: formatted, // guardar con espacios según requerimiento
        };

        Meteor.call('property.insert', data, (err) => {
            setSaving(false);
            if (err) {
                if (err.error === 'Clave ya existe') {
                    Alert.alert('Error', 'Ya existe una tarjeta registrada para este usuario.');
                } else {
                    Alert.alert('Error', err.reason || 'No se pudo guardar la tarjeta.');
                }
            } else {
                setTarjeta(formatted); // GUARDAR COMO STRING (CON ESPACIOS)
                Alert.alert('Éxito', 'Tarjeta guardada correctamente.');
            }
        });
    };

    // NUEVO: copiar al portapapeles
    const handleCopy = async () => {
        if (!tarjeta) return;
        try {
              if (ClipboardModule?.setString) {
                ClipboardModule.setString(tarjeta);
              } else if (ClipboardModule?.setStringAsync) {
                await ClipboardModule.setStringAsync(tarjeta);
              } else {
                throw new Error('Clipboard no disponible');
              }
              Alert.alert('Copiado', 'La tarjeta de destino fue copiada al portapapeles.');
            } catch (e) {
              Alert.alert('Error', 'No se pudo copiar la tarjeta.');
            }
    };

    if (loading) return null;
    if (!tarjeta && !isAdmin) return null;

    return (
        <Card style={[styles.cards, { borderRadius: 16 }]}>
            <Card.Content>
                <Text style={styles.title}>Tarjeta de Débito (CUP)</Text>
                {!tarjeta ? (
                    <View style={{ marginTop: 8 }}>
                        <TextInput
                            mode="outlined"
                            label="Número de tarjeta"
                            value={formatCardNumber(input)}
                            onChangeText={(v) => setInput(onlyDigits(v))}
                            keyboardType="number-pad"
                            maxLength={19} // 16 dígitos + 3 espacios
                            style={{ marginTop: 8 }}
                        />
                        <Button
                            mode="contained"
                            onPress={handleSave}
                            loading={saving}
                            disabled={saving || onlyDigits(input).length !== 16}
                            style={{ marginTop: 10 }}
                        >
                            Guardar tarjeta
                        </Button>
                    </View>
                ) : (
                    <>
                    <View style={[s.cardWrapper, { alignItems: 'center' }]}>
                        <CreditCard
                            imageFront={require('./BANDEC.jpg')}
                            imageBack={require('./BANDEC.jpg')}
                            bar={true}
                            number={onlyDigits(tarjeta)} // PASAR SOLO DÍGITOS
                            name={fullName}
                        />
                        
                    </View>
                    <Button
                            icon="content-copy"
                            mode="text"
                            onPress={handleCopy}
                            style={btnStyles.action}
                            compact
                        >
                            Copiar número
                        </Button>
                    </>
                   
                )}
            </Card.Content>
        </Card>
    );
};

const s = StyleSheet.create({
    cardWrapper: {
        // marginTop: 12,
        flex: 1
    },
});

const btnStyles = StyleSheet.create({
    action: { marginTop: 8, borderRadius: 20, margin: 15 },
  });
export default TarjetaDebitoCard;
