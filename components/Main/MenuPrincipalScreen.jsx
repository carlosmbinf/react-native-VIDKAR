import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    ImageBackground,
    InteractionManager,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
  import { Chip, Portal, ProgressBar, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import ComercioHomeOrdersSection from "../comercio/pedidos/ComercioHomeOrdersSection.native";
import Productos from "../cubacel/Productos";
import DrawerOptionsAlls from "../drawer/DrawerOptionsAlls";
import {
  MENU_PRINCIPAL_HEADER_COLOR,
  useAppHeaderContentInset,
} from "../Header/AppHeader";
import MenuHeader from "../Header/MenuHeader";
import ComercioHomeSection from "../productos/ComercioHomeSection.native";
import ProxyVPNPackagesHorizontal from "../proxyVPN/ProxyVPNPackagesHorizontal";

const DRAWER_WIDTH = 316;
const HERO_PRIMARY_GLOW_SIZE = 220;
const HERO_SECONDARY_GLOW_SIZE = 180;
const PRICE_SETUP_PRIMARY_GLOW_SIZE = 230;
const PRICE_SETUP_SECONDARY_GLOW_SIZE = 210;
const EVIDENCE_PRIMARY_GLOW_SIZE = 220;
const EVIDENCE_SECONDARY_GLOW_SIZE = 190;
const NOTIFICATIONS_PRIMARY_GLOW_SIZE = 230;
const NOTIFICATIONS_SECONDARY_GLOW_SIZE = 190;
const CASH_APPROVALS_PRIMARY_GLOW_SIZE = 260;
const CASH_APPROVALS_SECONDARY_GLOW_SIZE = 250;
let hasPreparedHeavyContent = false;

const MENU_DEBUG_PREFIX = "[MenuPrincipalRender]";

const logMenuPrincipalDebug = (label, payload) => {
  const timestamp = new Date().toISOString();

  if (payload === undefined) {
    console.log(`${MENU_DEBUG_PREFIX} ${timestamp} ${label}`);
    return;
  }

  console.log(`${MENU_DEBUG_PREFIX} ${timestamp} ${label}`, payload);
};

const RenderTraceBlock = ({ children, name, payload, style }) => {
  const mountStartedAtRef = useRef(
    typeof performance?.now === "function" ? performance.now() : Date.now(),
  );
  const hasLoggedLayoutRef = useRef(false);
  const nameRef = useRef(name);
  const payloadRef = useRef(payload);

  useEffect(() => {
    const now =
      typeof performance?.now === "function" ? performance.now() : Date.now();

    logMenuPrincipalDebug(`${nameRef.current}:mounted`, {
      ...(payloadRef.current || {}),
      elapsedMs: Number((now - mountStartedAtRef.current).toFixed(1)),
    });
  }, []);

  return (
    <View
      style={style}
      onLayout={() => {
        if (hasLoggedLayoutRef.current) {
          return;
        }

        hasLoggedLayoutRef.current = true;
        const now =
          typeof performance?.now === "function"
            ? performance.now()
            : Date.now();

        logMenuPrincipalDebug(`${nameRef.current}:first-layout`, {
          ...(payloadRef.current || {}),
          elapsedMs: Number((now - mountStartedAtRef.current).toFixed(1)),
        });
      }}
    >
      {children}
    </View>
  );
};

const getGlowBounds = (cardSize, glowSize) => ({
  minX: -glowSize * 0.18,
  maxX: Math.max(-glowSize * 0.18, cardSize.width - glowSize * 0.82),
  minY: -glowSize * 0.18,
  maxY: Math.max(-glowSize * 0.18, cardSize.height - glowSize * 0.82),
});

const GLOW_MOTION_PATTERNS = {
  primarySweep: {
    x: ["max", "max", "min", "min", "max"],
    y: ["min", "max", "max", "min", "min"],
  },
  upperDrift: {
    x: ["min", "mid", "max", "mid", "min"],
    y: ["min", "innerMin", "min", "innerMax", "min"],
  },
  sideFloat: {
    x: ["max", "innerMax", "max", "innerMin", "max"],
    y: ["innerMin", "max", "innerMax", "min", "innerMin"],
  },
  diagonalLoop: {
    x: ["innerMax", "max", "innerMin", "min", "innerMax"],
    y: ["min", "innerMax", "max", "innerMin", "min"],
  },
  secondarySweep: {
    x: ["min", "max", "max", "min", "min"],
    y: ["max", "max", "min", "min", "max"],
  },
  lowerDrift: {
    x: ["max", "mid", "min", "mid", "max"],
    y: ["max", "innerMax", "max", "innerMin", "max"],
  },
  reverseDiagonal: {
    x: ["innerMin", "min", "innerMax", "max", "innerMin"],
    y: ["max", "innerMin", "min", "innerMax", "max"],
  },
  cornerFloat: {
    x: ["min", "innerMin", "max", "innerMax", "min"],
    y: ["innerMax", "max", "innerMin", "min", "innerMax"],
  },
};

const resolveGlowPoint = (key, bounds) => bounds[key] ?? bounds.minX;

const buildGlowMotion = (progress, cardSize, glowSize, patternName) => {
  const { minX, maxX, minY, maxY } = getGlowBounds(cardSize, glowSize);
  const xDistance = maxX - minX;
  const yDistance = maxY - minY;
  const bounds = {
    min: minX,
    max: maxX,
    mid: minX + xDistance * 0.5,
    innerMin: minX + xDistance * 0.24,
    innerMax: minX + xDistance * 0.76,
  };
  const yBounds = {
    min: minY,
    max: maxY,
    mid: minY + yDistance * 0.5,
    innerMin: minY + yDistance * 0.24,
    innerMax: minY + yDistance * 0.76,
  };
  const pattern =
    GLOW_MOTION_PATTERNS[patternName] || GLOW_MOTION_PATTERNS.primarySweep;

  return {
    translateX: progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: pattern.x.map((key) => resolveGlowPoint(key, bounds)),
    }),
    translateY: progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: pattern.y.map((key) => resolveGlowPoint(key, yBounds)),
    }),
  };
};

const formatGreeting = (user) => {
  const firstName = user?.profile?.firstName?.trim();

  if (firstName) {
    return `Bienvenido, ${firstName}`;
  }

  return "Bienvenido";
};

const getRoleLabel = (user) => {
  if (user?.username === "carlosmbinf") return "Administrador general";
  if (user?.profile?.role === "admin") return "Administrador";
  return "Usuario";
};

const formatDebtAmount = (amount) => {
  const numericAmount = Number(amount) || 0;
  return `${numericAmount.toFixed(2)} CUP`;
};

const getPendingEvidenceStatusText = (count, loading) => {
  if (loading) {
    return "Buscando compras que aún necesitan comprobante";
  }

  if (count === 0) {
    return "No tienes compras pendientes de evidencia por ahora.";
  }

  if (count === 1) {
    return "Tienes 1 compra esperando comprobante para continuar.";
  }

  return `Tienes ${count} compras esperando comprobante para continuar.`;
};

const getCashApprovalsStatusText = (count, loading) => {
  if (loading) {
    return "Actualizando aprobaciones en tiempo real";
  }

  if (count === 0) {
    return "No tienes ventas en efectivo pendientes por revisar.";
  }

  if (count === 1) {
    return "Tienes 1 venta en efectivo esperando tu aprobación o rechazo.";
  }

  return `Tienes ${count} ventas en efectivo esperando tu aprobación o rechazo.`;
};

const formatCashApprovalSalesLabel = (count) =>
  `${count} venta${count === 1 ? "" : "s"}`;

const formatMissingPriceServicesText = (services = []) => {
  const labels = services.map((service) => service.label).filter(Boolean);

  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels.slice(0, -1).join(", ")} y ${labels.at(-1)}`;
};

const canShowEmpresaRegistration = (user) =>
  user?.permiteEmpresa === true &&
  user?.empresaBloqueada !== true &&
  user?.empresaTerminosCondicionesAcepted !== true;

const MenuPrincipalScreen = ({
  user,
  appVersion = "0.0.0",
  buildNumber = "0",
  pendingDebt = 0,
  pendingEvidenceCount = 0,
  pendingEvidenceLoading = false,
  pendingVentasCount = 0,
  pendingCashApprovalTypes = [],
  pendingCashApprovalsCount = 0,
  pendingCashApprovalsLoading = false,
  notificationsPermissionBlocked = false,
  notificationsPermissionGranted = true,
  notificationsPermissionLoading = false,
  missingPriceServices = [],
  priceSetupLoading = false,
  normalHomeCatalogs = null,
  normalHomeCatalogsLoading = true,
  homeRefreshing = false,
  homeLoadProgress = { completed: 0, error: null, label: "Cargando datos del menú", total: 7 },
  onRefresh = async () => {},
  onEnableNotifications = () => {},
  onOpenCashApprovals = () => {},
  onOpenPendingEvidence = () => {},
  onOpenPendingVentas = () => {},
  onOpenPrices = () => {},
  onLogout = () => {},
  onToggleModoCadete = () => {},
  onToggleModoEmpresa = () => {},
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [heavyContentReady, setHeavyContentReady] = useState(
    hasPreparedHeavyContent,
  );
  const [heroCardSize, setHeroCardSize] = useState({ width: 0, height: 0 });
  const [priceSetupCardSize, setPriceSetupCardSize] = useState({
    width: 0,
    height: 0,
  });
  const [evidenceHubCardSize, setEvidenceHubCardSize] = useState({
    width: 0,
    height: 0,
  });
  const [notificationsCardSize, setNotificationsCardSize] = useState({
    width: 0,
    height: 0,
  });
  const [cashApprovalsCardSize, setCashApprovalsCardSize] = useState({
    width: 0,
    height: 0,
  });
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const heroGlowPrimaryProgress = useRef(new Animated.Value(0)).current;
  const heroGlowSecondaryProgress = useRef(new Animated.Value(0)).current;
  const headerInset = useAppHeaderContentInset();
  const initialPathnameRef = useRef(pathname);

  useEffect(() => {
    logMenuPrincipalDebug("screen:mounted", {
      hasPreparedHeavyContent,
      pathname,
      userId: user?._id || null,
      username: user?.username || null,
    });
  }, [pathname, user?._id, user?.username]);

  useEffect(() => {
    if (hasPreparedHeavyContent) {
      logMenuPrincipalDebug("heavy-content:already-prepared", {
        pathname: initialPathnameRef.current,
      });
      setHeavyContentReady(true);
      return undefined;
    }

    let mounted = true;
    const interactionScheduledAt =
      typeof performance?.now === "function" ? performance.now() : Date.now();
    logMenuPrincipalDebug("heavy-content:waiting-for-interactions", {
      pathname: initialPathnameRef.current,
    });
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (mounted) {
        hasPreparedHeavyContent = true;
        const now =
          typeof performance?.now === "function"
            ? performance.now()
            : Date.now();
        logMenuPrincipalDebug("heavy-content:ready", {
          elapsedMs: Number((now - interactionScheduledAt).toFixed(1)),
          pathname: initialPathnameRef.current,
        });
        setHeavyContentReady(true);
      }
    });

    return () => {
      mounted = false;
      interactionTask?.cancel?.();
    };
  }, []);

  useEffect(() => {
    logMenuPrincipalDebug("drawer:state", {
      mounted: drawerMounted,
      open: drawerOpen,
    });
  }, [drawerMounted, drawerOpen]);

  useEffect(() => {
    if (!drawerMounted) {
      return undefined;
    }

    translateX.stopAnimation();
    overlayOpacity.stopAnimation();
    const animation = Animated.parallel([
      Animated.timing(translateX, {
        toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
        duration: drawerOpen ? 240 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: drawerOpen ? 1 : 0,
        duration: drawerOpen ? 220 : 180,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !drawerOpen) {
        setDrawerMounted(false);
      }
    });

    return () => animation.stop();
  }, [drawerMounted, drawerOpen, overlayOpacity, translateX]);

  const openDrawer = () => {
    translateX.stopAnimation();
    overlayOpacity.stopAnimation();
    translateX.setValue(-DRAWER_WIDTH);
    overlayOpacity.setValue(0);
    setDrawerMounted(true);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (!heroCardSize.width || !heroCardSize.height) {
      return undefined;
    }

    const primaryLoop = Animated.loop(
      Animated.timing(heroGlowPrimaryProgress, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const secondaryLoop = Animated.loop(
      Animated.timing(heroGlowSecondaryProgress, {
        toValue: 1,
        duration: 21000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    heroGlowPrimaryProgress.setValue(0);
    heroGlowSecondaryProgress.setValue(0);
    primaryLoop.start();
    secondaryLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      heroGlowPrimaryProgress.stopAnimation();
      heroGlowSecondaryProgress.stopAnimation();
    };
  }, [
    heroCardSize.height,
    heroCardSize.width,
    heroGlowPrimaryProgress,
    heroGlowSecondaryProgress,
  ]);

  const heroPrimaryGlowMotion = buildGlowMotion(
    heroGlowPrimaryProgress,
    heroCardSize,
    HERO_PRIMARY_GLOW_SIZE,
    "primarySweep",
  );
  const heroSecondaryGlowMotion = buildGlowMotion(
    heroGlowSecondaryProgress,
    heroCardSize,
    HERO_SECONDARY_GLOW_SIZE,
    "secondarySweep",
  );
  const priceSetupPrimaryGlowMotion = buildGlowMotion(
    heroGlowPrimaryProgress,
    priceSetupCardSize,
    PRICE_SETUP_PRIMARY_GLOW_SIZE,
    "upperDrift",
  );
  const priceSetupSecondaryGlowMotion = buildGlowMotion(
    heroGlowSecondaryProgress,
    priceSetupCardSize,
    PRICE_SETUP_SECONDARY_GLOW_SIZE,
    "lowerDrift",
  );
  const evidencePrimaryGlowMotion = buildGlowMotion(
    heroGlowPrimaryProgress,
    evidenceHubCardSize,
    EVIDENCE_PRIMARY_GLOW_SIZE,
    "sideFloat",
  );
  const evidenceSecondaryGlowMotion = buildGlowMotion(
    heroGlowSecondaryProgress,
    evidenceHubCardSize,
    EVIDENCE_SECONDARY_GLOW_SIZE,
    "reverseDiagonal",
  );
  const notificationsPrimaryGlowMotion = buildGlowMotion(
    heroGlowPrimaryProgress,
    notificationsCardSize,
    NOTIFICATIONS_PRIMARY_GLOW_SIZE,
    "upperDrift",
  );
  const notificationsSecondaryGlowMotion = buildGlowMotion(
    heroGlowSecondaryProgress,
    notificationsCardSize,
    NOTIFICATIONS_SECONDARY_GLOW_SIZE,
    "sideFloat",
  );
  const cashPrimaryGlowMotion = buildGlowMotion(
    heroGlowPrimaryProgress,
    cashApprovalsCardSize,
    CASH_APPROVALS_PRIMARY_GLOW_SIZE,
    "diagonalLoop",
  );
  const cashSecondaryGlowMotion = buildGlowMotion(
    heroGlowSecondaryProgress,
    cashApprovalsCardSize,
    CASH_APPROVALS_SECONDARY_GLOW_SIZE,
    "cornerFloat",
  );

  const navigateTo = (href) => {
    setDrawerOpen(false);
    if (pathname !== href) {
      router.push(href);
    }
  };

  const todayLabel = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const hasAdminRole =
    user?.username === "carlosmbinf" || user?.profile?.role === "admin";
  const hasPendingDebt =
    user?.profile?.role === "admin" && (Number(pendingDebt) || 0) > 0;
  const cashApprovalTypeCount = pendingCashApprovalTypes.length;
  const showCashApprovalsCard = hasAdminRole && pendingCashApprovalsCount > 0;
  const showPendingEvidenceCard = pendingEvidenceCount > 0;
  const showNotificationsCard =
    !notificationsPermissionLoading && !notificationsPermissionGranted;
  const showPriceSetupCard =
    hasAdminRole && !priceSetupLoading && missingPriceServices.length > 0;
  const showEmpresaSuggestionCard =
    canShowEmpresaRegistration(user) && user?.modoEmpresa !== true;
  const missingPriceServicesText =
    formatMissingPriceServicesText(missingPriceServices);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <Surface style={styles.screen}>
        <ImageBackground
          source={require("../files/space-bg-shadowcodex.jpg")}
          resizeMode="cover"
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.backdrop} />
        </ImageBackground>

        <RenderTraceBlock name="MenuHeader" style={styles.headerTraceBlock}>
          <MenuHeader
            backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
            title="VIDKAR"
            subtitle="Menú principal"
            onOpenDrawer={openDrawer}
            onOpenProfile={() => navigateTo("/(normal)/User")}
            onOpenMessages={(item) => {
              if (item) {
                navigateTo(
                  `/(normal)/Mensaje?item=${encodeURIComponent(item)}`,
                );
                return;
              }

              navigateTo("/(normal)/Mensaje");
            }}
            onLogout={onLogout}
          />
        </RenderTraceBlock>

        <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: headerInset + 12 },
            ]}
            alwaysBounceVertical
            bounces
            overScrollMode="always"
            refreshControl={
              <RefreshControl
                colors={["#f97316"]}
                onRefresh={onRefresh}
                progressViewOffset={headerInset + 12}
                refreshing={normalHomeCatalogsLoading || homeRefreshing}
                tintColor="#f97316"
              />
            }
          >
          {normalHomeCatalogsLoading || homeRefreshing ? (
            <Surface elevation={2} style={styles.homeLoadingCard}>
              <View style={styles.homeLoadingHeader}>
                <View style={styles.homeLoadingTitleGroup}>
                  <Text style={styles.homeLoadingEyebrow}>Menú principal</Text>
                  <Text style={styles.homeLoadingLabel}>
                    {homeLoadProgress.label}
                  </Text>
                </View>
                <Text style={styles.homeLoadingPercent}>
                  {Math.round(
                    (homeLoadProgress.completed / homeLoadProgress.total) * 100,
                  )}%
                </Text>
              </View>
              <ProgressBar
                color="#fb923c"
                progress={
                  homeLoadProgress.total > 0
                    ? homeLoadProgress.completed / homeLoadProgress.total
                    : 0
                }
                style={styles.homeLoadingProgress}
              />
              <Text style={styles.homeLoadingStep}>
                {homeLoadProgress.completed} de {homeLoadProgress.total} bloques cargados
              </Text>
            </Surface>
          ) : (
            <>
          <Surface
            style={styles.heroCard}
            elevation={2}
            onLayout={({ nativeEvent }) => {
              const { height, width } = nativeEvent.layout;

              setHeroCardSize((current) => {
                if (current.width === width && current.height === height) {
                  return current;
                }

                return { width, height };
              });
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heroGlowPrimary,
                {
                  transform: [
                    { translateX: heroPrimaryGlowMotion.translateX },
                    { translateY: heroPrimaryGlowMotion.translateY },
                  ],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heroGlowSecondary,
                {
                  transform: [
                    { translateX: heroSecondaryGlowMotion.translateX },
                    { translateY: heroSecondaryGlowMotion.translateY },
                  ],
                },
              ]}
            />
            <Text variant="labelLarge" style={styles.heroEyebrow}>
              {todayLabel}
            </Text>
            <Text variant="headlineMedium" style={styles.heroTitle}>
              {formatGreeting(user)}
            </Text>
            <Text variant="bodyLarge" style={styles.heroCopy}>
              Nos alegra tenerte de vuelta. Desde aquí puedes acceder de forma
              rápida y sencilla a los servicios y opciones principales de tu
              cuenta.
            </Text>
            <View style={styles.heroChipsRow}>
              {hasAdminRole ? (
                <Chip
                  compact
                  icon="shield-account"
                  style={styles.heroChip}
                  textStyle={styles.heroChipText}
                >
                  {getRoleLabel(user)}
                </Chip>
              ) : null}
              {user?.username === "carlosmbinf" && (
                <Chip
                  compact
                  icon="information"
                  style={styles.heroChip}
                  textStyle={styles.heroChipText}
                >
                  v{appVersion}
                </Chip>
              )}
              {user?.username === "carlosmbinf" && (
                <Chip
                  compact
                  icon="cellphone-arrow-down"
                  style={styles.heroChip}
                  textStyle={styles.heroChipText}
                >
                  Comp. {buildNumber}
                </Chip>
              )}
            </View>
            {hasPendingDebt ? (
              <View style={styles.debtBanner}>
                <View style={styles.debtBannerHeader}>
                  <View style={styles.debtBannerTitleWrap}>
                    <Text variant="labelSmall" style={styles.debtBannerEyebrow}>
                      Cobros pendientes
                    </Text>
                    <Text variant="titleMedium" style={styles.debtBannerTitle}>
                      Tienes deuda administrativa por cobrar
                    </Text>
                  </View>
                  <Chip
                    compact
                    icon="cash-clock"
                    style={styles.debtBannerChip}
                    textStyle={styles.debtBannerChipText}
                  >
                    {pendingVentasCount} venta
                    {pendingVentasCount === 1 ? "" : "s"}
                  </Chip>
                </View>

                <View style={styles.debtBannerFooter}>
                  <View>
                    <Text
                      variant="labelMedium"
                      style={styles.debtBannerAmountLabel}
                    >
                      Total pendiente
                    </Text>
                    <Text
                      variant="headlineSmall"
                      style={styles.debtBannerAmount}
                    >
                      {formatDebtAmount(pendingDebt)}
                    </Text>
                  </View>

                  <View style={styles.debtBannerAction}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={onOpenPendingVentas}
                      style={({ pressed }) => [
                        styles.debtBannerActionButton,
                        pressed ? styles.debtBannerActionButtonPressed : null,
                      ]}
                    >
                      <Text
                        variant="labelLarge"
                        style={styles.debtBannerActionText}
                      >
                        Ver pendientes
                      </Text>
                      <View style={styles.debtBannerActionIconWrap}>
                        <MaterialCommunityIcons
                          color="#fff1f2"
                          name="arrow-right"
                          size={18}
                        />
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </Surface>

          {showEmpresaSuggestionCard ? (
            <Surface style={styles.empresaSuggestionCard} elevation={2}>
              <LinearGradient
                colors={["#123524f6", "#14395cf4", "#1d2357f2"]}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.56, 1]}
                start={{ x: 0, y: 0 }}
                style={styles.empresaSuggestionGradient}
              >
                <View style={styles.empresaSuggestionHeader}>
                  <View style={styles.empresaSuggestionIconWrap}>
                    <MaterialCommunityIcons
                      color="#bbf7d0"
                      name="storefront-check-outline"
                      size={25}
                    />
                  </View>

                  <View style={styles.empresaSuggestionTitleWrap}>
                    <Text
                      variant="labelSmall"
                      style={styles.empresaSuggestionEyebrow}
                    >
                      Cuenta aprobada para empresa
                    </Text>
                    <Text
                      variant="titleLarge"
                      style={styles.empresaSuggestionTitle}
                    >
                      Ya puedes gestionar tu negocio desde Vidkar
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={styles.empresaSuggestionCopy}
                    >
                      Tienes acceso válido al modo empresa. Entra al panel para
                      administrar tiendas, productos y pedidos desde una
                      superficie dedicada.
                    </Text>
                  </View>
                </View>

                <View style={styles.empresaSuggestionFooter}>
                  <View style={styles.empresaSuggestionPill}>
                    <MaterialCommunityIcons
                      color="#bfdbfe"
                      name="clipboard-check-outline"
                      size={17}
                    />
                    <Text
                      variant="labelLarge"
                      style={styles.empresaSuggestionPillText}
                    >
                      Aprobación activa
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={onToggleModoEmpresa}
                    style={({ pressed }) => [
                      styles.empresaSuggestionActionButton,
                      pressed
                        ? styles.empresaSuggestionActionButtonPressed
                        : null,
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={styles.empresaSuggestionActionText}
                    >
                      Entrar al modo empresa
                    </Text>
                    <View style={styles.empresaSuggestionActionIconWrap}>
                      <MaterialCommunityIcons
                        color="#ecfdf5"
                        name="arrow-right"
                        size={18}
                      />
                    </View>
                  </Pressable>
                </View>
              </LinearGradient>
            </Surface>
          ) : null}

          {showNotificationsCard ? (
            <Surface
              style={styles.notificationsCard}
              elevation={2}
              onLayout={({ nativeEvent }) => {
                const { width, height } = nativeEvent.layout;
                setNotificationsCardSize((current) =>
                  current.width === width && current.height === height
                    ? current
                    : { width, height },
                );
              }}
            >
              <LinearGradient
                colors={["#311a09f6", "#3a2211f4", "#4a1d1df2"]}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.56, 1]}
                start={{ x: 0, y: 0 }}
                style={styles.notificationsGradient}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.notificationsGlowPrimary,
                    {
                      transform: [
                        {
                          translateX: notificationsPrimaryGlowMotion.translateX,
                        },
                        {
                          translateY: notificationsPrimaryGlowMotion.translateY,
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.notificationsGlowSecondary,
                    {
                      transform: [
                        {
                          translateX:
                            notificationsSecondaryGlowMotion.translateX,
                        },
                        {
                          translateY:
                            notificationsSecondaryGlowMotion.translateY,
                        },
                      ],
                    },
                  ]}
                />

                <View style={styles.notificationsHeader}>
                  <View style={styles.notificationsIconWrap}>
                    <MaterialCommunityIcons
                      color="#fed7aa"
                      name={
                        notificationsPermissionBlocked
                          ? "bell-off-outline"
                          : "bell-alert-outline"
                      }
                      size={25}
                    />
                  </View>

                  <View style={styles.notificationsTitleWrap}>
                    <Text
                      variant="labelSmall"
                      style={styles.notificationsEyebrow}
                    >
                      Notificaciones desactivadas
                    </Text>
                    <Text
                      variant="titleLarge"
                      style={styles.notificationsTitle}
                    >
                      Activa los avisos para no perder información importante
                    </Text>
                    <Text variant="bodyMedium" style={styles.notificationsCopy}>
                      Las notificaciones no están activas en este dispositivo.
                      Por eso no recibirás avisos de mensajes, compras,
                      entregas, recargas, Proxy, VPN ni otros servicios de
                      Vidkar.
                    </Text>
                  </View>
                </View>

                <View style={styles.notificationsFooter}>
                  <View style={styles.notificationsStatusPill}>
                    <MaterialCommunityIcons
                      color="#fdba74"
                      name={
                        notificationsPermissionBlocked
                          ? "cellphone-cog"
                          : "gesture-tap-button"
                      }
                      size={17}
                    />
                    <Text
                      variant="labelLarge"
                      style={styles.notificationsStatusText}
                    >
                      {notificationsPermissionBlocked
                        ? "Requiere activación manual"
                        : "Puedes activarlas ahora"}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={onEnableNotifications}
                    style={({ pressed }) => [
                      styles.notificationsActionButton,
                      pressed ? styles.notificationsActionButtonPressed : null,
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={styles.notificationsActionText}
                    >
                      {notificationsPermissionBlocked
                        ? "Abrir ajustes"
                        : "Activar notificaciones"}
                    </Text>
                    <View style={styles.notificationsActionIconWrap}>
                      <MaterialCommunityIcons
                        color="#fff7ed"
                        name={
                          notificationsPermissionBlocked
                            ? "cog-outline"
                            : "bell-ring-outline"
                        }
                        size={18}
                      />
                    </View>
                  </Pressable>
                </View>
              </LinearGradient>
            </Surface>
          ) : null}

          {showPriceSetupCard ? (
            <Surface
              style={styles.priceSetupCard}
              elevation={2}
              onLayout={({ nativeEvent }) => {
                const { width, height } = nativeEvent.layout;
                setPriceSetupCardSize((current) =>
                  current.width === width && current.height === height
                    ? current
                    : { width, height },
                );
              }}
            >
              <LinearGradient
                colors={["#0b3b4cf5", "#12335ff2", "#241554f0"]}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.56, 1]}
                start={{ x: 0, y: 0 }}
                style={styles.priceSetupGradient}
              >
                <Animated.View
                  style={[
                    styles.priceSetupGlowPrimary,
                    {
                      transform: [
                        { translateX: priceSetupPrimaryGlowMotion.translateX },
                        { translateY: priceSetupPrimaryGlowMotion.translateY },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.priceSetupGlowSecondary,
                    {
                      transform: [
                        {
                          translateX: priceSetupSecondaryGlowMotion.translateX,
                        },
                        {
                          translateY: priceSetupSecondaryGlowMotion.translateY,
                        },
                      ],
                    },
                  ]}
                />

                <View style={styles.priceSetupHeader}>
                  <View style={styles.priceSetupIconWrap}>
                    <MaterialCommunityIcons
                      color="#cffafe"
                      name="tag-plus-outline"
                      size={24}
                    />
                  </View>
                  <View style={styles.priceSetupTitleWrap}>
                    <Text variant="labelSmall" style={styles.priceSetupEyebrow}>
                      Configuración comercial pendiente
                    </Text>
                    <Text variant="titleLarge" style={styles.priceSetupTitle}>
                      Agrega precios para habilitar compras de tus clientes
                    </Text>
                    <Text variant="bodyMedium" style={styles.priceSetupCopy}>
                      Aún no tienes precios publicados para{" "}
                      {missingPriceServicesText}. Define al menos una oferta
                      para que tus clientes puedan comprar estos servicios desde
                      la app.
                    </Text>
                  </View>
                </View>

                <View style={styles.priceSetupServicesRow}>
                  {missingPriceServices.map((service) => (
                    <View
                      key={service.key}
                      style={styles.priceSetupServicePill}
                    >
                      <MaterialCommunityIcons
                        color="#bfdbfe"
                        name={service.icon}
                        size={17}
                      />
                      <Text
                        variant="labelLarge"
                        style={styles.priceSetupServiceText}
                      >
                        {service.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.priceSetupFooter}>
                  <View style={styles.priceSetupFooterCopyWrap}>
                    <Text
                      variant="labelMedium"
                      style={styles.priceSetupFooterLabel}
                    >
                      Siguiente paso recomendado
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={styles.priceSetupFooterCopy}
                    >
                      Crea precios propios o hereda ofertas base para dejar
                      listo tu catálogo de Proxy y VPN.
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={onOpenPrices}
                    style={({ pressed }) => [
                      styles.priceSetupActionButton,
                      pressed ? styles.priceSetupActionButtonPressed : null,
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={styles.priceSetupActionText}
                    >
                      Configurar precios
                    </Text>
                    <View style={styles.priceSetupActionIconWrap}>
                      <MaterialCommunityIcons
                        color="#ecfeff"
                        name="arrow-right"
                        size={18}
                      />
                    </View>
                  </Pressable>
                </View>
              </LinearGradient>
            </Surface>
          ) : null}

          {showPendingEvidenceCard ? (
            <Surface
              style={styles.evidenceHubCard}
              elevation={2}
              onLayout={({ nativeEvent }) => {
                const { width, height } = nativeEvent.layout;
                setEvidenceHubCardSize((current) =>
                  current.width === width && current.height === height
                    ? current
                    : { width, height },
                );
              }}
            >
              <Animated.View
                style={[
                  styles.evidenceHubGlowPrimary,
                  {
                    transform: [
                      { translateX: evidencePrimaryGlowMotion.translateX },
                      { translateY: evidencePrimaryGlowMotion.translateY },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.evidenceHubGlowSecondary,
                  {
                    transform: [
                      { translateX: evidenceSecondaryGlowMotion.translateX },
                      { translateY: evidenceSecondaryGlowMotion.translateY },
                    ],
                  },
                ]}
              />

              <View style={styles.evidenceHubHeader}>
                <View style={styles.evidenceHubTitleWrap}>
                  <Text variant="labelSmall" style={styles.evidenceHubEyebrow}>
                    Subida de evidencias
                  </Text>
                  <Text variant="titleLarge" style={styles.evidenceHubTitle}>
                    Bandeja rápida de comprobantes
                  </Text>
                  <Text variant="bodyMedium" style={styles.evidenceHubCopy}>
                    {getPendingEvidenceStatusText(
                      pendingEvidenceCount,
                      pendingEvidenceLoading,
                    )}
                  </Text>
                </View>

                <View style={styles.evidenceHubHighlight}>
                  <Text
                    variant="labelMedium"
                    style={styles.evidenceHubHighlightLabel}
                  >
                    Pendientes
                  </Text>
                  <Text
                    variant="headlineMedium"
                    style={styles.evidenceHubHighlightValue}
                  >
                    {pendingEvidenceLoading ? "..." : pendingEvidenceCount}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={styles.evidenceHubHighlightHint}
                  >
                    compras
                  </Text>
                </View>
              </View>

              <View style={styles.evidenceHubFooter}>
                <View style={styles.evidenceHubFooterCopyWrap}>
                  <Text
                    variant="labelMedium"
                    style={styles.evidenceHubFooterLabel}
                  >
                    Acceso directo
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={styles.evidenceHubFooterCopy}
                  >
                    Reúne recargas, proxy, VPN y comercio en una sola pantalla
                    para revisar el monto y subir el comprobante.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenPendingEvidence}
                  style={({ pressed }) => [
                    styles.evidenceHubActionButton,
                    pressed ? styles.evidenceHubActionButtonPressed : null,
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={styles.evidenceHubActionText}
                  >
                    Abrir bandeja
                  </Text>
                  <View style={styles.evidenceHubActionIconWrap}>
                    <MaterialCommunityIcons
                      color="#fef3c7"
                      name="arrow-right"
                      size={18}
                    />
                  </View>
                </Pressable>
              </View>
            </Surface>
          ) : null}

          {showCashApprovalsCard ? (
            <Surface
              style={styles.cashApprovalsCard}
              elevation={2}
              onLayout={({ nativeEvent }) => {
                const { width, height } = nativeEvent.layout;
                setCashApprovalsCardSize((current) =>
                  current.width === width && current.height === height
                    ? current
                    : { width, height },
                );
              }}
            >
              <LinearGradient
                colors={["#17113bf8", "#231b53f5", "#2d1f64f2"]}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.58, 1]}
                start={{ x: 0, y: 0 }}
                style={styles.cashApprovalsGradient}
              >
                <Animated.View
                  style={[
                    styles.cashApprovalsGlowPrimary,
                    {
                      transform: [
                        { translateX: cashPrimaryGlowMotion.translateX },
                        { translateY: cashPrimaryGlowMotion.translateY },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.cashApprovalsGlowSecondary,
                    {
                      transform: [
                        { translateX: cashSecondaryGlowMotion.translateX },
                        { translateY: cashSecondaryGlowMotion.translateY },
                      ],
                    },
                  ]}
                />

                <View style={styles.cashApprovalsHeader}>
                  <View style={styles.cashApprovalsTitleWrap}>
                    <Text
                      variant="labelSmall"
                      style={styles.cashApprovalsEyebrow}
                    >
                      Aprobaciones de ventas en efectivo
                    </Text>
                    <Text
                      variant="titleLarge"
                      style={styles.cashApprovalsTitle}
                    >
                      Resumen pendiente por validar
                    </Text>
                    <Text variant="bodyMedium" style={styles.cashApprovalsCopy}>
                      {getCashApprovalsStatusText(
                        pendingCashApprovalsCount,
                        pendingCashApprovalsLoading,
                      )}
                    </Text>
                  </View>

                  <View style={styles.cashApprovalsHighlight}>
                    <Text
                      variant="labelMedium"
                      style={styles.cashApprovalsHighlightLabel}
                    >
                      Por revisar
                    </Text>
                    <Text
                      variant="headlineMedium"
                      style={styles.cashApprovalsHighlightValue}
                    >
                      {pendingCashApprovalsLoading
                        ? "..."
                        : pendingCashApprovalsCount}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={styles.cashApprovalsHighlightHint}
                    >
                      ventas
                    </Text>
                  </View>
                </View>

                <View style={styles.cashApprovalsStatsRow}>
                  <View style={styles.cashApprovalsStatCard}>
                    <Text
                      variant="labelSmall"
                      style={styles.cashApprovalsStatLabel}
                    >
                      Ventas pendientes
                    </Text>
                    <Text
                      variant="titleLarge"
                      style={styles.cashApprovalsStatValue}
                    >
                      {pendingCashApprovalsLoading
                        ? "..."
                        : pendingCashApprovalsCount}
                    </Text>
                  </View>

                  <View style={styles.cashApprovalsStatCard}>
                    <Text
                      variant="labelSmall"
                      style={styles.cashApprovalsStatLabel}
                    >
                      Tipos presentes
                    </Text>
                    <Text
                      variant="titleLarge"
                      style={styles.cashApprovalsStatValue}
                    >
                      {pendingCashApprovalsLoading
                        ? "..."
                        : cashApprovalTypeCount}
                    </Text>
                  </View>
                </View>

                <View style={styles.cashApprovalsTypesWrap}>
                  {pendingCashApprovalsLoading ? (
                    <View style={styles.cashApprovalsEmptyState}>
                      <Text
                        variant="bodyMedium"
                        style={styles.cashApprovalsEmptyTitle}
                      >
                        Cargando resumen de aprobaciones...
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={styles.cashApprovalsEmptyCopy}
                      >
                        Estamos revisando las ventas en efectivo pendientes para
                        mostrarte el desglose actualizado.
                      </Text>
                    </View>
                  ) : pendingCashApprovalTypes.length > 0 ? (
                    pendingCashApprovalTypes.map((typeSummary) => (
                      <View
                        key={typeSummary.key}
                        style={styles.cashApprovalsTypeCard}
                      >
                        <View style={styles.cashApprovalsTypeIconWrap}>
                          <MaterialCommunityIcons
                            color="#c7d2fe"
                            name={typeSummary.icon}
                            size={18}
                          />
                        </View>
                        <View style={styles.cashApprovalsTypeContent}>
                          <Text
                            variant="labelLarge"
                            style={styles.cashApprovalsTypeTitle}
                          >
                            {typeSummary.label}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={styles.cashApprovalsTypeMeta}
                          >
                            {formatCashApprovalSalesLabel(typeSummary.count)}
                          </Text>
                        </View>
                        <Chip
                          compact
                          style={styles.cashApprovalsTypeChip}
                          textStyle={styles.cashApprovalsTypeChipText}
                        >
                          {typeSummary.count}
                        </Chip>
                      </View>
                    ))
                  ) : (
                    <View style={styles.cashApprovalsEmptyState}>
                      <Text
                        variant="bodyMedium"
                        style={styles.cashApprovalsEmptyTitle}
                      >
                        Todo en orden por ahora
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={styles.cashApprovalsEmptyCopy}
                      >
                        Cuando aparezcan nuevas ventas en efectivo por aprobar o
                        rechazar, verás aquí el resumen en tiempo real.
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cashApprovalsFooter}>
                  <View style={styles.cashApprovalsFooterCopyWrap}>
                    <Text
                      variant="labelMedium"
                      style={styles.cashApprovalsFooterLabel}
                    >
                      Acceso directo
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={styles.cashApprovalsFooterCopy}
                    >
                      Revisa evidencias y decide cada venta desde la bandeja de
                      aprobaciones.
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={onOpenCashApprovals}
                    style={({ pressed }) => [
                      styles.cashApprovalsActionButton,
                      pressed ? styles.cashApprovalsActionButtonPressed : null,
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={styles.cashApprovalsActionText}
                    >
                      Ir a aprobaciones
                    </Text>
                    <View style={styles.cashApprovalsActionIconWrap}>
                      <MaterialCommunityIcons
                        color="#eef2ff"
                        name="arrow-right"
                        size={18}
                      />
                    </View>
                  </Pressable>
                </View>
              </LinearGradient>
            </Surface>
          ) : null}

          {heavyContentReady ? (
            <>
              <RenderTraceBlock
                name="ComercioHomeOrdersSection"
                payload={{ position: "before-cubacel" }}
              >
                <ComercioHomeOrdersSection
                  catalogLoading={normalHomeCatalogsLoading}
                  catalogOrders={normalHomeCatalogs?.commerceOrders}
                />
              </RenderTraceBlock>

              <RenderTraceBlock
                name="Productos"
                payload={{ deferDelay: 0, isDegradado: false }}
              >
                <Productos
                  catalogProducts={normalHomeCatalogs?.dtshopProducts}
                  catalogLoading={normalHomeCatalogsLoading}
                  deferData={false}
                  deferDelay={0}
                  isDegradado={false}
                />
              </RenderTraceBlock>

              <RenderTraceBlock name="ProxyVPNPackagesHorizontal">
                <ProxyVPNPackagesHorizontal
                  catalogPackages={normalHomeCatalogs}
                  catalogLoading={normalHomeCatalogsLoading}
                />
              </RenderTraceBlock>

              <RenderTraceBlock name="ComercioHomeSection">
                <ComercioHomeSection />
              </RenderTraceBlock>
            </>
          ) : (
            <View style={styles.deferredContentPlaceholder}>
              <Text variant="bodyMedium" style={styles.deferredContentText}>
                Preparando servicios...
              </Text>
            </View>
          )}
            </>
          )}
          </ScrollView>

        {Platform.OS === "ios" ? (
          drawerMounted ? (
            <Portal>
              <View style={styles.drawerPortal}>
                <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]} pointerEvents="none" />
                <Pressable accessibilityLabel="Cerrar menú" onPress={closeDrawer} style={styles.drawerOverlayPressable} />
                <Animated.View style={[styles.drawerPanel, { transform: [{ translateX }] }]}>
                  <RenderTraceBlock name="DrawerOptionsAlls" payload={{ drawerOpen }} style={styles.drawerTraceBlock}>
                    <DrawerOptionsAlls
                      user={user}
                      currentPath={pathname}
                      onNavigate={navigateTo}
                      onClose={closeDrawer}
                      onToggleModoCadete={onToggleModoCadete}
                      onToggleModoEmpresa={onToggleModoEmpresa}
                    />
                  </RenderTraceBlock>
                </Animated.View>
              </View>
            </Portal>
          ) : null
        ) : (
        <Modal
          animationType="none"
          onRequestClose={closeDrawer}
          presentationStyle="overFullScreen"
          transparent
          statusBarTranslucent
          visible={drawerMounted}
        >
          <StatusBar
            backgroundColor="transparent"
            barStyle="light-content"
            translucent
          />
          <View style={styles.drawerPortal}>
              <Animated.View
                style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
                pointerEvents="none"
              />
              <Pressable
                accessibilityLabel="Cerrar menú"
                onPress={closeDrawer}
                style={styles.drawerOverlayPressable}
              />
              <Animated.View
                style={[styles.drawerPanel, { transform: [{ translateX }] }]}
              >
                <RenderTraceBlock
                  name="DrawerOptionsAlls"
                  payload={{ drawerOpen }}
                  style={styles.drawerTraceBlock}
                >
                  <DrawerOptionsAlls
                    user={user}
                    currentPath={pathname}
                    onNavigate={navigateTo}
                    onClose={closeDrawer}
                    onToggleModoCadete={onToggleModoCadete}
                    onToggleModoEmpresa={onToggleModoEmpresa}
                  />
                </RenderTraceBlock>
              </Animated.View>
          </View>
        </Modal>
        )}
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  screen: {
    flex: 1,
    elevation: 10,
    // backgroundColor: "#eef2ff",
  },
  headerTraceBlock: {
    elevation: 30,
    zIndex: 30,
  },
  backgroundImage: {
    // ...StyleSheet.absoluteFillObject,
  },
  backgroundImageStyle: {
    opacity: 0.18,
  },
  backdrop: {
    // ...StyleSheet.absoluteFillObject,
    // backgroundColor: "rgba(238, 242, 255, 0.94)",
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
    gap: 18,
  },
  deferredContentPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 190,
    paddingHorizontal: 16,
  },
  deferredContentText: {
    color: "rgba(255, 255, 255, 0.72)",
    fontWeight: "700",
  },
  homeLoadingCard: {
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderColor: "rgba(251, 146, 60, 0.3)",
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
  },
  homeLoadingHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeLoadingTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  homeLoadingEyebrow: {
    color: "#fdba74",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  homeLoadingLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  homeLoadingPercent: {
    color: "#fb923c",
    fontSize: 18,
    fontWeight: "900",
    marginLeft: 12,
  },
  homeLoadingProgress: {
    backgroundColor: "rgba(148, 163, 184, 0.22)",
    borderRadius: 99,
    height: 7,
    marginTop: 12,
  },
  homeLoadingStep: {
    color: "rgba(226, 232, 240, 0.68)",
    fontSize: 11,
    marginTop: 7,
  },
  heroCard: {
    marginHorizontal: 16,
    overflow: "hidden",
    borderRadius: 26,
    padding: 22,
    backgroundColor: "#111c44",
  },
  heroGlowPrimary: {
    position: "absolute",
    width: HERO_PRIMARY_GLOW_SIZE,
    height: HERO_PRIMARY_GLOW_SIZE,
    borderRadius: 999,
    backgroundColor: "rgba(76, 175, 80, 0.16)",
    left: 0,
    top: 0,
  },
  heroGlowSecondary: {
    position: "absolute",
    width: HERO_SECONDARY_GLOW_SIZE,
    height: HERO_SECONDARY_GLOW_SIZE,
    borderRadius: 999,
    backgroundColor: "rgba(99, 102, 241, 0.22)",
    left: 0,
    top: 0,
  },
  heroEyebrow: {
    color: "#93c5fd",
    textTransform: "capitalize",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: "#ffffff",
    fontWeight: "800",
    marginBottom: 10,
  },
  heroCopy: {
    color: "rgba(255, 255, 255, 0.84)",
    lineHeight: 24,
  },
  heroChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  heroChip: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroChipText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  debtBanner: {
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "rgba(127, 29, 29, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.22)",
    gap: 14,
  },
  debtBannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  debtBannerTitleWrap: {
    flex: 1,
    gap: 4,
  },
  debtBannerEyebrow: {
    color: "#fecaca",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  debtBannerTitle: {
    color: "#fff1f2",
    fontWeight: "800",
    lineHeight: 23,
  },
  debtBannerChip: {
    backgroundColor: "rgba(254, 226, 226, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(254, 202, 202, 0.18)",
  },
  debtBannerChipText: {
    color: "#fee2e2",
    fontWeight: "800",
  },
  debtBannerFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  debtBannerAmountLabel: {
    color: "rgba(255, 241, 242, 0.78)",
    marginBottom: 4,
    fontWeight: "700",
  },
  debtBannerAmount: {
    color: "#ffffff",
    fontWeight: "900",
  },
  debtBannerAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },
  debtBannerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 241, 242, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(254, 202, 202, 0.2)",
  },
  debtBannerActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  debtBannerActionText: {
    color: "#fee2e2",
    fontWeight: "800",
  },
  debtBannerActionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 241, 242, 0.12)",
  },
  empresaSuggestionCard: {
    borderColor: "rgba(134, 239, 172, 0.22)",
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  empresaSuggestionGradient: {
    gap: 16,
    overflow: "hidden",
    padding: 20,
  },
  empresaSuggestionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  empresaSuggestionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.26)",
    borderColor: "rgba(187, 247, 208, 0.22)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  empresaSuggestionTitleWrap: {
    flex: 1,
    gap: 6,
  },
  empresaSuggestionEyebrow: {
    color: "#86efac",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  empresaSuggestionTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    lineHeight: 28,
  },
  empresaSuggestionCopy: {
    color: "rgba(220, 252, 231, 0.8)",
    lineHeight: 22,
  },
  empresaSuggestionFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
  },
  empresaSuggestionPill: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    borderColor: "rgba(147, 197, 253, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  empresaSuggestionPillText: {
    color: "#dbeafe",
    fontWeight: "800",
  },
  empresaSuggestionActionButton: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "rgba(187, 247, 208, 0.26)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  empresaSuggestionActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  empresaSuggestionActionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(220, 252, 231, 0.14)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  empresaSuggestionActionText: {
    color: "#ecfdf5",
    fontWeight: "800",
  },
  priceSetupActionButton: {
    alignItems: "center",
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    borderColor: "rgba(186, 230, 253, 0.26)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  priceSetupActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  priceSetupActionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(224, 242, 254, 0.14)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  priceSetupActionText: {
    color: "#ecfeff",
    fontWeight: "800",
  },
  priceSetupCard: {
    borderColor: "rgba(125, 211, 252, 0.2)",
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  priceSetupCopy: {
    color: "rgba(224, 242, 254, 0.78)",
    lineHeight: 22,
  },
  priceSetupEyebrow: {
    color: "#67e8f9",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  priceSetupFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
  },
  priceSetupFooterCopy: {
    color: "rgba(219, 234, 254, 0.7)",
    lineHeight: 19,
  },
  priceSetupFooterCopyWrap: {
    flex: 1,
    gap: 4,
    minWidth: 210,
  },
  priceSetupFooterLabel: {
    color: "#bae6fd",
    fontWeight: "800",
  },
  priceSetupGlowPrimary: {
    backgroundColor: "rgba(14, 165, 233, 0.24)",
    borderRadius: 999,
    height: 230,
    left: 0,
    position: "absolute",
    top: 0,
    width: 230,
  },
  priceSetupGlowSecondary: {
    backgroundColor: "rgba(99, 102, 241, 0.26)",
    borderRadius: 999,
    height: 210,
    left: 0,
    position: "absolute",
    top: 0,
    width: 210,
  },
  priceSetupGradient: {
    gap: 16,
    overflow: "hidden",
    padding: 20,
  },
  priceSetupHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  priceSetupIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(8, 145, 178, 0.28)",
    borderColor: "rgba(186, 230, 253, 0.2)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  priceSetupServicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  priceSetupServicePill: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    borderColor: "rgba(147, 197, 253, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceSetupServiceText: {
    color: "#dbeafe",
    fontWeight: "800",
  },
  priceSetupTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    lineHeight: 28,
  },
  priceSetupTitleWrap: {
    flex: 1,
    gap: 6,
  },
  evidenceHubActionButton: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderColor: "rgba(253, 230, 138, 0.24)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  evidenceHubActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  evidenceHubActionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.16)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  evidenceHubActionText: {
    color: "#fef3c7",
    fontWeight: "800",
  },
  evidenceHubCard: {
    backgroundColor: "#241a08",
    borderColor: "rgba(251, 191, 36, 0.28)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 18,
    marginHorizontal: 16,
    overflow: "hidden",
    padding: 20,
  },
  evidenceHubCopy: {
    color: "rgba(254, 243, 199, 0.78)",
    lineHeight: 22,
  },
  evidenceHubEyebrow: {
    color: "#fbbf24",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  evidenceHubFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
  },
  evidenceHubFooterCopy: {
    color: "rgba(254, 243, 199, 0.68)",
    lineHeight: 19,
  },
  evidenceHubFooterCopyWrap: {
    flex: 1,
    gap: 4,
    minWidth: 210,
  },
  evidenceHubFooterLabel: {
    color: "#fde68a",
    fontWeight: "800",
  },
  evidenceHubGlowPrimary: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderRadius: 999,
    height: 220,
    left: 0,
    position: "absolute",
    top: 0,
    width: 220,
  },
  evidenceHubGlowSecondary: {
    backgroundColor: "rgba(217, 119, 6, 0.18)",
    borderRadius: 999,
    height: 190,
    left: 0,
    position: "absolute",
    top: 0,
    width: 190,
  },
  evidenceHubHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
  },
  evidenceHubHighlight: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(69, 45, 10, 0.64)",
    borderColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 96,
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  evidenceHubHighlightHint: {
    color: "rgba(254, 243, 199, 0.7)",
    includeFontPadding: false,
    lineHeight: 14,
  },
  evidenceHubHighlightLabel: {
    color: "#fbbf24",
    fontWeight: "700",
    includeFontPadding: false,
    lineHeight: 16,
  },
  evidenceHubHighlightValue: {
    color: "#ffffff",
    fontWeight: "900",
    includeFontPadding: false,
    lineHeight: 36,
  },
  evidenceHubTitle: {
    color: "#fffbeb",
    fontWeight: "900",
    lineHeight: 28,
  },
  evidenceHubTitleWrap: {
    flex: 1,
    gap: 6,
    minWidth: 220,
  },
  notificationsActionButton: {
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderColor: "rgba(254, 215, 170, 0.26)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  notificationsActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  notificationsActionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.14)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  notificationsActionText: {
    color: "#fff7ed",
    fontWeight: "800",
  },
  notificationsCard: {
    borderColor: "rgba(251, 146, 60, 0.24)",
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  notificationsCopy: {
    color: "rgba(255, 237, 213, 0.8)",
    lineHeight: 22,
  },
  notificationsEyebrow: {
    color: "#fdba74",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  notificationsFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
  },
  notificationsGlowPrimary: {
    backgroundColor: "rgba(249, 115, 22, 0.26)",
    borderRadius: 999,
    height: NOTIFICATIONS_PRIMARY_GLOW_SIZE,
    left: 0,
    position: "absolute",
    top: 0,
    width: NOTIFICATIONS_PRIMARY_GLOW_SIZE,
  },
  notificationsGlowSecondary: {
    backgroundColor: "rgba(220, 38, 38, 0.22)",
    borderRadius: 999,
    height: NOTIFICATIONS_SECONDARY_GLOW_SIZE,
    left: 0,
    position: "absolute",
    top: 0,
    width: NOTIFICATIONS_SECONDARY_GLOW_SIZE,
  },
  notificationsGradient: {
    gap: 16,
    overflow: "hidden",
    padding: 20,
  },
  notificationsHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  notificationsIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(154, 52, 18, 0.34)",
    borderColor: "rgba(254, 215, 170, 0.2)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  notificationsStatusPill: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    borderColor: "rgba(253, 186, 116, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notificationsStatusText: {
    color: "#fed7aa",
    fontWeight: "800",
  },
  notificationsTitle: {
    color: "#fffbeb",
    fontWeight: "900",
    lineHeight: 28,
  },
  notificationsTitleWrap: {
    flex: 1,
    gap: 6,
  },
  cashApprovalsCard: {
    marginHorizontal: 16,
    overflow: "hidden",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.18)",
  },
  cashApprovalsGradient: {
    gap: 18,
    overflow: "hidden",
    padding: 20,
  },
  cashApprovalsGlowPrimary: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(124, 58, 237, 0.38)",
    top: 0,
    left: 0,
  },
  cashApprovalsGlowSecondary: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: "rgba(168, 85, 247, 0.42)",
    top: 0,
    left: 0,
  },
  cashApprovalsHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  cashApprovalsTitleWrap: {
    flex: 1,
    minWidth: 220,
    gap: 6,
  },
  cashApprovalsEyebrow: {
    color: "#c4b5fd",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  cashApprovalsTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    lineHeight: 28,
  },
  cashApprovalsCopy: {
    color: "rgba(237, 233, 254, 0.8)",
    lineHeight: 22,
  },
  cashApprovalsHighlight: {
    width: 118,
    minHeight: 96,
    alignSelf: "flex-start",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(24, 18, 60, 0.66)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cashApprovalsHighlightLabel: {
    color: "rgba(221, 214, 254, 0.88)",
    fontWeight: "700",
    includeFontPadding: false,
    lineHeight: 16,
  },
  cashApprovalsHighlightValue: {
    color: "#ffffff",
    fontWeight: "900",
    includeFontPadding: false,
    lineHeight: 36,
  },
  cashApprovalsHighlightHint: {
    color: "rgba(237, 233, 254, 0.72)",
    includeFontPadding: false,
    lineHeight: 14,
  },
  cashApprovalsStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  cashApprovalsStatCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(24, 18, 60, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.12)",
    justifyContent: "center",
    gap: 5,
  },
  cashApprovalsStatLabel: {
    color: "rgba(191, 219, 254, 0.9)",
    fontWeight: "700",
    includeFontPadding: false,
    lineHeight: 15,
  },
  cashApprovalsStatValue: {
    color: "#f8fafc",
    fontWeight: "900",
    includeFontPadding: false,
    lineHeight: 25,
  },
  cashApprovalsTypesWrap: {
    gap: 10,
  },
  cashApprovalsTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 20,
    backgroundColor: "rgba(24, 18, 60, 0.66)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.12)",
  },
  cashApprovalsTypeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91, 33, 182, 0.24)",
  },
  cashApprovalsTypeContent: {
    flex: 1,
    gap: 2,
  },
  cashApprovalsTypeTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  cashApprovalsTypeMeta: {
    color: "rgba(191, 219, 254, 0.78)",
  },
  cashApprovalsTypeChip: {
    backgroundColor: "rgba(224, 231, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.18)",
  },
  cashApprovalsTypeChipText: {
    color: "#e0e7ff",
    fontWeight: "800",
  },
  cashApprovalsEmptyState: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: "rgba(24, 18, 60, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    gap: 6,
  },
  cashApprovalsEmptyTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  cashApprovalsEmptyCopy: {
    color: "rgba(226, 232, 240, 0.72)",
    lineHeight: 20,
  },
  cashApprovalsFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  cashApprovalsFooterCopyWrap: {
    flex: 1,
    minWidth: 210,
    gap: 4,
  },
  cashApprovalsFooterLabel: {
    color: "#c7d2fe",
    fontWeight: "800",
  },
  cashApprovalsFooterCopy: {
    color: "rgba(226, 232, 240, 0.72)",
    lineHeight: 19,
  },
  cashApprovalsActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(109, 40, 217, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.18)",
  },
  cashApprovalsActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  cashApprovalsActionText: {
    color: "#eef2ff",
    fontWeight: "800",
  },
  cashApprovalsActionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224, 231, 255, 0.12)",
  },
  drawerPortal: {
    flex: 1,
    flexDirection: "row",
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerOverlayPressable: {
    bottom: 0,
    // backgroundColor: "rgba(15, 23, 42, 0.38)",
    left: DRAWER_WIDTH,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  drawerPanel: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: DRAWER_WIDTH,
    zIndex: 1001,
  },
  drawerTraceBlock: {
    flex: 1,
  },
});

export default MenuPrincipalScreen;
