import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";

const DEVICE_LOCATION_CACHE_KEY = "device:last-location:v1";
let inMemoryCachedDeviceLocation = null;

const toFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizeLocation = (location) => {
  if (!location) {
    return null;
  }

  const latitude = toFiniteNumber(location.latitude);
  const longitude = toFiniteNumber(location.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    accuracy: toFiniteNumber(location.accuracy),
    altitude: toFiniteNumber(location.altitude),
    latitude,
    longitude,
    timestamp: toFiniteNumber(location.timestamp) || Date.now(),
  };
};

const mapExpoPositionToLocation = (position) =>
  normalizeLocation({
    accuracy: position?.coords?.accuracy,
    altitude: position?.coords?.altitude,
    latitude: position?.coords?.latitude,
    longitude: position?.coords?.longitude,
    timestamp: position?.timestamp,
  });

export function getCachedDeviceLocationSync() {
  return inMemoryCachedDeviceLocation;
}

export async function readCachedDeviceLocation() {
  if (inMemoryCachedDeviceLocation) {
    return inMemoryCachedDeviceLocation;
  }

  try {
    const rawValue = await SecureStore.getItemAsync(DEVICE_LOCATION_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    const normalizedLocation = normalizeLocation(JSON.parse(rawValue));
    inMemoryCachedDeviceLocation = normalizedLocation;
    return normalizedLocation;
  } catch (error) {
    console.warn(
      "⚠️ [LocationCache] No se pudo leer la ubicación en caché:",
      error,
    );
    return null;
  }
}

export async function saveCachedDeviceLocation(location) {
  const normalizedLocation = normalizeLocation(location);

  if (!normalizedLocation) {
    return null;
  }

  inMemoryCachedDeviceLocation = normalizedLocation;

  try {
    await SecureStore.setItemAsync(
      DEVICE_LOCATION_CACHE_KEY,
      JSON.stringify(normalizedLocation),
    );
  } catch (error) {
    console.warn(
      "⚠️ [LocationCache] No se pudo guardar la ubicación en caché:",
      error,
    );
  }

  return normalizedLocation;
}

export async function requestDeviceLocationPermission() {
  return Location.requestForegroundPermissionsAsync();
}

export async function getCurrentDeviceLocation(options = {}) {
  const position = await Location.getCurrentPositionAsync({
    accuracy: options.accuracy ?? Location.Accuracy.High,
  });

  const resolvedLocation = mapExpoPositionToLocation(position);
  if (!resolvedLocation) {
    throw new Error(
      "No se pudo normalizar la ubicación actual del dispositivo",
    );
  }

  await saveCachedDeviceLocation(resolvedLocation);
  return resolvedLocation;
}

export { DEVICE_LOCATION_CACHE_KEY };

