const DEFAULT_STATUS_CHIP_TEXT = "#ffffff";
const PENDING_DELIVERY_STATUS_CHIP_TEXT = "#422006";

export const chipTextColorEstado = (estado) =>
  estado === "PENDIENTE_ENTREGA"
    ? PENDING_DELIVERY_STATUS_CHIP_TEXT
    : DEFAULT_STATUS_CHIP_TEXT;
