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
import {Card, Title, Text, Button, TextInput, Switch, List, Avatar} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const axios = require('axios').default;

var {width: screenWidth} = Dimensions.get('window');
var {height: screenHeight} = Dimensions.get('window');




class Mensaje extends React.Component {
  componentDidMount() {
    // Orientation.lockToPortrait();
    // screenWidth = Dimensions.get('window').width;
    // screenHeight = Dimensions.get('window').height;
  }

  componentWillUnmount() {
    // Orientation.unlockAllOrientations();
  }

  constructor(props) {
    super(props);
    this.state = {
      // paused: false,
      // isModalVisible: false,
      // // colorText:  Colors.darker,
      // backgroundColor: '#2a323d',
      // edit: false,
    };
  }

  render() {
    const {item} = this.props;
    // const {item} = this.props;
    // console.log(item.item)
    const user = Meteor.users.find({_id: item.item.from}).fetch()[0]
    // console.log(user)
    return (
      <List.Item
        // onPress={() => {
        //   // Alert.alert('Holaaa', item.username);
        //   navigation.navigationGeneral.navigate('User', {item});
        // }}
        title={user.profile.firstName + ' ' + user.profile.lastName}
        // titleStyle={{fontSize: 20}}
        description={item.item.mensaje}
        left={()=>
          user.services.facebook ? (
            <Avatar.Image
              // {...props}
              size={50}
              source={{uri: user.services.facebook.picture.data.url}}
            />
          ) : (
            <Avatar.Text
              // {...props}
              size={50}
              label={
                user.profile.firstName.toString().slice(0, 1) +
                user.profile.lastName.toString().slice(0, 1)
              }
            />
          )
        }
      />
    );
  }
}
export default Mensaje;

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
    paddingBottom: 5,
  },
  data: {
    padding: 3,
    fontSize: 25,
  },
  cards:{
    marginBottom:20,
    borderRadius:20,
  }
});
