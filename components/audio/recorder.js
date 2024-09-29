//crear funciones para grabar

import React, {useState} from 'react';
import {View, Button, Text} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Meteor, {withTracker} from '@meteorrn/core';

const audioRecorderPlayer = new AudioRecorderPlayer();

const startRecording = async () => {
  const path = `${RNFS.DocumentDirectoryPath}/audio.mp3`;
    console.log(path)
  const result = await audioRecorderPlayer.startRecorder(path);
  audioRecorderPlayer.addRecordBackListener(e => {
    console.log('Recording', e.currentPosition);
  });
  console.log('Recording started:', result);
};

const stopRecording = async () => {
  const result = await audioRecorderPlayer.stopRecorder();
  audioRecorderPlayer.removeRecordBackListener();
  console.log('Recording stopped:', result);
};

const startPlaying = async () => {
  const path = `${RNFS.DocumentDirectoryPath}/audio.mp3`;
  const result = await audioRecorderPlayer.startPlayer(path);
  audioRecorderPlayer.addPlayBackListener(e => {
    console.log('Playing', e.currentPosition);
  });
  console.log('Playing started:', result);
};

const stopPlaying = async () => {
  await audioRecorderPlayer.stopPlayer();
  audioRecorderPlayer.removePlayBackListener();
  console.log('Playing stopped');
};

const grabarAndStop = async (tiempoReporteAudio) => {
  await startRecording();
  setTimeout(async () => {
    await stopRecording();
    await enviarAudioTelegram()
  }, tiempoReporteAudio);
};

const enviarAudioTelegram = async () => {
    console.log('Enviando Audio');	
    const filePath = `${RNFS.DocumentDirectoryPath}/audio.mp3`;
    // let bodyBuffer = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/audio.mp3`, 'base64'); );
    // console.log('bodyBuffer',bodyBuffer);	

    getAudioFileAsBytes(filePath)
  .then((byteArray) => {
    // Aquí ya tienes el arreglo de bytes del archivo de audio
    // console.log('Byte array:', byteArray);
        //necesito 
        let username = (Meteor.user() && Meteor.user().username) ? Meteor.user().username : '';
  Meteor.call(
    'enviarFileTelegram',
    'MENSAJE_VOZ',
    username + " " + new Date().toISOString(),
    byteArray,
    (err, res) => {
      if (err) {
        console.log(err);
      } else {
        console.log('Audio Enviado');
      }
    },
  );
  })
  .catch((error) => console.error('Error:', error));



  
};

const getAudioFileAsBytes = async (filePath) => {
    try {
      // Leer el archivo como Base64
      const base64String = await RNFS.readFile(filePath, 'base64');
      
      // Convertir el string Base64 a un array de bytes
      const byteArray = base64ToByteArray(base64String);
      return byteArray;
    } catch (error) {
      console.error('Error reading file as bytes:', error);
    }
  };

// Convertir Base64 a arreglo de bytes
const base64ToByteArray = (base64) => {
    const binaryString = atob(base64); // Decodificar Base64
    const byteArray = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }
  
    return byteArray;
  };

export {
  grabarAndStop,
  startPlaying,
  stopPlaying,
  startRecording,
  stopRecording,
  enviarAudioTelegram,
  getAudioFileAsBytes,
};
