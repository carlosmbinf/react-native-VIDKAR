const rgba = (hex, opacity) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

export const buildAntifraudPalette = (theme) => {
  const dark = Boolean(theme?.dark);
  const colors = dark
    ? {
        screen: "#0b1220",
        surface: "#111c2f",
        surfaceElevated: "#16233a",
        nestedSurface: "#07101f",
        text: "#f8fafc",
        copy: "#d5deeb",
        muted: "#9aaabd",
        border: "rgba(148, 163, 184, 0.18)",
        borderStrong: "rgba(96, 165, 250, 0.42)",
        accent: "#60a5fa",
        accentStrong: "#3b82f6",
        accentText: "#bfdbfe",
        risk: "#f87171",
        riskText: "#fecaca",
        warning: "#fbbf24",
        warningText: "#fde68a",
        success: "#4ade80",
        successText: "#bbf7d0",
        info: "#60a5fa",
        infoText: "#bfdbfe",
      }
    : {
        screen: "#f3f6fb",
        surface: "#ffffff",
        surfaceElevated: "#f8fbff",
        nestedSurface: "#edf3fa",
        text: "#102033",
        copy: "#334155",
        muted: "#64748b",
        border: "rgba(15, 23, 42, 0.12)",
        borderStrong: "rgba(37, 99, 235, 0.3)",
        accent: "#2563eb",
        accentStrong: "#1d4ed8",
        accentText: "#1d4ed8",
        risk: "#dc2626",
        riskText: "#991b1b",
        warning: "#d97706",
        warningText: "#92400e",
        success: "#16a34a",
        successText: "#166534",
        info: "#2563eb",
        infoText: "#1d4ed8",
      };

  return {
    ...colors,
    dark,
    card: colors.surface,
    cardSoft: colors.surfaceElevated,
    input: colors.surface,
    divider: colors.border,
    accentSoft: rgba(colors.accentStrong, dark ? 0.2 : 0.1),
    riskSoft: rgba(colors.risk, dark ? 0.16 : 0.1),
    warningSoft: rgba(colors.warning, dark ? 0.16 : 0.1),
    successSoft: rgba(colors.success, dark ? 0.16 : 0.1),
    infoSoft: rgba(colors.info, dark ? 0.14 : 0.09),
    shadow: dark ? "#000000" : "#64748b",
  };
};

export const getAntifraudTone = (palette, tone = "info") => {
  const tones = {
    info: {
      backgroundColor: palette.infoSoft,
      borderColor: palette.borderStrong,
      color: palette.infoText,
    },
    risk: {
      backgroundColor: palette.riskSoft,
      borderColor: rgba(palette.risk, palette.dark ? 0.36 : 0.25),
      color: palette.riskText,
    },
    warning: {
      backgroundColor: palette.warningSoft,
      borderColor: rgba(palette.warning, palette.dark ? 0.36 : 0.25),
      color: palette.warningText,
    },
    success: {
      backgroundColor: palette.successSoft,
      borderColor: rgba(palette.success, palette.dark ? 0.36 : 0.25),
      color: palette.successText,
    },
  };

  return tones[tone] || tones.info;
};

export { rgba };
