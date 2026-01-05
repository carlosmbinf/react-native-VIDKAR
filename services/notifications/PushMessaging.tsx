import {Alert, Platform, PermissionsAndroid} from 'react-native';
import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import Meteor from '@meteorrn/core';

// Carga condicional de notifee (opcional)
let NotifeeLib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotifeeLib = require('@notifee/react-native');
} catch (e) {
  console.warn('[PushMessaging] @notifee/react-native no instalado; se usará Alert en primer plano.');
}

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
  // ✅ Resetear badge al abrir la app (iOS)
  if (Platform.OS === 'ios' && NotifeeLib?.default) {
    try {
      await NotifeeLib.default.setBadgeCount(0);
      console.log('[PushMessaging] Badge reseteado a 0');
    } catch (e) {
      console.warn('[PushMessaging] Error reseteando badge:', e);
    }
  }

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
    // ✅ Resetear badge cuando se abre desde notificación (iOS)
    if (Platform.OS === 'ios' && NotifeeLib?.default) {
      NotifeeLib.default.setBadgeCount(0).catch(() => {});
    }
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

// ✅ Resetear badge del ícono de la app (iOS)
export const resetBadge = async () => {
  if (Platform.OS === 'ios' && NotifeeLib?.default) {
    try {
      await NotifeeLib.default.setBadgeCount(0);
      console.log('[PushMessaging] Badge reseteado manualmente a 0');
    } catch (e) {
      console.warn('[PushMessaging] Error reseteando badge:', e);
    }
  }
};

// ✅ Obtener el badge actual (iOS)
export const getBadgeCount = async (): Promise<number> => {
  if (Platform.OS === 'ios' && NotifeeLib?.default) {
    try {
      const count = await NotifeeLib.default.getBadgeCount();
      return count || 0;
    } catch (e) {
      console.warn('[PushMessaging] Error obteniendo badge:', e);
      return 0;
    }
  }
  return 0;
};
