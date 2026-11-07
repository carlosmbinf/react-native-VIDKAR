import React, { useCallback, useRef } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Link, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";

import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";
import { ServicePressable } from "../motion/ServiceMotion";
import { saveCommerceZoomSnapshot } from "./commerceZoomSnapshot";
import ProductImageCarousel from "./ProductImageCarousel";

const ProductoCardNative = ({
  containerStyle,
  images,
  innerStyle,
  motionEnabled = true,
  onPress,
  producto,
  searchQuery,
  tienda,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const reducedMotion = useSystemReducedMotion();
  const zoomEnabled = !onPress && Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 18 && !reducedMotion;
  const visualRef = useRef({ url: null, failed: false, loading: true });
  const handleVisualChange = useCallback((visual) => { visualRef.current = visual; }, []);
  const CardPressable = motionEnabled ? ServicePressable : Pressable;
  const href = { pathname: "/(normal)/ProductoComercio", params: { productId: producto._id } };

  const estaDisponible = producto.productoDeElaboracion || producto.count > 0;
  const precioFormateado = `${Number(producto.precio || 0).toFixed(2)} ${producto.monedaPrecio || "USD"}`;

  const highlightText = (text) => {
    if (!searchQuery?.trim() || !text) {
      return text;
    }

    const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = String(text).split(new RegExp(`(${escapedQuery})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.trim().toLowerCase() ? (
        <Text key={`${part}-${index}`} style={styles.highlight}>
          {part}
        </Text>
      ) : (
        part
      ),
    );
  };

  const gallery = (
    <ProductImageCarousel
      images={images}
      onVisualChange={handleVisualChange}
      productId={producto._id}
      resizeMode="cover"
      size={180}
      style={styles.imageCarousel}
    />
  );
  const card = (
      <CardPressable
        accessibilityLabel={`Ver detalles de ${producto.name || "producto"}`}
        accessibilityRole="button"
        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
        onPress={zoomEnabled ? undefined : onPress || (() => router.push(href))}
        style={StyleSheet.flatten([styles.cardContainer, containerStyle])}
      >
        <View style={[styles.cardInner, innerStyle]}>
          <Surface
            elevation={1}
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          >
            <View style={styles.imageContainer}>
              {zoomEnabled ? <Link.AppleZoom><View collapsable={false} style={styles.imageCarousel}>{gallery}</View></Link.AppleZoom> : gallery}

              {producto.productoDeElaboracion || producto.count <= 5 ? (
                <View pointerEvents="none" style={styles.stockBadge}>
                  <View
                    style={[
                      styles.stockChip,
                      { backgroundColor: !estaDisponible ? theme.colors.errorContainer : theme.colors.secondaryContainer },
                    ]}
                  >
                    <Text style={[styles.stockChipText, { color: !estaDisponible ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer }]}>
                      {producto.productoDeElaboracion ? "Por encargo" : !estaDisponible ? "Agotado" : `Últimas ${producto.count} unid.`}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.content}>
              <Text numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }} variant="labelSmall">
                {tienda?.title || "Comercio local"}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.nombre, { color: theme.colors.onSurface }]}
                variant="titleSmall"
              >
                {highlightText(producto.name)}
              </Text>

              <Text
                numberOfLines={2}
                style={[styles.descripcion, { color: theme.colors.onSurfaceVariant }]}
                variant="bodySmall"
              >
                {highlightText(producto.descripcion || "")}
              </Text>

              <View style={[styles.precioContainer, { borderTopColor: theme.colors.outlineVariant }]}>
                <Text style={[styles.precio, { color: theme.colors.primary }]} variant="titleMedium">
                  {precioFormateado}
                </Text>
                <View style={[styles.detailsIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <MaterialCommunityIcons color={theme.colors.onSecondaryContainer} name="arrow-top-right" size={18} />
                </View>
              </View>
            </View>
          </Surface>
        </View>
      </CardPressable>
  );
  return zoomEnabled ? (
    <Link href={href} asChild push onPress={() => saveCommerceZoomSnapshot(producto._id, visualRef.current)}>
      <Link.Trigger>{card}</Link.Trigger>
    </Link>
  ) : card;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    width: "100%",
  },
  cardContainer: {
    marginRight: 16,
    marginVertical: 8,
  },
  cardInner: {
    width: 180,
  },
  content: {
    gap: 6,
    padding: 12,
    paddingBottom: 14,
  },
  descripcion: {
    fontSize: 12,
    lineHeight: 16,
    minHeight: 32,
  },
  highlight: {
    backgroundColor: "#FFEB3B",
    fontWeight: "bold",
  },
  imageCarousel: {
    height: "100%",
    width: "100%",
  },
  imageContainer: {
    backgroundColor: "#f5f5f5",
    height: 180,
    position: "relative",
    width: "100%",
  },
  nombre: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    minHeight: 40,
  },
  precio: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  precioContainer: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    paddingTop: 10,
  },
  detailsIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stockBadge: {
    position: "absolute",
    left: 8,
    top: 8,
  },
  stockChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

export default ProductoCardNative;
