import { Platform, AppState, Alert } from 'react-native';
import Meteor from '@meteorrn/core';
import RNGeolocation from 'react-native-geolocation-service';
import { badgeManager, ensureLocationPermissions } from './services/notifications/PushMessaging';
import Geolocation from 'react-native-geolocation-service';

let monitorInterval = null;
let watchId = null;
let isServiceActive = false;

/**
 * Obtener ubicación en background en iOS
 * Usa react-native-geolocation-service para mejor soporte de background
 */
const startLocationTracking = () => {
  if (Platform.OS !== 'ios' || watchId !== null) {
    console.log('⚠️ [iOS Location] Ya está rastreando o no es iOS');
    return;
  }

  try {
    // Geolocation.requestAuthorization('always');
    // Usar watchPosition para rastreo continuo
    watchId = RNGeolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;

        console.log('📍 [iOS Location] Ubicación obtenida:', {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          accuracy: accuracy ? `±${accuracy.toFixed(0)}m` : 'N/A',
          speed: speed ? `${speed.toFixed(2)}m/s` : 'Detenido',
          timestamp: new Date(position.timestamp).toISOString(),
        });

        // Enviar al backend si está conectado
        if (Meteor.status().connected && Meteor.userId()) {
          const locationData = {
            userId: Meteor.userId(),
            cordenadas: {
              latitude,
              longitude,
              accuracy: accuracy || 0,
              altitude: altitude || null,
              heading: heading || null,
              speed: speed || null,
              timestamp: position.timestamp,
            },
          };
          // Enviar ubicación al servidor Meteor
          Meteor.call('cadete.updateLocation', locationData, (error, result) => {
            if (error) {
              console.error('❌ [iOS Location] Error al enviar:', error.reason || error.message);
            } else {
              console.log('✅ [iOS Location] Enviada al servidor');
            }
          });
        } else {
          console.warn('⚠️ [iOS Location] No conectado a Meteor, ubicación no enviada');
        }
      },
      (error) => {
        console.warn('⚠️ [iOS Location] Error obteniendo ubicación:', {
          code: error.code,
          message: error.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // No usar caché, siempre obtener ubicación fresca
        distanceFilter: 0, // Obtener cada cambio de ubicación
        forceRequestLocation: true, // Forzar obtención de nueva ubicación
        useSignificantChanges: false, // No usar cambios significativos, obtener frecuentemente
      }
    );

    console.log('✅ [iOS Location] Rastreo iniciado. Watch ID:', watchId);
    isServiceActive = true;
  } catch (error) {
    console.error('❌ [iOS Location] Error iniciando rastreo:', error.message);
  }
};

/**
 * Detener rastreo de ubicación
 */
const stopLocationTracking = () => {
  if (watchId !== null) {
    RNGeolocation.clearWatch(watchId);
    watchId = null;
    isServiceActive = false;
    console.log('🛑 [iOS Location] Rastreo detenido');
  }
};

/**
 * Verificar si debe estar activo el rastreo
 */
const shouldActivateService = () => {
  if (!Meteor.userId()) return Promise.resolve(false);

  return new Promise((resolve) => {
    Meteor.call('isModoCadete', Meteor.userId(), (error, result) => {
      if (error) {
        console.error('❌ [iOS Verificación] Error:', error);
        resolve(false);
      } else {
        resolve(result === true);
      }
    });
  });
};

/**
 * Monitor principal del servicio de ubicación iOS
 */
const monitorLocationService = async () => {
  try {
    const shouldBeActive = await shouldActivateService();
    console.log(`📡 [iOS Location Monitor] Modo cadete: ${shouldBeActive ? 'ACTIVO' : 'INACTIVO'}`);
    


    if (shouldBeActive && !isServiceActive) {
      console.log('🚀 [iOS Location Monitor] Activando rastreo...');
      startLocationTracking();
    } else if (!shouldBeActive && isServiceActive) {
      console.log('🛑 [iOS Location Monitor] Desactivando rastreo...');
      stopLocationTracking();
    }
  } catch (error) {
    console.error('❌ [iOS Location Monitor] Error en monitor:', error.message);
  }
};

/**
 * Inicializar servicio de ubicación iOS
 */
const IOSLocationService = async () => {
  if (Platform.OS !== 'ios') {
    console.log('⚠️ Servicio solo disponible en iOS');
    return;
  }

  console.log('📡 [iOS Location Service] Iniciando...');

  // Verificación inicial
  await monitorLocationService();

  // Limpiar monitor anterior si existe
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }

  // Monitor cada 30 segundos para verificar si debe estar activo
  monitorInterval = setInterval(() => {
    monitorLocationService();
  }, 30000);

  // Manejar cambios de estado de la app
  const handleAppStateChange = (nextAppState) => {
    console.log(`📱 [iOS App State] Cambió a: ${nextAppState}`);
    if (nextAppState === 'active') {
      badgeManager.reset();
    }
    monitorLocationService();
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  // Cleanup al desmontar
  return () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    subscription.remove();
    stopLocationTracking();
  };
};

export default IOSLocationService;
export { startLocationTracking, stopLocationTracking };
