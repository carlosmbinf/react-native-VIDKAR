import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { ActivityIndicator, Button, Chip, Surface, Text, useTheme } from "react-native-paper";

import useCadeteLocationTracking from "../../../hooks/useCadeteLocationTracking";
import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import {
    ColaCadetesPorTiendasComercioCollection,
    PedidosAsignadosComercioCollection,
    VentasRechargeCollection,
} from "../../collections/collections";
import CardPedidoComercio from "./CardPedidoComercio.native";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const PEDIDOS_ASIGNADOS_FIELDS = {
  _id: 1,
  createdAt: 1,
  entregado: 1,
  fechaAsignacion: 1,
  idVentas: 1,
  userId: 1,
};

const CADETE_QUEUE_FIELDS = {
  cadeteId: 1,
  idTienda: 1,
};

const CADETE_VENTA_FIELDS = {
  _id: 1,
  cobrado: 1,
  estado: 1,
  isCobrado: 1,
  monedaPrecioOficial: 1,
  precioOficial: 1,
  "producto.carritos._id": 1,
  "producto.carritos.cantidad": 1,
  "producto.carritos.comentario": 1,
  "producto.carritos.coordenadas": 1,
  "producto.carritos.idTienda": 1,
  "producto.carritos.producto.monedaPrecio": 1,
  "producto.carritos.producto.name": 1,
  "producto.carritos.producto.precio": 1,
  "producto.comisiones.costoTotalEntrega": 1,
  "producto.comisiones.desglosePorTienda.costoPorKm": 1,
  "producto.comisiones.desglosePorTienda.distanciaKm": 1,
  "producto.comisiones.monedaCostoEntrega": 1,
};

const formatLastSyncTime = (timestamp) => {
  if (!timestamp) {
    return "Sin sincronización reciente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
};

const HomePedidosComercio = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [sliderInteractionActive, setSliderInteractionActive] = useState(false);
  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const dataReady = useDeferredScreenData();
  const cadeteData = Meteor.useTracker(() => {
    if (!dataReady || !currentUserId) {
      return {
        pedidosConVentas: [],
        queueEntries: [],
        ready: false,
      };
    }

    const pedidosSelector = {
      entregado: false,
      userId: currentUserId,
    };
    const queueSelector = {
      cadeteId: currentUserId,
    };
    const pedidosHandle = Meteor.subscribe("pedidosAsignados", pedidosSelector, {
      fields: PEDIDOS_ASIGNADOS_FIELDS,
    });
    const queueHandle = Meteor.subscribe("colacadetesxtiendas", queueSelector, {
      fields: CADETE_QUEUE_FIELDS,
    });
    const pedidos = PedidosAsignadosComercioCollection.find(pedidosSelector, {
      fields: PEDIDOS_ASIGNADOS_FIELDS,
      sort: { fechaAsignacion: -1, createdAt: -1 },
    }).fetch();
    const ventasIds = pedidos.map((pedido) => pedido.idVentas).filter(Boolean);
    const ventasHandle = ventasIds.length
      ? Meteor.subscribe("ventasRecharge", { _id: { $in: ventasIds } }, {
          fields: CADETE_VENTA_FIELDS,
        })
      : null;
    const ventasById = ventasIds.length
      ? VentasRechargeCollection.find(
          { _id: { $in: ventasIds } },
          { fields: CADETE_VENTA_FIELDS },
        ).fetch().reduce(
          (accumulator, venta) => {
            accumulator[venta._id] = venta;
            return accumulator;
          },
          {},
        )
      : {};
    const pedidosConVentas = pedidos
      .map((pedido) => ({
        ...pedido,
        venta: ventasById[pedido.idVentas] || null,
      }))
      .filter((pedido) => Boolean(pedido.venta));
    const queueEntries = ColaCadetesPorTiendasComercioCollection.find(
      queueSelector,
      { fields: CADETE_QUEUE_FIELDS },
    ).fetch();

    return {
      pedidosConVentas,
      queueEntries,
      ready:
        pedidosHandle.ready() &&
        queueHandle.ready() &&
        (!ventasHandle || ventasHandle.ready()),
    };
  }, [currentUserId, dataReady]);

  const tracking = useCadeteLocationTracking({
    enabled: Boolean(currentUserId),
    userId: currentUserId,
  });

  const queueStoreCount = useMemo(
    () => new Set((cadeteData.queueEntries || []).map((entry) => entry.idTienda)).size,
    [cadeteData.queueEntries],
  );
  const palette = useMemo(
    () => ({
      background: theme.colors.background,
      chipBackground: theme.dark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.06)",
      chipText: theme.dark ? theme.colors.onSurface : "#334155",
      emptyCopy: theme.colors.onSurfaceVariant,
      emptyTitle: theme.colors.onSurface,
      iconSoft: theme.dark ? "rgba(34, 197, 94, 0.16)" : "rgba(19, 128, 61, 0.1)",
      loadingCopy: theme.colors.onSurfaceVariant,
      loadingTitle: theme.colors.onSurface,
      sectionCopy: theme.colors.onSurfaceVariant,
      sectionTitle: theme.colors.onSurface,
      statusCopy: theme.colors.onSurfaceVariant,
      statusTitle: theme.colors.onSurface,
    }),
    [theme.colors.background, theme.colors.onSurface, theme.colors.onSurfaceVariant, theme.dark],
  );
  const horizontalPadding = width >= 768 ? 24 : 16;
  const maxContentWidth = width >= 1120 ? 980 : undefined;

  const trackingCard = useMemo(() => {
    if (tracking.status === "permission-denied") {
      return {
        accent: "#dc2626",
        actionLabel: "Abrir ajustes",
        actionType: "settings",
        copy: "Activa la ubicación para entrar en la cola automática de tiendas cercanas.",
        icon: "map-marker-off-outline",
        title: "Ubicación requerida",
      };
    }

    if (tracking.status === "error") {
      return {
        accent: "#ea580c",
        actionLabel: "Reintentar",
        actionType: "refresh",
        copy:
          tracking.error ||
          "No se pudo sincronizar la ubicación actual. Reintenta para seguir disponible.",
        icon: "alert-circle-outline",
        title: "Sincronización pendiente",
      };
    }

    if (tracking.status === "tracking") {
      return {
        accent: "#13803d",
        actionLabel: "Actualizar ubicación",
        actionType: "refresh",
        copy:
          queueStoreCount > 0
            ? `Servicio activo incluso en segundo plano. Disponible cerca de ${queueStoreCount} tienda${queueStoreCount === 1 ? "" : "s"}.`
            : "Ubicación activa en segundo plano. El sistema te asignará pedidos cuando haya uno listo cerca de ti.",
        icon: "crosshairs-gps",
        title: "Seguimiento activo",
      };
    }

    return {
      accent: "#2563eb",
      actionLabel: "Actualizar ubicación",
      actionType: "refresh",
      copy: "Preparando el seguimiento del cadete para activar tu disponibilidad.",
      icon: "progress-clock",
      title: "Iniciando disponibilidad",
    };
  }, [queueStoreCount, tracking.error, tracking.status]);

  const handleStatusAction = useCallback(() => {
    if (trackingCard.actionType === "settings") {
      tracking.openLocationSettings();
      return;
    }

    tracking.refreshLocation();
  }, [tracking, trackingCard.actionType]);

  const onRefresh = useCallback(() => {
    if (!currentUserId) {
      return;
    }

    setRefreshing(true);
    tracking.refreshLocation();

    Meteor.call(
      "comercio.pedidos.getPedidosCadete",
      { cadeteId: currentUserId },
      () => {
        setRefreshing(false);
      },
    );
  }, [currentUserId, tracking]);

  if (!cadeteData.ready) {
    return (
      <View style={styles.loadingContainer}>
        <Surface style={styles.loadingCard}>
          <ActivityIndicator color="#13803d" size="large" />
          <Text style={[styles.loadingTitle, { color: palette.loadingTitle }]} variant="titleMedium">
            Cargando pedidos del cadete
          </Text>
          <Text style={[styles.loadingCopy, { color: palette.loadingCopy }]} variant="bodySmall">
            Estamos sincronizando tus asignaciones activas y tu disponibilidad.
          </Text>
        </Surface>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: palette.background,
          paddingHorizontal: horizontalPadding,
          width: "100%",
        },
      ]}
      refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
      scrollEnabled={!sliderInteractionActive}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.innerContainer, maxContentWidth ? { maxWidth: maxContentWidth } : null]}>
      <Surface style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIconWrap, { backgroundColor: `${trackingCard.accent}16` }]}>
            <MaterialCommunityIcons color={trackingCard.accent} name={trackingCard.icon} size={22} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: palette.statusTitle }]} variant="titleSmall">
              {trackingCard.title}
            </Text>
            <Text style={[styles.statusText, { color: palette.statusCopy }]} variant="bodySmall">
              {trackingCard.copy}
            </Text>
          </View>
        </View>

        <View style={styles.statusMetaRow}>
          <Chip compact icon="package-variant" style={[styles.statusChip, { backgroundColor: palette.chipBackground }]} textStyle={[styles.statusChipText, { color: palette.chipText }]}> 
            {cadeteData.pedidosConVentas.length} pedido{cadeteData.pedidosConVentas.length === 1 ? "" : "s"} activo{cadeteData.pedidosConVentas.length === 1 ? "" : "s"}
          </Chip>
          <Chip compact icon="store-marker-outline" style={[styles.statusChip, { backgroundColor: palette.chipBackground }]} textStyle={[styles.statusChipText, { color: palette.chipText }]}> 
            {queueStoreCount} tienda{queueStoreCount === 1 ? "" : "s"} en cola
          </Chip>
          <Chip compact icon="clock-outline" style={[styles.statusChip, { backgroundColor: palette.chipBackground }]} textStyle={[styles.statusChipText, { color: palette.chipText }]}> 
            {formatLastSyncTime(tracking.lastSentAt || tracking.lastLocation?.timestamp)}
          </Chip>
          <Chip compact icon="cellphone-marker" style={[styles.statusChip, { backgroundColor: palette.chipBackground }]} textStyle={[styles.statusChipText, { color: palette.chipText }]}> 
            {tracking.trackingMode === "background" ? "Segundo plano" : "Seguimiento activo"}
          </Chip>
        </View>
      </Surface>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.sectionTitle }]} variant="headlineSmall">
          Mis pedidos activos
        </Text>
        <Text style={[styles.sectionCopy, { color: palette.sectionCopy }]} variant="bodySmall">
          Avanza cada entrega paso a paso y usa la ruta del mapa según el estado del pedido.
        </Text>
      </View>

      {cadeteData.pedidosConVentas.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <View style={[styles.emptyIconWrap, { backgroundColor: palette.iconSoft }]}> 
            <MaterialCommunityIcons color="#13803d" name="truck-delivery-outline" size={28} />
          </View>
          <Text style={[styles.emptyTitle, { color: palette.emptyTitle }]} variant="titleMedium">
            No tienes pedidos asignados
          </Text>
          <Text style={[styles.emptyCopy, { color: palette.emptyCopy }]} variant="bodyMedium">
            {queueStoreCount > 0
              ? `Ya apareces disponible cerca de ${queueStoreCount} tienda${queueStoreCount === 1 ? "" : "s"}. El próximo pedido listo se te asignará automáticamente.`
              : "Mantén tu ubicación activa para entrar en la cola automática de reparto y recibir nuevas asignaciones."}
          </Text>
          <Button icon="refresh" mode="outlined" onPress={onRefresh}>
            Actualizar estado
          </Button>
        </Surface>
      ) : (
        <View style={styles.cardsWrap}>
          {cadeteData.pedidosConVentas.map((pedido) => (
            <CardPedidoComercio
              cadeteId={currentUserId}
              key={pedido._id}
              onSliderInteractionChange={setSliderInteractionActive}
              pedido={pedido}
              venta={pedido.venta}
            />
          ))}
        </View>
      )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cardsWrap: {
    gap: 0,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 28,
    gap: 12,
    marginTop: 6,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyCopy: {
    lineHeight: 23,
    textAlign: "center",
  },
  emptyIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(19, 128, 61, 0.1)",
    borderRadius: 22,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  innerContainer: {
    alignSelf: "center",
    width: "100%",
    paddingTop: 20,
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 28,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  loadingCopy: {
    lineHeight: 20,
    textAlign: "center",
  },
  loadingTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  sectionCopy: {
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 4,
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: "800",
  },
  statusButton: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusCard: {
    // backgroundColor: "#ffffff",
    borderRadius: 28,
    gap: 16,
    marginBottom: 20,
    padding: 18,
  },
  statusChipText: {
    fontWeight: "700",
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  statusHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  statusIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  statusMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusText: {
    lineHeight: 20,
  },
  statusTitle: {
    fontWeight: "800",
  },
});

export default HomePedidosComercio;