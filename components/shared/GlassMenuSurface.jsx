import { StyleSheet, View } from "react-native";

import { GlassView } from "expo-glass-effect";

export const LIGHT_MENU_GLASS_TINT = "#f5f7ff8b";
export const DARK_MENU_GLASS_TINT = "#5a58c559";

export const GlassMenuSurface = ({
  children,
  glassEffectStyle = "clear", // clear | regular | none
  tintColor = "#5a58c559",
}) => {
  return (
    <View style={styles.wrapper} collapsable={false}>
      <View pointerEvents="none" style={styles.prewarmLayer}>
        <GlassView
          style={styles.prewarmGlass}
          //   glassEffectStyle={glassEffectStyle}
          //   tintColor={tintColor}
          isInteractive={false}
        />
      </View>

      <View style={styles.surfaceFrame}>
        <View
          pointerEvents="none"
          style={[styles.fallbackSurface, { backgroundColor: tintColor }]}
        />

        <GlassView
          style={styles.surface}
          isInteractive
          glassEffectStyle={glassEffectStyle}
          //   tintColor={tintColor}
        >
          {children}
        </GlassView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: "visible",
    position: "relative",
  },
  surfaceFrame: {
    borderRadius: 30,
    overflow: "hidden",
    position: "relative",
  },
  prewarmLayer: {
    height: 1,
    left: -9999,
    opacity: 0.01,
    pointerEvents: "none",
    position: "absolute",
    top: -9999,
    width: 1,
  },
  prewarmGlass: {
    borderRadius: 1,
    flex: 1,
  },
  fallbackSurface: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 30,
    borderWidth: 1,
  },
  surface: {
    borderRadius: 30,
    overflow: "hidden",
  },
});

export default GlassMenuSurface;
