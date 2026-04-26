import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

import {
    DARK_MENU_GLASS_TINT,
    LIGHT_MENU_GLASS_TINT,
} from "../shared/GlassMenuSurface";

const BlurMenuSurface = ({ children }) => {
  const theme = useTheme();
  const blurTint = theme.dark ? "dark" : "light";
  const menuTintColor = theme.dark
    ? DARK_MENU_GLASS_TINT
    : LIGHT_MENU_GLASS_TINT;

  return (
    <BlurView
      experimentalBlurMethod={
        Platform.OS === "android" ? "dimezisBlurView" : undefined
      }
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