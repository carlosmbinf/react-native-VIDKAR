import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import CubaCelCard from "./CubaCelCard";

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

const Productos = ({
  catalogLoading = true,
  catalogProducts = [],
  deferDelay = 0,
  deferData = true,
  isDegradado = false,
  topBleed = 0,
}) => {
  const theme = useTheme();
  const deferredDataReady = useDeferredScreenData({
    delay: deferDelay,
    keepReadyOnBlur: true,
  });
  const dataReady = deferData ? deferredDataReady : true;
  const resolvedTopBleed = isDegradado ? Math.max(Number(topBleed) || 0, 0) : 0;
  const gradientColors = isDegradado
    ? getGradientColors(theme.dark)
    : TRANSPARENT_GRADIENT_COLORS;

  const productos = dataReady && !catalogLoading ? catalogProducts : [];
  const ready = dataReady && !catalogLoading;

  const sortedProductos = useMemo(() => {
    if (!Array.isArray(productos) || productos.length === 0) {
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
  }, [productos]);

  const hasProductos = sortedProductos.length > 0;

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
      {hasProductos ? (
        <FlatList
          data={sortedProductos}
          renderItem={({ item }) => <CubaCelCard product={item} />}
          style={styles.list}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled
          keyExtractor={(item) => item._id}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          removeClippedSubviews
          updateCellsBatchingPeriod={80}
          windowSize={3}
        />
      ) : ready ? (
        <View style={styles.loaderContainer}>
          <Text>No hay productos de Cubacel disponibles ahora mismo.</Text>
        </View>
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
    minHeight: 214,
    marginTop: 40,
    width: "100%",
  },
});

export default Productos;
