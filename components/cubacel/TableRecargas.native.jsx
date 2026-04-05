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
              //   tint={isDarkMode ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
              renderToHardwareTextureAndroid={true}
            />
            <View style={styles.dialogTitleContainer}>
              <Text style={styles.dialogTitleText}>Detalles de la Venta:</Text>
              <IconButton icon="close" onPress={() => setVisible(false)} />
            </View>
            <Divider />
            <View style={styles.dialogBody}>
              <ScrollView
                style={styles.dialogScroll}
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

                    <Text variant="titleMedium" style={styles.itemsTitle}>
                      {`📱 Cantidad de Recargas (${getItemsArray(ventaSel).length})`}
                    </Text>

                    {getItemsArray(ventaSel).length === 0 ? (
                      <Surface style={styles.emptyItemsCard}>
                        <Text style={styles.emptyItemsText}>
                          ⚠️ Sin recargas registradas
                        </Text>
                      </Surface>
                    ) : (
                      getItemsArray(ventaSel).map((item, index) => {
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

                        return (
                          <Surface
                            key={item._id || index}
                            style={[
                              styles.rechargeCard,
                              { borderLeftColor: getBorderColor() },
                            ]}
                          >
                            {hasPromotion ? (
                              <View style={styles.rechargeRibbon}>
                                <Text style={styles.rechargeRibbonText}>
                                  🎁 Promo
                                </Text>
                              </View>
                            ) : null}

                            <Text
                              style={styles.rechargeTitle}
                            >{`📱 Recarga #${index + 1}`}</Text>
                            <Text style={styles.rechargeLine}>
                              <Text style={styles.bold}>
                                ID de la Recarga:{" "}
                              </Text>
                              {itemTransaction?._id || "N/A"}
                            </Text>
                            <Text style={styles.rechargeLine}>
                              👤 <Text style={styles.bold}>Cliente:</Text>{" "}
                              {item?.nombre || "Sin especificar"}
                            </Text>
                            <Text style={styles.rechargeLine}>
                              📞 <Text style={styles.bold}>Móvil:</Text>{" "}
                              {item?.movilARecargar || "Sin especificar"}
                            </Text>
                            <Text style={styles.rechargeLine}>
                              💰 <Text style={styles.bold}>Precio:</Text>{" "}
                              {money(item.cobrarUSD, "USD")}
                            </Text>

                            <Surface
                              style={[
                                styles.statusCard,
                                isFailed
                                  ? styles.statusCardFailed
                                  : isCompleted
                                    ? styles.statusCardCompleted
                                    : styles.statusCardPending,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTitle,
                                  isFailed
                                    ? styles.statusTextFailed
                                    : isCompleted
                                      ? styles.statusTextCompleted
                                      : styles.statusTextPending,
                                ]}
                              >
                                {isFailed ? "❌" : isCompleted ? "✅" : "⏳"}{" "}
                                Estado de la Recarga
                              </Text>
                              <Text
                                style={
                                  isFailed
                                    ? styles.statusTextFailed
                                    : isCompleted
                                      ? styles.statusTextCompleted
                                      : styles.statusTextPending
                                }
                              >
                                {`Entregado: ${isCompleted ? "Sí" : "No"}`}
                              </Text>
                              <Text
                                style={
                                  isFailed
                                    ? styles.statusTextFailed
                                    : isCompleted
                                      ? styles.statusTextCompleted
                                      : styles.statusTextPending
                                }
                              >
                                {`Estado: ${itemTransaction?.status?.message || item?.status || "No Disponible"}`}
                              </Text>

                              {isFailed && itemTransaction?.status?.error ? (
                                <Text
                                  style={styles.errorText}
                                >{`⚠️ Error: ${itemTransaction.status.error}`}</Text>
                              ) : null}
                            </Surface>

                            {item?.comentario ? (
                              <Surface style={styles.commentCard}>
                                <Text
                                  style={styles.commentText}
                                >{`💬 ${item.comentario}`}</Text>
                              </Surface>
                            ) : null}
                          </Surface>
                        );
                      })
                    )}

                    {ventaSel?.metodoPago === "EFECTIVO" ? (
                      <Surface style={styles.warningCard}>
                        <Text style={styles.warningText}>
                          ⚠️ Debe subir Evidencia para poder {"\n"}corroborar el
                          pago y Autorizar la recarga
                        </Text>
                        <SubidaArchivos venta={ventaSel} />
                      </Surface>
                    ) : null}
                  </View>
                ) : (
                  <Surface style={styles.errorCard}>
                    <Text style={styles.errorCardText}>
                      ❌ Sin datos disponibles
                    </Text>
                  </Surface>
                )}

                {ventaSel?.comentario ? (
                  <Text style={styles.footerComment}>
                    💬 {ventaSel.comentario}
                  </Text>
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
  dialogTitleContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 30,
  },
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
  containerStyle: {
    flex: 1,
    height: "100%",
    margin: 0,
    padding: 0,
  },
  dialogTitleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  dialogBody: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  dialogScroll: {
    minHeight: "100%",
  },
  infoButton: {
    margin: 0,
  },
  modalWrapper: {
    justifyContent: "flex-start",
    marginBottom: 0,
    marginTop: 0,
  },
  ventaDetailContainer: {
    borderRadius: 8,
  },
  ventaHeaderBlock: {
    borderRadius: 6,
    marginBottom: 0,
    padding: 0,
    paddingTop: 12,
  },
  detailLine: {
    marginBottom: 6,
  },
  bold: {
    fontWeight: "bold",
  },
  estadoRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginBottom: 6,
  },
  estadoChip: {
    marginLeft: 8,
  },
  estadoChipText: {
    color: "black",
    fontSize: 12,
  },
  itemsTitle: {
    marginBottom: 12,
    marginTop: 12,
  },
  emptyItemsCard: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderRadius: 6,
    borderWidth: 1,
    padding: 16,
  },
  emptyItemsText: {
    color: "#856404",
    textAlign: "center",
  },
  rechargeCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 12,
    maxWidth: 400,
    overflow: "hidden",
    padding: 14,
    position: "relative",
  },
  rechargeRibbon: {
    backgroundColor: "#28a745",
    elevation: 3,
    paddingHorizontal: 40,
    paddingVertical: 5,
    position: "absolute",
    right: -35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    top: 10,
    transform: [{ rotate: "45deg" }],
    zIndex: 10,
  },
  rechargeRibbonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  rechargeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  rechargeLine: {
    marginBottom: 4,
  },
  statusCard: {
    borderRadius: 6,
    marginVertical: 8,
    padding: 8,
  },
  statusCardFailed: {
    backgroundColor: "#f8d7da",
  },
  statusCardCompleted: {
    backgroundColor: "#d4edda",
  },
  statusCardPending: {
    backgroundColor: "#fff3cd",
  },
  statusTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusTextFailed: {
    color: "#721c24",
  },
  statusTextCompleted: {
    color: "#155724",
  },
  statusTextPending: {
    color: "#856404",
  },
  errorText: {
    color: "#721c24",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
  commentCard: {
    backgroundColor: "#e9ecef",
    borderRadius: 6,
    marginTop: 8,
    padding: 8,
  },
  commentText: {
    color: "#6c757d",
    fontStyle: "italic",
  },
  warningCard: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderRadius: 60,
    borderWidth: 1,
    marginTop: 5,
    marginBottom: 20,
  },
  warningText: {
    color: "#856404",
    padding: 5,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "#f8d7da",
    borderRadius: 8,
    padding: 20,
  },
  errorCardText: {
    color: "#721c24",
    textAlign: "center",
  },
  footerComment: {
    fontStyle: "italic",
    marginTop: 8,
  },
});

export default TableRecargas;
