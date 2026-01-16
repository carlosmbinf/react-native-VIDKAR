import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, Text, Chip, IconButton, Menu, Divider } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import ProductoImage from './ProductoImage';

const ProductoCard = ({ producto, onEdit }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      '¿Eliminar producto?',
      'Esta acción no se puede deshacer',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Meteor.call('removeProducto', producto._id, (error) => {
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

  const precioFormateado = `${producto.precio.toFixed(2)} ${producto.monedaPrecio || 'USD'}`;

  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        {/* Imagen del producto */}
        <ProductoImage productoId={producto._id} />

        {/* Información del producto */}
        <View style={styles.info}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
                {producto.name}
              </Text>
              <Text variant="bodySmall" style={styles.descripcion} numberOfLines={2}>
                {producto.descripcion}
              </Text>
            </View>

            {/* Menú de acciones */}
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  onEdit(producto);
                }}
                title="Editar"
                leadingIcon="pencil"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  handleDelete();
                }}
                title="Eliminar"
                leadingIcon="delete"
              />
            </Menu>
          </View>

          {/* Precio y stock */}
          <View style={styles.priceRow}>
            <Text variant="titleLarge" style={styles.precio}>
              {precioFormateado}
            </Text>
            {!producto.porElaborar && (
              <Chip
                mode="flat"
                style={[
                  styles.stockChip,
                  producto.count > 0 ? styles.stockAvailable : styles.stockOut
                ]}
              >
                {producto.count > 0 ? `Stock: ${producto.count}` : 'Sin stock'}
              </Chip>
            )}
            {producto.porElaborar && (
              <Chip mode="flat" style={styles.elaborarChip}>
                Por elaborar
              </Chip>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    // backgroundColor: '#fff',
    borderRadius: 12,
    elevation:10
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descripcion: {
    color: '#666',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  precio: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  stockChip: {
    // height: 28,
  },
  stockAvailable: {
    // backgroundColor: '#E8F5E9',
  },
  stockOut: {
    // backgroundColor: '#FFEBEE',
  },
  elaborarChip: {
    // backgroundColor: '#FFF3E0',
    // height: 28,
  },
});

export default ProductoCard;
