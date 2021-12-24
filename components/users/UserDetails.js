import Meteor, { Accounts, Mongo, withTracker } from '@meteorrn/core';
import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import Orientation from 'react-native-orientation';
import { Card, Title, Text, Button, TextInput, Switch, Surface, IconButton, Avatar } from 'react-native-paper';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Alert } from 'react-native';


import { PreciosCollection, Logs, VentasCollection } from '../collections/collections'

const axios = require('axios').default;

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');


class MyAppUserDetails extends React.Component {
  componentDidMount() {
    Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }

  constructor(props) {
    super(props);
    this.state = {
      value: null,
      isFocus: false,
      paused: false,
      isModalVisible: false,
      // colorText:  Colors.darker,
      backgroundColor: '#2a323d',
      edit: false,
      date: new Date(),

    };
  }

  render() {
    const { navigation, ready, precioslist, precios} = this.props;
    const moment = require('moment');
    const data = precioslist;
  var item =  Meteor.users.findOne(this.props.item, { fields: { _id: 1, "services.facebook.picture.data.url": 1, profile: 1, username: 1, emails: 1, isIlimitado: 1, fechaSubscripcion: 1, megas: 1, megasGastadosinBytes: 1, baneado: 1, bloqueadoDesbloqueadoPor: 1, vpn: 1, vpnip: 1 } })

    // console.log(item)
    // const {item} = this.props;
    const onRefresh = () => {
      item = Meteor.users.findOne(this.props.item)
    }
    const renderLabel = () => {
      if (this.state.value || this.state.isFocus) {
        return (
          <Text style={[styles.label, this.state.isFocus && { color: 'blue' }]}>
            Megas • Precio
          </Text>
        );
      }
    }
    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: (screenHeight - 80),
    };
    return (
      <Surface
      style={backgroundStyle}>
        <ScrollView
          // contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
            />
          }>
          {!ready ? <View
            style={{
              flex: 1,
              flexDirection: 'column',
              height: screenHeight,
              // backgroundColor: '#2a323d',
              justifyContent: 'center',
            }}>
            <ActivityIndicator size="large" color="#3f51b5" />
          </View> :
          item&&<View style={styles.root}>
              {item.services && item.services.facebook && <Card.Actions style={{ justifyContent: 'space-around', paddingBottom: 30 }}>
                <Avatar.Image
                  size={50}
                  source={{ uri: item.services.facebook.picture.data.url }}
                />
              </Card.Actions>
              }
              <Card elevation={12} style={styles.cards}>
                <Card.Content>
                  <View style={styles.element}>

                    <Title style={styles.title}>{'Datos Personales'}</Title>
                    <View>
                      <Text style={styles.data}>
                        Nombre: {item.profile && item.profile.firstName}
                      </Text>
                      <Text style={styles.data}>
                        Apellidos:{' '}
                        {item.profile && item.profile.lastName ? item.profile.lastName : 'N/A'}
                      </Text>
                    </View>
                    {/* 
                <Text style={styles.data}>
                  Edad: {item.edad ? item.edad : 'N/A'}
                </Text> */}
                  </View>
                </Card.Content>
              </Card>
              <Card elevation={12} style={styles.cards}>
                {this.state.edit ? (
                  <Card.Content>
                    <View style={styles.element}>
                      <Title style={styles.title}>{'Datos de Usuario'}</Title>

                      <Text style={styles.data}>
                        <MaterialCommunityIcons
                          name="shield-account"
                          // color={styles.data}
                          size={26}
                        />{' '}
                        {Meteor.user().profile.role == 'admin' ? (
                          <Switch
                            value={item.profile && item.profile.role == 'admin'}
                            onValueChange={() =>
                              Meteor.users.update(item._id, {
                                $set: {
                                  'profile.role':
                                    item.profile.role == 'admin' ? 'user' : 'admin',
                                },
                              })
                            }
                          />
                        ) : (
                          item.profile && item.profile.role
                        )}
                      </Text>
                      <TextInput
                        require
                        mode="outlined"
                        value={this.state.username}
                        onChangeText={username => this.setState({ username })}
                        label={'UserName'}
                        textContentType="username"
                        placeholderTextColor={
                          !this.state.isDarkMode ? Colors.darker : Colors.lighter
                        }
                        style={{
                          width: 200,
                          height: 44,
                          marginBottom: 10,
                        }}
                      />
                      {Meteor.user().profile.role == "admin" ?
                        <TextInput
                          require
                          mode="outlined"
                          value={this.state.username}
                          onChangeText={email => this.setState({ email })}
                          label={'Email'}
                          textContentType="emailAddress"
                          placeholderTextColor={
                            !this.state.isDarkMode ? Colors.darker : Colors.lighter
                          }
                          style={{
                            width: 200,
                            height: 44,
                            marginBottom: 10,
                          }}
                        />
                        :
                        <Text style={styles.data}>
                          <MaterialCommunityIcons
                            name="email"
                            // color={styles.data}
                            size={26}
                          />{' '}
                          {item.emails[0].address}
                        </Text>
                      }
                      
                    </View>
                  </Card.Content>
                ) : (
                  <Card.Content>
                    <View style={styles.element}>
                      <Title style={styles.title}>{'Datos de Usuario'}</Title>
                      <Text style={styles.data}>
                        <MaterialCommunityIcons
                          name="shield-account"
                          // color={styles.data}
                          size={20}
                        />{' '}
                        {item.profile && item.profile.role}
                      </Text>
                      <Text style={styles.data}>
                        <MaterialCommunityIcons
                          name="account"
                          // color={styles.data}
                          size={20}
                        />{' '}
                        {item.username}
                      </Text>
                      <Text style={styles.data}>
                        <MaterialCommunityIcons
                          name="email"
                          // color={styles.data}
                          size={20}
                        />{' '}
                        {item.emails && item.emails[0].address}
                      </Text>
                    </View>
                  </Card.Content>
                )}
                {!this.state.edit ? (
                  <Card.Actions style={{ justifyContent: 'space-around' }}>
                    <Button
                      onPress={() => {
                        this.setState({ edit: true });
                      }}>
                      <MaterialIcons
                        name="edit"
                        // color={styles.data}
                        size={30}
                      />
                    </Button>
                  </Card.Actions>
                ) : (
                  <Card.Actions style={{ justifyContent: 'space-around' }}>
                    <Button
                      onPress={() => {
                        this.setState({ edit: false });
                      }}>
                      <MaterialIcons
                        name="cancel"
                        // color={styles.data}
                        size={30}
                      />
                    </Button>
                      <Button
                        onPress={() => {
                          this.state.email != "" &&
                            Meteor.users.update(item._id, {
                              $set: { emails: [{ address: this.state.email }] },
                            });
                          this.state.username != "" &&
                            Meteor.users.update(item._id, {
                              $set: { username: this.state.username }
                            });
                        }}>
                      <MaterialIcons
                        name="save"
                        // color={styles.data}
                        size={30}
                      />
                    </Button>
                  </Card.Actions>
                )}
              </Card>

              {Meteor.user().profile.role == 'admin' ? (
                <Card elevation={12} style={styles.cards}>
                  <Card.Content>
                    <View style={styles.element}>
                      <Title style={styles.title}>{'Datos del Proxy'}</Title>
                      {/* <View>
                <Text style={styles.data}>
                  Limite: {item.isIlimitado?"Por Tiempo":"Por Megas"}
                </Text>
                
              </View> */}
                      {Meteor.user().username == "carlosmbinf" &&
                        <>
                          <View style={{ flexDirection: 'row' }}>

                            <Text
                              style={
                                (styles.data,
                                  { justifyContent: 'center', paddingRight: 10 })
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
                          <View style={{ flexDirection: 'row' }}>
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
                          </View>
                        </>
                      }

                      {item.isIlimitado ? (
                        <>
                          <Surface
                            style={{
                              width: '100%',
                              elevation: 12,
                              borderRadius: 20,
                              marginTop: 20,
                            }}>
                            <Text style={{ padding: 10, textAlign: 'center' }}>
                              {item.fechaSubscripcion
                                ? moment
                                  .utc(item.fechaSubscripcion)
                                  .format('DD-MM-YYYY')
                                : 'Fecha Límite sin especificar'}
                            </Text>
                          </Surface>
                          <Surface
                            style={{
                              width: '100%',
                              elevation: 12,
                              borderRadius: 20,
                              marginTop: 20,
                              backgroundColor: "#607d8b",
                              padding: 20
                            }}>
                            <CalendarPicker
                              format="DD-MM-YYYY"
                              minDate={new Date()}
                              selectedDayColor="#7300e6"
                              selectedDayTextColor="#FFFFFF"
                              mode="date"
                              width={screenWidth - 100}
                              onDateChange={date => {
                                Meteor.users.update(item._id, {
                                  $set: {
                                    fechaSubscripcion: new Date(date),
                                  },
                                });
                              }}
                            />
                          </Surface>
                        </>
                      ) : (
                        <View style={{ paddingTop: 20 }}>
                          {renderLabel()}
                          <Dropdown
                            style={[styles.dropdown, this.state.isFocus && { borderColor: 'blue' }]}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            inputSearchStyle={styles.inputSearchStyle}
                            iconStyle={styles.iconStyle}
                            data={data}
                            search
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder={!this.state.isFocus ? 'Seleccione un paquete' : '...'}
                            searchPlaceholder="Search..."
                            value={this.state.value}
                            onFocus={() => this.setState({ isFocus: true })}
                            onBlur={() => this.setState({ isFocus: false })}
                            onChange={item => {
                              this.setState({ value: item.value, isFocus: false })
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
                          <View style={{ paddingTop: 10, paddingBottom: 10 }}>
                            <Button
                              icon="send"
                              disabled={this.state.value ? false : true}
                              mode="contained"
                              onPress={() => {
                                try {

                                  Meteor.users.update(item._id, { $set: { megas: this.state.value } })
                                  Logs.insert({
                                    type: 'Megas',
                                    userAfectado: item._id,
                                    userAdmin: Meteor.userId(),
                                    message:
                                      `Ha sido Cambiado el consumo de Datos a: ${this.state.value}MB`,
                                    createdAt: new Date(),
                                  })
                                } catch (error) {
                                  console.error(error)
                                }
                              }}
                            >
                              {`Establecer a ${this.state.value / 1024}GB`}
                            </Button>
                          </View>
                        </View>
                      )}
                      {item.isIlimitado ? <></> :
                        <Surface
                          style={{
                            width: '100%',
                            elevation: 12,
                            borderRadius: 20,
                            marginTop: 10,
                          }}>
                          <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                            Limite de Megas por el Proxy:
                          </Text>
                          <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                            {item.profile.role != "admin" ? (item.megas
                              ? (item.megas / 1024).toFixed(2) + ' GB'
                              : '0 GB') : "Ilimitado"}
                          </Text>
                        </Surface>
                      }

                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                          Consumo:
                        </Text>
                        <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                          {item.megasGastadosinBytes
                            ? (item.megasGastadosinBytes / 1000000).toFixed(2) + ' MB'
                            : '0 MB'}
                        </Text>
                      </Surface>
                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                          Estado del Proxy:
                        </Text>
                        <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
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
                            <Button
                              // disabled={this.state.value ? false : true}
                              mode="contained"
                              color={!item.baneado && "red"}
                              onPress={() => {
                                try {



                                  item.baneado ||
                                    (Meteor.users.update(item._id, {
                                      $set: {
                                        baneado: item.baneado ? false : true,
                                        bloqueadoDesbloqueadoPor: Meteor.userId()
                                      },
                                    }),
                                      Logs.insert({
                                        type: !item.baneado ? "Bloqueado" : "Desbloqueado",
                                        userAfectado: item._id,
                                        userAdmin: Meteor.userId(),
                                        message:
                                          "Ha sido " +
                                          (!item.baneado ? "Bloqueado" : "Desbloqueado") +
                                          " por un Admin",
                                        createdAt: new Date(),
                                      })),

                                    item.baneado && (
                                      this.state.value || item.profile.role == "admin" ? (
                                        Meteor.users.update(item._id, {
                                          $set: {
                                            baneado: item.baneado ? false : true,
                                            bloqueadoDesbloqueadoPor: Meteor.userId()
                                          },
                                        }),
                                        Logs.insert({
                                          type: !item.baneado ? "Bloqueado" : "Desbloqueado",
                                          userAfectado: item._id,
                                          userAdmin: Meteor.userId(),
                                          message:
                                            "Ha sido " +
                                            (!item.baneado ? "Bloqueado" : "Desbloqueado") +
                                            " por un Admin",
                                          createdAt: new Date(),
                                        }),
                                        precios.forEach(precio => {
                                          item.isIlimitado ? precio.fecha && (VentasCollection.insert({
                                            adminId: Meteor.userId(),
                                            userId: item._id,
                                            precio: precio.precio,
                                            comentario: precio.comentario
                                          }),
                                            Alert.alert(precio.comentario)
                                          ) :
                                            (precio.megas && (precio.megas == item.megas) && (
                                              // console.log("precio.megas " + precio.megas),
                                              VentasCollection.insert({
                                                adminId: Meteor.userId(),
                                                userId: item._id,
                                                precio: precio.precio,
                                                comentario: precio.comentario
                                              }),
                                              Alert.alert(precio.comentario)
                                            ))
                                        })
                                      ) : Alert.alert("Debe especificar el paquete a comprar")
                                    )




                                } catch (error) {
                                  console.error(error)
                                }
                              }}
                            >
                              {item.baneado ? "Habilitar" : "Desabilitar"}
                            </Button>
                          ) : item.baneado ? (
                            'Desabilitado'
                          ) : (
                            'Habilitado'
                          )}
                        </Text>
                      </Surface>
                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                          Estado de la VPN:
                        </Text>
                        <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
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
                            <Button
                              // disabled={this.state.value ? false : true}
                              mode="contained"
                              color={item.vpn && "red"}
                              onPress={() => {
                                try {

                                  let nextIp = Meteor.users.findOne({}, { sort: { vpnip: -1 } }) ? Meteor.users.findOne({}, { sort: { vpnip: -1 } }).vpnip : 1
                                  !item.vpnip &&
                                    Meteor.users.update(item._id, {
                                      $set: {
                                        vpnip: nextIp + 1
                                      },
                                    })
                                  Meteor.users.update(item._id, {
                                    $set: {
                                      vpn: item.vpn ? false : true
                                    },
                                  });
                                  Logs.insert({
                                    type: 'VPN',
                                    userAfectado: item._id,
                                    userAdmin: Meteor.userId(),
                                    message:
                                      `Se ${!item.vpn ? "Activo" : "Desactivó"} la VPN para ${item.profile.firstName} ${item.profile.lastName}`
                                  });
                                  !item.vpn && VentasCollection.insert({
                                    adminId: Meteor.userId(),
                                    userId: item._id,
                                    precio: 250,
                                    comentario: `Se ${!item.vpn ? "Activo" : "Desactivó"} el servicio VPN`
                                  })
                                  !item.vpn && Alert.alert("Se Compró el Servicio VPN con costo: 250CUP")

                                } catch (error) {
                                  console.error(error)
                                }
                              }}
                            >
                              {!item.vpn ? "Habilitar" : "Desabilitar"}
                            </Button>
                          ) : item.baneado ? (
                            'Desabilitado'
                          ) : (
                            'Habilitado'
                          )}
                        </Text>
                      </Surface>
                    </View>
                  </Card.Content>
                </Card>
              ) : (
                <Card elevation={12} style={styles.cards}>
                  <Card.Content>
                    <View style={styles.element}>
                      <Title style={styles.title}>{'Datos del Proxy'}</Title>
                      {item.isIlimitado ? (
                        <>
                          <Surface
                            style={{
                              width: '100%',
                              elevation: 12,
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                              Fecha Límite:
                            </Text>
                            <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                              {item.fechaSubscripcion
                                ? moment
                                  .utc(item.fechaSubscripcion)
                                  .format('DD-MM-YYYY')
                                : 'Fecha Límite sin especificar'}
                            </Text>
                          </Surface>
                        </>
                      ) : (
                        <>
                          <Surface
                            style={{
                              width: '100%',
                              elevation: 12,
                              borderRadius: 20,
                              marginTop: 10,
                            }}>
                            <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                              Limite de Megas por el Proxy:
                            </Text>
                            <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                              {item.megas
                                ? item.megas + " MB => " + (item.megas / 1024).toFixed(2) + " GB"
                                : 'No se ha especificado aun el Límite de megas'}
                            </Text>
                          </Surface>
                        </>
                      )}
                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                          Consumo:
                        </Text>
                        <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                          {item.megasGastadosinBytes
                            ? (item.megasGastadosinBytes / 1024000).toFixed(2) + ' MB => ' + (item.megasGastadosinBytes / 1024000000).toFixed(2) + " GB"
                            : '0 MB'}
                        </Text>
                      </Surface>
                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                          Estado del Proxy:
                        </Text>
                        <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                          {item.baneado ? 'Desabilitado' : 'Habilitado'}
                        </Text>
                      </Surface>
                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                          Estado de la VPN:
                        </Text>
                        <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                          {!item.vpn ? 'Desabilitado' : 'Habilitado'}
                        </Text>
                      </Surface>
                    </View>
                  </Card.Content>
                </Card>
              )}
              {/* <Button
            mode="contained"
            onPress={() => {
              // console.log(navigation);
              navigation.navigate('Mensajes', {item:item});
            }}>
            {Meteor.user().profile.role == 'admin' &&
            Meteor.user()._id != item._id
              ? 'Enviar Mensaje'
              : 'Mensajes Recividos'}
          </Button> */}
              {/* <Card elevation={12} style={styles.cards}>
          <Card.Content>
            <Text>HOLA</Text>
          </Card.Content>
        </Card> */}
            </View>
          }
        </ScrollView>
      </Surface>
    );
  }
}

const Player = withTracker( props => {
   Meteor.subscribe("precios").ready()
  let precioslist = []

   PreciosCollection.find({ fecha: false }).fetch().map((a) => {
    precioslist.push({ value: a.megas, label: a.megas + 'MB • $' + a.precio })
  })

  let precios =  PreciosCollection.find().fetch()

  const { item, navigation } = props;
  // const {navigation} = props;
  const ready =  Meteor.subscribe('user', item, { fields: { _id: 1, "services.facebook.picture.data.url": 1, profile: 1, username: 1, emails: 1, isIlimitado: 1, fechaSubscripcion: 1, megas: 1, megasGastadosinBytes: 1, baneado: 1, bloqueadoDesbloqueadoPor: 1, vpn: 1, vpnip: 1 } }).ready()

  return {
    item: item,
    navigation: navigation,
    ready: ready,
    precioslist,
    precios
  };
})(MyAppUserDetails);

export default Player;

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
    fontSize: 20,
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
    borderRadius: 22
  },
  container: {
    backgroundColor: 'white',
    padding: 16,
  },
});
