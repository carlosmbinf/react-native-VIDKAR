/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import Meteor, {withTracker} from '@meteorrn/core';
ReactNativeForegroundService.register();
AppRegistry.registerComponent(appName, () => App);
Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

ReactNativeForegroundService.add_task(
  () => {
    // const id = Meteor.userId();
    // console.log(Meteor.status().connected);
    // Meteor.userId() && console.log(Meteor.userId());
    !Meteor.status().connected && Meteor.reconnect();
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
    //   //   //   const a = Meteor.Collection('mensajes')
    //   //   //     .find({to: Meteor.userId()})
    //   //     .count();
    // } else {
    //   console.log('No tiene mensajes');
    // }
  },
  {
    delay: 60000,
    onLoop: true,
    taskId: 'meteorReconect',
    onError: e => console.log(`Error logging:`, e),
    // onSuccess: () =>
    //   ,
  },
);
ReactNativeForegroundService.start({
  id: 144,
  title: 'Servicio de VidKar',
  message: 'you are online!',
  visibility: 'private',
  // largeicon: 'home',
  vibration: true,
  button: true,
  buttonText: 'Abrir Vidkar',
  importance: 'none',
  //   number: '10000',

  // icon: 'home',
});