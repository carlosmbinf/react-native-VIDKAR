import { Stack } from "expo-router";
import { BlurTargetView } from "expo-blur";
import React, { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
    MD3DarkTheme,
    MD3LightTheme,
    PaperProvider,
} from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SpotlightNavigation from "../components/spotlight/SpotlightNavigation.native";
import ProxyVpnWidgetSyncHost from "../components/widgets/ProxyVpnWidgetSyncHost";
import { appHeaderBlurTargetRef } from "../components/Header/appHeaderBlurTarget";
import { useColorScheme } from "../hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const theme = useMemo(
    () => ({
      ...(isDarkMode ? MD3DarkTheme : MD3LightTheme),
      colors: {
        ...(isDarkMode ? MD3DarkTheme.colors : MD3LightTheme.colors),
        primary: "#3f51b5",
        secondary: "#00a86b",
      },
    }),
    [isDarkMode],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <BlurTargetView ref={appHeaderBlurTargetRef} style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
          </BlurTargetView>
          <SpotlightNavigation />
          <ProxyVpnWidgetSyncHost />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
