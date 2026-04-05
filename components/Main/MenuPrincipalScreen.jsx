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

import Meteor from "@meteorrn/core";
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

const MenuPrincipalScreen = ({
  user,
  appVersion = "0.0.0",
  buildNumber = "0",
  pendingDebt = 0,
  pendingVentasCount = 0,
  onOpenPendingVentas,
  onLogout,
  onToggleModoCadete,
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
              {Meteor.user()?.username === "carlosmbinf" && (
                <Chip
                  compact
                  icon="information"
                  style={styles.heroChip}
                  textStyle={styles.heroChipText}
                >
                  v{appVersion}
                </Chip>
              )}
              {Meteor.user()?.username === "carlosmbinf" && (
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
