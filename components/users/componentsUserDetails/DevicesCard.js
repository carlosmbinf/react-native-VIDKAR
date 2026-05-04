import MeteorBase from "@meteorrn/core";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Surface, Text, useTheme } from "react-native-paper";

import { PushTokens } from "../../collections/collections";
import {
    buildDeviceViewModel,
    buildPushDashboard,
    canAccessPushTokenDashboards,
    PUSH_TOKEN_FIELDS,
    PUSH_TOKEN_SORT_UPDATED,
} from "../pushTokens/utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const MetricCard = ({ label, value, accentColor, compact, palette }) => (
  <Surface
    elevation={0}
    style={[
      styles.metricCard,
      compact ? styles.metricCardCompact : null,
      { backgroundColor: palette.panel, borderColor: accentColor },
    ]}
  >
    <Text variant="labelSmall" style={[styles.metricLabel, { color: palette.label }]}>
      {label}
    </Text>
    <Text variant="titleMedium" style={[styles.metricValue, { color: palette.title }]}>
      {value}
    </Text>
  </Surface>
);

const DevicesCard = ({
  userId,
  parentStyles,
  accentColor,
  containerStyle,
  onOpenDevices,
}) => {
  const theme = useTheme();
  const palette = {
    copy: theme.dark ? "#cbd5e1" : "#475569",
    label: theme.dark ? "#94a3b8" : "#64748b",
    panel: theme.dark ? "rgba(30, 41, 59, 0.72)" : "rgba(248, 250, 252, 0.96)",
    title: theme.dark ? "#f8fafc" : "#0f172a",
  };
  const canViewPushDashboard = Meteor.useTracker(
    () => canAccessPushTokenDashboards(Meteor.user()),
    [],
  );
  const { ready, devices } = Meteor.useTracker(() => {
    if (!userId) {
      return { ready: false, devices: [] };
    }

    const handle = Meteor.subscribe(
      "push_tokens",
      { userId },
      {
        fields: PUSH_TOKEN_FIELDS,
        sort: PUSH_TOKEN_SORT_UPDATED,
      },
    );

    return {
      ready: handle.ready(),
      devices: PushTokens.find(
        { userId },
        {
          fields: PUSH_TOKEN_FIELDS,
          sort: PUSH_TOKEN_SORT_UPDATED,
        },
      ).fetch(),
    };
  }, [userId]);

  const parsedDevices = useMemo(
    () => devices.map((device, index) => buildDeviceViewModel(device, index)),
    [devices],
  );
  const dashboard = useMemo(
    () => buildPushDashboard(parsedDevices),
    [parsedDevices],
  );

  if (!canViewPushDashboard || !ready || !dashboard.totalDevices) {
    return null;
  }

  return (
    <Surface
      elevation={5}
      style={[parentStyles.cards, styles.cardShell, containerStyle]}
      testID="devices-card"
    >
      <View
        style={[
          styles.accentBar,
          { backgroundColor: accentColor || theme.colors.primary },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir dispositivos registrados"
        accessibilityHint="Muestra la pantalla con el detalle completo de push tokens del usuario"
        onPress={onOpenDevices ? () => onOpenDevices() : undefined}
        style={({ pressed }) => [styles.pressableArea, pressed ? styles.pressed : null]}
      >
        <Card.Content style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text variant="labelMedium" style={[styles.eyebrow, { color: palette.label }]}>
                Dashboard de dispositivos
              </Text>
              <Text variant="headlineSmall" style={[styles.title, { color: palette.title }]}>
                Push tokens registrados
              </Text>
              <Text variant="bodyMedium" style={[styles.subtitle, { color: palette.copy }]}>
                Vista rápida del parque de dispositivos del usuario, con foco en
                volumen, Android y sincronización reciente.
              </Text>
            </View>
            <Chip
              compact
              icon="devices"
              style={[
                styles.countChip,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              {dashboard.totalDevices}
            </Chip>
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total"
              value={dashboard.totalDevices}
              accentColor="rgba(59, 130, 246, 0.22)"
              palette={palette}
            />
            <MetricCard
              label="Android"
              value={dashboard.androidDevices}
              accentColor="rgba(16, 185, 129, 0.22)"
              palette={palette}
            />
            <MetricCard
              label="iOS"
              value={dashboard.iosDevices}
              accentColor="rgba(168, 85, 247, 0.22)"
              palette={palette}
            />
            <MetricCard
              label="Versión Android"
              value={dashboard.androidVersionSummary}
              accentColor="rgba(245, 158, 11, 0.22)"
              compact
              palette={palette}
            />
          </View>

          <Surface elevation={0} style={[styles.summaryStrip, { backgroundColor: palette.panel }]}>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: palette.label }]}>
                Última actualización
              </Text>
              <Text variant="titleSmall" style={[styles.summaryValue, { color: palette.title }]}>
                {dashboard.latestActivityLabel}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: palette.label }]}>
                Plataforma reciente
              </Text>
              <Text variant="titleSmall" style={[styles.summaryValue, { color: palette.title }]}>
                {dashboard.latestPlatformLabel}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: palette.label }]}>
                Proveedores
              </Text>
              <Text variant="titleSmall" style={[styles.summaryValue, { color: palette.title }]}>
                {dashboard.providerCount}
              </Text>
            </View>
          </Surface>

          <View style={styles.footerRow}>
            <Text variant="bodySmall" style={[styles.footerCopy, { color: palette.copy }]}>
              Revisa el detalle completo, filtra por token y elimina registros
              obsoletos desde la vista dedicada.
            </Text>
            <Button
              mode="contained-tonal"
              icon="arrow-right"
              onPress={onOpenDevices}
              disabled={!onOpenDevices}
              accessibilityLabel="Ver dispositivos registrados"
              accessibilityHint="Abre la pantalla con el detalle de push tokens del usuario"
            >
              Ver dispositivos
            </Button>
          </View>
        </Card.Content>
      </Pressable>
    </Surface>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    overflow: "hidden",
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  pressableArea: {
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.97,
  },
  content: {
    gap: 16,
    paddingTop: 10,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontWeight: "700",
    letterSpacing: 0.6,
    opacity: 0.72,
    textTransform: "uppercase",
  },
  title: {
    fontWeight: "700",
    marginTop: 2,
  },
  subtitle: {
    marginTop: 6,
    opacity: 0.75,
  },
  countChip: {
    alignSelf: "flex-start",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "47%",
    minHeight: 90,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricCardCompact: {
    minHeight: 104,
  },
  metricLabel: {
    opacity: 0.65,
    textTransform: "uppercase",
  },
  metricValue: {
    fontWeight: "700",
    marginTop: 8,
  },
  summaryStrip: {
    borderRadius: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 14,
  },
  summaryItem: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 96,
  },
  summaryLabel: {
    opacity: 0.62,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontWeight: "700",
    marginTop: 6,
  },
  footerRow: {
    alignItems: "flex-start",
    gap: 12,
  },
  footerCopy: {
    lineHeight: 19,
    opacity: 0.75,
  },
});

export default memo(DevicesCard);
