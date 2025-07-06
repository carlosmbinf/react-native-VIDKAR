import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PermissionsAndroid, Platform, Dimensions } from 'react-native';
import { mediaDevices, RTCView, RTCSessionDescription, RTCPeerConnection } from 'react-native-webrtc';
import Meteor, { withTracker } from '@meteorrn/core';
import { Button } from 'react-native-paper';
import { CallsCollection } from '../collections/collections';

const myApp = ({ callPendiente }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [pc, setPc] = useState(null);       // Conexión del caller
  const [isCaller, setIsCaller] = useState(false);
  const [callId, setCallId] = useState(null);
  const [answerReceived, setAnswerReceived] = useState(false);
  const receiverPC = useRef(null);          // Conexión del receptor

  // Solicitar permisos de cámara y micrófono
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      ]);
      if (
        granted['android.permission.CAMERA'] !== 'granted' ||
        granted['android.permission.RECORD_AUDIO'] !== 'granted'
      ) {
        console.log('Permisos no concedidos');
      }
    }
  };

  // Obtener stream local y crear la conexión para el caller
  const getLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
      console.log("Receptor recibe stream ", stream);
      setLocalStream(stream);
      createCallerPC(stream);
    } catch (err) {
      console.log('Error al obtener el stream:', err);
    }
  };

  // Crear la conexión del caller (RTCPeerConnection)
  const createCallerPC = (stream) => {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const connection = new RTCPeerConnection(configuration);
    stream.getTracks().forEach(track => connection.addTrack(track, stream));

    connection.onicecandidate = event => {
      if (event.candidate && callId) {
        Meteor.call('calls.sendICECandidate', event.candidate, callId, err => {
          if (err) console.error('Error al enviar candidato ICE:', err);
        });
      }
    };

    connection.ontrack = event => {
      console.log('Caller recibe stream remoto:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    setPc(connection);
  };

  // Crear la offer (caller)
  const createOffer = async (targetUsername) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // setIsCaller(true);
      // Enviar offer al servidor
      Meteor.call('calls.sendOffer', offer, targetUsername, err => {
        if (err) {
          console.error('Error al enviar la offer:', err);
        } else {
          console.log('Offer enviada');
        }
      });
    } catch (error) {
      console.error('Error al crear la offer:', error);
    }
  };

  // Cuando el caller detecta que se actualizó la llamada con answer, actualiza su conexión
  useEffect(() => {
    if (callPendiente && callPendiente.answer && pc && !answerReceived) {
      console.log('Caller recibe answer:', callPendiente.caller);
      pc.setRemoteDescription(new RTCSessionDescription(callPendiente.answer))
        .then(() => {
          console.log('Conexión actualizada con answer');
          setAnswerReceived(true);
        })
        .catch(err => console.error('Error al aplicar answer en caller:', err));
    }
  }, [callPendiente, pc, answerReceived]);

  // Caller: solicitar llamada
  const requestCall = (targetUsername) => {
    Meteor.call('calls.requestCall', targetUsername, (err, result) => {
      if (err) {
        console.error('Error al solicitar llamada:', err);
      } else {
        console.log('Solicitud de llamada enviada a:', targetUsername);
        setCallId(result); // Asumimos que el método devuelve el callId (o lo obtenemos de la suscripción)
        createOffer(targetUsername);
      }
    });
  };

  // Receptor: cuando se detecta una llamada entrante, muestra UI para aceptar
  const respondCall = async (callId, accept) => {
    Meteor.call('calls.answerCall', callId, accept, err => {
      if (err) {
        console.error('Error al responder la llamada:', err);
      } else {
        console.log(accept ? 'Llamada aceptada' : 'Llamada rechazada');
      }
    });
    if (accept) {
      // Crear la conexión del receptor si no existe
      if (!receiverPC.current) {
        console.log("se esta creando el receiverPC.current");
        receiverPC.current = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        receiverPC.current.onicecandidate = event => {
          if (event.candidate && callId) {
            Meteor.call('calls.sendICECandidate', event.candidate, callId, err => {
              if (err) console.error('Error al enviar candidato ICE:', err);
            });
          }
        };
        receiverPC.current.ontrack = event => {
          console.log('Receptor recibe stream remoto:', event.streams[0]);
          setRemoteStream(event.streams[0]);
        };
        // Opcional: si el receptor envía su propio stream, se lo agregarías aquí.
      }
      try {
        const offer = callPendiente.offer;
        if (!offer) {
          console.error('No se encontró offer en la llamada');
          return;
        }
        await receiverPC.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await receiverPC.current.createAnswer();
        await receiverPC.current.setLocalDescription(answer);
        // Enviar answer al servidor para que el caller la consuma
        Meteor.call('calls.sendAnswer', answer, callId, err => {
          if (err) {
            console.error('Error al enviar la answer:', err);
          } else {
            console.log('Answer enviada');
          }
        });
      } catch (error) {
        console.error('Error al crear la answer:', error);
      }
    }
  };

  // Manejar llamada entrante (suscripción con withTracker)
  useEffect(() => {
    if (callPendiente) {
      console.log('Llamada entrante detectada:', callPendiente);
      // Asumimos que callPendiente contiene el _id y la offer
    }
  }, [callPendiente]);

  useEffect(() => {
    requestPermissions();
    getLocalStream();
    return () => {
      if (pc) pc.close();
      if (receiverPC.current) receiverPC.current.close();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.remoteVideo}>
      {remoteStream && console.log(Meteor.user().username, "remoteStream URL: ", remoteStream.toURL())}
        {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={styles.remoteStream} />}
      </View>
      <View style={styles.localVideo}>
      {localStream && console.log(Meteor.user() && Meteor.user().username, "localStream URL: ", localStream.toURL())}
        {localStream && <RTCView mirror streamURL={localStream.toURL()} style={styles.localStream} />}
      </View>
      {/* Botón para que el caller inicie la llamada */}
      {!isCaller && localStream && (
        <View style={styles.buttonContainer}>
          <Button onPress={() => requestCall('prueba')}>Iniciar llamada</Button>
        </View>
      )}
      {/* Si hay una llamada pendiente para el receptor, se muestran botones para aceptar/rechazar */}
      {console.log("callPendiente",callPendiente)}
      {callPendiente && callPendiente.status === 'pending' && callPendiente.target  == Meteor.user().username && (
        <View style={styles.callActionContainer}>
          <Button onPress={() => respondCall(callPendiente._id, true)}>Aceptar</Button>
          <Button onPress={() => respondCall(callPendiente._id, false)}>Rechazar</Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: 'black',
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },
  remoteVideo: { flex: 1 },
  localVideo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
  },
  remoteStream: { 
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },
  localStream: { width: 100, height: 150, borderRadius: 10 },
  buttonContainer: {
    position: 'absolute',
    backgroundColor: 'red',
    height: 50,
    width: 150,
    bottom: 300,
    left: 20,
    zIndex: 1,
  },
  callActionContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 150,
    height: 100,
    bottom: 100,
    left: 20,
    zIndex: 2,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
});

const Videollamada = withTracker(() => {
  Meteor.subscribe('incomingCalls',{$or:[{ target: Meteor.user().username, status: 'pending' },{ caller: Meteor.user().username, status: 'pending' }]}).ready();
  const callPendiente =  CallsCollection.findOne({$or:[{ target: Meteor.user().username, status: 'pending' },{ caller: Meteor.user().username, status: 'pending' }]});
console.log(Meteor.user().username,"callPendiente ", callPendiente);
  return { callPendiente };
})(myApp);


export default Videollamada