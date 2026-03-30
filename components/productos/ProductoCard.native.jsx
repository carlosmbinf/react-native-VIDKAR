import MeteorBase from "@meteorrn/core";
import React, { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { IconButton, Surface, Text } from "react-native-paper";

import AddToCartDialog from "./AddToCartDialog";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const ProductoCardNative = ({ producto, searchQuery, tienda }) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  React.useEffect(() => {
    Meteor.call("findImgbyProduct", producto._id, (error, url) => {
      if (!error && url) {
        setImageUrl(url);
      }
    });
  }, [producto._id]);

  const estaDisponible = producto.productoDeElaboracion || producto.count > 0;
  const precioFormateado = `${Number(producto.precio || 0).toFixed(2)} ${producto.monedaPrecio || "USD"}`;

  const highlightText = (text) => {
    if (!searchQuery?.trim() || !text) {
      return text;
    }

    const parts = String(text).split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <Text key={`${part}-${index}`} style={styles.highlight}>
          {part}
        </Text>
      ) : (
        part
      ),
    );
  };

  return (
    <>
      <Pressable
        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
        onPress={() => {
          if (estaDisponible) {
            setDialogVisible(true);
          }
        }}
        style={styles.cardContainer}
      >
        <View style={styles.cardInner}>
          <Surface
            elevation={4}
            style={[styles.card, !estaDisponible ? styles.cardDisabled : null]}
          >
            {producto.productoDeElaboracion ? (
              <View pointerEvents="none" style={styles.ribbonWrapper}>
                <View style={styles.ribbon}>
                  <Text style={styles.ribbonText}>ELABORACIÓN</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.imageContainer}>
              {imageUrl ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: imageUrl }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                  <IconButton icon="image-off" iconColor="#ccc" size={32} />
                </View>
              )}

              {!producto.productoDeElaboracion && producto.count <= 5 ? (
                <View style={styles.stockBadge}>
                  <View
                    style={[
                      styles.stockChip,
                      producto.count === 0 ? styles.stockChipError : null,
                      producto.count > 0 && producto.count <= 5
                        ? styles.stockChipWarning
                        : null,
                    ]}
                  >
                    <Text style={styles.stockChipText}>
                      {producto.count === 0
                        ? "Agotado"
                        : `${producto.count} unid.`}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.content}>
              <Text
                numberOfLines={1}
                style={styles.nombre}
                variant="titleSmall"
              >
                {highlightText(producto.name)}
              </Text>

              {producto.descripcion ? (
                <Text
                  numberOfLines={3}
                  style={styles.descripcion}
                  variant="bodySmall"
                >
                  {highlightText(producto.descripcion)}
                </Text>
              ) : null}

              <View style={styles.precioContainer}>
                <Text style={styles.precio} variant="titleMedium">
                  {precioFormateado}
                </Text>
              </View>
            </View>
          </Surface>
        </View>
      </Pressable>

      <AddToCartDialog
        onDismiss={() => setDialogVisible(false)}
        producto={producto}
        tienda={tienda}
        visible={dialogVisible}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  cardContainer: {
    marginRight: 16,
    marginVertical: 8,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardInner: {
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { height: 4, width: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
    width: 180,
  },
  content: {
    padding: 12,
    paddingBottom: 14,
  },
  descripcion: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
    opacity: 0.7,
  },
  highlight: {
    backgroundColor: "#FFEB3B",
    fontWeight: "bold",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  imageContainer: {
    backgroundColor: "#f5f5f5",
    height: 160,
    position: "relative",
    width: "100%",
  },
  nombre: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
    marginBottom: 4,
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  precio: {
    fontWeight: "700",
  },
  precioContainer: {
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  ribbon: {
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { height: 2, width: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
    backgroundColor: "rgba(156, 39, 176, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    right: -25,
    top: 20,
    transform: [{ rotate: "45deg" }],
    width: 120,
  },
  ribbonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
    textTransform: "uppercase",
  },
  ribbonWrapper: {
    ...Platform.select({
      android: {
        elevation: 5,
      },
    }),
    height: 100,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    width: 100,
    zIndex: 10,
  },
  stockBadge: {
    position: "absolute",
    right: 8,
    top: 8,
  },
  stockChip: {
    backgroundColor: "rgba(76, 175, 80, 0.60)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockChipError: {
    backgroundColor: "rgba(244, 67, 54, 0.60)",
  },
  stockChipText: {
    color: "#424242",
    fontSize: 10,
    fontWeight: "600",
  },
  stockChipWarning: {
    backgroundColor: "rgba(255, 152, 0, 0.60)",
  },
});

export default ProductoCardNative;
