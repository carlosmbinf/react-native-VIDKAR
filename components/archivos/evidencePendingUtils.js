const PENDING_EVIDENCE_TYPE_META = {
  COMERCIO: { icon: "storefront-outline", label: "Comercio" },
  PROXY: { icon: "wifi", label: "Proxy" },
  RECARGA: { icon: "cellphone-arrow-down", label: "Recarga" },
  REMESA: { icon: "cash-fast", label: "Remesa" },
  VPN: { icon: "shield-check", label: "VPN" },
};

export const PENDING_EVIDENCE_FIELDS = {
  _id: 1,
  cobrado: 1,
  createdAt: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  userId: 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
};

export const buildPendingEvidenceQuery = (userId) => ({
  isCancelada: { $ne: true },
  isCobrado: { $ne: true },
  metodoPago: "EFECTIVO",
  userId,
});

export const isPendingEvidenceVenta = (venta) =>
  Boolean(
    venta?.metodoPago === "EFECTIVO" &&
      venta?.isCobrado !== true &&
      venta?.isCancelada !== true,
  );

export const getPendingEvidenceItems = (venta) => {
  const items = Array.isArray(venta?.producto?.carritos)
    ? venta.producto.carritos
    : [];

  if (items.length > 0) {
    return items;
  }

  const fallbackType = venta?.producto?.type || venta?.type;
  if (!fallbackType) {
    return [];
  }

  return [{ type: fallbackType }];
};

export const getPendingEvidenceTypes = (venta) => {
  const seen = new Set();

  return getPendingEvidenceItems(venta)
    .map((item) => item?.type)
    .filter((type) => {
      if (!type || seen.has(type) || !PENDING_EVIDENCE_TYPE_META[type]) {
        return false;
      }

      seen.add(type);
      return true;
    })
    .map((type) => ({
      ...PENDING_EVIDENCE_TYPE_META[type],
      key: type,
    }));
};

export const formatPendingEvidenceDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha";
  }

  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
};

export const formatPendingEvidenceMoney = (amount, currency = "") => {
  const numericValue = Number(amount) || 0;
  return `${numericValue.toFixed(2)} ${currency}`.trim();
};

export const getPendingEvidenceTitle = (venta) => {
  const items = getPendingEvidenceItems(venta);
  const firstNamedItem = items.find(
    (item) => item?.producto?.name || item?.nombre,
  );

  if (firstNamedItem?.producto?.name || firstNamedItem?.nombre) {
    return firstNamedItem.producto?.name || firstNamedItem.nombre;
  }

  const firstType = getPendingEvidenceTypes(venta)[0]?.label;
  if (firstType) {
    return `${firstType} pendiente`;
  }

  return "Compra pendiente de evidencia";
};

export const getPendingEvidenceSummary = (venta) => {
  const items = getPendingEvidenceItems(venta);
  const totalAmount = Number(venta?.cobrado) || 0;

  return {
    amount: formatPendingEvidenceMoney(totalAmount, venta?.monedaCobrado),
    createdAtLabel: formatPendingEvidenceDate(venta?.createdAt),
    itemCount: items.length,
    title: getPendingEvidenceTitle(venta),
    types: getPendingEvidenceTypes(venta),
  };
};

export const buildPendingEvidenceAggregate = (ventas = []) => {
  const countsByType = ventas.reduce((accumulator, venta) => {
    getPendingEvidenceTypes(venta).forEach((type) => {
      accumulator[type.key] = (accumulator[type.key] || 0) + 1;
    });

    return accumulator;
  }, {});

  return {
    pendingEvidenceCount: ventas.length,
    pendingEvidenceTypes: Object.entries(countsByType)
      .map(([type, count]) => ({
        ...PENDING_EVIDENCE_TYPE_META[type],
        count,
        key: type,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.label.localeCompare(right.label, "es");
      }),
  };
};