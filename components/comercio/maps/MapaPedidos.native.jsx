import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { Text } from "react-native-paper";

import { resolveCoordinatePair } from "../pedidos/cadetePedidoUtils";

const MAP_PIN_HEIGHT = 54;
const MAP_PIN_WIDTH = 44;
const MAP_PIN_ANCHOR = { x: 0.5, y: 1 };
const MAP_PIN_CENTER_OFFSET = { x: 0, y: -MAP_PIN_HEIGHT / 2 };

const createRegion = (origin, destination) => {
  if (origin && destination) {
    const latitude = (origin.latitude + destination.latitude) / 2;
    const longitude = (origin.longitude + destination.longitude) / 2;
    const latitudeDelta = Math.max(
      Math.abs(origin.latitude - destination.latitude) * 1.7,
      0.02,
    );
    const longitudeDelta = Math.max(
      Math.abs(origin.longitude - destination.longitude) * 1.7,
      0.02,
    );

    return {
      latitude,
      latitudeDelta,
      longitude,
      longitudeDelta,
    };
  }

  const focusPoint = origin || destination;
  if (!focusPoint) {
    return null;
  }

  return {
    latitude: focusPoint.latitude,
    latitudeDelta: 0.015,
    longitude: focusPoint.longitude,
    longitudeDelta: 0.015,
  };
};

const MapaPedidos = ({ puntoPartida, puntoAIr }) => {
  const origin = useMemo(() => resolveCoordinatePair(puntoPartida), [puntoPartida]);
  const destination = useMemo(() => resolveCoordinatePair(puntoAIr), [puntoAIr]);
  const region = useMemo(() => createRegion(origin, destination), [destination, origin]);

  if (!region) {
    return (
      <View style={styles.emptyState}>
        <Text variant="bodyMedium" style={styles.emptyTitle}>
          No hay coordenadas disponibles
        </Text>
        <Text variant="bodySmall" style={styles.emptyCopy}>
          El mapa se mostrará cuando el pedido tenga origen o destino válido.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <MapView
        initialRegion={region}
        key={`${region.latitude}:${region.longitude}:${region.latitudeDelta}`}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        showsCompass
        showsIndoors
        showsMyLocationButton
        showsScale
        style={styles.map}
      >
        {origin ? (
          <Marker
            anchor={MAP_PIN_ANCHOR}
            centerOffset={MAP_PIN_CENTER_OFFSET}
            coordinate={origin}
            description={puntoPartida?.descripcion || "Punto de recogida"}
            title={puntoPartida?.title || puntoPartida?.name || "Tienda"}
          >
            <View style={styles.markerContainer}>
              <View
                style={[styles.markerCircle, { backgroundColor: "#FF6F00" }]}
              >
                <MaterialCommunityIcons
                  color="#fff"
                  name="storefront"
                  size={24}
                />
              </View>
              <View style={styles.markerTriangle} />
            </View>
          </Marker>
        ) : null}

        {destination ? (
          <Marker
            anchor={MAP_PIN_ANCHOR}
            centerOffset={MAP_PIN_CENTER_OFFSET}
            coordinate={destination}
            description={puntoAIr?.descripcion || "Punto de entrega"}
            title={puntoAIr?.title || puntoAIr?.name || "Destino"}
          >
            <View style={styles.markerContainer}>
              <View
                style={[styles.markerCircle, { backgroundColor: "#4CAF50" }]}
              >
                <MaterialCommunityIcons
                  color="#fff"
                  name="home-map-marker"
                  size={24}
                />
              </View>
              <View
                style={[styles.markerTriangle, { borderTopColor: "#4CAF50" }]}
              />
            </View>
          </Marker>
        ) : null}

        {origin && destination ? (
          <Polyline
            coordinates={[origin, destination]}
            lineCap="round"
            lineDashPattern={[6, 8]}
            strokeColor="rgba(37, 99, 235, 0.8)"
            strokeWidth={4}
          />
        ) : null}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    minHeight: 220,
    overflow: "hidden",
  },
  map: {
    height: 220,
    width: "100%",
  },
  markerCircle: {
    alignItems: "center",
    borderColor: "#fff",
    borderRadius: 22,
    borderWidth: 3,
    elevation: 8,
    height: 44,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    width: 44,
  },
  markerContainer: {
    alignItems: "center",
    height: MAP_PIN_HEIGHT,
    justifyContent: "center",
    width: MAP_PIN_WIDTH,
  },
  markerTriangle: {
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderLeftWidth: 8,
    borderRightColor: "transparent",
    borderRightWidth: 8,
    borderStyle: "solid",
    borderTopColor: "#FF6F00",
    borderTopWidth: 12,
    height: 0,
    marginTop: -2,
    width: 0,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderColor: "rgba(148, 163, 184, 0.28)",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 180,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: "#0f172a",
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCopy: {
    color: "#475569",
    lineHeight: 20,
    textAlign: "center",
  },
});

export default MapaPedidos;