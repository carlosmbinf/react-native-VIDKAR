import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Chip, Text, useTheme } from "react-native-paper";

const safeHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style);
    }
  } catch (_) {}
};

const InteractiveChart = ({
  badge,
  chartConfig,
  data,
  emptyCopy,
  emptyTitle,
  formatTooltipValue,
  formatYLabel,
  fromZero = true,
  height = 240,
  icon = "chart-line-variant",
  iconBg = "#10b981",
  onPointSelect,
  style,
  title,
  yAxisLabel = "",
  yAxisSuffix = "",
}) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [selectedPoint, setSelectedPoint] = React.useState(null);
  const tooltipAnim = React.useRef(new Animated.Value(0)).current;

  const handleLayout = React.useCallback(
    (event) => {
      const { width } = event.nativeEvent.layout;
      if (width > 0 && Math.abs(width - containerWidth) > 4) {
        setContainerWidth(Math.floor(width));
      }
    },
    [containerWidth],
  );

  const hasData =
    data &&
    Array.isArray(data.datasets) &&
    data.datasets.some(
      (ds) => Array.isArray(ds.data) && ds.data.some((val) => Number(val) > 0),
    );

  const handleDataPointClick = React.useCallback(
    (pointData) => {
      safeHaptic(Haptics.ImpactFeedbackStyle.Light);

      const label =
        data.labels && data.labels[pointData.index] !== undefined
          ? String(data.labels[pointData.index])
          : `Punto ${pointData.index + 1}`;

      const datasetIndex =
        typeof pointData.datasetIndex === "number"
          ? pointData.datasetIndex
          : 0;
      const legendName =
        data.legend && data.legend[datasetIndex]
          ? data.legend[datasetIndex]
          : null;

      const pointInfo = {
        color: pointData.getColor ? pointData.getColor(1) : theme.colors.primary,
        datasetIndex,
        index: pointData.index,
        label,
        legendName,
        value: pointData.value,
        x: pointData.x,
        y: pointData.y,
      };

      setSelectedPoint(pointInfo);
      if (onPointSelect) {
        onPointSelect(pointInfo);
      }

      tooltipAnim.setValue(0);
      Animated.spring(tooltipAnim, {
        friction: 7,
        tension: 80,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
    [data.labels, data.legend, onPointSelect, theme.colors.primary, tooltipAnim],
  );

  const dismissTooltip = React.useCallback(() => {
    Animated.timing(tooltipAnim, {
      duration: 150,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setSelectedPoint(null));
  }, [tooltipAnim]);

  const defaultFormatValue = (val) => {
    if (formatTooltipValue) return formatTooltipValue(val);
    if (yAxisLabel) return `${yAxisLabel}${Number(val || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
    if (yAxisSuffix) return `${Number(val || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}${yAxisSuffix}`;
    return String(val);
  };

  const chartWidth = Math.max(containerWidth, 260);

  // Compute tooltip position clamped to card bounds
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  let tooltipLeft = 0;
  let tooltipTop = 0;

  if (selectedPoint) {
    tooltipLeft = Math.max(
      10,
      Math.min(selectedPoint.x - tooltipWidth / 2, chartWidth - tooltipWidth - 10),
    );
    tooltipTop =
      selectedPoint.y > tooltipHeight + 20
        ? selectedPoint.y - tooltipHeight - 12
        : selectedPoint.y + 14;
  }

  return (
    <View onLayout={handleLayout} style={[styles.cardWrapper, style]}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons color="#ffffff" name={icon} size={18} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.chartTitle, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
        </View>
        {badge ? (
          <Chip
            compact
            style={styles.badgeChip}
            textStyle={styles.badgeText}
          >
            {badge}
          </Chip>
        ) : null}
      </View>

      <Text style={[styles.hintTouch, { color: theme.colors.onSurface }]}>
        Toca cualquier punto del gráfico para inspeccionar datos
      </Text>

      {hasData && containerWidth > 0 ? (
        <View style={styles.chartInteractiveContainer}>
          <LineChart
            bezier
            chartConfig={chartConfig}
            data={data}
            formatYLabel={formatYLabel}
            fromZero={fromZero}
            height={height}
            onDataPointClick={handleDataPointClick}
            style={styles.chartStyle}
            width={chartWidth}
            withHorizontalLines
            withInnerLines
            withOuterLines
            withShadow
            withVerticalLines={false}
            yAxisLabel={yAxisLabel}
            yAxisSuffix={yAxisSuffix}
          />

          {selectedPoint ? (
            <Animated.View
              pointerEvents="box-none"
              style={[
                styles.floatingTooltip,
                {
                  backgroundColor: theme.dark
                    ? "rgba(15, 23, 42, 0.95)"
                    : "rgba(255, 255, 255, 0.96)",
                  borderColor: selectedPoint.color || theme.colors.primary,
                  left: tooltipLeft,
                  opacity: tooltipAnim,
                  top: tooltipTop,
                  transform: [
                    {
                      scale: tooltipAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.tooltipHeader}>
                <View
                  style={[
                    styles.tooltipDot,
                    { backgroundColor: selectedPoint.color },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tooltipLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedPoint.label}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.tooltipValue,
                  { color: theme.colors.onSurface },
                ]}
              >
                {defaultFormatValue(selectedPoint.value)}
              </Text>
              {selectedPoint.legendName ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tooltipSeries,
                    { color: selectedPoint.color },
                  ]}
                >
                  {selectedPoint.legendName}
                </Text>
              ) : null}
            </Animated.View>
          ) : null}

          {selectedPoint ? (
            <Pressable
              onPress={dismissTooltip}
              style={[
                styles.inspectorBanner,
                {
                  backgroundColor: theme.dark
                    ? "rgba(30, 41, 59, 0.7)"
                    : "rgba(241, 245, 249, 0.9)",
                  borderColor: theme.dark
                    ? "rgba(148, 163, 184, 0.18)"
                    : "rgba(15, 23, 42, 0.08)",
                },
              ]}
            >
              <View style={styles.inspectorInfo}>
                <View
                  style={[
                    styles.inspectorDot,
                    { backgroundColor: selectedPoint.color },
                  ]}
                />
                <Text
                  style={[
                    styles.inspectorText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedPoint.label}
                  {selectedPoint.legendName
                    ? ` • ${selectedPoint.legendName}`
                    : ""}:{" "}
                  <Text style={styles.inspectorBold}>
                    {defaultFormatValue(selectedPoint.value)}
                  </Text>
                </Text>
              </View>
              <MaterialCommunityIcons
                color={theme.colors.onSurface}
                name="close-circle-outline"
                size={18}
                style={{ opacity: 0.6 }}
              />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.emptyContainer,
            {
              backgroundColor: theme.dark
                ? "rgba(15, 23, 42, 0.6)"
                : "rgba(248, 250, 252, 0.8)",
              borderColor: theme.dark
                ? "rgba(148, 163, 184, 0.16)"
                : "rgba(15, 23, 42, 0.08)",
            },
          ]}
        >
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name="chart-box-outline"
            size={32}
            style={{ opacity: 0.8 }}
          />
          <Text
            style={[styles.emptyTitleText, { color: theme.colors.onSurface }]}
          >
            {emptyTitle || "Sin datos para este periodo"}
          </Text>
          <Text
            style={[styles.emptySubtitleText, { color: theme.colors.onSurface }]}
          >
            {emptyCopy || "No se registran transferencias en el rango de tiempo seleccionado."}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeChip: {
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderRadius: 8,
    height: 26,
  },
  badgeText: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "800",
  },
  cardWrapper: {
    borderRadius: 22,
    overflow: "hidden",
    width: "100%",
  },
  chartInteractiveContainer: {
    position: "relative",
    width: "100%",
  },
  chartStyle: {
    alignSelf: "center",
    borderRadius: 18,
    marginVertical: 4,
  },
  chartTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  emptyContainer: {
    alignItems: "center",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 6,
    justifyContent: "center",
    marginVertical: 8,
    minHeight: 180,
    padding: 20,
  },
  emptySubtitleText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.68,
    textAlign: "center",
  },
  emptyTitleText: {
    fontSize: 14,
    fontWeight: "800",
  },
  floatingTooltip: {
    borderRadius: 12,
    borderWidth: 1.5,
    elevation: 8,
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    zIndex: 99,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  hintTouch: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 8,
    opacity: 0.55,
    paddingHorizontal: 4,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  inspectorBanner: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inspectorBold: {
    fontWeight: "900",
  },
  inspectorDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  inspectorInfo: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 8,
  },
  inspectorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  titleGroup: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 10,
    paddingRight: 8,
  },
  tooltipDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  tooltipHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    opacity: 0.75,
    textTransform: "uppercase",
  },
  tooltipSeries: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  tooltipValue: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});

export default InteractiveChart;
