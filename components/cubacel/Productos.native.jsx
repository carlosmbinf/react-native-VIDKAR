import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

import { DTShopProductosCollection } from "../collections/collections";
import CubaCelCard from "./CubaCelCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const Productos = ({ isDegradado = false }) => {
  const { productos, ready } = Meteor.useTracker(() => {
    const handler = Meteor.subscribe("productosDtShop");

    return {
      productos: handler.ready()
        ? DTShopProductosCollection.find({}, { sort: { id: 1 } }).fetch()
        : [],
      ready: handler.ready(),
    };
  });

  const sortedProductos = useMemo(() => {
    if (!ready || !Array.isArray(productos)) {
      return [];
    }

    const getPrice = (product) => {
      const value = product?.prices?.retail?.amount;
      const numberValue = typeof value === "number" ? value : Number(value);
      return Number.isFinite(numberValue)
        ? numberValue
        : Number.MAX_SAFE_INTEGER;
    };

    const hasPromo = (product) =>
      Array.isArray(product?.promotions) && product.promotions.length > 0;

    return productos.slice().sort((first, second) => {
      const firstPromo = hasPromo(first) ? 0 : 1;
      const secondPromo = hasPromo(second) ? 0 : 1;

      if (firstPromo !== secondPromo) {
        return firstPromo - secondPromo;
      }

      const firstPrice = getPrice(first);
      const secondPrice = getPrice(second);

      if (firstPrice !== secondPrice) {
        return firstPrice - secondPrice;
      }

      const firstId =
        typeof first?.id === "number" ? first.id : Number.MAX_SAFE_INTEGER;
      const secondId =
        typeof second?.id === "number" ? second.id : Number.MAX_SAFE_INTEGER;
      return firstId - secondId;
    });
  }, [productos, ready]);

  return (
    <LinearGradient
      colors={
        isDegradado
          ? ["#0f172a", "transparent"]
          : ["transparent", "transparent"]
      }
      start={{ x: 0.5, y: 0.3 }}
      end={{ x: 0.5, y: 0.8 }}
      style={styles.gradientContainer}
    >
      {Meteor.status().status === "connected" ||
      (ready && sortedProductos.length > 0) ? (
        <FlatList
          data={sortedProductos}
          renderItem={({ item }) => <CubaCelCard product={item} />}
          style={styles.list}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled
          keyExtractor={(item) => item._id}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews
        />
      ) : (
        <View style={styles.loaderContainer}>
          <ActivityIndicator animating size="large" />
          <Text>Cargando Productos de Cubacel...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    minHeight: 190,
  },
  list: {
    minWidth: "100%",
  },
  loaderContainer: {
    alignItems: "center",
    marginTop: 40,
    width: "100%",
  },
});

export default Productos;
