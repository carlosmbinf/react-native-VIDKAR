import { Platform, AppState, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import Meteor from '@meteorrn/core';
import Geolocation from '@react-native-community/geolocation';
import { CHANNEL_IDS, createNotificationChannels } from './utils/notificationChannels';

const FOREGROUND_NOTIFICATION_ID = 'vidkar_cadete_service';

let monitorInterval = null;
let isServiceActive = false;

// ✅ VERIFICAR SI DEBE ACTIVARSE EL SERVICIO (PROMISIFICADO CORRECTAMENTE)
const shouldActivateService = () => {
  if (!Meteor.userId()) return Promise.resolve(false);

  return new Promise((resolve) => {
    Meteor.call("isModoCadete", Meteor.userId(), (error, result) => {
      if (error) {
        console.error("❌ [Verificación Cadete] Error:", error);
        resolve(false);
      } else {
        const isActive = result === true; // Forzar boolean estricto
        console.log(`✅ [Verificación Cadete] modoCadete: ${isActive}`);
        resolve(isActive);
      }s
    });
  });
};

// ✅ ACTUALIZAR NOTIFICACIÓN (NO DESLIZABLE, NO ELIMINABLE)
const updateNotificationContent = async () => {
  try {
    await notifee.displayNotification({
      id: FOREGROUND_NOTIFICATION_ID,
      title: '🚀 Modo Cadete Activo',
      body: 'Recibiendo Órdenes!!!',
      android: {
        channelId: CHANNEL_IDS.FOREGROUND_SERVICE,
        importance: AndroidImportance.LOW,
        
        // ✅ CONFIGURACIÓN PARA SERVICIO FOREGROUND PERSISTENTE
        ongoing: true,                    // No se puede deslizar para eliminar
        asForegroundService: true,        // Marca como servicio foreground
        autoCancel: false,                // No se cancela al tocar
        foregroundServiceType: ['location', 'dataSync'],

        // ✅ PREVENIR ELIMINACIÓN POR COMPLETO
        pressAction: {
          id: 'default',
          launchActivity: 'default',     // Solo abre la app, no elimina notificación
        },
        
        // ✅ ÍCONO Y VISUALIZACIÓN
        smallIcon: 'ic_launcher',
        
        // ✅ PRIORIDAD ALTA PARA MANTENERLA VISIBLE
        visibility: AndroidVisibility.PUBLIC,
        category:"service",
        // ✅ PREVENIR LIMPIEZA AUTOMÁTICA
        // timeoutAfter: 0,               // Sin timeout (mantener indefinidamente)

      },
    });

    console.log('✅ [Notificación Cadete] Actualizada correctamente (persistente)');
  } catch (error) {
    console.error('❌ Error actualizando notificación:', error);
  }
};

// ✅ INICIAR SERVICIO (SOLO SI modoCadete = true)
const startForegroundService = async () => {
  if (isServiceActive) {
    console.log('⚠️ [Servicio Cadete] Ya está activo');
    return;
  }

  try {
    await createNotificationChannels();
    await updateNotificationContent();
    isServiceActive = true;

    console.log('✅ [Servicio Cadete] Iniciado correctamente');
  } catch (error) {
    console.error('❌ [Servicio Cadete] Error iniciando:', error);
  }
};

// ✅ DETENER SERVICIO
const stopForegroundService = async () => {
  if (!isServiceActive) {
    console.log('⚠️ [Servicio Cadete] Ya está detenido');
    return;
  }

  try {
    await notifee.cancelNotification(FOREGROUND_NOTIFICATION_ID);
    isServiceActive = false;
    console.log('🔴 [Servicio Cadete] Detenido correctamente');
  } catch (error) {
    console.error('❌ Error deteniendo servicio:', error);
  }
};

// ✅ MONITOREAR ESTADO DE modoCadete
const monitorModoCadete = async () => {
  const shouldBeActive = await shouldActivateService();
  console.log('🟢 [Monitor Cadete] Estado actual:', {
    timestamp: new Date().toISOString(),
    appState: AppState.currentState,
    meteorConnected: Meteor.status().connected,
    userId: Meteor.userId() || 'No autenticado',
    modoCadete: shouldBeActive,
    serviceActive: isServiceActive,
  });

  if (shouldBeActive && !isServiceActive) {
    console.log('🚀 [Monitor Cadete] Activando servicio...');
    await startForegroundService();
  } else if (!shouldBeActive && isServiceActive) {
    console.log('🛑 [Monitor Cadete] Desactivando servicio...');
    await stopForegroundService();
  }

  if (shouldBeActive) {
    // ✅ OBTENER Y ENVIAR UBICACIÓN AL SERVIDOR
    try {
      let hasPermission = false;

      // Solicitar/verificar permisos según plataforma
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación',
            message: 'VidKar necesita acceso a tu ubicación para el modo cadete',
            buttonPositive: 'Aceptar',
            buttonNegative: 'Cancelar',
          }
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS: verificar permiso (se solicita automáticamente en primera llamada)
        hasPermission = true;
      }

      if (!hasPermission) {
        console.warn('⚠️ [Ubicación Cadete] Permiso de ubicación denegado');
        return;
      }

      // Obtener ubicación actual
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
          
          // ✅ LOG LOCAL (para debugging)
          console.log('📍 [Ubicación Cadete]:', {
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            accuracy: accuracy ? `±${accuracy.toFixed(0)}m` : 'N/A',
            altitude: altitude ? `${altitude.toFixed(0)}m` : 'N/A',
            speed: speed ? `${speed.toFixed(2)}m/s` : 'N/A',
            timestamp: new Date(position.timestamp).toISOString(),
          });

          // ✅ ENVIAR AL BACKEND (solo si está conectado a Meteor)
          if (Meteor.status().connected && Meteor.userId()) {
            const locationData = {
              userId: Meteor.userId(),
              location: {
                latitude,
                longitude,
                accuracy: accuracy || 0,
                altitude: altitude || null,
                heading: heading || null,
                speed: speed || null,
                timestamp: position.timestamp,
              },
            };

            Meteor.call('cadete.updateLocation', locationData, (error, result) => {
              if (error) {
                console.error('❌ [Envío Ubicación] Error:', error.reason || error.message);
              } else {
                console.log('✅ [Envío Ubicación] Enviada correctamente al servidor');
              }
            });
          } else {
            console.warn('⚠️ [Envío Ubicación] No conectado a Meteor, ubicación no enviada');
          }
        },
        (error) => {
          console.warn('⚠️ [Ubicación Cadete] Error obteniendo ubicación:', {
            code: error.code,
            message: error.message,
          });
        },
        {
          enableHighAccuracy: true, // true pq sino no funciona
          timeout: 10000,
          maximumAge: 15000, // Caché de 15 segundos
        }
      );
    } catch (error) {
      console.error('❌ [Ubicación Cadete] Error:', error.message);
    }
  }
};

// ✅ INICIALIZAR MONITOR
const AndroidForegroundService = async () => {
  if (Platform.OS !== 'android') {
    console.log('⚠️ Servicio solo disponible en Android');
    return;
  }

  console.log("📡 [Servicio Cadete] iniciando susbscipcion:");
  // Verificación inicial
  await monitorModoCadete();

  // Monitoreo cada 5 segundos
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(() => {
    monitorModoCadete();
  }, 20000);

  // Manejar cambios de estado de la app
  const handleAppStateChange = (nextAppState) => {
    console.log(`📱 [App State] Cambió a: ${nextAppState}`);
    monitorModoCadete();
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  // Cleanup al desmontar
  return () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    subscription.remove();
    stopForegroundService();
  };
};

export default AndroidForegroundService;
export { startForegroundService, stopForegroundService };
