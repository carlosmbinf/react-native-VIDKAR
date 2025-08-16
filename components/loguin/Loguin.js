import React, { Component } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
  ImageBackground, // agregado
} from 'react-native';
import Meteor, { Accounts, Mongo, withTracker } from '@meteorrn/core';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import { BlurView } from '@react-native-community/blur'; // NUEVO
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'; // NUEVO

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');
import { Mensajes } from '../collections/collections';

// import Video from 'react-native-video'; // comentado: ya no se usa video
import { SafeAreaView } from 'react-native-safe-area-context';
//import HeroBot from '../animations/HeroBot';

class Loguin extends Component {
  componentDidMount() {
    // Orientation.unlockAllOrientations();
    this.dimSub = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window || {};
      this.setState({ isLandscape: width > height });
    });

    // Configura tu webClientId de Google (OAuth 2.0 client ID - tipo Web) desde Google Cloud Console
    GoogleSignin.configure({
      // hostedDomain: "vidkar.com", // dominio de tu empresa, si aplica
      webClientId: '1043110071233-pbeoteq8ua30rsbqmk8dtku6hcmeekci.apps.googleusercontent.com', // client id válido
      iosClientId: "1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com",
      scopes: ['profile', 'email'],
      offlineAccess: false,
    });
  }

  componentWillUnmount() {
    // Orientation.lockToPortrait();
    this.dimSub?.remove?.();
  }

  constructor(props) {
    super(props);
    const { navigation } = this.props;
    Meteor.connect('ws://www.vidkar.com:6000/websocket'); //www.vidkar.com:6000

    // Meteor.user() && navigation.navigate('Peliculas');

    // Meteor.user()&& (Meteor.user().profile.role == "admin" ? navigation.navigate('Users') : navigation.navigate('User', { item: Meteor.userId() }))

    this.state = {
      ipserver: 'vidkar.ddns.net',
      username: '',
      password: '',
      // isDarkMode: useColorScheme,
      isLandscape: screenWidth > screenHeight, // NUEVO
      loadingGoogle: false, // NUEVO
    };
  }

  onLogin() {
    const { username, password } = this.state;
    const { navigation } = this.props;
    try {
    } catch (error) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar al servidor: ' + this.state.ipserver,
      );
    }
    // Note the /websocket after your URL

    // let version = 1
    // Meteor.subscribe('mensajes');
    // console.log(Mensajes.find({type:'version'}).fetch());
    // Mensajes.findOne({type:'version'}).version > version ? Alert.alert("Nueva Actualización", "Existe una nueva Actualizacion de la APK. Actualícela porfavor!!!\n\nMejoras:\n " +  Mensajes.findOne({type:'version'}).cambios):
    // navigation.navigate('Peliculas')
    Meteor.loginWithPassword(username, password, function (error) {
      error && Alert.alert('Credenciales incorrectas');
      // !error && navigation.navigate('Peliculas');
      // !error && (Meteor.users.findOne({ username: username }).profile && Meteor.users.findOne({ username: username }).profile.role == "admin" ? navigation.navigate('Users') : navigation.navigate('User', { item: Meteor.users.findOne({ username: username })._id }));
    });
  }

  // NUEVO: login con Google
  onGoogleLogin = async () => {
    if (this.state.loadingGoogle) return;
    try {
      this.setState({ loadingGoogle: true });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Limpia sesión previa si quedó a medias
      try { await GoogleSignin.signOut(); } catch (_) {}

      const userInfo = await GoogleSignin.signIn();
      console.log('[Google] user:', userInfo?.user);
      const { idToken } = userInfo || {};

      let accessToken;
      try {
        const tokens = await GoogleSignin.getTokens();
        accessToken = tokens?.accessToken;
      } catch (e) {
        console.log('[Google] getTokens error:', e?.message || e);
      }

      if (!idToken && !accessToken) {
        Alert.alert('Google', 'No se pudo obtener credenciales de Google.');
        this.setState({ loadingGoogle: false });
        return;
      }

      // Usa tu método Meteor para intercambiar el token de Google por un loginToken de Meteor
      Meteor.call('auth.googleSignIn', { idToken, accessToken }, (err, res) => {
        this.setState({ loadingGoogle: false });
        if (err) {
          console.log('[Google][Meteor] error:', err);
          Alert.alert('Google', err?.reason || 'Error iniciando sesión con Google.');
          return;
        }
        // Si el servidor devuelve un token de sesión de Meteor, completa el login en el cliente
        const loginToken = res?.token || res?.loginToken || res?.resume;
        if (loginToken && Accounts?.loginWithToken) {
          Accounts.loginWithToken(loginToken, (e2) => {
            if (e2) {
              Alert.alert('Google', e2?.reason || 'No se pudo completar el inicio de sesión.');
              return;
            }
            // Éxito: ya estás autenticado en Meteor
            // ...existing code... navegación post login si aplica
          });
        } else {
          // Si tu método ya inicia sesión en el servidor o no devuelve token, nada más que hacer
          // ...existing code...
        }
      });
    } catch (error) {
      this.setState({ loadingGoogle: false });
      console.log('[Google] signIn error:', JSON.stringify(error, null, 2));
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error?.code === statusCodes.IN_PROGRESS) return;
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google', 'Google Play Services no disponible o desactualizado.');
        return;
      }
      Alert.alert('Google', 'Ocurrió un error al iniciar sesión.');
    }
  };

  render() {
    // Meteor.userId()&&Meteor.subscribe("usersId",Meteor.userId())
    const { isLandscape } = this.state;

    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: "100%",
      minWidth: "100%",
      marginTop: "5%"
    };

    return (
      <View style={{ minHeight: "100%", minWidth: "100%" }}>
        {/* Fondo de video comentado */}
        {/*
        <Video
          source={require('../files/background.mp4')}
          style={{
            backgroundColor: 'black',
            width: "100%",
            height: "100%",
            position: 'relative',
            left: 0,
            top: 0,
            zIndex: 0,
          }}
          muted={true}
          repeat={true}
          resizeMode={'cover'}
          rate={1.0}
          ignoreSilentSwitch={'obey'}
        />
        */}
        {/* Nuevo fondo con imagen (corregido a .png) */}
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

        {/* overlay con el contenido */}
        <SafeAreaView style={{
          position: 'absolute',
          minHeight: '100%',
          minWidth: '100%'
        }}>
          <ScrollView >
            <View style={[
              backgroundStyle,
              isLandscape ? styles.mainLandscape : styles.mainPortrait // NUEVO
            ]}>
              {/* PANE IZQUIERDO: icono + VIDKAR */}
              <View style={[
                styles.container,
                isLandscape && styles.brandLandscape // NUEVO
              ]}>
                <Text style={{ fontSize: 30, color: 'white' }}>
                  <FontAwesome5Icon name="house-user" size={100} />
                </Text>
                <Text style={{ fontSize: 30, color: 'white' }}>🅥🅘🅓🅚🅐🅡</Text>
              </View>

              {/* PANE DERECHO: login */}
              <View style={[
                styles.container,
                isLandscape && styles.formLandscape, // NUEVO
                {}
              ]}>
                {/* REEMPLAZO: card con blur */}
                <View style={styles.blurCard}>
                  <BlurView
                    style={StyleSheet.absoluteFill}
                    // blurType="light"
                    blurAmount={2}
                    blurRadius={2}
                    // reducedTransparencyFallbackColor="rgba(255,255,255,0.6)"
                  />
                  <View style={styles.blurCardContent}>
                    <TextInput
                      mode="flat"
                      value={this.state.username}
                      onChangeText={username => this.setState({ username })}
                      label={'Username'}
                      returnKeyType="next"
                      dense={true}
                      style={{
                        backgroundColor: 'transparent', // antes: "none"
                        width: 200,
                        marginBottom: 10,
                      }}
                    />
                    <TextInput
                      mode="flat"
                      value={this.state.password}
                      onChangeText={password => this.setState({ password })}
                      label={'Password'}
                      returnKeyType="done"
                      secureTextEntry={true}
                      dense={true}
                      style={{
                        backgroundColor: 'transparent', // antes: "none"
                        width: 200,
                        marginBottom: 10,
                      }}
                    />
                    <Button mode="contained" onPress={this.onLogin.bind(this)}>
                      Iniciar Sessión
                    </Button>

                    {/* NUEVO: separador y botón Google */}
                    <View style={{ height: 12 }} />
                    <Button
                      mode="outlined"
                      icon="google"
                      onPress={this.onGoogleLogin}
                      disabled={this.state.loadingGoogle} // NUEVO
                      loading={this.state.loadingGoogle} // NUEVO
                    >
                      Continuar con Google
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

      </View>
    );
  }
}
// const Loguin = withTracker(navigation => {
//   return {
//     navigation,
//   };
// })(MyAppLoguin);

export default Loguin;
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    zIndex: 1,
    // backgroundColor: '#ecf0f1',
  },
  // NUEVO: card con blur
  blurCard: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    // color de respaldo cuando el blur no está disponible
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  blurCardContent: {
    padding: 30,
  },
  // NUEVO: layout principal según orientación
  mainLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // centrado del grupo
    paddingHorizontal: 16,
  },
  mainPortrait: {
    flexDirection: 'column',
  },
  // NUEVO: columnas sin estirar a los bordes
  brandLandscape: {
    // quitar flex para no ocupar todo el ancho
    marginRight: 24,
  },
  formLandscape: {
    // quitar flex para no ocupar todo el ancho
    marginLeft: 24,
  },
});
