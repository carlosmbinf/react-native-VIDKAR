/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useRef, useState} from 'react';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import {StatusBar, StyleSheet} from 'react-native';
import {Text,Provider as PaperProvider,} from 'react-native-paper';
import App from './App';
import Loguin from './components/loguin/Loguin';
import HomePedidosComercio from './components/comercio/pedidos/HomePedidosComercio';
import CadeteNavigator from './components/cadete/CadeteNavigator';
import MyService from './src/native/MyService';
import { SafeAreaProvider } from 'react-native-safe-area-context';

console.log('Main.js');
class MyApp extends React.Component {
  //   componentDidMount() {
  //     Orientation.lockToPortrait();
  //   }

  //   componentWillUnmount() {
  //     Orientation.unlockAllOrientations();
  //   }
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // if (Meteor.userId()) {
    //   Meteor.subscribe('userId', Meteor.userId());
    // }
  }

  render() {
    const {user,ready} = this.props;
     console.log("DATA:" + ready);
     console.log("DATA:" + JSON.stringify(Meteor.status()));


    return (
      <SafeAreaProvider>
<PaperProvider>
      {ready && user?.modoCadete ? (
        // Modo Cadete activo: mostrar pantalla dedicada
        <CadeteNavigator />
      ) : Meteor.userId() ? (
        // Usuario autenticado: ir a App principal
        <>
        <StatusBar
          translucent={true}
          backgroundColor={'transparent'}
          barStyle={'light-content'}
        />
        <App />
        </>
      ) : (
        // Sin autenticación: mostrar Login
        <>
        <StatusBar
          translucent={true}
          backgroundColor={'transparent'}
          barStyle={'light-content'}
        />
        <Loguin />
        </>
      )}
      </PaperProvider>
      </SafeAreaProvider>
    );
  }
}
const ServerList = withTracker(navigation => {
  //  console.log(user.user)
  
  const ready = (Meteor.userId() && Meteor.subscribe('user', {_id:Meteor.userId()}).ready()) || false;
  let user = Meteor.user();

    const userId = Meteor.userId();
    console.log('🔍 [Main.js Debug] Variables de estado:', {
      'Meteor.userId()': userId,
      'Meteor.status().connected': Meteor.status().connected,
      'ready': ready,
      'user': user ? {
        _id: user._id,
        username: user.username,
        modoCadete: user.modoCadete,
        profile: user.profile
      } : null,
      'Meteor.status()': Meteor.status()
        });
    if (Meteor.status().connected && ready && userId) {
        // MyService.isRunning().then(e => console.log("MyService.isRunning - ready && user: ", e)).catch(error => { })
        console.log("MyService.start()");
        MyService.setMeteorUserId(userId);
        MyService.start();
      
    } else if ( Meteor.status().connected && ready) {
      console.log("MyService.stop()");

      MyService.setMeteorUserId(null);
      MyService.stop();
    }
  //  console.log(myTodoTasks);
  return {
    user,
    ready
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff'},
  head: {height: 40, backgroundColor: '#f1f8ff'},
  text: {margin: 6},
});

export default ServerList;
