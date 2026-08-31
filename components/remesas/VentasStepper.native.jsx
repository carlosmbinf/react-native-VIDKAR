import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useMemo, useState } from "react";
import {
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    UIManager,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    Divider,
    IconButton,
    Portal,
    Snackbar,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import SubidaArchivos from "../archivos/SubidaArchivos.native";
import { VentasRechargeCollection } from "../collections/collections";
import DrawerBottom from "../drawer/DrawerBottom.native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  recividoEnCuba: 1,
  monedaRecividoEnCuba: 1,
  monedaPrecioOficial: 1,
  fechaConfirmacionCobrado: 1,
  userId: 1,
  producto: 1,
  "producto._id": 1,
  "producto.idOrder": 1,
  "producto.type": 1,
  "producto.createdAt": 1,
  "producto.carritos": 1,
  "producto.carritos._id": 1,
  "producto.carritos.idUser": 1,
  "producto.carritos.idAdmin": 1,
  "producto.carritos.cobrarUSD": 1,
  "producto.carritos.cancelado": 1,
  "producto.carritos.comentario": 1,
  "producto.carritos.createdAt": 1,
  "producto.carritos.descuentoAdmin": 1,
  "producto.carritos.direccionCuba": 1,
  "producto.carritos.entregado": 1,
  "producto.carritos.fechaEntregado": 1,
  "producto.carritos.metodoPago": 1,
  "producto.carritos.monedaACobrar": 1,
  "producto.carritos.monedaRecibirEnCuba": 1,
  "producto.carritos.nombre": 1,
  "producto.carritos.precioDolar": 1,
  "producto.carritos.recibirEnCuba": 1,
  "producto.carritos.status": 1,
  "producto.carritos.tarjetaCUP": 1,
  "producto.carritos.cantidad": 1,
  "producto.carritos.type": 1,
};

const getItemsArray = (venta) =>
  (
    venta?.producto?.carritos ||
    venta?.carrito ||
    venta?.producto?.carrito ||
    []
  ).filter((carrito) => carrito?.type === "REMESA" || !carrito?.type);

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
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);
  const { height: screenHeight } = useWindowDimensions();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const userId = Meteor.userId();
  const idAdmin = Meteor.useTracker(() => Meteor.userId());
  const dataReady = useDeferredScreenData();

  const colors = useMemo(
    () => ({
      accent: isDark ? "#38bdf8" : "#0284c7",
      background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
      bannerCancelada: isDark ? "rgba(239, 68, 68, 0.14)" : "#fef2f2",
      bannerCanceladaBorder: isDark ? "rgba(248, 113, 113, 0.3)" : "#fca5a5",
      bannerCanceladaText: isDark ? "#fca5a5" : "#b91c1c",
      bannerEvidencia: isDark ? "rgba(245, 158, 11, 0.14)" : "#fffbeb",
      bannerEvidenciaBorder: isDark ? "rgba(251, 191, 36, 0.3)" : "#fde68a",
      bannerEvidenciaText: isDark ? "#fde68a" : "#b45309",
      border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      chipBg: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
      danger: isDark ? "#f87171" : "#dc2626",
      itemCard: isDark ? "rgba(30, 41, 59, 0.7)" : "#f8fafc",
      muted: isDark ? "#94a3b8" : "#64748b",
      primary: isDark ? "#60a5fa" : "#2563eb",
      stepActive: isDark ? "#3b82f6" : "#2563eb",
      stepCompleted: isDark ? "#22c55e" : "#16a34a",
      stepInactive: isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1",
      stepTextActive: isDark ? "#f8fafc" : "#0f172a",
      stepTextInactive: isDark ? "#64748b" : "#94a3b8",
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
          setSnackbarMessage(
            `✅ Remesa marcada como ${selectedAction.action === "entregar" ? "entregada" : "no entregada"}`,
          );
          setSnackbarVisible(true);
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

  const formatFecha = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (Number.isInteger(num)) return num.toString();
    return num.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const renderStepper = (pasoActual, metodoPago) => {
    const estados = obtenerEstados(metodoPago);
    const totalSteps = estados.length;
    const progress =
      totalSteps > 1
        ? Math.min(
            100,
            Math.max(0, (Math.min(pasoActual, totalSteps - 1) / (totalSteps - 1)) * 100),
          )
        : 0;

    return (
      <View style={styles.stepperContainer}>
        {/* Barra de progreso de fondo continua conectando los centros de los círculos */}
        <View style={styles.stepperTrackBackground} pointerEvents="none" />
        <View
          style={[
            styles.stepperTrackProgress,
            {
              backgroundColor: colors.stepCompleted,
              width: `${progress * 0.76}%`,
            },
          ]}
          pointerEvents="none"
        />

        {estados.map((estado, index) => {
          const isCompleted = index < pasoActual;
          const isActive = index === pasoActual;
          const isLastStepCompleted =
            pasoActual === totalSteps - 1 && index === totalSteps - 1;

          let circleBg = colors.stepInactive;
          let circleContent = (
            <Text
              style={[
                styles.stepNumber,
                { color: isDark ? "#94a3b8" : "#64748b" },
              ]}
            >
              {index + 1}
            </Text>
          );

          if (isCompleted || isLastStepCompleted) {
            circleBg = colors.stepCompleted;
            circleContent = (
              <IconButton
                icon="check"
                size={14}
                iconColor="#ffffff"
                style={styles.zeroMargin}
              />
            );
          } else if (isActive) {
            circleBg = colors.stepActive;
            circleContent = (
              <Text
                style={[
                  styles.stepNumber,
                  { color: "#ffffff", fontWeight: "700" },
                ]}
              >
                {index + 1}
              </Text>
            );
          }

          return (
            <View key={index} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: circleBg,
                    borderColor: colors.surface,
                  },
                ]}
              >
                {circleContent}
              </View>
              <Text
                numberOfLines={2}
                style={[
                  styles.stepLabel,
                  {
                    color:
                      isActive || isCompleted || isLastStepCompleted
                        ? colors.stepTextActive
                        : colors.stepTextInactive,
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {estado}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderVentaCard = (venta, index, sectionTitle) => {
    const pasoActual = obtenerPasoDesdeEstado(venta);
    const isPendientePago = venta.isCobrado === false;
    const isCancelada = venta.isCancelada === true;
    const items = getItemsArray(venta);
    const totalItems = items.length;
    const itemsEntregados =
      items.filter((item) => item.entregado)?.length || 0;
    const itemsPendientes = totalItems - itemsEntregados;
    const isEntregada = pasoActual === obtenerEstados(venta.metodoPago).length - 1;
    const destinatarios = items
      .map((item) => item?.nombre)
      .filter(Boolean)
      .join(", ");
    const nombreRemesa = destinatarios || "Destinatario pendiente";

    let statusChipColor = colors.warning;
    let statusChipBg = colors.warningBg;
    let statusLabel = "En proceso";

    if (isCancelada) {
      statusChipColor = colors.danger;
      statusChipBg = colors.bannerCancelada;
      statusLabel = "Cancelada";
    } else if (isPendientePago) {
      statusChipColor = colors.warning;
      statusChipBg = colors.warningBg;
      statusLabel = "Pendiente de pago";
    } else if (isEntregada || (itemsPendientes === 0 && totalItems > 0)) {
      statusChipColor = colors.success;
      statusChipBg = colors.successBg;
      statusLabel = "Entregada";
    }

    return (
      <Surface
        key={venta._id}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        elevation={1}
      >
        {/* Header de la tarjeta */}
        <Pressable
          onPress={() => setSelectedVenta(venta)}
          style={styles.cardHeader}
          android_ripple={{ color: colors.chipBg }}
        >
          <View style={styles.cardHeaderTop}>
            <View style={styles.cardTitleRow}>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.text }]}>
                {`Para: ${nombreRemesa}`}
              </Text>
              <View
                style={[styles.statusHeaderBadge, { backgroundColor: statusChipBg }]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.statusHeaderText, { color: statusChipColor }]}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
            <IconButton
              icon="chevron-right"
              size={22}
              iconColor={colors.muted}
              style={styles.zeroMargin}
              onPress={() => setSelectedVenta(venta)}
            />
          </View>

          <View style={styles.cardMetaRow}>
            <Text style={[styles.cardDate, { color: colors.muted }]}>
              📅 {formatFecha(venta.createdAt)}
            </Text>
            <Text style={[styles.cardId, { color: colors.subtle }]}>
              ID: {String(venta._id).slice(-6)}
            </Text>
          </View>
        </Pressable>

        <Divider style={{ backgroundColor: colors.border }} />

        {/* Contenido del Stepper */}
        <View style={styles.cardBody}>
          {renderStepper(pasoActual, venta.metodoPago)}

          <Button
            mode="contained-tonal"
            icon="chevron-up"
            onPress={() => setSelectedVenta(venta)}
            style={styles.detailsButton}
            contentStyle={styles.detailsButtonContent}
            labelStyle={styles.detailsButtonLabel}
          >
            Ver más detalles
          </Button>
        </View>
      </Surface>
    );
  };

  const renderVentaItem = useCallback(
    ({ item, index }) => renderVentaCard(item, index, "Remesa"),
    [renderVentaCard],
  );

  const renderVentaEntregadaItem = useCallback(
    ({ item, index }) => renderVentaCard(item, index, "Remesa"),
    [renderVentaCard],
  );

  const keyExtractor = useCallback((item) => item._id, []);
  const ItemSeparator = useCallback(() => <View style={{ height: 10 }} />, []);

  const EmptyPendientes = useCallback(
    () => (
      <Surface
        style={[
          styles.emptyState,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        elevation={0}
      >
        <IconButton icon="check-circle-outline" size={40} iconColor={colors.success} />
        <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.text }]}>
          No tienes remesas pendientes
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          Todas tus remesas están completadas o no has creado pedidos recientemente.
        </Text>
      </Surface>
    ),
    [colors],
  );

  const EmptyEntregadas = useCallback(
    () => (
      <Surface
        style={[
          styles.emptyState,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        elevation={0}
      >
        <IconButton icon="package-variant" size={40} iconColor={colors.muted} />
        <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.text }]}>
          Sin historial de entregas
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          Las remesas completadas aparecerán aquí para tu consulta histórica.
        </Text>
      </Surface>
    ),
    [colors],
  );

  if (loading) {
    return (
      <Surface style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Cargando seguimiento de remesas...
        </Text>
      </Surface>
    );
  }

  return (
    <View style={styles.root}>
      {/* Sección Activas / Pendientes */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            ⏳ Remesas en Seguimiento
          </Text>
          {ventas.length > 0 ? (
            <Chip compact style={{ backgroundColor: colors.warningBg }}>
              <Text style={{ color: colors.warning, fontSize: 11, fontWeight: "700" }}>
                {ventas.length}
              </Text>
            </Chip>
          ) : null}
        </View>
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Progreso en tiempo real de pagos y entregas a destinatarios
        </Text>
      </View>

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

      {/* Sección Entregadas / Historial */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <View style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            ✅ Remesas Entregadas / Historial
          </Text>
          {ventasEntregadas.length > 0 ? (
            <Chip compact style={{ backgroundColor: colors.successBg }}>
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: "700" }}>
                {ventasEntregadas.length}
              </Text>
            </Chip>
          ) : null}
        </View>
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Comprobantes completados y cancelaciones
        </Text>
      </View>

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

      {/* Drawer profesional de detalles de la remesa seleccionada */}
      <DrawerBottom
        open={Boolean(selectedVenta)}
        onClose={() => setSelectedVenta(null)}
        overlayOpacity={0.4}
        title="Detalles de la Remesa"
      >
        <ScrollView
          style={[styles.drawerScroll, { maxHeight: screenHeight * 0.8 }]}
          contentContainerStyle={styles.drawerScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {selectedVenta ? (() => {
            const pasoActual = obtenerPasoDesdeEstado(selectedVenta);
            const esEfectivo = selectedVenta.metodoPago === "EFECTIVO";
            const isPendientePago = selectedVenta.isCobrado === false;
            const necesitaEvidencia = esEfectivo && isPendientePago;
            const isCancelada = selectedVenta.isCancelada === true;
            const items = getItemsArray(selectedVenta);
            const totalItems = items.length;
            const itemsEntregados =
              items.filter((item) => item.entregado)?.length || 0;
            const itemsPendientes = totalItems - itemsEntregados;
            const isEntregada =
              pasoActual === obtenerEstados(selectedVenta.metodoPago).length - 1;
            const destinatarios = items
              .map((item) => item?.nombre)
              .filter(Boolean)
              .join(", ");
            const nombreRemesa = destinatarios || "Destinatario pendiente";

            let statusColor = colors.warning;
            let statusBg = colors.warningBg;
            let statusText = "En proceso";

            if (isCancelada) {
              statusColor = colors.danger;
              statusBg = colors.bannerCancelada;
              statusText = "Cancelada";
            } else if (isPendientePago) {
              statusColor = colors.warning;
              statusBg = colors.warningBg;
              statusText = "Pendiente de pago";
            } else if (isEntregada || (itemsPendientes === 0 && totalItems > 0)) {
              statusColor = colors.success;
              statusBg = colors.successBg;
              statusText = "Entregada";
            }

            const valorRemesaUSD =
              items.reduce(
                (acc, curr) => acc + Number(curr?.cobrarUSD || 0),
                0,
              ) || Number(selectedVenta.precioOficial || 0);

            return (
              <View style={styles.dialogContent}>
                {/* Cabecera / Hero Card con resumen de la remesa */}
                <Surface
                  style={[
                    styles.drawerHeroCard,
                    { backgroundColor: colors.itemCard, borderColor: colors.border },
                  ]}
                  elevation={0}
                >
                  <View style={styles.drawerHeroHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.drawerIdLabel, { color: colors.muted }]}>
                        DESTINATARIO
                      </Text>
                      <Text
                        variant="titleMedium"
                        style={[styles.drawerHeroTitle, { color: colors.text }]}
                      >
                        {nombreRemesa}
                      </Text>
                    </View>
                    <Chip
                      compact
                      style={{ backgroundColor: statusBg }}
                      textStyle={{ color: statusColor, fontSize: 11, fontWeight: "700" }}
                    >
                      {statusText}
                    </Chip>
                  </View>

                  <Divider style={{ marginVertical: 10, backgroundColor: colors.border }} />

                  <View style={styles.drawerMetaGrid}>
                    <View style={styles.drawerMetaItem}>
                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                        📅 Creada:
                      </Text>
                      <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                        {formatFecha(selectedVenta.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.drawerMetaItem}>
                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                        💳 Método:
                      </Text>
                      <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                        {selectedVenta.metodoPago || "No especificado"}
                      </Text>
                    </View>
                    <View style={styles.drawerMetaItem}>
                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                        💰 Cobrado:
                      </Text>
                      <Text style={[styles.drawerMetaValBold, { color: colors.primary }]}>
                        {formatMoney(selectedVenta.cobrado)} {selectedVenta.monedaCobrado || "USD"}
                      </Text>
                    </View>
                    <View style={styles.drawerMetaItem}>
                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                        💵 Valor remesa:
                      </Text>
                      <Text style={[styles.drawerMetaValBold, { color: colors.primary }]}>
                        {formatMoney(valorRemesaUSD)} USD
                      </Text>
                    </View>
                    <View style={styles.drawerMetaItemFull}>
                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                        🆔 ID de pedido:
                      </Text>
                      <Pressable
                        onPress={() =>
                          copiarAlPortapapeles(
                            selectedVenta?.producto?.idOrder || selectedVenta._id,
                            "ID de pedido",
                          )
                        }
                        style={styles.drawerIdPressable}
                      >
                        <Text
                          style={[styles.drawerIdValue, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {selectedVenta?.producto?.idOrder || selectedVenta._id}
                        </Text>
                        <IconButton
                          icon="content-copy"
                          size={14}
                          iconColor={colors.primary}
                          style={styles.zeroMargin}
                        />
                      </Pressable>
                    </View>
                  </View>
                </Surface>

                {isCancelada ? (
                  <Surface
                    style={[
                      styles.alertBanner,
                      {
                        backgroundColor: colors.bannerCancelada,
                        borderColor: colors.bannerCanceladaBorder,
                      },
                    ]}
                    elevation={0}
                  >
                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor={colors.danger}
                      style={styles.zeroMargin}
                    />
                    <Text style={[styles.alertBannerText, { color: colors.bannerCanceladaText }]}>
                      Esta remesa ha sido cancelada y no se procesará.
                    </Text>
                  </Surface>
                ) : null}

                {necesitaEvidencia && !isCancelada ? (
                  <Surface
                    style={[
                      styles.evidenciaCard,
                      {
                        backgroundColor: colors.bannerEvidencia,
                        borderColor: colors.bannerEvidenciaBorder,
                      },
                    ]}
                    elevation={0}
                  >
                    <View style={styles.evidenciaHeader}>
                      <IconButton
                        icon="file-upload-outline"
                        size={22}
                        iconColor={colors.warning}
                        style={styles.zeroMargin}
                      />
                      <Text style={[styles.evidenciaTitle, { color: colors.bannerEvidenciaText }]}>
                        Subir Evidencia de Pago
                      </Text>
                    </View>
                    <Text style={[styles.evidenciaSubtitle, { color: colors.muted }]}>
                      Adjunta el comprobante del depósito en efectivo para validar la transacción y liberar la entrega.
                    </Text>
                    <Divider style={{ marginVertical: 10, backgroundColor: colors.bannerEvidenciaBorder }} />
                    <SubidaArchivos venta={selectedVenta} />
                  </Surface>
                ) : null}

                {isPendientePago && !esEfectivo && !isCancelada ? (
                  <Surface
                    style={[
                      styles.alertBanner,
                      {
                        backgroundColor: colors.bannerEvidencia,
                        borderColor: colors.bannerEvidenciaBorder,
                      },
                    ]}
                    elevation={0}
                  >
                    <IconButton
                      icon="clock-alert-outline"
                      size={20}
                      iconColor={colors.warning}
                      style={styles.zeroMargin}
                    />
                    <Text style={[styles.alertBannerText, { color: colors.bannerEvidenciaText }]}>
                      Esperando confirmación del pago por parte de administración.
                    </Text>
                  </Surface>
                ) : null}

                {selectedVenta.comentario ? (
                  <View style={[styles.comentarioBox, { backgroundColor: colors.chipBg }]}>
                    <Text style={[styles.comentarioText, { color: colors.muted }]}>
                      💬 Nota general: {selectedVenta.comentario}
                    </Text>
                  </View>
                ) : null}

                {/* Lista de destinatarios incluidos */}
                <View style={styles.itemsSection}>
                  <View style={styles.itemsHeader}>
                    <Text variant="titleSmall" style={[styles.itemsHeaderTitle, { color: colors.text }]}>
                      {`📦 Destinatarios incluidos (${totalItems})`}
                    </Text>
                    <View style={styles.itemsBadgeGroup}>
                      {itemsPendientes > 0 ? (
                        <Chip
                          icon="clock-outline"
                          compact
                          style={{ backgroundColor: colors.warningBg }}
                          textStyle={{ color: colors.warning, fontSize: 11, fontWeight: "700" }}
                        >
                          {itemsPendientes} pendientes
                        </Chip>
                      ) : null}
                      {itemsEntregados > 0 ? (
                        <Chip
                          icon="check-circle"
                          compact
                          style={{ backgroundColor: colors.successBg }}
                          textStyle={{ color: colors.success, fontSize: 11, fontWeight: "700" }}
                        >
                          {itemsEntregados} entregadas
                        </Chip>
                      ) : null}
                    </View>
                  </View>

                  {items.length === 0 ? (
                    <Surface
                      style={[
                        styles.emptyState,
                        { backgroundColor: colors.itemCard, borderColor: colors.border },
                      ]}
                      elevation={0}
                    >
                      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13 }}>
                        No se encontraron detalles desglosados para este pedido.
                      </Text>
                    </Surface>
                  ) : (
                    items.map((item, itemIndex) => {
                      const isDelivered = Boolean(item.entregado);
                      return (
                        <Surface
                          key={item._id || itemIndex}
                          style={[
                            styles.itemCard,
                            {
                              backgroundColor: colors.itemCard,
                              borderColor: isDelivered ? colors.success : colors.border,
                            },
                          ]}
                          elevation={0}
                        >
                          <View style={styles.itemCardHeader}>
                            <View style={styles.itemCardHeaderLeft}>
                              <IconButton
                                icon={isDelivered ? "check-circle" : "clock-outline"}
                                size={18}
                                iconColor={isDelivered ? colors.success : colors.warning}
                                style={styles.zeroMargin}
                              />
                              <Text variant="labelLarge" style={[styles.itemIndexTitle, { color: colors.text }]}>
                                Destinatario #{itemIndex + 1}
                              </Text>
                            </View>
                            <Chip
                              compact
                              style={{
                                backgroundColor: isDelivered ? colors.successBg : colors.warningBg,
                              }}
                              textStyle={{
                                color: isDelivered ? colors.success : colors.warning,
                                fontSize: 10,
                                fontWeight: "700",
                              }}
                            >
                              {isDelivered ? "Entregada" : "Pendiente"}
                            </Chip>
                          </View>

                          <View style={styles.itemDetailRow}>
                            <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>
                              Beneficiario:
                            </Text>
                            <Text style={[styles.itemDetailValue, { color: colors.text }]}>
                              {item.nombre || "Sin especificar"}
                            </Text>
                          </View>

                          <View style={styles.itemDetailRow}>
                            <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>
                              Monto a recibir:
                            </Text>
                            <Text style={[styles.itemDetailValueBold, { color: colors.primary }]}>
                              {formatMoney(item.recibirEnCuba)}{" "}
                              {item.monedaRecibirEnCuba || "CUP"}
                            </Text>
                          </View>

                          <View style={styles.itemDetailRow}>
                            <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>Importe cobrado:</Text>
                            <Text style={[styles.itemDetailValue, { color: colors.text }]}> 
                              {formatMoney(item.cobrarUSD)} {item.monedaACobrar || "USD"}
                            </Text>
                          </View>

                          {Number(item.precioDolar || 0) > 0 ? (
                            <View style={styles.itemDetailRow}>
                              <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>Tasa aplicada:</Text>
                              <Text style={[styles.itemDetailValue, { color: colors.text }]}> 
                                {formatMoney(item.precioDolar)} {item.monedaRecibirEnCuba || "CUP"}/USD
                              </Text>
                            </View>
                          ) : null}

                          {Number(item.descuentoAdmin || 0) > 0 ? (
                            <View style={styles.itemDetailRow}>
                              <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>Descuento:</Text>
                              <Text style={[styles.itemDetailValue, { color: colors.success }]}> 
                                -{formatMoney(item.descuentoAdmin)} {item.monedaRecibirEnCuba || "CUP"}
                              </Text>
                            </View>
                          ) : null}

                          <View style={styles.itemDetailRow}>
                            <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>Método de entrega:</Text>
                            <Text style={[styles.itemDetailValue, { color: colors.text }]}> 
                              {item.metodoPago || selectedVenta.metodoPago || "No especificado"}
                            </Text>
                          </View>

                          {isDelivered ? (
                            <View style={styles.itemDetailRow}>
                              <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>Entregada:</Text>
                              <Text style={[styles.itemDetailValue, { color: colors.success }]}> 
                                {formatFecha(item.fechaEntregado || item.updatedAt)}
                              </Text>
                            </View>
                          ) : null}

                          {item.tarjetaCUP ? (
                            <View style={styles.itemDetailRow}>
                              <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>
                                Tarjeta CUP:
                              </Text>
                              <View style={styles.copyableRow}>
                                <Text
                                  style={[styles.itemDetailValueMono, { color: colors.text }]}
                                  numberOfLines={1}
                                >
                                  {item.tarjetaCUP}
                                </Text>
                                <IconButton
                                  icon="content-copy"
                                  size={16}
                                  onPress={() =>
                                    copiarAlPortapapeles(item.tarjetaCUP, "Tarjeta CUP")
                                  }
                                  style={styles.zeroMargin}
                                  iconColor={colors.primary}
                                />
                              </View>
                            </View>
                          ) : null}

                          {item.direccionCuba ? (
                            <View style={styles.itemDetailRow}>
                              <Text style={[styles.itemDetailLabel, { color: colors.muted }]}>
                                Dirección:
                              </Text>
                              <View style={styles.copyableRow}>
                                <Text
                                  style={[styles.itemDetailValue, { color: colors.text, flex: 1 }]}
                                  numberOfLines={2}
                                >
                                  {item.direccionCuba}
                                </Text>
                                <IconButton
                                  icon="content-copy"
                                  size={16}
                                  onPress={() =>
                                    copiarAlPortapapeles(item.direccionCuba, "Dirección")
                                  }
                                  style={styles.zeroMargin}
                                  iconColor={colors.primary}
                                />
                              </View>
                            </View>
                          ) : null}

                          {item.comentario ? (
                            <View style={[styles.itemCommentBox, { backgroundColor: colors.chipBg }]}>
                              <Text style={[styles.itemCommentText, { color: colors.muted }]}>
                                💬 {item.comentario}
                              </Text>
                            </View>
                          ) : null}

                          {Meteor.user()?.profile?.role === "admin" ? (
                            <View style={styles.adminActionRow}>
                              {isDelivered ? (
                                <Button
                                  mode="outlined"
                                  icon="undo-variant"
                                  onPress={() => marcarItemNoEntregado(selectedVenta._id, itemIndex)}
                                  textColor={colors.danger}
                                  style={[styles.adminBtn, { borderColor: colors.danger }]}
                                  compact
                                >
                                  Revertir Entrega
                                </Button>
                              ) : (
                                <Button
                                  mode="contained"
                                  icon="check-bold"
                                  onPress={() => marcarItemEntregado(selectedVenta._id, itemIndex)}
                                  buttonColor={colors.success}
                                  textColor="#ffffff"
                                  style={styles.adminBtn}
                                  compact
                                >
                                  Marcar Entregado
                                </Button>
                              )}
                            </View>
                          ) : null}
                        </Surface>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })() : null}
        </ScrollView>
      </DrawerBottom>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ borderRadius: 16, backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.text, fontSize: 16 }}>
            Confirmar Acción
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              ¿Está seguro de marcar este item como{" "}
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {selectedAction?.action === "entregar" ? "ENTREGADO" : "NO ENTREGADO"}
              </Text>
              ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor={colors.muted}>
              Cancelar
            </Button>
            <Button
              onPress={confirmarAccion}
              mode="contained"
              buttonColor={colors.primary}
            >
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  adminActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  adminBtn: {
    borderRadius: 8,
  },
  alertBanner: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  alertBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  cardBody: {
    padding: 14,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeaderTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardId: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  detailsButton: {
    borderRadius: 10,
    marginTop: 12,
  },
  detailsButtonContent: {
    minHeight: 42,
  },
  detailsButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  dialogContent: {
    paddingBottom: 16,
  },
  drawerCommentBox: {
    borderRadius: 8,
    marginTop: 8,
    padding: 10,
  },
  drawerCommentText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  drawerHeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  drawerHeroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  drawerHeroTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  drawerIdLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  drawerIdPressable: {
    alignItems: "center",
    flexDirection: "row",
  },
  drawerIdValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  drawerMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  drawerMetaItem: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  drawerMetaItemFull: {
    flexBasis: "100%",
    marginTop: 4,
  },
  drawerMetaKey: {
    fontSize: 11,
    marginBottom: 2,
  },
  drawerMetaVal: {
    fontSize: 12,
    fontWeight: "600",
  },
  drawerMetaValBold: {
    fontSize: 13,
    fontWeight: "700",
  },
  drawerScroll: {
    paddingHorizontal: 16,
  },
  drawerScrollContent: {
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    marginHorizontal: 16,
    padding: 24,
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  evidenciaCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  evidenciaHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  evidenciaSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  evidenciaTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  expandedSection: {
    marginTop: 12,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  itemCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemCardHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  itemCommentBox: {
    borderRadius: 6,
    marginTop: 6,
    padding: 8,
  },
  itemCommentText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  itemDetailLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  itemDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemDetailValue: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  itemDetailValueBold: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  itemDetailValueMono: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  itemIndexTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemsBadgeGroup: {
    flexDirection: "row",
    gap: 6,
  },
  itemsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemsHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemsSection: {
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    margin: 16,
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
  },
  metaChip: {
    borderRadius: 8,
  },
  root: {
    paddingBottom: 24,
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
  snackbar: {
    borderRadius: 10,
  },
  statusHeaderBadge: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    maxWidth: 142,
    minWidth: 82,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
  },
  stepCircle: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28,
    zIndex: 2,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 2,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "600",
  },
  stepperContainer: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 8,
    position: "relative",
  },
  stepperTrackBackground: {
    backgroundColor: "rgba(148, 163, 184, 0.25)",
    height: 2.5,
    left: "12%",
    position: "absolute",
    right: "12%",
    top: 21,
    zIndex: 1,
  },
  stepperTrackProgress: {
    height: 2.5,
    left: "12%",
    position: "absolute",
    top: 21,
    zIndex: 1,
  },
  zeroMargin: {
    margin: 0,
  },
});

export default VentasStepper;
