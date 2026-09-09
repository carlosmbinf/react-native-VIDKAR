import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import CubaCelCard from "./CubaCelCard.native";

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

const GRID_GAP = 12;
const MIN_COL_WIDTH = 270;
const MAX_COLUMNS = 5;

const Productos = ({
  catalogLoading = true,
  catalogProducts = [],
  deferDelay = 0,
  deferData = true,
  isDegradado = false,
  topBleed = 0,
  variant = "carousel",
}) => {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);

  const deferredDataReady = useDeferredScreenData({
    delay: deferDelay,
    keepReadyOnBlur: true,
  });
  const dataReady = deferData ? deferredDataReady : true;
  const resolvedTopBleed = isDegradado ? Math.max(Number(topBleed) || 0, 0) : 0;
  const gradientColors = isDegradado
    ? getGradientColors(theme.dark)
    : TRANSPARENT_GRADIENT_COLORS;

  const productos = useMemo(
    () => (dataReady && !catalogLoading ? catalogProducts : []),
    [catalogLoading, catalogProducts, dataReady],
  );
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

  const availableWidth = Math.max(
    0,
    (containerWidth || windowWidth) - 24,
  );

  const numColumns = useMemo(() => {
    if (!availableWidth || availableWidth < MIN_COL_WIDTH * 2 + GRID_GAP) {
      return 1;
    }
    const cols = Math.floor(
      (availableWidth + GRID_GAP) / (MIN_COL_WIDTH + GRID_GAP),
    );
    return Math.min(MAX_COLUMNS, Math.max(1, cols));
  }, [availableWidth]);

  const itemWidth = useMemo(() => {
    if (numColumns <= 1) {
      return "100%";
    }
    return Math.floor(
      (availableWidth - (numColumns - 1) * GRID_GAP) / numColumns,
    );
  }, [availableWidth, numColumns]);

  if (variant === "carousel") {
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
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No hay productos de Cubacel disponibles ahora mismo.
            </Text>
          </View>
        ) : (
          <View style={styles.loaderContainer}>
            <ActivityIndicator animating size="large" />
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 12,
              }}
            >
              Cargando Productos de Cubacel...
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  }

  return (
    <View
      onLayout={(event) => {
        const layoutW = event.nativeEvent.layout.width;
        if (layoutW && layoutW !== containerWidth) {
          setContainerWidth(layoutW);
        }
      }}
      style={styles.gridContainer}
    >
      {hasProductos ? (
        <View style={[styles.grid, { gap: GRID_GAP }]}>
          {sortedProductos.map((item) => (
            <View
              key={item._id || item.id}
              style={[
                styles.cardCol,
                {
                  width: numColumns === 1 ? "100%" : itemWidth,
                },
              ]}
            >
              <CubaCelCard fullWidth product={item} />
            </View>
          ))}
        </View>
      ) : ready ? (
        <View style={styles.loaderContainer}>
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            No hay productos de Cubacel disponibles ahora mismo.
          </Text>
        </View>
      ) : (
        <View style={styles.loaderContainer}>
          <ActivityIndicator animating size="large" />
          <Text
            style={[
              styles.loadingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Cargando Productos de Cubacel...
          </Text>
        </View>
      )}
    </View>
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
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    width: "100%",
  },
  grid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    width: "100%",
  },
  cardCol: {
    marginBottom: 0,
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    paddingVertical: 28,
    width: "100%",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
});

export default Productos;
