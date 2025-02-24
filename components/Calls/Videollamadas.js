import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PermissionsAndroid, Platform, Image } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { io } from 'socket.io-client';

const Videollamada = () => {
  const socket = useRef(null);
  const cameraRef = useRef(null);
  const [remoteFrame, setRemoteFrame] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [buffer, setBuffer] = useState([]);  // Buffer para almacenar los fotogramas

  useEffect(() => {
    socket.current = io('http://192.168.1.42:3003');
    socket.current.on('connect', () => {
      console.log('Conectado al servidor de sockets');
    });
    socket.current.on('receive-video', (frameData) => {
      setRemoteFrame(frameData); // Establecer el frame recibido
    });
    socket.current.on('disconnect', () => {
      console.log('Desconectado del servidor de sockets');
    });

    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        if (
          granted['android.permission.CAMERA'] !== 'granted' ||
          granted['android.permission.RECORD_AUDIO'] !== 'granted'
        ) {
          console.log('Permisos no concedidos');
          return;
        }
      }
    };

    requestPermissions();

    const captureFrame = async () => {
      if (cameraRef.current) {
        const options = { quality: 0.5, base64: true };
        const data = await cameraRef.current.takePictureAsync(options);  // Captura el fotograma

        // Almacenar el fotograma en el buffer
        setBuffer((prevBuffer) => [...prevBuffer, data.base64]);

        setPhoto(data.base64); // Establecer el fotograma capturado
        // Enviar el fotograma al servidor en base64
        socket.current.emit('send-video', data.base64);
      }
    };

    const interval = setInterval(() => {
      captureFrame();
    }, 100); // Captura un fotograma cada 100 ms

    return () => {
      clearInterval(interval);
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.remoteVideo}>
        {remoteFrame && (
          <Image
            source={{ uri: `data:image/png;base64,${remoteFrame}` }} // Mostrar el frame remoto recibido
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </View>

      <RNCamera
        ref={cameraRef}
        style={styles.localVideo}
        type={RNCamera.Constants.Type.front}
        useCamera2Api={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
  },
});

export default Videollamada;
