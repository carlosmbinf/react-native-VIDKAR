export const megasToGB = (megas) => {
  if (!megas || megas < 1024) {
    return `${megas || 0} MB`;
  }

  const gb = (megas / 1024).toFixed(megas % 1024 === 0 ? 0 : 2);
  return `${gb} GB`;
};

export const gbToMegas = (gb) => Math.round(gb * 1024);

export const calcularPrecioConDescuento = (precioBase, descuento) => {
  const descuentoDecimal = descuento / 100;
  const descuentoAplicado = precioBase * descuentoDecimal;
  const precioFinal = precioBase - descuentoAplicado;

  return {
    precioBase: precioBase.toFixed(2),
    descuentoAplicado: descuentoAplicado.toFixed(2),
    precioFinal: precioFinal.toFixed(2),
  };
};
