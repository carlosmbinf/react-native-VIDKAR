import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Header from 'react-native-custom-header';
import Video, {TextTrackType} from 'react-native-video';
// Meteor.connect('ws://10.0.2.2:3000/websocket');
// const Todos = new Mongo.Collection('pelisRegister');
import Modal from 'react-native-modal';
import CalendarPicker from 'react-native-calendar-picker';
import NumericInput from 'react-native-numeric-input'

import Orientation from 'react-native-orientation';
import {Card, Title, Text, Button, TextInput, Switch, Surface} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native';

const axios = require('axios').default;

const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');


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
      paused: false,
      isModalVisible: false,
      // colorText:  Colors.darker,
      backgroundColor: '#2a323d',
      edit: false,
      date: new Date(),
      
    };
  }

  render() {
    const {navigation,ready} = this.props;
    const moment = require('moment');
    var item = Meteor.users.find(this.props.item).fetch()[0]
    // console.log(item)
    // const {item} = this.props;
    const onRefresh = () => {
      item = Meteor.users.find(this.props.item).fetch()[0]
    }
    
    return (
      <ScrollView 
      // contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
        />
      }>
        {!ready?<View
              style={{
                flex: 1,
                flexDirection: 'column',
                height: screenHeight,
                // backgroundColor: '#2a323d',
                justifyContent: 'center',
              }}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View>:
        <View style={styles.root}>
          <Card elevation={12} style={styles.cards}>
            <Card.Content>
              <View style={styles.element}>
                <Title style={styles.title}>{'Datos Personales'}</Title>
                <View>
                  <Text style={styles.data}>
                    Nombre: {item.profile&&item.profile.firstName}
                  </Text>
                  <Text style={styles.data}>
                    Apellidos:{' '}
                    {item.profile&&item.profile.lastName ? item.profile.lastName : 'N/A'}
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
                        value={item.profile&&item.profile.role == 'admin'}
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
                      item.profile&&item.profile.role
                    )}
                  </Text>
                  <TextInput
                    require
                    mode="outlined"
                    value={this.state.username}
                    onChangeText={username => this.setState({username})}
                    label={'UserName'}
                    placeholderTextColor={
                      !this.state.isDarkMode ? Colors.darker : Colors.lighter
                    }
                    style={{
                      width: 200,
                      height: 44,
                      marginBottom: 10,
                    }}
                  />
                  <Text style={styles.data}>
                    <MaterialCommunityIcons
                      name="email"
                      // color={styles.data}
                      size={26}
                    />{' '}
                    {item.emails[0].address}
                  </Text>
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
                    {item.profile&&item.profile.role}
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
                    {item.emails&&item.emails[0].address}
                  </Text>
                </View>
              </Card.Content>
            )}
            {!this.state.edit ? (
              <Card.Actions style={{justifyContent: 'space-around'}}>
                <Button
                  onPress={() => {
                    this.setState({edit: true});
                  }}>
                  <MaterialIcons
                    name="edit"
                    // color={styles.data}
                    size={30}
                  />
                </Button>
              </Card.Actions>
            ) : (
              <Card.Actions style={{justifyContent: 'space-around'}}>
                <Button
                  onPress={() => {
                    this.setState({edit: false});
                  }}>
                  <MaterialIcons
                    name="cancel"
                    // color={styles.data}
                    size={30}
                  />
                </Button>
                <Button
                  onPress={() => {
                    Meteor.users.update(item._id, {
                      $set: {username: this.state.username},
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
                  <View style={{flexDirection: 'row'}}>
                    <Text
                      style={
                        (styles.data,
                        {justifyContent: 'center', paddingRight: 10})
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
                  <View style={{flexDirection: 'row'}}>
                    <Text
                      style={
                        (styles.data,
                        {justifyContent: 'center', paddingRight: 10})
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
                  {item.isIlimitado ? (
                    <>
                      <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 20,
                        }}>
                        <Text style={{padding: 10, textAlign: 'center'}}>
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
                    <View style={{paddingTop: 20}}>
                      <NumericInput
                        value={item.megas ? Number(item.megas) : 0}
                        onChange={megas =>
                          Meteor.users.update(item._id, {
                            $set: {
                              megas: megas,
                            },
                          })
                        }
                        onLimitReached={(isMax, msg) => console.log(isMax, msg)}
                        totalWidth={240}
                        totalHeight={40}
                        iconSize={25}
                        step={1024}
                        valueType="real"
                        rounded
                        textColor="black"
                        iconStyle={{color: 'white'}}
                        rightButtonBackgroundColor="#7300e6"
                        leftButtonBackgroundColor="#7300e6"
                      />
                    </View>
                  )}
                  <Surface
                        style={{
                          width: '100%',
                          elevation: 12,
                          borderRadius: 20,
                          marginTop: 10,
                        }}>
                        <Text style={{paddingTop: 10, textAlign: 'center'}}>
                          Consumo:
                        </Text>
                        <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                          {item.megasGastadosinBytes
                            ? (item.megasGastadosinBytes/1000000).toFixed(2) + ' MB'
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
                        <Text style={{paddingTop: 10, textAlign: 'center'}}>
                          Estado del Proxy:
                        </Text>
                        <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                        {Meteor.user().profile.role == 'admin' ? (
                      <Switch
                        value={!item.baneado}
                        onValueChange={() => {
                          Meteor.users.update(item._id, {
                            $set: {
                              baneado: !item.baneado,
                            },
                          });
                        }}
                      />
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
                        <Text style={{paddingTop: 10, textAlign: 'center'}}>
                          Fecha Límite:
                        </Text>
                        <Text style={{paddingBottom: 10, textAlign: 'center'}}>
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
                        <Text style={{paddingTop: 10, textAlign: 'center'}}>
                          Limite de Megas:
                        </Text>
                        <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                          {item.megas
                            ? item.megas
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
                        <Text style={{paddingTop: 10, textAlign: 'center'}}>
                          Consumo:
                        </Text>
                        <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                          {item.megasGastadosinBytes
                            ? (item.megasGastadosinBytes/1000000).toFixed(2) + ' MB'
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
                        <Text style={{paddingTop: 10, textAlign: 'center'}}>
                          Estado del Proxy:
                        </Text>
                        <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                        {item.baneado ? 'Desabilitado' : 'Habilitado'}
                        </Text>
                      </Surface>
                </View>
              </Card.Content>
            </Card>
          )}
          <Button
            mode="contained"
            onPress={() => {
              // console.log(navigation);
              navigation.navigate('Mensajes', {item:item});
            }}>
            {Meteor.user().profile.role == 'admin' &&
            Meteor.user()._id != item._id
              ? 'Enviar Mensaje'
              : 'Mensajes Recividos'}
          </Button>
          {/* <Card elevation={12} style={styles.cards}>
          <Card.Content>
            <Text>HOLA</Text>
          </Card.Content>
        </Card> */}
        </View>
        }
      </ScrollView>
    );
  }
}

const Player = withTracker(props => {

  const {item,navigation} = props;
    // const {navigation} = props;
    const ready = Meteor.subscribe('userID',item._id).ready()
  return {
    item:item._id,
    navigation:navigation,
    ready:ready
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
  cards:{
    marginBottom:20,
    borderRadius:20,
  }
});
