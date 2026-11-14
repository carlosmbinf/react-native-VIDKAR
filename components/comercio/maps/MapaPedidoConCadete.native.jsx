import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { ActivityIndicator, Text } from "react-native-paper";

import { TiendasComercioCollection } from "../../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const MAPA_PEDIDO_TIENDA_FIELDS = {
  cordenadas: 1,
  coordenadas: 1,
  descripcion: 1,
  name: 1,
  title: 1,
  ubicacion: 1,
};

const MARKER_HEIGHT = 54;
const MARKER_WIDTH = 44;
const MARKER_ANCHOR = { x: 0.5, y: 1 };
const MARKER_CENTER_OFFSET = { x: 0, y: -MARKER_HEIGHT / 2 };

const resolveCoordinates = (source) => {
  if (!source) return null;

  const parseCoordinate = (value) => {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const latitude = parseCoordinate(source.latitude ?? source.latitud);
  const longitude = parseCoordinate(source.longitude ?? source.longitud);
  if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude, longitude };
};

const MapaPedidoConCadeteNative = ({
  cadeteId,
  coordenadasDestino,
  idTienda,
}) => {
  const { tienda, tiendaReady } = Meteor.useTracker(() => {
    if (!idTienda) {
      return { tienda: null, tiendaReady: false };
    }

    const sub = Meteor.subscribe("tiendas", { _id: idTienda }, {
      fields: MAPA_PEDIDO_TIENDA_FIELDS,
    });
    const tiendaData = TiendasComercioCollection.findOne(
      { _id: idTienda },
      { fields: MAPA_PEDIDO_TIENDA_FIELDS },
    );

    return {
      tienda: tiendaData,
      tiendaReady: sub.ready(),
    };
  }, [idTienda]);

  const { cadete, cadeteReady } = Meteor.useTracker(() => {
    if (!cadeteId) {
      return { cadete: null, cadeteReady: true };
    }

    const sub = Meteor.subscribe(
      "user",
      { _id: cadeteId },
      { fields: { cordenadas: 1, coordenadas: 1, username: 1 } },
    );
    const cadeteData = Meteor.users.findOne(
      { _id: cadeteId },
      { fields: { cordenadas: 1, coordenadas: 1, username: 1 } },
    );

    return {
      cadete: cadeteData,
      cadeteReady: sub.ready(),
    };
  }, [cadeteId]);

  const tiendaMarker =
    resolveCoordinates(tienda?.ubicacion) ||
    resolveCoordinates(tienda?.coordenadas) ||
    resolveCoordinates(tienda?.cordenadas);
  const cadeteMarker = cadeteReady
    ? resolveCoordinates(cadete?.cordenadas) || resolveCoordinates(cadete?.coordenadas)
    : null;
  const destinoMarker = resolveCoordinates(coordenadasDestino);
  const rutaPuntos = [tiendaMarker, cadeteMarker, destinoMarker].filter(Boolean);

  if (!tiendaReady || (!cadeteReady && rutaPuntos.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FF6F00" size="large" />
        <Text style={styles.loadingText}>Cargando mapa del pedido...</Text>
      </View>
    );
  }

  if (rutaPuntos.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          color="#F44336"
          name="map-marker-off"
          size={40}
        />
        <Text style={styles.errorText}>
          No hay coordenadas disponibles para mostrar el mapa
        </Text>
      </View>
    );
  }

  const latitudes = rutaPuntos.map((point) => point.latitude);
  const longitudes = rutaPuntos.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  // initialRegion solo encuadra al montar; no interfiere con el zoom del usuario.
  const region = {
    latitude: (minLat + maxLat) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.01),
    longitude: (minLng + maxLng) / 2,
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.01),
  };

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={[
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ]}
        initialRegion={region}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        showsIndoors
        showsMyLocationButton
        showsScale
        showsUserLocation={false}
        style={styles.map}
      >
        {tiendaMarker ? (
          <Marker
            anchor={MARKER_ANCHOR}
            centerOffset={MARKER_CENTER_OFFSET}
            coordinate={tiendaMarker}
            description={tienda?.descripcion || "Punto de origen"}
            title={`🏪 ${tienda?.title || tienda?.name || "Tienda"}`}
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

        {cadeteMarker ? (
          <Marker
            anchor={MARKER_ANCHOR}
            centerOffset={MARKER_CENTER_OFFSET}
            coordinate={cadeteMarker}
            description="Posición actual del repartidor"
            title={`🚴 ${cadete?.username || "Cadete"}`}
          >
            <View style={styles.markerContainer}>
              <View
                style={[styles.markerCircle, { backgroundColor: "#2196F3" }]}
              >
                <MaterialCommunityIcons
                  color="#fff"
                  name="bike-fast"
                  size={24}
                />
              </View>
              <View
                style={[styles.markerTriangle, { borderTopColor: "#2196F3" }]}
              />
            </View>
          </Marker>
        ) : null}

        {destinoMarker ? (
          <Marker
            anchor={MARKER_ANCHOR}
            centerOffset={MARKER_CENTER_OFFSET}
            coordinate={destinoMarker}
            description="Ubicación de entrega al cliente"
            title="📍 Destino"
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

        {rutaPuntos.length >= 2 ? (
          <Polyline
            coordinates={rutaPuntos}
            lineDashPattern={[10, 5]}
            strokeColor="#FF6F00"
            strokeWidth={3}
          />
        ) : null}
      </MapView>

      <View style={styles.legend}>
        {tiendaMarker ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FF6F00" }]} />
            <Text style={styles.legendText}>Tienda</Text>
          </View>
        ) : null}
        {cadeteMarker ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
            <Text style={styles.legendText}>Cadete</Text>
          </View>
        ) : null}
        {destinoMarker ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
            <Text style={styles.legendText}>Destino</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    overflow: "hidden",
    width: "100%",
    borderRadius: 12,
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    height: 200,
    justifyContent: "center",
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },
  legend: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    bottom: 12,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    right: 12,
    shadowColor: "#000",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  legendDot: {
    borderRadius: 6,
    height: 12,
    marginRight: 6,
    width: 12,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
  },
  legendText: {
    color: "#424242",
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    height: 250,
    justifyContent: "center",
    marginVertical: 12,
  },
  loadingText: {
    color: "#757575",
    fontSize: 14,
    marginTop: 12,
  },
  map: {
    flex: 1,
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
    height: MARKER_HEIGHT,
    justifyContent: "center",
    width: MARKER_WIDTH,
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
});

export default MapaPedidoConCadeteNative;
