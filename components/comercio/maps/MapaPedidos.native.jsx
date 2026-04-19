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
            anchor={{ x: 0.5, y: 1 }}
            coordinate={origin}
            description={puntoPartida?.descripcion || "Punto de recogida"}
            image={require("./pin_shop_50x50.png")}
            title={puntoPartida?.title || puntoPartida?.name || "Tienda"}
          />
        ) : null}

        {destination ? (
          <Marker
            anchor={{ x: 0.5, y: 1 }}
            coordinate={destination}
            description={puntoAIr?.descripcion || "Punto de entrega"}
            image={require("./pin_goal_50x50.png")}
            title={puntoAIr?.title || puntoAIr?.name || "Destino"}
          />
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