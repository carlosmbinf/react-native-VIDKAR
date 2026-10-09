export const SETTLEMENT_METHODS = {
  PAYPAL: "PayPal",
  MERCADOPAGO: "Mercado Pago",
  TRANSFERENCIA: "Banco en Uruguay",
  REMESA: "Remesa a Cuba",
  OTRO: "Otro (histórico)",
};

export const SETTLEMENT_METHOD_CURRENCIES = {
  PAYPAL: ["USD"],
  MERCADOPAGO: ["UYU"],
  TRANSFERENCIA: ["USD", "UYU"],
  REMESA: ["CUP", "USD"],
};

export const SETTLEMENT_STATUSES = {
  RESERVED: "Saldo reservado",
  IN_PROCESS: "En proceso",
  UNKNOWN: "Resultado incierto",
  PAID: "Pagado y conciliado",
  FAILED: "Fallido · saldo liberado",
  CANCELED: "Cancelado · saldo liberado",
  HISTORICAL: "Histórico por conciliar",
};

export const EMPTY_SETTLEMENT_DESTINATION = {
  accountNumber: "",
  accountType: "CORRIENTE",
  bankName: "",
  branch: "",
  confirmOwnership: false,
  currency: "USD",
  direccionCuba: "",
  documentNumber: "",
  documentType: "",
  holderName: "",
  method: "PAYPAL",
  monedaRecibirEnCuba: "",
  recipientIdentifier: "",
  metodoPago: "",
  tarjetaCUP: "",
};

const parsePropertyArray = (value, label) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`La configuración de ${label} no tiene un formato válido.`);
  }
  if (!Array.isArray(parsed)) throw new Error(`La configuración de ${label} no es una lista válida.`);
  return parsed;
};

export const parseSettlementRemesaOptions = (properties) => {
  if (!Array.isArray(properties)) throw new Error("No se recibieron las opciones de REMESA.");
  const currencies = parsePropertyArray(
    properties.find((item) => item.clave === "monedaACobrarEnCuba")?.valor,
    "monedas de entrega",
  ).map((item) => String(item).toUpperCase()).filter((item) => ["CUP", "USD"].includes(item));
  const deliveryMethods = parsePropertyArray(
    properties.find((item) => item.clave === "metodoPagoEnCuba")?.valor,
    "métodos de entrega",
  ).map((item) => String(item).toUpperCase()).filter((item) => ["EFECTIVO", "TRANSFERENCIA"].includes(item));
  return {
    currencies: [...new Set(currencies)],
    deliveryMethods: [...new Set(deliveryMethods)],
  };
};

export const getRemesaCurrenciesForBalance = (balanceCurrency, options) => {
  const currencies = balanceCurrency === "CUP"
    ? options.currencies.filter((currency) => currency === "CUP")
    : options.currencies;
  return currencies.filter((currency) => currency === "CUP"
    ? options.deliveryMethods.length > 0
    : options.deliveryMethods.includes("EFECTIVO"));
};

export const getSettlementMethodsForCurrency = (currency) => Object.keys(SETTLEMENT_METHOD_CURRENCIES)
  .filter((method) => SETTLEMENT_METHOD_CURRENCIES[method].includes(currency));

export const isSettlementDestinationCompatible = (destination) => Boolean(
  destination
  && SETTLEMENT_METHOD_CURRENCIES[destination.method]?.includes(destination.currency)
  && destination.compatible === true,
);

export const validateSettlementDestination = (form, remesaOptions) => {
  if (!SETTLEMENT_METHOD_CURRENCIES[form.method]?.includes(form.currency)) {
    return "El método no es compatible con la moneda de este saldo.";
  }
  if (!form.holderName.trim()) return "Indica el nombre completo del titular o destinatario.";
  if (!form.confirmOwnership) return "Confirma que eres titular o que estás autorizado para usar este destino.";

  if (form.method === "PAYPAL" || form.method === "MERCADOPAGO") {
    return form.recipientIdentifier.trim() ? "" : "Indica el correo, celular, usuario o identificador receptivo del canal.";
  }

  if (form.method === "TRANSFERENCIA") {
    if (!form.bankName.trim() || !form.accountNumber.trim()) return "Completa el banco y el número de cuenta.";
    if (!["CORRIENTE", "AHORRO", "OTRO"].includes(form.accountType)) return "Selecciona el tipo de cuenta.";
    if (Boolean(form.documentType.trim()) !== Boolean(form.documentNumber.trim())) {
      return "Completa tipo y número de documento juntos, solo si el banco los requiere.";
    }
    if (form.documentType && !["CI", "RUT", "PASSPORT", "OTRO"].includes(form.documentType)) {
      return "Selecciona un tipo de documento válido.";
    }
    return "";
  }

  const availableCurrencies = getRemesaCurrenciesForBalance(form.currency, remesaOptions);
  if (!availableCurrencies.includes(form.monedaRecibirEnCuba)) {
    return "No hay una moneda de entrega compatible configurada para este saldo.";
  }
  if (!remesaOptions.deliveryMethods.includes(form.metodoPago)) {
    return "No hay un método de entrega compatible configurado.";
  }
  if (form.monedaRecibirEnCuba === "USD" && form.metodoPago !== "EFECTIVO") {
    return "Los USD solo pueden entregarse en efectivo.";
  }
  if (form.currency === "CUP" && form.monedaRecibirEnCuba !== "CUP") {
    return "Los saldos CUP se entregan exactamente en CUP, sin conversión.";
  }
  if (form.metodoPago === "EFECTIVO" && !form.direccionCuba.trim()) {
    return "Indica la dirección de entrega en Cuba.";
  }
  if (form.metodoPago === "TRANSFERENCIA" && !/^\d{16}$/.test(form.tarjetaCUP)) {
    return "La tarjeta CUP debe tener 16 dígitos.";
  }
  return "";
};

export const buildSettlementDestinationPayload = (form) => {
  const details = form.method === "PAYPAL" || form.method === "MERCADOPAGO"
    ? { recipientIdentifier: form.recipientIdentifier.trim() }
    : form.method === "TRANSFERENCIA"
      ? {
        bankName: form.bankName.trim(),
        accountType: form.accountType,
        accountNumber: form.accountNumber.trim(),
        branch: form.branch.trim(),
        documentType: form.documentType.trim(),
        documentNumber: form.documentNumber.trim(),
      }
      : {
        monedaRecibirEnCuba: form.monedaRecibirEnCuba,
        metodoPago: form.metodoPago,
        direccionCuba: form.metodoPago === "EFECTIVO" ? form.direccionCuba.trim() : "",
        tarjetaCUP: form.metodoPago === "TRANSFERENCIA" ? form.tarjetaCUP : "",
      };
  return {
    method: form.method,
    currency: form.currency,
    holderName: form.holderName.trim(),
    details,
    confirmOwnership: form.confirmOwnership,
  };
};

const localDateBoundary = (value, endOfDay) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Usa el formato AAAA-MM-DD para las fechas.");
  const [, yearValue, monthValue, dayValue] = match;
  const date = new Date(0);
  date.setFullYear(Number(yearValue), Number(monthValue) - 1, Number(dayValue));
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  if (date.getFullYear() !== Number(yearValue)
    || date.getMonth() !== Number(monthValue) - 1
    || date.getDate() !== Number(dayValue)) {
    throw new Error("Una de las fechas del filtro no existe.");
  }
  return date.toISOString();
};

export const buildSettlementHistoryFilters = (draft) => {
  const from = localDateBoundary(draft.from, false);
  const to = localDateBoundary(draft.to, true);
  if (from && to && new Date(from) > new Date(to)) {
    throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
  }
  const search = draft.search.trim();
  if (search.length > 120) throw new Error("La búsqueda admite hasta 120 caracteres.");
  return {
    kind: draft.kind || "ALL",
    ...(draft.domain ? { domain: draft.domain } : {}),
    ...(draft.currency ? { currency: draft.currency } : {}),
    ...(draft.status ? { status: draft.status } : {}),
    ...(draft.paymentType ? { paymentType: draft.paymentType } : {}),
    ...(draft.paymentMethod ? { paymentMethod: draft.paymentMethod } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(search ? { search } : {}),
  };
};

export const formatSettlementMoney = (amount, currency) => {
  if (amount === undefined || amount === null || amount === "") return `— ${currency}`;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `— ${currency}`;
  return `${numeric.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

export const formatSettlementDate = (value) => {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("es") : "Fecha no disponible";
};
