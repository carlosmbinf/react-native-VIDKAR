import MeteorBase from "@meteorrn/core";
import React, { useMemo, useState } from "react";
import {
  Animated,
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
  producto: 1,
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

const normalizeToArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean);
  }

  return [];
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
    ]}
  >
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
    <View style={styles.detailRow}>
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
  headerIcon,
  isDarkMode,
  itemId,
  subtitle,
  summaryBadge,
  summaryMetrics,
  title,
}) => {
  const { expanded, rotate, toggleExpanded } = useExpandableCardState();

  return (
    <Surface
      elevation={3}
      style={[styles.proxyVpnSurface, { borderLeftColor: color }]}
    >
      <Card style={styles.proxyVpnCard}>
        <TouchableOpacity activeOpacity={0.75} onPress={toggleExpanded}>
          <Card.Content style={styles.compactCardContent}>
            <View style={styles.compactHeaderRow}>
              <View style={styles.compactHeaderLeft}>
                <View
                  style={[
                    styles.compactIconWrap,
                    { backgroundColor: `${color}16` },
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
              <View style={styles.compactExpandRow}>
                <Text
                  style={[
                    styles.comercioExpandText,
                    isDarkMode && styles.darkSecondaryText,
                  ]}
                >
                  {expanded ? "Ver menos" : "Ver más detalles"}
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

const ComercioCard = ({ eliminar, eliminarPedido, isDarkMode, item }) => {
  const { expanded, rotate, toggleExpanded } = useExpandableCardState();
  const [imageUrl, setImageUrl] = useState(null);

  const color = "#FF5722";
  const producto = item.producto || {};
  const precioUnitario = Number(producto.precio || 0);
  const cantidad = Number(item.cantidad || 1);
  const total = precioUnitario * cantidad;
  const tienda = TiendasComercioCollection.findOne({ _id: producto?.idTienda });

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
      elevation={3}
      style={[styles.comercioSurface, { borderLeftColor: color }]}
    >
      <Card style={styles.comercioCard}>
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
                      icon="image-off"
                      iconColor={isDarkMode ? "#78838f" : "#b0b8c0"}
                      size={22}
                      style={styles.noMarginIcon}
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
                        { backgroundColor: `${color}16` },
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

              <View style={styles.compactExpandRow}>
                <Text
                  style={[
                    styles.comercioExpandText,
                    isDarkMode && styles.darkSecondaryText,
                  ]}
                >
                  {expanded ? "Ver menos" : "Ver más detalles"}
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
              <View style={styles.comercioDetailRow}>
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
              <View style={styles.comercioDetailRow}>
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

            <View style={styles.comercioDetailRow}>
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

            <View style={styles.comercioDetailRow}>
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

            {item.direccionCuba ? (
              <View style={styles.comercioDetailRow}>
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
                    {item.direccionCuba}
                  </Text>
                </View>
              </View>
            ) : null}

            {item.comentario?.trim() ? (
              <View style={styles.comercioDetailRow}>
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
                  ? `${color}20`
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
            style={[styles.proxyVpnChip, { backgroundColor: `${color}20` }]}
            textStyle={{ color, fontSize: 12, fontWeight: "bold" }}
          >
            {item.recibirEnCuba} {item.monedaRecibirEnCuba}
          </Chip>
        }
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
    const esIlimitado = item.esPorTiempo === true || item.megas === null;
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
            value: `$${item.cobrarUSD} CUP`,
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
            icon={item.entregado ? "check-circle" : "clock-outline"}
            style={[
              styles.statusChip,
              {
                backgroundColor: item.entregado ? "#4CAF5020" : "#FF980020",
              },
            ]}
            textStyle={{
              color: item.entregado ? "#4CAF50" : "#FF9800",
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {item.entregado ? "Entregado" : "Pendiente de pago"}
          </Chip>
        }
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
                ILIMITADO - 30 días
              </Paragraph>
            </View>
          ) : (
            <Chip
              compact
              icon="database"
              style={[styles.proxyVpnChip, { backgroundColor: `${color}20` }]}
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
            value: esIlimitado ? "30 días" : megasToGB(item.megas),
          },
          {
            accentColor: color,
            icon: "currency-usd",
            label: "Precio",
            value: `$${item.cobrarUSD || 0} CUP`,
          },
        ]}
        title={`Paquete ${label}`}
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
        if (item.type === "COMERCIO") {
          return (
            <ComercioCard
              key={item._id}
              eliminar={eliminar}
              eliminarPedido={eliminarPedido}
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
    marginRight: -12,
    marginTop: -8,
  },
  comercioCard: {},
  comercioChevron: { margin: 0 },
  comercioCloseButton: {
    margin: 0,
    marginTop: -4,
  },
  comercioDetailLabel: {
    color: "#666",
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  comercioDetailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 12,
  },
  comercioDetailTextWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  comercioDetailValue: {
    color: "#333",
    fontSize: 14,
    lineHeight: 20,
  },
  comercioDivider: { marginBottom: 12 },
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  comercioHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  comercioIcon: {
    margin: 0,
    marginRight: 8,
  },
  comercioMainContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  comercioPriceHighlight: {
    color: "#FF5722",
    fontSize: 14,
    fontWeight: "bold",
  },
  comercioProductName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
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
    gap: 10,
  },
  comercioImage: {
    borderRadius: 12,
    height: 88,
    width: 88,
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
    borderRadius: 14,
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
    marginBottom: 12,
  },
  compactCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compactExpandedContent: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  compactExpandRow: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 8,
  },
  compactFooterLeft: {
    flex: 1,
    minHeight: 22,
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
    marginBottom: 6,
  },
  compactIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    marginRight: 8,
    width: 32,
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
    flex: 1.2,
    fontSize: 13,
    marginRight: 8,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 2,
  },
  detailValue: {
    color: "#333",
    flex: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  divider: { marginVertical: 12 },
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
  proxyVpnCard: {},
  proxyVpnChip: { width: 125 },
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
    fontSize: 16,
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
    borderRadius: 12,
    flex: 1,
    // minHeight: 20,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  summaryMetricCardDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  summaryMetricHeader: {
    alignItems: "center",
    flexDirection: "row",
    // marginBottom: 4,
    // marginLeft: -2,
  },
  summaryMetricIcon: {
    margin: 0,
    // marginRight: 2,
  },
  summaryMetricLabel: {
    color: "#667085",
    flex: 1,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryMetricValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
    // lineHeight: 16,
  },
  summaryMetricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statusChip: { alignSelf: "flex-start" },
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
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 8,
    maxHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

export default ListaPedidosRemesa;
