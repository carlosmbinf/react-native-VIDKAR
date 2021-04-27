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

import Orientation from 'react-native-orientation';
import {Card, Title, Text, Button, TextInput, Switch} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const axios = require('axios').default;

var {width: screenWidth} = Dimensions.get('window');
var {height: screenHeight} = Dimensions.get('window');
class Player extends React.Component {
  componentDidMount() {
    Orientation.lockToPortrait();
    screenWidth = Dimensions.get('window').width;
    screenHeight = Dimensions.get('window').height;
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
    };
  }

  render() {
    const {item} = this.props;

    return (
      <View style={styles.root}>
        <Card elevation={10} style={{marginBottom: 30, borderRadius: 20}}>
          <Card.Content>
            <View style={styles.element}>
              <Title style={styles.title}>{'Datos Personales'}</Title>

              {this.state.edit ? (
                <View>
                  <Text style={styles.data}>
                    Nombre: {item.profile.firstName}
                  </Text>
                  <Text style={styles.data}>
                    Apellidos:{' '}
                    {item.profile.lastName ? item.profile.lastName : 'N/A'}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.data}>
                    Nombre: {item.profile.firstName}
                  </Text>
                  <Text style={styles.data}>
                    Apellidos:{' '}
                    {item.profile.lastName ? item.profile.lastName : 'N/A'}
                  </Text>
                </View>
              )}

              <Text style={styles.data}>Edad: {item.edad?item.edad:'N/A'}</Text>
            </View>
          </Card.Content>
        </Card>
        <Card elevation={10} style={{borderRadius: 20}}>
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
                  {item.profile.role}
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
                <Text style={styles.data}>
                  <MaterialIcons
                    name="vpn-lock"
                    // color={styles.data}
                    size={26}
                  />{' '}
                  {Meteor.user().profile.role == 'admin' ? (
                    <Switch
                      value={!item.baneado}
                      onValueChange={() =>
                        Meteor.users.update(item._id, {
                          $set: {
                            baneado: !item.baneado,
                          },
                        })
                      }
                    />
                  ) : item.baneado ? (
                    'Desabilitado'
                  ) : (
                    'Habilitado'
                  )}
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
                    size={26}
                  />{' '}
                  {item.profile.role}
                </Text>
                <Text style={styles.data}>
                  <MaterialCommunityIcons
                    name="account"
                    // color={styles.data}
                    size={26}
                  />{' '}
                  {item.username}
                </Text>
                <Text style={styles.data}>
                  <MaterialCommunityIcons
                    name="email"
                    // color={styles.data}
                    size={26}
                  />{' '}
                  {item.emails[0].address}
                </Text>
                <Text style={styles.data}>
                  <MaterialIcons
                    name="vpn-lock"
                    // color={styles.data}
                    size={26}
                  />{' '}
                  {item.baneado ? 'Desabilitado' : 'Habilitado'}
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
                  size={40}
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
                  size={40}
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
                  size={40}
                />
              </Button>
            </Card.Actions>
          )}
        </Card>
      </View>
    );
  }
}
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
    backgroundColor: '#2a323d',
  },
  element: {
    fontSize: 26,
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    paddingBottom:5
  },
  data: {
    padding:3,
    fontSize: 25,
  },
});
