import { Stack } from "expo-router";
import React, { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
  Portal,
} from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
          <Portal.Host>
            <Stack screenOptions={{ headerShown: false }} />
          </Portal.Host>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
