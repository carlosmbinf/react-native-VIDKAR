import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

const MapaTiendaCardBackground = ({ tienda, height = 180 }) => {
  const [region, setRegion] = useState(null);

  const coords = useMemo(() => {
    // soportar ambos campos legacy: coordenadas / cordenadas
    return tienda?.coordenadas || tienda?.cordenadas || null;
  }, [tienda?.coordenadas, tienda?.cordenadas]);

  useEffect(() => {
    const lat = coords?.latitude;
    const lon = coords?.longitude;

    const isValid =
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lon);

    if (!isValid) {
      setRegion(null);
      return;
    }

    setRegion({
      latitude: lat,
      longitude: lon,
      ...DEFAULT_DELTA,
    });
  }, [coords?.latitude, coords?.longitude]);

  if (!region) return null;

  return (
    <View style={[styles.wrapper, { height }]}>
      <MapView
        pointerEvents="none" // ✅ clave: mapa como fondo (no roba gestos)
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsMyLocationButton={false}
        showsScale={false}
        rotateEnabled={false}
        pitchEnabled={false}
        zoomEnabled={false}
        scrollEnabled={false}
        customMapStyle={[
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ]}
      >
        <Marker
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          title={tienda?.title || 'Tienda'}
          description={tienda?.descripcion || ''}
          // Si deseas icono custom para tienda, puedes cambiarlo luego (png en empresa/maps)
          pinColor={tienda?.pinColor || '#673AB7'}
          anchor={{ x: 0.5, y: 1 }}
        />
      </MapView>

      {/* overlay para oscurecer un poco y mejorar legibilidad del texto */}
      <View pointerEvents="none" style={styles.scrim} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#EDEDED',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});

export default MapaTiendaCardBackground;
