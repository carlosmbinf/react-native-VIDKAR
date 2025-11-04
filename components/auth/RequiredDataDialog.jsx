import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Keyboard, Platform } from 'react-native';
import {
    Portal,
    Dialog,
    Text,
    TextInput,
    Button,
    HelperText,
    Divider,
    useTheme,
} from 'react-native-paper';
import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';

const RequiredDataDialog = () => {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Estados del formulario
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [email, setEmail] = useState('');
    const [movil, setMovil] = useState('');

    // Estados de validación
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showRepeatPassword, setShowRepeatPassword] = useState(false);

    // Suscripción reactiva al usuario actual
    const { userActual, ready } = useTracker(() => {
        const handle = Meteor.subscribe('user', { _id: Meteor.userId() });
        return {
            userActual: Meteor.user(),
            ready: handle.ready(),
        };
    });

    // Verificar campos existentes
    const usernameExist = userActual?.username;
    const passwordExist = userActual?.services?.password?.bcrypt;
    const emailExist = userActual?.emails?.[0]?.address;
    const movilExist = userActual?.movil;

    // Listeners de teclado con factor de desplazamiento mayor
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showListener = Keyboard.addListener(showEvent, (event) => {
            setKeyboardHeight(event.endCoordinates.height);
        });

        const hideListener = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    // Detectar si faltan datos obligatorios
    useEffect(() => {
        if (ready && userActual) {
            const needsData = !usernameExist || !passwordExist || !emailExist || !movilExist;

            const timer = setTimeout(() => {
                setVisible(needsData);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [ready, usernameExist, passwordExist, emailExist, movilExist]);

    // ...existing validation functions...

    const validateUsername = (value) => {
        if (!value || value.length < 3) {
            return 'El usuario debe tener al menos 3 caracteres';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            return 'Solo letras, números y guión bajo';
        }
        return null;
    };

    const validatePassword = (value) => {
        if (!value || value.length < 6) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }
        return null;
    };

    const validateEmail = (value) => {
        if (!value) {
            return 'El email es obligatorio';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Email inválido';
        }
        return null;
    };

    const validateMovil = (value) => {
        const movilNum = parseInt(value);
        if (!movilNum || movilNum < 51000000) {
            return 'Número de móvil inválido (debe ser mayor a 51000000)';
        }
        return null;
    };

    const validateForm = () => {
        const newErrors = {};

        if (!usernameExist) {
            const usernameError = validateUsername(username);
            if (usernameError) newErrors.username = usernameError;
        }

        if (!passwordExist) {
            const passwordError = validatePassword(password);
            if (passwordError) newErrors.password = passwordError;

            if (password !== repeatPassword) {
                newErrors.repeatPassword = 'Las contraseñas no coinciden';
            }
        }

        if (!emailExist) {
            const emailError = validateEmail(email);
            if (emailError) newErrors.email = emailError;
        }

        if (!movilExist) {
            const movilError = validateMovil(movil);
            if (movilError) newErrors.movil = movilError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        Keyboard.dismiss();

        if (!validateForm()) {
            Alert.alert('Error', 'Por favor corrija los errores antes de continuar');
            return;
        }

        setLoading(true);

        try {
            const data = {
                id: Meteor.userId(),
            };

            if (!usernameExist && username) data.username = username.trim();
            if (!passwordExist && password) data.password = password;
            if (!emailExist && email) data.email = email?.trim().toLowerCase();
            if (!movilExist && movil) data.movil = parseInt(movil);

            Meteor.call('user.updateRequiredData', data, (error) => {
                setLoading(false);

                if (error) {
                    Alert.alert('Error', error.reason || 'No se pudieron guardar los datos. Intente nuevamente.');
                } else {
                    Alert.alert(
                        '¡Éxito!',
                        'Sus datos fueron guardados correctamente.',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setVisible(false);
                                    if (!usernameExist || !passwordExist) {
                                        setTimeout(() => {
                                            Alert.alert(
                                                'Sesión actualizada',
                                                'Por favor inicie sesión nuevamente con sus nuevas credenciales.',
                                                [{ text: 'OK', onPress: () => Meteor.logout() }]
                                            );
                                        }, 500);
                                    }
                                },
                            },
                        ]
                    );
                }
            });
        } catch (error) {
            console.log(error);
            setLoading(false);
            Alert.alert('Error', 'Ocurrió un problema. Reintente nuevamente.');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Cerrar sesión',
            '¿Está seguro que desea salir sin completar sus datos?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: () => Meteor.logout(),
                },
            ]
        );
    };

    if (!ready || !userActual) return null;

    // Estilo dinámico con desplazamiento mayor para mostrar botones
    const dialogStyle = {
        ...styles.dialog,
        marginTop: Platform.OS === 'ios'
            ? -keyboardHeight  // Mayor desplazamiento en iOS
            : -keyboardHeight,  // Mayor desplazamiento en Android
    };

    return (
        <Portal>
            <Dialog
                visible={visible}
                dismissable={false}
                style={dialogStyle}
            >
                <Dialog.Title style={styles.title}>
                    Completar datos obligatorios
                </Dialog.Title>

                <Dialog.ScrollArea style={styles.scrollArea}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >
                        <Text style={styles.description}>
                            Debe completar los siguientes datos para continuar usando VidKar.
                        </Text>

                        <Text style={styles.warning}>
                            Nota: Su sesión puede cerrarse al guardar. Podrá iniciar sesión con
                            su usuario/contraseña o mediante los inicios de sesión de terceros.
                        </Text>

                        <Divider style={styles.divider} />

                        {/* Usuario */}
                        {!usernameExist && (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    label="Usuario *"
                                    value={username}
                                    onChangeText={setUsername}
                                    mode="outlined"
                                    autoCapitalize="none"
                                    error={!!errors.username}
                                    disabled={loading}
                                    left={<TextInput.Icon icon="account" />}
                                    dense
                                    returnKeyType="next"
                                />
                                {errors.username && (
                                    <HelperText type="error" visible={!!errors.username}>
                                        {errors.username}
                                    </HelperText>
                                )}
                            </View>
                        )}

                        {/* Contraseña */}
                        {!passwordExist && (
                            <>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        label="Contraseña *"
                                        value={password}
                                        onChangeText={setPassword}
                                        mode="outlined"
                                        secureTextEntry={!showPassword}
                                        error={!!errors.password}
                                        disabled={loading}
                                        left={<TextInput.Icon icon="lock" />}
                                        right={
                                            <TextInput.Icon
                                                icon={showPassword ? 'eye-off' : 'eye'}
                                                onPress={() => setShowPassword(!showPassword)}
                                            />
                                        }
                                        dense
                                        returnKeyType="next"
                                    />
                                    {errors.password && (
                                        <HelperText type="error" visible={!!errors.password}>
                                            {errors.password}
                                        </HelperText>
                                    )}
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        label="Repetir contraseña *"
                                        value={repeatPassword}
                                        onChangeText={setRepeatPassword}
                                        mode="outlined"
                                        secureTextEntry={!showRepeatPassword}
                                        error={!!errors.repeatPassword}
                                        disabled={loading}
                                        left={<TextInput.Icon icon="lock-check" />}
                                        right={
                                            <TextInput.Icon
                                                icon={showRepeatPassword ? 'eye-off' : 'eye'}
                                                onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                                            />
                                        }
                                        dense
                                        returnKeyType="next"
                                    />
                                    {errors.repeatPassword && (
                                        <HelperText type="error" visible={!!errors.repeatPassword}>
                                            {errors.repeatPassword}
                                        </HelperText>
                                    )}
                                </View>
                            </>
                        )}

                        {/* Email */}
                        {!emailExist && (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    label="Email *"
                                    value={email}
                                    onChangeText={setEmail}
                                    mode="outlined"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={!!errors.email}
                                    disabled={loading}
                                    left={<TextInput.Icon icon="email" />}
                                    dense
                                    returnKeyType="next"
                                />
                                {errors.email && (
                                    <HelperText type="error" visible={!!errors.email}>
                                        {errors.email}
                                    </HelperText>
                                )}
                            </View>
                        )}

                        {/* Móvil */}
                        {!movilExist && (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    label="Número de móvil *"
                                    value={movil}
                                    onChangeText={setMovil}
                                    mode="outlined"
                                    keyboardType="phone-pad"
                                    error={!!errors.movil}
                                    disabled={loading}
                                    left={<TextInput.Icon icon="phone" />}
                                    placeholder="Ej: 55267327"
                                    dense
                                    returnKeyType="done"
                                    onSubmitEditing={handleSave}
                                />
                                {errors.movil && (
                                    <HelperText type="error" visible={!!errors.movil}>
                                        {errors.movil}
                                    </HelperText>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </Dialog.ScrollArea>

                <Dialog.Actions style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={handleLogout}
                        disabled={loading}
                        textColor={theme.colors.error}
                        compact
                    >
                        Cerrar sesión
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={loading}
                        disabled={loading}
                        compact
                    >
                        Guardar
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    dialog: {
        maxWidth: 500,
        alignSelf: 'center',
        borderRadius: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingBottom: 8,
    },
    scrollArea: {
        paddingHorizontal: 0,
        maxHeight: 350, // ✅ Altura máxima de 350px
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
        flexGrow: 0,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        color: '#666',
        marginBottom: 8,
    },
    warning: {
        fontSize: 12,
        lineHeight: 18,
        fontStyle: 'italic',
        color: '#FF6F00',
        backgroundColor: '#FFF3CD',
        padding: 8,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#FF6F00',
    },
    divider: {
        marginVertical: 12,
    },
    inputContainer: {
        marginBottom: 8,
    },
    actions: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
});

export default RequiredDataDialog;