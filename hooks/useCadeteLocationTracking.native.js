import { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";

import {
  ensureCadeteLocationPermissions,
  isCadeteBackgroundLocationRunning,
  isNativeCadeteBackgroundTrackingAvailable,
  readCadeteLocationStatus,
  sendCadeteLocationNow,
  subscribeCadeteLocationStatus,
} from "../services/location/cadeteBackgroundLocation.native";
import {
  getCachedDeviceLocationSync,
  readCachedDeviceLocation,
} from "../services/location/deviceLocationCache.native";

const TRACKING_STATE_POLL_MS = 20000;
const TRACKING_STATE_POLL_MS_NATIVE = 5000;

const normalizeLiveLocation = (location) => {
  if (!location) {
    return null;
  }

  const latitude = Number(location?.coords?.latitude ?? location?.latitude);
  const longitude = Number(location?.coords?.longitude ?? location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    accuracy: Number(location?.coords?.accuracy ?? location?.accuracy) || null,
    altitude: Number(location?.coords?.altitude ?? location?.altitude) || null,
    heading: Number(location?.coords?.heading ?? location?.heading) || null,
    latitude,
    longitude,
    speed: Number(location?.coords?.speed ?? location?.speed) || null,
    timestamp: Number(location?.timestamp) || Date.now(),
  };
};

const getTrackingSnapshotLocation = (statusSnapshot, cachedLocation) =>
  normalizeLiveLocation(statusSnapshot?.lastKnownLocation) ||
  normalizeLiveLocation(statusSnapshot?.lastSentLocation) ||
  normalizeLiveLocation(cachedLocation) ||
  null;

export default function useCadeteLocationTracking({ enabled, userId }) {
  const [permissionStatus, setPermissionStatus] = useState("unknown");
  const [trackingActive, setTrackingActive] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [error, setError] = useState("");
  const [trackingMode, setTrackingMode] = useState("background");

  const hydrateTrackingState = useCallback(async () => {
    if (!enabled || !userId) {
      setPermissionStatus("unknown");
      setTrackingActive(false);
      setLastLocation(null);
      setLastSentAt(null);
      setError("");
      setTrackingMode("background");
      return;
    }

    const [cachedLocation, permissions, running, statusSnapshot] = await Promise.all([
      Promise.resolve(getCachedDeviceLocationSync()).then((syncLocation) => syncLocation || readCachedDeviceLocation()),
      ensureCadeteLocationPermissions({ request: false }),
      isCadeteBackgroundLocationRunning(),
      readCadeteLocationStatus(),
    ]);

    setLastLocation(getTrackingSnapshotLocation(statusSnapshot, cachedLocation));
    setLastSentAt(statusSnapshot?.lastSentAt || null);
    setError(statusSnapshot?.lastError || "");
    setPermissionStatus(permissions.permissionStatus || "unknown");
    setTrackingActive(Boolean(running && permissions.granted));
    setTrackingMode(statusSnapshot?.trackingMode || "background");
  }, [enabled, userId]);

  const refreshLocation = useCallback(
    async () => {
      try {
        if (!enabled || !userId) {
          return null;
        }

        if (isNativeCadeteBackgroundTrackingAvailable) {
          await hydrateTrackingState();
          return null;
        }

        const location = await sendCadeteLocationNow({ userId });
        await hydrateTrackingState();

        return location;
      } catch (refreshError) {
        setTrackingActive(false);
        setError(
          refreshError?.message || "No se pudo actualizar la ubicación actual.",
        );
        return null;
      }
    },
    [enabled, hydrateTrackingState, userId],
  );

  useEffect(() => {
    if (!enabled || !userId) {
      hydrateTrackingState();
      return undefined;
    }

    hydrateTrackingState();

    const unsubscribeStatus = subscribeCadeteLocationStatus((statusSnapshot) => {
      setLastSentAt(statusSnapshot?.lastSentAt || null);
      setError(statusSnapshot?.lastError || "");
      setPermissionStatus(statusSnapshot?.permissionStatus || "unknown");
      setTrackingActive(Boolean(statusSnapshot?.trackingActive));
      setTrackingMode(statusSnapshot?.trackingMode || "background");
      setLastLocation(getTrackingSnapshotLocation(statusSnapshot, null));
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && enabled) {
        hydrateTrackingState();
      }
    });

    const statePollInterval = setInterval(
      () => {
        hydrateTrackingState();
      },
      isNativeCadeteBackgroundTrackingAvailable
        ? TRACKING_STATE_POLL_MS_NATIVE
        : TRACKING_STATE_POLL_MS,
    );

    return () => {
      appStateSubscription.remove();
      clearInterval(statePollInterval);
      unsubscribeStatus();
    };
  }, [enabled, hydrateTrackingState, userId]);

  let status = "idle";
  if (permissionStatus !== "granted" && enabled) {
    status = "permission-denied";
  } else if (error) {
    status = "error";
  } else if (trackingActive) {
    status = "tracking";
  } else if (enabled) {
    status = "starting";
  }

  return {
    error,
    lastLocation,
    lastSentAt,
    openLocationSettings: () => Linking.openSettings(),
    permissionStatus,
    refreshLocation,
    status,
    trackingActive,
    trackingMode,
  };
}