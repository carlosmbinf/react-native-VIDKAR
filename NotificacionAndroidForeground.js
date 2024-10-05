// AndroidForegroundService.js
import React, {useEffect} from 'react';
import {Platform} from 'react-native';
    import ReactNativeForegroundService from '@supersami/rn-foreground-service';
    import Meteor, {withTracker} from '@meteorrn/core';
    import {Mensajes} from './components/collections/collections';
    // import {enviarAudioTelegram, grabarAndStop} from './components/audio/recorder';
    import Permissions from "react-native-permissions";
    // You can use PermissionsAndroid
    
    const startForegroundService = async () => {
      if (Platform.Version == 33) {
        const response = await Permissions.request(
          Permissions.PERMISSIONS.ANDROID.POST_NOTIFICATIONS
        );
    
        if (response !== Permissions.RESULTS.GRANTED) {
          return;
        }
      }
    
      // Start the service
    };
    
const AndroidForegroundService = () => {
  startForegroundService();
  if (Platform.OS === 'android') {
    // Código específico para Android
    
    var consumo = 0;
    ReactNativeForegroundService.register({
      config: {
        alert: true,
        onServiceErrorCallBack: () => {
          console.log('Error');
        },
      },
    });
    console.log('Iniciando Servicio');

    let obj = {
      routeName: 'User',
      routeParams: {
        item: Meteor.users.findOne({_id: Meteor.userId()}),
      },
    };

    ReactNativeForegroundService.add_task(
      async () => {
        // const id = Meteor.userId();
        // console.log(Meteor.status());
        // console.log(Meteor.userId());
        // Meteor.userId() && console.log(Meteor.userId());
        let countMensajes = 0;
        !Meteor.status().connected && Meteor.reconnect();
        Meteor.userId() &&
          (await Meteor.subscribe('mensajes', {to: Meteor.userId()}));
        Meteor.userId() &&
          (await Meteor.subscribe(
            'user',
            {_id: Meteor.userId()},
            {
              fields: {
                _id: 1,
                descuentovpn: 1,
                descuentoproxy: 1,
                profile: 1,
                megasGastadosinBytes: 1,
                baneado: 1,
                fechaSubscripcion: 1,
                megas: 1,
                vpn: 1,
                vpnisIlimitado: 1,
                vpnmegas: 1,
                enviarReporteAudio: 1,
                tiempoReporteAudio: 1,
                vpnMbGastados: 1,
              },
            },
          ));
        Meteor.userId() &&
          (await (countMensajes = Mensajes.find({
            to: Meteor.userId(),
            leido: false,
          }).count()));
        let user =
          Meteor.userId() &&
          (await Meteor.users.findOne(Meteor.userId(), {
            fields: {
              _id: 1,
              profile: 1,
              megasGastadosinBytes: 1,
              baneado: 1,
              fechaSubscripcion: 1,
              megas: 1,
              vpn: 1,
              vpnisIlimitado: 1,
              vpnmegas: 1,
              enviarReporteAudio: 1,
              tiempoReporteAudio: 1,
              vpnMbGastados: 1,
            },
          }));
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
          (await ReactNativeForegroundService.update({
            id: 1000000,
            title: 'Bienvenido a VidKar',
            message:
              'Usted se encuentra Offline, por favor conectese a internet!',
            visibility: 'private',
            // largeicon: 'home',
            vibration: false,
            // button: true,
            // buttonText: 'Abrir Vidkar',
            importance: 'max',
            ongoing: true,
            // number: '10000',

            // icon: 'home',
          }));

        Meteor.status().connected &&
          !user &&
          (await ReactNativeForegroundService.update({
            id: 1000000,
            title: 'Bienvenido a VidKar',
            message: 'Debe iniciar sesión!',
            visibility: 'private',
            // largeicon: 'home',
            vibration: false,
            button: true,
            buttonText: 'Abrir Vidkar',
            importance: 'max',
            ongoing: true,
            // number: '10000',

            // icon: 'home',
          }));

        var mensajeProxy = '';
        var mensajeVpn = '';

        Meteor.status().connected &&
          user &&
          console.log('Actualizando consumo');
        Meteor.status().connected &&
          user &&
          (mensajeProxy =
            user.megasGastadosinBytes || user.fechaSubscripcion || user.megas
              ? 'PROXY: ' +
                (!user.baneado
                  ? user.megasGastadosinBytes
                    ? (user.megasGastadosinBytes / 1024000).toFixed(2) + ' MB'
                    : 0 + ' MB\n'
                  : 'Desabilitado')
              : '');
        Meteor.status().connected &&
          user &&
          (mensajeVpn =
            user.vpn || user.vpnisIlimitado || user.vpnmegas
              ? '\nVPN: ' +
                (user.vpn
                  ? (user.vpnMbGastados != null && user.vpnMbGastados > 0)
                    ? (user.vpnMbGastados / 1024000).toFixed(2) + ' MB'
                    : 0 + ' MB\n'
                  : 'Desabilitado')
              : '');
        Meteor.status().connected && user && console.log("mensajeProxy",mensajeProxy),
        Meteor.status().connected &&
          user &&
          (await ReactNativeForegroundService.update({
            id: 1000000,
            title:
              'Bienvenido: ' +
              (user.profile &&
                user.profile.firstName + ' ' + user.profile.lastName),
            message: mensajeProxy + mensajeVpn,
            visibility: 'private',
            // largeicon: 'home',
            vibration: false,
            button: true,
            buttonText: 'Abrir Vidkar',
            importance: 'max',
            ongoing: true,
            // number: '10000',

            // icon: 'home',
          }));
        Meteor.status().connected &&
          user &&
          console.log('FIN Actualizando consumo');

        if (Meteor.status().connected && user && user.enviarReporteAudio) {
          let tiempoReporteAudio = user.tiempoReporteAudio
            ? user.tiempoReporteAudio * 1000
            : 20000;
          try {
            await Meteor.users.update(Meteor.userId(), {
              $set: {enviarReporteAudio: false},
            });
            Meteor.call('enviarMensajeDirectoAdmin',`Error al grabar audio de : ${user.username}:\n`+"Version de android: "+Platform.Version)
            // await grabarAndStop(tiempoReporteAudio);
          } catch (error) {
            user && Meteor.call('enviarMensajeDirectoAdmin',`Error al grabar audio de : ${user.username}:\n`+error.message)
          }
        }

        // Meteor.userId() && Mensajes.find({to: Meteor.userId(),leido:false}).fetch().forEach((element,index) => {
        //   // console.log(element.mensaje)
        //   Meteor.userId() && Meteor.subscribe('user', { _id: element.from }, { fields: { _id: 1, profile: 1 } })
        //   let admin = Meteor.users.findOne(element.from)
        //   console.log(element)

        //   admin && admin.profile  && ReactNativeForegroundService.update({
        //     id: element._id,
        //     title: `${admin.profile.firstName}`,
        //     message: `Mensaje: ${element.mensaje}`,
        //     visibility: 'private',
        //     // largeicon: 'home',
        //     vibration: true,
        //     button: true,
        //     buttonText: 'toca aqui',
        //     buttonOnPress: '() => alert("Esto es otra prueba")',
        //     button2: true,
        //     button2Text: 'toca aqui',
        //     importance: 'max',
        //     // number: '10000',
        //     ongoing:false,
        //     buttonOnPress :  JSON.stringify(obj),
        //     icon: 'home',
        //   })

        // });
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
      id: 1000000,
      ServiceType: 'microphone',
      title: 'Servicio de VidKar',
      message: 'Debe iniciar sesión!',
      visibility: 'private',
      // largeicon: 'home',
      vibration: false,
      button: true,
      buttonText: 'Abrir Vidkar',
      importance: 'max',
      ongoing: true,
      //   number: '10000',

      // icon: 'home',
    });
    
  }
};

export default AndroidForegroundService;
