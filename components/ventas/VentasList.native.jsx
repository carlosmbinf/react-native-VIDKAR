import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    DataTable,
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader from "../Header/AppHeader";
import { VentasCollection } from "../collections/collections";
import DialogVenta from "./DialogVenta.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const OPTIONS_PER_PAGE = [10, 25, 50, 75, 100];
const FETCH_LIMIT_OPTIONS = [100, 150, 200, 250, 300];

const normalizeText = (value) => String(value ?? "").toLowerCase();

const formatDateShort = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
};

const formatNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const getUniqueValues = (rows, field) => [
  "TODOS",
  ...new Set(rows.map((row) => row[field]).filter(Boolean)),
];

const getPaidChipColors = (isPaid) =>
  isPaid
    ? { backgroundColor: "#d1fae5", textColor: "#065f46" }
    : { backgroundColor: "#fff3cd", textColor: "#8a5a00" };

const getAdminReportChipColors = (isReported) =>
  isReported
    ? { backgroundColor: "#dbeafe", textColor: "#1d4ed8" }
    : { backgroundColor: "#e2e8f0", textColor: "#475569" };

const buildVentasQuery = ({ currentUserId, currentUsername, routeId }) => {
  const isGeneralAdmin = currentUsername === "carlosmbinf";
  const routeQuery = routeId
    ? { $or: [{ userId: routeId }, { adminId: routeId }] }
    : null;

  if (isGeneralAdmin) {
    return routeQuery || {};
  }

  if (!currentUserId) {
    return { _id: "__no_access__" };
  }

  const ownScopeQuery = {
    $or: [{ userId: currentUserId }, { adminId: currentUserId }],
  };

  return routeQuery ? { $and: [ownScopeQuery, routeQuery] } : ownScopeQuery;
};

const getVentasGridLayout = (windowWidth) => {
  const horizontalPadding = 36;
  const gap = 14;
  const availableWidth = Math.max(windowWidth - horizontalPadding, 280);

  let columns = 1;
  if (windowWidth >= 1180) {
    columns = 3;
  } else if (windowWidth >= 760) {
    columns = 2;
  }

  const rawCardWidth =
    (availableWidth - gap * Math.max(columns - 1, 0)) / columns;
  const cardWidth = Math.min(rawCardWidth, columns === 1 ? 9999 : 430);

  return {
    columns,
    cardWidth,
    gap,
    isCompactCard: cardWidth < 360,
  };
};

const SummaryCard = ({ label, value, tone, compact }) => (
  <Surface
    style={[styles.summaryCard, compact ? styles.summaryCardCompact : null]}
  >
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>
      {value}
    </Text>
  </Surface>
);

const SearchInput = ({ value, onChangeText, placeholder }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface style={styles.searchInputSurface}>
      <IconButton
        icon="magnify"
        size={20}
        style={styles.searchLeadingIcon}
        iconColor="#64748b"
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        cursorColor="#000000"
        selectionColor="rgba(0, 0, 0, 0.22)"
        style={styles.searchInput}
        placeholderTextColor="#94a3b8"
      />
      {value ? (
        <IconButton
          icon="close"
          size={18}
          style={styles.searchTrailingIcon}
          iconColor="#64748b"
          onPress={() => onChangeText("")}
        />
      ) : null}
    </Surface>
  );
};

const FilterGroup = ({ label, values, selectedValue, onSelect }) => (
  <View style={styles.filterGroup}>
    <Text style={styles.filterLabel}>{label}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterValuesRow}
    >
      {values.map((value) => {
        const selected = selectedValue === value;

        return (
          <Chip
            key={`${label}-${value}`}
            selected={selected}
            showSelectedCheck={selected}
            onPress={() => onSelect(value)}
            style={[
              styles.filterChip,
              selected ? styles.filterChipSelected : null,
            ]}
            textStyle={selected ? styles.filterChipTextSelected : null}
          >
            {value}
          </Chip>
        );
      })}
    </ScrollView>
  </View>
);

const VentasList = () => {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { id, pago } = useLocalSearchParams();
  const isCompactScreen = windowWidth < 560;
  const routeId =
    typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
  const routePago =
    typeof pago === "string" ? pago : Array.isArray(pago) ? pago[0] : null;
  const initialPagoFilter =
    routePago === "PAGADO" || routePago === "PENDIENTE" ? routePago : "TODOS";

  const [fetchLimit, setFetchLimit] = React.useState(FETCH_LIMIT_OPTIONS[0]);
  const [page, setPage] = React.useState(0);
  const [itemsPerPage, setItemsPerPage] = React.useState(OPTIONS_PER_PAGE[0]);
  const [showDialog, setShowDialog] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedVentaId, setSelectedVentaId] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("TODOS");
  const [selectedAdmin, setSelectedAdmin] = React.useState("TODOS");
  const [selectedUser, setSelectedUser] = React.useState("TODOS");
  const [selectedPago, setSelectedPago] = React.useState(initialPagoFilter);
  const [updatingIds, setUpdatingIds] = React.useState([]);
  const dataReady = useDeferredScreenData();

  React.useEffect(() => {
    setSelectedPago(initialPagoFilter);
  }, [initialPagoFilter]);

  const { currentUsername, ready, routeUsername, ventas } =
    Meteor.useTracker(() => {
      const currentUser = Meteor.user();
      const currentUserId = currentUser?._id;
      const currentUsernameValue = currentUser?.username || "";

      if (!dataReady) {
        return {
          currentUsername: currentUsernameValue,
          ready: false,
          routeUsername: "",
          ventas: [],
        };
      }

      const ventasQuery = buildVentasQuery({
        currentUserId,
        currentUsername: currentUsernameValue,
        routeId,
      });

      const ventasReady = Meteor.subscribe("ventas", ventasQuery, {
        sort: { createdAt: -1 },
        limit: fetchLimit,
      }).ready();

      const usersReady = Meteor.subscribe(
        "user",
        {},
        { fields: { _id: 1, username: 1 } },
      ).ready();

      const docs = VentasCollection.find(ventasQuery, {
        sort: { createdAt: -1 },
        limit: fetchLimit,
      }).fetch();
      const routeUserDoc =
        routeId && usersReady ? Meteor.users.findOne(routeId) : null;

      const mappedVentas = docs.map((element) => {
        const userusername = usersReady
          ? Meteor.users.findOne(element.userId)?.username
          : "";
        const adminusername = usersReady
          ? Meteor.users.findOne(element.adminId)?.username
          : "";

        return {
          _id: element._id,
          type: element.type,
          userId: element.userId,
          adminId: element.adminId,
          userusername: userusername || "Desconocido",
          adminusername:
            element.adminId !== "SERVER"
              ? adminusername || "Desconocido"
              : "SERVER",
          comentario: element.comentario,
          precio: element.precio,
          gananciasAdmin: element.gananciasAdmin,
          createdAt: element.createdAt ? new Date(element.createdAt) : null,
          cobradoAlAdmin: element.cobradoAlAdmin === true,
          cobrado: element.cobrado === true,
        };
      });

      return {
        currentUsername: currentUsernameValue,
        ready: ventasReady && usersReady,
        routeUsername: routeUserDoc?.username || "",
        ventas: mappedVentas,
      };
    }, [dataReady, fetchLimit, routeId]);

  const isGeneralAdmin = currentUsername === "carlosmbinf";
  const routeContextLabel = React.useMemo(() => {
    if (!routeId) {
      return "";
    }

    return routeUsername || routeId;
  }, [routeId, routeUsername]);
  const types = React.useMemo(() => getUniqueValues(ventas, "type"), [ventas]);
  const admins = React.useMemo(
    () => getUniqueValues(ventas, "adminusername"),
    [ventas],
  );
  const users = React.useMemo(
    () => getUniqueValues(ventas, "userusername"),
    [ventas],
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedType !== "TODOS" ||
    selectedAdmin !== "TODOS" ||
    selectedUser !== "TODOS" ||
    selectedPago !== "TODOS";

  const filteredVentas = React.useMemo(() => {
    let filtered = [...ventas];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      filtered = filtered.filter((venta) => {
        const searchableValues = [
          venta.comentario,
          venta.type,
          venta.adminusername,
          venta.userusername,
          venta.precio,
        ];

        return searchableValues.some((value) =>
          normalizeText(value).includes(query),
        );
      });
    }

    if (selectedType !== "TODOS") {
      filtered = filtered.filter((venta) => venta.type === selectedType);
    }

    if (selectedAdmin !== "TODOS") {
      filtered = filtered.filter(
        (venta) => venta.adminusername === selectedAdmin,
      );
    }

    if (selectedUser !== "TODOS") {
      filtered = filtered.filter(
        (venta) => venta.userusername === selectedUser,
      );
    }

    if (selectedPago !== "TODOS") {
      const isPagado = selectedPago === "PAGADO";
      filtered = filtered.filter((venta) => venta.cobrado === isPagado);
    }

    return filtered;
  }, [
    searchQuery,
    selectedAdmin,
    selectedPago,
    selectedType,
    selectedUser,
    ventas,
  ]);

  const dataToDisplay = hasActiveFilters ? filteredVentas : ventas;
  const activeFiltersCount = [
    Boolean(searchQuery.trim()),
    selectedType !== "TODOS",
    selectedAdmin !== "TODOS",
    selectedUser !== "TODOS",
    selectedPago !== "TODOS",
  ].filter(Boolean).length;

  React.useEffect(() => {
    setPage(0);
  }, [
    fetchLimit,
    searchQuery,
    selectedType,
    selectedAdmin,
    selectedUser,
    selectedPago,
  ]);

  React.useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(dataToDisplay.length / itemsPerPage),
    );
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [dataToDisplay.length, itemsPerPage, page]);

  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, dataToDisplay.length);
  const visibleVentas = React.useMemo(
    () => dataToDisplay.slice(from, to),
    [dataToDisplay, from, to],
  );

  const paidCount = React.useMemo(
    () => ventas.filter((venta) => venta.cobrado).length,
    [ventas],
  );
  const pendingCount = ventas.length - paidCount;

  const openDialog = (venta) => {
    setSelectedVentaId(venta?._id || null);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setSelectedVentaId(null);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedType("TODOS");
    setSelectedAdmin("TODOS");
    setSelectedUser("TODOS");
    setSelectedPago("TODOS");
    setPage(0);
  };

  const handleToggleCobrado = (ventaId) => {
    setUpdatingIds((current) => [...new Set([...current, ventaId])]);

    if (isGeneralAdmin) {
      Meteor.call("changeStatusVenta", ventaId, (error, result) => {
        setUpdatingIds((current) => current.filter((id) => id !== ventaId));

        if (error) {
          Alert.alert(
            "No se pudo actualizar",
            error?.message ||
              "Ocurrió un problema cambiando el estado de pago.",
          );
          return;
        }

        if (result) {
          Alert.alert("Estado actualizado", String(result));
        }
      });
      return;
    }

    VentasCollection.update(
      ventaId,
      { $set: { cobradoAlAdmin: true } },
      (error) => {
        setUpdatingIds((current) => current.filter((id) => id !== ventaId));
        if (error) {
          Alert.alert(
            "No se pudo actualizar",
            error?.message ||
              "Ocurrió un problema cambiando el estado de pago.",
          );
        } else {
          Alert.alert(
            "Estado actualizado",
            "El estado de pago se actualizó correctamente.",
          );
        }
      },
    );
  };

  const screenBackground = theme.dark ? "#07111f" : "#f3f5fb";
  const panelBackground = theme.dark
    ? theme.colors.elevation?.level1 || theme.colors.surface
    : "#ffffff";
  const ventasGridLayout = React.useMemo(
    () => getVentasGridLayout(windowWidth),
    [windowWidth],
  );

  return (
    <View style={[styles.screen, { backgroundColor: screenBackground }]}>
      <AppHeader
        title="Ventas"
        subtitle={
          routeId
            ? selectedPago === "PENDIENTE"
              ? "Ventas pendientes filtradas para el usuario seleccionado"
              : selectedPago === "PAGADO"
                ? "Ventas pagadas filtradas para el usuario seleccionado"
                : "Ventas filtradas para el usuario seleccionado"
            : !isGeneralAdmin
              ? selectedPago === "PENDIENTE"
                ? "Ventas pendientes donde participas como admin o usuario"
                : selectedPago === "PAGADO"
                  ? "Ventas pagadas donde participas como admin o usuario"
                  : "Ventas donde participas como admin o usuario"
              : "Control, filtros y edición de ventas"
        }
        showBackButton
        backHref="/(normal)/Main"
        actions={
          <IconButton
            icon={showFilters ? "filter-minus-outline" : "filter-outline"}
            iconColor="#ffffff"
            onPress={() => setShowFilters((current) => !current)}
          />
        }
      />

      {showDialog ? (
        <DialogVenta
          visible={showDialog}
          hideDialog={closeDialog}
          ventaId={selectedVentaId}
        />
      ) : null}

      {!ready ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3f51b5" />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Ventas cargadas"
              value={ventas.length}
              tone="#2563eb"
              compact={isCompactScreen}
            />
            <SummaryCard
              label="Pagadas"
              value={paidCount}
              tone="#059669"
              compact={isCompactScreen}
            />
            <SummaryCard
              label="Pendientes"
              value={pendingCount}
              tone="#d97706"
              compact={isCompactScreen}
            />
          </View>

          {showFilters ? (
            <Surface
              style={[styles.filterPanel, { backgroundColor: panelBackground }]}
            >
              <SearchInput
                placeholder="Buscar ventas por comentario, tipo, admin, usuario o precio"
                onChangeText={setSearchQuery}
                value={searchQuery}
              />

              <FilterGroup
                label="Cantidad a buscar"
                values={FETCH_LIMIT_OPTIONS}
                selectedValue={fetchLimit}
                onSelect={setFetchLimit}
              />
              <FilterGroup
                label="Tipo"
                values={types}
                selectedValue={selectedType}
                onSelect={setSelectedType}
              />
              <FilterGroup
                label="Admin"
                values={admins}
                selectedValue={selectedAdmin}
                onSelect={setSelectedAdmin}
              />
              <FilterGroup
                label="Usuario"
                values={users}
                selectedValue={selectedUser}
                onSelect={setSelectedUser}
              />
              <FilterGroup
                label="Estado de pago"
                values={["TODOS", "PAGADO", "PENDIENTE"]}
                selectedValue={selectedPago}
                onSelect={setSelectedPago}
              />

              {routeId ? (
                <View style={styles.activeFiltersRow}>
                  <Chip
                    icon="account-filter"
                    style={styles.routeContextChip}
                    textStyle={styles.routeContextChipText}
                  >
                    Usuario filtrado: {routeContextLabel}
                  </Chip>
                </View>
              ) : null}

              <View style={styles.activeFiltersRow}>
                <Chip
                  icon="database-search-outline"
                  style={styles.fetchLimitChip}
                  textStyle={styles.fetchLimitChipText}
                >
                  Buscando hasta {fetchLimit}
                </Chip>
                {activeFiltersCount > 0 ? (
                  <Chip
                    icon="filter"
                    style={styles.activeFiltersChip}
                    textStyle={styles.activeFiltersChipText}
                  >
                    {activeFiltersCount} filtro
                    {activeFiltersCount > 1 ? "s" : ""} activo
                    {activeFiltersCount > 1 ? "s" : ""}
                  </Chip>
                ) : null}
              </View>

              {activeFiltersCount > 0 ? (
                <View style={styles.clearFiltersRow}>
                  <Button
                    mode="contained-tonal"
                    icon="filter-remove"
                    onPress={clearAllFilters}
                  >
                    Limpiar filtros
                  </Button>
                </View>
              ) : null}
            </Surface>
          ) : (
            <Surface
              style={[
                styles.filtersCollapsedBar,
                { backgroundColor: panelBackground },
              ]}
            >
              <View style={styles.filtersCollapsedContent}>
                {routeId ? (
                  <Chip
                    compact
                    icon="account-filter"
                    style={styles.routeContextChip}
                    textStyle={styles.routeContextChipText}
                  >
                    {routeContextLabel}
                  </Chip>
                ) : null}
                <Chip
                  compact
                  icon="database-search-outline"
                  style={styles.fetchLimitChip}
                  textStyle={styles.fetchLimitChipText}
                >
                  Límite {fetchLimit}
                </Chip>
                {activeFiltersCount > 0 ? (
                  <Chip
                    compact
                    icon="filter"
                    style={styles.activeFiltersChip}
                    textStyle={styles.activeFiltersChipText}
                  >
                    {activeFiltersCount} activo
                    {activeFiltersCount > 1 ? "s" : ""}
                  </Chip>
                ) : null}
              </View>
              {activeFiltersCount > 0 ? (
                <Button
                  compact
                  mode="text"
                  icon="filter-remove"
                  onPress={clearAllFilters}
                >
                  Limpiar
                </Button>
              ) : null}
            </Surface>
          )}

          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Listado de ventas</Text>
            <Text style={styles.resultsText}>
              Mostrando {dataToDisplay.length} de {ventas.length} ventas. Límite
              actual: {fetchLimit}
            </Text>
            {routeId ? (
              <Text style={styles.routeContextText}>
                Contexto activo: ventas filtradas para {routeContextLabel}.
              </Text>
            ) : null}
          </View>

          {dataToDisplay.length === 0 ? (
            <Surface
              style={[styles.emptyState, { backgroundColor: panelBackground }]}
            >
              <IconButton icon="filter-remove-outline" size={44} />
              <Text style={styles.emptyStateTitle}>
                No se encontraron ventas
              </Text>
              <Text style={styles.emptyStateCopy}>
                No hay resultados con los filtros aplicados. Puedes limpiar los
                filtros para volver a la lista completa.
              </Text>
              <Button
                mode="outlined"
                icon="filter-remove"
                onPress={clearAllFilters}
              >
                Limpiar filtros
              </Button>
            </Surface>
          ) : (
            <View style={styles.cardsList}>
              {visibleVentas.map((venta) => {
                const isUpdating = updatingIds.includes(venta._id);
                const paymentColors = getPaidChipColors(venta.cobrado);
                const adminReportColors = getAdminReportChipColors(
                  venta.cobradoAlAdmin,
                );
                const canEditVenta = isGeneralAdmin;
                const isCompactCard = ventasGridLayout.isCompactCard;
                const paymentStatusLabel = venta.cobrado
                  ? "Pagado"
                  : "Pendiente";
                const adminReportLabel = venta.cobradoAlAdmin
                  ? isCompactCard
                    ? "Conf. admin"
                    : "Confirmado al admin"
                  : isCompactCard
                    ? "Sin conf. admin"
                    : "Sin confirmar al admin";
                const actionDisabled =
                  isUpdating ||
                  venta.cobrado ||
                  (!isGeneralAdmin && venta.cobradoAlAdmin);
                const actionLabel = isUpdating
                  ? "Actualizando..."
                  : isGeneralAdmin
                    ? venta.cobrado
                      ? "Pagado"
                      : "Marcar pagado"
                    : venta.cobradoAlAdmin
                      ? "Reportado al admin"
                      : "Confirmar al admin";
                const actionIcon = isGeneralAdmin
                  ? venta.cobrado
                    ? "cart-check"
                    : "cash-check"
                  : venta.cobradoAlAdmin
                    ? "account-check-outline"
                    : "account-arrow-up-outline";
                const cardHintText = canEditVenta
                  ? "Toca la tarjeta para ver o editar"
                  : "Toca la tarjeta para consultar el detalle";

                return (
                  <Pressable
                    key={venta._id}
                    onPress={() => openDialog(venta)}
                    android_ripple={{ color: "rgba(37, 99, 235, 0.12)" }}
                    style={({ pressed }) => [
                      styles.cardPressable,
                      {
                        width:
                          ventasGridLayout.columns > 1
                            ? ventasGridLayout.cardWidth
                            : "100%",
                      },
                      pressed ? styles.cardPressableActive : null,
                    ]}
                  >
                    <Surface
                      style={[
                        styles.ventaCard,
                        { backgroundColor: panelBackground },
                      ]}
                    >
                      <View
                        style={[
                          styles.cardHeaderRow,
                          isCompactCard ? styles.cardHeaderRowCompact : null,
                        ]}
                      >
                        <View style={styles.cardTitleBlock}>
                          <Chip
                            compact
                            style={styles.typeChip}
                            textStyle={styles.typeChipText}
                          >
                            {venta.type || "SIN TIPO"}
                          </Chip>
                          <Text style={styles.cardDate}>
                            {formatDateShort(venta.createdAt)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusChipsRow,
                            isCompactCard ? styles.statusChipsRowCompact : null,
                          ]}
                        >
                          <Chip
                            compact
                            style={[
                              styles.paymentChip,
                              isCompactCard ? styles.paymentChipCompact : null,
                              {
                                backgroundColor: paymentColors.backgroundColor,
                              },
                            ]}
                            textStyle={[
                              styles.paymentChipText,
                              isCompactCard
                                ? styles.paymentChipTextCompact
                                : null,
                              { color: paymentColors.textColor },
                            ]}
                          >
                            {paymentStatusLabel}
                          </Chip>
                          <Chip
                            compact
                            style={[
                              styles.paymentChip,
                              isCompactCard ? styles.paymentChipCompact : null,
                              {
                                backgroundColor:
                                  adminReportColors.backgroundColor,
                              },
                            ]}
                            textStyle={[
                              styles.paymentChipText,
                              isCompactCard
                                ? styles.paymentChipTextCompact
                                : null,
                              { color: adminReportColors.textColor },
                            ]}
                          >
                            {adminReportLabel}
                          </Chip>
                        </View>
                      </View>

                      <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Admin</Text>
                          <Text numberOfLines={1} style={styles.metaValue}>
                            {venta.adminusername || "Desconocido"}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Usuario</Text>
                          <Text numberOfLines={1} style={styles.metaValue}>
                            {venta.userusername || "Desconocido"}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Precio</Text>
                          <Text numberOfLines={1} style={styles.metaValue}>
                            {formatNumber(venta.precio)}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Ganancias</Text>
                          <Text numberOfLines={1} style={styles.metaValue}>
                            {formatNumber(venta.gananciasAdmin)}
                          </Text>
                        </View>
                      </View>

                      {venta.comentario ? (
                        <Text numberOfLines={2} style={styles.commentPreview}>
                          {venta.comentario}
                        </Text>
                      ) : null}

                      <View
                        style={[
                          styles.cardActionsRow,
                          isCompactCard ? styles.cardActionsRowCompact : null,
                        ]}
                      >
                        <Text style={styles.cardHint}>{cardHintText}</Text>
                        <Button
                          mode={actionDisabled ? "contained-tonal" : "outlined"}
                          icon={actionIcon}
                          onPress={() => handleToggleCobrado(venta._id)}
                          disabled={actionDisabled}
                          compact
                        >
                          {actionLabel}
                        </Button>
                      </View>
                    </Surface>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Surface
            style={[
              styles.paginationPanel,
              { backgroundColor: panelBackground },
            ]}
          >
            <DataTable.Pagination
              page={page}
              numberOfPages={Math.max(
                1,
                Math.ceil(dataToDisplay.length / itemsPerPage),
              )}
              onPageChange={setPage}
              label={
                dataToDisplay.length === 0
                  ? "0-0 de 0"
                  : `${from + 1}-${to} de ${dataToDisplay.length}`
              }
              numberOfItemsPerPageList={OPTIONS_PER_PAGE}
              numberOfItemsPerPage={itemsPerPage}
              onItemsPerPageChange={(item) => {
                setItemsPerPage(item);
                setPage(0);
              }}
              selectPageDropdownLabel="Filas por página"
            />
          </Surface>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  activeFiltersChip: {
    backgroundColor: "#1d4ed8",
  },
  activeFiltersChipText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  activeFiltersRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  routeContextChip: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
  },
  routeContextChipText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  cardActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 14,
  },
  cardActionsRowCompact: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  cardDate: {
    fontSize: 12,
    opacity: 0.72,
  },
  cardHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardHeaderRowCompact: {
    gap: 14,
  },
  cardHint: {
    flex: 1,
    fontSize: 12,
    opacity: 0.62,
  },
  cardPressable: {
    borderRadius: 24,
  },
  cardPressableActive: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  cardTitleBlock: {
    flex: 1,
    gap: 10,
  },
  cardsList: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  clearFiltersRow: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  commentPreview: {
    lineHeight: 20,
    marginTop: 14,
    opacity: 0.8,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 28,
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  emptyStateCopy: {
    lineHeight: 22,
    maxWidth: 480,
    opacity: 0.78,
    textAlign: "center",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  fetchLimitChip: {
    backgroundColor: "#e0ecff",
  },
  fetchLimitChipText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  filterChip: {
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: "#3f51b5",
  },
  filterChipTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    opacity: 0.72,
    textTransform: "uppercase",
  },
  filterPanel: {
    borderRadius: 28,
    gap: 18,
    padding: 18,
  },
  filtersCollapsedBar: {
    borderRadius: 24,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filtersCollapsedContent: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterValuesRow: {
    paddingRight: 8,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    opacity: 0.72,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  metaItem: {
    flexGrow: 1,
    minWidth: 132,
    rowGap: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    opacity: 0.68,
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  paginationPanel: {
    borderRadius: 24,
    overflow: "hidden",
  },
  paymentChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    flexShrink: 1,
    minWidth: 0,
  },
  paymentChipCompact: {
    paddingHorizontal: 0,
  },
  paymentChipText: {
    fontWeight: "800",
  },
  paymentChipTextCompact: {
    fontSize: 11,
  },
  resultsHeader: {
    gap: 4,
    paddingHorizontal: 2,
  },
  resultsText: {
    fontSize: 13,
    opacity: 0.72,
  },
  routeContextText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: 18,
    padding: 18,
    paddingBottom: 24,
  },
  searchInput: {
    color: "#000000",
    flex: 1,
    fontSize: 15,
    minHeight: 46,
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
  },
  searchInputSurface: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4f0",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 0,
    flexDirection: "row",
    overflow: "hidden",
    paddingRight: 6,
  },
  searchLeadingIcon: {
    margin: 0,
  },
  searchTrailingIcon: {
    margin: 0,
  },
  statusChipsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 8,
    justifyContent: "flex-end",
    minWidth: 0,
    maxWidth: 252,
  },
  statusChipsRowCompact: {
    gap: 6,
    maxWidth: "100%",
  },
  summaryCard: {
    borderRadius: 24,
    elevation: 0,
    flex: 1,
    gap: 8,
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  summaryCardCompact: {
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 16,
    width: "100%",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    opacity: 0.72,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  typeChip: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
  },
  typeChipText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  ventaCard: {
    borderRadius: 24,
    elevation: 0,
    padding: 18,
  },
});

export default VentasList;
