import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import { FAB, ActivityIndicator, Surface, Appbar, Button, Text } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { ProductosComercioCollection } from '../../collections/collections';

// ✅ Componentes refactorizados
import TiendaHeader from '../components/TiendaHeader';
import ProductoCard from '../components/ProductoCard';
import EmptyProductos from '../components/EmptyProductos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../../Header/MenuHeader';

const TiendaDetailScreen = ({ navigation, route }) => {
  const { tienda } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  // Suscripción a productos de esta tienda
  const { productos, ready } = useTracker(() => {
    const sub = Meteor.subscribe('productosComercio', { idTienda: tienda._id });
    const productos = ProductosComercioCollection.find({ idTienda: tienda._id }).fetch();

    return {
      productos,
      ready: sub.ready()
    };
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleEditProducto = (producto) => {
    handleNavigateToProductoForm(producto);
  };

  const handleNavigateToProductoForm = (producto = null) => {
    navigation.navigate('ProductoForm', {
      producto: producto || { idTienda: tienda._id },
      tienda,
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const renderProductoCard = ({ item }) => (
    <ProductoCard producto={item} onEdit={handleEditProducto} />
  );

  if (!ready) {
    return (
      <Surface style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#673AB7" />
      </Surface>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con botón de retroceso */}

      <Appbar style={{
        // backgroundColor: '#3f51b5',
        height: useSafeAreaInsets().top + 50,
        paddingTop: useSafeAreaInsets().top,
      }}>
        <View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>

            <Appbar.BackAction
              color="red"
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}
            />
            <Text style={{fontSize:22, alignSelf:'center'}}>{tienda?.title || 'Tienda'}</Text>
          </View>
        

          <MenuHeader navigation={navigation} />
        </View>
      </Appbar>
      
        <Surface style={styles.container}>
      <ScrollView>
          {/* Header de tienda */}
          <TiendaHeader tienda={tienda} productosCount={productos.length} />

          {/* Listado de productos o estado vacío */}
          {productos.length === 0 ? (
            <EmptyProductos />
          ) : (
            <FlatList
              data={productos}
              renderItem={renderProductoCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#673AB7']}
                />
              }
            />
          )}
      </ScrollView>
        </Surface>

      {/* ✅ CORREGIDO: FAB flotante para agregar producto */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Agregar Producto"
        onPress={() => handleNavigateToProductoForm()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#673AB7',
  },
});

export default TiendaDetailScreen;
