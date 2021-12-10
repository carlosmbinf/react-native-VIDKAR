/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useRef, useEffect, useState} from 'react';
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
} from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
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
import {Mensajes as MensajesCollection} from '../collections/collections';

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const {width: screenWidth} = Dimensions.get('window');
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
  render() {
    const {user, loading, navigation, myTodoTasks} = this.props;

    // let isDarkMode = {
    //   return (useColorScheme() === 'dark');
    // };
    const backgroundStyle = {
      backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: ScreenHeight,
    };
    function sendMensaje(text) {
      //  alert(text)
      MensajesCollection.insert({from: Meteor.userId(), to: user._id, mensaje: text});
    }
    //  console.log({user});
    return (
      <Surface style={{flex: 1}}>
        {/* <ScrollView
           contentInsetAdjustmentBehavior="automatic"
           style={backgroundStyle}
           refreshControl={
             <RefreshControl
               refreshing={this.state.refreshing}
               onRefresh={onRefresh}
             />
           }> */}
        {loading ? (
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
              height: ScreenHeight,
              // backgroundColor: '#2a323d',
              justifyContent: 'center',
            }}>
            <ActivityIndicator size="large" color="#3f51b5" />
          </View>
        ) : (
          <FlatList
            // style={{backgroundColor: '#2a323d'}}
            data={myTodoTasks}
            renderItem={item => <Mensajes item={item} />}
            keyExtractor={(item, index) => item._id}
          />
        )}

        {/* <Text>
            {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
          </Text> */}
        {/* </ScrollView> */}
        {Meteor.user().profile.role == 'admin' && (
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
                onPress={() => sendMensaje(this.state.text)}
              />
            ) : (
              <IconButton
                icon="send-circle"
                // color="red"
                size={40}
                disabled
                onPress={event => sendMensaje(this.state.text)}
              />
            )}
          </Surface>
        )}
      </Surface>
    );
  }
}
const MensajesHome = withTracker(user => {
  //  console.log(user.user)
  const handle = Meteor.subscribe('mensajes', user.user._id);
  const myTodoTasks = MensajesCollection.find({to: user.user._id}).fetch();
  return {
    user: user.user,
    myTodoTasks,
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
    padding:10,
    paddingTop:0,
    paddingBottom:0,
    // margin:10,
    borderRadius:20,
    // backgroundColor: 'red',
    //  padding:5,
    //  flex: 1,
    flexDirection: 'row',
    // flexWrap: 'wrap',
    alignItems:'center'
  },
});

export default MensajesHome;
