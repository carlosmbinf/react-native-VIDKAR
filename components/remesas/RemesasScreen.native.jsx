import MeteorBase from "@meteorrn/core";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
    IconButton,
    SegmentedButtons,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import FormularioRemesa from "./FormularioRemesa.native";
import TableListRemesa from "./TableListRemesa.native";
import VentasStepper from "./VentasStepper.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const RemesasScreen = () => {
  const user = Meteor.useTracker(() => Meteor.user());
  const headerInset = useAppHeaderContentInset();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);

  const [selectedTab, setSelectedTab] = useState("all");

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

  return (
    <Surface style={styles.screen}>
      <AppHeader
        title="Remesas a Cuba"
        subtitle="Envíos rápidos en CUP y USD con seguimiento en vivo"
        backHref="/(normal)/Main"
        showBackButton
        overlapContent
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={{ marginTop: headerInset + 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Selector de pestañas para organizar la vista en pantallas pequeñas */}
        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={selectedTab}
            onValueChange={setSelectedTab}
            density="small"
            buttons={[
              {
                icon: "view-dashboard-outline",
                label: "Todo",
                value: "all",
              },
              {
                icon: "send-outline",
                label: "Enviar",
                value: "send",
              },
              {
                icon: "progress-clock",
                label: "Seguimiento",
                value: "tracking",
              },
              {
                icon: "history",
                label: "Historial",
                value: "history",
              },
            ]}
          />
        </View>

        {/* Sección Enviar Remesa */}
        {selectedTab === "all" || selectedTab === "send" ? (
          user?.permiteRemesas ? (
            <FormularioRemesa />
          ) : (
            <Surface
              style={[
                styles.disabledCard,
                {
                  backgroundColor: colors.disabledBg,
                  borderColor: colors.disabledBorder,
                },
              ]}
              elevation={0}
            >
              <IconButton
                icon="alert-octagon-outline"
                size={36}
                iconColor={colors.disabledText}
              />
              <Text variant="titleMedium" style={[styles.disabledTitle, { color: colors.disabledText }]}>
                Envíos de remesas temporalmente deshabilitados
              </Text>
              <Text style={[styles.disabledSubtitle, { color: colors.muted }]}>
                El servicio de cotización y despacho de remesas no está activo para tu cuenta en este momento. Por favor, contacta con soporte o administración.
              </Text>
            </Surface>
          )
        ) : null}

        {/* Sección Stepper de seguimiento de ventas activas e historial */}
        {selectedTab === "all" || selectedTab === "tracking" ? (
          <VentasStepper />
        ) : null}

        {/* Sección Historial y tabla detallada */}
        {selectedTab === "all" || selectedTab === "history" ? (
          <TableListRemesa />
        ) : null}
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
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
  screen: {
    flex: 1,
  },
  tabContainer: {
    marginBottom: 10,
    marginHorizontal: 16,
  },
});

export default RemesasScreen;
