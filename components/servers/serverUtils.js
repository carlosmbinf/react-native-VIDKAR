let relativeTimeFormatter;
let dateTimeFormatter;

const createRelativeTimeFormatter = () => {
  if (
    typeof Intl === "undefined" ||
    typeof Intl.RelativeTimeFormat !== "function"
  ) {
    return null;
  }

  return new Intl.RelativeTimeFormat("es", {
    numeric: "auto",
  });
};

const createDateTimeFormatter = () => {
  if (
    typeof Intl === "undefined" ||
    typeof Intl.DateTimeFormat !== "function"
  ) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRelativeTimeFormatter = () => {
  if (relativeTimeFormatter === undefined) {
    relativeTimeFormatter = createRelativeTimeFormatter();
  }

  return relativeTimeFormatter;
};

const getDateTimeFormatter = () => {
  if (dateTimeFormatter === undefined) {
    dateTimeFormatter = createDateTimeFormatter();
  }

  return dateTimeFormatter;
};

const formatRelativeTimeFallback = (value, unit) => {
  const absValue = Math.abs(value);
  const labels = {
    minute: absValue === 1 ? "minuto" : "minutos",
    hour: absValue === 1 ? "hora" : "horas",
    day: absValue === 1 ? "dia" : "dias",
  };

  if (absValue === 0) {
    return "ahora";
  }

  return value < 0
    ? `hace ${absValue} ${labels[unit]}`
    : `en ${absValue} ${labels[unit]}`;
};

const STATUS_META = {
  ACTIVO: {
    accent: "#10b981",
    background: "rgba(16, 185, 129, 0.16)",
    description:
      "Disponible para operar y aceptar solicitudes de reinicio desde la app.",
    icon: "server-security",
    label: "Activo",
    textColor: "#065f46",
  },
  INACTIVO: {
    accent: "#ef4444",
    background: "rgba(239, 68, 68, 0.16)",
    description:
      "No reporta actividad reciente o fue marcado como inactivo por el backend.",
    icon: "server-off",
    label: "Inactivo",
    textColor: "#991b1b",
  },
  PENDIENTE_A_REINICIAR: {
    accent: "#f59e0b",
    background: "rgba(245, 158, 11, 0.16)",
    description:
      "Ya existe una solicitud de reinicio registrada. El servidor no debe recibir otra hasta completar el proceso.",
    icon: "restart-alert",
    label: "Pendiente de reinicio",
    textColor: "#9a3412",
  },
};

export const getServerLastSignal = (server) =>
  server?.lastUpdate ||
  server?.lastupdateAsync ||
  server?.updatedAt ||
  server?.createdAt ||
  null;

export const formatServerDateTime = (value) => {
  if (!value) {
    return "Sin registro";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const formatter = getDateTimeFormatter();
  if (formatter) {
    return formatter.format(date);
  }

  try {
    return date.toLocaleString("es-ES");
  } catch (_error) {
    return date.toISOString();
  }
};

export const formatServerRelativeTime = (value) => {
  if (!value) {
    return "Sin registro";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = getRelativeTimeFormatter();

  if (Math.abs(diffMinutes) < 60) {
    return formatter
      ? formatter.format(diffMinutes, "minute")
      : formatRelativeTimeFallback(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter
      ? formatter.format(diffHours, "hour")
      : formatRelativeTimeFallback(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter
      ? formatter.format(diffDays, "day")
      : formatRelativeTimeFallback(diffDays, "day");
  }

  return formatServerDateTime(date);
};

export const getServerStatusMeta = (status, active) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (STATUS_META[normalizedStatus]) {
    return STATUS_META[normalizedStatus];
  }

  if (active === false) {
    return {
      accent: "#64748b",
      background: "rgba(100, 116, 139, 0.16)",
      description:
        "El registro existe pero esta desactivado, por lo que no deberia aceptar nuevas operaciones.",
      icon: "power-plug-off",
      label: "Desactivado",
      textColor: "#334155",
    };
  }

  return {
    accent: "#6366f1",
    background: "rgba(99, 102, 241, 0.16)",
    description:
      "El servidor tiene un estado no estandar. Revise los detalles antes de operar.",
    icon: "server-network",
    label: status || "Sin estado",
    textColor: "#3730a3",
  };
};

export const normalizeServerRecord = (server) => {
  const active = server?.active === true;
  const estado = server?.estado || (active ? "ACTIVO" : "INACTIVO");
  const usuariosAprobados = Array.isArray(server?.usuariosAprobados)
    ? server.usuariosAprobados
    : [];
  const details = server?.details || "";

  return {
    ...server,
    active,
    description: details || "Servidor sin descripcion",
    details,
    displayName: details || server?.domain || server?.ip || "Servidor",
    domain: server?.domain || "Sin dominio configurado",
    estado,
    ip: server?.ip || "Sin IP configurada",
    lastSignal: getServerLastSignal(server),
    usuariosAprobados,
    usuariosAprobadosCount: usuariosAprobados.length,
  };
};

export const canRestartServer = (server) =>
  Boolean(server?._id) &&
  server?.estado === "ACTIVO" &&
  server?.active === true;
