import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import { useEffect, useState } from "react";
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

const MapaPedidoConCadeteNative = ({
  cadeteId,
  coordenadasDestino,
  idTienda,
}) => {
  const [region, setRegion] = useState(null);

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
      return { cadete: null, cadeteReady: false };
    }

    const sub = Meteor.subscribe(
      "user",
      { _id: cadeteId },
      { fields: { cordenadas: 1, username: 1 } },
    );
    const cadeteData = Meteor.users.findOne(
      { _id: cadeteId },
      { fields: { cordenadas: 1, username: 1 } },
    );

    return {
      cadete: cadeteData,
      cadeteReady: sub.ready(),
    };
  }, [cadeteId]);

  useEffect(() => {
    const coordsTienda = tienda?.coordenadas;
    const coordsCadete = cadete?.cordenadas;

    if (!coordsTienda && !coordenadasDestino) {
      setRegion(null);
      return;
    }

    const puntos = [];

    if (coordsTienda?.latitude && coordsTienda?.longitude) {
      puntos.push({
        latitude: parseFloat(coordsTienda.latitude),
        longitude: parseFloat(coordsTienda.longitude),
      });
    }

    if (coordsCadete?.latitude && coordsCadete?.longitude) {
      puntos.push({
        latitude: parseFloat(coordsCadete.latitude),
        longitude: parseFloat(coordsCadete.longitude),
      });
    }

    if (coordenadasDestino?.latitude && coordenadasDestino?.longitude) {
      puntos.push({
        latitude: parseFloat(coordenadasDestino.latitude),
        longitude: parseFloat(coordenadasDestino.longitude),
      });
    }

    if (puntos.length > 0) {
      const latitudes = puntos.map((point) => point.latitude);
      const longitudes = puntos.map((point) => point.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      const latDelta = (maxLat - minLat) * 1.8;
      const lngDelta = (maxLng - minLng) * 1.8;

      setRegion({
        latitude: (minLat + maxLat) / 2,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitude: (minLng + maxLng) / 2,
        longitudeDelta: Math.max(lngDelta, 0.01),
      });
    }
  }, [cadete, coordenadasDestino, tienda]);

  if (!tiendaReady || !cadeteReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FF6F00" size="large" />
        <Text style={styles.loadingText}>Cargando mapa del pedido...</Text>
      </View>
    );
  }

  if (!region) {
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

  const coordsTienda =
    tienda?.ubicacion || tienda?.coordenadas || tienda?.cordenadas;
  const tiendaMarker =
    coordsTienda?.latitude && coordsTienda?.longitude
      ? {
          latitude: parseFloat(coordsTienda.latitude),
          longitude: parseFloat(coordsTienda.longitude),
        }
      : coordsTienda?.latitud && coordsTienda?.longitud
        ? {
            latitude: parseFloat(coordsTienda.latitud),
            longitude: parseFloat(coordsTienda.longitud),
          }
        : null;

  const cadeteMarker =
    cadete?.cordenadas?.latitude && cadete?.cordenadas?.longitude
      ? {
          latitude: parseFloat(cadete.cordenadas.latitude),
          longitude: parseFloat(cadete.cordenadas.longitude),
        }
      : null;

  const destinoMarker =
    coordenadasDestino?.latitude && coordenadasDestino?.longitude
      ? {
          latitude: parseFloat(coordenadasDestino.latitude),
          longitude: parseFloat(coordenadasDestino.longitude),
        }
      : null;

  const rutaPuntos = [];
  if (tiendaMarker) rutaPuntos.push(tiendaMarker);
  if (cadeteMarker) rutaPuntos.push(cadeteMarker);
  if (destinoMarker) rutaPuntos.push(destinoMarker);

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
            anchor={{ x: 0.5, y: 1 }}
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
            anchor={{ x: 0.5, y: 1 }}
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
            anchor={{ x: 0.5, y: 1 }}
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
    justifyContent: "center",
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
