import MeteorBase from "@meteorrn/core";
import React, { useEffect, useState } from "react";
import {
    Animated,
    FlatList,
    LayoutAnimation,
    Platform,
    StyleSheet,
    UIManager,
    View,
} from "react-native";
import { Card, Chip, Divider, IconButton, Text } from "react-native-paper";

import ProductoCard from "./ProductoCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TiendaCardNative = ({ tienda, searchQuery, userLocation }) => {
  const [expanded, setExpanded] = useState(true);
  const [distanciaKm, setDistanciaKm] = useState(
    typeof tienda?.distancia === "number" ? tienda.distancia : null,
  );
  const [loadingDistancia, setLoadingDistancia] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    const lat1 = userLocation?.latitude;
    const lon1 = userLocation?.longitude;
    const lat2 = tienda?.coordenadas?.latitude;
    const lon2 = tienda?.coordenadas?.longitude;
    const faltanDatos =
      typeof lat1 !== "number" ||
      typeof lon1 !== "number" ||
      typeof lat2 !== "number" ||
      typeof lon2 !== "number";

    if (faltanDatos) {
      setDistanciaKm(null);
      return () => {
        cancelled = true;
      };
    }

    if (typeof distanciaKm === "number") {
      return () => {
        cancelled = true;
      };
    }

    setLoadingDistancia(true);

    Meteor.call(
      "calcularDistancia",
      lat1,
      lon1,
      lat2,
      lon2,
      (error, result) => {
        if (cancelled) return;

        setLoadingDistancia(false);

        if (error) {
          console.warn(
            "[TiendaCard] Error calculando distancia:",
            error?.reason || error?.message,
          );
          setDistanciaKm(null);
          return;
        }

        if (typeof result === "number" && Number.isFinite(result)) {
          setDistanciaKm(result);
        } else {
          setDistanciaKm(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    distanciaKm,
    tienda?._id,
    tienda?.coordenadas?.latitude,
    tienda?.coordenadas?.longitude,
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => !current);

    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const distanciaLabel = (() => {
    if (!tienda?.coordenadas) return "N/A";
    if (loadingDistancia) return "Calculando...";
    if (typeof distanciaKm !== "number" || !Number.isFinite(distanciaKm)) {
      return "N/A";
    }

    return distanciaKm < 1
      ? `${Math.round(distanciaKm * 1000)}m`
      : `${distanciaKm.toFixed(1)}km`;
  })();

  return (
    <View style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                style={styles.tiendaTitle}
                variant="titleLarge"
              >
                {tienda.title}
              </Text>
              {tienda.pinColor ? (
                <View
                  style={[
                    styles.colorPin,
                    { backgroundColor: tienda.pinColor },
                  ]}
                />
              ) : null}
            </View>

            {tienda.descripcion ? (
              <Text
                numberOfLines={expanded ? undefined : 2}
                style={styles.descripcion}
                variant="bodySmall"
              >
                {tienda.descripcion}
              </Text>
            ) : null}

            <View style={styles.chipsRow}>
              <Chip compact mode="flat" textStyle={styles.chipText}>
                {tienda.totalProductos} producto
                {tienda.totalProductos !== 1 ? "s" : ""}
              </Chip>

              {tienda.productosDisponibles < tienda.totalProductos ? (
                <Chip
                  compact
                  icon="alert-circle-outline"
                  mode="flat"
                  style={[styles.chip, styles.chipWarning]}
                  textStyle={styles.chipText}
                >
                  {tienda.productosDisponibles} disponible
                  {tienda.productosDisponibles !== 1 ? "s" : ""}
                </Chip>
              ) : null}

              {tienda.coordenadas ? (
                <Chip
                  compact
                  icon="map-marker"
                  mode="flat"
                  textStyle={styles.chipText}
                >
                  {distanciaLabel}
                </Chip>
              ) : null}
            </View>
          </View>

          <Animated.View style={{ transform: [{ rotate }] }}>
            <IconButton
              icon="chevron-down"
              onPress={toggleExpand}
              size={28}
              style={styles.expandButton}
            />
          </Animated.View>
        </View>
      </Card.Content>

      {expanded ? (
        <>
          <Divider style={styles.divider} />

          <View style={styles.productosHeader}>
            <Text style={styles.productosHeaderText} variant="labelLarge">
              📦 Productos disponibles
            </Text>
            <Chip compact mode="outlined" textStyle={styles.countChipText}>
              {tienda.productos.length}
            </Chip>
          </View>

          <FlatList
            ListEmptyComponent={
              <View style={styles.emptyProductos}>
                <IconButton
                  icon="package-variant-closed"
                  iconColor="#ccc"
                  size={40}
                />
                <Text style={styles.emptyText} variant="bodySmall">
                  No hay productos disponibles
                </Text>
              </View>
            }
            contentContainerStyle={styles.productosListContent}
            data={tienda.productos}
            decelerationRate="fast"
            horizontal
            keyExtractor={(item) => item._id}
            pagingEnabled={false}
            renderItem={({ item }) => (
              <ProductoCard
                producto={item}
                searchQuery={searchQuery}
                tienda={tienda}
              />
            )}
            showsHorizontalScrollIndicator={false}
            snapToInterval={192}
            windowSize={5}
          />

          <View style={styles.footerSpace} />
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginTop: 16,
    width: "100%",
  },
  chip: {
    height: 28,
  },
  chipText: {
    fontSize: 11,
  },
  chipWarning: {
    backgroundColor: "#FFF3E0",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  colorPin: {
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 7,
    borderWidth: 1,
    height: 14,
    marginLeft: 8,
    width: 14,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  descripcion: {
    lineHeight: 20,
    marginBottom: 10,
    opacity: 0.7,
  },
  divider: {
    marginTop: 8,
  },
  emptyProductos: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.5,
  },
  expandButton: {
    margin: 0,
  },
  footerSpace: {
    height: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  productosHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  productosHeaderText: {
    fontWeight: "600",
  },
  productosListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tiendaTitle: {
    flex: 1,
    fontWeight: "bold",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
  },
});

export default TiendaCardNative;
