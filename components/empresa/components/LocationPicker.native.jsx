import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import { Button, Card, Text, useTheme } from "react-native-paper";

const getRegion = (location) => ({
  latitude: location.latitude,
  longitude: location.longitude,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
});

const normalizeLocation = (value) => {
  const latitude = Number(value?.latitude ?? value?.latitud);
  const longitude = Number(value?.longitude ?? value?.longitud);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const LocationPicker = ({ initialLocation, onLocationChange }) => {
  const theme = useTheme();
  const [location, setLocation] = useState(normalizeLocation(initialLocation));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocation(normalizeLocation(initialLocation));
  }, [initialLocation]);

  const region = useMemo(() => {
    if (!location) {
      return null;
    }

    return getRegion(location);
  }, [location]);

  const ensurePermission = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.granted) {
      return true;
    }

    if (!permission.canAskAgain) {
      Alert.alert(
        "Permiso de ubicación bloqueado",
        "Debes habilitar la ubicación desde la configuración de la app para guardar la posición de la tienda.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir configuración", onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    Alert.alert(
      "Permiso requerido",
      "Necesitamos acceso a tu ubicación para ubicar correctamente la tienda.",
    );
    return false;
  };

  const handleGetCurrentLocation = async () => {
    setLoading(true);
    setError("");

    try {
      const hasPermission = await ensurePermission();

      if (!hasPermission) {
        setLoading(false);
        return;
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLocation = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };

      setLocation(nextLocation);
      onLocationChange?.(nextLocation);
    } catch (locationError) {
      const message =
        locationError?.message ||
        "No fue posible obtener la ubicación actual. Inténtalo nuevamente.";
      setError(message);
      Alert.alert("No se pudo obtener la ubicación", message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    Alert.alert("Eliminar ubicación", "La tienda quedará sin coordenadas guardadas.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          setLocation(null);
          setError("");
          onLocationChange?.(null);
        },
      },
    ]);
  };

  return (
    <Card>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium">Ubicación de la tienda</Text>
        <Text variant="bodySmall">
          Captura la ubicación actual del comercio para que el sistema pueda usarla en pedidos y búsquedas cercanas.
        </Text>

        {region ? (
          <View style={styles.mapWrapper}>
            <MapView
              initialRegion={region}
              pointerEvents="none"
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFill}
              rotateEnabled={false}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={location} />
            </MapView>
            <View
              pointerEvents="none"
              style={[
                styles.mapOverlay,
                {
                  backgroundColor: theme.dark
                    ? "rgba(15, 23, 42, 0.18)"
                    : "rgba(255, 255, 255, 0.12)",
                },
              ]}
            />
          </View>
        ) : null}

        {location ? (
          <View style={styles.coordinatesWrap}>
            <Text variant="bodySmall">Latitud: {location.latitude.toFixed(6)}</Text>
            <Text variant="bodySmall">Longitud: {location.longitude.toFixed(6)}</Text>
          </View>
        ) : (
          <Text variant="bodySmall">Todavía no hay una ubicación registrada para esta tienda.</Text>
        )}

        {error ? <Text style={styles.errorText} variant="bodySmall">{error}</Text> : null}

        <View style={styles.actionsRow}>
          <Button loading={loading} mode="contained-tonal" onPress={handleGetCurrentLocation}>
            {location ? "Actualizar ubicación" : "Usar mi ubicación"}
          </Button>
          {location ? (
            <Button disabled={loading} mode="text" onPress={handleClearLocation}>
              Quitar
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cardContent: {
    gap: 12,
  },
  coordinatesWrap: {
    gap: 4,
  },
  errorText: {
    color: "#dc2626",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mapWrapper: {
    borderRadius: 18,
    height: 180,
    overflow: "hidden",
    width: "100%",
  },
});

export default LocationPicker;