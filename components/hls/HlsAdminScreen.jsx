import React from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    IconButton,
    ProgressBar,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { getHlsServerUrl } from "../../services/meteor/client";
import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import {
    DEFAULT_HLS_REFRESH_INTERVAL_MS,
    formatBytes,
    formatRuntimeDate,
    formatRuntimeDuration,
    getHlsStatusMeta,
    normalizeHlsRuntimeSnapshot,
} from "./hlsRuntimeUtils";

const buildPalette = (theme) => ({
  screen: theme.dark ? "#020617" : "#eef3fb",
  hero: "#0f172a",
  surface: theme.dark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.94)",
  nestedSurface: theme.dark ? "rgba(30, 41, 59, 0.72)" : "rgba(241, 245, 249, 0.92)",
  border: theme.dark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.1)",
  title: theme.dark ? "#f8fafc" : "#0f172a",
  copy: theme.dark ? "#cbd5e1" : "#475569",
  muted: theme.dark ? "#94a3b8" : "#64748b",
  accent: "#38bdf8",
  green: "#22c55e",
  red: "#ef4444",
  chip: theme.dark ? "rgba(56, 189, 248, 0.14)" : "rgba(14, 165, 233, 0.1)",
});

const HlsAdminScreen = () => {
  const theme = useTheme();
  const palette = React.useMemo(() => buildPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const baseUrl = getHlsServerUrl();
  const columns = width >= 1040 ? 2 : 1;

  const [snapshot, setSnapshot] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchRuntime = React.useCallback(async () => {
    if (!baseUrl) {
      setError("No se encontro la URL del servicio HLS en la configuracion.");
      setLoading(false);
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/runtime`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("El servicio HLS no esta disponible en este momento.");
      }

      const payload = await response.json();
      setSnapshot(normalizeHlsRuntimeSnapshot(payload));
    } catch (runtimeError) {
      setError(runtimeError?.message || "El servicio HLS no esta disponible en este momento.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseUrl]);

  React.useEffect(() => {
    fetchRuntime();
    const intervalId = setInterval(fetchRuntime, DEFAULT_HLS_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchRuntime]);

  const hlsJobs = snapshot?.hlsJobs || [];
  const directStreams = snapshot?.directStreams || [];

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}> 
      <AppHeader title="Streaming HLS" subtitle="Runtime del servicio" showBackButton backHref="/(normal)/Main" backgroundColor={DEFAULT_HEADER_COLOR} overlapContent />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 18 }]} showsVerticalScrollIndicator={false}>
        <Surface style={styles.heroCard} elevation={0}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleBlock}>
              <Text variant="labelLarge" style={styles.heroEyebrow}>STREAMING VIDKAR</Text>
              <Text variant="headlineMedium" style={styles.heroTitle}>Panel operativo HLS</Text>
              <Text variant="bodyMedium" style={styles.heroCopy}>Supervisa conversiones FFmpeg, sesiones activas y streams directos desde la misma superficie administrativa.</Text>
            </View>
            <Button mode="contained" icon="refresh" loading={refreshing} disabled={refreshing} onPress={fetchRuntime} buttonColor="#38bdf8" textColor="#082f49">Actualizar</Button>
          </View>
          <View style={styles.heroMetaRow}>
            <Chip style={styles.heroChip} textStyle={styles.heroChipText} icon="server-network">{baseUrl || "Servidor HLS"}</Chip>
            <Chip style={styles.heroChip} textStyle={styles.heroChipText} icon="clock-outline">{snapshot?.capturedAt ? formatRuntimeDate(snapshot.capturedAt) : "Esperando datos"}</Chip>
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Conversiones" value={snapshot?.totals?.activeHlsJobs ?? 0} color="#38bdf8" />
            <StatCard label="Streams" value={snapshot?.totals?.activeDirectStreams ?? 0} color="#22c55e" />
            <StatCard label="FFmpeg" value={snapshot?.totals?.ffmpegProcesses ?? 0} color="#f59e0b" />
            <StatCard label="Sesiones" value={snapshot?.totals?.totalSessions ?? 0} color="#a78bfa" />
          </View>
        </Surface>

        {loading ? <StatusCard palette={palette} loading text="Conectando con el servicio HLS..." /> : null}
        {error ? <StatusCard palette={palette} error text={error} /> : null}

        <RuntimeSection count={hlsJobs.length} icon="movie-cog-outline" palette={palette} title="Conversiones HLS / FFmpeg">
          {hlsJobs.length ? (
            <View style={[styles.cardGrid, columns > 1 && styles.cardGridTwoColumns]}>
              {hlsJobs.map((job) => <View key={job.id} style={[styles.gridCell, columns > 1 && styles.gridCellHalf]}><HlsJobCard job={job} palette={palette} /></View>)}
            </View>
          ) : <EmptyBlock icon="movie-open-off-outline" palette={palette} text="No hay conversiones HLS activas." />}
        </RuntimeSection>

        <RuntimeSection count={directStreams.length} icon="access-point-network" palette={palette} title="Streams directos">
          {directStreams.length ? (
            <View style={[styles.cardGrid, columns > 1 && styles.cardGridTwoColumns]}>
              {directStreams.map((stream) => <View key={stream.id} style={[styles.gridCell, columns > 1 && styles.gridCellHalf]}><DirectStreamCard palette={palette} stream={stream} /></View>)}
            </View>
          ) : <EmptyBlock icon="broadcast-off" palette={palette} text="No hay streams directos activos." />}
        </RuntimeSection>
      </ScrollView>
    </View>
  );
};

const StatCard = ({ color, label, value }) => (
  <Surface style={styles.statCard} elevation={0}>
    <Text variant="labelMedium" style={styles.statLabel}>{label}</Text>
    <Text variant="headlineSmall" style={[styles.statValue, { color }]}>{value}</Text>
  </Surface>
);

const RuntimeSection = ({ children, count, icon, palette, title }) => (
  <View style={styles.sectionBlock}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: palette.chip }]}><IconButton icon={icon} size={20} iconColor={palette.accent} style={styles.sectionIconButton} /></View>
      <View style={styles.sectionTitleBlock}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.title }]}>{title}</Text>
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: palette.muted }]}>{count} activos ahora</Text>
      </View>
    </View>
    {children}
  </View>
);

const HlsJobCard = ({ job, palette }) => {
  const statusMeta = getHlsStatusMeta(job.status);
  return (
    <Surface style={[styles.runtimeCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardTitleBlock}><Text variant="titleMedium" numberOfLines={1} style={[styles.cardTitle, { color: palette.title }]}>{job.movieTitle}</Text><Text variant="bodySmall" numberOfLines={1} style={[styles.cardSubtitle, { color: palette.muted }]}>Sesion {job.sessionId}</Text></View>
        <Chip compact style={[styles.statusChip, { backgroundColor: `${statusMeta.color}22` }]} textStyle={[styles.statusChipText, { color: statusMeta.color }]}>{statusMeta.label}</Chip>
      </View>
      <View style={styles.progressBlock}><View style={styles.progressHeader}><Text variant="labelMedium" style={{ color: palette.copy }}>Progreso</Text><Text variant="labelLarge" style={{ color: palette.title }}>{Math.round(job.percent)}%</Text></View><ProgressBar progress={job.percent / 100} color={statusMeta.color} style={styles.progressBar} /></View>
      <View style={styles.metaGrid}><MetaItem label="PID" value={job.pid || "-"} palette={palette} /><MetaItem label="FPS" value={job.fps || "-"} palette={palette} /><MetaItem label="Velocidad" value={job.speed || "-"} palette={palette} /><MetaItem label="Segmentos" value={job.segments} palette={palette} /></View>
    </Surface>
  );
};

const DirectStreamCard = ({ palette, stream }) => (
  <Surface style={[styles.runtimeCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
    <View style={styles.cardHeaderRow}><View style={styles.cardTitleBlock}><Text variant="titleMedium" numberOfLines={1} style={[styles.cardTitle, { color: palette.title }]}>{stream.movieTitle}</Text><Text variant="bodySmall" numberOfLines={1} style={[styles.cardSubtitle, { color: palette.muted }]}>{stream.ip}</Text></View><Chip compact style={[styles.statusChip, { backgroundColor: "rgba(34, 197, 94, 0.14)" }]} textStyle={[styles.statusChipText, { color: palette.green }]}>Activo</Chip></View>
    <View style={styles.metaGrid}><MetaItem label="Rango" value={stream.range} palette={palette} /><MetaItem label="Transferido" value={formatBytes(stream.bytesSent)} palette={palette} /><MetaItem label="Inicio" value={formatRuntimeDate(stream.startedAt)} palette={palette} /><MetaItem label="Actividad" value={formatRuntimeDuration(stream.updatedAt || stream.startedAt)} palette={palette} /></View>
    <Text variant="bodySmall" numberOfLines={2} style={[styles.userAgent, { color: palette.muted }]}>{stream.userAgent}</Text>
  </Surface>
);

const MetaItem = ({ label, palette, value }) => <View style={[styles.metaItem, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}><Text variant="labelSmall" style={[styles.metaLabel, { color: palette.muted }]}>{label}</Text><Text variant="labelLarge" numberOfLines={1} style={[styles.metaValue, { color: palette.title }]}>{String(value ?? "-")}</Text></View>;

const EmptyBlock = ({ icon, palette, text }) => <Surface style={[styles.emptyBlock, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}><IconButton icon={icon} size={30} iconColor={palette.muted} /><Text variant="bodyMedium" style={[styles.emptyText, { color: palette.copy }]}>{text}</Text></Surface>;

const StatusCard = ({ error, loading, palette, text }) => <Surface style={[styles.statusCard, { backgroundColor: error ? "rgba(239, 68, 68, 0.12)" : palette.surface, borderColor: error ? "rgba(239, 68, 68, 0.26)" : palette.border }]} elevation={0}>{loading ? <ActivityIndicator color={palette.accent} /> : <IconButton icon="alert-circle-outline" iconColor={palette.red} size={28} />}<View style={styles.statusCopyBlock}><Text variant="bodyMedium" style={{ color: palette.copy }}>{text}</Text></View></Surface>;

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { gap: 18, paddingBottom: 32, paddingHorizontal: 16 }, heroCard: { backgroundColor: "#0f172a", borderColor: "rgba(148, 163, 184, 0.22)", borderRadius: 28, borderWidth: 1, overflow: "hidden", padding: 20 }, heroTopRow: { alignItems: "flex-start", flexDirection: "row", gap: 16, justifyContent: "space-between" }, heroTitleBlock: { flex: 1, gap: 8 }, heroEyebrow: { color: "#7dd3fc", fontWeight: "900", letterSpacing: 0 }, heroTitle: { color: "#ffffff", fontWeight: "900" }, heroCopy: { color: "rgba(226, 232, 240, 0.88)", lineHeight: 21, maxWidth: 720 }, heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 }, heroChip: { backgroundColor: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.14)", borderWidth: 1 }, heroChipText: { color: "#e0f2fe", fontWeight: "800" }, statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 }, statCard: { backgroundColor: "rgba(15, 23, 42, 0.76)", borderColor: "rgba(148, 163, 184, 0.18)", borderRadius: 18, borderWidth: 1, flex: 1, minWidth: 135, padding: 14 }, statLabel: { color: "#94a3b8", fontWeight: "800" }, statValue: { fontWeight: "900", marginTop: 6 }, statusCard: { alignItems: "center", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16 }, statusCopyBlock: { flex: 1, gap: 8 }, sectionBlock: { gap: 12 }, sectionHeader: { alignItems: "center", flexDirection: "row", gap: 10 }, sectionIcon: { borderRadius: 16, height: 44, overflow: "hidden", width: 44 }, sectionIconButton: { margin: 0 }, sectionTitleBlock: { flex: 1 }, sectionTitle: { fontWeight: "900" }, sectionSubtitle: { fontWeight: "700" }, cardGrid: { gap: 12 }, cardGridTwoColumns: { flexDirection: "row", flexWrap: "wrap" }, gridCell: { width: "100%" }, gridCellHalf: { width: "49%" }, runtimeCard: { borderRadius: 22, borderWidth: 1, gap: 14, padding: 14 }, cardHeaderRow: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" }, cardTitleBlock: { flex: 1, gap: 3 }, cardTitle: { fontWeight: "900" }, cardSubtitle: { fontWeight: "700" }, statusChip: { borderRadius: 999 }, statusChipText: { fontSize: 12, fontWeight: "900" }, progressBlock: { gap: 8 }, progressHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, progressBar: { borderRadius: 999, height: 8, overflow: "hidden" }, metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metaItem: { borderRadius: 14, borderWidth: 1, flexGrow: 1, minWidth: 112, paddingHorizontal: 10, paddingVertical: 9 }, metaLabel: { fontWeight: "800", textTransform: "uppercase" }, metaValue: { fontWeight: "900", marginTop: 3 }, userAgent: { lineHeight: 18 }, emptyBlock: { alignItems: "center", borderRadius: 22, borderWidth: 1, gap: 4, padding: 18 }, emptyText: { fontWeight: "700", textAlign: "center" },
});

export default HlsAdminScreen;
