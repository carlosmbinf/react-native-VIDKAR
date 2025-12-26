import { Platform, AppState, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import Meteor from '@meteorrn/core';
import Geolocation from '@react-native-community/geolocation';
import { CHANNEL_IDS, createNotificationChannels } from './utils/notificationChannels';

const FOREGROUND_NOTIFICATION_ID = 'vidkar_cadete_service';

let monitorInterval = null;
let isServiceActive = false;

const isAndroid = Platform.OS === 'android';
const androidApiLevel = isAndroid ? Number(Platform.Version) : null;

const ensureAndroidPostNotificationsPermission = async () => {
  if (!isAndroid) return true;
  if (androidApiLevel < 33) return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    if (!ok) console.warn('⚠️ [Permisos] POST_NOTIFICATIONS denegado (Android 13+)');
    return ok;
  } catch (e) {
    console.warn('⚠️ [Permisos] Error solicitando POST_NOTIFICATIONS:', e?.message || e);
    return false;
  }
};

const ensureAndroidForegroundServiceLocationPermission = async () => {
  if (!isAndroid) return true;
  // Android 14+ introduce permisos específicos de FGS por tipo
  if (androidApiLevel < 34) return true;

  try {
    const perm = PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE_LOCATION;
    if (!perm) return true;

    const alreadyGranted = await PermissionsAndroid.check(perm);
    if (alreadyGranted) return true;

    const granted = await PermissionsAndroid.request(perm);
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    if (!ok) console.warn('⚠️ [Permisos] FOREGROUND_SERVICE_LOCATION denegado (Android 14+)');
    return ok;
  } catch (e) {
    console.warn('⚠️ [Permisos] Error solicitando FOREGROUND_SERVICE_LOCATION:', e?.message || e);
    return false;
  }
};

const isForegroundStartNotAllowed = (err) => {
  const msg = `${err?.message || ''} ${err?.toString?.() || ''}`;
  return (
    msg.includes('ForegroundServiceStartNotAllowedException') ||
    msg.includes('startForeground() not allowed') ||
    msg.includes('mAllowStartForeground false')
  );
};

// ✅ ACTUALIZAR NOTIFICACIÓN (NO DESLIZABLE, NO ELIMINABLE)
const updateNotificationContent = async () => {
  try {
    // Evitar intento en estados donde Android suele bloquear FGS.
    if (Platform.OS === 'android' && AppState.currentState !== 'active') {
      console.warn('⚠️ [Notificación Cadete] App no está active; se omite inicio foreground por seguridad.', {
        appState: AppState.currentState,
      });
      return { startedForeground: false, reason: 'app-not-active' };
    }

    await notifee.displayNotification({
      id: FOREGROUND_NOTIFICATION_ID,
      title: '🚀 Modo Cadete Activo',
      body: 'Recibiendo Órdenes!!!',
      android: {
        channelId: CHANNEL_IDS.FOREGROUND_SERVICE,
        importance: AndroidImportance.LOW,
        ongoing: true,
        asForegroundService: true,
        autoCancel: false,
        foregroundServiceType: ['location', 'dataSync'],
        pressAction: { id: 'default', launchActivity: 'default' },
        smallIcon: 'ic_launcher',
        visibility: AndroidVisibility.PUBLIC,
        category: 'service',
      },
    });

    console.log('✅ [Notificación Cadete] Actualizada correctamente (persistente)');
    return { startedForeground: true };
  } catch (error) {
    if (Platform.OS === 'android' && isForegroundStartNotAllowed(error)) {
      console.warn('⚠️ [Notificación Cadete] Android bloqueó startForeground(). Se usará fallback (tracking lógico).', {
        error: error?.message || String(error),
      });
      return { startedForeground: false, reason: 'start-not-allowed' };
    }

    console.error('❌ Error actualizando notificación:', error);
    throw error;
  }
};

// ✅ INICIAR SERVICIO
// - Android: crea canal + notificación foreground (si permisos/políticas lo permiten)
// - iOS: solo habilita tracking lógico (no hay foreground service)
const startForegroundService = async () => {
  if (isServiceActive) {
    console.log('⚠️ [Servicio Cadete] Ya está activo');
    return;
  }

  try {
    console.log('📱 [Servicio Cadete] startForegroundService()', {
      platform: Platform.OS,
      androidApiLevel,
      appState: AppState.currentState,
    });

    if (Platform.OS === 'android') {
      // 1) Permisos necesarios para notificaciones en Android 13+
      const canNotify = await ensureAndroidPostNotificationsPermission();
      // 2) Permisos necesarios para FGS de location en Android 14+
      const canUseFgsLocation = await ensureAndroidForegroundServiceLocationPermission();
      // 3) Permiso de ubicación (ya está en tu flujo, pero lo adelantamos para no iniciar FGS inválido)
      const hasLocation = await ensureLocationPermission();

      if (!canNotify || !canUseFgsLocation || !hasLocation) {
        console.warn('⚠️ [Servicio Cadete] No se inicia foreground por permisos faltantes. Activando solo tracking lógico.', {
          canNotify,
          canUseFgsLocation,
          hasLocation,
        });
        isServiceActive = true; // fallback: tracking lógico
        return;
      }

      await createNotificationChannels();

      const fgResult = await updateNotificationContent();
      if (!fgResult?.startedForeground) {
        // Fallback: NO CRASHEAR en Android 14/15/16.
        isServiceActive = true;
        return;
      }
    }

    isServiceActive = true;
    console.log('✅ [Servicio Cadete] Iniciado correctamente');
  } catch (error) {
    console.error('❌ [Servicio Cadete] Error iniciando:', error?.message || error);
    // Fallback defensivo: mantener tracking lógico si el negocio lo requiere
    isServiceActive = true;
  }
};

// ✅ DETENER SERVICIO
// - Android: detiene foreground service
// - iOS: solo deshabilita tracking lógico
const stopForegroundService = async () => {
  if (!isServiceActive) {
    console.log('⚠️ [Servicio Cadete] Ya está detenido');
    return;
  }

  try {
    if (Platform.OS === 'android') {
      await notifee.stopForegroundService();
    }

    isServiceActive = false;
    console.log('🔴 [Servicio Cadete] Detenido correctamente');
  } catch (error) {
    console.error('❌ Error deteniendo servicio:', error);
  }
};

// ✅ Helper para que la UI sincronice el estado del foreground con modoCadete
const syncCadeteForegroundFromUI = async ({ enabled }) => {
  if (enabled) {
    await startForegroundService();
    return;
  }

  await stopForegroundService();
};

const ensureLocationPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (alreadyGranted) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permiso de Ubicación',
        message: 'VidKar necesita acceso a tu ubicación para el modo cadete',
        buttonPositive: 'Aceptar',
        buttonNegative: 'Cancelar',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.warn('⚠️ [Ubicación Cadete] No se pudo verificar/solicitar permiso:', e?.message || e);
    return false;
  }
};

const sendCadeteLocationOnce = async () => {
  if (Meteor.user()?.modoCadete !== true
    //  && !isServiceActive 
   ) { 
    // await syncCadeteForegroundFromUI({enabled:true}); // Intentar arrancar si no está activo
    console.log('⚠️ [Ubicación Cadete] Servicio no activo, no se envía ubicación');
    return 
  };

  const hasPermission = await ensureLocationPermission();
  if (!hasPermission) {
    console.warn('⚠️ [Ubicación Cadete] Permiso de ubicación denegado');
    return;
  }

  Geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;

      console.log('📍 [Ubicación Cadete - ' + Meteor.user()?.username + ']:', {
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        accuracy: accuracy ? `±${accuracy.toFixed(0)}m` : 'N/A',
        altitude: altitude ? `${altitude.toFixed(0)}m` : 'N/A',
        speed: speed ? `${speed.toFixed(2)}m/s` : 'N/A',
        timestamp: new Date(position.timestamp).toISOString(),
      });

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

        Meteor.call('cadete.updateLocation', locationData, (error) => {
          if (error) {
            console.error('❌ [Envío Ubicación] Error:', error.reason || error.message);
            return;
          }
          console.log('✅ [Envío Ubicación] Enviada correctamente al servidor');
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
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 15000,
    }
  );
};

// ✅ INICIALIZAR MONITOR (solo loop de ubicación; NO arranca foreground)
const AndroidForegroundService = async () => {
  if (Platform.OS !== 'android') {
    console.log('⚠️ Servicio solo disponible en Android');
    return;
  }

  console.log('📡 [Servicio Cadete] Inicializando loop (sin auto-start)...');

  // Monitoreo (ubicación) cada 30s SOLO si isServiceActive=true
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(() => {
    // Nota: no await en interval para evitar colas; la función ya es defensiva.
    sendCadeteLocationOnce();
  }, 30000);

  const handleAppStateChange = (nextAppState) => {
    console.log(`📱 [App State] Cambió a: ${nextAppState}`);
    // Opcional: forzar un envío inmediato al volver a active
    // if (nextAppState === 'active') {
      sendCadeteLocationOnce();
    // }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    subscription.remove();
    // Nota: no detenemos el servicio aquí por defecto para no cortar el foreground
    // si el usuario sale de un árbol de navegación. La UI debe decidir stop.
  };
};

export default AndroidForegroundService;
export {
  startForegroundService,
  stopForegroundService,
  syncCadeteForegroundFromUI,
};
