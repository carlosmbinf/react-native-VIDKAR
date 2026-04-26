import MeteorBase from "@meteorrn/core";
import * as Location from "expo-location";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Appbar,
    Button,
    Chip,
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import AppHeader from "../../Header/AppHeader";
import { Online } from "../../collections/collections";
import MapaUsuarios from "./MapaUsuarios";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const ROLE_FILTERS = ["todos", "cadetes", "admins", "empresas", "online"];

const LOCATION_SELECTOR = {
  $or: [
    { "cordenadas.latitude": { $exists: true } },
    { "coordenadas.latitude": { $exists: true } },
  ],
};

const LOCATION_FIELDS = {
  username: 1,
  "profile.name": 1,
  "profile.firstName": 1,
  "profile.lastName": 1,
  "profile.role": 1,
  "profile.roleComercio": 1,
  cordenadas: 1,
  coordenadas: 1,
  online: 1,
  modoCadete: 1,
  picture: 1,
  createdAt: 1,
  vpnplusConnected: 1,
  vpn2mbConnected: 1,
};

const normalizeString = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeUserId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    if (typeof value._str === "string") {
      return value._str;
    }

    if (typeof value.$oid === "string") {
      return value.$oid;
    }

    if (typeof value._id === "string") {
      return value._id;
    }

    if (typeof value.toHexString === "function") {
      const hexValue = value.toHexString();

      if (typeof hexValue === "string" && hexValue.length > 0) {
        return hexValue;
      }
    }

    if (typeof value.valueOf === "function") {
      const primitiveValue = value.valueOf();

      if (
        primitiveValue != null &&
        primitiveValue !== value &&
        typeof primitiveValue !== "object"
      ) {
        return String(primitiveValue);
      }
    }
  }

  const stringValue = String(value);
  return stringValue === "[object Object]" ? null : stringValue;
};

const matchesUserId = (leftId, rightId) => {
  const normalizedLeftId = normalizeUserId(leftId);
  const normalizedRightId = normalizeUserId(rightId);

  if (!normalizedLeftId || !normalizedRightId) {
    return false;
  }

  return normalizedLeftId === normalizedRightId;
};

const getConnectionAddress = (connectionDoc) => {
  if (typeof connectionDoc?.address !== "string") {
    return "";
  }

  return connectionDoc.address.trim().toLowerCase();
};

const getConnectionHostname = (connectionDoc) => {
  if (typeof connectionDoc?.hostname !== "string") {
    return "";
  }

  return connectionDoc.hostname.trim().toLowerCase();
};

const isBlankConnectionValue = (value) => value == null || value === "";

const getUserConnectionState = (user, connections) => {
  const onlineConnections = Array.isArray(connections) ? connections : [];

  const hasWebConnection =
    onlineConnections.length > 0 &&
    onlineConnections.some((online) => {
      if (!online?.userId || !matchesUserId(online.userId, user?._id)) {
        return false;
      }

      const address = getConnectionAddress(online);
      const hostname = getConnectionHostname(online);

      return (
        isBlankConnectionValue(address) && isBlankConnectionValue(hostname)
      );
    });

  const hasAppConnection =
    onlineConnections.length > 0 &&
    onlineConnections.some((online) => {
      if (!online?.userId || !matchesUserId(online.userId, user?._id)) {
        return false;
      }

      const address = getConnectionAddress(online);
      const hostname = getConnectionHostname(online);

      return (
        !isBlankConnectionValue(address) || !isBlankConnectionValue(hostname)
      );
    });

  const hasProxyConnection =
    onlineConnections.length > 0 &&
    onlineConnections.some((online) => {
      if (!online?.userId || !matchesUserId(online.userId, user?._id)) {
        return false;
      }

      const address = getConnectionAddress(online);

      return address.startsWith("proxy:");
    });

  const hasVpnConnection = !!(user?.vpnplusConnected || user?.vpn2mbConnected);

  return {
    hasAppConnection,
    hasProxyConnection,
    hasVpnConnection,
    hasWebConnection,
    isConnected:
      hasWebConnection ||
      hasProxyConnection ||
      hasVpnConnection ||
      hasAppConnection,
  };
};

const getCoordinate = (user) => {
  const candidate = user?.cordenadas || user?.coordenadas;

  if (
    !candidate ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number"
  ) {
    return null;
  }

  return {
    latitude: Number(candidate.latitude),
    longitude: Number(candidate.longitude),
  };
};

const getDisplayName = (user) => {
  const fullName =
    user?.profile?.name ||
    `${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`.trim();

  return fullName || user?.username || "Usuario sin nombre";
};

const getRoleLabel = (user) => {
  if (user?.modoCadete) {
    return "cadetes";
  }

  if (
    Array.isArray(user?.profile?.roleComercio) &&
    user.profile.roleComercio.includes("EMPRESA")
  ) {
    return "empresas";
  }

  if (user?.profile?.role === "admin") {
    return "admins";
  }

  return "usuarios";
};

const matchesRoleFilter = (user, roleFilter) => {
  if (roleFilter === "todos") {
    return true;
  }

  if (roleFilter === "online") {
    return Boolean(user.online);
  }

  return getRoleLabel(user) === roleFilter;
};

const SearchInput = ({ colors, value, onChangeText }) => {
  const inputRef = React.useRef(null);

  return (
    <Surface
      style={[styles.searchWrap, { backgroundColor: colors.searchSurface }]}
      elevation={0}
    >
      <IconButton
        icon="magnify"
        iconColor={colors.icon}
        size={20}
        style={styles.searchLeadingIcon}
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar por nombre, username o rol"
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.selection}
        cursorColor={colors.cursor}
        style={[styles.searchInput, { color: colors.text }]}
      />
      {value ? (
        <IconButton
          icon="close"
          iconColor={colors.icon}
          size={18}
          style={styles.searchTrailingIcon}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </Surface>
  );
};

const SummaryCard = ({ colors, compact, label, tone, value }) => (
  <Surface
    style={[
      styles.summaryCard,
      compact && styles.summaryCardCompact,
      { backgroundColor: colors.metricSurface },
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
      style={[
        styles.summaryValue,
        tone ? { color: tone } : { color: colors.title },
      ]}
    >
      {value}
    </Text>
  </Surface>
);

const FilterChip = ({ colors, label, selected, onPress }) => (
  <Chip
    selected={selected}
    showSelectedCheck={selected}
    onPress={onPress}
    style={[
      styles.filterChip,
      {
        backgroundColor: colors.filterChipBackground,
        borderColor: colors.filterChipBorder,
      },
      selected && {
        backgroundColor: colors.filterChipSelectedBackground,
        borderColor: colors.filterChipSelectedBorder,
      },
    ]}
    textStyle={[
      styles.filterChipText,
      { color: colors.filterChipText },
      selected && { color: colors.filterChipSelectedText },
    ]}
  >
    {label}
  </Chip>
);

const LoadingState = ({ colors }) => (
  <Surface
    style={[styles.centerCard, { backgroundColor: colors.cardSurface }]}
    elevation={0}
  >
    <ActivityIndicator size="large" color={colors.accent} />
    <Text
      variant="titleMedium"
      style={[styles.centerTitle, { color: colors.title }]}
    >
      Cargando usuarios con ubicación
    </Text>
    <Text
      variant="bodyMedium"
      style={[styles.centerCopy, { color: colors.copy }]}
    >
      Se está preparando el mapa y la distribución geográfica disponible para
      esta sesión.
    </Text>
  </Surface>
);

const buildPalette = (theme) => {
  if (theme.dark) {
    return {
      accent: "#60a5fa",
      accentText: "#dbeafe",
      border: "rgba(148, 163, 184, 0.18)",
      cardSurface: "rgba(15, 23, 42, 0.94)",
      copy: "#cbd5e1",
      cursor: "#f8fafc",
      filterChipBackground: "rgba(30, 41, 59, 0.86)",
      filterChipBorder: "rgba(100, 116, 139, 0.24)",
      filterChipSelectedBackground: "rgba(59, 130, 246, 0.28)",
      filterChipSelectedBorder: "rgba(96, 165, 250, 0.4)",
      filterChipSelectedText: "#dbeafe",
      filterChipText: "#cbd5e1",
      heroSurface: "#0b1220",
      icon: "#f8fafc",
      label: "#94a3b8",
      metricSurface: "rgba(30, 41, 59, 0.82)",
      mutedBackground: "rgba(51, 65, 85, 0.72)",
      mutedText: "#cbd5e1",
      placeholder: "rgba(203, 213, 225, 0.58)",
      screen: "#020617",
      searchSurface: "rgba(15, 23, 42, 0.78)",
      selection: "rgba(255, 255, 255, 0.18)",
      softAccent: "rgba(59, 130, 246, 0.22)",
      softNeutral: "rgba(67, 56, 202, 0.32)",
      successBackground: "rgba(34, 197, 94, 0.18)",
      successText: "#bbf7d0",
      surfaceElevated: "rgba(15, 23, 42, 0.96)",
      text: "#f8fafc",
      title: "#f8fafc",
    };
  }

  return {
    accent: "#2563eb",
    accentText: "#1d4ed8",
    border: "rgba(148, 163, 184, 0.18)",
    cardSurface: "#ffffff",
    copy: "#475569",
    cursor: "#111827",
    filterChipBackground: "#ffffff",
    filterChipBorder: "rgba(148, 163, 184, 0.22)",
    filterChipSelectedBackground: "rgba(37, 99, 235, 0.12)",
    filterChipSelectedBorder: "rgba(37, 99, 235, 0.28)",
    filterChipSelectedText: "#1d4ed8",
    filterChipText: "#334155",
    heroSurface: "#0f172a",
    icon: "#0f172a",
    label: "#64748b",
    metricSurface: "#f8fafc",
    mutedBackground: "rgba(226, 232, 240, 0.92)",
    mutedText: "#475569",
    placeholder: "rgba(71, 85, 105, 0.55)",
    screen: "#eef3fb",
    searchSurface: "#ffffff",
    selection: "rgba(15, 23, 42, 0.14)",
    softAccent: "rgba(37, 99, 235, 0.1)",
    softNeutral: "rgba(148, 163, 184, 0.18)",
    successBackground: "rgba(34, 197, 94, 0.12)",
    successText: "#15803d",
    surfaceElevated: "rgba(255, 255, 255, 0.98)",
    text: "#111827",
    title: "#0f172a",
  };
};

const MapaUsuariosScreen = () => {
  const theme = useTheme();
  const colors = React.useMemo(() => buildPalette(theme), [theme]);
  const { width } = useWindowDimensions();
  const compactMetrics = width < 780;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("todos");
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState(null);
  const [currentLocation, setCurrentLocation] = React.useState(null);
  const [resolvingLocation, setResolvingLocation] = React.useState(false);
  const dataReady = useDeferredScreenData();

  const { ready, users } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { ready: false, users: [] };
    }

    const handle = Meteor.subscribe("user", LOCATION_SELECTOR, {
      fields: LOCATION_FIELDS,
    });

    const docs = Meteor.users
      .find(LOCATION_SELECTOR, {
        fields: LOCATION_FIELDS,
      })
      .fetch();
    const userIds = docs.map((doc) => doc?._id).filter(Boolean);
    const connectionsHandle = Meteor.subscribe(
      "conexiones",
      { userId: { $in: userIds } },
      { fields: { userId: 1, address: 1, hostname: 1 } },
    );
    const connections = Online.find(
      { userId: { $in: userIds } },
      { fields: { userId: 1, address: 1, hostname: 1 } },
    ).fetch();

    const normalizedUsers = docs
      .map((doc) => {
        const coordinate = getCoordinate(doc);
        if (!coordinate) {
          return null;
        }

        const roleComercio = Array.isArray(doc?.profile?.roleComercio)
          ? doc.profile.roleComercio
          : [];
        const connectionState = getUserConnectionState(doc, connections);

        return {
          ...doc,
          coordinate,
          displayName: getDisplayName(doc),
          hasAppConnection: connectionState.hasAppConnection,
          hasProxyConnection: connectionState.hasProxyConnection,
          hasVpnConnection: connectionState.hasVpnConnection,
          hasWebConnection: connectionState.hasWebConnection,
          isEmpresa: roleComercio.includes("EMPRESA"),
          online: connectionState.isConnected,
          roleLabel: getRoleLabel(doc),
          timestamp:
            (doc?.cordenadas || doc?.coordenadas)?.timestamp || doc?.createdAt,
          username: doc?.username || "",
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.online !== right.online) {
          return left.online ? -1 : 1;
        }

        return left.displayName.localeCompare(right.displayName, "es", {
          sensitivity: "base",
        });
      });

    return {
      ready:
        (handle?.ready?.() ?? false) && (connectionsHandle?.ready?.() ?? false),
      users: normalizedUsers,
    };
  }, [dataReady]);

  const filteredUsers = React.useMemo(() => {
    const search = normalizeString(searchQuery);

    return users.filter((user) => {
      if (!matchesRoleFilter(user, roleFilter)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        user.displayName,
        user.username,
        user.profile?.role,
        user.roleLabel,
      ]
        .map(normalizeString)
        .join(" ");

      return haystack.includes(search);
    });
  }, [roleFilter, searchQuery, users]);

  const selectedUser = React.useMemo(
    () =>
      filteredUsers.find((user) => user._id === selectedUserId) ||
      filteredUsers[0] ||
      null,
    [filteredUsers, selectedUserId],
  );

  React.useEffect(() => {
    if (!selectedUser) {
      setSelectedUserId(null);
      return;
    }

    if (selectedUser._id !== selectedUserId) {
      setSelectedUserId(selectedUser._id);
    }
  }, [selectedUser, selectedUserId]);

  const stats = React.useMemo(
    () => ({
      admins: users.filter((user) => user.profile?.role === "admin").length,
      cadetes: users.filter((user) => user.modoCadete).length,
      empresas: users.filter((user) => user.isEmpresa).length,
      online: users.filter((user) => user.online).length,
      total: users.length,
      visibles: filteredUsers.length,
    }),
    [filteredUsers.length, users],
  );

  const handleLocateMe = React.useCallback(async () => {
    setResolvingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        latitude: Number(position.coords.latitude),
        longitude: Number(position.coords.longitude),
      });
    } catch (error) {
      console.warn("No se pudo resolver la ubicación actual del mapa.", error);
    } finally {
      setResolvingLocation(false);
    }
  }, []);

  const filtersActive = Boolean(searchQuery) || roleFilter !== "todos";

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <AppHeader
        actions={
          <Appbar.Action
            icon={showFilters ? "filter-off-outline" : "filter-variant"}
            iconColor="#ffffff"
            onPress={() => setShowFilters((current) => !current)}
          />
        }
        title="Mapa de usuarios"
        subtitle="Supervisión geográfica y filtro operativo por rol"
        showBackButton
        backHref="/(normal)/Main"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Surface
          style={[styles.heroCard, { backgroundColor: colors.heroSurface }]}
          elevation={0}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleWrap}>
              <Text variant="headlineSmall" style={styles.heroTitle}>
                Vista territorial de usuarios activos y con coordenadas
              </Text>
              <Text variant="bodyMedium" style={styles.heroCopy}>
                Esta pantalla concentra usuarios con ubicación conocida, permite
                filtrarlos por rol y ofrece una lectura más clara que el legacy
                al separar métricas, búsqueda y detalle del punto seleccionado.
              </Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryCard
              colors={colors}
              compact={compactMetrics}
              label="Total"
              value={stats.total}
            />
            <SummaryCard
              colors={colors}
              compact={compactMetrics}
              label="En línea"
              value={stats.online}
              tone="#22c55e"
            />
            <SummaryCard
              colors={colors}
              compact={compactMetrics}
              label="Cadetes"
              value={stats.cadetes}
              tone="#f97316"
            />
            <SummaryCard
              colors={colors}
              compact={compactMetrics}
              label="Empresas"
              value={stats.empresas}
              tone="#14b8a6"
            />
            <SummaryCard
              colors={colors}
              compact={compactMetrics}
              label="Admins"
              value={stats.admins}
              tone="#a78bfa"
            />
            <SummaryCard
              colors={colors}
              compact={compactMetrics}
              label="Visibles"
              value={stats.visibles}
              tone={colors.accent}
            />
          </View>
        </Surface>

        {showFilters ? (
          <Surface
            style={[
              styles.filtersCard,
              { backgroundColor: colors.cardSurface },
            ]}
            elevation={0}
          >
            <SearchInput
              colors={colors}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {ROLE_FILTERS.map((filter) => (
                <FilterChip
                  key={filter}
                  colors={colors}
                  label={filter.charAt(0).toUpperCase() + filter.slice(1)}
                  selected={roleFilter === filter}
                  onPress={() => setRoleFilter(filter)}
                />
              ))}
            </ScrollView>

            <View style={styles.filterFooter}>
              <Chip
                style={[
                  styles.metaBadge,
                  { backgroundColor: colors.softNeutral },
                ]}
                textStyle={{ color: colors.copy }}
              >
                {filtersActive ? "Filtros aplicados" : "Sin filtros extra"}
              </Chip>
              {filtersActive ? (
                <Button
                  onPress={() => {
                    setSearchQuery("");
                    setRoleFilter("todos");
                  }}
                >
                  Limpiar
                </Button>
              ) : null}
            </View>
          </Surface>
        ) : null}

        {!ready ? (
          <LoadingState colors={colors} />
        ) : (
          <Surface
            style={[styles.mapCard, { backgroundColor: colors.cardSurface }]}
            elevation={0}
          >
            <View style={styles.mapHeader}>
              <View style={styles.mapHeaderCopy}>
                <Text
                  variant="titleMedium"
                  style={[styles.mapTitle, { color: colors.title }]}
                >
                  Cobertura geográfica disponible
                </Text>
                <Text variant="bodySmall" style={{ color: colors.copy }}>
                  El mapa respeta el zoom y el desplazamiento que hagas. Usa
                  Ver todos dentro del mapa cuando necesites encuadrar todos
                  los usuarios al mismo tiempo.
                </Text>
              </View>
              <Button
                mode="contained-tonal"
                icon="crosshairs-gps"
                loading={resolvingLocation}
                onPress={handleLocateMe}
              >
                Mi ubicación
              </Button>
            </View>

            <View style={styles.legendRow}>
              <Chip
                style={[
                  styles.legendChip,
                  { backgroundColor: colors.successBackground },
                ]}
                textStyle={{ color: colors.successText }}
              >
                En línea
              </Chip>
              <Chip
                style={[
                  styles.legendChip,
                  { backgroundColor: colors.softAccent },
                ]}
                textStyle={{ color: colors.accentText }}
              >
                Seleccionado
              </Chip>
              <Chip
                style={[
                  styles.legendChip,
                  { backgroundColor: colors.softNeutral },
                ]}
                textStyle={{ color: colors.copy }}
              >
                Admin / Empresa / Cadete según pin
              </Chip>
            </View>

            <View style={styles.mapFrame}>
              <MapaUsuarios
                colors={colors}
                currentLocation={currentLocation}
                emptyMessage={
                  roleFilter === "todos"
                    ? "No se encontraron usuarios con coordenadas publicadas para esta sesión."
                    : `No hay resultados para el filtro ${roleFilter}.`
                }
                loading={ready === false}
                onRequestCurrentLocation={handleLocateMe}
                onSelectUser={(user) => setSelectedUserId(user._id)}
                selectedUser={selectedUser}
                users={filteredUsers}
              />
            </View>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  centerCard: {
    alignItems: "center",
    borderRadius: 26,
    gap: 14,
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  centerCopy: {
    lineHeight: 22,
    maxWidth: 540,
    textAlign: "center",
  },
  centerIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  centerTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontWeight: "700",
  },
  filterFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterRow: {
    gap: 10,
    paddingVertical: 2,
  },
  filtersCard: {
    borderRadius: 24,
    gap: 16,
    padding: 18,
  },
  heroCard: {
    borderRadius: 28,
    gap: 22,
    padding: 22,
  },
  heroCopy: {
    color: "rgba(255, 255, 255, 0.82)",
    lineHeight: 21,
  },
  heroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  heroTitle: {
    color: "#ffffff",
    fontWeight: "900",
  },
  heroTitleWrap: {
    flex: 1,
    gap: 8,
  },
  legendChip: {
    borderRadius: 999,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mapCard: {
    borderRadius: 28,
    gap: 16,
    padding: 18,
  },
  mapFrame: {
    borderRadius: 28,
    height: 520,
    overflow: "hidden",
  },
  mapHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  mapHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  mapTitle: {
    fontWeight: "800",
  },
  metaBadge: {
    borderRadius: 999,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  searchLeadingIcon: {
    margin: 0,
  },
  searchTrailingIcon: {
    margin: 0,
  },
  searchWrap: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    paddingHorizontal: 6,
  },
  summaryCard: {
    borderRadius: 22,
    flexGrow: 1,
    gap: 4,
    minWidth: 150,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryCardCompact: {
    minWidth: "48%",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryLabel: {
    fontWeight: "700",
  },
  summaryValue: {
    fontWeight: "900",
  },
});

export default MapaUsuariosScreen;
