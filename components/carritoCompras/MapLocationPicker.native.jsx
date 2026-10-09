import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
  TextInput,
} from "react-native-paper";
import {
  getCachedDeviceLocationSync,
  getCurrentDeviceLocation,
  requestDeviceLocationPermission,
} from "../../services/location/deviceLocationCache.native";
import {
  getGoogleAddressDetails,
  searchGoogleAddresses,
} from "../../services/location/googlePlaces.native";

const DEFAULT_REGION = {
  latitude: 23.1136,
  longitude: -82.3666,
  latitudeDelta: 0.015,
  longitudeDelta: 0.0121,
};

const MapLocationPicker = ({
  currentLocation,
  nombreCalle,
  numeroCasa,
  onLocationSelect,
  onNombreCalleChange,
  onNumeroCasaChange,
}) => {
  const immediateCachedLocation = getCachedDeviceLocationSync();
  const mapRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const selectedAddressRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    currentLocation || immediateCachedLocation || null,
  );
  const [addressQuery, setAddressQuery] = useState(
    [nombreCalle, numeroCasa].filter(Boolean).join(", "),
  );
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [selectingAddress, setSelectingAddress] = useState(false);

  const region = useMemo(
    () => ({
      latitude: selectedLocation?.latitude ?? DEFAULT_REGION.latitude,
      longitude: selectedLocation?.longitude ?? DEFAULT_REGION.longitude,
      latitudeDelta: DEFAULT_REGION.latitudeDelta,
      longitudeDelta: DEFAULT_REGION.longitudeDelta,
    }),
    [selectedLocation?.latitude, selectedLocation?.longitude],
  );

  useEffect(() => {
    const nextLocation = currentLocation
      ? {
          latitude: Number(currentLocation.latitude),
          longitude: Number(currentLocation.longitude),
        }
      : null;
    setSelectedLocation(nextLocation);

    if (nextLocation && mapRef.current) {
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
    const query = addressQuery.trim();
    if (
      query.length < 3 ||
      (query && query === selectedAddressRef.current)
    ) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoadingSuggestions(true);
      setAddressError("");

      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = Crypto.randomUUID();
        }
        const results = await searchGoogleAddresses(
          query,
          sessionTokenRef.current,
          controller.signal,
        );
        setSuggestions(results);
      } catch (_error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setAddressError(
            "No se pudieron buscar direcciones. Puedes marcar el punto en el mapa.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [addressQuery]);

  const handleAddressChange = (value) => {
    setAddressQuery(value);
    setAddressError("");
    if (selectedAddressRef.current && value !== selectedAddressRef.current) {
      selectedAddressRef.current = "";
      setSelectedLocation(null);
      onLocationSelect?.(null);
      onNombreCalleChange?.("");
      onNumeroCasaChange?.("");
    }
  };

  const handleAddressSelect = async (suggestion) => {
    if (!sessionTokenRef.current || selectingAddress) return;

    setSelectingAddress(true);
    setAddressError("");
    try {
      const selected = await getGoogleAddressDetails(
        suggestion.placeId,
        sessionTokenRef.current,
      );
      const address = selected.address || suggestion.text;
      selectedAddressRef.current = address;
      sessionTokenRef.current = null;
      setAddressQuery(address);
      setSuggestions([]);
      setSelectedLocation(selected.point);
      onNombreCalleChange?.(selected.street);
      onNumeroCasaChange?.(selected.houseNumber);
      onLocationSelect?.(selected.point);
      mapRef.current?.animateToRegion(
        {
          ...DEFAULT_REGION,
          latitude: selected.point.latitude,
          longitude: selected.point.longitude,
        },
        350,
      );
    } catch (_error) {
      setAddressError(
        "No se pudo ubicar esa dirección. Prueba otra sugerencia o marca el punto en el mapa.",
      );
    } finally {
      setSelectingAddress(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      const permission = await requestDeviceLocationPermission();
      if (permission.status !== "granted") {
        alert("Debe conceder permiso de ubicación para usar esta opción.");
        return;
      }

      selectedAddressRef.current = "";
      sessionTokenRef.current = null;
      setAddressQuery("");
      onNombreCalleChange?.("");
      onNumeroCasaChange?.("");

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
    const next = {
      latitude: Number(event.nativeEvent.coordinate.latitude),
      longitude: Number(event.nativeEvent.coordinate.longitude),
    };

    setSelectedLocation(next);
    onLocationSelect?.(next);
  };

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Ubicación de entrega
        </Text>
        <Text style={styles.description}>
          Busca la dirección para ubicarla en el mapa, o marca el punto exacto
          manualmente. También puedes usar tu ubicación actual.
        </Text>

        <View style={styles.addressSearch}>
          <TextInput
            label="Buscar dirección"
            mode="outlined"
            value={addressQuery}
            onChangeText={handleAddressChange}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Escribe calle, número o lugar"
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
            right={
              loadingSuggestions || selectingAddress ? (
                <TextInput.Icon
                  icon={() => <ActivityIndicator size={18} />}
                  disabled
                />
              ) : null
            }
            dense
          />
          {suggestions.length > 0 ? (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((suggestion) => (
                <Pressable
                  accessibilityRole="button"
                  key={suggestion.placeId}
                  onPress={() => handleAddressSelect(suggestion)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && styles.suggestionPressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.suggestionMainText}>
                    {suggestion.mainText}
                  </Text>
                  {suggestion.secondaryText ? (
                    <Text
                      numberOfLines={1}
                      style={styles.suggestionSecondaryText}
                    >
                      {suggestion.secondaryText}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          {addressError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {addressError}
            </Text>
          ) : addressQuery.trim().length > 0 &&
            addressQuery.trim().length < 3 ? (
            <Text style={styles.helperText}>Escribe al menos 3 caracteres.</Text>
          ) : null}
        </View>

        <View style={styles.addressForm}>
          <TextInput
            label="Nombre de la calle"
            mode="outlined"
            value={nombreCalle || ""}
            onChangeText={(value) => {
              if (value !== (nombreCalle || "")) {
                selectedAddressRef.current = "";
                setAddressQuery("");
                setSelectedLocation(null);
                onLocationSelect?.(null);
              }
              onNombreCalleChange?.(value);
            }}
            autoCapitalize="words"
            style={styles.streetInput}
            dense
          />
          <TextInput
            label="Número de la casa"
            mode="outlined"
            value={numeroCasa || ""}
            onChangeText={(value) => {
              if (value !== (numeroCasa || "")) {
                selectedAddressRef.current = "";
                setAddressQuery("");
                setSelectedLocation(null);
                onLocationSelect?.(null);
              }
              onNumeroCasaChange?.(value);
            }}
            keyboardType="default"
            style={styles.houseInput}
            dense
          />
        </View>

        <View style={styles.mapShell}>
          <MapView
            ref={mapRef}
            provider={
              Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
            }
            style={styles.map}
            initialRegion={region}
            onPress={handleMapPress}
            showsMyLocationButton={false}
            showsUserLocation={false}
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
            icon="crosshairs-gps"
          >
            Usar mi ubicación
          </Button>
        </View>

        {loading ? <ActivityIndicator style={styles.loader} /> : null}

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
  addressForm: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  addressSearch: {
    gap: 6,
    marginBottom: 12,
    zIndex: 2,
  },
  card: {
    borderRadius: 20,
  },
  description: {
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.7,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
  },
  helperText: {
    color: "#64748b",
    fontSize: 12,
    paddingHorizontal: 4,
  },
  houseInput: {
    flex: 1,
    minWidth: 130,
  },
  loader: {
    marginTop: 12,
  },
  map: {
    flex: 1,
  },
  mapShell: {
    borderRadius: 22,
    height: 320,
    overflow: "hidden",
  },
  searchInput: {
    backgroundColor: "transparent",
  },
  suggestionItem: {
    borderBottomColor: "rgba(100, 116, 139, 0.18)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  suggestionMainText: {
    fontWeight: "600",
  },
  suggestionPressed: {
    backgroundColor: "rgba(109, 40, 217, 0.1)",
  },
  suggestionSecondaryText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  suggestionsContainer: {
    backgroundColor: "white",
    borderColor: "rgba(100, 116, 139, 0.24)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    overflow: "hidden",
    zIndex: 3,
  },
  streetInput: {
    flex: 2,
    minWidth: 190,
  },
  title: {
    fontWeight: "700",
    marginBottom: 8,
  },
});

export default MapLocationPicker;
