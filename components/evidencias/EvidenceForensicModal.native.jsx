import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  RadioButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { buildAntifraudPalette } from "./antifraudTheme";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

export default function EvidenceForensicModal({
  visible = false,
  loading = false,
  detail = null,
  onClose,
  onSaveAudit,
  isTablet = false,
}) {
  const theme = useTheme();
  const palette = useMemo(() => buildAntifraudPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();

  const evidence = detail?.evidence;
  const comparisonItems = evidence
    ? [evidence, ...(detail?.relatedEvidence || [])]
    : [];
  const fraudAttempts = detail?.fraudAttempts || [];

  const [estadoRevision, setEstadoRevision] = useState("PENDIENTE_REVISION");
  const [conclusionFraude, setConclusionFraude] = useState("");
  const [notasRevision, setNotasRevision] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (evidence) {
      setEstadoRevision(
        evidence.estadoRevision ||
          (evidence.revisado ? "ANALIZADO_LIMPIO" : "PENDIENTE_REVISION"),
      );
      setConclusionFraude(evidence.conclusionFraude || "");
      setNotasRevision(evidence.notasRevision || "");
      setSavedOk(false);
    }
  }, [evidence]);

  const handleSave = async () => {
    if (!evidence?._id) return;
    setSaving(true);
    setSavedOk(false);
    try {
      await onSaveAudit({
        evidenceId: evidence._id,
        estadoRevision,
        conclusionFraude: conclusionFraude || null,
        notasRevision,
      });
      setSavedOk(true);
    } catch (err) {
      console.error("Error guardando auditoría:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <Surface style={[styles.modalSurface, { backgroundColor: palette.screen }]}>
        <AppHeader
          backgroundColor={theme.dark ? "#1e3a8a" : "#1d4ed8"}
          left={<Appbar.BackAction iconColor="#fff" onPress={onClose} />}
          overlapContent
          title="Investigación Forense"
        />

        <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]}>
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator color={palette.accent} size="large" />
              <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                Cargando imagen segura, trazabilidad y cotejo...
              </Text>
            </View>
          ) : null}

          {!loading && evidence ? (
            <View style={styles.body}>
              {/* Main Image */}
              <View style={styles.imageSection}>
                <Text style={[styles.sectionLabel, { color: palette.accentText }]} variant="labelSmall">
                  COMPROBANTE BAJO ANÁLISIS
                </Text>
                {detail.image?.imageUrl ? (
                  <Image
                    accessibilityLabel="Comprobante bajo análisis"
                    resizeMode="contain"
                    source={{ uri: detail.image.imageUrl }}
                    style={[styles.mainImage, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}
                  />
                ) : (
                    <Surface elevation={0} style={[styles.noImage, { backgroundColor: palette.nestedSurface }]}>
                    <Text style={[styles.muted, { color: palette.muted }]}>Imagen no disponible o token expirado.</Text>
                  </Surface>
                )}
              </View>

              {/* Metadata Card */}
              <Card mode="contained" style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Card.Content>
                  <Text style={[styles.title, { color: palette.text }]} variant="titleLarge">
                    Evidencia #{String(evidence._id || "").slice(-8).toUpperCase()}
                  </Text>
                  <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                    Usuario: <Text style={[styles.highlight, { color: palette.text }]}>{evidence.user?.name || evidence.userId}</Text> · {formatDate(evidence.createdAt)}
                  </Text>

                  <View style={styles.chipRow}>
                    <Chip compact>{evidence.status}</Chip>
                    {evidence.referenciaPago ? (
                      <Chip compact icon="tag" style={[styles.infoBadge, { backgroundColor: palette.infoSoft }]} textStyle={{ color: palette.infoText }}>
                        REF: {evidence.referenciaPago}
                      </Chip>
                    ) : null}
                    {evidence.ventaId ? (
                      <Chip compact>{`Venta ${String(evidence.ventaId).slice(-8)}`}</Chip>
                    ) : null}
                    {evidence.sale?.cobrado !== undefined ? (
                      <Chip compact style={{ backgroundColor: palette.surfaceElevated }} textStyle={{ color: palette.copy }}>
                        {`Monto: ${evidence.sale.cobrado} ${evidence.sale.monedaCobrado || "CUP"}`}
                      </Chip>
                    ) : null}
                  </View>

                  {/* IA Diagnostic */}
                  {evidence.analisisIA ? (
                    <Surface elevation={0} style={[styles.iaSurface, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                      <Text style={[styles.iaTitle, { color: palette.accentText }]} variant="labelLarge">
                        Diagnóstico de Inteligencia Artificial (Gemini)
                      </Text>
                      <Text style={[styles.iaSummary, { color: palette.copy }]} variant="bodySmall">
                        {evidence.analisisIA.summary || "Sin resumen disponible."}
                      </Text>

                      <View style={styles.chipRow}>
                        <Chip
                          compact
                          style={
                            evidence.analisisIA.decision === "VALIDA"
                                ? [styles.safeBadge, { backgroundColor: palette.successSoft }]
                                : [styles.riskBadge, { backgroundColor: palette.riskSoft }]
                          }
                              textStyle={{ color: evidence.analisisIA.decision === "VALIDA" ? palette.successText : palette.riskText }}
                        >
                          Decisión: {evidence.analisisIA.decision}
                        </Chip>
                        {evidence.analisisIA.reference ? (
                          <Chip compact style={{ backgroundColor: palette.surfaceElevated }} textStyle={{ color: palette.copy }}>Ref: {evidence.analisisIA.reference}</Chip>
                        ) : null}
                        {evidence.analisisIA.paymentAmount ? (
                          <Chip compact style={{ backgroundColor: palette.surfaceElevated }} textStyle={{ color: palette.copy }}>
                            Importe: {evidence.analisisIA.paymentAmount} {evidence.analisisIA.paymentCurrency || ""}
                          </Chip>
                        ) : null}
                        {evidence.analisisIA.paymentDate ? (
                          <Chip compact style={{ backgroundColor: palette.surfaceElevated }} textStyle={{ color: palette.copy }}>
                            Fecha comprobante: {evidence.analisisIA.paymentDate}
                          </Chip>
                        ) : null}
                        {(evidence.analisisIA.fraudSignals || []).map((signal) => (
                          <Chip compact key={signal} style={[styles.riskBadge, { backgroundColor: palette.riskSoft }]} textStyle={{ color: palette.riskText }}>
                            {signal}
                          </Chip>
                        ))}
                      </View>
                    </Surface>
                  ) : null}

                  {/* Denial Reason */}
                  {evidence.denegado ? (
                    <Surface elevation={0} style={[styles.denialSurface, { backgroundColor: palette.riskSoft, borderColor: palette.border }]}>
                      <Text style={[styles.denialTitle, { color: palette.riskText }]} variant="labelSmall">
                        Motivo de rechazo:
                      </Text>
                      <Text style={[styles.denialText, { color: palette.text }]} variant="bodySmall">
                        {evidence.motivoDenegacion || "No especificado"} ({formatDate(evidence.fechaDenegado)})
                      </Text>
                    </Surface>
                  ) : null}
                </Card.Content>
              </Card>

              {/* Side-by-Side Visual Comparison if multiple */}
              {comparisonItems.length > 1 ? (
                <Card mode="contained" style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Card.Content>
                    <Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">
                      Cotejo Visual de Comprobantes Relacionados
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Comparativa entre el comprobante reincidente y la coincidencia original.
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.comparisonScroll}
                    >
                      {comparisonItems.map((item, index) => (
                        <Surface elevation={0} key={item._id} style={[styles.comparisonCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                          <Text
                            style={[index === 0 ? styles.compTitleRisk : styles.compTitleSafe, { color: index === 0 ? palette.risk : palette.accent } ]}
                            variant="labelSmall"
                          >
                            {index === 0 ? "⚠️ Sospechosa Actual" : `🔍 Original Previa (#${index})`}
                          </Text>
                          {item.image?.imageUrl ? (
                            <Image
                              accessibilityLabel={`Comprobante ${index}`}
                              resizeMode="contain"
                              source={{ uri: item.image.imageUrl }}
                              style={[styles.comparisonImg, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}
                            />
                          ) : (
                            <View style={[styles.noImageSmall, { backgroundColor: palette.nestedSurface }]}>
                              <Text style={[styles.muted, { color: palette.muted }]}>Imagen no disponible</Text>
                            </View>
                          )}
                          <Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">
                            Usuario: {item.user?.name || item.userId}
                          </Text>
                          <Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">
                            Venta: {item.ventaId || "N/D"} · Ref: {item.referenciaPago || "N/D"}
                          </Text>
                          <Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">
                            {formatDate(item.createdAt)} · {item.status}
                          </Text>
                        </Surface>
                      ))}
                    </ScrollView>
                  </Card.Content>
                </Card>
              ) : null}

              {/* Fraud Attempts Related */}
              {fraudAttempts.length ? (
                <Card mode="contained" style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Card.Content>
                    <Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">
                      Intentos de Fraude Vinculados ({fraudAttempts.length})
                    </Text>
                    <View style={styles.attemptList}>
                      {fraudAttempts.map((fa) => (
                        <Surface elevation={0} key={fa._id} style={[styles.attemptBox, { backgroundColor: palette.riskSoft, borderColor: palette.border }]}>
                          <View style={styles.attemptHeader}>
                            <Chip compact style={[styles.riskBadge, { backgroundColor: palette.riskSoft }]} textStyle={{ color: palette.riskText }}>{fa.tipo}</Chip>
                            <Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">
                              {formatDate(fa.detectedAt || fa.createdAt)}
                            </Text>
                          </View>
                          <Text style={[styles.attemptReason, { color: palette.text }]} variant="bodySmall">
                            {fa.reason}
                          </Text>
                          {fa.changedFields?.length ? (
                            <Text style={[styles.attemptDiff, { color: palette.riskText }]} variant="labelSmall">
                              Diferencias: {fa.changedFields.join(", ")}
                            </Text>
                          ) : null}
                        </Surface>
                      ))}
                    </View>
                  </Card.Content>
                </Card>
              ) : null}

              {/* Human Audit Verdict Form */}
              <Card mode="contained" style={[styles.card, styles.auditCard, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                <Card.Content>
                  <View style={styles.auditHeader}>
                    <MaterialCommunityIcons color={palette.accent} name="shield-edit-outline" size={24} />
                    <Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">
                      Dictamen de Auditoría & Control
                    </Text>
                  </View>
                  <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                    Registra tu análisis oficial para marcar el caso como analizado y mantener la trazabilidad.
                  </Text>

                  {savedOk ? (
                    <Surface elevation={0} style={[styles.savedBanner, { backgroundColor: palette.successSoft, borderColor: palette.border }]}>
                      <Text style={[styles.savedText, { color: palette.successText }]} variant="bodyMedium">
                        ✅ Dictamen guardado exitosamente.
                      </Text>
                    </Surface>
                  ) : null}

                  <Text style={[styles.fieldLabel, { color: palette.accentText }]} variant="labelMedium">
                    Veredicto Oficial:
                  </Text>
                  <RadioButton.Group
                    onValueChange={(val) => setEstadoRevision(val)}
                    value={estadoRevision}
                  >
                    <RadioButton.Item label="⏳ Pendiente de revisión" value="PENDIENTE_REVISION" />
                    <RadioButton.Item label="🚨 Confirmado como Fraude" value="CONFIRMADO_FRAUDE" />
                    <RadioButton.Item label="🛡️ Falso Positivo / Válido" value="FALSO_POSITIVO" />
                    <RadioButton.Item label="⚠️ En Observación / Sospechoso" value="EN_OBSERVACION" />
                    <RadioButton.Item label="✅ Analizado y Limpio" value="ANALIZADO_LIMPIO" />
                  </RadioButton.Group>

                  <TextInput
                    label="Categoría de conclusión"
                    mode="outlined"
                    onChangeText={setConclusionFraude}
                    placeholder="Ej: REUTILIZACION_REFERENCIA"
                    activeOutlineColor={palette.accent}
                    outlineColor={palette.borderStrong}
                    style={[styles.input, { backgroundColor: palette.input }]}
                    textColor={palette.text}
                    value={conclusionFraude}
                  />

                  <TextInput
                    label="Notas de Auditoría y Hallazgos"
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    onChangeText={setNotasRevision}
                    placeholder="Documenta por qué se clasifica como fraude o legítimo..."
                    activeOutlineColor={palette.accent}
                    outlineColor={palette.borderStrong}
                    style={[styles.input, { backgroundColor: palette.input }]}
                    textColor={palette.text}
                    value={notasRevision}
                  />

                  <Button
                    icon="content-save"
                    loading={saving}
                    mode="contained"
                    onPress={handleSave}
                    style={styles.saveBtn}
                  >
                    Guardar Dictamen de Auditoría
                  </Button>
                </Card.Content>
              </Card>
            </View>
          ) : null}
        </ScrollView>
      </Surface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSurface: {
    backgroundColor: "#0f172a",
    flex: 1,
  },
  appbar: {
    backgroundColor: "#1e3a8a",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  body: {
    gap: 14,
  },
  imageSection: {
    alignItems: "center",
  },
  sectionLabel: {
    color: "#93c5fd",
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  mainImage: {
    backgroundColor: "#020617",
    borderRadius: 18,
    height: 320,
    width: "100%",
  },
  noImage: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 18,
    height: 140,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
  },
  title: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  highlight: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  infoBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  riskBadge: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  safeBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  iaSurface: {
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderColor: "rgba(148, 163, 184, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  iaTitle: {
    color: "#93c5fd",
    fontWeight: "800",
  },
  iaSummary: {
    color: "rgba(226, 232, 240, 0.85)",
    lineHeight: 18,
    marginTop: 4,
  },
  denialSurface: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },
  denialTitle: {
    color: "#fca5a5",
    fontWeight: "800",
  },
  denialText: {
    color: "#f8fafc",
    marginTop: 2,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  comparisonScroll: {
    marginTop: 10,
  },
  comparisonCard: {
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
    padding: 10,
    width: 220,
  },
  compTitleRisk: {
    color: "#f87171",
    fontWeight: "800",
  },
  compTitleSafe: {
    color: "#60a5fa",
    fontWeight: "800",
  },
  comparisonImg: {
    backgroundColor: "#020617",
    borderRadius: 10,
    height: 160,
    marginVertical: 6,
    width: "100%",
  },
  noImageSmall: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 10,
    height: 100,
    justifyContent: "center",
    marginVertical: 6,
  },
  attemptList: {
    gap: 8,
    marginTop: 8,
  },
  attemptBox: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  attemptHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attemptReason: {
    color: "#f8fafc",
    marginTop: 4,
  },
  attemptDiff: {
    color: "#fca5a5",
    fontWeight: "700",
    marginTop: 2,
  },
  auditCard: {
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  auditHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  savedBanner: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
    padding: 10,
  },
  savedText: {
    color: "#86efac",
    fontWeight: "700",
  },
  fieldLabel: {
    color: "#93c5fd",
    fontWeight: "700",
    marginTop: 10,
  },
  input: {
    marginTop: 10,
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    marginTop: 14,
  },
  muted: {
    color: "rgba(226, 232, 240, 0.65)",
    marginTop: 2,
  },
});