import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import useSafeBack from "../navigation/useSafeBack";
import { buildAntifraudPalette } from "./antifraudTheme";
import AntifraudMetricsMobileDashboard from "./AntifraudMetricsMobileDashboard.native";
import FraudAttemptsMobileList from "./FraudAttemptsMobileList.native";
import EvidenceForensicModal from "./EvidenceForensicModal.native";
import SecurityPoliciesMobilePanel from "./SecurityPoliciesMobilePanel.native";

const Meteor = /** @type {typeof MeteorBase} */ (MeteorBase);
const PRINCIPAL_USERNAME = "carlosmbinf";

const INITIAL_FILTERS = {
  dateFrom: "",
  dateTo: "",
  fraudOnly: false,
  investigationScope: "INVESTIGABLE",
  page: 1,
  pageSize: 15,
  reviewStatus: "TODAS",
  search: "",
  status: "TODAS",
};

const INITIAL_ATTEMPTS_FILTERS = {
  dateFrom: "",
  dateTo: "",
  page: 1,
  pageSize: 15,
  reviewStatus: "TODAS",
  search: "",
};

const callMethod = (name, ...args) =>
  new Promise((resolve, reject) => {
    Meteor.call(name, ...args, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });

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

const getRisk = (item) =>
  item?.investigationReasons?.length > 0 ||
  item?.fraudAttemptCount > 0 ||
  item?.analisisIA?.decision === "INVALIDA";

// Filter Modal for Evidence Queue
const EvidenceFilterModal = ({ filters, onApply, onClose, visible }) => {
  const theme = useTheme();
  const palette = useMemo(() => buildAntifraudPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [filters, visible]);

  const update = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <Surface style={[styles.modalSurface, { backgroundColor: palette.screen }]}>
        <AppHeader
          backgroundColor={theme.dark ? "#1e3a8a" : "#1d4ed8"}
          left={<Appbar.BackAction iconColor="#fff" onPress={onClose} />}
          overlapContent
          title="Filtros de Investigación"
        />
        <ScrollView contentContainerStyle={[styles.modalContent, { paddingTop: headerInset + 12 }]}>
          <TextInput
            label="Buscar ID, venta, referencia o usuario"
            mode="outlined"
            onChangeText={(value) => update("search", value)}
            placeholder="Ej: 9942718113, carlos..."
            outlineColor={palette.borderStrong}
            activeOutlineColor={palette.accent}
            style={[styles.input, { backgroundColor: palette.input }]}
            textColor={palette.text}
            value={draft.search}
          />

          <Text style={[styles.filterLabel, { color: palette.accentText }]} variant="labelLarge">
            Alcance de investigación
          </Text>
          <View style={styles.chipRow}>
            {[
              ["INVESTIGABLE", "Casos investigables"],
              ["INTENTOS_FRAUDE", "Solo intentos"],
              ["RECHAZADAS", "Rechazadas"],
              ["SOSPECHOSAS", "Sospechosas"],
              ["TODAS", "Todas"],
            ].map(([scope, label]) => (
              <Chip
                key={scope}
                onPress={() => update("investigationScope", scope)}
                selected={draft.investigationScope === scope}
                style={[styles.filterChip, { backgroundColor: draft.investigationScope === scope ? palette.accentSoft : palette.surfaceElevated }]}
                textStyle={{ color: draft.investigationScope === scope ? palette.accentText : palette.copy }}
              >
                {label}
              </Chip>
            ))}
          </View>

          <Text style={[styles.filterLabel, { color: palette.accentText }]} variant="labelLarge">
            Estado de Auditoría
          </Text>
          <View style={styles.chipRow}>
            {[
              ["TODAS", "Todos"],
              ["PENDIENTE_REVISION", "⏳ Pendientes"],
              ["CONFIRMADO_FRAUDE", "🚨 Fraude"],
              ["FALSO_POSITIVO", "🛡️ Descartado"],
              ["ANALIZADO_LIMPIO", "✅ Limpio"],
            ].map(([rev, label]) => (
              <Chip
                key={rev}
                onPress={() => update("reviewStatus", rev)}
                selected={draft.reviewStatus === rev}
                style={[styles.filterChip, { backgroundColor: draft.reviewStatus === rev ? palette.accentSoft : palette.surfaceElevated }]}
                textStyle={{ color: draft.reviewStatus === rev ? palette.accentText : palette.copy }}
              >
                {label}
              </Chip>
            ))}
          </View>

          <Text style={[styles.filterLabel, { color: palette.accentText }]} variant="labelLarge">
            Estado del Pago
          </Text>
          <View style={styles.chipRow}>
            {["TODAS", "PENDIENTE", "APROBADA", "RECHAZADA"].map((status) => (
              <Chip
                key={status}
                onPress={() => update("status", status)}
                selected={draft.status === status}
                style={[styles.filterChip, { backgroundColor: draft.status === status ? palette.accentSoft : palette.surfaceElevated }]}
                textStyle={{ color: draft.status === status ? palette.accentText : palette.copy }}
              >
                {status === "TODAS" ? "Todos" : status}
              </Chip>
            ))}
          </View>

          <TextInput
            autoCapitalize="none"
            label="Desde (YYYY-MM-DD)"
            mode="outlined"
            onChangeText={(value) => update("dateFrom", value)}
            outlineColor={palette.borderStrong}
            activeOutlineColor={palette.accent}
            style={[styles.input, { backgroundColor: palette.input }]}
            textColor={palette.text}
            value={draft.dateFrom}
          />
          <TextInput
            autoCapitalize="none"
            label="Hasta (YYYY-MM-DD)"
            mode="outlined"
            onChangeText={(value) => update("dateTo", value)}
            outlineColor={palette.borderStrong}
            activeOutlineColor={palette.accent}
            style={[styles.input, { backgroundColor: palette.input }]}
            textColor={palette.text}
            value={draft.dateTo}
          />

          <Button
            mode="contained"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={styles.applyButton}
          >
            Aplicar filtros
          </Button>
        </ScrollView>
      </Surface>
    </Modal>
  );
};

export default function AntifraudCenterNative() {
  const safeBack = useSafeBack("/(normal)/Main");
  const theme = useTheme();
  const palette = useMemo(() => buildAntifraudPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;

  const user = Meteor.useTracker(() => Meteor.user(), []);
  const allowed =
    String(user?.username || "").toLowerCase() === PRINCIPAL_USERNAME;

  const [activeTab, setActiveTab] = useState("metricas");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [attemptsFilters, setAttemptsFilters] = useState(INITIAL_ATTEMPTS_FILTERS);

  const [data, setData] = useState({
    items: [],
    summary: {},
    total: 0,
    hasNext: false,
  });
  const [attemptsData, setAttemptsData] = useState({
    items: [],
    total: 0,
    hasNext: false,
  });

  const [loading, setLoading] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);

  const [detailEvidenceId, setDetailEvidenceId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cargar evidencias y resumen general
  const load = useCallback(async (nextFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await callMethod(
        "evidenciasAdmin.listarCentroAntifraude",
        nextFilters,
      );
      setData(res || { items: [], summary: {}, total: 0, hasNext: false });
    } catch (requestError) {
      setError(
        requestError?.reason ||
          requestError?.message ||
          "No se pudo cargar el centro antifraude.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar intentos de fraude
  const loadAttempts = useCallback(async (nextFilters) => {
    setAttemptsLoading(true);
    try {
      const res = await callMethod(
        "evidenciasAdmin.listarIntentosFraude",
        nextFilters,
      );
      setAttemptsData(res || { items: [], total: 0, hasNext: false });
    } catch (err) {
      console.error("Error cargando intentos:", err);
    } finally {
      setAttemptsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      load(INITIAL_FILTERS);
      loadAttempts(INITIAL_ATTEMPTS_FILTERS);
    }
  }, [allowed, load, loadAttempts]);

  const openDetail = useCallback(async (evidenceId) => {
    if (!evidenceId) return;
    setDetailEvidenceId(evidenceId);
    setDetailLoading(true);
    setError("");
    try {
      setDetail(
        await callMethod("evidenciasAdmin.obtenerDetalleAntifraude", evidenceId),
      );
    } catch (requestError) {
      setError(
        requestError?.reason ||
          requestError?.message ||
          "No se pudo abrir la investigación.",
      );
      setDetailEvidenceId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setDetailEvidenceId(null);
    setDetail(null);
  };

  const handleSaveAudit = async (auditPayload) => {
    await callMethod("evidenciasAdmin.marcarEvidenciaAnalizada", auditPayload);
    load(filters);
    loadAttempts(attemptsFilters);
  };

  const handleQuickAttemptReview = async (attempt, targetStatus) => {
    try {
      await callMethod("evidenciasAdmin.marcarIntentoFraudeAnalizado", {
        intentoId: attempt._id,
        estadoRevision: targetStatus,
        conclusionFraude:
          targetStatus === "CONFIRMADO_FRAUDE"
            ? "CONFIRMADO_POR_ADMIN"
            : "FALSO_POSITIVO_DESCARTADO",
        notasRevision: `Revisado con dictamen rápido mobile: ${targetStatus}`,
      });
      loadAttempts(attemptsFilters);
      load(filters);
    } catch (err) {
      setError(err?.reason || err?.message || "Error al actualizar estado.");
    }
  };

  const changePage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    load(next);
  };

  const summary = data?.summary || {};

  if (!allowed) {
    return (
      <Surface style={[styles.surface, { backgroundColor: palette.screen }]}>
        <Text style={[styles.denied, { color: palette.riskText }]} variant="titleMedium">
          Esta sección está reservada exclusivamente al Administrador Principal.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.surface, { backgroundColor: palette.screen }]}>
      <AppHeader
        actions={activeTab === "cola" ? (
          <Appbar.Action
            accessibilityLabel="Filtrar"
            iconColor="#fff"
            icon="filter-variant"
            onPress={() => setFilterVisible(true)}
          />
        ) : (
          <Appbar.Action
            accessibilityLabel="Actualizar"
            iconColor="#fff"
            icon="refresh"
            onPress={() => {
              load(filters);
              loadAttempts(attemptsFilters);
            }}
          />
        )}
        backgroundColor={theme.dark ? "#1e3a8a" : "#1d4ed8"}
        onBack={safeBack}
        overlapContent
        showBackButton
        title="Centro Antifraude"
      />

      {/* Main Container */}
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerInset + 12 },
          isTablet && styles.listContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <Surface elevation={2} style={[styles.hero, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
          <Text style={[styles.eyebrow, { color: palette.accentText }]} variant="labelSmall">
            Plataforma de Inteligencia & Seguridad
          </Text>
          <Text style={[styles.heroTitle, { color: palette.text }]} variant="headlineSmall">
            Centro Antifraude & Auditoría
          </Text>
          <Text style={[styles.heroCopy, { color: palette.copy }]} variant="bodyMedium">
            Detección de patrones de fraude, prevención de referencias bancarias
            reutilizadas, análisis de adulteración y auditoría asistida por IA.
          </Text>

          <View style={styles.heroBadges}>
            <Chip compact icon="shield-account" style={[styles.adminBadge, { backgroundColor: palette.infoSoft }]} textStyle={{ color: palette.infoText }}>
              Acceso exclusivo · carlosmbinf
            </Chip>
            <Chip compact style={[styles.infoBadge, { backgroundColor: palette.surface }]} textStyle={{ color: palette.copy }}>
              {data.total || 0} Evidencias en Radar
            </Chip>
            <Chip compact style={[styles.riskBadge, { backgroundColor: palette.riskSoft }]} textStyle={{ color: palette.riskText }}>
              {summary.attempted || 0} Intentos
            </Chip>
          </View>
        </Surface>

        {/* Tab Selector */}
        <SegmentedButtons
          buttons={[
            { icon: "chart-box-outline", label: "Métricas", value: "metricas" },
            {
              icon: "alert-decagram-outline",
              label: `Intentos (${summary.attempted || 0})`,
              value: "intentos",
            },
            {
              icon: "file-search-outline",
              label: `Cola (${data.total || 0})`,
              value: "cola",
            },
            { icon: "shield-lock-outline", label: "Políticas", value: "politicas" },
          ]}
          onValueChange={setActiveTab}
          style={styles.segmentedTabs}
          value={activeTab}
        />

        {error ? (
          <Text style={[styles.error, { color: palette.riskText }]} variant="bodySmall">
            {error}
          </Text>
        ) : null}

        {/* Tab 1: Dashboard Metrics & Charts */}
        {activeTab === "metricas" ? (
          <AntifraudMetricsMobileDashboard isTablet={isTablet} summary={summary} />
        ) : null}

        {/* Tab 2: Fraud Attempts */}
        {activeTab === "intentos" ? (
          <FraudAttemptsMobileList
            hasNext={attemptsData.hasNext}
            isTablet={isTablet}
            items={attemptsData.items}
            loading={attemptsLoading}
            onOpenInvestigation={openDetail}
            onPageChange={(p) => {
              const next = { ...attemptsFilters, page: p };
              setAttemptsFilters(next);
              loadAttempts(next);
            }}
            onQuickReview={handleQuickAttemptReview}
            page={attemptsFilters.page}
            pageSize={attemptsFilters.pageSize}
            total={attemptsData.total}
          />
        ) : null}

        {/* Tab 3: Evidence Queue */}
        {activeTab === "cola" ? (
          <View style={styles.evidenceQueue}>
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={palette.accent} size="large" />
                <Text style={[styles.muted, { color: palette.muted }]}>Cargando investigaciones…</Text>
              </View>
            ) : null}

            {!loading && !data.items.length ? (
              <Surface elevation={1} style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <MaterialCommunityIcons
                  color={palette.accent}
                  name="shield-alert-outline"
                  size={42}
                />
                <Text style={[styles.cardTitle, { color: palette.text }]} variant="titleMedium">
                  No hay evidencias para estos filtros
                </Text>
                <Text style={[styles.muted, { color: palette.muted }]}>
                  Abre el filtro para cambiar el criterio de búsqueda.
                </Text>
              </Surface>
            ) : null}

            {!loading && data.items.length > 0 ? (
              <View style={[styles.evidenceGrid, isTablet && styles.evidenceGridTablet]}>
                {data.items.map((item) => (
                  <Card
                    key={item._id}
                    mode="contained"
                    onPress={() => openDetail(item._id)}
                    style={[styles.evidenceCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.evidenceCardTablet]}
                  >
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardCopy}>
                          <Text style={[styles.cardTitle, { color: palette.text }]} variant="titleMedium">
                            Evidencia #{String(item._id || "").slice(-8).toUpperCase()}
                          </Text>
                          <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                            {item.user?.name || item.userId || "Usuario sin identificar"}
                          </Text>
                        </View>
                        <Chip
                          compact
                          style={[styles.statusChip, { backgroundColor: palette.surfaceElevated }]}
                          textStyle={{ color: item.status === "APROBADA" ? palette.successText : item.status === "RECHAZADA" ? palette.riskText : palette.warningText }}
                        >
                          {item.status || "PENDIENTE"}
                        </Chip>
                      </View>

                      <View style={styles.chipRow}>
                        <Chip
                          compact
                          icon={getRisk(item) ? "alert-circle-outline" : "check-circle-outline"}
                          style={[getRisk(item) ? styles.riskBadge : styles.safeBadge, { backgroundColor: getRisk(item) ? palette.riskSoft : palette.successSoft }]}
                          textStyle={{ color: getRisk(item) ? palette.riskText : palette.successText }}
                        >
                          {getRisk(item) ? "Señal de riesgo" : "Sin señales"}
                        </Chip>
                        <Chip compact icon="brain" style={{ backgroundColor: palette.infoSoft }} textStyle={{ color: palette.infoText }}>
                          {item.analisisIA?.decision || "IA pendiente"}
                        </Chip>
                        {item.referenciaPago ? (
                          <Chip compact style={[styles.refChip, { backgroundColor: palette.infoSoft }]} textStyle={{ color: palette.infoText }}>
                            REF: {item.referenciaPago}
                          </Chip>
                        ) : null}
                      </View>

                      <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
                        {formatDate(item.createdAt)}
                        {item.ventaId ? ` · Venta ${String(item.ventaId).slice(-8)}` : ""}
                      </Text>

                      {item.analisisIA?.summary ? (
                        <Text numberOfLines={2} style={[styles.summaryText, { color: palette.copy }]} variant="bodyMedium">
                          {item.analisisIA.summary}
                        </Text>
                      ) : null}

                      {item.revisado && item.notasRevision ? (
                        <Surface elevation={0} style={[styles.auditSnippet, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
                          <Text style={[styles.auditLabel, { color: palette.accentText }]} variant="labelSmall">
                            Dictamen ({item.revisadoPor || "Admin"}): {item.notasRevision}
                          </Text>
                        </Surface>
                      ) : null}

                      <Button
                        compact
                        icon="magnify"
                        mode="text"
                        onPress={() => openDetail(item._id)}
                        style={styles.openButton}
                      >
                        Abrir investigación & auditoría
                      </Button>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Pagination */}
            <View style={styles.pagination}>
              <Button disabled={loading || filters.page <= 1} onPress={() => changePage(filters.page - 1)}>
                Anterior
              </Button>
              <Text style={[styles.muted, { color: palette.muted }]}>
                Página {filters.page} · {data.total || 0} resultados
              </Text>
              <Button disabled={loading || !data?.hasNext} onPress={() => changePage(filters.page + 1)}>
                Siguiente
              </Button>
            </View>
          </View>
        ) : null}

        {/* Tab 4: Policies & Preventive Measures */}
        {activeTab === "politicas" ? (
          <SecurityPoliciesMobilePanel isTablet={isTablet} summary={summary} />
        ) : null}
      </ScrollView>

      {/* Filter Modal */}
      <EvidenceFilterModal
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          load(next);
        }}
        onClose={() => setFilterVisible(false)}
        visible={filterVisible}
      />

      {/* Forensic Modal */}
      <EvidenceForensicModal
        detail={detail}
        isTablet={isTablet}
        loading={detailLoading}
        onClose={closeDetail}
        onSaveAudit={handleSaveAudit}
        visible={Boolean(detailEvidenceId)}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "#0f172a",
    flex: 1,
  },
  appbar: {
    backgroundColor: "#1e3a8a",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContentTablet: {
    paddingHorizontal: 24,
  },
  hero: {
    backgroundColor: "#111c44",
    borderRadius: 24,
    marginBottom: 14,
    padding: 18,
  },
  eyebrow: {
    color: "#93c5fd",
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "900",
    marginTop: 4,
  },
  heroCopy: {
    color: "rgba(255,255,255,.78)",
    lineHeight: 20,
    marginTop: 6,
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  adminBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  infoBadge: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  riskBadge: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  safeBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  refChip: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  segmentedTabs: {
    marginBottom: 16,
  },
  evidenceQueue: {
    gap: 12,
  },
  evidenceGrid: {
    gap: 12,
  },
  evidenceGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  evidenceCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
  },
  evidenceCardTablet: {
    flexBasis: "48.5%",
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardCopy: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  muted: {
    color: "rgba(226, 232, 240, 0.68)",
    marginTop: 4,
  },
  statusChip: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  summaryText: {
    color: "rgba(226, 232, 240, 0.8)",
    lineHeight: 18,
    marginTop: 8,
  },
  auditSnippet: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  auditLabel: {
    color: "#93c5fd",
  },
  openButton: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderRadius: 20,
    gap: 6,
    padding: 28,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  loading: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 22,
  },
  error: {
    color: "#fecaca",
    marginBottom: 12,
  },
  denied: {
    color: "#fecaca",
    padding: 24,
    textAlign: "center",
  },
  modalSurface: {
    backgroundColor: "#0f172a",
    flex: 1,
  },
  modalContent: {
    padding: 18,
    paddingBottom: 36,
  },
  input: {
    marginBottom: 14,
  },
  filterLabel: {
    color: "#bfdbfe",
    marginBottom: 8,
    marginTop: 4,
  },
  filterChip: {
    marginBottom: 8,
  },
  applyButton: {
    marginTop: 18,
  },
});
