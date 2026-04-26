import { ScrollView, StyleSheet, View } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import Productos from "./Productos.native";
import TableRecargas from "./TableRecargas";

const getCubacelPalette = (isDarkMode) => ({
  accent: isDarkMode ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 246, 255, 0.44)",
  border: isDarkMode ? "rgba(226, 232, 240, 0.14)" : "rgba(15, 23, 42, 0.1)",
  screen: isDarkMode ? "#111827" : "#eef2ff",
  shell: isDarkMode ? "rgba(10, 16, 28, 0.5)" : "rgba(255, 255, 255, 0.42)",
  shellAlt: isDarkMode ? "rgba(20, 27, 45, 0.34)" : "rgba(255, 255, 255, 0.32)",
  textMuted: isDarkMode ? "#94a3b8" : "#64748b",
  textPrimary: isDarkMode ? "#f8fafc" : "#0f172a",
  textSecondary: isDarkMode ? "#cbd5e1" : "#475569",
});

const ProductosScreen = () => {
  const theme = useTheme();
  const palette = getCubacelPalette(theme.dark);
  const headerHeight = useAppHeaderContentInset();

  const overviewCards = [
    { label: "Catálogo", value: "Recargas y promociones" },
    { label: "Historial", value: "Seguimiento de ventas" },
    { label: "Pagos", value: "Evidencias en efectivo" },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.screen }]}
      edges={[]}
    >
      <Surface style={[styles.screen, { backgroundColor: palette.screen }]}>
        <ScrollView
          alwaysBounceVertical={false}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.contentScrollContainer,
            { paddingTop: headerHeight },
          ]}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <Productos isDegradado={true} topBleed={headerHeight} />

          <View style={styles.topSection}>
            <View
              style={[
                styles.overviewCard,
                {
                  backgroundColor: palette.shell,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.overviewHeader}>
                <View style={styles.overviewCopy}>
                  <Text
                    style={[
                      styles.overviewEyebrow,
                      { color: palette.textMuted },
                    ]}
                  >
                    Resumen operativo
                  </Text>
                  <Text
                    style={[
                      styles.overviewTitle,
                      { color: palette.textPrimary },
                    ]}
                  >
                    Catálogo Cubacel
                  </Text>
                  <Text
                    style={[
                      styles.overviewSubtitle,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Accede a ofertas activas, revisa el historial de recargas y
                    mantén el seguimiento del pago en una sola superficie.
                  </Text>
                </View>
                <View
                  style={[
                    styles.overviewBadge,
                    {
                      backgroundColor: palette.shellAlt,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.overviewBadgeValue,
                      { color: palette.textPrimary },
                    ]}
                  >
                    Cubacel
                  </Text>
                  <Text
                    style={[
                      styles.overviewBadgeLabel,
                      { color: palette.textMuted },
                    ]}
                  >
                    canal activo
                  </Text>
                </View>
              </View>

              <View style={styles.overviewMetricsRow}>
                {overviewCards.map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.overviewMetric,
                      {
                        backgroundColor: palette.accent,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.overviewMetricLabel,
                        { color: palette.textMuted },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.overviewMetricValue,
                        { color: palette.textPrimary },
                      ]}
                    >
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.tableContainer,
              {
                backgroundColor: palette.shell,
                borderColor: palette.border,
              },
            ]}
          >
            <TableRecargas useScroll={false} />
          </View>
        </ScrollView>

        <AppHeader
          backHref="/(normal)/Main"
          elevated={false}
          floating
          showBackButton
          subtitle="Ofertas, recargas y seguimiento"
          title="Productos Cubacel"
        />
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  screen: {
    flex: 1,
    minHeight: "100%",
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingBottom: 12,
  },
  topSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  overviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  overviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  overviewCopy: {
    flex: 1,
    gap: 6,
  },
  overviewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  overviewTitle: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  overviewSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  overviewBadge: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overviewBadgeValue: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "center",
  },
  overviewBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  overviewMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  overviewMetric: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 132,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  overviewMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  overviewMetricValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 19,
  },
  tableContainer: {
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 2,
    overflow: "hidden",
  },
});

export default ProductosScreen;
