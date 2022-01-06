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
// import * as axios from 'axios';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Alert,
} from 'react-native';
import {Mensajes} from '../collections/collections';

class MyApp extends React.Component {
  //   componentDidMount() {
  //     Orientation.lockToPortrait();
  //   }

  //   componentWillUnmount() {
  //     Orientation.unlockAllOrientations();
  //   }
  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = Mensajes.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.state = {
      count: 0,
      text: '',
      menuVisible: false,
      countMensajes: props.myTodoTasks.count(),
      contador: 0,
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
    // !loading &&
    //   ReactNativeForegroundService.add_task(
    //     () => {
    //       if (this.state.contador != countMensajes) {
    //         this.state.contador = countMensajes;
    //         ReactNativeForegroundService.update({
    //           id: 144,
    //           title: 'VidKar',
    //           message:
    //             Meteor.userId() && countMensajes > 0
    //               ? 'Tiene ' + countMensajes + ' Mensajes Nuevos'
    //               : 'you are online!',
    //           visibility: 'private',
    //           // largeicon: 'home',
    //           vibration: true,
    //           button: true,
    //           buttonText: 'Abrir Vidkar',
    //           importance: 'none',
    //           number: '10000',
    //           // icon: 'home',
    //         });
    //       }
    //     },
    //     {
    //       delay: 10000,
    //       onLoop: false,
    //       taskId: 'taskid',
    //       onError: e => console.log(`Error logging:`, e),
    //       // onSuccess: () =>
    //       //   ,
    //     },
    //   );

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
              <ScrollView contentInsetAdjustmentBehavior="automatic">
                
              <Button
                icon="eye-check-outline"
                onPress={() => {
                  // alert(Meteor.user()._id
                  this.setState({menuVisible: false});
                  myTodoTasks.fetch().forEach(element => {
                    Mensajes.update(
                      element._id,
                      {
                        $set: {leido: true},
                      },
                      {multi: true},
                    );
                  });
                  // Mensajes.update(
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
                  navigation.navigation.navigate('Mensaje', { item: item.from })

                      // Alert.alert(
                      //   Meteor.users.findOne({_id: item.from}) &&
                      //     'De: ' +
                      //       Meteor.users.findOne({_id: item.from}).profile
                      //         .firstName +
                      //       ' ' +
                      //       Meteor.users.findOne({_id: item.from}).profile
                      //         .lastName,
                      //   item.mensaje,
                      //   [
                      //     {
                      //       text: 'Leido',
                      //       onPress: () => {
                      //         this.setState({menuVisible: false});
                      //         Mensajes.update(item._id, {
                      //           $set: {leido: true},
                      //         });
                      //       },
                      //       style: 'cancel',
                      //     },
                      //     // {text: 'OK', onPress: () => console.log('OK Pressed')},
                      //   ],
                      // );
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
              
              </ScrollView>
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
  const handle2 = Meteor.subscribe('mensajes', {to:Meteor.userId()});
  const myTodoTasks = Mensajes.find({to: Meteor.userId(), leido: false});

  return {
    navigation,
    myTodoTasks,
    loading: !handle2.ready,
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({});

export default MenuIconMensajes;
