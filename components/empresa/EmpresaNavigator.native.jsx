import MeteorBase from "@meteorrn/core";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Portal, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import EmpresaDrawerContent from "./EmpresaDrawerContent";
import PedidosPreparacionScreen from "./screens/PedidosPreparacionScreen";
import { createEmpresaPalette } from "./styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const DRAWER_WIDTH = 316;

const EmpresaNavigator = () => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const user = Meteor.useTracker(() => Meteor.user());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

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
        toValue: -DRAWER_WIDTH,
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
  }, [drawerOpen, overlayOpacity, translateX]);

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
                    backgroundColor: palette.panel,
                    borderRightColor: palette.border,
                    shadowColor: palette.shadowColor,
                    transform: [{ translateX }],
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
    flex: 1,
  },
  drawerPanel: {
    borderRightWidth: 1,
    bottom: 0,
    left: 0,
    maxWidth: DRAWER_WIDTH,
    position: "absolute",
    shadowOffset: {
      width: 12,
      height: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    top: 0,
    width: DRAWER_WIDTH,
  },
  drawerPortal: {
    ...StyleSheet.absoluteFillObject,
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