import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
  Platform,
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import {Dropdown} from 'react-native-element-dropdown';
import {
  Card,
  Title,
  Text,
  Button,
  TextInput,
  Switch,
  Surface,
  IconButton,
  Avatar,
} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {RefreshControl} from 'react-native';
import {ActivityIndicator} from 'react-native';
import {Alert} from 'react-native';
// import ReactNativeForegroundService from '@supersami/rn-foreground-service';

import {
  PreciosCollection,
  Logs,
  VentasCollection,
} from '../collections/collections';
import VentasCard from './componentsUserDetails/VentasCard';
import PersonalDataCard from './componentsUserDetails/PersonalDataCard';
import UserDataCard from './componentsUserDetails/UserDataCard';
import ProxyCardAdmin from './componentsUserDetails/ProxyCardAdmin';
import ProxyCardUser from './componentsUserDetails/ProxyCardUser';
import VpnCardAdmin from './componentsUserDetails/VpnCardAdmin';
import VpnCardUser from './componentsUserDetails/VpnCardUser';
import OptionsCardAdmin from './componentsUserDetails/OptionsCardAdmin';
import TarjetaDebitoCard from './componentsUserDetails/TarjetaDebitoCard';

const axios = require('axios').default;

const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');

class MyAppUserDetails extends React.Component {
  componentDidMount() {}

  componentWillUnmount() {}

  constructor(props) {
    super(props);
    this.state = {
      value: null,
      valuevpn: null,
      valuevpnlabel: null,
      isFocus: false,
      isFocusvpn: false,
      paused: false,
      isModalVisible: false,
      // colorText:  Colors.darker,
      backgroundColor: '#2a323d',
      edit: false,
      date: new Date(),
      username: '',
      email: '',
      megasVPNlabel: 0,
      tiempoReporteAudio: 0,
    };
    // !Meteor.userId() && navigation.navigation.navigate('Loguin');
  }

  render() {
    const {
      navigation,
      ready,
      precioslist,
      precios,
      item,
      preciosVPNlist,
      loadventas,
    } = this.props;
    const moment = require('moment');
    // console.log(item)
    // const {item} = this.props;
    const onRefresh = () => {
      item = Meteor.users.findOne(this.props.item);
    };
    const deuda = () => {
      let deuda = 0;
      // console.log(item._id);
      const ventas = VentasCollection.find({
        adminId: item._id,
        cobrado: false,
      }).fetch();
      ventas.map(element => {
        deuda = deuda + element.precio;
      });
      // console.log(ventas);
      return deuda;
    };
    const renderLabel = () => {
      if (this.state.value || this.state.isFocus) {
        return (
          <Text style={[styles.label, this.state.isFocus && {color: 'blue'}]}>
            Megas • Precio
          </Text>
        );
      }
    };
    const renderLabelVPN = () => {
      if (this.state.value || this.state.isFocus) {
        return (
          <Text style={[styles.label, this.state.isFocus && {color: 'blue'}]}>
            VPN • Megas • Precio
          </Text>
        );
      }
    };
    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: screenHeight - 80,
    };

    const handleVPNStatus = event => {
      let validacion = false;

      item.vpnisIlimitado &&
        new Date() < new Date(item.vpnfechaSubscripcion) &&
        (validacion = true);
      !item.vpnisIlimitado &&
        (item.vpnMbGastados ? item.vpnMbGastados / 1024000 : 0) <
          (item.vpnmegas ? item.vpnmegas : 0) &&
        (validacion = true);

      !validacion && alert('Revise los Límites del Usuario');
      // validacion = ((item.profile.role == "admin") ? true  : false);
      if (!validacion) return null;

      Meteor.call(
        'addVentasVPN',
        item._id,
        Meteor.userId(),
        (error, result) => {
          if (error) {
            alert(error.message);
          } else {
            result && alert(result);
          }
        },
      );
    };

    const handleReiniciarConsumo = async event => {
      console.log('INICIO');
      try {
        await Meteor.call('guardarDatosConsumidosByUserPROXYHoras', item);
        await Meteor.call('reiniciarConsumoDeDatosPROXY', item);
        await Meteor.call('desactivarUserProxy', item);

        await Meteor.call(
          'registrarLog',
          'Reinicio PROXY',
          item._id,
          Meteor.userId(),
          `Ha sido Reiniciado el consumo de Datos del PROXY de ${item.profile.firstName} ${item.profile.lastName} y desactivado el proxy`,
        );

        // Meteor.call('sendemail', users, { text: `Ha sido Reiniciado el consumo de Datos del PROXY de ${users.profile.firstName} ${users.profile.lastName}` }, 'Reinicio ' + Meteor.user().username)
        await Meteor.call(
          'sendMensaje',
          item,
          {
            text: `Ha sido Reiniciado el consumo de Datos del PROXY, y desactivado el proxy`,
          },
          'Reinicio ' + Meteor.user().username,
        );

        alert('Se reinicio los datos del PROXY de ' + item.profile.firstName);
      } catch (error) {
        console.error(error);
      }
    };

    const handleReiniciarConsumoVPN = async event => {
      try {
        await Meteor.call('guardarDatosConsumidosByUserVPNHoras', item);
        await Meteor.call('reiniciarConsumoDeDatosVPN', item);
        await Meteor.call('desactivarUserVPN', item);
        await Meteor.call(
          'registrarLog',
          'Reinicio VPN',
          item._id,
          Meteor.userId(),
          `Ha sido Reiniciado el consumo de Datos de la VPN de ${item.profile.firstName} ${item.profile.lastName}`,
        );
        // Meteor.call('sendemail', users, { text: `Ha sido Reiniciado el consumo de Datos de la VPN de ${users.profile.firstName} ${users.profile.lastName}` }, 'Reinicio ' + Meteor.user().username)
        await Meteor.call(
          'sendMensaje',
          item,
          {text: `Ha sido Reiniciado el consumo de Datos de la VPN`},
          'Reinicio ' + Meteor.user().username,
        );

        alert(
          `Ha sido Reiniciado el consumo de Datos de la VPN de ${item.profile.firstName} ${item.profile.lastName}`,
        );
      } catch (error) {
        console.error(error);
      }
    };
    const modificarNotificacion = () => {
      Meteor.users.update(item._id, {
        $set: {
          modificarNotificacion: !Meteor.user().modificarNotificacion,
        },
      });
    };
    const eliminarNotificacion = () => {
      // ReactNativeForegroundService.stopAll();
    }

    const iniciarNotificacion = () => {
      // ReactNativeForegroundService.start({
      //   id: 1000000,
      //   ServiceType: 'dataSync',
      //   title: 'Servicio de VidKar',
      //   message: 'Debe iniciar sesión!',
      //   visibility: 'private',
      //   // largeicon: 'home',
      //   vibration: false,
      //   button: true,
      //   buttonText: 'Abrir Vidkar',
      //   importance: 'max',
      //   ongoing: true,
      //   //   number: '10000',
  
      //   // icon: 'home',
      // });
    }
    const addVenta = () => {
      // console.log(`Precio MEGAS ${precios}`);
      let validacion = false;

      item.isIlimitado &&
        new Date() < new Date(item.fechaSubscripcion) &&
        (validacion = true);
      !item.isIlimitado &&
        (item.megasGastadosinBytes ? item.megasGastadosinBytes / 1024000 : 0) <
          (item.megas ? item.megas : 0) &&
        (validacion = true);

      !validacion && alert('Revise los Límites del Usuario');

      // validacion = ((item.profile.role == "admin") ? true  : false);
      if (!validacion) return null;

      Meteor.call(
        'addVentasProxy',
        item._id,
        Meteor.userId(),
        (error, result) => {
          if (error) {
            alert(error.message);
          } else {
            result && alert(result);
          }
        },
      );
    };

    return (
      <Surface style={backgroundStyle}>
        <ScrollView
          // contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={false}
              // onRefresh={onRefresh}
            />
          }>
          {!ready.ready() ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                height: screenHeight,
                // backgroundColor: '#2a323d',
                justifyContent: 'center',
              }}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View>
          ) : (
            item && (
              <View style={styles.root}>
                {item.picture && (
                  <Card.Actions
                    style={{justifyContent: 'space-around', paddingBottom: 30}}>
                    <Avatar.Image size={50} source={{uri: item.picture}} />
                  </Card.Actions>
                )}
                {/* Ventas */}
                <VentasCard
                  visible={loadventas && deuda() > 0}
                  deuda={deuda}
                  styles={styles}
                />
                {/* Fin Ventas */}
                {/* Datos Personales */}
                <PersonalDataCard item={item} styles={styles} />
                {/* Fin Datos Personales */}
                {/* Tarjeta de Débito (solo si existe property CONFIG.TARJETA_CUP_{userId}) */}
                <TarjetaDebitoCard item={item} styles={styles} />
                {/* Fin Tarjeta de Débito */}
                {/* Datos de Usuario (incluye cambiar contraseña cuando edit=true) */}
                <UserDataCard
                  item={item}
                  styles={styles}
                  edit={this.state.edit}
                  setEdit={(v) => this.setState({edit: v})}
                  navigation={navigation}
                />
                {/* Fin Datos de Usuario */}
                
                {/* Datos del Proxy */}
                {Meteor.user() &&
                Meteor.user().profile &&
                Meteor.user().profile.role == 'admin' ? (
                  <ProxyCardAdmin
                    item={item}
                    styles={styles}
                    precioslist={precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                  />
                ) : (
                  <ProxyCardUser item={item} styles={styles} />
                )}
                {/* Fin Datos del Proxy */}

                {/* Datos VPN */}
                {Meteor.user() && Meteor.user()?.profile?.role == 'admin' ? (
                  <VpnCardAdmin
                    item={item}
                    styles={styles}
                    preciosVPNlist={preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                  />
                ) : (
                  <VpnCardUser item={item} styles={styles} />
                )}
                {/* Fin Datos VPN */}

                {/* OPCIONES */}
                {Meteor.user() && Meteor.user().profile.role == 'admin' && (
                  <OptionsCardAdmin item={item} styles={styles} />
                )}
                {/* Fin OPCIONES */}
              </View>
            )
          )}
        </ScrollView>
      </Surface>
    );
  }
}

const UserDetails = withTracker(props => {
  Meteor.subscribe('precios', {}, {sort: {type: 1, precio: 1}}).ready();
  let precioslist = [];

  PreciosCollection.find(
    {userId: Meteor.userId(), type: 'megas'},
    {
      fields: {
        megas: 1,
        precio: 1,
      },
      sort: {precio: 1},
    },
  )
    .fetch()
    .map(a => {
      precioslist.push({
        value: a.megas,
        label:
          a.megas +
          'MB • $' +
          (a.precio >= 0
            ? a.precio
            : 0),
      });
    });

  let precios = PreciosCollection.find().fetch();

  let preciosVPNlist = [];

  PreciosCollection.find(
    {
      userId: Meteor.userId(),
      $or: [{type: 'vpnplus'}, {type: 'vpn2mb'}],
    },
    {
      fields: {
        userId: 1,
        type: 1,
        megas: 1,
        precio: 1,
      },
      sort: {
        precio: 1,
      },
    },
  )
    .fetch()
    .map(a => {
      preciosVPNlist.push({
        value: a.megas,
        label: `${a.type} • ${a.megas}MB • $ ${
          a.precio >= 0
            ? a.precio
            : 0
        }`,
      });
    });

  const {item, navigation} = props;
  console.log("item",item);
  const _id = item;
  const loadventas = Meteor.subscribe('ventas', {
    adminId: _id,
    cobrado: false,
  }).ready();
  console.log("Cargando ventas para el usuario:", {_id: _id});
  // const {navigation} = props;
  const ready = Meteor.subscribe('user', {_id: _id}, {
    fields: {
      descuentovpn: 1,
      descuentoproxy: 1,
      vpnfechaSubscripcion: 1,
      vpnisIlimitado: 1,
      vpnplus: 1,
      vpn2mb: 1,
      _id: 1,
      picture: 1,
      profile: 1,
      username: 1,
      emails: 1,
      isIlimitado: 1,
      fechaSubscripcion: 1,
      megas: 1,
      megasGastadosinBytes: 1,
      baneado: 1,
      bloqueadoDesbloqueadoPor: 1,
      vpn: 1,
      vpnip: 1,
      vpnmegas: 1,
      vpnMbGastados: 1,
      tiempoReporteAudio: 1,
      enviarReporteAudio: 1,
      desconectarVPN: 1,
      modificarNotificacion: 1,
    },
  });
  const user = Meteor.users.findOne({_id: _id}, {
    fields: {
      descuentovpn: 1,
      descuentoproxy: 1,
      vpnfechaSubscripcion: 1,
      vpnisIlimitado: 1,
      vpnplus: 1,
      vpn2mb: 1,
      _id: 1,
      picture: 1,
      profile: 1,
      username: 1,
      emails: 1,
      isIlimitado: 1,
      fechaSubscripcion: 1,
      megas: 1,
      megasGastadosinBytes: 1,
      baneado: 1,
      bloqueadoDesbloqueadoPor: 1,
      vpn: 1,
      vpnip: 1,
      vpnmegas: 1,
      vpnMbGastados: 1,
      tiempoReporteAudio: 1,
      enviarReporteAudio: 1,
      desconectarVPN: 1,
      modificarNotificacion: 1,
    },
  });
  console.log(item?._id);
  return {
    item: user,
    navigation: navigation,
    ready: ready,
    precioslist,
    precios,
    preciosVPNlist,
    loadventas: loadventas,
  };
})(MyAppUserDetails);

export default UserDetails;

const styles = StyleSheet.create({
  ViewVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  root: {
    padding: 30,
    height: '100%',
    width: '100%',
    // borderRadius: 10,
    // backgroundColor: '#2a323d',
  },
  element: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    paddingBottom: 5,
  },
  data: {
    padding: 3,
    // fontSize: 16,
  },
  cards: {
    marginBottom: 20,
    borderRadius: 20,
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    position: 'absolute',
    backgroundColor: 'white',
    left: 22,
    top: 8,
    zIndex: 999,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 22,
  },
  container: {
    backgroundColor: 'white',
    padding: 16,
  },
});
