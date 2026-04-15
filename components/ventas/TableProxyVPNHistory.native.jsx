import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import {
    Chip,
    DataTable,
    Divider,
    IconButton,
    Modal,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import SubidaArchivos from "../archivos/SubidaArchivos.native";
import {
    EvidenciasVentasEfectivoCollection,
    VentasRechargeCollection,
} from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import { chipTextColorEstado } from "../shared/saleDetailDialog.utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const chipColorEstado = (estado) => {
  switch (estado) {
    case "ENTREGADO":
      return "#28a745";
    case "PENDIENTE_ENTREGA":
      return "#ffc107";
    case "CANCELADO":
    case "PENDIENTE_PAGO":
      return "#dc3545";
    default:
      return "#6c757d";
  }
};

const estadoLabel = (estado) => {
  switch (estado) {
    case "PENDIENTE_PAGO":
      return "Pendiente de Pago";
    case "PENDIENTE_ENTREGA":
      return "Pendiente";
    case "ENTREGADO":
      return "Pagado";
    case "CANCELADO":
      return "Cancelado";
    default:
      return estado;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case "PROXY":
      return "#2196F3";
    case "VPN":
      return "#4CAF50";
    default:
      return "#6c757d";
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case "PROXY":
      return "wifi";
    case "VPN":
      return "shield-check";
    default:
      return "package-variant";
  }
};

const getDialogPalette = (isDarkMode) => ({
  accentSoft: isDarkMode ? "rgba(59, 130, 246, 0.18)" : "#eff6ff",
  border: isDarkMode ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
  commentBg: isDarkMode ? "rgba(15, 23, 42, 0.76)" : "#f8fafc",
  noteBg: isDarkMode ? "rgba(30, 41, 59, 0.76)" : "#f8fafc",
  noteBorder: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "#e2e8f0",
  surface: isDarkMode ? "rgba(10, 16, 28, 0.9)" : "rgba(255, 255, 255, 0.92)",
  surfaceAlt: isDarkMode ? "rgba(20, 27, 45, 0.92)" : "#ffffff",
  textMuted: isDarkMode ? "#94a3b8" : "#64748b",
  textPrimary: isDarkMode ? "#f8fafc" : "#0f172a",
  textSecondary: isDarkMode ? "#cbd5e1" : "#475569",
  warningBg: isDarkMode ? "rgba(120, 53, 15, 0.34)" : "#fff7ed",
  warningBorder: isDarkMode ? "rgba(251, 146, 60, 0.28)" : "#fed7aa",
  warningText: isDarkMode ? "#fdba74" : "#9a3412",
});

const megasToGB = (megas) => {
  if (!megas || megas === 999999) return "ILIMITADO";
  return `${(megas / 1024).toFixed(2)} GB`;
};

const getItemsCount = (venta) =>
  venta?.producto?.carritos?.length || venta?.carrito?.length || 0;
const getItemsArray = (venta) =>
  (venta?.producto?.carritos || venta?.carrito || []).filter(
    (carrito) => carrito.type === "PROXY" || carrito.type === "VPN",
  );

const TableProxyVPNHistory = () => {
  const { height, width } = useWindowDimensions();
  const isWide = width > height || width >= 768;
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const dialogPalette = React.useMemo(
    () => getDialogPalette(theme.dark),
    [theme.dark],
  );

  const flexes = React.useMemo(
    () =>
      isWide
        ? {
            acc: 0.35,
            cobrado: 0.9,
            estado: 1.2,
            fecha: 1.4,
            items: 0.6,
            tipo: 0.8,
          }
        : { acc: 0.35, estado: 1.5, fecha: 1.6 },
    [isWide],
  );

  const isAdmin = Meteor.user()?.profile?.role === "admin" || false;
  const isAdminPrincipal = Meteor.user()?.username === "carlosmbinf" || false;

  const listIdSubordinados = Meteor.useTracker(() => {
    if (!isAdmin) return [];
    Meteor.subscribe(
      "user",
      { bloqueadoDesbloqueadoPor: Meteor.userId() },
      { fields: { _id: 1 } },
    );
    return Meteor.users
      .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
      .fetch()
      .map((element) => element._id);
  }, [isAdmin]);

  const { loading, ventasArr } = Meteor.useTracker(() => {
    const query = isAdminPrincipal
      ? { "producto.carritos.type": { $in: ["PROXY", "VPN"] } }
      : isAdmin
        ? {
            "producto.carritos.type": { $in: ["PROXY", "VPN"] },
            $or: [
              { userId: Meteor.userId() },
              { userId: { $in: listIdSubordinados } },
            ],
          }
        : {
            "producto.carritos.type": { $in: ["PROXY", "VPN"] },
            userId: Meteor.userId(),
          };

    const sub = Meteor.subscribe("ventasRecharge", query);
    const ventas = VentasRechargeCollection.find(query, {
      sort: { createdAt: -1 },
    });
    return {
      loading: !sub.ready(),
      ventasArr: typeof ventas.fetch === "function" ? ventas.fetch() : [],
    };
  }, [JSON.stringify(listIdSubordinados), isAdmin, isAdminPrincipal]);

  const carritoIds = React.useMemo(() => {
    const ids = [];
    for (const venta of ventasArr) {
      for (const carrito of getItemsArray(venta)) {
        if (carrito?._id) ids.push(String(carrito._id));
      }
    }
    return Array.from(new Set(ids));
  }, [ventasArr]);

  Meteor.useTracker(() => {
    if (!carritoIds.length) {
      return { cargandoEvidencias: false, evidencias: [] };
    }
    const sub = Meteor.subscribe("evidenciasVentasEfectivoRecharge", {
      ventaId: { $in: carritoIds },
    });
    return {
      cargandoEvidencias: !sub.ready(),
      evidencias: EvidenciasVentasEfectivoCollection.find({
        ventaId: { $in: carritoIds },
      }).fetch(),
    };
  }, [JSON.stringify(carritoIds)]);

  const [ventaSel, setVentaSel] = React.useState(null);
  const [visible, setVisible] = React.useState(false);

  const openDialog = (venta) => {
    setVentaSel(venta);
    setVisible(true);
  };

  const closeDialog = () => {
    setVisible(false);
    setVentaSel(null);
  };

  const formatFecha = (value) =>
    value ? new Date(value).toLocaleString() : "-";
  const money = (value, currency) => `${value ?? 0} ${currency ?? ""}`.trim();

  const deriveEstadoVenta = (venta) => {
    if (venta.isCobrado) return "ENTREGADO";
    if (venta.isCancelada) return "CANCELADO";
    const carritos = getItemsArray(venta) || [];
    const allEntregado =
      carritos.length > 0 &&
      carritos.every((carrito) => carrito.entregado === true);
    if (allEntregado) return "ENTREGADO";
    if (venta.isCobrado !== true) return "PENDIENTE_PAGO";
    return "PENDIENTE_ENTREGA";
  };
  const selectedEstado = React.useMemo(
    () => (ventaSel ? deriveEstadoVenta(ventaSel) : null),
    [ventaSel],
  );
  const selectedItems = React.useMemo(() => getItemsArray(ventaSel), [ventaSel]);

  const getTipoPredominante = (venta) => {
    const carritos = getItemsArray(venta);
    if (!carritos.length) return "-";
    const hasProxy = carritos.some((carrito) => carrito.type === "PROXY");
    const hasVPN = carritos.some((carrito) => carrito.type === "VPN");
    if (hasProxy && hasVPN) return "MIXTO";
    if (hasProxy) return "PROXY";
    if (hasVPN) return "VPN";
    return "-";
  };

  return (
    <Surface style={styles.surface}>
      <AppHeader
        title="Historial Proxy/VPN"
        subtitle="Compras, estados y evidencias"
        backHref="/(normal)/Main"
        showBackButton
      />
      <ScrollView style={styles.container} scrollEnabled>
        <Text variant="headlineMedium" style={styles.title}>
          📊 Historial Proxy/VPN
        </Text>

        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ flex: flexes.fecha }}>
              Fecha
            </DataTable.Title>
            {isWide ? (
              <DataTable.Title style={{ flex: flexes.tipo }}>
                Tipo
              </DataTable.Title>
            ) : null}
            <DataTable.Title style={{ flex: flexes.estado }}>
              Estado
            </DataTable.Title>
            {isWide ? (
              <DataTable.Title numeric style={{ flex: flexes.cobrado }}>
                Cobrado
              </DataTable.Title>
            ) : null}
            {isWide ? (
              <DataTable.Title numeric style={{ flex: flexes.items }}>
                Ítems
              </DataTable.Title>
            ) : null}
            <DataTable.Title numeric style={{ flex: flexes.acc }}>
              Acc.
            </DataTable.Title>
          </DataTable.Header>

          {loading ? (
            <DataTable.Row>
              <DataTable.Cell>Cargando...</DataTable.Cell>
            </DataTable.Row>
          ) : ventasArr.length === 0 ? (
            <DataTable.Row>
              <DataTable.Cell>
                <Surface style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    📭 No tienes compras de Proxy/VPN registradas
                  </Text>
                </Surface>
              </DataTable.Cell>
            </DataTable.Row>
          ) : (
            ventasArr.map((row, index) => {
              const fecha = formatFecha(row?.createdAt);
              const tipo = getTipoPredominante(row);
              const cobrado = money(row?.cobrado, row?.monedaCobrado);
              const items = getItemsCount(row);
              const estadoDerivado = deriveEstadoVenta(row);

              return (
                <DataTable.Row key={row?._id || index}>
                  <DataTable.Cell style={{ flex: flexes.fecha }}>
                    {fecha}
                  </DataTable.Cell>
                  {isWide ? (
                    <DataTable.Cell style={{ flex: flexes.tipo }}>
                      <Chip
                        compact
                        icon={getTypeIcon(tipo)}
                        style={{ backgroundColor: getTypeColor(tipo) }}
                        textStyle={styles.typeChipText}
                      >
                        {tipo}
                      </Chip>
                    </DataTable.Cell>
                  ) : null}
                  <DataTable.Cell style={{ flex: flexes.estado }}>
                    <Chip
                      compact={!isWide}
                      style={{
                        backgroundColor: chipColorEstado(estadoDerivado),
                      }}
                      textStyle={styles.estadoChipTableText}
                    >
                      {estadoLabel(estadoDerivado)}
                    </Chip>
                  </DataTable.Cell>
                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.cobrado }}>
                      {cobrado}
                    </DataTable.Cell>
                  ) : null}
                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.items }}>
                      {items}
                    </DataTable.Cell>
                  ) : null}
                  <DataTable.Cell numeric style={{ flex: flexes.acc }}>
                    <IconButton
                      icon="information-outline"
                      size={18}
                      style={styles.zeroMargin}
                      onPress={() => openDialog(row)}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })
          )}
        </DataTable>

        <Portal>
          <Modal
            visible={visible}
            onDismiss={closeDialog}
            style={styles.modalWrapper}
            contentContainerStyle={[
              styles.modalContainer,
              { paddingTop: Math.max(top, 16) },
            ]}
          >
            <BlurView
              intensity={24}
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
              renderToHardwareTextureAndroid={true}
            />
            <View
              style={[
                styles.modalBackdrop,
                {
                  backgroundColor: theme.dark
                    ? "rgba(5, 11, 24, 0.44)"
                    : "rgba(248, 250, 252, 0.24)",
                },
              ]}
            />
            <View style={styles.dialogTitleContainer}>
              <Text style={styles.dialogTitleText}>Detalles de la Venta:</Text>
              <IconButton icon="close" onPress={closeDialog} />
            </View>
            <Divider />
            <View style={styles.dialogBody}>
              <ScrollView
                style={styles.dialogScroll}
                contentContainerStyle={styles.dialogScrollContent}
              >
                {ventaSel ? (
                  <View style={styles.ventaDetailContainer}>
                    <Surface
                      style={[
                        styles.summaryCard,
                        {
                          backgroundColor: dialogPalette.surface,
                          borderColor: dialogPalette.border,
                        },
                      ]}
                    >
                      <View style={styles.summaryHeaderRow}>
                        <View style={styles.summaryTitleBlock}>
                          <Text
                            style={[
                              styles.summaryEyebrow,
                              { color: dialogPalette.textMuted },
                            ]}
                          >
                            Resumen de la venta
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.summaryTitle,
                              { color: dialogPalette.textPrimary },
                            ]}
                          >
                            {ventaSel._id}
                          </Text>
                          <Text
                            style={[
                              styles.summarySubtitle,
                              { color: dialogPalette.textSecondary },
                            ]}
                          >
                            Consulta el estado general y cada paquete asociado con
                            una lectura más limpia y consistente.
                          </Text>
                        </View>
                        <Chip
                          compact
                          style={[
                            styles.heroStatusChip,
                            {
                              backgroundColor: chipColorEstado(selectedEstado),
                            },
                          ]}
                          textStyle={[
                            styles.heroStatusChipText,
                            {
                              color: chipTextColorEstado(selectedEstado),
                            },
                          ]}
                        >
                          {estadoLabel(selectedEstado)}
                        </Chip>
                      </View>

                      <View style={styles.summaryGrid}>
                        <Surface
                          style={[
                            styles.summaryMetricCard,
                            {
                              backgroundColor: dialogPalette.surfaceAlt,
                              borderColor: dialogPalette.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summaryMetricLabel,
                              { color: dialogPalette.textMuted },
                            ]}
                          >
                            Fecha
                          </Text>
                          <Text
                            style={[
                              styles.summaryMetricValue,
                              { color: dialogPalette.textPrimary },
                            ]}
                          >
                            {formatFecha(ventaSel.createdAt)}
                          </Text>
                        </Surface>
                        <Surface
                          style={[
                            styles.summaryMetricCard,
                            {
                              backgroundColor: dialogPalette.surfaceAlt,
                              borderColor: dialogPalette.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summaryMetricLabel,
                              { color: dialogPalette.textMuted },
                            ]}
                          >
                            Método de pago
                          </Text>
                          <Text
                            style={[
                              styles.summaryMetricValue,
                              { color: dialogPalette.textPrimary },
                            ]}
                          >
                            {ventaSel.metodoPago || "-"}
                          </Text>
                        </Surface>
                        <Surface
                          style={[
                            styles.summaryMetricCard,
                            {
                              backgroundColor: dialogPalette.surfaceAlt,
                              borderColor: dialogPalette.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summaryMetricLabel,
                              { color: dialogPalette.textMuted },
                            ]}
                          >
                            Paquetes
                          </Text>
                          <Text
                            style={[
                              styles.summaryMetricValue,
                              { color: dialogPalette.textPrimary },
                            ]}
                          >
                            {selectedItems.length}
                          </Text>
                        </Surface>
                      </View>
                    </Surface>

                    <View style={styles.sectionHeadingRow}>
                      <View
                        style={[
                          styles.sectionHeadingIcon,
                          { backgroundColor: dialogPalette.accentSoft },
                        ]}
                      >
                        <Text style={styles.sectionHeadingEmoji}>📦</Text>
                      </View>
                      <View style={styles.sectionHeadingCopy}>
                        <Text
                          style={[
                            styles.sectionHeadingTitle,
                            { color: dialogPalette.textPrimary },
                          ]}
                        >
                          Paquetes incluidos
                        </Text>
                        <Text
                          style={[
                            styles.sectionHeadingSubtitle,
                            { color: dialogPalette.textSecondary },
                          ]}
                        >
                          Cada bloque conserva la misma información operativa y
                          destaca mejor el servicio, el consumo y la entrega.
                        </Text>
                      </View>
                    </View>

                    {selectedItems.length === 0 ? (
                      <Surface
                        style={[
                          styles.warningBox,
                          {
                            backgroundColor: dialogPalette.warningBg,
                            borderColor: dialogPalette.warningBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.warningText,
                            { color: dialogPalette.warningText },
                          ]}
                        >
                          ⚠️ Sin paquetes registrados
                        </Text>
                      </Surface>
                    ) : (
                      selectedItems.map((item, index) => {
                        const typeColor = getTypeColor(item.type);
                        const isEntregado = item.entregado === true;
                        const statusTone = isEntregado
                          ? {
                              backgroundColor: theme.dark
                                ? "rgba(20, 83, 45, 0.34)"
                                : "#f0fdf4",
                              borderColor: theme.dark
                                ? "rgba(74, 222, 128, 0.22)"
                                : "#bbf7d0",
                              textColor: theme.dark ? "#bbf7d0" : "#166534",
                            }
                          : {
                              backgroundColor: theme.dark
                                ? "rgba(133, 77, 14, 0.34)"
                                : "#fffbeb",
                              borderColor: theme.dark
                                ? "rgba(251, 191, 36, 0.24)"
                                : "#fde68a",
                              textColor: theme.dark ? "#fde68a" : "#92400e",
                            };
                        return (
                          <Surface
                            key={item._id || index}
                            style={[
                              styles.packageCard,
                              {
                                backgroundColor: dialogPalette.surface,
                                borderColor: dialogPalette.border,
                                borderLeftColor: typeColor,
                              },
                            ]}
                          >
                            <View style={styles.itemCardHeader}>
                              <View style={styles.itemCardHeaderCopy}>
                                <Text
                                  style={[
                                    styles.itemCardEyebrow,
                                    { color: dialogPalette.textMuted },
                                  ]}
                                >{`Paquete #${index + 1}`}</Text>
                                <Text
                                  style={[
                                    styles.packageTitle,
                                    { color: dialogPalette.textPrimary },
                                  ]}
                                >
                                  {item?.nombre || "Sin cliente especificado"}
                                </Text>
                                <Text
                                  style={[
                                    styles.itemCardSubtitle,
                                    { color: dialogPalette.textSecondary },
                                  ]}
                                >
                                  {item.type === "PROXY"
                                    ? "Servicio proxy listo para activación"
                                    : "Servicio VPN listo para activación"}
                                </Text>
                              </View>
                              <View style={styles.itemCardHeaderActions}>
                                <Chip
                                  compact
                                  icon={getTypeIcon(item.type)}
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: typeColor },
                                  ]}
                                  textStyle={styles.typeChipText}
                                >
                                  {item.type}
                                </Chip>
                                <Chip
                                  compact
                                  style={[
                                    styles.itemStatusChip,
                                    {
                                      backgroundColor: statusTone.backgroundColor,
                                      borderColor: statusTone.borderColor,
                                    },
                                  ]}
                                  textStyle={[
                                    styles.itemStatusChipText,
                                    { color: statusTone.textColor },
                                  ]}
                                >
                                  {isEntregado ? "Entregado" : "Pendiente"}
                                </Chip>
                              </View>
                            </View>

                            <View style={styles.itemInfoGrid}>
                              {[
                                {
                                  label: "ID del paquete",
                                  value: item._id || "N/A",
                                },
                                {
                                  label: "Cliente",
                                  value: item?.nombre || "Sin especificar",
                                },
                                {
                                  label: "Datos",
                                  value: megasToGB(item.megas),
                                },
                                {
                                  label: "Precio",
                                  value: money(item.cobrarUSD, "CUP"),
                                },
                              ].map((detail) => (
                                <Surface
                                  key={`${item._id || index}-${detail.label}`}
                                  style={[
                                    styles.itemInfoCard,
                                    {
                                      backgroundColor: dialogPalette.surfaceAlt,
                                      borderColor: dialogPalette.border,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.itemInfoLabel,
                                      { color: dialogPalette.textMuted },
                                    ]}
                                  >
                                    {detail.label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.itemInfoValue,
                                      { color: dialogPalette.textPrimary },
                                    ]}
                                  >
                                    {detail.value}
                                  </Text>
                                </Surface>
                              ))}
                            </View>

                            <Surface
                              style={[
                                styles.statusCard,
                                {
                                  backgroundColor: statusTone.backgroundColor,
                                  borderColor: statusTone.borderColor,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTitle,
                                  { color: statusTone.textColor },
                                ]}
                              >
                                {isEntregado ? "✅" : "⏳"} Estado del Paquete
                              </Text>
                              <Text
                                style={[
                                  styles.statusDetailLine,
                                  { color: statusTone.textColor },
                                ]}
                              >
                                Entregado: {isEntregado ? "Sí" : "No"}
                              </Text>
                            </Surface>

                            {item?.comentario ? (
                              <Surface
                                style={[
                                  styles.commentBox,
                                  {
                                    backgroundColor: dialogPalette.commentBg,
                                    borderColor: dialogPalette.noteBorder,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.commentLabel,
                                    { color: dialogPalette.textMuted },
                                  ]}
                                >
                                  Comentario del paquete
                                </Text>
                                <Text
                                  style={[
                                    styles.commentText,
                                    { color: dialogPalette.textSecondary },
                                  ]}
                                >
                                  💬 {item.comentario}
                                </Text>
                              </Surface>
                            ) : null}
                          </Surface>
                        );
                      })
                    )}

                    {ventaSel?.metodoPago === "EFECTIVO" ? (
                      <Surface
                        style={[
                          styles.uploadBox,
                          {
                            backgroundColor: dialogPalette.warningBg,
                            borderColor: dialogPalette.warningBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.warningEyebrow,
                            { color: dialogPalette.warningText },
                          ]}
                        >
                          Evidencia requerida
                        </Text>
                        <Text
                          style={[
                            styles.uploadText,
                            { color: dialogPalette.warningText },
                          ]}
                        >
                          Debe subir evidencia para corroborar el pago y
                          autorizar la activación.
                        </Text>
                        <SubidaArchivos venta={ventaSel} />
                      </Surface>
                    ) : null}
                  </View>
                ) : (
                  <Surface
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: dialogPalette.warningBg,
                        borderColor: dialogPalette.warningBorder,
                      },
                    ]}
                  >
                    <Text style={styles.errorText}>
                      ❌ Sin datos disponibles
                    </Text>
                  </Surface>
                )}
              </ScrollView>
            </View>
          </Modal>
        </Portal>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  surface: { height: "100%" },
  title: { fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#e9ecef",
    borderRadius: 12,
    padding: 20,
  },
  emptyText: { color: "#6c757d", fontSize: 14, textAlign: "center" },
  estadoChipTableText: { color: "white" },
  zeroMargin: { margin: 0 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContainer: {
    flex: 1,
    height: "100%",
    margin: 0,
    padding: 0,
  },
  modalWrapper: {
    justifyContent: "flex-start",
    marginBottom: 0,
    marginTop: 0,
  },
  dialogTitleContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  dialogTitleText: { fontSize: 20, fontWeight: "800" },
  dialogBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  dialogScroll: { flex: 1 },
  dialogScrollContent: { paddingBottom: 28 },
  ventaDetailContainer: { gap: 14, paddingTop: 14 },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  summaryHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  summaryTitleBlock: { flex: 1, gap: 6 },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryTitle: { fontSize: 18, fontWeight: "800" },
  summarySubtitle: { fontSize: 13, lineHeight: 19 },
  heroStatusChip: { borderRadius: 999, marginLeft: 8 },
  heroStatusChipText: { fontSize: 11, fontWeight: "800" },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  summaryMetricCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 150,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryMetricLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryMetricValue: { fontSize: 14, fontWeight: "700" },
  sectionHeadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  sectionHeadingIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sectionHeadingEmoji: { fontSize: 18 },
  sectionHeadingCopy: { flex: 1, gap: 3 },
  sectionHeadingTitle: { fontSize: 17, fontWeight: "800" },
  sectionHeadingSubtitle: { fontSize: 13, lineHeight: 18 },
  warningBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  packageCard: {
    borderLeftWidth: 4,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 16,
  },
  itemCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  itemCardHeaderCopy: { flex: 1, gap: 4 },
  itemCardEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  packageTitle: { fontSize: 17, fontWeight: "800" },
  itemCardSubtitle: { fontSize: 13, lineHeight: 18 },
  itemCardHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "46%",
  },
  typeChip: {
    alignSelf: "flex-end",
    borderRadius: 999,
  },
  typeChipText: { color: "white", fontSize: 10, fontWeight: "bold" },
  itemStatusChip: {
    alignSelf: "flex-end",
    borderRadius: 999,
    borderWidth: 1,
  },
  itemStatusChipText: { fontSize: 11, fontWeight: "800" },
  itemInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  itemInfoCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 135,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  itemInfoLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  itemInfoValue: { fontSize: 13, fontWeight: "700" },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  statusTitle: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  statusDetailLine: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  commentBox: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  commentLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  commentText: { fontSize: 13, fontStyle: "italic", lineHeight: 19 },
  uploadBox: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 8,
    padding: 16,
  },
  warningEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  uploadText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginBottom: 12,
    textAlign: "center",
  },
  errorBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default TableProxyVPNHistory;
