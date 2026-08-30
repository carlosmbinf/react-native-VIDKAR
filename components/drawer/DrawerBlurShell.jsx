import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Surface, useTheme } from "react-native-paper";

import { appHeaderBlurTargetRef } from "../Header/appHeaderBlurTarget";

const DrawerBlurShell = ({ children, overlayColor, style }) => {
  const theme = useTheme();
  const resolvedOverlayColor =
    overlayColor ||
    (theme.dark
      ? "rgba(6, 12, 24, 0.68)"
      : "rgba(255, 255, 255, 0.58)");

  return (
    <Surface
      elevation={0}
      style={[styles.shell, style]}
    >
      <BlurView
        blurTarget={
          Platform.OS === "android" ? appHeaderBlurTargetRef : undefined
        }
        intensity={34}
        tint={theme.dark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
        blurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
        renderToHardwareTextureAndroid={true}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.overlay,
          { backgroundColor: resolvedOverlayColor },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  overlay: {
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
  },
  shell: {
    backgroundColor: "transparent",
    flex: 1,
    overflow: "hidden",
  },
});

export default DrawerBlurShell;