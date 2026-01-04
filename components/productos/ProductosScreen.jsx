import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Animated } from 'react-native';
import { 
  Text, Searchbar, FAB, ActivityIndicator, Surface, Chip, Divider, 
  Appbar
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { TiendasComercioCollection, ProductosComercioCollection } from '../collections/collections';
import TiendaCard from './TiendaCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../Header/MenuHeader';

const ProductosScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchbar, setShowSearchbar] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const { tiendasConProductos, loading } = useTracker(() => {
    const subTiendas = Meteor.subscribe('tiendas', {});
    const subProductos = Meteor.subscribe('productosComercio', {});

    if (!subTiendas.ready() || !subProductos.ready()) {
      return { tiendasConProductos: [], loading: true };
    }

    const tiendas = TiendasComercioCollection.find({}, { sort: { title: 1 } }).fetch();
    
    const tiendasConProductos = tiendas.map(tienda => {
      const productos = ProductosComercioCollection.find(
        { idTienda: tienda._id },
        { sort: { name: 1 } }
      ).fetch();

      return {
        ...tienda,
        productos,
        totalProductos: productos.length,
        productosDisponibles: productos.filter(p => !p.productoDeElaboracion ? p.count > 0 : true).length
      };
    }).filter(t => t.totalProductos > 0); // Solo mostrar tiendas con productos

    return { tiendasConProductos, loading: false };
  });

  const tiendasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return tiendasConProductos;

    const query = searchQuery.toLowerCase();
    return tiendasConProductos.filter(tienda => {
      const matchTienda = tienda.title.toLowerCase().includes(query) ||
                          tienda.descripcion?.toLowerCase().includes(query);
      
      const matchProducto = tienda.productos.some(p => 
        p.name.toLowerCase().includes(query) ||
        p.descripcion?.toLowerCase().includes(query)
      );

      return matchTienda || matchProducto;
    });
  }, [tiendasConProductos, searchQuery]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Meteor subscriptions se refrescan automáticamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  if (loading && !refreshing) {
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
            <Appbar.BackAction
              color='white'
              onPress={() => {
                if (navigation?.navigation?.canGoBack()) {
                  navigation.navigation.goBack();
                }
              }}
            />
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

      {/* Header con búsqueda */}
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

      {/* {!showSearchbar && (
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            🏪 Comercios ({tiendasConProductos.length})
          </Text>
        </View>
      )} */}

      {/* Lista de tiendas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {tiendasFiltradas.length === 0 ? (
            <Surface style={styles.emptyState} elevation={1}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {searchQuery.trim() ? 'No se encontraron resultados' : 'No hay comercios disponibles'}
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                {searchQuery.trim() 
                  ? 'Intenta con otros términos de búsqueda' 
                  : 'Los comercios aparecerán aquí cuando estén disponibles'}
              </Text>
            </Surface>
          ) : (
            tiendasFiltradas.map((tienda, index) => (
              <TiendaCard 
                key={tienda._id} 
                tienda={tienda} 
                index={index}
                searchQuery={searchQuery}
              />
            ))
          )}
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB para filtros futuros */}
      <FAB
        icon="filter-variant"
        style={styles.fab}
        onPress={() => {
          // Placeholder para filtros avanzados
          console.log('Filtros avanzados - Próximamente');
        }}
        label={searchQuery.trim() ? '' : 'Filtros'}
      />
    </Surface>
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
    // padding: 20,
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
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 12,
    elevation:5
  },
  resultsInfo: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
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
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});

export default ProductosScreen;
