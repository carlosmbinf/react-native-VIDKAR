/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import { name as appName } from './app.json';
import AndroidForegroundService from './NotificacionAndroidForeground';
import Main from './Main';
import notifee, { EventType } from '@notifee/react-native';

try {
  notifee.registerForegroundService((notification) => {
    return new Promise(() => {
      console.log('✅ [Notifee] Foreground service registrado', notification);
    });
  });

  // ✅ HANDLER DE EVENTOS EN BACKGROUND
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;

    console.log('[Notifee Background] Evento recibido:', {
      type,
      notificationId: notification?.id,
      action: pressAction?.id,
    });

    switch (type) {
      case EventType.DISMISSED:
        console.log('[Notifee] Notificación descartada (background)');
        break;

      case EventType.PRESS:
        console.log('[Notifee] Notificación presionada (background)');
        break;

      case EventType.ACTION_PRESS:
        console.log(`[Notifee] Acción presionada: ${pressAction?.id}`);
        break;

      default:
        console.log(`[Notifee] Evento no manejado: ${type}`);
    }
  });

  AppRegistry.registerComponent(appName, () => Main);

  AppRegistry.registerHeadlessTask(
    'MyBackgroundService', 
    () => require('./services/SomeTaskName')
  );

  console.log('Platform.OS', Platform.OS);
  if (Platform.OS === 'android') {
    AndroidForegroundService(); // ✅ Se inicia automáticamente
  }
} catch (error) {
  console.error('❌ [Index] Error iniciando app:', error);
}
