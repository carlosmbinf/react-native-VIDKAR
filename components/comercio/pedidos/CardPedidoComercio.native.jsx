import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, Chip, Divider, Surface, Text, useTheme } from "react-native-paper";

import {
    TiendasComercioCollection,
} from "../../collections/collections";
import SlideToConfirm from "../../empresa/screens/pedidos/components/SlideToConfirm.native";
import MapaPedidos from "../maps/MapaPedidos";
import {
    convertMoney,
    formatMoney,
    getCadeteSliderConfig,
    getCadeteStatusText,
    getCadeteStep,
    getNextCadeteStatus,
    getSubtotalProductos,
    resolveCoordinatePair
} from "./cadetePedidoUtils";
import PedidoStepper from "./components/PedidoStepper";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const CADETE_TIENDA_FIELDS = {
  _id: 1,
  cordenadas: 1,
  coordenadas: 1,
  descripcion: 1,
  name: 1,
  title: 1,
};

const formatAssignmentDate = (value) => {
  if (!value) {
    return "Ahora";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Ahora";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(parsedDate);
};

const getNavigationTarget = (estado, tienda, destinationCoordinates) => {
  if (estado === "PREPARACION_LISTO") {
    return resolveCoordinatePair(tienda);
  }

  return resolveCoordinatePair(destinationCoordinates);
};

const CardPedidoComercio = ({ pedido, venta, cadeteId, onSliderInteractionChange }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [submitting, setSubmitting] = useState(false);
  const comprasEnCarrito = useMemo(
    () => (Array.isArray(venta?.producto?.carritos) ? venta.producto.carritos : []),
    [venta?.producto?.carritos],
  );
  const primerItem = comprasEnCarrito[0] || null;
  const idTienda = primerItem?.idTienda || null;
  const estado = venta?.estado || "PREPARACION_LISTO";
  const sliderConfig = getCadeteSliderConfig(estado);
  const nextStatus = getNextCadeteStatus(estado);
  const currency =
    venta?.monedaPrecioOficial ||
    primerItem?.producto?.monedaPrecio ||
    "CUP";
  const subtotalProductos = useMemo(
    () => getSubtotalProductos(comprasEnCarrito),
    [comprasEnCarrito],
  );
  const totalPedido = Number(venta?.precioOficial) || Number(venta?.cobrado) || subtotalProductos;
  const costoEntregaBase = Number(venta?.producto?.comisiones?.costoTotalEntrega) || 0;
  const costoPorKmBase = Number(
    venta?.producto?.comisiones?.desglosePorTienda?.[0]?.costoPorKm,
  ) || 0;
  const monedaCostoEntrega = venta?.producto?.comisiones?.monedaCostoEntrega || "USD";
  const [costoEntrega, setCostoEntrega] = useState(costoEntregaBase);
  const [costoPorKm, setCostoPorKm] = useState(costoPorKmBase);
  const comentario = primerItem?.comentario?.trim() || "";
  const destinationCoordinates = resolveCoordinatePair(primerItem?.coordenadas);
  const tiendaState = Meteor.useTracker(() => {
    if (!idTienda) {
      return { tienda: null, tiendaReady: true };
    }

    const handle = Meteor.subscribe("tiendas", { _id: idTienda }, {
      fields: CADETE_TIENDA_FIELDS,
    });
    return {
      tienda:
        TiendasComercioCollection.findOne(
          { _id: idTienda },
          { fields: CADETE_TIENDA_FIELDS },
        ) || null,
      tiendaReady: handle.ready(),
    };
  }, [idTienda]);

  const tienda = tiendaState?.tienda;
  const tiendaName =
    tienda?.title || tienda?.name || (tiendaState?.tiendaReady ? "Tienda sin nombre" : "Cargando tienda...");
  const tiendaDescription =
    tienda?.descripcion || tienda?.subtitle || "Pedido listo para gestionar";
  const isPaid = Boolean(venta?.isCobrado);
  const isCompact = width < 390;
  const palette = useMemo(
    () => ({
      border: theme.dark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
      cardSoft: theme.dark ? "rgba(148, 163, 184, 0.1)" : "rgba(15, 23, 42, 0.03)",
      completedBackground: theme.dark ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 197, 94, 0.1)",
      completedBorder: theme.dark ? "rgba(74, 222, 128, 0.24)" : "rgba(34, 197, 94, 0.18)",
      completedText: theme.dark ? "#bbf7d0" : "#166534",
      metaChipBackground: theme.dark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.06)",
      metaChipText: theme.dark ? theme.colors.onSurface : "#334155",
      muted: theme.colors.onSurfaceVariant,
      primaryText: theme.colors.onSurface,
      routeAccent: sliderConfig.backgroundColor,
    }),
    [sliderConfig.backgroundColor, theme.colors.onSurface, theme.colors.onSurfaceVariant, theme.dark],
  );

  useEffect(() => {
    let cancelled = false;

    setCostoEntrega(costoEntregaBase);
    setCostoPorKm(costoPorKmBase);

    const resolveMonetaryValues = async () => {
      try {
        const [deliveryValue, deliveryPerKmValue] = await Promise.all([
          convertMoney(costoEntregaBase, monedaCostoEntrega, monedaCostoEntrega),
          convertMoney(costoPorKmBase, "CUP", monedaCostoEntrega),
        ]);

        if (!cancelled) {
          setCostoEntrega(Number(deliveryValue) || 0);
          setCostoPorKm(Number(deliveryPerKmValue) || 0);
        }
      } catch (error) {
        console.warn(
          "[CardPedidoComercio] No se pudieron convertir los valores de entrega:",
          error,
        );

        if (!cancelled) {
          setCostoEntrega(costoEntregaBase);
          setCostoPorKm(costoPorKmBase);
        }
      }
    };

    resolveMonetaryValues();

    return () => {
      cancelled = true;
    };
  }, [costoEntregaBase, costoPorKmBase, monedaCostoEntrega]);

  const openMaps = useCallback(async () => {
    const coordinates = getNavigationTarget(estado, tienda, primerItem?.coordenadas);

    if (!coordinates) {
      Alert.alert(
        "Ruta no disponible",
        "Todavía no hay coordenadas válidas para abrir la navegación de este pedido.",
      );
      return;
    }

    const destinationUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?ll=${coordinates.latitude},${coordinates.longitude}&q=Destino`
        : `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;

    try {
      await Linking.openURL(destinationUrl);
    } catch (error) {
      Alert.alert(
        "No se pudo abrir el mapa",
        error?.message || "Inténtalo de nuevo en unos segundos.",
      );
    }
  }, [estado, primerItem?.coordenadas, tienda]);

  const handleAdvancePedido = useCallback(() => {
    if (!nextStatus || !cadeteId) {
      return;
    }

    const executeAdvance = () => {
      setSubmitting(true);

      Meteor.call(
        "comercio.pedidos.avanzar",
        { idPedido: venta._id, idCadete: cadeteId },
        (error) => {
          setSubmitting(false);

          if (error) {
            Alert.alert(
              "No se pudo actualizar el pedido",
              error.reason ||
                "La entrega no pudo avanzar al siguiente estado. Inténtalo otra vez.",
            );
            return;
          }

          if (nextStatus === "ENTREGADO") {
            Alert.alert(
              "Pedido entregado",
              "La entrega quedó cerrada correctamente para este pedido.",
            );
          }
        },
      );
    };

    if (nextStatus === "ENTREGADO") {
      Alert.alert(
        "Confirmar entrega final",
        "Esta acción marcará el pedido como entregado al cliente.",
        [
          {
            style: "cancel",
            text: "Cancelar",
          },
          {
            text: "Entregar",
            onPress: executeAdvance,
          },
        ],
      );
      return;
    }

    executeAdvance();
  }, [cadeteId, nextStatus, venta?._id]);

  if (!venta || !comprasEnCarrito.length) {
    return null;
  }

  return (
    <Surface elevation={2} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.title} variant="titleMedium">
            {tiendaName}
          </Text>
          <Text numberOfLines={2} style={[styles.subtitle, { color: palette.muted }]} variant="bodySmall">
            {tiendaDescription}
          </Text>
        </View>

        <Chip
          compact
          style={[styles.stateChip, { backgroundColor: `${sliderConfig.backgroundColor}18` }]}
          textStyle={[styles.stateChipText, { color: sliderConfig.backgroundColor }]}
        >
          {getCadeteStatusText(estado)}
        </Chip>
      </View>

      <View style={styles.metaRow}>
        <Chip compact icon="receipt-text-outline" style={[styles.metaChip, { backgroundColor: palette.metaChipBackground }]} textStyle={[styles.metaChipText, { color: palette.metaChipText }]}>
          Orden {String(venta._id).slice(-6).toUpperCase()}
        </Chip>
        <Chip
          compact
          icon={isPaid ? "cash-check" : "cash-clock"}
          style={[styles.metaChip, { backgroundColor: palette.metaChipBackground }]}
          textStyle={[styles.metaChipText, { color: palette.metaChipText }]}
        >
          {isPaid ? "Pago confirmado" : "Pago pendiente"}
        </Chip>
        <Chip compact icon="clock-outline" style={[styles.metaChip, { backgroundColor: palette.metaChipBackground }]} textStyle={[styles.metaChipText, { color: palette.metaChipText }]}>
          Asignado {formatAssignmentDate(pedido?.fechaAsignacion)}
        </Chip>
      </View>

      <Divider style={styles.divider} />

      <PedidoStepper currentStep={getCadeteStep(estado)} />

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: palette.cardSoft, minWidth: isCompact ? "48%" : 96 }]}>
          <Text style={[styles.metricLabel, { color: palette.muted }]} variant="labelMedium">
            Ganancias por la entrega
          </Text>
          <Text style={[styles.metricValue, { color: palette.primaryText }]} variant="titleMedium">
            {formatMoney(costoEntrega, monedaCostoEntrega)}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>

        <View style={[styles.metricCard, { backgroundColor: palette.cardSoft, minWidth: isCompact ? "48%" : 96 }]}> 
          <Text style={[styles.metricLabel, { color: palette.muted }]} variant="labelMedium">
            KM calculados
          </Text>
          <Text style={[styles.metricValue, { color: palette.primaryText }]} variant="titleMedium">
            {venta?.producto?.comisiones?.desglosePorTienda?.[0]?.distanciaKm}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: palette.cardSoft, minWidth: isCompact ? "48%" : 96 }]}> 
          <Text style={[styles.metricLabel, { color: palette.muted }]} variant="labelMedium">
            Costo por KM
          </Text>
          <Text style={[styles.metricValue, { color: palette.primaryText }]} variant="titleMedium">
            {costoPorKmBase ? formatMoney(costoPorKm, monedaCostoEntrega) : "N/A"}
          </Text>
        </View>

      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons color="#13803d" name="package-variant-closed" size={18} />
          <Text style={styles.sectionTitle} variant="titleSmall">
            Productos del pedido
          </Text>
        </View>
        {comprasEnCarrito.map((item, index) => {
          const itemQuantity = Number(item?.cantidad) || 1;
          const itemUnitPrice = Number(item?.producto?.precio) || 0;
          const itemCurrency = item?.producto?.monedaPrecio || currency;

          return (
            <View key={`${item?._id || item?.producto?._id || index}`} style={styles.itemRow}>
              <View style={styles.itemCopy}>
                <Text numberOfLines={2} style={[styles.itemName, { color: palette.primaryText }]} variant="bodyMedium">
                  {item?.producto?.name || "Producto"}
                </Text>
                <Text style={[styles.itemSubtitle, { color: palette.muted }]} variant="bodySmall">
                  {itemQuantity} unidad{itemQuantity === 1 ? "" : "es"}
                </Text>
              </View>

                  <Text style={[styles.itemPrice, { color: palette.primaryText }]} variant="bodyMedium">
                {formatMoney(itemUnitPrice * itemQuantity, itemCurrency)}
              </Text>
            </View>
          );
        })}
      </View>

      {comentario ? (
        <View style={[styles.commentCard, { backgroundColor: palette.cardSoft }]}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons color={palette.muted} name="message-text-outline" size={18} />
            <Text style={[styles.commentTitle, { color: palette.primaryText }]} variant="titleSmall">
              Nota del cliente
            </Text>
          </View>
          <Text style={[styles.commentText, { color: palette.muted }]} variant="bodyMedium">
            {comentario}
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons color={palette.routeAccent} name="map-marker-path" size={18} />
            <Text style={styles.sectionTitle} variant="titleSmall">
              Ruta de entrega
            </Text>
          </View>

          <Button
            compact
            icon="navigation-variant-outline"
            mode="text"
            onPress={openMaps}
          >
            Abrir ruta
          </Button>
        </View>

        <MapaPedidos puntoAIr={destinationCoordinates} puntoPartida={tienda} />
      </View>

      {nextStatus ? (
        <View style={styles.sliderWrap}>
          <Text style={styles.sliderTitle} variant="labelLarge">
            {sliderConfig.title}
          </Text>
          <SlideToConfirm
            backgroundColor={sliderConfig.backgroundColor}
            disabled={submitting}
            icon={sliderConfig.icon}
            onInteractionChange={onSliderInteractionChange}
            onConfirm={handleAdvancePedido}
            text={submitting ? "Actualizando pedido..." : sliderConfig.text}
          />
        </View>
      ) : (
        <View style={[styles.completedCard, { backgroundColor: palette.completedBackground, borderColor: palette.completedBorder }]}>
          <MaterialCommunityIcons color="#16a34a" name="check-decagram" size={22} />
          <Text style={[styles.completedText, { color: palette.completedText }]} variant="bodyMedium">
            Esta entrega ya se encuentra completada.
          </Text>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    gap: 18,
    marginBottom: 18,
    overflow: "hidden",
    padding: 20,
  },
  commentCard: {
    borderRadius: 22,
    gap: 10,
    padding: 16,
  },
  commentText: {
    lineHeight: 22,
  },
  commentTitle: {
    fontWeight: "800",
  },
  completedCard: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    padding: 16,
  },
  completedText: {
    fontWeight: "700",
  },
  divider: {
    backgroundColor: "rgba(148, 163, 184, 0.22)",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  itemName: {
    fontWeight: "700",
  },
  itemPrice: {
    fontWeight: "800",
  },
  itemRow: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaChip: {
  },
  metaChipText: {
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    borderRadius: 20,
    flex: 1,
    gap: 6,
    minWidth: 96,
    padding: 14,
  },
  metricLabel: {
    textTransform: "uppercase",
  },
  metricValue: {
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: "800",
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  sliderTitle: {
    // color: "#0f172a",
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sliderWrap: {
    gap: 8,
  },
  stateChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  stateChipText: {
    fontWeight: "800",
  },
  subtitle: {
    lineHeight: 20,
  },
  title: {
    fontWeight: "800",
  },
});

export default CardPedidoComercio;