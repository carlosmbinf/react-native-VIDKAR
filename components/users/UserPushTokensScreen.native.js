import MeteorBase from "@meteorrn/core";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Chip,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { PushTokens } from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import {
  buildDeviceViewModel,
  buildPushDashboard,
  PUSH_TOKEN_FIELDS,
  PUSH_TOKEN_SORT_UPDATED,
} from "./pushTokens/utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const SORT_OPTIONS = [
  { value: "UPDATED", label: "Actualización" },
  { value: "TOKEN", label: "Token" },
];
const DEVICE_SEARCH_FIELDS = [
  "token",
  "tokenLabel",
  "deviceId",
  "raw",
  "androidVersionLabel",
];

const getUserLabel = (user) => {
  const firstName =
    typeof user?.profile?.firstName === "string"
      ? user.profile.firstName.trim()
      : "";
  const lastName =
    typeof user?.profile?.lastName === "string"
      ? user.profile.lastName.trim()
      : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  return user?.username || "Usuario";
};

const buildPalette = (theme) => {
  const isDark = theme.dark;

  return {
    screen: theme.colors.background,
    panel: theme.colors.elevation?.level1 || theme.colors.surface,
    panelSecondary:
      theme.colors.elevation?.level2 || theme.colors.surfaceVariant,
    subtle: theme.colors.onSurfaceVariant,
    info: "#3b82f6",
    android: "#22c55e",
    ios: "#a855f7",
    warning: "#f59e0b",
    delete: theme.colors.error,
    tokenBackground: isDark
      ? "rgba(15, 23, 42, 0.88)"
      : "rgba(248, 250, 252, 0.96)",
    chipBackground: isDark
      ? "rgba(51, 65, 85, 0.74)"
      : "rgba(226, 232, 240, 0.9)",
    chipBorder: "rgba(148, 163, 184, 0.18)",
    chipText: theme.colors.onSurface,
    chipSelectedBackground: isDark
      ? "rgba(59, 130, 246, 0.28)"
      : "rgba(37, 99, 235, 0.12)",
    chipSelectedBorder: isDark
      ? "rgba(96, 165, 250, 0.42)"
      : "rgba(37, 99, 235, 0.2)",
    chipSelectedText: isDark ? "#dbeafe" : "#1d4ed8",
  };
};

const SearchField = ({ value, onChangeText }) => (
  <TextInput
    mode="outlined"
    label="Filtrar por token"
    placeholder="Escribe parte del token o device id"
    value={value}
    onChangeText={onChangeText}
    autoCapitalize="none"
    autoCorrect={false}
    left={<TextInput.Icon icon="magnify" />}
    right={
      value ? <TextInput.Icon icon="close" onPress={() => onChangeText("")} /> : null
    }
  />
);

const FilterGroup = ({ label, options, selectedValue, onSelect, colors }) => (
  <View style={styles.filterGroup}>
    <Text variant="labelMedium" style={[styles.filterLabel, { color: colors.label }]}>
      {label}
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterValuesRow}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <Chip
            key={option.value}
            compact
            mode="outlined"
            selected={isSelected}
            onPress={() => onSelect(option.value)}
            style={[
              styles.filterChip,
              {
                backgroundColor: isSelected
                  ? colors.selectedBackground
                  : colors.background,
                borderColor: isSelected ? colors.selectedBorder : colors.border,
              },
            ]}
            textStyle={[
              styles.filterChipText,
              { color: isSelected ? colors.selectedText : colors.text },
            ]}
          >
            {option.label}
          </Chip>
        );
      })}
    </ScrollView>
  </View>
);

const SummaryMetric = ({ label, value, tone, surface }) => (
  <Surface
    elevation={0}
    style={[styles.summaryCard, { backgroundColor: surface, borderColor: tone }]}
  >
    <Text variant="labelSmall" style={styles.summaryLabel}>
      {label}
    </Text>
    <Text variant="headlineSmall" style={styles.summaryValue}>
      {value}
    </Text>
  </Surface>
);

const DeviceRow = ({ item, deleting, onDelete, colors, theme }) => {
  const Icon = item.iconComponent;

  return (
    <Surface
      elevation={0}
      style={[styles.deviceCard, { backgroundColor: colors.panel }]}
    >
      <View style={styles.deviceRowHeader}>
        <View style={styles.deviceIdentity}>
          <Surface
            elevation={0}
            style={[
              styles.deviceIconWrap,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Icon color={theme.colors.primary} name={item.icon} size={20} />
          </Surface>

          <View style={styles.deviceCopy}>
            <Text variant="titleSmall" style={styles.deviceTitle}>
              {item.title}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.deviceSubtitle, { color: colors.subtle }]}
            >
              {item.meta.platformLabel}
              {item.meta.providerLabel ? ` · ${item.meta.providerLabel}` : ""}
              {item.meta.androidVersionLabel !== "No disponible"
                ? ` · ${item.meta.androidVersionLabel}`
                : ""}
            </Text>
          </View>
        </View>

        <Button
          mode="text"
          icon="delete-outline"
          compact
          loading={deleting}
          disabled={deleting}
          onPress={() => onDelete(item)}
          textColor={colors.delete}
        >
          Eliminar
        </Button>
      </View>

      <Surface
        elevation={0}
        style={[styles.tokenBlock, { backgroundColor: colors.tokenBackground }]}
      >
        <Text
          variant="labelSmall"
          style={[styles.tokenLabel, { color: colors.subtle }]}
        >
          Token
        </Text>
        <Text selectable variant="bodyMedium" style={styles.tokenValue}>
          {item.token || "No disponible"}
        </Text>
      </Surface>

      <View style={styles.deviceMetaGrid}>
        <View style={styles.deviceMetaItem}>
          <Text
            variant="labelSmall"
            style={[styles.deviceMetaLabel, { color: colors.subtle }]}
          >
            Build app
          </Text>
          <Text variant="bodyMedium" style={styles.deviceMetaValue}>
            {item.meta.buildNumber}
          </Text>
        </View>

        <View style={styles.deviceMetaItem}>
          <Text
            variant="labelSmall"
            style={[styles.deviceMetaLabel, { color: colors.subtle }]}
          >
            Versión app
          </Text>
          <Text variant="bodyMedium" style={styles.deviceMetaValue}>
            {item.meta.appVersion}
          </Text>
        </View>

        <View style={styles.deviceMetaItem}>
          <Text
            variant="labelSmall"
            style={[styles.deviceMetaLabel, { color: colors.subtle }]}
          >
            Dispositivo
          </Text>
          <Text variant="bodyMedium" style={styles.deviceMetaValue}>
            {item.meta.osVersion}
          </Text>
        </View>

        <View style={styles.deviceMetaItem}>
          <Text
            variant="labelSmall"
            style={[styles.deviceMetaLabel, { color: colors.subtle }]}
          >
            Actualizado
          </Text>
          <Text variant="bodyMedium" style={styles.deviceMetaValue}>
            {item.updatedAtLabel}
          </Text>
        </View>
      </View>

      <View style={styles.deviceFooter}>
        <Chip compact icon="identifier" style={styles.deviceInfoChip}>
          {item.deviceId || "Sin deviceId"}
        </Chip>
        <Text variant="bodySmall" style={{ color: colors.subtle }}>
          Registrado: {item.createdAtLabel}
        </Text>
      </View>
    </Surface>
  );
};

const UserPushTokensScreen = () => {
  const theme = useTheme();
  const palette = React.useMemo(() => buildPalette(theme), [theme]);
  const params = useLocalSearchParams();
  const routeUserId = React.useMemo(
    () => (Array.isArray(params.item) ? params.item[0] : params.item),
    [params.item],
  );
  const routeUsername = React.useMemo(
    () => (Array.isArray(params.username) ? params.username[0] : params.username),
    [params.username],
  );
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedSort, setSelectedSort] = React.useState("UPDATED");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deletingIds, setDeletingIds] = React.useState(() => new Set());
  const [dismissedIds, setDismissedIds] = React.useState(() => new Set());

  const { ready, user, devices } = Meteor.useTracker(() => {
    if (!routeUserId) {
      return { ready: false, user: null, devices: [] };
    }

    const userHandle = Meteor.subscribe("user", { _id: routeUserId });
    const tokenHandle = Meteor.subscribe(
      "push_tokens",
      { userId: routeUserId },
      {
        fields: PUSH_TOKEN_FIELDS,
        sort: PUSH_TOKEN_SORT_UPDATED,
      },
    );

    return {
      ready: userHandle.ready() && tokenHandle.ready(),
      user: Meteor.users.findOne({ _id: routeUserId }),
      devices: PushTokens.find(
        { userId: routeUserId },
        {
          fields: PUSH_TOKEN_FIELDS,
          sort: PUSH_TOKEN_SORT_UPDATED,
        },
      ).fetch(),
    };
  }, [routeUserId]);

  const parsedDevices = React.useMemo(
    () => devices.map((device, index) => buildDeviceViewModel(device, index)),
    [devices],
  );

  const visibleDevices = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = parsedDevices.filter((device) => {
      if (dismissedIds.has(device._id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return DEVICE_SEARCH_FIELDS.map((field) =>
        Object.prototype.hasOwnProperty.call(device, field)
          ? device[field]
          : device.meta?.[field],
      )
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedQuery),
        );
    });

    return filtered.sort((left, right) => {
      if (selectedSort === "TOKEN") {
        return String(left.token || "").localeCompare(
          String(right.token || ""),
          "es",
        );
      }

      return (
        new Date(right.updatedAt || right.createdAt || 0).getTime() -
        new Date(left.updatedAt || left.createdAt || 0).getTime()
      );
    });
  }, [dismissedIds, parsedDevices, searchQuery, selectedSort]);

  const dashboard = React.useMemo(
    () => buildPushDashboard(visibleDevices),
    [visibleDevices],
  );

  const activeFiltersCount = React.useMemo(
    () =>
      [selectedSort !== "UPDATED", searchQuery.trim().length > 0].filter(Boolean)
        .length,
    [searchQuery, selectedSort],
  );

  const handleBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (routeUserId) {
      router.replace({
        pathname: "/(normal)/User",
        params: { item: routeUserId },
      });
      return;
    }

    router.replace("/(normal)/Users");
  }, [routeUserId]);

  const clearFilters = React.useCallback(() => {
    setSelectedSort("UPDATED");
    setSearchQuery("");
  }, []);

  const handleDelete = React.useCallback((device) => {
    Alert.alert(
      "Eliminar dispositivo",
      "Este registro de push token dejará de estar asociado al usuario. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setDeletingIds((current) => {
              const next = new Set(current);
              next.add(device._id);
              return next;
            });

            Meteor.call(
              "push.unregisterToken",
              { token: device.token, userId: device.userId },
              (error) => {
                setDeletingIds((current) => {
                  const next = new Set(current);
                  next.delete(device._id);
                  return next;
                });

                if (error) {
                  Alert.alert(
                    "No se pudo eliminar",
                    error?.reason ||
                      error?.message ||
                      "Inténtalo nuevamente.",
                  );
                  return;
                }

                setDismissedIds((current) => {
                  const next = new Set(current);
                  next.add(device._id);
                  return next;
                });
              },
            );
          },
        },
      ],
    );
  }, []);

  const userLabel = getUserLabel(user || { username: routeUsername });

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <AppHeader
        title="Dispositivos push"
        subtitle={routeUserId ? `Usuario: ${userLabel}` : "Registros del usuario"}
        showBackButton
        onBack={handleBack}
        actions={
          <IconButton
            icon={showFilters ? "filter-off-outline" : "filter-outline"}
            iconColor={theme.colors.onPrimary}
            onPress={() => setShowFilters((current) => !current)}
          />
        }
      />

      {!routeUserId ? (
        <View style={styles.loadingState}>
          <Text variant="titleMedium">No se recibió el usuario</Text>
          <Text variant="bodyMedium" style={{ color: palette.subtle, textAlign: "center" }}>
            Abre esta pantalla desde el detalle del usuario para consultar sus
            dispositivos registrados.
          </Text>
        </View>
      ) : !ready ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: palette.subtle }}>
            Cargando push tokens y resolviendo el resumen del usuario.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleDevices}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DeviceRow
              item={item}
              deleting={deletingIds.has(item._id)}
              onDelete={handleDelete}
              colors={palette}
              theme={theme}
            />
          )}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <Surface
                elevation={0}
                style={[styles.heroCard, { backgroundColor: palette.panel }]}
              >
                <Text
                  variant="labelLarge"
                  style={[styles.heroEyebrow, { color: palette.subtle }]}
                >
                  Inventario de dispositivos
                </Text>
                <Text variant="headlineMedium" style={styles.heroTitle}>
                  Tokens registrados para {userLabel}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.heroCopy, { color: palette.subtle }]}
                >
                  Ordena por actualización o token, filtra por identificadores y
                  elimina registros obsoletos sin perder visibilidad del parque
                  actual.
                </Text>
              </Surface>

              <View style={styles.summaryGrid}>
                <SummaryMetric
                  label="Total"
                  value={dashboard.totalDevices}
                  tone={palette.info}
                  surface={palette.panelSecondary}
                />
                <SummaryMetric
                  label="Android"
                  value={dashboard.androidDevices}
                  tone={palette.android}
                  surface={palette.panelSecondary}
                />
                <SummaryMetric
                  label="iOS"
                  value={dashboard.iosDevices}
                  tone={palette.ios}
                  surface={palette.panelSecondary}
                />
                <SummaryMetric
                  label="Última actividad"
                  value={dashboard.latestActivityLabel}
                  tone={palette.warning}
                  surface={palette.panelSecondary}
                />
              </View>

              {showFilters ? (
                <Surface
                  elevation={0}
                  style={[styles.filtersPanel, { backgroundColor: palette.panel }]}
                >
                  <SearchField value={searchQuery} onChangeText={setSearchQuery} />
                  <FilterGroup
                    label="Ordenar por"
                    options={SORT_OPTIONS}
                    selectedValue={selectedSort}
                    onSelect={setSelectedSort}
                    colors={{
                      background: palette.chipBackground,
                      border: palette.chipBorder,
                      label: palette.subtle,
                      selectedBackground: palette.chipSelectedBackground,
                      selectedBorder: palette.chipSelectedBorder,
                      selectedText: palette.chipSelectedText,
                      text: palette.chipText,
                    }}
                  />

                  <View style={styles.filtersFooter}>
                    <Text variant="bodySmall" style={{ color: palette.subtle }}>
                      {activeFiltersCount > 0
                        ? `${activeFiltersCount} filtro(s) activo(s)`
                        : "Sin filtros adicionales"}
                    </Text>
                    {activeFiltersCount > 0 ? (
                      <Button compact mode="text" onPress={clearFilters}>
                        Limpiar
                      </Button>
                    ) : null}
                  </View>
                </Surface>
              ) : (
                <Surface
                  elevation={0}
                  style={[
                    styles.filtersCollapsedBar,
                    { backgroundColor: palette.panel },
                  ]}
                >
                  <Text variant="bodySmall" style={{ color: palette.subtle }}>
                    {activeFiltersCount > 0
                      ? `${activeFiltersCount} filtro(s) activo(s)`
                      : "Filtros ocultos"}
                  </Text>
                  <View style={styles.collapsedChipsRow}>
                    <Chip compact icon="sort" style={styles.collapsedChip}>
                      {selectedSort === "UPDATED" ? "Actualización" : "Token"}
                    </Chip>
                    <Chip compact icon="devices" style={styles.collapsedChip}>
                      {visibleDevices.length} visibles
                    </Chip>
                  </View>
                </Surface>
              )}

              <View style={styles.resultsHeader}>
                <Text variant="titleMedium">Listado de dispositivos</Text>
                <Text variant="bodySmall" style={{ color: palette.subtle }}>
                  {visibleDevices.length === 1
                    ? "1 registro visible"
                    : `${visibleDevices.length} registros visibles`}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Surface
              elevation={0}
              style={[styles.emptyState, { backgroundColor: palette.panel }]}
            >
              <Text variant="titleMedium">Sin registros visibles</Text>
              <Text
                variant="bodyMedium"
                style={[styles.emptyCopy, { color: palette.subtle }]}
              >
                No se encontraron dispositivos para este usuario con los filtros
                actuales.
              </Text>
              {activeFiltersCount > 0 ? (
                <Button
                  mode="contained-tonal"
                  icon="filter-remove"
                  onPress={clearFilters}
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </Surface>
          }
        />
      )}
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
    padding: 24,
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  headerContent: {
    gap: 16,
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
  },
  heroEyebrow: {
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontWeight: "700",
    marginTop: 6,
  },
  heroCopy: {
    lineHeight: 21,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    minHeight: 94,
    padding: 14,
  },
  summaryLabel: {
    opacity: 0.65,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontWeight: "700",
    marginTop: 10,
  },
  filtersPanel: {
    borderRadius: 22,
    gap: 14,
    padding: 16,
  },
  filtersCollapsedBar: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  collapsedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  collapsedChip: {
    alignSelf: "flex-start",
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
  },
  filterValuesRow: {
    gap: 10,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
  },
  filterChipText: {
    fontWeight: "600",
  },
  filtersFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resultsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  deviceCard: {
    borderRadius: 22,
    marginBottom: 14,
    padding: 16,
  },
  deviceRowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  deviceIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  deviceIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    marginRight: 12,
    width: 42,
  },
  deviceCopy: {
    flex: 1,
  },
  deviceTitle: {
    fontWeight: "700",
  },
  deviceSubtitle: {
    marginTop: 2,
  },
  tokenBlock: {
    borderRadius: 18,
    marginTop: 14,
    padding: 14,
  },
  tokenLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tokenValue: {
    fontFamily: "monospace",
    marginTop: 6,
  },
  deviceMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  deviceMetaItem: {
    flexBasis: "47%",
    minWidth: 130,
  },
  deviceMetaLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
  },
  deviceMetaValue: {
    fontWeight: "600",
    marginTop: 4,
  },
  deviceFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 16,
  },
  deviceInfoChip: {
    alignSelf: "flex-start",
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 24,
    gap: 12,
    padding: 22,
  },
  emptyCopy: {
    lineHeight: 21,
    textAlign: "center",
  },
});

export default UserPushTokensScreen;
