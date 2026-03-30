import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Chip,
  Searchbar,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import AppHeader from "../Header/AppHeader";
import { Online } from "../collections/collections";
import UserAvatar from "./UserAvatar";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const BYTES_IN_MB_BINARY = 1048576;
const BYTES_IN_GB_BINARY = 1073741824;

const clamp01 = (value) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);

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

const getUserConnectionState = (user, connections) => {
  const onlineConnections = Array.isArray(connections) ? connections : [];

  const hasWebConnection =
    onlineConnections.length > 0 &&
    onlineConnections.some(
      (online) =>
        online?.userId &&
        matchesUserId(online.userId, user?._id) &&
        online.address != null,
    );

  const hasProxyConnection =
    onlineConnections.length > 0 &&
    onlineConnections.some(
      (online) =>
        online?.userId &&
        matchesUserId(online.userId, user?._id) &&
        !online.address,
    );

  const hasVpnConnection = !!(user?.vpnplusConnected || user?.vpn2mbConnected);
  const isConnected =
    hasWebConnection || hasProxyConnection || hasVpnConnection;
  const connectionType = hasWebConnection
    ? "web"
    : hasProxyConnection
      ? "proxy"
      : "vpn";

  return {
    hasWebConnection,
    hasProxyConnection,
    hasVpnConnection,
    isConnected,
    connectionType,
  };
};

const getUsageTone = (ratio) => {
  const safeRatio = clamp01(ratio);
  if (safeRatio >= 0.8) {
    return { fill: "#D32F2F", track: "#FFEBEE" };
  }
  if (safeRatio >= 0.6) {
    return { fill: "#EF6C00", track: "#FFF3E0" };
  }
  return { fill: "#2E7D32", track: "#E8F5E9" };
};

const ServiceProgressPill = ({ label, ratio, rightText, width, palette }) => {
  const tone = getUsageTone(ratio);
  return (
    <View style={[styles.pill, { backgroundColor: tone.track, width }]}>
      <View
        style={[
          styles.pillFill,
          {
            width: `${clamp01(ratio) * 100}%`,
            backgroundColor: palette?.fill || tone.fill,
          },
        ]}
      />
      <View style={styles.pillContent}>
        <Chip compact style={styles.pillChip} textStyle={styles.pillChipText}>
          {label}
        </Chip>
        <Text numberOfLines={1} style={styles.pillText}>
          {rightText}
        </Text>
      </View>
    </View>
  );
};

const UsersHome = () => {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filtroVPN, setFiltroVPN] = useState(null);
  const [filtroProxy, setFiltroProxy] = useState(null);
  const [filtroConexion, setFiltroConexion] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    admins: false,
    users: false,
  });

  const { loading, users, connections } = Meteor.useTracker(() => {
    const username = Meteor.user()?.username;
    const userFilter =
      username === "carlosmbinf"
        ? {}
        : {
            $or: [
              { bloqueadoDesbloqueadoPor: Meteor.userId() },
              { bloqueadoDesbloqueadoPor: { $exists: false } },
              { bloqueadoDesbloqueadoPor: { $in: [""] } },
            ],
          };

    const userHandle = Meteor.subscribe("user", userFilter, {
      fields: {
        username: 1,
        profile: 1,
        picture: 1,
        vpnMbGastados: 1,
        megasGastadosinBytes: 1,
        idtelegram: 1,
        notificarByTelegram: 1,
        vpnplusConnected: 1,
        vpn2mbConnected: 1,
        vpn: 1,
        baneado: 1,
        vpnisIlimitado: 1,
        isIlimitado: 1,
        vpnmegas: 1,
        megas: 1,
      },
    });
    const connectionHandle = Meteor.subscribe(
      "conexiones",
      {},
      { fields: { userId: 1, address: 1 } },
    );
    return {
      loading: !userHandle.ready() || !connectionHandle.ready(),
      users: Meteor.users
        .find(userFilter, {
          sort: {
            vpnMbGastados: -1,
            megasGastadosinBytes: -1,
            "profile.firstName": 1,
            "profile.lastName": 1,
          },
          fields: {
            username: 1,
            profile: 1,
            picture: 1,
            vpnMbGastados: 1,
            megasGastadosinBytes: 1,
            idtelegram: 1,
            notificarByTelegram: 1,
            vpnplusConnected: 1,
            vpn2mbConnected: 1,
            vpn: 1,
            baneado: 1,
            vpnisIlimitado: 1,
            isIlimitado: 1,
            vpnmegas: 1,
            megas: 1,
          },
        })
        .fetch(),
      connections: Online.find(
        {},
        { fields: { userId: 1, address: 1 } },
      ).fetch(),
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return users.filter((user) => {
      if (!user?.profile) {
        return false;
      }
      if (term) {
        const username = user.username?.toLowerCase() || "";
        const firstName = user.profile?.firstName?.toLowerCase() || "";
        const lastName = user.profile?.lastName?.toLowerCase() || "";
        if (
          !username.includes(term) &&
          !firstName.includes(term) &&
          !lastName.includes(term)
        ) {
          return false;
        }
      }
      if (filtroVPN !== null && (user.vpn === true) !== filtroVPN) {
        return false;
      }
      if (filtroProxy !== null && (user.baneado === false) !== filtroProxy) {
        return false;
      }
      if (filtroConexion !== null) {
        const { isConnected } = getUserConnectionState(user, connections);
        if (filtroConexion === "conectado" && !isConnected) {
          return false;
        }
        if (filtroConexion === "desconectado" && isConnected) {
          return false;
        }
      }
      return true;
    });
  }, [connections, filtroConexion, filtroProxy, filtroVPN, search, users]);

  const admins = filteredUsers.filter((user) => user.profile?.role === "admin");
  const normalUsers = filteredUsers.filter(
    (user) => user.profile?.role === "user",
  );

  const renderUser = ({ item }) => {
    const { isConnected, connectionType } = getUserConnectionState(
      item,
      connections,
    );

    const vpnActivo = item.vpn === true;
    const proxyActivo = item.baneado === false;
    const vpnPorMegas = !item.vpnisIlimitado && item.vpnmegas > 0;
    const proxyPorMegas = !item.isIlimitado && item.megas > 0;
    const vpnConsumidoBytes = item.vpnMbGastados || 0;
    const vpnConsumidoMB = vpnConsumidoBytes / BYTES_IN_MB_BINARY;
    const vpnConsumidoGB = vpnConsumidoBytes / BYTES_IN_GB_BINARY;
    const vpnLimiteMB = Number(item.vpnmegas || 0);
    const vpnProgress = vpnPorMegas ? clamp01(vpnConsumidoMB / vpnLimiteMB) : 0;
    const proxyConsumidoBytes = item.megasGastadosinBytes || 0;
    const proxyConsumidoMB = proxyConsumidoBytes / BYTES_IN_MB_BINARY;
    const proxyConsumidoGB = proxyConsumidoBytes / BYTES_IN_GB_BINARY;
    const proxyLimiteMB = Number(item.megas || 0);
    const proxyProgress = proxyPorMegas
      ? clamp01(proxyConsumidoMB / proxyLimiteMB)
      : 0;
    const vpnRightText = vpnActivo
      ? `${vpnConsumidoGB.toFixed(1)} GB${vpnPorMegas ? ` / ${formatGB(vpnLimiteMB)} GB` : ""}${item.vpnisIlimitado ? " (∞)" : ""}`
      : "Inactivo";
    const proxyRightText = proxyActivo
      ? `${proxyConsumidoGB.toFixed(1)} GB${proxyPorMegas ? ` / ${formatGB(proxyLimiteMB)} GB` : ""}${item.isIlimitado ? " (∞)" : ""}`
      : "Inactivo";

    return (
      <Surface
        key={item._id}
        elevation={2}
        style={[
          styles.itemCard,
          {
            backgroundColor: theme.dark ? "#2f2a38" : "#ffffff",
          },
        ]}
      >
        <View style={styles.itemCardInner}>
          <View style={styles.avatarContainer}>
            <UserAvatar
              user={item}
              isConnected={isConnected}
              connectionType={connectionType}
              size={50}
            />
          </View>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(normal)/User",
                params: { item: item._id },
              })
            }
            style={({ pressed }) => [
              styles.itemPressable,
              pressed && styles.itemPressablePressed,
            ]}
          >
            <View style={styles.itemHeaderRow}>
              <View style={styles.itemTitleWrap}>
                <Text style={styles.itemTitle}>
                  {`${item.profile.firstName || ""} ${item.profile.lastName || ""}`.trim() ||
                    item.username}
                </Text>
                <Text style={styles.username}>{item.username}</Text>
              </View>
              <Appbar.Action
                icon="chevron-right"
                size={20}
                onPress={() =>
                  router.push({
                    pathname: "/(normal)/User",
                    params: { item: item._id },
                  })
                }
              />
            </View>

            <View style={styles.itemDescription}>
              <View style={styles.servicesContainer}>
                <ServiceProgressPill
                  label="VPN"
                  ratio={vpnActivo && vpnPorMegas ? vpnProgress : 0}
                  rightText={vpnRightText}
                  palette={{ fill: "#2E7D32" }}
                  width={220}
                />
                <ServiceProgressPill
                  label="PROXY"
                  ratio={proxyActivo && proxyPorMegas ? proxyProgress : 0}
                  rightText={proxyRightText}
                  palette={{ fill: "#1565C0" }}
                />
              </View>
            </View>
          </Pressable>
        </View>
      </Surface>
    );
  };

  const toggleSection = (key) => {
    setExpandedSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const renderSection = ({ key, title, data, accent }) => {
    const expanded = expandedSections[key];

    return (
      <Surface
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.dark ? "#241f2b" : "#ffffff",
            borderColor: theme.dark
              ? "rgba(255,255,255,0.05)"
              : "rgba(15,23,42,0.06)",
          },
        ]}
        elevation={0}
      >
        <Pressable
          onPress={() => toggleSection(key)}
          style={({ pressed }) => [
            styles.sectionHeader,
            pressed && styles.sectionHeaderPressed,
          ]}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
            <View style={styles.sectionTextWrap}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <Text style={styles.sectionSubtitle}>
                {data.length === 1
                  ? "1 usuario visible"
                  : `${data.length} usuarios visibles`}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRight}>
            <Chip
              compact
              style={styles.sectionCountChip}
              textStyle={styles.sectionCountChipText}
            >
              {data.length}
            </Chip>
            <Appbar.Action
              icon={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              onPress={() => toggleSection(key)}
            />
          </View>
        </Pressable>

        {expanded ? (
          <View style={styles.sectionContent}>
            {data.length ? (
              <FlatList
                data={data}
                renderItem={renderUser}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptySectionState}>
                <Text style={styles.emptySectionTitle}>
                  Sin usuarios en esta sección
                </Text>
                <Text style={styles.emptySectionCopy}>
                  Ajusta los filtros actuales para volver a mostrar resultados.
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </Surface>
    );
  };

  return (
    <Surface style={styles.screen}>
      <AppHeader
        title="Usuarios"
        subtitle="Administración y consumo"
        left={
          <Appbar.BackAction
            iconColor="#fff"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(normal)/Main")
            }
          />
        }
        actions={
          <View style={styles.headerActions}>
            <Appbar.Action
              icon={showFilters ? "filter-off-outline" : "filter-variant"}
              iconColor="#fff"
              onPress={() => setShowFilters((current) => !current)}
            />
            <Appbar.Action
              icon="account-plus"
              iconColor="#fff"
              onPress={() => router.push("/(normal)/CreateUsers")}
            />
          </View>
        }
      />
      {showFilters ? (
        <View style={styles.filtersContainer}>
          <Searchbar
            placeholder="Buscar por usuario o nombre"
            value={search}
            onChangeText={setSearch}
            style={styles.searchbar}
          />
          <View style={styles.filterRow}>
            <Chip
              selected={filtroVPN === null}
              onPress={() => setFiltroVPN(null)}
            >
              VPN: Todos
            </Chip>
            <Chip
              selected={filtroVPN === true}
              onPress={() => setFiltroVPN(true)}
            >
              VPN Activo
            </Chip>
            <Chip
              selected={filtroVPN === false}
              onPress={() => setFiltroVPN(false)}
            >
              VPN Inactivo
            </Chip>
          </View>
          <View style={styles.filterRow}>
            <Chip
              selected={filtroProxy === null}
              onPress={() => setFiltroProxy(null)}
            >
              Proxy: Todos
            </Chip>
            <Chip
              selected={filtroProxy === true}
              onPress={() => setFiltroProxy(true)}
            >
              Proxy Activo
            </Chip>
            <Chip
              selected={filtroProxy === false}
              onPress={() => setFiltroProxy(false)}
            >
              Proxy Inactivo
            </Chip>
          </View>
          <View style={styles.filterRow}>
            <Chip
              selected={filtroConexion === null}
              onPress={() => setFiltroConexion(null)}
            >
              Conexión: Todos
            </Chip>
            <Chip
              selected={filtroConexion === "conectado"}
              onPress={() => setFiltroConexion("conectado")}
            >
              Conectados
            </Chip>
            <Chip
              selected={filtroConexion === "desconectado"}
              onPress={() => setFiltroConexion("desconectado")}
            >
              Desconectados
            </Chip>
          </View>
          <Button
            mode="text"
            onPress={() => {
              setSearch("");
              setFiltroVPN(null);
              setFiltroProxy(null);
              setFiltroConexion(null);
            }}
          >
            Limpiar filtros
          </Button>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.loadingState}>
          <Text>Cargando usuarios...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, paddingTop: 12 }}
          data={[
            {
              key: "admins",
              title: "Administradores",
              data: admins,
              accent: "#6366f1",
            },
            {
              key: "users",
              title: "Usuarios",
              data: normalUsers,
              accent: "#14b8a6",
            },
          ]}
          renderItem={({ item }) => renderSection(item)}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  filtersContainer: { padding: 16, gap: 10 },
  searchbar: { borderRadius: 16 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 14,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 2,
    overflow: "hidden",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 74,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderPressed: {
    opacity: 0.94,
  },
  sectionHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  sectionHeaderRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  sectionAccent: {
    borderRadius: 99,
    height: 12,
    width: 12,
  },
  sectionTextWrap: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
    opacity: 0.65,
  },
  sectionCountChip: {
    backgroundColor: "rgba(99,102,241,0.12)",
    borderRadius: 999,
  },
  sectionCountChipText: {
    color: "#5b5bd6",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionContent: {
    paddingBottom: 10,
  },
  itemCard: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 18,
  },
  itemCardInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemPressable: {
    flex: 1,
  },
  itemPressablePressed: {
    opacity: 0.95,
  },
  itemHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemTitleWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  avatarContainer: { justifyContent: "center", paddingLeft: 2 },
  itemDescription: { gap: 10, paddingTop: 2 },
  username: { fontSize: 13, fontWeight: "700" },
  servicesContainer: { gap: 8 },
  pill: {
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  pillFill: { position: "absolute", left: 0, top: 0, bottom: 0, opacity: 0.22 },
  pillContent: {
    flex: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pillChip: { backgroundColor: "transparent", borderWidth: 0 },
  pillChipText: { fontSize: 10, fontWeight: "700", color: "#000" },
  pillText: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    opacity: 0.85,
    color: "#000",
  },
  emptySectionState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  emptySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySectionCopy: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  loadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default UsersHome;
