import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Divider, Surface, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import {
  CADETE_PAYMENT_SELECTOR_BASE,
  formatCadetePaymentAmount,
  getCadeteDeliveryBreakdowns,
  isCadetePaymentPending,
  summarizeCadeteDeliveryPayments,
} from "../comercio/pedidos/cadetePaymentUtils";
import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const DELIVERY_HISTORY_FIELDS = {
  _id: 1,
  cadeteid: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  pagadoAlCadete: 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
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

const CadeteDeliveryCard = ({ venta, palette, theme }) => {
  const statusTone = getStatusTone(venta, theme);
  const breakdowns = getCadeteDeliveryBreakdowns(venta);
  const commerceItems = getCommerceItems(venta);
  const summary = summarizeCadeteDeliveryPayments([venta]);
  const storesLabel = breakdowns.length === 1 ? "1 tienda" : `${breakdowns.length} tiendas`;
  const productsCount = commerceItems.reduce(
    (total, item) => total + (Number(item?.cantidad) || 1),
    0,
  );

  return (
    <Surface style={[styles.deliveryCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.deliveryCardHeader}>
        <View style={styles.deliveryTitleBlock}>
          <Text style={[styles.deliveryEyebrow, { color: palette.muted }]} variant="labelMedium">
            Entrega #{String(venta?._id || "").slice(-6).toUpperCase()}
          </Text>
          <Text style={[styles.deliveryTitle, { color: palette.title }]} variant="titleMedium">
            {summary.hasPendingAmount
              ? formatCadetePaymentAmount(summary.mainTotal.amount, summary.mainTotal.currency)
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
    </Surface>
  );
};

const CadeteDeliveryHistoryScreen = () => {
  const theme = useTheme();
  const palette = useMemo(() => createPalette(theme), [theme]);
  const dataReady = useDeferredScreenData();
  const headerInset = useAppHeaderContentInset();
  const [filter, setFilter] = useState("pending");

  const { ready, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { ready: false, ventas: [] };
    }

    const currentUserId = Meteor.userId();

    if (!currentUserId) {
      return { ready: true, ventas: [] };
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

    return {
      ready: handle.ready(),
      ventas: ventasData,
    };
  }, [dataReady]);

  const filteredVentas = useMemo(() => {
    if (filter === "paid") {
      return ventas.filter((venta) => venta?.pagadoAlCadete === true);
    }

    if (filter === "pending") {
      return ventas.filter(isCadetePaymentPending);
    }

    return ventas;
  }, [filter, ventas]);

  const pendingSummary = useMemo(
    () => summarizeCadeteDeliveryPayments(ventas.filter(isCadetePaymentPending)),
    [ventas],
  );

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
              : "0.00 UYU"}
          </Text>
          <Text style={[styles.heroText, { color: palette.muted }]} variant="bodyMedium">
            Pendiente a cobrar por entregas de comercio asignadas a tu usuario.
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
        subtitle="Pagos y entregas de comercio"
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
            <CadeteDeliveryCard palette={palette} theme={theme} venta={item} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  cardDivider: {
    marginVertical: 2,
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
