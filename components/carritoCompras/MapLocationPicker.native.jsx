import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";
import {
  getCachedDeviceLocationSync,
  getCurrentDeviceLocation,
  readCachedDeviceLocation,
  requestDeviceLocationPermission,
} from "../../services/location/deviceLocationCache.native";

const DEFAULT_REGION = {
  latitude: 23.1136,
  longitude: -82.3666,
  latitudeDelta: 0.015,
  longitudeDelta: 0.0121,
};

const MapLocationPicker = ({ currentLocation, onLocationSelect }) => {
  const immediateCachedLocation = getCachedDeviceLocationSync();
  const mapRef = useRef(null);
  const hasManualSelectionRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(
    currentLocation == null && immediateCachedLocation == null,
  );
  const [selectedLocation, setSelectedLocation] = useState(
    currentLocation || immediateCachedLocation || null,
  );

  const region = useMemo(
    () => ({
      latitude: currentLocation?.latitude || DEFAULT_REGION.latitude,
      longitude: currentLocation?.longitude || DEFAULT_REGION.longitude,
      latitudeDelta: DEFAULT_REGION.latitudeDelta,
      longitudeDelta: DEFAULT_REGION.longitudeDelta,
    }),
    [currentLocation?.latitude, currentLocation?.longitude],
  );

  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    const nextLocation = {
      latitude: Number(currentLocation.latitude),
      longitude: Number(currentLocation.longitude),
    };

    setSelectedLocation(nextLocation);
    setInitializing(false);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...DEFAULT_REGION,
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
        },
        350,
      );
    }
  }, [currentLocation]);

  useEffect(() => {
    if (currentLocation) {
      return;
    }

    let mounted = true;

    const bootstrapLocation = async () => {
      let cachedLocation = null;

      try {
        cachedLocation = await readCachedDeviceLocation();
        if (!mounted) {
          return;
        }

        if (cachedLocation && !hasManualSelectionRef.current) {
          setSelectedLocation(cachedLocation);
          setInitializing(false);
          onLocationSelect?.(cachedLocation);

          setTimeout(() => {
            mapRef.current?.animateToRegion(
              {
                ...DEFAULT_REGION,
                latitude: cachedLocation.latitude,
                longitude: cachedLocation.longitude,
              },
              250,
            );
          }, 80);
        }

        const permission = await requestDeviceLocationPermission();
        if (!mounted) {
          return;
        }

        if (permission.status !== "granted") {
          setInitializing(false);
          return;
        }

        const nextLocation = await getCurrentDeviceLocation({
          accuracy: Location.Accuracy.High,
        });
        if (!mounted) {
          return;
        }

        if (!hasManualSelectionRef.current) {
          setSelectedLocation(nextLocation);
          onLocationSelect?.(nextLocation);
        }

        setTimeout(() => {
          if (!hasManualSelectionRef.current) {
            mapRef.current?.animateToRegion(
              {
                ...DEFAULT_REGION,
                latitude: nextLocation.latitude,
                longitude: nextLocation.longitude,
              },
              350,
            );
          }
        }, 120);
      } catch (error) {
        console.error("No se pudo inicializar la ubicación:", error);
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    bootstrapLocation();

    return () => {
      mounted = false;
    };
  }, [currentLocation, onLocationSelect]);

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      const permission = await requestDeviceLocationPermission();
      if (permission.status !== "granted") {
        alert("Debe conceder permiso de ubicación para usar esta opción.");
        return;
      }

      hasManualSelectionRef.current = false;

      const next = await getCurrentDeviceLocation({
        accuracy: Location.Accuracy.High,
      });

      setSelectedLocation(next);
      onLocationSelect?.(next);
      mapRef.current?.animateToRegion(
        {
          ...DEFAULT_REGION,
          latitude: next.latitude,
          longitude: next.longitude,
        },
        350,
      );
    } catch (error) {
      console.error("No se pudo obtener la ubicación:", error);
      alert("No se pudo obtener la ubicación actual.");
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (event) => {
    hasManualSelectionRef.current = true;

    const next = {
      latitude: Number(event.nativeEvent.coordinate.latitude),
      longitude: Number(event.nativeEvent.coordinate.longitude),
    };

    setSelectedLocation(next);
    onLocationSelect?.(next);
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Ubicación de entrega
        </Text>
        <Text style={styles.description}>
          Toca el mapa para marcar el punto exacto de entrega o usa tu ubicación
          actual para centrar y seleccionar más rápido.
        </Text>

        <View style={styles.mapShell}>
          <MapView
            ref={mapRef}
            provider={
              Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
            }
            style={styles.map}
            initialRegion={region}
            onPress={handleMapPress}
            showsMyLocationButton
            showsUserLocation={Boolean(selectedLocation)}
          >
            {selectedLocation ? (
              <Marker
                coordinate={selectedLocation}
                title="Ubicación de entrega"
                description="Aquí se recibirá el pedido"
                pinColor="#6200ee"
              />
            ) : null}
          </MapView>
        </View>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            Usar mi ubicación
          </Button>
        </View>

        {loading ? <ActivityIndicator style={styles.loader} /> : null}

        {selectedLocation ? (
          <Chip icon="map-marker" style={styles.chip}>
            {`${Number(selectedLocation.latitude).toFixed(5)}, ${Number(selectedLocation.longitude).toFixed(5)}`}
          </Chip>
        ) : null}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  card: {
    borderRadius: 20,
  },
  chip: {
    marginTop: 12,
  },
  description: {
    lineHeight: 20,
    marginBottom: 14,
    opacity: 0.7,
  },
  loader: {
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  map: {
    flex: 1,
  },
  mapShell: {
    borderRadius: 22,
    height: 320,
    overflow: "hidden",
  },
  title: {
    fontWeight: "700",
    marginBottom: 8,
  },
});

export default MapLocationPicker;
