import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  FAB,
  Chip,
  IconButton,
  ActivityIndicator,
  Menu,
  Divider,
  Avatar,
} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { ProductosComercioCollection } from '../../collections/collections';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TiendaDetailScreen = ({ tienda, onNavigateToProductoForm, onBack }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState({});

  // ✅ Suscripción a productos de esta tienda
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

  const handleDeleteProducto = (productoId) => {
    Alert.alert(
      '¿Eliminar producto?',
      'Esta acción no se puede deshacer',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Meteor.call('removeProducto', productoId, (error) => {
              if (error) {
                Alert.alert('Error', error.reason || 'No se pudo eliminar');
              } else {
                Alert.alert('Éxito', 'Producto eliminado');
              }
            });
          }
        }
      ]
    );
  };

  const renderProductoCard = ({ item: producto }) => {
    return (
      <Card style={styles.productoCard}>
        <Card.Content>
          <View style={styles.productoHeader}>
            <View style={styles.productoInfo}>
              <Text variant="titleMedium" style={styles.productoTitle}>
                {producto.name}
              </Text>
              <Text variant="bodySmall" style={styles.productoDesc} numberOfLines={2}>
                {producto.descripcion}
              </Text>
            </View>

            <Menu
              visible={menuVisible[producto._id]}
              onDismiss={() => setMenuVisible({ ...menuVisible, [producto._id]: false })}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible({ ...menuVisible, [producto._id]: true })}
                />
              }
            >
              <Menu.Item
                leadingIcon="pencil"
                onPress={() => {
                  setMenuVisible({ ...menuVisible, [producto._id]: false });
                  onNavigateToProductoForm(producto, tienda._id);
                }}
                title="Editar"
              />
              <Divider />
              <Menu.Item
                leadingIcon="delete"
                onPress={() => {
                  setMenuVisible({ ...menuVisible, [producto._id]: false });
                  handleDeleteProducto(producto._id);
                }}
                title="Eliminar"
                titleStyle={{ color: '#FF5252' }}
              />
            </Menu>
          </View>

          <View style={styles.chipsRow}>
            <Chip
              icon="currency-usd"
              style={styles.chipPrecio}
              textStyle={styles.chipPrecioText}
            >
              ${producto.precio}
            </Chip>
            {!producto.productoDeElaboracion && (
              <Chip
                icon="package-variant"
                style={producto.count > 0 ? styles.chipStock : styles.chipSinStock}
                textStyle={styles.chipText}
              >
                Stock: {producto.count}
              </Chip>
            )}
            {producto.productoDeElaboracion && (
              <Chip
                icon="chef-hat"
                style={styles.chipElaboracion}
                textStyle={styles.chipText}
              >
                Elaboración
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#673AB7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ Header de tienda */}
      <Card style={styles.tiendaInfoCard}>
        <Card.Content>
          <View style={styles.tiendaHeaderRow}>
            <Avatar.Icon size={56} icon="store" style={{ backgroundColor: tienda.pinColor }} />
            <View style={styles.tiendaDetails}>
              <Text variant="headlineSmall" style={styles.tiendaNombre}>
                {tienda.title}
              </Text>
              <Text variant="bodyMedium" style={styles.tiendaDesc}>
                {tienda.descripcion || 'Sin descripción'}
              </Text>
              <Chip
                icon="package-variant"
                style={styles.chipProductos}
                textStyle={styles.chipText}
              >
                {productos.length} productos
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* ✅ Listado de productos */}
      {productos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Avatar.Icon size={80} icon="cart-off" style={styles.emptyIcon} />
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No hay productos
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            Agrega productos a tu tienda
          </Text>
        </View>
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

      <FAB
        style={styles.fab}
        icon="plus"
        label="Agregar Producto"
        onPress={() => onNavigateToProductoForm(null, tienda._id)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiendaInfoCard: {
    margin: 16,
    elevation: 2,
    borderRadius: 12,
  },
  tiendaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tiendaDetails: {
    flex: 1,
    marginLeft: 16,
  },
  tiendaNombre: {
    fontWeight: 'bold',
    color: '#212121',
  },
  tiendaDesc: {
    color: '#757575',
    marginTop: 4,
  },
  chipProductos: {
    height: 30,
    marginTop: 8,
    // backgroundColor: '#F3E5F5',
    alignSelf: 'flex-start',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  productoCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  productoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productoInfo: {
    flex: 1,
  },
  productoTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  productoDesc: {
    color: '#757575',
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  chipPrecio: {
    // backgroundColor: '#E8F5E9',
  },
  chipPrecioText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  chipStock: {
    // backgroundColor: '#E3F2FD',
  },
  chipSinStock: {
    // backgroundColor: '#FFEBEE',
  },
  chipElaboracion: {
    // backgroundColor: '#FFF3E0',
  },
  chipText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    backgroundColor: '#E1BEE7',
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#757575',
    textAlign: 'center',
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
