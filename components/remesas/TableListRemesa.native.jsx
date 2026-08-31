import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Chip,
    DataTable,
    Divider,
    IconButton,
    Snackbar,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import DrawerBottom from "../drawer/DrawerBottom.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const REMESA_LIST_FIELDS = {
  _id: 1,
  cobrado: 1,
  comentario: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  precioOficial: 1,
  "producto.carritos._id": 1,
  "producto.carritos.cancelado": 1,
  "producto.carritos.comentario": 1,
  "producto.carritos.cobrarUSD": 1,
  "producto.carritos.direccionCuba": 1,
  "producto.carritos.entregado": 1,
  "producto.carritos.monedaACobrar": 1,
  "producto.carritos.monedaRecibirEnCuba": 1,
  "producto.carritos.nombre": 1,
  "producto.carritos.recibirEnCuba": 1,
  "producto.carritos.status": 1,
  "producto.carritos.tarjetaCUP": 1,
  "producto.carritos.type": 1,
};

const estadoConfig = (estado, isDark) => {
  switch (estado) {
    case "ENTREGADO":
      return {
        bg: isDark ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 197, 94, 0.12)",
        border: isDark ? "rgba(74, 222, 128, 0.28)" : "rgba(34, 197, 94, 0.25)",
        color: isDark ? "#4ade80" : "#16a34a",
        label: "Entregado",
      };
    case "PENDIENTE_ENTREGA":
      return {
        bg: isDark ? "rgba(245, 158, 11, 0.16)" : "rgba(245, 158, 11, 0.12)",
        border: isDark ? "rgba(251, 191, 36, 0.28)" : "rgba(245, 158, 11, 0.25)",
        color: isDark ? "#fbbf24" : "#d97706",
        label: "Pendiente",
      };
    case "CANCELADO":
      return {
        bg: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(239, 68, 68, 0.12)",
        border: isDark ? "rgba(248, 113, 113, 0.28)" : "rgba(239, 68, 68, 0.25)",
        color: isDark ? "#f87171" : "#dc2626",
        label: "Cancelado",
      };
    case "PENDIENTE_PAGO":
      return {
        bg: isDark ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.12)",
        border: isDark ? "rgba(96, 165, 250, 0.28)" : "rgba(59, 130, 246, 0.25)",
        color: isDark ? "#60a5fa" : "#2563eb",
        label: "Pend. Pago",
      };
    default:
      return {
        bg: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(100, 116, 139, 0.12)",
        border: isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(100, 116, 139, 0.25)",
        color: isDark ? "#cbd5e1" : "#64748b",
        label: estado || "Desconocido",
      };
  }
};

const getItemsCount = (venta) =>
  venta?.producto?.carritos?.length ||
  venta?.carrito?.length ||
  venta?.producto?.carrito?.length ||
  0;

const getItemsArray = (venta) =>
  (
    venta?.producto?.carritos ||
    venta?.carrito ||
    venta?.producto?.carrito ||
    []
  ).filter((carrito) => carrito.type === "REMESA");

const deriveEstadoVenta = (venta) => {
  const carritos = getItemsArray(venta) || [];
  if (venta?.isCobrado !== true) return "PENDIENTE_PAGO";
  if (carritos.length === 0) return venta?.estado || "PENDIENTE_ENTREGA";

  const hasCancel = carritos.some(
    (carrito) => carrito?.status === "CANCELLED" || carrito?.cancelado === true,
  );
  if (hasCancel) return "CANCELADO";

  const allCompleted = carritos.every(
    (carrito) => carrito?.status === "COMPLETED" || carrito?.entregado === true,
  );
  if (allCompleted) return "ENTREGADO";

  return "PENDIENTE_ENTREGA";
};

const TableListRemesa = () => {
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);
  const { height, width } = useWindowDimensions();
  const isWide = width >= 768;

  const colors = useMemo(
    () => ({
      accent: isDark ? "#38bdf8" : "#0284c7",
      background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
      border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      card: isDark ? "rgba(30, 41, 59, 0.7)" : "#f8fafc",
      chipBg: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
      danger: isDark ? "#f87171" : "#dc2626",
      headerBg: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.8)",
      muted: isDark ? "#94a3b8" : "#64748b",
      primary: isDark ? "#60a5fa" : "#2563eb",
      rowHover: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
      subtle: isDark ? "#64748b" : "#94a3b8",
      success: isDark ? "#4ade80" : "#16a34a",
      successBg: isDark ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.08)",
      surface: isDark ? "#0f172a" : "#ffffff",
      text: isDark ? "#f8fafc" : "#0f172a",
      warning: isDark ? "#fbbf24" : "#d97706",
      warningBg: isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)",
    }),
    [isDark],
  );

  const flexes = useMemo(
    () =>
      isWide
        ? {
            acc: 0.35,
            cobrado: 0.9,
            enviado: 0.9,
            estado: 1.2,
            fecha: 1.4,
            items: 0.6,
            metodo: 1.1,
          }
        : { acc: 0.45, cobrado: 1.1, estado: 1.3, fecha: 1.4 },
    [isWide],
  );

  const isAdmin = Meteor.user()?.profile?.role === "admin" || false;
  const isAdminPrincipal = Meteor.user()?.username === "carlosmbinf" || false;
  const dataReady = useDeferredScreenData();

  const listIdSubordinados = Meteor.useTracker(() => {
    if (!dataReady || !isAdmin) return [];
    Meteor.subscribe(
      "user",
      { bloqueadoDesbloqueadoPor: Meteor.userId() },
      { fields: { _id: 1, bloqueadoDesbloqueadoPor: 1 } },
    );
    return Meteor.users
      .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
      .fetch()
      .map((element) => element._id);
  }, [dataReady, isAdmin, Meteor.userId()]);

  const { loading, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, ventas: [] };
    }

    const sub = Meteor.subscribe(
      "ventasRecharge",
      {
        "producto.carritos.type": "REMESA",
      },
      {
        fields: REMESA_LIST_FIELDS,
      },
    );
    const query = isAdminPrincipal
      ? { "producto.carritos.type": "REMESA" }
      : isAdmin
        ? {
            "producto.carritos.type": "REMESA",
            $or: [
              { userId: Meteor.userId() },
              { userId: { $in: listIdSubordinados } },
            ],
          }
        : { "producto.carritos.type": "REMESA", userId: Meteor.userId() };

    const docs = VentasRechargeCollection.find(query, {
      fields: REMESA_LIST_FIELDS,
      sort: { createdAt: -1 },
    });
    return { loading: !sub.ready(), ventas: docs.fetch() };
  }, [dataReady, JSON.stringify(listIdSubordinados), isAdmin, isAdminPrincipal]);

  const [ventaSel, setVentaSel] = useState(null);
  const [visible, setVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const openDialog = (venta) => {
    setVentaSel(venta);
    setVisible(true);
  };

  const closeDialog = () => {
    setVisible(false);
    setVentaSel(null);
  };

  const copiarTexto = async (texto, label) => {
    if (!texto) return;
    await Clipboard.setStringAsync(String(texto));
    setSnackbarMessage(`✅ ${label} copiado`);
    setSnackbarVisible(true);
  };

  const formatFechaCorta = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(d);
  };

  const formatFechaCompleta = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  };

  const money = (value, moneda = "USD") => {
    const num = Number(value || 0);
    return `${num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
  };

  const maxScrollHeight = Math.max(260, Math.floor(height * 0.72));

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Historial y Resumen de Ventas
          </Text>
          {ventas.length > 0 ? (
            <Chip compact style={{ backgroundColor: colors.chipBg }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
                {ventas.length} total
              </Text>
            </Chip>
          ) : null}
        </View>
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Tabla de todas las órdenes de remesas y detalle por beneficiario
        </Text>
      </View>

      <Surface
        style={[
          styles.tableCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        elevation={1}
      >
        <DataTable>
          <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.headerBg }]}>
            <DataTable.Title style={{ flex: flexes.fecha }}>
              <Text style={[styles.thText, { color: colors.muted }]}>Fecha</Text>
            </DataTable.Title>
            {isWide ? (
              <DataTable.Title style={{ flex: flexes.metodo }}>
                <Text style={[styles.thText, { color: colors.muted }]}>Método</Text>
              </DataTable.Title>
            ) : null}
            <DataTable.Title style={[styles.statusCell, { flex: flexes.estado }]}>
              <Text style={[styles.thText, { color: colors.muted }]}>Estado</Text>
            </DataTable.Title>
            <DataTable.Title numeric style={{ flex: flexes.cobrado }}>
              <Text style={[styles.thText, { color: colors.muted }]}>Cobrado</Text>
            </DataTable.Title>
            {isWide ? (
              <DataTable.Title numeric style={{ flex: flexes.enviado }}>
                <Text style={[styles.thText, { color: colors.muted }]}>Enviado</Text>
              </DataTable.Title>
            ) : null}
            {isWide ? (
              <DataTable.Title numeric style={{ flex: flexes.items }}>
                <Text style={[styles.thText, { color: colors.muted }]}>Cant.</Text>
              </DataTable.Title>
            ) : null}
            <DataTable.Title numeric style={{ flex: flexes.acc }}>
              <Text style={[styles.thText, { color: colors.muted }]}>Ver</Text>
            </DataTable.Title>
          </DataTable.Header>

          {loading ? (
            <DataTable.Row>
              <DataTable.Cell style={styles.loadingCell}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingCellText, { color: colors.muted }]}>
                  Cargando remesas...
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ) : ventas.length === 0 ? (
            <DataTable.Row>
              <DataTable.Cell style={styles.emptyCell}>
                <Text style={[styles.emptyCellText, { color: colors.muted }]}>
                  No hay ventas registradas
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ) : (
            ventas.map((row, index) => {
              const estadoDerivado = deriveEstadoVenta(row);
              const conf = estadoConfig(estadoDerivado, isDark);

              return (
                <DataTable.Row
                  key={row?._id || index}
                  style={[styles.tableRow, { borderBottomColor: colors.border }]}
                  onPress={() => openDialog(row)}
                >
                  <DataTable.Cell style={{ flex: flexes.fecha }}>
                    <Text style={[styles.cellText, { color: colors.text }]}>
                      {formatFechaCorta(row?.createdAt)}
                    </Text>
                  </DataTable.Cell>

                  {isWide ? (
                    <DataTable.Cell style={{ flex: flexes.metodo }}>
                      <Text style={[styles.cellText, { color: colors.muted }]}>
                        {row?.metodoPago || "-"}
                      </Text>
                    </DataTable.Cell>
                  ) : null}

                  <DataTable.Cell style={[styles.statusCell, { flex: flexes.estado }]}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: conf.bg, borderColor: conf.border },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={[styles.statusBadgeText, { color: conf.color }]}
                      >
                        {conf.label}
                      </Text>
                    </View>
                  </DataTable.Cell>

                  <DataTable.Cell numeric style={{ flex: flexes.cobrado }}>
                    <Text style={[styles.cellTextBold, { color: colors.text }]}>
                      {money(row?.cobrado, row?.monedaCobrado)}
                    </Text>
                  </DataTable.Cell>

                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.enviado }}>
                      <Text style={[styles.cellText, { color: colors.muted }]}>
                        {money(row?.precioOficial, "USD")}
                      </Text>
                    </DataTable.Cell>
                  ) : null}

                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.items }}>
                      <Chip compact style={{ backgroundColor: colors.chipBg }}>
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "600" }}>
                          {getItemsCount(row)}
                        </Text>
                      </Chip>
                    </DataTable.Cell>
                  ) : null}

                  <DataTable.Cell numeric style={{ flex: flexes.acc }}>
                    <IconButton
                      icon="chevron-right"
                      size={18}
                      iconColor={colors.primary}
                      style={styles.zeroMargin}
                      onPress={() => openDialog(row)}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })
          )}
        </DataTable>
      </Surface>

      {/* Drawer con el detalle completo de la orden */}
      <DrawerBottom
        open={visible}
        onClose={closeDialog}
        overlayOpacity={0.34}
        title="Detalles de la Orden de Remesa"
      >
        <ScrollView
          style={[styles.drawerScroll, { maxHeight: maxScrollHeight }]}
          contentContainerStyle={styles.drawerScrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
        >
          {ventaSel ? (
            <View style={styles.dialogContent}>
              {/* Tarjeta con los datos generales de la venta */}
              <Surface
                style={[
                  styles.drawerHeroCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                elevation={0}
              >
                <View style={styles.drawerHeroHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerIdLabel, { color: colors.muted }]}>
                      ID DE VENTA
                    </Text>
                    <Pressable
                      onPress={() => copiarTexto(ventaSel._id, "ID de venta")}
                      style={styles.drawerIdPressable}
                    >
                      <Text style={[styles.drawerIdValue, { color: colors.text }]}>
                        {ventaSel._id}
                      </Text>
                      <IconButton
                        icon="content-copy"
                        size={14}
                        iconColor={colors.primary}
                        style={styles.zeroMargin}
                      />
                    </Pressable>
                  </View>
                  <Chip
                    compact
                    style={{
                      backgroundColor: estadoConfig(deriveEstadoVenta(ventaSel), isDark).bg,
                    }}
                    textStyle={{
                      color: estadoConfig(deriveEstadoVenta(ventaSel), isDark).color,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {estadoConfig(deriveEstadoVenta(ventaSel), isDark).label}
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 10, backgroundColor: colors.border }} />

                <View style={styles.drawerMetaGrid}>
                  <View style={styles.drawerMetaItem}>
                    <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                      📅 Fecha:
                    </Text>
                    <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                      {formatFechaCompleta(ventaSel.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.drawerMetaItem}>
                    <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                      💳 Pago:
                    </Text>
                    <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                      {ventaSel.metodoPago || "-"}
                    </Text>
                  </View>
                  <View style={styles.drawerMetaItem}>
                    <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                      💰 Cobrado:
                    </Text>
                    <Text style={[styles.drawerMetaValBold, { color: colors.primary }]}>
                      {money(ventaSel.cobrado, ventaSel.monedaCobrado)}
                    </Text>
                  </View>
                  <View style={styles.drawerMetaItem}>
                    <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                      💸 Enviado:
                    </Text>
                    <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                      {money(ventaSel.precioOficial, "USD")}
                    </Text>
                  </View>
                </View>

                {ventaSel.comentario ? (
                  <View style={[styles.drawerCommentBox, { backgroundColor: colors.chipBg }]}>
                    <Text style={[styles.drawerCommentText, { color: colors.muted }]}>
                      📝 Nota de venta: {ventaSel.comentario}
                    </Text>
                  </View>
                ) : null}
              </Surface>

              <Text variant="titleMedium" style={[styles.drawerSubheading, { color: colors.text }]}>
                {`📦 Destinatarios incluidos (${getItemsArray(ventaSel).length})`}
              </Text>

              {getItemsArray(ventaSel).length === 0 ? (
                <Surface
                  style={[
                    styles.drawerEmptyBox,
                    { backgroundColor: colors.warningBg, borderColor: colors.border },
                  ]}
                  elevation={0}
                >
                  <Text style={{ color: colors.warning, textAlign: "center", fontSize: 13 }}>
                    ⚠️ No se encontraron detalles individuales para esta remesa.
                  </Text>
                </Surface>
              ) : (
                getItemsArray(ventaSel).map((item, index) => {
                  const isCompleted = item?.entregado === true;

                  return (
                    <Surface
                      key={item._id || index}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: isCompleted ? colors.success : colors.border,
                        },
                      ]}
                      elevation={0}
                    >
                      <View style={styles.itemHeader}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>
                          Destinatario #{index + 1}
                        </Text>
                        <Chip
                          compact
                          style={{
                            backgroundColor: isCompleted ? colors.successBg : colors.warningBg,
                          }}
                          textStyle={{
                            color: isCompleted ? colors.success : colors.warning,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          {isCompleted ? "Entregado" : "Pendiente"}
                        </Chip>
                      </View>

                      <View style={styles.itemRow}>
                        <Text style={[styles.itemKey, { color: colors.muted }]}>Nombre:</Text>
                        <Text style={[styles.itemVal, { color: colors.text }]}>
                          {item?.nombre || "Sin especificar"}
                        </Text>
                      </View>

                      <View style={styles.itemRow}>
                        <Text style={[styles.itemKey, { color: colors.muted }]}>A entregar:</Text>
                        <Text style={[styles.itemValBold, { color: colors.primary }]}>
                          {money(item?.recibirEnCuba, item?.monedaRecibirEnCuba || "CUP")}
                        </Text>
                      </View>

                      {item?.tarjetaCUP ? (
                        <View style={styles.itemRow}>
                          <Text style={[styles.itemKey, { color: colors.muted }]}>Tarjeta CUP:</Text>
                          <Pressable
                            onPress={() => copiarTexto(item.tarjetaCUP, "Tarjeta CUP")}
                            style={styles.copyInline}
                          >
                            <Text style={[styles.itemValMono, { color: colors.text }]}>
                              {item.tarjetaCUP}
                            </Text>
                            <IconButton
                              icon="content-copy"
                              size={14}
                              iconColor={colors.primary}
                              style={styles.zeroMargin}
                            />
                          </Pressable>
                        </View>
                      ) : null}

                      {item?.direccionCuba ? (
                        <View style={styles.itemRow}>
                          <Text style={[styles.itemKey, { color: colors.muted }]}>Dirección:</Text>
                          <Pressable
                            onPress={() => copiarTexto(item.direccionCuba, "Dirección")}
                            style={styles.copyInline}
                          >
                            <Text
                              style={[styles.itemVal, { color: colors.text, flex: 1 }]}
                              numberOfLines={2}
                            >
                              {item.direccionCuba}
                            </Text>
                            <IconButton
                              icon="content-copy"
                              size={14}
                              iconColor={colors.primary}
                              style={styles.zeroMargin}
                            />
                          </Pressable>
                        </View>
                      ) : null}

                      {item?.comentario ? (
                        <View style={[styles.itemComment, { backgroundColor: colors.chipBg }]}>
                          <Text style={[styles.itemCommentText, { color: colors.muted }]}>
                            💬 {item.comentario}
                          </Text>
                        </View>
                      ) : null}
                    </Surface>
                  );
                })
              )}
            </View>
          ) : (
            <Surface style={[styles.drawerEmptyBox, { backgroundColor: colors.chipBg }]}>
              <Text style={{ color: colors.muted, textAlign: "center" }}>
                Sin datos disponibles
              </Text>
            </Surface>
          )}
        </ScrollView>
      </DrawerBottom>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ borderRadius: 10 }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  cellText: {
    fontSize: 12,
  },
  cellTextBold: {
    fontSize: 12,
    fontWeight: "700",
  },
  container: {
    paddingBottom: 24,
  },
  copyInline: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dialogContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  drawerCommentBox: {
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  drawerCommentText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  drawerEmptyBox: {
    borderRadius: 12,
    marginVertical: 12,
    padding: 16,
  },
  drawerHeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  drawerHeroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  drawerIdLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  drawerIdPressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  drawerIdValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  drawerMetaGrid: {
    gap: 6,
  },
  drawerMetaItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  drawerMetaKey: {
    fontSize: 12,
  },
  drawerMetaVal: {
    fontSize: 12,
    fontWeight: "600",
  },
  drawerMetaValBold: {
    fontSize: 13,
    fontWeight: "800",
  },
  drawerScroll: {
    width: "100%",
  },
  drawerScrollContent: {
    paddingBottom: 24,
  },
  drawerSubheading: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptyCell: {
    justifyContent: "center",
    paddingVertical: 20,
  },
  emptyCellText: {
    fontSize: 13,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  itemComment: {
    borderRadius: 6,
    marginTop: 6,
    padding: 6,
  },
  itemCommentText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemKey: {
    fontSize: 12,
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemVal: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  itemValBold: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  itemValMono: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingCell: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 18,
  },
  loadingCellText: {
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 10,
    marginHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    maxWidth: "100%",
    minWidth: 64,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusCell: {
    minWidth: 82,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  tableHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  zeroMargin: {
    margin: 0,
  },
});

export default TableListRemesa;
