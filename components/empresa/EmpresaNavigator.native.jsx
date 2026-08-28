import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolveSessionRoute } from "../navigator/sessionRoute";
import EmpresaDrawerContent from "./EmpresaDrawerContent";
import PedidosPreparacionScreen from "./screens/PedidosPreparacionScreen";
import { createEmpresaPalette } from "./styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const PORTRAIT_DRAWER_WIDTH = 316;
const LANDSCAPE_DRAWER_MAX_WIDTH = 380;

const EmpresaNavigator = () => {
  const router = useRouter();
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const { user, userId } = Meteor.useTracker(() => ({
    user: Meteor.user(),
    userId: Meteor.userId(),
  }));
  const { height, width } = useWindowDimensions();
  const drawerWidth = width > height
    ? Math.min(LANDSCAPE_DRAWER_MAX_WIDTH, Math.max(340, width * 0.42))
    : PORTRAIT_DRAWER_WIDTH;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId || !user) {
      return;
    }

    const targetRoute = resolveSessionRoute(userId, user);

    if (targetRoute !== "/(empresa)/EmpresaNavigator") {
      router.replace(targetRoute);
    }
  }, [router, user, userId]);

  useEffect(() => {
    if (!drawerMounted) {
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.timing(translateX, {
        duration: drawerOpen ? 240 : 200,
        toValue: drawerOpen ? 0 : -drawerWidth,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        duration: drawerOpen ? 220 : 180,
        toValue: drawerOpen ? 1 : 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !drawerOpen) {
        setDrawerMounted(false);
      }
    });

    return () => animation.stop();
  }, [drawerMounted, drawerOpen, drawerWidth, overlayOpacity, translateX]);

  const openDrawer = () => {
    translateX.stopAnimation();
    overlayOpacity.stopAnimation();
    translateX.setValue(-drawerWidth);
    overlayOpacity.setValue(0);
    setDrawerMounted(true);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={[]}>
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
          <PedidosPreparacionScreen onOpenDrawer={openDrawer} />

        <Modal
          animationType="none"
          onRequestClose={closeDrawer}
          transparent
          visible={drawerMounted}
        >
          <View style={styles.drawerPortal}>
              <Animated.View
                pointerEvents="none"
                style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
              />
              <Pressable
                accessibilityLabel="Cerrar menú"
                onPress={closeDrawer}
                style={[styles.drawerOverlayPressable, { left: drawerWidth }]}
              />
              <Animated.View
                style={[
                  styles.drawerPanel,
                  {
                    borderRightColor: palette.border,
                    shadowColor: palette.shadowColor,
                    maxWidth: drawerWidth,
                    transform: [{ translateX }],
                    width: drawerWidth,
                  },
                ]}
              >
                <EmpresaDrawerContent onClose={closeDrawer} user={user} />
              </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(21, 15, 44, 0.38)",
  },
  drawerOverlayPressable: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  drawerPanel: {
    borderRightWidth: 1,
    bottom: 0,
    elevation: 1001,
    left: 0,
    position: "absolute",
    shadowOffset: {
      width: 12,
      height: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    top: 0,
    zIndex: 1001,
  },
  drawerPortal: {
    flex: 1,
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});

export default EmpresaNavigator;