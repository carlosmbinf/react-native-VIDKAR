import {Alert, Platform, PermissionsAndroid} from 'react-native';
import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import Meteor from '@meteorrn/core';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';

// Carga condicional de notifee (opcional)
let NotifeeLib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotifeeLib = require('@notifee/react-native');
} catch (e) {
  console.warn('[PushMessaging] @notifee/react-native no instalado; se usará Alert en primer plano.');
}



// ✅ Sistema profesional de gestión de badge
class BadgeManager {
  private static instance: BadgeManager;

  private constructor() {}

  static getInstance(): BadgeManager {
    if (!BadgeManager.instance) {
      BadgeManager.instance = new BadgeManager();
    }
    return BadgeManager.instance;
  }

  /**
   * Incrementa el badge en iOS de forma segura
   * Se llama automáticamente cuando llega cualquier notificación
   */
  async increment(): Promise<void> {
    if (Platform.OS !== 'ios' || !NotifeeLib?.default) {
      console.log('[BadgeManager] Incrementar badge: no soportado en esta plataforma o sin Notifee.');
      return;}

    try {
      const currentBadge = await NotifeeLib.default.getBadgeCount();
      const newBadge = currentBadge + 1;
      await NotifeeLib.default.setBadgeCount(newBadge);
      console.log(`[BadgeManager] 🔔 Badge: ${currentBadge} → ${newBadge}`);
    } catch (error) {
      console.warn('[BadgeManager] Error incrementando badge:', error);
    }
  }

  /**
   * Resetea el badge a 0 en iOS
   * Se llama cuando el usuario abre la app
   */
  async reset(): Promise<void> {
    if (Platform.OS !== 'ios' || !NotifeeLib?.default) return;

    try {
      await NotifeeLib.default.setBadgeCount(0);
      console.log('[BadgeManager] ✅ Badge reseteado a 0');
    } catch (error) {
      console.warn('[BadgeManager] Error reseteando badge:', error);
    }
  }

  /**
   * Obtiene el badge actual
   */
  async getCount(): Promise<number> {
    if (Platform.OS !== 'ios' || !NotifeeLib?.default) return 0;

    try {
      return await NotifeeLib.default.getBadgeCount();
    } catch (error) {
      console.warn('[BadgeManager] Error obteniendo badge:', error);
      return 0;
    }
  }

  /**
   * Decrementa el badge (útil para marcar notificaciones como leídas)
   */
  async decrement(amount: number = 1): Promise<void> {
    if (Platform.OS !== 'ios' || !NotifeeLib?.default) return;

    try {
      const currentBadge = await NotifeeLib.default.getBadgeCount();
      const newBadge = Math.max(0, currentBadge - amount);
      await NotifeeLib.default.setBadgeCount(newBadge);
      console.log(`[BadgeManager] 🔽 Badge: ${currentBadge} → ${newBadge}`);
    } catch (error) {
      console.warn('[BadgeManager] Error decrementando badge:', error);
    }
  }

  /**
   * Establece un valor específico de badge
   */
  async setCount(count: number): Promise<void> {
    if (Platform.OS !== 'ios' || !NotifeeLib?.default) return;

    try {
      const safeCount = Math.max(0, Math.floor(count));
      await NotifeeLib.default.setBadgeCount(safeCount);
      console.log(`[BadgeManager] 🎯 Badge establecido a: ${safeCount}`);
    } catch (error) {
      console.warn('[BadgeManager] Error estableciendo badge:', error);
    }
  }
}

// Exportar instancia singleton
export const badgeManager = BadgeManager.getInstance();

// Tipos
export type PushData = Record<string, string | number | boolean | null | undefined>;
export type SendMessagePayload = {
  toUserId: string;             // Meteor.userId() destino
  title: string;
  body: string;
  data?: PushData;              // Datos extra para deep-link/navegación
};

export type SetupOptions = {
  onForegroundMessage?: (m: FirebaseMessagingTypes.RemoteMessage) => void;
  onNotificationOpenedApp?: (m: FirebaseMessagingTypes.RemoteMessage) => void;
  onInitialNotification?: (m: FirebaseMessagingTypes.RemoteMessage) => void;
  onToken?: (token: string) => void;
};

// Utils internos
const getTitle = (m?: FirebaseMessagingTypes.RemoteMessage) =>
  m?.notification?.title || (m?.data?.title as string) || 'Nueva notificación';

const getBody = (m?: FirebaseMessagingTypes.RemoteMessage) =>
  m?.notification?.body ||
  (m?.data?.body as string) ||
  (m?.data ? JSON.stringify(m.data) : 'Tienes un nuevo mensaje');

const displayLocalNotification = async (remoteMessage?: FirebaseMessagingTypes.RemoteMessage, allowAlert = true) => {
  const title = getTitle(remoteMessage);
  const body = getBody(remoteMessage);

  // ✅ Incrementar badge de forma profesional
  // await badgeManager.increment();

  if (NotifeeLib?.default) {
    const notifee = NotifeeLib.default;
    try {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'General',
        importance: 4, // HIGH
      });
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: {id: 'default'},
        },
        ios: {
          foregroundPresentationOptions: {alert: true, badge: true, sound: true},
        },
      });
    } catch (err) {
      console.warn('[PushMessaging] Error Notifee:', err);
      if (allowAlert) Alert.alert(title, body);
    }
  } else if (allowAlert) {
    Alert.alert(title, body);
  }
};

// Background handler (ámbito de módulo). Muestra notificación (si hay Notifee).
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    if (!isForCurrentUser(remoteMessage)) return;
    await displayLocalNotification(remoteMessage, false);
  } catch (e) {
    // no-op
  }
});

// Gestión de listeners en foreground
const foregroundListeners = new Set<(m: FirebaseMessagingTypes.RemoteMessage) => void>();

export const onMessageReceived = (cb: (m: FirebaseMessagingTypes.RemoteMessage) => void) => {
  foregroundListeners.add(cb);
  return () => foregroundListeners.delete(cb);
};

// Pedir permisos y retornar si están habilitados
const requestPermissionsIfNeeded = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return !!enabled;
  } else {
    // Android 13+ requiere POST_NOTIFICATIONS
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch {}
    return true;
  }
};

// Registrar token para un usuario Meteor en backend
export const registerPushTokenForUser = async (userId?: string) => {
  try {
    const uid = userId || Meteor.userId();
    if (!uid) {
      console.warn('[PushMessaging] No hay Meteor.userId() para registrar token.');
      return;
    }
    const granted = await requestPermissionsIfNeeded();
    if (!granted && Platform.OS === 'ios') {
      console.warn('[PushMessaging] Permisos denegados en iOS.');
      return;
    }
    const token = await messaging().getToken();
    // Notificar al backend para asociar token <-> userId
    await new Promise((resolve, reject) => {
      Meteor.call(
        'push.registerToken',
        {
          userId: uid,
          token,
          platform: Platform.OS,
          updatedAt: new Date(),
        },
        (err: any, res: any) => (err ? reject(err) : resolve(res)),
      );
    });
    // Suscribir al tópico por usuario (opcional)
    // await subscribeUserTopic(uid);
    // Callback opcional
    return token;
  } catch (e) {
    console.warn('[PushMessaging] Error registrando token:', e);
  }
};

// Desregistrar token actual en backend (opcional, p.ej. logout)
export const unregisterPushTokenForUser = async (userId?: string) => {
  try {
    const uid = userId || Meteor.userId();
    if (!uid) return;
    const token = await messaging().getToken();
    await new Promise((resolve, reject) => {
      Meteor.call(
        'push.unregisterToken',
        {userId: uid, token},
        (err: any, res: any) => (err ? reject(err) : resolve(res)),
      );
    });
    // await unsubscribeUserTopic(uid);
  } catch (e) {
    console.warn('[PushMessaging] Error desregistrando token:', e);
  }
};

// Enviar mensaje a un usuario (por userId). El backend debe encargarse de:
// - persistir el mensaje (colección Mensajes)
// - resolver los tokens del toUserId
// - enviar push via FCM
export const sendMessage = async (payload: SendMessagePayload) => {
  const fromUserId = Meteor.userId();
  if (!fromUserId) throw new Error('Usuario no autenticado.');
  if (!payload?.toUserId) throw new Error('toUserId es requerido.');

  const safe = {
    fromUserId,
    toUserId: String(payload.toUserId),
    title: String(payload.title ?? ''),
    body: String(payload.body ?? ''),
    data: {
      ...(payload.data || {}),
      toUserId: String(payload.toUserId),
      fromUserId,
    },
  };

  return await new Promise((resolve, reject) => {
    Meteor.call(
      'messages.send',
      safe,
      (err: any, res: any) => {
        if (err) {
          // pista clara si el backend no tiene el método registrado
          if (err?.error === 404 || /Method.*not found/i.test(err?.message || '')) {
            console.warn('[PushMessaging] Backend no tiene registrado messages.send. Verifique server/main.js -> import "./metodos/mensajeriaPush"');
          }
          return reject(err);
        }
        resolve(res);
      },
    );
  });
};

// Inicializar listeners de push en la app
export const setupPushListeners = async (options?: SetupOptions) => {
  // ✅ Resetear badge al abrir la app de forma profesional
  await badgeManager.reset();

  // Permisos y token inicial
  const granted = await requestPermissionsIfNeeded();
  if (granted) {
    try {
      const token = await messaging().getToken();
      options?.onToken?.(token);
    } catch (e) {
      console.warn('[PushMessaging] No se pudo obtener FCM token:', e);
    }
  }

  // Recepción en primer plano
  const unsubOnMessage = messaging().onMessage(async remoteMessage => {
    if (!isForCurrentUser(remoteMessage)) return;
    // Notificación local simple
    await displayLocalNotification(remoteMessage, true);
    // Callbacks externos
    foregroundListeners.forEach(cb => cb(remoteMessage));
    options?.onForegroundMessage?.(remoteMessage);
  });

  // Token refresh
  const unsubOnTokenRefresh = messaging().onTokenRefresh(async token => {
    options?.onToken?.(token);
    // Opcional: re-registrar en backend si hay sesión
    const uid = Meteor.userId?.();
    if (uid) {
      await registerPushTokenForUser(uid).catch(() => {});
    }
  });

  // App abierta desde background por notificación
  const unsubOnOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    // ✅ Resetear badge cuando se abre desde notificación
    badgeManager.reset();
    options?.onNotificationOpenedApp?.(remoteMessage);
  });

  // App abierta desde estado "quit"
  messaging()
    .getInitialNotification()
    .then(m => m && options?.onInitialNotification?.(m))
    .catch(err => console.warn('[PushMessaging] getInitialNotification error:', err));

  // Retorna cleanup
  return () => {
    try {
      unsubOnMessage();
      unsubOnTokenRefresh();
      unsubOnOpened();
    } catch {}
  };
};

// Helper simple para usar en UserDetails (ejemplo de envío):
// await sendMessage({ toUserId: targetUserId, title: 'Mensaje', body: 'Hola 👋', data: { screen: 'Mensaje' } });
// Recomendado: llamar registerPushTokenForUser(Meteor.userId()) después de login,
// y setupPushListeners() en el arranque de la app.

// Helpers de tópico por usuario (opcional, útil si backend publica por topics)
export const subscribeUserTopic = async (userId?: string) => {
  const uid = userId || Meteor.userId();
  if (!uid) return;
  try {
    await messaging().subscribeToTopic(uid);
    console.log('[PushMessaging] Suscrito al tópico:', uid);
  } catch (e) {
    console.warn('[PushMessaging] Error al suscribir tópico:', e);
  }
};
export const unsubscribeUserTopic = async (userId?: string) => {
  const uid = userId || Meteor.userId();
  if (!uid) return;
  try {
    await messaging().unsubscribeFromTopic(uid);
    console.log('[PushMessaging] Desuscrito del tópico:', uid);
  } catch (e) {
    console.warn('[PushMessaging] Error al desuscribir tópico:', e);
  }
};

// Verifica si el mensaje está dirigido al usuario actual (si el payload incluye toUserId)
const isForCurrentUser = (m?: FirebaseMessagingTypes.RemoteMessage) => {
  try {
    const toUserId = (m?.data?.toUserId as string) || (m?.data?.userId as string);
    const current = Meteor.userId?.();
    return !toUserId || (current && toUserId === current);
  } catch {
    return true;
  }
};

// ✅ DEPRECATED: Usar badgeManager.reset() en su lugar
export const resetBadge = async () => {
  console.warn('[PushMessaging] resetBadge() está deprecated. Usa badgeManager.reset()');
  await badgeManager.reset();
};

// ✅ DEPRECATED: Usar badgeManager.getCount() en su lugar
export const getBadgeCount = async (): Promise<number> => {
  console.warn('[PushMessaging] getBadgeCount() está deprecated. Usa badgeManager.getCount()');
  return await badgeManager.getCount();
};

/**
 * Verificar y solicitar permisos de ubicación "siempre activa" para iOS
 * Retorna true si tiene los permisos necesarios, false si no
 */
export const ensureLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return true;

  try {
    // Verificar si ya tiene permiso "siempre"
    const alwaysStatus = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
    console.log('🔐 [Location Permissions] Estado "siempre":', alwaysStatus);
    
    if (alwaysStatus === RESULTS.GRANTED) {
      return true;
    }

    // Primero verificar/solicitar "cuando está en uso"
    const whenInUseStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    
    if (whenInUseStatus !== RESULTS.GRANTED) {
      console.log('📍 [Location Permissions] Solicitando "cuando está en uso"...');
      const whenInUseResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      Geolocation.requestAuthorization();
      
      if (whenInUseResult !== RESULTS.GRANTED) {
        console.warn('⚠️ [Location Permissions] "Cuando está en uso" denegado');
        return false;
      }
    }

    // Ahora solicitar "siempre"
    console.log('📍 [Location Permissions] Solicitando "siempre"...');
    const alwaysResult = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
    
    if (alwaysResult === RESULTS.GRANTED) {
      console.log('✅ [Location Permissions] Permiso "siempre" concedido');
      return true;
    }

    console.warn('⚠️ [Location Permissions] Permiso "siempre" denegado:', alwaysResult);
    return false;
  } catch (error) {
    console.error('❌ [Location Permissions] Error:', error);
    return false;
  }
};

/**
 * Verificar el estado actual del permiso de ubicación "siempre"
 * Sin solicitar, solo verificar
 */
export const checkLocationAlwaysPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return true;

  try {
    const alwaysStatus = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
    return alwaysStatus === RESULTS.GRANTED;
  } catch (error) {
    console.error('❌ [Location Permissions] Error verificando:', error);
    return false;
  }
};
