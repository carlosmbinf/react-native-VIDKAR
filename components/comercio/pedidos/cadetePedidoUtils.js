import MeteorBase from "@meteorrn/core";

const Meteor = /** @type {typeof MeteorBase} */ (MeteorBase);

const toFiniteNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const CADETE_STATUS_COLORS = {
  PREPARACION_LISTO: "#06b6d4",
  CADETEENLOCAL: "#2563eb",
  ENCAMINO: "#f97316",
  CADETEENDESTINO: "#16a34a",
  ENTREGADO: "#22c55e",
};

export const CADETE_STATUS_LABELS = {
  PREPARACION_LISTO: "Listo para recoger",
  CADETEENLOCAL: "Cadete en el local",
  ENCAMINO: "En camino",
  CADETEENDESTINO: "Cadete en destino",
  ENTREGADO: "Entregado",
};

const CADETE_SLIDER_CONFIG = {
  PREPARACION_LISTO: {
    backgroundColor: "#06b6d4",
    icon: "\u25b6",
    text: "Desliza para confirmar llegada al local",
    title: "Listo para retirar",
  },
  CADETEENLOCAL: {
    backgroundColor: "#2563eb",
    icon: "\u25b6",
    text: "Desliza para confirmar recogida",
    title: "Ya tengo el pedido",
  },
  ENCAMINO: {
    backgroundColor: "#f97316",
    icon: "\u25b6",
    text: "Desliza para confirmar llegada al destino",
    title: "Camino al destino",
  },
  CADETEENDESTINO: {
    backgroundColor: "#16a34a",
    icon: "\u2713",
    text: "Desliza para marcar entregado",
    title: "Entrega final",
  },
};

export const getCadeteStatusText = (status) =>
  CADETE_STATUS_LABELS[status] || "Pedido activo";

export const getCadeteSliderConfig = (status) =>
  CADETE_SLIDER_CONFIG[status] || {
    backgroundColor: CADETE_STATUS_COLORS[status] || "#2563eb",
    icon: "\u25b6",
    text: "Desliza para continuar",
    title: getCadeteStatusText(status),
  };

export const getNextCadeteStatus = (status) => {
  switch (status) {
    case "PREPARACION_LISTO":
      return "CADETEENLOCAL";
    case "CADETEENLOCAL":
      return "ENCAMINO";
    case "ENCAMINO":
      return "CADETEENDESTINO";
    case "CADETEENDESTINO":
      return "ENTREGADO";
    default:
      return null;
  }
};

export const getCadeteStep = (status) => {
  switch (status) {
    case "PREPARACION_LISTO":
      return 1;
    case "CADETEENLOCAL":
      return 2;
    case "ENCAMINO":
      return 3;
    case "CADETEENDESTINO":
      return 4;
    case "ENTREGADO":
      return 5;
    default:
      return 1;
  }
};

export const formatMoney = (amount, currency = "CUP") => {
  const numericAmount = Number(amount) || 0;
  return `${numericAmount.toFixed(2)} ${currency}`;
};

export const getSubtotalProductos = (items = []) =>
  items.reduce((total, item) => {
    const quantity = Number(item?.cantidad) || 1;
    const unitPrice = Number(item?.producto?.precio) || 0;
    return total + quantity * unitPrice;
  }, 0);

export const convertMoney = (amount, monedaOrigen, monedaDestino) =>
  new Promise((resolve, reject) => {
    const numericAmount = Number(amount) || 0;
    const from = String(monedaOrigen || "CUP")
      .trim()
      .toUpperCase();
    const to = String(monedaDestino || from)
      .trim()
      .toUpperCase();

    if (!numericAmount || from === to) {
      resolve(numericAmount);
      return;
    }

    Meteor.call("moneda.convertir", numericAmount, from, to, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Number(result) || 0);
    });
  });

export const getDeliveryFee = async (venta, monedaCobrada) => {
  const monedaEntrega = String(venta?.producto?.comisiones?.moneda || monedaCobrada || "CUP")
    .trim()
    .toUpperCase();
  const monedaDestino = String(monedaCobrada || monedaEntrega || "CUP")
    .trim()
    .toUpperCase();
  const costoEntrega = Number(venta?.producto?.comisiones?.costoTotalEntrega) || 0;

  if (!costoEntrega || monedaEntrega === monedaDestino) {
    return costoEntrega;
  }

  try {
    return await convertMoney(costoEntrega, monedaEntrega, monedaDestino);
  } catch (error) {
    console.warn(
      "[CadetePedidoUtils] No se pudo convertir el costo de entrega:",
      error,
    );
    return costoEntrega;
  }
};

export const resolveCoordinatePair = (source) => {
  if (!source) {
    return null;
  }

  const rawCoordinates = source.coordenadas || source.cordenadas || source;
  const latitude =
    toFiniteNumber(rawCoordinates?.latitude) ??
    toFiniteNumber(rawCoordinates?.latitud);
  const longitude =
    toFiniteNumber(rawCoordinates?.longitude) ??
    toFiniteNumber(rawCoordinates?.longitud);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

export const hasReachableCoordinates = (source) =>
  Boolean(resolveCoordinatePair(source));