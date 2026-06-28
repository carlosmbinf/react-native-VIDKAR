import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { Logs, VentasRechargeCollection } from "../collections/collections";
import {
  CADETE_PAYMENT_SELECTOR_BASE,
  CADETE_PAYMENT_TARGET_CURRENCY,
  formatCadetePaymentAmount,
  getCadeteDeliveryBreakdowns,
  getCadeteDeliveryBreakdownsInUsd,
  isCadetePaymentPending,
  summarizeCadeteDeliveryPaymentsInUsd,
} from "../comercio/pedidos/cadetePaymentUtils";
import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const DELIVERY_HISTORY_FIELDS = {
  _id: 1,
  cadeteid: 1,
  cobrado: 1,
  comentario: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaPrecioOficial: 1,
  pagadoAlCadete: 1,
  pagadoAlCadeteAt: 1,
  pagadoAlCadetePor: 1,
  precioOficial: 1,
  userId: 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
};

const CADETE_HISTORY_USER_FIELDS = {
  _id: 1,
  picture: 1,
  profile: 1,
  username: 1,
};

const DELIVERY_LOG_FIELDS = {
  _id: 1,
  createdAt: 1,
  message: 1,
  type: 1,
  userAdmin: 1,
  userAfectado: 1,
};

const FILTERS = [
  { key: "pending", label: "Pendientes" },
  { key: "all", label: "Todas" },
  { key: "paid", label: "Pagadas" },
];

const getCommerceItems = (venta) =>
  Array.isArray(venta?.producto?.carritos)
    ? venta.producto.carritos.filter((item) => item?.type === "COMERCIO")
    : [];

const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const getUserDisplayName = (user, fallback = "Usuario") => {
  const profileName = [user?.profile?.firstName, user?.profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return profileName || user?.username || fallback;
};

const normalizeCoordinate = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue.toFixed(5) : null;
};

const formatCoordinates = (source) => {
  const coordinates = source?.coordenadas || source?.cordenadas || source;
  const latitude = normalizeCoordinate(coordinates?.latitude ?? coordinates?.latitud);
  const longitude = normalizeCoordinate(coordinates?.longitude ?? coordinates?.longitud);

  if (!latitude || !longitude) {
    return "Sin coordenadas";
  }

  return `${latitude}, ${longitude}`;
};

const getDeliveryAddress = (item) => {
  const street = String(item?.nombreCalle || "").trim();
  const houseNumber = String(item?.numeroCasa || "").trim();
  const address = [street, houseNumber].filter(Boolean).join(" #");

  return address || item?.direccion || item?.address || "Dirección textual no registrada";
};

const getPickupLabel = (item, breakdown) =>
  item?.tienda?.title ||
  item?.tienda?.name ||
  item?.nombreTienda ||
  breakdown?.nombreTienda ||
  "Tienda de recogida";

const getUsdTotalFromBreakdowns = (breakdowns = []) =>
  breakdowns.reduce(
    (total, entry) =>
      entry?.conversionFailed ? total : total + (Number(entry?.costoEntrega) || 0),
    0,
  );

const getStatusTone = (venta, theme) => {
  if (venta?.pagadoAlCadete === true) {
    return {
      background: theme.dark ? "rgba(34, 197, 94, 0.16)" : "rgba(22, 163, 74, 0.12)",
      color: "#16a34a",
      icon: "check-decagram-outline",
      label: "Pagado al cadete",
    };
  }

  if (!isCadetePaymentPending(venta)) {
    return {
      background: theme.dark ? "rgba(59, 130, 246, 0.16)" : "rgba(37, 99, 235, 0.10)",
      color: "#2563eb",
      icon: "truck-delivery-outline",
      label: "En entrega",
    };
  }

  return {
    background: theme.dark ? "rgba(245, 158, 11, 0.18)" : "rgba(245, 158, 11, 0.14)",
    color: "#f59e0b",
    icon: "cash-clock",
    label: "Pendiente al cadete",
  };
};

const createPalette = (theme) => ({
  background: theme.colors.background,
  border: theme.dark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.08)",
  card: theme.dark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
  hero: theme.dark ? "rgba(6, 78, 59, 0.38)" : "rgba(236, 253, 245, 0.96)",
  heroBorder: theme.dark ? "rgba(52, 211, 153, 0.28)" : "rgba(5, 150, 105, 0.18)",
  meta: theme.dark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.05)",
  muted: theme.colors.onSurfaceVariant,
  primary: "#16a34a",
  title: theme.colors.onSurface,
});

const CadeteDeliveryCard = ({ onMarkPaid, onPress, palette, theme, usdBreakdowns, venta }) => {
  const statusTone = getStatusTone(venta, theme);
  const hasUsdBreakdowns = Array.isArray(usdBreakdowns);
  const fallbackBreakdowns = getCadeteDeliveryBreakdowns(venta);
  const breakdowns = hasUsdBreakdowns && usdBreakdowns.length ? usdBreakdowns : fallbackBreakdowns;
  const commerceItems = getCommerceItems(venta);
  const storesLabel = breakdowns.length === 1 ? "1 tienda" : `${breakdowns.length} tiendas`;
  const productsCount = commerceItems.reduce(
    (total, item) => total + (Number(item?.cantidad) || 1),
    0,
  );
  const totalUsd = hasUsdBreakdowns ? getUsdTotalFromBreakdowns(usdBreakdowns) : 0;
  const hasConversionFailures =
    hasUsdBreakdowns && usdBreakdowns.some((entry) => entry?.conversionFailed);
  const canMarkPaid = isCadetePaymentPending(venta) && hasUsdBreakdowns && !hasConversionFailures;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.cardPressed : null)}>
      <Surface style={[styles.deliveryCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <View style={styles.deliveryCardHeader}>
          <View style={styles.deliveryTitleBlock}>
            <Text style={[styles.deliveryEyebrow, { color: palette.muted }]} variant="labelMedium">
              Entrega #{String(venta?._id || "").slice(-6).toUpperCase()}
            </Text>
            <Text style={[styles.deliveryTitle, { color: palette.title }]} variant="titleMedium">
              {!hasUsdBreakdowns
                ? "Calculando USD..."
                : totalUsd > 0
                ? formatCadetePaymentAmount(totalUsd, CADETE_PAYMENT_TARGET_CURRENCY)
                : "Sin importe calculado"}
            </Text>
            <Text style={[styles.deliveryDate, { color: palette.muted }]} variant="bodySmall">
              {formatDate(venta?.createdAt)}
            </Text>
          </View>

          <Chip
            compact
            icon={statusTone.icon}
            style={[styles.statusChip, { backgroundColor: statusTone.background }]}
            textStyle={[styles.statusChipText, { color: statusTone.color }]}
          >
            {statusTone.label}
          </Chip>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: palette.meta }]}> 
            <MaterialCommunityIcons color={palette.primary} name="storefront-outline" size={16} />
            <Text style={[styles.metaText, { color: palette.title }]} variant="labelMedium">
              {storesLabel}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: palette.meta }]}> 
            <MaterialCommunityIcons color={palette.primary} name="package-variant" size={16} />
            <Text style={[styles.metaText, { color: palette.title }]} variant="labelMedium">
              {productsCount} producto{productsCount === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: palette.meta }]}> 
            <MaterialCommunityIcons color={palette.primary} name="truck-check-outline" size={16} />
            <Text style={[styles.metaText, { color: palette.title }]} variant="labelMedium">
              {venta?.estado || "Sin estado"}
            </Text>
          </View>
        </View>

        <Divider style={[styles.cardDivider, { backgroundColor: palette.border }]} />

        <View style={styles.breakdownList}>
          {breakdowns.length ? (
            breakdowns.map((entry) => (
              <View key={`${venta?._id}-${entry.idTienda}`} style={styles.breakdownRow}>
                <View style={styles.breakdownCopy}>
                  <Text numberOfLines={1} style={[styles.breakdownTitle, { color: palette.title }]} variant="bodyMedium">
                    {entry.nombreTienda}
                  </Text>
                  <Text style={[styles.breakdownMeta, { color: palette.muted }]} variant="bodySmall">
                    {entry.distanciaKm ? `${entry.distanciaKm.toFixed(2)} km · ` : ""}
                    {entry.productosCount || 0} producto{entry.productosCount === 1 ? "" : "s"}
                    {entry.conversionFailed
                      ? " · conversión USD no disponible"
                      : entry.monedaOriginal && entry.monedaOriginal !== CADETE_PAYMENT_TARGET_CURRENCY
                      ? ` · convertido desde ${entry.monedaOriginal}`
                      : ""}
                  </Text>
                </View>
                <Text style={[styles.breakdownAmount, { color: palette.primary }]} variant="labelLarge">
                  {formatCadetePaymentAmount(entry.costoEntrega, entry.moneda)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyBreakdown, { color: palette.muted }]} variant="bodySmall">
              Esta venta todavía no trae desglose de entrega por tienda.
            </Text>
          )}
        </View>

        <View style={styles.cardActionsRow}>
          <Button compact icon="eye-outline" mode="text" onPress={onPress}>
            Ver detalle
          </Button>
          {canMarkPaid ? (
            <Button compact icon="cash-check" mode="contained-tonal" onPress={onMarkPaid}>
              Marcar pagada
            </Button>
          ) : null}
        </View>
      </Surface>
    </Pressable>
  );
};

const DetailInfoRow = ({ icon, label, value, palette }) => (
  <View style={[styles.detailInfoRow, { backgroundColor: palette.meta }]}> 
    <MaterialCommunityIcons color={palette.primary} name={icon} size={18} />
    <View style={styles.detailInfoCopy}>
      <Text style={[styles.detailLabel, { color: palette.muted }]} variant="labelSmall">
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: palette.title }]} variant="bodyMedium">
        {value || "No registrado"}
      </Text>
    </View>
  </View>
);

const CadeteDeliveryDetailDialog = ({ logs, onDismiss, palette, requester, usdBreakdowns, venta, visible }) => {
  const commerceItems = getCommerceItems(venta);
  const hasUsdBreakdowns = Array.isArray(usdBreakdowns);
  const breakdowns = hasUsdBreakdowns && usdBreakdowns.length
    ? usdBreakdowns
    : getCadeteDeliveryBreakdowns(venta);
  const totalUsd = hasUsdBreakdowns ? getUsdTotalFromBreakdowns(usdBreakdowns) : 0;

  return (
    <Portal>
      <Dialog onDismiss={onDismiss} style={[styles.detailDialog, { backgroundColor: palette.card }]} visible={visible}>
        <Dialog.Title>
          <Text style={[styles.detailTitle, { color: palette.title }]} variant="titleLarge">
            Entrega #{String(venta?._id || "").slice(-6).toUpperCase()}
          </Text>
        </Dialog.Title>
        <Dialog.ScrollArea style={styles.detailScrollArea}>
          <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <Surface style={[styles.detailHero, { backgroundColor: palette.hero, borderColor: palette.heroBorder }]}>
              <Text style={[styles.detailHeroEyebrow, { color: palette.primary }]} variant="labelLarge">
                Ganancia de entrega en USD
              </Text>
              <Text style={[styles.detailHeroAmount, { color: palette.title }]} variant="headlineMedium">
                {formatCadetePaymentAmount(totalUsd, CADETE_PAYMENT_TARGET_CURRENCY)}
              </Text>
              <Text style={[styles.detailHeroText, { color: palette.muted }]} variant="bodySmall">
                Todos los importes de CUP/UYU se muestran convertidos a dólar para el historial del cadete.
              </Text>
            </Surface>

            <View style={styles.detailGrid}>
              <DetailInfoRow icon="account-outline" label="Cliente" palette={palette} value={getUserDisplayName(requester, venta?.userId || "Cliente")} />
              <DetailInfoRow icon="calendar-clock" label="Fecha" palette={palette} value={formatDate(venta?.createdAt)} />
              <DetailInfoRow icon="truck-check-outline" label="Estado" palette={palette} value={venta?.estado || "Sin estado"} />
              <DetailInfoRow icon="cash" label="Pago de venta" palette={palette} value={venta?.isCobrado || venta?.cobrado ? "Cobrado" : "Pendiente"} />
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: palette.title }]} variant="titleMedium">
                Lo transportado
              </Text>
              {commerceItems.map((item, index) => {
                const breakdown = breakdowns[index] || breakdowns.find((entry) => entry.idTienda === item?.idTienda);
                const quantity = Number(item?.cantidad) || 1;
                const productName = item?.producto?.name || item?.name || "Producto de comercio";

                return (
                  <Surface key={`${item?._id || item?.producto?._id || index}`} style={[styles.productCard, { backgroundColor: palette.meta }]}> 
                    <Text style={[styles.productTitle, { color: palette.title }]} variant="titleSmall">
                      {productName}
                    </Text>
                    <Text style={[styles.productMeta, { color: palette.muted }]} variant="bodySmall">
                      Cantidad: {quantity} · Recogida: {getPickupLabel(item, breakdown)}
                    </Text>
                    <Text style={[styles.productMeta, { color: palette.muted }]} variant="bodySmall">
                      Entrega: {getDeliveryAddress(item)}
                    </Text>
                    <Text style={[styles.productMeta, { color: palette.muted }]} variant="bodySmall">
                      Coordenadas destino: {formatCoordinates(item?.coordenadas)}
                    </Text>
                    {item?.comentario ? (
                      <Text style={[styles.productComment, { color: palette.title }]} variant="bodySmall">
                        Nota: {item.comentario}
                      </Text>
                    ) : null}
                  </Surface>
                );
              })}
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: palette.title }]} variant="titleMedium">
                Desglose de pago al cadete
              </Text>
              {breakdowns.length ? breakdowns.map((entry) => (
                <View key={`detail-${entry.idTienda}`} style={[styles.detailAmountRow, { borderColor: palette.border }]}> 
                  <View style={styles.detailInfoCopy}>
                    <Text style={[styles.breakdownTitle, { color: palette.title }]} variant="bodyMedium">
                      {entry.nombreTienda}
                    </Text>
                    <Text style={[styles.breakdownMeta, { color: palette.muted }]} variant="bodySmall">
                      {entry.distanciaKm ? `${entry.distanciaKm.toFixed(2)} km · ` : ""}
                      {entry.conversionFailed
                        ? `Conversión USD no disponible. Original: ${formatCadetePaymentAmount(entry.costoEntregaOriginal, entry.monedaOriginal)}`
                        : entry.monedaOriginal && entry.monedaOriginal !== CADETE_PAYMENT_TARGET_CURRENCY
                        ? `Original: ${formatCadetePaymentAmount(entry.costoEntregaOriginal, entry.monedaOriginal)}`
                        : "Importe en USD"}
                    </Text>
                  </View>
                  <Text style={[styles.breakdownAmount, { color: palette.primary }]} variant="labelLarge">
                    {formatCadetePaymentAmount(entry.costoEntrega, entry.moneda)}
                  </Text>
                </View>
              )) : (
                <Text style={[styles.emptyBreakdown, { color: palette.muted }]} variant="bodySmall">
                  No hay desglose de costos de entrega asociado.
                </Text>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: palette.title }]} variant="titleMedium">
                Logs y cambios de estado
              </Text>
              {logs.length ? logs.map((log) => (
                <View key={log._id} style={[styles.logRow, { borderColor: palette.border }]}> 
                  <View style={[styles.logIcon, { backgroundColor: palette.meta }]}> 
                    <MaterialCommunityIcons color={palette.primary} name="timeline-clock-outline" size={18} />
                  </View>
                  <View style={styles.logCopy}>
                    <Text style={[styles.logType, { color: palette.title }]} variant="labelLarge">
                      {log.type || "Evento"}
                    </Text>
                    <Text style={[styles.logMessage, { color: palette.muted }]} variant="bodySmall">
                      {log.message || "Cambio registrado en el sistema."}
                    </Text>
                    <Text style={[styles.logDate, { color: palette.muted }]} variant="labelSmall">
                      {formatDate(log.createdAt)}
                    </Text>
                  </View>
                </View>
              )) : (
                <Text style={[styles.emptyBreakdown, { color: palette.muted }]} variant="bodySmall">
                  Todavía no hay logs publicados para esta venta. El estado actual se muestra con la información de la venta.
                </Text>
              )}
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cerrar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const CadeteDeliveryHistoryScreen = () => {
  const theme = useTheme();
  const palette = useMemo(() => createPalette(theme), [theme]);
  const dataReady = useDeferredScreenData();
  const headerInset = useAppHeaderContentInset();
  const [filter, setFilter] = useState("pending");
  const [selectedVentaId, setSelectedVentaId] = useState(null);
  const [usdBreakdownsByVentaId, setUsdBreakdownsByVentaId] = useState({});
  const [pendingSummary, setPendingSummary] = useState({
    hasPendingAmount: false,
    mainTotal: { amount: 0, currency: CADETE_PAYMENT_TARGET_CURRENCY },
    pendingSalesCount: 0,
    storesCount: 0,
    totals: [],
  });

  const { ready, usersById, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { ready: false, usersById: {}, ventas: [] };
    }

    const currentUserId = Meteor.userId();

    if (!currentUserId) {
      return { ready: true, usersById: {}, ventas: [] };
    }

    const selector = {
      ...CADETE_PAYMENT_SELECTOR_BASE,
      cadeteid: currentUserId,
    };
    const handle = Meteor.subscribe("ventasRecharge", selector, {
      fields: DELIVERY_HISTORY_FIELDS,
    });
    const ventasData = VentasRechargeCollection.find(selector, {
      fields: DELIVERY_HISTORY_FIELDS,
      sort: { createdAt: -1 },
    }).fetch();
    const userIds = [...new Set(ventasData.map((venta) => venta?.userId).filter(Boolean))];
    const usersHandle = userIds.length
      ? Meteor.subscribe("user", { _id: { $in: userIds } }, { fields: CADETE_HISTORY_USER_FIELDS })
      : null;
    const users = userIds.length
      ? Meteor.users.find({ _id: { $in: userIds } }, { fields: CADETE_HISTORY_USER_FIELDS }).fetch()
      : [];

    return {
      ready: handle.ready() && (!usersHandle || usersHandle.ready()),
      usersById: users.reduce((accumulator, user) => {
        accumulator[user._id] = user;
        return accumulator;
      }, {}),
      ventas: ventasData,
    };
  }, [dataReady]);

  const selectedVenta = useMemo(
    () => ventas.find((venta) => venta._id === selectedVentaId) || null,
    [selectedVentaId, ventas],
  );

  const selectedLogs = Meteor.useTracker(() => {
    if (!selectedVentaId) {
      return [];
    }

    const selector = {
      $or: [
        { userAfectado: selectedVentaId },
        { message: { $regex: selectedVentaId, $options: "i" } },
      ],
    };

    Meteor.subscribe("logs", selector, {
      fields: DELIVERY_LOG_FIELDS,
      limit: 30,
      sort: { createdAt: -1 },
    });

    return Logs.find(selector, {
      fields: DELIVERY_LOG_FIELDS,
      limit: 30,
      sort: { createdAt: -1 },
    }).fetch();
  }, [selectedVentaId]);

  useEffect(() => {
    let cancelled = false;

    const convertVentas = async () => {
      const entries = await Promise.all(
        ventas.map(async (venta) => [venta._id, await getCadeteDeliveryBreakdownsInUsd(venta)]),
      );
      const summary = await summarizeCadeteDeliveryPaymentsInUsd(
        ventas.filter(isCadetePaymentPending),
      );

      if (!cancelled) {
        setUsdBreakdownsByVentaId(Object.fromEntries(entries));
        setPendingSummary(summary);
      }
    };

    convertVentas();

    return () => {
      cancelled = true;
    };
  }, [ventas]);

  const filteredVentas = useMemo(() => {
    if (filter === "paid") {
      return ventas.filter((venta) => venta?.pagadoAlCadete === true);
    }

    if (filter === "pending") {
      return ventas.filter(isCadetePaymentPending);
    }

    return ventas;
  }, [filter, ventas]);

  const handleMarkPaid = useCallback((venta) => {
    if (!venta?._id) {
      return;
    }

    const breakdowns = usdBreakdownsByVentaId[venta._id] || [];
    const hasConversionFailures = breakdowns.some((entry) => entry?.conversionFailed);
    const totalUsd = getUsdTotalFromBreakdowns(breakdowns);

    if (hasConversionFailures) {
      Alert.alert(
        "Conversión no disponible",
        "No se pudo convertir todo el pago a USD. Inténtalo nuevamente antes de marcar esta entrega como pagada.",
      );
      return;
    }

    Alert.alert(
      "Marcar pago al cadete",
      `¿Confirmas que esta entrega ya fue pagada al cadete por ${formatCadetePaymentAmount(totalUsd, CADETE_PAYMENT_TARGET_CURRENCY)}?`,
      [
        { style: "cancel", text: "Cancelar" },
        {
          text: "Marcar pagada",
          onPress: () => {
            const currentUserId = Meteor.userId();
            const paidAt = new Date();

            VentasRechargeCollection.update(venta._id, {
              $set: {
                pagadoAlCadete: true,
                pagadoAlCadeteAt: paidAt,
                pagadoAlCadetePor: currentUserId,
              },
            }, (error) => {
              if (error) {
                Alert.alert(
                  "No se pudo marcar el pago",
                  error.reason || error.message || "Inténtalo nuevamente.",
                );
                return;
              }

              Meteor.call(
                "registrarLog",
                "CADETE_PAGO",
                venta._id,
                currentUserId,
                `Venta marcada como pagada al cadete por ${formatCadetePaymentAmount(totalUsd, CADETE_PAYMENT_TARGET_CURRENCY)}`,
              );
              Alert.alert("Pago registrado", "La venta quedó marcada como pagada al cadete.");
            });
          },
        },
      ],
    );
  }, [usdBreakdownsByVentaId]);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Surface style={[styles.heroCard, { backgroundColor: palette.hero, borderColor: palette.heroBorder }]}> 
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons color="#16a34a" name="cash-fast" size={28} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroEyebrow, { color: palette.primary }]} variant="labelLarge">
            Historial de entregas
          </Text>
          <Text style={[styles.heroAmount, { color: palette.title }]} variant="headlineMedium">
            {pendingSummary.hasPendingAmount
              ? formatCadetePaymentAmount(
                  pendingSummary.mainTotal.amount,
                  pendingSummary.mainTotal.currency,
                )
              : "0.00 USD"}
          </Text>
          <Text style={[styles.heroText, { color: palette.muted }]} variant="bodyMedium">
            Pendiente a cobrar por entregas de comercio asignadas a tu usuario. Todos los importes se consolidan en USD.
          </Text>
        </View>
      </Surface>

      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const selected = option.key === filter;

          return (
            <Chip
              compact
              key={option.key}
              mode={selected ? "flat" : "outlined"}
              onPress={() => setFilter(option.key)}
              selected={selected}
              style={[
                styles.filterChip,
                selected
                  ? { backgroundColor: theme.dark ? "rgba(34,197,94,0.18)" : "rgba(22,163,74,0.12)" }
                  : null,
              ]}
              textStyle={selected ? { color: palette.primary, fontWeight: "800" } : null}
            >
              {option.label}
            </Chip>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}> 
      <AppHeader
        backgroundColor={DEFAULT_HEADER_COLOR}
        overlapContent
        showBackButton
        subtitle="Pagos, rutas y entregas de comercio"
        title="Historial cadete"
      />
      {!ready ? (
        <View style={[styles.loadingState, { paddingTop: headerInset }]}> 
          <ActivityIndicator color="#16a34a" size="large" />
          <Text style={{ color: palette.muted }} variant="bodyMedium">
            Calculando historial de entregas...
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: headerInset + 18 },
          ]}
          data={filteredVentas}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Surface style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <MaterialCommunityIcons color={palette.primary} name="truck-outline" size={32} />
              <Text style={[styles.emptyTitle, { color: palette.title }]} variant="titleMedium">
                No hay entregas en este filtro
              </Text>
              <Text style={[styles.emptyText, { color: palette.muted }]} variant="bodySmall">
                Cuando tengas ventas de comercio asignadas como cadete aparecerán aquí con el desglose por tienda.
              </Text>
            </Surface>
          }
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <CadeteDeliveryCard
              onMarkPaid={() => handleMarkPaid(item)}
              onPress={() => setSelectedVentaId(item._id)}
              palette={palette}
              theme={theme}
              usdBreakdowns={usdBreakdownsByVentaId[item._id]}
              venta={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CadeteDeliveryDetailDialog
        logs={selectedLogs}
        onDismiss={() => setSelectedVentaId(null)}
        palette={palette}
        requester={usersById[selectedVenta?.userId]}
        usdBreakdowns={selectedVenta ? usdBreakdownsByVentaId[selectedVenta._id] : []}
        venta={selectedVenta}
        visible={Boolean(selectedVenta)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  breakdownAmount: {
    fontWeight: "900",
  },
  breakdownCopy: {
    flex: 1,
    gap: 2,
  },
  breakdownList: {
    gap: 10,
  },
  breakdownMeta: {
    lineHeight: 18,
  },
  breakdownRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  breakdownTitle: {
    fontWeight: "800",
  },
  cardActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  cardDivider: {
    marginVertical: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  deliveryCard: {
    borderRadius: 26,
    borderWidth: 1,
    gap: 14,
    marginHorizontal: 16,
    padding: 16,
  },
  deliveryCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  deliveryDate: {
    lineHeight: 18,
  },
  deliveryEyebrow: {
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  deliveryTitle: {
    fontWeight: "900",
  },
  deliveryTitleBlock: {
    flex: 1,
    gap: 3,
  },
  detailAmountRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  detailContent: {
    gap: 16,
    paddingBottom: 12,
  },
  detailDialog: {
    alignSelf: "center",
    borderRadius: 28,
    maxWidth: 720,
    width: "94%",
  },
  detailGrid: {
    gap: 10,
  },
  detailHero: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  detailHeroAmount: {
    fontWeight: "900",
  },
  detailHeroEyebrow: {
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailHeroText: {
    lineHeight: 20,
  },
  detailInfoCopy: {
    flex: 1,
    gap: 2,
  },
  detailInfoRow: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  detailLabel: {
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  detailScrollArea: {
    maxHeight: 560,
    paddingHorizontal: 20,
  },
  detailSection: {
    gap: 10,
  },
  detailSectionTitle: {
    fontWeight: "900",
  },
  detailTitle: {
    fontWeight: "900",
  },
  detailValue: {
    fontWeight: "700",
    lineHeight: 20,
  },
  emptyBreakdown: {
    lineHeight: 20,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 16,
    padding: 24,
  },
  emptyText: {
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  filterChip: {
    borderRadius: 999,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
  },
  heroAmount: {
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  heroCard: {
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 16,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.14)",
    borderRadius: 22,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  heroText: {
    lineHeight: 21,
  },
  listContent: {
    gap: 14,
    paddingBottom: 28,
  },
  listHeader: {
    gap: 14,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logCopy: {
    flex: 1,
    gap: 2,
  },
  logDate: {
    fontWeight: "700",
  },
  logIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  logMessage: {
    lineHeight: 20,
  },
  logRow: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  logType: {
    fontWeight: "900",
  },
  metaPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: {
    fontWeight: "800",
  },
  productCard: {
    borderRadius: 20,
    gap: 5,
    padding: 14,
  },
  productComment: {
    fontWeight: "700",
    lineHeight: 20,
  },
  productMeta: {
    lineHeight: 19,
  },
  productTitle: {
    fontWeight: "900",
  },
  screen: {
    flex: 1,
  },
  statusChip: {
    borderRadius: 999,
  },
  statusChipText: {
    fontWeight: "800",
  },
});

export default CadeteDeliveryHistoryScreen;
