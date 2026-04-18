import MeteorBase from "@meteorrn/core";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { canAccessPushTokenDashboards } from "../../components/users/pushTokens/utils";
import { getAppVersionInfo } from "../app/appVersion";

type PushData = Record<string, string | number | boolean | null | undefined>;

type SendMessagePayload = {
  body: string;
  data?: PushData;
  senderId?: string;
  title: string;
  toUserId: string;
};

type ActiveSessionRegistrationOptions = {
  delayMs?: number;
  retries?: number;
};

type SetupOptions = {
  onForegroundMessage?: (
    notification: Notifications.Notification,
  ) => void | Promise<void>;
  onInitialNotification?: (
    notification: Notifications.Notification,
  ) => void | Promise<void>;
  onNotificationOpenedApp?: (
    notification: Notifications.Notification,
  ) => void | Promise<void>;
  onToken?: (token: string) => void | Promise<void>;
};

export type PushDialogReason = "foreground" | "opened";

export type PushDialogPayload = {
  body: string;
  imageUrl?: string | null;
  reason: PushDialogReason;
  title: string;
};

const Meteor = MeteorBase as unknown as {
  call: (...args: any[]) => void;
  user?: () => { username?: string } | null;
  userId: () => string | null;
};

const DEFAULT_CHANNEL_ID = "default";
const DEFAULT_CHANNEL_NAME = "General";

const EXPO_PUSH_TOKEN_PREFIXES = ["ExponentPushToken[", "ExpoPushToken["];

let activePushDialog: PushDialogPayload | null = null;

const pushDialogListeners = new Set<
  (payload: PushDialogPayload | null) => void
>();

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizePushToken = (tokenData: unknown) => {
  if (typeof tokenData === "string" && tokenData.trim().length > 0) {
    return tokenData;
  }

  if (
    tokenData &&
    typeof tokenData === "object" &&
    "token" in tokenData &&
    typeof (tokenData as { token?: unknown }).token === "string"
  ) {
    return (tokenData as { token: string }).token;
  }

  return null;
};

let currentAppState = AppState.currentState;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isInForeground = currentAppState === "active";
    
    return {
      shouldPlaySound: !isInForeground,
      shouldSetBadge: !isInForeground,
      shouldShowBanner: !isInForeground,
      shouldShowList: !isInForeground,
    };
  },
});

const getNotificationContent = (
  notification?: Notifications.Notification | null,
) => notification?.request?.content;

const getNotificationData = (
  notification?: Notifications.Notification | null,
) =>
  (getNotificationContent(notification)?.data || {}) as Record<string, unknown>;

const getTitle = (notification?: Notifications.Notification | null) =>
  getNotificationContent(notification)?.title ||
  (getNotificationData(notification).title as string) ||
  "Nueva notificación";

const getBody = (notification?: Notifications.Notification | null) =>
  getNotificationContent(notification)?.body ||
  (getNotificationData(notification).body as string) ||
  (Object.keys(getNotificationData(notification)).length
    ? JSON.stringify(getNotificationData(notification))
    : "Tienes un nuevo mensaje");

const getImageUrl = (notification?: Notifications.Notification | null) => {
  const content = getNotificationContent(notification);
  const data = getNotificationData(notification);
  const attachments = (
    content as Notifications.NotificationContent & {
      attachments?: { url?: string | null }[];
    }
  )?.attachments;
  const candidateValues = [
    attachments?.[0]?.url,
    data.image,
    data.imageUrl,
    data.image_url,
    data.notificationImageUrl,
    data.media,
    data.mediaUrl,
    data.media_url,
    data.picture,
    data.photo,
    data.foto,
    data.thumbnail,
    data.attachment,
    data.attachmentUrl,
    data.attachment_url,
  ];

  const normalizedImageUrl = candidateValues.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return typeof normalizedImageUrl === "string" ? normalizedImageUrl : null;
};

const emitPushDialog = (payload: PushDialogPayload | null) => {
  activePushDialog = payload;

  pushDialogListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.warn("[PushMessaging] Error notificando dialog listener:", error);
    }
  });
};

export const subscribeToPushDialog = (
  listener: (payload: PushDialogPayload | null) => void,
) => {
  pushDialogListeners.add(listener);
  listener(activePushDialog);

  return () => {
    pushDialogListeners.delete(listener);
  };
};

export const dismissPushDialog = () => {
  emitPushDialog(null);
};

const isForCurrentUser = (notification?: Notifications.Notification | null) => {
  try {
    const data = getNotificationData(notification);
    const toUserId = (data.toUserId as string) || (data.userId as string);
    const currentUserId = Meteor.userId?.();
    return !toUserId || (!!currentUserId && toUserId === currentUserId);
  } catch {
    return true;
  }
};

const buildPlatformString = () => {
  const { buildNumber, version: appVersion } = getAppVersionInfo();

  if (Platform.OS === "android") {
    return `${Platform.OS}_expo_${Platform.Version}_v${appVersion}_${buildNumber}`;
  }

  return `${Platform.OS}_expo_v${appVersion}_${buildNumber}`;
};

const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== "android") {
    return DEFAULT_CHANNEL_ID;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#3f51b5",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    name: DEFAULT_CHANNEL_NAME,
    showBadge: true,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });

  return DEFAULT_CHANNEL_ID;
};

const getExpoProjectId = () => {
  const easProjectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.manifest2?.extra?.eas?.projectId ||
    (Constants.manifest as { extra?: { eas?: { projectId?: string } } } | null)
      ?.extra?.eas?.projectId;

  return typeof easProjectId === "string" && easProjectId.trim().length > 0
    ? easProjectId
    : null;
};

const isExpoPushToken = (token: string | null | undefined) =>
  !!token &&
  EXPO_PUSH_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix));

class BadgeManager {
  private static instance: BadgeManager;

  static getInstance() {
    if (!BadgeManager.instance) {
      BadgeManager.instance = new BadgeManager();
    }

    return BadgeManager.instance;
  }

  async getCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch {
      return 0;
    }
  }

  async increment() {
    try {
      const currentBadge = await this.getCount();
      await Notifications.setBadgeCountAsync(currentBadge + 1);
    } catch {
      // no-op
    }
  }

  async reset() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch {
      // no-op
    }
  }
}

export const badgeManager = BadgeManager.getInstance();

export const requestPermissionsIfNeeded = async () => {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    } catch {
      return false;
    }
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (
    currentPermissions.granted ||
    currentPermissions.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync({
    android: {},
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return (
    requestedPermissions.granted ||
    requestedPermissions.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  );
};

const getExpoPushToken = async () => {
  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      "[PushMessaging] No se encontró eas.projectId para obtener ExpoPushToken.",
    );
    return null;
  }

  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = normalizePushToken(expoToken?.data);
  return isExpoPushToken(token) ? token : null;
};

const showPushDialog = async (
  notification?: Notifications.Notification | null,
  reason: PushDialogReason = "foreground",
) => {
  if (!notification) {
    return;
  }

  if (reason === "opened") {
    console.log("[PushMessaging] Notificación abierta:", {
      title: getTitle(notification),
      body: getBody(notification),
      data: getNotificationData(notification),
    });
  }

  emitPushDialog({
    body: getBody(notification),
    imageUrl: getImageUrl(notification),
    reason,
    title: getTitle(notification),
  });
};

export const registerPushTokenForUser = async (
  userId?: string,
  providedToken?: string | null,
) => {
  const currentUserId = userId || Meteor.userId();
  if (!currentUserId) {
    return null;
  }

  const granted = await requestPermissionsIfNeeded();
  if (!granted) {
    return null;
  }

  await ensureAndroidNotificationChannel();
  const expoToken =
    providedToken && isExpoPushToken(providedToken)
      ? providedToken
      : await getExpoPushToken();

  if (!expoToken) {
    return null;
  }

  await new Promise((resolve, reject) => {
    Meteor.call(
      "push.registerToken",
      {
        platform: buildPlatformString(),
        provider: "expo",
        token: expoToken,
        userId: currentUserId,
      },
      (error: any, result: any) => (error ? reject(error) : resolve(result)),
    );
  });

  return [{ provider: "expo", token: expoToken }];
};

export const registerPushTokenForActiveSession = async (
  options?: ActiveSessionRegistrationOptions,
) => {
  const retries = options?.retries ?? 6;
  const delayMs = options?.delayMs ?? 500;

  let currentUserId = Meteor.userId();

  for (let attempt = 0; !currentUserId && attempt < retries; attempt += 1) {
    await wait(delayMs);
    currentUserId = Meteor.userId();
  }

  if (!currentUserId) {
    return null;
  }

  return registerPushTokenForUser(currentUserId);
};

export const unregisterPushTokenForUser = async (userId?: string) => {
  const currentUserId = userId || Meteor.userId();
  if (!currentUserId) {
    return;
  }

  const expoToken = await getExpoPushToken();
  if (!expoToken) {
    return;
  }

  await new Promise((resolve, reject) => {
    Meteor.call(
      "push.unregisterToken",
      { token: expoToken, userId: currentUserId },
      (error: any, result: any) => (error ? reject(error) : resolve(result)),
    );
  });
};

export const sendMessage = async (payload: SendMessagePayload) => {
  const currentUserId = Meteor.userId();
  if (!currentUserId) {
    throw new Error("Usuario no autenticado.");
  }

  const requestedSenderId =
    typeof payload.senderId === "string" && payload.senderId.trim().length > 0
      ? payload.senderId.trim()
      : currentUserId;
  const canUseServerSender =
    requestedSenderId.toUpperCase() !== "SERVER" ||
    canAccessPushTokenDashboards(Meteor.user?.());

  if (!canUseServerSender) {
    throw new Error("No autorizado para usar la firma institucional.");
  }

  const fromUserId =
    requestedSenderId.toUpperCase() === "SERVER" ? "SERVER" : currentUserId;

  return new Promise((resolve, reject) => {
    Meteor.call(
      "messages.send",
      {
        body: String(payload.body || ""),
        data: {
          ...(payload.data || {}),
          fromUserId,
          toUserId: String(payload.toUserId),
        },
        fromUserId,
        title: String(payload.title || ""),
        toUserId: String(payload.toUserId),
      },
      (error: any, result: any) => (error ? reject(error) : resolve(result)),
    );
  });
};

export const setupPushListeners = async (options?: SetupOptions) => {
  await ensureAndroidNotificationChannel();
  await badgeManager.reset();

  const granted = await requestPermissionsIfNeeded();
  if (granted) {
    const token = await getExpoPushToken().catch(() => null);
    if (token) {
      await options?.onToken?.(token);
    }
  }

  const appStateSubscription = AppState.addEventListener(
    "change",
    async (state) => {
      currentAppState = state;
      if (state === "active") {
        await badgeManager.reset();
      }
    },
  );

  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      if (!isForCurrentUser(notification)) {
        return;
      }

      await badgeManager.increment();
      await showPushDialog(notification, "foreground");
      await options?.onForegroundMessage?.(notification);
    },
  );

  const tokenRefreshSubscription = Notifications.addPushTokenListener(
    async (tokenInfo) => {
      const fallbackToken = normalizePushToken(tokenInfo?.data);
      const token = isExpoPushToken(fallbackToken)
        ? fallbackToken
        : await getExpoPushToken().catch(() => null);

      if (!token || !isExpoPushToken(token)) {
        return;
      }

      const currentUserId = Meteor.userId?.();
      if (currentUserId) {
        await registerPushTokenForUser(currentUserId, token).catch(() => null);
      }

      await options?.onToken?.(token);
    },
  );

  const notificationResponseSubscription =
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      await badgeManager.reset();

      const notification = response.notification;
      if (!isForCurrentUser(notification)) {
        return;
      }

      await showPushDialog(notification, "opened");
      await options?.onNotificationOpenedApp?.(notification);
    });

  Notifications.getLastNotificationResponseAsync()
    .then(async (response) => {
      if (response) {
        await badgeManager.reset();
        if (isForCurrentUser(response.notification)) {
          await showPushDialog(response.notification, "opened");
          await options?.onInitialNotification?.(response.notification);
        }
      }
    })
    .catch(() => null);

  return () => {
    foregroundSubscription.remove();
    tokenRefreshSubscription.remove();
    notificationResponseSubscription.remove();
    appStateSubscription.remove();
  };
};
