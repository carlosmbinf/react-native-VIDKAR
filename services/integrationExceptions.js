export const EXCEPTION_METHODS = {
  groups: "integraciones.excepciones.productos",
  records: "integraciones.excepciones.registrosProducto",
  detail: "integraciones.excepciones.detalle",
};

export const exceptionGroupKey = (group) => JSON.stringify([group.integration, group.type, group.id]);

export const exceptionGroupLabel = (entry) => entry.productName
  || (entry.group.type === "unassigned" ? "Sin producto identificado" : entry.group.id);

export const exceptionErrorLabel = (error) => error?.code || error?.name || "Error";

export const exceptionDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("es-UY") : "—";
};

export const exceptionValue = (value) => {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

export const exceptionFailure = (error, fallback) => error?.error === 404
  || error?.error === "method-not-found"
  ? "Actualiza el backend VIDKAR para consultar excepciones por producto."
  : error?.reason || error?.message || fallback;

export const EXCEPTION_CONTEXT_LABELS = {
  stage: "Etapa", eventId: "Evento", eventType: "Tipo de evento", userId: "Usuario",
  sellerId: "Vendedor", topic: "Tema", resource: "Recurso", requestId: "Solicitud",
  jobId: "Sincronización", storeId: "Tienda", productId: "Producto local",
  saleId: "Venta local", itemId: "Publicación", orderId: "Pedido",
  orderStatus: "Estado del pedido", quantity: "Cantidad", method: "Método HTTP",
  path: "Ruta API", operation: "Operación", notificationId: "Notificación",
  sent: "Enviada", received: "Recibida", actions: "Acciones", attempt: "Intento de cola",
  apiAttempt: "Intento de API", retry: "Reintento programado", syncPrice: "Sincronizar precio",
  durationMs: "Duración (ms)", httpStatus: "Estado HTTP",
};
