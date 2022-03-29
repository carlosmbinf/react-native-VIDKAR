/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import Meteor, {withTracker} from '@meteorrn/core';
import { Mensajes } from './components/collections/collections';
ReactNativeForegroundService.register();
AppRegistry.registerComponent(appName, () => App);
var consumo = 0;
ReactNativeForegroundService.add_task(
  () => {
    // const id = Meteor.userId();
    // console.log(Meteor.status());
    // console.log(Meteor.userId());
    // Meteor.userId() && console.log(Meteor.userId());
    let countMensajes = 0;
    !Meteor.status().connected && Meteor.reconnect();
    Meteor.userId() && Meteor.subscribe('user', { _id: Meteor.userId() }, { fields: { _id: 1, descuentovpn: 1, descuentoproxy: 1, profile: 1, megasGastadosinBytes: 1, baneado: 1 } })
    Meteor.userId() && Meteor.subscribe('mensajes', Meteor.userId());
    Meteor.userId() &&(countMensajes = Mensajes.find({to: Meteor.userId(), leido: false}).count())
    let user = Meteor.userId() && Meteor.users.findOne(Meteor.userId(), { fields: { _id: 1, profile: 1, megasGastadosinBytes: 1, baneado: 1 } })
    // console.log(user);
    // let consumo = Meteor.user() && Meteor.user().megasGastadosinBytes && Meteor.user().megasGastadosinBytes ? Meteor.user().megasGastadosinBytes : 0
    // if (await Meteor.subscribe('mensajes').ready()) {
    //   console.log(
    //     JSON.stringify(Meteor.Collection('mensajes').find({}).fetch()),
    //   );
    //   //   Meteor.Collection('mensajes')
    //   //     .find({
    //   //       to: Meteor.userId(),
    //   //       leido: false,
    //   //     })
    //   //     .fetch().length
    //   //     ? console.log('tiene mensajes')
    //   //     : console.log('no tiene count');
    //   //   //     .find({to: Meteor.userId()})
    //   //     .count();
    // } else {
    //   console.log('No tiene mensajes');
    // }
    !Meteor.status().connected && 
    ReactNativeForegroundService.update({
      id: 144,
      title: 'Bienvenido a VidKar',
      message: 'Usted se encuentra Offline, por favor conectese a internet!',
      visibility: 'private',
      // largeicon: 'home',
      vibration: false,
      // button: true,
      // buttonText: 'Abrir Vidkar',
      importance: 'none',
      // number: '10000',
      
      // icon: 'home',
    });

    Meteor.status().connected && !user &&
    ReactNativeForegroundService.update({
      id: 144,
      title: 'Bienvenido a VidKar',
      message: 'Debe iniciar sesión para ver el Consumo!',
      visibility: 'private',
      // largeicon: 'home',
      vibration: false,
      button: true,
      buttonText: 'Abrir Vidkar',
      importance: 'none',
      // number: '10000',
      
      // icon: 'home',
    });

    Meteor.status().connected && user &&
      ReactNativeForegroundService.update({
        id: 144,
        title:
          'Bienvenido: ' +
          (user.profile &&
            user.profile.firstName +
              ' ' +
              user.profile.lastName),
        message:
          (user.megasGastadosinBytes
            ? 'Consumo: ' +
              (user.megasGastadosinBytes / 1024000).toFixed(2) +
              ' MB'
            : 'Consumo: ' + 0 + ' MB') +
          '\nProxy: ' +
          (user.baneado ? 'Desabilitado' : 'Habilitado') + (countMensajes?"\nTiene " + countMensajes + " Mensajes sin Leer!!!":""),
        visibility: 'private',
        // largeicon: 'home',
        vibration: false,
        button: true,
        buttonText: 'Abrir Vidkar',
        importance: 'none',
        // number: '10000',

        // icon: 'home',
      });
  },
  {
    delay: 10000,
    onLoop: true,
    taskId: 'meteorReconectAndConsumo',
    onError: e => console.log(`Error logging:`, e),

    // onSuccess: () =>
    //   ,
  },
);
ReactNativeForegroundService.start({
  id: 144,
  title: 'Servicio de VidKar',
  message: 'Debe iniciar sesión para ver el Consumo!',
  visibility: 'private',
  // largeicon: 'home',
  vibration: false,
  button: true,
  buttonText: 'Abrir Vidkar',
  importance: 'none',
  //   number: '10000',

  // icon: 'home',
});