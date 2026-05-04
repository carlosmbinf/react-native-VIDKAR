import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    Dialog,
    Divider,
    IconButton,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { Logs } from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const PAGE_SIZE = 60;

const LOG_FIELDS = {
  createdAt: 1,
  message: 1,
  type: 1,
  userAdmin: 1,
  userAfectado: 1,
};

const USER_FIELDS = {
  _id: 1,
  picture: 1,
  profile: 1,
  username: 1,
};

const getRouteValue = (value) =>
  Array.isArray(value) ? value[0] : typeof value === "string" ? value : null;

const buildDisplayName = (userDoc, fallback = "Usuario desconocido") => {
  if (!userDoc) {
    return fallback;
  }

  return (
    `${userDoc?.profile?.firstName || ""} ${userDoc?.profile?.lastName || ""}`.trim() ||
    userDoc.username ||
    fallback
  );
};

const formatTimelineDate = (value) => {
  if (!value) {
    return {
      dayLabel: "Sin fecha",
      fullLabel: "Sin fecha registrada",
      timeLabel: "--:--",
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      dayLabel: String(value),
      fullLabel: String(value),
      timeLabel: "--:--",
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / 86400000);

  let dayLabel = "";
  if (diffDays === 0) {
    dayLabel = "Hoy";
  } else if (diffDays === 1) {
    dayLabel = "Ayer";
  } else {
    try {
      dayLabel = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
      }).format(date);
    } catch (_error) {
      dayLabel = date.toLocaleDateString("es-ES");
    }
  }

  let timeLabel = "";
  let fullLabel = "";
  try {
    timeLabel = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    fullLabel = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    timeLabel = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    fullLabel = date.toLocaleString("es-ES");
  }

  return { dayLabel, fullLabel, timeLabel };
};

const getLogTone = (type = "", isDark = false) => {
  const normalized = String(type).trim().toUpperCase();

  if (normalized.includes("ERROR") || normalized.includes("DENEG")) {
    return {
      accent: "#ef4444",
      background: isDark ? "rgba(127, 29, 29, 0.42)" : "rgba(254, 226, 226, 0.92)",
      icon: "alert-circle-outline",
      label: normalized || "ERROR",
      text: isDark ? "#fecaca" : "#991b1b",
    };
  }

  if (normalized.includes("VPN") || normalized.includes("PROXY")) {
    return {
      accent: "#6366f1",
      background: isDark ? "rgba(67, 56, 202, 0.32)" : "rgba(224, 231, 255, 0.94)",
      icon: "shield-sync-outline",
      label: normalized || "SERVICIO",
      text: isDark ? "#e0e7ff" : "#3730a3",
    };
  }

  if (normalized.includes("LOGIN") || normalized.includes("AUTH")) {
    return {
      accent: "#2563eb",
      background: isDark ? "rgba(30, 64, 175, 0.34)" : "rgba(219, 234, 254, 0.96)",
      icon: "login-variant",
      label: normalized || "ACCESO",
      text: isDark ? "#dbeafe" : "#1d4ed8",
    };
  }

  return {
    accent: "#10b981",
    background: isDark ? "rgba(6, 95, 70, 0.34)" : "rgba(209, 250, 229, 0.94)",
    icon: "clipboard-text-clock-outline",
    label: normalized || "EVENTO",
    text: isDark ? "#bbf7d0" : "#065f46",
  };
};

const TimelineSearch = ({ colors, value, onChangeText }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface
      style={[styles.searchSurface, { backgroundColor: colors.surface }]}
      elevation={0}
    >
      <IconButton
        icon="magnify"
        size={19}
        iconColor={colors.icon}
        style={styles.searchIcon}
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar en esta línea de tiempo"
        placeholderTextColor={colors.placeholder}
        cursorColor={colors.text}
        selectionColor={colors.selection}
        style={[styles.searchInput, { color: colors.text }]}
      />
      {value ? (
        <IconButton
          icon="close"
          size={18}
          iconColor={colors.icon}
          style={styles.searchIcon}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </Surface>
  );
};

const TimelineDetailsDialog = ({ colors, isDark, log, onDismiss, visible }) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const tone = getLogTone(log?.type, isDark);
  const date = formatTimelineDate(log?.createdAt);
  const dialogWidth = Math.min(width - 24, 680);
  const maxHeight = Math.max(380, height - insets.top - insets.bottom - 28);

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        dismissable
        dismissableBackButton
        style={[
          styles.dialog,
          {
            backgroundColor: colors.dialogSurface,
            borderColor: colors.dialogBorder,
            marginTop: Math.max(insets.top, 12),
            marginBottom: Math.max(insets.bottom, 12),
            maxHeight,
            width: dialogWidth,
          },
        ]}
      >
        <View style={styles.dialogHeader}>
          <View style={[styles.dialogIconWrap, { backgroundColor: tone.background }]}>
            <IconButton icon={tone.icon} size={24} iconColor={tone.accent} />
          </View>
          <View style={styles.dialogHeaderCopy}>
            <Text variant="labelMedium" style={[styles.dialogKicker, { color: tone.text }]}>
              {tone.label}
            </Text>
            <Text variant="titleLarge" style={[styles.dialogTitle, { color: colors.title }]}>
              Detalle del evento
            </Text>
            <Text variant="bodySmall" style={[styles.dialogSubtitle, { color: colors.subtitle }]}>
              {date.fullLabel}
            </Text>
          </View>
          <IconButton
            icon="close"
            onPress={onDismiss}
            iconColor={colors.icon}
            style={[styles.dialogClose, { backgroundColor: colors.subtleSurface }]}
          />
        </View>
        <Divider />
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.dialogContent}
          >
            <View style={styles.dialogMetaGrid}>
              <Surface style={[styles.dialogMetaCard, { backgroundColor: colors.subtleSurface }]} elevation={0}>
                <Text style={[styles.dialogMetaLabel, { color: colors.muted }]}>Admin</Text>
                <Text style={[styles.dialogMetaValue, { color: colors.title }]}>{log?.adminDisplay || "Sin dato"}</Text>
              </Surface>
              <Surface style={[styles.dialogMetaCard, { backgroundColor: colors.subtleSurface }]} elevation={0}>
                <Text style={[styles.dialogMetaLabel, { color: colors.muted }]}>Usuario</Text>
                <Text style={[styles.dialogMetaValue, { color: colors.title }]}>{log?.userDisplay || "Sin dato"}</Text>
              </Surface>
            </View>
            <Surface
              style={[
                styles.dialogMessageCard,
                { backgroundColor: colors.messageSurface, borderColor: colors.border },
              ]}
              elevation={0}
            >
              <Text style={[styles.dialogMetaLabel, { color: colors.muted }]}>Mensaje registrado</Text>
              <Text style={[styles.dialogMessage, { color: colors.copy }]}>
                {log?.message || "Sin mensaje disponible"}
              </Text>
            </Surface>
          </ScrollView>
        </Dialog.ScrollArea>
        <Divider />
        <Dialog.Actions style={styles.dialogActions}>
          <Button mode="contained-tonal" onPress={onDismiss} style={styles.dialogButton}>
            Cerrar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const TimelineItem = ({ colors, index, isDark, item, onPress, total }) => {
  const tone = getLogTone(item.type, isDark);
  const date = formatTimelineDate(item.createdAt);
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <Pressable
      onPress={() => onPress(item._id)}
      style={({ pressed }) => [styles.timelinePressable, pressed && styles.timelinePressed]}
    >
      <View style={styles.timelineRow}>
        <View style={styles.timeColumn}>
          <View
            style={[styles.timePill, { backgroundColor: colors.timePill }]}
          >
            <Text style={[styles.timeText, { color: colors.timeText }]}>{date.timeLabel}</Text>
          </View>
          <Text style={[styles.dayText, { color: colors.muted }]} numberOfLines={1}>
            {date.dayLabel}
          </Text>
        </View>

        <View style={styles.axisColumn}>
          <View
            style={[
              styles.axisLine,
              styles.axisLineTop,
              { backgroundColor: colors.axis },
              isFirst && styles.axisLineHidden,
            ]}
          />
          <View
            style={[
              styles.dotOuter,
              { borderColor: tone.accent, backgroundColor: colors.screen },
            ]}
          >
            <View style={[styles.dotInner, { backgroundColor: tone.accent }]} />
          </View>
          <View
            style={[
              styles.axisLine,
              styles.axisLineBottom,
              { backgroundColor: colors.axis },
              isLast && styles.axisLineHidden,
            ]}
          />
        </View>

        <Surface
          style={[
            styles.eventCard,
            {
              backgroundColor: colors.cardSurface,
              borderColor: colors.border,
            },
          ]}
          elevation={0}
        >
          <View style={styles.eventHeader}>
            <View
              style={[
                styles.eventIconWrap,
                { backgroundColor: tone.background },
              ]}
            >
              <IconButton icon={tone.icon} size={18} iconColor={tone.accent} style={styles.eventIcon} />
            </View>
            <View style={styles.eventHeaderCopy}>
              <Text style={[styles.eventType, { color: colors.title }]} numberOfLines={1}>
                {item.type || "Evento"}
              </Text>
              <Text style={[styles.eventDate, { color: colors.muted }]} numberOfLines={1}>
                {date.fullLabel}
              </Text>
            </View>
            <Chip compact style={[styles.typeChip, { backgroundColor: tone.background }]} textStyle={[styles.typeChipText, { color: tone.text }]}>
              {tone.label}
            </Chip>
          </View>

          <Text style={[styles.eventMessage, { color: colors.copy }]} numberOfLines={3}>
            {item.message || "Sin mensaje disponible"}
          </Text>

          <View style={styles.actorRow}>
            <View
              style={[
                styles.actorPill,
                { backgroundColor: colors.subtleSurface },
              ]}
            >
              <Text style={[styles.actorLabel, { color: colors.muted }]}>Admin</Text>
              <Text style={[styles.actorValue, { color: colors.title }]} numberOfLines={1}>
                {item.adminDisplay}
              </Text>
            </View>
            <View
              style={[
                styles.actorPill,
                { backgroundColor: colors.subtleSurface },
              ]}
            >
              <Text style={[styles.actorLabel, { color: colors.muted }]}>Usuario</Text>
              <Text style={[styles.actorValue, { color: colors.title }]} numberOfLines={1}>
                {item.userDisplay}
              </Text>
            </View>
          </View>
        </Surface>
      </View>
    </Pressable>
  );
};

const EmptyTimeline = ({ colors, hasLogs, onClearFilters }) => (
  <Surface style={[styles.emptyCard, { backgroundColor: colors.cardSurface }]} elevation={0}>
    <View
      style={[styles.emptyIcon, { backgroundColor: colors.subtleSurface }]}
    >
      <IconButton icon="timeline-alert-outline" size={34} iconColor={colors.icon} />
    </View>
    <Text style={[styles.emptyTitle, { color: colors.title }]}>
      {hasLogs ? "No hay eventos con estos filtros" : "Sin eventos para este usuario"}
    </Text>
    <Text style={[styles.emptyCopy, { color: colors.copy }]}>
      {hasLogs
        ? "Ajusta la búsqueda o el tipo de evento para recuperar la línea de tiempo completa."
        : "Cuando este usuario participe en acciones del sistema, sus registros aparecerán ordenados por fecha aquí."}
    </Text>
    {hasLogs ? (
      <Button mode="outlined" onPress={onClearFilters}>
        Limpiar filtros
      </Button>
    ) : null}
  </Surface>
);

const UserLogsTimeline = () => {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const routeId = getRouteValue(params.id) || getRouteValue(params.item);
  const routeUsername = getRouteValue(params.username);
  const routeDisplayName = getRouteValue(params.name);
  const [fetchLimit, setFetchLimit] = React.useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("TODOS");
  const [selectedLogId, setSelectedLogId] = React.useState(null);
  const dataReady = useDeferredScreenData();
  const isDark = theme.dark;
  const headerInset = useAppHeaderContentInset();

  const palette = React.useMemo(
    () => ({
      screen: isDark ? "#020617" : "#eef3fb",
      heroPanel: isDark ? "#0b1220" : "#0f172a",
      heroCopy: "rgba(226, 232, 240, 0.86)",
      title: isDark ? "#f8fafc" : "#0f172a",
      subtitle: isDark ? "#cbd5e1" : "#64748b",
      copy: isDark ? "#cbd5e1" : "#334155",
      muted: isDark ? "#94a3b8" : "#64748b",
      icon: isDark ? "#cbd5e1" : "#475569",
      cardSurface: isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)",
      subtleSurface: isDark ? "rgba(30, 41, 59, 0.82)" : "rgba(226, 232, 240, 0.72)",
      messageSurface: isDark ? "rgba(30, 41, 59, 0.72)" : "rgba(248, 250, 252, 0.96)",
      border: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.08)",
      axis: isDark ? "rgba(45, 212, 191, 0.5)" : "rgba(14, 165, 233, 0.34)",
      timePill: isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(219, 234, 254, 0.96)",
      timeText: isDark ? "#dbeafe" : "#1d4ed8",
      filterSurface: isDark ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.88)",
      searchSurface: isDark ? "rgba(30, 41, 59, 0.92)" : "#ffffff",
      searchSelection: isDark ? "rgba(148, 163, 184, 0.22)" : "rgba(15, 23, 42, 0.18)",
      chipSurface: isDark ? "rgba(51, 65, 85, 0.82)" : "rgba(148, 163, 184, 0.14)",
      chipSelected: isDark ? "rgba(59, 130, 246, 0.28)" : "rgba(37, 99, 235, 0.14)",
      chipSelectedText: isDark ? "#dbeafe" : "#1d4ed8",
      dialogSurface: isDark ? theme.colors.elevation?.level2 || theme.colors.surface : "#fbfcff",
      dialogBorder: isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(59, 130, 246, 0.14)",
    }),
    [isDark, theme.colors.elevation, theme.colors.surface],
  );

  const { hasMore, logs, ready, targetUser, totalFetched } = Meteor.useTracker(() => {
    const currentUserId = Meteor.userId();
    const targetUserId = routeId || currentUserId;

    if (!dataReady || !targetUserId) {
      return {
        hasMore: false,
        logs: [],
        ready: false,
        targetUser: null,
        totalFetched: 0,
      };
    }

    const query = {
      $or: [{ userAfectado: targetUserId }, { userAdmin: targetUserId }],
    };

    const logsHandle = Meteor.subscribe("logs", query, {
      fields: LOG_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit + 1,
    });

    const logDocs = logsHandle.ready()
      ? Logs.find(query, {
          fields: LOG_FIELDS,
          sort: { createdAt: -1 },
          limit: fetchLimit + 1,
        }).fetch()
      : [];

    const visibleDocs = logDocs.slice(0, fetchLimit);
    const userIds = [
      targetUserId,
      ...visibleDocs.flatMap((log) => [log.userAdmin, log.userAfectado]),
    ].filter((value) => value && String(value).toUpperCase() !== "SERVER");
    const uniqueUserIds = [...new Set(userIds)];

    const usersHandle = uniqueUserIds.length
      ? Meteor.subscribe(
          "user",
          { _id: { $in: uniqueUserIds } },
          { fields: USER_FIELDS },
        )
      : { ready: () => true };

    const mappedLogs = visibleDocs.map((log) => {
      const affectedUser = log.userAfectado
        ? Meteor.users.findOne(log.userAfectado, { fields: USER_FIELDS })
        : null;
      const adminUser =
        log.userAdmin && String(log.userAdmin).toUpperCase() !== "SERVER"
          ? Meteor.users.findOne(log.userAdmin, { fields: USER_FIELDS })
          : null;

      return {
        ...log,
        adminDisplay:
          String(log.userAdmin || "").toUpperCase() === "SERVER"
            ? "SERVER"
            : buildDisplayName(adminUser, "Admin desconocido"),
        adminUsername:
          String(log.userAdmin || "").toUpperCase() === "SERVER"
            ? "SERVER"
            : adminUser?.username || "Desconocido",
        userDisplay: buildDisplayName(affectedUser, "Usuario desconocido"),
        userUsername: affectedUser?.username || "Desconocido",
      };
    });

    return {
      hasMore: logDocs.length > fetchLimit,
      logs: mappedLogs,
      ready: logsHandle.ready() && usersHandle.ready(),
      targetUser: Meteor.users.findOne(targetUserId, { fields: USER_FIELDS }),
      totalFetched: visibleDocs.length,
    };
  }, [dataReady, fetchLimit, routeId]);

  const targetDisplayName = React.useMemo(
    () =>
      routeDisplayName ||
      buildDisplayName(targetUser, routeUsername || targetUser?.username || "Usuario"),
    [routeDisplayName, routeUsername, targetUser],
  );
  const targetUsername = targetUser?.username || routeUsername || "";

  const typeOptions = React.useMemo(
    () => ["TODOS", ...new Set(logs.map((log) => log.type).filter(Boolean))],
    [logs],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    const matchesType = selectedType === "TODOS" || log.type === selectedType;
    const matchesSearch =
      !normalizedSearch ||
      [log.type, log.message, log.adminDisplay, log.userDisplay]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));

    return matchesType && matchesSearch;
  });

  const selectedLog =
    filteredLogs.find((log) => log._id === selectedLogId) ||
    logs.find((log) => log._id === selectedLogId) ||
    null;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("TODOS");
  };

  const renderTimelineItem = ({ item, index }) => (
    <TimelineItem
      colors={palette}
      index={index}
      isDark={isDark}
      item={item}
      onPress={setSelectedLogId}
      total={filteredLogs.length}
    />
  );

  if (!ready) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.screen }]}>
        <AppHeader
          title="Línea de tiempo"
          subtitle="Cargando logs del usuario"
          backgroundColor="#0f172a"
          overlapContent
          showBackButton
          backHref="/(normal)/Users"
        />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: palette.subtitle }]}>
            Preparando el historial ordenado por fecha.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: palette.screen }]}
    >
      <AppHeader
        title="Línea de tiempo"
        subtitle={targetUsername ? `@${targetUsername}` : targetDisplayName}
        backgroundColor="#0f172a"
        overlapContent
        showBackButton
        backHref="/(normal)/Users"
      />

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item._id}
        renderItem={renderTimelineItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerInset + 12 },
        ]}
        onEndReached={() => {
          if (hasMore) {
            setFetchLimit((current) => current + PAGE_SIZE);
          }
        }}
        onEndReachedThreshold={0.28}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Surface style={[styles.heroPanel, { backgroundColor: palette.heroPanel }]} elevation={0}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroTitleBlock}>
                  <Text style={styles.heroEyebrow}>Auditoría del usuario</Text>
                  <Text style={styles.heroTitle}>{targetDisplayName}</Text>
                  {targetUsername ? <Text style={styles.heroSubtitle}>@{targetUsername}</Text> : null}
                </View>
                <View style={styles.heroIconWrap}>
                  <IconButton icon="timeline-clock-outline" size={28} iconColor="#dbeafe" />
                </View>
              </View>
              <Text style={[styles.heroCopy, { color: palette.heroCopy }]}>
                Eventos ordenados por fecha para revisar actividad, cambios de servicio y acciones administrativas vinculadas a su usuario.
              </Text>
              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>{totalFetched}</Text>
                  <Text style={styles.heroMetricLabel}>cargados</Text>
                </View>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>{filteredLogs.length}</Text>
                  <Text style={styles.heroMetricLabel}>visibles</Text>
                </View>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>{typeOptions.length - 1}</Text>
                  <Text style={styles.heroMetricLabel}>tipos</Text>
                </View>
              </View>
            </Surface>

            <Surface style={[styles.filterPanel, { backgroundColor: palette.filterSurface }]} elevation={0}>
              <TimelineSearch
                colors={{
                  icon: palette.icon,
                  placeholder: palette.muted,
                  selection: palette.searchSelection,
                  surface: palette.searchSurface,
                  text: palette.title,
                }}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeFiltersRow}
              >
                {typeOptions.map((type) => {
                  const selected = selectedType === type;
                  return (
                    <Chip
                      key={type}
                      compact
                      selected={selected}
                      showSelectedCheck={selected}
                      onPress={() => setSelectedType(type)}
                      style={[
                        styles.filterChip,
                        { backgroundColor: palette.chipSurface, borderColor: palette.border },
                        selected && { backgroundColor: palette.chipSelected },
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        { color: palette.copy },
                        selected && { color: palette.chipSelectedText },
                      ]}
                    >
                      {type}
                    </Chip>
                  );
                })}
              </ScrollView>
            </Surface>
          </View>
        }
        ListEmptyComponent={
          <EmptyTimeline
            colors={palette}
            hasLogs={logs.length > 0}
            onClearFilters={clearFilters}
          />
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoadMore}>
              <Button mode="outlined" onPress={() => setFetchLimit((current) => current + PAGE_SIZE)}>
                Cargar más eventos
              </Button>
            </View>
          ) : filteredLogs.length > 0 ? (
            <Text style={[styles.endOfTimeline, { color: palette.muted }]}>
              Fin de la línea de tiempo cargada.
            </Text>
          ) : null
        }
      />

      <TimelineDetailsDialog
        colors={palette}
        isDark={isDark}
        log={selectedLog}
        onDismiss={() => setSelectedLogId(null)}
        visible={Boolean(selectedLogId)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 28,
  },
  loadingText: {
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 28,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  headerContent: {
    gap: 14,
    marginBottom: 6,
  },
  heroPanel: {
    borderRadius: 28,
    gap: 14,
    overflow: "hidden",
    padding: 20,
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  heroTitleBlock: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    color: "#bfdbfe",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  heroSubtitle: {
    color: "rgba(226, 232, 240, 0.82)",
    fontSize: 14,
    fontWeight: "700",
  },
  heroIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.24)",
    borderRadius: 20,
    justifyContent: "center",
  },
  heroCopy: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroMetricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroMetric: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroMetricValue: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
  },
  heroMetricLabel: {
    color: "rgba(226, 232, 240, 0.72)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  filterPanel: {
    borderRadius: 24,
    gap: 12,
    padding: 14,
  },
  searchSurface: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    minHeight: 50,
    paddingHorizontal: 4,
  },
  searchIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  typeFiltersRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timelinePressable: {
    marginTop: 2,
  },
  timelinePressed: {
    opacity: 0.94,
    transform: [{ scale: 0.997 }],
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 132,
  },
  timeColumn: {
    alignItems: "flex-end",
    paddingRight: 8,
    paddingTop: 14,
    width: 68,
  },
  timePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  dayText: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
    maxWidth: 62,
    textAlign: "right",
  },
  axisColumn: {
    alignItems: "center",
    width: 26,
  },
  axisLine: {
    width: 2,
  },
  axisLineTop: {
    flex: 0,
    height: 24,
  },
  axisLineBottom: {
    flex: 1,
  },
  axisLineHidden: {
    opacity: 0,
  },
  dotOuter: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 3,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  dotInner: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  eventCard: {
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    padding: 14,
  },
  eventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  eventIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  eventIcon: {
    margin: 0,
  },
  eventHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  eventType: {
    fontSize: 15,
    fontWeight: "900",
  },
  eventDate: {
    fontSize: 11,
    fontWeight: "600",
  },
  typeChip: {
    borderRadius: 999,
    maxWidth: 120,
  },
  typeChipText: {
    fontSize: 9,
    fontWeight: "800",
  },
  eventMessage: {
    fontSize: 13,
    lineHeight: 19,
  },
  actorRow: {
    flexDirection: "row",
    gap: 8,
  },
  actorPill: {
    borderRadius: 14,
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actorLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  actorValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 26,
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  emptyIcon: {
    borderRadius: 999,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyCopy: {
    lineHeight: 21,
    textAlign: "center",
  },
  footerLoadMore: {
    alignItems: "center",
    paddingBottom: 8,
    paddingTop: 18,
  },
  endOfTimeline: {
    fontSize: 12,
    fontWeight: "700",
    paddingBottom: 8,
    paddingTop: 20,
    textAlign: "center",
  },
  dialog: {
    alignSelf: "center",
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  dialogHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  dialogIconWrap: {
    borderRadius: 18,
  },
  dialogHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  dialogKicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dialogTitle: {
    fontWeight: "900",
  },
  dialogSubtitle: {
    lineHeight: 18,
  },
  dialogClose: {
    margin: 0,
  },
  dialogScrollArea: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  dialogContent: {
    gap: 12,
    padding: 18,
  },
  dialogMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dialogMetaCard: {
    borderRadius: 18,
    flex: 1,
    gap: 4,
    minWidth: 180,
    padding: 14,
  },
  dialogMetaLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  dialogMetaValue: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  dialogMessageCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  dialogMessage: {
    fontSize: 15,
    lineHeight: 23,
  },
  dialogActions: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dialogButton: {
    borderRadius: 999,
  },
});

export default UserLogsTimeline;
