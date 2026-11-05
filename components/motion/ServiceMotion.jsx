import React from "react";
import { Pressable, View } from "react-native";

export function ServiceMotionProvider({ children }) {
  return <>{children}</>;
}

export function ServiceScrollViewport({ children }) {
  return children;
}

export function ServiceEntrance({ children, style }) {
  return <View style={style}>{children}</View>;
}

export function ServiceConversion({ children, style }) {
  return <View style={style}>{children}</View>;
}

export function ServicePressable({ children, style, onPress, ...props }) {
  return (
    <Pressable
      {...props}
      style={(state) => [typeof style === "function" ? style(state) : style, state.pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export function ServiceAtmosphere({ color = "#818cf8" }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, right: -70, top: -90, backgroundColor: color, opacity: 0.12 }}
    />
  );
}