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
  Divider,
  Portal,
  Dialog,
  Paragraph,
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
import SaldoRecargasCard from './componentsUserDetails/SaldoRecargasCard'; // NUEVO
import SendPushMessageCard from '../mensajes/SendPushMessageCard';
import DeleteAccountCard from './componentsUserDetails/DeleteAccountCard';

const axios = require('axios').default;



class MyAppUserDetails extends React.Component {
  
  componentDidMount() {
    this._isMounted = true; // NUEVO: flag de montaje
    this.dimSub = Dimensions.addEventListener('change', this.updateLayout);
    // NUEVO: verificación inicial de tokens si hay item disponible
    if (this.props?.item?._id) {
      this.checkPushTokens(this.props.item._id);
    }
  }

  componentWillUnmount() {
    this.dimSub && this.dimSub.remove && this.dimSub.remove();
    this._isMounted = false; // NUEVO
  }

  constructor(props) {
    super(props);
    const {width: screenWidth} = Dimensions.get('window');
    const { height: screenHeight } = Dimensions.get('window');
    this.state = {
      value: null,
      valuevpn: null,
      valuevpnlabel: null,
      isFocus: false,
      isFocusvpn: false,
      paused: false,
      isModalVisible: false,
      backgroundColor: '#2a323d',
      edit: false,
      date: new Date(),
      username: '',
      email: '',
      megasVPNlabel: 0,
      tiempoReporteAudio: 0,
      refreshing: false,          // NUEVO
      refreshKey: 0,              // NUEVO
      isTablet: screenWidth >= 768,          // NUEVO
      currentWidth: screenWidth,             // NUEVO
      // NUEVO: estado para tokens push
      hasPushTokens: null,
      tokenCount: 0,
      loadingPushTokens: false,
    };
    this.onRefresh = this.onRefresh.bind(this); // NUEVO
    this.updateLayout = this.updateLayout.bind(this); // NUEVO
  }

  // NUEVO: método para consultar tokens push
  checkPushTokens(userId) {
    if (!userId) return;
    this.setState({ loadingPushTokens: true });
    Meteor.call('push.hasTokens', { userId }, (error, result) => {
      if (!this._isMounted) return;
      if (error) {
        console.warn('push.hasTokens error:', error);
        this.setState({ hasPushTokens: false, tokenCount: 0, loadingPushTokens: false });
        return;
      }
      const hasTokens = !!result?.hasTokens;
      const tokenCount = result?.tokenCount ?? 0;
      this.setState({ hasPushTokens: hasTokens, tokenCount, loadingPushTokens: false });
    });
  }

  // NUEVO: volver a consultar cuando cambie el usuario o se dispare refresh
  componentDidUpdate(prevProps, prevState) {
    const prevId = prevProps?.item?._id;
    const currId = this.props?.item?._id;
    if (currId && currId !== prevId) {
      this.checkPushTokens(currId);
    }
    if (prevState.refreshKey !== this.state.refreshKey && currId) {
      this.checkPushTokens(currId);
    }
  }

  updateLayout({window}) {
    this.setState({
      currentWidth: window.width,
      isTablet: window.width >= 768
    });
  }

  onRefresh() {
    this.setState(
      (prev) => ({ refreshing: true, refreshKey: prev.refreshKey + 1 }),
      () => {
        setTimeout(() => this.setState({ refreshing: false }), 600);
      }
    );
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

    const {width: screenWidth} = Dimensions.get('window');
    const { height: screenHeight } = Dimensions.get('window');

    const moment = require('moment');
    const onRefresh = () => {
      item = Meteor.users.findOne(this.props.item);
    };
    const deuda = () => {
      let deuda = 0;
      const ventas = VentasCollection.find({
        adminId: item._id,
        cobrado: false,
      }).fetch();
      ventas.map(element => {
        deuda = deuda + element.precio;
      });
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
      // minHeight: screenHeight,
      paddingBottom: 200,
    };

    const {isTablet, currentWidth} = this.state;
    const computedCardWidth =
      !isTablet
        ? {width: '100%'}
        : (currentWidth >= 1200
            ? {width: '31%'}
            : {width: '48%'});
    const rootStyle = [styles.root, isTablet && styles.rootTablet];

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
    const eliminarNotificacion = () => {}

    const iniciarNotificacion = () => {}

    const addVenta = () => {
      let validacion = false;

      item.isIlimitado &&
        new Date() < new Date(item.fechaSubscripcion) &&
        (validacion = true);
      !item.isIlimitado &&
        (item.megasGastadosinBytes ? item.megasGastadosinBytes / 1024000 : 0) <
          (item.megas ? item.megas : 0) &&
        (validacion = true);

      !validacion && alert('Revise los Límites del Usuario');

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
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing} // MODIFICADO
              onRefresh={this.onRefresh}         // MODIFICADO
            />
          }>
          {!ready.ready() ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                height: screenHeight,
                justifyContent: 'center',
              }}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View>
          ) : (
            item && (
              <View style={rootStyle}>
                {/* Ventas */}
                {Meteor.user() &&
                  Meteor.user().profile &&
                  Meteor.user().profile.role == 'admin' && (
                    <View style={[styles.cardItem, computedCardWidth]}>
                      <VentasCard
                        visible={loadventas && deuda() > 0}
                        deuda={deuda}
                        styles={styles}
                      />
                    </View>
                  )}
                {/* NUEVO: Saldo disponible para recargas */}
                {Meteor.user() &&
                  Meteor.user().profile &&
                  Meteor.user().profile.role == 'admin' && (
                    <View style={[styles.cardItem, computedCardWidth]}>
                      <SaldoRecargasCard refreshKey={this.state.refreshKey} />
                    </View>
                  )}
                {/* {Meteor.user() &&
                  Meteor.user().profile &&
                  Meteor.user().profile.role == 'admin' && (
                    <View style={[styles.cardItem, computedCardWidth]}>
                      <Divider style={{marginBottom:20}}/>
                    </View>
                  )} */}
                {/* Datos Personales */}
                <View style={[styles.cardItem, computedCardWidth]}>
                  <PersonalDataCard item={item} styles={styles} />
                </View>
                {/* Fin Datos Personales */}
                {/* Datos de Usuario */}
                <View style={[styles.cardItem, computedCardWidth]}>
                  <UserDataCard
                    item={item}
                    styles={styles}
                    edit={this.state.edit}
                    setEdit={(v) => this.setState({edit: v})}
                    navigation={navigation}
                  />
                </View>
                {/* Fin Datos de Usuario */}
                {item?.profile?.role == 'admin' &&
                  <View style={[styles.cardItem, computedCardWidth]}>
                    <TarjetaDebitoCard item={item} styles={styles} />
                  </View>
                }
                {/* Pair Proxy + VPN en misma fila para tablet */}
                {isTablet ? (
                  <View style={styles.rowPairFull}>
                    <View style={[styles.cardItem, styles.pairItemWidth]}>
                      {Meteor.user()?.profile?.role === 'admin' ? (
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
                    </View>
                    <View style={[styles.cardItem, styles.pairItemWidth]}>
                      {Meteor.user()?.profile?.role === 'admin' ? (
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
                    </View>
                  </View>
                ) : (
                  <>
                    {/* Móvil / no tablet: comportamiento previo (stack) */}
                    {Meteor.user()?.profile?.role === 'admin' ? (
                      <View style={[styles.cardItem, computedCardWidth]}>
                        <ProxyCardAdmin
                          item={item}
                          styles={styles}
                          precioslist={precioslist}
                          handleReiniciarConsumo={handleReiniciarConsumo}
                          addVenta={addVenta}
                        />
                      </View>
                    ) : (
                      <View style={[styles.cardItem, computedCardWidth]}>
                        <ProxyCardUser item={item} styles={styles} />
                      </View>
                    )}

                    {Meteor.user()?.profile?.role === 'admin' ? (
                      <View style={[styles.cardItem, computedCardWidth]}>
                        <VpnCardAdmin
                          item={item}
                          styles={styles}
                          preciosVPNlist={preciosVPNlist}
                          handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                          handleVPNStatus={handleVPNStatus}
                        />
                      </View>
                    ) : (
                      <View style={[styles.cardItem, computedCardWidth]}>
                        <VpnCardUser item={item} styles={styles} />
                      </View>
                    )}
                  </>
                )}

                {/* OPCIONES */}
                {Meteor.user() && Meteor.user().profile.role == 'admin' && (
                  <View style={[styles.cardItem, computedCardWidth]}>
                    <OptionsCardAdmin item={item} styles={styles} />
                  </View>
                )}
                {/* Fin OPCIONES */}
                {/* MODIFICADO: Mostrar envío de Push solo si hay tokens */}
                {item?._id && (item?._id != Meteor.userId() || Meteor?.user()?.profile?.role == 'admin') && this.state.hasPushTokens ? (
                  <SendPushMessageCard toUserId={item._id} />
                ) : null}
                {/* NUEVO: Eliminar cuenta */}
                {item?._id && item?._id === Meteor.userId() && (
                  <View style={[styles.cardItem, computedCardWidth]}>
                    <DeleteAccountCard userId={item._id} username={item.username} navigation={navigation} />
                  </View>
                )}
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
  const _id = item;
  const loadventas = Meteor.subscribe('ventas', {
    adminId: _id,
    cobrado: false,
  }).ready();
  const ready = Meteor.subscribe('user', {_id: _id});
  const user = Meteor.users.findOne({_id: _id});
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
  },
  rootTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 32,
    maxWidth: 1400,
    alignSelf: 'center'
  },
  cardItem: {
    marginBottom: 24,
    minWidth: 300
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
  rowPairFull: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    marginBottom: 8,
  },
  pairItemWidth: {
    flexBasis: '48%',
    maxWidth: '48%',
    minWidth: 300,
  },
  dialog: {
    borderRadius: 16,
    maxWidth: 500,
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    textAlign: 'center',
  },
  dialogWarning: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogWarningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
  dialogDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'justify',
  },
  codeText: {
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  input: {
    marginTop: 12,
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginLeft: 6,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
});
