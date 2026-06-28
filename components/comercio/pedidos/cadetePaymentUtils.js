import MeteorBase from "@meteorrn/core";

const Meteor = /** @type {typeof MeteorBase} */ (MeteorBase);

export const CADETE_PAYMENT_TARGET_CURRENCY = "USD";

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

export const convertCadetePaymentAmountToUsd = (amount, currency = "UYU") =>
  new Promise((resolve) => {
    const numericAmount = toFiniteAmount(amount);
    const fromCurrency = normalizeCurrency(currency);

    if (!numericAmount || fromCurrency === CADETE_PAYMENT_TARGET_CURRENCY) {
      resolve(numericAmount);
      return;
    }

    Meteor.call(
      "moneda.convertir",
      numericAmount,
      fromCurrency,
      CADETE_PAYMENT_TARGET_CURRENCY,
      null,
      (error, result) => {
        if (error) {
          console.warn(
            "[CadetePayment] No se pudo convertir importe a USD:",
            error,
          );
          resolve(numericAmount);
          return;
        }

        resolve(toFiniteAmount(result));
      },
    );
  });

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

export const getCadeteDeliveryBreakdownsInUsd = async (venta) => {
  const entries = getCadeteDeliveryBreakdowns(venta);

  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      costoEntregaOriginal: toFiniteAmount(entry.costoEntrega),
      monedaOriginal: normalizeCurrency(entry.moneda),
      costoEntrega: await convertCadetePaymentAmountToUsd(
        entry.costoEntrega,
        entry.moneda,
      ),
      moneda: CADETE_PAYMENT_TARGET_CURRENCY,
    })),
  );
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

  export const summarizeCadeteDeliveryPaymentsInUsd = async (ventas = []) => {
    let storesCount = 0;
    let pendingSalesCount = 0;
    let totalUsd = 0;

    await Promise.all(
      ventas.map(async (venta) => {
        const entries = await getCadeteDeliveryBreakdownsInUsd(venta);

        if (!entries.length) {
          return;
        }

        pendingSalesCount += venta?.pagadoAlCadete === true ? 0 : 1;
        storesCount += entries.length;
        totalUsd += entries.reduce(
          (total, entry) => total + toFiniteAmount(entry.costoEntrega),
          0,
        );
      }),
    );

    return {
      hasPendingAmount: totalUsd > 0,
      mainTotal: {
        amount: totalUsd,
        currency: CADETE_PAYMENT_TARGET_CURRENCY,
      },
      pendingSalesCount,
      storesCount,
      totals: totalUsd > 0
        ? [{ amount: totalUsd, currency: CADETE_PAYMENT_TARGET_CURRENCY }]
        : [],
    };
  };
};
