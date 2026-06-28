const normalizeCurrency = (currency) =>
  String(currency || "UYU")
    .trim()
    .toUpperCase();

const toFiniteAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const CADETE_PAYMENT_FIELDS = {
  _id: 1,
  cadeteid: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  pagadoAlCadete: 1,
  "producto.carritos.type": 1,
  "producto.comisiones.costoTotalEntrega": 1,
  "producto.comisiones.desglosePorTienda": 1,
  "producto.comisiones.moneda": 1,
};

export const CADETE_PAYMENT_SELECTOR_BASE = {
  "producto.carritos.type": "COMERCIO",
  isCancelada: { $ne: true },
};

export const isCadetePaymentPending = (venta) =>
  venta?.pagadoAlCadete !== true && String(venta?.estado || "").toUpperCase() === "ENTREGADO";

export const formatCadetePaymentAmount = (amount, currency = "UYU") => {
  const numericAmount = toFiniteAmount(amount);

  return `${numericAmount.toFixed(2)} ${normalizeCurrency(currency)}`;
};

export const getCadeteDeliveryBreakdowns = (venta) => {
  const desglose = venta?.producto?.comisiones?.desglosePorTienda;

  if (Array.isArray(desglose) && desglose.length > 0) {
    return desglose
      .map((entry, index) => ({
        idTienda: entry?.idTienda || `tienda-${index}`,
        nombreTienda: entry?.nombreTienda || `Tienda ${index + 1}`,
        costoEntrega: toFiniteAmount(entry?.costoEntrega),
        moneda: normalizeCurrency(entry?.moneda || venta?.producto?.comisiones?.moneda),
        distanciaKm: toFiniteAmount(entry?.distanciaKm),
        productosCount: Number(entry?.productosCount) || 0,
      }))
      .filter((entry) => entry.costoEntrega > 0);
  }

  const fallbackDeliveryFee = toFiniteAmount(
    venta?.producto?.comisiones?.costoTotalEntrega,
  );

  if (!fallbackDeliveryFee) {
    return [];
  }

  return [
    {
      idTienda: `${venta?._id || "venta"}-entrega`,
      nombreTienda: "Entrega",
      costoEntrega: fallbackDeliveryFee,
      moneda: normalizeCurrency(venta?.producto?.comisiones?.moneda),
      distanciaKm: 0,
      productosCount: 0,
    },
  ];
};

export const summarizeCadeteDeliveryPayments = (ventas = []) => {
  const totalsMap = new Map();
  let storesCount = 0;
  let pendingSalesCount = 0;

  ventas.forEach((venta) => {
    const entries = getCadeteDeliveryBreakdowns(venta);

    if (!entries.length) {
      return;
    }

    pendingSalesCount += venta?.pagadoAlCadete === true ? 0 : 1;
    storesCount += entries.length;

    entries.forEach((entry) => {
      const currency = normalizeCurrency(entry.moneda);
      totalsMap.set(
        currency,
        toFiniteAmount(totalsMap.get(currency)) + toFiniteAmount(entry.costoEntrega),
      );
    });
  });

  const totals = [...totalsMap.entries()]
    .map(([currency, amount]) => ({ amount, currency }))
    .filter((entry) => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount);

  return {
    hasPendingAmount: totals.length > 0,
    mainTotal: totals[0] || { amount: 0, currency: "UYU" },
    pendingSalesCount,
    storesCount,
    totals,
  };
};
