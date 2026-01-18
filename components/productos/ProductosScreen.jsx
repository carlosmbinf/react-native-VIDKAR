import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Animated, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { 
  Text, Searchbar, FAB, ActivityIndicator, Surface, Chip, Divider, 
  Appbar, Portal, Button
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { TiendasComercioCollection, ProductosComercioCollection } from '../collections/collections';
import TiendaCard from './TiendaCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../Header/MenuHeader';
import Geolocation from '@react-native-community/geolocation';

const ProductosScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchbar, setShowSearchbar] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [tiendasCercanas, setTiendasCercanas] = useState([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [radioKm, setRadioKm] = useState(5); // Radio por defecto: 3km
  const [fabOpen, setFabOpen] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Opciones de radio disponibles
  const radioOptions = [
    { label: '1 km', value: 1, icon: 'map-marker-radius' },
    { label: '3 km', value: 3, icon: 'map-marker-radius' },
    { label: '5 km', value: 5, icon: 'map-marker-radius' },
    { label: '5 km', value: 7, icon: 'map-marker-radius' },
    // { label: '10 km', value: 10, icon: 'map-marker-radius' },
    // { label: '20 km', value: 20, icon: 'map-marker-radius' },
  ];

  // Solicitar permisos de ubicación (Android)
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
    // iOS maneja permisos automáticamente con Info.plist
    return true;
  };

  // Helper para promisificar Meteor.call
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

  // Buscar tiendas cercanas usando el método backend
  const buscarTiendasCercanas = async (coordenadas, radio = radioKm) => {
    if (!coordenadas) {
      console.warn('⚠️ [Tiendas Cercanas] No hay coordenadas disponibles');
      return;
    }

    setLoadingTiendas(true);
    try {
      console.log('🔍 [Tiendas Cercanas] Buscando tiendas en radio de', radio, 'km');
      
      // ✅ Usar helper promisificado
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
        console.log('📋 [Tiendas Cercanas] Tiendas:', resultado.tiendas);
        setTiendasCercanas(resultado.tiendas || []);
      } else {
        console.warn('⚠️ [Tiendas Cercanas] Respuesta sin éxito:', resultado);
        setTiendasCercanas([]);
      }
    } catch (error) {
      console.error('❌ [Tiendas Cercanas] Error al buscar tiendas:', {
        error: error.message,
        reason: error.reason,
        details: error.details
      });
      
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

  // Obtener ubicación del dispositivo
  const obtenerUbicacion = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      console.log('❌ [Ubicación] Permiso denegado por el usuario');
      setLocationError('Permiso de ubicación denegado');
      
      // ✅ Mostrar diálogo para guiar al usuario a configuración
      Alert.alert(
        '📍 Permiso de Ubicación Requerido',
        'Para mostrarte comercios cercanos, necesitamos acceso a tu ubicación. Por favor, activa el permiso de ubicación en la configuración de tu dispositivo.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => console.log('Usuario canceló permisos de ubicación')
          },
          {
            text: 'Ir a Configuración',
            onPress: () => {
              if (Platform.OS === 'ios') {
                // iOS: Abrir configuración de la app
                Linking.openURL('app-settings:');
              } else {
                // Android: Abrir configuración de la app
                Linking.openSettings();
              }
            }
          },
          {
            text: 'Reintentar',
            onPress: () => {
              // Volver a solicitar permisos
              setTimeout(() => obtenerUbicacion(), 500);
            }
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
          accuracy, // Precisión en metros
          altitude, // Altitud (puede ser null)
          timestamp: position.timestamp,
        };
        
        setUserLocation(ubicacion);
        setLocationError(null);
        
        console.log('✅ [Ubicación] Coordenadas obtenidas:', {
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
          precision: `${accuracy.toFixed(0)}m`,
          fecha: new Date(position.timestamp).toLocaleString()
        });

        // Buscar tiendas cercanas automáticamente
        buscarTiendasCercanas(ubicacion, radioKm);
      },
      (error) => {
        console.error('❌ [Ubicación] Error al obtener ubicación:', {
          code: error.code,
          message: error.message
        });
        
        const errorMessages = {
          1: 'Permiso de ubicación denegado',
          2: 'Ubicación no disponible',
          3: 'Tiempo de espera agotado',
        };
        
        const errorMsg = errorMessages[error.code] || 'Error desconocido';
        setLocationError(errorMsg);
        
        // ✅ Si el error es por permisos, ofrecer ir a configuración
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
        } else {
          Alert.alert(
            'Error de Ubicación',
            `${errorMsg}. Las tiendas se mostrarán sin ordenar por distancia.`,
            [{ text: 'OK' }]
          );
        }
      },
      {
        enableHighAccuracy: true, // Usar GPS (más preciso pero consume más batería)
        timeout: 15000, // Timeout de 15 segundos
        maximumAge: 10000, // Aceptar ubicación cacheada de hace máx 10seg
      }
    );
  };

  // Cambiar radio de búsqueda
  const cambiarRadio = (nuevoRadio) => {
    setRadioKm(nuevoRadio);
    // setMenuVisible(false);
    
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

  // Efecto para obtener ubicación al montar
  React.useEffect(() => {
    obtenerUbicacion();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fallback: Obtener todas las tiendas CON productos
  const { tiendasConProductos, loading } = useTracker(() => {
    // const subTiendas = Meteor.subscribe('tiendas', {});
    const subProductos = Meteor.subscribe('productosComercio', {});



    // ✅ Si hay tiendas cercanas, solo cargar productos de esas tiendas
    const tiendasIds = tiendasCercanas.length > 0 
      ? tiendasCercanas.map(t => t._id)
      : null;

    const query = tiendasIds 
      ? { _id: { $in: tiendasIds } }
      : {};

      if (tiendasIds) {
        const subTiendas = Meteor.subscribe('tiendas', query);
        if (!subTiendas.ready() || !subProductos.ready()) {
            return { tiendasConProductos: [], loading: true };
          }
      }else{
        return { tiendasConProductos: [], loading: false };
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
        // ✅ distancia ahora la calcula TiendaCard, no el screen
      };
    }).filter(t => t.totalProductos > 0); // Solo mostrar tiendas con productos

    return { tiendasConProductos, loading: false };
  },[tiendasCercanas]);

  // ✅ Las tiendas ya vienen con productos de useTracker
  const tiendasDisponibles = tiendasConProductos;

  const tiendasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) {
      // ✅ Si hay distancias, ordenar por cercanía
      if (tiendasDisponibles.some(t => t.distancia !== undefined)) {
        return [...tiendasDisponibles].sort((a, b) => {
          // Tiendas con distancia primero, luego por distancia ascendente
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

    // ✅ Ordenar resultados filtrados también por distancia
    if (filtradas.some(t => t.distancia !== undefined)) {
      return filtradas.sort((a, b) => {
        if (a.distancia === undefined) return 1;
        if (b.distancia === undefined) return -1;
        return a.distancia - b.distancia;
      });
    }

    return filtradas;
  }, [tiendasDisponibles, searchQuery]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    obtenerUbicacion(); // Esto automáticamente buscará tiendas cercanas
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [radioKm]);

  if (loading && !refreshing && !loadingTiendas) {
    return (
      <Surface style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Cargando comercios...</Text>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar style={{ backgroundColor: '#3f51b5', height: insets.top + 50, justifyContent: 'center', paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: 'center' }}>
          <View style={{ flexDirection: "row" }}>
           {navigation?.canGoBack() && <Appbar.BackAction
              color='white'
              onPress={() => {
                if (navigation?.canGoBack()) {
                  navigation.goBack();
                }
              }}
            />}
          </View>
          <View style={{ flexDirection: "row", alignItems: 'center' }}>
            <Appbar.Action 
              icon="magnify" 
              color={"white"} 
              onPress={() => {
                setShowSearchbar(!showSearchbar);
                if (!showSearchbar) {
                  setSearchQuery(''); // Limpiar búsqueda al cerrar
                }
              }} 
            />
            <MenuHeader navigation={navigation} />
          </View>
        </View>
      </Appbar>

      {/* Header con búsqueda y filtro de ubicación */}
      {showSearchbar && (
        <View style={styles.header}>
          <Searchbar
            placeholder="Buscar tiendas o productos..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            autoFocus
            blurOnSubmit={false}
            icon="magnify"
            clearIcon="close"
            onIconPress={() => {
              setShowSearchbar(false);
              setSearchQuery('');
            }}
          />

          {searchQuery.trim() && (
            <View style={styles.resultsInfo}>
              <Chip icon="filter-variant" mode="outlined" compact>
                {tiendasFiltradas.length} resultado{tiendasFiltradas.length !== 1 ? 's' : ''}
              </Chip>
            </View>
          )}
        </View>
      )}

      {loadingTiendas && (
        <View style={styles.loadingTiendasContainer}>
          <ActivityIndicator size="small" color="#3f51b5" />
          <Text style={styles.loadingTiendasText}>Buscando tiendas cercanas...</Text>
        </View>
      )}


      {/* Lista de tiendas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
    
      {/* Indicador de ubicación y radio */}
      {userLocation && (
        <View style={styles.locationInfo}>
          <Chip 
            icon="map-marker-check" 
            mode="flat"
            style={styles.locationChip}
            textStyle={{ fontSize: 12 }}
          >
            📍 Mostrando tiendas en {radioKm} km
          </Chip>
          <Chip 
            icon="map" 
            mode="outlined"
            style={styles.countChip}
            textStyle={{ fontSize: 12 }}
          >
            {tiendasDisponibles.length} tienda{tiendasDisponibles.length !== 1 ? 's' : ''}
          </Chip>
        </View>
      )}

        {/* Vamos a agregar Aqui los componentes en estado de productosComercios procesandose */}
    {/* Banner de navegación a Pedidos en Proceso */}
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

        <Animated.View >
          {tiendasFiltradas.length === 0 ? (
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
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {loadingTiendas
                  ? 'Buscando tiendas...'
                  : locationError 
                    ? 'Sin ubicación disponible'
                    : searchQuery.trim() 
                      ? 'No se encontraron resultados' 
                      : userLocation
                        ? `No hay tiendas en ${radioKm} km`
                        : 'Activando ubicación...'}
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                {loadingTiendas
                  ? 'Por favor espera...'
                  : locationError
                    ? `${locationError}. Activa el GPS para ver tiendas cercanas.`
                    : searchQuery.trim() 
                      ? 'Intenta con otros términos de búsqueda' 
                      : userLocation
                        ? 'Intenta aumentar el radio de búsqueda o muévete a otra zona'
                        : 'Obteniendo tu ubicación...'}
              </Text>
            </Surface>
          ) : (
            tiendasFiltradas.map((tienda, index) => (
              <TiendaCard 
                key={tienda._id} 
                tienda={tienda} 
                index={index}
                searchQuery={searchQuery}
                userLocation={userLocation}
              />
            ))
          )}
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB Group con opciones de radio */}
      {/* <Portal> */}
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
          onPress={() => {
            if (fabOpen) {
              // Cerrar el FAB si está abierto
            }
          }}
          fabStyle={styles.fab}
          color={userLocation ? '#fff' : '#999'}
        />
      {/* </Portal> */}
    </Surface>
  );
};

const styles = StyleSheet.create({
  pedidosBannerContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding:20
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  searchbar: {
    elevation: 5,
    borderRadius: 12,
  },
  resultsInfo: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    // backgroundColor: '#f5f5f5',
  },
  locationChip: {
    // backgroundColor: '#e3f2fd',
  },
  countChip: {
    borderColor: '#3f51b5',
  },
  loadingTiendasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    // backgroundColor: '#fff9c4',
  },
  loadingTiendasText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // padding: 16,
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
    // position: 'absolute',
    // margin: 16,
    // right: 0,    bottom: 0,    borderRadius: 30,
    backgroundColor: '#3f51b5',
  },
  selectedMenuItem: {
    backgroundColor: '#e3f2fd',
  },
  selectedMenuText: {
    color: '#3f51b5',
    fontWeight: 'bold',
  },
});

export default ProductosScreen;

