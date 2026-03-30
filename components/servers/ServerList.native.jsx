import MeteorBase from "@meteorrn/core";
import React from "react";
import {
    Alert,
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
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import AppHeader from "../Header/AppHeader";
import { ServersCollection } from "../collections/collections";
import DialogServer from "./DialogServer";
import {
    canRestartServer,
    formatServerDateTime,
    formatServerRelativeTime,
    getServerStatusMeta,
    normalizeServerRecord,
} from "./serverUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const ACTIVATION_OPTIONS = ["TODOS", "ACTIVADOS", "DESACTIVADOS"];

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
              selected && [
                styles.filterChipSelected,
                {
                  backgroundColor: colors.selectedBackground,
                  borderColor: colors.selectedBorder,
                },
              ],
            ]}
            textStyle={[
              styles.filterChipText,
              { color: colors.text },
              selected && [
                styles.filterChipTextSelected,
                { color: colors.selectedText },
              ],
            ]}
          >
            {option}
          </Chip>
        );
      })}
    </ScrollView>
  </View>
);

const SummaryCard = ({ colors, compact, label, tone, value }) => (
  <Surface
    style={[
      styles.summaryCard,
      compact && styles.summaryCardCompact,
      { backgroundColor: colors.surface },
    ]}
    elevation={0}
  >
    <Text
      variant="labelMedium"
      style={[styles.summaryLabel, { color: colors.label }]}
    >
      {label}
    </Text>
    <Text
      variant="headlineSmall"
      style={[styles.summaryValue, tone ? { color: tone } : null]}
    >
      {value}
    </Text>
  </Surface>
);

const EmptyState = ({ colors, hasServers }) => (
  <Surface
    style={[styles.emptyStateCard, { backgroundColor: colors.surface }]}
    elevation={0}
  >
    <View style={[styles.emptyIconWrap, { backgroundColor: colors.iconWrap }]}>
      <IconButton icon="server-network-off" size={34} iconColor={colors.icon} />
    </View>
    <Text
      variant="titleMedium"
      style={[styles.emptyTitle, { color: colors.title }]}
    >
      {hasServers ? "No hay coincidencias" : "No hay servidores publicados"}
    </Text>
    <Text
      variant="bodyMedium"
      style={[styles.emptyCopy, { color: colors.copy }]}
    >
      {hasServers
        ? "Ajusta la busqueda o los filtros para volver a ver servidores en la lista."
        : "La suscripcion esta lista, pero la coleccion no devolvio servidores para mostrar en esta ruta."}
    </Text>
  </Surface>
);

const ServerList = () => {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompactScreen = windowWidth < 580;
  const isDark = theme.dark;

  const palette = React.useMemo(
    () => ({
      screen: isDark ? "#020617" : "#eef3fb",
      loadingCopy: isDark ? "#94a3b8" : "#64748b",
      heroPanel: isDark ? "#0b1220" : "#0f172a",
      summarySurface: isDark
        ? "rgba(15, 23, 42, 0.88)"
        : "rgba(255, 255, 255, 0.9)",
      summaryLabel: isDark ? "#94a3b8" : "#64748b",
      filtersPanel: isDark
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(255, 255, 255, 0.88)",
      searchSurface: isDark ? "rgba(30, 41, 59, 0.92)" : "#ffffff",
      searchText: isDark ? "#e2e8f0" : "#0f172a",
      searchPlaceholder: isDark ? "#94a3b8" : "#94a3b8",
      searchSelection: isDark
        ? "rgba(148, 163, 184, 0.24)"
        : "rgba(15, 23, 42, 0.2)",
      searchIcon: isDark ? "#cbd5e1" : "#64748b",
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
      cardTitle: isDark ? "#f8fafc" : "#0f172a",
      cardSubtitle: isDark ? "#94a3b8" : "#64748b",
      metaChipBackground: isDark
        ? "rgba(67, 56, 202, 0.32)"
        : "rgba(67, 56, 202, 0.12)",
      metaChipText: isDark ? "#e9e7ff" : "#4338ca",
      metricSurface: isDark
        ? "rgba(30, 41, 59, 0.86)"
        : "rgba(148, 163, 184, 0.08)",
      metricLabel: isDark ? "#94a3b8" : "#64748b",
      metricValue: isDark ? "#f8fafc" : "#0f172a",
      description: isDark ? "#cbd5e1" : "#475569",
      emptySurface: isDark
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.9)",
      emptyIconWrap: isDark
        ? "rgba(51, 65, 85, 0.88)"
        : "rgba(148, 163, 184, 0.14)",
      emptyIcon: isDark ? "#cbd5e1" : "#334155",
      emptyTitle: isDark ? "#f8fafc" : "#0f172a",
      emptyCopy: isDark ? "#94a3b8" : "#64748b",
    }),
    [isDark],
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("TODOS");
  const [selectedActivation, setSelectedActivation] = React.useState("TODOS");
  const [selectedServerId, setSelectedServerId] = React.useState(null);
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [restartingId, setRestartingId] = React.useState(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const { ready, servers } = Meteor.useTracker(() => {
    const subscriptionReady = Meteor.subscribe("servers").ready();
    const docs = subscriptionReady
      ? ServersCollection.find({}, { sort: { ip: -1 } }).fetch()
      : [];

    return {
      ready: subscriptionReady,
      servers: docs.map(normalizeServerRecord),
    };
  });

  const statusOptions = [
    "TODOS",
    ...new Set(servers.map((server) => server.estado).filter(Boolean)),
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredServers = servers.filter((server) => {
    const matchesText =
      !normalizedQuery ||
      [
        server.displayName,
        server.domain,
        server.ip,
        server.estado,
        server.details,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));

    const matchesStatus =
      selectedStatus === "TODOS" || server.estado === selectedStatus;

    const matchesActivation =
      selectedActivation === "TODOS" ||
      (selectedActivation === "ACTIVADOS" ? server.active : !server.active);

    return matchesText && matchesStatus && matchesActivation;
  });

  const activeCount = servers.filter(
    (server) => server.estado === "ACTIVO",
  ).length;
  const pendingCount = servers.filter(
    (server) => server.estado === "PENDIENTE_A_REINICIAR",
  ).length;
  const enabledCount = servers.filter((server) => server.active).length;
  const selectedServer =
    servers.find((server) => server._id === selectedServerId) || null;

  const closeDialog = () => {
    setDialogVisible(false);
    setSelectedServerId(null);
  };

  const openDialog = (serverId) => {
    setSelectedServerId(serverId);
    setDialogVisible(true);
  };

  const requestRestart = (server) => {
    const serverId = server?._id;
    if (!serverId) {
      return;
    }

    setRestartingId(serverId);
    Meteor.call(
      "actualizarEstadoServer",
      serverId,
      {
        estado: "PENDIENTE_A_REINICIAR",
        idUserSolicitandoReinicio: Meteor.userId(),
      },
      (error) => {
        setRestartingId((current) => (current === serverId ? null : current));

        if (error) {
          Alert.alert(
            "No se pudo registrar el reinicio",
            error?.message ||
              "Ocurrio un problema enviando la solicitud al servidor.",
          );
        }
      },
    );
  };

  const renderServerCard = ({ item }) => {
    const statusMeta = getServerStatusMeta(item.estado, item.active);
    const restarting =
      restartingId === item._id || item.estado === "PENDIENTE_A_REINICIAR";
    const canRestart = canRestartServer(item) && !restarting;

    return (
      <Pressable
        onPress={() => openDialog(item._id)}
        style={({ pressed }) => [pressed && styles.serverCardPressed]}
      >
        <Surface
          style={[styles.serverCard, { backgroundColor: palette.cardSurface }]}
          elevation={0}
        >
          <View style={styles.serverCardHeader}>
            <View
              style={[
                styles.serverIconWrap,
                { backgroundColor: statusMeta.background },
              ]}
            >
              <IconButton
                icon={statusMeta.icon}
                size={24}
                iconColor={statusMeta.accent}
              />
            </View>
            <View style={styles.serverHeading}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={[styles.serverTitle, { color: palette.cardTitle }]}
              >
                {item.displayName}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={[styles.serverSubtitle, { color: palette.cardSubtitle }]}
              >
                {item.domain}
              </Text>
            </View>
            <Chip
              compact
              style={[
                styles.statusChip,
                { backgroundColor: statusMeta.background },
              ]}
              textStyle={[
                styles.statusChipText,
                { color: statusMeta.textColor },
              ]}
            >
              {statusMeta.label}
            </Chip>
          </View>

          <View style={styles.inlineMetaRow}>
            <Chip
              compact
              icon={item.active ? "power-plug" : "power-plug-off"}
              style={[
                styles.metaChip,
                { backgroundColor: palette.metaChipBackground },
              ]}
              textStyle={[styles.metaChipText, { color: palette.metaChipText }]}
            >
              {item.active ? "Activado" : "Desactivado"}
            </Chip>
            <Chip
              compact
              icon="account-key-outline"
              style={[
                styles.metaChip,
                { backgroundColor: palette.metaChipBackground },
              ]}
              textStyle={[styles.metaChipText, { color: palette.metaChipText }]}
            >
              {item.usuariosAprobadosCount} usuarios VPN
            </Chip>
            <Chip
              compact
              icon="clock-outline"
              style={[
                styles.metaChip,
                { backgroundColor: palette.metaChipBackground },
              ]}
              textStyle={[styles.metaChipText, { color: palette.metaChipText }]}
            >
              {formatServerRelativeTime(item.lastSignal)}
            </Chip>
          </View>

          <View style={styles.metricsRow}>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: palette.metricSurface },
              ]}
            >
              <Text
                variant="labelSmall"
                style={[styles.metricLabel, { color: palette.metricLabel }]}
              >
                IP del servidor
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.metricValue, { color: palette.metricValue }]}
              >
                {item.ip}
              </Text>
            </View>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: palette.metricSurface },
              ]}
            >
              <Text
                variant="labelSmall"
                style={[styles.metricLabel, { color: palette.metricLabel }]}
              >
                Ultima senal
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.metricValue, { color: palette.metricValue }]}
              >
                {formatServerDateTime(item.lastSignal)}
              </Text>
            </View>
          </View>

          <Text
            variant="bodyMedium"
            numberOfLines={2}
            style={[styles.serverDescription, { color: palette.description }]}
          >
            {item.description}
          </Text>

          <View style={styles.actionsRow}>
            <Button
              mode="text"
              icon="eye-outline"
              onPress={() => openDialog(item._id)}
            >
              Ver detalle
            </Button>
            <Button
              mode="contained"
              icon="restart"
              onPress={() => requestRestart(item)}
              disabled={!canRestart}
              loading={restarting}
            >
              {restarting ? "Reiniciando" : "Reiniciar conexion VPN"}
            </Button>
          </View>
        </Surface>
      </Pressable>
    );
  };

  if (!ready) {
    return (
      <View style={styles.loadingScreen}>
        <AppHeader
          title="Servidores"
          subtitle="Cargando estado operativo"
          showBackButton
          backHref="/(normal)/Main"
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyMedium"
            style={[styles.loadingCopy, { color: palette.loadingCopy }]}
          >
            Cargando Datos...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <AppHeader
        title="Servidores"
        subtitle={`${servers.length} registros en infraestructura`}
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
        data={filteredServers}
        keyExtractor={(item) => item._id}
        renderItem={renderServerCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Surface style={[styles.heroPanel]} elevation={0}>
              <Text variant="labelLarge" style={styles.heroEyebrow}>
                Control operativo
              </Text>
              <Text variant="headlineSmall" style={styles.heroHeadline}>
                Gestiona el estado de los nodos VPN desde la app.
              </Text>
              {/* <Text variant="bodyMedium" style={styles.heroCopy}>
                La ruta mantiene el flujo legacy de reinicio via Meteor y suma
                lectura clara de estado, activacion y ultima senal para revisar
                la infraestructura sin salir del movil.
              </Text> */}

              <View style={styles.summaryGrid}>
                <SummaryCard
                  colors={{
                    label: palette.summaryLabel,
                    surface: palette.summarySurface,
                  }}
                  compact={isCompactScreen}
                  label="Registrados"
                  tone="#1d4ed8"
                  value={servers.length}
                />
                <SummaryCard
                  colors={{
                    label: palette.summaryLabel,
                    surface: palette.summarySurface,
                  }}
                  compact={isCompactScreen}
                  label="Activos"
                  tone="#059669"
                  value={activeCount}
                />
                <SummaryCard
                  colors={{
                    label: palette.summaryLabel,
                    surface: palette.summarySurface,
                  }}
                  compact={isCompactScreen}
                  label="Activados"
                  tone="#7c3aed"
                  value={enabledCount}
                />
                <SummaryCard
                  colors={{
                    label: palette.summaryLabel,
                    surface: palette.summarySurface,
                  }}
                  compact={isCompactScreen}
                  label="Pendientes"
                  tone="#d97706"
                  value={pendingCount}
                />
              </View>
            </Surface>

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
                    icon: palette.searchIcon,
                    placeholder: palette.searchPlaceholder,
                    selection: palette.searchSelection,
                    surface: palette.searchSurface,
                    text: palette.searchText,
                  }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar por nombre, dominio, IP o estado"
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
                  label="Estado"
                  options={statusOptions}
                  selectedValue={selectedStatus}
                  onSelect={setSelectedStatus}
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
                  label="Activacion"
                  options={ACTIVATION_OPTIONS}
                  selectedValue={selectedActivation}
                  onSelect={setSelectedActivation}
                />
              </Surface>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            colors={{
              copy: palette.emptyCopy,
              icon: palette.emptyIcon,
              iconWrap: palette.emptyIconWrap,
              surface: palette.emptySurface,
              title: palette.emptyTitle,
            }}
            hasServers={servers.length > 0}
          />
        }
      />

      <DialogServer
        visible={dialogVisible}
        hideDialog={closeDialog}
        data={selectedServer}
        restarting={restartingId === selectedServer?._id}
        onRestart={requestRestart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingScreen: {
    // backgroundColor: "#eef3fb",
    flex: 1,
  },
  loadingContent: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  loadingCopy: {
    color: "#64748b",
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
    // backgroundColor: "#0f172a",
    borderRadius: 28,
    gap: 14,
    padding: 22,
  },
  heroEyebrow: {
    // color: "rgba(191, 219, 254, 0.84)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroHeadline: {
    // color: "#f8fafc",
    fontWeight: "800",
  },
  heroCopy: {
    color: "rgba(226, 232, 240, 0.88)",
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    gap: 6,
    minWidth: 148,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryCardCompact: {
    minWidth: "47%",
  },
  summaryLabel: {
    color: "#64748b",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontWeight: "800",
  },
  filtersPanel: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 24,
    gap: 14,
    padding: 18,
  },
  searchInputSurface: {
    alignItems: "center",
    backgroundColor: "#ffffff",
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
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    color: "#475569",
    textTransform: "uppercase",
  },
  filterValuesRow: {
    gap: 10,
    paddingRight: 8,
  },
  filterChip: {
    borderWidth: 1,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 999,
  },
  filterChipText: {
    fontWeight: "600",
  },
  filterChipSelected: {
    backgroundColor: "rgba(37, 99, 235, 0.14)",
  },
  filterChipTextSelected: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  serverCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  serverCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 26,
    gap: 16,
    padding: 18,
  },
  serverCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  serverIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  serverHeading: {
    flex: 1,
    gap: 4,
  },
  serverTitle: {
    fontWeight: "800",
  },
  serverSubtitle: {
    color: "#64748b",
  },
  statusChip: {
    borderRadius: 999,
    maxWidth: 170,
  },
  statusChipText: {
    fontWeight: "700",
  },
  inlineMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaChip: {
    borderRadius: 999,
  },
  metaChipText: {
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderRadius: 18,
    flex: 1,
    gap: 6,
    minWidth: 150,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricLabel: {
    color: "#64748b",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  metricValue: {
    fontWeight: "600",
  },
  serverDescription: {
    color: "#475569",
    lineHeight: 21,
  },
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  emptyStateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 28,
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyIconWrap: {
    backgroundColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 999,
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCopy: {
    color: "#64748b",
    lineHeight: 21,
    textAlign: "center",
  },
});

export default ServerList;
