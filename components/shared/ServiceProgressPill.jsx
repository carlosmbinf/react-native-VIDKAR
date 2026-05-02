import { StyleSheet, View } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";

const clamp01 = (value) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

const hexToRgba = (hex, alpha) => {
  if (typeof hex !== "string") {
    return `rgba(15,23,42,${alpha})`;
  }

  const normalized = hex.replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;

  if (safeHex.length !== 6) {
    return `rgba(15,23,42,${alpha})`;
  }

  const numericValue = Number.parseInt(safeHex, 16);

  if (Number.isNaN(numericValue)) {
    return `rgba(15,23,42,${alpha})`;
  }

  const red = (numericValue >> 16) & 255;
  const green = (numericValue >> 8) & 255;
  const blue = numericValue & 255;

  return `rgba(${red},${green},${blue},${alpha})`;
};

const hexToRgb = (hex) => {
  if (typeof hex !== "string") {
    return { blue: 42, green: 23, red: 15 };
  }

  const normalized = hex.replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;

  if (safeHex.length !== 6) {
    return { blue: 42, green: 23, red: 15 };
  }

  const numericValue = Number.parseInt(safeHex, 16);

  if (Number.isNaN(numericValue)) {
    return { blue: 42, green: 23, red: 15 };
  }

  return {
    blue: numericValue & 255,
    green: (numericValue >> 8) & 255,
    red: (numericValue >> 16) & 255,
  };
};

const rgbToHex = ({ blue, green, red }) => {
  const toHex = (value) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const mixHexColors = (startHex, endHex, ratio) => {
  const safeRatio = clamp01(ratio);
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);

  return rgbToHex({
    blue: start.blue + (end.blue - start.blue) * safeRatio,
    green: start.green + (end.green - start.green) * safeRatio,
    red: start.red + (end.red - start.red) * safeRatio,
  });
};

const getUsageTone = (ratioValue, palette = {}) => {
  const ratio = clamp01(ratioValue);
  const baseOk = palette.ok || palette.fill || "#2E7D32";
  const baseWarn = palette.warn || "#EF6C00";
  const baseDanger = palette.danger || "#D32F2F";
  const lowColor = mixHexColors("#E8FFF1", baseOk, 1);

  if (ratio >= 0.9) {
    return {
      fill: mixHexColors(baseWarn, baseDanger, (ratio - 0.9) / 0.1),
    };
  }

  if (ratio >= 0.75) {
    return {
      fill: mixHexColors(baseOk, baseWarn, (ratio - 0.75) / 0.15),
    };
  }

  return {
    fill: mixHexColors(lowColor, baseOk, ratio / 0.75),
  };
};

const ServiceProgressPill = ({
  centerText,
  isUnlimitedMobile,
  label,
  palette,
  ratio,
  rightText,
  width,
}) => {
  const theme = useTheme();
  const safeRatio = clamp01(ratio);
  const tone = getUsageTone(safeRatio, palette);
  const fillColor = tone.fill;
  const trackBackground = theme.dark
    ? hexToRgba(fillColor, 0.18)
    : hexToRgba(fillColor, 0.1);
  const borderColor = theme.dark
    ? hexToRgba(fillColor, 0.26)
    : hexToRgba(fillColor, 0.18);

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: trackBackground,
          borderColor,
          width,
        },
      ]}
    >
      <View
        style={[
          styles.pillAmbientLayer,
          {
            backgroundColor: theme.dark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.28)",
          },
        ]}
      />
      {/* <View
        style={[
          styles.pillGlow,
          {
            backgroundColor: accentGlow,
          },
        ]}
      /> */}
      <View
        style={[
          styles.pillFill,
          {
            width: `${safeRatio * 100}%`,
            backgroundColor: fillColor,
          },
        ]}
      />
      <View style={styles.pillContent}>
        <Chip
          compact
          style={[
            styles.pillChip,
            {
              backgroundColor: "transparent",
            },
          ]}
          textStyle={[
            styles.pillChipText,
            {
              color: theme.dark ? "#f8fafc" : "#0f172a",
            },
          ]}
        >
          {label}
        </Chip>
        {isUnlimitedMobile ? (
          <>
            <Text
              numberOfLines={1}
              style={[
                styles.centerValueText,
                {
                  color: theme.dark ? "#e2e8f0" : "#0f172a",
                },
              ]}
            >
              {centerText || rightText}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.pillUnlimitedText,
                {
                  color: theme.dark ? "#e2e8f0" : "#0f172a",
                },
              ]}
            >
              {rightText}
            </Text>
          </>
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.pillText,
              {
                color: theme.dark ? "#e2e8f0" : "#0f172a",
              },
            ]}
          >
            {rightText}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    overflow: "hidden",
    position: "relative",
  },
  pillAmbientLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  pillGlow: {
    borderRadius: 999,
    height: 26,
    position: "absolute",
    right: 6,
    top: 2,
    width: 56,
  },
  pillFill: {
    borderRadius: 15,
    bottom: 0,
    left: 0,
    opacity: 0.18,
    position: "absolute",
    top: 0,
  },
  pillContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  pillChip: {
    borderRadius: 999,
    borderWidth: 0,
    minHeight: 20,
  },
  pillChipText: {
    fontSize: 9,
    fontWeight: "800",
  },
  centerValueText: {
    fontSize: 10,
    fontWeight: "700",
    left: 0,
    opacity: 0.92,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    textAlign: "center",
  },
  pillText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.82,
    textAlign: "right",
  },
  pillUnlimitedText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.88,
    paddingLeft: 56,
    textAlign: "right",
  },
});

export default ServiceProgressPill;
