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

import AppHeader from "../Header/AppHeader";
import { Logs } from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const LIMIT_OPTIONS = [100, 200, 300];

const formatLogDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return date.toLocaleString("es-ES");
  }
};

const getLogTone = (type = "") => {
  const normalized = String(type).trim().toUpperCase();

  if (normalized.includes("ERROR") || normalized.includes("DENEG")) {
    return {
      accent: "#ef4444",
      background: "rgba(239, 68, 68, 0.16)",
      label: normalized || "ERROR",
      text: "#991b1b",
    };
  }

  if (normalized.includes("VPN") || normalized.includes("PROXY")) {
    return {
      accent: "#6366f1",
      background: "rgba(99, 102, 241, 0.16)",
      label: normalized || "SERVICIO",
      text: "#3730a3",
    };
  }

  if (normalized.includes("LOGIN") || normalized.includes("AUTH")) {
    return {
      accent: "#2563eb",
      background: "rgba(37, 99, 235, 0.14)",
      label: normalized || "ACCESO",
      text: "#1d4ed8",
    };
  }

  return {
    accent: "#10b981",
    background: "rgba(16, 185, 129, 0.16)",
    label: normalized || "EVENTO",
    text: "#065f46",
  };
};

const SearchInput = ({ colors, value, onChangeText, placeholder }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface
      style={[styles.searchInputSurface, { backgroundColor: colors.surface }]}
      elevation={0}
    >
      <IconButton
        icon="magnify"
        size={20}
        style={styles.searchLeadingIcon}
        iconColor={colors.icon}
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        cursorColor={colors.cursor}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.selection}
        style={[styles.searchInput, { color: colors.text }]}
      />
      {value ? (
        <IconButton
          icon="close"
          size={18}
          style={styles.searchTrailingIcon}
          iconColor={colors.icon}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </Surface>
  );
};

const FilterGroup = ({ colors, label, options, selectedValue, onSelect }) => (
  <View style={styles.filterGroup}>
    <Text
      variant="labelMedium"
      style={[styles.filterLabel, { color: colors.label }]}
    >
      {label}
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterValuesRow}
    >
      {options.map((option) => {
        const selected = selectedValue === option;

        return (
          <Chip
            key={`${label}-${option}`}
            selected={selected}
            showSelectedCheck={selected}
            onPress={() => onSelect(option)}
            style={[
              styles.filterChip,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
              selected && {
                backgroundColor: colors.selectedBackground,
                borderColor: colors.selectedBorder,
              },
            ]}
            textStyle={[
              styles.filterChipText,
              { color: colors.text },
              selected && { color: colors.selectedText },
            ]}
          >
            {option}
          </Chip>
        );
      })}
    </ScrollView>
  </View>
);

const EmptyState = ({ colors, hasLogs, onClearFilters }) => (
  <Surface
    style={[styles.emptyStateCard, { backgroundColor: colors.surface }]}
    elevation={0}
  >
    <View style={[styles.emptyIconWrap, { backgroundColor: colors.iconWrap }]}>
      <IconButton
        icon="clipboard-text-search-outline"
        size={34}
        iconColor={colors.icon}
      />
    </View>
    <Text
      variant="titleMedium"
      style={[styles.emptyTitle, { color: colors.title }]}
    >
      {hasLogs ? "No hay coincidencias" : "No hay logs publicados"}
    </Text>
    <Text
      variant="bodyMedium"
      style={[styles.emptyCopy, { color: colors.copy }]}
    >
      {hasLogs
        ? "Ajusta la busqueda o los filtros para volver a ver registros en el historial."
        : "La suscripcion está lista, pero no se recibieron eventos para esta consulta."}
    </Text>
    {hasLogs ? (
      <Button mode="outlined" onPress={onClearFilters}>
        Limpiar filtros
      </Button>
    ) : null}
  </Surface>
);

const LogDetailsDialog = ({ colors, log, onDismiss, visible }) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const dialogWidth = Math.min(windowWidth - 24, 760);
  const dialogMaxHeight = Math.max(
    420,
    windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24,
  );
  const scrollAreaMaxHeight = Math.max(220, dialogMaxHeight - 230);
  const tone = getLogTone(log?.type);
  const shortId = log?._id ? String(log._id).slice(-8) : null;

  const DetailRow = ({ label, value }) => (
    <Surface
      style={[
        styles.detailRow,
        {
          backgroundColor: colors.detailSurface,
          borderColor: colors.detailBorder,
        },
      ]}
      elevation={0}
    >
      <Text
        variant="labelMedium"
        style={[styles.detailLabel, { color: colors.detailLabel }]}
      >
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.detailValue, { color: colors.detailValue }]}
      >
        {value || "Sin dato"}
      </Text>
    </Surface>
  );

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
            maxHeight: dialogMaxHeight,
            width: dialogWidth,
          },
        ]}
      >
        <View style={styles.dialogHeaderWrap}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogHeaderCopy}>
              <Text
                variant="labelMedium"
                style={[styles.dialogKicker, { color: colors.dialogModeText }]}
              >
                Snapshot del evento
              </Text>
              <Text
                variant="titleLarge"
                style={[styles.dialogTitle, { color: colors.title }]}
              >
                Detalle de log
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.dialogSubtitle, { color: colors.copy }]}
              >
                Resumen visual del evento, sus actores y el mensaje registrado.
              </Text>
            </View>
            <IconButton
              icon="close"
              onPress={onDismiss}
              iconColor={colors.icon}
              style={[
                styles.dialogCloseButton,
                { backgroundColor: colors.dialogCloseSurface },
              ]}
            />
          </View>
        </View>

        <Divider />

        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <ScrollView
            style={[styles.dialogScroll, { maxHeight: scrollAreaMaxHeight }]}
            contentContainerStyle={styles.dialogContent}
            showsVerticalScrollIndicator={false}
          >
            {log ? (
              <>
                <Surface
                  style={[
                    styles.logHeroCard,
                    {
                      backgroundColor: colors.heroSurface,
                      borderColor: colors.heroBorder,
                    },
                  ]}
                  elevation={0}
                >
                  <View
                    style={[
                      styles.logHeroRail,
                      { backgroundColor: tone.accent },
                    ]}
                  />
                  <View style={styles.logHeroTopRow}>
                    <Chip
                      compact
                      style={[
                        styles.secondaryToneChip,
                        { backgroundColor: colors.heroMetaSurface },
                      ]}
                      textStyle={[
                        styles.secondaryToneChipText,
                        { color: colors.heroMetaText },
                      ]}
                    >
                      {formatLogDate(log.createdAt)}
                    </Chip>
                    <Chip
                      compact
                      style={[
                        styles.toneChip,
                        { backgroundColor: tone.background },
                      ]}
                      textStyle={[styles.toneChipText, { color: tone.text }]}
                    >
                      {tone.label}
                    </Chip>
                  </View>
                  <View style={styles.logHeroRow}>
                    <View style={styles.logHeroPrimary}>
                      <Text
                        variant="headlineSmall"
                        style={[styles.logHeroTitle, { color: colors.title }]}
                      >
                        {log.type || "Evento sin tipo"}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={[styles.logHeroSupport, { color: colors.copy }]}
                      >
                        Registro listo para seguimiento y revisión puntual.
                      </Text>
                    </View>
                    <View style={styles.logHeroMetaStack}>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.logHeroMetaLabel,
                          { color: colors.detailLabel },
                        ]}
                      >
                        ID
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.logHeroMetaValue,
                          { color: colors.detailValue },
                        ]}
                      >
                        {shortId || "Sin ID"}
                      </Text>
                    </View>
                  </View>
                </Surface>

                <Surface
                  style={[
                    styles.contextCard,
                    {
                      backgroundColor: colors.detailSurface,
                      borderColor: colors.detailBorder,
                    },
                  ]}
                  elevation={0}
                >
                  <View style={styles.contextHeader}>
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.contextTitle,
                        { color: colors.sectionTitle },
                      ]}
                    >
                      Contexto
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[styles.contextCaption, { color: colors.copy }]}
                    >
                      Quien intervino y a quien afecta.
                    </Text>
                  </View>
                  <View style={styles.detailGrid}>
                    <DetailRow label="Admin" value={log.adminDisplay} />
                    <DetailRow
                      label="Usuario afectado"
                      value={log.userDisplay}
                    />
                  </View>
                </Surface>

                <Surface
                  style={[
                    styles.messageCard,
                    {
                      backgroundColor: colors.sectionSurface,
                      borderColor: colors.sectionBorder,
                    },
                  ]}
                  elevation={0}
                >
                  <View style={styles.messageHeader}>
                    <View
                      style={[
                        styles.messageQuoteMark,
                        { backgroundColor: colors.messageChipSurface },
                      ]}
                    >
                      <Text
                        variant="headlineMedium"
                        style={[
                          styles.messageQuoteText,
                          { color: colors.messageChipText },
                        ]}
                      >
                        {'"'}
                      </Text>
                    </View>
                    <View style={styles.messageHeaderCopy}>
                      <Text
                        variant="labelLarge"
                        style={[
                          styles.messageTitle,
                          { color: colors.sectionTitle },
                        ]}
                      >
                        Mensaje
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={[styles.messageCaption, { color: colors.copy }]}
                      >
                        Texto completo del log sin resumir ni repetir otros
                        datos.
                      </Text>
                    </View>
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={[styles.messageCopy, { color: colors.sectionCopy }]}
                  >
                    {log.message || "Sin mensaje disponible"}
                  </Text>
                </Surface>
              </>
            ) : null}
          </ScrollView>
        </Dialog.ScrollArea>

        <Divider />

        <Dialog.Actions style={styles.dialogActions}>
          <Button
            mode="outlined"
            buttonColor={colors.actionButtonSurface}
            textColor={colors.actionButtonText}
            onPress={onDismiss}
            contentStyle={styles.dialogActionContent}
            style={styles.dialogActionButton}
          >
            Entendido
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const LogsList = () => {
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  const isDark = theme.dark;

  const palette = React.useMemo(
    () => ({
      screen: isDark ? "#020617" : "#eef3fb",
      heroPanel: isDark ? "#0b1220" : "#0f172a",
      heroEyebrow: isDark
        ? "rgba(191, 219, 254, 0.84)"
        : "rgba(191, 219, 254, 0.84)",
      heroCopy: isDark
        ? "rgba(226, 232, 240, 0.88)"
        : "rgba(226, 232, 240, 0.88)",
      title: isDark ? "#f8fafc" : "#0f172a",
      subtitle: isDark ? "#94a3b8" : "#64748b",
      copy: isDark ? "#cbd5e1" : "#475569",
      icon: isDark ? "#cbd5e1" : "#64748b",
      filtersPanel: isDark
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(255, 255, 255, 0.88)",
      searchSurface: isDark ? "rgba(30, 41, 59, 0.92)" : "#ffffff",
      searchText: isDark ? "#e2e8f0" : "#0f172a",
      searchPlaceholder: isDark ? "#94a3b8" : "#94a3b8",
      searchSelection: isDark
        ? "rgba(148, 163, 184, 0.24)"
        : "rgba(15, 23, 42, 0.2)",
      filterLabel: isDark ? "#cbd5e1" : "#475569",
      filterChipBackground: isDark
        ? "rgba(51, 65, 85, 0.88)"
        : "rgba(148, 163, 184, 0.12)",
      filterChipBorder: isDark ? "rgba(148, 163, 184, 0.18)" : "transparent",
      filterChipText: isDark ? "#e2e8f0" : "#475569",
      filterChipSelectedBackground: isDark
        ? "rgba(59, 130, 246, 0.28)"
        : "rgba(37, 99, 235, 0.14)",
      filterChipSelectedBorder: isDark
        ? "rgba(96, 165, 250, 0.38)"
        : "transparent",
      filterChipSelectedText: isDark ? "#dbeafe" : "#1d4ed8",
      cardSurface: isDark
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.94)",
      secondarySurface: isDark
        ? "rgba(30, 41, 59, 0.86)"
        : "rgba(148, 163, 184, 0.08)",
      chipBackground: isDark
        ? "rgba(67, 56, 202, 0.32)"
        : "rgba(67, 56, 202, 0.12)",
      chipText: isDark ? "#e9e7ff" : "#4338ca",
      emptySurface: isDark
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.9)",
      emptyIconWrap: isDark
        ? "rgba(51, 65, 85, 0.88)"
        : "rgba(148, 163, 184, 0.14)",
      dialogSurface: isDark
        ? theme.colors.elevation?.level2 || theme.colors.surface
        : "#fbfcff",
      dialogBorder: isDark
        ? "rgba(96, 165, 250, 0.2)"
        : "rgba(59, 130, 246, 0.14)",
      dialogGlow: isDark
        ? "rgba(56, 189, 248, 0.18)"
        : "rgba(59, 130, 246, 0.12)",
      dialogModeSurface: isDark
        ? "rgba(8, 47, 73, 0.72)"
        : "rgba(219, 234, 254, 0.92)",
      dialogModeText: isDark ? "#7dd3fc" : "#1d4ed8",
      dialogCloseSurface: isDark
        ? "rgba(30, 41, 59, 0.9)"
        : "rgba(226, 232, 240, 0.9)",
      detailSurface: isDark
        ? "rgba(30, 41, 59, 0.86)"
        : "rgba(148, 163, 184, 0.08)",
      detailBorder: isDark
        ? "rgba(125, 211, 252, 0.14)"
        : "rgba(59, 130, 246, 0.08)",
      detailLabel: isDark ? "#94a3b8" : "#64748b",
      detailValue: isDark ? "#f8fafc" : "#0f172a",
      sectionSurface: isDark
        ? "rgba(30, 41, 59, 0.82)"
        : "rgba(59, 130, 246, 0.08)",
      sectionBorder: isDark
        ? "rgba(125, 211, 252, 0.18)"
        : "rgba(59, 130, 246, 0.12)",
      sectionTitle: isDark ? "#bfdbfe" : "#1d4ed8",
      sectionCopy: isDark ? "#e2e8f0" : "#334155",
      heroSurface: isDark ? "#0f172a" : "#eef4ff",
      heroBorder: isDark
        ? "rgba(56, 189, 248, 0.2)"
        : "rgba(59, 130, 246, 0.14)",
      heroMetaSurface: isDark
        ? "rgba(15, 23, 42, 0.92)"
        : "rgba(255, 255, 255, 0.88)",
      heroMetaText: isDark ? "#bfdbfe" : "#1e40af",
      messageChipSurface: isDark
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(255, 255, 255, 0.88)",
      messageChipText: isDark ? "#c4b5fd" : "#5b21b6",
      actionButtonSurface: isDark
        ? "rgba(37, 99, 235, 0.26)"
        : "rgba(37, 99, 235, 0.14)",
      actionButtonText: isDark ? "#dbeafe" : "#1d4ed8",
    }),
    [isDark, theme.colors.elevation, theme.colors.surface],
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("TODOS");
  const [selectedAdmin, setSelectedAdmin] = React.useState("TODOS");
  const [selectedUser, setSelectedUser] = React.useState("TODOS");
  const [fetchLimit, setFetchLimit] = React.useState(100);
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedLogId, setSelectedLogId] = React.useState(null);

  const { ready, totalFetched, logs } = Meteor.useTracker(() => {
    const currentUser = Meteor.user();
    const routeId =
      typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
    const isPrincipalAdmin =
      currentUser?.username === "carlosmbinf" ||
      currentUser?.profile?.role === "admin";

    let query = {};
    if (routeId) {
      query = { $or: [{ userAfectado: routeId }, { userAdmin: routeId }] };
    } else if (isPrincipalAdmin) {
      query = {};
    } else if (currentUser?._id) {
      query = {
        $or: [
          { userAfectado: currentUser._id },
          { userAdmin: currentUser._id },
        ],
      };
    }

    const logsHandle = Meteor.subscribe("logs", query, {
      sort: { createdAt: -1 },
      limit: fetchLimit,
    });

    const logDocs = logsHandle.ready()
      ? Logs.find(query, { sort: { createdAt: -1 }, limit: fetchLimit }).fetch()
      : [];

    const userIds = [
      ...new Set(
        logDocs
          .flatMap((log) => [log.userAdmin, log.userAfectado])
          .filter((value) => value && String(value).toUpperCase() !== "SERVER"),
      ),
    ];

    const usersHandle = userIds.length
      ? Meteor.subscribe(
          "user",
          { _id: { $in: userIds } },
          {
            fields: {
              _id: 1,
              username: 1,
              profile: 1,
            },
          },
        )
      : { ready: () => true };

    const mappedLogs = logDocs.map((log) => {
      const affectedUser = log.userAfectado
        ? Meteor.users.findOne(log.userAfectado, {
            fields: { _id: 1, username: 1, profile: 1 },
          })
        : null;
      const adminUser =
        log.userAdmin && String(log.userAdmin).toUpperCase() !== "SERVER"
          ? Meteor.users.findOne(log.userAdmin, {
              fields: { _id: 1, username: 1, profile: 1 },
            })
          : null;

      const buildDisplayName = (userDoc, fallback) => {
        if (!userDoc) {
          return fallback;
        }

        return (
          `${userDoc?.profile?.firstName || ""} ${userDoc?.profile?.lastName || ""}`.trim() ||
          userDoc.username ||
          fallback
        );
      };

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
      ready: logsHandle.ready() && usersHandle.ready(),
      totalFetched: logDocs.length,
      logs: mappedLogs,
    };
  }, [fetchLimit, id]);

  const typeOptions = React.useMemo(
    () => ["TODOS", ...new Set(logs.map((log) => log.type).filter(Boolean))],
    [logs],
  );
  const adminOptions = React.useMemo(
    () => [
      "TODOS",
      ...new Set(logs.map((log) => log.adminDisplay).filter(Boolean)),
    ],
    [logs],
  );
  const userOptions = React.useMemo(
    () => [
      "TODOS",
      ...new Set(logs.map((log) => log.userDisplay).filter(Boolean)),
    ],
    [logs],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    const matchesText =
      !normalizedQuery ||
      [log.message, log.type, log.adminDisplay, log.userDisplay]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));

    const matchesType = selectedType === "TODOS" || log.type === selectedType;
    const matchesAdmin =
      selectedAdmin === "TODOS" || log.adminDisplay === selectedAdmin;
    const matchesUser =
      selectedUser === "TODOS" || log.userDisplay === selectedUser;

    return matchesText && matchesType && matchesAdmin && matchesUser;
  });

  const activeFilterCount = [
    Boolean(searchQuery.trim()),
    selectedType !== "TODOS",
    selectedAdmin !== "TODOS",
    selectedUser !== "TODOS",
  ].filter(Boolean).length;

  const selectedLog =
    filteredLogs.find((log) => log._id === selectedLogId) ||
    logs.find((log) => log._id === selectedLogId) ||
    null;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("TODOS");
    setSelectedAdmin("TODOS");
    setSelectedUser("TODOS");
  };

  const renderLogCard = ({ item }) => {
    const tone = getLogTone(item.type);

    return (
      <Pressable
        onPress={() => setSelectedLogId(item._id)}
        style={({ pressed }) => [pressed && styles.logCardPressed]}
      >
        <Surface
          style={[styles.logCard, { backgroundColor: palette.cardSurface }]}
          elevation={0}
        >
          <View style={styles.logCardHeader}>
            <View
              style={[styles.logIconWrap, { backgroundColor: tone.background }]}
            >
              <IconButton
                icon="clipboard-text-clock-outline"
                size={18}
                iconColor={tone.accent}
              />
            </View>
            <View style={styles.logHeaderCopy}>
              <View style={styles.logTitleRow}>
                <Text
                  variant="titleSmall"
                  style={[styles.logCardTitle, { color: palette.title }]}
                  numberOfLines={1}
                >
                  {item.type || "Evento"}
                </Text>
                <Chip
                  compact
                  style={[
                    styles.logToneChip,
                    { backgroundColor: tone.background },
                  ]}
                  textStyle={[styles.logToneChipText]}
                >
                  {tone.label}
                </Chip>
              </View>
              <Text
                variant="bodySmall"
                style={[styles.logCardSubtitle, { color: palette.subtitle }]}
                numberOfLines={1}
              >
                {formatLogDate(item.createdAt)}
              </Text>
            </View>
            <IconButton
              icon="chevron-right"
              size={18}
              iconColor={palette.icon}
              style={styles.logChevron}
              onPress={() => setSelectedLogId(item._id)}
            />
          </View>

          <View style={styles.logMetaRow}>
            <Text
              variant="labelSmall"
              style={[styles.logMetaText, { color: palette.copy }]}
            >
              Admin: {item.adminDisplay}
            </Text>
            <View
              style={[styles.logMetaDot, { backgroundColor: palette.subtitle }]}
            />
            <Text
              variant="labelSmall"
              style={[styles.logMetaText, { color: palette.copy }]}
            >
              Usuario: {item.userDisplay}
            </Text>
          </View>

          <Text
            variant="bodySmall"
            style={[styles.logMessageText, { color: palette.copy }]}
            numberOfLines={2}
          >
            {item.message || "Sin mensaje disponible"}
          </Text>
        </Surface>
      </Pressable>
    );
  };

  if (!ready) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.screen }]}>
        <AppHeader
          title="Registro de logs"
          subtitle="Cargando auditoría operativa"
          showBackButton
          backHref="/(normal)/Main"
        />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyMedium"
            style={[styles.loadingCopy, { color: palette.subtitle }]}
          >
            Consultando la colección de eventos y resolviendo usuarios
            relacionados.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <AppHeader
        title="Registro de logs"
        subtitle={`${totalFetched} eventos cargados`}
        showBackButton
        backHref="/(normal)/Main"
        actions={
          <IconButton
            icon={showFilters ? "filter-remove-outline" : "filter-outline"}
            iconColor="#ffffff"
            onPress={() => setShowFilters((current) => !current)}
          />
        }
      />

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item._id}
        renderItem={renderLogCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            {showFilters ? (
              <Surface
                style={[
                  styles.filtersPanel,
                  { backgroundColor: palette.filtersPanel },
                ]}
                elevation={0}
              >
                <SearchInput
                  colors={{
                    cursor: palette.searchText,
                    icon: palette.icon,
                    placeholder: palette.searchPlaceholder,
                    selection: palette.searchSelection,
                    surface: palette.searchSurface,
                    text: palette.searchText,
                  }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar por mensaje, tipo, admin o usuario"
                />
                <FilterGroup
                  colors={{
                    background: palette.filterChipBackground,
                    border: palette.filterChipBorder,
                    label: palette.filterLabel,
                    selectedBackground: palette.filterChipSelectedBackground,
                    selectedBorder: palette.filterChipSelectedBorder,
                    selectedText: palette.filterChipSelectedText,
                    text: palette.filterChipText,
                  }}
                  label="Tipo"
                  options={typeOptions}
                  selectedValue={selectedType}
                  onSelect={setSelectedType}
                />
                <FilterGroup
                  colors={{
                    background: palette.filterChipBackground,
                    border: palette.filterChipBorder,
                    label: palette.filterLabel,
                    selectedBackground: palette.filterChipSelectedBackground,
                    selectedBorder: palette.filterChipSelectedBorder,
                    selectedText: palette.filterChipSelectedText,
                    text: palette.filterChipText,
                  }}
                  label="Admin"
                  options={adminOptions}
                  selectedValue={selectedAdmin}
                  onSelect={setSelectedAdmin}
                />
                <FilterGroup
                  colors={{
                    background: palette.filterChipBackground,
                    border: palette.filterChipBorder,
                    label: palette.filterLabel,
                    selectedBackground: palette.filterChipSelectedBackground,
                    selectedBorder: palette.filterChipSelectedBorder,
                    selectedText: palette.filterChipSelectedText,
                    text: palette.filterChipText,
                  }}
                  label="Usuario"
                  options={userOptions}
                  selectedValue={selectedUser}
                  onSelect={setSelectedUser}
                />
                <FilterGroup
                  colors={{
                    background: palette.filterChipBackground,
                    border: palette.filterChipBorder,
                    label: palette.filterLabel,
                    selectedBackground: palette.filterChipSelectedBackground,
                    selectedBorder: palette.filterChipSelectedBorder,
                    selectedText: palette.filterChipSelectedText,
                    text: palette.filterChipText,
                  }}
                  label="Límite"
                  options={LIMIT_OPTIONS.map(String)}
                  selectedValue={String(fetchLimit)}
                  onSelect={(value) => setFetchLimit(Number(value))}
                />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterFooter}>
                    <Chip
                      style={[
                        styles.filterCountChip,
                        { backgroundColor: palette.chipBackground },
                      ]}
                      textStyle={[
                        styles.filterCountChipText,
                        { color: palette.chipText },
                      ]}
                    >
                      {activeFilterCount} filtro
                      {activeFilterCount > 1 ? "s" : ""} activo
                      {activeFilterCount > 1 ? "s" : ""}
                    </Chip>
                    <Button mode="text" onPress={clearFilters}>
                      Limpiar
                    </Button>
                  </View>
                ) : null}
              </Surface>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            colors={{
              copy: palette.copy,
              icon: palette.icon,
              iconWrap: palette.emptyIconWrap,
              surface: palette.emptySurface,
              title: palette.title,
            }}
            hasLogs={logs.length > 0}
            onClearFilters={clearFilters}
          />
        }
      />

      <LogDetailsDialog
        colors={palette}
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
    paddingHorizontal: 28,
  },
  loadingCopy: {
    textAlign: "center",
  },
  listContent: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerContent: {
    gap: 16,
  },
  heroPanel: {
    borderRadius: 28,
    gap: 14,
    padding: 22,
  },
  heroEyebrow: {
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroHeadline: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  heroCopy: {
    lineHeight: 22,
  },
  filtersPanel: {
    borderRadius: 24,
    gap: 14,
    padding: 18,
  },
  searchInputSurface: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: 6,
  },
  searchLeadingIcon: {
    margin: 0,
  },
  searchTrailingIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    textTransform: "uppercase",
  },
  filterValuesRow: {
    gap: 10,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontWeight: "600",
  },
  filterFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterCountChip: {
    borderRadius: 999,
  },
  filterCountChipText: {
    fontWeight: "700",
  },
  logCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  logCard: {
    borderRadius: 20,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  logIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  logHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  logTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  logCardTitle: {
    fontWeight: "800",
    lineHeight: 20,
  },
  logCardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  logToneChip: {
    borderRadius: 999,
    // height: 50,
    maxWidth: 140,
  },
  logToneChipText: {
    fontSize: 8,
    // fontWeight: "700",
  },
  logChevron: {
    margin: 0,
  },
  logMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  logMetaText: {
    fontSize: 11,
    lineHeight: 16,
  },
  logMetaDot: {
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  logMessageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyStateCard: {
    alignItems: "center",
    borderRadius: 28,
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyIconWrap: {
    borderRadius: 999,
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCopy: {
    lineHeight: 21,
    textAlign: "center",
  },
  dialog: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 32,
    overflow: "hidden",
  },
  dialogHeaderWrap: {
    gap: 2,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  dialogHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  dialogHeaderCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  dialogKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dialogTitle: {
    fontWeight: "800",
  },
  dialogSubtitle: {
    lineHeight: 19,
  },
  dialogCloseButton: {
    margin: 0,
  },
  dialogScrollArea: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  dialogScroll: {
    flexGrow: 0,
  },
  dialogContent: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  logHeroCard: {
    borderWidth: 1,
    borderRadius: 26,
    gap: 12,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  logHeroRail: {
    borderRadius: 999,
    height: "72%",
    left: 0,
    opacity: 0.9,
    position: "absolute",
    top: 18,
    width: 5,
  },
  logHeroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  logHeroRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    paddingLeft: 12,
  },
  logHeroPrimary: {
    flex: 1,
    gap: 8,
  },
  logHeroTitle: {
    lineHeight: 28,
    fontWeight: "800",
  },
  logHeroSupport: {
    lineHeight: 20,
  },
  logHeroMetaStack: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 72,
  },
  logHeroMetaLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  logHeroMetaValue: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
  },
  toneChip: {
    borderRadius: 999,
  },
  toneChipText: {
    fontWeight: "700",
  },
  secondaryToneChip: {
    borderRadius: 999,
  },
  secondaryToneChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contextCard: {
    borderWidth: 1,
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  contextHeader: {
    gap: 3,
  },
  contextTitle: {
    fontWeight: "800",
  },
  contextCaption: {
    lineHeight: 18,
  },
  detailRow: {
    borderWidth: 1,
    borderRadius: 16,
    gap: 4,
    minWidth: 160,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  detailValue: {
    lineHeight: 19,
    fontWeight: "600",
  },
  messageCard: {
    borderWidth: 1,
    borderRadius: 24,
    gap: 12,
    padding: 18,
  },
  messageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  messageQuoteMark: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  messageQuoteText: {
    fontWeight: "800",
    lineHeight: 32,
  },
  messageHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  messageTitle: {
    fontWeight: "800",
  },
  messageCaption: {
    lineHeight: 18,
  },
  messageCopy: {
    fontSize: 15,
    lineHeight: 24,
  },
  dialogActions: {
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dialogActionButton: {
    borderRadius: 999,
  },
  dialogActionContent: {
    minHeight: 42,
    paddingHorizontal: 10,
  },
});

export default LogsList;
