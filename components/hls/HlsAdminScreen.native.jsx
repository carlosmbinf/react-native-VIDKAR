import MeteorBase from "@meteorrn/core";
import { useFocusEffect } from "expo-router";
import React from "react";
import {
    LayoutAnimation,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    UIManager,
    View,
    useWindowDimensions,
} from "react-native";
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

import { getHlsServerUrl } from "../../services/meteor/client.native";
import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import {
    DEFAULT_HLS_REFRESH_INTERVAL_MS,
    formatBytes,
    formatRuntimeDate,
    formatRuntimeDuration,
    getHlsStatusMeta,
    normalizeHlsRuntimeSnapshot,
} from "./hlsRuntimeUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const buildPalette = (theme) => {
  const isDark = theme.dark;

  return {
    screen: isDark ? "#020617" : "#eef3fb",
    hero: isDark ? "rgba(15, 23, 42, 0.92)" : "#0f172a",
    heroBorder: "rgba(148, 163, 184, 0.22)",
    surface: isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.94)",
    nestedSurface: isDark ? "rgba(30, 41, 59, 0.72)" : "rgba(241, 245, 249, 0.92)",
    border: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.1)",
    title: isDark ? "#f8fafc" : "#0f172a",
    copy: isDark ? "#cbd5e1" : "#475569",
    muted: isDark ? "#94a3b8" : "#64748b",
    accent: "#38bdf8",
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#ef4444",
    blue: "#60a5fa",
    chip: isDark ? "rgba(56, 189, 248, 0.14)" : "rgba(14, 165, 233, 0.1)",
    chipText: isDark ? "#bae6fd" : "#0369a1",
  };
};

const StatCard = ({ color, compact, label, value }) => (
  <Surface style={[styles.statCard, compact && styles.statCardCompact]} elevation={0}>
    <Text variant="labelMedium" style={styles.statLabel}>{label}</Text>
    <Text variant="headlineSmall" style={[styles.statValue, { color }]}>{value}</Text>
  </Surface>
);

const RuntimeHero = ({ baseUrl, compact, onRefresh, palette, refreshing, snapshot }) => (
  <Surface style={[styles.heroCard, { backgroundColor: palette.hero, borderColor: palette.heroBorder }]} elevation={0}>
    <View style={styles.heroTopRow}>
      <View style={styles.heroTitleBlock}>
        <Text variant="labelLarge" style={styles.heroEyebrow}>STREAMING VIDKAR</Text>
        <Text variant={compact ? "headlineSmall" : "headlineMedium"} style={styles.heroTitle}>
          Panel operativo HLS
        </Text>
        <Text variant="bodyMedium" style={styles.heroCopy}>
          Supervisa conversiones FFmpeg, sesiones activas y streams directos del servicio de peliculas.
        </Text>
      </View>
      <Button
        mode="contained"
        icon="refresh"
        loading={refreshing}
        disabled={refreshing}
        onPress={onRefresh}
        buttonColor="#38bdf8"
        textColor="#082f49"
        compact={compact}
      >
        Actualizar
      </Button>
    </View>

    <View style={styles.heroMetaRow}>
      <Chip style={styles.heroChip} textStyle={styles.heroChipText} icon="server-network">
        {baseUrl || "Servidor HLS"}
      </Chip>
      <Chip style={styles.heroChip} textStyle={styles.heroChipText} icon="clock-outline">
        {snapshot?.capturedAt ? `Actualizado ${formatRuntimeDate(snapshot.capturedAt)}` : "Esperando datos"}
      </Chip>
    </View>

    <View style={[styles.statsGrid, compact && styles.statsGridCompact]}>
      <StatCard compact={compact} color="#38bdf8" label="Conversiones" value={snapshot?.totals?.activeHlsJobs ?? 0} />
      <StatCard compact={compact} color="#22c55e" label="Streams directos" value={snapshot?.totals?.activeDirectStreams ?? 0} />
      <StatCard compact={compact} color="#f59e0b" label="FFmpeg" value={snapshot?.totals?.ffmpegProcesses ?? 0} />
      <StatCard compact={compact} color="#a78bfa" label="Sesiones" value={snapshot?.totals?.totalSessions ?? 0} />
    </View>
  </Surface>
);

const SectionHeader = ({ action, count, icon, palette, title }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: palette.chip }]}>
      <IconButton icon={icon} size={20} iconColor={palette.accent} style={styles.sectionIconButton} />
    </View>
    <View style={styles.sectionTitleBlock}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.title }]}>{title}</Text>
      <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: palette.muted }]}>{count} activos ahora</Text>
    </View>
    {action || null}
  </View>
);

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HlsJobCard = ({ compact, job, palette }) => {
  const statusMeta = getHlsStatusMeta(job.status);
  const [expanded, setExpanded] = React.useState(!compact);

  const handleToggleExpanded = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((currentValue) => !currentValue);
  }, []);

  return (
    <Surface style={[styles.runtimeCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardTitleBlock}>
          <Text variant="titleMedium" numberOfLines={1} style={[styles.cardTitle, { color: palette.title }]}>{job.movieTitle}</Text>
          <Text variant="bodySmall" numberOfLines={1} style={[styles.cardSubtitle, { color: palette.muted }]}>Sesion {job.sessionId}</Text>
        </View>
        <Chip compact style={[styles.statusChip, { backgroundColor: `${statusMeta.color}22` }]} textStyle={[styles.statusChipText, { color: statusMeta.color }]}>
          {statusMeta.label}
        </Chip>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text variant="labelMedium" style={[styles.progressLabel, { color: palette.copy }]}>Progreso</Text>
          <Text variant="labelLarge" style={[styles.progressValue, { color: palette.title }]}>{Math.round(job.percent)}%</Text>
        </View>
        <ProgressBar progress={job.percent / 100} color={statusMeta.color} style={styles.progressBar} />
      </View>

        {compact ? (
          <Button
            compact
            mode="text"
            icon={expanded ? "chevron-up" : "chevron-down"}
            onPress={handleToggleExpanded}
            textColor={palette.accent}
            contentStyle={styles.expandButtonContent}
            style={styles.expandButton}
          >
            {expanded ? "Ver menos" : "Ver detalles"}
          </Button>
        ) : null}

        {expanded ? (
          <>
            <View style={styles.metaGrid}>
              <MetaItem label="PID" value={job.pid || "-"} palette={palette} />
              <MetaItem label="FPS" value={job.fps || "-"} palette={palette} />
              <MetaItem label="Velocidad" value={job.speed || "-"} palette={palette} />
              <MetaItem label="Segmentos" value={job.segments} palette={palette} />
            </View>

            {job.lastLines?.length ? (
              <View style={[styles.logTail, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                {job.lastLines.map((line, index) => (
                  <Text key={`${job.id}-line-${index}`} variant="bodySmall" numberOfLines={1} style={[styles.logLine, { color: palette.muted }]}>{String(line)}</Text>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
    </Surface>
  );
};

const DirectStreamCard = ({ palette, stream }) => (
  <Surface style={[styles.runtimeCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
    <View style={styles.cardHeaderRow}>
      <View style={styles.cardTitleBlock}>
        <Text variant="titleMedium" numberOfLines={1} style={[styles.cardTitle, { color: palette.title }]}>{stream.movieTitle}</Text>
        <Text variant="bodySmall" numberOfLines={1} style={[styles.cardSubtitle, { color: palette.muted }]}>{stream.ip}</Text>
      </View>
      <Chip compact style={[styles.statusChip, { backgroundColor: "rgba(34, 197, 94, 0.14)" }]} textStyle={[styles.statusChipText, { color: palette.green }]}>Activo</Chip>
    </View>

    <View style={styles.metaGrid}>
      <MetaItem label="Rango" value={stream.range} palette={palette} />
      <MetaItem label="Transferido" value={formatBytes(stream.bytesSent)} palette={palette} />
      <MetaItem label="Inicio" value={formatRuntimeDate(stream.startedAt)} palette={palette} />
      <MetaItem label="Actividad" value={formatRuntimeDuration(stream.updatedAt || stream.startedAt)} palette={palette} />
    </View>

    <Text variant="bodySmall" numberOfLines={2} style={[styles.userAgent, { color: palette.muted }]}>{stream.userAgent}</Text>
  </Surface>
);

const MetaItem = ({ label, palette, value }) => (
  <View style={[styles.metaItem, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
    <Text variant="labelSmall" style={[styles.metaLabel, { color: palette.muted }]}>{label}</Text>
    <Text variant="labelLarge" numberOfLines={1} style={[styles.metaValue, { color: palette.title }]}>{String(value ?? "-")}</Text>
  </View>
);

const EmptyBlock = ({ icon, palette, text }) => (
  <Surface style={[styles.emptyBlock, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
    <IconButton icon={icon} size={30} iconColor={palette.muted} />
    <Text variant="bodyMedium" style={[styles.emptyText, { color: palette.copy }]}>{text}</Text>
  </Surface>
);

const HlsAdminScreen = () => {
  const theme = useTheme();
  const palette = React.useMemo(() => buildPalette(theme), [theme]);
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const isCompact = width < 620;
  const columns = width >= 1040 ? 2 : 1;
  const baseUrl = getHlsServerUrl();

  const { isAdmin } = Meteor.useTracker(() => {
    const user = Meteor.user?.();
    return {
      isAdmin: user?.username === "carlosmbinf" || user?.profile?.role === "admin",
    };
  }, []);

  const [snapshot, setSnapshot] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchRuntime = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    setError(null);

    try {
      const payload = await new Promise((resolve, reject) => {
        Meteor.call("hlsRuntime", (methodError, result) => {
          if (methodError) reject(methodError);
          else resolve(result);
        });
      });
      setSnapshot(normalizeHlsRuntimeSnapshot(payload));
    } catch (runtimeError) {
      setError(runtimeError?.message || "El servicio HLS no esta disponible en este momento.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseUrl]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAdmin) {
        setLoading(false);
        return undefined;
      }

      fetchRuntime({ silent: true });
      const intervalId = setInterval(() => {
        fetchRuntime({ silent: true });
      }, DEFAULT_HLS_REFRESH_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, [fetchRuntime, isAdmin]),
  );

  if (!isAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.screen }]}> 
        <AppHeader title="Streaming HLS" subtitle="Panel administrativo" showBackButton backHref="/(normal)/Main" />
        <View style={[styles.restrictedWrap, { paddingTop: headerInset + 24 }]}> 
          <EmptyBlock icon="shield-lock-outline" palette={palette} text="Esta superficie esta reservada para administradores." />
        </View>
      </View>
    );
  }

  const hlsJobs = snapshot?.hlsJobs || [];
  const directStreams = snapshot?.directStreams || [];

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}> 
      <AppHeader title="Streaming HLS" subtitle="Runtime del servicio" showBackButton backHref="/(normal)/Main" backgroundColor={DEFAULT_HEADER_COLOR} overlapContent />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRuntime()} tintColor={palette.accent} />}
        contentContainerStyle={styles.content}
        style={{ marginTop: headerInset + 18 }}
        showsVerticalScrollIndicator={false}
      >
        <RuntimeHero baseUrl={baseUrl} compact={isCompact} onRefresh={() => fetchRuntime()} palette={palette} refreshing={refreshing} snapshot={snapshot} />

        {loading ? (
          <Surface style={[styles.loadingCard, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
            <ActivityIndicator color={palette.accent} />
            <Text variant="bodyMedium" style={{ color: palette.copy }}>Conectando con el servicio HLS...</Text>
          </Surface>
        ) : null}

        {error ? (
          <Surface style={[styles.errorCard, { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.26)" }]} elevation={0}>
            <IconButton icon="alert-circle-outline" iconColor={palette.red} size={28} />
            <View style={styles.errorCopyBlock}>
              <Text variant="titleMedium" style={{ color: palette.title }}>Servicio no disponible</Text>
              <Text variant="bodyMedium" style={{ color: palette.copy }}>{error}</Text>
            </View>
          </Surface>
        ) : null}

        <View style={styles.sectionBlock}>
          <SectionHeader count={hlsJobs.length} icon="movie-cog-outline" palette={palette} title="Conversiones HLS / FFmpeg" />
          {hlsJobs.length ? (
            <View style={[styles.cardGrid, columns > 1 && styles.cardGridTwoColumns]}>
              {hlsJobs.map((job) => (
                <View key={job.id} style={[styles.gridCell, columns > 1 && styles.gridCellHalf]}>
                  <HlsJobCard compact={isCompact} job={job} palette={palette} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyBlock icon="movie-open-off-outline" palette={palette} text="No hay conversiones HLS activas en este momento." />
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader count={directStreams.length} icon="access-point-network" palette={palette} title="Streams directos" />
          {directStreams.length ? (
            <View style={[styles.cardGrid, columns > 1 && styles.cardGridTwoColumns]}>
              {directStreams.map((stream) => (
                <View key={stream.id} style={[styles.gridCell, columns > 1 && styles.gridCellHalf]}>
                  <DirectStreamCard palette={palette} stream={stream} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyBlock icon="broadcast-off" palette={palette} text="No hay streams directos activos ahora mismo." />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 18, paddingBottom: 32, paddingHorizontal: 16 },
  heroCard: { borderRadius: 28, borderWidth: 1, overflow: "hidden", padding: 20 },
  heroTopRow: { alignItems: "flex-start", flexDirection: "row", gap: 16, justifyContent: "space-between" },
  heroTitleBlock: { flex: 1, gap: 8 },
  heroEyebrow: { color: "#7dd3fc", fontWeight: "900", letterSpacing: 0 },
  heroTitle: { color: "#ffffff", fontWeight: "900" },
  heroCopy: { color: "rgba(226, 232, 240, 0.88)", lineHeight: 21, maxWidth: 720 },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  heroChip: { backgroundColor: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.14)", borderWidth: 1 },
  heroChipText: { color: "#e0f2fe", fontWeight: "800" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  statsGridCompact: { gap: 8 },
  statCard: { backgroundColor: "rgba(15, 23, 42, 0.76)", borderColor: "rgba(148, 163, 184, 0.18)", borderRadius: 18, borderWidth: 1, flex: 1, minWidth: 135, padding: 14 },
  statCardCompact: { minWidth: "47%", padding: 12 },
  statLabel: { color: "#94a3b8", fontWeight: "800" },
  statValue: { fontWeight: "900", marginTop: 6 },
  loadingCard: { alignItems: "center", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16 },
  errorCard: { alignItems: "center", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 8, padding: 14 },
  errorCopyBlock: { flex: 1, gap: 2 },
  sectionBlock: { gap: 12 },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  sectionIcon: { borderRadius: 16, height: 44, overflow: "hidden", width: 44 },
  sectionIconButton: { margin: 0 },
  sectionTitleBlock: { flex: 1 },
  sectionTitle: { fontWeight: "900" },
  sectionSubtitle: { fontWeight: "700" },
  cardGrid: { gap: 12 },
  cardGridTwoColumns: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "100%" },
  gridCellHalf: { width: "49%" },
  runtimeCard: { borderRadius: 22, borderWidth: 1, gap: 14, padding: 14 },
  cardHeaderRow: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitleBlock: { flex: 1, gap: 3 },
  cardTitle: { fontWeight: "900" },
  cardSubtitle: { fontWeight: "700" },
  statusChip: { borderRadius: 999 },
  statusChipText: { fontSize: 12, fontWeight: "900" },
  progressBlock: { gap: 8 },
  progressHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontWeight: "800" },
  progressValue: { fontWeight: "900" },
  progressBar: { borderRadius: 999, height: 8, overflow: "hidden" },
  expandButton: { alignSelf: "flex-start", marginTop: -2 },
  expandButtonContent: { minHeight: 30 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaItem: { borderRadius: 14, borderWidth: 1, flexGrow: 1, minWidth: 112, paddingHorizontal: 10, paddingVertical: 9 },
  metaLabel: { fontWeight: "800", textTransform: "uppercase" },
  metaValue: { fontWeight: "900", marginTop: 3 },
  logTail: { borderRadius: 16, borderWidth: 1, gap: 3, padding: 10 },
  logLine: { fontFamily: "monospace" },
  userAgent: { lineHeight: 18 },
  emptyBlock: { alignItems: "center", borderRadius: 22, borderWidth: 1, gap: 4, padding: 18 },
  emptyText: { fontWeight: "700", textAlign: "center" },
  restrictedWrap: { flex: 1, justifyContent: "center", padding: 20 },
});

export default HlsAdminScreen;
