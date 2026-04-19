import * as Location from "expo-location";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { getMeteorUrl } from "../meteor/client.native";
import {
  saveCachedDeviceLocation,
} from "./deviceLocationCache.native";

const CADETE_LOCATION_TASK_NAME = "vidkar-cadete-background-location-v1";
const CADETE_LOCATION_CONFIG_KEY = "cadete.background-location.config.v1";
const CADETE_LOCATION_STATUS_KEY = "cadete.background-location.status.v1";

const ACTIVE_CHECK_INTERVAL_MS = 120000;
const ANDROID_BACKGROUND_INTERVAL_MS = 30000;
const DEFAULT_FETCH_TIMEOUT_MS = 12000;
const DISTANCE_INTERVAL_METERS = 5;
const FOREGROUND_DISTANCE_INTERVAL_METERS = 5;
const NativeCadeteBackgroundTracking = requireOptionalNativeModule(
  "CadeteBackgroundTracking",
);

console.info(
  `[CadeteBackgroundLocation] Modulo cargado. Task definida inicialmente: ${TaskManager.isTaskDefined(
    CADETE_LOCATION_TASK_NAME,
  )}`,
);

const statusSubscribers = new Set();
let activeCheckCache = {
  active: null,
  checkedAt: 0,
  userId: null,
};
let inMemoryStatus = null;
let pendingCurrentLocationSyncPromise = null;
let bootstrapCadeteTrackingPromise = null;

const hasNativeCadeteBackgroundTracking = Boolean(
  NativeCadeteBackgroundTracking?.startTracking &&
    NativeCadeteBackgroundTracking?.stopTracking &&
    NativeCadeteBackgroundTracking?.syncTracking &&
    NativeCadeteBackgroundTracking?.getStatus,
);

export const isNativeCadeteBackgroundTrackingAvailable =
  hasNativeCadeteBackgroundTracking;

const createDefaultStatus = () => ({
  lastError: "",
  lastKnownLocation: null,
  lastSentAt: null,
  lastSentLocation: null,
  permissionStatus: "unknown",
  trackingActive: false,
  trackingMode: "background",
  updatedAt: Date.now(),
});

const toFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizeLocation = (location) => {
  if (!location) {
    return null;
  }

  const latitude =
    toFiniteNumber(location?.coords?.latitude ?? location?.latitude) ?? null;
  const longitude =
    toFiniteNumber(location?.coords?.longitude ?? location?.longitude) ?? null;

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    accuracy: toFiniteNumber(location?.coords?.accuracy ?? location?.accuracy),
    altitude: toFiniteNumber(location?.coords?.altitude ?? location?.altitude),
    heading: toFiniteNumber(location?.coords?.heading ?? location?.heading),
    latitude,
    longitude,
    speed: toFiniteNumber(location?.coords?.speed ?? location?.speed),
    timestamp: toFiniteNumber(location?.timestamp) || Date.now(),
  };
};

const mergeStatus = (baseStatus, patch = {}) => ({
  ...createDefaultStatus(),
  ...(baseStatus || {}),
  ...(patch || {}),
  updatedAt: Date.now(),
});

const readJsonFromStore = async (key) => {
  try {
    const rawValue = await SecureStore.getItemAsync(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.warn("⚠️ [CadeteBackgroundLocation] No se pudo leer SecureStore:", error);
    return null;
  }
};

const writeJsonToStore = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch (error) {
    console.warn("⚠️ [CadeteBackgroundLocation] No se pudo escribir SecureStore:", error);
  }
};

const clearJsonFromStore = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn("⚠️ [CadeteBackgroundLocation] No se pudo limpiar SecureStore:", error);
  }
};

const notifyStatusSubscribers = (nextStatus) => {
  statusSubscribers.forEach((listener) => {
    try {
      listener(nextStatus);
    } catch (error) {
      console.warn("⚠️ [CadeteBackgroundLocation] Listener falló:", error);
    }
  });
};

export const readCadeteLocationStatus = async () => {
  if (inMemoryStatus) {
    if (!hasNativeCadeteBackgroundTracking) {
      return inMemoryStatus;
    }

    try {
      const nativeStatus = await NativeCadeteBackgroundTracking.getStatus();
      inMemoryStatus = mergeStatus(inMemoryStatus, nativeStatus || {});
      return inMemoryStatus;
    } catch (_error) {
      return inMemoryStatus;
    }
  }

  const storedStatus = await readJsonFromStore(CADETE_LOCATION_STATUS_KEY);
  inMemoryStatus = mergeStatus(null, storedStatus || {});

  if (hasNativeCadeteBackgroundTracking) {
    try {
      const nativeStatus = await NativeCadeteBackgroundTracking.getStatus();
      inMemoryStatus = mergeStatus(inMemoryStatus, nativeStatus || {});
    } catch (_error) {
      // Si el modulo nativo aun no esta disponible en este runtime, caemos al estado JS actual.
    }
  }

  return inMemoryStatus;
};

export const getCadeteLocationStatusSync = () => inMemoryStatus;

const writeCadeteLocationStatus = async (patch = {}) => {
  const currentStatus = await readCadeteLocationStatus();
  const nextStatus = mergeStatus(currentStatus, patch);
  inMemoryStatus = nextStatus;
  await writeJsonToStore(CADETE_LOCATION_STATUS_KEY, nextStatus);
  notifyStatusSubscribers(nextStatus);
  return nextStatus;
};

const readCadeteLocationConfig = async () => {
  const storedConfig = await readJsonFromStore(CADETE_LOCATION_CONFIG_KEY);
  if (!storedConfig?.userId || storedConfig?.enabled !== true) {
    return null;
  }

  return storedConfig;
};

const writeCadeteLocationConfig = async (config) => {
  const normalizedMeteorUrl =
    typeof config?.meteorUrl === "string" && config.meteorUrl.trim()
      ? config.meteorUrl.trim()
      : getMeteorUrl();

  const nextConfig = {
    enabled: true,
    meteorUrl: normalizedMeteorUrl,
    startedAt: Date.now(),
    userId: config.userId,
  };

  await writeJsonToStore(CADETE_LOCATION_CONFIG_KEY, nextConfig);
  return nextConfig;
};

const resolveHttpOriginFromMeteorUrl = (meteorUrl) => {
  if (typeof meteorUrl !== "string" || !meteorUrl.trim()) {
    return null;
  }

  try {
    const parsedUrl = new URL(meteorUrl.trim());
    const protocol = parsedUrl.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsedUrl.host}`;
  } catch (_error) {
    return null;
  }
};

const getDistanceMeters = (origin, destination) => {
  if (!origin || !destination) {
    return 0;
  }

  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);
  const haversineValue =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2) *
      Math.cos(originLat) *
      Math.cos(destinationLat);

  return (
    2 *
    earthRadius *
    Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  );
};

const shouldSendLocation = (
  nextLocation,
  previousLocation,
  {
    distanceIntervalMeters = DISTANCE_INTERVAL_METERS,
    timeIntervalMs = ANDROID_BACKGROUND_INTERVAL_MS,
  } = {},
) => {
  if (!nextLocation) {
    return false;
  }

  if (!previousLocation) {
    return true;
  }

  const timeDifference = Math.abs(
    (Number(nextLocation.timestamp) || 0) -
      (Number(previousLocation.timestamp) || 0),
  );

  if (timeDifference >= timeIntervalMs) {
    return true;
  }

  return getDistanceMeters(nextLocation, previousLocation) >= distanceIntervalMeters;
};

const fetchJsonWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsedJson = null;

    if (rawText) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch (_error) {
        parsedJson = null;
      }
    }

    return {
      body: parsedJson,
      ok: response.ok,
      status: response.status,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const checkCadeteActive = async (config) => {
  const now = Date.now();
  if (
    activeCheckCache.userId === config.userId &&
    now - activeCheckCache.checkedAt < ACTIVE_CHECK_INTERVAL_MS &&
    typeof activeCheckCache.active === "boolean"
  ) {
    return activeCheckCache.active;
  }

  const apiBaseUrl = resolveHttpOriginFromMeteorUrl(config.meteorUrl);
  if (!apiBaseUrl) {
    return true;
  }

  try {
    const response = await fetchJsonWithTimeout(`${apiBaseUrl}/api/cadete/isActive`, {
      body: JSON.stringify({ userId: config.userId }),
      method: "POST",
    });
    const active = response.body?.active === true;

    activeCheckCache = {
      active,
      checkedAt: now,
      userId: config.userId,
    };

    return active;
  } catch (error) {
    console.warn("⚠️ [CadeteBackgroundLocation] No se pudo validar modoCadete en backend:", error);
    return true;
  }
};

const postCadeteLocation = async ({ config, location }) => {
  const apiBaseUrl = resolveHttpOriginFromMeteorUrl(config?.meteorUrl);
  if (!apiBaseUrl) {
    throw new Error("No se pudo resolver la URL HTTP del backend para ubicar al cadete.");
  }

  const response = await fetchJsonWithTimeout(`${apiBaseUrl}/api/location`, {
    body: JSON.stringify({
      accuracy: location.accuracy,
      lat: location.latitude,
      lng: location.longitude,
      speed: location.speed,
      timestamp: location.timestamp,
      userId: config.userId,
    }),
    method: "POST",
  });

  if (!response.ok || response.body?.ok === false) {
    throw new Error(
      response.body?.reason ||
        response.body?.error ||
        `No se pudo enviar la ubicación del cadete (${response.status}).`,
    );
  }

  return response.body;
};

export const ensureCadeteLocationPermissions = async ({ request = true } = {}) => {
  let foreground = await Location.getForegroundPermissionsAsync();

  if (foreground.status !== "granted" && request) {
    foreground = await Location.requestForegroundPermissionsAsync();
  }

  let background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== "granted" && request && foreground.status === "granted") {
    background = await Location.requestBackgroundPermissionsAsync();
  }

  const permissionStatus =
    background.status === "granted"
      ? "granted"
      : foreground.status === "granted"
        ? background.status
        : foreground.status;

  return {
    background,
    foreground,
    granted:
      foreground.status === "granted" && background.status === "granted",
    permissionStatus,
  };
};

const getLocationTaskOptions = () => ({
  accuracy:
    Platform.OS === "ios"
      ? Location.Accuracy.BestForNavigation
      : Location.Accuracy.High,
  activityType: Location.ActivityType.OtherNavigation,
  deferredUpdatesDistance: DISTANCE_INTERVAL_METERS,
  deferredUpdatesInterval: ANDROID_BACKGROUND_INTERVAL_MS,
  deferredUpdatesTimeout: ANDROID_BACKGROUND_INTERVAL_MS,
  distanceInterval: DISTANCE_INTERVAL_METERS,
  foregroundService: {
    killServiceOnDestroy: false,
    notificationBody:
      "Compartiendo tu ubicación para recibir y completar entregas en segundo plano.",
    notificationColor: "#13803d",
    notificationTitle: "Modo cadete activo",
  },
  mayShowUserSettingsDialog: true,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  // timeInterval: ANDROID_BACKGROUND_INTERVAL_MS,
});

const getCurrentCadeteLocation = async () =>
  normalizeLocation(
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    }),
  );

const executeCadeteLocationSend = async ({
  force,
  locationOverride,
  meteorUrl,
  minDistanceMeters,
  trackingMode,
  userId,
} = {}) => {
  const resolvedUserId =
    (typeof userId === "string" && userId.trim()) ||
    (await readCadeteLocationConfig())?.userId;

  if (!resolvedUserId) {
    return null;
  }

  const permissions = await ensureCadeteLocationPermissions({ request: true });
  if (!permissions.granted) {
    await writeCadeteLocationStatus({
      lastError:
        "Debes permitir la ubicación siempre para mantener el seguimiento del cadete en segundo plano.",
      permissionStatus: permissions.permissionStatus,
      trackingActive: false,
    });
    return null;
  }

  const config = await writeCadeteLocationConfig({
    meteorUrl: meteorUrl || getMeteorUrl(),
    userId: resolvedUserId,
  });
  const location = locationOverride
    ? normalizeLocation(locationOverride)
    : await getCurrentCadeteLocation();

  if (!location) {
    return null;
  }

  await saveCachedDeviceLocation(location);

  const currentStatus = await readCadeteLocationStatus();
  if (
    !force &&
    !shouldSendLocation(location, currentStatus.lastSentLocation, {
      distanceIntervalMeters: minDistanceMeters,
      timeIntervalMs: ANDROID_BACKGROUND_INTERVAL_MS,
    })
  ) {
    await writeCadeteLocationStatus({
      lastError: "",
      permissionStatus: permissions.permissionStatus,
      trackingActive: await Location.hasStartedLocationUpdatesAsync(
        CADETE_LOCATION_TASK_NAME,
      ),
      trackingMode,
    });
    return location;
  }

  await postCadeteLocation({ config, location });
  await writeCadeteLocationStatus({
    lastError: "",
    lastSentAt: Date.now(),
    lastSentLocation: location,
    permissionStatus: permissions.permissionStatus,
    trackingActive: true,
    trackingMode,
  });

  return location;
};

export const sendCadeteLocationNow = async ({
  force = true,
  locationOverride,
  meteorUrl,
  minDistanceMeters = DISTANCE_INTERVAL_METERS,
  trackingMode = "background",
  userId,
} = {}) => {
  if (locationOverride) {
    return executeCadeteLocationSend({
      force,
      locationOverride,
      meteorUrl,
      minDistanceMeters,
      trackingMode,
      userId,
    });
  }

  if (!pendingCurrentLocationSyncPromise) {
    pendingCurrentLocationSyncPromise = executeCadeteLocationSend({
      force,
      locationOverride: null,
      meteorUrl,
      minDistanceMeters,
      trackingMode,
      userId,
    }).finally(() => {
      pendingCurrentLocationSyncPromise = null;
    });
  }

  return pendingCurrentLocationSyncPromise;
};

export const isCadeteBackgroundLocationRunning = async () =>
  hasNativeCadeteBackgroundTracking
    ? Boolean((await NativeCadeteBackgroundTracking.getStatus())?.trackingActive)
    : Location.hasStartedLocationUpdatesAsync(CADETE_LOCATION_TASK_NAME);

const stopExpoCadeteLocationTaskIfRunning = async () => {
  try {
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
      CADETE_LOCATION_TASK_NAME,
    );

    if (alreadyRunning) {
      await Location.stopLocationUpdatesAsync(CADETE_LOCATION_TASK_NAME);
    }

    return alreadyRunning;
  } catch (error) {
    console.warn(
      "[CadeteBackgroundLocation] No se pudo detener la task JS de ubicación del cadete:",
      error,
    );
    return false;
  }
};

export const stopCadeteBackgroundLocation = async ({ clearConfig = true } = {}) => {
  if (hasNativeCadeteBackgroundTracking) {
    const hadJsTaskRunning = await stopExpoCadeteLocationTaskIfRunning();

    if (clearConfig) {
      await clearJsonFromStore(CADETE_LOCATION_CONFIG_KEY);
    }

    let nativeStatus = null;
    try {
      nativeStatus = await NativeCadeteBackgroundTracking.stopTracking();
    } catch (error) {
      console.warn(
        "[CadeteBackgroundLocation] No se pudo detener el tracking nativo del cadete:",
        error,
      );
    }

    activeCheckCache = {
      active: null,
      checkedAt: 0,
      userId: null,
    };

    await writeCadeteLocationStatus({
      lastError: nativeStatus?.lastError || "",
      permissionStatus: hadJsTaskRunning
        ? "granted"
        : (await readCadeteLocationStatus()).permissionStatus,
      trackingActive: false,
      trackingMode: nativeStatus?.trackingMode || "native",
    });
    return;
  }

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
    CADETE_LOCATION_TASK_NAME,
  );

  if (alreadyRunning) {
    await Location.stopLocationUpdatesAsync(CADETE_LOCATION_TASK_NAME);
  }

  if (clearConfig) {
    await clearJsonFromStore(CADETE_LOCATION_CONFIG_KEY);
  }

  activeCheckCache = {
    active: null,
    checkedAt: 0,
    userId: null,
  };

  await writeCadeteLocationStatus({
    lastError: "",
    permissionStatus: alreadyRunning ? "granted" : (await readCadeteLocationStatus()).permissionStatus,
    trackingActive: false,
  });
};

export const startCadeteBackgroundLocation = async ({ userId, meteorUrl } = {}) => {
  if (!userId) {
    await stopCadeteBackgroundLocation();
    return { reason: "missing-user", started: false };
  }

  if (hasNativeCadeteBackgroundTracking) {
    await stopExpoCadeteLocationTaskIfRunning();

    const permissions = await ensureCadeteLocationPermissions({ request: true });
    if (!permissions.granted) {
      await writeCadeteLocationStatus({
        lastError:
          "Debes permitir la ubicación siempre para compartir tu posición mientras el modo cadete esté activo.",
        permissionStatus: permissions.permissionStatus,
        trackingActive: false,
      });
      return { reason: "permission-denied", started: false };
    }

    const nextMeteorUrl = meteorUrl || getMeteorUrl();
    await writeCadeteLocationConfig({
      meteorUrl: nextMeteorUrl,
      userId,
    });

    try {
      const nativeStatus = await NativeCadeteBackgroundTracking.startTracking(
        userId,
        nextMeteorUrl,
      );
      await writeCadeteLocationStatus({
        lastError: nativeStatus?.lastError || "",
        permissionStatus: permissions.permissionStatus,
        trackingActive: Boolean(nativeStatus?.trackingActive ?? true),
        trackingMode: nativeStatus?.trackingMode || "native",
      });
      return { started: true, native: true };
    } catch (error) {
      await writeCadeteLocationStatus({
        lastError:
          error?.message ||
          "No se pudo iniciar el tracking nativo del cadete.",
        permissionStatus: permissions.permissionStatus,
        trackingActive: false,
      });
      return { reason: "native-start-failed", started: false };
    }
  }

  if (!TaskManager.isTaskDefined(CADETE_LOCATION_TASK_NAME)) {
    await writeCadeteLocationStatus({
      lastError:
        "La tarea de ubicación del cadete todavía no quedó registrada en este runtime. Reinicia la app para volver a cargar el entrypoint global.",
      trackingActive: false,
    });

    return { reason: "task-not-defined", started: false };
  }

  const permissions = await ensureCadeteLocationPermissions({ request: true });
  if (!permissions.granted) {
    await writeCadeteLocationStatus({
      lastError:
        "Debes permitir la ubicación siempre para compartir tu posición mientras el modo cadete esté activo.",
      permissionStatus: permissions.permissionStatus,
      trackingActive: false,
    });
    return { reason: "permission-denied", started: false };
  }

  await writeCadeteLocationConfig({
    meteorUrl: meteorUrl || getMeteorUrl(),
    userId,
  });

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
    CADETE_LOCATION_TASK_NAME,
  );

  if (!alreadyRunning) {
    await Location.startLocationUpdatesAsync(
      CADETE_LOCATION_TASK_NAME,
      getLocationTaskOptions(),
    );
  }

  await writeCadeteLocationStatus({
    lastError: "",
    permissionStatus: permissions.permissionStatus,
    trackingActive: true,
  });

  try {
    await sendCadeteLocationNow({
      force: true,
      meteorUrl,
      trackingMode: "background",
      userId,
    });
  } catch (error) {
    await writeCadeteLocationStatus({
      lastError:
        error?.message ||
        "El servicio quedó activo, pero no se pudo sincronizar la ubicación inicial.",
    });
  }

  return { started: true };
};

export const syncCadeteBackgroundLocation = async ({ enabled, userId } = {}) => {
  if (hasNativeCadeteBackgroundTracking) {
    if (!enabled || !userId) {
      await stopCadeteBackgroundLocation();
      return { started: false, stopped: true, native: true };
    }

    return startCadeteBackgroundLocation({ userId });
  }

  if (!enabled || !userId) {
    await stopCadeteBackgroundLocation();
    return { started: false, stopped: true };
  }

  return startCadeteBackgroundLocation({ userId });
};

export const subscribeCadeteLocationStatus = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  statusSubscribers.add(listener);
  if (inMemoryStatus) {
    listener(inMemoryStatus);
  }

  return () => {
    statusSubscribers.delete(listener);
  };
};

const bootstrapPersistedCadeteBackgroundLocation = async () => {
  if (hasNativeCadeteBackgroundTracking) {
    await stopExpoCadeteLocationTaskIfRunning();

    try {
      let nativeStatus = await NativeCadeteBackgroundTracking.getStatus();
      if (!nativeStatus?.trackingActive) {
        const persistedConfig = await readCadeteLocationConfig();
        if (persistedConfig?.userId) {
          nativeStatus = await NativeCadeteBackgroundTracking.syncTracking(
            true,
            persistedConfig.userId,
            persistedConfig.meteorUrl,
          );
        }
      }

      await writeCadeteLocationStatus(nativeStatus || {});
      return { restored: Boolean(nativeStatus?.trackingActive), native: true };
    } catch (_error) {
      return { restored: false, reason: "native-status-unavailable", native: true };
    }
  }

  const config = await readCadeteLocationConfig();
  if (!config?.userId) {
    return { restored: false, reason: "missing-config" };
  }

  if (!TaskManager.isTaskDefined(CADETE_LOCATION_TASK_NAME)) {
    return { restored: false, reason: "task-not-defined" };
  }

  const permissions = await ensureCadeteLocationPermissions({ request: false });
  if (!permissions.granted) {
    await writeCadeteLocationStatus({
      lastError:
        "El servicio del cadete encontró la configuración guardada, pero faltan permisos permanentes de ubicación para restaurar el tracking en segundo plano.",
      permissionStatus: permissions.permissionStatus,
      trackingActive: false,
      trackingMode: "background",
    });
    return { restored: false, reason: "permission-denied" };
  }

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
    CADETE_LOCATION_TASK_NAME,
  );

  if (!alreadyRunning) {
    await Location.startLocationUpdatesAsync(
      CADETE_LOCATION_TASK_NAME,
      getLocationTaskOptions(),
    );
  }

  await writeCadeteLocationStatus({
    lastError: "",
    permissionStatus: permissions.permissionStatus,
    trackingActive: true,
    trackingMode: "background",
  });

  return {
    restored: true,
    running: true,
    wasAlreadyRunning: alreadyRunning,
  };
};

if (!TaskManager.isTaskDefined(CADETE_LOCATION_TASK_NAME)) {
  console.info(
    `[CadeteBackgroundLocation] Registrando task ${CADETE_LOCATION_TASK_NAME}`,
  );
  TaskManager.defineTask(CADETE_LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      await writeCadeteLocationStatus({
        lastError:
          error.message ||
          "La tarea de ubicación del cadete falló en segundo plano.",
        trackingActive: false,
      });
      return;
    }

    const config = await readCadeteLocationConfig();
    if (!config?.userId) {
      await stopCadeteBackgroundLocation();
      return;
    }

    const locations = Array.isArray(data?.locations) ? data.locations : [];
    const lastRawLocation = locations.length ? locations[locations.length - 1] : null;
    const location = normalizeLocation(lastRawLocation);

    if (!location) {
      return;
    }

    await saveCachedDeviceLocation(location);

    const isActive = await checkCadeteActive(config);
    if (!isActive) {
      await writeCadeteLocationStatus({
        lastError:
          "El modo cadete ya no está activo en el servidor. Se detuvo el seguimiento en segundo plano.",
        trackingActive: false,
      });
      await stopCadeteBackgroundLocation({ clearConfig: true });
      return;
    }

    const currentStatus = await readCadeteLocationStatus();
    if (!shouldSendLocation(location, currentStatus.lastSentLocation)) {
      await writeCadeteLocationStatus({
        lastError: "",
        permissionStatus: "granted",
        trackingActive: true,
        trackingMode: "background",
      });
      return;
    }

    try {
      await postCadeteLocation({ config, location });
      await writeCadeteLocationStatus({
        lastError: "",
        lastSentAt: Date.now(),
        lastSentLocation: location,
        permissionStatus: "granted",
        trackingActive: true,
        trackingMode: "background",
      });
    } catch (requestError) {
      await writeCadeteLocationStatus({
        lastError:
          requestError?.message ||
          "No se pudo enviar la ubicación del cadete en segundo plano.",
        permissionStatus: "granted",
        trackingActive: true,
        trackingMode: "background",
      });
    }
  });

  console.info(
    `[CadeteBackgroundLocation] Task registrada: ${TaskManager.isTaskDefined(
      CADETE_LOCATION_TASK_NAME,
    )}`,
  );
}

if (!bootstrapCadeteTrackingPromise) {
  bootstrapCadeteTrackingPromise = bootstrapPersistedCadeteBackgroundLocation()
    .catch((error) => {
      console.warn(
        "[CadeteBackgroundLocation] No se pudo restaurar el tracking persistido al cargar el modulo:",
        error,
      );
      return { restored: false, reason: "bootstrap-error" };
    })
    .finally(() => {
      bootstrapCadeteTrackingPromise = null;
    });
}

export {
  ANDROID_BACKGROUND_INTERVAL_MS as CADETE_LOCATION_HEARTBEAT_MS, CADETE_LOCATION_TASK_NAME,
  FOREGROUND_DISTANCE_INTERVAL_METERS
};

