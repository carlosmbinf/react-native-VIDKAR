import Meteor, { withTracker } from '@meteorrn/core';
import React from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Surface,
  Card,
  Avatar,
  ActivityIndicator,
  Title,
  Text,
} from 'react-native-paper';
import { RefreshControl } from 'react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import UserPersonalDataCard from './componenteUsersDetails/UserPersonalDataCard';
import UserAccountDataCard from './componenteUsersDetails/UserAccountDataCard';
import UserPasswordChangeCard from './componenteUsersDetails/UserPasswordChangeCard';
import UserOptionsCard from './componenteUsersDetails/UserOptionsCard';
import UserNotificationsCard from './componenteUsersDetails/UserNotificationsCard';
import UserProxyDataCard from './componenteUsersDetails/UserProxyDataCard';
import UserVPNDataCard from './componenteUsersDetails/UserVPNDataCard';
import DebtCard from './componenteUsersDetails/DebtCard';

import {
  PreciosCollection,
  Logs,
  VentasCollection,
} from '../collections/collections';

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
    !Meteor.userId() && navigation.navigation.navigate('Loguin');
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
      ReactNativeForegroundService.stopAll();
    }

    const iniciarNotificacion = () => {
      ReactNativeForegroundService.start({
        id: 1000000,
        ServiceType: 'dataSync',
        title: 'Servicio de VidKar',
        message: 'Debe iniciar sesión!',
        visibility: 'private',
        vibration: false,
        button: true,
        buttonText: 'Abrir Vidkar',
        importance: 'max',
        ongoing: true,
      });
    }
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
              refreshing={false}
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
              <View style={styles.root}>
                {item.picture && (
                  <Card.Actions
                    style={{justifyContent: 'space-around', paddingBottom: 30}}>
                    <Avatar.Image size={50} source={{uri: item.picture}} />
                  </Card.Actions>
                )}

                {loadventas && deuda() > 0 && (
                  <DebtCard deuda={deuda()} />
                )}

                <UserPersonalDataCard item={item} />
                
                <UserAccountDataCard 
                  item={item} 
                  navigation={navigation}
                  edit={this.state.edit}
                  setEdit={(edit) => this.setState({edit})}
                  email={this.state.email}
                  setEmail={(email) => this.setState({email})}
                  username={this.state.username}
                  setUsername={(username) => this.setState({username})}
                />

                {this.state.edit && (
                  <UserPasswordChangeCard 
                    item={item}
                    navigation={navigation}
                    setEdit={(edit) => this.setState({edit})}
                  />
                )}

                {Platform.OS != 'ios' && 
                  Meteor.user() && 
                  Meteor.user().profile && 
                  Meteor.user().profile.role == 'admin' && (
                    <UserOptionsCard 
                      item={item} 
                      modificarNotificacion={modificarNotificacion} 
                    />
                )}

                {Platform.OS != 'ios' && 
                  item._id == Meteor.userId() && 
                  Meteor.user() && 
                  Meteor.user().modificarNotificacion && (
                    <UserNotificationsCard 
                      item={item}
                      eliminarNotificacion={eliminarNotificacion}
                      iniciarNotificacion={iniciarNotificacion}
                    />
                )}

                {(Meteor.user() && Meteor.user().profile && Meteor.user().profile.role == 'admin') && (
                  <UserProxyDataCard 
                    item={item}
                    precioslist={this.props.precioslist}
                    handleReiniciarConsumo={handleReiniciarConsumo}
                    addVenta={addVenta}
                    state={this.state}
                    setState={(state) => this.setState(state)}
                    screenWidth={screenWidth}
                    moment={moment}
                  />
                )}

                {(Meteor.user() && Meteor.user().profile && Meteor.user().profile.role == 'admin') && (
                  <UserVPNDataCard
                    item={item}
                    preciosVPNlist={this.props.preciosVPNlist}
                    handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
                    handleVPNStatus={handleVPNStatus}
                    state={this.state}
                    setState={(state) => this.setState(state)}
                    screenWidth={screenWidth}
                    moment={moment}
                  />
                )}                {Meteor.user() &&
                Meteor.user().profile &&
                Meteor.user().profile.role == 'admin' ? (
                  <Card elevation={12} style={styles.cards}>
                    <Card.Content>
                      <View style={styles.element}>
                        <Title style={styles.title}>{'Datos del Proxy'}</Title>
                        {/* <View>
                <Text style={styles.data}>
                  Limite: {item.isIlimitado?"Por Tiempo":"Por Megas"}
                </Text>
                
              </View> */}
                        {Meteor.user().profile &&
                          Meteor.user().profile.role == 'admin' && (
                            <>
                              <View style={{flexDirection: 'row'}}>
                                <Text
                                  style={
                                    (styles.data,
                                    {
                                      justifyContent: 'center',
                                      paddingRight: 10,
                                    })
                                  }>
                                  Por Tiempo:
                                </Text>
                                <Switch
                                  value={item.isIlimitado}
                                  onValueChange={() => {
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        isIlimitado: !item.isIlimitado,
                                      },
                                    });
                                  }}
                                />
                              </View>
                              {/* <View style={{ flexDirection: 'row' }}>
                            <Text
                              style={
                                (styles.data,
                                  { justifyContent: 'center', paddingRight: 10 })
                              }>
                              Por Megas:
                            </Text>
                            <Switch
                              value={!item.isIlimitado}
                              onValueChange={() => {
                                Meteor.users.update(item._id, {
                                  $set: {
                                    isIlimitado: !item.isIlimitado,
                                  },
                                });
                              }}
                            />
                          </View> */}
                            </>
                          )}

                        {item.isIlimitado ? (
                          <>
                            <View
                              style={{
                                width: '100%',
                                borderRadius: 20,
                                marginTop: 10,
                              }}>
                              <Text
                                style={{paddingTop: 10, textAlign: 'center'}}>
                                Fecha Limite:
                              </Text>
                              <Text
                                style={{
                                  paddingBottom: 10,
                                  textAlign: 'center',
                                }}>
                                {item.fechaSubscripcion
                                  ? moment
                                      .utc(item.fechaSubscripcion)
                                      .format('DD-MM-YYYY')
                                  : 'Fecha Límite sin especificar'}
                              </Text>
                            </View>

                            <View
                              style={{
                                width: '100%',
                                borderRadius: 20,
                                marginTop: 10,
                                marginBottom: 10,
                              }}>
                              <Text
                                style={{paddingTop: 10, textAlign: 'center'}}>
                                Consumo:
                              </Text>
                              <Text
                                style={{
                                  paddingBottom: 10,
                                  textAlign: 'center',
                                }}>
                                {item.megasGastadosinBytes
                                  ? (
                                      item.megasGastadosinBytes / 1000000
                                    ).toFixed(2) + ' MB'
                                  : '0 MB'}
                              </Text>
                            </View>

                            <Surface
                              style={{
                                width: '100%',
                                borderRadius: 20,
                                elevation: 12,
                                marginTop: 20,
                                backgroundColor: '#607d8b',
                                padding: 20,
                              }}>
                              <CalendarPicker
                                // format="YYYY-MM-DD"
                                minDate={new Date()}
                                selectedDayColor="#7300e6"
                                selectedDayTextColor="#FFFFFF"
                                selectedStartDate={item.fechaSubscripcion}
                                // mode="date"
                                width={screenWidth - 100}
                                onDateChange={date => {
                                  console.log(moment.utc(date).startOf('day'));
                                  date &&
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        fechaSubscripcion: new Date(
                                          moment
                                            .utc(date)
                                            .startOf('day')
                                            .add(4, 'hours'),
                                        ),
                                      },
                                    }),
                                    Logs.insert({
                                      type: 'Fecha Limite Proxy',
                                      userAfectado: item._id,
                                      userAdmin: Meteor.userId(),
                                      message:
                                        'La Fecha Limite del Proxy se cambió para: ' +
                                        moment
                                          .utc(new Date(date))
                                          .format('YYYY-MM-DD'),
                                    });
                                  date &&
                                    !item.baneado &&
                                    (Logs.insert({
                                      type: 'PROXY',
                                      userAfectado: item._id,
                                      userAdmin: Meteor.userId(),
                                      message: `Se Desactivó el PROXY porque estaba activa y cambio la fecha Limite`,
                                    }),
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        baneado: !item.baneado,
                                      },
                                    }));

                                  // Meteor.users.update(item._id, {
                                  //   $set: {
                                  //     fechaSubscripcion: new Date(date),
                                  //   },
                                  // });
                                }}
                              />
                            </Surface>
                          </>
                        ) : (
                          <View style={{paddingTop: 20}}>
                            <View
                              style={{
                                width: '100%',
                                borderRadius: 20,
                                marginTop: 10,
                              }}>
                              <Text
                                style={{paddingTop: 10, textAlign: 'center'}}>
                                Limite de Megas por el Proxy:
                              </Text>
                              <Text
                                style={{
                                  paddingBottom: 10,
                                  textAlign: 'center',
                                }}>
                                {item.megas
                                  ? item.megas +
                                    ' MB => ' +
                                    (item.megas / 1024).toFixed(2) +
                                    ' GB'
                                  : 'No se ha especificado aun el Límite de megas'}
                              </Text>
                            </View>

                            <View
                              style={{
                                width: '100%',
                                borderRadius: 20,
                                marginTop: 10,
                                marginBottom: 10,
                              }}>
                              <Text
                                style={{paddingTop: 10, textAlign: 'center'}}>
                                Consumo:
                              </Text>
                              <Text
                                style={{
                                  paddingBottom: 10,
                                  textAlign: 'center',
                                }}>
                                {item.megasGastadosinBytes
                                  ? (
                                      item.megasGastadosinBytes / 1024000
                                    ).toFixed(2) +
                                    ' MB => ' +
                                    (
                                      item.megasGastadosinBytes / 1024000000
                                    ).toFixed(2) +
                                    ' GB'
                                  : '0 MB'}
                              </Text>
                            </View>
                            <Surface
                              style={{
                                width: '100%',
                                elevation: 3,
                                borderRadius: 20,
                                marginTop: 10,
                                padding: 10,
                              }}>
                              {renderLabel()}
                              <Dropdown
                                style={[
                                  styles.dropdown,
                                  this.state.isFocus && {borderColor: 'blue'},
                                ]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconStyle={styles.iconStyle}
                                data={precioslist}
                                search
                                maxHeight={
                                  precioslist.length * 50 + 70 > 220
                                    ? 220
                                    : precioslist.length * 50 + 70
                                }
                                labelField="label"
                                valueField="value"
                                placeholder={
                                  !this.state.isFocus
                                    ? 'Seleccione un paquete'
                                    : '...'
                                }
                                searchPlaceholder="Search..."
                                value={this.state.value}
                                onFocus={() => this.setState({isFocus: true})}
                                onBlur={() => this.setState({isFocus: false})}
                                onChange={item => {
                                  this.setState({
                                    value: item.value,
                                    isFocus: false,
                                  });
                                }}
                                // renderLeftIcon={() => (
                                //   <AntDesign
                                //     style={styles.icon}
                                //     color={isFocus ? 'blue' : 'black'}
                                //     name="Safety"
                                //     size={20}
                                //   />
                                // )}
                              />
                              <View style={{paddingTop: 10, paddingBottom: 10}}>
                                <Button
                                  icon="send"
                                  disabled={this.state.value ? false : true}
                                  mode="contained"
                                  onPress={async () => {
                                    try {
                                      await Meteor.users.update(item._id, {
                                        $set: {megas: this.state.value},
                                      });
                                      await Meteor.call(
                                        'registrarLog',
                                        'Proxy',
                                        item._id,
                                        Meteor.userId(),
                                        `Ha sido Cambiado el consumo de Datos del Proxy a: ${this.state.value}MB`,
                                      );
                                    } catch (error) {
                                      console.error(error);
                                    }
                                  }}>
                                  {`Seleccione 1 Compra`}
                                </Button>
                              </View>
                            </Surface>
                          </View>
                        )}

                        <View
                          style={{
                            width: '100%',
                            borderRadius: 20,
                            marginTop: 10,
                          }}>
                          <Text style={{paddingTop: 10, textAlign: 'center'}}>
                            Estado del Proxy:
                          </Text>
                          <View
                            style={{paddingBottom: 10, textAlign: 'center'}}>
                            {Meteor.user().profile.role == 'admin' ? (
                              // <Switch
                              //   value={!item.baneado}
                              //   onValueChange={() => {
                              //     Meteor.users.update(item._id, {
                              //       $set: {
                              //         baneado: !item.baneado,
                              //       },
                              //     });
                              //   }}
                              // />
                              <>
                                <View style={{padding: 10}}>
                                  <Button
                                    disabled={
                                      item.megasGastadosinBytes ? false : true
                                    }
                                    mode="contained"
                                    onPress={handleReiniciarConsumo}>
                                    REINICIAR CONSUMO!!!
                                  </Button>
                                </View>
                                <View style={{padding: 10}}>
                                  <Button
                                    // disabled={this.state.value ? false : true}
                                    mode="contained"
                                    color={!item.baneado && 'red'}
                                    onPress={addVenta}>
                                    {item.baneado ? 'Habilitar' : 'Desabilitar'}
                                  </Button>
                                </View>
                              </>
                            ) : item.baneado ? (
                              <Text>Desabilitado</Text>
                            ) : (
                              <Text>Habilitado</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ) : (
                  (item.megasGastadosinBytes ||
                    item.fechaSubscripcion ||
                    item.megas) && (
                    <Card elevation={12} style={styles.cards}>
                      <Card.Content>
                        <View style={styles.element}>
                          <Title style={styles.title}>
                            {'Datos del Proxy'}
                          </Title>
                          {item.isIlimitado ? (
                            <>
                              <View
                                style={{
                                  width: '100%',
                                  borderRadius: 20,
                                  marginTop: 10,
                                }}>
                                <Text
                                  style={{paddingTop: 10, textAlign: 'center'}}>
                                  Fecha Límite:
                                </Text>
                                <Text
                                  style={{
                                    paddingBottom: 10,
                                    textAlign: 'center',
                                  }}>
                                  {item.fechaSubscripcion
                                    ? moment
                                        .utc(item.fechaSubscripcion)
                                        .format('DD-MM-YYYY')
                                    : 'Fecha Límite sin especificar'}
                                </Text>
                              </View>
                            </>
                          ) : (
                            <>
                              <View
                                style={{
                                  width: '100%',
                                  borderRadius: 20,
                                  marginTop: 10,
                                }}>
                                <Text
                                  style={{paddingTop: 10, textAlign: 'center'}}>
                                  Limite de Megas por el Proxy:
                                </Text>
                                <Text
                                  style={{
                                    paddingBottom: 10,
                                    textAlign: 'center',
                                  }}>
                                  {item.megas
                                    ? item.megas +
                                      ' MB => ' +
                                      (item.megas / 1024).toFixed(2) +
                                      ' GB'
                                    : 'No se ha especificado aun el Límite de megas'}
                                </Text>
                              </View>
                            </>
                          )}
                          <View
                            style={{
                              width: '100%',
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{paddingTop: 10, textAlign: 'center'}}>
                              Consumo:
                            </Text>
                            <Text
                              style={{paddingBottom: 10, textAlign: 'center'}}>
                              {item.megasGastadosinBytes
                                ? (item.megasGastadosinBytes / 1024000).toFixed(
                                    2,
                                  ) +
                                  ' MB => ' +
                                  (
                                    item.megasGastadosinBytes / 1024000000
                                  ).toFixed(2) +
                                  ' GB'
                                : '0 MB'}
                            </Text>
                          </View>
                          <View
                            style={{
                              width: '100%',
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{paddingTop: 10, textAlign: 'center'}}>
                              Estado del Proxy:
                            </Text>
                            <Text
                              style={{paddingBottom: 10, textAlign: 'center'}}>
                              {item.baneado ? 'Desabilitado' : 'Habilitado'}
                            </Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  )
                )}

                {Meteor.user() && Meteor.user()?.profile?.role == 'admin' ? (
                  <Card elevation={12} style={styles.cards}>
                    <Card.Content>
                      <View style={styles.element}>
                        <Title style={styles.title}>{'Datos VPN'}</Title>
                        {Meteor.user().profile &&
                          Meteor.user().profile.role == 'admin' && (
                            <>
                              <View style={{flexDirection: 'row'}}>
                                <Text
                                  style={
                                    (styles.data,
                                    {
                                      justifyContent: 'center',
                                      paddingRight: 10,
                                    })
                                  }>
                                  Por Tiempo:
                                </Text>
                                <Switch
                                  value={item.vpnisIlimitado}
                                  onValueChange={() => {
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        vpnisIlimitado: !item.vpnisIlimitado,
                                      },
                                    });
                                  }}
                                />
                              </View>
                              {/* <View style={{ flexDirection: 'row' }}>
                            <Text
                              style={
                                (styles.data,
                                  { justifyContent: 'center', paddingRight: 10 })
                              }>
                              Por Megas:
                            </Text>
                            <Switch
                              value={!item.isIlimitado}
                              onValueChange={() => {
                                Meteor.users.update(item._id, {
                                  $set: {
                                    isIlimitado: !item.isIlimitado,
                                  },
                                });
                              }}
                            />
                          </View> */}
                            </>
                          )}
                        <View
                          style={{
                            width: '100%',
                            borderRadius: 20,
                            marginTop: 10,
                          }}>
                          <Text style={{paddingTop: 10, textAlign: 'center'}}>
                            OFERTA / LIMITE:
                          </Text>
                          {item.vpnisIlimitado ? (
                            <>
                              <Text style={{textAlign: 'center'}}>
                                {item.vpnplus
                                  ? 'VPN PLUS'
                                  : item.vpn2mb
                                  ? 'VPN 2MB'
                                  : 'Ninguna'}
                              </Text>
                              <Text
                                style={{
                                  paddingBottom: 10,
                                  textAlign: 'center',
                                }}>
                                {item.vpnfechaSubscripcion
                                  ? `${item.vpnfechaSubscripcion.getUTCFullYear()}-${
                                      item.vpnfechaSubscripcion.getUTCMonth() +
                                      1
                                    }-${item.vpnfechaSubscripcion.getUTCDate()}`
                                  : 'Fecha Limite sin especificar'}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={{textAlign: 'center'}}>
                                {item.vpnplus
                                  ? 'VPN PLUS'
                                  : item.vpn2mb
                                  ? 'VPN 2MB'
                                  : 'Ninguna'}
                              </Text>
                              <Text
                                style={{
                                  paddingBottom: 10,
                                  textAlign: 'center',
                                }}>
                                {item.vpnmegas
                                  ? item.vpnmegas +
                                    ' MB => ' +
                                    (item.vpnmegas / 1024).toFixed(2) +
                                    ' GB'
                                  : 'No se ha especificado aun el Límite de megas'}
                              </Text>
                            </>
                          )}
                        </View>

                        <View
                          style={{
                            width: '100%',
                            borderRadius: 20,
                            marginTop: 10,
                            marginBottom: 10,
                          }}>
                          <Text style={{paddingTop: 10, textAlign: 'center'}}>
                            Consumo:
                          </Text>
                          <Text
                            style={{paddingBottom: 10, textAlign: 'center'}}>
                            {item.vpnMbGastados
                              ? (item.vpnMbGastados / 1000000).toFixed(2)
                              : 0}
                            {'MB => '}
                            {item.vpnMbGastados
                              ? (item.vpnMbGastados / 1000000000).toFixed(2)
                              : 0}
                            GB
                          </Text>
                        </View>

                        {item.vpnisIlimitado ? (
                          <>
                            <Surface
                              style={{
                                width: '100%',
                                elevation: 12,
                                borderRadius: 20,
                                marginTop: 20,
                                backgroundColor: '#607d8b',
                                padding: 20,
                              }}>
                              <CalendarPicker
                                format="YYYY-MM-DD"
                                minDate={new Date()}
                                selectedDayColor="#7300e6"
                                selectedDayTextColor="#FFFFFF"
                                mode="date"
                                width={screenWidth - 100}
                                selectedStartDate={item.vpnfechaSubscripcion}
                                onDateChange={date => {
                                  date &&
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        vpnfechaSubscripcion: new Date(
                                          moment
                                            .utc(date)
                                            .startOf('day')
                                            .add(4, 'hours'),
                                        ),
                                        vpnplus: true,
                                        vpn2mb: true,
                                      },
                                    }),
                                    Logs.insert({
                                      type: 'Fecha Limite VPN',
                                      userAfectado: item._id,
                                      userAdmin: Meteor.userId(),
                                      message:
                                        'La Fecha Limite de la VPN se cambió para: ' +
                                        moment
                                          .utc(new Date(date))
                                          .format('YYYY-MM-DD'),
                                    });
                                  date &&
                                    item.vpn &&
                                    (Logs.insert({
                                      type: 'VPN',
                                      userAfectado: item._id,
                                      userAdmin: Meteor.userId(),
                                      message: `Se Desactivó la VPN porque estaba activa y cambio la fecha Limite`,
                                    }),
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        vpn: false,
                                      },
                                    }));

                                  // Meteor.users.update(item._id, {
                                  //   $set: {
                                  //     fechaSubscripcion: new Date(date),
                                  //   },
                                  // });
                                }}
                              />
                            </Surface>
                          </>
                        ) : (
                          <Surface
                            style={{
                              width: '100%',
                              elevation: 3,
                              borderRadius: 20,
                              padding: 10,
                            }}>
                            <View style={{paddingTop: 20}}>
                              {renderLabelVPN()}
                              <Dropdown
                                style={[
                                  styles.dropdown,
                                  this.state.isFocusvpn && {
                                    borderColor: 'blue',
                                  },
                                ]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconStyle={styles.iconStyle}
                                data={preciosVPNlist}
                                search
                                maxHeight={
                                  preciosVPNlist.length * 50 + 70 > 220
                                    ? 220
                                    : preciosVPNlist.length * 50 + 70
                                }
                                labelField="label"
                                valueField="value"
                                placeholder={
                                  !this.state.isFocusvpn
                                    ? 'Seleccione un paquete'
                                    : '...'
                                }
                                searchPlaceholder="Search..."
                                value={this.state.valuevpn}
                                onFocus={() =>
                                  this.setState({isFocusvpn: true})
                                }
                                onBlur={() =>
                                  this.setState({isFocusvpn: false})
                                }
                                onChange={paquete => {
                                  this.setState({
                                    valuevpn: paquete.value,
                                    isFocusvpn: false,
                                    valuevpnlabel: paquete.label,
                                    megasVPNlabel: paquete.value
                                      ? paquete.value
                                      : 0,
                                  });
                                }}
                                // renderLeftIcon={() => (
                                //   <AntDesign
                                //     style={styles.icon}
                                //     color={isFocus ? 'blue' : 'black'}
                                //     name="Safety"
                                //     size={20}
                                //   />
                                // )}
                              />
                              <View style={{paddingTop: 10, paddingBottom: 10}}>
                                <Button
                                  icon="send"
                                  disabled={this.state.valuevpn ? false : true}
                                  mode="contained"
                                  onPress={async () => {
                                    try {
                                      await Meteor.users.update(item._id, {
                                        $set: {vpnplus: true, vpn2mb: true},
                                      });
                                      await Meteor.call(
                                        'registrarLog',
                                        'VPN',
                                        item._id,
                                        Meteor.userId(),
                                        `Ha sido Seleccionada la VPN: ${
                                          this.state.valuevpnlabel
                                            ? this.state.valuevpnlabel
                                            : this.state.valuevpn
                                        }`,
                                      );

                                      Meteor.users.update(item._id, {
                                        $set: {
                                          vpnmegas: this.state.megasVPNlabel,
                                        },
                                      });
                                      item.vpn &&
                                        Meteor.users.update(item._id, {
                                          $set: {vpn: false},
                                        });
                                      item.vpn &&
                                        (await Meteor.call(
                                          'registrarLog',
                                          VPN,
                                          item._id,
                                          Meteor.userId(),
                                          `Se ${
                                            !item.vpn ? 'Activo' : 'Desactivó'
                                          } la VPN porque estaba activa y cambio la oferta`,
                                        ));
                                      // setIP(newValue);
                                    } catch (error) {
                                      console.error(error);
                                    }
                                  }}>
                                  {this.state.megasVPNlabel
                                    ? `Establecer ${this.state.megasVPNlabel}MB`
                                    : `Seleccione 1 compra!!!`}
                                </Button>
                              </View>
                            </View>
                          </Surface>
                        )}
                        <View
                          style={{
                            width: '100%',
                            borderRadius: 20,
                            marginTop: 10,
                          }}>
                          <Text style={{paddingTop: 10, textAlign: 'center'}}>
                            Estado:
                          </Text>
                          <View
                            style={{paddingBottom: 10, textAlign: 'center'}}>
                            {Meteor.user().profile.role == 'admin' ? (
                              // <Switch
                              //   value={!item.baneado}
                              //   onValueChange={() => {
                              //     Meteor.users.update(item._id, {
                              //       $set: {
                              //         baneado: !item.baneado,
                              //       },
                              //     });
                              //   }}
                              // />
                              <>
                                <View style={{padding: 10}}>
                                  <Button
                                    icon="send"
                                    disabled={item.vpnMbGastados ? false : true}
                                    mode="contained"
                                    onPress={handleReiniciarConsumoVPN}>
                                    REINICIAR CONSUMO!!!
                                  </Button>
                                </View>
                                <View style={{padding: 10}}>
                                  <Button
                                    // disabled={this.state.value ? false : true}
                                    mode="contained"
                                    color={item.vpn && 'red'}
                                    onPress={handleVPNStatus}>
                                    {!item.vpn ? 'Habilitar' : 'Desabilitar'}
                                  </Button>
                                </View>
                              </>
                            ) : item.vpn ? (
                              <Text>Habilitado</Text>
                            ) : (
                              <Text>Desabilitado</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ) : (
                  (item.megasGastadosinBytes ||
                    item.fechaSubscripcion ||
                    item.megas) && (
                    <Card elevation={12} style={styles.cards}>
                      <Card.Content>
                        <View style={styles.element}>
                          <Title style={styles.title}>{'Datos VPN'}</Title>

                          <View
                            style={{
                              width: '100%',
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{paddingTop: 10, textAlign: 'center'}}>
                              OFERTA / LIMITE:
                            </Text>
                            {item.vpnisIlimitado ? (
                              <>
                                <Text style={{textAlign: 'center'}}>
                                  {item.vpnplus
                                    ? 'VPN PLUS'
                                    : item.vpn2mb
                                    ? 'VPN 2MB'
                                    : 'Ninguna'}
                                </Text>
                                <Text
                                  style={{
                                    paddingBottom: 10,
                                    textAlign: 'center',
                                  }}>
                                  {item.vpnfechaSubscripcion
                                    ? `${item.vpnfechaSubscripcion.getUTCFullYear()}-${
                                        item.vpnfechaSubscripcion.getUTCMonth() +
                                        1
                                      }-${item.vpnfechaSubscripcion.getUTCDate()}`
                                    : 'Fecha Limite sin especificar'}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text style={{textAlign: 'center'}}>
                                  {item.vpnplus
                                    ? 'VPN PLUS'
                                    : item.vpn2mb
                                    ? 'VPN 2MB'
                                    : 'Ninguna'}
                                </Text>
                                <Text
                                  style={{
                                    paddingBottom: 10,
                                    textAlign: 'center',
                                  }}>
                                  {item.vpnmegas
                                    ? item.vpnmegas +
                                      ' MB => ' +
                                      (item.vpnmegas / 1024).toFixed(2) +
                                      ' GB'
                                    : 'No se ha especificado aun el Límite de megas'}
                                </Text>
                              </>
                            )}
                          </View>
                          <View
                            style={{
                              width: '100%',
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{paddingTop: 10, textAlign: 'center'}}>
                              Consumo:
                            </Text>
                            <Text
                              style={{paddingBottom: 10, textAlign: 'center'}}>
                              {item.vpnMbGastados
                                ? item.vpnMbGastados / 1000000
                                : 0}
                              {`MB -> ${item.vpnMbGastados
                                ? (item.vpnMbGastados / 1024000000).toFixed(2)
                                : 0} GB`}
                            </Text>
                          </View>
                          <View
                            style={{
                              width: '100%',
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{paddingTop: 10, textAlign: 'center'}}>
                              Estado de la VPN:
                            </Text>
                            <Text
                              style={{paddingBottom: 10, textAlign: 'center'}}>
                              {!item.vpn ? 'Desabilitado' : 'Habilitado'}
                            </Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  )
                )}
                {Meteor.user() && Meteor.user().profile.role == 'admin' && (
                  <Card elevation={12} style={styles.cards}>
                    <Card.Content>
                      <Text
                        style={{
                          paddingTop: 10,
                          textAlign: 'center',
                          paddingBottom: 10,
                        }}>
                        OPCIONES:
                      </Text>
                      <Button
                        color={item.desconectarVPN&&'red'}
                        mode="contained"
                        onPress={() => {
                          Meteor.call('updateUsersAll', item._id, {
                            desconectarVPN: !item.desconectarVPN,
                          });
                        }}>
                        {item.desconectarVPN
                          ? 'Cancelar Desconexion de VPN'
                          : 'Desconectar VPN'}
                      </Button>
                    </Card.Content>
                  </Card>
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
  const loadventas = Meteor.subscribe('ventas', {
    adminId: item,
    cobrado: false,
  }).ready();

  // const {navigation} = props;
  const ready = Meteor.subscribe('user', item, {
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
  const user = Meteor.users.findOne(item, {
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
});
