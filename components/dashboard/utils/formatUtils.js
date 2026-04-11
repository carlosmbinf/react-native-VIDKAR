export const formatLargeNumber = (value) => {
  const numericValue = Number.parseFloat(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1024).toFixed(2)} TB`;
  }

  return `${numericValue.toFixed(2)} GB`;
};

export const getDynamicFontSize = (value) => {
  const stringValue = String(value ?? "");
  const length = stringValue.length;

  if (length <= 6) return 28;
  if (length <= 8) return 24;
  if (length <= 10) return 20;
  return 18;
};

export const detectPeriodType = (labels) => {
  if (!Array.isArray(labels) || labels.length === 0) {
    return {
      type: "DESCONOCIDO",
      label: "Sin datos",
      icon: "calendar-blank",
      color: "#757575",
      description: "No hay datos disponibles",
    };
  }

  const firstLabel = String(labels[0]);

  if (/^\d{1,2}$/.test(firstLabel) && labels.length <= 31) {
    return {
      type: "DIA",
      label: "Por Día",
      icon: "calendar-today",
      color: "#ff9800",
      description: "Mes actual",
    };
  }

  if (/^\d{2}\/\d{4}$/.test(firstLabel)) {
    return {
      type: "MES",
      label: "Por Mes",
      icon: "calendar-month",
      color: "#2196f3",
      description: "Anual",
    };
  }

  if (/^\d{2}:\d{2}$/.test(firstLabel)) {
    return {
      type: "HORA",
      label: "Por Hora",
      icon: "clock-outline",
      color: "#9c27b0",
      description: "Ultimas 24 horas",
    };
  }

  if (/^\d{4}$/.test(firstLabel)) {
    return {
      type: "ANO",
      label: "Por Ano",
      icon: "calendar",
      color: "#4caf50",
      description: "Historico anual",
    };
  }

  return {
    type: "GENERAL",
    label: "General",
    icon: "chart-line",
    color: "#607d8b",
    description: "Analisis general",
  };
};
