import React, { useState, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import Meteor, { useTracker } from '@meteorrn/core';
import { TiendasComercioCollection } from '../../collections/collections';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Componente de mapa para visualizar pedidos con 3 puntos:
 * 1. Tienda (origen) - obtenida por idTienda
 * 2. Cadete (posición actual) - obtenida por cadeteId desde Meteor.users
 * 3. Destino (cliente) - coordenadas del primer carrito
 * 
 * @param {String} idTienda - ID de la tienda en TiendasComercioCollection
 * @param {String} cadeteId - ID del usuario cadete (Meteor.userId)
 * @param {Object} coordenadasDestino - { latitude, longitude } del destino
 */
const MapaPedidoConCadete = ({ idTienda, cadeteId, coordenadasDestino }) => {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 🏪 Obtener datos de la tienda usando useTracker
  const { tienda, tiendaReady } = useTracker(() => {
    if (!idTienda) return { tienda: null, tiendaReady: false };
    
    const sub = Meteor.subscribe('tiendas', { _id: idTienda });
    const tiendaData = TiendasComercioCollection.findOne({ _id: idTienda });
    
    return { 
      tienda: tiendaData, 
      tiendaReady: sub.ready() 
    };
  }, [idTienda]);

  // 🚴 Obtener ubicación del cadete desde Meteor.users
  const { cadete, cadeteReady } = useTracker(() => {
    if (!cadeteId) return { cadete: null, cadeteReady: false };
    
    const sub = Meteor.subscribe('user', { _id: cadeteId }, { fields: { cordenadas: 1, username: 1 } });
    const cadeteData = Meteor.users.findOne({ _id: cadeteId }, { fields: { cordenadas: 1, username: 1 } });
    
    return { 
      cadete: cadeteData, 
      cadeteReady: sub.ready() 
    };
  }, [cadeteId]);

  useEffect(() => {
    console.log("MapaPedidoConCadete - cadete:", cadete);
  })
  // 📐 Calcular región del mapa que incluya todos los puntos disponibles
  useEffect(() => {
    const coordsTienda = tienda?.coordenadas;
    // ✅ CORREGIDO: Usar "cordenadas" (con 'r') en lugar de "ubicacionCadete"
    const coordsCadete = cadete?.cordenadas;
    
    console.log('🗺️ [MapaPedidoConCadete] Calculando región:', {
      coordsTienda,
      coordsCadete,
      coordenadasDestino
    });

    // Validar que tengamos al menos la tienda o el destino
    if (!coordsTienda && !coordenadasDestino) {
      setLoading(false);
      return;
    }

    const puntos = [];

    // Agregar tienda si existe
    if (coordsTienda?.latitude && coordsTienda?.longitude) {
      puntos.push({
        latitude: parseFloat(coordsTienda.latitude),
        longitude: parseFloat(coordsTienda.longitude),
      });
    }

    // ✅ CORREGIDO: Agregar cadete usando "cordenadas"
    if (coordsCadete?.latitude && coordsCadete?.longitude) {
      puntos.push({
        latitude: parseFloat(coordsCadete.latitude),
        longitude: parseFloat(coordsCadete.longitude),
      });
      console.log('✅ [MapaPedidoConCadete] Cadete agregado al mapa:', {
        lat: coordsCadete.latitude,
        lng: coordsCadete.longitude
      });
    } else {
      console.warn('⚠️ [MapaPedidoConCadete] Cadete sin coordenadas válidas:', coordsCadete);
    }

    // Agregar destino si existe
    if (coordenadasDestino?.latitude && coordenadasDestino?.longitude) {
      puntos.push({
        latitude: parseFloat(coordenadasDestino.latitude),
        longitude: parseFloat(coordenadasDestino.longitude),
      });
    }

    // Calcular región si hay al menos un punto
    if (puntos.length > 0) {
      const latitudes = puntos.map(p => p.latitude);
      const longitudes = puntos.map(p => p.longitude);

      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const latDelta = (maxLat - minLat) * 1.8; // Padding 80% para mejor vista
      const lngDelta = (maxLng - minLng) * 1.8;

      setRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(latDelta, 0.01), // Mínimo zoom
        longitudeDelta: Math.max(lngDelta, 0.01),
      });

      console.log('✅ [MapaPedidoConCadete] Región calculada:', {
        center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
        puntos: puntos.length
      });
    }

    setLoading(false);
  }, [tienda, cadete, coordenadasDestino]);

  // 🔄 Loading state
  if (!tiendaReady ||  !cadeteReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={styles.loadingText}>Cargando mapa del pedido...</Text>
      </View>
    );
  }

  // ❌ Error state - Sin datos válidos
  if (!region) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="map-marker-off" size={40} color="#F44336" />
        <Text style={styles.errorText}>
          No hay coordenadas disponibles para mostrar el mapa
        </Text>
      </View>
    );
  }

  // 📍 Preparar coordenadas de los marcadores
  const coordsTienda = tienda?.ubicacion || tienda?.coordenadas || tienda?.cordenadas;
  const tiendaMarker = coordsTienda?.latitude && coordsTienda?.longitude 
    ? { latitude: parseFloat(coordsTienda.latitude), longitude: parseFloat(coordsTienda.longitude) }
    : coordsTienda?.latitud && coordsTienda?.longitud
    ? { latitude: parseFloat(coordsTienda.latitud), longitude: parseFloat(coordsTienda.longitud) }
    : null;

  // ✅ CORREGIDO: Usar "cordenadas" en lugar de "ubicacionCadete"
  const cadeteMarker = cadete?.cordenadas?.latitude && cadete?.cordenadas?.longitude
    ? {
        latitude: parseFloat(cadete.cordenadas.latitude),
        longitude: parseFloat(cadete.cordenadas.longitude),
      }
    : null;

  const destinoMarker = coordenadasDestino?.latitude && coordenadasDestino?.longitude
    ? {
        latitude: parseFloat(coordenadasDestino.latitude),
        longitude: parseFloat(coordenadasDestino.longitude),
      }
    : null;

  // 🛣️ Crear polyline de la ruta (tienda → cadete → destino)
  const rutaPuntos = [];
  if (tiendaMarker) rutaPuntos.push(tiendaMarker);
  if (cadeteMarker) rutaPuntos.push(cadeteMarker);
  if (destinoMarker) rutaPuntos.push(destinoMarker);

  return (
    <View style={styles.container}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={true}
        showsScale={true}
        showsIndoors={true}
        customMapStyle={[
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
        ]}
      >
        {/* 🏪 Marcador de Tienda - Personalizado */}
        {tiendaMarker && (
          <Marker
            coordinate={tiendaMarker}
            title={`🏪 ${tienda?.title || tienda?.name || 'Tienda'}`}
            description={tienda?.descripcion || 'Punto de origen'}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.markerCircle, { backgroundColor: '#FF6F00' }]}>
                <MaterialCommunityIcons name="storefront" size={24} color="#fff" />
              </View>
              <View style={styles.markerTriangle} />
            </View>
          </Marker>
        )}

        {/* 🚴 Marcador de Cadete - Personalizado */}
        {cadeteMarker && (
          <Marker
            coordinate={cadeteMarker}
            title={`🚴 ${cadete?.username || 'Cadete'}`}
            description="Posición actual del repartidor"
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.markerCircle, { backgroundColor: '#2196F3' }]}>
                <MaterialCommunityIcons name="bike-fast" size={24} color="#fff" />
              </View>
              <View style={[styles.markerTriangle, { borderTopColor: '#2196F3' }]} />
            </View>
          </Marker>
        )}

        {/* 📍 Marcador de Destino - Personalizado */}
        {destinoMarker && (
          <Marker
            coordinate={destinoMarker}
            title="📍 Destino"
            description="Ubicación de entrega al cliente"
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.markerCircle, { backgroundColor: '#4CAF50' }]}>
                <MaterialCommunityIcons name="home-map-marker" size={24} color="#fff" />
              </View>
              <View style={[styles.markerTriangle, { borderTopColor: '#4CAF50' }]} />
            </View>
          </Marker>
        )}

        {/* 🛣️ Línea de ruta entre puntos */}
        {rutaPuntos.length >= 2 && (
          <Polyline
            coordinates={rutaPuntos}
            strokeColor="#FF6F00"
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      {/* 📊 Leyenda del mapa */}
      <View style={styles.legend}>
        {tiendaMarker && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6F00' }]} />
            <Text style={styles.legendText}>Tienda</Text>
          </View>
        )}
        {cadeteMarker && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Cadete</Text>
          </View>
        )}
        {destinoMarker && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Destino</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    // borderRadius: 12,
    overflow: 'hidden',
    // marginVertical: 12,
    // borderWidth: 2,
    // borderColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginVertical: 12,
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
    fontSize: 14,
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 12,
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  // ✅ Marcadores personalizados unificados
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6F00', // Color por defecto (tienda)
    marginTop: -2,
  },
  // Leyenda
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
});

export default MapaPedidoConCadete;
