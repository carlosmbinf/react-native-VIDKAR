import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    Appbar,
    Button,
    Chip,
    Portal,
    Searchbar,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader from "../Header/AppHeader";
import { Online, PushTokens } from "../collections/collections";
import ServiceProgressPill from "../shared/ServiceProgressPill";
import UserAvatar from "./UserAvatar";
import { canAccessPushTokenDashboards } from "./pushTokens/utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const BYTES_IN_MB_BINARY = 1048576;
const BYTES_IN_GB_BINARY = 1073741824;
const PEEK_CARD_MARGIN = 18;
const PEEK_MENU_HEIGHT = 286;
const PEEK_MENU_GAP = 12;

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

const matchesConnectionFilter = (connectionState, filtroConexion) => {
  if (!filtroConexion) {
    return true;
  }

  switch (filtroConexion) {
    case "activa":
      return connectionState?.isConnected === true;
    case "desconectado":
      return connectionState?.isConnected !== true;
    case "web":
      return connectionState?.hasWebConnection === true;
    case "proxy":
      return connectionState?.hasProxyConnection === true;
    case "vpn":
      return connectionState?.hasVpnConnection === true;
    case "app":
      return connectionState?.hasAppConnection === true;
    default:
      return true;
  }
};

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

      if (address.startsWith("proxy:")) {
        return true;
      }

      return false;
    });

  const hasVpnConnection = !!(user?.vpnplusConnected || user?.vpn2mbConnected);
  const isConnected =
    hasWebConnection ||
    hasProxyConnection ||
    hasVpnConnection ||
    hasAppConnection;
  const connectionType = hasWebConnection
    ? "web"
    : hasProxyConnection
      ? "proxy"
      : hasVpnConnection
        ? "vpn"
        : hasAppConnection
          ? "app"
          : null;

  return {
    hasWebConnection,
    hasProxyConnection,
    hasVpnConnection,
    hasAppConnection,
    isConnected,
    connectionType,
  };
};

const getDisplayName = (user) => {
  const firstName = user?.profile?.firstName || "";
  const lastName = user?.profile?.lastName || "";
  const composed = `${firstName} ${lastName}`.trim();

  return composed || user?.username || "Usuario";
};

const getPushState = (user, pushTokens) => {
  const tokens = Array.isArray(pushTokens) ? pushTokens : [];
  const userTokens = tokens.filter(
    (tokenDoc) => tokenDoc?.userId && matchesUserId(tokenDoc.userId, user?._id),
    // && tokenDoc.provider === "expo",
  );

  const hasPush = userTokens.length > 0;
  const latestUpdatedAt = userTokens.reduce((latest, tokenDoc) => {
    const nextDate = tokenDoc?.updatedAt ? new Date(tokenDoc.updatedAt) : null;

    if (!nextDate || Number.isNaN(nextDate.getTime())) {
      return latest;
    }

    if (!latest || nextDate > latest) {
      return nextDate;
    }

    return latest;
  }, null);

  return {
    hasPush,
    latestUpdatedAt,
    tokenCount: userTokens.length,
  };
};

const getConnectionBadgesMeta = (connectionState) => {
  const badges = [];

  if (connectionState?.hasWebConnection) {
    badges.push({
      backgroundColor: "rgba(16,255,224,0.14)",
      borderColor: "rgba(16,255,224,0.35)",
      label: "Web",
      textColor: "#00796B",
    });
  }

  if (connectionState?.hasProxyConnection) {
    badges.push({
      backgroundColor: "rgba(16,45,255,0.12)",
      borderColor: "rgba(16,45,255,0.28)",
      label: "Proxy",
      textColor: "#1D4ED8",
    });
  }

  if (connectionState?.hasVpnConnection) {
    badges.push({
      backgroundColor: "rgba(16,255,0,0.12)",
      borderColor: "rgba(16,255,0,0.28)",
      label: "VPN",
      textColor: "#2E7D32",
    });
  }

  if (connectionState?.hasAppConnection) {
    badges.push({
      backgroundColor: "rgba(176, 7, 30, 0.56)",
      borderColor: "rgba(176, 7, 30, 0.82)",
      label: "APP",
      textColor: "#2E7D32",
    });
  }

  if (badges.length > 0) {
    return badges;
  }

  return [
    {
      backgroundColor: "rgba(100,116,139,0.14)",
      borderColor: "rgba(100,116,139,0.22)",
      label: "Offline",
      textColor: "#475569",
    },
  ];
};

const getServiceSnapshot = (item) => {
  const vpnActivo = item?.vpn === true;
  const proxyActivo = item?.baneado === false;
  const vpnPorMegas = !item?.vpnisIlimitado && item?.vpnmegas > 0;
  const proxyPorMegas = !item?.isIlimitado && item?.megas > 0;
  const vpnConsumidoBytes = item?.vpnMbGastados || 0;
  const vpnConsumidoMB = vpnConsumidoBytes / BYTES_IN_MB_BINARY;
  const vpnConsumidoGB = vpnConsumidoBytes / BYTES_IN_GB_BINARY;
  const vpnLimiteMB = Number(item?.vpnmegas || 0);
  const vpnProgress = vpnPorMegas ? clamp01(vpnConsumidoMB / vpnLimiteMB) : 0;
  const proxyConsumidoBytes = item?.megasGastadosinBytes || 0;
  const proxyConsumidoMB = proxyConsumidoBytes / BYTES_IN_MB_BINARY;
  const proxyConsumidoGB = proxyConsumidoBytes / BYTES_IN_GB_BINARY;
  const proxyLimiteMB = Number(item?.megas || 0);
  const proxyProgress = proxyPorMegas
    ? clamp01(proxyConsumidoMB / proxyLimiteMB)
    : 0;

  return {
    proxyActivo,
    proxyBadgeText: proxyActivo
      ? item?.isIlimitado
        ? "Ilimitado"
        : proxyPorMegas
          ? `${formatGB(proxyLimiteMB)} GB`
          : "Activo"
      : "Inactivo",
    proxyPorMegas,
    proxyProgress,
    proxyRightText: proxyActivo
      ? `${proxyConsumidoGB.toFixed(1)} GB${proxyPorMegas ? ` / ${formatGB(proxyLimiteMB)} GB` : ""}${item?.isIlimitado ? " (∞)" : ""}`
      : "Inactivo",
    vpnActivo,
    vpnBadgeText: vpnActivo
      ? item?.vpnisIlimitado
        ? "Ilimitado"
        : vpnPorMegas
          ? `${formatGB(vpnLimiteMB)} GB`
          : "Activo"
      : "Inactivo",
    vpnPorMegas,
    vpnProgress,
    vpnRightText: vpnActivo
      ? `${vpnConsumidoGB.toFixed(1)} GB${vpnPorMegas ? ` / ${formatGB(vpnLimiteMB)} GB` : ""}${item?.vpnisIlimitado ? " (∞)" : ""}`
      : "Inactivo",
  };
};

const getUsersLayout = (screenWidth) => {
  const width = Number(screenWidth) || 390;
  const listPaddingHorizontal = 12;
  const sectionPaddingHorizontal = width < 390 ? 14 : 18;
  const gridGap =
    width >= 1024 ? 16 : width >= 768 ? 14 : width < 390 ? 16 : 12;
  const availableGridWidth = Math.max(
    220,
    width - listPaddingHorizontal * 2 - sectionPaddingHorizontal * 2,
  );

  let columns = 1;

  if (availableGridWidth >= 560) {
    columns = Math.floor((availableGridWidth + gridGap) / (280 + gridGap));
  }

  columns = Math.max(
    1,
    Math.min(
      columns,
      width >= 1440 ? 4 : width >= 1024 ? 3 : width >= 560 ? 2 : 1,
    ),
  );

  const rawCardWidth =
    columns > 1
      ? (availableGridWidth - gridGap * (columns - 1)) / columns
      : availableGridWidth;
  const maxCardWidth = width >= 1200 ? 340 : width >= 768 ? 320 : rawCardWidth;
  const cardWidth = columns > 1 ? Math.min(maxCardWidth, rawCardWidth) : null;
  const compactCard = columns > 1 || width < 390;

  return {
    avatarSize: compactCard ? 44 : 48,
    cardPaddingHorizontal: compactCard ? 9 : 10,
    cardPaddingVertical: compactCard ? 9 : 10,
    cardWidth,
    columns,
    compactCard,
    footerStack: compactCard,
    gridGap,
    listPaddingHorizontal,
    overlayAvatarSize: compactCard ? 50 : 54,
    sectionPaddingHorizontal,
    textScale: compactCard ? 0.94 : 1,
  };
};

const MetaPill = ({ backgroundColor, borderColor, label, textColor }) => (
  <View
    style={[
      styles.metaPill,
      {
        backgroundColor,
        borderColor,
      },
    ]}
  >
    <Text
      numberOfLines={1}
      style={[
        styles.metaPillText,
        {
          color: textColor,
        },
      ]}
    >
      {label}
    </Text>
  </View>
);

const UserCardContent = ({
  item,
  connections,
  layout,
  overlayMode = false,
  pushTokens,
  showPushState = true,
  theme,
}) => {
  const connectionState = getUserConnectionState(item, connections);
  const connectionBadges = getConnectionBadgesMeta(connectionState);
  const pushState = getPushState(item, pushTokens);
  const serviceSnapshot = getServiceSnapshot(item);
  const displayName = getDisplayName(item);
  const roleLabel =
    item?.profile?.role === "admin" ? "Administrador" : "Usuario";
  const pushLabel = pushState.hasPush
    ? pushState.tokenCount > 1
      ? `Push ${pushState.tokenCount} disp.`
      : "Push activo"
    : "Sin push";
  const palette = theme.dark
    ? {
        body: "#d7dbe4",
        footer: "#aeb6c5",
        title: "#f8fafc",
        username: "#cbd5e1",
      }
    : {
        body: "#334155",
        footer: "#64748b",
        title: "#0f172a",
        username: "#475569",
      };

  return (
    <View
      style={[
        styles.userCardBody,
        overlayMode ? styles.userCardBodyOverlay : null,
      ]}
    >
      <View style={styles.userCardHeaderRow}>
        <View style={styles.userIdentityRow}>
          <UserAvatar
            user={item}
            isConnected={connectionState.isConnected}
            connectionType={connectionState.connectionType}
            size={overlayMode ? layout.overlayAvatarSize : layout.avatarSize}
          />

          <View style={styles.userIdentityTextWrap}>
            <View style={styles.userTitleRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.itemTitle,
                  {
                    color: palette.title,
                    fontSize: 15 * layout.textScale,
                  },
                ]}
              >
                {displayName}
              </Text>
            </View>

            <View style={styles.connectionPillsRow}>
              {connectionBadges.map((badge) => (
                <MetaPill
                  key={`${item?._id || "user"}-${badge.label}`}
                  {...badge}
                />
              ))}
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.username,
                {
                  color: palette.username,
                  fontSize: 10 * layout.textScale,
                },
              ]}
            >
              @{item?.username || "sin-usuario"}
            </Text>

            <View style={styles.metaPillsRow}>
              <MetaPill
                backgroundColor={
                  theme.dark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)"
                }
                borderColor={
                  theme.dark
                    ? "rgba(129,140,248,0.28)"
                    : "rgba(99,102,241,0.16)"
                }
                label={roleLabel}
                textColor={theme.dark ? "#e0e7ff" : "#4338ca"}
              />
              {showPushState ? (
                <MetaPill
                  backgroundColor={
                    pushState.hasPush
                      ? theme.dark
                        ? "rgba(34,197,94,0.18)"
                        : "rgba(34,197,94,0.1)"
                      : theme.dark
                        ? "rgba(148,163,184,0.14)"
                        : "rgba(100,116,139,0.1)"
                  }
                  borderColor={
                    pushState.hasPush
                      ? theme.dark
                        ? "rgba(74,222,128,0.26)"
                        : "rgba(34,197,94,0.18)"
                      : theme.dark
                        ? "rgba(148,163,184,0.22)"
                        : "rgba(100,116,139,0.16)"
                  }
                  label={pushLabel}
                  textColor={
                    pushState.hasPush
                      ? theme.dark
                        ? "#dcfce7"
                        : "#15803d"
                      : theme.dark
                        ? "#e2e8f0"
                        : "#475569"
                  }
                />
              ) : null}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.chevronBadge,
            {
              backgroundColor: theme.dark
                ? "rgba(148,163,184,0.16)"
                : "rgba(15,23,42,0.05)",
            },
          ]}
        >
          <Text style={[styles.chevronBadgeText, { color: palette.footer }]}>
            ›
          </Text>
        </View>
      </View>

      <View style={styles.itemDescription}>
        <View style={styles.servicesContainer}>
          <ServiceProgressPill
            label="VPN"
            ratio={
              serviceSnapshot.vpnActivo && serviceSnapshot.vpnPorMegas
                ? serviceSnapshot.vpnProgress
                : 0
            }
            rightText={serviceSnapshot.vpnRightText}
            palette={{ fill: "#2E7D32" }}
            width="100%"
          />
          <ServiceProgressPill
            label="PROXY"
            ratio={
              serviceSnapshot.proxyActivo && serviceSnapshot.proxyPorMegas
                ? serviceSnapshot.proxyProgress
                : 0
            }
            rightText={serviceSnapshot.proxyRightText}
            palette={{ fill: "#1565C0" }}
            width="100%"
          />
        </View>
      </View>

      <View
        style={[
          styles.userCardFooter,
          layout.footerStack
            ? {
                alignItems: "flex-start",
                flexDirection: "column",
                gap: 4,
              }
            : null,
        ]}
      >
        <Text
          style={[
            styles.userCardFooterText,
            {
              color: palette.footer,
              fontSize: 9 * layout.textScale,
            },
          ]}
        >
          Toca para abrir perfil
        </Text>
        <Text
          style={[
            styles.userCardFooterText,
            {
              color: palette.footer,
              fontSize: 9 * layout.textScale,
            },
          ]}
        >
          Mantén presionado para acciones
        </Text>
      </View>
    </View>
  );
};

const UserListCard = ({
  connections,
  index,
  isPeekSource,
  item,
  layout,
  onLongPeek,
  onPeekStart,
  onOpenProfile,
  peekSourceOpacity,
  peekSourceScale,
  pushTokens,
  showPushState,
  theme,
}) => {
  const cardRef = useRef(null);
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  const fadeTranslateY = useRef(new Animated.Value(10)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fadeOpacity, {
        duration: 220,
        delay: Math.min(index * 45, 240),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(fadeTranslateY, {
        duration: 240,
        delay: Math.min(index * 45, 240),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [fadeOpacity, fadeTranslateY, index]);

  const animatePress = (pressed) => {
    Animated.spring(pressScale, {
      damping: 20,
      mass: 0.85,
      stiffness: 260,
      toValue: pressed ? 0.986 : 1,
      useNativeDriver: true,
    }).start();
  };

  const handleOpenPeek = () => {
    if (!cardRef.current) {
      return;
    }

    onPeekStart?.(item);

    const { height: windowHeight, width: windowWidth } =
      Dimensions.get("window");

    cardRef.current.measureInWindow((x, y, width, height) => {
      const safeWidth = width || windowWidth - 28;
      const safeHeight = height || 224;
      const clampedX = Math.min(
        Math.max(14, x),
        Math.max(14, windowWidth - safeWidth - 14),
      );
      const clampedY = Math.min(
        Math.max(PEEK_CARD_MARGIN, y),
        Math.max(
          PEEK_CARD_MARGIN,
          windowHeight - safeHeight - PEEK_CARD_MARGIN,
        ),
      );
      const availableSpaceAbove = clampedY - PEEK_CARD_MARGIN;
      const availableSpaceBelow =
        windowHeight - (clampedY + safeHeight) - PEEK_CARD_MARGIN;
      const openMenuAbove =
        availableSpaceBelow < PEEK_MENU_HEIGHT + PEEK_MENU_GAP &&
        availableSpaceAbove > availableSpaceBelow;
      const menuOffset = openMenuAbove
        ? -(PEEK_MENU_HEIGHT + PEEK_MENU_GAP)
        : safeHeight + PEEK_MENU_GAP;

      onLongPeek(item, {
        height: safeHeight,
        menuOffset,
        menuPlacement: openMenuAbove ? "top" : "bottom",
        width: safeWidth,
        x: clampedX,
        y: clampedY,
      });
    });
  };

  return (
    <View ref={cardRef} collapsable={false}>
      <Animated.View
        style={[
          {
            opacity: fadeOpacity,
            transform: [{ translateY: fadeTranslateY }],
          },
        ]}
      >
        <Animated.View
          pointerEvents={isPeekSource ? "none" : "auto"}
          style={
            isPeekSource
              ? {
                  opacity: peekSourceOpacity,
                  transform: [{ scale: peekSourceScale }],
                }
              : null
          }
        >
          <Pressable
            onLongPress={handleOpenPeek}
            onPress={() => onOpenProfile(item)}
            onPressIn={() => animatePress(true)}
            onPressOut={() => animatePress(false)}
            delayLongPress={420}
          >
            <Surface
              elevation={2}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.dark ? "#2b2433" : "#ffffff",
                  borderColor: theme.dark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(15,23,42,0.06)",
                },
              ]}
            >
              <UserCardContent
                item={item}
                connections={connections}
                layout={layout}
                pushTokens={pushTokens}
                showPushState={showPushState}
                theme={theme}
              />
            </Surface>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const UsersHome = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const layout = useMemo(() => getUsersLayout(width), [width]);
  const canViewPushTokens = Meteor.useTracker(
    () => canAccessPushTokenDashboards(Meteor.user()),
    [],
  );
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filtroVPN, setFiltroVPN] = useState(null);
  const [filtroProxy, setFiltroProxy] = useState(null);
  const [filtroConexion, setFiltroConexion] = useState(null);
  const [filtroPush, setFiltroPush] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    admins: false,
    users: false,
  });
  const [peekSourceId, setPeekSourceId] = useState(null);
  const [peekTarget, setPeekTarget] = useState(null);
  const peekProgress = useRef(new Animated.Value(0)).current;
  const dataReady = useDeferredScreenData();

  const { loading, users, connections, pushTokens } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, users: [], connections: [], pushTokens: [] };
    }

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

    const userFields = {
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
    };
    const userHandle = Meteor.subscribe("user", userFilter, {
      fields: userFields,
    });
    const usersDocs = Meteor.users
      .find(userFilter, {
        sort: {
          vpnMbGastados: -1,
          megasGastadosinBytes: -1,
          "profile.firstName": 1,
          "profile.lastName": 1,
        },
        fields: userFields,
      })
      .fetch();
    const userIds = usersDocs.map((userDoc) => userDoc?._id).filter(Boolean);
    const pushFields = {
      userId: 1,
      provider: 1,
      platform: 1,
      updatedAt: 1,
      deviceId: 1,
    };
    const pushHandle =
      canViewPushTokens && userIds.length > 0
        ? Meteor.subscribe(
            "push_tokens",
            { userId: { $in: userIds } },
            {
              fields: pushFields,
            },
          )
        : null;
    const connectionHandle = Meteor.subscribe(
      "conexiones",
      { userId: { $in: userIds } },
      { fields: { userId: 1, address: 1, hostname: 1 } },
    );

    return {
      loading:
        !userHandle.ready() ||
        !connectionHandle.ready() ||
        (pushHandle ? !pushHandle.ready() : false),
      users: usersDocs,
      connections: Online.find(
        { userId: { $in: userIds } },
        { fields: { userId: 1, address: 1, hostname: 1 } },
      ).fetch(),
      pushTokens: canViewPushTokens && userIds.length > 0
        ? PushTokens.find(
            { userId: { $in: userIds } },
            {
              fields: pushFields,
            },
          ).fetch()
        : [],
    };
  }, [canViewPushTokens, dataReady]);

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
        const connectionState = getUserConnectionState(user, connections);

        if (!matchesConnectionFilter(connectionState, filtroConexion)) {
          return false;
        }
      }

      if (canViewPushTokens && filtroPush !== null) {
        const { hasPush } = getPushState(user, pushTokens);

        if (hasPush !== filtroPush) {
          return false;
        }
      }

      return true;
    });
  }, [
    connections,
    filtroConexion,
    filtroProxy,
    filtroPush,
    filtroVPN,
    canViewPushTokens,
    pushTokens,
    search,
    users,
  ]);

  const admins = filteredUsers.filter((user) => user.profile?.role === "admin");
  const normalUsers = filteredUsers.filter(
    (user) => user.profile?.role !== "admin",
  );

  const peekVisible = !!peekTarget?.item;
  const overlayCardScale = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.992, 1.03],
  });
  const overlayCardOpacity = peekProgress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.72, 1],
  });
  const trayPlacement = peekTarget?.layout?.menuPlacement || "bottom";
  const overlayCardTranslateY = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trayPlacement === "top" ? 16 : -16],
  });
  const sourcePeekOpacity = peekProgress.interpolate({
    inputRange: [0, 0.32, 1],
    outputRange: [1, 0, 0],
  });
  const sourcePeekScale = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.986],
  });
  const trayOpacity = peekProgress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0, 0, 1],
  });
  const trayTranslateY = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [trayPlacement === "top" ? 18 : -18, 0],
  });
  const backdropOpacity = peekProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  const openUserProfile = (user) => {
    if (!user?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/User",
      params: { item: user._id },
    });
  };

  const openUserMessage = (user) => {
    if (!user?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/Mensaje",
      params: { item: user._id },
    });
  };

  const openUserLogs = (user) => {
    if (!user?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/Logs",
      params: { id: user._id },
    });
  };

  const openUserVentas = (user) => {
    if (!user?._id) {
      return;
    }

    router.push({
      pathname: "/(normal)/Ventas",
      params: { id: user._id },
    });
  };

  const closePeek = (callback) => {
    Animated.timing(peekProgress, {
      duration: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setPeekTarget(null);
      setPeekSourceId(null);
      callback?.();
    });
  };

  const openPeek = (item, layout) => {
    setPeekSourceId(item?._id || null);
    setPeekTarget({ item, layout });
    peekProgress.setValue(0);

    Animated.timing(peekProgress, {
      duration: 220,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const toggleSection = (key) => {
    setExpandedSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const renderSection = ({ key, title, data, accent }) => {
    const expanded = expandedSections[key];
    const singleColumnCardInset = layout.columns === 1 ? 16 : 0;

    return (
      <>
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
              <View
                style={[styles.sectionAccent, { backgroundColor: accent }]}
              />
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
        </Surface>

        {expanded ? (
          <View
            style={[
              styles.sectionContent,
              singleColumnCardInset
                ? { paddingHorizontal: singleColumnCardInset }
                : null,
            ]}
          >
            {data.length ? (
              <FlatList
                key={`section-${key}-${layout.columns}`}
                columnWrapperStyle={
                  layout.columns > 1
                    ? [styles.sectionGridRow, { gap: layout.gridGap }]
                    : null
                }
                maxToRenderPerBatch={5}
                data={data}
                numColumns={layout.columns}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.userCardCell,
                      layout.columns > 1
                        ? {
                            maxWidth: layout.cardWidth,
                            width: layout.cardWidth,
                          }
                        : null,
                    ]}
                  >
                    <UserListCard
                      connections={connections}
                      index={index}
                      isPeekSource={peekSourceId === item._id}
                      item={item}
                      layout={layout}
                      onLongPeek={openPeek}
                      onPeekStart={(nextItem) =>
                        setPeekSourceId(nextItem?._id || null)
                      }
                      onOpenProfile={openUserProfile}
                      peekSourceOpacity={sourcePeekOpacity}
                      peekSourceScale={sourcePeekScale}
                      pushTokens={pushTokens}
                      showPushState={canViewPushTokens}
                      theme={theme}
                    />
                  </View>
                )}
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
      </>
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
              selected={filtroConexion === "activa"}
              onPress={() => setFiltroConexion("activa")}
            >
              Alguna activa
            </Chip>
            <Chip
              selected={filtroConexion === "web"}
              onPress={() => setFiltroConexion("web")}
            >
              WEB
            </Chip>
            <Chip
              selected={filtroConexion === "proxy"}
              onPress={() => setFiltroConexion("proxy")}
            >
              PROXY
            </Chip>
            <Chip
              selected={filtroConexion === "vpn"}
              onPress={() => setFiltroConexion("vpn")}
            >
              VPN
            </Chip>
            <Chip
              selected={filtroConexion === "app"}
              onPress={() => setFiltroConexion("app")}
            >
              APP
            </Chip>
            <Chip
              selected={filtroConexion === "desconectado"}
              onPress={() => setFiltroConexion("desconectado")}
            >
              Desconectados
            </Chip>
          </View>
          {canViewPushTokens ? (
            <View style={styles.filterRow}>
              <Chip
                selected={filtroPush === null}
                onPress={() => setFiltroPush(null)}
              >
                Push: Todos
              </Chip>
              <Chip
                selected={filtroPush === true}
                onPress={() => setFiltroPush(true)}
              >
                Push Activo
              </Chip>
              <Chip
                selected={filtroPush === false}
                onPress={() => setFiltroPush(false)}
              >
                Sin Push
              </Chip>
            </View>
          ) : null}
          <Button
            mode="text"
            onPress={() => {
              setSearch("");
              setFiltroVPN(null);
              setFiltroProxy(null);
              setFiltroConexion(null);
              setFiltroPush(null);
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
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: layout.listPaddingHorizontal },
          ]}
        />
      )}

      <Portal>
        {peekVisible && peekTarget?.layout ? (
          <View style={styles.peekPortalLayer} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => closePeek()}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.peekBackdrop, { opacity: backdropOpacity }]}
              />
            </Pressable>

            <View
              pointerEvents="box-none"
              style={[
                styles.peekOverlayColumn,
                {
                  left: peekTarget.layout.x,
                  top: peekTarget.layout.y,
                  width: peekTarget.layout.width,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.peekFloatingCard,
                  {
                    opacity: overlayCardOpacity,
                    transform: [
                      { translateY: overlayCardTranslateY },
                      { scale: overlayCardScale },
                    ],
                  },
                ]}
              >
                <Surface
                  elevation={4}
                  style={[
                    styles.itemCard,
                    styles.peekCardSurface,
                    {
                      backgroundColor: theme.dark ? "#2b2433" : "#ffffff",
                      borderColor: theme.dark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.08)",
                    },
                  ]}
                >
                  <UserCardContent
                    item={peekTarget.item}
                    connections={connections}
                    layout={layout}
                    pushTokens={pushTokens}
                    showPushState={canViewPushTokens}
                    overlayMode
                    theme={theme}
                  />
                </Surface>
              </Animated.View>

              <Animated.View
                style={[
                  styles.peekMenuContainer,
                  {
                    top: peekTarget.layout.menuOffset,
                    opacity: trayOpacity,
                    transform: [{ translateY: trayTranslateY }],
                  },
                ]}
              >
                <BlurView
                  intensity={20}
                  tint={theme.dark ? "dark" : "light"}
                  experimentalBlurMethod={
                    Platform.OS === "android" ? "dimezisBlurView" : undefined
                  }
                  renderToHardwareTextureAndroid={true}
                  style={[
                    styles.peekMenuBlur,
                    {
                      borderWidth: 1,
                      borderColor: theme.dark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                      //   backgroundColor: theme.dark
                      //     ? "rgba(15,23,42,0.28)"
                      //     : "rgba(255,255,255,0.28)",
                      //   borderColor: theme.dark
                      //     ? "rgba(255,255,255,0.08)"
                      //     : "rgba(15,23,42,0.08)",
                      //   borderWidth: 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.peekMenuOverlay,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(15,23,42,0.42)"
                          : "rgba(255,255,255,0.34)",
                      },
                    ]}
                  />

                  <View style={styles.peekHandle} />
                  <Text
                    style={[
                      styles.peekMenuTitle,
                      { color: theme.dark ? "#f8fafc" : "#0f172a" },
                    ]}
                  >
                    Acciones rápidas
                  </Text>

                  <Pressable
                    onPress={() =>
                      closePeek(() => openUserProfile(peekTarget.item))
                    }
                    style={({ pressed }) => [
                      styles.peekActionRow,
                      pressed && styles.peekActionRowPressed,
                    ]}
                  >
                    <View style={styles.peekActionCopy}>
                      <Text
                        style={[
                          styles.peekActionLabel,
                          { color: theme.dark ? "#f8fafc" : "#0f172a" },
                        ]}
                      >
                        Ver perfil
                      </Text>
                      <Text
                        style={[
                          styles.peekActionHint,
                          { color: theme.dark ? "#aeb6c5" : "#64748b" },
                        ]}
                      >
                        Abrir detalle completo del usuario
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.peekActionChevron,
                        { color: theme.dark ? "#cbd5e1" : "#475569" },
                      ]}
                    >
                      ›
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      closePeek(() => openUserMessage(peekTarget.item))
                    }
                    style={({ pressed }) => [
                      styles.peekActionRow,
                      pressed && styles.peekActionRowPressed,
                    ]}
                  >
                    <View style={styles.peekActionCopy}>
                      <Text
                        style={[
                          styles.peekActionLabel,
                          { color: theme.dark ? "#f8fafc" : "#0f172a" },
                        ]}
                      >
                        Enviar mensaje
                      </Text>
                      <Text
                        style={[
                          styles.peekActionHint,
                          { color: theme.dark ? "#aeb6c5" : "#64748b" },
                        ]}
                      >
                        Abrir conversación directa
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.peekActionChevron,
                        { color: theme.dark ? "#cbd5e1" : "#475569" },
                      ]}
                    >
                      ›
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      closePeek(() => {
                        openUserLogs(peekTarget.item);
                      })
                    }
                    style={({ pressed }) => [
                      styles.peekActionRow,
                      pressed && styles.peekActionRowPressed,
                    ]}
                  >
                    <View style={styles.peekActionCopy}>
                      <Text
                        style={[
                          styles.peekActionLabel,
                          { color: theme.dark ? "#f8fafc" : "#0f172a" },
                        ]}
                      >
                        Ver logs
                      </Text>
                      <Text
                        style={[
                          styles.peekActionHint,
                          { color: theme.dark ? "#aeb6c5" : "#64748b" },
                        ]}
                      >
                        Abrir historial donde participa como admin o afectado
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.peekActionChevron,
                        { color: theme.dark ? "#cbd5e1" : "#475569" },
                      ]}
                    >
                      ›
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      closePeek(() => {
                        openUserVentas(peekTarget.item);
                      })
                    }
                    style={({ pressed }) => [
                      styles.peekActionRow,
                      pressed && styles.peekActionRowPressed,
                    ]}
                  >
                    <View style={styles.peekActionCopy}>
                      <Text
                        style={[
                          styles.peekActionLabel,
                          { color: theme.dark ? "#f8fafc" : "#0f172a" },
                        ]}
                      >
                        Ver ventas
                      </Text>
                      <Text
                        style={[
                          styles.peekActionHint,
                          { color: theme.dark ? "#aeb6c5" : "#64748b" },
                        ]}
                      >
                        Abrir ventas donde participa como admin o usuario
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.peekActionChevron,
                        { color: theme.dark ? "#cbd5e1" : "#475569" },
                      ]}
                    >
                      ›
                    </Text>
                  </Pressable>
                </BlurView>
              </Animated.View>
            </View>
          </View>
        ) : null}
      </Portal>
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
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 4,
    width: "100%",
  },
  userCardBody: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  userCardBodyOverlay: {
    paddingBottom: 12,
    paddingTop: 12,
  },
  userCardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  userIdentityRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  userIdentityTextWrap: {
    flex: 1,
    gap: 2,
  },
  userTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  username: { fontSize: 10, fontWeight: "700" },
  metaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  connectionPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaPillText: {
    fontSize: 9,
    fontWeight: "700",
  },
  chevronBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  chevronBadgeText: {
    fontSize: 22,
    fontWeight: "300",
    marginTop: -2,
  },
  serviceSummaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  serviceSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  serviceSummaryLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  serviceSummaryValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  itemDescription: { gap: 6 },
  servicesContainer: { gap: 5 },
  userCardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  userCardFooterText: {
    fontSize: 9,
    fontWeight: "600",
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
  sectionGridRow: {
    justifyContent: "center",
  },
  userCardCell: {
    flexGrow: 1,
  },
  loadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
  peekPortalLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  peekBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  peekOverlayColumn: {
    position: "absolute",
  },
  peekFloatingCard: {
    zIndex: 3,
  },
  peekCardSurface: {
    elevation: 14,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.28,
    shadowRadius: 22,
  },
  peekMenuContainer: {
    borderRadius: 24,
    overflow: "hidden",
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
    maxWidth: 320,
  },
  peekMenuBlur: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  peekMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  peekHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.34)",
    borderRadius: 999,
    height: 4,
    marginTop: 10,
    width: 40,
  },
  peekMenuTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    textTransform: "uppercase",
  },
  peekActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  peekActionRowPressed: {
    backgroundColor: "rgba(148,163,184,0.08)",
  },
  peekActionCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  peekActionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  peekActionHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  peekActionChevron: {
    fontSize: 24,
    fontWeight: "300",
  },
});

export default UsersHome;
