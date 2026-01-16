import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { FAB, ActivityIndicator, Surface } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { ProductosComercioCollection } from '../../collections/collections';

// ✅ Componentes refactorizados
import TiendaHeader from '../components/TiendaHeader';
import ProductoCard from '../components/ProductoCard';
import EmptyProductos from '../components/EmptyProductos';

const TiendaDetailScreen = ({ tienda, onNavigateToProductoForm, onBack }) => {
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
    onNavigateToProductoForm(producto, tienda._id);
  };

  const renderProductoCard = ({ item }) => (
    <ProductoCard producto={item} onEdit={handleEditProducto} />
  );

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#673AB7" />
      </View>
    );
  }

  return (
    <Surface style={styles.container}>
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

      {/* FAB para agregar producto */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Agregar Producto"
        onPress={() => onNavigateToProductoForm(null, tienda._id)}
      />
    </Surface>
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
