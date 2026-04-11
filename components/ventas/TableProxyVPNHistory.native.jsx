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

import SubidaArchivos from "../archivos/SubidaArchivos.native";
import {
    EvidenciasVentasEfectivoCollection,
    VentasRechargeCollection,
} from "../collections/collections";
import AppHeader from "../Header/AppHeader";

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
            <View
              style={[
                styles.modalBackdrop,
                {
                  backgroundColor: theme.dark
                    ? "rgba(8, 15, 28, 0.82)"
                    : "rgba(255, 255, 255, 0.9)",
                },
              ]}
            />
            <View style={styles.dialogTitleContainer}>
              <Text style={styles.dialogTitleText}>Detalles de la Venta:</Text>
              <IconButton icon="close" onPress={closeDialog} />
            </View>
            <Divider />
            <View style={styles.dialogBody}>
              <ScrollView style={styles.dialogScroll}>
                {ventaSel ? (
                  <View style={styles.ventaDetailContainer}>
                    <View style={styles.ventaHeaderBlock}>
                      <Text style={styles.detailLine}>
                        <Text style={styles.bold}>ID de la Venta: </Text>
                        {ventaSel._id}
                      </Text>
                      <Text style={styles.detailLine}>
                        📅 <Text style={styles.bold}>Fecha:</Text>{" "}
                        {formatFecha(ventaSel.createdAt)}
                      </Text>
                      <Text style={styles.detailLine}>
                        💳 <Text style={styles.bold}>Método de pago:</Text>{" "}
                        {ventaSel.metodoPago || "-"}
                      </Text>
                      <View style={styles.estadoRow}>
                        <Text style={styles.detailLine}>
                          📊 <Text style={styles.bold}>Estado:</Text>
                        </Text>
                        <Chip
                          compact
                          style={[
                            styles.estadoChip,
                            {
                              backgroundColor: chipColorEstado(
                                deriveEstadoVenta(ventaSel),
                              ),
                            },
                          ]}
                          textStyle={styles.estadoChipText}
                        >
                          {estadoLabel(deriveEstadoVenta(ventaSel))}
                        </Chip>
                      </View>
                    </View>
                    <Divider />

                    <Text
                      variant="titleMedium"
                      style={styles.itemsTitle}
                    >{`📦 Paquetes (${getItemsArray(ventaSel).length})`}</Text>

                    {getItemsArray(ventaSel).length === 0 ? (
                      <Surface style={styles.warningBox}>
                        <Text style={styles.warningText}>
                          ⚠️ Sin paquetes registrados
                        </Text>
                      </Surface>
                    ) : (
                      getItemsArray(ventaSel).map((item, index) => {
                        const typeColor = getTypeColor(item.type);
                        const isEntregado = item.entregado === true;
                        return (
                          <Surface
                            key={item._id || index}
                            style={[
                              styles.packageCard,
                              { borderLeftColor: typeColor },
                            ]}
                          >
                            <View style={styles.packageHeader}>
                              <Text style={styles.packageTitle}>
                                {item.type === "PROXY" ? "📡" : "🔒"} Paquete{" "}
                                {item.type} #{index + 1}
                              </Text>
                              <Chip
                                compact
                                icon={getTypeIcon(item.type)}
                                style={{ backgroundColor: typeColor }}
                                textStyle={styles.typeChipText}
                              >
                                {item.type}
                              </Chip>
                            </View>

                            <Text style={styles.packageLine}>
                              <Text style={styles.bold}>ID del Paquete: </Text>
                              {item._id || "N/A"}
                            </Text>
                            <Text style={styles.packageLine}>
                              👤 <Text style={styles.bold}>Cliente:</Text>{" "}
                              {item?.nombre || "Sin especificar"}
                            </Text>
                            <Text style={styles.packageLine}>
                              💾 <Text style={styles.bold}>Datos:</Text>{" "}
                              {megasToGB(item.megas)}
                            </Text>
                            <Text style={styles.packageLine}>
                              💰 <Text style={styles.bold}>Precio:</Text>{" "}
                              {money(item.cobrarUSD, "CUP")}
                            </Text>

                            <Surface
                              style={[
                                styles.statusCard,
                                {
                                  backgroundColor: isEntregado
                                    ? "#d4edda"
                                    : "#fff3cd",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTitle,
                                  {
                                    color: isEntregado ? "#155724" : "#856404",
                                  },
                                ]}
                              >
                                {isEntregado ? "✅" : "⏳"} Estado del Paquete
                              </Text>
                              <Text
                                style={{
                                  color: isEntregado ? "#155724" : "#856404",
                                }}
                              >
                                Entregado: {isEntregado ? "Sí" : "No"}
                              </Text>
                            </Surface>

                            {item?.comentario ? (
                              <Surface style={styles.commentBox}>
                                <Text style={styles.commentText}>
                                  💬 {item.comentario}
                                </Text>
                              </Surface>
                            ) : null}
                          </Surface>
                        );
                      })
                    )}

                    {ventaSel?.metodoPago === "EFECTIVO" ? (
                      <Surface style={styles.uploadBox}>
                        <Text style={styles.uploadText}>
                          ⚠️ Debe subir evidencia para corroborar el pago y
                          autorizar la activación
                        </Text>
                        <SubidaArchivos venta={ventaSel} />
                      </Surface>
                    ) : null}
                  </View>
                ) : (
                  <Surface style={styles.errorBox}>
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
  bold: { fontWeight: "bold" },
  commentBox: {
    backgroundColor: "#e9ecef",
    borderRadius: 6,
    marginTop: 8,
    padding: 8,
  },
  commentText: { color: "#6c757d", fontStyle: "italic" },
  container: { flex: 1 },
  detailLine: { marginBottom: 6 },
  dialogBody: { paddingHorizontal: 10 },
  dialogScroll: { height: "100%" },
  dialogTitleContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  dialogTitleText: { fontSize: 20, fontWeight: "bold" },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#e9ecef",
    borderRadius: 8,
    padding: 20,
  },
  emptyText: { color: "#6c757d", fontSize: 14, textAlign: "center" },
  errorBox: { backgroundColor: "#f8d7da", borderRadius: 8, padding: 20 },
  errorText: { color: "#721c24", textAlign: "center" },
  estadoChip: { marginLeft: 8 },
  estadoChipTableText: { color: "white" },
  estadoChipText: { color: "black", fontSize: 12 },
  estadoRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginBottom: 6,
  },
  itemsTitle: { marginBottom: 12, marginTop: 12 },
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
  packageCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 12,
    maxWidth: 400,
    padding: 14,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  packageLine: { marginBottom: 4 },
  packageTitle: { color: "#343a40", fontSize: 16, fontWeight: "bold" },
  statusCard: { borderRadius: 6, marginVertical: 8, padding: 8 },
  statusTitle: { fontWeight: "bold", marginBottom: 4 },
  surface: { height: "100%" },
  title: { fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  typeChipText: { color: "white", fontSize: 10, fontWeight: "bold" },
  uploadBox: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 5,
    paddingVertical: 8,
  },
  uploadText: { color: "#856404", paddingBottom: 5, textAlign: "center" },
  ventaDetailContainer: { borderRadius: 8 },
  ventaHeaderBlock: { borderRadius: 6, marginBottom: 0, padding: 0 },
  warningBox: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderRadius: 6,
    borderWidth: 1,
    padding: 16,
  },
  warningText: { color: "#856404", textAlign: "center" },
  zeroMargin: { margin: 0 },
});

export default TableProxyVPNHistory;
