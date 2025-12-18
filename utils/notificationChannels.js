import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

export const CHANNEL_IDS = {
  FOREGROUND_SERVICE: 'vidkar_cadete_service',
  MESSAGES: 'vidkar_messages',
};

export async function createNotificationChannels() {
  // Canal para el servicio de Modo Cadete
  await notifee.createChannel({
    id: CHANNEL_IDS.FOREGROUND_SERVICE,
    name: 'Modo Cadete',
    description: 'Notificación activa mientras recibes órdenes',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: undefined,
    vibration: false,
    lights: false,
  });

  // Canal para mensajes
  await notifee.createChannel({
    id: CHANNEL_IDS.MESSAGES,
    name: 'Mensajes',
    description: 'Notificaciones de mensajes nuevos',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
  });
}
