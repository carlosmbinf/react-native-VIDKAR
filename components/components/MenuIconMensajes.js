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
  Badge,
  Menu,
  Divider,
  Button,
  Modal,
} from 'react-native-paper';
import Carousel, {ParallaxImage} from 'react-native-snap-carousel';
// import * as axios from 'axios';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
// import Header from 'react-native-custom-header';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import Task from '../tasks/Task';

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const {width: screenWidth} = Dimensions.get('window');
const MyCol = new Meteor.Collection('mensajes');
// Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  //   componentDidMount() {
  //     Orientation.lockToPortrait();
  //   }

  //   componentWillUnmount() {
  //     Orientation.unlockAllOrientations();
  //   }
  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = MyCol.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.state = {
      count: 0,
      text: '',
      menuVisible: false,
      countMensajes: props.myTodoTasks.count(),
    };

    // console.log(this.props.myTodoTasks);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [isLoading, setLoading] = useState(true);
    // const carouselRef = useRef(null);
  }
  render() {
    const {user, loading, navigation, myTodoTasks} = this.props;
    const countMensajes = myTodoTasks.count();
    const arrayMensajes = myTodoTasks.fetch();

    !loading &&
      ReactNativeForegroundService.add_task(
        () => {
          console.log(JSON.stringify(arrayMensajes));
        },
        {
          delay: 10000,
          onLoop: false,
          taskId: 'taskid',
          onError: e => console.log(`Error logging:`, e),
          onSuccess: () =>
            ReactNativeForegroundService.update({
              id: 144,
              title: 'Vidkar',
              message:
                Meteor.userId() && countMensajes > 0
                  ? 'Tiene ' + countMensajes + ' Mensajes Nuevos'
                  : 'you are online!',
              visibility: false,
              largeicon: 'home',
              vibration: true,
              button: true,
              buttonText: 'Abrir Vidkar',
              // icon: 'account',
            }),
        },
      );

    ReactNativeForegroundService.start({
      id: 144,
      title: 'Foreground Service',
      message: 'you are online!',
      visibility: false,
      largeicon: 'home',
      vibration: true,
      button: true,
      buttonText: 'Abrir Vidkar',
      // icon: 'account',
    });

    const Item = item => {
      <Menu.Item onPress={() => {}} title="Item 2" />;
      //   <List.Item
      //     title={item.to}
      //     titleStyle={{fontSize: 20}}
      //     // description={<Divider />}
      //   />;
    };
    // let isDarkMode = {
    //   return (useColorScheme() === 'dark');
    // };

    //  console.log({user});
    return (
      <View
        style={{
          // paddingTop: 50,
          flexDirection: 'row',
          justifyContent: 'center',
        }}>
        <Menu
          style={{top: 70, width: 270, height: 400, paddingRight: 30}}
          visible={this.state.menuVisible}
          onDismiss={() => this.setState({menuVisible: false})}
          anchor={
            !loading &&
            countMensajes > 0 && (
              <View>
                <Badge
                  style={{
                    position: 'absolute',
                    right: 3,
                    top: 3,
                    zIndex: 1,
                  }}>
                  <Text>{countMensajes}</Text>
                </Badge>
                <IconButton
                  icon="email"
                  color="black"
                  size={25}
                  //  disabled
                  onPress={() => {
                    this.setState({menuVisible: true});
                    // navigation.navigate('Mensajes', Meteor.user);
                  }}
                />
              </View>
            )
          }>
          {/* <FlatList
            style={{backgroundColor: '#2a323d'}}
            data={arrayMensajes}
            renderItem={({item}) => Item(item)}
            keyExtractor={(item, index) => index}
          /> */}
          {!loading && countMensajes > 0 && (
            <View>
              <Button
                icon="eye-check-outline"
                onPress={() => {
                  // alert(Meteor.user()._id
                  this.setState({menuVisible: false});
                  myTodoTasks.fetch().forEach(element => {
                    MyCol.update(
                      element._id,
                      {
                        $set: {leido: true},
                      },
                      {multi: true},
                    );
                  });
                  // MyCol.update(
                  //   {},
                  //   {
                  //     $set: {leido: true},
                  //   },
                  //   {multi: true},
                  // );
                  // );
                }}>
                Marcar como leidos
              </Button>
              {arrayMensajes.map((item, index) => (
                <View key={index}>
                  <List.Item
                    onPress={() => {
                      Alert.alert(
                        Meteor.users.findOne({_id: item.from}) &&
                          'De: ' +
                            Meteor.users.findOne({_id: item.from}).profile
                              .firstName +
                            ' ' +
                            Meteor.users.findOne({_id: item.from}).profile
                              .lastName,
                        item.mensaje,
                        [
                          {
                            text: 'Leido',
                            onPress: () => {
                              this.setState({menuVisible: false});
                              MyCol.update(item._id, {
                                $set: {leido: true},
                              });
                            },
                            style: 'cancel',
                          },
                          // {text: 'OK', onPress: () => console.log('OK Pressed')},
                        ],
                      );
                      // navigation.navigationGeneral.navigate('User', {item});
                    }}
                    title={
                      Meteor.users.findOne({_id: item.from}) &&
                      'De: ' +
                        Meteor.users.findOne({_id: item.from}).profile
                          .firstName +
                        ' ' +
                        Meteor.users.findOne({_id: item.from}).profile.lastName
                    }
                    titleStyle={{fontSize: 15}}
                    description={item.mensaje}
                    descriptionStyle={{fontSize: 10}}
                    left={props =>
                      Meteor.users.findOne({_id: item.from}) &&
                      Meteor.users.findOne({_id: item.from}).services &&
                      Meteor.users.findOne({_id: item.from}).services
                        .facebook && (
                        <Avatar.Image
                          {...props}
                          size={50}
                          source={{
                            uri:
                              Meteor.users.findOne({_id: item.from}) &&
                              Meteor.users.findOne({_id: item.from}).services &&
                              Meteor.users.findOne({_id: item.from}).services
                                .facebook &&
                              Meteor.users.findOne({_id: item.from}).services
                                .facebook.picture.data.url,
                          }}
                        />
                      )
                    }
                  />
                  {/* <Text>{index + 1 != arrayMensajes.length}</Text> */}

                  {index != arrayMensajes.length - 1 && <Divider />}
                </View>
              ))}
            </View>
          )}

          {/* <Menu.Item onPress={() => {}} title="Item 1" />
          <Menu.Item onPress={() => {}} title="Item 2" />
          <Divider />
          <Menu.Item onPress={() => {}} title="Item 3" /> */}
        </Menu>
      </View>
    );
  }
}
const MenuIconMensajes = withTracker(navigation => {
  //  console.log(user.user)
  const handle1 = Meteor.subscribe('user');
  const handle2 = Meteor.subscribe('mensajes', Meteor.userId());
  const myTodoTasks = MyCol.find({to: Meteor.userId(), leido: false});
  return {
    navigation,
    myTodoTasks,
    loading: !handle1.ready() && !handle2.ready,
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({});

export default MenuIconMensajes;