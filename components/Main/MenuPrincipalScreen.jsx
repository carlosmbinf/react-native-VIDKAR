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

const formatGreeting = (username) => {
  if (!username) return "Bienvenido";

  const [firstWord] = username.split(" ");
  return `Hola, ${firstWord}`;
};

const getRoleLabel = (user) => {
  if (user?.username === "carlosmbinf") return "Administrador general";
  if (user?.profile?.role === "admin") return "Administrador";
  return "Usuario";
};

const MenuPrincipalScreen = ({
  user,
  appVersion = "0.0.0",
  buildNumber = "0",
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
              {formatGreeting(user?.username)}
            </Text>
            <Text variant="bodyLarge" style={styles.heroCopy}>
              Gestiona tus servicios de conectividad, recargas y compras con
              seguridad. Accede a todas las funcionalidades desde un solo lugar.
            </Text>
            <View style={styles.heroChipsRow}>
              <Chip
                compact
                icon="shield-account"
                style={styles.heroChip}
                textStyle={styles.heroChipText}
              >
                {getRoleLabel(user)}
              </Chip>
              <Chip
                compact
                icon="information"
                style={styles.heroChip}
                textStyle={styles.heroChipText}
              >
                v{appVersion}
              </Chip>
              <Chip
                compact
                icon="cellphone-arrow-down"
                style={styles.heroChip}
                textStyle={styles.heroChipText}
              >
                Comp. {buildNumber}
              </Chip>
            </View>
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
