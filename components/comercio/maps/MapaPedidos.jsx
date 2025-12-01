import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const MapaPedidos = ({ puntoAIr }) => {
  const [region, setRegion] = useState(null);

  useEffect(() => {
    // Normalizar coordenadas (soportar tanto "coordenadas" como "cordenadas")
    const coords = puntoAIr?.coordenadas || puntoAIr?.cordenadas;
    
    if (coords?.latitude && coords?.longitude) {
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [puntoAIr]);

  if (!region) {
    return null;
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      showsUserLocation={true}
      showsMyLocationButton={true}
      customMapStyle={[
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }],
        },
      ]}>
      <Marker
        coordinate={{
          latitude: region.latitude,
          longitude: region.longitude,
        }}
        title={puntoAIr?.title || puntoAIr?.name || 'Destino'}
        description={puntoAIr?.descripcion || ''}
        pinColor="red"
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 200,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
});

export default React.memo(MapaPedidos);
