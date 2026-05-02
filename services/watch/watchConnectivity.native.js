import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

const NativeVidkarWatchBridge = requireOptionalNativeModule("VidkarWatchBridge");

let lastDashboardFingerprint = null;

const sanitizeWatchConnectivityValue = (value, path = "root", droppedPaths = []) => {
  if (value == null) {
    droppedPaths.push(path);
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      droppedPaths.push(path);
      return undefined;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item, index) =>
        sanitizeWatchConnectivityValue(item, `${path}[${index}]`, droppedPaths),
      )
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const sanitizedObject = {};

    Object.entries(value).forEach(([key, item]) => {
      const sanitizedItem = sanitizeWatchConnectivityValue(
        item,
        `${path}.${key}`,
        droppedPaths,
      );

      if (sanitizedItem !== undefined) {
        sanitizedObject[key] = sanitizedItem;
      }
    });

    return sanitizedObject;
  }

  droppedPaths.push(path);
  return undefined;
};

const sanitizeWatchPayload = (payload) => {
  const droppedPaths = [];
  const sanitizedPayload = sanitizeWatchConnectivityValue(
    payload,
    "payload",
    droppedPaths,
  );

  if (droppedPaths.length > 0) {
    console.log(
      "[WatchConnectivity] sanitized payload",
      JSON.stringify({
        droppedCount: droppedPaths.length,
        droppedPaths: droppedPaths.slice(0, 12),
      }),
    );
  }

  return sanitizedPayload && typeof sanitizedPayload === "object"
    ? sanitizedPayload
    : {};
};

const getWatchPayloadDebugInfo = (payload) => ({
  currentUserId: payload?.currentUser?.id ?? null,
  currentUsername: payload?.currentUser?.username ?? null,
  keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
  pendingApprovalsCount: Array.isArray(payload?.pendingApprovals)
    ? payload.pendingApprovals.length
    : 0,
  usersCount: Array.isArray(payload?.users) ? payload.users.length : 0,
});

const hasWatchBridge = Boolean(
  Platform.OS === "ios" &&
    NativeVidkarWatchBridge?.activate &&
    NativeVidkarWatchBridge?.updateUserContext &&
    NativeVidkarWatchBridge?.clearUserContext,
);

const hasWatchReplyBridge = Boolean(
  hasWatchBridge && NativeVidkarWatchBridge?.replyToMessage,
);

const pushContextToWatch = async (payload) => {
  if (!hasWatchBridge || !payload) {
    console.log(
      "[WatchConnectivity] pushContextToWatch skipped",
      JSON.stringify({ hasPayload: Boolean(payload), hasWatchBridge }),
    );
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();
  console.log(
    "[WatchConnectivity] updateUserContext",
    JSON.stringify(getWatchPayloadDebugInfo(payload)),
  );
  const sanitizedPayload = sanitizeWatchPayload(payload);
  const result = await NativeVidkarWatchBridge.updateUserContext(sanitizedPayload);
  console.log("[WatchConnectivity] updateUserContext result", JSON.stringify(result));
  return result;
};

const getPayloadFingerprint = (payload) => {
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
};

const pushLiveContextToWatch = async (payload) => {
  if (!hasWatchBridge || !payload) {
    console.log(
      "[WatchConnectivity] pushLiveContextToWatch skipped",
      JSON.stringify({ hasPayload: Boolean(payload), hasWatchBridge }),
    );
    return { liveSent: false, supported: false };
  }

  try {
    await NativeVidkarWatchBridge.activate();
    const currentStatus = await NativeVidkarWatchBridge.status();

    console.log(
      "[WatchConnectivity] live status before send",
      JSON.stringify({
        ...currentStatus,
        payload: getWatchPayloadDebugInfo(payload),
      }),
    );

    if (!currentStatus?.reachable) {
      return { ...currentStatus, liveSent: false };
    }

    const sanitizedPayload = sanitizeWatchPayload(payload);

    await NativeVidkarWatchBridge.sendMessage({
      type: "userSnapshot",
      user: sanitizedPayload,
    });

    console.log(
      "[WatchConnectivity] live userSnapshot sent",
      JSON.stringify(getWatchPayloadDebugInfo(payload)),
    );

    return { ...currentStatus, liveSent: true };
  } catch (error) {
    console.warn("[WatchConnectivity] live userSnapshot failed", error);
    return {
      liveError:
        error instanceof Error ? error.message : String(error ?? "unknown_error"),
      liveSent: false,
      supported: true,
    };
  }
};

const toStringOrNull = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const toIsoStringOrNull = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
  }

  if (typeof value === "number") {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
  }

  return null;
};

const resolveEmail = (user) => {
  const firstEmail = Array.isArray(user?.emails) ? user.emails[0] : null;
  return toStringOrNull(firstEmail?.address ?? user?.email);
};

export const buildWatchUserSnapshot = (user) => {
  if (!user?._id) {
    return null;
  }

  const profile = user.profile ?? {};
  const firstName = toStringOrNull(profile.firstName);
  const lastName = toStringOrNull(profile.lastName);
  const nameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fullName =
    toStringOrNull(profile.name) ??
    toStringOrNull(user.name) ??
    toStringOrNull(nameFromParts) ??
    toStringOrNull(user.username) ??
    "Usuario VIDKAR";

  return {
    id: user._id,
    email: resolveEmail(user),
    firstName,
    fullName,
    lastName,
    mode: user.modoCadete ? "cadete" : user.modoEmpresa ? "empresa" : "normal",
    picture: toStringOrNull(user.picture ?? profile.picture),
    role: toStringOrNull(profile.role),
    roleComercio: Array.isArray(profile.roleComercio)
      ? profile.roleComercio.filter((item) => typeof item === "string")
      : [],
    syncedAt: new Date().toISOString(),
    username: toStringOrNull(user.username),
    createdAt: toIsoStringOrNull(user.createdAt),
  };
};

export const readWatchConnectivityStatus = async () => {
  if (!hasWatchBridge) {
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();
  return NativeVidkarWatchBridge.status();
};

export const syncCurrentUserWithWatch = async (user) => {
  const snapshot = buildWatchUserSnapshot(user);
  return snapshot ? pushContextToWatch(snapshot) : clearWatchUserSnapshot();
};

export const syncWatchDashboard = async (payload) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).length === 0
  ) {
    return { supported: false };
  }

  const sanitizedPayload = sanitizeWatchPayload(payload);
  const fingerprint = getPayloadFingerprint(sanitizedPayload);
  if (fingerprint && fingerprint === lastDashboardFingerprint) {
    console.log(
      "[WatchConnectivity] syncWatchDashboard deduped",
      JSON.stringify(getWatchPayloadDebugInfo(payload)),
    );
    return { deduped: true, supported: hasWatchBridge };
  }

  console.log(
    "[WatchConnectivity] syncWatchDashboard start",
    JSON.stringify(getWatchPayloadDebugInfo(sanitizedPayload)),
  );

  const contextResult = await pushContextToWatch(sanitizedPayload);
  const liveResult = await pushLiveContextToWatch(sanitizedPayload);

  if (fingerprint) {
    lastDashboardFingerprint = fingerprint;
  }

  return {
    ...contextResult,
    liveSent: Boolean(liveResult?.liveSent),
    reachable:
      typeof liveResult?.reachable === "boolean"
        ? liveResult.reachable
        : contextResult?.reachable,
  };
};

export const clearWatchUserSnapshot = async () => {
  if (!hasWatchBridge) {
    console.log("[WatchConnectivity] clear skipped: bridge unavailable");
    return { supported: false };
  }

  lastDashboardFingerprint = null;
  await NativeVidkarWatchBridge.activate();
  console.log("[WatchConnectivity] clearUserContext start");
  const contextResult = await NativeVidkarWatchBridge.clearUserContext();
  console.log("[WatchConnectivity] clearUserContext result", JSON.stringify(contextResult));
  const liveResult = await pushLiveContextToWatch({});
  console.log("[WatchConnectivity] clear live result", JSON.stringify(liveResult));

  return {
    ...contextResult,
    liveSent: Boolean(liveResult?.liveSent),
    reachable:
      typeof liveResult?.reachable === "boolean"
        ? liveResult.reachable
        : contextResult?.reachable,
  };
};

export const transferWatchUserInfo = async (payload) => {
  if (!hasWatchBridge || !payload) {
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();
  return NativeVidkarWatchBridge.transferUserInfo(payload);
};

export const sendWatchMessage = async (payload) => {
  if (!hasWatchBridge || !payload) {
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();
  return NativeVidkarWatchBridge.sendMessage(payload);
};

export const replyToWatchMessage = async (replyId, response) => {
  if (!hasWatchReplyBridge || !replyId || !response) {
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();
  return NativeVidkarWatchBridge.replyToMessage(replyId, response);
};

export const subscribeToWatchMessages = (listener) => {
  if (
    !hasWatchBridge ||
    typeof listener !== "function" ||
    typeof NativeVidkarWatchBridge.addListener !== "function"
  ) {
    return () => {};
  }

  const subscription = NativeVidkarWatchBridge.addListener(
    "onWatchMessage",
    listener,
  );

  return () => {
    try {
      subscription?.remove?.();
    } catch (error) {
      console.warn("[WatchConnectivity] No se pudo cerrar el listener del Watch:", error);
    }
  };
};
