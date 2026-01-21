/**
 * Mock Data para módulo COMERCIO
 * Basado en schemas de RiderKar
 * Usar para desarrollo/testing antes de conectar backend
 */

// Estados válidos del pedido (máquina de estados)
export const ESTADOS_PEDIDO = {
  PREPARANDO: 'PREPARANDO',
  CADETEENLOCAL: 'CADETEENLOCAL',
  ENCAMINO: 'ENCAMINO',
  CADETEENDESTINO: 'CADETEENDESTINO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
};

// Transiciones válidas de estado
export const TRANSICIONES_ESTADO = {
  PREPARANDO: ['CADETEENLOCAL', 'CANCELADO'],
  CADETEENLOCAL: ['ENCAMINO'],
  ENCAMINO: ['CADETEENDESTINO'],
  CADETEENDESTINO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

// Colores por estado (para chips/badges)
export const COLORES_ESTADO = {
  PREPARANDO: '#FF9800', // Naranja
  CADETEENLOCAL: '#2196F3', // Azul
  ENCAMINO: '#9C27B0', // Púrpura
  CADETEENDESTINO: '#4CAF50', // Verde claro
  ENTREGADO: '#4CAF50', // Verde
  CANCELADO: '#F44336', // Rojo
};

// Labels amigables para botones
export const LABELS_BOTON_ESTADO = {
  PREPARANDO: 'LLEGUÉ AL LOCAL',
  CADETEENLOCAL: 'TENGO EL PEDIDO',
  ENCAMINO: 'LLEGUÉ AL DESTINO',
  CADETEENDESTINO: 'ENTREGADO',
};

// Helper: Validar si una transición de estado es válida
export const puedeAvanzarEstado = (estadoActual, nuevoEstado) => {
  const transicionesPermitidas = TRANSICIONES_ESTADO[estadoActual] || [];
  return transicionesPermitidas.includes(nuevoEstado);
};

// Helper: Obtener siguiente estado en el flujo
export const obtenerSiguienteEstado = (estadoActual) => {
  const transiciones = {
    PREPARACION_LISTO: 'CADETEENLOCAL',
    CADETEENLOCAL: 'ENCAMINO',
    ENCAMINO: 'CADETEENDESTINO',
    CADETEENDESTINO: 'ENTREGADO',
  };
  return transiciones[estadoActual] || null;
};

export const obtenerTextoEstado = (estado) => {
  const transiciones = {
    PREPARACION_LISTO: 'Listo para recoger',
    CADETEENLOCAL: 'Cadete en Local',
    ENCAMINO: 'En camino',
    CADETEENDESTINO: 'Cadete en Destino',
    ENTREGADO: 'Entregado',
  };
  return transiciones[estado] || null;
};

// Helper: Calcular total del pedido
export const calcularTotalPedido = (venta) => {
  if (!venta?.comprasEnCarrito) return 0;
  
  const subtotal = venta.comprasEnCarrito.reduce((acc, item) => {
    return acc + (item.producto.precio * item.cantidad);
  }, 0);
  
  return subtotal + (venta.cobroEntrega || 0);
};

// Helper: Formatear precio
export const formatearPrecio = (precio, moneda = 'CUP') => {
  return `${precio.toFixed(2)} ${moneda}`;
};
