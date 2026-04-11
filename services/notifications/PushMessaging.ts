export const badgeManager = {
  getCount: async () => 0,
  increment: async () => {},
  reset: async () => {},
};

export const displayLocalNotification = async () => {};
export const registerPushTokenForUser = async () => null;
export const requestPermissionsIfNeeded = async () => false;
export const sendMessage = async () => {
  throw new Error("PushMessaging no está disponible en esta plataforma.");
};
export const setupPushListeners = async () => () => {};
export const unregisterPushTokenForUser = async () => {};
