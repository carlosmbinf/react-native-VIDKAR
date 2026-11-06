import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function CourseCover({ failed, initial, onError, url }) {
  const theme = useTheme();
  return url && !failed ? (
    <Image
      accessibilityLabel="Portada del curso"
      onError={onError}
      resizeMode="cover"
      source={{ uri: url }}
      style={styles.cover}
    />
  ) : (
    <LinearGradient
      accessibilityLabel="Curso sin portada disponible"
      colors={theme.dark ? ["#113344", "#172554", "#3b2a0d"] : ["#cffafe", "#dbeafe", "#fef3c7"]}
      style={styles.fallback}
    >
      <Text style={[styles.initial, { color: theme.dark ? "#67e8f9" : "#0e7490" }]}>{initial || "C"}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cover: { height: "100%", width: "100%" },
  fallback: { alignItems: "center", height: "100%", justifyContent: "center", width: "100%" },
  initial: { fontSize: 46, fontWeight: "900" },
});
