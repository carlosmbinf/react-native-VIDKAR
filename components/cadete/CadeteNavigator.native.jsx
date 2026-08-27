import MeteorBase from "@meteorrn/core";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Appbar, Surface } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import HomePedidosComercio from "../comercio/pedidos/HomePedidosComercio";
import AppHeader from "../Header/AppHeader";
import CadeteDrawerContent from "./CadeteDrawerContent";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const PORTRAIT_DRAWER_WIDTH = 316;
const LANDSCAPE_DRAWER_MAX_WIDTH = 380;

const CadeteNavigator = () => {
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
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <Surface style={styles.screen}>
        <AppHeader
          backgroundColor="#13803d"
          overlapContent
          left={
            <Appbar.Action
              icon="menu"
              iconColor="#ffffff"
              onPress={openDrawer}
            />
          }
          subtitle={user?.username ? `Modo cadete · ${user.username}` : "Modo cadete activo"}
          title="Mis pedidos"
        />

        <HomePedidosComercio />

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
                style={styles.drawerOverlayPressable}
              />
              <Animated.View
                style={[
                  styles.drawerPanel,
                  {
                    maxWidth: drawerWidth,
                    transform: [{ translateX }],
                    width: drawerWidth,
                  },
                ]}
              >
                <CadeteDrawerContent onClose={closeDrawer} user={user} />
              </Animated.View>
          </View>
        </Modal>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  drawerOverlayPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  drawerPanel: {
    bottom: 0,
    elevation: 1001,
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 1001,
  },
  drawerPortal: {
    flex: 1,
    flexDirection: "row",
  },
  safeArea: {
    backgroundColor: "#f3f5fb",
    flex: 1,
  },
  screen: {
    backgroundColor: "#f3f5fb",
    flex: 1,
  },
});

export default CadeteNavigator;