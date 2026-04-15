import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
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
    TransaccionRecargasCollection,
    VentasRechargeCollection,
} from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const chipColorEstado = (estado) => {
  switch (estado) {
    case "ENTREGADA":
      return "#28a745";
    case "PENDIENTE_ENTREGA":
      return "#ffc107";
    case "CANCELADA":
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
    case "ENTREGADA":
      return "Pagado";
    case "CANCELADA":
      return "Cancelado";
    default:
      return estado;
  }
};

const chipTextColorEstado = (estado) =>
  estado === "PENDIENTE_ENTREGA" ? "#422006" : "#ffffff";

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
  )?.filter((carrito) => carrito.type === "RECARGA") || [];

const TableRecargas = () => {
  const { width, height } = useWindowDimensions();
  const isWide = width > height || width >= 768;
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const { top } = useSafeAreaInsets();
  const dialogPalette = React.useMemo(
    () => getDialogPalette(isDarkMode),
    [isDarkMode],
  );

  const flexes = React.useMemo(
    () =>
      isWide
        ? {
            fecha: 1.4,
            metodo: 1.1,
            estado: 1.2,
            cobrado: 0.9,
            enviado: 0.9,
            items: 0.6,
            acc: 0.35,
          }
        : { fecha: 1.6, estado: 1.5, acc: 0.35 },
    [isWide],
  );

  const isAdmin = Meteor.user()?.profile?.role === "admin" || false;
  const isAdminPrincipal = Meteor.user()?.username === "carlosmbinf" || false;

  const listIdSubordinados = Meteor.useTracker(() => {
    if (isAdmin) {
      Meteor.subscribe(
        "user",
        { bloqueadoDesbloqueadoPor: Meteor.userId() },
        { fields: { _id: 1, bloqueadoDesbloqueadoPor: 1 } },
      );
      return Meteor.users
        .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
        .fetch()
        ?.map((element) => element._id);
    }

    return [];
  }, [isAdmin]);

  const { loading, ventasArr } = Meteor.useTracker(() => {
    const query = isAdminPrincipal
      ? { "producto.carritos.type": "RECARGA" }
      : isAdmin
        ? {
            "producto.carritos.type": "RECARGA",
            $or: [
              { userId: Meteor.userId() },
              { userId: { $in: listIdSubordinados } },
            ],
          }
        : {
            "producto.carritos.type": "RECARGA",
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
  }, [isAdmin, isAdminPrincipal, JSON.stringify(listIdSubordinados)]);

  const carritoIds = React.useMemo(() => {
    const ids = [];
    for (const venta of ventasArr) {
      const carritos = getItemsArray(venta) || [];
      for (const carrito of carritos) {
        if (carrito?._id) {
          ids.push(String(carrito._id));
        }
      }
    }
    return Array.from(new Set(ids));
  }, [ventasArr]);

  const { transacciones } = Meteor.useTracker(() => {
    if (!carritoIds.length) {
      return { cargandoTransacciones: false, transacciones: [] };
    }
    const sub = Meteor.subscribe("transacciones", {
      externalId: { $in: carritoIds },
    });
    return {
      cargandoTransacciones: !sub.ready(),
      transacciones: TransaccionRecargasCollection.find({
        externalId: { $in: carritoIds },
      }).fetch(),
    };
  }, [JSON.stringify(carritoIds)]);

  const [visible, setVisible] = React.useState(false);
  const [ventaSel, setVentaSel] = React.useState(null);

  const openDialog = (venta) => {
    setVentaSel(venta);
    setVisible(true);
  };

  const closeDialog = () => {
    setVisible(false);
    setVentaSel(null);
  };

  const transaccion = (idCarrito) =>
    transacciones?.find((transaction) => transaction.externalId === idCarrito);

  const formatFecha = (value) =>
    value ? new Date(value).toLocaleString() : "-";
  const money = (value, currency) => `${value ?? 0} ${currency ?? ""}`.trim();

  const deriveEstadoVenta = (venta) => {
    const carritos = getItemsArray(venta) || [];
    if (venta?.isCobrado) {
      return "ENTREGADA";
    }
    if (venta?.isCancelada) {
      return "CANCELADA";
    }

    const transactionList = transacciones?.filter((transaction) =>
      carritos?.map((carrito) => carrito._id)?.includes(transaction.externalId),
    );
    const allCompleted =
      transactionList.length > 0
        ? transactionList.every(
            (transaction) => transaction?.status?.message === "COMPLETED",
          )
        : false;
    const allCancelled =
      transactionList.length > 0
        ? transactionList.every(
            (transaction) => transaction?.status?.message === "CANCELLED",
          )
        : false;

    if (allCompleted) {
      return "ENTREGADA";
    }
    if (allCancelled) {
      return "CANCELADA";
    }
    if (venta?.isCobrado !== true) {
      return "PENDIENTE_PAGO";
    }
    if (carritos.length === 0) {
      return "PENDIENTE_ENTREGA";
    }
    return "PENDIENTE_ENTREGA";
  };
  const selectedEstado = ventaSel ? deriveEstadoVenta(ventaSel) : null;
  const selectedItems = getItemsArray(ventaSel);

  return (
    <ScrollView style={styles.container} scrollEnabled>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Lista de Recargas
        </Text>

        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ flex: flexes.fecha }}>
              Fecha
            </DataTable.Title>
            {isWide ? (
              <DataTable.Title style={{ flex: flexes.metodo }}>
                Método
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
              <DataTable.Title numeric style={{ flex: flexes.enviado }}>
                Enviado
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
          ) : (
            ventasArr.map((row, index) => {
              const fecha = formatFecha(row?.createdAt);
              const metodo = row?.metodoPago || "-";
              const cobrado = money(row?.cobrado, row?.monedaCobrado);
              const enviado = money(
                row?.precioOficial,
                row?.monedaPrecioOficial,
              );
              const items = getItemsCount(row);
              const estadoDerivado = deriveEstadoVenta(row);

              return (
                <DataTable.Row key={row?._id || index}>
                  <DataTable.Cell style={{ flex: flexes.fecha }}>
                    {fecha}
                  </DataTable.Cell>
                  {isWide ? (
                    <DataTable.Cell style={{ flex: flexes.metodo }}>
                      {metodo}
                    </DataTable.Cell>
                  ) : null}
                  <DataTable.Cell style={{ flex: flexes.estado }}>
                    <Chip
                      compact={!isWide}
                      style={{
                        backgroundColor: chipColorEstado(estadoDerivado),
                      }}
                      textStyle={{ color: "white" }}
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
                    <DataTable.Cell numeric style={{ flex: flexes.enviado }}>
                      {enviado}
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
                      style={styles.infoButton}
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
            theme={{ colors: { primary: "green" } }}
            visible={visible}
            onDismiss={closeDialog}
            style={styles.modalWrapper}
            contentContainerStyle={[
              styles.containerStyle,
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
                styles.modalBackdropTint,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(5, 11, 24, 0.44)"
                    : "rgba(248, 250, 252, 0.24)",
                },
              ]}
            />
            <View style={styles.dialogTitleContainer}>
              <Text style={styles.dialogTitleText}>Detalles de la Venta:</Text>
              <IconButton icon="close" onPress={() => setVisible(false)} />
            </View>
            <Divider />
            <View style={styles.dialogBody}>
              <ScrollView
                style={styles.dialogScroll}
                contentContainerStyle={styles.dialogScrollContent}
                refreshControl={
                  <RefreshControl
                    refreshing={false}
                    onRefresh={() => {
                      try {
                        ventaSel?.producto?.carritos?.forEach(
                          async (carrito) => {
                            const currentTransaction = await transaccion(
                              carrito._id,
                            );
                            if (!currentTransaction) {
                              return;
                            }

                            const message = currentTransaction?.status?.message;
                            const isFinalState = [
                              "COMPLETED",
                              "CANCELLED",
                              "REJECTED-INSUFFICIENT-BALANCE",
                              "FAILED",
                            ].includes(message);

                            if (isFinalState) {
                              Alert.alert(
                                `Transacción ${deriveEstadoVenta(ventaSel)?.toLocaleLowerCase()}`,
                                "El estado de la recarga ya se encuentra actualizado.",
                              );
                              return;
                            }

                            Meteor.call(
                              "dtshop.getStatusTransaccionById",
                              currentTransaction.id,
                              (error) => {
                                if (error) {
                                  Alert.alert(
                                    "Info",
                                    `Error en la transacción asociada a la recarga con ID:\n${carrito._id}`,
                                  );
                                }
                              },
                            );
                          },
                        );
                      } catch (error) {
                        console.log(error);
                      }
                    }}
                  />
                }
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
                            Revisa el estado general y cada recarga asociada sin
                            perder el contexto de la operación.
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
                            Recargas
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
                        <Text style={styles.sectionHeadingEmoji}>📱</Text>
                      </View>
                      <View style={styles.sectionHeadingCopy}>
                        <Text
                          style={[
                            styles.sectionHeadingTitle,
                            { color: dialogPalette.textPrimary },
                          ]}
                        >
                          Recargas incluidas
                        </Text>
                        <Text
                          style={[
                            styles.sectionHeadingSubtitle,
                            { color: dialogPalette.textSecondary },
                          ]}
                        >
                          Se muestra la misma información operativa con una
                          lectura más clara por recarga.
                        </Text>
                      </View>
                    </View>

                    {selectedItems.length === 0 ? (
                      <Surface
                        style={[
                          styles.emptyItemsCard,
                          {
                            backgroundColor: dialogPalette.warningBg,
                            borderColor: dialogPalette.warningBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.emptyItemsText,
                            { color: dialogPalette.warningText },
                          ]}
                        >
                          ⚠️ Sin recargas registradas
                        </Text>
                      </Surface>
                    ) : (
                      selectedItems.map((item, index) => {
                        const itemTransaction = transacciones?.find(
                          (transaction) => transaction.externalId === item._id,
                        );
                        const isCompleted =
                          itemTransaction?.status?.message === "COMPLETED";
                        const isFailed =
                          item?.status === "FAILED" ||
                          itemTransaction?.status?.message === "CANCELLED";
                        const hasPromotion =
                          !!item?.producto?.promotions?.length;

                        const getBorderColor = () => {
                          if (isFailed) {
                            return "#dc3545";
                          }
                          if (isCompleted) {
                            return "#28a745";
                          }
                          return "#ffc107";
                        };
                        const statusTone = isFailed
                          ? {
                              backgroundColor: isDarkMode
                                ? "rgba(127, 29, 29, 0.32)"
                                : "#fff1f2",
                              borderColor: isDarkMode
                                ? "rgba(248, 113, 113, 0.24)"
                                : "#fecdd3",
                              textColor: isDarkMode ? "#fecaca" : "#991b1b",
                            }
                          : isCompleted
                            ? {
                                backgroundColor: isDarkMode
                                  ? "rgba(20, 83, 45, 0.34)"
                                  : "#f0fdf4",
                                borderColor: isDarkMode
                                  ? "rgba(74, 222, 128, 0.22)"
                                  : "#bbf7d0",
                                textColor: isDarkMode ? "#bbf7d0" : "#166534",
                              }
                            : {
                                backgroundColor: isDarkMode
                                  ? "rgba(133, 77, 14, 0.34)"
                                  : "#fffbeb",
                                borderColor: isDarkMode
                                  ? "rgba(251, 191, 36, 0.24)"
                                  : "#fde68a",
                                textColor: isDarkMode ? "#fde68a" : "#92400e",
                              };

                        return (
                          <Surface
                            key={item._id || index}
                            style={[
                              styles.rechargeCard,
                              {
                                backgroundColor: dialogPalette.surface,
                                borderColor: dialogPalette.border,
                                borderLeftColor: getBorderColor(),
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
                                >{`Recarga #${index + 1}`}</Text>
                                <Text
                                  style={[
                                    styles.rechargeTitle,
                                    { color: dialogPalette.textPrimary },
                                  ]}
                                >
                                  {item?.nombre || "Cliente sin especificar"}
                                </Text>
                                <Text
                                  style={[
                                    styles.itemCardSubtitle,
                                    { color: dialogPalette.textSecondary },
                                  ]}
                                >
                                  {item?.movilARecargar || "Sin móvil asociado"}
                                </Text>
                              </View>
                              <View style={styles.itemCardHeaderActions}>
                                {hasPromotion ? (
                                  <Chip
                                    compact
                                    style={styles.itemBadgePromo}
                                    textStyle={styles.itemBadgePromoText}
                                  >
                                    Promo
                                  </Chip>
                                ) : null}
                                <Chip
                                  compact
                                  style={[
                                    styles.itemStatusChip,
                                    {
                                      backgroundColor:
                                        statusTone.backgroundColor,
                                      borderColor: statusTone.borderColor,
                                    },
                                  ]}
                                  textStyle={[
                                    styles.itemStatusChipText,
                                    { color: statusTone.textColor },
                                  ]}
                                >
                                  {itemTransaction?.status?.message ||
                                    item?.status ||
                                    "Pendiente"}
                                </Chip>
                              </View>
                            </View>

                            <View style={styles.itemInfoGrid}>
                              {[
                                {
                                  label: "ID de la recarga",
                                  value: itemTransaction?._id || "N/A",
                                },
                                {
                                  label: "Cliente",
                                  value: item?.nombre || "Sin especificar",
                                },
                                {
                                  label: "Móvil",
                                  value:
                                    item?.movilARecargar || "Sin especificar",
                                },
                                {
                                  label: "Precio",
                                  value: money(item.cobrarUSD, "USD"),
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
                                {isFailed ? "❌" : isCompleted ? "✅" : "⏳"}{" "}
                                Estado de la Recarga
                              </Text>
                              <Text
                                style={[
                                  styles.statusDetailLine,
                                  { color: statusTone.textColor },
                                ]}
                              >
                                {`Entregado: ${isCompleted ? "Sí" : "No"}`}
                              </Text>
                              <Text
                                style={[
                                  styles.statusDetailLine,
                                  { color: statusTone.textColor },
                                ]}
                              >
                                {`Estado: ${itemTransaction?.status?.message || item?.status || "No Disponible"}`}
                              </Text>

                              {isFailed && itemTransaction?.status?.error ? (
                                <Text
                                  style={[
                                    styles.errorText,
                                    { color: statusTone.textColor },
                                  ]}
                                >{`⚠️ Error: ${itemTransaction.status.error}`}</Text>
                              ) : null}
                            </Surface>

                            {item?.comentario ? (
                              <Surface
                                style={[
                                  styles.commentCard,
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
                                  Comentario de la recarga
                                </Text>
                                <Text
                                  style={[
                                    styles.commentText,
                                    { color: dialogPalette.textSecondary },
                                  ]}
                                >{`💬 ${item.comentario}`}</Text>
                              </Surface>
                            ) : null}
                          </Surface>
                        );
                      })
                    )}

                    {ventaSel?.metodoPago === "EFECTIVO" ? (
                      <Surface
                        style={[
                          styles.warningCard,
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
                            styles.warningText,
                            { color: dialogPalette.warningText },
                          ]}
                        >
                          Debe subir evidencia para corroborar el pago y
                          autorizar la recarga.
                        </Text>
                        <SubidaArchivos venta={ventaSel} />
                      </Surface>
                    ) : null}
                  </View>
                ) : (
                  <Surface
                    style={[
                      styles.errorCard,
                      {
                        backgroundColor: dialogPalette.warningBg,
                        borderColor: dialogPalette.warningBorder,
                      },
                    ]}
                  >
                    <Text style={styles.errorCardText}>
                      ❌ Sin datos disponibles
                    </Text>
                  </Surface>
                )}

                {ventaSel?.comentario ? (
                  <Surface
                    style={[
                      styles.footerCommentCard,
                      {
                        backgroundColor: dialogPalette.noteBg,
                        borderColor: dialogPalette.noteBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.footerCommentLabel,
                        { color: dialogPalette.textMuted },
                      ]}
                    >
                      Comentario general de la venta
                    </Text>
                    <Text
                      style={[
                        styles.footerComment,
                        { color: dialogPalette.textSecondary },
                      ]}
                    >
                      💬 {ventaSel.comentario}
                    </Text>
                  </Surface>
                ) : null}
              </ScrollView>
            </View>
          </Modal>
        </Portal>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  surface: {
    height: "100%",
  },
  title: {
    marginBottom: 16,
    textAlign: "center",
  },
  infoButton: {
    margin: 0,
  },
  modalWrapper: {
    justifyContent: "flex-start",
    marginBottom: 0,
    marginTop: 0,
  },
  containerStyle: {
    flex: 1,
    height: "100%",
    margin: 0,
    padding: 0,
  },
  modalBackdropTint: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogTitleContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  dialogTitleText: {
    fontSize: 20,
    fontWeight: "800",
  },
  dialogBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  dialogScroll: {
    flex: 1,
  },
  dialogScrollContent: {
    paddingBottom: 28,
  },
  ventaDetailContainer: {
    gap: 14,
    paddingTop: 14,
  },
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
  summaryTitleBlock: {
    flex: 1,
    gap: 6,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  summarySubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroStatusChip: {
    borderRadius: 999,
    marginLeft: 8,
  },
  heroStatusChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
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
  summaryMetricValue: {
    fontSize: 14,
    fontWeight: "700",
  },
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
  sectionHeadingEmoji: {
    fontSize: 18,
  },
  sectionHeadingCopy: {
    flex: 1,
    gap: 3,
  },
  sectionHeadingTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  sectionHeadingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyItemsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  emptyItemsText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  rechargeCard: {
    borderLeftWidth: 4,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 16,
    position: "relative",
  },
  itemCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  itemCardHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  itemCardEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  rechargeTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  itemCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemCardHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "46%",
  },
  itemBadgePromo: {
    alignSelf: "flex-end",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
  },
  itemBadgePromoText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },
  itemStatusChip: {
    alignSelf: "flex-end",
    borderRadius: 999,
    borderWidth: 1,
  },
  itemStatusChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
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
  itemInfoValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  statusDetailLine: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginBottom: 3,
  },
  errorText: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 8,
  },
  commentCard: {
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
  commentText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19,
  },
  warningCard: {
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
  warningText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginBottom: 12,
    textAlign: "center",
  },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  errorCardText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  footerCommentCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  footerCommentLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  footerComment: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
  },
});

export default TableRecargas;
