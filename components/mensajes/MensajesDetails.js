import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
// Meteor.connect('ws://10.0.2.2:3000/websocket');
// const Todos = new Mongo.Collection('pelisRegister');

import {
  Card,
  Title,
  Text,
  Button,
  TextInput,
  Switch,
  List,
  Avatar,
} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
    console.log(item)
    // const user = Meteor.users.findOne({_id: item.from});
    // const date = new Date(item.createdAt);
    // console.log(user)
    return <Text>{JSON.stringify(item)}</Text>
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
  cards: {
    marginBottom: 20,
    borderRadius: 20,
  },
});
