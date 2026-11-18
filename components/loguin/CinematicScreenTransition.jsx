import React from "react";
import { View } from "react-native";

export function MainMenuEntranceMotion({ children, style }) {
  return style ? <View style={style}>{children}</View> : children;
}
