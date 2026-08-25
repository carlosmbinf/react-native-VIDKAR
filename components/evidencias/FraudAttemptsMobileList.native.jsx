import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, Surface, Text, useTheme } from "react-native-paper";
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

const tipoLabels = {
  REFERENCE_ALREADY_USED: "Referencia Ya Utilizada",
  REFERENCE_DATE_CONFLICT: "Conflicto de Fecha en Referencia",
  EVIDENCE_MODIFICATION_ATTEMPT: "Adulteración de Evidencia",
};

export default function FraudAttemptsMobileList({
  items = [],
  loading = false,
  total = 0,
  page = 1,
  pageSize = 25,
  hasNext = false,
  onPageChange,
  onOpenInvestigation,
  onQuickReview,
  isTablet = false,
}) {
  const theme = useTheme();
  const palette = useMemo(() => buildAntifraudPalette(theme), [theme]);

  return (
    <View style={styles.container}>
      {!loading && !items.length ? (
        <Surface elevation={1} style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <MaterialCommunityIcons color={palette.success} name="shield-check" size={44} />
          <Text style={[styles.emptyTitle, { color: palette.text }]} variant="titleMedium">No hay intentos de fraude pendientes</Text>
          <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
            Todos los casos registrados han sido resueltos o no coinciden con los filtros.
          </Text>
        </Surface>
      ) : null}

      <View style={[styles.listGrid, isTablet && styles.listGridTablet]}>
        {items.map((attempt) => {
          const isConfirmed = attempt.estadoRevision === "CONFIRMADO_FRAUDE";
          const isClean =
            attempt.estadoRevision === "ANALIZADO_LIMPIO" ||
            attempt.estadoRevision === "FALSO_POSITIVO";

          return (
            <Card key={attempt._id} mode="contained" style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.cardTablet]}>
              <Card.Content>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.refWrap}>
                    <Text style={[styles.refCode, { color: palette.riskText }]} variant="titleSmall">
                      REF: {attempt.attemptedReference || "SIN_REFERENCIA"}
                    </Text>
                    <Chip compact style={[styles.riskBadge, { backgroundColor: palette.riskSoft }]} textStyle={{ color: palette.riskText }}>
                      {tipoLabels[attempt.tipo] || attempt.tipo}
                    </Chip>
                  </View>

                  <Chip
                    compact
                    style={[
                      isConfirmed
                        ? styles.riskBadge
                        : isClean
                        ? styles.safeBadge
                        : styles.pendingBadge,
                      { backgroundColor: isConfirmed ? palette.riskSoft : isClean ? palette.successSoft : palette.warningSoft },
                    ]}
                    textStyle={{ color: isConfirmed ? palette.riskText : isClean ? palette.successText : palette.warningText }}
                  >
                    {isConfirmed
                      ? "🚨 Fraude Confirmado"
                      : isClean
                      ? "✅ Analizado / Limpio"
                      : "⏳ Pendiente"}
                  </Chip>
                </View>

                {/* Reason description */}
                <Text style={[styles.reasonText, { color: palette.copy }]} variant="bodyMedium">
                  {attempt.reason || "Referencia repetida o conflicto detectado por el motor de seguridad."}
                </Text>

                {/* Comparison Box */}
                <Surface elevation={0} style={[styles.compareSurface, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                  <View style={styles.compareCol}>
                    <Text style={[styles.colTitleAttempted, { color: palette.risk }]} variant="labelSmall">
                      REINCIDENTE / SOSPECHOSO
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Usuario: <Text style={[styles.highlight, { color: palette.text }]}>{attempt.user?.name || attempt.username || attempt.userId}</Text>
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Venta: <Text style={[styles.highlight, { color: palette.text }]}>{attempt.ventaId || "N/D"}</Text>
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Fecha reportada: <Text style={[styles.highlight, { color: palette.text }]}>{attempt.attemptedPaymentDate || "N/D"}</Text>
                    </Text>
                  </View>

                  <Divider style={[styles.divider, { backgroundColor: palette.border }]} />

                  <View style={styles.compareCol}>
                    <Text style={[styles.colTitleExisting, { color: palette.accent }]} variant="labelSmall">
                      COINCIDENCIA ORIGINAL PREVIA
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Usuario previo: <Text style={[styles.highlight, { color: palette.text }]}>{attempt.existingUser?.name || attempt.existingUsername || attempt.existingUserId || "N/D"}</Text>
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Venta previa: <Text style={[styles.highlight, { color: palette.text }]}>{attempt.existingVentaId || "N/D"}</Text>
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                      Estado previo: <Text style={[styles.highlight, { color: palette.text }]}>{attempt.existingApproved ? "Aprobada" : attempt.existingDenied ? "Rechazada" : "Pendiente"}</Text>
                    </Text>
                  </View>

                  {attempt.changedFields?.length ? (
                    <Text style={[styles.diffAlert, { color: palette.riskText }]} variant="labelSmall">
                      Discrepancias: {attempt.changedFields.join(", ")}
                    </Text>
                  ) : null}
                </Surface>

                {/* Audit dictamen if present */}
                {attempt.revisado && attempt.notasRevision ? (
                  <Surface elevation={0} style={[styles.auditNotes, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
                    <Text style={[styles.auditTitle, { color: palette.accentText }]} variant="labelSmall">
                      Dictamen ({attempt.revisadoPor || "Admin"} · {formatDate(attempt.fechaRevisado)}):
                    </Text>
                    <Text style={[styles.auditBody, { color: palette.text }]} variant="bodySmall">
                      {attempt.notasRevision}
                    </Text>
                  </Surface>
                ) : null}

                {/* Quick actions */}
                <View style={styles.actionRow}>
                  <View style={styles.quickBtns}>
                    <Button
                      compact
                      mode={isConfirmed ? "contained" : "outlined"}
                      onPress={() => onQuickReview(attempt, "CONFIRMADO_FRAUDE")}
                      style={[styles.btn, styles.btnRisk, { borderColor: palette.risk } ]}
                      textColor={palette.riskText}
                    >
                      Fraude
                    </Button>
                    <Button
                      compact
                      mode={attempt.estadoRevision === "FALSO_POSITIVO" ? "contained" : "outlined"}
                      onPress={() => onQuickReview(attempt, "FALSO_POSITIVO")}
                      style={[styles.btn, styles.btnSafe, { borderColor: palette.success } ]}
                      textColor={palette.successText}
                    >
                      Descartar
                    </Button>
                  </View>

                  <Button
                    compact
                    icon="compare"
                    mode="contained"
                    onPress={() => onOpenInvestigation(attempt.evidenciaId || attempt.existingEvidenceId)}
                    style={[styles.inspectBtn, { backgroundColor: palette.accentStrong }]}
                  >
                    Comparar
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </View>

      {/* Pagination */}
      <View style={styles.pagination}>
        <Button disabled={loading || page <= 1} onPress={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
          Página {page} · {total} caso(s)
        </Text>
        <Button disabled={loading || !hasNext} onPress={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 20,
  },
  listGrid: {
    gap: 12,
  },
  listGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
  },
  cardTablet: {
    flexBasis: "48.5%",
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  refWrap: {
    alignItems: "flex-start",
    flex: 1,
    gap: 4,
    marginRight: 8,
  },
  refCode: {
    color: "#fca5a5",
    fontFamily: "monospace",
    fontWeight: "800",
  },
  reasonText: {
    color: "rgba(226, 232, 240, 0.85)",
    lineHeight: 19,
    marginVertical: 4,
  },
  compareSurface: {
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    borderColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 8,
    padding: 10,
  },
  compareCol: {
    gap: 2,
  },
  colTitleAttempted: {
    color: "#f87171",
    fontWeight: "800",
  },
  colTitleExisting: {
    color: "#60a5fa",
    fontWeight: "800",
  },
  divider: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    marginVertical: 8,
  },
  highlight: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  diffAlert: {
    color: "#fca5a5",
    fontWeight: "700",
    marginTop: 6,
  },
  auditNotes: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 10,
    marginBottom: 8,
    padding: 10,
  },
  auditTitle: {
    color: "#93c5fd",
    fontWeight: "700",
  },
  auditBody: {
    color: "#f8fafc",
    marginTop: 2,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  quickBtns: {
    flexDirection: "row",
    gap: 6,
  },
  btn: {
    borderRadius: 12,
  },
  btnRisk: {
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  btnSafe: {
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  inspectBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
  },
  riskBadge: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  safeBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  pendingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  muted: {
    color: "rgba(226, 232, 240, 0.65)",
  },
  empty: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderRadius: 20,
    gap: 6,
    padding: 28,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontWeight: "700",
    marginTop: 6,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
});