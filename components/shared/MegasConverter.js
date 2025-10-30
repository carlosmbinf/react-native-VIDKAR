/**
 * Convierte Megabytes a Gigabytes para visualización
 * @param {number} megas - Cantidad en MB
 * @returns {string} - Formato "X GB" o "X MB"
 */
export const megasToGB = (megas) => {
  if (!megas || megas < 1024) {
    return `${megas || 0} MB`;
  }
  const gb = (megas / 1024).toFixed(megas % 1024 === 0 ? 0 : 2);
  return `${gb} GB`;
};

/**
 * Convierte Gigabytes a Megabytes para almacenamiento
 * @param {number} gb - Cantidad en GB
 * @returns {number} - Cantidad en MB
 */
export const gbToMegas = (gb) => {
  return Math.round(gb * 1024);
};

/**
 * Formatea precio con descuento aplicado
 * @param {number} precioBase - Precio sin descuento
 * @param {number} descuento - Descuento en % (0-100)
 * @returns {object} - { precioFinal, descuentoAplicado, precioBase }
 */
export const calcularPrecioConDescuento = (precioBase, descuento) => {
  const descuentoDecimal = descuento / 100;
  const descuentoAplicado = precioBase * descuentoDecimal;
  const precioFinal = precioBase - descuentoAplicado;
  
  return {
    precioBase: precioBase.toFixed(2),
    descuentoAplicado: descuentoAplicado.toFixed(2),
    precioFinal: precioFinal.toFixed(2)
  };
};
