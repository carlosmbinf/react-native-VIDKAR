import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    Button,
    Chip,
    DataTable,
    Dialog,
    Divider,
    IconButton,
    Portal,
    Surface,
    Text,
} from "react-native-paper";

import { VentasRechargeCollection } from "../collections/collections";

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
      return "Pendiente de pago";
    case "PENDIENTE_ENTREGA":
      return "Pendiente";
    case "ENTREGADO":
      return "Entregado";
    case "CANCELADO":
      return "Cancelado";
    default:
      return estado;
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
  const { height, width } = useWindowDimensions();
  const isWide = width > height || width >= 768;
  const flexes = React.useMemo(
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
      { fields: { _id: 1, bloqueadoDesbloqueadoPor: 1 } },
    );
    return Meteor.users
      .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
      .fetch()
      .map((element) => element._id);
  }, [Meteor.userId()]);

  const { loading, ventas } = Meteor.useTracker(() => {
    const sub = Meteor.subscribe("ventasRecharge", {
      "producto.carritos.type": "REMESA",
    });
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
      sort: { createdAt: -1 },
    });
    return { loading: !sub.ready(), ventas: docs.fetch() };
  }, [JSON.stringify(listIdSubordinados), isAdmin, isAdminPrincipal]);

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

  const formatFecha = (date) => (date ? new Date(date).toLocaleString() : "-");
  const money = (value, moneda) => `${value ?? 0} ${moneda ?? ""}`.trim();

  const maxDialogHeight = Math.floor(height * 0.9);
  const maxScrollHeight = Math.max(200, maxDialogHeight - 140);

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Lista de Remesas
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
            ventas.map((row, index) => {
              const estadoDerivado = deriveEstadoVenta(row);
              return (
                <DataTable.Row key={row?._id || index}>
                  <DataTable.Cell style={{ flex: flexes.fecha }}>
                    {formatFecha(row?.createdAt)}
                  </DataTable.Cell>
                  {isWide ? (
                    <DataTable.Cell style={{ flex: flexes.metodo }}>
                      {row?.metodoPago || "-"}
                    </DataTable.Cell>
                  ) : null}
                  <DataTable.Cell style={{ flex: flexes.estado }}>
                    <Chip
                      compact={!isWide}
                      style={{
                        backgroundColor: chipColorEstado(estadoDerivado),
                      }}
                      textStyle={styles.whiteChipText}
                    >
                      {estadoLabel(estadoDerivado)}
                    </Chip>
                  </DataTable.Cell>
                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.cobrado }}>
                      {money(row?.cobrado, row?.monedaCobrado)}
                    </DataTable.Cell>
                  ) : null}
                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.enviado }}>
                      {money(row?.precioOficial, row?.monedaPrecioOficial)}
                    </DataTable.Cell>
                  ) : null}
                  {isWide ? (
                    <DataTable.Cell numeric style={{ flex: flexes.items }}>
                      {getItemsCount(row)}
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
          <Dialog
            visible={visible}
            onDismiss={closeDialog}
            style={{ maxHeight: maxDialogHeight }}
          >
            <Dialog.Content>
              <ScrollView
                style={{ maxHeight: maxScrollHeight }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl refreshing={false} onRefresh={() => {}} />
                }
              >
                {ventaSel ? (
                  <View style={styles.dialogContent}>
                    <View style={styles.topBlock}>
                      <Text style={styles.line}>
                        <Text style={styles.bold}>ID de la Venta: </Text>
                        {ventaSel._id}
                      </Text>
                      <Divider style={styles.bottomDivider} />
                      <Text style={styles.line}>
                        📅 <Text style={styles.bold}>Fecha:</Text>{" "}
                        {formatFecha(ventaSel.createdAt)}
                      </Text>
                      <Text style={styles.line}>
                        💳 <Text style={styles.bold}>Método de pago:</Text>{" "}
                        {ventaSel.metodoPago || "-"}
                      </Text>
                      <View style={styles.estadoRow}>
                        <Text style={styles.line}>
                          📊 <Text style={styles.bold}>Estado:</Text>
                        </Text>
                        <Chip
                          compact
                          style={[
                            styles.estadoDialogChip,
                            {
                              backgroundColor: chipColorEstado(
                                deriveEstadoVenta(ventaSel),
                              ),
                            },
                          ]}
                          textStyle={styles.estadoDialogText}
                        >
                          {estadoLabel(deriveEstadoVenta(ventaSel))}
                        </Chip>
                      </View>
                      <Text style={styles.line}>
                        💰 <Text style={styles.bold}>Cobrado:</Text>{" "}
                        {money(ventaSel.cobrado, ventaSel.monedaCobrado)}
                      </Text>
                      <Text style={styles.line}>
                        💸 <Text style={styles.bold}>Enviado:</Text>{" "}
                        {money(
                          ventaSel.precioOficial,
                          ventaSel.monedaPrecioOficial,
                        )}
                      </Text>
                    </View>

                    <Divider />

                    <Text variant="titleMedium" style={styles.itemsTitle}>
                      {`💰 Cantidad de Remesas (${getItemsArray(ventaSel).length})`}
                    </Text>

                    {getItemsArray(ventaSel).length === 0 ? (
                      <Surface style={styles.warningBox}>
                        <Text style={styles.warningText}>
                          ⚠️ Sin remesas registradas
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
                                borderLeftColor: isCompleted
                                  ? "#28a745"
                                  : "#ffc107",
                              },
                            ]}
                          >
                            <Text style={styles.itemTitle}>
                              💰 Remesa #{index + 1}
                            </Text>
                            <Text style={styles.itemLine}>
                              👤 <Text style={styles.bold}>Beneficiario:</Text>{" "}
                              {item?.nombre || "Sin especificar"}
                            </Text>
                            <Text style={styles.itemLine}>
                              💳 <Text style={styles.bold}>Tarjeta CUP:</Text>{" "}
                              {item?.tarjetaCUP || "Sin especificar"}
                            </Text>
                            <Text style={styles.itemLine}>
                              💰{" "}
                              <Text style={styles.bold}>Monto a entregar:</Text>{" "}
                              {money(
                                item?.recibirEnCuba,
                                item?.monedaRecibirEnCuba,
                              )}
                            </Text>
                            <Text style={styles.itemLine}>
                              💸 <Text style={styles.bold}>Precio USD:</Text>{" "}
                              {money(item?.precioDolar, "USD")}
                            </Text>
                            {item?.direccionCuba ? (
                              <Text style={styles.itemLine}>
                                📍 <Text style={styles.bold}>Dirección:</Text>{" "}
                                {item.direccionCuba}
                              </Text>
                            ) : null}
                            <Surface
                              style={[
                                styles.stateCard,
                                {
                                  backgroundColor: isCompleted
                                    ? "#d4edda"
                                    : "#fff3cd",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stateTitle,
                                  {
                                    color: isCompleted ? "#155724" : "#856404",
                                  },
                                ]}
                              >
                                {isCompleted ? "✅" : "⏳"} Estado de la Remesa
                              </Text>
                              <Text
                                style={{
                                  color: isCompleted ? "#155724" : "#856404",
                                }}
                              >
                                Entregado: {isCompleted ? "Sí" : "No"}
                              </Text>
                            </Surface>
                            {item?.metodoPago ? (
                              <Chip
                                compact
                                style={styles.paymentChip}
                                textStyle={styles.whiteChipText}
                                icon="credit-card"
                              >
                                {item.metodoPago}
                              </Chip>
                            ) : null}
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

                    {ventaSel?.comentario ? (
                      <Text style={styles.generalComment}>
                        💬 {ventaSel.comentario}
                      </Text>
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
            </Dialog.Content>
            <Dialog.Actions style={styles.actions}>
              <Button
                mode="contained"
                onPress={closeDialog}
                style={styles.closeButton}
              >
                Cerrar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
  },
  bold: { fontWeight: "bold" },
  bottomDivider: { marginBottom: 6 },
  closeButton: { borderRadius: 8 },
  commentBox: {
    backgroundColor: "#e9ecef",
    borderRadius: 6,
    marginTop: 8,
    padding: 8,
  },
  commentText: {
    color: "#6c757d",
    fontStyle: "italic",
  },
  container: { flex: 1 },
  dialogContent: { borderRadius: 8 },
  errorBox: {
    backgroundColor: "#f8d7da",
    borderRadius: 8,
    padding: 20,
  },
  errorText: { color: "#721c24", textAlign: "center" },
  estadoDialogChip: { marginLeft: 8 },
  estadoDialogText: { color: "black", fontSize: 12 },
  estadoRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
  },
  generalComment: { fontStyle: "italic", marginTop: 8 },
  itemCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 12,
    maxWidth: 400,
    padding: 14,
  },
  itemLine: { marginBottom: 4 },
  itemTitle: {
    color: "#343a40",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  itemsTitle: { marginBottom: 12, marginTop: 12 },
  line: { marginBottom: 6 },
  paymentChip: {
    alignSelf: "flex-start",
    backgroundColor: "#17a2b8",
    marginVertical: 6,
  },
  stateCard: {
    borderRadius: 6,
    marginVertical: 8,
    padding: 8,
  },
  stateTitle: { fontWeight: "bold", marginBottom: 4 },
  surface: { height: "100%" },
  title: { marginBottom: 16 },
  topBlock: { borderRadius: 6, marginBottom: 0, padding: 0 },
  warningBox: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderRadius: 6,
    borderWidth: 1,
    padding: 16,
  },
  warningText: { color: "#856404", textAlign: "center" },
  whiteChipText: { color: "white" },
  zeroMargin: { margin: 0 },
});

export default TableListRemesa;
