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
    // console.log(Meteor.status().connected);
    // Meteor.userId() && console.log(Meteor.userId());
    let countMensajes = 0;
    !Meteor.status().connected && Meteor.reconnect();
    Meteor.userId() && Meteor.subscribe('userID',Meteor.userId())
    Meteor.userId() && Meteor.subscribe('mensajes', Meteor.userId());
    Meteor.userId() &&(countMensajes = Mensajes.find({to: Meteor.userId(), leido: false}).count())
    // (consumo = Meteor.user()&&Meteor.user().megasGastadosinBytes&&Meteor.user().megasGastadosinBytes?Meteor.user().megasGastadosinBytes:0)
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
    !Meteor.status().connected||!Meteor.userId()&&
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

    Meteor.userId() &&
      ReactNativeForegroundService.update({
        id: 144,
        title:
          'Bienvenido: ' +
          (Meteor.user().profile &&
            Meteor.user().profile.firstName +
              ' ' +
              Meteor.user().profile.lastName),
        message:
          (Meteor.user().megasGastadosinBytes
            ? 'Consumo: ' +
              (Meteor.user().megasGastadosinBytes / 1000000).toFixed(2) +
              ' MB'
            : 'Consumo: ' + 0 + ' MB') +
          '\nProxy: ' +
          (Meteor.user().baneado ? 'Desabilitado' : 'Habilitado') + (countMensajes?"\nTiene " + countMensajes + " Mensajes, entre a la App para revisar los Mensajes!!!":""),
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
    delay: 1000,
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
  vibration: true,
  button: true,
  buttonText: 'Abrir Vidkar',
  importance: 'none',
  //   number: '10000',

  // icon: 'home',
});