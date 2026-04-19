import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Meteor from "@meteorrn/core";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Card, IconButton, Menu, Text, useTheme } from "react-native-paper";

import { createEmpresaPalette } from "../styles/empresaTheme";
import ProductoImage from "./ProductoImage";

const getEmbeddedMethodMessage = (result) => {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return "";
  }

  if (result.success === true) {
    return "";
  }

  return result.reason || result.message || (typeof result.error === "string" ? result.error : "");
};

const normalizeText = (value, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || fallback;
};

const getAvailabilityMeta = ({ count, isDark, isElaboracion }) => {
  if (isElaboracion) {
    return {
      badgeIcon: "chef-hat",
      badgeLabel: "Preparacion al momento",
      badgeBackground: isDark ? "rgba(129, 140, 248, 0.2)" : "#eef2ff",
      badgeBorder: isDark ? "rgba(165, 180, 252, 0.3)" : "#c7d2fe",
      badgeColor: isDark ? "#c7d2fe" : "#4338ca",
      panelBackground: isDark ? "rgba(67, 56, 202, 0.14)" : "#eef2ff",
      panelBorder: isDark ? "rgba(165, 180, 252, 0.22)" : "#c7d2fe",
      panelColor: isDark ? "#ddd6fe" : "#4338ca",
      summaryValue: "Bajo pedido",
      summaryHint: "Se prepara cuando el cliente confirma la compra.",
    };
  }

  if (count <= 0) {
    return {
      badgeIcon: "close-circle-outline",
      badgeLabel: "Agotado",
      badgeBackground: isDark ? "rgba(127, 29, 29, 0.26)" : "#fef2f2",
      badgeBorder: isDark ? "rgba(252, 165, 165, 0.24)" : "#fecaca",
      badgeColor: isDark ? "#fda4af" : "#b91c1c",
      panelBackground: isDark ? "rgba(127, 29, 29, 0.16)" : "#fff1f2",
      panelBorder: isDark ? "rgba(252, 165, 165, 0.18)" : "#fecdd3",
      panelColor: isDark ? "#fecdd3" : "#be123c",
      summaryValue: "Sin existencias",
      summaryHint: "Conviene reponerlo para volver a ofrecerlo.",
    };
  }

  if (count <= 5) {
    return {
      badgeIcon: "alert-circle-outline",
      badgeLabel: "Ultimas unidades",
      badgeBackground: isDark ? "rgba(120, 53, 15, 0.26)" : "#fffbeb",
      badgeBorder: isDark ? "rgba(251, 191, 36, 0.22)" : "#fde68a",
      badgeColor: isDark ? "#fde68a" : "#b45309",
      panelBackground: isDark ? "rgba(120, 53, 15, 0.16)" : "#fffbeb",
      panelBorder: isDark ? "rgba(251, 191, 36, 0.18)" : "#fcd34d",
      panelColor: isDark ? "#fde68a" : "#92400e",
      summaryValue: `${count} disponible${count === 1 ? "" : "s"}`,
      summaryHint: "Inventario ajustado. Conviene reponer pronto.",
    };
  }

  return {
    badgeIcon: "check-circle-outline",
    badgeLabel: "Disponible",
    badgeBackground: isDark ? "rgba(20, 83, 45, 0.24)" : "#ecfdf5",
    badgeBorder: isDark ? "rgba(74, 222, 128, 0.18)" : "#bbf7d0",
    badgeColor: isDark ? "#86efac" : "#15803d",
    panelBackground: isDark ? "rgba(20, 83, 45, 0.16)" : "#f0fdf4",
    panelBorder: isDark ? "rgba(74, 222, 128, 0.18)" : "#bbf7d0",
    panelColor: isDark ? "#bbf7d0" : "#166534",
    summaryValue: `${count} disponible${count === 1 ? "" : "s"}`,
    summaryHint: "Listo para vender con inventario disponible.",
  };
};

const ProductoCard = ({ compact = false, producto, onEdit }) => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const [deleting, setDeleting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const count = Math.max(0, Number(producto?.count || 0));
  const isElaboracion = Boolean(producto?.productoDeElaboracion);
  const descripcion = normalizeText(producto?.descripcion, "Sin descripcion disponible");
  const nota = normalizeText(producto?.comentario, "");
  const precioFormateado = `${Number(producto?.precio || 0).toFixed(2)} ${producto?.monedaPrecio || "USD"}`;
  const availabilityMeta = getAvailabilityMeta({ count, isDark: Boolean(theme.dark), isElaboracion });

  const handleDelete = () => {
    Alert.alert(
      "Eliminar producto",
      "El producto y su imagen dejaran de estar disponibles en esta tienda.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setDeleting(true);

            Meteor.call("comercio.deleteProductImage", producto._id, () => {
              Meteor.call("removeProducto", producto._id, (error, result) => {
                setDeleting(false);

                const embeddedMessage = getEmbeddedMethodMessage(result);

                if (error || embeddedMessage) {
                  Alert.alert(
                    "No se pudo eliminar el producto",
                    error?.reason || embeddedMessage || "Intentalo nuevamente.",
                  );
                  return;
                }

                Alert.alert("Producto eliminado", "El producto se elimino correctamente.");
              });
            });
          },
        },
      ],
    );
  };

  return (
    <Card
      mode="elevated"
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          shadowColor: palette.shadowColor,
        },
      ]}
    >
      <View style={[styles.heroCard, compact ? styles.heroCardCompact : null]}>
        <ProductoImage fill productoId={producto?._id} style={styles.backgroundImage} />

        <View
          pointerEvents="none"
          style={[
            styles.backdropTint,
            {
              backgroundColor: theme.dark ? "rgba(9, 14, 32, 0.36)" : "rgba(56, 33, 102, 0.16)",
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.backdropFade,
            {
              backgroundColor: theme.dark ? "rgba(2, 6, 23, 0.76)" : "rgba(255, 255, 255, 0.78)",
            },
          ]}
        />
        <View pointerEvents="none" style={styles.mediaGlowWrap}>
          <View style={[styles.mediaGlow, { backgroundColor: palette.brandSoft }]} />
        </View>

        <View style={styles.cardInner}>
          <View style={styles.mediaHeaderRow}>
            <View
              style={[
                styles.stateBadge,
                {
                  backgroundColor: availabilityMeta.badgeBackground,
                  borderColor: availabilityMeta.badgeBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={availabilityMeta.badgeColor}
                name={availabilityMeta.badgeIcon}
                size={16}
              />
              <Text numberOfLines={1} style={{ color: availabilityMeta.badgeColor }} variant="labelMedium">
                {availabilityMeta.badgeLabel}
              </Text>
            </View>

            <Menu
              anchor={
                <IconButton
                  disabled={deleting}
                  icon="dots-vertical"
                  iconColor={theme.dark ? "#ffffff" : palette.brandStrong}
                  onPress={() => setMenuVisible(true)}
                  style={[
                    styles.menuTrigger,
                    {
                      backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.84)",
                      borderColor: theme.dark ? "rgba(255, 255, 255, 0.14)" : "rgba(103, 58, 183, 0.14)",
                    },
                  ]}
                />
              }
              contentStyle={[
                styles.menuContent,
                {
                  backgroundColor: palette.menu,
                  borderColor: palette.border,
                },
              ]}
              onDismiss={() => setMenuVisible(false)}
              visible={menuVisible}
            >
              <Menu.Item
                leadingIcon="pencil-outline"
                onPress={() => {
                  setMenuVisible(false);
                  onEdit?.(producto);
                }}
                title="Editar"
              />
              <Menu.Item
                leadingIcon="delete-outline"
                onPress={() => {
                  setMenuVisible(false);
                  handleDelete();
                }}
                title="Eliminar"
              />
            </Menu>
          </View>

          <View style={styles.contentFooter}>
            <View style={styles.copyBlock}>
              <View
                style={[
                  styles.eyebrowChip,
                  {
                    backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.72)",
                    borderColor: theme.dark ? "rgba(255, 255, 255, 0.1)" : "rgba(103, 58, 183, 0.1)",
                  },
                ]}
              >
                <MaterialCommunityIcons color={palette.brandStrong} name="shopping-outline" size={14} />
                <Text style={{ color: palette.brandStrong }} variant="labelSmall">
                  Catalogo de tienda
                </Text>
              </View>

              <View style={styles.titleBlock}>
                <Text numberOfLines={2} style={[styles.titleText, { color: palette.title }]} variant="headlineSmall">
                  {producto?.name || "Producto"}
                </Text>
                <Text
                  numberOfLines={compact ? 3 : 4}
                  style={[styles.descriptionText, { color: theme.dark ? "rgba(248, 250, 252, 0.88)" : palette.copy }]}
                  variant="bodyMedium"
                >
                  {descripcion}
                </Text>
              </View>
            </View>

            <View style={styles.footerMetaRow}>
              <View
                style={[
                  styles.priceChip,
                  styles.priceChipLarge,
                  {
                    backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.76)" : "rgba(255, 255, 255, 0.86)",
                    borderColor: theme.dark ? "rgba(255, 255, 255, 0.1)" : "rgba(103, 58, 183, 0.14)",
                  },
                ]}
              >
                <MaterialCommunityIcons color={palette.brandStrong} name="cash" size={18} />
                <Text style={[styles.priceText, { color: palette.brandStrong }]} variant="titleMedium">
                  {precioFormateado}
                </Text>
              </View>

              <View
                style={[
                  styles.availabilityCard,
                  {
                    backgroundColor: availabilityMeta.panelBackground,
                    borderColor: availabilityMeta.panelBorder,
                  },
                ]}
              >
                <Text style={[styles.availabilityLabel, { color: availabilityMeta.panelColor }]} variant="labelSmall">
                  Disponibilidad
                </Text>
                <Text style={[styles.availabilityValue, { color: availabilityMeta.panelColor }]} variant="titleSmall">
                  {availabilityMeta.summaryValue}
                </Text>
              </View>
            </View>

            {nota ? (
              <View
                style={[
                  styles.notePanel,
                  {
                    backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.62)" : "rgba(255, 255, 255, 0.72)",
                    borderColor: theme.dark ? "rgba(255, 255, 255, 0.08)" : "rgba(103, 58, 183, 0.1)",
                  },
                ]}
              >
                <MaterialCommunityIcons color={palette.icon} name="text-box-outline" size={15} />
                <Text numberOfLines={2} style={{ color: palette.title, flex: 1 }} variant="bodySmall">
                  {nota}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  availabilityCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  availabilityLabel: {
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  availabilityValue: {
    fontWeight: "700",
  },
  backdropFade: {
    ...StyleSheet.absoluteFillObject,
    top: "44%",
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  cardCompact: {
    borderRadius: 24,
  },
  cardInner: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  contentFooter: {
    gap: 14,
  },
  copyBlock: {
    gap: 8,
  },
  descriptionText: {
    lineHeight: 21,
  },
  eyebrowChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerMetaRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  heroCard: {
    minHeight: 338,
    position: "relative",
  },
  heroCardCompact: {
    minHeight: 316,
  },
  mediaGlow: {
    borderRadius: 88,
    height: 176,
    opacity: 0.78,
    position: "absolute",
    right: -60,
    top: 18,
    width: 176,
  },
  mediaGlowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },
  menuContent: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuTrigger: {
    borderRadius: 16,
    borderWidth: 1,
    margin: 0,
  },
  notePanel: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceChipLarge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceText: {
    fontWeight: "800",
  },
  stateBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: "76%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  titleBlock: {
    gap: 6,
  },
  titleText: {
    fontWeight: "700",
  },
});

export default ProductoCard;
