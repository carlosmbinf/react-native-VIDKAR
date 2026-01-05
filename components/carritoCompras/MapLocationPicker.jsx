import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert, PermissionsAndroid } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, Chip } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

const MapLocationPicker = ({ onLocationSelect, currentLocation }) => {
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || null);
  const [region, setRegion] = useState({
    latitude: currentLocation?.latitude || -34.9011,
    longitude: currentLocation?.longitude || -56.1645,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0121,
  });

  useEffect(() => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      setRegion({
        ...region,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      setLoading(false);
    } else {
      obtenerUbicacionActual();
    }
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación para Entrega',
            message: 'Necesitamos tu ubicación para coordinar la entrega de tu pedido',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Error solicitando permisos:', err);
        return false;
      }
    }
    return true;
  };

  const obtenerUbicacionActual = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      Alert.alert(
        'Permiso Denegado',
        'Selecciona manualmente tu ubicación en el mapa',
        [{ text: 'OK' }]
      );
      setLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };
        
        setSelectedLocation(newLocation);
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        });
        setLoading(false);
      },
      (error) => {
        console.warn('Error obteniendo ubicación:', error);
        Alert.alert(
          'Error de Ubicación',
          'No se pudo obtener tu ubicación. Selecciona manualmente en el mapa.',
          [{ text: 'OK' }]
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert(
        'Ubicación Requerida',
        'Por favor, toca el mapa para seleccionar tu ubicación de entrega',
        [{ text: 'OK' }]
      );
      return;
    }
    onLocationSelect(selectedLocation);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

return (
    <View style={styles.container}>
        <Surface style={styles.instructionsCard} elevation={2}>
            <Text style={styles.instructionsTitle}>📍 Selecciona tu ubicación de entrega</Text>
            <Text style={styles.instructionsText}>
                Toca el mapa para marcar dónde deseas recibir tu pedido
            </Text>
        </Surface>

        <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : null}
            style={styles.map}
            region={region}
            onPress={handleMapPress}
            // showsUserLocation
            showsMyLocationButton
        >
            {selectedLocation && (
                <Marker
                    coordinate={selectedLocation}
                    title="Ubicación de Entrega"
                    description="Aquí recibirás tu pedido"
                    pinColor="#6200ee"
                />
            )}
        </MapView>

        {selectedLocation && (
            <Surface style={styles.selectedLocationCard} elevation={4}>
                <View style={styles.coordsContainer}>
                    <Chip icon="map-marker" mode="flat" style={styles.chip}>
                        Lat: {selectedLocation.latitude.toFixed(6)}
                    </Chip>
                    <Chip icon="map-marker" mode="flat" style={styles.chip}>
                        Lng: {selectedLocation.longitude.toFixed(6)}
                    </Chip>
                </View>
                <Text style={styles.selectedLocationText}>
                    ✓ Ubicación seleccionada. Toca el mapa para ajustar.
                </Text>
            </Surface>
        )}

        <View style={styles.buttonContainer}>
            <Button
                mode="contained"
                onPress={handleConfirm}
                disabled={!selectedLocation}
                style={styles.confirmButton}
                icon="check"
            >
                Confirmar Ubicación
            </Button>
        </View>
    </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.7,
  },
  instructionsCard: {
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 20,
  },
  map: {
    position:'relative',
    height: 400,
    borderRadius: 30,
  },
  selectedLocationCard: {
    padding: 12,
    // backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 10,
    // marginHorizontal: 16,
    zIndex: 1,
  },
  coordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  chip: {
    // backgroundColor: '#E8EAF6',
  },
  selectedLocationText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    // backgroundColor: '#FFF',
  },
  confirmButton: {
    paddingVertical: 8,
  },
});

export default MapLocationPicker;
