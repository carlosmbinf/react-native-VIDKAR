import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, FlatList } from 'react-native';
import Meteor, { useTracker } from '@meteorrn/core';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import CubaCelCard from './CubaCelCard'; // usa el componente migrado
import { DTShopProductosCollection } from '../collections/collections';
import LinearGradient from 'react-native-linear-gradient';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const flatListRef = React.createRef();
  const {productosActuales, ready} = useTracker(() => {
    const handler = Meteor.subscribe('productosDtShop');
    if (handler.ready()) {
      Meteor.status().status == 'connected' && setProductos(DTShopProductosCollection.find({}, { sort: { id: 1 } }).fetch())
      return { ready:handler.ready() };
    }
    return {};
  });

  // Nueva: lista ordenada (promos primero, luego por precio ascendente)
  const sortedProductos = React.useMemo(() => {
    if (!ready || !Array.isArray(productos)) return [];
    const getPrice = (p) => {
      const v = p?.prices?.retail?.amount;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };
    const hasPromo = (p) => Array.isArray(p?.promotions) && p.promotions.length > 0;

    return productos.slice().sort((a, b) => {
      const ap = hasPromo(a) ? 0 : 1;
      const bp = hasPromo(b) ? 0 : 1;
      if (ap !== bp) return ap - bp; // promos primero
      const pa = getPrice(a);
      const pb = getPrice(b);
      if (pa !== pb) return pa - pb; // precio ascendente
      // desempate estable
      const ai = typeof a?.id === 'number' ? a.id : Number.MAX_SAFE_INTEGER;
      const bi = typeof b?.id === 'number' ? b.id : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }, [ready, productos]);

  // useEffect(() => {
  //   productos && setProductosActuales(productos);
  // }, [productos]);

  return (
          // <ScrollView contentContainerStyle={styles.container}>
          <LinearGradient
            colors={['#3f51b5', 'transparent']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 0.8 }}
            style={styles.gradientContainer}
          >
          
              {Meteor.status().status == 'connected'  || ready && sortedProductos && sortedProductos.length > 0 ? (
                <FlatList
              ref={flatListRef}
              focusable={true}
              accessible={true}
              data={sortedProductos}
              renderItem={({item}) => (
                <CubaCelCard  product={item} />
              )}
              style={{minWidth: '100%'}}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={true}
              keyExtractor={item => item._id} // Asegúrate de tener una key única
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
            />
              ) : (
                  <View style={styles.loaderContainer}>
                      <ActivityIndicator animating={true} size="large" />
                      <Text>Cargando Productos de Cubacel...</Text>
                  </View>
              )}
              </LinearGradient>
          // </ScrollView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    // padding: 8,
    // paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // minHeight: '100%',
    // backgroundColor: "#3f51b5",
  // backgroundColor: 'linear-gradient(to bottom, #3f51b5, transparent)'
  },
  loaderContainer: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%'
  }
});

export default Productos;
