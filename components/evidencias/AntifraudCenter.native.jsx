import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Modal, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Button, Card, Chip, Divider, Surface, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useSafeBack from "../navigation/useSafeBack";

const Meteor = /** @type {typeof MeteorBase} */ (MeteorBase);
const PRINCIPAL_USERNAME = "carlosmbinf";
const INITIAL_FILTERS = { dateFrom: "", dateTo: "", fraudOnly: false, investigationScope: "INVESTIGABLE", page: 1, pageSize: 15, search: "", status: "TODAS" };

const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

const formatDate = (value) => value ? new Date(value).toLocaleString("es-ES", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit", year: "numeric" }) : "Sin fecha";
const getStatusColor = (status) => status === "APROBADA" ? "#86efac" : status === "RECHAZADA" ? "#fca5a5" : "#fde68a";
const getRisk = (item) => item?.investigationReasons?.length > 0 || item?.fraudAttemptCount > 0 || item?.analisisIA?.decision === "INVALIDA";

const FilterModal = ({ filters, onApply, onClose, visible }) => {
  const [draft, setDraft] = useState(filters);
  useEffect(() => { if (visible) setDraft(filters); }, [filters, visible]);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value, page: 1 }));
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <Surface style={styles.modalSurface}>
        <Appbar.Header style={styles.appbar}><Appbar.BackAction color="#fff" onPress={onClose} /><Appbar.Content color="#fff" title="Filtrar investigaciones" /></Appbar.Header>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <TextInput label="Buscar ID, venta, referencia o usuario" mode="outlined" onChangeText={(value) => update("search", value)} style={styles.input} value={draft.search} />
          <Text style={styles.filterLabel} variant="labelLarge">Alcance de investigación</Text>
          <View style={styles.chipRow}>{[["INVESTIGABLE", "Casos investigables"], ["INTENTOS_FRAUDE", "Intentos registrados"], ["RECHAZADAS", "Rechazadas"], ["SOSPECHOSAS", "Sospechosas"], ["TODAS", "Todas las evidencias"]].map(([scope, label]) => <Chip key={scope} onPress={() => update("investigationScope", scope)} selected={draft.investigationScope === scope} style={styles.filterChip}>{label}</Chip>)}</View>
          <Text style={styles.filterLabel} variant="labelLarge">Estado de evidencia</Text>
          <View style={styles.chipRow}>{["TODAS", "PENDIENTE", "APROBADA", "RECHAZADA"].map((status) => <Chip key={status} onPress={() => update("status", status)} selected={draft.status === status} style={styles.filterChip}>{status === "TODAS" ? "Todas" : status}</Chip>)}</View>
          <TextInput autoCapitalize="none" label="Desde (YYYY-MM-DD)" mode="outlined" onChangeText={(value) => update("dateFrom", value)} style={styles.input} value={draft.dateFrom} />
          <TextInput autoCapitalize="none" label="Hasta (YYYY-MM-DD)" mode="outlined" onChangeText={(value) => update("dateTo", value)} style={styles.input} value={draft.dateTo} />
          <Button icon="alert-outline" mode={draft.investigationScope === "INTENTOS_FRAUDE" ? "contained" : "outlined"} onPress={() => update("investigationScope", "INTENTOS_FRAUDE")} style={styles.filterButton}>Ver intentos registrados</Button>
          <Button mode="contained" onPress={() => { onApply(draft); onClose(); }} style={styles.applyButton}>Aplicar filtros</Button>
        </ScrollView>
      </Surface>
    </Modal>
  );
};

const RankingPanel = ({ users = [] }) => users.length ? (
  <Surface elevation={1} style={styles.ranking}>
    <Text style={styles.cardTitle} variant="titleMedium">Usuarios con mayor exposición</Text>
    <Text style={styles.muted} variant="bodySmall">Priorizado por señales antifraude y volumen.</Text>
    {users.slice(0, 5).map((row, index) => <View key={row._id || index} style={styles.rankingRow}><Text numberOfLines={1} style={styles.rankingName} variant="bodyMedium">{index + 1}. {row.user?.name || row._id || "Usuario sin identificar"}</Text><Chip compact style={row.fraudFlagged ? styles.riskChip : styles.safeChip}>{row.fraudFlagged || 0} señales</Chip><Text style={styles.muted} variant="bodySmall">{row.total || 0}</Text></View>)}
  </Surface>
) : null;

const EvidenceCard = ({ item, onPress }) => (
  <Card mode="contained" onPress={() => onPress(item._id)} style={styles.evidenceCard}>
    <Card.Content>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} variant="titleMedium">Evidencia #{String(item._id || "").slice(-8).toUpperCase()}</Text>
          <Text style={styles.muted} variant="bodySmall">{item.user?.name || item.userId || "Usuario sin identificar"}</Text>
        </View>
        <Chip compact textStyle={{ color: getStatusColor(item.status) }} style={styles.statusChip}>{item.status || "PENDIENTE"}</Chip>
      </View>
      <View style={styles.chipRow}>
        <Chip compact icon={getRisk(item) ? "alert-circle-outline" : "check-circle-outline"} style={getRisk(item) ? styles.riskChip : styles.safeChip}>{getRisk(item) ? "Señal de riesgo" : "Sin señales"}</Chip>
        <Chip compact icon="brain">{item.analisisIA?.decision || "IA pendiente"}</Chip>
      </View>
      <Text style={styles.muted} variant="bodySmall">{formatDate(item.createdAt)}{item.ventaId ? ` · Venta ${String(item.ventaId).slice(-8)}` : ""}</Text>
      {item.analisisIA?.summary ? <Text numberOfLines={2} style={styles.summary} variant="bodyMedium">{item.analisisIA.summary}</Text> : null}
      <Button compact mode="text" onPress={() => onPress(item._id)} style={styles.openButton}>Abrir investigación</Button>
    </Card.Content>
  </Card>
);

const DetailModal = ({ detail, onClose }) => (
  <Modal animationType="slide" onRequestClose={onClose} visible={Boolean(detail)}>
    <Surface style={styles.modalSurface}>
      <Appbar.Header style={styles.appbar}><Appbar.BackAction color="#fff" onPress={onClose} /><Appbar.Content color="#fff" title="Investigación" /></Appbar.Header>
      <ScrollView contentContainerStyle={styles.modalContent}>
        {detail?.image?.imageUrl ? <Image accessibilityLabel="Evidencia de pago" source={{ uri: detail.image.imageUrl }} style={styles.evidenceImage} /> : <Text style={styles.muted}>La imagen no está disponible.</Text>}
        {detail?.evidence ? <>
          <Text style={styles.cardTitle} variant="titleLarge">Evidencia #{String(detail.evidence._id).slice(-8).toUpperCase()}</Text>
          <Text style={styles.muted} variant="bodyMedium">{detail.evidence.user?.name || detail.evidence.userId} · {formatDate(detail.evidence.createdAt)}</Text>
          <View style={styles.chipRow}><Chip compact>{detail.evidence.status}</Chip><Chip compact>{detail.evidence.ventaId || "Sin venta"}</Chip></View>
          {detail.evidence.analisisIA ? <View style={styles.detailSection}><Divider /><Text style={styles.sectionTitle} variant="titleMedium">Análisis IA</Text><Text style={styles.muted} variant="bodyMedium">{detail.evidence.analisisIA.summary || "Sin resumen disponible."}</Text><View style={styles.chipRow}>{(detail.evidence.analisisIA.fraudSignals || []).map((signal) => <Chip compact key={signal} style={styles.riskChip}>{signal}</Chip>)}</View></View> : null}
          {detail.relatedEvidence?.length ? <View style={styles.detailSection}><Divider /><Text style={styles.sectionTitle} variant="titleMedium">Comparación visual</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.comparisonScroll}><View style={styles.comparisonItem}><Text style={styles.muted} variant="labelSmall">Bajo análisis</Text><Image accessibilityLabel="Evidencia bajo análisis" source={{ uri: detail.image?.imageUrl }} style={styles.comparisonImage} /></View>{detail.relatedEvidence.map((related, index) => <View key={related._id} style={styles.comparisonItem}><Text style={styles.muted} variant="labelSmall">Relacionada {index + 1}</Text>{related.image?.imageUrl ? <Image accessibilityLabel="Evidencia relacionada" source={{ uri: related.image.imageUrl }} style={styles.comparisonImage} /> : <Text style={styles.muted}>Imagen no disponible.</Text>}</View>)}</ScrollView></View> : null}
          <View style={styles.detailSection}><Divider /><Text style={styles.sectionTitle} variant="titleMedium">Auditoría relacionada</Text>{detail.fraudAttempts?.length ? detail.fraudAttempts.map((attempt) => <View key={attempt._id} style={styles.attempt}><Chip compact style={styles.riskChip}>{attempt.tipo || "Señal antifraude"}</Chip><Text style={styles.muted} variant="bodySmall">{attempt.reason || attempt.motivo || "Referencia relacionada detectada."} · {formatDate(attempt.createdAt)}</Text></View>) : <Text style={styles.muted}>No hay intentos relacionados registrados.</Text>}</View>
        </> : null}
      </ScrollView>
    </Surface>
  </Modal>
);

export default function AntifraudCenterNative() {
  const insets = useSafeAreaInsets();
  const safeBack = useSafeBack("/(normal)/Main");
  const user = Meteor.useTracker(() => Meteor.user(), []);
  const allowed = String(user?.username || "").toLowerCase() === PRINCIPAL_USERNAME;
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState({ items: [], summary: {}, total: 0, hasNext: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (nextFilters) => {
    setLoading(true); setError("");
    try { setData(await callMethod("evidenciasAdmin.listarCentroAntifraude", nextFilters)); } catch (requestError) { setError(requestError?.reason || requestError?.message || "No se pudo cargar el centro antifraude."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (allowed) load(INITIAL_FILTERS); }, [allowed, load]);
  const openDetail = useCallback(async (evidenceId) => {
    setDetailLoading(true); setError("");
    try { setDetail(await callMethod("evidenciasAdmin.obtenerDetalleAntifraude", evidenceId)); } catch (requestError) { setError(requestError?.reason || requestError?.message || "No se pudo abrir la investigación."); } finally { setDetailLoading(false); }
  }, []);
  const changePage = (page) => { const next = { ...filters, page }; setFilters(next); load(next); };
  const summary = data?.summary || {};

  if (!allowed) return <Surface style={styles.surface}><Text style={styles.denied} variant="titleMedium">Esta sección está reservada al Administrador Principal.</Text></Surface>;
  return (
    <Surface style={styles.surface}>
      <Appbar.Header style={[styles.appbar, { paddingTop: insets.top, height: insets.top + 56 }]}><Appbar.BackAction color="#fff" onPress={safeBack} /><Appbar.Content color="#fff" title="Centro antifraude" /><Appbar.Action accessibilityLabel="Filtrar" color="#fff" icon="filter-variant" onPress={() => setFilterVisible(true)} /></Appbar.Header>
      <FlatList
        data={data?.items || []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <EvidenceCard item={item} onPress={openDetail} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<View><Surface elevation={2} style={styles.hero}><Text style={styles.eyebrow} variant="labelSmall">Investigación antifraude</Text><Text style={styles.heroTitle} variant="headlineSmall">Todas las evidencias, en un solo lugar</Text><Text style={styles.heroCopy} variant="bodyMedium">Revisa riesgo, decisiones IA y auditoría sin descargar imágenes masivamente.</Text><View style={styles.statsRow}><Stat label="Total" value={summary.total || 0} /><Stat label="Pendientes" value={summary.pending || 0} /><Stat label="Riesgo" value={summary.fraudFlagged || 0} /></View></Surface><RankingPanel users={summary.users} />{error ? <Text style={styles.error} variant="bodySmall">{error}</Text> : null}{loading ? <View style={styles.loading}><ActivityIndicator color="#93c5fd" size="large" /><Text style={styles.muted}>Cargando investigaciones…</Text></View> : null}</View>}
        ListEmptyComponent={!loading ? <Surface style={styles.empty}><MaterialCommunityIcons color="#93c5fd" name="shield-alert-outline" size={42} /><Text style={styles.cardTitle} variant="titleMedium">No hay evidencias para estos filtros</Text><Text style={styles.muted}>Abre el filtro para cambiar el criterio de búsqueda.</Text></Surface> : null}
        ListFooterComponent={<View style={styles.pagination}><Button disabled={loading || filters.page <= 1} onPress={() => changePage(filters.page - 1)}>Anterior</Button><Text style={styles.muted}>Página {filters.page}</Text><Button disabled={loading || !data?.hasNext} onPress={() => changePage(filters.page + 1)}>Siguiente</Button></View>}
        showsVerticalScrollIndicator={false}
      />
      <FilterModal filters={filters} onApply={(next) => { setFilters(next); load(next); }} onClose={() => setFilterVisible(false)} visible={filterVisible} />
      {detailLoading ? <View style={styles.detailLoading}><ActivityIndicator color="#fff" size="large" /></View> : null}
      <DetailModal detail={detail} onClose={() => setDetail(null)} />
    </Surface>
  );
}

const Stat = ({ label, value }) => <View style={styles.stat}><Text style={styles.statLabel} variant="labelSmall">{label}</Text><Text style={styles.statValue} variant="headlineSmall">{value}</Text></View>;

const styles = StyleSheet.create({
  surface: { backgroundColor: "#0f172a", flex: 1 },
  appbar: { backgroundColor: "#1e3a8a" },
  listContent: { padding: 16, paddingBottom: 36 },
  hero: { backgroundColor: "#111c44", borderRadius: 24, marginBottom: 14, padding: 18 },
  eyebrow: { color: "#93c5fd", fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  heroTitle: { color: "#fff", fontWeight: "900", marginTop: 6 },
  heroCopy: { color: "rgba(255,255,255,.78)", lineHeight: 21, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  ranking: { backgroundColor: "rgba(15,23,42,.72)", borderRadius: 20, marginBottom: 14, padding: 16 },
  rankingRow: { alignItems: "center", borderBottomColor: "rgba(148,163,184,.12)", borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingVertical: 10 },
  rankingName: { color: "#f8fafc", flex: 1 },
  stat: { backgroundColor: "rgba(15,23,42,.6)", borderColor: "rgba(148,163,184,.14)", borderRadius: 16, borderWidth: 1, flex: 1, padding: 12 },
  statLabel: { color: "#bfdbfe", fontWeight: "700" },
  statValue: { color: "#fff", fontWeight: "900", marginTop: 4 },
  evidenceCard: { backgroundColor: "rgba(15,23,42,.85)", borderColor: "rgba(148,163,184,.14)", borderRadius: 20, borderWidth: 1 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  cardCopy: { flex: 1, marginRight: 8 },
  cardTitle: { color: "#f8fafc", fontWeight: "800" },
  muted: { color: "rgba(226,232,240,.68)", marginTop: 4 },
  statusChip: { backgroundColor: "rgba(255,255,255,.06)" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  riskChip: { backgroundColor: "rgba(248,113,113,.14)" },
  safeChip: { backgroundColor: "rgba(74,222,128,.12)" },
  summary: { color: "rgba(226,232,240,.78)", lineHeight: 20, marginTop: 10 },
  openButton: { alignSelf: "flex-end", marginTop: 4 },
  separator: { height: 12 },
  empty: { alignItems: "center", backgroundColor: "rgba(15,23,42,.72)", borderRadius: 20, padding: 28 },
  pagination: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 16 },
  loading: { alignItems: "center", gap: 8, paddingVertical: 22 },
  detailLoading: { alignItems: "center", backgroundColor: "rgba(2,6,23,.75)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0, zIndex: 4 },
  error: { color: "#fecaca", marginBottom: 12 },
  denied: { color: "#fecaca", padding: 24, textAlign: "center" },
  modalSurface: { backgroundColor: "#0f172a", flex: 1 },
  modalContent: { padding: 18, paddingBottom: 36 },
  input: { marginBottom: 14 },
  filterLabel: { color: "#bfdbfe", marginBottom: 8, marginTop: 4 },
  filterChip: { marginBottom: 8 },
  filterButton: { marginTop: 14 },
  applyButton: { marginTop: 18 },
  evidenceImage: { backgroundColor: "#020617", borderRadius: 18, height: 260, marginBottom: 18, width: "100%" },
  comparisonScroll: { marginTop: 10 },
  comparisonItem: { marginRight: 12, width: 220 },
  comparisonImage: { backgroundColor: "#020617", borderRadius: 14, height: 180, marginTop: 5, width: 220 },
  detailSection: { marginTop: 18 },
  sectionTitle: { color: "#f8fafc", fontWeight: "800", marginTop: 14 },
  attempt: { marginTop: 10 },
});
