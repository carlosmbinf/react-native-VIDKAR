import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

const NativeVidkarWatchBridge = requireOptionalNativeModule("VidkarWatchBridge");

const hasWatchBridge = Boolean(
  Platform.OS === "ios" &&
    NativeVidkarWatchBridge?.activate &&
    NativeVidkarWatchBridge?.updateUserContext &&
    NativeVidkarWatchBridge?.clearUserContext,
);

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
  if (!hasWatchBridge) {
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();

  const snapshot = buildWatchUserSnapshot(user);

  if (!snapshot) {
    return NativeVidkarWatchBridge.clearUserContext();
  }

  return NativeVidkarWatchBridge.updateUserContext(snapshot);
};

export const clearWatchUserSnapshot = async () => {
  if (!hasWatchBridge) {
    return { supported: false };
  }

  await NativeVidkarWatchBridge.activate();
  return NativeVidkarWatchBridge.clearUserContext();
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