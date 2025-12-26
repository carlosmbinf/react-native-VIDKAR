import React, { useState, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import MapView, { Marker, PROVIDER_GOOGLE , PROVIDER_DEFAULT } from 'react-native-maps';

const MapaPedidos = ( {puntoPartida, puntoAIr} ) => {
  const [region, setRegion] = useState(null);

  
  useEffect(() => {
    // Normalizar coordenadas (soportar tanto "coordenadas" como "cordenadas")
    const coords = puntoPartida?.coordenadas || puntoPartida?.cordenadas;
    if (coords?.latitude && coords?.longitude) {
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
    console.log("Region", region);
  }, [puntoPartida]);

  if (!region) {
    return null;
  }

  return (
    <View style={{ minWidth: 500, minHeight: 200, alignItems: 'center', justifyContent: 'center'}}>
<MapView
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={region}
      // showsUserLocation={true}
      showsMyLocationButton={true}
      showsScale={true}
      customMapStyle={[
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }],
        },
      ]}
      showsIndoors={true}
      // googleMapId={"AIzaSyD1r5uJ1PBgUaZkqKtlCgInLJtrA"}
      >
      {puntoPartida && <Marker
        coordinate={{
          latitude: region.latitude,
          longitude: region.longitude,
        }}
        title={`🏪 ${puntoPartida?.title || puntoPartida?.name || 'Tienda'}`}
        description={puntoPartida?.descripcion || ''}
        image={require('./pin_shop_50x50.png')}
        anchor={{ x: 0.5, y: 1 }}
        
      />}
      {puntoAIr && <Marker
        coordinate={{
          latitude: puntoAIr.latitude,
          longitude: puntoAIr.longitude,
        }}
        title={`📍 ${puntoAIr?.title || puntoAIr?.name || 'Destino'}`}
        description={puntoAIr?.descripcion || ''}
        pinColor="blue"
        image={require('./pin_goal_50x50.png')}
        anchor={{ x: 0.5, y: 1 }}
      />}
    </MapView>
    </View>
    
  );
};

const styles = StyleSheet.create({
  iconMap:{
    height:10
  },
  map: {
    width: '100%',
    height: 200,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
});

export default MapaPedidos;
