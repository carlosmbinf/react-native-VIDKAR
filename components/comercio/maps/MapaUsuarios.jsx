import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import Meteor, { useTracker } from '@meteorrn/core';

const MapaUsuarios = ({ initialRegion, filtroRol = 'todos' }) => {
  const [region, setRegion] = useState(null);

  // Suscripción a usuarios con coordenadas
  const { usuarios, loading } = useTracker(() => {
    const handle = Meteor.subscribe('usuarios.conCoordenadas');
    
    let query = { 
      $or: [
        { 'cordenadas.latitude': { $exists: true } },
        { 'coordenadas.latitude': { $exists: true } }
      ]
    };

    // Aplicar filtro por rol
    if (filtroRol === 'cadetes') {
      query.modoCadete = true;
    } else if (filtroRol === 'admins') {
      query['profile.role'] = 'admin';
    } else if (filtroRol === 'empresas') {
      query['profile.roleComercio'] = { $in: ['EMPRESA'] };
    }
    
    const users = Meteor.users.find(
      query,
      { 
        fields: { 
          _id: 1,
          username: 1,
          'profile.name': 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          'profile.role': 1,
          'profile.roleComercio': 1,
          cordenadas: 1,
          coordenadas: 1,
          online: 1,
          modoCadete: 1,
          picture: 1
        }
      }
    ).fetch();
    console.log("users",users);
    return {
      usuarios: users,
      loading: !handle.ready()
    };
  }, [filtroRol]);

  useEffect(() => {
    if (initialRegion) {
      setRegion(initialRegion);
    } else if (usuarios.length > 0) {
      // Calcular región que abarque todos los usuarios
      const coords = usuarios
        .map(u => u.cordenadas || u.coordenadas)
        .filter(c => c?.latitude && c?.longitude);

      if (coords.length > 0) {
        const latitudes = coords.map(c => c.latitude);
        const longitudes = coords.map(c => c.longitude);

        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const latDelta = (maxLat - minLat) * 1.5 || 0.05;
        const lngDelta = (maxLng - minLng) * 1.5 || 0.05;

        setRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        });
      }
    }
  }, [usuarios, initialRegion]);

  const getMarkerIcon = (usuario) => {
    // Iconos según rol y estado
    if (usuario.modoCadete) {
      return require('./pin_shop_50x50.png'); // Crear este ícono para cadete
    }
    if (usuario.profile?.roleComercio?.includes('EMPRESA')) {
      return require('./pin_shop_50x50.png');
    }
    if (usuario.profile?.role === 'admin') {
      return require('./pin_shop_50x50.png'); // Crear este ícono para admin
    }
    return require('./pin_shop_50x50.png'); // Crear este ícono para user
  };

  const getMarkerColor = (usuario) => {
    if (usuario.online) return '#4CAF50'; // Verde online
    if (usuario.modoCadete) return '#FF9800'; // Naranja cadete
    return '#757575'; // Gris offline
  };

  const getUserTitle = (usuario) => {
    const emoji = usuario.modoCadete ? '🚴' : 
                  usuario.profile?.role === 'admin' ? '👨‍💼' : '👤';
    const name = usuario.profile?.name || 
           `${usuario.profile?.firstName || ''} ${usuario.profile?.lastName || ''}`.trim() ||
           'Usuario';
    const displayName = usuario.username ? `${name} - ${usuario.username}` : name;
    const statusEmoji = usuario.online ? '🟢' : '⚪';
    return `${emoji} ${displayName} ${statusEmoji}`;
  };

  // if (loading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <Text>Cargando mapa de usuarios...</Text>
  //     </View>
  //   );
  // }

  if (!region) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📍 No hay usuarios con ubicación disponible</Text>
        {filtroRol !== 'todos' && (
          <Text style={styles.emptySubtext}>
            Prueba cambiar el filtro a "Todos"
          </Text>
        )}
      </View>
    );
  }

  return (
    <MapView
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={region}
    //   showsUserLocation={true}
      showsMyLocationButton={true}
      liteMode={false}
      showsScale={true}
      showsCompass={true}
      customMapStyle={[
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }],
        },
      ]}
    >
      {usuarios.map((usuario) => {
        const coords = usuario.cordenadas || usuario.coordenadas;
        
        if (!coords?.latitude || !coords?.longitude) return null;
        console.log("coords",coords);
        return (
          <Marker
            key={usuario._id}
            coordinate={{
              latitude: coords.latitude,
              longitude: coords.longitude,
            }}
            title={getUserTitle(usuario)}
            description={`Rol: ${usuario.profile?.role || 'usuario'} | Última actualización: ${new Date(coords.timestamp || Date.now()).toLocaleString('es-ES')}`}
            pinColor={getMarkerColor(usuario)}
            // image={getMarkerIcon(usuario)} // Descomentar cuando existan todos los íconos
            image={require('./pin_goal_50x50.png')}
            anchor={{ x: 0.5, y: 1 }}
          />
        );
      })}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default MapaUsuarios;
