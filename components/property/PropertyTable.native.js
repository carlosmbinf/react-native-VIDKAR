import MeteorBase from "@meteorrn/core";
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
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader from "../Header/AppHeader";
import { ConfigCollection } from "../collections/collections";
import PropertyDialog from "./PropertyDialog.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const PROPERTY_FIELDS = {
  active: 1,
  clave: 1,
  comentario: 1,
  createdAt: 1,
  idAdminConfigurado: 1,
  type: 1,
  valor: 1,
};

const PROPERTY_ADMIN_FIELDS = {
  "profile.name": 1,
  username: 1,
};

const ACTIVE_OPTIONS = ["TODOS", "ACTIVAS", "INACTIVAS"];

const formatPropertyDate = (value) => {
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

const getTypeTone = (type = "") => {
  const normalized = String(type).trim().toUpperCase();

  if (normalized === "CONFIG") {
    return {
      accent: "#2563eb",
      background: "rgba(37, 99, 235, 0.16)",
      text: "#1d4ed8",
    };
  }

  if (normalized.includes("PAGO") || normalized.includes("TARIFA")) {
    return {
      accent: "#7c3aed",
      background: "rgba(124, 58, 237, 0.16)",
      text: "#6d28d9",
    };
  }

  if (normalized.includes("REMESA") || normalized.includes("RECARGA")) {
    return {
      accent: "#059669",
      background: "rgba(5, 150, 105, 0.16)",
      text: "#047857",
    };
  }

  return {
    accent: "#f59e0b",
    background: "rgba(245, 158, 11, 0.16)",
    text: "#b45309",
  };
};

const getAdminDisplay = (adminId) => {
  if (!adminId) {
    return "Sin admin";
  }

  const adminDoc = Meteor.users?.findOne?.(adminId);
  if (adminDoc?.username) {
    return adminDoc.username;
  }

  if (adminDoc?.profile?.name) {
    return adminDoc.profile.name;
  }

  return String(adminId).slice(0, 12);
};

const SearchInput = ({ colors, onChangeText, placeholder, value }) => {
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

const FilterGroup = ({ colors, label, onSelect, options, selectedValue }) => (
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

const EmptyState = ({ colors, hasProperties, onClearFilters }) => (
  <Surface
    style={[styles.emptyStateCard, { backgroundColor: colors.surface }]}
    elevation={0}
  >
    <View style={[styles.emptyIconWrap, { backgroundColor: colors.iconWrap }]}>
      <IconButton icon="cog-off-outline" size={34} iconColor={colors.icon} />
    </View>
    <Text
      variant="titleMedium"
      style={[styles.emptyTitle, { color: colors.title }]}
    >
      {hasProperties ? "No hay coincidencias" : "No hay properties publicadas"}
    </Text>
    <Text
      variant="bodyMedium"
      style={[styles.emptyCopy, { color: colors.copy }]}
    >
      {hasProperties
        ? "Ajusta la busqueda o los filtros para volver a ver configuraciones del sistema."
        : "La suscripcion esta lista, pero la coleccion no devolvio documentos para esta ruta."}
    </Text>
    {hasProperties ? (
      <Button mode="outlined" onPress={onClearFilters}>
        Limpiar filtros
      </Button>
    ) : null}
  </Surface>
);

const PropertyCard = ({ colors, item, onPress }) => {
  const tone = getTypeTone(item.type);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.cardPressed]}
    >
      <Surface
        style={[styles.propertyCard, { backgroundColor: colors.surface }]}
        elevation={0}
      >
        <View style={[styles.cardRail, { backgroundColor: tone.accent }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleWrap}>
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: colors.title }]}
                numberOfLines={1}
              >
                {item.clave || "Sin clave"}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.cardSubtitle, { color: colors.copy }]}
                numberOfLines={1}
              >
                {item.adminDisplay} • {item.formattedDate}
              </Text>
            </View>
            <View style={styles.cardChipsColumn}>
              <Chip
                compact
                style={[styles.typeChip, { backgroundColor: tone.background }]}
                textStyle={[styles.typeChipText, { color: tone.text }]}
              >
                {item.type || "Sin tipo"}
              </Chip>
              <Chip
                compact
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: item.active
                      ? colors.statusActiveSurface
                      : colors.statusInactiveSurface,
                  },
                ]}
                textStyle={{
                  color: item.active
                    ? colors.statusActiveText
                    : colors.statusInactiveText,
                }}
              >
                {item.active ? "Activa" : "Inactiva"}
              </Chip>
            </View>
          </View>

          <Surface
            style={[
              styles.valueCard,
              { backgroundColor: colors.secondarySurface },
            ]}
            elevation={0}
          >
            <Text
              variant="labelMedium"
              style={[styles.valueLabel, { color: colors.label }]}
            >
              Valor
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.valueText, { color: colors.title }]}
              numberOfLines={3}
            >
              {item.valor || "Sin valor registrado"}
            </Text>
          </Surface>

          {item.comentario ? (
            <Text
              variant="bodySmall"
              style={[styles.commentText, { color: colors.copy }]}
              numberOfLines={2}
            >
              {item.comentario}
            </Text>
          ) : null}
        </View>
      </Surface>
    </Pressable>
  );
};

const PropertyTable = () => {
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
      secondarySurface: isDark
        ? "rgba(30, 41, 59, 0.86)"
        : "rgba(148, 163, 184, 0.08)",
      emptySurface: isDark
        ? "rgba(15, 23, 42, 0.94)"
        : "rgba(255, 255, 255, 0.9)",
      emptyIconWrap: isDark
        ? "rgba(51, 65, 85, 0.88)"
        : "rgba(148, 163, 184, 0.14)",
      title: isDark ? "#f8fafc" : "#0f172a",
      copy: isDark ? "#cbd5e1" : "#475569",
      label: isDark ? "#94a3b8" : "#64748b",
      icon: isDark ? "#cbd5e1" : "#64748b",
      statusActiveSurface: isDark
        ? "rgba(16, 185, 129, 0.18)"
        : "rgba(16, 185, 129, 0.12)",
      statusActiveText: isDark ? "#bbf7d0" : "#047857",
      statusInactiveSurface: isDark
        ? "rgba(148, 163, 184, 0.18)"
        : "rgba(148, 163, 184, 0.14)",
      statusInactiveText: isDark ? "#cbd5e1" : "#475569",
    }),
    [isDark],
  );

  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const currentUser = Meteor.useTracker(() => Meteor.user());
  const dataReady = useDeferredScreenData();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("TODOS");
  const [selectedActiveState, setSelectedActiveState] = React.useState("TODOS");
  const [filtersVisible, setFiltersVisible] = React.useState(true);
  const [dialogState, setDialogState] = React.useState({
    visible: false,
    property: null,
  });

  const { properties, ready } = Meteor.useTracker(() => {
    if (!dataReady || !Meteor.status?.()?.connected) {
      return { properties: [], ready: false };
    }

    const propertySubscription = Meteor.subscribe("propertys", {}, {
      fields: PROPERTY_FIELDS,
    });
    const propertyDocs = ConfigCollection.find(
      {},
      { fields: PROPERTY_FIELDS, sort: { createdAt: -1, clave: 1 } },
    ).fetch();
    const adminIds = [
      ...new Set(
        propertyDocs.map((doc) => doc?.idAdminConfigurado).filter(Boolean),
      ),
    ];
    const usersSubscription = adminIds.length
      ? Meteor.subscribe("user", { _id: { $in: adminIds } }, {
          fields: PROPERTY_ADMIN_FIELDS,
        })
      : null;

    const viewModels = propertyDocs.map((doc) => ({
      ...doc,
      adminDisplay: getAdminDisplay(doc?.idAdminConfigurado),
      formattedDate: formatPropertyDate(doc?.createdAt),
      searchBlob: [
        doc?.type,
        doc?.clave,
        doc?.valor,
        doc?.comentario,
        getAdminDisplay(doc?.idAdminConfigurado),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }));

    return {
      properties: viewModels,
      ready:
        propertySubscription.ready() &&
        (usersSubscription ? usersSubscription.ready() : true),
    };
  }, [dataReady]);

  const canManage =
    currentUser?.username === "carlosmbinf" ||
    currentUser?.profile?.role === "admin";

  const typeOptions = React.useMemo(() => {
    const types = [
      ...new Set(properties.map((item) => item.type).filter(Boolean)),
    ].sort((left, right) => String(left).localeCompare(String(right), "es"));

    return ["TODOS", ...types];
  }, [properties]);

  const filteredProperties = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return properties.filter((item) => {
      const matchesQuery = normalizedQuery
        ? item.searchBlob.includes(normalizedQuery)
        : true;
      const matchesType =
        selectedType === "TODOS" ? true : item.type === selectedType;
      const matchesActive =
        selectedActiveState === "TODOS"
          ? true
          : selectedActiveState === "ACTIVAS"
            ? item.active !== false
            : item.active === false;

      return matchesQuery && matchesType && matchesActive;
    });
  }, [properties, searchQuery, selectedActiveState, selectedType]);

  const totalActive = React.useMemo(
    () => properties.filter((item) => item.active !== false).length,
    [properties],
  );
  const totalInactive = React.useMemo(
    () => properties.filter((item) => item.active === false).length,
    [properties],
  );
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;

    if (searchQuery.trim()) {
      count += 1;
    }
    if (selectedType !== "TODOS") {
      count += 1;
    }
    if (selectedActiveState !== "TODOS") {
      count += 1;
    }

    return count;
  }, [searchQuery, selectedActiveState, selectedType]);

  const clearFilters = React.useCallback(() => {
    setSearchQuery("");
    setSelectedType("TODOS");
    setSelectedActiveState("TODOS");
  }, []);

  const closeDialog = React.useCallback(() => {
    setDialogState({ visible: false, property: null });
  }, []);

  const openCreate = React.useCallback(() => {
    setDialogState({ visible: true, property: null });
  }, []);

  const openDetail = React.useCallback((property) => {
    setDialogState({ visible: true, property });
  }, []);

  const headerActions = (
    <>
      <IconButton
        icon={filtersVisible ? "filter-off-outline" : "filter-outline"}
        iconColor="#ffffff"
        onPress={() => setFiltersVisible((current) => !current)}
      />
      {canManage ? (
        <IconButton icon="plus" iconColor="#ffffff" onPress={openCreate} />
      ) : null}
    </>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Surface
        style={[styles.heroCard, { backgroundColor: palette.heroPanel }]}
        elevation={0}
      >
        <Text variant="labelLarge" style={styles.heroEyebrow}>
          Configuración global
        </Text>
        <Text variant="headlineMedium" style={styles.heroTitle}>
          Propertys del sistema
        </Text>
        <Text variant="bodyMedium" style={styles.heroCopy}>
          Consulta y ajusta claves de configuración con lectura rápida, filtros
          operativos y edición reactiva sobre Minimongo.
        </Text>
      </Surface>

      <View style={styles.summaryGrid}>
        <SummaryCard
          colors={{
            surface: palette.summarySurface,
            label: palette.summaryLabel,
          }}
          compact={isCompactScreen}
          label="Total"
          value={properties.length}
        />
        <SummaryCard
          colors={{
            surface: palette.summarySurface,
            label: palette.summaryLabel,
          }}
          compact={isCompactScreen}
          label="Activas"
          tone="#10b981"
          value={totalActive}
        />
        <SummaryCard
          colors={{
            surface: palette.summarySurface,
            label: palette.summaryLabel,
          }}
          compact={isCompactScreen}
          label="Inactivas"
          tone="#f59e0b"
          value={totalInactive}
        />
        <SummaryCard
          colors={{
            surface: palette.summarySurface,
            label: palette.summaryLabel,
          }}
          compact={isCompactScreen}
          label="Tipos"
          tone="#6366f1"
          value={Math.max(typeOptions.length - 1, 0)}
        />
      </View>

      {filtersVisible ? (
        <Surface
          style={[
            styles.filtersPanel,
            { backgroundColor: palette.filtersPanel },
          ]}
          elevation={0}
        >
          <SearchInput
            colors={{
              surface: palette.searchSurface,
              text: palette.searchText,
              placeholder: palette.searchPlaceholder,
              selection: palette.searchSelection,
              cursor: palette.searchText,
              icon: palette.searchIcon,
            }}
            onChangeText={setSearchQuery}
            placeholder="Buscar por tipo, clave, valor, comentario o admin"
            value={searchQuery}
          />

          <FilterGroup
            colors={{
              label: palette.filterLabel,
              background: palette.filterChipBackground,
              border: palette.filterChipBorder,
              text: palette.filterChipText,
              selectedBackground: palette.filterChipSelectedBackground,
              selectedBorder: palette.filterChipSelectedBorder,
              selectedText: palette.filterChipSelectedText,
            }}
            label="Tipo"
            onSelect={setSelectedType}
            options={typeOptions}
            selectedValue={selectedType}
          />

          <FilterGroup
            colors={{
              label: palette.filterLabel,
              background: palette.filterChipBackground,
              border: palette.filterChipBorder,
              text: palette.filterChipText,
              selectedBackground: palette.filterChipSelectedBackground,
              selectedBorder: palette.filterChipSelectedBorder,
              selectedText: palette.filterChipSelectedText,
            }}
            label="Estado"
            onSelect={setSelectedActiveState}
            options={ACTIVE_OPTIONS}
            selectedValue={selectedActiveState}
          />

          <View style={styles.filtersFooter}>
            <Text variant="bodySmall" style={{ color: palette.copy }}>
              {activeFiltersCount > 0
                ? `${activeFiltersCount} filtro(s) activo(s)`
                : "Sin filtros adicionales"}
            </Text>
            {activeFiltersCount > 0 ? (
              <Button compact onPress={clearFilters}>
                Limpiar
              </Button>
            ) : null}
          </View>
        </Surface>
      ) : (
        <Surface
          style={[
            styles.filtersCollapsedBar,
            { backgroundColor: palette.filtersPanel },
          ]}
          elevation={0}
        >
          <Text variant="bodySmall" style={{ color: palette.copy }}>
            {activeFiltersCount > 0
              ? `${activeFiltersCount} filtro(s) activo(s)`
              : "Filtros ocultos"}
          </Text>
          <Text variant="bodySmall" style={{ color: palette.copy }}>
            {filteredProperties.length} visibles
          </Text>
        </Surface>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <AppHeader title="Propertys del sistema" actions={headerActions} />

      {ready || properties.length > 0 ? (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PropertyCard
              colors={{
                surface: palette.cardSurface,
                secondarySurface: palette.secondarySurface,
                title: palette.title,
                copy: palette.copy,
                label: palette.label,
                statusActiveSurface: palette.statusActiveSurface,
                statusActiveText: palette.statusActiveText,
                statusInactiveSurface: palette.statusInactiveSurface,
                statusInactiveText: palette.statusInactiveText,
              }}
              item={item}
              onPress={() => openDetail(item)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              colors={{
                surface: palette.emptySurface,
                iconWrap: palette.emptyIconWrap,
                icon: palette.icon,
                title: palette.title,
                copy: palette.copy,
              }}
              hasProperties={properties.length > 0}
              onClearFilters={clearFilters}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.loadingWrap}>
          <ActivityIndicator animating size="large" />
          <Text variant="bodyMedium" style={{ color: palette.loadingCopy }}>
            Cargando configuración reactiva del sistema...
          </Text>
        </View>
      )}

      <PropertyDialog
        adminDisplay={dialogState.property?.adminDisplay}
        canManage={canManage}
        currentUserId={currentUserId}
        onDismiss={closeDialog}
        property={dialogState.property}
        visible={dialogState.visible}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  listHeader: {
    gap: 14,
    marginBottom: 12,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  heroEyebrow: {
    color: "rgba(191, 219, 254, 0.84)",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  heroCopy: {
    color: "rgba(226, 232, 240, 0.88)",
    lineHeight: 21,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  summaryCardCompact: {
    minWidth: "47%",
  },
  summaryLabel: {
    fontWeight: "700",
  },
  summaryValue: {
    fontWeight: "800",
  },
  filtersPanel: {
    borderRadius: 22,
    padding: 14,
    gap: 14,
  },
  filtersCollapsedBar: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchInputSurface: {
    borderRadius: 18,
    paddingLeft: 2,
    paddingRight: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  searchLeadingIcon: {
    margin: 0,
  },
  searchTrailingIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontWeight: "700",
  },
  filterValuesRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderWidth: 1,
  },
  filterChipText: {
    fontWeight: "700",
  },
  filtersFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  propertyCard: {
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  cardRail: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontWeight: "800",
  },
  cardSubtitle: {
    lineHeight: 18,
  },
  cardChipsColumn: {
    alignItems: "flex-end",
    gap: 8,
  },
  typeChip: {
    alignSelf: "flex-start",
  },
  typeChipText: {
    fontWeight: "700",
    fontSize: 11,
  },
  statusChip: {
    alignSelf: "flex-start",
  },
  valueCard: {
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  valueLabel: {
    fontWeight: "700",
  },
  valueText: {
    lineHeight: 20,
  },
  commentText: {
    lineHeight: 18,
  },
  emptyStateCard: {
    borderRadius: 24,
    padding: 22,
    gap: 12,
    alignItems: "flex-start",
  },
  emptyIconWrap: {
    borderRadius: 999,
  },
  emptyTitle: {
    fontWeight: "800",
  },
  emptyCopy: {
    lineHeight: 20,
  },
});

export default PropertyTable;
