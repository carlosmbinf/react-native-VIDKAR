import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
    Animated,
    Easing,
    Image,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import {
    Card,
    Chip,
    Divider,
    IconButton,
    Paragraph,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import {
    CarritoCollection,
    TiendasComercioCollection,
} from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const CART_ITEM_FIELDS = {
  cantidad: 1,
  cobrarUSD: 1,
  comentario: 1,
  coordenadas: 1,
  cursoId: 1,
  direccionCuba: 1,
  entregado: 1,
  esPorTiempo: 1,
  extraFields: 1,
  idTienda: 1,
  idUser: 1,
  megas: 1,
  metodoPago: 1,
  monedaACobrar: 1,
  monedaRecibirEnCuba: 1,
  movilARecargar: 1,
  nombre: 1,
  nombreCalle: 1,
  numeroCasa: 1,
  producto: 1,
  profesorId: 1,
  recibirEnCuba: 1,
  tarjetaCUP: 1,
  tienda: 1,
  type: 1,
};

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const megasToGB = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0 GB";
  return `${(amount / 1024).toFixed(amount >= 1024 ? 0 : 2)} GB`;
};

const isUnlimitedProxyVpnItem = (item) => {
  if (item?.type !== "PROXY" && item?.type !== "VPN") {
    return false;
  }

  const megas = Number(item?.megas || 0);
  return (
    item?.esPorTiempo === true ||
    item?.producto?.esPorTiempo === true ||
    item?.megas === null ||
    !Number.isFinite(megas) ||
    megas <= 0 ||
    megas === 999999
  );
};

const getProxyVpnCapacityLabel = (item) =>
  isUnlimitedProxyVpnItem(item) ? "Ilimitado" : megasToGB(item?.megas);

const normalizeToArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean);
  }

  return [];
};

const withAlpha = (hex, alpha) => `${hex}${alpha}`;

const getProductGlowBounds = (cardSize, glowSize) => ({
  minX: -glowSize * 0.18,
  maxX: Math.max(-glowSize * 0.18, cardSize.width - glowSize * 0.82),
  minY: -glowSize * 0.18,
  maxY: Math.max(-glowSize * 0.18, cardSize.height - glowSize * 0.82),
});

const PRODUCT_GLOW_MOTION_PATTERNS = {
  primarySweep: {
    x: ["max", "max", "min", "min", "max"],
    y: ["min", "max", "max", "min", "min"],
  },
  secondarySweep: {
    x: ["min", "max", "max", "min", "min"],
    y: ["max", "max", "min", "min", "max"],
  },
};

const resolveProductGlowPoint = (key, bounds) => bounds[key] ?? bounds.min;

const buildProductGlowMotion = (progress, cardSize, glowSize, patternName) => {
  const { minX, maxX, minY, maxY } = getProductGlowBounds(cardSize, glowSize);
  const xDistance = maxX - minX;
  const yDistance = maxY - minY;
  const xBounds = {
    min: minX,
    max: maxX,
    mid: minX + xDistance * 0.5,
    innerMin: minX + xDistance * 0.24,
    innerMax: minX + xDistance * 0.76,
  };
  const yBounds = {
    min: minY,
    max: maxY,
    mid: minY + yDistance * 0.5,
    innerMin: minY + yDistance * 0.24,
    innerMax: minY + yDistance * 0.76,
  };
  const pattern =
    PRODUCT_GLOW_MOTION_PATTERNS[patternName] ||
    PRODUCT_GLOW_MOTION_PATTERNS.primarySweep;

  return {
    translateX: progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: pattern.x.map((key) => resolveProductGlowPoint(key, xBounds)),
    }),
    translateY: progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: pattern.y.map((key) => resolveProductGlowPoint(key, yBounds)),
    }),
  };
};

const ProductCardGlow = ({ color, glowPrimaryProgress, glowSecondaryProgress, isDarkMode }) => {
  const [cardSize, setCardSize] = React.useState({ height: 150, width: 280 });

  const primaryGlowSize = Math.min(Math.max(cardSize.width * 0.54, 132), 190);
  const secondaryGlowSize = Math.min(Math.max(cardSize.width * 0.46, 112), 170);
  const primaryMotion = buildProductGlowMotion(
    glowPrimaryProgress,
    cardSize,
    primaryGlowSize,
    "primarySweep",
  );
  const secondaryMotion = buildProductGlowMotion(
    glowSecondaryProgress,
    cardSize,
    secondaryGlowSize,
    "secondarySweep",
  );

  return (
    <View
      collapsable={false}
      onLayout={({ nativeEvent }) => {
        const { height, width } = nativeEvent.layout;

        if (!height || !width) {
          return;
        }

        setCardSize((current) => {
          const hasMeasured = current.height > 0 && current.width > 0;
          const widthChanged = Math.abs(current.width - width) > 2;

          if (hasMeasured && !widthChanged) {
            return current;
          }

          if (current.height === height && current.width === width) {
            return current;
          }

          return { height, width };
        });
      }}
      pointerEvents="none"
      style={styles.productGlowLayer}
    >
      <Animated.View
        style={[
          styles.productGlow,
          styles.productGlowPrimary,
          {
            backgroundColor: withAlpha(color, isDarkMode ? "4a" : "30"),
            height: primaryGlowSize,
            transform: [
              { translateX: primaryMotion.translateX },
              { translateY: primaryMotion.translateY },
            ],
            width: primaryGlowSize,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.productGlow,
          styles.productGlowSecondary,
          {
            backgroundColor: isDarkMode
              ? "rgba(96, 165, 250, 0.22)"
              : "rgba(14, 165, 233, 0.16)",
            height: secondaryGlowSize,
            transform: [
              { translateX: secondaryMotion.translateX },
              { translateY: secondaryMotion.translateY },
            ],
            width: secondaryGlowSize,
          },
        ]}
      />
    </View>
  );
};

const useExpandableCardState = () => {
  const [expanded, setExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      duration: 220,
      toValue: expanded ? 0 : 1,
      useNativeDriver: true,
    }).start();
    setExpanded((current) => !current);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return { expanded, rotate, toggleExpanded };
};

const CartSummaryMetric = ({ accentColor, icon, isDarkMode, label, value }) => (
  <View
    style={[
      styles.summaryMetricCard,
      isDarkMode && styles.summaryMetricCardDark,
      {
        backgroundColor: withAlpha(accentColor, isDarkMode ? "16" : "0d"),
        borderColor: withAlpha(accentColor, isDarkMode ? "30" : "22"),
      },
    ]}
  >
    <View
      pointerEvents="none"
      style={[styles.summaryMetricGlow, { backgroundColor: withAlpha(accentColor, "18") }]}
    />
    <View style={styles.summaryMetricHeader}>
      <IconButton
        icon={icon}
        iconColor={accentColor}
        size={14}
        style={styles.summaryMetricIcon}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.summaryMetricLabel,
          isDarkMode && styles.darkSecondaryText,
        ]}
      >
        {label}
      </Text>
    </View>
    <Text
      numberOfLines={1}
      style={[
        styles.summaryMetricValue,
        isDarkMode && styles.darkPrimaryText,
        accentColor ? { color: accentColor } : null,
      ]}
    >
      {value}
    </Text>
  </View>
);

const CartDetailItem = ({ detail, isDarkMode }) => {
  const text = detail?.value;

  if (text === null || text === undefined || text === "") {
    return null;
  }

  return (
    <View style={[styles.detailRow, isDarkMode && styles.detailRowDark]}>
      <IconButton
        icon={detail.icon}
        iconColor={isDarkMode ? "#AAA" : "#666"}
        size={16}
        style={styles.detailIcon}
      />
      <Text
        style={[styles.detailLabel, isDarkMode && styles.darkSecondaryText]}
      >
        {detail.label}
      </Text>
      <Text
        numberOfLines={detail.numberOfLines || 2}
        style={[
          styles.detailValue,
          isDarkMode && styles.darkPrimaryText,
          detail.valueStyle || null,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const CompactCartCard = ({
  color,
  detailRows,
  eliminar,
  eliminarPedido,
  footer,
  glowPrimaryProgress,
  glowSecondaryProgress,
  headerIcon,
  isDarkMode,
  itemId,
  subtitle,
  summaryBadge,
  summaryMetrics,
  title,
}) => {
  const { expanded, rotate, toggleExpanded } = useExpandableCardState();
  const cardGradientColors = isDarkMode
    ? [withAlpha(color, "20"), "rgba(15, 23, 42, 0)"]
    : [withAlpha(color, "14"), "rgba(255, 255, 255, 0)"];

  return (
    <Surface
      elevation={2}
      style={[
        styles.cartProductSurface,
        isDarkMode && styles.cartProductSurfaceDark,
        { borderLeftColor: color },
      ]}
    >
      <Card
        style={[
          styles.cartProductCard,
          isDarkMode && styles.cartProductCardDark,
        ]}
      >
        <LinearGradient
          colors={cardGradientColors}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.cardFutureLayer}
        />
        <ProductCardGlow
          color={color}
          glowPrimaryProgress={glowPrimaryProgress}
          glowSecondaryProgress={glowSecondaryProgress}
          isDarkMode={isDarkMode}
        />
        <View
          pointerEvents="none"
          style={[styles.cardAccentBeam, { backgroundColor: withAlpha(color, "42") }]}
        />
        <TouchableOpacity activeOpacity={0.75} onPress={toggleExpanded}>
          <Card.Content style={styles.compactCardContent}>
            <View style={styles.compactHeaderRow}>
              <View style={styles.compactHeaderLeft}>
                <View
                  style={[
                    styles.compactIconWrap,
                    {
                      backgroundColor: withAlpha(color, isDarkMode ? "22" : "16"),
                      borderColor: withAlpha(color, "34"),
                    },
                  ]}
                >
                  <IconButton
                    icon={headerIcon}
                    iconColor={color}
                    size={18}
                    style={styles.compactHeaderIcon}
                  />
                </View>
                <View style={styles.compactTitleBlock}>
                  <Text
                    numberOfLines={1}
                    style={[styles.proxyVpnTitle, { color }]}
                  >
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.compactSubtitle,
                        isDarkMode && styles.darkSecondaryText,
                      ]}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
              {eliminar ? (
                <IconButton
                  icon="close"
                  iconColor={isDarkMode ? "#ff6b6b" : "#F44336"}
                  onPress={() => eliminarPedido(itemId)}
                  size={20}
                  style={styles.closeButton}
                />
              ) : null}
            </View>

            {summaryBadge ? (
              <View style={styles.compactBadgeRow}>{summaryBadge}</View>
            ) : null}

            <View style={styles.summaryMetricsGrid}>
              {summaryMetrics.map((metric) => (
                <CartSummaryMetric
                  key={`${itemId}-${metric.label}`}
                  accentColor={metric.accentColor}
                  icon={metric.icon}
                  isDarkMode={isDarkMode}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </View>

            <View style={styles.compactFooterRow}>
              <View style={styles.compactFooterLeft}>{footer || <View />}</View>
              <View
                style={[
                  styles.compactExpandRow,
                  {
                    backgroundColor: withAlpha(color, isDarkMode ? "1f" : "14"),
                    borderColor: withAlpha(color, isDarkMode ? "42" : "2c"),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.comercioExpandText,
                    { color },
                  ]}
                >
                  {expanded ? "Ocultar" : "Detalle"}
                </Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <IconButton
                    icon="chevron-down"
                    iconColor={color}
                    size={20}
                    style={styles.comercioChevron}
                  />
                </Animated.View>
              </View>
            </View>
          </Card.Content>
        </TouchableOpacity>

        {expanded ? (
          <Card.Content style={styles.compactExpandedContent}>
            <Divider style={styles.divider} />
            {detailRows.map((detail) => (
              <CartDetailItem
                key={`${itemId}-${detail.label}`}
                detail={detail}
                isDarkMode={isDarkMode}
              />
            ))}
          </Card.Content>
        ) : null}
      </Card>
    </Surface>
  );
};

const ComercioCard = ({
  eliminar,
  eliminarPedido,
  glowPrimaryProgress,
  glowSecondaryProgress,
  isDarkMode,
  item,
}) => {
  const { expanded, rotate, toggleExpanded } = useExpandableCardState();
  const [imageUrl, setImageUrl] = useState(null);

  const color = "#FF5722";
  const cardGradientColors = isDarkMode
    ? [withAlpha(color, "20"), "rgba(15, 23, 42, 0)"]
    : [withAlpha(color, "14"), "rgba(255, 255, 255, 0)"];
  const producto = item.producto || {};
  const precioUnitario = Number(producto.precio || 0);
  const cantidad = Number(item.cantidad || 1);
  const total = precioUnitario * cantidad;
  const tienda = TiendasComercioCollection.findOne({ _id: producto?.idTienda });
  const nombreCalle = String(item.nombreCalle || "").trim();
  const numeroCasa = String(item.numeroCasa || "").trim();
  const direccionEntrega = [nombreCalle, numeroCasa].filter(Boolean).join(" ");

  React.useEffect(() => {
    let cancelled = false;

    if (!producto?._id) {
      setImageUrl(null);
      return () => {
        cancelled = true;
      };
    }

    Meteor.call("findImgbyProduct", producto._id, (error, url) => {
      if (!cancelled) {
        setImageUrl(!error && url ? url : null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [producto?._id]);

  return (
    <Surface
      elevation={2}
      style={[
        styles.cartProductSurface,
        isDarkMode && styles.cartProductSurfaceDark,
        { borderLeftColor: color },
      ]}
    >
      <Card
        style={[
          styles.cartProductCard,
          isDarkMode && styles.cartProductCardDark,
        ]}
      >
        <LinearGradient
          colors={cardGradientColors}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.cardFutureLayer}
        />
        <ProductCardGlow
          color={color}
          glowPrimaryProgress={glowPrimaryProgress}
          glowSecondaryProgress={glowSecondaryProgress}
          isDarkMode={isDarkMode}
        />
        <View
          pointerEvents="none"
          style={[styles.cardAccentBeam, { backgroundColor: withAlpha(color, "42") }]}
        />
        <TouchableOpacity activeOpacity={0.75} onPress={toggleExpanded}>
          <Card.Content style={styles.comercioMainContent}>
            <View style={styles.comercioHeroRow}>
              <View style={styles.comercioImageFrame}>
                {imageUrl ? (
                  <Image
                    resizeMode="cover"
                    source={{ uri: imageUrl }}
                    style={styles.comercioImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.comercioImage,
                      styles.comercioImageFallback,
                      isDarkMode && styles.comercioImageFallbackDark,
                    ]}
                  >
                    <IconButton
                      icon="image-off-outline"
                      iconColor={color}
                      size={20}
                      style={styles.compactHeaderIcon}
                    />
                  </View>
                )}
              </View>

              <View style={styles.comercioHeroContent}>
                <View style={styles.comercioHeaderRow}>
                  <View style={styles.comercioTitleWrapper}>
                    <View
                      style={[
                        styles.compactIconWrap,
                        {
                          backgroundColor: withAlpha(color, isDarkMode ? "22" : "16"),
                          borderColor: withAlpha(color, "34"),
                        },
                      ]}
                    >
                      <IconButton
                        icon="storefront"
                        iconColor={color}
                        size={18}
                        style={styles.compactHeaderIcon}
                      />
                    </View>
                    <View style={styles.comercioTitleTexts}>
                      <Text
                        numberOfLines={1}
                        style={[styles.comercioProductName, { color }]}
                      >
                        {producto?.name || "Producto"}
                      </Text>
                    </View>
                  </View>

                  {eliminar ? (
                    <IconButton
                      icon="close"
                      iconColor={isDarkMode ? "#ff6b6b" : "#F44336"}
                      onPress={() => eliminarPedido(item._id)}
                      size={18}
                      style={styles.comercioCloseButton}
                    />
                  ) : null}
                </View>

                <View style={styles.summaryMetricsGrid}>
                  <CartSummaryMetric
                    accentColor={color}
                    icon="counter"
                    isDarkMode={isDarkMode}
                    label="Cantidad"
                    value={String(cantidad)}
                  />
                  <CartSummaryMetric
                    accentColor={color}
                    icon="currency-usd"
                    isDarkMode={isDarkMode}
                    label="Costo"
                    value={`${total.toFixed(2)} ${item.monedaACobrar || "CUP"}`}
                  />
                </View>
              </View>
            </View>

            <View style={styles.compactFooterRow}>
              <View style={styles.compactFooterLeft} />

              <View
                style={[
                  styles.compactExpandRow,
                  {
                    backgroundColor: withAlpha(color, isDarkMode ? "1f" : "14"),
                    borderColor: withAlpha(color, isDarkMode ? "42" : "2c"),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.comercioExpandText,
                    { color },
                  ]}
                >
                  {expanded ? "Ocultar" : "Detalle"}
                </Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <IconButton
                    icon="chevron-down"
                    iconColor={color}
                    size={20}
                    style={styles.comercioChevron}
                  />
                </Animated.View>
              </View>
            </View>
          </Card.Content>
        </TouchableOpacity>

        {expanded ? (
          <Card.Content style={styles.comercioExpandedContent}>
            <Divider style={styles.comercioDivider} />

            {tienda?.title ? (
              <View
                style={[
                  styles.comercioDetailRow,
                  isDarkMode && styles.detailRowDark,
                ]}
              >
                <IconButton
                  icon="storefront-outline"
                  iconColor={isDarkMode ? "#AAA" : "#666"}
                  size={16}
                  style={styles.detailIcon}
                />
                <View style={styles.comercioDetailTextWrapper}>
                  <Text
                    style={[
                      styles.comercioDetailLabel,
                      isDarkMode && styles.darkSecondaryText,
                    ]}
                  >
                    Tienda
                  </Text>
                  <Text
                    style={[
                      styles.comercioDetailValue,
                      isDarkMode && styles.darkPrimaryText,
                    ]}
                  >
                    {tienda.title}
                  </Text>
                </View>
              </View>
            ) : null}

            {producto?.descripcion ? (
              <View
                style={[
                  styles.comercioDetailRow,
                  isDarkMode && styles.detailRowDark,
                ]}
              >
                <IconButton
                  icon="text-box-outline"
                  iconColor={isDarkMode ? "#AAA" : "#666"}
                  size={16}
                  style={styles.detailIcon}
                />
                <View style={styles.comercioDetailTextWrapper}>
                  <Text
                    style={[
                      styles.comercioDetailLabel,
                      isDarkMode && styles.darkSecondaryText,
                    ]}
                  >
                    Descripción del producto
                  </Text>
                  <Text
                    style={[
                      styles.comercioDetailValue,
                      isDarkMode && styles.darkPrimaryText,
                    ]}
                  >
                    {producto.descripcion}
                  </Text>
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.comercioDetailRow,
                isDarkMode && styles.detailRowDark,
              ]}
            >
              <IconButton
                icon="tag-outline"
                iconColor={isDarkMode ? "#AAA" : "#666"}
                size={16}
                style={styles.detailIcon}
              />
              <View style={styles.comercioDetailTextWrapper}>
                <Text
                  style={[
                    styles.comercioDetailLabel,
                    isDarkMode && styles.darkSecondaryText,
                  ]}
                >
                  Tipo de producto
                </Text>
                <Text
                  style={[
                    styles.comercioDetailValue,
                    isDarkMode && styles.darkPrimaryText,
                  ]}
                >
                  {producto.productoDeElaboracion
                    ? "Elaboración"
                    : "Inventario"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.comercioDetailRow,
                isDarkMode && styles.detailRowDark,
              ]}
            >
              <IconButton
                icon="currency-usd"
                iconColor={isDarkMode ? "#AAA" : "#666"}
                size={16}
                style={styles.detailIcon}
              />
              <View style={styles.comercioDetailTextWrapper}>
                <Text
                  style={[
                    styles.comercioDetailLabel,
                    isDarkMode && styles.darkSecondaryText,
                  ]}
                >
                  Precio unitario
                </Text>
                <Text
                  style={[
                    styles.comercioDetailValue,
                    styles.comercioPriceHighlight,
                  ]}
                >
                  {precioUnitario.toFixed(2)} {item.monedaACobrar || "CUP"}
                </Text>
              </View>
            </View>

            {direccionEntrega || item.direccionCuba ? (
              <View
                style={[
                  styles.comercioDetailRow,
                  isDarkMode && styles.detailRowDark,
                ]}
              >
                <IconButton
                  icon="home-map-marker"
                  iconColor={isDarkMode ? "#AAA" : "#666"}
                  size={16}
                  style={styles.detailIcon}
                />
                <View style={styles.comercioDetailTextWrapper}>
                  <Text
                    style={[
                      styles.comercioDetailLabel,
                      isDarkMode && styles.darkSecondaryText,
                    ]}
                  >
                    Dirección de entrega
                  </Text>
                  <Text
                    style={[
                      styles.comercioDetailValue,
                      isDarkMode && styles.darkPrimaryText,
                    ]}
                  >
                    {direccionEntrega || item.direccionCuba}
                  </Text>
                </View>
              </View>
            ) : null}

            {item.comentario?.trim() ? (
              <View
                style={[
                  styles.comercioDetailRow,
                  isDarkMode && styles.detailRowDark,
                ]}
              >
                <IconButton
                  icon="comment-text"
                  iconColor={isDarkMode ? "#AAA" : "#666"}
                  size={16}
                  style={styles.detailIcon}
                />
                <View style={styles.comercioDetailTextWrapper}>
                  <Text
                    style={[
                      styles.comercioDetailLabel,
                      isDarkMode && styles.darkSecondaryText,
                    ]}
                  >
                    Notas adicionales
                  </Text>
                  <Text
                    style={[
                      styles.comercioDetailValue,
                      isDarkMode && styles.darkPrimaryText,
                    ]}
                  >
                    {item.comentario}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card.Content>
        ) : null}
      </Card>
    </Surface>
  );
};

const ListaPedidosRemesa = ({ eliminar = false, items, useScroll = true }) => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const userId = Meteor.userId();
  const productGlowPrimaryProgress = React.useRef(new Animated.Value(0)).current;
  const productGlowSecondaryProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const primaryLoop = Animated.loop(
      Animated.timing(productGlowPrimaryProgress, {
        duration: 18000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    const secondaryLoop = Animated.loop(
      Animated.timing(productGlowSecondaryProgress, {
        duration: 21000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    productGlowPrimaryProgress.setValue(0);
    productGlowSecondaryProgress.setValue(0);
    primaryLoop.start();
    secondaryLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      productGlowPrimaryProgress.stopAnimation();
      productGlowSecondaryProgress.stopAnimation();
    };
  }, [productGlowPrimaryProgress, productGlowSecondaryProgress]);

  const pedidosData = Meteor.useTracker(() => {
    if (Array.isArray(items)) return items;
    Meteor.subscribe(
      "carrito",
      { idUser: userId },
      { fields: CART_ITEM_FIELDS },
    );
    return CarritoCollection.find({ idUser: userId }).fetch();
  }, [userId, JSON.stringify(items || null)]);

  const pedidosRemesa = useMemo(
    () => (Array.isArray(items) ? items : pedidosData || []),
    [items, pedidosData],
  );

  const eliminarPedido = (idPedido) => {
    Meteor.call("eliminarElementoCarrito", idPedido, (error) => {
      if (error) console.error("Error al eliminar pedido:", error);
    });
  };

  const renderRecargaCard = (item) => {
    const color = "#FF6F00";
    const beneficiosRecarga = (item.comentario || "").trim();
    const promociones = normalizeToArray(item.producto?.promotions);
    const tienePromocion = promociones.length > 0;

    return (
      <CompactCartCard
        color={color}
        detailRows={[
          { icon: "account", label: "Para", value: item.nombre },
          { icon: "phone", label: "Número", value: item.movilARecargar },
          {
            icon: "sim",
            label: "Operadora",
            numberOfLines: 1,
            value: item.producto?.operator?.name,
          },
          {
            icon: tienePromocion ? "gift" : "gift-off",
            label: "Promoción",
            value: tienePromocion ? "Con promoción" : "Sin promoción",
          },
          {
            icon: "lightning-bolt",
            label: "Beneficios",
            numberOfLines: 4,
            value: beneficiosRecarga,
          },
          {
            icon: "currency-usd",
            label: "Precio",
            value: `$${item.cobrarUSD} USD`,
            valueStyle: styles.priceValue,
          },
          {
            icon: "credit-card",
            label: "Método de pago",
            value: item.metodoPago,
          },
        ]}
        eliminar={eliminar}
        eliminarPedido={eliminarPedido}
        footer={
          <Chip
            compact
            icon={tienePromocion ? "gift" : "gift-off"}
            style={[
              styles.proxyVpnChip,
              {
                backgroundColor: tienePromocion
                  ? withAlpha(color, "20")
                  : "rgba(120, 130, 144, 0.16)",
              },
            ]}
            textStyle={{
              color: tienePromocion
                ? color
                : isDarkMode
                  ? "#cbd5e1"
                  : "#5f6b7a",
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            {tienePromocion ? "Con promoción" : "Sin promoción"}
          </Chip>
        }
        glowPrimaryProgress={productGlowPrimaryProgress}
        glowSecondaryProgress={productGlowSecondaryProgress}
        headerIcon="cellphone"
        isDarkMode={isDarkMode}
        itemId={item._id}
        key={item._id}
        subtitle={null}
        // summaryBadge={
        //   <Chip
        //     compact
        //     icon={tienePromocion ? "gift" : "gift-off"}
        //     style={[
        //       styles.proxyVpnChip,
        //       {
        //         backgroundColor: tienePromocion
        //           ? `${color}20`
        //           : "rgba(120, 130, 144, 0.16)",
        //       },
        //     ]}
        //     textStyle={{
        //       color: tienePromocion
        //         ? color
        //         : isDarkMode
        //           ? "#cbd5e1"
        //           : "#5f6b7a",
        //       fontSize: 12,
        //       fontWeight: "bold",
        //     }}
        //   >
        //     {tienePromocion ? "Con promoción" : "Sin promoción"}
        //   </Chip>
        // }
        summaryMetrics={[
          {
            accentColor: color,
            icon: "phone",
            label: "Número",
            value: item.movilARecargar || "Sin número",
          },
          {
            accentColor: color,
            icon: "account",
            label: "Cliente",
            value: item.nombre || "Sin nombre",
          },
          {
            accentColor: color,
            icon: "currency-usd",
            label: "Precio",
            value: `$${item.cobrarUSD || 0} USD`,
          },
        ]}
        title="Recarga Móvil"
      />
    );
  };

  const renderRemesaCard = (item) => {
    const color = "#9C27B0";
    return (
      <CompactCartCard
        color={color}
        detailRows={[
          { icon: "account", label: "Para", value: item.nombre },
          {
            icon: "map-marker",
            label: "Dirección",
            numberOfLines: 3,
            value: item.direccionCuba,
          },
          {
            icon: "credit-card-outline",
            label: "Tarjeta",
            value: item.tarjetaCUP,
          },
          {
            icon: "currency-usd",
            label: "Precio",
            value: `$${item.cobrarUSD} USD`,
            valueStyle: styles.priceValue,
          },
          {
            icon: "information",
            label: "Nota",
            numberOfLines: 3,
            value: item.comentario,
          },
          {
            icon: "credit-card",
            label: "Método de pago",
            value: item.metodoPago,
          },
        ]}
        eliminar={eliminar}
        eliminarPedido={eliminarPedido}
        footer={
          <Chip
            compact
            icon="cash"
            style={[styles.proxyVpnChip, { backgroundColor: withAlpha(color, "20") }]}
            textStyle={{ color, fontSize: 12, fontWeight: "bold" }}
          >
            {item.recibirEnCuba} {item.monedaRecibirEnCuba}
          </Chip>
        }
        glowPrimaryProgress={productGlowPrimaryProgress}
        glowSecondaryProgress={productGlowSecondaryProgress}
        headerIcon="cash-fast"
        isDarkMode={isDarkMode}
        itemId={item._id}
        key={item._id}
        subtitle={item.nombre || "Remesa"}
        summaryMetrics={[
          {
            accentColor: color,
            icon: "currency-usd",
            label: "Precio",
            value: `$${item.cobrarUSD || 0} USD`,
          },
          {
            accentColor: color,
            icon: "cash-multiple",
            label: "Entrega",
            value:
              `${item.recibirEnCuba || 0} ${item.monedaRecibirEnCuba || ""}`.trim(),
          },
        ]}
        title="Remesa"
      />
    );
  };

  const renderProxyVPNCard = (item) => {
    const isProxy = item.type === "PROXY";
    const color = isProxy ? "#2196F3" : "#4CAF50";
    const label = isProxy ? "PROXY" : "VPN";
    const esIlimitado = isUnlimitedProxyVpnItem(item);
    const capacityLabel = getProxyVpnCapacityLabel(item);
    const meses = Math.max(1, Number(item.cantidad ?? item.producto?.cantidad) || 1);
    const precioUnitario = Number(item.cobrarUSD) || 0;
    const precioTotal = esIlimitado ? precioUnitario * meses : precioUnitario;
    return (
      <CompactCartCard
        color={color}
        detailRows={[
          { icon: "account", label: "Usuario", value: item.nombre },
          {
            icon: "information",
            label: "Detalles",
            numberOfLines: 3,
            value: item.comentario,
          },
          {
            icon: "currency-usd",
            label: "Precio",
            value: `${precioTotal.toFixed(2)} ${item.monedaACobrar || "CUP"}`,
            valueStyle: styles.priceValue,
          },
          ...(esIlimitado
            ? [{
                icon: "calendar-month",
                label: "Meses contratados",
                value: String(meses),
              }, {
                icon: "cash-clock",
                label: "Precio mensual",
                value: `${precioUnitario.toFixed(2)} ${item.monedaACobrar || "CUP"}`,
              }]
            : []),
          {
            icon: "credit-card",
            label: "Método de pago",
            value: item.metodoPago,
          },
        ]}
        eliminar={eliminar}
        eliminarPedido={eliminarPedido}
        footer={
          item.entregado ? (
            <Chip
              compact
              icon="check-circle"
              style={[
                styles.statusChip,
                { backgroundColor: "rgba(34, 197, 94, 0.16)" },
              ]}
              textStyle={{
                color: "#22c55e",
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              Entregado
            </Chip>
          ) : null
        }
        glowPrimaryProgress={productGlowPrimaryProgress}
        glowSecondaryProgress={productGlowSecondaryProgress}
        headerIcon={isProxy ? "wifi" : "shield-check"}
        isDarkMode={isDarkMode}
        itemId={item._id}
        key={item._id}
        subtitle={item.nombre || `Servicio ${label}`}
        summaryBadge={
          esIlimitado ? (
            <View style={styles.unlimitedChipWrapper}>
              <IconButton
                icon="infinity"
                iconColor="#FFD700"
                size={20}
                style={styles.infinityIcon}
              />
              <Paragraph style={styles.unlimitedChipText}>
                ILIMITADO - {meses} {meses === 1 ? "mes" : "meses"}
              </Paragraph>
            </View>
          ) : (
            <Chip
              compact
              icon="database"
              style={[styles.proxyVpnChip, { backgroundColor: withAlpha(color, "20") }]}
              textStyle={{ color, fontSize: 12, fontWeight: "bold" }}
            >
              {megasToGB(item.megas)}
            </Chip>
          )
        }
        summaryMetrics={[
          {
            accentColor: color,
            icon: esIlimitado ? "calendar-range" : "database",
            label: esIlimitado ? "Duración" : "Capacidad",
            value: esIlimitado ? `${meses * 30} días` : capacityLabel,
          },
          ...(esIlimitado
            ? [{
                accentColor: color,
                icon: "calendar-month",
                label: "Meses",
                value: String(meses),
              }]
            : []),
          {
            accentColor: color,
            icon: "currency-usd",
            label: esIlimitado ? "Total a cobrar" : "Precio",
            value: `${precioTotal.toFixed(2)} ${item.monedaACobrar || "CUP"}`,
          },
        ]}
        title={`Paquete ${label}`}
      />
    );
  };

  const renderCourseCard = (item) => {
    const color = "#0F766E";
    const title = item.producto?.titulo || "Curso VIDKAR";
    const professor = item.producto?.profesorNombre || "Profesor VIDKAR";
    const currency = item.monedaACobrar || "CUP";

    return (
      <CompactCartCard
        color={color}
        detailRows={[
          { icon: "book-open-page-variant", label: "Curso", value: title },
          { icon: "school-outline", label: "Profesor", value: professor },
          { icon: "calendar-range", label: "Acceso", value: "30 días desde la aprobación del pago" },
          { icon: "currency-usd", label: "Precio", value: `${item.cobrarUSD} ${currency}`, valueStyle: styles.priceValue },
          { icon: "information-outline", label: "Detalle", value: item.comentario },
        ]}
        eliminar={eliminar}
        eliminarPedido={eliminarPedido}
        glowPrimaryProgress={productGlowPrimaryProgress}
        glowSecondaryProgress={productGlowSecondaryProgress}
        headerIcon="book-education-outline"
        isDarkMode={isDarkMode}
        itemId={item._id}
        key={item._id}
        subtitle={professor}
        summaryBadge={
          <Chip compact icon="calendar-month" style={[styles.proxyVpnChip, { backgroundColor: withAlpha(color, "20") }]} textStyle={{ color, fontSize: 12, fontWeight: "bold" }}>
            Suscripción mensual
          </Chip>
        }
        summaryMetrics={[
          { accentColor: color, icon: "calendar-range", label: "Duración", value: "30 días" },
          { accentColor: color, icon: "currency-usd", label: "Precio", value: `${item.cobrarUSD || 0} ${currency}` },
        ]}
        title={title}
      />
    );
  };

  if (pedidosRemesa.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconButton icon="cart-off" iconColor="#CCC" size={64} />
        <Paragraph style={styles.emptyText}>
          No hay productos en el carrito
        </Paragraph>
      </View>
    );
  }

  const renderedItems = (
    <View style={[styles.container, !useScroll && styles.containerStatic]}>
      {pedidosRemesa.map((item) => {
        if (item.type === "PROXY" || item.type === "VPN")
          return renderProxyVPNCard(item);
        if (item.type === "RECARGA") return renderRecargaCard(item);
        if (item.type === "REMESA") return renderRemesaCard(item);
        if (item.type === "CURSO") return renderCourseCard(item);
        if (item.type === "COMERCIO") {
          return (
            <ComercioCard
              key={item._id}
              eliminar={eliminar}
              eliminarPedido={eliminarPedido}
              glowPrimaryProgress={productGlowPrimaryProgress}
              glowSecondaryProgress={productGlowSecondaryProgress}
              isDarkMode={isDarkMode}
              item={item}
            />
          );
        }
        return null;
      })}
    </View>
  );

  if (!useScroll) {
    return renderedItems;
  }

  return <ScrollView>{renderedItems}</ScrollView>;
};

const styles = StyleSheet.create({
  closeButton: {
    margin: 0,
    marginRight: -8,
    marginTop: -6,
  },
  cartProductCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 14,
    overflow: "hidden",
  },
  cartProductCardDark: {
    backgroundColor: "rgba(8, 13, 27, 0.98)",
  },
  cartProductSurface: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderColor: "rgba(15, 23, 42, 0.07)",
    borderLeftWidth: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#020617",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  cartProductSurfaceDark: {
    backgroundColor: "rgba(8, 13, 27, 0.98)",
    borderColor: "rgba(125, 150, 190, 0.18)",
    shadowOpacity: 0.18,
  },
  cardAccentBeam: {
    borderRadius: 999,
    height: 2,
    left: 12,
    opacity: 0.82,
    position: "absolute",
    right: 12,
    top: 0,
    zIndex: 1,
  },
  cardFutureLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  comercioCard: {},
  comercioChevron: { margin: 0 },
  comercioCloseButton: {
    margin: 0,
    marginTop: -4,
  },
  comercioDetailLabel: {
    color: "#666",
    fontSize: 10.5,
    letterSpacing: 0.4,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  comercioDetailRow: {
    alignItems: "flex-start",
    backgroundColor: "rgba(15, 23, 42, 0.035)",
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  comercioDetailTextWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  comercioDetailValue: {
    color: "#333",
    fontSize: 13,
    lineHeight: 18,
  },
  comercioDivider: { marginBottom: 10 },
  comercioExpandIndicator: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  comercioExpandText: {
    color: "#666",
    fontSize: 12,
    marginRight: 4,
  },
  comercioExpandedContent: {
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 0,
  },
  comercioHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  comercioIcon: {
    margin: 0,
    marginRight: 8,
  },
  comercioMainContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comercioPriceHighlight: {
    color: "#FF5722",
    fontSize: 14,
    fontWeight: "bold",
  },
  comercioProductName: {
    fontSize: 14.5,
    fontWeight: "bold",
    lineHeight: 18,
  },
  comercioSubtitle: {
    color: "#666",
    fontSize: 12,
  },
  comercioSummaryIcon: {
    margin: 0,
    marginRight: 4,
  },
  comercioSummaryItem: {
    alignItems: "center",
    flexDirection: "row",
  },
  comercioSummaryLabel: {
    color: "#666",
    fontSize: 12,
    marginRight: 4,
  },
  comercioSummaryRow: {
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  comercioSummaryValue: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
  },
  comercioSurface: {
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  comercioDescriptionPreview: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  comercioHeroContent: {
    flex: 1,
    minWidth: 0,
  },
  comercioHeroRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9,
  },
  comercioImage: {
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 11,
    borderWidth: 1,
    height: 68,
    width: 68,
  },
  comercioImageFallback: {
    alignItems: "center",
    backgroundColor: "#eef2f6",
    justifyContent: "center",
  },
  comercioImageFallbackDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  comercioImageFrame: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  comercioTitleTexts: { flex: 1 },
  comercioTitleWrapper: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  commerceModeChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  compactBadgeRow: {
    marginBottom: 7,
  },
  compactCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  compactExpandedContent: {
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 0,
  },
  compactExpandRow: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    height: 30,
    marginLeft: 8,
    paddingLeft: 10,
    paddingRight: 2,
  },
  compactFooterLeft: {
    flex: 1,
    minHeight: 20,
  },
  compactFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 0,
  },
  compactHeaderIcon: {
    margin: 0,
  },
  compactHeaderLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  compactHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  compactIconWrap: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 30,
    justifyContent: "center",
    marginRight: 7,
    width: 30,
  },
  compactSubtitle: {
    color: "#667085",
    fontSize: 12,
    marginTop: 2,
  },
  compactTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  container: {
    padding: 0,
  },
  containerStatic: {
    position: "relative",
  },
  darkPrimaryText: {
    color: "#EEE",
  },
  darkSecondaryText: {
    color: "#AAA",
  },
  detailIcon: { margin: 0 },
  detailLabel: {
    color: "#666",
    flex: 1,
    fontSize: 12,
    marginRight: 8,
  },
  detailRow: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.035)",
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  detailRowDark: {
    backgroundColor: "rgba(30, 41, 59, 0.72)",
    borderColor: "rgba(148, 163, 184, 0.12)",
  },
  detailValue: {
    color: "#333",
    flex: 2,
    fontSize: 12.5,
    fontWeight: "600",
  },
  divider: { marginBottom: 10, marginTop: 6 },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 16,
    textAlign: "center",
  },
  noMarginIcon: {
    margin: 0,
  },
  infinityIcon: {
    margin: 0,
    marginRight: -4,
  },
  priceValue: {
    color: "#1976D2",
    fontSize: 15,
    fontWeight: "bold",
  },
  productGlow: {
    borderRadius: 999,
    opacity: 0.86,
    position: "absolute",
  },
  productGlowLayer: {
    borderRadius: 14,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 0,
  },
  productGlowPrimary: {
    left: 0,
    top: 0,
  },
  productGlowSecondary: {
    left: 0,
    top: 0,
  },
  proxyVpnCard: {},
  proxyVpnChip: {
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 999,
    borderWidth: 1,
    width: 125,
  },
  proxyVpnDetails: { marginTop: 0 },
  proxyVpnHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  proxyVpnSurface: {
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  proxyVpnTitle: {
    fontSize: 14.5,
    fontWeight: "bold",
    marginRight: 8,
  },
  proxyVpnTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  summaryMetricCard: {
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderWidth: 1,
    borderRadius: 12,
    flex: 1,
    minHeight: 42,
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  summaryMetricCardDark: {
    backgroundColor: "rgba(30, 41, 59, 0.68)",
    borderColor: "rgba(148, 163, 184, 0.12)",
  },
  summaryMetricHeader: {
    alignItems: "center",
    flexDirection: "row",
    position: "relative",
    zIndex: 1,
  },
  summaryMetricGlow: {
    bottom: -18,
    height: 34,
    opacity: 0.8,
    position: "absolute",
    right: -12,
    transform: [{ rotate: "-18deg" }],
    width: 48,
  },
  summaryMetricIcon: {
    margin: 0,
    // marginRight: 2,
  },
  summaryMetricLabel: {
    color: "#667085",
    flex: 1,
    fontSize: 9.5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryMetricValue: {
    color: "#0f172a",
    fontSize: 12.5,
    fontWeight: "700",
    position: "relative",
    zIndex: 1,
  },
  summaryMetricsGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 7,
  },
  statusChip: {
    alignSelf: "flex-start",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 999,
    borderWidth: 1,
  },
  statusContainer: {
    alignItems: "flex-start",
    marginTop: 10,
    maxHeight: 28,
  },
  unlimitedChipText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 2,
  },
  unlimitedChipWrapper: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 215, 0, 0.14)",
    borderColor: "rgba(255, 215, 0, 0.26)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 8,
    maxHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

export default ListaPedidosRemesa;
