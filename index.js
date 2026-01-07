/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import { name as appName } from './app.json';
import AndroidForegroundService from './NotificacionAndroidForeground';
import IOSLocationService from './NotificacionIOSForeground';
import Main from './Main';
import notifee, { EventType } from '@notifee/react-native';
import Geolocation from 'react-native-geolocation-service';
import MyService from './src/native/MyService';

MyService.start();

try {
  // notifee.registerForegroundService((notification) => {
  //   return new Promise(() => {
  //     console.log('✅ [Notifee] Foreground service registrado', notification);
  //   });
  // });

  // // ✅ HANDLER DE EVENTOS EN BACKGROUND
  
  // notifee.onBackgroundEvent(async ({ type, detail }) => {
  //   const { notification, pressAction } = detail;

  //   console.log('[Notifee Background] Evento recibido:', {
  //     type,
  //     notificationId: notification?.id,
  //     action: pressAction?.id,
  //   });

  //   switch (type) {
  //     case EventType.DISMISSED:
  //       console.log('[Notifee] Notificación descartada (background)');
  //       notifee.incrementBadgeCount()
  //       break;

  //     case EventType.PRESS:
  //       console.log('[Notifee] Notificación presionada (background)');
  //       break;

  //     case EventType.ACTION_PRESS:
  //       console.log(`[Notifee] Acción presionada: ${pressAction?.id}`);
  //       break;

  //     default:
  //       console.log(`[Notifee] Evento no manejado: ${type}`);
  //   }
  // });

  AppRegistry.registerComponent(appName, () => Main);

  // AppRegistry.registerHeadlessTask(
  //   'MyBackgroundService', 
  //   () => require('./services/SomeTaskName')
  // );

  console.log('Platform.OS', Platform.OS);
  if (Platform.OS === 'android' ) {
    // AndroidForegroundService(); // ✅ Se inicia automáticamente
  } else if (Platform.OS === 'ios') {
    // ✅ Solicitar permisos de ubicación para iOS
    
    // ✅ Iniciar servicio de ubicación iOS
    notifee.incrementBadgeCount();
    IOSLocationService();
    console.log('✅ [Index] Servicio de ubicación iOS iniciado');
  }
} catch (error) {
  console.error('❌ [Index] Error iniciando app:', error);
}
