import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Chip, Portal, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import Productos from "../cubacel/Productos";
import DrawerOptionsAlls from "../drawer/DrawerOptionsAlls";
import MenuHeader from "../Header/MenuHeader";
import ProxyVPNPackagesHorizontal from "../proxyVPN/ProxyVPNPackagesHorizontal";

const DRAWER_WIDTH = 316;

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

const MenuPrincipalScreen = ({
  user,
  appVersion = "0.0.0",
  buildNumber = "0",
  pendingDebt = 0,
  pendingVentasCount = 0,
  pendingCashApprovalTypes = [],
  pendingCashApprovalsCount = 0,
  pendingCashApprovalsLoading = false,
  onOpenCashApprovals = () => {},
  onOpenPendingVentas = () => {},
  onLogout = () => {},
  onToggleModoCadete = () => {},
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setDrawerMounted(false);
      }
    });
  }, [drawerOpen, overlayOpacity, translateX]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Surface style={styles.screen}>
        <ImageBackground
          source={require("../files/space-bg-shadowcodex.jpg")}
          resizeMode="cover"
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.backdrop} />
        </ImageBackground>

        <MenuHeader
          title="VIDKAR"
          subtitle="Menú principal"
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenProfile={() => navigateTo("/(normal)/User")}
          onOpenMessages={(item) => {
            if (item) {
              navigateTo(`/(normal)/Mensaje?item=${encodeURIComponent(item)}`);
              return;
            }

            navigateTo("/(normal)/Mensaje");
          }}
          onLogout={onLogout}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
        >
          <Surface style={styles.heroCard} elevation={2}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />
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

          {hasAdminRole ? (
            <Surface style={styles.cashApprovalsCard} elevation={2}>
              <View style={styles.cashApprovalsGlowPrimary} />
              <View style={styles.cashApprovalsGlowSecondary} />

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

                <Surface style={styles.cashApprovalsHighlight} elevation={0}>
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
                    {pendingCashApprovalsLoading ? "..." : pendingCashApprovalsCount}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={styles.cashApprovalsHighlightHint}
                  >
                    ventas
                  </Text>
                </Surface>
              </View>

              <View style={styles.cashApprovalsStatsRow}>
                <Surface style={styles.cashApprovalsStatCard} elevation={0}>
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
                    {pendingCashApprovalsLoading ? "..." : pendingCashApprovalsCount}
                  </Text>
                </Surface>

                <Surface style={styles.cashApprovalsStatCard} elevation={0}>
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
                    {pendingCashApprovalsLoading ? "..." : cashApprovalTypeCount}
                  </Text>
                </Surface>
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
                    <Surface
                      key={typeSummary.key}
                      style={styles.cashApprovalsTypeCard}
                      elevation={0}
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
                    </Surface>
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
            </Surface>
          ) : null}

          <Productos isDegradado={false} />

          <ProxyVPNPackagesHorizontal />
        </ScrollView>

        <Portal>
          {drawerMounted ? (
            <View style={styles.drawerPortal} pointerEvents="box-none">
              <Animated.View
                style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
                pointerEvents="box-none"
              >
                <Pressable
                  style={styles.drawerOverlayPressable}
                  onPress={() => setDrawerOpen(false)}
                />
              </Animated.View>
              <Animated.View
                style={[styles.drawerPanel, { transform: [{ translateX }] }]}
              >
                <DrawerOptionsAlls
                  user={user}
                  currentPath={pathname}
                  onNavigate={navigateTo}
                  onClose={() => setDrawerOpen(false)}
                  onToggleModoCadete={onToggleModoCadete}
                />
              </Animated.View>
            </View>
          ) : null}
        </Portal>
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
  heroCard: {
    marginHorizontal: 16,
    overflow: "hidden",
    borderRadius: 26,
    padding: 22,
    backgroundColor: "#111c44",
  },
  heroGlowPrimary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(76, 175, 80, 0.16)",
    top: -70,
    right: -40,
  },
  heroGlowSecondary: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(99, 102, 241, 0.22)",
    bottom: -80,
    left: -30,
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
  cashApprovalsCard: {
    marginHorizontal: 16,
    overflow: "hidden",
    borderRadius: 26,
    padding: 20,
    backgroundColor: "#0d1538",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.16)",
    gap: 18,
  },
  cashApprovalsGlowPrimary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    top: -96,
    left: -36,
  },
  cashApprovalsGlowSecondary: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(129, 140, 248, 0.18)",
    right: -70,
    bottom: -96,
  },
  cashApprovalsHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },
  cashApprovalsTitleWrap: {
    flex: 1,
    minWidth: 220,
    gap: 6,
  },
  cashApprovalsEyebrow: {
    color: "#93c5fd",
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
    color: "rgba(226, 232, 240, 0.82)",
    lineHeight: 22,
  },
  cashApprovalsHighlight: {
    minWidth: 128,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(15, 23, 42, 0.64)",
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cashApprovalsHighlightLabel: {
    color: "#93c5fd",
    fontWeight: "700",
  },
  cashApprovalsHighlightValue: {
    color: "#ffffff",
    fontWeight: "900",
  },
  cashApprovalsHighlightHint: {
    color: "rgba(226, 232, 240, 0.72)",
  },
  cashApprovalsStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cashApprovalsStatCard: {
    flex: 1,
    minWidth: 146,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    gap: 6,
  },
  cashApprovalsStatLabel: {
    color: "rgba(191, 219, 254, 0.9)",
    fontWeight: "700",
  },
  cashApprovalsStatValue: {
    color: "#f8fafc",
    fontWeight: "900",
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
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.14)",
  },
  cashApprovalsTypeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 70, 229, 0.18)",
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
    backgroundColor: "rgba(15, 23, 42, 0.52)",
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
    backgroundColor: "rgba(129, 140, 248, 0.18)",
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
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerOverlayPressable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  drawerPanel: {
    width: DRAWER_WIDTH,
    height: "100%",
  },
});

export default MenuPrincipalScreen;
