import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";

const DEFAULT_DELTA = { latitudeDelta: 0.008, longitudeDelta: 0.008 };

const normalizeCoordinates = (tienda) => {
  const source = tienda?.coordenadas || tienda?.cordenadas || null;
  const latitude = Number(source?.latitude ?? source?.latitud);
  const longitude = Number(source?.longitude ?? source?.longitud);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const MapaTiendaCardBackground = ({ children, tienda, fill = false, height = 164 }) => {
  const [region, setRegion] = useState(null);
  const coords = useMemo(() => normalizeCoordinates(tienda), [tienda]);

  useEffect(() => {
    if (!coords) {
      setRegion(null);
      return;
    }

    setRegion({ ...coords, ...DEFAULT_DELTA });
  }, [coords]);

  if (!region) {
    return null;
  }

  const wrapperStyle = fill ? styles.wrapperFill : { height };
  const mapStyle = fill ? StyleSheet.absoluteFillObject : [StyleSheet.absoluteFillObject, { minHeight: height }];

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <MapView
        customMapStyle={[{ featureType: "poi", stylers: [{ visibility: "off" }] }]}
        initialRegion={region}
        pitchEnabled={false}
        pointerEvents="none"
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        rotateEnabled={false}
        scrollEnabled={false}
        showsMyLocationButton={false}
        showsScale={false}
        style={mapStyle}
        zoomEnabled={false}
      >
        <Marker coordinate={coords} pinColor={tienda?.pinColor || undefined} />
      </MapView>

      {children ? <View style={styles.overlayContent}>{children}</View> : <></>}
      <View pointerEvents="none" style={styles.scrim} />
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.16)",
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    width: "100%",
  },
  wrapperFill: {
    flex: 1,
  },
});

export default MapaTiendaCardBackground;