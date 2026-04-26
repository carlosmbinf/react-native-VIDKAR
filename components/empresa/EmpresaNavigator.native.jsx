import MeteorBase from "@meteorrn/core";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Portal, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const user = Meteor.useTracker(() => Meteor.user());
  const { height, width } = useWindowDimensions();
  const drawerWidth = width > height
    ? Math.min(LANDSCAPE_DRAWER_MAX_WIDTH, Math.max(340, width * 0.42))
    : PORTRAIT_DRAWER_WIDTH;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drawerOpen) {
      translateX.setValue(-drawerWidth);
    }
  }, [drawerOpen, drawerWidth, translateX]);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          duration: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          duration: 220,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateX, {
        duration: 200,
        toValue: -drawerWidth,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setDrawerMounted(false);
      }
    });
  }, [drawerOpen, drawerWidth, overlayOpacity, translateX]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={[]}>
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <PedidosPreparacionScreen onOpenDrawer={() => setDrawerOpen(true)} />

        <Portal>
          {drawerMounted ? (
            <View pointerEvents="box-none" style={styles.drawerPortal}>
              <Animated.View
                pointerEvents="box-none"
                style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
              >
                <Pressable
                  onPress={() => setDrawerOpen(false)}
                  style={styles.drawerOverlayPressable}
                />
              </Animated.View>
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
                <EmpresaDrawerContent onClose={() => setDrawerOpen(false)} user={user} />
              </Animated.View>
            </View>
          ) : null}
        </Portal>
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
    ...StyleSheet.absoluteFillObject,
  },
  drawerPanel: {
    borderRightWidth: 1,
    height: "100%",
    shadowOffset: {
      width: 12,
      height: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  drawerPortal: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 20,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});

export default EmpresaNavigator;