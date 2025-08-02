import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import Meteor, { useTracker } from '@meteorrn/core';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import CubaCelCard from './CubaCelCard'; // usa el componente migrado
import { DTShopProductosCollection } from '../collections/collections';

const Productos = () => {
  const [productosActuales, setProductosActuales] = useState([]);
  let handler;
  const productos = useTracker(() => {
    const handler = Meteor.subscribe('productosDtShop');
    if (handler.ready()) {
      return DTShopProductosCollection.find({}).fetch();
    }
    return null;
  });

  useEffect(() => {
    if (productos) setProductosActuales(productos);
  }, [productos]);

  return (
    <Surface>
          <ScrollView contentContainerStyle={styles.container}>
              {productosActuales && productosActuales.length > 0 ? (
                  productosActuales.map((product, index) => (
                      <CubaCelCard key={index} product={product} />
                  ))
              ) : (
                  <View style={styles.loaderContainer}>
                      <ActivityIndicator animating={true} size="large" />
                      <Text>Cargando productos...</Text>
                  </View>
              )}
          </ScrollView>
    </Surface>
    
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    paddingBottom: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  loaderContainer: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%'
  }
});

export default Productos;
