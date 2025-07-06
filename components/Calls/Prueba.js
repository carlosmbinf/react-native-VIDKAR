import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, NativeEventEmitter, NativeModules } from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const eventEmitter = new NativeEventEmitter(NativeModules.RTCEventEmitter || {});

export default function WebRTCConnection() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [offer, setOffer] = useState('');
  const [answer, setAnswer] = useState('');
  const [receivedOffer, setReceivedOffer] = useState('');
  const [receivedAnswer, setReceivedAnswer] = useState('');
  const [localIceCandidates, setLocalIceCandidates] = useState([]);
  const [remoteIceCandidates, setRemoteIceCandidates] = useState('');
  const pc = useRef(new RTCPeerConnection(configuration)).current;

  useEffect(() => {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE Candidate:', event.candidate);
        setLocalIceCandidates((prev) => [...prev, event.candidate]);
      }
    };

    pc.ontrack = (event) => {
      console.log(' ontrackevent:', event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('Signaling State:', pc.signalingState);
    };

    return () => {
      eventEmitter.removeAllListeners();
      pc.close();
    };
  }, []);

  const startConnection = async () => {
    try {
      console.log('Solicitando acceso a la cámara y micrófono...');
      const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      console.log('Creando oferta...');
      const newOffer = await pc.createOffer();
      await pc.setLocalDescription(newOffer);
      console.log('Oferta creada y configurada localmente:', newOffer);
      setOffer(JSON.stringify(newOffer));
    } catch (error) {
      console.error('Error en startConnection:', error);
    }
  };

  const acceptOffer = async () => {
    try {
      if (pc.signalingState !== 'stable') {
        console.warn('No se puede aceptar la oferta en el estado actual:', pc.signalingState);
        return;
      }
      console.log('Aceptando oferta...');
      const parsedOffer = JSON.parse(receivedOffer);
      await pc.setRemoteDescription(new RTCSessionDescription(parsedOffer));
      console.log('Oferta establecida como descripción remota.');

      console.log('Creando respuesta...');
      const newAnswer = await pc.createAnswer();
      await pc.setLocalDescription(newAnswer);
      console.log('Respuesta creada y configurada localmente:', newAnswer);
      setAnswer(JSON.stringify(newAnswer));
    } catch (error) {
      console.error('Error en acceptOffer:', error);
    }
  };

  const setRemoteAnswer = async () => {
    try {
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('No se puede establecer la respuesta en este estado:', pc.signalingState);
        return;
      }
      console.log('Estableciendo respuesta remota...');
      const parsedAnswer = JSON.parse(receivedAnswer);
      await pc.setRemoteDescription(new RTCSessionDescription(parsedAnswer));
      console.log('Respuesta remota establecida correctamente.');
    } catch (error) {
      console.error('Error en setRemoteAnswer:', error);
    }
  };

  const addRemoteCandidates = async () => {
    try {
      if (!remoteIceCandidates.trim()) return;
      if (pc.signalingState === 'closed') {
        console.warn('PeerConnection está cerrado. No se pueden agregar candidatos ICE.');
        return;
      }
      const candidates = remoteIceCandidates.split('\n').map(line => JSON.parse(line));
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Candidato ICE remoto agregado:', candidate);
      }
    } catch (error) {
      console.error('Error agregando candidatos ICE remotos:', error);
    }
  };

  return (
    <ScrollView>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: 150 }}>
        <Button title="Iniciar Conexión" onPress={startConnection} />
        {offer && <Text>Oferta generada, compártela con la otra persona:</Text>}
        <TextInput value={offer} style={{ borderWidth: 1, width: '100%', height: 100, marginVertical: 10 }} multiline />

        <Text>Introduce una oferta remota:</Text>
        <TextInput value={receivedOffer} onChangeText={setReceivedOffer} style={{ borderWidth: 1, width: '100%', height: 100, marginVertical: 10 }} multiline />
        <Button title="Aceptar Oferta" onPress={acceptOffer} />

        {answer && <Text>Respuesta generada, compártela con la otra persona:</Text>}
        <TextInput value={answer} style={{ borderWidth: 1, width: '100%', height: 100, marginVertical: 10 }} multiline />

        <Text>Introduce una respuesta remota:</Text>
        <TextInput value={receivedAnswer} onChangeText={setReceivedAnswer} style={{ borderWidth: 1, width: '100%', height: 100, marginVertical: 10 }} multiline />
        <Button title="Establecer Respuesta Remota" onPress={setRemoteAnswer} />

        <Text> Candidatos ICE generados: </Text>
        <TextInput value={localIceCandidates.map(c => JSON.stringify(c)).join('\n')} editable={true} style={{ borderWidth: 1, width: '100%', height: 100, marginVertical: 10 }} multiline />
        
        <Text> Introduce los candidatos ICE remotos: </Text>
        <TextInput value={remoteIceCandidates} onChangeText={setRemoteIceCandidates} style={{ borderWidth: 1, width: '100%', height: 100, marginVertical: 10 }} multiline />
        <Button title="Agregar Candidatos ICE" onPress={addRemoteCandidates} />

        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          {localStream && <RTCView streamURL={localStream.toURL()} style={{ width: 150, height: 200, margin: 5 }} />}
          {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={{ width: 150, height: 200, margin: 5 }} />}
        </View>
      </View>
    </ScrollView>
  );
}
