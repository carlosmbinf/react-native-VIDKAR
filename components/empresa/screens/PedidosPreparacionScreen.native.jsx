import { useMemo, useState } from "react";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { Alert, FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import { Appbar, Button, Surface, Text, TextInput, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import { TiendasComercioCollection, VentasRechargeCollection } from "../../collections/collections";
import EmpresaTopBar from "../components/EmpresaTopBar.native";
import SlideToConfirm from "../screens/pedidos/components/SlideToConfirm.native";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const STATUS_META = {
  CADETEENDESTINO: {
    description: "El pedido ya está en la etapa final de entrega con el cadete.",
    label: "Cadete en destino",
    sliderColor: "#2563eb",
  },
  CADETEENLOCAL: {
    description: "El cadete ya recogió o está listo para recoger el pedido en el local.",
    label: "Cadete en local",
    sliderColor: "#2563eb",
  },
  ENCAMINO: {
    description: "El pedido ya salió del local y va en camino al cliente.",
    label: "En camino",
    sliderColor: "#2563eb",
  },
  PENDIENTE: {
    description: "El pedido ya fue cobrado y todavía no se marcó en preparación.",
    label: "Pendiente",
    sliderColor: "#f59e0b",
  },
  PREPARACION_LISTO: {
    description: "Todo está listo para el cadete. Solo queda esperar su asignación o recogida.",
    label: "Listo para recoger",
    sliderColor: "#16a34a",
  },
  PREPARANDO: {
    description: "La tienda ya está preparando el pedido y puede marcarlo listo cuando termine.",
    label: "Preparando",
    sliderColor: "#2563eb",
  },
};

const hexToRgba = (color, alpha) => {
  const normalized = typeof color === "string" ? color.replace("#", "") : "";

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return color;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getGridColumns = (width) => {
  if (width >= 1120) {
    return 2;
  }

  return 1;
};

const PREPARACION_TIENDA_FIELDS = {
  _id: 1,
  title: 1,
};

const PREPARACION_VENTA_FIELDS = {
  _id: 1,
  createdAt: 1,
  estado: 1,
  idOrder: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  "producto.carritos._id": 1,
  "producto.carritos.cantidad": 1,
  "producto.carritos.cobrarUSD": 1,
  "producto.carritos.comentario": 1,
  "producto.carritos.idTienda": 1,
  "producto.carritos.monedaACobrar": 1,
  "producto.carritos.name": 1,
  "producto.carritos.precio": 1,
  "producto.carritos.tienda.title": 1,
  "producto.carritos.titulo": 1,
  "producto.carritos.type": 1,
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("es", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
};

const formatOrderTotal = (venta) => {
  if (venta?.cobrado == null) {
    return "Sin total confirmado";
  }

  return `${Number(venta.cobrado).toFixed(2)} ${venta?.monedaCobrado || "USD"}`;
};

const canAdvance = (status) => status === "PENDIENTE" || status === "PREPARANDO";

const getSliderLabel = (status) => {
  if (status === "PENDIENTE") {
    return "Desliza para empezar a preparar";
  }

  if (status === "PREPARANDO") {
    return "Desliza para marcarlo listo";
  }

  return "Desliza para continuar";
};

const PedidoPreparacionCard = ({ compact = false, locked, onAdvance, onInteractionChange, palette, pedido }) => {
  const theme = useTheme();
  const statusMeta = STATUS_META[pedido.estado] || STATUS_META.PENDIENTE;
  const statusTint = hexToRgba(statusMeta.sliderColor, theme.dark ? 0.24 : 0.12);
  const statusBorder = hexToRgba(statusMeta.sliderColor, theme.dark ? 0.46 : 0.22);

  return (
    <Surface
      style={[
        styles.orderCard,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          shadowColor: palette.shadowColor,
        },
      ]}
    >
      <View style={styles.orderHeaderRow}>
        <View style={styles.orderTitleWrap}>
          <Text style={{ color: palette.title }} variant="titleMedium">
            Pedido #{String(pedido._id || pedido.idOrder || "").slice(-6)}
          </Text>
          <Text style={{ color: palette.muted }} variant="bodySmall">
            Creado: {formatDate(pedido.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusTint, borderColor: statusBorder }]}> 
          <Text style={{ color: statusMeta.sliderColor }} variant="labelMedium">
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text style={{ color: palette.copy }} variant="bodyMedium">
        {statusMeta.description}
      </Text>

      <View style={styles.summaryGrid}>
        <Surface style={[styles.summaryTile, compact ? styles.summaryTileCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <Text style={{ color: palette.muted }} variant="labelMedium">
            Tiendas
          </Text>
          <Text style={{ color: palette.title }} variant="titleSmall">
            {pedido.storeTitles.join(", ") || "Sin tienda"}
          </Text>
        </Surface>
        <Surface style={[styles.summaryTile, compact ? styles.summaryTileCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <Text style={{ color: palette.muted }} variant="labelMedium">
            Productos
          </Text>
          <Text style={{ color: palette.title }} variant="titleSmall">
            {pedido.itemCount}
          </Text>
        </Surface>
        <Surface style={[styles.summaryTile, compact ? styles.summaryTileCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <Text style={{ color: palette.muted }} variant="labelMedium">
            Pago
          </Text>
          <Text style={{ color: palette.title }} variant="titleSmall">
            {pedido.metodoPago || "No definido"}
          </Text>
        </Surface>
        <Surface style={[styles.summaryTile, compact ? styles.summaryTileCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <Text style={{ color: palette.muted }} variant="labelMedium">
            Total de la orden
          </Text>
          <Text style={{ color: palette.title }} variant="titleSmall">
            {formatOrderTotal(pedido)}
          </Text>
        </Surface>
      </View>

      <View style={styles.orderItemsWrap}>
        <Text style={{ color: palette.title }} variant="titleSmall">
          Productos de tus tiendas
        </Text>
        {pedido.items.map((item, index) => (
          <View key={`${pedido._id}-${item.idTienda}-${item._id || index}`} style={styles.orderItemRow}>
            <View style={[styles.orderItemBullet, { backgroundColor: statusMeta.sliderColor }]} />
            <View style={styles.orderItemCopy}>
              <Text style={{ color: palette.title }} variant="bodyMedium">
                {item.name || item.titulo || "Producto"}
              </Text>
              <Text style={{ color: palette.copy }} variant="bodySmall">
                {(item.cantidad || 1)} x {Number(item.cobrarUSD || item.precio || 0).toFixed(2)} {item.monedaACobrar || pedido.monedaCobrado || "USD"}
              </Text>
              {item.comentario ? (
                <Text style={{ color: palette.copy }} variant="bodySmall">
                  {item.comentario}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {canAdvance(pedido.estado) ? (
        <SlideToConfirm
          backgroundColor={statusMeta.sliderColor}
          disabled={locked}
          onConfirm={() => onAdvance?.(pedido)}
          onInteractionChange={onInteractionChange}
          text={getSliderLabel(pedido.estado)}
        />
      ) : (
        <Surface style={[styles.infoCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <MaterialCommunityIcons
            color={palette.brandStrong}
            name={pedido.estado === "PREPARACION_LISTO" ? "check-circle-outline" : "truck-delivery-outline"}
            size={20}
          />
          <View style={styles.infoCopy}>
            <Text style={{ color: palette.title }} variant="titleSmall">
              Seguimiento en curso
            </Text>
            <Text style={{ color: palette.copy }} variant="bodySmall">
              {statusMeta.description}
            </Text>
          </View>
        </Surface>
      )}
    </Surface>
  );
};

const PedidosPreparacionScreen = ({ onOpenDrawer }) => {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const { contentMaxWidth, horizontalPadding } = useMemo(() => getEmpresaScreenMetrics(width), [width]);
  const numColumns = getGridColumns(width);
  const compactCards = numColumns > 1 || width < 720;

  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const dataReady = useDeferredScreenData();
  const [processingOrderId, setProcessingOrderId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { pedidos, ready, tiendaIds } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { pedidos: [], ready: false, tiendaIds: [] };
    }

    if (!currentUserId) {
      return { pedidos: [], ready: true, tiendaIds: [] };
    }

    const tiendasHandle = Meteor.subscribe("tiendas", { idUser: currentUserId }, {
      fields: PREPARACION_TIENDA_FIELDS,
    });
    const tiendas = TiendasComercioCollection.find(
      { idUser: currentUserId },
      { fields: PREPARACION_TIENDA_FIELDS, sort: { title: 1 } },
    ).fetch();
    const storeIds = tiendas.map((tienda) => tienda._id);
    const storeById = tiendas.reduce((acc, tienda) => {
      acc[tienda._id] = tienda;
      return acc;
    }, {});

    if (!storeIds.length) {
      return { pedidos: [], ready: tiendasHandle.ready(), tiendaIds: [] };
    }

    const selector = {
      "producto.carritos.idTienda": { $in: storeIds },
      "producto.carritos.type": "COMERCIO",
      estado: { $ne: "ENTREGADO" },
      isCancelada: { $ne: true },
      isCobrado: { $ne: false },
    };

    const ventasHandle = Meteor.subscribe("ventasRecharge", selector, {
      fields: PREPARACION_VENTA_FIELDS,
    });
    const ventas = VentasRechargeCollection.find(
      selector,
      { fields: PREPARACION_VENTA_FIELDS, sort: { createdAt: 1 } },
    ).fetch();

    const pedidosResult = ventas
      .map((venta) => {
        const items = Array.isArray(venta?.producto?.carritos)
          ? venta.producto.carritos.filter(
              (item) => item?.type === "COMERCIO" && storeIds.includes(item?.idTienda),
            )
          : [];

        if (!items.length) {
          return null;
        }

        const storeTitles = [
          ...new Set(
            items
              .map((item) => item?.tienda?.title || storeById[item?.idTienda]?.title || "")
              .filter(Boolean),
          ),
        ];

        return {
          ...venta,
          itemCount: items.reduce((sum, item) => sum + Number(item?.cantidad || 1), 0),
          items,
          storeTitles,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const priority = {
          PENDIENTE: 0,
          PREPARANDO: 1,
          PREPARACION_LISTO: 2,
          CADETEENLOCAL: 3,
          ENCAMINO: 4,
          CADETEENDESTINO: 5,
        };

        return (priority[left.estado] || 99) - (priority[right.estado] || 99) ||
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      });

    return {
      pedidos: pedidosResult,
      ready: tiendasHandle.ready() && ventasHandle.ready(),
      tiendaIds: storeIds,
    };
  }, [currentUserId, dataReady]);

  const visiblePedidos = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return pedidos;
    }

    return pedidos.filter((pedido) => {
      const haystack = `${pedido?._id || ""} ${pedido?.estado || ""} ${pedido?.storeTitles?.join(" ") || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [pedidos, searchQuery]);

  const statusCounts = useMemo(() => {
    return pedidos.reduce(
      (acc, pedido) => {
        acc.total += 1;
        if (pedido.estado === "PENDIENTE") {
          acc.pendientes += 1;
        } else if (pedido.estado === "PREPARANDO") {
          acc.preparando += 1;
        } else if (pedido.estado === "PREPARACION_LISTO") {
          acc.listos += 1;
        }
        return acc;
      },
      { listos: 0, pendientes: 0, preparando: 0, total: 0 },
    );
  }, [pedidos]);
  const listShellStyle = useMemo(
    () => [styles.listShell, contentMaxWidth ? { maxWidth: contentMaxWidth } : null],
    [contentMaxWidth],
  );
  const singleColumnCardStyle = numColumns === 1 && contentMaxWidth
    ? { alignSelf: "center", maxWidth: contentMaxWidth, width: "100%" }
    : null;

  const handleAdvanceOrder = (pedido) => {
    setProcessingOrderId(pedido._id);

    Meteor.call("comercio.pedidos.avanzar", { idPedido: pedido._id }, (error, result) => {
      setProcessingOrderId("");

      const message =
        error?.reason ||
        error?.message ||
        (result && typeof result === "object" && !Array.isArray(result) && result.success !== true
          ? result.reason || result.message || (typeof result.error === "string" ? result.error : "")
          : "");

      if (message) {
        Alert.alert("No se pudo avanzar el pedido", message);
      }
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Surface
        style={[
          styles.heroCard,
          {
            backgroundColor: palette.hero,
            borderColor: palette.border,
            shadowColor: palette.shadowColor,
          },
        ]}
      >
        <View style={styles.heroCopy}>
          <Text style={{ color: palette.title }} variant="headlineSmall">
            Preparación de pedidos
          </Text>
          <Text style={{ color: palette.copy }} variant="bodyMedium">
            Supervisa los pedidos de tus tiendas, marca el avance de preparación y deja listos los pedidos para que el cadete los recoja.
          </Text>
        </View>
        <View style={styles.summaryGrid}> 
          <Surface style={[styles.summaryTile, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}><Text style={{ color: palette.title }} variant="titleLarge">{statusCounts.total}</Text><Text style={{ color: palette.muted }} variant="bodySmall">Activos</Text></Surface>
          <Surface style={[styles.summaryTile, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}><Text style={{ color: palette.title }} variant="titleLarge">{statusCounts.pendientes}</Text><Text style={{ color: palette.muted }} variant="bodySmall">Pendientes</Text></Surface>
          <Surface style={[styles.summaryTile, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}><Text style={{ color: palette.title }} variant="titleLarge">{statusCounts.preparando}</Text><Text style={{ color: palette.muted }} variant="bodySmall">Preparando</Text></Surface>
          <Surface style={[styles.summaryTile, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}><Text style={{ color: palette.title }} variant="titleLarge">{statusCounts.listos}</Text><Text style={{ color: palette.muted }} variant="bodySmall">Listos</Text></Surface>
        </View>
      </Surface>
      <TextInput
        activeOutlineColor={palette.brand}
        left={<TextInput.Icon color={palette.muted} icon="magnify" />}
        mode="outlined"
        onChangeText={setSearchQuery}
        outlineColor={palette.borderStrong}
        placeholder="Buscar por ID, estado o tienda"
        style={[styles.searchInput, { backgroundColor: palette.input }]}
        textColor={palette.title}
        theme={{ colors: { onSurfaceVariant: palette.muted } }}
        value={searchQuery}
      />
    </View>
  );

  const renderEmpty = () => {
    if (!ready) {
      return null;
    }

    if (!tiendaIds.length) {
      return (
        <Surface style={[styles.emptyCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <MaterialCommunityIcons color={palette.brandStrong} name="storefront-outline" size={44} />
          <Text style={{ color: palette.title }} variant="headlineSmall">
            Aún no tienes tiendas
          </Text>
          <Text style={[styles.emptyCopy, { color: palette.copy }]} variant="bodyMedium">
            Crea tu primera tienda para empezar a recibir pedidos en el modo empresa.
          </Text>
          <Button buttonColor={palette.brandSoft} mode="contained-tonal" onPress={() => router.push("/(empresa)/MisTiendas")} textColor={palette.brandStrong}>
            Ir a mis tiendas
          </Button>
        </Surface>
      );
    }

    return (
      <Surface style={[styles.emptyCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
        <MaterialCommunityIcons color={palette.brandStrong} name="clipboard-check-outline" size={44} />
        <Text style={{ color: palette.title }} variant="headlineSmall">
          Sin pedidos por preparar
        </Text>
        <Text style={[styles.emptyCopy, { color: palette.copy }]} variant="bodyMedium">
          Cuando llegue un pedido pago para alguna de tus tiendas, aparecerá aquí para que puedas gestionarlo.
        </Text>
      </Surface>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <EmpresaTopBar
        onOpenDrawer={onOpenDrawer}
        rightActions={<Appbar.Action icon="refresh" onPress={handleRefresh} />}
        subtitle="Pedidos de comercio"
        title="Preparación"
      />

      <FlatList
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        data={visiblePedidos}
        key={numColumns}
        keyExtractor={(item) => item._id}
        numColumns={numColumns}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
        renderItem={({ item }) => (
          <View
            style={[
              styles.cardCell,
              numColumns > 1 ? styles.cardCellMultiColumn : null,
              singleColumnCardStyle,
            ]}
          >
            <PedidoPreparacionCard
              compact={compactCards}
              locked={processingOrderId === item._id}
              onAdvance={handleAdvanceOrder}
              onInteractionChange={(interacting) => setScrollEnabled(!interacting)}
              palette={palette}
              pedido={item}
            />
          </View>
        )}
        scrollEnabled={scrollEnabled}
        style={listShellStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardCell: {
    width: "100%",
  },
  cardCellMultiColumn: {
    flex: 1,
  },
  columnWrapper: {
    gap: 16,
  },
  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyCopy: {
    opacity: 0.82,
    textAlign: "center",
  },
  headerContent: {
    gap: 16,
    marginBottom: 20,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  heroCopy: {
    gap: 8,
  },
  infoCard: {
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  listContent: {
    flexGrow: 1,
    gap: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  listShell: {
    alignSelf: "center",
    width: "100%",
  },
  orderCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 16,
    height: "100%",
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  orderHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  orderItemBullet: {
    borderRadius: 999,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  orderItemCopy: {
    flex: 1,
    gap: 2,
  },
  orderItemRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  orderItemsWrap: {
    gap: 10,
  },
  orderTitleWrap: {
    flex: 1,
    gap: 4,
  },
  screen: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: "transparent",
  },
  statusPill: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryTile: {
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 18,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryTileCompact: {
    flexBasis: "100%",
  },
});

export default PedidosPreparacionScreen;