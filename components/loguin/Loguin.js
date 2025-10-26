import React, { useState, useEffect } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  Appearance,
  Dimensions,
  ImageBackground,
  Platform,
} from 'react-native';
import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import { BlurView } from '@react-native-community/blur';
import { appleAuth } from '@invertase/react-native-apple-authentication';

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');
import { ConfigCollection, Mensajes } from '../collections/collections';

import { SafeAreaView } from 'react-native-safe-area-context';
import { loginWithGoogle, loginWithApple } from '../../utilesMetodos/metodosUtiles';

const Loguin = ({ navigation }) => {
  // Estado usando useState
  const [ipserver, setIpserver] = useState('vidkar.ddns.net');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  // Efectos usando useEffect (reemplazan componentDidMount y componentWillUnmount)
  useEffect(() => {
    // Conectar a Meteor
    Meteor.connect('wss://www.vidkar.com:6000/websocket');

    // Suscripción a cambios de dimensiones
    const dimSub = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window || {};
      setIsLandscape(width > height);
    });

    // Suscripción a cambios de tema
    const themeSub = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });

    // Listener para credenciales de Apple revocadas (solo en iOS)
    let appleCredentialsRevoked = null;
    if (Platform.OS === 'ios') {
      appleCredentialsRevoked = appleAuth.onCredentialRevoked(async () => {
        console.warn('Apple credentials have been revoked. User should be logged out.');
        // Aquí puedes agregar lógica para cerrar sesión automáticamente
        // Por ejemplo: Meteor.logout();
      });
    }

    // Cleanup al desmontar el componente
    return () => {
      dimSub?.remove?.();
      themeSub?.remove?.();
      // Limpiar listener de Apple
      if (appleCredentialsRevoked) {
        appleCredentialsRevoked();
      }
    };
  }, []);

  // Método de login
  const onLogin = () => {
    try {
      Meteor.loginWithPassword(username, password, function (error) {
        error && Alert.alert('Credenciales incorrectas');
      });
    } catch (error) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar al servidor: ' + ipserver,
      );
    }
  };

  const permitirLoginWithGoogle = useTracker(() => {
    if(!Meteor.status()?.connected) return null;
    let sub = Meteor.subscribe(
      'propertys', {
      "active": true,
      "type": "CONFIG",
      "clave": "LOGIN_WITH_GOOGLE"
    }
    );
    console.log("sub",sub?.ready());
    // console.log(VentasCollection.find({ adminId: id}).fetch());
    // console.log(VentasCollection.find({ adminId: id }).count() > 0);
    return ConfigCollection.findOne({ 
      "active" : true,
      "type" : "CONFIG",
      "clave" : "LOGIN_WITH_GOOGLE"
     });
  });

  const permitirLoginWithApple = useTracker(() => {
    if(!Meteor.status()?.connected) return null;
    let sub = Meteor.subscribe(
      'propertys', {
      "active": true,
      "type": "CONFIG",
      "clave": "LOGIN_WITH_APPLE"
    }
    );
    console.log("sub apple",sub?.ready());
    return ConfigCollection.findOne({ 
      "active" : true,
      "type" : "CONFIG",
      "clave" : "LOGIN_WITH_APPLE"
     });
  });

  // Método de login con Google
  const onGoogleLogin = () => {
    try {
      if (loadingGoogle) return;
      setLoadingGoogle(true);

      const options = {
        clientId: '1043110071233-pbeoteq8ua30rsbqmk8dtku6hcmeekci.apps.googleusercontent.com',
        iosClientId: '1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        forceCodeForRefreshToken: false,
      };

      const done = (err) => {
        setLoadingGoogle(false);
        if (err) {
          Alert.alert('Google', err.reason || err.message || 'Error iniciando sesión con Google.');
          return;
        }
      };

      if (typeof loginWithGoogle === 'function') {
        loginWithGoogle(options, done);
      } else {
        setLoadingGoogle(false);
        Alert.alert('Google', 'Proveedor de Google no disponible en el cliente.');
      }
    } catch (error) {
      Alert.alert('Error de Conexión', error);
    }
  };

  // Método de login con Apple
  const onAppleLogin = () => {
    try {
      if (loadingApple) return;
      setLoadingApple(true);

      const done = (err) => {
        setLoadingApple(false);
        if (err) {
          Alert.alert('Apple', err.reason || err.message || 'Error iniciando sesión con Apple.');
          return;
        }
      };

      if (typeof loginWithApple === 'function') {
        loginWithApple(done);
      } else {
        setLoadingApple(false);
        Alert.alert('Apple', 'Proveedor de Apple no disponible en el cliente.');
      }
    } catch (error) {
      setLoadingApple(false);
      Alert.alert('Error de Conexión', 'Error iniciando sesión con Apple: ' + error);
    }
  };

  const backgroundStyle = {
    minHeight: "100%",
    minWidth: "100%",
    marginTop: isLandscape ? 0 : "5%",
  };

  return (
    <View style={{ minHeight: "100%", minWidth: "100%" }}>
      <ImageBackground
        source={require('../files/space-bg-shadowcodex.jpg')}
        style={{
          width: "100%",
          height: "100%",
          position: 'relative',
          left: 0,
          top: 0,
          zIndex: 0,
        }}
        resizeMode="cover"
        onLoad={() => console.log('[Loguin] Fondo cargado correctamente')}
        onError={(e) => console.warn('[Loguin] Error cargando fondo:', e.nativeEvent?.error)}
      />

      <SafeAreaView style={{
        position: 'absolute',
        minHeight: '100%',
        minWidth: '100%'
      }}>
        <ScrollView
          contentContainerStyle={isLandscape ? styles.scrollLandscapeContent : undefined}
        >
          <View style={[
            backgroundStyle,
            isLandscape ? styles.mainLandscape : styles.mainPortrait
          ]}>
            {/* PANE IZQUIERDO: icono + VIDKAR */}
            <View style={[
              styles.container,
              isLandscape && styles.brandLandscape
            ]}>
              <Text style={{ fontSize: 30, color: 'white' }}>
                <FontAwesome5Icon name="house-user" size={100} />
              </Text>
              <Text style={{ fontSize: 30, color: 'white' }}>🅥🅘🅓🅚🅐🅡</Text>
            </View>

            {/* PANE DERECHO: login */}
            <View style={[
              styles.container,
              isLandscape && styles.formLandscape,
            ]}>
              <View style={styles.blurCard}>
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType={isDarkMode ? 'black' : 'light'}
                  blurAmount={5}
                  blurRadius={5}
                />
                <View style={styles.blurCardContent}>
                  <Text style={{ fontSize: 16, justifyContent: 'center', alignContent: 'center', textAlign: 'center' }}>
                    Inicio de Session
                  </Text>
                  <TextInput
                    mode="flat"
                    value={username}
                    onChangeText={setUsername}
                    label={'Usuario'}
                    returnKeyType="next"
                    dense={true}
                    style={{
                      backgroundColor: 'transparent',
                      width: 250,
                      marginBottom: 10,
                    }}
                  />
                  <TextInput
                    mode="flat"
                    value={password}
                    onChangeText={setPassword}
                    label={'Contraseña'}
                    returnKeyType="done"
                    secureTextEntry={true}
                    dense={true}
                    style={{
                      backgroundColor: 'transparent',
                      width: 250,
                      marginBottom: 10,
                    }}
                  />
                  <Button mode="contained" onPress={onLogin}>
                    Iniciar Sessión
                  </Button>

                  <View style={{ height: 12 }} />
                  {permitirLoginWithGoogle?.valor == 'true' && 
                  (<>
                    <Text style={{ fontSize: 16, justifyContent: 'center', alignContent: 'center', textAlign: 'center' }}>O</Text>
                  <View style={{ height: 10 }} />
                  <Button
                    mode="outlined"
                    icon="google"
                    onPress={onGoogleLogin}
                    disabled={loadingGoogle}
                    loading={loadingGoogle}
                  >
                    Entrar con Google
                  </Button>
                  </>)
                  }

                  {permitirLoginWithApple?.valor == 'true' && Platform.OS === 'ios' && 
                  (<>
                    <View style={{ height: 10 }} />
                    <Button
                      mode="outlined"
                      icon="apple"
                      onPress={onAppleLogin}
                      disabled={loadingApple}
                      loading={loadingApple}
                    >
                      Entrar con Apple
                    </Button>
                  </>)
                  }
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Loguin;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    zIndex: 1,
  },
  blurCard: {
    position: 'relative',
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  blurCardContent: {
    padding: 15,
  },
  mainLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mainPortrait: {
    flexDirection: 'column',
  },
  brandLandscape: {
    marginRight: 24,
  },
  formLandscape: {
    marginLeft: 24,
  },
  scrollLandscapeContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 0,
  },
});
