import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";

import {
    DARK_MENU_GLASS_TINT,
    LIGHT_MENU_GLASS_TINT,
} from "../shared/GlassMenuSurface";
import { appHeaderBlurTargetRef } from "./appHeaderBlurTarget";

const BlurMenuSurface = ({ children }) => {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const blurTint = theme.dark ? "dark" : "light";
  const menuTintColor = theme.dark
    ? DARK_MENU_GLASS_TINT
    : LIGHT_MENU_GLASS_TINT;

  return (
    <BlurView
      key={`${width}-${height}`}
      blurTarget={Platform.OS === "android" ? appHeaderBlurTargetRef : undefined}
      blurMethod={
        Platform.OS === "android" ? "dimezisBlurView" : undefined
      }
      blurReductionFactor={4}
      intensity={15}
      renderToHardwareTextureAndroid
      style={[styles.surface, { backgroundColor: menuTintColor }]}
      tint={blurTint}
    >
      {children}
    </BlurView>
  );
};

export const blurMenuContentStyle = {
  backgroundColor: "transparent",
  borderRadius: 25,
  overflow: "visible",
  padding: 0,
};

const styles = StyleSheet.create({
  surface: {
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 25,
    borderWidth: 2,
    overflow: "hidden",
  },
});

export default BlurMenuSurface;