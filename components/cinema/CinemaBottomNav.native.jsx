import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Surface } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ITEMS = [
  { href: "/(normal)/PeliculasVideos", label: "Películas", icon: "movie-open-outline" },
  { href: "/(normal)/Series", label: "Series", icon: "television-classic" },
];

export default function CinemaBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.dock}>
      <Surface elevation={4} style={[styles.surface, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Text style={styles.caption}>VIDKAR CINEMA</Text>
        <View style={styles.items}>
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.endsWith(item.href.split("/").pop());
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={item.href}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}
              >
                <MaterialCommunityIcons color={active ? "#fff" : "#aab6ca"} name={item.icon} size={22} />
                <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: "absolute", left: 14, right: 14, bottom: 10, zIndex: 30 },
  surface: { alignItems: "center", backgroundColor: "rgba(10, 16, 30, 0.96)", borderColor: "rgba(148, 163, 184, 0.22)", borderRadius: 22, borderWidth: 1, paddingHorizontal: 8, paddingTop: 7 },
  caption: { color: "#9aa8c0", fontSize: 9, fontWeight: "900", letterSpacing: 1.7, marginBottom: 4 },
  items: { flexDirection: "row", gap: 8, width: "100%" },
  item: { alignItems: "center", borderRadius: 16, flex: 1, gap: 2, minHeight: 50, justifyContent: "center" },
  itemActive: { backgroundColor: "#e11d48" },
  itemPressed: { opacity: 0.82 },
  label: { color: "#aab6ca", fontSize: 12, fontWeight: "800" },
  labelActive: { color: "#fff" },
});
