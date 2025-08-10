import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, FlatList } from 'react-native';
import Meteor, { useTracker } from '@meteorrn/core';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import CubaCelCard from './CubaCelCard'; // usa el componente migrado
import { DTShopProductosCollection } from '../collections/collections';

const Productos = () => {
  // const [productosActuales, setProductosActuales] = useState([]);
  const flatListRef = React.createRef();
  const {productos, ready} = useTracker(() => {
    const handler = Meteor.subscribe('productosDtShop');
    if (handler.ready()) {
      return { productos: DTShopProductosCollection.find({}, { sort: { id: 1 } }).fetch(), ready:handler.ready() };
    }
    return {};
  });

  // useEffect(() => {
  //   productos && setProductosActuales(productos);
  // }, [productos]);

  return (
          <ScrollView contentContainerStyle={styles.container}>
          
              {ready && productos && productos.length > 0 ? (
                <FlatList
              ref={flatListRef}
              focusable={true}
              accessible={true}
              data={productos}
              renderItem={({item}) => (
                <CubaCelCard  product={item} />
              )}
              style={{minWidth: '100%'}}
              horizontal={true}
              scrollEnabled={true}
              keyExtractor={item => item._id} // Asegúrate de tener una key única
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
            />
              ) : (
                  <View style={styles.loaderContainer}>
                      <ActivityIndicator animating={true} size="large" />
                      <Text>Cargando productos...</Text>
                  </View>
              )}
          </ScrollView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    // padding: 8,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // minHeight: '100%',
    // backgroundColor: "red",
  },
  loaderContainer: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%'
  }
});

export default Productos;
