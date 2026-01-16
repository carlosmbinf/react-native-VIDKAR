import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { Button, Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const LocationPicker = ({ initialLocation, onLocationChange }) => {
  const [location, setLocation] = useState(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  // ✅ Verificar y solicitar permisos de ubicación
  const checkLocationPermission = async () => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    });

    try {
      const result = await check(permission);
      
      switch (result) {
        case RESULTS.UNAVAILABLE:
          Alert.alert(
            'Ubicación no disponible',
            'Tu dispositivo no soporta servicios de ubicación'
          );
          return false;
        
        case RESULTS.DENIED:
          const requestResult = await request(permission);
          return requestResult === RESULTS.GRANTED;
        
        case RESULTS.GRANTED:
          return true;
        
        case RESULTS.BLOCKED:
          Alert.alert(
            'Permiso de Ubicación Bloqueado',
            'Por favor, habilita los permisos de ubicación en Configuración de la app.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
            ]
          );
          return false;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('[LocationPicker] Error verificando permisos:', error);
      return false;
    }
  };

  // ✅ Obtener ubicación actual
  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verificar permisos primero
      const hasPermission = await checkLocationPermission();
      
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      // Obtener ubicación con timeout de 15 segundos
      Geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          console.log('[LocationPicker] Ubicación obtenida:', newLocation);
          setLocation(newLocation);
          onLocationChange(newLocation);
          setLoading(false);
        },
        (error) => {
          console.error('[LocationPicker] Error obteniendo ubicación:', error);
          let errorMessage = 'No se pudo obtener la ubicación';
          
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Permiso de ubicación denegado';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Ubicación no disponible. Verifica que el GPS esté activado.';
              break;
            case 3: // TIMEOUT
              errorMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
          Alert.alert('Error', errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } catch (error) {
      console.error('[LocationPicker] Error general:', error);
      setError('Error inesperado al obtener ubicación');
      setLoading(false);
    }
  };

  // ✅ Limpiar ubicación
  const clearLocation = () => {
    Alert.alert(
      '¿Eliminar ubicación?',
      'Tendrás que agregar la ubicación manualmente',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setLocation(null);
            onLocationChange(null);
          }
        }
      ]
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          📍 Ubicación de la Tienda
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#673AB7" />
            <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
          </View>
        ) : location ? (
          <View style={styles.locationContainer}>
            <View style={styles.coordsRow}>
              <Chip icon="map-marker" style={styles.coordChip}>
                Lat: {location.latitude.toFixed(6)}
              </Chip>
              <Chip icon="map-marker" style={styles.coordChip}>
                Lng: {location.longitude.toFixed(6)}
              </Chip>
            </View>
            
            <Text variant="bodySmall" style={styles.hint}>
              💡 Ubicación guardada. Puedes actualizarla si es necesario.
            </Text>

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                icon="refresh"
                onPress={getCurrentLocation}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Actualizar
              </Button>
              <Button
                mode="text"
                icon="delete"
                onPress={clearLocation}
                style={styles.button}
                textColor="#FF5252"
              >
                Eliminar
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No hay ubicación asignada
            </Text>
            {error && (
              <Text variant="bodySmall" style={styles.errorText}>
                {error}
              </Text>
            )}
            <Button
              mode="contained"
              icon="crosshairs-gps"
              onPress={getCurrentLocation}
              style={styles.getPrimaryButton}
            >
              Obtener Ubicación Actual
            </Button>
            <Text variant="bodySmall" style={styles.helperText}>
              Usaremos tu ubicación actual como referencia
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#673AB7',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 12,
    color: '#757575',
  },
  locationContainer: {
    marginTop: 8,
  },
  coordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  coordChip: {
    // backgroundColor: '#F3E5F5',
  },
  hint: {
    color: '#757575',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    flex: 1,
  },
  buttonContent: {
    height: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    color: '#757575',
    marginBottom: 8,
  },
  errorText: {
    color: '#FF5252',
    marginBottom: 12,
    textAlign: 'center',
  },
  getPrimaryButton: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#673AB7',
  },
  helperText: {
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default LocationPicker;
