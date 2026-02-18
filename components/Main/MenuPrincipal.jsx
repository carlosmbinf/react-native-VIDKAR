import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
  FlatList,
  Animated,
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Card, Title, Text, Button, TextInput, Switch, Surface, IconButton, Avatar, Appbar, List, Searchbar, FAB, Chip, Divider } from 'react-native-paper';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native';
import Drawer from 'react-native-drawer';
import { PreciosCollection, Logs, VentasCollection, TiendasComercioCollection, ProductosComercioCollection } from '../collections/collections';
import DrawerOptionsAlls from '../drawer/DrawerOptionsAlls';
import Productos from '../cubacel/Productos';
import MainPelis from '../pelis/MainPelis';
import ProxyVPNPackagesHorizontal from '../proxyVPN/ProxyVPNPackagesHorizontal';
import { BlurView } from '@react-native-community/blur';
import MenuHeader from '../Header/MenuHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import TiendaCard from '../productos/TiendaCard';

const axios = require('axios').default;

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const MenuPrincipal = ({ navigation }) => {
  
  const moment = require('moment');
  const insets = useSafeAreaInsets();
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchbar, setShowSearchbar] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [tiendasCercanas, setTiendasCercanas] = useState([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [radioKm, setRadioKm] = useState(5);
  const [fabOpen, setFabOpen] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const isDarkMode = useColorScheme() === 'dark';

  const { user, ready } = useTracker(() => {
    const handler = Meteor.subscribe('userID', {_id:Meteor.userId()});
    if (handler.ready()) {
      return { user: Meteor.user(), ready: handler.ready() };
    }
    return {};
  });

  const radioOptions = [
    ...((__DEV__) ? [{ label: '0.001 km', value: 0.001, icon: 'map-marker-radius' }] : []),
    { label: '1 km', value: 1, icon: 'map-marker-radius' },
    { label: '3 km', value: 3, icon: 'map-marker-radius' },
    { label: '5 km', value: 5, icon: 'map-marker-radius' },
    { label: '7 km', value: 7, icon: 'map-marker-radius' },
  ];

  useEffect(() => {
    Geolocation.setRNConfiguration(
      {
        // skipPermissionRequests: true,
        authorizationLevel: 'always',
        enableBackgroundLocationUpdates: true,
        locationProvider: 'android' 
      }
    )
  },[])
  const meteorCallAsync = (methodName, ...args) => {
    return new Promise((resolve, reject) => {
      Meteor.call(methodName, ...args, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación',
            message: 'Esta app necesita acceso a tu ubicación para mostrar comercios cercanos',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('❌ [Ubicación] Error al solicitar permisos:', err);
        return false;
      }
    }
    return true;
  };

  const actualizarUbicacionBackend = (ubicacion) => {
    const userId = Meteor.userId();
    console.log("ubicacion",ubicacion)
    if (!userId || !ubicacion) {
      console.log('⚠️ [Backend] No se puede actualizar ubicación: usuario no autenticado o ubicación no disponible');
      return;
    }

    console.log('📡 [Backend] Enviando ubicación al servidor...');
    
    Meteor.call('cadete.updateLocation', {
      userId,
      cordenadas: {
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        accuracy: ubicacion.accuracy,
        altitude: ubicacion.altitude || null,
        timestamp: ubicacion.timestamp
      }
    }, (error, result) => {
      if (error) {
        console.warn('⚠️ [Backend] Error al actualizar ubicación:', error.reason || error.message);
      } else {
        console.log('✅ [Backend] Ubicación actualizada correctamente en servidor');
      }
    });
  };

  const buscarTiendasCercanas = async (coordenadas, radio = radioKm) => {
    if (!coordenadas) {
      console.warn('⚠️ [Tiendas Cercanas] No hay coordenadas disponibles');
      return;
    }

    setLoadingTiendas(true);
    try {
      console.log('🔍 [Tiendas Cercanas] Buscando tiendas en radio de', radio, 'km');
      
      const resultado = await meteorCallAsync(
        'comercio.getTiendasCercanas',
        {
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude
        },
        radio
      );

      if (resultado?.success) {
        console.log(`✅ [Tiendas Cercanas] ${resultado.total} tiendas encontradas`);
        setTiendasCercanas(resultado.tiendas || []);
      } else {
        console.warn('⚠️ [Tiendas Cercanas] Respuesta sin éxito:', resultado);
        setTiendasCercanas([]);
      }
    } catch (error) {
      console.error('❌ [Tiendas Cercanas] Error al buscar tiendas:', error);
      Alert.alert(
        'Error al buscar tiendas',
        error.reason || 'No se pudieron cargar las tiendas cercanas. Por favor, intenta de nuevo.',
        [{ text: 'OK' }]
      );
      setTiendasCercanas([]);
    } finally {
      setLoadingTiendas(false);
    }
  };

  const obtenerUbicacion = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      console.log('❌ [Ubicación] Permiso denegado por el usuario');
      setLocationError('Permiso de ubicación denegado');
      
      Alert.alert(
        '📍 Permiso de Ubicación Requerido',
        'Para mostrarte comercios cercanos, necesitamos acceso a tu ubicación. Por favor, activa el permiso de ubicación en la configuración de tu dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ir a Configuración',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          },
          {
            text: 'Reintentar',
            onPress: () => setTimeout(() => obtenerUbicacion(), 500)
          }
        ]
      );
      return;
    }

    console.log('📍 [Ubicación] Obteniendo coordenadas del dispositivo...');
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude } = position.coords;
        const ubicacion = {
          latitude,
          longitude,
          accuracy,
          altitude,
          timestamp: position.timestamp,
        };
        
        setUserLocation(ubicacion);
        setLocationError(null);
        
        console.log('✅ [Ubicación] Coordenadas obtenidas:', {
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
          precision: `${accuracy.toFixed(0)}m`,
        });

        actualizarUbicacionBackend(ubicacion);

        buscarTiendasCercanas(ubicacion, radioKm);
      },
      (error) => {
        console.error('❌ [Ubicación] Error al obtener ubicación:', error);
        
        const errorMessages = {
          1: 'Permiso de ubicación denegado',
          2: 'Ubicación no disponible',
          3: 'Tiempo de espera agotado',
        };
        
        const errorMsg = errorMessages[error.code] || 'Error desconocido';
        setLocationError(errorMsg);
        
        if (error.code === 1) {
          Alert.alert(
            'Permiso de Ubicación Denegado',
            'Los permisos de ubicación están desactivados. Para ver comercios cercanos, necesitas activarlos en la configuración.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abrir Configuración',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }
              }
            ]
          );
        }
      },
      {
        interval: 60000,
        // useSignificantChanges: true,
        // distanceFilter: 0,
        enableHighAccuracy: true,
        // timeout: 30000,
        maximumAge: 45000,
      }
    );
  };

  const cambiarRadio = (nuevoRadio) => {
    setRadioKm(nuevoRadio);
    
    if (userLocation) {
      buscarTiendasCercanas(userLocation, nuevoRadio);
    } else {
      Alert.alert(
        'Ubicación no disponible',
        'Primero necesitamos obtener tu ubicación. Por favor, activa el GPS.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Obtener Ubicación', onPress: obtenerUbicacion }
        ]
      );
    }
  };

  // ✅ Efecto para obtener ubicación inicial (solo una vez)
  useEffect(() => {
    obtenerUbicacion();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []); // ✅ Array vacío: solo ejecuta al montar

  // ✅ Efecto separado para el intervalo de actualización
  useEffect(() => {
    // No crear intervalo si no hay ubicación aún
    if (!userLocation) {
      console.log('⏸️ [Auto-refresh] Esperando ubicación inicial...');
      return;
    }

    console.log(`🔄 [Auto-refresh] Iniciando actualización automática cada 60s con radio de ${radioKm}km`);

    // ✅ Intervalo para actualizar tiendas cada 60 segundos
    const interval = setInterval(() => {
      console.log('🔄 [Auto-refresh] Actualizando tiendas cercanas...');
      // ✅ Enviar ubicación actualizada al backend
      actualizarUbicacionBackend(userLocation);
      // ✅ Usar los valores actuales del state via closure
      buscarTiendasCercanas(userLocation, radioKm);
    }, 60000); // 60 segundos

    // ✅ Cleanup: limpiar intervalo al desmontar o cambiar dependencias
    return () => {
      clearInterval(interval);
      console.log('🧹 [Cleanup] Intervalo de actualización de tiendas limpiado');
    };
  }, [radioKm]); // ✅ Solo depender de radioKm, NO de userLocation

  const { tiendasConProductos, loadingProductos } = useTracker(() => {
    const subProductos = Meteor.subscribe('productosComercio', {});

    const tiendasIds = tiendasCercanas.length > 0 
      ? tiendasCercanas.map(t => t._id)
      : null;

    const query = tiendasIds 
      ? { _id: { $in: tiendasIds } }
      : {};

    if (tiendasIds) {
      const subTiendas = Meteor.subscribe('tiendas', query);
      if (!subTiendas.ready() || !subProductos.ready()) {
        return { tiendasConProductos: [], loadingProductos: true };
      }
    } else {
      return { tiendasConProductos: [], loadingProductos: false };
    }
    
    const tiendas = tiendasIds && TiendasComercioCollection.find(query, { 
      sort: { title: 1 } 
    }).fetch();
    
    const tiendasConProductos = tiendas?.map(tienda => {
      const productos = ProductosComercioCollection.find(
        { idTienda: tienda._id },
        { sort: { name: 1 } }
      ).fetch();

      return {
        ...tienda,
        productos,
        totalProductos: productos.length,
        productosDisponibles: productos.filter(p => 
          !p.productoDeElaboracion ? p.count > 0 : true
        ).length,
      };
    }).filter(t => t.totalProductos > 0);

    return { tiendasConProductos, loadingProductos: false };
  }, [tiendasCercanas]);

  const tiendasFiltradas = useMemo(() => {
    const tiendasDisponibles = tiendasConProductos || [];
    
    if (!searchQuery.trim()) {
      if (tiendasDisponibles.some(t => t.distancia !== undefined)) {
        return [...tiendasDisponibles].sort((a, b) => {
          if (a.distancia === undefined) return 1;
          if (b.distancia === undefined) return -1;
          return a.distancia - b.distancia;
        });
      }
      return tiendasDisponibles;
    }

    const query = searchQuery.toLowerCase();
    const filtradas = tiendasDisponibles.filter(tienda => {
      const matchTienda = tienda.title?.toLowerCase().includes(query) ||
                          tienda.descripcion?.toLowerCase().includes(query);
      
      const matchProducto = tienda.productos?.some(p => 
        p.name?.toLowerCase().includes(query) ||
        p.descripcion?.toLowerCase().includes(query)
      );

      return matchTienda || matchProducto;
    });

    if (filtradas.some(t => t.distancia !== undefined)) {
      return filtradas.sort((a, b) => {
        if (a.distancia === undefined) return 1;
        if (b.distancia === undefined) return -1;
        return a.distancia - b.distancia;
      });
    }

    return filtradas;
  }, [tiendasConProductos, searchQuery]);

  const ListHeaderComponent = useMemo(() => (
    <>
      {/* {loadingTiendas && (
        <View style={styles.loadingTiendasContainer}>
          <ActivityIndicator size="small" color="#3f51b5" />
          <Text style={styles.loadingTiendasText}>Buscando tiendas cercanas...</Text>
        </View>
      )} */}

      {userLocation && (
        <View style={styles.locationInfo}>
          <Chip
            icon={loadingTiendas ? "update":"map-marker-check" }
            mode="flat"
            style={styles.locationChip}
            textStyle={{ fontSize: 12 }}
          >
            {loadingTiendas ? `Buscando tiendas cercanas...` : `📍 Mostrando tiendas en ${radioKm} km`}
          </Chip>
          <Chip 
            icon="map" 
            mode="outlined"
            style={styles.countChip}
            textStyle={{ fontSize: 12 }}
          >
            {tiendasConProductos?.length || 0} tienda{(tiendasConProductos?.length || 0) !== 1 ? 's' : ''}
          </Chip>
        </View>
      )}

      <View style={styles.pedidosBannerContent}>
        <Button
          mode="outlined"
          icon="arrow-right"
          onPress={() => navigation.navigate('PedidosComerciosList')}
          style={styles.pedidosBannerButton}
          contentStyle={styles.pedidosBannerButtonContent}
          labelStyle={styles.pedidosBannerButtonLabel}
        >
          Ver listado de compras
        </Button>
      </View>
    </>
  ), [loadingTiendas, userLocation, radioKm, tiendasConProductos]);

  const ListEmptyComponent = useMemo(() => (
    <Surface style={styles.emptyState} elevation={1}>
      <Text style={styles.emptyIcon}>
        {loadingTiendas 
          ? '⏳' 
          : locationError 
            ? '📍' 
            : searchQuery.trim()
              ? '🔍'
              : '🏪'}
      </Text>
      <Title style={styles.emptyTitle}>
        {loadingTiendas
          ? 'Buscando tiendas...'
          : locationError 
            ? 'Sin ubicación disponible'
            : searchQuery.trim() 
              ? 'No se encontraron resultados' 
              : userLocation
                ? `No hay tiendas en ${radioKm} km`
                : 'Activando ubicación...'}
      </Title>
      <Text style={styles.emptySubtitle}>
        {loadingTiendas
          ? 'Por favor espera...'
          : locationError
            ? `${locationError}. Activa el GPS para ver tiendas cercanas.`
            : searchQuery.trim() 
              ? 'Intenta con otros términos de búsqueda' 
              : userLocation
                ? 'Intenta aumentar el radio de búsqueda'
                : 'Obteniendo tu ubicación...'}
      </Text>
    </Surface>
  ), [loadingTiendas, locationError, searchQuery, userLocation, radioKm]);

  const renderTiendaItem = ({ item, index }) => (
    <TiendaCard 
      tienda={item} 
      index={index}
      searchQuery={searchQuery}
      userLocation={userLocation}
    />
  );

  const keyExtractor = (item) => item._id;

  const ListFooterComponent = null;

  const drawerStyles = {
    drawer: { shadowColor: 'black', shadowOpacity: 0, shadowRadius: 3},
    main: { paddingLeft: 0},
  };

  return (
      <Drawer
        type="overlay"
        open={drawer}
        content={<DrawerOptionsAlls navigation={{ navigation }} />}
        tapToClose={true}
        onClose={() => setDrawer(false)}
        elevation={2}
        side="left"
        openDrawerOffset={0.2}
        panCloseMask={0.2}
        closedDrawerOffset={0}
        styles={drawerStyles}
        tweenHandler={(ratio) => ({
          main: { opacity: ((2 - ratio) / 2) }
        })}
      >
        <Appbar style={{ backgroundColor: '#3f51b5', height:insets.top + 50, justifyContent:'center', paddingTop: insets.top }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Appbar.Action icon="menu" color={"white"} onPress={() => setDrawer(!drawer)} />
                <MenuHeader navigation={navigation} />
          </View>
        </Appbar>

        <Surface style={{ height: "100%", paddingBottom: insets.bottom + 75, elevation: 0 }}>
          <View style={{ flex: 1 }}>
            <ScrollView
              style={styles.container}
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
            >
              <View style={{padding: 10, backgroundColor:'#3f51b5'}} >
                <Text>Bienvenido al menú principal de la aplicación.</Text>
              </View>
              <Productos />
              {ready && user?.subscipcionPelis &&
                <MainPelis
                  navigation={{ navigationGeneral: navigation }}
                  clasificacion="All"
                />
              }
              <ProxyVPNPackagesHorizontal navigation={navigation} />
            
            <View style={styles.tiendasSection}>
              <FlatList
                data={tiendasFiltradas}
                renderItem={renderTiendaItem}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={ListEmptyComponent}
                ListFooterComponent={ListFooterComponent}
                contentContainerStyle={styles.flatListContent}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
              />
            </View>
            </ScrollView>


          </View>
        </Surface>
            <FAB.Group
              open={fabOpen}
              visible
              icon={userLocation ? "map-marker-radius" : "map-marker-off"}
              label={userLocation ? `${radioKm} km` : ''}
              actions={radioOptions.map((option) => ({
                icon: option.icon,
                label: option.label,
                onPress: () => cambiarRadio(option.value),
                style: radioKm === option.value ? { backgroundColor: '#e3f2fd' } : undefined,
                labelStyle: radioKm === option.value ? { color: '#3f51b5', fontWeight: 'bold' } : undefined,
                small: false,
              }))}
              onStateChange={({ open }) => setFabOpen(open)}
              fabStyle={styles.fab}
              color={userLocation ? '#fff' : '#999'}
            />
      </Drawer>
  );
};

export default MenuPrincipal;

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    paddingBottom:80
  },
  tiendasSection: {
    flex: 1,
    paddingBottom: 40,
  },
  searchbarInline: {
    flex: 1,
    marginHorizontal: 8,
    height: 40,
    elevation: 0,
  },
  loadingTiendasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingTiendasText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  locationInfo: {
    flexDirection: 'row',
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationChip: {},
  countChip: {
    borderColor: '#3f51b5',
  },
  pedidosBannerContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  flatListContent: {
    flexGrow: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 20,
    marginHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  fab: {
    backgroundColor: '#3f51b5',
  },
});
