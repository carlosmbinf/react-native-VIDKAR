/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
// import type {Node} from 'react';
import {
  Avatar,
  IconButton,
  List,
  Provider as PaperProvider,
  Text,
  Switch,
  Title,
  TextInput,
  Surface,
  Button,
} from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
// import Header from 'react-native-custom-header';
import Mensajes from './MensajesDetails';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  VirtualizedList,
  Dimensions,
  Platform,
  RefreshControl,
  SectionList,
  TouchableHighlight,
  Alert,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
// import PelisCard from './PelisCard';
// import Loguin from '../loguin/Loguin';
import Orientation from 'react-native-orientation';
import { Mensajes as MensajesCollection } from '../collections/collections';
import { GiftedChat } from 'react-native-gifted-chat';

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const { width: screenWidth } = Dimensions.get('window');
// Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  componentDidMount() {
    Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }
  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = MensajesCollection.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.state = {
      screenHeigth: Dimensions.get('window').height - 90,
      count: 0,
      isDarkMode: useColorScheme == 'dark',
      data: props.myTodoTasks,
      // loading: props.loading,
      carouselRef: null,
      refreshing: false,
      text: '',
    };
    
    // console.log(this.props.myTodoTasks);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [isLoading, setLoading] = useState(true);
    // const carouselRef = useRef(null);
  }
  useLayoutEffect(){
    this.setState({
      screenHeigth: Dimensions.get('window').height - 90,
    })
  };
  sendMensaje = (message) => {
    //  alert(JSON.stringify(message[0]))
    MensajesCollection.insert({ from: Meteor.userId(), to: this.props.user, mensaje: message[0].text });
    this.setState({ text: "" })
  }
  render() {
    const { user, loading, navigation, myTodoTasks } = this.props;

    // let isDarkMode = {
    //   return (useColorScheme() === 'dark');
    // };
    const backgroundStyle = {
      backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: this.state.screenHeigth,
    };

    //  console.log({user});
    return (
      <Surface style={{ flex: 1 }}>
        {/* <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          // style={backgroundStyle}
        //  refreshControl={
        //    <RefreshControl
        //      refreshing={this.state.refreshing}
        //      onRefresh={onRefresh}
        //    />
        //  }
        > */}
          {loading ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                height: this.state.screenHeigth,
                // backgroundColor: '#2a323d',
                justifyContent: 'center',
              }}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View>
          ) : (

            <View
              style={{
                flex: 1,
                // flexDirection: 'column',
                height: this.state.screenHeigth,
                // backgroundColor: '#2a323d',
                // justifyContent: 'center',
              }}
            >
              {/* <ScrollView> */}
              <GiftedChat
                // messagesContainerStyle={{
                //   backgroundColor:"red",

                // }}
                alignTop={true}
                infiniteScroll={true}
                wrapInSafeArea={true}
                // forceGetKeyboardHeight={true}
                // scrollToBottomComponent={Button}
                // renderUsernameOnMessage={true}
                // renderAvatarOnTop={true}
                isTyping={true}
                // onQuickReply={element => alert(JSON.stringify(element))}
                // loadEarlier={true}
                // isLoadingEarlier={true}
                renderQuickReplySend={<Button>HOLA</Button>}
                textInputProps={{ color: "black" }}
                // showAvatarForEveryMessage={true}
                onSend={message => this.sendMensaje(message)}
                // alwaysShowSend={true}
                messages={myTodoTasks}
                placeholder="Escriba el mensaje aquí!!!"
                user={{ _id: Meteor.userId(), name: Meteor.user() && (Meteor.user().profile.firstName + " " + Meteor.user().profile.lastName) }}
              />
              {/* </ScrollView> */}


              {/* <Text>{myTodoTasks.length}</Text> */}
              {/* {myTodoTasks.length == 0 ? <Text>SIN MENSAJES</Text> : myTodoTasks.map(item => <Mensajes item={item} />)} */}

            </View>

            // <FlatList
            //   // style={{backgroundColor: '#2a323d'}}
            //   data={myTodoTasks}
            //   renderItem={item => }
            //   keyExtractor={(item, index) => item._id}
            // />

          )}
        {/* </ScrollView> */}

        {/* <Text>
            {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
          </Text> */}

        {/* {Meteor.user()&&Meteor.user().profile.role == 'admin' && (
          <Surface style={styles.footer}>
            <TextInput
            mode='outlined'
              style={{width: '80%',height:40,}}
              label="Mensaje"
              value={this.state.text}
              onChangeText={text => this.setState({text: text})}
              autoFocus={true}
              blurOnSubmit={true}
            />
            {this.state.text ? (
              <IconButton
                icon="send-circle"
                color="#3f51b5"
                size={40}
                onPress={() => this.sendMensaje(this.state.text)}
              />
            ) : (
              <IconButton
                icon="send-circle"
                // color="red"
                size={40}
                disabled
                onPress={event => this.sendMensaje(this.state.text)}
              />
            )}
          </Surface>
        )} */}
      </Surface>
    );
  }
}

function sortFunction(a, b) {
  var dateA = new Date(a.createdAt).getTime();
  var dateB = new Date(b.createdAt).getTime();
  return dateA < dateB ? 1 : -1;
};

const MensajesHome = withTracker(user => {
  //  console.log(user.user)
  // const handle = Meteor.subscribe('mensajes', user.user._id);



  // const myTodoTasks = MensajesCollection.find({ to: user.user._id }).fetch();

  const handle = Meteor.subscribe("mensajes");

  let id = user.user
  let list = []
  // let mensajes = MensajesCollection.find({ $or: [{ from: Meteor.userId() }, { from: from }, { to: Meteor.userId() }, { to: from }] }, { sort: { createdAt: -1 } }).fetch()
  let mensajes = MensajesCollection.find({ $or: [{ $and: [{ from: id, to: Meteor.userId() }] }, { $and: [{ from: Meteor.userId(), to: id }] }] }, { sort: { createdAt: -1 } }).fetch()

  // console.log(JSON.stringify(mensajes));
  mensajes.forEach(element => {
    Meteor.subscribe("user", element.from, { fields: { "profile.firstName": 1, "profile.lastName": 1 } })
    element.to == Meteor.userId() && !element.leido && MensajesCollection.update(element._id, { $set: { leido: true } })
    // let firstName = user(element.from) && user(element.from).profile && user(element.from).profile.firstName
    // let lastName = user(element.from) && user(element.from).profile && user(element.from).profile.lastName
    list.push(
      {
        _id: element._id,
        // position: element.from == Meteor.userId() ? "right" : "left",
        // type: element.type ? element.type : "text",
        text: element.mensaje,
        createdAt: element.createdAt,
        user: {
          _id: element.from,
          name: Meteor.users.findOne(element.from) && Meteor.users.findOne(element.from).profile.firstName + " " + Meteor.users.findOne(element.from).profile.lastName,
          avatar: element.services && element.services.facebook && element.services.facebook && element.services.facebook.picture.data.url 
        }
        ,
        sent: true,
        received: element.leido
        // theme: 'black',
        // data: {
        //     videoURL: 'https://www.w3schools.com/html/mov_bbb.mp4',
        //     audioURL: 'https://www.w3schools.com/html/horse.mp3',
        //     uri: `/favicon.ico`,
        //     status: {
        //         click: true,
        //         loading: 0.5,
        //         download: element.type === 'video',
        //     },
        //     size: "100MB",
        //     width: 300,
        //     height: 300,
        //     latitude: '37.773972',
        //     longitude: '-122.431297',
        //     staticURL: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-circle+FF0000(LONGITUDE,LATITUDE)/LONGITUDE,LATITUDE,ZOOM/270x200@2x?access_token=KEY',
        // }
      }
    )
  })
  list.sort(sortFunction);

  return {
    user: user.user,
    myTodoTasks: list,
    loading: !handle.ready(),
  };
})(MyApp);

var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  data: {},
  footer: {
    //  position:'absolute',
    bottom: 0,
    // left: 0,
    // right: 0,
    // width:'90%',
    height: 55,
    padding: 10,
    paddingTop: 0,
    paddingBottom: 0,
    // margin:10,
    borderRadius: 20,
    // backgroundColor: 'red',
    //  padding:5,
    //  flex: 1,
    flexDirection: 'row',
    // flexWrap: 'wrap',
    alignItems: 'center'
  },
});

export default MensajesHome;
