import { MaterialCommunityIcons } from "@expo/vector-icons";

export const UNKNOWN_LABEL = "No disponible";
export const PUSH_TOKENS_ADMIN_USERNAME = "carlosmbinf";
export const canAccessPushTokenDashboards = (user) =>
  user?.username === PUSH_TOKENS_ADMIN_USERNAME;

export const PUSH_TOKEN_FIELDS = {
  platform: 1,
  createdAt: 1,
  updatedAt: 1,
  provider: 1,
  token: 1,
  deviceId: 1,
  userId: 1,
};

export const PUSH_TOKEN_SORT_UPDATED = { updatedAt: -1, createdAt: -1 };
export const PUSH_TOKEN_SORT_TOKEN = { token: 1, updatedAt: -1, createdAt: -1 };

export const formatDate = (value) => {
  if (!value) {
    return UNKNOWN_LABEL;
  }

  try {
    return new Date(value).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return UNKNOWN_LABEL;
  }
};

const capitalize = (value = "") => {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

export const maskToken = (value) => {
  const token = typeof value === "string" ? value.trim() : "";

  if (!token) {
    return UNKNOWN_LABEL;
  }

  if (token.length <= 18) {
    return token;
  }

  return `${token.slice(0, 10)}…${token.slice(-8)}`;
};

export const getPlatformMeta = (platform, provider) => {
  const raw = typeof platform === "string" ? platform.trim() : "";
  const parts = raw.split("_").filter(Boolean);
  const platformKey = (parts[0] || "").toLowerCase();
  const providerCandidate = (parts[1] || "").toLowerCase();
  const parsedProvider =
    typeof provider === "string" && provider.trim()
        ? provider.trim().toLowerCase()
        : ["expo", "fcm", "apns"].includes(providerCandidate)
          ? providerCandidate
          : "";
  const appVersionIndex = parts.findIndex((part) => /^v\d+(?:\.\d+)+$/i.test(part));
  const appVersionToken = appVersionIndex >= 0 ? parts[appVersionIndex] : "";
  const buildToken =
    appVersionIndex >= 0 && /^\d+$/.test(parts[appVersionIndex + 1] || "")
      ? parts[appVersionIndex + 1]
      : "";

  let osVersion = UNKNOWN_LABEL;
  let androidVersionLabel = UNKNOWN_LABEL;

  if (platformKey === "android") {
    const androidVersionToken =
      appVersionIndex > 1 && /^\d+$/.test(parts[appVersionIndex - 1] || "")
        ? parts[appVersionIndex - 1]
        : "";

    if (androidVersionToken) {
      osVersion = `Android API ${androidVersionToken}`;
      androidVersionLabel = `API ${androidVersionToken}`;
    }
  } else if (platformKey === "ios") {
    osVersion = "iOS";
  }

  return {
    raw: raw || UNKNOWN_LABEL,
    platformLabel:
      platformKey === "android"
        ? "Android"
        : platformKey === "ios"
          ? "iPhone / iOS"
          : raw
            ? capitalize(raw)
            : UNKNOWN_LABEL,
    providerLabel: parsedProvider ? capitalize(parsedProvider) : null,
    osVersion,
    androidVersionLabel,
    appVersion: appVersionToken ? appVersionToken.replace(/^v/i, "") : UNKNOWN_LABEL,
    buildNumber: buildToken && /^\d+$/.test(buildToken) ? buildToken : UNKNOWN_LABEL,
  };
};

export const getPlatformIcon = (platformLabel) => {
  if (platformLabel === "Android") {
    return "android";
  }

  if (platformLabel === "iPhone / iOS") {
    return "apple-ios";
  }

  return "cellphone";
};

export const getDeviceTitle = (platformLabel, device, index) => {
  const shortDeviceId =
    typeof device?.deviceId === "string" && device.deviceId.trim()
      ? device.deviceId.trim().slice(-4).toUpperCase()
      : null;

  if (shortDeviceId) {
    return `${platformLabel} #${index + 1} · ${shortDeviceId}`;
  }

  return `${platformLabel} #${index + 1}`;
};

export const buildDeviceViewModel = (device, index) => {
  const meta = getPlatformMeta(device?.platform, device?.provider);

  return {
    ...device,
    index,
    meta,
    icon: getPlatformIcon(meta.platformLabel),
    iconComponent: MaterialCommunityIcons,
    title: getDeviceTitle(meta.platformLabel, { ...device, meta }, index),
    tokenLabel: maskToken(device?.token),
    updatedAtLabel: formatDate(device?.updatedAt || device?.createdAt),
    createdAtLabel: formatDate(device?.createdAt),
  };
};

const getMostFrequent = (values) => {
  const stats = values.reduce((accumulator, value) => {
    if (!value || value === UNKNOWN_LABEL) {
      return accumulator;
    }

    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});

  const entries = Object.entries(stats);

  if (!entries.length) {
    return { label: UNKNOWN_LABEL, count: 0 };
  }

  const [label, count] = entries.sort((left, right) => right[1] - left[1])[0];

  return { label, count };
};

export const buildPushDashboard = (devices) => {
  const list = Array.isArray(devices) ? devices : [];
  const latest = list[0] || null;
  const androidDevices = list.filter(
    (device) => device?.meta?.platformLabel === "Android",
  );
  const iosDevices = list.filter(
    (device) => device?.meta?.platformLabel === "iPhone / iOS",
  );
  const providerSet = new Set(
    list.map((device) => device?.meta?.providerLabel).filter(Boolean),
  );
  const androidVersionStats = getMostFrequent(
    androidDevices.map((device) => device?.meta?.androidVersionLabel),
  );

  return {
    totalDevices: list.length,
    androidDevices: androidDevices.length,
    iosDevices: iosDevices.length,
    providerCount: providerSet.size,
    latestActivityLabel: latest
      ? formatDate(latest.updatedAt || latest.createdAt)
      : UNKNOWN_LABEL,
    latestPlatformLabel: latest?.meta?.platformLabel || UNKNOWN_LABEL,
    androidVersionSummary:
      androidVersionStats.label !== UNKNOWN_LABEL
        ? androidVersionStats.count > 1
          ? `${androidVersionStats.label} · ${androidVersionStats.count} disp.`
          : androidVersionStats.label
        : "Sin Android",
  };
};
