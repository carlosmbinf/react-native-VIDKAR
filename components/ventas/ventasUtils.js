export const CATEGORIES = [
  { key: "TODAS", label: "Todas", icon: "view-list" },
  { key: "RECARGAS", label: "Recargas", icon: "cellphone-wireless" },
  { key: "PROXY_VPN", label: "Proxy / VPN", icon: "wifi" },
  { key: "REMESAS", label: "Remesas", icon: "cash-fast" },
  { key: "COMERCIO", label: "Comercio", icon: "storefront-outline" },
  { key: "CURSOS", label: "Cursos", icon: "school-outline" },
  { key: "BALANCE", label: "Balance", icon: "cash-register" },
];

export const CATEGORY_COLORS = {
  BALANCE: { bg: "rgba(100, 116, 139, 0.15)", color: "#64748b", icon: "cash-register", label: "Balance" },
  COMERCIO: { bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7", icon: "storefront-outline", label: "Comercio" },
  CURSOS: { bg: "rgba(20, 184, 166, 0.15)", color: "#14b8a6", icon: "school-outline", label: "Curso" },
  OTROS: { bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", icon: "package-variant", label: "Otro" },
  PROXY_VPN: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", icon: "wifi", label: "Proxy/VPN" },
  RECARGAS: { bg: "rgba(249, 115, 22, 0.15)", color: "#f97316", icon: "cellphone-wireless", label: "Recarga" },
  REMESAS: { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", icon: "cash-fast", label: "Remesa" },
};

export const PROXY_VPN_TYPES = new Set(["PROXY", "VPN"]);
export const PROXY_VPN_PRODUCT_TYPES = [
  "PROXY",
  "VPN",
  "fecha-proxy",
  "fecha-vpn",
  "vpnplus",
  "vpn2mb",
  "megas",
];

export const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const normalizeCurrency = (value, fallback = "CUP") => {
  const currency = String(value ?? "").trim().toUpperCase();
  return currency || fallback;
};

export const formatDateShort = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatMoney = (value, currency = "CUP") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `0.00 ${currency}`;
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
  return `${formatted} ${currency}`;
};

export const megasToGB = (megas) => {
  const num = Number(megas);
  if (!num || num === 999999 || num >= 999999) return "ILIMITADO";
  if (num < 1024) return `${num} MB`;
  return `${(num / 1024).toFixed(num % 1024 === 0 ? 0 : 2)} GB`;
};

export const getCartItemType = (carrito) =>
  String(
    carrito?.type ||
      carrito?.tipo ||
      carrito?.productType ||
      carrito?.producto?.type ||
      carrito?.producto?.tipo ||
      "",
  ).toUpperCase();

export const getSaleItems = (sale) => {
  if (Array.isArray(sale?.items) && sale.items.length > 0) {
    return sale.items;
  }
  if (Array.isArray(sale?.producto?.carritos) && sale.producto.carritos.length > 0) {
    return sale.producto.carritos;
  }
  if (Array.isArray(sale?.carrito) && sale.carrito.length > 0) {
    return sale.carrito;
  }
  if (Array.isArray(sale?.producto?.carrito) && sale.producto.carrito.length > 0) {
    return sale.producto.carrito;
  }
  if (sale?.producto?.carrito && typeof sale.producto.carrito === "object") {
    return [sale.producto.carrito];
  }
  if (sale?.carrito && typeof sale.carrito === "object") {
    return [sale.carrito];
  }
  return [];
};

export const detectSaleCategory = (sale) => {
  if (sale?.source === "direct") {
    return "BALANCE";
  }

  const items = getSaleItems(sale);
  const types = new Set(items.map((item) => getCartItemType(item)).filter(Boolean));

  if (types.has("RECARGA")) return "RECARGAS";
  if (types.has("REMESA")) return "REMESAS";
  if (types.has("COMERCIO")) return "COMERCIO";
  if (types.has("CURSO")) return "CURSOS";
  if (types.has("PROXY") || types.has("VPN")) return "PROXY_VPN";

  const docType = String(sale?.producto?.type || sale?.type || "").toUpperCase();
  if (docType.includes("RECARGA")) return "RECARGAS";
  if (docType.includes("REMESA")) return "REMESAS";
  if (docType.includes("COMERCIO")) return "COMERCIO";
  if (docType.includes("CURSO")) return "CURSOS";
  if (docType.includes("PROXY") || docType.includes("VPN")) return "PROXY_VPN";

  return "OTROS";
};

export const deriveSaleStatus = (sale) => {
  if (sale?.source === "direct") {
    return sale?.cobrado ? "ENTREGADO" : "PENDIENTE_PAGO";
  }

  const items = getSaleItems(sale);
  const rechargeItems = items.filter((item) => getCartItemType(item) === "RECARGA");
  if (rechargeItems.length > 0) {
    const isPaid = sale?.isCobrado === true || Number(sale?.cobrado || 0) > 0;
    if (!isPaid) return "PENDIENTE_PAGO";

    const rechargeStatuses = rechargeItems
      .map((item) => String(item?.dtshopStatus || "").toUpperCase())
      .filter(Boolean);
    const completed = rechargeStatuses.filter((status) => status === "COMPLETED").length;
    const failed = rechargeStatuses.some((status) => ["REJECTED", "CANCELLED", "DECLINED", "REVERSED", "REJECTED-INSUFFICIENT-BALANCE"].includes(status));
    if (completed === rechargeItems.length) return "RECARGA_ENTREGADA";
    if (failed) return "RECARGA_NO_ENTREGADA";
    return "RECARGA_EN_PROCESO";
  }

  const rawStatus = String(sale?.estado || sale?.status || "").toUpperCase();

  if (
    sale?.isCancelada === true ||
    sale?.cancelado === true ||
    rawStatus === "CANCELADO" ||
    rawStatus === "CANCELADA" ||
    rawStatus === "CANCELLED"
  ) {
    return "CANCELADO";
  }

  if (
    sale?.isCobrado === true ||
    rawStatus === "ENTREGADO" ||
    rawStatus === "ENTREGADA" ||
    rawStatus === "COMPLETED" ||
    rawStatus === "PAID"
  ) {
    return "ENTREGADO";
  }

  if (items.length > 0 && items.every((item) => item?.entregado === true)) {
    return "ENTREGADO";
  }

  if (sale?.isCobrado !== true && sale?.cobrado !== true) {
    return "PENDIENTE_PAGO";
  }

  return "PENDIENTE_ENTREGA";
};

export const getStatusMeta = (status, isDark = false) => {
  switch (status) {
    case "RECARGA_ENTREGADA":
    case "ENTREGADO":
      return {
        backgroundColor: isDark ? "rgba(34, 197, 94, 0.16)" : "rgba(220, 252, 231, 0.95)",
        borderColor: isDark ? "rgba(74, 222, 128, 0.32)" : "rgba(34, 197, 94, 0.35)",
        dotColor: "#22c55e",
        label: "Pagado / Entregado",
        shortLabel: "Pagado / Entregado",
        textColor: isDark ? "#86efac" : "#15803d",
      };
    case "RECARGA_EN_PROCESO":
      return {
        backgroundColor: isDark ? "rgba(234, 179, 8, 0.15)" : "rgba(254, 252, 232, 0.95)",
        borderColor: isDark ? "rgba(250, 204, 21, 0.32)" : "rgba(234, 179, 8, 0.35)",
        dotColor: "#eab308",
        label: "Pagado / En proceso",
        shortLabel: "Pagado / Proceso",
        textColor: isDark ? "#fde047" : "#a16207",
      };
    case "RECARGA_NO_ENTREGADA":
      return {
        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(254, 242, 242, 0.95)",
        borderColor: isDark ? "rgba(248, 113, 113, 0.32)" : "rgba(239, 68, 68, 0.35)",
        dotColor: "#ef4444",
        label: "Pagado / No entregada",
        shortLabel: "Pagado / Error",
        textColor: isDark ? "#fca5a5" : "#b91c1c",
      };
    case "PENDIENTE_ENTREGA":
      return {
        backgroundColor: isDark ? "rgba(234, 179, 8, 0.15)" : "rgba(254, 252, 232, 0.95)",
        borderColor: isDark ? "rgba(250, 204, 21, 0.32)" : "rgba(234, 179, 8, 0.35)",
        dotColor: "#eab308",
        label: "Pendiente entrega",
        shortLabel: "Entrega pend.",
        textColor: isDark ? "#fde047" : "#a16207",
      };
    case "PENDIENTE_PAGO":
      return {
        backgroundColor: isDark ? "rgba(249, 115, 22, 0.16)" : "rgba(255, 247, 237, 0.95)",
        borderColor: isDark ? "rgba(251, 146, 60, 0.32)" : "rgba(249, 115, 22, 0.35)",
        dotColor: "#f97316",
        label: "Pendiente pago",
        shortLabel: "Pendiente",
        textColor: isDark ? "#fdba74" : "#c2410c",
      };
    case "CANCELADO":
      return {
        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(254, 242, 242, 0.95)",
        borderColor: isDark ? "rgba(248, 113, 113, 0.32)" : "rgba(239, 68, 68, 0.35)",
        dotColor: "#ef4444",
        label: "Cancelado",
        shortLabel: "Cancelado",
        textColor: isDark ? "#fca5a5" : "#b91c1c",
      };
    default:
      return {
        backgroundColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(241, 245, 249, 0.95)",
        borderColor: isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.3)",
        dotColor: "#94a3b8",
        label: status || "Desconocido",
        shortLabel: status || "N/A",
        textColor: isDark ? "#cbd5e1" : "#475569",
      };
  }
};

export const getRechargeStatusPresentation = (sale, isDark = false) => {
  const items = getSaleItems(sale).filter((item) => getCartItemType(item) === "RECARGA");
  if (items.length === 0) return null;

  const paid = sale?.isCobrado === true || Number(sale?.cobrado || 0) > 0;
  const statuses = items.map((item) => String(item?.dtshopStatus || "").toUpperCase());
  const hasFailure = statuses.some((status) => ["REJECTED", "CANCELLED", "DECLINED", "REVERSED", "REJECTED-INSUFFICIENT-BALANCE"].includes(status));
  const allCompleted = statuses.length === items.length && statuses.every((status) => status === "COMPLETED");
  const tone = (kind) => {
    if (kind === "success") return { backgroundColor: isDark ? "rgba(34, 197, 94, 0.16)" : "#dcfce7", borderColor: isDark ? "rgba(74, 222, 128, 0.32)" : "#86efac", textColor: isDark ? "#86efac" : "#15803d", dotColor: "#22c55e" };
    if (kind === "error") return { backgroundColor: isDark ? "rgba(239, 68, 68, 0.16)" : "#fef2f2", borderColor: isDark ? "rgba(248, 113, 113, 0.32)" : "#fca5a5", textColor: isDark ? "#fca5a5" : "#b91c1c", dotColor: "#ef4444" };
    return { backgroundColor: isDark ? "rgba(234, 179, 8, 0.15)" : "#fefce8", borderColor: isDark ? "rgba(250, 204, 21, 0.32)" : "#fde68a", textColor: isDark ? "#fde047" : "#a16207", dotColor: "#eab308" };
  };

  return {
    payment: { label: paid ? "Pagado" : "Pendiente pago", ...tone(paid ? "success" : "warning") },
    delivery: { label: allCompleted ? "Entregado" : hasFailure ? "No entregada" : "En proceso", ...tone(allCompleted ? "success" : hasFailure ? "error" : "warning") },
  };
};

export const getEvidenceMeta = (evidence, sale, isDark = false) => {
  if (!evidence) {
    const isEfectivo = String(sale?.metodoPago || "").toUpperCase() === "EFECTIVO";
    const isUnpaid = sale?.statusDerived === "PENDIENTE_PAGO";

    if (isEfectivo && isUnpaid) {
      return {
        backgroundColor: isDark ? "rgba(249, 115, 22, 0.18)" : "rgba(255, 237, 213, 0.95)",
        borderColor: isDark ? "rgba(251, 146, 60, 0.35)" : "rgba(249, 115, 22, 0.35)",
        icon: "alert-circle-outline",
        label: "Falta evidencia",
        state: "MISSING",
        textColor: isDark ? "#fdba74" : "#c2410c",
      };
    }

    return {
      backgroundColor: isDark ? "rgba(148, 163, 184, 0.10)" : "rgba(241, 245, 249, 0.8)",
      borderColor: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(203, 213, 225, 0.6)",
      icon: "file-hidden",
      label: "Sin evidencia",
      state: "NONE",
      textColor: isDark ? "#94a3b8" : "#64748b",
    };
  }

  if (evidence.aprobado === true || String(evidence.estado || "").toUpperCase() === "APROBADA") {
    return {
      backgroundColor: isDark ? "rgba(34, 197, 94, 0.18)" : "rgba(220, 252, 231, 0.95)",
      borderColor: isDark ? "rgba(74, 222, 128, 0.35)" : "rgba(34, 197, 94, 0.35)",
      icon: "check-decagram",
      label: "Evidencia aprobada",
      state: "APPROVED",
      textColor: isDark ? "#86efac" : "#15803d",
    };
  }

  if (
    evidence.denegado === true ||
    evidence.rechazado === true ||
    String(evidence.estado || "").toUpperCase() === "RECHAZADA"
  ) {
    return {
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.18)" : "rgba(254, 242, 242, 0.95)",
      borderColor: isDark ? "rgba(248, 113, 113, 0.35)" : "rgba(239, 68, 68, 0.35)",
      icon: "close-circle-outline",
      label: "Evidencia rechazada",
      state: "REJECTED",
      textColor: isDark ? "#fca5a5" : "#b91c1c",
    };
  }

  return {
    backgroundColor: isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(239, 246, 255, 0.95)",
    borderColor: isDark ? "rgba(96, 165, 250, 0.35)" : "rgba(59, 130, 246, 0.35)",
    icon: "clock-check-outline",
    label: "Evidencia en revisión",
    state: "PENDING_REVIEW",
    textColor: isDark ? "#93c5fd" : "#1d4ed8",
  };
};

export const getSaleSpecificDetail = (sale) => {
  if (sale?.source === "direct") {
    return sale?.comentario ? `Nota: ${sale.comentario}` : `Venta directa ${sale?.type || ""}`;
  }

  const category = sale?.category;
  const items = sale?.items || [];

  if (category === "RECARGAS") {
    const phones = items
      .map((i) => i?.movilARecargar || i?.extraFields?.mobile_number || i?.producto?.movil)
      .filter(Boolean);
    if (phones.length > 0) {
      return `Móvil: ${phones.join(", ")}`;
    }
    return items[0]?.producto?.name || items[0]?.nombre || "Recarga Cubacel";
  }

  if (category === "PROXY_VPN") {
    const descriptions = items.map((i) => {
      const type = getCartItemType(i);
      const isUnlimited = i?.isIlimitado || i?.esPorTiempo;
      const amount = isUnlimited ? "Ilimitado" : megasToGB(i?.megas);
      return `${type} ${amount}`;
    });
    return descriptions.join(" • ") || "Servicio Proxy / VPN";
  }

  if (category === "REMESAS") {
    const first = items[0];
    if (first) {
      const recipient = first.nombre || first.destinatario || "Cuba";
      const delivery = first.tarjetaCUP ? `Tarjeta: ${first.tarjetaCUP}` : "Efectivo USD";
      const receive = first.recibirEnCuba
        ? `Recibe: ${first.recibirEnCuba} ${first.monedaRecibirEnCuba || "CUP"}`
        : "";
      return [recipient, delivery, receive].filter(Boolean).join(" · ");
    }
    return "Remesa familiar";
  }

  if (category === "COMERCIO") {
    const names = items
      .map((i) => `${i?.cantidad || 1}x ${i?.producto?.name || i?.nombre || "Producto"}`)
      .slice(0, 3);
    const suffix = items.length > 3 ? ` (+${items.length - 3})` : "";
    return names.join(", ") + suffix || "Pedido de comercio";
  }

  if (category === "CURSOS") {
    const titles = items.map((i) => i?.producto?.titulo || i?.nombre || "Curso VIDKAR");
    return titles.join(", ") || "Curso VIDKAR";
  }

  if (items.length > 0) {
    return items.map((i) => i?.nombre || getCartItemType(i)).filter(Boolean).join(", ");
  }

  return sale?.comentario || "Compra de usuario";
};
