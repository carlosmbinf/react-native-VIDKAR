import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import {
  ServiceEntrance,
  ServiceMotionProvider,
  ServiceScrollViewport,
} from "../motion/ServiceMotion";
import FormularioRemesa from "./FormularioRemesa.native";
import TableListRemesa from "./TableListRemesa.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const safeHaptic = () => {
  try {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  } catch (_) { }
};

const RemesasScreen = () => {
  const user = Meteor.useTracker(() => Meteor.user());
  const headerInset = useAppHeaderContentInset();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);

  const [selectedTab, setSelectedTab] = useState("history"); // 'history' | 'send'

  const colors = useMemo(
    () => ({
      border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      disabledBg: isDark ? "rgba(239, 68, 68, 0.12)" : "#fef2f2",
      disabledBorder: isDark ? "rgba(248, 113, 113, 0.25)" : "#fca5a5",
      disabledText: isDark ? "#fca5a5" : "#b91c1c",
      muted: isDark ? "#94a3b8" : "#64748b",
      surface: isDark ? "#0f172a" : "#ffffff",
      text: isDark ? "#f8fafc" : "#0f172a",
      warning: isDark ? "#fbbf24" : "#d97706",
    }),
    [isDark],
  );

  const tabs = [
    {
      icon: "format-list-bulleted",
      key: "history",
      label: "Mis Remesas",
    },
    {
      icon: "send-outline",
      key: "send",
      label: "Enviar Remesa",
    },
  ];

  return (
    <Surface style={styles.screen}>
      <AppHeader
        backHref="/(normal)/Main"
        overlapContent
        showBackButton
        subtitle="Envíos rápidos en CUP y USD con seguimiento en vivo"
        title="Remesas a Cuba"
      />

      <ServiceScrollViewport>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: headerInset + 12 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top navigation tabs (Mis Remesas vs Enviar Remesa) */}
          <ServiceEntrance style={styles.tabContainer}>
            <View
              style={[
                styles.navPillContainer,
                {
                  backgroundColor: theme.dark
                    ? "rgba(15, 23, 42, 0.85)"
                    : "rgba(241, 245, 249, 0.95)",
                  borderColor: theme.dark
                    ? "rgba(148, 163, 184, 0.16)"
                    : "rgba(15, 23, 42, 0.08)",
                },
              ]}
            >
              {tabs.map((tab) => {
                const isSelected = selectedTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      safeHaptic();
                      setSelectedTab(tab.key);
                    }}
                    style={[
                      styles.navPillButton,
                      isSelected && {
                        backgroundColor: theme.colors.primary,
                        elevation: 2,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={
                        isSelected
                          ? "#ffffff"
                          : theme.dark
                            ? "#94a3b8"
                            : "#64748b"
                      }
                      name={tab.icon}
                      size={18}
                    />
                    <Text
                      style={[
                        styles.navPillText,
                        {
                          color: isSelected
                            ? "#ffffff"
                            : theme.colors.onSurface,
                          fontWeight: isSelected ? "800" : "600",
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ServiceEntrance>

          {/* Tab 1: Mis Remesas (Identical design to VentasList) */}
          {selectedTab === "history" ? (
            <ServiceEntrance delay={40}>
              <TableListRemesa
                onNewRemesaPress={() => {
                  safeHaptic();
                  setSelectedTab("send");
                }}
              />
            </ServiceEntrance>
          ) : null}

        {/* Tab 2: Enviar Remesa (Formulario) */}
        {selectedTab === "send" ? (
          <ServiceEntrance delay={60} variant="hero">
            {user?.permiteRemesas ? (
              <FormularioRemesa />
            ) : (
              <Surface
                elevation={0}
                style={[
                  styles.disabledCard,
                  {
                    backgroundColor: colors.disabledBg,
                    borderColor: colors.disabledBorder,
                  },
                ]}
              >
                <IconButton
                  icon="alert-octagon-outline"
                  iconColor={colors.disabledText}
                  size={36}
                />
                <Text
                  style={[styles.disabledTitle, { color: colors.disabledText }]}
                  variant="titleMedium"
                >
                  Envíos de remesas temporalmente deshabilitados
                </Text>
                <Text
                  style={[styles.disabledSubtitle, { color: colors.muted }]}
                >
                  El servicio de cotización y despacho de remesas no está activo
                  para tu cuenta en este momento. Por favor, contacta con
                  soporte o administración.
                </Text>
              </Surface>
            )}
          </ServiceEntrance>
        ) : null}
      </ScrollView>
    </ServiceScrollViewport>
    </Surface >
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 40,
    paddingHorizontal: 14,
  },
  disabledCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 24,
  },
  disabledSubtitle: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  disabledTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  navPillButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 10,
  },
  navPillContainer: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    padding: 4,
  },
  navPillText: {
    fontSize: 13,
  },
  screen: {
    flex: 1,
  },
  tabContainer: {
    marginBottom: 4,
  },
});

export default function RemesasWithMotion() {
  return (
    <ServiceMotionProvider>
      <RemesasScreen />
    </ServiceMotionProvider>
  );
}
