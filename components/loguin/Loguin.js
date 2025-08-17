import React, { Component } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  Appearance, // NUEVO
  Dimensions,
  ImageBackground, // agregado
} from 'react-native';
import Meteor, { Accounts, Mongo, withTracker } from '@meteorrn/core';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import { BlurView } from '@react-native-community/blur'; // NUEVO

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');
import { Mensajes } from '../collections/collections';

// import Video from 'react-native-video'; // comentado: ya no se usa video
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginWithGoogle } from '../../utilesMetodos/metodosUtiles';
//import HeroBot from '../animations/HeroBot';

class Loguin extends Component {
  componentDidMount() {
    // Orientation.unlockAllOrientations();
    this.dimSub = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window || {};
      this.setState({ isLandscape: width > height });
    });

    this.themeSub = Appearance.addChangeListener(({ colorScheme }) => {
      this.setState({ isDarkMode: colorScheme === 'dark' });
    });

    // Configura tu webClientId de Google (OAuth 2.0 client ID - tipo Web) desde Google Cloud Console
    // GoogleSignin.configure({
    //   // hostedDomain: "vidkar.com", // dominio de tu empresa, si aplica
    //   webClientId: '1043110071233-pbeoteq8ua30rsbqmk8dtku6hcmeekci.apps.googleusercontent.com', // client id válido
    //   iosClientId: "1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com",
    //   scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    //   forceCodeForRefreshToken: false,
    // });
  }

  componentWillUnmount() {
    // Orientation.lockToPortrait();
    this.dimSub?.remove?.();
    this.themeSub?.remove?.();
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
      isDarkMode: Appearance.getColorScheme() === 'dark', // NUEVO
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

  // Reemplazo: login con Google usando @meteorrn/oauth-google / Meteor.loginWithGoogle
  onGoogleLogin = () => {
    try {
      if (this.state.loadingGoogle) return;
    this.setState({ loadingGoogle: true });

    const options = {
      webClientId: '1043110071233-pbeoteq8ua30rsbqmk8dtku6hcmeekci.apps.googleusercontent.com',
      iosClientId: '1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com', // opcional, si usas iOS
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: false,
      enableOnBackInvokedCallback: true, // opcional, para manejar el botón de retroceso en Android
      // loginStyle: 'redirect',
      // Debe coincidir con tu intent-filter. En AndroidManifest ya existe <data android:scheme="vidkar" />
      // redirectUrl: 'vidkar://oauth',
    };

    const done = (err) => {
      this.setState({ loadingGoogle: false });
      if (err) {
        Alert.alert('Google', err.reason || err.message || 'Error iniciando sesión con Google.');
        return;
      }
      // ...existing code... navegación post login si aplica
    };

    if (typeof loginWithGoogle === 'function') {
      loginWithGoogle(options, done);
    } else if (typeof loginWithGoogle === 'function') {
      loginWithGoogle(options, done);
    } else {
      this.setState({ loadingGoogle: false });
      Alert.alert('Google', 'Proveedor de Google no disponible en el cliente.');
    }
    } catch (error) {
      Alert.alert(
        'Error de Conexión',error
      );
      
    }
    
  };

  render() {
    // Meteor.userId()&&Meteor.subscribe("usersId",Meteor.userId())
    const { isLandscape } = this.state;

    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: "100%",
      minWidth: "100%",
      marginTop: isLandscape ? 0 : "5%", // ajustado para no empujar hacia abajo en landscape
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
          <ScrollView
            contentContainerStyle={isLandscape ? styles.scrollLandscapeContent : undefined} // NUEVO
          >
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
                    blurType={this.state.isDarkMode ? 'black' : 'light'} // NUEVO
                    blurAmount={5}
                    blurRadius={5}
                  />
                  <View style={styles.blurCardContent}>
                  <Text style={{ fontSize: 16, justifyContent:'center',alignContent:'center',textAlign:'center'}}>Inicio de Session</Text>
                    <TextInput
                      mode="flat"
                      value={this.state.username}
                      onChangeText={username => this.setState({ username })}
                      label={'Username'}
                      returnKeyType="next"
                      dense={true}
                      style={{
                        backgroundColor: 'transparent', // antes: "none"
                        width: 250,
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
                        width: 250,
                        marginBottom: 10,
                      }}
                    />
                    <Button mode="contained" onPress={this.onLogin.bind(this)}>
                      Iniciar Sessión
                    </Button>

                    {/* NUEVO: separador y botón Google */}
                    <View style={{ height: 12 }} />
                    <Text style={{ fontSize: 16, justifyContent:'center',alignContent:'center',textAlign:'center'}}>O</Text>
                    <View style={{ height: 10}} />
                    <Button
                      mode="outlined"
                      icon="google"
                      
                      onPress={this.onGoogleLogin}
                      disabled={this.state.loadingGoogle} // NUEVO
                      loading={this.state.loadingGoogle} // NUEVO
                    >
                      Entrar con Google
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
    borderRadius: 25,
    overflow: 'hidden',
    // color de respaldo cuando el blur no está disponible
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  blurCardContent: {
    padding: 15,
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

  // NUEVO: centrar verticalmente el contenido del ScrollView en landscape
  scrollLandscapeContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 0,
  },
});
