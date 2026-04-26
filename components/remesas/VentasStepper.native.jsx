import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Dialog,
    Divider,
    IconButton,
    Portal,
    Snackbar,
    Surface,
    Text
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import SubidaArchivos from "../archivos/SubidaArchivos.native";
import { VentasRechargeCollection } from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const REMESA_STEPPER_FIELDS = {
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
  "producto.carritos.direccionCuba": 1,
  "producto.carritos.entregado": 1,
  "producto.carritos.monedaRecibirEnCuba": 1,
  "producto.carritos.nombre": 1,
  "producto.carritos.recibirEnCuba": 1,
  "producto.carritos.status": 1,
  "producto.carritos.tarjetaCUP": 1,
  "producto.carritos.type": 1,
};

const obtenerEstados = (metodoPago) => {
  if (metodoPago === "EFECTIVO") {
    return [
      "Evidencia de Pago",
      "Pago Confirmado",
      "Pendiente de Entrega",
      "Entregado",
    ];
  }
  return ["Pago Confirmado", "Pendiente de Entrega", "Entregado"];
};

const obtenerPasoDesdeEstado = (venta) => {
  const esEfectivo = venta.metodoPago === "EFECTIVO";
  const offset = esEfectivo ? 1 : 0;
  if (esEfectivo && venta.isCobrado === false) return 0;
  if (venta.isCobrado === false) return offset;

  const itemsPendientes =
    venta?.producto?.carritos?.filter((carrito) => !carrito.entregado)
      ?.length || 0;
  if (itemsPendientes > 0) return offset + 1;
  return offset + 2;
};

const VentasStepper = () => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState({});
  const [expandedVentas, setExpandedVentas] = useState({});
  const [selectedAction, setSelectedAction] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const userId = Meteor.userId();
  const idAdmin = Meteor.useTracker(() => Meteor.userId());
  const dataReady = useDeferredScreenData();

  const listIdSubordinados = Meteor.useTracker(() => {
    if (!dataReady || !idAdmin) return [];
    Meteor.subscribe(
      "user",
      { bloqueadoDesbloqueadoPor: idAdmin },
      { fields: { _id: 1, bloqueadoDesbloqueadoPor: 1 } },
    );
    return Meteor.users
      .find({ bloqueadoDesbloqueadoPor: idAdmin })
      .fetch()
      .map((element) => element._id);
  }, [dataReady, idAdmin]);

  const { loading, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, ventas: [] };
    }

    const filtro =
      Meteor?.user()?.username === "carlosmbinf"
        ? {}
        : {
            $or: [{ userId: { $in: listIdSubordinados } }, { userId }],
          };

    const sub = Meteor.subscribe(
      "ventasRecharge",
      {
        ...filtro,
        "producto.carritos.entregado": false,
        "producto.carritos.type": "REMESA",
        isCancelada: false,
      },
      {
        fields: REMESA_STEPPER_FIELDS,
      },
    );

    return {
      loading: !sub.ready(),
      ventas: VentasRechargeCollection.find(
        {
          ...filtro,
          "producto.carritos.entregado": false,
          "producto.carritos.type": "REMESA",
          isCancelada: false,
        },
        { fields: REMESA_STEPPER_FIELDS, sort: { createdAt: -1 } },
      ).fetch(),
    };
  }, [dataReady, JSON.stringify(listIdSubordinados), userId]);

  const ventasEntregadas = Meteor.useTracker(() => {
    if (!dataReady) {
      return [];
    }

    const filtro =
      Meteor?.user()?.username === "carlosmbinf"
        ? {
            $or: [
              { "producto.carritos.entregado": true, isCancelada: false },
              { "producto.carritos.entregado": false, isCancelada: true },
            ],
            "producto.carritos.type": "REMESA",
          }
        : {
            $or: [
              { "producto.carritos.entregado": true, isCancelada: false },
              { "producto.carritos.entregado": false, isCancelada: true },
            ],
            "producto.carritos.type": "REMESA",
            userId: { $in: [...listIdSubordinados, userId] },
          };

    Meteor.subscribe("ventasRecharge", filtro, {
      fields: REMESA_STEPPER_FIELDS,
    });
    return VentasRechargeCollection.find(filtro, {
      fields: REMESA_STEPPER_FIELDS,
      sort: { createdAt: -1 },
    }).fetch();
  }, [dataReady, JSON.stringify(listIdSubordinados), userId]);

  const toggleExpanded = (ventaId) => {
    setExpandedVentas((current) => ({
      ...current,
      [ventaId]: !current[ventaId],
    }));
  };

  const marcarItemEntregado = (ventaId, itemIndex) => {
    setSelectedAction({ action: "entregar", itemIndex, ventaId });
    setDialogVisible(true);
  };

  const marcarItemNoEntregado = (ventaId, itemIndex) => {
    setSelectedAction({ action: "no_entregar", itemIndex, ventaId });
    setDialogVisible(true);
  };

  const confirmarAccion = () => {
    if (!selectedAction) return;
    const method =
      selectedAction.action === "entregar"
        ? "ventas.marcarItemEntregado"
        : "ventas.marcarItemNoEntregado";

    Meteor.call(
      method,
      { ventaId: selectedAction.ventaId, itemIndex: selectedAction.itemIndex },
      (error) => {
        if (error) {
          alert(error.reason || "No se pudo actualizar el estado");
        } else {
          alert(
            `Item marcado como ${selectedAction.action === "entregar" ? "entregado" : "no entregado"}`,
          );
        }
        setDialogVisible(false);
        setSelectedAction(null);
      },
    );
  };

  const copiarAlPortapapeles = async (texto, tipo) => {
    if (!texto || texto === "N/A") {
      setSnackbarMessage(`⚠️ No hay ${tipo} para copiar`);
      setSnackbarVisible(true);
      return;
    }

    await Clipboard.setStringAsync(String(texto));
    setSnackbarMessage(`✅ ${tipo} copiado al portapapeles`);
    setSnackbarVisible(true);
  };

  const renderStepper = (pasoActual, metodoPago) => {
    const estados = obtenerEstados(metodoPago);
    return (
      <View style={styles.stepperContainer}>
        {estados.map((estado, index) => {
          const isCompleted = index < pasoActual;
          const isActive = index === pasoActual;
          const isLastStepCompleted =
            pasoActual === estados.length - 1 && index === estados.length - 1;
          const isLastStep = index === estados.length - 1;

          return (
            <React.Fragment key={index}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted || isActive || isLastStepCompleted
                      ? styles.stepActive
                      : styles.stepInactive,
                  ]}
                >
                  {isCompleted || isLastStepCompleted ? (
                    <IconButton icon="check" size={16} iconColor="#fff" />
                  ) : (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isCompleted || isActive || isLastStepCompleted) &&
                      styles.stepLabelActive,
                  ]}
                >
                  {estado}
                </Text>
              </View>
              {!isLastStep ? (
                <View style={styles.stepConnectorContainer}>
                  <Divider
                    style={[
                      styles.stepConnector,
                      isCompleted || isLastStepCompleted
                        ? styles.connectorActive
                        : styles.connectorInactive,
                    ]}
                  />
                </View>
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderVentaCard = (venta, index, sectionTitle) => {
    const isExpanded = expandedVentas[venta._id];
    const pasoActual = obtenerPasoDesdeEstado(venta);
    const isAdmin = Meteor.user()?.profile?.role === "admin";
    const esEfectivo = venta.metodoPago === "EFECTIVO";
    const isPendientePago = venta.isCobrado === false;
    const necesitaEvidencia = esEfectivo && isPendientePago;
    const isCancelada = venta.isCancelada === true;
    const totalItems = venta?.producto?.carritos?.length || 0;
    const itemsEntregados =
      venta?.producto?.carritos?.filter((item) => item.entregado)?.length || 0;
    const itemsPendientes = totalItems - itemsEntregados;

    return (
      <Surface key={venta._id} style={styles.card} elevation={3}>
        {isCancelada ? (
          <View style={styles.ribbonContainer}>
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>CANCELADA</Text>
            </View>
          </View>
        ) : null}

        <Card.Title
          title={`${sectionTitle} #${index + 1}`}
          subtitle={venta.createdAt?.toLocaleString()}
          right={(props) => (
            <IconButton
              {...props}
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              onPress={() => toggleExpanded(venta._id)}
            />
          )}
        />
        <Divider />
        <Card.Content>
          {renderStepper(pasoActual, venta.metodoPago)}

          {isExpanded ? (
            <>
              {isCancelada ? (
                <Surface style={styles.alertCancelada} elevation={1}>
                  <IconButton
                    icon="close-circle"
                    size={20}
                    iconColor="#D32F2F"
                    style={styles.zeroMargin}
                  />
                  <Text style={styles.alertCanceladaText}>
                    ❌ Esta venta ha sido cancelada y no se procesará
                  </Text>
                </Surface>
              ) : null}

              {necesitaEvidencia && !isCancelada ? (
                <Surface style={styles.evidenciaCard} elevation={2}>
                  <View style={styles.evidenciaHeader}>
                    <IconButton
                      icon="file-upload"
                      size={24}
                      iconColor="#FF9800"
                    />
                    <Text style={styles.evidenciaTitle}>
                      📤 Subir Evidencia de Pago
                    </Text>
                  </View>
                  <Text style={styles.evidenciaSubtitle}>
                    Debe subir el comprobante de pago en efectivo para que el
                    administrador confirme la transacción y proceda con la
                    entrega de la remesa.
                  </Text>
                  <Divider style={{ marginVertical: 12 }} />
                  <SubidaArchivos venta={venta} />
                </Surface>
              ) : null}

              {isPendientePago && !esEfectivo && !isCancelada ? (
                <Surface style={styles.alertPendientePago} elevation={1}>
                  <IconButton
                    icon="alert-circle"
                    size={20}
                    iconColor="#FF9800"
                    style={styles.zeroMargin}
                  />
                  <Text style={styles.alertPendientePagoText}>
                    ⏳ Esperando confirmación de pago
                  </Text>
                </Surface>
              ) : null}

              <View style={styles.chipContainer}>
                <Chip icon="cash" style={styles.infoChip}>
                  Cobrado: {venta.cobrado} {venta.monedaCobrado || "USD"}
                </Chip>
                <Chip icon="send" style={styles.infoChip}>
                  Enviado: {venta.precioOficial || "N/A"} USD
                </Chip>
                <Chip icon="credit-card" style={styles.infoChip}>
                  {venta.metodoPago || "N/A"}
                </Chip>
              </View>

              {venta.comentario ? (
                <Text style={styles.comentarioGeneral}>
                  📝 {venta.comentario}
                </Text>
              ) : null}

              {!isPendientePago ? (
                <View style={styles.itemsDetailContainer}>
                  <View style={styles.itemsDetailHeader}>
                    <Text
                      style={styles.itemsDetailTitle}
                    >{`📦 Remesas del Pedido (${totalItems})`}</Text>
                    <View style={styles.badgeContainer}>
                      {itemsPendientes > 0 ? (
                        <Chip
                          icon="clock-outline"
                          mode="flat"
                          compact
                          style={styles.badgePendiente}
                          textStyle={styles.badgeText}
                        >
                          {itemsPendientes}
                        </Chip>
                      ) : null}
                      {itemsEntregados > 0 ? (
                        <Chip
                          icon="check-circle"
                          mode="flat"
                          compact
                          style={styles.badgeEntregado}
                          textStyle={styles.badgeText}
                        >
                          {itemsEntregados}
                        </Chip>
                      ) : null}
                    </View>
                  </View>

                  {venta?.producto?.carritos?.map((item, itemIndex) => (
                    <Surface
                      key={item._id || itemIndex}
                      style={[
                        styles.itemDetailCard,
                        item.entregado && styles.itemDetailCardEntregado,
                      ]}
                      elevation={1}
                    >
                      <View
                        style={[
                          styles.estadoBadge,
                          item.entregado
                            ? styles.estadoBadgeEntregado
                            : styles.estadoBadgePendiente,
                        ]}
                      >
                        <IconButton
                          icon={
                            item.entregado ? "check-circle" : "clock-outline"
                          }
                          size={16}
                          iconColor="#fff"
                          style={styles.zeroMargin}
                        />
                      </View>
                      <View style={styles.itemDetailContent}>
                        <Text style={styles.itemDetailTitle}>
                          {item.entregado ? "✅" : "⏳"} Remesa #{itemIndex + 1}
                        </Text>
                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>
                            👤 Destinatario:
                          </Text>
                          <Text style={styles.itemDetailValue}>
                            {item.nombre || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>💰 Monto:</Text>
                          <Text style={styles.itemDetailValue}>
                            {item.recibirEnCuba || "0"}{" "}
                            {item.monedaRecibirEnCuba}
                          </Text>
                        </View>
                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>
                            💳 Tarjeta CUP:
                          </Text>
                          <Text
                            style={[styles.itemDetailValue, { flex: 0.8 }]}
                            numberOfLines={1}
                          >
                            {item.tarjetaCUP || "N/A"}
                          </Text>
                          <IconButton
                            icon="content-copy"
                            size={18}
                            onPress={() =>
                              copiarAlPortapapeles(
                                item.tarjetaCUP,
                                "Tarjeta CUP",
                              )
                            }
                            style={styles.copyButton}
                            iconColor="#6200ee"
                          />
                        </View>
                        {item.direccionCuba ? (
                          <View style={styles.itemDetailRow}>
                            <Text style={styles.itemDetailLabel}>
                              📍 Dirección:
                            </Text>
                            <Text
                              style={[styles.itemDetailValue, { flex: 0.8 }]}
                              numberOfLines={2}
                            >
                              {item.direccionCuba}
                            </Text>
                            <IconButton
                              icon="content-copy"
                              size={18}
                              onPress={() =>
                                copiarAlPortapapeles(
                                  item.direccionCuba,
                                  "Dirección",
                                )
                              }
                              style={styles.copyButton}
                              iconColor="#6200ee"
                            />
                          </View>
                        ) : null}
                        {item.comentario ? (
                          <Surface
                            style={styles.itemComentarioBox}
                            elevation={0}
                          >
                            <Text style={styles.itemComentarioText}>
                              💬 {item.comentario}
                            </Text>
                          </Surface>
                        ) : null}
                        {isAdmin ? (
                          <View style={styles.itemActionButtons}>
                            {item.entregado ? (
                              <Button
                                mode="outlined"
                                icon="undo-variant"
                                onPress={() =>
                                  marcarItemNoEntregado(venta._id, itemIndex)
                                }
                                style={styles.actionButtonRevertir}
                                labelStyle={styles.actionButtonLabel}
                                compact
                              >
                                Marcar No Entregado
                              </Button>
                            ) : (
                              <Button
                                mode="contained"
                                icon="check-bold"
                                onPress={() =>
                                  marcarItemEntregado(venta._id, itemIndex)
                                }
                                style={styles.actionButtonEntregar}
                                labelStyle={styles.actionButtonLabel}
                                compact
                              >
                                Marcar Entregado
                              </Button>
                            )}
                          </View>
                        ) : null}
                      </View>
                    </Surface>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </Card.Content>
      </Surface>
    );
  };

  const renderVentaItem = useCallback(
    ({ item, index }) => renderVentaCard(item, index, "Remesa"),
    [expandedVentas, expandedAccordions, idAdmin],
  );

  const renderVentaEntregadaItem = useCallback(
    ({ item, index }) => renderVentaCard(item, index, "Remesa"),
    [expandedVentas, expandedAccordions, idAdmin],
  );

  const keyExtractor = useCallback((item) => item._id, []);
  const ItemSeparator = useCallback(() => <View style={{ height: 16 }} />, []);
  const EmptyPendientes = useCallback(
    () => (
      <Surface style={styles.emptyState} elevation={3}>
        <IconButton icon="package-variant" size={48} iconColor="#ccc" />
        <Text style={styles.emptyText}>No tienes remesas pendientes</Text>
      </Surface>
    ),
    [],
  );
  const EmptyEntregadas = useCallback(
    () => (
      <Surface style={styles.emptyState} elevation={3}>
        <IconButton icon="check-all" size={48} iconColor="#4CAF50" />
        <Text style={styles.emptyText}>No tienes remesas entregadas</Text>
      </Surface>
    ),
    [],
  );

  if (loading) {
    return (
      <Surface style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Cargando ventas...</Text>
      </Surface>
    );
  }

  return (
    <Surface style={styles.root}>
      <ScrollView style={styles.container}>
        <View style={styles.contentBottom}>
          <Text variant="headlineMedium" style={styles.sectionTitle}>
            Seguimiento de Remesas sin Entregar
          </Text>
          <FlatList
            data={ventas}
            renderItem={renderVentaItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyPendientes}
            scrollEnabled={false}
            removeClippedSubviews
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            initialNumToRender={3}
          />

          <Divider style={{ marginVertical: 24 }} />

          <Text variant="headlineMedium" style={styles.sectionTitle}>
            Remesas Entregadas
          </Text>
          <FlatList
            data={ventasEntregadas}
            renderItem={renderVentaEntregadaItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyEntregadas}
            scrollEnabled={false}
            removeClippedSubviews
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            initialNumToRender={3}
          />
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>Confirmar Acción</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Está seguro de marcar este item como{" "}
              {selectedAction?.action === "entregar"
                ? "entregado"
                : "no entregado"}
              ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={confirmarAccion} mode="contained">
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </Surface>
  );
};

const styles = StyleSheet.create({
  actionButtonEntregar: { backgroundColor: "#4CAF50", borderRadius: 8 },
  actionButtonLabel: { fontSize: 12, fontWeight: "600" },
  actionButtonRevertir: { borderColor: "#F44336", borderRadius: 8 },
  alertCancelada: {
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderLeftColor: "#D32F2F",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertCanceladaText: {
    color: "#B71C1C",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  alertPendientePago: {
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderLeftColor: "#FF9800",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertPendientePagoText: {
    color: "#E65100",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  badgeContainer: { flexDirection: "row", gap: 8 },
  badgeEntregado: { backgroundColor: "#4CAF50" },
  badgePendiente: { backgroundColor: "#FF9800" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  card: {
    borderRadius: 30,
    marginBottom: 16,
    overflow: "hidden",
    paddingBottom: 16,
    position: "relative",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  comentarioGeneral: { color: "#666", fontStyle: "italic", marginTop: 12 },
  connectorActive: { backgroundColor: "#6200ee" },
  connectorInactive: { backgroundColor: "#ccc" },
  container: { flex: 1, padding: 16 },
  contentBottom: { paddingBottom: 50 },
  copyButton: { margin: 0, marginLeft: 4 },
  emptyState: {
    alignItems: "center",
    borderRadius: 30,
    justifyContent: "center",
    marginBottom: 16,
    padding: 40,
  },
  emptyText: { color: "#999", fontSize: 14, marginTop: 8 },
  estadoBadge: {
    alignItems: "center",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
  },
  estadoBadgeEntregado: { backgroundColor: "#4CAF50" },
  estadoBadgePendiente: { backgroundColor: "#FF9800" },
  evidenciaCard: {
    backgroundColor: "#FFF3E0",
    borderLeftColor: "#FF9800",
    borderLeftWidth: 4,
    borderRadius: 12,
    marginVertical: 16,
    padding: 16,
  },
  evidenciaHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
  },
  evidenciaSubtitle: {
    color: "#666",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  evidenciaTitle: {
    color: "#E65100",
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
  },
  infoChip: { margin: 4 },
  itemActionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  itemComentarioBox: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    marginTop: 8,
    padding: 10,
  },
  itemComentarioText: { color: "#666", fontSize: 12, fontStyle: "italic" },
  itemDetailCard: {
    borderLeftColor: "#FF9800",
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    padding: 16,
    position: "relative",
  },
  itemDetailCardEntregado: { borderLeftColor: "#4CAF50", opacity: 0.85 },
  itemDetailContent: { paddingRight: 40 },
  itemDetailLabel: { fontSize: 13, fontWeight: "600", minWidth: 120 },
  itemDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
  },
  itemDetailTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 12 },
  itemDetailValue: { flex: 1, fontSize: 13 },
  itemsDetailContainer: {
    backgroundColor: "rgba(98, 0, 238, 0.03)",
    borderColor: "rgba(98, 0, 238, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  itemsDetailHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  itemsDetailTitle: { flex: 1, fontSize: 16, fontWeight: "bold" },
  loadingContainer: { alignItems: "center", flex: 1, justifyContent: "center" },
  loadingText: { fontSize: 16, marginTop: 16 },
  ribbon: {
    backgroundColor: "#D32F2F",
    elevation: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: -40,
    shadowColor: "#000",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    top: 40,
    transform: [{ rotate: "45deg" }],
    width: 200,
  },
  ribbonContainer: {
    height: 150,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    width: 150,
    zIndex: 10,
  },
  ribbonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  root: { height: "100%" },
  sectionTitle: { fontWeight: "bold", marginBottom: 16 },
  snackbar: { backgroundColor: "#6200ee" },
  stepActive: { backgroundColor: "#6200ee", borderColor: "#6200ee" },
  stepCircle: {
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stepConnector: { height: 2, width: "100%" },
  stepConnectorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 4,
  },
  stepInactive: { backgroundColor: "transparent", borderColor: "#ccc" },
  stepItem: { alignItems: "center", minWidth: 60 },
  stepLabel: { color: "#999", fontSize: 10, marginTop: 4, textAlign: "center" },
  stepLabelActive: { color: "#6200ee", fontWeight: "600" },
  stepNumber: { color: "#fff", fontWeight: "bold" },
  stepperContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  zeroMargin: { margin: 0 },
});

export default VentasStepper;
