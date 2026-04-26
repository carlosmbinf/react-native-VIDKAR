import MeteorBase from "@meteorrn/core";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Appbar, Portal, Surface } from "react-native-paper";
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
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <Surface style={styles.screen}>
        <AppHeader
          backgroundColor="#13803d"
          left={
            <Appbar.Action
              icon="menu"
              iconColor="#ffffff"
              onPress={() => setDrawerOpen(true)}
            />
          }
          subtitle={user?.username ? `Modo cadete · ${user.username}` : "Modo cadete activo"}
          title="Mis pedidos"
        />

        <HomePedidosComercio />

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
                    maxWidth: drawerWidth,
                    transform: [{ translateX }],
                    width: drawerWidth,
                  },
                ]}
              >
                <CadeteDrawerContent onClose={() => setDrawerOpen(false)} user={user} />
              </Animated.View>
            </View>
          ) : null}
        </Portal>
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
  },
  drawerPanel: {
    height: "100%",
  },
  drawerPortal: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 20,
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