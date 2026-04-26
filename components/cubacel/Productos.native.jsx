import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { DTShopProductosCollection } from "../collections/collections";
import CubaCelCard from "./CubaCelCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PRODUCTOS_DT_SHOP_FIELDS = {
  "benefits.amount.totalIncludingTax": 1,
  "benefits.type": 1,
  "benefits.unit": 1,
  description: 1,
  id: 1,
  name: 1,
  ocultarFondo: 1,
  "operator.name": 1,
  "prices.retail.amount": 1,
  "promotions.description": 1,
  "promotions.endDate": 1,
  "promotions.startDate": 1,
  "promotions.terms": 1,
  "promotions.title": 1,
};

const getGradientColors = (isDarkMode) => {
  if (isDarkMode) {
    return [
      "rgba(8, 13, 26, 0.98)",
      "rgba(15, 23, 42, 0.9)",
      "rgba(30, 64, 175, 0.34)",
      "rgba(15, 23, 42, 0.16)",
      "rgba(15, 23, 42, 0)",
    ];
  }

  return [
    "rgba(15, 23, 42, 0.96)",
    "rgba(30, 41, 59, 0.84)",
    "rgba(59, 130, 246, 0.24)",
    "rgba(238, 242, 255, 0.54)",
    "rgba(238, 242, 255, 0)",
  ];
};

const GRADIENT_LOCATIONS = [0, 0.32, 0.62, 0.84, 1];

const TRANSPARENT_GRADIENT_COLORS = [
  "rgba(15, 23, 42, 0)",
  "rgba(15, 23, 42, 0)",
];

const Productos = ({ isDegradado = false, topBleed = 0 }) => {
  const theme = useTheme();
  const dataReady = useDeferredScreenData();
  const resolvedTopBleed = isDegradado ? Math.max(Number(topBleed) || 0, 0) : 0;
  const gradientColors = isDegradado
    ? getGradientColors(theme.dark)
    : TRANSPARENT_GRADIENT_COLORS;

  const { productos, ready } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { productos: [], ready: false };
    }

    const handler = Meteor.subscribe(
      "productosDtShop",
      {},
      { fields: PRODUCTOS_DT_SHOP_FIELDS },
    );

    return {
      productos: handler.ready()
        ? DTShopProductosCollection.find({}, { sort: { id: 1 } }).fetch()
        : [],
      ready: handler.ready(),
    };
  }, [dataReady]);

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
      colors={gradientColors}
      locations={isDegradado ? GRADIENT_LOCATIONS : [0, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.gradientContainer,
        isDegradado ? styles.degradedContainer : null,
        resolvedTopBleed
          ? { marginTop: -resolvedTopBleed, paddingTop: resolvedTopBleed }
          : null,
      ]}
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
    minHeight: 214,
    overflow: "visible",
  },
  degradedContainer: {
    paddingBottom: 18,
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
