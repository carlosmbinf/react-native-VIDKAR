import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {View, ScrollView, Text, Dimensions, StyleSheet} from 'react-native';
import Header from 'react-native-custom-header';
import Video, {TextTrackType} from 'react-native-video';
// Meteor.connect('ws://10.0.2.2:3000/websocket');
// const Todos = new Mongo.Collection('pelisRegister');
import Modal from 'react-native-modal';

import Orientation from 'react-native-orientation';
import { Card } from 'react-native-paper';
import { Colors } from 'react-native/Libraries/NewAppScreen';
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
    };
  }
  render() {
    const {item} = this.props;

    console.log(item);
    return (
      
       <View style={styles.root}>
           <Card style={{marginBottom:30}}>
             <Card.Content >
              <View style={styles.element}>
              <Text style={styles.title}>
                  {'Datos Personales'}
                </Text>
                <Text style={styles.data}>
                  {'Nombre: '+item.profile.firstName}
                </Text>
                <Text style={styles.data}>
                  {'Apellidos: '+item.profile.lastName}
                </Text>
                <Text style={styles.data}>
                  {'Edad: '+item.edad}
                </Text>
              </View>
             </Card.Content>
           </Card>
           <Card>
             <Card.Content>
              <View style={styles.element}>
              <Text style={styles.title}>
                  {'Datos de Usuario'}
                </Text>
                <Text style={styles.data}>
                  {'Rol: '+item.profile.role}
                </Text>
                <Text style={styles.data}>
                  {'Usuario: '+item.username}
                </Text>
                <Text style={styles.data}>
                  {'Email: '+item.emails[0].address}
                </Text>
                <Text style={styles.data}>
                  {item.baneado?"Proxy: Desabilitado":'Proxy: Habilitado'}
                </Text>
              </View>
             </Card.Content>
           </Card>
       </View>
        
    );
  }
}

export default Player;

var styles = StyleSheet.create({
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
    padding:30,
    height: '100%',
    width: '100%',
    // borderRadius: 10,
    backgroundColor: Colors.darker
  },
  element:{
    // backgroundColor:Colors.darker,
    // color:'red',
    fontSize:26
  },
  title:{
    fontSize:26,
    textAlign:'center'
  },
  data:{
    fontSize:20
  }
});
