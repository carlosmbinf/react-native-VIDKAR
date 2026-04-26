import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
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

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import SubidaArchivos from "../archivos/SubidaArchivos.native";
import {
    EvidenciasVentasEfectivoCollection,
    VentasRechargeCollection,
} from "../collections/collections";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { chipTextColorEstado } from "../shared/saleDetailDialog.utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PROXY_VPN_VENTA_FIELDS = {
  _id: 1,
  cobrado: 1,
  comentario: 1,
  createdAt: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  carrito: 1,
  "producto.carrito": 1,
  "producto.carritos": 1,
  "producto.type": 1,
};

const PROXY_VPN_EVIDENCIA_FIELDS = {
  _id: 1,
  aprobado: 1,
  base64: 1,
  cancelada: 1,
  cancelado: 1,
  createdAt: 1,
  data: 1,
  dataB64: 1,
  dataBase64: 1,
  denegado: 1,
  descripcion: 1,
  detalles: 1,
  estado: 1,
  fecha: 1,
  fechaSubida: 1,
  isCancelada: 1,
  rechazado: 1,
  size: 1,
  tamano: 1,
  ventaId: 1,
};

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

const getTableStatusTone = (estado, isDarkMode) => {
  switch (estado) {
    case "ENTREGADO":
      return {
        backgroundColor: isDarkMode
          ? "rgba(34, 197, 94, 0.16)"
          : "rgba(236, 253, 245, 0.92)",
        borderColor: isDarkMode
          ? "rgba(74, 222, 128, 0.32)"
          : "rgba(16, 185, 129, 0.28)",
        dotColor: "#22c55e",
        textColor: isDarkMode ? "#bbf7d0" : "#047857",
      };
    case "CANCELADO":
      return {
        backgroundColor: isDarkMode
          ? "rgba(248, 113, 113, 0.15)"
          : "rgba(254, 242, 242, 0.94)",
        borderColor: isDarkMode
          ? "rgba(248, 113, 113, 0.3)"
          : "rgba(248, 113, 113, 0.28)",
        dotColor: "#ef4444",
        textColor: isDarkMode ? "#fecaca" : "#b91c1c",
      };
    case "PENDIENTE_PAGO":
      return {
        backgroundColor: isDarkMode
          ? "rgba(251, 146, 60, 0.16)"
          : "rgba(255, 247, 237, 0.92)",
        borderColor: isDarkMode
          ? "rgba(251, 146, 60, 0.3)"
          : "rgba(251, 146, 60, 0.28)",
        dotColor: "#f97316",
        textColor: isDarkMode ? "#fed7aa" : "#c2410c",
      };
    case "PENDIENTE_ENTREGA":
      return {
        backgroundColor: isDarkMode
          ? "rgba(250, 204, 21, 0.14)"
          : "rgba(254, 252, 232, 0.92)",
        borderColor: isDarkMode
          ? "rgba(250, 204, 21, 0.28)"
          : "rgba(234, 179, 8, 0.24)",
        dotColor: "#eab308",
        textColor: isDarkMode ? "#fef08a" : "#854d0e",
      };
    default:
      return {
        backgroundColor: isDarkMode
          ? "rgba(148, 163, 184, 0.14)"
          : "rgba(248, 250, 252, 0.92)",
        borderColor: isDarkMode
          ? "rgba(148, 163, 184, 0.24)"
          : "rgba(148, 163, 184, 0.22)",
        dotColor: "#94a3b8",
        textColor: isDarkMode ? "#cbd5e1" : "#475569",
      };
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
  accentSoft: isDarkMode ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 246, 255, 0.44)",
  border: isDarkMode ? "rgba(226, 232, 240, 0.14)" : "rgba(15, 23, 42, 0.1)",
  commentBg: isDarkMode ? "rgba(15, 23, 42, 0.34)" : "rgba(248, 250, 252, 0.4)",
  noteBg: isDarkMode ? "rgba(30, 41, 59, 0.34)" : "rgba(248, 250, 252, 0.4)",
  noteBorder: isDarkMode ? "rgba(226, 232, 240, 0.14)" : "rgba(15, 23, 42, 0.1)",
  surface: isDarkMode ? "rgba(10, 16, 28, 0.5)" : "rgba(255, 255, 255, 0.42)",
  surfaceAlt: isDarkMode ? "rgba(20, 27, 45, 0.34)" : "rgba(255, 255, 255, 0.3)",
  textMuted: isDarkMode ? "#94a3b8" : "#64748b",
  textPrimary: isDarkMode ? "#f8fafc" : "#0f172a",
  textSecondary: isDarkMode ? "#cbd5e1" : "#475569",
  warningBg: isDarkMode ? "rgba(120, 53, 15, 0.22)" : "rgba(255, 247, 237, 0.42)",
  warningBorder: isDarkMode ? "rgba(251, 146, 60, 0.3)" : "rgba(194, 65, 12, 0.14)",
  warningText: isDarkMode ? "#fdba74" : "#9a3412",
});

const megasToGB = (megas) => {
  if (!megas || megas === 999999) return "ILIMITADO";
  return `${(megas / 1024).toFixed(2)} GB`;
};

const PROXY_VPN_TYPES = new Set(["PROXY", "VPN"]);

const getCartItemType = (carrito) =>
  String(
    carrito?.type ||
      carrito?.tipo ||
      carrito?.productType ||
      carrito?.producto?.type ||
      carrito?.producto?.tipo ||
      "",
  ).toUpperCase();

const getRawCartItems = (venta) => {
  const candidates = [
    venta?.producto?.carritos,
    venta?.carrito,
    venta?.producto?.carrito,
  ];
  const items = candidates.find((candidate) => Array.isArray(candidate));
  return items || [];
};

const getItemsArray = (venta) => {
  const rawItems = getRawCartItems(venta);
  const proxyVpnItems = rawItems.filter((carrito) =>
    PROXY_VPN_TYPES.has(getCartItemType(carrito)),
  );

  return proxyVpnItems.length > 0 ? proxyVpnItems : rawItems;
};

const getItemsCount = (venta) => getItemsArray(venta).length;

const PROXY_VPN_SELECTOR = {
  $or: [
    { "producto.carritos.type": { $in: ["PROXY", "VPN"] } },
    { "producto.carritos.producto.type": { $in: ["PROXY", "VPN"] } },
    { "producto.carrito.type": { $in: ["PROXY", "VPN"] } },
    { "producto.carrito.producto.type": { $in: ["PROXY", "VPN"] } },
    { "producto.type": { $in: ["PROXY", "VPN"] } },
  ],
};

const EMPTY_SELECTED_ITEMS = [];

const TableProxyVPNHistory = () => {
  const { height, width } = useWindowDimensions();
  const isWide = width > height || width >= 768;
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const { top } = useSafeAreaInsets();
  const modalTopPadding = Math.max(top - 8, 12);
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
  const dataReady = useDeferredScreenData();

  const listIdSubordinados = Meteor.useTracker(() => {
    if (!dataReady || !isAdmin) return [];
    Meteor.subscribe(
      "user",
      { bloqueadoDesbloqueadoPor: Meteor.userId() },
      { fields: { _id: 1 } },
    );
    return Meteor.users
      .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
      .fetch()
      .map((element) => element._id);
  }, [dataReady, isAdmin]);

  const { loading, ventasArr } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, ventasArr: [] };
    }

    const query = isAdminPrincipal
      ? PROXY_VPN_SELECTOR
      : isAdmin
        ? {
            $and: [
              PROXY_VPN_SELECTOR,
              {
                $or: [
                  { userId: Meteor.userId() },
                  { userId: { $in: listIdSubordinados } },
                ],
              },
            ],
          }
        : {
            $and: [PROXY_VPN_SELECTOR, { userId: Meteor.userId() }],
          };

    const sub = Meteor.subscribe("ventasRecharge", query, {
      fields: PROXY_VPN_VENTA_FIELDS,
    });
    const ventas = VentasRechargeCollection.find(query, {
      fields: PROXY_VPN_VENTA_FIELDS,
      sort: { createdAt: -1 },
    });
    return {
      loading: !sub.ready(),
      ventasArr: typeof ventas.fetch === "function" ? ventas.fetch() : [],
    };
  }, [dataReady, JSON.stringify(listIdSubordinados), isAdmin, isAdminPrincipal]);

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
    if (!dataReady || !carritoIds.length) {
      return { cargandoEvidencias: false, evidencias: [] };
    }
    const sub = Meteor.subscribe("evidenciasVentasEfectivoRecharge", {
      ventaId: { $in: carritoIds },
    }, {
      fields: PROXY_VPN_EVIDENCIA_FIELDS,
    });
    return {
      cargandoEvidencias: !sub.ready(),
      evidencias: EvidenciasVentasEfectivoCollection.find({
        ventaId: { $in: carritoIds },
      }, {
        fields: PROXY_VPN_EVIDENCIA_FIELDS,
      }).fetch(),
    };
  }, [dataReady, JSON.stringify(carritoIds)]);

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
  const selectedEstado = ventaSel ? deriveEstadoVenta(ventaSel) : null;
  const selectedItems = ventaSel ? getItemsArray(ventaSel) : EMPTY_SELECTED_ITEMS;
  const shouldRequestEvidence =
    ventaSel?.metodoPago === "EFECTIVO" &&
    ventaSel?.isCobrado !== true &&
    ventaSel?.isCancelada !== true;
  const shouldShowEvidenceHistory =
    ventaSel?.metodoPago === "EFECTIVO" && !shouldRequestEvidence;

  const getTipoPredominante = (venta) => {
    const carritos = getItemsArray(venta);
    if (!carritos.length) return "-";
    const hasProxy = carritos.some(
      (carrito) => getCartItemType(carrito) === "PROXY",
    );
    const hasVPN = carritos.some(
      (carrito) => getCartItemType(carrito) === "VPN",
    );
    if (hasProxy && hasVPN) return "MIXTO";
    if (hasProxy) return "PROXY";
    if (hasVPN) return "VPN";
    return "-";
  };

  const historySummary = React.useMemo(() => {
    return ventasArr.reduce(
      (acc, venta) => {
        const estado = deriveEstadoVenta(venta);
        acc.total += 1;

        if (estado === "ENTREGADO") {
          acc.pagadas += 1;
        } else if (estado === "CANCELADO") {
          acc.canceladas += 1;
        } else {
          acc.pendientes += 1;
        }

        return acc;
      },
      { canceladas: 0, pagadas: 0, pendientes: 0, total: 0 },
    );
  }, [ventasArr]);

  const overviewMetrics = [
    {
      label: "Registros",
      tone: theme.dark
        ? "rgba(148, 163, 184, 0.14)"
        : "rgba(248, 250, 252, 0.94)",
      value: historySummary.total,
    },
    {
      label: "Pagadas",
      tone: theme.dark
        ? "rgba(34, 197, 94, 0.14)"
        : "rgba(236, 253, 245, 0.94)",
      value: historySummary.pagadas,
    },
    {
      label: "Canceladas",
      tone: theme.dark
        ? "rgba(248, 113, 113, 0.14)"
        : "rgba(254, 242, 242, 0.94)",
      value: historySummary.canceladas,
    },
    {
      label: "Pendientes",
      tone: theme.dark
        ? "rgba(251, 146, 60, 0.14)"
        : "rgba(255, 247, 237, 0.94)",
      value: historySummary.pendientes,
    },
  ];

  return (
    <Surface style={styles.surface}>
      <AppHeader
        title="Historial Proxy/VPN"
        subtitle="Compras, estados y evidencias"
        backHref="/(normal)/Main"
        overlapContent
        showBackButton
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent,
          { paddingTop: headerInset + 14 },
        ]}
        scrollEnabled
      >
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: dialogPalette.surface,
              borderColor: dialogPalette.border,
            },
          ]}
        >
          <View style={styles.overviewHeader}>
            <View style={styles.overviewCopy}>
              <Text
                style={[
                  styles.overviewEyebrow,
                  { color: dialogPalette.textMuted },
                ]}
              >
                Resumen operativo
              </Text>
              <Text
                style={[
                  styles.overviewTitle,
                  { color: dialogPalette.textPrimary },
                ]}
              >
                Compras Proxy y VPN
              </Text>
              <Text
                style={[
                  styles.overviewSubtitle,
                  { color: dialogPalette.textSecondary },
                ]}
              >
                Revisa estados, pagos y accesos al detalle con una lectura más
                limpia desde el primer vistazo.
              </Text>
            </View>
            <View
              style={[
                styles.overviewBadge,
                {
                  backgroundColor: dialogPalette.surfaceAlt,
                  borderColor: dialogPalette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.overviewBadgeValue,
                  { color: dialogPalette.textPrimary },
                ]}
              >
                {historySummary.total}
              </Text>
              <Text
                style={[
                  styles.overviewBadgeLabel,
                  { color: dialogPalette.textMuted },
                ]}
              >
                movimientos
              </Text>
            </View>
          </View>

          <View style={styles.overviewMetricsRow}>
            {overviewMetrics.map((metric) => (
              <View
                key={metric.label}
                style={[
                  styles.overviewMetric,
                  {
                    backgroundColor: metric.tone,
                    borderColor: dialogPalette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.overviewMetricLabel,
                    { color: dialogPalette.textMuted },
                  ]}
                >
                  {metric.label}
                </Text>
                <Text
                  style={[
                    styles.overviewMetricValue,
                    { color: dialogPalette.textPrimary },
                  ]}
                >
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.tableShell,
            {
              backgroundColor: dialogPalette.surface,
              borderColor: dialogPalette.border,
            },
          ]}
        >
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableHeaderCopy}>
              <Text
                style={[
                  styles.tableEyebrow,
                  { color: dialogPalette.textMuted },
                ]}
              >
                Historial
              </Text>
              <Text
                style={[
                  styles.tableTitle,
                  { color: dialogPalette.textPrimary },
                ]}
              >
                Registros recientes
              </Text>
            </View>
            <View
              style={[
                styles.tableHeaderBadge,
                {
                  backgroundColor: dialogPalette.surfaceAlt,
                  borderColor: dialogPalette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tableHeaderBadgeText,
                  { color: dialogPalette.textSecondary },
                ]}
              >
                {loading ? "Actualizando" : `${ventasArr.length} filas`}
              </Text>
            </View>
          </View>

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
              const tableStatusTone = getTableStatusTone(
                estadoDerivado,
                theme.dark,
              );

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
                  <DataTable.Cell
                    style={[styles.tableStatusCell, { flex: flexes.estado }]}
                  >
                    <View
                      style={{
                        ...styles.tableStatusPill,
                        backgroundColor: tableStatusTone.backgroundColor,
                        borderColor: tableStatusTone.borderColor,
                      }}
                    >
                      <View
                        style={[
                          styles.tableStatusDot,
                          { backgroundColor: tableStatusTone.dotColor },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tableStatusText,
                          { color: tableStatusTone.textColor },
                        ]}
                      >
                        {estadoLabel(estadoDerivado)}
                      </Text>
                    </View>
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
        </View>

        <Portal>
          <Modal
            visible={visible}
            onDismiss={closeDialog}
            style={styles.modalWrapper}
            contentContainerStyle={[
              styles.modalContainer,
              { paddingTop: modalTopPadding },
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
                    ? "rgba(5, 11, 24, 0.28)"
                    : "rgba(248, 250, 252, 0.12)",
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
                    {shouldRequestEvidence ? (
                      <View
                        style={[
                          styles.uploadBox,
                          {
                            backgroundColor: dialogPalette.warningBg,
                            borderColor: dialogPalette.warningBorder,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.evidenceRail,
                            { backgroundColor: dialogPalette.warningText },
                          ]}
                        />
                        <View style={styles.evidenceHeader}>
                          <View
                            style={[
                              styles.evidenceIcon,
                              {
                                backgroundColor: theme.dark
                                  ? "rgba(251, 146, 60, 0.16)"
                                  : "rgba(251, 146, 60, 0.12)",
                                borderColor: dialogPalette.warningBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.evidenceIconText,
                                { color: dialogPalette.warningText },
                              ]}
                            >
                              !
                            </Text>
                          </View>
                          <View style={styles.evidenceCopy}>
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
                                styles.evidenceTitle,
                                { color: dialogPalette.textPrimary },
                              ]}
                            >
                              Confirma el pago antes de activar
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.evidenceBadge,
                              {
                                backgroundColor: dialogPalette.surfaceAlt,
                                borderColor: dialogPalette.warningBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.evidenceBadgeText,
                                { color: dialogPalette.warningText },
                              ]}
                            >
                              Pago
                            </Text>
                          </View>
                        </View>
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
                      </View>
                    ) : null}

                    <View
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
                        <View
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
                        </View>
                        <View
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
                        </View>
                        <View
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
                        </View>
                      </View>
                    </View>

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
                      <View
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
                      </View>
                    ) : (
                      selectedItems.map((item, index) => {
                        const rawItemType =
                          getCartItemType(item) ||
                          String(ventaSel?.producto?.type || "").toUpperCase();
                        const itemType = PROXY_VPN_TYPES.has(rawItemType)
                          ? rawItemType
                          : "PAQUETE";
                        const itemLabel =
                          itemType === "VPN"
                            ? "Paquete VPN"
                            : itemType === "PROXY"
                              ? "Paquete Proxy"
                              : "Paquete Proxy/VPN";
                        const typeColor = getTypeColor(itemType);
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
                          <View
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
                                  {item?.nombre || itemLabel}
                                </Text>
                                <Text
                                  style={[
                                    styles.itemCardSubtitle,
                                    { color: dialogPalette.textSecondary },
                                  ]}
                                >
                                  {itemType === "VPN"
                                    ? "Servicio VPN listo para activación"
                                    : itemType === "PROXY"
                                      ? "Servicio proxy listo para activación"
                                      : "Servicio listo para activación"}
                                </Text>
                              </View>
                              <View style={styles.itemCardHeaderActions}>
                                <Chip
                                  compact
                                  icon={getTypeIcon(itemType)}
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: typeColor },
                                  ]}
                                  textStyle={styles.typeChipText}
                                >
                                  {itemType}
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
                                <View
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
                                </View>
                              ))}
                            </View>

                            <View
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
                            </View>

                            {item?.comentario ? (
                              <View
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
                              </View>
                            ) : null}
                          </View>
                        );
                      })
                    )}

                    {shouldShowEvidenceHistory ? (
                      <>
                        <View style={styles.sectionHeadingRow}>
                          <View
                            style={[
                              styles.sectionHeadingIcon,
                              { backgroundColor: dialogPalette.accentSoft },
                            ]}
                          >
                            <Text style={styles.sectionHeadingEmoji}>🧾</Text>
                          </View>
                          <View style={styles.sectionHeadingCopy}>
                            <Text
                              style={[
                                styles.sectionHeadingTitle,
                                { color: dialogPalette.textPrimary },
                              ]}
                            >
                              Evidencia del pago
                            </Text>
                            <Text
                              style={[
                                styles.sectionHeadingSubtitle,
                                { color: dialogPalette.textSecondary },
                              ]}
                            >
                              Consulta la imagen subida para esta venta en
                              efectivo sin habilitar nuevas cargas.
                            </Text>
                          </View>
                        </View>
                        <SubidaArchivos venta={ventaSel} />
                      </>
                    ) : null}

                  </View>
                ) : (
                  <View
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
                  </View>
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
  containerContent: {
    paddingBottom: 24,
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  surface: { height: "100%" },
  overviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  overviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  overviewCopy: {
    flex: 1,
    gap: 6,
  },
  overviewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  overviewTitle: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  overviewSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  overviewBadge: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overviewBadgeValue: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  overviewBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  overviewMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  overviewMetric: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 132,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  overviewMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  overviewMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  tableShell: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  tableHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tableHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  tableEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tableTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  tableHeaderBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableHeaderBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#e9ecef",
    borderRadius: 12,
    padding: 20,
  },
  emptyText: { color: "#6c757d", fontSize: 14, textAlign: "center" },
  zeroMargin: { margin: 0 },
  tableStatusCell: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  tableStatusPill: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 30,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tableStatusDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  tableStatusText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
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
    paddingTop: 6,
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
    elevation: 0,
    marginBottom: 14,
    overflow: "hidden",
    padding: 16,
    shadowOpacity: 0,
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
    borderRadius: 32,
    borderWidth: 1,
    gap: 14,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  evidenceRail: {
    borderRadius: 999,
    bottom: 18,
    left: 0,
    opacity: 0.86,
    position: "absolute",
    top: 18,
    width: 4,
  },
  evidenceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  evidenceIcon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  evidenceIconText: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  evidenceCopy: {
    flex: 1,
    minWidth: 0,
  },
  evidenceTitle: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
  },
  evidenceBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  evidenceBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  warningEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  uploadText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
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
