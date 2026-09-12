import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { requestEvidenceImageUrl } from "../../services/meteor/evidenceImages";
import SubidaArchivos from "../archivos/SubidaArchivos.native";
import { VentasCollection } from "../collections/collections";
import DrawerBottom from "../drawer/DrawerBottom.native";
import ZoomableEvidenceImage from "../shared/ZoomableEvidenceImage.native";
import ServiceDetails from "./ServiceDetails.native";
import RefundSaleDrawer from "./RefundSaleDrawer.native";
import {
  CATEGORY_COLORS,
  formatDateTime,
  formatMoney,
  getEvidenceMeta,
  getStatusMeta,
} from "./ventasUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const isSaleDelivered = (sale) => {
  const rawStatus = String(sale?.estado || sale?.status || "").toUpperCase();
  if (["COMPLETED", "COMPLETADA", "ENTREGADA", "ENTREGADO", "PAGADA", "PAID"].includes(rawStatus)) {
    return true;
  }

  const items = Array.isArray(sale?.items) ? sale.items : [];
  if (items.length === 0) return false;

  const dtshopItems = items.filter((item) => String(item?.type || "").toUpperCase() === "RECARGA");
  return items.every((item) => item?.entregado === true)
    || (dtshopItems.length > 0 && dtshopItems.every((item) => String(item?.dtshopStatus || "").toUpperCase() === "COMPLETED"));
};

const RemesaProgress = ({ sale, theme }) => {
  const items = (sale?.items || []).filter((item) => item?.type === "REMESA");
  if (!items.length) return null;

  const isCash = String(sale?.metodoPago || "").toUpperCase() === "EFECTIVO";
  const cancelled = sale?.isCancelada === true;
  const delivered = !cancelled && items.every((item) => item?.entregado === true || item?.status === "COMPLETED");
  const paid = sale?.isCobrado === true;
  const steps = isCash
    ? ["Evidencia de pago", "Pago confirmado", "Pendiente de entrega", "Entregado"]
    : ["Pago confirmado", "Pendiente de entrega", "Entregado"];
  const activeIndex = cancelled ? 0 : delivered ? steps.length : paid ? (isCash ? 2 : 1) : 0;

  return (
    <View style={styles.remesaProgressBox}>
      <Text style={styles.sectionTitle}>Seguimiento de remesa</Text>
      {steps.map((label, index) => {
        const completed = delivered || index < activeIndex;
        const active = !completed && index === activeIndex;
        return (
          <View key={label} style={styles.remesaStepRow}>
            <View style={[styles.remesaStepDot, { backgroundColor: completed ? "#22c55e" : active ? "#38bdf8" : "#64748b" }]}>
              <Text style={styles.remesaStepDotText}>{completed ? "✓" : String(index + 1)}</Text>
            </View>
            <Text style={[styles.remesaStepLabel, { color: completed ? "#86efac" : active ? "#bae6fd" : theme.dark ? "#94a3b8" : "#64748b" }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default function VentaDetailModal({
  visible,
  onDismiss,
  sale,
  evidence,
  evidences = [],
  isGeneralAdmin,
  isAdmin,
  onActionComplete,
}) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const detailScrollAtTopRef = useRef(true);

  const evidenceItems = useMemo(
    () => (evidences.length > 0 ? evidences : evidence ? [evidence] : []),
    [evidence, evidences],
  );
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(evidenceItems[0]?._id || null);
  const [evidenceImageUrl, setEvidenceImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [snackbarText, setSnackbarText] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [refundDrawerVisible, setRefundDrawerVisible] = useState(false);
  const [adminNote, setAdminNote] = useState(sale?.adminNote || "");

  const categoryMeta = useMemo(
    () => CATEGORY_COLORS[sale?.category] || CATEGORY_COLORS.OTROS,
    [sale?.category],
  );
  const statusMeta = useMemo(
    () => getStatusMeta(sale?.statusDerived, theme.dark),
    [sale?.statusDerived, theme.dark],
  );
  const activeEvidence = useMemo(
    () => evidenceItems.find((item) => item?._id === selectedEvidenceId) || evidenceItems[0] || null,
    [evidenceItems, selectedEvidenceId],
  );

  const evidenceMeta = useMemo(
    () => getEvidenceMeta(activeEvidence, sale, theme.dark),
    [activeEvidence, sale, theme.dark],
  );

  useEffect(() => {
    setSelectedEvidenceId(evidenceItems[0]?._id || null);
    setAdminNote(sale?.adminNote || "");
  }, [evidenceItems, sale?.adminNote]);

  // Fetch evidence image URL if evidence exists
  useEffect(() => {
    let cancelled = false;

    if (!activeEvidence?._id) {
      setEvidenceImageUrl(null);
      setLoadingImage(false);
      return;
    }

    // If inline base64 exists
    const inlineB64 =
      activeEvidence.dataBase64 ||
      activeEvidence.base64 ||
      activeEvidence.dataB64 ||
      activeEvidence.data;
    if (inlineB64 && typeof inlineB64 === "string") {
      const uri = inlineB64.startsWith("data:")
        ? inlineB64
        : `data:image/jpeg;base64,${inlineB64}`;
      setEvidenceImageUrl(uri);
      setLoadingImage(false);
      return;
    }

    setLoadingImage(true);
    requestEvidenceImageUrl(activeEvidence._id)
      .then((url) => {
        if (!cancelled) {
          setEvidenceImageUrl(url || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvidenceImageUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingImage(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeEvidence]);

  const handleCopyId = async () => {
    if (!sale?._id) return;
    await Clipboard.setStringAsync(sale._id);
    setSnackbarText("ID copiado al portapapeles");
    setSnackbarVisible(true);
  };

  const handleAprobarSoloEvidencia = () => {
    if (!activeEvidence?._id || sale?.isCobrado === true || sale?.isCancelada === true) return;

    Alert.alert(
      "Aprobar comprobante",
      "¿Deseas marcar el comprobante de pago como aprobado?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar comprobante",
          onPress: () => {
            setActionProcessing(true);
            Meteor.call("archivos.aprobarEvidencia", activeEvidence._id, { force: true }, (error, result) => {
              setActionProcessing(false);
              if (error) {
                Alert.alert("Error", error.reason || error.message || "No se pudo aprobar la evidencia.");
                return;
              }
              setSnackbarText(result?.message || "Evidencia aprobada correctamente.");
              setSnackbarVisible(true);
              onActionComplete?.();
            });
          },
        },
      ],
    );
  };

  const handleRechazarEvidencia = () => {
    if (!activeEvidence?._id || sale?.isCobrado === true || sale?.isCancelada === true) return;

    Alert.alert(
      "Rechazar comprobante",
      "Selecciona el motivo del rechazo:",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Monto no coincide",
          style: "destructive",
          onPress: () => ejecutarRechazo("El monto transferido no coincide con la venta"),
        },
        {
          text: "Comprobante ilegible / falso",
          style: "destructive",
          onPress: () => ejecutarRechazo("Comprobante ilegible, incompleto o no válido"),
        },
        {
          text: "Otro motivo",
          style: "destructive",
          onPress: () => ejecutarRechazo("La evidencia no pudo ser validada"),
        },
      ],
    );
  };

  const ejecutarRechazo = (razon) => {
    setActionProcessing(true);
    Meteor.call("archivos.denegarEvidencia", activeEvidence._id, { force: true, motivo: razon }, (error, result) => {
      setActionProcessing(false);
      if (error) {
        Alert.alert("Error", error.reason || error.message || "No se pudo rechazar la evidencia.");
        return;
      }
      setSnackbarText(result?.message || "Evidencia rechazada.");
      setSnackbarVisible(true);
      onActionComplete?.();
    });
  };

  const handleReevaluarConIA = () => {
    if (!activeEvidence?._id || actionProcessing || sale?.isCobrado === true || sale?.isCancelada === true) return;
    setActionProcessing(true);
    Meteor.call("evidencias.analizarConIA", activeEvidence._id, { force: true }, (error, result) => {
      setActionProcessing(false);
      if (error) {
        Alert.alert("Error", error.reason || error.message || "No se pudo reevaluar la evidencia.");
        return;
      }
      setSnackbarText(result?.cached ? "El análisis ya estaba actualizado." : "La evidencia fue enviada nuevamente a la IA.");
      setSnackbarVisible(true);
      onActionComplete?.();
    });
  };

  const handleSaveAdminNote = () => {
    if (!sale?._id || !isAdmin || actionProcessing) return;
    setActionProcessing(true);
    Meteor.call("ventas.guardarNotaAdmin", sale._id, adminNote, (error, result) => {
      setActionProcessing(false);
      if (error) {
        Alert.alert("Error", error.reason || error.message || "No se pudo guardar la nota.");
        return;
      }
      setSnackbarText(adminNote.trim() ? "Nota administrativa guardada." : "Nota administrativa eliminada.");
      setSnackbarVisible(true);
      onActionComplete?.();
    });
  };

  const canManageDirectProxyVpnSale =
    (isGeneralAdmin === true || isAdmin === true)
    && sale?.source === "direct"
    && sale?.category === "PROXY_VPN"
    && sale?._id;

  const handleToggleDirectSaleCollected = () => {
    if (!canManageDirectProxyVpnSale || actionProcessing) return;

    const managesPrincipalCollection = isGeneralAdmin === true;
    const currentCollected = managesPrincipalCollection
      ? sale.cobrado === true
      : sale.cobradoAlAdmin === true;
    const nextCollected = !currentCollected;
    const nextLabel = nextCollected ? "cobrada" : "no cobrada";
    const collectionLabel = managesPrincipalCollection
      ? "por el administrador principal"
      : "por el administrador responsable";

    Alert.alert(
      nextCollected ? "Marcar como cobrada" : "Marcar como no cobrada",
      `¿Deseas marcar esta venta Proxy/VPN como ${nextLabel} ${collectionLabel}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            setActionProcessing(true);
            Meteor.call("changeStatusVenta", sale._id, nextCollected, (error) => {
              if (error) {
                setActionProcessing(false);
                Alert.alert("Error", error.reason || error.message || "No se pudo actualizar el estado de cobro.");
                return;
              }

              // Keep the current list responsive while the publication catches up.
              VentasCollection.update(sale._id, {
                $set: managesPrincipalCollection
                  ? { cobrado: nextCollected, cobradoAlAdmin: nextCollected }
                  : { cobradoAlAdmin: nextCollected },
              });
              setActionProcessing(false);
              setSnackbarText(
                nextCollected
                  ? managesPrincipalCollection
                    ? "Venta cobrada por el administrador principal."
                    : "Cobro confirmado al administrador principal."
                  : managesPrincipalCollection
                    ? "Cobro de la venta desmarcado."
                    : "Confirmación de cobro desmarcada.",
              );
              setSnackbarVisible(true);
              onActionComplete?.();
            });
          },
        },
      ],
    );
  };

  if (!visible || !sale) return null;

  const maxScrollHeight = Math.max(260, Math.floor(windowHeight * 0.72));
  const isEfectivo = String(sale.metodoPago || "").toUpperCase() === "EFECTIVO";
  const canRefund = isGeneralAdmin
    && sale.source === "recharge"
    && !isSaleDelivered(sale)
    && ["PAYPAL", "MERCADOPAGO"].includes(String(sale.metodoPago || "").toUpperCase())
    && !sale.refundStatus
    && Number(sale.refundedAmount || 0) <= 0
    && !(Array.isArray(sale.refunds) && sale.refunds.some((refund) => ["COMPLETED", "APPROVED", "PROCESSED"].includes(String(refund?.status || "").toUpperCase())));

  return (
    <DrawerBottom
      open={visible}
      onClose={onDismiss}
      overlayOpacity={0.34}
      title={`Detalle de ${categoryMeta.label}`}
      contentAtTopRef={detailScrollAtTopRef}
    >
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          detailScrollAtTopRef.current = event.nativeEvent.contentOffset.y <= 0.5;
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: maxScrollHeight }}
        overScrollMode="never"
      >
        <View style={styles.sheetMetaHeader}>
          <View style={styles.badgeRow}>
                <Chip
                  compact
                  icon={categoryMeta.icon}
                  style={[styles.categoryChip, { backgroundColor: categoryMeta.bg }]}
                  textStyle={[styles.categoryChipText, { color: categoryMeta.color }]}
                >
                  {categoryMeta.label}
                </Chip>
                <Chip
                  compact
                  style={[styles.statusChip, { backgroundColor: statusMeta.backgroundColor, borderColor: statusMeta.borderColor }]}
                  textStyle={[styles.statusChipText, { color: statusMeta.textColor }]}
                >
                  {statusMeta.label}
                </Chip>
          </View>
          <Pressable onPress={handleCopyId} style={styles.idPressable}>
            <Text numberOfLines={1} style={styles.saleIdText}>
              ID: {sale._id}
            </Text>
            <IconButton icon="content-copy" size={16} style={styles.copyIcon} />
          </Pressable>
          <Text style={styles.dateText}>{formatDateTime(sale.createdAt)}</Text>
        </View>

        {/* Amount & Payment banner */}
            <Surface style={[styles.amountBanner, { backgroundColor: theme.dark ? "#0f1c35" : "#f1f5f9" }]}>
              <View style={styles.amountBlock}>
                <Text style={styles.amountLabel}>Total de la venta</Text>
                <Text style={[styles.amountValue, { color: theme.dark ? "#38bdf8" : "#0284c7" }]}>
                  {formatMoney(sale.precio, sale.moneda)}
                </Text>
              </View>

              <View style={styles.paymentInfoBlock}>
                <Text style={styles.paymentMethodLabel}>Método de pago</Text>
                <Chip compact icon="credit-card-outline" style={styles.paymentMethodChip}>
                  {sale.metodoPago || "No especificado"}
                </Chip>
              </View>
            </Surface>

            {sale.refundStatus ? (
              <Surface style={[styles.refundSummary, { backgroundColor: theme.dark ? "rgba(124, 45, 18, 0.28)" : "#fff7ed" }]}>
                <Text style={styles.refundSummaryTitle}>
                  {sale.refundStatus === "FULL" ? "Reembolso completado" : "Reembolso parcial"}
                </Text>
                <Text style={styles.refundSummaryText}>
                  Devuelto: {formatMoney(sale.refundedAmount, sale.refundCurrency || sale.moneda)} · Saldo: {formatMoney(sale.refundableAmount, sale.refundCurrency || sale.moneda)}
                </Text>
              </Surface>
            ) : null}

            {/* Participants block */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Participantes</Text>
              <View style={styles.participantsGrid}>
                <Surface style={[styles.participantCard, { backgroundColor: theme.dark ? "#13213d" : "#f8fafc" }]}>
                  <Text style={styles.participantRole}>Comprador / Usuario</Text>
                  <Text style={styles.participantName}>{sale.userusername || "Desconocido"}</Text>
                  {sale.userId ? <Text style={styles.participantId}>ID: {sale.userId}</Text> : null}
                </Surface>

                <Surface style={[styles.participantCard, { backgroundColor: theme.dark ? "#13213d" : "#f8fafc" }]}>
                  <Text style={styles.participantRole}>Admin responsable</Text>
                  <Text style={styles.participantName}>{sale.adminusername || "Vidkar"}</Text>
                  {sale.gananciasAdmin !== undefined && sale.gananciasAdmin !== null && (isGeneralAdmin || isAdmin) ? (
                    <Text style={styles.participantProfit}>
                      Ganancia: {formatMoney(sale.gananciasAdmin, "CUP")}
                    </Text>
                  ) : null}
                </Surface>
              </View>
            </View>

            {/* Product / Service details */}
            <ServiceDetails sale={sale} />

            {canManageDirectProxyVpnSale ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estado de cobro</Text>
                <View style={styles.directCollectionStatusRow}>
                  <Chip
                    compact
                    icon={sale.cobradoAlAdmin === true ? "check-circle" : "clock-outline"}
                    style={[
                      styles.directCollectionChip,
                      {
                        backgroundColor: sale.cobradoAlAdmin === true ? "#dcfce7" : "#fef3c7",
                      },
                    ]}
                    textStyle={{
                      color: sale.cobradoAlAdmin === true ? "#166534" : "#92400e",
                    }}
                  >
                    {sale.cobradoAlAdmin === true ? "Cobrado al admin" : "Pendiente al admin"}
                  </Chip>
                  <Chip
                    compact
                    icon={sale.cobrado === true ? "check-circle" : "clock-outline"}
                    style={[
                      styles.directCollectionChip,
                      {
                        backgroundColor: sale.cobrado === true ? "#dcfce7" : "#fef3c7",
                      },
                    ]}
                    textStyle={{
                      color: sale.cobrado === true ? "#166534" : "#92400e",
                    }}
                  >
                    {sale.cobrado === true ? "Cobrado principal" : "Pendiente principal"}
                  </Chip>
                </View>
                <Button
                  disabled={actionProcessing}
                  icon={
                    (isGeneralAdmin ? sale.cobrado : sale.cobradoAlAdmin) === true
                      ? "cash-minus"
                      : "cash-check"
                  }
                  loading={actionProcessing}
                  mode={
                    (isGeneralAdmin ? sale.cobrado : sale.cobradoAlAdmin) === true
                      ? "outlined"
                      : "contained"
                  }
                  onPress={handleToggleDirectSaleCollected}
                >
                  {(isGeneralAdmin ? sale.cobrado : sale.cobradoAlAdmin) === true
                    ? "Desmarcar mi cobro"
                    : isGeneralAdmin
                      ? "Marcar ambos cobros"
                      : "Confirmar cobro al admin"}
                </Button>
              </View>
            ) : null}

            <RemesaProgress sale={sale} theme={theme} />

            {sale.linkedProxyVpnDetails?.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detalle Proxy / VPN generado</Text>
                {sale.linkedProxyVpnDetails.map((linkedSale) => (
                  <Surface
                    key={linkedSale._id}
                    style={[styles.linkedSaleCard, { backgroundColor: theme.dark ? "#13213d" : "#f8fafc" }]}
                  >
                    <View style={styles.linkedSaleHeader}>
                      <View style={styles.heading}>
                        <Text style={styles.linkedSaleType}>{linkedSale.type}</Text>
                        {linkedSale.cantidad !== undefined ? (
                          <Text style={styles.linkedSaleMeta}>Cantidad: {linkedSale.cantidad}</Text>
                        ) : null}
                      </View>
                      <Chip compact icon={linkedSale.cobradoAlAdmin ? "check-circle-outline" : "clock-outline"}>
                        {linkedSale.cobradoAlAdmin ? "Registrado" : "Pendiente"}
                      </Chip>
                    </View>
                    {isAdmin ? (
                      <Text style={styles.linkedSaleMeta}>
                        Importe interno: {formatMoney(linkedSale.precio, "CUP")}
                      </Text>
                    ) : null}
                    {linkedSale.comentario ? (
                      <Text selectable style={styles.linkedSaleComment}>{linkedSale.comentario}</Text>
                    ) : null}
                    <Text selectable style={styles.linkedSaleId}>Asiento vinculado: {linkedSale._id}</Text>
                  </Surface>
                ))}
              </View>
            ) : null}

            {/* EVIDENCE SECTION */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, styles.evidenceSectionTitle]}>
                  Evidencia y Comprobante de Pago
                </Text>
                <Chip
                  compact
                  icon={evidenceMeta.icon}
                  style={[styles.evidenceStatusChip, { backgroundColor: evidenceMeta.backgroundColor, borderColor: evidenceMeta.borderColor }]}
                  textStyle={[styles.evidenceStatusChipText, { color: evidenceMeta.textColor }]}
                >
                  {evidenceMeta.label}
                </Chip>
              </View>

              {evidenceItems.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {evidenceItems.map((item, index) => (
                    <Chip
                      key={item._id}
                      onPress={() => setSelectedEvidenceId(item._id)}
                      selected={item._id === activeEvidence?._id}
                      style={styles.evidenceSelectorChip}
                    >
                      Evidencia {index + 1}
                    </Chip>
                  ))}
                </ScrollView>
              ) : null}

              {activeEvidence ? (
                <Surface style={[styles.evidenceCard, { backgroundColor: theme.dark ? "#13213d" : "#f8fafc" }]}>
                  {loadingImage ? (
                    <View style={styles.imageLoadingBox}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.imageLoadingText}>Cargando comprobante...</Text>
                    </View>
                  ) : evidenceImageUrl ? (
                    <View style={styles.evidenceImageContainer}>
                      <Pressable onPress={() => setFullScreenImage(true)} style={styles.imageWrapper}>
                        <Image
                          resizeMode="contain"
                          source={{ uri: evidenceImageUrl }}
                          style={styles.evidenceImage}
                        />
                        <View style={styles.zoomHintOverlay}>
                          <IconButton icon="magnify-plus-outline" size={18} iconColor="#ffffff" />
                          <Text style={styles.zoomHintText}>Toca para ampliar</Text>
                        </View>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.noImageBox}>
                      <IconButton icon="image-off-outline" size={36} iconColor="#94a3b8" />
                      <Text style={styles.noImageText}>Imagen no disponible en caché</Text>
                    </View>
                  )}

                  {/* Evidence meta details */}
                  <View style={styles.evidenceMetaGrid}>
                    {activeEvidence.createdAt ? (
                      <View style={styles.evidenceMetaItem}>
                        <Text style={styles.evidenceMetaKey}>Fecha de subida</Text>
                        <Text style={styles.evidenceMetaVal}>{formatDateTime(activeEvidence.createdAt)}</Text>
                      </View>
                    ) : null}

                    {activeEvidence.size ? (
                      <View style={styles.evidenceMetaItem}>
                        <Text style={styles.evidenceMetaKey}>Tamaño</Text>
                        <Text style={styles.evidenceMetaVal}>
                          {(Number(activeEvidence.size) / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                    ) : null}

                    {activeEvidence.descripcion ? (
                      <View style={[styles.evidenceMetaItem, { width: "100%" }]}>
                        <Text style={styles.evidenceMetaKey}>Nota del cliente</Text>
                        <Text style={styles.evidenceMetaVal}>{activeEvidence.descripcion}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* AI Fraud Analysis */}
                  {activeEvidence.analisisIA ? (
                    <View style={styles.aiAnalysisBox}>
                      <View style={styles.aiAnalysisHeader}>
                        <IconButton icon="shield-search" size={18} iconColor="#38bdf8" style={styles.zeroMargin} />
                        <Text style={styles.aiAnalysisTitle}>Auditoría de Comprobante (IA)</Text>
                      </View>
                      {activeEvidence.analisisIA.summary ? (
                        <Text style={styles.aiAnalysisSummary}>{activeEvidence.analisisIA.summary}</Text>
                      ) : null}
                      {activeEvidence.analisisIA.paymentAmount ? (
                        <Text style={styles.aiAnalysisMetric}>
                          Monto detectado: {activeEvidence.analisisIA.paymentAmount} {activeEvidence.analisisIA.paymentCurrency || "CUP"}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Admin buttons for evidence */}
                  {(isGeneralAdmin || isAdmin) ? (
                    <View style={styles.evidenceActionButtons}>
                      <Button
                        icon="shield-refresh"
                        mode="outlined"
                        loading={actionProcessing}
                        disabled={actionProcessing || sale.isCobrado === true || sale.isCancelada === true}
                        onPress={handleReevaluarConIA}
                        compact
                      >
                        Reevaluar IA
                      </Button>
                      {!activeEvidence.aprobado && !activeEvidence.denegado ? (
                        <>
                      <Button
                        icon="check-circle"
                        mode="contained"
                        loading={actionProcessing}
                        disabled={actionProcessing}
                        onPress={handleAprobarSoloEvidencia}
                        style={styles.approveEvidenceBtn}
                      >
                        Aprobar comprobante
                      </Button>
                      <Button
                        icon="close-circle"
                        mode="outlined"
                        loading={actionProcessing}
                        disabled={actionProcessing}
                        onPress={handleRechazarEvidencia}
                        textColor="#ef4444"
                        style={styles.rejectEvidenceBtn}
                      >
                        Rechazar
                      </Button>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </Surface>
              ) : isEfectivo && sale.statusDerived === "PENDIENTE_PAGO" ? (
                <View style={styles.uploadPromptBox}>
                  <Text style={styles.uploadPromptText}>
                    Esta venta en efectivo aún no cuenta con comprobante de pago verificado. Puedes adjuntar la evidencia a continuación:
                  </Text>
                  <SubidaArchivos venta={sale.rawDoc || sale} />
                </View>
              ) : (
                <Surface style={[styles.emptyEvidenceCard, { backgroundColor: theme.dark ? "#13213d" : "#f8fafc" }]}>
                  <IconButton icon="file-document-outline" size={32} iconColor="#94a3b8" />
                  <Text style={styles.emptyEvidenceTitle}>Sin comprobantes adjuntos</Text>
                  <Text style={styles.emptyEvidenceCopy}>
                    Esta transacción se procesó mediante {sale.metodoPago || "método directo"}.
                  </Text>
                </Surface>
              )}
            </View>

            {isAdmin ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nota administrativa</Text>
                <TextInput
                  label="Contexto interno de la compra"
                  mode="outlined"
                  multiline
                  onChangeText={setAdminNote}
                  value={adminNote}
                />
                <Button disabled={actionProcessing} mode="contained-tonal" onPress={handleSaveAdminNote}>
                  Guardar nota
                </Button>
              </View>
            ) : null}

            {/* La aprobación manual de ventas ya no se ofrece desde este detalle. */}
            {canRefund ? (
              <View style={styles.mainActionsRow}>
                <Button
                  buttonColor="#c2410c"
                  disabled={actionProcessing || Number(sale.refundableAmount ?? sale.precio ?? sale.cobrado ?? 0) <= 0}
                  icon="cash-refund"
                  mode="contained"
                  onPress={() => setRefundDrawerVisible(true)}
                  style={styles.mainApproveButton}
                >
                  Reembolsar dinero
                </Button>
              </View>
            ) : null}
      </ScrollView>

      <RefundSaleDrawer
        onDismiss={() => setRefundDrawerVisible(false)}
        onSuccess={() => {
          setRefundDrawerVisible(false);
          setSnackbarText("Reembolso procesado correctamente");
          setSnackbarVisible(true);
          onActionComplete?.();
        }}
        sale={sale}
        visible={refundDrawerVisible}
      />

        {/* Fullscreen Image Modal */}
        {fullScreenImage && evidenceImageUrl ? (
          <Modal
            animationType="fade"
            onRequestClose={() => setFullScreenImage(false)}
            transparent
            visible={fullScreenImage}
          >
            <View style={styles.fullScreenImageBackdrop}>
              <IconButton
                icon="close"
                iconColor="#ffffff"
                size={28}
                onPress={() => setFullScreenImage(false)}
                style={styles.fullScreenCloseBtn}
              />
              <ZoomableEvidenceImage
                source={{ uri: evidenceImageUrl }}
                style={styles.fullScreenImage}
              />
              <Button
                icon="close"
                mode="contained"
                onPress={() => setFullScreenImage(false)}
                style={styles.fullScreenCloseButton}
              >
                Cerrar evidencia
              </Button>
            </View>
          </Modal>
        ) : null}

        <Snackbar
          duration={3000}
          onDismiss={() => setSnackbarVisible(false)}
          visible={snackbarVisible}
        >
          {snackbarText}
        </Snackbar>
    </DrawerBottom>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderRadius: 8,
  },
  categoryChipText: {
    fontWeight: "700",
    fontSize: 12,
  },
  statusChip: {
    borderRadius: 8,
    borderWidth: 1,
  },
  statusChipText: {
    fontWeight: "700",
    fontSize: 12,
  },
  idPressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  saleIdText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.75,
  },
  copyIcon: {
    margin: 0,
    padding: 0,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.6,
  },
  scrollContent: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  sheetMetaHeader: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderRadius: 16,
    gap: 8,
    padding: 14,
  },
  amountBanner: {
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  amountBlock: {
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.65,
    textTransform: "uppercase",
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  paymentInfoBlock: {
    alignItems: "flex-end",
    gap: 4,
  },
  paymentMethodLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.65,
    textTransform: "uppercase",
  },
  paymentMethodChip: {
    borderRadius: 8,
  },
  refundSummary: {
    borderRadius: 14,
    gap: 4,
    padding: 14,
  },
  refundSummaryTitle: {
    color: "#fdba74",
    fontSize: 13,
    fontWeight: "800",
  },
  refundSummaryText: {
    fontSize: 12,
    opacity: 0.78,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.85,
  },
  directCollectionStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  directCollectionChip: {
    borderRadius: 999,
  },
  sectionHeaderRow: {
    alignItems: "center",
    gap: 10,
    flexDirection: "row",
  },
  evidenceSectionTitle: {
    flex: 1,
    flexShrink: 1,
  },
  participantsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  participantCard: {
    borderRadius: 14,
    flex: 1,
    padding: 12,
    gap: 4,
  },
  participantRole: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.6,
    textTransform: "uppercase",
  },
  participantName: {
    fontSize: 15,
    fontWeight: "700",
  },
  participantId: {
    fontSize: 11,
    opacity: 0.5,
  },
  participantProfit: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  linkedSaleCard: {
    borderRadius: 16,
    gap: 8,
    padding: 14,
  },
  linkedSaleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  linkedSaleType: {
    fontSize: 15,
    fontWeight: "800",
  },
  linkedSaleMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  linkedSaleComment: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.8,
  },
  linkedSaleId: {
    fontSize: 10,
    opacity: 0.55,
  },
  evidenceStatusChip: {
    flexShrink: 0,
    borderRadius: 8,
    borderWidth: 1,
  },
  evidenceStatusChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  evidenceCard: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 14,
    gap: 12,
  },
  imageLoadingBox: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    minHeight: 140,
  },
  imageLoadingText: {
    fontSize: 13,
    opacity: 0.7,
  },
  evidenceImageContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  imageWrapper: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    height: 220,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  evidenceImage: {
    height: "100%",
    width: "100%",
  },
  zoomHintOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    bottom: 8,
    flexDirection: "row",
    paddingRight: 10,
    position: "absolute",
    right: 8,
  },
  zoomHintText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  noImageBox: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  noImageText: {
    fontSize: 12,
    opacity: 0.6,
  },
  evidenceMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  evidenceMetaItem: {
    gap: 2,
  },
  evidenceMetaKey: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.55,
    textTransform: "uppercase",
  },
  evidenceMetaVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  aiAnalysisBox: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  aiAnalysisHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  aiAnalysisTitle: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  aiAnalysisSummary: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  aiAnalysisMetric: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },
  evidenceActionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  evidenceSelectorChip: {
    marginBottom: 4,
    marginRight: 8,
  },
  approveEvidenceBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    flex: 1,
  },
  rejectEvidenceBtn: {
    borderColor: "#ef4444",
    borderRadius: 10,
    flex: 1,
  },
  uploadPromptBox: {
    gap: 8,
  },
  uploadPromptText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.75,
  },
  emptyEvidenceCard: {
    alignItems: "center",
    borderRadius: 14,
    gap: 4,
    justifyContent: "center",
    padding: 24,
  },
  emptyEvidenceTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  emptyEvidenceCopy: {
    fontSize: 12,
    opacity: 0.55,
    textAlign: "center",
  },
  mainActionsRow: {
    marginTop: 8,
  },
  mainApproveButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
  },
  fullScreenImageBackdrop: {
    backgroundColor: "rgba(0,0,0,0.94)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenCloseBtn: {
    position: "absolute",
    right: 16,
    top: 40,
    zIndex: 10,
  },
  fullScreenCloseButton: {
    bottom: 28,
    position: "absolute",
  },
  fullScreenImage: {
    height: "90%",
    width: "95%",
  },
  remesaProgressBox: {
    borderRadius: 16,
    gap: 10,
    padding: 14,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  remesaStepDot: {
    alignItems: "center",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  remesaStepDotText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  remesaStepLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  remesaStepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  zeroMargin: {
    margin: 0,
    padding: 0,
  },
});
