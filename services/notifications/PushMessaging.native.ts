import MeteorBase from "@meteorrn/core";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { canAccessPushTokenDashboards } from "../../components/users/pushTokens/utils";
import { getAppVersionInfo } from "../app/appVersion";
import { ensureMeteorConnection } from "../meteor/client.native";

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
  onNotificationAction?: (
    notification: Notifications.Notification,
    actionIdentifier: string,
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

export type PushNavigationTarget = {
  params?: Record<string, string>;
  pathname: string;
};

export type PushDialogPayload = {
  body: string;
  imageUrl?: string | null;
  navigationTarget?: PushNavigationTarget | null;
  reason: PushDialogReason;
  title: string;
};

export const MANUAL_REVIEW_NOTIFICATION_CATEGORY = "EVIDENCIA_MANUAL_REVIEW";
export const APPROVED_EVIDENCE_SALE_REVIEW_CATEGORY =
  "EVIDENCIA_APROBADA_VENTA_PENDIENTE";
export const APPROVE_EVIDENCE_ACTION = "APPROVE_EVIDENCE";
export const REJECT_EVIDENCE_ACTION = "REJECT_EVIDENCE";
export const APPROVE_SALE_ACTION = "APPROVE_SALE";
export const OPEN_SALE_APPROVAL_ACTION = "OPEN_SALE_APPROVAL";

const BACKGROUND_SALE_APPROVAL_TASK = "vidkar-background-sale-approval-v1";
const BACKGROUND_SALE_APPROVAL_SESSION_RETRIES = 20;
const BACKGROUND_SALE_APPROVAL_SESSION_DELAY_MS = 500;

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

const isApprovedEvidenceSaleNotification = (data: unknown) => {
  if (!data || typeof data !== "object") {
    return false;
  }

  return (
    (data as Record<string, unknown>).notificationType ===
    APPROVED_EVIDENCE_SALE_REVIEW_CATEGORY
  );
};

const getBackgroundNotificationResponse = (data: unknown) => {
  if (!data || typeof data !== "object" || !("actionIdentifier" in data)) {
    return null;
  }

  const response = data as Notifications.NotificationResponse;
  return response.actionIdentifier === APPROVE_SALE_ACTION ? response : null;
};

const approveSaleFromBackgroundNotification = async (
  response: Notifications.NotificationResponse,
) => {
  const data = getNotificationData(response.notification);
  const ventaId = typeof data.ventaId === "string" ? data.ventaId : "";

  if (!ventaId || !isApprovedEvidenceSaleNotification(data)) {
    return;
  }

  try {
    await ensureMeteorConnection();

    for (
      let attempt = 0;
      attempt < BACKGROUND_SALE_APPROVAL_SESSION_RETRIES;
      attempt += 1
    ) {
      if (Meteor.userId()) {
        break;
      }

      await wait(BACKGROUND_SALE_APPROVAL_SESSION_DELAY_MS);
    }

    if (!Meteor.userId()) {
      throw new Error("No se pudo restaurar la sesión para aprobar la venta.");
    }

    await new Promise<void>((resolve, reject) => {
      Meteor.call(
        "ventas.aprobarVenta",
        ventaId,
        { source: "PUSH_ACTION_SALE" },
        (error: any) => (error ? reject(error) : resolve()),
      );
    });

    console.info("[PushMessaging] Venta aprobada desde tarea en segundo plano", {
      ventaId,
    });
  } catch (error: any) {
    console.warn(
      "[PushMessaging] No se pudo aprobar la venta desde tarea en segundo plano",
      {
        error: error?.reason || error?.message || "background-sale-approval-error",
        ventaId,
      },
    );
  }
};

if (!TaskManager.isTaskDefined(BACKGROUND_SALE_APPROVAL_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    BACKGROUND_SALE_APPROVAL_TASK,
    async ({ data, error }) => {
      if (error) {
        console.warn(
          "[PushMessaging] La tarea de notificación falló antes de aprobar la venta",
          error,
        );
        return;
      }

      const response = getBackgroundNotificationResponse(data);
      if (response) {
        await approveSaleFromBackgroundNotification(response);
      }
    },
  );
}

Notifications.registerTaskAsync(BACKGROUND_SALE_APPROVAL_TASK).catch((error) => {
  console.warn(
    "[PushMessaging] No se pudo registrar la tarea de aprobación de venta",
    error,
  );
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

const getStringDataValue = (
  data: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
};

const getCurrentUserModeRoutePrefix = () => {
  const currentUser = Meteor.user?.() as { modoEmpresa?: boolean } | null;
  return currentUser?.modoEmpresa === true ? "/(empresa)" : "/(normal)";
};

const normalizeInternalPathname = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || /^https?:\/\//i.test(trimmedValue)) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue)) {
    try {
      const parsedUrl = new URL(trimmedValue);
      const internalPathname = parsedUrl.pathname || parsedUrl.hostname;
      return normalizeInternalPathname(internalPathname);
    } catch {
      return null;
    }
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  const normalizedName = trimmedValue.toLowerCase();
  if (["chat", "mensaje", "message", "messages", "mensajes"].includes(normalizedName)) {
    return `${getCurrentUserModeRoutePrefix()}/Mensaje`;
  }

  return null;
};

const parseNavigationUrl = (value?: string | null): PushNavigationTarget | null => {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const [rawPathname, rawQuery = ""] = trimmedValue.split("?");
  const pathname = normalizeInternalPathname(rawPathname);

  if (!pathname) {
    return null;
  }

  const params = rawQuery
    .split("&")
    .map((entry) => entry.split("="))
    .reduce<Record<string, string>>((accumulator, [key, value]) => {
      if (!key) {
        return accumulator;
      }

      accumulator[decodeURIComponent(key)] = decodeURIComponent(value || "");
      return accumulator;
    }, {});

  return {
    pathname,
    params: Object.keys(params).length > 0 ? params : undefined,
  };
};

export const resolvePushNavigationTarget = (
  notification?: Notifications.Notification | null,
): PushNavigationTarget | null => {
  const data = getNotificationData(notification);
  const explicitUrl = getStringDataValue(data, [
    "linking",
    "deepLink",
    "deepLinkUrl",
    "url",
    "navigationUrl",
  ]);
  const explicitUrlTarget = parseNavigationUrl(explicitUrl);

  if (explicitUrlTarget) {
    return explicitUrlTarget;
  }

  const explicitPathname = normalizeInternalPathname(
    getStringDataValue(data, ["pathname", "path"]),
  );
  const explicitItem = getStringDataValue(data, [
    "item",
    "itemId",
    "targetUserId",
    "chatUserId",
    "conversationUserId",
  ]);
  const explicitSaleId = getStringDataValue(data, ["ventaId", "saleId"]);

  if (explicitPathname) {
    const params = {
      ...(explicitItem ? { item: explicitItem } : {}),
      ...(explicitSaleId ? { ventaId: explicitSaleId } : {}),
    };
    return {
      pathname: explicitPathname,
      params: Object.keys(params).length > 0 ? params : undefined,
    };
  }

  return null;
};

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

const ensureNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(
    MANUAL_REVIEW_NOTIFICATION_CATEGORY,
    [
      {
        identifier: APPROVE_EVIDENCE_ACTION,
        buttonTitle: "Aprobar",
        options: { opensAppToForeground: true },
      },
      {
        identifier: REJECT_EVIDENCE_ACTION,
        buttonTitle: "Rechazar",
        options: {
          isDestructive: true,
          opensAppToForeground: true,
        },
      },
    ],
    { previewPlaceholder: "Evidencia pendiente de revisión" },
  );
  await Notifications.setNotificationCategoryAsync(
    APPROVED_EVIDENCE_SALE_REVIEW_CATEGORY,
    [
      {
        identifier: APPROVE_SALE_ACTION,
        buttonTitle: "Aprobar venta",
        options: { opensAppToForeground: false },
      },
      {
        identifier: OPEN_SALE_APPROVAL_ACTION,
        buttonTitle: "Abrir venta",
        options: { opensAppToForeground: true },
      },
    ],
    { previewPlaceholder: "Venta pendiente de aprobación" },
  );
};

const isManualReviewAction = (actionIdentifier: string) =>
  actionIdentifier === APPROVE_EVIDENCE_ACTION ||
  actionIdentifier === REJECT_EVIDENCE_ACTION ||
  actionIdentifier === APPROVE_SALE_ACTION ||
  actionIdentifier === OPEN_SALE_APPROVAL_ACTION;

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

export const getPushNotificationPermissionState = async () => {
  const permissions = await Notifications.getPermissionsAsync();
  const iosStatus = permissions.ios?.status;
  const granted =
    permissions.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL;

  return {
    canAskAgain: permissions.canAskAgain !== false,
    granted,
    status: permissions.status,
  };
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
    navigationTarget: resolvePushNavigationTarget(notification),
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
  await ensureNotificationCategories().catch((error) => {
    console.warn(
      "[PushMessaging] No se pudieron registrar las acciones de notificación:",
      error,
    );
  });
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
        if (isManualReviewAction(response.actionIdentifier)) {
          await options?.onNotificationAction?.(
            notification,
            response.actionIdentifier,
          );
          return;
        }

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
        if (
          isManualReviewAction(response.actionIdentifier) &&
          options?.onNotificationAction
        ) {
          await options.onNotificationAction(
            response.notification,
            response.actionIdentifier,
          );
          return;
        }
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
