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
  useTheme,
} from "react-native-paper";

import { requestEvidenceImageUrl } from "../../services/meteor/evidenceImages";
import SubidaArchivos from "../archivos/SubidaArchivos.native";
import DrawerBottom from "../drawer/DrawerBottom.native";
import ZoomableEvidenceImage from "../shared/ZoomableEvidenceImage.native";
import ServiceDetails from "./ServiceDetails.native";
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

export default function VentaDetailModal({
  visible,
  onDismiss,
  sale,
  evidence,
  isGeneralAdmin,
  isAdmin,
  onActionComplete,
}) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const detailScrollAtTopRef = useRef(true);

  const [evidenceImageUrl, setEvidenceImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [snackbarText, setSnackbarText] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const categoryMeta = useMemo(
    () => CATEGORY_COLORS[sale?.category] || CATEGORY_COLORS.OTROS,
    [sale?.category],
  );
  const statusMeta = useMemo(
    () => getStatusMeta(sale?.statusDerived, theme.dark),
    [sale?.statusDerived, theme.dark],
  );
  const evidenceMeta = useMemo(
    () => getEvidenceMeta(evidence, sale, theme.dark),
    [evidence, sale, theme.dark],
  );

  // Fetch evidence image URL if evidence exists
  useEffect(() => {
    let cancelled = false;

    if (!evidence?._id) {
      setEvidenceImageUrl(null);
      setLoadingImage(false);
      return;
    }

    // If inline base64 exists
    const inlineB64 =
      evidence.dataBase64 ||
      evidence.base64 ||
      evidence.dataB64 ||
      evidence.data;
    if (inlineB64 && typeof inlineB64 === "string") {
      const uri = inlineB64.startsWith("data:")
        ? inlineB64
        : `data:image/jpeg;base64,${inlineB64}`;
      setEvidenceImageUrl(uri);
      setLoadingImage(false);
      return;
    }

    setLoadingImage(true);
    requestEvidenceImageUrl(evidence._id)
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
  }, [evidence]);

  const handleCopyId = async () => {
    if (!sale?._id) return;
    await Clipboard.setStringAsync(sale._id);
    setSnackbarText("ID copiado al portapapeles");
    setSnackbarVisible(true);
  };

  const handleAprobarVenta = () => {
    if (!sale?._id) return;

    Alert.alert(
      "Aprobar compra / venta",
      "Se aprobará el pago y se procederá con la entrega de los servicios. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          style: "default",
          onPress: () => {
            setActionProcessing(true);

            if (sale.source === "direct") {
              Meteor.call("changeStatusVenta", sale._id, (error, result) => {
                setActionProcessing(false);
                if (error) {
                  Alert.alert("Error", error.message || "No se pudo actualizar la venta.");
                  return;
                }
                setSnackbarText(String(result || "Venta marcada como pagada"));
                setSnackbarVisible(true);
                onActionComplete?.();
              });
              return;
            }

            // For ventasRecharge
            Meteor.call("ventas.aprobarVenta", sale._id, {}, (error, result) => {
              setActionProcessing(false);
              if (error) {
                // Fallback to changeStatusVenta if ventas.aprobarVenta not matched
                Meteor.call("changeStatusVenta", sale._id, (err2, res2) => {
                  if (err2) {
                    Alert.alert("Error", error.reason || error.message || "No se pudo aprobar la venta.");
                    return;
                  }
                  setSnackbarText("Venta aprobada correctamente.");
                  setSnackbarVisible(true);
                  onActionComplete?.();
                });
                return;
              }
              setSnackbarText(result?.message || "Venta aprobada correctamente.");
              setSnackbarVisible(true);
              onActionComplete?.();
            });
          },
        },
      ],
    );
  };

  const handleAprobarSoloEvidencia = () => {
    if (!evidence?._id) return;

    Alert.alert(
      "Aprobar comprobante",
      "¿Deseas marcar el comprobante de pago como aprobado?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar comprobante",
          onPress: () => {
            setActionProcessing(true);
            Meteor.call("archivos.aprobarEvidencia", evidence._id, {}, (error, result) => {
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
    if (!evidence?._id) return;

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
    Meteor.call("archivos.denegarEvidencia", evidence._id, razon, {}, (error, result) => {
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

  if (!visible || !sale) return null;

  const maxScrollHeight = Math.max(260, Math.floor(windowHeight * 0.72));
  const isEfectivo = String(sale.metodoPago || "").toUpperCase() === "EFECTIVO";
  const canApprove = (isGeneralAdmin || isAdmin) && sale.statusDerived !== "ENTREGADO" && sale.statusDerived !== "CANCELADO";

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

              {evidence ? (
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
                    {evidence.createdAt ? (
                      <View style={styles.evidenceMetaItem}>
                        <Text style={styles.evidenceMetaKey}>Fecha de subida</Text>
                        <Text style={styles.evidenceMetaVal}>{formatDateTime(evidence.createdAt)}</Text>
                      </View>
                    ) : null}

                    {evidence.size ? (
                      <View style={styles.evidenceMetaItem}>
                        <Text style={styles.evidenceMetaKey}>Tamaño</Text>
                        <Text style={styles.evidenceMetaVal}>
                          {(Number(evidence.size) / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                    ) : null}

                    {evidence.descripcion ? (
                      <View style={[styles.evidenceMetaItem, { width: "100%" }]}>
                        <Text style={styles.evidenceMetaKey}>Nota del cliente</Text>
                        <Text style={styles.evidenceMetaVal}>{evidence.descripcion}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* AI Fraud Analysis */}
                  {evidence.analisisIA ? (
                    <View style={styles.aiAnalysisBox}>
                      <View style={styles.aiAnalysisHeader}>
                        <IconButton icon="shield-search" size={18} iconColor="#38bdf8" style={styles.zeroMargin} />
                        <Text style={styles.aiAnalysisTitle}>Auditoría de Comprobante (IA)</Text>
                      </View>
                      {evidence.analisisIA.summary ? (
                        <Text style={styles.aiAnalysisSummary}>{evidence.analisisIA.summary}</Text>
                      ) : null}
                      {evidence.analisisIA.paymentAmount ? (
                        <Text style={styles.aiAnalysisMetric}>
                          Monto detectado: {evidence.analisisIA.paymentAmount} {evidence.analisisIA.paymentCurrency || "CUP"}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Admin buttons for evidence */}
                  {(isGeneralAdmin || isAdmin) && !evidence.aprobado && !evidence.denegado ? (
                    <View style={styles.evidenceActionButtons}>
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

            {/* General Actions */}
            {canApprove ? (
              <View style={styles.mainActionsRow}>
                <Button
                  icon="check-decagram"
                  mode="contained"
                  loading={actionProcessing}
                  disabled={actionProcessing}
                  onPress={handleAprobarVenta}
                  style={styles.mainApproveButton}
                  contentStyle={styles.mainApproveContent}
                >
                  Aprobar Venta y Procesar
                </Button>
              </View>
            ) : null}
      </ScrollView>

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
  mainApproveContent: {
    height: 48,
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
  zeroMargin: {
    margin: 0,
    padding: 0,
  },
});
