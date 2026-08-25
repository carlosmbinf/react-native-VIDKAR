import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { Card, Chip, Surface, Text, useTheme } from "react-native-paper";
import { buildAntifraudPalette } from "./antifraudTheme";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

export default function AntifraudMetricsMobileDashboard({
  summary = {},
  isTablet = false,
}) {
  const theme = useTheme();
  const palette = useMemo(() => buildAntifraudPalette(theme), [theme]);
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(isTablet ? (width - 64) / 2 : width - 48, 280);
  const fullChartWidth = Math.max(width - (isTablet ? 64 : 48), 280);

  const tendencias = summary.tendencias || [];
  const distribucionTiposFraude = summary.distribucionTiposFraude || [];
  const distribucionIA = summary.distribucionIA || [];
  const topReferencias = summary.topReferenciasSospechosas || [];
  const topUsuarios = summary.users || [];

  const reviewedPercent =
    summary.total > 0
      ? Math.round(((summary.reviewedCount || 0) / summary.total) * 100)
      : 0;

  // Formatear datos para LineChart de tendencia
  const lineChartLabels = tendencias.length
    ? tendencias.slice(-6).map((t) => (t.date ? t.date.slice(5) : ""))
    : ["Sin datos"];
  const lineChartTotals = tendencias.length
    ? tendencias.slice(-6).map((t) => t.total || 0)
    : [0];
  const lineChartRisks = tendencias.length
    ? tendencias.slice(-6).map((t) => t.risk || 0)
    : [0];

  const lineChartData = {
    labels: lineChartLabels,
    datasets: [
      {
        data: lineChartTotals,
        color: (opacity = 1) => `rgba(${palette.dark ? "96, 165, 250" : "37, 99, 235"}, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: lineChartRisks,
        color: (opacity = 1) => `rgba(${palette.dark ? "239, 68, 68" : "185, 28, 28"}, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["Total Evidencias", "Riesgo / Rechazos"],
  };

  // Formatear datos para PieChart de tipos de fraude
  const pieColors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];
  const pieChartData = distribucionTiposFraude.length
    ? distribucionTiposFraude.map((item, idx) => ({
        name: item.label || item.tipo,
        population: item.count || 0,
        color: pieColors[idx % pieColors.length],
        legendFontColor: palette.copy,
        legendFontSize: 11,
      }))
    : [
        {
          name: "Sin incidentes",
          population: 1,
          color: "#475569",
          legendFontColor: palette.muted,
          legendFontSize: 11,
        },
      ];

  // Formatear datos para BarChart de decisiones IA
  const barChartLabels = distribucionIA.map((d) => d.name || "");
  const barChartValues = distribucionIA.map((d) => d.value || 0);
  const barChartData = {
    labels: barChartLabels.length ? barChartLabels : ["Válidas", "Inválidas", "Revisión", "Pendientes"],
    datasets: [
      {
        data: barChartValues.length ? barChartValues : [0, 0, 0, 0],
      },
    ],
  };

  const chartConfig = {
    backgroundColor: palette.surface,
    backgroundGradientFrom: palette.surfaceElevated,
    backgroundGradientTo: palette.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${palette.dark ? "147, 197, 253" : "37, 99, 235"}, ${opacity})`,
    labelColor: (opacity = 1) => `${palette.dark ? "rgba(226, 232, 240" : "rgba(71, 85, 105"}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: palette.accent,
    },
  };

  return (
    <View style={styles.container}>
      {/* KPI Cards Grid */}
      <View style={[styles.kpiGrid, isTablet && styles.kpiGridTablet]}>
        <Surface elevation={2} style={[styles.kpiCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: palette.accentText }]} variant="labelSmall">Evidencias Totales</Text>
            <MaterialCommunityIcons color={palette.accent} name="shield-check-outline" size={20} />
          </View>
          <Text style={[styles.kpiValue, { color: palette.text }]} variant="headlineMedium">{summary.total || 0}</Text>
          <Text style={[styles.kpiSubtext, { color: palette.muted }]} variant="bodySmall">
            {summary.approved || 0} Aprobadas · {summary.denied || 0} Rechazadas
          </Text>
        </Surface>

        <Surface elevation={2} style={[styles.kpiCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: palette.accentText }]} variant="labelSmall">Intentos de Fraude</Text>
            <MaterialCommunityIcons color={palette.risk} name="alert-decagram-outline" size={20} />
          </View>
          <Text style={[styles.kpiValue, { color: palette.riskText }]} variant="headlineMedium">
            {summary.attempted || 0}
          </Text>
          <Text style={[styles.kpiSubtext, { color: palette.muted }]} variant="bodySmall">
            Tasa de riesgo: {summary.fraudRate || 0}% · {summary.confirmedFraudCount || 0} Confirmados
          </Text>
        </Surface>

        <Surface elevation={2} style={[styles.kpiCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: palette.accentText }]} variant="labelSmall">En Revisión / Sospecha</Text>
            <MaterialCommunityIcons color={palette.warning} name="help-circle-outline" size={20} />
          </View>
          <Text style={[styles.kpiValue, { color: palette.warningText }]} variant="headlineMedium">
            {summary.suspicious || 0}
          </Text>
          <Text style={[styles.kpiSubtext, { color: palette.muted }]} variant="bodySmall">
            {summary.manualReview || 0} Señales IA · {summary.underObservationCount || 0} En observación
          </Text>
        </Surface>

        <Surface elevation={2} style={[styles.kpiCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: palette.accentText }]} variant="labelSmall">Auditoría Realizada</Text>
            <MaterialCommunityIcons color={palette.success} name="check-all" size={20} />
          </View>
          <Text style={[styles.kpiValue, { color: palette.successText }]} variant="headlineMedium">
            {summary.reviewedCount || 0}
          </Text>
          <Text style={[styles.kpiSubtext, { color: palette.muted }]} variant="bodySmall">
            {reviewedPercent}% completado · {summary.pendingReviewCount || 0} pendientes
          </Text>
        </Surface>
      </View>

      {/* Charts Section */}
      <View style={[styles.chartsLayout, isTablet && styles.chartsLayoutTablet]}>
        {/* Trend Line Chart */}
        <Card mode="contained" style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.chartCardHalf]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: palette.text }]} variant="titleMedium">Tendencia de Evidencias & Riesgo</Text>
            <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Comportamiento cronológico de volumen vs rechazos.</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                bezier
                chartConfig={chartConfig}
                data={lineChartData}
                height={200}
                style={styles.chartStyle}
                width={isTablet ? chartWidth : chartWidth}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Pie Chart: Tipos de Fraude */}
        <Card mode="contained" style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.chartCardHalf]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: palette.text }]} variant="titleMedium">Patrones y Tipos de Fraude</Text>
            <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Distribución por mecanismo de detección.</Text>
            <View style={styles.chartWrapper}>
              <PieChart
                accessor="population"
                backgroundColor="transparent"
                chartConfig={chartConfig}
                data={pieChartData}
                height={200}
                paddingLeft="10"
                style={styles.chartStyle}
                width={isTablet ? chartWidth : chartWidth}
              />
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Bar Chart: Decisiones IA */}
      <Card mode="contained" style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Card.Content>
          <Text style={[styles.chartTitle, { color: palette.text }]} variant="titleMedium">Decisiones del Motor de IA (Gemini)</Text>
          <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Evaluaciones automáticas generadas por comprobante.</Text>
          <View style={styles.chartWrapper}>
            <BarChart
              chartConfig={chartConfig}
              data={barChartData}
              height={200}
              showValuesOnTopOfBars
              style={styles.chartStyle}
              width={fullChartWidth}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
        </Card.Content>
      </Card>

      {/* Top Suspicious References */}
      <Card mode="contained" style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={[styles.chartTitle, { color: palette.text }]} variant="titleMedium">Referencias Sospechosas / Radar</Text>
              <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Códigos de pago utilizados en múltiples evidencias o con conflictos.</Text>
            </View>
            <Chip compact style={[styles.riskBadge, { backgroundColor: palette.riskSoft }]} textStyle={{ color: palette.riskText }}>{topReferencias.length} en radar</Chip>
          </View>

          {topReferencias.length ? (
            <View style={styles.tableList}>
              {topReferencias.slice(0, 6).map((refItem, index) => (
                <View key={refItem.reference || index} style={[styles.refRow, { borderBottomColor: palette.border }]}>
                  <View style={styles.refInfo}>
                    <Text style={[styles.refCode, { color: palette.accentText }]} variant="bodyMedium">{refItem.reference}</Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">
                      {refItem.attemptsCount || 1} intento(s) · {refItem.usersCount || 1} usuario(s) · {refItem.ventasCount || 1} venta(s) · {refItem.latestDetectedAt ? formatDate(refItem.latestDetectedAt) : "Reciente"}
                    </Text>
                  </View>
                  <Chip compact style={[styles.riskBadge, { backgroundColor: palette.riskSoft }]} textStyle={{ color: palette.riskText }}>{refItem.attemptsCount || 1} intento(s)</Chip>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyNotice, { color: palette.muted }]} variant="bodySmall">No hay referencias sospechosas reincidentes en el período.</Text>
          )}
        </Card.Content>
      </Card>

      {/* Ranking de Usuarios de Riesgo */}
      {topUsuarios.length ? (
        <Card mode="contained" style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Card.Content>
            <Text style={[styles.chartTitle, { color: palette.text }]} variant="titleMedium">Usuarios con Mayor Nivel de Riesgo</Text>
            <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">Ordenados por volumen de alertas antifraude y rechazos.</Text>
            <View style={styles.tableList}>
              {topUsuarios.slice(0, 6).map((u, index) => (
                <View key={u._id || index} style={[styles.refRow, { borderBottomColor: palette.border }]}>
                  <View style={styles.refInfo}>
                      <Text style={[styles.userName, { color: palette.text }]} variant="bodyMedium">
                      {index + 1}. {u.user?.name || u.user?.username || u._id}
                    </Text>
                    <Text style={[styles.muted, { color: palette.muted }]} variant="labelSmall">
                      {u.total || 0} total · {u.approved || 0} aprobadas · {u.denied || 0} rechazadas
                    </Text>
                  </View>
                  <Chip compact style={[u.fraudFlagged ? styles.riskBadge : styles.safeBadge, { backgroundColor: u.fraudFlagged ? palette.riskSoft : palette.successSoft }]} textStyle={{ color: u.fraudFlagged ? palette.riskText : palette.successText }}>
                    {u.fraudFlagged || 0} alertas
                  </Chip>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    marginBottom: 20,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiGridTablet: {
    gap: 12,
  },
  kpiCard: {
    backgroundColor: "#111c44",
    borderColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    padding: 14,
  },
  kpiCardTablet: {
    flexBasis: "23%",
  },
  kpiHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kpiLabel: {
    color: "#93c5fd",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  kpiValue: {
    color: "#f8fafc",
    fontWeight: "900",
    marginTop: 4,
  },
  kpiSubtext: {
    color: "rgba(226, 232, 240, 0.65)",
    marginTop: 2,
  },
  chartsLayout: {
    gap: 14,
  },
  chartsLayoutTablet: {
    flexDirection: "row",
  },
  chartCard: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
  },
  chartCardHalf: {
    flex: 1,
  },
  chartTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  chartWrapper: {
    alignItems: "center",
    marginTop: 12,
  },
  chartStyle: {
    borderRadius: 16,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  muted: {
    color: "rgba(226, 232, 240, 0.65)",
    marginTop: 2,
  },
  tableList: {
    marginTop: 10,
  },
  refRow: {
    alignItems: "center",
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  refInfo: {
    flex: 1,
    marginRight: 8,
  },
  refCode: {
    color: "#93c5fd",
    fontFamily: "monospace",
    fontWeight: "700",
  },
  userName: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  riskBadge: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  safeBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  emptyNotice: {
    color: "rgba(226, 232, 240, 0.5)",
    paddingVertical: 12,
    textAlign: "center",
  },
});