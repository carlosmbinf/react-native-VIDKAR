import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurTargetView } from "expo-blur";
import MeteorBase from "@meteorrn/core";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Modal, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Button, Card, Chip, Divider, Menu, Surface, Text, TextInput, useTheme } from "react-native-paper";

import AppHeader, {
  MENU_PRINCIPAL_HEADER_COLOR,
  useAppHeaderContentInset,
} from "../Header/AppHeader";

const Meteor = /** @type {typeof MeteorBase} */ (MeteorBase);
const PRINCIPAL_USERNAME = "carlosmbinf";
const INITIAL_FILTERS = { dateFrom: "", dateTo: "", fraudOnly: false, investigationScope: "INVESTIGABLE", page: 1, pageSize: 15, reviewStatus: "TODAS", search: "", status: "TODAS" };
const REVIEW_OPTIONS = [
  ["TODAS", "Todas las revisiones"],
  ["PENDIENTE_REVISION", "Pendientes de revisión"],
  ["REVISADO", "Revisadas"],
];
const AUDIT_OPTIONS = [
  ["PENDIENTE_REVISION", "⏳ Pendiente de revisión"],
  ["CONFIRMADO_FRAUDE", "🚨 Confirmado como Fraude"],
  ["FALSO_POSITIVO", "🛡️ Falso Positivo / Comprobante Válido"],
  ["EN_OBSERVACION", "⚠️ Sospechoso / En Observación"],
  ["ANALIZADO_LIMPIO", "✅ Analizado y Aprobado Sin Anomalías"],
];

const getAntifraudPalette = (isDark) => isDark ? {
  background: "#0f172a",
  elevatedSurface: "rgba(15,23,42,.72)",
  hero: "#111c44",
  card: "rgba(15,23,42,.85)",
  input: "rgba(255,255,255,.08)",
  border: "rgba(148,163,184,.14)",
  divider: "rgba(148,163,184,.12)",
  text: "#f8fafc",
  textOnHero: "#ffffff",
  muted: "rgba(226,232,240,.68)",
  heroMuted: "rgba(255,255,255,.78)",
  accent: "#93c5fd",
  accentMuted: "#bfdbfe",
  risk: "rgba(248,113,113,.14)",
  riskText: "#fecaca",
  safe: "rgba(74,222,128,.12)",
  safeText: "#86efac",
  overlay: "rgba(2,6,23,.75)",
  imagePlaceholder: "#020617",
} : {
  background: "#f8fafc",
  elevatedSurface: "#ffffff",
  hero: "#e0ecff",
  card: "#ffffff",
  input: "#ffffff",
  border: "#d5deeb",
  divider: "#dbe4ef",
  text: "#172033",
  textOnHero: "#102a56",
  muted: "#526174",
  heroMuted: "#385273",
  accent: "#1d4ed8",
  accentMuted: "#1e40af",
  risk: "#fee2e2",
  riskText: "#b42318",
  safe: "#dcfce7",
  safeText: "#166534",
  overlay: "rgba(15,23,42,.38)",
  imagePlaceholder: "#e2e8f0",
};

const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

const formatDate = (value) => value ? new Date(value).toLocaleString("es-ES", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit", year: "numeric" }) : "Sin fecha";
const getStatusColor = (status, palette) => status === "APROBADA" ? palette.safeText : status === "RECHAZADA" ? palette.riskText : palette.accentMuted;
const getRisk = (item) => item?.investigationReasons?.length > 0 || item?.fraudAttemptCount > 0 || item?.analisisIA?.decision === "INVALIDA";

const FilterModal = ({ filters, onApply, onClose, visible }) => {
  const theme = useTheme();
  const palette = getAntifraudPalette(theme.dark);
  const headerInset = useAppHeaderContentInset();
  const blurTargetRef = React.useRef(null);
  const [draft, setDraft] = useState(filters);
  useEffect(() => { if (visible) setDraft(filters); }, [filters, visible]);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value, page: 1 }));
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <Surface style={[styles.modalSurface, { backgroundColor: palette.background }]}>
        <BlurTargetView ref={blurTargetRef} style={styles.modalTarget}>
          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingTop: headerInset + 18 }]}
          >
            <TextInput label="Buscar ID, venta, referencia o usuario" mode="outlined" onChangeText={(value) => update("search", value)} style={styles.input} value={draft.search} />
            <Text style={[styles.filterLabel, { color: palette.accentMuted }]} variant="labelLarge">Alcance de investigación</Text>
            <View style={styles.chipRow}>{[["INVESTIGABLE", "Casos investigables"], ["INTENTOS_FRAUDE", "Intentos registrados"], ["RECHAZADAS", "Rechazadas"], ["SOSPECHOSAS", "Sospechosas"], ["TODAS", "Todas las evidencias"]].map(([scope, label]) => <Chip key={scope} onPress={() => update("investigationScope", scope)} selected={draft.investigationScope === scope} style={styles.filterChip}>{label}</Chip>)}</View>
            <Text style={[styles.filterLabel, { color: palette.accentMuted }]} variant="labelLarge">Estado de evidencia</Text>
            <View style={styles.chipRow}>{["TODAS", "PENDIENTE", "APROBADA", "RECHAZADA"].map((status) => <Chip key={status} onPress={() => update("status", status)} selected={draft.status === status} style={styles.filterChip}>{status === "TODAS" ? "Todas" : status}</Chip>)}</View>
            <Text style={[styles.filterLabel, { color: palette.accentMuted }]} variant="labelLarge">Estado de auditoría</Text>
            <View style={styles.chipRow}>{REVIEW_OPTIONS.map(([status, label]) => <Chip key={status} onPress={() => update("reviewStatus", status)} selected={draft.reviewStatus === status} style={styles.filterChip}>{label}</Chip>)}</View>
            <TextInput autoCapitalize="none" label="Desde (YYYY-MM-DD)" mode="outlined" onChangeText={(value) => update("dateFrom", value)} style={styles.input} value={draft.dateFrom} />
            <TextInput autoCapitalize="none" label="Hasta (YYYY-MM-DD)" mode="outlined" onChangeText={(value) => update("dateTo", value)} style={styles.input} value={draft.dateTo} />
            <Button icon="alert-outline" mode={draft.investigationScope === "INTENTOS_FRAUDE" ? "contained" : "outlined"} onPress={() => update("investigationScope", "INTENTOS_FRAUDE")} style={styles.filterButton}>Ver intentos registrados</Button>
            <Button mode="contained" onPress={() => { onApply(draft); onClose(); }} style={styles.applyButton}>Aplicar filtros</Button>
          </ScrollView>
        </BlurTargetView>
        <AppHeader backHref="/(normal)/Main" backgroundColor={MENU_PRINCIPAL_HEADER_COLOR} blurTarget={blurTargetRef} floating onBack={onClose} portal={false} showBackButton title="Filtrar investigaciones" />
      </Surface>
    </Modal>
  );
};

const RankingPanel = ({ users = [] }) => users.length ? (
  <RankingPanelContent users={users} />
) : null;

const RankingPanelContent = ({ users }) => {
  const theme = useTheme();
  const palette = getAntifraudPalette(theme.dark);
  return <Surface elevation={1} style={[styles.ranking, { backgroundColor: palette.elevatedSurface, borderColor: palette.border }]}>
    <Text style={[styles.cardTitle, { color: palette.text }]} variant="titleMedium">Usuarios con mayor exposición</Text>
    <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Priorizado por señales antifraude y volumen.</Text>
    {users.slice(0, 5).map((row, index) => <View key={row._id || index} style={[styles.rankingRow, { borderBottomColor: palette.divider }]}><Text numberOfLines={1} style={[styles.rankingName, { color: palette.text }]} variant="bodyMedium">{index + 1}. {row.user?.name || row._id || "Usuario sin identificar"}</Text><Chip compact style={row.fraudFlagged ? [styles.riskChip, { backgroundColor: palette.risk }] : [styles.safeChip, { backgroundColor: palette.safe }]}>{row.fraudFlagged || 0} señales</Chip><Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">{row.total || 0}</Text></View>)}
  </Surface>
};

const EvidenceCard = ({ item, onPress }) => {
  const theme = useTheme();
  const palette = getAntifraudPalette(theme.dark);
  const risky = getRisk(item);
  return <Card mode="contained" onPress={() => onPress(item._id)} style={[styles.evidenceCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
    <Card.Content>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: palette.text }]} variant="titleMedium">Evidencia #{String(item._id || "").slice(-8).toUpperCase()}</Text>
          <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">{item.user?.name || item.userId || "Usuario sin identificar"}</Text>
        </View>
        <Chip compact textStyle={{ color: getStatusColor(item.status, palette) }} style={[styles.statusChip, { backgroundColor: palette.input }]}>{item.status || "PENDIENTE"}</Chip>
      </View>
      <View style={styles.chipRow}>
        <Chip compact icon={risky ? "alert-circle-outline" : "check-circle-outline"} style={risky ? [styles.riskChip, { backgroundColor: palette.risk }] : [styles.safeChip, { backgroundColor: palette.safe }]}>{risky ? "Señal de riesgo" : "Sin señales"}</Chip>
        <Chip compact icon="brain">{item.analisisIA?.decision || "IA pendiente"}</Chip>
      </View>
      <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">{formatDate(item.createdAt)}{item.ventaId ? ` · Venta ${String(item.ventaId).slice(-8)}` : ""}</Text>
      {item.analisisIA?.summary ? <Text numberOfLines={2} style={[styles.summary, { color: palette.muted }]} variant="bodyMedium">{item.analisisIA.summary}</Text> : null}
      <Button compact mode="text" onPress={() => onPress(item._id)} style={styles.openButton}>Abrir investigación</Button>
    </Card.Content>
  </Card>;
};

const DetailModal = ({ detail, onClose, onSaveAudit }) => {
  const theme = useTheme();
  const palette = getAntifraudPalette(theme.dark);
  const headerInset = useAppHeaderContentInset();
  const blurTargetRef = React.useRef(null);
  const [estadoRevision, setEstadoRevision] = useState("PENDIENTE_REVISION");
  const [conclusionFraude, setConclusionFraude] = useState("");
  const [notasRevision, setNotasRevision] = useState("");
  const [auditMenuVisible, setAuditMenuVisible] = useState(false);
  const [auditSaving, setAuditSaving] = useState(false);
  const [auditSaved, setAuditSaved] = useState(false);

  useEffect(() => {
    const evidence = detail?.evidence;
    if (!evidence) return;
    setEstadoRevision(evidence.estadoRevision || (evidence.revisado ? "ANALIZADO_LIMPIO" : "PENDIENTE_REVISION"));
    setConclusionFraude(evidence.conclusionFraude || "");
    setNotasRevision(evidence.notasRevision || "");
    setAuditSaved(false);
  }, [detail]);

  const saveAudit = async () => {
    if (!detail?.evidence?._id || !onSaveAudit) return;
    setAuditSaving(true);
    setAuditSaved(false);
    try {
      await onSaveAudit({ evidenceId: detail.evidence._id, estadoRevision, conclusionFraude: conclusionFraude || null, notasRevision });
      setAuditSaved(true);
    } finally {
      setAuditSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={Boolean(detail)}>
      <Surface style={[styles.modalSurface, { backgroundColor: palette.background }]}>
        <BlurTargetView ref={blurTargetRef} style={styles.modalTarget}>
          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingTop: headerInset + 18 }]}
          >
          {detail?.image?.imageUrl ? <Image accessibilityLabel="Evidencia de pago" source={{ uri: detail.image.imageUrl }} style={[styles.evidenceImage, { backgroundColor: palette.imagePlaceholder }]} /> : <Text style={[styles.muted, { color: palette.muted }]}>La imagen no está disponible.</Text>}
          {detail?.evidence ? <>
            <Text style={[styles.cardTitle, { color: palette.text }]} variant="titleLarge">Evidencia #{String(detail.evidence._id).slice(-8).toUpperCase()}</Text>
            <Text style={[styles.muted, { color: palette.muted }]} variant="bodyMedium">{detail.evidence.user?.name || detail.evidence.userId} · {formatDate(detail.evidence.createdAt)}</Text>
            {detail.evidence.revisadoPor ? <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Revisada por {detail.evidence.revisadoPor} · {formatDate(detail.evidence.fechaRevisado)}</Text> : null}
            <View style={styles.chipRow}><Chip compact>{detail.evidence.status}</Chip><Chip compact>{detail.evidence.ventaId || "Sin venta"}</Chip></View>
            {detail.evidence.analisisIA ? <View style={styles.detailSection}><Divider /><Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">Análisis IA</Text><Text style={[styles.muted, { color: palette.muted }]} variant="bodyMedium">{detail.evidence.analisisIA.summary || "Sin resumen disponible."}</Text><View style={styles.chipRow}>{(detail.evidence.analisisIA.fraudSignals || []).map((signal) => <Chip compact key={signal} style={[styles.riskChip, { backgroundColor: palette.risk }]}>{signal}</Chip>)}</View></View> : null}
            {detail.relatedEvidence?.length ? <View style={styles.detailSection}><Divider /><Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">Comparación visual</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.comparisonScroll}><View style={styles.comparisonItem}><Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">Bajo análisis</Text><Image accessibilityLabel="Evidencia bajo análisis" source={{ uri: detail.image?.imageUrl }} style={[styles.comparisonImage, { backgroundColor: palette.imagePlaceholder }]} /></View>{detail.relatedEvidence.map((related, index) => <View key={related._id} style={styles.comparisonItem}><Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">Relacionada {index + 1}</Text>{related.image?.imageUrl ? <Image accessibilityLabel="Evidencia relacionada" source={{ uri: related.image.imageUrl }} style={[styles.comparisonImage, { backgroundColor: palette.imagePlaceholder }]} /> : <Text style={[styles.muted, { color: palette.muted }]}>Imagen no disponible.</Text>}</View>)}</ScrollView></View> : null}
            <View style={styles.detailSection}><Divider /><Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">Auditoría relacionada</Text>{detail.fraudAttempts?.length ? detail.fraudAttempts.map((attempt) => <View key={attempt._id} style={styles.attempt}><Chip compact style={[styles.riskChip, { backgroundColor: palette.risk }]}>{attempt.tipo || "Señal antifraude"}</Chip><Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">{attempt.reason || attempt.motivo || "Referencia relacionada detectada."} · {formatDate(attempt.createdAt)}</Text></View>) : <Text style={[styles.muted, { color: palette.muted }]}>No hay intentos relacionados registrados.</Text>}</View>
            <View style={[styles.auditForm, { backgroundColor: palette.elevatedSurface, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">Dictamen de auditoría</Text>
              <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Registra el análisis oficial para dejar trazabilidad y marcar la evidencia como revisada.</Text>
              <Menu
                anchor={<Button compact mode="outlined" icon="chevron-down" onPress={() => setAuditMenuVisible(true)}>{AUDIT_OPTIONS.find(([value]) => value === estadoRevision)?.[1] || "Seleccionar veredicto"}</Button>}
                onDismiss={() => setAuditMenuVisible(false)}
                visible={auditMenuVisible}
              >
                {AUDIT_OPTIONS.map(([value, label]) => <Menu.Item key={value} onPress={() => { setEstadoRevision(value); setAuditMenuVisible(false); }} title={label} />)}
              </Menu>
              <TextInput label="Categoría de conclusión" mode="outlined" onChangeText={setConclusionFraude} placeholder="Ej: REUTILIZACION_REFERENCIA" value={conclusionFraude} />
              <TextInput label="Notas de auditoría y hallazgos" mode="outlined" multiline numberOfLines={4} onChangeText={setNotasRevision} placeholder="Documenta por qué se clasifica como fraude o legítimo." value={notasRevision} />
              {auditSaved ? <Text style={[styles.auditSuccess, { color: palette.safeText }]} variant="bodySmall">Dictamen guardado exitosamente.</Text> : null}
              <Button disabled={auditSaving} icon={auditSaving ? "loading" : "content-save-outline"} mode="contained" onPress={saveAudit}>{auditSaving ? "Guardando dictamen…" : "Guardar dictamen"}</Button>
            </View>
          </> : null}
          </ScrollView>
        </BlurTargetView>
        <AppHeader backHref="/(normal)/Main" backgroundColor={MENU_PRINCIPAL_HEADER_COLOR} blurTarget={blurTargetRef} floating onBack={onClose} portal={false} showBackButton title="Investigación" />
      </Surface>
    </Modal>
  );
};

export default function AntifraudCenterNative() {
  const theme = useTheme();
  const palette = getAntifraudPalette(theme.dark);
  const headerInset = useAppHeaderContentInset();
  const user = Meteor.useTracker(() => Meteor.user(), []);
  const allowed = String(user?.username || "").toLowerCase() === PRINCIPAL_USERNAME;
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState({ items: [], summary: {}, total: 0, hasNext: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const mainBlurTargetRef = React.useRef(null);

  const load = useCallback(async (nextFilters) => {
    setLoading(true); setError("");
    try { setData(await callMethod("evidenciasAdmin.listarCentroAntifraude", nextFilters)); } catch (requestError) { setError(requestError?.reason || requestError?.message || "No se pudo cargar el centro antifraude."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (allowed) load(INITIAL_FILTERS); }, [allowed, load]);
  const openDetail = useCallback(async (evidenceId) => {
    setDetailLoading(true); setError("");
    try { setDetail(await callMethod("evidenciasAdmin.obtenerDetalleAntifraude", evidenceId)); } catch (requestError) { setError(requestError?.reason || requestError?.message || "No se pudo abrir la investigación."); } finally { setDetailLoading(false); }
  }, []);
  const saveAudit = useCallback(async (auditPayload) => {
    await callMethod("evidenciasAdmin.marcarEvidenciaAnalizada", auditPayload);
    await load(filters);
  }, [filters, load]);
  const changePage = (page) => { const next = { ...filters, page }; setFilters(next); load(next); };
  const summary = data?.summary || {};

  if (!allowed) return <Surface style={[styles.surface, { backgroundColor: palette.background }]}><Text style={[styles.denied, { color: palette.riskText }]} variant="titleMedium">Esta sección está reservada al Administrador Principal.</Text></Surface>;
  return (
    <Surface style={[styles.surface, { backgroundColor: palette.background }]}>
      <BlurTargetView ref={mainBlurTargetRef} style={styles.mainBlurTarget}>
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContent, { paddingTop: headerInset + 16 }]}
          renderItem={({ item }) => <EvidenceCard item={item} onPress={openDetail} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={<View><Surface elevation={2} style={[styles.hero, { backgroundColor: palette.hero }]}><Text style={[styles.eyebrow, { color: palette.accent }]} variant="labelSmall">Investigación antifraude</Text><Text style={[styles.heroTitle, { color: palette.textOnHero }]} variant="headlineSmall">Todas las evidencias, en un solo lugar</Text><Text style={[styles.heroCopy, { color: palette.heroMuted }]} variant="bodyMedium">Revisa riesgo, decisiones IA y auditoría sin descargar imágenes masivamente.</Text><View style={styles.statsRow}><Stat label="Total" value={summary.total || 0} /><Stat label="Pendientes" value={summary.pending || 0} /><Stat label="Riesgo" value={summary.fraudFlagged || 0} /></View></Surface><RankingPanel users={summary.users} />{error ? <Text style={[styles.error, { color: palette.riskText }]} variant="bodySmall">{error}</Text> : null}{loading ? <View style={styles.loading}><ActivityIndicator color={palette.accent} size="large" /><Text style={[styles.muted, { color: palette.muted }]}>Cargando investigaciones…</Text></View> : null}</View>}
          ListEmptyComponent={!loading ? <Surface style={[styles.empty, { backgroundColor: palette.elevatedSurface, borderColor: palette.border }]}><MaterialCommunityIcons color={palette.accent} name="shield-alert-outline" size={42} /><Text style={[styles.cardTitle, { color: palette.text }]} variant="titleMedium">No hay evidencias para estos filtros</Text><Text style={[styles.muted, { color: palette.muted }]}>Abre el filtro para cambiar el criterio de búsqueda.</Text></Surface> : null}
          ListFooterComponent={<View style={styles.pagination}><Button disabled={loading || filters.page <= 1} onPress={() => changePage(filters.page - 1)}>Anterior</Button><Text style={styles.muted}>Página {filters.page}</Text><Button disabled={loading || !data?.hasNext} onPress={() => changePage(filters.page + 1)}>Siguiente</Button></View>}
          showsVerticalScrollIndicator={false}
        />
      </BlurTargetView>
      <AppHeader actions={<Appbar.Action accessibilityLabel="Filtrar" iconColor="#fff" icon="filter-variant" onPress={() => setFilterVisible(true)} />} backHref="/(normal)/Main" backgroundColor={MENU_PRINCIPAL_HEADER_COLOR} blurTarget={mainBlurTargetRef} floating portal={false} showBackButton title="Centro antifraude" />
      <FilterModal filters={filters} onApply={(next) => { setFilters(next); load(next); }} onClose={() => setFilterVisible(false)} visible={filterVisible} />
      {detailLoading ? <View style={[styles.detailLoading, { backgroundColor: palette.overlay }]}><ActivityIndicator color={palette.accent} size="large" /></View> : null}
      <DetailModal detail={detail} onClose={() => setDetail(null)} onSaveAudit={saveAudit} />
    </Surface>
  );
}

const Stat = ({ label, value }) => { const palette = getAntifraudPalette(useTheme().dark); return <View style={[styles.stat, { backgroundColor: palette.elevatedSurface, borderColor: palette.border }]}><Text style={[styles.statLabel, { color: palette.accentMuted }]} variant="labelSmall">{label}</Text><Text style={[styles.statValue, { color: palette.text }]} variant="headlineSmall">{value}</Text></View>; };

const styles = StyleSheet.create({
  surface: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 36 },
  hero: { borderRadius: 24, marginBottom: 14, padding: 18 },
  eyebrow: { fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  heroTitle: { fontWeight: "900", marginTop: 6 },
  heroCopy: { lineHeight: 21, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  ranking: { borderRadius: 20, marginBottom: 14, padding: 16 },
  rankingRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingVertical: 10 },
  rankingName: { flex: 1 },
  stat: { borderRadius: 16, borderWidth: 1, flex: 1, padding: 12 },
  statLabel: { fontWeight: "700" },
  statValue: { fontWeight: "900", marginTop: 4 },
  evidenceCard: { borderRadius: 20, borderWidth: 1 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  cardCopy: { flex: 1, marginRight: 8 },
  cardTitle: { fontWeight: "800" },
  muted: { marginTop: 4 },
  statusChip: {},
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  riskChip: {},
  safeChip: {},
  summary: { lineHeight: 20, marginTop: 10 },
  openButton: { alignSelf: "flex-end", marginTop: 4 },
  separator: { height: 12 },
  empty: { alignItems: "center", borderRadius: 20, padding: 28 },
  pagination: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 16 },
  loading: { alignItems: "center", gap: 8, paddingVertical: 22 },
  detailLoading: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0, zIndex: 4 },
  error: { marginBottom: 12 },
  denied: { padding: 24, textAlign: "center" },
  modalSurface: { flex: 1 },
  modalTarget: { flex: 1 },
  mainBlurTarget: { flex: 1 },
  modalContent: { padding: 18, paddingBottom: 36 },
  input: { marginBottom: 14 },
  filterLabel: { marginBottom: 8, marginTop: 4 },
  filterChip: { marginBottom: 8 },
  filterButton: { marginTop: 14 },
  applyButton: { marginTop: 18 },
  evidenceImage: { borderRadius: 18, height: 260, marginBottom: 18, width: "100%" },
  comparisonScroll: { marginTop: 10 },
  comparisonItem: { marginRight: 12, width: 220 },
  comparisonImage: { borderRadius: 14, height: 180, marginTop: 5, width: 220 },
  detailSection: { marginTop: 18 },
  sectionTitle: { fontWeight: "800", marginTop: 14 },
  attempt: { marginTop: 10 },
  auditForm: { borderRadius: 18, borderWidth: 1, gap: 12, marginTop: 22, padding: 16 },
  auditSuccess: { fontWeight: "700" },
});
