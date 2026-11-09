export const EXCEPTION_METHODS = {
  list: "integraciones.excepciones.listar",
  detail: "integraciones.excepciones.detalle",
  product: "integraciones.excepciones.productoDetalle",
};

export const EXCEPTION_PAGE_SIZE = 20;
const MAX_SERVER_PAGE = 10000;
const DETAIL_CONCURRENCY = 4;

export const loadExceptionProduct = async (call, group) => {
  const result = await call(EXCEPTION_METHODS.product, group);
  if (!result || typeof result !== "object"
    || !["found", "not-found", "ambiguous", "unassigned", "unsupported"].includes(result.status)) {
    throw new Error("La información del producto recibida no es válida.");
  }
  if (result.status === "found") {
    const product = result.product;
    if (!product || typeof product._id !== "string" || !product._id
      || typeof product.name !== "string" || typeof product.descripcion !== "string"
      || !Array.isArray(product.images)
      || product.images.some((image) => !image || typeof image.id !== "string"
        || typeof image.url !== "string" || !image.url.trim())) {
      throw new Error("La información del producto recibida no es válida.");
    }
  }
  return result;
};

export const exceptionGroupKey = (group) => JSON.stringify([group.integration, group.type, group.id]);

export const exceptionGroupLabel = (entry) => entry.group.type === "unassigned"
  ? "Sin producto identificado"
  : `${entry.group.type === "product" ? "Producto" : "Publicación"} ${entry.group.id}`;

const itemId = (context = {}) => context.itemId
  || [context.resource, context.path].map((value) => typeof value === "string"
    ? value.match(/^\/items\/([A-Za-z0-9_-]+)(?:\/[A-Za-z0-9_/-]+)?$/)?.[1] : "").find(Boolean)
  || "";

const compareRecords = (left, right) => (new Date(right.createdAt).getTime() || 0)
  - (new Date(left.createdAt).getTime() || 0) || right._id.localeCompare(left._id);

export const groupExceptionRecords = (records) => {
  const productsByItem = new Map();
  for (const record of records) {
    const publication = itemId(record.context);
    if (!publication || !record.context?.productId) continue;
    const key = exceptionGroupKey({ integration: record.integration || "", type: "item", id: publication });
    if (!productsByItem.has(key)) productsByItem.set(key, new Set());
    productsByItem.get(key).add(record.context.productId);
  }
  const groups = new Map();
  for (const record of [...records].sort(compareRecords)) {
    const integration = record.integration || "";
    const publication = itemId(record.context);
    const linkedProducts = productsByItem.get(exceptionGroupKey({ integration, type: "item", id: publication }));
    // Solo une publicaciones al producto cuando el contexto permite identificarlo sin ambigüedad.
    const product = record.context?.productId
      || (linkedProducts?.size === 1 ? [...linkedProducts][0] : "");
    const group = { integration, type: product ? "product" : publication ? "item" : "unassigned", id: product || publication };
    const key = exceptionGroupKey(group);
    if (!groups.has(key)) {
      groups.set(key, { group, count: 0, latestAt: record.createdAt, latestError: record.error, records: [] });
    }
    const entry = groups.get(key);
    entry.records.push(record);
    entry.count += 1;
  }
  return [...groups.values()];
};

// El listado web no incluye productId ni path: se recuperan del detalle existente.
export const loadExceptionGroups = async (call, {
  search = "", isActive = () => true, onProgress = () => {},
} = {}) => {
  const records = new Map();
  let total;
  let pageSize;
  let pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (!isActive()) return null;
    const result = await call(EXCEPTION_METHODS.list, { page, search });
    if (!isActive()) return null;
    if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.total) || result.total < 0
      || !Number.isSafeInteger(result.pageSize) || result.pageSize < 1
      || result.items.some((record) => !record || typeof record._id !== "string" || !record._id)) {
      throw new Error("El listado de excepciones recibido no es válido.");
    }
    if (page === 1) {
      total = result.total;
      pageSize = result.pageSize;
      pages = Math.ceil(total / pageSize);
      if (pages > MAX_SERVER_PAGE) {
        throw new Error("La búsqueda supera el límite de páginas del listado existente. Filtra por producto, usuario o error.");
      }
    }
    if (result.total !== total || result.pageSize !== pageSize
      || result.items.length !== Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize))) {
      throw new Error("El registro de excepciones cambió durante la carga. Actualiza para obtener los agrupamientos completos.");
    }
    for (const record of result.items) records.set(record._id, record);
    onProgress(`Cargando registros: ${records.size} de ${total}`);
  }
  if (records.size !== total) {
    throw new Error("El registro de excepciones cambió durante la carga. Actualiza para obtener los agrupamientos completos.");
  }
  const summaries = [...records.values()];
  const enriched = new Array(summaries.length);
  let next = 0;
  let completed = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, summaries.length) }, async () => {
    while (isActive() && !failed && next < summaries.length) {
      const index = next++;
      const summary = summaries[index];
      try {
        const detail = await call(EXCEPTION_METHODS.detail, summary._id);
        if (!isActive() || failed) return;
        if (!detail || detail._id !== summary._id
          || (detail.context != null && (typeof detail.context !== "object" || Array.isArray(detail.context)))) {
          throw new Error("El contexto de una excepción recibido no es válido.");
        }
        enriched[index] = { ...summary, context: detail.context || {} };
        completed += 1;
        onProgress(`Identificando productos: ${completed} de ${total}`);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }));
  return isActive() ? groupExceptionRecords(enriched) : null;
};

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

export const exceptionFailure = (error, fallback) => error?.reason || error?.message || fallback;

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
