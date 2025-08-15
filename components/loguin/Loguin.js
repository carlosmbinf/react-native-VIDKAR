import React, {Component} from 'react';
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
  ImageBackground, // agregado
  KeyboardAvoidingView, // NUEVO
  Platform, // NUEVO
} from 'react-native';
import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {Button, Surface, Text, TextInput} from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');
import {Mensajes} from '../collections/collections';

import { SafeAreaView } from 'react-native-safe-area-context';

class Loguin extends Component {
  componentDidMount() {
    this.dimSub = Dimensions.addEventListener('change', ({window}) => {
      const {width, height} = window || {};
      this.setState({ isLandscape: width > height });
    });
  }

  componentWillUnmount() {
    this.dimSub?.remove?.();
  }

  constructor(props) {
    super(props);
    const {navigation} = this.props;
    Meteor.connect('ws://www.vidkar.com:6000/websocket'); //www.vidkar.com:6000

    this.state = {
      ipserver: 'vidkar.ddns.net',
      username: '',
      password: '',
      isLandscape: screenWidth > screenHeight, // NUEVO
    };
  }

  onLogin() {
    const {username, password} = this.state;
    const {navigation} = this.props;
    try {
    } catch (error) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar al servidor: ' + this.state.ipserver,
      );
    }
    Meteor.loginWithPassword(username, password, function (error) {
      error && Alert.alert('Credenciales incorrectas');
    });
  }

  render() {
    const { isLandscape } = this.state;

    const backgroundStyle = {
      minHeight: "100%",
      minWidth: "100%",
      marginTop: "5%",
    };

    return (
      <View style={{ minHeight: "100%", minWidth:"100%"}}>
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
          minHeight:'100%',
          minWidth: '100%',
          left: 0, top: 0, // NUEVO: asegurar posicionamiento
          right: 0, bottom: 0,
          flex: 1, // NUEVO: permitir que el contenedor crezca y el scroll funcione
        }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }} // NUEVO
            behavior={Platform.select({ ios: 'padding', android: 'height', windows: 'height', default: 'height' })} // NUEVO
            keyboardVerticalOffset={0} // NUEVO
          >
            <ScrollView
              keyboardShouldPersistTaps="handled" // NUEVO
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} // NUEVO
              contentInsetAdjustmentBehavior="always"
              automaticallyAdjustKeyboardInsets={true} // RN >=0.75 (iOS principalmente)
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: isLandscape ? 'center' : 'flex-start',
                paddingBottom: 24,
              }}
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
                  <Text style={{fontSize: 30,}}>
                    <FontAwesome5Icon name="house-user" size={100} />
                  </Text>
                  <Text style={{fontSize: 30 }}>🅥🅘🅓🅚🅐🅡</Text>
                </View>

                {/* PANE DERECHO: login */}
                <View style={[
                  styles.container,
                  isLandscape && styles.formLandscape
                ]}>
                  <TextInput
                    mode="outlined"
                    value={this.state.username}
                    onChangeText={username => this.setState({username: username})}
                    label={'Username'}
                    dense={true}
                    style={{ width: 200, marginBottom: 10 }}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                  <TextInput
                    mode="outlined"
                    value={this.state.password}
                    onChangeText={password => this.setState({password: password})}
                    label={'Password'}
                    secureTextEntry={true}
                    dense={true}
                    style={{ width: 200, marginBottom: 10 }}
                    returnKeyType="done"
                  />
                  <Button mode="contained" onPress={this.onLogin.bind(this)}>
                    Iniciar Sessión
                  </Button>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }
}

export default Loguin;
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    zIndex: 1,
  },
  // NUEVO: layout principal según orientación
  mainLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mainPortrait: {
    flexDirection: 'column',
  },
  // NUEVO: columnas sin estirar a los bordes
  brandLandscape: {
    marginRight: 24,
  },
  formLandscape: {
    marginLeft: 24,
  },
});
