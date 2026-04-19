export const EMPRESA_BRAND = "#673ab7";

export const createEmpresaPalette = (theme) => {
  const isDark = Boolean(theme?.dark);

  return {
    backdrop: isDark ? "rgba(2, 6, 23, 0.62)" : "rgba(30, 27, 75, 0.28)",
    background: isDark ? "#020617" : "#f6f3ff",
    border: isDark ? "rgba(196, 181, 253, 0.16)" : "rgba(103, 58, 183, 0.12)",
    borderStrong: isDark ? "rgba(216, 180, 254, 0.28)" : "rgba(103, 58, 183, 0.18)",
    brand: EMPRESA_BRAND,
    brandSoft: isDark ? "rgba(167, 139, 250, 0.18)" : "rgba(103, 58, 183, 0.1)",
    brandStrong: isDark ? "#c4b5fd" : "#5b21b6",
    card: isDark ? "rgba(15, 23, 42, 0.94)" : "#ffffff",
    cardSoft: isDark ? "rgba(30, 41, 59, 0.86)" : "#faf7ff",
    copy: isDark ? "#cbd5e1" : "#5f4b7a",
    hero: isDark ? "rgba(30, 27, 75, 0.9)" : "#ffffff",
    icon: isDark ? "#e9d5ff" : EMPRESA_BRAND,
    input: isDark ? "rgba(15, 23, 42, 0.82)" : "#ffffff",
    menu: isDark ? "rgba(15, 23, 42, 0.98)" : "#ffffff",
    muted: isDark ? "#94a3b8" : "#77638f",
    panel: isDark ? "rgba(15, 23, 42, 0.98)" : "#ffffff",
    shadowColor: isDark ? "#000000" : "#2a1550",
    title: isDark ? "#f8fafc" : "#24133b",
  };
};

export const getEmpresaScreenMetrics = (width) => ({
  contentMaxWidth: width >= 1440 ? 1160 : width >= 1180 ? 1040 : undefined,
  horizontalPadding: width >= 1360 ? 28 : width >= 900 ? 24 : 16,
});
